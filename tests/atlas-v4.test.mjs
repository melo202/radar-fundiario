import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf8");

test("V4: tokens de espaço, fonte, semântica e easing existem no :root Atlas", () => {
  for (const token of [
    "--space-1:4px", "--space-2:8px", "--space-3:12px", "--space-4:16px",
    "--space-5:24px", "--space-6:32px", "--space-7:40px",
    "--warning:#9a5524", "--warning-soft:#fff0e5",
    "--danger:#a83b38", "--danger-soft:#fcebea",
    "--ease-out:cubic-bezier",
  ]) {
    assert.ok(html.includes(token), `token ausente: ${token}`);
  }
  /* famílias do app (Archivo/JetBrains), não as do protótipo — decisão do V0 */
  assert.match(html, /--font-ui:"Archivo"/);
  assert.match(html, /--font-code:"JetBrains Mono"/);
  assert.match(html, /body\{[^}]*font-family:var\(--font-ui\)/);
});

test("V4: transições não usam mais durações cruas fora da janela 160-240ms", () => {
  const css = html.slice(0, html.indexOf("</style>"));
  const cruas = css.match(/transition:[^;}]*\.\d+s/g) || [];
  assert.deepEqual(cruas, [], `transições com duração crua: ${cruas.join(" | ")}`);
});

test("V4: kill-switch de prefers-reduced-motion permanece", () => {
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.ok(html.includes("animation-duration:0.001ms !important") || html.includes("animation-duration: 0.001ms !important"));
});

test("V4: overlay de loading e skeleton seguem a direção Atlas", () => {
  assert.match(html, /\.loading\{background:color-mix\(in srgb,var\(--canvas\)/);
  assert.match(html, /\.loading span\{font:[^}]*var\(--font-ui\)/);
  assert.match(html, /\.skel-card\{[^}]*border-radius:var\(--radius-md\)/);
});

test("V4: shell expõe estado global de conexão (chip + banner)", () => {
  assert.match(html, /id="atlasSource" role="status"/);
  assert.match(html, /id="netBanner" role="status" hidden/);
  assert.ok(html.includes("Você está offline — as consultas ao cadastro e o mapa precisam de internet."));
  assert.match(html, /function atualizaConexao\(\)[\s\S]*classList\.toggle\("offline",off\)/);
  assert.match(html, /window\.addEventListener\("offline",atualizaConexao\)/);
  assert.match(html, /\.atlas-source\.offline\{color:var\(--danger\)/);
  assert.match(html, /\.net-banner\{[^}]*background:var\(--danger-soft\)/);
});

test("V1 (fechamento): camadas territoriais leem a paleta viva do shell", () => {
  assert.match(html, /const mapTok=\(n,fb\)=>\(_MAPTOK\.getPropertyValue\(n\)\.trim\(\)\|\|fb\)/);
  assert.match(html, /const LOT_STYLE=\{pane:"lots",color:MAP_BRAND/);
  assert.match(html, /const TERR_GOLD=MAP_BRASS/);
  /* petróleo saiu das layers; risco (#c0392b) permanece desacoplado; zonas oficiais intactas */
  for (const antigo of ['"#1d5a73"', '"#3d8fb0"', '"#2c5545"', '"#a8842c"', '"#141a1f"', '"#57503f"']) {
    const usos = (html.match(new RegExp(antigo, "g")) || []).length;
    assert.equal(usos, 0, `hex da paleta antiga ainda em uso literal: ${antigo}`);
  }
  assert.match(html, /risco:\s*\{fillColor:"#c0392b"/);
  assert.match(html, /--zone-aa:#ffaa00/);
});

test("V4: banner offline não promete o que o SW não entrega", () => {
  /* consultas e tiles são sempre-rede no sw.js — o texto do banner precisa dizer isso
     sem sugerir que a busca funciona offline */
  assert.ok(html.includes("O que já foi aberto continua disponível."));
  assert.ok(!html.includes("modo offline completo"));
});
