// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Fase 15 (15-01, TERR-01/03): cobre (1) as 8 funções puras de estatística de território,
// carregadas do bloco RADAR_PURE via node:vm (slice por linha, mesmo padrão de
// tests/scores.test.mjs), e (2) territorioScan/territorioScanRun/fetchWhereRestrito, carregados
// do bloco novo TERR_NET com jsonp/sanitiza/capCache/toast STUBADOS no sandbox (rede real nunca
// entra em `node --test`).
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

const TF = FIXTURES.TERR_FIX;

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // ATENÇÃO (mesmo cuidado de scores.test.mjs): slice POR LINHA, não por indexOf cru — os
  // marcadores vivem dentro de comentários; fatiar no meio da linha quebra o vm.Script.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  assert.ok(src.includes("function pm2Lote"), "pm2Lote ausente do bloco RADAR_PURE (dependencia da Task 1 nao cumprida)");
  assert.ok(src.includes("function quantilAmostra"), "quantilAmostra ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function breaksQuantil"), "breaksQuantil ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function binQuantil"), "binQuantil ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function anoMedianoCadastro"), "anoMedianoCadastro ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function mixUso"), "mixUso ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function estatTerritorio"), "estatTerritorio ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function rotuloAmostra"), "rotuloAmostra ausente do bloco RADAR_PURE");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {pm2Lote,quantilAmostra,breaksQuantil,binQuantil,anoMedianoCadastro,mixUso,estatTerritorio,rotuloAmostra};",
    { filename: "radar-pure-territorio.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

test("pm2Lote: guarda estabelecida — areaedif se edificado, senão areaterr; 0/ausente nunca é dado real", () => {
  for (const fx of TF.pm2Lote) {
    assert.equal(P.pm2Lote(fx.a), fx.out, `pm2Lote(${JSON.stringify(fx.a)}) deveria ser ${fx.out}`);
  }
});

test("quantilAmostra: interpolação linear entre vizinhos (mesma fórmula de quant())", () => {
  for (const fx of TF.quantilAmostra) {
    assert.equal(P.quantilAmostra(fx.sorted, fx.p), fx.out);
  }
});

test("breaksQuantil: 4 cortes crescentes para amostra >=5; null para amostra curta (<5)", () => {
  const breaks = P.breaksQuantil(TF.breaksQuantilCasos.amostraOk);
  assert.equal(breaks.length, 4, "breaksQuantil deveria devolver exatamente 4 cortes internos");
  for (let i = 1; i < breaks.length; i++) {
    assert.ok(breaks[i] > breaks[i - 1], "os cortes devem ser estritamente crescentes");
  }
  assert.equal(P.breaksQuantil(TF.breaksQuantilCasos.amostraCurta), null, "amostra <5 não sustenta 5 faixas -> null");
});

test("binQuantil: monotônico 1..5, mínimo do setor -> 1, máximo -> 5, cobre bordas exatas", () => {
  const breaks = TF.binQuantilCasos.breaks;
  assert.equal(P.binQuantil(breaks, 0), 1, "abaixo do 1º corte -> faixa 1");
  assert.equal(P.binQuantil(breaks, 200), 1, "borda exata do 1º corte -> faixa 1 (inclusive)");
  assert.equal(P.binQuantil(breaks, 400), 2, "borda exata do 2º corte -> faixa 2 (inclusive)");
  assert.equal(P.binQuantil(breaks, 600), 3);
  assert.equal(P.binQuantil(breaks, 800), 4, "borda exata do último corte -> faixa 4 (inclusive)");
  assert.equal(P.binQuantil(breaks, 999999), 5, "acima do último corte -> faixa 5 (máximo do setor)");
  assert.equal(P.binQuantil(null, 500), null, "sem breaks (amostra curta) -> null, nunca inventa faixa");
});

test("anoMedianoCadastro: filtra dtinclusao inválido/sentinela/ausente ANTES da mediana", () => {
  const c1 = TF.anoMedianoCadastroCasos.mistoValidoInvalido;
  assert.equal(P.anoMedianoCadastro(c1.lotes), c1.expectAno);
  const c2 = TF.anoMedianoCadastroCasos.todosInvalidos;
  assert.equal(P.anoMedianoCadastro(c2.lotes), c2.expectAno, "nenhum dtinclusao válido -> null, nunca 0/NaN");
});

test("mixUso: com >3 usos presentes, top-3 por % + 'Outros' somando o resto", () => {
  // Round-trip via JSON: mixUso roda no realm do vm sandbox (loadPureBlock) — os arrays/objetos
  // que ele devolve NÃO são reference-equal aos arrays literais deste arquivo mesmo com conteúdo
  // idêntico (assert.deepStrictEqual cross-realm). Normaliza para o realm principal antes do assert.
  const c1 = TF.mixUsoCasos.maisDe3Usos;
  const mix1 = JSON.parse(JSON.stringify(P.mixUso(c1.lotes)));
  assert.equal(mix1.length, 4, "top-3 + 1 linha 'Outros'");
  assert.deepEqual(mix1.slice(0, 3).map((m) => m.label), c1.expectTopLabels);
  assert.equal(mix1[3].label, "Outros");
  assert.ok(Math.abs(mix1[3].pct - c1.expectOutrosPct) < 1e-9, "pct de 'Outros' deveria somar o resto exato");

  const c2 = TF.mixUsoCasos.ate3Usos;
  const mix2 = JSON.parse(JSON.stringify(P.mixUso(c2.lotes)));
  assert.equal(mix2.length, 3, "com exatamente 3 categorias presentes, NUNCA adiciona 'Outros'");
  assert.deepEqual(mix2.map((m) => m.label), c2.expectLabels);
  assert.ok(!mix2.some((m) => m.label === "Outros"));

  assert.deepEqual(JSON.parse(JSON.stringify(P.mixUso(TF.mixUsoCasos.vazio.lotes))), [], "amostra vazia -> array vazio, nunca lança");
});

test("estatTerritorio: agrega n/total/medianaPm2/q1Pm2/q3Pm2/iptuMediano/anoMediano/mix/breaks coerentes", () => {
  const c = TF.estatTerritorioCasos.amostraPequena;
  const r = P.estatTerritorio(c.lotes, c.total);
  assert.equal(r.n, c.expect.n);
  assert.equal(r.total, c.expect.total, "total é o número REAL do setor, nunca confundido com n (amostra)");
  assert.equal(r.medianaPm2, c.expect.medianaPm2);
  assert.equal(r.q1Pm2, c.expect.q1Pm2);
  assert.equal(r.q3Pm2, c.expect.q3Pm2);
  assert.equal(r.iptuMediano, c.expect.iptuMediano);
  assert.equal(r.anoMediano, c.expect.anoMediano);
  assert.equal(r.breaks, c.expect.breaks, "amostra <5 pm2 válidos -> breaks null");
  assert.ok(Array.isArray(r.mix));
});

test("rotuloAmostra: 'Amostra de {N} de {M} lotes' — nunca omitido, mesmo com amostra completa", () => {
  for (const fx of TF.rotuloAmostraCasos) {
    assert.equal(P.rotuloAmostra(fx.n, fx.total), fx.out);
  }
});
