/* AIProvider — interface desacoplada de fornecedor (plano §2), agora com CADEIA:
   um provedor REMOTO opcional (rápido, ex.: NVIDIA Build/Groq, compatível com OpenAI)
   tentado primeiro, e o LOCAL (Ollama/Qwen no próprio VPS) como base eterna e fallback
   automático — mesmo padrão proxy→JSONP do app. Erro de transporte/limite do remoto
   abre um cooldown de 10 min e a fila segue no local sem intervenção.

   Env LOCAL (sempre presente):
     AI_PROVIDER=ollama  AI_BASE_URL=http://localhost:11434
     AI_MODEL_FAST=qwen3:8b  AI_MODEL_ADVANCED=qwen3:14b
   Env REMOTO (opcional — se AI_REMOTE_API_KEY existir, a cadeia liga sozinha):
     AI_REMOTE_BASE_URL=https://integrate.api.nvidia.com/v1
     AI_REMOTE_API_KEY=nvapi-...
     AI_REMOTE_MODEL_FAST=...  AI_REMOTE_MODEL_ADVANCED=...

   Regras do plano aplicadas AQUI, uma vez: saída estruturada validada por schema (ajv),
   cache por hash do CONTEÚDO (independe de qual provedor serviu), log de toda chamada
   (ai_logs), timeout, 1 retry por degrau. A IA NUNCA calcula preço. */
import { createHash } from "node:crypto";
import Ajv from "ajv";
import { pool } from "./db.js";

const ajv = new Ajv({ allErrors: true, useDefaults: false, coerceTypes: false });
const TIMEOUT_LOCAL_MS = Number(process.env.AI_TIMEOUT_MS || 300000); /* CPU-only: minutos */
const TIMEOUT_REMOTE_MS = Number(process.env.AI_REMOTE_TIMEOUT_MS || 60000);
const REMOTE_COOLDOWN_MS = 10 * 60 * 1000;

const LOCAL = {
  kind: "ollama",
  base: (process.env.AI_BASE_URL || "http://localhost:11434").replace(/\/$/, ""),
  key: null,
  timeoutMs: TIMEOUT_LOCAL_MS,
  models: {
    fast: process.env.AI_MODEL_FAST || "qwen3:8b",
    advanced: process.env.AI_MODEL_ADVANCED || "qwen3:14b",
  },
};
/* NV1 (estudo NVIDIA Build 15/07/2026): a cadeia aceita DOIS remotos, cada um com o
   próprio cooldown. O tier decide a ordem — "fast" (extração em massa) prefere o
   remoto 1 (Groq, ~1,6 s); "advanced" (parecer §17, redação) prefere o remoto 2
   (GLM-5.2 no free endpoint da NVIDIA: mais lento, topo de linha). O local continua
   sendo a base eterna no fim de toda ordem. */
function remotoDoEnv(prefixo, rotulo) {
  if (!process.env[`${prefixo}_API_KEY`]) return null;
  return {
    kind: "openai", rotulo, deadUntil: 0,
    base: (process.env[`${prefixo}_BASE_URL`] || "https://integrate.api.nvidia.com/v1").replace(/\/$/, ""),
    key: process.env[`${prefixo}_API_KEY`],
    timeoutMs: Number(process.env[`${prefixo}_TIMEOUT_MS`] || TIMEOUT_REMOTE_MS),
    models: {
      fast: process.env[`${prefixo}_MODEL_FAST`] || "meta/llama-3.3-70b-instruct",
      advanced: process.env[`${prefixo}_MODEL_ADVANCED`] || process.env[`${prefixo}_MODEL_FAST`] || "meta/llama-3.3-70b-instruct",
    },
  };
}
const REMOTE = remotoDoEnv("AI_REMOTE", "remoto-1");
const REMOTE2 = remotoDoEnv("AI_REMOTE2", "remoto-2");
const hashOf = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex");

