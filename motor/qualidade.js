/* Peneira de qualidade (plano §6 + §3.quality) — DETERMINÍSTICA, sem IA.
   Decide: (a) isso é um anúncio de imóvel individual ou uma página-catálogo de
   portal? (b) o registro tem o mínimo para servir de comparável (preço confiável
   + tamanho ou tipologia + localização)? Nada aqui apaga dado: só classifica,
   com as razões gravadas. Módulo puro (zero dependências) para ser testado na
   suíte do repo com node:test. */

const CAMPOS_CHAVE = ["propertyType", "neighborhood", "privateAreaM2", "totalAreaM2",
  "bedrooms", "suites", "bathrooms", "parkingSpaces", "askingPrice"];

export function avaliarQualidade({ url = "", titulo = "", descricao = "", extracao = {} }) {
  const razoes = [];
  const e = extracao || {};

  /* -- sinais de página-catálogo (índice de portal, não imóvel individual) -- */
  let sinais = 0;
  const texto = `${titulo}\n${descricao}`;
  if (/\b\d{1,3}(\.\d{3})*\s+im[oó]veis?\b/i.test(texto)) { sinais += 2; razoes.push("texto anuncia contagem de imóveis (página de índice)"); }
  if (/(ordem-|orderby|sort=|pagina=|page=)/i.test(url)) { sinais++; razoes.push("URL com ordenação/paginação de catálogo"); }
  let path = "";
  try { path = new URL(url).pathname; } catch { }
  if (path && !/\d{5,}/.test(path) && /(venda|aluguel|imoveis|apartamentos|casas)/i.test(path)) {
    sinais++; razoes.push("URL de categoria sem id de anúncio");
  }
  const semDadosDeUnidade = e.askingPrice == null && e.privateAreaM2 == null && e.totalAreaM2 == null;
  if (semDadosDeUnidade) { sinais++; razoes.push("sem preço nem área individuais"); }
  const isCatalogPage = sinais >= 2;

  /* -- completude (fração dos campos-chave preenchidos) -- */
  const preenchidos = CAMPOS_CHAVE.filter(c => e[c] != null).length;
  const completenessScore = Math.round((preenchidos / CAMPOS_CHAVE.length) * 100) / 100;

  /* -- sanidade de valores (erro de extração vira razão, nunca ajuste silencioso) -- */
  const area = e.privateAreaM2 ?? e.totalAreaM2;
  if (area != null && (area < 10 || area > 100000)) razoes.push(`área implausível (${area} m²)`);
  if (e.askingPrice != null && (e.askingPrice < 20000 || e.askingPrice > 100000000)) razoes.push(`preço implausível (${e.askingPrice})`);

  /* -- grau de comparável (§6): preço confiável + tamanho/tipologia + localização -- */
  const temPreco = e.askingPrice != null && e.askingPrice >= 20000 && e.askingPrice <= 100000000;
  const temTamanho = (area != null && area >= 10 && area <= 100000) || e.bedrooms != null;
  const temLocal = !!e.neighborhood;
  const comparableGrade = !isCatalogPage && temPreco && temTamanho && temLocal;
  if (!comparableGrade) {
    if (isCatalogPage) razoes.push("classificado como página-catálogo");
    if (!temPreco) razoes.push("sem preço confiável");
    if (!temTamanho) razoes.push("sem área nem tipologia");
    if (!temLocal) razoes.push("sem bairro");
  }

  return { completenessScore, isCatalogPage, comparableGrade, razoes };
}
