---
phase: 10-acao-whatsapp-captacao-salvos
reviewed: 2026-07-07T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/fixtures.mjs
  - tests/templates.test.mjs
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed waves 10-01..10-03 (RADAR_PURE zap*/capt* templates, `oportunidadeItem`/`histAdd` persistence
helpers, `oppSave`/`histSave`/`toggleOportunidade`/`renderSavedBlocks`/`#savedBlocks`, the WhatsApp
button group + `#captSheet` + `dadosFicha`/`copyTexto`) against `3f96864..HEAD`.

The pure-template layer (zap*/capt*/`oportunidadeItem`/`histAdd`) is solid: the honesty contract
(no invented faixa/assinatura placeholder) is enforced and covered by 16 new unit tests, the
`__scores` cache is race-safe (every writer re-checks `DCUR===a` against the same object reference
before mutating), the privacy allowlist is airtight end-to-end (only `oportunidadeItem()`'s 12
fields + app-generated `savedAt`/`visitedAt` ever reach `localStorage`, verified by a dedicated
negative test), and every string field re-entering the DOM in `renderSavedBlocks()` is passed
through `esc()`. The Escape key chain correctly adds `#captSheet` at the top of the single existing
`keydown` handler, ahead of `#wiz`/`#calc`/chooser, preserving precedence order.

The one critical finding is a boot-time crash risk: `oppLoad()`/`histLoad()` only guard against
*unparseable* JSON, not against JSON that parses successfully to a non-array (e.g. `{}`, `null`,
a bare string). Since `renderSavedBlocks()` runs unconditionally at top-level init (before map/search
setup), a single malformed `radar_oportunidades`/`radar_historico` value silently corrupts the whole
boot sequence with an uncaught `TypeError`.

Test suite: **47/47 passing** (`node --test "tests/*.test.mjs"`).

## Critical Issues

### CR-01: `oppLoad()`/`histLoad()` don't validate the parsed value is an array — non-array JSON crashes app boot

**File:** `radar-goiania.html:2481-2494` (also consumed at `radar-goiania.html:2570` `renderSavedBlocks`, called unconditionally at init `radar-goiania.html:3299`)
**Issue:**
```js
function oppLoad(){
  try{return JSON.parse(localStorage.getItem("radar_oportunidades")||"[]");}catch(e){return [];}
}
```
The `try/catch` only protects against `JSON.parse` *throwing* (malformed JSON syntax). It does
nothing if the stored value is syntactically valid JSON that is not an array — e.g. `"null"`,
`"{}"`, `"42"`, or `"\"oops\""` (all plausible outcomes of a future schema change, a botched manual
edit in devtools, a browser extension writing to the same key, or a half-written value from a
future bug). `JSON.parse` succeeds silently in all these cases and returns a non-array.

Every consumer immediately calls an array method on the result without checking:
- `oppTem()` (`radar-goiania.html:2495-2497`) → `oppLoad().some(...)`
- `renderSavedBlocks()` (`radar-goiania.html:2570-2574,2596`) → `opps.map(...)`, `histLoad()` then `.length`/`.slice(...).reverse().map(...)`
- `toggleOportunidade()` (`radar-goiania.html:2512-2531`) → `atual.filter(...)`
- `removerOportunidade()` (`radar-goiania.html:2634-2641`) → `oppLoad().filter(...)`

`renderSavedBlocks()` is invoked unconditionally as the very first statement after `setMode(MODE)`
at top-level init (`radar-goiania.html:3299`), **before** `initMap()`/`loadBairros()`/deep-link
handling. A `TypeError: opps.map is not a function` thrown there is uncaught (top-level script,
no surrounding try/catch), which aborts the rest of the init script — the map never initializes,
`?insc=` deep links never resolve, and the app is left in a broken state with only whatever HTML
was already in the document. This is a much larger blast radius than the "renderSavedBlocks fails
gracefully" intent documented in the code comments.

**Fix:** Normalize to an array at the load boundary, and keep the render/mutate paths defensive:
```js
function oppLoad(){
  try{
    const v=JSON.parse(localStorage.getItem("radar_oportunidades")||"[]");
    return Array.isArray(v)?v:[];
  }catch(e){return [];}
}
function histLoad(){
  try{
    const v=JSON.parse(localStorage.getItem("radar_historico")||"[]");
    return Array.isArray(v)?v:[];
  }catch(e){return [];}
}
```
This is a one-line change per function and requires no changes to any call site, since every
consumer already assumes an array shape.

## Warnings

### WR-01: Clipboard fallback (`copyTexto`) lacks iOS-safe textarea attributes and does not restore focus to the triggering button

**File:** `radar-goiania.html:2698-2715`
**Issue:**
```js
function copyTexto(texto,okMsg){
  const falhou=()=>toast("Não foi possível copiar — tente selecionar o texto manualmente.");
  const fallback=()=>{
    try{
      const ta=document.createElement("textarea");
      ta.value=texto;
      ta.style.position="fixed";ta.style.opacity="0";ta.style.top="0";ta.style.left="0";
      document.body.appendChild(ta);
      ta.focus();ta.select();
      const ok=document.execCommand("copy");
      document.body.removeChild(ta);
      if(ok)toast(okMsg);else falhou();
    }catch(e){falhou();}
  };
  ...
}
```
Two issues in the `execCommand` fallback path (only exercised on older/non-secure-context browsers
where `navigator.clipboard` is unavailable, or when the Promise rejects):

