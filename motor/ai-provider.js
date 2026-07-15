/* AIProvider — interface desacoplada de fornecedor (plano §2).
   Troca de modelo/fornecedor SÓ por env, nunca por código espalhado:
     AI_PROVIDER=ollama | openai        (openai = qualquer API compatível: Groq, etc.)
     AI_MODEL_FAST=qwen3:8b
     AI_MODEL_ADVANCED=qwen3:14b
     AI_BASE_URL=http://localhost:11434 (ollama) | https://api.groq.com/openai (openai)
     AI_API_KEY=...                     (só para provider openai)
   Regras do plano aplicadas AQUI, uma vez: saída estruturada validada por schema (ajv),
   cache por hash do conteúdo (tabela ai_cache), log de toda chamada (ai_logs), timeout,
   1 retry controlado. A IA NUNCA calcula preço — quem consome esta interface só pode
   pedir extração/classificação/redação. */
import { createHash } from "node:crypto";
import Ajv from "ajv";
import { pool } from "./db.js";

const ajv = new Ajv({ allErrors: true, useDefaults: false, coerceTypes: false });
const PROVIDER = process.env.AI_PROVIDER || "ollama";
const BASE = (process.env.AI_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
const MODELS = {
  fast: process.env.AI_MODEL_FAST || "qwen3:8b",
  advanced: process.env.AI_MODEL_ADVANCED || "qwen3:14b",
};
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 300000); /* CPU-only: laudos longos levam minutos */

const hashOf = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex");

async function chatOnce({ system, prompt, model, schema }) {
  const t0 = Date.now();
  let body, url;
  if (PROVIDER === "ollama") {
    url = `${BASE}/api/chat`;
    body = {
      model, stream: false,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      options: { temperature: 0.1, num_ctx: 8192 },
      think: false, /* extração/redação não precisa de thinking do Qwen3 — economiza minutos de CPU */
    };
    if (schema) body.format = schema;
  } else {
    url = `${BASE}/v1/chat/completions`;
    body = {
      model, temperature: 0.1,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    };
    if (schema) body.response_format = { type: "json_schema", json_schema: { name: "out", schema, strict: true } };
  }
  const r = await fetch(url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" },
      PROVIDER === "openai" && process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`AI ${PROVIDER} http ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const text = PROVIDER === "ollama" ? d.message?.content : d.choices?.[0]?.message?.content;
  const evalTokens = PROVIDER === "ollama" ? d.eval_count : d.usage?.completion_tokens;
  return { text: text || "", evalTokens: evalTokens || null, durationMs: Date.now() - t0 };
}

async function logCall(task, model, promptHash, out, ok, error) {
  try {
    await pool.query(
      "INSERT INTO ai_logs (task, model, prompt_hash, duration_ms, eval_tokens, ok, error) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [task, model, promptHash, out?.durationMs ?? null, out?.evalTokens ?? null, ok, error ?? null]);
  } catch { /* log nunca derruba a chamada */ }
}

async function run({ task, system, prompt, tier = "fast", schema = null, cache = true }) {
  const model = MODELS[tier] || MODELS.fast;
  const promptHash = hashOf({ PROVIDER, model, system, prompt, schema });
  if (cache) {
    const hit = await pool.query("SELECT response FROM ai_cache WHERE prompt_hash=$1", [promptHash]);
    if (hit.rows.length) return { fromCache: true, ...hit.rows[0].response };
  }
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) { /* 1 retry controlado (§21) */
    try {
      const out = await chatOnce({ system, prompt, model, schema });
      let value = out.text;
      if (schema) {
        value = JSON.parse(out.text);
        const validate = ajv.compile(schema);
        if (!validate(value)) throw new Error("schema inválido: " + ajv.errorsText(validate.errors));
      }
      await logCall(task, model, promptHash, out, true, null);
      const result = { value, model, evalTokens: out.evalTokens, durationMs: out.durationMs };
      if (cache) await pool.query(
        "INSERT INTO ai_cache (prompt_hash, model, response) VALUES ($1,$2,$3) ON CONFLICT (prompt_hash) DO NOTHING",
        [promptHash, model, result]).catch(() => {});
      return result;
    } catch (e) {
      lastErr = e;
      await logCall(task, model, promptHash, null, false, String(e.message).slice(0, 500));
    }
  }
  throw lastErr;
}

export const aiProvider = {
  generateText: (input) => run({ ...input, schema: null }),
  generateStructuredData: (input, schema) => run({ ...input, schema }),
  models: MODELS,
  provider: PROVIDER,
};
