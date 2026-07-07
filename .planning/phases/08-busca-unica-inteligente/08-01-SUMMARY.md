---
phase: 08-busca-unica-inteligente
plan: 01
subsystem: testing
tags: [node-test, node-vm, matching, refactor, harness]

# Dependency graph
requires: []
provides:
  - "Bloco RADAR_PURE_START/END em radar-goiania.html (linhas 681-702) consolidando norm/ruaCore/likeTerm/isGarage/matchApto/okQ/okL/casaRuaCore"
  - "Harness de teste Node puro (tests/fixtures.mjs + tests/busca.test.mjs) executavel via node:vm contra o proprio radar-goiania.html, sem copia divergente"
  - "package.json minimo (type:module, script test)"
  - "Fixtures obrigatorias do roadmap: '135' isolado, 'Rua 135', 'Q135', insc 10 vs 14 dig, lote '20/21', quadra '10E', apto '1901' vs '19'"
affects: [08-02-fuzzy-fix, 08-03-detect-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Harness de teste sem framework/bundler: node:test + node:assert/strict + node:vm lendo e avaliando um bloco delimitado por comentario dentro do proprio arquivo HTML de produção"
    - "Marcadores de bloco RADAR_PURE_START/END como contrato entre app e teste — extração via slice por linha (indexOf da linha seguinte ao marcador de inicio, lastIndexOf da linha anterior ao marcador de fim), não indexOf cru do literal"

key-files:
  created: [tests/fixtures.mjs, tests/busca.test.mjs, package.json]
  modified: [radar-goiania.html]

key-decisions:
  - "package.json 'test' script usa 'tests/*.test.mjs' (glob) em vez de 'tests/' (diretorio) — nesta build de Node v24.16.0/Windows, passar um diretorio como argumento posicional para --test falha com MODULE_NOT_FOUND; tanto 'node --test' sem argumentos (descoberta automatica) quanto o glob quotado funcionam corretamente e são equivalentes em cobertura"
  - "okQ/okL/casaRuaCore preservam EXATAMENTE o comportamento atual, incluindo o fallback de substring sem prioridade (quadra '135' isolada bate '2135') — fixtures documentam isso como contrato ATUAL, não como bug desta plan; 08-02 é quem vai medir antes/depois e mudar a regra"

requirements-completed: [BUSCA-01]

# Metrics
duration: 18min
completed: 2026-07-07
---

# Phase 8 Plan 01: Extração RADAR_PURE + Harness de Teste Node Summary

**Extração das funções puras de matching (norm/ruaCore/likeTerm/isGarage/matchApto/okQ/okL/casaRuaCore) para um bloco único em radar-goiania.html, com harness `node --test` que avalia o próprio bloco via `node:vm` (zero cópia, zero mudança de comportamento).**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-07T04:05:00Z
- **Completed:** 2026-07-07T04:23:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 modificado, 3 criados)

## Accomplishments
- `radar-goiania.html` ganhou um bloco único `RADAR_PURE_START`/`RADAR_PURE_END` (linhas 681-702) consolidando as 8 funções puras hoje espalhadas pelo arquivo, sem duplicação (cada função existe exatamente 1x)
- `okQ`/`okL`/`casaRua` — antes fechamentos inline dentro de `buscar()` capturando variáveis do escopo local — foram extraídos para funções nomeadas de argumentos explícitos (`okQ(nq,qU)`, `okL(nl,lU)`, `casaRuaCore(log,rCore,rD)`), com os 2 call-sites (`MODE==="addr"` e `MODE==="ql"`) atualizados para chamá-las, preservando a lógica byte-a-byte
- Harness Node nativo (`node:test`/`node:assert/strict`/`node:vm`, sem framework novo) que lê `radar-goiania.html`, extrai o bloco RADAR_PURE por slice de linha e avalia via `vm.Script`/`runInContext` — testa a MESMA implementação usada em runtime, não uma cópia
- Fixtures cobrindo os 7 casos obrigatórios do roadmap: `"135"` isolado, `"Rua 135"`, `"Q135"`, inscrição 10 vs 14 dígitos, lote `"20/21"`, quadra `"10E"`, apto `"1901"` vs `"19"`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extrair bloco RADAR_PURE em radar-goiania.html** - `b3dee81` (refactor)
2. **Task 2: Criar fixtures + harness Node** - `0a62ca7` (test)

_Nenhuma task TDD formal (RED/GREEN/REFACTOR separados) — Task 2 foi marcada `tdd="true"` no plano mas por ser um harness de teste sobre código JÁ existente (não uma feature nova a implementar), fixtures e teste foram criados e verificados juntos num único commit, já que não há "implementação" a fazer depois do teste passar — o código sob teste (Task 1) já estava commitado e correto._

## Files Created/Modified
- `radar-goiania.html` - Bloco RADAR_PURE_START/END (linhas 681-702); 2 call-sites em `buscar()` atualizados para chamar `casaRuaCore`/`okQ`/`okL` nomeados
- `tests/fixtures.mjs` - Casos de teste nomeados (norm, ruaCore, matchApto, okQ, okL, insc), incluindo os 7 obrigatórios do roadmap
- `tests/busca.test.mjs` - Suite `node:test` (6 grupos de teste, 13 asserções) que carrega o bloco RADAR_PURE via `node:vm`
- `package.json` - Mínimo, `type:module` + script `test`

