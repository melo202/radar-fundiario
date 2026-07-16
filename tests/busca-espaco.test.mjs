// BUSCA-ESPACO — "uptown" tem que achar "UP TOWN" (achado do usuário 16/07):
// o cadastro grafa nome de prédio com espaços imprevisíveis; quando a busca por
// palavras zera, refaz ignorando espaços (LIKE com % entre letras + filtro exato
// no cliente). Contratos por asserção de string, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("BUSCA-ESPACO: fallback sem-espaços existe e só roda quando a busca por palavras zera", () => {
  assert.ok(html.includes('sq.split("").join("%")'), "LIKE com % entre cada letra (REPLACE o ArcGIS recusa)");
  assert.match(html, /if\(!items\.length\)\{\s*const sq=toks\.join\(""\)/, "fallback condicionado a zero resultados");
  assert.ok(html.includes("sq.length>=4"), "mínimo 4 letras — o padrão espalhado não vira arrastão");
});

test("BUSCA-ESPACO: confirmação exata no cliente e aviso didático da grafia do cadastro", () => {
  /* o servidor devolve candidatos; quem decide é a comparação SEM espaço dos dois lados */
  assert.ok(html.includes('norm(a.nmedificio).replace(/[^A-Z0-9]/g,"").includes(sq)'));
  assert.ok(html.includes("Encontrado ignorando espaços — no cadastro este prédio está grafado"),
    "o corretor aprende a grafia oficial em vez de só receber o resultado");
});

test("BUSCA-ESPACO: injeção impossível — o padrão só carrega A-Z0-9", () => {
  assert.ok(html.includes('const sq=toks.join("").replace(/[^A-Z0-9]/g,"")'),
    "aspas e símbolos nunca chegam ao WHERE");
});
