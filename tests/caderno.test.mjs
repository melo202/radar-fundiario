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
  assert.ok(src.includes("function mergeCadernoImport"), "mergeCadernoImport ausente do bloco RADAR_PURE (A-09)");
  assert.ok(src.includes("function construirCdbairroParaNome"), "construirCdbairroParaNome ausente do bloco RADAR_PURE (B-10)");
  // Fase 17 (17-01, Task 3): allowlist recursiva do snapshot — ausente em RED, presente apos GREEN.
  assert.ok(src.includes('"snapshot"'), "CADERNO_ALLOW ainda nao inclui \"snapshot\" (17-01 Task 3 nao cumprida)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {medianasPorQuadra,limiarQuadraValorizada,razaoOcupacao,detectarSubutilizados,leituraDetector,DETECTOR_RATIO_MAX,sanitizeCaderno,CADERNO_STATUS,statusValido,validarImportCaderno,mergeCadernoImport,tsCaderno,construirCdbairroParaNome};",
    { filename: "radar-pure-caderno.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// --- Detector de Lote Subutilizado (TERR-04) ----------------------------------------------

test("medianasPorQuadra: agrupa por nrquadra, ignora nrquadra null e pm2 invalido; quadra sem pm2 valido nao aparece", () => {
  // Round-trip via JSON (mesmo motivo de mixUso em territorio.test.mjs): o objeto devolvido roda
  // no realm do vm sandbox — nao e reference-equal ao Object.prototype deste realm mesmo com
  // conteudo identico (assert.deepEqual cross-realm). Normaliza antes do assert.
  const out = JSON.parse(JSON.stringify(P.medianasPorQuadra(DF.medianasPorQuadra.lotes)));
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
  assert.equal(P.detectarSubutilizados(lotes).length, 0);
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

// CR-01 (16-REVIEW.md): esc(it.ci) interpolado dentro de string JS de onclick/onblur inline em
// renderCadernoBlock() reabria o JS-string-breakout de 08-REVIEW.md CR-01 caso um `ci` malicioso
// chegasse via import. O fix real vive no render/handlers (leem data-ci via .closest(), nao mais
// recebem `ci` por parametro interpolado) — aqui cobrimos a DEFESA EM PROFUNDIDADE: nenhum `ci`
// fora do formato cadastral (CADERNO_CI_RE) pode sobreviver a validarImportCaderno/sanitizeCaderno.
test("validarImportCaderno/sanitizeCaderno: ci com aspas/<script> (JS-string-breakout) e REJEITADO — item inteiro descartado, nunca 'limpo'", () => {
  const r = P.validarImportCaderno(CF.importItemCiMalicioso);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, 1, "os 2 itens com ci malicioso devem ser descartados; so o ci valido sobrevive");
  assert.equal(r.itens[0].ci, "3020150346");
  for (const item of r.itens) {
    assert.ok(!/['"<>]/.test(String(item.ci)), "nenhum ci sobrevivente pode conter aspas ou < >");
  }
});

test("sanitizeCaderno: ci fora do formato cadastral (aspas/script) faz o campo `ci` desaparecer do objeto sanitizado", () => {
  const out = P.sanitizeCaderno({ ci: "x');alert(1);('", cdbairro: 16 });
  assert.ok(!("ci" in out) || out.ci == null, "ci malicioso nunca deveria sobreviver, mesmo fora do fluxo de import");
});

// WR-03 (16-REVIEW.md): maxlength="40"/"500" do <input>/<textarea> so protege durante digitacao
// real no navegador — nunca contra import/atribuicao programatica. sanitizeCaderno precisa impor o
// mesmo limite no VALOR, nao so filtrar por CHAVE (allowlist).
test("sanitizeCaderno: tag/nota gigantes (import ou atribuicao programatica) sao truncados para 40/500 chars", () => {
  const out = P.sanitizeCaderno(CF.itemTagNotaGigante);
  assert.equal(out.tag.length, 40, "tag deveria ser truncada para 40 chars, mesmo limite do maxlength do HTML");
  assert.equal(out.nota.length, 500, "nota deveria ser truncada para 500 chars, mesmo limite do maxlength do HTML");
});

test("sanitizeCaderno: status fora do enum fixo CADERNO_STATUS nunca sobrevive como esta — normalizado para 'nao_visitado'", () => {
  const out = P.sanitizeCaderno(CF.itemStatusInvalido);
  assert.equal(out.status, "nao_visitado");
});

test("validarImportCaderno: item importado com tag/nota gigantes chega truncado (defesa em profundidade cobre o caminho de import)", () => {
  const r = P.validarImportCaderno([CF.itemTagNotaGigante]);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].tag.length, 40);
  assert.equal(r.itens[0].nota.length, 500);
});

// Fase 17 (17-01, TERR-06, T-17-01/Pitfall 5): sanitizeCaderno reconstroi out.snapshot
// RECURSIVAMENTE por DIFF_ALLOW — CADERNO_ALLOW so filtra a CHAVE de topo ("snapshot" sobrevive
// inteiro se nao houver esse passo extra), nunca o CONTEUDO aninhado. dtnascimen/cpf dentro do
// snapshot NUNCA sobrevivem, mesmo que o item de topo continue valido.

test("sanitizeCaderno: snapshot valido (5 campos DIFF_ALLOW) sobrevive integralmente", () => {
  const out = P.sanitizeCaderno(CF.itemComSnapshot);
  assert.ok(out.snapshot, "snapshot deveria sobreviver");
  assert.equal(out.snapshot.vlvenal, 200000);
  assert.equal(out.snapshot.areaedif, 100);
  assert.equal(out.snapshot.vlimp98, 1000);
  assert.equal(out.snapshot.uso, 1);
  assert.equal(out.snapshot.dtinclusao, "20100101");
  assert.equal(out.snapshotAt, "2026-07-09T12:00:00.000Z");
});

test("sanitizeCaderno: snapshot.dtnascimen/cpf NUNCA sobrevivem (PII dentro do sub-objeto)", () => {
  const out = P.sanitizeCaderno(CF.itemSnapshotComPII);
  assert.ok(out.snapshot, "snapshot deveria sobreviver (tem vlvenal, campo permitido)");
  assert.ok(!("dtnascimen" in out.snapshot), "snapshot.dtnascimen nunca deveria sobreviver a sanitizeCaderno");
  assert.ok(!("cpf" in out.snapshot), "snapshot.cpf nunca deveria sobreviver a sanitizeCaderno");
  assert.equal(out.snapshot.vlvenal, 1);
});

test("sanitizeCaderno: snapshot como string (malformado) -> out.snapshot ausente, item de topo continua valido", () => {
  const out = P.sanitizeCaderno(CF.itemSnapshotMalformado);
  assert.ok(!("snapshot" in out) || out.snapshot == null, "snapshot malformado (string) nunca deveria sobreviver como esta");
  assert.equal(out.ci, "888");
  assert.equal(out.cdbairro, 16);
});

test("sanitizeCaderno: snapshot como array (malformado) -> out.snapshot ausente, item de topo continua valido", () => {
  const out = P.sanitizeCaderno(CF.itemSnapshotArray);
  assert.ok(!("snapshot" in out) || out.snapshot == null, "snapshot malformado (array) nunca deveria sobreviver como esta");
  assert.equal(out.ci, "889");
});

test("sanitizeCaderno: snapshotAt nao-string e descartado; snapshot em si sobrevive", () => {
  const out = P.sanitizeCaderno(CF.itemSnapshotAtInvalido);
  assert.ok(!("snapshotAt" in out) || out.snapshotAt == null, "snapshotAt nao-string nunca deveria sobreviver");
  assert.ok(out.snapshot, "snapshot em si (independente de snapshotAt) deveria sobreviver");
  assert.equal(out.snapshot.vlvenal, 1);
});

test("sanitizeCaderno: item SEM snapshot (formato antigo, pre-Fase 17) continua valido — retrocompatibilidade", () => {
  const out = P.sanitizeCaderno(CF.itemSemSnapshot);
  assert.equal(out.ci, "891");
  assert.equal(out.vlvenal, 100000);
  assert.ok(!("snapshot" in out));
});

test("validarImportCaderno: import de item com snapshot valido -> aceito com snapshot limpo", () => {
  const r = P.validarImportCaderno([CF.itemComSnapshot]);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].snapshot.vlvenal, 200000);
});

test("validarImportCaderno: import de item com snapshot.dtnascimen -> aceito SEM o campo PII, nunca quebra o import inteiro", () => {
  const r = P.validarImportCaderno(CF.importComSnapshotPII);
  assert.equal(r.ok, true);
  assert.equal(r.itens.length, 1);
  assert.ok(!("dtnascimen" in r.itens[0].snapshot), "snapshot.dtnascimen nunca deveria sobreviver ao import");
  assert.equal(r.itens[0].snapshot.vlvenal, 300000);
  assert.equal(r.itens[0].ci, "999");
});

// --- A-09: sanitizeCaderno trunca endereco + mergeCadernoImport preserva o mais novo -----------

test("sanitizeCaderno trunca endereco em 120 chars (A-09)", () => {
  const longo = "R".repeat(300);
  const out = P.sanitizeCaderno({ ci: "1", endereco: longo });
  assert.equal(out.endereco.length, 120, "endereco deveria ser truncado a 120 chars");
});

test("mergeCadernoImport: importado MAIS NOVO sobrescreve; local mais novo/empate é preservado (A-09)", () => {
  const locais = [
    { ci: "A", nota: "local A", updatedAt: "2026-05-01T00:00:00.000Z" }, // local mais VELHO
    { ci: "B", nota: "local B", updatedAt: "2026-07-01T00:00:00.000Z" }, // local mais NOVO
    { ci: "C", nota: "local C", savedAt: "2026-06-01T00:00:00.000Z" },   // empate exato
  ];
  const entrantes = [
    { ci: "A", nota: "import A", updatedAt: "2026-06-01T00:00:00.000Z" }, // mais novo -> vence
    { ci: "B", nota: "import B", updatedAt: "2026-05-01T00:00:00.000Z" }, // mais velho -> perde
    { ci: "C", nota: "import C", savedAt: "2026-06-01T00:00:00.000Z" },   // empate -> mantém local (perde)
    { ci: "D", nota: "import D", updatedAt: "2026-01-01T00:00:00.000Z" }, // ci inédito -> entra
  ];
  const persistir = P.mergeCadernoImport(locais, entrantes);
  const cis = JSON.parse(JSON.stringify(persistir.map((it) => it.ci))).sort(); // normaliza cross-realm
  assert.deepEqual(cis, ["A", "D"], "só o importado mais novo (A) e o ci inédito (D) devem ser persistidos");
  const a = persistir.find((it) => it.ci === "A");
  assert.equal(a.nota, "import A", "o importado mais novo deveria trazer sua própria nota");
});

test("mergeCadernoImport: sem locais -> todos os importados entram; entrantes vazio -> []", () => {
  const entrantes = [{ ci: "X", savedAt: "2026-01-01T00:00:00.000Z" }, { ci: "Y" }];
  assert.equal(P.mergeCadernoImport([], entrantes).length, 2, "sem local, todo importado com ci entra");
  assert.equal(P.mergeCadernoImport(null, null).length, 0, "entrantes ausente -> [] (nunca lança)");
});

// --- B-10: construirCdbairroParaNome (cd -> nm_disp) -------------------------------------------

test("construirCdbairroParaNome: mapeia cdbairro -> nm_disp (com acento/prefixo), primeira ocorrência vence (B-10)", () => {
  const features = [
    { properties: { id: "p1", nm_disp: "Setor Bueno", nm_bai: "BUENO" } },
    { properties: { id: "p2", nm_disp: "Jardim América", nm_bai: "AMERICA" } },
    { properties: { id: "p3" } }, // sem cd resolvido -> ignorado
  ];
  const idParaCd = new Map([["p1", 16], ["p2", 42]]);
  const map = P.construirCdbairroParaNome(features, idParaCd);
  assert.equal(map.get(16), "Setor Bueno");
  assert.equal(map.get(42), "Jardim América");
  assert.equal(map.size, 2, "feature sem cd resolvido nunca entra");
});
