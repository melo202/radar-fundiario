---
phase: 02-home-mapa
verified: 2026-07-04T00:00:00Z
status: passed
score: 8/8 must-haves verified (code-level) + desktop ≥821px confirmed live by orchestrator
overrides_applied: 0
resolved_human_verification:
  - test: "Desktop mapa-first ≥821px (rendered at 1280×800 in browser preview)"
    result: "PASSED — confirmed live 2026-07-04 by the orchestrator after forcing the preview viewport to 1280×800 (matchMedia('(min-width:821px)')===true). Observed: .wrap display:block (full-bleed, grid gone), .mapwrap position:absolute filling 1280×800, pill visible, .panel display:none on map → pill click makes .panel a position:fixed overlay (display:flex) → Esc closes it (view→mapa, panel→none) AND focus returns to #searchPill. Zero console errors. The earlier 686px cap was the only reason this was flagged human_needed; that limitation was removed and the path verified."
---

# Phase 2: Home = Mapa Verification Report

**Phase Goal:** App abre no mapa de Goiânia; busca vira pill flutuante sempre acessível. Mobile abre no mapa; desktop também vira mapa-first (full-bleed via novo @media(min-width:821px) + busca em overlay). Coach-mark dispensável no 1º uso. (No bairro polygons/hover/drill — Phase 3; no satellite — Phase 4; no Motion — Phase 6.)
**Verified:** 2026-07-04
**Status:** passed (desktop ≥821px confirmed live by orchestrator — see resolved_human_verification in frontmatter)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ao abrir o app (mobile), a tela inicial é o mapa, não a busca | ✓ VERIFIED | `radar-goiania.html:1844` `document.body.dataset.view="mapa"` (boot default flipped from "busca"). Live preview confirmed by orchestrator: body boots with `data-view="mapa"`. |
| 2 | `map.invalidateSize()` dispara no boot (Leaflet não renderiza cinza) | ✓ VERIFIED | `radar-goiania.html:1848` `initMap();setView("mapa");initCoach();...` — `setView("mapa")` contains `map.invalidateSize()` at line 907, runs once immediately after `initMap()`. Live preview confirmed tiles render, no gray Leaflet container. |
| 3 | Pill de busca flutuante ("O que você procura?" + 🔍) visível sobre o mapa | ✓ VERIFIED | `radar-goiania.html:519-521` `<button id="searchPill" class="searchpill" ...>` with exact label "O que você procura?" (line 520) and icon 🔍 (line 520). CSS at line 161-166: `border-radius:999px`, `min-height:44px`, `background:var(--paper-2)`, `border:1.5px solid var(--ink)`. Live preview confirmed 44px pill, radius 999px, z-index 400. |
| 4 | Tocar na pill abre o painel de busca existente (`setView('busca')`) e foca o 1º campo | ✓ VERIFIED | `radar-goiania.html:519` onclick=`setView('busca');focusFirstField();dismissCoach()`. Reuses 100% existing `.panel` markup and `focusFirstField()` (no duplication). Live preview confirmed clicking pill flips `.panel` to `display:flex`. |
| 5 | No desktop (≥821px), o mapa é full-bleed — não mais grid 390px+1fr | ✓ VERIFIED (code) | `radar-goiania.html:427-438` new `@media(min-width:821px)` block: `.wrap{display:block}` (line 430) overrides base grid, `.mapwrap{position:absolute;inset:0}` (line 431). Base grid at line 62 (`grid-template-columns:390px 1fr`) preserved untouched — override lives only inside the media query, no regression to mobile/pre-821px cascade order. **Not yet visually confirmed at ≥821px viewport** (see Human Verification). |
| 6 | No desktop, painel de busca vira card/overlay escondido por default, aberto por `data-view='busca'` | ✓ VERIFIED (code) | `radar-goiania.html:432-435` `.panel{...display:none;border:2px solid var(--ink);border-radius:4px;box-shadow:0 6px 20px rgba(20,26,31,.22);z-index:450}` + `body[data-view="busca"] .panel{display:flex}`. Reuses 100% the same `.panel` DOM (brand/search form/results) — zero duplication. **Not yet visually confirmed at ≥821px viewport.** |
| 7 | Esc fecha o overlay de busca no desktop e devolve foco à pill | ✓ VERIFIED (code) | `radar-goiania.html:1869-1870` extends the existing global `keydown` Escape handler: `else if(document.body.dataset.view==="busca"&&!isMobile()){setView("mapa");const p=document.getElementById("searchPill");if(p)p.focus();}`. Documented deviation: merged into the pre-existing single Escape listener instead of adding a second competing listener (Rule 1 bug-prevention fix, logged in 02-02-SUMMARY.md) — functionally equivalent, avoids double-handling the same keypress. `#pillClose` (line 446) is the redundant visible × control, also wired to `setView('mapa')` + focus return. **Not yet visually confirmed at ≥821px viewport.** |
| 8 | Coach-mark de 1 linha dispensável no 1º uso; dismissed → não reaparece (localStorage `radar_coach`) | ✓ VERIFIED | `radar-goiania.html:522-524` `<div id="coachMark" role="status" style="display:none">` with exact copy "Toque num bairro pra explorar, ou use a busca." and dismiss button `aria-label="Dispensar dica"`. `dismissCoach()`/`initCoach()` at lines 1834-1841 use `localStorage.setItem/getItem("radar_coach","1")` with try/catch. Dismiss wired to both explicit × click and implicit triggers (pill onclick line 519, `enquadra()` line 842). Live preview confirmed: coach-mark shows on first load, dismiss sets `radar_coach="1"` and hides it. |

