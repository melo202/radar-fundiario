/* Proxy de DOCUMENTO oficial da prefeitura (25/08/2026).
   Por que existe: os endpoints sccer (CND imobiliária e certidão cadastral) servem
   o GET direto com os acentos CORROMPIDOS na fonte (U+FFFD) e sem charset — no
   navegador saem "CERTID¿½O". Aqui o motor busca, decodifica certo e REPARA os
   acentos (mojibake-prefeitura.js), servindo a certidão íntegra e legível.
   O documento é o MESMO da prefeitura — só o encoding é consertado; conteúdo,
   número e validade seguem exatamente os oficiais. O espelho (siptu) também passa
   aqui para sair sempre em UTF-8 correto.

   Régua LGPD: a certidão cadastral é página PÚBLICA da própria prefeitura (o app
   já abria o link direto); o proxy não expõe nada além do que o portal expõe.
   Gentileza: cache 12h por tipo+inscrição — 1 ida à prefeitura por documento. */

import { linksPrefeitura, soDigitos } from "./links-prefeitura.js";
import { decodificarPrefeitura } from "./mojibake-prefeitura.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const TTL_MS = 12 * 3600 * 1000;
const CACHE = new Map(); /* `${tipo}:${insc}` -> {em, corpo} */

const BASES = {
  cnd: "https://www.goiania.go.gov.br/sistemas/sccer/asp/",
  certidao: "https://www.goiania.go.gov.br/sistemas/sccer/asp/",
  espelho: "https://www.goiania.go.gov.br/sistemas/siptu/asp/",
};

/* urlDo(tipo, links): qual endpoint oficial cada tipo serve. */
function urlDo(tipo, links) {
  if (tipo === "cnd") return links.cnd;
  if (tipo === "certidao") return links.dadosCadastrais;
  if (tipo === "espelho") return links.espelhoBic;
  return null;
}

/* prepararPagina(html, base): HTML reparado + <base> para CSS/imagens relativas
   continuarem vindo da prefeitura + <meta charset> para o documento se bastar
   mesmo salvo em disco. Pura — testável sem rede. */
export function prepararPagina(html, base) {
  let t = String(html || "");
  const injecao = `<meta charset="utf-8"><base href="${base}" target="_blank">`;
  if (/<head[^>]*>/i.test(t)) t = t.replace(/<head[^>]*>/i, m => m + injecao);
  else t = injecao + t;
  return t;
}

/* servirDocPrefeitura(tipo, inscricao): busca + repara o documento oficial.
   Devolve {ok, html} ou {ok:false, erro} — nunca vaza stack nem dado de terceiro. */
export async function servirDocPrefeitura(tipo, inscricao, { fetchImpl = fetch } = {}) {
  const d = soDigitos(inscricao);
  const links = linksPrefeitura(d);
  const url = links && urlDo(tipo, links);
  if (!url) return { ok: false, status: 400, erro: "tipo ou inscrição inválidos" };
  const chave = `${tipo}:${d}`;
  const hit = CACHE.get(chave);
  if (hit && Date.now() - hit.em < TTL_MS) return { ok: true, html: hit.corpo, cache: true };
  try {
    const r = await fetchImpl(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { ok: false, status: 502, erro: "a prefeitura respondeu HTTP " + r.status + " — tente de novo ou abra o canal oficial" };
    const buf = await r.arrayBuffer();
    const html = prepararPagina(decodificarPrefeitura(buf), BASES[tipo]);
    if (!/CERTID|Cadastro Imobili|Espelho|BIC|Inscri/i.test(html)) {
      return { ok: false, status: 502, erro: "a página não veio no formato esperado (a prefeitura pode estar fora ou ter mudado)" };
    }
    if (CACHE.size > 500) CACHE.clear();
    CACHE.set(chave, { em: Date.now(), corpo: html });
    return { ok: true, html };
  } catch (e) {
    return { ok: false, status: 502, erro: "falha na consulta à prefeitura — tente de novo ou abra o canal oficial" };
  }
}
