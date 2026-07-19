import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPARABLE_POLICY, comparableSimilarity } from "../motor/avaliacao.js";

const subject = { areaM2: 100, bedrooms: 3 };

test("comparáveis: área fica na faixa profissional de 75% a 133%", () => {
  assert.equal(COMPARABLE_POLICY.areaRatioMin, 0.75);
  assert.equal(COMPARABLE_POLICY.areaRatioMax, 4 / 3);
  assert.equal(comparableSimilarity(subject, { area: 74, bedrooms: 3 }).reason, "area_fora_da_faixa");
  assert.equal(comparableSimilarity(subject, { area: 75, bedrooms: 3 }).ok, true);
  assert.equal(comparableSimilarity(subject, { area: 133, bedrooms: 3 }).ok, true);
  assert.equal(comparableSimilarity(subject, { area: 134, bedrooms: 3 }).reason, "area_fora_da_faixa");
});

test("comparáveis: diferença superior a um quarto é incompatível quando o dado existe", () => {
  assert.equal(comparableSimilarity(subject, { area: 100, bedrooms: 4 }).ok, true);
  assert.equal(comparableSimilarity(subject, { area: 100, bedrooms: 5 }).reason, "quartos_incompativeis");
  assert.equal(comparableSimilarity(subject, { area: 100, bedrooms: null }).ok, true);
});

test("início guiado: entrada direta, sugestões, primeiros passos e ajuda recuperável", () => {
  const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");
  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.ok(html.includes('id="homeAssistantForm"'));
  assert.ok(html.includes('id="guideCard"'));
  assert.ok(html.includes('id="openGuide"'));
  assert.ok(html.includes("Peça como você falaria com sua equipe"));
  assert.ok(app.includes("askFromHome"));
  assert.ok(app.includes("ci-guide-hidden"));
});

test("gate de confiança (P0 17/07): corretor vê inclusões e exclusões antes de usar o número", () => {
  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.ok(app.includes("painelComparaveis"), "painel de transparência existe no dossiê");
  assert.ok(app.includes("Como esse número foi formado"), "número nunca é caixa-preta");
  assert.ok(app.includes("O que a pesquisa encontrou e por que não há número"), "sem número também tem transparência");
  assert.ok(app.includes("Contexto regional — nunca entra no valor"), "outro bairro jamais vira valor");
  assert.ok(app.includes("Fora da cerca estatística"), "outliers aparecem com razão");
  assert.ok(app.includes("excluída(s) por você em revisão"), "exclusão manual do corretor fica visível");
  /* atributos exigidos pela decisão: bairro, área, quartos, preço, fonte, distância, motivo */
  for (const attr of ["c.bairro", "c.area", "c.quartos", "c.preco", "c.portal", "c.distanciaM", "motivoExclusao"])
    assert.ok(app.includes(attr), `atributo ausente na linha do comparável: ${attr}`);
  /* pino nos DOIS call sites (pente-fino 19/07): a função existir não basta — precisa
     estar anexada tanto no caminho sem número quanto no calculada */
  assert.ok(app.includes("painelIns=painelComparaveis(d)"), "painel anexado no caminho amostra_insuficiente");
  assert.ok(app.includes("const painel=painelComparaveis(d)"), "painel anexado no caminho calculada");
  /* avaliação restaurada não persiste a lista — o rótulo usa o total do sample */
  assert.ok(app.includes("s.totalAccepted"), "rótulo honesto quando a lista não veio na restauração");
});

test("avaliações antigas com bairros ampliados são retiradas de uso sem apagar a trilha", () => {
  const migration = readFileSync(new URL("../motor/migrations/011-comparable-policy.sql", import.meta.url), "utf-8");
  assert.ok(migration.includes("status = 'revisao_necessaria'"));
  assert.ok(migration.includes("sample,amostraAmpliada"));
  assert.ok(migration.includes("politica-comparaveis-atualizada"));
  assert.ok(!migration.includes("DELETE FROM valuations"));
});
