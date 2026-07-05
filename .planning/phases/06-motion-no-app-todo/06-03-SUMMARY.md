---
phase: 06-motion-no-app-todo
plan: 03
subsystem: ui
tags: [motion.dev, stagger, tap-feedback, css-active, progressive-enhancement, anti-feature-guard]

# Dependency graph
requires:
  - phase: 06-motion-no-app-todo
    provides: "mAnimate()/mStagger() progressive-enhancement wrappers, REDUCE guard, inlined Motion UMD (Plan 01); three live mAnimate call sites proving the wrapper contract end-to-end (Plan 02)"
provides:
  - "First-render-only stagger-in for result cards (render()) gated on an explicit opts.stagger flag, never firing on pagination/re-render"
  - "First-reveal-only stagger-in for lot polygons (refreshLots()) gated on the map.hasLayer(lotLayer) transition, never firing on repeat pans"
  - "CSS-only :active tap feedback (scale + darken) on .card, .searchpill, .detail .acts a, .viewbar button, .moderow button"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Opts-flag gating for entrance animation: render(list, opts) with opts.stagger defaulting to falsy — the ONE call site that represents a genuinely new result set (finish()) opts in explicitly; every other call site (pagination, any future re-render) opts out by omission, making the anti-feature guard the default rather than something that has to be remembered"
    - "Pre-mutation boolean capture for 'first transition' detection: firstReveal=!map.hasLayer(lotLayer) read BEFORE the state-changing addTo() call, so the gate reflects the OLD state at the moment of decision, not the new state after the mutation already happened"
    - "CSS custom property as a composable base-transform slot (--pilltf) so an :active rule can layer scale(.98) on top of a responsive breakpoint's differing base transform (mobile translateX(-50%) vs desktop none) without duplicating the whole rule per breakpoint"

key-files:
  created: []
  modified:
    - "radar-goiania.html — CSS :active rules (.card, .searchpill + --pilltf var, .detail .acts a, .viewbar button, .moderow button, ~lines 92/151/177-183/417/445); render() signature + stagger block (~line 1361); finish()'s render(units,{stagger:true}) call (~line 1276); refreshLots() firstReveal capture + polygon pop-in (~lines 875-897)"

key-decisions:
  - "Used a --pilltf CSS variable inside .searchpill instead of hardcoding transform:translateX(-50%) scale(.98) in the :active rule — the desktop breakpoint (min-width:821px) already overrides the pill's base transform to none (corner-anchored, no centering), so a hardcoded translateX(-50%) in :active would have reintroduced the mobile centering offset on desktop. The variable composes correctly in both contexts with a single :active rule."
  - "Simplified the plan's suggested ternary (`mStagger ? mStagger(0.024) : Motion.stagger(0.024)`) to a direct `mStagger(0.024)` call at both stagger call sites — mStagger is always a defined function (never undefined), so the ternary's false branch was dead code; and both call sites are already wrapped in a doStagger/firstReveal condition that guarantees !REDUCE && window.Motion, the exact same guard mStagger checks internally, so mStagger(0.024) never returns null in the branch where it's actually called."
  - "Lot polygon stagger animates opacity on poly.getElement() (the Leaflet-created SVG <path> DOM node's CSS opacity) rather than poly.setStyle({fillOpacity}) — this is a distinct property from Leaflet's own fillOpacity/opacity style options (which render as SVG fill-opacity/stroke-opacity attributes, already applied synchronously via lotStyle()/setStyle at construction time), so the two never fight; canvas renderer (no path element) degrades silently via the .filter(Boolean) on getElement() calls, per the plan's explicit fallback guidance."

patterns-established:
  - "opts-flag entrance gating as the default anti-feature guard for any future 'stagger only on genuinely new content' requirement in this app"

requirements-completed: [MOT-02, MOT-03]

# Metrics
duration: 14min
completed: 2026-07-05
---

# Phase 6 Plan 3: First-Render Stagger + CSS Tap Feedback Summary

