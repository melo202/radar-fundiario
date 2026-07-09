---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Cockpit Comercial
status: verifying
stopped_at: Completed 15-03-PLAN.md
last_updated: "2026-07-09T23:49:32.915Z"
last_activity: 2026-07-09
progress:
  total_phases: 13
  completed_phases: 10
  total_plans: 33
  completed_plans: 33
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-05)

**Core value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.
**Current focus:** Phase 15 — Setor-Scan Compartilhado, Choropleth & Painel do Território

## Current Position

Phase: 16
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-07-09

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 30 (v2.1)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 7 | 3 | - | - |
| 8 | 5 | - | - |
| 9 | 3 | - | - |
| 10 | 3 | - | - |
| 11 | 3 | - | - |
| 11.1 | 3 | - | - |
| 12 | 2 | - | - |
| 14 | 5 | - | - |
| 15 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: — (v2.0 encerrado em 12 planos, ver milestones/v2.0-ROADMAP.md)
- Trend: —

*Updated after each plan completion*
| Phase 14 P01 | 2min | 3 tasks | 3 files |
| Phase 14 P02 | 12min | 3 tasks | 2 files |
| Phase 14 P03 | 8min | 2 tasks | 2 files |
| Phase 14 P04 | 6min | 2 tasks | 2 files |
| Phase 14 P05 | 10min | 2 tasks | 2 files |
| Phase 15 P01 | 15min | 2 tasks | 3 files |
| Phase 15 P02 | 25min | 3 tasks | 3 files |
| Phase 15 P03 | 20min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Logadas em PROJECT.md Key Decisions. Recentes p/ o v2.1:

- Sequência de fases segue a pesquisa (SUMMARY.md v2.1): fundação de dados → busca → setor-scan/choropleth/painel → detector/farming → diff/Caixa
- Fix de nomes de bairro é display-data-only (geometria/contagem byte-idênticas); nenhum join automático por string (falha 99,5% medido) — spatial join + revisão humana
- Território usa orçamento de requisições (1-3 páginas, nunca por-quadra) + zoom-gate; farming/diff usam IndexedDB (nunca localStorage) + allowlist anti-PII (nunca `dtnascimen`)
- Busca é refactor estrito sobre a base de 3 botões já endurecida (03/07) — não rewrite; gate de aceite = re-passar checklist de a11y/ARIA/SEARCHTOKEN
- [Phase 14]: A1: 'Abaixo da mediana' substituido por 'Oportunidade baixa' no rotulo de score de 1a camada (4 ancoras + fixture, mesmo commit)
- [Phase 14]: A2: #loadmsg estatico alinhado a maiuscula de MOTION_MSG.cadastro ('Consultando cadastro...')
- [Phase 14]: Achado A4 (colisao de 'Oportunidades' entre Caixa e Minhas oportunidades) ratificado como avaliado/mantido, sem mudanca de nome
- [Phase 14]: [14-02]: 12 botoes substantivo-isolados corrigidos com verbo de acao reaproveitando vocabulario ja existente no app (Ver/Calcular/Copiar/Gerar); seletores/navegacao/icones tratados como excecao documentada ao §26.2
- [Phase 14]: [14-02]: legenda de pinos 'Atencao' mantida sem renomeacao — rotulo intencional e testado do sistema paralelo STATUS_LABEL/statusDeUnidade (Fase 13), distinto do badge scoreOportunidade da ficha
- [Phase 14]: [14-03]: 4 toasts de erro corrigidos p/ padrao §26.3 (o que houve + o que fazer); 1 tooltip do botao Caixa perdeu instrucao de script Python inadequada ao corretor; toasts de limitacao de dado (sem coordenada) mantidos sem saida forcada (nao sao erro do usuario)
- [Phase 14]: [14-04]: zapArgumento (fallback sem porque[0]) perdeu exposicao crua de score/mediana ao cliente final; zapRiscos ganhou o verbo 'e' que faltava ('nao e uma avaliacao oficial'); nenhuma edicao exigiu tocar tests/templates.test.mjs
- [Phase 14]: [14-04]: captFollowup ('Follow-up') mantido sem mudanca — anglicismo ja estabelecido em outras 2 ancoras do app (label + toast), troca isolada quebraria consistencia de nomenclatura
- [Phase 14]: [14-05]: achado transversal de concordancia de genero 'no regiao'->'na regiao' corrigido via helper localTxt em 6 funcoes RADAR_PURE (zapResumo/zapProprietario/zapComprador/captAbordagem/captScript/fichaRapidaTexto); auditoria dos Planos 01/04 atualizada retroativamente
- [Phase 14]: [14-05]: gate LING-01 fechado - 14-AUDITORIA.md com 11 secoes completas, contagem (~287 revisadas/30 alteradas) e sign-off dos 8 criterios SS26, todos PASS; npm test 107/107 verde
- [Phase 15]: [15-01]: outFields restrito adotado como padrao de territorioScan (divergencia intencional do quirk antigo, verificado ao vivo ~80% menos payload), com fallback automatico para outFields=* nunca travando o scan
- [Phase 15]: [15-01]: USO relocado (nao duplicado) para dentro do bloco RADAR_PURE para que mixUso seja visivel ao harness de teste node:vm
- [Phase 15]: [15-02]: mo (motivo do join heuristico) mantido no snapshot bairro-cdbairro.json mesmo sem consumidor nesta plan - reservado p/ sinal de honestidade futuro (Plano 03)
- [Phase 15]: [15-02]: wash do setor ativo em baiStyle() usa sempre a faixa 3 (cor-media) - variacao real por R$/m2 vive no nivel de LOTE, nao de bairro
- [Phase 15]: [15-02]: fix Rule 1 - highlightBairro/clearBaiHi chamavam baiStyle() sem feature, perdendo o wash do setor ao limpar hover; corrigido para baiStyle(baiHi.feature)
- [Phase 15]: [15-03]: nome do setor no painel usa esc()+textContent (padrao ja usado em showBreadcrumb), replicado por consistencia de convencao do projeto
- [Phase 15]: [15-03]: buscarNoSetor() reusa setMode/pickBairro (mesmo par usado por pickCaixaItem para itens setor) - nenhum caminho de busca novo
- [Phase 15]: [15-03]: fix Rule 1 - clearBaiHi() agora esconde btnVerTerr ao limpar o hover, evitando abrir territorio de um layer que ja saiu de foco

### Pending Todos

None yet.

### Blockers/Concerns

- Fase 7: spot-check humano do diff de nomes nas bordas administrativas — quem faz, ainda em aberto (Open Decision #1 da pesquisa)
- Fase 8: calibração da regex do `detectMode()` contra nomes reais é MEDIUM confidence — validar com amostra real durante a fase
- Fase 9: orçamento real do heatmap em setor grande (Bueno) no 4G não foi medido ao vivo (extrapolado); legibilidade do choropleth sobre satélite em luz externa é UAT não-bloqueante
- Herdado do v2.0 (não-bloqueante): legibilidade de rótulos sobre satélite + fluidez do motion em Android/4G real

## Session Continuity

Last session: 2026-07-09T23:23:21.030Z
Stopped at: Completed 15-03-PLAN.md
Resume file: None
