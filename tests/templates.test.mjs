// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — MESMO padrao de loader de
// tests/scores.test.mjs (nao duplica a implementacao aqui; testa exatamente as mesmas funcoes
// usadas em runtime pelo app). Fase 10 (10-01): templates de WhatsApp (ZAP-01) + Captacao
// (CAPT-01) + helpers de persistencia pura (SALV-01: oportunidadeItem/histAdd).
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
    "function zapResumo",
    "function zapProprietario",
    "function zapComprador",
    "function zapArgumento",
    "function zapRiscos",
    "function captAbordagem",
    "function captScript",
    "function captChecklist",
    "function captFollowup",
    "function oportunidadeItem",
    "function histAdd",
  ]) {
    assert.ok(src.includes(fn), `${fn} ausente do bloco RADAR_PURE (dependencia da Task 2 nao cumprida)`);
  }
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {zapResumo,zapProprietario,zapComprador,zapArgumento,zapRiscos," +
      "captAbordagem,captScript,captChecklist,captFollowup,oportunidadeItem,histAdd};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

const ZAP_FNS = {
  zapResumo: P.zapResumo,
  zapProprietario: P.zapProprietario,
  zapComprador: P.zapComprador,
  zapArgumento: P.zapArgumento,
};

// --- Assinatura condicional (nunca placeholder) ---------------------------------------------

test("zap* com perfil.nome termina com assinatura exata", () => {
  for (const [name, fn] of Object.entries(ZAP_FNS)) {
    const result = fn(FIXTURES.zapComData);
    assert.ok(
      result.endsWith("— Ana Souza, CRECI 12345"),
      `${name}(zapComData) deveria terminar com "— Ana Souza, CRECI 12345", obteve: ${JSON.stringify(result)}`
    );
  }
  const riscos = P.zapRiscos(FIXTURES.zapComData);
  assert.ok(riscos.endsWith("— Ana Souza, CRECI 12345"), `zapRiscos deveria terminar com assinatura, obteve: ${JSON.stringify(riscos)}`);
});

test("zap* sem perfil NAO contem placeholder de assinatura", () => {
  const placeholderRe = /\[\s*seu\s+nome\s*\]/i;
  for (const [name, fn] of Object.entries(ZAP_FNS)) {
    const result = fn(FIXTURES.zapSemPerfil);
    assert.ok(!placeholderRe.test(result), `${name}(zapSemPerfil) NAO deveria conter placeholder "[seu nome]", obteve: ${JSON.stringify(result)}`);
    assert.ok(!result.includes("— Ana Souza"), `${name}(zapSemPerfil) NAO deveria conter assinatura de outro fixture`);
  }
  const riscos = P.zapRiscos(FIXTURES.zapSemPerfil);
  assert.ok(!placeholderRe.test(riscos), `zapRiscos(zapSemPerfil) NAO deveria conter placeholder`);
});

// --- Honestidade: faixa=null nunca inventa valor ----------------------------------------------

test("zapResumo/zapProprietario/zapComprador/zapArgumento com faixa null nao inventam valor", () => {
  for (const [name, fn] of Object.entries(ZAP_FNS)) {
    const result = fn(FIXTURES.zapSemFaixa);
    assert.ok(result && result.length > 0, `${name}(zapSemFaixa) deveria retornar string nao vazia`);
    assert.ok(!/undefined|NaN/.test(result), `${name}(zapSemFaixa) NAO deveria conter "undefined"/"NaN", obteve: ${JSON.stringify(result)}`);
    // sem faixa, nao pode citar os valores lo/hi do fixture COM faixa (690000/780000 formatados)
    assert.ok(!result.includes("690"), `${name}(zapSemFaixa) NAO deveria inventar valor de faixa (690mil), obteve: ${JSON.stringify(result)}`);
    assert.ok(!result.includes("780"), `${name}(zapSemFaixa) NAO deveria inventar valor de faixa (780mil), obteve: ${JSON.stringify(result)}`);
  }
});

// --- zapRiscos: honestidade sempre, nunca afirmacao absoluta -----------------------------------

test("zapRiscos contem termo de honestidade e nunca afirmacao absoluta", () => {
  const honestidadeTermos = ["recomendo confirmar", "faixa estimada", "não é uma avaliação oficial"];
  for (const data of [FIXTURES.zapComData, FIXTURES.zapSemFaixa]) {
    const result = P.zapRiscos(data);
    const lower = result.toLowerCase();
    assert.ok(
      honestidadeTermos.some((t) => lower.includes(t)),
      `zapRiscos deveria conter ao menos 1 termo de honestidade (${honestidadeTermos.join(" | ")}), obteve: ${JSON.stringify(result)}`
    );
    assert.ok(!lower.includes("garantido"), `zapRiscos NAO deveria conter "garantido", obteve: ${JSON.stringify(result)}`);
    assert.ok(!lower.includes("certeza"), `zapRiscos NAO deveria conter "certeza", obteve: ${JSON.stringify(result)}`);
  }
});

// --- Captacao: 4 funcoes ------------------------------------------------------------------------

test("captAbordagem/captScript/captChecklist/captFollowup retornam string nao vazia", () => {
  for (const fn of [P.captAbordagem, P.captScript, P.captChecklist, P.captFollowup]) {
    const result = fn(FIXTURES.zapComData);
    assert.ok(typeof result === "string" && result.length > 0, `captacao fn deveria retornar string nao vazia, obteve: ${JSON.stringify(result)}`);
  }
});

test("captScript contem os 4 passos numerados", () => {
  const result = P.captScript(FIXTURES.zapComData);
  for (const step of ["1.", "2.", "3.", "4."]) {
    assert.ok(result.includes(step), `captScript deveria conter o passo "${step}", obteve: ${JSON.stringify(result)}`);
  }
});

test("captChecklist contem os 5 itens documentais com bullet", () => {
  const result = P.captChecklist(FIXTURES.zapComData);
  const itens = ["matrícula", "iptu", "certidões pessoais", "condomínio", "identidade"];
  const lower = result.toLowerCase();
  for (const item of itens) {
    assert.ok(lower.includes(item), `captChecklist deveria conter o item "${item}", obteve: ${JSON.stringify(result)}`);
  }
  const bulletCount = (result.match(/•/g) || []).length;
  assert.ok(bulletCount >= 5, `captChecklist deveria ter ao menos 5 bullets "•", obteve ${bulletCount}`);
});

test("captFollowup contem o endereco interpolado de data.endereco", () => {
  const result = P.captFollowup(FIXTURES.zapComData);
  assert.ok(result.includes(FIXTURES.zapComData.endereco), `captFollowup deveria conter "${FIXTURES.zapComData.endereco}", obteve: ${JSON.stringify(result)}`);
});

// --- oportunidadeItem: allowlist positiva + negativa (LGPD) -------------------------------------

test("oportunidadeItem nunca deixa PII de terceiro passar (allowlist negativa)", () => {
  const { a, extras } = FIXTURES.oportunidadeItemInput;
  const result = P.oportunidadeItem(a, extras);
  const json = JSON.stringify(result);
  assert.ok(!json.includes("dtnascimen"), `oportunidadeItem NAO deveria conter "dtnascimen" no JSON, obteve: ${json}`);
  assert.ok(!json.includes(a.dtnascimen), `oportunidadeItem NAO deveria conter o valor de dtnascimen (${a.dtnascimen}), obteve: ${json}`);
  assert.ok(!json.includes(a.nmtitular), `oportunidadeItem NAO deveria conter o nome do titular (${a.nmtitular}), obteve: ${json}`);
  assert.ok(!json.toLowerCase().includes("nmtitular"), `oportunidadeItem NAO deveria conter a chave "nmtitular", obteve: ${json}`);
});

test("oportunidadeItem contem exatamente os campos da allowlist positiva", () => {
  const { a, extras } = FIXTURES.oportunidadeItemInput;
  const result = P.oportunidadeItem(a, extras);
  for (const campo of [
    "insc", "endereco", "bairro", "quadra", "lote",
    "areaTerr", "areaEdif", "vlvenal", "faixaLo", "faixaHi",
    "scoreOportunidade", "scoreConfianca",
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(result, campo), `oportunidadeItem deveria conter o campo "${campo}", obteve: ${JSON.stringify(result)}`);
  }
  assert.equal(result.bairro, "Setor Bueno");
  assert.equal(result.quadra, "45");
  assert.equal(result.lote, "12");
  assert.equal(result.faixaLo, 690000);
  assert.equal(result.faixaHi, 780000);
  assert.equal(result.scoreOportunidade, 78);
  assert.equal(result.scoreConfianca, "media");
});

// --- histAdd: FIFO puro, cap 30, nao muta --------------------------------------------------------

test("histAdd com 29 itens + 1 novo = 30, NENHUMA remocao (29+1=30 nao excede o cap)", () => {
  const { list29, novoItem, cap } = FIXTURES.histAddCases;
  const result = P.histAdd(list29, novoItem, cap);
  assert.equal(result.length, 30, `histAdd(29 itens, novo, 30) deveria ter length 30, obteve ${result.length}`);
  assert.equal(result[result.length - 1], novoItem, "ultimo item deveria ser o novoItem");
  assert.equal(result[0], list29[0], "primeiro item deveria ser o item original de indice 0 (nenhuma remocao com 29+1=30)");
});

test("histAdd com 30 itens + 1 novo = 30 (evicao FIFO real, mais antigo sai)", () => {
  const { list30, novoItem, cap } = FIXTURES.histAddCases;
  const result = P.histAdd(list30, novoItem, cap);
  assert.equal(result.length, 30, `histAdd(30 itens, novo, 30) deveria manter length 30, obteve ${result.length}`);
  assert.equal(result[result.length - 1], novoItem, "ultimo item deveria ser o novoItem");
  assert.ok(!result.includes(list30[0]), "o item mais antigo (indice 0 original) NAO deveria estar mais presente (evicao FIFO real)");
});

test("histAdd nao muta o array original (identidade de referencia preservada)", () => {
  const { list29, novoItem, cap } = FIXTURES.histAddCases;
  const originalLength = list29.length;
  const originalRef = list29;
  const result = P.histAdd(list29, novoItem, cap);
  assert.equal(list29.length, originalLength, "lista original NAO deveria ter seu length alterado");
  assert.equal(list29, originalRef, "referencia da lista original deveria permanecer a mesma");
  assert.notEqual(result, list29, "histAdd deveria retornar um NOVO array, nao o mesmo objeto");
});
