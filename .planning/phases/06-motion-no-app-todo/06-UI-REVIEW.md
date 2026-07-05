# Phase 6 — UI Review (Motion no App Todo)

**Audited:** 2026-07-04
**Baseline:** `06-UI-SPEC.md` (motion design contract — exact durations/easings/spring params/stagger caps/reduced-motion/PE)
**Screenshots:** not captured (no dev server on :3000/:5173/:8080 — this is a static single-file HTML app with no build; audit is code-only against the contract). Orchestrator separately confirmed live: Motion loads inline, PE contract holds (mAnimate returns null under REDUCE with no throw), zero console errors.

**Scope:** ONLY the Phase 6 motion additions (foundation wrappers, setView transitions, `.detail` spring, first-render stagger, `:active` tap feedback, reduced-motion guard). Satellite crossfade (Phase 4) and all non-motion code are out of scope and were not re-audited.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | N/A per contract — zero new copy introduced, confirmed by diff |
| 2. Visuals | 4/4 | Every animated property across all 7 `mAnimate()` call sites is `transform`/`opacity` only; zero layout-triggering properties |
| 3. Color | 4/4 | Zero new hex values in the diff; tap-feedback darken reuses `filter:brightness()`, no new token |
| 4. Typography | 4/4 | Zero font-size/weight/line-height changes; diff-matched lines only gained `transition:` clauses |
| 5. Spacing | 4/4 | Zero margin/padding changes; stagger's 8px translateY is transform-only, not spacing |
| 6. Experience Design | 4/4 | PE guard is bulletproof (never throws, state changes unconditional); interruptibility, drag coordination, and reduced-motion are all correctly wired |

**Overall: 24/24**

---

## Top 3 Priority Fixes

None are blocking — the implementation is contract-faithful across every checked dimension. Two minor/cosmetic observations are noted for awareness, not required action:

1. **Screen-transition slide direction is a plausible-but-unverifiable reading of an ambiguous spec sentence** — no user-facing impact (the ±12px magnitude and opposite-sign-per-direction mechanic are both correct; only the specific left/right mapping is arguably inverted relative to one possible reading of the spec prose) — no fix needed unless a future spec revision pins the exact sign with a diagram; if it matters, swap `startX=v==="busca"?-12:12` to `v==="busca"?12:-12` at `radar-goiania.html:1146`.
2. **`poly.getElement()` silent-fallback comment (lot stagger) is defensive code for a code path that doesn't currently occur** — `lotLayer` uses Leaflet's default SVG renderer (only `bairroLayer` uses `L.canvas`), so the stagger always finds real elements today; no fix needed, just noting the comment describes a currently-dormant fallback, not a bug.
3. No third finding — no defects were identified in this audit.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
Contract states "not applicable — no new copy introduced." Confirmed via `git diff 85b89a7..4849029 -- radar-goiania.html` (the full Phase 6 commit range): no new toast/label/button-text strings were added. All motion is applied to pre-existing DOM elements/copy.

### Pillar 2: Visuals (4/4)
All 7 `mAnimate()` call sites audited (`radar-goiania.html:897, 1148, 1400-1402, 1572-1573, 2101-2102`) animate exclusively `opacity` and/or `transform` (translateX/translateY). Zero instances of `top`/`left`/`width`/`height`/`margin` in any animation call — satisfies the "compositor-thread only, non-negotiable" contract clause verbatim. No new `pointer-events:none` was introduced by Phase 6 (the two existing hits in the file predate this phase and are unrelated: a decorative `::before` overlay and a disabled-button style). Existing `:root` tokens, radii, fonts, and touch targets are untouched (confirmed no CSS custom-property or radius changes in the diff).

### Pillar 3: Color (4/4)
`git diff` across the full Phase 6 commit range shows zero new hex/rgb color values introduced (grep for `#[0-9a-fA-F]{3,8}` on added lines returns nothing outside the embedded third-party Motion UMD blob, which is expected library code, not app color). Tap-feedback darken (`radar-goiania.html:151`, `.card:active{transform:scale(.98);filter:brightness(.97)}`) uses a CSS filter, not a new color token — matches spec's explicit instruction to reuse existing color mechanics, never introduce a new hex.

### Pillar 4: Typography (4/4)
Diff-filtered check (excluding the embedded Motion UMD blob line) shows the only touched CSS rules with `font`/`padding` in their line (`.moderow button`, `.card`, `.detail .acts a`) had their `transition:` clause extended (e.g., appending `,transform .1s ease`) — the `font`/`padding` values themselves are byte-identical to before. Zero font-size/weight/line-height changes confirmed. Stagger and screen-transition animations only ever touch `transform`/`opacity`, never typography properties, matching the "never change font-size, weight, or line-height mid-animation" clause.

### Pillar 5: Spacing (4/4)
No margin/padding changes found in the diff (see Pillar 4 detail — same evidence). The stagger's `translateY(8px)` (`radar-goiania.html:897, 1401, 1573`) and screen-transition's `translateX(±12px)` (`radar-goiania.html:1148`) are transform values, correctly not counted as spacing per the spec's explicit clarification.

### Pillar 6: Experience Design (4/4)
This is where the bulk of the contract's risk lives, and it holds up well:

