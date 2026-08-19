/* Ingestão pela PÁGINA do anúncio (19/08/2026) — o degrau novo entre "snippet de
   buscador" e nada: buscamos a URL diretamente (educado: robots.txt, UA identificado,
   anti-bot nunca contornado — ver fonte-pagina.js) e o texto COMPLETO da página entra
   no mesmo funil do snippet (processarListing). Ganho real: o resumo do Google às
   vezes não tem preço; a página tem tudo — preço, área, endereço (geocodificação
   CNEFE melhora junto). Mesmo anúncio + mesmo conteúdo = mesmo hash → só last_seen_at
   anda (anúncio vivo, zero custo de IA). Preço mudou = hash novo → extração nova →
   histórico e auditoria de mudança caem de graça pelo caminho A1. */
import { createHash } from "node:crypto";
import { pool } from "./db.js";
import { buscarPagina } from "./fonte-pagina.js";
import { processarListing } from "./ingerir.js";
import { identidadeAnuncio, portalRaiz } from "./identidade-anuncio.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");

export async function ingerirPagina({ url, tier = "fast", fetchImpl } = {}) {
  const pg = await buscarPagina(url, { fetchImpl });
  if (!pg.ok) return { ok: false, motivo: pg.motivo, status: pg.status };
  const portal = portalRaiz(new URL(url).hostname);
  const idt = identidadeAnuncio(url);
  const hash = sha("pagina\n" + pg.titulo + "\n" + pg.texto);
  const ins = await pool.query(
    `INSERT INTO listings (portal, url, raw_title, raw_description, content_hash, external_id, last_seen_at, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,now(),$7)
     ON CONFLICT (portal, url, content_hash) DO UPDATE SET last_seen_at = now(), external_id = EXCLUDED.external_id
     RETURNING id, (xmax = 0) AS novo`,
    [portal, url, pg.titulo, pg.texto.slice(0, 8000), hash, idt.externalId,
      JSON.stringify({ fonte: "pagina-direta", statusHttp: pg.status })]);
  const { id, novo } = ins.rows[0];
  const stats = { consulta: `pagina:${url}`, encontrados: 1, novos: 0, jaConhecidos: 0,
    tentativasExtracao: 0, extraidos: 0, falhasExtracao: 0, comparaveis: 0, catalogos: 0,
    mudancasPreco: 0, mudancasSuspeitas: 0 };
  if (!novo) {
    const tem = await pool.query("SELECT 1 FROM properties WHERE listing_id=$1 LIMIT 1", [id]);
    if (tem.rows.length) { stats.jaConhecidos = 1; return { ok: true, stats }; }
    stats.reprocessando = 1; /* listing conhecido sem property: falha antiga, recupera */
  } else {
    stats.novos = 1;
  }
  await processarListing({ id, novo, portal, url, titulo: pg.titulo, descricao: pg.texto, tier, stats });
  return { ok: true, stats };
}
