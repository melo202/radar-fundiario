// Item 15 — filtros rápidos da Carteira: determinísticos, com contagem e critério
// EXPLICADO (nunca julgamento opaco). Contratos por asserção de string.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const js = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const core = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");

test("CARTEIRA: os 8 filtros do plano existem, com contagem por filtro", () => {
  for (const f of ['"todos"', '"prospeccao"', '"captados"', '"divulgacao"', '"interessados"', '"pendencias"', '"parados"', '"desfecho"'])
    assert.ok(js.includes(f), `filtro ${f} sumiu`);
  assert.ok(js.includes("${rotulo} (${n})"), "cada filtro mostra quantos imóveis tem");
});

test("CARTEIRA: 'parado' tem definição PÚBLICA e determinística — nunca julgamento opaco", () => {
  assert.ok(js.includes("const PARADO_DIAS=14"));
  assert.ok(js.includes("sem interessado aberto e sem movimento há mais de"), "o critério é explicado no estado vazio");
  assert.match(js, /parados[\s\S]{0,200}!\["sold","rented"\]\.includes/, "vendido/alugado nunca conta como parado");
  assert.ok(core.includes("p.updated_at,c.name AS owner_name"), "a carteira devolve updated_at para o cálculo");
});

test("CARTEIRA: filtro vazio explica o critério em vez de tela morta", () => {
  assert.ok(js.includes('empty(alvo,rows.length?"Nada neste filtro":"Sua carteira ainda está vazia",vazio)'));
  assert.ok(js.includes("avance o estágio no dossiê quando a autorização sair"), "vazio ensina o próximo passo");
});
