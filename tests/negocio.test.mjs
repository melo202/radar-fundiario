// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — MESMO padrao de loader de
// tests/doc.test.mjs/tests/templates.test.mjs (nao duplica a implementacao aqui; testa
// exatamente as mesmas funcoes usadas em runtime pelo app). Fase 11.1 (11.1-01): propostaTexto/
// termoExclusividadeTexto/contratoTexto (NEG-01/02/03) + parseMatricula + numeroPorExtenso —
// puro, sem IA, nunca inventa campo ausente (CAMPO_VAZIO = "________").
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
    "function propostaTexto",
    "function termoExclusividadeTexto",
    "function contratoTexto",
    "function parseMatricula",
    "function numeroPorExtenso",
  ]) {
    assert.ok(src.includes(fn), `${fn} ausente do bloco RADAR_PURE (dependencia da Task 2 nao cumprida)`);
  }
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {propostaTexto,termoExclusividadeTexto,contratoTexto,parseMatricula,numeroPorExtenso};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

const DISCLAIMER =
  "Minuta para conferência das partes — recomenda-se revisão por advogado; a transmissão da propriedade exige escritura pública (quando aplicável) e registro na matrícula do imóvel no cartório de registro de imóveis competente.";

// --- propostaTexto -----------------------------------------------------------------------

test("propostaTexto(data completo): contem clausulas 1a/2a/3a/5a, disclaimer literal e papeis de assinatura", () => {
  const texto = P.propostaTexto(FIXTURES.propostaCasos.completo);
  assert.ok(typeof texto === "string" && texto.length > 0, "propostaTexto deveria retornar string nao-vazia");
  for (const clausula of ["Cláusula 1ª", "Cláusula 2ª", "Cláusula 3ª", "Cláusula 5ª"]) {
    assert.ok(texto.includes(clausula), `propostaTexto deveria conter "${clausula}", obteve:\n${texto}`);
  }
  assert.ok(texto.includes(DISCLAIMER), `propostaTexto deveria conter o disclaimer literal EXATO, obteve:\n${texto}`);
  assert.ok(texto.includes("Proponente"), `propostaTexto deveria conter o papel "Proponente"`);
  assert.ok(texto.includes("Vendedor/Proprietário"), `propostaTexto deveria conter o papel "Vendedor/Proprietário"`);
});

test("propostaTexto(data com proponente.nome vazio): usa CAMPO_VAZIO, nunca nome vazio silencioso/undefined", () => {
  const texto = P.propostaTexto(FIXTURES.propostaCasos.proponenteSemNome);
  assert.ok(texto.includes("________"), `propostaTexto com proponente.nome vazio deveria conter "________", obteve:\n${texto}`);
  assert.ok(!/undefined/i.test(texto), `propostaTexto nunca deveria conter "undefined", obteve:\n${texto}`);
});

test('propostaTexto(data com valorOfertado=null): clausula de valor usa CAMPO_VAZIO, nunca "R$ null"/"R$ NaN"/"R$ undefined"', () => {
  const texto = P.propostaTexto(FIXTURES.propostaCasos.semValor);
  assert.ok(texto.includes("________"), `propostaTexto com valorOfertado=null deveria conter "________", obteve:\n${texto}`);
  assert.ok(!/R\$\s*null/i.test(texto), `propostaTexto nunca deveria conter "R$ null", obteve:\n${texto}`);
  assert.ok(!/R\$\s*NaN/i.test(texto), `propostaTexto nunca deveria conter "R$ NaN", obteve:\n${texto}`);
  assert.ok(!/R\$\s*undefined/i.test(texto), `propostaTexto nunca deveria conter "R$ undefined", obteve:\n${texto}`);
});

// --- termoExclusividadeTexto --------------------------------------------------------------

