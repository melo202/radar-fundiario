import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compactContext, deterministicContextAnswer, effectiveContextBudget, estimateTokens, serializeContext,
} from "../motor/assistente.js";
import { documentProcessingPlan, selectRelevantDocumentSegments } from "../motor/document-intake.js";
import { deriveImprovementProposals } from "../motor/agent-review.js";

const migration = readFileSync(new URL("../motor/migrations/010-agent-efficiency.sql", import.meta.url), "utf-8");
const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");
const radar = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf-8");
const installer = readFileSync(new URL("../motor/install-hermes-kimi.sh", import.meta.url), "utf-8");
const efficiency = readFileSync(new URL("../motor/configure-hermes-efficiency.sh", import.meta.url), "utf-8");
const deploy = readFileSync(new URL("../motor/deploy-api.sh", import.meta.url), "utf-8");
const deployApp = readFileSync(new URL("../motor/deploy-app.sh", import.meta.url), "utf-8");
const deployAll = readFileSync(new URL("../motor/deploy-all.sh", import.meta.url), "utf-8");

test("eficiência: listas uniformes não repetem chaves em cada linha", () => {
  const context = { rows: Array.from({ length: 20 }, (_, id) => ({ id, bairro: "Bueno", preco: 800000 + id })) };
  const compact = compactContext(context);
  assert.ok(compact.length < JSON.stringify(context).length);
  assert.match(compact, /rows:\[20\]\{id,bairro,preco\}/);
  assert.ok(estimateTokens(compact) < estimateTokens(JSON.stringify(context)));
});

test("eficiência: orçamento cresce apenas quando objeto ou pedido justificam", () => {
  assert.equal(effectiveContextBudget({ object_type: "general", context_budget: 64000 }, "meu dia"), 8000);
  assert.equal(effectiveContextBudget({ object_type: "property", context_budget: 64000 }, "analise"), 16000);
  assert.equal(effectiveContextBudget({ object_type: "valuation", context_budget: 64000 }, "analise"), 32000);
  assert.equal(effectiveContextBudget({ object_type: "property", context_budget: 128000 }, "leia a matrícula e o contrato"), 128000);
  assert.match(serializeContext({ value: "x".repeat(100000) }, 8000), /contexto truncado/);
});

test("eficiência: contagens simples são respondidas sem chamar Kimi", () => {
  const context = { type: "general", counts: { properties: 12, contacts: 7, opportunities: 3, tasks: 5 } };
  assert.equal(deterministicContextAnswer("Quantos imóveis e clientes eu tenho?", context), "12 imóveis na carteira · 7 relacionamentos.");
  assert.equal(deterministicContextAnswer("Qual imóvel merece atenção?", context), null);
});

test("documentos: ingestão é determinística e Kimi entra somente sob demanda", () => {
  const plan = documentProcessingPlan({ fileName: "matricula.pdf", mimeType: "application/pdf", contentSha256: "a".repeat(64) });
  assert.equal(plan.ok, true);
  assert.equal(plan.value.aiDuringIngestion, false);
  assert.match(plan.value.extraction, /ocr-missing-pages/);
  const selected = selectRelevantDocumentSegments([
    { page_start: 1, content: "Descrição do imóvel" },
    { page_start: 4, content: "Averbação de penhora e ônus" },
  ], "Existe penhora?", 1000);
  assert.deepEqual(selected.map(item => item.page_start), [4]);
});

test("automelhoria: só cria propostas com evidência e nunca aplica mudanças", () => {
  assert.deepEqual(deriveImprovementProposals({ calls: 4, failures: 4 }), []);
  const proposals = deriveImprovementProposals({ calls: 20, failures: 3, fallbacks: 4, averageContextTokens: 15000 });
  assert.deepEqual(proposals.map(item => item.kind), ["reliability", "reliability", "context"]);
  assert.ok(migration.includes("status IN ('suggested','approved','rejected','testing','applied')"));
  assert.ok(migration.includes("agent_improvement_proposals"));
});

test("navegação: Meu Dia, Resolver, Mapa e Relações formam um shell sem painel técnico", () => {
  assert.ok(html.includes('id="openAssistantNav"'));
  assert.ok(html.includes('href="https://corretorinteligente.tech/?origem=painel"'));
  assert.ok(!html.includes('<span>Painel</span>'));
  assert.ok(radar.includes('id="appBack"'));
  assert.ok(radar.includes('>Voltar ao painel</span>'));
  assert.ok(radar.includes('>Painel</a>'));
  assert.ok(radar.includes('function voltarEscritorio(event)'));
  assert.ok(radar.includes('window.location.assign("https://api.corretorinteligente.tech/painel/os")'));
  assert.ok(!radar.includes("history.back()"), "retorno não pode depender do histórico e seus redirects");
  assert.ok(!radar.includes('id="appBack" href="https://api.corretorinteligente.tech/painel/os" hidden'));
  const pages = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.ok(pages.includes("agent/kimi-personal-assistant"), "a branch de produção também publica o mapa estático");
  assert.ok(index.includes('location.search+location.hash'));
});

test("Hermes e deploy: limite real, loop curto e revisão econômica diária", () => {
  assert.ok(installer.includes("context_length: 262144"));
  assert.ok(installer.includes("max_turns: 8"));
  assert.ok(installer.includes("creation_nudge_interval: 0"));
  assert.ok(efficiency.includes('docker exec -i "$CONTAINER" python -'));
  assert.ok(deploy.includes("radar-agent-review.timer"));
  assert.ok(deployApp.includes('RADAR_DEPLOY_BRANCH:-agent/kimi-personal-assistant'));
  assert.ok(deployApp.includes('cmp -s radar-goiania.html "$WEBROOT/radar-goiania.html"'));
  assert.ok(deployAll.includes("motor/deploy-api.sh"));
  assert.ok(deployAll.includes("motor/deploy-app.sh"));
  assert.ok(migration.includes("agent_documents"));
  assert.ok(migration.includes("agent_document_segments"));
});
