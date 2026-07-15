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
  assert.ok(doc.includes("não substitui avaliação profissional"));
  assert.ok(doc.includes("Funil da amostra — nada some sem explicação"));
  assert.ok(doc.includes("Fora do cálculo — com a razão registrada"));
  assert.ok(doc.includes("excluído pelo corretor —"), "exclusão manual aparece com o motivo");
  assert.ok(doc.includes("confiança declarada"));
  assert.ok(doc.includes("encadeada à"), "versão revisada declara o encadeamento");
  assert.ok(doc.includes("os valores do texto são conferidos automaticamente"), "parecer rotulado");
  assert.ok(doc.includes("avaliação auditável nº"));
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
