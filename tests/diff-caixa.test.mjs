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
const CX = FIXTURES.CAIXA_MATCH_FIX;

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
  // Funcoes novas desta plan (17-01, Task 2) — ausentes em RED, presentes apos GREEN.
  assert.ok(src.includes("function construirNomeParaCdbairro"), "construirNomeParaCdbairro ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function cdbairroDoImovelCaixa"), "cdbairroDoImovelCaixa ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function cruzarCaixaTerritorio"), "cruzarCaixaTerritorio ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function cruzarCaixaSetor"), "cruzarCaixaSetor ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {diffLote,formatarDiff,DIFF_ALLOW,DIFF_THRESH_PCT,DIFF_THRESH_AREA_M2,construirNomeParaCdbairro,cdbairroDoImovelCaixa,cruzarCaixaTerritorio,cruzarCaixaSetor};",
    { filename: "radar-pure-diff-caixa.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// norm() equivalente (mesma logica de radar-goiania.html:1318) usado só para localizar a chave do
// Map dentro dos testes — NUNCA uma 2ª implementação de produção, só um espelho local de teste.
function norm_(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

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

// F5 CAD-02: comparacao de categoricos TIPO-INSENSIVEL — snapshot importado pode ter numero onde a
// ficha tem string (e vice-versa); nunca mais "Uso mudou de Residencial para Residencial".
test("diffLote (F5 CAD-02): uso 1 vs '1' e dtinclusao 20240101 vs '20240101' (so o TIPO difere) -> [] (nunca falso alarme)", () => {
  const out = P.diffLote(DF.usoMesmoValorTipoDiferente.snap, DF.usoMesmoValorTipoDiferente.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.usoMesmoValorTipoDiferente.expect);
});

test("diffLote (F5 CAD-02): mudanca REAL de uso continua reportada mesmo com tipos mistos ('1' -> 2)", () => {
  const out = P.diffLote(DF.usoMudouComTipoDiferente.snap, DF.usoMudouComTipoDiferente.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.usoMudouComTipoDiferente.expect);
});

// F5 CAD-05: 0 -> valor de venal/IPTU reporta (simetrico ao subtipo "nova" de areaedif).
test("diffLote (F5 CAD-05): vlvenal 0->250000 -> {campo:vlvenal,tipo:novo,para:250000} (imovel entrou na base de avaliacao)", () => {
  const out = P.diffLote(DF.vlvenalEntrouNaBase.snap, DF.vlvenalEntrouNaBase.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlvenalEntrouNaBase.expect);
});

test("diffLote (F5 CAD-05): vlimp98 0->800 -> tipo novo; 0->0 segue sem mudanca (honesto)", () => {
  const out = P.diffLote(DF.vlimp98EntrouNaBase.snap, DF.vlimp98EntrouNaBase.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), DF.vlimp98EntrouNaBase.expect);
  const zz = P.diffLote(DF.vlvenalZeroParaZero.snap, DF.vlvenalZeroParaZero.atual);
  assert.deepEqual(JSON.parse(JSON.stringify(zz)), DF.vlvenalZeroParaZero.expect);
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

test("formatarDiff (F5 CAD-05): tipo novo -> 'Valor venal: passou a ter valor (R$ X)…' / 'IPTU: passou a ter lançamento (R$ X)'", () => {
  assert.deepEqual(P.formatarDiff(FD.venalNovo.mudancas, FD.dataFmt), FD.venalNovo.expect);
  assert.deepEqual(P.formatarDiff(FD.iptuNovo.mudancas, FD.dataFmt), FD.iptuNovo.expect);
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

// --- Matching Caixa -> cdbairro (TERR-07) -----------------------------------------------------

test("construirNomeParaCdbairro: nm_disp 'Setor Bueno'/nm_bai 'SETOR BUENO' com cd=52 -> map contem 52", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const codigos = map.get(norm_("SETOR BUENO"));
  assert.ok(codigos, "SETOR BUENO deveria ter entrada no map");
  assert.ok(codigos.has(52), "cd 52 deveria estar no conjunto de SETOR BUENO");
});

test("construirNomeParaCdbairro: dois features com mesmo nome normalizado e cd diferentes -> Set{12,13} (nunca descarta colisao)", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const codigos = map.get(norm_("SANTA GENOVEVA"));
  // instanceof falha cross-realm (Set do sandbox vm != Set deste realm) — verifica pelo shape.
  assert.equal(Object.prototype.toString.call(codigos), "[object Set]", "candidatos deveriam ser um Set, nunca um valor unico");
  assert.equal(codigos.size, 2);
  assert.ok(codigos.has(12) && codigos.has(13));
});

test("construirNomeParaCdbairro: feature sem cd em idParaCd -> nao entra no map (nunca inventa)", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  assert.equal(map.has(norm_("SEM CD")), false);
});

test("cdbairroDoImovelCaixa: b 'SETOR BUENO' com match -> array contendo 52", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const out = P.cdbairroDoImovelCaixa(CX.imoveisCaixa.setorBuenoComXY, map);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [52]);
});

