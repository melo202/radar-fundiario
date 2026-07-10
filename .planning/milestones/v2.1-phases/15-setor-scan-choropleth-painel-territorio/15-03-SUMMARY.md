---
phase: 15-setor-scan-choropleth-painel-territorio
plan: 03
subsystem: painel-territorio
tags: [dom-render-textcontent, sheet-pattern, escape-chain, a11y-aria-pressed, budget-instrumentation]

# Dependency graph
requires:
  - phase: 15-01
    provides: "territorioScan(cdbairro)/estatTerritorio/rotuloAmostra (RADAR_PURE+TERR_NET) — consumidos direto pelo painel, zero requisição nova"
  - phase: 15-02
    provides: "resolveCdbairroDeLayer/carregarLookupCdbairro/aplicarChoropleth/toggleChoropleth/CHOROPLETH_ON — o painel reusa a mesma varredura e o mesmo estado de choropleth, nunca duplica"
provides:
  - "#terrPanel (.detail): painel do território com botão 'Ver território' no breadcrumb (btnVerTerr, só visível com cdbairro fiscal), métricas em ordem conclusão-primeiro (R$/m² mediano+Q1-Q3, IPTU mediano, idade mediana, mix de uso, nº de lotes) com rótulo de honestidade (rotuloAmostra) sob cada métrica"
  - "abrirTerritorio(layer)/montarPainel(scan,st,layer)/fecharTerrPanel(): ciclo completo de abertura (zoom-gate, loading 2 estágios, 1 sheet por vez) e fechamento (Esc/×, devolve foco ao gatilho)"
  - "Rodapé de ação: terrPanelToggle (primária, sincronizada com a legenda via sincTerrPanelToggle — fonte única também chamada por toggleChoropleth), buscarNoSetor (secundária, reusa setMode/pickBairro), Ver metodologia (nota de viés OBJECTID)"
  - "checarVarreduraParcial(scan) + terrUltimoOrcamento()/comentário-âncora VERIFICAÇÃO AO VIVO ORÇAMENTO: instrumentação do orçamento ≤3 páginas para verificação manual via DevTools Network"
