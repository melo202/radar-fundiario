import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInstructions, selectRelevantMemories, serializeContext, SESSION_TYPES } from "../motor/assistente.js";
import { chooseReadOnlyTools, READ_ONLY_AGENT_TOOLS } from "../motor/agent-tools.js";

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
  assert.ok(panel.indexOf('!csrfOk(req, sessao)') < panel.indexOf('req.method === "POST" && req.url === "/painel/api/os/assistente/sessoes"'));
  assert.ok(html.includes("O que você precisa resolver agora?"));
  assert.ok(html.includes('id="openAssistant"'));
});

test("assistente: sete ferramentas de leitura são escolhidas sem entregar o banco ao Hermes", () => {
  assert.deepEqual(READ_ONLY_AGENT_TOOLS, ["consultar_meu_dia", "buscar_imovel", "abrir_dossie", "buscar_cliente", "buscar_comparaveis", "abrir_avaliacao", "consultar_entorno"]);
  assert.deepEqual(chooseReadOnlyTools("Quantos imóveis eu tenho?", { object_type: "general" }), ["consultar_meu_dia"]);
  assert.deepEqual(chooseReadOnlyTools("Mostre apartamentos no Bueno", { object_type: "general" }), ["buscar_imovel"]);
  assert.deepEqual(chooseReadOnlyTools("Encontre compradores ativos", { object_type: "general" }), ["buscar_cliente"]);
  assert.deepEqual(chooseReadOnlyTools("Analise as pendências deste imóvel", { object_type: "property" }), ["abrir_dossie"]);
  assert.deepEqual(chooseReadOnlyTools("Critique os comparáveis e a avaliação", { object_type: "property" }), ["buscar_comparaveis", "abrir_avaliacao"]);
  assert.deepEqual(chooseReadOnlyTools("O que existe no entorno?", { object_type: "property" }), ["consultar_entorno", "abrir_dossie"]);
  assert.deepEqual(chooseReadOnlyTools("Leia esta avaliação", { object_type: "valuation" }), ["abrir_avaliacao"]);
  assert.deepEqual(chooseReadOnlyTools("O que sei sobre este cliente?", { object_type: "contact" }), ["buscar_cliente"]);
});

test("assistente: sessão é reutilizada, validada contra a carteira e restaurável", () => {
  const src = readFileSync(new URL("../motor/assistente.js", import.meta.url), "utf-8");
  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.ok(src.includes("export async function listAssistantSessions"));
  assert.ok(src.includes("object_id IS NOT DISTINCT FROM $3"), "um objeto não cria chats infinitos");
  assert.ok(src.includes("inventory_properties WHERE id=$1 AND organization_id=$2"));
  assert.ok(src.includes("contacts WHERE id=$1 AND organization_id=$2"));
  assert.ok(app.includes('storageGet("ci-assistant-session")'));
  assert.ok(app.includes("loadAssistantHistory"));
  assert.ok(html.includes('id="assistantSessionSelect"'));
  assert.ok(app.includes("Perguntar ao assistente sobre este imóvel"));
  assert.ok(app.includes("Perguntar sobre esta pessoa"));
});

test("assistente P1-B: avaliação fica ligada ao imóvel e a busca ao vivo permanece autenticada", () => {
  const os = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  const tools = readFileSync(new URL("../motor/agent-tools.js", import.meta.url), "utf-8");
  const migration = readFileSync(new URL("../motor/migrations/012-property-evidence.sql", import.meta.url), "utf-8");
  assert.ok(migration.includes("latest_valuation_id uuid REFERENCES valuations(id)"));
  assert.ok(os.includes("export async function pesquisarMercadoImovel"));
  assert.ok(os.includes("latest_valuation_id=$1"));
  assert.ok(os.includes("subject->>'inventoryPropertyId'=$2"));
  assert.ok(!os.includes("lower(trim(subject->>'neighborhood'))"), "relatório nunca é aproximado por bairro/área");
  assert.ok(panel.includes("/mercado$/.test(req.url)"));
  assert.ok(app.includes("/mercado`,{method:\"POST\",body:\"{}\""));
  assert.ok(app.includes("Pedir uma análise ao assistente"));
  for (const name of ["buscarComparaveis", "abrirAvaliacao", "consultarEntorno"]) assert.ok(tools.includes(`function ${name}`));
  assert.ok(tools.includes("OpenStreetMap processado localmente, sem ajuste de preço"));
});
