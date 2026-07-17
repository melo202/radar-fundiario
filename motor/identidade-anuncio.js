/* Identidade canônica do anúncio (projeto Mercado em Movimento, 17/07/2026).
   Bug real de produção: as "mudanças de preço" comparavam coletas da MESMA URL, mas as
   URLs eram páginas-CATÁLOGO dos portais (a lista de casas do Setor Marista) — o
   "de R$ 78 mil para R$ 1,73 mi" era só o anúncio do topo da lista trocando entre
   varreduras. A regra daqui é uma só: mudança de preço exige a identidade que o PRÓPRIO
   portal dá ao anúncio (o id na URL). Sem id não há identidade; sem identidade não
   existe "mudança" — o registro entra no acervo e pronto. Módulo puro, zero IO,
   padrões derivados das URLs reais do banco (17/07) e testados na suíte do repo. */

/* portal (sufixo do host) -> regex com o id do anúncio no caminho da URL */
const PADROES_PORTAL = [
  { host: /(^|\.)olx\.com\.br$/, re: /-(\d{8,})(?:[/?#]|$)/ },            /* …casa-setor-aeroporto-…-1367774783 */
  { host: /(^|\.)vivareal\.com\.br$/, re: /\bid-(\d{6,})(?:[/?#]|$)/ },   /* …-venda-RS840000-id-2879172082/ */
  { host: /(^|\.)zapimoveis\.com\.br$/, re: /\bid-(\d{6,})(?:[/?#]|$)/ },
  { host: /(^|\.)imovelweb\.com\.br$/, re: /-(\d{7,})\.html(?:[?#]|$)/ },
  { host: /(^|\.)wimoveis\.com\.br$/, re: /-(\d{7,})\.html(?:[?#]|$)/ },
  { host: /(^|\.)chavesnamao\.com\.br$/, re: /\bid[-/](\d{5,})(?:[/?#]|$)|-(\d{6,})(?:[/?#]|$)/ },
];
/* fallback para os portais de cauda longa: SÓ id com marcador explícito ("id-123…",
   "cod-123", "ref-123"). Revisão adversarial de 17/07 derrubou o padrão "slug que
   termina em número": CEP (8 díg.), telefone com DDD (10-11) e data AAAAMMDD no fim
   do slug virariam "id" e dois anúncios DIFERENTES colidiriam na mesma identidade —
   a mesma família do bug original. Menos cobertura na cauda longa é o preço certo. */
const PADROES_GENERICOS = [
  /\b(?:id|cod|codigo|ref)[-=/](\d{5,})(?:[/?#]|$)/i,
];

/* identidade de portal: para os portais CONHECIDOS, o domínio registrável unifica os
   subdomínios (go.olx = www.olx). Para o resto, o host inteiro (sem www.) É o portal —
   colapsar sufixos públicos (.srv.br) ou plataformas multi-tenant (uma imobiliária por
   subdomínio) uniria sites diferentes num só "portal" (revisão adversarial 17/07). */
const SUFIXOS_COMPOSTOS = /\.(com|net|org|imb|goiania)\.br$/;
export function portalRaiz(host) {
  const h = String(host || "").toLowerCase().replace(/^www\./, "");
  const conhecido = PADROES_PORTAL.some(p => p.host.test(h));
  if (!conhecido) return h;
  const partes = h.split(".");
  const n = SUFIXOS_COMPOSTOS.test(h) ? 3 : 2; /* olx.com.br = 3 rótulos */
  return partes.slice(-Math.min(n, partes.length)).join(".");
}

export function identidadeAnuncio(url) {
  let u;
  try { u = new URL(String(url)); } catch {
    return { externalId: null, portalRaiz: null, urlCanonica: String(url || ""), ehAnuncioIndividual: false };
  }
  const host = u.hostname.toLowerCase();
  const raiz = portalRaiz(host);
  /* canônica: sem query/fragmento/barra final — rastreio de campanha não muda o imóvel */
  const urlCanonica = `https://${host}${u.pathname.replace(/\/+$/, "") || "/"}`;
  const caminho = u.pathname;

  let externalId = null;
  const especifico = PADROES_PORTAL.find(p => p.host.test(host));
  if (especifico) {
    const m = caminho.match(especifico.re);
    if (m) externalId = m.slice(1).find(Boolean) || null;
  } else {
    for (const re of PADROES_GENERICOS) {
      const m = caminho.match(re);
      if (m) { externalId = m.slice(1).find(Boolean) || null; break; }
    }
  }
  /* portalConhecido: temos o padrão de id DESTE portal — logo, URL sem id ali é
     página-catálogo com certeza prática (sinal forte para a peneira §6) */
  return { externalId, portalRaiz: raiz, urlCanonica,
    portalConhecido: !!especifico, ehAnuncioIndividual: externalId != null };
}
