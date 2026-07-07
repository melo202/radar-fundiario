---
phase: 09-ficha-conclusao-comercial-scores
plan: 02
subsystem: ui
tags: [ficha, accordion, lei-da-tela, css, showdetail, scores]

# Dependency graph
requires:
  - phase: 09-ficha-conclusao-comercial-scores (plan 01)
    provides: "scoreOportunidade/scoreConfianca/leituraPratica puras dentro do bloco RADAR_PURE, testadas por tests/scores.test.mjs"
provides:
  - "#detail reordenado (HTML estatico) top->bottom: identificacao -> dvalor -> dscores -> dleitura -> lei da tela (dActsPrim+maisopcoes/dActsMore) -> dcomps -> accordion Dados tecnicos -> accordion Metodologia e fontes"
  - "renderScoresInto(op,conf) — funcao extraida com nome/assinatura obrigatorios, contrato duro consumido pela Wave 3"
  - "toggleScoreWhy(btn) — toggle do 'por que' de cada score, aria-expanded no proprio botao, sem estado global"
  - "atualizarScores(a) — stub documentado, corpo a implementar na Wave 3 (09-03)"
  - "showDetail() reescrito para popular a ordem nova chamando scoreConfianca/scoreOportunidade/leituraPratica com os inputs corretos"
