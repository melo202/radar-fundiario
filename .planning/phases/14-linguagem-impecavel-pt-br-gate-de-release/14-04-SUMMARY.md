---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
plan: 04
subsystem: ui
tags: [pt-br, microcopy, gate-de-release, radar-goiania.html, whatsapp, captacao, radar-pure]

# Dependency graph
requires:
  - phase: 14-01
    provides: "14-AUDITORIA.md (checklist §26, glossário canônico) usado como referência de critério para WhatsApp/Captação"
  - phase: 14-03
    provides: "Padrão de correção mínima + verificação npm test após cada edição, reaproveitado nesta varredura"
provides:
  - "14-AUDITORIA.md: seções WhatsApp (RADAR_PURE) e Captação (RADAR_PURE) preenchidas — 5 funções zap* + 4 funções capt* + oportunidadeItem/histAdd auditadas linha a linha"
  - "zapArgumento: fallback sem porque[0] deixou de expor 'score' cru e jargão 'mediana' ao cliente final"
  - "zapRiscos: corrigido erro gramatical 'não uma avaliação oficial' → 'não é uma avaliação oficial'"
  - "Confirmação de que as 4 funções de captação já atendem §26.8 (tom profissional, sem gíria/CAPS/hype) — nenhuma mudança necessária"
