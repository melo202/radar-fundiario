// P1.4 (20/08/2026): tríade visível no Resumo + calculadora "Quanto sobra?" transparente.
// Funções puras (linhaUrbTriade, quantoSobra) vivem no bloco RADAR_PURE de radar-goiania.html
// e são carregadas aqui via node:vm — MESMO padrão de loader de tests/templates.test.mjs.
// O contrato: (1) REGRA DE OURO do CA (nunca dígito quando conferido!==true), (2) quantoSobra
// nunca inventa número (entrada inválida -> null), (3) a conta é completa e determinística.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function loadPure() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  for (const fn of ["function linhaUrbTriade", "function quantoSobra"]) {
    assert.ok(src.includes(fn), `${fn} ausente do bloco RADAR_PURE`);
  }
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {linhaUrbTriade,quantoSobra,pdRegrasDaZona};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPure();

// --- Estrutura: tríade no Resumo, calculadora no card de mercado -------------------------

test("P1.4: tríade Diligência·Avaliação·Mercado existe na aba Resumo, antes das ações", () => {
  const iResumo = html.indexOf('id="dViewResumo"');
  const iTriade = html.indexOf('id="dTriade"');
  const iActs = html.indexOf('id="dActsPrim"');
  const iTerritorio = html.indexOf('id="dViewTerritorio"');
  assert.ok(iResumo > -1 && iTriade > iResumo && iTriade < iActs && iActs < iTerritorio,
    "tríade deve viver na aba Resumo, entre a leitura e as ações primárias");
  assert.ok(html.includes("function atualizarTriade()"), "atualizarTriade ausente");
  assert.ok(html.includes("function triadeIr(qual)"), "triadeIr ausente");
  /* os 3 cards com destinos estáticos — nunca dado de servidor interpolado em handler */
  for (const q of ["triadeIr('diligencia')", "triadeIr('avaliacao')", "triadeIr('mercado')"]) {
    assert.ok(html.includes(q), `card ${q} ausente na tríade`);
  }
});

test("P1.4: calculadora 'Quanto sobra?' vive no card de mercado e é alimentada pelas 2 estimativas", () => {
  assert.ok(html.includes('class="dsobra" id="dSobra"'), "container #dSobra ausente do card dMercado");
  assert.ok(html.includes("function renderSobra()"), "renderSobra ausente");
  assert.ok(html.includes("function sobraAtualizarRes()"), "sobraAtualizarRes ausente");
  /* wiring: estimativa imediata E avaliação completa alimentam VALOR_EST; reset por imóvel */
  assert.ok(html.includes('VALOR_EST={valor:d.valorEstimado,fonte:"bairro"'), "estimativa imediata não alimenta VALOR_EST");
  assert.ok(html.includes('VALOR_EST={valor:r.estimatedValue,fonte:"avaliacao"'), "avaliação completa não alimenta VALOR_EST");
  assert.ok(html.includes("VALOR_EST=null;SOBRA_PEDIDO=null;SOBRA_DEBITOS=null;renderSobra();"),
    "mercadoReset deve zerar a conta — nunca herda a do imóvel anterior");
  /* atualizarTriade chamada nos 4 pontos assíncronos + abertura da ficha */
  assert.ok((html.match(/atualizarTriade\(\)/g) || []).length >= 6,
    "atualizarTriade precisa ser chamada em showDetail, estimativa, renderMercado, renderLocal e renderUrbanisticoUI (then/catch)");
});

// --- linhaUrbTriade: tradução honesta do Plano Diretor -----------------------------------

test("linhaUrbTriade: zona AA conferida traz CA, teto e potencial do terreno", () => {
  const regra = P.pdRegrasDaZona("AA");
  assert.ok(regra && regra.conferido === true, "fixture: AA precisa estar conferida na tabela");
  const s = P.linhaUrbTriade({ estado: "resolvido", unidade: { sigla: "AA", nome: regra.nome }, regra }, 300);
  assert.ok(s.includes("Zona AA"), s);
  assert.ok(s.includes("CA básico"), s);
  assert.ok(s.includes("potencial de ~"), s);
  assert.ok(s.endsWith("."), s);
});

