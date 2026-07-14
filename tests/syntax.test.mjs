import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

test("todos os scripts inline do app compilam", () => {
  let html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  assert.ok(scripts.length >= 2, "scripts inline principais não encontrados");
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `radar-inline-${index + 1}.js` }));
  });
});
