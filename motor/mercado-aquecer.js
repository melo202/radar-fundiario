/* AQUEC-01 — Aquecimento noturno do cache de mercado (roadmap v2 item 2.5, 20/07/2026).
   Motivo medido: /motor/mercado a frio levou 178s em produção (timeout do front é 180s).
   O corretor não pode pagar essa espera de dia — o robô paga de madrugada.

   O que aquece (nesta ordem, deduplicado pela MESMA chave do cache):
   1. os imóveis ATIVOS da carteira (neighborhood+property_type+areaM2+bedrooms — o
      subject idêntico ao que o dossiê dispara no clique);
   2. os subjects PEDIDOS nos últimos 7 dias (detail.subject do funil mercado-funil) —
      quem perguntou ontem tende a perguntar de novo.

   Orçamento: máximo MERCADO_AQUECER_MAX subjects/noite (default 6), modo econômico
   (só a 1ª passagem ≈ 3 buscas Brave cada ≈ 540/mês) — cabe na sobra da cota depois
   da varredura (~1.200/mês). maxIdadeH=20 força re-coleta diária apesar do cache de
   26h. Desligável com MERCADO_AQUECER=false no .env. Roda às 05h15 (systemd timer),
   depois da varredura (03h33) e da revisita (04h47), aproveitando o acervo da noite. */
import { pool } from "./db.js";
import { avaliarAoVivo, chaveDaPesquisa } from "./mercado-aovivo.js";

/* pura e testável: recebe as linhas cruas, devolve os subjects deduplicados na ordem
   de prioridade (carteira antes de funil), já limitados ao teto. */
export function planejarAquecimento(carteira = [], funil = [], max = 6) {
  const subjects = [];
  const vistos = new Set();
  const poe = (s) => {
    if (!s || !s.neighborhood || !s.propertyType) return;
    const chave = chaveDaPesquisa(s);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    subjects.push(s);
  };
  for (const p of carteira) {
    poe({
      neighborhood: p.neighborhood,
      propertyType: p.property_type,
      areaM2: p.characteristics?.areaM2 ?? null,
      bedrooms: p.characteristics?.bedrooms ?? null,
    });
  }
  for (const f of funil) poe(f.detail?.subject || null);
  return subjects.slice(0, Math.max(0, max));
}

async function main() {
  if (String(process.env.MERCADO_AQUECER || "true").toLowerCase() === "false") {
    console.log("aquecimento desligado por MERCADO_AQUECER=false");
    return;
  }
  const max = Number(process.env.MERCADO_AQUECER_MAX) > 0 ? Number(process.env.MERCADO_AQUECER_MAX) : 6;
  const [carteira, funil] = await Promise.all([
    pool.query(
      `SELECT neighborhood, property_type, characteristics
       FROM inventory_properties
       WHERE status='ativo' AND neighborhood IS NOT NULL AND property_type IS NOT NULL
       ORDER BY updated_at DESC LIMIT 40`),
    pool.query(
      `SELECT detail FROM audit_log
       WHERE action='mercado-funil' AND created_at > now()-interval '7 days'
       ORDER BY created_at DESC LIMIT 60`),
  ]);
  const subjects = planejarAquecimento(carteira.rows, funil.rows, max);
  const stats = { subjects: subjects.length, aquecidos: 0, jaQuentes: 0, falhas: 0, consultas: 0 };
  for (const subject of subjects) {
    try {
      const r = await avaliarAoVivo(subject, { maxIdadeH: 20, economico: true });
      if (r?.aoVivo?.buscou) { stats.aquecidos++; stats.consultas += r.aoVivo.consultas || 0; }
      else stats.jaQuentes++;
      console.log(`${chaveDaPesquisa(subject)}: ${r?.aoVivo?.buscou ? "aquecido" : "já quente"}`);
    } catch (e) {
      stats.falhas++;
      console.warn(`${chaveDaPesquisa(subject)}: falhou — ${e.message}`);
    }
  }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('mercado-aquecimento','*','executada',$1)",
    [JSON.stringify(stats)]).catch(() => {});
  console.log("aquecimento concluído:", JSON.stringify(stats));
}

/* import direto (testes) não executa; execução só quando chamado como script */
if (import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("mercado-aquecer.js")) {
  main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
