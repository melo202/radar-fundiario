// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — MESMO padrao de loader de
// tests/scores.test.mjs/tests/templates.test.mjs (nao duplica a implementacao aqui; testa
// exatamente as mesmas funcoes usadas em runtime pelo app). Fase 11 (11-01): recomendaDocumento
// (DOC-01) + pendenciasDocumento (DOC-02) + fichaRapidaTexto (DOC-01, Ficha rapida) — puro, sem IA.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // Fatiar do inicio da LINHA SEGUINTE ao marcador de start até o inicio da linha do end
  // (mesma tecnica de tests/scores.test.mjs — evita SyntaxError por cortar no meio do comentario).
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  for (const fn of [
    "function recomendaDocumento",
    "function pendenciasDocumento",
    "function fichaRapidaTexto",
    "function scoreConfianca",
    "function habilitaPtam",
  ]) {
    assert.ok(src.includes(fn), `${fn} ausente do bloco RADAR_PURE (dependencia da Task 2 nao cumprida)`);
  }
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {recomendaDocumento,pendenciasDocumento,fichaRapidaTexto,scoreConfianca,habilitaPtam};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// --- habilitaPtam: CRECI E CNAI (nunca CNAI sozinho) — C-07 --------------------------------

test("habilitaPtam exige CRECI E CNAI preenchidos (CNAI sozinho NÃO habilita)", () => {
  assert.equal(P.habilitaPtam({ creci: "12345", cnai: "6789" }), true, "CRECI + CNAI habilita");
  assert.equal(P.habilitaPtam({ creci: "", cnai: "6789" }), false, "CNAI sozinho NÃO habilita");
  assert.equal(P.habilitaPtam({ creci: "12345", cnai: "" }), false, "CRECI sozinho NÃO habilita");
  assert.equal(P.habilitaPtam({ creci: "  ", cnai: "  " }), false, "só espaços NÃO habilita (trim)");
  assert.equal(P.habilitaPtam({}), false, "perfil vazio NÃO habilita");
  assert.equal(P.habilitaPtam(null), false, "perfil ausente NÃO habilita (nunca lança)");
});

// --- recomendaDocumento: matriz 4 finalidades x 2 estados de CNAI (8 combinacoes) -----------

test("recomendaDocumento cobre a matriz completa de finalidade x CNAI (8 combinacoes)", () => {
  for (const caso of FIXTURES.recomendaDocumentoCasos) {
    const result = P.recomendaDocumento(caso.finalidadeUso, caso.cnai);
    assert.equal(
      result.doc,
      caso.expectDoc,
      `recomendaDocumento("${caso.finalidadeUso}", ${caso.cnai}) deveria retornar doc:"${caso.expectDoc}", obteve: ${JSON.stringify(result)}`
    );
    assert.ok(typeof result.porque === "string" && result.porque.length > 0, `recomendaDocumento("${caso.finalidadeUso}", ${caso.cnai}) deveria retornar porque nao-vazio`);
    assert.ok(
      result.porque.toLowerCase().includes(caso.expectPorqueContains.toLowerCase()),
      `recomendaDocumento("${caso.finalidadeUso}", ${caso.cnai}).porque deveria conter "${caso.expectPorqueContains}", obteve: ${JSON.stringify(result.porque)}`
    );
  }
});

test('recomendaDocumento("formal", false) recomenda "relatorio" (NUNCA "ptam") explicando que o PTAM pressupoe CNAI', () => {
  const result = P.recomendaDocumento("formal", false);
  assert.equal(result.doc, "relatorio", `recomendaDocumento("formal", false) deveria ser "relatorio", obteve: ${JSON.stringify(result)}`);
  const lower = result.porque.toLowerCase();
  assert.ok(lower.includes("cnai"), `porque deveria citar "CNAI", obteve: ${JSON.stringify(result.porque)}`);
  assert.ok(lower.includes("ptam"), `porque deveria citar "PTAM", obteve: ${JSON.stringify(result.porque)}`);
});

test('recomendaDocumento("formal", true) recomenda "ptam" com explicacao positiva citando CNAI', () => {
  const result = P.recomendaDocumento("formal", true);
  assert.equal(result.doc, "ptam", `recomendaDocumento("formal", true) deveria ser "ptam", obteve: ${JSON.stringify(result)}`);
  assert.ok(result.porque.toLowerCase().includes("cnai"), `porque deveria citar "CNAI" de forma positiva, obteve: ${JSON.stringify(result.porque)}`);
});

test("recomendaDocumento: os 4 textos de porque (1 por finalidade) sao todos DIFERENTES entre si (nunca generico)", () => {
  const porques = ["apresentar", "captar", "justificar", "formal"].map((f) => P.recomendaDocumento(f, false).porque);
  const porquesUnicos = new Set(porques);
  assert.equal(porquesUnicos.size, 4, `os 4 textos de porque deveriam ser todos diferentes, obteve: ${JSON.stringify(porques)}`);
});

