---
phase: 08-busca-unica-inteligente
verified: 2026-07-07T18:30:00Z
status: human_needed
score: 8/8 roadmap success criteria verified
overrides_applied: 0
human_verification:
  - test: "Testar a caixa única em iPhone/Safari real: digitar texto (verificar pointerdown fecha dropdown/menu/chips ao tocar fora), usar o botão de voz (🎤) com permissão de microfone concedida e negada"
    expected: "Dropdown/#correctMenu/#ambigChips fecham ao toque fora (pointerdown, não click); voz preenche a caixa e dispara detectMode; erro de permissão mostra toast 'Não foi possível usar o microfone. Digite sua busca.'"
    why_human: "Comportamento de touch/pointer events e permissão de microfone real só é confiável em dispositivo físico — mecanismo já replica o padrão DOWNEV existente (verificado por leitura de código), mas não foi testado em hardware iOS real nesta verificação"
  - test: "Ler o fluxo completo com leitor de tela (VoiceOver no iPhone/Mac ou NVDA) navegando: caixa → chip de confirmação (role=status aria-live=polite) → menu de correção → chips de desambiguação → dropdown unificado (Setor+Rua)"
    expected: "Cada mudança de estado é anunciada; navegação por Tab/Enter/Escape funciona sem mouse; aria-activedescendant é lido corretamente pelo leitor de tela"
    why_human: "Anúncio de aria-live e ordem de foco de leitor de tela são inerentemente comportamentais — grep confirma os atributos ARIA corretos estão presentes (role=status, aria-live=polite, aria-activedescendant, role=option, aria-selected), mas a experiência real de navegação assistiva exige teste com tecnologia assistiva real"
  - test: "Colar um link real do Google Maps (formato @lat,lng e formato ?q=lat,lng) copiado do app do Google Maps no celular, e testar coordenadas fora da malha de Goiânia"
    expected: "Extrai lat/lon corretamente e cai no mesmo caminho de identificação de lote do clique-no-mapa; coordenada fora da malha mostra 'nenhum lote encontrado' (mesma UX do clique real fora da malha)"
    why_human: "parseGeoPaste tem cobertura de regex verificada por leitura de código (3 formatos suportados, validação de range), mas variações reais de formato de link do app do Google Maps (parâmetros extras, encurtadores de URL) só são cobertas empiricamente com links reais colados de um dispositivo"
  - test: "Validar em amostra real de nomes de rua/prédio de Goiânia (não apenas fixtures sintéticas) que detectMode não gera falsos-positivos nas regras 4 (prédio, prefixo textual) e 6 (prédio com confiança média)"
    expected: "Nomes reais de logradouro/prédio do CNEFE/COMBO não são classificados incorretamente como quadra/lote ou endereço quando deveriam ser prédio, e vice-versa"
    why_human: "08-03-SUMMARY.md e 08-04-SUMMARY.md documentam explicitamente esta pendência como calibração MÉDIA confidence 'a validar contra amostra real' — a fase implementou e testou contra fixtures sintéticas (31 testes automatizados passam), mas nenhuma das 5 plans executou uma validação estatística contra o dataset real completo de ~9.8k logradouros/setores; é um julgamento de qualidade de UX (falso-positivo aceitável vs. não) que exige revisão humana da amostra"
---

# Phase 8: Busca Única Inteligente Verification Report

