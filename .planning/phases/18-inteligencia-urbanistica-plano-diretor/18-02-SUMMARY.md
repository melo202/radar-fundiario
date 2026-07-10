---
phase: 18-inteligencia-urbanistica-plano-diretor
plan: 02
subsystem: ui
tags: [plano-diretor, zoneamento, accordion, score, detector, node-test, node-vm]

# Dependency graph
requires:
  - phase: 18-01
    provides: "PD_TABELA_CA/PD_MZC_BASICO/pdRegrasDaZona/potencialConstrutivo/criterioDetectorPD/resolverZonaUI (RADAR_PURE); pdConsultarLote/PDCACHE (PD_NET)"
provides:
  - "montarUrbBodyHTML(estado): render PURO do accordion 'Urbanístico' (6 estados), REGRA DE OURO no HTML testada por assert de string"
  - "renderUrbanisticoUI(a,isRetry): irmã assíncrona de renderDiffUI, wired em showDetail — accordion #dUrbanistico entre dtecnico/dmetodologia"
  - "atualizarScorePorquePD: linha 'Em {zona} — CA básico Xx, potencial de Y m²' no porquê do score, sem tocar scoreOportunidade() pura (score 0-100 intacto)"
  - "pdBateriaConsulta/pdConsultarQuadra/PDQUADRACACHE/consultarPDPorQuadra: upgrade do detector — consulta PD por CENTROIDE DE QUADRA, cache dedicado nunca compartilhado com PDCACHE"
  - "detectorRotuloPD (pura): rótulo do critério (PD ou fallback 'terreno') por candidato do detector, sempre visível"