test("recomendaDocumento com finalidade desconhecida/ausente cai no fallback seguro de 'justificar' (nunca lanca excecao)", () => {
  const result = P.recomendaDocumento("finalidade-inexistente", false);
  assert.equal(result.doc, "relatorio", `fallback deveria retornar doc:"relatorio" (mesmo de justificar), obteve: ${JSON.stringify(result)}`);
  const resultUndef = P.recomendaDocumento(undefined, false);
  assert.equal(resultUndef.doc, "relatorio", `fallback com finalidadeUso undefined deveria retornar doc:"relatorio", obteve: ${JSON.stringify(resultUndef)}`);
});

// --- pendenciasDocumento: reuso de scoreConfianca + distincao pendencia-vs-nota -------------

test("pendenciasDocumento: caso media (1 pendencia de area, docOk indefinido = pendente)", () => {
  const caso = FIXTURES.pendenciasDocumentoCasos[0];
  const result = P.pendenciasDocumento(caso.inputs);
  assert.equal(result.conf.nivel, caso.expectNivel, `conf.nivel deveria ser "${caso.expectNivel}", obteve: ${JSON.stringify(result.conf)}`);

  const itemArea = result.itens.find((i) => i.id === "area");
  assert.ok(itemArea, `deveria existir exatamente 1 item com id "area", obteve: ${JSON.stringify(result.itens)}`);
  assert.equal(itemArea.resolvido, caso.expectItens.area, `item "area" deveria ter resolvido:${caso.expectItens.area}, obteve: ${JSON.stringify(itemArea)}`);

  const itensArea = result.itens.filter((i) => i.id === "area");
  assert.equal(itensArea.length, 1, `deveria existir exatamente 1 item com id "area", obteve ${itensArea.length}`);

  const itemConservacao = result.itens.find((i) => i.id === "conservacao");
  assert.ok(itemConservacao, `item "conservacao" deveria estar sempre presente, obteve: ${JSON.stringify(result.itens)}`);
  assert.equal(itemConservacao.resolvido, true, `item "conservacao" deveria ter resolvido:true sempre, obteve: ${JSON.stringify(itemConservacao)}`);

  const itemDoc = result.itens.find((i) => i.id === "documentacao");
  assert.ok(itemDoc, `item "documentacao" deveria estar presente, obteve: ${JSON.stringify(result.itens)}`);
  assert.equal(itemDoc.resolvido, false, `item "documentacao" com docOk undefined deveria ter resolvido:false (pendente), obteve: ${JSON.stringify(itemDoc)}`);
});

test("pendenciasDocumento: caso alta (tudo confirmado, docOk=true = resolvido)", () => {
  const caso = FIXTURES.pendenciasDocumentoCasos[1];
  const result = P.pendenciasDocumento(caso.inputs);
  assert.equal(result.conf.nivel, caso.expectNivel, `conf.nivel deveria ser "${caso.expectNivel}", obteve: ${JSON.stringify(result.conf)}`);

  const itemArea = result.itens.find((i) => i.id === "area");
  assert.equal(itemArea.resolvido, true, `item "area" deveria ter resolvido:true, obteve: ${JSON.stringify(itemArea)}`);

  const itemDoc = result.itens.find((i) => i.id === "documentacao");
  assert.equal(itemDoc.resolvido, true, `item "documentacao" com docOk=true deveria ter resolvido:true, obteve: ${JSON.stringify(itemDoc)}`);
});

test('pendenciasDocumento NUNCA inclui um item "conservacao" com resolvido:false (estado de conservacao sempre tem default, nunca pendente)', () => {
  for (const caso of FIXTURES.pendenciasDocumentoCasos) {
    const result = P.pendenciasDocumento(caso.inputs);
    const itemConservacao = result.itens.find((i) => i.id === "conservacao");
    assert.ok(itemConservacao, `item "conservacao" deveria estar presente`);
    assert.equal(itemConservacao.resolvido, true, `item "conservacao" nunca deveria ter resolvido:false, obteve: ${JSON.stringify(itemConservacao)}`);
  }
  // docOk===false explicito tambem nao deveria afetar "conservacao"
  const result = P.pendenciasDocumento({ areaOk: true, nComps: 10, atipico: false, venalOk: true, docOk: false });
  const itemConservacao = result.itens.find((i) => i.id === "conservacao");
  assert.equal(itemConservacao.resolvido, true, `item "conservacao" deveria permanecer resolvido:true mesmo com docOk:false, obteve: ${JSON.stringify(itemConservacao)}`);
  const itemDoc = result.itens.find((i) => i.id === "documentacao");
  assert.equal(itemDoc.resolvido, false, `item "documentacao" com docOk:false deveria ter resolvido:false, obteve: ${JSON.stringify(itemDoc)}`);
});

