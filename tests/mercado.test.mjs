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

test("mercado: novo imóvel aberto reseta o card e falha de rede degrada com aviso", () => {
  assert.ok(html.includes("mercadoReset(a); /* Mercado (beta)"));
  assert.ok(html.includes("Análise de mercado indisponível agora"));
  assert.ok(html.includes("Os dados cadastrais acima seguem valendo."));
});
