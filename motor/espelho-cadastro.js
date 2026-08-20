/* ESPELHO LOCAL DO CADASTRO (P0.2 — 20/08/2026). Extrai as camadas-chave do ArcGIS
   público da prefeitura para o nosso PostGIS, paginado e com retomada: o mapa passa a
   responder do nosso banco (instantâneo mesmo com o portalmapa engasgado), o zoom ganha
   rótulo de quadra/lote e a busca/Meilisearch/potencial construtivo ganham matéria-prima.
   Educação: uma página por vez (2.000 registros), pausa entre páginas, retry com
   backoff — o servidor deles é lento e a gente não piora isso. Incremental ancorado em
   last_edited_date/dtultalter: depois da 1ª carga, só o delta vem. */

import { pool } from "./db.js";

const BASE = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services";
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const NUM = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const TXT = (v) => (typeof v === "string" ? v.trim() || null : v ?? null);
const DATA = (v) => (NUM(v) ? new Date(Number(v)).toISOString() : null);

/* ---------------- camadas espelhadas ---------------- */
const FB = `${BASE}/MapaServer/Feature_Base/MapServer`;
const PD = `${BASE}/MapaServer/Mapa_ModeloEspacial/MapServer`;
export const CAMADAS = {
  bairro: { url: `${FB}/2/query`, oid: "OBJECTID", campoData: "last_edited_date",
    mapa: (a) => [a.OBJECTID, TXT(a.nm), DATA(a.last_edited_date)] },
  lote: { url: `${FB}/0/query`, oid: "OBJECTID", campoData: "last_edited_date",
    mapa: (a) => [a.OBJECTID, TXT(a.nm_lot), TXT(a.id_qdr), TXT(a.ci_qdr), TXT(a.ci),
      TXT(a.nm_cond), TXT(a.in_cond), DATA(a.last_edited_date)] },
  cadastro: { url: `${FB}/3/query`, oid: "ESRI_OID", campoData: "dtultalter",
    /* 1ª carga (20/08): OBJECTID da camada 3 tem DUPLICADOS ("ON CONFLICT cannot affect
       row a second time") — o rowid único registrado da camada é ESRI_OID */
    mapa: (a) => [a.ESRI_OID, TXT(a.nrinscr), TXT(a.nmlogradou), TXT(a.tplogradou),
      TXT(a.nrimovel), TXT(a.nrquadra), TXT(a.nrlote), TXT(a.cdbairro), TXT(a.nmbairro),
      NUM(a.areaterr), NUM(a.areaedif), NUM(a.vlvenal), TXT(a.cdzona), TXT(a.nmedificio),
      TXT(a.in_valido), DATA(a.dtultalter)] },
  num_predial: { url: `${FB}/5/query`, oid: "objectid", campoData: null,
    mapa: (a) => [a.objectid, TXT(a.nrinscr), TXT(a.nm_npo)] },
};
/* Plano Diretor: camadas escolhidas (0=zonas PD2022, 31=Áreas Adensáveis, 14=APP,
   28=Patrimônio Cultural) — atributos variam: vão todos para props jsonb */
export const PD_CAMADAS = [0, 31, 14, 28];

