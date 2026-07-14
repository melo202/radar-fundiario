import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf-8");

function arrayFromSource(name) {
  const match = sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `${name} deve existir em sw.js`);
  return [...match[1].matchAll(/"(\.\/[^\"]+)"/g)].map(m => m[1]);
}

test("PWA: todo asset local declarado existe no repositório", () => {
  const assets = [...arrayFromSource("CORE"), ...arrayFromSource("OPTIONAL")];
  assert.equal(new Set(assets).size, assets.length, "assets CORE/OPTIONAL não podem estar duplicados");
  for (const asset of assets) {
    if (asset === "./") continue;
    assert.ok(existsSync(new URL(asset.slice(2), root)), `${asset} está no service worker, mas não existe`);
  }
});

test("PWA: datasets opcionais não derrubam a instalação inteira", () => {
  assert.ok(sw.includes("Promise.allSettled"), "assets opcionais devem ser cacheados de forma tolerante a falhas");
  assert.ok(arrayFromSource("OPTIONAL").includes("./bairro-cdbairro.json"));
  assert.ok(!arrayFromSource("CORE").includes("./bairro-cdbairro.json"));
});

test("PWA: versão do cache foi incrementada para alertas e pacote de diligência", () => {
  assert.match(sw, /const CACHE = "radar-v11"/);
});
