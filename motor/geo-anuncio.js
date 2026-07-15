/* Geocodificação de ANÚNCIO (§10 da localização): texto do anúncio -> endereço
   determinístico -> CNEFE -> coordenada com precisão declarada. Regra de honestidade:
   quando o anúncio tem bairro, o candidato do CNEFE PRECISA ser de localidade
   compatível (senão uma "Rua 3" de outro setor viraria coordenada errada). */
import { geocodificar } from "./geocodificar.js";
import { extraiEnderecoAnuncio, localidadeCasa } from "./endereco-anuncio.js";

/* confiança pela precisão do degrau (fato declarado, nunca peso de valor) */
const CONFIANCA = { "numero": 0.9, "numero-proximo": 0.6, "logradouro": 0.35 };

export async function geocodificarAnuncio({ titulo, descricao, neighborhood }) {
  const alvo = extraiEnderecoAnuncio(`${titulo || ""}\n${descricao || ""}`);
  if (!alvo) return null;
  const g = await geocodificar({ rua: alvo.rua, numero: alvo.numero });
  if (!g.precisao || !(g.candidatos || []).length) return null;
  const cand = neighborhood
    ? g.candidatos.find(c => localidadeCasa(c.localidade, neighborhood))
    : g.candidatos[0];
  if (!cand) return null; /* rua existe, mas não no bairro do anúncio — não inventa */
  return {
    lat: cand.lat, lon: cand.lon,
    precisao: g.precisao, confidence: CONFIANCA[g.precisao] ?? 0.3,
    ruaDetectada: alvo.rua, numeroDetectado: alvo.numero,
    localidadeCnefe: cand.localidade || null,
  };
}
