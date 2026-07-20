/* Pesquisa de mercado sob demanda. O clique faz uma busca progressiva no índice
   público: começa nos portais grandes e, somente se a amostra continuar pequena,
   procura em fontes locais/adicionais. IA apenas extrai campos dos snippets; decisão,
   filtros, dedup e números continuam 100% determinísticos. */
import { pool } from "./db.js";
import { ingerir } from "./ingerir.js";
import { normalizaBairro } from "./estatistica.js";

const PORTAIS_PRINCIPAIS = ["zapimoveis.com.br", "vivareal.com.br", "olx.com.br"];
const PORTAIS_APROFUNDADOS = ["62imoveis.com.br", "imovelweb.com.br", "chavesnamao.com.br", "wimoveis.com.br"];
/* AQUEC-01 (roadmap v2 item 2.5, 20/07/2026): o cache subiu de 6h para 26h porque o
   AQUECIMENTO NOTURNO (mercado-aquecer.js, 05h15) re-coleta os subjects da carteira e
   os pedidos recentes TODA madrugada — o corretor pega dado de no máximo ~24h, sem a
   espera fria de ~3 min (medida real 20/07: 178s, raspando o timeout do front). As 26h
   (24+margem) garantem que o aquecido de ontem ainda vale quando o de hoje roda. */
const CACHE_H = 26;
const TETO_EXTRACAO_INICIAL = 6;
const TETO_EXTRACAO_TOTAL = 18;
const dormir = ms => new Promise(resolve => setTimeout(resolve, ms));

export function chaveDaPesquisa(subject) {
  /* O cache antigo era só bairro+tipo e reaproveitava a busca de um apartamento de
     60 m² para outro de 250 m². Perfil arredondado reduz gasto sem misturar buscas. */
  const area = Number(subject.areaM2);
  const faixaArea = area > 0 ? Math.max(25, Math.round(area / 25) * 25) : "sem-area";
  const quartos = subject.bedrooms == null ? "sem-quartos" : Number(subject.bedrooms);
  return `${normalizaBairro(subject.neighborhood)}|${subject.propertyType}|${faixaArea}m2|${quartos}q`;
}

function consultaPortal(subject, portal, detalhada = false) {
  const quartos = detalhada && subject.bedrooms != null ? ` ${Number(subject.bedrooms)} quartos` : "";
  const bairro = normalizaBairro(subject.neighborhood);
  /* área não entra como termo exato: buscar "84 m²" esconderia ofertas de 80/90 m².
     A faixa 75%–133% é aplicada depois, sobre todos os resultados extraídos. */
  return `site:${portal} "${bairro}" ${subject.propertyType}${quartos} venda Goiânia`;
}

function consultaGeral(subject) {
  const quartos = subject.bedrooms != null ? ` ${Number(subject.bedrooms)} quartos` : "";
  const bairro = normalizaBairro(subject.neighborhood);
  return `imóvel ${subject.propertyType} à venda "${bairro}" Goiânia${quartos}`;
}

async function executarConsulta(consulta, fonte, limite, ingestao) {
  if (limite <= 0) return;
  if (ingestao.consultas > 0) await dormir(1100); /* Brave free: 1 requisição/s */
  try {
    const s = await ingerir({ consulta, paginas: 1, tier: "fast", maxExtrair: limite });
    ingestao.consultas++;
    ingestao.fontes.push(fonte);
    ingestao.novos += s.novos;
    ingestao.comparaveis += s.comparaveis;
    ingestao.tentativasExtracao += s.tentativasExtracao || 0;
    ingestao.extraidos += s.extraidos;
    ingestao.encontrados += s.encontrados;
  } catch {
    ingestao.consultas++;
    ingestao.falhas++;
  }
}

/* opts (AQUEC-01): maxIdadeH — o aquecedor noturno passa ~20h para FORÇAR re-coleta
   diária (senão o warm de ontem, ainda "fresco" pelas 26h, pularia a coleta e o cache
   envelheceria em noites alternadas); economico — só a 1ª passagem (3 buscas), nunca o
   aprofundamento: o aquecimento cabe na cota (~540 buscas/mês p/ 6 subjects/noite). */
