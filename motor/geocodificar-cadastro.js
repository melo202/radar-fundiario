/* Geocodificação pelo ESPELHO do cadastro municipal (P0.3, 20/08/2026) — degrau além do
   CNEFE, ainda 100% determinístico (PostGIS local, zero IA/cota):
     "numero-oficial"  -> rua+número bateram na INSCRIÇÃO oficial (log_norm + nrimovel):
                          centroide das unidades daquele número. É o lote de verdade.
     "condominio"      -> nome do edifício/condomínio do anúncio bateu em nmedificio:
                          centroide das unidades do condomínio.
   Regra de honestidade idêntica à do CNEFE: quando o anúncio tem bairro, o resultado
   PRECISA casar por token com o nmbairro do cadastro (localidadeCasa) — senão null. */
import { pool } from "./db.js";
import { normalizaLogradouro, semAcento } from "./normaliza-endereco.js";
import { localidadeCasa, tokensSig } from "./endereco-anuncio.js";

/* Forma do nome de rua no espelho: tipo fora, letra+número COLADOS ("R  T27"→"T27",
   "AV T63"→"T63") — diferente do CNEFE, que grava com espaço ("T 63"). PURO. */
export function normRuaEspelho(rua) {
  const base = normalizaLogradouro(rua); /* "rua t-71" → "t 71" */
  if (!base) return "";
  return base.replace(/^([a-z]{1,3}) (\d+[a-z]?)$/, "$1$2").toUpperCase();
}

/* Nome de condomínio como o espelho guarda (edif_norm): sem acento, maiúsculo,
   sem prefixos ED./COND./RES. PURO. */
export function normEdificio(nome) {
  let s = semAcento(String(nome || "")).toUpperCase().replace(/\s+/g, " ").trim();
  /* prefixos empilhados ("ED RES ESSENCIALLE") saem em laço, não só o primeiro */
  for (;;) {
    const t = s.replace(/^(EDIF[ÍI]CIO|ED|COND(OM[ÍI]NIO)?|RESIDENCIAL|RES)\.?\s+/i, "");
    if (t === s) break;
    s = t.trim();
  }
  return s;
}

/* Condomínio explícito no texto do anúncio: "Ed. Solar das Palmeiras", "Condomínio
   Fazenda Criméia", "Residencial Ville de France". Para em separador de contexto.
   Conservador de propósito — nome solto sem prefixo NÃO entra (falso positivo custa
   caro: pino no condomínio errado). PURO. */
export function extraiCondominioAnuncio(texto) {
  const t = String(texto || "").replace(/\s+/g, " ");
  const m = /\b(?:edif[íi]cio|ed\.?|condom[íi]nio|cond\.?|residencial|res\.?)\s+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9.' ]{2,45}?)(?=\s*[,;.|·•–—-]|\s+(?:no|na|em|com)\b|$)/i.exec(t);
  if (!m) return null;
  const nome = m[1].trim();
  /* "Cond. não informado" / "Res. a definir" não são nomes — blacklist de muletas de portal */
  if (/^(n[ãa]o|sem|a definir|indefinido)/i.test(nome)) return null;
  /* nome genérico demais ("Ed. Center") não prova nada sozinho, mas ainda pode casar —
     quem decide é o match exato no edif_norm + bairro */
  return nome.length >= 3 ? nome : null;
}

/* rua+número → inscrições oficiais. Sem número não tem precisão de lote — retorna null
   (o degrau "só a rua" já é coberto pelo CNEFE). */
export async function geocodificarCadastro({ rua, numero, bairro }) {
  const alvo = normRuaEspelho(rua);
  const num = Number(numero) > 0 ? String(Math.trunc(Number(numero))) : null;
  if (!alvo || !num) return null;
  const r = await pool.query(
    `SELECT nmbairro, nmedificio, count(*)::int AS unidades,
            ST_Y(ST_Centroid(ST_Collect(geom))) AS lat, ST_X(ST_Centroid(ST_Collect(geom))) AS lon
     FROM espelho_cadastro
     WHERE log_norm = $1 AND regexp_replace(trim(coalesce(nrimovel, '')), '\D', '', 'g') = $2
     GROUP BY nmbairro, nmedificio ORDER BY unidades DESC LIMIT 8`, [alvo, num]);
  if (!r.rowCount) return null;
  const cand = bairro ? r.rows.find(c => localidadeCasa(c.nmbairro, bairro)) : r.rows[0];
  if (!cand) return null; /* o número existe na rua, mas em OUTRO bairro — não inventa */
  return { lat: cand.lat, lon: cand.lon, precisao: "numero-oficial", confidence: 0.92,
    detalhe: `cadastro municipal: ${cand.unidades} inscrição(ões) nº ${num}${cand.nmedificio ? " · " + cand.nmedificio : ""}` };
}

