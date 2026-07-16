// §14 — revisão do corretor: exclusão SEMPRE registrada, recálculo SEMPRE como versão
// nova encadeada (§20). Contratos travados por asserções de string, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("motor: exclusão manual filtra a amostra e é contada à parte (nunca silenciosa)", () => {
  const av = src("../motor/avaliacao.js");
  assert.ok(av.includes('if (excluir.has(String(r.id))) { excluidosManual++; continue; }'));
  assert.ok(av.includes("excluidosManual, ofertasColetadasEntre"), "contagem exposta no sample");
});

test("motor: recálculo revisado é VERSÃO encadeada com a revisão declarada nas premissas", () => {
  const av = src("../motor/avaliacao.js");
  assert.ok(av.includes("opts.parentId || null, opts.createdBy || null, versao"));
  assert.ok(av.includes("if (opts.notaRevisao) result.assumptions = [...result.assumptions, opts.notaRevisao];"),
    "parecer e laudo passam a declarar a revisão humana");
  assert.ok(av.includes('(pai.rows[0]?.version || 0) + 1'), "versão incrementa a do pai");
});

test("painel: exclusão grava manual_change com motivo, autor e quando na avaliação ORIGINAL", () => {
  const p = src("../motor/painel.js");
  assert.ok(p.includes('acao: "excluido"'));
  assert.ok(p.includes('por: "corretor-painel"'));
  assert.ok(p.includes("quando: new Date().toISOString()"));
  assert.ok(p.includes("'revisao-corretor'"), "auditoria da revisão");
  assert.ok(p.includes('/^\\/painel\\/api\\/avaliacoes\\/[0-9a-f-]{36}\\/revisar$/'), "rota atrás da sessão+CSRF");
});

test("painel: interface exige motivo visível e explica que nada é sobrescrito", () => {
  const h = src("../motor/painel.html");
  assert.ok(h.includes("Motivo da exclusão (fica registrado na auditoria)"));
  assert.ok(h.includes("nada é sobrescrito"));
  assert.ok(h.includes("Amostra insuficiente após as exclusões"), "recusa honesta quando a amostra encolhe demais");
  assert.ok(h.includes('"X-CSRF-Token":CSRF'), "POST de revisão leva o token");
});
