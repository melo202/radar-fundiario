---
phase: 04-camada-de-sat-lite
verified: 2026-07-04T23:10:00Z
status: passed
score: 4/4 must-haves verified (roadmap Success Criteria) + 9/9 plan-level truths verified
overrides_applied: 0
human_verification:
  - test: "Legibilidade dos rótulos do reference overlay em dispositivo real (Android médio/baixo, 4G) em vários níveis de zoom (12-19)"
    expected: "Rótulos de rua/bairro do overlay Esri permanecem legíveis (halo suficiente) sobre a imagem de satélite em condições reais de tela/rede"
    why_human: "Fidelidade visual e desempenho de rede em hardware real não são verificáveis por grep/DevTools; UI-SPEC e STATE.md já registram este item como pendência de campo, não bloqueante ao fechamento do código"
---

# Phase 4: Camada de Satélite Verification Report

**Phase Goal:** Toggle deliberado ruas⇄satélite (Esri World Imagery keyless legacy) + reference overlay (rótulos legíveis) + crossfade suave + atribuição Esri, via botão custom no mapa. Streets default. (No app-wide Motion — Phase 6; no Goiânia orthophoto — SAT-03/v2.1.)
**Verified:** 2026-07-04T23:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Toggle deliberado alterna ruas ⇄ satélite (Esri World Imagery) — nunca automático por zoom | ✓ VERIFIED | `setSatelite()`/`toggleSatelite()` (radar-goiania.html:720-749), wired to `btnSat` click only; `map.on("zoomend",...)` (line 687) only touches `bairroLayer`, never `satelliteOn`. Live browser test: aria-pressed flips only on click, never on zoom. |
| 2 | Rótulos permanecem legíveis sobre a imagem (halo/backdrop no mesmo commit do toggle) | ✓ VERIFIED | `satRef` = `Reference/World_Boundaries_and_Places` tile layer created in same task/commit (`29c4b52`) as `satTile`; added/removed in lockstep inside `setSatelite()` (lines 732-743). Live test: satRef tiles return 200 OK alongside satTile when toggled on. |
| 3 | Troca entre camadas usa crossfade suave, não troca seca de tile | ✓ VERIFIED | `.sat-fade .leaflet-tile{transition:opacity .25s ease}` (line 245) scoped via `className:"sat-fade"` on both `satTile`/`satRef`; `setSatelite()` ramps `setOpacity(0)→rAF×2→setOpacity(1)` (lines 732-738) with a 250ms fallback timeout (commit `ce78603`, live-verified) guaranteeing opacity reaches 1 even when rAF is throttled. |
| 4 | sw.js allowlist/versão bumped no mesmo commit; tiles satélite network-only (nunca cache-first) | ✓ VERIFIED | `sw.js`: `CACHE = "radar-v5"` (bumped from v4, commit `26e3337`); `server.arcgisonline.com` deliberately absent from `LOCAL`/`CDN`/`NETWORK_FIRST` — falls through `if (!sameOrigin && !cdn) return;` (network-only by construction, confirmed live: Esri tile requests return 200 OK without being served from Cache Storage). |

**Score:** 4/4 roadmap Success Criteria verified

