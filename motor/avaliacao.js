/* Motor de avaliação v1 (plano §6/§8/§9/§12): seleciona comparáveis peneirados,
   deduplica, marca outliers com razão, pondera e produz o ValuationResult —
   100% determinístico e VERSIONADO (nada sobrescreve análise antiga). A IA não
   participa de nenhum número daqui; ela só vai REDIGIR sobre este JSON (§17). */
import { pool } from "./db.js";
import { resumo, cercaTukey, normalizaBairro, dedupMultiSinal, pesoComparavel, mediaPonderada, confianca } from "./estatistica.js";

/* opts (§14 — revisão do corretor): excluirIds tira comparáveis da amostra por decisão
   HUMANA registrada; parentId/notaRevisao criam uma VERSÃO nova encadeada (§20) —
   a avaliação original permanece intacta para sempre. */
export async function avaliar(subject, opts = {}) {
  const { propertyType, neighborhood, areaM2, bedrooms } = subject || {};
  if (!propertyType || !neighborhood) throw new Error("subject precisa de propertyType e neighborhood");
  if (!(areaM2 > 0)) throw new Error("subject precisa de areaM2 (> 0) para estimar valor total");
  const excluir = new Set((opts.excluirIds || []).map(String));

  /* candidatos: só quem passou na peneira §6, com preço e do mesmo tipo */
  const cand = await pool.query(
    `SELECT p.id, p.neighborhood, p.characteristics, p.pricing, p.quality,
            p.location_confidence,
            ST_Y(p.geom::geometry) AS lat, ST_X(p.geom::geometry) AS lon,
            l.portal, l.url, l.collected_at
     FROM properties p JOIN listings l ON l.id = p.listing_id
     WHERE (p.quality->>'comparableGrade')::boolean IS TRUE
       AND p.property_type = $1
       AND (p.pricing->>'askingPrice') IS NOT NULL`, [propertyType]);

  /* §10: distância é FATO exposto (rastreabilidade), nunca peso automático de valor —
     ajuste por localização só entra quando houver correlação MEDIDA, jamais % arbitrário */
  const sLat = Number(subject.lat), sLon = Number(subject.lon);
  const temSubjectGeo = isFinite(sLat) && isFinite(sLon);
  const distM = (lat, lon) => {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (lat - sLat) * rad, dLon = (lon - sLon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(sLat * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  };

  const alvo = normalizaBairro(neighborhood);
  const comps = [];
  let foraDoBairro = 0, foraDaFaixaDeArea = 0, semArea = 0, excluidosManual = 0;
  for (const r of cand.rows) {
    if (excluir.has(String(r.id))) { excluidosManual++; continue; } /* decisão do corretor (§14) */
    if (normalizaBairro(r.neighborhood) !== alvo) { foraDoBairro++; continue; }
    const c = r.characteristics || {};
    const area = c.privateAreaM2 ?? c.totalAreaM2 ?? null;
    const price = Number(r.pricing?.askingPrice);
    if (!(area > 0)) { semArea++; continue; } /* pm² exige área */
    if (area < areaM2 * 0.5 || area > areaM2 * 2) { foraDaFaixaDeArea++; continue; } /* filtro §6 */
    comps.push({
      id: r.id, portal: r.portal, url: r.url, collectedAt: r.collected_at,
      area, price, bedrooms: c.bedrooms ?? null,
      completeness: Number(r.quality?.completenessScore ?? 0),
      pm2: price / area,
      lat: r.lat ?? null, lon: r.lon ?? null,
      locConfidence: r.location_confidence != null ? Number(r.location_confidence) : null,
      distanciaM: (temSubjectGeo && r.lat != null) ? distM(r.lat, r.lon) : null,
    });
  }

  const { principais, duplicados } = dedupMultiSinal(comps);
  const totalFound = cand.rows.length;

  if (principais.length < 5) {
    /* §12: amostra insuficiente é INFORMADA, nunca maquiada */
    return { status: "amostra_insuficiente",
      sample: { totalFound, noBairro: comps.length + duplicados.length, aposDedup: principais.length,
        minimoParaCalcular: 5, idealPlano: 10, foraDoBairro, foraDaFaixaDeArea, semArea, excluidosManual },
      warnings: ["Amostra insuficiente para estimativa — colete mais anúncios deste bairro/tipologia."] };
  }

  /* §9: outliers de pm² pela cerca de Tukey — marcados e explicados */
  const rTodos = resumo(principais.map(c => c.pm2));
  const cerca = cercaTukey(rTodos);
  const validos = [], outliers = [];
  for (const c of principais) {
    if (c.pm2 < cerca.inf || c.pm2 > cerca.sup) {
      outliers.push({ ...c, razaoOutlier: `R$/m² ${Math.round(c.pm2)} fora da cerca de Tukey [${Math.round(cerca.inf)}–${Math.round(cerca.sup)}]` });
    } else validos.push(c);
  }

  /* §8: ponderação multiplicativa e estatística robusta sobre os válidos */
  const pesos = validos.map(c => ({ c, ...pesoComparavel(subject, c) }));
  const pm2Ponderado = mediaPonderada(pesos.map(p => ({ v: p.c.pm2, peso: p.peso })));
  const rValidos = resumo(validos.map(c => c.pm2));
  const conf = confianca({
    n: validos.length,
    dispersaoRelativa: rValidos.iqr / rValidos.mediana,
    completudeMedia: validos.reduce((s, c) => s + c.completeness, 0) / validos.length,
  });

  /* A2 (atualização contínua): a IDADE da amostra é dado do resultado — o corretor vê
     de quando são as ofertas, no card e no laudo, em vez de presumir que são de hoje */
  const datas = validos.map(c => new Date(c.collectedAt).getTime()).filter(t => isFinite(t));
  const ofertasColetadasEntre = datas.length
    ? { de: new Date(Math.min(...datas)).toISOString().slice(0, 10), ate: new Date(Math.max(...datas)).toISOString().slice(0, 10) }
    : null;

  const result = {
    estimatedValue: Math.round(pm2Ponderado * areaM2),
    estimatedPricePerM2: Math.round(pm2Ponderado),
    medianPricePerM2: Math.round(rValidos.mediana),
    probableRange: { minimum: Math.round(rValidos.q1 * areaM2), maximum: Math.round(rValidos.q3 * areaM2) },
    confidence: conf,
    sample: { totalFound, noBairro: comps.length + duplicados.length, duplicadosAgrupados: duplicados.length,
      totalAccepted: validos.length, totalOutliers: outliers.length, foraDoBairro, foraDaFaixaDeArea, semArea,
      excluidosManual, ofertasColetadasEntre },
    methods: ["preço/m² por comparável", "dedup multi-sinal entre portais (área+preço/posição)", "cerca de Tukey (outliers marcados)",
      "média ponderada (área×tipologia×qualidade×recência)", "faixa provável = IQR × área"],
    assumptions: ["Comparáveis são preços de OFERTA anunciados publicamente — não são transações fechadas.",
      "Nenhum ajuste automático de negociação/conservação foi aplicado nesta versão."],
    warnings: validos.length < 10 ? ["Amostra abaixo do ideal do plano (10+): use como referência preliminar."] : [],
  };

  /* Cruzamento com a LOCALIZAÇÃO (pedido do usuário 15/07 + §10 do plano): quando o
     imóvel tem coordenada, o entorno medido entra no RESULTADO como fato declarado —
     o documento e o laudo mostram "o que tem na região" junto do valor. NUNCA vira
     ajuste automático de preço (só com correlação medida, jamais % arbitrário). */
  if (temSubjectGeo) {
    try {
      const { entorno } = await import("./localizacao.js");
      const d = await entorno({ lat: sLat, lon: sLon });
      const destaques = Object.values(d.categorias)
        .filter(x => x.count > 0 && x.sinal !== "atencao")
        .sort((a, b) => b.count - a.count).slice(0, 8)
        .map(x => ({ rotulo: x.rotulo, count: x.count, maisProximoM: x.nearestDistanceMeters, raioM: x.raioM }));
      const atencao = Object.values(d.categorias)
        .filter(x => x.count > 0 && x.sinal === "atencao")
        .map(x => ({ rotulo: x.rotulo, maisProximoM: x.nearestDistanceMeters }));
      result.localizacao = { destaques, atencao,
        cobertura: d.dataQuality.coverageConfidence, atribuicao: d.dataQuality.attribution };
    } catch { /* entorno é bônus do resultado — nunca derruba a avaliação */ }
  }

  /* Índice ABERTO da cidade (FipeZap) como referência ROTULADA — contexto no card e no
     documento; NUNCA entra no cálculo (regra do roadmap: só com correlação medida). */
  try {
    const idx = await pool.query(
      `SELECT referencia, variacao_mensal, variacao_12m, preco_m2_medio
       FROM indices_mercado WHERE fonte='fipezap' AND cidade='Goiânia' AND operacao='venda'
       ORDER BY referencia DESC LIMIT 1`);
    if (idx.rowCount) {
      const i = idx.rows[0];
      result.indiceMercado = {
        fonte: "Índice FipeZap (FIPE/ZAP, dado aberto)", cidade: "Goiânia", operacao: "venda",
        referencia: i.referencia.toISOString().slice(0, 7),
        variacaoMensal: i.variacao_mensal != null ? Number(i.variacao_mensal) : null,
        variacao12m: i.variacao_12m != null ? Number(i.variacao_12m) : null,
        precoM2MedioCidade: i.preco_m2_medio != null ? Math.round(Number(i.preco_m2_medio)) : null,
        nota: "referência de contexto da cidade — fora do cálculo desta avaliação",
      };
    }
  } catch { /* índice é contexto — nunca derruba a avaliação */ }

  /* versionamento (§20): cada cálculo é uma linha nova + comparáveis com rastreio completo.
     Revisão do corretor (§14) encadeia por parent_id e a nota entra nas assumptions —
     o parecer e o laudo passam a DECLARAR que houve revisão humana. */
  if (opts.notaRevisao) result.assumptions = [...result.assumptions, opts.notaRevisao];
  let versao = 1;
  if (opts.parentId) {
    const pai = await pool.query("SELECT version FROM valuations WHERE id=$1", [opts.parentId]);
    versao = (pai.rows[0]?.version || 0) + 1;
  }
  const val = await pool.query(
    `INSERT INTO valuations (subject, status, result, assumptions, parent_id, created_by, version)
     VALUES ($1,'calculada',$2,$3,$4,$5,$6) RETURNING id, created_at`,
    [JSON.stringify(subject), JSON.stringify(result), JSON.stringify(result.assumptions),
      opts.parentId || null, opts.createdBy || null, versao]);
  const valId = val.rows[0].id;
  for (const p of pesos) await pool.query(
    `INSERT INTO valuation_comparables (valuation_id, property_id, total_score, factors, accepted, is_outlier)
     VALUES ($1,$2,$3,$4,true,false)`, [valId, p.c.id, p.peso, JSON.stringify(p.fatores)]);
  for (const o of outliers) await pool.query(
    `INSERT INTO valuation_comparables (valuation_id, property_id, accepted, is_outlier, rejection_reasons)
     VALUES ($1,$2,false,true,$3)`, [valId, o.id, JSON.stringify([o.razaoOutlier])]);

  return { id: valId, status: "calculada", subject, result,
    comparaveis: pesos.map(p => ({ portal: p.c.portal, url: p.c.url, area: p.c.area, quartos: p.c.bedrooms,
      preco: p.c.price, pm2: Math.round(p.c.pm2), peso: Math.round(p.peso * 100) / 100,
      lat: p.c.lat, lon: p.c.lon, distanciaM: p.c.distanciaM, locConfidence: p.c.locConfidence })),
    outliers: outliers.map(o => ({ portal: o.portal, url: o.url, pm2: Math.round(o.pm2), razao: o.razaoOutlier })) };
}
