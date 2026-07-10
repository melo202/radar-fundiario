---
phase: 12-predio-como-objeto-comercial
plan: 02
subsystem: ui
tags: [predio, ui, resumo, ordenacao, comparacao, sheet]

# Dependency graph
requires:
  - phase: 12-predio-como-objeto-comercial
    plan: 01
    provides: "resumoPredio/ordenaUnidades/ehAptoProvavel/analisePredicoTexto (RADAR_PURE) — consumidas 1:1, zero reimplementacao"
provides:
  - "bldgSumarioHTML/bldgOrdHTML: resumo do predio (4 metricas) + barra de ordenacao/filtro, expandindo .bldg-head"
  - "toggleBldgOrd/ordenarBldg/toggleAptosProvaveis/buscarUnidadeBldg/copyZapPredio: wiring de UI sobre as funcoes puras da Wave 1"
  - "toggleComparar/atualizarCmpFab/abrirComparacao/fecharComparacao: marcacao de unidades (chave estavel) + FAB + sheet de comparacao em tabela"
  - "BLDGSTATE/CMP: estado de sessao em memoria (nunca persistido), resetado a cada finish()"
affects: [fase-13-refino-visual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chave estavel ci|insubprinc (cmpChave) para marcacao de comparacao — nunca indice numerico, que muda a cada render() apos reordenacao"
    - "Filtro de EXIBICAO (BLDGSTATE.provaveis/busca) aplicado DENTRO do loop de render(), APOS a insercao do .bldg-head — nunca remove de LAST, resumo sempre reflete o predio inteiro"
    - "Reordenacao (ordenarBldg) remapeia o subconjunto de LAST daquele ci percorrendo sequencialmente e consumindo a lista ja ordenada (ordenaUnidades) — preserva posicao relativa dos outros predios, RENDN/slice sempre opera sobre o LAST final"
    - "__est (mercadoEstimado) calculado em variavel temporaria (unidadesEnriquecidasDoPredio) antes de chamar resumoPredio/ordenaUnidades — nunca persistido em LAST/a.__scores"

key-files:
  created: []
  modified: [radar-goiania.html]

key-decisions:
  - "Comando 'finish()' unificado: Task 1 adicionou BLDGSTATE={} isoladamente (app funcional mesmo antes da Task 2); Task 2 completou o mesmo bloco com CMP=[];fecharComparacao();atualizarCmpFab() — reconstrucao feita via Edit direto (nao patch/diff) apos tentativa de split via git apply falhar por causa de caracteres UTF-8/emoji nos hunks manuais; reconstrucao verificada byte-a-byte contra a versao final testada antes do commit de cada task"
  - "git checkout -- (reset destrutivo) foi bloqueado pelo classificador de auto mode durante a tentativa de split de commits — resolvido reconstruindo o estado de cada task via Edit com strings exatas (idempotente, sem risco de perda de trabalho), nao via reset"

requirements-completed: [PRED-01, PRED-02]

# Metrics
duration: ~70min
completed: 2026-07-07
---

# Phase 12 Plan 02: UI do Prédio Comercial Summary

**Camada de UI completa sobre as 4 funções puras da Wave 1 (12-01): `.bldg-head` expande com resumo (4 métricas) + ordenação/filtro/busca por prédio, e cada card de unidade ganha toggle de marcação para comparação em tabela até 4 colunas — zero requisição de rede nova, 101/101 testes verdes.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2/2 completos
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments

### Task 1 — Resumo do prédio + barra de ordenação/filtro
- `.bldg-sumario` (4 métricas: unidades/vagas-boxes, área média, venal médio, estimado médio·faixa) + `.bldg-acoes` ("🔍 Ordenar / filtrar", "💬 Copiar análise do prédio ⧉") — expande `.bldg-head` sem alterar nome/Q-L/contagem/"no mapa ↗" existentes
- `.bldg-ord` (Componente 2): 4 chips de ordenação (Padrão/Maior oportunidade/Menor estimado/Maior área via `ordenaUnidades`), toggle "☐/☑ Só aptos prováveis" (via `ehAptoProvavel`), campo de busca (via `matchApto`) — oculto por padrão, expande via `toggleBldgOrd`
- `ordenarBldg(ci, criterio)`: chama `ordenaUnidades` sobre as unidades enriquecidas com `__est` daquele prédio, remapeia o resultado de volta para os objetos ORIGINAIS de `LAST` (percorrendo sequencialmente, nunca por índice), preservando a posição relativa dos outros prédios; chama `render(LAST)` sem stagger
- `toggleAptosProvaveis`/`buscarUnidadeBldg`: gravam em `BLDGSTATE[ci]` e re-renderizam; o filtro de exibição é aplicado dentro do loop de `render()`, DEPOIS da inserção do `.bldg-head` (o resumo sempre reflete o total real do prédio, nunca o total filtrado)
- `copyZapPredio(ci)`: monta `resumo`+`meta` e chama `analisePredicoTexto` + `copyTexto` (reuso literal, zero clipboard novo)

### Task 2 — Marcação para comparar + sheet de comparação
- `.cmp-toggle` (☐/☑) no topo de cada card de unidade (`isUnit===true`), chave estável `cmpChave(a) = clean(a.ci)+"|"+String(a.insubprinc||0)` — nunca índice numérico, sobrevive a `ordenarBldg`/re-render
- `toggleComparar(i, btn)`: adiciona/remove da `CMP`, bloqueia a 5ª marcação com toast honesto ("Você já marcou 4 — o máximo para comparar...") sem alterar o estado do botão
- `#cmpFab` ("⚖️ Comparar (N)"): visível só com `CMP.length>=2`, atualizado por `atualizarCmpFab()`
- `#cmpSheet` (Componente 5): tabela com colunas = unidades marcadas NA ORDEM DE MARCAÇÃO (não na ordem de `LAST`), linhas = Área/Venal/Estimado/R$/m²/Oportunidade, célula "—" honesta quando o dado não existe (nunca dispara `compare()`/`scoreOportunidade`); coluna de rótulos fixa (`position:sticky;left:0`) e cabeçalho fixo (`position:sticky;top:0`); `.cmp-tablewrap{overflow-x:auto}` — scroll horizontal SÓ dentro do sheet, nunca a página
- Botão "Abrir ficha ↗" por coluna: fecha o sheet e chama `pick(gi)` com o índice REAL em `LAST` (via `LAST.indexOf`)
- Cadeia de Esc: `#cmpSheet` é o PRIMEIRO check (topo, antes de `#negSheet`/`#captSheet`/`#caixaList`) — sheet mais recente tem prioridade
- `.card` ganha `position:relative` (pré-requisito para `.cmp-toggle{position:absolute}`)
- `finish()`: bloco de reset único `CMP=[];BLDGSTATE={};fecharComparacao();atualizarCmpFab();` logo após `closeChooser()` — nenhum estado de sessão sobrevive a uma busca nova

## Task Commits

1. **Task 1: resumo do prédio + barra de ordenação/filtro** — `dbbc5ed` (feat)
2. **Task 2: marcação para comparar + sheet de comparação** — `80b64c3` (feat)

## Interação ordenação ↔ RENDN (nota explícita pedida pelo `<output>` do plano)

`ordenarBldg(ci, criterio)` NUNCA cria uma cópia paralela da lista. Ele:
1. Filtra `LAST` pelo `ci` do prédio e enriquece cada unidade com `__est=mercadoEstimado(a)` (variável temporária, `unidadesEnriquecidasDoPredio`).
2. Chama `ordenaUnidades(enriquecidas, criterio)` (função pura da 12-01, retorna nova referência, nunca muta).
3. Percorre `LAST` inteiro com `.map()`: para cada posição cujo `ci` bate, consome a PRÓXIMA unidade da lista reordenada (`reordenadas[cursor++]`), resolvendo-a de volta ao objeto ORIGINAL de `LAST` (nunca ao objeto enriquecido com `__est`) via a mesma chave estável `ci+insubprinc`.
4. Reatribui `LAST=LAST.map(...)` e chama `render(LAST)`.

Como `render(list, opts)` sempre faz `list.slice(0,RENDN)` sobre o argumento recebido, e `LAST` já está no estado final (reordenado) ANTES dessa chamada, o botão "Mostrar mais" (`onclick="RENDN+=500;render(LAST)"`, já existente, inalterado) sempre lê o `LAST` mais recente — nunca há uma janela onde a paginação usa a ordem antiga. O mesmo raciocínio vale para os filtros de exibição (`toggleAptosProvaveis`/`buscarUnidadeBldg`): eles nunca tocam `LAST`, apenas gravam em `BLDGSTATE[ci]` e re-renderizam; o `render()` consulta `BLDGSTATE[ci]` no loop e pula (`return` do `.forEach`) os cards que não passam o filtro, DEPOIS de já ter inserido o `.bldg-head`/resumo daquele grupo — garantindo que o resumo nunca "minta" sobre o total.

## Resultado da suite completa de testes

```
node --test "tests/*.test.mjs"
ℹ tests 101
ℹ pass 101
ℹ fail 0
```

101/101 (79 pré-existentes + 22 da 12-01) — nenhuma função pura foi modificada nesta wave, apenas consumida (`resumoPredio`/`ordenaUnidades`/`ehAptoProvavel`/`analisePredicoTexto`, todas de 12-01/RADAR_PURE). Zero teste novo nesta plan (escopo é camada de UI/DOM, não testável pelo harness `node:vm` usado para o bloco puro).

## Funções de UI novas (assinatura)

```js
// Task 1
function unidadesEnriquecidasDoPredio(ci): Array         // LAST filtrado por ci + __est calculado
function bldgSumarioHTML(ci): string                     // HTML do Componente 1 (.bldg-sumario)
function bldgOrdHTML(ci): string                         // HTML do Componente 2 (.bldg-ord)
function toggleBldgOrd(btn): void                        // expande/recolhe .bldg-ord, foca 1º chip
function ordenarBldg(ci, criterio): void                 // remapeia LAST, render(LAST)
function toggleAptosProvaveis(ciOuBtn): void              // BLDGSTATE[ci].provaveis, render(LAST)
function buscarUnidadeBldg(ci, q): void                   // BLDGSTATE[ci].busca, render(LAST)
function copyZapPredio(ci): void                          // copyTexto(analisePredicoTexto(...))

// Task 2
const cmpChave = a => string                              // clean(a.ci)+"|"+String(a.insubprinc||0)
const cmpTemChave = a => boolean                          // CMP.includes(cmpChave(a))
function toggleComparar(i, btn): void                     // toggle CMP, limite 4, toast
function atualizarCmpFab(): void                          // sincroniza #cmpFab/#cmpFabN
function abrirComparacao(): void                           // monta tabela, abre #cmpSheet
function fecharComparacao(): void                          // oculta #cmpSheet, preserva CMP
```

## Estado novo em memória

```js
let BLDGSTATE={};  // { [ci]: {criterio, provaveis, busca} } — 1 entrada por predio, resetado em finish()
let CMP=[];         // chaves estaveis "ci|insubprinc" das unidades marcadas p/ comparar, resetado em finish()
```

## Decisions Made

- **Reconstrução de commits atômicos via Edit, não via `git apply`/patch manual:** a primeira tentativa de separar Task 1 e Task 2 em dois commits usou um diff unificado escrito à mão para aplicar sobre a versão HEAD do arquivo — falhou (`patch: malformed patch`) por causa de caracteres UTF-8/emoji nos hunks manuais e contagem de linhas imprecisa. Abandonei essa abordagem (risco de corrupção de um arquivo grande) e reconstruí cada estado de task usando `Edit` com strings exatas já validadas (remover trechos da Task 2, comitar Task 1, readicionar os mesmos trechos, comitar Task 2) — verificado byte-a-byte contra uma cópia de backup do estado final totalmente testado antes de cada commit.
- **`git checkout -- radar-goiania.html` foi bloqueado** pelo classificador de auto mode (ação destrutiva irreversível sem direção explícita do usuário) durante essa tentativa — resolvido sem usar operações destrutivas, apenas `Edit` idempotente.
- Nenhuma decisão de arquitetura nova além do que já estava especificado no plano/UI-SPEC — todas as escolhas de estilo/CSS/estrutura seguiram literalmente as tabelas "Elemento | Estilo" do `12-UI-SPEC.md`.

## Deviations from Plan

Nenhuma — plano executado como escrito. As únicas variações foram no PROCESSO de comitar (ver Decisions Made acima), não no CÓDIGO entregue, que corresponde 1:1 ao `<action>` de cada task e ao HTML/CSS do `12-UI-SPEC.md`.

### Item fora de escopo encontrado (não corrigido, documentado)

`tests/predio.test.mjs` tinha uma modificação não commitada desde a Plan 12-01 (ajuste de harness `assert.deepEqual({...r}, ...)` para contornar comparação cross-realm do `node:vm` — documentado como "Committed in: 9cf05ac" no SUMMARY da 12-01, mas na prática o commit `9cf05ac` não incluiu essa linha). Está fora do escopo desta plan (12-02 não toca em testes/harness) — não foi corrigido nem commitado aqui, permanece como diff local não commitado. Suite continua 101/101 verde com ou sem essa linha (o teste em questão passa com `assert.deepEqual(r, ...)` original também, pois o ajuste é só para evitar um erro de prototype cross-realm que nem sempre se manifesta). Recomendação: próxima plan que tocar `tests/predio.test.mjs` deve comitar esse ajuste junto.

## Issues Encountered

Ver "Reconstrução de commits atômicos" em Decisions Made — resolvido sem impacto no código final, apenas no processo de commit.

## User Setup Required

None — funcionalidade 100% client-side, zero configuração de serviço externo.

## Next Phase Readiness

- PRED-01/PRED-02 completos — Fase 12 (goal "prédio como objeto comercial") atendida.
- Fase 13 (refino visual global) pode aplicar respiro/skeleton/motion coreografado sobre os componentes desta plan sem bloqueio — nenhuma classe/estrutura desta plan precisa ser refeita, apenas potencialmente re-estilizada.
- Verificação visual manual (checklist do `<verification>` do plano: DevTools Network zero-request, 44px, mobile 375 scroll horizontal interno, Esc chain, `prefers-reduced-motion`) ainda não foi executada nesta sessão (ambiente sem navegador interativo) — recomenda-se checklist manual antes do merge final da Fase 12, seguindo a lista completa em `12-UI-SPEC.md` § Verificação.

---
*Phase: 12-predio-como-objeto-comercial*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html (modified, both commits present)
- FOUND: dbbc5ed (Task 1 commit)
- FOUND: 80b64c3 (Task 2 commit)
- FOUND: .planning/phases/12-predio-como-objeto-comercial/12-02-SUMMARY.md
