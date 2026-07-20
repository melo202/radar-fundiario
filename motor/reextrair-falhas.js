/* Reextração retroativa (recuperação do incidente 22/07): com o Ollama desligado e os
   provedores remotos sem chave, a varredura gravou os listings brutos mas TODA extração
   falhou — e o listing "já conhecido" nunca ganhava nova tentativa (a ingestão o
   pulava). Este script dá a 2ª chance: todo listing SEM property passa pela MESMA
   extração+peneira da ingestão normal. Pré-requisito: pelo menos UM provedor de IA de
   pé (remoto com chave, ou Ollama religado). Idempotente — rodar 2x não duplica:
   quem já tem property sai da fila.
   Uso no VPS: cd /opt/radar/api && node reextrair-falhas.js [limite=300] */
import { pool } from "./db.js";
import { extrairAnuncio } from "./extract.js";
import { avaliarQualidade } from "./qualidade.js";
import { passaPreFiltro } from "./ingerir.js";

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

export async function reextrairFalhas({ limite = 300 } = {}) {
  const pendentes = await pool.query(
    `SELECT l.id, l.url, l.raw_title AS titulo, l.raw_description AS descricao
     FROM listings l
     WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.listing_id = l.id)
     ORDER BY l.collected_at DESC
     LIMIT $1`, [limite]);
  const stats = { pendentes: pendentes.rowCount, extraidos: 0, falhas: 0,
    semGoiania: 0, comparaveis: 0 };
  for (const a of pendentes.rows) {
    if (!passaPreFiltro(a)) { stats.semGoiania++; continue; }
    try {
      const ex = await extrairAnuncio({ titulo: a.titulo, descricao: a.descricao, tier: "fast" });
      const v = ex.value;
      const q = avaliarQualidade({ url: a.url, titulo: a.titulo, descricao: a.descricao, extracao: v });
      if (q.comparableGrade) stats.comparaveis++;
      const prop = await pool.query(
        `INSERT INTO properties (listing_id, neighborhood, property_type, characteristics, pricing, quality, extraction)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [a.id, v.neighborhood, v.propertyType,
          JSON.stringify({ privateAreaM2: v.privateAreaM2, totalAreaM2: v.totalAreaM2, bedrooms: v.bedrooms,
            suites: v.suites, bathrooms: v.bathrooms, parkingSpaces: v.parkingSpaces, isFurnished: v.isFurnished }),
          JSON.stringify({ askingPrice: v.askingPrice, condominiumFee: v.condominiumFee, isLaunch: v.isLaunch }),
          JSON.stringify(q),
          JSON.stringify({ confirmados: v.confirmados, inferidos: v.inferidos,
            model: ex.model, provider: ex.provider, origem: "reextracao" })]);
      if (q.comparableGrade && v.askingPrice) await pool.query(
        "INSERT INTO price_history (listing_id, price) VALUES ($1,$2)", [a.id, v.askingPrice]);
      /* geocodificação CNEFE — mesma lógica-bônus da ingestão */
      try {
        const { geocodificarAnuncio } = await import("./geo-anuncio.js");
        const geo = await geocodificarAnuncio({ titulo: a.titulo, descricao: a.descricao, neighborhood: v.neighborhood });
        if (geo) {
          await pool.query(
            `UPDATE properties SET geom=ST_SetSRID(ST_MakePoint($1,$2),4326), location_confidence=$3,
                    extraction = extraction || $4, updated_at=now() WHERE id=$5`,
            [geo.lon, geo.lat, geo.confidence,
              JSON.stringify({ geocodificacao: { fonte: "cnefe-2022", precisao: geo.precisao,
                rua: geo.ruaDetectada, numero: geo.numeroDetectado, localidade: geo.localidadeCnefe } }),
              prop.rows[0].id]);
        }
      } catch { /* bônus — nunca derruba a reextração */ }
      stats.extraidos++;
    } catch {
      stats.falhas++; /* o listing segue sem property: a próxima varredura tenta de novo
        (guarda de auto-recuperação da ingestão, 22/07) */
    }
    await dormir(500); /* gentileza com o rate do provedor */
  }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('listings','*','reextracao',$1)",
    [JSON.stringify(stats)]).catch(() => {});
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const limite = Number(process.argv[2] || 300);
  reextrairFalhas({ limite })
    .then(s => { console.log("reextração concluída:", s); process.exit(0); })
    .catch(e => { console.error("reextração abortada:", e.message); process.exit(1); });
}
