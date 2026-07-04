---
phase: 01-dataset-est-tico-de-bairros-corre-o-de-docs
reviewed: 2026-07-04T19:51:39Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - gerar-bairros.py
  - check-bairros-geojson.py
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-07-04T19:51:39Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed `gerar-bairros.py` and `check-bairros-geojson.py`, the two offline build/check scripts added in Phase 1. Both are one-shot, human-supervised, stdlib-plus-pyproj scripts with no runtime footprint in the shipped app — severity is calibrated accordingly (a crash with a traceback in a script a developer is watching is not the same risk class as a crash in a served request handler).

The core correctness properties the plan called out are verified correct by inspection:
- The `PROJ4_31982` constant (`gerar-bairros.py:76`) is byte-for-byte identical to `radar-goiania.html:568` (`+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`) — confirmed by direct comparison. It is never re-derived.
- The pagination duplicate-guard correctly keys on `OBJECTID` (`gerar-bairros.py:121-124`), not the non-unique business `id` field, matching the documented live finding (`id=000400001169` collision) in `01-01-SUMMARY.md`.
- GeoJSON coordinates are written `[lon, lat]` (`to_wgs.transform` with `always_xy=True` returns `(lon, lat)`; `gerar-bairros.py:252`), which is correct GeoJSON axis order and intentionally differs from the app's own `toWGS()` (which returns `[lat, lon]` for its own Leaflet-specific internal use) — this is not a bug, just a different (correct) convention for a different consumer.
- No `id -> cdbairro` lookup table is constructed anywhere; the join discrepancy (1206 vs 709) is only reported, matching DADOS-02's requirement.
- No secrets, credentials, or PII (`dtnascimen` or otherwise) appear in either script. `outFields` in every query is explicitly scoped (`OBJECTID,id,nm_bai` / `cdbairro`), never `*`.
- `http()`/`arcgis()`/`UA` in `gerar-bairros.py:36-72` are a verbatim, correct reuse of `atualizar-caixa.py:20-56`'s retry/backoff pattern, as the plan required.

Two Warning-level gaps and three Info-level polish items were found — none block shipping, but are worth a look given the "defensive JSON parsing of a third-party endpoint" goal stated in the script's own docstring.

## Warnings

### WR-01: Reprojection loop has no defensive guard against missing/null geometry

