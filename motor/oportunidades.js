/* Mercado de OPORTUNIDADES (Caixa/leilão/bancos) — projeto de 17/07/2026.
   Ingestão contínua da lista oficial da Caixa: o runner residencial baixa o CSV (o VPS
   recebe 403 do Radware) já geocodificado pelo cadastro e faz POST do JSON aqui; este
   módulo faz o DIFF diário (novo, baixou, sumiu, voltou), grava a máquina de estados e
   cruza cada imóvel com o índice de OFERTAS do bairro para o "desconto real".
   REGRAS DE HONESTIDADE (pesquisa dos 10 agentes):
   - preço de leilão NUNCA entra no índice — por isso mora em tabela própria, não em
     properties (proteção por construção);
   - sumiço do CSV = "saiu da lista", NUNCA "vendido" (não é verificável);
   - dois rótulos de desconto, nunca misturados: vs avaliação da Caixa (oficial) e vs
     mediana de OFERTAS do bairro (nosso índice, oferta ≠ transação);
   - avisos jurídicos mudam por MODALIDADE (leilão judicial ≠ extrajudicial). */

/* ---------- núcleo puro (testável sem banco) ---------- */

/* área da descrição da Caixa ("Casa, 175.54 de área total, ..." / "84.32 de área
   privativa") — privativa tem prioridade; devolve null quando não há número plausível */
export function areaDaDescricao(desc) {
  const s = String(desc || "");
  const m = s.match(/([\d.,]+)\s*(?:m2|m²)?\s*de\s+área\s+privativa/i)
    || s.match(/([\d.,]+)\s*(?:m2|m²)?\s*de\s+área\s+(?:total|do\s+terreno|constru[ií]da)/i);
  if (!m) return null;
  /* na descrição da Caixa o ponto é DECIMAL ("84.32"), não milhar — só quando há ponto
     E vírgula é que o ponto é milhar ("1.234,56") */
  let t = m[1];
  t = (t.includes(".") && t.includes(",")) ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const n = Number(t);
  return n >= 8 && n <= 100000 ? n : null;
}

/* tipo da Caixa -> tipo do índice de ofertas (só casa/apartamento têm mediana confiável) */
export function tipoIndice(tipoCaixa) {
  const t = String(tipoCaixa || "").toLowerCase();
  if (t.startsWith("apart")) return "apartamento";
  if (t.startsWith("casa") || t.startsWith("sobrado")) return "casa";
  return null; /* terreno, comercial, etc.: sem índice comparável — desconto vs índice indisponível */
}

/* desconto vs a mediana de OFERTAS do bairro (índice próprio). n>=5 e área>0, senão
   indisponível com razão — nunca um número inventado. `entrada` vem de calculaIndice(). */
export function descontoVsIndice(imovel, entrada) {
  const area = Number(imovel.area_m2);
  if (!(area > 0)) return { disponivel: false, razao: "sem área no anúncio" };
  if (!entrada) return { disponivel: false, razao: "sem ofertas comparáveis no bairro" };
  if (entrada.n < 5) return { disponivel: false, razao: `poucas ofertas no bairro (${entrada.n})` };
  const preco = Number(imovel.preco);
  if (!(preco > 0)) return { disponivel: false, razao: "sem preço" };
  const pm2Imovel = preco / area;
  const pct = 1 - pm2Imovel / entrada.pm2Mediana; /* >0 = abaixo da mediana */
  return {
    disponivel: true,
    pctAbaixoDaMediana: Math.round(pct * 1000) / 10,
    pm2Imovel: Math.round(pm2Imovel),
    pm2MedianaBairro: Math.round(entrada.pm2Mediana),
    nOfertas: entrada.n,
  };
}

/* avisos jurídicos por MODALIDADE (pesquisa risco-honestidade, jurisprudência 2024-2026).
   Curtos, em voz de corretor, corretos: leilão judicial e extrajudicial têm regras
   OPOSTAS sobre dívidas — o chaveamento é obrigatório, não cosmético. */
