# Phase 9: Ficha = Conclusão Comercial + Scores - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 2 decisões propostas, ambas aceitas

<domain>
## Phase Boundary

A ficha do imóvel (#detail) responde "quanto vale, qual a oportunidade e o que fazer" ANTES do dado técnico: identificação+localização → faixa de valor em destaque → score de oportunidade → score de confiança → leitura prática → ações → comparáveis+mapa → dados técnicos em ACCORDION → metodologia/fontes no fim. Scores 100% determinísticos e explicáveis (nunca LLM). Comparáveis viram conclusão-primeiro. NÃO inclui: WhatsApp/salvar/captação (Fase 10), documentos em 3 níveis (Fase 11), refino visual global (Fase 13).

Requirements: FICHA-01, SCORE-01, SCORE-02, LEIT-01, CMP-01.
</domain>

<decisions>
## Implementation Decisions

### Exibição do score de oportunidade (aceito)
- Número **0-100 + rótulo + "por quê"** (ex.: "78/100 · Boa oportunidade — está 8% abaixo da mediana da vizinhança"). Como o Plano UX v3 §6 exemplifica.
- Cor SÓ como reforço de status (verde/amarelo/cinza) — nunca cor sozinha (a11y); rótulo textual sempre presente.

### Ação principal da ficha nesta fase (aceito)
- **"Gerar documento"** (o laudo/wizard existente) é a ação primária; até 2 secundárias (Ver comparáveis; a existente de copiar inscrição); resto em "Mais opções".
- Re-priorização de ações acontece nas Fases 10 (WhatsApp/salvar) e 11 (docs 3 níveis) — esta fase só ESTRUTURA a lei da tela na ficha.

### Claude's Discretion
- Fórmulas dos scores: determinísticas, documentadas em comentário e em "ver metodologia":
  - **Oportunidade**: derivada da posição do R$/m² do imóvel vs mediana/quartis da vizinhança (comparáveis já computados pela ficha hoje) + fatores de ajuste documentados; sem dados suficientes → score não exibido ("sem base p/ estimar" — nunca inventa).
  - **Confiança**: alta/média/baixa por completude (área presente? nº de comparáveis ≥ N? imóvel atípico?) com frase de porquê.
- **Leitura prática**: template determinístico por REGRA (combinações de faixa/posição/liquidez proxy/uso), pt-BR impecável, sem jargão (mediana/percentil ficam em "ver metodologia").
- Accordion: dados técnicos (dgrid atual) recolhidos por padrão na ficha reordenada; navegável por teclado; sem transition nova além do padrão Motion existente.
- Zero regressão: venalTxt ("não informado"), sheet mobile (grab/backlist/scroll), z-index do satélite sob o sheet, guardas a7a4646.
</decisions>

<code_context>
## Existing Code Insights

- A ficha atual (#detail, showDetail) já computa: mercadoEstimado() (faixa lo-hi + método), comparáveis (renderComps: mediana/Q1-Q3 por raio), m2Terr/m2Edif, venalTxt. A Fase 9 REORDENA e ADICIONA scores/leitura — não recria a estimativa.
- renderComps já busca vizinhança com orçamento de requisições; CMP-01 é re-apresentação (conclusão primeiro), não nova consulta.
- Padrões a reusar: accordion nativo (details/summary como FONTES & METODOLOGIA já usa), esc() attribute-safe (contrato IN-01), aria-live para atualizações, Motion embutido p/ entrada suave (REDUCE-aware).
- Lei da tela: .acts atual da ficha vira 1 primária + 2 secundárias + "Mais opções" (colapsável).
</code_context>

<specifics>
## Specific Ideas

- Exemplo-alvo do Plano UX v3 §6: "Apartamento no Setor Bueno. Faixa estimada: R$ 690-780 mil. Oportunidade: 78/100. Confiança: média. Leitura prática: imóvel alinhado à região, com boa liquidez se área privativa e conservação confirmadas."
- Score de confiança deve citar as pendências concretas ("faltou área privativa confirmada; 6 comparáveis").
- Metodologia/fontes permanecem acessíveis mas no FIM (accordion), nunca dominando a 1ª dobra.
</specifics>

<deferred>
## Deferred Ideas

- Score de liquidez/captação (v2.2+ — precisa dado de demanda).
- Boost de potencial construtivo no score (Fase 18 — Plano Diretor).
- Ações WhatsApp/salvar/captação (Fase 10); docs 3 níveis (Fase 11); resumo de prédio (Fase 12).
</deferred>
