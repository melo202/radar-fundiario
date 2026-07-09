---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
plan: 05
subsystem: ui
tags: [pt-br, microcopy, gate-de-release, radar-goiania.html, documentos, negociacao, predio, gate-final]

# Dependency graph
requires:
  - phase: 14-01
    provides: "14-AUDITORIA.md (checklist §26, glossário canônico) usado como referência final de consolidação"
  - phase: 14-04
    provides: "Seções WhatsApp/Captação (RADAR_PURE) preenchidas — Plano 05 as atualiza retroativamente com a correção de concordância"
provides:
  - "14-AUDITORIA.md: gate LING-01 FECHADO — 11 seções de categoria completas, rodapé Contagem (≈287 revisadas / 30 alteradas) e Sign-off dos 8 critérios §26, todos PASS"
  - "DISCLAIMER_NEG e as 3 minutas de negociação (Proposta/Termo/Contrato) confirmadas preservadas literalmente — linguagem jurídica formal intacta"
  - "Achado transversal corrigido: helper localTxt(bairro) elimina erro de concordância de gênero ('no região' → 'na região') em 6 funções RADAR_PURE (WhatsApp/Captação/Documentos)"
  - "Prédio (analisePredicoTexto) auditado — emojis 🏢/📍 mantidos (Achado A3 ratificado)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Helper compartilhado dentro do bloco RADAR_PURE (localTxt) para concordância de gênero de fallback regional — reusa o padrão já usado por CAMPO_VAZIO/blocoAssinatura de constante/função pequena reaproveitada por múltiplas funções de template"]

key-files:
  created:
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-05-SUMMARY.md"
  modified:
    - "radar-goiania.html"
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md"

key-decisions:
  - "Achado transversal (Rule 1 — bug de concordância): o padrão \"no \"+(bairro||\"região\") produzia \"no região\" (erro de gênero, 'região' é feminino) em 6 funções RADAR_PURE (zapResumo/zapProprietario/zapComprador/captAbordagem/captScript/fichaRapidaTexto). Corrigido com um novo helper localTxt(bairro) no MESMO commit que fecha o gate de Documentos, mesmo afetando 5 âncoras já auditadas 'OK' nos Planos 01/04 — a auditoria dessas 5 foi atualizada retroativamente para refletir a correção, em vez de deixar o bug documentado como 'já revisado'"
  - "Nenhuma edição tocou substring asserida em doc.test.mjs/negocio.test.mjs/predio.test.mjs/scores.test.mjs — o branch 'sem bairro' não é exercido por nenhuma fixture (confirmado por leitura de tests/fixtures.mjs), então npm test permaneceu 107/107 verde sem qualquer alteração de teste"
  - "Prédio (resumoPredio/analisePredicoTexto/ordenaUnidades/remapPredio/ehAptoProvavel): nenhuma alteração de código — emojis 🏢/📍 mantidos (Achado A3 ratificado), assinatura e fallbacks já corretos"
  - "Contagem final da auditoria (≈287 revisadas / 30 alteradas) consolidada por soma de subtotais por categoria, com metodologia explícita documentada no rodapé da 14-AUDITORIA.md (linha de tabela = 1 ponto de revisão; dedup entre a menção de 'Oportunidade baixa' na seção Legenda e na seção Scores/Motion, mesma âncora de linha 935)"

patterns-established:
  - "Ao encontrar um bug transversal que afeta âncoras JÁ auditadas por planos anteriores, corrigir no plano atual (Rule 1) E atualizar retroativamente o veredito dessas âncoras na tabela de auditoria, em vez de deixar a tabela historicamente incorreta"

requirements-completed: [LING-01]

# Metrics
duration: 10min
completed: 2026-07-09
---

# Phase 14 Plan 05: Documentos, Negociação, Prédio e Consolidação do Gate Summary

**DISCLAIMER_NEG e as 3 minutas jurídicas confirmadas preservadas literalmente; achado transversal de concordância de gênero ("no região"→"na região") corrigido em 6 funções RADAR_PURE via novo helper localTxt; gate LING-01 fechado com 107/107 testes verdes, auditoria de 11 categorias consolidada e Sign-off dos 8 critérios §26 (todos PASS)**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2/2 completed
- **Files modified:** 2 (radar-goiania.html, 14-AUDITORIA.md)

## Accomplishments