**Phase Goal:** O corretor busca "de todos os jeitos" numa caixa única, sem perder capacidade nem acessibilidade.
**Verified:** 2026-07-07T18:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Funções puras de matching/detecção com harness de teste (Node+fixtures) ANTES de mudar comportamento, incluindo casos ambíguos (135 sozinho, "Rua 135", "Q135", insc 10 vs 14 díg) | ✓ VERIFIED | `tests/busca.test.mjs`/`tests/fixtures.mjs` created in 08-01 BEFORE 08-02 (fuzzy-fix) and 08-03 (detectMode); `node --test "tests/*.test.mjs"` → 31/31 pass, 0 fail (verified live). All 7 mandatory roadmap cases present as named test blocks. |
| 2 | Digitar em qualquer formato detecta a intenção e mostra chip de confirmação tocável antes de disparar quando a confiança é baixa; nunca assume silenciosamente | ✓ VERIFIED | `#detectChip` (`role="status" aria-live="polite" tabindex="0"`) at radar-goiania.html:538; `detectMode` test `'135' isolado e AMBIGUO, nao decide modo (confianca baixa)` passes; `runDetect()` shows `#ambigChips` and hides chip when `confidence==="baixa"`, never calls `buscar()` automatically in that branch (radar-goiania.html:2705-2708). |
| 3 | Setor na frase funciona; sem setor, assume o último usado (lembrado), com forma clara de trocar | ✓ VERIFIED | `extractSetor()` tested (5 dedicated tests incl. word-boundary risk case); `getLastBairroCode()`/`pickBairro()` persist `radar_lastbairro`; chip always shows "Setor · {Nome} (último)" via `applyLastBairroIfNeeded` (never silent — confirmed non-empty label merge at radar-goiania.html:2734-2744), only commits via `pickBairro()` at search-commit time (forceMode/applyDetectAndSearch), not on every debounce tick (WR-02 fix verified). |
| 4 | Fuzzy ordenado por qualidade (dígitos por igualdade antes de substring; rua por fronteira de palavra), selo "aproximado" no fallback — recall não piora | ✓ VERIFIED | `matchScoreQ/L/Rua` return 0/1/2/null; quadra "135" no longer matches "2135" (was `true`, now `null` — confirmed via 08-02-SUMMARY antes/depois table); rua word-boundary confirmed (`"BELA"` vs `"BELANTINA"` → null); `finish()` sorts by `__matchScore` primary; `.matchapprox` selo rendered when `__matchScore===2`; `fetchWhere` (server WHERE) untouched — recall preserved. |
| 5 | Erro/vazio oferecem próximo passo em 1 toque; placeholder com exemplos tocáveis; deep-link `?insc=` + "copiar link"; autocomplete CNEFE; colar link do Maps/coordenada cai no lote; voz no mobile (degrada onde não houver) | ✓ VERIFIED | `#exampleChips` (4 touchable examples) replace `.empty` narrative; addr-empty shows "Buscar como Prédio" (data-attribute based, CR-01 fixed), bd-empty shows "Tentar outro nome"; `URLSearchParams` deep-link at boot after `initMap()`; `copyLink()`/clipboard confirmed; CNEFE lazy-load on first focus (`CNEFETOKEN`); `parseGeoPaste` + `identifyPoint` (SEARCHTOKEN, de-dup via `lastGeoKey`); voice via feature-detected `SpeechRecognition\|\|webkitSpeechRecognition`. |
| 6 | Checklist de a11y de 03/07 re-passa (ARIA combobox/activedescendant, teclado, live regions, foco/trap); SEARCHTOKEN propagado em todo caminho novo; quirk iOS preservado | ✓ VERIFIED | `role="combobox" aria-expanded aria-controls aria-autocomplete` on `#caixaInput`; `role="option" aria-selected id="opt-..."` + `aria-activedescendant` sync in dropdown; `pointerdown`/`DOWNEV` extended (not duplicated) for `#caixaList`/`#correctMenu`/`#ambigChips`; Escape handler extended (not duplicated); `font-size:16px` preserved (4 occurrences, incl. `.caixa-input`); SEARCHTOKEN present on `identifyPoint`/`onMapClick`/`loadCi`/`buscar` — all async paths covered; `detectMode` correctly documented as synchronous (no token needed). |
| 7 | Coordenação busca⇄ficha no desktop não regride (guarda a7a4646): busca sempre fechável (×+Esc); abrir ficha/seletor fecha o overlay (zero sobreposição ≥821px); prédio abre seletor sobre o mapa | ✓ VERIFIED | `#pillClose` has no inline `style` attribute (CSS-controlled via `@media(min-width:821px)`, confirmed at radar-goiania.html:511); `pick()` calls `closeChooser()`+`setView("mapa")` before opening detail; `showChooser()` calls `closeDetail()`+`setView("mapa")` before showing chooser over map; `finish()` calls `closeChooser()` as its very first statement (line 1598). 08-05-SUMMARY documents explicit re-verification against `git show a7a4646` diff. |
| 8 | Auditoria dos dados da ficha em TODOS os modos (ql/endereço/prédio/inscrição 10-14 díg/clique-no-mapa) contra o registro de origem | ✓ VERIFIED | `08-05-AUDIT-EVIDENCE.json` contains exactly 6 entries (bd, insc10, insc14, ql, addr, map-click), all `"verdict":"PASS"`, cross-referencing the same real property (ci `3121220251`, DUO SKY GARDEN) across modes with matching critical fields (nrquadra/nrlote/areaterr/areaedif/uso/vlvenal/nmbairro/cdbairro). 08-05-SUMMARY.md documents the table with WHERE clauses used per mode. |

