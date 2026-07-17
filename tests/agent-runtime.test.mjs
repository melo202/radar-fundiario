import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgentRuntime, DirectKimiRuntime, HermesRuntime, LocalRuntime, runWithFallback, safeConversationKey } from "../motor/agent-runtime.js";

const response = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });

test("runtime: Hermes usa Responses API stateful em loopback e nunca expõe a chave no status", async () => {
  let call;
  const runtime = new HermesRuntime({ apiKey: "segredo", fetchImpl: async (url, options) => { call = { url, options }; return response({ id: "resp_1", model: "hermes-agent", output: [{ type: "message", content: [{ type: "output_text", text: "Resposta" }] }] }); } });
  const result = await runtime.run({ input: "Olá", instructions: "Regras", conversationId: "2f9c1a34-5b6d-4e7f-8a90-1b2c3d4e5f60" });
  assert.equal(result.value, "Resposta");
  assert.equal(call.url, "http://127.0.0.1:8642/v1/responses");
  const payload = JSON.parse(call.options.body);
  assert.equal(payload.conversation, "corretor-2f9c1a34-5b6d-4e7f-8a90-1b2c3d4e5f60");
  assert.equal(runtime.status().apiKey, undefined);
});

test("runtime: Kimi usa o alias oficial e HighSpeed somente quando pedido", async () => {
  const calls = [];
  const runtime = new DirectKimiRuntime({ apiKey: "segredo", allowDirect: true, fetchImpl: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return response({ model: JSON.parse(options.body).model, choices: [{ message: { content: "ok" } }] }); } });
  await runtime.run({ input: "a", instructions: "b", highSpeed: false });
  await runtime.run({ input: "a", instructions: "b", highSpeed: true });
  assert.equal(calls[0].body.model, "kimi-for-coding");
  assert.equal(calls[1].body.model, "kimi-for-coding-highspeed");
  assert.equal(calls[0].url, "https://api.kimi.com/coding/v1/chat/completions");
});

test("runtime: DirectKimi é fail-closed por padrão", async () => {
  await assert.rejects(() => new DirectKimiRuntime({ apiKey: "x" }).run({ input: "a", instructions: "b" }), /desativado/);
});

test("runtime: fábrica mantém Local como padrão e valida chaves de conversa", () => {
  assert.ok(createAgentRuntime({}, { localRunner: async () => ({ value: "ok" }) }) instanceof LocalRuntime);
  assert.ok(createAgentRuntime({ AGENT_RUNTIME: "hermes" }) instanceof HermesRuntime);
  assert.equal(safeConversationKey("abc:123_ok"), "abc:123_ok");
  assert.throws(() => safeConversationKey("abc\nAuthorization: Bearer x"));
});

test("runtime: falha externa desce para o local e registra a origem", async () => {
  const primary = { status: () => ({ runtime: "hermes" }), run: async () => { throw new Error("offline"); } };
  const fallback = { run: async () => ({ value: "local ok", runtime: "local", model: "qwen" }) };
  const out = await runWithFallback(primary, fallback, {});
  assert.equal(out.value, "local ok");
  assert.equal(out.fallbackFrom, "hermes");
  assert.match(out.fallbackReason, /offline/);
});
