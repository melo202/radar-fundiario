/* Revisão econômica e determinística do agente. Não chama LLM, não edita código e não
   aplica mudanças: apenas registra propostas com evidências para aprovação humana. */
import { pathToFileURL } from "node:url";
import { pool } from "./db.js";

export function deriveImprovementProposals(stats = {}) {
  const calls = Number(stats.calls || 0);
  if (calls < 5) return [];
  const failures = Number(stats.failures || 0);
  const fallbacks = Number(stats.fallbacks || 0);
  const averageContextTokens = Number(stats.averageContextTokens || 0);
  const proposals = [];
  if (failures / calls >= 0.10) proposals.push({
    kind: "reliability", title: "Reduzir falhas do assistente",
    reason: `${failures} de ${calls} chamadas falharam nos últimos 7 dias.`,
    expectedBenefit: "Mais tarefas concluídas sem repetição.", risk: "baixo",
  });
  if (fallbacks / calls >= 0.15) proposals.push({
    kind: "reliability", title: "Investigar uso excessivo do fallback",
    reason: `${fallbacks} de ${calls} chamadas precisaram do runtime local.`,
    expectedBenefit: "Menos respostas degradadas e diagnóstico mais rápido.", risk: "baixo",
  });
  if (averageContextTokens >= 12_000) proposals.push({
    kind: "context", title: "Comprimir o contexto das tarefas pesadas",
    reason: `A média de contexto chegou a ${Math.round(averageContextTokens).toLocaleString("pt-BR")} tokens.`,
    expectedBenefit: "Menor consumo por tarefa sem remover as fontes relevantes.", risk: "medio",
  });
  return proposals;
}

const weekKey = date => {
  const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export async function runAgentReview(now = new Date()) {
  const organizations = await pool.query("SELECT id FROM organizations");
  let inserted = 0;
  for (const organization of organizations.rows) {
    const result = await pool.query(
      `SELECT count(*)::int AS calls,
              count(*) FILTER (WHERE NOT ok)::int AS failures,
              count(*) FILTER (WHERE fallback_from IS NOT NULL)::int AS fallbacks,
              coalesce(avg(context_tokens),0)::float AS average_context_tokens
       FROM agent_usage WHERE organization_id=$1 AND created_at >= $2::timestamptz-interval '7 days'`,
      [organization.id, now.toISOString()]);
    const row = result.rows[0] || {};
    const stats = { calls: row.calls, failures: row.failures, fallbacks: row.fallbacks, averageContextTokens: row.average_context_tokens };
    for (const proposal of deriveImprovementProposals(stats)) {
      const key = `${weekKey(now)}:${proposal.kind}:${proposal.title}`;
      const saved = await pool.query(
        `INSERT INTO agent_improvement_proposals
         (organization_id,kind,title,reason,evidence,expected_benefit,risk,idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (organization_id,idempotency_key) DO NOTHING RETURNING id`,
        [organization.id, proposal.kind, proposal.title, proposal.reason, JSON.stringify(stats), proposal.expectedBenefit, proposal.risk, key]);
      inserted += saved.rowCount;
    }
  }
  return { organizations: organizations.rowCount, inserted };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listImprovementProposals() {
  const result = await pool.query(
    `SELECT p.id,p.kind,p.title,p.reason,p.expected_benefit,p.risk,p.status,p.created_at
     FROM agent_improvement_proposals p
     JOIN organizations o ON o.id=p.organization_id
     WHERE o.slug='default' AND p.status='suggested'
     ORDER BY p.created_at DESC LIMIT 8`);
  return { proposals: result.rows };
}

export async function reviewImprovementProposal(id, decision) {
  if (!UUID.test(String(id || ""))) return { ok: false, error: "proposta inválida" };
  if (!new Set(["approved", "rejected"]).has(decision)) return { ok: false, error: "decisão inválida" };
  const result = await pool.query(
    `UPDATE agent_improvement_proposals p SET status=$1,reviewed_at=now()
     FROM organizations o WHERE p.organization_id=o.id AND o.slug='default'
       AND p.id=$2 AND p.status='suggested' RETURNING p.id,p.status`, [decision, id]);
  return result.rowCount ? { ok: true, proposal: result.rows[0] } : { ok: false, error: "proposta não encontrada" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAgentReview().then(result => { console.log(JSON.stringify(result)); return pool.end(); })
    .catch(async error => {
      console.error(error);
      process.exitCode = 1;
      await pool.end().catch(() => {});
    });
}
