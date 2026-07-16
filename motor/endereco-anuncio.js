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
const tokensSig = (s) => semAcento(String(s || "")).toLowerCase().split(/[^a-z0-9]+/)
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
    `(?:,? ?(?:n[º°o.]? ?)?(\\d{1,5})\\b)?(?= ?[,;.–—|-]| no | na | em |$)`, "i");
  const m = re.exec(t);
  if (!m) return null;
  let rua = m[2].trim().replace(/[.,;]+$/, "");
  /* corta caudas de contexto que a regex gulosa pode arrastar ("Bueno Goiânia") */
  rua = rua.replace(/\b(goi[âa]nia|goias|go)\b.*$/i, "").trim();
  if (rua.length < 2) return null;
  /* nome que é só o tipo de via de novo ("Rua Rua") ou lixo de 1 letra sem dígito */
  if (new RegExp(`^(${TIPO_VIA})$`, "i").test(rua)) return null;
  const numero = m[3] ? Number(m[3]) : null;
  return { rua: `${m[1]} ${rua}`, numero };
}
