---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Cockpit Comercial
status: verifying
stopped_at: Completed 18-03-PLAN.md
last_updated: "2026-07-10T05:05:54.027Z"
last_activity: 2026-07-10
progress:
  total_phases: 13
  completed_phases: 13
  total_plans: 41
  completed_plans: 41
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-05)

**Core value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.
**Current focus:** Phase 18 — Inteligência Urbanística — Plano Diretor 2022

## Current Position

Phase: 18 (Inteligência Urbanística — Plano Diretor 2022) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-07-10

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 35 (v2.1)
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
| 16 | 3 | - | - |
| 17 | 2 | - | - |

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
| Phase 16 P01 | 20min | 3 tasks | 3 files |
| Phase 16 P02 | 35min | 3 tasks | 1 files |
| Phase 16 P03 | ~45min | 3 tasks | 1 files |
| Phase 17 P01 | 10min | 3 tasks | 4 files |
| Phase 17 P02 | 12min | 3 tasks | 1 files |
| Phase 18 P01 | 20min | 3 tasks | 3 files |
| Phase 18 P02 | 17min | 3 tasks | 2 files |
| Phase 18 P03 | 35min | 3 tasks | 2 files |

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
- [Phase 16]: [16-01]: DETECTOR_RATIO_MAX fixo em 0.15 (constante nomeada), nao relativo/quantil - mais simples de explicar, upgrade p/ potencial-do-PD fica p/ Fase 18
- [Phase 16]: [16-01]: fix Rule 1 - cross-realm assert.deepEqual em caderno.test.mjs (medianasPorQuadra/detectarSubutilizados) normalizado via JSON round-trip / length, mesmo padrao ja usado por mixUso em territorio.test.mjs
- [Phase 16]: [16-02]: botao Salvar no caderno fica em #dActsMore (nunca #dActsPrim, teto da lei da tela preservado); filtro de setor do caderno usa cdbairro numerico (allowlist nao inclui nmbairro)
- [Phase 16]: [16-02]: fix Rule 3 - .dnote (scoped a .detail) estendido com #cadernoBlock .dnote e regra de visibilidade :has() analoga a #savedBlocks, para o bloco Caderno renderizar corretamente fora de .detail
- [Phase 16]: [16-03]: verificacao do checkpoint humano executada pelo orquestrador em navegador real (Chromium/preview) em vez de simulacao - zero-requisicao/persistencia/ausencia de PII/export-import/XSS confirmados ao vivo com instrumentacao de rede e dump direto do IndexedDB
- [Phase 16]: [16-03]: item 4 do checkpoint (falha visivel/degradacao) ficou verificado por leitura de codigo, nao simulado ao vivo, porque o ambiente de teste tinha IndexedDB disponivel - tratado como campo opcional do checkpoint
- [Phase 17]: [17-01]: sem bump de CADERNO_VERSION - snapshot embutido no item (item.snapshot+item.snapshotAt), IndexedDB nao tem schema de valor fixo
- [Phase 17]: [17-01]: match de bairro Caixa so exato-normalizado (norm()), nunca fuzzy - honestidade sobre recall (74% medido); colisao nome->multiplos cdbairro resolvida via Set, match se QUALQUER candidato bater
- [Phase 17]: [17-01]: sanitizeCaderno ganhou allowlist RECURSIVA para snapshot (dtnascimen/cpf dentro do sub-objeto nunca sobrevivem, mesmo com a chave de topo liberada)
- [Phase 17]: [17-02]: BAIRROS (global declarada, nunca populada) agora recebe o FeatureCollection em loadBairroPolys() - garantirNomeParaCdbairro() precisa das features reais, zero requisicao nova
- [Phase 17]: [17-02]: toggleCaixa() tornou-se async; construcao dos pinos/aneis extraida para garantirCaixaLayer() (idempotente), compartilhada com abrirCaixaNoMapaUI() para nunca duplicar construcao nem disparar 2 toasts
- [Phase 18]: [18-01]: 6x publicado como ca_maximo padrao da AA (Art. 196 II); 7,5x (TDC+fora-de-PDU, Art. 252 par.6) deliberadamente omitido da tabela padrao
- [Phase 18]: [18-01]: fonte no PD_TABELA_CA cita sempre Art. X da LC 349/2022, nunca Anexo (Anexo XXI/XXII regem afastamentos/altura por monumento, nao CA) - reforcado por guarda de integridade automatizado
- [Phase 18]: [18-01]: AOS/AAB com ca_maximo null e conferido true simultaneamente - achado negativo confirmado (Art. 196 so regula AA/ADD), nao lacuna de pesquisa
- [Phase 18]: [18-02]: copy de CA renderizada como string contigua no .v (nao k/v separado do exemplo do UI-SPEC) - testes de guarda exigem substring literal contigua no HTML
- [Phase 18]: [18-02]: PD_DISCLAIMER tambem no estado rural (contrato de teste do Task 2 prevalece sobre o exemplo ilustrativo do UI-SPEC que nao o mostra); estado erro nunca mostra o disclaimer
- [Phase 18]: [18-02]: PDQUADRACACHE (detector, por chaveQuadra) nunca compartilha map com PDCACHE (lote, por ci) - W3, evita cache-poisoning; pdBateriaConsulta extraida para reuso sem duplicar a bateria de 9 queries
- [Phase 18]: [18-03]: proximoEstadoCamada (funcao pura) testa exclusividade tri-state isoladamente, mesmo padrao ja usado para funcoes DOM/Leaflet pesadas nunca testadas via node:vm
- [Phase 18]: [18-03]: fix Rule 1 - .detail .acts .chips button.on (especificidade 0,4,1) corrige colisao de especificidade com .detail .acts button que impediria o accent do chip ativo de aparecer

### Pending Todos

None yet.

### Blockers/Concerns

- Fase 7: spot-check humano do diff de nomes nas bordas administrativas — quem faz, ainda em aberto (Open Decision #1 da pesquisa)
- Fase 8: calibração da regex do `detectMode()` contra nomes reais é MEDIUM confidence — validar com amostra real durante a fase
- Fase 9: orçamento real do heatmap em setor grande (Bueno) no 4G não foi medido ao vivo (extrapolado); legibilidade do choropleth sobre satélite em luz externa é UAT não-bloqueante
- Herdado do v2.0 (não-bloqueante): legibilidade de rótulos sobre satélite + fluidez do motion em Android/4G real

## Session Continuity

Last session: 2026-07-10T05:05:54.023Z
Stopped at: Completed 18-03-PLAN.md
Resume file: None
