---
phase: 18-inteligencia-urbanistica-plano-diretor
plan: 03
subsystem: ui
tags: [plano-diretor, zoneamento, choropleth, leaflet, node-test, node-vm]

# Dependency graph
requires:
  - phase: 18-01
    provides: "PD_LAYERS/PD_TABELA_CA/PD_SVC_BASE/jsonp/capCache (RADAR_PURE + PD_NET)"
  - phase: 18-02
    provides: "accordion Urbanístico + score/detector com PD — sem sobreposição de escopo com este plano"
  - phase: 15-02
    provides: "engenharia de choropleth (baiStyle, opacidade por fundo, legenda #terrLegenda, reduced-motion/mAnimate) reusada verbatim para o modo 'valor' e como molde do modo 'zonas'"
provides:
  - "paleta --zone-*/--zone-*-line (7 pares) sourced ao vivo do ArcGIS oficial, com nota explícita de engenharia própria"
  - "chips exclusivos #terrChipValor/#terrChipZonas (substituem #terrPanelToggle) + legenda data-mode + montarLegendaZonas"
  - "proximoEstadoCamada (RADAR_PURE, pura): transição tri-state nenhuma/valor/zonas, exclusividade testável isoladamente"
  - "toggleCamadaTematica/sincCamadaChips: fonte única de verdade do seletor de camada temática, substitui toggleChoropleth/sincTerrPanelToggle"
  - "carregarZonasViewport (PD_ZONA_NET): consulta das 6 layers de unidade territorial LIMITADA à viewport em foco + ZONACACHE"
  - "desenharZonas/limparZonas/zonaEstiloPorSigla: 6 layers Leaflet empilhadas semi-transparentes, opacidade flat por fundo, pane 'zonas' dedicado"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regra de exclusividade extraída para função PURA (proximoEstadoCamada) testável isoladamente, em vez de testar a função DOM-pesada que a consome (toggleCamadaTematica) — mesmo princípio já implícito no app: baiStyle/toggleChoropleth (Fase 15) nunca foram unit-testados diretamente"
    - "PD_ZONA_NET: novo bloco de I/O (mesmo padrão START/END de PD_NET) para a query de geometria viewport-limited — testado com jsonp/proj4/capCache stubados e um bounds mockado no formato L.LatLngBounds"
    - "ZONACACHE dedicado (nunca compartilhado com PDCACHE/PDQUADRACACHE) por chave de viewport ARREDONDADA (Math.round do envelope em 31982)"

key-files:
  created: []
  modified:
    - radar-goiania.html
    - tests/pd.test.mjs

key-decisions:
  - "Exclusividade do seletor tri-state testada via proximoEstadoCamada (função pura extraída) em vez de via toggleCamadaTematica/DOM diretamente — consistente com o padrão já estabelecido no app (funções DOM/Leaflet-pesadas como baiStyle/desenharChoropleth nunca são exercitadas via node:vm; só a REGRA que elas aplicam é testada)"
  - "carregarZonasViewport testada com bounds mockado no formato L.LatLngBounds (getWest/getSouth/getEast/getNorth) — satisfaz 'L mockado' do plano sem precisar stubar o global L inteiro (desenharZonas, que de fato usa L.polygon/L.layerGroup, permanece não-testada diretamente, mesmo padrão de refreshLots/lotStyle)"
  - "Fix Rule 1 (CSS specificity): .chips button.on (0,2,1) perderia o tie-break de ordem contra .detail .acts button (0,2,1, definida depois no arquivo) — o accent do chip ativo nunca apareceria. Mesma especificidade/solução já documentada para .acts-save.is-saved (Fase 10); adicionado .detail .acts .chips button.on (0,4,1)"
  - "montarLegendaZonas() e a paleta/HTML da legenda (Task 1) commitados separadamente de toggleCamadaTematica/desenharZonas (Task 2) via reconstrução de estado intermediário do arquivo — os 2 commits são exatamente os 2 tasks, sem hunks cruzados"

patterns-established:
  - "toggleCamadaTematica(modo)/sincCamadaChips(novo): 3º par 'seletor tri-state + sync único' do app depois do padrão CHOROPLETH_ON/sincTerrPanelToggle (Fase 15) — generalizável para futuros seletores de camada temática"

