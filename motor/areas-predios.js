/* AREAS-PREDIOS-01 — Cruzamento mercado × cadastro por prédio (22/07/2026).

   O problema (caso real LIV URBAN Marista): a área construída CADASTRAL de unidade em
   condomínio inclui rateio de áreas comuns — plantas reais de 38–107 m² aparecem como
   "183 m²" no cadastro, média 103 m². A metragem de VITRINE dos anúncios (o número que
   o corretor e o cliente conhecem) é a referência de mercado.

   O que este job faz, toda noite (ExecStartPost da varredura):
   1. baixa os nomes de edifício do cadastro (nmedificio, ArcGIS público da Prefeitura);
   2. casa anúncios do acervo com os condomínios pelos tokens distintivos do nome no
      título (determinístico — sem IA);
   3. para condomínios com >= MIN_ANUNCIOS anúncios, calcula a MEDIANA da área de
      vitrine (urlAreaM2 do slug, depois privativa/total extraídas);
   4. grava /var/www/radar/dados/areas-mercado-predios.json — o mapa mostra no card do
      prédio: "área de mercado ≈ 64 m² (mediana de 8 anúncios)" ao lado da cadastral.

   Falha operacional (ArcGIS/banco fora) NUNCA derruba a varredura: mantém o JSON de
   ontem, loga e sai 0. As funções puras (norm/índice/match/mediana) são testadas na
   suíte do repo com node:test. */
import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const LOTSVC = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/0/query";
const SAIDA = process.env.AREAS_PREDIOS_JSON || "/var/www/radar/dados/areas-mercado-predios.json";
const MIN_ANUNCIOS = 3;
const PAGINA = 2000;

/* norm IDÊNTICA à do mapa (radar-goiania.html linha "const norm="): NFD, sem acento,
   MAIÚSCULO, espaço simples — a chave do JSON casa com a norm() do nmedificio no front. */
