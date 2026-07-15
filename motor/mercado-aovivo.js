/* Avaliação AO VIVO (pedido do usuário 15/07: "quando eu clicar em analisar tem que
   disparar e procurar nos sites"): o clique dispara uma ingestão sob demanda nos portais
   para o bairro+tipo do imóvel e SÓ ENTÃO avalia. Honestidade e cota:
   - não raspamos os portais direto (termos de uso) — buscamos o índice público (Brave)
     com site:zap/viva/olx, como uma pessoa pesquisaria;
   - CACHE de 6 h por bairro+tipo: o 2º clique no mesmo lugar não gasta busca de novo;
   - extração limitada (teto) e remota (rápida) para o clique não travar; o resto fica
     para a varredura noturna. */
import { pool } from "./db.js";
import { ingerir } from "./ingerir.js";
import { normalizaBairro } from "./estatistica.js";

const PORTAIS_AOVIVO = ["zapimoveis.com.br", "vivareal.com.br", "olx.com.br"];
const CACHE_H = 6;
const TETO_EXTRACAO = 10; /* por clique, somando os portais */

export async function avaliarAoVivo(subject) {
  const bairro = subject.neighborhood, tipo = subject.propertyType;
  if (!bairro || !tipo) { const e = new Error("subject precisa de neighborhood e propertyType"); e.status = 400; throw e; }
  const chave = `${normalizaBairro(bairro)}|${tipo}`;

  const recente = await pool.query(
    "SELECT max(created_at) AS quando FROM audit_log WHERE action='mercado-aovivo' AND entity_id=$1", [chave]);
  const q = recente.rows[0].quando;
  const fresco = q && (Date.now() - new Date(q).getTime()) < CACHE_H * 3600 * 1000;

  let ingestao = null;
  if (!fresco) {
    ingestao = { portais: 0, novos: 0, comparaveis: 0, extraidos: 0 };
    let restante = TETO_EXTRACAO;
    for (const portal of PORTAIS_AOVIVO) {
      if (restante <= 0) break;
      const consulta = `"R$" ${tipo} ${bairro} goiania venda m2 site:${portal}`;
      try {
        const s = await ingerir({ consulta, paginas: 1, tier: "fast", maxExtrair: restante });
        ingestao.portais++; ingestao.novos += s.novos; ingestao.comparaveis += s.comparaveis;
        ingestao.extraidos += s.extraidos; restante -= s.extraidos;
      } catch { /* um portal falhar não aborta os outros */ }
    }
    await pool.query(
      "INSERT INTO audit_log (entity, entity_id, action, detail) VALUES ('mercado',$1,'mercado-aovivo',$2)",
      [chave, JSON.stringify(ingestao)]).catch(() => {});
  }

  const { avaliar } = await import("./avaliacao.js");
  const resultado = await avaliar(subject);
  return { ...resultado, aoVivo: { buscou: !fresco, cacheHoras: CACHE_H, ...(ingestao || {}) } };
}
