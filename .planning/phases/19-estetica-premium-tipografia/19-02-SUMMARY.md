---
phase: 19-estetica-premium-tipografia
plan: 02
subsystem: ui
tags: [css, elevation, box-shadow, hover, focus, acabamento]

# Dependency graph
requires: ["19-01"]
provides:
  - "Sistema de elevação --elev-0/1/2/3 no :root (derivado de --ink, nunca preto puro)"
  - "14 box-shadow ad hoc (incl. os 4 usos da def --shadow antiga) migrados para var(--elev-N)"
  - "Acabamento premium de hover/active/focus em .card, botões primários/secundários, inputs"
  - "Divisor de alta densidade .cmp-table td/.combo-item em --grid (mais sutil que --line)"
affects: [19-03]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Elevação centralizada em 3 tokens nomeados em vez de sombra literal por componente", "Reforço duplo de foco (outline --accent herdado + borda --ink) em vez de só outline"]

key-files:
  created: []
  modified: ["radar-goiania.html"]

key-decisions:
  - "14ª substituição de var(--shadow) encontrada durante a Task 1 (.terr-legenda, linha 353 pós-edit) não estava no mapa de 13 do PLAN.md — migrada por Rule 1 (bug: gate de verificação exige zero var(--shadow) residual), mesmo padrão --elev-1 (flutuante discreto sobre o mapa) dos outros 3 usos de --shadow"
  - "'.zapfab' citado no PLAN.md/UI-SPEC não existe como seletor literal no HTML — o FAB circular com 0 2px 8px rgba(0,0,0,.25) é na verdade .cmp-fab (botão 'Comparar (N)'); migrado para --elev-1 como alvo funcional equivalente (mesma família 'flutua sobre o mapa')"
  - "'variante toast' (linha 899 do mapa do PLAN.md) é na verdade .leaflet-tooltip, não uma 2ª variante de .toast — migrado para --elev-1 de qualquer forma (mesmo valor mapeado, mesma família de elemento flutuante)"
  - ".card:hover border-color mudou de --muted para --ink (instrução explícita do PLAN.md/UI-SPEC — 'escurece a borda', mais premium/contrastante que o --muted anterior)"
  - "Secundários (.detail .acts button/a :not(.primary)) ganharam override de hover com --paper-2 por especificidade (0,4,1) — a regra genérica .detail .acts button:hover (0,3,1, fundo --ink) continua servindo de fallback/base, mas a nova regra :not(.primary) vence para os secundários por especificidade maior, sem !important"
  - ".combo-item (listado no PLAN.md entre os 'inputs') não recebeu :focus dedicado — já usa fundo --ink no :hover/.active (reforço equivalente ou mais forte que uma borda); documentado como decisão, não omissão"

requirements-completed: [PREM-01]

# Metrics
duration: ~12min
completed: 2026-07-10
---

# Phase 19 Plan 02: Elevação Consolidada + Acabamento Premium Summary

**14 box-shadow ad hoc consolidados em 3 níveis nomeados (--elev-1/2/3 + repouso --elev-0), todos derivados de --ink, e acabamento de hover/active/focus refinado em cards/botões/inputs/divisores sem introduzir nenhuma cor nova.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-10T07:06:00Z (aprox.)
- **Completed:** 2026-07-10T07:18:16Z
- **Tasks:** 2/2
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- 4 tokens `--elev-0/1/2/3` adicionados ao `:root`, com comentário explicando a derivação de `--ink` (nunca preto puro)
- 14 `box-shadow` ad hoc migrados para `var(--elev-N)` (13 do mapa do PLAN.md + 1 achado extra, `.terr-legenda`, que usava a antiga `var(--shadow)`)
- Def antiga `--shadow` removida (migrada integralmente para os 4 tokens)
- 3 exceções justificadas preservadas intactas: keyframe ring (`@keyframes bldgflash`), print none (`#laudo .lcard`), dot ring inline (legenda Caixa)
- `.card`: repouso `--elev-0`, hover ganha `--elev-1` + borda `--ink`; `box-shadow`/`border-color` entram na transição existente
- Botões primários (`.go`, `.onb-next`): `:active{transform:scale(.98)}` formalizado (era `translateY(1px)`/inexistente); transição `transform .08s ease, background .15s ease`
- Botões secundários (`.detail .acts button/a :not(.primary)`, `.moderow button`): hover ganha preenchimento sutil `--paper-2` (sem cor nova), via override de especificidade sobre a regra genérica de fundo escuro
- Inputs (`input`/`select` genéricos — cobre `#insc`/`#rua`/outros campos do form —, `.caixa-input` — cobre `#caixaInput`): foco ganha reforço de borda `--ink` (mantendo o `outline:2px solid var(--accent)` herdado de `:focus-visible`)
- Divisor de alta densidade `.cmp-table td` e `.combo-item`: `--line` → `--grid` (mais sutil, dentro da paleta existente)
- Nenhuma sombra aplicada a camada de tile/pane do Leaflet (confirmado por grep — zero ocorrências)
- Nenhum hex de cor novo introduzido (confirmado via `git diff` — único hex nas linhas adicionadas é `#fff` pré-existente em contexto não tocado)

## Task Commits

Each task was committed atomically:

1. **Task 1: Definir tokens --elev-0/1/2/3 e consolidar 14 sombras ad hoc** - `3b15674` (feat)
2. **Task 2: Acabamento — hover/active/focus, divisores, chips/inputs/botões** - `11cd51c` (feat)

**Plan metadata:** (a seguir, commit final `docs(19-02)`)

## Files Created/Modified

