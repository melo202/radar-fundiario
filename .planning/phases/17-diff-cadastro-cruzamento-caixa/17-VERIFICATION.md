---
phase: 17-diff-cadastro-cruzamento-caixa
verified: 2026-07-10T03:04:29Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Phase 17: Diff de Cadastro & Cruzamento Caixa Verification Report

**Phase Goal:** O corretor vê o que mudou num lote desde a última visita (diff enxuto sobre snapshot, nunca PII, mesma allowlist da Fase 16) e onde os imóveis Caixa cruzam com o território salvo (destaque quando imóvel Caixa cai em setor/lote farmado).
**Verified:** 2026-07-10T03:04:29Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria + Plan Must-Haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Revisitar um lote salvo mostra o que mudou desde o snapshot (diff enxuto, nunca PII) | VERIFIED | `radar-goiania.html:5019` `renderDiffUI(a)` reads `cadernoBuscar(ci)`, calls `diffLote(item.snapshot,a)`/`formatarDiff`, renders into `#dDiff`/`#dDiffList` via `textContent`/`createElement` (never `innerHTML` with values). Browser-verified by orchestrator: snapshot with venal +12%/area +85m² → visible "Valor venal subiu 12% desde 09/06" + "Área construída aumentou 85 m²"; snapshot/snapshotAt updated. |
| 2 | Lote nunca salvo NÃO mostra `#dDiff` | VERIFIED | `renderDiffUI`: `if(!item){el.hidden=true;return;}` (line 5026); static markup `#dDiff` has `hidden` attribute by default (line 1113). |
| 3 | Sem mudança relevante → "Sem mudanças" (nunca lança) | VERIFIED | `diff-caixa.test.mjs` 35/35 green incl. no-change/absent-field cases; `formatarDiff` empty-list path renders literal "Sem mudanças no cadastro desde a última visita." (line 5043). |
| 4 | Snapshot é gravado silenciosamente após montar o diff; falha nunca esconde o diff já exibido | VERIFIED | Line 5065: `cadernoAtualizar(ci,{snapshot:...}).catch(()=>toast(ERRO_ESCRITA_CADERNO))` — called AFTER `el.hidden=false` (line 5062), so a write failure only toasts, diff stays visible. |
| 5 | Cruzamento: badge "🏦 N imóveis Caixa no seu território" no Caderno quando há match real (nunca "0") | VERIFIED | `renderCadernoBlock` (line 5261-5268): `cruzarCaixaTerritorio(...)`; `if(cx.n>0)` gate, singular/plural handled. Browser-verified: badge with dataset handler, 7 anéis, popup with território line, legend item. |
| 6 | Linha Caixa no painel do território quando o setor em foco tem imóveis Caixa | VERIFIED | `montarPainel` (line 3692-3715): IIFE async placed BEFORE the `!scan||!st` and `st.n===0` early returns (fix I3), guarded by `TERR_PANEL_CD` to avoid stale-setor leak. |
| 7 | Pinos Caixa em setor salvo ganham anel + linha no popup + item na legenda | VERIFIED | `garantirCaixaLayer` (line 6461) resolves `nomeMap`+`itens` BEFORE first pin construction (fix W1), builds `caixaAnelLayer` ring (`radius:10`, no `dashArray`) and passes `noTerr` into `caixaPopup(i,noTerr)` (line 6443 renders `.cxp-terr` line); legend item `🏦📓 Caixa no seu território` present (grep confirmed). |
| 8 | Tocar no badge/linha abre o pino (N=1) ou fitBounds+toast (N>1) — 1 toque | VERIFIED | `abrirCaixaNoMapaUI` (line 6507): reads `el.dataset.bairros`, `alvo.length===1` → `setView`+`openPopup`; else `fitBounds`+toast. Browser-verified by orchestrator (zoom 0→18 artifact was headless-preview viewport quirk, not a bug, per notes). |
| 9 | Todo texto via esc()/textContent; handlers leem data-attributes, nunca interpolam em on* | VERIFIED | `onclick="abrirCaixaNoMapaUI(this)"` is a fixed literal everywhere; `data-bairros` set via template `esc()` on attribute value, never inside `onclick=""`. Same pattern as pre-existing Fase 16 CR-01 fix. |
| 10 | Snapshot/allowlist LGPD — `dtnascimen` nunca sobrevive no sub-objeto snapshot | VERIFIED | `sanitizeCaderno` reconstructs `out.snapshot` field-by-field from `DIFF_ALLOW` (line ~2436 comment + code); `dtnascimen` appears in file only in `SENS` deny-list/comments, never inside `DIFF_ALLOW`/snapshot code path (grep confirmed, 5 occurrences all in comments/SENS list). `caderno.test.mjs` covers `itemSnapshotComPII` case. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` — `diffLote`, `formatarDiff` | RADAR_PURE diff engine | VERIFIED | Present, exercised by 35 tests in `tests/diff-caixa.test.mjs`, wired into `renderDiffUI`. |
| `radar-goiania.html` — `construirNomeParaCdbairro`, `cdbairroDoImovelCaixa`, `cruzarCaixaTerritorio`, `cruzarCaixaSetor` | matching/cruzamento puro | VERIFIED | Present; `cruzarCaixaTerritorio` refactored post-review (IN-01) to single-pass `forEach`, still 35/35 green. Wired into `renderCadernoBlock`, `montarPainel`, `garantirCaixaLayer`. |
| `radar-goiania.html` — `sanitizeCaderno` + `CADERNO_ALLOW` snapshot ext. | allowlist recursiva LGPD | VERIFIED | `"snapshot","snapshotAt"` added to `CADERNO_ALLOW`; recursive rebuild confirmed by `caderno.test.mjs` PII/malformed cases. |
| `radar-goiania.html` — `cadernoBuscar(ci)` | I/O read, sibling of `cadernoTem` | VERIFIED | Present, used by `renderDiffUI`. |
| `radar-goiania.html` — `#dDiff` + `renderDiffUI(a)` | UI diff block | VERIFIED | Static markup between `#dLeitura`(1107)/`#dActsPrim`(1118); hooked in `showDetail` via `renderDiffUI(a)`. |
| `radar-goiania.html` — `#cadernoCaixaBadge`, `#terrCaixaLine`, `caixaAnelLayer`, `abrirCaixaNoMapaUI` | 3 cruzamento surfaces + 1-touch action | VERIFIED | All present and wired; grep + manual read confirm. |
| `tests/diff-caixa.test.mjs`, `tests/fixtures.mjs` (`DIFF_FIX`/`CAIXA_MATCH_FIX`) | TDD coverage w/ real names | VERIFIED | 35 tests pass standalone; fixtures use real Caixa neighborhood names ("SETOR BUENO", "JARDIM ATLANTICO", "RESIDENCIAL JARDINS DO CERRADO 7"). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `sanitizeCaderno` | `DIFF_ALLOW` | recursive sub-object rebuild | WIRED | Confirmed by code read + `caderno.test.mjs` PII removal tests. |
| `cadernoBuscar(ci)` | `objectStore('caderno').get(ci)` | readonly + `db.close()` (WR-02 pattern) | WIRED | Sibling of `cadernoTem`, same close-on-success/error pattern. |
| `cruzarCaixaTerritorio` | `cdbairroDoImovelCaixa` | filter x/y + set intersection | WIRED | Single-pass `forEach` (post IN-01 fix), one call per imóvel. |
| `showDetail` → `renderDiffUI(a)` | `cadernoBuscar`+`diffLote`+`formatarDiff`+`cadernoAtualizar` | async sibling call w/ `clean(a.ci\|\|a.nrinscr)` key | WIRED | Hook present; correct key (Pitfall 1) confirmed via grep + read; snapshot rewritten after render. |
| `abrirCaixaNoMapaUI(el)` | `el.dataset.bairros` | data-attribute read, no onclick interpolation | WIRED | Confirmed; `onclick="abrirCaixaNoMapaUI(this)"` fixed literal at both call sites (badge + painel line). |
| `renderCadernoBlock`/`montarPainel`/`toggleCaixa` | `garantirNomeParaCdbairro`/`garantirCaixaLayer` | memoized async map + idempotent layer builder | WIRED | `BAIRROS` global fix (was never populated pre-fix) confirmed at line 3102; `caixaLayerBuilding` dedupe (WR-01) confirmed at line 6460-6480. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `#dDiff` / `renderDiffUI` | `item.snapshot` via `cadernoBuscar(ci)` | IndexedDB `caderno` store (real, written on 1º save / backfilled) | Yes | FLOWING |
| `#cadernoCaixaBadge` | `cx=cruzarCaixaTerritorio(CAIXA.imoveis,itens,nomeMap)` | `CAIXA.imoveis` (static `caixa-goiania.js`, boot-loaded) × `itens` (real IndexedDB `cadernoListar`) | Yes | FLOWING |
| `#terrCaixaLine` | `cruzarCaixaSetor(CAIXA.imoveis,scan.cdbairro,nomeMap)` | same real sources, single setor | Yes | FLOWING |
| `caixaAnelLayer`/popup `.cxp-terr` | `noTerr` computed pre-construction in `garantirCaixaLayer` | real `nomeMap` (from `bairros-goiania.json`, fixed by `BAIRROS=data` assignment) + real `cadernoListar` | Yes | FLOWING |

