# Feature Research

**Domain:** Map-first real-estate / cadastral parcel-explorer UX (Zillow/Redfin map view, Regrid, GeoSampa/geoportais municipais, ArcGIS/Mapbox web viewers)
**Researched:** 2026-07-04
**Confidence:** MEDIUM-HIGH (patterns cross-verified across Regrid, Zillow, Mapbox/Leaflet official docs, mapuipatterns.com, GeoSampa; performance findings HIGH confidence from Leaflet maintainers/community)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a map-first parcel explorer. Missing these = product feels incomplete or broken vs. Zillow/GeoSampa/Regrid-class expectations.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Progressive disclosure by zoom (city → bairro → lote) | Every parcel viewer studied (Regrid, GeoSampa, ArcGIS) hides lot-level detail until zoomed in; showing 310k lot polygons at city zoom is both unusable and (per Leaflet perf research) technically infeasible without vector tiles | MEDIUM | Matches PROJECT.md's existing plan: bairro outlines at city zoom, lotes revealed only after bairro click/zoom-in. Reuses the app's own "load lots only for the selected setor" pattern already proven in the search flow |
| Click-to-zoom-and-drill on administrative area | Regrid's confirmed pattern: click a boundary → view "shrinks" from a bigger area to the next level down (nation→state→county→city→parcel). This is the direct analog of bairro→quadra→lote | LOW-MEDIUM | Leaflet-native: `layer.on('click', () => map.fitBounds(e.target.getBounds()))`. Already partially exists (mostrarBairro) |
| Desktop hover-highlight + tooltip/label on boundary | Universal in Leaflet choropleth pattern (official Leaflet docs) and Regrid ("cursor moves, parcel polygon highlighted, address shown top-right") | LOW | `mouseover`/`mouseout` + `resetStyle()`; bring hovered layer `.bringToFront()` so highlight border doesn't clip under neighbors |
| Mobile tap equivalent for hover (no true hover on touch) | Confirmed universally: "on touch devices, hover doesn't exist, mouse events must be backed up by touch events" (mapuipatterns.com, UXmatters). First tap = reveal name/highlight; second tap (or a visible "zoom in" affordance) = drill down | LOW-MEDIUM | Two-tap pattern is standard: tap 1 highlights + shows label/popup, tap 2 (or explicit button in popup) confirms zoom-in. Prevents "fat-finger zoomed into wrong bairro" mistakes |
| "You are here" / current-location blue dot | Universal mobile map convention (mapuipatterns.com "Blue Dot" pattern) — accuracy circle, appears on explicit "locate me" tap, not automatic/always-on | LOW | Leaflet has built-in `map.locate()` + `L.circleMarker`. High value for corretor in the field walking a bairro |
| Streets ⇄ satellite layer switcher | Present in every major map product (Mapbox Standard/Satellite, Google/Apple Maps, ArcGIS); Zillow lets users "change the map type" | LOW-MEDIUM | Mapbox docs confirm the sharp edge: switching basemap style can drop custom layers/sources — must re-add bairro/lote overlays on `style.load` (or, since this app uses Leaflet + CARTO/tile layers not full Mapbox styles, simpler: swap `L.tileLayer` and keep the GeoJSON overlay panes untouched — this is actually the SAFER path already available in this stack) |
| Label decluttering tied to zoom | Confirmed pattern (Mapbox label-placement docs, maplibrary.org): fewer labels far out, more as you zoom in; collision detection suppresses overlaps; fade-in transitions of 200-300ms as labels appear | MEDIUM | For bairro names: show only when zoomed enough to have space; for lote/quadra numbers: only inside the drilled-in bairro, never at city zoom |
| Search remains reachable at all times, not just on a dedicated screen | Confirmed via iOS 26 pattern and Google Maps pattern: search bar (top) or FAB co-exists permanently with the map, never fully hidden — because map browsing and directed lookup are both first-class, simultaneous use cases | LOW | Directly relevant: PROJECT.md's "search becomes a clickable card" must still be a persistent, one-tap-reachable affordance, not buried in a menu |
| Smooth fly-to on drill-in (not a hard jump-cut) | Leaflet/Mapbox `flyTo` is the confirmed standard for zoom+pan transitions; jump cuts read as broken/cheap by comparison | LOW | `map.flyTo(latlng, zoom, {duration: ~0.8-1.5s})`. Leaflet's `flyTo` already ships in the version this app uses (1.9.4) |
| Tap/click feedback on interactive polygons | Confirmed as baseline touch-UX expectation (mapuipatterns.com "visual feedback showing where users touched"); also already used in this app's own card `:active{scale(.98)}` pattern per IDEIAS-hub-corretor.md | LOW | Reuse existing app convention — extend it to polygon fill-opacity punch on tap |