### Plan-Level Truths (must_haves from 04-01-PLAN.md / 04-02-PLAN.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CSP img-src permite server.arcgisonline.com (host exato, sem wildcard) | ✓ VERIFIED | Line 7: `img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com;` — exact host, no wildcard; other CSP directives untouched. |
| 2 | Camada satélite World_Imagery criada mas NÃO default | ✓ VERIFIED | Line 696: `satTile=L.tileLayer(".../World_Imagery/...")` created with `opacity:0`, no `.addTo(map)` at boot; `streetTile.addTo(map)` is the only default (line 682). |
| 3 | Overlay Reference em pane próprio zIndex 350 | ✓ VERIFIED | Line 699: `map.createPane("satref").style.zIndex=350` — between tilePane (~200) and "bairros" (370), as specified. |
| 4 | Botão custom bottomright, aria-pressed, ≥44px, cores das vars | ✓ VERIFIED | Lines 704-715: `L.Control.extend({options:{position:"bottomright"}})`, `<button id="btnSat" aria-pressed="false">`; CSS line 237: `.sattoggle{width:44px;height:44px;background:var(--paper-2)...}`. |
| 5 | Toggle nunca dispara automaticamente por zoom | ✓ VERIFIED | No `zoomend`/`zoomstart` handler references `satelliteOn` or `setSatelite`; only the pre-existing bairro-layer zoom-gate (line 687-692) exists, untouched. |
| 6 | Ruas (CARTO) permanece default ao abrir o app | ✓ VERIFIED | Line 680-682: `streetTile=...addTo(map)` unconditional at boot; satellite restored only if `radar_sat==="1"` in localStorage (line 717-718). |
| 7 | Rótulos legíveis entregues NO MESMO commit do toggle | ✓ VERIFIED | `satRef` and toggle button both land in Plan 01 commits (`29c4b52`, `8b15a17`) — same phase, same plan, not a retrofit. |
| 8 | Outlines de bairro/lote legíveis sobre imagem (sem novo hex) | ✓ VERIFIED | `baiStyle()`/`lotStyle()` (lines 771-780) branch on `satelliteOn`, spreading existing `BAI_STYLE`/`LOT_STYLE` consts with adjusted `opacity`/`weight`/`fillOpacity` — no new hex introduced. All raw `setStyle(BAI_STYLE)`/`setStyle(LOT_STYLE)` call sites migrated to the style functions (grep confirms zero raw calls remain), closing the hover/highlight-reset regression flagged in the plan. |
| 9 | Atribuição Esri aparece só no satélite, via option attribution nativa (sem string-replace manual) | ✓ VERIFIED | Line 697: `attribution:'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'` set as native Leaflet tileLayer option; Leaflet's attribution control shows/hides it automatically as the layer is added/removed — no manual DOM string manipulation. Live test confirms the string appears when satellite is ON and disappears when OFF. |
| 10 (SAT-02) | Crossfade ~250ms, escopado só às tiles (não app-wide) | ✓ VERIFIED | `.sat-fade .leaflet-tile{transition:opacity .25s ease}` (line 245) is the only transition rule referencing tile opacity; grep confirms `.detail`/`.panel`/card transitions are unrelated (`transform .05s,background .15s` etc. at lines 116/133/399) — zero shared token, zero leak to Phase 6. |
| 11 (SAT-02) | Outlines de bairro/lote NÃO transicionam (snap) | ✓ VERIFIED | `bairroLayer.setStyle(baiStyle)` / `lotLayer.eachLayer(p=>p.setStyle(lotStyle()))` (lines 745-746) call Leaflet's `setStyle` directly with no CSS transition attached — instantaneous restyle, confirmed live ("Bairro outlines remain on map with resolved hex color at city zoom" during toggle, no fade). |
| 12 (SAT-02) | sw.js radar-v4 → radar-v5 bump | ✓ VERIFIED | Line 9: `const CACHE = "radar-v5";` — old cache purged on next `activate` via existing `caches.keys().filter(k=>k!==CACHE)` cleanup logic. |

