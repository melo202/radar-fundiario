// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// P1.9 (24/08): estética premium — (a) modo noturno com toggle no header, (b) modo
// apresentação (tela limpa pro cliente), (c) skeleton loading. Régua do projeto:
// apresentação é CLIENTE-FACING (sem score, sem mediana, sem "quanto sobra"); dark mode
// NUNCA clareia --accent/--lot/--gold (fundos de botão/badge com texto branco).
// ATENÇÃO: arquivo é CRLF — pinar strings de UMA linha (includes), nunca com \n.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function loadDadosApresentacao() {
  // Slice POR LINHA (mesmo cuidado dos demais harnesses): marcadores vivem em comentários.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem");
  const src = html.slice(html.indexOf("\n", iStart) + 1, html.lastIndexOf("\n", iEnd));
  assert.ok(src.includes("function dadosApresentacao"), "dadosApresentacao ausente do bloco RADAR_PURE (P1.9)");
  const sandbox = { esc: (v) => (v == null ? "" : String(v)) };
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports={dadosApresentacao};", { filename: "radar-pure-p19.js" }).runInContext(sandbox);
  return sandbox.__exports.dadosApresentacao;
}

// ------------------------------------------------------------------ modo noturno -----

test("P1.9 tema: data-theme aplicado no <head>, ANTES do primeiro paint (sem flash)", () => {
  assert.ok(html.includes('localStorage.getItem("radar_tema")'), "boot do tema ausente no head");
  assert.ok(html.includes("document.documentElement.dataset.theme"), "boot não aplica data-theme");
  assert.ok(html.includes("prefers-color-scheme: dark"), "1ª visita deveria seguir o SO");
  const iScript = html.indexOf('localStorage.getItem("radar_tema")');
  const iHeadEnd = html.indexOf("</head>");
  assert.ok(iScript > -1 && iScript < iHeadEnd, "script do tema precisa estar dentro do <head> (antes do paint)");
});

test("P1.9 dark: overrides de variáveis + acento-texto clareado", () => {
  assert.ok(html.includes('[data-theme="dark"]{'), "escopo dark ausente");
  assert.ok(html.includes("--paper:#141a1f"), "dark: papel escuro ausente");
  assert.ok(html.includes("--ink:#e8e3d6"), "dark: tinta clara ausente");
  assert.ok(html.includes("--muted:#aaa189"), "dark: muted clareado ausente");
  assert.ok(html.includes("--accent-2:#5aa9c8"), "dark: accent-2 luminoso (texto) ausente");
  assert.ok(html.includes('[data-theme="dark"] .brand .eyebrow'), "dark: grupo acento-texto ausente");
  assert.ok(html.includes("[data-theme=\"dark\"] #alertasOv{--l-bg:var(--paper)"), "dark: central de alertas fora do tema");
});

test("P1.9 dark: NUNCA clareia fundos de botão/badge (--accent, --lot, --gold, --status-*)", () => {
  const i = html.indexOf('[data-theme="dark"]{');
  assert.ok(i > -1, "escopo dark ausente");
  const bloco = html.slice(i, html.indexOf("}", i));
  for (const proibida of ["--accent:", "--lot:", "--gold:", "--status-risco:", "--status-bom:", "--status-atencao:"]) {
    assert.ok(!bloco.includes(proibida), `dark redefiniu ${proibida} — quebraria contraste do texto branco em botões/badges`);
  }
});

test("P1.9 tema: botão no header antes do sino, persiste escolha, ícone sol/lua", () => {
  assert.ok(html.includes('id="btnTema"'), "botão de tema ausente");
  assert.ok(html.includes('onclick="toggleTema()"'), "botão de tema sem handler");
  assert.ok(html.indexOf('id="btnTema"') < html.indexOf('id="btnAlertas"'), "tema deveria vir antes do sino no header");
  assert.ok(html.includes('localStorage.setItem("radar_tema",novo)'), "toggleTema não persiste a escolha");
  assert.ok(html.includes('b.setAttribute("aria-pressed",novo==="dark"?"true":"false")'), "toggleTema não sincroniza aria-pressed");
  assert.ok(html.includes("#btnTema .ic-sol{display:none}"), "troca de ícone (sol) ausente");
  assert.ok(html.includes('[data-theme="dark"] #btnTema .ic-lua{display:none}'), "troca de ícone (lua) ausente");
});

// ---------------------------------------------------------- modo apresentação --------

