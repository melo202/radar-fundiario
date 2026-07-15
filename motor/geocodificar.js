/* Geocoding local por CNEFE/IBGE (§7) — 100% determinístico (só PostGIS, zero IA/cota).
   Degradação HONESTA em degraus, sempre declarando a precisão:
     "numero"          -> o número pedido existe no CNEFE (centroide dos endereços dele);
     "numero-proximo"  -> a rua existe, o número não; devolve o número mais próximo POR
                          localidade, com a distância numérica à vista;
     "logradouro"      -> só a rua (centroide + faixa de numeração por localidade);
   candidatos vazios = não achou; nunca se inventa coordenada. */
import { pool } from "./db.js";
import { normalizaLogradouro, semAcento } from "./normaliza-endereco.js";

const FONTE = "CNEFE — IBGE, Censo Demográfico 2022";

export async function geocodificar({ rua, numero, bairro }) {
  const logradouro = normalizaLogradouro(rua);
  if (!logradouro) { const e = new Error("rua obrigatória"); e.status = 400; throw e; }
  const alvo = Number(numero) > 0 ? Math.trunc(Number(numero)) : null;
  const filtroLoc = bairro ? `%${semAcento(String(bairro)).toLowerCase()}%` : null;
  const locWhere = filtroLoc ? " AND lower(localidade) LIKE $3" : "";
  const base = { consulta: { logradouro, numero: alvo }, fonte: FONTE };

  if (alvo != null) {
    const exato = await pool.query(
      `SELECT localidade, cep, numero, qtd, nivel,
              ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lon
       FROM enderecos WHERE logradouro=$1 AND numero=$2${locWhere}
       ORDER BY qtd DESC LIMIT 5`,
      filtroLoc ? [logradouro, alvo, filtroLoc] : [logradouro, alvo]);
    if (exato.rowCount) return { ...base, precisao: "numero", candidatos: exato.rows };

    const proximo = await pool.query(
      `SELECT DISTINCT ON (localidade) localidade, cep, numero, qtd, nivel,
              ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lon,
              ABS(numero-$2) AS distancia_numerica
       FROM enderecos WHERE logradouro=$1${locWhere}
       ORDER BY localidade, ABS(numero-$2) LIMIT 40`,
      filtroLoc ? [logradouro, alvo, filtroLoc] : [logradouro, alvo]);
    if (proximo.rowCount) {
      const ordenados = proximo.rows.sort((a, b) => a.distancia_numerica - b.distancia_numerica).slice(0, 5);
      return { ...base, precisao: "numero-proximo", candidatos: ordenados };
    }
  } else {
    const ruaCerta = await pool.query(
      `SELECT localidade, min(cep) AS cep, sum(qtd)::int AS qtd,
              min(numero) AS numero_min, max(numero) AS numero_max,
              ST_Y(ST_Centroid(ST_Collect(geom::geometry))) AS lat,
              ST_X(ST_Centroid(ST_Collect(geom::geometry))) AS lon
       FROM enderecos WHERE logradouro=$1${filtroLoc ? " AND lower(localidade) LIKE $2" : ""}
       GROUP BY localidade ORDER BY sum(qtd) DESC LIMIT 5`,
      filtroLoc ? [logradouro, filtroLoc] : [logradouro]);
    if (ruaCerta.rowCount) return { ...base, precisao: "logradouro", candidatos: ruaCerta.rows };
  }

  /* rua não bateu exata (abreviação, título omitido): LIKE no nome, por relevância */
  const parecido = await pool.query(
    `SELECT logradouro, localidade, sum(qtd)::int AS qtd,
            min(numero) AS numero_min, max(numero) AS numero_max,
            ST_Y(ST_Centroid(ST_Collect(geom::geometry))) AS lat,
            ST_X(ST_Centroid(ST_Collect(geom::geometry))) AS lon
     FROM enderecos WHERE logradouro LIKE '%' || $1 || '%'
     GROUP BY logradouro, localidade ORDER BY sum(qtd) DESC LIMIT 5`, [logradouro]);
  return { ...base, precisao: parecido.rowCount ? "logradouro" : null, candidatos: parecido.rows };
}
