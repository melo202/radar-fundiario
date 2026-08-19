/* Leitura EDUCADA de páginas públicas de anúncio (decisão revisada do usuário,
   19/08/2026 — antes: só snippets de buscador, "não fazemos scraping dos portais").
   Régua permanente, travada em teste:
   1. robots.txt do portal MANDA — path proibido nem é tentado;
   2. anti-bot (DataDome/Cloudflare/captcha) NUNCA é contornado — bloqueou, a gente
      registra o motivo e vai embora (a busca por API continua sendo o degrau pra esses);
   3. User-Agent identificável, 1 requisição por vez com pausa, teto de tamanho.
   Funções puras separadas do IO para a suíte testar sem rede. */

export const UA = "RadarFundiario/1.0 (+https://corretorinteligente.tech/como-usar.html; coleta respeitosa de anuncios publicos)";
export const PAUSA_MS = 2500; /* gentileza: nunca martela o portal */

/* ---------------- robots.txt (puro) ----------------
   Parser mínimo e honesto: grupos "User-agent: *" (o nosso UA desconhecido cai neles),
   Allow/Disallow por prefixo, vence o caminho MAIS LONGO; empate = Allow (convenção).
   Sem regra para o path = permitido. Sem robots = permitido. */
export function parseRobots(txt = "") {
  const regras = [], sitemaps = [];
  let ativo = false; /* estamos num bloco User-agent:* ? */
  for (const linhaBruta of String(txt).split(/\r?\n/)) {
    const linha = linhaBruta.replace(/#.*$/, "").trim();
    if (!linha) continue;
    const m = linha.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const campo = m[1].toLowerCase(), valor = m[2].trim();
    if (campo === "user-agent") { ativo = valor === "*"; continue; }
    if (campo === "sitemap") { if (valor) sitemaps.push(valor); continue; }
    if (!ativo) continue;
    if (campo === "disallow" && valor) regras.push({ allow: false, path: valor.replace(/\$/g, "") });
    if (campo === "allow" && valor) regras.push({ allow: true, path: valor.replace(/\$/g, "") });
  }
  return { regras, sitemaps };
}

export function robotsPermite(robotsTxt, caminho) {
  const { regras } = parseRobots(robotsTxt);
  let melhor = null;
  for (const r of regras) {
    const base = r.path.replace(/\*$/, "");
    if (!caminho.startsWith(base)) continue;
    if (!melhor || base.length > melhor.base.length) melhor = { ...r, base };
  }
  return melhor ? melhor.allow : true;
}

/* ---------------- HTML -> texto (puro) ---------------- */
const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—" };
export function htmlParaTexto(html = "", { max = 25000 } = {}) {
  let t = String(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  t = t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (s, ent) => {
    const e = ent.toLowerCase();
    if (e[0] === "#") {
      const cp = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : " ";
    }
    return ENTIDADES[e] ?? " ";
  });
  t = t.replace(/[ \t\f\v]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t.slice(0, max);
}

export function tituloDaPagina(html = "") {
  const m = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? htmlParaTexto(m[1], { max: 300 }) : "";
}

/* ---------------- IO educado ---------------- */
const robotsCache = new Map(); /* host -> { txt, em } */
export async function regrasRobots(host, { fetchImpl = fetch } = {}) {
  const hit = robotsCache.get(host);
  if (hit && hit.em > Date.now()) return hit.txt;
  let txt = "";
  try {
    const r = await fetchImpl(`https://${host}/robots.txt`, {
      headers: { "user-agent": UA }, signal: AbortSignal.timeout(10000), redirect: "follow" });
    if (r.ok) txt = await r.text();
    /* 4xx/5xx no robots = convencionalmente "sem restrição", mas registramos o status */
    else txt = `# status ${r.status}`;
  } catch { txt = "# inalcançavel"; }
  robotsCache.set(host, { txt, em: Date.now() + 6 * 3600e3 }); /* cache 6h */
  return txt;
}

async function textoLimitado(res, teto = 2_000_000) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = "", n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    out += dec.decode(value, { stream: true });
    if (n >= teto) { try { await reader.cancel(); } catch {} break; }
  }
  out += dec.decode();
  return out;
}

/* Busca UMA página de anúncio, com educação: robots primeiro, UA identificável,
   timeout, teto de bytes. Retorno nunca lança — o chamador decide o degrau seguinte. */
export async function buscarPagina(url, { fetchImpl = fetch } = {}) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, motivo: "url-invalida" }; }
  const robots = await regrasRobots(u.host, { fetchImpl });
  if (!robotsPermite(robots, u.pathname)) return { ok: false, motivo: "robots", status: 0 };
  let res;
  try {
    res = await fetchImpl(u.href, {
      headers: { "user-agent": UA, "accept": "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(20000), redirect: "follow" });
  } catch (e) { return { ok: false, motivo: "rede", erro: String(e?.message || e).slice(0, 200), status: 0 }; }
  if (!res.ok) return { ok: false, motivo: `http-${res.status}`, status: res.status }; /* 403/429 = anti-bot: NÃO insistir */
  const tipo = res.headers.get("content-type") || "";
  if (!/text\/html|xhtml/i.test(tipo)) return { ok: false, motivo: "nao-html", status: res.status };
  const html = await textoLimitado(res);
  /* sinais de parede de bot mesmo com 200 (DataDome costuma 403, mas há softened walls) */
  if (/datadome|captcha|are you a robot|cf-chl/i.test(html.slice(0, 5000)) && html.length < 30000)
    return { ok: false, motivo: "anti-bot", status: res.status };
  return { ok: true, status: res.status, html, texto: htmlParaTexto(html), titulo: tituloDaPagina(html) };
}
