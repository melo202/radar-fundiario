/* Mecânica mínima de hábito (auditoria 19/07): métrica-norte dia_ativo, novidade
   exógena da Caixa com guarda de frescor, e idade honesta nos cards sem prazo. */
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

const imovel = (bairro, pct, extra = {}) => ({
  id: `cx-${bairro}-${pct}`, b: bairro, t: "Apartamento", p: 300000, u: "https://venda-imoveis.caixa.gov.br/x",
  descontoBairro: { disponivel: true, pctAbaixoDaMediana: pct, nOfertas: 9 }, ...extra,
});

test("novidade: prioriza bairros da carteira e ordena pelo desconto honesto", () => {
  const sel = selecionarNovidades(
    [imovel("Setor Bueno", 12), imovel("Setor Oeste", 40), imovel("Setor Bueno", 25)],
    ["setor bueno"], normalizaBairro);
  assert.equal(sel.escopo, "carteira");
  assert.deepEqual(sel.itens.map(i => i.pctAbaixoDaMediana), [25, 12], "só bairros da carteira, maior desconto primeiro");
});

test("novidade: carteira sem bairro cai para a cidade; nada com desconto = nada de card", () => {
  const cidade = selecionarNovidades([imovel("Setor Oeste", 40)], [], normalizaBairro);
  assert.equal(cidade.escopo, "cidade");
  assert.equal(selecionarNovidades([{ id: "x", b: "Setor Oeste", descontoBairro: null }], [], normalizaBairro), null,
    "sem desconto calculável (n<5 ou sem área) o imóvel não vira novidade");
  assert.equal(selecionarNovidades([imovel("Setor Oeste", -3)], [], normalizaBairro), null,
    "acima da mediana nunca é vendido como oportunidade");
});

test("novidade: no máximo 3 itens", () => {
  const sel = selecionarNovidades([10, 20, 30, 40].map(p => imovel("Setor Oeste", p)), [], normalizaBairro);
  assert.equal(sel.itens.length, 3);
});

test("novidade: guarda de frescor e resiliência estão no código do Hoje", () => {
  assert.ok(core.includes("idadeDias > 3"), "lista velha não se chama novidade");
  assert.ok(core.includes("catch { novidade = null; }"), "falha na novidade nunca derruba o Hoje");
  assert.ok(html.includes('id="todayNews"'));
  assert.ok(app.includes("Novidade do mercado"));
  assert.ok(app.includes("abaixo da mediana de"), "desconto sempre com base explícita");
  assert.ok(app.includes("Oferta anunciada, não venda fechada"), "aviso honesto obrigatório");
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
