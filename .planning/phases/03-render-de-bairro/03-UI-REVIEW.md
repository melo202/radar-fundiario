# Phase 3 — UI Review

**Audited:** 2026-07-04
**Baseline:** `.planning/phases/03-render-de-bairro/03-UI-SPEC.md` (approved design contract)
**Screenshots:** not captured (no dev server on :3000/:5173/:8080 — this is a static single-file app; code-only audit)
**Scope:** Phase 3 additions only — `BAI_STYLE`/`BAI_HOVER`, bairro polygon layer, hover/tap highlight, name tooltip, breadcrumb, zoom-gating. Orchestrator has already confirmed live that hover highlight and breadcrumb render/interact correctly in-browser.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Tooltip/breadcrumb copy matches contract exactly, including gleba fallback. |
| 2. Visuals | 3/4 | Outline/fill treatment correct; hover highlight visually confirmed working live despite the color bug below (see Pillar 3 for why). |
| 3. Color | 2/4 | `BAI_STYLE`/`BAI_HOVER` pass literal `"var(--line)"`/`"var(--accent)"` strings into a **Canvas** renderer, which cannot resolve CSS custom properties — a live-browser color/token bug, not a code-review nitpick. |
| 4. Typography | 4/4 | Zero new font rules; tooltip and breadcrumb both reuse existing type styles verbatim. |
| 5. Spacing | 4/4 | Breadcrumb spacing matches the declared exception (12px 14px / 44px floor) precisely; desktop stacking offset matches spec math exactly. |
| 6. Experience Design | 3/4 | Zoom-gate, silent-fail fetch, and SW precache/version-bump all correct; single-function hover/tap logic matches contract; minor: no visible-but-inert state check for reduced-motion/no-canvas fallback. |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **`BAI_STYLE.color`/`fillColor` and `BAI_HOVER.color` are the literal strings `"var(--line)"` / `"var(--accent)"`, passed straight into `L.canvas()` rendering** (`radar-goiania.html:693-694,818`) — user impact: the Canvas 2D API (`ctx.strokeStyle`/`ctx.fillStyle`) does not participate in the CSS cascade and cannot resolve `var(--x)` tokens; most browsers silently coerce an unparseable color string to black (or ignore the assignment, keeping the canvas default), so bairro outlines almost certainly render as **black lines**, not the intended tan `--line` (idle) / red `--accent` (hover) — breaking the "bairro ≠ lote, hover=accent" visual grammar the whole spec is built around. Concrete fix: resolve the tokens once at layer-init time with `getComputedStyle(document.documentElement).getPropertyValue('--line').trim()` (and `--accent`), and build `BAI_STYLE`/`BAI_HOVER` from those resolved hex strings — exactly how `LOT_STYLE`/`LOT_HOVER` already hardcode `"#2c5545"`/`"#b5451f"` at lines 686-687. This is a 4-line fix, not a redesign, and should be verified visually once fixed (a quick screenshot pass alone would likely have missed this, since a thin black line at low zoom can look plausible at a glance).

2. **No visual regression check confirming bairro stroke color post-fix** — user impact: once fix #1 lands, re-verify in-browser (the orchestrator's earlier live check confirmed hover *behavior* works, i.e., the highlight and tooltip fire correctly — but did not isolate whether the rendered *color* is the correct accent-red vs. an accidental black-render that happens to look acceptably dark). Concrete fix: after applying the `getComputedStyle` resolution, do one visual pass at city zoom to confirm idle stroke reads as warm tan (`--line` `#c3b9a3`) against the paper background, and hover reads as the oxide-red accent (`--accent` `#b5451f`), not near-black in either state.

