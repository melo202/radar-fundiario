/* Corretor Inteligente OS — primeiro corte operacional.
   Regra estrutural: o domínio privado da carteira NÃO reutiliza `properties`, que pertence
   ao acervo público de mercado. A IA não decide prioridade nesta fase: regras determinísticas,
   explicáveis e testáveis alimentam a tela Hoje. */

let _pool = null;
async function banco() {
  if (!_pool) ({ pool: _pool } = await import("./db.js"));
  return _pool;
}

const TEXTO_NUMERO = new Map([
  ["um", 1], ["uma", 1], ["dois", 2], ["duas", 2], ["tres", 3], ["três", 3],
  ["quatro", 4], ["cinco", 5], ["seis", 6], ["sete", 7], ["oito", 8],
]);

export const limparTexto = (valor, max = 300) =>
  String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export const normalizarTelefone = (valor) => {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
};

function numeroDePalavra(valor) {
  const bruto = String(valor ?? "").toLowerCase();
  if (/^\d+$/.test(bruto)) return Number(bruto);
  return TEXTO_NUMERO.get(bruto) ?? null;
}

export function extrairPreco(texto) {
  const t = limparTexto(texto, 2000).toLowerCase();
  const expressoes = [
    /r\$\s*([\d.]+(?:,\d+)?)\s*(milh(?:ão|oes|ões)|mil|mi|k)?/i,
    /(?:quer|pede|preço|preco|valor|expectativa(?:\s+de)?)\s*(?:é|de|:)?\s*([\d.]+(?:,\d+)?)\s*(milh(?:ão|oes|ões)|mil|mi|k)?/i,
    /([\d.]+(?:,\d+)?)\s*(milh(?:ão|oes|ões)|mil|mi)\b/i,
  ];
  for (const re of expressoes) {
    const m = re.exec(t);
    if (!m) continue;
    let numero = Number(m[1].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) continue;
    const unidade = (m[2] || "").toLowerCase();
    if (/milh|^mi$/.test(unidade)) numero *= 1_000_000;
    else if (/^mil$|^k$/.test(unidade)) numero *= 1_000;
    return Math.round(numero);
  }
  return null;
}

export function extrairTipoImovel(texto) {
  const t = limparTexto(texto, 2000).toLowerCase();
  const tipos = [
    ["apartamento", /\b(apartamento|apto)\b/],
    ["casa", /\b(casa|sobrado)\b/],
    ["terreno", /\b(terreno|lote)\b/],
    ["galpao", /\b(galp[aã]o)\b/],
    ["sala_comercial", /\b(sala comercial|conjunto comercial)\b/],
    ["fazenda", /\b(fazenda|ch[aá]cara|s[ií]tio)\b/],
    ["loja", /\b(loja|ponto comercial)\b/],
  ];
  return tipos.find(([, re]) => re.test(t))?.[0] ?? null;
}

export function extrairQuartos(texto) {
  const t = limparTexto(texto, 2000).toLowerCase();
  const m = /\b(\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito)\s+(?:quartos?|dormit[oó]rios?)\b/i.exec(t);
  return m ? numeroDePalavra(m[1]) : null;
}

export function extrairBairro(texto) {
  const original = limparTexto(texto, 2000);
  const m = /\b(?:no|na)\s+((?:(?:setor|bairro|jardim|jardins|parque|vila|residencial)\s+)?[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .'-]{1,45}?)(?=,|;|\s+(?:com|tem|possui|de)\s+(?:\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco)|\s+propriet[aá]ri|\s+por\s+r\$|\s+(?:quer|pede|aceita)\b|$)/i.exec(original);
  return m ? limparTexto(m[1], 60) : null;
}

export function extrairProprietario(texto) {
  const original = limparTexto(texto, 2000);
  const telefoneMatch = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/.exec(original);
  const telefone = telefoneMatch ? normalizarTelefone(telefoneMatch[0]) : null;
  const nomeMatch = /propriet[aá]ri[oa]\s*(?:é|e|:)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]{1,60}?)(?=,|;|\s+(?:telefone|fone|whatsapp|celular|quer|pede|aceita)\b|$)/i.exec(original);
  const nome = nomeMatch ? limparTexto(nomeMatch[1], 80) : null;
  return nome || telefone ? { name: nome, phone: telefone, type: "proprietario" } : null;
}

