// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// P2.2 (25/08): busca "Google" — Meilisearch no motor (sugestões tolerantes a erro,
// todas as ruas/edifícios do cadastro) mescladas no dropdown DEPOIS das locais.
// Régua: chave SEARCH-ONLY no endpoint (nunca a mestra); saída higienizada (4 campos
// públicos, sem inscrição/coordenada); falha da remota NUNCA quebra a busca local.
// ATENÇÃO: arquivo é CRLF — pinar strings de UMA linha (includes), nunca com \n.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const server = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
const indexer = readFileSync(new URL("../motor/indexar-busca.mjs", import.meta.url), "utf-8");

function loadMesclar() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem");
  const src = html.slice(html.indexOf("\n", iStart) + 1, html.lastIndexOf("\n", iEnd));
  assert.ok(src.includes("function mesclarSugestoesRemotas"), "mesclarSugestoesRemotas ausente do RADAR_PURE (P2.2)");
  const sandbox = { esc: (v) => (v == null ? "" : String(v)) };
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports={mesclarSugestoesRemotas};", { filename: "radar-pure-p22.js" }).runInContext(sandbox);
  return sandbox.__exports.mesclarSugestoesRemotas;
}

// ------------------------------------------------------------- endpoint (motor) ------

test("P2.2 endpoint: rota pública, rate limit próprio, chave SEARCH-ONLY (nunca a mestra)", () => {
  assert.ok(server.includes('req.url.startsWith("/motor/busca/sugere")'), "rota /motor/busca/sugere ausente");
  assert.ok(server.includes('estourou(req, 60, "busca-sugere")'), "rate limit próprio ausente");
  assert.ok(server.includes("process.env.MEILI_SEARCH_KEY"), "endpoint deveria usar a chave SEARCH-ONLY");
  assert.ok(!server.includes("MEILI_MASTER_KEY"), "a chave MESTRA nunca pode aparecer no servidor web");
});

test("P2.2 endpoint: saída higienizada — só 4 campos públicos, sem vazar Meilisearch cru", () => {
  const i = server.indexOf('req.url.startsWith("/motor/busca/sugere")');
  const bloco = server.slice(i, server.indexOf("catch (e)", i));
  for (const campo of ["tipo", "nome", "tipovia", "bairro"]) assert.ok(bloco.includes(campo), `campo ${campo} ausente`);
  for (const proibido of ["nrinscr", "x_coord", "geom", "_rankingScore", "attributesToHighlight"]) {
    assert.ok(!bloco.includes(proibido), `endpoint não pode devolver ${proibido}`);
  }
  assert.ok(server.includes("q.length < 3"), "consulta mínima de 3 caracteres ausente");
});

test("P2.2 indexador: swap atômico, typo tolerance, só rua/edifício do espelho", () => {
  assert.ok(indexer.includes("/swap-indexes"), "reindexação sem swap atômico");
  assert.ok(indexer.includes('typoTolerance: { enabled: true'), "typo tolerance desligada");
  assert.ok(indexer.includes('searchableAttributes: ["nome", "bairro"]'), "atributos de busca");
  assert.ok(indexer.includes('tipo: "rua"') && indexer.includes('tipo: "predio"'), "dois tipos de documento");
  assert.ok(indexer.includes("MEILI_MASTER_KEY"), "indexação exige a mestra (só no VPS, fora do servidor web)");
});

// ------------------------------------------------------------------ front ------------

test("P2.2 front: fetch debounced + token + confirma input; falha silenciosa (local segue)", () => {
  assert.ok(html.includes("function meiliSugere(qtext)"), "meiliSugere ausente");
  assert.ok(html.includes("if(tok!==MEILI.tok)return;"), "sem guarda de resposta fora de ordem");
  assert.ok(html.includes("String(inp.value).trim()!==q"), "não confirma que o input não mudou");
  assert.ok(html.includes("ruaCore(q)||q"), "deveria mandar o NÚCLEO da frase (sem tipo de via/número)");
  assert.ok(html.includes("meiliSugere(val); /* P2.2"), "não disparou no mesmo fluxo do updateCaixaList");
});

test("P2.2 front: remotas DEPOIS das locais, marcadas com ≈, rua cai no fluxo de rua", () => {
  assert.ok(html.includes("mesclarSugestoesRemotas(ruaHits.map"), "remotas sem dedupe contra as locais");
  assert.ok(html.includes('data-kind="meili" data-tipo='), "item remoto sem kind/tipo");
  assert.ok(html.includes('"Prédio":"Rua"} ≈'), "sem o selo ≈ de aproximado");
  assert.ok(html.includes('kind==="meili"&&el.dataset.tipo==="predio"'), "ramo de prédio remoto ausente");
  assert.ok(html.includes("!hits.length&&!meiliItens.length"), "estado vazio ignorando as remotas");
});

test("P2.2 mesclarSugestoesRemotas (pura): dedupe dos 2 lados, teto, tipo, nunca lança", () => {
  const f = loadMesclar();
  assert.ok(Array.isArray(f()) && f().length === 0, "vazio -> array vazio (vm cross-realm: nunca deepEqual)");
  const rem = [
    { tipo: "rua", nome: "PORTUGAL", bairro: "SET OESTE" },          // dup do local (norm maiúsculo)
    { tipo: "rua", nome: "T 25", bairro: "SET BUENO" },
    { tipo: "predio", nome: "RES.SUMER PARK", bairro: "SET BUENO" },
    { tipo: "rua", nome: "T 25", bairro: "SET BUENO" },              // dup interna da remota
    { nome: "", bairro: "X" },                                       // sem nome: fora
    { tipo: "rua", nome: "C 100", bairro: "" },                      // sem bairro: fora
  ];
  const out = f(["portugal"], rem, 6);
  assert.equal(out.length, 2, `esperava 2 (dedupe local+interno+guards), veio ${out.length}`);
  assert.equal(out[0].nome, "T 25");
  assert.equal(out[1].tipo, "predio", "tipo predio preservado");
  assert.equal(f([], rem, 1).length, 1, "teto respeitado");
});
