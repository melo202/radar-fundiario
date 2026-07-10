---
phase: 18-inteligencia-urbanistica-plano-diretor
verified: 2026-07-10T05:30:28Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Revisão jurídica dos valores/artigos citados em PD_TABELA_CA e do texto do PD_DISCLAIMER"
    expected: "Advogado (usuário) confirma que AA(6,0x)/ADD(5,0x)/AOS(sem teto)/regime de altura 100%/50% e as citações de artigo (Art. 190/196/242 LC 349/2022) estão corretas e que o disclaimer cobre adequadamente o risco de informação desatualizada"
    why_human: "Interpretação jurídica de lei municipal; não é verificável por grep/teste automatizado. Já registrado como HUMAN-UAT diferido em PD_TABELA_CA._meta.pendente e nos 3 SUMMARYs da fase"
  - test: "Staleness completa das emendas LC 358/363/364/371/373/379 sobre a LC 349/2022"
    expected: "Leitura integral das 4 emendas ainda pendentes (LC 363/364/371/373) confirma que nenhuma altera os Art. 190/196/242/252 usados em PD_TABELA_CA; `_meta.emendas_verificadas`/`_meta.pendente` atualizados de acordo"
    why_human: "Requer leitura de texto legal integral (PDF), não auditável por regra determinística; já é auto-documentado como pendência na própria tabela (`_meta.pendente`)"
  - test: "Contraste visual das 6 cores de zona (--zone-*) sobre CARTO e sobre satélite em device real"
    expected: "As 6 cores (AA/ADD/AOS/AEIS/APAC/OOAU) permanecem distinguíveis entre si e legíveis sobre os dois fundos de mapa em tela de celular real, não só em preview de desenvolvimento"
    why_human: "Percepção visual de contraste em hardware/tela real; grep/teste automatizado não mede legibilidade humana"
---

# Phase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022) Verification Report

**Phase Goal:** A ficha responde "o que este lote PODE SER" — zona/unidade do Modelo Espacial (point-in-polygon ao vivo), CA/usos (tabela conferida na fonte primária; número não-conferido NUNCA exibido), seção Urbanístico com disclaimer, score+detector com potencial-do-PD (score 0-100 inalterado, PD via porquê[]; detector com fallback), choropleth de zonas viewport-limited — determinístico, zero IA, sem avalanche.
**Verified:** 2026-07-10T05:30:28Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Roadmap Success Criteria) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | Abrir a ficha de um lote dispara consulta point-in-polygon lazy/agrupada às camadas do Modelo Espacial (mesmo padrão jsonp/token/retry, sem avalanche) | ✓ VERIFIED | `pdConsultarLote`/`pdBateriaConsulta` (radar-goiania.html:3878+) disparam 9 `jsonp` em paralelo via `Promise.allSettled` contra `Mapa_ModeloEspacial/MapServer` (produção — `_teste` ausente); dedupe por `PDCACHE[ci]` + `capCache(PDCACHE,60)`. LIVE-VERIFIED pelo orquestrador em Chromium: `pdConsultarLote(686000,8153000)` → 568ms, estado "resolvido", cache 0ms na 2ª chamada. Hotfix `outFields=*` aplicado (commit `1b952bf`) após achar que o endpoint rejeita `outFields` restrito — confirmado ao vivo |
| 2 | `PD_TABELA_CA` versionada com CADA número conferido contra a fonte primária (LC 349/2022); divergência 6x vs 7,5x da AA resolvida; emendas (LC 358/363/364/371/373/379) checadas e anotadas | ✓ VERIFIED (núcleo) / ? pendência anotada | `PD_TABELA_CA.AA.ca_maximo===6.0`/`ADD.ca_maximo===5.0`, ambos `conferido:true`, `fonte` cita "Art. 242, VII; Art. 196, II/I; Art. 190" (nunca "Anexo" — guard de integridade testado); 7,5x documentado como exceção condicional (TDC, Art. 252 §6º), deliberadamente fora da tabela padrão. `_meta.emendas_verificadas` cobre LC 358/379; `_meta.pendente` registra LC 363/364/371/373 como HUMAN-UAT do advogado (não bloqueante, mas pendente de fato) |
| 3 | Seção "Urbanístico" na ficha (accordion, padrão Fase 9): macrozona/unidade, CA, usos, eixo/adensamento, disclaimer fixo, linguagem no gate da Fase 14 | ✓ VERIFIED | `#dUrbanistico` inserido entre `dtecnico` (linha 1181) e `dmetodologia` (linha 1199); `renderUrbanisticoUI`/`montarUrbBodyHTML` renderizam os 6 estados (resolvido/resolvido_sem_unidade/parcial/rural/erro/carregando); `PD_DISCLAIMER` literal ("Não substitui a Certidão de Uso do Solo da SEPLANH") sempre presente exceto em `erro`; linha "Usos" só quando `usos_conferido:true`. LIVE-VERIFIED: render mostrou "CA básico 1,0x · CA máximo 6,0x", "qualquer uso", regime de altura, disclaimer, zero "undefined" |
| 4 | Score de oportunidade ganha o fator potencial-construtivo (construído÷potencial-PD) e o detector passa a usar construído/potencial-PD — ambos explicáveis citando a zona | ✓ VERIFIED | `atualizarScorePorquePD` acrescenta "Em {zona} — CA básico Xx, potencial de Y m²" ao `porquê` do score só quando `conferido===true` (score 0-100 de `scoreOportunidade` permanece intocado — decisão de design W1 documentada); `criterioDetectorPD`/`detectorRotuloPD`/`consultarPDPorQuadra` reescrevem o critério do detector para `construído÷potencial-PD` com fallback `areaedif/areaterr` rotulado (`criterio:"terreno"`) via `PDQUADRACACHE` dedicado (nunca compartilha `PDCACHE`, W3); guarda de invalidação por referência (`TERR_DETECTOR_CAND!==cand`) aplicada no fix WR-04 |
| 5 | Camada de zonas como toggle no Território (choropleth por zona), legível sobre CARTO e satélite | ✓ VERIFIED | Chips exclusivos `#terrChipValor`/`#terrChipZonas` substituem o botão único; `toggleCamadaTematica`/`proximoEstadoCamada` (tri-state testado) garantem exclusividade; `carregarZonasViewport` consulta 6 layers com `returnGeometry:"true"` LIMITADA ao envelope da viewport + `ZONACACHE`; gate de zoom `zonasZoomGateOk(zoom>=13)` (fix WR-01) evita consulta de cidade inteira; paleta `--zone-*` (7 pares) com opacidade flat .22/.42 por fundo. LIVE-VERIFIED: `carregarZonasViewport(bounds reais)` → 383ms, polígono ADD desenhado no viewport central, guarda sem-bounds retorna null |

