# Phase 4 — UI Review: Camada de Satélite

**Audited:** 2026-07-04
**Baseline:** 04-UI-SPEC.md (approved contract for SAT-01 toggle + SAT-02 crossfade)
**Screenshots:** not captured — no dev server detected on :3000/:5173/:8080 (single-file static HTML, no build/serve step running). Code-only audit. Orchestrator has separately confirmed live in-browser that the toggle works, imagery + labels load, satellite reaches full opacity, and streets return on toggle-off — this review audits the contract compliance of the code producing that confirmed behavior.

**Scope note:** This is a small, well-scoped UI addition (one button, two tile layers, one style-function branch, one CSS transition rule). Scoring is calibrated accordingly — a tightly-scoped, fully-compliant addition earns 4/4, not a default 3/4 "nothing's perfect" ceiling.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Aria-labels, title, icon-direction rule, and attribution string all verbatim to spec |
| 2. Visuals | 4/4 | Placement, sizing, layer stacking, and crossfade all match contract exactly |
| 3. Color | 4/4 | Zero new hex; accent used only on pressed state; legibility overrides are opacity/weight-only as specified |
| 4. Typography | 4/4 | No new type scale introduced; attribution left at Leaflet default per contract |
| 5. Spacing | 4/4 | 44×44px control, 10px Leaflet default margin untouched, z-490 ladder matches spec |
| 6. Experience Design | 4/4 | Deliberate-only toggle preserved, persistence implemented, crossfade has a rAF+timeout safety net for throttled/background tabs |

**Overall: 24/24**

---

## Top 3 Priority Fixes

No blocking or notable defects found against the Phase 4 contract. The following are minor, non-blocking observations for future consideration — not contract violations:

1. **Reference-overlay attribution edge case** — *user impact: negligible, licensing-adjacent* — The spec (line 197) flagged uncertainty about whether the Esri reference-tile service needs separate attribution credit under ArcGIS Online ToS, and explicitly said "use the CONTEXT.md string as-is, do not embellish" if uncertain. The implementation (line 700-702) correctly declares no `attribution` option on `satRef`, matching that instruction. No fix needed now; if a future licensing review determines separate credit is required, add an `attribution` string to the `satRef` tile layer only.
2. **Label density at high zoom bands not empirically verified in this audit** — *user impact: potential label sparsity at lote-drill zoom (~17+)* — The spec (line 212) asked the executor to confirm Esri's reference layer supplies adequate labels at the zoom bands this app uses (city ~12 through lote ~17+). This is a runtime/visual check that a code-only audit cannot perform. Recommend a quick live check across zoom 12/15/17/19 to confirm reference-layer label density holds up; if sparse at high zoom, that's a new finding for a later phase, not a fix to make now.
3. **Desktop optional label not added** — *user impact: none — explicitly optional* — Spec allowed (not required) a desktop text label beside the icon ("Satélite"/"Ruas") "at executor's discretion." The executor chose icon-only for both breakpoints. This is fully compliant with the contract as written; noting only so a future design pass doesn't mistake the absence for an oversight.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

- `aria-label` streets-active state: `"Ver satélite"` — matches spec verbatim (radar-goiania.html:708).
- `aria-label` satellite-active state: `"Ver ruas"` — matches spec verbatim, set dynamically in `setSatelite()` (radar-goiania.html:726).
- `title="Alternar satélite"` — matches spec verbatim (radar-goiania.html:708).
- Icon-direction rule respected: streets-active shows 🛰️ (previews destination = satellite), satellite-active shows 🗺️ (previews destination = streets) — radar-goiania.html:708, 727. This correctly implements the spec's explicitly-flagged deviation from `.caixabtn`'s "current state" convention (spec line 101).
- Esri attribution string verbatim: `'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'` (radar-goiania.html:697) — exact match to spec line 98, no paraphrase.
- Reference-overlay attribution correctly omitted per spec's "do not embellish" instruction (radar-goiania.html:700-702, no `attribution` key).
- No empty/error copy added for tile failure — correct, spec explicitly says this is silent-degrade / not applicable (spec line 96).
- Composed attribution: no manual string concatenation in code — relies on Leaflet's automatic union of active layers' `attribution` options, exactly as spec line 99 mandates ("flag it to the executor so no one hand-rolls a string-replace function" — confirmed no hand-rolled function exists).

