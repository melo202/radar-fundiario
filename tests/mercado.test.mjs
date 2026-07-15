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
  assert.match(html, /fetch\(MOTOR_BASE\+"\/motor\/avaliar"/);
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
  assert.ok(html.includes("Amostra insuficiente</b>"));
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
  assert.ok(html.includes("Análise de mercado indisponível agora"));
  assert.ok(html.includes("Os dados cadastrais acima seguem valendo."));
});
