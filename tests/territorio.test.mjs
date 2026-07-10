// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Fase 15 (15-01, TERR-01/03): cobre (1) as 8 funções puras de estatística de território,
// carregadas do bloco RADAR_PURE via node:vm (slice por linha, mesmo padrão de
// tests/scores.test.mjs), e (2) territorioScan/territorioScanRun/fetchWhereRestrito, carregados
// do bloco novo TERR_NET com jsonp/sanitiza/capCache/toast STUBADOS no sandbox (rede real nunca
// entra em `node --test`).
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

const TF = FIXTURES.TERR_FIX;

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // ATENÇÃO (mesmo cuidado de scores.test.mjs): slice POR LINHA, não por indexOf cru — os
  // marcadores vivem dentro de comentários; fatiar no meio da linha quebra o vm.Script.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  assert.ok(src.includes("function pm2Lote"), "pm2Lote ausente do bloco RADAR_PURE (dependencia da Task 1 nao cumprida)");
  assert.ok(src.includes("function quantilAmostra"), "quantilAmostra ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function breaksQuantil"), "breaksQuantil ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function binQuantil"), "binQuantil ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function anoMedianoCadastro"), "anoMedianoCadastro ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function mixUso"), "mixUso ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function estatTerritorio"), "estatTerritorio ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function rotuloAmostra"), "rotuloAmostra ausente do bloco RADAR_PURE");
  assert.ok(src.includes("function scoresDePlot"), "scoresDePlot ausente do bloco RADAR_PURE (fix CR-01 13-REVIEW.md)");
  assert.ok(src.includes("function legendaFaixas"), "legendaFaixas ausente do bloco RADAR_PURE (F5 TERR-01)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {pm2Lote,quantilAmostra,breaksQuantil,binQuantil,anoMedianoCadastro,mixUso,estatTerritorio,rotuloAmostra,scoresDePlot,legendaFaixas,TERR_BIN_SLOTS};",
    { filename: "radar-pure-territorio.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();

test("pm2Lote: guarda estabelecida — areaedif se edificado, senão areaterr; 0/ausente nunca é dado real", () => {
  for (const fx of TF.pm2Lote) {
    assert.equal(P.pm2Lote(fx.a), fx.out, `pm2Lote(${JSON.stringify(fx.a)}) deveria ser ${fx.out}`);
  }
});

test("quantilAmostra: interpolação linear entre vizinhos (mesma fórmula de quant())", () => {
  for (const fx of TF.quantilAmostra) {
    assert.equal(P.quantilAmostra(fx.sorted, fx.p), fx.out);
  }
});

test("breaksQuantil: 4 cortes crescentes para amostra >=5; null para amostra curta (<5)", () => {
  const breaks = P.breaksQuantil(TF.breaksQuantilCasos.amostraOk);
  assert.equal(breaks.length, 4, "breaksQuantil deveria devolver exatamente 4 cortes internos");
  for (let i = 1; i < breaks.length; i++) {
    assert.ok(breaks[i] > breaks[i - 1], "os cortes devem ser estritamente crescentes");
  }
  assert.equal(P.breaksQuantil(TF.breaksQuantilCasos.amostraCurta), null, "amostra <5 não sustenta 5 faixas -> null");
});

test("binQuantil: monotônico 1..5, mínimo do setor -> 1, máximo -> 5, cobre bordas exatas", () => {
  const breaks = TF.binQuantilCasos.breaks;
  assert.equal(P.binQuantil(breaks, 0), 1, "abaixo do 1º corte -> faixa 1");
  assert.equal(P.binQuantil(breaks, 200), 1, "borda exata do 1º corte -> faixa 1 (inclusive)");
  assert.equal(P.binQuantil(breaks, 400), 2, "borda exata do 2º corte -> faixa 2 (inclusive)");
  assert.equal(P.binQuantil(breaks, 600), 3);
  assert.equal(P.binQuantil(breaks, 800), 4, "borda exata do último corte -> faixa 4 (inclusive)");
  assert.equal(P.binQuantil(breaks, 999999), 5, "acima do último corte -> faixa 5 (máximo do setor)");
  assert.equal(P.binQuantil(null, 500), null, "sem breaks (amostra curta) -> null, nunca inventa faixa");
});

// F5 TERR-01: quantis degenerados — dedupe de cortes + faixas efetivas + legenda honesta.
test("breaksQuantil (F5 TERR-01): cortes degenerados são deduplicados — todos iguais -> [], 9 iguais + outlier -> [50]", () => {
  const D = TF.breaksQuantilDegenerados;
  assert.deepEqual(JSON.parse(JSON.stringify(P.breaksQuantil(D.todosIguais.sorted))), D.todosIguais.expectBreaks, "amostra uniforme -> nenhum corte (1 faixa única)");
  assert.deepEqual(JSON.parse(JSON.stringify(P.breaksQuantil(D.noveIguaisOutlier.sorted))), D.noveIguaisOutlier.expectBreaks, "9 iguais + outlier -> 1 corte (2 faixas), nunca 4 cortes repetidos");
  assert.deepEqual(JSON.parse(JSON.stringify(P.breaksQuantil(D.seteUnsUmCem.sorted))), D.seteUnsUmCem.expectBreaks);
});

test("binQuantil (F5 TERR-01): breaks deduplicados mapeiam para slots ESPALHADOS da paleta — uniforme -> slot 3; 2 faixas -> slots 1/5", () => {
  assert.equal(P.binQuantil([], 50), 3, "amostra uniforme (0 cortes) -> slot central 3, todos os lotes na mesma cor");
  assert.equal(P.binQuantil([50], 50), 1, "2 faixas: <=corte -> slot 1 (barato)");
  assert.equal(P.binQuantil([50], 200), 5, "2 faixas: >corte -> slot 5 (caro) — contraste máximo, nunca faixa vazia no meio");
  assert.equal(P.binQuantil([50, 80], 60), 3, "3 faixas: meio -> slot 3");
});

test("legendaFaixas (F5 TERR-01): legenda encolhe junto com as faixas efetivas — nunca 'R$X–R$X'; slots batem com binQuantil", () => {
  assert.equal(P.legendaFaixas(null), null, "sem breaks (amostra curta) -> null (estado vazio '—')");
  const uniforme = JSON.parse(JSON.stringify(P.legendaFaixas([], 50)));
  assert.equal(uniforme.length, 1, "amostra uniforme -> 1 faixa única, nunca 5 faixas 'R$50–R$50'");
  assert.equal(uniforme[0].slot, 3, "faixa única usa o MESMO slot 3 que binQuantil pinta");
  assert.ok(uniforme[0].label.includes("uniforme"), "rótulo honesto cita o valor uniforme");
  const duas = JSON.parse(JSON.stringify(P.legendaFaixas([50], 50)));
  assert.deepEqual(duas, [{ slot: 1, label: "≤ R$ 50" }, { slot: 5, label: "≥ R$ 50" }], "2 faixas efetivas -> 2 rótulos, slots 1/5 (mesmos de binQuantil)");
  const cinco = JSON.parse(JSON.stringify(P.legendaFaixas([200, 400, 600, 800], 500)));
  assert.equal(cinco.length, 5, "4 cortes distintos (caso normal) -> 5 faixas, contrato original intacto");
  assert.deepEqual(cinco.map((f) => f.slot), [1, 2, 3, 4, 5]);
  assert.equal(cinco[0].label, "≤ R$ 200");
  assert.equal(cinco[2].label, "R$ 400–R$ 600");
  assert.equal(cinco[4].label, "≥ R$ 800");
  // nenhum rótulo degenerado "X–X" jamais sai de legendaFaixas
  for (const f of [...uniforme, ...duas, ...cinco]) {
    assert.ok(!/R\$ (\S+)–R\$ \1$/.test(f.label), `rótulo degenerado "${f.label}" nunca deveria aparecer`);
  }
});

test("anoMedianoCadastro: filtra dtinclusao inválido/sentinela/ausente ANTES da mediana", () => {
  const c1 = TF.anoMedianoCadastroCasos.mistoValidoInvalido;
  assert.equal(P.anoMedianoCadastro(c1.lotes), c1.expectAno);
  const c2 = TF.anoMedianoCadastroCasos.todosInvalidos;
  assert.equal(P.anoMedianoCadastro(c2.lotes), c2.expectAno, "nenhum dtinclusao válido -> null, nunca 0/NaN");
});

test("mixUso: com >3 usos presentes, top-3 por % + 'Outros' somando o resto", () => {
  // Round-trip via JSON: mixUso roda no realm do vm sandbox (loadPureBlock) — os arrays/objetos
  // que ele devolve NÃO são reference-equal aos arrays literais deste arquivo mesmo com conteúdo
  // idêntico (assert.deepStrictEqual cross-realm). Normaliza para o realm principal antes do assert.
  const c1 = TF.mixUsoCasos.maisDe3Usos;
  const mix1 = JSON.parse(JSON.stringify(P.mixUso(c1.lotes)));
  assert.equal(mix1.length, 4, "top-3 + 1 linha 'Outros'");
  assert.deepEqual(mix1.slice(0, 3).map((m) => m.label), c1.expectTopLabels);
  assert.equal(mix1[3].label, "Outros");
  assert.ok(Math.abs(mix1[3].pct - c1.expectOutrosPct) < 1e-9, "pct de 'Outros' deveria somar o resto exato");

  const c2 = TF.mixUsoCasos.ate3Usos;
  const mix2 = JSON.parse(JSON.stringify(P.mixUso(c2.lotes)));
  assert.equal(mix2.length, 3, "com exatamente 3 categorias presentes, NUNCA adiciona 'Outros'");
  assert.deepEqual(mix2.map((m) => m.label), c2.expectLabels);
  assert.ok(!mix2.some((m) => m.label === "Outros"));

  assert.deepEqual(JSON.parse(JSON.stringify(P.mixUso(TF.mixUsoCasos.vazio.lotes))), [], "amostra vazia -> array vazio, nunca lança");
});

test("estatTerritorio: agrega n/total/medianaPm2/q1Pm2/q3Pm2/iptuMediano/anoMediano/mix/breaks coerentes", () => {
  const c = TF.estatTerritorioCasos.amostraPequena;
  const r = P.estatTerritorio(c.lotes, c.total);
  assert.equal(r.n, c.expect.n);
  assert.equal(r.total, c.expect.total, "total é o número REAL do setor, nunca confundido com n (amostra)");
  assert.equal(r.medianaPm2, c.expect.medianaPm2);
  assert.equal(r.q1Pm2, c.expect.q1Pm2);
  assert.equal(r.q3Pm2, c.expect.q3Pm2);
  assert.equal(r.iptuMediano, c.expect.iptuMediano);
  assert.equal(r.anoMediano, c.expect.anoMediano);
  assert.equal(r.breaks, c.expect.breaks, "amostra <5 pm2 válidos -> breaks null");
  assert.ok(Array.isArray(r.mix));
});

test("rotuloAmostra: 'Amostra de {N} de {M} lotes' — nunca omitido, mesmo com amostra completa", () => {
  for (const fx of TF.rotuloAmostraCasos) {
    assert.equal(P.rotuloAmostra(fx.n, fx.total), fx.out);
  }
});

// --- scoresDePlot (Fase 13, fix CR-01 13-REVIEW.md) --------------------------------------------
// Score "de plot" p/ colorir o pino no fluxo ficha-FECHADA, SEM rede — reusa a amostra do
// território já em memória. Contrato: 1 entrada por ci; barato -> score alto (bom); caro -> baixo
// (risco); sem pm2 -> op null; amostra <3 -> {} (nunca inventa cor).
test("scoresDePlot: colore por ci contra a mediana do setor (barato=alto, caro=baixo, sem pm2=null); amostra <3 -> {} (nunca inventa)", () => {
  const c = TF.scoresDePlotCasos;
  const mapa = P.scoresDePlot(c.lotesParaColorir, c.scanOk);
  assert.ok(mapa.barato && mapa.barato.score >= 66, `lote barato (pm2 < mediana) -> score alto/bom, obteve ${JSON.stringify(mapa.barato)}`);
  assert.ok(mapa.caro && mapa.caro.score < 33, `lote caro (pm2 > mediana) -> score baixo/risco, obteve ${JSON.stringify(mapa.caro)}`);
  assert.equal(mapa.semdado, null, "lote sem pm2 válido -> op null (nunca inventa cor)");
  // amostra curta (n<3) não sustenta referência estatística -> {} mesmo com lotes válidos.
  // (checa por Object.keys — deepEqual falha entre realms do node:vm; ver nota de mixUso acima)
  assert.equal(Object.keys(P.scoresDePlot(c.lotesParaColorir, c.scanCurto)).length, 0, "amostra <3 -> {} (honestidade)");
  // entradas ausentes nunca lançam
  assert.equal(Object.keys(P.scoresDePlot(null, c.scanOk)).length, 0, "lotes null -> {} sem lançar");
  assert.equal(Object.keys(P.scoresDePlot(c.lotesParaColorir, null)).length, 0, "scan null -> {} sem lançar");
});

// --- territorioScan / territorioScanRun / fetchWhereRestrito (bloco TERR_NET, 15-02) -----------
// jsonp/sanitiza/capCache/toast são STUBADOS no sandbox — nenhuma requisição real de rede entra
// em `node --test`. O contrato testado aqui é o de dedupe/orçamento/fallback (rede real é
// verificação AO VIVO manual, fora deste harness — ver 15-RESEARCH.md Sampling Rate).

function loadNetBlock(stubs) {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  const iStart = html.indexOf("TERR_NET_START");
  const iEnd = html.indexOf("TERR_NET_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores TERR_NET ausentes ou fora de ordem em radar-goiania.html (dependencia da Task 2 nao cumprida)");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  assert.ok(src.includes("function territorioScan("), "territorioScan ausente do bloco TERR_NET");
  assert.ok(src.includes("TERRCACHE"), "TERRCACHE ausente do bloco TERR_NET");
  assert.ok(src.includes("fetchWhereRestrito"), "fetchWhereRestrito ausente do bloco TERR_NET");
  const sandbox = {
    jsonp: stubs.jsonp,
    sanitiza: stubs.sanitiza || ((arr) => arr),
    capCache:
      stubs.capCache ||
      ((o, max) => {
        const k = Object.keys(o);
        if (k.length > max) delete o[k[0]];
      }),
    toast: stubs.toast || (() => {}),
  };
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {territorioScan,territorioScanRun,fetchWhereRestrito,TERRCACHE,TERR_FIELDS};",
    { filename: "terr-net.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

test("territorioScan: dedupe de chamada em voo — 2 chamadas concorrentes disparam UMA varredura", async () => {
  let jsonpCalls = 0;
  const jsonpStub = async (params) => {
    jsonpCalls++;
    if (params.returnCountOnly === "true") return { count: 5 };
    return { features: [{ attributes: { vlvenal: 100000, areaedif: 50 } }] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const [r1, r2] = await Promise.all([NET.territorioScan(16), NET.territorioScan(16)]);
  assert.equal(r1, r2, "2a chamada concorrente reusa a MESMA promise em voo (mesma referência de resultado)");
  assert.equal(jsonpCalls, 2, "dedupe: jsonp chamado o mesmo nº de vezes que UMA única varredura (1 página + 1 count)");
});

test("territorioScan: orçamento HARD — no máximo 3 chamadas paginadas + 1 returnCountOnly por scan", async () => {
  let pageCalls = 0,
    countCalls = 0;
  const jsonpStub = async (params) => {
    if (params.returnCountOnly === "true") {
      countCalls++;
      return { count: 999999 };
    }
    pageCalls++;
    // setor grande: sempre devolve página CHEIA de 2000 -> força o loop a bater no orçamento
    const fs = Array.from({ length: 2000 }, () => ({ attributes: { vlvenal: 100000, areaedif: 50 } }));
    return { features: fs };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const r = await NET.territorioScan(77);
  assert.ok(pageCalls <= 3, `no máximo 3 chamadas paginadas por scan (orçamento HARD), obteve ${pageCalls}`);
  assert.equal(countCalls, 1, "no máximo 1 chamada returnCountOnly por scan");
  assert.equal(r.paginas, 3, "contador de páginas expõe exatamente o orçamento gasto");
});

test("territorioScan: fallback automático outFields restrito -> * quando a 1ª página devolve d.error", async () => {
  let restritoCalls = 0,
    fallbackCalls = 0,
    sanitizaCalls = 0;
  const jsonpStub = async (params) => {
    if (params.returnCountOnly === "true") return { count: 1 };
    if (params.outFields !== "*") {
      restritoCalls++;
      return { error: { code: 400, message: "outFields rejeitado" } };
    }
    fallbackCalls++;
    return { features: [{ attributes: { vlvenal: 100000, areaedif: 50 } }] };
  };
  const NET = loadNetBlock({
    jsonp: jsonpStub,
    sanitiza: (arr) => {
      sanitizaCalls++;
      return arr;
    },
  });
  const r = await NET.territorioScan(20);
  assert.equal(restritoCalls, 1, "1ª página restrita tentada 1x antes do fallback");
  assert.ok(fallbackCalls >= 1, "reiniciou automaticamente com outFields=* após o erro");
  assert.ok(sanitizaCalls >= 1, "resultado passou por sanitiza() mesmo no caminho de fallback (defesa em profundidade LGPD)");
  assert.equal(r.lotes.length, 1);
});

test("territorioScan: falha na 2ª página restrita não dobra o orçamento — total paginado (restrito+fallback) nunca excede 3 (WR-02 15-REVIEW.md)", async () => {
  let restritoCalls = 0,
    fallbackCalls = 0,
    totalPageCalls = 0;
  const pagCheia = () => ({ features: Array.from({ length: 2000 }, () => ({ attributes: { vlvenal: 100000, areaedif: 50 } })) });
  const jsonpStub = async (params) => {
    if (params.returnCountOnly === "true") return { count: 999999 };
    totalPageCalls++;
    if (params.outFields !== "*") {
      restritoCalls++;
      // 1ª página restrita: sucesso, página CHEIA (força o loop a seguir para a 2ª página);
      // 2ª página restrita: falha (d.error) — cenário NÃO coberto pelo teste de falha imediata acima.
      return restritoCalls === 1 ? pagCheia() : { error: { code: 400, message: "outFields rejeitado" } };
    }
    fallbackCalls++;
    // fallback também devolveria páginas CHEIAS até o próprio orçamento (3) se não fosse
    // compartilhado com o que a tentativa restrita já gastou — sem o guard compartilhado, o
    // total (restrito+fallback) chegaria a 5 páginas, dobrando o orçamento HARD documentado.
    return pagCheia();
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const r = await NET.territorioScan(55);
  assert.ok(totalPageCalls <= 3, `total de páginas entre restrito+fallback nunca deve exceder 3 (orçamento HARD), obteve ${totalPageCalls}`);
  assert.equal(restritoCalls, 2, "1ª página restrita ok, 2ª falha e dispara o fallback");
  assert.ok(fallbackCalls >= 1, "fallback disparado após a falha na 2ª página");
  assert.equal(r.paginas, totalPageCalls, "contador de páginas expõe o orçamento TOTAL gasto (restrito+fallback), não só o do fallback");
});

test("territorioScan (F5 TERR-02): página que REJEITA (erro de rede, sem d.error) também é debitada — restrito+fallback nunca excedem 3 tentativas reais", async () => {
  let totalPageCalls = 0,
    fallbackCalls = 0;
  const pagCheia = () => ({ features: Array.from({ length: 2000 }, () => ({ attributes: { vlvenal: 100000, areaedif: 50 } })) });
  const jsonpStub = async (params) => {
    if (params.returnCountOnly === "true") return { count: 999999 };
    totalPageCalls++;
    if (params.outFields !== "*") {
      // páginas 1-2 restritas OK (cheias); 3ª REJEITA como exceção de rede (jsonp rejeitado,
      // NUNCA d.error) — o caminho que antes escapava do débito do orçamento e dava ao fallback
      // "*" uma 4ª requisição real (TERR-02, provado no relatório 05).
      if (totalPageCalls < 3) return pagCheia();
      throw new Error("timeout de rede");
    }
    fallbackCalls++;
    return pagCheia();
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const r = await NET.territorioScan(88);
  assert.ok(totalPageCalls <= 3, `o teto HARD de 3 vale sob QUALQUER falha — tentativas reais (incl. rejeitadas) = ${totalPageCalls}`);
  assert.equal(fallbackCalls, 0, "orçamento esgotado na tentativa restrita -> o fallback * não ganha requisição extra");
  assert.equal(r.paginas, 3, "contador de páginas reflete TENTATIVAS de rede, não só respostas");
});

test("territorioScan: coerção numérica de cdbairro — nunca injeta string crua no WHERE", async () => {
  let capturedWhere = null;
  const jsonpStub = async (params) => {
    if (params.returnCountOnly === "true") return { count: 0 };
    capturedWhere = params.where;
    return { features: [] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  await NET.territorioScan("16");
  assert.equal(capturedWhere, "cdbairro=16 AND vlvenal>0", "WHERE usa o número coagido, nunca a string crua");

  await assert.rejects(
    () => NET.territorioScan("16; DROP"),
    /cdbairro inválido/,
    "entrada não-numérica (NaN após +cdbairro) deveria abortar, nunca interpolar no WHERE"
  );
});
