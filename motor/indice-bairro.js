/* Índice de mercado por bairro (projeto Mercado em Movimento, 17/07/2026).
   O mapa precisa de valor NA HORA em que o imóvel aparece — sem busca ao vivo, sem IA,
   sem fila. A varredura noturna já alimenta o acervo; aqui ele vira uma tabela viva:
   mediana de R$/m² por (bairro normalizado, tipo), calculada só sobre comparáveis da
   peneira §6, deduplicados multi-sinal (§5). Cálculo puro exportado para a suíte;
   o IO fica em funções finas com cache de 30 min (acervo muda 1x/noite). */
import { normalizaBairro, quantil, dedupMultiSinal, confianca } from "./estatistica.js";
/* db entra por import tardio: o núcleo puro daqui roda na suíte do repo sem Postgres */

/* núcleo puro: recebe comparáveis já carregados, devolve o índice por bairro+tipo */
export function calculaIndice(comps) {
  const grupos = new Map();
  for (const c of comps) {
    if (!(c.price > 0 && c.area > 0) || !c.bairro || !c.tipo) continue;
    const k = `${normalizaBairro(c.bairro)}|${c.tipo}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(c);
  }
  const indice = [];
  for (const [k, lista] of grupos) {
    const [bairro, tipo] = k.split("|");
    const { principais } = dedupMultiSinal(lista); /* mesmo imóvel em 2 portais conta 1x */
    const pm2s = principais.map(c => c.price / c.area);
    const n = pm2s.length;
    if (!n) continue;
    indice.push({
      bairro, tipo, n,
      pm2Mediana: quantil(pm2s, 0.5),
      pm2Q1: quantil(pm2s, 0.25),
      pm2Q3: quantil(pm2s, 0.75),
      completudeMedia: principais.reduce((s, c) => s + (c.completeness ?? 0), 0) / n,
    });
  }
  indice.sort((a, b) => b.n - a.n || a.bairro.localeCompare(b.bairro));
  return indice;
}

/* estimativa pura a partir de uma entrada do índice — honestidade nos limites:
   menos de 3 ofertas não sustenta nem uma faixa; nunca inventamos número */
export function estimaDoIndice(entrada, areaM2) {
  if (!entrada || !(areaM2 > 0)) return { disponivel: false, razao: "sem amostra para este bairro e tipo" };
  if (entrada.n < 3) return { disponivel: false, razao: `só ${entrada.n} oferta(s) comparável(is) no bairro — amostra insuficiente` };
  const dispersaoRelativa = (entrada.pm2Q3 - entrada.pm2Q1) / entrada.pm2Mediana;
  return {
    disponivel: true,
    valorEstimado: Math.round(entrada.pm2Mediana * areaM2),
    faixa: { de: Math.round(entrada.pm2Q1 * areaM2), ate: Math.round(entrada.pm2Q3 * areaM2) },
    pm2Mediana: Math.round(entrada.pm2Mediana),
    amostra: { n: entrada.n, bairro: entrada.bairro, tipo: entrada.tipo },
    confianca: confianca({ n: entrada.n, dispersaoRelativa, completudeMedia: entrada.completudeMedia }),
  };
}

/* ---- IO fino ---- */
let CACHE = { em: 0, indice: null };
const CACHE_MS = 30 * 60 * 1000;

async function carregaComparaveis() {
  const { pool } = await import("./db.js");
  const r = await pool.query(
    `SELECT p.neighborhood AS bairro, p.property_type AS tipo,
            (p.characteristics->>'privateAreaM2')::numeric AS area_priv,
            (p.characteristics->>'totalAreaM2')::numeric AS area_total,
            (p.characteristics->>'bedrooms')::int AS bedrooms,
            (p.pricing->>'askingPrice')::numeric AS price,
            (p.quality->>'completenessScore')::numeric AS completeness,
            ST_Y(p.geom::geometry) AS lat, ST_X(p.geom::geometry) AS lon,
            l.portal, l.url
     FROM properties p JOIN listings l ON l.id = p.listing_id
     WHERE (p.quality->>'comparableGrade')::boolean IS TRUE
       AND (p.pricing->>'askingPrice') IS NOT NULL`);
  return r.rows.map(x => ({
    bairro: x.bairro, tipo: x.tipo, price: Number(x.price),
    area: Number(x.area_priv ?? x.area_total) || null,
    bedrooms: x.bedrooms, completeness: Number(x.completeness ?? 0),
    lat: x.lat != null ? Number(x.lat) : null, lon: x.lon != null ? Number(x.lon) : null,
    portal: x.portal, url: x.url,
  }));
}

export async function indiceBairros() {
  if (CACHE.indice && Date.now() - CACHE.em < CACHE_MS) return CACHE.indice;
  const indice = calculaIndice(await carregaComparaveis());
  CACHE = { em: Date.now(), indice };
  return indice;
}

export async function estimar({ bairro, tipo, areaM2 }) {
  if (!bairro || !tipo) { const e = new Error("bairro e tipo são obrigatórios"); e.status = 400; throw e; }
  const area = Number(areaM2);
  if (!(area > 0)) { const e = new Error("areaM2 (> 0) é obrigatória"); e.status = 400; throw e; }
  const alvo = normalizaBairro(bairro);
  const indice = await indiceBairros();
  const entrada = indice.find(i => i.bairro === alvo && i.tipo === tipo) || null;
  const est = estimaDoIndice(entrada, area);
  return { ...est, bairroNormalizado: alvo, tipo, areaM2: area,
    fonte: "acervo de ofertas públicas (varredura diária); ofertas anunciadas, não transações",
    atualizadoEm: new Date(CACHE.em).toISOString() };
}
