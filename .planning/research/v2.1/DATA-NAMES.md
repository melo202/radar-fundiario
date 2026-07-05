# Research: Bairro-Name Reconciliation + CNEFE Logradouro Feasibility (v2.1)

**Researched:** 2026-07-04 (live re-verification during this session)
**Domain:** GIS data reconciliation (ArcGIS layer 2 vs layer 3) + IBGE CNEFE 2022 distillation for a single-file, no-backend PWA
**Confidence:** HIGH — every load-bearing claim below was verified live today: direct ArcGIS REST queries (GET and POST), a live CNEFE 2022 download (120.8MB, full Goiânia extraction), and direct inspection of the current `gerar-bairros.py`/`radar-goiania.html` code paths that consume these fields.

---

## Part 1 — Bairro-Name Reconciliation

### 1.1 Root cause, confirmed and now measured precisely

Layer 2 (`Divisas de Bairro`, 1,206 polygons, fields `id`/`nm_bai`) and layer 3 (`Cadastro Imobiliário`, a **parcel-level** layer — one row per lot/building, ~310k rows, fields `cdbairro`/`nmbairro`, 709 distinct `cdbairro` codes) are different administrative units, as Phase 1's research already established. What Phase 1 did **not** test — because it was out of scope then — is whether the two layers' *names* can be reconciled by text matching alone. This session tested that directly, live, and the answer is unambiguous:

**Text/string matching between `nm_bai` and `nmbairro` fails almost completely — do not attempt it.**

| Method tested | Exact match rate | Live evidence |
|---|---|---|
| Raw normalized string equality (accent-strip, uppercase) | **2 of 655** distinct named layer-2 names (0.3%) | `nm_bai="Campos Dourados"` vs `nmbairro="RES CAMPOS DOURADOS"` — never equal as strings |
| + the app's own `PFX` prefix-expansion table (`RES→Residencial`, `JD→Jardim`, etc., already in `radar-goiania.html:1000-1013`) applied to layer-3 names | **3 of 655** (0.5%) | Expansion helps in principle but layer-2 names have their own independent spelling/numbering conventions ("Buena Vista II" vs no layer-3 equivalent at all in some cases) that no prefix table fixes |

This confirms textual reconciliation (name-normalization matching) is **not viable** as the primary method. It is not merely "imperfect" — it fails on ~99.5% of cases, so it cannot even serve as a majority pass with manual cleanup for the rest.

### 1.2 The authoritative source: `nmbairro` (layer 3), joined spatially

**Layer 3's `nmbairro` (and its `cdbairro` code) is the authoritative bairro name.** Reasons, all verified live today:

