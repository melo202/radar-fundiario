// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Fase 17 (17-01, TERR-06/07): cobre as funcoes puras de diff de cadastro (diffLote/formatarDiff)
// e, a partir da Task 2, de matching/cruzamento Caixa (construirNomeParaCdbairro/
// cdbairroDoImovelCaixa/cruzarCaixaTerritorio/cruzarCaixaSetor), carregadas do bloco RADAR_PURE
// via node:vm (slice por linha, mesmo padrao de tests/caderno.test.mjs) — rede/I-O real
// (IndexedDB) nunca entra em `node --test`.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

const DF = FIXTURES.DIFF_FIX;
const FD = FIXTURES.FORMATAR_DIFF_FIX;

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // ATENCAO (mesmo cuidado de caderno.test.mjs/territorio.test.mjs): slice POR LINHA, nao por
  // indexOf cru — os marcadores vivem dentro de comentarios; fatiar no meio da linha quebra o
  // vm.Script.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  // Dependencia reusada (ja existente, Fase 15) — falha limpo se regredir.
  assert.ok(src.includes("const norm="), "norm() ausente do bloco RADAR_PURE");
  // Funcoes novas desta plan (17-01, Task 1) — ausentes em RED, presentes apos GREEN.
  assert.ok(src.includes("function diffLote"), "diffLote ausente do bloco RADAR_PURE (Task 1 nao cumprida)");
  assert.ok(src.includes("function formatarDiff"), "formatarDiff ausente do bloco RADAR_PURE (Task 1 nao cumprida)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {diffLote,formatarDiff,DIFF_ALLOW,DIFF_THRESH_PCT,DIFF_THRESH_AREA_M2};",
    { filename: "radar-pure-diff-caixa.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// --- diffLote (TERR-06) ---------------------------------------------------------------------

test("diffLote: vlvenal subiu 12% (acima do threshold de 1%) -> [{campo,tipo:pct,direcao:subiu,pct:12}]", () => {
  const out = P.diffLote(DF.vlvenalSubiu12.snap, DF.vlvenalSubiu12.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlvenalSubiu12.expect);
});

test("diffLote: vlvenal +0.5% (abaixo do threshold) -> [] (ignora ruido)", () => {
  const out = P.diffLote(DF.vlvenalRuido.snap, DF.vlvenalRuido.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlvenalRuido.expect);
});

test("diffLote: vlvenal desceu 10% -> direcao desceu, pct:10", () => {
  const out = P.diffLote(DF.vlvenalDesceu10.snap, DF.vlvenalDesceu10.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlvenalDesceu10.expect);
});

test("diffLote: vlimp98 subiu acima de 1% -> mesma regra do venal (tipo pct)", () => {
  const out = P.diffLote(DF.vlimp98Subiu.snap, DF.vlimp98Subiu.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlimp98Subiu.expect);
});

test("diffLote: vlimp98 desceu acima de 1% -> tipo pct, direcao desceu", () => {
  const out = P.diffLote(DF.vlimp98Desceu.snap, DF.vlimp98Desceu.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlimp98Desceu.expect);
});

test("diffLote: areaedif 0->85 -> {campo:areaedif,tipo:area,subtipo:nova,delta:85}", () => {
  const out = P.diffLote(DF.areaedifNova.snap, DF.areaedifNova.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.areaedifNova.expect);
});

test("diffLote: areaedif 120->0 -> subtipo:demolicao,delta:120", () => {
  const out = P.diffLote(DF.areaedifDemolicao.snap, DF.areaedifDemolicao.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.areaedifDemolicao.expect);
});

test("diffLote: areaedif 100->160 (nao cruza zero) -> subtipo:aumentou,delta:60", () => {
  const out = P.diffLote(DF.areaedifAumentou.snap, DF.areaedifAumentou.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.areaedifAumentou.expect);
});

test("diffLote: areaedif 160->100 -> subtipo:diminuiu,delta:60", () => {
  const out = P.diffLote(DF.areaedifDiminuiu.snap, DF.areaedifDiminuiu.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.areaedifDiminuiu.expect);
});

test("diffLote: areaedif 100->100.5 (< DIFF_THRESH_AREA_M2) -> nao entra na lista", () => {
  const out = P.diffLote(DF.areaedifRuido.snap, DF.areaedifRuido.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.areaedifRuido.expect);
});

test("diffLote: uso 1->2 -> {campo:uso,tipo:categorico,de:1,para:2}", () => {
  const out = P.diffLote(DF.usoMudou.snap, DF.usoMudou.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.usoMudou.expect);
});

test("diffLote: dtinclusao mudou -> {campo:dtinclusao,tipo:categorico}", () => {
  const out = P.diffLote(DF.dtinclusaoMudou.snap, DF.dtinclusaoMudou.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.dtinclusaoMudou.expect);
});

test("diffLote: snap===atual em todos os 5 campos -> [] (honesto, reabrir na mesma sessao)", () => {
  const out = P.diffLote(DF.semMudancaRelevante.snap, DF.semMudancaRelevante.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.semMudancaRelevante.expect);
});

test("diffLote: campo ausente/null num dos lados -> nunca lanca, tratado como sem mudanca", () => {
  assert.doesNotThrow(() => P.diffLote(DF.campoAusenteNumLado.snap, DF.campoAusenteNumLado.atual));
  const out = P.diffLote(DF.campoAusenteNumLado.snap, DF.campoAusenteNumLado.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.campoAusenteNumLado.expect);
  // nunca lanca mesmo com snap/atual null/undefined inteiros
  assert.doesNotThrow(() => P.diffLote(null, undefined));
  assert.deepEqual(JSON.parse(JSON.stringify(P.diffLote(null, undefined))), []);
});

// --- formatarDiff (TERR-06) ------------------------------------------------------------------

test("formatarDiff: venal subiu -> 'Valor venal subiu {pct}% desde {dataFmt}'", () => {
  assert.deepEqual(P.formatarDiff(FD.venalSubiu.mudancas, FD.dataFmt), FD.venalSubiu.expect);
});

test("formatarDiff: venal desceu -> 'Valor venal desceu {pct}% desde {dataFmt}'", () => {
  assert.deepEqual(P.formatarDiff(FD.venalDesceu.mudancas, FD.dataFmt), FD.venalDesceu.expect);
});

test("formatarDiff: areaedif nova -> 'Área construída: +{delta} m² — construção nova?'", () => {
  assert.deepEqual(P.formatarDiff(FD.areaedifNova.mudancas, FD.dataFmt), FD.areaedifNova.expect);
});

test("formatarDiff: areaedif demolicao -> 'Área construída: -{delta} m² — demolição?'", () => {
  assert.deepEqual(P.formatarDiff(FD.areaedifDemolicao.mudancas, FD.dataFmt), FD.areaedifDemolicao.expect);
});

test("formatarDiff: areaedif aumentou -> 'Área construída aumentou {delta} m²'", () => {
  assert.deepEqual(P.formatarDiff(FD.areaedifAumentou.mudancas, FD.dataFmt), FD.areaedifAumentou.expect);
});

test("formatarDiff: areaedif diminuiu -> 'Área construída diminuiu {delta} m²'", () => {
  assert.deepEqual(P.formatarDiff(FD.areaedifDiminuiu.mudancas, FD.dataFmt), FD.areaedifDiminuiu.expect);
});

test("formatarDiff: IPTU subiu -> 'IPTU subiu {pct}% desde {dataFmt}'", () => {
  assert.deepEqual(P.formatarDiff(FD.iptuSubiu.mudancas, FD.dataFmt), FD.iptuSubiu.expect);
});

test("formatarDiff: uso mudou -> rotulos via USO[...], nunca codigo cru", () => {
  assert.deepEqual(P.formatarDiff(FD.usoMudou.mudancas, FD.dataFmt), FD.usoMudou.expect);
});

test("formatarDiff: dtinclusao -> 'Data de cadastro atualizada'", () => {
  assert.deepEqual(P.formatarDiff(FD.dtinclusaoMudou.mudancas, FD.dataFmt), FD.dtinclusaoMudou.expect);
});

test("formatarDiff: mudancas vazio/null -> [] (nunca lanca)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(P.formatarDiff([], FD.dataFmt))), []);
  assert.doesNotThrow(() => P.formatarDiff(null, FD.dataFmt));
  assert.deepEqual(JSON.parse(JSON.stringify(P.formatarDiff(null, FD.dataFmt))), []);
});
