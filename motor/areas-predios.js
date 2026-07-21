/* AREAS-PREDIOS-01 — Cruzamento mercado × cadastro por prédio (22/07/2026).

   O problema (caso real LIV URBAN Marista): a área construída CADASTRAL de unidade em
   condomínio inclui rateio de áreas comuns — plantas reais de 38–107 m² aparecem como
   "183 m²" no cadastro, média 103 m². A metragem de VITRINE dos anúncios (o número que
   o corretor e o cliente conhecem) é a referência de mercado.

   O que este job faz, toda noite (ExecStartPost da varredura):
   1. baixa os prédios nomeados do cadastro (nmedificio + endereço, ArcGIS da Prefeitura);
   2. casa anúncios do acervo com os condomínios por DOIS canais determinísticos:
      a. NOME: tokens distintivos do nome do condomínio no título ("Liv Urban Marista");
      b. ENDEREÇO: rua+número geocodificados do anúncio = rua+número do prédio
         ("Rua 1141, 337") — muito anúncio não cita o nome, cita o endereço
         (pedido do Bruno, 22/07: "alimentar todas as metragens de GYN");
   3. para condomínios com >= MIN_ANUNCIOS anúncios, calcula a MEDIANA da área de
      vitrine (urlAreaM2 do slug, depois privativa/total extraídas);
   4. grava /var/www/radar/dados/areas-predios.json — o mapa mostra no card do prédio:
      "área de mercado ≈ 64 m² (mediana de 8 anúncios)" ao lado da cadastral.

   Falha operacional (ArcGIS/banco fora) NUNCA derruba a varredura: mantém o JSON de
   ontem, loga e sai 0. As funções puras são testadas na suíte do repo com node:test. */
import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

/* AUDITORIA-01 (22/07): os campos cadastrais (nmedificio, nmlogradou, nrimovel) vivem na
   LAYER 3 — a MESMA que o mapa consulta (const SVC do radar-goiania.html). A layer 0 NÃO
   tem esses campos: qualquer query com eles devolve "Failed to execute query" (provado
   com curl na auditoria). Não "otimizar" para a layer 0 sem testar de novo. */
const LOTSVC = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query";
const SAIDA = process.env.AREAS_PREDIOS_JSON || "/var/www/radar/dados/areas-predios.json";
const MIN_ANUNCIOS = 3;
const PAGINA = 2000;
/* canal endereço: só unidade de prédio — casa/terreno no mesmo número NÃO é unidade */
const TIPOS_UNIDADE = new Set(["apartamento", "comercial"]);

/* norm IDÊNTICA à do mapa (radar-goiania.html linha "const norm="): NFD, sem acento,
   MAIÚSCULO, espaço simples — a chave do JSON casa com a norm() do nmedificio no front. */
