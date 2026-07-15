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
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
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
    if (req.method === "GET" && req.url === "/motor/health") {
      const db = await pool.query("SELECT count(*)::int AS migracoes FROM schema_migrations").then(r => r.rows[0]).catch(e => ({ erro: e.message }));
      const ia = await fetch((process.env.AI_BASE_URL || "http://localhost:11434") + "/api/version",
        { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(e => ({ erro: e.message }));
      const acervo = await pool.query("SELECT (SELECT count(*)::int FROM listings) AS anuncios, (SELECT count(*)::int FROM properties) AS imoveis").then(r => r.rows[0]).catch(() => null);
      return json(res, 200, { ok: true, db, ia, cadeia: aiProvider.status(), acervo, busca: !!process.env.BRAVE_API_KEY });
    }
    if (req.method === "GET" && req.url.startsWith("/motor/imoveis")) {
      const lim = Math.min(Number(new URL(req.url, "http://x").searchParams.get("limit") || 20), 100);
      const r2 = await pool.query(
        `SELECT p.id, l.portal, l.url, p.neighborhood, p.property_type, p.characteristics, p.pricing, p.created_at
         FROM properties p JOIN listings l ON l.id = p.listing_id
         ORDER BY p.created_at DESC LIMIT $1`, [lim]);
      return json(res, 200, { total: r2.rowCount, imoveis: r2.rows });
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
    json(res, 404, { erro: "rota desconhecida" });
  } catch (e) {
    json(res, 500, { erro: String(e.message).slice(0, 400) });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`radar-motor em 127.0.0.1:${PORT}`));
