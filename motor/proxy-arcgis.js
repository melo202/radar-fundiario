/* Proxy CORS do Radar Fundiário — encaminha SOMENTE para o ArcGIS público da
   Prefeitura de Goiânia (whitelist de prefixo), devolve com CORS e cacheia em memória.
   Só GET; nunca repassa body nem headers do cliente.

   AUD-03 (auditoria 20/07/2026) — este arquivo passou a viver NO REPO (antes só existia
   editado à mão em /opt/radar/proxy/server.js no VPS; deploy-api.sh agora o instala).
   Blindagem contra o upstream frágil (raiz do portalmapa já responde 403; se os endpoints
   REST caírem, o cadastro parava):
   - TTL fresco de 60 min (era 10) — dado cadastral muda em ciclo anual, não em minutos;
   - stale-if-error: entrada VENCIDA é mantida por até 7 dias e servida (X-Cache: STALE)
     quando o upstream falha (erro de rede, timeout, 4xx/5xx) — o acervo já visitado
     continua respondendo mesmo com a Prefeitura fora do ar;
   - teto de memória por BYTES (64 MB) além do teto de entradas, com despejo do mais velho;
   - /health expõe contadores do cache (hits, misses, stales) para a Sala de Máquinas. */
const http = require("http");
const https = require("https");
const UPSTREAM = "https://portalmapa.goiania.go.gov.br";
const PREFIX = "/servicogyn/rest/services/";
const TTL_FRESCO = 60 * 60 * 1000;          /* serve direto, sem consultar o upstream */
const TTL_STALE = 7 * 24 * 60 * 60 * 1000;  /* mantido só para stale-if-error */
const MAX_ENTRADAS = 500;
const MAX_BYTES = 64 * 1024 * 1024;
const cache = new Map(); /* Map preserva ordem de inserção — o 1º é sempre o mais velho */
let cacheBytes = 0;
const stats = { hits: 0, misses: 0, stales: 0, erros: 0 };

function evictAte(bytesNovos) {
  while (cache.size && (cache.size >= MAX_ENTRADAS || cacheBytes + bytesNovos > MAX_BYTES)) {
    const chave = cache.keys().next().value;
    cacheBytes -= cache.get(chave).body.length;
    cache.delete(chave);
  }
}
function guardar(chave, body) {
  if (body.length > 8e6) return;
  const velho = cache.get(chave);
  if (velho) { cacheBytes -= velho.body.length; cache.delete(chave); }
  evictAte(body.length);
  cache.set(chave, { t: Date.now(), body });
  cacheBytes += body.length;
}

const server = http.createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.url === "/health") {
    res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
    return res.end(JSON.stringify({ ok: true, cache: { entradas: cache.size, bytes: cacheBytes, ...stats } }));
  }
  if (req.method !== "GET" || !req.url.startsWith("/arcgis/")) { res.writeHead(404, cors); return res.end("not found"); }
  const path = req.url.slice("/arcgis".length);
  if (!path.startsWith(PREFIX)) { res.writeHead(403, cors); return res.end("fora do whitelist"); }
  const target = UPSTREAM + path;
  const hit = cache.get(target);
  const idade = hit ? Date.now() - hit.t : Infinity;
  if (hit && idade < TTL_FRESCO) {
    stats.hits++;
    res.writeHead(200, Object.assign({ "Content-Type": "application/json", "X-Cache": "HIT" }, cors));
    return res.end(hit.body);
  }
  /* stale-if-error: qualquer falha do upstream cai aqui — vencido ainda vale mais que nada */
  const serveStaleOu = (code, msg) => {
    if (hit && idade < TTL_STALE) {
      stats.stales++;
      res.writeHead(200, Object.assign({ "Content-Type": "application/json", "X-Cache": "STALE" }, cors));
      return res.end(hit.body);
    }
    stats.erros++;
    res.writeHead(code, cors); res.end(msg);
  };
  const up = https.get(target, { headers: { "User-Agent": "radar-fundiario-proxy" }, timeout: 30000 }, r2 => {
    const chunks = [];
    r2.on("data", c => chunks.push(c));
    r2.on("end", () => {
      const body = Buffer.concat(chunks);
      if (r2.statusCode === 200) {
        stats.misses++;
        guardar(target, body);
        res.writeHead(200, Object.assign({ "Content-Type": r2.headers["content-type"] || "application/json", "X-Cache": "MISS" }, cors));
        return res.end(body);
      }
      serveStaleOu(r2.statusCode, body.toString().slice(0, 400));
    });
    r2.on("error", e => serveStaleOu(502, "upstream: " + e.message));
  });
  up.on("error", e => serveStaleOu(502, "upstream: " + e.message));
  up.on("timeout", () => up.destroy(new Error("timeout")));
});
server.listen(8130, "127.0.0.1", () => console.log("radar-proxy em 127.0.0.1:8130"));
