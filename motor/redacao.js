/* Redação do parecer (§17): a IA recebe o JSON FECHADO e escreve prosa — nunca números.
   Valores monetários entram por placeholder substituído pelo código; o validador rejeita
   qualquer dígito de reais estranho. Se a validação falhar, 1 nova tentativa com o erro
   explicado; persistindo, a chamada falha alto (nunca entrega texto suspeito). */
import { pool } from "./db.js";
import { aiProvider } from "./ai-provider.js";
import { placeholdersDe, substituirPlaceholders, validarParecer } from "./redacao-validador.js";

const SYSTEM = `Você redige a explicação de uma Análise Comparativa de Mercado imobiliária,
em português impecável, tom profissional e sóbrio, para um corretor apresentar ao cliente.
REGRAS INEGOCIÁVEIS:
- NUNCA escreva valores em reais com dígitos ou por extenso. Para citar valores use SOMENTE
  os placeholders exatos: {{VALOR}} (estimativa central), {{PM2}} (R$/m² ponderado),
  {{PM2_MEDIANA}} (R$/m² mediano), {{MIN}} e {{MAX}} (faixa provável).
- Não invente comparáveis, fontes, percentuais ou fatos fora do JSON recebido.
- TODO número que não for placeholder (contagens, percentuais, áreas) escreva em
  ALGARISMOS, nunca por extenso — número por extenso escapa da conferência automática
  (brecha real vista no 1º parecer do GLM-5.2: "setenta e três" driblava o validador).
- Não afirme certeza inexistente; a confiança e as limitações do JSON DEVEM aparecer no texto.
- Deixe claro que a base são preços de OFERTA anunciados, não transações fechadas.
- Estrutura: 3 parágrafos — (1) o que foi estimado e o valor com a faixa; (2) como se chegou
  (metodologia e amostra, citando quantos comparáveis e o tratamento de outliers);
  (3) limitações e leitura recomendada (confiança e ressalvas). Sem títulos, sem listas.`;

export async function gerarParecer(valuationId) {
  const q = await pool.query("SELECT id, subject, status, result FROM valuations WHERE id=$1", [valuationId]);
  if (!q.rowCount) throw new Error("avaliação não encontrada");
  const val = q.rows[0];
  if (val.status !== "calculada" || !val.result?.estimatedValue) throw new Error("avaliação sem resultado calculado");
  const ph = placeholdersDe(val);
  const fechado = { subject: val.subject, result: val.result };

  let ultimoProblema = "";
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const extra = ultimoProblema ? `\n\nATENÇÃO: a tentativa anterior foi rejeitada (${ultimoProblema}). Corrija.` : "";
    const g = await aiProvider.generateText({
      task: "parecer-acm", tier: "advanced", cache: false,
      system: SYSTEM + extra,
      prompt: "JSON DA ANÁLISE (fonte única de verdade):\n" + JSON.stringify(fechado, null, 1),
    });
    const texto = substituirPlaceholders(String(g.value).trim(), ph);
    const v = validarParecer(texto, ph);
    if (v.ok) {
      const parecer = { texto, model: g.model, provider: g.provider, geradoEm: new Date().toISOString() };
      await pool.query("UPDATE valuations SET result = result || $1 WHERE id=$2",
        [JSON.stringify({ parecer }), valuationId]);
      await pool.query(
        "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('valuation',$1,'parecer-gerado',$2)",
        [valuationId, JSON.stringify({ model: g.model, valido: true })]).catch(() => {});
      return { id: valuationId, parecer };
    }
    ultimoProblema = v.problemas.join("; ");
    await pool.query(
      "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('valuation',$1,'parecer-rejeitado',$2)",
      [valuationId, JSON.stringify({ problemas: v.problemas })]).catch(() => {});
  }
  throw new Error("parecer rejeitado pela validação números-texto: " + ultimoProblema);
}
