---
phase: 01-dataset-est-tico-de-bairros-corre-o-de-docs
verified: 2026-07-04T20:15:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 1: Dataset Estático de Bairros + Correção de Docs Verification Report

**Phase Goal:** A home tem um dataset de bairros confiável, versionado e offline — sem depender do endpoint ArcGIS no carregamento inicial — e a documentação do projeto reflete a realidade verificada do endpoint. (No UI — rendering is Phase 3.)
**Verified:** 2026-07-04
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A static WGS84 GeoJSON of bairro polygons exists in the repo, generated offline, with no ArcGIS fetch on app load | ✓ VERIFIED | `bairros-goiania.json` exists (734,103 bytes), `radar-goiania.html` has 0 references to `bairros-goiania.json` and no recent commits touching it — confirms Phase 3 (not this phase) will wire runtime loading |
| 2 | The build script proves pagination completeness by asserting `len(features) == returnCountOnly` and reporting the final count (~1206) | ✓ VERIFIED | `gerar-bairros.py` line 236-241: `if len(features) != total: raise SystemExit(...)`. Live re-run of `python gerar-bairros.py --verify` today reproduces exactly: total=1206, named=740, unnamed=466, cdbairro_distinct=709 |
| 3 | The build script documents the 1206-vs-709 join discrepancy as a root-caused finding, and builds NO id→cdbairro lookup | ✓ VERIFIED | `bairros-goiania.report.md` §"Integridade do join" gives structural root cause (different admin units, no join key); `grep -c "lookup\|dict.*cdbairro"` in `gerar-bairros.py` shows only prose/report references, no dict/table construction — confirmed by direct code read (lines 142-225) |
| 4 | An irregular bairro (Campos Dourados, id=000400000603) reprojects into Goiânia's WGS84 bbox, proving reuse of the app's exact proj4 string | ✓ VERIFIED | `python check-bairros-geojson.py --check-irregular bairros-goiania.json` → exit 0, `lon=-49.3620, lat=-16.8039` inside bbox. `gerar-bairros.py` line 76 has the proj4 string verbatim from `radar-goiania.html:568` |
| 5 | The shipped GeoJSON is well-formed (FeatureCollection of Polygons) and within size budget | ✓ VERIFIED | `python check-bairros-geojson.py bairros-goiania.json` → `1206 features, 166.6 KB gzipped — OK`, exit 0. Direct inspection: `type=FeatureCollection`, all 1206 geometries are `Polygon`, 0 null geometries |
| 6 | PROJETO-radar.md §4 no longer claims the layer-3 endpoint rejects returnGeometry=true; states it works (verified 2026-07-04) | ✓ VERIFIED | Line 49: `**Aceita** \`returnGeometry=true\` nesse endpoint (verificado ao vivo em 2026-07-04)`. `grep -c "Rejeita.*returnGeometry"` returns 0 |
| 7 | ROADMAP-radar.md §0 reflects that returnGeometry=true works on layer 3 | ✓ VERIFIED | Line 15: `\`returnGeometry=true\` (camada 3) \| **Aceita** — retorna polígono real (~+19% payload); reconfirmado 2026-07-04` |
| 8 | The still-true outFields=* restriction and other quirks (502 under load) are PRESERVED, not removed | ✓ VERIFIED | PROJETO-radar.md line 48 (outFields=* restriction) untouched; ROADMAP-radar.md line 14 (outFields row) untouched |
| 9 | The correction is dated 2026-07-04 and flags undocumented third-party server behavior with no SLA | ✓ VERIFIED | PROJETO-radar.md line 49 ends: "servidor de terceiro, não documentado e sem SLA — reconfirmar antes de depender dele" |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `gerar-bairros.py` | Offline build script: paginated fetch, reprojection, smoke assert, raw GeoJSON + report emit | ✓ VERIFIED | Exists (15,886 bytes). Contains proj4 string verbatim, `resultOffset` pagination, `000400000603` smoke test, `returnDistinctValues` layer-3 query, no id→cdbairro lookup construction |
| `bairros-goiania.json` | Simplified, committed WGS84 bairro polygons consumed by Phase 3 | ✓ VERIFIED | FeatureCollection, 1206 features, all Polygon, 0 nulls, 166.6 KB gzip |
| `bairros-goiania.report.md` | Join-integrity + completeness report (1206 vs 709 root cause) | ✓ VERIFIED | Contains "709", full root-cause prose, mapshaper simplification section, self-intersection limitation documented |
| `check-bairros-geojson.py` | Standalone smoke check: well-formedness, size budget, irregular-bairro bbox | ✓ VERIFIED | Exists (3,632 bytes), contains `000400000603`, runs against shipped artifact, exits 0 both modes |
| `PROJETO-radar.md` | Corrected §4 endpoint-quirks section | ✓ VERIFIED | `returnGeometry` corrected, dated, outFields preserved |
| `ROADMAP-radar.md` | Corrected §0 validated-facts table | ✓ VERIFIED | New row added, dated, prior rows preserved |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `gerar-bairros.py` | ArcGIS layer 2 `/MapServer/2/query` | explicit `resultOffset` pagination | ✓ WIRED | Live re-run today reproduces exact figures (1206/740/466/709) — proves the pagination loop actually talks to the real endpoint and is not a canned/mocked result |
| `gerar-bairros.py` | `radar-goiania.html:568` proj4 string | verbatim constant fed to `pyproj.Transformer` | ✓ WIRED | String matches exactly; irregular-bairro smoke test passes, which would fail immediately on a wrong zone/axis (documented project history: "zone 22-vs-23 pino na Bahia bug") |
| `check-bairros-geojson.py` | `bairros-goiania.json` | `json.load` + Polygon assertions + gzip size + Campos Dourados bbox | ✓ WIRED | Both check modes run against the real shipped file and pass |
| `PROJETO-radar.md §4` | `01-RESEARCH.md §3` live re-verification | `returnGeometry=true works` + `outFields=*` still required | ✓ WIRED | Text matches the verified facts (19% payload delta, 2026-07-04 date) |
| `ROADMAP-radar.md §0` | `01-RESEARCH.md §3` | validated-facts table row | ✓ WIRED | Row content matches verified facts exactly |