**Score:** 12/12 plan-level truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` (CSP line 7) | img-src extended to server.arcgisonline.com | ✓ VERIFIED | Exact host, no wildcard, other directives intact |
| `radar-goiania.html` (satTile/satRef) | Esri keyless layers, not default | ✓ VERIFIED | Created lines 696-702, opacity:0, not addTo(map) at boot |
| `radar-goiania.html` (btnSat control) | Bespoke toggle button | ✓ VERIFIED | L.Control bottomright, aria-pressed, 44×44px |
| `radar-goiania.html` (setSatelite/toggleSatelite) | Wiring + crossfade + persistence | ✓ VERIFIED | Lines 720-749; setOpacity/rAF ramp + 250ms fallback (ce78603) + localStorage radar_sat |
| `radar-goiania.html` (baiStyle/lotStyle) | Mode-branch styling, zero new hex | ✓ VERIFIED | Lines 771-780; spreads existing consts only |
| `sw.js` | CACHE=radar-v5, Esri tiles network-only | ✓ VERIFIED | Line 9: radar-v5; "arcgisonline" absent from LOCAL/CDN/NETWORK_FIRST |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| CSP meta (line 7) | tiles Esri | img-src allowlist | ✓ WIRED | `img-src...server.arcgisonline.com` present; live test confirms tiles are NOT blocked (200 OK) |
| botão toggle (btnSat) | satTile + satRef layers | click handler → setSatelite/aria-pressed/satelliteOn | ✓ WIRED | `L.DomEvent.on(b,"click",toggleSatelite)` (line 711); live test confirms add/remove + attribution + aria-pressed flip |
| baiStyle()/lotStyle() | satelliteOn boolean | branch de estilo por modo | ✓ WIRED | Both functions read `satelliteOn` directly (lines 772, 777); re-applied on every `setSatelite()` call (lines 745-746) |
| setSatelite() (Plan 01) | opacidade das tiles satélite | transição CSS ~250ms via className sat-fade | ✓ WIRED | `.sat-fade .leaflet-tile{transition:opacity .25s ease}` + setOpacity ramp; live-verified fade + opacity-1 guarantee fix |
| sw.js fetch handler | server.arcgisonline.com | return early (!sameOrigin && !cdn), radar-v5 | ✓ WIRED | Confirmed absent from precache lists; live DevTools-equivalent (200 OK, not served from Cache Storage) |

### Data-Flow Trace (Level 4)

Not applicable in the traditional sense (no DB/API data pipeline) — the phase is a static tile-layer toggle. The relevant "data flow" is the opacity state machine, which was traced above (setOpacity → rAF → fallback timeout) and confirmed live, including the specific bug fix (`ce78603`) that closes the one real hollow-state risk (rAF throttled → invisible imagery).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| JS syntax validity of inline script | `new Function()` over `<script>` content | No syntax errors | ✓ PASS |
| No raw BAI_STYLE/LOT_STYLE setStyle regression | `grep "setStyle(BAI_STYLE)\|setStyle(LOT_STYLE)"` | Zero matches (all migrated to style functions) | ✓ PASS |
| Toggle on/off, tile loading, opacity, attribution, crossfade scope, console errors | Live browser preview (orchestrator) | All confirmed working; one bug found and fixed live (ce78603) | ✓ PASS |
| sw.js cache version + arcgisonline absence | `grep 'radar-v5'` / `grep 'arcgisonline'` (absent) | radar-v5 present; arcgisonline absent from precache lists | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SAT-01 | 04-01-PLAN.md | Toggle deliberado ruas⇄satélite com rótulos legíveis, nunca automático por zoom | ✓ SATISFIED | CSP extended, satTile+satRef created, bespoke bottomright button, aria-pressed wiring, zero zoom-triggered mode change, attribution native, bairro/lote style branch — all confirmed in code + live |
| SAT-02 | 04-02-PLAN.md | Crossfade suave em vez de troca seca de tile | ✓ SATISFIED | 250ms opacity crossfade scoped to `.sat-fade`, lockstep satTile/satRef, outlines snap (no transition), sw.js bumped to radar-v5 with Esri tiles confirmed network-only |

No orphaned requirements — both SAT-01 and SAT-02 are claimed and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found in satellite-related code | — | Scan for TODO/FIXME/placeholder/stub in radar-goiania.html and sw.js returned only unrelated form-input `placeholder="..."` attributes (search fields), no stubs in satellite logic |

### Human Verification Required

### 1. Rótulos legíveis em dispositivo real (campo)

**Test:** Abrir o app em um Android médio/baixo sob 4G, ativar o satélite, navegar por zooms 12 a 19, e observar se os rótulos do overlay Esri (ruas, bairros) permanecem legíveis (halo suficiente) contra a imagem de satélite em diferentes áreas de Goiânia.
**Expected:** Texto do overlay permanece legível (não se perde no ruído visual da imagem) em toda a faixa de zoom usada pelo app.
**Why human:** Fidelidade visual/tipográfica em hardware real e variação de conectividade 4G não são verificáveis por grep, DevTools estático ou parsing de código — depende de percepção visual humana em condições reais de uso. Este item já está registrado como pendência de campo conhecida em STATE.md e no 04-UI-SPEC.md, não bloqueante ao fechamento do código desta fase.

### Gaps Summary

Nenhum gap de código encontrado. Todas as quatro Success Criteria do roadmap (ROADMAP.md Phase 4) e todos os 12 must-haves declarados nos dois planos (04-01, 04-02) foram verificados diretamente no código-fonte de `radar-goiania.html` e `sw.js`, e corroborados pela verificação em navegador ao vivo feita pelo orquestrador (toggle on/off, carregamento de tiles sob CSP, fix do bug de opacidade via timeout de 250ms — commit `ce78603` —, atribuição Esri condicional, crossfade escopado, outlines em snap, zero erros de console).

O único item pendente é de natureza puramente visual/de campo (legibilidade de rótulos em dispositivo Android real sob 4G), já documentado nas SUMMARYs e no STATE.md como validação de campo não bloqueante — roteado para verificação humana, não conta como gap de implementação.

A nota obsoleta em STATE.md ("Phase 4: signup da API key Esri... ainda pendente") deve ser removida/atualizada pelo orquestrador ao fechar a fase — o projeto optou deliberadamente pela rota Esri keyless (sem necessidade de API key), tornando essa entrada de STATE.md desatualizada em relação à decisão registrada em 04-CONTEXT.md.

---

_Verified: 2026-07-04T23:10:00Z_
_Verifier: Claude (gsd-verifier)_