1. It is the field the search combo (`loadBairros()`, `radar-goiania.html:1016-1029`) already uses and the field embedded on every one of the ~310k cadastral parcels (`nmbairro` in `outFields=*` results, e.g. `finish()`/detail panel at lines 844, 1526, 1835, 1863) — it is the name the rest of the app already treats as ground truth for a given lot.
2. It has **no unnamed/blank case** — every taxable parcel has a `cdbairro`/`nmbairro` (verified: layer 3's distinct-value query returns 709 clean values, no nulls/blanks in the sample).
3. `nm_bai` (layer 2), by contrast, is independently maintained, has **466 of 1,206 blank** (`tp_bai="Glb"` — rural glebas), and — newly discovered this session — has **visible mojibake/encoding corruption** on some accented names (live-observed: `'Petr�polis'`, `'Para�so'`, `'Ana L�cia'`, `'das Na��es'` — the `�` replacement character appears where an accented character should be). `nmbairro` on layer 3 did not show this corruption in any sample checked.

**Recommendation: use `nmbairro`/`cdbairro` (layer 3) as the authoritative name, reconciled onto layer 2's polygons via spatial join — not string matching.**

### 1.3 Reconciliation method: spatial join with name-assisted disambiguation (verified live, concrete algorithm)

This is the only method verified to work reliably. Live evidence, gathered today with real ArcGIS queries against both layers:

**Step 1 — POST, not GET, for the spatial query.** GET queries with a layer-2 polygon's geometry embedded in the URL failed unpredictably on the live server today:
```
GET .../3/query?geometry={rings...}&geometryType=esriGeometryPolygon&...
→ HTTP 414 Request-URI Too Long (for polygons with 55+ vertices)
→ HTTP 404 Not Found (intermittent, even for smaller polygons — server quirk, not size-related)
```
Switching the identical parameters to a POST body (`urllib.request.Request(..., method="POST")`, form-encoded) eliminated both failure modes across 35 live test polygons (0 errors). **This is a new, previously undocumented quirk of this ArcGIS server** — add to the project's endpoint-quirks list: *"spatial queries with polygon geometry must use POST; GET intermittently 404s or 414s for realistic (30+ vertex) polygons."*

**Step 2 — for each layer-2 polygon, find candidate `cdbairro`s by spatial intersect:**
```
POST .../Feature_Base/MapServer/3/query
  geometry={"rings": <layer-2 polygon rings>, "spatialReference": {"wkid": 31982}}
  geometryType=esriGeometryPolygon
  inSR=31982
  spatialRel=esriSpatialRelIntersects
  where=cdbairro>0
  outFields=cdbairro,nmbairro
  returnDistinctValues=true
  returnGeometry=false
  f=json
```
Verified live (Campos Dourados, `id=000400000603`): returns exactly one candidate, `(956, "RES CAMPOS DOURADOS")` — a clean, unambiguous match to `nm_bai="Campos Dourados"`.

**Step 3 — when there are multiple candidates (common — verified live: of 35 sampled polygons, more than half intersected 2+ distinct `cdbairro`s), disambiguate by combining parcel-count majority vote with name-similarity to the existing `nm_bai`:**

```
POST .../Feature_Base/MapServer/3/query  (repeated per candidate cdbairro)
  geometry=<same polygon>  geometryType=esriGeometryPolygon  inSR=31982
  spatialRel=esriSpatialRelIntersects
  where=cdbairro=<candidate>
  returnCountOnly=true
```
This gives a per-candidate parcel count (verified live example — `id=000400000431` "Solar Ville" intersects 4 sectors: `771→2487 parcels`, `892→1`, `170→820`, `176→38`; the winner by count, 771 "RES SOLAR VILLE", is also the obvious name match).

**Important verified failure mode of pure majority-vote:** `id=000400000103`, `nm_bai="Ofugi"`, intersects `113 "VI SANTA HELENA"` (59 parcels, a larger neighboring sector) and `114 "VI OFUGI"` (only 7 parcels, its true match) and `692 "RES MORUMBI"` (1 parcel). **Pure majority-by-count would wrongly assign "Ofugi" the name "Vila Santa Helena."** The fix, verified to resolve this correctly: when the existing `nm_bai` (even if it's the "wrong"/inconsistent legacy name) normalized-substring-matches one of the candidates' names, prefer that candidate over the raw majority-count winner. `norm("Ofugi") in norm("VI OFUGI")` → `True`, correctly picks 114 over the count-majority 113.

**Concrete algorithm to implement in `gerar-bairros.py`:**
```
for each layer-2 polygon:
  1. POST spatial distinct-value query -> candidates = [(cdbairro, nmbairro), ...]
  2. if 0 candidates: unresolved (empty/vacant land, no parcels yet — keep nm_bai as-is, or null)
  3. if 1 candidate: winner = that candidate  (no ambiguity)
  4. if 2+ candidates:
       a. fetch parcel count per candidate (POST returnCountOnly, one call per candidate)
       b. if nm_bai is non-blank AND norm(nm_bai) is a substring of exactly one candidate's
          normalized nmbairro (or vice versa): winner = that name-matched candidate
       c. else: winner = candidate with the highest parcel count (majority vote)
  5. emit properties: {id, nm_bai_original, cdbairro, nmbairro_reconciled}
     — keep nm_bai_original for audit/diff, do not silently discard it
```

**Cost/feasibility of running this for all 1,206 polygons:** verified live timing on 20 polygons (with the multi-candidate disambiguation path exercised) = ~13 seconds, ~2.85 calls/polygon average (1 distinct-value call + ~1.85 count calls for ambiguous cases). Extrapolated to 1,206 polygons: **~13–15 minutes, ~3,400 HTTP calls total.** This is an offline, one-time (or occasionally re-run) build step — same tier of cost as the existing `gerar-bairros.py` run, not a runtime concern. Recommend adding the same retry/backoff (`http()` helper already in the script) since this is 3,400+ round trips against a documented 502-under-load endpoint; batch with small delays (e.g. 0.2–0.3s) as tested here to avoid hammering the server.

**Unnamed glebas (466 records):** verified live that some genuinely have **zero intersecting parcels** (`id=000400000843`, `000400000846` in the live sample) — real vacant/unplotted land with no cadastral lots yet. These cannot be named by this method because there is nothing to join against; this is expected and correct, not a bug. Recommendation: label these explicitly (e.g. `"Área rural / sem parcelamento"` — the app already renders a fallback string `"Área rural / gleba"` for blank `nm_bai` at `radar-goiania.html:912/922`, so this case is **already handled gracefully in the UI** and needs no UI change). For glebas that DO intersect parcels but have blank `nm_bai`, the spatial join can still recover a real name from layer 3 — these should now get a name where today they show the generic fallback.

### 1.4 Changes to `gerar-bairros.py`

Concrete diff to the existing script (already read in full, `C:\Users\bruno\Documents\Projeto Radar Fundiário\gerar-bairros.py`):

1. After Step 4 (reprojection) and before Step 5 (write raw JSON), insert a new **Step 4.5 — reconcile names via spatial join** that runs the algorithm above per feature, using the *already-reprojected-to-nothing* (still-UTM) `rings` — the spatial join must run in the source EPSG:31982 coordinates (both layers are natively 31982; reprojecting first and then sending WGS84 coordinates as `inSR=31982` would silently corrupt every join). Confirmed live: layer 2's raw `geometry.rings` from the ArcGIS response are already the correct UTM coordinates to feed directly into layer 3's spatial query — no extra step needed, just don't discard them before the join.
2. Add `nmbairro_reconciled` and `cdbairro_reconciled` (or `null` if 0 candidates) to each feature's `properties`, alongside the existing `id`/`nm_bai` (kept, renamed conceptually to "original" in the report, not removed — needed for audit and for the "how many names actually changed" report metric).
3. Extend `write_report()` with a new section: reconciliation summary — how many of 1,206 got a reconciled name, how many differ from the original `nm_bai` (i.e., how many were actually wrong/fixed), how many stayed unresolved (0 candidates), and a sample diff table (old vs new name) for spot-checking.
4. The mojibake corruption in `nm_bai` (discovered live this session, e.g. `Petr�polis`) is a strong independent argument for switching the *displayed* name to `nmbairro_reconciled` even in cases where the join is unambiguous and the underlying bairro is "the same" — it fixes an encoding bug for free.
5. **New pitfall to add to the script's docstring/report:** *POST, not GET, for all layer-3 spatial queries in this script* — GET 404s/414s intermittently for realistic polygon vertex counts; this is a newly observed, previously undocumented ArcGIS server quirk (add alongside the existing documented quirks: `outFields=*` restriction on layer 3, 502-under-load).

### 1.5 Does this break the v2.0 viewport-based drill? Confirmed: no.

Read directly from `radar-goiania.html` (lines 908-951):
- `highlightBairro(layer)` reads `layer.feature.properties.nm_bai` purely to set tooltip text (`layer.setTooltipContent(lbl)`) — a cosmetic string, no logic depends on its value.
- `drillBairro(layer)` computes `layer.getBounds()` (a Leaflet geometry method operating on the polygon's own coordinates, independent of any property) and calls `showBreadcrumb(layer.feature.properties.nm_bai)` — again, breadcrumb text only.
- `showBreadcrumb(nm)` writes `nm` via `textContent` (zero injection risk, confirmed) into a DOM node — display-only.
- **Nowhere does drill/zoom logic key off the name field or any `id`/`cdbairro` value.** The entire v2.0 drill-down is envelope/viewport-based (`map.fitBounds(b.pad(0.05))`), exactly as Phase 1's research concluded and locked in. Renaming `nm_bai` → a reconciled `nmbairro` value only changes what string is displayed in the tooltip/breadcrumb; it changes zero code paths that affect zoom, bounds, or the lot-drill spatial queries.

**This is purely a data/display fix — safe, additive, and does not touch `refreshLots()`, `onMapClick()`, `loadCi()`, or any spatial query logic.**

### 1.6 What to do with the 466 unnamed glebas — updated recommendation

Given the spatial join now available:
- **Glebas that spatially intersect ≥1 cadastral parcel:** assign the reconciled name from the join (some will get named for the first time — a net improvement over today's 466-blank state).
- **Glebas with 0 intersecting parcels (genuinely vacant/unplotted land):** keep the existing fallback UI string (`"Área rural / gleba"`) — already implemented, no change needed. Do not fabricate a name.
- Ship the exact count of "recovered from blank" vs "still blank" in the regenerated `bairros-goiania.report.md`, so this is auditable (matches the project's "auditável linha a linha" core value).

---

## Part 2 — CNEFE 2022 Feasibility for Logradouro Validation/Autocomplete

### 2.1 Source verified live

```
HEAD https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/UF/52_GO.zip
→ HTTP 200, Content-Length: 120,818,046 bytes (120.8 MB), Last-Modified: 2024-05-20
→ Access-Control-Allow-Origin: * (CORS-open, though irrelevant for an offline build script)
```
Confirmed live: this is a **whole-state** file (all of Goiás, every municipality), not Goiânia-specific — there is no per-municipality CNEFE download; the state-level zip must be fetched and filtered locally.

**Field dictionary** (`Dicionario_CNEFE_Censo_2022.xls`, downloaded and parsed live today) confirms the relevant columns: `COD_MUNICIPIO`, `CEP`, `DSC_LOCALIDADE` (informal neighborhood/loteamento name — often more granular/current than either bairro layer), `NOM_TIPO_SEGLOGR` (street type: RUA/AVENIDA/etc., pre-separated from the name), `NOM_TITULO_SEGLOGR` (honorific/title, e.g. "Senador"), `NOM_SEGLOGR` (bare street name), `NUM_ENDERECO`, `LATITUDE`/`LONGITUDE`, `NV_GEO_COORD` (geocoding-quality flag: 1=original Census coordinate … 6=census-sector-level estimate only).

### 2.2 Extraction result (live, this session)

```
Full 52_GO.csv (uncompressed inside the zip): 671,111,016 bytes (671 MB), single CSV, all of Goiás
Goiânia only (COD_MUNICIPIO=5208707), filtered live: 777,018 address rows
```

Goiânia's municipality code (`5208707`) was confirmed against a live sample row (a different municipality's code, `5218805` = Rio Verde, appeared first in the file, cross-checked against public IBGE municipality-code references).

### 2.3 Distilled logradouro asset — three size options, all measured live

| Asset shape | Unique entries | Raw size | Gzip size |
|---|---|---|---|
| Names only (`TIPO + NOME`, e.g. `"RUA DAS PALMEIRAS"`), sorted, JSON array of strings | 9,789 | 154.9 KB | **39.3 KB** |
| Names + up to 5 `DSC_LOCALIDADE` (loteamento/bairro hints) + up to 3 CEP prefixes per street | 9,789 | 691.5 KB | **116.8 KB** |
| (for comparison) Live cadastre's own distinct `nmlogradou` values (already reachable at runtime via `returnDistinctValues`, no static asset needed) | 10,457 | — | — (fetched live, not shipped) |

**Recommendation: ship the "names + localidade hints" variant (~117 KB gzipped)** — it fits comfortably alongside the existing `bairros-goiania.json` (~167 KB gzipped) in the app's asset budget, and the localidade/CEP hints are what make it useful for *disambiguation* (e.g., "Rua 228" exists in multiple loteamentos across the city — CNEFE's `DSC_LOCALIDADE` can help the search suggest "Rua 228, Jardins do Cerrado 4" instead of a bare, ambiguous street name). The names-only variant (39 KB) is a fallback if the byte budget is tight.

### 2.4 Match quality against the existing cadastral `nmlogradou` — verified, with an important caveat

Live comparison (normalized, prefix-stripped using the app's own `ruaCore()`/`TIPOVIA` regex from `radar-goiania.html:1006-1007`):

```
Cadastro (layer 3) distinct normalized street cores: 9,975
CNEFE (Goiânia) distinct normalized street cores:      9,021
Exact overlap:                                          3,576  (~36–40%)
```

**This looks low, but the root cause (verified with concrete examples) is tokenization drift, not data disagreement:**
```
Cadastro nmlogradou: "R  228A", "R  228B", "R  228C", "R  228"   (no space before suffix letter)
CNEFE NOM_SEGLOGR:   "228", "228 A", "228 B", "228 C"            (space before suffix letter)
```
Both sources describe the same streets; a slightly more permissive normalization (strip spaces entirely before the final alphanumeric-suffix comparison, not just accent/case) would recover a large share of this apparent gap. **This is a real implementation detail for whoever builds the matching layer, not a feasibility blocker** — treat CNEFE as a *fuzzy validation/suggestion* layer (did-you-mean, autocomplete ranking, "this street exists in these bairros"), not a strict equality gate against the live cadastre. The live cadastre's `nmlogradou` (queried via `returnDistinctValues`, already free at runtime, no CNEFE needed for correctness) remains the source of truth for what the search actually filters on — CNEFE only pre-populates/ranks suggestions before the user's query hits the live endpoint.

### 2.5 How CNEFE plugs into the existing search (concrete integration point)

Current state (read directly from `radar-goiania.html`): the address search path (lines 1190-1227) builds a `WHERE nmlogradou LIKE '%...%'` clause from user input, with no client-side autocomplete/validation of street names today — the user's typed fragment goes straight to the live ArcGIS endpoint on every keystroke-debounced query. `loadBairros()` (line 1016) is the one existing precedent for a pre-fetched, in-memory `COMBO` array used for local fuzzy matching before hitting the network (used for the bairro input, not the street input).

**Recommended integration, following that same precedent:**
1. Build-time: distill `logradouros-goiania.json` (the ~117KB variant above) via a new script (`gerar-logradouros.py`, sibling to `gerar-bairros.py`, same `http()`/retry conventions, same "offline build, not runtime" pattern already established) — download the 120MB CNEFE zip, filter to `COD_MUNICIPIO=5208707`, distill to unique `(tipo, nome)` + top localidades/CEPs, write the static JSON.
2. Runtime: `fetch('logradouros-goiania.json')` once (same lazy/progressive-enhancement pattern as `loadBairroPolys()` — failure is silent, search still works via the live endpoint if this fails to load).
3. As the user types in the address/street field, match against the **in-memory CNEFE list first** (instant, offline, same normalization discipline as `ruaCore()`) to (a) offer autocomplete suggestions before the network round-trip, and (b) catch obvious typos/normalize abbreviations client-side.
4. The actual data fetch still goes to the live cadastral endpoint exactly as today (`nmlogradou LIKE ...`) — CNEFE never replaces the authoritative source, it only makes the *input experience* faster/friendlier, consistent with the project's "núcleo cadastral 100% determinístico" constraint (no new dependency is introduced into the actual data path, only into the UI's suggestion layer).

### 2.6 CNEFE licensing/attribution

IBGE data is public domain / open government data; the existing `INTELIGENCIA-radar.md` already lists "IBGE" among the footer attributions to include when CNEFE-derived data is used — no new legal/LGPD concern (CNEFE address records used here are aggregated to street-name level, not exposing individual household data; no name/CPF/personal fields exist in the columns actually used for this feature).

---

## Summary of Answers

### (a) Authoritative name source + reconciliation method

**Authoritative source: `nmbairro`/`cdbairro` (layer 3)** — it's what the rest of the app already trusts, has zero blanks, and (newly discovered) doesn't carry the mojibake encoding corruption found live in some `nm_bai` values.

**Reconciliation method: spatial join (POST, `esriSpatialRelIntersects`), not name matching.** Name matching was tested live and fails on ~99.5% of cases due to independent abbreviation/spelling conventions between the two layers — it is not a viable primary or supplementary method. The spatial join, with a name-assisted disambiguation tie-break for the common multi-candidate case (verified live: >50% of sampled polygons intersect 2+ cadastral sectors), is the concrete, tested algorithm. Estimated build cost: ~13–15 minutes / ~3,400 HTTP calls for all 1,206 polygons, a one-time/occasional offline build step.

### (b) `gerar-bairros.py` changes

Insert a new reconciliation step between reprojection and file-write that runs the spatial-join algorithm per polygon (in UTM coordinates, before/independent of WGS84 reprojection), emits both the original and reconciled name/code in each feature's properties (audit trail), and extends the existing `.report.md` with a reconciliation summary (recovered-from-blank count, changed-name count, still-unresolved count, sample diffs). New documented server quirk to record: layer-3 spatial queries must use POST (GET 404s/414s intermittently for realistic polygons).

### (c) CNEFE distillation plan + size + integration

Download the 120.8MB `52_GO.zip` (whole-state, no per-municipality download exists), filter to `COD_MUNICIPIO=5208707` (777,018 Goiânia address rows, verified live), distill to unique street name + top localidade/CEP hints. **Recommended shipped asset: ~117 KB gzipped** (9,789 unique streets with hints) or **~39 KB gzipped** (names only, fallback if budget-constrained). Integrates as a client-side, pre-fetched autocomplete/suggestion layer ahead of the existing live-endpoint search — never replaces the live cadastral `nmlogradou` as the actual filter source, preserving the "núcleo determinístico" constraint. Match rate against the live cadastre's own distinct street names is ~36-40% on strict normalization, but the gap is explained by tokenization drift (space-before-suffix-letter conventions differing), not genuine disagreement — treat as fuzzy-suggest, not a strict gate.

### (d) Confirms the fix doesn't break the v2.0 viewport-based drill

**Confirmed by direct code read.** `drillBairro()`/`highlightBairro()`/`showBreadcrumb()` in `radar-goiania.html` use `layer.feature.properties.nm_bai` exclusively for display strings (tooltip, breadcrumb `textContent`). The actual zoom/fitBounds logic uses `layer.getBounds()`, a Leaflet method independent of any property value. Renaming the displayed field to a reconciled `nmbairro` value is a pure data/display change with zero risk to drill/zoom behavior.

---

## Sources

### Primary (HIGH confidence — all verified live today, 2026-07-04)
- Live ArcGIS queries against `Feature_Base/MapServer/{2,3}` (this session): GET vs POST spatial-query behavior, `returnDistinctValues`/`returnCountOnly` per-candidate counts, mojibake in `nm_bai` samples, layer-3 field list (`?f=json` metadata)
- `radar-goiania.html` (read directly, lines 661, 844-951, 1000-1227, 1526-1863) — `highlightBairro`/`drillBairro`/`showBreadcrumb`, `PFX`/`ruaCore`/`displayName`, search-combo consumption of `nmbairro`/`cdbairro`/`nmlogradou`
- `gerar-bairros.py` (read directly, full file) — existing build-script structure, `http()`/`arcgis()` helpers, current join-integrity report content
- `bairros-goiania.report.md` (read directly) — current generation numbers (1206/740/466/709), current mapshaper simplification notes
- `.planning/milestones/v2.0-phases/01-.../01-RESEARCH.md` (read directly) — Phase 1's root-cause finding (different administrative units), locked decision against an `id↔cdbairro` lookup
- Live download of `https://ftp.ibge.gov.br/.../CSV/UF/52_GO.zip` (120,818,046 bytes) and its embedded `52_GO.csv` (671,111,016 bytes uncompressed); live filter to `COD_MUNICIPIO=5208707` (777,018 rows)
- Live download of `Dicionario_CNEFE_Censo_2022.xls` — full field layout confirmed by direct parse

### Secondary (MEDIUM confidence)
- Goiânia's IBGE municipality code (5208707) — corroborated by web search against multiple independent citation pages, cross-checked against a live CNEFE row for a different, correctly-identified municipality (Rio Verde, 5218805) in the same file

### Tertiary (LOW confidence)
- None — every claim above was either verified live this session or directly read from project files.