test("cdbairroDoImovelCaixa: b 'RESIDENCIAL JARDINS DO CERRADO 7' sem match -> [] (honesto)", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const out = P.cdbairroDoImovelCaixa(CX.imoveisCaixa.jardinsCerrado7SemMatch, map);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), []);
});

test("cdbairroDoImovelCaixa: b 'JARDIM ATLANTICO' casa nm_disp 'Jardim Atlântico' via norm() (acento/caixa)", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const imovel = { id: "cX", b: "JARDIM ATLANTICO", x: 1, y: 1 };
  const out = P.cdbairroDoImovelCaixa(imovel, map);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [60]);
});

// --- Cruzamento Caixa (TERR-07) -----------------------------------------------------------------

test("cruzarCaixaTerritorio: so inclui imoveis com i.x&&i.y (imovel sem coordenada nunca entra, mesmo com bairro batendo)", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const itensCaderno = [{ ci: "1", cdbairro: 52 }];
  const imoveis = [CX.imoveisCaixa.setorBuenoComXY, CX.imoveisCaixa.setorBuenoSemXY];
  const r = P.cruzarCaixaTerritorio(imoveis, itensCaderno, map);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].id, CX.imoveisCaixa.setorBuenoComXY.id);
  assert.deepEqual(JSON.parse(JSON.stringify(r.bairros)), [52]);
  assert.equal(r.n, 1);
});

test("cruzarCaixaTerritorio: itensCaderno cdbairro 52 + imovel Caixa SETOR BUENO(cd 52) com x/y -> matches inclui o imovel", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const itensCaderno = [{ ci: "1", cdbairro: 52 }];
  const r = P.cruzarCaixaTerritorio([CX.imoveisCaixa.setorBuenoComXY], itensCaderno, map);
  assert.equal(r.n, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(r.bairros)), [52]);
});

test("cruzarCaixaTerritorio: nome com >1 cd candidato (Set{12,13}), caderno tem 13 -> bate (some())", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const itensCaderno = [{ ci: "1", cdbairro: 13 }];
  const r = P.cruzarCaixaTerritorio([CX.imoveisCaixa.santaGenovevaColisao], itensCaderno, map);
  assert.equal(r.n, 1);
  assert.equal(r.matches[0].id, CX.imoveisCaixa.santaGenovevaColisao.id);
});

test("cruzarCaixaTerritorio: nenhum item do caderno bate -> matches=[],bairros=[],n:0", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const itensCaderno = [{ ci: "1", cdbairro: 999 }];
  const r = P.cruzarCaixaTerritorio([CX.imoveisCaixa.setorBuenoComXY], itensCaderno, map);
  assert.deepEqual(JSON.parse(JSON.stringify(r.matches)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(r.bairros)), []);
  assert.equal(r.n, 0);
});

// F5 CAD-01: cdbairro do caderno salvo como STRING (import de outro aparelho preserva o tipo do
// JSON; itens legados no store) x cd NUMERO do lookup — o cruzamento deve coagir tipo nas duas
// pontas (mesma familia do fix A-02 em cadernoListar). Antes do fix, n=0 silencioso.
test("cruzarCaixaTerritorio (F5 CAD-01): itensCaderno com cdbairro STRING '52' cruza com cd numero 52 -> n=1, nunca 0 silencioso", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const itensCaderno = [{ ci: "1", cdbairro: "52" }]; // string, exatamente o que validarImportCaderno preserva
  const r = P.cruzarCaixaTerritorio([CX.imoveisCaixa.setorBuenoComXY], itensCaderno, map);
  assert.equal(r.n, 1, "cdbairro string do caderno deveria cruzar com o cd numérico do lookup (coerção de tipo)");
  assert.equal(r.matches[0].id, CX.imoveisCaixa.setorBuenoComXY.id);
});

test("cruzarCaixaSetor (F5 CAD-01): cdbairro STRING '52' casa com cd numero 52 do lookup (coerção nas duas pontas)", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const r = P.cruzarCaixaSetor([CX.imoveisCaixa.setorBuenoComXY], "52", map);
  assert.equal(r.length, 1, "setor passado como string deveria cruzar com o cd numérico resolvido");
  assert.equal(r[0].id, CX.imoveisCaixa.setorBuenoComXY.id);
});

test("cruzarCaixaSetor: retorna imoveis com x/y cujo cdbairroDoImovelCaixa inclui o cdbairro dado", () => {
  const map = P.construirNomeParaCdbairro(CX.features, CX.idParaCd);
  const imoveis = [CX.imoveisCaixa.setorBuenoComXY, CX.imoveisCaixa.setorBuenoSemXY, CX.imoveisCaixa.jardinsCerrado7SemMatch];
  const r = P.cruzarCaixaSetor(imoveis, 52, map);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, CX.imoveisCaixa.setorBuenoComXY.id);
});
