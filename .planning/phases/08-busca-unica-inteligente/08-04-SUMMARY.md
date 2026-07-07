---
phase: 08-busca-unica-inteligente
plan: 04
subsystem: ui
tags: [caixa-unica, dropdown, cnefe, a11y, aria, combobox, ios]

# Dependency graph
requires:
  - phase: 08-03
    provides: "detectMode(textoBruto, combo)/extractSetor(raw, combo)/getLastBairroCode() no bloco RADAR_PURE — motor de deteccao de intencao consumido pela UI desta plan"
provides:
  - "Caixa unica (#caixaInput) como experiencia PADRAO de busca, substituindo a .moderow (3 botoes + link)"
  - "Chip de confirmacao (#detectChip, role=status aria-live=polite) tocavel — abre #correctMenu (reuso 1:1 de .moderow/.modemore)"
  - "forceMode(m) — nova API que abre o modo manualmente a partir do menu de correcao, reusa setMode()+focusFirstField()"
  - "Chips de desambiguacao (#ambigChips) para confianca baixa — nunca dispara busca automatica"
  - "Exemplos tocaveis (#exampleChips) substituindo o .empty narrativo"
  - "Setor-ultimo (localStorage) sempre visivel no chip como 'Setor · Nome (ultimo)', nunca silencioso"
  - "Dropdown unificado (#caixaList) Setor (COMBO) + Rua (CNEFE logradouros-goiania.json, lazy-load) com rotulo de tipo e navegacao por teclado"
