/* Validação §17/§22 — PURA, sem IO: garante que o texto redigido pela IA não contém
   nenhum valor monetário fora do conjunto permitido (os números do ValuationResult).
   A redação usa placeholders ({{VALOR}}, {{MIN}}, ...) substituídos pelo CÓDIGO — a IA
   não escreve dígitos de reais; este validador é a rede de segurança final. */

export const fmtBR = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n));

/* placeholders canônicos -> valor numérico do resultado */
export function placeholdersDe(valuation) {
  const r = valuation.result;
  return {
    VALOR: r.estimatedValue,
    PM2: r.estimatedPricePerM2,
    PM2_MEDIANA: r.medianPricePerM2,
    MIN: r.probableRange.minimum,
    MAX: r.probableRange.maximum,
  };
}

export function substituirPlaceholders(texto, ph) {
  let t = texto;
  for (const [k, v] of Object.entries(ph)) t = t.replaceAll(`{{${k}}}`, `R$ ${fmtBR(v)}`);
  return t;
}

/* Após a substituição: (a) não pode sobrar placeholder; (b) todo "R$ ..." do texto
   tem que ser um dos valores permitidos, formatados exatamente pelo nosso fmtBR. */
export function validarParecer(texto, ph) {
  const problemas = [];
  const sobras = texto.match(/\{\{[A-Z_]+\}\}/g);
  if (sobras) problemas.push(`placeholders não substituídos: ${[...new Set(sobras)].join(", ")}`);
  const permitidos = new Set(Object.values(ph).map(fmtBR));
  const monetarios = [...texto.matchAll(/R\$\s?([\d.][\d.,]*)/g)].map(m => m[1].replace(/[.,]$/, ""));
  const estranhos = monetarios.filter(n => !permitidos.has(n));
  if (estranhos.length) problemas.push(`valores monetários fora do resultado: ${[...new Set(estranhos)].join(", ")}`);
  return { ok: problemas.length === 0, problemas, monetarios };
}
