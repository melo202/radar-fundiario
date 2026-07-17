// Aba Mercado (beta) no dossiê — contrato de honestidade e integração com o motor.
// Asserções de string sobre o html, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("mercado: card existe no Território e consome o motor público", () => {
  assert.ok(html.includes('const MOTOR_BASE="https://api.corretorinteligente.tech"'));
  assert.ok(html.includes('id="dMercado"'));
  assert.ok(html.includes('onclick="analisarMercado()"'));
  assert.match(html, /fetch\(MOTOR_BASE\+"\/motor\/mercado"/);
  /* CSP precisa liberar o host do motor para o fetch */
  assert.ok(html.includes("connect-src 'self' https://api.corretorinteligente.tech"));
});

test("mercado: rotulagem honesta obrigatória em todos os caminhos", () => {
  assert.ok(html.includes("Não são transações e não substituem avaliação profissional."));
  assert.ok(html.includes("Não substitui avaliação profissional."));
  assert.ok(html.includes("Referência por ofertas públicas"));
  /* sem área edificada não existe comparação honesta por m² */
  assert.ok(html.includes("sem área não existe comparação honesta por m²"));
  /* amostra insuficiente é informada, nunca maquiada */
  assert.ok(html.includes("Não há base segura para calcular"));
});

test("laudo-mercado: ACM entra no Relatório de Referência só quando analisada NESTE imóvel", () => {
  assert.match(html, /function mercadoDocumentoHTML\(a\)/);
  assert.ok(html.includes("${mercadoDocumentoHTML(a)}"), "seção plugada no template do laudo");
  /* chave prende a análise ao imóvel: sem análise ou imóvel diferente = sem seção */
  assert.ok(html.includes("if(!m||!m.d||!m.d.result)return \"\";"));
  assert.ok(html.includes("if(!chave||m.chave!==chave)return \"\";"));
  /* rotulagem honesta + rastreabilidade (§16): id da avaliação e data da consulta */
  assert.ok(html.includes("Análise Comparativa de Mercado — ofertas públicas"));
  assert.ok(html.includes("Ofertas não são transações fechadas e esta seção não substitui avaliação profissional."));
  assert.ok(html.includes("Avaliação nº ${esc(m.d.id)}"));
});

test("amostra profissional: bairro diferente nunca entra automaticamente no valor", () => {
  /* Report real (17/07): a ampliação por centroides misturou sete bairros e produziu
     uma referência pouco defensável. Falta de amostra agora interrompe o cálculo. */
  const av = readFileSync(new URL("../motor/avaliacao.js", import.meta.url), "utf-8");
  assert.ok(!av.includes("centroidesLocalidades"), "centroide de bairro não decide mais comparabilidade");
  assert.ok(av.includes("Outro bairro nunca entra no valor"));
  assert.ok(av.includes("Amostra insuficiente no mesmo bairro — nenhum valor foi calculado."));
  assert.ok(av.includes("areaRatioMin: 0.75"));
  assert.ok(av.includes("areaRatioMax: 4 / 3"));
  assert.ok(html.includes("Ofertas próximas de outros bairros — fora do cálculo"));
  assert.ok(html.includes("Nenhum valor foi estimado"));
  const doc = readFileSync(new URL("../motor/documento.js", import.meta.url), "utf-8");
  assert.ok(doc.includes("<th>Bairro</th>"));
  assert.ok(doc.includes("Bairros diferentes não entram automaticamente no valor"));
});

