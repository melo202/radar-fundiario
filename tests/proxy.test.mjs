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
  /* fallback vivo: jsonpOnce continua definido e é chamado no caminho degradado
     (20/08: com reset do contador de upstream após sucesso) */
  assert.match(html, /function jsonpOnce\(params,url=SVC\)/);
  assert.ok(html.includes("const d=await jsonpOnce(params,url);UPSTREAM_FALHAS=0;return d;"));
});

test("item 14: erro de transporte trava o proxy por 60s (TTL); erro do upstream propaga sem fallback", () => {
  /* 20/08 (bug "zoom não carrega, só clique"): a trava do proxy tinha duração de SESSÃO —
     somada ao ESPELHO_MORTO permanente, a aba caía no JSONP direto da prefeitura até o
     usuário recarregar. Agora ambas as travas expiram em 60s e se reprovam sozinhas. */
  assert.ok(html.includes("PROXY_DEAD_ATE=Date.now()+60000"));
  assert.ok(html.includes("if(!(PROXY_DEAD_ATE>Date.now()))"), "trava do proxy expira e reprova sozinha");
  assert.ok(html.includes("ESPELHO_MORTO_ATE[camada]=Date.now()+60000"), "espelho degradado também recupera em 60s");
  assert.ok(html.includes("!(ESPELHO_MORTO_ATE[camada]>Date.now())"));
  /* 20/08: erro de upstream ainda propaga (throw e), mas agora conta — 3 seguidas ligam
     o fail-fast PREFEITURA_MORTA por 60s em vez de queimar 30s+30s por tentativa */
  assert.ok(html.includes("if(e.upstream){if(++UPSTREAM_FALHAS>=3)"));
  assert.ok(html.includes("throw e;}"));
  assert.ok(html.includes("PREFEITURA_MORTA_ATE=Date.now()+60000"));
  assert.ok(html.includes("servidor da prefeitura instável no momento"));
  /* upstream:true nos dois casos que NÃO são culpa do proxy: status HTTP repassado e {error} do ArcGIS */
  assert.match(html, /\{upstream:true\}/);
  assert.ok(html.includes('new Error("upstream http "+r.status)'));
});

test("transporte 20/08: espelho primeiro (8s), AbortError nunca conta como falha", () => {
  assert.ok(html.includes("AbortSignal.timeout(8000)"), "espelho com timeout curto — falha rápida pro fallback");
  assert.ok((html.match(/e\.name==="AbortError"\)throw e/g) || []).length >= 2,
    "AbortError propaga sem sujar ESPELHO_FALHAS nem acionar retry");
  assert.ok(html.includes("AbortSignal.any"), "pan/zoom novo cancela a consulta velha");
});

test("item 14: CSP libera o fetch para o proxy e mantém o host do JSONP", () => {
  assert.ok(html.includes("connect-src 'self' https://api.corretorinteligente.tech"));
  assert.ok(html.includes("script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br"));
});
