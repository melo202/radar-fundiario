// P1.8 (24/08/2026): estabelecimentos no mapa — a medição entrega os NÚMEROS "pra gente",
// o novo caminho entrega os NOMES "pro cliente" e plota os pontos.
// O contrato: (1) entornoPois (motor) devolve os mais próximos por categoria com distância
// exata em metros, teto duro de 10/categoria, nome:null quando o OSM não tem (nunca inventa);
// (2) a rota /motor/localizacao/pois é branch ANTES do entorno genérico (startsWith casaria
// os dois); (3) no app o estado POI é DESTA ficha — localReset zera junto com LOCAL_LAST;
// (4) todo nome vai escapado (esc()) — dado de OSM nunca vira HTML cru.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
const loc = readFileSync(new URL("../motor/localizacao.js", import.meta.url), "utf-8");
const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("P1.8: entornoPois existe com teto duro de 10 por categoria e nome honesto", () => {
  assert.ok(loc.includes("export async function entornoPois"), "entornoPois ausente");
  assert.ok(loc.includes("Math.min(Math.max(1, limite | 0 || 6), 10)"), "teto de 10/categoria ausente");
  assert.ok(loc.includes("Object.entries(RAIOS_M)"), "deve reusar os raios próprios de cada categoria");
  assert.ok(loc.includes("nome: x.nome || null"), "sem nome no OSM -> null, nunca inventa");
  assert.ok(loc.includes("ST_Distance"), "distância exata em metros vai calculada");
  assert.ok(loc.includes("ORDER BY geom <->"), "KNN pelo índice gist para ordenar");
});

test("P1.8: rota /motor/localizacao/pois é branch ANTES do entorno genérico, com rate limit", () => {
  const iPois = srv.indexOf('u.pathname === "/motor/localizacao/pois"');
  const iEnt = srv.indexOf('const { entorno } = await import("./localizacao.js")', iPois);
  assert.ok(iPois > -1, "branch /pois ausente");
  assert.ok(iEnt > iPois, "o branch /pois deve vir ANTES do entorno genérico (startsWith casaria os dois)");
  assert.ok(srv.includes('estourou(req, 20, "localizacao")'), "rate limit ausente");
});

test("P1.8: botão no card de entorno e fetch do endpoint novo", () => {
  assert.ok(html.includes('onclick="verPoisNoMapa(this)">Ver estabelecimentos no mapa'), "botão ausente no renderLocal");
  assert.ok(html.includes("/motor/localizacao/pois?lat="), "verPoisNoMapa deve chamar o endpoint /pois");
  assert.ok(html.includes("function verPoisNoMapa(bt)") && html.includes("function plotarPois()")
    && html.includes("function renderLocalPoisNomes()"), "funções do P1.8 ausentes");
});

test("P1.8: toggle desliga a camada e localReset zera o estado POI junto com LOCAL_LAST", () => {
  const i = html.indexOf("async function verPoisNoMapa(bt)");
  const trecho = html.slice(i, i + 2500);
  assert.ok(trecho.includes("map.removeLayer(POI_LAYER)"), "2º clique deve remover a camada");
  assert.ok(trecho.includes('POI_ON=false'), "toggle deve desligar o estado");
  /* localReset: os pontos do imóvel anterior nunca ficam no mapa do próximo */
  const r = html.indexOf("LOCAL_LAST=null; /* MK-1: medição do imóvel anterior nunca vaza");
  assert.ok(r > -1, "localReset não encontrado");
  assert.ok(html.slice(r, r + 400).includes("POI_DADOS=null; POI_ON=false"),
    "localReset deve zerar POI junto com LOCAL_LAST");
});

test("P1.8: nomes de estabelecimentos sempre escapados; pontos pequenos com CSS próprio", () => {
  assert.ok(html.includes("esc(it.nome||"), "nome do OSM deve passar por esc()");
  assert.ok(html.includes(".poi-dot{"), "CSS do ponto ausente");
  assert.ok(html.includes("dLocalPois"), "seção de nomes no card ausente");
  /* pro cliente os nomes; pra gente os números: a lista de contagens segue intacta */
  assert.ok(html.includes("rotulo)}: <b>${c.count}</b>") || html.includes("rotulo") && html.includes("c.count"),
    "a lista de números (pra gente) deve continuar");
});
