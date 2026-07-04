---
phase: 4
slug: camada-de-sat-lite
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 4 — Validation Strategy

> Single-file HTML app, no JS test framework. Validation is **browser-preview-based** + **static grep**. Proportional. Satellite imagery loading + crossfade + label legibility are confirmed live in the preview.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — browser preview (`preview_*`) + grep on radar-goiania.html / sw.js |
| **Quick run command** | grep checks on radar-goiania.html + sw.js |
| **Full suite command** | manual preview: toggle streets⇄satellite, imagery tiles load, reference labels overlay, crossfade, bairro/lot outlines still visible over imagery, Esri attribution shows |
| **Estimated runtime** | seconds (grep) + short live preview pass |

---

## Sampling Rate

- **After each task commit:** grep assertions for that task.
- **Before phase verification:** preview — toggle to satellite, confirm Esri tiles load (network), reference labels appear, crossfade on toggle, outlines legible, attribution visible, toggle never auto-triggers by zoom.

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated / Observable Check | Status |
|---------|------|-------------|-----------|------------------------------|--------|
| sat-layer | 04-xx | SAT-01 | grep/preview | Esri World_Imagery tile layer added (keyless server.arcgisonline.com) + reference overlay; NOT added by default (streets is default) | ⬜ pending |
| toggle | 04-xx | SAT-01 | preview/grep | custom map button toggles streets⇄satellite via aria-pressed; never auto by zoom; Esri attribution shows when satellite active | ⬜ pending |
| labels | 04-xx | SAT-01 | preview | reference overlay (names/boundaries) legible over satellite; shipped with the toggle (same commit) | ⬜ pending |
| crossfade | 04-xx | SAT-02 | preview/grep | opacity crossfade (~200-300ms) on the tile swap, not a hard cut; scoped to satellite layer | ⬜ pending |
| outlines-over-sat | 04-xx | SAT-01 | preview | bairro (tan) + lot (green) outlines remain visible/legible over dark imagery | ⬜ pending |
| sw-network-only | 04-xx | SAT-01 | grep | server.arcgisonline.com is network-only (not precached/cache-first) in sw.js; cache version bumped radar-v4→radar-v5 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

*No test harness introduced — validation is preview + grep. No Wave 0 stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Satellite imagery renders | SAT-01 | Visual + network | Preview; toggle satellite; confirm Esri tiles load |
| Labels legible over satellite | SAT-01 | Visual | Confirm reference overlay names readable over imagery |
| Crossfade smooth | SAT-02 | Visual/timing | Toggle back and forth; confirm fade, not hard cut |
| Outlines legible over imagery | SAT-01 | Visual | Confirm bairro/lot outlines still visible on dark imagery |
| Toggle is deliberate (not auto) | SAT-01 | Interaction | Zoom in/out in each mode; confirm mode does NOT change by itself |

---

## Validation Sign-Off

- [ ] Grep confirms Esri World_Imagery + reference overlay + custom toggle + crossfade + sw.js network-only + radar-v5 bump
- [ ] Preview: toggle works, imagery loads, labels legible, crossfade smooth, outlines legible over satellite, attribution shows
- [ ] Toggle never auto-fires by zoom
- [ ] Zero console errors; existing streets/search/lot flows not regressed
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