- **PE guard bulletproof:** `mAnimate()`/`mStagger()` (`radar-goiania.html:684-692`) check `REDUCE || !window.Motion || typeof ...!=="function"` before ever touching `Motion`, wrap the call in `try/catch`, and return `null` on any failure — never throw. Every call site performs the real state change (`data-view` swap at `:1137`, `.show` class toggle at `:1568`/`:2093`, `box.innerHTML=html` at `:1396`) unconditionally, outside/before the `mAnimate()` call — confirmed at all sites. This exactly matches the "state change happens unconditionally OUTSIDE the guard" pattern mandated in Section 6.
- **Reduced-motion, both layers present since commit `c18fcdf` (06-01, first motion commit):** global CSS kill-switch (`:52-59`) matches the spec's exact block verbatim; JS guard `let REDUCE` (`:677`) with a live `matchMedia(...).addEventListener("change", ...)` listener (`:678`) correctly uses `let` not `const` to support live OS-setting toggles, per spec.
- **Interruptibility:** confirmed no `await mAnimate(...)` anywhere in the file (only one `.finished.then()` fire-and-forget cleanup at `:2103`, which does not gate any subsequent logic). Motion's native WAAPI re-entrant `animate()` behavior is relied upon as specified — no manual "is animating" state tracking that could block re-entry.
- **Drag-to-dismiss coordination:** `SHEETDRAGY0` shared flag (`:695`) correctly gates both `showDetail()` (`:1571`) and `closeDetail()` (`:2097`) from ever starting a Motion animation while `y0!=null`. On `pointerup`, `dy<=70` resets `d.style.transform=""` as a no-op (spring already at rest) and `dy>70` calls `closeDetail()`, which animates from the CURRENT dragged transform value (`:2100`, `const from=d.style.transform||"translateY(0)"`) rather than a stale `translateY(100%)` — exactly the "interruptible mid-drag→animated-close handoff" the spec requires.
- **Stagger first-render-only gating, both triggers correct:** Cards — `render(list, opts)` only staggers when `opts.stagger===true` (`:1375`), and only search entry points (`:1287`, `render(units,{stagger:true})`) pass that flag; the "Mostrar mais" pagination path (`render(LAST)`, no opts) never re-triggers. Lots — `firstReveal=!map.hasLayer(lotLayer)` (`:875`) is captured before `clearLayers()`/`addTo()`, exactly matching the spec's suggested detection point; subsequent pans within the same drill session never re-stagger.
- **Spring/easing/duration values verified exact:** sheet open spring `{stiffness:420,damping:38,mass:1}` (`:1572`) matches spec verbatim; screen transitions `180ms`/`[0.22,1,0.36,1]`/`±12px` (`:1148`) match; stagger `200ms`/`[0.22,1,0.36,1]`/`24ms` delay/12-item cap (`:1400-1402`) match; sheet close `160ms`/`[0.4,0,1,1]` (`:2101`) matches the spec's suggested snappier close curve; tap feedback `transition:transform .1s ease` present on every listed selector (`.card`, `.searchpill`, `.detail .acts a`, `.viewbar button`, `.moderow button` — all confirmed at `:90,147-148,177-183,414-415,442-448`).
- **Registry safety (Motion UMD inline embed):** version/source/license comment present verbatim (`:18`, "Motion (motion.dev) v12.42.2 ... Source: https://cdn.jsdelivr.net/npm/motion@12.42.2/dist/motion.js — License: MIT"). Confirmed zero `eval(`/`new Function(` occurrences in the actual embedded minified source (line 20) — the single grep hit across the whole file was the header comment's own descriptive text, not a real occurrence. No CSP/`sw.js` changes in the diff.
- **`.sat-fade`/Phase-4 non-interference:** confirmed zero touches to `.sat-fade` or `.leaflet-tile` anywhere in the full Phase 6 diff (`git diff 85b89a7..4849029`) — the crossfade precedent from Phase 4 was correctly left alone.

No deductions found. The two items noted under "Top 3 Priority Fixes" are informational only and do not affect this score.

---

## Registry Safety

Not applicable — no `components.json`/shadcn in this project (confirmed: `test -f components.json` → not found), consistent with the UI-SPEC's own "Not applicable" statement for this phase. The Motion UMD embed is not a registry block; it was audited above under Experience Design/Pillar 6 per the spec's own verification checklist (Section "Registry Safety" in `06-UI-SPEC.md`), not under the shadcn-specific registry-audit flow. Result: clean — provenance comment present, no `eval`/`new Function`, no CSP/`sw.js` impact.

---

## Files Audited

- `C:\Users\bruno\Documents\Projeto Radar Fundiário\radar-goiania.html` (lines 1-60 head/CSS, 40-60 reduced-motion CSS block, 674-696 motion foundation, 860-899 lot stagger, 1100-1150 setView transitions, 1280-1410 render/card stagger, 1550-1580 showDetail spring, 2080-2175 closeDetail + drag-to-dismiss coordination, plus targeted greps across the full file for `:active` selectors, `mAnimate(` call sites, `pointer-events`, `eval`/`new Function`)
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\.planning\phases\06-motion-no-app-todo\06-UI-SPEC.md` (contract)
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\.planning\phases\06-motion-no-app-todo\06-CONTEXT.md` (decisions)
- Git history: `git diff 85b89a7..4849029 -- radar-goiania.html` (full Phase 6 diff, commits `bdc6f3f` through `4849029`) used to confirm zero new hex/typography/spacing values and zero touches to `.sat-fade`/`.leaflet-tile`
