/* Painel do corretor (SEG-01) — handler completo de /painel*, isolado do server.js.
   Regra número um (SEG-05): sem PAINEL_SENHA no .env, TUDO aqui responde o mesmo 404
   das rotas desconhecidas — o painel não existe, nem para sondagem. */
import { createReadStream, readFileSync } from "node:fs";
import { pool } from "./db.js";
import {
  painelAtivo, verificaSenha, criaSessao, cookieSessao, cookieLimpa,
  sessaoDe, csrfDe, csrfOk, bloqueado, registraFalha, tentativasRestantes,
} from "./auth.js";

const HTML_BASE = readFileSync(new URL("./painel.html", import.meta.url), "utf-8");
/* OS-01: o braço operacional precisa ser descoberto sem conhecer uma URL secreta. A injeção
   é deliberadamente isolada do painel.html legado para manter a base ultrapremium intacta. */
const HTML = HTML_BASE.replace("<main>", `<main>
    <div class="card" style="border-color:#9edbd5;background:linear-gradient(135deg,#fff,#effaf8)">
      <h2>Corretor Inteligente OS — alpha</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Abra a nova experiência orientada ao seu dia: Hoje, Carteira, Relacionamentos e Captura universal.</p>
      <a href="/painel/os" style="display:inline-block;text-decoration:none;font-weight:700;background:linear-gradient(135deg,#088780,#19A99A);color:#fff;border-radius:9px;padding:10px 16px">Abrir meu dia</a>
    </div>`);
/* OS-01: shell operacional isolado; o painel técnico legado continua intacto. */
const OS_HTML = readFileSync(new URL("./os.html", import.meta.url), "utf-8");
const OS_CSS = readFileSync(new URL("./os.css", import.meta.url), "utf-8");
const OS_JS = readFileSync(new URL("./os-app.js", import.meta.url), "utf-8");
const OS_MANIFEST = readFileSync(new URL("./os.webmanifest", import.meta.url), "utf-8");
/* SEG-03 no que o Node serve; o nginx cobre o restante do site */
const SEC = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
const CSP = "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https://corretorinteligente.tech; connect-src 'self'";
const OS_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://corretorinteligente.tech; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'";