### Data-Flow Trace (Level 4)

Not applicable in the traditional sense (no UI/component data flow this phase — explicitly deferred to Phase 3). Instead, the equivalent check is: does the build script produce real data from the real endpoint, not static/mocked values?

| Artifact | Data Source | Produces Real Data | Status |
|----------|-------------|---------------------|--------|
| `bairros-goiania.wgs84-raw.json` / report figures | Live ArcGIS `arcgis()` calls in `gerar-bairros.py` | Yes — re-ran `--verify` live today, exact match to committed report (1206/740/466/709) | ✓ FLOWING |
| `bairros-goiania.json` | `bairros-goiania.wgs84-raw.json` via mapshaper simplification (documented, re-runnable command) | Yes — 1206 real Polygon geometries, 0 nulls, correct coordinates | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Well-formedness + size budget check on shipped artifact | `python check-bairros-geojson.py bairros-goiania.json` | `1206 features, 166.6 KB gzipped — OK`, exit 0 | ✓ PASS |
| Irregular-bairro reprojection guard | `python check-bairros-geojson.py --check-irregular bairros-goiania.json` | `Campos Dourados em lon=-49.3620, lat=-16.8039 (dentro de Goiania)`, exit 0 | ✓ PASS |
| Full build script against live public endpoint | `python gerar-bairros.py --verify` | `VERIFY OK: total=1206 named=740 unnamed=466 cdbairro_distinct=709`, exit 0 — figures exactly match the committed report | ✓ PASS |
| No id→cdbairro lookup constructed | Direct code read of `gerar-bairros.py` (write_report + main, lines 142-317) | Only reporting prose referencing cdbairro count; no dict/table keyed by `id` mapping to `cdbairro` | ✓ PASS |
| radar-goiania.html not modified for bairro loading (Phase 3 scope) | `grep -c "bairros-goiania" radar-goiania.html` → 0; `git log -- radar-goiania.html` shows no phase-1 commits | No runtime fetch/reference added | ✓ PASS |

**Note:** re-running `--verify` regenerated `bairros-goiania.wgs84-raw.json` and `bairros-goiania.report.md` in the working tree (expected, since the script always overwrites these two outputs). The regenerated report lacked the Task-2-appended "Simplificação" section, which `write_report()` does not itself produce — this is by design per the plan ("intentionally separate and re-runnable" step). Restored both files to their committed state via `git checkout --` after the check to leave the working tree clean; this is a verification artifact, not a defect.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DADOS-01 | 01-01 | Home pinta bairros a partir de GeoJSON estático pré-simplificado, versionado, gerado offline, sem tocar ArcGIS no load | ✓ SATISFIED | `bairros-goiania.json` committed, well-formed, no runtime fetch wired (verified radar-goiania.html untouched) |
| DADOS-02 | 01-01 | Script de build valida completude por paginação e documenta integridade do join 709 vs 1206 | ✓ SATISFIED | `gerar-bairros.py` hard-asserts completeness; `bairros-goiania.report.md` documents root cause; live re-run reproduces exact figures |
| DADOS-03 | 01-02 | Docs corrigidas: returnGeometry=true funciona | ✓ SATISFIED | Both `PROJETO-radar.md` and `ROADMAP-radar.md` corrected and dated |

No orphaned requirements — REQUIREMENTS.md maps only DADOS-01/02/03 to Phase 1, and all three are declared in plan frontmatter (01-01: DADOS-01, DADOS-02; 01-02: DADOS-03).

### Anti-Patterns Found

None. Scanned `gerar-bairros.py` and `check-bairros-geojson.py` for TODO/FIXME/placeholder/not-implemented patterns — zero matches. No stub returns, no hardcoded empty data flowing to output (SUMMARY's "Known Stubs: None" claim confirmed by direct inspection).

### Human Verification Required

None. This phase produces no UI (explicitly out of scope — rendering is Phase 3) and no runtime behavior requiring visual/interactive confirmation. All must-haves are verifiable programmatically via file inspection, script execution, and grep, and all have been directly verified against the live codebase and (for the dataset) the live public endpoint.

### Gaps Summary

No gaps. All 9 observable truths verified, all 6 required artifacts present and substantive, all 5 key links wired, both requirement sets (DADOS-01/02/03) satisfied with direct evidence. One minor observation (not a gap): the shipped dataset is 166.6 KB gzip, slightly above the ~150KB soft research estimate but comfortably within the 200KB hard budget enforced by `check-bairros-geojson.py`; the SUMMARY documents this as expected live-data variance and the executor caught and fixed a real mapshaper `precision=` unit bug (decimal tolerance vs. integer digit-count) that would otherwise have silently nulled all geometry — a good catch, not a regression.

---

_Verified: 2026-07-04_
_Verifier: Claude (gsd-verifier)_
