---
phase: 06-motion-no-app-todo
plan: 01
subsystem: ui
tags: [motion.dev, umd, inline-embed, prefers-reduced-motion, progressive-enhancement, csp]

# Dependency graph
requires:
  - phase: 04-camada-de-satelite
    provides: "existing .sat-fade transition precedent (scoped, not touched) and CSP baseline"
provides:
  - "Motion (motion.dev) v12.42.2 UMD build inlined in radar-goiania.html, exposed as window.Motion"
  - "Global prefers-reduced-motion CSS kill-switch"
  - "Live-reactive JS REDUCE guard (let, matchMedia change listener)"
  - "mAnimate()/mStagger() progressive-enhancement wrappers — the seam Plans 02/03 will call"
affects: [06-02-screen-transitions-and-sheet, 06-03-stagger-and-tap-feedback]

# Tech tracking
tech-stack:
  added: ["motion@12.42.2 (motion.dev, UMD, inlined — not CDN)"]
  patterns:
    - "Inline-embed third-party UMD build directly in the single HTML file (frozen bytes, no live CDN fetch, no CSP change) with a provenance/license comment"
    - "Progressive-enhancement wrapper (mAnimate/mStagger) that never throws and no-ops on missing lib or reduced-motion — callers always perform the real state change unconditionally, animation is a pure visual add-on"

key-files:
  created: []
  modified:
    - "radar-goiania.html — inline Motion UMD (lines ~18-21), reduced-motion CSS block (~lines 51-59), REDUCE guard + mAnimate/mStagger (~lines 670-687)"

key-decisions:
  - "Pinned motion@12.42.2 (latest resolvable 12.x on jsdelivr at implementation time) rather than an older/arbitrary 12.x patch — verified the exact dist/motion.js UMD path resolves before downloading"
  - "Used dist/motion.js (139KB minified UMD), not dist/motion.dev.js (527KB unminified dev build) — minified is the correct inline-embed choice for file size"
  - "mStagger() added alongside mAnimate() (not in original task 2 code sample, but explicitly anticipated by the plan's 'Optionally expose a mStagger passthrough' instruction) to pre-seed Plan 03's stagger call sites with the same guarantee (never throws, no-ops on missing Motion/REDUCE)"

patterns-established:
  - "Eval-scan gate as a hard blocking check before inlining any third-party build under a CSP with no 'unsafe-eval' — grep for eval(/new Function(/Function('..' with manual review of every match's context (minified identifiers like 'removeValueFromRenderState' will false-positive on substring 'eval' and must be visually confirmed benign, not just counted)"

requirements-completed: [MOT-01]

# Metrics
duration: 15min
completed: 2026-07-05
---

# Phase 6 Plan 1: Motion Foundation (Inline Embed + Reduced-Motion + Progressive Enhancement) Summary

**Motion (motion.dev) v12.42.2 UMD inlined with a clean eval-scan, plus the prefers-reduced-motion CSS/JS guard and mAnimate()/mStagger() no-throw wrappers — all landed before any animation call site exists.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-05T00:15:00Z (approx, first commit 21:27:43 -03 / 00:27:43Z)
- **Completed:** 2026-07-05T00:30:29Z
- **Tasks:** 2/2 completed
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- Downloaded and eval-scanned the Motion v12.42.2 UMD build (`dist/motion.js`, 139,409 bytes) from jsdelivr — **zero matches** for `eval(`, `new Function(`, or dynamic `Function(...)` calls anywhere in the build (confirmed clean, not just absence of the literal pattern — every substring match on "eval"/"Function" was manually reviewed and is a benign minified identifier fragment like `removeValueFromRenderState` or `setAnimateFunction`)
- Inlined the entire UMD build as a dedicated `<script>` block between the proj4 and caixa-goiania.js `<script src>` tags, with a provenance comment stating version, source URL, and MIT license
- Confirmed `<script src>` count stayed exactly 3 (no CDN tag added) and CSP line 7 / `sw.js` are byte-identical to before
- Added the global `@media (prefers-reduced-motion: reduce)` CSS kill-switch to the app's `<style>` block (right after `:root`, before `*{box-sizing:border-box}`)
- Added a live-reactive `let REDUCE` guard plus a `matchMedia(...).addEventListener("change", ...)` listener so the OS-level setting is honored even if toggled mid-session
- Added `mAnimate(el, keyframes, options)` and `mStagger(...args)` progressive-enhancement wrappers: both return `null` (never throw) when Motion is absent, `Motion.animate`/`Motion.stagger` isn't a function, or `REDUCE` is true; both wrap the real Motion call in try/catch as a second safety net
- Verified all 3 real `<script>...</script>` blocks in the file (Motion UMD, main app script, dormant AI seam) parse with **zero syntax errors** via `new Function(body)` on each exact block
- No call sites wired — `mAnimate`/`mStagger` are inert until Plans 02/03; app behavior is unchanged from before this plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Download + eval-scan + inline-embed Motion UMD with provenance comment** - `bdc6f3f` (feat)
2. **Task 2: Add reduced-motion CSS + REDUCE guard + mAnimate()/mStagger() wrapper** - `c18fcdf` (feat)

