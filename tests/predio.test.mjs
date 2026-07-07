// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — MESMO padrao de loader de
// tests/negocio.test.mjs/tests/doc.test.mjs (nao duplica a implementacao aqui; testa exatamente
// as mesmas funcoes usadas em runtime pelo app). Fase 12 (12-01): resumoPredio/ordenaUnidades/
// ehAptoProvavel/analisePredicoTexto (PRED-01/PRED-02) — puro, zero requisicao de rede, honesto
// (nunca NaN/undefined em amostra vazia).
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
    "function resumoPredio",
    "function ordenaUnidades",
    "function ehAptoProvavel",
    "function analisePredicoTexto",
  ]) {
    assert.ok(src.includes(fn), `${fn} ausente do bloco RADAR_PURE (dependencia da Task 2 nao cumprida)`);
  }
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {resumoPredio,ordenaUnidades,ehAptoProvavel,analisePredicoTexto};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// --- resumoPredio -------------------------------------------------------------------------

test("resumoPredio([]) retorna amostra vazia honesta: n:0 e todos os demais campos null (nunca NaN)", () => {
  const r = P.resumoPredio(FIXTURES.resumoPredioCasos.vazio.units);
  // Object cross-realm (node:vm) - comparar campo a campo em vez de assert.deepEqual (que checa
  // prototype de objeto entre realms diferentes e falha mesmo com valores idênticos).
  assert.deepEqual({ ...r }, FIXTURES.resumoPredioCasos.vazio.expect);
});

test("resumoPredio(3 unidades sem areaedif>0) retorna areaMedia:null; venalMedio calculado so sobre vlvenal>0", () => {
  const caso = FIXTURES.resumoPredioCasos.semArea;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.areaMedia, caso.expectAreaMedia, `areaMedia deveria ser null, obteve: ${r.areaMedia}`);
  assert.equal(r.venalMedio, caso.expectVenalMedio, `venalMedio deveria ser ${caso.expectVenalMedio}, obteve: ${r.venalMedio}`);
  assert.ok(!Number.isNaN(r.areaMedia) && !Number.isNaN(r.venalMedio), "nunca NaN");
});

test("resumoPredio(unidades sem vlvenal>0 alguma) retorna venalMedio:null; areaMedia calculado normalmente", () => {
  const caso = FIXTURES.resumoPredioCasos.semVenalNenhuma;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.venalMedio, caso.expectVenalMedio);
  assert.equal(r.areaMedia, caso.expectAreaMedia);
});

test("resumoPredio(area/venal mistos com zeros) calcula media SO sobre valores >0, mas n conta todas as unidades", () => {
  const caso = FIXTURES.resumoPredioCasos.mistaComZeros;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.n, caso.expectN);
  assert.equal(r.areaMedia, caso.expectAreaMedia);
  assert.equal(r.venalMedio, caso.expectVenalMedio);
});

test("resumoPredio(__est parcial) calcula estimadoMedio/faixaLo/faixaHi SO sobre unidades com __est truthy", () => {
  const caso = FIXTURES.resumoPredioCasos.comEstimativaParcial;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.estimadoMedio, caso.expectEstimadoMedio);
  assert.equal(r.faixaLo, caso.expectFaixaLo);
  assert.equal(r.faixaHi, caso.expectFaixaHi);
});

test("resumoPredio(nenhuma unidade com __est) retorna os 3 campos de estimativa como null (nunca 2 de 3)", () => {
  const caso = FIXTURES.resumoPredioCasos.semEstimativaNenhuma;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.estimadoMedio, caso.expectEstimadoMedio);
  assert.equal(r.faixaLo, caso.expectFaixaLo);
  assert.equal(r.faixaHi, caso.expectFaixaHi);
});

test("resumoPredio(__est malformado — lo undefined ou hi/lo=0) mantem invariante: os 3 campos de estimativa null (guarda contra entrada suja)", () => {
  const caso = FIXTURES.resumoPredioCasos.estimativaMalformadaParcial;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.estimadoMedio, caso.expectEstimadoMedio, `estimadoMedio deveria ser null com __est malformado, obteve: ${r.estimadoMedio}`);
  assert.equal(r.faixaLo, caso.expectFaixaLo, `faixaLo deveria ser null, obteve: ${r.faixaLo}`);
  assert.equal(r.faixaHi, caso.expectFaixaHi, `faixaHi deveria ser null, obteve: ${r.faixaHi}`);
  assert.ok(!Number.isNaN(r.estimadoMedio), "nunca NaN mesmo com __est malformado");
});

