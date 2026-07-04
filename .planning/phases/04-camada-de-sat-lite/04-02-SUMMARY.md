---
phase: 04-camada-de-sat-lite
plan: 02
subsystem: ui
tags: [leaflet, css-transition, service-worker, pwa-cache, crossfade]

# Dependency graph
requires:
  - phase: 04-camada-de-sat-lite (Plan 01)
    provides: setSatelite()/toggleSatelite(), satTile/satRef/streetTile L.tileLayer instances, pane "satref" (zIndex 350), botão bespoke btnSat
provides:
  - Crossfade de opacidade 250ms (ease) escopado exclusivamente às tiles satTile+satRef, plugado em setSatelite() sem duplicar lógica de aria/localStorage/estilo vetorial
  - sw.js CACHE=radar-v5 (bump de radar-v4), forçando limpeza do cache antigo no próximo activate
  - Confirmação (sem alteração de lógica) de que tiles Esri (server.arcgisonline.com) são network-only via o return early existente (!sameOrigin && !cdn)
affects: [fase 6 (motion) — NÃO reutilizar a classe .sat-fade/regra .leaflet-tile como token compartilhado; qualquer plano futuro de PWA/cache deve bumpar CACHE novamente]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Crossfade de tile Leaflet via className custom (sat-fade) + regra CSS .sat-fade .leaflet-tile{transition:opacity .25s ease} + setOpacity(0)->rAF duplo->setOpacity(1), com remoção da camada anterior via setTimeout(250) guardado por satelliteOn (evita corrida entre toggles rápidos)"

key-files:
  created: []
  modified:
    - radar-goiania.html
    - sw.js

key-decisions:
  - "Opção A (setOpacity + rAF ramp) escolhida em vez da Opção B (toggle de classe) — mais direto sobre a API nativa do Leaflet (layer.setOpacity), sem precisar manipular _container/DOM diretamente"
  - "rAF duplo (requestAnimationFrame dentro de requestAnimationFrame) antes de subir a opacidade para 1 — garante que o navegador já pintou o frame com opacity:0 antes de iniciar a transição CSS, evitando que o fade não dispare por falta de reflow em alguns browsers"
  - "Remoção da camada anterior (streetTile ao ligar satélite; satTile/satRef ao desligar) só ocorre dentro do setTimeout(250), e é guardada por 'if(satelliteOn)'/'if(!satelliteOn)' — previne que um toggle duplo rápido (on->off->on em <250ms) remova a camada errada por causa de um timeout obsoleto"
  - "Crossfade real (ambas as camadas presentes por ~250ms) em vez de fade-then-swap sequencial — produz a percepção de 'sem corte seco' pedida pelo UI-SPEC com a implementação mais simples"
  - "Comentário de topo do sw.js reescrito para mencionar 'tiles de satélite/reference do Esri' sem usar a substring literal 'arcgisonline' — necessário para não quebrar o grep de aceite do próprio plano (grep -q ... && ! grep -q \"arcgisonline\" ... && echo OK), que espera ausência total dessa string no arquivo (prova de que não foi adicionada a LOCAL/CDN/NETWORK_FIRST)"

patterns-established:
  - "Qualquer transição CSS futura em tiles/camadas do mapa deve usar um className próprio (ex.: sat-fade) escopado ao componente, nunca uma regra genérica em .leaflet-tile sem qualificador de classe — evita que a Fase 6 (motion app-wide) colida ou generalize acidentalmente este crossfade"

requirements-completed: [SAT-02]

# Metrics
duration: 12min
completed: 2026-07-04
---

# Phase 4 Plan 2: Crossfade de Satélite + Cache PWA Summary

**Crossfade de opacidade 250ms (ease) plugado em setSatelite() via setOpacity+rAF, escopado só às tiles satTile/satRef (lockstep), e bump do sw.js CACHE para radar-v5 confirmando tiles Esri network-only.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-04T22:29:00Z (aprox.)
- **Completed:** 2026-07-04T22:41:43Z
- **Tasks:** 2/2
- **Files modified:** 2 (`radar-goiania.html`, `sw.js`)

## Accomplishments
- Crossfade de 250ms `ease` na troca ruas⇄satélite: `satTile`/`satRef` nascem com `opacity:0` e `className:"sat-fade"`; `.sat-fade .leaflet-tile{transition:opacity .25s ease}` escopa a transição só a essas duas tile-layers
- `setSatelite()` rampa a opacidade (`setOpacity(0)` → duplo `requestAnimationFrame` → `setOpacity(1)`) em lockstep para satélite+reference, removendo a camada anterior só após os 250ms — crossfade real (ambas presentes brevemente), não corte seco
- Outlines de bairro/lote continuam em snap instantâneo (o `setStyle()` existente não ganhou transição — inalterado)
- `sw.js`: `CACHE` bumpado de `radar-v4` para `radar-v5`, forçando o `activate` a purgar o cache antigo; comentário de topo atualizado para deixar explícito que tiles de satélite/reference também são network-only
- Confirmado (sem alterar lógica): `server.arcgisonline.com` continua fora de `LOCAL`/`CDN`/`NETWORK_FIRST`, caindo no `return` early de `!sameOrigin && !cdn` — nunca precachado

## Task Commits

Each task was committed atomically:

