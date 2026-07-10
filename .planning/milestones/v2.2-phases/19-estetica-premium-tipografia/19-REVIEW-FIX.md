---
phase: 19-estetica-premium-tipografia
fixed_at: 2026-07-10T04:48:00-03:00
review_path: .planning/phases/19-estetica-premium-tipografia/19-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 19: Code Review Fix Report

**Fixed at:** 2026-07-10T04:48:00-03:00
**Source review:** .planning/phases/19-estetica-premium-tipografia/19-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (1 warning, 1 info)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: `untrapFocus()` não verifica posse do trap — clique no mapa com a ficha aberta destrói o trap de foco de #detail sem fechar o sheet

**Files modified:** `radar-goiania.html`
**Commit:** `be67945`
**Applied fix:** `untrapFocus()` passou a aceitar um parâmetro `container` opcional: quando informado e diferente do `TRAP_CONTAINER` ativo, a função retorna sem desmontar nada (outro modal é o dono do trap). Todos os `fecharX()` que fecham uma superfície modal específica agora passam o próprio container:
- `closeChooser()` → `untrapFocus(chooser)`
- `fecharComparacao()` → `untrapFocus(sheet)` (`#cmpSheet`)
- `closeDetail()` → `untrapFocus(d)` (`#detail`)
- `fecharLaudo()` → `untrapFocus(wiz)` (`#wiz`)
- `fecharCaptacao()` → `untrapFocus(sheet)` (`#captSheet`)
- `fecharNeg()` → `untrapFocus(sheet)` (`#negSheet`)
- `onbFechar()` → `untrapFocus(ov)` (`#onbOverlay`)

A única chamada que permaneceu **sem argumento** (comportamento global anterior) foi a de `showDetail()` (linha ~5590, `untrapFocus()` antes de `trapFocus(d)`), pois esse é o caso documentado de reabertura de `#detail` sobre si mesmo/sobre outro trap — precisa limpar incondicionalmente antes de recapturar. Verificado por leitura: `closeChooser()`→`trapFocus(chooser)` (showChooser) e o fluxo `finish()`→`closeChooser()`/`fecharComparacao()` com `#detail` aberto agora preservam o trap de `#detail` intacto, corrigindo o repro descrito no achado (clique em outro lote no mapa com a ficha aberta não derruba mais o `keydown` handler de `#detail`).

### IN-01: Acabamento de foco (`:focus{border-color:...}`) aplicado de forma inconsistente entre inputs equivalentes

**Files modified:** `radar-goiania.html`
**Commit:** `5837a7d`
**Applied fix:** `.cinput:focus` (linha 567, calculadora) e `.winput:focus` (linha 617, wizards de laudo/negociação) tiveram `border-color` alterado de `var(--accent)` para `var(--ink)`, alinhando com `select,input:focus` (linha 147) e `.caixa-input:focus` (linha 170) já ajustados em PREM-01. O `outline` de `:focus-visible` (linha 149, `--accent`) foi mantido intacto para as 4 regras — a mudança afeta só a cor da borda no `:focus` normal, não o anel de foco visível por teclado.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-07-10T04:48:00-03:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