### Pillar 2: Visuals (4/4)

- Placement: bottom-right via `L.Control.extend({options:{position:"bottomright"}})` (radar-goiania.html:704-705) — correct Leaflet-native slot per spec, avoids the top-left cluster (zoom control, searchpill, breadcrumb) and the mobile `.detail` sheet collision is resolved via z-index (see Spacing).
- Button element is a real `<button type="button">`, not `<a>`/`<div>` — matches spec's explicit requirement (radar-goiania.html:708).
- Custom bespoke control confirmed — no `L.control.layers` used; `SatControl` is a hand-rolled `L.Control.extend` (radar-goiania.html:704-714), matching spec's rejection of Leaflet's default layers-switcher UI.
- Layer stacking order verified against spec's 5-level contract:
  1. Base tile: `satTile` created but not auto-added; swapped via `setSatelite()`, never both base layers rendering indefinitely (radar-goiania.html:696, 732-742). Matches "only one base raster layer exists at a time."
  2. Reference overlay: new pane `"satref"` at `zIndex:350` (radar-goiania.html:699) — sits between tilePane (~200) and `"bairros"` pane (370) exactly as spec line 167 specifies. Added/removed in lockstep with `satTile` (never independently) — confirmed at radar-goiania.html:734 (`satTile.addTo(map); satRef.addTo(map);` same line) and 742 (both removed together).
  3. `"bairros"` pane (370) — unchanged position, style-branched via `baiStyle()` (radar-goiania.html:766, 771-775).
  4. `"lots"` pane (380) — unchanged position, style-branched via `lotStyle()` (radar-goiania.html:754, 776-780).
  5. `overlayPane` (400) — untouched by this phase, confirmed no Phase-4 code touches result pins/Caixa markers.
- Never-auto-switch-by-zoom rule preserved: the only zoom-triggered layer logic in the file is the pre-existing `bairroLayer` show/hide at zoom 17 (radar-goiania.html:687-692), which predates Phase 4 and is unrelated to the satellite toggle. No `zoomend` handler references `satelliteOn` or `satTile`/`satRef`. Confirmed compliant with the permanent anti-feature (spec line 223, CONTEXT.md "Deliberado — NUNCA automático").
- Crossfade correctly scoped: `.sat-fade .leaflet-tile{transition:opacity .25s ease}` (radar-goiania.html:245) applies only to elements with the `sat-fade` className, which is set only on `satTile`/`satRef` (radar-goiania.html:697, 701) — not app-wide, not touching `.detail`/`.panel`. Matches the orchestrator-confirmed constraint that `.detail`/`.panel` transition-duration remains 0s.
- Crossfade robustness exceeds spec's minimum bar: double-`requestAnimationFrame` before ramping to opacity 1 (radar-goiania.html:735) ensures the browser paints the 0-opacity frame before animating (avoids a snap-through where the transition is skipped because the style changed before the first paint) — plus a 250ms `setTimeout` safety net (radar-goiania.html:736-738) that forces final opacity/layer-removal state even if `requestAnimationFrame` is throttled (backgrounded tab, low-power mode). This is a defensive improvement beyond the spec's literal text, not a deviation.

### Pillar 3: Color (4/4)

