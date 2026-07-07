// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — NÃO duplica a implementação
// aqui; testa exatamente as mesmas funções usadas em runtime pelo app (Fase 9, 09-01:
// scoreOportunidade/scoreConfianca/leituraPratica). Arquivo independente de tests/busca.test.mjs
// (mesmo padrão de loader replicado localmente), seguindo o padrão já usado em
// tests/detectmode.test.mjs.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // ATENÇÃO (plan-check, verificado ao vivo): slice POR LINHA, não por indexOf cru.
  // (a) indexOf retorna o INÍCIO do match — sem offset, o literal do marcador entra no
  //     código fatiado; (b) os marcadores vivem dentro de comentários (// ...), então
  //     fatiar no meio da linha deixa conteúdo indesejado e o vm.Script dá SyntaxError.
  // Fatiar do início da LINHA SEGUINTE ao marcador de start até o início da linha do end.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html (dependencia da Task 1 nao cumprida)");
  const start = html.indexOf("\n", iStart) + 1; // linha apos o marcador de inicio
  const end = html.lastIndexOf("\n", iEnd); // linha antes do marcador de fim
  const src = html.slice(start, end);
  assert.ok(src.includes("function scoreOportunidade"), "scoreOportunidade ausente do bloco RADAR_PURE (dependencia da Task 1 nao cumprida)");
  assert.ok(src.includes("function scoreConfianca"), "scoreConfianca ausente do bloco RADAR_PURE (dependencia da Task 1 nao cumprida)");
  assert.ok(src.includes("function leituraPratica"), "leituraPratica ausente do bloco RADAR_PURE (dependencia da Task 1 nao cumprida)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {scoreOportunidade,scoreConfianca,leituraPratica};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

test("scoreOportunidade", () => {
  for (const fx of FIXTURES.scoreOportunidade) {
    const result = P.scoreOportunidade(fx.myPm2, fx.stats, fx.flags);
    const label = `scoreOportunidade(myPm2=${JSON.stringify(fx.myPm2)}, stats=${JSON.stringify(fx.stats)})`;
    if (fx.expectNull) {
      assert.equal(result, null, `${label} deveria retornar null (sem base para inventar numero)`);
    } else {
      assert.ok(result, `${label} deveria retornar um objeto {score,rotulo,porque}`);
      assert.ok(
        result.score >= fx.expectRange[0] && result.score <= fx.expectRange[1],
        `${label}.score=${result.score} deveria estar no intervalo ${JSON.stringify(fx.expectRange)}`
      );
      assert.equal(result.rotulo, fx.expectRotulo, `${label}.rotulo`);
    }
  }
});

test("scoreConfianca", () => {
  for (const fx of FIXTURES.scoreConfianca) {
    const result = P.scoreConfianca(fx.inputs);
    const label = `scoreConfianca(${JSON.stringify(fx.inputs)})`;
    assert.equal(result.nivel, fx.expectNivel, `${label}.nivel`);
    if (fx.expectPorqueContains) {
      assert.ok(
        result.porque.join(" ").includes(fx.expectPorqueContains),
        `${label}.porque=${JSON.stringify(result.porque)} deveria conter "${fx.expectPorqueContains}"`
      );
    }
  }
});

test("leituraPratica", () => {
  for (const fx of FIXTURES.leituraPratica) {
    const result = P.leituraPratica(fx.inputs);
    const label = `leituraPratica(${JSON.stringify(fx.inputs)})`;
    if (fx.expectExact) {
      assert.equal(result, fx.expectExact, `${label} deveria retornar exatamente o fallback esperado`);
    }
    if (fx.expectContains) {
      assert.ok(result.includes(fx.expectContains), `${label}="${result}" deveria conter "${fx.expectContains}"`);
    }
    if (fx.expectNotContains) {
      for (const termo of fx.expectNotContains) {
        assert.ok(
          !result.toLowerCase().includes(termo.toLowerCase()),
          `${label}="${result}" NAO deveria conter jargao "${termo}"`
        );
      }
    }
  }
});
