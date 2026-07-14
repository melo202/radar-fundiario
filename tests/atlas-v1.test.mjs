import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf8");

test("V1 leva os tokens Atlas Cívico para o app real", () => {
  for (const token of ["--canvas:#f4f6f3", "--surface:#fff", "--brand:#18513e", "--brass:#95743b", "--atlas-inspector:480px"]) {
    assert.ok(html.includes(token), `token ausente: ${token}`);
  }
  assert.match(html, /<meta name="theme-color" content="#f4f6f3">/);
});

test("cabeçalho Atlas reutiliza a busca existente em vez de duplicar o motor", () => {
  assert.match(html, /class="atlas-topbar"/);
  assert.match(html, /id="atlasSearchTrigger"[^>]+aria-controls="caixaInput"/);
  assert.equal((html.match(/id="caixaInput"/g) || []).length, 1, "a caixa de busca deve continuar única");
  assert.match(html, /function atlasOpenSearch\(\)[\s\S]*setView\("busca"\)[\s\S]*getElementById\("caixaInput"\)/);
});

test("desktop reserva 480 px para o inspetor e redimensiona o mapa", () => {
  assert.match(html, /grid-template-columns:minmax\(0,1fr\) var\(--atlas-inspector\)/);
  assert.match(html, /body\[data-view="busca"\] \.mapwrap,body:has\(\.mapwrap>\.detail\.show\) \.mapwrap\{grid-column:1\/2\}/);
  assert.match(html, /\.panel\{position:relative;top:auto;left:auto;grid-column:2;grid-row:2/);
  assert.match(html, /function atlasInvalidateMap\(\)[\s\S]*map\.invalidateSize\(\)/);
});

test("mobile expõe as três alturas do dossiê com controle acessível", () => {
  assert.match(html, /id="detail"[^>]+data-sheet="full"/);
  assert.match(html, /<button type="button" class="grab" id="grab"[^>]+aria-controls="detail"/);
  for (const state of ["peek", "mid", "full"]) {
    assert.ok(html.includes(`#detail[data-sheet="${state}"]`), `altura ausente: ${state}`);
  }
  assert.match(html, /const DETAIL_SHEET_ORDER=\["peek","mid","full"\]/);
  assert.match(html, /function lowerDetailSheet\(\)[\s\S]*closeDetail\(\)/);
});

test("atalho de busca não captura digitação em campos editáveis", () => {
  assert.match(html, /e\.key!=="\/"/);
  assert.match(html, /target\.matches\("input,textarea,select"\)\|\|target\.isContentEditable/);
});

test("resultado assume o inspetor e mantém a omnibox para refino", () => {
  assert.match(html, /\.panel:has\(#results \.card\)>\.brand\{display:none\}/);
  assert.match(html, /\.panel:has\(#results \.card\)>\.search>\.go,[\s\S]*\.search>\.caixabtn\{display:none!important\}/);
  assert.doesNotMatch(html, /\.panel:has\(#results \.card\)>\.search>\.caixa-box/);
  assert.match(html, /\.panel:has\(#results \.card\)>\.results\{padding-top:4px\}/);
});

test("controles centrais abandonam emojis por uma linguagem visual estável", () => {
  assert.match(html, /id="caixaVoz"[\s\S]*?<svg viewBox="0 0 24 24"/);
  assert.match(html, /id="btnSat"[\s\S]*?>SAT<\/button>/);
  assert.doesNotMatch(html, /class="bldg-head"[\s\S]{0,180}🏢/);
  assert.doesNotMatch(html, /class="bldg-ord-toggle"[^>]*>🔍/);
  assert.doesNotMatch(html, /class="bldg-zap"[^>]*>💬/);
});

test("sumário do prédio permanece legível na superfície clara do Atlas", () => {
  assert.match(html, /\.bm b\{color:var\(--ink\)\}/);
  assert.match(html, /\.bm span\{color:var\(--muted\)\}/);
  assert.match(html, /\.bldg-ord-toggle,\.bldg-zap\{[^}]*background:var\(--surface\)/);
});