affects: [09-03-comparaveis-conclusao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Score buttons renderizados via innerHTML por uma unica funcao renderScoresInto(op,conf), chamada tanto por showDetail() quanto (Wave 3) por atualizarScores() — evita duplicacao de template entre a abertura inicial da ficha e a atualizacao pos-compare()"
    - "'Por que' expansivel via aria-expanded no proprio <button>, elemento .score-why e o nextElementSibling no DOM — zero estado global, mesmo padrao ja usado no arquivo para outros toggles"
    - "Accordions novos (.dtecnico, .dmetodologia, .maisopcoes) reusam 100% o CSS existente de .foot/<details> (recolhidos por padrao); regra compartilhada [open]>summary::before ja existia no .foot e foi replicada 1x para .maisopcoes"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "CSS morto .dlaudo/.laudobtn/.custosbtn removido (nao apenas deixado morto) apos confirmar por grep que nenhum HTML mais referencia essas classes — os 2 botoes foram absorvidos pela Lei da Tela (laudobtn -> primaria em #dActsPrim, custosbtn -> opcao em #dActsMore)"
  - "Link do Google Maps perdeu a classe 'primary' (agora vive dentro de #dActsMore, sem destaque visual) — unica primaria da ficha e 'Gerar documento', conforme a Lei da Tela"
  - "REDUCE (variavel de prefers-reduced-motion ja existente no arquivo) foi usada no scroll de 'Ver comparaveis' em vez de inventar um nome 'motionOk' novo — plan permitia usar o nome existente"
  - "scoreOportunidade(myPm2,null,{}) e scoreConfianca({...,nComps:0,...}) chamados exatamente como especificado — scoreOportunidade retorna null pre-compare(), scoreConfianca calcula so com dados sem rede"

patterns-established:
  - "Containers de ficha vazios no HTML estatico (dValor/dScores/dLeitura/dActsPrim/dActsMore/dMetodologia), populados 100% via showDetail() — mesmo padrao ja usado para dGrid/dNote/dComps"

requirements-completed: [FICHA-01]

# Metrics
duration: 35min
completed: 2026-07-07
---

# Phase 9 Plan 02: Ficha Reordenada Conclusão-Comercial-Primeiro Summary

**`#detail` reescrito top→bottom (faixa de valor → scores → leitura prática → 1 ação primária + 2 secundárias + Mais opções → comparáveis → dados técnicos/metodologia em accordion), `showDetail()` reescrito para chamar as 3 funções puras de score/leitura da Wave 1 e popular a ordem nova, com `renderScoresInto(op,conf)` extraída como contrato duro para a Wave 3.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-07
- **Tasks:** 2
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments
- `#detail` (linha 664) reordenado: `dTag`/`dAddr`/`dInsc` (identificação, inalterados) → `#dValor` (linha 674, faixa de valor em destaque) → `#dScores` (linha 676) → `#dLeitura` (linha 678) → `#dActsPrim` + `<details class="maisopcoes">` com `#dActsMore` (linhas 680-685) → `#dComps` (linha 687) → `<details class="foot dtecnico">` com `#dGrid`+`#dNote` (linhas 688-695) → `<details class="foot dmetodologia">` com `#dMetodologia` (linhas 696-701)
- CSS novo: `.dvalor`/`.dvalor-k`/`.dvalor-v`/`.dvalor-m`, `.dscores`/`.score`/`.score-op`/`.conf-*`/`.score-num`/`.score-lbl`/`.score-chev`/`.score-why`, `.dleitura`, `.maisopcoes` — 100% reuso de variáveis (`--paper`, `--ink`, `--line`, `--muted`, `--accent`, `--lot`, `--gold`, `#7d621f`) já existentes, zero hex novo
- `function renderScoresInto(op,conf)` (linha 2049) extraída com o nome/assinatura exatos exigidos pelo plan-check — renderiza os 2 `<button class="score">` de oportunidade/confiança, incluindo o estado "Sem base para estimar" (sem número) quando `op` é `null`
- `function toggleScoreWhy(btn)` (linha 2071) — alterna `aria-expanded`/`hidden` do "por quê" ao clicar/Enter/Space no `.score` (elemento seguinte no DOM, sem estado global)
- `function atualizarScores(a)` (linha 2081) criada como stub documentado — contrato para a Wave 3 (09-03) implementar o corpo (ver seção "Contrato para a Wave 3" abaixo)
- `showDetail(a,ll)` (linha 2084) reescrito: popula `#dValor` (via `mercadoEstimado()`, com fallback honesto "Sem base para estimar"), calcula `myPm2`/`areaOk`/`venalOk`/`atipico` e chama `scoreConfianca({areaOk,nComps:0,atipico,venalOk})` + `scoreOportunidade(myPm2,null,{})`, chama `renderScoresInto(op,conf)`, popula `#dLeitura` via `leituraPratica(...)`, popula `#dActsPrim` (1 primária + 2 secundárias) e `#dActsMore` (custos/CND/copiar link/mapas), mantém `#dGrid`/`#dNote`/`#dComps` com o mesmo cálculo de antes (agora dentro do accordion), popula `#dMetodologia` com texto estático
- CSS morto `.dlaudo`/`.laudobtn`/`.custosbtn` removido (confirmado por grep sem nenhuma referência restante no HTML, após os 2 botões serem absorvidos pela Lei da Tela)
- `node --test "tests/*.test.mjs"`: **34 tests, 34 pass, 0 fail** (nenhuma função pura tocada, mesmo resultado da Wave 1)

## Task Commits

Each task was committed atomically:

1. **Task 1: Reordenar #detail no HTML + CSS novo** - `28db936` (feat)
2. **Task 2: Reescrever showDetail() para popular a ordem nova** - `55c78b9` (feat, inclui remoção do CSS morto `.dlaudo`/`.laudobtn`/`.custosbtn`)

## Files Created/Modified
- `radar-goiania.html` - `#detail` reordenado (linhas 664-702); CSS novo `.dvalor`/`.dscores`/`.score`/`.dleitura`/`.maisopcoes` (linhas ~250-286); `showDetail()` reescrito (linha 2084) + `renderScoresInto`/`toggleScoreWhy`/`atualizarScores` novas (linhas 2049-2083); CSS morto `.dlaudo`/`.laudobtn`/`.custosbtn` removido

## Contrato exato para a Wave 3 (09-03)

**`function atualizarScores(a)`** (linha 2081) — assinatura fixa, corpo atualmente vazio (só comentário). A Wave 3 deve implementar dentro dela:
1. Recuperar as `stats` de vizinhança já computadas por `compare()`/`getComps()` (o `DCUR.__compsStats` ou equivalente mencionado no `<facts>` da plan 09-02) e o `myPm2` do imóvel atual (`DCUR`).
2. Recalcular `op = scoreOportunidade(myPm2, stats, flags)` (agora com `stats` real, não `null`) e `conf = scoreConfianca({areaOk, nComps: stats.n, atipico, venalOk})` (agora com `nComps` real).
3. Chamar `renderScoresInto(op, conf)` — **reusar literalmente esta função**, não recriar o template dos `<button class="score">`.
4. Re-renderizar `#dLeitura` com `leituraPratica({tipoImovel, bairro, oportunidade: op, confianca: conf})` — mesmos 4 campos, mesma função pura.
5. Chamar essa função ao final de `compare()`/`renderComps()`, depois que a análise de vizinhança concluir com sucesso — sem re-abrir a ficha, sem re-fetch, sem alterar `DCUR`.

`renderScoresInto(op,conf)` já está pronta e testada nesta plan — a Wave 3 só precisa chamá-la com os argumentos corretos (mesmo shape de retorno de `scoreOportunidade`/`scoreConfianca` já validado pelos testes da Wave 1).

## Lista exata dos botões da Lei da Tela

**`#dActsPrim`** (sempre visível, 3 elementos: 1 primária + 2 secundárias):
1. `<button class="primary" onclick="abrirLaudo()">📄 Gerar documento</button>` (primária)
2. `<button onclick="document.getElementById('dComps').scrollIntoView({behavior:REDUCE?'auto':'smooth'})">📊 Ver comparáveis</button>` (secundária 1)
3. `<button onclick="copyInsc('...')">Copiar inscrição ⧉</button>` (secundária 2)

**`#dActsMore`** (dentro de `<details class="maisopcoes">`, recolhido por padrão):
1. `<button onclick="abrirCustos()">🧮 Custos de compra (ITBI + cartório)</button>`
2. `<a href="{cnd}" target="_blank" rel="noopener" onclick="copyInsc(...)">Titular (CND) ⧉↗</a>`
3. `<button onclick="copyLink(inscUse)">Copiar link deste imóvel ⧉</button>`
4. `<a>Google Maps ↗</a>` / `<a>Street View ↗</a>` / `<a>Earth ↗</a>` (só se `ll` presente — imóvel com coordenada)

## Decisions Made
- CSS morto (`.dlaudo`/`.laudobtn`/`.custosbtn`) removido em vez de deixado — confirmado por grep sem referência restante, evitando acumular regras não usadas no arquivo.
- Link do Google Maps perdeu a classe `.primary` (fica dentro de `#dActsMore` sem destaque) — a única ação primária da ficha agora é "Gerar documento", conforme a Lei da Tela.
- Usado `REDUCE` (variável de `prefers-reduced-motion` já existente no arquivo, linha ~1018) em vez de inventar `motionOk` — o plan explicitamente permitia reusar o nome existente se `motionOk` não existisse literalmente.
- `scoreOportunidade`/`scoreConfianca`/`leituraPratica` chamados exatamente com os inputs documentados na plan (`nComps:0` pré-`compare()`, `stats:null` para oportunidade) — nenhuma reimplementação de cálculo.

## Deviations from Plan

None - plan executed exactly as written. A única ação adicional (remoção do CSS morto `.dlaudo`/`.laudobtn`/`.custosbtn`) já estava prevista explicitamente no texto da Task 1 ("PREFERÍVEL remover as classes CSS não mais usadas se confirmado — decidir na Task 2 quando os botões forem recriados com classes diferentes"), portanto não é uma deviation, é a decisão de discrição já delegada pela própria plan.

## Issues Encountered
- `node --check radar-goiania.html` continua falhando com `ERR_UNKNOWN_FILE_EXTENSION` (arquivo `.html`, não `.js`) — comportamento pré-existente documentado na 09-01-SUMMARY, não uma regressão desta plan. Validação de sintaxe feita via extração do bloco `<script>` que contém `showDetail`/`renderScoresInto` e compilação direta via `new vm.Script(...)` — compila sem erro. Um segundo bloco `<script>` isolado (módulo de IA de pesquisa de mercado, "FISICAMENTE SEPARADO do núcleo") não compila pela extração ingênua por regex — confirmado (via `git show HEAD~2`) que esse "erro" já existia antes desta plan e é um artefato da técnica de extração (provavelmente um `<script type="text/plain">` ou texto dentro de comentário), não uma falha real de sintaxe introduzida aqui. A verificação funcional real (`node --test "tests/*.test.mjs"`) passa integralmente: 34/34.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wave 3 (09-03) pode implementar `atualizarScores(a)` sem re-tocar a estrutura HTML/CSS desta plan — só precisa chamar `renderScoresInto(op,conf)` (já pronta) e popular `#dLeitura` com `leituraPratica(...)` (mesma função pura da Wave 1), no fim de `compare()`/`renderComps()`.
- `#dComps` permanece EXATAMENTE como antes desta plan (botão "Analisar vizinhança" ou re-render de cache) — Wave 3 reescreve o CONTEÚDO pós-análise (CMP-01, conclusão-primeiro), não a estrutura.
- Nenhum bloqueio identificado.

---
*Phase: 09-ficha-conclusao-comercial-scores*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/09-ficha-conclusao-comercial-scores/09-02-SUMMARY.md
- FOUND: commit 28db936 (Task 1)
- FOUND: commit 55c78b9 (Task 2)
- CONFIRMED: `node --test "tests/*.test.mjs"` — 34 tests, 34 pass, 0 fail
