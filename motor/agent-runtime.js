/* Runtime substituível do assistente pessoal.
   Produção: o app fala com o Hermes em loopback; o Hermes fala com o Kimi Code.
   DirectKimi existe como saída de emergência explícita, não como dependência estrutural.
   LocalRuntime mantém o produto utilizável quando o agente externo está indisponível. */

const DEFAULT_TIMEOUT_MS = 180_000;
const CLIENT_ID = "CorretorInteligente/0.1 (private-single-user-assistant)";

export const CONTEXT_BUDGETS = Object.freeze({
  standard: 64_000,
  large: 128_000,
  documents: 256_000,
});

export function safeConversationKey(value) {
  const key = String(value || "").trim();
  if (!/^[A-Za-z0-9:_-]{1,120}$/.test(key)) throw new Error("Identificador de conversa inválido.");
  return key;
}

function extractResponseText(body) {
  if (typeof body?.output_text === "string") return body.output_text.trim();
  const parts = [];
  for (const item of body?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

async function requestJson(fetchImpl, url, { key, body, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": CLIENT_ID,
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  let parsed = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { raw }; }
  if (!response.ok) {
    const detail = parsed?.error?.message || parsed?.detail || parsed?.raw || `HTTP ${response.status}`;
    throw new Error(`Runtime indisponível: ${String(detail).slice(0, 300)}`);
  }
  return parsed;
}

export class HermesRuntime {
  constructor({ baseUrl, apiKey, model = "hermes-agent", fetchImpl = fetch, timeoutMs } = {}) {
    this.baseUrl = String(baseUrl || "http://127.0.0.1:8642/v1").replace(/\/$/, "");
    this.apiKey = apiKey || "";
    this.model = model;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = Number(timeoutMs || DEFAULT_TIMEOUT_MS);
  }

  async run({ input, instructions, conversationId }) {
    if (!this.apiKey) throw new Error("HERMES_API_KEY não configurada.");
    const conversation = safeConversationKey(`corretor-${conversationId}`);
    const body = await requestJson(this.fetchImpl, `${this.baseUrl}/responses`, {
      key: this.apiKey,
      timeoutMs: this.timeoutMs,
      headers: {
        "X-Hermes-Session-Id": conversation,
        "X-Hermes-Session-Key": `agent:corretor:web:dm:${conversation}`,
      },
      body: { model: this.model, input, instructions, conversation, store: true },
    });
    const value = extractResponseText(body);
    if (!value) throw new Error("Hermes concluiu sem produzir uma resposta textual.");
    return { value, runtime: "hermes", model: body.model || this.model, usage: body.usage || null, responseId: body.id || null };
  }

  status() { return { runtime: "hermes", baseUrl: this.baseUrl, model: this.model, configured: !!this.apiKey }; }
}

export class DirectKimiRuntime {
  constructor({ baseUrl, apiKey, model, highSpeedModel, fetchImpl = fetch, timeoutMs, allowDirect = false } = {}) {
    this.baseUrl = String(baseUrl || "https://api.kimi.com/coding/v1").replace(/\/$/, "");
    this.apiKey = apiKey || "";
    this.model = model || "kimi-for-coding";
    this.highSpeedModel = highSpeedModel || "kimi-for-coding-highspeed";
    this.fetchImpl = fetchImpl;
    this.timeoutMs = Number(timeoutMs || DEFAULT_TIMEOUT_MS);
    this.allowDirect = allowDirect === true || allowDirect === "true";
  }

  async run({ input, instructions, history = [], highSpeed = false }) {
    if (!this.allowDirect) throw new Error("DirectKimiRuntime está desativado; use Hermes ou habilite conscientemente.");
    if (!this.apiKey) throw new Error("KIMI_CODE_API_KEY não configurada.");
    const model = highSpeed ? this.highSpeedModel : this.model;
    const body = await requestJson(this.fetchImpl, `${this.baseUrl}/chat/completions`, {
      key: this.apiKey,
      timeoutMs: this.timeoutMs,
      body: {
        model,
        temperature: 0.2,
        max_tokens: 4096,
        messages: [{ role: "system", content: instructions }, ...history, { role: "user", content: input }],
      },
    });
    const value = body?.choices?.[0]?.message?.content?.trim();
    if (!value) throw new Error("Kimi concluiu sem produzir uma resposta textual.");
    return { value, runtime: "direct-kimi", model: body.model || model, usage: body.usage || null };
  }

  status() { return { runtime: "direct-kimi", baseUrl: this.baseUrl, model: this.model, highSpeedModel: this.highSpeedModel, configured: !!this.apiKey, enabled: this.allowDirect }; }
}

export class LocalRuntime {
  constructor({ runner } = {}) { this.runner = runner; }
  async run({ input, instructions }) {
    if (!this.runner) {
      const { aiProvider } = await import("./ai-provider.js");
      this.runner = args => aiProvider.generateText(args);
    }
    const out = await this.runner({ task: "assistente-pessoal", system: instructions, prompt: input, tier: "advanced", cache: false, maxTokens: 1200 });
    return { value: String(out.value || "").trim(), runtime: "local", model: out.model || "local", usage: out.evalTokens ? { output_tokens: out.evalTokens } : null };
  }
  status() { return { runtime: "local", configured: true }; }
}

export function createAgentRuntime(env = process.env, dependencies = {}) {
  const selected = String(env.AGENT_RUNTIME || "local").toLowerCase();
  if (selected === "hermes") return new HermesRuntime({
    baseUrl: env.HERMES_BASE_URL,
    apiKey: env.HERMES_API_KEY,
    model: env.HERMES_MODEL,
    timeoutMs: env.AGENT_TIMEOUT_MS,
    fetchImpl: dependencies.fetchImpl,
  });
  if (selected === "direct-kimi") return new DirectKimiRuntime({
    baseUrl: env.KIMI_CODE_BASE_URL,
    apiKey: env.KIMI_CODE_API_KEY,
    model: env.KIMI_CODE_MODEL,
    highSpeedModel: env.KIMI_CODE_MODEL_HIGH_SPEED,
    timeoutMs: env.AGENT_TIMEOUT_MS,
    allowDirect: env.KIMI_CODE_ALLOW_DIRECT_PRODUCT,
    fetchImpl: dependencies.fetchImpl,
  });
  return new LocalRuntime({ runner: dependencies.localRunner });
}

export async function runWithFallback(primary, fallback, input) {
  try { return await primary.run(input); }
  catch (primaryError) {
    if (!fallback) throw primaryError;
    try {
      const out = await fallback.run(input);
      return { ...out, fallbackFrom: primary.status().runtime, fallbackReason: String(primaryError.message).slice(0, 300) };
    } catch (fallbackError) {
      throw new Error(`Runtime principal e fallback falharam: ${String(fallbackError.message).slice(0, 300)}`);
    }
  }
}
