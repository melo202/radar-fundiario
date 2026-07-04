---
phase: 04-camada-de-sat-lite
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - radar-goiania.html
  - sw.js
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-07-04
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the satellite-layer changes across commits `0b7bad7`..`ce78603` (CSP extension, keyless Esri World_Imagery + Reference tile layers, `#btnSat` toggle, `lotStyle()`/`baiStyle()` mode-branching, 250ms crossfade, `radar_sat` persistence, `sw.js` cache bump to `radar-v5`).

Overall the change is solid and consistent with existing codebase conventions:

- **CSP** is correctly host-scoped (`https://server.arcgisonline.com`, no wildcard) — tighter than the CARTO entry, which legitimately needs `https://*.basemaps.cartocdn.com` because CARTO's URL template uses `{s}` subdomains, whereas the Esri tile URLs use a single fixed host. No over-broad `https:` grant.
- **Style-branch migration is complete.** Every `LOT_STYLE`/`BAI_STYLE` consumption site was correctly migrated to `lotStyle()`/`baiStyle()`: initial polygon creation (line 833), hover reset (line 838), `bairroLayer.setStyle(baiStyle)` at boot-mode-switch (line 745, function ref — correct, Leaflet re-invokes per-feature), `highlightBairro`/`clearBaiHi` resets (lines 853, 861), and the initial `L.geoJSON` `style:baiStyle` (line 904). No stale direct reference to the raw `LOT_STYLE`/`BAI_STYLE` objects remains except the two definitions themselves and `LOT_HOVER`/`BAI_HOVER` (hover styles are explicitly unchanged per UI-SPEC, correctly left alone).
- **Crossfade CSS scope is correctly isolated.** `.sat-fade .leaflet-tile{transition:opacity .25s ease}` only matches `<img class="leaflet-tile">` descendants of an element carrying `sat-fade` — and `className:"sat-fade"` is set only on `satTile`/`satRef`'s `L.tileLayer` options, which Leaflet applies to those two tile containers exclusively. It cannot bleed into `.detail`/`.panel` or any other transition, matching the orchestrator's live verification.
- **`sw.js`** correctly treats Esri tiles as network-only via the existing `!sameOrigin && !cdn` early return (no code change needed there), and the `radar-v4`→`radar-v5` cache bump correctly forces purge of the previous cache on `activate` given the HTML changed.
- **No hardcoded secrets** — Esri World_Imagery/Reference are genuinely keyless public endpoints; no API key or token exists to leak.
- **Timeout-based layer-removal race is guarded** (`if(satelliteOn)`/`if(!satelliteOn)` inside the `setTimeout(...,250)` callbacks) — a rapid on→off→on within 250ms will not remove the wrong base layer via a stale timeout, per the plan's own documented reasoning. This part checks out.

One warning-level latent bug was found in the crossfade's `requestAnimationFrame` path (not the `setTimeout` path, which is correctly guarded) — see WR-01. Two minor info-level items are noted for completeness.

## Warnings

### WR-01: Stale `requestAnimationFrame` callback can re-show satellite/hide streets after a rapid reverse-toggle

**File:** `radar-goiania.html:732-742`

**Issue:** `setSatelite(on)` guards the **`setTimeout(...,250)` layer-removal** against a rapid double-toggle (via `if(satelliteOn)`/`if(!satelliteOn)`, confirmed correct), but the **`requestAnimationFrame` opacity-ramp** that runs just before it has no equivalent guard:

```js
if(on){
  satTile.setOpacity(0); satRef.setOpacity(0);
  satTile.addTo(map); satRef.addTo(map);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ satTile.setOpacity(1); satRef.setOpacity(1); }));
  setTimeout(()=>{ if(satelliteOn){ ... } },250);
} else {
  if(!map.hasLayer(streetTile))streetTile.addTo(map);
  satTile.setOpacity(0); satRef.setOpacity(0);
  setTimeout(()=>{ if(!satelliteOn){ ... } },250);
}
```

Trace: user toggles **on** at t=0 (double-rAF scheduled, fires ~2 frames later, typically 16-33ms). User toggles **off** at t=10ms (before the rAF pair fires) — this synchronously sets `satTile`/`satRef` opacity back to 0 and re-adds `streetTile`. The **stale rAF callback from the "on" toggle still fires** at ~t=16-33ms and unconditionally calls `satTile.setOpacity(1); satRef.setOpacity(1)` — overriding the "off" toggle's opacity-0 and making the satellite imagery flash back to fully visible on top of the streets tile for up to ~220ms (until the "off" timeout's removal fires at t=255ms and cleans up). The same failure is symmetric for a quick off→on reversal.

