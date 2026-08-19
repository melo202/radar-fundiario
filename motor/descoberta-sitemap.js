/* Descoberta GRATUITA de anúncios via sitemap.xml (19/08/2026) — o substituto estrutural
   das APIs de busca pagas. Todo portal publica o índice oficial dos próprios anúncios
   para os buscadores: é público, feito para crawler, sem captcha e sem custo. A gente
   lê esse índice, filtra o que é anúncio de imóvel em Goiânia e registra em listings
   (fonte rastreável: raw_payload.fonte="sitemap"). O preço vem depois, pela leitura
   educada da página (ingerir-pagina.js) na revisita — aqui entra a IDENTIDADE e a
   prova de que o anúncio existe/continua no ar (last_seen_at anda a cada rodada).
   Educação: UA identificável, uma requisição por vez, tetos duros por portal. */

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pool } from "./db.js";
import { identidadeAnuncio, portalRaiz } from "./identidade-anuncio.js";
import { UA, regrasRobots, parseRobots } from "./fonte-pagina.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Portais priorizados pelo volume REAL na nossa base (19/08). O padrão de anúncio é
   propositalmente conservador: preferimos perder um anúncio a engolir página-catálogo
   (o bug das "mudanças de preço" de 17/07 nasceu exatamente de catálogo tratado como
   anúncio). Quem não casa aqui ainda entra pela busca, quando ela volta. */
export const PORTAIS = [
  { host: "chavesnamao.com.br", anuncio: /\/imovel\/[^/?#]+/ },
  { host: "vivareal.com.br", anuncio: /\/imovel\/[^/?#]+/ },
  { host: "zapimoveis.com.br", anuncio: /\/imovel\/[^/?#]+/ },
  { host: "olx.com.br", anuncio: /\/imoveis\/[^/?#]*-\d{8,}(?:[/?#]|$)/ }, /* anúncio OLX termina em -id longo; /imoveis/venda/estado-go/... é categoria, fica fora */
  { host: "62imoveis.com.br", anuncio: /\/imovel\/[^/?#]+/ },
  { host: "arboimoveis.com.br", anuncio: /\/imovel\/[^/?#]+/ },
  { host: "imovelweb.com.br", anuncio: /\/propriedades\/[^/?#]+|-\d{7,}\.html/ },
  { host: "wimoveis.com.br", anuncio: /\/propriedades\/[^/?#]+|-\d{7,}\.html/ },
  { host: "dfimoveis.com.br", anuncio: /\/imovel\/[^/?#]+/ },
];

/* ---------------- funções puras (suíte testa sem rede) ---------------- */
export function extrairLocs(xml = "") {
  const out = [];
  for (const m of String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) out.push(m[1].trim());
  return out;
}
export const ehIndiceSitemap = (xml = "") => /<sitemapindex[\s>]/i.test(xml);

/* É anúncio de imóvel EM GOIÂNIA? Duas travas: padrão de anúncio do portal + a cidade
   declarada no slug (a mesma ideia da blindagem geo da URL de 22/07 — o slug manda). */
export function urlDeAnuncioGyn(url = "", cfg) {
  const n = norm(url);
  if (!n.includes("goiania")) return false;
  return cfg.anuncio.test(n);
}

/* ---------------- IO educado ---------------- */
async function buscarSitemap(url, { fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25000), redirect: "follow" });
    if (!r.ok) return null;
    if (/\.gz($|\?)/i.test(url)) return gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf-8");
    return await r.text();
  } catch { return null; }
}

async function sitemapsSemente(host, { fetchImpl } = {}) {
  const robots = await regrasRobots(host, { fetchImpl });
  const doRobots = parseRobots(robots).sitemaps.filter(s => { try { return new URL(s).host.endsWith(host); } catch { return false; } });
  return [...doRobots, `https://${host}/sitemap.xml`, `https://${host}/sitemap_index.xml`];
}

export async function descobrirPortal(cfg, { tetoSitemaps = 60, tetoAnuncios = 5000, fetchImpl } = {}) {
  const fila = await sitemapsSemente(cfg.host, { fetchImpl });
  const vistos = new Set(), candidatos = new Set();
  let sitemapsLidos = 0;
  while (fila.length && sitemapsLidos < tetoSitemaps && candidatos.size < tetoAnuncios) {
    const sm = fila.shift();
    if (vistos.has(sm)) continue;
    vistos.add(sm);
    const xml = await buscarSitemap(sm, { fetchImpl });
    sitemapsLidos++;
    if (!xml) continue;
    if (ehIndiceSitemap(xml)) {
      for (const loc of extrairLocs(xml)) if (!vistos.has(loc)) fila.push(loc);
    } else {
      for (const loc of extrairLocs(xml)) if (urlDeAnuncioGyn(loc, cfg)) candidatos.add(loc);
    }
    await dormir(1200); /* gentileza: índice também é servidor de alguém */
  }
  /* gravação: identidade canônica quando o portal dá id na URL; last_seen_at = "continua no ar" */
  const portal = portalRaiz(cfg.host);
  let novos = 0, vivos = 0;
  for (const url of candidatos) {
    const idt = identidadeAnuncio(url);
    const r = await pool.query(
      `INSERT INTO listings (portal, url, raw_title, raw_description, content_hash, external_id, last_seen_at, raw_payload)
       VALUES ($1,$2,'','',$3,$4,now(),$5)
       ON CONFLICT (portal, url, content_hash) DO UPDATE SET last_seen_at = now(), external_id = EXCLUDED.external_id
       RETURNING (xmax = 0) AS novo`,
      [portal, url, sha("sitemap\n" + url), idt.externalId, JSON.stringify({ fonte: "sitemap", sitemapHost: cfg.host })]);
    r.rows[0]?.novo ? novos++ : vivos++;
  }
  return { portal: cfg.host, sitemapsLidos, anuncios: candidatos.size, novos, vivos };
}

export async function descobrir({ portais = PORTAIS, ...opcoes } = {}) {
  const resumo = { portais: [], totalNovos: 0, totalVivos: 0 };
  for (const cfg of portais) {
    try {
      const r = await descobrirPortal(cfg, opcoes);
      resumo.portais.push(r);
      resumo.totalNovos += r.novos; resumo.totalVivos += r.vivos;
    } catch (e) {
      resumo.portais.push({ portal: cfg.host, erro: String(e?.message || e).slice(0, 200) });
    }
  }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('descoberta','sitemap','executada',$1)",
    [JSON.stringify(resumo)]).catch(() => {});
  return resumo;
}

/* execução direta (systemd oneshot): node descoberta-sitemap.js */
if (process.argv[1] && process.argv[1].endsWith("descoberta-sitemap.js")) {
  descobrir().then(r => { console.log(JSON.stringify(r)); return pool.end(); })
    .catch(e => { console.error(e); process.exit(1); });
}