const AVISO_COMUM = [
  "Oferta anunciada — não é preço de venda fechada; confira sempre no site da Caixa.",
  "Some ao valor: ITBI + registro (~3% a 5%) e, em leilão, +5% de comissão do leiloeiro.",
  "Leia o edital e a matrícula ANTES: o edital manda em quase tudo.",
  "Pode estar ocupado — a desocupação corre por conta e risco do comprador (meses, na prática).",
];
export function avisosDaModalidade(modalidade) {
  const m = String(modalidade || "").toLowerCase();
  if (m.includes("leil") && m.includes("sfi")) return { natureza: "extrajudicial", avisos: [
    "Leilão SFI (retomada de financiamento): o procedimento é constitucional (STF Tema 982), mas o ex-dono ainda pode discutir vícios na Justiça.",
    "ATENÇÃO: aqui NÃO vale a proteção do leilão judicial — se o edital jogar IPTU e condomínio atrasados no comprador, é do comprador.",
    "Até o 2º leilão o ex-dono pode recomprar pela dívida — sua arrematação pode cair.",
    "Em regra à vista (financiamento só se o edital deste imóvel permitir).",
    ...AVISO_COMUM ] };
  if (m.includes("licita")) return { natureza: "venda-direta", avisos: [
    "A Caixa já é dona do imóvel (propriedade consolidada) — não há leilão do ex-dono para anular, risco jurídico menor.",
    "Caução de 5% em até 2 dias úteis após ganhar. Financiamento/FGTS só se o anúncio deste imóvel disser que aceita.",
    "Confira no edital quem paga condomínio e IPTU atrasados — aqui o edital PODE atribuir ao comprador, e vale.",
    ...AVISO_COMUM ] };
  if (m.includes("venda direta")) return { natureza: "venda-direta", avisos: [
    "Sem disputa: leva o primeiro que fizer proposta com caução. Já passou por leilões sem comprador.",
    "Desconto maior costuma vir com pendência maior (ocupação, dívida, estado) — redobre a leitura do edital e da matrícula.",
    "Financiamento e FGTS só se o anúncio deste imóvel indicar.",
    ...AVISO_COMUM ] };
  if (m.includes("venda online")) return { natureza: "venda-direta", avisos: [
    "Disputa por lances com cronômetro; a Caixa já é dona (risco jurídico menor).",
    "Caução de 5% em até 2 dias úteis. Financiamento/FGTS só se o anúncio permitir.",
    "Confira no edital a responsabilidade por IPTU e condomínio atrasados.",
    ...AVISO_COMUM ] };
  return { natureza: "a-conferir", avisos: AVISO_COMUM };
}

/* diff entre a carga de hoje e o estado atual — decide os eventos, sem tocar no banco.
   `atuais`: Map external_id -> {preco, situacao, ausente_desde}. Devolve o plano. */
export function planejarDiff(incoming, atuais, agora = Date.now(), diasParaEncerrar = 3) {
  const vistos = new Set();
  const eventos = [], upserts = [];
  for (const im of incoming) {
    vistos.add(im.external_id);
    const cur = atuais.get(im.external_id);
    upserts.push(im);
    if (!cur) { eventos.push({ acao: "imovel-novo", id: im.external_id, detail: resumoEvento(im) }); continue; }
    if (cur.preco != null && im.preco != null && Number(cur.preco) !== Number(im.preco)) {
      const baixou = Number(im.preco) < Number(cur.preco);
      eventos.push({ acao: baixou ? "preco-baixou" : "preco-subiu", id: im.external_id,
        detail: { ...resumoEvento(im), de: Number(cur.preco), para: Number(im.preco) } });
    }
    if (cur.situacao !== "ativo") eventos.push({ acao: "voltou-a-lista", id: im.external_id, detail: resumoEvento(im) });
  }
  /* o que sumiu da carga de hoje */
  const encerrar = [], marcarAusente = [];
  for (const [id, cur] of atuais) {
    if (vistos.has(id) || cur.situacao === "encerrado") continue;
    const ausenteDesde = cur.ausente_desde ? new Date(cur.ausente_desde).getTime() : agora;
    if (cur.situacao === "ativo") { marcarAusente.push(id); }
    else if (agora - ausenteDesde >= diasParaEncerrar * 86400000) {
      encerrar.push(id);
      eventos.push({ acao: "saiu-da-lista", id, detail: { fonte: "caixa", motivo: "ausente há 3+ dias na lista da Caixa" } });
    }
  }
  return { upserts, eventos, marcarAusente, encerrar, vistos };
}
function resumoEvento(im) {
  return { fonte: "caixa", bairro: im.bairro, tipo: im.tipo, modalidade: im.modalidade,
    preco: im.preco, url: im.url };
}

