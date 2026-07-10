---
phase: 16-detector-subutilizado-farming-caderno
plan: 01
subsystem: core-logic
tags: [detector, caderno, allowlist, pure-functions, tdd, radar-pure]

# Dependency graph
requires:
  - phase: 15-setor-scan-choropleth-painel-territorio
    provides: territorioScan/TERRCACHE + pm2Lote/quantilAmostra/estatTerritorio (RADAR_PURE) reused zero-requisição
provides:
  - "medianasPorQuadra/limiarQuadraValorizada/razaoOcupacao/detectarSubutilizados/leituraDetector (Detector TERR-04) em RADAR_PURE"
  - "CADERNO_ALLOW/CADERNO_STATUS/sanitizeCaderno/statusValido/validarImportCaderno (decisão do Caderno TERR-05) em RADAR_PURE"
  - "tests/caderno.test.mjs + FIXTURES.DETECTOR_FIX/CADERNO_FIX cobrindo a borda 0-vs-null e a allowlist anti-PII"
affects: [16-02-PLAN (IndexedDB CRUD + UI do Caderno), 16-03-PLAN (UI do Detector + botão Salvar no caderno na ficha)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "razaoOcupacao usa !=null explícito (nunca ||0/?:) — areaedif===0 (vago real) INCLUI, areaedif==null/undefined (dado incompleto) EXCLUI"
    - "sanitizeCaderno é allowlist POSITIVA (CADERNO_ALLOW.forEach + copy), nunca delete de lista negra — modelo inverso e mais forte que SENS/sanitiza()"
    - "validarImportCaderno nunca confia em arquivo externo: valida shape (Array) + sanitiza CADA item antes de aceitar"

key-files:
  created:
    - tests/caderno.test.mjs
  modified:
    - tests/fixtures.mjs
    - radar-goiania.html

key-decisions:
  - "Threshold DETECTOR_RATIO_MAX fixo em 0.15 (constante nomeada e explicável), conforme Claude's Discretion do CONTEXT — upgrade para potencial-do-PD fica para a Fase 18"
  - "Fix cross-realm deepEqual em tests/caderno.test.mjs (medianasPorQuadra/detectarSubutilizados-amostra-insuficiente) via normalização JSON round-trip / assert de length, mesmo padrão já usado por mixUso em territorio.test.mjs"

patterns-established:
  - "Split puro/IO do Caderno: toda lógica de DECISÃO (allowlist, enum, validação de import) vive em RADAR_PURE e é 100% TDD-coberta; a camada IndexedDB real (Plano 02) fica fora do bloco testável"

requirements-completed: [TERR-04, TERR-05]

# Metrics
duration: ~20min
completed: 2026-07-10
---

# Phase 16 Plan 01: Funções Puras do Detector + Decisão do Caderno Summary

**5 funções puras do Detector de Lote Subutilizado (agrupamento por quadra + guarda 0-vs-null) e 3 funções puras de allowlist/validação do Caderno, ambas em RADAR_PURE com TDD RED→GREEN, elevando a suíte de 121 para 136 testes verdes.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 (RED fixtures/harness → GREEN detector → GREEN caderno)
- **Files modified:** 3 (`tests/fixtures.mjs`, `tests/caderno.test.mjs`, `radar-goiania.html`)

## Accomplishments

- Detector de Lote Subutilizado (TERR-04): `medianasPorQuadra`, `limiarQuadraValorizada`, `razaoOcupacao`, `detectarSubutilizados`, `leituraDetector` + constantes `DETECTOR_RATIO_MAX`/`DETECTOR_LIMITE`, reusando `pm2Lote`/`quantilAmostra` já existentes (Fase 15) — zero fórmula nova de mediana.
- Guarda de qualidade do Pitfall 1 (0-vs-null) implementada e testada explicitamente: `razaoOcupacao({areaedif:0,...})===0` (terreno vago, INCLUI) vs `razaoOcupacao({areaedif:null,...})===null` (dado incompleto, EXCLUI) — teste dedicado confirma que os dois resultados NUNCA coincidem.
- Decisão do Caderno (TERR-05): `sanitizeCaderno` (allowlist positiva `CADERNO_ALLOW`), `CADERNO_STATUS` (enum fixo de 5 estados), `statusValido`, `validarImportCaderno` (shape + sanitização por item, nunca confia em arquivo externo).
- `tests/caderno.test.mjs` novo (15 testes) + `FIXTURES.DETECTOR_FIX`/`FIXTURES.CADERNO_FIX` cobrindo agrupamento por quadra, limiar Q3 com `<4`/`>=4` quadras, ordenação/truncamento do detector, e allowlist anti-PII (`dtnascimen`/`cpf`/`nmproprie`/campo inventado nunca sobrevivem).
- `npm test`: 136/136 verde (121 baseline + 15 novos), sem regressão.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): fixtures + harness `tests/caderno.test.mjs` falhando** - `01a0419` (test)
2. **Task 2 (GREEN): funções puras do Detector em RADAR_PURE** - `2dd3612` (feat)
3. **Task 3 (GREEN): funções puras de decisão do Caderno em RADAR_PURE** - `340513a` (feat)

**Plan metadata:** (este commit, docs)

