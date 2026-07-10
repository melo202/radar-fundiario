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
  assert.ok(src.includes("function statusDeUnidade"), "statusDeUnidade ausente do bloco RADAR_PURE (Fase 13, 13-01)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {scoreOportunidade,scoreConfianca,leituraPratica,statusDeUnidade};",
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

// --- F5 Onda 3 (FICHA-03 / FICHA-06) --------------------------------------------------------

test("scoreOportunidade (F5 FICHA-03): imóvel exatamente na mediana — porquê diz 'Na mediana', nunca 'Está 0% abaixo'", () => {
  const r = P.scoreOportunidade(100, { q1: 80, med: 100, q3: 120, n: 10, min: 60, max: 140 });
  assert.ok(r, "deveria calcular (base completa)");
  assert.equal(r.rotulo, "Oportunidade média");
  const why = r.porque.join(" ");
  assert.ok(why.includes("Na mediana"), `porque="${why}" deveria dizer "Na mediana" (paridade com renderComps)`);
  assert.ok(!why.includes("0%"), `porque="${why}" NAO deveria conter "0%"`);
});

test("scoreOportunidade (F5 FICHA-06): âncoras fora de ordem (med>q3, busca binária inexata) são reordenadas defensivamente", () => {
  const desordenado = P.scoreOportunidade(110, { q1: 80, med: 130, q3: 120, n: 400, min: 60, max: 150 });
  const ordenado = P.scoreOportunidade(110, { q1: 80, med: 120, q3: 130, n: 400, min: 60, max: 150 });
  assert.deepEqual(desordenado, ordenado, "âncoras {80,130,120} devem produzir o MESMO resultado de {80,120,130}");
  assert.ok(desordenado.score >= 0 && desordenado.score <= 100, "score deve permanecer no intervalo 0-100");
});

// --- statusDeUnidade (Fase 13, 13-01, VIS-01/PIN-01) ---------------------------------------
// Mapeia score (ou {op:{score}}) -> 'bom'|'atencao'|'risco'|'semdado' usando as MESMAS bandas
// 66/33 de scoreOportunidade — nunca reimplementa os limiares, nunca lanca excecao, nunca
// retorna 'caixa' (essa distincao e decidida pelo CALLER, fora desta funcao).

test("statusDeUnidade: bandas 66/33 idênticas a scoreOportunidade, formas {op:{score}} e número direto, entradas ausentes/malformadas sempre 'semdado', nunca lança exceção", () => {
  for (const caso of FIXTURES.statusDeUnidadeCasos) {
    let result;
    assert.doesNotThrow(() => {
      result = P.statusDeUnidade(caso.input);
    }, `statusDeUnidade(${JSON.stringify(caso.input)}) nunca deveria lançar exceção`);
    assert.equal(
      result,
      caso.esperado,
      `statusDeUnidade(${JSON.stringify(caso.input)}) deveria ser "${caso.esperado}", obteve: ${result}`
    );
  }
});

test("statusDeUnidade: nunca retorna 'caixa' (distinção decidida pelo CALLER, fora desta função)", () => {
  for (const caso of FIXTURES.statusDeUnidadeCasos) {
    const result = P.statusDeUnidade(caso.input);
    assert.notEqual(result, "caixa", `statusDeUnidade(${JSON.stringify(caso.input)}) nunca deveria retornar "caixa"`);
  }
});