export function normPredio(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
/* variante para MATCH: pontuação vira espaço (título de anúncio vem sujo: "Liv Urban,") */
const normMatch = (s) => normPredio(s).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/* rua para match de endereço: sem tipo de via, letra+número compactados ("R 1141" ->
   "1141", "AVENIDA T 43" -> "T43") — CNEFE (anúncio) e cadastro (prédio) grafam diferente. */
export function normRua(s) {
  return normPredio(s)
    .replace(/^(RUA|R|AVENIDA|AV|ALAMEDA|AL|TRAVESSA|TV|RODOVIA|ROD|ESTRADA|EST|PRACA|PRC)\.?\s+/, "")
    .replace(/([A-Z])[\s-]+(?=\d)/g, "$1");
}
const normNumero = (n) => String(n ?? "").replace(/\D/g, "");

/* tokens que não distinguem condomínio nenhum */
const STOP = new Set(["COND", "ED", "EDIFICIO", "RESIDENCIAL", "CONDOMINIO", "TORRE", "BLOCO",
  "RESIDENCE", "RESERVA", "HOME", "CLUB", "VILLAGE", "GOIANIA", "GOIAS", "SETOR", "DAS", "DOS"]); /* RESIDENCIAL já consta na 1ª linha */

export function tokensDistintivos(nomeNormMatch) {
  return nomeNormMatch.split(" ").filter((t) => t.length >= 3 && !STOP.has(t));
}

/* prédio do cadastro normalizado para os dois canais */
const predioNorm = (p) => {
  const nome = typeof p === "string" ? p : p.nome;
  const chave = normPredio(nome);
  const nm = normMatch(nome);
  return {
    chave, nome,
    toks: chave.length >= 4 && nm ? tokensDistintivos(nm) : [],
    /* AUDITORIA-02: o nmlogradou do cadastro JÁ traz o tipo embutido ("R  1141") —
       concatenar tplogradou duplicava ("R R 1141") e quebrava o normRua */
    rua: typeof p === "object" ? normRua(p.nmlogradou || p.rua || "") : "",
    numero: typeof p === "object" ? normNumero(p.nrimovel ?? p.numero) : "",
  };
};

/* índice token -> nomes (candidatos sem varrer milhares de nomes × anúncios)
   + índice endereço ("RUA|NUMERO") -> prédios */
export function montarIndicePredios(predios = []) {
  const idx = new Map();       /* token -> Set(chave) */
  const originais = new Map(); /* chave -> nome original do cadastro */
  const matchTokens = new Map(); /* chave -> tokens distintivos */
  const porEndereco = new Map(); /* "RUA|NUMERO" -> Set(chave) */
  for (const p of predios) {
    const n = predioNorm(p);
    if (!n.chave || !n.toks.length) continue;
    /* nome com um ÚNICO token distintivo curto (<6) é genérico demais ("PRIME",
       "SMART") — casaria com meio mundo no canal nome. O canal ENDEREÇO continua
       valendo para ele (rua+número não tem ambiguidade de nome). */
    const nomeUtil = !(n.toks.length === 1 && n.toks[0].length < 6);
    originais.set(n.chave, n.nome);
    matchTokens.set(n.chave, nomeUtil ? n.toks : []);
    if (nomeUtil) {
      for (const t of new Set(n.toks)) {
        if (!idx.has(t)) idx.set(t, new Set());
        idx.get(t).add(n.chave);
      }
    }
    if (n.rua && n.numero) {
      const end = `${n.rua}|${n.numero}`;
      if (!porEndereco.has(end)) porEndereco.set(end, new Set());
      porEndereco.get(end).add(n.chave);
    }
  }
  return { idx, originais, matchTokens, porEndereco };
}

/* canal NOME: TODOS os tokens distintivos do nome precisam estar no título (em qualquer
   ordem) — "LIV URBAN MARISTA" casa "Apto Liv Urban Marista 2q", mas não "Apto Liv
   Urban Bueno" (falta MARISTA) nem "Reserva Marista" (falta LIV/URBAN). */
export function prediosNoTitulo(titulo, indice) {
  const t = normMatch(titulo);
  if (!t) return [];
  const tokTitulo = new Set(t.split(" "));
  const cand = new Set();
  for (const tok of tokTitulo) {
    const hit = indice.idx.get(tok);
    if (hit) for (const chave of hit) cand.add(chave);
  }
  return [...cand].filter((chave) => (indice.matchTokens.get(chave) || []).every((tk) => tokTitulo.has(tk)));
}

/* canal ENDEREÇO: rua+número geocodificados do anúncio = endereço cadastral do prédio */
export function prediosNoEndereco({ rua, numero }, indice) {
  const r = normRua(rua), n = normNumero(numero);
  if (!r || !n) return [];
  return [...(indice.porEndereco.get(`${r}|${n}`) || [])];
}

export function mediana(nums = []) {
  const v = nums.map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/* orquestração pura (testável sem IO): recebe prédios do cadastro + anúncios, devolve o JSON.
   Cada anúncio conta UMA vez por prédio, mesmo casando pelos dois canais. */
export function cruzarAreas(prediosCadastro = [], anuncios = [], minAnuncios = MIN_ANUNCIOS) {
  const indice = montarIndicePredios(prediosCadastro);
  const areasPorPredio = new Map(); /* chave -> Map(idAnuncio -> area) */
  const poe = (chave, id, area) => {
    if (!areasPorPredio.has(chave)) areasPorPredio.set(chave, new Map());
    areasPorPredio.get(chave).set(id, area);
  };
  anuncios.forEach((a, i) => {
    if (!a || !(Number(a.area) > 0)) return;
    const id = a.id ?? i;
    if (a.titulo) for (const chave of prediosNoTitulo(a.titulo, indice)) poe(chave, id, Number(a.area));
    if (TIPOS_UNIDADE.has(a.tipo)) {
      for (const chave of prediosNoEndereco(a, indice)) poe(chave, id, Number(a.area));
    }
  });
  const predios = {};
  for (const [chave, porId] of areasPorPredio) {
    const areas = [...porId.values()];
    if (areas.length < minAnuncios) continue;
    const med = mediana(areas);
    if (!med) continue;
    predios[chave] = { nome: indice.originais.get(chave), medianaM2: Math.round(med), n: areas.length };
  }
  return {
    versao: 2,
    geradoEm: new Date().toISOString(),
    fonte: "área de vitrine de anúncios públicos coletados pelo radar (ofertas, não transações); "
      + "mediana por condomínio com >=" + minAnuncios + " anúncios casados por nome no título e/ou endereço (rua+número CNEFE)",
    minAnuncios,
    predios,
  };
}

/* ---- IO: cadastro (ArcGIS) e acervo (Postgres) ---- */
async function prediosDoCadastro() {
  const vistos = new Map(); /* chave -> prédio (dedup: o nome se repete por unidade) */
  for (let offset = 0; offset <= 400000; offset += PAGINA) {
    const u = new URL(LOTSVC);
    u.search = new URLSearchParams({
      where: "nmedificio IS NOT NULL AND nmedificio <> ''",
      outFields: "nmedificio,nmlogradou,nrimovel",
      /* AUDITORIA-05 (22/07): returnDistinctValues — as 365.462 UNIDADES com nome de
         prédio colapsam em ~20.550 combinações nome+endereço: 11 páginas (~30s) em
         vez de 183 páginas (~12 min). Medido contra o serviço real na auditoria. */
      returnDistinctValues: "true", returnGeometry: "false",
      resultRecordCount: String(PAGINA), resultOffset: String(offset),
      orderByFields: "nmedificio", f: "json",
    });
    const r = await fetch(u, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw new Error(`ArcGIS respondeu ${r.status}`);
    const j = await r.json();
    const feats = j.features || [];
    const antes = vistos.size;
    for (const f of feats) {
      const a = f.attributes || {};
      const nome = String(a.nmedificio || "").trim();
      if (!nome) continue;
      const chave = normPredio(nome);
      if (!vistos.has(chave)) {
        vistos.set(chave, { nome, nmlogradou: a.nmlogradou, nrimovel: a.nrimovel });
      }
    }
    if (feats.length < PAGINA) break;
    /* AUDITORIA-03: se o servidor ignorar resultOffset, a mesma página volta para
       sempre — sem prédio novo, para aqui em vez de girar 200 páginas à toa */
    if (vistos.size === antes) break;
  }
  return [...vistos.values()];
}

async function anunciosComArea(pool) {
  const r = await pool.query(
    `SELECT p.id, l.titulo, p.property_type AS tipo,
            COALESCE((p.characteristics->>'urlAreaM2')::numeric,
                     (p.characteristics->>'privateAreaM2')::numeric,
                     (p.characteristics->>'totalAreaM2')::numeric) AS area,
            p.extraction->'geocodificacao'->>'rua' AS rua,
            p.extraction->'geocodificacao'->>'numero' AS numero
     FROM properties p JOIN listings l ON l.id = p.listing_id`);
  return r.rows;
}

async function main() {
  const { pool } = await import("./db.js");
  try {
    const predios = await prediosDoCadastro();
    const anuncios = await anunciosComArea(pool);
    const saida = cruzarAreas(predios, anuncios);
    mkdirSync(dirname(SAIDA), { recursive: true });
    writeFileSync(SAIDA + ".tmp", JSON.stringify(saida));
    renameSync(SAIDA + ".tmp", SAIDA);
    console.log(`[areas-predios] ${predios.length} prédios nomeados no cadastro · ${anuncios.length} anúncios · ` +
      `${Object.keys(saida.predios).length} condomínios cruzados (>=${MIN_ANUNCIOS}, nome e/ou endereço) -> ${SAIDA}`);
  } finally {
    await pool.end(); /* AUDITORIA-04: sem o finally, falha no meio deixava o processo pendurado */
  }
}

/* falha operacional mantém o JSON de ontem e NÃO derruba a varredura (ExecStartPost):
   loga e sai 0 — só erro de programação deve aparecer como falha. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`[areas-predios] falhou, mantido o JSON anterior: ${e.message}`); process.exit(0); });
}