test("resumoPredio: n sempre igual a units.length, independente de quantas tem dados validos", () => {
  const caso = FIXTURES.resumoPredioCasos.nContaTodas;
  const r = P.resumoPredio(caso.units);
  assert.equal(r.n, caso.expectN);
  assert.equal(r.n, caso.units.length);
});

// --- ordenaUnidades ------------------------------------------------------------------------

test('ordenaUnidades(units,"padrao") retorna copia NA MESMA ORDEM (array !== original, conteudo igual)', () => {
  const caso = FIXTURES.ordenaUnidadesCasos.padrao;
  const out = P.ordenaUnidades(caso.units, "padrao");
  assert.notEqual(out, caso.units, "deveria retornar um NOVO array, nunca a mesma referencia");
  assert.deepEqual(out.map((u) => u.id), caso.expectOrderIds);
});

test("ordenaUnidades NAO muta o array recebido nem os objetos dentro dele, para qualquer criterio", () => {
  const caso = FIXTURES.ordenaUnidadesCasos.naoMutacao;
  const originalSnapshot = JSON.stringify(caso.units);
  for (const criterio of ["padrao", "oportunidade", "estimado-asc", "area-desc", "criterio-invalido"]) {
    P.ordenaUnidades(caso.units, criterio);
    assert.equal(JSON.stringify(caso.units), originalSnapshot, `ordenaUnidades(units,"${criterio}") mutou o array/objetos originais`);
  }
});

test('ordenaUnidades(units,"oportunidade"): pm2 mais baixo relativo a media do conjunto vem primeiro; sem base vai pro fim', () => {
  const caso = FIXTURES.ordenaUnidadesCasos.oportunidade;
  const out = P.ordenaUnidades(caso.units, "oportunidade");
  assert.equal(out[0].id, caso.expectFirstId, `primeira unidade deveria ser "${caso.expectFirstId}", obteve: ${out.map((u) => u.id)}`);
  assert.equal(out[out.length - 1].id, caso.expectLastId, `ultima unidade deveria ser "${caso.expectLastId}", obteve: ${out.map((u) => u.id)}`);
});

test('ordenaUnidades(units,"oportunidade") com pm2 empatado mantem ordem relativa original (estabilidade)', () => {
  const caso = FIXTURES.ordenaUnidadesCasos.oportunidadeEmpate;
  const out = P.ordenaUnidades(caso.units, "oportunidade");
  assert.deepEqual(out.map((u) => u.id), caso.expectOrderIds, `ordem deveria ser estavel: ${caso.expectOrderIds}, obteve: ${out.map((u) => u.id)}`);
});

test('ordenaUnidades(units,"estimado-asc"): menor (lo+hi)/2 vem primeiro; sem __est vai pro fim', () => {
  const caso = FIXTURES.ordenaUnidadesCasos.estimadoAsc;
  const out = P.ordenaUnidades(caso.units, "estimado-asc");
  assert.equal(out[0].id, caso.expectFirstId);
  assert.equal(out[out.length - 1].id, caso.expectLastId);
});

test('ordenaUnidades(units,"area-desc"): maior areaedif vem primeiro; areaedif=0/undefined vai pro fim', () => {
  const caso = FIXTURES.ordenaUnidadesCasos.areaDesc;
  const out = P.ordenaUnidades(caso.units, "area-desc");
  assert.equal(out[0].id, caso.expectFirstId);
  const lastIds = out.slice(-caso.expectLastIds.length).map((u) => u.id);
  assert.deepEqual(new Set(lastIds), new Set(caso.expectLastIds), `unidades sem area deveriam estar no fim, obteve: ${out.map((u) => u.id)}`);
});

test('ordenaUnidades(units,"criterio-invalido") comporta-se como "padrao" (fallback seguro, nunca lanca excecao)', () => {
  const caso = FIXTURES.ordenaUnidadesCasos.criterioInvalido;
  assert.doesNotThrow(() => P.ordenaUnidades(caso.units, "criterio-invalido"));
  const out = P.ordenaUnidades(caso.units, "criterio-invalido");
  assert.deepEqual(out.map((u) => u.id), caso.expectOrderIds);
});

// --- ehAptoProvavel ------------------------------------------------------------------------