- `radar-goiania.html` — tokens `--elev-*` no `:root`, 14 `box-shadow` migrados, refinamento de hover/active/focus em `.card`/botões/inputs, 2 divisores em `--grid`

## Mapa de Migração de Sombras (linha pós-edição → token)

| Componente | Valor antigo | Token novo |
|---|---|---|
| `.combo-list` | `0 8px 20px rgba(20,26,31,.18)` | `--elev-2` |
| `.go` | `var(--shadow)` | `--elev-1` |
| `.cmp-fab` (citado no PLAN.md como `.zapfab`) | `0 2px 8px rgba(0,0,0,.25)` | `--elev-1` |
| `.searchpill` | `0 4px 14px rgba(20,26,31,.18)` | `--elev-1` |
| `.coachmark` | `var(--shadow)` | `--elev-1` |
| `#breadcrumb` | `0 4px 14px rgba(20,26,31,.18)` | `--elev-1` |
| `.pino-legenda` | `var(--shadow)` | `--elev-1` |
| `.terr-legenda` (achado extra, Rule 1) | `var(--shadow)` | `--elev-1` |
| `.onb-card` | `0 8px 24px rgba(20,26,31,.3)` | `--elev-3` |
| `.detail` | `0 6px 20px rgba(20,26,31,.22)` | `--elev-3` |
| `.sattoggle` | `0 4px 14px rgba(20,26,31,.18)` | `--elev-1` |
| `.toast` | `0 4px 14px rgba(0,0,0,.25)` | `--elev-1` |
| `.leaflet-tooltip` (citado no PLAN.md como "variante toast") | `0 3px 10px rgba(20,26,31,.2)` | `--elev-1` |
| `.panel` (mobile, painel de busca desktop) | `0 6px 20px rgba(20,26,31,.22)` | `--elev-3` |

## Exceções Mantidas Fora do Sistema (4, conforme PLAN.md)

| Local | Valor | Justificativa |
|---|---|---|
| `@keyframes bldgflash` | `0 0 0 3px var(--accent)` | Ring de destaque de animação, não elevação |
| `#laudo .lcard` | `box-shadow:none` | Papel impresso não tem sombra |
| Dot ring inline (legenda Caixa) | `0 0 0 2px var(--ink)` | Ring decorativo inline, não elevação |
| Def `--shadow` original | — | Migrada integralmente para os 4 tokens `--elev-*`; removida do `:root` |

## Decisions Made

Ver `key-decisions` no frontmatter. Resumo:
- 1 substituição extra de `var(--shadow)` (`.terr-legenda`) não catalogada no mapa do PLAN.md, corrigida por Rule 1 para satisfazer o gate de "zero `var(--shadow)` residual"
- Nomenclatura de 2 seletores do PLAN.md/UI-SPEC (`.zapfab`, "variante toast") não bateu 1:1 com os seletores reais do HTML (`.cmp-fab`, `.leaflet-tooltip`) — migrados pelo valor mapeado, mesma família funcional
- `.card:hover` escurece a borda para `--ink` (era `--muted`), conforme instrução explícita do UI-SPEC
- Hover de botões secundários ganhou override de especificidade (`:not(.primary)`) para não colidir com a regra genérica de fundo escuro já existente

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `.terr-legenda` usava `var(--shadow)` e não estava no mapa de 13 substituições do PLAN.md**
- **Found during:** Task 1, verificação (`grep -c 'var(--shadow)'` retornou 1 em vez de 0)
- **Issue:** O inventário de 17 `box-shadow` do PLAN.md (13 migrados + 4 exceções) não incluía a linha de `.terr-legenda` (Fase 15 TERR-02), que também usava a def antiga `var(--shadow)`. Isso quebraria o gate de verificação da Task 1 (zero `var(--shadow)` residual).
- **Fix:** Migrado para `var(--elev-1)`, mesmo padrão dos outros 3 usos de `var(--shadow)` (elemento flutuante discreto sobre o mapa).
- **Files modified:** `radar-goiania.html` (linha da regra `.terr-legenda`)
- **Verification:** `grep -c 'var(--shadow)'` → 0; `grep -c 'var(--elev-'` → 14 (13 do mapa + 1 achado); `npm test` 239/239 verde
- **Committed in:** `3b15674` (parte da Task 1, antes da verificação final)

---

**Total deviations:** 1 auto-fixed (1 sombra ad hoc não catalogada no PLAN.md, mesma família de substituição dos itens já mapeados)
**Impact on plan:** Nenhum scope creep — a correção foi necessária para o próprio gate de verificação da Task 1 (contagem zero de `var(--shadow)` residual); mesmo padrão de substituição já aprovado para os outros 3 casos idênticos.

## Issues Encountered

Nenhum bloqueio. O arquivo é grande (~7.400 linhas); leituras via `Read` com `offset`/`limit` pequenos foram necessárias (limite de 25k tokens por leitura) — não afetou o resultado, só o processo de execução.

## User Setup Required

None — mudança puramente CSS, sem configuração externa.

## Next Phase Readiness

- Sistema de elevação e acabamento prontos para o Plano 03 (verificação ao vivo, `document.fonts.check`, screenshots antes/depois, focus-trap A11Y-01)
- Nenhum bloqueio identificado — suíte 239/239 verde nos 2 commits, nenhuma cor nova, nenhuma sombra em camada de mapa, papel/óxido/radius angular intactos

---
*Phase: 19-estetica-premium-tipografia*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: 19-02-SUMMARY.md
- FOUND: 3b15674 (Task 1 commit)
- FOUND: 11cd51c (Task 2 commit)
