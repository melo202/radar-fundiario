/* Painel do corretor (SEG-01) — handler completo de /painel*, isolado do server.js.
   Regra número um (SEG-05): sem PAINEL_SENHA no .env, TUDO aqui responde o mesmo 404
   das rotas desconhecidas — o painel não existe, nem para sondagem. */
import { readFileSync } from "node:fs";
import { pool } from "./db.js";
import {
  painelAtivo, verificaSenha, criaSessao, cookieSessao, cookieLimpa,
  sessaoDe, csrfDe, csrfOk, bloqueado, registraFalha, tentativasRestantes,
} from "./auth.js";

const HTML = readFileSync(new URL("./painel.html", import.meta.url), "utf-8");
/* SEG-03 no que o Node serve; o nginx cobre o restante do site */
const SEC = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
const CSP = "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";

const json = (res, code, obj, extra = {}) => {
  res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8" }, SEC, extra));
  res.end(JSON.stringify(obj));
};
const readBody = (req) => new Promise((ok, ko) => {
  let b = ""; req.on("data", c => { b += c; if (b.length > 1e5) { ko(new Error("body grande demais")); req.destroy(); } });
  req.on("end", () => ok(b)); req.on("error", ko);
});
const ipDe = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "?";

async function visao() {
  const acervo = await pool.query(
    `SELECT (SELECT count(*)::int FROM listings) AS anuncios,
            (SELECT count(*)::int FROM properties) AS imoveis,
            (SELECT count(*)::int FROM properties WHERE (quality->>'comparableGrade')::boolean) AS comparaveis,
            (SELECT count(*)::int FROM enderecos) AS enderecos,
            (SELECT count(*)::int FROM pois) AS pois`).then(r => r.rows[0]);
  const avaliacoes = await pool.query(
    `SELECT id, subject->>'neighborhood' AS bairro, subject->>'propertyType' AS tipo,
            result->>'estimatedValue' AS valor, result->'confidence'->>'rotulo' AS confianca,
            status, created_at
     FROM valuations ORDER BY created_at DESC LIMIT 8`).then(r => r.rows);
  const ia = await pool.query(
    `SELECT task, model, ok, duration_ms, created_at
     FROM ai_logs ORDER BY created_at DESC LIMIT 10`).then(r => r.rows);
  const eventos = await pool.query(
    `SELECT entity, action, detail, created_at
     FROM audit_log ORDER BY created_at DESC LIMIT 8`).then(r => r.rows);
  return { acervo, avaliacoes, ia, eventos };
}

export async function painel(req, res) {
  if (!painelAtivo()) return json(res, 404, { erro: "rota desconhecida" }); /* SEG-05 */

  if (req.method === "GET" && (req.url === "/painel" || req.url === "/painel/")) {
    res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP, "Cache-Control": "no-store" }, SEC));
    return res.end(HTML);
  }

  if (req.method === "POST" && req.url === "/painel/entrar") {
    const ip = ipDe(req);
    if (bloqueado(ip)) return json(res, 429, { erro: "Muitas tentativas. Aguarde 5 minutos." });
    const { senha } = JSON.parse(await readBody(req) || "{}");
    if (!verificaSenha(senha)) {
      registraFalha(ip);
      const resta = tentativasRestantes(ip);
      return json(res, 401, { erro: "Senha incorreta." + (resta <= 2 ? ` ${resta} tentativa(s) antes do bloqueio.` : "") });
    }
    return json(res, 200, { ok: true }, { "Set-Cookie": cookieSessao(criaSessao()) });
  }

  /* daqui para baixo, tudo exige sessão válida */
  const sessao = sessaoDe(req);
  if (!sessao) return json(res, 401, { erro: "entre com a senha" });

  if (req.method === "GET" && req.url === "/painel/api/visao") {
    return json(res, 200, Object.assign(await visao(), { csrf: csrfDe(sessao) }));
  }
  /* POSTs autenticados exigem o token CSRF (SEG-04) */
  if (req.method === "POST" && !csrfOk(req, sessao)) return json(res, 403, { erro: "csrf" });

  if (req.method === "POST" && req.url === "/painel/sair") {
    return json(res, 200, { ok: true }, { "Set-Cookie": cookieLimpa() });
  }
  if (req.method === "POST" && req.url === "/painel/api/requalificar") {
    const { requalificarAcervo } = await import("./requalificar.js");
    return json(res, 200, await requalificarAcervo());
  }
  return json(res, 404, { erro: "rota desconhecida" });
}
