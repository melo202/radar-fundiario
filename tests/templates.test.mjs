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
      "captAbordagem,captScript,captChecklist,captFollowup,oportunidadeItem,histAdd,scoreConfianca};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

// F5 ZAP-01/02: os data de teste usam a SAÍDA REAL de scoreConfianca (fixture guarda só os
// inputs) — o `porque` fabricado à mão nunca reproduzia o formato real pontuado
// ("área de referência não informada; 6 referências cadastrais semelhantes.") e escondia o bug de interpolação.
const zapComData = { ...FIXTURES["zapComData"], scoreConf: null };
zapComData.scoreConf = P.scoreConfianca(FIXTURES["zapComData"].scoreConfInputs);
const zapSemPerfil = { ...FIXTURES["zapSemPerfil"], scoreConf: null };
zapSemPerfil.scoreConf = P.scoreConfianca(FIXTURES["zapSemPerfil"].scoreConfInputs);

const ZAP_FNS = {
  zapResumo: P.zapResumo,
  zapProprietario: P.zapProprietario,
  zapComprador: P.zapComprador,
  zapArgumento: P.zapArgumento,
};

// --- Assinatura condicional (nunca placeholder) ---------------------------------------------

test("zap* com perfil.nome termina com assinatura exata", () => {
  for (const [name, fn] of Object.entries(ZAP_FNS)) {
    const result = fn(zapComData);
    assert.ok(
      result.endsWith("— Ana Souza, CRECI 12345"),
      `${name}(zapComData) deveria terminar com "— Ana Souza, CRECI 12345", obteve: ${JSON.stringify(result)}`
    );
  }
  const riscos = P.zapRiscos(zapComData);
  assert.ok(riscos.endsWith("— Ana Souza, CRECI 12345"), `zapRiscos deveria terminar com assinatura, obteve: ${JSON.stringify(riscos)}`);
});

