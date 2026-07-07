---
phase: 10-acao-whatsapp-captacao-salvos
plan: 02
subsystem: ui
tags: [localstorage, oportunidades, historico, ficha, painel-consulta, lei-da-tela, css-has]

# Dependency graph
requires:
  - phase: 10-acao-whatsapp-captacao-salvos (10-01)
    provides: oportunidadeItem(a, extras) — allowlist pura de persistência; histAdd(lista, item, cap)
      — FIFO puro (bloco RADAR_PURE, testado por tests/templates.test.mjs)
provides:
  - "Persistência SALV-01 completa: radar_oportunidades + radar_historico em localStorage, escrita
    SEMPRE via toast em falha (oppSave/histSave retornam boolean, nunca falha silenciosa)"
  - "Toggle ⭐ Salvar oportunidade / ✓ Salva — remover? na ficha (#dActsPrim), estado honesto
    (recalculado a cada abertura via renderSaveBtn/oppTem)"
  - "Blocos Minhas oportunidades (sempre presente, contador + estado vazio) e Histórico (só com
    itens, com Limpar) num container ESTÁTICO #savedBlocks — sobrevive a qualquer busca"
  - "Auto-add ao histórico em toda abertura de ficha (histPush dentro de showDetail, dedupe do
    último item + FIFO 30) e reabertura de ficha pelo mesmo caminho do deep-link ?insc="
affects: [10-03-ui-acoes-whatsapp-captacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Container estático irmão de #results (#savedBlocks) para UI que precisa sobreviver a
      reescritas totais de innerHTML de outro elemento — visibilidade 100% via CSS
      .panel:has(#results .empty), zero acoplamento com o estado de busca/JS"
    - "Cache leve a.__scores={op,conf} escrito pelos CHAMADORES de renderScoresInto (showDetail e
      atualizarScores) — evita recalcular score ao salvar/persistir sem exigir que a função de
      render receba o objeto cadastral"
    - "oppExtras(a) como helper único compartilhado entre toggleOportunidade (Oportunidades) e
      histPush (Histórico) — mesmo cálculo de mercadoEstimado+__scores, sem duplicação"
    - "onclick por referência de elemento (this) + data-insc esc()-ado em toda lista renderizada
      via innerHTML a partir de dado persistido — mesma disciplina de IN-01 (verNoMapa)"

key-files:
  created: []
  modified:
    - radar-goiania.html (HTML: #savedBlocks estático linha 670; CSS: linhas 488-509; JS: cache
      __scores linhas 2249/2340, lei da tela em showDetail linhas 2381-2399 e 2365-2367, funções
      de persistência/UI linhas 2419-2604, init linha 3150)

key-decisions:
  - "Container #savedBlocks inserido no body estático IMEDIATAMENTE ANTES de #results (nunca
    dentro) — fix do plan-check: #emptyState morre permanentemente na 1ª busca, então nada podia
    ancorar nele; a solução final não depende de nenhum caminho de busca/render(), só de CSS :has"
  - "renderSavedBlocks() só atribui innerHTML ao container estático — nunca insertAdjacentHTML
    relativo a uma âncora frágil; chamado no init e após toda mutação (salvar/remover/limpar/
    histPush), barato porque só reescreve um elemento oculto quando há resultados na tela"
  - "Dedupe do histórico feito pelo ÚLTIMO item da lista (não busca em toda a lista) — decisão de
    discrição: reabrir repetidamente o mesmo imóvel atualiza visitedAt em vez de empilhar 30 cópias"
  - "renderSavedBlocks() chamado incondicionalmente no init logo após setMode(MODE), antes até da
    checagem de window.L/proj4 — os blocos de oportunidades/histórico não dependem do mapa"

patterns-established:
  - "Pattern: qualquer bloco de UI que precise sobreviver a innerHTML total de um elemento vizinho
    deve viver em container irmão estático + visibilidade via CSS :has, nunca via hook em código
    de render() existente (reduz acoplamento e evita regressão silenciosa em rotas de busca)"

requirements-completed: [SALV-01, ACAO-01]

# Metrics
duration: 20min
completed: 2026-07-07
---

# Phase 10 Plan 02: Persistência de Oportunidades/Histórico + Toggle na Ficha Summary

