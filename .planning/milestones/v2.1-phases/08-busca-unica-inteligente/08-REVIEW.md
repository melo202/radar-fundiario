---
phase: 08-busca-unica-inteligente
reviewed: 2026-07-07T14:01:33Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - radar-goiania.html
  - tests/busca.test.mjs
  - tests/detectmode.test.mjs
  - tests/fixtures.mjs
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: findings
---

# Phase 8: Code Review Report — Busca Única Inteligente

**Reviewed:** 2026-07-07T14:01:33Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the full diff `46c27e8..HEAD` touching `radar-goiania.html`, `tests/busca.test.mjs`, `tests/detectmode.test.mjs`, `tests/fixtures.mjs` (630 lines added/changed in the HTML, 819 insertions / 58 deletions total). This covers the RADAR_PURE additions (`matchScoreQ/L/Rua`, `extractSetor`, `detectMode`), the caixa única UI wiring (debounce + detectMode, chip/menu correction, disambiguation chips, unified CNEFE+Setor dropdown), the deep-link `?insc=` boot path, Google Maps/coordinate paste (`parseGeoPaste` → `identifyPoint`), and best-effort voice input.

`node --test "tests/*.test.mjs"` was run and **all 27 tests pass** (0 failures). No source files were modified during this review.

The core RADAR_PURE functions are well-tested and the SEARCHTOKEN discipline is correctly applied to every new async path (`identifyPoint`, `loadCnefe` via its own `CNEFETOKEN`). Escaping discipline (`esc()`) is correctly applied to almost every dynamic HTML interpolation, with one important exception detailed below (CR-01) — a genuine JS-string-breakout bug in a newly added error-recovery button, introduced in commit `600878c`. Three warning-level issues were found: a documented `detectMode` input format (bare `"128/5"` without `Q`/`L` words) that the shipped regex does not actually support despite the docstring and `SEARCH.md` spec claiming it does; a debounced "pure-looking" detection helper (`applyLastBairroIfNeeded`) that has UI/localStorage side effects on every keystroke; and no de-duplication guard on `identifyPoint()` when `parseGeoPaste` keeps matching the same coordinates across repeated debounce ticks.

## Critical Issues

### CR-01: `esc()`-escaped free text breaks out of inline `onclick` JS string literal (XSS-adjacent)

**File:** `radar-goiania.html:1608-1609` (introduced in commit `600878c`, function `finish()`)
**Issue:**
```js
const ruaTxt=esc(clean(document.getElementById("rua").value));
if(ruaTxt)acao=`<button type="button" onclick="document.getElementById('predio').value='${ruaTxt}';forceMode('bd');buscar()">Buscar como Prédio</button>`;
```
`esc()` HTML-entity-encodes `<`, `>`, `&`, `"`, and `'` (as `&#39;`) for an **HTML attribute** context. But here the escaped value is placed inside a **single-quoted JavaScript string literal**, itself inside the `onclick="..."` attribute. The browser HTML-decodes attribute values *before* handing them to the JS parser as the event-handler source — so `&#39;` becomes `'` again at execution time, and an apostrophe in the user-typed rua/logradouro (`#rua`, free text, e.g. copy-pasted from an address like `"Rua D'Abadia"` or any adversarial value) closes the JS string early and lets arbitrary trailing text execute as JavaScript.

Verified with Node:
```
input:  x');alert(1);document.getElementById('predio').value=('
esc():  x&#39;);alert(1);document.getElementById(&#39;predio&#39;).value=(&#39;
rendered onclick: ...value='x&#39;);alert(1);document.getElementById(&#39;predio&#39;).value=(&#39;';forceMode('bd');buscar()
```
After the browser's attribute-value HTML-decoding step, the actual JS source becomes `...value='x');alert(1);document.getElementById('predio').value=('';forceMode('bd');buscar()` — i.e. `alert(1)` (or any attacker payload) runs. This path is reachable purely by typing free text into the `#rua` field, running an `addr`-mode search that returns zero results, and having the "Buscar como Prédio" fallback button rendered (`finish()`, empty-`addr` branch) — no additional user action needed beyond that (the button is inserted into `#results` via `innerHTML` immediately).