### Differentiators (Competitive Advantage)

Features that set this product apart from generic map viewers — should tie back to Core Value (corretor thinks spatially, wants speed + auditable data).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Breadcrumb trail (Goiânia > Bairro > Quadra) always visible while drilled in | Regrid's confirmed differentiator: "breadcrumbs at the top... track your journey, return to a previous zoom level at any time." Generic Leaflet apps rarely have this — most rely on a browser-back mental model, which is worse on mobile | LOW-MEDIUM | Reuses zoom/bounds history already implicit in flyTo calls; just needs a small persistent UI strip. High leverage for corretor who drills deep then wants to jump back to "all Goiânia" in one tap |
| Layer crossfade instead of hard-cut swap between streets/satellite | Most competitors (Google Maps, Zillow) just hard-swap tiles with a flicker. A CSS opacity crossfade between two stacked tile layers reads distinctly more premium and is cheap to build in Leaflet (`opacity` transition on the incoming tile layer, remove outgoing after fade completes) | LOW | Directly serves PROJECT.md's "motion fluido no app todo" requirement. Small effort, disproportionate "premium" payoff — good differentiator given this app's existing polish focus (bottom sheet, laudo redesign) |
| Territory-aware polygon styling ("meu território" outline distinct from generic bairro outline) | Ties the new map-first home directly to the corretor's existing mental model of "his" bairros (already explored in IDEIAS-hub-corretor.md território lens) — no competitor generic map does this because it requires per-user saved state | MEDIUM | Not required for v2.0 MVP per PROJECT.md scope (território tools deferred to v2.1+), but the map-first home is the natural hook point — flag as a light seam (e.g., reserve a style variant) so v2.1 doesn't require re-touching the render pipeline |
| Stagger-in entrance for lote polygons within a drilled bairro | "Premium motion" signal used broadly in modern map/list UX (Material 3 transitions guidance: subtle, not slow); pairs naturally with the app's own card list stagger already proposed in IDEIAS-hub-corretor.md (estetica-confianca lens) | LOW | Apply the SAME stagger timing/easing already chosen for search-result cards — reuse, don't reinvent, keeps app feeling coherent |
| Label-over-satellite legibility treatment (halo/backdrop on bairro names when satellite is active) | Confirmed real problem across all satellite-capable viewers: plain text labels vanish against variable-brightness imagery. A text-halo (dark stroke or subtle background chip) is the standard fix, but many amateur map tools skip it — doing it well is a visible quality signal | LOW-MEDIUM | CSS `text-shadow`/stroke on Leaflet tooltip/label divIcons, or swap label style when satellite layer is active |

### Anti-Features (Commonly Requested, Often Problematic)

