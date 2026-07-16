// SV-1/SV-2 — status da venda para o CLIENTE: página pública por token, sem PII.
// Testa as partes PURAS de motor/vendas.js (o pool do pg não conecta no import).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ETAPAS_VENDA, novoToken, tokenValido, validaApelido,
  mensagemEtapa, paginaAcompanheHTML, paginaNaoEncontradaHTML,
} from "../motor/vendas.js";

const venda = (etapas) => ({
  token: "abc123DEF456ghi7", apelido: "Apto Bueno 302", corretor: "Bruno Melo · CRECI 12345",
  etapas: ETAPAS_VENDA.map((e, i) => ({ id: e.id, em: etapas > i ? "2026-07-16" : null, obs: i === 0 && etapas > 0 ? "Sinal recebido" : "" })),
});

test("SV-1: fluxo real de Goiânia — 5 etapas fixas, do acordo ao registro", () => {
  assert.equal(ETAPAS_VENDA.length, 5);
  assert.equal(ETAPAS_VENDA[0].id, "proposta");
  assert.equal(ETAPAS_VENDA[4].id, "registro");
  /* didática determinística por etapa — o cliente entende o que está acontecendo */
  assert.ok(ETAPAS_VENDA.every(e => e.didatica && e.didatica.length > 20));
  assert.ok(ETAPAS_VENDA[4].didatica.includes("Registro de Imóveis"), "só o registro transfere a propriedade");
});

test("SV-1: token aleatório é a única chave — 96 bits, formato estrito", () => {
  const t = novoToken();
  assert.ok(tokenValido(t), t);
  assert.equal(t.length, 16);
  assert.ok(!tokenValido("abc"), "curto demais");
  assert.ok(!tokenValido("abc123DEF456ghi7X"), "longo demais");
  assert.ok(!tokenValido("abc123DEF456ghi%"), "só base64url");
  assert.notEqual(novoToken(), novoToken(), "aleatório");
});

test("SV-1: guarda anti-PII no apelido — e-mail e telefone não passam", () => {
  assert.ok(validaApelido("Apto Bueno 302").apelido);
  assert.ok(validaApelido("ab").erro, "curto demais");
  assert.ok(validaApelido("Casa do joao@gmail.com").erro, "e-mail barrado");
  assert.ok(validaApelido("Apto 62999990000").erro, "telefone barrado");
});

test("SV-2: mensagem de WhatsApp é ATIVA (o corretor copia) e sempre leva o link", () => {
  const m0 = mensagemEtapa(venda(0));
  assert.ok(m0.includes("rastreio de encomenda") && m0.includes("/acompanhe/abc123DEF456ghi7"));
  const m2 = mensagemEtapa(venda(2));
  assert.ok(m2.includes("Documentação e certidões") && m2.includes("16/07/2026"));
  assert.ok(m2.includes("Próxima etapa: ITBI pago"));
  const m5 = mensagemEtapa(venda(5));
  assert.ok(m5.includes("parabéns"), "conclusão celebrada");
});

test("SV-1: página do cliente — progresso, didática, marca e promessa de zero dado pessoal", () => {
  const h = paginaAcompanheHTML(venda(2));
  assert.ok(h.includes("Apto Bueno 302") && h.includes("2 de 5 etapas"));
  assert.ok(h.includes('content="noindex,nofollow"'), "página fora dos buscadores");
  assert.ok(h.includes("Sinal recebido"), "observação do corretor substitui a didática da etapa");
  assert.ok(h.includes("em andamento"), "etapa atual destacada");
  assert.ok(h.includes("Esta página não guarda nenhum dado pessoal seu."));
  assert.ok(h.includes("Bruno Melo · CRECI 12345"), "o corretor assina o acompanhamento");
  const h5 = paginaAcompanheHTML(venda(5));
  assert.ok(h5.includes("o imóvel é oficialmente seu"), "conclusão celebrada na página");
});

test("SV-1: apelido malicioso sai escapado no HTML da página", () => {
  const v = venda(1); v.apelido = '<script>alert(1)</script>';
  const h = paginaAcompanheHTML(v);
  assert.ok(!h.includes("<script>alert"), "tag nunca crua");
  assert.ok(h.includes("&lt;script&gt;"), "escapada");
});

test("SV-1: 404 amigável para link inexistente", () => {
  assert.ok(paginaNaoEncontradaHTML().includes("não existe mais"));
});
