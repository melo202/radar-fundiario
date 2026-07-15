// G1–G4 (15/07/2026): o mapa é SÓ de Goiânia — confinamento, contorno e máscara do limite
// municipal (IBGE 5208707 via gerar-limite.py). Asserções de string sobre html/sw/workflow,
// no padrão do repo. As invariantes do dataset em si vivem em datasets.test.mjs.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf-8");
const pages = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf-8");

test("G3: mapa confinado a Goiânia — maxBounds, viscosity e minZoom no L.map", () => {
  assert.match(html, /const GYN_MAXBOUNDS=\[\[-16\.90,-49\.52\],\[-16\.39,-49\.01\]\]/);
  assert.match(html, /L\.map\("map",\{zoomControl:true,minZoom:11,maxBounds:GYN_MAXBOUNDS,maxBoundsViscosity:1\.0\}\)/);
});

test("G2: contorno + máscara do limite num pane abaixo de bairros, sem roubar clique", () => {
  assert.match(html, /map\.createPane\("limite"\)\.style\.zIndex=365/);
  assert.ok(html.includes("fetch('limite-goiania.json')"));
  assert.match(html, /fillRule:"evenodd"/, "máscara precisa do furo (evenodd)");
  /* as DUAS camadas do limite são inertes ao mouse */
  const bloco = html.slice(html.indexOf("async function loadLimite"), html.indexOf("async function loadLimite") + 2200);
  assert.equal((bloco.match(/interactive:false/g) || []).length, 2, "máscara e contorno devem ser interactive:false");
  assert.ok(bloco.includes("console.warn"), "falha de fetch degrada em silêncio, nunca quebra o boot");
  assert.ok(html.includes("loadBairroPolys();loadLimite();"), "loadLimite entra no boot");
});

test("G2: máscara e contorno seguem o modo satélite", () => {
  assert.match(html, /if\(limiteMask\)limiteMask\.setStyle\(on\?\{fillColor:MAP_INK/);
  assert.match(html, /if\(limiteLine\)limiteLine\.setStyle\(\{color:on\?"#f4f6f3":MAP_BRAND_STRONG\}\)/);
});

test("G4: limite publicado no PWA e no deploy curado", () => {
  assert.ok(sw.includes('"./limite-goiania.json"'), "limite no OPTIONAL do service worker");
  assert.match(sw, /const CACHE = "radar-v12"/, "cache bump para invalidar a cópia antiga");
  assert.ok(pages.includes("limite-goiania.json"), "workflow de deploy copia o dataset");
});