**Score:** 8/8 roadmap success criteria verified (mechanically)

### Mandatory Gate Checks (per verification brief)

| Gate | Requirement | Result |
|------|-------------|--------|
| 1 | 08-05-SUMMARY documents all 6 audit cases (bd/insc10/insc14/ql/addr/map-click) with PASS + evidence file has 6 entries | ✓ CONFIRMED — both SUMMARY table and JSON file have exactly 6 entries, all PASS |
| 2 | `node --test "tests/*.test.mjs"` run live — 31+ pass, 0 fail | ✓ CONFIRMED — ran live: 31 pass, 0 fail, 0 cancelled/skipped |
| 3 | Preserve list: pointerdown(iOS), font-size:16px on #caixaInput, aria-live on #detectChip, SEARCHTOKEN on new async paths (CNEFE lazy-load/identifyPoint/deep-link), closeChooser() at finish() start, pillClose/setView guards (a7a4646) | ✓ CONFIRMED — all grep-verified individually (see body above) |
| 4 | CR-01 fix: no free text interpolated inside inline onclick JS strings (non-numeric) | ✓ CONFIRMED — `tentarComoPredio(this)` reads `data-rua` via `.dataset` instead of interpolating into JS string; `verNoMapa(this)` reads `data-ci` via `.dataset` (IN-01 fix, also completed); remaining onclick interpolations (`pickBairro('${b.code}')`, `copyLink('${inscUse}')`, `wizSet('${c}')`) all use numeric/enum/cadastral-ID values, not free text |
| 5 | BUSCA-13 (Maps/coordenada) and BUSCA-14 (voz best-effort) code paths exist | ✓ CONFIRMED — `parseGeoPaste` with lat/lng range validation (bbox intentionally not filtered, documented design decision — invalid points fall through to "no lot at this point" same as real map click); `SpeechRecognition\|\|webkitSpeechRecognition` feature-detected guard |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` (RADAR_PURE block) | norm/ruaCore/likeTerm/isGarage/matchApto/matchScoreQ/matchScoreL/matchScoreRua/extractSetor/detectMode, each exists once | ✓ VERIFIED | All functions present, single definitions, tested live via node:vm harness |
| `tests/fixtures.mjs` | Named fixtures incl. 7 mandatory roadmap cases | ✓ VERIFIED | Present, consumed by busca.test.mjs |
| `tests/busca.test.mjs` | Node native test suite | ✓ VERIFIED | 7 test groups, passing |
| `tests/detectmode.test.mjs` | detectMode/extractSetor/TIPOVIA_DETECT/getLastBairroCode suite | ✓ VERIFIED | 20 test groups, incl. WR-01 regression tests (bare "128/5"/"20/21"/"q128/5") |
| `package.json` | type:module + test script | ✓ VERIFIED | Present, `node --test "tests/*.test.mjs"` used consistently |
| `#caixaInput`/`#detectChip`/`#ambigChips`/`#correctMenu`/`#exampleChips`/`#caixaList` | Unified search box UI replacing moderow | ✓ VERIFIED | All IDs present; `.moderow`/`.modemore` reused (not duplicated) for `#correctMenu` |
| `08-05-AUDIT-EVIDENCE.json` | 6 data-audit entries, PASS verdicts | ✓ VERIFIED | Exactly 6 entries confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `tests/busca.test.mjs` | `radar-goiania.html` RADAR_PURE block | node:vm slice-and-eval | ✓ WIRED | Confirmed — no divergent copy, tests load the actual production block |
| `#caixaInput` (input, debounced) | `detectMode()` | `runDetect()` debounced ~150ms | ✓ WIRED | Confirmed in code (radar-goiania.html:2745+) |
| `#detectChip` (touch) | `#correctMenu` (`.moderow`/`.modemore` reused) | `forceMode(m)` | ✓ WIRED | Confirmed; `setMode()` updated to new IDs (cAD/cBD/cQL/cIN), guarded against null elements |
| `#caixaInput` (first focus) | `logradouros-goiania.json` | lazy fetch + `CNEFETOKEN` | ✓ WIRED | Confirmed, guarded against duplicate fetch and stale response |
| `okQ/okL/casaRuaCore` (score) | `finish()` ordering | `__matchScore` | ✓ WIRED | Confirmed, primary sort key, ci/insubprinc secondary |
| geo-paste (`parseGeoPaste`) | `identifyPoint` (onMapClick's spatial query path) | `SEARCHTOKEN` + `lastGeoKey` de-dup | ✓ WIRED | Confirmed, WR-03 fix present |
| `?insc=` (boot) | `buscar()`/`finish()` | `URLSearchParams` after `initMap()` | ✓ WIRED | Confirmed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| BUSCA-01 | 08-01 | Harness de teste ANTES de mudar comportamento | ✓ SATISFIED | Task 1 (extraction) committed before Task 2 tests ran against 08-02/03 changes; 31 tests pass |
| BUSCA-02 | 08-03 | `detectMode(texto)` detecta intenção | ✓ SATISFIED | 9+ test cases incl. all mandatory roadmap ambiguous cases |
| BUSCA-03 | 08-04 | Chip de confirmação tocável | ✓ SATISFIED | `#detectChip` role=status aria-live=polite tabindex=0, opens correction menu |
| BUSCA-04 | 08-03 (logic) / 08-04 (UI) | Setor embutido na frase | ✓ SATISFIED | `extractSetor` + UI wiring (`applyDetectAndSearch`/chip label) |
| BUSCA-05 | 08-03 (logic) / 08-04 (UI) | Lembra último setor | ✓ SATISFIED | `getLastBairroCode`/`pickBairro` persistence + chip "(último)" label, never silent |
| BUSCA-06 | 08-04 | Desambiguação por chips | ✓ SATISFIED | `#ambigChips` shown when confidence baixa, never auto-search |
| BUSCA-07 | 08-02 | Fuzzy corrigido por qualidade + selo aproximado | ✓ SATISFIED | matchScoreQ/L/Rua, sort by score, `.matchapprox` selo |
| BUSCA-08 | 08-04 | Erros/vazios com próximo passo; exemplos tocáveis | ✓ SATISFIED | `#exampleChips` + finish() action buttons (addr/bd empty) |
| BUSCA-09 | 08-05 | Deep-link `?insc=` + copiar link | ✓ SATISFIED | `URLSearchParams` boot path + `copyLink()`/clipboard |
| BUSCA-10 | 08-04 | Autocomplete CNEFE lazy-load | ✓ SATISFIED | `loadCnefe`/`CNEFETOKEN`, first-focus trigger |
| BUSCA-11 | 08-04 (+ 08-05 re-pass) | A11y preservada (checklist 03/07) | ✓ SATISFIED | ARIA/keyboard/iOS checklist re-verified in 08-05, gaps found in review (CR-01/WR-01/02/03) all fixed |
| BUSCA-12 | 08-05 | Guarda desktop a7a4646 + auditoria de dados | ✓ SATISFIED | pillClose/pick/showChooser/finish guards confirmed intact; 6/6 data audit PASS |
| BUSCA-13 | 08-05 | Colar coordenada/link do Maps | ✓ SATISFIED | `parseGeoPaste` + `identifyPoint`, range-validated |
| BUSCA-14 | 08-05 | Voz best-effort | ✓ SATISFIED | Feature-detected `SpeechRecognition`, graceful degradation, error toast |

No orphaned requirements — all 14 BUSCA-01..14 IDs are claimed across the 5 plans and cross-checked against code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TODO/FIXME/PLACEHOLDER/stub patterns found in phase 8 diff | — | None — clean |
| — | — | One pre-existing `transition:` rule (`.detail .acts a`) extended to also match `.detail .acts button` (new "Copiar link" button) | Info | Reuse, not a new transition declaration — consistent with "zero transition novo" intent |

**Code Review Findings (08-REVIEW.md → 08-REVIEW-FIX.md):** 1 critical (CR-01, XSS-adjacent JS-string-breakout in error-recovery button) + 3 warnings (WR-01 bare quadra/lote format not supported; WR-02 side effects on every debounce tick; WR-03 no de-dup on repeated geo-paste identical coordinates) + 2 info (IN-01 esc() dual-purpose footgun; IN-02 naming collision "Caixa"/"caixa única" — accepted, not fixed, non-functional). All critical/warning findings verified fixed in code with dedicated commits (766cc7a, 5fb91b0, bc985d8, ca6c36d) plus IN-01 completion (0825143). Test suite grew from 27 to 31 tests to cover the WR-01 regression.

### Human Verification Required

1. **iOS Safari physical-device test of pointerdown/voice** — dropdown/menu/chips closing behavior on touch-outside, and microphone permission grant/deny flow, on a real iPhone. Mechanism replicates the existing `DOWNEV` pattern (verified by code reading) but was not exercised on physical hardware during this verification pass.
2. **Screen-reader walkthrough** (VoiceOver/NVDA) of the full flow (chip → correction menu → disambiguation → dropdown) — ARIA attributes are structurally correct (grep-verified), but announcement timing/order is a live-assistive-technology behavior.
3. **Real Google Maps link paste** from a mobile device (various URL formats/shorteners) and out-of-bounds coordinate handling — regex coverage confirmed for 3 documented formats; real-world link variability is empirical.
4. **detectMode calibration against real Goiânia street/building name sample** — 08-03-SUMMARY.md and 08-04-SUMMARY.md explicitly flag this as a MEDIUM-confidence pending item ("validar contra amostra real... antes de finalizar"). All 31 automated tests pass against synthetic fixtures; no plan executed a statistical validation against the full ~9.8k CNEFE/COMBO dataset. This is a UX-quality judgment call (acceptable false-positive rate) requiring human review of a real sample, not a mechanical failure.

### Gaps Summary

No blocking gaps found. All 8 ROADMAP success criteria are mechanically verified against the actual codebase (not just SUMMARY claims): the RADAR_PURE test harness runs and passes (31/31), the fuzzy-match quality fix and word-boundary rule are implemented and tested, `detectMode`/`extractSetor`/last-bairro persistence are wired through the UI, the unified search box replaces the moderow with full accessibility scaffolding, deep-link/copy-link/geo-paste/voice are implemented with correct guards, the desktop a7a4646 hotfix guard is confirmed intact by direct code inspection (not just documentation), and the data audit across all 6 search modes has 6/6 PASS with evidence recorded in both the SUMMARY and a dedicated JSON evidence file.

The code review (08-REVIEW.md) caught one genuine critical issue (CR-01, an XSS-adjacent JS-string breakout introduced by 08-05's error-recovery button) and three warnings; all four were fixed with dedicated commits and verified present in the current code, and the fix for CR-01 was additionally spot-checked structurally (the vulnerable interpolation pattern is gone; the remaining onclick interpolations all use numeric/enum/cadastral-ID data, not free text).

The only outstanding item is the explicitly self-documented detectMode calibration-against-real-sample task, which both 08-03 and 08-04 SUMMARYs flag as needing human/empirical validation before being fully closed — this is routed to human_verification rather than treated as a gap, since the phase's own plans correctly scoped it as a judgment call outside mechanical test coverage, not a missed deliverable. The remaining three human-verification items (iOS physical device, screen reader, real Maps links) are standard "cannot verify programmatically" categories (visual/device/permission behavior) and do not indicate any missing implementation.

---

_Verified: 2026-07-07T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
