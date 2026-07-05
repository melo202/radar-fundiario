---
phase: 03-render-de-bairro
plan: 02
subsystem: ui
tags: [leaflet, breadcrumb, navigation, css-vars]

# Dependency graph
requires:
  - phase: 03-render-de-bairro (Plan 01)
    provides: "drillBairro(layer), clearBaiHi(), baiHi — bairro layer highlight/drill state consumed by this plan's breadcrumb"
provides:
  - "#breadcrumb DOM element (nav, sibling of #searchPill/#coachMark in .mapwrap)"
  - "showBreadcrumb(nm) / hideBreadcrumb() / goHomeCrumb() functions"
  - "Wiring: drillBairro() now calls showBreadcrumb(nm_bai) after fitBounds"
affects:
  - "03-02 checkpoint task (Task 2, deferred to orchestrator): live Bueno/Oeste non-freeze verification exercises this breadcrumb as part of the full drill flow"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Breadcrumb show/hide is a hard display:none/inline-flex toggle (no transition), mirroring .pillclose/.coach-x precedent"
    - "Bairro name written via textContent (never innerHTML) as XSS defense for nm_bai, matching threat_model T-03-04"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "Breadcrumb left-anchored (left:16px, no transform) vs. the centered #searchPill — avoids horizontal collision by construction, per UI-SPEC placement rule"
  - "Desktop breakpoint (≥821px) stacks breadcrumb below the pill in the same left column (top:calc(24px + 44px + 8px)) rather than beside it"
  - "Breadcrumb visibility is NOT tied to the lots zoom-17 gate — it persists showing the last-drilled bairro until 'Goiânia' is tapped or a different bairro is drilled, avoiding flicker on incidental zoom/pan"
  - "goHomeCrumb() reuses the exact boot setView([-16.6799,-49.255],12) call and delegates highlight-reset to the existing clearBaiHi() from Plan 01 rather than duplicating reset logic"

patterns-established:
  - "Pattern: chrome elements (pill/coachmark/breadcrumb) share z-index 400/390/400 tier discipline and coexist by spatial placement, not z-stacking, when they don't need to layer"

requirements-completed: []  # MAPA-05 truths satisfied by Task 1; MAPA-03 non-freeze closure requires Task 2 (checkpoint), deferred to orchestrator — not marking complete here.

# Metrics
duration: ~15min
completed: 2026-07-04
---

# Phase 3 Plan 02: Breadcrumb (Goiânia › Bairro) Summary

