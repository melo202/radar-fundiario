---
phase: 12-predio-como-objeto-comercial
verified: 2026-07-07T21:21:33Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visual do resumo do prédio (.bldg-sumario) no .bldg-head — 4 métricas, grid 2 col mobile / 4 col desktop, faixa em --accent"
    expected: "Métricas legíveis sobre fundo --ink, faixa do edifício destacada em vermelho-óxido, nenhuma quebra de layout em 375px"
    why_human: "Layout visual/CSS grid — requer renderização real no navegador (DevTools) para confirmar quebras de linha e contraste, não verificável por grep estático"
  - test: "Painel 'Ordenar / filtrar' (.bldg-ord) permanece aberto após clicar em um chip/toggle/digitar na busca (fix WR-01/WR-02)"
    expected: "Painel não recolhe sozinho; campo de busca mantém foco/cursor entre teclas digitadas"
    why_human: "Comportamento de foco/DOM em tempo real (event loop do navegador) — não simulável via grep/node:vm; requer teste manual com teclado"
  - test: "Zero requisição de rede nova ao ordenar/filtrar/marcar/comparar (DevTools Network tab)"
    expected: "Nenhum request novo aparece na aba Network durante essas 4 interações"
    why_human: "Requer inspeção de tráfego de rede em navegador real; a ausência de fetch/jsonp/compare/compsStats no código-fonte foi confirmada estaticamente (grep), mas a confirmação end-to-end via DevTools é responsabilidade de QA visual"
  - test: "Sheet de comparação (#cmpSheet) no mobile 375px com 3-4 colunas — scroll horizontal ocorre DENTRO do sheet, nunca na página"
    expected: "Página não rola horizontalmente; tabela rola internamente; coluna de rótulos (th scope=row) permanece fixa (sticky) à esquerda"
    why_human: "Comportamento de scroll/sticky em viewport real — não verificável estaticamente, apenas a presença das regras CSS (overflow-x:auto, position:sticky) foi confirmada por grep"
  - test: "Toast de limite de 4 vs. FAB 'Comparar (N)' não colidem visualmente no mobile após fix IN-01 (bottom: 56px+78px)"
    expected: "Toast e FAB não se sobrepõem visualmente quando ambos visíveis simultaneamente"
    why_human: "Colisão visual entre dois elementos posicionados — requer captura de tela/inspeção visual real, o ajuste de offset foi confirmado estaticamente mas o resultado visual final depende de renderização"
  - test: "44px mínimo de área de toque em todos os elementos tocáveis novos, medidos via DevTools mobile 375"
    expected: "Nenhum elemento tocável novo mede menos de 44px (incluindo os chips de ordenação .chips button, que reusam um padrão pré-existente com padding:11px 15px — herdado, não novo, mas vale confirmar visualmente por serem parte do fluxo crítico desta fase)"
    why_human: "Medição de altura renderizada real (padding + line-height + font) não é confiável via grep de CSS — requer inspeção em DevTools"
---

# Phase 12: Prédio como Objeto Comercial Verification Report

