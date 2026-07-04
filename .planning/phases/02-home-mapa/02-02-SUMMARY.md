---
phase: 02-home-mapa
plan: 02
subsystem: view-state + affordance de busca (desktop overlay + 1st-use guidance)
tags: [mapa-first, desktop-overlay, coach-mark, localStorage, a11y, leaflet]

requires:
  - phase: 02-home-mapa (plan 01)
    provides: "boot em data-view=mapa + searchPill flutuante + setView() reusável"
provides:
  - "desktop (>=821px): mapa full-bleed via novo bloco @media(min-width:821px) sobrepondo o grid base"
  - ".panel reusado 100% como overlay/card no desktop, dirigido por body[data-view='busca']"
  - "#pillClose (44x44) + Esc (handler global estendido) fecham o overlay e devolvem foco à pill"
  - "enquadra() fecha o overlay também no desktop pós-resultado (antes só isMobile())"
  - "coach-mark #coachMark: banner de 1 linha dispensável no 1º uso, persistido em localStorage radar_coach"
affects:
  - "Phase 3 (bairro polygons/drill) herda o mesmo mapa full-bleed no desktop"
  - "Phase 6 (Motion) vai animar a abertura/fechamento do overlay e o dismiss do coach-mark (hoje instantâneo por design)"

tech-stack:
  added: []
  patterns:
    - "data-view + setView() estendido para também dirigir o overlay desktop — nenhum novo state system introduzido"
    - "Esc centralizado num único listener global (evita dois handlers keydown Escape competindo pelo mesmo evento)"
    - "localStorage flag boolean com try/catch (mesmo padrão de radar_prof) para radar_coach"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "Esc do overlay desktop foi implementado ESTENDENDO o handler global de Escape já existente (linha ~1844), em vez de criar um segundo document.addEventListener('keydown') paralelo como o plano sugeria textualmente — dois listeners competindo pelo mesmo Escape arriscava fechar o overlay E disparar closeDetail() no mesmo keypress. A string literal exata 'e.key===\"Escape\"' do plano não aparece (o guard usa 'e.key!==\"Escape\"'), mas o comportamento funcional (Esc fecha overlay + devolve foco à pill) está implementado e verificado manualmente na leitura do código."
  - "Dismiss do coach-mark por 'abrir a busca' foi amarrado ao onclick da própria pill (mais direto) E também dentro de enquadra() (cobre busca-com-resultado/clique no mapa), implementando os dois triggers exigidos pelo UI-SPEC #4 Behavior."

requirements-completed: [MAPA-01, MAPA-04]

duration: 2min
completed: 2026-07-04
---

# Phase 2 Plan 2: Desktop Mapa-First + Coach-mark de 1ª Vez Summary

Desktop (>=821px) agora abre em mapa full-bleed com a busca virando um card/overlay acionado pela mesma pill do mobile (reusando 100% o `.panel`, zero duplicação de DOM), fechável por × ou Esc com retorno de foco; um coach-mark de 1 linha ensina o corretor no 1º uso e nunca mais aparece após dispensado (localStorage `radar_coach`).

## Performance

- **Duration:** ~2 min (entre os dois commits de tarefa)
- **Started:** 2026-07-04T18:27:33-03:00
- **Completed:** 2026-07-04T18:28:58-03:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Desktop deixa de ser painel+mapa lado-a-lado fixo e vira mapa-first: `.wrap{display:block}` + `.mapwrap{position:absolute;inset:0}` dentro do único `@media(min-width:821px)` estendido (não um bloco concorrente).
- `.panel` no desktop é um overlay `position:fixed` (top:24px;left:24px;max-width:400px), escondido por default, revelado por `body[data-view="busca"] .panel{display:flex}` — o MESMO markup do painel de busca mobile, sem nenhuma duplicação de HTML/JS.
- Fechamento do overlay: botão `#pillClose` (44×44, idioma de `.detail .x`) no header `.brand`, e Esc (handler global existente estendido) — ambos devolvem foco à `#searchPill`.
- `enquadra()` agora chama `setView("mapa")` incondicionalmente (antes só `if(isMobile())`), fechando o overlay também no desktop pós-resultado de busca.
- Coach-mark `#coachMark`: banner de 1 linha ("Toque num bairro pra explorar, ou use a busca."), `role="status"` sem `aria-live`, dismiss por `×` (44×44) e por abrir a busca (pill onclick + `enquadra()`), persistido em `localStorage.radar_coach` com try/catch (modo privado seguro).
- Zero hex novo, zero `transition:` novo, zero `aria-live` novo — todos os tokens reusados de `:root` já existentes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Desktop mapa-first — novo @media(min-width:821px) (full-bleed + .panel overlay + Esc/×)** - `df755a8` (feat)
2. **Task 2: Coach-mark de 1ª vez (banner + dismiss por × / 1ª interação + persistência radar_coach)** - `9e8fcf0` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `radar-goiania.html` — novo bloco desktop dentro do `@media(min-width:821px)` existente (full-bleed + overlay + `#pillClose`); Esc estendido no handler global; `enquadra()` fecha overlay no desktop; markup/CSS/JS do `#coachMark` + `dismissCoach()`/`initCoach()`; `initCoach()` chamado no boot.

