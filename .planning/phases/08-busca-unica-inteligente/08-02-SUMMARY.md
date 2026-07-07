---
phase: 08-busca-unica-inteligente
plan: 02
subsystem: matching
tags: [fuzzy-matching, ranking, ui, selo-aproximado]

# Dependency graph
requires: ["08-01"]
provides:
  - "matchScoreQ/matchScoreL/matchScoreRua no bloco RADAR_PURE — score numerico (0=exato, 1=normalizado/digitos-iguais, 2=substring-fallback, null=nao casa) substituindo o contrato booleano okQ/okL/casaRuaCore"
  - "a.__matchScore anexado nos 2 call-sites de buscar() (MODE=addr e MODE=ql) que passam pelo filtro client-side"
  - "finish() ordena units por __matchScore como criterio PRIMARIO, ci/insubprinc como secundario (agrupamento de predio preservado)"
  - "Selo visual '~aproximado' (.matchapprox, --accent) nos cards de resultado com __matchScore===2"
affects: ["08-03-detect-mode", "08-04-caixa-unica"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fallback de substring cru so aceito com boundary de token (espaco/hifen/borda de string) — evita que um termo curto case no meio de uma palavra maior (ex. 'BELA' dentro de 'BELANTINA')"
    - "Consulta puramente numerica (sem letra) nunca cai no fallback de substring cru — so consultas com letra (ex. '10E') usam esse fallback; elimina o falso-positivo classico de quadra curta batendo quadra longa por coincidencia de digitos"

key-files:
  created: []
  modified: [radar-goiania.html, tests/busca.test.mjs, tests/fixtures.mjs]

key-decisions:
  - "Fix de bug no proprio contrato de referencia do plano (Rule 1): a formula matchScoreRua do <facts> do plano (log.includes(rCore) -> return 2 sem checagem de boundary) contradiz o <behavior> obrigatorio da Task 1 (matchScoreRua('BELANTINA','BELA') deve ser null); implementado com boundary exigido nos 2 lados (espaco/hifen/borda de string) para o fallback de substring, satisfazendo o comportamento obrigatorio sem deixar o score 2 inatingivel"
  - "Segundo call-site de rua (fallback 'numero nao achado — varrendo a rua') tambem passou a anexar __matchScore (o plano só citava explicitamente o filtro principal) — sem isso, itens vindos desse ramo ficariam sem score e cairiam sempre no ??0/empate por ci, perdendo a ordenacao por qualidade nesse caminho especifico de busca por endereco"

requirements-completed: [BUSCA-07]

# Metrics
duration: 24min
completed: 2026-07-07
---

# Phase 8 Plan 02: Score de Qualidade do Fuzzy-Match + Ordenação + Selo Aproximado Summary

**okQ/okL/casaRuaCore (booleanos, com fallback de substring sem prioridade) trocados por matchScoreQ/matchScoreL/matchScoreRua (0=exato, 1=normalizado, 2=substring-com-boundary, null=não casa), usados para ordenar `finish()` por qualidade e exibir selo "~aproximado" nos matches de menor confiança.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-07T04:05:00Z (continuação da sessão 08-01)
- **Completed:** 2026-07-07T04:33:00Z
- **Tasks:** 2
- **Files modified:** 3 (radar-goiania.html, tests/busca.test.mjs, tests/fixtures.mjs)

## Accomplishments

- `okQ`/`okL`/`casaRuaCore` removidos do bloco `RADAR_PURE`; substituídos por `matchScoreQ`/`matchScoreL`/`matchScoreRua`, que retornam um score de qualidade (`0`/`1`/`2`/`null`) em vez de booleano
- **Fix do falso-positivo do roadmap:** quadra "135" isolada não casa mais "2135"/"1350" por substring cru — consulta puramente numérica nunca aceita o fallback de substring; só consultas com letra (ex. "10E") usam esse fallback
- **Fix de fronteira de palavra na rua:** "Bela" não casa mais "Belantina" no meio da palavra — o fallback de substring cru só é aceito quando há boundary (espaço/hífen/borda da string) nos dois lados do termo encontrado
- 2 call-sites em `buscar()` (`MODE="addr"` e `MODE="ql"`) atualizados para calcular o score e anexar `a.__matchScore` a cada item que passa o filtro
- `finish()` agora ordena por `__matchScore` como critério PRIMARIO (score menor = melhor match primeiro), mantendo `ci`/`insubprinc` como critério secundário — unidades do mesmo prédio continuam agrupadas
- Selo visual `~aproximado` (span `.matchapprox`, cor `--accent`, fonte reaproveitada de `.ql-tag`) aparece dentro do card de cada item com `__matchScore===2`, sem introduzir hex ou transition novos
- `fetchWhere`/WHERE server-side permanece absolutamente intocado — a mudança é 100% client-side sobre o array já carregado (recall preservado)

## Task Commits

Each task was committed atomically:

1. **Task 1: Score de qualidade (matchScoreQ/L/Rua) + testes de fronteira de palavra** - `a7510c4` (feat)
2. **Task 2: Ordenar finish() por qualidade de match + selo "aproximado" no card** - `d824504` (feat)

## Files Created/Modified

- `radar-goiania.html` — bloco `RADAR_PURE` com `matchScoreQ`/`matchScoreL`/`matchScoreRua`; 2 call-sites de `buscar()` (addr/ql) anexando `a.__matchScore`; `finish()` ordenando por score primário; `cardHTML` renderizando o selo `.matchapprox`; CSS `.card .matchapprox{color:var(--accent);font-weight:600}` reaproveitando o vocabulário visual existente
- `tests/busca.test.mjs` — testes `okQ`/`okL` trocados por `matchScoreQ`/`matchScoreL`/`matchScoreRua`, exportando as novas funções via `__exports`
- `tests/fixtures.mjs` — fixtures `okQ`/`okL` reescritas para o contrato de score; fixture nova `matchScoreRua` cobrindo fronteira de palavra

## Antes / Depois (evidência real do roadmap)

Verificado ao vivo contra o código de produção (via `node:vm`, mesma técnica do harness de teste):

| Caso | Antes (okQ/okL/casaRuaCore booleano) | Depois (matchScoreQ/L/Rua) |
|---|---|---|
| Quadra `"135"` vs candidata `"2135"` | `true` — **falso-positivo do roadmap** | `null` — item sai do resultado |
| Quadra `"10E"` vs candidata `"10E"` | `true` (exato) | `0` (exato, sem selo) |
| Lote `"20/21"` vs filtro `"20"` | `true` | `1` (token exato dentro do split "/") |
| Lote `"20/21"` vs filtro `"22"` | `false` | `null` (equivalente) |
| Rua `"BELA"` vs logradouro `"BELANTINA"` | `true` — **falso-positivo (substring de meio de palavra)** | `null` — item sai do resultado |
| Rua `"BELA"` vs logradouro `"BELA VISTA"` | `true` | `0` (fronteira de palavra exata) |

## Decisions Made

- **Fix de bug no contrato de referência do próprio plano (Rule 1 — bug):** o `<facts>` do plano especifica `matchScoreRua` com `if(log.includes(rCore)) return 2` sem nenhuma checagem de boundary — implementado literalmente, isso faria `matchScoreRua("BELANTINA","BELA")` retornar `2`, contradizendo o `<behavior>` obrigatório da própria Task 1 (`matchScoreRua("BELANTINA","BELA") == null`). Implementei o fallback de substring (score 2) exigindo boundary (espaço, hífen ou borda da string) nos DOIS lados do termo encontrado — isso satisfaz o comportamento obrigatório (bloqueia "Belantina") sem tornar o score 2 inatingível (ainda cobre casos como rua hifenada sem espaço). Testado e confirmado por `node --test`.
- **Segundo call-site de rua com `__matchScore`:** o ramo de fallback em `MODE="addr"` (quando o número não é encontrado e a busca "varre a rua inteira") também recebeu a atribuição de `__matchScore` — o plano só detalhava explicitamente o filtro principal, mas sem isso os itens desse ramo específico ficariam sempre em `??0`/empate por `ci`, perdendo a ordenação por qualidade nesse caminho.
- **`casaRua` (closure intermediária) removida:** ao recalcular o score, a closure `casaRua=a=>casaRuaCore(...)` do código original ficou sem uso (dead code) após a segunda edição do call-site addr — removida em vez de deixada morta.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fórmula de referência `matchScoreRua` do plano contradiz seu próprio `<behavior>` obrigatório**
- **Found during:** Task 1
- **Issue:** O `<facts>` do plano fornece `matchScoreRua(log,rCore,rD){ if(word-boundary) return 0; if(digit-token) return 1; if(log.includes(rCore)) return 2; return null; }` — copiado literalmente, `matchScoreRua("BELANTINA","BELA")` retornaria `2` (não `null`), quebrando o teste obrigatório do próprio plano (`<behavior>`: "matchScoreRua('BELANTINA','BELA') == null — este é o fix").
- **Fix:** Fallback de substring (score 2) passou a exigir boundary (espaço, hífen ou borda de string) nos DOIS lados do índice onde `rCore` foi encontrado em `log`, não apenas `includes()` cru.
- **Files modified:** radar-goiania.html
- **Verification:** `node --test "tests/*.test.mjs"` — 7/7 grupos, 0 falhas, incluindo o caso específico `matchScoreRua("BELANTINA","BELA","") === null`
- **Committed in:** a7510c4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug no contrato de referência do plano)
**Impact on plan:** Nenhuma mudança de escopo — o comportamento implementado é exatamente o que o `<behavior>` da Task 1 exige; apenas a fórmula de referência literal do `<facts>` precisou de um ajuste de boundary para não contradizer o próprio contrato obrigatório do plano.

