/* Inteligência de Localização — consulta DETERMINÍSTICA do entorno (spec §6/§8).
   Recebe lat/lon, mede contagem + distância mais próxima POR CATEGORIA no raio
   próprio de cada uma (PostGIS geography: metros reais), e devolve dataQuality
   honesto — inclusive o "zero falso": área sabidamente urbana sem NENHUM POI numa
   janela larga indica lacuna de cobertura, nunca "não há nada aqui". */
import { pool } from "./db.js";
import { RAIOS_M, SINAL, ROTULO } from "./categorias.js";

const cache = new Map(); /* chave lat,lon arredondados — TTL 10 min */
const TTL = 10 * 60 * 1000;

export async function entorno({ lat, lon }) {
  if (!(lat >= -17.2 && lat <= -16.1 && lon >= -49.8 && lon <= -48.7)) {
    throw new Error("coordenada fora da região coberta (Goiânia/Aparecida)");
  }
  const chave = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = cache.get(chave);
  if (hit && Date.now() - hit.t < TTL) return { fromCache: true, ...hit.v };

  const meta = await pool.query(
    "SELECT max(extraido_em)::text AS extrato, count(*)::int AS total FROM pois");
  if (!meta.rows[0].total) throw new Error("base de POIs vazia — rode gerar-pois.py");

  const categorias = {};
  for (const [cat, raio] of Object.entries(RAIOS_M)) {
    const r = await pool.query(
      `SELECT count(*)::int AS n,
              min(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography))::int AS d
       FROM pois WHERE categoria=$3
         AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $4)`,
      [lon, lat, cat, raio]);
    const { n, d } = r.rows[0];
    categorias[cat] = { rotulo: ROTULO[cat], raioM: raio, count: n,
      nearestDistanceMeters: n ? d : null, sinal: SINAL[cat] || "positivo" };
  }

  /* dataQuality (§6): densidade em janela larga decide a confiança da cobertura */
  const denso = await pool.query(
    `SELECT count(*)::int AS n FROM pois
     WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, 1500)`,
    [lon, lat]);
  const nAmplo = denso.rows[0].n;
  const dataQuality = {
    source: "openstreetmap (extrato Geofabrik processado localmente)",
    extractDate: meta.rows[0].extrato,
    queriedAt: new Date().toISOString(),
    coverageConfidence: nAmplo >= 25 ? "alta" : nAmplo >= 5 ? "moderada" : "baixa",
    warnings: nAmplo < 5
      ? ["Pouquíssimos pontos mapeados neste entorno no OpenStreetMap — ausências aqui indicam LACUNA DE MAPEAMENTO, não necessariamente ausência real de serviços."]
      : [],
    attribution: "© OpenStreetMap contributors (ODbL)",
  };

  const v = { lat, lon, categorias, dataQuality };
  if (cache.size > 2000) cache.clear();
  cache.set(chave, { t: Date.now(), v });
  return v;
}
