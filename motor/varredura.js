/* Varredura automática (fonte A em regime): percorre os bairros de Goiânia com a
   consulta enviesada para preço que mediu 44% de comparáveis. Orçamento de cota:
   1 busca/bairro/noite (Brave free ≈ 2.000/mês; 1 req/s respeitado pelo ingerir).
   A tipologia alterna por dia (par=apartamento, ímpar=casa). Reingestão de resultado
   já visto não gasta IA (dedup por hash pula a extração).

   CIDADE INTEIRA (19/07/2026, pedido do usuário "rodar todas as regiões"): além dos
   20 fixos, uma JANELA DE ROTAÇÃO determinística percorre os 715 bairros do cadastro
   (motor/bairros-goiania-lista.json) — LOTE_ROTACAO/noite (default 20). Total ≈ 40
   buscas/noite ≈ 1.200/mês, sobrando ~800 da cota para as pesquisas ao vivo do dossiê.
   A base de preço (indice-bairro) engorda sozinha a cada noite e a revisita mantém os
   preços vivos — cobertura completa do ciclo em ~35 noites, depois recomeça. */
import { readFileSync, writeFileSync } from "node:fs";
import { pool } from "./db.js";
import { ingerir } from "./ingerir.js";

/* Status ao vivo (Sala de Máquinas, 19/07): a varredura escreve o próprio progresso num
   JSON ao lado do código — o painel admin lê e mostra a máquina trabalhando em tempo
   real. Arquivo, não banco: sobrevive a processo separado (systemd oneshot) sem
   transação, e falha de escrita nunca derruba a varredura. */
const STATUS_URL = new URL("./varredura-status.json", import.meta.url);
const escreveStatus = (s) => { try { writeFileSync(STATUS_URL, JSON.stringify(s)); } catch {} };
export function leStatus() {
  try { return JSON.parse(readFileSync(STATUS_URL, "utf-8")); } catch { return null; }
}

/* Maiores bairros do cadastro (ROADMAP §0) + eixos de mercado consolidados. */
export const BAIRROS_PADRAO = [
  "setor bueno", "setor oeste", "jardim goias", "setor marista", "jardim america",
  "setor sul", "alto da gloria", "setor pedro ludovico", "parque amazonia", "nova suica",
  "jardim europa", "setor coimbra", "setor aeroporto", "campinas", "vila nova",
  "serrinha", "cidade jardim", "goiania 2", "jardim atlantico", "setor leste universitario",
];

const normalizaConsulta = (s) => String(s).toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, " ").trim();

export function listaCidade() {
  try {
    const lista = JSON.parse(readFileSync(new URL("./bairros-goiania-lista.json", import.meta.url), "utf-8"));
    /* Set: nomes que colidem após normalizar (acento/caixa) viram UMA consulta só —
       duplicata na rotação seria busca desperdiçada da cota */
    return [...new Set(lista.map(normalizaConsulta).filter(Boolean))];
  } catch { return []; }
}

/* Janela de rotação PURA e determinística por data: sem estado em banco, sem arquivo de
   ponteiro — a mesma noite produz sempre a mesma janela (idempotente a re-execuções). */
export function janelaRotacao(lista, diaIndex, lote, fixos = BAIRROS_PADRAO) {
  const fixosSet = new Set(fixos.map(normalizaConsulta));
  const resto = lista.filter(b => !fixosSet.has(b));
  if (!resto.length || lote <= 0) return [];
  const inicio = (diaIndex * lote) % resto.length;
  const janela = [];
  for (let i = 0; i < Math.min(lote, resto.length); i++) janela.push(resto[(inicio + i) % resto.length]);
  return janela;
}

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

/* Multi-portal (pedido do usuário 15/07: "puxar em vários sites"): a cada noite a
   varredura mira UM portal com site: (roda a lista ao longo da semana) e uma noite é
   genérica — diversidade de fonte no mês. O dedup multi-sinal (§5) é quem garante que
   o mesmo imóvel em portais diferentes conte 1x. */
export const PORTAIS_ALVO = ["", "zapimoveis.com.br", "vivareal.com.br", "olx.com.br",
  "imovelweb.com.br", "chavesnamao.com.br", "dfimoveis.com.br"];

export async function varrer({ bairros = null, paginas = 1, tier = "fast", tipo = null, portal = undefined } = {}) {
  const dia = new Date().getDate();
  tipo = tipo || ((dia % 2 === 0) ? "apartamento" : "casa");
  if (!bairros) {
    const lote = Number(process.env.VARREDURA_LOTE_ROTACAO ?? 20);
    const diaIndex = Math.floor(Date.now() / 86400000);
    bairros = [...BAIRROS_PADRAO, ...janelaRotacao(listaCidade(), diaIndex, lote)];
  }
  /* portal explícito (ex.: backfill usa a busca GERAL — "" — em vez do portal do dia,
     que pode ser péssimo para o alvo: dfimoveis é DF-cêntrico); undefined = rotação */
  if (portal === undefined) portal = PORTAIS_ALVO[dia % PORTAIS_ALVO.length];
  const resumo = { tipo, portalAlvo: portal || "geral", bairros: bairros.length, encontrados: 0, novos: 0, extraidos: 0, comparaveis: 0, catalogos: 0, falhas: 0, porBairro: [] };
  const inicio = new Date().toISOString();
  let feitos = 0;
  for (const bairro of bairros) {
    escreveStatus({ rodando: true, tipo, portalAlvo: portal || "geral", inicio,
      total: bairros.length, feitos, bairroAtual: bairro,
      novos: resumo.novos, comparaveis: resumo.comparaveis });
    /* "goiania" ENTRE ASPAS (auditoria 20/07): sem aspas o Brave relaxava o termo em
       bairros de cauda e devolvia São Paulo/DF — 21% do intake era outra cidade */
    const consulta = `"R$" ${tipo} ${bairro} "goiania" venda m2${portal ? ` site:${portal}` : ""}`;
    try {
      const s = await ingerir({ consulta, paginas, tier });
      resumo.encontrados += s.encontrados; resumo.novos += s.novos; resumo.extraidos += s.extraidos;
      resumo.comparaveis += s.comparaveis; resumo.catalogos += s.catalogos;
      resumo.porBairro.push({ bairro, novos: s.novos, comparaveis: s.comparaveis });
    } catch (e) {
      resumo.falhas++;
      resumo.porBairro.push({ bairro, erro: String(e.message).slice(0, 120) });
    }
    feitos++;
    await dormir(2000); /* folga entre bairros (Brave 1 req/s + gentileza geral) */
  }
  escreveStatus({ rodando: false, tipo, portalAlvo: portal || "geral", inicio,
    fim: new Date().toISOString(), total: bairros.length, feitos,
    novos: resumo.novos, comparaveis: resumo.comparaveis, falhas: resumo.falhas });
  await pool.query(
    "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('varredura', $1, 'executada', $2)",
    [tipo, JSON.stringify(resumo)]).catch(() => {});
  return resumo;
}

/* execução direta (systemd oneshot): node varredura.js */
if (process.argv[1] && process.argv[1].endsWith("varredura.js")) {
  varrer().then(r => {
    console.log(JSON.stringify(r));
    return pool.end();
  }).catch(e => { console.error(e); process.exit(1); });
}
