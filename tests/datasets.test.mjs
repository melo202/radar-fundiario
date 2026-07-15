// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// F5 REPO-01/REPO-04: dataset-check — os 252 testes originais só exercitavam funções puras contra
// fixtures sintéticas; NENHUM carregava os datasets realmente publicados. Uma regeneração
// corrompida (gerar-bairros.py / gerar-logradouros.py / atualizar-caixa.py) passava silenciosa
// no CI. Este arquivo carrega os 4 datasets REAIS e trava as invariantes de integridade medidas
// na auditoria de 2026-07-10 (relatório 10, REPO-01/03/04/05). Runtime alvo: <2s (só leitura de
// disco + parse — nenhuma rede).
//
// ATENÇÃO ao regenerar um dataset: se uma contagem exata mudar LEGITIMAMENTE (nova lista da
// Caixa, novo snapshot de bairros), atualize o assert junto com o dado — o teste é o checkpoint
// que obriga a olhar o novo número, nunca um obstáculo a contornar.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const raiz = (nome) => new URL("../" + nome, import.meta.url);

// ---------------------------------------------------------------- bairros-goiania.json ---------

const BAIRROS = JSON.parse(readFileSync(raiz("bairros-goiania.json"), "utf-8"));

test("bairros-goiania.json: FeatureCollection com exatamente 1206 features, todas com properties.id de 12 dígitos", () => {
  assert.equal(BAIRROS.type, "FeatureCollection");
  assert.equal(BAIRROS.features.length, 1206, "contagem de features divergiu do snapshot auditado (2026-07-10)");
  for (const f of BAIRROS.features) {
    assert.ok(f && f.properties && typeof f.properties.id === "string", "feature sem properties.id");
    assert.match(f.properties.id, /^\d{12}$/, `id fora do formato 12 dígitos: ${f.properties && f.properties.id}`);
  }
});

test("bairros-goiania.json: ids únicos, TOLERANDO exatamente 1 duplicado conhecido (000400001169, REPO-03)", () => {
  // KNOWN-ISSUE (REPO-03, auditoria 2026-07-10): o id 000400001169 ("Gleba não denominada")
  // aparece 2x com polígonos DIFERENTES (241 vs 147 coordenadas) — gerar-bairros.py nunca checou
  // unicidade. Impacto real baixo (ambas as cópias são glebas anônimas; lookups primeiro-vence
  // descartam a 2ª geometria em silêncio). NÃO regeneramos o dataset aqui: o teste documenta o
  // defeito e trava o estado — um 2º duplicado (ou o sumiço deste) acusa regeneração divergente.
  const contagem = new Map();
  for (const f of BAIRROS.features) {
    const id = f.properties.id;
    contagem.set(id, (contagem.get(id) || 0) + 1);
  }
  const duplicados = [...contagem.entries()].filter(([, n]) => n > 1);
  assert.equal(duplicados.length, 1, `esperado exatamente 1 id duplicado (known-issue), achou ${duplicados.length}: ${duplicados.map(([id]) => id).join(", ")}`);
  assert.equal(duplicados[0][0], "000400001169", "o único duplicado tolerado é o known-issue 000400001169");
  assert.equal(duplicados[0][1], 2, "o known-issue tem exatamente 2 cópias");
  assert.equal(contagem.size, 1205, "1206 features - 1 duplicado = 1205 ids distintos");
});

// ---------------------------------------------------------------- bairro-cdbairro.json ---------

const CDBAIRRO = JSON.parse(readFileSync(raiz("bairro-cdbairro.json"), "utf-8"));

test("bairro-cdbairro.json: JSON válido, 1119 entradas, todo cd numérico e toda chave com 12 dígitos", () => {
  const entradas = Object.entries(CDBAIRRO);
  assert.equal(entradas.length, 1119, "contagem de entradas divergiu do snapshot auditado (2026-07-10)");
  for (const [chave, v] of entradas) {
    assert.match(chave, /^\d{12}$/, `chave fora do formato 12 dígitos: ${chave}`);
    assert.ok(v && typeof v.cd === "number" && Number.isFinite(v.cd) && v.cd > 0, `cd não-numérico/inválido em ${chave}: ${v && v.cd}`);
  }
});

test("bairro-cdbairro.json: 0 chaves órfãs — toda chave existe como feature.id em bairros-goiania.json (integridade referencial)", () => {
  const ids = new Set(BAIRROS.features.map((f) => f.properties.id));
  const orfas = Object.keys(CDBAIRRO).filter((k) => !ids.has(k));
  assert.equal(orfas.length, 0, `chaves de cdbairro sem feature correspondente: ${orfas.slice(0, 5).join(", ")}${orfas.length > 5 ? "…" : ""}`);
  // Direção inversa DOCUMENTADA (REPO-04, sem assert de zero): 86 features não têm entrada aqui
  // (bairros sem cdbairro fiscal resolvido — mudos no cruzamento/rotulagem de setor, lacuna
  // conhecida do gerar-bairros.py). Trava só o teto: a lacuna nunca pode CRESCER em silêncio.
  const semCd = [...ids].filter((id) => !(id in CDBAIRRO));
  assert.ok(semCd.length <= 86, `bairros sem cdbairro cresceu: ${semCd.length} (máx. conhecido 86)`);
  // 687 cds distintos no dataset local (o endpoint vivo rendia 709 na recon de 2026-06 — ver nota
  // no ROADMAP-radar.md §0): trava a contagem p/ acusar regeneração divergente.
  assert.equal(new Set(Object.values(CDBAIRRO).map((v) => v.cd)).size, 687, "contagem de cds distintos divergiu do snapshot auditado (687)");
});

