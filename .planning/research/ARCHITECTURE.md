# Architecture Research — Map-First Integration (v2.0)

**Domain:** Single-file HTML/JS cadastral map app (Leaflet + proj4 + JSONP against a public ArcGIS server, no build, no backend).
**Researched:** 2026-07-04
**Confidence:** HIGH for geometry sourcing and current app structure (verified live against the production ArcGIS server and by reading `radar-goiania.html` directly). MEDIUM for AI-seam cost/provider specifics (not the focus of this query, kept minimal). LOW/flagged where noted.

---

## 0. Headline correction to existing docs (read this first)

`PROJETO-radar.md` §4 and `ROADMAP-radar.md` §0 state the Cadastro Imobiliário layer (`Feature_Base/MapServer/3`) **rejects `returnGeometry=true`**. Live testing today (2026-07-04) shows this is **no longer true, or was never true for this exact combination** — verified three ways:

```
GET .../Feature_Base/MapServer/3/query?where=ci='3010100562'&outFields=*&returnGeometry=true&f=json
→ 200 OK, geometryType:"esriGeometryPolygon", features[0].geometry.rings = [[7 points]]

GET .../Feature_Base/MapServer/3/query?where=cdbairro=3&outFields=*&returnGeometry=true&resultRecordCount=5&f=json
→ 200 OK, all 5 features carry geometry

Payload cost: 200 records, cdbairro=3, vlvenal>0:
  returnGeometry=false → 310,189 bytes
  returnGeometry=true  → 368,355 bytes   (+19%, not the multi-MB blowup one might fear)
```

**This is a load-bearing finding for the whole milestone.** It means the cadastral layer itself carries the lot polygon (not just `x_coord`/`y_coord`), so a separate geometry join is not strictly required for the "show this one lot's shape" case. However — and this matters for the render strategy — **the app already uses a *different*, purpose-built, lighter-weight layer for drawing many lots at once** (see §1). Both facts are true and both matter; they solve different sub-problems.

