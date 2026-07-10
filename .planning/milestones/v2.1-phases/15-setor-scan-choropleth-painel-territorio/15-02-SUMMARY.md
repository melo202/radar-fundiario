---
phase: 15-setor-scan-choropleth-painel-territorio
plan: 02
subsystem: choropleth-territorio
tags: [leaflet-setstyle, canvas-renderer, css-custom-properties, sw-cache-versioning, a11y-legend, reduced-motion]

# Dependency graph
requires:
  - phase: 15-01
    provides: "estatTerritorio/breaksQuantil/binQuantil/pm2Lote (RADAR_PURE) e territorioScan(cdbairro) compartilhado — consumidos por aplicarChoropleth(scan)"
provides:
  - "bairro-cdbairro.json (snapshot runtime id->{cd,mo}) + lookups idParaCdbairro/cdbairroParaIds (fetch lazy) resolvendo o gap id<->cdbairro"
  - "Paleta --terr-q1..q5 (+ -ink) e mapas JS resolvidos (TERR_COLORS/TERR_INK/TERR_FILLOP_CARTO/TERR_FILLOP_SAT)"
  - "lotStyle(ci)/baiStyle(feature) estendidos para pintar por faixa de quantil (TERR_LOTE_BIN) e wash do setor ativo (TERR_SETOR_ATIVO), 100% via setStyle (nunca recria geometria)"
  - "aplicarChoropleth(scan)/desenharChoropleth(): ponte entre o scan de rede (15-01) e o styling do mapa"
  - "#terrLegenda: legenda tocável (toggle, 5 swatches + faixas R$/m², rótulo de amostra, recolhimento REDUCE-safe)"
