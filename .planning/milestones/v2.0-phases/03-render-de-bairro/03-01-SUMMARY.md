---
phase: 03-render-de-bairro
plan: 01
subsystem: map-bairro-layer
tags: [leaflet, canvas, pwa, service-worker]
dependency-graph:
  requires: []
  provides:
    - bairroLayer (Leaflet GeoJSON layer, Canvas-rendered, pane "bairros")
    - highlightBairro() / clearBaiHi() (single touch-gated highlight function)
    - drillBairro() (fitBounds drill on click/2nd-tap)
    - sw.js precache of bairros-goiania.json (radar-v4)
  affects:
    - "03-02 (breadcrumb plan): will call clearBaiHi() / drillBairro() state and read bairroLayer"
tech-stack:
  added: []
  patterns:
    - "Style resolution via a small function (baiStyle) rather than inline object, mirroring LOT_STYLE/LOT_HOVER grammar for cheap v2.1 territory-styling extension"
    - "Single interaction function gated by matchMedia('(hover:none)') instead of duplicated desktop/mobile code paths"
key-files:
  created: []
  modified:
    - radar-goiania.html
    - sw.js
decisions:
  - "BAI_STYLE/BAI_HOVER reuse var(--line)/var(--accent) exclusively — zero new hex, preserving the app's color grammar (bairro=neutral line, lote=green, hover(either)=accent red)"
  - "Bairro pane z-index 370, below 'lots' (380) and overlayPane (400) per UI-SPEC"
  - "Zoom threshold for hide/show is exactly 17, matching refreshLots()'s existing lot-entry threshold — no gap, no overlap band"
  - "drillBairro() only calls fitBounds+invalidateSize; it does NOT force zoom 17 or call refreshLots() directly — the existing moveend/zoomend listener does that naturally when the camera arrives via fitBounds"
metrics:
  duration: "~35 min"
  completed: 2026-07-04
---

# Phase 3 Plan 01: Bairro Polygon Layer + Highlight/Drill + PWA Precache Summary

Static-JSON bairro outline layer (Canvas-rendered, ~1206 polygons) with a single touch-gated highlight function and click/tap-drill via `fitBounds`, wired into the existing `refreshLots()` zoom-17 disclosure — plus `sw.js` precache bump to `radar-v4`.

## What Was Built

**Task 1 — Bairro layer render + zoom gating** (`radar-goiania.html`):
- `BAI_STYLE`/`BAI_HOVER` constants, both resolving only to `var(--line)`/`var(--accent)` — zero new hex.
- `baiStyle(feature)` style-resolution function (not an inline object) passed to `L.geoJSON`'s `style:` option, per the UI-SPEC architecture note (keeps v2.1 territory-aware styling a cheap follow-up).
- `map.createPane("bairros")` with `zIndex:370` created inside `initMap()`, after `initLots()`.
- `loadBairroPolys()`: `fetch('bairros-goiania.json')` (relative, same-origin, no live ArcGIS call), builds `L.geoJSON(data,{renderer:L.canvas({pane:"bairros"}),...})` for Canvas batching across ~1206 polygons, adds to map only if `map.getZoom()<17`. Fetch/parse failures are caught and logged via `console.warn` only — no toast, no broken map (progressive enhancement per UI-SPEC Error state).
- `onEachBairro(feature,layer)` binds an initially-empty sticky tooltip (filled by `highlightBairro` in Task 2).
- `zoomend` listener (registered inside `initMap()`) detaches/reattaches `bairroLayer` via `removeLayer`/`addTo` (real detach, not opacity) exactly at the zoom-17 threshold — same number `refreshLots()` already uses to reveal lots.
- Boot sequence: `loadBairroPolys()` called immediately after `loadBairros()` (the unrelated search-name list, untouched).

