---
phase: 12-predio-como-objeto-comercial
fixed_at: 2026-07-07T21:16:00Z
review_path: .planning/phases/12-predio-como-objeto-comercial/12-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-07-07T21:16:00Z
**Source review:** .planning/phases/12-predio-como-objeto-comercial/12-REVIEW.md (commit `3c498fa`)
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (1 critical, 3 warning, 3 info — full scope, `fix_scope=all` requested explicitly)
- Fixed: 6
- Skipped: 1 (IN-02, documented instead of code-changed per explicit instruction)

Tests: **105/105 passing** (`node --test tests/*.test.mjs`), up from 101/101 baseline — 4 new tests
added covering the CR-01 fix (`remapPredio`).

## Fixed Issues

### CR-01: `ordenarBldg` could silently duplicate/drop units on `insubprinc` collision

**Files modified:** `radar-goiania.html`, `tests/fixtures.mjs`, `tests/predio.test.mjs`
**Commit:** `f3046f4`
**Applied fix:** Extracted a new pure function `remapPredio(list, ordenadas, pertence)` into the
`RADAR_PURE` block. It consumes a queue of the real replacement objects positionally (via
`fila.shift()`) as it walks `list`, deciding per-position (via the `pertence` predicate) which
slots to replace — zero key lookups, identity-based, count preserved by construction.
`unidadesEnriquecidasDoPredio` now carries a `__orig` back-reference (the real `LAST` object) on
each enriched copy so `ordenarBldg` can build the replacement queue from `.__orig` after sorting.
`ordenarBldg` was rewritten to call `remapPredio(LAST, fila, a=>clean(a.ci)===ci)` instead of the
old `LAST.find(orig=>clean(orig.ci)===... && String(orig.insubprinc||0)===...)` key lookup inside
`.map()`. Added 4 new tests in `tests/predio.test.mjs` (with a dedicated fixture
`remapPredioCasos.colisaoInsubprinc` reproducing 3 same-building units with colliding
`insubprinc`) proving: no duplication/loss, other buildings' units untouched, non-mutation, and
count preservation at scale.

### WR-01: `render(LAST)` unconditionally collapsed the open ordenação/filtro panel

**Files modified:** `radar-goiania.html`
**Commit:** `11f2eb9`
**Applied fix:** `BLDGSTATE[ci]` gained an `aberto` boolean (defaulted `false` in every
initializer). `bldgOrdHTML` now renders `hidden` conditionally on `st.aberto` instead of always.
`toggleBldgOrd` was rewritten to toggle `BLDGSTATE[ci].aberto` and call `render(LAST)` (instead of
only flipping the DOM `hidden` attribute), so any subsequent re-render (chip click, toggle,
search) preserves the open/closed state. Focus-on-open behavior (focusing the first chip) was
preserved by re-querying the freshly rendered panel after `render()`.

### WR-02: "Buscar unidade" input lost focus/cursor on every keystroke

**Files modified:** `radar-goiania.html`
**Commit:** `11f2eb9` (same commit as WR-01 — tightly coupled, same functions/region)
**Applied fix:** `buscarUnidadeBldg` now captures `document.activeElement`'s selection range
*before* calling `render(LAST)`, but only when the active element is actually this building's
search input (`.bldg-buscaunidade` inside `#bldgOrd-{ci}`) — never steals focus from unrelated
elements. After `render()`, it re-queries the freshly recreated input by selector and restores
`.focus()` + `.setSelectionRange(...)`.

### WR-03: Comparison table missing `scope`/`<th>` on row headers

**Files modified:** `radar-goiania.html`
**Commit:** `3d9ca66`
**Applied fix:** Column headers (`unitLabel(u)`) now render `<th scope="col">` instead of bare
`<th>`. The 5 row-label cells (Área/Venal/Estimado/R$/m²/Oportunidade) changed from
`<td class="cmp-rowlbl">` to `<th scope="row" class="cmp-rowlbl">`. No CSS changes needed —
`.cmp-rowlbl` and `.cmp-table th` selectors apply identically regardless of tag.

### IN-01: `.cmp-fab`/`.toast` visual collision on mobile

**Files modified:** `radar-goiania.html`
**Commit:** `1fa104b`
**Applied fix:** Trivial CSS-only fix as anticipated by the task brief. Raised the mobile
`.cmp-fab` bottom offset from `56px + 16px` to `56px + 78px` (comment documents the toast's
occupied vertical range: ~`56+14=70px` to `~110px`), clearing it above the toast with margin.
No JS/state dependency introduced.

### IN-03: `onclick="fn('${esc(ci)}')"` reintroduced banned inline-JS-interpolation pattern

**Files modified:** `radar-goiania.html`
**Commit:** `42b2132`
**Applied fix:** Converted all 4 call sites to the element-ref pattern already used by
`verNoMapa`/precedent in this file:
- `copyZapPredio(this)` — reads `ci` via `.closest(".bldg-head").dataset.ci`
- `ordenarBldg(this,criterio)`, `toggleAptosProvaveis(this)`, `buscarUnidadeBldg(this,this.value)`
  — read `ci` via `.closest(".bldg-ord").dataset.ci` (added `data-ci` to the `.bldg-ord` wrapper,
  which didn't carry it before)

  Along the way, corrected a latent (never-exercised) bug in the pre-existing
  `toggleAptosProvaveis` element-detection branch: it looked up `.closest(".bldg-head")`, but the
  button lives inside `.bldg-ord`, a *sibling* of `.bldg-head`, not a descendant — so that branch
  would always have returned `null` had it ever been invoked with an element. Now correctly uses
  `.closest(".bldg-ord")`.

  All 4 functions retain string-`ci` call compatibility (unused now, but kept for parity with
  `verNoMapa`'s dual-mode convention and defensive future-proofing).

## Skipped Issues

### IN-02: `mercadoEstimado` recomputed without memoization

**File:** `radar-goiania.html:2763` (`unidadesEnriquecidasDoPredio`) and `radar-goiania.html:2985`
(`cardHTML`, per original review line numbers — shifted after CR-01/WR-01 edits)
**Reason:** Per explicit task instruction — add a memo ONLY if it doesn't complicate, otherwise
leave documented. Investigated: `mercadoEstimado(a, privReal)` has a second parameter that
**varies between call sites for the same object `a`** across the file (laudo/detail call sites
pass `LZ.privativa`; the sumário/card call sites in scope here never pass it). A naive
object-identity memo (`WeakMap<a, result>`) would be unsafe — it could serve a stale/wrong
estimate computed with a different `privReal` from a different call site touching the same unit
within the same render pass. Making the memo correct would require keying on `(a, privReal)`
across all 13 `mercadoEstimado(...)` call sites in the file, which is a scope increase disallowed
by "ONLY if it doesn't complicate." Left as a documented code comment explaining the trade-off and
when to revisit (buildings with 100+ units becoming common). No functional change — status
`docs`, not `fixed`. Commit `fb91303`.

---

_Fixed: 2026-07-07T21:16:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
