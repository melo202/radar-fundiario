/* Ferramentas imobiliárias de leitura controladas pela aplicação.
   O Hermes nunca recebe conexão, SQL ou credenciais: recebe apenas o resultado compacto
   das ferramentas que este roteador determinístico escolheu para o pedido. */
import { pool } from "./db.js";

export const READ_ONLY_AGENT_TOOLS = Object.freeze([
  "consultar_meu_dia",
  "buscar_imovel",
  "abrir_dossie",
  "buscar_cliente",
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

export function chooseReadOnlyTools(prompt, session) {
  const text = norm(prompt);
  const chosen = [];
  const contagem = /\b(quantos|quantas|total)\b/.test(text);
  if (session.object_type === "property") chosen.push("abrir_dossie");
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
      results.push({ tool, source: "carteira privada do Corretor Inteligente", data });
    } catch {
      results.push({ tool, source: "carteira privada do Corretor Inteligente", unavailable: true });
    }
  }
  return results;
}
