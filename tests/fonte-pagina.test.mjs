// FONTE-PAGINA (19/08/2026) — a leitura educada de páginas de anúncio. Testa as
// funções puras (robots, HTML→texto) sem rede e, com fetch falso, o comportamento
// de buscarPagina nos três cenários que NUNCA podem mudar: robots proíbe → nem tenta;
// anti-bot/4xx → desiste na hora; 200 HTML → texto limpo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRobots, robotsPermite, htmlParaTexto, tituloDaPagina, buscarPagina, UA }
  from "../motor/fonte-pagina.js";

const ROBOTS = `# comentário
User-agent: *
Disallow: /admin/
Disallow: /busca
Allow: /busca/imovel/
Sitemap: https://portal.com.br/sitemap.xml
Sitemap: https://portal.com.br/sitemap-imoveis.xml.gz
User-agent: Googlebot
Disallow: /privado/
`;

test("parseRobots: regras do grupo * + sitemaps, ignorando grupos de outros bots", () => {
  const { regras, sitemaps } = parseRobots(ROBOTS);
  assert.equal(sitemaps.length, 2, "dois sitemaps");
  assert.deepEqual(regras.map(r => `${r.allow ? "A" : "D"}:${r.path}`),
    ["D:/admin/", "D:/busca", "A:/busca/imovel/"]);
});

test("robotsPermite: prefixo mais longo vence; empate = allow; sem regra = permitido", () => {
  assert.equal(robotsPermite(ROBOTS, "/admin/painel"), false, "disallow direto");
  assert.equal(robotsPermite(ROBOTS, "/busca"), false, "disallow exato");
  assert.equal(robotsPermite(ROBOTS, "/busca/imovel/apto-123"), true, "allow mais específico vence");
  assert.equal(robotsPermite(ROBOTS, "/imovel/apto-goiania"), true, "sem regra = permitido");
  assert.equal(robotsPermite("", "/qualquer"), true, "robots vazio = permitido");
  assert.equal(robotsPermite(ROBOTS, "/privado/x"), true, "regra do Googlebot NÃO nos prende");
});

test("htmlParaTexto: some script/style, quebra bloco, decodifica entidades, colapsa espaço", () => {
  const html = `<html><head><style>.a{color:red}</style><script>track()</script></head>
    <body><h1>Apartamento 2 quartos</h1><p>R$ 420.000 &middot; Setor&nbsp;Marista</p>
    <p>72&nbsp;m&#178; &mdash; Goi&#226;nia</p><!-- lixo --></body></html>`;
  const t = htmlParaTexto(html);
  assert.ok(!/track|color/.test(t), "script e style fora");
  assert.ok(/Apartamento 2 quartos\nR\$ 420\.000/.test(t), "blocos viram linhas");
  assert.ok(t.includes("Setor Marista"), "nbsp vira espaço");
  assert.ok(t.includes("Goiânia"), "entidade numérica decodifica");
});

test("tituloDaPagina: <title> limpo e limitado", () => {
  assert.equal(tituloDaPagina("<title>  Apto — Goiânia | Portal </title><p>x</p>"), "Apto — Goiânia | Portal");
  assert.equal(tituloDaPagina("<p>sem título</p>"), "");
});

test("buscarPagina: robots proibindo = NEM TENTA a página (régua travada)", async () => {
  const chamadas = [];
  const fetchFalso = async (url) => {
    chamadas.push(url);
    return { ok: true, status: 200, headers: new Map([["content-type", "text/plain"]]),
      text: async () => "User-agent: *\nDisallow: /" };
  };
  const r = await buscarPagina("https://portal-falso.com.br/imovel/x", { fetchImpl: fetchFalso });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "robots");
  assert.equal(chamadas.length, 1, "só o robots.txt foi buscado — a página, nunca");
});

test("buscarPagina: 403/429 (anti-bot) = desiste, sem retry, sem evasão", async () => {
  let n = 0;
  const fetchFalso = async (url) => {
    n++;
    if (url.endsWith("/robots.txt")) return { ok: true, status: 200, text: async () => "" };
    return { ok: false, status: 403, headers: new Map() };
  };
  const r = await buscarPagina("https://portal-bloqueado.example/imovel/x", { fetchImpl: fetchFalso });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "http-403");
  assert.equal(n, 2, "robots + 1 tentativa — jamais martelar");
});

test("RÉGUA PEGADA: o módulo não contém nenhuma forma de evasão de bot", () => {
  const src = readFileSync(new URL("../motor/fonte-pagina.js", import.meta.url), "utf-8");
  for (const proibido of ["puppeteer", "playwright", "proxy", "solveCaptcha", "undetected",
    "stealth", "2captcha", "anticaptcha", "headless"])
    assert.ok(!src.toLowerCase().includes(proibido.toLowerCase()),
      `achou "${proibido}" — a régua proíbe evasão de anti-bot`);
  assert.ok(UA.includes("RadarFundiario"), "UA identificável, nunca disfarçado");
});
