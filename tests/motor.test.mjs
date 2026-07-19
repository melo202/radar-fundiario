// Peneira de qualidade do motor (plano §6) — o módulo é puro (zero deps), então a
// suíte do repo testa direto. Fixtures derivadas da 1ª colheita real de 15/07/2026,
// incluindo o caso que motivou a peneira: página-catálogo com "3.703 imóveis" lida
// como área pelo extrator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarQualidade } from "../motor/qualidade.js";

test("página-catálogo real da 1ª colheita é reprovada como comparável", () => {
  const q = avaliarQualidade({
    url: "https://www.chavesnamao.com.br/apartamentos-a-venda/go-goiania/setor-bueno/",
    titulo: "Apartamentos à venda em Setor Bueno, Goiânia - GO",
    descricao: "3.703 imóveis à venda no Setor Bueno. Encontre o seu!",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Bueno", totalAreaM2: 3.703, askingPrice: null },
  });
  assert.equal(q.isCatalogPage, true);
  assert.equal(q.comparableGrade, false);
  assert.ok(q.razoes.some(r => r.includes("contagem de imóveis")));
  assert.ok(q.razoes.some(r => r.includes("área implausível")));
});

test("URL de catálogo com ordenação também é pega", () => {
  const q = avaliarQualidade({
    url: "https://www.wimoveis.com.br/venda/apartamentos/go/goiania/setor-bueno/ordem-precio-menor",
    titulo: "Apartamentos à venda no Setor Bueno",
    descricao: "Veja os menores preços",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Bueno" },
  });
  assert.equal(q.isCatalogPage, true);
  assert.equal(q.comparableGrade, false);
});

test("anúncio individual completo passa como comparável", () => {
  const q = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/apartamento-setor-bueno-3-quartos-id-2345678901",
    titulo: "Apartamento 89m² no Setor Bueno",
    descricao: "3 quartos sendo 1 suíte, 2 vagas, R$ 690.000",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Bueno", privateAreaM2: 89,
      bedrooms: 3, suites: 1, parkingSpaces: 2, askingPrice: 690000 },
  });
  assert.equal(q.isCatalogPage, false);
  assert.equal(q.comparableGrade, true);
  assert.ok(q.completenessScore >= 0.6);
});

test("anúncio sem preço nunca vira comparável, mas não é apagado", () => {
  const q = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/casa-id-9988776655",
    titulo: "Casa no Jardim América",
    descricao: "Casa 2 quartos, consulte valores",
    extracao: { propertyType: "casa", neighborhood: "Jardim América", bedrooms: 2, askingPrice: null },
  });
  assert.equal(q.comparableGrade, false);
  assert.ok(q.razoes.some(r => r.includes("sem preço confiável")));
});

/* Auditoria de 19/07 (caso REAL do backfill): casa "para-alugar ... R$950" extraída
   como venda de R$950.000 passou na peneira e ia sujar a mediana do bairro. */
test("aluguel NUNCA vira comparável de venda — a URL do portal decide", () => {
  const q = avaliarQualidade({
    url: "https://www.chavesnamao.com.br/imovel/casa-para-alugar-2-quartos-go-goiania-setor-leste-vila-nova-80m2-RS950/id-14348010/",
    titulo: "Casa com 2 quartos na Rua 214, Setor Leste Vila Nova, Goiânia - GO",
    descricao: "Casa para alugar com 2 quartos, 80m²",
    extracao: { propertyType: "casa", neighborhood: "Setor Leste Vila Nova", totalAreaM2: 80, bedrooms: 2, askingPrice: 950000 },
  });
  assert.equal(q.isRental, true);
  assert.equal(q.comparableGrade, false);
  assert.ok(q.razoes.some(r => r.includes("ALUGUEL")));
});

test("título de aluguel sem menção a venda também é pego; venda com 'aceita alugar' passa", () => {
  const aluguel = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/id-5544332211",
    titulo: "Apartamento para alugar no Setor Bueno",
    descricao: "2 quartos, R$ 1.500",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Bueno", bedrooms: 2, askingPrice: 150000 },
  });
  assert.equal(aluguel.isRental, true);
  assert.equal(aluguel.comparableGrade, false);
  const venda = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/apartamento-a-venda-id-6677889900",
    titulo: "Apartamento à venda no Setor Bueno — aceita também alugar",
    descricao: "3 quartos, 89m², R$ 690.000",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Bueno", privateAreaM2: 89, bedrooms: 3, askingPrice: 690000 },
  });
  assert.equal(venda.isRental, false);
  assert.equal(venda.comparableGrade, true);
});

test("preço e área implausíveis geram razões explícitas", () => {
  const q = avaliarQualidade({
    url: "https://www.exemplo.com.br/imovel/id-1234567890",
    titulo: "Apartamento",
    descricao: "…",
    extracao: { propertyType: "apartamento", neighborhood: "Centro", totalAreaM2: 2, askingPrice: 500 },
  });
  assert.equal(q.comparableGrade, false);
  assert.ok(q.razoes.some(r => r.includes("área implausível")));
  assert.ok(q.razoes.some(r => r.includes("preço implausível")));
});