Features that look cool in a demo but degrade real usage, especially on the mobile 4G/field-use profile this project targets (per PROJECT.md constraints).

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Render all ~310k lot polygons as GeoJSON at city-wide zoom | "Let's just show everything, it looks impressive" | Confirmed by Leaflet performance research: `L.geoJSON()` gets "painfully slow" past ~10k features; DOM/SVG rendering chokes, and even canvas mode strains past 100k. On 4G/mobile this would freeze the home screen — directly violates PROJECT.md's "motion precisa ser liso no mobile" constraint | Load bairro OUTLINES only at city zoom (few hundred polygons, cheap); fetch and render lote geometry on-demand per bairro only after drill-in, exactly as PROJECT.md already scopes it |
| Continuous/automatic map-following "blue dot" tracking mode | Feels like "real navigation apps do this" | mapuipatterns.com explicitly flags this as needing careful exit design — auto-recentering while the corretor is trying to pan/inspect a neighboring lot fights the user, and drains battery/GPS in the field all day | One-shot "locate me" that centers once, not continuous tracking; corretor is exploring parcels, not navigating a route |
| Full Mapbox-style GL vector basemap swap with re-added custom layers on every style change | "It's the modern way, Mapbox does it" | Mapbox's own docs warn that custom sources/layers are dropped on `setStyle()` and must be manually re-added on `style.load` — adds real complexity and a flash-of-missing-overlay bug risk for a single-HTML-file, no-build project that currently just swaps `L.tileLayer` | Keep Leaflet's simpler model: raster/satellite tile layer swap underneath, GeoJSON overlay panes (bairro/lote) stay mounted and untouched — avoids the entire class of bug for zero benefit given this isn't a Mapbox GL stack |
| Long, cinematic multi-second flyTo on every single interaction (drill-in, drill-out, satellite toggle, search result) | "More motion = more premium" | Real motion-design guidance (Material 3 transitions) explicitly warns that slow transitions read as "frustrating," not premium, once a user has seen it 10 times in a session. A corretor doing rapid-fire lookups in the field will hate a 2s+ animation on every tap | Fast, consistent flyTo (~0.5–1s) for drill navigation; reserve any longer/more expressive animation for true "first impression" moments only (first load, first satellite toggle) |
| Hover-triggered popups/tooltips as the ONLY way to see a bairro name on mobile | Desktop pattern ported "as-is" because it's already built for desktop | No hover exists on touch — confirmed universally. If the only path to see a name is hover, mobile users (the field-use majority per PROJECT.md) get a silently broken feature | Explicit two-tap flow: tap once = label/highlight (hover equivalent), tap again or tap a CTA = drill in. Never assume hover as the sole channel |
| Long-press context menu as PRIMARY discovery mechanism for drill-down | "Long-press is the mobile-native gesture for maps" | True for contextual actions (pin, share, directions) per UX research, but using it as the ONLY way to reveal a bairro's name/enter it makes the core interaction undiscoverable — nothing on screen hints a 500-800ms hold is needed | Long-press reserved for secondary actions (e.g., "salvar como território" later); primary drill-down stays a simple, discoverable single tap |
| Auto-switching to satellite whenever zoomed in past a lote-level threshold | "Satellite is more useful up close, just switch automatically" | Removes user control and causes a jarring, unrequested visual change mid-interaction — user was reading cadastral outlines on a clean basemap and suddenly the ground shifts under them; also breaks the label-over-satellite legibility problem unexpectedly | Streets/satellite stays a deliberate, persistent user toggle; app never overrides it based on zoom |

## Feature Dependencies

