---
phase: 09-ficha-conclusao-comercial-scores
reviewed: 2026-07-07T15:34:33Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/fixtures.mjs
  - tests/scores.test.mjs
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-07-07T15:34:33Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the full range `83d6a5f..HEAD` covering waves 09-01/09-02/09-03: the pure score functions (`scoreOportunidade`, `scoreConfianca`, `leituraPratica`), the `#detail` reorder (`showDetail()` rewrite adding `#dValor`/`#dScores`/`#dLeitura`/Lei-da-Tela actions/accordions), `renderScoresInto`/`toggleScoreWhy`/`atualizarScores` score-panel wiring, and the `renderComps()` conclusão-primeiro rewrite with `abrirMetodologiaCmp`.

The score-wiring lifecycle (`showDetail()` → `compare()` → `renderComps()` → `atualizarScores()`) is race-safe: every write path re-checks `DCUR===a` immediately before touching the DOM (`renderComps` at its own guard, `atualizarScores` again at its own guard), and `scoreConfianca` never returns `null`, so `renderScoresInto` never throws on `conf.nivel`. `esc()` is applied everywhere an endpoint-derived or computed string reaches `innerHTML` (`op.rotulo`, `porque` arrays, `leituraPratica()` output, `estM.metodo`). No free/unescaped text reaches inline `onclick=` strings (`inscUse` is `esc()`'d before interpolation, matching the pre-existing IN-01 contract). The `|myPm2-med|/med*100` formula is computed identically in `scoreOportunidade` and in `renderComps`'s `conclusaoTxt` — no drift, no percentile leaking into the conclusion text. All 34 tests pass (3 new: `scoreOportunidade`, `scoreConfianca`, `leituraPratica`), including the honesty-contract fixtures (`expectNull: true` cases, `expectExact` "Dados insuficientes..." fallback).

Two real issues were found: a CSS/markup mismatch that silently drops the "primary" accent styling from the new "Gerar documento" CTA button (the only `.primary` CSS rule targets `a.primary`, but the button is a `<button>`), and a wrong-radius bug where `atualizarScores()` reads `statsR.radius` — a field `compsStats()` never sets — so the "Boa oportunidade" why-text always claims "até 400 m" even when the real query radius was 800 m (fallback tier of `getComps()`'s `[400,800]` loop). Neither is a security or data-loss issue; both are honesty/UX regressions worth fixing before wider rollout.

## Warnings

### WR-01: Primary CTA button never gets `.primary` accent styling

**File:** `radar-goiania.html:487` (CSS) and `radar-goiania.html:2185` (markup)
**Issue:** The only `.primary` styling rule in the stylesheet is:
```css
.detail .acts a.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.detail .acts a.primary:hover{background:var(--accent-ink)}
```
It matches `a.primary` (an anchor). But the new Lei-da-Tela primary action, rendered by `showDetail()`, is a `<button>`:
```js
document.getElementById("dActsPrim").innerHTML=`
  <button type="button" class="primary" onclick="abrirLaudo()">📄 Gerar documento</button>
  ...`;
```
`button.primary` never matches `a.primary`, so "Gerar documento" renders identically to the two secondary actions ("Ver comparáveis", "Copiar inscrição") — no accent background, no `#fff` text. This directly contradicts the phase's own spec (`09-UI-SPEC.md:253`: *"`.acts a.primary`/`.acts button.primary` já existente — `background:var(--accent); border-color:var(--accent); color:#fff`"*) and the accepted decision that "Gerar documento" is THE primary action of the ficha. It's also the only remaining consumer of `.primary` in the file — the old `<a class="primary">` (Google Maps link) lost its `class="primary"` in this same diff (line 361 of the diff removes it), so the selector is effectively dead CSS on top of missing the button case.

**Fix:** Broaden the selector to cover both tag types (matches the spec's own wording):
```css
.detail .acts a.primary,.detail .acts button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.detail .acts a.primary:hover,.detail .acts button.primary:hover{background:var(--accent-ink)}
```

### WR-02: `atualizarScores()` reads a `stats.radius` field that `compsStats()` never sets — wrong radius shown in "Boa oportunidade" why-text

**File:** `radar-goiania.html:2106` (call site) and `radar-goiania.html:1007` (consumer)
**Issue:** `atualizarScores(a, statsR)` builds the flags object as:
```js
const op=scoreOportunidade(myPm2,stats,{radius:statsR?statsR.radius:400});
```
`statsR` is the `r` object returned by `compsStats()` (see `radar-goiania.html:2278-2310`), which only ever returns `{n, exact, vals, min, max, q1, med, q3}` — it never sets a `.radius` property. The actual radius (400 or 800) lives in a separate local variable inside `getComps()` (`radar-goiania.html:2241-2251`) and is passed to `renderComps()`/`compsStats()` as a positional parameter, never attached to the stats object. So `statsR.radius` is always `undefined`, and `scoreOportunidade`'s "Boa oportunidade" branch:
```js
porque=[`Está ${diffPct}% abaixo da mediana da vizinhança (comparáveis em até ${(flags&&flags.radius)||400} m).`];
```
always falls back to the hardcoded `400`, even when `getComps()`'s two-tier loop `[400,800]` (`radar-goiania.html:2242`) had to widen to 800 m to reach `n>=3`. Since the widened-radius path is a normal, frequently-hit branch (many properties don't have 3+ comparables within 400 m), this is a real user-facing inaccuracy: the score's "why" text will assert a false detail about the methodology it just used, undermining the honesty goal of SCORE-01/CMP-01 (the accordion "Estatística completa" block does show the correct `radius` — the inconsistency is only in the score panel's why-text).

**Fix:** Thread the real radius through. `renderComps(box,r,myPm2,radius,isU,a)` already receives `radius` as a parameter — pass it explicitly instead of relying on a non-existent field:
```js
atualizarScores(a, r, radius); /* radius já disponível no parametro de renderComps — nao inventar via r.radius (inexistente) */
```
```js
function atualizarScores(a, statsR, radius){
  ...
  const op=scoreOportunidade(myPm2,stats,{radius:radius||400});
}
```

## Info

### IN-01: Minor inconsistency in the strict-vs-inclusive "abaixo da mediana" boundary

**File:** `radar-goiania.html:1003` vs `radar-goiania.html:2329`
**Issue:** `scoreOportunidade` computes `abaixo=myPm2<med` (strict) while `renderComps`'s `conclusaoTxt` computes `abaixo=temBase&&myPm2<=r.med` (inclusive). At the exact boundary `myPm2===med`, `diffPct` is `0` in both places (so the visible text differs only in the "Oportunidade média" branch, which isn't reached when `diffPct===0` triggers the `"Na mediana"` special case in `renderComps` first). Purely cosmetic today, but worth aligning if either formula is touched again — future edits could reintroduce a visible mismatch at the boundary.
**Fix:** Use the same comparator (`<=` or `<`) in both places for consistency; e.g. change `scoreOportunidade`'s `abaixo` to `myPm2<=med`.

### IN-02: "Mercado (estimado)" faixa duplicated between `#dValor` and the collapsed `dGrid`

**File:** `radar-goiania.html:2163` and `radar-goiania.html:2130-2132`
**Issue:** The faixa de valor now appears twice: prominently in the new `#dValor` block (conclusão-primeiro, FICHA-01) and again as a row inside the "Dados técnicos" `<details>` grid (`<div class="cell hl">Mercado (estimado)`). This looks intentional (the technical grid is meant to remain a complete reference even though it's now collapsed by default), and nothing in `09-CONTEXT.md`/`09-UI-SPEC.md` forbids it, so this is not a defect — just a candidate for cleanup if the technical grid is revisited later.
**Fix:** No action required; consider removing the `cell.hl` row from `dGrid` in a future pass if the duplication is judged confusing once accordions are used in practice.

---

_Reviewed: 2026-07-07T15:34:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