export function interpretarCaptura(texto) {
  const entrada = limparTexto(texto, 2000);
  if (entrada.length < 8) return { ok: false, erro: "Descreva o imóvel com um pouco mais de contexto." };

  const property = {
    propertyType: extrairTipoImovel(entrada),
    neighborhood: extrairBairro(entrada),
    bedrooms: extrairQuartos(entrada),
    askingPrice: extrairPreco(entrada),
    acceptsSwap: /\baceita\s+permuta\b/i.test(entrada),
    transactionType: /\b(aluguel|alugar|loca[cç][aã]o)\b/i.test(entrada) ? "locacao" : "venda",
    sourceText: entrada,
  };
  const owner = extrairProprietario(entrada);
  const missing = [];
  if (!property.propertyType) missing.push("tipo do imóvel");
  if (!property.neighborhood) missing.push("bairro ou região");
  if (!property.askingPrice) missing.push("expectativa de preço");
  if (!owner?.name && !owner?.phone) missing.push("contato do proprietário");
  if (!owner?.phone) missing.push("telefone do proprietário");
  missing.push("autorização de divulgação");

  return {
    ok: true,
    kind: "property_capture",
    property,
    owner,
    missing: [...new Set(missing)],
    confidence: {
      propertyType: property.propertyType ? 0.96 : 0,
      neighborhood: property.neighborhood ? 0.78 : 0,
      bedrooms: property.bedrooms ? 0.94 : 0,
      askingPrice: property.askingPrice ? 0.92 : 0,
      owner: owner ? 0.72 : 0,
    },
    confirmationRequired: true,
  };
}

const PESO_PRIORIDADE = { baixa: 1, normal: 2, alta: 4, critica: 6 };
export function calcularPrioridade(acao, agora = new Date()) {
  if (!acao || ["concluida", "cancelada"].includes(acao.status)) return -Infinity;
  const base = PESO_PRIORIDADE[acao.priority] ?? 2;
  if (!acao.dueAt) return base;
  const prazo = new Date(acao.dueAt).getTime();
  const deltaHoras = (prazo - agora.getTime()) / 3_600_000;
  if (deltaHoras < -72) return base + 8;
  if (deltaHoras < 0) return base + 6;
  if (deltaHoras <= 24) return base + 4;
  if (deltaHoras <= 72) return base + 2;
  return base;
}

export function ordenarAcoes(acoes, agora = new Date()) {
  return [...(acoes || [])]
    .map(a => ({ ...a, score: calcularPrioridade(a, agora) }))
    .filter(a => Number.isFinite(a.score))
    .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title), "pt-BR"));
}

async function garantirOrganizacao(client = null) {
  const db = client || await banco();
  const nome = limparTexto(process.env.OS_ORG_NAME || "Corretor Inteligente", 100);
  const r = await db.query(
    `INSERT INTO organizations (name, slug, type)
     VALUES ($1, 'default', 'corretor_autonomo')
     ON CONFLICT (slug) DO UPDATE SET updated_at=organizations.updated_at
     RETURNING id, name`, [nome]);
  return r.rows[0];
}

