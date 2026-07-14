import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../prototipo-atlas-civico.html", import.meta.url), "utf-8");

test("protótipo Atlas Cívico compila todos os scripts inline", () => {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const scripts = [...clean.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  assert.equal(scripts.length, 1);
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `atlas-civico-${index + 1}.js` }));
  });
});

test("protótipo contém os três estados navegáveis aprovados para o V0", () => {
  for (const state of ["entrada", "resultados", "dossie"]) {
    assert.match(html, new RegExp(`data-screen="${state}"`));
    assert.match(html, new RegExp(`${state}: \\{ center:`));
  }
  assert.match(html, /function setView\(view/);
  assert.match(html, /#\$\{view\}/);
});

test("dossiê reduz a profundidade para Resumo, Território e Diligência", () => {
  for (const tab of ["resumo", "territorio", "diligencia"]) {
    assert.match(html, new RegExp(`data-tab="${tab}"`));
    assert.match(html, new RegExp(`data-panel="${tab}"`));
  }
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tabpanel"/);
  assert.match(html, /aria-selected="true"/);
});

test("protótipo preserva o contrato de confiança do Radar", () => {
  assert.match(html, /dados demonstrativos/i);
  assert.match(html, /Não valida matrícula, titularidade, ônus/i);
  assert.match(html, /O Radar não calcula prazos legais/i);
  assert.match(html, /Matrícula, titularidade e ônus não foram verificados/i);
  assert.doesNotMatch(html, /localStorage|sessionStorage|fetch\(|XMLHttpRequest|portalmapa\.goiania/i);
});

test("sistema visual usa tokens, SVGs e tipografia monoespaçada apenas como apoio técnico", () => {
  for (const token of ["--canvas", "--surface", "--ink", "--brand", "--brass", "--line", "--radius-md", "--motion-base"]) {
    assert.match(html, new RegExp(token));
  }
  assert.match(html, /<symbol id="i-search"/);
  assert.match(html, /<symbol id="i-shield"/);
  assert.match(html, /--font-code/);
  assert.doesNotMatch(html, /[🔍🏢🏦📄📊⭐🗺️]/u);
});

test("mobile demonstra três alturas de painel e mantém alvos acessíveis", () => {
  for (const size of ["peek", "mid", "full"]) {
    assert.match(html, new RegExp(`data-sheet="${size}"|\\[data-sheet="${size}"\\]`));
  }
  assert.match(html, /min-height: 44px/);
  assert.match(html, /font-size: 16px/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /:focus-visible/);
});

test("resultado de prédio evita repetição e permite filtrar unidades", () => {
  assert.match(html, /building-summary/);
  assert.match(html, /184 unidades/);
  assert.match(html, /id="unitFilter"/);
  assert.match(html, /id="unitSort"/);
  assert.match(html, /function openUnit\(button\)/);
});