Notable finding already fixed by the team: `BAIRROS` global was declared but never populated before this phase's Plan 02 fix (`loadBairroPolys()` now assigns `BAIRROS=data`), which would otherwise have made all 3 cruzamento surfaces silently, permanently empty. Confirmed the fix is present in the shipped code (line 3102).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green, baseline 141 → grew | `npm test` | 184 pass, 0 fail | PASS |
| Diff/matching pure functions isolated | `node --test tests/diff-caixa.test.mjs` | 35 pass, 0 fail | PASS |
| No 2nd normalization function introduced | `grep -c "function norm\b" / "normalizarNome"` | 0 matches for both (norm is `const norm=`, only 1 definition, no duplicate) | PASS |
| `dtnascimen` never in snapshot/DIFF_ALLOW path | `grep -n "dtnascimen"` | 5 occurrences, all in `SENS` deny-list / explanatory comments, none inside `DIFF_ALLOW`/snapshot code | PASS |
| Browser end-to-end (diff on revisit, Caixa badge/anel/popup, 1-touch) | orchestrator live Chromium check (2026-07-10) | Confirmed per task notes: commercial diff text, badge with 7 anéis, popup territory line, legend item, 1-touch zoom+popup | PASS (cited as evidence, not re-run here) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| TERR-06 | 17-01, 17-02 | Diff de cadastro entre visitas (snapshot enxuto; nunca PII) | SATISFIED | `diffLote`/`formatarDiff`/`renderDiffUI`/`#dDiff`, recursive LGPD allowlist, backfill for pre-fix items (WR-02). |
| TERR-07 | 17-01, 17-02 | Cruzamento dos imóveis Caixa com território salvo | SATISFIED | `construirNomeParaCdbairro`/`cdbairroDoImovelCaixa`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor`, badge/linha/anel/popup/legend, `abrirCaixaNoMapaUI`, `BAIRROS` population fix. |

No orphaned requirements — `REQUIREMENTS.md` maps only TERR-06/07 to Phase 17, both claimed by the plans and both satisfied. (Note: the tracking table at REQUIREMENTS.md line 140 still shows "Pending" for TERR-06/07, but this is stale documentation inconsistent with the `[x]` checkboxes above it — the same staleness pattern appears for phases 10 through 16 in that same table, so it predates and is unrelated to this phase's work.)

### Anti-Patterns Found

None. Scanned `radar-goiania.html` for TODO/FIXME/PLACEHOLDER/"não implementado"/empty-return stubs in the phase's diff/Caixa code — no blockers, warnings, or notable stubs found. All apparent "TODO" grep hits are Portuguese "todo/toda" (= "every/all"), not TODO markers.

### Human Verification Required

None. All UI behaviors that would normally require human/browser verification were already live-verified by the orchestrator in Chromium on 2026-07-10 (per task notes) and are cited as evidence above rather than left pending.

### Gaps Summary

No gaps. All 10 observable truths verified across both plans, all 3 post-review findings (WR-01 idempotent layer dedupe, WR-02 Detector-save snapshot + backfill, IN-01 single-pass matching) confirmed present in the shipped code, `npm test` green at 184/184 (baseline 141 + 43 new), and the phase's own browser checklist was already executed live by the orchestrator with passing results.

---

_Verified: 2026-07-10T03:04:29Z_
_Verifier: Claude (gsd-verifier)_