export async function avaliarAoVivo(subject, opts = {}) {
  const bairro = subject.neighborhood, tipo = subject.propertyType;
  if (!bairro || !tipo) { const e = new Error("subject precisa de neighborhood e propertyType"); e.status = 400; throw e; }
  const chave = chaveDaPesquisa(subject);
  const maxIdadeH = Number(opts.maxIdadeH) > 0 ? Number(opts.maxIdadeH) : CACHE_H;

  const recente = await pool.query(
    `SELECT created_at AS quando, detail FROM audit_log
     WHERE action='mercado-aovivo' AND entity_id=$1 ORDER BY created_at DESC LIMIT 1`, [chave]);
  const q = recente.rows[0]?.quando;
  const coletaAnterior = recente.rows[0]?.detail || {};
  const fresco = q && (Date.now() - new Date(q).getTime()) < maxIdadeH * 3600 * 1000;

  let ingestao = null;
  if (!fresco) {
    ingestao = { consultas: 0, fontes: [], encontrados: 0, novos: 0, comparaveis: 0, tentativasExtracao: 0,
      extraidos: 0, falhas: 0, aprofundou: false };

    /* 1ª passagem: diversidade obrigatória — no máximo 2 extrações por portal evita
       que um único site consuma todo o clique. */
    for (const portal of PORTAIS_PRINCIPAIS) {
      const restante = TETO_EXTRACAO_INICIAL - ingestao.tentativasExtracao;
      if (restante <= 0) break;
      await executarConsulta(consultaPortal(subject, portal), portal, Math.min(2, restante), ingestao);
    }

    const { avaliar } = await import("./avaliacao.js");
    const previa = await avaliar(subject, { persist: false });

    /* 2ª passagem: só gasta a cota maior se os filtros profissionais ainda não
       encontraram o mínimo. Bairros vizinhos continuam proibidos no cálculo.
       Modo econômico (AQUEC-01): o aquecedor noturno nunca aprofunda — se a amostra
       ficou curta, o clique do corretor (ao vivo, não-econômico) ainda pode aprofundar. */
    if (!opts.economico && previa.status === "amostra_insuficiente") {
      ingestao.aprofundou = true;
      for (const portal of PORTAIS_APROFUNDADOS) {
        const restante = TETO_EXTRACAO_TOTAL - ingestao.tentativasExtracao;
        if (restante <= 0) break;
        await executarConsulta(consultaPortal(subject, portal, true), portal, Math.min(2, restante), ingestao);
      }
      const restante = TETO_EXTRACAO_TOTAL - ingestao.tentativasExtracao;
      if (restante > 0) await executarConsulta(consultaGeral(subject), "busca geral", Math.min(4, restante), ingestao);
    }

    ingestao.fontes = [...new Set(ingestao.fontes)];
    const algumaConsultaFuncionou = ingestao.consultas > ingestao.falhas;
    await pool.query(
      "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('mercado',$1,$2,$3)",
      [chave, algumaConsultaFuncionou ? "mercado-aovivo" : "mercado-aovivo-falhou", JSON.stringify(ingestao)]).catch(() => {});
  }

  const pesquisa = ingestao ? {
    modo: ingestao.aprofundou ? "aprofundada" : "direta",
    fontesConsultadas: ingestao.fontes,
    consultas: ingestao.consultas,
    resultadosDoBuscador: ingestao.encontrados,
    anunciosNovos: ingestao.novos,
    extraidos: ingestao.extraidos,
    falhas: ingestao.falhas,
  } : { modo: "cache-recente", cacheHoras: CACHE_H,
    fontesConsultadas: coletaAnterior.fontes || [],
    consultas: coletaAnterior.consultas ?? null,
    resultadosDoBuscador: coletaAnterior.encontrados ?? null,
    anunciosNovos: coletaAnterior.novos ?? null,
    extraidos: coletaAnterior.extraidos ?? null,
    falhas: coletaAnterior.falhas ?? null };

  const { avaliar } = await import("./avaliacao.js");
  const resultado = await avaliar(subject, { searchSummary: pesquisa });
  return { ...resultado, aoVivo: { buscou: !fresco, cacheHoras: CACHE_H,
    ...(ingestao || {}), portais: (ingestao?.fontes || coletaAnterior.fontes || []).length } };
}