**Phase Goal:** Um prédio vira leitura comercial (faixa, padrão, unidades interessantes), não uma tabela longa de inscrições.
**Verified:** 2026-07-07T21:21:33Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `resumoPredio(units)` calcula métricas agregadas do prédio 100% client-side, honesto (null nunca NaN) | ✓ VERIFIED | `radar-goiania.html` dentro do bloco RADAR_PURE (linhas ~1800s); 8 testes dedicados em `tests/predio.test.mjs` cobrindo amostra vazia/parcial/mista/malformada — todos passam |
| 2 | `ordenaUnidades(units, criterio)` ordena sem mutar, com 4 critérios, estável, sem request de rede | ✓ VERIFIED | Corpo da função revisado — zero `async`/`await`/`fetch`/`jsonp`; 6 testes dedicados (padrão/oportunidade/estabilidade/estimado-asc/area-desc/critério inválido) passam |
| 3 | `ehAptoProvavel(a)` heurística residencial/misto e não-garagem, documentada | ✓ VERIFIED | `radar-goiania.html:1868`: `(a.uso===1\|\|a.uso===5)&&!isGarage(a)`, comentário inline documentando heurística; teste dedicado passa |
| 4 | `analisePredicoTexto(resumo,meta)` gera texto copiável WhatsApp-style, omissão condicional por métrica | ✓ VERIFIED | 5 testes dedicados (completo/sem estimativa/sem área/sem endereço/zerado) passam; assert negativo global confirma zero "undefined"/"NaN" em qualquer saída |
| 5 | Resumo do prédio (4 métricas) + ações "Ordenar/filtrar" e "Copiar análise" expandem `.bldg-head`, ANTES da lista, zero request nova | ✓ VERIFIED | `bldgSumarioHTML(ci)` inserida em `render()` imediatamente após `.sub` do `.bldg-head` (linha 2736); `unidadesEnriquecidasDoPredio`/`copyZapPredio` usam só `mercadoEstimado` (puro, sem rede) — confirmado por grep que nenhum `fetch`/`jsonp`/`compare`/`compsStats` aparece nesses caminhos |
| 6 | Ordenação (4 critérios) + filtros (aptos prováveis, busca) funcionam sem quebrar RENDN/paginação, e marcação para comparação sobrevive a reordenação via chave estável `ci\|insubprinc` | ✓ VERIFIED | `ordenarBldg` usa `remapPredio` (posicional, pós-fix CR-01) — 4 testes dedicados com fixture de colisão real de `insubprinc` provam zero duplicação/perda; `cmpChave`/`cmpTemChave` usam chave estável, não índice |
| 7 | Botão flutuante "Comparar (N)" com N≥2, sheet com tabela (th/scope correto), limite 4 com toast honesto sem alterar estado da 5ª tentativa, Esc fecha na posição correta | ✓ VERIFIED | `toggleComparar` bloqueia 5ª tentativa sem alterar `btn` (linha 2928-2931); tabela usa `<th scope="col">`/`<th scope="row">` (pós-fix WR-03); `#cmpSheet` é o PRIMEIRO check da cadeia de Esc (linha 4609-4610) |
| 8 | Guardas preservadas: `scrollToResults()`/lista mobile, `venalTxt`, `esc()`/IN-01 (zero onclick com string interpolada nos caminhos novos), 44px, zero hex novo | ✓ VERIFIED | `scrollToResults()` intocado no branch `ehPredio` (linha 2638); `venalTxt` reusado na tabela de comparação; grep confirma zero `onclick="fn('${esc(...)}` remanescente nos 4 handlers (pós-fix IN-03, usam `this`/`.closest().dataset`); todos os elementos tocáveis novos têm `min-height:44px`; único hex novo é `#fff`, já padrão pré-existente no app (`.chips button.on`, `.badge.alta`, etc.) |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` (RADAR_PURE) | `resumoPredio`/`ordenaUnidades`/`ehAptoProvavel`/`analisePredicoTexto`/`remapPredio` | ✓ VERIFIED | 5 funções presentes dentro dos marcadores `RADAR_PURE_START`/`RADAR_PURE_END`, todas testáveis via `node:vm` |
| `tests/predio.test.mjs` | harness `node:test` cobrindo as 5 funções | ✓ VERIFIED | 26 testes, 26 passam, incluindo os 4 novos de `remapPredio` (fix CR-01) |
| `tests/fixtures.mjs` | `resumoPredioCasos`/`ordenaUnidadesCasos`/`ehAptoProvavelCasos`/`analisePredicoTextoCasos`/`remapPredioCasos` | ✓ VERIFIED | Todas as chaves presentes, incluindo `remapPredioCasos.colisaoInsubprinc` (fixture do bug real) |
| `radar-goiania.html` (UI) | `.bldg-sumario`/`.bldg-ord`/`.cmp-toggle`/`.cmp-fab`/`#cmpSheet` + funções de wiring | ✓ VERIFIED | Todos os componentes presentes, wired em `render()`/`cardHTML()`/`finish()`/cadeia de Esc |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ordenarBldg`/`toggleAptosProvaveis`/`buscarUnidadeBldg`/`copyZapPredio` | `resumoPredio`/`ordenaUnidades`/`ehAptoProvavel`/`analisePredicoTexto` (RADAR_PURE) | chamada direta | ✓ WIRED | Nenhuma reimplementação de lógica pura na camada de UI; confirmado por leitura direta do corpo das funções |
| `render(list,opts)` | RENDN slice | `list.slice(0,RENDN)` sobre `LAST` já reordenado | ✓ WIRED | `ordenarBldg` reatribui `LAST` via `remapPredio` ANTES de chamar `render(LAST)` — slice sempre opera sobre o estado final |
| `toggleComparar(i,btn)` | `CMP` (chave `ci\|insubprinc`) | `cmpChave(a)` | ✓ WIRED | Confirmado — nunca usa índice numérico como chave persistente |
| `finish()` | `CMP=[];BLDGSTATE={};fecharComparacao();atualizarCmpFab()` | reset no início de `finish()` | ✓ WIRED | Bloco de reset presente imediatamente após `closeChooser()` (linha 2583-2586) |
| `ordenarBldg` | `LAST` (remap sem duplicação/perda) | `remapPredio(LAST, fila, pertence)` posicional | ✓ WIRED | Pós-fix CR-01 — 4 testes dedicados provam ausência do bug original (key-based `.find()`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `bldgSumarioHTML(ci)` | `resumo` (via `resumoPredio`) | `unidadesEnriquecidasDoPredio(ci)` → `LAST.filter(...)` + `mercadoEstimado(a)` (síncrono, in-memory) | Sim — cálculo real sobre `LAST` já carregado, zero request | ✓ FLOWING |
| `abrirComparacao()` | `unidades` (tabela de comparação) | `CMP.map(k=>LAST.find(a=>cmpChave(a)===k))` | Sim — lê dados reais de `LAST`/`a.__scores` (nunca dispara `compare()`) | ✓ FLOWING |
| `copyZapPredio(ci)` | `resumo`+`meta` (texto copiável) | mesmo padrão de `bldgSumarioHTML` + `LAST.find` para metadados | Sim | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suite completa de testes passa 100% | `node --test "tests/*.test.mjs"` | 105 tests, 105 pass, 0 fail | ✓ PASS |
| `predio.test.mjs` isolado passa 100% | `node --test tests/predio.test.mjs` | 26 tests, 26 pass, 0 fail | ✓ PASS |
| Zero `fetch`/`jsonp`/`compare`/`compsStats` nos caminhos novos de Fase 12 | grep nos corpos de `unidadesEnriquecidasDoPredio`/`bldgSumarioHTML`/`ordenarBldg`/`copyZapPredio`/`abrirComparacao` | Nenhuma ocorrência nesses corpos (todas as ocorrências do arquivo pertencem a funções pré-existentes de outras fases) | ✓ PASS |
| Zero `onclick="fn('${esc(...)}...` remanescente nos 4 handlers do painel de prédio | grep `onclick="[a-zA-Z]*('` filtrado por predio/bldg/Aptos/buscarUnidade | Nenhuma ocorrência | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| PRED-01 | 12-01, 12-02 | Resumo do prédio (n/área média/venal médio/estimado médio/faixa) + ações (ver unidades, gerar análise) | ✓ SATISFIED | `resumoPredio`+`bldgSumarioHTML`+`copyZapPredio` implementados e testados; texto copiável verificado por 5 testes de omissão condicional |
| PRED-02 | 12-01, 12-02 | Ordenação (4 critérios) + filtros (garagem/aptos prováveis/busca) + marcação para comparação (limite 4) | ✓ SATISFIED | `ordenaUnidades`+`ehAptoProvavel`+`ordenarBldg`+`toggleAptosProvaveis`+`buscarUnidadeBldg`+`toggleComparar`+`abrirComparacao` implementados; CR-01 (bug crítico de remap) corrigido e testado |

Nenhum requisito órfão identificado — REQUIREMENTS.md mapeia só PRED-01/PRED-02 para a Fase 12, ambos cobertos pelos 2 plans.

### Anti-Patterns Found

Nenhum anti-pattern bloqueador ou de aviso encontrado nos arquivos/regiões modificados por esta fase. Nenhum `TODO`/`FIXME`/`PLACEHOLDER`/retorno vazio hardcoded nos caminhos novos. O único item "documentado, não corrigido" (IN-02 — memoização de `mercadoEstimado`) foi uma decisão explícita e justificada do fixer (risco de servir estimativa incorreta se memoizado por identidade sem considerar o 2º parâmetro `privReal`, que varia entre call sites) — não é uma lacuna funcional, é uma decisão de performance documentada em comentário no código (`radar-goiania.html:2767-2772`).

### Code Review Fix Verification (12-REVIEW.md → 12-REVIEW-FIX.md)

| ID | Issue | Status | Evidence |
|----|-------|--------|----------|
| CR-01 (critical) | `ordenarBldg` podia duplicar/perder unidades com `insubprinc` colidente | ✓ FIXED | `remapPredio(list,ordenadas,pertence)` extraído para RADAR_PURE, remap 100% posicional via `fila.shift()`; 4 testes dedicados com fixture de colisão real passam; commit `f3046f4` |
| WR-01 (warning) | Painel de ordenação/filtro colapsava sozinho a cada interação | ✓ FIXED | `BLDGSTATE[ci].aberto` persistido, `bldgOrdHTML` lê o estado; commit `11f2eb9` |
| WR-02 (warning) | Campo "Buscar unidade" perdia foco/cursor a cada tecla | ✓ FIXED | Captura e restaura `selectionRange`/foco após `render()`; commit `11f2eb9` |
| WR-03 (warning) | Tabela de comparação sem `scope`/`<th>` nos rótulos de linha | ✓ FIXED | `<th scope="col">`/`<th scope="row">` presentes; commit `3d9ca66` |
| IN-01 (info) | FAB e toast colidiam visualmente no mobile | ✓ FIXED | Offset do FAB mobile ajustado para `56px+78px`; commit `1fa104b` |
| IN-02 (info) | `mercadoEstimado` recalculado sem memoização | ✓ DOCUMENTED (não corrigido, por decisão explícita) | Comentário no código explicando trade-off; commit `fb91303` |
| IN-03 (info) | `onclick="fn('${esc(ci)}')"` reintroduzia padrão banido (string interpolation) | ✓ FIXED | Convertido para padrão element-ref (`this`/`.closest().dataset.ci`) nos 4 call sites; commit `42b2132` |

Todas as correções confirmadas presentes no código atual, com commits correspondentes no histórico git (`git log` confirma `f3046f4`, `11f2eb9`, `3d9ca66`, `1fa104b`, `fb91303`, `42b2132`, `af9273b`).

### Human Verification Required

1. **Layout visual do resumo do prédio** — Grid de 4 métricas (2 col mobile / 4 col desktop), destaque em `--accent` na faixa. Por quê humano: renderização CSS real, não verificável por grep estático.
2. **Persistência do painel "Ordenar/filtrar" aberto** — Confirmar que clicar num chip/toggle/digitar não recolhe o painel (fix WR-01/WR-02). Por quê humano: comportamento de foco/DOM em tempo real.
3. **Zero requisição de rede via DevTools Network** — Confirmar visualmente que ordenar/filtrar/marcar/comparar não geram requests. Por quê humano: a ausência de código de rede foi confirmada estaticamente, mas a confirmação end-to-end é responsabilidade de QA visual/DevTools.
4. **Scroll horizontal interno do sheet de comparação no mobile 375** — Confirmar que a página não rola horizontalmente e a coluna de rótulos permanece fixa. Por quê humano: comportamento de scroll/sticky em viewport real.
5. **Colisão visual FAB/toast pós-fix** — Confirmar que o ajuste de offset (IN-01) realmente evita a sobreposição visual. Por quê humano: requer captura de tela/inspeção real.
6. **Medição de 44px em DevTools mobile** — Confirmar altura renderizada real de todos os elementos tocáveis novos, incluindo os chips de ordenação que reusam o padrão pré-existente `.chips button`. Por quê humano: medição de altura renderizada não é confiável via grep de CSS.

### Gaps Summary

Nenhuma lacuna bloqueadora encontrada. Todas as 8 verdades observáveis, os 3 critérios de sucesso do ROADMAP, e os 2 requisitos (PRED-01/PRED-02) foram verificados com evidência direta no código e nos testes. As 6 correções do code review (CR-01 crítico + WR-01/02/03 + IN-01/03) foram confirmadas presentes no código atual, com commits correspondentes. IN-02 foi uma decisão documentada de não corrigir (justificada, sem impacto funcional). A suite completa de testes (105/105) passa sem regressão.

O status é `human_needed` (não `passed`) porque itens de verificação visual/comportamental em tempo real (layout responsivo, persistência de foco em DOM real, DevTools Network, scroll/sticky em viewport, colisão visual) não podem ser confirmados por análise estática de código — são explicitamente esperados pelo próprio 12-UI-SPEC.md como parte do checklist de "Verificação" que requer navegador real. Nenhum desses itens é bloqueador conhecido; são confirmações finais de QA visual antes de considerar a fase 100% fechada.

---

*Verified: 2026-07-07T21:21:33Z*
*Verifier: Claude (gsd-verifier)*
