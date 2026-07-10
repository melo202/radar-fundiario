---
phase: 12-predio-como-objeto-comercial
reviewed: 2026-07-07T21:04:02Z
depth: deep
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/fixtures.mjs
  - tests/predio.test.mjs
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-07-07T21:04:02Z
**Depth:** deep
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed waves 12-01 (pure functions `resumoPredio`/`ordenaUnidades`/`ehAptoProvavel`/`analisePredicoTexto`
in `RADAR_PURE`) and 12-02 (bldg-sumario UI, ordenação/filtro por prédio, `cmp-toggle`/`cmpFab`/`cmpSheet`)
against `fc780e6..HEAD`. Tests: **101/101 passing** (`node --test tests/*.test.mjs`), including 20 new
tests in `tests/predio.test.mjs` covering the RADAR_PURE additions with good honesty/non-mutation/
stability coverage.

The pure block (`resumoPredio`, `ordenaUnidades`, `ehAptoProvavel`, `analisePredicoTexto`) is solid:
correctly handles empty/partial samples, never produces NaN/undefined, and `ordenaUnidades` is
verifiably non-mutating and stable per its own test suite.

The UI layer (12-02) has one critical data-integrity bug in the sort-remap logic
(`ordenarBldg`), a severe UX regression that silently collapses the ordenação/filtro panel and
breaks the unit-search input on every keystroke (both are consequences of `render()` doing a full
`innerHTML` replace on every `BLDGSTATE` mutation), an a11y gap in the comparison table (missing
`scope`/`<th>` on row headers), and a mobile FAB/toast visual collision that triggers in exactly
the scenario most likely to occur (marking the 4th+ unit for comparison).

## Critical Issues

### CR-01: `ordenarBldg` can silently duplicate/drop units when `insubprinc` collides within a building

**File:** `radar-goiania.html:2807-2824` (remap: `radar-goiania.html:2817-2822`)
**Issue:**
`ordenarBldg` remaps the sorted, `__est`-enriched copy back onto the real `LAST` objects using
`LAST.find(orig=>clean(orig.ci)===clean(prox.ci)&&String(orig.insubprinc||0)===String(prox.insubprinc||0))`
inside a `.map()` callback — i.e. a **key lookup**, not a positional/index-based remap.

`insubprinc` is documented elsewhere in this same file only as a **sort tie-breaker**
(`radar-goiania.html:2584`: `(x.insubprinc||0)-(y.insubprinc||0)`), never as a guaranteed-unique
identity field. It commonly defaults to `0`/`undefined` for units without a formal
sub-registration number (e.g. garage boxes, or cadastral records that never got a sub-inscrição
assigned). If **two or more units in the same building share the same `(ci, insubprinc)` pair**,
`.find()` always returns the **first** match in `LAST` for every position that needs remapping —
duplicating that one unit across all matching slots and **silently dropping the other unit(s)**
from `LAST` after any sort action. Since `LAST` is the single source of truth consumed by
`render`, `plot`, `pick`, CSV export, and the comparison sheet, this corrupts the entire session
after a single click on any sort chip inside a building with colliding `insubprinc` values.

The plan's own threat model (12-02-PLAN.md T-12-04) describes the intended mitigation as
"remapeamento percorre `LAST` sequencialmente **por índice**" — but the shipped code does a
key-based `.find()` lookup, not an index-based remap. The mitigation described was never actually
implemented as written, so T-12-04 is not covered.