**Left-anchored breadcrumb pill that appears on bairro drill and returns to the city boot view on tap, built entirely from existing `var()` tokens with zero new hex/transition.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 1 of 2 completed (Task 1: autonomous breadcrumb implementation). Task 2 (checkpoint:human-verify, `autonomous:false`) intentionally NOT executed — deferred to orchestrator per plan instructions.
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- `#breadcrumb` nav element added to `.mapwrap`, hidden by default (`display:none`), sibling of `#searchPill`/`#coachMark`
- CSS built exclusively from existing `var(--paper-2)`, `var(--ink)`, `var(--accent)`, `var(--accent-ink)`, `var(--line)`, `var(--muted)` — zero new hex literals
- Left-anchored placement (`left:16px`, no transform) with `max-width:calc(50vw - 24px)` + `text-overflow:ellipsis` on the bairro crumb, guaranteeing no overlap with the centered `#searchPill` even for long bairro names
- Desktop (≥821px) override stacks the breadcrumb below the pill in the same left column (`top:calc(24px + 44px + 8px); left:24px`)
- `showBreadcrumb(nm)` / `hideBreadcrumb()` / `goHomeCrumb()` implemented; bairro name rendered via `textContent` (zero innerHTML risk)
- `drillBairro(layer)` (from Plan 01) now calls `showBreadcrumb(layer.feature.properties.nm_bai)` immediately after scheduling `fitBounds`
- `goHomeCrumb()` (bound to the "Goiânia" crumb's `onclick`) calls the exact boot `map.setView([-16.6799,-49.255],12)`, delegates highlight reset to Plan 01's `clearBaiHi()`, then hides the breadcrumb
- "Goiânia" crumb tap target is ≥44px via `padding:12px 14px` + `min-height:44px` on `.crumb`

## Task Commits

1. **Task 1: #breadcrumb — markup + CSS + show/hide + wiring** - `a90d3fa` (feat)

Task 2 (checkpoint:human-verify — live Bueno/Oeste non-freeze + full-flow verification) was **not executed** by this executor. Per objective, it is deferred to the orchestrator, which will perform the live browser verification (server, DevTools throttling, Bueno/Oeste drill, breadcrumb round-trip, offline SW check).

**Plan metadata:** none yet — STATE.md/ROADMAP.md intentionally NOT updated by this executor run (per objective); the orchestrator will handle final plan-completion bookkeeping after Task 2's checkpoint resolves.

## Files Created/Modified

- `radar-goiania.html` — added `#breadcrumb` markup (lines ~539-543), CSS block (lines ~174-182 + desktop override ~line 440), and JS functions `showBreadcrumb`/`hideBreadcrumb`/`goHomeCrumb` (lines ~780-789), plus one-line wiring inside `drillBairro()` (line ~796)

## Decisions Made

- Reused `esc()` (existing HTML-escaper, line 611) to build the label before assigning via `textContent`, matching the plan's action block exactly even though `textContent` alone already neutralizes markup — belt-and-suspenders consistent with Plan 01's `highlightBairro()` precedent for the same fallback string ("Área rural / gleba")
- No new `transition:` CSS added; breadcrumb show/hide remains a hard `display` toggle, per UI-SPEC "Interaction Notes" (Motion is Phase 6 scope)

## Deviations from Plan

None — Task 1 executed exactly as written in `03-02-PLAN.md`. All acceptance-criteria greps passed on first implementation (`id="breadcrumb"`, `showBreadcrumb`/`hideBreadcrumb`/`goHomeCrumb`, `setView([-16.6799,-49.255],12)`, `textContent`, `left:16px`, `max-width:calc(50vw - 24px)`, `min-height:44px`, zero new hex in the `#breadcrumb` block, `showBreadcrumb(` called inside `drillBairro`).

## Issues Encountered

None.

## Checkpoint Deferred

**Task 2 (`type="checkpoint:human-verify"`, `autonomous:false`) was intentionally NOT attempted by this executor**, per explicit instruction in the objective. This task requires a live browser/DevTools session (serving the app via `python -m http.server`, drilling into Bueno ~57k lots / Oeste ~32k lots under CPU 4x + Fast 3G throttling, and confirming no freeze) that only the orchestrator should perform. All code needed for that verification (breadcrumb, drill, highlight, zoom-gate) is now in place and grep-verified; no code changes remain pending for Task 2 — it is purely a live human-verification gate.

Resume point for the orchestrator: `.planning/phases/03-render-de-bairro/03-02-PLAN.md` Task 2, using the `<how-to-verify>` steps as written (serve app on :8000, test hover/tap, drill Bueno/Oeste with throttling, verify breadcrumb round-trip, verify offline SW cache).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All code for MAPA-05 (breadcrumb) is complete and committed; MAPA-03's non-freeze closure and the overall Phase 3 sign-off both hinge on Task 2's live verification, not yet performed
- STATE.md and ROADMAP.md were deliberately left untouched by this executor run — the orchestrator should update them only after Task 2's checkpoint resolves (approved or regression reported)

---
*Phase: 03-render-de-bairro*
*Completed: 2026-07-04 (Task 1 only; Task 2 pending orchestrator)*

## Self-Check: PASSED

- [x] `radar-goiania.html` exists on disk
- [x] `.planning/phases/03-render-de-bairro/03-02-SUMMARY.md` exists on disk
- [x] Commit `a90d3fa` exists in git log
