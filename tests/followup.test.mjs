// FU-1 — Interessados/follow-up LOCAL-FIRST (vocabulário garimpado do ImobRadar).
// Contratos por asserção de string, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("FU-1: card Interessados vive na Diligência e o vocabulário é o do ImobRadar", () => {
  assert.ok(html.includes('id="dLeads"'));
  assert.ok(html.includes("Interessados — follow-up"));
  /* pipeline + temperatura + follow-up tipado + objeções tipificadas */
  assert.ok(html.includes('["visita-marcada","Visita marcada"]'));
  assert.ok(html.includes('["quente","🔥 Quente"]'));
  assert.ok(html.includes('["cobrar-proposta","Cobrar resposta da proposta"]'));
  assert.ok(html.includes('["documentacao","documentação"]'), "objeções tipificadas (por que não fechou)");
});

test("FU-1: PII fica SÓ no navegador — nenhum lead viaja ao servidor", () => {
  assert.ok(html.includes('localStorage.getItem("ci_leads")'));
  assert.ok(html.includes("Dados guardados só neste navegador (como o caderno) — nada vai ao servidor."));
  /* nenhum fetch envolve leads */
  assert.ok(!/fetch\([^)]*lead/i.test(html), "nenhuma chamada de rede com leads");
  assert.ok(html.includes('onclick="leadsBackup()"'), "backup exportável em JSON");
});

test("FU-1: follow-up vencido cobra na abertura do app e no card", () => {
  assert.match(html, /function avisoFollowups\(\)/);
  assert.ok(html.includes("initOnboard();avisoFollowups();"), "aviso ligado no boot");
  assert.ok(html.includes("follow-up(s) vencendo — abra o imóvel"));
  assert.ok(html.includes("o interessado esfria sem retorno"), "urgência com linguagem de corretor");
  assert.match(html, /fuVencido=l=>l\.followup&&l\.followup\.em&&l\.followup\.em<=hojeISO\(\)/);
});

test("FU-1: nunca texto do usuário em onclick (lição A-04) — tudo por delegação/data-*", () => {
  assert.ok(!/onclick="[^"]*\$\{esc\(l\./.test(html), "nome/nota nunca interpolados em handler");
  assert.ok(html.includes('data-acao="excluir"'));
  assert.ok(html.includes('card.dataset.id'), "ações resolvem o lead pelo data-id");
  /* WhatsApp com mensagem contextual e telefone só-dígitos */
  assert.ok(html.includes('https://wa.me/55${esc(tel)}?text='));
});

test("FU-1: showDetail reseta o card para o imóvel aberto", () => {
  assert.ok(html.includes("leadsReset(a); /* FU-1"));
  assert.match(html, /function leadsReset\(a\)[\s\S]{0,200}clean\(a\.nrinscr\)\|\|clean\(a\.ci\)/);
});
