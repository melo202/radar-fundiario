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
  assert.ok(src.includes("function montarUrbBodyHTML"), "montarUrbBodyHTML ausente do bloco RADAR_PURE (18-02 Task 2)");
  assert.ok(src.includes("function detectorRotuloPD"), "detectorRotuloPD ausente do bloco RADAR_PURE (18-02 Task 3)");
  assert.ok(src.includes("function proximoEstadoCamada"), "proximoEstadoCamada ausente do bloco RADAR_PURE (18-03 Task 2)");
  assert.ok(src.includes("function zonasZoomGateOk"), "zonasZoomGateOk ausente do bloco RADAR_PURE (18-REVIEW WR-01)");
  // esc()/clean() (18-02 Task 2): montarUrbBodyHTML usa esc() para todo campo textual de layer —
  // esc() vive FORA de RADAR_PURE (é usado por praticamente todo o app, definido antes do bloco),
  // então é stubado aqui como identidade (mesmo padrão já sugerido pelo 18-02-PLAN.md); clean() já
  // vem incluído no slice de RADAR_PURE (não precisa stub).
  const sandbox = { esc: (v) => (v == null ? "" : String(v)) };
  vm.createContext(sandbox);
  new vm.Script(
    src +
      "\n;globalThis.__exports = {PD_TABELA_CA,PD_LAYERS,PD_DISCLAIMER,PD_MZC_BASICO,pdRegrasDaZona,potencialConstrutivo,criterioDetectorPD,resolverZonaUI,montarUrbBodyHTML,fmtCA,detectorRotuloPD,proximoEstadoCamada,zonasZoomGateOk};",
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

test("resolverZonaUI: WR-02 18-REVIEW.md — unidade resolvida É a ADD -> badges.add===false (não duplica a mesma info)", () => {
  const r = P.resolverZonaUI(PF.respostas.addResolvido);
  assert.equal(r.estado, "resolvido");
  assert.equal(r.unidade.sigla, "ADD");
  assert.equal(r.badges.add, false, "badges.add deveria ser suprimido quando a própria Unidade Territorial já é ADD");
});

test("resolverZonaUI: WR-03 18-REVIEW.md — AA+ADD sobrepostos -> precedência FIXA AA vence, badges.add continua true (a layer intersectou de fato, unidade NÃO é ADD)", () => {
  const r = P.resolverZonaUI(PF.respostas.aaAddSobreposto);
  assert.equal(r.estado, "resolvido");
  assert.equal(r.unidade.sigla, "AA", "AA tem precedência sobre ADD em caso de sobreposição (contrato explícito, não acidente de ordem de array)");
  assert.equal(r.badges.add, true, "a layer `add` de fato intersectou e a unidade resolvida é AA (não ADD) — badge não deveria ser suprimido aqui");
});

test("resolverZonaUI é pura (mesmo array de entrada, mesmo resultado, sem rede)", () => {
  const r1 = P.resolverZonaUI(PF.respostas.aaResolvido);
  const r2 = P.resolverZonaUI(PF.respostas.aaResolvido);
  assert.deepEqual(JSON.parse(JSON.stringify(r1)), JSON.parse(JSON.stringify(r2)));
});

// --- 18-02 Task 2: montarUrbBodyHTML (REGRA DE OURO no RENDER — assert de string, mesmo padrão
// de CADERNO_ALLOW) + fmtCA -----------------------------------------------------------------------

const BADGES_OFF = { aeis: false, apac: false, add: false, eixo: false, corredor: false };
const CA_REGEX = /\d+(?:,\d+)?x/; // "6,0x"/"1,0x" — dígito de CA seguido de "x"

test("fmtCA: formata em pt-BR (vírgula, 1 casa) — 1.0 -> '1,0', 6 -> '6,0'; null -> null", () => {
  assert.equal(P.fmtCA(1.0), "1,0");
  assert.equal(P.fmtCA(6), "6,0");
  assert.equal(P.fmtCA(null), null);
});

test("montarUrbBodyHTML: resolvido com regra conferido:false (APAC) — REGRA DE OURO: nenhum dígito de CA, contém nota de não-conferência e o disclaimer", () => {
  const estado = {
    estado: "resolvido",
    macrozona: "Macrozona Construída",
    unidade: { sigla: "APAC", nome: P.PD_TABELA_CA.APAC.nome },
    regra: P.PD_TABELA_CA.APAC,
    badges: { ...BADGES_OFF, apac: true },
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(!CA_REGEX.test(html), "conferido:false NUNCA deveria produzir um número de CA no HTML");
  assert.ok(html.includes("ainda não foram conferidos"), "deveria conter a nota de conferência pendente");
  assert.ok(html.includes(P.PD_DISCLAIMER), "deveria conter o disclaimer fixo do SEPLANH");
});

test("montarUrbBodyHTML: resolvido com AA (conferido:true) — CA básico+máximo, linha Usos com 'qualquer uso', disclaimer", () => {
  const estado = {
    estado: "resolvido",
    macrozona: "Macrozona Construída",
    unidade: { sigla: "AA", nome: P.PD_TABELA_CA.AA.nome },
    regra: P.PD_TABELA_CA.AA,
    badges: BADGES_OFF,
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(html.includes("CA básico 1,0x · CA máximo 6,0x"), "deveria conter o rótulo verbatim de CA (18-UI-SPEC Copywriting Contract)");
  assert.ok(html.includes(">Usos<") || html.includes("Usos"), "deveria conter a linha Usos");
  assert.ok(html.includes("qualquer uso"), "AA tem usos_conferido:true e usos:'qualquer uso'");
  assert.ok(html.includes(P.PD_DISCLAIMER), "deveria conter o disclaimer fixo do SEPLANH");
});

test("montarUrbBodyHTML: REGRA DE OURO de usos — regra com usos_conferido:false (AOS) NUNCA renderiza a linha Usos", () => {
  const estado = {
    estado: "resolvido",
    macrozona: "Macrozona Construída",
    unidade: { sigla: "AOS", nome: P.PD_TABELA_CA.AOS.nome },
    regra: P.PD_TABELA_CA.AOS,
    badges: BADGES_OFF,
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(!html.includes('<div class="k">Usos</div>'), "usos_conferido:false NUNCA deveria renderizar a linha Usos (omissão honesta)");
});

test("montarUrbBodyHTML: resolvido_sem_unidade (BLOCKER 2, regra===PD_MZC_BASICO, unidade:null) — só CA básico universal, nunca máximo, nunca 'undefined'", () => {
  const estado = {
    estado: "resolvido_sem_unidade",
    macrozona: "Macrozona Construída",
    unidade: null,
    regra: P.PD_MZC_BASICO,
    badges: BADGES_OFF,
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(html.includes("CA básico 1,0x"), "deveria conter o CA básico universal (Art. 242, VII)");
  assert.ok(!html.includes("CA máximo"), "NUNCA deveria mostrar CA máximo (nenhuma unidade territorial identificada que o defina)");
  assert.ok(!html.includes("undefined"), "guarda anti-crash — nunca 'undefined — undefined' (BLOCKER 2)");
  assert.ok(html.includes("sem unidade territorial específica"), "deveria conter a nota de macrozona sem unidade");
  assert.ok(html.includes(P.PD_DISCLAIMER), "deveria conter o disclaimer fixo do SEPLANH");
});

test("montarUrbBodyHTML: rural — sem badges nem CA, contém a copy da macrozona rural", () => {
  const estado = {
    estado: "rural",
    macrozona: "Macrozona Rural do Alto Anicuns",
    unidade: null,
    regra: null,
    badges: BADGES_OFF,
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(!html.includes("urb-badge"), "estado rural nunca renderiza badges");
  assert.ok(!CA_REGEX.test(html), "estado rural nunca renderiza CA");
  assert.ok(html.includes("zona rural do Plano Diretor"), "deveria conter a copy verbatim do estado rural");
});

test("montarUrbBodyHTML: PD_DISCLAIMER aparece exatamente 1x em resolvido/resolvido_sem_unidade/parcial/rural", () => {
  const base = {
    macrozona: "Macrozona Construída",
    unidade: { sigla: "AA", nome: P.PD_TABELA_CA.AA.nome },
    regra: P.PD_TABELA_CA.AA,
    badges: BADGES_OFF,
  };
  const estados = [
    { ...base, estado: "resolvido" },
    { estado: "resolvido_sem_unidade", macrozona: "Macrozona Construída", unidade: null, regra: P.PD_MZC_BASICO, badges: BADGES_OFF },
    { ...base, estado: "parcial" },
    { estado: "rural", macrozona: "Macrozona Rural do Alto Anicuns", unidade: null, regra: null, badges: BADGES_OFF },
  ];
  estados.forEach((e) => {
    const html = P.montarUrbBodyHTML(e);
    const count = html.split(P.PD_DISCLAIMER).length - 1;
    assert.equal(count, 1, `estado '${e.estado}' deveria conter PD_DISCLAIMER exatamente 1x (achou ${count})`);
  });
});

test("montarUrbBodyHTML: parcial mostra o que resolveu + nota de aviso + botão de retry, antes do disclaimer", () => {
  const estado = {
    estado: "parcial",
    macrozona: "Macrozona Construída",
    unidade: { sigla: "AA", nome: P.PD_TABELA_CA.AA.nome },
    regra: P.PD_TABELA_CA.AA,
    badges: BADGES_OFF,
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(html.includes("não carregaram"), "deveria conter o aviso de dados parciais");
  assert.ok(html.includes('id="urbRetry"'), "deveria conter o botão de retry (#urbRetry)");
  assert.ok(html.includes("CA básico 1,0x · CA máximo 6,0x"), "deveria manter o que já resolveu (CA da AA)");
});

test("montarUrbBodyHTML: parcial com macrozona RURAL resolvida NÃO rotula 'Macrozona Construída' (C-01)", () => {
  const estado = {
    estado: "parcial",
    macrozona: "Macrozona Rural do Alto Anicuns",
    unidade: null,
    regra: null,
    badges: BADGES_OFF,
  };
  const html = P.montarUrbBodyHTML(estado);
  assert.ok(!html.includes("Macrozona Construída"), "parcial com macrozona rural NÃO deveria imprimir 'Macrozona Construída'");
  assert.ok(html.includes("Macrozona Rural do Alto Anicuns"), "deveria imprimir a macrozona rural resolvida verbatim");
});

test("montarUrbBodyHTML: estado erro é só a nota de erro, SEM disclaimer (nada foi resolvido)", () => {
  const html = P.montarUrbBodyHTML({ estado: "erro", macrozona: null, unidade: null, regra: null, badges: BADGES_OFF });
  assert.ok(html.includes("Não foi possível consultar o Plano Diretor"));
  assert.ok(html.includes('id="urbRetry"'), "estado erro deveria oferecer o botão de retry (B-01), nunca só a frase 'Toque para tentar de novo'");
  assert.ok(!/Toque para tentar/i.test(html), "estado erro NÃO deveria dizer 'Toque para tentar' num .dnote sem botão (B-01)");
  assert.ok(!html.includes(P.PD_DISCLAIMER), "nada foi resolvido — o disclaimer de 'informação indicativa' não se aplica");
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
  assert.ok(src.includes("PDQUADRACACHE"), "PDQUADRACACHE ausente do bloco PD_NET (18-02 Task 3, T-18-02)");
  assert.ok(src.includes("function pdConsultarQuadra"), "pdConsultarQuadra ausente do bloco PD_NET (18-02 Task 3)");
  assert.ok(src.includes("function consultarPDPorQuadra"), "consultarPDPorQuadra ausente do bloco PD_NET (18-02 Task 3)");
  // W3 (18-02-PLAN.md): PDQUADRACACHE (cache do detector, por chaveQuadra) NUNCA pode ser o MESMO
  // objeto que PDCACHE (cache do lote, por ci) — guarda estrutural contra cache-poisoning.
  assert.ok(!/const PDQUADRACACHE=PDCACHE\b/.test(src), "PDQUADRACACHE nunca deveria ser um alias de PDCACHE");
  // resolverZonaUI vem do bloco RADAR_PURE — injetado no sandbox (mesmo padrão de capCache/jsonp
  // stubados) já que PD_NET chama a função pura para montar o resultado combinado; clean()/
  // DETECTOR_LIMITE também vêm de lá (usados por consultarPDPorQuadra/pdConsultarQuadra).
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
  new vm.Script(
    pureSrc +
      "\n" +
      src +
      "\n;globalThis.__exports = {pdConsultarLote,PDCACHE,PD_SVC_BASE,pdConsultarQuadra,PDQUADRACACHE,consultarPDPorQuadra};",
    { filename: "pd-net.js" }
  ).runInContext(sandbox);
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

test("pdConsultarLote: estado 'erro' (todas as layers falharam) NÃO é cacheado — retry reconsulta (B-01)", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    throw new Error("rede caiu");
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const r = await NET.pdConsultarLote(686000, 8153000, "ci-erro");
  assert.equal(r.estado, "erro", "todas as layers falharam -> estado erro");
  assert.ok(!NET.PDCACHE["ci-erro"], "estado erro NUNCA deveria ser cacheado (senão o retry devolve o mesmo erro)");
  const callsAfterFirst = calls;
  await NET.pdConsultarLote(686000, 8153000, "ci-erro");
  assert.ok(calls > callsAfterFirst, "2ª chamada após erro deveria reconsultar (cache não reteve o erro)");
});

// --- 18-02 Task 3: upgrade do detector — critério PD por centroide de quadra (T-18-02/T-18-04) --

test("consultarPDPorQuadra: candidatos de 3 quadras (2 lotes cada) -> NO MÁXIMO 3 baterias (27 jsonp, nunca 1 por lote)", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [{ attributes: { sigla: "AA", nm_des: "ÁREA ADENSÁVEL", nm_mzo: "Macrozona Construída" } }] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const cand = [
    { cdbairro: "1", nrquadra: "10", x_coord: 1, y_coord: 1 },
    { cdbairro: "1", nrquadra: "10", x_coord: 2, y_coord: 2 },
    { cdbairro: "1", nrquadra: "20", x_coord: 3, y_coord: 3 },
    { cdbairro: "1", nrquadra: "20", x_coord: 4, y_coord: 4 },
    { cdbairro: "2", nrquadra: "30", x_coord: 5, y_coord: 5 },
    { cdbairro: "2", nrquadra: "30", x_coord: 6, y_coord: 6 },
  ];
  const porQuadra = await NET.consultarPDPorQuadra(cand);
  assert.equal(calls, 27, "3 quadras distintas × 9 layers = 27 jsonp — NUNCA 6 lotes × 9 = 54");
  assert.equal(Object.keys(porQuadra).length, 3, "3 quadras distintas no resultado");
  assert.ok(porQuadra["1-10"] && porQuadra["1-20"] && porQuadra["2-30"], "chaveQuadra = cdbairro-nrquadra");
});

test("consultarPDPorQuadra: mesma quadra consultada 2x (chamadas separadas) NÃO dispara jsonp de novo — PDQUADRACACHE dedupe", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [{ attributes: { sigla: "AA", nm_des: "ÁREA ADENSÁVEL", nm_mzo: "Macrozona Construída" } }] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const cand1 = [{ cdbairro: "1", nrquadra: "10", x_coord: 1, y_coord: 1 }];
  await NET.consultarPDPorQuadra(cand1);
  const callsAfterFirst = calls;
  await NET.consultarPDPorQuadra(cand1);
  assert.equal(calls, callsAfterFirst, "2ª varredura com a mesma quadra não deveria re-disparar jsonp (PDQUADRACACHE)");
});

test("pdConsultarQuadra: estado 'erro' NÃO é cacheado — re-rodar o detector reconsulta (F5 AQ-01, espelho do fix B-01)", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    throw new Error("rede caiu");
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  const r = await NET.pdConsultarQuadra(1, 1, "9-99");
  assert.equal(r.estado, "erro", "todas as layers falharam -> estado erro");
  assert.ok(!NET.PDQUADRACACHE["9-99"], "estado erro NUNCA deveria ficar em PDQUADRACACHE (o detector não tem retry que limpe o cache — o erro duraria a sessão inteira)");
  const callsAfterFirst = calls;
  await NET.pdConsultarQuadra(1, 1, "9-99");
  assert.ok(calls > callsAfterFirst, "2ª varredura após erro deveria reconsultar (cache não reteve o erro)");
});

test("PDQUADRACACHE nunca compartilha entrada com PDCACHE (W3) — mesma coordenada/chave em cada cache dispara sua PRÓPRIA bateria", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [{ attributes: { sigla: "AA", nm_des: "ÁREA ADENSÁVEL", nm_mzo: "Macrozona Construída" } }] };
  };
  const NET = loadNetBlock({ jsonp: jsonpStub });
  await NET.pdConsultarLote(1, 1, "1-10"); // ci do LOTE coincide textualmente com uma chaveQuadra possível
  const callsAfterLote = calls;
  assert.equal(callsAfterLote, 9);
  await NET.pdConsultarQuadra(1, 1, "1-10"); // MESMA chave, cache DIFERENTE — deveria disparar sua própria bateria
  assert.equal(calls, callsAfterLote + 9, "PDQUADRACACHE não deveria reaproveitar o resultado já cacheado em PDCACHE (nem vice-versa)");
  assert.ok(NET.PDCACHE["1-10"] && NET.PDQUADRACACHE["1-10"], "os DOIS caches têm a entrada, mas são objetos DIFERENTES");
  assert.notEqual(NET.PDCACHE, NET.PDQUADRACACHE, "PDCACHE e PDQUADRACACHE nunca podem ser o MESMO objeto");
});

test("detectorRotuloPD: zona conferida (AA) -> criterio 'pd' + rótulo verbatim citando a zona e o CA básico", () => {
  const candidato = { cdbairro: "1", nrquadra: "10", areaedif: 300, areaterr: 600 };
  const porQuadraMap = {
    "1-10": { estado: "resolvido", unidade: { sigla: "AA", nome: P.PD_TABELA_CA.AA.nome }, regra: P.PD_TABELA_CA.AA, badges: {} },
  };
  const info = P.detectorRotuloPD(candidato, porQuadraMap);
  assert.equal(info.criterio, "pd");
  assert.equal(info.razao, 300 / 600); // potencial = 600*1.0 = 600
  assert.equal(info.rotulo, "Critério: área construída ÷ potencial do Plano Diretor (zona AA, CA básico 1,0x)");
});

test("detectorRotuloPD: quadra sem zona resolvida (fora do mapa/consulta falhou) -> fallback 'terreno' rotulado, candidato continua na lista", () => {
  const candidato = { cdbairro: "9", nrquadra: "99", areaedif: 100, areaterr: 500 };
  const info = P.detectorRotuloPD(candidato, {}); // porQuadraMap vazio — nenhuma quadra resolvida
  assert.ok(info, "NUNCA deveria retornar null/omitir o candidato quando há terreno válido");
  assert.equal(info.criterio, "terreno");
  assert.equal(info.razao, 100 / 500);
  assert.equal(info.rotulo, "Critério: área construída ÷ área do terreno (Plano Diretor não disponível para este candidato)");
});

test("detectorRotuloPD: quadra resolvida mas zona não conferida (ex. APAC) -> fallback 'terreno' rotulado como 'não conferido' (C-09), nunca 'não disponível'", () => {
  const candidato = { cdbairro: "1", nrquadra: "10", areaedif: 150, areaterr: 300 };
  const porQuadraMap = {
    "1-10": { estado: "resolvido", unidade: { sigla: "APAC", nome: P.PD_TABELA_CA.APAC.nome }, regra: P.PD_TABELA_CA.APAC, badges: {} },
  };
  const info = P.detectorRotuloPD(candidato, porQuadraMap);
  assert.equal(info.criterio, "terreno");
  // C-09: zona identificada mas CA não conferido é diferente de PD indisponível — o rótulo deve dizê-lo.
  assert.ok(/não conferido/i.test(info.rotulo), `rótulo deveria distinguir "não conferido", obteve: ${info.rotulo}`);
  assert.ok(info.rotulo.includes("APAC"), `rótulo deveria citar a zona identificada (APAC), obteve: ${info.rotulo}`);
  assert.ok(!/não disponível/i.test(info.rotulo), `zona identificada NÃO deveria ser rotulada como "não disponível", obteve: ${info.rotulo}`);
});

// --- 18-03 Task 2: proximoEstadoCamada (tri-state PURO, exclusividade do seletor de camada) -----
// Testado como transição pura em vez de via toggleCamadaTematica/DOM diretamente — MESMO padrão já
// estabelecido no app: funções DOM/Leaflet-pesadas (toggleChoropleth/baiStyle/desenharChoropleth,
// Fase 15) nunca são exercitadas via node:vm; a REGRA que elas aplicam (aqui, exclusividade) é
// extraída para uma função pura testável, e toggleCamadaTematica só a consome.

test("proximoEstadoCamada: ligar 'zonas' com 'valor' ativo -> 'zonas' (EXCLUSIVIDADE — zera o estado de valor)", () => {
  assert.equal(P.proximoEstadoCamada("valor", "zonas"), "zonas");
});

test("proximoEstadoCamada: ligar 'valor' com 'zonas' ativo -> 'valor' (EXCLUSIVIDADE — zera o estado de zonas)", () => {
  assert.equal(P.proximoEstadoCamada("zonas", "valor"), "valor");
});

test("proximoEstadoCamada: clicar no chip JÁ ativo desliga a camada (volta a 'nenhuma')", () => {
  assert.equal(P.proximoEstadoCamada("valor", "valor"), "nenhuma");
  assert.equal(P.proximoEstadoCamada("zonas", "zonas"), "nenhuma");
});

test("proximoEstadoCamada: a partir de 'nenhuma', ligar qualquer chip ativa exatamente aquele modo (nunca os dois)", () => {
  assert.equal(P.proximoEstadoCamada("nenhuma", "valor"), "valor");
  assert.equal(P.proximoEstadoCamada("nenhuma", "zonas"), "zonas");
});

// --- 18-REVIEW WR-01: zonasZoomGateOk (gate PURO de zoom p/ desenharZonas — "nunca a cidade
// inteira", T-18-02) -------------------------------------------------------------------------------

test("zonasZoomGateOk: zoom>=13 libera a consulta (13, 17, 18)", () => {
  assert.equal(P.zonasZoomGateOk(13), true);
  assert.equal(P.zonasZoomGateOk(17), true);
  assert.equal(P.zonasZoomGateOk(18), true);
});

test("zonasZoomGateOk: zoom<13 bloqueia (12, 0, negativo)", () => {
  assert.equal(P.zonasZoomGateOk(12), false);
  assert.equal(P.zonasZoomGateOk(0), false);
  assert.equal(P.zonasZoomGateOk(-1), false);
});

test("zonasZoomGateOk: entrada não-numérica (undefined/null/NaN) nunca libera — guarda anti-crash", () => {
  assert.equal(P.zonasZoomGateOk(undefined), false);
  assert.equal(P.zonasZoomGateOk(null), false);
  assert.equal(P.zonasZoomGateOk(NaN), false);
});

// --- 18-03 Task 2: carregarZonasViewport (bloco PD_ZONA_NET, I/O viewport-limited + ZONACACHE) ---

function mockBounds(west, south, east, north) {
  // formato L.LatLngBounds (duck-typing, "L mockado" per 18-03-PLAN.md Task 2) — o app sempre chama
  // com map.getBounds() real; aqui só as 4 funções que carregarZonasViewport de fato usa.
  return { getWest: () => west, getSouth: () => south, getEast: () => east, getNorth: () => north };
}

function loadZonaNetBlock(stubs) {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  const iStart = html.indexOf("PD_ZONA_NET_START");
  const iEnd = html.indexOf("PD_ZONA_NET_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores PD_ZONA_NET ausentes ou fora de ordem em radar-goiania.html (18-03 Task 2)");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  assert.ok(src.includes("function carregarZonasViewport"), "carregarZonasViewport ausente do bloco PD_ZONA_NET");
  assert.ok(src.includes("const ZONACACHE"), "ZONACACHE ausente do bloco PD_ZONA_NET");
  assert.ok(src.includes('returnGeometry:"true"'), 'a query de zonas deveria pedir returnGeometry:"true" (geometria da viewport)');
  assert.ok(src.includes("esriGeometryEnvelope"), "a query de zonas deveria usar geometryType esriGeometryEnvelope (viewport, nunca ponto)");
  // PD_LAYERS/PD_SVC_BASE vêm de RADAR_PURE/PD_NET (já testados lá) — injetados aqui como os demais
  // dependências externas ao slice (jsonp/capCache), mesmo padrão de loadNetBlock.
  const sandbox = {
    jsonp: stubs.jsonp,
    proj4: stubs.proj4 || ((from, to, pt) => pt),
    capCache:
      stubs.capCache ||
      ((o, max) => {
        const k = Object.keys(o);
        if (k.length > max) delete o[k[0]];
      }),
    PD_LAYERS: { macrozona: 33, aa: 31, add: 30, aos: 29, aeis: 7, apac: 28, ooau: 32, eixo: 4, corredor: 1 },
    PD_SVC_BASE: "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_ModeloEspacial/MapServer",
  };
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports = {carregarZonasViewport,ZONACACHE};", { filename: "pd-zona-net.js" }).runInContext(sandbox);
  return sandbox.__exports;
}

test("carregarZonasViewport: as 6 queries (AA/ADD/AOS/AEIS/APAC/OOAU) SEMPRE incluem geometry de envelope + returnGeometry:\"true\"", async () => {
  const chamadas = [];
  const jsonpStub = async (params) => {
    chamadas.push(params);
    return { features: [] };
  };
  const NET = loadZonaNetBlock({ jsonp: jsonpStub });
  await NET.carregarZonasViewport(mockBounds(-49.3, -16.7, -49.2, -16.6));
  assert.equal(chamadas.length, 6, "deveria consultar exatamente as 6 layers de unidade territorial (nunca as 9 do PD_NET — macrozona/eixo/corredor não fazem parte do choropleth de zonas)");
  chamadas.forEach((p) => {
    assert.equal(p.geometryType, "esriGeometryEnvelope", "geometryType deveria ser envelope (viewport), nunca ponto");
    assert.equal(p.returnGeometry, "true", "returnGeometry deveria ser \"true\" — sem geometria não há o que desenhar");
    assert.ok(typeof p.geometry === "string" && p.geometry.split(",").length === 4, "geometry deveria ser um envelope com 4 coordenadas (xmin,ymin,xmax,ymax)");
  });
});

test('carregarZonasViewport: bounds ausente/inválido -> retorna null e NUNCA dispara jsonp (guarda anti "cidade inteira", T-18-02)', async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [] };
  };
  const NET = loadZonaNetBlock({ jsonp: jsonpStub });
  assert.equal(await NET.carregarZonasViewport(null), null);
  assert.equal(await NET.carregarZonasViewport({}), null); // sem getWest — não é um L.LatLngBounds válido
  assert.equal(calls, 0, "jsonp NUNCA deveria disparar sem um bbox válido — mesmo que carregarZonasViewport seja chamada");
});

