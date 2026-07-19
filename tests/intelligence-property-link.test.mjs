import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(new URL("../motor/migrations/016-intelligence-property-links.sql", import.meta.url), "utf-8");
const orchestrator = readFileSync(new URL("../motor/intelligence-orchestrator.js", import.meta.url), "utf-8");
const core = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const tools = readFileSync(new URL("../motor/agent-tools.js", import.meta.url), "utf-8");
const timer = readFileSync(new URL("../motor/radar-intelligence.timer", import.meta.url), "utf-8");

test("radar do imóvel: vínculo distingue fato direto, comparável e contexto de bairro", () => {
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS intelligence_finding_links"));
  for (const relation of ["direct", "comparable", "neighborhood"]) assert.ok(migration.includes(`'${relation}'`));
  assert.ok(migration.includes("j.scope->>'inventoryPropertyId'"), "investigação iniciada no dossiê vira vínculo direto");
  assert.ok(migration.includes("valuation_comparables"), "anúncio da amostra é rotulado como comparável");
  assert.ok(migration.includes("lower(trim(e.metadata->>'neighborhood'))"), "bairro exige igualdade explícita");
  assert.ok(migration.includes("reviewed_at"), "revisão é guardada por vínculo com o imóvel");
});

test("radar do imóvel: dossiê, carteira e Hoje recebem sinais sem promovê-los automaticamente", () => {
  assert.ok(orchestrator.includes("listPropertyIntelligence"));
  assert.ok(orchestrator.includes("requestPropertyInvestigation"));
  assert.ok(core.includes("intelligence_signals"));
  assert.ok(core.includes("intelligencePromise"));
  assert.ok(core.includes('source: "intelligence"'));
  assert.ok(!orchestrator.includes("UPDATE inventory_properties SET"), "K3 não altera o imóvel canônico");
});

test("radar do imóvel: experiência permite investigar, abrir fontes e revisar hipótese", () => {
  assert.ok(app.includes("Radar do imóvel"));
  assert.ok(app.includes('"portfolio","radar"'), "Início leva direto ao filtro de imóveis com sinais");
  assert.ok(app.includes("sinal(is) do radar"));
  assert.ok(app.includes("Investigar este imóvel agora"));
  assert.ok(app.includes("Sobre este imóvel"));
  assert.ok(app.includes("Em um comparável deste imóvel"));
  assert.ok(app.includes("No mesmo bairro"));
  assert.ok(app.includes("Ver fontes"));
  /* Correção Nubank 19/07: 3 ações em linguagem de corretor; sem decisão = acompanhando */
  assert.ok(app.includes("É isso mesmo"));
  assert.ok(app.includes("Não é isso"));
  assert.ok(app.includes('text:"Depois"'));
  assert.ok(app.includes("Próximo passo:"), "cada sinal diz o que FAZER, sem delegar a um chat");
  assert.ok(app.includes("Desfazer decisão"));
  assert.ok(!app.includes("Analisar com o assistente"), "a ação do sinal é do corretor, não de outro chat");
  assert.ok(panel.includes("inteligencia/investigar"));
  assert.ok(panel.includes("reviewPropertyFinding"));
  assert.ok(tools.includes("intelligenceSignals"), "o assistente recebe os sinais vinculados ao imóvel");
});

test("radar do imóvel: fila assíncrona recolhe pedidos em até poucos minutos", () => {
  assert.ok(timer.includes("OnUnitInactiveSec=10m"));
  assert.ok(timer.includes("OnBootSec=2m"));
  assert.ok(!timer.includes("OnCalendar="), "pedido manual não espera a madrugada seguinte");
});
