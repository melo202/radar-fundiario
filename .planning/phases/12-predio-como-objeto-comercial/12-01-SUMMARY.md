---
phase: 12-predio-como-objeto-comercial
plan: 01
subsystem: ui
tags: [predio, resumo, ordenacao, comparacao, pure-functions, tdd, radar-pure]

# Dependency graph
requires:
  - phase: 09-scores-e-oportunidade
    provides: isGarage(a) (heuristica de garagem/box reusada por ehAptoProvavel)
provides:
  - "resumoPredio(units): metricas agregadas do edificio (n/areaMedia/venalMedio/estimadoMedio/faixaLo/faixaHi), honesto (null nunca NaN)"
  - "ordenaUnidades(units,criterio): ordenacao client-side nao-mutante, estavel, 4 criterios (padrao/oportunidade/estimado-asc/area-desc)"
  - "ehAptoProvavel(a): heuristica residencial/misto e nao-garagem para o filtro 'so aptos provaveis'"
  - "analisePredicoTexto(resumo,meta): texto copiavel WhatsApp-style do resumo do predio, omissao condicional por metrica ausente"
affects: [12-02-predio-ui, fase-13-refino-visual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Campo __est calculado FORA do bloco RADAR_PURE (pela Wave 2 via mercadoEstimado) e passado como propriedade opcional por unidade — mesmo padrao de __scores (Fase 9/10)"
    - "Tie-breaker explicito por indice original em Array.prototype.sort para estabilidade documentada (nao depende de garantia implicita de engine)"
    - "Sentinela Infinity para 'sem base de comparacao vai para o fim' em chaves de ordenacao ascendente"

key-files:
  created: [tests/predio.test.mjs]
  modified: [radar-goiania.html, tests/fixtures.mjs]

key-decisions:
  - "Guarda defensiva extra (nao pedida no plan original, recomendada pelo checker): resumoPredio so conta __est quando AMBOS lo>0 e hi>0 (nunca lo>0 sozinho) — protege contra {lo:undefined,hi:100} corrompendo faixaLo/faixaHi"
  - "assert.deepEqual entre objeto retornado do sandbox node:vm e objeto literal do modulo de teste falha por prototype cross-realm mesmo com conteudo identico — resolvido com spread {...r} antes de comparar (unico ajuste ao harness de teste, sem impacto na implementacao)"

patterns-established:
  - "4a funcao pura adicionada ao MESMO bloco RADAR_PURE (nao criou bloco novo) — harness de teste corta por indice de string entre os marcadores"

requirements-completed: [PRED-01, PRED-02]

# Metrics
duration: 25min
completed: 2026-07-07
---

# Phase 12 Plan 01: Funções Puras do Prédio Summary

**4 funções puras (resumoPredio, ordenaUnidades, ehAptoProvavel, analisePredicoTexto) adicionadas ao bloco RADAR_PURE de radar-goiania.html — camada de cálculo/ordenação/texto 100% client-side para PRED-01/PRED-02, zero requisição de rede, TDD RED→GREEN com 22 novos testes.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2 completos
- **Files modified:** 3 (radar-goiania.html, tests/predio.test.mjs criado, tests/fixtures.mjs)

## Accomplishments
- `resumoPredio(units)` — agrega nº unidades, área média, venal médio, estimado médio + faixa, honesto (amostra vazia/parcial → `null`, nunca `NaN`), com guarda contra `__est` malformado
- `ordenaUnidades(units, criterio)` — 4 critérios (padrão/oportunidade/estimado-asc/area-desc), nunca muta o array/objetos recebidos, ordenação estável via tie-breaker por índice, fallback seguro para critério desconhecido
- `ehAptoProvavel(a)` — heurística residencial(1)/misto(5) e não-garagem, reusa `isGarage` já existente
- `analisePredicoTexto(resumo, meta)` — texto copiável WhatsApp-style, omissão condicional por métrica ausente (nunca "estimado médio: —")
- `tests/predio.test.mjs` com 22 testes cobrindo os casos do `<behavior>` do plano, incluindo o caso defensivo recomendado pelo checker (`__est` parcialmente malformado)
- Suite completa: **101/101 testes passam** (79 existentes + 22 novos), zero regressão

## Task Commits

1. **Task 1: RED — criar tests/predio.test.mjs + fixtures (testes falhando)** — `d17e472` (test)
2. **Task 2: GREEN — implementar as 4 funções dentro do bloco RADAR_PURE** — `9cf05ac` (feat)

_TDD: RED confirmado (1 teste falhou por ausência das funções, os demais nem chegaram a executar por causa do `assert.ok` guard) → GREEN confirmado (22/22 novos + 79/79 antigos)._

## Files Created/Modified
- `radar-goiania.html` — 4 funções novas + 1 auxiliar interna (`__pm2`) adicionadas dentro de `RADAR_PURE_START`...`RADAR_PURE_END`, imediatamente antes do marcador `RADAR_PURE_END` (linhas ~1737-1811 pós-edição). Nenhuma linha removida/alterada fora dessa adição — zero impacto em qualquer função existente ou UI.
- `tests/predio.test.mjs` (novo) — harness `node:vm` seguindo o padrão de `tests/negocio.test.mjs`/`tests/doc.test.mjs`, 22 testes.
- `tests/fixtures.mjs` — 4 chaves novas acrescentadas ao objeto `FIXTURES` existente: `resumoPredioCasos`, `ordenaUnidadesCasos`, `ehAptoProvavelCasos`, `analisePredicoTextoCasos`.

## Assinaturas exatas (contrato travado para a Wave 2 — 12-02)

```js
function resumoPredio(units): {n, areaMedia, venalMedio, estimadoMedio, faixaLo, faixaHi}
function ordenaUnidades(units, criterio): Array // nova referência, nunca === units
function ehAptoProvavel(a): boolean
function analisePredicoTexto(resumo, meta): string
```

### Contrato do campo `__est` por unidade (para a Wave 2 montar antes de chamar resumoPredio/ordenaUnidades)

`__est` é o resultado de `mercadoEstimado(u)` **já calculado pela Wave 2** (função impura, fora do bloco RADAR_PURE, pois referencia `window.CAIXA`) **antes** de passar `units` para `resumoPredio`/`ordenaUnidades` — nunca recalculado dentro do bloco puro. Shape esperado por unidade:

```
{ areaedif: number|undefined, vlvenal: number|undefined, incompl: string|undefined,
  uso: number|undefined, __est: {lo:number,hi:number}|null|undefined }
```

- `resumoPredio` só conta uma unidade para `estimadoMedio`/`faixaLo`/`faixaHi` quando `u.__est` existe **E** `u.__est.lo>0` **E** `u.__est.hi>0` (guarda defensiva contra entrada suja — ver Deviations).
- `ordenaUnidades(units,"estimado-asc")` aplica a mesma guarda (`e&&e.lo>0&&e.hi>0`) — unidade com `__est` malformado é tratada como "sem base de comparação" e vai para o fim, nunca gera `NaN`/`Infinity` silenciosamente na comparação.

### Prova de zero requisição de rede em `ordenaUnidades("oportunidade")`

Corpo completo da função (radar-goiania.html, linhas ~1771-1785):

```js
function ordenaUnidades(units,criterio){
  const arr=(units||[]).map((u,i)=>({u,i}));
  let key;
  if(criterio==="oportunidade"){
    key=x=>{const p=__pm2(x.u);return p==null?Infinity:p;};
  }else if(criterio==="estimado-asc"){
    key=x=>{const e=x.u.__est;return (e&&e.lo>0&&e.hi>0)?(e.lo+e.hi)/2:Infinity;};
  }else if(criterio==="area-desc"){
    key=x=>(x.u.areaedif>0)?-x.u.areaedif:Infinity;
  }else{
    key=x=>x.i;
  }
  arr.sort((a,b)=>{const ka=key(a),kb=key(b);return ka!==kb?ka-kb:a.i-b.i;});
  return arr.map(x=>x.u);
}
```

Nenhum `async`, `await`, `fetch`, `jsonp`, `scoreOportunidade`, `compare` ou `compsStats` aparece no corpo — a função é 100% síncrona, opera apenas sobre `units` já em memória e o auxiliar interno `__pm2` (`(u.vlvenal||0)/(u.areaedif||0)` com guarda de divisão por zero). "Maior oportunidade" compara cada unidade contra a média do **próprio prédio** (calculada implicitamente pela ordenação relativa dos `pm2` do conjunto recebido), nunca contra `scoreOportunidade`/vizinhança.

## Resultado da suite completa de testes

```
node --test "tests/*.test.mjs"
ℹ tests 101
ℹ pass 101
ℹ fail 0
```

79 testes pré-existentes + 22 novos (`tests/predio.test.mjs`) — zero regressão.

## Decisions Made
- Guarda defensiva em `resumoPredio` (recomendação do checker, não estava explícita nas fórmulas originais do `<action>`): só soma `__est` na média/faixa quando **ambos** `lo>0` e `hi>0` — protege o invariante "os 3 campos de estimativa existem juntos ou nenhum existe" mesmo com entrada corrompida como `{lo:undefined,hi:100}`.
- Ajuste pontual no harness de teste (não na implementação): `assert.deepEqual` entre o objeto retornado pela função executada via `node:vm` e um objeto literal do módulo de teste falhava por diferença de prototype cross-realm apesar do conteúdo idêntico — resolvido comparando `{...r}` (spread no realm do teste) em vez do objeto original do sandbox.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Guarda contra `__est` parcialmente malformado em `resumoPredio`**
- **Found during:** Task 1 (escrita dos testes, seguindo a recomendação explícita do checker nas `<critical_notes>`)
- **Issue:** A fórmula original do `<action>` (`list.filter(u=>u.__est)`) contaria uma unidade com `__est:{lo:undefined,hi:100}` como válida, produzindo `NaN` em `faixaLo`/quebrando o invariante "estimadoMedio/faixaLo/faixaHi existem juntos ou nenhum" com entrada suja.
- **Fix:** Filtro alterado para `list.filter(u=>u.__est&&u.__est.lo>0&&u.__est.hi>0)` — mesma guarda aplicada em `ordenaUnidades("estimado-asc")`.
- **Files modified:** radar-goiania.html
- **Verification:** teste `estimativaMalformadaParcial` (tests/fixtures.mjs) + teste correspondente em tests/predio.test.mjs — GREEN.
- **Committed in:** `9cf05ac` (Task 2 commit)

**2. [Rule 1 - Bug] Harness de teste: comparação cross-realm em `assert.deepEqual`**
- **Found during:** Task 2 (primeira rodada GREEN, 1 teste falhando apesar de valores idênticos)
- **Issue:** `assert.deepEqual(r, expectLiteral)` onde `r` vem de `node:vm` (realm diferente) falhava com "Values have same structure but are not reference-equal" mesmo com JSON idêntico — quirk de `node:assert/strict` checando prototype de objeto entre realms.
- **Fix:** Comparação ajustada para `assert.deepEqual({ ...r }, expectLiteral)` (spread recria o objeto no realm do teste).
- **Files modified:** tests/predio.test.mjs
- **Verification:** `node --test tests/predio.test.mjs` — 22/22 pass.
- **Committed in:** `9cf05ac` (parte do commit GREEN, arquivo de teste não re-commitado separadamente pois a correção ocorreu antes do commit de Task 2 ser finalizado)

---

**Total deviations:** 2 auto-fixed (1 missing critical/segurança de dados, 1 bug de harness de teste)
**Impact on plan:** Ambos os ajustes são necessários para correção/honestidade dos dados e para a suite de testes funcionar corretamente. Nenhum scope creep — nenhuma função nova, nenhuma mudança de assinatura, nenhuma alteração de UI.

## Issues Encountered
None além das deviations documentadas acima.

## User Setup Required
None - nenhuma configuração de serviço externo necessária (funções 100% puras/client-side).

## Next Phase Readiness
- Wave 2 (12-02) pode chamar `resumoPredio`/`ordenaUnidades`/`ehAptoProvavel`/`analisePredicoTexto` diretamente, sem reabrir esta plan — assinaturas e contrato do campo `__est` travados e documentados acima.
- Nenhum bloqueio identificado. Zero UI foi tocada nesta plan (conforme escopo), então não há nada a verificar visualmente antes da Wave 2 consumir as funções.

---
*Phase: 12-predio-como-objeto-comercial*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: tests/predio.test.mjs
- FOUND: .planning/phases/12-predio-como-objeto-comercial/12-01-SUMMARY.md
- FOUND: d17e472 (Task 1 RED commit)
- FOUND: 9cf05ac (Task 2 GREEN commit)