3. **Minor: `baiStyle(feature)` always returns the shared `BAI_STYLE` object reference, not a fresh copy** — user impact: negligible today (Leaflet's `style:` option is only read at initial render, and `setStyle()` on hover already replaces the whole style object via `BAI_HOVER`, so no mutation bug exists yet), but worth a note since the spec explicitly calls out keeping style resolution as "a small function of feature properties" to make a v2.1 territory-conditional branch (`isMyTerritory`) a cheap addition later. Concrete fix (future, not urgent): when v2.1 adds a conditional branch inside `baiStyle()`, return a new object per branch rather than mutating/sharing `BAI_STYLE`, to avoid any risk of one bairro's hover state leaking into another's idle style via shared-reference mutation.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

- Tooltip named bairro: `highlightBairro()` at `radar-goiania.html:772` — `const lbl=(nm&&nm.trim())?esc(nm):"Área rural / gleba";` — exact match to spec's `{NM_BAI}` / `"Área rural / gleba"` fallback, correctly `esc()`-escaped per contract.
- Breadcrumb bairro crumb: `showBreadcrumb()` at line 782 uses the identical fallback string and `esc()` call, satisfying the spec's "same label in the breadcrumb they saw in the tooltip" requirement.
- Breadcrumb "Goiânia" home crumb: static markup at line 540, exact string match.
- Separator: `›` at line 541, matches contract literally.
- Error state (GeoJSON fetch fails): `loadBairroPolys()` lines 811-816 — `catch(e){console.warn(...);return;}` — fails silently exactly as the contract specifies (console-only, no user-facing toast, map/search/lots unaffected). Correct.
- No new generic-label anti-patterns ("Submit"/"Click Here"/"OK") introduced by this phase's additions.

### Pillar 2: Visuals (3/4)

- Bairro layer correctly rendered as outline: `fillOpacity:.03` (idle) / `.08` (hover) — both near-transparent per MAPA-02 "linha" requirement, not a filled choropleth. Matches spec values exactly (`radar-goiania.html:693-694` vs. spec lines 84-92).
- Weight delta (1 → 2.5) mirrors `LOT_STYLE`/`LOT_HOVER` exactly, preserving the app's existing hover-grammar (thin idle stroke → thicker highlighted stroke).
- Icon-only elements: none introduced by this phase (breadcrumb crumb is a text button, `aria-label="Navegação do mapa"` present on the `<nav>` at line 539) — satisfies the accessible-labeling check.
- Deducted one point purely because the color-token bug in Pillar 3 has a direct, unavoidable visual consequence (wrong stroke color) — this is scored here as well since "visuals" and "color implementation" are adjacent concerns, even though the root cause is filed under Pillar 3.

### Pillar 3: Color (2/4)

- **Critical:** `BAI_STYLE`/`BAI_HOVER` (`radar-goiania.html:693-694`) define `color`/`fillColor` as the literal strings `"var(--line)"` and `"var(--accent)"`. These objects are passed to `L.geoJSON(..., {style:baiStyle, ...})` at line 818, where `baiStyle()` returns `BAI_STYLE` directly (line 696), and the layer is explicitly configured with `renderer:L.canvas({pane:"bairros"})`. Leaflet's canvas renderer paints polygons via `CanvasRenderingContext2D` (`ctx.strokeStyle = layer.options.color`), and the Canvas 2D API only accepts resolved color values (hex/rgb/hsl/named) — it has no access to the CSS custom-property cascade, since canvas pixels are painted outside the DOM/CSSOM entirely. Per spec, this violates "BAI_STYLE uses var(--line), BAI_HOVER uses var(--accent)... ZERO new hex" in spirit: the intent was to reuse the token *values*, but the implementation reuses the token *reference string*, which does not work in a canvas context. Contrast with `LOT_STYLE`/`LOT_HOVER` (lines 686-687), which correctly hardcode the resolved hex (`"#2c5545"`, `"#b5451f"`) — proving the existing codebase already knows canvas needs literal color values; this phase's bairro constants deviated from that established, working precedent.
- Everything else color-related is correct: breadcrumb CSS (lines 174-183) uses proper `var(--paper-2)`, `var(--accent)`, `var(--accent-ink)`, `var(--line)`, `var(--ink)`, `var(--muted)` — all resolved correctly since that's real CSS on real DOM elements, not canvas. Tooltip CSS (`.leaflet-tooltip`, line 403-404) likewise correctly resolves `var(--ink)`/`var(--paper-2)`.
- Accent usage confined to hover/tap highlight and the clickable "Goiânia" crumb — matches the spec's "Accent (10%) reserved for... ONLY" list, no overuse detected.
- Zero new hex literals were added to the stylesheet or JS for this phase (the bug is a var-in-canvas mismatch, not a new-hex violation) — the letter of "zero new hex" is technically satisfied, but the functional intent (distinct, correct bairro-line and hover-accent colors visible on screen) is not, hence the 2/4 rather than an outright 1/4 (no destructive/inaccessible color combination exists — worst case is a black line, which is still legible against the paper background, just not on-brand).

### Pillar 4: Typography (4/4)

- Bairro tooltip: reuses `.leaflet-tooltip` verbatim (`font:500 11.5px/1.5 "IBM Plex Sans"`, line 403) — zero new tooltip class, exactly as contracted. No inline font override found in `bindTooltip()` calls (line 799, 750 for lots) or in `highlightBairro()`.
- Breadcrumb: `font:600 12.5px/1 "IBM Plex Sans"` (line 178) on the container; `.crumb.sep{font-weight:400}` (line 182) correctly de-emphasizes the separator against the 600-weight crumbs (`.crumb.city`, `.crumb.bairro`) — exactly the 2-weight system the spec calls for (400/600, zero new sizes).
- No third font size or third weight introduced anywhere in the diff.

### Pillar 5: Spacing (4/4)

- `#breadcrumb .crumb{padding:12px 14px;min-height:44px}` (line 179) — matches the spec's documented exception verbatim (12px 14px scaled from `.backlist`'s 9px 11px, guaranteeing the 44px tap-target floor). `.crumb.sep{padding:0 2px;min-height:0}` correctly opts the non-interactive separator out of the 44px floor, which is appropriate (it's not a tap target).
- `#breadcrumb{gap:4px}` (line 175) matches the declared `xs=4px` breadcrumb-separator-gap token.
- Desktop stacking: line 450 `top:calc(24px + 44px + 8px);left:24px` is an exact transcription of the spec's formula (pill top 24px + pill height 44px + 8px gap), left-column-aligned with `.searchpill` at the same breakpoint (line 448) — verified no arithmetic drift.
- Mobile collision guard: `max-width:calc(50vw - 24px)` on `#breadcrumb` (line 178) plus `.crumb.bairro{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}` (line 183) — matches the spec's measurable truncation contract precisely, and correctly scopes the ellipsis truncation to the bairro-name span rather than the whole breadcrumb, as the spec explicitly required.
- No arbitrary/non-scale spacing values found in the diff outside the one documented exception.

### Pillar 6: Experience Design (3/4)

- Zoom-gate: `map.on("zoomend", ...)` at lines 675-680 toggles `bairroLayer` at the exact `z>=17` threshold matching the lot layer's existing entry point (`refreshLots()` line 726 also gates at `<17`) — single handoff number, no dead zoom band, exactly per spec's "one boundary system in charge" rationale.
- Single-function hover/tap contract: `highlightBairro()` (line 768) + `onEachBairro()` touch-branch (lines 798-809) is one shared highlight function gated by `matchMedia("(hover:none)")`, matching the `refreshLots()` precedent the spec/context explicitly demanded — not two divergent code paths.
- Mobile 2-tap drill logic (`if(baiHi===layer){drillBairro(layer);}else{highlightBairro(layer);}`, line 803) and desktop direct-click drill (line 808) both match the States table in the spec exactly, including the "tap a different bairro while one is highlighted" reset behavior (handled inside `highlightBairro()` line 769: `if(baiHi&&baiHi!==layer){baiHi.setStyle(BAI_STYLE);baiHi.closeTooltip();}`).
- Breadcrumb persistence-on-manual-zoom-out: no code ties `hideBreadcrumb()` to the `zoomend` listener — it's only called from `goHomeCrumb()` (line 790) — correctly satisfying the spec's "do NOT tie breadcrumb visibility to the same zoom gate" recommendation, avoiding flicker.
- `dismissCoach()` is called inside `drillBairro()` (line 793) per the spec's discretion note for the coachmark/breadcrumb overlap edge case — correctly implemented as instructed rather than repositioning the coachmark.
- Error/progressive-enhancement state: silent `console.warn` + early return on fetch failure (lines 814-816, 820) — matches spec exactly, lots/search remain unaffected.
- `sw.js` precache updated: `bairros-goiania.json` added to the precache list and `CACHE` bumped to `"radar-v4"` — satisfies the non-visual implementation reminder that was flagged as functionally load-bearing for the visual contract (offline/repeat-visit rendering).
- Deducted one point: no functional issue found in state coverage itself, but the canvas-color bug (Pillar 3) is technically an "unhandled visual state" — the bairro layer silently renders in a visually-wrong-but-not-broken way with no console warning to signal the mismatch, which is the kind of silent degradation the app's own error-handling philosophy (fail loud in dev, quiet in prod) would ideally have caught. Not a blocking functional bug, hence 3/4 not lower.

---

## Files Audited

- `C:\Users\bruno\Documents\Projeto Radar Fundiário\radar-goiania.html` — lines 160-200 (breadcrumb/coachmark/tooltip/backlist CSS), 385-405 (`.leaflet-tooltip`, `.detail .acts`), 440-543 (desktop breakpoint override, breadcrumb markup), 660-822 (`initMap`, zoom-gate listener, `LOT_STYLE`/`LOT_HOVER`, `BAI_STYLE`/`BAI_HOVER`, `baiStyle()`, `highlightBairro()`, `clearBaiHi()`, `showBreadcrumb()`/`hideBreadcrumb()`/`goHomeCrumb()`, `drillBairro()`, `onEachBairro()`, `loadBairroPolys()`)
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\sw.js` — lines 1-15 (precache list, cache version)
- `.planning/phases/03-render-de-bairro/03-UI-SPEC.md` — full contract
- `.planning/phases/03-render-de-bairro/03-CONTEXT.md` — full context

**Registry audit:** not applicable — no `components.json` present, no shadcn/third-party component registries in this single-file app (confirmed per spec's own Registry Safety section).