affects: [14-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Verificar cobertura de teste (grep nas fixtures) ANTES de editar uma substring de template — permite corrigir tom/gramática em branches não exercidos por fixture sem precisar tocar tests/templates.test.mjs"]

key-files:
  created:
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-04-SUMMARY.md"
  modified:
    - "radar-goiania.html"
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md"

key-decisions:
  - "zapArgumento (fallback sem porque[0]): removido '(score {n})' e 'mediana' do texto que vai para o WhatsApp do cliente — texto principal via porque[0] (gerado por scoreOportunidade()) não foi tocado, é conteúdo de outra função já ratificado no Plano 01 e fora do escopo desta varredura (mudança ali seria Rule 4/arquitetural, afeta múltiplos consumidores de porque[])"
  - "zapRiscos: corrigida falha gramatical (verbo 'é' ausente) sem necessidade de editar tests/templates.test.mjs — o teste usa .some() sobre 3 termos de honestidade e já passava via 'faixa estimada'"
  - "captFollowup ('Follow-up'): avaliado-mantido — anglicismo já estabelecido em 2 outras âncoras do app (label da UI + toast de confirmação); troca isolada quebraria consistência de nomenclatura (§26.7) sem ganho, e o texto é uma tarefa interna do corretor, nunca enviado ao cliente"
  - "oportunidadeItem/histAdd: marcadas N/A na auditoria de tom — são funções puras de dados (allowlist LGPD / FIFO), sem string de UI visível ao usuário"

patterns-established:
  - "Antes de editar uma string de template RADAR_PURE, confirmar se o branch específico é exercido por fixture (grep em tests/fixtures.mjs) — evita risco de quebrar asserção OR-based que 'mascara' um branch não coberto"

requirements-completed: [LING-01]

# Metrics
duration: 6min
completed: 2026-07-09
---

# Phase 14 Plan 04: WhatsApp e Captação (RADAR_PURE) Summary

**5 funções zap* e 4 funções capt* auditadas contra §26.8 (tom de corretor profissional); zapArgumento perdeu exposição de "score"/"mediana" cru ao cliente e zapRiscos ganhou o verbo "é" que faltava — 107/107 testes verdes, sem edição de teste necessária**

## Performance

- **Duration:** 6 min (aprox.)
- **Started:** 2026-07-09T22:10:00-03:00 (aprox.)
- **Completed:** 2026-07-09T22:16:00-03:00 (aprox.)
- **Tasks:** 2/2 completed
- **Files modified:** 2 (radar-goiania.html, 14-AUDITORIA.md)

## Accomplishments
- **Task 1 (WhatsApp):** varredura das 5 funções `zap*` (radar-goiania.html:1438-1501) contra §26.8. `zapArgumento` tinha um fallback (usado quando `scoreOp.porque[0]` está ausente) que expunha `(score {n})` e "mediana dos comparáveis" cru numa mensagem destinada a um cliente final leigo — corrigido para `` Está na faixa "${rotulo}" em relação aos comparáveis da região. `` sem tocar o texto principal (via `porque[0]`, gerado por `scoreOportunidade()`, já ratificado no Plano 01). `zapRiscos` tinha um erro gramatical — "não uma avaliação oficial" faltava o verbo "é" — corrigido para "não é uma avaliação oficial", alinhando com o termo de honestidade documentado em 14-RESEARCH.md. Nenhuma das duas correções tocou substring asserida em `tests/templates.test.mjs` (confirmado por leitura de `tests/fixtures.mjs`: o branch de fallback do `zapArgumento` não é exercido por nenhum fixture usado nos testes de template, e `zapRiscos` já passava via o termo "faixa estimada" da asserção `.some()`).
- **Task 2 (Captação):** varredura das 4 funções `capt*` (radar-goiania.html:1504-1537) + `oportunidadeItem`/`histAdd` (1551-1576) contra §26. Nenhuma edição necessária — `captAbordagem`, `captScript` e `captChecklist` já atendem §26.8 (tom direto, verbo de ação, sem gíria/CAPS/hype); `captFollowup` usa "Follow-up" (anglicismo), mas já é termo estabelecido em outras 2 âncoras do app (label `.captblock-lbl` e toast de confirmação) — avaliado-mantido para preservar consistência de nomenclatura (§26.7). `oportunidadeItem`/`histAdd` são funções puras de dados (allowlist LGPD/FIFO) sem string de UI — marcadas N/A.

## Task Commits

Each task was committed atomically:

1. **Task 1: WhatsApp — zapResumo/zapProprietario/zapComprador/zapArgumento/zapRiscos** - `19c7cf1` (fix)
2. **Task 2: Captação — captAbordagem/captScript/captChecklist/captFollowup + oportunidadeItem/histAdd** - `fb7887c` (docs)

_Note: nenhuma task foi TDD; Task 1 foi edição de string pontual + verificação via `npm test` (sem alteração de teste — branches editados não são cobertos por fixture); Task 2 não teve edição de código (apenas auditoria/documentação), por isso o tipo do commit é `docs`._

## Files Created/Modified
- `radar-goiania.html` - `zapArgumento` (fallback sem `porque[0]`): removida exposição crua de "score"/"mediana"; `zapRiscos`: corrigido erro gramatical ("não é uma avaliação oficial")
- `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md` - Seções "WhatsApp (RADAR_PURE)" (5 funções) e "Captação (RADAR_PURE)" (6 funções) preenchidas com veredito linha a linha

## Decisions Made
Ver `key-decisions` no frontmatter — resumo: correção do fallback do `zapArgumento` fica isolada do texto principal gerado por `scoreOportunidade()` (fora de escopo, já ratificado); correção gramatical do `zapRiscos` não exigiu tocar o teste porque a asserção usa `.some()` sobre 3 termos; `captFollowup` mantém "Follow-up" por consistência já estabelecida no app; `oportunidadeItem`/`histAdd` fora do escopo de tom (sem copy).

## Deviations from Plan

None - plan executed exactly as written. As duas correções de string (zapArgumento fallback, zapRiscos) estavam previstas na `<action>` da Task 1 ("Corrigir qualquer texto com tom robótico... acentuação errada") e não constituem desvio do escopo planejado.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `14-AUDITORIA.md` pronta para receber a consolidação final do Plano 05 (contagem N revisadas/M alteradas) — seções "Documentos + Negociação" e "Prédio" permanecem com placeholder "(a preencher — Plano 04)" pois não fazem parte do escopo de tarefas deste plano (não referenciadas em 14-04-PLAN.md `<tasks>`); serão preenchidas pelo Plano 05 ou por revisão futura
- Nenhum bloqueio; suíte 100% verde (107/107) ao fim do plano
- Padrão estabelecido (verificar cobertura de fixture antes de editar substring) disponível para o Plano 05 se encontrar situações equivalentes

---
*Phase: 14-linguagem-impecavel-pt-br-gate-de-release*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-04-SUMMARY.md`
- FOUND: commit `19c7cf1`
- FOUND: commit `fb7887c`
