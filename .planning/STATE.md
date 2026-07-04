# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-04)

**Core value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.
**Current focus:** Milestone v2.0 — Fase 1 (Dataset Estático de Bairros + Correção de Docs)

## Current Position

Phase: 1 of 6 (Dataset Estático de Bairros + Correção de Docs)
Plan: TBD — aguardando `/gsd-plan-phase 1`
Status: Ready to plan
Last activity: 2026-07-04 — ROADMAP.md criado (6 fases, 14/14 requisitos v2.0 mapeados, cobertura 100%)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- v2.0: home vira mapa-first; busca vira card clicável (Phase 2)
- v2.0: fica no Leaflet 1.9.4 (sem MapLibre); Motion via CDN (Phase 6)
- v2.0: satélite = Esri World Imagery — decisão tomada; falta signup da API key (Phase 4)
- v2.0: IA permitida mas isolada em pesquisa de mercado externa, seam dormant apenas (Phase 5)
- Geometria de bairro/lote (layers 0/1/2, `returnGeometry=true`) já funciona no endpoint ao vivo — v2.0 é reestruturação de UI sobre encanamento existente, não sourcing de dados novo

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: verificar integridade do join bairro↔`cdbairro` (709 vs. 1.206 polígonos) e completude da paginação antes de assumir o dataset como definitivo
- Phase 1: re-verificar `returnGeometry=true` no momento da implementação (comportamento de servidor de terceiro, não documentado/sem SLA)
- Phase 4: signup da API key Esri (console ArcGIS, escopo Basemaps, restrito por referrer) ainda pendente
- Phase 3 e Phase 4: limiares de zoom (drill-down originado por clique no bairro; legibilidade de rótulos sobre satélite) precisam de teste empírico em dispositivo Android real em 4G, não apenas DevTools

## Session Continuity

Last session: 2026-07-04
Stopped at: ROADMAP.md e REQUIREMENTS.md (traceability) escritos; STATE.md inicializado para Phase 1
Resume file: None
