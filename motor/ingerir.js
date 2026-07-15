/* Ingestão da fonte A: busca pública -> listings (bruto, rastreável) -> extração
   estruturada -> properties. Dedup de 1º nível pelo UNIQUE (portal, url, content_hash):
   recoleta idêntica não duplica; a dedup multi-sinal entre portais (plano §5) vem na
   sequência da Fase 3. Fontes B (manual) e C (parcerias) entram pela MESMA tabela,
   só mudando o campo portal. */
import { createHash } from "node:crypto";
import { pool } from "./db.js";
import { buscarWeb } from "./busca-web.js";
import { extrairAnuncio } from "./extract.js";
import { avaliarQualidade } from "./qualidade.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

export async function ingerir({ consulta, paginas = 1, tier = "fast" }) {
  const achados = [];
  for (let p = 0; p < Math.min(paginas, 3); p++) {
    if (p > 0) await dormir(1200); /* Brave free = 1 req/s */
    achados.push(...await buscarWeb(consulta, { offset: p }));
  }
  const stats = { consulta, encontrados: achados.length, novos: 0, jaConhecidos: 0, extraidos: 0, falhasExtracao: 0, comparaveis: 0, catalogos: 0 };
  for (const a of achados) {
    const hash = sha(a.titulo + "\n" + a.descricao);
    const ins = await pool.query(
      `INSERT INTO listings (portal, url, raw_title, raw_description, content_hash, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,now())
       ON CONFLICT (portal, url, content_hash) DO UPDATE SET last_seen_at = now()
       RETURNING id, (xmax = 0) AS novo`,
      [a.portal, a.url, a.titulo, a.descricao, hash]);
    const { id, novo } = ins.rows[0];
    if (!novo) { stats.jaConhecidos++; continue; }
    stats.novos++;
    try {
      const ex = await extrairAnuncio({ titulo: a.titulo, descricao: a.descricao, tier });
      const v = ex.value;
      /* peneira §6 (determinística, depois da IA): classifica, nunca apaga */
      const q = avaliarQualidade({ url: a.url, titulo: a.titulo, descricao: a.descricao, extracao: v });
      if (q.comparableGrade) stats.comparaveis++;
      if (q.isCatalogPage) stats.catalogos++;
      const prop = await pool.query(
        `INSERT INTO properties (listing_id, neighborhood, property_type, characteristics, pricing, quality, extraction)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [id, v.neighborhood, v.propertyType,
          JSON.stringify({ privateAreaM2: v.privateAreaM2, totalAreaM2: v.totalAreaM2, bedrooms: v.bedrooms,
            suites: v.suites, bathrooms: v.bathrooms, parkingSpaces: v.parkingSpaces, isFurnished: v.isFurnished }),
          JSON.stringify({ askingPrice: v.askingPrice, condominiumFee: v.condominiumFee, isLaunch: v.isLaunch }),
          JSON.stringify(q),
          JSON.stringify({ confirmados: v.confirmados, inferidos: v.inferidos, model: ex.model, provider: ex.provider })]);
      if (q.comparableGrade && v.askingPrice) await pool.query(
        "INSERT INTO price_history (listing_id, price) VALUES ($1,$2)", [id, v.askingPrice]);
      /* geocodificação determinística pelo CNEFE (§10): endereço no texto -> coordenada
         com precisão declarada; sem endereço casável, o imóvel fica sem geom (honesto) */
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
          stats.geocodificados = (stats.geocodificados || 0) + 1;
        }
      } catch { /* geocodificação é bônus — nunca derruba a ingestão */ }
      stats.extraidos++;
    } catch (e) {
      stats.falhasExtracao++;
      await pool.query(
        "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('listing',$1,'falha-extracao',$2)",
        [id, JSON.stringify({ erro: String(e.message).slice(0, 300) })]).catch(() => {});
    }
    await dormir(500); /* gentileza com o rate do provedor de IA */
  }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('ingestao', $1, 'executada', $2)",
    [sha(consulta).slice(0, 12), JSON.stringify(stats)]).catch(() => {});
  return stats;
}