This is the *only* new interpolation of genuinely free-text, user-controlled input into an inline `onclick` JS-string-literal context introduced by this phase (checked every other new `onclick="...${...}..."` site — `pickBairro('${b.code}')` pre-existing/untouched, ambiguity-chip buttons use `data-*` attributes read via `.dataset` rather than re-parsed JS, `inscUse`/array indices elsewhere are digit-only/numeric).
**Fix:** Do not interpolate free text into inline event-handler attributes at all. Either:
1. Store the value in a `data-*` attribute (correctly HTML-escaped by `esc()`, since it's read back via `.dataset`, never re-parsed as JS) and read it in a delegated/non-inline listener:
```js
if(ruaTxt)acao=`<button type="button" class="btn-as-predio" data-rua="${esc(clean(document.getElementById("rua").value))}">Buscar como Prédio</button>`;
```
with a listener (e.g. on `#results`, delegated) that does `document.getElementById('predio').value = btn.dataset.rua; forceMode('bd'); buscar();`
2. Or attach the listener programmatically right after `innerHTML` assignment instead of using an inline `onclick` string at all.

Note the *raw* (unescaped) rua value should be used for `#predio`'s actual value in either fix — `esc()` should only be applied when writing into HTML markup, never when the value crosses back into a JS string/DOM property.

## Warnings

### WR-01: `detectMode` does not actually support the documented `"128/5"` (bare quadra/lote, no Q/L words) input format

**File:** `radar-goiania.html:862-868` (function `detectMode`, rule 2)
**Issue:** The docstring (line 833) and `.planning/research/v2.1/SEARCH.md:127` both explicitly document the Quadra+Lote regex as "tolerante a `q128 lote 5`, `quadra 128 lt 5`, `q.128/5`, `128/5`" — i.e., a bare `"128/5"` with no `Q`/`QUADRA`/`L`/`LOTE` word at all should be recognized as quadra=128, lote=5. The shipped regex:
```js
const mQL=n.match(/\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b.*?\b(?:L(?:T|OTE)?)\.?\s*(\d+(?:\/\d+)?[A-Z]?)\b/)
       || n.match(/\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b/);
```
requires a literal `Q`/`QD`/`QUADRA` token to match at all. Verified: `detectMode("128/5", [])` returns `{mode:"bd", predio:"128/5", confidence:"media"}` (misclassified as a building-name guess), not the promised `{mode:"ql", quadra:"128", lote:"5"}`. Also, `detectMode("q128/5", [])` matches only the quadra-only alternative (`quadra:"128", lote:""`) — the lote is silently dropped because "/5" alone (without a following "L"/"LT"/"LOTE" token) isn't recognized by the lote capture group.
There is no test in `tests/detectmode.test.mjs` covering the bare-slash format, which is likely why this regression from the documented contract went unnoticed.
**Fix:** Add a third alternative (or extend the fallback) that recognizes a bare `digits[A-Z]?/digits[A-Z]?` token as quadra/lote when no other rule matched, e.g.:
```js
const mQL=n.match(/\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b.*?\b(?:L(?:T|OTE)?)\.?\s*(\d+(?:\/\d+)?[A-Z]?)\b/)
       || n.match(/\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b/)
       || n.match(/^(\d+[A-Z]?)\/(\d+[A-Z]?)$/); // bare "128/5", sem palavra Q/L
if(mQL){
  const isBareSlash = !/[QL]/.test(mQL[0].slice(0,1)) && mQL.length===3 && n===mQL[0];
  ...
}
```
(or simpler: add the bare-slash pattern as its own explicit branch before falling through to rule 6). Add a regression test case to `tests/detectmode.test.mjs` for `"128/5"` and `"q128/5"` to lock in the fix and prevent silent contract drift again.

### WR-02: `applyLastBairroIfNeeded` (called every debounce tick) has side effects — writes `localStorage` and mutates `#bairroInput` on every keystroke, not just on commit

**File:** `radar-goiania.html:2681-2692` (`applyLastBairroIfNeeded`), calling into `radar-goiania.html:1281-1288` (`pickBairro`)
**Issue:** `runDetect()` runs on a 150ms debounce as the user types (`radar-goiania.html:2714`). For any keystroke where `detectMode` decides `mode` is `ql`/`addr`/`bd` and no setor was found in the phrase, `applyLastBairroIfNeeded` calls `pickBairro(b.code)` unconditionally, which:
```js
function pickBairro(code){
  const b=COMBO.find(x=>x.code===code);if(!b)return;
  document.getElementById("bairro").value=code;
  try{localStorage.setItem("radar_lastbairro",code);}catch(e){}
  document.getElementById("bairroInput").value=b.disp;
  document.getElementById("bairroList").classList.remove("show");
  comboExpanded(false);
}
```
writes to `localStorage` and overwrites the hidden `#bairroInput` field on **every debounce tick** while the user is mid-typing, not only when a search is actually committed (Enter/Buscar). The value written is idempotent (same last-bairro code every time), so this is not a data-corruption bug, but it is an unexpected side effect inside what reads as a query/detection helper (`applyLastBairroIfNeeded` — "apply if needed", called from `runDetect`, a function whose only other job is to render UI state from a pure computation). It also means any manual edit to `#bairroInput`/`#bairro` (e.g., via the correction menu, mid fast-typing) can be silently clobbered by the next debounce tick before the user finishes.
**Fix:** Split concerns — compute the merged `{bairroCode,bairroDisp,label}` result for chip rendering without touching the DOM/localStorage on every tick, and only call `pickBairro()` at commit time (inside `applyDetectAndSearch`/`forceMode`/Enter-handler), mirroring how `fields.bairroCode` is already applied lazily in `applyDetectAndSearch` (`radar-goiania.html:2595`). E.g., have `applyLastBairroIfNeeded` return `{bairroCode,bairroDisp,label}` merged into `r` without calling `pickBairro`, and call `pickBairro(r.bairroCode)` only in `applyDetectAndSearch`/`forceMode` when the field isn't already synced.

### WR-03: No de-duplication guard on `identifyPoint()` when `parseGeoPaste` re-matches an unchanged coordinate across repeated debounce ticks

**File:** `radar-goiania.html:2701-2707` (`runDetect`, geo-paste branch)
**Issue:**
```js
const geo=parseGeoPaste(val);
if(geo){
  ...
  identifyPoint(geo.lat,geo.lng);
  return;
}
```
Every time `runDetect` fires (every keystroke after the 150ms debounce) while the input still parses to the *same* lat/lng (e.g., user pastes a Maps link, then types a trailing space, or the debounce fires twice in quick succession for any reason), `identifyPoint()` is called again unconditionally. Each call bumps `SEARCHTOKEN`, re-triggers the "identificando lote…" loading overlay, re-runs the full spatial query against the ArcGIS endpoint, and re-runs `finish()` (which calls `closeChooser()`, may re-toast, may switch mobile view) for input that produced an identical result moments earlier. Not exploitable/security-relevant, but it is redundant network traffic and repeated UI churn (spinner flicker, toast) for no behavioral change — a straightforward regression class once a user pauses mid-edit after a successful paste.
**Fix:** Track the last dispatched `{lat,lng}` (or raw geo-matched substring) in a module-level variable and short-circuit if unchanged:
```js
let lastGeoKey=null;
...
if(geo){
  const key=geo.lat.toFixed(5)+","+geo.lng.toFixed(5);
  if(key!==lastGeoKey){lastGeoKey=key;identifyPoint(geo.lat,geo.lng);}
  ...
  return;
}
lastGeoKey=null; // reset once input no longer parses as geo
```

## Info

### IN-01: `esc()` dual-purpose (HTML-attribute vs. inline-JS-string escaping) is a latent footgun beyond CR-01

**File:** `radar-goiania.html:717` (`esc` definition) and its call sites throughout the file
**Issue:** `esc()` is correctly designed for HTML markup/attribute contexts (encodes `& < > " '`). CR-01 shows that using its output inside an inline `onclick="...'${esc(x)}'..."` JS-string-literal position is unsafe whenever `x` is free text. The pre-existing call site `verNoMapa('${esc(ci)}')` (`radar-goiania.html:1711`, outside this phase's diff) has the same structural shape, though `ci` in practice is cadastral-ID text pulled from the ArcGIS feed (typically digits) rather than direct free-text user input, so its practical exploitability is much lower — but it is the same latent pattern and worth a follow-up sweep once CR-01 is fixed, to make sure no other `onclick="...'${esc(...)}'..."` site is reachable with attacker-influenced text.
**Fix:** Consider adding a second helper, e.g. `escJs()`/`jsStr()`, for values that must be safely embedded inside a JS string literal (contexts like inline `onclick` attributes), distinct from `esc()` for HTML markup — or better, migrate all remaining inline-`onclick`-with-interpolation call sites to `data-*` attributes + delegated listeners so `esc()` is only ever used in its one safe context (HTML markup/attributes read back as text/attributes, never re-parsed as script).

### IN-02: `initCaixa()` name collision with the "caixa única" (unified search box) feature is confusing but not a functional bug

**File:** `radar-goiania.html:2365` (`initCaixa`, pre-existing "Caixa" bank-listings layer) vs. `radar-goiania.html:2542` onward ("caixa única" search box, this phase)
**Issue:** `initCaixa()` and the `CAIXA`/`caixaLayer`/`caixaOn`/`btnCaixa`/`caixaN` identifiers refer to the pre-existing "Oportunidades Caixa" (Caixa Econômica bank-listing overlay) feature, entirely unrelated to this phase's "caixa única" (unified search box) feature, which introduces near-identically-named identifiers (`caixaInput`, `caixaList`, `caixaActive`, `caixaClear`, `caixaVoz`, `CNEFE` variable `cnefeLoading`, `loadCnefe`, etc.). No functional collision was found (no shared identifier is reused across the two features), but the naming overlap ("Caixa" the bank vs. "caixa" the search box) makes the codebase harder to grep/reason about — e.g. searching for `caixa` now returns two unrelated features interleaved.
**Fix:** No code change required for correctness. If convenient in a future pass, consider renaming this phase's DOM ids/JS identifiers to avoid the homonym (e.g. `searchBoxInput`/`unifiedInput` instead of `caixaInput`), though this is a naming/readability nit only, not a functional or security issue, and renaming now would be a needless diff churn risk this late in the phase.

---

_Reviewed: 2026-07-07T14:01:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
