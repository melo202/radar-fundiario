---
phase: 1
slug: dataset-est-tico-de-bairros-corre-o-de-docs
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract. This is a single-file HTML app with **no JS test framework** — validation is proportional: the offline build script self-validates, plus a lightweight reprojection/well-formedness smoke check on the generated artifact. No framework is installed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — build-script self-validation + a standalone smoke check (Python `pyproj`/`json` or `npx`-invoked check; no permanent dependency) |
| **Config file** | none |
| **Quick run command** | `python gerar-bairros.py --verify` (build script asserts pagination + prints feature count & join report) |
| **Full suite command** | `python check-bairros-geojson.py bairros-goiania.json` (smoke check: well-formed, size budget, irregular-bairro reprojection lands in Goiânia bbox) |
| **Estimated runtime** | ~a few seconds (offline, one-shot) |

---

## Sampling Rate

- **After the build task:** run the build script's `--verify` and confirm it reports the full feature count (expect ~1,206) with explicit pagination, not a default page cutoff.
- **After the artifact exists:** run the smoke check on the output GeoJSON.
- **Before phase verification:** both must pass; docs correction (DADOS-03) confirmed by grep.
- **Max feedback latency:** seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | DADOS-01 | — | N/A | artifact | `test -f bairros-goiania.json && python check-bairros-geojson.py bairros-goiania.json` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | DADOS-02 | — | N/A | script-assert | `python gerar-bairros.py --verify` (prints count + pagination proof + join report) | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | DADOS-01 | — | reprojection correctness (UTM-22 guard) | smoke | `python check-bairros-geojson.py --check-irregular bairros-goiania.json` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | DADOS-03 | — | N/A | grep | `grep -q "returnGeometry" PROJETO-radar.md && grep -q "returnGeometry" ROADMAP-radar.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `check-bairros-geojson.py` — standalone smoke check (well-formed GeoJSON, feature count, size ≤ ~150KB gzip target, irregular-bairro reprojection lands within Goiânia bbox). Created as part of the build task, no framework needed.

*The build script itself carries its own `--verify` assertions (pagination completeness, feature count, join report), so no separate unit-test harness is introduced.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Simplification fidelity at city zoom (visual) | DADOS-01 | Requires a Leaflet render, which doesn't exist until Phase 3 | Deferred to Phase 3 QA — not blocking Phase 1 |

*Reprojection correctness IS automated (smoke check on bbox), covering the UTM-zone-22 regression risk without a visual render.*

---

## Validation Sign-Off

- [ ] Build script `--verify` proves full pagination (feature count reported, not truncated)
- [ ] Smoke check confirms well-formed GeoJSON within size budget
- [ ] Irregular-bairro reprojection lands in the correct WGS84 location (Goiânia bbox)
- [ ] Docs (PROJETO-radar.md, ROADMAP-radar.md) grep-confirmed corrected
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
