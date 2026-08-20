/* API do ESPELHO do cadastro (20/08/2026) — responde no MESMO formato do ArcGIS REST
   (/espelho/<camada>/query?where=...&outFields=...&returnGeometry=...), para o mapa
   trocar de fonte sem mudar uma linha de renderização. Segurança: o where vem do
   navegador, então NADA de SQL livre — um tradutor com whitelist fechada aceita só as
   formas que o nosso próprio front gera (auditoria dos padrões reais em radar-goiania.html,
   20/08) e parametriza todos os valores. Cláusula desconhecida = 400 honesto, e o front
   cai no ArcGIS ao vivo (degradação, nunca quebra). */

import { pool } from "./db.js";

const TABELAS = { cadastro: "espelho_cadastro", lote: "espelho_lote", bairro: "espelho_bairro", num_predial: "espelho_num_predial" };
const CAMPOS = {
  cadastro: new Set(["objectid", "nrinscr", "nmlogradou", "tplogradou", "nrimovel", "nrquadra", "nrlote",
    "cdbairro", "nmbairro", "areaterr", "areaedif", "vlvenal", "cdzona", "nmedificio", "in_valido", "alterado_em", "ci"]),
  lote: new Set(["objectid", "nm_lot", "id_qdr", "ci_qdr", "ci", "nm_cond", "in_cond", "editado_em"]),
  bairro: new Set(["objectid", "nm", "editado_em"]),
  num_predial: new Set(["objectid", "nrinscr", "nm_npo"]),
};
const ALIAS = { bairro: { nm_bai: "nm" } }; /* o front usa o nome da FONTE; o espelho enxugou */
const VALOR_SEGURO = /^[\p{L}\p{N} .,'°ºª\-\/()%]{1,90}$/u;

const erro = (msg) => { const e = new Error(msg); e.arcgis = { code: 400, message: msg }; throw e; };

/* Traduz UMA cláusula. Recebe a cláusula crua e o caminho de valores parametrizados. */
function clausula(camada, c, vals) {
  const col = (nome) => {
    const real = (ALIAS[camada]?.[nome]) || nome;
    if (!CAMPOS[camada].has(real)) erro(`campo fora da whitelist: ${nome}`);
    return real;
  };
  let m;
  if ((m = c.match(/^(ci|nrinscr)='([0-9.\- ]{3,30})'$/))) { vals.push(m[2].trim()); return `${col(m[1])} = $${vals.length}`; }
  if ((m = c.match(/^cdbairro=(\d{1,8})$/))) { vals.push(m[1]); return `${col("cdbairro")} = $${vals.length}`; }
  if (/^cdbairro>0$/.test(c)) return `${col("cdbairro")} IS NOT NULL AND ${col("cdbairro")} NOT IN ('', '0')`;
  if (/^vlvenal>0$/.test(c)) return `${col("vlvenal")} > 0`;
  if ((m = c.match(/^(areaterr|areaedif)(>=|<=)(\d+(?:\.\d+)?)$/))) { vals.push(Number(m[3])); return `${col(m[1])} ${m[2]} $${vals.length}`; }
  if ((m = c.match(/^UPPER\((nmlogradou|nmedificio|nm_bai)\) LIKE '%([^']{2,60})%'$/))) {
    if (!VALOR_SEGURO.test(m[2])) erro("valor LIKE fora do alfabeto seguro");
    vals.push(m[2]); return `upper(${col(m[1])}) LIKE '%' || $${vals.length} || '%'`;
  }
  if ((m = c.match(/^UPPER\((nm_bai|nmlogradou|nmedificio)\)='([^']{2,60})'$/))) {
    if (!VALOR_SEGURO.test(m[2])) erro("valor fora do alfabeto seguro");
    vals.push(m[2]); return `upper(${col(m[1])}) = $${vals.length}`;
  }
  if ((m = c.match(/^vlvenal\/(areaterr|areaedif)<(\d+(?:\.\d+)?)$/))) { vals.push(Number(m[2])); return `${col("vlvenal")} / NULLIF(${col(m[1])}, 0) < $${vals.length}`; }
  if (/^1=1$/.test(c)) return "TRUE";
  if ((m = c.match(/^([a-z_0-9]+)='([^']{1,80})'$/i))) { /* genérico — campo E valor validados */
    if (!VALOR_SEGURO.test(m[2])) erro("valor fora do alfabeto seguro");
    vals.push(m[2]); return `${col(m[1])} = $${vals.length}`;
  }
  erro(`cláusula fora da whitelist: ${c.slice(0, 60)}`);
}

/* Traduz o where ArcGIS do front (cláusulas ligadas só por AND) → SQL parametrizado */
export function traduzirWhere(camada, where = "1=1") {
  const vals = [];
  const partes = String(where).split(/\s+AND\s+/i).map(s => s.trim()).filter(Boolean);
  if (!partes.length || partes.length > 8) erro("where vazio ou longo demais");
  const sql = partes.map(c => clausula(camada, c, vals)).join(" AND ");
  return { sql, vals };
}

export function traduzirOutFields(camada, outFields = "*") {
  if (outFields === "*") return [...CAMPOS[camada]];
  const pedidos = String(outFields).split(",").map(s => s.trim()).filter(Boolean);
  if (!pedidos.length || pedidos.length > 20) erro("outFields inválido");
  return pedidos.map(f => {
    const real = (ALIAS[camada]?.[f]) || f;
    if (!CAMPOS[camada].has(real)) erro(`outField fora da whitelist: ${f}`);
    return real === f ? real : `${real} AS ${f}`;
  });
}

/* Geometria do filtro espacial: o front NUNCA manda outSR — envia ponto "x,y" ou envelope
   "xmin,ymin,xmax,ymax" em SIRGAS2000/UTM 22S (EPSG:31982) e espera os rings de volta no
   MESMO 31982 (ele converte com proj4). O espelho guarda 4326, então: entrada transforma
   31982→4326 no filtro; saída transforma 4326→31982 no ST_AsGeoJSON (ver consultar). */
export function traduzirGeometria(geometry, inSR = "31982") {
  if (!geometry) return null;
  const srid = Number(inSR);
  if (srid !== 31982 && srid !== 4326) erro(`inSR não suportado: ${inSR}`);
  const nums = String(geometry).split(",").map(s => Number(s.trim()));
  if (nums.some(n => !isFinite(n))) erro("geometria malformada");
  const faixa = (x, y) => srid === 4326
    ? (Math.abs(x) <= 180 && Math.abs(y) <= 90)
    : (x > 0 && x < 1e6 && y > 6e6 && y < 1e7); /* UTM 22S, região de Goiás */
  if (nums.length === 2) {
    if (!faixa(nums[0], nums[1])) erro("ponto fora da faixa");
    return { tipo: "ponto", srid, x: nums[0], y: nums[1] };
  }
  if (nums.length === 4) {
    const [x1, y1, x2, y2] = nums;
    if (x1 >= x2 || y1 >= y2 || !faixa(x1, y1) || !faixa(x2, y2)) erro("envelope fora da faixa");
    return { tipo: "envelope", srid, x1, y1, x2, y2 };
  }
  erro("geometria deve ser ponto (x,y) ou envelope (xmin,ymin,xmax,ymax)");
}

/* GeoJSON → rings esriJSON (o front consome rings; o sentido do anel não importa para
   renderização em Leaflet) */
export function geojsonParaRings(gj) {
  if (!gj) return null;
  const g = typeof gj === "string" ? JSON.parse(gj) : gj;
  if (g.type === "Point") return { x: g.coordinates[0], y: g.coordinates[1] };
  if (g.type === "Polygon") return { rings: g.coordinates };
  if (g.type === "MultiPolygon") return { rings: g.coordinates.flat() };
  return null;
}

export async function consultar(camada, p) {
  const tabela = TABELAS[camada];
  if (!tabela) erro("camada desconhecida");
  /* se a camada ainda não completou a 1ª carga, erro honesto → front cai no ArcGIS vivo */
  const sync = await pool.query("SELECT status FROM espelho_sync WHERE camada=$1", [camada]);
  if (sync.rows[0]?.status !== "ok") erro(`espelho da camada '${camada}' ainda carregando`);
  const { sql, vals } = traduzirWhere(camada, p.where);
  const geo = traduzirGeometria(p.geometry, p.inSR);
  let whereSql = sql;
  if (geo?.tipo === "envelope") {
    vals.push(geo.x1, geo.y1, geo.x2, geo.y2, geo.srid);
    whereSql += ` AND geom && ST_Transform(ST_MakeEnvelope($${vals.length - 4}, $${vals.length - 3}, $${vals.length - 2}, $${vals.length - 1}, $${vals.length}), 4326)`;
  } else if (geo?.tipo === "ponto") {
    /* clique/identificação: intersects EXATO (bbox poderia pegar o lote vizinho) */
    vals.push(geo.x, geo.y, geo.srid);
    whereSql += ` AND ST_Intersects(geom, ST_Transform(ST_SetSRID(ST_MakePoint($${vals.length - 2}, $${vals.length - 1}), $${vals.length}), 4326))`;
  }
  if (p.returnCountOnly === "true") {
    const r = await pool.query(`SELECT count(*)::int AS n FROM ${tabela} WHERE ${whereSql}`, vals);
    return { count: r.rows[0].n };
  }
  const cols = traduzirOutFields(camada, p.outFields);
  const distinct = p.returnDistinctValues === "true";
  const comGeom = p.returnGeometry === "true";
  let ordem = "";
  if (p.orderByFields) {
    const c = String(p.orderByFields).split(",")[0].trim().split(" ")[0];
    const real = (ALIAS[camada]?.[c]) || c;
    if (!CAMPOS[camada].has(real)) erro(`orderBy fora da whitelist: ${c}`);
    ordem = ` ORDER BY ${real}`;
  }
  const limite = Math.min(Number(p.resultRecordCount) || 2000, 4000);
  vals.push(limite + 1); /* +1 pra saber se estourou a janela (exceededTransferLimit) */
  const sel = `SELECT ${distinct ? "DISTINCT" : ""} ${cols.join(", ")}${comGeom ? ", ST_AsGeoJSON(ST_Transform(geom, 31982), 6) AS gj" : ""}
    FROM ${tabela} WHERE ${whereSql}${ordem} LIMIT $${vals.length}`;
  const r = await pool.query(sel, vals);
  const estourouJanela = r.rows.length > limite;
  const linhas = estourouJanela ? r.rows.slice(0, limite) : r.rows;
  const features = linhas.map(row => {
    const { gj, ...attributes } = row;
    const f = { attributes };
    if (comGeom) f.geometry = geojsonParaRings(gj);
    return f;
  });
  const resp = { features };
  if (estourouJanela) resp.exceededTransferLimit = true;
  return resp;
}

/* formato ArcGIS de erro — o front já sabe tratar {error:{code,message}} */
export function erroArcgis(e) {
  return { error: e.arcgis || { code: 500, message: String(e?.message || e).slice(0, 200) } };
}