// ---------------------------------------------------------------- limite-goiania.json ----------

test("limite-goiania.json: 1 Polygon oficial do IBGE (5208707) dentro da janela de Goiânia", () => {
  const LIMITE = JSON.parse(readFileSync(raiz("limite-goiania.json"), "utf-8"));
  assert.equal(LIMITE.type, "FeatureCollection");
  assert.equal(LIMITE.features.length, 1, "o limite municipal é exatamente 1 feature");
  const geom = LIMITE.features[0].geometry;
  assert.ok(["Polygon", "MultiPolygon"].includes(geom.type), `tipo inesperado: ${geom.type}`);
  let pontos = 0;
  const anda = (c) => {
    if (typeof c[0] === "number") {
      const [lon, lat] = c;
      assert.ok(lon > -49.6 && lon < -48.95 && lat > -16.95 && lat < -16.35,
        `coordenada fora da janela de Goiânia: ${lon},${lat}`);
      pontos++;
    } else c.forEach(anda);
  };
  anda(geom.coordinates);
  // 518 pontos na malha IBGE 2022 qualidade maxima (2026-07-15) — trava piso p/ acusar
  // regeneração degradada (qualidade minima tem ~40 pontos e arredonda demais o contorno).
  assert.ok(pontos >= 400, `malha degradada: ${pontos} pontos (esperado >=400; medido 518)`);
});

// ---------------------------------------------------------------- logradouros-goiania.json -----

test("logradouros-goiania.json: >9000 registros, todos com nome/tipo/localidades não-vazios (shape)", () => {
  const LOGR = JSON.parse(readFileSync(raiz("logradouros-goiania.json"), "utf-8"));
  assert.ok(Array.isArray(LOGR), "logradouros deveria ser um array");
  assert.ok(LOGR.length > 9000, `contagem baixa demais: ${LOGR.length} (medido 9852 em 2026-07-10)`);
  for (const r of LOGR) {
    assert.ok(typeof r.nome === "string" && r.nome.length > 0, "registro sem nome");
    assert.ok(typeof r.tipo === "string" && r.tipo.length > 0, `registro sem tipo: ${r.nome}`);
    assert.ok(Array.isArray(r.localidades) && r.localidades.length > 0, `registro sem localidades: ${r.nome}`);
  }
});

// ---------------------------------------------------------------- caixa-goiania.js -------------

test("caixa-goiania.js: parseia (window.CAIXA), 178 imóveis, x/y presente-ou-null COERENTE (nunca só uma das coordenadas)", () => {
  const src = readFileSync(raiz("caixa-goiania.js"), "utf-8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(src, { filename: "caixa-goiania.js" }).runInContext(sandbox);
  const CAIXA = sandbox.window.CAIXA;
  assert.ok(CAIXA && Array.isArray(CAIXA.imoveis), "window.CAIXA.imoveis ausente/inválido");
  assert.equal(CAIXA.imoveis.length, 178, "contagem de imóveis divergiu do snapshot auditado (2026-07-02, medido 2026-07-10)");
  assert.match(String(CAIXA.gerado || ""), /^\d{4}-\d{2}-\d{2}$/, "CAIXA.gerado deveria ser data ISO (yyyy-mm-dd)");
  let semXY = 0;
  const ids = new Set();
  for (const i of CAIXA.imoveis) {
    assert.ok(i.id != null && !ids.has(i.id), `id de imóvel ausente/duplicado: ${i.id}`);
    ids.add(i.id);
    const temX = i.x != null && Number.isFinite(i.x);
    const temY = i.y != null && Number.isFinite(i.y);
    // Coerência: x e y andam SEMPRE juntos — só x (ou só y) indicaria atualizar-caixa.py corrompido.
    assert.equal(temX, temY, `imóvel ${i.id} com coordenada pela metade (x=${i.x}, y=${i.y})`);
    if (!temX) semXY++;
    else {
      // Faixa UTM 22S plausível p/ Goiânia (mesma sanidade sugerida em REPO-08): pino fora disso
      // é transform errada (o bug histórico "pino na Bahia" era zona 23 vs 22).
      assert.ok(i.x > 600000 && i.x < 800000 && i.y > 8000000 && i.y < 8300000, `imóvel ${i.id} com coordenada fora da faixa UTM de Goiânia (x=${i.x}, y=${i.y})`);
    }
  }
  // 64/178 (36%) sem coordenada: métrica de qualidade da FONTE, documentada e já coberta pelo
  // guard i.x&&i.y do cruzamento (diff-caixa.test.mjs) — aqui só travamos o valor medido.
  assert.equal(semXY, 64, `imóveis sem x/y divergiu do snapshot auditado (64, 36%): ${semXY}`);
});