1. **iOS Safari selection quirk:** the textarea is not marked `readonly`, and `select()` on an
   editable, non-readonly textarea on iOS Safari opens the on-screen keyboard and can select only
   a substring (iOS caps `select()`/`setSelectionRange()` behavior on editable fields). The
   conventional workaround is `ta.setAttribute("readonly","")` plus
   `ta.setSelectionRange(0, texto.length)` before `execCommand("copy")`.
2. **Focus is not restored** after `document.body.removeChild(ta)` — focus silently falls back to
   `document.body`, so keyboard/screen-reader users lose their place after using the fallback path.
   Every other new focus-management path added in this phase (`abrirCaptacao`/`fecharCaptacao` via
   `CAPTRET`, matching the pre-existing `WIZRET` pattern) does restore focus; this is the one path
   that doesn't.

**Fix:**
```js
const fallback=()=>{
  const active=document.activeElement;
  try{
    const ta=document.createElement("textarea");
    ta.value=texto;
    ta.setAttribute("readonly","");
    ta.style.position="fixed";ta.style.opacity="0";ta.style.top="0";ta.style.left="0";
    document.body.appendChild(ta);
    ta.focus();ta.setSelectionRange(0,texto.length);
    const ok=document.execCommand("copy");
    document.body.removeChild(ta);
    if(active&&active.focus)try{active.focus();}catch(e){}
    if(ok)toast(okMsg);else falhou();
  }catch(e){falhou();}
};
```

### WR-02: `.savedblock-clear` ("Limpar" histórico button) is below the 44px touch-target convention used everywhere else in this phase

**File:** `radar-goiania.html:517`
**Issue:**
```css
.savedblock-clear{font:600 11px/1 "IBM Plex Sans";color:var(--muted);background:transparent;border:0;text-decoration:underline;min-height:32px;cursor:pointer}
```
Every other new interactive element in this phase enforces `min-height:44px` (`.zapbtn` line 507,
`.captcopy` line 400, `.saveditem` line 527, `.saveditem-rm` line 531). `.savedblock-clear` — the
"Limpar" button that clears the whole histórico — is the one exception at `min-height:32px`, and
it has no matching `min-width`. Given it triggers a destructive, non-undoable action
(`limparHistorico()` → `histSave([])`), a smaller/harder-to-hit target is the wrong direction to
be inconsistent in.
**Fix:** `min-height:44px;min-width:44px;padding:0 6px` (or wrap in a container that has the padding),
matching the other new touch targets in this phase.

## Info

### IN-01: `oppLoad()`/`histLoad()` non-array guard also affects `histAdd`'s pure cap logic if ever fed a corrupted list directly
**File:** `radar-goiania.html:2650-2662` (`histPush`), depends on `radar-goiania.html:2488-2490` (`histLoad`)
**Issue:** `histPush()` calls `histLoad()` then `lista.length`/`lista[lista.length-1]`/`histAdd(lista,...)`.
This is the same root cause as CR-01 (fixing `histLoad()` there fully covers this call site too) —
listed separately only because `histPush()` runs on *every* ficha open (`radar-goiania.html:2414`
`histPush(a)` inside `showDetail`), not just at boot, so the crash surface is larger than just init.
**Fix:** Covered by the CR-01 fix; no separate change needed once `histLoad()` validates `Array.isArray`.

### IN-02: `abrirOportunidade(el)` string-argument branch is unreachable dead code
**File:** `radar-goiania.html:2620-2628`
**Issue:**
```js
function abrirOportunidade(el){
  const insc=(typeof el==="string")?el:(el&&el.closest("[data-insc]")?el.closest("[data-insc]").dataset.insc:"");
  ...
}
```
Comment states this dual signature mirrors `verNoMapa()`'s existing pattern for future
"programmatic" callers, but no call site in this diff (or the rest of the file) ever invokes
`abrirOportunidade` with a string — both call sites (`radar-goiania.html:2581,2601`) pass `this`.
Not harmful, but it's speculative surface area with no current caller and no test coverage for
the string branch.
**Fix:** Either remove the string branch until a real caller exists, or add a one-line test/comment
pointing at the intended future caller so it's clear this isn't simply orphaned code.

### IN-03: No focus trap on `#captSheet` (Tab can escape the modal to background content)
**File:** `radar-goiania.html:794` (`#captSheet` markup, `role="dialog" aria-modal="true"`), `radar-goiania.html:2864-2884` (`abrirCaptacao`/`fecharCaptacao`)
**Issue:** `#captSheet` is marked as a modal dialog (`aria-modal="true"`) and correctly returns
focus on close via `CAPTRET` (mirroring the pre-existing `WIZRET` pattern for `#wiz`), and takes
top precedence in the Escape-key chain (`radar-goiania.html:3334-3335`). However there is no
`keydown` Tab-cycling handler scoped to the sheet, so keyboard users can Tab past the sheet's last
focusable element (`.captcopy` buttons) into background content that is still visually present
(underneath, at lower z-index) while `aria-modal="true"` claims otherwise. This is a pre-existing
gap in the app's pattern (confirmed: `#wiz` has the same gap), not a regression introduced by this
phase, so it's listed as Info rather than Warning.
**Fix:** Out of scope for this phase given the existing `#wiz` has the same gap; if/when a focus
trap is added, apply it uniformly to `#wiz`/`#captSheet`/`#chooser` rather than singling out the
new sheet.

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