test("busca ao vivo: o clique dispara /motor/mercado (procura nos portais) e não o acervo estático", () => {
  /* pedido do usuário (15/07): "quando eu clicar em analisar tem que disparar e procurar nos sites" */
  assert.match(html, /fetch\(MOTOR_BASE\+"\/motor\/mercado"/);
  assert.ok(html.includes("AbortSignal.timeout(120000)"), "timeout largo p/ a coleta ao vivo");
  assert.ok(html.includes("Procurando anúncios semelhantes na OLX, Zap Imóveis, Viva Real"));
  const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(srv.includes('req.url === "/motor/mercado"'));
  assert.ok(srv.includes('estourou(req, 4, "mercado")'), "rate limit protege a cota Brave");
  const ao = readFileSync(new URL("../motor/mercado-aovivo.js", import.meta.url), "utf-8");
  assert.ok(ao.includes('PORTAIS_AOVIVO = ["zapimoveis.com.br", "vivareal.com.br", "olx.com.br"]'));
  assert.ok(ao.includes("CACHE_H = 6"), "cache de 6h por bairro protege a cota global");
  assert.ok(ao.includes("maxExtrair: restante"), "extração limitada p/ o clique não travar");
  assert.ok(ao.includes("TETO_EXTRACAO = 5"), "teto otimizado (15/07): o clique não espera mais que o necessário");
});

test("links e mapa na avaliação: comparáveis clicáveis, atalhos de portal e recorte do mapa", () => {
  assert.ok(html.includes('class="dmercado-verlink">ver na ${esc(c.portal)} ↗</a>'), "cada comparável leva ao anúncio");
  assert.match(html, /function linksPortais\(subject\)/);
  assert.ok(html.includes('["OLX",`https://www.olx.com.br'), "atalho de busca na OLX");
  assert.ok(html.includes("Ver mais anúncios ao vivo nos portais"));
  assert.match(html, /function miniMapaOfertas\(comps,subjLL\)/, "recorte do mapa dentro da avaliação");
  assert.ok(html.includes("${mini}"), "mapa plugado no render do card");
  /* amostra insuficiente NÃO deixa o corretor na mão — leva aos portais */
  assert.ok(html.includes("Nenhum valor foi estimado"));
});

test("avaliação a 1 toque: ação principal do dossiê leva ao card e dispara sozinha", () => {
  /* pedido do usuário (15/07): "não tá fácil de encontrar o laudo" */
  assert.match(html, /onclick="irParaAvaliacao\(\)">Avaliação de mercado<\/button>/);
  assert.match(html, /function irParaAvaliacao\(\)[\s\S]{0,400}setDossierView\('territorio'\)[\s\S]{0,400}analisarMercado\(\)/);
  /* não dispara em cima de análise em andamento nem refaz a já feita */
  assert.ok(html.includes("!bt.disabled&&!body.querySelector('.dmercado-num')"));
  /* Analisar vizinhança continua existindo, agora em Ferramentas */
  assert.match(html, /onclick="setDossierView\('territorio'\);compare\(\)"[^>]*>Analisar vizinhança<\/button>/);
});

test("laudo-mercado: mapa de comparáveis em SVG estático — dados, não tiles", () => {
  assert.match(html, /function mercadoMapaSVG\(m,a\)/);
  /* sem posição real (imóvel E ao menos 1 oferta) o mapa NÃO existe — nunca se inventa */
  assert.ok(html.includes('if(!pts.length||!(a&&a.x_coord&&a.y_coord))return "";'));
  assert.ok(html.includes("${mercadoMapaSVG(m,a)}"), "mapa plugado na seção ACM do laudo");
  /* números do mapa casam com a lista (mesma origem: índice do comparável) */
  assert.ok(html.includes("`<div class=\"kv\"><span>${i+1}. ${esc(c.portal)}"), "lista numerada");
  assert.ok(html.includes("ofertas numeradas conforme a lista acima"));
  /* barra de escala honesta + origem da posição declarada */
  assert.match(html, /\[100,250,500,1000,2000,5000\]\.find/);
  assert.ok(html.includes("posição pelo endereço do anúncio (CNEFE/IBGE, precisão declarada no motor)"));
});

test("ia na interface: parecer e resumo com rotulagem de origem e degradação explicada", () => {
  assert.match(html, /function gerarParecerMercado\(id\)/);
  assert.match(html, /function resumirEntorno\(\)/);
  assert.ok(html.includes("os valores do texto são conferidos automaticamente contra o resultado"));
  assert.ok(html.includes("números conferidos automaticamente contra a medição"));
  assert.ok(html.includes("Resumo automático gerado sem IA a partir dos dados medidos."));
  assert.ok(html.includes("Os números acima seguem valendo."));
});

test("mercado: novo imóvel aberto reseta o card e falha de rede degrada com aviso", () => {
  assert.ok(html.includes("mercadoReset(a); /* Mercado (beta)"));
  assert.ok(html.includes("Busca de mercado indisponível agora"));
  assert.ok(html.includes("Os dados cadastrais acima seguem valendo."));
});
