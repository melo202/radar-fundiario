/* CND ESTADUAL — Dívida Ativa GO (SEFAZ-GO), emissão server-side (25/08/2026).
   Pedido antigo do Bruno (19/08): "onde tá CND da pessoa (vendedor)? não achei nem a pau…
   tem como fazer uma busca direto por CPF/CNPJ?".
   Descoberta do dia (teste REAL com CNPJ público 01.600.379/0001-33, Prefeitura de
   Goiânia — dado de órgão público, nunca pessoa física): o formulário
   https://www.sefaz.go.gov.br/Certidao/Emissao/ NÃO TEM CAPTCHA — um POST direto em
   certidao.asp emite na hora, e Render=xml devolve a certidão ESTRUTURADA (campos
   nomeados — parser robusto, sem regex em layout de página). Mesmo espírito do truque
   da prefeitura: o corretor não redigita nada, o documento oficial sai no fluxo.

   RÉGUAS (as mesmas do kitpref-emissao):
   - validação de DV de CPF/CNPJ ANTES de viajar (não gasta requisição à toa);
   - parser XML PURO testado com fixture sanitizada (NUNCA commitar XML real — LGPD);
   - falha honesta e isolada: SEFAZ fora nunca derruba o kit municipal;
   - cache em memória 12h por documento (protege a SEFAZ e acelera o 2º clique);
   - páginas/respostas são ISO-8859-1 — decodificação explícita;
   - LGPD: o número do documento volta MASCARADO na resposta (máscara local, duplicada
     de kitpref-emissao de propósito — importar de lá criaria ciclo de módulos). */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const URL_POST = "https://www.sefaz.go.gov.br/Certidao/Emissao/certidao.asp";
const TTL_MS = 12 * 3600 * 1000;
const CACHE = new Map(); /* doc -> {em, resp} */

const soDig = (v) => String(v || "").replace(/\D/g, "");

/* ---------------- núcleo puro (testável sem rede) ---------------- */

/* dvCpf/dvCnpj: dígitos verificadores oficiais. */
function dvCpf(base9) {
  const b = base9.split("").map(Number);
  let s = b.reduce((a, d, i) => a + d * (10 - i), 0);
  const d1 = (s * 10) % 11 % 10;
  const b2 = [...b, d1];
  s = b2.reduce((a, d, i) => a + d * (11 - i), 0);
  const d2 = (s * 10) % 11 % 10;
  return "" + d1 + d2;
}
function dvCnpj(base12) {
  const b = base12.split("").map(Number);
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = b.reduce((a, d, i) => a + d * p1[i], 0);
  const d1 = s % 11 < 2 ? 0 : 11 - (s % 11);
  const b2 = [...b, d1];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  s = b2.reduce((a, d, i) => a + d * p2[i], 0);
  const d2 = s % 11 < 2 ? 0 : 11 - (s % 11);
  return "" + d1 + d2;
}

/* validarDocumento(doc): CPF (11) ou CNPJ (14) com DV conferindo ->
   {tipo:1|2, numero} (tipo no formato que o formulário da SEFAZ espera); senão null.
   Rejeita sequências repetidas (111.111.111-11 tem DV "válido" mas não é documento). */
export function validarDocumento(doc) {
  const d = soDig(doc);
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return null;
    return dvCpf(d.slice(0, 9)) === d.slice(9) ? { tipo: 1, numero: d } : null;
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return null;
    return dvCnpj(d.slice(0, 12)) === d.slice(12) ? { tipo: 2, numero: d } : null;
  }
  return null;
}

/* mascaraDoc: mesma régua LGPD do kit municipal — o completo fica na certidão oficial. */
export function mascaraDoc(numero) {
  const d = soDig(numero);
  if (d.length === 11) return d.slice(0, 3) + ".***.***-" + d.slice(9);
  if (d.length === 14) return d.slice(0, 2) + ".***.***/" + d.slice(8, 12) + "-**";
  return d ? "***" : null;
}

/* parseCndEstadualXml(xml): XML da SEFAZ (Render=xml) -> dados da certidão, ou
   {ok:false, erro} quando a SEFAZ devolve o XML de erro (<Category>Erro</Category>),
   ou null quando o formato não é reconhecido (mudança de sistema -> honesto, nunca inventa). */