/* ---------- IO (import tardio do banco: o núcleo puro roda na suíte sem Postgres) ---------- */

const num = (v) => (v == null || v === "" ? null : Number(v));

/* normaliza um item do payload do runner (schema do caixa-goiania.js + campos novos) */
function normalizaItem(i) {
  const id = String(i.id || "").trim();
  if (!id) return null;
  const url = /^https:\/\/venda-imoveis\.caixa\.gov\.br/.test(i.u || "") ? i.u : null;
  return {
    external_id: id, bairro: i.b || null, cdbairro: i.cb != null ? Number(i.cb) : null,
    endereco: i.e || null, tipo: i.t || null, modalidade: i.m || null,
    preco: num(i.p), avaliacao: num(i.a), desconto_caixa: num(i.d),
    area_m2: num(i.ar) ?? areaDaDescricao(i.desc), financiamento: i.fin === true || i.fin === "Sim" || null,
    x_utm: num(i.x), y_utm: num(i.y), precisao: i.pr || null, url,
  };
}

export async function ingerirCaixa(payload) {
  const { pool } = await import("./db.js");
  const geradoEm = (payload && payload.gerado) || null;
  const brutos = (payload && Array.isArray(payload.imoveis)) ? payload.imoveis : [];
  const incoming = brutos.map(normalizaItem).filter(Boolean);
  if (!incoming.length) { const e = new Error("payload sem imóveis"); e.status = 400; throw e; }

  const atuaisRows = await pool.query(
    "SELECT external_id, preco, situacao, ausente_desde FROM oportunidades WHERE fonte='caixa'");
  const atuais = new Map(atuaisRows.rows.map(r => [r.external_id, r]));
  const plano = planejarDiff(incoming, atuais);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const im of plano.upserts) {
      await client.query(
        `INSERT INTO oportunidades (fonte, external_id, bairro, cdbairro, endereco, tipo, modalidade,
           preco, avaliacao, desconto_caixa, area_m2, financiamento, x_utm, y_utm, precisao, url,
           situacao, gerado_em, visto_em, ausente_desde, atualizada_em)
         VALUES ('caixa',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'ativo',$16,now(),NULL,now())
         ON CONFLICT (fonte, external_id) DO UPDATE SET
           bairro=EXCLUDED.bairro, cdbairro=EXCLUDED.cdbairro, endereco=EXCLUDED.endereco,
           tipo=EXCLUDED.tipo, modalidade=EXCLUDED.modalidade, preco=EXCLUDED.preco,
           avaliacao=EXCLUDED.avaliacao, desconto_caixa=EXCLUDED.desconto_caixa, area_m2=EXCLUDED.area_m2,
           financiamento=EXCLUDED.financiamento, x_utm=EXCLUDED.x_utm, y_utm=EXCLUDED.y_utm,
           precisao=EXCLUDED.precisao, url=EXCLUDED.url, situacao='ativo', gerado_em=EXCLUDED.gerado_em,
           visto_em=now(), ausente_desde=NULL, atualizada_em=now()`,
        [im.external_id, im.bairro, im.cdbairro, im.endereco, im.tipo, im.modalidade,
          im.preco, im.avaliacao, im.desconto_caixa, im.area_m2, im.financiamento,
          im.x_utm, im.y_utm, im.precisao, im.url, geradoEm]);
    }
    if (plano.marcarAusente.length) await client.query(
      "UPDATE oportunidades SET situacao='ausente', ausente_desde=now(), atualizada_em=now() WHERE fonte='caixa' AND external_id = ANY($1)",
      [plano.marcarAusente]);
    if (plano.encerrar.length) await client.query(
      "UPDATE oportunidades SET situacao='encerrado', atualizada_em=now() WHERE fonte='caixa' AND external_id = ANY($1)",
      [plano.encerrar]);
    for (const ev of plano.eventos) await client.query(
      "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('oportunidade',$1,$2,$3)",
      [`caixa:${ev.id}`, ev.acao, JSON.stringify(ev.detail)]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }

  const stats = { recebidos: incoming.length, novos: plano.eventos.filter(e => e.acao === "imovel-novo").length,
    baixaram: plano.eventos.filter(e => e.acao === "preco-baixou").length,
    subiram: plano.eventos.filter(e => e.acao === "preco-subiu").length,
    voltaram: plano.eventos.filter(e => e.acao === "voltou-a-lista").length,
    marcadosAusentes: plano.marcarAusente.length, encerrados: plano.encerrar.length, geradoEm };
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('oportunidades','caixa','ingestao-caixa',$1)",
    [JSON.stringify(stats)]).catch(() => {});
  return stats;
}