affects: ["18-03 (choropleth de zonas do Plano Diretor)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "montarUrbBodyHTML extraída como função PURA (RADAR_PURE) que retorna STRING de HTML — testável por assert de substring, mesmo padrão de CADERNO_ALLOW; renderUrbanisticoUI só seta #dUrbBody.innerHTML=montarUrbBodyHTML(estado)"
    - "esc()/clean() usados por funções de RADAR_PURE mas esc() vive fora do bloco — stubado como identidade no harness de teste (loadPureBlock)"
    - "Cache dedicado por escopo de chave (PDCACHE por ci-de-lote × PDQUADRACACHE por chaveQuadra) nunca compartilhado no mesmo Map, mesmo reusando a mesma bateria de rede (pdBateriaConsulta)"
    - "Score porquê acrescido no RENDER (DOM), nunca na função pura scoreOportunidade — W1: número 0-100 permanece bit-a-bit inalterado, reaplicado via a.__pdEstado em toda renderScoresInto (idempotente, independe da ordem entre compare() e pdConsultarLote())"

key-files:
  created: []
  modified:
    - radar-goiania.html
    - tests/pd.test.mjs

key-decisions:
  - "Copy de CA ('CA básico Xx · CA máximo Yx') renderizada como STRING CONTÍGUA dentro de .v (não separada em k/v como o exemplo ilustrativo do 18-UI-SPEC), porque os testes de guarda exigem a substring literal no HTML — desvio de forma, não de conteúdo, do exemplo de markup do UI-SPEC"
  - "PD_DISCLAIMER incluído também no estado 'rural' (o 18-UI-SPEC mostra o exemplo (e) sem disclaimer, mas o Task 2 do 18-02-PLAN.md exige explicitamente 'todo estado resolvido/resolvido_sem_unidade/parcial/rural' — o contrato de teste prevalece sobre o exemplo ilustrativo)"
  - "Estado 'erro' NUNCA mostra o disclaimer (nada foi resolvido — 'informação indicativa extraída do PD' não se aplica quando a consulta falhou por completo)"
  - "potencialConstrutivo usado no score porquê só quando há unidade.sigla identificada (AA/ADD/AOS) — resolvido_sem_unidade (Macrozona Construída sem unidade) não gera a linha, porque a REGRA DE OURO do score usa a mesma função pura de PD-01, que exige sigla presente na tabela"
  - "pdBateriaConsulta extraída de pdConsultarLote (refactor sem mudança de comportamento) para reusar a MESMA bateria de 9 queries em pdConsultarQuadra, sem duplicar a lógica de rede"

patterns-established:
  - "renderXxxUI(a) irmã assíncrona + montarXxxHTML(estado) pura testável: 3º par desse padrão no app (renderDiffUI/formatarDiff → renderUrbanisticoUI/montarUrbBodyHTML)"

requirements-completed: [PD-03, PD-04]

# Metrics
duration: ~17min
completed: 2026-07-10
---

# Phase 18 Plan 02: Accordion Urbanístico + Inteligência do PD no Score e no Detector Summary

**Accordion "Urbanístico" na ficha (6 estados, REGRA DE OURO testada por assert de string), "porquê" do score citando a zona do PD e detector reescrito para ratear construído÷potencial-do-PD por centroide de quadra, com fallback rotulado e cache dedicado anti-colisão.**

## Performance

- **Duration:** ~17 min
- **Tasks:** 3
- **Files modified:** 2 (`radar-goiania.html`, `tests/pd.test.mjs`)

## Accomplishments
- `montarUrbBodyHTML(estado)`: função PURA (RADAR_PURE) que monta a string de HTML do accordion Urbanístico a partir do MESMO objeto de `resolverZonaUI`/`pdConsultarLote` — os 6 estados (carregando é decidido pelo chamador; resolvido/resolvido_sem_unidade/rural/parcial/erro são desta função), REGRA DE OURO garantida por regex de guarda (`conferido:false` nunca produz dígito de CA), disclaimer SEPLANH sempre presente (exceto `erro`, onde nada foi resolvido)
- `#dUrbanistico` inserido entre `dtecnico`/`dmetodologia`; `renderUrbanisticoUI(a,isRetry)` irmã assíncrona de `renderDiffUI`, chamada em `showDetail` — skeleton imediato, retry limpa `PDCACHE[ci]`, listener de retry (nunca `onclick` interpolando dado de servidor)
- Score "porquê" (PD-04): `atualizarScorePorquePD` acrescenta "Em {zona} — CA básico Xx, potencial de Y m²" ao `#scoreOpWhy` JÁ renderizado, só quando conferido — `scoreOportunidade()` pura permanece INTOCADA (W1, número 0-100 intencionalmente inalterado); a linha é reaplicada via `a.__pdEstado` em toda chamada de `renderScoresInto`, então sobrevive independentemente de qual das 2 consultas assíncronas (compare() × pdConsultarLote) termina primeiro
- Detector (PD-04): `pdBateriaConsulta` extraída de `pdConsultarLote` (reuso sem duplicar); `pdConsultarQuadra`/`PDQUADRACACHE` — cache DEDICADO por `chaveQuadra` (`cdbairro-nrquadra`), nunca compartilhado com `PDCACHE` (W3, evita cache-poisoning); `consultarPDPorQuadra` dedupe por quadra distinta dos ≤50 candidatos (nunca 1 consulta por lote); `detectorRotuloPD` (pura) rotula "Critério: ... potencial do Plano Diretor (zona X, CA básico Yx)" ou o fallback "... área do terreno (Plano Diretor não disponível)" — sempre visível, nunca esconde o candidato
- `npm test`: 225/225 verde (210 baseline + 15 novos: 9 de `montarUrbBodyHTML` + 6 do detector/PD_NET)

## Task Commits

1. **Task 1: CSS .urb-* + markup #dUrbanistico + renderUrbanisticoUI (6 estados) + wiring em showDetail (PD-03)** - `24f2b8a` (feat) — inclui `montarUrbBodyHTML`/`fmtCA` (extraídos desde o início como função pura, já cobrindo o pedido de refactor do Task 2) e a wiring do score porquê (PD-04), implementados juntos por serem estritamente acoplados na mesma passagem de edição
2. **Task 2: Guarda REGRA DE OURO (teste sobre o HTML de render) + "porquê" do score citando a zona (PD-04 score)** - `540fb15` (test) — 9 testes novos em `tests/pd.test.mjs` cobrindo os 6 estados + REGRA DE OURO + disclaimer
3. **Task 3: Upgrade do detector — critério PD por centroide de quadra (top-N, cache) + rótulo do critério (PD-04 detector)** - `0e8cd65` (feat) — 6 testes novos cobrindo dedupe por quadra, isolamento de cache (W3) e os 2 critérios (pd/fallback)

_Nota: o código de render do score "porquê" (PD-04) foi implementado dentro do commit da Task 1 (não da Task 2), porque a extração de `montarUrbBodyHTML` como função pura testável — pedida explicitamente pelo Task 2 — já fazia mais sentido ser feita na primeira passagem de implementação do accordion, evitando reescrever `renderUrbanisticoUI` duas vezes. O commit da Task 2 então cobre exclusivamente os testes (RED sobre código já GREEN), sem alterar comportamento. Isso é uma consequência de ordenação de trabalho, não uma mudança de escopo — todos os `<done>` de cada task foram verificados individualmente antes do commit correspondente._

## Files Created/Modified
- `radar-goiania.html` — CSS `.urb-*` (badges/CA/rural/retry, reusando `--status-atencao`/`--status-bom`); markup `#dUrbanistico`; `montarUrbBodyHTML`/`fmtCA`/`detectorRotuloPD` (RADAR_PURE); `renderUrbanisticoUI`/`atualizarScorePorquePD` (render, chamados de `showDetail`/`atualizarScores`); `pdBateriaConsulta`/`pdConsultarQuadra`/`PDQUADRACACHE`/`consultarPDPorQuadra` (PD_NET); `renderDetectorLista`/`renderDetectorCriterioPD` (detector)
- `tests/pd.test.mjs` — 15 testes novos: 9 de `montarUrbBodyHTML` (REGRA DE OURO no render, disclaimer, BLOCKER 2) + 6 do detector/PD_NET (dedupe por quadra, isolamento PDCACHE×PDQUADRACACHE, critério pd/fallback)

## Decisions Made
- Copy de CA renderizada como string contígua ("CA básico 1,0x · CA máximo 6,0x") dentro de um único `.v`, em vez do exemplo ilustrativo k/v separado do 18-UI-SPEC — os testes de guarda exigem a substring literal contígua no HTML; desvio de forma do exemplo visual, não do conteúdo do contrato de copy
- `PD_DISCLAIMER` incluído também no estado `rural` (o exemplo (e) do 18-UI-SPEC não o mostra, mas o Task 2 do plano exige explicitamente "todo estado resolvido/resolvido_sem_unidade/parcial/rural" — o contrato de teste do plano prevalece)
- Estado `erro` nunca mostra o disclaimer (nada foi resolvido — a frase "informação indicativa extraída do Plano Diretor" não se aplica a uma consulta que falhou por completo)
- `pdBateriaConsulta` extraída de `pdConsultarLote` (refactor comportamentalmente idêntico, testado) para ser reusada por `pdConsultarQuadra` sem duplicar a lógica de 9 queries em paralelo

## Deviations from Plan

None (de conteúdo) - plan executado conforme especificado. Único ajuste de FORMA: a implementação do score "porquê" (parte do Task 2) foi feita junto com o Task 1 por acoplamento estrutural direto (ambas tocam `renderUrbanisticoUI`/`renderScoresInto` na mesma passagem), documentado na nota acima. Todos os `<done>`/`<verify>` de cada task foram confirmados individualmente antes de cada commit.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Accordion Urbanístico, score porquê e detector com critério PD completos e testados (PD-03/PD-04) — plano 03 (choropleth de zonas do Plano Diretor no Território) pode consumir `PD_LAYERS`/`pdConsultarLote`/a paleta de zonas do 18-UI-SPEC sem depender de nada deste plano além do que já existe
- Pendências herdadas do 18-01 (não-bloqueantes): LC 363/364/371/373 ainda não lidas por completo (HUMAN-UAT do advogado, `PD_TABELA_CA._meta.pendente`)

---
*Phase: 18-inteligencia-urbanistica-plano-diretor*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: tests/pd.test.mjs
- FOUND: .planning/phases/18-inteligencia-urbanistica-plano-diretor/18-02-SUMMARY.md
- FOUND commit: 24f2b8a (Task 1 GREEN, incl. score porquê)
- FOUND commit: 540fb15 (Task 2 test)
- FOUND commit: 0e8cd65 (Task 3 GREEN)
