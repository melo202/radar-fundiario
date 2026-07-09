---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
plan: 01
subsystem: ui
tags: [pt-br, microcopy, gate-de-release, radar-goiania.html]

# Dependency graph
requires:
  - phase: 09-ficha-scores
    provides: "scoreOportunidade() e badge de score de 1ª camada"
  - phase: 13-motion-onboarding
    provides: "MOTION_MSG (Fase 13 MOT-01) usado como padrão de referência para A2"
provides:
  - "14-AUDITORIA.md: artefato de gate com checklist §26, glossário canônico (7 termos ratificados) e esqueleto de 11 categorias"
  - "Rótulo de score de 1ª camada sem jargão estatístico ('Oportunidade baixa' substitui 'Abaixo da mediana') em 4 âncoras (função, legenda de pinos, mapa de status, fixture)"
  - "Loading estático (#loadmsg) alinhado à capitalização de MOTION_MSG"
  - "MOTION_MSG (5 mensagens) e labels de detectMode() (8 labels) auditados e registrados como OK"
affects: [14-02, 14-03, 14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Tabela de auditoria de linguagem (string original → âncora → veredito → string final → critério §26) como artefato de gate, consolidado incrementalmente pelos planos 01-05"]

key-files:
  created:
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md"
  modified:
    - "radar-goiania.html"
    - "tests/fixtures.mjs"

key-decisions:
  - "A1: 'Abaixo da mediana' → 'Oportunidade baixa' em todas as 4 âncoras (rotulo, legenda de pinos, STATUS_LABEL, fixture) no mesmo commit, preservando thresholds e strings de porque[]"
  - "A2: #loadmsg estático alinhado à maiúscula de MOTION_MSG.cadastro ('Consultando cadastro…')"
  - "Achado A4 (colisão de 'Oportunidades' entre Caixa e Minhas oportunidades) ratificado como avaliado/mantido — distinção por ícone/contexto já suficiente"
  - "MOTION_MSG (5) e labels de detectMode (8) auditados sem alteração — já atendem §26 (Inscrição é jargão aceitável no chip técnico de confirmação)"

patterns-established:
  - "Edição de string funcional (rotulo/STATUS_LABEL) sempre acompanhada da atualização da fixture/teste correspondente no mesmo commit"

requirements-completed: [LING-01]

# Metrics
duration: 2min
completed: 2026-07-09
---

# Phase 14 Plan 01: Fundação do Gate de Linguagem Summary

**Tabela de auditoria criada com glossário canônico ratificado; jargão "mediana" eliminado do rótulo de score de 1ª camada em 4 âncoras; loading estático unificado com MOTION_MSG — 107/107 testes verdes**

## Performance

- **Duration:** 2 min (18:03:33 → 18:05:15, 2026-07-09)
- **Started:** 2026-07-09T18:03:00-03:00 (aprox.)
- **Completed:** 2026-07-09T18:05:15-03:00
- **Tasks:** 3/3 completed
- **Files modified:** 3 (1 criado, 2 modificados)

## Accomplishments
- Criado `14-AUDITORIA.md`: artefato do gate com checklist §26 (8 critérios), glossário canônico ratificando os 7 termos travados nas Fases 10/11/11.1/13, registro explícito do Achado A4 (AVALIADA, sem mudança), confirmação de 0 ocorrências residuais de "Favoritos"/"Salvos", e esqueleto de 11 seções de categoria vazias para os Planos 02-05
- A1 resolvido: jargão estatístico "Abaixo da mediana" eliminado do badge de score de 1ª camada (`scoreOportunidade`), da legenda de pinos (`#pinoLegenda`), do mapa `STATUS_LABEL` e da fixture de teste — todas as 4 âncoras trocadas por "Oportunidade baixa" no mesmo commit, thresholds (`score>=66`/`score>=33`) e strings de `porque[]` preservados intactos
- A2 resolvido: `#loadmsg` estático agora usa "Consultando cadastro…" (maiúscula), igual a `MOTION_MSG.cadastro`
- MOTION_MSG (5 mensagens) e os 8 labels de `detectMode()` (chip de confirmação da busca) auditados linha a linha e registrados na tabela — nenhuma alteração necessária, já atendem §26

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar tabela de auditoria + fixar glossário canônico** - `4540e06` (docs)
2. **Task 2: A1 — eliminar jargão "mediana" do rótulo de oportunidade** - `236c539` (fix)
3. **Task 3: A2 — unificar capitalização do loading + auditar MOTION_MSG/detectMode** - `221612d` (fix)

_Note: nenhuma task foi TDD; todas foram edição de string + verificação via `npm test`._

## Files Created/Modified
- `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md` - Artefato de gate: checklist §26, glossário canônico, seções de auditoria (Scores/Motion/Chip de busca já preenchida; demais vazias para Planos 02-05)
- `radar-goiania.html` - 4 edições de string: rótulo A1 (função + legenda + mapa de status) e loading A2
- `tests/fixtures.mjs` - `expectRotulo` atualizado para acompanhar a mudança A1 (acoplamento de teste)

## Decisions Made
- A1: usar "Oportunidade baixa" (mesmo eixo semântico dos outros dois rótulos "Boa oportunidade"/"Oportunidade média") em vez de reescrever com termos alternativos como "Preço elevado para a região" — mantém consistência de padrão entre os 3 rótulos da mesma função
- A2: alinhar a maiúscula (não a minúscula) como padrão — `MOTION_MSG` já é a referência estabelecida na Fase 13 (4 das 5 mensagens já maiúsculas)
- Não alterar labels de `detectMode()` nem MOTION_MSG — auditoria concluiu que já atendem §26 sem necessidade de edição

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `14-AUDITORIA.md` está pronto para receber as varreduras dos Planos 02 (Botões/Placeholders/Títulos-Descrições-PWA), 03 (Onboarding/O que o Radar faz/Legenda + Toasts-Erros/Estados vazios + Tooltips/aria-label), 04 (WhatsApp/Captação/Documentos-Negociação/Prédio) e 05 (consolidação final + contagem)
- Glossário canônico fixado — planos seguintes referenciam a nomenclatura já ratificada, sem redecidir nomes
- Nenhum bloqueio; suíte 100% verde (107/107) ao fim do plano

---
*Phase: 14-linguagem-impecavel-pt-br-gate-de-release*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md`
- FOUND: commit `4540e06`
- FOUND: commit `236c539`
- FOUND: commit `221612d`