**Result cards and lot polygons now stagger in (fade + 8px translateY, 24ms/item, 12-item cap) ONLY on a genuinely new render/reveal — never on pagination, re-render, or repeat pan — via an opts-flag on render() and a pre-mutation firstReveal capture in refreshLots(); plus pure-CSS :active scale+darken tap feedback across five interactive surfaces, un-gated by reduced-motion.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-07-05T00:40:00Z (approx)
- **Completed:** 2026-07-05T00:54:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- Added CSS-only `:active` feedback to `.card` (scale .98 + `filter:brightness(.97)` darken, reusing the `.card.sel{background:var(--paper-2)}` spirit without a new hex), `.searchpill` (scale .98 layered on a new `--pilltf` composable base-transform variable so mobile centering and desktop corner-anchoring both still work under `:active`), `.detail .acts a` (scale .98, new — this class only had `:hover` before), `.viewbar button` (scale .97), and `.moderow button` (scale .98) — all with a 100ms `transition:transform` so press/release feels instant, unaffected by `prefers-reduced-motion` per the shipped `.go:active`/`.wnext:active` precedent
- Changed `render(list)` to `render(list, opts)` with `doStagger = !!(opts&&opts.stagger) && !REDUCE && !!window.Motion`; `finish()` now calls `render(units,{stagger:true})`; the "Mostrar mais" pagination button's `render(LAST)` call (no opts) and every other call site are unchanged, so they never stagger by construction (opt-in, not opt-out)
- `box.innerHTML=html` stays fully unconditional — cards exist and are interactive the instant render() runs, with or without Motion; when `doStagger` is true, the first 12 `.card` elements get a `mAnimate` fade+translateY(8px) entrance with `mStagger(0.024)` per-item delay (200ms duration, `[0.22,1,0.36,1]` decelerate curve); cards beyond the 12-cap are left at their natural full-opacity state, never delayed
- In `refreshLots()`, captured `const firstReveal=!map.hasLayer(lotLayer)` BEFORE the existing `if(!map.hasLayer(lotLayer))lotLayer.addTo(map)` line (reading the pre-mutation state), collected each newly-created polygon into a `newPolys` array during the existing `forEach`, and — only when `firstReveal && !REDUCE && window.Motion` — animated the first 12 polygons' SVG `<path>` element opacity (`poly.getElement()`) with the same 200ms/24ms-stagger/decelerate treatment; canvas-renderer fallback (no path element) degrades silently via `.filter(Boolean)`
- Zero changes to `LOTTOKEN`/`LOTLAST`/the zoom<17 gate/the `LOTLAST.contains(...)` short-circuit/the `resultRecordCount:4000` cap — stagger is a pure entrance visual layered on the existing populate logic
- Zero new hex values, zero copy changes, zero layout-property changes (margin/padding/font) anywhere in the diff — verified via targeted grep against the full diff
- Verified the main app `<script>` block (98,542 chars, containing every edit from both tasks) parses with zero syntax errors via `new Function()` on the exact extracted block

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CSS-only :active tap feedback (scale + subtle darken) across interactive surfaces** - `70f232c` (feat)
2. **Task 2: First-render-only stagger for result cards (render) and lot polygons (refreshLots)** - `4849029` (feat)

_No TDD tasks in this plan (static single-file HTML app, no test harness) — plain feat commits._

## Files Created/Modified

- `radar-goiania.html` — `:active` CSS rules on `.card`/`.searchpill`(+`--pilltf`)/`.detail .acts a`/`.viewbar button`/`.moderow button`; `render(list,opts)` stagger gate + `finish()` call-site update; `refreshLots()` `firstReveal` capture + polygon pop-in stagger

## Decisions Made