test("pendenciasDocumento reusa scoreConfianca internamente (mesmo nivel/porque do calculo bruto, sem duplicar logica)", () => {
  for (const caso of FIXTURES.pendenciasDocumentoCasos) {
    const { areaOk, nComps, atipico, venalOk } = caso.inputs;
    const bruto = P.scoreConfianca({ areaOk, nComps, atipico, venalOk });
    const result = P.pendenciasDocumento(caso.inputs);
    assert.equal(result.conf.nivel, bruto.nivel, `pendenciasDocumento.conf.nivel deveria ser IDENTICO ao scoreConfianca bruto, obteve ${result.conf.nivel} vs ${bruto.nivel}`);
    assert.equal(JSON.stringify(result.conf.porque), JSON.stringify(bruto.porque), `pendenciasDocumento.conf.porque deveria ser IDENTICO ao scoreConfianca bruto`);
  }
});

// --- fichaRapidaTexto: honestidade de faixa/comparaveis + zero jargao -----------------------

test("fichaRapidaTexto com data.faixa=null retorna faixaTxt:null (nunca string com NaN/undefined)", () => {
  const result = P.fichaRapidaTexto(FIXTURES.fichaRapidaCasos.semFaixaComComparaveis);
  assert.equal(result.faixaTxt, null, `faixaTxt deveria ser null quando data.faixa=null, obteve: ${JSON.stringify(result.faixaTxt)}`);
});

test("fichaRapidaTexto com data.faixa preenchida retorna faixaTxt string nao-vazia contendo 'R$'", () => {
  const result = P.fichaRapidaTexto(FIXTURES.fichaRapidaCasos.comFaixaSemComparaveis);
  assert.ok(typeof result.faixaTxt === "string" && result.faixaTxt.length > 0, `faixaTxt deveria ser string nao-vazia, obteve: ${JSON.stringify(result.faixaTxt)}`);
  assert.ok(result.faixaTxt.includes("R$"), `faixaTxt deveria conter "R$", obteve: ${JSON.stringify(result.faixaTxt)}`);
});

test('fichaRapidaTexto: nenhum campo do retorno contem "mediana"/"percentil"/"quartil" (case-insensitive)', () => {
  const jargoes = ["mediana", "percentil", "quartil"];
  for (const data of Object.values(FIXTURES.fichaRapidaCasos)) {
    const result = P.fichaRapidaTexto(data);
    const textoTotal = JSON.stringify(result).toLowerCase();
    for (const jargao of jargoes) {
      assert.ok(!textoTotal.includes(jargao), `fichaRapidaTexto NAO deveria conter "${jargao}", obteve: ${JSON.stringify(result)}`);
    }
  }
});

test("fichaRapidaTexto com data.comparaveis ausente retorna comparaveis:[] (nunca inventa 3 comparaveis genericos)", () => {
  const result = P.fichaRapidaTexto(FIXTURES.fichaRapidaCasos.comFaixaSemComparaveis);
  assert.ok(Array.isArray(result.comparaveis), `comparaveis deveria ser um array, obteve: ${JSON.stringify(result.comparaveis)}`);
  assert.equal(result.comparaveis.length, 0, `comparaveis deveria ser [] quando data.comparaveis ausente, obteve: ${JSON.stringify(result.comparaveis)}`);
});

test("fichaRapidaTexto com data.comparaveis preenchido (<=3) retorna o mesmo array", () => {
  const data = FIXTURES.fichaRapidaCasos.semFaixaComComparaveis;
  const result = P.fichaRapidaTexto(data);
  assert.equal(JSON.stringify(result.comparaveis), JSON.stringify(data.comparaveis), `comparaveis deveria repassar o array de data.comparaveis, obteve: ${JSON.stringify(result.comparaveis)}`);
});

test("fichaRapidaTexto trunca comparaveis em no maximo 3 quando data.comparaveis tem mais de 3", () => {
  const data = FIXTURES.fichaRapidaCasos.comMaisDe3Comparaveis;
  const result = P.fichaRapidaTexto(data);
  assert.equal(result.comparaveis.length, 3, `comparaveis deveria ser truncado em 3, obteve length ${result.comparaveis.length}`);
  assert.equal(JSON.stringify(result.comparaveis), JSON.stringify(data.comparaveis.slice(0, 3)), `comparaveis truncado deveria ser os 3 PRIMEIROS itens, obteve: ${JSON.stringify(result.comparaveis)}`);
});

test('fichaRapidaTexto: ressalva contem "recomenda-se confirmar" (linguagem de responsabilidade travada)', () => {
  for (const data of Object.values(FIXTURES.fichaRapidaCasos)) {
    const result = P.fichaRapidaTexto(data);
    assert.ok(
      result.ressalva.toLowerCase().includes("recomenda-se confirmar"),
      `ressalva deveria conter "recomenda-se confirmar", obteve: ${JSON.stringify(result.ressalva)}`
    );
  }
});

test("fichaRapidaTexto: leitura repassa data.leitura 1:1 (sem reescrever)", () => {
  const data = FIXTURES.fichaRapidaCasos.comFaixaSemComparaveis;
  const result = P.fichaRapidaTexto(data);
  assert.equal(result.leitura, data.leitura, `leitura deveria ser repassada 1:1, obteve: ${JSON.stringify(result.leitura)}`);
});
