/* Mecânica mínima de hábito (auditoria 19/07): métrica-norte dia_ativo, novidade
   exógena com guarda de frescor, e idade honesta nos cards sem prazo.
   19/07 à tarde: Caixa/leilão DESCONTINUADO por decisão do usuário — a novidade
   passa a ser mudança de preço VERIFICADA pelo radar (nunca leilão). */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { selecionarNovidades } from "../motor/os-core.js";
import { normalizaBairro } from "../motor/estatistica.js";

const core = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const adminHtml = readFileSync(new URL("../motor/painel.html", import.meta.url), "utf-8");

const mudanca = (bairro, de, para, pct, extra = {}) => ({
  bairro, tipo: "casa", area: 200, de, para, variacaoPct: pct,
  url: "https://portal/x", portal: "portal.com.br", ...extra,
});

test("novidade: prioriza bairros da carteira; queda vem antes de alta; maior variação primeiro", () => {
  const sel = selecionarNovidades(
    [mudanca("Setor Oeste", 100, 80, -20), mudanca("Setor Bueno", 500000, 520000, 4),
     mudanca("Setor Bueno", 500000, 460000, -8), mudanca("Setor Bueno", 500000, 490000, -2)],
    ["setor bueno"], normalizaBairro);
  assert.equal(sel.escopo, "carteira");
  assert.deepEqual(sel.itens.map(i => i.variacaoPct), [-8, -2, 4],
    "só bairros da carteira; quedas primeiro, maior primeiro; alta por último");
});

test("novidade: carteira sem bairro cai para a cidade; sem mudança válida = sem card", () => {
  const cidade = selecionarNovidades([mudanca("Setor Oeste", 100, 90, -10)], [], normalizaBairro);
  assert.equal(cidade.escopo, "cidade");
  assert.equal(selecionarNovidades([], ["setor bueno"], normalizaBairro), null);
  assert.equal(selecionarNovidades([mudanca("X", 0, 90, -10), mudanca("Y", 100, 100, 0)], [], normalizaBairro), null,
    "preço zerado ou inalterado nunca vira novidade");
});

test("novidade: no máximo 3 itens", () => {
  const sel = selecionarNovidades([1, 2, 3, 4].map(i => mudanca("Setor Oeste", 100 + i, 90, -i)), [], normalizaBairro);
  assert.equal(sel.itens.length, 3);
});

test("novidade: só mudança VERIFICADA e recente; falha nunca derruba o Hoje; zero leilão", () => {
  assert.ok(core.includes("(detail->>'verificada')::boolean IS TRUE"), "só o termômetro verificado (portal+id, duas coletas)");
  assert.ok(core.includes("detail->>'invalidada' IS NULL"), "invalidadas do backfill nunca voltam");
  assert.ok(core.includes("interval '7 days'"), "janela de 7 dias É a guarda de frescor");
  assert.ok(core.includes("catch { novidade = null; }"), "falha na novidade nunca derruba o Hoje");
  assert.ok(html.includes('id="todayNews"'));
  assert.ok(app.includes("Novidade do mercado"));
  assert.ok(app.includes("Mudança verificada"), "proveniência declarada no card");
  for (const arquivo of [app, html])
    for (const proibido of ["Caixa", "caixa", "leilão", "leilao"])
      assert.ok(!arquivo.includes(proibido), `linha descontinuada vazou na tela diária: ${proibido}`);
});

test("métrica-norte: dia_ativo idempotente por dia no fuso do corretor, exibido só no admin", () => {
  assert.ok(core.includes("'dia_ativo'"));
  assert.ok(core.includes("AT TIME ZONE 'America/Sao_Paulo'"), "o dia vira à meia-noite de Goiânia, não de Londres");
  assert.ok(core.includes("ON CONFLICT (organization_id,idempotency_key)"), "abrir 10 vezes no dia conta 1");
  assert.ok(panel.includes("event_type='dia_ativo'"));
  assert.ok(adminHtml.includes("renderHabito"));
  assert.ok(!html.includes("dia_ativo") && !app.includes("dia_ativo"), "métrica é do fundador; não vira gamificação na tela diária");
});

test("cards sem prazo mostram idade honesta, não data de criação disfarçada de prazo", () => {
  assert.ok(app.includes("Aberto há"));
  assert.ok(app.includes('["property_gap","intelligence"].includes(a.source)'));
});