test("linhaUrbTriade: REGRA DE OURO — zona sem regra conferida NUNCA emite dígito de CA", () => {
  const s = P.linhaUrbTriade({ estado: "resolvido", unidade: { sigla: "ZZ" }, regra: null }, 300);
  assert.ok(s === null || !/\d/.test(s.replace(/ZZ/, "")), `vazou número sem conferência: ${s}`);
  const s2 = P.linhaUrbTriade({ estado: "resolvido", unidade: { sigla: "AOS" }, regra: { conferido: false, ca_basico: 9.9 } }, 300);
  assert.ok(s2 === null || !s2.includes("9,9"), `vazou CA não conferido: ${s2}`);
});

test("linhaUrbTriade: rural afirma, erro/parcial/ausente omitem (sem inventar)", () => {
  assert.equal(P.linhaUrbTriade({ estado: "rural", macrozona: "Macrozona Rural" }, 300),
    "Zona rural — os índices urbanos (CA) não se aplicam aqui.");
  assert.equal(P.linhaUrbTriade({ estado: "erro" }, 300), null);
  assert.equal(P.linhaUrbTriade({ estado: "parcial" }, 300), null);
  assert.equal(P.linhaUrbTriade(null, 300), null);
  assert.equal(P.linhaUrbTriade(undefined, undefined), null);
});

test("linhaUrbTriade: Macrozona Construída sem unidade usa o CA básico universal (1,0x conferido)", () => {
  const s = P.linhaUrbTriade({ estado: "resolvido_sem_unidade", regra: PD_MZC_BASICO_REF() }, 450);
  assert.ok(s && s.includes("Macrozona Construída") && s.includes("1,0x"), s);
  assert.ok(s.includes("450"), s); /* potencial = 450 × 1,0 */
});

// PD_MZC_BASICO é const do bloco — recupero via linhaUrbTriade? Não: monto o shape equivalente
// conferido (o app garante regra=PD_MZC_BASICO nesse estado; aqui basta o contrato conferido:true).
function PD_MZC_BASICO_REF() {
  return { nome: "Macrozona Construída", ca_basico: 1.0, ca_maximo: null, altura_max: null, conferido: true };
}

// --- quantoSobra: a conta da revenda, completa e sem invenção -----------------------------

test("quantoSobra: conta-chefe bate centavo a centavo", () => {
  const r = P.quantoSobra({ valorEstimado: 1000000, precoPedido: 850000, comissaoPct: 6, debitos: 12000 });
  assert.equal(r.itbi, 17000);          /* 2% de 850.000 */
  assert.equal(r.comissao, 51000);      /* 6% de 850.000 */
  assert.equal(r.margem, 150000);       /* 1.000.000 − 850.000 */
  assert.equal(r.sobra, 70000);         /* 150.000 − 17.000 − 51.000 − 12.000 */
  assert.ok(Math.abs(r.margemPct - 0.15) < 1e-9);
});

test("quantoSobra: sem estimado ou sem pedido -> null (nunca inventa)", () => {
  assert.equal(P.quantoSobra({ valorEstimado: null, precoPedido: 850000 }), null);
  assert.equal(P.quantoSobra({ valorEstimado: 1000000, precoPedido: null }), null);
  assert.equal(P.quantoSobra({ valorEstimado: 0, precoPedido: 850000 }), null);
  assert.equal(P.quantoSobra({}), null);
  assert.equal(P.quantoSobra(null), null);
});

test("quantoSobra: comissão default 6%, fora de faixa -> null, débitos negativos viram 0", () => {
  const r = P.quantoSobra({ valorEstimado: 500000, precoPedido: 400000 });
  assert.equal(r.comissaoPct, 6);
  assert.equal(P.quantoSobra({ valorEstimado: 500000, precoPedido: 400000, comissaoPct: 101 }), null);
  assert.equal(P.quantoSobra({ valorEstimado: 500000, precoPedido: 400000, comissaoPct: -1 }), null);
  const r2 = P.quantoSobra({ valorEstimado: 500000, precoPedido: 400000, debitos: -5000 });
  assert.equal(r2.debitos, 0);
});

test("quantoSobra: sobra negativa é exposta com sinal (negócio sem margem não é maquiado)", () => {
  const r = P.quantoSobra({ valorEstimado: 400000, precoPedido: 450000, comissaoPct: 6, debitos: 0 });
  assert.ok(r.margem < 0 && r.sobra < 0, "pedido acima do estimado tem margem/sobra negativas");
});