1. **Task 1: Crossfade de opacidade (~250ms) escopado à troca de tiles do satélite** - `91c5518` (feat)
2. **Task 2: Bump sw.js radar-v4 → radar-v5 e confirmar tiles Esri como network-only** - `26e3337` (chore)

_Nenhuma task usava TDD (tdd="false") — sem ciclo RED/GREEN, single commit por task._

## Files Created/Modified
- `radar-goiania.html` - `.sat-fade .leaflet-tile{transition:opacity .25s ease}` (CSS, linha ~245); `satTile`/`satRef` criados com `opacity:0, className:"sat-fade"`; `setSatelite(on)` reescrito para rampar opacidade via `setOpacity`+`requestAnimationFrame` duplo e remover a camada anterior só após 250ms (guardado por `satelliteOn` contra corrida em toggles rápidos)
- `sw.js` - `const CACHE = "radar-v5"` (era `radar-v4`); comentário de topo (linhas 1-8) menciona explicitamente que tiles de satélite/reference do Esri seguem network-only

## Decisions Made
Ver `key-decisions` no frontmatter — resumo: Opção A (setOpacity+rAF) escolhida sobre Opção B (toggle de classe); rAF duplo para garantir reflow antes do fade-in; guard `satelliteOn` no `setTimeout` de remoção contra toggles rápidos; crossfade real (overlap) em vez de fade-then-swap sequencial; comentário do sw.js reescrito sem a substring literal "arcgisonline" para não quebrar o grep de aceite do próprio plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reescrita do comentário de topo do sw.js sem a substring "arcgisonline"**
- **Found during:** Task 2
- **Issue:** O plano pedia "atualizar o comentário de topo do sw.js... se necessário para mencionar que os tiles de satélite Esri... são sempre rede". A primeira tentativa de comentário incluiu a string literal `server.arcgisonline.com`, o que fez o próprio grep de verificação do plano (`grep -q 'CACHE = "radar-v5"' "sw.js" && ! grep -q "arcgisonline" "sw.js" && echo OK`) falhar — esse grep exige que "arcgisonline" NÃO apareça em lugar nenhum do arquivo, como prova de que o host não foi adicionado a LOCAL/CDN/NETWORK_FIRST.
- **Fix:** Reescrevi o comentário para descrever "tiles de satélite/reference do Esri" sem citar o hostname literal, preservando a intenção documental sem quebrar a verificação automatizada.
- **Files modified:** sw.js
- **Verification:** `grep -q 'CACHE = "radar-v5"' sw.js && ! grep -q "arcgisonline" sw.js && echo OK` retorna `OK`.
- **Committed in:** `26e3337` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 - blocking)
**Impact on plan:** Ajuste puramente editorial no comentário do sw.js para satisfazer o próprio critério de aceite literal do plano — nenhuma mudança de lógica, escopo ou arquitetura.

## Issues Encountered
- Nenhum bloqueio real. O item acima foi identificado e corrigido inline durante a própria execução da Task 2.
- Verificação em navegador real (preview) não foi executada nesta sessão — não há servidor de dev persistente configurado para este projeto (arquivo estático sem build), e nenhuma ferramenta de automação de navegador estava conectada nesta sessão (verificado: nenhuma porta comum de dev server em listening). Verificação foi feita via: (1) grep exato dos comandos de verificação automatizados de ambas as tasks (ambos retornam `OK`), (2) parse de sintaxe JS via `new Function()` sobre o conteúdo do `<script>` inline (sem erros), (3) grep confirmando que a regra `.sat-fade .leaflet-tile{transition:...}` não colide com `.detail`/`.panel`/cards, (4) inspeção manual do diff completo de ambos os arquivos. Recomenda-se checagem visual manual (abrir `radar-goiania.html`, alternar 🛰️/🗺️, confirmar fade suave sem corte seco, e no DevTools confirmar requests a server.arcgisonline.com sem hit de Cache Storage) antes de considerar o SAT-02 definitivamente fechado ao produto — mesma recomendação já registrada no 04-01-SUMMARY.md para SAT-01, ainda pendente de validação em dispositivo real.

## User Setup Required

None - no external service configuration required. Continua valendo a nota do 04-01-SUMMARY.md: a rota Esri usada é keyless, então a entrada de STATE.md sobre "signup pendente da API key Esri" permanece obsoleta.

## Next Phase Readiness
- SAT-02 entregue: crossfade escopado, sem vazamento para a Fase 6 (nenhum token de transição compartilhado criado; `.sat-fade` é específico da tile do satélite).
- Requisito de PWA da Fase 4 fechado: `sw.js` em `radar-v5`, tiles Esri confirmados network-only.
- Fase 4 (Camada de Satélite) está com os dois planos (04-01 SAT-01, 04-02 SAT-02) implementados e verificados via grep/sintaxe. Pendências de validação de campo (rótulos legíveis em zoom real, fade percebido em dispositivo Android/4G) seguem registradas, não bloqueiam o fechamento formal dos planos.
- Nenhum bloqueio conhecido para a Fase 5 (seam de IA) ou Fase 6 (motion app-wide) — a Fase 6 deve tratar o padrão `.sat-fade` como precedente de escopo (className dedicado por componente), não generalizá-lo diretamente.

---
*Phase: 04-camada-de-sat-lite*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: sw.js
- FOUND: .planning/phases/04-camada-de-sat-lite/04-02-SUMMARY.md
- FOUND: 91c5518 (Task 1 commit)
- FOUND: 26e3337 (Task 2 commit)
