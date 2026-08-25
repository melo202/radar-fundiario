// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// P2.1a (25/08): fachada da rua — Street View EMBUTIDO na ficha (iframe oficial do Google,
// sem chave), carregado só no clique. Régua: embed oficial (nunca endpoint de tile);
// iframe lazy (a ficha não chama o Google a cada abertura); sem coordenada -> bloco some.
// ATENÇÃO: arquivo é CRLF — pinar strings de UMA linha (includes), nunca com \n.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function loadStreetViewUrl() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem");
  const src = html.slice(html.indexOf("\n", iStart) + 1, html.lastIndexOf("\n", iEnd));
  assert.ok(src.includes("function streetViewUrl"), "streetViewUrl ausente do bloco RADAR_PURE (P2.1a)");
  const sandbox = { esc: (v) => (v == null ? "" : String(v)) };
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports={streetViewUrl};", { filename: "radar-pure-p21.js" }).runInContext(sandbox);
  return sandbox.__exports.streetViewUrl;
}

test("P2.1a streetViewUrl (pura): embed oficial, coordenada formatada, guard honesto", () => {
  const f = loadStreetViewUrl();
  const u = f(-16.6801234, -49.2534678);
  assert.ok(u.startsWith("https://maps.google.com/maps?"), "embed oficial do Google Maps");
  assert.ok(u.includes("layer=c"), "camada streetview (layer=c)");
  assert.ok(u.includes("cbll=-16.680123,-49.253468"), "coordenada com 6 casas");
  assert.ok(u.includes("cbp=11,0,0,0,0"), "sem cbp o Google ignora o cbll e abre o MAPA-MÚNDI (regressão 25/08)");
  assert.ok(u.includes("output=svembed"), "saída svembed (incorporação pública)");
  assert.equal(f(null, -49.25), null, "lat inválida -> null");
  assert.equal(f(-16.68, "x"), null, "lon inválida -> null");
  assert.equal(f(-91, 0), null, "fora do globo -> null");
  assert.ok(!u.includes("key="), "embed NUNCA leva chave");
});

test("P2.1a CSP: frame-src libera SÓ o Google Maps pro iframe", () => {
  const m = html.match(/Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, "meta CSP ausente");
  assert.ok(m[1].includes("frame-src https://maps.google.com https://www.google.com"), "frame-src sem o Google Maps");
  assert.ok(!m[1].includes("frame-src *"), "frame-src NUNCA pode ser curinga");
});

test("P2.1a ficha: bloco na aba Resumo, render no localReset, iframe SÓ no clique", () => {
  assert.ok(html.includes('id="dFach"'), "bloco #dFach ausente da ficha");
  /* UX 25/08 (achado do Bruno "não achei a fachada"): dFach no TOPO do Resumo, antes do valor —
     ver o imóvel é a primeira coisa da ficha, não um cartão escondido embaixo do kit. */
  assert.ok(html.indexOf('id="dFach"') < html.indexOf('id="dValor"'), "fachada no topo do Resumo, antes do valor");
  assert.ok(html.indexOf('id="dFach"') < html.indexOf('id="dPref"'), "fachada antes do kit Prefeitura");
  assert.ok(html.includes("function renderFachada()"), "renderFachada ausente");
  assert.ok(html.includes("renderFachada(); /* P2.1a"), "localReset não chama renderFachada — herda fachada do imóvel anterior");
  assert.ok(html.includes("function abrirFachada(bt)"), "abrirFachada ausente");
  // O iframe NÃO pode existir no HTML estático nem no card inicial — só no clique (lazy consentido):
  const i = html.indexOf("function renderFachada()");
  const fim = html.indexOf("function abrirFachada", i);
  assert.ok(!html.slice(i, fim).includes("<iframe"), "renderFachada não pode montar iframe — só o clique");
  assert.ok(html.slice(html.indexOf("function abrirFachada")).includes("<iframe"), "abrirFachada monta o iframe");
  /* sem coordenada o card NÃO some em silêncio: aviso honesto (dfach-vazio) — o sumiço foi o que
     fez o Bruno achar que o recurso não existia (25/08). */
  assert.ok(html.includes("dfach-vazio"), "estado honesto sem coordenada ausente");
  assert.ok(html.includes("sem localização no cadastro"), "texto do estado sem coordenada ausente");
});

test("P2.1a UX: o texto avisa que a câmera pode estar ao lado (nunca promete a fachada exata)", () => {
  assert.ok(html.includes("pode estar alguns metros ao lado"), "aviso de honestidade da câmera ausente");
  assert.ok(html.includes("arraste pra mirar a fachada"), "instrução de interação ausente");
});