_No TDD tasks in this plan (static single-file HTML app, no test harness) — plain feat commits._

## Files Created/Modified

- `radar-goiania.html` — inline Motion v12.42.2 UMD build + provenance comment (after proj4 `<script src>`, before caixa-goiania.js `<script src>`); global reduced-motion CSS block in `<style>`; `let REDUCE` guard + live `change` listener + `mAnimate()`/`mStagger()` wrappers in the app's top-level state block (alongside `AUTO_COEF`)

## Decisions Made

- **Motion version 12.42.2** (verified via jsdelivr's package-resolution API to be the latest published 12.x at implementation time) — pinned explicitly in both the provenance comment and the downloaded URL, not `@latest`.
- **`dist/motion.js` over `dist/motion.dev.js`**: the package ships both a 139KB minified UMD (`motion.js`) and a 527KB unminified dev UMD (`motion.dev.js`); the minified build is the correct choice for a single-file offline-first app where every KB is shipped to the client on every load.
- **`mStagger()` added proactively**: the plan's action step 3 said "Optionally expose a `mStagger` passthrough to `Motion.stagger` guarded the same way (used by Plan 03)" — added it now since it costs nothing, follows the exact same safety pattern as `mAnimate`, and pre-seeds Plan 03 without requiring a foundation change later.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1-4 deviations were needed; no architectural questions arose; no auth gates were hit (no CLI login required for a static file + public CDN download).

## Eval-Scan Result (BLOCKING gate, Task 1 step 2)

**Result: CLEAN.** Command run: `grep -noE "eval\(" / "new Function\(" / "Function\(['\"]" ` against the downloaded `dist/motion.js` (139,409 bytes) — zero matches for all three patterns. A broader case-insensitive `eval` substring scan and a `Function` identifier count (1 occurrence) were also run and manually reviewed: every match is a benign minified identifier fragment (`removeValueFromRenderState`, `transformTemplateValue`, `setAnimateFunction`, `easingDefinitionToFunction`, etc.), not a dynamic-code-execution call. Motion is confirmed WAAPI-based as documented in STACK.md. Since the eval-scan is clean, embedding proceeded per the plan; CSP line 7 (no `'unsafe-eval'`) required no change and remains byte-identical.

## Motion Version

**motion@12.42.2**, UMD build at `https://cdn.jsdelivr.net/npm/motion@12.42.2/dist/motion.js` (139,409 bytes), License: MIT. Provenance comment recorded inline in `radar-goiania.html` immediately above the pasted build.

## Self-Check Preview

Static verification performed (single-file app, no build/test harness):
- All 3 real `<script>` blocks parse with zero syntax errors (`new Function(body)` on each exact block boundary)
- `grep -c '<script src'` → 3 (unchanged)
- CSP line 7 diff against pre-plan commit → unchanged
- `sw.js` not present in either commit's diff
- A temporary static file server was started locally to confirm the file is servable (HTTP 200); no console-error check was performed via an automated browser tool in this environment, but the syntax-parse check + zero behavioral changes (no call sites wired) make a runtime JS error from this plan's changes highly unlikely — Plans 02/03 will exercise `mAnimate`/`mStagger` for the first time and are where live console verification becomes load-bearing.

## Known Stubs

None. `mAnimate`/`mStagger` are intentionally unwired (no call sites) per the plan's explicit scope — this is the documented foundation-only design, not a stub; Plans 02 and 03 wire them.

## Threat Flags

None. No new network endpoints, auth paths, file-access patterns, or schema changes were introduced. The only new surface (inlined third-party UMD executing with full page privileges) was already identified and mitigated in the plan's own `<threat_model>` (T-06-01, T-06-02) via the eval-scan gate and version pinning — both satisfied.

## Self-Check: PASSED
