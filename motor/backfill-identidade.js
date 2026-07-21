/* Backfill da identidade canônica + saneamento do termômetro (17/07/2026, roda 1x).
   1) preenche listings.external_id para o acervo já coletado;
   2) INVALIDA (nunca apaga — §16) as "mudanças de preço" antigas: todas comparavam
      páginas-catálogo pela URL bruta, não o mesmo anúncio;
   3) recomputa mudanças LEGÍTIMAS do histórico: mesmo portal raiz + external_id,
      coletas em momentos diferentes, ambas comparáveis pela peneira, salto ≤50%.
   Execução no VPS: cd /opt/radar/api && set -a && source .env && set +a && node backfill-identidade.js */
import { pool } from "./db.js";
import { identidadeAnuncio } from "./identidade-anuncio.js";

/* recomputa TODAS as identidades (não só as vazias): quando a regra de extração muda
   — como na revisão de 17/07, que derrubou o "slug termina em número" — os ids antigos
   errados são corrigidos (ou anulados) na re-execução, nunca perpetuados */
const r = await pool.query("SELECT id, url, external_id FROM listings");
let preenchidos = 0, corrigidos = 0;
for (const l of r.rows) {
  const idt = identidadeAnuncio(l.url);
  if ((idt.externalId ?? null) === (l.external_id ?? null)) continue;
  await pool.query("UPDATE listings SET external_id=$1 WHERE id=$2", [idt.externalId, l.id]);
  l.external_id == null ? preenchidos++ : corrigidos++;
}
console.log(`external_id: ${preenchidos} preenchido(s), ${corrigidos} corrigido(s)/anulado(s), em ${r.rows.length} listings`);

const inv = await pool.query(
  `UPDATE audit_log
   SET detail = detail || '{"invalidada":"comparação por URL de catálogo — bug corrigido em 17/07/2026 (identidade canônica)"}'::jsonb
   WHERE action='mudanca-preco' AND detail->>'verificada' IS NULL
   RETURNING id`);
console.log(`${inv.rowCount} mudança(s) antiga(s) invalidada(s) — comparavam catálogo, não anúncio`);

/* pares consecutivos de coletas do MESMO anúncio com preço diferente, ambos comparáveis */
const pares = await pool.query(
  `WITH coletas AS (
     SELECT l.external_id,
            regexp_replace(l.portal, '^(go|www)\\.', '') AS portal_raiz,
            l.id AS listing_id, l.url, l.portal, l.collected_at,
            (p.pricing->>'askingPrice')::numeric AS preco,
            p.neighborhood AS bairro, p.property_type AS tipo,
            COALESCE((p.characteristics->>'urlAreaM2')::numeric,
                     (p.characteristics->>'privateAreaM2')::numeric,
                     (p.characteristics->>'totalAreaM2')::numeric) AS area
     FROM listings l JOIN properties p ON p.listing_id = l.id
     WHERE l.external_id IS NOT NULL
       AND (p.quality->>'comparableGrade')::boolean IS TRUE
       AND (p.pricing->>'askingPrice') IS NOT NULL)
   SELECT c.*, lag(c.preco) OVER w AS preco_ant, lag(c.listing_id) OVER w AS listing_ant,
          lag(c.collected_at) OVER w AS coleta_ant
   FROM coletas c
   WINDOW w AS (PARTITION BY c.portal_raiz, c.external_id ORDER BY c.collected_at)`);
let legitimas = 0, suspeitas = 0, jaRegistradas = 0;
for (const c of pares.rows) {
  if (c.preco_ant == null || Number(c.preco_ant) === Number(c.preco)) continue;
  const de = Number(c.preco_ant), para = Number(c.preco);
  const variacao = Math.abs(para - de) / de; /* sobre o preço anterior, como no ingerir */
  const verificada = variacao <= 0.5;
  /* idempotência (revisão 17/07): re-execução do script — ou par que o ingerir novo já
     registrou ao vivo — NÃO pode duplicar linha no termômetro */
  const ja = await pool.query(
    `SELECT 1 FROM audit_log
     WHERE action IN ('mudanca-preco','mudanca-preco-suspeita') AND entity_id=$1
       AND (detail->>'de')::numeric=$2 AND (detail->>'para')::numeric=$3 LIMIT 1`,
    [String(c.listing_id), de, para]);
  if (ja.rowCount) { jaRegistradas++; continue; }
  verificada ? legitimas++ : suspeitas++;
  await pool.query(
    `INSERT INTO audit_log (entity, entity_id, action, detail, created_at)
     VALUES ('listing',$1,$2,$3,$4)`,
    [c.listing_id, verificada ? "mudanca-preco" : "mudanca-preco-suspeita",
      JSON.stringify({ url: c.url, portal: c.portal, externalId: c.external_id, verificada,
        de, para, variacaoPct: Math.round(variacao * 1000) / 10,
        bairro: c.bairro, tipo: c.tipo, area: c.area != null ? Number(c.area) : null,
        listingAnterior: c.listing_ant, origem: "backfill-17/07" }),
      c.collected_at]);
}
console.log(`histórico recomputado: ${legitimas} mudança(s) legítima(s), ${suspeitas} suspeita(s), ${jaRegistradas} já registrada(s) (puladas)`);
await pool.end();
