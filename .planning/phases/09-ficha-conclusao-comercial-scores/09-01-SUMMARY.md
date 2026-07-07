---
phase: 09-ficha-conclusao-comercial-scores
plan: 01
subsystem: testing
tags: [scores, pure-functions, node, vm-harness, determinismo, pt-br]

# Dependency graph
requires:
  - phase: 08-busca-flexivel-desambiguacao
    provides: "Bloco RADAR_PURE (marcadores RADAR_PURE_START/END) e o harness node:vm de tests/busca.test.mjs, reusados aqui sem alteracao"
provides:
  - "3 funcoes puras deterministicas dentro do bloco RADAR_PURE: scoreOportunidade, scoreConfianca, leituraPratica"
  - "Contrato 'sem base retorna null' travado por fixture/teste para scoreOportunidade"
  - "tests/scores.test.mjs — terceiro arquivo de teste independente (padrao de tests/detectmode.test.mjs)"
affects: [09-02-ficha-reordenada, 09-03-comparaveis-conclusao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Funcoes puras de score/leitura vivem no MESMO bloco RADAR_PURE (nao um bloco novo), testadas pelo MESMO harness node:vm por arquivo de teste independente"
    - "Contrato de honestidade: ausencia de dados suficientes -> null explicito, nunca fallback numerico ou frase generica"

key-files:
  created:
    - tests/scores.test.mjs
  modified:
    - radar-goiania.html
    - tests/fixtures.mjs

key-decisions:
  - "scoreConfianca trata nComps entre 3 e 7 como NOTA informativa (nao pendencia contavel) — evita que qualquer 1 defeito real combinado com 3-7 comparaveis vire sempre 'baixa', conforme fix pos plan-check (fixture obrigatoria areaOk=false+nComps=6 -> media)"
  - "% abaixo/acima da mediana em porque[] usa magnitude de preco: Math.round(|myPm2-med|/med*100) — mesma metrica que a Wave 3 (conclusaoTxt) vai reusar, garantindo consistencia entre score e comparaveis"

patterns-established:
  - "Novo arquivo de teste node:test replica localmente o loader node:vm (nao importa de outro test file) — mantem arquivos de teste independentes entre si"

requirements-completed: [SCORE-01, SCORE-02, LEIT-01]

# Metrics
duration: 25min
completed: 2026-07-07
---

# Phase 9 Plan 01: Fundação de Scores Puros (RADAR_PURE) Summary

**Três funções puras determinísticas — scoreOportunidade (percentil vs mediana/quartis), scoreConfianca (completude de dados) e leituraPratica (template pt-BR sem jargão) — adicionadas ao bloco RADAR_PURE existente, testadas via node:vm, zero mudança de UI.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-07T00:00:00Z (aprox.)
- **Completed:** 2026-07-07
- **Tasks:** 2
- **Files modified:** 3 (1 criado, 2 modificados)

## Accomplishments
- `scoreOportunidade`, `scoreConfianca`, `leituraPratica` inseridas dentro do bloco RADAR_PURE em `radar-goiania.html`, imediatamente antes de `// RADAR_PURE_END` (linhas 918, 959, 988 — bloco RADAR_PURE_START/END agora vai de 730 a 1006)
- Cada função com comentário de fórmula documentado acima da declaração (fonte da futura seção "ver metodologia" da Wave 2)
- Contrato de honestidade travado por fixture: `scoreOportunidade` retorna `null` (nunca número inventado) para stats ausente, `n<3`, `myPm2` nulo/zero/`NaN`
- `tests/scores.test.mjs` criado como terceiro arquivo de teste independente, reusando o mesmo padrão de loader `node:vm` de `tests/busca.test.mjs` (slice por linha entre marcadores, sem import cruzado entre arquivos de teste)
- `node --test "tests/*.test.mjs"`: **34 tests, 34 pass, 0 fail** (31 testes pré-existentes intactos + 3 novas suites: `scoreOportunidade`, `scoreConfianca`, `leituraPratica`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Adicionar scoreOportunidade/scoreConfianca/leituraPratica ao bloco RADAR_PURE + fixtures** - `9acf5a1` (feat)
2. **Task 2: Criar tests/scores.test.mjs (harness node:vm reusando o padrao existente)** - `c9948cb` (test)

_Nota: escopo era `tdd="true"` mas a implementação de referência já vinha validada (5/5 casos canônicos passando) diretamente do plano `<interfaces>`; o fluxo seguido foi escrever as fixtures/contrato junto com a implementação (Task 1) e então criar a suíte formal (Task 2), confirmando os mesmos 5 casos + todos os demais fixtures via harness node:vm real — sem copiar a lógica no teste._

## Files Created/Modified
- `radar-goiania.html` - 3 funções puras novas dentro do bloco RADAR_PURE (linhas 918-1004): `scoreOportunidade` (score 0-100 por posição de R$/m² vs mediana/quartis da vizinhança), `scoreConfianca` (nível alta/média/baixa por completude de dados, com pendências concretas nomeadas), `leituraPratica` (texto pt-BR por template, zero jargão)
- `tests/fixtures.mjs` - 3 chaves novas no objeto `FIXTURES` (`scoreOportunidade`, `scoreConfianca`, `leituraPratica`), incluindo os casos obrigatórios: 8% abaixo da mediana, sem base (null), pendências de confiança (alta/média/baixa, incl. `{areaOk:false,nComps:6}` → "media"), leitura sem jargão + fallback "dados insuficientes"
- `tests/scores.test.mjs` - novo arquivo de teste `node:test`, loader `node:vm` local (independente de `busca.test.mjs`), 3 suites (`scoreOportunidade`, `scoreConfianca`, `leituraPratica`) iterando sobre `FIXTURES`

## Como rodar os testes

```
node --test "tests/*.test.mjs"
```

Resultado obtido nesta execução: `tests 34`, `pass 34`, `fail 0`, `duration_ms ~76ms`.

## Contratos "sem base -> null" cobertos por fixture (confirmação explícita)

1. **`scoreOportunidade` com `stats.n<3`** (`{myPm2:5000, stats:{n:2}}`) → `null` — cobrido em `FIXTURES.scoreOportunidade[3]` e testado em `tests/scores.test.mjs` (suite `scoreOportunidade`, branch `expectNull`).
2. **`scoreOportunidade` com `myPm2` inválido (`null`)** (`{myPm2:null, stats:{med:5000,q1:4500,q3:5500,n:8}}`) → `null` — cobrido em `FIXTURES.scoreOportunidade[4]`.
3. **`scoreOportunidade` com `myPm2` inválido (`0`)** (`{myPm2:0, stats:{med:5000,q1:4500,q3:5500,n:8}}`) → `null` — cobrido em `FIXTURES.scoreOportunidade[5]`.

Os 3 casos são exercitados pela mesma suíte `scoreOportunidade` em `tests/scores.test.mjs`, que faz `assert.equal(resultado, null)` quando `fx.expectNull` está presente. Wave 2/3 podem chamar `scoreOportunidade`/`scoreConfianca`/`leituraPratica` diretamente sem retestar este contrato.

## Decisions Made
- **Nota vs. pendência em `scoreConfianca`:** `nComps` entre 3 e 7 entra em `notas[]` (informativo, aparece no `porque[]` mas não conta como defeito), enquanto `nComps<3` entra em `pendencias[]` (defeito real). Isso evita que a combinação `areaOk=false + nComps=6` caia incorretamente em "baixa" (2 "defeitos") em vez de "media" (1 pendência real + 1 nota) — comportamento exigido pela fixture obrigatória do CONTEXT.md/UI-SPEC e já pré-corrigido no plano (`<interfaces>`, comentário "fix plan-check").
- **Métrica de "% abaixo/acima da mediana" fixada como magnitude de preço** (`Math.round(|myPm2-med|/med*100)`), não como percentil de posição — decisão explícita no plano para garantir que a Wave 3 (`conclusaoTxt` em comparáveis) reutilize a mesma fórmula e produza números consistentes com o score de oportunidade exibido na ficha.

## Deviations from Plan

None - plan executed exactly as written. O código de `<interfaces>` já vinha validado (5/5 casos canônicos conferidos por execução direta via `node -e` com `vm.Script` antes da suíte formal) e foi copiado literalmente para `radar-goiania.html`, incluindo o fix pós plan-check do `scoreConfianca` (nota vs. pendência).

## Issues Encountered
- O comando `node --check radar-goiania.html` do bloco `<verify>` da Task 1 falha com `ERR_UNKNOWN_FILE_EXTENSION` porque o arquivo é `.html` (não `.js` puro) — comportamento pré-existente, não uma regressão desta plan. Validação de sintaxe foi feita extraindo o bloco `<script>` que contém `RADAR_PURE_START` e compilando-o via `new vm.Script(...)` diretamente (mesmo mecanismo usado pelo harness de teste), confirmando sintaxe válida. A verificação funcional real (que a plan também exige) — `node --test "tests/*.test.mjs"` — passa integralmente.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wave 2 (09-02, ficha reordenada) e Wave 3 (09-03, comparáveis) podem chamar `scoreOportunidade(myPm2, stats, flags)`, `scoreConfianca(inputs)` e `leituraPratica(inputs)` diretamente do bloco RADAR_PURE já carregado em runtime — nenhuma reimplementação necessária, contrato de assinatura e de retorno (`null` honesto) já travado por teste.
- Nenhuma tela foi tocada nesta plan (`showDetail`/`renderComps`/`.acts` permanecem intocados) — zero risco de regressão visual/funcional herdado para a Wave 2.
- Nenhum bloqueio identificado.

---
*Phase: 09-ficha-conclusao-comercial-scores*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: tests/fixtures.mjs
- FOUND: tests/scores.test.mjs
- FOUND: .planning/phases/09-ficha-conclusao-comercial-scores/09-01-SUMMARY.md
- FOUND: commit 9acf5a1 (Task 1)
- FOUND: commit c9948cb (Task 2)
- CONFIRMED: `node --test "tests/*.test.mjs"` — 34 tests, 34 pass, 0 fail
