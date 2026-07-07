# Phase 12: Prédio como Objeto Comercial - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 1 decisão proposta, aceita

<domain>
## Phase Boundary

Um prédio deixa de ser tabela longa de inscrições e vira leitura comercial: **resumo do edifício** antes da lista (nº de unidades, área média, venal médio, estimado médio, FAIXA do edifício + ações), **ordenação** (maior oportunidade / menor valor estimado / maior área), **filtros** (ocultar garagem/box já existe; aptos prováveis; buscar unidade), e **marcar unidades para comparação** (tabela lado-a-lado em sheet, até 4). NÃO inclui: refino visual global (Fase 13), scores novos (usa os da Fase 9).

Requirements: PRED-01, PRED-02.
</domain>

<decisions>
## Implementation Decisions

### Comparação lado-a-lado (aceito)
- Marcar até 4 unidades (checkbox/toggle no card) → botão "Comparar (N)" abre sheet com TABELA compacta: apto/unidade, área, venal, estimado (faixa), R$/m², score de oportunidade quando disponível. Colunas = unidades; decisão rápida.
- Limite 4 com feedback honesto ("máximo de 4 para comparar").

### Claude's Discretion
- Resumo do prédio (PRED-01): calculado client-side sobre as unidades já carregadas (zero request novo): nº unidades (excl. garagem/box por default, coerente com hideGar), área média, venal médio (só >0), estimado médio/faixa via mercadoEstimado por unidade (quando aplicável). Renderizado no lugar/acima do bldg-head atual quando ehPredio; ações: "Ver unidades" (scroll), "Gerar análise do prédio" pode ser um resumo copiável WhatsApp-style (reusa padrão zap*) — NÃO um documento novo (docs são Fases 11/11.1).
- Ordenação: chips/select acima da lista quando ehPredio (padrão: ordem atual por unidade; opções: maior oportunidade — exige stats por unidade disponíveis, computa on-demand barato com mercadoEstimado/m2 —, menor estimado, maior área). Sem re-fetch.
- Filtro "aptos prováveis": heurística determinística existente (isGarage invertido + uso residencial) — rotulado honestamente.
- Buscar unidade: reusa matchApto (campo pequeno no resumo).
- Guardas: correções mobile (lista atrás do form, scrollToResults), venalTxt, esc()/IN-01, DCUR, 44px, zero hex novo. Estado de marcação NÃO persiste (sessão da lista atual apenas).
</decisions>

<code_context>
## Existing Code Insights

- ehPredio já detectado em finish() (units.length>1 && nLotes==1); bldg-head já renderiza nome/Q/L/count — o resumo EXPANDE esse header.
- LAST/render(list)/cardHTML são a base; matchApto/isGarage existentes; mercadoEstimado(a) por unidade; __scores cache da Fase 10.
- chooser (clique no mapa) mostra unidades — a comparação também deve ser acessível dali? NÃO nesta fase (escopo: lista da busca; chooser fica pra melhoria futura se sobrar orçamento).
- Padrões: sheet .wiz-like p/ comparação OU detail-like; esc() etc.
</code_context>

<specifics>
## Specific Ideas

- Exemplo-alvo do doc §7: "Edifício Sumer Park — 26 unidades · área média 94m² · venal médio R$ 412 mil · estimado médio R$ 720 mil · faixa R$ 650-890 mil" + ações.
- "Gerar análise do prédio" = texto copiável (WhatsApp) com o resumo do edifício — padrão zap*, determinístico, testável.
</specifics>

<deferred>
## Deferred Ideas

- Comparação a partir do chooser do mapa (futuro).
- Score de prédio agregado persistente (v2.2+).
</deferred>
