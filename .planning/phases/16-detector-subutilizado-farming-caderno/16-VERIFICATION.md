---
phase: 16-detector-subutilizado-farming-caderno
verified: 2026-07-10T01:37:53Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 16: Detector de Lote Subutilizado & Farming/Caderno Verification Report

**Phase Goal:** O corretor identifica lote subutilizado e mantém um caderno de território que persiste entre sessões, sem risco de PII.
**Verified:** 2026-07-10T01:37:53Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Detector roda como filtro sobre o scan da Fase 15 — sem requisições próprias | ✓ VERIFIED | `detectarOportunidadesUI()` (radar-goiania.html:3612) calls only `territorioScan(TERR_PANEL_CD)` (dedupe via `TERRCACHE`) + pure `detectarSubutilizados(scan.lotes)`; no `fetch(`/`territorioScanRun(` in its body. Live-verified in Chromium (16-03-SUMMARY.md checkpoint #1): scan Bueno = 4 requests, subsequent detector call = **0 new requests**, 50 candidates found. |
| 2 | Salvar setor/lotes, tags, notas e status persiste entre sessões | ✓ VERIFIED | `cadernoSalvar`/`cadernoAtualizar` write via `CADERNO_IO` (IndexedDB `radar_territorio`→store `caderno`, keyPath `ci`). Live-verified (16-03-SUMMARY.md checkpoint #2): item saved, `location.reload()`, item present after reload with status/tag/nota preserved. |
| 3 | IndexedDB (nunca localStorage p/ snapshots) com fallback visível se escrita falhar | ✓ VERIFIED | `grep localStorage` in radar-goiania.html returns zero hits scoped to caderno/cadbook. All I/O in `CADERNO_IO_START..END` block (3270-3410) uses `indexedDB.open`. Every `.catch` call-site (`cadernoStatusUI`, `cadernoTagUI`, `cadernoNotaUI`, `cadernoRemoverUI`, `salvarNoCadernoUI`, `salvarDetectorNoCadernoUI`) resolves to `toast(ERRO_ESCRITA_CADERNO)` — never silent. `cadernoDisponivel()` feature-detect gates buttons with `CADERNO_INDISPONIVEL` message when IndexedDB is unavailable. WR-02 fix (16-REVIEW-FIX.md) added `onblocked` handling + `db.close()` on every operation. |
| 4 | Allowlist central impede campo fora da lista — nunca dtnascimen — no IndexedDB; DevTools confirma ausência de PII | ✓ VERIFIED | `sanitizeCaderno()` (radar-goiania.html:2386) is a positive allowlist over `CADERNO_ALLOW` (17 named fields; `dtnascimen`/`cpf`/`nmproprie`/`nome` absent from the list) — applied on every write path (`cadernoSalvar`, `cadernoAtualizar`, `validarImportCaderno`). CR-01 fix added `CADERNO_CI_RE` value-validation on `ci` (defense in depth against injected `ci`). Live-verified (16-03-SUMMARY.md checkpoint #3): dirty record with `dtnascimen`/`nmcontrib`/`cpf`/random field saved; direct IndexedDB dump outside the app shows only allowlist keys; **PII fields present: NONE**. |

**Score:** 4/4 truths verified (all roadmap Success Criteria confirmed by code + live browser evidence already collected per phase notes)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` — RADAR_PURE detector block | `medianasPorQuadra`, `limiarQuadraValorizada`, `razaoOcupacao`, `detectarSubutilizados`, `leituraDetector` + `DETECTOR_RATIO_MAX`/`DETECTOR_LIMITE` | ✓ VERIFIED | All 5 functions + 2 constants present at lines 2295-2362. `razaoOcupacao` uses explicit `!=null` guard (line 2330-2332), never `||0` — Pitfall 1 (0-vs-null) correctly implemented. |
| `radar-goiania.html` — RADAR_PURE caderno decision block | `CADERNO_ALLOW`, `CADERNO_STATUS`, `sanitizeCaderno`, `statusValido`, `validarImportCaderno` | ✓ VERIFIED | Lines 2367-2412. Positive allowlist pattern (`CADERNO_ALLOW.forEach`), never `delete`-based blocklist. Post-review hardening (`CADERNO_CI_RE`, tag/nota truncation, status normalization) present. |
| `radar-goiania.html` — `CADERNO_IO` block | IndexedDB wrapper (open/CRUD/feature-detect) | ✓ VERIFIED | Lines 3270-3410. `indexedDB.open`, `onupgradeneeded` (stores `caderno`/`setores`, indices `cdbairro`/`status`), `onblocked`, `db.close()` on every op. `cadernoContar` removed per IN-01 (no dangling call-sites). |
| `radar-goiania.html` — `#cadernoBlock` UI | Caderno block in Consulta panel (filters, pagination, editor, autosave) | ✓ VERIFIED | `<div id="cadernoBlock">` (line 981), `renderCadernoBlock()` (line 4912), filter/pagination/status-chip/tag/nota handlers all present and read `ci` via `data-ci` (CR-01 fix), never inline-interpolated. |
| `radar-goiania.html` — ficha button + export/import | `#cadernoBtn`, `salvarNoCadernoUI`, `renderCadernoBtn`, export/import JSON | ✓ VERIFIED | Line 4628 button in `#dActsMore`; `renderCadernoBtn()` (4744), `salvarNoCadernoUI()` (4765); export/import wired to `cadernoExportarJSON`/`cadernoImportarJSON`, import runs through `validarImportCaderno`. |
| `radar-goiania.html` — `#terrDetectorView` UI | View-swap detector in `#terrPanel` + map highlight + legend | ✓ VERIFIED | Lines 1123-1145 (`#terrDetectorView`, `#terrDetectorList`, `#terrDetectBtn`); `detectarOportunidadesUI`/`mostrarDetectorView`/`fecharDetector`/`renderDetectorLista` (3612-3690); pino legend entry "🏗️ Lote subutilizado" (line 1045); `destacarDetectorNoMapa`/`limparDestaqueDetector` (3756-3763), cleared unconditionally in `fecharTerrPanel()` (WR-01 fix). |
| `tests/caderno.test.mjs` + `tests/fixtures.mjs` (`DETECTOR_FIX`/`CADERNO_FIX`) | TDD coverage of pure functions | ✓ VERIFIED | 141/141 tests pass (baseline 121 → 136 after Plan 01 → 141 after REVIEW-FIX additions for CR-01/WR-03). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `detectarOportunidadesUI` | `territorioScan` + `detectarSubutilizados` | reuse of `TERRCACHE`-deduped scan | ✓ WIRED | Confirmed no `fetch`/`territorioScanRun` in function body; live network trace shows 0 new requests. |
| `cadernoSalvar`/`cadernoAtualizar` | `sanitizeCaderno` | sanitize before `put` | ✓ WIRED | Both functions call `sanitizeCaderno` on the object before `store.put`. |
| botão "📓 Salvar no caderno" (ficha) | `cadernoSalvar` | `salvarNoCadernoUI` → `.then/.catch(toast)` | ✓ WIRED | `salvarNoCadernoUI` (4765) calls `cadernoSalvar(item).then(...).catch(()=>toast(ERRO_ESCRITA_CADERNO))`. |
| `renderCadernoBlock` | `cadernoListar` | async `getAll` render | ✓ WIRED | `renderCadernoBlock()` awaits `cadernoListar(CADERNO_FILTRO)` before building `#cadernoList` HTML. |
| item do detector | `salvarNoCadernoUI`/`cadernoSalvar` | botão "📓 Salvar no caderno" por item | ✓ WIRED | Line 3683 `onclick="salvarDetectorNoCadernoUI(${i},this)"` — reuses `cadernoSalvar`/toast pattern. |
| `renderCadernoBlock` inline handlers | DOM (`data-ci`) | `.closest(".cadbook-item").dataset.ci` | ✓ WIRED | CR-01 fix confirmed: no `it.ci` interpolated inside `onclick`/`onblur` string literals; all 4 handlers read `ci` from `data-ci`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `#cadernoBlock` | `cadernoListar(CADERNO_FILTRO)` result | IndexedDB `caderno` store (real `getAll`/index query) | Yes | ✓ FLOWING |
| `#terrDetectorList` | `detectarSubutilizados(scan.lotes)` | `territorioScan` cached scan result (real cadastral data from Fase 15) | Yes | ✓ FLOWING |
| ficha "📓 Salvar no caderno" | `DCUR` (open ficha's raw cadastral object) | live search/ficha state, sanitized by `sanitizeCaderno` before write | Yes | ✓ FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| TERR-04 | 16-01, 16-03 | Detector de lote subutilizado (razão construído/terreno baixa em quadra de venal alto) sobre o scan compartilhado | ✓ SATISFIED | Pure functions (16-01) + view-swap UI reusing cached scan (16-03), zero-requisição live-verified. |
| TERR-05 | 16-01, 16-02, 16-03 | Farming/Caderno de território em IndexedDB — salvar setor/lotes, tags, notas, status (allowlist anti-PII, nunca dtnascimen) | ✓ SATISFIED | Pure allowlist/validation (16-01) + IndexedDB persistence + UI (16-02) + detector-item save + live PII-absence dump (16-03). |

No orphaned requirements for Phase 16 (REQUIREMENTS.md maps only TERR-04/TERR-05 to Fase 16; both claimed by plans above).

### Anti-Patterns Found

None found in the phase-16 code paths (detector/caderno functions, `#cadernoBlock`, `#terrDetectorView`, `CADERNO_IO`). No `TODO`/`FIXME`/`placeholder`/"not implemented" strings scoped to caderno/detector code. The single `16-REVIEW.md` critical finding (CR-01, JS-string-breakout via `it.ci` inside inline `onclick`/`onblur`) plus 3 warnings (WR-01 map-highlight leak, WR-02 unclosed IndexedDB connections, WR-03 unbounded tag/nota + invalid status) and 3 infos (IN-01 dead code, IN-02 hardcoded "50", IN-03 duplicated message) were all fixed per `16-REVIEW-FIX.md` — verified directly in the current `radar-goiania.html` (CR-01 handlers now read `data-ci`; WR-01 `fecharTerrPanel` calls `limparDestaqueDetector()` unconditionally; WR-02 `onblocked`+`db.close()` present on every I/O op; WR-03 `sanitizeCaderno` truncates tag/nota and normalizes invalid status; IN-01 `cadernoContar` removed with no dangling refs; IN-02 `DETECTOR_LIMITE` interpolated; IN-03 `CADERNO_INDISPONIVEL` constant reused in 4 sites).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `npm test` | 141/141 pass, fail 0 | ✓ PASS |
| Detector functions present in RADAR_PURE | `grep -c "function detectarSubutilizados\|function razaoOcupacao..." radar-goiania.html` | 5/5 functions found | ✓ PASS |
| Caderno allowlist excludes PII | `grep CADERNO_ALLOW` inspection | `dtnascimen`/`cpf`/`nmproprie`/`nome` absent from array | ✓ PASS |
| No localStorage used for caderno | `grep localStorage` scoped to caderno context | zero hits | ✓ PASS |
| Zero-network detector call, persistence, PII-absence, export/import, XSS | Live Chromium checkpoint (16-03-SUMMARY.md, executed 2026-07-09) | 5/6 full PASS, 1/6 (degradation) verified by code-read only (env had IndexedDB available) | ✓ PASS (browser criteria already verified live per phase notes) |

### Human Verification Required

None. Per phase notes, the browser-dependent criteria (zero-requisição do detector, persistência entre sessões, ausência de PII, XSS, export/import roundtrip) were already verified live in Chromium during the 16-03 checkpoint and the post-fix re-verification, with direct evidence recorded in 16-03-SUMMARY.md and 16-REVIEW-FIX.md. Code-level confirmation of the corresponding implementation was performed in this verification pass and matches the claimed live results. No device/network-condition-dependent item remains outstanding for this phase.

### Gaps Summary

No gaps found. All 4 roadmap Success Criteria for Phase 16 (TERR-04, TERR-05) are verified both statically (functions exist, are substantive, correctly wired, allowlist enforced, no localStorage, `.catch`+toast on every write path) and dynamically (live browser checkpoint evidence already collected and cited above). All 7 code-review findings (including the 1 critical XSS/string-breakout) were fixed and the fixes are present in the current codebase. Test suite is green at 141/141.

---

*Verified: 2026-07-10T01:37:53Z*
*Verifier: Claude (gsd-verifier)*
