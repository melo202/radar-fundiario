---
phase: 09-ficha-conclusao-comercial-scores
verified: 2026-07-07T18:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Abrir a ficha de um imóvel em mobile (375px, bottom-sheet) e desktop (1280px, card sobre mapa) e confirmar visualmente a ordem: identificação → faixa de valor (maior elemento tipográfico) → scores → leitura prática → ações (1 primária destacada em --accent + 2 secundárias) → comparáveis → accordion Dados técnicos (recolhido) → accordion Metodologia (recolhido)"
    expected: "Faixa de valor visualmente maior/mais destacada que qualquer número em .dgrid; botão 'Gerar documento' com fundo --accent e texto branco visivelmente diferente das 2 ações secundárias; .dscores empilha em 375px sem overflow horizontal"
    why_human: "Verificação visual de hierarquia tipográfica, contraste e responsividade não é auditável por grep/string-index"
  - test: "Clicar/Tab+Enter nos cards de score (oportunidade e confiança) e confirmar que o 'por quê' expande com aria-expanded sincronizado e chevron ▸→▾; testar Tab por todos os <details> novos (Mais opções, Dados técnicos, Metodologia, Ver metodologia dos comparáveis) com teclado apenas"
    expected: "Foco visível (outline --accent) em cada elemento tocável; Enter/Space alternam o estado; nenhuma trap de foco"
    why_human: "Navegação por teclado e foco visível não são auditáveis estaticamente — requer interação real no browser"
  - test: "Testar um imóvel com poucos comparáveis (n<3) e um imóvel sem venal/sem tabela de bairro, confirmando que a ficha nunca mostra número inventado e que os textos de fallback aparecem exatamente como especificado"
  - test: "Rodar o fluxo completo end-to-end: abrir ficha → clicar 'Analisar vizinhança' → aguardar compare() concluir → confirmar que #dScores/#dLeitura atualizam com o score REAL (sem reabrir a ficha) e que o percentual no card de score é IDÊNTICO ao percentual da frase-conclusão em #dComps"
    expected: "Mesmo número, mesma direção (abaixo/acima) nas duas superfícies após compare() concluir, sem re-fetch/re-render da ficha inteira"
    why_human: "Requer execução real no browser com rede (compare() faz fetch ArcGIS) — não simulável por leitura estática do HTML"
---

# Phase 9: Ficha = Conclusão Comercial + Scores Verification Report

**Phase Goal:** A ficha responde "quanto vale, qual a oportunidade e o que fazer" antes de mostrar dado técnico — tudo determinístico e explicável.
**Verified:** 2026-07-07T18:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ficha reordena: identificação → faixa de valor → score oportunidade → score confiança → leitura prática → ações → comparáveis → dados técnicos (accordion) → metodologia (fim) | ✓ VERIFIED | `#detail` DOM order confirmed by string-index: dTag(404)<dAddr(431)<dInsc(472)<dValor(517)<dScores(564)<dLeitura(613)<dActsPrim(659)<maisopcoes(699)<dComps(856)<dtecnico(899)<dmetodologia(1137) |
| 2 | Score de oportunidade (0-100) por REGRA com "por quê" visível, nunca caixa-preta/LLM | ✓ VERIFIED | `scoreOportunidade(myPm2,stats,flags)` in RADAR_PURE block, pure function, percentile-interpolation formula documented in comment; `porque[]` always populated; tested by 6 fixtures incl. 3 null cases |
| 3 | Score de confiança (alta/média/baixa) por completude, com "por quê", admite incerteza | ✓ VERIFIED | `scoreConfianca(inputs)` never returns null, always returns `{nivel,porque}` citing concrete pendências (`"faltou a área confirmada"`, `"valor venal não informado"`, `"poucos comparáveis (${n})"`) |
| 4 | Leitura prática por template determinístico; jargão só em "ver metodologia" | ✓ VERIFIED | `leituraPratica(inputs)` returns enumerated templates; zero occurrence of "mediana/percentil/quartil" in its output strings (verified by fixture `expectNotContains`); fallback "Dados insuficientes..." confirmed exact match |
| 5 | Comparáveis com conclusão primeiro, estatística recolhida, termina com ação | ✓ VERIFIED | `renderComps()` body: `cmp-conclusao` at offset 1829 < `cmp-detalhe`/`.h">Vizinhança` at offset 2088+; "Ver metodologia" button (44px) opens `<details class="cmp-detalhe">` |
| 6 | Zero regressão de dados (venal=0→"não informado", áreas/uso corretos) e a11y (foco/accordion navegável) | ✓ VERIFIED (code-level) | `venalTxt=v=>(v>0)?brl(v):"não informado"` unchanged; DCUR guards preserved in `renderComps`/`atualizarScores`; `<details>`/`<summary>` native keyboard nav (no custom JS needed) — a11y **behavioral** confirmation requires human test (see Human Verification) |

