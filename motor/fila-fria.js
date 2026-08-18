/* FILA-01 (P1.5 do roadmap de 18/08/2026): o caminho frio do /motor/mercado gasta cota
   do buscador (plano free: 1 req/s) e leva ~3 min por pesquisa (frio real medido em
   20/07: 178s, raspando o timeout do front). Sem fila, dois cliques simultâneos:
   - na MESMA busca: disparavam a coleta em dobro — cota queimada e inserts duplicados;
   - em buscas DIFERENTES: quebravam juntos o ritmo de 1 req/s do buscador (429 lá fora)
     e se atolavam no pool pg (max 5 conexões).
   A fila garante três coisas, sem classe e sem dependência (padrão da casa):
   1. single-flight: o 2º clique na mesma chave recebe a MESMA promise — coleta única;
   2. concorrência 1: chaves diferentes esperam a vez (1 executando + 1 na espera);
   3. honestidade: do 3º pedido simultâneo em diante, 429 com motivo claro em vez de
      pendurar o front até o timeout de 240s. Esperar 1 vaga aquece a PRÓPRIA busca do
      corretor: quando ele tenta de novo, o cache de 26h responde na hora.
   O singleton vive no escopo do módulo mercado-aovivo.js: as duas entradas do processo
   da API (rota /motor/mercado e os-core) dividem a mesma fila. O aquecedor noturno
   (mercado-aquecer.js) roda em processo próprio e sequencial — não precisa da fila. */
export function criaFilaFria({ maxFila = 2 } = {}) {
  let cadeia = Promise.resolve(); /* corrente que serializa a fase fria: 1 por vez */
  let dentro = 0;                 /* executando + esperando — nunca passa de maxFila */
  const porChave = new Map();     /* chave da pesquisa -> promise em voo */

  async function executar(chave, fn) {
    const emAndamento = porChave.get(chave);
    if (emAndamento) return emAndamento; /* clique duplicado divide o mesmo trabalho */
    if (dentro >= maxFila) {
      /* 429 (não 503): o servidor devolve a MENSAGEM do erro abaixo de 500; a partir
         de 500 ela vira "erro interno" genérico e o corretor perde o motivo real. */
      const e = new Error("Busca ao vivo ocupada — outra pesquisa está em andamento. Tente em instantes.");
      e.status = 429;
      throw e;
    }
    /* tudo até o await é síncrono: dois cliques no mesmo tick ainda caem no
       single-flight, porque porChave.set acontece antes de qualquer suspensão */
    dentro++;
    const execucao = cadeia.then(() => fn());
    porChave.set(chave, execucao);
    cadeia = execucao.catch(() => {}); /* uma busca que falha nunca tranca a fila */
    try {
      return await execucao;
    } finally {
      dentro--;
      porChave.delete(chave);
    }
  }

  return { executar };
}
