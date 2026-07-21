/* Fonte A (decisão de 15/07/2026, MOTOR-PRECO.md §C): pesquisa sobre conteúdo PÚBLICO
   INDEXADO via API de busca. O que entra no funil é o que o buscador já indexou e
   expõe publicamente (título + descrição + URL) — não fazemos scraping dos portais.

   CADEIA DE BUSCA (21/07/2026 — cota do Brave esgotou no mega e o upgrade não saiu):
   mesmo padrão da cadeia de IA. Degrau 1 = Google Custom Search (grátis 100/dia ≈
   3.000/mês, sem cartão; melhor índice dos portais BR). Degrau 2 = Brave (grátis
   ~2.000/mês). Cota estourada num degrau vira COOLDOWN e a busca desce — a varredura
   nunca mais para por um 402 de um fornecedor só. Sem GOOGLE_CSE_* no env, a cadeia
   opera só com o Brave (compatível com o ontem). */

const COOLDOWN = new Map(); /* provedor -> timestamp de quando pode voltar */
const emCooldown = (p) => (COOLDOWN.get(p) || 0) > Date.now();
const esfriar = (p, ms) => COOLDOWN.set(p, Date.now() + ms);

/* TRAVA DE GASTO (21/07): o projeto Google do usuário tem faturamento vinculado — acima
   de 100 buscas/dia a API COBRA (US$5/mil). Teto local de 95/dia, contado em arquivo
   (vale entre processos: varredura, aquecedor, API), zerando à meia-noite do PACÍFICO
   (é quando a cota do Google vira). Só resposta 200 conta: 4xx não fatura. */
import { readFileSync, writeFileSync } from "node:fs";
const COTA_URL = new URL("./busca-cota-dia.json", import.meta.url);
export const GOOGLE_TETO_DIA = Number(process.env.GOOGLE_CSE_TETO_DIA ?? 95);
export function cotaGoogleDoDia() {
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  try {
    const d = JSON.parse(readFileSync(COTA_URL, "utf-8"));
    if (d.dia === dia) return d;
  } catch {}
  return { dia, google: 0 };
}
function registraGoogle() {
  try { const d = cotaGoogleDoDia(); d.google++; writeFileSync(COTA_URL, JSON.stringify(d)); } catch {}
}

/* mapeadores puros e exportados — a suíte valida o contrato sem rede */
export const mapGoogle = (d) => (d.items || [])
  .filter(x => x.link && (x.snippet || x.title))
  .map(x => ({ url: x.link, titulo: x.title || "", descricao: x.snippet || "",
    portal: new URL(x.link).hostname.replace(/^www\./, "") }));

export const mapBrave = (d) => (d.web?.results || [])
  .filter(x => x.url && (x.description || x.title))
  .map(x => ({ url: x.url, titulo: x.title || "", descricao: x.description || "",
    portal: new URL(x.url).hostname.replace(/^www\./, "") }));

async function buscarGoogle(consulta, { offset = 0 } = {}) {
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", process.env.GOOGLE_CSE_KEY);
  u.searchParams.set("cx", process.env.GOOGLE_CSE_CX);
  u.searchParams.set("q", consulta);
  u.searchParams.set("num", "10"); /* teto da API por chamada */
  u.searchParams.set("start", String(1 + offset * 10));
  u.searchParams.set("gl", "br");
  u.searchParams.set("lr", "lang_pt");
  const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) {
    const corpo = (await r.text()).slice(0, 200);
    /* 429/403 = cota do DIA esgotada (renova à meia-noite do Pacífico): esfria 2h e a
       cadeia desce para o Brave — amanhã o Google volta sozinho */
    if (r.status === 429 || r.status === 403) esfriar("google", 2 * 3600 * 1000);
    throw new Error(`google-cse http ${r.status}: ${corpo}`);
  }
  registraGoogle(); /* só o 200 fatura — é o que conta no teto do dia */
  return mapGoogle(await r.json());
}

async function buscarBrave(consulta, { count = 20, offset = 0 } = {}) {
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", consulta);
  u.searchParams.set("count", String(Math.min(count, 20)));
  u.searchParams.set("offset", String(offset));
  u.searchParams.set("country", "BR");
  u.searchParams.set("search_lang", "pt-br");
  const r = await fetch(u, {
    headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) {
    const corpo = (await r.text()).slice(0, 200);
    if (r.status === 402) esfriar("brave", 24 * 3600 * 1000); /* cota MENSAL morta */
    else if (r.status === 429) esfriar("brave", 60 * 1000);   /* 1 req/s do free */
    throw new Error(`brave http ${r.status}: ${corpo}`);
  }
  return mapBrave(await r.json());
}

export function cadeiaDisponivel() {
  const degraus = [];
  if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX) degraus.push("google");
  if (process.env.BRAVE_API_KEY) degraus.push("brave");
  return degraus;
}

export async function buscarWeb(consulta, opts = {}) {
  const degraus = cadeiaDisponivel();
  if (!degraus.length) throw new Error("nenhum provedor de busca no env (GOOGLE_CSE_KEY/GOOGLE_CSE_CX ou BRAVE_API_KEY)");
  let ultimoErro = null;
  for (const p of degraus) {
    if (emCooldown(p)) continue;
    if (p === "google" && cotaGoogleDoDia().google >= GOOGLE_TETO_DIA) continue; /* teto do dia: nunca vira fatura */
    try {
      return p === "google" ? await buscarGoogle(consulta, opts) : await buscarBrave(consulta, opts);
    } catch (e) {
      ultimoErro = e; /* esfriar() já foi decidido dentro do degrau; tenta o próximo */
    }
  }
  throw ultimoErro || new Error("busca indisponível: todos os degraus em cooldown");
}
