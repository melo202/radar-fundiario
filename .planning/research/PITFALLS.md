# Pitfalls Research

**Domain:** Map-first redesign (MapLibre/vector tiles + motion + satellite) of a single-file, no-build, offline-capable PWA over a fragile public ArcGIS endpoint (Radar Fundiário Goiânia, v2.0)
**Researched:** 2026-07-04
**Confidence:** HIGH for endpoint/reprojection/LGPD (grounded in this repo's own validated facts); MEDIUM for MapLibre/motion/satellite specifics (verified against official docs/ToS); LOW flagged explicitly where only general web knowledge applies.

## Critical Pitfalls

### Pitfall 1: UTM zone regression re-introduced by the new map engine

**What goes wrong:**
The app already suffered this exact bug once: EPSG:31982 is SIRGAS2000/UTM **zone 22** South, but the "31982" code number tempts a zone-23 guess, producing a ~6° longitude error ("pin in Bahia"). Any new map engine (MapLibre, vector tile pipeline, a GeoJSON preprocessing script for bairros/lots) is a fresh place to reintroduce this — e.g., trusting a `spatialReference.wkid` from the ArcGIS response instead of the app's own hardcoded proj4 string, using a generic "UTM Brazil" library default, or having a build/conversion script (converting bairro GeoJSON or lot polygons to WGS84 ahead of time) use a different UTM-zone lookup than the live `toWGS()` in the running app.

**Why it happens:** EPSG code numbers don't self-describe zone number; multiple tools/libraries "auto-detect" UTM zone from a bounding box or from metadata that can be wrong or absent; a new codepath (bairro polygon loader) is easy to write independently of the existing, already-correct `toWGS()` and not share the single source of truth.

**How to avoid:**
- Reuse the **existing** `proj4.defs("EPSG:31982", "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")` and the existing `toWGS(x,y)` helper (radar-goiania.html lines 568-569) for every new geometry pipeline — bairro polygons, lot polygons, any offline-preprocessed GeoJSON. Never redefine the projection string in a second place.
- If bairro/lot GeoJSON is pre-converted to WGS84 by an offline script (Node, Python) before shipping as a static asset, that script must import/paste the **identical** proj4 string, not re-derive it. Put the projection string in exactly one place (a shared constant/comment) and reference it from both the live app and any build script.
- Write one automated regression test (per item 18 in ROADMAP-radar.md, still open): feed a known ArcGIS `x_coord`/`y_coord` pair with a known correct lat/lng, assert output within a small epsilon. Run this test against every new geometry-handling code path, not just the point-search path.
- If MapLibre or a vector-tile toolchain (tippecanoe, etc.) is introduced, verify whether it expects EPSG:4326 GeoJSON input already (most vector tile specs — e.g., Mapbox Vector Tile — assume WGS84/Web Mercator, not UTM) — the reprojection must happen once, upstream, using the verified helper, before any tile-building step.

**Warning signs:** A newly added bairro or lot polygon renders visibly offset from the correctly-plotted point markers on the same map; any polygon whose centroid, checked against a known landmark, is off by whole degrees; a second `proj4.defs` call anywhere in the codebase or in a build script.

**Phase to address:** The phase that introduces bairro/lot polygon data (likely "Home map + bairro layer") — before any polygon ships, not after visual QA catches it.

---

### Pitfall 2: GeoJSON coordinate order flip (lng/lat vs lat/lng)

**What goes wrong:** GeoJSON spec mandates `[longitude, latitude]` order, but Leaflet's `L.latLng` and most of this app's internal code (`toWGS` returns `[lat, lon]`, matching Leaflet's convention) use `[lat, lng]`. Introducing GeoJSON bairro/lot polygons (from the Prefeitura's open-data portal, already in EPSG:31982 per PROJECT.md) means at least one coordinate-order flip has to happen correctly, and a second flip (double negation) is a classic invisible bug: the map still renders, just mirrored or offset, and it's easy to mistake for a UTM-zone bug rather than an axis-order bug.

**Why it happens:** Leaflet, MapLibre style-spec sources, Turf.js, and raw GeoJSON each have different conventions; `toWGS()` already flips to `[lat, lon]` for Leaflet's sake, so feeding its output directly into a `Feature.geometry.coordinates` array (which needs `[lon, lat]`) silently swaps the axes again.

**How to avoid:**
- Decide one canonical order for the app's *own* new bairro/lot polygon representation and document it in a code comment next to `toWGS()`. Recommendation: keep raw GeoJSON (from the Prefeitura's open-data CKAN export) in `[lon, lat]` internally (GeoJSON-native), and only flip to `[lat, lon]` at the moment of constructing a Leaflet/MapLibre-specific object — the same seam that already exists in the point-search code.
- When writing the UTM→WGS84 conversion for polygon **rings** (not just single points), loop the same tested `proj4(...)` call per vertex and immediately verify against a known bairro's visible shape on the existing correct basemap before shipping.
- Never manually write `[lat, lon]` where a library expects `[lon, lat]` "because it looked right in one test" — verify against at least two non-square, non-symmetric bairros (symmetric shapes hide axis swaps).