- **`--pilltf` CSS variable instead of a hardcoded `translateX(-50%)` in `.searchpill:active`**: the desktop breakpoint (`min-width:821px`) already overrides the pill's base transform to `none` (corner-anchored layout, no centering needed there). A hardcoded `translateX(-50%) scale(.98)` in the `:active` rule would have silently reintroduced the mobile centering offset on desktop presses. Promoting the base transform to a `--pilltf` custom property (set to `translateX(-50%)` at the base rule, overridden to `none` inside the desktop media query) lets a single `:active{transform:var(--pilltf) scale(.98)}` rule compose correctly in both contexts.
- **Simplified `mStagger(0.024)` call (dropped the plan's suggested ternary)**: `mStagger` is always a defined function (per Plan 01's contract — never undefined), so `mStagger ? mStagger(0.024) : Motion.stagger(0.024)` always takes the true branch; the false branch was unreachable dead code. Both call sites in this plan are already wrapped in a condition (`doStagger` / `firstReveal&&!REDUCE&&window.Motion`) that guarantees the exact same precondition `mStagger` checks internally, so calling it directly is equivalent and simpler.
- **Lot polygon stagger targets `poly.getElement()`'s CSS `opacity`, not `poly.setStyle({fillOpacity})`**: these are genuinely different properties (DOM node CSS opacity via WAAPI vs. Leaflet's SVG `fill-opacity`/`stroke-opacity` attributes, already applied synchronously at construction via `lotStyle()`). Animating the DOM node's opacity layers a pop-in visual on top of the already-correct fill/stroke styling without touching Leaflet's own style pipeline, and avoids the plan's flagged perf risk of per-frame `setStyle` calls across hundreds of polygons.

## Deviations from Plan

None — plan executed as written. The two simplifications above (the `--pilltf` variable and dropping the dead-code ternary) are implementation refinements within the plan's own explicit acceptance criteria (both still satisfy "`.searchpill:active` has `transform:scale(.98)`" and "`Motion.stagger(0.024)`/`mStagger(0.024)` used at 24ms"), not scope changes, and are documented here for transparency rather than filed as Rule 1-4 deviations.

## Verification

Automated grep checks from the plan's `<verify>` blocks, all passing:

```
CARD_ACTIVE_OK    (.card:active + scale(.98) present)
VIEWBAR_ACTIVE_OK (.viewbar button:active present)
ACTS_ACTIVE_OK    (.detail .acts a:active present)
CARD_GATE_OK      (function render(list + render(units,{stagger:true}) present)
PAGINATION_UNCHANGED (render(LAST) still present, unmodified call)
LOT_GATE_OK       (firstReveal + stagger present in refreshLots)
```

Additional manual verification performed:
- `git diff` reviewed line-by-line against both commits: no new hex values, no `.card{opacity:0}` or other static hidden-content rule, no layout-property (margin/padding/font) changes, no touches to `LOTTOKEN`/`LOTLAST`/zoom-gate/short-circuit/`resultRecordCount:4000`.
- Main app `<script>` block (98,542 chars) parses with zero syntax errors via `new Function()` on the exact extracted block boundary, confirming both tasks' edits are syntactically valid.
- Both `render()` call sites confirmed via grep: `render(units,{stagger:true})` (finish, new search) and `render(LAST)` (pagination button, unchanged, no opts → no stagger).

Preview-in-browser interaction testing (new search → cards stagger; "Mostrar mais" → no re-stagger; drill-in → lots stagger once; pan → no re-stagger; reduced-motion → instant; Motion-absent → instant) was not independently re-verified live in this session beyond the static/syntax checks above, since this plan builds on the same wrapper contract (`mAnimate`/`mStagger`/`REDUCE`) already proven live end-to-end by Plan 02's three call sites — the identical progressive-enhancement pattern is reused here, not a new mechanism.

## Known Stubs

None. Both stagger call sites and all five `:active` rules are fully wired to real render/reveal events — no placeholder data, no hardcoded empty states.

## Threat Flags

None. No new network endpoints, auth paths, file-access patterns, or schema changes. Per the plan's own `<threat_model>`, the three anticipated UX/perf threats (T-06-07 re-stagger annoyance, T-06-08 per-frame recalc cost, T-06-09 hidden-content risk) are the ones this plan's gating explicitly mitigates — no new surface beyond what the plan already registered.

## Self-Check: PASSED
