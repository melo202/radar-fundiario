---
phase: 15-setor-scan-choropleth-painel-territorio
plan: 01
subsystem: territorio-scan-estatistica
tags: [node-vm-test-harness, arcgis-jsonp, tdd, lgpd-allowlist, quantis]

# Dependency graph
requires:
  - phase: 09-comparaveis-mercado
    provides: "quant() (interpolação de quantil, 3758) e o padrão CMPCACHE/capCache (3757/2186) usados como referência de fórmula/cache"
  - phase: 13-linguagem-visual-pinos
    provides: "padrão de função pura de status (statusDeUnidade) já dentro do bloco RADAR_PURE, mesmo estilo replicado aqui"
provides:
  - "8 funções puras de estatística de território (pm2Lote, quantilAmostra, breaksQuantil, binQuantil, anoMedianoCadastro, mixUso, estatTerritorio, rotuloAmostra) dentro do bloco RADAR_PURE"
  - "territorioScan(cdbairro) compartilhado: cache de sessão (TERRCACHE), dedupe de promise em voo, orçamento HARD ≤3 páginas paginadas, fallback automático outFields restrito→*"
  - "tests/territorio.test.mjs (loader RADAR_PURE + loader TERR_NET com stubs de rede) e TERR_FIX em tests/fixtures.mjs"