const SQL_INSERT = {
  bairro: `INSERT INTO espelho_bairro (objectid, nm, editado_em, geom)
           SELECT o, nm, e, ST_Multi(ST_GeomFromText(w, 4326)) FROM unnest($1::int[], $2::text[], $3::timestamptz[], $4::text[]) AS u(o, nm, e, w)
           ON CONFLICT (objectid) DO UPDATE SET nm=EXCLUDED.nm, editado_em=EXCLUDED.editado_em, geom=EXCLUDED.geom`,
  lote: `INSERT INTO espelho_lote (objectid, nm_lot, id_qdr, ci_qdr, ci, nm_cond, in_cond, editado_em, geom)
         SELECT o, l, q, cq, c, nc, ic, e, ST_Multi(ST_GeomFromText(w, 4326)) FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::timestamptz[], $9::text[]) AS u(o, l, q, cq, c, nc, ic, e, w)
         ON CONFLICT (objectid) DO UPDATE SET nm_lot=EXCLUDED.nm_lot, id_qdr=EXCLUDED.id_qdr, ci_qdr=EXCLUDED.ci_qdr, ci=EXCLUDED.ci, nm_cond=EXCLUDED.nm_cond, in_cond=EXCLUDED.in_cond, editado_em=EXCLUDED.editado_em, geom=EXCLUDED.geom`,
  cadastro: `INSERT INTO espelho_cadastro (objectid, nrinscr, nmlogradou, tplogradou, nrimovel, nrquadra, nrlote, cdbairro, nmbairro, areaterr, areaedif, vlvenal, cdzona, nmedificio, in_valido, alterado_em, geom)
         SELECT o, i, lg, tl, ni, q, lt, cb, nb, at, ae, vv, cz, ne, iv, al, ST_Multi(ST_GeomFromText(w, 4326))
         FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::numeric[], $11::numeric[], $12::numeric[], $13::text[], $14::text[], $15::text[], $16::timestamptz[], $17::text[]) AS u(o, i, lg, tl, ni, q, lt, cb, nb, at, ae, vv, cz, ne, iv, al, w)
         ON CONFLICT (objectid) DO UPDATE SET nrinscr=EXCLUDED.nrinscr, nmlogradou=EXCLUDED.nmlogradou, tplogradou=EXCLUDED.tplogradou, nrimovel=EXCLUDED.nrimovel, nrquadra=EXCLUDED.nrquadra, nrlote=EXCLUDED.nrlote, cdbairro=EXCLUDED.cdbairro, nmbairro=EXCLUDED.nmbairro, areaterr=EXCLUDED.areaterr, areaedif=EXCLUDED.areaedif, vlvenal=EXCLUDED.vlvenal, cdzona=EXCLUDED.cdzona, nmedificio=EXCLUDED.nmedificio, in_valido=EXCLUDED.in_valido, alterado_em=EXCLUDED.alterado_em, geom=EXCLUDED.geom`,
  num_predial: `INSERT INTO espelho_num_predial (objectid, nrinscr, nm_npo, geom)
           SELECT o, i, n, ST_GeomFromText(w, 4326) FROM unnest($1::int[], $2::text[], $3::text[], $4::text[]) AS u(o, i, n, w)
           ON CONFLICT (objectid) DO UPDATE SET nrinscr=EXCLUDED.nrinscr, nm_npo=EXCLUDED.nm_npo, geom=EXCLUDED.geom`,
  pd: `INSERT INTO espelho_pd (camada, objectid, props, geom)
       SELECT c, o, p, ST_GeomFromText(w, 4326) FROM unnest($1::int[], $2::int[], $3::jsonb[], $4::text[]) AS u(c, o, p, w)
       ON CONFLICT (camada, objectid) DO UPDATE SET props=EXCLUDED.props, geom=EXCLUDED.geom`,
};

/* ---------------- geometria esriJSON -> WKT (puro, testado na suíte) ---------------- */
/* área sinalizada do anel (variante shoelace ∑(Δx)(y₁+y₂)): positivo = horário =
   anel EXTERIOR no esriJSON; negativo = ilha/buraco */
