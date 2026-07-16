/* SV-1 — Status da venda para o CLIENTE (roadmap, Ciclo Comercial FU→MK→SV).
   O corretor cria pelo painel; o cliente acompanha em corretorinteligente.tech/acompanhe/<token>
   como rastreio de encomenda — reduz o "e aí, como tá?" e encanta.

   REGRA DE PII (local-first, permanente até multitenant): NADA do cliente no servidor.
   O imóvel aparece por APELIDO escolhido pelo corretor; corretor é nome/CRECI
   autorreferidos só para exibição. O token aleatório (base64url, 96 bits) é a única
   chave — sem listagem pública, página com noindex.

   Tudo aqui é determinístico (zero IA): etapas fixas do fluxo real de Goiânia,
   didática estática por etapa, datas gravadas pelo corretor. */
import { randomBytes } from "node:crypto";
/* pool preguiçoso: as partes PURAS (etapas, mensagens, páginas) são testadas na máquina
   do dev, onde o pg não está instalado — o db.js só carrega quando uma função de banco roda */
const db = async () => (await import("./db.js")).pool;

/* fluxo real de uma compra e venda em Goiânia — mesma linguagem do app (ITBI/cartório) */
export const ETAPAS_VENDA = [
  { id: "proposta",     rotulo: "Proposta aceita",
    didatica: "Comprador e vendedor chegaram a um acordo de valor e condições." },
  { id: "documentacao", rotulo: "Documentação e certidões",
    didatica: "Levantamento das certidões do imóvel e das partes — a segurança jurídica do negócio." },
  { id: "itbi",         rotulo: "ITBI pago",
    didatica: "Imposto municipal de transmissão quitado (2% sobre o valor da transação em Goiânia)." },
  { id: "cartorio",     rotulo: "Escritura assinada",
    didatica: "Escritura pública no tabelionato (ou contrato de financiamento, que vale como escritura)." },
  { id: "registro",     rotulo: "Registro concluído",
    didatica: "Matrícula atualizada no Registro de Imóveis — só aqui a propriedade muda de dono de verdade." },
];

export const novoToken = () => randomBytes(12).toString("base64url");
export const tokenValido = (t) => /^[A-Za-z0-9_-]{16}$/.test(String(t || ""));
const etapasNovas = () => ETAPAS_VENDA.map(e => ({ id: e.id, em: null, obs: "" }));

/* saneamento anti-PII possível por máquina: apelido/corretor curtos, sem e-mail/telefone
   (o resto é responsabilidade declarada do corretor — o painel avisa) */
const limpa = (s, max) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
export function validaApelido(apelido) {
  const a = limpa(apelido, 60);
  if (a.length < 3) return { erro: "Apelido do imóvel obrigatório (mínimo 3 letras)." };
  if (/@|\d{8,}/.test(a)) return { erro: "O apelido não pode conter e-mail nem telefone — nada do cliente vai ao servidor." };
  return { apelido: a };
}

export async function criarVenda(apelido, corretor) {
  const v = validaApelido(apelido);
  if (v.erro) return v;
  const token = novoToken();
  await (await db()).query(
    "INSERT INTO vendas (token, apelido, corretor, etapas) VALUES ($1,$2,$3,$4)",
    [token, v.apelido, limpa(corretor, 80) || null, JSON.stringify(etapasNovas())]);
  return { token };
}

export async function listarVendas() {
  return (await db()).query(
    "SELECT token, apelido, corretor, etapas, encerrada, criada_em, atualizada_em FROM vendas ORDER BY atualizada_em DESC LIMIT 50"
  ).then(r => r.rows);
}

export async function buscarVenda(token) {
  if (!tokenValido(token)) return null;
  const r = await (await db()).query("SELECT token, apelido, corretor, etapas, encerrada, atualizada_em FROM vendas WHERE token=$1", [token]);
  return r.rows[0] || null;
}

/* marca/desmarca uma etapa; a data é do DIA da marcação (fato), a obs é do corretor */
export async function marcarEtapa(token, etapaId, obs, desfazer) {
  const venda = await buscarVenda(token);
  if (!venda) return { erro: "venda não encontrada" };
  const etapas = venda.etapas;
  const alvo = etapas.find(e => e.id === etapaId);
  if (!alvo) return { erro: "etapa desconhecida" };
  if (desfazer) { alvo.em = null; alvo.obs = ""; }
  else { alvo.em = new Date().toISOString().slice(0, 10); alvo.obs = limpa(obs, 200); }
  await (await db()).query("UPDATE vendas SET etapas=$1, atualizada_em=now() WHERE token=$2", [JSON.stringify(etapas), token]);
  return { ok: true, etapas };
}

export async function excluirVenda(token) {
  if (!tokenValido(token)) return { erro: "token inválido" };
  await (await db()).query("DELETE FROM vendas WHERE token=$1", [token]);
  return { ok: true };
}

/* SV-2 — mensagem de atualização para o WhatsApp do cliente: o CORRETOR copia e envia
   (ativo, nunca automático — o contato do cliente não existe no servidor). */
export function mensagemEtapa(venda) {
  const feitas = venda.etapas.filter(e => e.em);
  const ultima = feitas[feitas.length - 1];
  const meta = ultima && ETAPAS_VENDA.find(e => e.id === ultima.id);
  const prox = ETAPAS_VENDA.find(e => !venda.etapas.find(x => x.id === e.id).em);
  const dataBR = ultima ? ultima.em.split("-").reverse().join("/") : null;
  const link = `https://corretorinteligente.tech/acompanhe/${venda.token}`;
  if (!meta) return `Olá! Criei uma página para você acompanhar cada etapa da compra do ${venda.apelido}, em tempo real, como um rastreio de encomenda: ${link}`;
  return `Boa notícia! O processo do ${venda.apelido} avançou: ✅ ${meta.rotulo} (${dataBR}).` +
    (ultima.obs ? ` ${ultima.obs}.` : "") +
    (prox ? ` Próxima etapa: ${prox.rotulo}.` : " Processo concluído — parabéns! 🎉") +
    `\nAcompanhe tudo aqui: ${link}`;
}

