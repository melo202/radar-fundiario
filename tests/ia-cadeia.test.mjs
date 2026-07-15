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
  assert.ok(src.includes("p.deadUntil = Date.now() + REMOTE_COOLDOWN_MS"),
    "falha derruba SÓ o degrau que falhou, nunca a cadeia inteira");
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

test("NV1: status expõe os dois remotos e o resultado identifica o degrau servidor", () => {
  assert.ok(src.includes("remote2: REMOTE2 ?"));
  assert.ok(src.includes('provider: p === LOCAL ? "local" : p.rotulo'));
});
