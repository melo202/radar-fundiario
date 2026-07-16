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
const CSP = "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https://corretorinteligente.tech; connect-src 'self'";

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
  /* A3: mudanças de preço detectadas pelas varreduras — termômetro agregado do mercado */
  const mudancas = await pool.query(
    `SELECT detail, created_at FROM audit_log
     WHERE action='mudanca-preco' ORDER BY created_at DESC LIMIT 6`).then(r => r.rows);
  return { acervo, avaliacoes, ia, eventos, mudancas };
}

export async function painel(req, res) {
  if (!painelAtivo()) return json(res, 404, { erro: "rota desconhecida" }); /* SEG-05 */

  if (req.method === "GET" && (req.url === "/painel" || req.url === "/painel/")) {
    res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP, "Cache-Control": "no-store" }, SEC));
    return res.end(HTML);
  }
  if (req.method === "GET" && req.url === "/painel/limite.json") {
    /* dado público (limite IBGE) para o fundo Cidade Viva do login — servido daqui
       para o canvas não depender de CORS do domínio do app */
    try {
      const gj = readFileSync(new URL("./limite-goiania.json", import.meta.url));
      res.writeHead(200, Object.assign({ "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400" }, SEC));
      return res.end(gj);
    } catch { return json(res, 404, { erro: "limite indisponível" }); }
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
  if (req.method === "GET" && /^\/painel\/api\/avaliacoes\/[0-9a-f-]{36}$/.test(req.url)) {
    /* §14: dossiê de revisão — a avaliação + TODOS os comparáveis com rastreio */
    const id = req.url.split("/").pop();
    const v = await pool.query(
      "SELECT id, subject, status, result, version, parent_id, created_by, created_at FROM valuations WHERE id=$1", [id]);
    if (!v.rowCount) return json(res, 404, { erro: "avaliação não encontrada" });
    const comps = await pool.query(
      `SELECT vc.property_id, vc.total_score, vc.accepted, vc.is_outlier, vc.rejection_reasons, vc.manual_change,
              p.neighborhood, p.characteristics, p.pricing, l.portal, l.url
       FROM valuation_comparables vc
       JOIN properties p ON p.id = vc.property_id
       JOIN listings l ON l.id = p.listing_id
       WHERE vc.valuation_id=$1
       ORDER BY vc.accepted DESC, vc.total_score DESC NULLS LAST`, [id]);
    return json(res, 200, { ...v.rows[0], comparaveis: comps.rows });
  }
  if (req.method === "GET" && req.url === "/painel/api/vendas") {
    /* SV-1: vendas em acompanhamento (sem PII — apelido + etapas apenas) */
    const { listarVendas } = await import("./vendas.js");
    return json(res, 200, { vendas: await listarVendas() });
  }
  /* POSTs autenticados exigem o token CSRF (SEG-04) */
  if (req.method === "POST" && !csrfOk(req, sessao)) return json(res, 403, { erro: "csrf" });

  /* SV-1: criar/atualizar o acompanhamento que o CLIENTE vê em /acompanhe/<token> */
  if (req.method === "POST" && req.url === "/painel/api/vendas") {
    const { criarVenda, mensagemEtapa, buscarVenda } = await import("./vendas.js");
    const { apelido, corretor } = JSON.parse(await readBody(req) || "{}");
    const r = await criarVenda(apelido, corretor);
    if (r.erro) return json(res, 400, r);
    return json(res, 200, { token: r.token, mensagem: mensagemEtapa(await buscarVenda(r.token)) });
  }
  if (req.method === "POST" && /^\/painel\/api\/vendas\/[A-Za-z0-9_-]{16}\/etapa$/.test(req.url)) {
    const { marcarEtapa, mensagemEtapa, buscarVenda } = await import("./vendas.js");
    const token = req.url.split("/")[4];
    const { etapa, obs, desfazer } = JSON.parse(await readBody(req) || "{}");
    const r = await marcarEtapa(token, etapa, obs, !!desfazer);
    if (r.erro) return json(res, 400, r);
    return json(res, 200, { ok: true, mensagem: mensagemEtapa(await buscarVenda(token)) });
  }
  if (req.method === "POST" && /^\/painel\/api\/vendas\/[A-Za-z0-9_-]{16}\/excluir$/.test(req.url)) {
    const { excluirVenda } = await import("./vendas.js");
    return json(res, 200, await excluirVenda(req.url.split("/")[4]));
  }

  if (req.method === "POST" && req.url === "/painel/sair") {
    return json(res, 200, { ok: true }, { "Set-Cookie": cookieLimpa() });
  }
  if (req.method === "POST" && req.url === "/painel/api/requalificar") {
    const { requalificarAcervo } = await import("./requalificar.js");
    return json(res, 200, await requalificarAcervo());
  }
  if (req.method === "POST" && /^\/painel\/api\/avaliacoes\/[0-9a-f-]{36}\/revisar$/.test(req.url)) {
    /* §14: exclusões do corretor SEMPRE registradas (manual_change na avaliação
       original) + recálculo como VERSÃO nova encadeada — nada é sobrescrito */
    const id = req.url.split("/")[4];
    const { exclusoes } = JSON.parse(await readBody(req) || "{}");
    if (!Array.isArray(exclusoes) || !exclusoes.length) return json(res, 400, { erro: "exclusoes obrigatórias" });
    const v = await pool.query("SELECT subject, status FROM valuations WHERE id=$1", [id]);
    if (!v.rowCount) return json(res, 404, { erro: "avaliação não encontrada" });
    if (v.rows[0].status !== "calculada") return json(res, 400, { erro: "avaliação sem resultado para revisar" });
    for (const ex of exclusoes) {
      await pool.query(
        `UPDATE valuation_comparables SET manual_change=$1 WHERE valuation_id=$2 AND property_id=$3`,
        [JSON.stringify({ acao: "excluido", motivo: String(ex.motivo || "sem motivo informado").slice(0, 300),
          por: "corretor-painel", quando: new Date().toISOString() }), id, ex.propertyId]);
    }
    const { avaliar } = await import("./avaliacao.js");
    const novo = await avaliar(v.rows[0].subject, {
      excluirIds: exclusoes.map(e => e.propertyId),
      parentId: id, createdBy: "corretor-painel",
      notaRevisao: `Revisão manual do corretor: ${exclusoes.length} comparável(is) excluído(s) da amostra, com motivo registrado.`,
    });
    await pool.query(
      "INSERT INTO audit_log (entity, entity_id, action, detail, actor) VALUES ('valuations',$1,'revisao-corretor',$2,'corretor-painel')",
      [id, JSON.stringify({ exclusoes, novaVersao: novo.id || null, status: novo.status })]).catch(() => {});
    return json(res, 200, novo);
  }
  return json(res, 404, { erro: "rota desconhecida" });
}