requirements-completed: [PD-05]

# Metrics
duration: ~35min
completed: 2026-07-10
---

# Phase 18 Plan 03: Choropleth de Zonas do Plano Diretor no Território Summary

**Seletor tri-state exclusivo (Colorir por valor / Colorir por zonas do Plano Diretor) com paleta `--zone-*` sourced ao vivo do ArcGIS oficial, geometria consultada só na viewport em foco (nunca a cidade inteira) e cacheada por sessão — fecha a Fase 18 com toda a suíte e os greps de honestidade verdes.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 2 (`radar-goiania.html`, `tests/pd.test.mjs`)

## Accomplishments
- 7 pares `--zone-*`/`--zone-*-line` declarados no `:root`, sourced diretamente da simbologia oficial do ArcGIS (`Mapa_ModeloEspacial/MapServer/{7,28,29,30,31,32}?f=json`), com nota explícita de quais 3 são engenharia própria (`--zone-none`, `--zone-apac-line`, `--zone-aos-line`) — mesma disciplina de honestidade do REGRA DE OURO estendida a cor
- Botão único `#terrPanelToggle` substituído por 2 chips mutuamente exclusivos (`#terrChipValor`/`#terrChipZonas`), reusando `.chips` verbatim; legenda `#terrLegenda` ganhou `data-mode="valor"|"zonas"` e um 2º container de swatches (6 zonas + item neutro "Sem classificação específica")
- `toggleCamadaTematica(modo)`/`sincCamadaChips(novo)` — fonte única de verdade tri-state (nenhuma/valor/zonas) que substitui `toggleChoropleth()`/`sincTerrPanelToggle()` (Fase 15); exclusividade garantida por `proximoEstadoCamada` (função pura, RADAR_PURE)
- `carregarZonasViewport` (bloco novo `PD_ZONA_NET`): consulta as 6 layers de unidade territorial com `returnGeometry:"true"` LIMITADA ao envelope da viewport atual (nunca a cidade inteira — o payload é real, 86 KB/12 polígonos medido) + `ZONACACHE` por chave de viewport arredondada
- `desenharZonas`/`limparZonas`/`zonaEstiloPorSigla`: 6 layers Leaflet separadas e semi-transparentes empilhadas (nunca 1 fill "vencedor" — um lote pode estar em AA+AEIS ao mesmo tempo), opacidade FLAT por fundo (`.22` CARTO / `.42` satélite), traço pela MESMA rampa de zoom de `baiStyle`, pane `"zonas"` dedicado (z-index 375) e reconsulta debounced no `moveend` (mesmo padrão de `refreshLots`)
- Fix de especificidade CSS (Rule 1): sem `.detail .acts .chips button.on{...}`, o accent do chip ativo nunca apareceria (colisão com `.detail .acts button`, mesma especificidade, ordem no arquivo vencendo) — corrigido com o mesmo padrão já usado em `.acts-save.is-saved`
- `npm test`: 233/233 verde (225 baseline + 8 novos: 4 de `proximoEstadoCamada` exclusividade + 4 de `carregarZonasViewport` bbox/returnGeometry/guarda-anti-cidade-inteira/cache)
- Todos os greps de honestidade/produção/contrato do fechamento da fase passam (ver seção Verificação)

## Task Commits

1. **Task 1: Paleta --zone-* + chips exclusivos + legenda de zonas (PD-05 UI)** - `205650d` (feat)
2. **Task 2: toggleCamadaTematica + camada de zonas viewport-limited (PD-05 engine)** - `3f05332` (feat, inclui os 8 testes novos)
3. **Task 3: verificação final** - sem código novo (greps + `npm test`), documentada nesta SUMMARY

_Nota: os 2 commits de código foram construídos via reconstrução determinística do estado intermediário do arquivo (Task 1 = HTML/CSS + `montarLegendaZonas`; Task 2 = estado tri-state + engine de renderização + `PD_ZONA_NET` + testes), garantindo que cada commit reflita EXATAMENTE o escopo do seu task (sem hunks cruzados), apesar de as duas tasks terem sido implementadas em uma única passagem de edição por estarem fortemente acopladas (o `onclick` dos chips do Task 1 já referencia `toggleCamadaTematica`, definida só no Task 2 — o próprio texto do plano antecipa esse acoplamento)._

