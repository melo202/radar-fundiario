/* P0.3 (20/08/2026): backfill em massa, rodado NO VPS via systemd-run (não por HTTP —
   10 mil imóveis x 3 degraus de geocoder estourariam o timeout do nginx).
   1) requalifica o acervo: as ~3 mil páginas-lista descobertas na auditoria do P0.3
      perdem o comparableGrade e param de poluir o índice de bairro e as avaliações;
   2) geocodifica quem não tem geom: CNEFE → cadastro municipal (rua+nº oficial) →
      condomínio (nmedificio). Retomável de graça: só toca geom IS NULL.
   Uso: node geocodificar-acervo.js [--pular-requalificacao] */
import { pool } from "./db.js";
import { geocodificarAnuncio } from "./geo-anuncio.js";
import { requalificarAcervo } from "./requalificar.js";

const pularRequalificacao = process.argv.includes("--pular-requalificacao");

if (!pularRequalificacao) {
  console.log("1/2 requalificando o acervo (páginas-lista fora dos comparáveis)…");
  const q = await requalificarAcervo();
  console.log("   requalificação:", JSON.stringify(q));
}

console.log("2/2 geocodificando quem não tem geom…");
const sem = await pool.query(
  /* páginas-lista NÃO ganham pino: o "imóvel" não existe, a coordenada seria mentira.
     A requalificação (passo 1) é quem garante a flag isCatalogPage fresca. */
  `SELECT p.id, p.neighborhood, l.raw_title AS titulo, l.raw_description AS descricao
   FROM properties p JOIN listings l ON l.id = p.listing_id
   WHERE p.geom IS NULL AND (p.quality->>'isCatalogPage')::boolean IS NOT TRUE
   ORDER BY p.created_at`);
const stats = { total: sem.rowCount, geocodificados: 0, porPrecisao: {} };
let i = 0;
for (const row of sem.rows) {
  i++;
  const geo = await geocodificarAnuncio(row).catch(() => null);
  if (geo) {
    await pool.query(
      `UPDATE properties SET geom=ST_SetSRID(ST_MakePoint($1,$2),4326), location_confidence=$3,
              extraction = COALESCE(extraction,'{}'::jsonb) || $4, updated_at=now() WHERE id=$5`,
      [geo.lon, geo.lat, geo.confidence,
        JSON.stringify({ geocodificacao: { fonte: geo.precisao === "numero-oficial" || geo.precisao === "condominio"
            ? "espelho-cadastro-2026" : "cnefe-2022",
          precisao: geo.precisao, detalhe: geo.detalhe || null,
          rua: geo.ruaDetectada || null, numero: geo.numeroDetectado ?? null,
          condominio: geo.condominioDetectado || null, localidade: geo.localidadeCnefe || null } }),
        row.id]);
    stats.geocodificados++;
    stats.porPrecisao[geo.precisao] = (stats.porPrecisao[geo.precisao] || 0) + 1;
  }
  if (i % 500 === 0) console.log(`   ${i}/${sem.rowCount} — ${stats.geocodificados} geocodificados`, JSON.stringify(stats.porPrecisao));
}
await pool.query(
  "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('properties','*','geocodificacao-massa',$1)",
  [JSON.stringify(stats)]).catch(() => {});
console.log("FIM", JSON.stringify(stats));
process.exit(0);