**Warning signs:** A bairro polygon appears mirrored across the equator/central-meridian-ish axis relative to its real location; polygon renders correctly at one zoom/pan but "rotates" oddly when the map is dragged (classic sign of swapped axes combined with a projection that isn't purely affine); QA on an irregular-shaped bairro (not a rectangle) looks subtly wrong.

**Phase to address:** Same phase as Pitfall 1 (bairro/lot polygon ingestion) — test coordinate order the same day the projection is verified, using the same test bairro.

---

### Pitfall 3: Migrating to MapLibre breaks the existing PWA/service worker cache contract

**What goes wrong:** The current `sw.js` (already in the repo) hardcodes a CDN allowlist (`cdnjs.cloudflare.com`) and a `CACHE = "radar-v3"` versioned cache with an explicit `LOCAL`/`CDN` asset list. Swapping Leaflet for MapLibre — which is now **ESM-only** in recent releases (UMD/CSP bundles like `maplibre-gl.js`/`maplibre-gl-csp.js` were dropped) — changes the script tag pattern, may add a new CDN origin (unpkg/jsdelivr for MapLibre GL JS + CSS, or a vector tile source), and introduces MapLibre's own **Web Worker** (for tile parsing) which the service worker doesn't know how to handle. If the new CDN host isn't added to the `cdn` allowlist check in `sw.js` fetch handler, those requests silently fall through the `if (!sameOrigin && !cdn) return;` early-return and are never cached — meaning offline mode (a stated existing PWA feature) breaks for the map library itself with no error, just a blank/broken map when offline.

**Why it happens:** The service worker's CDN allowlist is a hardcoded hostname string; adding a library from a different CDN (unpkg.com, jsdelivr.net) is invisible to it. MapLibre's worker (spawned via `new Worker(URL.createObjectURL(blob))` internally) needs `worker-src blob:` in CSP, which this app doesn't currently set explicitly (relying on default/no CSP) — but if a CSP meta tag is ever added later for hardening, it will break MapLibre silently with a console-only error most manual mobile QA won't see.

**How to avoid:**
- If MapLibre GL JS is adopted, use the **same CDN host already allowlisted** where possible, or explicitly add the new host to both `sw.js`'s `CDN` array and the `cdn` boolean check (`url.hostname === "cdnjs.cloudflare.com"` needs an `||` for the new host).
- Bump `CACHE` version string (`radar-v3` → `radar-v4`) whenever the asset list changes — the existing `activate` handler already purges old caches, but only if the constant changes; forgetting this means users' old service worker keeps serving stale Leaflet assets after deploy.
- If ESM-only MapLibre is used, confirm the CDN URL is the `.mjs` bundle and that the app's inline `<script>` uses `type="module"` — mixing a `type="module"` script with the rest of the app's inline non-module script may change execution order/timing (modules are deferred by default), which can matter for this app's existing "CDN guard" check (`if(!window.L||!window.proj4){...}` at line 1803) — an equivalent `window.maplibregl` guard must run *after* the module has actually executed, not assume synchronous load like the current Leaflet check does.
- Test the full offline flow manually after migration: load once online, go offline (airplane mode), reload — map library and CSS must still initialize from cache. This is exactly the kind of regression manual QA on desktop (with dev tools "always online") will miss.
- Consider keeping Leaflet for the base map and only adding MapLibre (or `maplibre-gl-leaflet` binding) as an additive vector/satellite layer, rather than a full rip-and-replace — this preserves the entire existing, tested Leaflet+proj4+bottom-sheet+PWA integration and scopes the new engine's blast radius to just the new bairro/lot/satellite layers. (MapLibre's own Leaflet migration guide exists for full swaps if that's still the chosen path, but a full swap re-touches every map interaction the app already has working: click-to-identify, bounds-based fetch, marker popups.)

**Warning signs:** App works fine in normal browsing but shows a blank map (or Leaflet-shaped hole) after "Add to Home Screen" + airplane mode test; browser console shows CSP `worker-src` violations only under a strict CSP (may not appear in default dev testing); service worker `activate` doesn't clear old cache after deploy (visible via DevTools → Application → Cache Storage showing multiple `radar-vN` entries).

**Phase to address:** The phase that introduces the new map engine, as its *first* build step (before any bairro polygons or satellite layers depend on it) — verify offline+CSP behavior before building anything on top.

---

### Pitfall 4: Rendering all ~310k lots (or even one large bairro's lots) kills mobile performance

**What goes wrong:** The spec calls for "hover+click drill to lot subdivisions" citywide. Naively fetching and rendering every lot polygon for a bairro (some bairros have 20,000+ registros per ROADMAP-radar.md's own validated numbers — Bueno 57,225, Oeste 32,472) as individual DOM-based Leaflet polygons (or even as GeoJSON layers without vector tiles) causes severe jank, high memory, and unresponsive touch on mid-range Android — especially layered on top of hover/tap handlers per polygon. Label rendering per lot (if attempted) produces unreadable clutter at city zoom and only slightly less clutter at bairro zoom.

**Why it happens:** The mental model "drill from bairro → lots" makes it tempting to fetch full lot geometry per bairro on click and render every lot as an interactive layer, mirroring how the existing search flow already renders (correctly, since search returns few results) — but that pattern doesn't scale to "all lots in a bairro" the way it scales to "26 units matched a search."

**How to avoid:**
- Never render individual lot polygons at city/bairro-overview zoom. Only reveal lot-level polygons after the user has zoomed/clicked into a *single* bairro (as the spec already states: "clique no bairro → zoom + revela lotes") — and even then, prefer **vector tiles** (pre-built, e.g., with tippecanoe, or simplified/generalized geometry) over raw per-lot GeoJSON fetched live from the fragile ArcGIS endpoint (see Pitfall 6 — this also protects the endpoint).
- Simplify lot polygon geometry (Douglas-Peucker / `simplify-geojson` at build time) for anything rendered below a certain zoom threshold; only load full-precision geometry when zoomed in enough that tap-target size stops being the limiting factor.
- Do not render per-lot text labels; rely on hover/tap for the single lot under the cursor, shown in a tooltip or the existing bottom-sheet pattern (already built and tested for search results) — reuse it, don't invent a second detail UI.
- Tap-target precision: at low zoom, tiny lots are smaller than the ~44px CSS target already mandated elsewhere in this app (M5, ROADMAP-radar.md). Consider a minimum hit-area technique (invisible larger tap buffer, or snapping tap to nearest centroid within N pixels) rather than relying on the polygon's true screen size for touch.
- Decide and document a hard rule: e.g., "lot polygons only render below zoom level Z, and only for the single bairro currently drilled into" — this becomes a testable acceptance criterion.

**Warning signs:** Frame rate drops / scroll-jank on a mid-range Android when a large bairro (Bueno-sized) is drilled into; DevTools Performance tab shows long layout/paint tasks after clicking a bairro; user taps a lot and a neighboring lot's info shows instead (tap-target imprecision); memory climbs and doesn't release after navigating between bairros (leaked Leaflet layers not removed from map).

**Phase to address:** The phase that implements "click bairro → reveal lot subdivisions" — must be designed with a zoom-gated, vector-tile-or-simplified-geometry approach from the start, not retrofitted after a naive full-fetch implementation ships and is found slow.

---

### Pitfall 5: Motion added without `prefers-reduced-motion`, and animations that block/delay task completion

**What goes wrong:** "Motion fluido no app todo (transições, sheet, cards)" is explicit scope. Two distinct failure modes: (a) ignoring the OS-level `prefers-reduced-motion` accessibility setting, which regresses the AA accessibility bar already achieved in v1.0 (ROADMAP-radar.md item 20, done 03/07/2026); (b) motion that adds latency to the corretor's actual task — e.g., a bairro zoom-transition animation that takes 600ms before the lot layer becomes interactive, when the corretor is in the field trying to find one lot fast. Field/task-critical apps that add decorative motion in the critical path (not decorative-only paths) measurably slow down real usage even when each animation "feels premium" in a demo.

**Why it happens:** Motion design work is usually validated on a fast desktop/high-end phone in a quiet demo setting, where 300-600ms transitions feel delightful; the same transitions on a 4G connection with an already-loading tile layer, or on a budget Android GPU, stack with real network/render latency and feel sluggish, not premium. `prefers-reduced-motion` is easy to forget entirely if no one on the team needs it personally.

**How to avoid:**
- Wrap every non-essential CSS animation/transition in `@media (prefers-reduced-motion: reduce)` overrides (set `animation: none` / `transition: none` or drastically shorten duration) from the first motion commit, not as a retrofit. This is a single global CSS block, cheap to add early, expensive to audit-and-patch later across many ad hoc animations.
- Distinguish **decorative** motion (card entrance, sheet bounce, hover glow — safe to slow down or remove for reduced-motion / low-end devices) from **functional** motion (the bairro→lots zoom, which conveys spatial relationship and shouldn't just vanish, but should be interruptible/skippable — e.g., a tap during the transition should immediately jump to end-state, not queue).
- Test on a genuinely low-end Android (not just Chrome DevTools device emulation, which doesn't throttle GPU/paint the same way) and on throttled 4G, since PROJECT.md explicitly calls out field use over 4G as a constraint.
- Prefer CSS transforms/opacity (compositor-only, GPU-cheap) over animating layout-triggering properties (width/height/top/left) — this is the single highest-leverage rule for avoiding jank on low-end hardware, and easy to violate accidentally with naive "animate the sheet height" code.
- Cap total motion duration so it never gates the next user action — e.g., allow the user to tap through/interrupt any transition; never disable input during an animation "for polish."
- Consider battery: continuous/looping animations (e.g., a pulsing marker) cost more battery than one-shot transitions; avoid infinite CSS animations on views the user is likely to leave open (e.g., idle map).

**Warning signs:** Manual QA only ever tested on the developer's own phone/desktop; no CSS file contains `prefers-reduced-motion`; Chrome DevTools Performance panel shows layout thrash (purple "Layout" bars) during a transition; a stopwatch test shows time-to-find-a-lot increases in v2.0 vs v1.0 for the same search.

**Phase to address:** The "Motion fluido" phase itself — bake `prefers-reduced-motion` support and the decorative-vs-functional distinction into the first motion commit; do not treat it as accessibility cleanup at the end.

---

### Pitfall 6: Satellite layer — Google tiles ToS violation, or uncredited/rate-limited free alternative

**What goes wrong:** The most commonly reached-for "just embed satellite" option is scraping/loading Google's raw map tiles directly into Leaflet (`https://mt0.google.com/vt/...` style URLs) without going through the official Maps/Tile API. Google's Map Tiles API Policies explicitly prohibit this: no server-side modification of tiles, no stitching, no caching/storing content for use outside the service, and any real integration requires an API key, billing account, and specific attribution ("Google Maps" + data providers e.g. Maxar) that must not be obscured by the app's own UI/logo. A free single-file app with no backend has no clean way to keep a Google Maps API key secret (client-exposed key on GitHub Pages), and Google's own ToS requires usage tied to a billed account — a mismatch with this project's "no backend, no cost" constraints. The next most common trap is Esri World Imagery, which is genuinely free for non-commercial/non-revenue apps with proper attribution, but its terms explicitly restrict **commercial use** — this project is a corretor's *work tool* (arguably commercial context even if not directly monetized), which needs a conscious legal read, not an assumption.

**Why it happens:** Public code examples (blog posts, Stack Overflow, old Leaflet gists) routinely show raw Google tile URLs without ToS caveats because it "just works" technically; free-tier imagery providers (Esri, Mapbox, Maxar via various resellers) each have subtly different commercial-use restrictions that don't show up until read carefully.

**How to avoid:**
- Do not use raw `mt0/mt1.google.com` tile URLs. If Google imagery is wanted, it must go through the official Maps Platform Tile API with a real API key and billing — evaluate whether that's worth it given this app's zero-backend, zero-cost posture; likely **not** worth it.
- Recommended default: **Esri World Imagery** via `services.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}` (widely used with Leaflet, well documented) — but read Esri's current terms specifically for "not generating revenue from your app" and confirm this corretor tool's use case qualifies (it's free for the *user's own* app if they're not charging for the app itself; the fact that it aids a paid real-estate transaction downstream is very likely still fine, but this is a judgment call worth stating explicitly in project docs rather than assuming).
- Ensure Leaflet's attribution control is enabled and always shows the required credit line for whichever provider is chosen — never suppress/hide the attribution control to "clean up" the UI; this is a hard requirement, not cosmetic.
- Confirm the tile provider's URL is same-origin-HTTPS-compatible (avoid mixed content) — check under the "publish to GitHub Pages" plan already in ROADMAP-radar.md (Pages serves HTTPS, so this is fine as long as the tile provider is also HTTPS, which Esri and Google both are).
- For the service worker: satellite tiles are large (each PNG/JPG tile is bigger than the current CARTO light vector-ish basemap tiles) — do **not** add satellite tile URLs to the service worker's cache-first CDN allowlist; they must stay network-only (like the existing map tiles already are, per `sw.js` comment: "tiles do mapa NÃO passam por aqui: dado vivo") to avoid silently ballooning the PWA's cache storage and hitting browser storage quotas, which can cause the service worker to start evicting other cached assets unpredictably.
- Budget for rate limits: free imagery tiers (Esri included) have fair-use limits; a viral spike in usage (e.g., shared publicly, per the GitHub Pages caveat already flagged in ROADMAP-radar.md about "não divulgar a URL") could trip them. Not a v2.0 blocker, but worth a one-line note in docs.

**Warning signs:** Any tile URL in the codebase pointing at `google.com`/`googleapis.com` without an API key parameter; attribution control missing or hidden via CSS; satellite toggle causes visible growth in service worker cache storage (check DevTools → Application → Storage) after normal browsing; app "works" in dev but the tile provider starts returning 429s under any real load.

**Phase to address:** The "Camada de satélite" phase — choose and document the provider (Esri World Imagery recommended) and its licensing basis *before* writing the toggle UI, and explicitly exclude satellite tiles from service worker caching in the same commit that adds the layer.

---

### Pitfall 7: New bairro/lot map features trigger the endpoint's known 502-under-load failure mode

**What goes wrong:** ROADMAP-radar.md §0 already validated empirically that a heavy query against this ArcGIS server returns a **502 Proxy Error** ("servidor frágil sob carga"). The new mapa-first home, by design, invites exactly the query pattern most likely to trigger this: rendering many bairros at once (fetching all 709 setores' boundary geometry, or worse, all lots for a bairro, on every home-page load) instead of the current app's behavior (fetch only on an explicit user search, scoped by bairro+filter). If bairro polygons are fetched *live* from the ArcGIS server on every visit rather than from the already-identified **static, pre-downloaded, open-data GeoJSON** source (PROJECT.md: "GeoJSON de bairros da Prefeitura em EPSG:31982... via CKAN, pipeline offline"), the home map becomes the single heaviest, most frequent consumer of the fragile endpoint — a regression risk explicitly called out in this project's own constraints ("minimizar volume, retry gentil, ter plano B").

**Why it happens:** It's tempting to fetch bairro boundaries "live" from the same ArcGIS `Feature_Base` layer used for lots, for consistency/simplicity, rather than maintaining a separate static asset — but the project's own research (INTELIGENCIA-radar.md) already identified the correct static source and confirmed it shares the same EPSG:31982 CRS, specifically to avoid this exact trap.
Similarly, "hover shows bairro name" implemented as a live spatial query per hover event (rather than reading a property already embedded in the local GeoJSON) would flood the endpoint on every mouse movement.

**How to avoid:**
- Bairro polygons for the home map: use the **static CKAN GeoJSON** already identified in PROJECT.md/INTELIGENCIA-radar.md, bundled as a local asset (like `caixa-goiania.js` already is), reprojected once at build/prep time (see Pitfall 1) — never a live ArcGIS fetch for the home view. This makes the home map's load 100% independent of the fragile endpoint's health.
- Hover-to-show-bairro-name: read the name from a GeoJSON feature property already loaded client-side, never an on-hover network call.
- Lot-level drill after clicking a bairro: this is the one place a live ArcGIS fetch is unavoidable (lots aren't in the static open-data export) — apply the same server-side filtering discipline already proven in P0 (ROADMAP-radar.md item 1: `cdbairro=X AND ...` server-side WHERE, never client-side filtering of a full dump) and the same pagination guard with user-visible truncation warning (never silent truncation, per the already-fixed bug).
- Cache the per-bairro lot fetch in-session (a `Map` keyed by `cdbairro`, as already planned in backlog item 16) so re-clicking the same bairro doesn't re-hit the endpoint.
- Rate-limit/debounce: if hover-to-preview is ever extended to *also* prefetch lot data speculatively (e.g., prefetch on hover before click, to feel instant), add a debounce (e.g., 300-500ms hover-intent delay) so rapid mouse movement across many bairros doesn't fire N speculative fetches — this is a realistic way a "smooth, fast-feeling" UX goal accidentally reintroduces the exact 502-under-load pattern this project fought hard to fix.
- Keep the existing retry/backoff (already implemented, ROADMAP-radar.md item 13) applied to any *new* JSONP call path for lot-drill fetches — don't let the new map code bypass the shared fetch helper and reimplement a naive fetch without retry.

**Warning signs:** Home map load time correlates with ArcGIS server health rather than being instant; opening browser Network tab shows a JSONP request firing on every bairro hover; a 502 response surfaces as a broken/blank home map rather than a clear error state; server load (if ever visible/reported) spikes specifically around app launch time for many users.

**Phase to address:** The phase that builds the home map + bairro layer — the static-GeoJSON-for-bairros decision must be made and implemented as the default architecture, not discovered after a live-fetch prototype causes 502s during testing. The lot-drill phase must reuse the P0 server-side-filter and retry/backoff patterns already proven.

---

### Pitfall 8: Accessibility/LGPD regressions from new hover-driven, mouse-centric map interactions

**What goes wrong:** "Hover mostra o nome" (bairro name on hover) is a mouse-only interaction pattern by default — on mobile (this app's primary field-use context per PROJECT.md) there is no hover, so a hover-only affordance either does nothing on touch devices (silent feature loss) or gets clumsily reimplemented as tap-shows-tooltip-then-tap-again-to-drill, which conflicts with the "click bairro → zoom + reveal lots" primary action (is the first tap "show name" or "drill in"?). Separately, this app already achieved WCAG AA / full ARIA keyboard support in v1.0 (ROADMAP-radar.md item 20) for the search-based flow; a from-scratch interactive map with custom hover/click layers (especially if built on MapLibre's canvas-rendered features, which have **no DOM nodes** and thus no natural focus/tab targets) can silently regress keyboard navigation and screen-reader support for the entire new home experience, since canvas-based map layers require deliberate extra work (offscreen accessible markup, ARIA live regions announcing selection) that Leaflet's DOM-based markers got for free-er. On the LGPD side: the specific documented rule (INTELIGENCIA-radar.md: "`dtnascimen`: nunca exibir/exportar") must be re-verified against any new bairro/lot detail popups or hover tooltips introduced by the map redesign — a new engineer adding "show all fields on hover for debugging/richness" is exactly how a rule like this gets silently violated in a new codepath that isn't the original detail-panel code review already covered this rule.

**Why it happens:** Hover as *the* discovery mechanism is a desktop-web default that doesn't map to touch; canvas/WebGL map rendering (MapLibre, vector tiles) trades away the DOM-accessibility Leaflet's default marker/polygon rendering had; any new UI surface that displays raw API fields (for a "richer" hover card) is a fresh place to accidentally include `dtnascimen` if the developer copies from the raw feature-attribute object rather than the existing allow-listed display function.

**How to avoid:**
- Design the bairro-name affordance as tap-to-preview-name (with the name shown in a small non-modal label/toast) **and** hover-to-preview-name on desktop, with a *separate, unambiguous* action for "drill in" (e.g., a second tap on an already-previewed bairro, or a distinct "Ver lotes" affordance) — decide this interaction model explicitly for touch before writing hover code for desktop, since touch is the primary target device per project constraints.
- If MapLibre/canvas rendering is adopted for bairro/lot layers, budget explicit work for parallel accessible affordances: e.g., an offscreen/visually-hidden `<button>` list of bairro names for keyboard/screen-reader users to jump to any bairro without relying on a pointer at all, and `aria-live` announcements when a bairro is selected/drilled into (mirroring the pattern already used for the toast/loading live regions in v1.0).
- Re-run the same accessibility checklist already used in v1.0 (item 20: ARIA combobox pattern, keyboard reachability, contrast, Esc-to-close) against every *new* interactive map surface specifically — don't assume "we did accessibility already" covers UI that didn't exist yet.
- Any new hover/tap detail card for bairro or lot must reuse the existing field allow-list / display function (the one that already excludes `dtnascimen`), not construct a new template string that iterates over raw API fields. Grep for `dtnascimen` after this phase ships as a literal verification step.
- Keep hover/click parity in mind for the AI-seam UI too if it surfaces any per-lot popup (see Pitfall 9) — same allow-list rule applies to anything AI-adjacent that touches lot data.

**Warning signs:** Tapping a bairro on a real phone does something confusing or nothing at all (no hover equivalent reachable); Tab key on desktop can't reach any bairro/lot without a mouse; a screen reader announces nothing when a bairro is selected; grep for `dtnascimen` in any new template string turns up a hit; a new detail popup shows a field that wasn't in the original allow-list without an explicit LGPD review note in the commit.

**Phase to address:** The home-map/bairro-layer phase (interaction model + accessibility parity) and re-verified again in the lot-drill phase (canvas accessibility, allow-list reuse) — accessibility parity should be an explicit acceptance criterion per map-related phase, not a single end-of-milestone pass.

---

### Pitfall 9: AI seam becomes a security/coupling liability even while "dormant"

**What goes wrong:** PROJECT.md's Active scope explicitly wants a "seam de integração de IA externa... plugável e desativado" — dormant, not active, in v2.0. The two realistic ways this goes wrong even while dormant: (a) a placeholder API key or example code with a real key gets committed to this public GitHub Pages repo (client-only apps have no server to hide secrets, and a "just wire it up for later" mentality often pastes a real test key temporarily and forgets it before commit); (b) the seam is architecturally wired into the same code path as the deterministic cadastral/laudo core (e.g., sharing a function, a shared state object, or a shared UI panel) rather than being a genuinely separable, optional module — violating the project's own explicit Key Decision ("núcleo cadastral/laudo seguem determinísticos... IA opt-in, rotulada, sandbox") and making the *next* milestone's "activate AI" work riskier because the boundary was never actually clean.

**Why it happens:** "Just add a stub" work is often done quickly and without the same review rigor as core features, since it's explicitly inert; coupling happens gradually — e.g., reusing the existing detail-panel render function "just to add one optional AI section" ends up importing AI-seam concerns into the core render path.

**How to avoid:**
- If any placeholder code references an external AI API, use an obviously-fake placeholder string (e.g., `"YOUR_API_KEY_HERE"`) and add it to a `.gitignore`d local-only config pattern from day one if any real key is ever used for testing — never commit a working key "temporarily."
- Design the seam as a distinct, optional module boundary: a separate script tag/section that, when absent or disabled, leaves the core app's behavior byte-for-byte identical. A good litmus test: deleting the AI-seam code entirely should require touching zero lines in the cadastral/laudo/estimate code paths.
- Any AI-seam UI element must be visually and behaviorally labeled as opt-in (e.g., a clearly separate "Pesquisa de mercado (IA) — desativado" toggle/badge), never silently present as if part of the core estimate — this preserves the project's LGPD/credibility posture (INTELIGENCIA-radar.md: "SEM IA no app" for the deterministic core) even as the seam exists for future activation.
- Since this is a client-only, no-backend app, *any* future real activation of this seam will face the "no secret storage" problem inherent to the architecture — flag this now as a known constraint for whoever designs the eventual activation (likely needs a lightweight proxy/Worker, similar to the JSONP-proxy idea already floated in ROADMAP-radar.md item 14 for the main endpoint) rather than assuming a client-side API key is ever acceptable.
- Keep the seam's scope, in v2.0, to interface/plumbing only — no real network calls to any AI provider should ship active-by-default; verify this with a manual test (fresh load, no console errors about failed AI calls, no network requests to any AI endpoint unless the user has explicitly opted in).

**Warning signs:** `git log -p` or a secret-scanning tool (e.g., `gitleaks`, GitHub's own push-protection) flags a key-shaped string in any commit; deleting the AI-seam file/section breaks an unrelated core feature; the AI toggle is on by default or unlabeled; any network request to an AI provider fires without explicit user opt-in during manual QA.

**Phase to address:** The "Seam de integração de IA" phase specifically — treat the module-boundary cleanliness and secret-handling as acceptance criteria for that phase, verified by the "delete the module, core still works" test before merge.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Rip-and-replace Leaflet with MapLibre in one big commit | Feels "clean," avoids running two map libs | Re-touches every working interaction (click-identify, bounds fetch, popups, PWA offline) at once — hard to isolate regressions | Only if the team has strong manual regression coverage across desktop+iOS+Android before merging; otherwise prefer additive (`maplibre-gl-leaflet`) approach |
| Live-fetch bairro boundaries from ArcGIS instead of static CKAN GeoJSON | Slightly simpler (one data source, always "fresh") | Reintroduces load on the already-fragile endpoint on every home-page visit; couples home-page uptime to endpoint uptime | Never — static source already identified and same CRS; no upside justifies the endpoint risk |
| Render all lots per bairro as plain Leaflet polygons (no vector tiles/simplification) | Fast to ship, reuses familiar Leaflet polygon API | Jank/memory blowup on mobile at bairro scale (20k+ lots in largest bairros) | Only acceptable temporarily for a bairro known to be small (<500 lots) during a prototype spike; must be replaced before shipping citywide |
| Skip `prefers-reduced-motion` in first motion pass, "add later" | Ships motion faster | Retrofit requires auditing every animation added since, easy to miss some; accessibility regression ships to real users in the meantime | Never — it's a few lines of CSS added once, cheapest to do first |
| Use raw Google tile URLs for satellite ("it renders fine") | Zero setup, no API key needed | ToS violation; could be cut off without notice; no legal footing if ever challenged | Never |
| Wire the AI-seam stub directly into the existing detail-panel render function "just to try it" | Faster to prototype | Violates the explicit deterministic-core/IA-boundary decision; makes future activation riskier, and risks LGPD/credibility posture of the core estimate | Never — even for a throwaway prototype, keep it in a separate file/branch, not merged |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| MapLibre GL JS via CDN | Assuming UMD bundle still exists / using an old CDN URL pattern from pre-ESM-only releases | Confirm current release's distribution format (ESM-only as of recent versions) and adjust `<script type="module">` usage and the CDN allowlist/SW cache accordingly |
| MapLibre + strict CSP (if ever added) | Relying on default `worker-src blob:` without realizing it's the less-secure default | If CSP is ever hardened, use MapLibre's dedicated CSP bundle/worker path, not the default |
| Esri World Imagery tiles | Assuming "free" means unconditionally free for any use case | Verify current terms for the specific use case (corretor work tool) and document the basis in project docs, not just assume |
| Prefeitura CKAN bairro GeoJSON | Re-deriving the UTM zone/projection independently for this new data source | Reuse the exact same `proj4.defs("EPSG:31982", ...)` string already validated in the app |
| ArcGIS `Feature_Base` layer (lots) for the drill-down | Fetching full geometry for an entire bairro client-side and filtering in JS | Reuse the already-proven server-side WHERE-clause filtering pattern (P0 fix) scoped by `cdbairro` and any zoom-relevant bounding filter |
| Service worker cache | Adding a new CDN/library without updating both the `CDN` array and the `cdn` hostname check in `sw.js`, and forgetting to bump `CACHE` version | Update both together, bump cache name, manually test the offline-after-update flow |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Rendering every lot polygon as a DOM/SVG Leaflet layer | Scroll/pan jank, slow tap response, high memory | Zoom-gate lot rendering to single-bairro-drilled-in state; use vector tiles or simplified geometry | Breaks first in the largest bairros (Bueno ~57k registros, Oeste ~32k) — exactly the ones already flagged as risk in ROADMAP-radar.md §0 |
| Fetching full bairro lot geometry on every hover-intent/prefetch | Endpoint 502s under concentrated load, especially with many simultaneous users | Debounce hover-intent, cache per-bairro fetch in session, never prefetch speculatively without a delay | Breaks under any moderate concurrent usage — endpoint has no SLA and known 502-under-load behavior (validated fact, ROADMAP-radar.md §0) |
| Layout-triggering CSS animations (animating width/height/top/left) for sheet/card motion | Visible jank especially on mid/low-end Android, battery drain | Animate only `transform`/`opacity` (compositor-only) | Breaks first on low-end Android GPUs, less visible on the developer's own likely-higher-end test device |
| Satellite tiles cached indiscriminately by the service worker | PWA cache storage balloons, browser starts evicting cache unpredictably, other cached assets may be lost | Explicitly exclude satellite tile URLs from SW caching (network-only, like existing map tiles) | Breaks after enough panning/zooming in satellite mode fills storage quota — worse on lower-storage phones |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing a real AI API key (even for local testing of the dormant seam) | Public repo (GitHub Pages requires public on free tier) exposes the key; billing abuse | Never commit real keys; use obvious placeholders; consider secret-scanning (gitleaks/GitHub push protection) as a habit |
| Raw Google Maps tile URLs bypassing the official Tile API | ToS violation; app could be blocked/cut off with no warning, and there's no legal footing to contest it | Use Esri World Imagery (or another properly-licensed free provider) with correct attribution, and document the licensing basis |
| New hover/detail card templates rendering raw API feature attributes for "richness" | Silent LGPD violation if `dtnascimen` (or any other never-shown field) slips into a new template string | Reuse the existing field allow-list/display function for any new popup/card; grep for `dtnascimen` before merging any new map-detail UI |
| MapLibre/vector-tile Web Worker under a future strict CSP | `worker-src blob:` broadly permissive if not scoped carefully; could enable script injection vectors if combined with untrusted tile data | If CSP is hardened later, use MapLibre's CSP-specific bundle/worker configuration rather than a blanket `blob:` allowance |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Hover-only bairro name reveal, no touch equivalent | Mobile users (primary field context) get a dead/confusing feature | Explicit tap-to-preview + separate drill-in action, designed for touch first |
| Motion transitions that block interaction until they finish | Corretor in the field loses time on every bairro→lot drill | Make transitions interruptible; never disable input "for polish" |
| Search demoted from home to a "card" without a fast, obvious path back to it | Power users who already know quadra/lote lose speed vs v1.0 | Keep search reachable in 1 tap from the new map home (e.g., persistent visible search card/button, not buried in a menu) |
| Satellite toggle with no context on when it's useful vs slower/heavier | Users leave it on, unaware of extra data/battery cost, or never discover it | Label clearly, remember user's last choice, consider auto-reverting to light basemap contextually if helpful |
| Full-city lot rendering attempted "for completeness" | Sluggish, cluttered map that undermines the "premium" motion redesign's own goals | Progressive disclosure: bairros → (zoom/click) → lots, never all lots at once |

## "Looks Done But Isn't" Checklist

- [ ] **Bairro/lot polygons render correctly:** Often missing verification against an *irregular* (non-square) bairro shape — verify at least one visibly asymmetric bairro against the correct real-world outline, not just a quick glance at a regular one.
- [ ] **PWA offline mode after map engine swap:** Often missing a real airplane-mode test on a real device after deploy — verify by installing the PWA, going offline, and reloading, not just checking it loads once online.
- [ ] **Motion respects `prefers-reduced-motion`:** Often missing entirely — verify by toggling the OS-level reduce-motion setting (Android: Settings > Accessibility > Remove animations) and confirming transitions shorten/disappear.
- [ ] **Satellite layer attribution:** Often missing or hidden for visual cleanliness — verify the attribution control is visible and un-obscured at every zoom level, on mobile too (where corner space is tight).
- [ ] **Lot-drill respects the endpoint's fragility:** Often missing debounce/caching — verify via Network tab that rapid hovering/clicking across bairros doesn't fire a flood of uncached JSONP requests.
- [ ] **`dtnascimen` never surfaces in new map UI:** Often missing from a fresh manual grep after a redesign — verify with `grep -n "dtnascimen"` restricted to display/template code paths after every phase that touches lot detail rendering.
- [ ] **AI seam is truly optional:** Often missing a genuine "delete it, core still works" test — verify by physically removing/commenting the AI-seam module and confirming the deterministic core (search, laudo, estimate) is unaffected.
- [ ] **Keyboard/screen-reader parity on new map UI:** Often missing entirely for canvas/WebGL-rendered layers — verify Tab-key reachability and screen-reader announcements for bairro selection and lot-drill, not just mouse/touch.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| UTM zone/coordinate-order bug ships in bairro/lot polygons | LOW | Same fix pattern as the original historical bug: correct the proj4 string or axis order in the single shared helper, redeploy — low cost precisely because the fix is centralized if Pitfall 1's prevention (single source of truth) was followed |
| MapLibre migration breaks offline PWA | MEDIUM | Update `sw.js` CDN allowlist + bump cache version, redeploy, instruct testers to reinstall the PWA (uninstall/reinstall or clear site data) to pick up the new service worker cleanly |
| Endpoint 502s discovered after shipping live bairro-boundary fetch | MEDIUM | Swap to the static CKAN GeoJSON source (already identified, no new research needed) and ship a follow-up patch; short-term mitigate with a "map temporarily limited" fallback message reusing existing error-toast patterns |
| Motion ships without `prefers-reduced-motion` | LOW | Add the global media-query override retroactively; requires auditing all animations added since, which is the real cost — budget a dedicated pass, don't assume it's a five-minute fix once motion has sprawled |
| Google tile ToS violation discovered post-launch | HIGH | Full satellite-layer swap to a compliant provider (Esri World Imagery), re-test attribution and licensing basis, communicate any user-visible change; reputational/legal risk if discovered externally rather than caught internally first |
| `dtnascimen` leaks into a new map popup | HIGH (LGPD) | Immediate hotfix removing the field from the template, redeploy; assess if any exposure window requires disclosure consideration; add the grep-based check to a pre-merge habit going forward |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| UTM zone regression | Bairro/lot polygon ingestion phase | Test irregular bairro shape against known real-world outline; automated point-conversion regression test |
| GeoJSON coordinate-order flip | Bairro/lot polygon ingestion phase (same commit as above) | Same irregular-shape visual test catches both axis and zone errors together |
| MapLibre/PWA cache breakage | Map-engine-swap phase (first build step) | Manual airplane-mode reload test after install; DevTools Cache Storage inspection for stale `radar-vN` entries |
| Mobile rendering of many lots | Bairro-click-drill-to-lots phase | Performance profiling on a real mid/low-end Android in the largest bairro (Bueno); frame-rate/memory check |
| Motion accessibility & jank | Motion phase (global, first commit) | Toggle OS reduce-motion setting and confirm effect; DevTools Performance panel check for layout thrash |
| Satellite licensing/ToS | Satellite-layer phase (before UI is built) | Attribution control visibly present at all zooms; documented licensing basis in project docs |
| Endpoint 502 from bairro/lot map features | Home-map phase (bairro data source decision) + lot-drill phase (fetch discipline) | Network tab shows zero live ArcGIS calls for bairro boundaries; debounce/cache verified for lot-drill hover/click |
| Accessibility/LGPD regressions in new map UI | Home-map phase + lot-drill phase (explicit acceptance criteria each) | Keyboard/screen-reader pass on new UI; grep for `dtnascimen` in new templates |
| AI-seam coupling/secrets | AI-seam phase | "Delete the module" test; secret-scan of the diff before merge |

## Sources

- This repository's own validated facts: `ROADMAP-radar.md` §0 (502-under-load, UTM zone-22 bug, setor sizes, pagination limits), `PROJETO-radar.md` §4/§9 (endpoint quirks, known risks), `INTELIGENCIA-radar.md` (LGPD `dtnascimen` rule, static CKAN GeoJSON source, SEM IA principle) — HIGH confidence, first-party.
- `radar-goiania.html` source (read directly): proj4 definition and `toWGS()` helper (lines 568-569), bounds-to-UTM conversion (671-672, 721), CDN guard pattern (1803) — HIGH confidence.
- `sw.js` source (read directly): cache strategy, CDN allowlist, network-first/cache-first split — HIGH confidence.
- [MapLibre GL JS Leaflet migration guide](https://maplibre.org/maplibre-gl-js/docs/guides/leaflet-migration-guide/) — MEDIUM confidence (official docs).
- [MapLibre GL JS CSP requirements — Esri/esri-leaflet-vector issue #218](https://github.com/Esri/esri-leaflet-vector/issues/218) and [maplibre-gl-leaflet README](https://github.com/maplibre/maplibre-gl-leaflet/blob/main/README.md) — MEDIUM confidence (community/official issue discussion).
- [MapLibre GL JS ESM-only distribution change, cdnjs listing](https://cdnjs.com/libraries/maplibre-gl) — MEDIUM confidence (recent-version behavior, verify exact version at implementation time).
- [Google Map Tiles API Policies](https://developers.google.com/maps/documentation/tile/policies) and [Google Maps Platform Terms of Service](https://developers.google.com/maps/terms-20180207) — HIGH confidence (official ToS).
- [Esri World Imagery item page](https://www.arcgis.com/home/item.html?id=8e90a00a0a6845a49262e0b756f57a10) and [Esri Web Site and Service Terms of Use](https://www.esri.com/en-us/legal/terms/web-site-service) — MEDIUM confidence (official but requires case-specific judgment on "non-commercial" for this app's context — flagged as LOW confidence specifically on whether this corretor tool qualifies).
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) and [Smashing Magazine: Respecting Users' Motion Preferences](https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/) — MEDIUM/HIGH confidence (MDN authoritative, Smashing Magazine as corroborating practitioner source).

---
*Pitfalls research for: Map-first + motion + satellite redesign of Radar Fundiário Goiânia (v2.0)*
*Researched: 2026-07-04*