- Zero new hex confirmed: `.sattoggle` and `.sattoggle.on` rules (radar-goiania.html:237-241) reference only `var(--paper-2)`, `var(--ink)`, `var(--accent-ink)`, `var(--accent)` — all pre-existing `:root` tokens.
- Resting state: `background:var(--paper-2); border:1.5px solid var(--ink); color:var(--ink)` — exact match to spec's resting-state block (spec lines 125-131).
- Pressed state (`.sattoggle.on`): `border-color:var(--accent); color:var(--accent)` — background unchanged (not inverted to solid fill), exactly matching spec's explicit instruction not to invert (spec line 134-135, contrasted with `.caixabtn.on`'s solid-fill convention).
- Hover: `border-color:var(--accent-ink)` on any state (radar-goiania.html:240) — matches spec line 140.
- `box-shadow:0 4px 14px rgba(20,26,31,.18)` (radar-goiania.html:238) — matches the `.searchpill`/`#breadcrumb` shadow recipe cited in spec line 131 (verified this rgba value is the same recipe used elsewhere in-file for those two controls).
- Legibility overrides verified as opacity/weight-only, no hex change:
  - `baiStyle()` satellite branch: `{...BAI_STYLE, opacity:1, weight:1.5, fillOpacity:0}` (radar-goiania.html:771-774) — matches spec's table exactly (opacity .8→1, weight 1→1.5, fillOpacity .03→0), same `color`/`fillColor` (`_BAI_LINE`) inherited unchanged via spread.
  - `lotStyle()` satellite branch: `{...LOT_STYLE, weight:1.5, fillOpacity:0}` (radar-goiania.html:776-779) — matches spec's table exactly (weight 1→1.5, fillOpacity .05→0), `color`/`fillColor` (`#2c5545`) unchanged via spread.
  - Both implemented as style-function branches reading a single module-level `satelliteOn` boolean, exactly as spec line 81 prescribes — not new constants, preserving the v2.1-readiness seam.
  - `BAI_HOVER`/`LOT_HOVER` untouched by the satellite branch (radar-goiania.html:755, 767) — matches spec's "unchanged" instruction for both.
- Focus-visible rule reused verbatim from the app-wide selector at line 88 (`button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`) — `#btnSat` is a `<button>` so it inherits this automatically; no redeclaration in `.sattoggle`, exactly as spec instructed ("reuse verbatim, do not redeclare").

### Pillar 4: Typography (4/4)

- No new font-size or font-weight classes introduced by Phase 4. `.sattoggle{font-size:18px;line-height:1}` (radar-goiania.html:238) matches the spec's icon-glyph size exactly (spec line 50: 18px, line-height 1).
- No desktop label was implemented (optional per spec), so the 12.5px/600-weight label typography in the spec's table has no corresponding code to audit — this is a non-issue since the label itself was optional.
- Attribution text left entirely to Leaflet's default `.leaflet-control-attribution` styling — confirmed no custom CSS rule targets that selector anywhere in the stylesheet. Matches spec's explicit "do not create a custom attribution element" / "do not restyle it" instructions (spec lines 54, 193).

### Pillar 5: Spacing (4/4)

- Button sized exactly `44px × 44px` (radar-goiania.html:237) — matches spec's non-negotiable minimum exactly (spec line 116-117), no smaller variant for any viewport.
- Margin from map edge: no override present — the control relies on Leaflet's own default `bottomright` control margin (~10px), exactly as spec instructs ("do not override," spec line 118). Confirmed no custom margin/positioning CSS on `.leaflet-control-sattoggle` beyond `z-index`.
- Z-index ladder: `.leaflet-control-sattoggle{z-index:490}` (radar-goiania.html:242) — matches spec's explicit resolution value exactly (spec line 112: "set the toggle control's z-index explicitly to 490"), correctly sitting below `.detail`'s 500 and above the vector panes (380/370) and overlayPane (400)... note the spec's own ladder description places 490 above overlayPane's 400, which the implementation matches by simply setting the number literally — no independent reasoning needed since the spec gave the exact value.
- Reference-overlay pane z-index: `map.createPane("satref").style.zIndex=350` (radar-goiania.html:699) — matches spec's exact instruction (spec line 167: "set this pane's zIndex to 350").
- Border-radius `4px` (radar-goiania.html:237) — matches spec's "matches .panel/.detail radius family, NOT the pill 999px" instruction (spec line 129).

