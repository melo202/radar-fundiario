/* Kit prefeitura COMPLETO — emissão server-side (20/08/2026).
   Pedido do usuário: "no Raio-X tem que sair o kit completo, todos os docs de uma vez,
   prontos". A prefeitura EMITE NA HORA, via GET direto no endpoint de resultado (descoberta
   do usuário em 18/08, verificada de novo hoje com inscrição real), 3 dos 5 serviços:
     - espelho BIC (siptu00020a0?ninsc=) — dados cadastrais completos, inclusive MATRÍCULA;
     - certidão de dados cadastrais (sccer00202) — NOME + CPF do titular, valor venal;
     - CND imobiliária (sccer00201) — NEGATIVA/POSITIVA de débitos.
   Guia do IPTU e TLP (PortalTributos) são SPA — o GET não resolve sem JS; seguem como
   deep-link preenchido (honesto, nunca finge que emitiu).

   RÉGUAS:
   - parsers PUROS (testados com fixtures sanitizadas — NUNCA commitar HTML real com
     nome/CPF de titular, LGPD);
   - falha de 1 doc nunca derruba os outros (per-doc {ok, dados, erro});
   - cache em memória 12h por inscrição (protege a prefeitura e acelera o 2º clique);
   - buscas SEQUENCIAIS com pausa de 400 ms (gentileza com o servidor municipal);
   - encoding: as páginas são ISO-8859-1 — decodificação explícita, nunca mojibake;
   - LGPD: CPF vai MASCARADO na resposta (***.***.XXX-XX); o completo fica na certidão
     oficial (link) — o PDF que circula no WhatsApp não carrega documento alheio inteiro. */

import { linksPrefeitura, soDigitos } from "./links-prefeitura.js";
import { emitirCndEstadual } from "./cnd-estadual.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const TTL_MS = 12 * 3600 * 1000;
const CACHE = new Map(); /* insc -> {em, pacote} */

const pausa = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------------- núcleo puro (testável sem rede) ---------------- */

/* HTML da prefeitura → linhas de texto. </tr> vira quebra de linha, </td> vira " | " —
   as tabelas label/valor viram linhas "Rótulo | Valor |" fáceis de varrer. */
export function htmlTexto(html) {
  return String(html || "")
    .replace(/<\/tr>/gi, "")                 /* sentinela de linha (a fonte tem \n entre <td>s) */
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\r?\n+/g, " ")
    .replace(//g, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map(s => s.replace(/\s*\|\s*$/,"").trim())
    .filter(Boolean);
}

/* pegaCampo(linhas, rotulo): a célula imediatamente após a célula EXATAMENTE igual ao
   rótulo (as tabelas da prefeitura são pares label/valor). Ausente -> null, nunca "". */
export function pegaCampo(linhas, rotulo) {
  for (const linha of linhas) {
    const celulas = linha.split("|").map(s => s.trim());
    for (let i = 0; i < celulas.length - 1; i++) {
      if (celulas[i] === rotulo) {
        const v = celulas[i + 1].trim();
        return v || null;
      }
    }
  }
  return null;
}

const DATA_EMISSAO = /GOIANIA(?:\s*\(GO\))?,\s*(\d{1,2} DE [A-Z]+ DE \d{4})/i;
const NUM_CERT = /MERO DA CERTID.{0,3}O:\s*([\d.\-]+)/i;

