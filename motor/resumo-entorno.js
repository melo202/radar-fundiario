/* Resumo do entorno por IA (spec de localização §12): a IA recebe SOMENTE os dados já
   medidos e explica — qualquer número citado tem que existir no conjunto medido
   (validarNumeros). Falhou 2x? Cai no resumo DETERMINÍSTICO — nunca texto suspeito.
   O cache fica no ai_cache (hash do conteúdo), então cada entorno paga IA uma vez. */
import { aiProvider } from "./ai-provider.js";
import { entorno } from "./localizacao.js";
import { validarNumeros } from "./redacao-validador.js";
import { pool } from "./db.js";

const SYSTEM = `Você resume a análise de entorno de um imóvel em Goiânia para um corretor,
em português impecável, 1 parágrafo (4 a 6 frases), tom profissional e sóbrio.
REGRAS INEGOCIÁVEIS:
- Use SOMENTE os dados do JSON. Não invente estabelecimentos, qualidades ou distâncias.
- Só cite números que estejam LITERALMENTE no JSON (contagens e distâncias em metros).
  Se preferir, qualifique sem números ("a curta caminhada", "bem servido").
- Comece pelos pontos fortes; termine com os pontos de atenção (categorias com sinal
  "atencao") quando existirem, sem dramatizar.
- Se coverageConfidence for "baixa", diga explicitamente que o mapeamento da região é
  incompleto e ausências podem ser lacuna de dados.
- Não avalie segurança pública nem perfil de moradores. Não afirme valorização.
- Não qualifique quantidades das categorias de atenção ("poucos"/"muitos"/"apenas") —
  aponte a existência e a distância, sem juízo. Não diga que o mapeamento é "completo":
  no máximo "região bem mapeada" quando a cobertura for alta.
- Não mencione o que não está no JSON — nem como ausência.`;

function resumoDeterministico(d) {
  const c = d.categorias;
  const fortes = Object.values(c).filter(x => x.count && x.sinal === "positivo")
    .sort((a, b) => b.count - a.count).slice(0, 4)
    .map(x => `${x.rotulo.toLowerCase()}: ${x.count} (mais próximo a ${x.nearestDistanceMeters} m)`);
  const atencao = Object.values(c).filter(x => x.count && x.sinal === "atencao")
    .map(x => `${x.rotulo.toLowerCase()} a ${x.nearestDistanceMeters} m`);
  return `Entorno medido em dados abertos — ${fortes.length ? "principais amenidades: " + fortes.join("; ") + "." : "nenhuma amenidade mapeada nos raios pesquisados."}`
    + (atencao.length ? ` Pontos de atenção: ${atencao.join("; ")}.` : "")
    + (d.dataQuality.warnings.length ? " Atenção: mapeamento incompleto nesta região — ausências podem ser lacuna de dados." : "");
}

export async function resumirEntorno({ lat, lon }) {
  const d = await entorno({ lat, lon });
  /* whitelist: contagens, distâncias, raios (m e km com 1 casa) */
  const permitidos = [];
  for (const x of Object.values(d.categorias)) {
    permitidos.push(x.count, x.raioM, x.raioM / 1000);
    if (x.nearestDistanceMeters != null) {
      permitidos.push(x.nearestDistanceMeters, (x.nearestDistanceMeters / 1000).toFixed(1));
    }
  }
  /* categoria zerada NEM ENTRA no que a IA vê — o modelo não resiste a narrar
     "ausência" (visto em produção: cemitério zerado virou "ponto de atenção").
     Filtrar na construção > pedir por prompt. */
  const categorias = Object.fromEntries(Object.entries(d.categorias).filter(([, x]) => x.count > 0));
  const payload = { categorias, dataQuality: { coverageConfidence: d.dataQuality.coverageConfidence, warnings: d.dataQuality.warnings } };

  let texto = null, modo = "ia", modelo = null;
  let problema = "";
  for (let tentativa = 0; tentativa < 2 && texto == null; tentativa++) {
    try {
      const g = await aiProvider.generateText({
        task: "resumo-entorno", tier: "fast",
        system: SYSTEM + (problema ? `\n\nATENÇÃO: tentativa anterior rejeitada (${problema}). Cite menos números.` : ""),
        prompt: JSON.stringify(payload),
      });
      const cand = String(g.value).trim();
      const v = validarNumeros(cand, permitidos);
      if (v.ok) { texto = cand; modelo = g.model; }
      else problema = "números fora dos dados: " + v.estranhos.join(", ");
    } catch (e) { problema = String(e.message).slice(0, 120); }
  }
  if (texto == null) { texto = resumoDeterministico(d); modo = "deterministico"; }
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('localizacao', $1, 'resumo-gerado', $2)",
    [`${lat.toFixed(4)},${lon.toFixed(4)}`, JSON.stringify({ modo, modelo, problema: problema || null })]).catch(() => {});
  return { texto, modo, modelo, dataQuality: d.dataQuality };
}
