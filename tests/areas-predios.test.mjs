/* AREAS-PREDIOS-01 (22/07/2026): cruzamento mercado × cadastro por prédio.
   Trava o caso real que motivou tudo: LIV URBAN Marista — plantas reais 38–107 m²,
   cadastro com média de 103 m² (rateio de áreas comuns). A mediana de vitrine dos
   anúncios é o contrapeso honesto, calculado por match determinístico de tokens. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normPredio, montarIndicePredios, prediosNoTitulo, mediana, cruzarAreas } from "../motor/areas-predios.js";
import { areaDaUrl } from "../motor/identidade-anuncio.js";
import { avaliarQualidade } from "../motor/qualidade.js";

test("normPredio é IDÊNTICA à norm() do mapa (chave do JSON casa com o front)", () => {
  assert.equal(normPredio("Cond. Liv Urban Marista"), "COND. LIV URBAN MARISTA",
    "pontuação é preservada — a norm() do mapa também preserva, então as chaves casam");
  assert.equal(normPredio("  edifício   são  paulo "), "EDIFICIO SAO PAULO");
  assert.equal(normPredio("Jardim América"), "JARDIM AMERICA");
});

test("areaDaUrl: metragem de vitrine do slug; fora do padrão = null", () => {
  assert.equal(areaDaUrl("https://chavesnamao.com.br/imovel/apartamento-a-venda-go-goiania-marista-71m2/id-43950549/"), 71);
  assert.equal(areaDaUrl("https://chavesnamao.com.br/imovel/casa-a-venda-go-goiania-goia-390m2/"), 390);
  assert.equal(areaDaUrl("https://www.olx.com.br/imovel/apartamento-1367774783"), null);
  assert.equal(areaDaUrl("https://x.com/imovel-5m2"), null, "5 m² não é área real de imóvel");
  assert.equal(areaDaUrl(""), null);
});

test("índice: nome com um único token curto (<6) fica de fora (genérico demais)", () => {
  const { originais } = montarIndicePredios(["Cond Prime", "Ed Silverstone", "Residencial Liv Urban Marista"]);
  const chaves = [...originais.keys()];
  assert.ok(!chaves.some(c => c.includes("PRIME")), "PRIME sozinho casaria com meio mundo");
  assert.ok(chaves.some(c => c.includes("SILVERSTONE")), "token único longo e raro entra");
  assert.ok(chaves.some(c => c.includes("LIV URBAN MARISTA")));
});

test("match: todos os tokens distintivos precisam estar no título", () => {
  const indice = montarIndicePredios(["Cond Liv Urban Marista", "Cond Liv Urban Bueno", "Reserva Parque das Flores"]);
  const livUrban = normPredio("Cond Liv Urban Marista");
  assert.deepEqual(prediosNoTitulo("Apartamento no Liv Urban Marista, 2 quartos, Goiânia", indice), [livUrban]);
  assert.deepEqual(prediosNoTitulo("Apto Liv Urban Bueno 1 quarto", indice), [normPredio("Cond Liv Urban Bueno")],
    "falta MARISTA no título — não pode casar com o Marista");
  assert.deepEqual(prediosNoTitulo("Casa no Setor Bueno, 3 quartos", indice), []);
  assert.deepEqual(prediosNoTitulo("Casa no Parque das Flores, 200m²", indice), [normPredio("Reserva Parque das Flores")]);
});

test("mediana: par, ímpar, zeros e vazia", () => {
  assert.equal(mediana([40, 60, 80]), 60);
  assert.equal(mediana([40, 80]), 60);
  assert.equal(mediana([0, null, 50]), 50);
  assert.equal(mediana([]), null);
});

test("cruzarAreas: LIV URBAN — mediana de vitrine honesta mesmo com 1 anúncio inflado", () => {
  const r = cruzarAreas(["Cond Liv Urban Marista", "Ed Sem Anuncios"], [
    { titulo: "Studio Liv Urban Marista à venda", area: 38 },
    { titulo: "Apto Liv Urban Marista 2 quartos", area: 56 },
    { titulo: "Cobertura Liv Urban Marista 3 quartos", area: 107 },
    { titulo: "Liv Urban Marista oportunidade", area: 183 }, /* número errado no anúncio */
    { titulo: "Casa Jardim Goiás", area: 200 },
  ]);
  const liv = r.predios[normPredio("Cond Liv Urban Marista")];
  assert.ok(liv, "3+ anúncios casados → entra no cruzamento");
  assert.equal(liv.n, 4);
  assert.equal(liv.medianaM2, 82, "mediana (56+107)/2 — o outlier de 183 não arrasta como arrastaria uma média");
  assert.ok(!r.predios[normPredio("Ed Sem Anuncios")], "prédio sem anúncio não entra");
  assert.equal(r.minAnuncios, 3);
  assert.ok(r.fonte.includes("ofertas"), "fonte declarada sempre");
});

test("cruzarAreas: menos de 3 anúncios não sustenta mediana", () => {
  const r = cruzarAreas(["Cond Liv Urban Marista"], [
    { titulo: "Studio Liv Urban Marista", area: 38 },
    { titulo: "Apto Liv Urban Marista", area: 56 },
  ]);
  assert.deepEqual(r.predios, {});
});

test("qualidade: área da URL prevalece e divergência grande vira razão explícita", () => {
  const q = avaliarQualidade({
    url: "https://chavesnamao.com.br/imovel/apartamento-a-venda-go-goiania-marista-56m2/id-123456/",
    titulo: "Apartamento no Liv Urban, Setor Marista, Goiânia",
    descricao: "2 quartos, área total do empreendimento 3000m², R$ 450.000",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Marista", totalAreaM2: 3000, bedrooms: 2, askingPrice: 450000 },
  });
  assert.ok(q.razoes.some(r => r.includes("diverge da URL")), `razões: ${q.razoes.join(" | ")}`);
  assert.equal(q.comparableGrade, true, "com a área da URL (56 m²), o comparável se salva — era o caso LIV URBAN");
});

test("qualidade: apartamento de prédio inteiro (3000 m²) é implausível MESMO sem URL", () => {
  const q = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/id-1234567890",
    titulo: "Apartamento em Goiânia",
    descricao: "2 quartos, R$ 450.000",
    extracao: { propertyType: "apartamento", neighborhood: "Centro", totalAreaM2: 3000, askingPrice: 450000 },
  });
  assert.equal(q.comparableGrade, false);
  assert.ok(q.razoes.some(r => r.includes("área implausível")), `razões: ${q.razoes.join(" | ")}`);
});

test("qualidade: casa de 800 m² segue plausível (limite é por tipo, não genérico)", () => {
  const q = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/id-1234567890",
    titulo: "Casa em condomínio em Goiânia",
    descricao: "5 quartos, 800m², R$ 3.500.000",
    extracao: { propertyType: "casa", neighborhood: "Jardim Goiás", totalAreaM2: 800, askingPrice: 3500000 },
  });
  assert.equal(q.comparableGrade, true, `razões: ${q.razoes.join(" | ")}`);
});
