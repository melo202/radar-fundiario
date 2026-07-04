# Project Research Summary

**Project:** Radar Fundiario Goiania - v2.0 (Mapa-first + Motion + Satelite)
**Domain:** Single-file, no-build, CDN-loaded PWA -- map-first cadastral/real-estate parcel explorer
**Researched:** 2026-07-04
**Confidence:** HIGH (architecture, stack for map/motion), MEDIUM-HIGH (features), MEDIUM (satellite licensing -- deliberately left as an open decision, not settled)

## Executive Summary

**The single most important finding of this research is a reframing of the milestone itself.** What PROJECT.md scoped as "home = mapa interativo, bairros como poligonos, clique revela lotes" was written assuming this data plumbing might need to be built. Live verification against the production ArcGIS server (2026-07-04) shows it already exists and is already wired into `radar-goiania.html`: layer 0 (Divisas de Lote) and layer 2 (Divisas de Bairro) both return real polygon geometry cheaply (+19% payload, not a multi-MB blowup), and the app's `refreshLots()`, `mostrarBairro()`, `LOTSVC`, and `BAISVC` already consume them correctly, gated at zoom 17, debounced, with anti-refetch guards. **v2.0 is therefore UI/flow restructuring on top of working plumbing -- promoting an existing background capability to the app's home screen -- not a new geometry-sourcing project.** This changes the risk profile: the hard technical unknowns (does the server give us shapes? does the reprojection pipeline handle polygons?) are resolved; what remains is interaction design, a static-data pipeline for the home screen's initial paint, and motion polish. `PROJETO-radar.md` section 4 and `ROADMAP-radar.md` section 0 need a documented correction -- they currently assert `returnGeometry=true` is rejected, which is no longer true (or was never true for this exact query combination).

