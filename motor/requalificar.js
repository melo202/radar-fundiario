/* Requalificação retroativa do acervo — determinística, zero IA/cota: recalcula a
   peneira de qualidade (§6) para TODAS as properties a partir do que está gravado.
   Extraída do server.js para ser reusada pela rota por token E pelo painel (SEG-01). */
import { pool } from "./db.js";
import { avaliarQualidade } from "./qualidade.js";

export async function requalificarAcervo() {
  const todos = await pool.query(
    `SELECT p.id, l.url, l.raw_title AS titulo, l.raw_description AS descricao,
            p.neighborhood, p.property_type, p.characteristics, p.pricing
     FROM properties p JOIN listings l ON l.id = p.listing_id`);
  let comparaveis = 0, catalogos = 0;
  for (const row of todos.rows) {
    const extracao = Object.assign({ propertyType: row.property_type, neighborhood: row.neighborhood },
      row.characteristics, row.pricing);
    const q = avaliarQualidade({ url: row.url, titulo: row.titulo, descricao: row.descricao, extracao });
    if (q.comparableGrade) comparaveis++;
    if (q.isCatalogPage) catalogos++;
    await pool.query("UPDATE properties SET quality=$1, updated_at=now() WHERE id=$2",
      [JSON.stringify(q), row.id]);
  }
  const stats = { total: todos.rowCount, comparaveis, catalogos };
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('properties','*','requalificacao',$1)",
    [JSON.stringify(stats)]).catch(() => {});
  return stats;
}
