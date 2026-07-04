---
phase: 2
slug: home-mapa
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 2 — Validation Strategy

> Single-file HTML app, no JS test framework. Validation for this UI view-state change is **preview-based** (browser preview tools) + **static grep** of the source. Proportional — no framework introduced.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — browser preview (`preview_*`) + grep assertions on radar-goiania.html |
| **Config file** | none |
| **Quick run command** | grep checks (below) on radar-goiania.html |
| **Full suite command** | manual preview walkthrough (boot→map, pill→search, desktop overlay, coach-mark dismiss) |
| **Estimated runtime** | seconds (grep) + a short manual preview pass |

---

## Sampling Rate

- **After each task commit:** run the grep assertions for that task.
- **Before phase verification:** load radar-goiania.html in the preview at mobile (375×812) and desktop (1280×800) and confirm the observable behaviors below.

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Check | Status |
|---------|------|-------------|-----------|-----------------|--------|
| boot-map | 02-xx | MAPA-01 | grep/preview | body boots with data-view="mapa" (mobile); map visible on load; `map.invalidateSize()` called on show | ⬜ pending |
| search-pill | 02-xx | MAPA-04 | grep/preview | a floating search pill exists over the map, label "O que você procura?", ≥44px; tap calls setView('busca')/opens search overlay | ⬜ pending |
| desktop-mapfirst | 02-xx | MAPA-01/04 | grep/preview | new `@media(min-width:821px)` block makes map full-bleed + search as overlay card (not the old side-by-side .wrap grid) | ⬜ pending |
| coach-mark | 02-xx | MAPA-01 | grep/preview | 1-line dismissible banner over map; dismissal persists in localStorage; gone on 2nd load | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

*No test harness introduced — validation is preview + grep. No Wave 0 stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App opens on the map (not search) | MAPA-01 | Observable only in a rendered browser | Load in preview mobile+desktop; confirm map is the landing view |
| Pill opens the existing full search flow | MAPA-04 | Interaction | Tap the pill → search panel/overlay appears, reusing existing markup; run a search, confirm it still works |
| Coach-mark dismiss persists | MAPA-01 | localStorage across loads | Dismiss banner, reload → banner absent |
| Leaflet renders (not grey) when map shown | MAPA-01 | Visual | Confirm tiles render after view switch (invalidateSize) |

---

## Validation Sign-Off

- [ ] Grep confirms data-view default flipped to map + pill markup + desktop @media override + coach-mark localStorage
- [ ] Preview (mobile + desktop) confirms map-first boot, pill→search, coach-mark dismiss-persist
- [ ] Existing search flow still works from the pill (no regression)
- [ ] WCAG AA preserved (pill has accessible label, focus ring, Esc closes overlay)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