test('termoExclusividadeTexto(exclusiva:true) contem "EXCLUSIVO"; (exclusiva:false) contem "NAO EXCLUSIVO"/"aberta"; ambos contem clausula 4a (comissao) e disclaimer', () => {
  const textoExclusiva = P.termoExclusividadeTexto(FIXTURES.termoCasos.exclusivaSimComAnuncio);
  assert.ok(textoExclusiva.includes("EXCLUSIVO"), `termoExclusividadeTexto(exclusiva:true) deveria conter "EXCLUSIVO", obteve:\n${textoExclusiva}`);
  assert.ok(textoExclusiva.includes("Cláusula 4ª"), `termoExclusividadeTexto deveria conter "Cláusula 4ª", obteve:\n${textoExclusiva}`);
  assert.ok(textoExclusiva.includes(DISCLAIMER), `termoExclusividadeTexto deveria conter o disclaimer literal EXATO`);

  const textoAberta = P.termoExclusividadeTexto(FIXTURES.termoCasos.abertaSemAnuncio);
  const contemNaoExclusivoOuAberta = /NÃO EXCLUSIVO/.test(textoAberta) || /aberta/i.test(textoAberta);
  assert.ok(contemNaoExclusivoOuAberta, `termoExclusividadeTexto(exclusiva:false) deveria conter "NÃO EXCLUSIVO" ou "aberta", obteve:\n${textoAberta}`);
  assert.ok(textoAberta.includes("Cláusula 4ª"), `termoExclusividadeTexto deveria conter "Cláusula 4ª", obteve:\n${textoAberta}`);
  assert.ok(textoAberta.includes(DISCLAIMER), `termoExclusividadeTexto deveria conter o disclaimer literal EXATO`);
});

test("termoExclusividadeTexto(autorizaAnuncio:null) OMITE a clausula de Autorizacao de Divulgacao/Anuncio; (autorizaAnuncio:true) INCLUI", () => {
  const textoNull = P.termoExclusividadeTexto(FIXTURES.termoCasos.abertaSemAnuncio);
  assert.ok(!/Autorização de Divulgação/i.test(textoNull), `termoExclusividadeTexto(autorizaAnuncio:null) NAO deveria conter clausula de Autorizacao de Divulgacao/Anuncio, obteve:\n${textoNull}`);

  const textoTrue = P.termoExclusividadeTexto(FIXTURES.termoCasos.exclusivaSimComAnuncio);
  assert.ok(/Autorização de Divulgação/i.test(textoTrue), `termoExclusividadeTexto(autorizaAnuncio:true) deveria conter clausula de Autorizacao de Divulgacao/Anuncio, obteve:\n${textoTrue}`);
});

test("termoExclusividadeTexto(autorizaAnuncio:false) tambem INCLUI a clausula (false eh resposta explicita, distinta de null=nao respondido)", () => {
  const texto = P.termoExclusividadeTexto(FIXTURES.termoCasos.autorizaAnuncioFalse);
  assert.ok(/Autorização de Divulgação/i.test(texto), `termoExclusividadeTexto(autorizaAnuncio:false) deveria conter clausula de Autorizacao de Divulgacao/Anuncio (resposta explicita "Nao"), obteve:\n${texto}`);
});

// --- contratoTexto -------------------------------------------------------------------------

test("contratoTexto(data completo): contem clausulas 1a-7a, matricula/cartorio interpolados, disclaimer e papeis Vendedor/Comprador", () => {
  const texto = P.contratoTexto(FIXTURES.contratoCasos.completo);
  for (let n = 1; n <= 7; n++) {
    const ordinal = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª"][n - 1];
    assert.ok(texto.includes(`Cláusula ${ordinal}`), `contratoTexto deveria conter "Cláusula ${ordinal}", obteve:\n${texto}`);
  }
  assert.ok(texto.includes(FIXTURES.contratoCasos.completo.matricula), `contratoTexto deveria conter o numero da matricula, obteve:\n${texto}`);
  assert.ok(texto.includes(FIXTURES.contratoCasos.completo.cartorio), `contratoTexto deveria conter o nome do cartorio, obteve:\n${texto}`);
  assert.ok(texto.includes(DISCLAIMER), `contratoTexto deveria conter o disclaimer literal EXATO`);
  assert.ok(texto.includes("Vendedor"), `contratoTexto deveria conter o papel "Vendedor"`);
  assert.ok(texto.includes("Comprador"), `contratoTexto deveria conter o papel "Comprador"`);
});