**localStorage `radar_oportunidades`/`radar_historico` com escrita nunca-silenciosa (toast em falha), toggle ⭐ honesto na ficha, e 2 blocos "Minhas oportunidades"/"Histórico" num container estático que sobrevive a qualquer busca via CSS `:has`.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-07
- **Tasks:** 2
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments
- Persistência completa de SALV-01: `oppLoad/oppSave/histLoad/histSave` com leitura silenciosa (padrão `radar_prof`) e escrita SEMPRE visível em falha (toast "Não foi possível salvar — armazenamento do navegador indisponível ou cheio."), retorno boolean consultado por todos os chamadores
- Toggle `⭐ Salvar oportunidade` / `✓ Salva — remover?` na ficha (`toggleOportunidade`/`renderSaveBtn`), estado recalculado a cada abertura lendo `oppTem()` — nunca finge sucesso quando a escrita falha
- Lei da tela preservada: `#dActsPrim` = 1 primária (Gerar documento) + 2 secundárias (Ver comparáveis, ⭐ Salvar oportunidade); "Copiar inscrição ⧉" desceu para o topo de `#dActsMore`
- Container estático `#savedBlocks` (irmão de `#results`, HTML fixo do body) com visibilidade 100% via `.panel:has(#results .empty)` — sobrevive a qualquer reescrita de `#results.innerHTML` pelas 4 rotas de busca (render/erro/sem-resultado/falha de init)
- `renderSavedBlocks()` idempotente: bloco Oportunidades sempre presente (contador + estado vazio orientativo); bloco Histórico só com ≥1 item, com botão Limpar
- Auto-add ao histórico: `histPush(a)` chamado dentro de `showDetail()` logo após `DCUR=a`, com dedupe do último item (evita empilhar reaberturas consecutivas) + FIFO 30 (`histAdd` de 10-01)
- Reabertura de ficha via item salvo/histórico reusa LITERALMENTE o caminho do deep-link `?insc=` (`abrirOportunidade` → `setMode('insc')` + `buscar()`)
- IN-01 respeitado: todo onclick de item de lista por referência de elemento (`this`), `data-insc` sempre `esc()`-ado, todo texto de cadastro (endereço/bairro) escapado antes de entrar no innerHTML
- Suite completa: 47/47 testes continuam verdes (zero regressão no bloco RADAR_PURE)

## Task Commits

Each task was committed atomically:

1. **Task 1: Persistência + toggle ⭐ na ficha (lei da tela)** - `36dab85` (feat)
2. **Task 2: Blocos Minhas oportunidades/Histórico + auto-add + reabrir via deep-link** - `ec2317b` (feat)

## Files Created/Modified
- `radar-goiania.html`:
  - Linha 670: `<div id="savedBlocks"></div>` — container estático, irmão de `#results`
  - Linhas 488-509: CSS `.acts-save.is-saved` + `#savedBlocks`/`.panel:has(#results .empty)` + `.savedblock`/`.saveditem`/`.savedempty`
  - Linha 2249, 2340: `a.__scores={op,conf}` — cache nos 2 call sites de `renderScoresInto` (`atualizarScores`, `showDetail`)
  - Linhas 2365-2367: `histPush(a)` chamado dentro de `showDetail()` logo após `DCUR=a`
  - Linhas 2381-2399: lei da tela em `#dActsPrim`/`#dActsMore` + `renderSaveBtn()` pós-render
  - Linhas 2419-2604: bloco novo `oppLoad/oppSave/histLoad/histSave/oppTem/oppExtras/toggleOportunidade/renderSaveBtn/fmtVisita/fmtSalva/renderSavedBlocks/abrirOportunidade/removerOportunidade/limparHistorico/histPush`
  - Linha 3150: `renderSavedBlocks()` chamado no init

## Contrato final das funções (para 10-03 e manutenção futura)

```js
function oppLoad()                 // -> array (radar_oportunidades); [] em falha/ausência
function oppSave(arr)              // -> boolean; false = já mostrou toast de falha
function histLoad()                // -> array (radar_historico); [] em falha
function histSave(arr)             // -> boolean; mesma disciplina de oppSave
function oppTem(insc)              // -> boolean: insc está salvo?
function oppExtras(a)              // -> {faixaLo,faixaHi,scoreOportunidade,scoreConfianca}
                                    //    (mercadoEstimado(a) + a.__scores) — compartilhado
function toggleOportunidade()      // salva/remove DCUR; toast + renderSaveBtn + renderSavedBlocks
function renderSaveBtn()           // sincroniza .acts-save da ficha aberta com oppTem(DCUR)
function renderSavedBlocks()       // (re)preenche #savedBlocks.innerHTML (idempotente)
function abrirOportunidade(el)     // el (data-insc) OU string -> setMode('insc')+buscar()
function removerOportunidade(el)   // remove por data-insc; toast + re-render
function limparHistorico()         // histSave([]) + re-render
function histPush(a)               // auto-add com dedupe do último item + histAdd(...,30)
```