const json = (res, code, obj, extra = {}) => {
  res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8" }, SEC, extra));
  res.end(JSON.stringify(obj));
};
const readBody = (req) => new Promise((ok, ko) => {
  let b = ""; req.on("data", c => { b += c; if (b.length > 1e5) { ko(new Error("body grande demais")); req.destroy(); } });
  req.on("end", () => ok(b)); req.on("error", ko);
});
const readBinaryBody = (req, maxBytes) => new Promise((ok, ko) => {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > maxBytes) { req.resume(); return ko(new Error("O arquivo passa de 8 MB.")); }
  const chunks = []; let total = 0, tooLarge = false;
  req.on("data", chunk => {
    total += chunk.length;
    if (total > maxBytes) { tooLarge = true; chunks.length = 0; }
    else if (!tooLarge) chunks.push(chunk);
  });
  req.on("end", () => tooLarge ? ko(new Error("O arquivo passa de 8 MB.")) : ok(Buffer.concat(chunks)));
  req.on("error", ko);
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
            CASE WHEN status='calculada' THEN result->>'estimatedValue' END AS valor,
            CASE WHEN status='calculada' THEN result->'confidence'->>'rotulo' END AS confianca,
            status, created_at
     FROM valuations ORDER BY created_at DESC LIMIT 8`).then(r => r.rows);
  const ia = await pool.query(
    `SELECT task, model, ok, duration_ms, created_at
     FROM ai_logs ORDER BY created_at DESC LIMIT 10`).then(r => r.rows);
  const eventos = await pool.query(
    `SELECT entity, action, detail, created_at
     FROM audit_log ORDER BY created_at DESC LIMIT 8`).then(r => r.rows);
  /* A3: mudanças de preço detectadas pelas varreduras — termômetro agregado do mercado.
     Só entram as VERIFICADAS (identidade portal+external_id, ambas as coletas
     comparáveis, salto ≤50%); as antigas por URL de catálogo foram invalidadas 17/07. */
  const mudancas = await pool.query(
    `SELECT detail, created_at FROM audit_log
     WHERE action='mudanca-preco' AND (detail->>'verificada')::boolean IS TRUE
       AND detail->>'invalidada' IS NULL
     ORDER BY created_at DESC LIMIT 6`).then(r => r.rows);
  const suspeitas = await pool.query(
    `SELECT count(*)::int AS n FROM audit_log WHERE action='mudanca-preco-suspeita'`)
    .then(r => r.rows[0].n);
  /* Oportunidades em movimento (Caixa/leilão): feed de eventos + contadores do acervo */
  const oportunidades = await pool.query(
    `SELECT entity_id, action, detail, created_at FROM audit_log
     WHERE entity='oportunidade' AND action <> 'ingestao-caixa'
     ORDER BY created_at DESC LIMIT 8`).then(r => r.rows);
  const oportAcervo = await pool.query(
    `SELECT count(*) FILTER (WHERE situacao='ativo')::int AS ativos,
            count(*) FILTER (WHERE situacao='ativo' AND x_utm IS NOT NULL)::int AS plotaveis,
            max(gerado_em) AS gerado
     FROM oportunidades WHERE fonte='caixa'`).then(r => r.rows[0]).catch(() => null);
  return { acervo, avaliacoes, ia, eventos, mudancas, suspeitas, oportunidades, oportAcervo };
}

export async function painel(req, res) {
  if (!painelAtivo()) return json(res, 404, { erro: "rota desconhecida" }); /* SEG-05 */

  if (req.method === "GET" && (req.url === "/painel" || req.url === "/painel/")) {
    /* Quem já entrou vai direto ao produto. O painel técnico existe em /painel/admin,
       fora da navegação cotidiana, para o cérebro não parecer a página principal. */
    if (sessaoDe(req)) {
      res.writeHead(303, Object.assign({ Location: "/painel/os", "Cache-Control": "no-store" }, SEC));
      return res.end();
    }
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
  if (req.method === "GET" && req.url === "/painel/os.webmanifest") {
    /* Manifest do PWA "Seu dia" — público de propósito: o fetch do <link rel="manifest">
       não envia cookies, então atrás do gate de sessão o prompt de instalação nunca
       apareceria. Contém só metadados de instalação; nenhum dado do corretor. */
    res.writeHead(200, Object.assign({ "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400" }, SEC));
    return res.end(OS_MANIFEST);
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
  if (!sessao) {
    if (req.method === "GET" && req.url === "/painel/os") {
      res.writeHead(303, Object.assign({ Location: "/painel", "Cache-Control": "no-store" }, SEC));
      return res.end();
    }
    return json(res, 401, { erro: "entre com a senha" });
  }

  if (req.method === "GET" && req.url === "/painel/admin") {
    res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP, "Cache-Control": "no-store" }, SEC));
    return res.end(HTML);
  }

  /* OS-01: aplicação operacional protegida pela mesma sessão do painel durante a fase alpha. */
  if (req.method === "GET" && req.url === "/painel/os") {
    res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": OS_CSP, "Cache-Control": "no-store" }, SEC));
    return res.end(OS_HTML);
  }
  if (req.method === "GET" && req.url === "/painel/os.css") {
    res.writeHead(200, Object.assign({ "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "no-store" }, SEC));
    return res.end(OS_CSS);
  }
  if (req.method === "GET" && req.url === "/painel/os.js") {
    res.writeHead(200, Object.assign({ "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store" }, SEC));
    return res.end(OS_JS);
  }

  if (req.method === "GET" && req.url === "/painel/api/visao") {
    return json(res, 200, Object.assign(await visao(), { csrf: csrfDe(sessao) }));
  }
  if (req.method === "GET" && req.url === "/painel/api/os/hoje") {
    const { visaoHoje } = await import("./os-core.js");
    return json(res, 200, Object.assign(await visaoHoje(), { csrf: csrfDe(sessao) }));
  }
  if (req.method === "GET" && req.url === "/painel/api/os/carteira") {
    const { listarCarteira } = await import("./os-core.js");
    return json(res, 200, await listarCarteira());
  }
  if (req.method === "GET" && req.url === "/painel/api/os/relacionamentos") {
    const { listarRelacionamentos } = await import("./os-core.js");
    return json(res, 200, await listarRelacionamentos());
  }
  if (req.method === "GET" && req.url === "/painel/api/os/melhorias") {
    const { listImprovementProposals } = await import("./agent-review.js");
    return json(res, 200, await listImprovementProposals());
  }
  if (req.method === "GET" && req.url === "/painel/api/os/inteligencia") {
    const { listIntelligenceOverview } = await import("./intelligence-orchestrator.js");
    return json(res, 200, await listIntelligenceOverview());
  }
  if (req.method === "GET" && req.url === "/painel/api/os/assistente/sessoes") {
    const { listAssistantSessions } = await import("./assistente.js");
    return json(res, 200, await listAssistantSessions());
  }
  if (req.method === "GET" && /^\/painel\/api\/os\/assistente\/sessoes\/[0-9a-f-]{36}$/.test(req.url)) {
    const { getAssistantHistory } = await import("./assistente.js");
    const r = await getAssistantHistory(req.url.split("/").pop());
    return json(res, r.ok ? 200 : 404, r);
  }
  if (req.method === "GET" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}$/.test(req.url)) {
    /* D-1: dossiê do imóvel da carteira — Visão geral · Comercial · Arquivos · Histórico */
    const { dossieImovel } = await import("./os-core.js");
    const r = await dossieImovel(req.url.split("/").pop());
    return json(res, r.ok ? 200 : 404, r);
  }
  if (req.method === "GET" && /^\/painel\/api\/os\/documentos\/[0-9a-f-]{36}\/arquivo$/.test(req.url)) {
    const { resolvePrivateDocument } = await import("./document-service.js");
    const document = await resolvePrivateDocument(req.url.split("/")[5]).catch(() => null);
    if (!document) return json(res, 404, { erro: "arquivo não encontrado" });
    res.writeHead(200, Object.assign({
      "Content-Type": document.mime_type,
      "Content-Length": String(document.byte_size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "Cache-Control": "private, no-store",
    }, SEC));
    return createReadStream(document.path).pipe(res);
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

  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/documentos$/.test(req.url)) {
    const { addPropertyDocument, MAX_DOCUMENT_BYTES } = await import("./document-service.js");
    let fileName = "documento";
    try { fileName = decodeURIComponent(String(req.headers["x-file-name"] || "documento")); } catch {}
    const buffer = await readBinaryBody(req, MAX_DOCUMENT_BYTES);
    const r = await addPropertyDocument(req.url.split("/")[5], {
      fileName, mimeType: req.headers["content-type"], buffer,
    });
    return json(res, r.ok ? 200 : 400, r);
  }

  if (req.method === "POST" && req.url === "/painel/api/os/inteligencia/investigar") {
    const { createIntelligenceJob } = await import("./intelligence-orchestrator.js");
    const { objective, scope, priority } = JSON.parse(await readBody(req) || "{}");
    const r = await createIntelligenceJob({ kind: "custom_research", objective, scope, priority });
    return json(res, r.ok ? 202 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/inteligencia\/investigar$/.test(req.url)) {
    const { requestPropertyInvestigation } = await import("./intelligence-orchestrator.js");
    const r = await requestPropertyInvestigation(req.url.split("/")[5]);
    return json(res, r.ok ? 202 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/inteligencia\/[0-9a-f-]{36}\/revisar$/.test(req.url)) {
    const { reviewPropertyFinding } = await import("./intelligence-orchestrator.js");
    const { decision, reason, correction, note } = JSON.parse(await readBody(req) || "{}");
    const parts = req.url.split("/");
    const r = await reviewPropertyFinding({ propertyId: parts[5], findingId: parts[7], decision, reason, correction, note });
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/inteligencia\/[0-9a-f-]{36}\/desfazer$/.test(req.url)) {
    const { undoIntelligenceFeedback } = await import("./intelligence-feedback.js");
    const parts = req.url.split("/");
    const r = await undoIntelligenceFeedback({ propertyId: parts[5], findingId: parts[7] });
    return json(res, r.ok ? 200 : 400, r);
  }

  if (req.method === "POST" && req.url === "/painel/api/os/assistente/sessoes") {
    const { createAssistantSession } = await import("./assistente.js");
    const r = await createAssistantSession(JSON.parse(await readBody(req) || "{}"));
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/assistente\/sessoes\/[0-9a-f-]{36}\/mensagens$/.test(req.url)) {
    const { sendAssistantMessage } = await import("./assistente.js");
    const { message } = JSON.parse(await readBody(req) || "{}");
    try {
      const r = await sendAssistantMessage(req.url.split("/")[6], message);
      return json(res, r.ok ? 200 : 400, r);
    } catch (error) {
      console.error("assistente indisponível:", String(error.message).slice(0, 300));
      return json(res, 503, { erro: "O assistente está indisponível agora. Seus dados não foram alterados." });
    }
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/melhorias\/[0-9a-f-]{36}\/revisar$/.test(req.url)) {
    const { reviewImprovementProposal } = await import("./agent-review.js");
    const { decision } = JSON.parse(await readBody(req) || "{}");
    const r = await reviewImprovementProposal(req.url.split("/")[5], decision);
    return json(res, r.ok ? 200 : 400, r);
  }

  /* OS-01: captura em duas etapas — interpretar não persiste; confirmar cria o cadastro. */
  if (req.method === "POST" && req.url === "/painel/api/os/captura/interpretar") {
    const { interpretarCaptura } = await import("./os-core.js");
    const { text } = JSON.parse(await readBody(req) || "{}");
    const r = interpretarCaptura(text);
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && req.url === "/painel/api/os/captura/confirmar") {
    const { confirmarCaptura } = await import("./os-core.js");
    const r = await confirmarCaptura(JSON.parse(await readBody(req) || "{}"));
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/tarefas\/[0-9a-f-]{36}\/concluir$/.test(req.url)) {
    const { concluirTarefa } = await import("./os-core.js");
    const r = await concluirTarefa(req.url.split("/")[5]);
    return json(res, r.ok ? 200 : 404, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/atualizar$/.test(req.url)) {
    /* D-1: whitelist no os-core decide o que pode mudar; pendências resolvidas se fecham sozinhas */
    const { atualizarImovel } = await import("./os-core.js");
    const r = await atualizarImovel(req.url.split("/")[5], JSON.parse(await readBody(req) || "{}"));
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/mercado$/.test(req.url)) {
    /* P1-B: busca usa o imóvel autenticado e liga a avaliação versionada à carteira. */
    const { pesquisarMercadoImovel } = await import("./os-core.js");
    const r = await pesquisarMercadoImovel(req.url.split("/")[5]);
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/imoveis\/[0-9a-f-]{36}\/oportunidade$/.test(req.url)) {
    const { criarOportunidade } = await import("./os-core.js");
    const r = await criarOportunidade(req.url.split("/")[5], JSON.parse(await readBody(req) || "{}"));
    return json(res, r.ok ? 200 : 400, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/oportunidades\/[0-9a-f-]{36}\/contato$/.test(req.url)) {
    /* D-3: "registrei contato" em 1 toque — só a data da interação; a conversa fica no WhatsApp */
    const { registrarContatoOportunidade } = await import("./os-core.js");
    const r = await registrarContatoOportunidade(req.url.split("/")[5]);
    return json(res, r.ok ? 200 : 404, r);
  }
  if (req.method === "POST" && /^\/painel\/api\/os\/oportunidades\/[0-9a-f-]{36}\/atualizar$/.test(req.url)) {
    /* D-2: funil — estágio/temperatura/próximo passo; "perdido" exige objeção tipificada */
    const { atualizarOportunidade } = await import("./os-core.js");
    const r = await atualizarOportunidade(req.url.split("/")[5], JSON.parse(await readBody(req) || "{}"));
    return json(res, r.ok ? 200 : 400, r);
  }

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