affects: ["08-05-verificacao-a11y"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CNEFE lazy-load no primeiro focus (nao no boot) com flag de modulo (CNEFE/cnefeLoading) + token proprio (CNEFETOKEN) — mesma disciplina de SEARCHTOKEN mas dedicado, documentado inline"
    - "DOWNEV/Escape ESTENDIDOS (nao duplicados) — um unico listener global cobre .combo (setor), #caixaList, #correctMenu, #ambigChips"
    - "Correction menu reaproveita 1:1 o HTML/CSS de .moderow/.modemore com IDs novos (cAD/cBD/cQL/cIN) — setMode() atualizado para os novos IDs (mAD/mBD/mQL/mIN removidos do DOM)"
    - "Dropdown unificado mapeia 2 fontes de dados (COMBO + CNEFE) para uma forma comum {kind,label,sub,id,pos} ANTES de ordenar juntas — mesma logica de posicao do termo de filterCombo, sem 2 blocos separados"

key-files:
  created: []
  modified: [radar-goiania.html]

key-decisions:
  - "Teclado do dropdown unificado (#caixaList) DUPLICA o pequeno padrao ja usado no combo de setor (arrow up/down + aria-activedescendant) em vez de extrair uma funcao compartilhada — mesmo estilo que o app ja usa em outros combos (ex.: nao ha abstracao anterior para isso), risco de over-engineering maior que o beneficio para ~15 linhas repetidas; plan explicitamente deixava a decisao a criterio do executor"
  - "CNEFE lazy-load usa token proprio (CNEFETOKEN) em vez do SEARCHTOKEN global — evita que o carregamento do dataset de ruas (assunto ortogonal a buscas no ArcGIS) interfira/seja interferido pelo ciclo de vida de buscar()/onMapClick()/loadCi(), mantendo o SEARCHTOKEN focado exclusivamente em respostas do backend"
  - "Chip de confirmacao usa chip.textContent (nao innerHTML) — o label vem de detectMode()/getLastBairroCode(), nunca de texto livre do usuario sem normalizacao; dropdown (fonte de risco real, nomes de rua/setor) usa esc() em todo texto interpolado (T-08-11)"
  - "mIN/mAD/mBD/mQL (moderow antiga) removidos do DOM; setMode() atualizado para os novos IDs do #correctMenu (cAD/cBD/cQL/cIN) — sem isso setMode() lancaria erro ao tentar getElementById de um elemento inexistente no boot"

requirements-completed: [BUSCA-03, BUSCA-04, BUSCA-05, BUSCA-06, BUSCA-08, BUSCA-10, BUSCA-11]

# Metrics
duration: 55min
completed: 2026-07-07
---

# Phase 8 Plan 04: Caixa Única Inteligente (UI) Summary

**Caixa única substitui a moderow como busca padrão em radar-goiania.html: input único com debounce ~150ms chamando detectMode/extractSetor (08-03), chip de confirmação tocável que abre o menu de correção reaproveitando 1:1 `.moderow`/`.modemore`, chips de desambiguação para confiança baixa, chip "Setor · Nome (último)" nunca silencioso, e dropdown unificado Setor+Rua (CNEFE lazy-loaded) com navegação por teclado.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-07-07T06:00:00Z
- **Completed:** 2026-07-07T06:55:00Z
- **Tasks:** 3
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments

- `.moderow`/`.modemore`/combo dedicado (3 botões + link) substituídos pela caixa única (`#caixaInput`) como experiência PADRÃO — HTML/CSS novo mínimo (`.caixa`/`.caixa-input`/`.caixa-ic`/`.detectchip`), 100% `var(--paper/--paper-2/--ink/--line/--muted/--accent)`, zero hex novo, zero `transition:` novo
- Painéis `#needBairro`/`#paneQL`/`#paneAddr`/`#paneUnit`/`#paneBD`/`#paneIN` permanecem no DOM (ocultos por padrão) — agora usados exclusivamente pelo menu de correção manual (`forceMode`)
- `.empty` estático substituído por `#exampleChips` (4 exemplos tocáveis: "quadra 128 lote 5" / "rua portugal 582" / "sumer park" / "3020150346") — preenchem a caixa e disparam `buscar()` no mesmo toque
- Listener `input` debounced (~150ms) chama `detectMode(valor, COMBO)` e atualiza `#detectChip` (confiança alta/média) ou `#ambigChips` (confiança baixa — nunca dispara busca automática)
- `forceMode(m)` (nova função): abre o modo a partir do menu de correção (`#correctMenu`), reusa `setMode()` + preenche campos já parseados pelo último `detectMode()` + `focusFirstField()`
- `setMode()` atualizado para os novos IDs do menu de correção (`cQL`/`cAD`/`cBD`/`cIN`) — a moderow antiga (`mQL`/`mAD`/`mBD`/`mIN`) foi removida do DOM
- Setor-último (BUSCA-05) NUNCA silencioso: quando a frase não traz setor e o modo exige (`ql`/`addr`/`bd`), `getLastBairroCode()` é aplicado via `pickBairro()` e o chip sempre mostra o formato exato "... · Setor · {Nome} (último)"
- CNEFE (`logradouros-goiania.json`) lazy-loaded no primeiro `focus` do `#caixaInput`, guardado por flag de módulo (`CNEFE`/`cnefeLoading`) + token dedicado (`CNEFETOKEN`) para digitação rápida não sobrescrever estado mais novo
- `DOWNEV`/Escape ESTENDIDOS (não duplicados): o mesmo listener `pointerdown`/`touchstart` e o mesmo handler `keydown Escape` agora também fecham `#caixaList`/`#correctMenu`/`#ambigChips`
- Dropdown unificado (`#caixaList`) mistura Setor (COMBO) + Rua (CNEFE) numa lista ordenada por posição do termo (mesma lógica de `filterCombo`), rótulo de tipo (`.code`: "Setor"/"Rua"), reuso 100% de `.combo-list`/`.combo-item`/`.combo-empty` — zero CSS novo de container
- Navegação por teclado (ArrowUp/ArrowDown/Enter/Escape) no `#caixaInput` com `aria-activedescendant` sincronizado, replicando o padrão já correto do combo de setor
- `esc()` aplicado a todo texto de Setor/Rua interpolado no HTML do dropdown (mitigação T-08-11)

## Task Commits

Each task was committed atomically:

1. **Task 1: HTML/CSS da caixa unica + chip + menu de correcao + exemplos tocaveis** - `4ca5737` (feat)
2. **Task 2: Wiring — debounce+detectMode, chip/menu de correcao, desambiguacao, setor-ultimo, Esc/pointerdown estendidos** - `029a4d8` (feat)
3. **Task 3: Dropdown unificado (Setor+Rua CNEFE) com rotulo de tipo, teclado, iOS** - `28801de` (feat)

## Files Created/Modified

- `radar-goiania.html` — HTML: caixa única (`#caixaInput`/`#caixaVoz`/`#caixaClear`/`#caixaList`), chip (`#detectChip`), desambiguação (`#ambigChips`), menu de correção (`#correctMenu`/`#cIN`), exemplos tocáveis (`#exampleChips`); CSS novo mínimo (`.caixa`/`.caixa-input`/`.caixa-ic`/`.detectchip`); JS: `forceMode`, `toggleCorrectMenu`/`closeCorrectMenu`, `closeCaixaList`, `applyDetectAndSearch`, `loadCnefe`, `updateCaixaList`, `pickCaixaItem`, `caixaEnterSelect`; `setMode()` atualizado para os IDs do `#correctMenu`; `DOWNEV`/Escape estendidos

## Decisions Made

Ver `key-decisions` no frontmatter. Resumo:
- Teclado do dropdown unificado duplica (não extrai) o pequeno padrão do combo de setor — decisão explicitamente deixada ao critério do executor pelo plano; duplicação de ~15 linhas é menor risco que introduzir uma abstração nova num app sem esse padrão hoje.
- CNEFE lazy-load usa token próprio (`CNEFETOKEN`), não o `SEARCHTOKEN` global — mantém o ciclo de vida do dataset de ruas (estático, sem relação com resultados de busca) desacoplado do ciclo de vida de `buscar()`/`onMapClick()`/`loadCi()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `setMode()` referenciava IDs da moderow antiga (mAD/mBD/mQL/mIN), removidos do DOM na Task 1**
- **Found during:** Task 2
- **Issue:** A Task 1 substituiu a `.moderow` (botões `mAD`/`mBD`/`mQL`/link `mIN`) pela caixa única + `#correctMenu` (botões `cAD`/`cBD`/`cQL`/link `cIN`). `setMode()` (função preservada, chamada no boot e por `forceMode`) ainda iterava sobre os IDs antigos via `document.getElementById(id).classList...` — sem elemento no DOM, isso lançaria `TypeError` no boot (`setMode(MODE)` já é chamado na sequência de inicialização), quebrando toda a busca.
- **Fix:** `setMode()` atualizado para iterar sobre `cQL`/`cAD`/`cBD`/`cIN` (os novos IDs do `#correctMenu`), com guarda `if(!b)return` por robustez adicional.
- **Files modified:** radar-goiania.html
- **Verification:** `node --test tests/*.test.mjs` (24/24 passa, funções puras não tocadas); inspeção manual do fluxo boot → `setMode(MODE)` → sincroniza `aria-pressed` nos botões ocultos do `#correctMenu` sem erro.
- **Committed in:** 029a4d8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — consequência direta e necessária da substituição da moderow pela caixa única na Task 1; sem o fix, `setMode()` quebraria a aplicação inteira no boot)
**Impact on plan:** Nenhum além do fix em si — é o comportamento esperado do "reaproveitar `.moderow`/`.modemore` como menu de correção com IDs novos" já descrito no `<facts>` do plano; o plano não mencionou explicitamente que `setMode()` precisaria dos novos IDs, mas é consequência lógica direta da Task 1.

