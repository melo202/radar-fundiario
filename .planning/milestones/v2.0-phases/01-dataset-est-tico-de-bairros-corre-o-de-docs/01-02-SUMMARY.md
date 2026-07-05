---
phase: 01-dataset-est-tico-de-bairros-corre-o-de-docs
plan: 02
subsystem: docs
tags: [arcgis, returnGeometry, documentation-correction]

# Dependency graph
requires:
  - phase: 01-dataset-est-tico-de-bairros-corre-o-de-docs
    provides: 01-RESEARCH.md live re-verification of the ArcGIS layer-3 returnGeometry behavior (2026-07-04)
provides:
  - "PROJETO-radar.md §4 corrected: layer 3 (Cadastro Imobiliário) ACCEPTS returnGeometry=true (was falsely documented as rejecting it)"
  - "ROADMAP-radar.md §0 validated-facts table gained a returnGeometry row confirming the same correction"
affects: [01-01 (dataset build plan), any future phase relying on the v2.0 premise of orchestrating existing geometry vs sourcing new geometry]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - PROJETO-radar.md
    - ROADMAP-radar.md

key-decisions:
  - "Corrected the false 'Rejeita returnGeometry=true' claim to 'Aceita', dated 2026-07-04, per live re-verification in 01-RESEARCH.md — this reverses the premise that geometry must be newly sourced and confirms it can be exposed from the existing endpoint"
  - "Preserved all other documented quirks (outFields=*-only restriction, 502 under load, spatial query support, JSONP/pagination) untouched — only the single false bullet/fact was changed in each file"

patterns-established: []

requirements-completed: [DADOS-03]

# Metrics
duration: 6min
completed: 2026-07-04
---

# Phase 01 Plan 02: Correção da documentação sobre returnGeometry Summary

**Corrected the false claim that the ArcGIS layer-3 endpoint rejects `returnGeometry=true` — it actually accepts it (verified live 2026-07-04, ~+19% payload), reversing the v2.0 milestone premise from "source new geometry" to "expose existing geometry."**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-04T19:43:00Z
- **Completed:** 2026-07-04T19:49:07Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `PROJETO-radar.md` §4 "Comportamentos não óbvios do servidor" now states the endpoint **accepts** `returnGeometry=true` on layer 3, dated 2026-07-04, with the payload delta (+~19%) and a note that this is undocumented third-party server behavior with no SLA
- `ROADMAP-radar.md` §0 "Fatos validados no endpoint real" table gained a new row for `returnGeometry=true` reflecting the same corrected fact
- All other documented quirks in both files (outFields=*-only restriction, 502 under load, spatial query support, JSONP/pagination, 709 distinct setores) remain untouched and intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct returnGeometry claim in PROJETO-radar.md §4 and ROADMAP-radar.md §0** - `09e4bc1` (docs)

_Note: Documentation-only plan — single task, single commit (no test framework applicable, no TDD)._

## Files Created/Modified
- `PROJETO-radar.md` - §4 bullet corrected from "Rejeita returnGeometry=true" to "Aceita returnGeometry=true" (dated 2026-07-04, notes +~19% payload, x_coord/y_coord kept as alternative source, flags no-SLA third-party behavior)
- `ROADMAP-radar.md` - §0 table gained a new row for `returnGeometry=true (camada 3)` immediately after the `outFields` row, confirming acceptance and linking to the v2.0 premise shift

## Decisions Made
- Corrected only the single false claim per file, leaving every surrounding quirk bullet/row byte-for-byte untouched, per the plan's explicit preservation requirement and the threat-model's tampering-by-omission concern (T-01-05).
- Dated both corrections 2026-07-04 to match the live re-verification timestamp in `01-RESEARCH.md` and to flag this as undocumented, unversioned third-party behavior that should be reconfirmed before being depended on long-term.

## Deviations from Plan

None - plan executed exactly as written. Both edits matched the plan's exact specified replacement text verbatim.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The two canonical docs no longer contradict the v2.0 milestone premise (orchestrating existing geometry rather than sourcing new geometry) — safe for future readers/maintainers and for the dataset-build plan (01-01) to reference without confusion.
- No blockers or concerns; this was a pure documentation correction with no code or dataset changes.

---
*Phase: 01-dataset-est-tico-de-bairros-corre-o-de-docs*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: PROJETO-radar.md
- FOUND: ROADMAP-radar.md
- FOUND: .planning/phases/01-dataset-est-tico-de-bairros-corre-o-de-docs/01-02-SUMMARY.md
- FOUND: commit 09e4bc1
