// ESPELHO-API (20/08/2026) — o tradutor whitelist que aceita SÓ os padrões de where/
// outFields/geometry que o radar-goiania.html realmente gera. Testa: aceitação de cada
// padrão real, rejeição de injeção, alias nm_bai→nm, envelope, geojson→rings, erroArcgis.
// Sem rede, sem banco (funções puras).
import { test } from "node:test";
import assert from "node:assert/strict";
import { traduzirWhere, traduzirOutFields, traduzirGeometria, geojsonParaRings, erroArcgis, colsComCoordenada } from "../motor/espelho-api.js";

/* ---------- traduzirWhere: padrões reais do front ---------- */

test("where: ci pontuada (consulta por inscrição na ficha)", () => {
  const { sql, vals } = traduzirWhere("cadastro", "ci='302.015.0346.001-0'");
  assert.equal(sql, "ci = $1");
  assert.deepEqual(vals, ["302.015.0346.001-0"]);
});

test("where: nrinscr crua (inscrição sem máscara)", () => {
  const { sql, vals } = traduzirWhere("cadastro", "nrinscr='30201503460010'");
  assert.equal(sql, "nrinscr = $1");
  assert.deepEqual(vals, ["30201503460010"]);
});

test("where: cdbairro numérico e filtro cdbairro>0", () => {
  assert.deepEqual(traduzirWhere("cadastro", "cdbairro=172"), { sql: "cdbairro = $1", vals: ["172"] });
  const { sql } = traduzirWhere("cadastro", "cdbairro>0");
  assert.match(sql, /IS NOT NULL/);
});

test("where: faixas de área/venal combinadas com AND", () => {
  const { sql, vals } = traduzirWhere("cadastro", "areaterr>=200 AND areaterr<=500 AND vlvenal>0");
  assert.equal(sql, "areaterr >= $1 AND areaterr <= $2 AND vlvenal > 0");
  assert.deepEqual(vals, [200, 500]);
});

test("where: LIKE tolerante de logradouro (busca estilo Google)", () => {
  const { sql, vals } = traduzirWhere("cadastro", "UPPER(nmlogradou) LIKE '%T-63%'");
  assert.equal(sql, "upper(nmlogradou) LIKE '%' || $1 || '%'");
  assert.deepEqual(vals, ["T-63"]);
});

test("where (P2.3): LIKE de quadra/lote — a QL pela rua não cai mais no ArcGIS ao vivo", () => {
  const { sql, vals } = traduzirWhere("cadastro",
    "vlvenal>0 AND UPPER(nmlogradou) LIKE '%PORTUGAL%' AND UPPER(nrquadra) LIKE '%12%' AND UPPER(nrlote) LIKE '%5%'");
  assert.equal(sql, "vlvenal > 0 AND upper(nmlogradou) LIKE '%' || $1 || '%' AND upper(nrquadra) LIKE '%' || $2 || '%' AND upper(nrlote) LIKE '%' || $3 || '%'");
  assert.deepEqual(vals, ["PORTUGAL", "12", "5"]);
  // lote de 1 caractere é legítimo (mínimo 1); campo fora da dupla segue rejeitado
  assert.throws(() => traduzirWhere("cadastro", "UPPER(nrinscr) LIKE '%1%'"), /whitelist|alfabeto|cláusula/);
});

test("where: UPPER(nm_bai)='X' usa o alias nm_bai→nm na camada bairro", () => {
  const { sql, vals } = traduzirWhere("bairro", "UPPER(nm_bai)='JARDIM GOIÁS'");
  assert.equal(sql, "upper(nm) = $1");
  assert.deepEqual(vals, ["JARDIM GOIÁS"]);
});

test("where: razão vlvenal/areaterr (filtragem de achados)", () => {
  const { sql, vals } = traduzirWhere("cadastro", "vlvenal/areaterr<500");
  assert.equal(sql, "vlvenal / NULLIF(areaterr, 0) < $1");
  assert.deepEqual(vals, [500]);
});

test("where: 1=1 vira TRUE", () => {
  assert.equal(traduzirWhere("lote", "1=1").sql, "TRUE");
});

test("where: cláusula genérica campo='valor' com campo da whitelist", () => {
  const { sql, vals } = traduzirWhere("lote", "id_qdr='0123'");
  assert.equal(sql, "id_qdr = $1");
  assert.deepEqual(vals, ["0123"]);
});

/* ---------- traduzirWhere: rejeições (segurança) ---------- */

test("where: injeção SQL é rejeitada com erro ArcGIS-shaped", () => {
  for (const mal of [
    "nrinscr='1' OR 1=1--",
    "ci='x'; DROP TABLE espelho_cadastro;--",
    "pg_sleep(5) IS NOT NULL",
    "objectid=(SELECT 1)",
    "nm_lot LIKE '%' UNION SELECT NULL--",
  ]) {
    assert.throws(() => traduzirWhere("cadastro", mal), /fora da whitelist|alfabeto seguro/, mal);
  }
});

test("where: campo fora da whitelist é rejeitado", () => {
  assert.throws(() => traduzirWhere("cadastro", "senha='x'"), /whitelist/);
  assert.throws(() => traduzirWhere("lote", "vlvenal>0"), /whitelist/); /* vlvenal não existe na camada lote */
});

test("where: mais de 8 cláusulas é rejeitado", () => {
  const longo = Array(9).fill("vlvenal>0").join(" AND ");
  assert.throws(() => traduzirWhere("cadastro", longo), /longo demais/);
});

/* ---------- traduzirOutFields ---------- */

