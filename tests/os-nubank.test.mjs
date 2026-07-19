/* Correção Nubank (19/07/2026, AUDITORIA-PLANO-2026-07-19.md): a tela diária é uma
   central de trabalho ação-primeiro — a resposta "o que eu faço agora" vem antes de
   assistente, guia e contadores; modelos e estrutura administrativa ficam invisíveis. */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const core = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const adminHtml = readFileSync(new URL("../motor/painel.html", import.meta.url), "utf-8");
const manifest = JSON.parse(readFileSync(new URL("../motor/os.webmanifest", import.meta.url), "utf-8"));

test("home ação-primeiro: a lista do dia vem antes do assistente, do guia e dos contadores", () => {
  const acoes = html.indexOf('id="todayActions"');
  assert.ok(acoes > 0);
  assert.ok(acoes < html.indexOf("command-center"), "assistente vem depois da lista do dia");
  assert.ok(acoes < html.indexOf('id="guideCard"'), "guia vem depois da lista do dia");
  assert.ok(acoes < html.indexOf('id="todayCounts"'), "contadores vêm depois da lista do dia");
  assert.ok(!html.includes("count-grid"), "contadores são uma linha de texto tocável, não um grid de cards");
  assert.ok(app.includes("is-headline"), "a ação nº 1 é manchete destacada");
  assert.ok(app.includes("Ver todas ("), "o resto da lista fica sob demanda");
});

test("tela diária sem estrutura administrativa: melhorias moram no painel admin", () => {
  assert.ok(!html.includes("improvementSection"));
  assert.ok(!app.includes("/painel/api/os/melhorias"), "o Hoje não chama a API de melhorias");
  assert.ok(adminHtml.includes('id="melhorias"'));
  assert.ok(adminHtml.includes("/painel/api/os/melhorias"));
});

test("modelos e pipeline invisíveis: sem Kimi/lote/contagem de evidências na cara do corretor", () => {
  for (const arquivo of [html, app]) {
    assert.ok(!arquivo.includes("Kimi"), "nome de modelo nunca aparece na superfície do corretor");
    assert.ok(!arquivo.includes("Analisando lote"), "'lote' colide com lote de terreno");
  }
  assert.ok(app.includes("Analisando — esta tela atualiza sozinha."));
  assert.ok(app.includes("Ver detalhes da investigação"), "cobertura existe, mas sob demanda");
});

test("dossiê: dados do imóvel vêm antes do radar", () => {
  const dados = app.indexOf('text:"Dados do imóvel"');
  const radar = app.indexOf("intelligencePanel(d));");
  assert.ok(dados > 0 && radar > 0 && dados < radar, "o radar apoia a decisão, não abre a página");
});

test("cobrança do Hoje abre direto o interessado: payload traz o imóvel e o front foca o card", () => {
  assert.ok(core.includes("o.inventory_property_id,c.name AS contact_name"));
  assert.ok(core.includes("propertyId: o.inventory_property_id || null"));
  assert.ok(app.includes('a.propertyId)action.addEventListener("click",()=>openProperty(a.propertyId,{tab:"comercial",oppId:a.entityId}))'));
  assert.ok(app.includes("data-opp-id"));
  assert.ok(app.includes("focusOpp"));
});

test("o Hoje nunca termina em silêncio: 5ª fonte server-side sugere reaquecer imóvel parado", () => {
  assert.ok(core.includes("stale_property"));
  assert.ok(core.includes("interval '14 days'"), "mesma definição pública de 'parado' do filtro da Carteira");
  assert.ok(core.includes("NOT EXISTS (SELECT 1 FROM opportunities"));
  assert.ok(app.includes("Carteira parada"));
});

test("o Hoje de ontem não sobrevive à aba reaberta", () => {
  assert.ok(app.includes("visibilitychange"));
  assert.ok(app.includes("todayLoadedAt"));
});

test("PWA do escritório: manifest próprio, público, apontando para /painel/os", () => {
  assert.equal(manifest.start_url, "/painel/os");
  assert.equal(manifest.scope, "/painel/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.short_name && manifest.short_name !== "Radar", "identidade distinta do PWA do Mapa");
  assert.ok(html.includes('rel="manifest" href="/painel/os.webmanifest"'));
  assert.ok(html.includes('rel="apple-touch-icon"'), "iOS ignora manifest para o ícone");
  /* a rota do manifest precisa vir ANTES do gate de sessão: o fetch do <link rel=manifest>
     não envia cookies — atrás do gate, o prompt de instalação nunca apareceria */
  const rota = panel.indexOf('req.url === "/painel/os.webmanifest"');
  const gate = panel.indexOf("daqui para baixo, tudo exige sessão válida");
  assert.ok(rota > 0 && gate > 0 && rota < gate, "manifest é servido antes da exigência de sessão");
  assert.ok(!html.includes("serviceWorker"), "sem service worker novo — instalabilidade não exige mais SW");
});

test("guia é de primeiro uso: nasce oculto e some sozinho quando os passos foram cumpridos", () => {
  assert.ok(/id="guideCard" hidden/.test(html), "sem flash do guia antes do updateGuide");
  assert.ok(app.includes("const concluiu="), "auto-esconde por conclusão, não só pelo ×");
});