test('contratoTexto(data com matricula=null, cartorio=null): clausula "Do Objeto" usa CAMPO_VAZIO, nunca "null"/"undefined"', () => {
  const texto = P.contratoTexto(FIXTURES.contratoCasos.semMatriculaCartorio);
  assert.ok(texto.includes("________"), `contratoTexto com matricula/cartorio ausentes deveria conter "________", obteve:\n${texto}`);
  assert.ok(!/\bnull\b/i.test(texto), `contratoTexto nunca deveria conter "null" literal, obteve:\n${texto}`);
  assert.ok(!/undefined/i.test(texto), `contratoTexto nunca deveria conter "undefined", obteve:\n${texto}`);
});

// --- C-06: 2 testemunhas no Contrato e no Termo (CPC 784, III); Proposta NÃO tem testemunhas -----

test("contratoTexto e termoExclusividadeTexto contêm Testemunha 1 e Testemunha 2 (C-06)", () => {
  for (const gerar of [
    () => P.contratoTexto(FIXTURES.contratoCasos.completo),
    () => P.termoExclusividadeTexto(FIXTURES.termoCasos.exclusivaSimComAnuncio),
  ]) {
    const texto = gerar();
    assert.ok(texto.includes("Testemunha 1"), `deveria conter "Testemunha 1", obteve:\n${texto}`);
    assert.ok(texto.includes("Testemunha 2"), `deveria conter "Testemunha 2", obteve:\n${texto}`);
  }
});

test("propostaTexto NÃO contém testemunhas (não é título executivo — C-06)", () => {
  const texto = P.propostaTexto(FIXTURES.propostaCasos.completo);
  assert.ok(!/Testemunha/i.test(texto), `propostaTexto NÃO deveria conter testemunhas, obteve:\n${texto}`);
});

// --- assert negativo global: as 3 funcoes de minuta NUNCA retornam "undefined"/"NaN" -------

test('as 3 funcoes de minuta, para qualquer data de fixture, NUNCA retornam "undefined" ou "NaN"', () => {
  const casos = [
    () => P.propostaTexto(FIXTURES.propostaCasos.completo),
    () => P.propostaTexto(FIXTURES.propostaCasos.proponenteSemNome),
    () => P.propostaTexto(FIXTURES.propostaCasos.semValor),
    () => P.propostaTexto({}),
    () => P.propostaTexto(null),
    () => P.termoExclusividadeTexto(FIXTURES.termoCasos.exclusivaSimComAnuncio),
    () => P.termoExclusividadeTexto(FIXTURES.termoCasos.abertaSemAnuncio),
    () => P.termoExclusividadeTexto(FIXTURES.termoCasos.autorizaAnuncioFalse),
    () => P.termoExclusividadeTexto({}),
    () => P.termoExclusividadeTexto(null),
    () => P.contratoTexto(FIXTURES.contratoCasos.completo),
    () => P.contratoTexto(FIXTURES.contratoCasos.semMatriculaCartorio),
    () => P.contratoTexto({}),
    () => P.contratoTexto(null),
  ];
  for (const gerar of casos) {
    const texto = gerar();
    assert.ok(!/undefined/i.test(texto), `minuta nunca deveria conter "undefined", obteve:\n${texto}`);
    assert.ok(!/NaN/.test(texto), `minuta nunca deveria conter "NaN", obteve:\n${texto}`);
  }
});

// --- parseMatricula -------------------------------------------------------------------------

test("parseMatricula(texto canonico) extrai matricula e cartorio (ordem 'situado no Nº Ofício de Registro de Imóveis')", () => {
  const caso = FIXTURES.parseMatriculaCasos.canonico;
  const result = P.parseMatricula(caso.texto);
  assert.ok(result !== null, `parseMatricula deveria retornar objeto nao-null, obteve: ${JSON.stringify(result)}`);
  assert.ok(result.matricula && result.matricula.includes(caso.expectMatriculaContains), `matricula deveria conter "${caso.expectMatriculaContains}", obteve: ${JSON.stringify(result)}`);
  assert.ok(result.cartorio && result.cartorio.includes(caso.expectCartorioContains), `cartorio deveria conter "${caso.expectCartorioContains}", obteve: ${JSON.stringify(result)}`);
});