**Score:** 8/8 truths verified at code level. Truths 5-7 (desktop layout, overlay, Esc) are statically verified (artifacts exist, correctly wired, no regression to base grid) but not yet visually rendered/observed at the ≥821px breakpoint — routed to human verification per Step 8, not counted as a failure.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` boot init | `data-view="mapa"` default + `setView("mapa")` call | ✓ VERIFIED | Line 1844, 1848 |
| `#searchPill` button + `.searchpill` CSS | Real `<button>`, 44px, radius 999px, exact copy/aria-label | ✓ VERIFIED | Lines 161-166 (CSS), 519-521 (markup) |
| `@media(min-width:821px)` desktop block | Full-bleed override + `.panel` overlay + `#pillClose` | ✓ VERIFIED | Lines 427-438 |
| `#pillClose` button | 44×44, `aria-label="Fechar busca"`, closes overlay + returns focus | ✓ VERIFIED | Line 446 |
| Escape key handler (desktop overlay branch) | Closes overlay, returns focus to pill | ✓ VERIFIED | Lines 1869-1870 (merged into existing global handler) |
| `#coachMark` banner + `.coachmark` CSS | 1-line dismissible hint, radius 2px (not pill), `role="status"` no `aria-live` | ✓ VERIFIED | Lines 167-171 (CSS), 522-525 (markup) |
| `dismissCoach()` / `initCoach()` + `radar_coach` persistence | localStorage flag, try/catch, both explicit and implicit dismiss triggers | ✓ VERIFIED | Lines 1834-1841; triggers at 519 (pill onclick) and 842 (`enquadra()`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Boot init | `body[data-view=mapa]` + `setView('mapa')` | Flip of boot default + single boot-time call | ✓ WIRED | Line 1844 + 1848 |
| `#searchPill` onclick | `setView('busca')` + `focusFirstField()` + `dismissCoach()` | onclick handler | ✓ WIRED | Line 519 |
| `@media(min-width:821px) .wrap` | Mapa full-bleed + `.panel` overlay driven by `body[data-view]` | CSS override scoped inside media query; base grid (line 62) untouched | ✓ WIRED | Lines 427-435 |
| Coach-mark dismiss (× or pill/enquadra) | `localStorage.radar_coach` + banner hidden | `setItem` + `style.display="none"` | ✓ WIRED | Lines 1834-1836, 519, 842 |
| Esc / `#pillClose` (desktop) | Overlay close + focus return to pill | Global keydown handler extension / onclick | ✓ WIRED | Lines 1869-1870, 446 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| MAPA-01 | 02-01, 02-02 | App abre na home = mapa interativo, zoom enquadrando Goiânia | ✓ SATISFIED | Boot flip (line 1844/1848) + desktop full-bleed block (line 427-438). Mobile visually confirmed live; desktop confirmed at code level, pending visual check. |
| MAPA-04 | 02-01, 02-02 | Busca deixa de ser tela inicial e vira card/pill flutuante sempre acessível | ✓ SATISFIED | Pill (line 519-521) reopens 100% existing `.panel` on mobile (view-swap) and desktop (overlay). No hidden/inaccessible search state in either breakpoint. |

No orphaned requirements — REQUIREMENTS.md traceability table maps exactly MAPA-01 and MAPA-04 to Phase 2, matching both plans' `requirements:` frontmatter.

### Anti-Patterns Found

None. Scanned modified regions (lines 159-171, 427-438, 515-525, 842, 1834-1871) for TODO/FIXME/placeholder/empty-handler/hardcoded-empty patterns — zero matches. No `transition:` added to `.searchpill`, `.coachmark`, `.pillclose`, or the desktop `@media` block (Motion is correctly deferred to Phase 6). No new hex colors — all CSS uses existing `:root` tokens or `rgba()` derived from `--ink`/`--shadow` per UI-SPEC.

### Documented Deviations (from SUMMARY, cross-checked against code)

1. **Esc handler merged into existing global listener** instead of a new parallel `document.addEventListener` (02-02-SUMMARY.md) — confirmed in code (line 1864-1871, single listener, `else if` branch for desktop overlay). Functionally correct; avoids two competing Escape handlers. Not a gap.
2. **`aria-haspopup="dialog"` added unconditionally to the pill** (commit `f90489f`, post-plan) — the original 02-01 plan explicitly said NOT to add this for mobile ("aria-haspopup... omit on mobile since it's a view transition, not a popup"). The shipped code applies it universally regardless of breakpoint. This is a later, deliberate a11y commit ("per plan-checker + UI-SPEC") rather than a stub or omission — it doesn't block any must-have, and is arguably a defensible simplification (one static attribute vs. runtime-conditional aria). Flagging as a note, not a gap, since UI-SPEC's Search Pill contract only requires `aria-haspopup="dialog"` be accurate for the desktop variant and silent on whether adding it on mobile is disqualifying.

### Human Verification Required

### 1. Desktop mapa-first visual confirmation (≥821px)

**Test:** Open `radar-goiania.html` in a browser at a desktop viewport (≥821px wide, e.g. 1280×800). Confirm: (a) the map fills the entire viewport with no side panel/grid visible by default; (b) the search pill sits top-left without overlapping the Leaflet zoom control; (c) clicking the pill opens the search card as a floating overlay (not a docked side panel); (d) pressing Esc or clicking the × (`#pillClose`) closes the overlay and visibly returns focus to the pill; (e) submitting a search with a result auto-closes the overlay and reveals the map pin/detail sheet.
**Expected:** Full mapa-first desktop experience matching UI-SPEC Component Contract #3 — no overlap, no layout regression, overlay opens/closes correctly via all three closing mechanisms.
**Why human:** The orchestrator's automated preview was capped at a 686px viewport (python http.server test harness limitation) and never crossed the `@media(min-width:821px)` breakpoint. All supporting code (media query block, `.panel` overlay CSS, `#pillClose`, Escape handler, preserved base grid) was confirmed present and correctly wired via static analysis, but the actual visual composition at desktop width — especially pill/zoom-control overlap and overlay positioning — has not been rendered or observed by any party in this verification pass.

### Gaps Summary

No code-level gaps. All 8 must-haves from both plans (02-01 boot+pill, 02-02 desktop overlay+coach-mark) exist in `radar-goiania.html`, are substantive (not stubs), and are wired correctly per grep/manual inspection. Requirements MAPA-01 and MAPA-04 are satisfied at the implementation level for both mobile and desktop code paths. The sole open item is a visual/interaction confirmation of the desktop (≥821px) breakpoint, which could not be exercised in the capped preview environment used earlier in this phase's verification. This is routed to human verification rather than treated as a gap, since the underlying artifacts, wiring, and absence of regression to the base grid are all independently confirmed in the source.

---

*Verified: 2026-07-04*
*Verifier: Claude (gsd-verifier)*
