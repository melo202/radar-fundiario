---
phase: 17-diff-cadastro-cruzamento-caixa
plan: 01
subsystem: territorio
tags: [diff, caderno, caixa, indexeddb, lgpd, matching, radar-pure]

# Dependency graph
requires:
  - phase: 16-detector-subutilizado-farming-caderno
    provides: "Caderno de território em IndexedDB (radar_territorio, store caderno keyPath ci), sanitizeCaderno/CADERNO_ALLOW/validarImportCaderno (allowlist positiva anti-PII), cadernoTem/cadernoAtualizar/cadernoSalvar (WR-02 db.close())"
provides:
  - "diffLote(snap,atual,opts) — compara os 5 campos de DIFF_ALLOW (vlvenal/vlimp98 pct>=1%, areaedif com subtipos nova/demolicao/aumentou/diminuiu, uso/dtinclusao categorico); nunca lanca"
  - "formatarDiff(mudancas,dataFmt) — frases comerciais exatas do UI-SPEC, rotulo de uso via USO[...]"
  - "construirNomeParaCdbairro/cdbairroDoImovelCaixa/cruzarCaixaTerritorio/cruzarCaixaSetor — matching exato (norm()) de CAIXA.imoveis[].b -> cdbairro fiscal, colisao resolvida via Set, guard i.x&&i.y"
  - "sanitizeCaderno com allowlist RECURSIVA do sub-objeto snapshot (DIFF_ALLOW); CADERNO_ALLOW estendida com snapshot/snapshotAt"
  - "cadernoBuscar(ci) — I/O nova, irmã de cadernoTem, resolve com o item completo"
  - "salvarNoCadernoUI(): 1o save grava snapshot inicial (5 campos) + snapshotAt"
