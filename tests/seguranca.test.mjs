// SEGURANÇA (SEG-01..07) — espelho do test_security.py do swisstony-bot, no padrão
// do repo: o módulo de autenticação é importável e testado DE VERDADE (crypto puro,
// sem rede); o restante por asserções de string sobre os fontes.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("SEG-01: senha com PBKDF2 100k + comparação em tempo constante", () => {
  const auth = src("../motor/auth.js");
  assert.ok(auth.includes('pbkdf2Sync(SENHA, SAL, 100_000, 32, "sha256")'));
  assert.ok(auth.includes("timingSafeEqual"));
  assert.ok(!/==\s*senha|senha\s*===/.test(auth), "nunca comparação simples de senha");
});

test("SEG-01: cookie de sessão assinado e com os três atributos", () => {
  const auth = src("../motor/auth.js");
  assert.ok(auth.includes("HttpOnly; Secure; SameSite=Lax"));
  assert.match(auth, /createHmac\("sha256", SECRET\)/);
  assert.ok(auth.includes("Max-Age=0"), "logout limpa o cookie");
});

test("SEG-02: lockout 5/IP + teto global 50 com poda (memória limitada)", async () => {
  const auth = src("../motor/auth.js");
  assert.ok(auth.includes("MAX_IP = 5, MAX_GLOBAL = 50, JANELA_MS = 300_000"));
  assert.ok(auth.includes("poda dos IPs antigos"));
  /* comportamento real: 5 falhas bloqueiam o IP, outro IP segue livre */
  const m = await import("../motor/auth.js");
  for (let i = 0; i < 5; i++) {
    assert.equal(m.bloqueado("10.0.0.1"), false, `tentativa ${i + 1} ainda permitida`);
    m.registraFalha("10.0.0.1");
  }
  assert.equal(m.bloqueado("10.0.0.1"), true, "6ª tentativa bloqueada");
  assert.equal(m.bloqueado("10.0.0.2"), false, "outro IP não é punido");
});

test("SEG-05: sem senha no ambiente, painel não existe e login nunca passa", async () => {
  const m = await import("../motor/auth.js"); /* suite roda sem PAINEL_SENHA */
  assert.equal(m.painelAtivo(), false);
  assert.equal(m.verificaSenha("qualquer"), false);
  const painel = src("../motor/painel.js");
  assert.ok(painel.includes('if (!painelAtivo()) return json(res, 404, { erro: "rota desconhecida" })'),
    "404 idêntico ao de rota desconhecida — indistinguível para sondagem");
});

test("SEG-04: todo POST autenticado do painel exige X-CSRF-Token", () => {
  const painel = src("../motor/painel.js");
  assert.ok(painel.includes('req.method === "POST" && !csrfOk(req, sessao)'));
  const auth = src("../motor/auth.js");
  assert.ok(auth.includes('req.headers["x-csrf-token"]'));
});

test("SEG-03: cabeçalhos de segurança nas respostas do motor e do painel", () => {
  for (const arq of ["../motor/server.js", "../motor/painel.js"]) {
    const s = src(arq);
    assert.ok(s.includes('"X-Frame-Options": "DENY"'), arq);
    assert.ok(s.includes('"X-Content-Type-Options": "nosniff"'), arq);
    assert.ok(s.includes('"Referrer-Policy": "strict-origin-when-cross-origin"'), arq);
  }
  assert.ok(src("../motor/painel.js").includes("Content-Security-Policy"), "CSP na página do painel");
});

test("SEG-06: SQL do motor é 100% parametrizado (placeholders $n, nunca input em template)", () => {
  /* um template literal com ${...} dentro de pool.query só é aceito quando interpola
     CONSTANTE do próprio código (filtros fixos) — nunca req/body/params do usuário */
  for (const arq of ["server.js", "painel.js", "geocodificar.js", "avaliacao.js", "localizacao.js", "requalificar.js"]) {
    const s = src(`../motor/${arq}`);
    for (const m of s.matchAll(/pool\.query\([^;]*?\$\{([^}]+)\}/gs)) {
      assert.ok(!/req\.|body|searchParams|senha/.test(m[1]),
        `${arq}: interpolação suspeita em SQL: ${m[1]}`);
    }
  }
});

test("SEG-07: .env.example versionado, sem nenhum valor real de segredo", () => {
  const env = src("../motor/.env.example");
  for (const v of ["DATABASE_URL", "MOTOR_TOKEN", "PAINEL_SENHA", "PAINEL_SECRET", "BRAVE_API_KEY", "AI_REMOTE_API_KEY"]) {
    assert.ok(env.includes(v), `documenta ${v}`);
  }
  assert.ok(!/gsk_\w{10,}|BSA\w{10,}|nvapi-\w{5,}/.test(env), "nenhuma chave real");
});
