---
phase: 06-motion-no-app-todo
plan: 02
subsystem: ui
tags: [motion.dev, setView, bottom-sheet, spring, drag-to-dismiss, progressive-enhancement]

# Dependency graph
requires:
  - phase: 06-motion-no-app-todo
    provides: "mAnimate()/mStagger() progressive-enhancement wrappers, REDUCE guard, inlined Motion UMD (Plan 01)"
provides:
  - "setView() screen-transition entrance animation (fade+±12px translateX, 180ms) on mobile view swap and desktop .panel overlay"
  - ".detail mobile bottom-sheet open spring (stiffness 420/damping 38/mass 1) and snappier 160ms close, both coordinated with #grab drag-to-dismiss"
  - "SHEETDRAGY0 shared drag-state flag (module scope) letting showDetail/closeDetail know when the #grab handle is actively being dragged"
affects: [06-03-stagger-and-tap-feedback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Animation-as-visual-add-on: mAnimate() called AFTER the unconditional state change (classList/dataset), never gating it — same pattern as Plan 01's contract, now applied at two more call sites"
    - "Drag/gesture-vs-animation coordination via a shared nullable flag (SHEETDRAGY0) instead of a local closure variable, so state-changing functions defined earlier in the file (showDetail/closeDetail) can read the live drag status of an IIFE defined later in the file"
    - "Close-from-current-position handoff: closeDetail() reads the element's live inline transform (set by drag) as the animation's start keyframe instead of assuming translateY(0), so a mid-drag dismiss animates from where the finger left it"

key-files:
  created: []
  modified:
    - "radar-goiania.html — setView() (~line 1120): mAnimate() fade+±12px entrance on the incoming .mapwrap/.panel; showDetail() (~line 1541): mobile spring open + desktop fade; closeDetail() (~line 2064): snappier close from current transform; #grab IIFE (~line 2124): y0 renamed/promoted to shared SHEETDRAGY0, pointerup/touchend edited so the transform reset only happens on the not-dismissed branch"

key-decisions:
  - "Promoted the #grab IIFE's local `y0` to a shared top-level `let SHEETDRAGY0` (declared alongside mAnimate/mStagger in the Fase 6 motion block) — showDetail/closeDetail are defined much earlier in the file than the IIFE, so they need a variable in shared scope to read live drag status; a closure-local y0 would have been unreachable from those functions"
  - "Applied the plan's explicit pointerup edit (transform reset only on the dy<=70 branch) identically to the touchend fallback handler (legacy iOS without PointerEvent) — same premature-snap-back bug exists in both code paths, and the plan's own rationale (let Motion animate the close from the dragged position) applies equally to both; documented as a Rule 1 deviation since the plan's explicit code block only showed pointerup"
  - "closeDetail() reads `d.style.transform` (the live inline value, which is either empty or 'translateY(<dy>px)' from an in-progress/just-ended drag) as the close animation's start keyframe rather than hardcoding 'translateY(0)' — this is what makes the dragged-position handoff work end-to-end"
  - "Desktop .panel overlay only gets the entrance animation when becoming visible (data-view='busca'); exit stays the instant display:none swap per the plan's explicit allowance ('Exit can stay the instant display swap')"

patterns-established:
  - "Shared nullable gesture-state flag as the coordination primitive between a drag IIFE and animation call sites defined elsewhere in the same script scope"

requirements-completed: [MOT-02]

# Metrics
duration: 12min
completed: 2026-07-05
---

# Phase 6 Plan 2: Screen Transitions + Bottom-Sheet Spring Summary

**setView() now fades/slides the incoming mobile view or desktop `.panel` overlay (±12px, 180ms) and the mobile `.detail` sheet opens with a 420/38/1 spring and closes with a snappy 160ms ease-in, both fully coordinated with the existing `#grab` drag-to-dismiss gesture via a shared `SHEETDRAGY0` flag — all through the Plan 01 `mAnimate()` wrapper, with every state change staying unconditional.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-05T00:26:00Z (approx)
- **Completed:** 2026-07-05T00:38:02Z
- **Tasks:** 2/2 completed
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- `setView()` now animates the incoming view (mobile `.mapwrap`/`.panel`) or the desktop `.panel` overlay with `opacity:[0,1]` + `translateX(±12px→0)`, 180ms, `[0.22,1,0.36,1]` easing — direction follows the viewbar order (busca left of mapa) — while `document.body.dataset.view=v` and the `setTimeout(...invalidateSize;refreshLots,60)` remain byte-unchanged and unconditional
- No animation fires on the very first `setView("mapa")` call at init (previous view === target view), avoiding a spurious entrance flash on page load
- `showDetail()` now plays a `type:"spring", stiffness:420, damping:38, mass:1` open on the mobile sheet (`translateY(100%)→0`) and a fade+8px-translateY on the desktop inline detail card, both AFTER the unconditional `classList.add("show")`
- `closeDetail()` now plays a 160ms `[0.4,0,1,1]` ease-in close on mobile (starting from the sheet's CURRENT inline transform — `translateY(0)` if not dragged, `translateY(dy)` if closed mid-drag) and a fade+8px close on desktop, both AFTER the unconditional `classList.remove("show")`; the inline transform is cleared once the close animation settles (or immediately if Motion is absent/REDUCE)
- The `#grab` drag IIFE's local `y0` was promoted to a shared top-level `SHEETDRAGY0` so `showDetail`/`closeDetail` (defined earlier in the file) can read live drag status and gate every spring/animation on `SHEETDRAGY0==null` — Motion never fights the finger-driven inline transform during an active drag
- Implemented the plan's explicit `pointerup` edit: the unconditional `d.style.transform=""` reset now only runs on the `dy<=70` (not-dismissed) branch; on `dy>70` the transform is left alone and `closeDetail()`'s animation takes over from the dragged position — no premature snap-back
- Applied the identical fix to the `touchend` fallback handler (legacy iOS without `PointerEvent`) for consistency — same bug, same fix, see Deviations
- Verified: the exact main-app `<script>` block (lines 641–2174, containing every edit from this plan) parses with zero syntax errors via `node --check` on the extracted block

## Task Commits

Each task was committed atomically:

1. **Task 1: Animate screen transitions in setView() (mobile swap + desktop .panel overlay), interruptible, PE-safe** - `09456a1` (feat)
2. **Task 2: Bottom-sheet spring on .detail open/close, coordinated with #grab drag, interruptible, PE-safe** - `464f6c7` (feat)

_No TDD tasks in this plan (static single-file HTML app, no test harness) — plain feat commits._

## Files Created/Modified

- `radar-goiania.html` — `setView()` entrance animation; `showDetail()`/`closeDetail()` spring/fade + drag coordination; `#grab` IIFE promoted to shared `SHEETDRAGY0` state with the explicit pointerup/touchend edit

## Decisions Made

- **`SHEETDRAGY0` as shared top-level state** rather than exposing an accessor function — simplest correct fix given `showDetail`/`closeDetail` are defined ~600-1500 lines before the `#grab` IIFE in the same script scope; a plain `let` at the same declaration site as `mAnimate`/`mStagger`/`REDUCE` keeps all Fase-6 motion state grouped together.
- **`touchend` fix applied alongside the plan's explicit `pointerup` fix** (Rule 1 — see Deviations) — the legacy no-`PointerEvent` fallback path has the exact same premature-snap-back bug, and leaving it unfixed would mean older iOS Safari users get a worse (bouncy/jumpy) close animation than everyone else, defeating the plan's own T-06-06 mitigation for that code path.
- **`closeDetail()` reads `d.style.transform` live** instead of hardcoding a start value — this is the mechanism that satisfies "close animates from the dragged position, not a snap-back" (UI-SPEC section 2, drag handle coordination row).
- **No animation on `setView()`'s very first call** (init sets `dataset.view` to `"mapa"` directly, then immediately calls `setView("mapa")` — `prev===v` so the `if(prev!==v&&prev!==undefined)` guard skips the animation) — avoids an unwanted fade-in flash of the map on page load, which the plan/spec never asked for and would look like a bug.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Applied the pointerup premature-snap-back fix to the touchend fallback handler too**
- **Found during:** Task 2 (bottom-sheet drag coordination)
- **Issue:** The plan's action step 3 gave an EXPLICIT code edit for the `pointerup` handler only (fixing the unconditional `d.style.transform=""` that defeats "close from dragged position"). The legacy `touchend` fallback (used when `window.PointerEvent` is unavailable, e.g. older iOS Safari) has the byte-identical bug: `const dy=y0==null?0:(e.changedTouches[0].clientY-y0);y0=null;d.style.transform="";if(dy>70)closeDetail();` — same premature reset before `closeDetail()`, same defeat of the animated handoff.
- **Fix:** Mirrored the exact same restructuring (`if(dy>70){closeDetail();}else{d.style.transform="";}`) in the `touchend` handler, using the same shared `SHEETDRAGY0` flag.
- **Files modified:** radar-goiania.html (single file, both handlers in the same `#grab` IIFE)
- **Verification:** `grep` confirms both `pointerup` and `touchend` now share the same `if(dy>70){ closeDetail(); } else { d.style.transform=""; }` structure; main-app script block re-parses with zero syntax errors after the change.
- **Committed in:** `464f6c7` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug consistency fix, Rule 1)
**Impact on plan:** Necessary for correctness — leaving the `touchend` fallback with the old unconditional reset would mean legacy-iOS users (no `PointerEvent`) get a worse drag-dismiss experience than everyone else, silently contradicting the plan's own stated goal for that exact interaction. No scope creep — same file, same function family, same bug class already identified and fixed by the plan for the sibling handler.

## Issues Encountered

None. The naive `<script>`-tag regex extraction used for a syntax sanity-check produced one false positive (matching a Portuguese comment fragment "FISICAMENTE" inside the unrelated, pre-existing dormant-AI-seam script block as if it were code) — confirmed pre-existing (present identically before this plan's commits) and confirmed the actual main-app script block (lines 641–2174, containing every edit in this plan) parses cleanly when extracted by its real `<script>` tag boundaries via `node --check`.

## Next Phase Readiness

- `mAnimate()` now has three live call sites (Plan 02) on top of the Plan 01 foundation — Plan 03 (stagger for result cards + lot polygons, tap feedback) can proceed with confidence the wrapper/degradation contract works end-to-end in the real app, not just in isolation.
- `SHEETDRAGY0` is a new shared state variable Plan 03 should be aware of if it ever touches `.detail`/`#grab` (it should not need to — Plan 03's scope is cards/polygons/tap-feedback, unrelated to the sheet).
- No blockers for Plan 03.

---
*Phase: 06-motion-no-app-todo*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/06-motion-no-app-todo/06-02-SUMMARY.md
- FOUND: commit 09456a1 (Task 1)
- FOUND: commit 464f6c7 (Task 2)
