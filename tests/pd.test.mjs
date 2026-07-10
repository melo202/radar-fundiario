// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// Fase 18 (18-01, PD-01/02/04): núcleo de dados urbanísticos do Plano Diretor 2022 (LC 349/2022).
// Carrega (1) o bloco RADAR_PURE via node:vm (slice por linha, mesmo padrão de
// tests/territorio.test.mjs/tests/scores.test.mjs) para as funções puras (PD_TABELA_CA,
// pdRegrasDaZona, potencialConstrutivo, criterioDetectorPD, resolverZonaUI), e (2) o bloco novo
// PD_NET (jsonp stubado — rede real NUNCA entra em `node --test`) para pdConsultarLote/PDCACHE.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";

function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  // ATENÇÃO (mesmo cuidado dos demais harnesses): slice POR LINHA, nunca indexOf cru — os
  // marcadores vivem dentro de comentários; fatiar no meio da linha quebra o vm.Script.
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem em radar-goiania.html");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  assert.ok(src.includes("const PD_TABELA_CA"), "PD_TABELA_CA ausente do bloco RADAR_PURE (Task 1)");
  assert.ok(src.includes("const PD_LAYERS"), "PD_LAYERS ausente do bloco RADAR_PURE (Task 1)");
  assert.ok(src.includes("const PD_DISCLAIMER"), "PD_DISCLAIMER ausente do bloco RADAR_PURE (Task 1)");
  assert.ok(src.includes("const PD_MZC_BASICO"), "PD_MZC_BASICO ausente do bloco RADAR_PURE (Task 1)");
  assert.ok(src.includes("function pdRegrasDaZona"), "pdRegrasDaZona ausente do bloco RADAR_PURE (Task 1)");
  assert.ok(src.includes("function potencialConstrutivo"), "potencialConstrutivo ausente do bloco RADAR_PURE (Task 2)");
  assert.ok(src.includes("function criterioDetectorPD"), "criterioDetectorPD ausente do bloco RADAR_PURE (Task 2)");
  assert.ok(src.includes("function resolverZonaUI"), "resolverZonaUI ausente do bloco RADAR_PURE (Task 3)");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {PD_TABELA_CA,PD_LAYERS,PD_DISCLAIMER,PD_MZC_BASICO,pdRegrasDaZona,potencialConstrutivo,criterioDetectorPD,resolverZonaUI};",
    { filename: "radar-pure-pd.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPureBlock();
const PF = FIXTURES.PD_FIX;

// --- Task 1: PD_TABELA_CA / PD_LAYERS / PD_DISCLAIMER / PD_MZC_BASICO / pdRegrasDaZona --------

test("pdRegrasDaZona('AA') retorna entrada conferida com ca_basico 1.0 e ca_maximo 6.0", () => {
  const r = P.pdRegrasDaZona("AA");
  assert.equal(r.conferido, true);
  assert.equal(r.ca_basico, 1.0);
  assert.equal(r.ca_maximo, 6.0);
});

test("pdRegrasDaZona('ADD').ca_maximo===5.0 e conferido===true", () => {
  const r = P.pdRegrasDaZona("ADD");
  assert.equal(r.ca_maximo, 5.0);
  assert.equal(r.conferido, true);
});

test("APAC e AEIS permanecem conferido===false (numéricos não localizados na fonte primária)", () => {
  assert.equal(P.pdRegrasDaZona("APAC").conferido, false);
  assert.equal(P.pdRegrasDaZona("AEIS").conferido, false);
});

test("AA/ADD têm usos_conferido===true e usos==='qualquer uso' (Art. 196 I/II conferido no RESEARCH)", () => {
  assert.equal(P.pdRegrasDaZona("AA").usos_conferido, true);
  assert.equal(P.pdRegrasDaZona("AA").usos, "qualquer uso");
  assert.equal(P.pdRegrasDaZona("ADD").usos_conferido, true);
  assert.equal(P.pdRegrasDaZona("ADD").usos, "qualquer uso");
});

test("AA/ADD têm nota_altura não-vazia citando 'Art. 190' (regime de ocupação 100%/50%)", () => {
  const aa = P.pdRegrasDaZona("AA");
  const add = P.pdRegrasDaZona("ADD");
  assert.ok(typeof aa.nota_altura === "string" && aa.nota_altura.length > 0);
  assert.ok(aa.nota_altura.includes("11 m") || aa.nota_altura.includes("Art. 190"), "nota_altura da AA deveria referenciar o regime de ocupação");
  assert.ok(typeof add.nota_altura === "string" && add.nota_altura.length > 0);
});

test("Toda sigla com usos_conferido===false mantém o default false (REGRA DE OURO estendida a usos)", () => {
  for (const sigla of Object.keys(P.PD_TABELA_CA)) {
    if (sigla === "_meta") continue;
    const r = P.PD_TABELA_CA[sigla];
    if (r.usos_conferido !== true) assert.equal(r.usos_conferido, false, `${sigla}.usos_conferido deveria ser false por padrão`);
  }
});

test("PD_TABELA_CA._meta existe com checado_em e emendas_verificadas (auto-auditoria de staleness)", () => {
  const meta = P.PD_TABELA_CA._meta;
  assert.ok(meta, "_meta ausente de PD_TABELA_CA");
  assert.ok(typeof meta.checado_em === "string" && meta.checado_em.length > 0);
  assert.ok(Array.isArray(meta.emendas_verificadas) && meta.emendas_verificadas.length > 0);
});

test("PD_MZC_BASICO: ca_basico 1.0, ca_maximo null, conferido true, fonte cita Art. 242 (CA básico universal)", () => {
  assert.equal(P.PD_MZC_BASICO.ca_basico, 1.0);
  assert.equal(P.PD_MZC_BASICO.ca_maximo, null);
  assert.equal(P.PD_MZC_BASICO.conferido, true);
  assert.ok(P.PD_MZC_BASICO.fonte.includes("Art. 242"));
});

test("pdRegrasDaZona('XYZ') (sigla desconhecida) retorna null, nunca lança", () => {
  assert.equal(P.pdRegrasDaZona("XYZ"), null);
  assert.equal(P.pdRegrasDaZona(null), null);
  assert.equal(P.pdRegrasDaZona(undefined), null);
});

test("Guarda de integridade: toda sigla conferido===true tem fonte não-vazia sem a palavra 'Anexo'", () => {
  for (const sigla of Object.keys(P.PD_TABELA_CA)) {
    if (sigla === "_meta") continue;
    const r = P.PD_TABELA_CA[sigla];
    if (r.conferido === true) {
      assert.ok(typeof r.fonte === "string" && r.fonte.length > 0, `${sigla}.fonte deveria ser string não-vazia`);
      assert.ok(!r.fonte.includes("Anexo"), `${sigla}.fonte NUNCA deveria citar 'Anexo' (números de CA vivem nos Artigos)`);
    }
  }
  assert.ok(!P.PD_MZC_BASICO.fonte.includes("Anexo"));
});

test("Guarda REGRA DE OURO na origem: nenhuma sigla conferido===false tem ca_basico/ca_maximo numérico", () => {
  for (const sigla of Object.keys(P.PD_TABELA_CA)) {
    if (sigla === "_meta") continue;
    const r = P.PD_TABELA_CA[sigla];
    if (r.conferido === false) {
      assert.equal(r.ca_basico, null, `${sigla}.ca_basico deveria ser null (conferido:false)`);
      assert.equal(r.ca_maximo, null, `${sigla}.ca_maximo deveria ser null (conferido:false)`);
    }
  }
});

// --- Task 2: potencialConstrutivo + criterioDetectorPD (REGRA DE OURO + fallback gracioso) -----

test("potencialConstrutivo(600,'AA') === 600*1.0 (usa ca_basico conferido)", () => {
  assert.equal(P.potencialConstrutivo(600, "AA"), 600);
});

test("potencialConstrutivo(600,'APAC') === null (conferido:false — REGRA DE OURO)", () => {
  assert.equal(P.potencialConstrutivo(600, "APAC"), null);
});

test("potencialConstrutivo: sigla desconhecida ou terreno ausente/zero -> null", () => {
  assert.equal(P.potencialConstrutivo(600, "XYZ"), null);
  assert.equal(P.potencialConstrutivo(0, "AA"), null);
  assert.equal(P.potencialConstrutivo(null, "AA"), null);
});

test("criterioDetectorPD(300,600,600) -> {razao:0.5, criterio:'pd'} quando potencialPD>0", () => {
  const r = P.criterioDetectorPD(300, 600, 600);
  assert.equal(r.razao, 0.5);
  assert.equal(r.criterio, "pd");
});

test("criterioDetectorPD(300,600,null) -> fallback {razao:0.5, criterio:'terreno'} rotulado, nunca quebra", () => {
  const r = P.criterioDetectorPD(300, 600, null);
  assert.equal(r.razao, 0.5);
  assert.equal(r.criterio, "terreno");
});

test("criterioDetectorPD(300,0,null) -> null (sem denominador real, nunca inventa)", () => {
  assert.equal(P.criterioDetectorPD(300, 0, null), null);
});

// --- Task 3: resolverZonaUI (6 estados, pura) ---------------------------------------------------

test("resolverZonaUI: todas resolvidas + AA presente -> estado 'resolvido', unidade AA, regra===PD_TABELA_CA.AA", () => {
  const r = P.resolverZonaUI(PF.respostas.aaResolvido);
  assert.equal(r.estado, "resolvido");
  assert.equal(r.unidade.sigla, "AA");
  assert.deepEqual(JSON.parse(JSON.stringify(r.regra)), JSON.parse(JSON.stringify(P.PD_TABELA_CA.AA)));
});

test("resolverZonaUI: macrozona Construída sem AA/ADD/AOS intersectando -> 'resolvido_sem_unidade', unidade null, regra===PD_MZC_BASICO (6º estado, BLOCKER 2)", () => {
  const r = P.resolverZonaUI(PF.respostas.macrozonaSemUnidade);
  assert.equal(r.estado, "resolvido_sem_unidade");
  assert.equal(r.unidade, null);
  assert.deepEqual(JSON.parse(JSON.stringify(r.regra)), JSON.parse(JSON.stringify(P.PD_MZC_BASICO)));
});

test("resolverZonaUI: macrozona rural (não Construída) -> estado 'rural', só macrozona, sem badges/CA", () => {
  const r = P.resolverZonaUI(PF.respostas.rural);
  assert.equal(r.estado, "rural");
});

test("resolverZonaUI: todas as 9 falharam -> estado 'erro'", () => {
  const r = P.resolverZonaUI(PF.respostas.todasFalharam);
  assert.equal(r.estado, "erro");
});

test("resolverZonaUI: algumas falharam, outras resolveram -> estado 'parcial'", () => {
  const r = P.resolverZonaUI(PF.respostas.parcial);
  assert.equal(r.estado, "parcial");
});

test("resolverZonaUI: AEIS presente -> badges.aeis===true; OOAU nunca vira badge", () => {
  const r = P.resolverZonaUI(PF.respostas.comAeis);
  assert.equal(r.badges.aeis, true);
  assert.ok(!("ooau" in r.badges), "OOAU não está entre os 5 badges (aeis/apac/add/eixo/corredor)");
});

test("resolverZonaUI é pura (mesmo array de entrada, mesmo resultado, sem rede)", () => {
  const r1 = P.resolverZonaUI(PF.respostas.aaResolvido);
  const r2 = P.resolverZonaUI(PF.respostas.aaResolvido);
  assert.deepEqual(JSON.parse(JSON.stringify(r1)), JSON.parse(JSON.stringify(r2)));
});

// --- Task 3: pdConsultarLote/PDCACHE (bloco PD_NET, I/O deduplicada) ----------------------------

function loadNetBlock(stubs) {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  const iStart = html.indexOf("PD_NET_START");
  const iEnd = html.indexOf("PD_NET_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores PD_NET ausentes ou fora de ordem em radar-goiania.html (Task 3)");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  assert.ok(src.includes("function pdConsultarLote"), "pdConsultarLote ausente do bloco PD_NET");
  assert.ok(src.includes("PDCACHE"), "PDCACHE ausente do bloco PD_NET");
  assert.ok(src.includes("Mapa_ModeloEspacial"), "PD_SVC_BASE (produção) ausente do bloco PD_NET");
  // resolverZonaUI vem do bloco RADAR_PURE — injetado no sandbox (mesmo padrão de capCache/jsonp
  // stubados) já que PD_NET chama a função pura para montar o resultado combinado.
  const pureHtml = html;
  const pStart = pureHtml.indexOf("RADAR_PURE_START");
  const pEnd = pureHtml.indexOf("RADAR_PURE_END");
  const pureSrc = pureHtml.slice(pureHtml.indexOf("\n", pStart) + 1, pureHtml.lastIndexOf("\n", pEnd));
  const sandbox = {
    jsonp: stubs.jsonp,
    capCache:
      stubs.capCache ||
      ((o, max) => {
        const k = Object.keys(o);
        if (k.length > max) delete o[k[0]];
      }),
  };
  vm.createContext(sandbox);
  new vm.Script(pureSrc + "\n" + src + "\n;globalThis.__exports = {pdConsultarLote,PDCACHE,PD_SVC_BASE};", {
    filename: "pd-net.js",
  }).runInContext(sandbox);
  return sandbox.__exports;
}

test("pdConsultarLote(x,y,ci): dispara UMA bateria de 9 jsonp por ponto e grava em PDCACHE[ci]", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [{ attributes: { sigla: "AA", nm_des: "ÁREA ADENSÁVEL", nm_mzo: "Macrozona Construída" } }] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const r = await NET.pdConsultarLote(686000, 8153000, "ci-1");
  assert.equal(calls, 9, "deveria disparar exatamente 9 queries (uma por layer de PD_LAYERS)");
  assert.ok(NET.PDCACHE["ci-1"], "resultado deveria estar cacheado por ci");
  assert.ok(r);
});

test("pdConsultarLote: segunda chamada com o MESMO ci NÃO dispara jsonp de novo (dedupe de sessão)", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [{ attributes: { sigla: "AA", nm_des: "ÁREA ADENSÁVEL", nm_mzo: "Macrozona Construída" } }] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  await NET.pdConsultarLote(686000, 8153000, "ci-2");
  const callsAfterFirst = calls;
  await NET.pdConsultarLote(686000, 8153000, "ci-2");
  assert.equal(calls, callsAfterFirst, "2ª chamada com o mesmo ci não deveria disparar jsonp novamente");
});