test("zap* sem perfil NAO contem placeholder de assinatura", () => {
  const placeholderRe = /\[\s*seu\s+nome\s*\]/i;
  for (const [name, fn] of Object.entries(ZAP_FNS)) {
    const result = fn(zapSemPerfil);
    assert.ok(!placeholderRe.test(result), `${name}(zapSemPerfil) NAO deveria conter placeholder "[seu nome]", obteve: ${JSON.stringify(result)}`);
    assert.ok(!result.includes("— Ana Souza"), `${name}(zapSemPerfil) NAO deveria conter assinatura de outro fixture`);
  }
  const riscos = P.zapRiscos(zapSemPerfil);
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

// --- localTxt: concordancia de genero no fallback sem bairro (WR-01 do review da Fase 14) ------

test("zap*/capt* sem bairro usam 'na região' — nunca 'no região'", () => {
  const semBairro = { ...zapComData, bairro: "" };
  const fns = { ...ZAP_FNS, captAbordagem: P.captAbordagem, captScript: P.captScript };
  for (const [name, fn] of Object.entries(fns)) {
    const result = fn(semBairro);
    assert.ok(!result.includes("no região"), `${name}(semBairro) NAO deveria conter "no região" (concordância), obteve: ${JSON.stringify(result)}`);
  }
  // pelo menos as aberturas que citam localizacao devem usar o feminino correto
  assert.ok(P.zapResumo(semBairro).includes("na região"), `zapResumo(semBairro) deveria conter "na região", obteve: ${JSON.stringify(P.zapResumo(semBairro))}`);
});

// --- zapRiscos: honestidade sempre, nunca afirmacao absoluta -----------------------------------

test("zapRiscos contem termo de honestidade e nunca afirmacao absoluta", () => {
  const honestidadeTermos = ["recomendo confirmar", "referência indicativa", "não é uma avaliação oficial"];
  for (const data of [zapComData, FIXTURES.zapSemFaixa]) {
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

// --- zapArgumento: contexto cadastral nunca vira recomendacao comercial -------------------------

test("zapArgumento com score baixo (acima da mediana) NAO afirma 'reforça o valor pedido'", () => {
  const caro = {
    ...zapComData,
    scoreOp: { score: 18, rotulo: "Preço alto", porque: ["Está 22% acima da mediana da vizinhança — entre os mais caros da região."] },
  };
  const result = P.zapArgumento(caro);
  assert.ok(!result.includes("reforça o valor pedido"), `imóvel caro NAO deveria conter "reforça o valor pedido", obteve: ${JSON.stringify(result)}`);
  assert.ok(result.includes("não determina preço de mercado nem liquidez"), `deveria explicitar o limite cadastral, obteve: ${JSON.stringify(result)}`);
});

test("zapArgumento com score alto (abaixo da mediana) também não recomenda preço", () => {
  const result = P.zapArgumento(zapComData); // score 78, "8% abaixo"
  assert.ok(!result.includes("reforça o valor pedido"), `amostra fiscal não deveria reforçar preço, obteve: ${JSON.stringify(result)}`);
  assert.ok(!result.includes("negociar o valor"), `amostra fiscal não deveria recomendar negociação, obteve: ${JSON.stringify(result)}`);
  assert.ok(result.includes("não determina preço de mercado nem liquidez"), `deveria explicitar o limite cadastral, obteve: ${JSON.stringify(result)}`);
});

// --- Captacao: 4 funcoes ------------------------------------------------------------------------

test("captAbordagem/captScript/captChecklist/captFollowup retornam string nao vazia", () => {
  for (const fn of [P.captAbordagem, P.captScript, P.captChecklist, P.captFollowup]) {
    const result = fn(zapComData);
    assert.ok(typeof result === "string" && result.length > 0, `captacao fn deveria retornar string nao vazia, obteve: ${JSON.stringify(result)}`);
  }
});

test("captScript contem os 4 passos numerados", () => {
  const result = P.captScript(zapComData);
  for (const step of ["1.", "2.", "3.", "4."]) {
    assert.ok(result.includes(step), `captScript deveria conter o passo "${step}", obteve: ${JSON.stringify(result)}`);
  }
});

test("captChecklist contem os 5 itens documentais com bullet", () => {
  const result = P.captChecklist(zapComData);
  const itens = ["matrícula", "iptu", "certidões pessoais", "condomínio", "identidade"];
  const lower = result.toLowerCase();
  for (const item of itens) {
    assert.ok(lower.includes(item), `captChecklist deveria conter o item "${item}", obteve: ${JSON.stringify(result)}`);
  }
  const bulletCount = (result.match(/•/g) || []).length;
  assert.ok(bulletCount >= 5, `captChecklist deveria ter ao menos 5 bullets "•", obteve ${bulletCount}`);
});

test("captFollowup contem o endereco interpolado de data.endereco", () => {
  const result = P.captFollowup(zapComData);
  assert.ok(result.includes(zapComData.endereco), `captFollowup deveria conter "${zapComData.endereco}", obteve: ${JSON.stringify(result)}`);
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

// --- F5 ZAP-01/02: pendencias derivadas da SAIDA REAL de scoreConfianca -------------------------
// A frase-diagnostico `porque` (ja pontuada, feita para o painel) nunca pode ser interpolada crua
// como "itens a confirmar" — gerava ". ." no meio da mensagem e listava "dados completos" como
// pendencia. Os casos abaixo alimentam os templates com scoreConfianca() real, nunca fabricado.

test("zapProprietario/zapRiscos: caminho comum (3-7 comparaveis, dados completos) sai gramatical", () => {
  // nivel "media" so pela nota informativa de contagem — NENHUMA pendencia real
  const conf = P.scoreConfianca({ areaOk: true, nComps: 6, atipico: false, venalOk: true });
  assert.equal(conf.nivel, "media", "premissa do caso: 6 comparaveis com dados completos => media");
  const data = { ...zapComData, scoreConf: conf };
  for (const [name, fn] of [["zapProprietario", P.zapProprietario], ["zapRiscos", P.zapRiscos]]) {
    const result = fn(data);
    assert.ok(!/\.\s*\./.test(result), `${name} NAO deveria conter ponto duplicado/ponto no meio da frase, obteve: ${JSON.stringify(result)}`);
    assert.ok(!/\.,/.test(result), `${name} NAO deveria conter ".,", obteve: ${JSON.stringify(result)}`);
    assert.ok(!/confirmar \d+ compar/i.test(result), `${name} NAO deveria pedir para "confirmar N comparáveis" (nota informativa nao e pendencia), obteve: ${JSON.stringify(result)}`);
  }
});

test("zapRiscos: confianca ALTA nunca lista 'dados completos' como pendencia", () => {
  const conf = P.scoreConfianca({ areaOk: true, nComps: 10, atipico: false, venalOk: true });
  assert.equal(conf.nivel, "alta", "premissa do caso: 10 comparaveis com dados completos => alta");
  const result = P.zapRiscos({ ...zapComData, scoreConf: conf });
  assert.ok(!result.includes("dados completos"), `zapRiscos NAO deveria listar o diagnostico positivo "dados completos" como pendencia, obteve: ${JSON.stringify(result)}`);
  assert.ok(!/\.\s*\./.test(result), `zapRiscos NAO deveria conter ponto duplicado, obteve: ${JSON.stringify(result)}`);
  // sem pendencia real, cai na lista generica default (sempre sensata antes de decidir)
  assert.ok(result.includes("área privativa"), `zapRiscos sem pendencia real deveria usar a lista generica, obteve: ${JSON.stringify(result)}`);
});

test("zapProprietario: pendencia real (area) vira substantivo em frase gramatical, nunca o diagnostico cru", () => {
  const conf = P.scoreConfianca({ areaOk: false, nComps: 6, atipico: false, venalOk: true });
  const result = P.zapProprietario({ ...zapComData, scoreConf: conf });
  assert.ok(
    result.includes("Recomendo confirmar a área do imóvel em uma análise complementar."),
    `zapProprietario deveria citar a pendencia como substantivo, obteve: ${JSON.stringify(result)}`
  );
  assert.ok(!result.includes("faltou"), `zapProprietario NAO deveria interpolar a frase-diagnostico crua ("faltou..."), obteve: ${JSON.stringify(result)}`);
  assert.ok(!/\.\s*\./.test(result), `zapProprietario NAO deveria conter ponto duplicado, obteve: ${JSON.stringify(result)}`);
});

test("zapRiscos: 2 pendencias reais viram lista com virgula + 'e' final, sem pontuacao interna", () => {
  const conf = P.scoreConfianca({ areaOk: false, nComps: 2, atipico: false, venalOk: true }); // baixa: area + poucos comparaveis
  const result = P.zapRiscos({ ...zapComData, scoreConf: conf });
  assert.ok(
    result.includes("a área do imóvel e o valor com uma amostra cadastral maior."),
    `zapRiscos deveria listar as 2 pendencias com "e" final e um unico ponto, obteve: ${JSON.stringify(result)}`
  );
  assert.ok(!result.includes(";"), `zapRiscos NAO deveria conter o "; " de diagnostico do painel, obteve: ${JSON.stringify(result)}`);
  assert.ok(!/\.\s*\./.test(result), `zapRiscos NAO deveria conter ponto duplicado, obteve: ${JSON.stringify(result)}`);
});

// --- F5 ZAP-03: captAbordagem nunca envia placeholder "Q —"/"L —" ao proprietario -------------

test("captAbordagem: so os campos presentes no bloco (Q, L) — nunca o placeholder '—'", () => {
  const soQuadra = P.captAbordagem({ ...zapComData, quadra: "9", lote: null });
  assert.ok(soQuadra.includes("(Q 9)"), `so quadra deveria sair "(Q 9)", obteve: ${JSON.stringify(soQuadra)}`);
  assert.ok(!soQuadra.includes("L —") && !soQuadra.includes("Q —"), `so quadra NAO deveria conter placeholder, obteve: ${JSON.stringify(soQuadra)}`);
  const soLote = P.captAbordagem({ ...zapComData, quadra: null, lote: "12" });
  assert.ok(soLote.includes("(L 12)"), `so lote deveria sair "(L 12)", obteve: ${JSON.stringify(soLote)}`);
  assert.ok(!soLote.includes("Q —") && !soLote.includes("L —"), `so lote NAO deveria conter placeholder, obteve: ${JSON.stringify(soLote)}`);
  const ambos = P.captAbordagem(zapComData); // quadra 45, lote 12
  assert.ok(ambos.includes("(Q 45, L 12)"), `ambos deveriam sair "(Q 45, L 12)", obteve: ${JSON.stringify(ambos)}`);
  const nenhum = P.captAbordagem({ ...zapComData, quadra: null, lote: null });
  assert.ok(!nenhum.includes("(Q") && !nenhum.includes("(L"), `sem quadra/lote NAO deveria haver bloco (Q/L), obteve: ${JSON.stringify(nenhum)}`);
});

test("zap*/capt*: nenhuma mensagem contem ponto duplicado ou '.,' com scoreConf real (todas as confiancas)", () => {
  const confs = [
    P.scoreConfianca({ areaOk: true, nComps: 9, atipico: false, venalOk: true }),   // alta
    P.scoreConfianca({ areaOk: true, nComps: 6, atipico: false, venalOk: true }),   // media (nota)
    P.scoreConfianca({ areaOk: false, nComps: 6, atipico: false, venalOk: true }),  // media (pendencia)
    P.scoreConfianca({ areaOk: false, nComps: 2, atipico: true, venalOk: false }),  // baixa (4 pendencias)
    null,
  ];
  const fns = { zapResumo: P.zapResumo, zapProprietario: P.zapProprietario, zapComprador: P.zapComprador,
    zapArgumento: P.zapArgumento, zapRiscos: P.zapRiscos, captAbordagem: P.captAbordagem, captFollowup: P.captFollowup };
  for (const conf of confs) for (const [name, fn] of Object.entries(fns)) {
    const result = fn({ ...zapComData, scoreConf: conf });
    assert.ok(!/\.\s*\./.test(result), `${name} (conf=${conf ? conf.nivel : "null"}) NAO deveria conter ponto duplicado, obteve: ${JSON.stringify(result)}`);
    assert.ok(!/\.,/.test(result), `${name} (conf=${conf ? conf.nivel : "null"}) NAO deveria conter ".,", obteve: ${JSON.stringify(result)}`);
  }
});