**Score:** 5/5 truths verified (item 2 carrega uma pendência de revisão jurídica explicitamente anotada — não bloqueia a entrega técnica, mas é HUMAN-UAT real)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/pd.test.mjs` | Suíte TDD do núcleo PD | ✓ VERIFIED | 54 testes específicos (`node --test tests/pd.test.mjs`), todos verdes |
| `radar-goiania.html` — `PD_TABELA_CA`/`PD_MZC_BASICO`/`pdRegrasDaZona`/`potencialConstrutivo`/`criterioDetectorPD`/`resolverZonaUI` | Núcleo puro RADAR_PURE | ✓ VERIFIED | Presentes entre `RADAR_PURE_START`/`RADAR_PURE_END`; guard de integridade (nenhum `conferido:true` cita "Anexo") passa |
| `radar-goiania.html` — `pdConsultarLote`/`PDCACHE`/`PD_SVC_BASE` (PD_NET) | Bateria lazy deduplicada | ✓ VERIFIED | `PD_NET_START` presente; produção (`Mapa_ModeloEspacial`), `_teste` ausente; `outFields=*` hotfix aplicado e testado ao vivo |
| `radar-goiania.html` — `#dUrbanistico`/`renderUrbanisticoUI`/`montarUrbBodyHTML` | Accordion Urbanístico na ficha | ✓ VERIFIED | Ordem correta no DOM (dtecnico → dUrbanistico → dmetodologia); wired em `showDetail` (linha 5444) |
| `radar-goiania.html` — `atualizarScorePorquePD`/`detectorRotuloPD`/`PDQUADRACACHE` | Integração score/detector | ✓ VERIFIED | Wired em `renderScoresInto`/`atualizarScores` (5323) e no fluxo de resolução do PD (5651-5652); cache dedicado confirmado |
| `radar-goiania.html` — `toggleCamadaTematica`/`carregarZonasViewport`/`--zone-*`/`ZONACACHE` | Choropleth de zonas viewport-limited | ✓ VERIFIED | Chips no HTML (linhas 1249-1250); engine tri-state + gate de zoom + cache confirmados por grep e teste |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `pdConsultarLote` | `jsonp` + `resolverZonaUI` | `Promise.allSettled` das 9 layers, resultado montado por `resolverZonaUI`, cacheado em `PDCACHE[ci]` | ✓ WIRED | Confirmado por leitura de código + LIVE-VERIFIED (568ms, estado "resolvido") |
| `potencialConstrutivo` | `pdRegrasDaZona` | lookup da regra; retorna `areaterr×ca_basico` só quando `conferido:true` | ✓ WIRED | `potencialConstrutivo` chama `pdRegrasDaZona(sigla)` e retorna `null` quando `conferido!==true` (REGRA DE OURO testada) |
| `showDetail(a,ll)` | `renderUrbanisticoUI(a)` | chamada assíncrona irmã de `renderDiffUI`, após `DCUR=a` | ✓ WIRED | Linha 5444: `renderUrbanisticoUI(a);` logo após `renderDiffUI(a)` |
| `renderUrbanisticoUI` | `pdConsultarLote` + `PD_DISCLAIMER` + `esc()` | consulta lazy, render seguro, disclaimer sempre presente | ✓ WIRED | `renderUrbanisticoUI` (5632) chama `pdConsultarLote`, guarda de corrida por `ci`, monta via `montarUrbBodyHTML` |
| detector (`#terrDetectorList`) | `criterioDetectorPD` | rótulo do critério por candidato, consulta barata por centroide de quadra | ✓ WIRED | `consultarPDPorQuadra`/`detectorRotuloPD`/`renderDetectorCriterioPD` (com guarda de invalidação WR-04) |
| `#terrChipZonas` | `toggleCamadaTematica('zonas')` | chip exclusivo; liga zonas e desliga valor | ✓ WIRED | onclick presente; `proximoEstadoCamada` testado (4 testes de exclusividade) |
| camada de zonas | `jsonp returnGeometry=true` (viewport) | 6 layers limitadas ao envelope em foco, cache por viewport | ✓ WIRED | `carregarZonasViewport` (3953+) — bbox sempre presente, guarda anti-"sem bounds", `ZONACACHE` dedupe testado; gate de zoom aplicado em `desenharZonas` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `#dUrbBody` (accordion) | `estado` (de `pdConsultarLote`) | `Mapa_ModeloEspacial/MapServer` (produção, ArcGIS oficial) | Sim — LIVE-VERIFIED: consulta real ao ponto retornou macrozona/unidade/badges reais, não estático | ✓ FLOWING |
| `#scoreOpWhy` (linha "Em {zona}...") | `a.__pdEstado` | mesmo `pdConsultarLote`, cacheado por lote | Sim — só aparece quando `conferido===true` e `potencialConstrutivo` retorna número real | ✓ FLOWING |
| `#terrDetectorList` rótulo de critério | `porQuadra` (de `consultarPDPorQuadra`) | `pdConsultarQuadra` → mesma bateria de 9 layers, por centroide de quadra | Sim — dedupe testado, mas fallback rotulado quando indisponível (comportamento esperado, não hollow) | ✓ FLOWING |
| camada de zonas (Leaflet) | `porZona` (de `carregarZonasViewport`) | 6 layers com `returnGeometry:true`, geometria real do ArcGIS | Sim — LIVE-VERIFIED: polígono real desenhado no viewport central em 383ms | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `pdConsultarLote` resolve zona real | LIVE (Chromium, orquestrador): `pdConsultarLote(686000,8153000)` | 568ms, estado "resolvido", MACROZONA CONSTRUÍDA / AA — Área Adensável, "CA básico 1,0x · CA máximo 6,0x", "qualquer uso", regime de altura verbatim, disclaimer presente, zero "undefined" | ✓ PASS |
| `PDCACHE` dedupe | LIVE: 2ª chamada com o mesmo `ci` | cache 0ms | ✓ PASS |
| `carregarZonasViewport` consulta real | LIVE: `carregarZonasViewport(bounds reais)` | 383ms, polígono ADD desenhado no viewport central | ✓ PASS |
| Guarda sem-bounds | LIVE: `carregarZonasViewport(null/inválido)` | retorna `null`, não dispara `jsonp` | ✓ PASS |
| `npm test` suíte completa | `npm test` (238 testes) | 238/238 verde, 0 falhas | ✓ PASS |
| `node --test tests/pd.test.mjs` | 54 testes específicos da fase | 54/54 verde | ✓ PASS |

