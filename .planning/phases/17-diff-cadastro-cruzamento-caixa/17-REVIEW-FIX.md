---
phase: 17-diff-cadastro-cruzamento-caixa
fixed_at: 2026-07-10T03:00:54Z
review_path: .planning/phases/17-diff-cadastro-cruzamento-caixa/17-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 17: Code Review Fix Report

**Fixed at:** 2026-07-10T03:00:54Z
**Source review:** .planning/phases/17-diff-cadastro-cruzamento-caixa/17-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: `garantirCaixaLayer()` não é idempotente sob chamadas concorrentes — pode duplicar/orfanar a camada Caixa no mapa

**Files modified:** `radar-goiania.html`
**Commit:** `d62738a`
**Applied fix:** Adicionada dedupe de chamada em voo via variável de módulo `caixaLayerBuilding`,
seguindo o mesmo padrão idiomático de `territorioScan()`/`TERRCACHE` já presente no código-base. A
função agora guarda a Promise de construção em `caixaLayerBuilding` antes do único `await`; chamadas
concorrentes recebem essa mesma Promise em vez de disparar uma 2ª construção. A atribuição final de
`caixaLayer`/`caixaAnelLayer` ocorre uma única vez, e `caixaLayerBuilding` é limpo em `finally` (tanto
em sucesso quanto em erro), preservando o comportamento "no-op se já construído" descrito no
comentário original da função.

### WR-02: `salvarDetectorNoCadernoUI` não grava `snapshot`/`snapshotAt` — lotes salvos pelo Detector nunca ativam o diff

**Files modified:** `radar-goiania.html`
**Commit:** `0e2af4b`
**Applied fix:** Duas mudanças complementares, ambas no mesmo commit:
1. `salvarDetectorNoCadernoUI` agora grava `snapshot`/`snapshotAt` no objeto `item` do 1º save,
   espelhando exatamente o subconjunto `DIFF_ALLOW` (`vlvenal`,`areaedif`,`vlimp98`,`uso`,
   `dtinclusao`) já usado por `salvarNoCadernoUI`.
2. `renderDiffUI` ganhou um caminho de **backfill**: quando o item existe no Caderno mas ainda não
   tem `snapshot` (lote salvo pelo Detector antes deste fix, ou importado de um Caderno anterior à
   Fase 17), a função grava um snapshot novo a partir dos dados frescos atuais (`snapshotAt=agora`)
   e mantém `#dDiff` `hidden` **nesta** visita (não há base de comparação ainda) — o diff passa a
   aparecer normalmente a partir da próxima revisita, quando já existirá um snapshot anterior para
   comparar.

### IN-01: `cdbairroDoImovelCaixa` chamado duas vezes para o mesmo imóvel em `cruzarCaixaTerritorio`

**Files modified:** `radar-goiania.html`
**Commit:** `f7fdab8`
**Applied fix:** Reescrito `cruzarCaixaTerritorio` para calcular `cdbairroDoImovelCaixa(i,...)` uma
única vez por imóvel dentro de um único `forEach`, populando `matches` e o `Set` de bairros na mesma
passagem, em vez do `.filter` + `.flatMap` anteriores que refaziam a chamada. Ordem de inserção do
`Set` de bairros preservada (mesma ordem relativa dos `matches`), sem alteração de comportamento —
confirmado pelos 184 testes verdes (nenhum teste depende de contagem de chamadas).

## Skipped Issues

Nenhum — todos os 3 findings em escopo (WR-01, WR-02, IN-01) foram corrigidos com sucesso.

---

_Fixed: 2026-07-10T03:00:54Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