affects: ["15-03-painel-territorio"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snapshot de runtime versionado (bairro-cdbairro.json) gerado por node one-liner a partir de um artefato de auditoria já committed (bairros-goiania.recon.json), nunca editado à mão"
    - "Extensão de hook de estilo Leaflet (lotStyle(ci)/baiStyle(feature)) com parâmetro explícito consultando Maps globais — mesmo padrão de troca em massa via setStyle já usado em setSatelite"
    - "poly._terrCi guardado no momento da criação do polígono para que trocas futuras de estilo (satélite, choropleth) nunca precisem recriar geometria nem re-derivar o ci"
    - "Legenda REDUCE-safe: recolhimento via mAnimate retorna null sem tween quando prefers-reduced-motion — toggle instantâneo, nunca quebra"

key-files:
  created:
    - bairro-cdbairro.json
  modified:
    - radar-goiania.html
    - sw.js

key-decisions:
  - "bairro-cdbairro.json mantém o campo `mo` (motivo do join heurístico) mesmo não sendo consumido nesta plan — sinal de honestidade já previsto para uso futuro (ex.: indicador de confiança no Painel do Território, Plano 03), sem custo de payload relevante (1.119 entradas, arquivo minificado)"
  - "Wash do setor ativo em baiStyle() usa sempre a faixa 3 (cor-média) — a variação real por R$/m² vive no nível de LOTE (lotStyle), não de bairro; evita implicar precisão de fronteira que o polígono administrativo não tem (T-15-06)"
  - "toggleChoropleth() esconde #terrLegenda inteira ao desligar (não só o corpo) — literal do plano; o botão primário do Painel do Território (Plano 03, terrPanelToggle) é o controle sempre-visível para religar, a legenda é o espelho compacto que só aparece com dado real"

requirements-completed: [TERR-02]

# Metrics
duration: ~25min
completed: 2026-07-09
---

# Phase 15 Plan 02: Choropleth de R$/m² (setores escaneados) + legenda Summary

**Choropleth de 5 faixas de quantil (azul sequencial, ColorBrewer Blues) pintado 100% via `setStyle()` sobre a malha de bairros/lotes já existente, alimentado por um novo asset de runtime que resolve o gap `id↔cdbairro`, com legenda tocável recolhível e REDUCE-safe.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 (todas `type="auto"`)
- **Files modified:** 3 (`radar-goiania.html`, `sw.js`, `bairro-cdbairro.json` novo)
- **Tests:** 120 → 120 (nenhum teste novo nesta plan — funções puras já cobertas na 15-01; esta plan é 100% integração de styling/DOM, verificada por grep de acceptance criteria + `npm test` de regressão)

## Accomplishments

- Task 1: `bairro-cdbairro.json` gerado como snapshot datado (1.119 entradas, glebas `sem-parcela` descartadas; Bueno `000400000014→cd:16` confirmado) a partir de `bairros-goiania.recon.json`; `sw.js` bumpado para `radar-v7` com o novo asset no precache; lookups `idParaCdbairro`/`cdbairroParaIds` construídos por `carregarLookupCdbairro()` (fetch lazy, zoom-gate respeitado — nunca no boot).
- Task 2: paleta `--terr-q1..q5`/`-ink` no `:root` + `TERR_COLORS`/`TERR_INK`/`TERR_FILLOP_CARTO`/`TERR_FILLOP_SAT` resolvidos em JS; `lotStyle(ci)` e `baiStyle(feature)` estendidos para consultar `TERR_LOTE_BIN`/`TERR_SETOR_ATIVO` sob a guarda `CHOROPLETH_ON`; `aplicarChoropleth(scan)`/`desenharChoropleth()` ligam o resultado de `territorioScan` (15-01) ao styling do mapa, sempre via `setStyle()` em massa.
- Task 3: `#terrLegenda` (toggle "Cor por valor", chevron de recolher, 5 swatches + faixas R$/m² via `brlSimples`, rótulo de amostra via `rotuloAmostra`), com `toggleChoropleth()` como fonte única de verdade do estado (sincroniza `aria-pressed` da legenda e do futuro botão do painel) e `recolherLegenda()` REDUCE-safe via `mAnimate`.
- Fix de blocker do plan-check honrado: nenhuma chamada a `lotStyle()` sem argumento resta no arquivo — `setSatelite()`, criação em `refreshLots` e `mouseout` todos passam `ci`/`p._terrCi`.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Promover id↔cdbairro a asset de runtime + sw.js radar-v7 + lookups no boot** - `d59debf` (feat)
2. **Task 2: Paleta --terr-qN + extensão de baiStyle()/lotStyle() para choropleth via setStyle()** - `f0712a5` (feat)
3. **Task 3: Legenda #terrLegenda — toggle, swatches R$/m², recolhimento REDUCE-safe, rótulo de amostra** - `a6904b4` (feat)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified

- `bairro-cdbairro.json` — novo; snapshot `id→{cd,mo}` (1.119 entradas), gerado por node one-liner a partir de `bairros-goiania.recon.json`, glebas sem `cdbairro` descartadas.
- `sw.js` — `LOCAL` ganha `"./bairro-cdbairro.json"`; `CACHE` bumpado `radar-v6→radar-v7` (invalida cópia antiga do precache).
- `radar-goiania.html` — `:root` ganha `--terr-q1..q5`/`-ink`; lookups `idParaCdbairro`/`cdbairroParaIds`/`carregarLookupCdbairro`/`resolveCdbairroDeLayer` (perto de `BAI_STYLE`); `TERR_COLORS`/`TERR_INK`/`TERR_FILLOP_CARTO`/`TERR_FILLOP_SAT`/`CHOROPLETH_ON`/`TERR_LOTE_BIN`/`TERR_SETOR_ATIVO`/`TERR_BREAKS`; `baiStyle(feature)`/`lotStyle(ci)` estendidos; `aplicarChoropleth(scan)`/`desenharChoropleth()` novos; `#terrLegenda` (HTML+CSS+JS: `montarLegenda`/`recolherLegenda`/`toggleChoropleth`); call-sites corrigidos em `setSatelite`, `refreshLots` (criação+mouseout), `highlightBairro`/`clearBaiHi`.

## Decisions Made

- **`mo` (motivo do join) mantido no snapshot de runtime** mesmo sem consumidor nesta plan — custo de payload desprezível, sinal de honestidade reservado para o Painel do Território (Plano 03) ou indicador de confiança futuro.
- **Wash do setor ativo sempre na faixa 3 (cor-média)** em `baiStyle()` — o polígono de bairro não tem resolução para afirmar uma faixa específica por área; a faixa real por R$/m² só é afirmada no nível de lote (`lotStyle`), onde o dado é direto do cadastro.
- **`toggleChoropleth()` esconde a legenda inteira ao desligar** (literal do plano) — o controle sempre-visível para religar fica no Painel do Território (Plano 03), a legenda é só o espelho compacto que aparece com dado real.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `highlightBairro`/`clearBaiHi` chamavam `baiStyle()` sem o `feature` do próprio layer**
- **Found during:** Task 2 (extensão de `baiStyle(feature)` para consultar `resolveCdbairroDeLayer`)
- **Issue:** Antes da Fase 15, `baiStyle(feature)` já tinha o parâmetro `feature` mas nunca o usava — então `baiHi.setStyle(baiStyle())` (chamada direta, sem argumento) era inofensivo. Ao estender `baiStyle()` para resolver `cdbairro` a partir de `feature.properties.id`, essas duas chamadas sem argumento passariam a resolver `cd=null` sempre — ao limpar o hover (`mouseout`/troca de bairro realçado), um bairro já escaneado/colorido pelo choropleth voltaria ao estilo neutro por engano, mesmo com `CHOROPLETH_ON=true`.
- **Fix:** `highlightBairro`/`clearBaiHi` agora chamam `baiStyle(baiHi.feature)`, passando o `feature` do próprio layer — mesmo padrão de `layer.setStyle(baiStyle)` (que o Leaflet já invoca com o feature certo), só que aplicado à chamada manual de um único layer.
- **Files modified:** `radar-goiania.html`
- **Verification:** `npm test` 120/120 verde; leitura de código confirma que `baiHi.feature` é o mesmo objeto GeoJSON feature usado por `resolveCdbairroDeLayer({feature})`.
- **Committed in:** `f0712a5` (Task 2 commit)

**Total deviations:** 1 auto-fixed (Rule 1 — bug de regressão visual introduzido pela própria extensão desta plan, corrigido antes de comitar)
**Impact on plan:** Nenhum scope creep — a interface pública (`baiStyle`, `lotStyle`, nomes de função) permanece exatamente como especificado no plano; o fix é uma correção de call-site necessária para a corretude da extensão pedida.

## Issues Encountered

Nenhum. As acceptance criteria literais do plano (`grep -c` contando LINHAS, não ocorrências) exigiram reformatar a declaração das 10 variáveis `--terr-qN`/`-ink` de uma única linha para múltiplas linhas — não é um problema funcional, só um ajuste de formatação para bater o critério de aceite `grep -c ... ≥ 3` (3 padrões, 3 linhas distintas).

## User Setup Required

None - nenhuma configuração externa necessária.

## Next Phase Readiness

- Plano 03 (Painel do Território, TERR-03) pode chamar `territorioScan(cdbairro)` (15-01), passar o resultado para `aplicarChoropleth(scan)` (retorna as estatísticas já prontas: mediana/Q1-Q3/IPTU/idade/mix) e então acionar `toggleChoropleth()`/`desenharChoropleth()` para ligar a cor — nenhuma peça nova de rede ou de styling falta.
- O botão primário do Painel do Território deve usar `id="terrPanelToggle"` (já referenciado por `toggleChoropleth()` nesta plan, ainda não existente no DOM) para a sincronização de `aria-pressed` funcionar nos dois sentidos.
- Verificação AO VIVO da legibilidade AA sobre satélite em luz externa continua como HUMAN-UAT não-bloqueante (já sinalizado em STATE.md/ROADMAP), assim como o toque na área do bairro colorido — ambos não testáveis por `node --test`.

---
*Phase: 15-setor-scan-choropleth-painel-territorio*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: bairro-cdbairro.json
- FOUND: radar-goiania.html
- FOUND: sw.js
- FOUND commit: d59debf
- FOUND commit: f0712a5
- FOUND commit: a6904b4