export function parseCndEstadualXml(xml) {
  const t = String(xml || "");
  const tag = (nome) => {
    const m = t.match(new RegExp("<" + nome + ">([\\s\\S]*?)</" + nome + ">", "i"));
    return m ? m[1].trim() : null;
  };
  if (/<Category>\s*Erro\s*<\/Category>/i.test(t)) {
    const d = tag("Description") || "a SEFAZ recusou a emissão";
    return { ok: false, erro: d.replace(/^OCORREU O ERRO:?\s*\d*\s*/i, "").replace(/!+$/, "").trim() };
  }
  const titulo = tag("titulolin");
  if (!titulo || !/CERTIDAO DE DEBITO/i.test(titulo)) return null;
  /* ordem importa: "POSITIVA COM EFEITO DE NEGATIVA" antes de qualquer uma solta */
  const situacao = /COM EFEITO/i.test(titulo) ? "positiva_com_efeito"
    : /NEGATIVA/i.test(titulo) ? "negativa"
    : /POSITIVA/i.test(titulo) ? "positiva" : "indeterminada";
  const despachos = [...t.matchAll(/<despacho>([\s\S]*?)<\/despacho>/gi)]
    .map(m => m[1].trim()).filter(Boolean);
  const nomerazao = tag("nomerazao");
  return {
    ok: true,
    situacao,
    numero: tag("numerocert"),
    tipoPessoa: tag("tipopessoa"),
    titular: nomerazao && !/^VALIDA PARA/i.test(nomerazao) ? nomerazao : null, /* placeholder da SEFAZ não é nome */
    documento: mascaraDoc(tag("numerodoc")),
    despacho: despachos[0] || null,
    validadeDias: 120, /* a própria certidão declara "VALIDA POR 120 DIAS" (verificada 25/08) */
  };
}

/* ---------------- emissão server-side ---------------- */

/* emitirCndEstadual(doc): valida o DV, emite na SEFAZ-GO e devolve o parse honesto.
   deps.fetchImpl injetável nos testes de fluxo (sem rede). */
export async function emitirCndEstadual(doc, deps = {}) {
  const v = validarDocumento(doc);
  if (!v) return { ok: false, erro: "CPF ou CNPJ inválido — confira os números (o dígito verificador não confere)" };
  const hit = CACHE.get(v.numero);
  if (hit && Date.now() - hit.em < TTL_MS) return { ...hit.resp, cache: true };
  const campoDoc = v.tipo === 1 ? "Certidao.NumeroDocumentoCPF" : "Certidao.NumeroDocumentoCNPJ";
  const body = new URLSearchParams({
    "Certidao.Tipo": "01", /* Dívida Ativa — único tipo que o portal oferece */
    "Certidao.TipoDocumento": String(v.tipo),
    [campoDoc]: v.numero,
    "Certidao.Espolio": "N",
    "Certidao.Render": "xml",
    "Certidao.ValidarEmissao_Emitir": "0",
  });
  try {
    const r = await (deps.fetchImpl || fetch)(URL_POST, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Referer": "https://www.sefaz.go.gov.br/Certidao/Emissao/",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return { ok: false, erro: "SEFAZ respondeu HTTP " + r.status + " — tente de novo ou abra o canal oficial" };
    const buf = await r.arrayBuffer();
    const xml = new TextDecoder("iso-8859-1").decode(buf); /* respostas são Latin-1 */
    const dados = parseCndEstadualXml(xml);
    if (!dados) return { ok: false, erro: "a resposta não veio no formato esperado (a SEFAZ pode ter mudado o sistema)" };
    if (!dados.ok) return dados;
    const resp = { ...dados, fonte: "Emitida na hora na SEFAZ-GO (Dívida Ativa estadual) — autenticidade em goias.gov.br/economia" };
    if (CACHE.size > 500) CACHE.clear();
    CACHE.set(v.numero, { em: Date.now(), resp });
    return resp;
  } catch (e) {
    return { ok: false, erro: "falha na consulta à SEFAZ — tente de novo ou abra o canal oficial" };
  }
}
