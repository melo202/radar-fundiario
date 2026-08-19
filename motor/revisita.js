/* Revisita DIRIGIDA (Mercado em Movimento, fase 2 — 17/07/2026).
   A varredura de bairro só reencontra um anúncio por acaso; aqui o ciclo noturno
   re-busca CADA anúncio identificado (portal + external_id) pelo próprio id — é o que
   transforma o termômetro e a série histórica de passivos em ativos. Orçamento: teto
   de 30 buscas/noite (900/mês; varredura usa ~600 — sobra folga na cota Brave de
   2.000 para os cliques ao vivo). Alvo: anúncios comparáveis não vistos há 3+ dias,
   os mais "frios" primeiro — com 143 identificados, o ciclo completo fecha em ~5
   noites. A ausência do anúncio na busca NUNCA vira conclusão ("saiu do ar"): índice
   de busca falha silenciosamente — só sinal positivo atualiza o registro (honesto).
   DEGRAU NOVO (19/08/2026): antes da busca, tentamos a PÁGINA do anúncio direto
   (leitura educada — robots.txt manda, anti-bot nunca é contornado). A página tem o
   anúncio inteiro (preço, área, endereço), não o resuminho do buscador — e não gasta
   um centavo de cota. Bloqueou? cai para a busca de sempre. As duas fora? falha
   registrada, amanhã tenta de novo. */
import { pool } from "./db.js";
import { ingerir } from "./ingerir.js";
import { ingerirPagina } from "./ingerir-pagina.js";

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

/* um alvo por anúncio (o listing mais recente de cada external_id), do mais frio
   para o mais quente; só quem já provou ser comparável merece busca da cota */
export async function alvosRevisita(teto, diasFrio = 3) {
  const r = await pool.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (l.external_id)
              l.external_id, l.url, l.portal,
              COALESCE(l.last_seen_at, l.collected_at) AS visto_em
       FROM listings l JOIN properties p ON p.listing_id = l.id
       WHERE l.external_id IS NOT NULL
         AND (p.quality->>'comparableGrade')::boolean IS TRUE
       ORDER BY l.external_id, COALESCE(l.last_seen_at, l.collected_at) DESC
     ) ultimos
     WHERE visto_em < now() - make_interval(days => $2)
     ORDER BY visto_em ASC LIMIT $1`, [teto, diasFrio]);
  return r.rows;
}

export async function revisitar({ teto = 30, tier = "fast", diasFrio = 3 } = {}) {
  const alvos = await alvosRevisita(teto, diasFrio);
  const resumo = { alvos: alvos.length, buscas: 0, diretos: 0, bloqueadosRobots: 0,
    bloqueadosPortal: 0, encontrados: 0, novos: 0,
    jaConhecidos: 0, mudancasPreco: 0, mudancasSuspeitas: 0, falhas: 0 };
  for (const a of alvos) {
    let host = "";
    try { host = new URL(a.url).hostname; } catch { continue; }
    /* degrau 1 (19/08): a página do anúncio, direto — grátis e com o texto completo */
    let okDireto = false;
    try {
      const d = await ingerirPagina({ url: a.url, tier });
      if (d.ok) {
        okDireto = true;
        resumo.diretos++;
        resumo.encontrados += 1;
        resumo.novos += d.stats.novos || 0;
        resumo.jaConhecidos += d.stats.jaConhecidos || 0;
        resumo.mudancasPreco += d.stats.mudancasPreco || 0;
        resumo.mudancasSuspeitas += d.stats.mudancasSuspeitas || 0;
      } else if (d.motivo === "robots") resumo.bloqueadosRobots++;
      else resumo.bloqueadosPortal++;
    } catch { /* direto falhou feio — a busca ainda pode achar */ }
    if (!okDireto) {
      /* a consulta mais cirúrgica que a busca aceita: o site do anúncio + o id exato */
      const consulta = `site:${host} "${a.external_id}"`;
      try {
        const s = await ingerir({ consulta, paginas: 1, tier });
        resumo.buscas++;
        resumo.encontrados += s.encontrados; resumo.novos += s.novos;
        resumo.jaConhecidos += s.jaConhecidos;
        resumo.mudancasPreco += s.mudancasPreco || 0;
        resumo.mudancasSuspeitas += s.mudancasSuspeitas || 0;
      } catch { resumo.falhas++; }
    }
    await dormir(1500); /* Brave 1 req/s + gentileza com o portal */
  }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('revisita','dirigida','executada',$1)",
    [JSON.stringify(resumo)]).catch(() => {});
  return resumo;
}

/* execução direta (systemd oneshot): node revisita.js */
if (process.argv[1] && process.argv[1].endsWith("revisita.js")) {
  revisitar().then(r => {
    console.log(JSON.stringify(r));
    return pool.end();
  }).catch(e => { console.error(e); process.exit(1); });
}
