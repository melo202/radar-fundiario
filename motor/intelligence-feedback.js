/* Feedback humano estruturado para hipóteses do radar.
   A decisão pertence ao vínculo finding+imóvel, preserva histórico e nunca altera fatos. */
import { pool } from "./db.js";

export const FEEDBACK_DECISIONS = Object.freeze([
  "confirmed", "false_positive", "inconclusive", "watching", "expired", "wrong_scope",
]);
export const FEEDBACK_REASONS = Object.freeze([
  "confirmed_by_source", "useful_for_decision", "different_property", "different_unit",
  "catalog_or_multi_listing", "wrong_geography", "wrong_transaction", "stale_source",
  "unproven_price", "change_not_found", "duplicate_signal", "insufficient_evidence",
  "no_commercial_relevance", "expired_signal", "legacy_review", "other",
]);
const RELATIONS = new Set(["direct", "comparable", "neighborhood", "unrelated"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value, max = 500) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

export function normalizeIntelligenceFeedback(input = {}) {
  const legacy = { reviewed: "confirmed", rejected: "false_positive" };
  const decision = legacy[input.decision] || clean(input.decision, 40);
  if (!FEEDBACK_DECISIONS.includes(decision)) return { ok: false, erro: "Decisão de feedback inválida." };
  const reason = input.reason == null || input.reason === ""
    ? input.decision === "rejected" ? "legacy_review" : null : clean(input.reason, 60);
  if (reason && (!FEEDBACK_REASONS.includes(reason) || (reason === "legacy_review" && input.decision !== "rejected")))
    return { ok: false, erro: "Motivo de feedback inválido." };
  if (["false_positive", "expired", "wrong_scope"].includes(decision) && !reason)
    return { ok: false, erro: "Escolha o motivo para que o radar aprenda com a correção." };
  const rawCorrection = input.correction;
  if (rawCorrection != null && (typeof rawCorrection !== "object" || Array.isArray(rawCorrection)))
    return { ok: false, erro: "Correção inválida." };
  const correction = {};
  const relation = clean(rawCorrection?.relation, 40);
  if (relation) {
    if (!RELATIONS.has(relation)) return { ok: false, erro: "Relação corrigida inválida." };
    correction.relation = relation;
  }
  const unknownCorrectionKeys = Object.keys(rawCorrection || {}).filter(key => key !== "relation");
  if (unknownCorrectionKeys.length) return { ok: false, erro: "A correção contém campos não permitidos." };
  return { ok: true, value: { decision, reason, correction, note: clean(input.note, 500) || null } };
}

async function defaultOrganization(db = pool) {
  const result = await db.query("SELECT id FROM organizations WHERE slug='default' LIMIT 1");
  if (!result.rowCount) throw new Error("Organização padrão não encontrada.");
  return result.rows[0].id;
}

function linkStatus(decision) {
  if (decision === "confirmed") return "reviewed";
  if (["false_positive", "expired", "wrong_scope"].includes(decision)) return "rejected";
  return "candidate";
}

export async function recordIntelligenceFeedback({ organizationId, propertyId, findingId, ...input } = {}, db = pool) {
  if (!UUID.test(String(propertyId || "")) || !UUID.test(String(findingId || "")))
    return { ok: false, erro: "Sinal ou imóvel inválido." };
  const normalized = normalizeIntelligenceFeedback(input);
  if (!normalized.ok) return normalized;
  const organization = organizationId || await defaultOrganization(db);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const link = await client.query(
      `SELECT l.finding_id,l.inventory_property_id,f.kind,f.job_id,f.confidence
       FROM intelligence_finding_links l JOIN intelligence_findings f ON f.id=l.finding_id
       WHERE l.finding_id=$1 AND l.inventory_property_id=$2 AND f.organization_id=$3
       FOR UPDATE OF l`, [findingId, propertyId, organization]);
    if (!link.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, erro: "Sinal não encontrado neste imóvel." };
    }
    const previous = await client.query(
      `SELECT id FROM intelligence_feedback
       WHERE organization_id=$1 AND finding_id=$2 AND inventory_property_id=$3 AND status='active'
       FOR UPDATE`, [organization, findingId, propertyId]);
    if (previous.rowCount) await client.query(
      "UPDATE intelligence_feedback SET status='superseded' WHERE id=$1",
      [previous.rows[0].id]);
    const policy = await client.query(
      `SELECT COALESCE(jsonb_agg(DISTINCT e.qualification->>'policyVersion')
                       FILTER (WHERE e.qualification->>'policyVersion' IS NOT NULL),'[]'::jsonb) AS evidence
       FROM intelligence_findings f LEFT JOIN intelligence_evidence e ON e.id=ANY(f.evidence_ids)
       WHERE f.id=$1`, [findingId]);
    const policyVersions = { finding: "kimi-findings-v1", evidence: policy.rows[0]?.evidence || [] };
    const saved = await client.query(
      `INSERT INTO intelligence_feedback
       (organization_id,finding_id,inventory_property_id,decision,reason,correction,note,
        policy_versions,supersedes_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id,decision,reason,correction,note,status,created_at`,
      [organization, findingId, propertyId, normalized.value.decision, normalized.value.reason,
        JSON.stringify(normalized.value.correction), normalized.value.note, JSON.stringify(policyVersions),
        previous.rows[0]?.id || null]);
    await client.query(
      `UPDATE intelligence_finding_links SET status=$1,reviewed_at=now()
       WHERE finding_id=$2 AND inventory_property_id=$3`,
      [linkStatus(normalized.value.decision), findingId, propertyId]);
    await client.query(
      `INSERT INTO domain_events (organization_id,event_type,entity_type,entity_id,payload,source)
       VALUES ($1,'intelligence.feedback_recorded','intelligence_finding',$2,$3,'corretor-painel')`,
      [organization, findingId, JSON.stringify({ propertyId, ...normalized.value, feedbackId: saved.rows[0].id })]);
    await client.query(
      `INSERT INTO audit_log (entity,entity_id,action,detail,actor)
       VALUES ('intelligence-finding',$1,'human-feedback',$2,'corretor-painel')`,
      [findingId, JSON.stringify({ propertyId, ...normalized.value, feedbackId: saved.rows[0].id })]);
    await client.query("COMMIT");
    return { ok: true, feedback: saved.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function undoIntelligenceFeedback({ organizationId, propertyId, findingId } = {}, db = pool) {
  if (!UUID.test(String(propertyId || "")) || !UUID.test(String(findingId || "")))
    return { ok: false, erro: "Sinal ou imóvel inválido." };
  const organization = organizationId || await defaultOrganization(db);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT x.id FROM intelligence_feedback x
       JOIN intelligence_finding_links l ON l.finding_id=x.finding_id AND l.inventory_property_id=x.inventory_property_id
       WHERE x.organization_id=$1 AND x.finding_id=$2 AND x.inventory_property_id=$3 AND x.status='active'
       FOR UPDATE OF x,l`, [organization, findingId, propertyId]);
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, erro: "Não existe uma decisão ativa para desfazer." };
    }
    await client.query(
      "UPDATE intelligence_feedback SET status='reverted',reverted_at=now() WHERE id=$1",
      [current.rows[0].id]);
    await client.query(
      `UPDATE intelligence_finding_links SET status='candidate',reviewed_at=NULL
       WHERE finding_id=$1 AND inventory_property_id=$2`, [findingId, propertyId]);
    await client.query(
      `INSERT INTO domain_events (organization_id,event_type,entity_type,entity_id,payload,source)
       VALUES ($1,'intelligence.feedback_reverted','intelligence_finding',$2,$3,'corretor-painel')`,
      [organization, findingId, JSON.stringify({ propertyId, feedbackId: current.rows[0].id })]);
    await client.query(
      `INSERT INTO audit_log (entity,entity_id,action,detail,actor)
       VALUES ('intelligence-finding',$1,'human-feedback-reverted',$2,'corretor-painel')`,
      [findingId, JSON.stringify({ propertyId, feedbackId: current.rows[0].id })]);
    await client.query("COMMIT");
    return { ok: true, revertedFeedbackId: current.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
