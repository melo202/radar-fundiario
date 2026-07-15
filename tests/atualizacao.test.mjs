// A1-A3 (atualização contínua do acervo) — a revisita acontece PELAS varreduras
// (decisão: sem raspagem direta de portal); o motor reconhece a mudança em vez de
// deixá-la virar linha nova silenciosa. Contratos por asserção de string.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("A1: mesma URL com conteúdo novo detecta o delta de preço e audita", () => {
  const ing = src("../motor/ingerir.js");
  assert.ok(ing.includes("ORDER BY l.collected_at DESC LIMIT 1"), "resgata a coleta anterior da URL");
  assert.ok(ing.includes("'mudanca-preco'"), "delta auditado");
  assert.ok(ing.includes("Number(anterior.preco) !== Number(v.askingPrice)"), "só quando o preço mudou de fato");
  assert.ok(ing.includes("mudancasPreco"), "contagem exposta nas estatísticas da varredura");
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
  assert.ok(h.includes("as varreduras noturnas capturam quando o mesmo anúncio reaparece com valor novo"),
    "estado vazio explica o mecanismo");
});