test("carregarZonasViewport: 2ª chamada com o MESMO viewport (arredondado) usa ZONACACHE — não redispara jsonp", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [] };
  };
  const NET = loadZonaNetBlock({ jsonp: jsonpStub });
  const b = mockBounds(-49.30001, -16.70001, -49.20001, -16.60001);
  await NET.carregarZonasViewport(b);
  const callsAfterFirst = calls;
  assert.equal(callsAfterFirst, 6);
  await NET.carregarZonasViewport(b); // mesmo viewport (arredonda pro mesmo inteiro em 31982)
  assert.equal(calls, callsAfterFirst, "2ª chamada com o mesmo viewport arredondado não deveria redisparar jsonp — ZONACACHE dedupe");
  assert.equal(Object.keys(NET.ZONACACHE).length, 1, "ZONACACHE deveria ter exatamente 1 entrada (mesma chave reusada)");
});

test("carregarZonasViewport: TODAS as 6 layers falharam -> {__erro:true}, NÃO cacheia e reconsulta (B-06)", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    throw new Error("rede caiu");
  };
  const NET = loadZonaNetBlock({ jsonp: jsonpStub });
  const b = mockBounds(-49.3, -16.7, -49.2, -16.6);
  const r = await NET.carregarZonasViewport(b);
  // objeto criado no realm do vm — deepEqual estrito falha por protótipo cross-realm; checa a prop.
  assert.equal(r && r.__erro, true, "todas as layers rejeitadas deveria sinalizar falha (__erro:true), nunca um resultado todo-vazio");
  assert.equal(Object.keys(NET.ZONACACHE).length, 0, "falha total NUNCA deveria ser cacheada (senão o all-vazio fica preso)");
  const callsAfterFirst = calls;
  await NET.carregarZonasViewport(b);
  assert.equal(calls, callsAfterFirst + 6, "2ª chamada após falha total deveria reconsultar (cache não reteve a falha)");
});

test("carregarZonasViewport: viewport bem DIFERENTE dispara sua PRÓPRIA bateria (cache é por chave de viewport, nunca global)", async () => {
  let calls = 0;
  const jsonpStub = async () => {
    calls++;
    return { features: [] };
  };
  const NET = loadZonaNetBlock({ jsonp: jsonpStub });
  await NET.carregarZonasViewport(mockBounds(-49.3, -16.7, -49.2, -16.6));
  const callsAfterFirst = calls;
  await NET.carregarZonasViewport(mockBounds(-47.0, -15.0, -46.9, -14.9)); // longe o bastante p/ arredondar em chave diferente
  assert.equal(calls, callsAfterFirst + 6, "viewport diferente deveria disparar sua própria bateria de 6 queries, nunca reusar o cache de outro lugar");
});