affects: [17-02-diff-cadastro-cruzamento-caixa-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Allowlist RECURSIVA para sub-objeto aninhado (snapshot) — a allowlist de topo (CADERNO_ALLOW) so filtra CHAVE; sanitizeCaderno agora reconstroi o conteudo aninhado campo-a-campo por uma 2a allowlist (DIFF_ALLOW), nunca copia o objeto bruto"
    - "Matching exato pos-norm() com resultado em Set (nunca valor unico) para colisao nome->multiplos codigos"
    - "Comparacao de threshold pct usa o valor BRUTO (antes de Math.round) contra a constante nomeada — arredondamento so ocorre para exibicao, evitando que 0.5% seja promovido a 1% por Math.round"

key-files:
  created:
    - tests/diff-caixa.test.mjs
  modified:
    - radar-goiania.html
    - tests/fixtures.mjs
    - tests/caderno.test.mjs

key-decisions:
  - "Sem bump de CADERNO_VERSION — snapshot e campo embutido no item (item.snapshot+item.snapshotAt), IndexedDB nao tem schema de valor fixo; comentarios obsoletos das linhas 3308/3278 (pre-fase) substituidos por nota explicando a nao-necessidade do bump"
  - "Match de bairro Caixa so exato-normalizado (norm()), nunca fuzzy — honestidade sobre recall (74% medido no RESEARCH); nome->multiplos cdbairro tratado como Set de candidatos, match se QUALQUER um bater (some())"
  - "cb (codigo interno da Caixa) ignorado para efeito de cruzamento — nao corresponde ao cdbairro fiscal do app (Pitfall 2 do RESEARCH)"

patterns-established:
  - "diffLote/formatarDiff/matching-Caixa 100% RADAR_PURE, TDD via node:vm — nenhuma logica de decisao nova fora do bloco testavel"

requirements-completed: [TERR-06, TERR-07]

# Metrics
duration: 10min
completed: 2026-07-09
---

# Phase 17 Plan 01: Núcleo de Dados — Diff de Cadastro & Cruzamento Caixa Summary

**Funções puras TDD de diff de cadastro (venal/IPTU/área/uso/data) e de matching Caixa→cdbairro com defesa LGPD recursiva no snapshot do Caderno; núcleo 100% testável, zero UI.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-09T23:17Z (após commit de plan-check)
- **Completed:** 2026-07-09T23:27:33-03:00
- **Tasks:** 3/3 completos
- **Files modified:** 4 (1 criado: `tests/diff-caixa.test.mjs`; 3 modificados)

## Accomplishments
- `diffLote`/`formatarDiff` no RADAR_PURE — diff enxuto e comercial dos 5 campos de `DIFF_ALLOW`, com thresholds nomeados (`DIFF_THRESH_PCT=1`, `DIFF_THRESH_AREA_M2=1`), nunca lança mesmo com dado incompleto
- `construirNomeParaCdbairro`/`cdbairroDoImovelCaixa`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor` — cruzamento honesto (match exato, `[]` sem falso positivo) do texto livre `CAIXA.imoveis[].b` contra `cdbairro` fiscal, com colisão nome→múltiplos códigos resolvida via `Set`
- `sanitizeCaderno` ganhou allowlist RECURSIVA para o sub-objeto `snapshot` (T-17-01/Pitfall 5) — `dtnascimen`/`cpf` dentro do snapshot nunca sobrevivem, mesmo com a chave de topo liberada em `CADERNO_ALLOW`
- `cadernoBuscar(ci)` (I/O nova) e snapshot inicial gravado no 1º save (`salvarNoCadernoUI`)

## Task Commits

Each task was committed atomically:

1. **Task 1: diffLote + formatarDiff (RADAR_PURE, TDD)** - `e9e99e7` (feat)
2. **Task 2: Matching Caixa → cdbairro + cruzamento (RADAR_PURE, TDD)** - `4d631e0` (feat)
3. **Task 3: Snapshot LGPD + cadernoBuscar + 1º save** - `55620d7` (feat)

**Plan metadata:** (este commit) `docs(17-01): complete núcleo de dados plan`

_Nota: as 3 tasks seguiram o ciclo RED→GREEN completo (guarda de teste ausente → `npm test` falha → implementação → `npm test` verde) dentro do mesmo commit `feat`, já que cada task já entregava a feature funcional de ponta a ponta (sem etapa de refactor separada)._

## Files Created/Modified
- `radar-goiania.html` - `diffLote`/`formatarDiff`/`construirNomeParaCdbairro`/`cdbairroDoImovelCaixa`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor` no bloco RADAR_PURE; `CADERNO_ALLOW` estendida; `sanitizeCaderno` com allowlist recursiva de `snapshot`; `cadernoBuscar(ci)` na camada CADERNO_IO; `salvarNoCadernoUI()` grava snapshot inicial; comentários obsoletos de `CADERNO_VERSION`/`onupgradeneeded` atualizados
- `tests/diff-caixa.test.mjs` (novo) - cobertura TDD de diff/matching/cruzamento via `node:vm` (mesmo padrão de `caderno.test.mjs`)
- `tests/fixtures.mjs` - `DIFF_FIX`/`FORMATAR_DIFF_FIX`/`CAIXA_MATCH_FIX` (nomes reais de `caixa-goiania.js`) + 6 fixtures novas em `CADERNO_FIX` (snapshot válido/PII/malformado/retrocompatível/import)
- `tests/caderno.test.mjs` - 8 testes novos de `sanitizeCaderno`/`validarImportCaderno` com sub-objeto `snapshot`

## Decisions Made
- Sem bump de `CADERNO_VERSION` (permanece 1) — snapshot é campo embutido, não store novo; decisão já recomendada pelo RESEARCH e ratificada aqui, com os comentários de código correspondentes atualizados
- Comparação de threshold percentual usa o valor bruto (não arredondado) contra `DIFF_THRESH_PCT`, arredondando (`Math.round`) só para exibição — evita que 0,5% seja promovido a 1% e cruze o limiar por erro de arredondamento
- `cb` da Caixa permanece ignorado para cruzamento (não é `cdbairro` fiscal); matching feito exclusivamente via `norm(b)` contra `nm_disp`/`nm_bai`

## Deviations from Plan

None - plan executado exatamente como escrito. As únicas adições além do `<action>` literal foram comentários de documentação (nota do `CADERNO_VERSION`/`onupgradeneeded`) já previstas no próprio `<decisions>`/`<action>` do plano.

## Issues Encountered
- Comparações `assert.deepEqual`/`assert.ok(x instanceof Set)` cross-realm (vm sandbox vs. realm do teste) falhavam para arrays vazios e para `Set` mesmo com conteúdo correto — mesmo fenômeno já documentado nos comentários de `caderno.test.mjs`/`territorio.test.mjs` para objetos. Resolvido normalizando a saída via `JSON.parse(JSON.stringify(...))` antes do assert (arrays) e comparando `Object.prototype.toString.call(x)==="[object Set]"` em vez de `instanceof Set`. Nenhuma mudança de produção — só ajuste da forma de asserção no harness de teste.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Núcleo de dados completo e 100% testado (`npm test` 184/184, baseline 141 + 43 novos): `diffLote`, `formatarDiff`, matching/cruzamento Caixa, `sanitizeCaderno` com defesa LGPD recursiva, `cadernoBuscar`, snapshot no 1º save
- Plano 02 (UI) pode consumir estas funções diretamente: hook `renderDiffUI(a)` ao fim de `showDetail()` (usando `clean(a.ci||a.nrinscr)`, NUNCA a variável local `ci` — Pitfall 1 do RESEARCH), badge/linha de cruzamento Caixa no bloco Caderno/painel de setor/popup do pino
- Nenhum bloqueio conhecido para o Plano 02

---
*Phase: 17-diff-cadastro-cruzamento-caixa*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: tests/diff-caixa.test.mjs
- FOUND: .planning/phases/17-diff-cadastro-cruzamento-caixa/17-01-SUMMARY.md
- FOUND: commit e9e99e7 (Task 1)
- FOUND: commit 4d631e0 (Task 2)
- FOUND: commit 55620d7 (Task 3)