affects: ["15-02-choropleth", "15-03-painel-territorio"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Slice-por-linha de um segundo bloco marcado (TERR_NET_START/END) testado via node:vm com dependências de rede (jsonp/sanitiza/capCache/toast) injetadas como stubs no sandbox — primeiro teste da Fase 15 a mockar uma função assíncrona de rede"
    - "Fallback outFields restrito→* via try/catch em uma função interna (varrePaginas), reexecutada uma única vez com outFields:\"*\" quando a 1ª tentativa lança (d.error OU exceção do jsonp real) — nunca trava o scan"
    - "Relocação (não duplicação) de uma tabela de domínio (USO) para dentro do bloco testável RADAR_PURE quando uma função pura nova precisa alcançá-la — mesmo raciocínio já documentado para quant() em 15-RESEARCH.md Pitfall 3"

key-files:
  created:
    - tests/territorio.test.mjs
  modified:
    - radar-goiania.html
    - tests/fixtures.mjs

key-decisions:
  - "outFields restrito adotado como padrão de territorioScan (não outFields=*), com fallback automático — divergência intencional documentada no PLAN (verificação ao vivo 2026-07-09 provou que o quirk antigo 'só outFields=* funciona' está superado)"
  - "USO movido de fora do bloco RADAR_PURE (linha 1117 original) para dentro dele — única fonte de verdade, necessário para mixUso ser visível ao harness de teste"
  - "fetchWhereRestrito usa try/catch (não só checagem de d.error) para acionar o fallback — cobre tanto o caso em que o servidor devolve d.error no payload quanto o caso real em que jsonpOnce já REJEITA a promise ao ver d.error (a implementação real de jsonp lança, não retorna d.error silenciosamente)"

requirements-completed: [TERR-01, TERR-03]

# Metrics
duration: ~15min
completed: 2026-07-09
---

# Phase 15 Plan 01: Setor-Scan Compartilhado (fundação estatística e de rede) Summary

**8 funções puras de estatística de território (R$/m², quantis, mix de uso, idade de cadastro) dentro do bloco RADAR_PURE + territorioScan(cdbairro) compartilhado com cache/dedupe/orçamento ≤3 páginas e fallback automático de outFields, ambos cobertos por TDD (node:vm slice, sem rede real em `npm test`).**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 (ambas TDD: RED → GREEN)
- **Files modified:** 3 (`radar-goiania.html`, `tests/fixtures.mjs`, `tests/territorio.test.mjs`)
- **Tests:** 108 → 120 (12 novos, todos verdes)

## Accomplishments

- Task 1: 8 funções puras de estatística de território nascidas dentro do bloco `RADAR_PURE_START`/`RADAR_PURE_END` — `pm2Lote`, `quantilAmostra`, `breaksQuantil`, `binQuantil`, `anoMedianoCadastro`, `mixUso`, `estatTerritorio`, `rotuloAmostra` — cobertas por 8 testes e fixtures dedicadas (`TERR_FIX`) que exercitam as bordas de honestidade exigidas (areaedif null vs 0 vs ausente; `dtinclusao` válido/sentinela/ausente; mix com >3 usos).
- Task 2: bloco novo `TERR_NET_START`/`TERR_NET_END` com `TERR_FIELDS` (allowlist exata, nunca `dtnascimen`), `TERRCACHE` (cache de sessão, teto 30), `fetchWhereRestrito` (paginação com outFields restrito + fallback automático para `*`), `territorioScanRun` (amostra paginada + `returnCountOnly` em paralelo, orçamento HARD ≤3 páginas) e `territorioScan` (dedupe de promise em voo + coerção numérica de `cdbairro`), cobertos por 4 testes assíncronos com `jsonp`/`sanitiza`/`capCache`/`toast` stubados.
- Divergência intencional do CONTEXT.md honrada e testada: `outFields` restrito é o caminho padrão (não `outFields=*`), com fallback automático comprovado por teste (payload ~80% menor quando o restrito funciona).

## Task Commits

Cada task foi commitada atomicamente (TDD: RED → GREEN em commits separados):

1. **Task 1: Funções puras de estatística de território (GREEN)** — `9e3b89c` (feat)
2. **Task 2: territorioScan compartilhado — testes falhando (RED)** — `f269b83` (test)
3. **Task 2: territorioScan compartilhado — implementação (GREEN)** — `cf924c5` (feat)

_Nota: Task 1 já nasceu GREEN em um único commit porque o RED (tests/fixtures ainda sem as funções) foi validado localmente antes do commit, sem necessidade de um commit intermediário isolado — Task 2 seguiu RED/GREEN em 2 commits distintos por envolver um bloco de rede novo (infraestrutura de mock ainda inexistente no repo)._

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified

- `radar-goiania.html` — 8 funções puras novas dentro de `RADAR_PURE` (linhas ~2011-2110, bloco cresceu); `USO` relocado para dentro do bloco; bloco novo `TERR_NET_START`/`TERR_NET_END` (~linha 2700-2762) com `TERR_FIELDS`/`TERRCACHE`/`fetchWhereRestrito`/`territorioScanRun`/`territorioScan`.
- `tests/territorio.test.mjs` — novo; `loadPureBlock()` (mesmo padrão de `tests/scores.test.mjs`) + `loadNetBlock()` (novo padrão de mock de rede via `node:vm` com stubs injetados no sandbox); 12 testes.
- `tests/fixtures.mjs` — `TERR_FIX` novo: `pm2Lote`, `quantilAmostra`, `breaksQuantilCasos`, `binQuantilCasos`, `anoMedianoCadastroCasos`, `mixUsoCasos`, `estatTerritorioCasos`, `rotuloAmostraCasos`.

## Decisions Made

- **outFields restrito como padrão** (não `outFields=*`): a pesquisa (15-RESEARCH.md) verificou AO VIVO em 2026-07-09 que o quirk documentado anteriormente ("só `outFields=*` funciona") está superado — uma consulta paginada normal com `outFields` restrito a 13 campos retornou HTTP 200 com ~80% menos payload. `territorioScan` adota o restrito com fallback automático, nunca assumindo estabilidade absoluta.
- **USO relocado para dentro do bloco RADAR_PURE**: a função pura nova `mixUso` precisa da tabela de domínio `USO` (rótulos de uso do imóvel) para rodar corretamente dentro do harness de teste (`node:vm` só vê o texto fatiado entre os marcadores). Em vez de duplicar o objeto (que criaria duas fontes de verdade), a declaração original (linha 1117) foi movida para dentro do bloco — é o mesmo `<script>` global, nenhuma outra função é afetada (todas as ~9 outras referências a `USO` no arquivo ficam depois da nova posição, portanto continuam resolvendo normalmente em runtime).
- **fetchWhereRestrito usa try/catch em torno de um loop de paginação interno**, não só uma checagem de `d.error` no valor resolvido: a implementação real de `jsonp`/`jsonpOnce` (linha ~2065) já REJEITA a promise quando o payload trai `d.error` (não resolve com o objeto de erro) — então o fallback precisa reagir tanto a uma exceção real quanto (defensivamente) a um `d.error` que eventualmente chegue resolvido. Essa é uma extensão de robustez sobre o texto literal do plano (que só menciona checar `d.error`), mantendo o espírito "nunca trava o scan" com um único reinício por chamada.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Relocação de `USO` para dentro do bloco RADAR_PURE**
- **Found during:** Task 1 (implementação de `mixUso`)
- **Issue:** `mixUso` (nova função pura) precisa mapear código de uso → rótulo via `USO`, mas `USO` estava declarado fora do bloco `RADAR_PURE_START`/`RADAR_PURE_END` (linha 1117) — o harness `node:vm` do loader de teste só executa o texto entre os marcadores, então `USO` seria `ReferenceError` dentro do sandbox.
- **Fix:** Movida a declaração `const USO={...}` de fora do bloco para logo após o marcador `RADAR_PURE_START` (antes de `mixUso` usá-la) — relocação, não duplicação; única fonte de verdade preservada.
- **Files modified:** `radar-goiania.html`
- **Verification:** `npm test` 116/116 (depois 120/120) verde; nenhuma das ~9 outras referências a `USO` no arquivo (todas depois da nova posição) foi afetada.
- **Committed in:** `9e3b89c` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Fallback de outFields cobre exceção real do jsonp, não só `d.error` resolvido**
- **Found during:** Task 2 (implementação de `fetchWhereRestrito`)
- **Issue:** O texto do plano descreve o fallback como "se qualquer página devolver `d.error`" (checagem no valor resolvido), mas a implementação real de `jsonpOnce` (linha ~2065, já em produção) REJEITA a promise nesse caso — nunca resolve com `d.error`. Uma implementação que só checasse `d.error` no valor resolvido nunca acionaria o fallback em produção real (só nos testes com stub).
- **Fix:** `fetchWhereRestrito` envolve o loop de paginação (`varrePaginas`) em `try/catch`, cobrindo tanto uma exceção lançada (`jsonp` real) quanto um `d.error` resolvido (usado pelo stub de teste) — um único reinício com `outFields:"*"` em qualquer dos dois casos.
- **Files modified:** `radar-goiania.html`
- **Verification:** teste "fallback automático outFields restrito -> *" verde com stub que resolve `{error:...}`; comportamento também correto contra a semântica real de `jsonp` (rejeição), verificado por leitura de código (linha ~2065).
- **Committed in:** `cf924c5` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 2 - missing critical functionality para o harness de teste funcionar corretamente e para o fallback ser efetivo em produção real, não só no mock)
**Impact on plan:** Ambos os ajustes são necessários para a corretude do teste/produção; nenhum scope creep — a interface pública (`territorioScan`, `estatTerritorio`, etc.) e os nomes de função permanecem exatamente como especificados no plano.

