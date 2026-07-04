# Stack Research

**Domain:** Map-first redesign of a single-file, no-build, CDN-loaded PWA (cadastral/real-estate lookup tool for Goiânia)
**Researched:** 2026-07-04
**Confidence:** HIGH (map rendering, motion), HIGH (satellite licensing — Esri/Google/Mapbox terms directly sourced), MEDIUM (Goiânia's own orthophoto tile service — verified structurally via ArcGIS REST catalog, but CRS-grid integration is untested in practice)

## Executive Recommendation (one paragraph per area)

1. **Map rendering: stay on Leaflet 1.9.4.** Do not migrate to MapLibre GL JS. At the actual data scale (709 bairro outlines city-wide; hundreds-to-low-thousands of lot polygons per bairro, never all 310k at once), Leaflet's SVG/Canvas renderer is not a bottleneck — published benchmarks put the Leaflet/MapLibre crossover point around 10,000–50,000 features, an order of magnitude above what this app ever renders per view. MapLibre would cost ~210–750 KB gzipped of new dependency, forces a second coordinate pipeline (it only renders Web Mercator natively — no plug-and-play arbitrary-CRS support like Leaflet has), and buys nothing at this scale.
2. **Motion: adopt Motion (motion.dev, formerly "Motion One") via CDN, layered on top of the CSS transitions already in the app.** It is small (~5-18 KB gzipped depending on features used, vs GSAP's ~60-70 KB core or Anime.js's larger footprint before tree-shaking), ships a UMD global build usable with a plain `<script>` tag (no build step), animates real transform/opacity properties off the main thread via the Web Animations API for 60fps on mobile, and has a first-class `useReducedMotion`-equivalent pattern for `prefers-reduced-motion`. GSAP going fully free (April 2025) removes the licensing objection but not the size/scope mismatch — GSAP's strength (timelines, ScrollTrigger, SplitText) is overkill for fly-to/stagger/sheet motion.
3. **Satellite: use Esri World Imagery as the primary satellite layer**, added as a second Leaflet `TileLayer` (standard Web Mercator XYZ, no reprojection needed) toggled alongside the existing CARTO layer. It is free up to 2,000,000 tiles/month with a referrer-restricted API key (safe to embed client-side, no backend needed), commercial use is permitted under the ArcGIS Location Platform terms, and attribution is a static string. Google Maps satellite is a hard no (ToS explicitly forbids direct tile access and forbids the offline caching this PWA already does). Mapbox Satellite works but requires embedding a token with a smaller free tier (200k tile requests/month) and no material image-quality gain over Esri for Goiânia. Goiânia's own orthophoto layers exist on the *same* ArcGIS server already used for cadastral data (`Mapa_Ortofoto2016v2`, etc.) — same-origin, zero new CORS/CDN dependency, and likely more current/higher-resolution locally — but they are cached in EPSG:31982, not Web Mercator, which means they cannot be dropped in as a standard `L.tileLayer`; they need a custom Leaflet CRS (origin + resolutions per zoom) or Proj4Leaflet (unmaintained since 2017). Flag as a documented Phase-2/stretch option, not Phase-1 default.

---

## Recommended Stack

### Core Technologies (map)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Leaflet | 1.9.4 (current stable; 2.0 is alpha-only, ESM-first, drops legacy globals — not yet suitable for a no-build single file) | Map rendering, pan/zoom, GeoJSON layers, tile layers | Already in the app; SVG/Canvas rendering is fast enough at this app's real scale (hundreds–low thousands of polygons per view, not tens of thousands); zero migration risk to the validated proj4 pipeline |
| proj4js | 2.20.9 (current; app currently pins 2.11.0 — safe, low-risk bump) | Reproject EPSG:31982 (SIRGAS2000/UTM 22S) → WGS84 before handing coordinates to Leaflet | Already validated in the app; both bairro GeoJSON and lot `x_coord`/`y_coord` fields are in the same CRS, so one reprojection function serves both the existing pin-drop and the new polygon layers |
| Leaflet's built-in `L.geoJSON` + `preferCanvas: true` on the map | n/a (built-in) | Render bairro outlines and lot polygons | Canvas renderer batches paths into far fewer DOM nodes than SVG (SVG creates one DOM element per shape — costly for hover-heavy UIs on mobile); canvas is the standard Leaflet answer for "many polygons, need it smooth on mobile" |

### Core Technologies (motion)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Motion (motion.dev) | latest (12.x line as of mid-2026; pin a specific version, don't track `@latest` in production) | Page/route transitions, bottom-sheet drag/spring, card stagger, `map.flyTo` easing coordination | Smallest full-featured animation engine tested (tree-shakeable ESM; UMD global build for zero-build usage); uses native Web Animations API under the hood → animations run on the compositor thread, stay smooth on 4G/low-end Android; built-in spring physics good for bottom-sheets |
| Native CSS transitions/`@media (prefers-reduced-motion: reduce)` | n/a (browser-native) | Keep existing lightweight hover/focus transitions; global motion kill-switch | Already present in the app (no regression); CSS is the correct tool for simple state transitions and costs nothing to load |

### Core Technologies (satellite)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Esri World Imagery (ArcGIS Location Platform basemap tiles) | Current service (`ibasemaps-api.arcgis.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}?token=...`) | Satellite/aerial toggle layer | Standard Web Mercator tiles — drop-in `L.tileLayer`, no new CRS work; 2M tiles/month free; referrer-restricted key is safe to embed in a public single HTML file; commercial use permitted |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| esri-leaflet | NOT recommended as a dependency | Would simplify Esri tile layer setup | Skip it — a plain `L.tileLayer(url, {attribution})` with the Esri XYZ URL does the same job with zero extra KB; esri-leaflet's value is for dynamic MapServer queries/geometry service, which this app doesn't need for a basemap |
| Proj4Leaflet | 1.0.1 (2017) — **do not use** | Would let Leaflet natively understand EPSG:31982 tile grids | Unmaintained since 2017, documented against Leaflet 1.0.3, not verified against 1.9.x. If the Goiânia orthophoto (EPSG:31982-tiled) is pursued later, hand-roll a minimal custom `L.CRS` (define `origin` + `resolutions` array per zoom level, read from the MapServer's own tileInfo JSON) rather than depend on this stale plugin. |
| Mapbox GL JS / Mapbox Satellite | n/a | Alternative satellite source | Only if Esri image currency/resolution proves inadequate for Goiânia and the team accepts embedding a Mapbox access token (public but rate/domain-restrictable) and the smaller 200k-tiles/month free allotment |
| Goiânia `Mapa_Ortofoto2016v2` (or newer) MapServer tiles | Server-side, versioned by the Prefeitura | Same-origin, potentially higher-res local satellite alternative | Phase-2/stretch: only after building/testing a custom Leaflet CRS for the EPSG:31982 tile grid; verify current orthophoto year against Esri's currency for Goiânia before investing the effort |

## Installation

No package manager — everything loads via `<script>`/`<link>` tags in the single HTML file, same pattern as the current Leaflet/proj4 setup.

```html
<!-- Already in the app (bump patch version) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/proj4@2.20.9/dist/proj4.js"></script>

<!-- New: Motion, UMD global build (pin exact version once chosen, avoid @latest in shipped code) -->
<script src="https://cdn.jsdelivr.net/npm/motion@12/dist/motion.js"></script>
<script>
  const { animate, stagger, spring } = Motion; // global exposed by the UMD build
</script>

<!-- New: Esri World Imagery — no separate library, just a second L.tileLayer -->
<script>
  const esriImagery = L.tileLayer(
    'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=' + ESRI_API_KEY,
    {
      maxZoom: 19,
      attribution: 'Powered by Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    }
  );
</script>
```

The `ESRI_API_KEY` should be created in the free ArcGIS developer console, scoped to "Basemaps" only, and restricted by HTTP referrer to the app's deployed domain(s) (e.g. GitHub Pages URL + `localhost` for dev). This is the standard, Esri-documented pattern for public client-only apps — the key is not a secret, it's a usage-scoping token, comparable in risk profile to a Google Maps browser key.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Leaflet 1.9.4 (stay) | MapLibre GL JS (5.x) | If the roadmap later adds city-wide simultaneous rendering of tens of thousands of lots (not per-bairro), or true vector-tile basemaps become a requirement; today's per-view polygon counts don't justify the WebGL engine, the bundle-size cost, or rebuilding the CRS pipeline |
| Motion (motion.dev) | GSAP 3.x (now 100% free incl. all Club plugins, ~60-70 KB core) | If the roadmap later wants scroll-driven storytelling, SVG line-drawing, or complex multi-step timelines with fine-grained sequencing controls — GSAP's timeline API is more powerful there. Not justified for the current motion scope (transitions, sheet, stagger, fly-to). |
| Motion (motion.dev) | Anime.js v4 (~3 KB WAAPI-only / ~10 KB full) | If bundle size must be pushed even lower and Motion's spring/gesture helpers aren't needed — Anime.js v4 is comparably small and CDN-friendly via ESM (`+esm` on jsdelivr), but has a smaller community/plugin ecosystem and a 2025 v4 rewrite with less battle-testing than Motion |
| Esri World Imagery | Mapbox Satellite | If image currency in Goiânia is materially better on Mapbox, or if the team already needs a Mapbox account for another reason. Otherwise avoid — smaller free tier (200k vs 2M tiles/mo) and adds a second geo vendor/token to manage |
| Esri World Imagery | Goiânia `Mapa_Ortofoto*` (own ArcGIS server) | If/when a developer has time to build and test a custom Leaflet CRS for the EPSG:31982 tile grid — reward is same-origin (no new vendor), no rate-limited token, and potentially better local resolution/currency. Don't block v2.0 ship on this. |
| — | Bing/Azure Maps Imagery | Not recommended at all: requires an Azure Maps account + key, ToS is comparable-or-stricter than Esri with less generous free tier for a hobby/small-business app, and offers no clear advantage over Esri for this use case |
| — | ESA Sentinel-2 | Not recommended: 10 m resolution is far too coarse for parcel-level satellite viewing (lots are frequently <500 m² — a Sentinel pixel is 100 m²); Sentinel is for regional/environmental analysis, not property inspection |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Google Maps satellite tiles (direct tile URL or JS API tile caching) | ToS explicitly prohibits accessing map tiles/imagery through any channel other than the official Google Maps JS API, and separately prohibits "unauthorized caching" — which conflicts directly with this app's service-worker PWA caching of the map layer | Esri World Imagery |
| MapLibre GL JS as a Leaflet replacement | ~210–750 KB gzipped new dependency; native rendering is Web-Mercator-only (no arbitrary-CRS support today — it's still on MapLibre's roadmap), so the EPSG:31982 pipeline would still need external reprojection anyway, with none of the "vector tiles are lighter" benefit since this app's data isn't distributed as vector tiles | Leaflet 1.9.4 (current setup) with `preferCanvas: true` |
| Proj4Leaflet | Last released 2017, documented against Leaflet 1.0.3, unverified on 1.9.x, adds a build-tooled dependency (ships `src`/`lib` split, not a simple CDN drop) for a use case (city's own EPSG:31982 tiles) that is Phase-2 at best | Manual proj4js reprojection of GeoJSON coordinate arrays before feeding plain WGS84 GeoJSON into Leaflet (the pattern the app already uses for lot pins) |
| GSAP as the default motion pick | Not wrong, just oversized for the described motion scope (page transitions, sheet, stagger, fly-to) — core alone is heavier than Motion's tree-shaken build for the same effects, and its power (ScrollTrigger, SplitText, complex timelines) isn't needed here | Motion (motion.dev) |
| Mapbox Satellite as default | Requires an access token with a materially smaller free allotment (200k vs Esri's 2M tiles/month) and introduces a second geo vendor for no incremental capability over Esri for this app | Esri World Imagery |
| `services.arcgisonline.com` legacy (keyless) World Imagery endpoint | Esri has marked the legacy tile endpoints as "mature"/deprecated in favor of the API-key-based `ibasemaps-api.arcgis.com` service; using the legacy URL risks future breakage with no warning, for a one-time key-signup cost avoided today | `ibasemaps-api.arcgis.com` with a free, referrer-restricted API key |

## Stack Patterns by Variant

**If the bairro layer ever needs to render all 709 polygons AND all visible lots simultaneously at city zoom (not just one bairro's lots after click-in):**
- Re-evaluate Canvas renderer load at that combined scale before assuming Leaflet still wins
- Consider a hybrid: keep Leaflet for the UI/interaction shell, but only if a genuine >10k-feature-at-once requirement emerges — not speculatively

**If Motion's UMD global build turns out to conflict with any existing global (`Motion`, `animate`) in the app's inline script:**
- Use the ESM CDN form instead: `import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@12/+esm"` inside a `<script type="module">` block — still zero build step, just requires `type="module"` on that tag

**If the Esri free tier (2M tiles/month) is ever at real risk of being exceeded** (would require sustained heavy traffic well beyond a single corretor's field use):
- Add basic tile-layer zoom-level capping (e.g. `maxZoom` tuned to typical lot-inspection zoom, not full building-level zoom) before considering a paid tier

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| Leaflet 1.9.4 | proj4js 2.20.9 | No direct dependency between them — the app's own reprojection function is the glue; bumping proj4 from 2.11.0 → 2.20.9 is a minor-risk update (same API surface: `proj4(fromDef, toDef, [x,y])`) but should be smoke-tested against the known UTM-zone-22 pin-placement regression before shipping |
| Leaflet 1.9.4 | Leaflet 2.0 (alpha) | Do not adopt 2.0 yet — it drops the bundled global `L` from the core package (ESM-first), which breaks the "just add a script tag" pattern this app depends on; revisit only once 2.0 is stable AND ships a `leaflet-global.js` UMD-style bundle suitable for no-build use |
| Motion (motion.dev) 12.x | Any Leaflet version | No interaction — Motion animates DOM/CSS properties (bottom sheet, cards, page transitions); for map "fly-to" motion, use Leaflet's own `map.flyTo()` (already GPU/requestAnimationFrame-driven) rather than trying to drive Leaflet's internal pan/zoom through Motion — coordinate the two only via callbacks (e.g. `map.flyTo(...).once('moveend', () => animate(...))`) |
| Esri World Imagery tile service | Leaflet 1.9.4 `L.tileLayer` | Standard Web Mercator (EPSG:3857) XYZ scheme — no coordinate conversion needed, unlike the app's cadastral/bairro data pipeline |
| Goiânia `Mapa_Ortofoto*` tiles | Leaflet custom `L.CRS` (not yet built) | Tiles are cached in EPSG:31982 with the MapServer's own `tileInfo.origin`/`lods` (levels of detail) — a working integration requires reading that JSON from the service root and building a matching Leaflet CRS; treat as unproven until prototyped |

## Sources

- WebSearch, verified via MDPI 2025 vector-rendering benchmark (Leaflet 1.9.4 vs MapLibre GL JS 4.7.1: Leaflet/OpenLayers fastest up to ~10,000 polygons/50,000 lines; MapLibre/Mapbox pull ahead only beyond that) — MEDIUM confidence (full paper behind a 403; conclusion corroborated by independent blog sources: jawg.io, bathyl.com)
- MapLibre GL JS official docs (`maplibre.org/maplibre-gl-js/docs/`) — HIGH confidence: confirms Web-Mercator-only native rendering, non-Mercator projection still on roadmap (`maplibre.org/roadmap/maplibre-gl-js/non-mercator-projection/`, GitHub discussion `maplibre/maplibre#163`)
- unpkg.com listing for `maplibre-gl` — HIGH confidence: current version 5.24.0; Bundlephobia — ~750 KB gzip full bundle, ~210 KB gzip minimal (Map + NavigationControl only)
- Leaflet official downloads/changelog (`leafletjs.com/download.html`, GitHub releases) — HIGH confidence: 1.9.4 is current stable; 2.0 is alpha-only (Aug 2025), ESM-first, drops bundled global `L` from core
- Proj4Leaflet GitHub repo — HIGH confidence: last release 1.0.1 (Jan 2017), documented against Leaflet 1.0.3, ships as src/lib (build-tooled), not a simple CDN single-file drop
- Esri Leaflet non-Mercator-projection example/docs (`esri.github.io/esri-leaflet/examples/non-mercator-projection.html`, `developers.arcgis.com/esri-leaflet/samples/non-mercator-projection/`) — HIGH confidence: confirms esri-leaflet/Leaflet only supports Web-Mercator-tiled Esri services out of the box; custom CRS (origin + resolutions) required for anything else
- Esri and Data Attribution official docs (`developers.arcgis.com/documentation/esri-and-data-attribution/`) — HIGH confidence on attribution text requirement ("Powered by Esri" + copyrightText string); did not directly state pricing/commercial terms
- Esri ArcGIS Location Platform pricing/FAQ (`location.arcgis.com/pricing/`, `location.arcgis.com/faq/`) via WebSearch — MEDIUM-HIGH confidence: 2,000,000 free basemap tiles/month, then $0.15/1,000 tiles; commercial deployment license included; referrer-restricted API keys are the Esri-documented pattern for public client-side apps
- Direct WebFetch of `portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_Ortofoto2016v2/MapServer` — HIGH confidence (primary source, same server the app already depends on): confirms cached tile service, EPSG:31982, tile endpoint pattern `/tile/{z}/{y}/{x}`, 17 LODs (zoom 0-16), attribution "Prefeitura de Goiânia"; no CORS headers observed but tiles load as `<img>` src (no CORS needed for image display, only for canvas pixel readback)
- Google Maps Platform Tile API Policies (`developers.google.com/maps/documentation/tile/policies`) and ToS (`cloud.google.com/maps-platform/terms`) via WebSearch — HIGH confidence: explicit prohibition on direct tile access outside official API and on bulk/offline caching
- Mapbox pricing docs (`docs.mapbox.com/accounts/guides/pricing/`) via WebSearch — MEDIUM confidence: 200,000 free raster tile requests/month cited across multiple secondary sources; not cross-checked against Mapbox's own current pricing page directly (fetch not attempted)
- GSAP/Webflow official announcement (`gsap.com/pricing/`, `webflow.com/blog/gsap-becomes-free`) — HIGH confidence: GSAP core + all former Club plugins fully free since April 2025, including commercial use
- Motion (motion.dev) official quick-start docs (`motion.dev/docs/quick-start`) via WebSearch — HIGH confidence: UMD global (`<script src=".../dist/motion.js">` exposing `window.Motion`) and ESM (`+esm` on jsdelivr) both usable with zero build step
- unpkg listing for `motion` package — HIGH confidence: current major version 12.x (12.42.2 observed at research time)
- Anime.js v4 docs/GitHub (`animejs.com/documentation/getting-started/installation/`, `github.com/juliangarnier/anime`) — MEDIUM confidence: v4 modular, 10 KB full / 3 KB WAAPI-only, ESM CDN via jsdelivr `+esm`; less corroborated than Motion's numbers (single-pass search, no independent benchmark cross-check)
- MDN `prefers-reduced-motion` docs (`developer.mozilla.org/.../@media/prefers-reduced-motion`) — HIGH confidence: standard CSS media query + `window.matchMedia` pattern for JS-driven animation gating
- Project files read for context: `.planning/PROJECT.md`, `PROJETO-radar.md`, `INTELIGENCIA-radar.md` (primary source for existing stack pins, EPSG:31982 quirk, and confirmation that the Prefeitura's own bairro GeoJSON is already in the same CRS as the cadastral data)

---
*Stack research for: map-first UI + motion + satellite layer, single-file no-build PWA*
*Researched: 2026-07-04*
