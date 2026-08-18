// FILA-01 (P1.5 do roadmap de 18/08/2026): fila do caminho frio do /motor/mercado.
// Testes funcionais com funções falsas (sem banco, sem rede) + contrato de fonte,
// no padrão do repo. Critério de aceite do roadmap: "2 buscas frias simultâneas não
// brigam pelo pool" — aqui provado com concorrência máxima observada = 1.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { criaFilaFria } from "../motor/fila-fria.js";

const dormir = ms => new Promise(r => setTimeout(r, ms));

test("fila fria: concorrência 1 — duas buscas diferentes nunca se sobrepõem", async () => {
  const fila = criaFilaFria({ maxFila: 2 });
  let emVoo = 0, maxEmVoo = 0;
  const trabalho = (nome, ms) => async () => {
    emVoo++; maxEmVoo = Math.max(maxEmVoo, emVoo);
    await dormir(ms);
    emVoo--;
    return nome;
  };
  const [a, b] = await Promise.all([
    fila.executar("setor-a|apartamento|75m2|2q", trabalho("A", 60)),
    fila.executar("setor-b|casa|100m2|3q", trabalho("B", 20)),
  ]);
  assert.deepEqual([a, b], ["A", "B"], "as duas buscas terminam e respondem");
  assert.equal(maxEmVoo, 1, "nunca duas coletas frias ao mesmo tempo");
});

test("fila fria: clique duplicado na MESMA busca divide a mesma coleta (single-flight)", async () => {
  const fila = criaFilaFria({ maxFila: 2 });
  let chamadas = 0;
  const trabalho = async () => { chamadas++; await dormir(30); return { novos: 7 }; };
  const [a, b] = await Promise.all([
    fila.executar("mesma|chave|75m2|2q", trabalho),
    fila.executar("mesma|chave|75m2|2q", trabalho),
  ]);
  assert.equal(chamadas, 1, "segundo clique na mesma pesquisa NÃO recoletou (cota salva)");
  assert.deepEqual(a, { novos: 7 });
  assert.deepEqual(b, { novos: 7 }, "os dois cliques recebem o mesmo resultado");
});

test("fila fria: do 3º pedido simultâneo em diante, 429 honesto em vez de pendurar", async () => {
  const fila = criaFilaFria({ maxFila: 2 });
  const lenta = async () => { await dormir(60); return "ok"; };
  const p1 = fila.executar("k1", lenta);
  const p2 = fila.executar("k2", lenta);
  await assert.rejects(fila.executar("k3", lenta), (e) => {
    assert.equal(e.status, 429, "429 (não 5xx): o servidor devolve a MENSAGEM abaixo de 500");
    assert.match(e.message, /ocupada/i);
    assert.match(e.message, /tente em instantes/i);
    return true;
  });
  await Promise.all([p1, p2]);
});

test("fila fria: falha de uma busca não tranca a fila nem os próximos", async () => {
  const fila = criaFilaFria({ maxFila: 2 });
  await assert.rejects(fila.executar("k1", async () => { throw new Error("buscador fora do ar"); }),
    /buscador fora do ar/);
  const depois = await fila.executar("k2", async () => "depois da falha");
  assert.equal(depois, "depois da falha");
});

test("fila fria: vaga liberada ao fim — a fila não vaza contador", async () => {
  const fila = criaFilaFria({ maxFila: 1 }); /* config extrema: ninguém espera */
  await fila.executar("k1", async () => 1);
  const outra = await fila.executar("k1", async () => 2); /* chave liberada recoleta */
  assert.equal(outra, 2, "depois de concluída, a mesma chave pode buscar de novo");
});

test("fila fria: o caminho frio do mercado passa pela fila (contrato de fonte)", () => {
  const ao = readFileSync(new URL("../motor/mercado-aovivo.js", import.meta.url), "utf-8");
  assert.ok(ao.includes('from "./fila-fria.js"'), "mercado-aovivo importa a fila");
  assert.ok(ao.includes("criaFilaFria({ maxFila: 2 })"), "1 executando + 1 esperando, no máximo");
  assert.ok(ao.includes("filaFria.executar(chave"), "a fase fria só roda dentro da fila");
  assert.match(ao, /async function coletarAoVivo\(/, "fase fria isolada em função própria");
  assert.ok(ao.includes("aqueceu entre o clique e a vez"), "re-checa frescor ao ganhar a vez");
  assert.ok(ao.includes("buscou: !!ingestao"), "aquecido durante a espera não declara 'buscou'");
  /* o motivo do 429 precisa chegar ao corretor: o servidor esconde mensagens de 5xx */
  const fj = readFileSync(new URL("../motor/fila-fria.js", import.meta.url), "utf-8");
  assert.ok(fj.includes("e.status = 429"), "429 com mensagem, não 503 genérico");
});
