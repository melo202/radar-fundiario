/* Ferramentas imobiliárias de leitura controladas pela aplicação.
   O Hermes nunca recebe conexão, SQL ou credenciais: recebe apenas o resultado compacto
   das ferramentas que este roteador determinístico escolheu para o pedido. */
import { pool } from "./db.js";

export const READ_ONLY_AGENT_TOOLS = Object.freeze([
  "consultar_meu_dia",
  "buscar_imovel",
  "abrir_dossie",
  "buscar_cliente",
  "buscar_comparaveis",
  "abrir_avaliacao",
  "consultar_entorno",
]);

const STOP = new Set(["qual", "quais", "como", "para", "sobre", "este", "esta", "meu", "minha", "hoje", "agora", "imovel", "imoveis", "cliente", "clientes", "corretor", "carteira", "preciso", "quero", "pode", "faca", "mostre", "mostrar", "analise", "analisar"]);
const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const singular = term => term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term;
const termos = prompt => [...new Set(norm(prompt).split(" ").filter(x => x.length >= 3 && !STOP.has(x)).map(singular))].slice(-8);

function ordenarPorTermos(rows, prompt, fields) {
  const ts = termos(prompt);
  return rows.map(row => {
    const text = norm(fields.map(field => row[field]).filter(Boolean).join(" "));
    return { row, score: ts.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0) };
  }).filter(item => !ts.length || item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.row.updated_at || b.row.created_at) - new Date(a.row.updated_at || a.row.created_at))
    .slice(0, 8).map(item => item.row);
}

async function consultarMeuDia() {
  const { visaoHoje } = await import("./os-core.js");
  const d = await visaoHoje();
  return { counts: d.counts, actions: (d.actions || []).slice(0, 12).map(a => ({
    title: a.title, reason: a.reason, dueAt: a.dueAt, priority: a.priority,
    entityType: a.entityType, entityId: a.entityId,
  })) };
}

async function buscarImovel(session, prompt) {
  if (session.object_type === "property" && session.object_id) {
    const { dossieImovel } = await import("./os-core.js");
    const d = await dossieImovel(session.object_id);
    if (!d.ok) return { unavailable: true };
    const p = d.property;
    return { property: { id: p.id, title: p.title, stage: p.capture_stage, type: p.property_type,
      neighborhood: p.neighborhood, askingPrice: p.asking_price, characteristics: p.characteristics,
      conditions: p.commercial_conditions },
    pendingTasks: (d.tasks || []).filter(t => !["concluida","cancelada"].includes(t.status)).map(t => ({ title: t.title, dueAt: t.due_at, priority: t.priority })),
    opportunities: (d.opportunities || []).map(o => ({ stage: o.stage, temperature: o.temperature, nextActionAt: o.next_action_at })) };
  }
  const r = await pool.query(
    `SELECT id,title,capture_stage,property_type,neighborhood,asking_price,characteristics,updated_at
     FROM inventory_properties WHERE organization_id=$1 AND status='ativo'
     ORDER BY updated_at DESC LIMIT 60`, [session.organization_id]);
  return { matches: ordenarPorTermos(r.rows, prompt, ["title","neighborhood","property_type"]).map(p => ({
    id: p.id, title: p.title, stage: p.capture_stage, type: p.property_type,
    neighborhood: p.neighborhood, askingPrice: p.asking_price, characteristics: p.characteristics,
  })) };
}

