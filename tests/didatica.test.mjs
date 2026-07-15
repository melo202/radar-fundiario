// R4 — UX didática (rebrand): tour, dicas de primeira vez, Ferramentas e Como usar.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const guia = readFileSync(new URL("../como-usar.html", import.meta.url), "utf-8");

test("R4: onboarding ensina o mapa (zoom nos lotes) — 4 cartões e 4 pontos", () => {
  assert.ok(html.includes('{titulo:"Explore o mapa de Goiânia"'), "cartão do território existe");
  assert.ok(html.includes("os LOTES aparecem desenhados"), "ensina o zoom nos lotes");
  assert.equal((html.match(/ONB_CARDS=\[/g) || []).length, 1);
  assert.match(html, /onb-dots" aria-hidden="true"><span class="on"><\/span><span><\/span><span><\/span><span><\/span>/,
    "4 pontos acompanham os 4 cartões");
});

test("R4: dica de primeira vez — uma por recurso, nunca repete, nunca bloqueia", () => {
  assert.match(html, /function dicaUmaVez\(chave,msg\)/);
  assert.ok(html.includes('localStorage.getItem("ci_dica_"+chave)'), "só uma vez por navegador");
  assert.ok(html.includes('if(map.getZoom()>=17)dicaUmaVez("lotes"'), "dica dos lotes no zoom certo");
  assert.ok(html.includes('dicaUmaVez("dossie"'), "dica do dossiê na primeira ficha aberta");
});

test('R4: "Mais opções" virou "Ferramentas" (pedido do usuário)', () => {
  assert.ok(html.includes("<summary>Ferramentas</summary>"));
  assert.ok(!html.includes("<summary>Mais opções</summary>"));
});

test("R4: página Como usar existe, é honesta e o app aponta para ela", () => {
  assert.ok(html.includes('href="como-usar.html"'), "link no O que o Corretor Inteligente faz");
  assert.ok(guia.includes("<title>Como usar · Corretor Inteligente</title>"));
  for (const trecho of ["Busque do seu jeito", "Explore o mapa", "análise de mercado",
    "são preços de OFERTA, não transações fechadas", "O que o app não faz — de propósito",
    "© OpenStreetMap contributors"]) {
    assert.ok(guia.includes(trecho), `guia sem o trecho: ${trecho}`);
  }
  const pages = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf-8");
  assert.ok(pages.includes("como-usar.html"), "guia publicado no deploy curado");
});
