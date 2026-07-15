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

test("capa Cidade Viva: SÓ na primeira visita, emenda no tour e respeita deep-link", () => {
  assert.ok(html.includes('id="capaViva"'), "capa existe");
  assert.ok(html.includes('localStorage.getItem("ci_capa")'), "uma vez por navegador");
  assert.ok(html.includes('localStorage.setItem("ci_capa","1")'), "fechar grava a marca");
  assert.match(html, /capaFechar[\s\S]{0,400}initOnboard\(\); \/\* a capa apresenta; o tour ensina/,
    "Começar fecha a capa e abre o tour");
  assert.ok(html.includes('if(CAPA_ON)return; /* capa Cidade Viva na frente'), "tour espera a capa");
  assert.match(html, /function capaVivaInit\(\)[\s\S]{0,300}\.get\("insc"\)\)return; \/\* deep-link vai direto à ficha/,
    "deep-link vai direto à ficha");
  assert.match(html, /prefers-reduced-motion: reduce\)"\)\.matches\)\s*\n?\s*cidadeViva\(document\.getElementById\("capaCeu"\)/,
    "reduced-motion sem animação na capa");
  /* splash Cidade Viva em TODA carga — a linha andando nunca some da entrada */
  assert.ok(html.includes('cidadeViva(cv,()=>document.body.contains(s)&&!s.classList.contains("off"),5000)'),
    "splash anima em toda carga e morre com o splash");
  assert.match(html, /function cidadeViva\(cv,vivo,periodoMs\)/, "animação é compartilhada capa+splash");
  assert.ok(html.includes("com fonte e limites declarados"), "a capa já apresenta o contrato de honestidade");
});

test("R6: compartilhar tem cara de produto (Open Graph) e o primeiro paint aperta a mão cedo", () => {
  assert.ok(html.includes('property="og:title" content="Corretor Inteligente · Goiânia"'));
  assert.ok(html.includes('property="og:image" content="https://corretorinteligente.tech/marca/og-corretorinteligente.jpg"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  /* a arte existe de verdade no repo (gerada via Higgsfield, 15/07/2026) */
  const og = readFileSync(new URL("../marca/og-corretorinteligente.jpg", import.meta.url));
  assert.ok(og.length > 20000, "og-image presente e com peso plausível");
  for (const host of ["https://cdnjs.cloudflare.com", "https://a.basemaps.cartocdn.com", "https://api.corretorinteligente.tech"]) {
    assert.ok(html.includes(`<link rel="preconnect" href="${host}"`), `preconnect ausente: ${host}`);
  }
});

test("R5: nenhuma sombra ou anel de foco ficou no verde antigo (resíduo fora dos tokens)", () => {
  assert.ok(!html.includes("rgba(24,81,62"), "sombra/foco do verde Atlas antigo");
  assert.ok(!html.includes("rgba(20,35,29"), "sombra do ink antigo");
});

test("MOB-01: controles do Leaflet nunca flutuam por cima das sheets (X de fechar clicável)", () => {
  /* print do usuário (15/07): o +/− do mapa (z 1000 padrão) cobria o X do dossiê no celular */
  assert.ok(html.includes(".leaflet-control-container .leaflet-top,.leaflet-control-container .leaflet-bottom{z-index:450}"));
  assert.match(html, /\.detail\{[^}]*z-index:500/, "sheets seguem acima (500) dos controles (450)");
});

test("MOB-02: capa hidden ESCONDE de verdade e o canvas não captura toque", () => {
  /* bug latente achado ao caçar o X: #capaViva{display:grid} vencia o [hidden] do
     navegador e a capa continuava capturando todo toque na 2ª visita */
  assert.ok(html.includes("#capaViva[hidden]{display:none!important}"));
  assert.ok(html.includes("#capaCeu{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}"));
  assert.ok(html.includes("#bootCeu{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}"));
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
