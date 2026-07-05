---
phase: 01-dataset-est-tico-de-bairros-corre-o-de-docs
plan: 01
subsystem: dataset-bairros
tags: [geodata, arcgis, geojson, mapshaper, pyproj, build-script]
dependency-graph:
  requires: []
  provides:
    - "bairros-goiania.json (static WGS84 bairro polygons, shipped artifact)"
    - "gerar-bairros.py (offline, re-runnable build script)"
    - "check-bairros-geojson.py (standalone smoke check)"
    - "bairros-goiania.report.md (join-integrity + completeness + simplification report)"
  affects:
    - "Phase 3 (home map — will consume bairros-goiania.json to paint bairro polygons)"
tech-stack:
  added:
    - "pyproj 3.7.2 (one-time build-time dependency, not runtime)"
    - "mapshaper 0.6.x (invoked via npx --yes, no permanent Node footprint)"
  patterns:
    - "Explicit resultOffset pagination with hard completeness assert (len==returnCountOnly)"
    - "OBJECTID (not business-key id) used as the pagination duplicate guard"
    - "Reprojection via the app's exact proj4 string, never a library EPSG alias"
key-files:
  created:
    - gerar-bairros.py
    - bairros-goiania.wgs84-raw.json
    - bairros-goiania.json
    - bairros-goiania.report.md
    - check-bairros-geojson.py
  modified: []
decisions:
  - "Pagination duplicate guard keys on OBJECTID, not the business-layer `id` field — `id` was found to be non-unique in the live source (one real collision: id=000400001169 across OBJECTID 13171 and 31584)"
  - "mapshaper 0.6.x `precision=` output flag takes a decimal tolerance (e.g. 0.000001), not an integer digit-count — using precision=6 as originally planned silently nulled all 1206 geometries"
  - "No id->cdbairro lookup table built anywhere, per DADOS-02 — 1206 (layer 2 bairros) and 709 (layer 3 cdbairro tax sectors) confirmed as distinct administrative units with no reliable join key"
metrics:
  duration: "~45 minutes"
  completed: "2026-07-04"
---

# Phase 1 Plan 01: Dataset Estático de Bairros Summary

Offline Python build script fetches all 1,206 Goiânia bairro polygons from the public ArcGIS layer 2 with explicit pagination, reprojects them to WGS84 using the app's exact proj4 string, and ships a mapshaper-simplified, ~167KB-gzip GeoJSON (`bairros-goiania.json`) plus an audit report documenting pagination completeness and the 1206-vs-709 bairro↔cdbairro join non-equivalence.

## What Was Built

- **`gerar-bairros.py`** — offline build script (Python 3, stdlib + `pyproj`). Reuses `atualizar-caixa.py`'s `http()`/`arcgis()`/`UA` verbatim. Pages layer 2 explicitly via `resultOffset` (page size 500, `orderByFields=OBJECTID` for deterministic ordering), asserts `len(features) == returnCountOnly` (1206), reprojects UTM 31982 → WGS84 using the literal proj4 string copied from `radar-goiania.html:568`, smoke-tests the irregular bairro Campos Dourados (`id=000400000603`) against Goiânia's bbox, writes the raw WGS84 GeoJSON, queries layer 3's distinct `cdbairro` count (709), and writes `bairros-goiania.report.md`.
- **`bairros-goiania.wgs84-raw.json`** — intermediate, unsimplified WGS84 GeoJSON (1206 features, ~5.3MB uncompressed).
- **`bairros-goiania.json`** — shipped artifact: mapshaper-simplified (`-simplify 10% keep-shapes precision=0.000001`), 1206 features, well-formed `FeatureCollection` of `Polygon`, 166.6 KB gzipped (within the ~200KB hard budget; slightly above the ~142KB research estimate due to live-data variance).
- **`bairros-goiania.report.md`** — audit report: pagination completeness, named (740) vs. unnamed/Gleba (466) split, the 1206-vs-709 join-integrity root cause (distinct administrative units, no lookup built), the `id` non-uniqueness finding, the CKAN rejection rationale, and the mapshaper simplification command/sizes/limitations.
- **`check-bairros-geojson.py`** — standalone, dependency-free (stdlib `json`/`gzip`/`sys`) smoke check. Validates well-formedness, computes gzip size (warns non-fatally above 200KB), and (`--check-irregular`) re-confirms Campos Dourados reprojects inside Goiânia. Exits non-zero on malformed/wrong-type input (verified against three synthetic bad fixtures before running against the real artifact).

