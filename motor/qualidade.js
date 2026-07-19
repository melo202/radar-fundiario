/* Peneira de qualidade (plano §6 + §3.quality) — DETERMINÍSTICA, sem IA.
   Decide: (a) isso é um anúncio de imóvel individual ou uma página-catálogo de
   portal? (b) o registro tem o mínimo para servir de comparável (preço confiável
   + tamanho ou tipologia + localização)? Nada aqui apaga dado: só classifica,
   com as razões gravadas. Módulo puro (só depende de outro módulo puro, a
   identidade canônica) para ser testado na suíte do repo com node:test. */
import { identidadeAnuncio } from "./identidade-anuncio.js";

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
  /* identidade canônica (17/07): nos portais cujo padrão de id conhecemos (OLX, Viva,
     Zap…), URL sem id É catálogo — sinal decisivo. A auditoria de 17/07 mostrou o
     estrago: snippet de catálogo com preço+área de UMA unidade passava por comparável
     e sujava o índice do bairro e o termômetro de mudanças. */
  const idt = identidadeAnuncio(url);
  if (idt.portalConhecido && !idt.externalId) {
    sinais += 2; razoes.push("portal com padrão de id conhecido e URL sem id (catálogo certo)");
  }
  const semDadosDeUnidade = e.askingPrice == null && e.privateAreaM2 == null && e.totalAreaM2 == null;
  if (semDadosDeUnidade) { sinais++; razoes.push("sem preço nem área individuais"); }
  const isCatalogPage = sinais >= 2;

  /* -- venda vs aluguel (auditoria 19/07): ALUGUEL nunca vira comparável de venda.
     O caso real que motivou: casa "para-alugar ... R$950" extraída como venda de
     R$950.000 — teria sujado a mediana do bairro. O sinal decisivo é a URL do
     próprio portal; o título decide quando não menciona venda. Descrição sozinha
     não decide (anúncio de venda pode citar "aceita também alugar"). -- */
  const isRental = /alug|loca[cç][aã]o|temporada/i.test(path || "")
    || (/\b(para alugar|aluguel|loca[cç][aã]o|temporada)\b/i.test(titulo) && !/vend/i.test(titulo));
  if (isRental) razoes.push("anúncio de ALUGUEL — fora dos comparáveis de venda");

  /* -- cidade (auditoria 19/07): o acervo é de GOIÂNIA. A busca do bairro "Campinas"
     trouxe Campinas-SP com grau de comparável. Anúncio que não menciona Goiânia em
     lugar NENHUM (título+descrição+URL) não sustenta comparável daqui — conservador
     de propósito; a razão fica gravada e nada é apagado. -- */
  const foraDeGoiania = !/goi[aâ]nia/i.test(`${titulo}\n${descricao}\n${url}`);
  if (foraDeGoiania) razoes.push("sem menção a Goiânia — cidade não confirmada");

  /* -- completude (fração dos campos-chave preenchidos) -- */
  const preenchidos = CAMPOS_CHAVE.filter(c => e[c] != null).length;
  const completenessScore = Math.round((preenchidos / CAMPOS_CHAVE.length) * 100) / 100;

  /* -- sanidade de valores (erro de extração vira razão, nunca ajuste silencioso).
     Área implausível REPROVA o comparável (19/07): o índice divide preço/área, então
     área errada envenena o R$/m² mesmo quando a tipologia existe. -- */
  const area = e.privateAreaM2 ?? e.totalAreaM2;
  const areaImplausivel = area != null && (area < 10 || area > 100000);
  if (areaImplausivel) razoes.push(`área implausível (${area} m²)`);
  if (e.askingPrice != null && (e.askingPrice < 20000 || e.askingPrice > 100000000)) razoes.push(`preço implausível (${e.askingPrice})`);

  /* -- grau de comparável (§6): preço confiável + tamanho/tipologia + localização -- */
  const temPreco = e.askingPrice != null && e.askingPrice >= 20000 && e.askingPrice <= 100000000;
  const temTamanho = (area != null && area >= 10 && area <= 100000) || e.bedrooms != null;
  const temLocal = !!e.neighborhood;
  const comparableGrade = !isCatalogPage && !isRental && !foraDeGoiania && !areaImplausivel
    && temPreco && temTamanho && temLocal;
  if (!comparableGrade) {
    if (isCatalogPage) razoes.push("classificado como página-catálogo");
    if (!temPreco) razoes.push("sem preço confiável");
    if (!temTamanho) razoes.push("sem área nem tipologia");
    if (!temLocal) razoes.push("sem bairro");
  }

  return { completenessScore, isCatalogPage, isRental, foraDeGoiania, comparableGrade, razoes };
}
