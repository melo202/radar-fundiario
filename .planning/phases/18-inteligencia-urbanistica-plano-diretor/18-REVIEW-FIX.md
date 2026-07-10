---
phase: 18-inteligencia-urbanistica-plano-diretor
fixed_at: 2026-07-10T05:27:44Z
review_path: .planning/phases/18-inteligencia-urbanistica-plano-diretor/18-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-07-10T05:27:44Z
**Source review:** .planning/phases/18-inteligencia-urbanistica-plano-diretor/18-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (4 warnings + 1 info — fix_scope=all)
- Fixed: 5
- Skipped: 0

Suíte completa (`node --test tests/*.mjs`) rodada após CADA commit — 234 testes na baseline, 239 ao final (5 testes novos), 0 falhas em nenhum ponto.

## Fixed Issues

### WR-01: Camada de zonas do Plano Diretor sem gate de zoom/tamanho de viewport

**Files modified:** `radar-goiania.html`, `tests/pd.test.mjs`
**Commit:** `3d10c2a`
**Applied fix:** Extraído um gate PURO/testável `zonasZoomGateOk(zoom)` (dentro do bloco `RADAR_PURE`, `zoom>=13`, mesmo espírito do gate de `refreshLots` mas com threshold mais baixo por zonas cobrirem área maior). `desenharZonas()` agora consulta o gate antes de disparar `carregarZonasViewport`; abaixo do threshold, invalida o token em voo, chama `limparZonas()` e mostra aviso discreto em `#terrAmostra` (`textContent`+`title`) em vez de nunca desenhar a camada. 3 testes novos (`zonasZoomGateOk`) cobrem libera (13/17/18), bloqueia (12/0/-1) e entrada não-numérica (undefined/null/NaN).

### WR-02: `badges.add` redundante com a Unidade Territorial resolvida

**Files modified:** `radar-goiania.html`, `tests/pd.test.mjs`, `tests/fixtures.mjs`
**Commit:** `1a1dd3b`
**Applied fix:** Adicionada a linha `badges.add=badges.add&&!(unidade&&unidade.sigla==="ADD");` logo após o laço de resolução da unidade em `resolverZonaUI` — suprime o badge quando ele coincidiria com a própria Unidade Territorial já mostrada como campo primário. Nova fixture `PD_FIX.respostas.addResolvido` + teste confirmando `badges.add===false` quando `unidade.sigla==="ADD"`.

### WR-03: Precedência AA > ADD > AOS não documentada nem testada

**Files modified:** `radar-goiania.html`, `tests/pd.test.mjs`, `tests/fixtures.mjs`
**Commit:** `08820d9`
**Applied fix:** Comentário explícito acima do laço `for(const key of ["aa","add","aos"])` documentando que a precedência é um CONTRATO (não acidente de ordem de array), citando a premissa de disjunção das unidades territoriais da SEPLANH e o comportamento esperado em caso de sobreposição de borda. Nova fixture `PD_FIX.respostas.aaAddSobreposto` (AA+ADD ambos presentes) + teste fixando `unidade.sigla==="AA"` e `badges.add===true` (a layer intersectou de fato, não é suprimida pois a unidade não é ADD).

### WR-04: `renderDetectorCriterioPD()` sem guarda de invalidação

**Files modified:** `radar-goiania.html`
**Commit:** `feb90e2`
**Applied fix:** Adicionado `if(TERR_DETECTOR_CAND!==cand)return;` logo após o `await consultarPDPorQuadra(cand)`, replicando o mesmo padrão de guarda de invalidação por referência já usado no arquivo (`SEARCHTOKEN`/`DRILLTOKEN`/`ZONASTOKEN`/`DCUR!==a`). Se `renderDetectorLista` reatribuir `TERR_DETECTOR_CAND` a um novo array enquanto a Promise está em voo, o rótulo antigo não é mais escrito nos elementos `#terrdetCrit{i}` (que agora pertencem a outro candidato). Função é DOM/imperativa (fora dos blocos `RADAR_PURE`/`PD_NET`/`PD_ZONA_NET` marcados) — seguindo o padrão já estabelecido no repo (comentário em `tests/pd.test.mjs`: "funções DOM/Leaflet-pesadas nunca são exercitadas via node:vm"), não foi criado harness de teste automatizado dedicado; verificação por Tier 1 (releitura) + suíte completa (239/239 verde, nenhuma regressão).

### IN-01: Accordion "Urbanístico" visível/expansível sem coordenadas

**Files modified:** `radar-goiania.html`
**Commit:** `f313ccd`
**Applied fix:** `renderUrbanisticoUI` agora esconde `acc` (o `<details id="dUrbanistico">` inteiro) junto com `body` quando `!a.x_coord||!a.y_coord`, e restaura `acc.hidden=false` no caminho normal (para o caso do lote anterior ter escondido o accordion inteiro). Mesmo padrão já usado em outros pontos do app para ausência de coordenada.

## Skipped Issues

Nenhuma — todos os 5 findings em escopo foram corrigidos.

---

_Fixed: 2026-07-10T05:27:44Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
