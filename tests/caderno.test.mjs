// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Fase 16 (16-01, TERR-04/05): cobre as funcoes puras do Detector de Lote Subutilizado
// (medianasPorQuadra/limiarQuadraValorizada/razaoOcupacao/detectarSubutilizados/leituraDetector)
// e as funcoes puras de decisao do Caderno (sanitizeCaderno/statusValido/validarImportCaderno),
// carregadas do bloco RADAR_PURE via node:vm (slice por linha, mesmo padrao de
// tests/territorio.test.mjs) — rede/I-O real (IndexedDB) nunca entra em `node --test`.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

const DF = FIXTURES.DETECTOR_FIX;
const CF = FIXTURES.CADERNO_FIX;

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // ATENCAO (mesmo cuidado de territorio.test.mjs): slice POR LINHA, nao por indexOf cru — os
  // marcadores vivem dentro de comentarios; fatiar no meio da linha quebra o vm.Script.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  // Dependencias reusadas (ja existentes, Fase 15) — falham limpo se a Fase 15 regredir.
  assert.ok(src.includes("function pm2Lote"), "pm2Lote ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function quantilAmostra"), "quantilAmostra ausente do bloco RADAR_PURE");
  // Funcoes novas desta plan (16-01) — ausentes em RED, presentes apos GREEN (Tasks 2/3).
  assert.ok(src.includes("function medianasPorQuadra"), "medianasPorQuadra ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function limiarQuadraValorizada"), "limiarQuadraValorizada ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function razaoOcupacao"), "razaoOcupacao ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function detectarSubutilizados"), "detectarSubutilizados ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function leituraDetector"), "leituraDetector ausente do bloco RADAR_PURE (Task 2 nao cumprida)");
  assert.ok(src.includes("function sanitizeCaderno"), "sanitizeCaderno ausente do bloco RADAR_PURE (Task 3 nao cumprida)");
  assert.ok(src.includes("function statusValido"), "statusValido ausente do bloco RADAR_PURE (Task 3 nao cumprida)");
  assert.ok(src.includes("function validarImportCaderno"), "validarImportCaderno ausente do bloco RADAR_PURE (Task 3 nao cumprida)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {medianasPorQuadra,limiarQuadraValorizada,razaoOcupacao,detectarSubutilizados,leituraDetector,DETECTOR_RATIO_MAX,sanitizeCaderno,CADERNO_STATUS,statusValido,validarImportCaderno};",
    { filename: "radar-pure-caderno.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// --- Detector de Lote Subutilizado (TERR-04) ----------------------------------------------

test("medianasPorQuadra: agrupa por nrquadra, ignora nrquadra null e pm2 invalido; quadra sem pm2 valido nao aparece", () => {
  const out = P.medianasPorQuadra(DF.medianasPorQuadra.lotes);
  assert.deepEqual(out, DF.medianasPorQuadra.expect);
  assert.ok(!("30" in out), "quadra sem nenhum pm2 valido nao deveria aparecer no resultado");
  assert.ok(!("null" in out) && !("undefined" in out), "lote sem nrquadra nunca cria uma quadra fantasma");
});

test("limiarQuadraValorizada: Q3 dos MEDIANOS de quadra; null para <4 quadras distintas", () => {
  assert.equal(
    P.limiarQuadraValorizada(DF.limiarQuadraValorizada.menosDe4.medianas),
    DF.limiarQuadraValorizada.menosDe4.expect,
    "amostra <4 quadras nao sustenta um quartil informativo -> null, nunca inventa limiar"
  );
  assert.equal(
    P.limiarQuadraValorizada(DF.limiarQuadraValorizada.quatroOuMais.medianas),
    DF.limiarQuadraValorizada.quatroOuMais.expect
  );
});

test("razaoOcupacao: distingue areaedif===0 (terreno vago, INCLUI/0) de areaedif==null/undefined (registro incompleto, EXCLUI/null)", () => {
  for (const fx of DF.razaoOcupacao) {
    assert.equal(P.razaoOcupacao(fx.a), fx.out, `razaoOcupacao(${JSON.stringify(fx.a)}) deveria ser ${fx.out}`);
  }
  // Pitfall 1 espelhado explicitamente: mesma areaterr, resultado OPOSTO conforme 0 vs null.
  const comZero = P.razaoOcupacao({ areaedif: 0, areaterr: 500 });
  const comNull = P.razaoOcupacao({ areaedif: null, areaterr: 500 });
  assert.notEqual(comZero, comNull, "areaedif=0 (vago real) e areaedif=null (incompleto) NUNCA podem dar o mesmo resultado");
  assert.equal(comZero, 0);
  assert.equal(comNull, null);
});

test("detectarSubutilizados: filtra quadra valorizada + razao baixa, guarda de qualidade nunca inclui registro incompleto, ordena razao crescente", () => {
  const { lotes, expectLimiar, expectOrdemCi } = DF.detectarSubutilizados;
  assert.equal(P.limiarQuadraValorizada(P.medianasPorQuadra(lotes)), expectLimiar);
  const candidatos = P.detectarSubutilizados(lotes);
  assert.deepEqual(
    candidatos.map((c) => c.ci),
    expectOrdemCi,
    "ordem esperada: mais subutilizado (razao menor) primeiro; nenhum registro incompleto/quadra de baixo valor incluido"
  );
  // guarda de qualidade: nenhum candidato tem areaedif null/undefined (registro incompleto)
  for (const c of candidatos) {
    assert.ok(c.areaedif != null, "detectarSubutilizados NUNCA inclui lote com areaedif ausente/null");
  }
});

test("detectarSubutilizados: opts.limite trunca a lista (mais subutilizado primeiro)", () => {
  const { lotes } = DF.detectarSubutilizados;
  const truncado = P.detectarSubutilizados(lotes, { limite: 1 });
  assert.equal(truncado.length, 1);
  assert.equal(truncado[0].ci, "v1-vago");
});

test("detectarSubutilizados: <4 quadras distintas -> limiar null -> retorna [] (honestidade de amostra, nunca inventa oportunidade)", () => {
  const { lotes } = DF.detectarSubutilizadosAmostraInsuficiente;
  assert.deepEqual(P.detectarSubutilizados(lotes), []);
});

test("leituraDetector: 'Terreno vago...' quando areaedif===0, senao 'Baixo aproveitamento...'", () => {
  for (const fx of DF.leituraDetector) {
    assert.equal(P.leituraDetector(fx.item), fx.out);
  }
});

// --- Caderno / Farming (TERR-05) -----------------------------------------------------------

test("sanitizeCaderno: allowlist POSITIVA — dtnascimen/cpf/nmproprie/campo-desconhecido NUNCA sobrevivem; ci/cdbairro sobrevivem", () => {
  const out = P.sanitizeCaderno(CF.itemComPII);
  assert.ok(!("dtnascimen" in out), "dtnascimen nunca deveria sobreviver a sanitizeCaderno");
  assert.ok(!("cpf" in out), "cpf nunca deveria sobreviver a sanitizeCaderno");
  assert.ok(!("nmproprie" in out), "nmproprie nunca deveria sobreviver a sanitizeCaderno");
  assert.ok(!("campoInventado" in out), "campo fora da allowlist (mesmo inventado/futuro) nunca deveria sobreviver — allowlist, nao blocklist");
  assert.equal(out.ci, CF.itemComPII.ci);
  assert.equal(out.cdbairro, CF.itemComPII.cdbairro);
  assert.equal(out.nrquadra, CF.itemComPII.nrquadra);
  assert.equal(out.vlvenal, CF.itemComPII.vlvenal);
  assert.equal(out.endereco, CF.itemComPII.endereco);
});

test("sanitizeCaderno: item ja valido (sem PII) passa integralmente pelos campos da allowlist", () => {
  const out = P.sanitizeCaderno(CF.itemValido);
  assert.equal(out.ci, CF.itemValido.ci);
  assert.equal(out.areaedif, CF.itemValido.areaedif);
  assert.equal(out.areaterr, CF.itemValido.areaterr);
  assert.equal(out.uso, CF.itemValido.uso);
});

test("statusValido: aceita os 5 valores do enum CADERNO_STATUS, rejeita qualquer valor fora dele", () => {
  assert.equal(P.CADERNO_STATUS.length, 5);
  for (const s of P.CADERNO_STATUS) {
    assert.equal(P.statusValido(s), true, `${s} deveria ser um status valido`);
  }
  assert.equal(P.statusValido("inventado"), false);
  assert.equal(P.statusValido(""), false);
  assert.equal(P.statusValido(null), false);
  assert.equal(P.statusValido(undefined), false);
});

test("validarImportCaderno: JSON malformado retorna {ok:false}, nunca lanca excecao", () => {
  const r = P.validarImportCaderno(CF.importMalformado);
  assert.equal(r.ok, false);
});

test("validarImportCaderno: import valido retorna itens sanitizados com ok:true", () => {
  const r = P.validarImportCaderno(CF.importValido);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, CF.importValido.length);
  for (const item of r.itens) {
    assert.ok(!("dtnascimen" in item));
  }
});

test("validarImportCaderno: aceita tambem string JSON (nao apenas array ja parseado)", () => {
  const r = P.validarImportCaderno(JSON.stringify(CF.importValido));
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, CF.importValido.length);
});

test("validarImportCaderno: item sem `ci` e descartado (nunca aceito sem chave)", () => {
  const r = P.validarImportCaderno(CF.importItemSemCi);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, 0, "item sem ci deveria ser descartado, nao aceito");
});

test("validarImportCaderno: item com PII (dtnascimen/cpf) e sanitizado antes de aceitar — nunca reintroduz PII via backup", () => {
  const r = P.validarImportCaderno(CF.importItemComPII);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, 1);
  assert.ok(!("dtnascimen" in r.itens[0]));
  assert.ok(!("cpf" in r.itens[0]));
  assert.equal(r.itens[0].ci, "333");
});