## Issues Encountered

- Ver deviation acima. Nenhum outro bloqueio.

## Confirmação: `node --test` passa

```
✔ norm (1.2903ms)
✔ ruaCore (0.2192ms)
✔ matchApto (0.1398ms)
✔ matchScoreQ (0.1163ms)
✔ matchScoreL (0.1122ms)
✔ matchScoreRua (0.0947ms)
✔ insc — deteccao de campo por tamanho (0.2696ms)
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

Comando usado (mesmo ajuste documentado em 08-01 para este ambiente Windows/Node v24): `node --test "tests/*.test.mjs"`. O comando literal do plano (`node --test tests/`) continua falhando neste ambiente por motivo já documentado em 08-01-SUMMARY.md (não é uma regressão desta plan).

## Confirmação: `fetchWhere`/WHERE server-side intocado (recall preservado)

Verificado via script Python do próprio plano:
```
assert s.count('function fetchWhere')==1  # PASSOU
```
Nenhuma linha dentro de `fetchWhere` foi tocada nesta plan — a única mudança é no filtro/ordenação/renderização client-side sobre o array já retornado pelo servidor.

## User Setup Required

None — mudança 100% client-side, sem infraestrutura nova.

## Next Phase Readiness

- `08-03` (detect-mode) e `08-04` (caixa única) podem usar `__matchScore` diretamente ao consolidar os modos de busca em uma caixa só — a ordenação por qualidade e o selo "aproximado" já existem e não precisam ser reimplementados
- Nenhum bloqueio identificado

---
*Phase: 08-busca-unica-inteligente*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: tests/busca.test.mjs
- FOUND: tests/fixtures.mjs
- FOUND: .planning/phases/08-busca-unica-inteligente/08-02-SUMMARY.md
- FOUND commit: a7510c4
- FOUND commit: d824504