**File:** `gerar-bairros.py:249-254`
**Issue:** The docstring (lines 8, and the plan's threat model T-01-01) states the script parses a third-party ArcGIS endpoint defensively. However, the reprojection loop accesses `feat["geometry"]["rings"]` unconditionally:
```python
for feat in features:
    attrs = feat["attributes"]
    rings = [
        [list(to_wgs.transform(x, y)) for x, y in ring]
        for ring in feat["geometry"]["rings"]
    ]
```
If any feature in the paginated response has `"geometry": null` (a legitimate possibility for a public ArcGIS layer — e.g. a bad/void record), this raises a bare `TypeError: 'NoneType' object is not subscriptable` deep in a list comprehension, rather than the script's own established pattern elsewhere (`SystemExit` with a clear Portuguese message identifying which record and why). It happened not to matter on 2026-07-04's live data (1206/1206 features had geometry), so this is latent, not currently triggered.
**Fix:** Guard before reprojecting, consistent with the script's existing `SystemExit` style:
```python
for feat in features:
    attrs = feat["attributes"]
    geom = feat.get("geometry")
    if not geom or not geom.get("rings"):
        raise SystemExit(
            f"ERRO: feature OBJECTID={attrs.get('OBJECTID')} id={attrs.get('id')!r} "
            "sem geometria (rings ausente/nulo) — verifique a fonte antes de prosseguir."
        )
    rings = [
        [list(to_wgs.transform(x, y)) for x, y in ring]
        for ring in geom["rings"]
    ]
```

### WR-02: `check-bairros-geojson.py` only validates the first ring of each polygon

**File:** `check-bairros-geojson.py:43-45`
**Issue:**
```python
coords = geom.get("coordinates")
if not coords or len(coords[0]) < 3:
    raise ValueError(f"feature #{i} tem anel com menos de 3 pontos: {coords!r}")
```
Only `coords[0]` (the outer ring) is length-checked. A polygon with a valid outer ring but a degenerate interior ring (hole) with fewer than 3 points — e.g. a mapshaper simplification artifact — would pass this smoke check silently. Given `01-01-SUMMARY.md` documents mapshaper `keep-shapes` leaves ~295 residual self-intersecting rings as an accepted limitation, a similarly-shaped degenerate-hole edge case is plausible for future re-runs of the simplification step.
**Fix:** Check every ring, not just the outer one:
```python
for ring_idx, ring in enumerate(coords):
    if len(ring) < 3:
        raise ValueError(
            f"feature #{i} tem anel #{ring_idx} com menos de 3 pontos: {ring!r}"
        )
```
This is a smoke check, so calibrate effort accordingly — the fix is a one-line loop change, low cost for meaningfully better coverage of the exact class of defect (mapshaper degeneracy) this script exists to catch.

## Info

### IN-01: `dup_business_ids` warning print is unbounded

**File:** `gerar-bairros.py:133-138`
**Issue:**
```python
if dup_business_ids:
    print(
        f"    aviso: {len(dup_business_ids)} valor(es) de `id` (campo de negocio) "
        f"repetido(s) em OBJECTIDs distintos (dado de origem, nao bug de paginacao): "
        f"{sorted(dup_business_ids)}"
    )
```
If the source data quality regresses and dozens/hundreds of `id` collisions appear in a future re-run, this dumps the entire sorted list to stdout unbounded. Currently there's exactly one known collision, so this is purely a "what if this scales" note, not a current problem.
**Fix:** Cap the inline list and refer to the full detail already written to the report:
```python
sample = sorted(dup_business_ids)[:10]
suffix = f" (+{len(dup_business_ids) - 10} mais, ver relatorio)" if len(dup_business_ids) > 10 else ""
print(f"    aviso: {len(dup_business_ids)} valor(es) de `id` repetido(s): {sample}{suffix}")
```

### IN-02: Smoke-test bbox constants (`IRREGULAR_ID`, `BBOX_LON`, `BBOX_LAT`) duplicated verbatim across both files

**File:** `gerar-bairros.py:78-80` and `check-bairros-geojson.py:16-18`
**Issue:** The same three constants are hand-copied identically in both scripts. Not currently a bug (values match), but it is a maintenance hazard: if the smoke-test bbox or the reference bairro ever needs adjusting (e.g. Goiânia's admin boundary is redrawn, or a different irregular-shape exemplar is chosen), it's easy to update one file and forget the other, silently weakening one of the two reprojection regression guards.
**Fix:** Given these are two independent, intentionally-standalone scripts (per each file's own docstring — `check-bairros-geojson.py` explicitly says "standalone, sem dependencia externa"), a shared import would work against that design goal. Lower-cost mitigation: add a one-line comment in each file pointing at the other, so a future editor knows to check both:
```python
IRREGULAR_ID = "000400000603"  # Campos Dourados — mantido em sincronia com gerar-bairros.py; atualize ambos se mudar
```

### IN-03: `pyproj` import is deferred to inside `main()` rather than top-level

**File:** `gerar-bairros.py:244`
**Issue:** `from pyproj import Transformer` appears mid-`main()` rather than with the other imports at the top of the file (lines 28-30). This means a missing `pyproj` install fails late (after the network fetch and pagination already succeeded) rather than immediately at script start, wasting a live round-trip against the fragile ArcGIS endpoint if the one-time `pip install pyproj` step was skipped.
**Fix:** Move to the top-level import block:
```python
import json, sys, time
import urllib.request, urllib.parse
from datetime import date
from pyproj import Transformer
```
Minor: this also matches the plan's own framing of `pyproj` as a normal one-time build dependency, not something to lazy-load.

---

_Reviewed: 2026-07-04T19:51:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