/* ---------------- página pública /acompanhe/<token> ----------------
   Server-rendered, autocontida (CSS inline), visual do kit — o cliente do corretor
   vê uma página premium, não um JSON. noindex + sem listagem = só quem tem o link. */
const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = (iso) => iso ? iso.split("-").reverse().join("/") : null;

export function paginaAcompanheHTML(venda) {
  const feitas = venda.etapas.filter(e => e.em).length;
  const total = ETAPAS_VENDA.length;
  const concluida = feitas === total;
  const pct = Math.round(feitas / total * 100);
  const linhas = ETAPAS_VENDA.map((meta, i) => {
    const e = venda.etapas.find(x => x.id === meta.id) || {};
    const feita = !!e.em;
    const atual = !feita && venda.etapas.slice(0, i).every((x) => x.em) && !concluida;
    return `<li class="et ${feita ? "feita" : atual ? "atual" : ""}">
      <span class="pino">${feita ? "✓" : i + 1}</span>
      <div class="et-tx">
        <b>${escHtml(meta.rotulo)}</b>
        ${feita ? `<span class="quando">concluída em ${dataBR(e.em)}</span>` : atual ? `<span class="quando andamento">em andamento</span>` : ""}
        <p>${escHtml(e.obs || meta.didatica)}</p>
      </div></li>`;
  }).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Acompanhe sua compra — ${escHtml(venda.apelido)}</title>
<style>
:root{--brand:#088780;--brand2:#19A99A;--marinho:#212E40;--canvas:#F5F8F8;--muted:#5c6b74;--linha:#dfe6e8}
*{box-sizing:border-box;margin:0}body{font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--canvas);color:#212E40}
header{background:linear-gradient(160deg,#26344a,#1a2433);color:#fff;padding:34px 22px 30px;text-align:center}
header img{height:34px;margin-bottom:14px}
header h1{font-size:22px;font-weight:800}
header p{color:rgba(255,255,255,.75);font-size:14px;margin-top:4px}
.barra{max-width:640px;margin:18px auto 0;background:rgba(255,255,255,.14);border-radius:99px;height:10px;overflow:hidden}
.barra i{display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,var(--brand),var(--brand2));border-radius:99px;transition:width .6s cubic-bezier(.2,.7,.3,1)}
.pctrot{font-size:13px;color:rgba(255,255,255,.8);margin-top:8px}
main{max-width:640px;margin:26px auto;padding:0 18px}
${concluida ? ".festa{background:#fff;border:1px solid var(--linha);border-left:4px solid var(--brand);border-radius:12px;padding:16px 18px;margin-bottom:18px;font-size:15px}" : ""}
ol{list-style:none;padding:0}
.et{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--linha)}
.et:last-child{border-bottom:0}
.pino{flex:0 0 34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;background:#e4ebec;color:var(--muted)}
.feita .pino{background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff}
.atual .pino{background:#fff;border:2px solid var(--brand);color:var(--brand);animation:pulsa 1.6s infinite}
@keyframes pulsa{0%,100%{box-shadow:0 0 0 0 rgba(8,135,128,.35)}50%{box-shadow:0 0 0 8px rgba(8,135,128,0)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
.et-tx b{font-size:15.5px}
.et-tx p{font-size:13.5px;color:var(--muted);margin-top:3px}
.quando{display:inline-block;margin-left:8px;font-size:12px;color:var(--brand);font-weight:600}
.quando.andamento{color:#95743b}
.et:not(.feita):not(.atual){opacity:.55}
footer{max-width:640px;margin:8px auto 34px;padding:0 18px;font-size:12.5px;color:var(--muted);text-align:center}
footer b{color:#212E40}
</style></head><body>
<header>
  <img src="https://corretorinteligente.tech/marca/corretorinteligente_logo_branca.svg" alt="Corretor Inteligente">
  <h1>${escHtml(venda.apelido)}</h1>
  <p>Acompanhamento da sua compra, etapa por etapa</p>
  <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i></i></div>
  <div class="pctrot">${feitas} de ${total} etapas concluídas</div>
</header>
<main>
  ${concluida ? '<div class="festa">🎉 <b>Registro concluído — o imóvel é oficialmente seu.</b> Foi um prazer acompanhar você até aqui.</div>' : ""}
  <ol>${linhas}</ol>
</main>
<footer>
  ${venda.corretor ? `Acompanhamento mantido por <b>${escHtml(venda.corretor)}</b> · ` : ""}página gerada pelo Corretor Inteligente — corretorinteligente.tech<br>
  As datas e observações são registradas pelo corretor responsável. Esta página não guarda nenhum dado pessoal seu.
</footer>
</body></html>`;
}

export function paginaNaoEncontradaHTML() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Link não encontrado</title>
<style>*{box-sizing:border-box;margin:0}body{font:16px/1.5 system-ui,sans-serif;background:#F5F8F8;color:#212E40;display:grid;place-items:center;min-height:100vh;padding:20px;text-align:center}p{color:#5c6b74;margin-top:6px;font-size:14px}</style>
</head><body><div><h1>Este link de acompanhamento não existe mais</h1><p>Confira o endereço com o corretor que enviou — ou peça um link novo.</p></div></body></html>`;
}