async function chatOnce(p, { system, prompt, tier, schema, maxTokens }) {
  const model = p.models[tier] || p.models.fast;
  const t0 = Date.now();
  let body, url;
  if (p.kind === "ollama") {
    url = `${p.base}/api/chat`;
    body = {
      model, stream: false,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      options: { temperature: 0.1, num_ctx: 8192 },
      think: false, /* extração/redação não precisa do thinking do Qwen3 — economiza minutos de CPU */
    };
    if (schema) body.format = schema;
  } else {
    url = `${p.base}/chat/completions`;
    /* diferente do Ollama (que recebe o schema e decodifica NELE), um servidor
       OpenAI-compatível genérico só garante "algum JSON" — então o schema tem que ir
       NO PROMPT, senão o modelo inventa os próprios nomes de campo (bug real pego no
       1º teste com o Groq: ajv rejeitou e a cadeia caiu para o local). A validação
       ajv do nosso lado continua sendo a garantia final. */
    let sys = schema
      ? system + "\n\nSAÍDA OBRIGATÓRIA: responda SOMENTE com um objeto JSON válido que satisfaça exatamente este JSON Schema (mesmos nomes de campo; use null onde não houver evidência):\n" + JSON.stringify(schema)
      : system;
    /* Qwen3 servido remoto raciocina por padrão e queima o TPM gratuito à toa em tarefa
       de extração — o /no_think da família Qwen3 desliga isso. */
    if (/qwen/i.test(model)) sys += "\n/no_think";
    /* PERF (15/07, diagnóstico real): o Groq debita max_tokens RESERVADO da cota TPM —
       2048 fixos faziam cada extração "custar" ~2.850 tokens (limite 6k/min = 2 por
       minuto → 429 → cooldown → tudo caía no local de 19s). Cada tarefa declara o que
       realmente precisa. */
    body = {
      model, temperature: 0.1, max_tokens: maxTokens || 2048,
      messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
    };
    if (schema) body.response_format = { type: "json_object" };
  }
  const doFetch = () => fetch(url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" },
      p.key ? { Authorization: `Bearer ${p.key}` } : {}),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(p.timeoutMs),
  });
  let r = await doFetch();
  /* 429 educado: o Groq DIZ quanto esperar ("try again in 250ms") — esperar esse tanto
     e refazer 1x resolve rajadas curtas sem derrubar o degrau em cooldown de 10 min */
  if (r.status === 429 && p.kind === "openai") {
    const txt = await r.text();
    const ms = Number((txt.match(/try again in (\d+(?:\.\d+)?)\s*m?s/i) || [])[1]) || 1500;
    const espera = Math.min(/in \d+(?:\.\d+)?s/i.test(txt) ? ms * 1000 : ms, 5000) + 200;
    await new Promise(ok => setTimeout(ok, espera));
    r = await doFetch();
  }
  if (!r.ok) throw new Error(`${p.kind} http ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  let text = p.kind === "ollama" ? d.message?.content : d.choices?.[0]?.message?.content;
  /* qwen3 remoto emite <think></think> mesmo com /no_think — nunca pode vazar para o usuário */
  if (text) text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const evalTokens = p.kind === "ollama" ? d.eval_count : d.usage?.completion_tokens;
  return { text: text || "", evalTokens: evalTokens || null, durationMs: Date.now() - t0, model };
}

async function logCall(task, model, promptHash, out, ok, error) {
  try {
    await pool.query(
      "INSERT INTO ai_logs (task, model, prompt_hash, duration_ms, eval_tokens, ok, error) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [task, model, promptHash, out?.durationMs ?? null, out?.evalTokens ?? null, ok, error ?? null]);
  } catch { /* log nunca derruba a chamada */ }
}

function chain(tier) {
  const ordem = tier === "advanced" ? [REMOTE2, REMOTE] : [REMOTE, REMOTE2];
  const degraus = ordem.filter(p => p && Date.now() >= p.deadUntil);
  degraus.push(LOCAL);
  return degraus;
}

/* extrai o primeiro objeto JSON do texto (modelos remotos às vezes embrulham em prosa/```) */
function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch { }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error("resposta sem JSON");
}

async function run({ task, system, prompt, tier = "fast", schema = null, cache = true, maxTokens = null }) {
  /* hash pelo CONTEÚDO: um acerto de cache vale independentemente do provedor que gerou */
  const promptHash = hashOf({ system, prompt, schema, tier });
  if (cache) {
    const hit = await pool.query("SELECT response FROM ai_cache WHERE prompt_hash=$1", [promptHash]);
    if (hit.rows.length) return { fromCache: true, ...hit.rows[0].response };
  }
  let lastErr;
  for (const p of chain(tier)) {
    for (let attempt = 0; attempt < 2; attempt++) { /* 1 retry por degrau (§21) */
      try {
        const out = await chatOnce(p, { system, prompt, tier, schema, maxTokens });
        let value = out.text;
        if (schema) {
          value = parseJsonLoose(out.text);
          const validate = ajv.compile(schema);
          if (!validate(value)) throw new Error("schema inválido: " + ajv.errorsText(validate.errors));
        }
        await logCall(task, out.model, promptHash, out, true, null);
        const result = { value, model: out.model, provider: p === LOCAL ? "local" : p.rotulo,
          evalTokens: out.evalTokens, durationMs: out.durationMs };
        if (cache) await pool.query(
          "INSERT INTO ai_cache (prompt_hash, model, response) VALUES ($1,$2,$3) ON CONFLICT (prompt_hash) DO NOTHING",
          [promptHash, out.model, result]).catch(() => {});
        return result;
      } catch (e) {
        lastErr = e;
        await logCall(task, p.models[tier] || p.models.fast, promptHash, null, false, String(e.message).slice(0, 500));
      }
    }
    if (p !== LOCAL) { /* degrau remoto esgotou os 2 tiros: cooldown SÓ dele e desce */
      p.deadUntil = Date.now() + REMOTE_COOLDOWN_MS;
      console.warn(`${p.rotulo} em cooldown por 10 min (${String(lastErr?.message).slice(0, 120)}) — descendo a cadeia`);
    }
  }
  throw lastErr;
}

export const aiProvider = {
  generateText: (input) => run({ ...input, schema: null }),
  generateStructuredData: (input, schema) => run({ ...input, schema }),
  models: LOCAL.models,
  provider: "ollama",
  status: () => ({
    local: { base: LOCAL.base, models: LOCAL.models },
    remote: REMOTE ? { base: REMOTE.base, models: REMOTE.models,
      emCooldown: Date.now() < REMOTE.deadUntil } : null,
    remote2: REMOTE2 ? { base: REMOTE2.base, models: REMOTE2.models,
      emCooldown: Date.now() < REMOTE2.deadUntil } : null,
  }),
};