test("P1.9 apresentação: overlay acessível + botão na ficha (2 ramos) + foco preso", () => {
  assert.ok(html.includes('id="apresOv"'), "overlay de apresentação ausente");
  assert.ok(html.includes('role="dialog" aria-modal="true" aria-label="Modo apresentação'), "apresOv sem a11y de diálogo");
  assert.ok(html.includes('id="apresBody"'), "corpo da apresentação ausente");
  assert.ok(html.includes('id="aprZap"'), "CTA WhatsApp da apresentação ausente");
  assert.ok(html.includes("function toggleApresentacao()"), "toggleApresentacao ausente");
  assert.ok(html.includes("trapFocus(ov)"), "apresentação sem focus-trap");
  const n = html.split('onclick="toggleApresentacao()"').length - 1;
  assert.ok(n >= 3, `botão "Apresentar ao cliente" deveria estar nos 2 ramos da ficha + sair (achei ${n})`);
  assert.ok(html.includes("Apresentar ao cliente — tela limpa pro celular"), "rótulo do botão ausente");
});

test("P1.9 apresentação é CLIENTE-FACING: apresRender nunca toca número interno", () => {
  const i = html.indexOf("function apresRender()");
  assert.ok(i > -1, "apresRender ausente");
  const fim = html.indexOf("/* abrirCaixaNoMapaUI", i);
  assert.ok(fim > i, "âncora de fim da apresRender ausente");
  const corpo = html.slice(i, fim);
  for (const proibido of ["quantoSobra", "SOBRA_", "scoreOp", "scoreConf", "pctAbaixoDaMediana"]) {
    assert.ok(!corpo.includes(proibido), `apresRender referencia ${proibido} — número interno NUNCA vai pra tela do cliente`);
  }
});

test("P1.9 dadosApresentacao (pura): shape, filtros do cliente, nunca lança", () => {
  const f = loadDadosApresentacao();
  // Entrada vazia: shape honesto, zero exceção
  const d0 = f();
  assert.equal(d0.tipo, "Imóvel");
  assert.ok(Array.isArray(d0.grupos) && d0.grupos.length === 0, "grupos deveria ser array vazio (vm cross-realm: nunca deepEqual)");
  assert.equal(d0.faixaTxt, null);
  // Grupo "atencao" NÃO vai pro cliente; sem nome NÃO aparece; teto de 3 por grupo; dist arredonda
  const d = f({
    tipoImovel: "Apartamento", endereco: "Rua T-25, 100", bairro: "Setor Bueno",
    faixaTxt: "R$ 800 mil – R$ 950 mil", urbanoLinha: "Zona AA — dá pra construir prédio",
    pois: { grupos: {
      pharmacy: { rotulo: "Farmácias", sinal: "positivo", itens: [
        { nome: "Drogasil", dist: 235.4 }, { nome: "Droga Raia", dist: 290 },
        { nome: "Pague Menos", dist: 299 }, { nome: "Extra", dist: 400 },
        { nome: null, dist: 100 }] },
      fuel: { rotulo: "Postos", sinal: "atencao", itens: [{ nome: "Posto BR", dist: 150 }] }
    } }
  });
  assert.equal(d.grupos.length, 1, "grupo de atenção vazou pra tela do cliente");
  assert.equal(d.grupos[0].rotulo, "Farmácias");
  assert.equal(d.grupos[0].itens.length, 3, "teto de 3 nomes por grupo");
  assert.equal(d.grupos[0].itens[0].dist, 235, "distância deveria arredondar");
  assert.ok(d.grupos[0].itens.every((x) => x.nome), "item sem nome vazou pro cliente");
});

test("P1.9 dadosApresentacao: texto é string SIMPLES (nunca HTML — o render escapa)", () => {
  const f = loadDadosApresentacao();
  const inj = '<img src=x onerror=alert(1)>';
  const d = f({ tipoImovel: inj, pois: { grupos: { bakery: { rotulo: inj, sinal: "positivo", itens: [{ nome: inj, dist: 10 }] } } } });
  assert.equal(d.tipo, inj, "tipo deveria passar como string simples");
  assert.equal(d.grupos[0].rotulo, inj);
  assert.equal(d.grupos[0].itens[0].nome, inj);
  // E o render usa esc() em tudo:
  const i = html.indexOf("function apresRender()");
  const corpo = html.slice(i, html.indexOf("/* abrirCaixaNoMapaUI", i));
  assert.ok(corpo.includes("esc(d.tipo)") && corpo.includes("esc(end)") && corpo.includes("esc(it.nome)"), "apresRender sem esc() em campo cliente-facing");
});

// ------------------------------------------------------------------ skeleton ---------

test("P1.9 skeleton: shimmer com kill-switch de movimento + wiring no fetch de POIs", () => {
  assert.ok(html.includes(".skel{"), "classe .skel ausente");
  assert.ok(html.includes("@keyframes skelvarre"), "animação do shimmer ausente");
  assert.ok(html.includes(".skel::after{animation:none}"), "skeleton sem respeito a prefers-reduced-motion");
  assert.ok(html.includes('sk.id="dLocalPois"'), "skeleton não ligado ao fetch de estabelecimentos");
});