/* espelho BIC (siptu00020a0): dados cadastrais crus, sem tradução — nunca inventa campo. */
export function parseEspelho(html) {
  const t = String(html || "");
  if (!/DADOS CADASTRAIS/i.test(t) || !/DADOS DO IM/i.test(t)) return null;
  const linhas = htmlTexto(t);
  const cab = /Inscrição\s+([\d.\-]+)/i.exec(t.replace(/&nbsp;/g, " "));
  const qd = /Quadra\s*\|\s*([^|]+?)\s+Lote\s+([^|]+)/i.exec(linhas.join("\n"));
  const num = /\bNúmero\s+(\d{1,6})\b/i.exec(t.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "));
  return {
    inscricao: cab ? cab[1] : null,
    logradouro: pegaCampo(linhas, "Logradouro"),
    numero: num ? num[1] : null,
    complemento: pegaCampo(linhas, "Complemento"),
    quadra: qd ? qd[1].trim() : null,
    lote: qd ? qd[2].trim() : null,
    bairro: pegaCampo(linhas, "Bairro"),
    edificio: pegaCampo(linhas, "Edificio"),
    areaTerreno: pegaCampo(linhas, "Área Terreno"),
    areaEdificada: pegaCampo(linhas, "Área Edificada"),
    areaEdifTotal: pegaCampo(linhas, "Área Edif.Total"),
    pavimentos: pegaCampo(linhas, "Num. Pavimen."),
    uso: pegaCampo(linhas, "Uso"),
    conservacao: pegaCampo(linhas, "Conservação"),
    ocupacao: pegaCampo(linhas, "Ocupação"),
    posFiscal: pegaCampo(linhas, "Pos. Fiscal"),
    matricula: pegaCampo(linhas, "Matrícula"),
    ultAlteracao: pegaCampo(linhas, "Ult. Alteração"),
  };
}

/* mascaraCpf: "961.471.051-91" -> "961.***.***-91" (LGPD — o PDF circula no WhatsApp). */
export function mascaraCpf(v) {
  const d = soDigitos(v);
  if (d.length === 11) return d.slice(0, 3) + ".***.***-" + d.slice(9);
  if (d.length === 14) return d.slice(0, 2) + ".***.***/" + d.slice(8, 12) + "-**";
  return v ? "***" : null;
}

/* camposCertidao(html): mapa RÓTULO->valor das linhas dados_contribuinte da certidão
   (sccer00202). null quando a página não é a certidão (nunca finge). Base do parse
   mascarado E da extração server-side do documento do titular (CND estadual, 25/08). */
export function camposCertidao(html) {
  const t = String(html || "");
  if (!/CERTID.{0,3}O DE DADOS CADASTRAIS/i.test(t)) return null;
  const campos = {};
  for (const m of t.matchAll(/<tr class="dados_contribuinte">([\s\S]*?)<\/tr>/gi)) {
    const txt = m[1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    const i = txt.indexOf(":");
    if (i < 0) continue;
    const k = txt.slice(0, i).trim().toUpperCase();
    const v = txt.slice(i + 1).trim();
    if (v) campos[k] = v;
  }
  return campos;
}

/* certidão de dados cadastrais (sccer00202): titular registrado + valor venal. */
export function parseCertidao(html) {
  const campos = camposCertidao(html);
  if (!campos) return null;
  const t = String(html || "");
  const chave = (re) => { for (const k of Object.keys(campos)) if (re.test(k)) return campos[k]; return null; };
  const numero = NUM_CERT.exec(t);
  const validade = /Validade:\s*at.{0,3}\s*(\d{2}\/\d{2}\/\d{4})/i.exec(t);
  const venal = /VALOR VENAL\s*([\d.,]+)/i.exec(t);
  const emissao = DATA_EMISSAO.exec(t);
  return {
    numero: numero ? numero[1] : null,
    validade: validade ? validade[1] : null,
    emitidaEm: emissao ? emissao[1] : null,
    inscricao: chave(/^INSCRI/i),
    titular: chave(/^NOME/i),
    cpfCnpj: mascaraCpf(chave(/^CPF/i)),
    endereco: chave(/^ENDERE/i),
    tipo: chave(/^TIPO/i),
    valorVenal: venal ? venal[1] : null,
  };
}

/* extrairDocTitular(html): CPF/CNPJ COMPLETO do titular — uso EXCLUSIVO server-side
   (emitir a CND estadual de dívida ativa do titular, 25/08). NUNCA vai na resposta:
   o kit expõe só a máscara (mascaraCpf) — régua LGPD do cabeçalho. */
export function extrairDocTitular(html) {
  const campos = camposCertidao(html);
  if (!campos) return null;
  for (const k of Object.keys(campos)) if (/^CPF/i.test(k)) return campos[k];
  return null;
}

/* CND imobiliária (sccer00201): NEGATIVA/POSITIVA — e NUNCA afirmar quando não leu. */
export function parseCnd(html) {
  const t = String(html || "");
  if (!/CERTID.{0,3}O DE REGULARIDADE FISCAL/i.test(t)) return null;
  const numero = NUM_CERT.exec(t);
  const emissao = DATA_EMISSAO.exec(t);
  const situacao = /NEGATIVA DE D.{0,3}BITOS/i.test(t) ? "negativa"
    : /POSITIVA/i.test(t) ? "positiva" : "indeterminada";
  return {
    situacao,
    numero: numero ? numero[1] : null,
    emitidaEm: emissao ? emissao[1] : null,
    validadeDias: /90 \(noventa\) dias/i.test(t) ? 90 : null,
  };
}

/* ---------------- busca server-side (sequencial, gentil, com cache) ---------------- */

async function buscaDoc(url, parser, { fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { ok: false, erro: "prefeitura respondeu HTTP " + r.status };
    const buf = await r.arrayBuffer();
    const html = new TextDecoder("iso-8859-1").decode(buf); /* páginas são Latin-1 */
    const dados = parser(html);
    if (!dados) return { ok: false, erro: "a página não veio no formato esperado (a prefeitura pode ter mudado ou pedido captcha)" };
    return { ok: true, dados };
  } catch (e) {
    return { ok: false, erro: "falha na consulta — tente de novo ou abra o canal oficial" };
  }
}

/* buscaHtml(url): HTML cru — usado SÓ quando o mesmo HTML alimenta dois caminhos
   (a certidão cadastral: parse mascarado + extração server-side do doc do titular).
   O HTML cru NUNCA vai pra resposta (carrega CPF completo — LGPD). */
async function buscaHtml(url, { fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { ok: false, erro: "prefeitura respondeu HTTP " + r.status };
    const buf = await r.arrayBuffer();
    return { ok: true, html: new TextDecoder("iso-8859-1").decode(buf) };
  } catch (e) {
    return { ok: false, erro: "falha na consulta — tente de novo ou abra o canal oficial" };
  }
}

/* emitirKitPrefeitura(inscricao): o kit COMPLETO de uma vez. Per-doc honesto; cache 12h. */
export async function emitirKitPrefeitura(inscricao, deps = {}) {
  const d = soDigitos(inscricao);
  const links = linksPrefeitura(d);
  if (!links) return { ok: false, erro: "inscrição inválida" };
  const hit = CACHE.get(d);
  if (hit && Date.now() - hit.em < TTL_MS) return { ...hit.pacote, cache: true };
  const espelho = await buscaDoc(links.espelhoBic, parseEspelho, deps);
  await pausa(400);
  /* certidão cadastral: o MESMO HTML alimenta o parse (mascarado) e a extração
     server-side do documento do titular — sem dobrar requisição na prefeitura */
  const certHtml = await buscaHtml(links.dadosCadastrais, deps);
  const certDados = certHtml.ok ? parseCertidao(certHtml.html) : null;
  const certidao = certDados ? { ok: true, dados: certDados }
    : { ok: false, erro: certHtml.ok ? "a página não veio no formato esperado (a prefeitura pode ter mudado ou pedido captcha)" : certHtml.erro };
  await pausa(400);
  const cnd = await buscaDoc(links.cnd, parseCnd, deps);
  /* CND ESTADUAL (25/08): dívida ativa do TITULAR na SEFAZ-GO — 4º documento do kit.
     O documento sai do HTML da certidão (server-side, NUNCA exposto); SEFAZ fora ou
     titular sem documento registrado = doc honesto, nunca derruba os outros 3. */
  let cndEstadual;
  const docTitular = certHtml.ok ? extrairDocTitular(certHtml.html) : null;
  if (!docTitular) {
    cndEstadual = { ok: false, erro: "certidão cadastral sem CPF/CNPJ do titular — emita no painel digitando o documento" };
  } else {
    await pausa(400);
    cndEstadual = await emitirCndEstadual(docTitular, deps);
  }
  const pacote = {
    ok: true, inscricao: d, geradoEm: new Date().toISOString(),
    docs: { espelho, certidao, cnd, cndEstadual },
    pendentes: [
      { nome: "Guia do IPTU (DUAM)", url: links.guiaIptu },
      { nome: "Limpeza pública (TLP) — débito que NÃO aparece na CND", url: links.limpezaPublica },
    ],
    fonte: "Emitido na hora nos sistemas oficiais da Prefeitura de Goiânia (siptu/sccer) e da SEFAZ-GO (dívida ativa estadual do titular)",
  };
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(d, { em: Date.now(), pacote });
  return pacote;
}
