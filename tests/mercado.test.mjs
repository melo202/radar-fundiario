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
  assert.ok(html.includes("AbortSignal.timeout(180000)"), "timeout largo p/ a pesquisa progressiva");
  assert.ok(html.includes("Procurando ofertas no bairro em vários portais"));
  const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(srv.includes('req.url === "/motor/mercado"'));
  assert.ok(srv.includes('estourou(req, 4, "mercado")'), "rate limit protege a cota Brave");
  const ao = readFileSync(new URL("../motor/mercado-aovivo.js", import.meta.url), "utf-8");
  assert.ok(ao.includes('PORTAIS_PRINCIPAIS = ["zapimoveis.com.br", "vivareal.com.br", "olx.com.br"]'));
  assert.ok(ao.includes('PORTAIS_APROFUNDADOS = ["62imoveis.com.br", "imovelweb.com.br", "chavesnamao.com.br", "wimoveis.com.br"]'));
  assert.ok(ao.includes("CACHE_H = 6"), "cache de 6h por perfil protege a cota global");
  assert.ok(ao.includes("faixaArea") && ao.includes("quartos"), "cache distingue área e quartos");
  assert.ok(ao.includes("persist: false"), "prévia determinística decide se a busca precisa aprofundar");
  assert.ok(ao.includes('previa.status === "amostra_insuficiente"'));
  assert.ok(ao.includes("TETO_EXTRACAO_TOTAL = 18"), "pesquisa profunda continua com teto explícito");
  assert.ok(ao.includes("TETO_EXTRACAO_TOTAL - ingestao.tentativasExtracao"), "falha de extração também consome o teto de IA");
  const ing = readFileSync(new URL("../motor/ingerir.js", import.meta.url), "utf-8");
  assert.ok(ing.includes("stats.tentativasExtracao >= maxExtrair"), "página ruim não cria chamadas ilimitadas");
  assert.ok(ao.includes('"mercado-aovivo-falhou"'), "falha total não envenena o cache por seis horas");
  assert.ok(ao.includes('modo: ingestao.aprofundou ? "aprofundada" : "direta"'));
});

test("amostra pequena: bloqueia o preço, mas salva e entrega relatório auditável", () => {
  const av = readFileSync(new URL("../motor/avaliacao.js", import.meta.url), "utf-8");
  const doc = readFileSync(new URL("../motor/documento.js", import.meta.url), "utf-8");
  const os = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.ok(av.includes("amostra insuficiente impede o NÚMERO, nunca o RELATÓRIO"));
  assert.ok(av.includes("VALUES ($1,'amostra_insuficiente'"), "investigação insuficiente vira versão persistida");
  assert.ok(av.includes('finalidade: "evidencia_preliminar_sem_calculo"'));
  assert.ok(doc.includes("Relatório de pesquisa de mercado"));
  assert.ok(doc.includes("Este relatório não ficou em branco."));
  assert.ok(doc.includes("nenhum preço foi estimado ou inventado"));
  assert.ok(html.includes("Abrir relatório da pesquisa"));
  assert.ok(html.includes('if(m.d.status==="amostra_insuficiente")'), "laudo do mapa não tenta imprimir valores inexistentes");
  assert.ok(html.includes("Por isso nenhum valor, faixa ou confiança foi estimado"));
  assert.ok(os.includes("Pesquisa concluída. Seu relatório está pronto."));
  assert.ok(os.includes("Abrir relatório da pesquisa"));
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
  assert.ok(html.includes("!bt.disabled&&!body.querySelector('.dmercado-num,.dmercado-pesquisa-pronta')"));
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
