// Revisita dirigida (Mercado em Movimento fase 2, 17/07) — contratos por asserção de
// string: o ciclo re-busca cada anúncio IDENTIFICADO pelo id, dentro do orçamento de
// cota, e nunca conclui "saiu do ar" por ausência na busca.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("revisita: só anúncios identificados E comparáveis gastam busca da cota", () => {
  const r = src("../motor/revisita.js");
  assert.ok(r.includes("l.external_id IS NOT NULL"), "sem identidade não há revisita");
  assert.ok(r.includes("(p.quality->>'comparableGrade')::boolean IS TRUE"),
    "catálogo e registro incompleto ficam fora do orçamento");
  assert.ok(r.includes("DISTINCT ON (l.external_id)"), "um alvo por anúncio, nunca por coleta");
  assert.ok(r.includes("diasFrio = 3") && r.includes("make_interval(days => $2)"),
    "visto há menos de 3 dias não gasta busca de novo");
  assert.ok(r.includes("ORDER BY visto_em ASC"), "os mais frios primeiro");
});

test("revisita: busca cirúrgica por site + id exato, com orçamento declarado", () => {
  const r = src("../motor/revisita.js");
  assert.ok(r.includes('`site:${host} "${a.external_id}"`'), "consulta ancorada no id do portal");
  assert.ok(r.includes("teto = 30"), "orçamento de 30 buscas/noite (900/mês na cota Brave)");
  assert.ok(r.includes("dormir(1500)"), "gentileza com o rate da Brave");
  assert.ok(r.includes("'revisita'"), "execução auditada no audit_log");
});

test("revisita: ausência na busca NUNCA vira conclusão (honestidade)", () => {
  const r = src("../motor/revisita.js");
  assert.ok(r.includes("só sinal positivo atualiza o registro"),
    "a regra está declarada no módulo");
  assert.ok(!/UPDATE\s+listings/i.test(r), "a revisita não mexe em listings por conta própria");
});

test("revisita: instalada no deploy como timer noturno pós-varredura", () => {
  const d = src("../motor/deploy-api.sh");
  assert.ok(d.includes("radar-revisita.service") && d.includes("radar-revisita.timer"));
  assert.ok(d.includes("systemctl enable --now radar-revisita.timer"));
  const t = src("../motor/radar-revisita.timer");
  assert.ok(t.includes("04:45"), "roda depois da varredura das 03:30");
});