test("ehAptoProvavel: residencial(uso=1)/misto(uso=5) e nao-garagem -> true; garagem/comercial -> false", () => {
  for (const [nome, caso] of Object.entries(FIXTURES.ehAptoProvavelCasos)) {
    const result = P.ehAptoProvavel(caso.a);
    assert.equal(result, caso.expect, `ehAptoProvavel(${JSON.stringify(caso.a)}) [${nome}] deveria ser ${caso.expect}, obteve: ${result}`);
  }
});

// --- analisePredicoTexto -------------------------------------------------------------------

test("analisePredicoTexto(resumo completo, meta completo) contem todos os elementos do template", () => {
  const caso = FIXTURES.analisePredicoTextoCasos.completo;
  const texto = P.analisePredicoTexto(caso.resumo, caso.meta);
  for (const trecho of [
    "🏢",
    caso.meta.nome,
    "Q " + caso.meta.quadra,
    "L " + caso.meta.lote,
    "unidades",
    "área média",
    "venal médio",
    "estimado médio",
    "faixa",
    caso.meta.endereco,
    "Análise gerada pelo Radar Fundiário.",
  ]) {
    assert.ok(texto.includes(trecho), `analisePredicoTexto deveria conter "${trecho}", obteve:\n${texto}`);
  }
});

test("analisePredicoTexto(estimadoMedio:null) NAO contem 'estimado médio' nem 'faixa' (clausula omitida por completo)", () => {
  const caso = FIXTURES.analisePredicoTextoCasos.semEstimativa;
  const texto = P.analisePredicoTexto(caso.resumo, caso.meta);
  assert.ok(!texto.includes("estimado médio"), `nao deveria conter "estimado médio", obteve:\n${texto}`);
  assert.ok(!texto.includes("faixa"), `nao deveria conter "faixa", obteve:\n${texto}`);
});

test("analisePredicoTexto(areaMedia:null) NAO contem 'área média' (omissao independente por metrica)", () => {
  const caso = FIXTURES.analisePredicoTextoCasos.semArea;
  const texto = P.analisePredicoTexto(caso.resumo, caso.meta);
  assert.ok(!texto.includes("área média"), `nao deveria conter "área média", obteve:\n${texto}`);
  assert.ok(texto.includes("venal médio"), "deveria manter venal médio (metrica presente)");
});

test("analisePredicoTexto(meta.endereco:null) NAO contem '📍' (bloco de endereco omitido)", () => {
  const caso = FIXTURES.analisePredicoTextoCasos.semEndereco;
  const texto = P.analisePredicoTexto(caso.resumo, caso.meta);
  assert.ok(!texto.includes("📍"), `nao deveria conter "📍", obteve:\n${texto}`);
});

test('analisePredicoTexto(resumo zerado, meta.nome:null) retorna string nao-vazia com fallback "Edifício" e "0 unidades"', () => {
  const caso = FIXTURES.analisePredicoTextoCasos.zerado;
  const texto = P.analisePredicoTexto(caso.resumo, caso.meta);
  assert.ok(typeof texto === "string" && texto.length > 0, "deveria retornar string nao-vazia");
  assert.ok(texto.includes("🏢"), "deveria conter o emoji do cabecalho");
  assert.ok(texto.includes("Edifício"), 'deveria conter o fallback "Edifício" quando meta.nome e null');
  assert.ok(texto.includes("0 unidades"), 'deveria conter "0 unidades"');
  assert.ok(texto.includes("Análise gerada pelo Radar Fundiário."), "deveria conter a assinatura");
  assert.ok(!/undefined/i.test(texto), 'nunca deveria conter "undefined"');
  assert.ok(!/NaN/.test(texto), 'nunca deveria conter "NaN"');
  assert.ok(!/\bnull\b/i.test(texto), 'nunca deveria conter "null"');
});

// --- Assert negativo global: nenhuma das 4 funcoes produz "undefined"/"NaN" em nenhuma fixture ---

test('nenhuma saida de texto das 4 funcoes contem literalmente "undefined" ou "NaN", para qualquer fixture', () => {
  const textos = [];
  for (const caso of Object.values(FIXTURES.analisePredicoTextoCasos)) {
    textos.push(P.analisePredicoTexto(caso.resumo, caso.meta));
  }
  for (const texto of textos) {
    assert.ok(!/undefined/i.test(texto), `saida nunca deveria conter "undefined", obteve:\n${texto}`);
    assert.ok(!/NaN/.test(texto), `saida nunca deveria conter "NaN", obteve:\n${texto}`);
  }
});
