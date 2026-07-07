// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — mesma tecnica de busca.test.mjs
// (NAO duplica a implementacao aqui; testa exatamente as mesmas funcoes usadas em runtime pelo app).
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // Mesma tecnica de fatiamento por LINHA documentada em busca.test.mjs (indexOf cru quebra por
  // fatiar no meio da linha do marcador, que vive dentro de um comentario).
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {clean,norm,ruaCore,TIPOVIA,TIPOVIA_DETECT,extractSetor,getLastBairroCode,detectMode};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// COMBO sintetico de fixture (5-8 setores reais de Goiania), incluindo:
// - "Jardim Goias" (nome composto de 2 palavras)
// - "Marista" (setor real usado no caso obrigatorio "marista quadra 128 lote 5")
// - "Setor Sul"/"Setor Sudoeste" (prefixo comum "Setor" que testa o caso de risco documentado:
//   prefixo textual de uma palavra so nao deve "vencer" sem checar candidatos mais especificos)
const COMBO_FIXTURE = [
  { code: "101", raw: "MARISTA", disp: "Marista", search: "MARISTA" },
  { code: "102", raw: "JARDIM GOIAS", disp: "Jardim Goiás", search: "JARDIM GOIAS" },
  { code: "103", raw: "SETOR SUL", disp: "Setor Sul", search: "SETOR SUL" },
  { code: "104", raw: "SETOR SUDOESTE", disp: "Setor Sudoeste", search: "SETOR SUDOESTE" },
  { code: "105", raw: "CAMPINAS", disp: "Campinas", search: "CAMPINAS" },
  { code: "106", raw: "BUENO", disp: "Bueno", search: "BUENO" },
  { code: "107", raw: "PARQUE AMAZONIA", disp: "Parque Amazônia", search: "PARQUE AMAZONIA" },
];

test("TIPOVIA_DETECT — casa tipo de via em qualquer posicao (nao ancorado)", () => {
  assert.ok(P.TIPOVIA_DETECT.test("quadra 128 rua portugal"), "deveria casar 'rua' no meio da frase");
  assert.ok(P.TIPOVIA_DETECT.test("Rua Portugal 582"), "deveria casar 'Rua' no inicio tambem");
  assert.ok(P.TIPOVIA_DETECT.test("avenida t-4"), "deveria casar 'avenida'");
  assert.equal(P.TIPOVIA_DETECT.test("sumer park"), false, "sem tipo de via nao deveria casar");
});

test("TIPOVIA (ancorada) — regressao zero pos-refatoracao (08-01/08-02)", () => {
  assert.equal(P.ruaCore("Rua 135"), "135"); // caso obrigatorio do roadmap
  assert.equal(P.ruaCore("R  MARAJO"), "MARAJO");
  assert.equal(P.ruaCore("Avenida T-4"), "T-4");
  // ancorada NAO deveria casar tipo de via fora do inicio
  assert.ok(!P.TIPOVIA.test("quadra 128 rua portugal"), "TIPOVIA ancorada nao deveria casar no meio da frase");
});

test("extractSetor — remove setor do inicio da frase (nome de 1 palavra)", () => {
  const r = P.extractSetor("marista quadra 128 lote 5", COMBO_FIXTURE);
  assert.equal(r.code, "101");
  assert.equal(r.rest, "quadra 128 lote 5");
});

test("extractSetor — nome composto de 2 palavras ('jardim goias')", () => {
  const r = P.extractSetor("jardim goias quadra 10 lote 2", COMBO_FIXTURE);
  assert.equal(r.code, "102");
  assert.equal(r.rest, "quadra 10 lote 2");
});

test("extractSetor — sem setor no inicio da frase retorna code:null e rest intacto", () => {
  const r = P.extractSetor("quadra 128 lote 5", COMBO_FIXTURE);
  assert.equal(r.code, null);
  assert.equal(r.disp, null);
  assert.equal(r.rest, "quadra 128 lote 5");
});