test("outFields: '*' devolve todos os campos da camada", () => {
  const cols = traduzirOutFields("cadastro", "*");
  assert.ok(cols.includes("ci") && cols.includes("vlvenal") && cols.includes("areaterr"));
});

test("outFields: lista específica e alias com AS", () => {
  assert.deepEqual(traduzirOutFields("cadastro", "nrinscr, vlvenal"), ["nrinscr", "vlvenal"]);
  assert.deepEqual(traduzirOutFields("bairro", "nm_bai"), ["nm AS nm_bai"]);
});

test("outFields: campo desconhecido é rejeitado", () => {
  assert.throws(() => traduzirOutFields("cadastro", "nrinscr, password"), /whitelist/);
});

/* ---------- COORD-FICHA (25/08): x_coord/y_coord que a ficha precisa (fachada, entorno) ---------- */

test("coordenada: SELECT do cadastro ganha x_coord/y_coord em 31982 (ponto DENTRO do lote)", () => {
  const cols = colsComCoordenada("cadastro", traduzirOutFields("cadastro", "*"), false);
  const x = cols.find(c => c.includes("AS x_coord")), y = cols.find(c => c.includes("AS y_coord"));
  assert.ok(x && y, "sem x_coord/y_coord a ficha aberta via espelho perde a fachada");
  assert.match(x, /PointOnSurface/); /* centróide pode cair FORA de lote em "L" */
  assert.match(x, /31982/); /* mesmo SR que o front espera (toWGS) */
});

test("coordenada: NUNCA em DISTINCT (lista de ruas/bairros manteria cardinalidade)", () => {
  const cols = colsComCoordenada("cadastro", traduzirOutFields("cadastro", "nmlogradou"), true);
  assert.equal(cols.length, 1);
  assert.ok(!cols.some(c => c.includes("x_coord")));
});

test("coordenada: só o cadastro tem geom de lote — lote/bairro não ganham", () => {
  const cols = colsComCoordenada("lote", traduzirOutFields("lote", "*"), false);
  assert.ok(!cols.some(c => c.includes("x_coord")));
});

test("coordenada: pedida explícita funciona no cadastro e é rejeitada nas outras", () => {
  const cols = traduzirOutFields("cadastro", "ci, x_coord");
  assert.ok(cols.some(c => c.includes("AS x_coord")));
  assert.throws(() => traduzirOutFields("bairro", "x_coord"), /whitelist/);
  /* sem duplicar quando o pedido explícito já trouxe */
  const deNovo = colsComCoordenada("cadastro", cols, false);
  assert.equal(deNovo.filter(c => c.includes("AS x_coord")).length, 1);
});

/* ---------- traduzirGeometria (o front fala 31982, o espelho guarda 4326) ---------- */

test("geometria: envelope UTM 31982 (o que o zoom do mapa manda)", () => {
  const g = traduzirGeometria("777000.0,8142000.0,778000.0,8143000.0", "31982");
  assert.deepEqual(g, { tipo: "envelope", srid: 31982, x1: 777000, y1: 8142000, x2: 778000, y2: 8143000 });
});

test("geometria: ponto UTM 31982 (clique de identificação de lote)", () => {
  const g = traduzirGeometria("777500.25,8142500.50", "31982");
  assert.deepEqual(g, { tipo: "ponto", srid: 31982, x: 777500.25, y: 8142500.5 });
});

test("geometria: 4326 também aceito; sem geometry → null", () => {
  assert.deepEqual(traduzirGeometria("-49.30,-16.72,-49.28,-16.70", "4326"), { tipo: "envelope", srid: 4326, x1: -49.3, y1: -16.72, x2: -49.28, y2: -16.7 });
  assert.equal(traduzirGeometria(undefined), null);
});

test("geometria: invertida, malformada, fora da faixa ou SR exótico → rejeitada", () => {
  assert.throws(() => traduzirGeometria("778000,8143000,777000,8142000", "31982"), /faixa/);
  assert.throws(() => traduzirGeometria("banana", "31982"), /malformada/);
  assert.throws(() => traduzirGeometria("-49.3,-16.7", "31982"), /faixa/); /* lat/lon não é UTM */
  assert.throws(() => traduzirGeometria("1,2,3,4,5", "31982"), /ponto.*envelope/);
  assert.throws(() => traduzirGeometria("0,0,1,1", "3857"), /inSR/);
});

/* ---------- geojsonParaRings ---------- */

test("geojsonParaRings: Polygon→rings, MultiPolygon→rings achatado, Point→x/y", () => {
  assert.deepEqual(geojsonParaRings({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }),
    { rings: [[[0, 0], [1, 0], [1, 1], [0, 0]]] });
  assert.deepEqual(geojsonParaRings({ type: "MultiPolygon", coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[2, 2], [3, 2], [3, 3], [2, 2]]]] }).rings.length, 2);
  assert.deepEqual(geojsonParaRings({ type: "Point", coordinates: [-49.25, -16.68] }), { x: -49.25, y: -16.68 });
  assert.equal(geojsonParaRings(null), null);
});

/* ---------- erroArcgis ---------- */

test("erroArcgis: erro comum vira {error:{code:500}}; erro de whitelist vira 400", () => {
  assert.deepEqual(erroArcgis(new Error("boom")).error.code, 500);
  try { traduzirWhere("cadastro", "x='1' OR 1=1"); } catch (e) {
    const r = erroArcgis(e);
    assert.equal(r.error.code, 400);
    assert.match(r.error.message, /whitelist/);
  }
});