This is the same class of race the codebase already has an established, reusable idiom for (`LOTTOKEN`/`DRILLTOKEN`/`SEARCHTOKEN` — increment-and-compare token guards used at lines 756, 811, 818, 828, 876, 880-881, 910, 914, 918), but the rAF ramp here wasn't wired into that pattern, only the `setTimeout` removal was.

Impact is low-severity (transient visual flash on a rare rapid-double-tap, self-heals within ~250ms, no crash/data issue) — hence Warning, not Critical. But it is a genuine, reachable bug, not speculative: any user who taps the toggle twice quickly (e.g., mis-tap) will see it.

**Fix:** Add the same token-guard idiom already used elsewhere in the file to the rAF ramp, e.g.:

```js
let SATTOKEN=0;
function setSatelite(on){
  satelliteOn=on;
  const tk=++SATTOKEN;
  const b=document.getElementById("btnSat");
  if(b){
    b.classList.toggle("on",on);
    b.setAttribute("aria-pressed",on);
    b.setAttribute("aria-label", on?"Ver ruas":"Ver satélite");
    b.textContent = on?"🗺️":"🛰️";
  }
  if(on){
    satTile.setOpacity(0); satRef.setOpacity(0);
    satTile.addTo(map); satRef.addTo(map);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(tk!==SATTOKEN)return; /* toggle revertido antes do rAF disparar */
      satTile.setOpacity(1); satRef.setOpacity(1);
    }));
    setTimeout(()=>{ if(satelliteOn){ satTile.setOpacity(1); satRef.setOpacity(1); if(map.hasLayer(streetTile))map.removeLayer(streetTile); } },250);
  } else {
    if(!map.hasLayer(streetTile))streetTile.addTo(map);
    satTile.setOpacity(0); satRef.setOpacity(0);
    setTimeout(()=>{ if(!satelliteOn){ if(map.hasLayer(satTile))map.removeLayer(satTile); if(map.hasLayer(satRef))map.removeLayer(satRef); } },250);
  }
  if(bairroLayer)bairroLayer.setStyle(baiStyle);
  if(lotLayer&&lotLayer.eachLayer)lotLayer.eachLayer(p=>p.setStyle(lotStyle()));
  try{localStorage.setItem("radar_sat", on?"1":"0");}catch(e){}
}
```

The `tk!==SATTOKEN` check inside the rAF callback discards the stale ramp exactly the same way `LOTTOKEN`/`SEARCHTOKEN` discard stale async results elsewhere in this file.

## Info

### IN-01: `initMap()` restores `radar_sat` preference before `bairroLayer` exists — harmless but worth a one-line comment

**File:** `radar-goiania.html:716-718`

**Issue:** `setSatelite(true)` may run during boot (if `radar_sat==="1"`) before `loadBairroPolys()` (called later, at line 2026, `async`) has populated `bairroLayer`. At that point `if(bairroLayer)bairroLayer.setStyle(baiStyle)` (line 745) is a no-op since `bairroLayer` is still `null`. This is **not a bug** — `baiStyle` is passed as the style *function* to `L.geoJSON` at creation time (line 904), so once `loadBairroPolys()` resolves, the layer is built already reading the correct (already-`true`) `satelliteOn` value. No visual defect results. Flagging only because the boot-order dependency is implicit; a short inline comment noting "`bairroLayer` may still be null here — fine, `baiStyle` is re-read live by `L.geoJSON`'s style function once it loads" would save a future reader the trace-through done in this review.

**Fix:** Optional comment only, e.g. above line 745:
```js
/* bairroLayer pode ainda ser null no boot restore (loadBairroPolys é async) — sem problema,
   baiStyle é lida ao vivo quando o L.geoJSON for criado (linha ~904) */
if(bairroLayer)bairroLayer.setStyle(baiStyle);
```

### IN-02: Satellite Reference overlay has no explicit `attribution` string

**File:** `radar-goiania.html:700-702`

**Issue:** `satRef` (the `World_Boundaries_and_Places` reference overlay) is created without an `attribution` option, unlike `satTile` which declares the full Esri credit string. The UI-SPEC (`04-UI-SPEC.md:197`) explicitly anticipated this and left it as an implementation-time judgment call ("confirm... whether ArcGIS Online's ToS wants the reference tile service credited separately; if uncertain... use the CONTEXT.md string as-is and do not embellish"), and since `satTile`'s attribution string is already shown whenever satellite mode is active (both layers are always added/removed together), the Esri credit is not missing from the UI — just not duplicated. This is a defensible reading of the UI-SPEC, not a clear defect. Noting it only so it's a documented, deliberate choice rather than an oversight if it's ever questioned later (e.g. by an Esri ToS audit).

**Fix:** None required. If desired for extra clarity, a one-line comment at the `satRef` definition confirming "attribution deliberately omitted — satTile's Esri string already covers both layers, per UI-SPEC line 197" would close the loop for future readers.

---

_Reviewed: 2026-07-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
