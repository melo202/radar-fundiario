/* Extração DETERMINÍSTICA de endereço do texto de anúncio (zero IA — no espírito do
   núcleo): acha "Rua X", "Av. Y, 123" no título/descrição. Regex conservadora de
   propósito: quem valida de verdade é o geocoder CNEFE depois (rua inexistente no
   bairro simplesmente não geocodifica — nunca vira coordenada). PURO, testado. */

import { semAcento } from "./normaliza-endereco.js";

const TIPO_VIA = "rua|avenida|av|alameda|al|travessa|tv|pra[çc]a|p[çc]|rodovia|estrada|viela";

/* localidade do CNEFE ("BELA VISTA") casa com o bairro do anúncio ("Setor Bela Vista")?
   Por token SIGNIFICATIVO — palavras genéricas de bairro nunca casam sozinhas. */
const GENERICOS = new Set(["setor", "jardim", "vila", "parque", "residencial", "st", "jd",
  "bairro", "conjunto", "cj", "loteamento", "chacara", "chacaras", "de", "do", "da", "dos", "das",
  /* nome da cidade e numerais romanos NUNCA identificam bairro sozinhos (bug real:
     "Goiânia II" casava com qualquer localidade que tivesse "goiania" no nome) */
  "goiania", "go", "ii", "iii", "iv"]);
export const tokensSig = (s) => semAcento(String(s || "")).toLowerCase().split(/[^a-z0-9]+/)
  .filter(t => t.length > 1 && !GENERICOS.has(t));
export function localidadeCasa(localidade, neighborhood) {
  const a = tokensSig(localidade), b = new Set(tokensSig(neighborhood));
  return a.length > 0 && a.some(t => b.has(t));
}

export function extraiEnderecoAnuncio(texto) {
  const t = String(texto || "").replace(/\s+/g, " ");
  /* nome da via: para em vírgula/ponto/traço-longo/quebra ou em palavras de contexto */
  const re = new RegExp(
    `\\b(${TIPO_VIA})\\.? ((?:[A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9.'-]*)(?: [A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9.'-]*){0,4}?)` +
    `(?:,? ?(?:n[º°o.]? ?)?(\\d{1,5})\\b)?(?= ?[,;.·•–—|-]| no | na | em |$)`, "i");
  const m = re.exec(t);
  if (!m) return null;
  let rua = m[2].trim().replace(/[.,;]+$/, "");
  let numero = m[3] ? Number(m[3]) : null;
  /* "Rua T 71" (letra + dígitos SEM vírgula nem "nº") em Goiânia é a RUA T-71, não a
     rua T número 71 — junta o número ao nome. Com vírgula ou nº explícito ("Rua T, 71",
     "Rua S 3 nº 50"), o número é número mesmo. Bug apanhado no P0.3 (20/08): Chaves na
     Mão grava "· Rua T 71 · Setor Bueno" e a extração devolvia null. */
  if (/^[A-Za-zÀ-ú]$/.test(rua) && numero != null && !/[,]|n[º°o.]/i.test(m[0])) {
    rua = `${rua} ${m[3]}`; numero = null;
  }
  /* corta caudas de contexto que a regex gulosa pode arrastar ("Bueno Goiânia") */
  rua = rua.replace(/\b(goi[âa]nia|goias|go)\b.*$/i, "").trim();
  /* letra sozinha é nome de rua válido em Goiânia (Rua V, Rua C) quando veio com número
     ("Rua T, 71") OU delimitada por separador forte ("Rua V | Conjunto X"); solta no fim
     do texto não dá pra distinguir de lixo de extração */
  const segueSeparador = /^\s*[,;.·•–—|-]/.test(t.slice(m.index + m[0].length));
  if (rua.length < 2 && numero == null && !segueSeparador) return null;
  /* nome que é só o tipo de via de novo ("Rua Rua") ou lixo de 1 letra sem dígito */
  if (new RegExp(`^(${TIPO_VIA})$`, "i").test(rua)) return null;
  return { rua: `${m[1]} ${rua}`, numero };
}
