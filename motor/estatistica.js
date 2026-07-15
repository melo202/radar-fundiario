/* Núcleo estatístico do motor (plano §8/§9/§12/§13) — DETERMINÍSTICO, puro, sem IA e
   sem IO, para ser testado direto na suíte do repo. A IA nunca toca nestes números. */

export function quantil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * p;
  const i = Math.floor(pos), f = pos - i;
  return v[i + 1] != null ? v[i] + f * (v[i + 1] - v[i]) : v[i];
}

export function resumo(valores) {
  if (!valores.length) return null;
  const q1 = quantil(valores, 0.25), mediana = quantil(valores, 0.5), q3 = quantil(valores, 0.75);
  return { n: valores.length, min: Math.min(...valores), q1, mediana, q3, max: Math.max(...valores), iqr: q3 - q1 };
}

/* §9: outlier pela cerca de Tukey — marcado e explicado, nunca apagado em silêncio */
export function cercaTukey(r, k = 1.5) {
  return { inf: r.q1 - k * r.iqr, sup: r.q3 + k * r.iqr };
}

/* Grafias de portal E DO CADASTRO p/ bairro — normaliza antes de comparar. Bug real de
   produção (15/07): o cadastro municipal grava "SET BUENO" e o card mandava isso ao
   motor, que não conhecia "set" → 0 comparáveis para quem clicava (o curl com "Setor
   Bueno" funcionava e escondeu o furo). */
export function normalizaBairro(s) {
  return String(s || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\bst\.?\b/g, "setor").replace(/\bset\.?\b/g, "setor")
    .replace(/\bjd\.?\b/g, "jardim").replace(/\bpq\.?\b/g, "parque")
    .replace(/\bres\.?\b/g, "residencial").replace(/\bvl\.?\b/g, "vila")
    .replace(/\bcj\.?\b/g, "conjunto").replace(/\bsta\.?\b/g, "santa").replace(/\bsto\.?\b/g, "santo")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/* Dedup leve entre portais (§5, 1ª aproximação): mesmo nº de quartos + área arredondada +
   preço em balde de R$ 5 mil = provavelmente o mesmo imóvel anunciado 2x. Fica o registro
   mais completo como principal; o grupo inteiro é devolvido para rastreabilidade. */
export function chaveDedup(c) {
  const area = c.area != null ? Math.round(c.area) : "x";
  const preco = c.price != null ? Math.round(c.price / 5000) : "x";
  return `${c.bedrooms ?? "x"}|${area}|${preco}`;
}
export function dedupLeve(comps) {
  const grupos = new Map();
  for (const c of comps) {
    const k = chaveDedup(c);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(c);
  }
  const principais = [], duplicados = [];
  for (const g of grupos.values()) {
    g.sort((a, b) => (b.completeness ?? 0) - (a.completeness ?? 0));
    principais.push(g[0]);
    duplicados.push(...g.slice(1));
  }
  return { principais, duplicados };
}

/* §5 — dedup MULTI-SINAL: o mesmo imóvel anunciado em portais diferentes muda de roupa
   (preço com taxa embutida, área arredondada) e escapava do balde exato do dedupLeve
   (90,4 m² vs 90,6 m² caíam em baldes 90≠91). Dois anúncios são o MESMO imóvel quando
   sinais INDEPENDENTES convergem:
   - quartos iguais (ou um dos dois ausente), E
   - área até 2% de diferença, E
   - preço até 1,5% OU coordenadas a menos de 40 m (geocodificação CNEFE).
   Guloso por completude (o mais completo vira o principal) e cada duplicado carrega a
   RAZÃO do agrupamento — rastreabilidade §16, nunca dedup silencioso. */
function distanciaM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function razaoMesmoImovel(a, b) {
  if (a.bedrooms != null && b.bedrooms != null && a.bedrooms !== b.bedrooms) return null;
  if (!(a.area > 0 && b.area > 0)) return null;
  if (Math.abs(a.area - b.area) / Math.max(a.area, b.area) > 0.02) return null;
  const precoPerto = a.price > 0 && b.price > 0 &&
    Math.abs(a.price - b.price) / Math.max(a.price, b.price) <= 0.015;
  const geoPerto = a.lat != null && b.lat != null && a.lon != null && b.lon != null &&
    distanciaM(a, b) <= 40;
  if (precoPerto && geoPerto) return "área, preço e posição convergem";
  if (precoPerto) return "área e preço convergem";
  if (geoPerto) return "área e posição (CNEFE) convergem";
  return null;
}
export function dedupMultiSinal(comps) {
  const ordenados = [...comps].sort((x, y) => (y.completeness ?? 0) - (x.completeness ?? 0));
  const principais = [], duplicados = [];
  for (const c of ordenados) {
    let dono = null, razao = null;
    for (const p of principais) {
      razao = razaoMesmoImovel(p, c);
      if (razao) { dono = p; break; }
    }
    if (dono) duplicados.push({ ...c, duplicadoDe: dono.url ?? dono.id ?? null,
      razaoDedup: `${razao} (${c.portal} ≈ ${dono.portal})` });
    else principais.push(c);
  }
  return { principais, duplicados };
}

/* §8: peso multiplicativo = comparabilidade × qualidade × recência (0..1 em cada fator) */
export function pesoComparavel(subject, c, agora = Date.now()) {
  let fArea = 0.7;
  if (subject.areaM2 > 0 && c.area > 0) {
    const d = Math.abs(Math.log(c.area / subject.areaM2));
    fArea = 1 - Math.min(d, 0.7) / 0.7 * 0.6; /* igual=1, 2x/0.5x≈0.4 */
  }
  let fQuartos = 0.5;
  if (subject.bedrooms != null && c.bedrooms != null) {
    const d = Math.abs(subject.bedrooms - c.bedrooms);
    fQuartos = d === 0 ? 1 : d === 1 ? 0.7 : 0.4;
  }
  const fQualidade = 0.5 + 0.5 * (c.completeness ?? 0);
  const dias = c.collectedAt ? (agora - new Date(c.collectedAt).getTime()) / 86400000 : 90;
  const fRecencia = dias <= 30 ? 1 : Math.max(0.6, 1 - (dias - 30) / 375);
  const fatores = { area: fArea, quartos: fQuartos, qualidade: fQualidade, recencia: fRecencia };
  return { peso: fArea * fQuartos * fQualidade * fRecencia, fatores };
}

export function mediaPonderada(pares) {
  const somaPeso = pares.reduce((s, p) => s + p.peso, 0);
  if (!(somaPeso > 0)) return null;
  return pares.reduce((s, p) => s + p.v * p.peso, 0) / somaPeso;
}

/* §13: confiança por REGRAS declaradas (nunca uma porcentagem inventada) */
export function confianca({ n, dispersaoRelativa, completudeMedia }) {
  const fatores = [
    `${n} comparáveis no cálculo`,
    `dispersão (IQR/mediana) de ${(dispersaoRelativa * 100).toFixed(0)}%`,
    `completude média dos dados de ${(completudeMedia * 100).toFixed(0)}%`,
    "base de preços de OFERTA (sem transações reais)",
  ];
  let rotulo = "muito baixa";
  if (n >= 15 && dispersaoRelativa < 0.35 && completudeMedia >= 0.5) rotulo = "alta";
  else if (n >= 10 && dispersaoRelativa < 0.5) rotulo = "moderada";
  else if (n >= 5) rotulo = "baixa";
  return { rotulo, fatores };
}