**Flag for live re-verification before roadmap lock-in:** re-run these exact queries right before Phase implementation starts, in case the server config drifts (it's undocumented and unversioned). Treat "layer 3 accepts geometry" as **verified today, not contractually guaranteed** — same posture as every other quirk in `ROADMAP-radar.md` §0.

---

## 1. Geometry sourcing — answered concretely

### The server has a proper cartographic layer hierarchy, not just the cadastral point/attribute layer

`Feature_Base/MapServer` (same service the app already calls) exposes:

| Layer id | Name | Geometry | Join key | Purpose |
|---|---|---|---|---|
| **0** | Divisas de Lote | Polygon | `ci` (10-digit, matches cadastral `ci`) | **Lot polygon boundaries** |
| **1** | Divisas de Quadra | Polygon | `id` (PK), `id_bai` (FK→layer 2) | Block boundaries |
| **2** | Divisas de Bairro | Polygon | `id` (PK), `nm_bai` (name) | **Bairro/neighborhood boundaries** |
| 3 | Cadastro Imobiário | Polygon (verified today) / attributes | `ci`, `nrinscr` | The existing cadastral data source (~310k lots) |
| 4 | Área Pública | Polygon | — | Public land parcels (unused today) |
| 5 | Número Predial Oficial | Point | — | Official street numbers (unused today) |
| 6 | Setor Cadastral | — | — | Cadastral sector boundary (distinct from "bairro" — worth checking if it maps 1:1 to `cdbairro`, it may not) |

Verified join chain: **Bairro (layer 2, `id`) → Quadra (layer 1, `id_bai`) → Lote (layer 0, `id_qdr`, `ci`) → Cadastro (layer 3, `ci`)**. Confirmed live: a bairro's `id` (`000400000603`, Campos Dourados) correctly filters layer 1 (`id_bai='000400000603'`) to 36 quadra records.

Layers 0, 1, 2 (unlike layer 3) **accept restricted `outFields`** (e.g. `outFields=id,ci,nm_lot` returns 200 OK) — they don't share layer 3's `outFields=*`-only quirk. This means requests to these layers can be kept lean by field, independent of the geometry payload cost.

### The app already has this wired — this is not greenfield

Reading `radar-goiania.html` directly (lines 570–697) shows the current build **already**:
- Defines `LOTSVC` (`Feature_Base/MapServer/0/query`) and `BAISVC` (`Feature_Base/MapServer/2/query`) as constants alongside `SVC` (layer 3).
- Has `initLots()` / `refreshLots()`: on `map.moveend` (debounced 250ms), if `zoom >= 17`, does an **envelope spatial query** against layer 0 with `returnGeometry=true`, draws each ring as an `L.polygon`, wires hover (lazy-loads a one-line summary via `ci`) and click (`loadCi(ci)` → full cadastral record by `ci`).
- Has `mostrarBairro(code)`: queries layer 2 by `nm_bai` (exact match, then LIKE fallback), draws the polygon outline (dashed, non-interactive), `fitBounds`, with a **fallback** to sampling 40 cadastral points and bounding them if the name match fails (accent mismatch).
- Has an anti-refetch guard: `LOTLAST.contains(map.getBounds())` skips redundant queries on short pans.
- Has request-invalidation tokens (`LOTTOKEN`) so stale in-flight queries can't clobber a newer viewport.

**Conclusion: this is not a "build from scratch" problem — it's "expose and orchestrate what already exists as the app's home screen instead of a background feature only reachable by zooming manually to 17+ inside the map tab."** The roadmap's new requirements ("bairro polygons at low zoom, click→zoom→reveal lots," "home=map") are UI/flow work layered on top of a working data layer, not a new data-sourcing problem.

### Fallback question ("what if lot polygons aren't available") — moot, but documented for completeness

Lot polygons ARE available (layer 0, confirmed above) with acceptable payload cost at realistic viewport sizes (95 features for a 300×300m box). No point-cloud/voronoi fallback is needed. The only real fallback already implemented is for the **bairro name-matching** step (`mostrarBairro`'s LIKE-then-sample-points fallback for accent mismatches) — keep that pattern, it's cheap insurance already proven in production.

### Recommended data-flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ Zoom ≤ ~13 (city-wide)                                                │
│   → Load ALL bairro outlines ONCE (layer 2, returnGeometry=true,      │
│     outFields=id,nm_bai, no attribute bloat)                          │
│   → ~1,206 bairro features city-wide (verified count) — heavier than  │
│     ideal for one shot; PAGINATE or pre-bake as static GeoJSON        │
│     (see §2 "Bairro dataset: live vs static" below)                   │
│   → Render as styled polygons; hover = tooltip with nm_bai            │
├──────────────────────────────────────────────────────────────────────┤
│ Click bairro → fitBounds(bairro geometry) → zoom jumps to ~16-17      │
├──────────────────────────────────────────────────────────────────────┤
│ Zoom ≥ 17 (existing threshold, keep it)                               │
│   → refreshLots() as it exists TODAY: envelope query on layer 0,      │
│     returnGeometry=true, outFields minimal (id, ci — drop nm_lot if   │
│     unused by hover text), debounced on moveend                       │
│   → click a lot polygon → loadCi(ci) → full record from layer 3       │
└──────────────────────────────────────────────────────────────────────┘
```

**Important correction of a premise in the question:** the question assumes lot geometry might not exist and asks for a voronoi/point fallback. Live verification shows lot geometry exists on layer 0 and is already consumed by the app's `refreshLots()`. The real open design question is not "where do polygons come from" but **"how to load ~1,206 bairro polygons cheaply for the new home screen without hammering the fragile endpoint on every cold load."** See §2.

---

## 2. Render strategy

### Bairro dataset: live ArcGIS query vs. static pre-baked file

The Prefeitura's open-data bairro GeoJSON (already in EPSG:31982, referenced in `INTELIGENCIA-radar.md` and `PROJECT.md` context but **not yet downloaded into the repo** — confirmed by directory listing, no `.geojson` file exists yet) and the live `Divisas de Bairro` layer (layer 2) are two paths to the same shape data. Recommendation:

**Use a static, pre-baked GeoJSON file for the home-screen bairro layer, generated once (build-time script, not runtime) from either source, committed alongside `radar-goiania.html`.**

Rationale:
- 1,206 bairro polygons is a fixed load on app open, every session, for every user — the worst possible pattern against a server documented as returning 502 under load with no SLA.
- Bairro boundaries change rarely (annual cadastral revision at most) — this is exactly the profile of data that should NOT be fetched live.
- A pre-simplified GeoJSON (Douglas-Peucker at a tolerance appropriate for city-wide zoom, e.g. via `mapshaper` in the build step) will be far smaller than the raw ArcGIS rings (which are full-precision surveyed boundaries, not simplified for cartographic display at zoom 11-13).
- Keeps the "single file, no backend" constraint intact: the GeoJSON becomes a second static asset next to `radar-goiania.html` (same treatment as `caixa-goiania.js`, `manifest.json` today), or can be inlined as a `<script>` JSON blob if kept under a size budget (target: **under ~150KB gzipped**, matching the existing OSM POI budget noted in `INTELIGENCIA-radar.md` I5).
- A one-time script (Python, matching `atualizar-caixa.py`'s existing pattern) hits layer 2 with pagination, saves `bairros-goiania.json`, and is re-run manually if boundaries change — never at app runtime.

**Do NOT fetch layer 2 live for the home screen's initial bairro paint.** Reserve live layer-2 queries for the already-working single-bairro lookup (`mostrarBairro`, by name, one polygon) — that pattern is proven and low-volume (1 request, 1 feature).

**Quadra outlines (layer 1) are not needed for the stated requirement** ("bairro polygons → click → lot subdivisions"). The requirement skips block-level detail. Keep layer 1 as a documented-but-unused capability; do not build UI for it in this milestone (avoids scope creep and an extra fetch tier).

### Reprojection: proj4 vs. Leaflet's built-in — keep proj4, do it once per payload

The app already standardizes on **manual proj4 conversion** (`toWGS`, `proj4("EPSG:31982","EPSG:4326",[x,y])`) applied per-coordinate after fetch, not a CRS-aware vector engine (e.g., no `proj4leaflet` plugin, no Leaflet CRS override). Keep this pattern for consistency — introducing a vector-tile engine or a Leaflet CRS plugin would be a bigger architectural change than this milestone calls for, and the existing lot-drawing code already proves the manual-conversion approach performs adequately at zoom 17+.

For the new bairro layer: convert the **pre-baked static GeoJSON to WGS84 at build time** (in the same offline script that fetches and simplifies it), not at runtime. This removes ~1,200 polygons × N points of proj4 conversion from every page load — a meaningful mobile-performance win the current per-request `toWGS` mapping doesn't get, because today's lot-layer conversion only ever processes ~50-100 features per viewport, not 1,206 up front.

Runtime proj4 conversion stays necessary only for:
- Live lot polygons (layer 0, already implemented, viewport-scoped, small N).
- Live single-bairro outline lookups (`mostrarBairro`, still needed as a fallback / for the "type a bairro name in the search card" flow — see §3).
- Click-to-identify (`onMapClick`) and any new drill-down math.

### Minimizing calls against the fragile endpoint — concrete rules

1. **Bairro layer: zero live calls on cold load** (static file, see above).
2. **Lot layer: keep the existing zoom-gate (`zoom >= 17`) and viewport-envelope + debounce (250ms) + bounds-containment cache (`LOTLAST`) — this is already the right pattern, don't rebuild it.**
3. **Add a session-scoped cache keyed by bairro `id` for anything that currently re-queries layer 2 by name** (`mostrarBairro`) — if the user re-opens the same bairro card twice in a session, don't refetch.
4. **Never use `returnCountOnly` speculatively for the bairro home screen** — it was the right tool for statistical percentile search (I1 in `INTELIGENCIA-radar.md`) where the alternative was downloading thousands of records; it adds no value for a fixed, small (1,206), rarely-changing dataset that should be static instead.
5. Keep the existing JSONP retry/backoff (`jsonp()` with 1 retry, 900ms pause) for all *remaining* live calls (lot viewport queries, single-bairro fallback, click-to-identify, search). Nothing here changes that.

---

## 3. App structure — view/route model

### Current state (verified in code)

- **State variable:** `document.body.dataset.view` — a single string, `"busca"` or `"mapa"`. CSS keys off it directly: `body[data-view="busca"] .mapwrap{display:none}`, `body[data-view="mapa"] .panel{display:none}`.
- **Transition function:** `setView(v)` — sets the dataset, toggles the two nav button states, and (critically) calls `map.invalidateSize()` + `refreshLots()` on entering `"mapa"` (Leaflet needs a resize nudge when its container was `display:none`).
- **Detail (bottom sheet on mobile):** NOT a third value of `data-view`. It's an overlay panel (`showDetail`, `closeDetail`) that lives independently and is shown/hidden with its own class toggle, on top of whichever view is active. `revealList(ci)` and `flashList(ci)` coordinate between map clicks and the busca-tab list.
- **Search itself has a fifth-ish sub-state:** `MODE` (`'ql'|'addr'|'bd'|'insc'`) — which search technique is active within the Busca screen. Orthogonal to `data-view`.

This is already a lightweight, ad-hoc state machine with two orthogonal axes (screen: busca/mapa; overlay: detail open/closed) plus a search-mode enum nested inside the busca screen. It has proven robust through v1.0 (mobile premium, PWA, bottom sheet) — **extend it, don't replace it.**

### Recommended extension for v2.0 (map-first)

Add a third value to the existing `data-view` axis instead of inventing a parallel router:

```
data-view ∈ { "home", "busca", "detalhe" }   // was: { "busca", "mapa" }
```

Renaming `"mapa"` to `"home"` (or keeping `"mapa"` as the internal value but treating it as the default/landing state) captures the requirement directly: **home = map** becomes "the view the app boots into and returns to," not a new concept. Concretely:

- **Boot:** `setView('home')` instead of the current implicit `data-view="busca"` default (the `<body>` tag's initial attribute, or the first `setMode`/`setView` call in the boot sequence, flips).
- **Busca becomes reachable via a card/button ON the home/map screen**, not via the persistent bottom nav bar as a co-equal tab. The existing `#viewbar` (`🔍 Consulta` / `🗺️ Mapa` buttons) can stay as the *escape hatch* back to full-screen search (preserves muscle memory for existing users / desktop layout), while a new floating card (e.g., "🔍 Buscar por quadra, endereço ou inscrição") sitting on top of the map is the primary entry point into search — clicking it can either (a) expand the card in-place into the existing search panel without leaving `data-view="home"`, or (b) call `setView('busca')` to reuse the existing full-screen search layout unchanged. **(b) is lower-risk and reuses 100% of existing CSS/markup for the search panel — recommended for v2.0; a slide-up card animation (motion requirement) can wrap this transition without touching the underlying state values.**
- **Detail/bottom-sheet logic is untouched.** It already floats above both `busca` and `mapa`/`home`; no change needed to `showDetail`/`closeDetail`/the drag-to-close handlers. The bairro-click-to-drill-down flow reuses this exact pattern: bairro polygon click → `fitBounds` (already exists as `mostrarBairro`'s `enquadra` helper) → zoom crosses 17 → `refreshLots()` fires automatically via the existing `moveend` listener. **No new state value is required for "bairro drill-down" — it's a map camera transition, not a view transition**, which is why this integrates cheaply into the existing model.
- **Desktop layout** (`.panel` / `.mapwrap` side-by-side, per the CSS rules above) needs a decision: does desktop also go "map-first" (map fills the screen, search is a floating card), or does desktop keep the existing two-pane layout (search panel + map side by side) since screen space isn't the constraint that motivated mobile's Busca⇄Mapa split in the first place? **Recommend: keep desktop's side-by-side panel as-is; apply "search demoted to a card" only to the mobile single-pane flow where "home" as a concept is meaningful.** This avoids redesigning the desktop layout (out of stated scope) while still shipping the requirement.

### Minimal state machine (concrete, not abstract)

```
States:        home ⇄ busca  (existing two-state toggle, extended)
Sub-state:     detalhe (overlay, orthogonal, unchanged)
Sub-state:     MODE ∈ {ql, addr, bd, insc}  (unchanged, nested inside busca)
New:           map camera state (bairro-zoomed | lot-zoomed) — NOT app view state,
               purely a function of map.getZoom(), already how refreshLots() gates itself.

Transitions:
  boot                    → home
  home: click bairro poly → home (camera: fitBounds, zoom jumps ≥17 eventually)
  home: click lot poly    → detalhe (overlay opens; underlying view stays home)
  home: click search card → busca (existing setView, unchanged)
  busca: submit result    → busca or mapa/home (existing "auto-switch to map" logic,
                             lines ~1024-1027, unchanged) → then detalhe opens on tap
  detalhe: close/drag-down → returns to whatever view was active underneath (unchanged)
```

**Why not a real router/framework:** the existing model already handles PWA install, bottom sheet, safe-area, and Busca⇄Mapa cleanly with ~15 lines of `setView`/CSS. A hash-router or state library would be pure overhead for 3 states + 1 overlay + 1 enum. The only genuinely new piece of state is which value `data-view` defaults to at boot and what the search-card-to-panel transition animates — both are additive, not structural.

---

## 4. AI seam — isolated, dormant integration point

### Placement

Create a clearly separated block, physically distant from the cadastral/laudo code (which spans roughly lines 566–1830+ today). Suggested location: **immediately after the closing of the laudo/wizard code and before the boot sequence** (i.e., its own clearly commented section, last major block in `<script>`), so a reviewer scanning top-to-bottom sees "cadastral core → laudo → [AI SEAM — DORMANT] → boot." Alternatively (equally valid, arguably cleaner): a **separate inline `<script>` tag** at the end of `<body>`, after the main script — this makes the isolation visually obvious in the file itself (a second, small `<script>` block that could be deleted entirely with zero effect on the rest of the app), reinforcing the "can be ripped out" guarantee the PROJECT.md constraints demand.

Recommend the **separate `<script>` tag** approach — it makes "this is optional and isolated" true at the file-structure level, not just by convention/comment, which is a stronger guarantee for an app whose core selling point is auditability.

### Shape: config object + single async function boundary

```javascript
/* ============================================================
   AI SEAM — DORMANT (pesquisa de mercado externa)
   Isolado do núcleo cadastral/laudo por design: nenhuma função
   abaixo é chamada por buscar(), loadCi(), onMapClick(), showDetail(),
   ou qualquer caminho do wizard de laudo. Ativar = mudar AI_CONFIG.enabled
   e chamar pesquisarMercadoIA() a partir de um botão opt-in explícito
   (ainda não existe na UI em v2.0).
   ============================================================ */

const AI_CONFIG = {
  enabled: false,           // master switch — dormant by default, ships false
  provider: null,           // e.g. "openai" | "anthropic" | "perplexity" — unset until activation
  model: null,              // e.g. "gpt-5-mini" — cheapest viable model, decided at activation time
  endpoint: null,           // full URL of the provider's chat/completions endpoint
  apiKey: null,             // NEVER hardcode; must be user-supplied at runtime (see below) — no key ships in the HTML
  maxTokens: 600,           // cap cost/latency; market-research summary doesn't need long output
  timeoutMs: 15000,
};

/**
 * pesquisarMercadoIA — single well-defined async boundary for external AI market research.
 * Input: a plain-data snapshot already computed by the deterministic core (never raw API objects,
 *        never anything containing dtnascimen or other SENS-listed fields — enforced by only
 *        accepting a pre-shaped, whitelisted payload).
 * Output: a plain string/object the UI renders as a clearly-labeled "IA — pesquisa externa,
 *         não verificada" panel. Never mutates cadastral state, never feeds the laudo pipeline.
 * Failure mode: any error (network, quota, malformed response) resolves to null — caller must
 *        treat null as "sem análise disponível", never throw into the main UI's error toasts.
 *
 * @param {{bairro: string, uso: string, areaPriv: number, faixaMercado: [number,number]}} contexto
 * @returns {Promise<{resumo: string, fonte: string} | null>}
 */
async function pesquisarMercadoIA(contexto) {
  if (!AI_CONFIG.enabled) return null;
  // implementation deferred to activation phase — deliberately unimplemented in v2.0.
  return null;
}
```

Key properties this shape guarantees:
- **Single call site contract**: any future UI hook calls exactly one function with a whitelisted, pre-sanitized input shape — it is structurally impossible for it to receive `dtnascimen` or any field on the existing `SENS` denylist, because the caller must construct `contexto` fresh, not pass through a raw API record.
- **Fail-closed**: `enabled:false` short-circuits before any network activity — the dormant state costs nothing at runtime (no import, no CDN script tag for an SDK, no request).
- **No shared mutable state** with the cadastral core: it doesn't read `LAST`, `sel`, `LZ`, or write into any of the existing caches (`LOTINFO`, `COMBO`, etc.). It receives a value, returns a value.
- **Key handling**: never ship a key in the static HTML (this file is public on GitHub Pages per `ROADMAP-radar.md`). At activation time, the key must be entered by the user into a local-only field (e.g., stored in `localStorage` under a distinct key like `radar_ai_key`, separate from `radar_prof`), never committed, never sent anywhere except directly to the provider's endpoint from the browser. Document this explicitly in-code so a future implementer doesn't accidentally hardcode a key into a public file.
- **Labeling discipline**: per `PROJECT.md`'s "Out of Scope" and `INTELIGENCIA-radar.md`'s "Princípio: SEM IA no app," any future UI surface for this must be visually and textually distinct from the deterministic "análise"/"estatística" panels — e.g., a different card style, an explicit "Pesquisa de IA (externa, não verificada)" label, never blended into the comparables/laudo output.

### What v2.0 actually ships for this seam

Given the milestone's own scope line ("v2.0 só cria o encaixe dormant; ativação vem depois"), the concrete v2.0 deliverable is:
1. The `AI_CONFIG` object and `pesquisarMercadoIA` stub, exactly as above, committed but inert (`enabled:false`, function returns `null` unconditionally).
2. Zero UI surface — no button, no card, no CDN script tag for any AI SDK. Adding a CDN dependency for a disabled feature would violate the "any new lib must survive offline/PWA" constraint for no benefit.
3. A code comment block (as shown) documenting activation steps for the future implementer, so this doesn't require re-discovery later.

---

## Suggested build order (dependency-ordered)

```
1. Bairro static dataset (build-time script)
   ├─ Depends on: nothing (offline, one-time)
   ├─ Fetch layer 2 (Divisas de Bairro) paginated, OR use Prefeitura's open GeoJSON if it
   │  simplifies the pipeline — either source lands in the same EPSG:31982 shape.
   ├─ Simplify geometry (mapshaper or equivalent) for city-wide zoom levels.
   ├─ Output: bairros-goiania.json (or .js constant), WGS84-converted, committed to repo.
   └─ Flag for live verification: confirm layer 2's 1,206-feature count is stable and that
      `nm_bai` values cleanly cover all 709 `cdbairro` codes used by the cadastral layer
      (they may not be 1:1 — "bairro" in layer 2 and "setor cadastral" (`cdbairro`) in layer 3
      could be different administrative units; this needs a join-integrity check before
      committing to click-bairro→filter-cadastral-by-cdbairro as the drill-down mechanism).

2. Home = map view-state change (app structure)
   ├─ Depends on: nothing new technically, but should land AFTER step 1 so the home screen
   │  has real bairro polygons to show instead of an empty map.
   ├─ Rename/repurpose data-view default to boot into map; add search-card entry point.
   ├─ Reuses: setView(), existing CSS display rules, existing invalidateSize()/refreshLots()
   │  call already wired into setView('mapa').
   └─ Low risk: additive change to a 2-state toggle that already works.

3. Bairro polygon render + hover + click→zoom (render strategy)
   ├─ Depends on: 1 (data) and 2 (home screen to render into).
   ├─ Render static bairro GeoJSON as a Leaflet layer at low zoom (mirrors existing
   │  bairroOutline pattern in mostrarBairro, but for ALL bairros at once, statically sourced).
   ├─ Click → fitBounds (reuse enquadra() logic) → existing refreshLots() takes over once
   │  zoom crosses 17 — THIS PART ALREADY WORKS, verify it still fires correctly when the
   │  camera transition originates from a bairro click rather than a manual pinch-zoom.
   └─ No new endpoint calls introduced — this step is purely rendering + reusing existing
      lot-layer machinery.

4. Motion pass (transitions, sheet, cards)
   ├─ Depends on: 2 and 3 (needs the new view states and render layers to exist first —
   │  animating a transition that doesn't exist yet is wasted work).
   └─ Apply last so it doesn't get thrown away by structural changes to 2/3.

5. Satellite layer toggle
   ├─ Depends on: nothing above — fully independent, can be built in parallel with 1-4.
   └─ Additive: new L.tileLayer + a toggle button; verify tile provider works offline-cached
      per PWA constraints (check sw.js caching strategy covers the new tile URLs).

6. AI seam (config + stub function)
   ├─ Depends on: nothing — fully independent, can be built any time, even first.
   └─ Zero risk to sequence relative to 1-5 since it has no UI and no runtime effect.
```

**Practical ordering for a single implementer:** 1 → 2 → 3 → (5 and 6 in parallel, low-risk filler) → 4 last. Step 1 is the only one requiring a live-data decision (layer 2 vs. Prefeitura GeoJSON, and the join-integrity check flagged above) — resolve that before writing any rendering code so step 3 isn't built against the wrong join key.

---

## Flags for live verification before/during implementation

1. **Re-run the layer-3 `returnGeometry=true` test at implementation time** — verified today (2026-07-04) but undocumented/unversioned server behavior; don't hardcode a permanent assumption into comments without a "last verified" date, matching the existing convention in `ROADMAP-radar.md` §0.
2. **Confirm bairro (layer 2, `nm_bai`/`id`) vs. setor cadastral (`cdbairro` on layer 3, and layer 6 "Setor Cadastral") are the same administrative unit, or determine the mapping.** If they differ, "click bairro polygon → drill into that bairro's lots" needs either a spatial join (envelope query scoped to the clicked polygon's bounds, which the existing `refreshLots()` viewport approach already does and requires no fix) or an explicit `cdbairro`↔bairro-`id` lookup table (extra build step). The viewport/envelope approach sidesteps this ambiguity entirely — recommend relying on it rather than trying to filter layer 3 by a bairro identifier.
3. **Confirm the 1,206-feature count for layer 2 is a stable "get everything" size** (not itself paginated/truncated) — the query didn't specify `resultRecordCount`, and ArcGIS default page sizes vary; validate with explicit pagination in the build script (mirroring the existing `fetchWhere` pattern's page-loop, adapted for the offline script).
4. **PWA/service-worker cache scope**: confirm `sw.js`'s current caching strategy (app shell + CDN cached, "consultas e tiles sempre na rede" per `ROADMAP-radar.md` M8) needs updating to also cache the new static bairro GeoJSON asset and any new satellite tile provider's shell request, without accidentally caching live query responses (which must stay network-only, per existing policy).

---

## Sources

- Live ArcGIS server queries against `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/{0,1,2,3}` — all findings in §1 and the correction in §0 are HIGH confidence, verified directly today (2026-07-04), not training-data claims.
- `radar-goiania.html` (current production file, read directly) — HIGH confidence for all app-structure claims in §3 (exact line references given).
- `PROJETO-radar.md`, `ROADMAP-radar.md`, `INTELIGENCIA-radar.md`, `.planning/PROJECT.md` — project context and existing documented quirks (one of which, layer 3's `returnGeometry` rejection, is corrected by live testing above).

---
*Architecture research for: Radar Fundiário Goiânia — v2.0 map-first integration*
*Researched: 2026-07-04*