affects: ["16-detector-lote-subutilizado-farming", "17-diff-cadastro-caixa"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Painel de leitura de dado reusa .detail/.dgrid/.cell/.chips/.acts/.maisopcoes VERBATIM (mesmo z-index/sheet pattern da ficha do imóvel) — só 3 classes novas (.terr-metric-sub/.terr-honesto/.terr-mix-chip) para os elementos tipográficos específicos do UI-SPEC que não tinham equivalente 1:1 já em produção"
    - "Fonte única de verdade para estado espelhado entre 2 controles (legenda + painel): sincTerrPanelToggle() é chamada tanto pelo onclick do próprio botão quanto por toggleChoropleth() — nenhum dos dois grava aria-pressed/label diretamente"
    - "Cadeia de Esc: nova entrada de sheet sempre se insere logo após o check do onboarding (prioridade máxima), tornando-se o novo 'primeiro' check — mesmo padrão que cada fase anterior já usou (12/12/10/13...) para o pattern 'sheet mais recente fecha primeiro'"
    - "Botão de entrada de UI (btnVerTerr) com visibilidade condicionada a um lookup assíncrono LAZY (carregarLookupCdbairro) que é só um asset local — chamado proativamente no hover/drill sem violar o zoom-gate, que se aplica exclusivamente a territorioScan (rede do endpoint frágil)"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "Nome do setor no painel usa esc()+textContent (não só textContent) — replica deliberadamente o mesmo padrão redundante já usado em showBreadcrumb (linha ~2568), por consistência de convenção do projeto, mesmo sendo tecnicamente defesa-em-profundidade (textContent já escapa por si)"
  - "buscarNoSetor() reusa literalmente setMode('ql')+pickBairro(code), o mesmo par de funções que o dropdown da caixa única (pickCaixaItem) já usa para 'setor' — não foi criado nenhum novo caminho de busca, honrando 'Claude's Discretion' do CONTEXT.md sem introduzir um segundo fluxo paralelo"
  - "Idade mediana do cadastro exibida como 'desde AAAA' (não 'N anos') — uma das duas opções explicitamente permitidas pelo UI-SPEC; escolhida por ser mais estável (não precisa recalcular a cada visita) e mais alinhada ao vocabulário 'desde' já usado em fmtDt-adjacentes do app"
  - "checarVarreduraParcial()/terrUltimoOrcamento() implementados como especificado, mesmo a condição paginas<3 && amostrado<total não sendo trivialmente alcançável pela arquitetura atual de fetchWhereRestrito (que só finaliza com sucesso completo ou lança erro) — código defensivo mantido por ser requisito literal do plano e por não ter custo de manutenção"

requirements-completed: [TERR-03, TERR-01]

# Metrics
duration: ~20min
completed: 2026-07-09
---

# Phase 15 Plan 03: Painel do Meu Território Summary

**Painel `#terrPanel` (reuso 1:1 do padrão `.detail`) com botão "Ver território" no breadcrumb, métricas conclusão-primeiro com honestidade estatística obrigatória por métrica, rodapé de ação sincronizado com a legenda do choropleth, e instrumentação do orçamento de requisições — fecha o loop TERR-01/TERR-03 sem nenhuma requisição de rede nova além da já existente `territorioScan`.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 (ambas `type="auto"`)
- **Files modified:** 1 (`radar-goiania.html`)
- **Tests:** 120 → 120 (nenhum teste novo nesta plan — toda a estatística/rede já foi coberta por TDD na 15-01; esta plan é 100% integração de DOM/UI, verificada por grep de acceptance criteria + `npm test` de regressão)

## Accomplishments

- Task 1: `#terrPanel` (`.detail`) criado com cabeçalho ("Meu Território" + nome do setor via `esc()`+`textContent`), botão `btnVerTerr` no breadcrumb (só visível quando `resolveCdbairroDeLayer` resolve, nunca para gleba), `abrirTerritorio(layer)` (zoom-gate, fecha `#detail` antes, loading em 2 estágios `MOTION_MSG.varrendo`/`.faixas`, dispara `territorioScan` compartilhado), `montarPainel(scan,st,layer)` renderizando as 5 métricas na ordem conclusão-primeiro com `rotuloAmostra(st.n,st.total)` sob cada uma, empty states ("Nenhum setor selecionado"/"Sem dado de valor neste setor"), `fecharTerrPanel()` devolvendo foco ao gatilho, e `#terrPanel` inserido na cadeia de Esc como o sheet mais recente (logo após o onboarding).
- Task 2: rodapé `#terrActions` (primária `terrPanelToggle` com label/aria espelhados pela legenda via `sincTerrPanelToggle()` — também chamada de dentro de `toggleChoropleth()`, fonte única de verdade; secundária `buscarNoSetor()` reusando `setMode('ql')`+`pickBairro()`), `#terrMetodologia` com a nota de viés OBJECTID, `checarVarreduraParcial(scan)` (aviso best-effort não bloqueante) e `terrUltimoOrcamento()` + comentário-âncora `VERIFICAÇÃO AO VIVO ORÇAMENTO` para a contagem manual no DevTools Network.
- Fix Rule 1 (regressão de UX) aplicado inline na Task 1: `clearBaiHi()` agora esconde `btnVerTerr` ao limpar o hover — sem isso, o botão continuaria visível apontando para um layer que já saiu de foco.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Painel #terrPanel + entrada "Ver território" + render de métricas** - `64d0e18` (feat)
2. **Task 2: Rodapé de ação + verificação instrumentada do orçamento** - `f6e1944` (feat)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified

- `radar-goiania.html` — CSS novo (`.terr-metric-sub`/`.terr-honesto`/`.terr-mix-chip`/`#breadcrumb .crumb.verterr`); HTML novo (`#btnVerTerr` no breadcrumb; `#terrPanel` completo — cabeçalho, `#terrAviso`, `#terrGrid`, `#terrActions`, `.maisopcoes`/`#terrMetodologia`); JS novo (`mostrarVerTerr`, `abrirTerritorio`, `montarPainel`, `fecharTerrPanel`, `sincTerrPanelToggle`, `buscarNoSetor`, `checarVarreduraParcial`, `terrUltimoOrcamento`, `let TERR_PANEL_CD`); JS estendido (`highlightBairro`/`drillBairro` chamam `mostrarVerTerr`; `clearBaiHi` esconde o botão; `toggleChoropleth` chama `sincTerrPanelToggle`; `MOTION_MSG` ganha `varrendo`/`faixas`; cadeia `keydown` Escape ganha o check de `#terrPanel`).

## Decisions Made

- **`esc()`+`textContent` para o nome do setor** (não só `textContent`): replica o mesmo padrão redundante já em produção em `showBreadcrumb` — consistência de convenção do projeto pesa mais que a otimização teórica de remover uma chamada supérflua.
- **`buscarNoSetor()` reusa `setMode('ql')`+`pickBairro()`** (o mesmo par que `pickCaixaItem` já usa para itens "setor" no dropdown da caixa única) — nenhum caminho de busca novo, honrando o pedido explícito do CONTEXT.md/RESEARCH.md de "Don't Hand-Roll".
- **Idade do cadastro como "desde AAAA"** — uma das 2 opções explicitamente permitidas pelo UI-SPEC (a alternativa "N anos" exigiria recálculo a cada render/visita sem ganho de honestidade adicional).
- **`checarVarreduraParcial`/`terrUltimoOrcamento` implementados literalmente como o plano pede**, mesmo a condição de varredura parcial não sendo trivialmente alcançável pela arquitetura atual (que hoje só termina em sucesso completo ou erro lançado) — código defensivo de baixo custo, mantido para robustez futura e para satisfazer o critério de aceite literal do plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `clearBaiHi()` não escondia `btnVerTerr` ao limpar o hover**
- **Found during:** Task 1 (extensão de `highlightBairro`/`drillBairro` para chamar `mostrarVerTerr`)
- **Issue:** Ao adicionar `mostrarVerTerr(layer)` em `highlightBairro`/`drillBairro`, o botão "Ver território" passa a aparecer atrelado ao último layer em foco (via `b.onclick=()=>abrirTerritorio(layer)`). Sem um ajuste simétrico em `clearBaiHi()` (chamada no `mouseout` do desktop), o botão continuaria visível e clicável mesmo depois do hover terminar, apontando para um layer que o usuário já não está mais olhando — abriria o painel "certo" tecnicamente, mas de forma confusa/inesperada (o setor sumiu da tela, o botão continuou lá).
- **Fix:** `clearBaiHi()` agora também esconde `#btnVerTerr` (`btn.hidden=true`) ao limpar `baiHi`.
- **Files modified:** `radar-goiania.html`
- **Verification:** `npm test` 120/120 verde (função pura fora de escopo, mudança é 100% DOM); leitura de código confirma que `clearBaiHi` só é chamada quando o foco realmente sai do bairro (mobile não a chama — lá o 2º toque no MESMO bairro drila, não limpa).
- **Committed in:** `64d0e18` (Task 1 commit)

**Total deviations:** 1 auto-fixed (Rule 1 — bug de regressão de UX introduzido pela própria extensão desta plan, corrigido antes de comitar)
**Impact on plan:** Nenhum scope creep — a interface pública (nomes de função, ids do DOM) permanece exatamente como especificado no plano; o fix é uma correção de simetria necessária para a corretude da extensão pedida.

## Issues Encountered

Nenhum bloqueante. Toda a infraestrutura de rede/estatística (15-01) e de styling/legenda (15-02) já estava pronta e foi consumida sem alteração de interface — esta plan é 100% integração de DOM (HTML+CSS+wiring de eventos), sem nenhuma função de rede nova.

## User Setup Required

None - nenhuma configuração externa necessária.

## Next Phase Readiness

- TERR-01/TERR-02/TERR-03 (Fase 15 completa): setor-scan compartilhado, choropleth e painel do território todos entregues e integrados — Painel + Choropleth do mesmo setor reusam a MESMA varredura (dedupe do `TERRCACHE`), verificado por leitura de código (`abrirTerritorio` chama `territorioScan(cd)` uma única vez e `aplicarChoropleth(scan)` o mesmo resultado).
- **Verificação AO VIVO do orçamento de requisições** (critério de aceite literal do ROADMAP): pendente como HUMAN-UAT não-bloqueante — abrir o painel do Bueno (`cdbairro=16`) com DevTools Network aberto, contar requisições a `MapServer/3/query` (esperado ≤3 paginadas + 1 `returnCountOnly`), cruzar com `terrUltimoOrcamento()` no console. Comentário-âncora `VERIFICAÇÃO AO VIVO ORÇAMENTO` deixado no código (perto de `terrUltimoOrcamento`) para orientar quem for fazer o teste manual.
- **Tempo real de scan em 4G** (já sinalizado como blocker/concern em STATE.md desde a Fase 9/15-RESEARCH.md Open Question 3) continua não medido ao vivo — HUMAN-UAT não-bloqueante.
- **Legibilidade AA da paleta do choropleth sobre satélite em luz externa** (15-02) continua HUMAN-UAT não-bloqueante, herdado.
- Fases 16/17 (detector de lote subutilizado, farming, diff de cadastro, cruzamento Caixa) podem consumir `territorioScan`/`estatTerritorio`/o padrão de painel `.detail` diretamente — nenhuma peça nova de infraestrutura falta para elas.

---
*Phase: 15-setor-scan-choropleth-painel-territorio*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/15-setor-scan-choropleth-painel-territorio/15-03-SUMMARY.md
- FOUND commit: 64d0e18
- FOUND commit: f6e1944
