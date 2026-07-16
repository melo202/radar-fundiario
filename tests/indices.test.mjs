// Índice FipeZap como referência ROTULADA (roadmap: contexto, nunca no cálculo).
// Contratos por asserção de string, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("índice: migração, loader com colunas medidas no arquivo real e timer mensal", () => {
  const mig = src("../motor/migrations/004-indices.sql");
  assert.ok(mig.includes("UNIQUE (fonte, cidade, operacao, referencia)"), "upsert idempotente");
  assert.ok(mig.includes("NUNCA entra no cálculo"), "regra registrada na migração");
  const py = src("../motor/gerar-indices.py");
  assert.ok(py.includes("COL_VAR_MES, COL_VAR_12M, COL_PRECO_M2 = 7, 12, 17"), "posições medidas no xlsx real");
  assert.ok(py.includes("fipezap-serieshistoricas.xlsx"));
  assert.ok(py.includes("ON CONFLICT (fonte, cidade, operacao, referencia) DO UPDATE"));
  const dep = src("../motor/deploy-api.sh");
  assert.ok(dep.includes("radar-indices.timer"), "timer mensal no deploy");
});

test("índice: entra no RESULTADO como contexto rotulado e nunca derruba a avaliação", () => {
  const av = src("../motor/avaliacao.js");
  assert.ok(av.includes("result.indiceMercado = {"));
  assert.ok(av.includes("fora do cálculo desta avaliação"), "nota de rotulagem gravada no resultado");
  assert.ok(av.includes("índice é contexto — nunca derruba a avaliação"));
});

test("índice: card e documento exibem com o rótulo 'fora do cálculo' sempre visível", () => {
  const html = src("../radar-goiania.html");
  assert.ok(html.includes("<b>Índice FipeZap</b> (Goiânia, venda, ref."));
  assert.ok(html.includes("contexto da cidade, fora do cálculo."));
  const doc = src("../motor/documento.js");
  assert.ok(doc.includes("r.indiceMercado ?"));
  assert.ok(doc.includes("${esc(r.indiceMercado.nota)}"), "a nota de rotulagem vai impressa no documento");
});