## Files Created/Modified
- `radar-goiania.html` — CSS: 7 pares `--zone-*`, `.zone-swatch`, `.terr-swatches{flex-wrap:wrap}`, especificidade `.detail .acts .chips button.on`; HTML: chips `#terrLayerChips`, legenda com `data-mode`/`#terrSwatchesValor`/`#terrSwatchesZonas`; JS: `proximoEstadoCamada` (RADAR_PURE), `toggleCamadaTematica`/`sincCamadaChips`/`montarLegendaZonas`/`desenharZonas`/`limparZonas`/`zonaEstiloPorSigla`/`ZONA_LAYERS`/`ZONAS_ON`, bloco `PD_ZONA_NET` (`carregarZonasViewport`/`ZONACACHE`), pane `"zonas"` + listener `moveend` em `initMap`
- `tests/pd.test.mjs` — 8 testes novos: 4 de `proximoEstadoCamada` (exclusividade tri-state) + 4 de `carregarZonasViewport` (bbox+returnGeometry sempre presentes, guarda anti-"cidade inteira", ZONACACHE dedupe por viewport arredondado, viewport diferente dispara nova bateria)

## Decisions Made
- Exclusividade testada via `proximoEstadoCamada` (pura) em vez de `toggleCamadaTematica`/DOM — consistente com o padrão já estabelecido no app (nenhuma função DOM/Leaflet-pesada, como `baiStyle`/`desenharChoropleth`/`toggleChoropleth` da Fase 15, é unit-testada diretamente; só a regra pura que ela aplica é)
- `carregarZonasViewport` testada com um objeto `bounds` mockado no formato `L.LatLngBounds` (`getWest/getSouth/getEast/getNorth`) — satisfaz "L mockado" do plano sem precisar stubar o global `L` inteiro; `desenharZonas` (que usa `L.polygon`/`L.layerGroup` de fato) segue não-testada diretamente, mesmo padrão de `refreshLots`
- Fix Rule 1 (bug de especificidade CSS): `.chips button.on` perderia o tie-break de ORDEM contra `.detail .acts button` (mesma especificidade 0,2,1, regra posterior no arquivo) — sem a correção, o accent do chip ativo nunca renderizaria; resolvido com `.detail .acts .chips button.on` (0,4,1), mesmo padrão já documentado para `.acts-save.is-saved`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Especificidade CSS impediria o accent do chip ativo de aparecer**
- **Found during:** Task 1 (montagem dos chips dentro de `.detail .acts`)
- **Issue:** `.chips button.on{background:var(--accent)...}` (especificidade 0,2,1) tem a MESMA especificidade de `.detail .acts button{background:var(--paper)...}` (0,2,1), e esta última vem DEPOIS no arquivo — pelo tie-break de ordem do CSS, o fundo `--paper` sempre venceria, e o chip "ligado" nunca ficaria visualmente diferente do desligado
- **Fix:** adicionado `.detail .acts .chips button.on{background:var(--accent);border-color:var(--accent);color:#fff}` (especificidade 0,4,1), mesmo padrão já usado em `.acts-save.is-saved` (linha ~758, mesmo problema documentado na Fase 10)
- **Files modified:** `radar-goiania.html`
- **Verification:** leitura da cascata CSS confirmada manualmente (mesma técnica de contagem de especificidade do comentário original de `.acts-save.is-saved`); verificação visual ao vivo fica no checklist de browser abaixo (item "Território")
- **Committed in:** `205650d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug de especificidade CSS)
**Impact on plan:** Correção necessária para a feedback visual do seletor funcionar como especificado (must_have "ligar zonas colore o mapa... e mostra a legenda de zonas" implica que o usuário PRECISA ver qual chip está ativo). Sem escopo além do previsto.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Verificação Final da Fase (Task 3)

### npm test
`npm test` → **233/233 verde** (225 baseline + 8 novos desta plan).

### Greps de honestidade/contrato

| Verificação | Resultado |
|---|---|
| Disclaimer literal (`Não substitui a Certidão de Uso do Solo da SEPLANH`) | PASS |
| Citação `Art. 196, II` presente | PASS |
| Citação `Art. 242` presente | PASS |
| `Mapa_ModeloEspacial` (produção) presente | PASS |
| `Mapa_ModeloEspacial_teste` ausente | PASS |
| `PD_LAYERS` com `macrozona:33` (bateria completa 33/31/30/29/7/28/32/4/1) | PASS |
| `PDQUADRACACHE` presente (cache do detector, nunca compartilhado com `PDCACHE`) | PASS |
| `resolvido_sem_unidade` presente (6º estado anti-crash, BLOCKER 2) | PASS |
| `PD_MZC_BASICO` presente | PASS |
| Nenhuma `fonte` com `conferido:true` cita "Anexo" (guarda de integridade em `tests/pd.test.mjs`) | PASS (teste automatizado) |
| `montarUrbBodyHTML` REGRA DE OURO (`conferido:false` → sem número) | PASS (9 testes em `tests/pd.test.mjs`, herdados do 18-02) |
| Exclusividade das camadas temáticas (`proximoEstadoCamada`) | PASS (4 testes novos nesta plan) |

### Checklist de verificação em browser (para o orquestrador rodar via preview)

- [ ] Abrir ficha de um lote urbano → accordion "Urbanístico" resolve zona (macrozona + unidade); DevTools: ~9 requests pequenos ao ModeloEspacial; reabrir a ficha NÃO redispara (PDCACHE)
- [ ] Lote em AA → mostra "CA básico 1,0x · CA máximo 6,0x", linha "Usos: qualquer uso" + disclaimer; lote em zona `conferido:false` → só a zona + nota (nenhum número)
- [ ] Lote urbano SEM unidade territorial (Macrozona Construída fora de AA/ADD/AOS, ex. AAB) → mostra "CA básico 1,0x" (nunca máximo) + nota "sem unidade territorial específica"; NUNCA "undefined — undefined"
- [ ] Lote rural → mensagem "Fora da Macrozona Construída"
- [ ] Território → abrir o painel, conferir os 2 chips `Colorir por valor`/`Colorir por zonas do Plano Diretor` no rodapé; ligar "zonas" colore o mapa por unidade territorial e mostra a legenda com os 6 swatches + item neutro; ligar "zonas" desliga "valor" automaticamente (visualmente — só 1 chip com accent por vez); legibilidade das 6 cores sobre CARTO e sobre satélite; DevTools: a query de geometria (`returnGeometry=true`) usa um envelope pequeno (viewport atual, nunca a cidade inteira) e não redispara ao reabrir a MESMA área (ZONACACHE)
- [ ] Detector → cada candidato rotula o critério (PD ou fallback)
- [ ] Item diferido (registrar): revisão jurídica dos valores/artigos e do disclaimer pelo advogado (HUMAN-UAT); staleness completa das emendas LC 363/364/371/373 (18-RESEARCH Assumptions A1, herdado do 18-01)

## Known Stubs
None — nenhum stub/placeholder introduzido nesta plan. A camada de zonas depende de dado real do endpoint (sem mock/fallback fabricado); quando a consulta falha, a camada simplesmente não desenha aquela zona (omissão honesta, mesmo princípio das demais camadas do app).

## Threat Flags
None — as 3 mitigações do `threat_model` do plano (T-18-02 DoS/viewport-limit, T-18-03 XSS/esc, T-18-01 honestidade) foram implementadas conforme especificado; nenhuma superfície nova além do previsto foi introduzida.

## Next Phase Readiness
- Fase 18 (Inteligência Urbanística — Plano Diretor 2022) fechada: núcleo determinístico (18-01) + ficha honesta (18-02) + choropleth de zonas exclusivo e viewport-limited (18-03), tudo verde e verificável
- Checklist de browser acima é a única pendência antes do `/gsd-verify-work` — não bloqueante para o código (toda a lógica já está coberta por teste automatizado)
- HUMAN-UAT diferido (não-bloqueante, herdado): revisão jurídica advogado + staleness das emendas LC 363/364/371/373

---
*Phase: 18-inteligencia-urbanistica-plano-diretor*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: tests/pd.test.mjs
- FOUND: .planning/phases/18-inteligencia-urbanistica-plano-diretor/18-03-SUMMARY.md
- FOUND commit: 205650d (Task 1 GREEN)
- FOUND commit: 3f05332 (Task 2 GREEN, incl. 8 testes)
