/* Ferramentas imobiliárias de leitura controladas pela aplicação.
   O Hermes nunca recebe conexão, SQL ou credenciais: recebe apenas o resultado compacto
   das ferramentas que este roteador determinístico escolheu para o pedido. */
import { pool } from "./db.js";
import { selectRelevantDocumentSegments } from "./document-intake.js";

export const READ_ONLY_AGENT_TOOLS = Object.freeze([
  "consultar_meu_dia",
  "buscar_imovel",
  "abrir_dossie",
  "buscar_cliente",
  "buscar_comparaveis",
  "abrir_avaliacao",
  "consultar_entorno",
  "preparar_visita",
  "ler_documentos",
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
    opportunities: (d.opportunities || []).map(o => ({ stage: o.stage, temperature: o.temperature, nextActionAt: o.next_action_at })),
    intelligenceSignals: (d.intelligence?.findings || [])
      .filter(f => f.status !== "rejected" && !["false_positive","expired","wrong_scope"].includes(f.feedback?.decision))
      .map(f => ({ kind: f.kind, title: f.title, summary: f.summary,
      confidence: f.confidence, relation: f.relation, status: f.status, humanDecision: f.feedback?.decision || null,
      evidence: (f.evidence || []).map(e => ({ title: e.title, domain: e.domain, url: e.url })) })) };
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

export function visitPreparationChecklist({ scheduledAt, address, occupancy, askingPrice, valuationId, preferences, documents = [] } = {}) {
  const items = [];
  const add = (status, item, reason) => items.push({ status, item, reason });
  add(scheduledAt ? "ok" : "missing", scheduledAt ? "Data registrada" : "Confirmar a data", scheduledAt ? "A data consta na oportunidade; confirme o horário e o ponto de encontro com o cliente." : "A visita está sem data confirmada no sistema.");
  add("missing", "Confirmar horário e ponto de encontro", "A agenda atual registra a data, mas ainda não guarda um horário confiável.");
  add(address ? "ok" : "missing", address ? "Endereço registrado" : "Confirmar endereço completo e ponto de encontro", address ? "Consta no imóvel." : "O endereço não está completo na carteira.");
  add(occupancy ? "ok" : "missing", occupancy ? "Ocupação e acesso registrados" : "Confirmar ocupação, chaves e acesso", occupancy ? "Consta no imóvel." : "O modo de acesso ainda não foi informado.");
  add(askingPrice ? "ok" : "missing", askingPrice ? "Preço pedido registrado" : "Confirmar preço e condições comerciais", askingPrice ? "Consta no imóvel." : "O preço pedido ainda não foi confirmado.");
  add(valuationId ? "ok" : "missing", valuationId ? "Pesquisa de mercado disponível" : "Pesquisar mercado antes da visita", valuationId ? "Há relatório versionado e rastreável." : "Ainda não existe relatório ligado a este imóvel.");
  add(preferences && Object.keys(preferences).length ? "ok" : "missing", preferences && Object.keys(preferences).length ? "Preferências do cliente registradas" : "Confirmar objetivo e critérios do cliente", preferences && Object.keys(preferences).length ? "Há critérios declarados no relacionamento." : "Não há preferências estruturadas para orientar a visita.");
  add(documents.length ? "ok" : "missing", documents.length ? "Documentos disponíveis no dossiê" : "Separar documentos e informações essenciais", documents.length ? `${documents.length} arquivo(s) rastreado(s).` : "Não há documento processado ligado ao imóvel ou à visita.");
  return items;
}

async function prepararVisita(session) {
  if (session.object_type !== "visit" || !session.object_id) return { unavailable: true, missing: "Abra uma visita agendada para preparar este atendimento." };
  const q = await pool.query(
    `SELECT o.id,o.stage,o.temperature,o.next_action_at,o.last_interaction_at,
            c.name AS contact_name,c.type AS contact_type,
            cp.transaction_type,cp.property_types,cp.neighborhoods,cp.price_min,cp.price_max,
            cp.bedrooms_min,cp.parking_min,cp.area_min,cp.area_max,cp.required_features,cp.preferred_features,
            p.id AS property_id,p.title AS property_title,p.property_type,p.neighborhood,p.address,
            p.characteristics,p.asking_price,p.occupancy,p.commercial_conditions,
            v.id AS valuation_id,v.status AS valuation_status,v.result AS valuation_result,v.created_at AS valuation_created_at
     FROM opportunities o
     JOIN contacts c ON c.id=o.contact_id
     LEFT JOIN contact_preferences cp ON cp.contact_id=c.id AND cp.organization_id=o.organization_id
     LEFT JOIN inventory_properties p ON p.id=o.inventory_property_id AND p.organization_id=o.organization_id
     LEFT JOIN LATERAL (
       SELECT id,status,result,created_at FROM valuations
       WHERE id=p.latest_valuation_id OR subject->>'inventoryPropertyId'=p.id::text
       ORDER BY CASE WHEN id=p.latest_valuation_id THEN 0 ELSE 1 END,created_at DESC LIMIT 1
     ) v ON true
     WHERE o.id=$1 AND o.organization_id=$2 AND o.stage IN ('visita_agendada','visitou')`,
    [session.object_id, session.organization_id]);
  if (!q.rowCount) return { unavailable: true, missing: "A visita não foi encontrada ou não está mais em um estágio de visita." };
  const row = q.rows[0];
  const [tasks, documents, comparables] = await Promise.all([
    pool.query(
      `SELECT title,due_at,priority,status FROM tasks
       WHERE organization_id=$1 AND status IN ('pendente','em_andamento','adiada')
         AND ((related_entity_type='opportunity' AND related_entity_id=$2)
           OR (related_entity_type='inventory_property' AND related_entity_id=$3))
       ORDER BY due_at ASC NULLS LAST LIMIT 20`, [session.organization_id, row.id, row.property_id]),
    pool.query(
      `SELECT file_name,mime_type,status,extraction_method,factual_summary,updated_at
       FROM agent_documents WHERE organization_id=$1
         AND ((object_type='visit' AND object_id=$2) OR (object_type='property' AND object_id=$3))
       ORDER BY updated_at DESC LIMIT 20`, [session.organization_id, row.id, row.property_id]),
    row.valuation_id ? pool.query(
      `SELECT l.portal,l.url,p.neighborhood,p.characteristics,p.pricing,vc.total_score
       FROM valuation_comparables vc JOIN properties p ON p.id=vc.property_id JOIN listings l ON l.id=p.listing_id
       WHERE vc.valuation_id=$1 AND vc.accepted IS TRUE AND vc.is_outlier IS NOT TRUE
       ORDER BY vc.total_score DESC NULLS LAST LIMIT 8`, [row.valuation_id]) : Promise.resolve({ rows: [] }),
  ]);
  const preferences = Object.fromEntries(Object.entries({
    transactionType: row.transaction_type, propertyTypes: row.property_types, neighborhoods: row.neighborhoods,
    priceMin: row.price_min, priceMax: row.price_max, bedroomsMin: row.bedrooms_min,
    parkingMin: row.parking_min, areaMin: row.area_min, areaMax: row.area_max,
    requiredFeatures: row.required_features, preferredFeatures: row.preferred_features,
  }).filter(([, value]) => value != null && (!Array.isArray(value) || value.length)));
  const docs = documents.rows.map(d => ({ fileName: d.file_name, mimeType: d.mime_type, status: d.status,
    extractionMethod: d.extraction_method, factualSummary: d.factual_summary, updatedAt: d.updated_at }));
  const vr = row.valuation_result || {};
  return {
    visit: { id: row.id, stage: row.stage, scheduledAt: row.next_action_at, temperature: row.temperature, lastInteractionAt: row.last_interaction_at },
    client: { name: row.contact_name, type: row.contact_type, preferences },
    property: { id: row.property_id, title: row.property_title, type: row.property_type,
      neighborhood: row.neighborhood, address: row.address, characteristics: row.characteristics,
      askingPrice: row.asking_price, occupancy: row.occupancy, commercialConditions: row.commercial_conditions },
    valuation: row.valuation_id ? { id: row.valuation_id, status: row.valuation_status, createdAt: row.valuation_created_at,
      estimatedValue: vr.estimatedValue, probableRange: vr.probableRange, confidence: vr.confidence,
      sample: vr.sample, warnings: vr.warnings, reportUrl: `/motor/avaliacoes/${row.valuation_id}/documento` } : { unavailable: true },
    acceptedComparables: comparables.rows.map(c => ({ portal: c.portal, url: c.url, neighborhood: c.neighborhood,
      areaM2: c.characteristics?.privateAreaM2 ?? c.characteristics?.totalAreaM2 ?? null,
      bedrooms: c.characteristics?.bedrooms ?? null, askingPrice: c.pricing?.askingPrice ?? null, score: c.total_score })),
    pendingTasks: tasks.rows,
    documents: docs,
    checklist: visitPreparationChecklist({ scheduledAt: row.next_action_at, address: row.address, occupancy: row.occupancy,
      askingPrice: row.asking_price, valuationId: row.valuation_id, preferences, documents: docs.filter(d => ["extracted","indexed","reviewed"].includes(d.status)) }),
  };
}

async function lerDocumentos(session, prompt) {
  let propertyId = session.object_type === "property" ? session.object_id : null;
  const visitId = session.object_type === "visit" ? session.object_id : null;
  if (visitId) {
    const q = await pool.query(
      "SELECT inventory_property_id FROM opportunities WHERE id=$1 AND organization_id=$2", [visitId, session.organization_id]);
    propertyId = q.rows[0]?.inventory_property_id || null;
  }
  if (!propertyId && !visitId) return { unavailable: true, missing: "Abra o imóvel ou a visita a que os documentos pertencem." };
  const docs = await pool.query(
    `SELECT id,file_name,mime_type,status,extraction_method,page_count,error,updated_at
     FROM agent_documents WHERE organization_id=$1
       AND ((object_type='property' AND object_id=$2) OR (object_type='visit' AND object_id=$3))
     ORDER BY updated_at DESC LIMIT 30`, [session.organization_id, propertyId, visitId]);
  if (!docs.rowCount) return { documents: [], missing: "Nenhum documento foi anexado a este imóvel ou visita." };
  const segments = await pool.query(
    `SELECT s.document_id,d.file_name,s.page_start,s.page_end,s.section,s.content
     FROM agent_document_segments s JOIN agent_documents d ON d.id=s.document_id
     WHERE d.organization_id=$1 AND d.status IN ('extracted','indexed','reviewed')
       AND ((d.object_type='property' AND d.object_id=$2) OR (d.object_type='visit' AND d.object_id=$3))
     ORDER BY d.updated_at DESC,s.page_start NULLS LAST,s.id LIMIT 240`,
    [session.organization_id, propertyId, visitId]);
  let relevant = selectRelevantDocumentSegments(segments.rows, prompt, 12_000);
  if (!relevant.length && segments.rowCount) relevant = selectRelevantDocumentSegments(segments.rows, "", 12_000);
  return {
    documents: docs.rows.map(d => ({ id: d.id, fileName: d.file_name, mimeType: d.mime_type,
      status: d.status, extractionMethod: d.extraction_method, pageCount: d.page_count,
      error: d.status === "error" ? d.error : null, updatedAt: d.updated_at })),
    selectedSegments: relevant.map(s => ({ documentId: s.document_id, fileName: s.file_name,
      pageStart: s.page_start, pageEnd: s.page_end, section: s.section, content: s.content, relevance: s.relevance })),
    selectionPolicy: "recuperação lexical local; máximo de 12 mil caracteres; arquivo completo não enviado ao modelo",
  };
}

export function chooseReadOnlyTools(prompt, session) {
  const text = norm(prompt);
  const chosen = [];
  const contagem = /\b(quantos|quantas|total)\b/.test(text);
  /* AUD-04 (auditoria do painel 21/07 — o bug mais caro do produto): "qual imóvel tá
     PENDENTE" não casava nenhum gatilho de dia ("pendencia|tarefa|hoje|…"), só
     buscar_imovel rodava, e o modelo — sem a lista de pendências no contexto — afirmou
     que não havia nenhuma (com 8 ativas). Conversa GERAL agora abre SEMPRE com o estado
     do dia (consultar_meu_dia é 1 query local barata); o assistente nasce sabendo. */
  if (session.object_type === "general") chosen.push("consultar_meu_dia");
  /* Uma visita já aponta para oportunidade, pessoa e imóvel exatos. Buscar por palavras
     novamente desperdiça tokens e pode misturar homônimos ou outros imóveis. */
  if (session.object_type === "visit") return /\b(documento|documentos|arquivo|arquivos|matricula|certidao|contrato|escritura|onus|penhora)\b/.test(text)
    ? ["preparar_visita", "ler_documentos"] : ["preparar_visita"];
  const contextoImovel = ["property","valuation"].includes(session.object_type);
  if (contextoImovel && /\b(comparavel|comparaveis|oferta|ofertas|amostra|anuncio|anuncios)\b/.test(text)) chosen.push("buscar_comparaveis");
  if (contextoImovel && /\b(avaliacao|valor|preco|mercado|relatorio|pesquisa|evidencia|evidencias)\b/.test(text)) chosen.push("abrir_avaliacao");
  if (contextoImovel && /\b(entorno|regiao|localizacao|servico|servicos|transporte|escola|escolas|farmacia|farmacias|supermercado|supermercados)\b/.test(text)) chosen.push("consultar_entorno");
  if (session.object_type === "property" && /\b(documento|documentos|arquivo|arquivos|matricula|certidao|contrato|escritura|onus|penhora)\b/.test(text)) chosen.push("ler_documentos");
  if (session.object_type === "property" && chosen.length < 2) chosen.push("abrir_dossie");
  else if (session.object_type === "valuation" && !chosen.length) chosen.push("abrir_avaliacao");
  else if (session.object_type === "contact") chosen.push("buscar_cliente");
  /* AUD-04: gatilho ampliado — a família toda de "pendente/vencido/atrasado/prazo/
     prioridades/urgencias/agenda/resolver" também significa "consultar o dia". */
  if (contagem || /\b(hoje|dia|prioridade|prioridades|pendencia|pendencias|pendente|pendentes|tarefa|tarefas|atencao|urgente|urgentes|urgencia|urgencias|vencido|vencida|vencidos|vencidas|atrasado|atrasada|atrasados|atrasadas|prazo|prazos|agenda|resolver|fazer)\b/.test(text)) chosen.push("consultar_meu_dia");
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
      else if (tool === "preparar_visita") data = await prepararVisita(session);
      else if (tool === "ler_documentos") data = await lerDocumentos(session, prompt);
      const source = tool === "buscar_comparaveis" ? "ofertas públicas rastreadas no relatório de mercado"
        : tool === "abrir_avaliacao" ? "motor determinístico e avaliação versionada"
        : tool === "consultar_entorno" ? "OpenStreetMap processado localmente, sem ajuste de preço"
        : tool === "preparar_visita" ? "oportunidade, carteira, documentos e avaliação versionada"
        : tool === "ler_documentos" ? "arquivos privados extraídos e indexados localmente na VPS"
        : "carteira privada do Corretor Inteligente";
      results.push({ tool, source, data });
    } catch {
      results.push({ tool, source: "carteira privada do Corretor Inteligente", unavailable: true });
    }
  }
  return results;
}
