import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const inlineScripts = (arquivo) => {
  let html = readFileSync(new URL(arquivo, import.meta.url), "utf-8");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
};

test("todos os scripts inline do app compilam", () => {
  const scripts = inlineScripts("../radar-goiania.html");
  assert.ok(scripts.length >= 2, "scripts inline principais não encontrados");
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `radar-inline-${index + 1}.js` }));
  });
});

test("os-app.js e o JS inline do painel admin compilam (não são só strings nos testes)", () => {
  /* pente-fino 19/07: os-app.js é browser-JS fora do node --test por import — sem isto,
     um erro de sintaxe só apareceria com o corretor na tela */
  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.doesNotThrow(() => new vm.Script(app, { filename: "os-app.js" }));
  const scripts = inlineScripts("../motor/painel.html");
  assert.ok(scripts.length >= 1, "script inline do painel não encontrado");
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `painel-inline-${index + 1}.js` }));
  });
});