## Issues Encountered

- **Cross-realm array identity em `assert.deepStrictEqual`**: o teste de `mixUso` inicialmente comparava arrays devolvidos pelo `vm.Script` sandbox (loader `loadPureBlock`) contra arrays literais do arquivo de teste (main realm) — `node:assert/strict` sinalizou "Values have same structure but are not reference-equal" mesmo com conteúdo idêntico. Resolvido normalizando o retorno via `JSON.parse(JSON.stringify(...))` antes da comparação (converte para o realm principal). Não é um bug do app, é uma particularidade de comparar objetos entre dois `vm.Context` distintos — documentado inline no teste para não confundir futuras manutenções.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plano 02 (Choropleth, TERR-02) pode consumir `estatTerritorio`/`breaksQuantil`/`binQuantil` diretamente — os cortes de quantil já vêm prontos para alimentar `baiStyle()`/`lotStyle()`.
- Plano 03 (Painel do Território, TERR-03) pode chamar `territorioScan(cdbairro)` uma única vez e derivar todas as métricas exigidas (`estatTerritorio`) + o rótulo de honestidade (`rotuloAmostra`) sem nenhuma requisição de rede adicional.
- Gap conhecido (não bloqueante para este plano, herdado do 15-RESEARCH.md): o lookup `id↔cdbairro` (Pattern 4, `bairros-goiania.recon.json`) ainda não foi promovido a asset de runtime — é pré-requisito do Plano 02 (Choropleth) para saber qual polígono pintar, não deste plano.
- Verificação AO VIVO do orçamento real de requisições (contagem de página via DevTools Network no Setor Bueno) continua como HUMAN-UAT não-bloqueante, conforme já sinalizado em STATE.md/ROADMAP — os testes deste plano cobrem o contrato via mock, não a rede real.

---
*Phase: 15-setor-scan-choropleth-painel-territorio*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: tests/territorio.test.mjs
- FOUND: radar-goiania.html
- FOUND: tests/fixtures.mjs
- FOUND commit: 9e3b89c
- FOUND commit: f269b83
- FOUND commit: cf924c5
