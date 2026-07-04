# Phase 1: Dataset Estático de Bairros + Correção de Docs - Research

**Researched:** 2026-07-04
**Domain:** Offline GIS build script (ArcGIS REST → simplified static WGS84 GeoJSON) for a single-file, no-backend, no-build PWA
**Confidence:** HIGH — every load-bearing claim below was verified live against the production ArcGIS server today, not sourced from training data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fonte e geração do dataset**
- O dataset vem da **layer 2 (Divisas de Bairro)** do ArcGIS `Feature_Base/MapServer`, OU do GeoJSON de bairros publicado pela Prefeitura no CKAN (ambos em EPSG:31982). Preferir o que der cobertura completa e estável.
- Geração por **script offline** (não em runtime). Linguagem: seguir o que o repo já usa para tooling — há `atualizar-caixa.py` (Python) como precedente; um script Python é o caminho natural, mas Node também é aceitável se preferir zero-dependência do ecossistema já presente. **Claude decide** com base na menor fricção.
- Reprojeção EPSG:31982 → WGS84 no script deve usar a **mesma definição proj4 do app** (UTM zona 22 South) — nunca re-derivar. Validar contra uma forma de bairro **irregular** (não simétrica) para pegar troca de eixo/ordem `[lon,lat]`.
- Pré-simplificar a geometria (ex.: Douglas-Peucker / mapshaper) para manter o asset leve (alvo: caber no orçamento de um app single-file + PWA), preservando fidelidade visual em zoom de cidade.

**Validação (critério de aceite embutido)**
- O script deve **paginar explicitamente** e provar que capturou todos os bairros (não truncar em page-size default do ArcGIS). Reportar a contagem final.
- Documentar a **integridade do join** bairro (layer 2: `nm_bai`/`id`) ↔ `cdbairro` (layer 3, 709 setores): 709 vs ~1.206 polígonos é uma discrepância conhecida — documentar se são unidades administrativas diferentes (bairro vs setor cadastral). NÃO construir a home sobre um lookup id→cdbairro; o drill da Phase 3 usa envelope/viewport, que dispensa o join.

**Correção documental**
- Corrigir `PROJETO-radar.md §4` e `ROADMAP-radar.md §0`: o endpoint **aceita** `returnGeometry=true` (verificado ao vivo 2026-07-04, +~19% de payload), contrariando a "manha" antiga. Manter as demais manhas (só `outFields=*`, 502 sob carga, etc.).

### Claude's Discretion
- Escolha de linguagem/ferramenta do script de build, biblioteca de simplificação, nível de tolerância de simplificação, e estrutura exata do GeoJSON de saída — tudo à discrição de Claude, guiado pelos critérios de sucesso e convenções do repo.

### Deferred Ideas (OUT OF SCOPE)
- Render dos bairros na home → Phase 3.
- Ortofoto própria (EPSG:31982, CRS custom) → SAT-03, v2.1+ (fora do v2.0).
- Snapshot anual de mediana R$/m² por setor (histórico próprio) → camada de inteligência futura, fora do v2.0.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DADOS-01 | A home pinta os bairros a partir de um GeoJSON estático pré-simplificado (WGS84), versionado no repo e gerado por script offline — sem tocar o endpoint ArcGIS no carregamento inicial | §Standard Stack (source choice), §Architecture Patterns (build script structure), §Code Examples (fetch+paginate+reproject+simplify pipeline) all target this exact deliverable |
| DADOS-02 | O script de build valida a completude por paginação e documenta a integridade do join bairro (layer 2) ↔ `cdbairro` (709 vs 1.206 polígonos) | §Pagination findings (live-verified truncation behavior), §Join Integrity Report (live-verified 709 vs 1206, root cause identified) |
| DADOS-03 | Documentação corrigida — `PROJETO-radar.md §4` e `ROADMAP-radar.md §0` passam a refletir que `returnGeometry=true` funciona no endpoint (verificado em 2026-07-04) | §Live Re-Verification (fresh 2026-07-04 queries, exact URLs and byte counts reproduced) |
</phase_requirements>

## Summary

All open questions in the phase brief were resolved by direct, live testing against the production ArcGIS server today (2026-07-04), not by desk research. Layer 2 (Divisas de Bairro) is confirmed to be a real, complete, polygon-geometry layer with exactly **1,206 features**, fields `id` (12-char PK) and `nm_bai` (nullable/blank for ~466 records — rural "Gleba" parcels have no bairro name), served in EPSG:31982. The ArcGIS default query (no `resultRecordCount`) returned all 1,206 features without truncation because `maxRecordCount=1000000` exceeds the true count — but this must NOT be relied upon as a general pagination strategy (other layers, or a future re-index, could set a lower `maxRecordCount`); the build script must still page explicitly to prove completeness, per the locked decision.

The Prefeitura's CKAN open-data export (`bai.json`) was fetched and inspected: it is **stale (last updated 2018-09-18)**, has only 1,155 features (66 fewer than live, 16 present-but-not-in-live), and its dataset page carries no CRS documentation (though the file's embedded `crs` field does declare EPSG:31982, consistent with the live layer). **Recommendation: use the live ArcGIS layer 2 as the sole source, not CKAN** — it is more complete and current; keep CKAN noted only as a documented, rejected alternative.

The 709-vs-1,206 discrepancy is now root-caused, not just flagged: `cdbairro` (layer 3, the cadastral/tax layer) is a coarser **tax-sector** classification with 709 distinct codes, while `id`/`nm_bai` (layer 2) is a finer, separately-maintained **neighborhood-boundary** layer with 1,206 polygons — confirmed live to include entries with blank `nm_bai` (unnamed rural glebas) that plainly aren't tax sectors. These are administratively distinct units maintained by different processes; there is no reliable 1:1 or N:1 key to join them, so the build script must report this finding, not construct a lookup table. This matches and confirms the locked decision to keep Phase 3's drill-down on viewport/envelope queries instead.

