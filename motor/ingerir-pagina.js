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
import { buscarPagina, PAUSA_MS } from "./fonte-pagina.js";
import { processarListing } from "./ingerir.js";
import { identidadeAnuncio, portalRaiz } from "./identidade-anuncio.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

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

/* Enriquecimento (19/08/2026): o sitemap descobre identidade e "está no ar"; aqui a
   página de cada anúncio descoberto é lida e o PREÇO entra — é o que transforma os
   5.220 registros da primeira descoberta em precificação de verdade. Teto por noite:
   IA e portal não são infinitos; amanhã continua de onde parou (quem já tem property
   sai da fila sozinho). */
export async function enriquecerPendentes({ teto = 60, tier = "fast" } = {}) {
  /* ORÇAMENTO DE TEMPO (26/08 — bug real: com a cadeia de IA degradada o lote de 150
     esticou 6h e o systemd MATOU o ExecStartPost ("start-post operation timed out")).
     O lote agora para sozinho e limpo no orçamento (default 40 min, env ENRIQ_ORCAMENTO_MIN):
     progresso parcial já está commitado página a página — sair cedo nunca perde trabalho,
     amanhã o timer continua de onde parou. */
  const orcamentoMs = Math.max(1, Number(process.env.ENRIQ_ORCAMENTO_MIN || 40)) * 60 * 1000;
  const inicio = Date.now();
  const alvos = await pool.query(
    `SELECT DISTINCT l.url FROM listings l
     WHERE l.raw_payload->>'fonte' = 'sitemap'
       AND NOT EXISTS (SELECT 1 FROM listings l2 JOIN properties p ON p.listing_id = l2.id
                       WHERE l2.url = l.url)
       AND l.collected_at > now() - make_interval(days => 30)
     ORDER BY l.url LIMIT $1`, [teto]);
  const resumo = { alvos: alvos.rows.length, ok: 0, robots: 0, bloqueados: 0,
    extraidos: 0, comparaveis: 0, falhas: 0 };
  for (const a of alvos.rows) {
    if (Date.now() - inicio > orcamentoMs) { resumo.parcial = true; resumo.orcamentoMin = Math.round(orcamentoMs / 60000); break; }
    try {
      const d = await ingerirPagina({ url: a.url, tier });
      if (d.ok) { resumo.ok++; resumo.extraidos += d.stats.extraidos || 0; resumo.comparaveis += d.stats.comparaveis || 0; }
      else if (d.motivo === "robots") resumo.robots++;
      else resumo.bloqueados++;
    } catch { resumo.falhas++; }
    await dormir(PAUSA_MS);
  }
  resumo.processados = (resumo.ok + resumo.robots + resumo.bloqueados + resumo.falhas);
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('enriquecimento','sitemap','executada',$1)",
    [JSON.stringify(resumo)]).catch(() => {});
  return resumo;
}

/* execução direta (ExecStartPost da descoberta): node ingerir-pagina.js [teto] */
if (process.argv[1] && process.argv[1].endsWith("ingerir-pagina.js")) {
  const teto = Number(process.argv[2] || 60);
  enriquecerPendentes({ teto }).then(r => { console.log(JSON.stringify(r)); return pool.end(); })
    .catch(e => { console.error(e); process.exit(1); });
}
