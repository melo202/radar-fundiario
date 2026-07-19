/* Cidade inteira (19/07/2026): a varredura cobre os 715 bairros do cadastro por uma
   janela de rotação determinística — sem estado em banco, idempotente a re-execuções,
   dentro da cota Brave (fixos + lote ≈ 40 buscas/noite ≈ 1.200/mês). */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAIRROS_PADRAO, janelaRotacao, listaCidade } from "../motor/varredura.js";

const src = readFileSync(new URL("../motor/varredura.js", import.meta.url), "utf-8");
const deploy = readFileSync(new URL("../motor/deploy-api.sh", import.meta.url), "utf-8");

test("lista da cidade: bairros do cadastro normalizados, sem duplicata de consulta", () => {
  const lista = listaCidade();
  /* 715 nomes brutos viram ~684 consultas únicas após normalizar (caixa/acento) —
     duplicata na rotação seria busca desperdiçada da cota Brave */
  assert.ok(lista.length >= 650, `esperava ~684 bairros únicos, veio ${lista.length}`);
  assert.equal(new Set(lista).size, lista.length, "sem duplicatas");
  assert.ok(lista.includes("setor bueno"));
  assert.ok(lista.every(b => b === b.toLowerCase() && !/[À-ÿ]/.test(b)), "consulta sem maiúscula e sem acento");
});

test("rotação: determinística por dia, sem repetir os fixos, com wrap-around", () => {
  const lista = listaCidade();
  const a = janelaRotacao(lista, 100, 20);
  const b = janelaRotacao(lista, 100, 20);
  assert.deepEqual(a, b, "o mesmo dia produz sempre a mesma janela (re-execução idempotente)");
  assert.equal(a.length, 20);
  const fixos = new Set(BAIRROS_PADRAO);
  assert.ok(a.every(x => !fixos.has(x)), "janela nunca duplica os fixos da noite");
  const resto = lista.filter(x => !fixos.has(x));
  const ultimaJanela = janelaRotacao(lista, Math.floor(resto.length / 20), 20);
  assert.equal(ultimaJanela.length, 20, "wrap-around: a janela nunca encolhe no fim da lista");
});

test("rotação: a união das janelas de um ciclo cobre TODOS os bairros não-fixos", () => {
  const lista = listaCidade();
  const fixos = new Set(BAIRROS_PADRAO);
  const resto = lista.filter(x => !fixos.has(x));
  const noites = Math.ceil(resto.length / 20);
  const vistos = new Set();
  for (let d = 0; d < noites; d++) janelaRotacao(lista, d, 20).forEach(b => vistos.add(b));
  assert.equal(vistos.size, resto.length, "nenhum bairro fica de fora do ciclo");
});

test("varrer: aceita tipo explícito (backfill) e monta a noite com fixos + rotação", () => {
  assert.ok(src.includes('tipo = tipo || ((dia % 2 === 0) ? "apartamento" : "casa")'));
  assert.ok(src.includes("VARREDURA_LOTE_ROTACAO"), "lote da rotação ajustável por env, sem redeploy");
  assert.ok(src.includes("[...BAIRROS_PADRAO, ...janelaRotacao(listaCidade(), diaIndex, lote)]"));
  assert.ok(deploy.includes("node --check varredura.js"), "deploy valida a varredura");
});
