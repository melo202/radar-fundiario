---
phase: 15-setor-scan-choropleth-painel-territorio
verified: 2026-07-09T00:00:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Contar requisições reais ao MapServer/3/query ao abrir Painel/Choropleth do setor Bueno (cdbairro=16, ~57k lotes) com DevTools Network aberto"
    expected: "≤3 requisições paginadas (outFields restrito) + 1 returnCountOnly; nunca 1 requisição por quadra; contador console.__terrReq / terrUltimoOrcamento() confere com o Network"
    why_human: "Depende do endpoint ArcGIS real da Prefeitura (portalmapa.goiania.go.gov.br) — os testes automatizados usam jsonp/sanitiza/capCache/toast stubados (node:vm), não a rede real; o orçamento em produção real permanece HUMAN-UAT conforme phase flag do ROADMAP"
  - test: "Medir o tempo de resposta do scan do Bueno em conexão 4G real de campo"
    expected: "Tempo aceitável para uso comercial em campo (sem trava perceptível de UX durante o loading em 2 estágios)"
    why_human: "Depende de rede móvel real e latência do endpoint de terceiro — não simulável em teste automatizado; phase flag do ROADMAP (Open Question 3 do 15-RESEARCH.md)"
  - test: "Verificar legibilidade AA da paleta --terr-qN sobre o basemap satélite em luz solar externa (mobile)"
    expected: "As 5 faixas de cor + traço permanecem distinguíveis e o texto da legenda/painel mantém contraste AA sob luz externa forte"
    why_human: "Contraste percebido sob luz solar direta e telas de brilho variável não é verificável por grep/teste estático; único caminho é inspeção visual em dispositivo real"
  - test: "Tocar numa área do choropleth (lote e polígono de setor coloridos) no mobile e confirmar que a hit-area de toque continua funcionando (nunca fillOpacity 0)"
    expected: "Toque abre a ficha do lote / interação de setor normalmente, mesmo com o choropleth ligado (pisos .15/.35 preservados no código, mas o comportamento de toque real em touchscreen precisa de confirmação humana)"
    why_human: "Comportamento de touch/hit-area em dispositivo real (não em jsdom/node:test) — visual/tátil"
---

# Phase 15: Setor-Scan Compartilhado, Choropleth & Painel do Território Verification Report

**Phase Goal:** O corretor vê o "calor" de valor do território e as métricas do setor, sem avalanche de requisições.
**Verified:** 2026-07-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Função compartilhada de varredura com cache de sessão, usada por todas as ferramentas — nenhuma varredura ad-hoc | ✓ VERIFIED | `territorioScan(cdbairroRaw)` (radar-goiania.html:3034) é a ÚNICA função de varredura de setor; `TERRCACHE` (cache por cdbairro, teto 30, radar-goiania.html:2982); chamada tanto por `abrirTerritorio()` (painel, 3068) quanto por `toggleChoropleth()`/legenda (2525) — mesma promise dedupe (verificado por teste `territorioScan: dedupe de chamada em voo` em tests/territorio.test.mjs, passando) |
| 2 | Abrir painel/choropleth do Bueno (~57k lotes) dispara ≤1-3 requisições paginadas (nunca 1 por quadra), zoom-gate/ação explícita | ✓ VERIFIED (contrato) / ? HUMAN (produção real) | `fetchWhereRestrito` com `guardTotal` COMPARTILHADO entre tentativa restrita e fallback `*` (fix WR-02, radar-goiania.html:2987-3016) garante ≤3 páginas mesmo com fallback; teste "territorioScan: orçamento HARD" e "falha na 2ª página restrita não dobra o orçamento" ambos verdes. Zoom-gate: `abrirTerritorio`/`toggleChoropleth` só disparam por clique explícito (`btnVerTerr`/`terrToggle`/`terrPanelToggle`), nunca em pan/zoom/boot. Contagem AO VIVO no endpoint real (DevTools Network) é HUMAN-UAT — roteada para verificação humana |
| 3 | Choropleth de quantis relativos substitui a cor neutra da malha | ✓ VERIFIED | `lotStyle(ci)` (2449) e `baiStyle(feature)` (2429) consultam `TERR_LOTE_BIN`/`TERR_SETOR_ATIVO` sob guarda `CHOROPLETH_ON`; `aplicarChoropleth(scan)` (2461) deriva `TERR_LOTE_BIN` via `estatTerritorio`+`binQuantil`; nenhuma chamada `lotStyle()` sem argumento resta no arquivo (`grep -c "lotStyle())"` = 0) |
| 4 | Legível sobre CARTO e satélite (AA nos dois), troca via setStyle(), reduced-motion | ✓ VERIFIED (código) / ? HUMAN (percepção visual) | `TERR_FILLOP_CARTO={1:.15,...,5:.25}` e `TERR_FILLOP_SAT={1:.35,...,5:.45}` (opacidade maior sobre satélite, nunca 0 — piso preservado, radar-goiania.html:2406-2407); troca 100% via `setStyle()` (`desenharChoropleth`/`setSatelite`, nenhum L.polygon/L.geoJSON novo no caminho de recolorir); `recolherLegenda()` usa `mAnimate` que retorna null (toggle instantâneo) sob `prefers-reduced-motion`. Legibilidade AA percebida sob luz externa real é HUMAN-UAT |
| 5 | Painel com mediana+Q1-Q3 R$/m², IPTU mediano, idade do cadastro, mix de uso | ✓ VERIFIED | `montarPainel(scan,st,layer)` (3098) renderiza as 5 métricas na ordem conclusão-primeiro (R$/m² mediano+Q1-Q3, IPTU mediano, idade "desde AAAA", mix de uso top-3+Outros, nº de lotes), cada uma com `rotuloAmostra(st.n,st.total)` (honestidade, nunca omitido) |

