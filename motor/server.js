/* API interna do motor — 127.0.0.1:8140 atrás do nginx. Primeira fatia: health
   (db + IA) e extração de teste. Endpoints de avaliação chegam nas Fases 3-4. */
import http from "node:http";
import { pool } from "./db.js";
import { aiProvider } from "./ai-provider.js";
import { extrairAnuncio } from "./extract.js";

const PORT = 8140;
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((ok, ko) => {
  let b = ""; req.on("data", c => { b += c; if (b.length > 1e6) { ko(new Error("body grande demais")); req.destroy(); } });
  req.on("end", () => ok(b)); req.on("error", ko);
});

http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/motor/health") {
      const db = await pool.query("SELECT count(*)::int AS migracoes FROM schema_migrations").then(r => r.rows[0]).catch(e => ({ erro: e.message }));
      const ia = await fetch((process.env.AI_BASE_URL || "http://localhost:11434") + "/api/version",
        { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(e => ({ erro: e.message }));
      return json(res, 200, { ok: true, db, ia, cadeia: aiProvider.status() });
    }
    if (req.method === "POST" && req.url === "/motor/extrair") {
      const { titulo, descricao, tier } = JSON.parse(await readBody(req) || "{}");
      if (!descricao) return json(res, 400, { erro: "descricao obrigatória" });
      const r2 = await extrairAnuncio({ titulo, descricao, tier });
      return json(res, 200, r2);
    }
    json(res, 404, { erro: "rota desconhecida" });
  } catch (e) {
    json(res, 500, { erro: String(e.message).slice(0, 400) });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`radar-motor em 127.0.0.1:${PORT}`));
