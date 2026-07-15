// Item 14 (15/07/2026): transporte ArcGIS via proxy HTTPS próprio com fallback JSONP.
// Asserções de string sobre o html, no padrão do repo — o contrato aqui é a ORDEM de
// preferência (proxy primeiro, JSONP como rede de segurança) e a distinção entre erro
// de transporte (marca PROXY_DEAD) e erro do upstream (propaga para o retry histórico).
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("item 14: proxy próprio é o transporte preferido, com JSONP de fallback", () => {
  assert.ok(html.includes('const ARCGIS_PROXY="https://api.corretorinteligente.tech/arcgis"'));
  assert.ok(html.includes("url.replace(ARCGIS_UPSTREAM,ARCGIS_PROXY)"));
  /* fallback vivo: jsonpOnce continua definido e é chamado no caminho degradado */
  assert.match(html, /function jsonpOnce\(params,url=SVC\)/);
  assert.ok(html.includes("return await jsonpOnce(params,url);"));
});

test("item 14: erro de transporte marca PROXY_DEAD; erro do upstream propaga sem fallback", () => {
  assert.ok(html.includes("PROXY_DEAD=true"));
  assert.ok(html.includes("if(e.upstream)throw e;"));
  /* upstream:true nos dois casos que NÃO são culpa do proxy: status HTTP repassado e {error} do ArcGIS */
  assert.match(html, /\{upstream:true\}/);
  assert.ok(html.includes('new Error("upstream http "+r.status)'));
});

test("item 14: CSP libera o fetch para o proxy e mantém o host do JSONP", () => {
  assert.ok(html.includes("connect-src 'self' https://api.corretorinteligente.tech"));
  assert.ok(html.includes("script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br"));
});
