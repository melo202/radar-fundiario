---
phase: 15-setor-scan-choropleth-painel-territorio
fixed_at: 2026-07-09T00:00:00Z
review_path: .planning/phases/15-setor-scan-choropleth-painel-territorio/15-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-07-09
**Source review:** .planning/phases/15-setor-scan-choropleth-painel-territorio/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (4 warnings + 3 infos — escopo `all`, conforme instrução)
- Fixed: 7
- Skipped: 0

`npm test` verde após CADA commit (120 testes na baseline, 121 a partir do commit do WR-02, que adicionou 1 teste novo).

## Fixed Issues

### WR-01: `montarLegenda()` é definida mas nunca chamada — legenda do choropleth fica sem rótulos

**Files modified:** `radar-goiania.html`
**Commit:** `15ed945`
**Applied fix:** Adicionado `TERR_LAST_ST` (última estatística retornada por `aplicarChoropleth`). `abrirTerritorio()` agora chama `montarLegenda(st)` logo após `aplicarChoropleth(scan)`. `toggleChoropleth()` foi reescrito para chamar `montarLegenda(TERR_LAST_ST)` ao ligar (populando swatches + rótulos de faixa R$/m² + `rotuloAmostra`) e apenas ocultar a legenda ao desligar — nunca mostra swatch sem número.
**Test result:** 120/120 verde.

### WR-02: fallback de `outFields` pode dobrar o orçamento HARD de páginas (até 6, não ≤3)

**Files modified:** `radar-goiania.html`, `tests/territorio.test.mjs`
**Commit:** `63b6af5`
**Applied fix:** `fetchWhereRestrito()` agora usa um `guardTotal` compartilhado entre a tentativa restrita e o fallback `outFields="*"` (movido para fora de `varrePaginas`, checado no topo do loop). O total de páginas paginadas entre as duas tentativas nunca excede `maxPages` (3). Adicionado teste novo (`falha na 2ª página restrita não dobra o orçamento...`) que fixa o cenário não coberto antes (erro na 2ª página, não na 1ª) e verifica `totalPageCalls <= 3`.
**Test result:** 121/121 verde (120 + 1 teste novo).

### WR-03: abrir `#detail`/`#chooser` não fecha `#terrPanel` — sheets podem se sobrepor

**Files modified:** `radar-goiania.html`
**Commit:** `2f4a2a8`
**Applied fix:** `finish()` (abre `#chooser`/lista) e `showDetail()` agora chamam `fecharTerrPanel()` no início, espelhando a regra "1 sheet por vez" já usada por `closeChooser()`/`closeDetail()`. `fecharTerrPanel()` foi endurecida com um guard (`!p.classList.contains("show")`) para só agir — e só roubar o foco para `#btnVerTerr` — quando o painel de fato estava aberto, evitando um efeito colateral novo (foco indevido) nas chamadas defensivas.
**Test result:** 121/121 verde.

### WR-04: retry de varredura parcial usa `baiHi` global em vez do layer original

**Files modified:** `radar-goiania.html`
**Commit:** `170bde6`
**Applied fix:** `abrirTerritorio()` agora captura `layerAtual=layer||baiHi` uma única vez no início e o usa em todo o resto da função (resolução de `cd`, `montarPainel`, `checarVarreduraParcial`). `checarVarreduraParcial(scan,layer)` passou a receber esse layer capturado e fecha o `onclick` do "tentar de novo" sobre ele, nunca sobre `baiHi` lido no momento do clique.
**Test result:** 121/121 verde.

### IN-01: `cdbairroParaIds` é construído mas nunca consumido

**Files modified:** `radar-goiania.html`
**Commit:** `bda340d`
**Applied fix:** Conforme instrução (preferir anotar em vez de remover), adicionado comentário curto acima da declaração explicando que é reserva intencional para o farming de território (Fase 16/17) e que o custo é apenas memória de um `Map` pequeno populado 1x por sessão. Código não removido/alterado funcionalmente.
**Test result:** 121/121 verde.

### IN-02: `TERR_LOTE_BIN` é substituído por completo a cada `aplicarChoropleth()`, mas `TERR_SETOR_ATIVO` nunca é limpo

**Files modified:** `radar-goiania.html`
**Commit:** `f46c062`
**Applied fix:** Opção (b) do fix sugerido: `aplicarChoropleth()` agora chama `TERR_SETOR_ATIVO.clear()` antes de `.add(scan.cdbairro)`, garantindo que só o setor mais recente fique "ativo" (wash de faixa 3 no `baiStyle`), espelhando a mesma regra de substituição já usada por `TERR_LOTE_BIN`. Comentários do bloco de estado global e da função atualizados para documentar a nova semântica.
**Test result:** 121/121 verde.

### IN-03: `mixUso` pode gerar chips duplicados com o rótulo "—" quando há usos fora do domínio conhecido

**Files modified:** `radar-goiania.html`
**Commit:** `714e00f`
**Applied fix:** O fallback de `mixUso` (para códigos de uso fora do domínio 0–6) agora inclui o código bruto no rótulo (ex. `"— (9)"`), evitando colisão visual entre dois códigos desconhecidos distintos. O label `"—"` de `uso===0` (já um valor de domínio legítimo em `USO[0]`) não foi alterado — a mudança afeta só o branch `else` do ternário.
**Test result:** 121/121 verde.

## Skipped Issues

Nenhum — todos os 7 findings em escopo (4 warnings + 3 infos) foram corrigidos.

---

_Fixed: 2026-07-09_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
