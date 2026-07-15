/* Varredura automática (fonte A em regime): percorre os principais bairros de Goiânia
   com a consulta enviesada para preço que mediu 44% de comparáveis. Orçamento de cota:
   1 busca/bairro/noite (20/noite ≈ 600/mês, dentro das 2.000 da Brave free; 1 req/s
   respeitado pelo ingerir). A tipologia alterna por dia (par=apartamento, ímpar=casa)
   para cobrir o mercado vertical e o horizontal ao longo da semana. Reingestão de
   resultado já visto não gasta IA (dedup por hash pula a extração). */
import { pool } from "./db.js";
import { ingerir } from "./ingerir.js";

/* Maiores bairros do cadastro (ROADMAP §0) + eixos de mercado consolidados. */
export const BAIRROS_PADRAO = [
  "setor bueno", "setor oeste", "jardim goias", "setor marista", "jardim america",
  "setor sul", "alto da gloria", "setor pedro ludovico", "parque amazonia", "nova suica",
  "jardim europa", "setor coimbra", "setor aeroporto", "campinas", "vila nova",
  "serrinha", "cidade jardim", "goiania 2", "jardim atlantico", "setor leste universitario",
];

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

/* Multi-portal (pedido do usuário 15/07: "puxar em vários sites"): a cada noite a
   varredura mira UM portal com site: (roda a lista ao longo da semana) e uma noite é
   genérica — mesma cota de 20 buscas/noite, diversidade de fonte no mês. O dedup
   multi-sinal (§5) é quem garante que o mesmo imóvel em portais diferentes conte 1x. */
export const PORTAIS_ALVO = ["", "zapimoveis.com.br", "vivareal.com.br", "olx.com.br",
  "imovelweb.com.br", "chavesnamao.com.br", "dfimoveis.com.br"];

export async function varrer({ bairros = BAIRROS_PADRAO, paginas = 1, tier = "fast" } = {}) {
  const dia = new Date().getDate();
  const tipo = (dia % 2 === 0) ? "apartamento" : "casa";
  const portal = PORTAIS_ALVO[dia % PORTAIS_ALVO.length];
  const resumo = { tipo, portalAlvo: portal || "geral", bairros: bairros.length, encontrados: 0, novos: 0, extraidos: 0, comparaveis: 0, catalogos: 0, falhas: 0, porBairro: [] };
  for (const bairro of bairros) {
    const consulta = `"R$" ${tipo} ${bairro} goiania venda m2${portal ? ` site:${portal}` : ""}`;
    try {
      const s = await ingerir({ consulta, paginas, tier });
      resumo.encontrados += s.encontrados; resumo.novos += s.novos; resumo.extraidos += s.extraidos;
      resumo.comparaveis += s.comparaveis; resumo.catalogos += s.catalogos;
      resumo.porBairro.push({ bairro, novos: s.novos, comparaveis: s.comparaveis });
    } catch (e) {
      resumo.falhas++;
      resumo.porBairro.push({ bairro, erro: String(e.message).slice(0, 120) });
    }
    await dormir(2000); /* folga entre bairros (Brave 1 req/s + gentileza geral) */
  }
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
