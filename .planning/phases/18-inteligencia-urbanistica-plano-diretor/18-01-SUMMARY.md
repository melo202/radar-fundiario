---
phase: 18-inteligencia-urbanistica-plano-diretor
plan: 01
subsystem: data
tags: [arcgis, jsonp, node-test, node-vm, plano-diretor, zoneamento]

# Dependency graph
requires:
  - phase: 16-territorio-detector-caderno
    provides: "DETECTOR_LIMITE/DETECTOR_RATIO_MAX (constantes reusadas, nunca duplicadas); padrão de cache de sessão (TERRCACHE/capCache)"
provides:
  - "PD_TABELA_CA (zona -> CA/altura/uso conferidos contra a LC 349/2022, artigo por artigo)"
  - "PD_MZC_BASICO (CA básico universal da Macrozona Construída, Art. 242 VII)"
  - "pdRegrasDaZona/potencialConstrutivo/criterioDetectorPD (funções puras REGRA DE OURO)"
  - "resolverZonaUI (state builder dos 6 estados do accordion Urbanístico)"
  - "pdConsultarLote/PDCACHE (bateria lazy deduplicada de 9 layers point-in-polygon)"
affects: ["18-02 (ficha/accordion Urbanístico)", "18-03 (choropleth de zonas)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "REGRA DE OURO na origem: conferido:false nunca produz número (testado por guarda de integridade da própria tabela)"
    - "PD_NET (bloco de I/O novo, mesmo estilo de TERR_NET): Promise.allSettled + cache de sessão por ci, dedupe"
    - "resolverZonaUI como state builder puro consumido tanto por testes quanto pela camada de rede (pdConsultarLote)"

key-files:
  created:
    - tests/pd.test.mjs
  modified:
    - radar-goiania.html
    - tests/fixtures.mjs

key-decisions:
  - "6x publicado como ca_maximo padrão da AA (Art. 196, II); 7,5x (TDC + fora de PDU, Art. 252 §6º) deliberadamente omitido da tabela padrão — é exceção condicional, não o índice geral"
  - "fonte cita sempre 'Art. X, LC 349/2022', nunca 'Anexo' (Anexo XXI/XXII regem afastamentos/altura por monumento, não CA) — testado via guarda de integridade"
  - "AAB/AOS sem ca_maximo numérico é achado NEGATIVO confirmado (Art. 196 só regula AA/ADD), não lacuna de pesquisa — conferido:true mesmo com ca_maximo:null"
  - "badges.add reusa a mesma layer (30) que resolve unidade.sigla==='ADD' — redundância intencional entre unidade territorial e badge de contexto, per 18-UI-SPEC"

patterns-established:
  - "PD_NET_START/PD_NET_END: novo marcador de bloco de I/O, mesmo padrão de fatiamento por linha via node:vm que TERR_NET_START/END"

requirements-completed: [PD-01, PD-02, PD-04]

# Metrics
duration: ~20min
completed: 2026-07-10
---

# Phase 18 Plan 01: Núcleo de Dados Urbanísticos do Plano Diretor Summary

**Tabela de CA/altura conferida artigo-por-artigo contra a LC 349/2022 (AA 6,0x/ADD 5,0x), funções puras com REGRA DE OURO embutida (número não-conferido nunca vira número), state builder de 6 estados (`resolverZonaUI`) e bateria lazy deduplicada de 9 layers point-in-polygon (`pdConsultarLote`/`PDCACHE`) — tudo 100% testado por TDD via `node:vm`, antes de qualquer UI.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 3 (`radar-goiania.html`, `tests/pd.test.mjs` criado, `tests/fixtures.mjs`)

## Accomplishments
- `PD_TABELA_CA` versionada com AA(ca_maximo 6,0)/ADD(5,0) `conferido:true`, fonte citando "Art." (nunca "Anexo"); AOS com `ca_maximo:null` conferido (achado negativo real, não lacuna); APAC/AEIS `conferido:false` (números não localizados na fonte primária)
- `PD_MZC_BASICO` isola o CA básico universal (1,0x, Art. 242 VII) da Macrozona Construída, usado exclusivamente pelo 6º estado (`resolvido_sem_unidade`)
- `potencialConstrutivo`/`criterioDetectorPD` puros: REGRA DE OURO (nunca fabricam número sem `conferido:true`) + fallback gracioso rotulado (`criterio:"terreno"`) que nunca bloqueia o detector
- `resolverZonaUI`: monta os 6 estados do accordion Urbanístico a partir de `Promise.allSettled`, com guarda explícita do 6º estado (macrozona Construída sem AA/ADD/AOS nunca cai em `pdRegrasDaZona(null)`/`undefined`)
- Novo bloco `PD_NET` (mesmo padrão de `TERR_NET`): `pdConsultarLote` dispara 1 bateria de 9 `jsonp` em paralelo contra `Mapa_ModeloEspacial/MapServer` (produção, nunca `_teste`), deduplicada por `PDCACHE[ci]`
- `npm test`: 210/210 verde (184 baseline + 26 novos)

## Task Commits

Cada task foi committada atomicamente, com o RED (teste) coberto por um único commit inicial que já declarava o contrato completo dos 3 tasks (mesmo arquivo `tests/pd.test.mjs`/`tests/fixtures.mjs`), seguido de 3 commits GREEN (um por task):

1. **RED — tests/pd.test.mjs + fixtures (Task 1-3)** - `04c81b6` (test)
2. **Task 1: PD_TABELA_CA/PD_LAYERS/PD_DISCLAIMER/PD_MZC_BASICO + pdRegrasDaZona** - `69a0772` (feat)
3. **Task 2: potencialConstrutivo + criterioDetectorPD** - `b1a762c` (feat)
4. **Task 3: resolverZonaUI + pdConsultarLote/PDCACHE (PD_NET)** - `5737566` (feat)

_Nota: como as 3 tasks compartilham o mesmo arquivo de teste (`tests/pd.test.mjs`), o RED completo (todas as assertions de estrutura das Tasks 1-3) foi escrito e commitado antes da primeira implementação — cada GREEN subsequente foi verificado isoladamente via `node:vm` ad-hoc antes do commit, com a suíte completa (`npm test`) confirmando 210/210 verde ao final da Task 3._

## Files Created/Modified
- `tests/pd.test.mjs` - harness `node:vm` (loadPureBlock/loadNetBlock) cobrindo as 26 asserções novas (PD_TABELA_CA, pdRegrasDaZona, potencialConstrutivo, criterioDetectorPD, resolverZonaUI, pdConsultarLote/PDCACHE)
- `tests/fixtures.mjs` - `PD_FIX.respostas`: 5 cenários sintéticos das 9 layers (aaResolvido, macrozonaSemUnidade, rural, todasFalharam, parcial, comAeis)
- `radar-goiania.html` - bloco `RADAR_PURE`: `PD_DISCLAIMER`, `PD_LAYERS`, `PD_TABELA_CA`, `PD_MZC_BASICO`, `pdRegrasDaZona`, `potencialConstrutivo`, `criterioDetectorPD`, `resolverZonaUI`; novo bloco `PD_NET`: `PDCACHE`, `PD_SVC_BASE`, `pdConsultarLote`

## Decisions Made
- 6x publicado como `ca_maximo` padrão da AA (Art. 196, II); o 7,5x excepcional (TDC + fora de PDU, Art. 252 §6º) foi deliberadamente omitido da tabela — decisão de UX já recomendada pelo 18-RESEARCH.md, não um gate de verdade em aberto
- `fonte` sempre cita "Art. X, LC 349/2022" — nunca "Anexo" — reforçado por um guard de integridade automatizado na própria suíte (falha se qualquer sigla `conferido:true` citar "Anexo")
- AOS/AAB com `ca_maximo:null` e `conferido:true` simultaneamente: modela corretamente o achado negativo (a lei não define teto para essas zonas) sem violar a REGRA DE OURO (o `null` aqui é uma constatação factual, não uma lacuna)

## Deviations from Plan

None - plan executado exatamente como escrito. A única adaptação foi de forma (não de conteúdo): o RED de TDD foi escrito cobrindo o contrato completo das 3 tasks num único commit inicial (já que as 3 tasks compartilham o mesmo arquivo `tests/pd.test.mjs`), e cada GREEN subsequente foi verificado com um harness `node:vm` ad-hoc isolado por task antes do commit — a suíte oficial (`npm test`) só precisa carregar o bloco inteiro, então só fica 100% verde após a Task 3. Isso é uma consequência estrutural do harness compartilhado, não uma mudança de escopo.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Núcleo determinístico completo e testado (PD-01/02/04) — plano 02 (ficha/accordion Urbanístico) e plano 03 (choropleth) podem consumir `PD_TABELA_CA`/`pdRegrasDaZona`/`resolverZonaUI`/`pdConsultarLote` como composição pura de UI, sem tocar lógica de dados
- Pendências herdadas do 18-RESEARCH.md (não-bloqueantes para este plano): LC 363/364/371/373 ainda não lidas por completo (HUMAN-UAT do advogado, já documentado em `PD_TABELA_CA._meta.pendente`); Vi de outorga onerosa fora do escopo desta fase

---
*Phase: 18-inteligencia-urbanistica-plano-diretor*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: tests/pd.test.mjs
- FOUND: .planning/phases/18-inteligencia-urbanistica-plano-diretor/18-01-SUMMARY.md
- FOUND commit: 04c81b6 (test RED)
- FOUND commit: 69a0772 (Task 1 GREEN)
- FOUND commit: b1a762c (Task 2 GREEN)
- FOUND commit: 5737566 (Task 3 GREEN)
