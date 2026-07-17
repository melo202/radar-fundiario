// A1-A3 (atualização contínua do acervo) — a revisita acontece PELAS varreduras
// (decisão: sem raspagem direta de portal); o motor reconhece a mudança em vez de
// deixá-la virar linha nova silenciosa. Contratos por asserção de string.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("A1: o MESMO anúncio (portal+id) com conteúdo novo detecta o delta e audita", () => {
  const ing = src("../motor/ingerir.js");
  assert.ok(ing.includes("ORDER BY l.collected_at DESC LIMIT 1"), "resgata a coleta anterior do anúncio");
  /* 17/07: identidade canônica — URL bruta comparava páginas-catálogo e inventava saltos */
  assert.ok(ing.includes("identidadeAnuncio"), "identidade extraída na ingestão");
  assert.ok(ing.includes("l.external_id=$1"), "coleta anterior ancorada no id do portal, não na URL");
  assert.ok(ing.includes("(p.quality->>'comparableGrade')::boolean IS TRUE"),
    "página-catálogo não tem 'preço anterior'");
  assert.ok(ing.includes("q.comparableGrade") && ing.includes("Number(anterior.preco) !== Number(v.askingPrice)"),
    "só compara quando as DUAS coletas passam na peneira e o preço mudou de fato");
  assert.ok(ing.includes('"mudanca-preco"') && ing.includes('"mudanca-preco-suspeita"'),
    "delta auditado; salto >50% vai para a quarentena");
  assert.ok(ing.includes("mudancasPreco"), "contagem exposta nas estatísticas da varredura");
});

test("A1b: identidade e índice de bairro expostos pelo servidor (mapa instantâneo)", () => {
  const srv = src("../motor/server.js");
  assert.ok(srv.includes("/motor/estimativa"), "estimativa imediata para o mapa");
  assert.ok(srv.includes("/motor/mercado/bairros"), "índice completo por bairro");
  const html = src("../radar-goiania.html");
  assert.ok(html.includes("estimativaImediata"), "o card de mercado busca o valor sozinho");
  assert.ok(html.includes("não são transações"), "rotulagem honesta na estimativa automática");
});

test("A2: idade da amostra é dado do resultado, exibida no card e no laudo", () => {
  const av = src("../motor/avaliacao.js");
  assert.ok(av.includes("ofertasColetadasEntre"), "período no sample");
  assert.ok(av.includes('toISOString().slice(0, 10)'));
  const html = src("../radar-goiania.html");
  assert.ok(html.includes("Ofertas coletadas entre ${fmtDataISO(r.sample.ofertasColetadasEntre.de)}"), "card declara o período");
  assert.match(html, /lmiudo">Avaliação nº[^<]*\$\{r\.sample&&r\.sample\.ofertasColetadasEntre/, "laudo declara o período");
});

test("A3: painel mostra o termômetro de mudanças, agregado e com fonte", () => {
  const p = src("../motor/painel.js");
  assert.ok(p.includes("WHERE action='mudanca-preco'"));
  const h = src("../motor/painel.html");
  assert.ok(h.includes("Mercado em movimento"));
  assert.ok(h.includes('sobe?"subiu":"baixou"'));
  assert.ok(h.includes("conta quando o MESMO anúncio (portal + id) reaparece com valor novo"),
    "estado vazio explica o mecanismo verificado");
  assert.ok(p.includes("(detail->>'verificada')::boolean IS TRUE"),
    "o termômetro só mostra mudanças verificadas");
  assert.ok(h.includes("quarentena"), "saltos suspeitos declarados, nunca escondidos");
});
