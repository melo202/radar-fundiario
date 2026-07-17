/* API interna do motor — 127.0.0.1:8140 atrás do nginx.
   Fase 2: health + extração. Fase 3 (fonte A): ingestão + leitura de imóveis.
   Endpoints que GASTAM COTA (Brave/Groq) exigem o token interno MOTOR_TOKEN
   (Authorization: Bearer ...) — o health e a leitura são públicos. */
import http from "node:http";
import { pool } from "./db.js";
import { aiProvider } from "./ai-provider.js";
import { extrairAnuncio } from "./extract.js";
import { ingerir } from "./ingerir.js";

const PORT = 8140;
/* CORS: o app em corretorinteligente.tech (e o Pages de teste) consome as rotas de
   leitura e a avaliação determinística direto do navegador. */
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
/* SEG-03: cabeçalhos de segurança em TODA resposta do motor (o nginx cobre o site estático) */
const SEC = { "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" };
const json = (res, code, obj) => { res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8" }, SEC, CORS)); res.end(JSON.stringify(obj)); };
/* rate limit por IP e POR ROTA (aprendido em produção: balde único fazia uma chamada de
   avaliação consumir o limite do resumo — cada rota tem seu escopo) */
const RATE = new Map();
function estourou(req, limite = 10, escopo = "geral") {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "?";
  const chave = `${escopo}:${ip}`;
  const agora = Date.now();
  const usos = (RATE.get(chave) || []).filter(t => agora - t < 60000);
  usos.push(agora); RATE.set(chave, usos);
  if (RATE.size > 5000) RATE.clear(); /* válvula de memória */
  return usos.length > limite;
}
const readBody = (req) => new Promise((ok, ko) => {
  let b = ""; req.on("data", c => { b += c; if (b.length > 1e6) { ko(new Error("body grande demais")); req.destroy(); } });
  req.on("end", () => ok(b)); req.on("error", ko);
});
const autorizado = (req) => {
  const t = process.env.MOTOR_TOKEN;
  if (!t) return false; /* sem token configurado, rotas de escrita ficam fechadas */
  return (req.headers.authorization || "") === `Bearer ${t}`;
};

http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
    if (req.url === "/painel" || req.url.startsWith("/painel/")) {
      /* SEG-01/05: painel do corretor — todo o subcaminho vive em painel.js; sem
         PAINEL_SENHA no .env ele responde o MESMO 404 de rota desconhecida */
      const { painel } = await import("./painel.js");
      return painel(req, res);
    }
    if (req.method === "GET" && req.url.startsWith("/acompanhe/")) {
      /* SV-1: página pública do CLIENTE (o nginx do domínio principal aponta para cá).
         Token aleatório é a única chave; sem listagem; HTML com noindex. Rate limit
         próprio — página de leitura, nunca gasta cota. */
      const { buscarVenda, paginaAcompanheHTML, paginaNaoEncontradaHTML } = await import("./vendas.js");
      if (estourou(req, 30, "acompanhe")) return json(res, 429, { erro: "muitas consultas — tente em 1 minuto" });
      const venda = await buscarVenda(decodeURIComponent(req.url.slice("/acompanhe/".length)).replace(/\/+$/, ""));
      res.writeHead(venda ? 200 : 404, Object.assign({ "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https://corretorinteligente.tech" }, SEC));
      return res.end(venda ? paginaAcompanheHTML(venda) : paginaNaoEncontradaHTML());
    }
    if (req.method === "GET" && req.url === "/motor/health") {
      const db = await pool.query("SELECT count(*)::int AS migracoes FROM schema_migrations").then(r => r.rows[0]).catch(e => ({ erro: e.message }));
      const ia = await fetch((process.env.AI_BASE_URL || "http://localhost:11434") + "/api/version",
        { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(e => ({ erro: e.message }));
      const acervo = await pool.query("SELECT (SELECT count(*)::int FROM listings) AS anuncios, (SELECT count(*)::int FROM properties) AS imoveis").then(r => r.rows[0]).catch(() => null);
      return json(res, 200, { ok: true, db, ia, cadeia: aiProvider.status(), acervo, busca: !!process.env.BRAVE_API_KEY });
    }
    if (req.method === "GET" && req.url.startsWith("/motor/imoveis")) {
      const u = new URL(req.url, "http://x");
      const lim = Math.min(Number(u.searchParams.get("limit") || 20), 100);
      const soComparaveis = u.searchParams.get("grau") === "comparavel";
      const r2 = await pool.query(
        `SELECT p.id, l.portal, l.url, p.neighborhood, p.property_type, p.characteristics, p.pricing, p.quality, p.created_at
         FROM properties p JOIN listings l ON l.id = p.listing_id
         ${soComparaveis ? "WHERE (p.quality->>'comparableGrade')::boolean IS TRUE" : ""}
         ORDER BY p.created_at DESC LIMIT $1`, [lim]);
      return json(res, 200, { total: r2.rowCount, imoveis: r2.rows });
    }
    if (req.method === "POST" && req.url === "/motor/geocodificar-acervo") {
      if (!autorizado(req)) return json(res, 401, { erro: "token" });
      /* retroativo e determinístico (CNEFE local, zero IA): tenta dar coordenada a todo
         imóvel do acervo que ainda não tem geom, a partir do texto bruto do anúncio */
      const { geocodificarAnuncio } = await import("./geo-anuncio.js");
      const sem = await pool.query(
        `SELECT p.id, p.neighborhood, l.raw_title AS titulo, l.raw_description AS descricao
         FROM properties p JOIN listings l ON l.id = p.listing_id WHERE p.geom IS NULL`);
      const stats = { total: sem.rowCount, geocodificados: 0, porPrecisao: {} };
      for (const row of sem.rows) {
        const geo = await geocodificarAnuncio(row).catch(() => null);
        if (!geo) continue;
        await pool.query(
          `UPDATE properties SET geom=ST_SetSRID(ST_MakePoint($1,$2),4326), location_confidence=$3,
                  extraction = COALESCE(extraction,'{}'::jsonb) || $4, updated_at=now() WHERE id=$5`,
          [geo.lon, geo.lat, geo.confidence,
            JSON.stringify({ geocodificacao: { fonte: "cnefe-2022", precisao: geo.precisao,
              rua: geo.ruaDetectada, numero: geo.numeroDetectado, localidade: geo.localidadeCnefe } }),
            row.id]);
        stats.geocodificados++;
        stats.porPrecisao[geo.precisao] = (stats.porPrecisao[geo.precisao] || 0) + 1;
      }
      await pool.query(
        "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('properties','*','geocodificacao-acervo',$1)",
        [JSON.stringify(stats)]).catch(() => {});
      return json(res, 200, stats);
    }
    if (req.method === "POST" && req.url === "/motor/requalificar") {
      if (!autorizado(req)) return json(res, 401, { erro: "token" });
      /* retroativo e determinístico — lógica extraída para requalificar.js (o painel
         SEG-01 usa a MESMA função; nunca duas implementações da peneira) */
      const { requalificarAcervo } = await import("./requalificar.js");
      return json(res, 200, await requalificarAcervo());
    }
    if (req.method === "POST" && req.url === "/motor/extrair") {
      if (!autorizado(req)) return json(res, 401, { erro: "token" });
      const { titulo, descricao, tier } = JSON.parse(await readBody(req) || "{}");
      if (!descricao) return json(res, 400, { erro: "descricao obrigatória" });
      return json(res, 200, await extrairAnuncio({ titulo, descricao, tier }));
    }
    if (req.method === "POST" && req.url === "/motor/ingerir") {
      if (!autorizado(req)) return json(res, 401, { erro: "token" });
      const { consulta, paginas, tier } = JSON.parse(await readBody(req) || "{}");
      if (!consulta) return json(res, 400, { erro: "consulta obrigatória" });
      return json(res, 200, await ingerir({ consulta, paginas, tier }));
    }
    if (req.method === "GET" && req.url.startsWith("/motor/localizacao")) {
      /* determinístico (só PostGIS local): público com o mesmo rate limit do avaliar */
      if (estourou(req, 20, "localizacao")) return json(res, 429, { erro: "muitas consultas — aguarde 1 minuto" });
      const u = new URL(req.url, "http://x");
      const lat = Number(u.searchParams.get("lat")), lon = Number(u.searchParams.get("lon"));
      if (!isFinite(lat) || !isFinite(lon)) return json(res, 400, { erro: "lat e lon obrigatórios" });
      const { entorno } = await import("./localizacao.js");
      return json(res, 200, await entorno({ lat, lon }));
    }
    if (req.method === "GET" && req.url.startsWith("/motor/geocodificar")) {
      /* determinístico (CNEFE local, zero cota): público, mesmo espírito do localizacao */
      if (estourou(req, 30, "geocodificar")) return json(res, 429, { erro: "muitas consultas — aguarde 1 minuto" });
      const u = new URL(req.url, "http://x");
      if (!u.searchParams.get("rua")) return json(res, 400, { erro: "rua obrigatória" });
      const { geocodificar } = await import("./geocodificar.js");
      return json(res, 200, await geocodificar({
        rua: u.searchParams.get("rua"),
        numero: u.searchParams.get("numero"),
        bairro: u.searchParams.get("bairro"),
      }));
    }
    if (req.method === "GET" && req.url.startsWith("/motor/estimativa")) {
      /* estimativa IMEDIATA pelo índice de bairro (Mercado em Movimento 17/07):
         determinístico, só banco+cache — é o valor que o mapa mostra na hora */
      if (estourou(req, 30, "estimativa")) return json(res, 429, { erro: "muitas consultas — aguarde 1 minuto" });
      const u = new URL(req.url, "http://x");
      const { estimar } = await import("./indice-bairro.js");
      return json(res, 200, await estimar({
        bairro: u.searchParams.get("bairro"),
        tipo: u.searchParams.get("tipo"),
        areaM2: u.searchParams.get("areaM2"),
      }));
    }
    if (req.method === "GET" && req.url.startsWith("/motor/mercado/bairros")) {
      /* índice completo (painel/mapa): mediana de R$/m² por bairro+tipo, deduplicado */
      if (estourou(req, 10, "indice-bairros")) return json(res, 429, { erro: "muitas consultas — aguarde 1 minuto" });
      const { indiceBairros } = await import("./indice-bairro.js");
      return json(res, 200, { indice: await indiceBairros() });
    }
    if (req.method === "POST" && req.url === "/motor/ingestao/caixa") {
      /* ingestão da lista da Caixa (projeto Oportunidades): o VPS recebe 403 do Radware,
         então o runner residencial baixa o CSV já geocodificado e faz POST aqui. Token
         interno — nunca público (escreve no acervo). */
      if (!autorizado(req)) return json(res, 401, { erro: "token" });
      const payload = JSON.parse(await readBody(req) || "{}");
      const { ingerirCaixa } = await import("./oportunidades.js");
      return json(res, 200, await ingerirCaixa(payload));
    }
    if (req.method === "GET" && req.url === "/motor/oportunidades") {
      /* leitura pública para o mapa: imóveis da Caixa ativos + desconto vs índice do
         bairro + avisos por modalidade. Determinístico, só banco+cache. */
      if (estourou(req, 30, "oportunidades")) return json(res, 429, { erro: "muitas consultas — aguarde 1 minuto" });
      const { listarOportunidades } = await import("./oportunidades.js");
      return json(res, 200, await listarOportunidades());
    }
    if (req.method === "POST" && req.url === "/motor/mercado") {
      /* avaliação AO VIVO: dispara busca nos portais (gasta cota Brave) e avalia.
         cache de 6h por bairro protege a cota global; rate limit por IP protege o pico */
      if (!autorizado(req) && estourou(req, 4, "mercado")) return json(res, 429, { erro: "aguarde 1 minuto entre buscas ao vivo" });
      const subject = JSON.parse(await readBody(req) || "{}");
      const { avaliarAoVivo } = await import("./mercado-aovivo.js");
      return json(res, 200, await avaliarAoVivo(subject));
    }
    if (req.method === "POST" && req.url === "/motor/avaliar") {
      /* determinístico (só banco, sem IA/busca): público com rate limit p/ o app */
      if (!autorizado(req) && estourou(req, 10, "avaliar")) return json(res, 429, { erro: "muitas avaliações — aguarde 1 minuto" });
      const subject = JSON.parse(await readBody(req) || "{}");
      const { avaliar } = await import("./avaliacao.js");
      return json(res, 200, await avaliar(subject));
    }
    if (req.method === "POST" && /^\/motor\/avaliacoes\/[0-9a-f-]{36}\/parecer$/.test(req.url)) {
      const id = req.url.split("/")[3];
      /* parecer JÁ gerado é leitura pública (cache por avaliação — gera uma vez, serve sempre) */
      const jaTem = await pool.query("SELECT result->'parecer' AS parecer FROM valuations WHERE id=$1", [id]);
      if (jaTem.rowCount && jaTem.rows[0].parecer) return json(res, 200, { id, parecer: jaTem.rows[0].parecer, fromCache: true });
      /* gerar gasta IA: token OU público com limite apertado (2/min por IP) */
      if (!autorizado(req) && estourou(req, 2, "parecer")) return json(res, 429, { erro: "aguarde 1 minuto para gerar outro parecer" });
      const { gerarParecer } = await import("./redacao.js");
      return json(res, 200, await gerarParecer(id));
    }
    if (req.method === "POST" && req.url === "/motor/localizacao/resumo") {
      /* gera IA só para coordenada nova (ai_cache) — público com limite apertado */
      if (!autorizado(req) && estourou(req, 3, "resumo")) return json(res, 429, { erro: "aguarde 1 minuto" });
      const { lat, lon } = JSON.parse(await readBody(req) || "{}");
      if (!isFinite(lat) || !isFinite(lon)) return json(res, 400, { erro: "lat e lon obrigatórios" });
      const { resumirEntorno } = await import("./resumo-entorno.js");
      return json(res, 200, await resumirEntorno({ lat, lon }));
    }
    if (req.method === "GET" && /^\/motor\/avaliacoes\/[0-9a-f-]{36}\/documento$/.test(req.url)) {
      /* §24: documento apresentável da avaliação — leitura pública renderizada do banco */
      if (estourou(req, 30, "documento")) return json(res, 429, { erro: "muitas consultas — aguarde 1 minuto" });
      const { documentoDaAvaliacao } = await import("./documento.js");
      const htmlDoc = await documentoDaAvaliacao(req.url.split("/")[3]);
      if (!htmlDoc) return json(res, 404, { erro: "avaliação não encontrada" });
      res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https://corretorinteligente.tech" }, SEC));
      return res.end(htmlDoc);
    }
    if (req.method === "GET" && /^\/motor\/avaliacoes\/[0-9a-f-]{36}$/.test(req.url)) {
      const id = req.url.split("/").pop();
      const r2 = await pool.query("SELECT id, subject, status, result, created_at FROM valuations WHERE id=$1", [id]);
      if (!r2.rowCount) return json(res, 404, { erro: "avaliação não encontrada" });
      return json(res, 200, r2.rows[0]);
    }
    if (req.method === "POST" && req.url === "/motor/varrer") {
      if (!autorizado(req)) return json(res, 401, { erro: "token" });
      const { bairros, paginas, tier } = JSON.parse(await readBody(req) || "{}");
      const { varrer } = await import("./varredura.js");
      return json(res, 200, await varrer({ ...(bairros ? { bairros } : {}), paginas, tier }));
    }
    json(res, 404, { erro: "rota desconhecida" });
  } catch (e) {
    /* módulos sinalizam erro de USO com e.status (400 etc.) — devolver 500 neles
       quebrava o contrato da rota pública (revisão 17/07) */
    json(res, Number.isInteger(e.status) ? e.status : 500, { erro: String(e.message).slice(0, 400) });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`radar-motor em 127.0.0.1:${PORT}`));
