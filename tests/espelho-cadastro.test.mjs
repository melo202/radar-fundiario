// ESPELHO-CADASTRO (20/08/2026) — funções puras do extrator: conversão esriJSON→WKT
// (anel exterior horário, ilha anti-horária, multipolígono, fechamento de anel, ponto)
// e o where do incremental. Sem rede, sem banco.
import { test } from "node:test";
import assert from "node:assert/strict";
import { esriParaWkt, anelArea, montarWhere } from "../motor/espelho-cadastro.js";

/* quadrado 1x1 no sentido HORÁRIO (exterior esri) */
const EXTERNO = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
/* quadradinho interno no sentido ANTI-horário (ilha) */
const ILHA = [[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.4], [0.2, 0.2]];

test("anelArea: horário positivo (externo), anti-horário negativo (ilha)", () => {
  assert.ok(anelArea(EXTERNO) > 0, "horário = externo");
  assert.ok(anelArea(ILHA) < 0, "anti-horário = ilha");
});

test("esriParaWkt: polígono simples vira POLYGON fechado", () => {
  assert.equal(esriParaWkt({ rings: [EXTERNO] }), "POLYGON((0 0,0 1,1 1,1 0,0 0))");
});

test("esriParaWkt: anel aberto é fechado; ilha entra como segundo anel", () => {
  const aberto = EXTERNO.slice(0, 4); /* sem repetir o 1º ponto */
  const w = esriParaWkt({ rings: [aberto, ILHA] });
  assert.ok(w.startsWith("POLYGON(("));
  assert.ok(w.includes("(0.2 0.2"), "ilha presente");
  assert.ok(w.split("0 0").length > 2 || w.endsWith(",0 0))"), "anel externo fechado");
});

test("esriParaWkt: dois exteriores viram MULTIPOLYGON; z/m ignorados", () => {
  const outro = [[5, 5, 9], [5, 6], [6, 6], [6, 5], [5, 5]]; /* com z */
  const w = esriParaWkt({ rings: [EXTERNO, outro] });
  assert.ok(w.startsWith("MULTIPOLYGON(("), w);
  assert.ok(!w.includes(" 9"), "coordenada z não vaza");
});

test("esriParaWkt: ponto e lixo", () => {
  assert.equal(esriParaWkt({ x: -49.2534567, y: -16.6789012 }), "POINT(-49.253457 -16.678901)");
  assert.equal(esriParaWkt(null), null);
  assert.equal(esriParaWkt({ rings: [] }), null);
});

test("montarWhere: cheio = 1=1; incremental ancorado na marca", () => {
  assert.equal(montarWhere("last_edited_date", null), "1=1");
  assert.equal(montarWhere(null, "2026-08-19T00:00:00Z"), "1=1", "camada sem campo de data é sempre cheia");
  assert.equal(montarWhere("dtultalter", "2026-08-19T03:00:00.000Z"),
    "dtultalter >= TIMESTAMP '2026-08-19 03:00:00'");
});
