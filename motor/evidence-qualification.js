/* Qualificação determinística de evidências antes do K3.
   O conteúdo bruto continua armazenado; apenas material útil entra na análise. */

const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

const OUTSIDE_GOIANIA = [
  "belo horizonte", "fortaleza", "goiana mg", "goiana/mg", "goianá", "goianira",
  "jundiai", "salvador", "sao jose dos pinhais", "sao paulo", "sorocaba",
];
const NON_PROPERTY = [
  "automoveis", "carros usados", "localiza seminovos", "seminovos", "veiculos usados",
];
const TRACKING_PARAMS = new Set(["fbclid", "gclid", "ref", "referrer", "source"]);

function metadataValue(metadata, ...keys) {
  for (const key of keys) if (metadata?.[key] != null) return metadata[key];
  return null;
}

export function canonicalizeEvidenceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!new Set(["http:", "https:"]).has(url.protocol)) return null;
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+/g, "/")
      .replace(/\/ordem-(?:preco-)?(?:menor|maior)\/?$/i, "/");
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || TRACKING_PARAMS.has(key.toLowerCase()) || /^(?:ordem|sort|order)$/i.test(key))
        url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

function detectContentType(url, text, metadata) {
  const quality = metadata?.quality || {};
  if (metadata?.isCatalogPage === true || quality.isCatalogPage === true) return "catalog";
  const individual = /(?:\/item\/|\/imovel\/|\/propriedad(?:e|es)\/|\/anuncio\/|\/id-\d+|[-/]\d{7,}(?:\.html)?(?:$|[/?]))/i.test(url);
  const catalogUrl = /(?:imoveis-(?:a-)?(?:venda|aluguel)|\/imoveis(?:\/|$)|\/busca\/|\/lista\/|\/lancamentos(?:\/|$)|ordem-preco)/i.test(url);
  const catalogText = /\b\d{1,5}\s+imoveis?\s+(?:a venda|para alugar|encontrados?)\b|\blista de imoveis\b|\bpagina de resultados\b/i.test(text);
  if (!individual && (catalogUrl || catalogText)) return "catalog";
  if (individual) return "individual_listing";
  return "unknown";
}

function targetTransaction(scope) {
  const value = norm(scope?.transactionType || scope?.transaction_type);
  if (value.includes("venda_ou_locacao")) return "both";
  if (value.includes("locacao") || value.includes("aluguel")) return "rent";
  if (value.includes("venda")) return "sale";
  return "any";
}

export function qualifyEvidence(item, scope = {}) {
  const metadata = item?.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const canonicalUrl = canonicalizeEvidenceUrl(item?.url);
  const text = norm(`${item?.title || ""} ${item?.excerpt || ""} ${canonicalUrl || item?.url || ""}`);
  const reasons = [];
  const contentType = detectContentType(canonicalUrl || "", text, metadata);
  const declaredCity = norm(metadataValue(metadata, "city", "municipality", "cidade", "municipio"));
  const declaredState = norm(metadataValue(metadata, "state", "uf", "estado"));
  const transaction = targetTransaction(scope);
  const saysRent = /\b(?:aluguel|alugar|locacao|para alugar)\b/.test(text);

  if (!canonicalUrl) reasons.push("invalid_url");
  if (metadata.invalidada === true || metadata.invalidated === true) reasons.push("invalidated_identity");
  if (contentType === "catalog") reasons.push("catalog_page");
  if (NON_PROPERTY.some(term => text.includes(term))) reasons.push("non_property_content");
  if ((declaredCity && declaredCity !== "goiania") || (declaredState && !new Set(["go", "goias"]).has(declaredState)))
    reasons.push("outside_target_geography");
  else if (OUTSIDE_GOIANIA.some(city => text.includes(norm(city)))) reasons.push("outside_target_geography");
  if (transaction === "sale" && saysRent && !/\b(?:venda|a venda|comprar)\b/.test(text)) reasons.push("transaction_mismatch");

  const uniqueReasons = [...new Set(reasons)];
  const usableForAnalysis = uniqueReasons.length === 0;
  const geography = uniqueReasons.includes("outside_target_geography") ? "outside" : declaredCity === "goiania" ? "in_scope" : "unknown";
  return {
    status: usableForAnalysis ? "qualified" : "rejected",
    usableForAnalysis,
    reasons: uniqueReasons,
    contentType,
    geography,
    transaction: saysRent ? "rent" : /\b(?:venda|a venda|comprar)\b/.test(text) ? "sale" : "unknown",
    score: usableForAnalysis ? contentType === "individual_listing" ? 0.95 : 0.60 : 0,
    policyVersion: "evidence-qualification-v1",
    canonicalUrl,
  };
}