A live cross-check of three independent reprojection paths — the app's own `proj4.defs`/`toWGS()`, a fresh `pyproj` transform using the identical proj4 string, and ArcGIS's own native `f=geojson` server-side reprojection — all agree to ~9 decimal places on the same test coordinate. This means the reprojection math itself is not the risk; the risk the locked decision guards against (never re-deriving the proj4 string, testing against an irregular shape) is about implementation discipline, not about correctness of the underlying transform.

**Primary recommendation:** Write the build script in Python (matching `atualizar-caixa.py`'s precedent and the repo's zero-`package.json` footprint), fetch layer 2 with explicit `resultOffset` pagination even though a single unpaginated call currently returns everything, reproject with the app's exact proj4 string via `pyproj` (installed as the one new, documented, one-time build-time dependency), simplify with `mapshaper` (invoked via `npx`, no permanent Node dependency added to the repo) at a tolerance tuned to keep gzipped output near ~140–150KB, and have the script emit a plain-text join-integrity and completeness report to stdout/a `.md` sidecar as part of DADOS-02.

## Standard Stack

### Core

| Tool | Version (verified) | Purpose | Why Standard |
|------|---------------------|---------|---------------|
| Python | 3.12.10 (already installed on this machine; matches `atualizar-caixa.py`) | Build script runtime | Repo precedent (`atualizar-caixa.py`); stdlib `urllib`/`json` already used for ArcGIS fetches; no new language introduced |
| pyproj | 3.7.2 [VERIFIED: pip install + live cross-check against app's proj4] | EPSG:31982 → WGS84 reprojection, using the app's exact proj4 string as input (not a bare `EPSG:31982` alias) | Verified today to produce identical output (~9 decimal places) to the app's own `proj4.defs`; far safer than the stdlib re-implementing UTM projection math by hand, which is exactly the class of bug (zone 22 vs 23) this project has already been burned by |
| mapshaper | 0.6.x (invoked via `npx mapshaper@0.6`, no permanent install) [VERIFIED: ran live against the full 1,206-feature dataset] | Polygon simplification (Douglas-Peucker/Visvalingam) + topology-aware `keep-shapes` | Industry-standard CLI simplifier; zero-install via `npx` keeps the repo free of a `package.json`/`node_modules` footprint, consistent with the "single file + a couple of build scripts" project shape |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `urllib.request` (Python stdlib) | built-in | HTTP calls to the ArcGIS REST endpoint, with retry/backoff | Already the pattern in `atualizar-caixa.py`'s `http()` helper — reuse it verbatim, including its 429/503 `Retry-After` handling |
| `json` (Python stdlib) | built-in | Parse ArcGIS JSON responses, write output GeoJSON | No need for a GeoJSON-writing library — the shape is simple enough to construct by hand, matching the pattern already used to write `caixa-goiania.js` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Python + pyproj + npx mapshaper (recommended) | Pure Node (proj4 + mapshaper as npm deps) | Node/proj4 was verified to produce identical output, and would keep everything in one language if the repo ever standardizes on Node — but it requires `npm install proj4` creating a `package.json`/`node_modules` in a repo that currently has neither; Python's `pip install pyproj` is a more isolated one-time cost that doesn't change the repo's dependency shape |
| Live ArcGIS layer 2 (recommended source) | Prefeitura CKAN `bai.json` | CKAN is stale (2018), 66 features short of live, and 16 of its features don't exist in the live layer at all — rejected as the primary source, documented as a considered-and-rejected alternative |
| mapshaper CLI via npx (recommended) | Hand-rolled Douglas-Peucker in pure Python/JS (no dependency at all) | Zero-dependency, but reinventing simplification risks subtly broken topology with no track record; mapshaper is a maintained, widely-used tool and the `npx` invocation leaves no permanent footprint in the repo — recommended over hand-rolling |
| `pyproj` (recommended) | Manual UTM math replicating the formula behind `+proj=utm +zone=22 +south` | This project's own history includes a real production bug from hand-derived UTM zone assumptions (zone 23 vs 22, "pino na Bahia"). Never hand-roll projection math a second time — `pyproj` with the exact same proj4 string removes that risk class entirely |

**Installation:**
```bash
# One-time, build-time only — not a runtime/app dependency
python -m pip install pyproj
# mapshaper: no install needed, invoked ad hoc
npx --yes mapshaper@0.6 -i input.geojson -simplify ... -o output.geojson
```

**Version verification:** `pip install pyproj` resolved to **3.7.2** (verified live today, current on PyPI at research time). `npx mapshaper@0.6` resolved and ran successfully against the live 1,206-feature dataset today; pin `@0.6` in the script's invocation to avoid drift if `npx` is re-run months later.

## Architecture Patterns

### Recommended Project Structure

```
/ (repo root)
├── radar-goiania.html          # unchanged this phase
├── atualizar-caixa.py          # existing precedent script
├── gerar-bairros.py            # NEW — this phase's build script
├── bairros-goiania.json        # NEW — committed output artifact (consumed by Phase 3)
└── bairros-goiania.report.md   # NEW (recommended) — join-integrity + completeness report, human-readable, committed alongside the data for auditability
```

### Pattern 1: Explicit pagination loop (never trust a single unpaginated response)

**What:** Loop on `resultOffset` in fixed page sizes (e.g. 500) until a page returns fewer than the requested count, accumulating features and asserting no duplicate `id`s across pages.
**When to use:** Any ArcGIS REST fetch intended to be a complete snapshot — even though today's single-call default happened to return all 1,206 features (because `maxRecordCount` is set to a very large 1,000,000), that is a coincidence of current server config, not a guaranteed contract. The DADOS-02 requirement explicitly requires the script to prove completeness by pagination, not by luck.
**Example:**
```python
# Source: adapted from atualizar-caixa.py's http()/arcgis() helpers (this repo)
LAYER2 = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/2/query"

def fetch_all_bairros(page_size=500):
    features, offset = [], 0
    seen_ids = set()
    while True:
        params = {
            "where": "1=1",
            "outFields": "id,nm_bai",
            "returnGeometry": "true",
            "resultRecordCount": page_size,
            "resultOffset": offset,
            "f": "json",
        }
        data = arcgis(LAYER2, params)  # reuse atualizar-caixa.py's retry/backoff http()
        page = data.get("features", [])
        if not page:
            break
        for feat in page:
            fid = feat["attributes"]["id"]
            if fid in seen_ids:
                raise RuntimeError(f"duplicate id {fid} across pages — pagination is inconsistent")
            seen_ids.add(fid)
        features.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return features
```

### Pattern 2: Reproject using the app's exact proj4 string — never a bare EPSG alias

**What:** Instantiate the transformer from the literal proj4 definition string copied out of `radar-goiania.html` line 568, not from `pyproj.CRS.from_epsg(31982)` or any library's built-in EPSG:31982 definition.
**When to use:** Every coordinate conversion in the build script.
**Why this matters (not stylistic):** `pyproj.CRS.from_epsg(31982)` and the app's manual `+towgs84=0,0,0,0,0,0,0` datum-shift definition are not guaranteed to be byte-identical in every edge case (different underlying grids/datum realizations can exist under the same EPSG code across PROJ versions). The whole point of the locked decision is "never re-derive" — copy the string, don't trust a same-named alias.
**Example:**
```python
# Source: radar-goiania.html line 568 (exact string, copied verbatim)
from pyproj import Transformer

PROJ4_31982 = "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
to_wgs = Transformer.from_crs(PROJ4_31982, "EPSG:4326", always_xy=True)

def reproject_ring(ring):
    # always_xy=True => transform takes/returns (x, y) i.e. (easting, lon-like), NOT (lat, lon)
    return [list(to_wgs.transform(x, y)) for x, y in ring]
```
**Verified today:** this exact string, run through `pyproj.Transformer`, produced `(-49.36196947884371, -16.803910355421312)` for UTM point `(674557.5108, 8141415.6708)` — matching the app's own JS `toWGS()` output `(-49.36196947884371, -16.80391035542131)` to 9 decimal places, and matching ArcGIS's own server-side `f=geojson` reprojection of the same feature to the same precision. All three paths agree; the risk is implementation discipline (copy the string), not the math.

### Pattern 3: Irregular-shape smoke test (guards axis-order / zone regressions)

**What:** After reprojecting, assert that a known, deliberately non-symmetric bairro polygon's centroid lands within an expected bounding box in Goiânia (roughly `lat ∈ [-16.85, -16.55]`, `lon ∈ [-49.45, -49.15]`), and that GeoJSON coordinate order is `[lon, lat]` (not `[lat, lon]`).
**When to use:** As an automated assertion in the build script itself (see Validation Architecture), not a manual spot-check.
**Concrete candidate bairro for the test:** `id="000400000603"` (`nm_bai="Campos Dourados"`) — 33-vertex, visibly concave/irregular polygon (verified live today, not a square/symmetric shape that could hide an axis swap). Its first vertex reprojects to `lon=-49.3620, lat=-16.8039` — inside Goiânia, and asymmetric enough that swapping lat/lon would place it far outside any sane bounding box (at `lon=-16.80, lat=-49.36}` it would fail a `-90<=lat<=90` sanity check outright, catching the bug even without a hardcoded expected value).

### Pattern 4: Simplify AFTER reprojection is validated, using mapshaper via npx

**What:** Convert Esri JSON → plain GeoJSON (`{type:"Feature", geometry:{type:"Polygon", coordinates: rings}}`) in WGS84 first, then pipe through `mapshaper` for simplification — do not simplify in UTM and reproject after (reprojection is cheap and exact; simplification tolerance is easier to reason about in already-final WGS84 coordinates, and this avoids simplifying twice if the script is re-run with a different projection later).
**Example:**
```bash
# Source: verified live against the real 1,206-feature dataset today
npx --yes mapshaper@0.6 -i wgs84_raw.geojson snap -simplify 10% keep-shapes -o format=geojson precision=6 bairros-goiania.json
```
**Verified sizing (today, live data):** raw WGS84 GeoJSON (no simplification) ≈ 4.0MB uncompressed; simplified at `-simplify 10% keep-shapes` ≈ 565KB uncompressed / **~142KB gzipped** — matching STACK.md's ~150KB gzipped target from the milestone research. Coordinate `precision=6` (~11cm at the equator) is already far more precise than needed for city-zoom rendering and is a second, independent size lever if 142KB proves too heavy after real-world testing (`precision=4`, ~11m, would shrink it further with no visible loss at city zoom).

### Anti-Patterns to Avoid

- **Trusting the unpaginated default response as "complete" without an explicit page loop:** today it happens to return all 1,206 features because `maxRecordCount` is very high, but DADOS-02 requires the script to *prove* completeness by paging, not rely on today's server config being permanent.
- **Re-deriving the EPSG:31982 definition from a library's built-in EPSG:31982/generic UTM-22S alias:** always copy the app's literal proj4 string. This is the single most load-bearing rule in this phase given the project's UTM zone-22-vs-23 history.
- **Simplifying without `keep-shapes` (or equivalent topology awareness) and shipping self-intersections silently:** plain Douglas-Peucker at 10% (no topology mode) produced 1,023 unrepairable self-intersecting rings in live testing today; `keep-shapes` reduces this materially (down to 295) but does not eliminate it — this is a real, measured limitation to disclose in the build report, not paper over (see Common Pitfalls).
- **Building the drill-down on an `id`↔`cdbairro` lookup table:** the join-integrity investigation (below) shows these are different administrative units with no reliable key; Phase 3 must keep using viewport/envelope queries as already decided.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| UTM → WGS84 coordinate reprojection | A custom formula/algorithm for UTM zone 22S | `pyproj.Transformer` fed the app's exact proj4 string | This project has already shipped a production bug (zone 23 vs 22 → "pino na Bahia") from hand-derived projection assumptions. `pyproj` + the exact same string removes an entire bug class for the cost of one `pip install`. |
| Polygon simplification with preserved shared borders | A hand-written Douglas-Peucker/Visvalingam implementation | `mapshaper` (via `npx`, no permanent dependency) | Topology-aware simplification (shared-border consistency across adjacent polygons) is a genuinely hard problem; mapshaper is maintained, widely used, and was verified today against the actual dataset — reinventing this for a one-time build script is not a good use of effort and risks worse results than an off-the-shelf tool with known limitations. |
| ArcGIS pagination / retry-on-transient-error | A bespoke fetch loop from scratch | `atualizar-caixa.py`'s existing `http()`/pagination pattern, extended | The repo already solved backoff, `Retry-After` handling, and the ArcGIS `{error:...}` response shape (which HTTP-200s on some failure modes) — copy that pattern rather than re-solving it. |

**Key insight:** every "don't hand-roll" item on this list maps to a documented, already-experienced failure mode in this exact codebase (UTM bug, fragile endpoint, silent truncation). This phase's job is to not repeat any of them in a new pipeline.

## Live Re-Verification (2026-07-04) — supersedes PROJETO-radar.md §4 / ROADMAP-radar.md §0

All queries below were executed live today against `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/`.

### 1. Layer 2 (Divisas de Bairro) — geometry, count, fields

```
GET .../Feature_Base/MapServer/2?f=json
→ geometryType: "esriGeometryPolygon"
→ spatialReference: {"wkid":31982,"latestWkid":31982}
→ fields include: id (string, len 12), nm_bai (string, len 80), plus 20+ demographic/admin fields unused by this project

GET .../Feature_Base/MapServer/2/query?where=1=1&returnCountOnly=true&f=json
→ {"count":1206}

GET .../Feature_Base/MapServer/2/query?where=1=1&outFields=id&returnGeometry=false&f=json
→ 1,206 features returned in a single unpaginated call, exceededTransferLimit: absent/false
→ maxRecordCount for this layer: 1,000,000 (from the layer's ?f=json metadata) — this is WHY the single call
  isn't truncated today; it is not evidence that pagination is unnecessary in general.

GET .../Feature_Base/MapServer/2/query?where=1=1&outFields=id,nm_bai&returnGeometry=false&f=json
→ of the 1,206 features, 466 have a null or blank/whitespace-only nm_bai (rural "Gleba" parcels
  with no assigned neighborhood name — confirmed by inspecting sample records, tp_bai="Glb")
```
**Confidence: HIGH — [VERIFIED: live ArcGIS query, 2026-07-04]. The 1,206 count is confirmed as the true total (server's own `returnCountOnly` matches the unpaginated feature count), but the build script must still page explicitly per the locked decision — this is a "trust but verify structurally" situation, not a "skip pagination" one.**

### 2. Layer 2 — native GeoJSON output + WGS84 cross-check

```
GET .../Feature_Base/MapServer/2/query?where=id='000400000603'&outFields=id,nm_bai&returnGeometry=true&f=geojson
→ 200 OK, type:"FeatureCollection", crs: EPSG:4326 (server reprojects itself when f=geojson is used)
→ first coordinate: [-49.361969478843676, -16.803910354898505]
```
Cross-checked against the app's own reprojection (`radar-goiania.html`'s `proj4.defs`/`toWGS()`) and against `pyproj` fed the identical proj4 string, for the same UTM point `(674557.5108, 8141415.6708)`:

| Path | Result (lon, lat) |
|------|--------------------|
| App's `toWGS()` (proj4.js, browser) | `-49.36196947884371, -16.80391035542131` |
| `pyproj.Transformer` (identical proj4 string) | `-49.36196947884371, -16.803910355421312` |
| ArcGIS server `f=geojson` (server-side reprojection) | `-49.361969478843676, -16.803910354898505` |

All three agree to ~9 decimal places. **Confidence: HIGH — [VERIFIED: three independent live/local computations, 2026-07-04].** This does not change the locked decision (still reuse the app's exact proj4 string, never re-derive) — it confirms that decision produces mathematically correct results, and gives an independent oracle (`f=geojson`) that could be used as a spot-check in tests if desired.

### 3. Layer 3 (Cadastro Imobiliário) — `returnGeometry=true` re-confirmed working

```
GET .../Feature_Base/MapServer/3/query?where=cdbairro=3&outFields=*&returnGeometry=true&resultRecordCount=1&f=json
→ 200 OK, geometryType:"esriGeometryPolygon", features[0].geometry present, spatialReference wkid:31982

GET .../Feature_Base/MapServer/3/query?where=cdbairro=3&outFields=cdbairro,vlvenal&returnGeometry=false&resultRecordCount=1&f=json
→ {"error":{"code":400,"message":"Failed to execute query."}}  — outFields restriction (must be "*") STILL HOLDS
```
**Confidence: HIGH — [VERIFIED: live, 2026-07-04].** This directly confirms the phase's required doc correction: `returnGeometry=true` **works** on layer 3 (contradicting the current text of `PROJETO-radar.md §4` and `ROADMAP-radar.md §0`). The other layer-3 quirk — `outFields` must be `*`, specific field lists 400 — is **unchanged and still true**, and must be preserved in the doc correction, not removed.

### 4. Distinct `cdbairro` count on layer 3 — confirms the 709 figure

```
GET .../Feature_Base/MapServer/3/query?where=cdbairro>0&outFields=cdbairro&returnDistinctValues=true&returnGeometry=false&f=json
→ 709 distinct values (no resultRecordCount needed — request without an explicit page size returned all 709
  without truncation; a request WITH resultRecordCount=2000 unexpectedly 400'd, which is itself a minor,
  newly-observed quirk worth a one-line footnote: distinct-value queries on this server appear to reject an
  explicit resultRecordCount in some combinations — omit it for distinct-value queries)
```
**Confidence: HIGH — [VERIFIED: live, 2026-07-04].** Confirms `ROADMAP-radar.md §0`'s existing "709 setores distintos" figure is still accurate and current.

## Join Integrity Report (DADOS-02)

**Question:** are layer 2's 1,206 bairro polygons (`id`/`nm_bai`) and layer 3's 709 `cdbairro` tax-sector codes the same administrative unit under two names, or genuinely different units?

**Finding: genuinely different units. Do not build a lookup table between them.**

Evidence gathered live today:
1. **Count mismatch is structural, not a data-quality glitch:** 1,206 vs 709 is not "1,206 truncated down to 709" or vice versa — both counts were independently confirmed complete (layer 2's `returnCountOnly` matches its full feature fetch; layer 3's distinct-value query returned 709 with no truncation warning).
2. **466 of the 1,206 layer-2 polygons have no name (`nm_bai` null/blank)**, tagged `tp_bai="Glb"` (Gleba — a rural/unplotted land parcel, not a named neighborhood). A `cdbairro` tax-sector code, by contrast, is by definition a taxable, described sector — there is no equivalent "unnamed sector" concept on layer 3. This alone proves the two layers model different things: layer 2 includes raw geographic/cartographic subdivisions (some literally unnamed), while layer 3's `cdbairro` is a fiscal classification.
3. **No naming/key convention bridges them:** layer 2's `id` is a 12-character code (e.g. `000400000603`) with no visible resemblance to layer 3's small-integer `cdbairro` codes (e.g. `3`). There is no field on layer 2 that stores a `cdbairro`-shaped value, and no field on layer 3 that stores a 12-character `id`-shaped value.

**Conclusion for the build script:** report the two counts (1,206 vs 709) and this root-cause explanation in the output report, but do **not** attempt to construct or ship an `id → cdbairro` mapping. This confirms and closes out the locked decision — Phase 3's drill-down should keep using viewport/envelope spatial queries against layer 0 (as `refreshLots()` already does today), which requires no join at all.

## Alternative Source Evaluation: Prefeitura CKAN GeoJSON

**Verdict: rejected as primary source. Live ArcGIS layer 2 wins on completeness and currency.**

| Property | Live ArcGIS layer 2 | CKAN `bai.json` |
|---|---|---|
| Feature count | 1,206 [VERIFIED live 2026-07-04] | 1,155 [VERIFIED: downloaded and parsed today] |
| Last updated | Continuously maintained (same service the app already depends on for lots/quadras) | **2018-09-18** [CITED: dadosabertos.goiania.go.gov.br dataset page] — 8 years stale relative to today |
| Overlap with live | — | 1,139 of CKAN's 1,155 ids also exist live; 16 CKAN ids do NOT exist in the live layer (likely retired/merged boundaries); live has 66 ids not present in CKAN at all (likely newer subdivisions) |
| Declared CRS | `wkid:31982` (from service metadata) | `{"type":"name","properties":{"name":"EPSG:31982"}}` embedded in the file itself — matches, but the dataset's public description page does **not** mention any CRS, so this can only be trusted by inspecting the file directly, not the catalog page |
| Format/access | ArcGIS REST JSON or native GeoJSON (`f=geojson`) | Static JSON file, ~5MB, direct HTTP download, several other formats also offered (CSV/KMZ/Shapefile/PDF data dictionary) |
| Fragility | Same server as the rest of the app (documented 502-under-load risk, but this is a one-time offline build, not a runtime dependency) | Static file host — likely more stable to fetch, but stale data is a worse failure mode than an occasional retry |

**Recommendation:** use live layer 2 exclusively. Document this evaluation in the build script's header comment (or the companion report) so a future maintainer doesn't rediscover CKAN and assume it's equivalent — it is measurably behind and slightly incomplete relative to what the app already depends on elsewhere.

## Common Pitfalls

### Pitfall 1: Simplification introduces self-intersections that "look fine" at city zoom but break stricter consumers later
**What goes wrong:** Running plain Douglas-Peucker simplification (`-simplify dp 10%`, no topology mode) on the live dataset today produced **1,023 unrepairable self-intersecting rings** out of 1,206 features. Adding `keep-shapes` (topology-aware mode) reduced this to 295 unrepairable intersections — better, but not zero.
**Why it happens:** Many of the 1,206 polygons are small, adjacent, or share boundaries (block-level Glebas next to named bairros); independent per-feature simplification without shared-vertex awareness creates edges that cross.
**How to avoid:** Use `mapshaper`'s `keep-shapes` mode (verified today to help materially) and treat the remaining ~295 intersections as an accepted, documented limitation for this phase — Leaflet renders each GeoJSON polygon independently for visual display, so self-intersections in supporting/rarely-viewed polygons are a cosmetic risk, not a functional blocker, for the Phase 3 rendering use case. Do not silently ship this without a note in the build report; a future feature that needs true planar topology (e.g., point-in-polygon bairro lookup) would need a different, stricter simplification pass.
**Warning signs:** Any future feature doing exact point-in-polygon or area calculations against this asset should re-validate against the raw (unsimplified) source, not assume the shipped file's polygons are topologically clean.

### Pitfall 2: Trusting "it returned everything in one call" as proof of completeness
**What goes wrong:** Today, a single unpaginated query against layer 2 returns all 1,206 features because the server's `maxRecordCount` is configured to 1,000,000 — far above the true count. A build script that treats "no `resultOffset` needed" as a discovered fact (rather than paginating regardless) will silently start truncating data if the server's config ever changes (e.g., an admin resets `maxRecordCount` to a more typical 1,000 or 2,000).
**Why it happens:** ArcGIS's `exceededTransferLimit` flag is the only signal of truncation, and it's easy to test once, see it absent, and stop worrying about it.
**How to avoid:** Page explicitly (Pattern 1 above) regardless of today's apparent non-truncation, and have the script assert `len(all_features) == returnCountOnly_result` as a hard failure condition, exactly as DADOS-02 requires.
**Warning signs:** If a future re-run of the script reports fewer than ~1,200 features with no error, that is a signal the server's paging behavior changed — surface it loudly, don't silently ship a truncated file.

### Pitfall 3: Re-deriving the EPSG:31982 definition "for convenience" via a library alias
**What goes wrong:** `pyproj.CRS.from_epsg(31982)` or a JS library's built-in "EPSG:31982" definition may not be byte-identical to the app's manual `+towgs84=0,0,0,0,0,0,0` string in every PROJ/library version — and this project has already shipped a production bug from exactly this class of subtle projection mismatch (zone 22 vs 23).
**Why it happens:** It's tempting to type `EPSG:31982` instead of copy-pasting a long proj4 string, especially in a language switch (Python vs. JS).
**How to avoid:** Copy the literal string from `radar-goiania.html` line 568 into the build script as a constant, with a comment pointing back to that exact line, so future edits to either file are traceable.
**Warning signs:** Any reprojected coordinate landing outside Goiânia's known bounding box (~lat -16.85 to -16.55, lon -49.45 to -49.15) during the smoke test.

## Code Examples

### Complete-ish sketch of the build script flow

```python
# Source: this research (2026-07-04), following atualizar-caixa.py's http()/retry conventions
import json
from pyproj import Transformer

LAYER2_URL = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/2/query"
PROJ4_31982 = "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"  # radar-goiania.html:568, copied verbatim — do not re-derive

def main():
    # 1. Get authoritative total via returnCountOnly (independent check)
    total = arcgis(LAYER2_URL, {"where": "1=1", "returnCountOnly": "true"})["count"]
    print(f"1/5 layer 2 reports {total} total features (returnCountOnly)")

    # 2. Page explicitly until exhausted; assert count matches step 1
    features = fetch_all_bairros(page_size=500)
    assert len(features) == total, f"pagination mismatch: got {len(features)}, server reports {total}"
    print(f"2/5 paginated fetch collected {len(features)} features — matches, complete")

    # 3. Reproject every ring using the app's exact proj4 string
    to_wgs = Transformer.from_crs(PROJ4_31982, "EPSG:4326", always_xy=True)
    geojson_features = []
    named, unnamed = 0, 0
    for feat in features:
        attrs = feat["attributes"]
        rings = [[list(to_wgs.transform(x, y)) for x, y in ring] for ring in feat["geometry"]["rings"]]
        nm = (attrs.get("nm_bai") or "").strip() or None
        named += 1 if nm else 0
        unnamed += 0 if nm else 1
        geojson_features.append({
            "type": "Feature",
            "properties": {"id": attrs["id"], "nm_bai": nm},
            "geometry": {"type": "Polygon", "coordinates": rings},
        })
    print(f"3/5 reprojected {len(geojson_features)} features ({named} named, {unnamed} unnamed/Gleba)")

    # 4. Smoke-test an irregular, known bairro to catch axis-order/zone regressions
    campos_dourados = next(f for f in geojson_features if f["properties"]["id"] == "000400000603")
    lon, lat = campos_dourados["geometry"]["coordinates"][0][0]
    assert -49.45 < lon < -49.15 and -16.85 < lat < -16.55, \
        f"reprojection smoke test FAILED: Campos Dourados landed at lon={lon}, lat={lat} — outside Goiânia"
    print("4/5 irregular-shape smoke test passed (Campos Dourados inside expected bbox)")

    # 5. Write raw WGS84 GeoJSON, then hand off to mapshaper (invoked separately) for simplification,
    #    and write the join-integrity + completeness report
    with open("bairros-goiania.wgs84-raw.json", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": geojson_features}, f)
    write_report(total, named, unnamed)  # see Validation Architecture
    print("5/5 wrote raw GeoJSON — run mapshaper next to produce bairros-goiania.json")

if __name__ == "__main__":
    main()
```

## State of the Art

| Old Approach (documented, now superseded) | Current Approach | When Changed | Impact |
|---|---|---|---|
| `PROJETO-radar.md §4`: "layer 3 rejects `returnGeometry=true`" | Layer 3 accepts `returnGeometry=true` and returns real polygons | Confirmed live 2026-07-04 (unclear if this was ever true, or changed silently server-side — undocumented third-party behavior) | The whole milestone's premise shifts from "source geometry" to "expose and orchestrate existing geometry" |
| Manually maintained bairro rendering assumption (none existed before) | Static, pre-simplified, build-time GeoJSON asset | This phase | Removes ~1,206-feature live fetch from the home screen's critical path against a documented 502-under-load endpoint |

**Deprecated/outdated:** The CKAN `bai.json` export (2018) should be treated as outdated relative to the live ArcGIS layer for any future work — it is not merely "an alternative format," it is measurably behind.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ~142KB gzipped at `-simplify 10% keep-shapes` will look visually acceptable at city zoom (11-13) — verified as a size number today, but not visually inspected in a browser | Architecture Patterns / Pattern 4 | If simplification is too aggressive, bairro shapes may look noticeably blocky; mitigated by mapshaper being easy to re-run with a different tolerance — not a one-way door |
| A2 | 295 remaining unrepairable self-intersections after `keep-shapes` will not cause visible Leaflet rendering artifacts | Common Pitfalls / Pitfall 1 | Leaflet renders each polygon's rings independently via Canvas/SVG path fill-rule; self-intersecting rings can occasionally produce unexpected fill holes (even-odd fill rule) in the affected ~24% of features — worth a visual spot-check during Phase 3, not blocking for this phase since it's a rendering concern, not a data-generation one |

**If validated during planning/execution, downgrade these to [VERIFIED] or adjust the simplification tolerance accordingly.**

## Open Questions (RESOLVED)

> Both questions below are substantively resolved: each carries a concrete recommendation that Phase 1's plan operationalizes verbatim (10%/precision=6; ~295 self-intersections documented as an accepted limitation). Any remaining judgment is deferred to Phase 3 visual QA, not blocking Phase 1.

1. **Exact simplification tolerance / precision to ship** — RESOLVED (ship 10%/precision=6; re-tune deferred to Phase 3 QA)
   - What we know: `-simplify 10% keep-shapes precision=6` produces ~142KB gzipped, matching the milestone's ~150KB target, with 295 residual self-intersections.
   - What's unclear: Whether a human reviewer will find 10% too aggressive or too conservative once rendered in the actual Leaflet map at Phase 3 — this can't be fully judged from raw byte counts alone.
   - Recommendation: Ship at 10%/precision=6 as the default in this phase (meets the byte budget, passes the geometric smoke test), but keep the simplification step as a clearly separated, easily-rerunnable command (not baked irreversibly into a single monolithic script step) so Phase 3 can request a re-tune without redoing the fetch/reproject/join-report work.

2. **Whether to keep the ~295 residual self-intersecting rings, or invest more effort eliminating them**
   - What we know: They exist, are a minority (~24%) of features, and are a known limitation of mapshaper's topology repair on this specific dataset.
   - What's unclear: Whether any of the 295 affected polygons are commonly-viewed bairros (vs. obscure unnamed Glebas) — not yet cross-referenced by name/frequency of use.
   - Recommendation: Document as a known limitation in the build report (per DADOS-02's "document" spirit) rather than block this phase on a deeper topology fix; revisit only if Phase 3 visual QA finds an actually-visible artifact in a commonly-viewed bairro.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | Build script runtime | ✓ | 3.12.10 | — |
| pip / PyPI reachability | Installing `pyproj` | ✓ [VERIFIED: live install today] | pip 26.0.1 | — |
| pyproj | Reprojection | ✓ (installable) [VERIFIED: installed 3.7.2 today] | 3.7.2 | Node + proj4 (also verified reachable via `npm view proj4` → 2.20.9) if Python path is blocked |
| Node.js / npx | Running `mapshaper` without a permanent install | ✓ | Node 24.16.0, npx 11.13.0 | — |
| npm registry reachability | `npx mapshaper@0.6` | ✓ [VERIFIED: ran live today against the full dataset] | mapshaper 0.6.x resolved | Hand-written simplification (not recommended — see Don't Hand-Roll) |
| Live ArcGIS endpoint (`portalmapa.goiania.go.gov.br`) | Source data fetch | ✓ [VERIFIED: multiple live queries today] | n/a (third-party, no SLA) | CKAN static export (rejected as primary — see Alternative Source Evaluation), but usable as a documented emergency fallback if the live server is ever fully unreachable during a re-run |

**Missing dependencies with no fallback:** None — every dependency needed for this phase was verified reachable and working today.

**Missing dependencies with fallback:** None currently missing; noted fallbacks above are for future resilience (e.g., if PyPI or the live ArcGIS server becomes unreachable during a re-run), not blockers today.

## Validation Architecture

This phase ships a one-time offline script and a static data artifact — there is no running application to test against, and no existing test framework in the repo (`atualizar-caixa.py` has no test suite either; it's validated by its own printed progress/counts). Validation here means **the build script proves its own correctness at generation time**, plus one lightweight manual/CI-able check on the output artifact.

### Self-Validation Built Into the Build Script

| Check | Mechanism | Failure Mode |
|-------|-----------|--------------|
| Pagination completeness | Compare `len(all_features)` after paging against a separate `returnCountOnly=true` query; hard-fail (raise/`SystemExit`) on mismatch | Script exits non-zero, prints the discrepancy — matches `atualizar-caixa.py`'s existing pattern of aborting rather than writing a "furado" (holed) artifact |
| Duplicate-across-pages guard | Track seen `id`s while accumulating pages; raise if any `id` repeats | Catches a mis-implemented offset/page-size loop before it silently produces a corrupt or duplicated dataset |
| Reprojection sanity (irregular shape) | Assert Campos Dourados (`id=000400000603`) reprojects to `lon ∈ (-49.45,-49.15)`, `lat ∈ (-16.85,-16.55)` | Hard-fails the script if the proj4 string is wrong, mis-copied, or axis order is swapped — this is the concrete implementation of the locked "validate against an irregular bairro shape" decision |
| Output well-formedness | After writing, re-open and `json.load()` the output file; assert `type=="FeatureCollection"`, assert every feature has `geometry.type=="Polygon"` and non-empty `coordinates` | Catches truncated writes or malformed JSON before commit |
| Size budget | After the mapshaper simplification step, check the output file's gzipped size (`gzip -c file | wc -c`, or Python's `gzip` module) and warn (not hard-fail) if it exceeds ~200KB | Keeps the "lightweight asset" success criterion measurable and enforced, without being so strict that a legitimate future growth (e.g., if Goiânia annexes new bairros) breaks the build |
| Join-integrity report | Print/write counts: total layer-2 features, named vs. unnamed, distinct `cdbairro` count from layer 3, and the root-cause explanation (different administrative units) | Satisfies DADOS-02's explicit documentation requirement as a generated artifact, not just prose in this RESEARCH.md |

### Reprojection Smoke Check (guards the UTM-zone-22 / coordinate-order regression)

As detailed in Pattern 3 and the code example above: reproject the known-irregular `Campos Dourados` polygon and assert its first vertex lands inside a hand-checked Goiânia bounding box. This single assertion would have caught the project's historical "zone 23 instead of 22" bug (which placed a pin ~6° away, in Bahia) and would catch a `[lat,lon]`/`[lon,lat]` order swap (which would produce an assertion failure on the `-90<=lat<=90` implicit bound, since Goiânia's UTM easting values are numerically in the thousands, wildly out of latitude range).

### Output Well-Formedness + Size Budget Check

Recommended as a small, separate, rerunnable check (a few lines, not a framework):
```python
# Source: this research — a minimal, dependency-free post-build check
import json, gzip, os

def validate_output(path="bairros-goiania.json", max_gzip_kb=200):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)  # raises if malformed JSON
    assert data.get("type") == "FeatureCollection"
    assert len(data["features"]) > 0
    for feat in data["features"]:
        assert feat["geometry"]["type"] == "Polygon"
        assert len(feat["geometry"]["coordinates"][0]) >= 3
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    gz_size_kb = len(gzip.compress(raw)) / 1024
    status = "OK" if gz_size_kb <= max_gzip_kb else "WARNING: exceeds budget"
    print(f"validate_output: {len(data['features'])} features, {gz_size_kb:.1f} KB gzipped — {status}")
```

### Sampling Rate
- **Per script run:** all self-validation assertions above run automatically every time the script executes (they are the script's own success criteria, not a separate suite).
- **Phase gate:** before `/gsd-verify-work`, run the build script end-to-end once, confirm it exits 0, and visually eyeball the printed report (feature count ≈1,206, named/unnamed split, gzipped size, join-integrity summary) against the numbers in this RESEARCH.md.

### Wave 0 Gaps
- None — this phase does not require a pytest/jest-style test framework. The build script's own assertions ARE its test suite, consistent with `atualizar-caixa.py`'s existing precedent of "abort loudly rather than write a bad artifact" instead of a separate test file.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Build script has no auth surface (public, unauthenticated ArcGIS endpoint, same as existing `atualizar-caixa.py`) |
| V3 Session Management | No | No session state — one-shot offline script |
| V4 Access Control | No | No access control surface introduced |
| V5 Input Validation | Yes | The build script consumes data from a third-party server it doesn't control; validate shape (see Validation Architecture) before trusting it as an app asset. `nm_bai` and other string fields should still be treated as untrusted text if ever rendered via `innerHTML` in Phase 3 (existing `esc()` helper in `radar-goiania.html` already covers this pattern — reuse it, don't introduce a second escaping mechanism) |
| V6 Cryptography | No | No cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Untrusted third-party JSON parsed and later rendered as HTML (bairro names via `nm_bai`) | Tampering / Spoofing (a compromised or malicious upstream ArcGIS response could inject a payload into a name field) | This phase only generates the static asset (no rendering) — mitigation applies to Phase 3's consumption of it: continue using the existing `esc()`/`textContent` escaping discipline already established for other API-sourced strings in `radar-goiania.html`, per the existing (already-implemented) XSS fix noted in `ROADMAP-radar.md` item 8. No new risk introduced by this phase, but flagging so Phase 3 doesn't treat the static file as "safe because it's local" — it's still third-party-sourced text. |
| Build script downloads and executes nothing untrusted (no `eval`, no remote code execution) | — | `atualizar-caixa.py`'s existing pattern (plain `json.loads`, no dynamic code execution) is safe and should be followed identically here — no JSONP/callback pattern needed for a one-time offline script (no CORS/browser constraint applies outside the browser) |

## Sources

### Primary (HIGH confidence)
- Live ArcGIS server queries against `Feature_Base/MapServer/{2,3}` — executed directly today, 2026-07-04: layer metadata (`?f=json`), feature counts (`returnCountOnly`), full unpaginated fetch, native `f=geojson` reprojection, layer-3 `returnGeometry=true` re-test, layer-3 `outFields` restriction re-test, distinct `cdbairro` count
- `radar-goiania.html` (read directly, lines 568-569, 671-684, 813, 820) — exact proj4 string, `toWGS()` implementation, existing `BAISVC`/`mostrarBairro()` consumption pattern
- `atualizar-caixa.py` (read directly, full file) — existing Python build-script conventions: `http()` retry/backoff, `arcgis()` wrapper, output-write pattern
- Direct download and inspection of `http://www4.goiania.go.gov.br/daber/dadosabertos/sedetec/geoespaciais/bai.json` (CKAN export) — feature count, field shape, embedded CRS, id-overlap comparison against live layer 2
- `mapshaper@0.6` CLI, invoked live via `npx` against the full 1,206-feature dataset (converted from Esri JSON to plain GeoJSON) — verified simplification behavior, size outputs, and self-intersection counts at multiple tolerance settings (`dp 10%` plain, `keep-shapes` at 10% and 5%, `visvalingam 8%`)
- `pyproj` 3.7.2, installed live via `pip`, used to cross-check reprojection of the app's exact proj4 string against both the app's own JS output and ArcGIS's native `f=geojson` output
- `node`/`npm view proj4` — confirmed npm registry reachability and current proj4 version (2.20.9), as a documented fallback path if the Python toolchain were unavailable

### Secondary (MEDIUM confidence)
- `https://dadosabertos.goiania.go.gov.br/dataset/bairros` (WebFetch) — dataset last-updated date (2018-09-18) and resource file listing for the CKAN alternative; page content is third-party and could theoretically be stale itself, but the 2018 date is corroborated by the CKAN file's own content being visibly behind the live layer

### Tertiary (LOW confidence)
- None — every claim in this document was either verified live today or cited from a directly-fetched, dated source page.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Python/pyproj/mapshaper availability and behavior all verified live today against this exact dataset, not assumed from general knowledge
- Architecture: HIGH — pagination, reprojection, and simplification patterns all tested against the real 1,206-feature production dataset
- Pitfalls: HIGH — self-intersection counts, pagination edge cases, and reprojection cross-checks are all measured numbers from today's live testing, not theoretical concerns

**Research date:** 2026-07-04
**Valid until:** ~7 days for the live-endpoint-specific findings (undocumented, unversioned third-party server — re-verify `returnGeometry=true` and the 1,206/709 counts immediately before implementation if more than a few days pass); ~30 days for the tooling recommendations (Python/pyproj/mapshaper availability is stable infrastructure, unlikely to change quickly)