### Pillar 6: Experience Design (4/4)

- Loading/degrade state: no custom handling added, correctly relying on Leaflet's native broken-tile silent-degrade (base street layer never removed except after successful satellite fade-in) — matches spec's explicit "not applicable" scoping (spec line 96) and is verifiable in code: `streetTile` is only removed inside the `on` branch's 250ms timeout (radar-goiania.html:738), never eagerly.
- Deliberate-only toggle preserved — confirmed no zoom-triggered auto-switch exists (see Pillar 2 detail); this was the single explicit anti-feature in CONTEXT.md and it holds.
- Persistence implemented per spec: `localStorage.getItem("radar_sat")` / `setItem("radar_sat", on?"1":"0")` (radar-goiania.html:717, 747) — uses the exact key name specified (spec line 158) and the same `"1"`/`"0"` string-boolean serialization style as `radar_prof`/`radar_coach` (consistent with existing app convention, wrapped in the same try/catch pattern used elsewhere for localStorage safety against private-browsing/quota exceptions).
- Boot-time restore: `if(satPref==="1")setSatelite(true)` runs inside `initMap()` (radar-goiania.html:718) — restores prior session choice as specified.
- State-consistency guard: the `on`/`off` branches in `setSatelite()` both include closures checking `if(satelliteOn)`/`if(!satelliteOn)` before finalizing tile add/remove inside `setTimeout` (radar-goiania.html:738, 742) — this guards against a rapid double-toggle mid-transition leaving stale layers mounted, a defensive pattern not explicitly required by spec but consistent with good state-machine hygiene for a toggle with an async settle step.
- Vector re-style on toggle: `bairroLayer.setStyle(baiStyle)` and `lotLayer.eachLayer(p=>p.setStyle(lotStyle()))` (radar-goiania.html:745-746) fire synchronously on every `setSatelite()` call — outlines snap instantly as spec requires (no transition attached to vector strokes), while the raster crossfade animates independently. Correct separation of the two motion domains per spec line 178.
- CSP prerequisite satisfied: `img-src` includes `https://server.arcgisonline.com` (radar-goiania.html:7) — the hard blocking prerequisite flagged in spec line 200-202 was addressed; without this the entire feature would silently fail to render, so this is a meaningful pass, not a formality.
- Service worker prerequisite satisfied (adjacent to CONTEXT.md, not UI-SPEC, but load-bearing for the feature to work in the PWA): `sw.js` bumped to `CACHE="radar-v5"` and the fetch handler's `!sameOrigin && !cdn` early-return (sw.js:47) correctly routes `server.arcgisonline.com` requests to always-network, never precached/cached — matching CONTEXT.md's "tiles de satélite são pesados demais para inchar o storage do PWA" requirement.

---

## Files Audited

- `C:\Users\bruno\Documents\Projeto Radar Fundiário\radar-goiania.html` — lines 7 (CSP), 88 (focus-visible, reused not redeclared), 236-245 (`.sattoggle` CSS family + crossfade transition rule), 649-651 (state vars), 678-719 (`initMap()` satellite layer creation + control mount + persistence restore), 720-749 (`setSatelite()`/`toggleSatelite()`), 754-780 (`LOT_STYLE`/`BAI_STYLE` constants + `baiStyle()`/`lotStyle()` branch functions)
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\sw.js` — full file (version bump + network-only routing for arcgisonline, confirmed as feature prerequisite)
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\.planning\phases\04-camada-de-sat-lite\04-UI-SPEC.md` — full contract
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\.planning\phases\04-camada-de-sat-lite\04-CONTEXT.md` — full context
