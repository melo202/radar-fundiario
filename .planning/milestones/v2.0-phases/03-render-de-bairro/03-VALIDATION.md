---
phase: 3
slug: render-de-bairro
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 3 — Validation Strategy

> Single-file HTML app, no JS test framework. Validation is **browser-preview-based** (python http.server + preview tools) + **static grep**. Proportional — no framework introduced. The performance criterion (large bairro non-freeze) is validated live in the preview.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — browser preview (`preview_*`) + grep on radar-goiania.html + fetch of bairros-goiania.json |
| **Quick run command** | grep checks on radar-goiania.html + confirm bairros-goiania.json served |
| **Full suite command** | manual preview: bairros render, hover/tap highlight+name, click→fitBounds→lots at zoom≥17, bairros hide ≥17, breadcrumb appears/zoom-out, Bueno no-freeze |
| **Estimated runtime** | seconds (grep) + a short live preview pass |

---

## Sampling Rate

- **After each task commit:** grep assertions for that task.
- **Before phase verification:** load in preview, render bairros, drill into a bairro (incl. a large one — Bueno), confirm lots appear on zoom-in, bairros hide, breadcrumb works, zero console errors, no freeze.

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated / Observable Check | Status |
|---------|------|-------------|-----------|------------------------------|--------|
| bairro-render | 03-xx | MAPA-02 | preview/grep | bairros-goiania.json fetched + L.geoJSON layer of ~1206 outline polygons on the map at low zoom; preferCanvas used | ⬜ pending |
| highlight-name | 03-xx | MAPA-02 | preview | hover(desktop)/tap(mobile) highlights polygon + shows nm_bai tooltip via a single touch-gated function | ⬜ pending |
| click-drill | 03-xx | MAPA-03 | preview | click/tap-drill fitBounds to bairro; zooming past 17 triggers existing refreshLots (lots appear); works from bairro-click camera move | ⬜ pending |
| big-bairro-perf | 03-xx | MAPA-03 | preview | drilling Bueno (~57k lots) / Oeste does NOT freeze mid/low-end mobile — zoom gate + viewport envelope hold | ⬜ pending |
| bairro-zoom-hide | 03-xx | MAPA-02/03 | preview/grep | bairro outlines hidden at zoom≥17 (give way to lots) | ⬜ pending |
| breadcrumb | 03-xx | MAPA-05 | preview/grep | breadcrumb (Goiânia › Bairro) appears on drill, hidden on home; clicking 'Goiânia' zooms out to city | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

*No test harness introduced — validation is preview + grep. No Wave 0 stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bairros render as outlines at city zoom | MAPA-02 | Visual, needs render | Load preview; confirm outline polygons over Goiânia |
| Hover/tap highlight + name | MAPA-02 | Interaction | Desktop hover / mobile tap a bairro → highlight + name |
| Drill reveals lots on zoom-in | MAPA-03 | Interaction + network | Click a bairro → fitBounds; zoom in past 17 → lot polygons appear |
| Large bairro (Bueno) no freeze | MAPA-03 | Perf, device-dependent | Drill Bueno; confirm responsive, no lock-up (zoom gate holds) |
| Breadcrumb zoom-out | MAPA-05 | Interaction | Drill a bairro → breadcrumb shows; click 'Goiânia' → back to city view |

---

## Validation Sign-Off

- [ ] Grep confirms bairro-layer fetch of bairros-goiania.json + preferCanvas + zoom-gate + breadcrumb markup
- [ ] Preview: bairros render, highlight+name, drill→lots, bairros hide ≥17, breadcrumb appears + zoom-out
- [ ] Large bairro (Bueno) drilled live without freeze
- [ ] Zero console errors; existing search/lot flows not regressed
- [ ] sw.js precache updated for bairros-goiania.json + cache version bumped
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
