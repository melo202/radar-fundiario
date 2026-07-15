/* Extração estruturada de anúncio (plano §4): a IA transforma texto em dados,
   NUNCA inventa. Campo sem evidência = null. Nada aqui calcula preço. */
import { aiProvider } from "./ai-provider.js";

/* Schema enxuto da 1ª fatia — cresce com a entidade Property (§3).
   additionalProperties:false + required em tudo: o modelo é obrigado a
   preencher cada campo (com null quando não houver evidência). */
export const EXTRACAO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["propertyType", "neighborhood", "privateAreaM2", "totalAreaM2", "bedrooms",
    "suites", "bathrooms", "parkingSpaces", "condominiumFee", "askingPrice", "isLaunch",
    "isFurnished", "confirmados", "inferidos"],
  properties: {
    propertyType: { type: ["string", "null"], enum: ["apartamento", "casa", "terreno", "comercial", "rural", null] },
    neighborhood: { type: ["string", "null"] },
    privateAreaM2: { type: ["number", "null"] },
    totalAreaM2: { type: ["number", "null"] },
    bedrooms: { type: ["integer", "null"] },
    suites: { type: ["integer", "null"] },
    bathrooms: { type: ["integer", "null"] },
    parkingSpaces: { type: ["integer", "null"] },
    condominiumFee: { type: ["number", "null"] },
    askingPrice: { type: ["number", "null"] },
    isLaunch: { type: ["boolean", "null"] },
    isFurnished: { type: ["boolean", "null"] },
    confirmados: { type: "array", items: { type: "string" } },
    inferidos: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `Você extrai dados de anúncios imobiliários brasileiros para JSON.
REGRAS INEGOCIÁVEIS:
- Extraia SOMENTE o que está escrito. Campo sem evidência textual = null. NUNCA estime.
- Não confunda área total com área privativa: se o anúncio não distinguir, preencha só totalAreaM2.
- Opinião de anúncio ("melhor preço da região", "alto padrão") NÃO é fato: ignore para os campos.
- Liste em "confirmados" os nomes dos campos com evidência textual direta; em "inferidos" os que
  exigiram interpretação (ex.: "3 qtos sendo 1 suíte" -> bedrooms confirmado, suites confirmado).
- Valores em reais como número puro (890000, nunca "R$ 890 mil").`;

export async function extrairAnuncio({ titulo, descricao, tier = "fast" }) {
  return aiProvider.generateStructuredData({
    task: "extracao-anuncio",
    tier,
    system: SYSTEM,
    prompt: `TÍTULO: ${titulo || "(sem título)"}\n\nDESCRIÇÃO:\n${descricao || "(sem descrição)"}`,
  }, EXTRACAO_SCHEMA);
}
