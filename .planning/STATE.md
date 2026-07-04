# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-04)

**Core value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.
**Current focus:** Milestone v2.0 — definindo requisitos (Mapa-first + Motion + Satélite)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-07-04 — Milestone v2.0 started; GSD structure bootstrapped from existing docs

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- v2.0: home vira mapa-first; busca vira card clicável
- v2.0: IA permitida mas isolada em pesquisa de mercado externa (núcleo cadastral/laudo seguem determinísticos)
- v2.0 scope decidido: apenas Mapa+Motion+Satélite; ferramentas do corretor (prioridade Território/captação) e ativação de IA deferidas p/ v2.1+

### Pending Todos

None yet.

### Blockers/Concerns

- Migração de mapa (Leaflet → possível MapLibre/vector tiles) precisa preservar o pipeline EPSG:31982 UTM 22 e o JSONP; renderizar ~310k lotes no mobile é o principal risco de performance (em pesquisa).
- Licença das camadas de satélite gratuitas precisa ser confirmada (em pesquisa).

## Session Continuity

Last session: 2026-07-04
Stopped at: Bootstrapped .planning/, escopo v2.0 confirmado, disparando pesquisa paralela
Resume file: None