test("extractSetor — caso de risco: prefixo comum ('setor') prefere o candidato mais especifico", () => {
  // "setor sul quadra 10" comeca com "setor sul" (2 palavras) que bate SETOR SUL diretamente;
  // testa que o algoritmo nao para na 1a palavra ("setor" sozinho nao esta na fixture) e acha o
  // nome composto correto avaliando prefixos decrescentes de 4->1 palavras.
  const r = P.extractSetor("setor sul quadra 10", COMBO_FIXTURE);
  assert.equal(r.code, "103");
  assert.equal(r.rest, "quadra 10");
});

test("extractSetor — nao acha setor quando a frase e so texto de predio", () => {
  const r = P.extractSetor("sumer park", COMBO_FIXTURE);
  assert.equal(r.code, null);
  assert.equal(r.rest, "sumer park");
});

test("getLastBairroCode — nunca lanca excecao (localStorage indisponivel no sandbox vm)", () => {
  assert.doesNotThrow(() => P.getLastBairroCode());
  assert.equal(P.getLastBairroCode(), null);
});

// detectMode — os 9 casos de <behavior> da Task 2 (7 obrigatorios do roadmap + 2 adicionais de
// regressao da propria heuristica). Todos rodam com COMBO_FIXTURE injetado como parametro —
// detectMode nunca le uma global implicita, e testavel isolada do boot do app.

test("detectMode — inscricao 14 digitos -> nrinscr, confianca alta", () => {
  const r = P.detectMode("30201503461234", COMBO_FIXTURE);
  assert.equal(r.mode, "insc");
  assert.equal(r.field, "nrinscr");
  assert.equal(r.confidence, "alta");
});

test("detectMode — inscricao 10 digitos -> ci, confianca alta", () => {
  const r = P.detectMode("3020150346", COMBO_FIXTURE);
  assert.equal(r.mode, "insc");
  assert.equal(r.field, "ci");
  assert.equal(r.confidence, "alta");
});

test("detectMode — '135' isolado e AMBIGUO, nao decide modo (confianca baixa)", () => {
  const r = P.detectMode("135", COMBO_FIXTURE);
  assert.equal(r.mode, null);
  assert.equal(r.confidence, "baixa");
});

test("detectMode — 'Rua 135' decide addr com confianca alta (tipo de via presente)", () => {
  const r = P.detectMode("Rua 135", COMBO_FIXTURE);
  assert.equal(r.mode, "addr");
  assert.equal(r.confidence, "alta");
});

test("detectMode — 'Q135' decide ql com confianca alta (token de quadra)", () => {
  const r = P.detectMode("Q135", COMBO_FIXTURE);
  assert.equal(r.mode, "ql");
  assert.equal(r.quadra, "135");
  assert.equal(r.confidence, "alta");
});

test("detectMode — 'quadra 128 lote 5' decide ql com quadra e lote", () => {
  const r = P.detectMode("quadra 128 lote 5", COMBO_FIXTURE);
  assert.equal(r.mode, "ql");
  assert.equal(r.quadra, "128");
  assert.equal(r.lote, "5");
  assert.equal(r.confidence, "alta");
});

test("detectMode — setor-na-frase: 'marista quadra 128 lote 5' extrai o setor ANTES das regras de modo", () => {
  const r = P.detectMode("marista quadra 128 lote 5", COMBO_FIXTURE);
  assert.equal(r.bairroCode, "101"); // code do Marista na fixture
  assert.equal(r.bairroDisp, "Marista");
  assert.equal(r.mode, "ql");
  assert.equal(r.quadra, "128");
  assert.equal(r.lote, "5");
  assert.equal(r.confidence, "alta");
});

test("detectMode — 'sumer park' sem tipo de via nem setor -> predio, confianca media", () => {
  const r = P.detectMode("sumer park", COMBO_FIXTURE);
  assert.equal(r.mode, "bd");
  assert.equal(r.confidence, "media");
});

test("detectMode — 'ed. central park' prefixo textual de predio -> confianca alta", () => {
  const r = P.detectMode("ed. central park", COMBO_FIXTURE);
  assert.equal(r.mode, "bd");
  assert.equal(r.confidence, "alta");
});

export { loadPureBlock, COMBO_FIXTURE };