async function buscarCliente(session, prompt) {
  if (session.object_type === "contact" && session.object_id) {
    const r = await pool.query(
      `SELECT c.id,c.type,c.name,c.status,c.source,c.created_at,
              (SELECT count(*)::int FROM opportunities o WHERE o.contact_id=c.id AND o.stage NOT IN ('fechado','perdido')) AS open_opportunities,
              (SELECT max(last_interaction_at) FROM opportunities o WHERE o.contact_id=c.id) AS last_interaction_at
       FROM contacts c WHERE c.id=$1 AND c.organization_id=$2`, [session.object_id, session.organization_id]);
    return r.rowCount ? { matches: r.rows } : { unavailable: true };
  }
  const r = await pool.query(
    `SELECT c.id,c.type,c.name,c.status,c.source,c.created_at,
            (SELECT count(*)::int FROM opportunities o WHERE o.contact_id=c.id AND o.stage NOT IN ('fechado','perdido')) AS open_opportunities,
            (SELECT max(last_interaction_at) FROM opportunities o WHERE o.contact_id=c.id) AS last_interaction_at
     FROM contacts c WHERE c.organization_id=$1 AND c.status='ativo'
     ORDER BY c.updated_at DESC LIMIT 60`, [session.organization_id]);
  return { matches: ordenarPorTermos(r.rows, prompt, ["name","type","source"]) };
}

async function avaliacaoDaSessao(session) {
  if (session.object_type === "valuation" && session.object_id) {
    const r = await pool.query(
      "SELECT id,subject,status,result,version,parent_id,created_at FROM valuations WHERE id=$1", [session.object_id]);
    return r.rows[0] || null;
  }
  if (session.object_type === "property" && session.object_id) {
    const { dossieImovel } = await import("./os-core.js");
    const d = await dossieImovel(session.object_id);
    return d.ok ? d.latestValuation || null : null;
  }
  return null;
}

function avaliacaoCompacta(v) {
  if (!v) return { unavailable: true, missing: "Este imóvel ainda não possui pesquisa de mercado vinculada." };
  const r = v.result || {};
  return { valuation: {
    id: v.id, status: v.status, version: v.version, createdAt: v.created_at,
    subject: v.subject, estimatedValue: r.estimatedValue, estimatedPricePerM2: r.estimatedPricePerM2,
    probableRange: r.probableRange, confidence: r.confidence, sample: r.sample,
    methods: r.methods, assumptions: r.assumptions, warnings: r.warnings,
    research: r.pesquisa, regionalContext: r.contextoRegional, marketIndex: r.indiceMercado,
    location: r.localizacao, reportUrl: `/motor/avaliacoes/${v.id}/documento`,
  } };
}

async function abrirAvaliacao(session) {
  return avaliacaoCompacta(await avaliacaoDaSessao(session));
}

async function buscarComparaveis(session) {
  const v = await avaliacaoDaSessao(session);
  if (!v) return { unavailable: true, missing: "Pesquise o mercado deste imóvel antes de analisar comparáveis." };
  const q = await pool.query(
    `SELECT vc.accepted,vc.is_outlier,vc.total_score,vc.factors,vc.rejection_reasons,vc.warnings,vc.manual_change,
            p.neighborhood,p.characteristics,p.pricing,p.location_confidence,
            l.portal,l.url,l.collected_at
     FROM valuation_comparables vc
     JOIN properties p ON p.id=vc.property_id JOIN listings l ON l.id=p.listing_id
     WHERE vc.valuation_id=$1
     ORDER BY vc.accepted DESC,vc.is_outlier,vc.total_score DESC NULLS LAST LIMIT 24`, [v.id]);
  return { valuationId: v.id, status: v.status, sample: v.result?.sample,
    comparables: q.rows.map(c => ({
      portal: c.portal, url: c.url, collectedAt: c.collected_at, neighborhood: c.neighborhood,
      areaM2: c.characteristics?.privateAreaM2 ?? c.characteristics?.totalAreaM2 ?? null,
      bedrooms: c.characteristics?.bedrooms ?? null, askingPrice: c.pricing?.askingPrice ?? null,
      accepted: c.accepted, outlier: c.is_outlier, score: c.total_score,
      rejectionReasons: c.rejection_reasons, warnings: c.warnings, manualReview: c.manual_change,
    })) };
}

