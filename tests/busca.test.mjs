// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Carrega o bloco RADAR_PURE de radar-goiania.html via node:vm — NÃO duplica a implementação
// aqui; testa exatamente as mesmas funções usadas em runtime pelo app.
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
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {clean,norm,ruaCore,likeTerm,isGarage,matchApto,matchScoreQ,matchScoreL,matchScoreRua};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

test("norm", () => {
  for (const { in: input, out } of FIXTURES.norm) {
    assert.equal(P.norm(input), out, `norm(${JSON.stringify(input)})`);
  }
});

test("ruaCore", () => {
  for (const { in: input, out } of FIXTURES.ruaCore) {
    assert.equal(P.ruaCore(input), out, `ruaCore(${JSON.stringify(input)})`);
  }
});

test("matchApto", () => {
  for (const { incompl, q, out } of FIXTURES.matchApto) {
    assert.equal(P.matchApto({ incompl }, q), out, `matchApto(incompl=${JSON.stringify(incompl)}, q=${JSON.stringify(q)})`);
  }
});

test("matchScoreQ", () => {
  for (const { nq, qU, out } of FIXTURES.matchScoreQ) {
    assert.equal(P.matchScoreQ(nq, qU), out, `matchScoreQ(nq=${JSON.stringify(nq)}, qU=${JSON.stringify(qU)})`);
  }
});

test("matchScoreL", () => {
  for (const { nl, lU, out } of FIXTURES.matchScoreL) {
    assert.equal(P.matchScoreL(nl, lU), out, `matchScoreL(nl=${JSON.stringify(nl)}, lU=${JSON.stringify(lU)})`);
  }
});

test("matchScoreRua", () => {
  for (const { log, rCore, rD, out } of FIXTURES.matchScoreRua) {
    assert.equal(P.matchScoreRua(log, rCore, rD), out, `matchScoreRua(log=${JSON.stringify(log)}, rCore=${JSON.stringify(rCore)}, rD=${JSON.stringify(rD)})`);
  }
});

test("insc — deteccao de campo por tamanho", () => {
  for (const fx of FIXTURES.insc) {
    const digits = fx.raw.replace(/\D/g, "");
    if ("len" in fx) {
      assert.equal(digits.length, fx.len, `digitos de ${JSON.stringify(fx.raw)}`);
      if (fx.field === "ci") assert.ok(digits.length <= 10, `${fx.raw} deveria ter <=10 digitos para campo ci`);
      if (fx.field === "nrinscr") assert.ok(digits.length > 10, `${fx.raw} deveria ter >10 digitos para campo nrinscr`);
    }
    if (fx.isAmbiguous) {
      // "135" isolado: só dígitos, sem sinalizador de contexto (tipo de via / token de quadra)
      assert.equal(digits, fx.digitsOnly, `digitsOnly de ${JSON.stringify(fx.raw)}`);
      assert.ok(!/[A-Z]/i.test(fx.raw.replace(/\d/g, "")) || fx.raw === fx.digitsOnly, `raw ambiguo nao deveria ter letras alem dos digitos: ${fx.raw}`);
    }
    if (fx.hasStreetType) {
      // "Rua 135": ruaCore remove o tipo de via, sinalizando contexto de endereço
      assert.notEqual(P.ruaCore(fx.raw), fx.raw, `ruaCore deveria remover o tipo de via de ${JSON.stringify(fx.raw)}`);
    }
    if (fx.hasQuadraToken) {
      // "Q135": prefixo textual de quadra, distinto do numero puro
      assert.ok(/^Q\d/i.test(fx.raw), `${fx.raw} deveria ter o token de quadra "Q" antes do numero`);
    }
  }
});