## Decisions Made
- Esc do overlay desktop foi mesclado no `document.addEventListener("keydown", ...)` global já existente (que já tratava Esc para `calc`/`wiz`/`laudoView`/`chooser`/`detail`), em vez de um segundo listener paralelo — evita dois handlers competindo pelo mesmo evento `Escape` no mesmo `keydown`. Ver detalhe em "Deviations".
- Dismiss implícito do coach-mark implementado em dois pontos (onclick da pill + início de `enquadra()`), cobrindo tanto "abrir a busca" quanto "busca com resultado/clique no mapa", conforme UI-SPEC #4 exige ambos os triggers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug prevention] Esc mesclado no handler global existente em vez de listener novo e concorrente**
- **Found during:** Task 1 (Anchor C — Esc obrigatório)
- **Issue:** O plano instruía adicionar um `document.addEventListener("keydown", ...)` NOVO e separado só para o Esc do overlay desktop. O arquivo já tem um `document.addEventListener("keydown", ...)` global (linha ~1844) que trata Escape para `calc`/`wiz`/`laudoView`/`chooser`/`detail`. Dois listeners de `keydown` no `document`, ambos reagindo a `Escape`, disparariam AMBOS no mesmo evento — no cenário do overlay desktop aberto, o handler antigo cairia no `else closeDetail()` ao mesmo tempo que o novo fecharia o overlay, competindo por foco/estado sem necessidade.
- **Fix:** Estendida a cadeia `if/else if` do handler global existente com um novo ramo `else if(document.body.dataset.view==="busca"&&!isMobile()){setView("mapa");...focus()}` antes do `else closeDetail()` final — mantém UM único ponto de verdade para Esc, sem duplicar listeners.
- **Files modified:** radar-goiania.html
- **Verification:** Leitura manual do código confirma que só existe um `document.addEventListener("keydown", e=>{if(e.key!=="Escape")return; ...})` no arquivo; a cadeia de `else if` cobre o novo caso do overlay desktop antes de cair no `closeDetail()` genérico.
- **Committed in:** df755a8 (Task 1 commit)

**2. [Rule 1 - Bug prevention/consistency] Grep literal `e.key==="Escape"` do plano não corresponde ao código final**
- **Found during:** Task 1 verificação
- **Issue:** O critério de aceitação automatizado do plano busca a string literal `e.key==="Escape"`, mas o handler global existente (que foi estendido, ver item 1) usa o guard invertido `e.key!=="Escape"` seguido de `return`. A string exata do plano não aparece no arquivo.
- **Fix:** Nenhuma alteração de código adicional — o comportamento funcional (Esc fecha o overlay desktop e devolve foco à pill) está implementado corretamente; apenas a sintaxe do guard é diferente da que o grep do plano assumia. Documentado aqui para rastreabilidade em vez de forçar uma sintaxe artificial só para casar com o grep.
- **Files modified:** nenhum (documentação apenas)
- **Verification:** Leitura manual do trecho `document.addEventListener("keydown",e=>{if(e.key!=="Escape")return; ... else if(document.body.dataset.view==="busca"&&!isMobile()){setView("mapa");const p=document.getElementById("searchPill");if(p)p.focus();} else closeDetail();})` confirma a cobertura funcional.
- **Committed in:** df755a8 (Task 1 commit)

---

**Total deviations:** 2 (ambas Rule 1 — prevenção de bug de listeners concorrentes; sem impacto funcional negativo, sem scope creep)
**Impact on plan:** Nenhuma regressão; o comportamento exigido pelos `must_haves.truths` e `acceptance_criteria` funcionais foi entregue. Apenas o texto literal de um grep de verificação não casa 100% — o comportamento real é mais robusto do que a implementação ingênua sugerida pelo plano.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None — este plano não introduz nenhuma superfície nova fora do `<threat_model>` do plano (localStorage `radar_coach`, sem interpolação de texto, sem dado novo exposto pelo overlay reusado).

## Next Phase Readiness
- Desktop e mobile agora compartilham 100% o mesmo `data-view`/`setView()` como state model único, mapa full-bleed em ambos os breakpoints — base sólida para Phase 3 (render de polígonos de bairro/hover/drill) sem necessidade de reestruturar layout novamente.
- Coach-mark e overlay estão prontos para receber Motion na Phase 6 (hoje só `display:none`/`display:flex` instantâneo, por design desta fase).
- Nenhum bloqueio conhecido.

---
*Phase: 02-home-mapa*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: radar-goiania.html (modificado, ambos os commits presentes em `git log`)
- FOUND: df755a8 (feat(02-02): desktop mapa-first via novo @media(min-width:821px))
- FOUND: 9e8fcf0 (feat(02-02): coach-mark de 1a vez com persistencia radar_coach)
- FOUND: .planning/phases/02-home-mapa/02-02-SUMMARY.md