## Verification

- `python gerar-bairros.py --verify` exits 0: total=1206, named=740, unnamed=466, cdbairro_distinct=709 — all matching the 2026-07-04 live-verified research figures exactly.
- `python check-bairros-geojson.py bairros-goiania.json` → `1206 features, 166.6 KB gzipped — OK`, exit 0.
- `python check-bairros-geojson.py --check-irregular bairros-goiania.json` → Campos Dourados at `lon=-49.3620, lat=-16.8039`, inside Goiânia bbox, exit 0.
- No `id→cdbairro` lookup table exists anywhere in `gerar-bairros.py` (confirmed by inspection — only reporting, no dict/table construction).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pagination duplicate-guard used the wrong key (`id` instead of `OBJECTID`)**
- **Found during:** Task 1, first `--verify` run
- **Issue:** The plan's pattern (and this project's own research) assumed `id` was a reliable per-feature key for the cross-page duplicate guard. Live testing showed `id="000400001169"` genuinely exists on two distinct features (OBJECTID 13171 with `nm_bai=null`, OBJECTID 31584 with `nm_bai=" "`) — a real data-quality issue in the source, not a pagination bug. The original guard aborted the build (`RuntimeError`) on this legitimate, complete dataset.
- **Fix:** Switched the duplicate guard to key on `OBJECTID` (the true ArcGIS primary key) and added `orderByFields=OBJECTID` for deterministic page ordering. The `id` collision is now tracked separately and surfaces as a non-fatal warning plus a documented finding in `bairros-goiania.report.md`, which also reinforces the plan's existing "no id-keyed lookup" decision.
- **Files modified:** `gerar-bairros.py`, `bairros-goiania.report.md`
- **Commit:** `f8b3438`

**2. [Rule 1 - Bug] mapshaper `precision=` flag silently nulled all geometry**
- **Found during:** Task 2
- **Issue:** The plan's exact command (`precision=6`) ran without error but produced a `bairros-goiania.json` where all 1206 features had `geometry: null` — a silent data-loss failure. Root cause: mapshaper 0.6.x's `-o precision=` flag expects a decimal coordinate tolerance (e.g. `0.000001` for ~6 decimal places / ~11cm), not an integer "number of decimal digits." `precision=6` was interpreted as "round to the nearest 6-unit grid," which in decimal-degree coordinates collapses every vertex to an identical point, and the GeoJSON writer emits `null` geometry for the resulting degenerate rings.
- **Fix:** Verified via a step-by-step isolation (no-op conversion, then adding `-simplify`, then testing `precision=` values) that `precision=0.000001` produces the intended ~6-decimal-place output with all 1206 polygons intact. Documented the finding prominently in `bairros-goiania.report.md` so a future re-run of the build doesn't repeat this exact silent failure.
- **Files modified:** `bairros-goiania.json` (regenerated correctly), `bairros-goiania.report.md`
- **Commit:** `0988ce0`

## Known Stubs

None. All artifacts contain real, live-fetched, fully-reprojected and simplified data — no placeholders, no empty defaults, no mock data.

## Self-Check: PASSED

- FOUND: `gerar-bairros.py`
- FOUND: `bairros-goiania.wgs84-raw.json`
- FOUND: `bairros-goiania.json`
- FOUND: `bairros-goiania.report.md`
- FOUND: `check-bairros-geojson.py`
- FOUND commit `f8b3438` (Task 1: gerar-bairros.py + raw GeoJSON + report)
- FOUND commit `0988ce0` (Task 2: simplified bairros-goiania.json + report Simplification section)
- FOUND commit `9d1d664` (Task 3: check-bairros-geojson.py)
- `python gerar-bairros.py --verify` exits 0 — VERIFIED
- `python check-bairros-geojson.py --check-irregular bairros-goiania.json` exits 0 — VERIFIED