**Score:** 6/6 truths verified at code level (1 truth carries a human-verification companion for behavioral/visual confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` (RADAR_PURE block) | `scoreOportunidade`, `scoreConfianca`, `leituraPratica` each exactly once | ✓ VERIFIED | Confirmed via `node --test`; functions present, documented with formula comments |
| `tests/fixtures.mjs` | Fixtures for score/confiança/leitura incl. "sem base" cases | ✓ VERIFIED | 3 keys added (`scoreOportunidade`, `scoreConfianca`, `leituraPratica`), obligatory cases present (8% below median, null cases, `areaOk:false+nComps:6→"media"`) |
| `tests/scores.test.mjs` | Native node:test suite via node:vm loader | ✓ VERIFIED | 3 suites, all passing, same loader pattern as `busca.test.mjs` |
| `#detail` HTML structure | Reordered containers | ✓ VERIFIED | Order confirmed by string-index (see Truth #1) |
| `showDetail()` | Populates dValor/dScores/dLeitura/dActsPrim/dActsMore/dMetodologia | ✓ VERIFIED | All containers populated; calls `scoreConfianca(`/`scoreOportunidade(`/`leituraPratica(`/`renderScoresInto(` |
| `renderComps()` | Conclusão-primeiro (CMP-01) | ✓ VERIFIED | `.cmp-conclusao` before `.cmp-detalhe`; identical stat calc preserved (`r`/`conf`/`px`/`fx`/`cEff`/`pctl` untouched) |
| `atualizarScores(a, statsR)` | Implemented (not stub), closes Wave2→Wave3 wiring | ✓ VERIFIED | Real implementation with `DCUR` guard, calls `scoreConfianca`/`scoreOportunidade` with real stats, reuses `renderScoresInto` (no template duplication) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `tests/scores.test.mjs` | `radar-goiania.html` RADAR_PURE block | `node:vm` loader, line-slice between markers | ✓ WIRED | Confirmed by passing test run |
| `showDetail()` | `scoreOportunidade`/`scoreConfianca`/`leituraPratica` | direct call with computed inputs | ✓ WIRED | `scoreConfianca(`/`scoreOportunidade(`/`leituraPratica(` all present in `showDetail()` body |
| `#dActsPrim` | `abrirLaudo()` | `onclick="abrirLaudo()"` on `button.primary` | ✓ WIRED | Confirmed, 1 primary button only |
| `renderComps()` | `atualizarScores(a,r)` | direct call after `box.innerHTML=`, with `r.radius=radius` set first | ✓ WIRED | Confirmed order: `r.radius=radius` (offset 1683) before `atualizarScores(` (offset 1820) |
| `atualizarScores(a,statsR)` | `scoreOportunidade` (RADAR_PURE) | call with real `stats={med,q1,q3,n,min,max}` and `{radius:statsR.radius}` | ✓ WIRED | `statsR.radius` now populated (fix WR-02 confirmed) — no longer always-400 bug |
| `.cmp-detalhe summary` | full stat block (bar/lbl/pos/mkt) | `<details>` reuse of `.foot` pattern | ✓ WIRED | Identical calc preserved inside accordion |

### Mandatory Gate Results

| # | Gate | Result |
|---|------|--------|
| 1 | `node --test "tests/*.test.mjs"` | ✓ PASS — 34 tests, 34 pass, 0 fail |
| 2 | Ficha DOM order (dValor→dScores→dLeitura→dActsPrim→dActsMore(details)→dComps→dtecnico(details)→dmetodologia(details)) | ✓ PASS — string-index strictly increasing |
| 3 | Honesty invariant (null→"Sem base para estimar" no number; scoreConfianca cites concrete pendências; venalTxt intact) | ✓ PASS — `renderScoresInto` shows `"Sem base para estimar"` with no `score-num` when `op` is null; `scoreConfianca` porque[] always cites named items; `venalTxt` unchanged |
| 4 | Consistency invariant (`\|myPm2-med\|/med*100` in both `scoreOportunidade.porque[]` and `renderComps.conclusaoTxt`; no percentile-rank leak) | ✓ PASS — identical formula in both locations; `pctl` confined to `.pos` line only, absent from `conclusaoTxt` section |
| 5 | Lei da tela (exactly 1 `button.primary` in `#dActsPrim` + 2 secondary; rest in `details.maisopcoes`) | ✓ PASS — 1 `class="primary"` occurrence in `showDetail()` body; 2 secondary buttons confirmed; rest (custos/CND/copiar link/mapas) in `#dActsMore` |
| 6 | `esc()`/inline-onclick contract on new render paths; DCUR guard in `renderComps` AND `atualizarScores` | ✓ PASS — `esc(estM.metodo)`, `esc(leituraPratica(...))`, `esc(op.porque...)`, `esc(conf.porque...)` all confirmed; `inscUse=esc(insc\|\|ci)` preserved; `DCUR!==a` guard present in both `renderComps` (mid-function, pre-DOM-write) and `atualizarScores` (function head) |

### Review Fixes Verification (09-REVIEW.md → 09-REVIEW-FIX.md)

| Finding | Fix Expected | Status | Evidence |
|---------|-------------|--------|----------|
| WR-01: `.primary` only styled `a.primary`, button rendered unstyled | CSS extended to `button.primary` | ✓ VERIFIED | `.detail .acts a.primary,.detail .acts button.primary{background:var(--accent);...}` present with `/* WR-01 */` comment, commit `70002d5` |
| WR-02: `atualizarScores` read non-existent `statsR.radius`, always fell back to hardcoded 400 | `r.radius=radius` set in `renderComps` before `atualizarScores(a,r)` call | ✓ VERIFIED | `r.radius=radius;` at offset 1683, `atualizarScores(a, r);` at offset 1820 (radius set first); `atualizarScores` reads `statsR.radius` correctly |
| IN-01: `<` vs `<=` comparator mismatch between `scoreOportunidade` and `renderComps` | Aligned to `<=` in both | ✓ VERIFIED | `scoreOportunidade`: `const abaixo=myPm2<=med;` with `/* IN-01 */` comment |
| IN-02: "Mercado (estimado)" duplicated in dValor and dGrid | Kept intentionally (not a defect) | ✓ ACCEPTED (documented, no fix needed) | Confirmed in 09-REVIEW-FIX.md as accepted deviation, candidate for Phase 13 cleanup |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| FICHA-01 | 09-02 | Ficha reordena p/ conclusão-primeiro com accordion | ✓ SATISFIED | DOM order + `showDetail()` rewrite confirmed |
| SCORE-01 | 09-01 | Score de oportunidade determinístico e explicável | ✓ SATISFIED | `scoreOportunidade` pure function, tested, null-honest |
| SCORE-02 | 09-01 | Score de confiança por completude, admite incerteza | ✓ SATISFIED | `scoreConfianca` pure function, tested, always cites pendências |
| LEIT-01 | 09-01 | Leitura prática template determinístico, sem jargão | ✓ SATISFIED | `leituraPratica` pure function, tested, jargon-free confirmed |
| CMP-01 | 09-03 | Comparáveis conclusão primeiro, estatística recolhida | ✓ SATISFIED | `renderComps()` rewrite confirmed, order verified |

No orphaned requirements — all 5 requirements mapped to Phase 9 in REQUIREMENTS.md are claimed by one of the 3 plans and satisfied.

### Anti-Patterns Found

None. Scan of `radar-goiania.html` for TODO/FIXME/PLACEHOLDER/"not implemented"/empty-handler patterns in the Phase 9 code paths (showDetail, renderScoresInto, toggleScoreWhy, atualizarScores, renderComps, abrirMetodologiaCmp) found only legitimate HTML `placeholder=` input attributes (unrelated to stub detection) and code comments referencing "metodologia" (feature name, not an incomplete-implementation marker). No stub returns (`return null`/`return {}` used only as intentional honest null-contract, already covered by the honesty invariant gate).

### Behavioral Spot-Checks

Skipped — this is a static HTML/JS app with no build step and no local server readily startable within the verification budget; the score functions are already spot-checked via the full `node --test` suite (34/34 pass), which exercises the exact runtime code path (`node:vm` over the same `<script>` block used in the browser). The remaining behavioral surface (DOM rendering, click handlers, network-dependent `compare()`) requires a real browser — routed to Human Verification below.

### Human Verification Required

1. **Visual hierarchy and responsive layout (mobile 375 / desktop 1280)**
   - Test: Open a property's ficha in both viewport sizes, confirm the visual order and that `.dvalor-v` is visibly the largest text element, `.dscores` wraps correctly at 375px, and `button.primary` shows accent background/white text distinctly from the 2 secondary buttons.
   - Expected: Matches 09-UI-SPEC.md Component 1/2/4 exactly; no horizontal scroll; no visual regression to grab/backlist/z-index.
   - Why human: Visual rendering, contrast, and responsive breakpoints are not auditable via string/grep.

2. **Keyboard navigation and focus visibility**
   - Test: Tab through the new `.score` buttons and all new `<details>` elements (`maisopcoes`, `dtecnico`, `dmetodologia`, `cmp-detalhe`); activate with Enter/Space.
   - Expected: Visible focus outline (`--accent`, 2px), `aria-expanded` toggles correctly, chevron flips ▸→▾, no focus trap.
   - Why human: Requires live interaction in a browser; cannot be confirmed by static file inspection.

3. **Honest-fallback states with real/synthetic data**
   - Test: Load a property with `n<3` comparables and one with no `vlvenal`/no bairro table, confirm the ficha never invents a number and shows the exact fallback copy.
   - Expected: `.dvalor-v.muted` "Sem base para estimar"; `.score` shows "Sem base para estimar" with no number; `.dleitura` shows "Dados insuficientes...".
   - Why human: While the pure functions are unit-tested, the end-to-end DOM wiring under real/degraded ArcGIS responses needs a live run.

4. **End-to-end score/comparables consistency after `compare()` completes**
   - Test: Open a ficha, click "Analisar vizinhança", wait for `compare()` to resolve, confirm `#dScores`/`#dLeitura` update in place (no re-fetch/re-open) and that the percentage shown in the score "por quê" matches exactly the percentage in the comparables conclusion phrase.
   - Expected: Same number, same direction (abaixo/acima), in both surfaces, matching the documented sanity case (myPm2=4600, med=5000 → "8% abaixo" in both).
   - Why human: Requires live network round-trip (`compare()` → ArcGIS) — not simulable via static file inspection.

### Gaps Summary

No code-level gaps found. All 6 mandatory verification gates pass, all 3 code-review fixes (WR-01, WR-02, IN-01) are confirmed present in the source, the 4th finding (IN-02) was explicitly accepted as intentional (not a defect). All 5 Phase 9 requirements (FICHA-01, SCORE-01, SCORE-02, LEIT-01, CMP-01) are satisfied with concrete evidence traced to source lines. The test suite is green (34/34).

Status is `human_needed` rather than `passed` strictly because visual/device/keyboard/network-dependent behaviors — explicitly out of reach for static verification — remain to be confirmed by a human in a live browser session, per the phase's own UI-SPEC verification checklist (mobile 375 + desktop 1280, contrast AA, keyboard focus, end-to-end score consistency after `compare()`). None of these are expected to fail based on the code inspected; they are routine confirmation steps, not open implementation gaps.

---

_Verified: 2026-07-07T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