/* último degrau: SÓ o bairro → centroide do polígono oficial do bairro (espelho da
   camada de divisas). Nome no anúncio ("Setor Marista") casa com o espelho ("Marista")
   por token significativo nos DOIS sentidos, e só com candidato ÚNICO — ambíguo = null.
   precisao "bairro" / confidence 0.2: o pino existe p/ contexto de preço, e o front
   declara "posição aproximada" no tooltip. */
/* escolha do polígono do bairro — PURA (testada sem banco). Exato normalizado ganha;
   senão, match de token nos dois sentidos com desempate por cobertura (tokens em comum /
   max(len)). Só aceita vencedor único com cobertura >= 0.5 — empate/zero = null. */
export function escolheBairro(bairros, bairro) {
  if (!bairro) return null;
  const alvo = semAcento(bairro).toUpperCase().trim();
  const exato = bairros.filter(b => semAcento(b.nm).toUpperCase() === alvo);
  if (exato.length === 1) return exato[0];
  const tb = tokensSig(bairro);
  if (!tb.length) return null;
  const pontuados = bairros
    .filter(b => localidadeCasa(b.nm, bairro) && localidadeCasa(bairro, b.nm))
    .map(b => {
      const tn = tokensSig(b.nm);
      const inter = tn.filter(t => tb.includes(t)).length;
      return { b, score: inter / Math.max(tn.length, tb.length) };
    })
    .filter(p => p.score >= 0.5)
    .sort((x, y) => y.score - x.score);
  if (!pontuados.length) return null;
  if (pontuados.length > 1 && pontuados[0].score === pontuados[1].score) return null; /* empate = ambíguo */
  return pontuados[0].b;
}

let BAIRROS_CACHE = null;
export async function geocodificarBairro({ bairro }) {
  if (!bairro) return null;
  if (!BAIRROS_CACHE) {
    const r = await pool.query(
      `SELECT nm, ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lon FROM espelho_bairro WHERE nm IS NOT NULL AND nm <> ''`);
    BAIRROS_CACHE = r.rows;
    setTimeout(() => { BAIRROS_CACHE = null; }, 6 * 3600e3).unref?.(); /* espelho é diário — cache de 6h basta */
  }
  const cand = escolheBairro(BAIRROS_CACHE, bairro);
  if (!cand) return null;
  return { lat: cand.lat, lon: cand.lon, precisao: "bairro", confidence: 0.2,
    detalhe: `centroide do bairro "${cand.nm}" (espelho da divisas oficial)` };
}

/* nome do condomínio → centroide das unidades cadastradas com aquele nmedificio */
export async function geocodificarCondominio({ nome, bairro }) {
  const alvo = normEdificio(nome);
  if (alvo.length < 4) return null; /* curto demais = ambíguo ("SOL", "VILA") */
  const r = await pool.query(
    `SELECT nmbairro, nmedificio, count(*)::int AS unidades,
            ST_Y(ST_Centroid(ST_Collect(geom))) AS lat, ST_X(ST_Centroid(ST_Collect(geom))) AS lon
     FROM espelho_cadastro WHERE edif_norm = $1
     GROUP BY nmbairro, nmedificio ORDER BY unidades DESC LIMIT 8`, [alvo]);
  if (!r.rowCount) return null;
  const cand = bairro ? r.rows.find(c => localidadeCasa(c.nmbairro, bairro)) : r.rows[0];
  if (!cand) return null;
  return { lat: cand.lat, lon: cand.lon, precisao: "condominio", confidence: 0.75,
    detalhe: `cadastro municipal: condomínio "${cand.nmedificio}" (${cand.unidades} inscrições)` };
}
