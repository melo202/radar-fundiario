// NV1 — cadeia multi-remoto do AIProvider (estudo NVIDIA Build, 15/07/2026).
// ai-provider importa db.js (pool), então o contrato é travado por asserções de
// string sobre o fonte, no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../motor/ai-provider.js", import.meta.url), "utf-8");

test("NV1: dois degraus remotos vindos do env, cada um com cooldown PRÓPRIO", () => {
  assert.ok(src.includes('remotoDoEnv("AI_REMOTE", "remoto-1")'));
  assert.ok(src.includes('remotoDoEnv("AI_REMOTE2", "remoto-2")'));
  assert.ok(src.includes("deadUntil: 0"), "cooldown vive no próprio degrau");
  assert.ok(src.includes("p.deadUntil = Date.now() + (eh429 ? 65_000 : REMOTE_COOLDOWN_MS)"),
    "falha derruba SÓ o degrau que falhou, nunca a cadeia inteira — e proporcional à causa");
  assert.ok(!src.includes("remoteDeadUntil"), "cooldown global antigo removido");
});

test("NV1: o tier decide a ordem — advanced prefere o remoto 2 (GLM), fast o remoto 1 (Groq)", () => {
  assert.ok(src.includes('tier === "advanced" ? [REMOTE2, REMOTE] : [REMOTE, REMOTE2]'));
  assert.ok(src.includes("degraus.push(LOCAL)"), "local é a base eterna no fim de TODA ordem");
  assert.ok(src.includes("chain(tier)"), "a corrida usa a ordem do tier");
});

test("NV1: timeout configurável por degrau (GLM é mais lento que o Groq)", () => {
  assert.ok(src.includes("_TIMEOUT_MS`] || TIMEOUT_REMOTE_MS"));
});

test("PERF: max_tokens declarado por tarefa e 429 respeitando o 'try again' do Groq", () => {
  /* diagnóstico real (15/07): o Groq debita o max_tokens RESERVADO da cota TPM — 2048
     fixos = 2 extrações/min; o 429 vinha com "try again in 250ms" e nós descíamos
     para o local de 19s em vez de esperar 250ms */
  assert.ok(src.includes("max_tokens: maxTokens || 2048"));
  assert.ok(src.includes('r.status === 429 && p.kind === "openai"'));
  assert.match(src, /try again in \(/, "espera o tempo que o provedor pediu");
  assert.ok(src.includes("Math.min("), "espera com teto — nunca trava a fila");
  const ex = readFileSync(new URL("../motor/extract.js", import.meta.url), "utf-8");
  assert.ok(ex.includes("maxTokens: 500"), "extração declara o que precisa (~200 de saída)");
  const re = readFileSync(new URL("../motor/resumo-entorno.js", import.meta.url), "utf-8");
  assert.ok(re.includes("maxTokens: 400"), "resumo idem");
});

test("PERF: cooldown proporcional — 429 (cota/min) derruba o degrau por 65s, não 10min", () => {
  assert.ok(src.includes('const eh429 = /429/.test(String(lastErr?.message));'));
  assert.ok(src.includes("eh429 ? 65_000 : REMOTE_COOLDOWN_MS"));
});

test("NV1: status expõe os dois remotos e o resultado identifica o degrau servidor", () => {
  assert.ok(src.includes("remote2: REMOTE2 ?"));
  assert.ok(src.includes('provider: p === LOCAL ? "local" : p.rotulo'));
});