**Fix:** Remap by position instead of by key. Since `unidadesEnriquecidasDoPredio(ci)` preserves
the original `LAST` sub-order (it's a plain `.filter().map()`), you can carry the original index
through `ordenaUnidades` instead of re-finding by `(ci, insubprinc)`:

```js
function unidadesEnriquecidasDoPredio(ci){
  ci=clean(ci);
  const out=[];
  LAST.forEach((a,gi)=>{if(clean(a.ci)===ci)out.push(Object.assign({},a,{__est:mercadoEstimado(a),__gi:gi}));});
  return out;
}
function ordenarBldg(ci,criterio){
  ci=clean(ci);
  BLDGSTATE[ci]=BLDGSTATE[ci]||{criterio:"padrao",provaveis:false,busca:""};
  BLDGSTATE[ci].criterio=criterio;
  const enriquecidas=unidadesEnriquecidasDoPredio(ci);
  const reordenadas=ordenaUnidades(enriquecidas,criterio);
  let cursor=0;
  LAST=LAST.map(a=>{
    if(clean(a.ci)!==ci)return a;
    const prox=reordenadas[cursor++];
    return LAST[prox.__gi]; // remapeia por indice original, nunca por chave que pode colidir
  });
  render(LAST);
}
```
(`__gi` never leaks into `LAST` itself — it only lives on the throwaway enriched copies.)

## Warnings

### WR-01: `render(LAST)` unconditionally collapses the open ordenação/filtro panel on every interaction inside it

**File:** `radar-goiania.html:2776-2794` (always-hidden markup), consumed by
`radar-goiania.html:2807-2839` (`ordenarBldg`, `toggleAptosProvaveis`, `buscarUnidadeBldg`, all of
which end in `render(LAST)`)
**Issue:** `bldgOrdHTML(ci)` always renders `<div class="bldg-ord" ... hidden>` and its toggle
button always renders `aria-expanded="false"`, regardless of whether the panel was open when the
re-render was triggered. Every state-changing action available *inside* that panel — clicking a
sort chip, toggling "Só aptos prováveis", or typing in "Buscar unidade" — calls `render(LAST)`
(`radar-goiania.html:2824,2832,2838`), which does `box.innerHTML=html` (`radar-goiania.html:2733`)
and thus recreates the panel from scratch in its default collapsed state.

Net effect: the panel closes itself immediately after the very first interaction. Sorting by
"Maior oportunidade" applies correctly (the chip's `on`/`aria-pressed` state does reflect
`BLDGSTATE`), but the panel visually collapses, so the user loses the visual context of which
sort/filter is active and must re-click "Ordenar / filtrar" to see/change it again.

**Fix:** Track open/closed state per building in `BLDGSTATE` (or a separate `Set`) and have
`bldgOrdHTML` honor it:
```js
// BLDGSTATE[ci] gains an `aberto` flag, toggled by toggleBldgOrd instead of only touching the DOM:
function toggleBldgOrd(btn){
  const head=btn.closest(".bldg-head");if(!head)return;
  const ci=clean(head.dataset.ci);
  BLDGSTATE[ci]=BLDGSTATE[ci]||{criterio:"padrao",provaveis:false,busca:"",aberto:false};
  BLDGSTATE[ci].aberto=!BLDGSTATE[ci].aberto;
  render(LAST);
}
// bldgOrdHTML: `hidden` becomes conditional on st.aberto, and focus-restore/aria-expanded follow it.
```

### WR-02: "Buscar unidade" input loses focus/cursor on every keystroke

**File:** `radar-goiania.html:2791` (`oninput="buscarUnidadeBldg('${esc(ci)}',this.value)"`),
`radar-goiania.html:2834-2838` (`buscarUnidadeBldg`)
**Issue:** Same root cause as WR-01. `buscarUnidadeBldg` runs on every `oninput` event and calls
`render(LAST)`, which replaces `#results` innerHTML wholesale. The `<input class="bldg-buscaunidade">`
element is destroyed and a new one created on every keystroke, so focus (and cursor position) is
lost immediately after the first character is typed — the field is effectively unusable for
multi-character queries without re-clicking/re-focusing after each character on most browsers.
**Fix:** Debounce + restore focus/selection explicitly after `render()`, or (better) avoid a full
list re-render for this filter and instead toggle a CSS class/visibility on existing `.card`
elements without touching the input's own subtree. Minimal fix if keeping the full re-render:
```js
function buscarUnidadeBldg(ci,q){
  ci=clean(ci);
  BLDGSTATE[ci]=BLDGSTATE[ci]||{criterio:"padrao",provaveis:false,busca:""};
  BLDGSTATE[ci].busca=q;
  const active=document.activeElement;
  const sel=active&&active.tagName==="INPUT"?[active.selectionStart,active.selectionEnd]:null;
  render(LAST);
  if(sel){
    const again=document.querySelector(`#bldgOrd-${ci} .bldg-buscaunidade`);
    if(again){again.focus();again.setSelectionRange(sel[0],sel[1]);}
  }
}
```

### WR-03: `<th>` column headers missing `scope`; row headers use `<td>` instead of `<th scope="row">` in the comparison table

**File:** `radar-goiania.html:2882-2901` (table markup inside `abrirComparacao`)
**Issue:** The comparison table's row labels ("Área", "Venal", "Estimado", "R$/m²", "Oportunidade")
are rendered as `<td class="cmp-rowlbl">` (`radar-goiania.html:2890-2894`), and the unit-name column
headers are plain `<th>` with no `scope` attribute (`radar-goiania.html:2885-2886`). Screen readers
relying on header association (NVDA/VoiceOver table navigation) will not announce "Área: R$ X" when
moving through data cells — only the raw values, since neither the row nor column headers are
programmatically associated with the data cells.
**Fix:**
```js
${unidades.map(u=>`<th scope="col">${esc(unitLabel(u))||"Imóvel"}</th>`).join("")}
...
<tr><th scope="row" class="cmp-rowlbl">Área</th>${cells(...)}</tr>
```
(Repeat for all 5 data rows; `.cmp-rowlbl` CSS class can stay as-is since `<th>` accepts the same
class.)

## Info

### IN-01: `cmp-fab` and `.toast` visually collide on mobile in the one scenario guaranteed to trigger both

**File:** CSS `radar-goiania.html:151-152` (`.cmp-fab` bottom offset, mobile media query) and
`radar-goiania.html:686` (`.toast` bottom offset, mobile media query); trigger:
`radar-goiania.html:2861-2864` (toast fired) + `radar-goiania.html:2873` (`fab.hidden=CMP.length<2`)
**Issue:** On mobile (`max-width:820px`), `.toast` bottom offset is `56px+14px+safe` and `.cmp-fab`
bottom offset is `56px+16px+safe` — nearly identical, both horizontally centered
(`left:50%;transform:translateX(-50%)`). The "você já marcou 4" toast (`toast(...)` at
`radar-goiania.html:2862`) fires exactly when `CMP.length>=4`, which is exactly when the FAB is
already visible (`CMP.length>=2`). The two elements will overlap on screen for the toast's
duration. Not a functional bug (toast z-index 900 > FAB z-index 850, so the toast is legible), but
a visual/UX defect worth a follow-up: raise the FAB (or lower the toast) further when both can be
simultaneously visible, e.g. `bottom:calc(56px + 60px + env(safe-area-inset-bottom))` on the FAB
when a toast is showing, or simply nudge the mobile FAB above the toast's max height.

### IN-02: `mercadoEstimado` recomputed with no memoization on every render, for every unit in a building, twice

**File:** `radar-goiania.html:2749-2751` (`unidadesEnriquecidasDoPredio`, called from
`bldgSumarioHTML`/`ordenarBldg`/`copyZapPredio`) and `radar-goiania.html:2926-2928` (`cardHTML`,
also calls `mercadoEstimado(a)` independently per visible card)
**Issue:** `mercadoEstimado` is pure/cheap (no network, simple arithmetic + object lookup), so this
is not a crash/perf risk on its own — flagged as Info per the explicit performance-out-of-scope
policy. Noted because it compounds with WR-02: every keystroke in "Buscar unidade" triggers
`render(LAST)`, which recomputes `mercadoEstimado` for every unit of every rendered building
header (`bldgSumarioHTML`) *and* again per visible card (`cardHTML`) — redundant work that is
unnecessary given `__est` is never cached anywhere between these two call sites for the same
render pass. Not required to fix for this phase, but worth a follow-up if buildings with 100+
units become common (currently `RENDN=300` caps visible cards, but `bldgSumarioHTML`'s aggregate
runs over the *entire* building regardless of RENDN).

### IN-03: `onclick="fn('${esc(ci)}')"` reintroduces the exact inline-JS-string-interpolation pattern the project banned in CR-01 (08-REVIEW.md)

**File:** `radar-goiania.html:2772` (`copyZapPredio`), `radar-goiania.html:2784-2787`
(`ordenarBldg`), `radar-goiania.html:2790` (`toggleAptosProvaveis`), `radar-goiania.html:2791`
(`buscarUnidadeBldg`)
**Issue:** All four handlers are wired via `onclick="fn('${esc(ci)}', ...)"` — the same structural
pattern the project explicitly fixed and documented as banned in commit `766cc7a` / 08-REVIEW.md
CR-01 ("NUNCA interpolar texto livre dentro de string JS de onclick inline... `esc()` só é seguro
em atributo/HTML lido de volta via `.dataset`"), because `esc()`'s HTML-entity escaping (e.g. `'`
→ `&#39;`) is undone by the browser's attribute HTML-decoding *before* the string reaches the JS
parser, so a value containing a literal `'` breaks out of the intended string literal.
Exploitability here is low in practice: `ci` is `clean(a.ci)`, the cadastral "inscrição" numeric
ID returned by the government ArcGIS API (`outFields:"ci"`), never user-typed free text, so in the
current data pipeline it cannot contain a `'`. Flagged as Info (not Critical) for that reason, but
it violates the project's own documented rule and reintroduces the identical anti-pattern in 4 new
call sites — worth converting to the `data-ci`/`.closest(...).dataset.ci` pattern already used by
`verNoMapa` (`radar-goiania.html:2718`) for consistency and to close the door if `ci` semantics
ever change.

---

_Reviewed: 2026-07-07T21:04:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
