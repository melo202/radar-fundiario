---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Busca, Bairros & Território
status: defining_requirements
stopped_at: Milestone v2.1 iniciado — escopo confirmado, disparando pesquisa
last_updated: "2026-07-05"
last_activity: 2026-07-05
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-05)

**Core value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.
**Current focus:** Milestone v2.1 — Busca, Bairros & Território (definindo requisitos)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-07-05 — Milestone v2.1 iniciado (nomes de bairro + UX da malha mobile + busca campo-único + Território/captação)

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Logadas em PROJECT.md Key Decisions. Recentes p/ o v2.1:

- v2.1 escopo: Busca & Bairros + Território/captação (IA activation + ortofoto → v2.2)
- Busca: overhaul completo (campo único inteligente substitui os 4 modos)
- Numeração de fases continua a partir da 7 (v2.0 usou 1-6, arquivadas em milestones/v2.0-phases/)

### Pending Todos

None yet.

### Blockers/Concerns

- A busca foi mexida recentemente (commits "simplifica escolha do modo" + correções de auditoria no seletor) — o campo-único pode substituir parte disso; pesquisa/planejamento deve checar o estado atual do código de busca antes.
- Nomes de bairro (`nm_bai`, layer 2) têm muitos erros; achar a fonte confiável de reconciliação é parte da pesquisa.
- Herdado do v2.0 (não-bloqueante): UAT de campo — legibilidade de rótulos sobre satélite + fluidez do motion em Android/4G real.

## Session Continuity

Last session: 2026-07-05
Stopped at: v2.1 iniciado, escopo confirmado (4 temas), pesquisa a disparar
Resume file: None