/* lista para o MAPA no schema que o app já consome (window.CAIXA), enriquecida com o
   desconto vs índice e os avisos por modalidade. Só imóveis ativos com coordenada. */
export async function listarOportunidades() {
  const { pool } = await import("./db.js");
  const { indiceBairros } = await import("./indice-bairro.js");
  const { normalizaBairro } = await import("./estatistica.js");
  const [r, indice] = await Promise.all([
    pool.query(`SELECT external_id, bairro, cdbairro, endereco, tipo, modalidade, preco, avaliacao,
                       desconto_caixa, area_m2, financiamento, x_utm, y_utm, precisao, url, gerado_em
                FROM oportunidades WHERE fonte='caixa' AND situacao='ativo'`),
    indiceBairros(),
  ]);
  const porChave = new Map(indice.map(e => [`${e.bairro}|${e.tipo}`, e]));
  let gerado = null;
  const imoveis = r.rows.map(o => {
    if (o.gerado_em && (!gerado || o.gerado_em > gerado)) gerado = o.gerado_em;
    const ti = tipoIndice(o.tipo);
    const entrada = ti ? porChave.get(`${normalizaBairro(o.bairro)}|${ti}`) : null;
    const desc = descontoVsIndice(o, entrada);
    return {
      id: o.external_id, b: o.bairro, e: o.endereco, t: o.tipo, m: o.modalidade,
      p: o.preco != null ? Number(o.preco) : null, a: o.avaliacao != null ? Number(o.avaliacao) : null,
      d: o.desconto_caixa != null ? Number(o.desconto_caixa) : null,
      ar: o.area_m2 != null ? Number(o.area_m2) : null,
      fin: o.financiamento === true, cb: o.cdbairro,
      x: o.x_utm != null ? Number(o.x_utm) : null, y: o.y_utm != null ? Number(o.y_utm) : null,
      pr: o.precisao, u: o.url,
      descontoBairro: desc.disponivel ? desc : null, /* enriquecimento honesto */
      aviso: avisosDaModalidade(o.modalidade),
    };
  });
  return { gerado: gerado ? String(gerado) : null,
    fonte: "Lista oficial de imóveis da CAIXA (venda-imoveis.caixa.gov.br), atualizada diariamente",
    imoveis };
}

/* feed "Oportunidades em movimento" para o painel (últimos eventos, com fonte) */
export async function eventosOportunidades(limite = 8) {
  const { pool } = await import("./db.js");
  const r = await pool.query(
    `SELECT entity_id, action, detail, created_at FROM audit_log
     WHERE entity='oportunidade' AND action <> 'ingestao-caixa'
     ORDER BY created_at DESC LIMIT $1`, [limite]);
  return r.rows;
}