export function normPredio(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
/* variante para MATCH: pontuação vira espaço (título de anúncio vem sujo: "Liv Urban,") */
const normMatch = (s) => normPredio(s).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/* tokens que não distinguem condomínio nenhum */
const STOP = new Set(["COND", "ED", "EDIFICIO", "RESIDENCIAL", "CONDOMINIO", "TORRE", "BLOCO",
  "RESIDENCE", "RESERVA", "HOME", "CLUB", "VILLAGE", "GOIANIA", "GOIAS", "SETOR", "DAS", "DOS"]);

export function tokensDistintivos(nomeNormMatch) {
  return nomeNormMatch.split(" ").filter((t) => t.length >= 3 && !STOP.has(t));
}

/* índice token -> nomes (candidatos sem varrer milhares de nomes × anúncios) */
export function montarIndicePredios(nomes = []) {
  const idx = new Map();       /* token -> Set(chave normPredio) */
  const originais = new Map(); /* chave normPredio -> nome original do cadastro */
  const matchTokens = new Map(); /* chave -> tokens distintivos (para o match) */
  for (const nome of nomes) {
    const chave = normPredio(nome);
    const nm = normMatch(nome);
    if (!chave || !nm || chave.length < 4) continue;
    const toks = tokensDistintivos(nm);
    if (!toks.length) continue;
    /* nome com um ÚNICO token distintivo curto (<6) é genérico demais ("PRIME",
       "SMART") — casaria com meio mundo. Nomes assim ficam de fora do cruzamento. */
    if (toks.length === 1 && toks[0].length < 6) continue;
    originais.set(chave, nome);
    matchTokens.set(chave, toks);
    for (const t of new Set(toks)) {
      if (!idx.has(t)) idx.set(t, new Set());
      idx.get(t).add(chave);
    }
  }
  return { idx, originais, matchTokens };
}

/* condomínios citados no título: TODOS os tokens distintivos do nome precisam estar no
   título (em qualquer ordem) — "LIV URBAN MARISTA" casa "Apto Liv Urban Marista 2q",
   mas não "Apto Liv Urban Bueno" (falta MARISTA) nem "Reserva Marista" (falta LIV/URBAN). */
export function prediosNoTitulo(titulo, indice) {
  const t = normMatch(titulo);
  if (!t) return [];
  const tokTitulo = new Set(t.split(" "));
  const cand = new Set();
  for (const tok of tokTitulo) {
    const hit = indice.idx.get(tok);
    if (hit) for (const chave of hit) cand.add(chave);
  }
  return [...cand].filter((chave) => indice.matchTokens.get(chave).every((tk) => tokTitulo.has(tk)));
}

export function mediana(nums = []) {
  const v = nums.map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/* orquestração pura (testável sem IO): recebe nomes do cadastro + anúncios, devolve o JSON */
export function cruzarAreas(nomesCadastro = [], anuncios = [], minAnuncios = MIN_ANUNCIOS) {
  const indice = montarIndicePredios(nomesCadastro);
  const areasPorPredio = new Map();
  for (const a of anuncios) {
    if (!a || !a.titulo || !(Number(a.area) > 0)) continue;
    for (const chave of prediosNoTitulo(a.titulo, indice)) {
      if (!areasPorPredio.has(chave)) areasPorPredio.set(chave, []);
      areasPorPredio.get(chave).push(Number(a.area));
    }
  }
  const predios = {};
  for (const [chave, areas] of areasPorPredio) {
    if (areas.length < minAnuncios) continue;
    const med = mediana(areas);
    if (!med) continue;
    predios[chave] = { nome: indice.originais.get(chave), medianaM2: Math.round(med), n: areas.length };
  }
  return {
    versao: 1,
    geradoEm: new Date().toISOString(),
    fonte: "área de vitrine de anúncios públicos coletados pelo radar (ofertas, não transações); "
      + "mediana por condomínio com >=" + minAnuncios + " anúncios casados por tokens do nome no título",
    minAnuncios,
    predios,
  };
}

/* ---- IO: cadastro (ArcGIS) e acervo (Postgres) ---- */
async function nomesDePrediosDoCadastro() {
  const nomes = new Set();
  for (let offset = 0; offset <= 400000; offset += PAGINA) {
    const u = new URL(LOTSVC);
    u.search = new URLSearchParams({
      where: "nmedificio IS NOT NULL AND nmedificio <> ''",
      outFields: "nmedificio", returnGeometry: "false",
      resultRecordCount: String(PAGINA), resultOffset: String(offset), f: "json",
    });
    const r = await fetch(u, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw new Error(`ArcGIS respondeu ${r.status}`);
    const j = await r.json();
    const feats = j.features || [];
    for (const f of feats) {
      const n = String(f.attributes?.nmedificio || "").trim();
      if (n) nomes.add(n);
    }
    if (feats.length < PAGINA) break;
  }
  return [...nomes];
}

async function anunciosComArea(pool) {
  const r = await pool.query(
    `SELECT l.titulo,
            COALESCE((p.characteristics->>'urlAreaM2')::numeric,
                     (p.characteristics->>'privateAreaM2')::numeric,
                     (p.characteristics->>'totalAreaM2')::numeric) AS area
     FROM properties p JOIN listings l ON l.id = p.listing_id
     WHERE l.titulo IS NOT NULL AND length(l.titulo) > 8`);
  return r.rows;
}

async function main() {
  const { pool } = await import("./db.js");
  const nomes = await nomesDePrediosDoCadastro();
  const anuncios = await anunciosComArea(pool);
  const saida = cruzarAreas(nomes, anuncios);
  mkdirSync(dirname(SAIDA), { recursive: true });
  writeFileSync(SAIDA + ".tmp", JSON.stringify(saida));
  renameSync(SAIDA + ".tmp", SAIDA);
  console.log(`[areas-predios] ${nomes.length} prédios nomeados no cadastro · ${anuncios.length} anúncios com área · ` +
    `${Object.keys(saida.predios).length} condomínios cruzados (>=${MIN_ANUNCIOS} anúncios) -> ${SAIDA}`);
  await pool.end();
}

/* falha operacional mantém o JSON de ontem e NÃO derruba a varredura (ExecStartPost):
   loga e sai 0 — só erro de programação deve aparecer como falha. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`[areas-predios] falhou, mantido o JSON anterior: ${e.message}`); process.exit(0); });
}
