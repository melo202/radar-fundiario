import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIntelligenceFeedback, recordIntelligenceFeedback, undoIntelligenceFeedback,
} from "../motor/intelligence-feedback.js";

const migration = readFileSync(new URL("../motor/migrations/018-intelligence-feedback.sql", import.meta.url), "utf-8");
const orchestrator = readFileSync(new URL("../motor/intelligence-orchestrator.js", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");
const agentTools = readFileSync(new URL("../motor/agent-tools.js", import.meta.url), "utf-8");
const deploy = readFileSync(new URL("../motor/deploy-api.sh", import.meta.url), "utf-8");

const organizationId = "11111111-1111-4111-8111-111111111111";
const propertyId = "22222222-2222-4222-8222-222222222222";
const findingId = "33333333-3333-4333-8333-333333333333";
const feedbackId = "44444444-4444-4444-8444-444444444444";
const previousId = "55555555-5555-4555-8555-555555555555";

test("feedback: diferencia confirmação, erro, incerteza e acompanhamento", () => {
  assert.deepEqual(normalizeIntelligenceFeedback({ decision: "reviewed" }).value.decision, "confirmed");
  assert.deepEqual(normalizeIntelligenceFeedback({ decision: "rejected", reason: "wrong_geography" }).value.decision, "false_positive");
  assert.equal(normalizeIntelligenceFeedback({ decision: "inconclusive" }).ok, true);
  assert.equal(normalizeIntelligenceFeedback({ decision: "watching" }).ok, true);
  assert.equal(normalizeIntelligenceFeedback({ decision: "false_positive" }).ok, false, "erro exige motivo para ensinar");
  assert.equal(normalizeIntelligenceFeedback({ decision: "unknown" }).ok, false);
});

test("feedback: correção usa allowlist e a observação é compacta", () => {
  const valid = normalizeIntelligenceFeedback({
    decision: "wrong_scope", reason: "different_unit",
    correction: { relation: "comparable" }, note: "  É a unidade   1202.  ",
  });
  assert.deepEqual(valid.value, {
    decision: "wrong_scope", reason: "different_unit",
    correction: { relation: "comparable" }, note: "É a unidade 1202.",
  });
  assert.equal(normalizeIntelligenceFeedback({
    decision: "wrong_scope", reason: "different_property", correction: { price: 1 },
  }).ok, false, "preço ou fato livre não entra como correção silenciosa");
  assert.equal(normalizeIntelligenceFeedback({
    decision: "wrong_scope", reason: "different_property", correction: { relation: "same" },
  }).ok, false);
});

function recordingDb() {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const compact = String(sql).replace(/\s+/g, " ").trim();
      calls.push({ sql: compact, params });
      if (compact.startsWith("SELECT l.finding_id")) return { rowCount: 1, rows: [{ finding_id: findingId }] };
      if (compact.startsWith("SELECT id FROM intelligence_feedback")) return { rowCount: 1, rows: [{ id: previousId }] };
      if (compact.startsWith("SELECT COALESCE(jsonb_agg")) return { rowCount: 1, rows: [{ evidence: ["evidence-qualification-v1"] }] };
      if (compact.startsWith("INSERT INTO intelligence_feedback")) return { rowCount: 1, rows: [{ id: feedbackId, decision: params[3], status: "active" }] };
      return { rowCount: 1, rows: [] };
    },
    release() { calls.push({ sql: "RELEASE", params: [] }); },
  };
  return { calls, db: { async connect() { return client; } } };
}

test("feedback: nova decisão substitui a anterior, atualiza só o vínculo e gera evento", async () => {
  const { calls, db } = recordingDb();
  const result = await recordIntelligenceFeedback({
    organizationId, propertyId, findingId, decision: "false_positive", reason: "stale_source",
  }, db);
  assert.equal(result.ok, true);
  assert.ok(calls.some(c => c.sql.includes("SET status='superseded'") && c.params[0] === previousId));
  const link = calls.find(c => c.sql.startsWith("UPDATE intelligence_finding_links SET status=$1"));
  assert.equal(link.params[0], "rejected");
  assert.ok(calls.some(c => c.sql.includes("intelligence.feedback_recorded")));
  assert.ok(calls.some(c => c.sql === "COMMIT"));
  assert.equal(calls.at(-1).sql, "RELEASE");
});

test("feedback: desfazer compensa o registro e devolve o sinal para revisão", async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const compact = String(sql).replace(/\s+/g, " ").trim();calls.push({ sql: compact, params });
      if (compact.startsWith("SELECT x.id")) return { rowCount: 1, rows: [{ id: feedbackId }] };
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const result = await undoIntelligenceFeedback({ organizationId, propertyId, findingId }, { connect: async () => client });
  assert.equal(result.ok, true);
  assert.ok(calls.some(c => c.sql.includes("status='reverted',reverted_at=now()")));
  assert.ok(calls.some(c => c.sql.includes("SET status='candidate',reviewed_at=NULL")));
  assert.ok(calls.some(c => c.sql.includes("intelligence.feedback_reverted")));
});

test("feedback: schema, API e dossiê preservam histórico e desfazer", () => {
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS intelligence_feedback"));
  assert.ok(migration.includes("WHERE status='active'"), "uma única decisão ativa, sem apagar as antigas");
  assert.ok(migration.includes("supersedes_id"));
  assert.ok(migration.includes("'legacy_review'"), "revisões antigas são preservadas");
  assert.ok(orchestrator.includes("LEFT JOIN LATERAL") && orchestrator.includes("intelligence_feedback"));
  assert.ok(panel.includes("/desfazer"));
  assert.ok(panel.includes("{ decision, reason, correction, note }"));
  assert.ok(!panel.includes("{ ...feedback, propertyId"), "organização e IDs nunca vêm do corpo do feedback");
  for (const text of ["Confirmar sinal", "Está incorreto", "Ainda inconclusivo", "Acompanhar", "Desfazer decisão", "Decisões anteriores"])
    assert.ok(app.includes(text), `ação ausente: ${text}`);
  assert.ok(html.includes('id="signalFeedbackDialog"'));
  assert.ok(html.includes("não altera automaticamente os fatos do imóvel"));
  assert.ok(agentTools.includes('["false_positive","expired","wrong_scope"].includes(f.feedback?.decision)'),
    "o assistente não reutiliza hipótese que o corretor já invalidou");
  assert.ok(deploy.includes("node --check intelligence-feedback.js"));
});
