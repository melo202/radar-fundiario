/* §24 — Documento da avaliação, edição PREMIUM (pedido do usuário 15/07: "como se o
   corretor tivesse orgulho de mostrar"): capa de marca, valor em destaque, mapa das
   ofertas desenhado no servidor, cruzamento com a localização e bloco de assinatura.
   O contrato de honestidade continua inteiro: ofertas ≠ transações, funil contabilizado,
   razões registradas, versão encadeada, id auditável. O rótulo "PTAM" segue travado até
   existir verificação profissional (contrato de confiança do repo) — isto é uma ACM. */
import { pool } from "./db.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (v) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataBR = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const distTx = (m) => m == null ? "" : (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);

/* mapa das ofertas em SVG puro (mesma filosofia do laudo do app: dados, não tiles) */
function mapaSVG(subject, pontos) {
  const pts = pontos.filter(p => p.lat != null && p.lon != null);
  const sLat = Number(subject.lat), sLon = Number(subject.lon);
  if (!pts.length || !isFinite(sLat) || !isFinite(sLon)) return "";
  const todos = [...pts, { lat: sLat, lon: sLon }];
  let la0 = Math.min(...todos.map(p => p.lat)), la1 = Math.max(...todos.map(p => p.lat));
  let lo0 = Math.min(...todos.map(p => p.lon)), lo1 = Math.max(...todos.map(p => p.lon));
  const padLa = Math.max((la1 - la0) * .3, .0015), padLo = Math.max((lo1 - lo0) * .3, .0015);
  la0 -= padLa; la1 += padLa; lo0 -= padLo; lo1 += padLo;
  const W = 720, H = 330;
  const kx = 111320 * Math.cos((la0 + la1) / 2 * Math.PI / 180), ky = 110540;
  const wM = (lo1 - lo0) * kx, hM = (la1 - la0) * ky, escl = Math.min(W / wM, H / hM);
  const X = lon => (((lon - lo0) * kx * escl) + (W - wM * escl) / 2).toFixed(1);
  const Y = lat => (H - (((lat - la0) * ky * escl) + (H - hM * escl) / 2)).toFixed(1);
  const nice = [100, 250, 500, 1000, 2000, 5000].find(v => v * escl >= W * .18) || 5000;
  const barPx = nice * escl;
  const marcas = pts.map(p =>
    `<circle cx="${X(p.lon)}" cy="${Y(p.lat)}" r="10" fill="#088780" stroke="#fff" stroke-width="1.6"/>` +
    `<text x="${X(p.lon)}" y="${(+Y(p.lat) + 3.6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${p.n}</text>`).join("");
  const sx = +X(sLon), sy = +Y(sLat);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;border-radius:12px" role="img" aria-label="Posição do imóvel e das ofertas comparáveis">
    <rect width="${W}" height="${H}" fill="#eef4f4" rx="12"/>
    ${marcas}
    <rect x="${sx - 9}" y="${sy - 9}" width="18" height="18" transform="rotate(45 ${sx} ${sy})" fill="#212E40" stroke="#fff" stroke-width="1.8"/>
    <line x1="20" y1="${H - 18}" x2="${20 + barPx}" y2="${H - 18}" stroke="#212E40" stroke-width="2"/>
    <line x1="20" y1="${H - 23}" x2="20" y2="${H - 13}" stroke="#212E40" stroke-width="2"/>
    <line x1="${20 + barPx}" y1="${H - 23}" x2="${20 + barPx}" y2="${H - 13}" stroke="#212E40" stroke-width="2"/>
    <text x="${20 + barPx / 2}" y="${H - 27}" text-anchor="middle" font-size="11" fill="#212E40">${nice >= 1000 ? (nice / 1000) + " km" : nice + " m"}</text>
  </svg>`;
}

export async function documentoDaAvaliacao(id) {
  const q = await pool.query(
    "SELECT id, subject, status, result, version, parent_id, created_by, created_at FROM valuations WHERE id=$1", [id]);
  if (!q.rowCount) return null;
  const v = q.rows[0], r = v.result || {}, s = v.subject || {}, amostra = r.sample || {};
  const comps = await pool.query(
    `SELECT vc.total_score, vc.accepted, vc.is_outlier, vc.rejection_reasons, vc.manual_change,
            p.characteristics, p.pricing, l.portal, l.url,
            ST_Y(p.geom::geometry) AS lat, ST_X(p.geom::geometry) AS lon
     FROM valuation_comparables vc
     JOIN properties p ON p.id = vc.property_id
     JOIN listings l ON l.id = p.listing_id
     WHERE vc.valuation_id=$1
     ORDER BY vc.accepted DESC, vc.total_score DESC NULLS LAST`, [id]).then(x => x.rows);

  const aceitos = comps.filter(c => c.accepted && !c.manual_change);
  const fora = comps.filter(c => !c.accepted || c.manual_change);
  const parecer = r.parecer && r.parecer.texto ? r.parecer : null;
  const periodo = amostra.ofertasColetadasEntre;
  const loc = r.localizacao;

  const linhas = aceitos.map((c, i) => {
    const ch = c.characteristics || {}, pr = c.pricing || {};
    const area = ch.privateAreaM2 || ch.totalAreaM2 || null;
    const pm2 = area > 0 && pr.askingPrice > 0 ? Math.round(pr.askingPrice / area) : null;
    return `<tr><td class="num">${i + 1}</td><td><a href="${esc(c.url)}" rel="noopener">${esc(c.portal)}</a></td>
      <td>${area ?? "—"} m²</td><td>${ch.bedrooms ?? "—"}</td>
      <td>${brl(pr.askingPrice)}</td><td>${pm2 ? brl(pm2) : "—"}/m²</td>
      <td>${c.total_score != null ? (+c.total_score).toFixed(2) : "—"}</td></tr>`;
  }).join("");
  const pontosMapa = aceitos.map((c, i) => ({ lat: c.lat, lon: c.lon, n: i + 1 }));
  const svgMapa = mapaSVG(s, pontosMapa);
  const comGeo = pontosMapa.filter(p => p.lat != null).length;

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
    .map(([rot, n]) => `<tr><td>${rot}</td><td class="td-num">${n}</td></tr>`).join("");

  const locHTML = loc && (loc.destaques || []).length ? `
  <h2>Localização — o que tem na região</h2>
  <div class="chips">
    ${loc.destaques.map(d => `<span class="chip"><b>${d.count}</b> ${esc(d.rotulo.toLowerCase())}${d.maisProximoM != null ? ` · ${distTx(d.maisProximoM)}` : ""}</span>`).join("")}
  </div>
  ${(loc.atencao || []).length ? `<p class="mini">Pontos de atenção no perímetro: ${loc.atencao.map(a => `${esc(a.rotulo.toLowerCase())} a ${distTx(a.maisProximoM)}`).join(" · ")}.</p>` : ""}
  <p class="mini">Medições em dados abertos (${esc(loc.atribuicao || "© OpenStreetMap contributors")}), cobertura ${esc(loc.cobertura || "?")} — contagens e distâncias reais por categoria, sem julgamento automático de valor.</p>` : "";

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Análise Comparativa de Mercado · Corretor Inteligente</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box;margin:0}
  body{font:15px/1.62 "Archivo","Segoe UI",system-ui,sans-serif;background:#e9eef0;color:#212E40;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .folha{max-width:860px;margin:28px auto;background:#fff;border-radius:16px;overflow:hidden;
    box-shadow:0 18px 60px rgba(33,46,64,.14)}
  .capa{background:#212E40;color:#fff;padding:30px 42px 26px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
  .capa img{height:36px;display:block;margin-bottom:14px}
  .capa h1{font-size:21px;letter-spacing:-.01em;font-weight:800}
  .capa .oq{color:#19A99A;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:6px}
  .capa .im{color:rgba(245,248,248,.8);font-size:14px;margin-top:4px}
  .capa small{color:rgba(245,248,248,.55);text-align:right;font-size:11px;line-height:1.6;white-space:nowrap}
  .miolo{padding:30px 42px 36px}
  .hero{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px}
  .hv{flex:1 1 200px;background:linear-gradient(160deg,#f2f8f7,#e8f3f1);border:1px solid #d5e6e3;border-radius:14px;padding:16px 20px}
  .hv b{display:block;font-size:26px;color:#065f56;letter-spacing:-.02em}
  .hv.menor b{font-size:17px;padding-top:5px}
  .hv span{font-size:11px;color:#5f6e7e;text-transform:uppercase;letter-spacing:.08em;font-weight:650}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#088780;font-weight:750;
    margin:30px 0 10px;padding-bottom:6px;border-bottom:1px solid #e2ebec}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;color:#8494a0;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;padding:6px 8px;border-bottom:1.5px solid #d8e1e4}
  td{padding:7px 8px;border-bottom:1px solid #eef2f3}
  td.num{color:#088780;font-weight:750;width:26px}
  td.td-num{text-align:right;font-variant-numeric:tabular-nums}
  tr:last-child td{border-bottom:0}
  ul{padding-left:18px;font-size:13px}
  li{margin-bottom:5px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:#f2f8f7;border:1px solid #d5e6e3;border-radius:99px;padding:6px 14px;font-size:12.5px}
  .chip b{color:#065f56}
  .parecer{white-space:pre-wrap;font-size:13.5px;background:#f7fafa;border-left:3px solid #088780;border-radius:0 12px 12px 0;padding:14px 18px}
  .honesto{border:1px solid #d9c9a3;background:#faf6ec;border-radius:12px;padding:14px 18px;font-size:12.5px;margin-top:28px}
  .mini{font-size:11px;color:#5f6e7e;margin-top:10px}
  .assina{margin-top:44px;display:flex;justify-content:flex-end}
  .assina .linha{width:320px;text-align:center;font-size:12px;color:#5f6e7e}
  .assina .linha .tr{border-top:1.5px solid #212E40;padding-top:8px}
  .rodape{background:#f5f8f8;border-top:1px solid #e2ebec;padding:14px 42px;font-size:10.5px;color:#8494a0;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  a{color:#088780;text-decoration:none}
  @media print{body{background:#fff}.folha{box-shadow:none;margin:0;max-width:none;border-radius:0}
    h2{break-after:avoid}.hero,.chip,svg,.parecer,.honesto{break-inside:avoid}}
</style></head><body><div class="folha">
<div class="capa">
  <div>
    <img src="https://corretorinteligente.tech/marca/corretorinteligente_logo_branca.svg" alt="Corretor Inteligente">
    <div class="oq">Análise Comparativa de Mercado</div>
    <h1>${esc(s.propertyType || "Imóvel")} · ${esc(s.neighborhood || "Goiânia")}</h1>
    <div class="im">${s.areaM2 ? `${s.areaM2} m² de área` : ""}${s.bedrooms ? ` · ${s.bedrooms} quarto(s)` : ""} · Goiânia, GO</div>
  </div>
  <small>Avaliação nº ${esc(v.id)}<br>versão ${v.version || 1}${v.parent_id ? `, encadeada à ${esc(v.parent_id).slice(0, 8)}…` : ""}<br>${dataBR(v.created_at)}${v.created_by ? ` · ${esc(v.created_by)}` : ""}</small>
</div>
<div class="miolo">
${r.estimatedValue ? `
<div class="hero">
  <div class="hv"><span>Valor de referência</span><b>${brl(r.estimatedValue)}</b></div>
  <div class="hv menor"><span>Faixa provável</span><b>${brl(r.probableRange?.minimum)} – ${brl(r.probableRange?.maximum)}</b></div>
  <div class="hv menor"><span>R$/m² ponderado</span><b>${brl(r.estimatedPricePerM2)} <small style="color:#8494a0;font-weight:500">· mediano ${brl(r.medianPricePerM2)}</small></b></div>
  <div class="hv menor"><span>Confiança declarada</span><b>${esc(r.confidence?.rotulo || "—")}</b></div>
</div>
<p class="mini">${(r.confidence?.fatores || []).map(esc).join(" · ")}</p>

${locHTML}

<h2>Ofertas aceitas no cálculo (${aceitos.length})</h2>
<table><tr><th></th><th>Fonte</th><th>Área</th><th>Quartos</th><th>Preço anunciado</th><th>R$/m²</th><th>Peso</th></tr>${linhas}</table>
${periodo ? `<p class="mini">Ofertas coletadas entre ${dataBR(periodo.de)} e ${dataBR(periodo.ate)}.</p>` : ""}

${svgMapa ? `<h2>Mapa — imóvel e ofertas</h2>${svgMapa}
<p class="mini">◆ imóvel avaliado · ● ofertas numeradas conforme a tabela — ${comGeo} de ${aceitos.length} com posição pelo endereço do anúncio (CNEFE/IBGE, precisão declarada no motor).</p>` : ""}

<h2>Funil da amostra — nada some sem explicação</h2>
<table>${funil}</table>

${linhasFora ? `<h2>Fora do cálculo — com a razão registrada (${fora.length})</h2><ul>${linhasFora}</ul>` : ""}

${parecer ? `<h2>Parecer da análise</h2><div class="parecer">${esc(parecer.texto)}</div>
<p class="mini">Parecer redigido por IA sobre o resultado calculado; os valores do texto são conferidos automaticamente contra o resultado.</p>` : ""}

<h2>Metodologia, premissas e limites</h2>
<ul>${(r.methods || []).map(m => `<li>${esc(m)}</li>`).join("")}${(r.assumptions || []).map(a => `<li>${esc(a)}</li>`).join("")}${(r.warnings || []).map(w => `<li>${esc(w)}</li>`).join("")}</ul>
` : `<p>Esta avaliação não tem resultado calculado (status: ${esc(v.status)}).</p>`}

<div class="honesto"><b>Leitura obrigatória:</b> os valores partem de preços de OFERTA anunciados publicamente — não são transações fechadas.
Esta Análise Comparativa de Mercado é uma referência técnica e não substitui laudo de avaliação por profissional habilitado (PTAM — Res. COFECI 1.066/2007).</div>

<div class="assina"><div class="linha"><div class="tr">Corretor(a) responsável &nbsp;·&nbsp; CRECI ________________</div></div></div>
</div>
<div class="rodape">
  <span>Corretor Inteligente · corretorinteligente.tech</span>
  <span>Documento gerado em ${new Date().toLocaleString("pt-BR")} · avaliação auditável nº ${esc(v.id).slice(0, 8)}…</span>
</div>
</div></body></html>`;
}
