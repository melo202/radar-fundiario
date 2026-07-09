---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
plan: 02
subsystem: ui
tags: [pt-br, microcopy, gate-de-release, radar-goiania.html, botoes, placeholders, pwa, onboarding]

# Dependency graph
requires:
  - phase: 14-01
    provides: "14-AUDITORIA.md (checklist §26, glossário canônico) e correção A1 (Oportunidade baixa) usados como referência de consistência para a legenda de pinos"
provides:
  - "14-AUDITORIA.md: seções Botões, Placeholders, Títulos/Descrições/PWA e Onboarding+O que o Radar faz+Legenda preenchidas com varredura completa"
  - "12 rótulos de botão de ação corrigidos para verbo de ação no infinitivo (§26.2), com 21 categorias de exceção justificada documentadas (ícone, seletor/segmented control, navegação/aba, exemplo tocável, item de lista, badge expansível)"
  - "Confirmação documentada de que 'Atenção' (legenda de pinos) é rótulo intencional de um sistema paralelo (STATUS_LABEL/statusDeUnidade) distinto do badge de score da ficha — não é inconsistência"
affects: [14-03, 14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Categorização de exceções de botão (ícone / seletor-segmented-control / navegação-aba / exemplo-tocável / item-de-lista / badge-expansível) como critério reutilizável para o restante da varredura de linguagem"]

key-files:
  created: []
  modified:
    - "radar-goiania.html"
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md"

key-decisions:
  - "12 botões substantivo-isolados corrigidos com prefixo de verbo, sempre reaproveitando um verbo já usado em outro botão do mesmo tipo de ação no app (Ver/Calcular/Copiar/Gerar) para manter consistência de vocabulário"
  - "Botões de seleção (segmented control/chips/sugestões de desambiguação), navegação (tabs/breadcrumb) e ícone-puro foram tratados como categorias EXCEÇÃO ao §26.2 (não são CTAs de ação/mutação) e documentados individualmente na auditoria, não silenciosamente ignorados"
  - "Legenda de pinos 'Atenção' mantida sem renomeação: é o rótulo tabelado e testado (tests/fixtures.mjs) do sistema STATUS_LABEL/statusDeUnidade (Fase 13), paralelo e distinto do badge scoreOportunidade da ficha — renomear seria mudança funcional (Rule 4), fora do escopo texto-apenas"
  - "manifest.json description mantida (correta quanto a §26) apesar de tecnicamente desatualizada (só cita quadra/lote) — divergência de conteúdo, não de linguagem; registrada como nota não-bloqueante"
  - "Placeholder ausente (<meta name=\"description\"> em radar-goiania.html) não foi adicionado — é metadado de SEO, não texto de UI, fora do escopo de LING-01"

patterns-established:
  - "Toda correção de verbo de botão reutiliza vocabulário já estabelecido em botão análogo do mesmo app (nunca inventa verbo novo isolado)"

requirements-completed: [LING-01]

# Metrics
duration: 12min
completed: 2026-07-09
---

# Phase 14 Plan 02: Botões, Placeholders, Títulos/PWA e Onboarding-Descoberta Summary

**Varredura completa dos 106 `<button>`, 19 placeholders e textos de PWA/onboarding de `radar-goiania.html`; 12 rótulos de botão corrigidos para verbo de ação no infinitivo (§26.2), demais categorias auditadas e justificadas — 107/107 testes verdes**

## Performance

- **Duration:** 12 min (18:04 → 18:16, 2026-07-09)
- **Started:** 2026-07-09T18:04:00-03:00 (aprox.)
- **Completed:** 2026-07-09T18:16:27-03:00
- **Tasks:** 3/3 completed
- **Files modified:** 2 (radar-goiania.html, 14-AUDITORIA.md)

## Accomplishments
- **Task 1 (Botões):** varredura de todos os 106 `<button>` de `radar-goiania.html`. Corrigidos 12 rótulos substantivo-isolados para verbo de ação: `Ver Oportunidades Caixa` (×2 âncoras — HTML estático + re-render JS), `Ver no mapa ↗`, `Calcular custos de compra`, `Copiar {resumo do imóvel/mensagem para o proprietário/mensagem para o comprador/argumento de preço/riscos e ressalvas}` (5), `Gerar {Proposta de Compra e Venda/Termo de Exclusividade/Contrato de Compra e Venda}` (3). Demais botões (~90) classificados: já corretos (verbo presente), ícone-puro (aria-label cobre o significado), seletor/segmented-control (rótulo é o próprio valor, não ação), navegação/aba (destino, não ação), exemplo tocável (texto é o valor de busca), item de lista clicável (conteúdo dinâmico), badge expansível (conteúdo já auditado na seção Scores). Contagem de `<button>` permanece 106 (nenhum removido/adicionado).
- **Task 2 (Placeholders + Títulos/PWA):** 19 placeholders auditados — todos já atendem §26 (exemplo tocável minúsculo deliberado ou instrução com verbo); nenhuma string alterada. `manifest.json`/`index.html`/`<title>` de `radar-goiania.html` revisados — todos já corretos; `manifest.json` continua JSON válido com campos funcionais (`start_url`/`scope`/`id`/`icons`) intactos.
- **Task 3 (Onboarding + O que o Radar faz + Legenda):** `ONB_CARDS` (3 cartões), `#oQueFaz` (5 itens) e `#pinoLegenda` (5 rótulos) auditados — todos já corretos (herdados da Fase 13 e do Plano 01). Investigação documentada confirmando que "Atenção" na legenda é rótulo intencional do sistema paralelo `STATUS_LABEL`/`statusDeUnidade`, não uma inconsistência com o badge "Oportunidade média" da ficha.

## Task Commits

Each task was committed atomically:

1. **Task 1: Varredura de botões (verbo de ação §26.2)** - `7c22a31` (fix)
2. **Task 2: Varredura de placeholders + títulos/descrições/PWA** - `34b8552` (docs)
3. **Task 3: Varredura de onboarding + O que o Radar faz + legenda de pinos** - `2e3fed6` (docs)

_Note: nenhuma task foi TDD; Task 1 foi edição de string + verificação via `npm test`; Tasks 2 e 3 foram varredura/auditoria pura, sem mudança de código (todas as strings avaliadas já atendiam §26)._

## Files Created/Modified
- `radar-goiania.html` - 12 correções de rótulo de botão (verbo de ação adicionado), todas mudança mínima preservando ícone/glifo/classe/onclick
- `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md` - Seções "Botões" (alteradas + já corretas + exceções categorizadas), "Placeholders", "Títulos/Descrições/PWA" e "Onboarding + O que o Radar faz + Legenda" preenchidas

## Decisions Made
- Ver `key-decisions` no frontmatter — resumo: reaproveitar vocabulário existente ao corrigir verbo; tratar seletores/navegação/ícones como exceção documentada (não como falha); não renomear "Atenção" na legenda (mudança funcional fora de escopo); manter `manifest.json description` e não adicionar `<meta name="description">` (fora do escopo de linguagem)

## Deviations from Plan

None - plan executed exactly as written. As três tasks seguiram a varredura sistemática planejada; a única "descoberta" (o sistema paralelo STATUS_LABEL vs scoreOportunidade) já era esperada pelo próprio Task 3 ("apenas confirmar consistência") e foi resolvida como confirmação documentada, não como correção de bug.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `14-AUDITORIA.md` pronta para receber as varreduras dos Planos 03 (Toasts/Erros + Estados vazios + Tooltips/aria-label), 04 (WhatsApp/Captação/Documentos-Negociação/Prédio) e 05 (consolidação final + contagem)
- Categorização de exceções de botão (ícone/seletor/navegação/exemplo-tocável/item-de-lista/badge-expansível) estabelecida nesta plano pode ser reaproveitada pelos Planos 03/04 ao encontrarem botões similares fora do escopo desta varredura
- Nenhum bloqueio; suíte 100% verde (107/107) ao fim do plano; `grep -n "<button" radar-goiania.html` = 106 preservado

---
*Phase: 14-linguagem-impecavel-pt-br-gate-de-release*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-02-SUMMARY.md`
- FOUND: commit `7c22a31`
- FOUND: commit `34b8552`
- FOUND: commit `2e3fed6`
