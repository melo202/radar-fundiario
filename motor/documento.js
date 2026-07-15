/* §24 — Documento da avaliação: qualquer valuation vira uma peça HTML apresentável e
   imprimível, servida pelo PRÓPRIO motor (a verdade mora no banco, não numa cópia).
   Regras de honestidade em toda parte: ofertas ≠ transações, confiança com fatores,
   funil da amostra CONTABILIZADO (nada some sem explicação), outliers e exclusões
   manuais com razão, versão encadeada declarada, id auditável. */
import { pool } from "./db.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (v) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataBR = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const dist = (m) => m == null ? "" : (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);

export async function documentoDaAvaliacao(id) {
  const q = await pool.query(
    "SELECT id, subject, status, result, version, parent_id, created_by, created_at FROM valuations WHERE id=$1", [id]);
  if (!q.rowCount) return null;
  const v = q.rows[0], r = v.result || {}, s = v.subject || {}, amostra = r.sample || {};
  const comps = await pool.query(
    `SELECT vc.total_score, vc.accepted, vc.is_outlier, vc.rejection_reasons, vc.manual_change,
            p.characteristics, p.pricing, l.portal, l.url
     FROM valuation_comparables vc
     JOIN properties p ON p.id = vc.property_id
     JOIN listings l ON l.id = p.listing_id
     WHERE vc.valuation_id=$1
     ORDER BY vc.accepted DESC, vc.total_score DESC NULLS LAST`, [id]).then(x => x.rows);

  const aceitos = comps.filter(c => c.accepted && !c.manual_change);
  const fora = comps.filter(c => !c.accepted || c.manual_change);
  const parecer = r.parecer && r.parecer.texto ? r.parecer : null;
  const periodo = amostra.ofertasColetadasEntre;

  const linhas = aceitos.map(c => {
    const ch = c.characteristics || {}, pr = c.pricing || {};
    const area = ch.privateAreaM2 || ch.totalAreaM2 || null;
    const pm2 = area > 0 && pr.askingPrice > 0 ? Math.round(pr.askingPrice / area) : null;
    return `<tr><td><a href="${esc(c.url)}" rel="noopener">${esc(c.portal)}</a></td>
      <td>${area ?? "—"} m²</td><td>${ch.bedrooms ?? "—"}</td>
      <td>${brl(pr.askingPrice)}</td><td>${pm2 ? brl(pm2) : "—"}/m²</td>
      <td>${c.total_score != null ? (+c.total_score).toFixed(2) : "—"}</td></tr>`;
  }).join("");
  const linhasFora = fora.map(c => {
    const razao = c.manual_change
      ? `excluído pelo corretor — ${esc(c.manual_change.motivo || "")}`
      : (Array.isArray(c.rejection_reasons) && c.rejection_reasons.length
        ? esc(c.rejection_reasons.join("; ")) : "fora da curva (Tukey)");
    return `<li><a href="${esc(c.url)}" rel="noopener">${esc(c.portal)}</a> — ${razao}</li>`;
  }).join("");

  const funil = [
    ["Ofertas do tipo no acervo", amostra.totalFound],
    ["Fora do bairro", amostra.foraDoBairro], ["Sem área informada", amostra.semArea],
    ["Fora da faixa de área", amostra.foraDaFaixaDeArea],
    ["Duplicadas entre portais (agrupadas)", amostra.duplicadosAgrupados],
    ["Fora da curva (Tukey)", amostra.totalOutliers],
    ["Excluídas pelo corretor", amostra.excluidosManual],
    ["<b>Aceitas no cálculo</b>", `<b>${amostra.totalAccepted ?? "—"}</b>`],
  ].filter(([, n]) => n !== undefined && n !== 0 && n !== null || String(n).includes("<b>"))
    .map(([rot, n]) => `<tr><td>${rot}</td><td>${n}</td></tr>`).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Análise Comparativa de Mercado · Corretor Inteligente</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box;margin:0}
  body{font:15px/1.6 "Archivo","Segoe UI",system-ui,sans-serif;background:#F5F8F8;color:#212E40}
  .folha{max-width:820px;margin:26px auto;background:#fff;border:1px solid #d8e1e4;border-radius:14px;padding:34px 38px}
  header{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:2px solid #088780;padding-bottom:14px;margin-bottom:20px}
  header img{height:34px}
  header small{color:#5f6e7e;text-align:right;font-size:11.5px;line-height:1.5}
  h1{font-size:19px;margin-bottom:2px}
  .sub{color:#5f6e7e;font-size:13px;margin-bottom:18px}
  h2{font-size:12.5px;text-transform:uppercase;letter-spacing:.8px;color:#066b60;margin:22px 0 8px}
  .valor{display:flex;gap:26px;flex-wrap:wrap;background:#F5F8F8;border-radius:10px;padding:14px 18px}
  .valor b{display:block;font-size:22px;color:#065f56}
  .valor span{font-size:11.5px;color:#5f6e7e}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;color:#5f6e7e;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:5px 8px;border-bottom:1px solid #d8e1e4}
  td{padding:6px 8px;border-bottom:1px solid #eef2f3}
  ul{padding-left:18px;font-size:13px}
  li{margin-bottom:4px}
  .parecer{white-space:pre-wrap;font-size:13.5px;background:#F5F8F8;border-left:3px solid #088780;border-radius:0 10px 10px 0;padding:12px 16px}
  .honesto{border:1px solid #c8b791;background:#faf6ec;border-radius:10px;padding:12px 16px;font-size:12.5px;margin-top:22px}
  .miudo{font-size:11px;color:#5f6e7e;margin-top:14px}
  a{color:#088780}
  @media print{body{background:#fff}.folha{border:0;margin:0;max-width:none;border-radius:0}}
</style></head><body><div class="folha">
<header>
  <img src="https://corretorinteligente.tech/marca/corretorinteligente_logo_horizontal_flat.svg" alt="Corretor Inteligente">
  <small>Avaliação nº ${esc(v.id)}<br>versão ${v.version || 1}${v.parent_id ? ` · encadeada à ${esc(v.parent_id).slice(0, 8)}…` : ""} · ${dataBR(v.created_at)}</small>
</header>
<h1>Análise Comparativa de Mercado — ofertas públicas</h1>
<p class="sub">${esc(s.propertyType || "imóvel")} · ${esc(s.neighborhood || "")} · ${s.areaM2 ? `${s.areaM2} m²` : ""}${s.bedrooms ? ` · ${s.bedrooms} quarto(s)` : ""}</p>
${r.estimatedValue ? `
<div class="valor">
  <div><b>${brl(r.estimatedValue)}</b><span>valor central de referência</span></div>
  <div><b>${brl(r.probableRange?.minimum)} – ${brl(r.probableRange?.maximum)}</b><span>faixa provável</span></div>
  <div><b>${brl(r.estimatedPricePerM2)}/m²</b><span>ponderado · mediano ${brl(r.medianPricePerM2)}/m²</span></div>
  <div><b>${esc(r.confidence?.rotulo || "—")}</b><span>confiança declarada</span></div>
</div>
<h2>Fatores da confiança</h2>
<ul>${(r.confidence?.fatores || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
<h2>Funil da amostra — nada some sem explicação</h2>
<table>${funil}</table>
${periodo ? `<p class="miudo">Ofertas coletadas entre ${dataBR(periodo.de)} e ${dataBR(periodo.ate)}.</p>` : ""}
<h2>Ofertas aceitas no cálculo (${aceitos.length})</h2>
<table><tr><th>Fonte</th><th>Área</th><th>Quartos</th><th>Preço anunciado</th><th>R$/m²</th><th>Peso</th></tr>${linhas}</table>
${linhasFora ? `<h2>Fora do cálculo — com a razão registrada (${fora.length})</h2><ul>${linhasFora}</ul>` : ""}
${parecer ? `<h2>Parecer da análise</h2><div class="parecer">${esc(parecer.texto)}</div>
<p class="miudo">Parecer redigido por IA sobre o resultado calculado; os valores do texto são conferidos automaticamente contra o resultado.</p>` : ""}
<h2>Metodologia</h2>
<ul>${(r.methods || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul>
<h2>Premissas e limites</h2>
<ul>${(r.assumptions || []).map(a => `<li>${esc(a)}</li>`).join("")}${(r.warnings || []).map(w => `<li>${esc(w)}</li>`).join("")}</ul>
` : `<p>Esta avaliação não tem resultado calculado (status: ${esc(v.status)}).</p>`}
<div class="honesto"><b>Leitura obrigatória:</b> os valores partem de preços de OFERTA anunciados publicamente — não são transações fechadas.
Esta análise é uma referência técnica preliminar e não substitui avaliação profissional (PTAM/laudo por profissional habilitado).</div>
<p class="miudo">Documento gerado pelo motor do Corretor Inteligente em ${new Date().toLocaleString("pt-BR")} · avaliação auditável nº ${esc(v.id)}${v.created_by ? ` · origem: ${esc(v.created_by)}` : ""}.</p>
</div></body></html>`;
}