- **Task 1 (Documentos + Negociação):** varredura de `recomendaDocumento`/`pendenciasDocumento`/`fichaRapidaTexto` (radar-goiania.html:1586-1631) e das 3 minutas de negociação `propostaTexto`/`termoExclusividadeTexto`/`contratoTexto` (1768-1901) + `DISCLAIMER_NEG` (1641) contra §26. A linguagem formal/juridicamente cuidadosa já revisada na Fase 11/11.1 estava intacta — nenhuma reescrita necessária nas cláusulas, rótulos de papel ("Proponente"/"Vendedor/Proprietário"/"Comprador"/"Corretor") ou nos disclaimers. O `DISCLAIMER_NEG` foi confirmado preservado literalmente (verificado por grep exato da string completa de 44+ palavras). Durante a leitura, foi encontrado um **achado transversal** (Rule 1 — bug de concordância de gênero): o padrão `"no "+(bairro||"região")` produzia "no região" (errado — "região" é palavra feminina, deveria ser "na região") em `fichaRapidaTexto` e em 5 outras funções RADAR_PURE já auditadas como "OK" nos Planos 01/04 (`zapResumo`, `zapProprietario`, `zapComprador`, `captAbordagem`, `captScript`). Corrigido com um novo helper `localTxt(bairro)` (`bairro ? "no "+bairro : "na região"`), aplicado nas 6 âncoras no mesmo commit — nenhuma fixture exercia o branch sem bairro, então `npm test` permaneceu 107/107 verde sem qualquer edição de teste. As tabelas de auditoria das seções WhatsApp/Captação (Planos 01/04) foram atualizadas retroativamente para refletir a correção.
- **Task 2 (Prédio + consolidação do gate):** varredura de `resumoPredio`/`ordenaUnidades`/`remapPredio`/`ehAptoProvavel`/`analisePredicoTexto` (1909-1989) — nenhuma alteração de código necessária; Achado A3 (emojis 🏢/📍) ratificado como "avaliado-mantido" (2 emojis discretos de corretor real, testados explicitamente em predio.test.mjs), assinatura "Análise gerada pelo Radar Fundiário." e fallbacks ("Edifício", "0 unidades") confirmados preservados. `leituraPratica` confirmada sem jargão (garantido por teste) e com fallback de bairro já correto ("nesta região" — contraste com o bug corrigido no Task 1). A `14-AUDITORIA.md` foi consolidada: as 11 seções de categoria (Botões, Placeholders, Títulos/PWA, Onboarding+O que o Radar faz+Legenda, Toasts/Erros+Estados vazios, Tooltips/aria-label, WhatsApp, Captação, Documentos+Negociação, Prédio, Scores/Motion/Chip de busca) confirmadas completas; rodapé "Contagem" preenchido com a soma consolidada (≈287 strings revisadas / 30 alteradas, metodologia explicitada); bloco final "Sign-off do gate §26" adicionado, com os 8 critérios do checklist marcados PASS e nota de verificação manual (leitura em voz alta das 5 mensagens de WhatsApp e das 3 minutas de documento, persona corretor/linguagem formal).

## Task Commits

Each task was committed atomically:

1. **Task 1: Documentos + Negociação — preservar disclaimers, aplicar §26 só onde ferir** - `c70d116` (fix)
2. **Task 2: Prédio + leituraPratica + consolidação do gate §26** - `7a8e9c2` (docs)

_Note: nenhuma task foi TDD; Task 1 foi correção de bug transversal (concordância de gênero) + verificação via `npm test` (sem alteração de teste — branch não coberto por fixture); Task 2 não teve edição de código (apenas auditoria/consolidação de documentação), por isso o tipo do commit é `docs`._

## Files Created/Modified

- `radar-goiania.html` - Novo helper `localTxt(bairro)` (linha ~1436); aplicado em `zapResumo`, `zapProprietario`, `zapComprador`, `captAbordagem`, `captScript` e `fichaRapidaTexto` — corrige "no região" → "na região" quando bairro está ausente
- `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md` - Seções "Documentos + Negociação" e "Prédio" preenchidas; seções "WhatsApp"/"Captação" atualizadas retroativamente (5 âncoras); rodapé "Contagem" (≈287/30) e bloco "Sign-off do gate §26" (8 critérios PASS) adicionados — gate LING-01 fechado

## Decisions Made

Ver `key-decisions` no frontmatter — resumo: achado transversal de concordância corrigido no mesmo commit que audita Documentos, com atualização retroativa das seções já fechadas por planos anteriores (em vez de deixar a auditoria historicamente incorreta); Prédio não exigiu nenhuma mudança de código; contagem final consolidada por soma de subtotais com metodologia explícita.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Erro de concordância de gênero "no região" em 6 funções RADAR_PURE**
- **Found during:** Task 1 (leitura de `fichaRapidaTexto` para auditoria de Documentos)
- **Issue:** o padrão `"no "+(bairro||"região")` produz "no região" quando `bairro` está ausente — "região" é palavra feminina em português, exigindo "na região", não "no região". O mesmo padrão existia em 5 outras funções RADAR_PURE (`zapResumo`, `zapProprietario`, `zapComprador`, `captAbordagem`, `captScript`), já auditadas como "OK" nos Planos 01/04 sem que o bug tivesse sido notado (o próprio texto de "leituraPratica", auditado no Plano 01, usa corretamente "nesta região" — mostrando que o padrão certo já existia em paralelo no mesmo arquivo).
- **Fix:** criado o helper `localTxt(bairro)` (`bairro ? "no "+bairro : "na região"`) dentro do bloco RADAR_PURE, aplicado nas 6 âncoras no mesmo commit.
- **Files modified:** `radar-goiania.html` (linhas 1436, 1440, 1460, 1471, 1507, 1516, 1626)
- **Commit:** `c70d116`

None outras — as demais seções (Documentos/Negociação/Prédio) já atendiam §26 sem necessidade de edição.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gate LING-01 **FECHADO**: `14-AUDITORIA.md` completa (11 seções + Contagem + Sign-off dos 8 critérios §26, todos PASS), `npm test` 107/107 verde.
- Nenhum disclaimer/ressalva jurídica foi enfraquecido em toda a Fase 14 — todos preservados literalmente (`DISCLAIMER_NEG`, rótulos de cláusula/papel) ou fortalecidos (correção gramatical em `zapRiscos`, Plano 04).
- Fase 14 concluída — pronta para transição (`/gsd-transition`) ao próximo milestone/fase do roadmap v2.1.

---
*Phase: 14-linguagem-impecavel-pt-br-gate-de-release*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md`
- FOUND: commit `c70d116`
- FOUND: commit `7a8e9c2`