The recommended approach across all four research tracks converges cleanly: **stay on Leaflet 1.9.4** (no MapLibre migration -- the app's polygon counts per view are an order of magnitude below where Leaflet's SVG/Canvas renderer becomes a bottleneck, and MapLibre would cost 210-750KB gzipped plus a second coordinate pipeline for zero gain at this scale); **add Motion (motion.dev) via CDN** for transitions/sheet/stagger (small, WAAPI-based, zero-build UMD global, coordinates with Leaflet's own `flyTo` via callbacks rather than replacing it); **serve bairro polygons from a static pre-baked GeoJSON asset**, not a live fetch, to keep the fragile, SLA-less ArcGIS endpoint off the home screen's critical path; and **add a satellite toggle as a second `L.tileLayer`**, with the specific provider pending a licensing decision (see Open Decisions). The build order that falls out of the architecture and pitfalls research is consistent: static bairro data first, then the home/map view-state change, then bairro rendering + click-to-drill (which mostly just exposes existing `refreshLots()`/`mostrarBairro()` machinery), then motion polish last (animating things that don't structurally exist yet is wasted work), with satellite and the AI seam buildable in parallel since both are fully independent.

The key risks are well-understood and mostly mitigations of patterns the project has already fought before: reintroducing the historical UTM zone-22-vs-23 bug or a GeoJSON coordinate-order flip in a new polygon pipeline (mitigated by reusing the exact existing `toWGS()`/`proj4.defs` string, never re-deriving it); hammering the already-documented 502-under-load endpoint by fetching ~1,206 bairro polygons live on every home-page visit (mitigated by the static-asset decision above); rendering too many lot polygons naively at bairro-drill scale in bairros with 20,000+ registros (mitigated by keeping the existing zoom>=17 gate and viewport-envelope pattern, never rendering city-wide); and shipping motion without `prefers-reduced-motion` or shipping a satellite layer whose imagery gets cached indiscriminately by the service worker, silently ballooning PWA storage. Three items remain genuinely open and need a human decision before or during roadmapping, detailed below: satellite tile licensing for a commercial-adjacent work tool, verification that the bairro/setor-cadastral join is administratively consistent, and empirical tuning of the zoom thresholds that gate lot rendering.

## Key Findings

### Recommended Stack

Stay on the existing, validated stack and add exactly two new pieces. **Leaflet 1.9.4** stays as the map engine -- no MapLibre GL JS migration. Published benchmarks put the Leaflet/MapLibre crossover around 10,000-50,000 features; this app renders hundreds to low-thousands of polygons per view (never all ~310k lots or even all 1,206 bairros with full attribute detail at once), so MapLibre buys nothing and costs a second coordinate/CRS pipeline. **proj4js** stays too (bump 2.11.0 to 2.20.9, same API surface, smoke-test the known UTM-zone regression before shipping). **Motion (motion.dev)**, added via CDN UMD global (`<script src=".../motion.js">` exposing `window.Motion`), is the new motion library -- smallest full-featured option tested (~5-18KB gzipped depending on features used vs. GSAP's 60-70KB core), uses the Web Animations API so it runs on the compositor thread for 60fps on mobile, and has a natural `prefers-reduced-motion` integration point. It does not replace Leaflet's own `map.flyTo()` -- the two coordinate via `moveend` callbacks. **Satellite** is a second `L.tileLayer`, standard Web Mercator XYZ, no new CRS work -- but which provider is an open decision (see below), not a settled recommendation.

**Core technologies:**
- Leaflet 1.9.4 -- map rendering, pan/zoom, GeoJSON -- already proven at this app's real scale; zero migration risk to the validated proj4 pipeline
- proj4js 2.20.9 -- EPSG:31982 to WGS84 reprojection -- single source of truth already exists (`toWGS()`), reuse it for every new geometry pipeline, never redefine
- Motion (motion.dev) 12.x via CDN UMD -- transitions, sheet drag/spring, stagger -- zero-build, WAAPI-backed, `prefers-reduced-motion`-friendly
- `L.tileLayer` + `preferCanvas: true` -- satellite toggle + polygon rendering -- Canvas batches paths into fewer DOM nodes, standard Leaflet answer for many-polygons-smooth-on-mobile

### Expected Features

Research on comparable products (Zillow map view, Regrid, GeoSampa, Mapbox/ArcGIS viewer patterns) converges on a clear table-stakes/differentiator/anti-feature split for a map-first parcel explorer.

**Must have (table stakes):**
- Progressive disclosure by zoom: bairro outlines at city zoom, lote polygons only after drilling into one bairro -- this is both a UX norm and a technical necessity (never render all lots at once)
- Desktop hover-highlight + tooltip AND a mobile tap equivalent -- no true hover on touch; use a two-tap pattern (tap 1 = highlight/name, tap 2 or explicit CTA = drill in), built from one shared `highlightFeature()` function gated by touch detection, not two parallel code paths
- Click/tap-to-drill with smooth `flyTo`/`fitBounds` (fast, ~0.5-1s, consistent -- not a slow "cinematic" transition, which reads as frustrating on repeat use)
- Persistent, always-reachable search -- PROJECT.md's "busca vira card" must not mean "search becomes hard to find"; research is unanimous (iOS 26, Google Maps, Zillow patterns) that search stays a one-tap-away floating pill/card even when the map is home
- Streets and satellite toggle shipped together with a label-legibility treatment (halo/backdrop on labels over satellite imagery) -- shipping one without the other is a visible, embarrassing regression

**Should have (differentiators):**
- Breadcrumb trail (Goiania > Bairro) for drill history -- cheap, high-leverage, most generic map viewers skip it
- Streets/satellite crossfade instead of a hard tile swap -- small effort, disproportionate "premium" payoff, fits the app's existing polish trajectory
- Stagger-in entrance for lote polygons on drill-in, reusing the same timing/easing already used for search-result card stagger

**Defer (v2.1+):**
- Territory-aware polygon styling ("meu territorio") -- don't build now, but keep polygon styling as a function of feature properties (not hardcoded) so this is a trivial style-function branch later
- Heatmap/value-gradient overlays, long-press secondary actions on lots -- depend on the render pipeline v2.0 builds; natural v2.1 extensions, not v2.0 scope

**Anti-features to explicitly avoid:** rendering all ~310k lots at city zoom; continuous/auto-following "blue dot" GPS tracking (one-shot locate-me only); full Mapbox-GL-style basemap swap with manual layer re-adding (Leaflet's simpler tile-layer-swap-under-untouched-GeoJSON-panes model avoids this whole bug class); long cinematic multi-second flyTo on every interaction; hover as the only channel to reveal a bairro name on mobile; auto-switching to satellite based on zoom (must stay a deliberate user toggle, never automatic).

### Architecture Approach

The existing app already has a lightweight, ad-hoc two-axis state machine (`data-view` in {busca, mapa} plus an independent detail-overlay plus a nested search-mode enum) that has proven robust through v1.0. The recommended v2.0 extension adds `"home"` as the default/landing value of the same axis rather than inventing a parallel router -- bairro-click-to-drill-down is a **map camera transition** (`fitBounds` then zoom crosses 17 then existing `refreshLots()` fires via the existing `moveend` listener), not a new view-state value, which is why it integrates cheaply. Desktop keeps its side-by-side panel layout unchanged; only the mobile single-pane flow gets the "search demoted to a floating card" treatment PROJECT.md describes.

**Major components:**
1. **Static bairro dataset (build-time asset)** -- pre-baked, simplified, WGS84-converted GeoJSON committed alongside `radar-goiania.html`, generated once offline from layer 2 or the Prefeitura's open-data export; removes the home screen's initial paint from the fragile live endpoint entirely
2. **Home = map view-state (app structure)** -- extend the existing `setView()`/`data-view` model to boot into a map-first home; search becomes reachable via a floating card that either expands in-place or calls the existing `setView('busca')` -- the latter is lower-risk, reusing 100% of existing search-panel markup
3. **Bairro polygon render + hover/tap + click to zoom (render strategy)** -- renders the static dataset at low zoom, reuses the existing `enquadra()`/`fitBounds` helper on click; **the lot-reveal-on-drill-in step already works today** via `refreshLots()`'s existing zoom>=17 gate -- this phase mostly verifies it still fires correctly when the camera transition originates from a bairro click rather than manual pinch-zoom
4. **AI seam (isolated, dormant)** -- a physically separate `<script>` block/tag, `AI_CONFIG.enabled=false` by default, single async function boundary (`pesquisarMercadoIA`) taking only a pre-sanitized, whitelisted input shape (never a raw API record, structurally preventing `dtnascimen` leakage), fails closed to `null`, zero CDN dependency and zero UI surface in v2.0 -- a genuine "delete this file, core app is unaffected" module boundary

### Critical Pitfalls (post-reconciliation)

1. **UTM zone / coordinate-order regression in the new polygon pipeline** -- the app already suffered the zone-22-vs-23 bug once; any new bairro/lot polygon codepath is a fresh place to reintroduce it if it re-derives the projection independently. Reuse the single existing `proj4.defs`/`toWGS()` helper for every new pipeline, including any offline build script -- never a second definition. Test against an irregular (non-square) bairro shape, not a symmetric one that would hide an axis swap.
2. **Endpoint 502-under-load, reintroduced via the home screen** -- the ArcGIS server has a documented, SLA-less 502-under-load failure mode. A map-first home that fetches ~1,206 bairro polygons live on every visit (instead of from a static asset) turns the single most frequent page load into the heaviest consumer of the most fragile dependency. This is the reconciled, load-bearing version of what PITFALLS.md flagged more broadly -- resolved by the static-asset architecture decision, not by retry/backoff alone.
3. **Naive full-fetch rendering of every lot polygon in a large bairro** -- bairros like Bueno (~57k registros) or Oeste (~32k) would jank/freeze mid-range Android if rendered as individual interactive DOM/Canvas polygons without a zoom gate. The existing `refreshLots()` zoom>=17 + viewport-envelope + debounce pattern already solves this -- the risk is a new implementation bypassing it, not the existing one failing.
4. **Motion shipped without `prefers-reduced-motion`, or motion that blocks the critical path** -- must be a global CSS media-query block from the first motion commit (retrofitting later means auditing every animation added since), and every transition must be interruptible -- a corretor in the field doing rapid lookups must never be forced to wait out a "premium" 600ms transition.
5. **Satellite tiles cached indiscriminately by the service worker, AND the CDN allowlist not updated for Motion/Esri hosts** -- the underlying PWA contract survives even though the MapLibre-specific version of this pitfall (ESM/CSP/CDN migration breakage) is moot given Leaflet stays. `sw.js`'s hardcoded CDN allowlist still must be updated for whichever Motion CDN host and satellite tile host are chosen, `CACHE` version bumped in the same commit, and satellite tiles explicitly excluded from cache-first storage (kept network-only, like existing map tiles) to avoid silently ballooning PWA storage quota.

## Reconciliation Notes (research contradictions resolved)

- **Map engine:** STACK.md and ARCHITECTURE.md both concluded "stay on Leaflet." PITFALLS.md was researched under the assumption a MapLibre migration might happen. **Resolution: no migration.** MapLibre-specific pitfalls (ESM-only distribution breaking the CDN pattern, CSP `worker-src` requirements, MapLibre's own Leaflet-migration-guide gotchas) are downgraded to N/A. The pitfall that survives in a different form: adding Motion + Esri satellite tiles still requires updating `sw.js`'s CDN allowlist and bumping the cache version together -- this is a general "any new external asset" rule, not MapLibre-specific.
- **Geometry sourcing:** ARCHITECTURE.md's live verification is authoritative and supersedes `PROJETO-radar.md`/`ROADMAP-radar.md`'s documented claim that the cadastral layer rejects `returnGeometry=true`. It doesn't reject it. Treat v2.0 as UI/flow work on working plumbing (layers 0/1/2 already queried by `refreshLots()`/`mostrarBairro()`), not new data-sourcing. Action item: correct `PROJETO-radar.md` section 4 and `ROADMAP-radar.md` section 0 during this milestone.
- **Satellite licensing:** STACK.md stated Esri World Imagery's commercial use is "permitted." PITFALLS.md flagged Esri's free-tier terms as having a non-commercial-use clause that is a genuine judgment call for a corretor's (commercial) work tool. **Resolution: this is an open decision for the user, not settled fact** -- see Open Decisions below.
- **Bairro/setor join integrity:** ARCHITECTURE.md flags a discrepancy between 709 `cdbairro` codes (per ROADMAP-radar.md, the cadastral layer's administrative unit) and 1,206 polygons on layer 2 (Divisas de Bairro). These may be different administrative units (bairro vs. setor cadastral), not a 1:1 join. **Resolution: don't build the drill-down on an explicit bairro-id to cdbairro lookup table** -- rely on the existing viewport/envelope query approach (`refreshLots()` already filters by map bounds, not by a bairro identifier), which sidesteps the join-integrity question entirely. Still flagged as a verification item before considering any future feature that does need the explicit join (e.g., "show total lot count for this bairro" without a live query).

## AI Seam -- Model and Access Path (dormant, for future activation)

Not part of v2.0's active build (zero UI, zero network calls, `enabled:false`), but the seam's shape should be designed against this target so future activation doesn't require re-architecting:

- **API contract:** OpenAI-compatible Chat Completions format (matches OpenRouter, DeepSeek, Z.ai, Groq, etc.) -- lets the model/provider be swapped via config, not code.
- **Recommended default model (at future activation):** `z-ai/glm-4.5-air` via OpenRouter, with `qwen/qwen3-14b` as fallback -- both are cents-per-million-token tiers appropriate for short market-summary tasks. Explicitly not GLM-5.2 (a real, current frontier flagship, but priced and scoped for agentic coding, not this use case).
- **Grounding:** use OpenRouter's built-in `:online` suffix / `plugins: [{id:"web"}]` (falls back to Exa search, ~$0.005/request) rather than integrating a separate search API -- cheapest and simplest path, works uniformly across model choices.
- **Access path (no backend, but a key must be hidden somewhere):** recommended is a minimal Cloudflare Workers proxy (free tier: 100k requests/day) holding the API key as a Worker secret; app sends unauthenticated requests to the Worker, Worker injects the key server-side. Alternative/advanced mode: bring-your-own-key stored in `localStorage`, sent directly from the browser (viable since most providers allow CORS from arbitrary origins) -- higher friction for a non-technical corretor, but zero infrastructure. Design the adapter to support both.
- **Estimated cost per query at activation:** well under $0.01 (tokens + grounding combined) -- financially irrelevant at the low-volume, opt-in usage this feature implies.
- **v2.0 deliverable:** only the `AI_CONFIG` object + `pesquisarMercadoIA()` stub exactly as scoped in ARCHITECTURE.md section 4 -- inert, no CDN script tag, no UI.

## Implications for Roadmap

Based on combined research, the dependency-ordered build sequence is clear and low-ambiguity -- this is a rare case where the architecture research essentially already produced a build order (validated against pitfalls and features research, no contradictions found):

### Phase 1: Static Bairro Dataset + Doc Correction
**Rationale:** Everything downstream (home screen rendering, click-to-drill) needs real bairro shapes to render into; building this first also forces the join-integrity and pagination-completeness verification before any UI code depends on the wrong assumption.
**Delivers:** A committed, pre-simplified, WGS84-converted static GeoJSON asset (bairro polygons), generated by a one-time offline script; corrected documentation in `PROJETO-radar.md`/`ROADMAP-radar.md` reflecting the `returnGeometry=true` finding.
**Addresses:** Progressive disclosure by zoom (FEATURES.md P1); the endpoint-fragility architecture decision (never live-fetch bairros).
**Avoids:** Pitfall 2 (502-under-load from live bairro fetch); Pitfall 1 (UTM/coordinate-order regression -- verify with an irregular bairro shape at this stage, before any rendering code exists to hide the bug).

### Phase 2: Home = Map (view-state restructuring)
**Rationale:** Should land after Phase 1 so the new home screen has real content, not an empty map; is a low-risk additive change to an already-proven two-state toggle.
**Delivers:** `data-view` defaults to a map-first home on boot; a persistent floating search card/pill on top of the map that reuses the existing full-screen search panel via `setView('busca')`; desktop layout unchanged (side-by-side panel stays).
**Addresses:** "Search remains reachable at all times" (FEATURES.md table stakes); "busca vira card" without becoming hidden (explicit dependency-conflict warning in FEATURES.md).
**Avoids:** The UX pitfall of demoting search into an undiscoverable menu.

### Phase 3: Bairro Rendering + Hover/Tap + Click-to-Drill
**Rationale:** Depends on Phases 1 and 2 (needs data and a screen to render into); this is where the "already works" finding pays off -- `refreshLots()`'s zoom>=17 gate and `mostrarBairro()`'s `fitBounds` logic are reused, not rebuilt.
**Delivers:** Bairro polygons rendered at city zoom; unified hover(desktop)/tap(mobile) highlight-and-reveal-name function (one code path, gated by touch detection); click/tap-to-drill via `fitBounds`, confirmed to correctly trigger the existing lot-reveal machinery when originating from a bairro click rather than manual pinch-zoom.
**Addresses:** FEATURES.md P1 items -- hover/tap highlight, click-to-drill, on-demand lot fetch (already built, being exposed).
**Avoids:** Pitfall 4 (naive full-lot rendering -- explicitly verify the existing gate still holds); Pitfall 8 (accessibility/LGPD -- reuse existing field allow-list for any new hover/tap detail card, grep for `dtnascimen` after this phase).

### Phase 4: Satellite Layer Toggle
**Rationale:** Fully independent of Phases 1-3 (a second `L.tileLayer` + a button) -- can be built in parallel, but its licensing decision (see Open Decisions) should be resolved before this phase starts, not discovered mid-implementation.
**Delivers:** Streets/satellite toggle with label-legibility treatment shipped in the same commit (never as an afterthought); `sw.js` CDN allowlist and cache version updated; satellite tiles explicitly excluded from cache-first SW storage.
**Addresses:** FEATURES.md P1 "streets/satellite toggle + label legibility."
**Avoids:** Pitfall 6 (satellite licensing/ToS) and the PWA-cache-storage-ballooning performance trap.

### Phase 5: AI Seam (dormant scaffold)
**Rationale:** Fully independent, zero risk to sequence relative to any other phase -- can be built any time, even first, since it has no UI and no runtime effect.
**Delivers:** `AI_CONFIG` object + `pesquisarMercadoIA()` stub, isolated in its own `<script>` tag, `enabled:false`, zero CDN dependency.
**Addresses:** PROJECT.md's explicit "seam plugavel e desativado" requirement.
**Avoids:** Pitfall 9 (AI-seam coupling/secrets) -- verified via a "delete the module, core still works" test before merge.

### Phase 6: Motion Pass (transitions, sheet, stagger)
**Rationale:** Deliberately last -- animating view transitions and render layers that don't structurally exist yet (Phases 2-3) is wasted, throwaway work; motion should wrap finished structure, not precede it.
**Delivers:** Motion (motion.dev) added via CDN; `flyTo` easing coordination via `moveend` callbacks; bottom-sheet spring physics; card/lot-polygon stagger-in; breadcrumb trail and streets/satellite crossfade as v2.0.x polish.
**Uses:** Motion (motion.dev) 12.x, native CSS `prefers-reduced-motion`.
**Avoids:** Pitfall 5 (motion without reduced-motion support, or motion that blocks the interaction critical path) -- bake both the reduced-motion media query and the decorative-vs-functional distinction into the first motion commit.

### Phase Ordering Rationale

- Data (Phase 1) before rendering (Phase 3) before motion (Phase 6) is the one hard dependency chain in this milestone -- everything else (satellite, AI seam) is parallelizable filler that de-risks nothing structurally but keeps momentum.
- Phase 3's low apparent complexity is intentional and accurate, not optimistic: the architecture research's core finding is that the lot-reveal machinery already exists in production; this phase is substantially an integration/verification task, not new construction.
- Motion last is the single most important sequencing call from PITFALLS.md and STACK.md's version compatibility notes combined -- animating a transition before its target states are stable means redoing the motion work when the structure changes underneath it.

### Research Flags

Needs deeper research or explicit verification during phase planning:
- **Phase 1:** the bairro-count/pagination-completeness check (is 1,206 the true total, or an unstated ArcGIS page-size default?) and the bairro-id vs. `cdbairro` join-integrity question -- both flagged as open in ARCHITECTURE.md, not yet resolved by desk research alone.
- **Phase 4:** satellite provider licensing decision is unresolved (see Open Decisions) -- must be closed before this phase's implementation starts, not treated as a research-phase task once coding begins.

Phases with standard, well-documented patterns (skip /gsd-research-phase):
- **Phase 2:** extending an existing 2-state toggle is a well-understood, low-risk pattern already proven in this exact codebase.
- **Phase 3:** the render/interaction pattern (hover/tap highlight, click-to-zoom-and-drill) is extensively cross-verified against Regrid/Zillow/GeoSampa in FEATURES.md; the underlying data machinery already exists and is documented in ARCHITECTURE.md with exact line references.
- **Phase 5:** the AI-seam shape is fully specified (code sketch, config shape, activation checklist) in both ARCHITECTURE.md and AI-MODELS.md -- no further research needed until actual activation (a future milestone).
- **Phase 6:** Motion's CDN usage, `prefers-reduced-motion` pattern, and coordination approach with Leaflet's `flyTo` are all concretely documented in STACK.md with working code snippets.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Leaflet/MapLibre benchmark crossover, Motion's WAAPI/CDN behavior, and Esri tile mechanics all verified against official docs or primary sources; only the Goiania-own-orthophoto CRS integration is untested-in-practice (correctly scoped as Phase-2/stretch, not blocking) |
| Features | MEDIUM-HIGH | Patterns cross-verified across Regrid, Zillow, Mapbox/Leaflet official docs, GeoSampa, mapuipatterns.com; performance findings (polygon-count thresholds) are HIGH confidence from Leaflet maintainer/community sources |
| Architecture | HIGH | Geometry-sourcing and current-app-structure claims verified live against the production ArcGIS server and by direct reading of `radar-goiania.html` -- this is the strongest-evidence research track in this milestone and the one that most changed the milestone's risk profile |
| Pitfalls | HIGH for endpoint/reprojection/LGPD (grounded in this repo's own validated facts and history); MEDIUM for satellite-licensing specifics (official ToS read, but the "does a corretor's work tool count as commercial" judgment call is explicitly not resolvable by desk research alone) |

**Overall confidence:** HIGH -- the milestone's biggest technical uncertainty (does lot/bairro geometry exist and work) was resolved by live verification, not left as an assumption. Remaining gaps are narrow, enumerable, and listed below rather than diffuse.

### Gaps to Address -- Open Decisions for the User

These are not settled by research and need an explicit decision before or during the relevant phase:

1. **Satellite tile provider licensing.** STACK.md's "commercial use permitted" read of Esri World Imagery and PITFALLS.md's "non-commercial free tier" flag are in tension. This is a judgment call for a corretor's (commercial, work-tool) use case that desk research cannot fully resolve. Options to decide among: (a) confirm Esri's ArcGIS Location Platform terms explicitly cover this use case and proceed with Esri as planned; (b) choose an alternative with unambiguous commercial licensing (Mapbox Satellite, smaller free tier but clearer terms, at the cost of a second geo vendor/token); (c) pursue Goiania's own orthophoto layer (`Mapa_Ortofoto2016v2` or newer) on the same ArcGIS server already used for cadastral data -- same-origin, no new vendor, but requires building an untested custom Leaflet CRS for its EPSG:31982 tile grid (Phase-2/stretch effort, not v2.0-ready). Recommend resolving this before Phase 4 starts.
2. **Esri API key signup** (if option (a) above is chosen) -- needs to be created in the ArcGIS developer console, scoped to "Basemaps," referrer-restricted to the deployed domain(s). Not a research gap, but an action item with a dependency on decision #1.
3. **Bairro (layer 2, `nm_bai`/`id`) vs. setor cadastral (`cdbairro` on layer 3) join integrity** -- 709 `cdbairro` codes vs. 1,206 layer-2 polygons is an unresolved discrepancy. Mitigated architecturally (viewport/envelope query sidesteps needing an explicit join), but should still be verified/documented during Phase 1 so it doesn't surprise a future feature that does need the explicit mapping.
4. **Zoom thresholds need empirical testing on real devices.** The existing zoom>=17 lot-reveal gate is proven in production for the current UI, but bairro-click-originated camera transitions (Phase 3) and satellite label-legibility thresholds (Phase 4) are new interaction paths -- confirm on a genuine mid/low-end Android under real 4G, not just desktop DevTools emulation, before locking in specific zoom-level constants.
5. **Live-verify the layer-3 `returnGeometry=true` behavior again at implementation time** -- confirmed today (2026-07-04) but this is undocumented, unversioned server behavior on a third-party endpoint with no SLA; don't treat it as permanently guaranteed.
6. **Bairro dataset completeness** -- confirm the 1,206-feature count for layer 2 isn't itself silently paginated/truncated by an ArcGIS default page size; validate with explicit pagination in the build script.

## Sources

### Primary (HIGH confidence)
- Live ArcGIS server queries against `Feature_Base/MapServer/{0,1,2,3}` -- direct verification, 2026-07-04 (ARCHITECTURE.md sections 0-1)
- `radar-goiania.html` source read directly (proj4/`toWGS()`, `LOTSVC`/`BAISVC`, `refreshLots()`, `mostrarBairro()`, `setView()`, AI-seam placement) -- ARCHITECTURE.md, PITFALLS.md
- `sw.js` source read directly (CDN allowlist, cache strategy) -- PITFALLS.md
- Leaflet official docs/changelog, MapLibre official docs and roadmap discussions, Motion (motion.dev) official quick-start docs -- STACK.md
- Google Maps Platform Tile API Policies and ToS, Esri Web Site and Service Terms of Use -- PITFALLS.md, STACK.md
- Z.ai/DeepSeek/Google official pricing docs, OpenRouter official docs (web search plugin), Cloudflare Workers official pricing/limits -- AI-MODELS.md
- `.planning/PROJECT.md`, `PROJETO-radar.md`, `ROADMAP-radar.md`, `INTELIGENCIA-radar.md` -- project context, existing documented quirks (one of which is corrected by this research)

### Secondary (MEDIUM confidence)
- MDPI 2025 vector-rendering benchmark (Leaflet vs. MapLibre crossover point) -- corroborated by independent blog sources, full paper behind a paywall
- Regrid, Zillow, GeoSampa product/marketing pages and municipal portal descriptions -- FEATURES.md
- Esri ArcGIS Location Platform pricing/FAQ -- commercial-use judgment call explicitly flagged as requiring case-specific interpretation, not a clean HIGH-confidence fact
- Qwen/GLM model naming and pricing via WebSearch, not cross-checked against every vendor's own pricing page directly -- AI-MODELS.md

### Tertiary (LOW confidence, flagged for validation)
- Goiania's own orthophoto tile service (EPSG:31982 CRS integration) -- verified structurally via ArcGIS REST catalog, but untested in practice; correctly scoped as stretch/Phase-2, not a v2.0 dependency
- Anime.js v4 size/performance claims -- single-pass search, not independently benchmarked

---
*Research completed: 2026-07-04*
*Ready for roadmap: yes*