export function anelArea(anel) {
  let s = 0;
  for (let i = 0; i < anel.length - 1; i++)
    s += (anel[i + 1][0] - anel[i][0]) * (anel[i + 1][1] + anel[i][1]);
  return s / 2;
}
const pt = (p) => `${Number(p[0].toFixed(6))} ${Number(p[1].toFixed(6))}`; /* x/y; ignora z/m */
function anelWkt(anel) {
  const pts = anel.map(pt);
  if (pts[0] !== pts[pts.length - 1]) pts.push(pts[0]); /* WKT exige anel fechado */
  return `(${pts.join(",")})`;
}
export function esriParaWkt(g) {
  if (!g) return null;
  if (g.x != null && g.y != null) return `POINT(${Number(g.x.toFixed(6))} ${Number(g.y.toFixed(6))})`;
  const aneis = g.rings || [];
  if (!aneis.length) return null;
  const polys = []; /* [{externo, ilhas:[]}] */
  for (const anel of aneis) {
    if (anelArea(anel) > 0 || !polys.length) polys.push({ externo: anel, ilhas: [] });
    else polys[polys.length - 1].ilhas.push(anel);
  }
  const um = (p) => `(${anelWkt(p.externo)}${p.ilhas.map(i => "," + anelWkt(i)).join("")})`;
  return polys.length === 1 ? `POLYGON${um(polys[0])}` : `MULTIPOLYGON(${polys.map(um).join(",")})`;
}

/* where do incremental (puro): só o que mudou desde a última marca espelhada */
export function montarWhere(campoData, marca) {
  if (!campoData || !marca) return "1=1";
  const iso = new Date(marca).toISOString().replace("T", " ").replace("Z", "");
  return `${campoData} >= TIMESTAMP '${iso.slice(0, 19)}'`;
}

/* ---------------- IO: página do ArcGIS com retry ---------------- */
async function buscarPagina(cfg, { where, offset, teto = 2000, fetchImpl = fetch }) {
  const q = new URLSearchParams({ where, outFields: "*", returnGeometry: "true",
    outSR: "4326", geometryPrecision: "6", f: "json" });
  /* o Mapa_ModeloEspacial NÃO pagina (resultOffset → 400, 1ª carga 20/08) — as camadas
     do PD são pequenas, vêm numa chamada só (maxRecordCount do serviço cobre) */
  if (!cfg.semPaginacao) {
    q.set("orderByFields", cfg.oid);
    q.set("resultOffset", String(offset));
    q.set("resultRecordCount", String(teto));
  }
  let ultimo;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetchImpl(`${cfg.url}?${q}`, { signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(`arcgis ${d.error.code}: ${String(d.error.message).slice(0, 120)}`);
      return d.features || [];
    } catch (e) { ultimo = e; await dormir(5000 * (t + 1) * (t + 1)); /* 5s, 20s, 45s */ }
  }
  throw ultimo;
}

async function gravarLote(nome, linhas, wkts) {
  if (!linhas.length) return;
  const cols = linhas[0].length;
  const params = [];
  for (let c = 0; c < cols; c++) params.push(linhas.map(l => l[c]));
  await pool.query(SQL_INSERT[nome], [...params, wkts]);
}

export async function espelharCamada(nome, { cheio = false, fetchImpl } = {}) {
  const cfg = CAMADAS[nome];
  const sync = await pool.query("SELECT * FROM espelho_sync WHERE camada=$1", [nome]);
  const estado = sync.rows[0] || {};
  const marca = cheio ? null : estado.marca;
  const where = montarWhere(cfg.campoData, marca);
  let offset = (cheio || estado.status !== "rodando") ? 0 : (estado.pagina || 0);
  let total = 0, maiorMarca = marca ? new Date(marca).getTime() : 0;
  await pool.query(
    `INSERT INTO espelho_sync (camada, modo, pagina, status, atualizado_em) VALUES ($1,$2,$3,'rodando',now())
     ON CONFLICT (camada) DO UPDATE SET modo=$2, pagina=$3, status='rodando', atualizado_em=now()`,
    [nome, marca ? "incremental" : "cheio", offset]);
  for (;;) {
    const feats = await buscarPagina(cfg, { where, offset, fetchImpl });
    if (!feats.length) break;
    const linhas = [], wkts = [];
    for (const f of feats) {
      const w = esriParaWkt(f.geometry);
      if (!w) continue;
      linhas.push(cfg.mapa(f.attributes));
      wkts.push(w);
      const dv = Number(f.attributes[cfg.campoData] || 0);
      if (dv > maiorMarca) maiorMarca = dv;
    }
    /* grava em fatias de 500 — lote de 2.000 num INSERT só estoura memória à toa */
    for (let i = 0; i < linhas.length; i += 500)
      await gravarLote(nome, linhas.slice(i, i + 500), wkts.slice(i, i + 500));
    total += feats.length;
    offset += feats.length;
    await pool.query(
      `UPDATE espelho_sync SET pagina=$2, total=$3, marca=COALESCE($4, marca), atualizado_em=now() WHERE camada=$1`,
      [nome, offset, total, maiorMarca ? new Date(maiorMarca).toISOString() : null]);
    if (feats.length < 2000) break; /* última página */
    await dormir(800); /* gentileza com o portalmapa */
  }
  await pool.query(
    "UPDATE espelho_sync SET status='ok', pagina=0, total=$2, atualizado_em=now() WHERE camada=$1",
    [nome, total]);
  return { camada: nome, registros: total, incremental: !!marca };
}

