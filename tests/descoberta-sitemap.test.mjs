// DESCOBERTA-SITEMAP (19/08/2026) — descoberta gratuita de anúncios pelo índice que
// o próprio portal publica. Testa o funil puro: locs do XML, índice vs urlset, e o
// filtro duplo (padrão de anúncio do portal + "goiania" no slug) com URLs REAIS do
// nosso banco — incluindo as páginas-catálogo que NÃO podem entrar (bug de 17/07).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extrairLocs, ehIndiceSitemap, urlDeAnuncioGyn, PORTAIS } from "../motor/descoberta-sitemap.js";

const cfg = (host) => PORTAIS.find(p => p.host === host);

test("extrairLocs: urlset e index, com espaços e maiúsculas", () => {
  const xml = `<?xml version="1.0"?><urlset><url><loc> https://a.com.br/imovel/1 </loc></url>
    <url><LOC>https://a.com.br/imovel/2</LOC></url></urlset>`;
  assert.deepEqual(extrairLocs(xml), ["https://a.com.br/imovel/1", "https://a.com.br/imovel/2"]);
});

test("ehIndiceSitemap: distingue índice de lista de URLs", () => {
  assert.ok(ehIndiceSitemap("<sitemapindex xmlns='x'><sitemap><loc>a</loc></sitemap></sitemapindex>"));
  assert.ok(!ehIndiceSitemap("<urlset><url><loc>a</loc></url></urlset>"));
});

test("urlDeAnuncioGyn: anúncios REAIS do banco passam", () => {
  const casos = [
    ["https://www.chavesnamao.com.br/imovel/apto-go-goiania-bueno-71m2-id-123456/", "chavesnamao.com.br"],
    ["https://www.vivareal.com.br/imovel/apartamento-2-quartos-jardim-goias-goiania-goias-id-2879172082/", "vivareal.com.br"],
    ["https://www.zapimoveis.com.br/imovel/casa-3-quartos-setor-marista-goiania-id-1234567/", "zapimoveis.com.br"],
    ["https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/apartamento-setor-pedro-ludovico-1488145786", "olx.com.br"],
    ["https://www.62imoveis.com.br/imovel/galpao-venda-setor-pedro-ludovico-goiania-go-rua-1030-1134963", "62imoveis.com.br"],
    ["https://www.arboimoveis.com.br/imovel/casa-a-venda-plateau-d-or-goiania-go/CA0639_LUCIO", "arboimoveis.com.br"],
  ];
  for (const [url, host] of casos) assert.ok(urlDeAnuncioGyn(url, cfg(host)), `${host}: ${url}`);
});

test("urlDeAnuncioGyn: catálogo e outra cidade NÃO passam (trava do bug das mudanças falsas)", () => {
  const barrados = [
    ["https://www.chavesnamao.com.br/imoveis-para-alugar/go-goiania/residencial-alphaville/", "chavesnamao.com.br", "catálogo de condomínio"],
    ["https://www.vivareal.com.br/venda/goias/goiania/bairros/setor-campinas/apartamento_residencial/", "vivareal.com.br", "página de bairro"],
    ["https://www.vivareal.com.br/imovel/apartamento-vila-nivi-sao-paulo-id-123456/", "vivareal.com.br", "São Paulo"],
    ["https://www.zapimoveis.com.br/venda/terrenos-lotes-condominios/go+goiania++resid-mirante/", "zapimoveis.com.br", "listagem"],
    ["https://www.olx.com.br/imoveis/venda/estado-go/grande-goiania-e-anapolis", "olx.com.br", "categoria"],
  ];
  for (const [url, host, porque] of barrados)
    assert.ok(!urlDeAnuncioGyn(url, cfg(host)), `${porque}: ${url}`);
});

test("PORTAIS: todo portal configurado tem padrão de anúncio e host válido", () => {
  assert.ok(PORTAIS.length >= 8, "cobertura mínima dos portais de maior volume");
  for (const p of PORTAIS) {
    assert.ok(/^[a-z0-9.-]+\.[a-z.]+$/.test(p.host), `host válido: ${p.host}`);
    assert.ok(p.anuncio instanceof RegExp, `regex de anúncio: ${p.host}`);
  }
});

test("FIO PEGADO: o caminho do preço existe de ponta a ponta (sitemap → página → funil)", () => {
  const ip = readFileSync(new URL("../motor/ingerir-pagina.js", import.meta.url), "utf-8");
  const rev = readFileSync(new URL("../motor/revisita.js", import.meta.url), "utf-8");
  const svc = readFileSync(new URL("../motor/radar-descoberta.service", import.meta.url), "utf-8");
  assert.ok(ip.includes("enriquecerPendentes"), "enriquecimento dos descobertos existe");
  assert.ok(ip.includes("processarListing"), "página entra no MESMO funil do snippet");
  assert.ok(rev.indexOf("ingerirPagina") > -1 && rev.indexOf("ingerirPagina") < rev.indexOf("site:${host}"),
    "revisita tenta a página direto ANTES de gastar busca");
  assert.ok(svc.includes("ingerir-pagina.js"), "descoberta encadeia o enriquecimento no systemd");
});