Nota: o hotfix `outFields=*` (commit `1b952bf`) foi encontrado e corrigido DURANTE a verificação ao vivo do orquestrador — o endpoint `Mapa_ModeloEspacial` rejeita `outFields` restrito com "Failed to execute query"; ambos os caminhos (`pdBateriaConsulta` e `carregarZonasViewport`) foram corrigidos e re-testados ao vivo com sucesso após o fix.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PD-01 | 18-01 | Consulta urbanística por lote via point-in-polygon, lazy/agrupada, sem avalanche | ✓ SATISFIED | `pdConsultarLote`/`PDCACHE`/`Promise.allSettled`, live-verified 568ms + cache 0ms |
| PD-02 | 18-01 | Tabela estática zona→regras com números conferidos; divergência 6x/7,5x resolvida; número não-conferido nunca exibido | ✓ SATISFIED (núcleo) / pendência jurídica anotada | `PD_TABELA_CA` com guard de integridade testado; `_meta.pendente` documenta LC 363/364/371/373 como HUMAN-UAT |
| PD-03 | 18-02 | Seção "Urbanístico" na ficha (accordion), disclaimer fixo | ✓ SATISFIED | `#dUrbanistico` wired, disclaimer literal sempre presente, live-verified |
| PD-04 | 18-02 | Score ganha fator potencial-construtivo; detector passa a usar construído/potencial-PD, ambos explicáveis | ✓ SATISFIED | `atualizarScorePorquePD`/`criterioDetectorPD`/`detectorRotuloPD`, score 0-100 intacto (decisão W1) |
| PD-05 | 18-03 | Camada de zonas como toggle no Território, viewport-limited | ✓ SATISFIED | `toggleCamadaTematica`/`carregarZonasViewport`/`ZONACACHE`/gate de zoom, live-verified 383ms |

