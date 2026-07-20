/* Ingestão da fonte A: busca pública -> listings (bruto, rastreável) -> extração
   estruturada -> properties. Dedup de 1º nível pelo UNIQUE (portal, url, content_hash):
   recoleta idêntica não duplica; a dedup multi-sinal entre portais (plano §5) vem na
   sequência da Fase 3. Fontes B (manual) e C (parcerias) entram pela MESMA tabela,
   só mudando o campo portal. */
import { createHash } from "node:crypto";
import { pool } from "./db.js";
import { buscarWeb } from "./busca-web.js";
import { extrairAnuncio } from "./extract.js";
import { avaliarQualidade } from "./qualidade.js";
import { identidadeAnuncio } from "./identidade-anuncio.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

/* Pré-filtro puro (auditoria 20/07): 21% da extração de IA estava sendo queimada em
   resultado de OUTRA cidade (a peneira reprovava depois, mas a chamada já era paga).
   Snippet que não menciona Goiânia em lugar nenhum não ganha IA; o listing bruto FICA
   registrado (proveniência) — só não vira property nem custo. */
export function passaPreFiltro({ titulo = "", descricao = "", url = "" }) {
  return /goi[aâ]nia/i.test(`${titulo}\n${descricao}\n${url}`);
}

export async function ingerir({ consulta, paginas = 1, tier = "fast", maxExtrair = Infinity }) {
  const achados = [];
  for (let p = 0; p < Math.min(paginas, 3); p++) {
    if (p > 0) await dormir(1200); /* Brave free = 1 req/s */
    achados.push(...await buscarWeb(consulta, { offset: p }));
  }
  const stats = { consulta, encontrados: achados.length, novos: 0, jaConhecidos: 0,
    tentativasExtracao: 0, extraidos: 0, falhasExtracao: 0, comparaveis: 0, catalogos: 0 };
  for (const a of achados) {
    /* modo ao vivo: extrai só até o teto (evita 30 anúncios × 18s no clique); o resto
       fica para a varredura noturna. O teto conta TENTATIVAS, inclusive falhas — uma
       página ruim nunca pode transformar o limite em chamadas ilimitadas de IA. */
    if (stats.tentativasExtracao >= maxExtrair) break;
    const hash = sha(a.titulo + "\n" + a.descricao);
    /* identidade canônica (17/07): o id que o portal dá ao anúncio na URL — é ela,
       nunca a URL bruta, que ancora histórico de preço e dedup entre subdomínios */
    const idt = identidadeAnuncio(a.url);
    const ins = await pool.query(
      `INSERT INTO listings (portal, url, raw_title, raw_description, content_hash, external_id, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,now())
       ON CONFLICT (portal, url, content_hash) DO UPDATE SET last_seen_at = now(), external_id = EXCLUDED.external_id
       RETURNING id, (xmax = 0) AS novo`,
      [a.portal, a.url, a.titulo, a.descricao, hash, idt.externalId]);
    const { id, novo } = ins.rows[0];
    if (!novo) { stats.jaConhecidos++; continue; }
    stats.novos++;
    if (!passaPreFiltro(a)) { stats.semGoiania = (stats.semGoiania || 0) + 1; continue; }
    stats.tentativasExtracao++;
    /* A1 (atualização contínua): o MESMO anúncio (portal + id) reaparecendo com conteúdo
       novo = mudou desde a última varredura. A coleta anterior só conta se foi um
       comparável de verdade (peneira §6) — página-catálogo não tem "preço anterior";
       era exatamente esse o bug que inventava saltos de R$ 78 mil -> R$ 1,73 mi. */
    const anterior = idt.externalId ? await pool.query(
      `SELECT l.id AS listing_id, (p.pricing->>'askingPrice')::numeric AS preco
       FROM listings l JOIN properties p ON p.listing_id = l.id
       WHERE l.external_id=$1 AND (l.portal=$2 OR l.portal LIKE '%.' || $2) AND l.id<>$3
         AND (p.quality->>'comparableGrade')::boolean IS TRUE
       ORDER BY COALESCE(l.last_seen_at, l.collected_at) DESC, l.collected_at DESC LIMIT 1`,
      [idt.externalId, idt.portalRaiz, id]).then(r => r.rows[0] || null) : null;
    try {
      const ex = await extrairAnuncio({ titulo: a.titulo, descricao: a.descricao, tier });
      const v = ex.value;
      /* peneira §6 (determinística, depois da IA): classifica, nunca apaga */
      const q = avaliarQualidade({ url: a.url, titulo: a.titulo, descricao: a.descricao, extracao: v });
      if (q.comparableGrade) stats.comparaveis++;
      if (q.isCatalogPage) stats.catalogos++;
      const prop = await pool.query(
        `INSERT INTO properties (listing_id, neighborhood, property_type, characteristics, pricing, quality, extraction)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [id, v.neighborhood, v.propertyType,
          JSON.stringify({ privateAreaM2: v.privateAreaM2, totalAreaM2: v.totalAreaM2, bedrooms: v.bedrooms,
            suites: v.suites, bathrooms: v.bathrooms, parkingSpaces: v.parkingSpaces, isFurnished: v.isFurnished }),
          JSON.stringify({ askingPrice: v.askingPrice, condominiumFee: v.condominiumFee, isLaunch: v.isLaunch }),
          JSON.stringify(q),
          JSON.stringify({ confirmados: v.confirmados, inferidos: v.inferidos, model: ex.model, provider: ex.provider })]);
      if (q.comparableGrade && v.askingPrice) await pool.query(
        "INSERT INTO price_history (listing_id, price) VALUES ($1,$2)", [id, v.askingPrice]);
      /* A1/A3: preço mudou entre coletas do MESMO anúncio (portal + external_id, ambas
         comparáveis pela peneira) — delta registrado e auditado (termômetro agregado;
         nunca inferência automática por imóvel). Salto acima de 50% não é repique de
         mercado: é unidade trocada no anúncio ou erro de extração — vai para a fila de
         suspeitas, fora do termômetro. */
      if (anterior && anterior.preco != null && v.askingPrice && q.comparableGrade &&
          Number(anterior.preco) !== Number(v.askingPrice)) {
        const de = Number(anterior.preco), para = Number(v.askingPrice);
        /* variação sobre o preço ANTERIOR (revisão 17/07: max() no denominador
           subestimava toda subida — 400->500 mil é +25%, não 20%) */
        const variacao = Math.abs(para - de) / de;
        const verificada = variacao <= 0.5;
        if (verificada) stats.mudancasPreco = (stats.mudancasPreco || 0) + 1;
        else stats.mudancasSuspeitas = (stats.mudancasSuspeitas || 0) + 1;
        await pool.query(
          `INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('listing',$1,$2,$3)`,
          [id, verificada ? "mudanca-preco" : "mudanca-preco-suspeita",
            JSON.stringify({ url: a.url, portal: a.portal, externalId: idt.externalId, verificada,
              de, para, variacaoPct: Math.round(variacao * 1000) / 10,
              bairro: v.neighborhood, tipo: v.propertyType,
              area: v.privateAreaM2 ?? v.totalAreaM2 ?? null,
              listingAnterior: anterior.listing_id })]).catch(() => {});
      }
      /* geocodificação determinística pelo CNEFE (§10): endereço no texto -> coordenada
         com precisão declarada; sem endereço casável, o imóvel fica sem geom (honesto) */
      try {
        const { geocodificarAnuncio } = await import("./geo-anuncio.js");
        const geo = await geocodificarAnuncio({ titulo: a.titulo, descricao: a.descricao, neighborhood: v.neighborhood });
        if (geo) {
          await pool.query(
            `UPDATE properties SET geom=ST_SetSRID(ST_MakePoint($1,$2),4326), location_confidence=$3,
                    extraction = extraction || $4, updated_at=now() WHERE id=$5`,
            [geo.lon, geo.lat, geo.confidence,
              JSON.stringify({ geocodificacao: { fonte: "cnefe-2022", precisao: geo.precisao,
                rua: geo.ruaDetectada, numero: geo.numeroDetectado, localidade: geo.localidadeCnefe } }),
              prop.rows[0].id]);
          stats.geocodificados = (stats.geocodificados || 0) + 1;
        }
      } catch { /* geocodificação é bônus — nunca derruba a ingestão */ }
      stats.extraidos++;
    } catch (e) {
      stats.falhasExtracao++;
      await pool.query(
        "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('listing',$1,'falha-extracao',$2)",
        [id, JSON.stringify({ erro: String(e.message).slice(0, 300) })]).catch(() => {});
    }
    await dormir(500); /* gentileza com o rate do provedor de IA */
  }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('ingestao', $1, 'executada', $2)",
    [sha(consulta).slice(0, 12), JSON.stringify(stats)]).catch(() => {});
  return stats;
}