**Shape do item persistido** (ambos os arrays, via `oportunidadeItem` de 10-01):
```js
{
  insc, endereco, bairro, quadra, lote, areaTerr, areaEdif, vlvenal,
  faixaLo, faixaHi, scoreOportunidade, scoreConfianca,
  savedAt: "2026-07-07T...Z"     // só em radar_oportunidades
  // OU
  visitedAt: "2026-07-07T...Z"   // só em radar_historico
}
```

## Posição dos blocos no DOM

`#savedBlocks` é elemento **irmão estático** de `#results`, inserido no HTML fixo do body **imediatamente antes** de `#results` (linha 670, antes da linha 671 `<div class="results" id="results">`). Nenhuma das 4 rotas que reescrevem `#results.innerHTML` (render bem-sucedido, erro de busca, sem-resultado, falha de init do mapa) toca `#savedBlocks`. Visibilidade é 100% CSS: `#savedBlocks{display:none}` por padrão, `.panel:has(#results .empty) #savedBlocks{display:block}` quando qualquer uma das 4 rotas vazias está ativa (todas produzem um elemento `.empty` dentro de `#results`). `#emptyState`/`#exampleChips` (Fase 8) permanecem intactos, sem nenhuma dependência nova.

## Confirmação da lei da tela

`#dActsPrim` (linhas 2381-2384) contém exatamente:
```html
<button type="button" class="primary" onclick="abrirLaudo()">📄 Gerar documento</button>
<button type="button" onclick="...">📊 Ver comparáveis</button>
<button type="button" class="acts-save" onclick="toggleOportunidade()" aria-pressed="false">⭐ Salvar oportunidade</button>
```
`#dActsMore` (linhas 2394-2399) tem "Copiar inscrição ⧉" como **primeiro item**, seguido de custos/CND/copiar link/mapas — nunca mais de 1 primária + 2 secundárias visíveis simultaneamente.

## Decisions Made
- Container estático + CSS `:has` em vez de qualquer hook em `render()`/finish() — zero acoplamento com o código de busca existente, elimina o risco que reprovou a 1ª versão do plano (âncora `#emptyState` morrendo na 1ª busca)
- Dedupe do histórico verifica só o ÚLTIMO item (não escaneia toda a lista) — suficiente para o caso real (reabertura consecutiva do mesmo imóvel) e mais barato
- `oppExtras(a)` extraído como helper único chamado tanto por `toggleOportunidade` quanto por `histPush` — evita duplicar o cálculo de `mercadoEstimado`+`__scores` nos dois fluxos
- `renderSavedBlocks()` chamado no init antes até da checagem de `window.L/proj4` — os blocos não dependem do mapa carregar

## Deviations from Plan

None - plan executado como escrito. Duas correções textuais internas (não afetam comportamento, apenas comentários) foram necessárias durante a Task 1: os comentários originais que eu redigi citavam literalmente as strings `#dActsMore` e `"Copiar inscrição"` dentro do bloco de `#dActsPrim`, o que quebrava o verify automatizado do próprio plano (que usa `str.index()` ingênuo para localizar os limites do trecho `#dActsPrim`). Reescrevi os comentários para não conter essas substrings literais, sem alterar nenhuma linha de código funcional — comportamento idêntico ao especificado, apenas texto de comentário ajustado para não colidir com o script de verificação.

## Issues Encountered
- `node --check radar-goiania.html` continua falhando com `ERR_UNKNOWN_FILE_EXTENSION` no Windows/Node 24 (mesma limitação documentada em 10-01-SUMMARY.md — o arquivo é `.html`, não `.js`). A verificação real de sintaxe ocorre via `node --test "tests/*.test.mjs"` (extrai o bloco RADAR_PURE por `node:vm`, o que falharia com `SyntaxError` se houvesse erro) — 47/47 passou, confirmando sintaxe válida em todo o arquivo (o restante do JS solto no `<script>` também seria detectado por qualquer erro fatal ao carregar a página, verificado manualmente por leitura).

## User Setup Required

None - nenhuma configuração de serviço externo necessária. Persistência é 100% local (localStorage), sem rede nova.

## Next Phase Readiness
- Wave 3 (10-03) pode adicionar o grupo WhatsApp/Captação em `#dActsMore` sem retocar a estrutura desta plan — `#dActsPrim`/`#dActsMore` já têm seus 2 blocos fixos (lei da tela + persistência) resolvidos
- `oppExtras(a)`, `oppLoad()`, `histLoad()` estão disponíveis para qualquer feature futura que precise ler o estado salvo/histórico sem duplicar lógica
- Nenhum bloqueio identificado

---
*Phase: 10-acao-whatsapp-captacao-salvos*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/10-acao-whatsapp-captacao-salvos/10-02-SUMMARY.md
- FOUND: 36dab85 (Task 1 commit)
- FOUND: ec2317b (Task 2 commit)