**Score:** 5/5 truths verified (2 com sub-item HUMAN-UAT roteado, não bloqueante ao código)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` (RADAR_PURE) | 8 funções puras de estatística | ✓ VERIFIED | `pm2Lote, quantilAmostra, breaksQuantil, binQuantil, anoMedianoCadastro, mixUso, estatTerritorio, rotuloAmostra` — todas dentro de `RADAR_PURE_START/END`; 8 testes unitários verdes |
| `radar-goiania.html` (TERR_NET) | territorioScan/territorioScanRun/fetchWhereRestrito | ✓ VERIFIED | Bloco `TERR_NET_START/END` (2974-3042) com `TERR_FIELDS` (allowlist sem `dtnascimen`), `TERRCACHE`, `fetchWhereRestrito` (fallback+guardTotal), `territorioScanRun`, `territorioScan` (dedupe+coerção) |
| `tests/territorio.test.mjs` | Harness node:test das funções puras + rede | ✓ VERIFIED | `loadPureBlock()`/`loadNetBlock()`; 12 testes (8 puros + 4 async de rede), todos passando em `npm test` |
| `tests/fixtures.mjs` (TERR_FIX) | Fixtures sintéticas | ✓ VERIFIED | `TERR_FIX` presente (linha 699) cobrindo areaedif null/0/ausente, dtinclusao válido/sentinela/ausente, mix >3 usos |
| `bairro-cdbairro.json` | Lookup id→{cd,mo} runtime | ✓ VERIFIED | 1.119 entradas; `000400000014`→`cd:16` (Bueno) confirmado; glebas sem cdbairro descartadas |
| `radar-goiania.html` (choropleth) | Paleta --terr-qN, baiStyle/lotStyle estendidos, desenharChoropleth, legenda #terrLegenda | ✓ VERIFIED | Paleta em `:root` (linha 65); `TERR_COLORS/TERR_INK/TERR_FILLOP_CARTO/TERR_FILLOP_SAT`; `lotStyle(ci)`/`baiStyle(feature)` (2429/2449); `aplicarChoropleth`/`desenharChoropleth` (2461/2484); `#terrLegenda` com `terrToggle`/`terrChevron`/5 swatches; `montarLegenda` corrigida por WR-01 para ser efetivamente chamada |
| `sw.js` | Precache do novo asset + bump radar-v6→v7 | ✓ VERIFIED | `CACHE="radar-v7"` (linha 12); `"./bairro-cdbairro.json"` no `LOCAL` (linha 19); nenhum "radar-v6" residual |
| `radar-goiania.html` (#terrPanel) | Painel, montarPainel(), rodapé de ação, contador de orçamento | ✓ VERIFIED | `#terrPanel` (.detail, HTML ~1046); `montarPainel`(3098)/`abrirTerritorio`(3068)/`fecharTerrPanel`(3170)/`sincTerrPanelToggle`(3182)/`checarVarreduraParcial`(3211)/`terrUltimoOrcamento`(3228); rodapé com `terrPanelToggle`/`buscarNoSetor`/"Ver metodologia" (nota de viés OBJECTID) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `tests/territorio.test.mjs` | `RADAR_PURE_START/END` slice | `html.indexOf('RADAR_PURE_START')` | ✓ WIRED | `loadPureBlock()` presente, 8 testes puros passam |
| `territorioScan(cdbairro)` | `fetchWhereRestrito` + `jsonp(returnCountOnly)` | `Promise.all` em `territorioScanRun` + `TERRCACHE` dedupe | ✓ WIRED | Código idêntico ao plano; teste de dedupe/orçamento/fallback/coerção todos verdes |
| `lotStyle(ci)` | `TERR_LOTE_BIN` (ci→faixa 1-5) | consulta ao Map preenchido por `aplicarChoropleth(scan)` | ✓ WIRED | `lotStyle(ci)` lê `TERR_LOTE_BIN.get(ci)` sob guarda `CHOROPLETH_ON`; todas as chamadas (criação, mouseout, setSatelite, desenharChoropleth) passam `ci`/`p._terrCi` — 0 chamadas sem argumento |
| `baiStyle(feature)` | `idParaCdbairro` + `TERR_SETOR_ATIVO` | `resolveCdbairroDeLayer` | ✓ WIRED | `baiStyle` resolve `cd` via `resolveCdbairroDeLayer({feature})`; `highlightBairro`/`clearBaiHi` corrigidos (fix Rule 1 do 15-02) para passar `feature` explícito |
| `aplicarChoropleth(scan)` | `bairroLayer.setStyle`/`lotLayer.eachLayer setStyle` | troca em massa sem recriar geometria | ✓ WIRED | `desenharChoropleth()` chama `bairroLayer.setStyle(baiStyle)` e `lotLayer.eachLayer(p=>p.setStyle(lotStyle(p._terrCi)))` — mesmo padrão de `setSatelite` |
| botão "Ver território" | `territorioScan(cdbairro)` → `montarPainel` | `resolveCdbairroDeLayer` + loading MOTION_MSG | ✓ WIRED | `abrirTerritorio(layer)` chama `carregarLookupCdbairro()`→`territorioScan(cd)`→`aplicarChoropleth`→`montarPainel`; loading em 2 estágios (`varrendo`/`faixas`) |
| botão primário do painel | `toggleChoropleth` | `aria-pressed` espelhado painel↔legenda | ✓ WIRED | `sincTerrPanelToggle()` chamada tanto pelo `onclick` do botão quanto de dentro de `toggleChoropleth()` — fonte única |
| `#terrPanel` | cadeia de Escape (keydown) + `closeDetail` | fecho por × e Esc devolve foco ao gatilho | ✓ WIRED | `#terrPanel` é o primeiro check da cadeia (logo após onboarding, keydown handler linha ~42-50); `finish()`/`showDetail()` chamam `fecharTerrPanel()` no início (fix WR-03, "1 sheet por vez") |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `#terrGrid` (métricas do painel) | `st` (estatTerritorio) | `territorioScan(cd)` → `aplicarChoropleth(scan)` → dados reais do endpoint ArcGIS (via `fetchWhereRestrito`, allowlist real, sanitizados) | Sim — fluxo real, sem stub em produção | ✓ FLOWING |
| `#terrLegenda` (swatches+faixas) | `TERR_LAST_ST` | `abrirTerritorio()`/`toggleChoropleth()` chamam `montarLegenda(TERR_LAST_ST)` populado pela mesma `aplicarChoropleth` | Sim | ✓ FLOWING |
| choropleth de lotes | `TERR_LOTE_BIN` | `pm2Lote(a)` sobre `scan.lotes` reais (não mock) dentro de `aplicarChoropleth` | Sim | ✓ FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| TERR-01 | 15-01, 15-03 | Função compartilhada de varredura com cache de sessão e orçamento de requisições | ✓ SATISFIED | `territorioScan` único ponto de varredura; cache+dedupe+orçamento ≤3 testados; `terrUltimoOrcamento()` exposto para verificação ao vivo |
| TERR-02 | 15-02 | Choropleth de R$/m² por quadra/lote (quantis relativos), legível sobre satélite | ✓ SATISFIED | Paleta 5 faixas, `lotStyle`/`baiStyle` estendidos, opacidade nunca 0, troca via `setStyle()` |
| TERR-03 | 15-01, 15-03 | Painel do Meu Território (mediana+Q1-Q3 R$/m², IPTU mediano, idade do cadastro, mix de uso) | ✓ SATISFIED | `estatTerritorio` (funções puras) + `montarPainel` (render) — todas as 5 métricas presentes com rótulo de honestidade |

Nenhum requisito órfão: REQUIREMENTS.md mapeia apenas TERR-01/02/03 para a Fase 15 (tabela de Traceability), e os três aparecem declarados nos frontmatters dos 3 planos.

### Anti-Patterns Found

Nenhum bloqueante ou de aviso encontrado. Buscas por `TODO|FIXME|XXX|HACK|PLACEHOLDER` nos trechos modificados retornaram apenas ocorrências da palavra portuguesa "todo/toda" (não marcadores de pendência) e menções a "TODO" dentro de comentários preexistentes de outras fases (não relacionadas à Fase 15). Nenhuma chamada `lotStyle()` sem argumento, nenhuma legenda sem dado (WR-01 corrigido), nenhum vazamento de `dtnascimen`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suíte de testes completa (funções puras + rede mockada) | `npm test` | 121/121 verde | ✓ PASS |
| Orçamento nunca dobra com fallback (regressão WR-02) | teste "falha na 2ª página restrita não dobra o orçamento" | verde | ✓ PASS |
| Nenhuma chamada `lotStyle()` sem argumento restante | `grep -c "lotStyle())" radar-goiania.html` | 0 ocorrências | ✓ PASS |
| `montarLegenda` efetivamente chamada (não só definida) | `grep -n "montarLegenda(" radar-goiania.html` | chamada em `abrirTerritorio`/`toggleChoropleth` além da definição | ✓ PASS |
| bairro-cdbairro.json contém Bueno cd=16 | `node -e "require('./bairro-cdbairro.json')['000400000014'].cd"` | `16` | ✓ PASS |
| sw.js com precache correto e versão bumpada | grep radar-v7/bairro-cdbairro.json, ausência de radar-v6 | confirmado | ✓ PASS |

Contagem de requisições reais contra o endpoint ArcGIS de produção (via DevTools Network no Bueno) não é executável neste ambiente (sem servidor/rede externa disponível ao verificador) — roteada para Human Verification abaixo, conforme phase flag do ROADMAP.

### Human Verification Required

### 1. Contagem de requisições ao vivo no Bueno (endpoint real)

**Test:** Abrir DevTools → Network, acessar o setor Bueno (cdbairro=16, ~57k lotes), clicar "Ver território" e depois ligar o choropleth; filtrar por `MapServer/3/query`.
**Expected:** ≤3 requisições paginadas (outFields restrito, com fallback contando no mesmo orçamento) + 1 `returnCountOnly`; nunca 1 requisição por quadra. Cruzar com `terrUltimoOrcamento()` no console.
**Why human:** Depende do endpoint ArcGIS real de terceiro (portalmapa.goiania.go.gov.br); os testes automatizados usam `jsonp` stubado, não a rede real.

### 2. Tempo de resposta em 4G real

**Test:** Repetir a varredura do Bueno em conexão 4G real de campo.
**Expected:** Tempo aceitável, sem trava perceptível de UX durante o loading de 2 estágios.
**Why human:** Depende de latência de rede móvel real, não simulável em teste estático.

### 3. Legibilidade AA sobre satélite em luz externa

**Test:** Ligar o choropleth com o basemap satélite, em ambiente com luz solar forte (mobile).
**Expected:** As 5 faixas de cor e o texto da legenda/painel permanecem distinguíveis (contraste AA).
**Why human:** Percepção visual sob condições de luz reais não é verificável por grep/teste estático.

### 4. Hit-area de toque sobre área colorida (mobile)

**Test:** Tocar num lote/setor colorido pelo choropleth no mobile.
**Expected:** Toque abre a ficha/interação normalmente (fillOpacity nunca 0, mas o comportamento tátil real precisa de confirmação).
**Why human:** Comportamento de touchscreen em dispositivo real, não replicável em `node --test`.

### Gaps Summary

Nenhum gap de código encontrado. Todas as 5 truths do ROADMAP e os 12 must-haves consolidados dos 3 planos (15-01/02/03) foram verificados diretamente no código-fonte (`radar-goiania.html`, `sw.js`, `bairro-cdbairro.json`, `tests/`), incluindo as 7 correções do 15-REVIEW-FIX.md (WR-01..04, IN-01..03), todas presentes e testadas. `npm test` está verde em 121/121, batendo exatamente o baseline documentado nas notas de verificação.

O único motivo do status `human_needed` (não `passed`) é que 4 itens de verificação de campo — contagem real de requisições no endpoint de produção, tempo de scan em 4G, legibilidade AA sob luz externa e toque real em touchscreen — são phase flags explícitos do ROADMAP.md, não testáveis por análise estática/automação, e portanto roteados para o desenvolvedor confirmar manualmente antes de considerar a fase 100% fechada.

---

_Verified: 2026-07-09_
_Verifier: Claude (gsd-verifier)_