## Decisions Made
- **Script de teste usa glob em vez de diretório:** `node --test tests/` (forma literal pedida pelo plano) falha nesta build (Node v24.16.0, Windows) com `MODULE_NOT_FOUND` ao tentar `require('tests')` — comportamento confirmado reprodutível também via `npm test` com o mesmo comando. `node --test` sem argumentos (descoberta automática, que já encontra `tests/busca.test.mjs` pelo padrão `*.test.mjs`) e `node --test "tests/*.test.mjs"` funcionam perfeitamente e passam os mesmos 6 grupos/13 asserções. Ajustei o script `test` do `package.json` para o glob quotado — mais robusto entre plataformas e não depende da forma de descoberta de diretório desta build específica.
- **okQ/okL preservam `!qU`/`!lU` em vez do `!q`/`!l` original:** conforme a nota do plano (`<facts>`), confirmado que são equivalentes porque `qU=q.toUpperCase()` só é vazio quando `q` é vazio.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `node --test tests/` falha nesta build de Node/Windows**
- **Found during:** Task 2 (verificação do harness)
- **Issue:** O comando literal do plano (`node --test tests/`) lança `TypeError`/`MODULE_NOT_FOUND` ao passar um diretório com barra final como argumento posicional — confirmado reprodutível de forma consistente (mesmo erro via `npm test`), não um problema de path do Git Bash (testado com `MSYS_NO_PATHCONV=1`, mesmo resultado)
- **Fix:** Ajustado o script `test` do `package.json` para `node --test "tests/*.test.mjs"` (glob quotado). Confirmado que `node --test` sem argumentos (descoberta automática) também funciona e é equivalente — ambas as formas passam os mesmos 6 grupos de teste / 13 asserções
- **Files modified:** package.json
- **Verification:** `npm test` → exit 0, 6/6 grupos de teste passam; `node --test` (sem args) → exit 0, mesmos resultados
- **Committed in:** 0a62ca7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Ajuste necessário para o harness funcionar de forma confiável no ambiente de execução; nenhuma mudança de escopo — os testes continuam validando exatamente as fixtures/funções especificadas no plano.

## Issues Encountered
- Ver deviation acima (comando de teste do ambiente Windows/Node v24).

## Comando para rodar os testes

```bash
npm test
# ou, equivalente:
node --test
# ou, explicito:
node --test "tests/*.test.mjs"
```

**Saída (2026-07-07, ambiente de execução desta plan):**
```
✔ norm (1.2546ms)
✔ ruaCore (0.2565ms)
✔ matchApto (0.1368ms)
✔ okQ (0.0929ms)
✔ okL (0.1097ms)
✔ insc — deteccao de campo por tamanho (0.1752ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 63.1783
```

6 grupos de teste (`test(...)`), 13 asserções (`assert.equal`/`assert.ok`) no total, cobrindo os 7 casos obrigatórios do roadmap.

## Confirmação explícita: comportamento ATUAL preservado

`okQ`, `okL` e `casaRuaCore` foram **extraídos e parametrizados, não reescritos**. O fallback de substring sem prioridade que causa falsos-positivos conhecidos permanece intacto e é agora **coberto por teste**, documentando o baseline que `08-02` vai medir antes/depois:

- `okQ("2135", "135")` → `true` (quadra "135" isolada casa "2135" por substring — falso-positivo conhecido, preservado e testado)
- `okL("20/21", "20")` → `true`, `okL("20/21", "21")` → `true`, `okL("20/21", "22")` → `false`
- `matchApto({incompl:"APTO 1901"}, "19")` → `false` (fronteira de dígitos já correta hoje para este caso)

Nenhuma mudança de comportamento observável na busca (WHERE/consultas ao ArcGIS intocados) — verificado por `node --check` no bloco `<script>` principal extraído (sintaxe válida) e pela ausência de qualquer edição fora do bloco RADAR_PURE e dos 2 call-sites em `buscar()`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `08-02` (fuzzy-fix) e `08-03` (detectMode) agora têm um harness de regressão para medir mudanças de matching antes/depois — pré-requisito cumprido conforme SEARCH.md §7 item 1
- As fixtures em `tests/fixtures.mjs` já documentam o comportamento ATUAL (incluindo falsos-positivos) — `08-02` deve ATUALIZAR os casos `okQ`/`okL` cujo `out` mudar de valor esperado (ex.: `okQ("2135","135")` deve passar a `false` após o fix), não adicionar fixtures paralelas
- Nenhum bloqueio identificado

---
*Phase: 08-busca-unica-inteligente*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: tests/fixtures.mjs
- FOUND: tests/busca.test.mjs
- FOUND: package.json
- FOUND: .planning/phases/08-busca-unica-inteligente/08-01-SUMMARY.md
- FOUND commit: b3dee81
- FOUND commit: 0a62ca7
