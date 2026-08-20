/* Geocodificação de ANÚNCIO (§10 da localização): texto do anúncio -> endereço
   determinístico -> CNEFE -> coordenada com precisão declarada. Regra de honestidade:
   quando o anúncio tem bairro, o candidato do CNEFE PRECISA ser de localidade
   compatível (senão uma "Rua 3" de outro setor viraria coordenada errada). */
import { geocodificar } from "./geocodificar.js";
import { extraiEnderecoAnuncio, localidadeCasa } from "./endereco-anuncio.js";
import { geocodificarCadastro, geocodificarCondominio, extraiCondominioAnuncio } from "./geocodificar-cadastro.js";

/* confiança pela precisão do degrau (fato declarado, nunca peso de valor) */
const CONFIANCA = { "numero": 0.9, "numero-proximo": 0.6, "logradouro": 0.35,
  "numero-oficial": 0.92, "condominio": 0.75 };

export async function geocodificarAnuncio({ titulo, descricao, neighborhood }) {
  const texto = `${titulo || ""}\n${descricao || ""}`;
  const alvo = extraiEnderecoAnuncio(texto);
  if (alvo) {
    const g = await geocodificar({ rua: alvo.rua, numero: alvo.numero });
    if (g.precisao && (g.candidatos || []).length) {
      const cand = neighborhood
        ? g.candidatos.find(c => localidadeCasa(c.localidade, neighborhood))
        : g.candidatos[0];
      if (cand) return {
        lat: cand.lat, lon: cand.lon,
        precisao: g.precisao, confidence: CONFIANCA[g.precisao] ?? 0.3,
        ruaDetectada: alvo.rua, numeroDetectado: alvo.numero,
        localidadeCnefe: cand.localidade || null,
      };
      /* rua existe, mas não no bairro do anúncio — não inventa (cai nos degraus abaixo) */
    }
    /* P0.3 (20/08): CNEFE não cobriu → cadastro municipal oficial (rua+número→lote) */
    const c = await geocodificarCadastro({ rua: alvo.rua, numero: alvo.numero, bairro: neighborhood });
    if (c) return { ...c, ruaDetectada: alvo.rua, numeroDetectado: alvo.numero };
  }
  /* P0.3: sem rua útil no texto → nome do condomínio/edifício no cadastro oficial */
  const cond = extraiCondominioAnuncio(texto);
  if (cond) {
    const g = await geocodificarCondominio({ nome: cond, bairro: neighborhood });
    if (g) return { ...g, condominioDetectado: cond };
  }
  return null;
}
