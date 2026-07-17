// Identidade canônica do anúncio (Mercado em Movimento 17/07) — fixtures são URLs
// REAIS do acervo de produção. O contrato central: página-catálogo NUNCA ganha id
// (era ela que inventava "R$ 78 mil -> R$ 1,73 mi" no termômetro).
import { test } from "node:test";
import assert from "node:assert/strict";
import { identidadeAnuncio, portalRaiz } from "../motor/identidade-anuncio.js";

test("anúncios individuais reais ganham o id do próprio portal", () => {
  const casos = [
    ["https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/casa-setor-aeroporto-duas-casas-de-4-e-3-quartos-1367774783", "1367774783"],
    ["https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/sobrado-com-4-dormitorios-a-venda-220-m-por-r-770-000-00-jardim-atlantico-goiania-g-1377145850", "1377145850"],
    ["https://www.vivareal.com.br/imovel/apartamento-4-quartos-jardim-goias-bairros-goiania-com-garagem-108m2-venda-RS840000-id-2879172082/", "2879172082"],
    ["https://www.zapimoveis.com.br/imovel/venda-apartamento-3-quartos-setor-bueno-goiania-go-89m2-id-2582000000/", "2582000000"],
  ];
  for (const [url, esperado] of casos) {
    const i = identidadeAnuncio(url);
    assert.equal(i.externalId, esperado, url);
    assert.ok(i.ehAnuncioIndividual, url);
  }
});

test("páginas-catálogo reais (as do bug de produção) NÃO ganham id", () => {
  const catalogos = [
    "https://www.olx.com.br/imoveis/venda/casas/estado-go/grande-goiania-e-anapolis/regiao-sul/st-marista",
    "https://www.olx.com.br/imoveis/estado-go/grande-goiania-e-anapolis/regiao-oeste/goia",
    "https://go.olx.com.br/grande-goiania-e-anapolis/regiao-sul/imoveis/venda/casas",
    "https://www.vivareal.com.br/imoveis-lancamento/goiania/apartamento_residencial/status-pronto-para-morar/",
    "https://www.vivareal.com.br/venda/goias/goiania/apartamento_residencial/",
  ];
  for (const url of catalogos) {
    const i = identidadeAnuncio(url);
    assert.equal(i.externalId, null, url);
    assert.equal(i.ehAnuncioIndividual, false, url);
  }
});

test("número no MEIO do slug (área, preço parcelado) não vira id", () => {
  // slug real da OLX que termina em id mas carrega preço no meio; e um slug artificial
  // cujo número longo está no meio — só o final conta
  const i = identidadeAnuncio("https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/casa-jardim-america-a-venda-494-00-por-r-253-1491248084");
  assert.equal(i.externalId, "1491248084");
  const j = identidadeAnuncio("https://exemplo.com.br/casa-12345678-com-piscina/venda");
  assert.equal(j.externalId, null);
});

test("revisão 17/07: CEP/telefone no FIM do slug de portal desconhecido NÃO vira id", () => {
  // o pior erro possível: dois anúncios diferentes colidindo na mesma identidade
  const cep1 = identidadeAnuncio("https://www.imobiliariagyn.com.br/casa-rua-t30-setor-bueno-74223010");
  const cep2 = identidadeAnuncio("https://www.imobiliariagyn.com.br/sobrado-rua-t30-setor-bueno-74223010");
  assert.equal(cep1.externalId, null, "CEP não é id");
  assert.equal(cep2.externalId, null);
  const tel = identidadeAnuncio("https://www.imobalfa.com.br/casa-jardim-europa-fone-6232241234");
  assert.equal(tel.externalId, null, "telefone não é id");
  // com marcador explícito, a cauda longa ainda ganha identidade
  const ok = identidadeAnuncio("https://www.imobalfa.com.br/imovel/casa-jardim-europa-cod-88771");
  assert.equal(ok.externalId, "88771");
});

test("go.olx e www.olx são o MESMO portal; URL canônica descarta rastreio", () => {
  assert.equal(portalRaiz("go.olx.com.br"), "olx.com.br");
  assert.equal(portalRaiz("www.olx.com.br"), "olx.com.br");
  assert.equal(portalRaiz("www.vivareal.com.br"), "vivareal.com.br");
  const i = identidadeAnuncio("https://go.olx.com.br/goiania/imoveis/casa-1367774783?utm_source=x&ref=busca#foto");
  assert.equal(i.urlCanonica, "https://go.olx.com.br/goiania/imoveis/casa-1367774783");
  assert.equal(i.portalRaiz, "olx.com.br");
});

test("revisão 17/07: portal DESCONHECIDO não colapsa por sufixo — o host é o portal", () => {
  // sufixos públicos (.srv.br) e plataformas multi-tenant não podem unir sites distintos
  assert.equal(portalRaiz("imobalfa.srv.br"), "imobalfa.srv.br");
  assert.equal(portalRaiz("imobbeta.srv.br"), "imobbeta.srv.br");
  assert.equal(portalRaiz("agenciax.tecimob.com.br"), "agenciax.tecimob.com.br");
  assert.equal(portalRaiz("www.imobiliariagyn.com.br"), "imobiliariagyn.com.br", "www ainda cai");
});

test("URL inválida não derruba a ingestão — devolve identidade vazia", () => {
  const i = identidadeAnuncio("isso não é url");
  assert.equal(i.externalId, null);
  assert.equal(i.ehAnuncioIndividual, false);
});

test("peneira §6 usa a identidade: snippet de catálogo com preço de UMA unidade cai", async () => {
  // caso real da auditoria de 17/07: catálogo da VivaReal cujo snippet trazia preço e
  // área de um apartamento — 1 sinal só não bastava e ele passava por comparável
  const { avaliarQualidade } = await import("../motor/qualidade.js");
  const q = avaliarQualidade({
    url: "https://www.vivareal.com.br/venda/goias/goiania/bairros/setor-bueno/apartamento_residencial/",
    titulo: "Apartamentos à venda no Setor Bueno - Goiânia",
    descricao: "Apartamento 3 quartos, 89 m², R$ 690.000 no Setor Bueno",
    extracao: { propertyType: "apartamento", neighborhood: "Setor Bueno", privateAreaM2: 89, askingPrice: 690000 },
  });
  assert.equal(q.isCatalogPage, true, "portal conhecido sem id na URL = catálogo");
  assert.equal(q.comparableGrade, false);
  assert.ok(q.razoes.some(r => r.includes("padrão de id conhecido")));
});