## Files Created/Modified

- `tests/fixtures.mjs` - Adicionadas as chaves `DETECTOR_FIX` (agrupamento por quadra, limiar Q3, borda 0-vs-null, cenário completo de detecção com 5 quadras) e `CADERNO_FIX` (item válido/com PII, import válido/malformado/sem-ci/com-PII)
- `tests/caderno.test.mjs` - Novo harness `loadPureBlock()` (slice por linha do bloco RADAR_PURE via `node:vm`), 15 testes cobrindo detector + caderno
- `radar-goiania.html` - RADAR_PURE ganhou: `DETECTOR_RATIO_MAX`/`DETECTOR_LIMITE` + 5 funções do detector; `CADERNO_ALLOW`/`CADERNO_STATUS` + 3 funções de decisão do caderno (inseridas antes de `RADAR_PURE_END`, depois de `rotuloAmostra`)

## Decisions Made

- Threshold fixo `DETECTOR_RATIO_MAX=0.15` (não relativo/quantil) — mais simples de implementar e explicar em 1 frase de disclosure; documentado como upgrade natural para potencial-do-PD na Fase 18, conforme RESEARCH.md.
- Fixtures do detector usam lotes "background" (5 por quadra valorizada, 3 por quadra de baixo valor) para que a mediana da quadra não seja arrastada pelos lotes-candidato de pm2 baixo (fallback para `areaterr` quando `areaedif` é 0/ausente) — garante números determinísticos e auditáveis no teste, sem depender de aproximação.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comentário JS fechava bloco de comentário prematuramente (`*/` acidental)**
- **Found during:** Task 2 (verificação funcional isolada via `node -e` + `vm.Script`)
- **Issue:** O comentário de `leituraDetector` continha o texto `zap*/captAbordagem`, cuja sequência `*/` fechava o bloco de comentário `/* ... */` no meio da frase, deixando `Fase 14). */` como código JS fora do comentário — `SyntaxError: Unexpected number` ao carregar o bloco RADAR_PURE via `vm.Script`.
- **Fix:** Texto do comentário corrigido para `zapArgumento/captAbordagem` (sem `*/` embutido).
- **Files modified:** `radar-goiania.html`
- **Verification:** Sanity-check isolado via `node -e` com `vm.Script` carregando só o bloco RADAR_PURE confirmou parse OK e resultados corretos (`razaoOcupacao(0)===0`, `razaoOcupacao(null)===null`); `npm test` 136/136 verde após o fix.
- **Committed in:** `2dd3612` (parte do commit da Task 2 — o bug nunca chegou a ser commitado isoladamente, foi corrigido antes do commit)

**2. [Rule 1 - Bug] `assert.deepEqual`/`deepStrictEqual` cross-realm em 2 testes de `caderno.test.mjs`**
- **Found during:** Task 3 (`npm test` completo após implementar as funções do caderno)
- **Issue:** `medianasPorQuadra` (objeto) e `detectarSubutilizados` sobre amostra insuficiente (array vazio) são devolvidos pelo `vm` sandbox — mesmo com conteúdo estruturalmente idêntico, `assert.deepEqual`/`deepStrictEqual` falha cross-realm porque o `[[Prototype]]` do objeto/array vem do realm do sandbox, não do realm principal do teste. Mesmo fenômeno documentado em `territorio.test.mjs` para `mixUso`.
- **Fix:** `medianasPorQuadra` normalizado via `JSON.parse(JSON.stringify(...))` antes do assert; `detectarSubutilizados` (array vazio) trocado para `assert.equal(...length, 0)` (não depende de reference-equality de protótipo).
- **Files modified:** `tests/caderno.test.mjs`
- **Verification:** `npm test` → 136/136, `fail 0`.
- **Committed in:** `340513a` (parte do commit da Task 3)

---

**Total deviations:** 2 auto-fixed (1 bug de sintaxe, 1 bug de harness de teste cross-realm)
**Impact on plan:** Ambos os fixes eram bloqueantes para a suíte verde e foram corrigidos antes de qualquer commit ser criado com o bug presente — nenhum scope creep, nenhuma mudança de comportamento das funções puras em si.

## Issues Encountered

None além dos 2 auto-fixes documentados acima.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Contratos puros do Detector (TERR-04) e da decisão do Caderno (TERR-05) prontos e testados — o Plano 02 (IndexedDB CRUD + UI do Caderno) e o Plano 03 (UI do Detector + botão "Salvar no caderno") podem consumir `detectarSubutilizados`/`leituraDetector`/`sanitizeCaderno`/`statusValido`/`validarImportCaderno`/`CADERNO_STATUS`/`CADERNO_ALLOW` diretamente, sem retrabalho.
- Nenhum bloqueio identificado. A camada de I/O real (IndexedDB) e a UI (botão "Detectar oportunidades", bloco "Meu caderno") permanecem para os Planos 02/03, conforme a decomposição original da pesquisa.

---
*Phase: 16-detector-subutilizado-farming-caderno*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: tests/caderno.test.mjs
- FOUND: tests/fixtures.mjs
- FOUND: radar-goiania.html
- FOUND commit: 01a0419
- FOUND commit: 2dd3612
- FOUND commit: 340513a