async function consultarEntorno(session) {
  const v = await avaliacaoDaSessao(session);
  if (v?.result?.localizacao) return { valuationId: v.id, reused: true, measurement: v.result.localizacao };
  let lat = Number(v?.subject?.lat), lon = Number(v?.subject?.lon);
  if (session.object_type === "property" && session.object_id) {
    const q = await pool.query(
      `SELECT ST_Y(geom::geometry) AS lat,ST_X(geom::geometry) AS lon
       FROM inventory_properties WHERE id=$1 AND organization_id=$2`, [session.object_id, session.organization_id]);
    if (q.rowCount && q.rows[0].lat != null) { lat = Number(q.rows[0].lat); lon = Number(q.rows[0].lon); }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon))
    return { unavailable: true, missing: "Falta confirmar a posição do imóvel no mapa para medir o entorno." };
  const { entorno } = await import("./localizacao.js");
  const d = await entorno({ lat, lon });
  return { reused: !!d.fromCache, coordinates: { lat, lon }, dataQuality: d.dataQuality,
    categories: Object.values(d.categorias).filter(c => c.count > 0)
      .map(c => ({ label: c.rotulo, count: c.count, nearestMeters: c.nearestDistanceMeters, radiusMeters: c.raioM, signal: c.sinal })) };
}

export function chooseReadOnlyTools(prompt, session) {
  const text = norm(prompt);
  const chosen = [];
  const contagem = /\b(quantos|quantas|total)\b/.test(text);
  const contextoImovel = ["property","valuation"].includes(session.object_type);
  if (contextoImovel && /\b(comparavel|comparaveis|oferta|ofertas|amostra|anuncio|anuncios)\b/.test(text)) chosen.push("buscar_comparaveis");
  if (contextoImovel && /\b(avaliacao|valor|preco|mercado|relatorio|pesquisa|evidencia|evidencias)\b/.test(text)) chosen.push("abrir_avaliacao");
  if (contextoImovel && /\b(entorno|regiao|localizacao|servico|servicos|transporte|escola|escolas|farmacia|farmacias|supermercado|supermercados)\b/.test(text)) chosen.push("consultar_entorno");
  if (session.object_type === "property" && chosen.length < 2) chosen.push("abrir_dossie");
  else if (session.object_type === "valuation" && !chosen.length) chosen.push("abrir_avaliacao");
  else if (session.object_type === "contact") chosen.push("buscar_cliente");
  if (contagem || /\b(hoje|dia|prioridade|pendencia|tarefa|atencao|urgente)\b/.test(text)) chosen.push("consultar_meu_dia");
  if (!contagem && session.object_type !== "property" && /\b(imovel|imoveis|carteira|captacao|apartamento|apartamentos|casa|casas|terreno|terrenos)\b/.test(text)) chosen.push("buscar_imovel");
  if (!contagem && session.object_type !== "contact" && /\b(cliente|clientes|contato|contatos|proprietario|proprietarios|comprador|compradores|relacionamento|relacionamentos)\b/.test(text)) chosen.push("buscar_cliente");
  return [...new Set(chosen)].slice(0, 2);
}

export async function runReadOnlyTools(prompt, session) {
  const selected = chooseReadOnlyTools(prompt, session);
  const results = [];
  for (const tool of selected) {
    try {
      let data;
      if (tool === "consultar_meu_dia") data = await consultarMeuDia();
      else if (tool === "buscar_imovel" || tool === "abrir_dossie") data = await buscarImovel(session, prompt);
      else if (tool === "buscar_cliente") data = await buscarCliente(session, prompt);
      else if (tool === "buscar_comparaveis") data = await buscarComparaveis(session);
      else if (tool === "abrir_avaliacao") data = await abrirAvaliacao(session);
      else if (tool === "consultar_entorno") data = await consultarEntorno(session);
      const source = tool === "buscar_comparaveis" ? "ofertas públicas rastreadas no relatório de mercado"
        : tool === "abrir_avaliacao" ? "motor determinístico e avaliação versionada"
        : tool === "consultar_entorno" ? "OpenStreetMap processado localmente, sem ajuste de preço"
        : "carteira privada do Corretor Inteligente";
      results.push({ tool, source, data });
    } catch {
      results.push({ tool, source: "carteira privada do Corretor Inteligente", unavailable: true });
    }
  }
  return results;
}