**Task 2 — Single highlightBairro() + tooltip + drill** (`radar-goiania.html`):
- `highlightBairro(layer)`: resets the previously-highlighted bairro (`baiHi`) back to `BAI_STYLE` and closes its tooltip if different from the new one; applies `BAI_HOVER` to the new layer; derives the label with `const lbl=(nm&&nm.trim())?esc(nm):"Área rural / gleba"` (exact UI-SPEC fallback copy) and opens the tooltip; tracks `baiHi=layer`.
- `clearBaiHi()`: resets and nulls `baiHi` — used on desktop `mouseout` and available for Plan 02's breadcrumb "Goiânia" crumb / zoom-out reset.
- `drillBairro(layer)`: `dismissCoach()` then, after a 90ms `setTimeout` (mirrors `enquadra()`'s existing idiom), `map.invalidateSize()` + `map.fitBounds(layer.getBounds().pad(0.05))`. Does not force zoom 17 and does not call `refreshLots()` directly — the existing `moveend`/`zoomend` → `refreshLots` wiring reveals lots naturally once the camera crosses zoom 17 via the fitBounds animation.
- `onEachBairro` now branches once on `matchMedia("(hover:none)").matches` to attach either the desktop set (`mouseover`→highlight, `mouseout`→clear-if-current, `click`→drill) or the mobile set (`click`→ drill-if-already-highlighted else highlight) — one function (`highlightBairro`), one drill function (`drillBairro`), the branch only decides which browser event invokes them.
- Tooltip content is always passed through the existing `esc()` HTML-escaper before being set — no raw `nm_bai` ever reaches `innerHTML`.

**Task 3 — Service worker precache + cache bump** (`sw.js`):
- Added `"./bairros-goiania.json"` to the `LOCAL` precache array.
- Bumped `CACHE` from `"radar-v3"` to `"radar-v4"` in the same commit, forcing the existing `activate` handler to purge the old cache and re-precache everything including the new asset — so the PWA doesn't serve a stale/missing copy of the bairro layer offline.

## Deviations from Plan

None — plan executed exactly as written. All three tasks matched their `<action>` blocks and all acceptance-criteria greps passed on first implementation.

## Verification Performed

- `grep` for all Task 1/2/3 acceptance patterns (`bairros-goiania.json`, `createPane("bairros")`, `BAI_STYLE`/`BAI_HOVER`, `L.canvas`, `loadBairroPolys`, `function highlightBairro`, `function drillBairro`, `function clearBaiHi`, `matchMedia("(hover:none)")`, `esc(nm)`, `"Área rural / gleba"`, `fitBounds(b.pad`, `radar-v4`, `bairros-goiania.json` in `sw.js`) — all present exactly once where singularity was required (single `highlightBairro`, no duplicated desktop/mobile highlight logic).
- Hex-leak check (`grep -nE "b5451f|c3b9a3"`) confirmed zero new occurrences — all matches are pre-existing lines (`:root` definitions, `LOT_HOVER`, `mostrarBairro`'s dashed outline, marker pins) untouched by this plan.
- `transition:` check across the full diff since the last pre-phase-3 commit: zero matches — no motion/easing introduced.
- Node `new Function(...)` syntax check on both the app's inline `<script>` block and `sw.js` — both parse without error.
- Confirmed only `radar-goiania.html` and `sw.js` were touched by the 3 task commits (`git diff --stat` against the pre-task commit).
- No live browser/preview server was reachable in this environment (static single-file app, no dev server process found on common ports) — visual/interactive verification (hover/tap/drill/zoom-gate behavior in an actual browser) was **not** performed and is deferred to the phase's manual/device verification step noted in STATE.md ("limiares de zoom... precisam de teste empírico em dispositivo Android real").

## Self-Check

- [x] `radar-goiania.html` contains `BAI_STYLE`, `BAI_HOVER`, `loadBairroPolys`, `highlightBairro`, `clearBaiHi`, `drillBairro`, `createPane("bairros")` — confirmed via grep above.
- [x] `sw.js` contains `radar-v4` and `./bairros-goiania.json` — confirmed via grep above.
- [x] Commit `f9b4797` exists (Task 1).
- [x] Commit `5695fc7` exists (Task 2).
- [x] Commit `81cb684` exists (Task 3).

## Known Stubs

None. All three functions are fully wired: `loadBairroPolys()` is called from boot, `highlightBairro`/`drillBairro` are attached to every feature's layer via `onEachFeature`, and `sw.js`'s precache list includes the new asset in the same commit as the cache bump.

## Self-Check: PASSED