Nenhum requisito órfão — todos os 5 (PD-01..05) aparecem em pelo menos um plano e foram verificados.

### Anti-Patterns Found

Nenhum bloqueador encontrado. Os 4 warnings + 1 info do `18-REVIEW.md` (WR-01 gate de zoom, WR-02 badge redundante, WR-03 precedência não documentada, WR-04 race condition no detector, IN-01 accordion visível sem coordenadas) foram todos corrigidos e verificados em `18-REVIEW-FIX.md` (commits `3d10c2a`, `1a1dd3b`, `08820d9`, `feb90e2`, `f313ccd`) — confirmado por grep/leitura de código nesta verificação. Nenhum `console.log`/`TODO`/`FIXME`/placeholder encontrado no código novo da fase. Nenhuma citação "Anexo" em `fonte` de sigla `conferido:true`.

### Human Verification Required

### 1. Revisão jurídica dos valores/artigos do Plano Diretor

**Test:** Advogado (usuário) revisa `PD_TABELA_CA` (AA/ADD/AOS/AEIS/APAC/PD_MZC_BASICO) e o texto de `PD_DISCLAIMER` contra o texto integral da LC 349/2022 e suas alterações.
**Expected:** Confirma que os números (CA básico/máximo, regime de altura 100%/50%, citações de Art. 190/196/242) e o disclaimer estão corretos e adequados ao risco jurídico.
**Why human:** Interpretação de lei municipal; app já se protege via REGRA DE OURO (número não-conferido nunca aparece), mas a curadoria dos números *conferidos* é humana por natureza.

### 2. Staleness completa das emendas pendentes (LC 363/364/371/373)

**Test:** Ler o texto integral das 4 emendas ainda não verificadas contra os artigos usados na tabela.
**Expected:** Confirmar que nenhuma altera Art. 190/196/242/252; atualizar `_meta.emendas_verificadas`/`_meta.pendente` de acordo.
**Why human:** Já auto-documentado como pendência dentro da própria tabela (`PD_TABELA_CA._meta.pendente`); requer leitura de texto legal, não é uma checagem de código.

### 3. Contraste das 6 cores de zona em device real

**Test:** Abrir o Território com o chip "Colorir por zonas do Plano Diretor" ligado em um celular real, sobre CARTO e sobre satélite.
**Expected:** As 6 cores (`--zone-aa/add/aos/aeis/apac/ooau`) permanecem distinguíveis e legíveis nos dois fundos.
**Why human:** Percepção de contraste visual em hardware real; a opacidade flat (.22/.42) e a paleta foram verificadas por código/live-preview, mas não em device físico.

### Gaps Summary

Nenhum gap bloqueante. A fase entrega todos os artefatos e wiring especificados nos 3 planos, com os 5 findings do code review corrigidos e um hotfix de produção (`outFields=*`) encontrado e corrigido durante a verificação ao vivo do orquestrador. `npm test` verde (238/238), incluindo os 54 testes específicos de `tests/pd.test.mjs`. A única lacuna real é a revisão jurídica humana dos valores legais (já esperada e sinalizada como `phase flags`/HUMAN-UAT no ROADMAP e nos 3 SUMMARYs desta fase) — não é um defeito de implementação, é trabalho que só o usuário (advogado) pode concluir. Por isso o status é `human_needed`, não `gaps_found`.

---

_Verified: 2026-07-10T05:30:28Z_
_Verifier: Claude (gsd-verifier)_