```
Progressive disclosure by zoom (bairro outlines → lote polygons)
    └──requires──> On-demand lote fetch per bairro (not city-wide preload)
                       └──requires──> Existing ArcGIS query pattern (already built: cdbairro filter)

Click-to-zoom-and-drill on bairro
    └──requires──> flyTo/fitBounds implementation
    └──enhances──> Breadcrumb trail (breadcrumb needs drill history to display)

Mobile tap-to-reveal-name (two-tap pattern)
    └──requires──> Hover-highlight logic ALREADY built for desktop (reuse same style/highlight function, gate by touch detection)

Streets ⇄ satellite toggle
    └──requires──> Label-over-satellite legibility treatment (satellite makes plain labels unreadable — must ship together, not as an afterthought)
    └──conflicts with──> Full Mapbox GL style-swap approach (keep simple Leaflet tile-layer swap instead)

Layer crossfade (streets↔satellite)
    └──enhances──> Streets ⇄ satellite toggle (visual polish layer on top of the base toggle; toggle works without it, but reads cheap without it)

Search-as-card (moved off home)
    └──requires──> Persistent one-tap search affordance (pill/FAB) so search is never more than 1 tap away, even though map is now home
    └──conflicts with──> Hiding search inside a nested menu (violates the "always reachable" table stakes finding)

Stagger-in entrance for lote polygons on drill-in
    └──enhances──> Progressive disclosure by zoom (cosmetic layer on top; not required for function)

Territory-aware polygon styling (v2.1+ hook)
    └──requires──> Progressive disclosure by zoom (needs the bairro/lote render pipeline to exist first)
    └──enhances──> (future) Painel do Meu Território from IDEIAS-hub-corretor.md — do NOT build now, just avoid architecture that blocks it later
```

### Dependency Notes

- **Progressive disclosure requires on-demand lote fetch:** This is the single most important dependency in this research. The existing app already proves the pattern (querying by `cdbairro`) — v2.0 must extend it to "populate lote layer only after a bairro is entered," not attempt to preload/cache all 310k lots. Skipping this dependency breaks mobile performance outright (see Anti-Features).
- **Mobile tap-to-reveal reuses desktop hover logic:** Don't build two separate interaction systems. Write one `highlightFeature()` / `showLabel()` function triggered by `mouseover` on desktop and by first `click`/`tap` on touch (detect via `'ontouchstart' in window` or pointer events), so behavior and styling stay consistent and there's only one code path to maintain in a single-HTML-file architecture.
- **Satellite toggle and label legibility ship together:** Shipping satellite without fixing label contrast is a visible, embarrassing regression the moment a user taps the toggle — treat it as one feature, not two.
- **Search-as-card conflicts with hiding search:** PROJECT.md's roadmap language ("busca vira card") must not be read as "search becomes hard to find." Research is unanimous (iOS 26, Google Maps, Zillow) that search stays persistently reachable even when a map is the home surface — the card format lives in the map's flow (e.g., a floating pill/FAB that expands to the four-mode search card), not behind an extra navigation step.
- **Territory styling conflicts with nothing today, but should not be built now:** PROJECT.md explicitly defers corretor tools (territory dashboard, etc.) to v2.1+. The only action needed in v2.0 is to not paint the render pipeline into a corner (e.g., keep polygon styling as a function of feature properties, not hardcoded, so a future "isMyTerritory" flag is a trivial style-function branch later).

## MVP Definition

### Launch With (v2.0 — Map-First Core)

Minimum viable version of the map-first home. Directly maps to PROJECT.md's "Active" requirements.