## Issues Encountered

- **Ambiente de execução (não relacionado ao código):** `node --check radar-goiania.html` (comando de verify literal do plano) falha no Windows/Git Bash porque o Node trata a extensão `.html` como módulo desconhecido (`ERR_UNKNOWN_FILE_EXTENSION`), independente do conteúdo do arquivo. Contornado extraindo os blocos `<script>` para arquivos `.js` temporários (via script auxiliar no diretório de scratchpad) e rodando `node --check` sobre eles individualmente — os 2 blocos de script real do app (núcleo + combobox) verificam sem erro em todas as 3 tasks. Isso é uma particularidade do ambiente de execução desta sessão, não uma falha do plano ou do código; documentado aqui para não ser confundido com um problema de sintaxe genuíno.

## User Setup Required

None — mudança 100% client-side, sem infraestrutura nova, sem variável de ambiente.

## Next Phase Readiness

- Fluxo completo idle → typing → detected (alta/média) → ambíguo → erro está implementado e testável manualmente no navegador (abrir `radar-goiania.html` local ou via `sw.js`/servidor estático).
- `08-05` (verificação de a11y) pode focar em: teste real em iPhone/Safari do `pointerdown` no `#caixaList`/`#correctMenu`/`#ambigChips` (mecanismo replicado, mas não testado em dispositivo físico nesta plan); leitura de tela (VoiceOver/NVDA) do `role="status" aria-live="polite"` no `#detectChip` a cada resultado do debounce; navegação 100% por teclado (Tab → caixa → chip → menu de correção → Enter) sem mouse.
- Pontos de a11y verificados manualmente (inspeção de código, sem dispositivo físico) para apoiar a verificação da 08-05:
  - `label for="caixaInput"` presente; `aria-describedby="detectChip"` liga o input ao chip.
  - `role="combobox" aria-expanded aria-controls="caixaList" aria-autocomplete="list"` no `#caixaInput`, sincronizado (`aria-expanded` true/false em `updateCaixaList`/`closeCaixaList`).
  - `#detectChip`: `role="status" aria-live="polite" tabindex="0"` + `aria-label` explicando a ação de toque; ativável por teclado (Enter/Space via `onkeydown` inline).
  - `#ambigChips`/`#exampleChips`: `role="group" aria-label` descritivo; cada `<button>` é nativamente focável/ativável por teclado sem trabalho extra.
  - `#correctMenu`/`#cIN`: reaproveita `.moderow`/`.modemore` — `aria-pressed` sincronizado em `setMode()`/`toggleCorrectMenu()`.
  - `#caixaList`: `role="listbox" aria-label`; itens `role="option" aria-selected id="opt-<tipo>-<code>"`; `aria-activedescendant` sincronizado no input durante navegação por seta.
  - Todo alvo novo mede ≥44px: `.caixa-input` (`min-height:44px`), `.caixa-ic` (44×44px), `.detectchip` (`min-height:44px`), `.chips button`/`.moderow button` (herdados, já ≥44px no mobile).
  - `DOWNEV` (`pointerdown`/`touchstart` conforme `window.PointerEvent`) estendido para os 3 novos widgets — mecanismo idêntico ao já usado no combo de setor, não um novo padrão.
  - `font-size:16px` mantido no `.caixa-input` (mesma regra global de antizoom iOS).
- Nenhum bloqueio identificado. A calibração de confiança MÉDIA do `detectMode` contra amostra real (pendência documentada em 08-03-SUMMARY.md) continua como item de atenção para a verificação final da fase, não bloqueia esta plan.

---
*Phase: 08-busca-unica-inteligente*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/08-busca-unica-inteligente/08-04-SUMMARY.md
- FOUND commit: 4ca5737
- FOUND commit: 029a4d8
- FOUND commit: 28801de