async function espelharPd({ fetchImpl } = {}) {
  let total = 0;
  for (const id of PD_CAMADAS) {
    const cfg = { url: `${PD}/${id}/query`, oid: "OBJECTID", semPaginacao: true };
    let offset = 0, n = 0;
    for (;;) {
      const feats = await buscarPagina(cfg, { where: "1=1", offset, fetchImpl });
      if (!feats.length) break;
      const linhas = [], wkts = [];
      for (const f of feats) {
        const w = esriParaWkt(f.geometry);
        if (!w) continue;
        const { OBJECTID, ...resto } = f.attributes;
        linhas.push([OBJECTID, JSON.stringify(resto)]);
        wkts.push(w);
      }
      for (let i = 0; i < linhas.length; i += 500) {
        const fatiaL = linhas.slice(i, i + 500), fatiaW = wkts.slice(i, i + 500);
        await pool.query(SQL_INSERT.pd, [fatiaL.map(() => id), fatiaL.map(l => l[0]), fatiaL.map(l => l[1]), fatiaW]);
      }
      n += feats.length; offset += feats.length;
      break; /* semPaginacao: uma chamada traz a camada inteira */
      await dormir(800);
    }
    await pool.query(
      `INSERT INTO espelho_sync (camada, modo, total, status, atualizado_em) VALUES ($1,'cheio',$2,'ok',now())
       ON CONFLICT (camada) DO UPDATE SET modo='cheio', total=$2, status='ok', atualizado_em=now()`,
      [`pd:${id}`, n]);
    total += n;
  }
  return { camada: "pd", registros: total };
}

export async function espelharTudo(opcoes = {}) {
  const resumo = [];
  for (const nome of ["bairro", "lote", "cadastro", "num_predial"]) {
    try { resumo.push(await espelharCamada(nome, opcoes)); }
    catch (e) {
      await pool.query("UPDATE espelho_sync SET status='erro', atualizado_em=now() WHERE camada=$1", [nome]).catch(() => {});
      resumo.push({ camada: nome, erro: String(e?.message || e).slice(0, 200) });
    }
  }
  try { resumo.push(await espelharPd(opcoes)); }
  catch (e) { resumo.push({ camada: "pd", erro: String(e?.message || e).slice(0, 200) }); }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('espelho','cadastro','executada',$1)",
    [JSON.stringify(resumo)]).catch(() => {});
  return resumo;
}

/* execução direta (systemd oneshot): node espelho-cadastro.js [camada] [--cheio] */
if (process.argv[1] && process.argv[1].endsWith("espelho-cadastro.js")) {
  const camada = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : null;
  const cheio = process.argv.includes("--cheio");
  const run = camada && camada !== "pd" ? espelharCamada(camada, { cheio })
    : camada === "pd" ? espelharPd({}) : espelharTudo({ cheio });
  Promise.resolve(run).then(r => { console.log(JSON.stringify(r)); return pool.end(); })
    .catch(e => { console.error(e); process.exit(1); });
}
