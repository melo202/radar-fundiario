import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInstructions, selectRelevantMemories, serializeContext, SESSION_TYPES } from "../motor/assistente.js";

const migration = readFileSync(new URL("../motor/migrations/009-agent-runtime.sql", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");

test("assistente: sessões são separadas por objeto e consumo tem trilha própria", () => {
  for (const table of ["agent_profiles", "agent_sessions", "agent_messages", "agent_usage"]) assert.ok(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
  for (const type of ["general", "property", "contact", "valuation", "visit", "investment"]) assert.ok(SESSION_TYPES.includes(type));
  assert.ok(migration.includes("object_type"));
  assert.ok(migration.includes("context_budget"));
  assert.ok(migration.includes("high_speed"));
});

test("assistente: memória é recuperada por relevância, não despejada inteira", () => {
  const memories = [
    { value: "sempre", scopes: ["always"] },
    { value: "imóvel", scopes: ["property"] },
    { value: "produto", scopes: ["product"] },
  ];
  assert.deepEqual(selectRelevantMemories(memories, "property", "analise"), ["sempre", "imóvel"]);
  assert.deepEqual(selectRelevantMemories(memories, "general", "melhore a UX da tela"), ["sempre", "produto"]);
});

test("assistente: contrato impede preço inventado, escrita e promessa de execução", () => {
  const instructions = buildInstructions({ memories: ["exige fonte"], context: { source: "motor" } });
  assert.match(instructions, /nunca invente preço/);
  assert.match(instructions, /somente em leitura/);
  assert.match(instructions, /motor determinístico/);
  assert.match(instructions, /exige fonte/);
  assert.match(instructions, /dado não confiável/);
});

test("assistente: orçamento limita contexto extremo", () => {
  const serialized = serializeContext({ texto: "x".repeat(100_000) }, 8_000);
  assert.ok(serialized.length < 30_000);
  assert.match(serialized, /contexto truncado/);
});

test("assistente: rotas ficam sob sessão e CSRF; a tela oferece uma entrada central", () => {
  assert.ok(panel.includes('/painel/api/os/assistente/sessoes'));
  assert.ok(panel.indexOf('!csrfOk(req, sessao)') < panel.indexOf('/painel/api/os/assistente/sessoes'));
  assert.ok(html.includes("O que você precisa resolver agora?"));
  assert.ok(html.includes('id="openAssistant"'));
});
