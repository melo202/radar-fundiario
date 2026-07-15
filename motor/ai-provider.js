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
const REMOTE = process.env.AI_REMOTE_API_KEY ? {
  kind: "openai",
  base: (process.env.AI_REMOTE_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, ""),
  key: process.env.AI_REMOTE_API_KEY,
  timeoutMs: TIMEOUT_REMOTE_MS,
  models: {
    fast: process.env.AI_REMOTE_MODEL_FAST || "meta/llama-3.3-70b-instruct",
    advanced: process.env.AI_REMOTE_MODEL_ADVANCED || process.env.AI_REMOTE_MODEL_FAST || "meta/llama-3.3-70b-instruct",
  },
} : null;

let remoteDeadUntil = 0;
const hashOf = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex");

async function chatOnce(p, { system, prompt, tier, schema }) {
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
    body = {
      model, temperature: 0.1, max_tokens: 2048,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    };
    /* nem todo servidor OpenAI-compatível aceita json_schema estrito (o da NVIDIA varia
       por modelo) — pede JSON e valida com ajv do nosso lado, que é a garantia real. */
    if (schema) body.response_format = { type: "json_object" };
  }
  const r = await fetch(url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" },
      p.key ? { Authorization: `Bearer ${p.key}` } : {}),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(p.timeoutMs),
  });
  if (!r.ok) throw new Error(`${p.kind} http ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const text = p.kind === "ollama" ? d.message?.content : d.choices?.[0]?.message?.content;
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

function chain() {
  const degraus = [];
  if (REMOTE && Date.now() >= remoteDeadUntil) degraus.push(REMOTE);
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

async function run({ task, system, prompt, tier = "fast", schema = null, cache = true }) {
  /* hash pelo CONTEÚDO: um acerto de cache vale independentemente do provedor que gerou */
  const promptHash = hashOf({ system, prompt, schema, tier });
  if (cache) {
    const hit = await pool.query("SELECT response FROM ai_cache WHERE prompt_hash=$1", [promptHash]);
    if (hit.rows.length) return { fromCache: true, ...hit.rows[0].response };
  }
  let lastErr;
  for (const p of chain()) {
    for (let attempt = 0; attempt < 2; attempt++) { /* 1 retry por degrau (§21) */
      try {
        const out = await chatOnce(p, { system, prompt, tier, schema });
        let value = out.text;
        if (schema) {
          value = parseJsonLoose(out.text);
          const validate = ajv.compile(schema);
          if (!validate(value)) throw new Error("schema inválido: " + ajv.errorsText(validate.errors));
        }
        await logCall(task, out.model, promptHash, out, true, null);
        const result = { value, model: out.model, provider: p === LOCAL ? "local" : "remote",
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
    if (p !== LOCAL) { /* remoto esgotou os 2 tiros: cooldown e desce a cadeia */
      remoteDeadUntil = Date.now() + REMOTE_COOLDOWN_MS;
      console.warn(`remoto em cooldown por 10 min (${String(lastErr?.message).slice(0, 120)}) — seguindo no local`);
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
      emCooldown: Date.now() < remoteDeadUntil } : null,
  }),
};
