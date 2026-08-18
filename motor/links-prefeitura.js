/* Kit Prefeitura (18/08/2026 — PLANO-ESPELHO-E-TITULAR, Fases 0 e 1).
   A mesma chave abre os 3 serviços oficiais: a INSCRIÇÃO IMOBILIÁRIA, que o motor
   resolve sozinho pelo ponto (lat/lon) na camada de lotes do ArcGIS público.

   O que cada serviço entrega (verificado na Carta de Serviços e nas páginas oficiais):
   - BIC ("espelho do imóvel"): Boletim de Informações Cadastrais — siptu00020a0.asp,
     que aceita GET com ?ninsc=<14 dígitos> e devolve o espelho JÁ PREENCHIDO
     (verificado ao vivo 18/08/2026 — sem captcha no GET direto).
     NÃO mostra o titular (é desenho da prefeitura, não falha nossa).
   - CND do imóvel: sccer — aceita deep-link com a inscrição (o app já usava).
     Quando POSITIVA, lista débitos mas não identifica o titular.
   - Guia do IPTU (DUAM): PortalTributos/ConsultaTributos — aceita deep-link
     ?InscricaoCadastral=<14 dígitos> (campo vem preenchido; verificado ao vivo
     18/08/2026 com render real — o antigo scarr50000f0.asp redireciona pra lá).
     A guia traz o NOME DO CONTRIBUINTE. É onde o titular
     aparece quando a CND positiva não mostra. (A dica vai na UI.)

   LGPD: aqui NÃO entra nome/CPF de ninguém — só a inscrição e os links oficiais.
   O que o corretor emitir no portal dele vira PDF arquivado (document-service),
   nunca coluna pesquisável no banco. */

/* Camada 3 "Cadastro Imobiliário" (polígonos das UNIDADES): tem nrinscr (inscrição da
   unidade) e ci (do lote). A camada 0 (Divisas de Lote) só tem ci — por isso a consulta
   é aqui. NUNCA pedir dtnascimen/campos pessoais no outFields (LGPD — ver teste). */
const CAMINHO_LOTES = "/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query";
const UPSTREAM = "https://portalmapa.goiania.go.gov.br";
/* no VPS a consulta passa pelo proxy local (cache 60 min + stale-if-error — o portalmapa
   é frágil e já ficou fora do ar); fora do servidor, cai no upstream direto */
const PROXY = process.env.ARCGIS_PROXY_URL || "http://127.0.0.1:8130/arcgis";

export const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

/* pura: "Rua T-37, 1000" → { rua, numero } — o endereço do formulário do dossiê
   guarda rua e número num campo só; o último ", <número>" separa os dois */
export function separaEndereco(address) {
  const t = String(address || "").trim();
  if (!t) return { rua: null, numero: null };
  const i = t.indexOf(",");
  if (i < 0) return { rua: t, numero: null }; /* "Av. 85" sem número: a rua É o número */
  const rua = t.slice(0, i).trim();
  const m = /(\d{1,6})/.exec(t.slice(i + 1)); /* 1º número após a vírgula; complemento fica fora */
  return { rua: rua || t, numero: m ? Number(m[1]) : null };
}

/* pura: inscrição → os 3 atalhos oficiais. Inscrições reais do cadastro têm
   6 a 15 dígitos (o app trata >10 como nrinscr de unidade, senão ci do lote);
   fora disso é lixo de entrada e a resposta honesta é null. */
export function linksPrefeitura(inscricao) {
  const d = soDigitos(inscricao);
  if (d.length < 6 || d.length > 15) return null;
  return {
    inscricao: d,
    espelhoBic: `https://www.goiania.go.gov.br/sistemas/siptu/asp/siptu00020a0.asp?ninsc=${encodeURIComponent(d)}`,
    cnd: `https://www.goiania.go.gov.br/sistemas/sccer/asp/sccer00202f0.asp?txt_nr_iptu=${encodeURIComponent(d)}`,
    guiaIptu: `https://tributos.goiania.go.gov.br/PortalTributos/ConsultaTributos?InscricaoCadastral=${encodeURIComponent(d)}`,
    dicaTitular: "CND positiva não mostra o titular — emita a guia do IPTU: o nome do contribuinte está nela.",
  };
}

/* ponto (4326) → inscrição do lote no cadastro. nrinscr (unidade) tem prioridade
   sobre ci (lote); sem as duas, o lote existe mas não abre os serviços. */
export function inscricaoDeLote(attrs) {
  const a = attrs || {};
  return soDigitos(a.nrinscr) || soDigitos(a.ci) || null;
}

export async function inscricaoPorPonto({ lat, lon }, { fetchImpl = fetch } = {}) {
  if (lat == null || lon == null) return null;
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  const qs = new URLSearchParams({
    geometry: `${lo},${la}`, geometryType: "esriGeometryPoint", inSR: "4326",
    spatialRel: "esriSpatialRelIntersects", outFields: "nrinscr,ci",
    returnGeometry: "false", f: "json",
  }).toString();
  /* proxy local primeiro (cache + stale); se ele não responder, upstream direto */
  let r = null;
  for (const base of [PROXY + CAMINHO_LOTES, UPSTREAM + CAMINHO_LOTES]) {
    try {
      r = await fetchImpl(`${base}?${qs}`, { signal: AbortSignal.timeout(15000) });
      break;
    } catch { r = null; }
  }
  if (!r || !r.ok) return null; /* upstream fora do ar = "não achei", nunca inventa */
  const d = await r.json();
  const feats = d.features || [];
  if (!feats.length) return null;
  /* um ponto pode cair em mais de uma unidade (apto + box/garagem): a 1ª abre os
     serviços e o total vai à vista para o corretor conferir quando importar */
  return { inscricao: inscricaoDeLote(feats[0].attributes), unidades: feats.length };
}

/* imóvel da carteira → kit completo ou motivo honesto.
   precisao: null = geom exata do cadastro do imóvel; senão o degrau do geocodificador
   CNEFE ("numero" / "numero-proximo" / "logradouro") — declarado na resposta. */
export async function kitPrefeitura({ geom = null, precisao = null } = {}, deps = {}) {
  if (!geom) return { ok: false, erro: "Imóvel sem endereço nem localização — preencha o endereço no dossiê e salve." };
  const achado = await inscricaoPorPonto(geom, deps).catch(() => null);
  if (!achado || !achado.inscricao) return { ok: false, erro: "O cadastro da prefeitura não devolveu a inscrição deste ponto — confira o endereço no mapa oficial." };
  return { ok: true, inscricao: achado.inscricao, unidadesNoPonto: achado.unidades,
    links: linksPrefeitura(achado.inscricao),
    fonte: "Cadastro ArcGIS público da Prefeitura de Goiânia" +
      (precisao && precisao !== "cadastro" ? ` · ponto por geocodificação CNEFE (${precisao}) — confira no mapa` : "") };
}