async function registrarEvento(client, organizationId, eventType, entityType, entityId, payload = {}, source = "corretor-os") {
  await client.query(
    `INSERT INTO domain_events (organization_id,event_type,entity_type,entity_id,payload,source)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [organizationId, eventType, entityType, entityId || null, JSON.stringify(payload), source]);
}

function tituloImovel(p) {
  const tipo = ({ apartamento: "Apartamento", casa: "Casa", terreno: "Terreno", galpao: "Galpão", sala_comercial: "Sala comercial", fazenda: "Fazenda", loja: "Loja" })[p.propertyType] || "Imóvel";
  return p.neighborhood ? `${tipo} · ${p.neighborhood}` : tipo;
}

export async function confirmarCaptura(dados) {
  const property = dados?.property || {};
  const owner = dados?.owner || null;
  if (!property.propertyType) return { ok: false, erro: "Confirme o tipo do imóvel antes de criar o cadastro." };
  const db = await banco();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const org = await garantirOrganizacao(client);
    let ownerId = null;
    const telefone = normalizarTelefone(owner?.phone);
    const nome = limparTexto(owner?.name || (telefone ? "Proprietário a identificar" : ""), 100);
    if (nome || telefone) {
      if (telefone) {
        const existente = await client.query(
          `SELECT id FROM contacts WHERE organization_id=$1 AND phone=$2 AND status<>'arquivado' LIMIT 1`,
          [org.id, telefone]);
        ownerId = existente.rows[0]?.id || null;
      }
      if (!ownerId) {
        const c = await client.query(
          `INSERT INTO contacts (organization_id,type,name,phone,source,metadata)
           VALUES ($1,'proprietario',$2,$3,'captura_universal',$4) RETURNING id`,
          [org.id, nome || "Proprietário a identificar", telefone, JSON.stringify({ confirmationStatus: "pendente" })]);
        ownerId = c.rows[0].id;
        await registrarEvento(client, org.id, "contact.created", "contact", ownerId, { type: "proprietario", source: "captura_universal" });
      }
    }

    const characteristics = {
      bedrooms: Number.isInteger(property.bedrooms) ? property.bedrooms : null,
      source: "captura_universal",
      confirmationStatus: "pendente",
    };
    const conditions = { acceptsSwap: !!property.acceptsSwap };
    const imovel = await client.query(
      `INSERT INTO inventory_properties
       (organization_id,title,capture_stage,transaction_type,property_type,neighborhood,characteristics,asking_price,owner_contact_id,commercial_conditions)
       VALUES ($1,$2,'prospect',$3,$4,$5,$6,$7,$8,$9)
       RETURNING id,title,capture_stage,created_at`,
      [org.id, tituloImovel(property), property.transactionType === "locacao" ? "locacao" : "venda",
        property.propertyType, limparTexto(property.neighborhood, 80) || null, JSON.stringify(characteristics),
        Number(property.askingPrice) > 0 ? Number(property.askingPrice) : null, ownerId, JSON.stringify(conditions)]);
    const row = imovel.rows[0];

    const pendencias = [];
    if (!property.neighborhood) pendencias.push(["Confirmar bairro ou região", "cadastro_incompleto", "alta"]);
    if (!property.askingPrice) pendencias.push(["Confirmar expectativa de preço", "preco_pendente", "alta"]);
    if (!ownerId) pendencias.push(["Vincular o proprietário", "proprietario_pendente", "alta"]);
    else if (!telefone) pendencias.push(["Confirmar telefone do proprietário", "contato_incompleto", "normal"]);
    pendencias.push(["Solicitar autorização de divulgação", "autorizacao_divulgacao", "alta"]);

    for (const [title, type, priority] of pendencias) {
      await client.query(
        `INSERT INTO tasks (organization_id,related_entity_type,related_entity_id,type,title,due_at,priority,source)
         VALUES ($1,'inventory_property',$2,$3,$4,now()+interval '1 day',$5,'captura_universal')`,
        [org.id, row.id, type, title, priority]);
    }
    await registrarEvento(client, org.id, "property.created", "inventory_property", row.id,
      { title: row.title, captureStage: row.capture_stage, missingCount: pendencias.length });
    await client.query("COMMIT");
    return { ok: true, property: row, nextSteps: pendencias.map(p => p[0]) };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

function acaoDeTarefa(t) {
  const vencida = t.due_at && new Date(t.due_at).getTime() < Date.now();
  return {
    id: t.id,
    source: "task",
    entityType: t.related_entity_type,
    entityId: t.related_entity_id,
    title: t.title,
    reason: vencida ? "O prazo já venceu." : "Esta ação está programada para o seu dia.",
    actionLabel: "Marcar como concluída",
    dueAt: t.due_at,
    priority: t.priority,
    status: t.status,
  };
}

export async function visaoHoje() {
  const db = await banco();
  const org = await garantirOrganizacao();
  const [tarefas, incompletos, oportunidades, contagens] = await Promise.all([
    db.query(
      `SELECT id,related_entity_type,related_entity_id,title,due_at,priority,status
       FROM tasks WHERE organization_id=$1 AND status IN ('pendente','em_andamento','adiada')
       ORDER BY due_at ASC NULLS LAST, created_at ASC LIMIT 30`, [org.id]),
    db.query(
      `SELECT id,title,property_type,neighborhood,asking_price,owner_contact_id,capture_stage,created_at
       FROM inventory_properties
       WHERE organization_id=$1 AND status='ativo'
         AND (owner_contact_id IS NULL OR asking_price IS NULL OR neighborhood IS NULL)
       ORDER BY created_at ASC LIMIT 12`, [org.id]),
    db.query(
      `SELECT o.id,o.stage,o.last_interaction_at,o.next_action_at,c.name AS contact_name,p.title AS property_title
       FROM opportunities o JOIN contacts c ON c.id=o.contact_id
       LEFT JOIN inventory_properties p ON p.id=o.inventory_property_id
       WHERE o.organization_id=$1 AND o.stage NOT IN ('fechado','perdido')
         AND (o.next_action_at <= now() OR o.last_interaction_at IS NULL OR o.last_interaction_at < now()-interval '3 days')
       ORDER BY o.next_action_at ASC NULLS FIRST LIMIT 12`, [org.id]),
    db.query(
      `SELECT
        (SELECT count(*)::int FROM inventory_properties WHERE organization_id=$1 AND status='ativo') AS properties,
        (SELECT count(*)::int FROM contacts WHERE organization_id=$1 AND status='ativo') AS contacts,
        (SELECT count(*)::int FROM opportunities WHERE organization_id=$1 AND stage NOT IN ('fechado','perdido')) AS opportunities,
        (SELECT count(*)::int FROM tasks WHERE organization_id=$1 AND status IN ('pendente','em_andamento','adiada')) AS tasks`, [org.id]),
  ]);

  const acoes = tarefas.rows.map(acaoDeTarefa);
  for (const p of incompletos.rows) {
    const faltas = [];
    if (!p.owner_contact_id) faltas.push("proprietário");
    if (!p.asking_price) faltas.push("preço");
    if (!p.neighborhood) faltas.push("bairro");
    acoes.push({
      id: `property:${p.id}`,
      source: "property_gap",
      entityType: "inventory_property",
      entityId: p.id,
      title: `Completar ${p.title || "imóvel em prospecção"}`,
      reason: `Falta confirmar: ${faltas.join(", ")}.`,
      actionLabel: "Abrir imóvel",
      priority: faltas.includes("proprietário") ? "alta" : "normal",
      status: "pendente",
      dueAt: p.created_at,
    });
  }
  for (const o of oportunidades.rows) {
    acoes.push({
      id: `opportunity:${o.id}`,
      source: "opportunity",
      entityType: "opportunity",
      entityId: o.id,
      title: `Retornar para ${o.contact_name}`,
      reason: o.property_title ? `Oportunidade ligada a ${o.property_title} está sem próxima interação confirmada.` : "Oportunidade sem próxima interação confirmada.",
      actionLabel: "Preparar retorno",
      priority: "alta",
      status: "pendente",
      dueAt: o.next_action_at || o.last_interaction_at,
    });
  }

  return { organization: org, counts: contagens.rows[0], actions: ordenarAcoes(acoes).slice(0, 20) };
}

export async function listarCarteira() {
  const db = await banco();
  const org = await garantirOrganizacao();
  const r = await db.query(
    `SELECT p.id,p.title,p.capture_stage,p.status,p.transaction_type,p.property_type,p.neighborhood,
            p.asking_price,p.characteristics,p.created_at,c.name AS owner_name,
            (SELECT count(*)::int FROM opportunities o WHERE o.inventory_property_id=p.id AND o.stage NOT IN ('fechado','perdido')) AS open_opportunities,
            (SELECT count(*)::int FROM tasks t WHERE t.related_entity_type='inventory_property' AND t.related_entity_id=p.id AND t.status IN ('pendente','em_andamento','adiada')) AS pending_tasks
     FROM inventory_properties p LEFT JOIN contacts c ON c.id=p.owner_contact_id
     WHERE p.organization_id=$1 ORDER BY p.updated_at DESC LIMIT 100`, [org.id]);
  return { organization: org, properties: r.rows };
}

export async function listarRelacionamentos() {
  const db = await banco();
  const org = await garantirOrganizacao();
  const r = await db.query(
    `SELECT c.id,c.type,c.name,c.phone,c.email,c.source,c.created_at,
            count(o.id) FILTER (WHERE o.stage NOT IN ('fechado','perdido'))::int AS open_opportunities,
            max(o.last_interaction_at) AS last_interaction_at
     FROM contacts c LEFT JOIN opportunities o ON o.contact_id=c.id
     WHERE c.organization_id=$1 AND c.status<>'arquivado'
     GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 100`, [org.id]);
  return { organization: org, contacts: r.rows };
}

export async function concluirTarefa(id) {
  const db = await banco();
  const org = await garantirOrganizacao();
  const r = await db.query(
    `UPDATE tasks SET status='concluida',completed_at=now(),updated_at=now()
     WHERE id=$1 AND organization_id=$2 AND status NOT IN ('concluida','cancelada')
     RETURNING id,title,completed_at`, [id, org.id]);
  if (!r.rowCount) return { ok: false, erro: "Tarefa não encontrada ou já encerrada." };
  await db.query(
    `INSERT INTO domain_events (organization_id,event_type,entity_type,entity_id,payload,source)
     VALUES ($1,'task.completed','task',$2,$3,'corretor-os')`,
    [org.id, id, JSON.stringify({ title: r.rows[0].title })]);
  return { ok: true, task: r.rows[0] };
}
