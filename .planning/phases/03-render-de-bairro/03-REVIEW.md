---
phase: 03-render-de-bairro
reviewed: 2026-07-04T22:11:45Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - radar-goiania.html
  - sw.js
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-07-04T22:11:45Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the Phase 3 additions to `radar-goiania.html` (bairro polygon layer, `highlightBairro()`, `drillBairro()`, breadcrumb) and `sw.js` (precache + cache bump), covering commits `f9b4797`, `5695fc7`, `81cb684`, `a90d3fa`.

The implementation faithfully mirrors the existing `refreshLots()`/`LOT_STYLE`/`LOT_HOVER` idioms as instructed: one `pane`, one style-resolver function (not a raw object, correctly future-proofed for v2.1 territory styling), one `highlightBairro()` gated by `matchMedia("(hover:none)")` (no duplicated desktop/mobile code paths), Canvas renderer for the ~1206-feature layer, a hard zoom≥17 gate that mirrors the lots' entry threshold exactly, and `esc()`/`textContent` consistently used for `nm_bai` before it reaches the DOM — no injection surface found. The `sw.js` cache bump (`radar-v3` → `radar-v4`) and precache addition are correct and land in the same commit as instructed, and the file's existing cache-first-for-static-assets branch correctly picks up `bairros-goiania.json` since it isn't matched by `NETWORK_FIRST`.

No critical or security issues were found. Two warnings concern small state-leak edge cases around the interaction of the zoom-gate with the highlight/tooltip state, which are latent rather than reproducible-on-every-use, plus a minor race in rapid successive drills. Three info-level notes are style/consistency observations, not correctness risks.

## Warnings

### WR-01: Highlighted bairro's `BAI_HOVER` style and open tooltip aren't reset when the zoom-gate detaches the layer

**File:** `radar-goiania.html:675-680`
**Issue:** The `zoomend` listener in `initMap()` removes/re-adds the whole `bairroLayer` group based on the zoom threshold, but never resets `baiHi` or calls `clearBaiHi()`. If a bairro is currently highlighted (`baiHi` set, styled `BAI_HOVER`, tooltip open) when the user zooms to ≥17, `map.removeLayer(bairroLayer)` detaches the group without touching that sub-layer's style/tooltip state. When the user zooms back out (<17), `bairroLayer.addTo(map)` re-adds every polygon including the previously-highlighted one, which still carries `BAI_HOVER` styling (red stroke) and a tooltip that may still be flagged open internally by Leaflet — with no `mouseover` having occurred to justify it. `baiHi` also still points at that layer, so the app's internal notion of "what's highlighted" is stale until the next hover/tap event overwrites it (self-heals on next interaction, but the intervening frame renders a bairro as falsely highlighted with no user input causing it).
**Fix:**
```js
map.on("zoomend",()=>{
  if(!bairroLayer)return;
  const z=map.getZoom();
  if(z>=17){ if(map.hasLayer(bairroLayer)){clearBaiHi();map.removeLayer(bairroLayer);} }
  else { if(!map.hasLayer(bairroLayer))bairroLayer.addTo(map); }
});
```
Calling `clearBaiHi()` before detaching resets the style and closes the tooltip on the currently-highlighted layer (if any), so re-adding the group later always starts from a clean `BAI_STYLE` state.

### WR-02: `drillBairro()` has no request-token guard against rapid successive drills

**File:** `radar-goiania.html:792-797`
**Issue:** `drillBairro()` schedules `map.invalidateSize()` + `map.fitBounds(...)` in a bare `setTimeout(...,90)` with no cancellation/token mechanism. If a user drills into bairro A and then, within 90ms, taps/clicks into bairro B (e.g., fast double-tap near a shared border, or a mis-tap followed by a correction), both timeouts fire and both call `fitBounds`, with the breadcrumb (`showBreadcrumb`, called synchronously before the timeout) also potentially reflecting A while the camera ultimately lands on B's bounds, or vice versa depending on timer ordering. The codebase already has an established idiom for exactly this class of "concurrent async result" problem (`LOTTOKEN`/`SEARCHTOKEN`), but it wasn't applied here.
**Fix:**
```js
let DRILLTOKEN=0;
function drillBairro(layer){
  dismissCoach();
  const tk=++DRILLTOKEN;
  const b=layer.getBounds();
  setTimeout(()=>{ if(tk!==DRILLTOKEN)return; map.invalidateSize();map.fitBounds(b.pad(0.05)); },90);
  showBreadcrumb(layer.feature.properties.nm_bai);
}
```
Low real-world likelihood (requires a fast double-drill within 90ms) — flagged because the fix is cheap and the pattern already exists elsewhere in the file.

## Info

### IN-01: Mobile/desktop event wiring in `onEachBairro` is decided once at layer-load time

**File:** `radar-goiania.html:800-809`
**Issue:** `const touch=matchMedia("(hover:none)").matches;` is evaluated once when `loadBairroPolys()` builds the layer at boot, and the corresponding `click`/`mouseover`/`mouseout` handlers are permanently wired based on that snapshot. On a hybrid-input device (e.g., a touchscreen laptop with a mouse also attached) or if the user's input mode changes after page load, the bairro layer won't adapt. This is not a new defect — it mirrors the exact same pattern already used for lots at `refreshLots()` (`radar-goiania.html:761`) — so it's a pre-existing, consistent convention rather than a Phase 3 regression. Noting for completeness only.
**Fix:** No action needed; consistent with existing app-wide convention. If this is ever revisited, both call sites should be updated together.

### IN-02: Defensive `typeof clearBaiHi==="function"` guard is unreachable dead code

**File:** `radar-goiania.html:789`
**Issue:** `clearBaiHi` is a hoisted function declaration in the same `<script>` block, always defined by the time `goHomeCrumb()` can execute (it's only reachable via a DOM `onclick`, long after script parse). The `typeof` guard can never be false in this codebase's structure, so it adds a line of defensive noise without covering a real failure mode.
**Fix:**
```js
function goHomeCrumb(){
  map.setView([-16.6799,-49.255],12);
  clearBaiHi();
  hideBreadcrumb();
}
```

### IN-03: `drillBairro()` leaves the drilled bairro visually highlighted with no explicit reset path

**File:** `radar-goiania.html:792-797`
**Issue:** Neither the desktop `click`-to-drill nor the mobile 2nd-tap-to-drill path calls `clearBaiHi()`, so the drilled bairro keeps its `BAI_HOVER` (accent stroke) styling after the camera zooms in. This may be intentional ("last visited bairro stays marked"), and it does match the breadcrumb's own documented persistence behavior (UI-SPEC: breadcrumb persists until "Goiânia" is tapped or another bairro is drilled) — so the highlight and breadcrumb states stay in sync, which is arguably correct. Flagging only because it's not explicitly asserted by any acceptance criterion, so it's worth a conscious confirmation that this is the desired behavior rather than an oversight.
**Fix:** None required if intentional. If the desired behavior is "highlight clears once lots take over," add `clearBaiHi()` inside the zoom≥17 branch of the `zoomend` listener (see WR-01's fix, which already positions a `clearBaiHi()` call at exactly that point).

---

_Reviewed: 2026-07-04T22:11:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