test("parseMatricula(texto 'Cartório do 2° Ofício' — fix plan-check) extrai matricula E cartorio (ordem numero-DEPOIS-da-palavra-chave, sem 'registro de imoveis' no fim)", () => {
  const caso = FIXTURES.parseMatriculaCasos.ordemCartorioOficio;
  const result = P.parseMatricula(caso.texto);
  assert.ok(result !== null, `parseMatricula deveria retornar objeto nao-null para "${caso.texto}", obteve: ${JSON.stringify(result)}`);
  assert.ok(result.matricula && result.matricula.includes(caso.expectMatriculaContains), `matricula deveria conter "${caso.expectMatriculaContains}", obteve: ${JSON.stringify(result)}`);
  assert.ok(result.cartorio && result.cartorio.includes(caso.expectCartorioContains), `cartorio deveria conter "${caso.expectCartorioContains}", obteve: ${JSON.stringify(result)}`);
});

test("parseMatricula não captura o ponto final de frase na matrícula (C-02: '45.678.' -> '45.678')", () => {
  const caso = FIXTURES.parseMatriculaCasos.pontoFinal;
  const result = P.parseMatricula(caso.texto);
  assert.ok(result !== null, `parseMatricula deveria retornar objeto nao-null, obteve: ${JSON.stringify(result)}`);
  assert.equal(result.matricula, caso.expectMatriculaExact, `matricula deveria ser exatamente "${caso.expectMatriculaExact}" (sem ponto final), obteve: ${JSON.stringify(result.matricula)}`);
});

test("parseMatricula(texto sem nenhum padrao reconhecivel) retorna null (distincao de match-parcial)", () => {
  const result = P.parseMatricula(FIXTURES.parseMatriculaCasos.semMatch.texto);
  assert.equal(result, null, `parseMatricula sem match deveria retornar null, obteve: ${JSON.stringify(result)}`);
});

test("parseMatricula('') nunca lanca excecao, retorna null", () => {
  assert.doesNotThrow(() => P.parseMatricula(FIXTURES.parseMatriculaCasos.vazio.texto));
  const result = P.parseMatricula(FIXTURES.parseMatriculaCasos.vazio.texto);
  assert.equal(result, null, `parseMatricula("") deveria retornar null, obteve: ${JSON.stringify(result)}`);
});

test("parseMatricula(undefined/null) nunca lanca excecao", () => {
  assert.doesNotThrow(() => P.parseMatricula(undefined));
  assert.doesNotThrow(() => P.parseMatricula(null));
});

// --- numeroPorExtenso ------------------------------------------------------------------------

test("numeroPorExtenso: casos basicos (500000/90/1234567.89) + fronteiras pt-BR (1000000/2000000/100/150/1000) + null", () => {
  for (const [nome, caso] of Object.entries(FIXTURES.extensoCasos)) {
    if (caso.expectEmpty) {
      const result = P.numeroPorExtenso(caso.valor);
      assert.equal(result, "", `numeroPorExtenso(${JSON.stringify(caso.valor)}) [${nome}] deveria retornar string vazia, obteve: ${JSON.stringify(result)}`);
      continue;
    }
    let result;
    assert.doesNotThrow(() => { result = P.numeroPorExtenso(caso.valor); }, `numeroPorExtenso(${caso.valor}) [${nome}] nao deveria lancar excecao`);
    for (const contains of caso.expectContains || []) {
      assert.ok(result.includes(contains), `numeroPorExtenso(${caso.valor}) [${nome}] deveria conter "${contains}", obteve: ${JSON.stringify(result)}`);
    }
    for (const notContains of caso.expectNotContains || []) {
      assert.ok(!result.includes(notContains), `numeroPorExtenso(${caso.valor}) [${nome}] NAO deveria conter "${notContains}", obteve: ${JSON.stringify(result)}`);
    }
  }
});
