import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalizeEvidenceUrl, qualifyEvidence } from "../motor/evidence-qualification.js";

const migration = readFileSync(new URL("../motor/migrations/017-evidence-qualification.sql", import.meta.url), "utf-8");
const orchestrator = readFileSync(new URL("../motor/intelligence-orchestrator.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");

const saleScope = { city: "Goiânia", state: "GO", transactionType: "venda" };

test("qualificação: anúncio individual de Goiânia segue para análise", () => {
  const result = qualifyEvidence({
    url: "https://www.chavesnamao.com.br/imovel/casa-a-venda-goiania-go/id-34057026/",
    title: "Sobrado à venda no Villaggio Atlântico, Goiânia",
    excerpt: "Casa com 3 quartos, 180 m², R$ 720.000.",
    metadata: { city: "Goiânia", state: "GO" },
  }, saleScope);
  assert.equal(result.status, "qualified");
  assert.equal(result.usableForAnalysis, true);
  assert.equal(result.contentType, "individual_listing");
  assert.deepEqual(result.reasons, []);
});

test("qualificação: páginas-catálogo são preservadas, mas não gastam K3", () => {
  const result = qualifyEvidence({
    url: "https://www.imovelweb.com.br/imoveis-venda-setor-coimbra-goiania.html?ordem=preco-menor&utm_source=x",
    title: "224 imóveis à venda no Setor Coimbra, Goiânia",
    metadata: { quality: { isCatalogPage: true, comparableGrade: false } },
  }, saleScope);
  assert.equal(result.status, "rejected");
  assert.equal(result.usableForAnalysis, false);
  assert.ok(result.reasons.includes("catalog_page"));
});

test("qualificação: contaminações reais de geografia e veículos são bloqueadas", () => {
  const outside = qualifyEvidence({
    url: "https://exemplo.com/apartamento-sao-paulo-12345678",
    title: "Apartamento à venda em São Paulo - SP",
  }, saleScope);
  assert.ok(outside.reasons.includes("outside_target_geography"));

  const vehicle = qualifyEvidence({
    url: "https://localiza.com/seminovos/cidade-jardim-goiania-12345678",
    title: "Localiza Seminovos Cidade Jardim Goiânia",
    excerpt: "Veículos a partir de R$ 57.790",
  }, saleScope);
  assert.ok(vehicle.reasons.includes("non_property_content"));
  assert.equal(vehicle.usableForAnalysis, false);
});

test("qualificação: aluguel e mudança já invalidada não contaminam pesquisa de venda", () => {
  const rent = qualifyEvidence({
    url: "https://portal.test/imovel/apartamento-aluguel-goiania/id-12345678",
    title: "Apartamento para alugar em Goiânia",
  }, saleScope);
  assert.ok(rent.reasons.includes("transaction_mismatch"));

  const invalidated = qualifyEvidence({
    url: "https://portal.test/imovel/casa-venda-goiania/id-12345679",
    title: "Mudança de preço em casa à venda em Goiânia",
    metadata: { invalidada: true },
  }, saleScope);
  assert.ok(invalidated.reasons.includes("invalidated_identity"));
});

test("qualificação: URL canônica remove rastreamento e ordenação sem perder identidade", () => {
  assert.equal(
    canonicalizeEvidenceUrl("http://WWW.Exemplo.com/imovel/id-12345678/?utm_source=x&gclid=y&b=2&a=1#foto"),
    "https://exemplo.com/imovel/id-12345678?a=1&b=2",
  );
  assert.equal(
    canonicalizeEvidenceUrl("https://exemplo.com/imoveis/ordem-preco-menor/?sort=asc"),
    "https://exemplo.com/imoveis",
  );
});

test("qualificação: banco preserva rejeitados, registra saúde e o K3 lê somente úteis", () => {
  for (const column of ["qualification_status", "qualification jsonb", "usable_for_analysis"]) assert.ok(migration.includes(column));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS intelligence_source_registry"));
  assert.ok(orchestrator.includes("usable_for_analysis IS TRUE"));
  assert.ok(orchestrator.includes("requalifyPendingEvidence"));
  assert.ok(orchestrator.includes("refreshSourceRegistry"));
  assert.ok(orchestrator.includes("sources: sources.rows"));
  assert.ok(orchestrator.includes("rejectedEvidence"));
  assert.ok(app.includes("evidência(s) útil(eis)"));
  assert.ok(app.includes("descartada(s)"));
  assert.ok(app.includes("Esta tela atualiza sozinha"));
  assert.ok(app.includes("schedulePropertyIntelligencePoll"));
});
