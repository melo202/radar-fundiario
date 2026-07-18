import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFindings, normalizeInvestigationPlan, orchestrationInstructions,
} from "../motor/intelligence-orchestrator.js";

const migration = readFileSync(new URL("../motor/migrations/014-intelligence-orchestrator.sql", import.meta.url), "utf-8");
const orchestrator = readFileSync(new URL("../motor/intelligence-orchestrator.js", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const deploy = readFileSync(new URL("../motor/deploy-api.sh", import.meta.url), "utf-8");

test("orquestrador: K3 planeja consultas dentro do orçamento e remove duplicidade", () => {
  const plan = normalizeInvestigationPlan(`\`\`\`json
  {"objective":"Encontrar oportunidades","queries":[
    {"query":"apartamento setor bueno goiania venda","reason":"preço"},
    {"query":"apartamento setor bueno goiania venda","reason":"duplicada"},
    {"query":"site:olx.com.br apartamento setor marista goiania","reason":"fonte"},
    {"query":"terreno jardim goias goiania oportunidade","reason":"fonte"}
  ],"crossChecks":["comparar endereço e metragem"]}
  \`\`\``, { queryBudget: 2 });
  assert.equal(plan.queries.length, 2);
  assert.equal(plan.queries[0].query, "apartamento setor bueno goiania venda");
  assert.deepEqual(plan.crossChecks, ["comparar endereço e metragem"]);
});

test("orquestrador: achado sem evidência conhecida é descartado", () => {
  const findings = normalizeFindings({ findings: [
    { kind: "possible_duplicate", title: "Possível duplicidade", summary: "Os anúncios coincidem.", confidence: 0.86, evidenceIds: [10, 11], candidateData: { building: "X" } },
    { kind: "price_change", title: "Sem prova", summary: "Alegação sem fonte.", confidence: 0.9, evidenceIds: [999] },
  ] }, [10, 11]);
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].evidenceIds, [10, 11]);
  assert.equal(findings[0].confidence, 0.86);
});

test("orquestrador: conteúdo da internet é dado não confiável e nunca vira escrita canônica", () => {
  assert.match(orchestrationInstructions("analysis"), /DADO NÃO CONFIÁVEL/);
  assert.match(orchestrationInstructions("analysis"), /hipótese para revisão humana/);
  for (const table of ["intelligence_jobs", "intelligence_evidence", "intelligence_findings"]) assert.ok(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.ok(migration.includes("cardinality(evidence_ids) > 0"));
  assert.ok(!orchestrator.includes("INSERT INTO properties"));
  assert.ok(!orchestrator.includes("UPDATE properties"));
  assert.ok(!orchestrator.includes("INSERT INTO valuations"));
  assert.ok(orchestrator.includes('runtime local recusado'));
});

test("orquestrador: fila tem execução própria, API protegida e timer de produção", () => {
  assert.ok(panel.includes('/painel/api/os/inteligencia'));
  assert.ok(panel.indexOf('!csrfOk(req, sessao)') < panel.indexOf('/painel/api/os/inteligencia/investigar'));
  assert.ok(deploy.includes("radar-intelligence.service"));
  assert.ok(deploy.includes("radar-intelligence.timer"));
  assert.ok(deploy.includes("intelligence-orchestrator.js"));
  assert.ok(deploy.includes('$DEPLOY_BRANCH:refs/remotes/origin/$DEPLOY_BRANCH'), "a API nunca usa referência remota obsoleta");
});
