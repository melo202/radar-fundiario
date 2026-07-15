// §24 — documento da avaliação: peça apresentável servida pelo motor, com o contrato
// de honestidade em toda parte. Asserções de string, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const doc = readFileSync(new URL("../motor/documento.js", import.meta.url), "utf-8");
const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const painel = readFileSync(new URL("../motor/painel.html", import.meta.url), "utf-8");

test("§24: o documento carrega o contrato de honestidade inteiro", () => {
  assert.ok(doc.includes("não são transações fechadas"));
  assert.ok(doc.includes("não substitui laudo de avaliação por profissional habilitado (PTAM"));
  assert.ok(doc.includes("Funil da amostra — nada some sem explicação"));
  assert.ok(doc.includes("Fora do cálculo — com a razão registrada"));
  assert.ok(doc.includes("excluído pelo corretor —"), "exclusão manual aparece com o motivo");
  assert.ok(doc.includes("Confiança declarada"));
  assert.ok(doc.includes("encadeada à"), "versão revisada declara o encadeamento");
  assert.ok(doc.includes("os valores do texto são conferidos automaticamente"), "parecer rotulado");
  assert.ok(doc.includes("avaliação auditável nº"));
});

test("§24 premium: capa de marca, mapa server-side, localização cruzada e assinatura", () => {
  assert.ok(doc.includes("corretorinteligente_logo_branca.svg"), "capa marinho com a logo oficial");
  assert.match(doc, /function mapaSVG\(subject, pontos\)/, "mapa desenhado dos dados no servidor");
  assert.ok(doc.includes("Localização — o que tem na região"), "cruzamento com o entorno medido");
  assert.ok(doc.includes("sem julgamento automático de valor"), "localização é fato, nunca ajuste");
  assert.ok(doc.includes("Corretor(a) responsável"), "bloco de assinatura com CRECI");
  assert.ok(doc.includes('O rótulo "PTAM" segue travado'), "PTAM continua atrás da verificação profissional");
});

test("cruzamento §10: avaliação carrega o entorno como FATO quando há coordenada", () => {
  const av = readFileSync(new URL("../motor/avaliacao.js", import.meta.url), "utf-8");
  assert.ok(av.includes("result.localizacao = { destaques, atencao,"));
  assert.ok(av.includes("NUNCA vira"), "regra do §10 registrada no código");
  assert.ok(av.includes("entorno é bônus do resultado — nunca derruba a avaliação"));
});

test("varredura multi-portal: roda de site: por dia, mesma cota, dedup §5 de guarda", () => {
  const va = readFileSync(new URL("../motor/varredura.js", import.meta.url), "utf-8");
  assert.ok(va.includes('PORTAIS_ALVO = ["", "zapimoveis.com.br", "vivareal.com.br", "olx.com.br"'));
  assert.ok(va.includes("PORTAIS_ALVO[dia % PORTAIS_ALVO.length]"));
  assert.ok(va.includes('site:${portal}'));
  assert.ok(va.includes('portalAlvo: portal || "geral"'), "portal da noite auditado no resumo");
});

test("§24: rota pública com rate limit próprio e CSP fechada", () => {
  assert.ok(srv.includes('estourou(req, 30, "documento")'));
  assert.ok(srv.includes("\\/documento$"));
  assert.ok(srv.includes("default-src 'none'; style-src 'unsafe-inline'"));
});

test("§24: card Mercado e painel de revisão apontam para o documento", () => {
  assert.ok(app.includes(">Abrir o documento da avaliação</a>"));
  assert.ok(app.includes("/motor/avaliacoes/${esc(d.id)}/documento"));
  assert.ok(painel.includes("Abrir o documento da avaliação →"));
});