- [ ] City-wide map on load, bairro outlines only (no lotes yet) — validates progressive disclosure is technically sound before adding complexity
- [ ] Desktop hover on bairro → highlight + name label
- [ ] Mobile tap on bairro → highlight + name label (same styling, touch-triggered)
- [ ] Click/tap-again on bairro → flyTo/fitBounds zoom-in + fetch and render that bairro's lote polygons on demand
- [ ] Search moved to a persistent floating card/pill reachable from the map home in one tap (not buried)
- [ ] Streets ⇄ satellite toggle with label-legibility treatment shipped together
- [ ] Basic flyTo easing on all zoom transitions (fast, ~0.5-1s, consistent)
- [ ] Existing per-lot data card/bottom-sheet flow triggers unchanged once a lote is tapped (reuse, don't rebuild)

### Add After Validation (v2.0.x polish)

- [ ] Breadcrumb trail for drill history (Goiânia > Bairro)
- [ ] Streets↔satellite crossfade (opacity transition instead of hard swap)
- [ ] Stagger-in entrance for lote polygons after drill-in
- [ ] "You are here" blue-dot one-shot locate button
- [ ] Label decluttering refinement (collision suppression at intermediate zooms) if bairro names visibly overlap in dense areas of Goiânia

### Future Consideration (v2.1+)

- [ ] Territory-aware polygon styling / "meu território" visual layer — defer until the Território tools themselves are scoped (per PROJECT.md Out of Scope)
- [ ] Heatmap-style value-gradient overlay on lote polygons (from IDEIAS-hub-corretor.md território lens) — depends on the render pipeline from v2.0 already existing, natural v2.1 extension
- [ ] Long-press secondary actions on lote (save/favorite) — defer with território tools

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bairro outlines at city zoom (no lotes) | HIGH | MEDIUM | P1 |
| Hover/tap highlight + name reveal | HIGH | LOW | P1 |
| Click/tap-to-drill with flyTo | HIGH | LOW-MEDIUM | P1 |
| On-demand lote fetch per bairro | HIGH | MEDIUM | P1 |
| Persistent search pill/card | HIGH | LOW | P1 |
| Streets/satellite toggle + label legibility | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Breadcrumb trail | MEDIUM | LOW-MEDIUM | P2 |
| Satellite crossfade polish | MEDIUM | LOW | P2 |
| Stagger-in lote entrance | LOW-MEDIUM | LOW | P2 |
| Blue-dot locate-me | MEDIUM | LOW | P2 |
| Label decluttering/collision refinement | LOW-MEDIUM | MEDIUM | P3 |
| Territory-aware styling hook | LOW (now) / HIGH (v2.1) | LOW (if just a style-function seam) | P3 |

**Priority key:**
- P1: Must have for v2.0 map-first launch
- P2: Should have, adds the "premium motion" feel PROJECT.md asks for
- P3: Nice to have now; real value lands in a later milestone

## Competitor Feature Analysis

| Feature | Zillow map view | Regrid | GeoSampa (São Paulo) | Our Approach |
|---------|------------------|--------|------------------------|--------------|
| Zoom-gated parcel detail | Property lines appear only past a zoom threshold | Explicit Nation→State→County→City→Parcel drill hierarchy with breadcrumbs | Lote layer accessed via a dedicated menu path (Cadastro > Cadastro Fiscal > Lotes), not always-on | Bairro outlines always visible at city zoom; lotes revealed automatically on bairro drill-in (no manual menu digging — lower friction than GeoSampa) |
| Hover/click info | Property lines + boundaries, standard map controls | Cursor hover highlights parcel polygon, address shown top-right; click drills down | Click for "Obtain Layer Information" (i-tool), then click parcel | Hover (desktop) / tap (mobile) both highlight + show name; second interaction drills in — unifies desktop/mobile into one mental model rather than GeoSampa's tool-mode click |
| Layer switching | "Change the map type" control on map | Not a documented differentiator | Standard basemap options common to Brazilian geoportais | Streets/satellite toggle + label legibility + crossfade — more polish than typical municipal geoportal, matches Zillow-tier consumer expectation |
| Navigation history | Standard browser-level zoom/pan, no visible breadcrumb documented | Breadcrumb bar at top tracks drill journey, one-tap return to any level | Not a standard feature in most municipal geoportais researched | Adopt Regrid's breadcrumb pattern — it's the clearest differentiator found in research and cheap relative to its value for a corretor working multiple bairros in one session |
| Motion / transition feel | Standard map library defaults, not a stated differentiator | Not documented as a motion showcase | Municipal portals studied show no evidence of deliberate motion design | This project explicitly treats motion as a differentiator (PROJECT.md "motion fluido") — flyTo easing, crossfade, stagger — positions this above both consumer (Zillow) and municipal (GeoSampa) baselines on polish |

## Sources

- [Zillow.com chooses Digital Map Products to deliver parcel boundary data | LightBox](https://www.lightboxre.com/news/zillow-com-chooses-digital-map-products-deliver-parcel-boundary-data-adding-enhanced-information-online-real-estate-site/) — MEDIUM confidence (industry news, not Zillow official docs)
- [Zillow Neighborhood Boundaries - Zillow Website Tools](https://www.zillow.com/webtools/labs/neighborhood-boundaries.htm) — MEDIUM
- [Regrid: Parcel Data for the U.S. & Canada](https://regrid.com/) and [The Regrid Property App](https://regrid.com/property-app) — MEDIUM (product marketing pages, cross-verified pattern description via search synthesis)
- [Leaflet Interactive Choropleth Map (official example)](https://leafletjs.com/examples/choropleth/) — HIGH confidence (official Leaflet docs, exact code pattern used in this project's stack)
- [Leaflet Documentation Reference](https://leafletjs.com/reference.html) — HIGH
- [Mapbox: Persist sources and layers when switching a map's base style](https://docs.mapbox.com/mapbox-gl-js/example/style-switch/) — HIGH (official Mapbox docs; used to justify the anti-feature warning even though this project uses Leaflet, not Mapbox GL)
- [Mapbox: Slowly fly to a location](https://docs.mapbox.com/mapbox-gl-js/example/flyto-options/) / [Fly to a location](https://docs.mapbox.com/mapbox-gl-js/example/flyto/) — HIGH
- [Mapbox: Optimize map label placement](https://docs.mapbox.com/help/dive-deeper/optimize-map-label-placement/) — HIGH
- [Map UI Patterns — Mobile map](https://mapuipatterns.com/mobile-map/) and [Blue dot](https://mapuipatterns.com/blue-dot/) — MEDIUM-HIGH (specialized UX pattern reference site, cross-verified with UXmatters)
- [Designing for Touch — UXmatters](https://www.uxmatters.com/mt/archives/2020/02/designing-for-touch.php) — MEDIUM
- [Rendering Hundreds of Thousands of Polygons using JS — Medium](https://medium.com/@dipakpatil2615/rendering-hundreds-of-thousands-of-polygons-using-js-because-gis-deserves-modern-visualization-e27d678dccca) — MEDIUM (single author, but consistent with Leaflet community consensus)
- [Leaflet & GeoJson Tiles — GetBounds blog](https://www.getbounds.com/blog/leaflet-and-geojson-tiles/) — MEDIUM
- [A Leaflet Developer's Guide to High-Performance Map Visualizations — Andrej Gajdos](https://andrejgajdos.com/leaflet-developer-guide-to-high-performance-map-visualizations-in-react/) — MEDIUM
- [GeoSampa — Prefeitura de São Paulo, visualização de lotes](https://prefeitura.sp.gov.br/w/noticia/geosampa-prefeitura-disponibiliza-a-visualizacao-de-lotes-no-mapa-digital) — MEDIUM-HIGH (official municipal source, directly comparable Brazilian cadastre pattern)
- [Material Design 3 — Applying transitions](https://m3.material.io/styles/motion/transitions/applying-transitions) — HIGH (official design system docs)
- [Bottom Sheet UI Design — Mobbin](https://mobbin.com/glossary/bottom-sheet) — MEDIUM
- [ArcGIS Developer — Zoom levels and scale](https://developers.arcgis.com/documentation/mapping-and-location-services/reference/zoom-levels-and-scale/) — HIGH docs, but LOW value for this specific question (no explicit parcel-vs-neighborhood zoom table found; flagged as a gap below)
- Project-internal: `.planning/PROJECT.md` and `IDEIAS-hub-corretor.md` (existing app architecture, EPSG:31982 constraint, existing UX lens research on campo-unico/primeiro-uso/estetica-confianca)

---
*Feature research for: map-first real-estate/parcel exploration UX*
*Researched: 2026-07-04*
