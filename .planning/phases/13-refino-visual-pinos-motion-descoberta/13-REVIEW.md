---
phase: 13-refino-visual-pinos-motion-descoberta
reviewed: 2026-07-07T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/fixtures.mjs
  - tests/scores.test.mjs
findings:
  critical: 2
  warning: 2
  info: 3
  total: 7
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 3 (`radar-goiania.html`, `tests/fixtures.mjs`, `tests/scores.test.mjs`)
**Status:** issues_found

## Summary

Reviewed the diff `1894dd9..HEAD` (waves 13-01/02/03: status CSS vars + 10-selector refino,
`statusDeUnidade`, semantic pins + legend + tooltip, motion messages + skeleton, onboarding +
"O que o Radar faz"). Tests: **107/107 passing** (verified by running `node --test "tests/*.test.mjs"`),
including the 2 new `statusDeUnidade` tests. The 10-selector CSS refino claim and the "zero new hex"
claim both check out — every literal hex introduced in `:root` is a pre-existing value from another
selector, documented accurately in code comments.

However, two critical, high-impact bugs were found, both stemming from the same class of problem
(state assumed present that isn't, on a given code path):

1. **The pin color-coding feature (PIN-01, the core deliverable of wave 13-02) never actually shows
   color in the primary flow** — `a.__scores` (which `statusPino()` depends on) is not populated
   until a unit's ficha is opened and, even then, is `null` until `compare()`'s network round-trip
   resolves. At `plot()` time (called right after every search), essentially every pin renders
   `"semdado"` (gray), regardless of real opportunity level.
2. **`mostrarSkeleton()` (wave 13-02) is called unconditionally before the `try` block of `buscar()`**,
   but several legitimate early-validation returns inside that same `try` block never reach `finish()`
   or the `catch` block, leaving the skeleton shimmer stuck in `#results` permanently. The same root
   cause (an early `return` that bypasses `plot()`/`finish()`) also leaves `.pino-legenda` stuck visible
   with stale/empty state after a bairro-only search.

See Critical/Warning sections below for details, evidence, and fixes.

## Critical Issues

### CR-01: Pin status color is "semdado" (gray) for virtually every pin in real usage — `a.__scores` not populated before `plot()`

**File:** `radar-goiania.html:3161-3169` (`statusPino`/`PINO_STYLE`), consumed at `radar-goiania.html:3200-3209` (`plot()`) and `radar-goiania.html:3290-3296` (`pick()`)

**Issue:**
`statusPino(a)` reads `a.__scores` (`radar-goiania.html:3162`):
```js
function statusPino(a){
  return statusDeUnidade(a.__scores);
}
```
`a.__scores` is set in exactly two places:
- `showDetail()` at `radar-goiania.html:3395` — always as `{op: scoreOportunidade(myPm2, null, {}), conf}`. Since `stats` is passed as `null`, `scoreOportunidade` returns `null` unconditionally (`radar-goiania.html:1324`: `if(!stats || !(stats.n>=3) || ...) return null;`). So `op` is always `null` here.
- `atualizarScores()` at `radar-goiania.html:3354` — this is the only call site that can produce a *real* (non-null) `op`, but it only runs after `compare()`'s async network round-trip resolves, and only for the single unit whose ficha is currently open (`DCUR`).

`plot()` is called from `finish()` (`radar-goiania.html:2769`) immediately after `render(units,...)`, i.e. **before any unit has ever had `showDetail()`/`compare()` run on it**. At that point every `a.__scores` in the freshly-fetched `units`/`LAST` array is `undefined` (fresh API objects, never touched). `statusDeUnidade(undefined)` hits `typeof score!=="number"` and returns `"semdado"` (`radar-goiania.html:254`). Therefore `bestStatusPorCi(list)` (`radar-goiania.html:3182-3189`) resolves every CI to `"semdado"`, and every pin plotted gets `PINO_STYLE.semdado` (gray, radius 7) — never `bom`/`atencao`/`risco` — regardless of the unit's actual value/venal data (which IS available and would let `scoreOportunidade` compute a partial score if it were invoked with real inputs instead of `null` stats).

The same applies to `pick()`'s deselect-restore logic (`radar-goiania.html:3290-3296`), which also reads `statusPino(unit)`/`bestStatusPorCi(LAST||[])` — same `__scores` gap.

Net effect: the legend (`bom`/`atencao`/`risco`/`caixa` rows) and the tooltip's status label are functionally dead for the primary "search → see pins on map" flow that PIN-01 was built for. Only after opening a ficha and waiting for `compare()` to resolve does that *one* unit's *future* re-plots reflect a real color — but nothing re-plots after `atualizarScores()` runs (no `plot()`/`pick()`-style re-render is triggered from `atualizarScores()`), so even that has no visible effect on the map.

**Fix:** Decide the intended source of a "pin-time" score and compute it before `plot()`:
```js
// Option A — cheapest fix: give plot() a score with stats=null but real myPm2,
// so scoreOportunidade at least has a chance (still returns null without stats,
// so this alone does not fix it — scoreOportunidade requires stats.n>=3).
// Option B (recommended): compute a lightweight per-unit score against a
// bairro-level or citywide reference stat available synchronously (no network),
// and cache it as a.__scores BEFORE plot() runs, e.g. inside finish():
units.forEach(a=>{
  if(a.__scores===undefined){
    const isU=!!unitLabel(a)||(a.cdedificio||0)>0;
    const myPm2=isU?m2Edif(a):m2Terr(a);
    a.__scores={op:scoreOportunidade(myPm2, BAIRRO_STATS[a.cdbairro]||null, {}), conf:null};
  }
});
render(units,{stagger:true});
loading(true,MOTION_MSG.mapa);
plot(units);
```
If no synchronous/no-network reference is available, the honest fix is to make `statusPino` reflect
"not yet evaluated" as a *deliberately* separate visual state from "evaluated and below median" — which
is what it does today, but then the legend/tooltip copy and QA sign-off need to acknowledge that
`bom`/`atencao`/`risco` are effectively unreachable in the pin layer as shipped, which contradicts the
wave's stated goal ("pinos semânticos por status"). This needs a product decision, not just a code fix.

---

### CR-02: `mostrarSkeleton()` leaves permanent skeleton placeholder in `#results` on every early-validation return inside `buscar()`

**File:** `radar-goiania.html:2600-2603` (skeleton injected unconditionally), with unreached exits at `radar-goiania.html:2608, 2619, 2620, 2624, 2661, 2675, 2679`

**Issue:**
```js
async function buscar(){
  const btn=document.getElementById("btnGo");
  if(btn.disabled)return;
  const tk=++SEARCHTOKEN;
  btn.disabled=true;closeDetail();
  loading(true,MOTION_MSG.localizando);
  mostrarSkeleton();               // <-- writes #results BEFORE any validation
  try{
    ...
    if(!ci){toast("Digite a inscrição cadastral.");return;}      // line 2608
    ...
    if(!okB||!b){toast("Escolha o setor na lista (digite e clique).");return;}   // line 2619
    if(!rua){toast("Digite a rua/avenida.");return;}                            // line 2620
    if(!rCore&&!rD){toast(...);return;}                                          // line 2624
    ...
    if(!toks.length||toks.join("").length<3){toast(...);return;}                 // line 2661
    ...
    if(!okB||!b){toast(...);return;}                                             // line 2675
    if(!q&&!l){
      if(await mostrarBairro(b))return;                                          // line 2678
      toast("Digite ao menos a quadra.");return;                                 // line 2679
    }
    ...
  }catch(e){ ... document.getElementById("results").innerHTML = ... }
  finally{ if(tk===SEARCHTOKEN){loading(false);btn.disabled=false;} }
}
```
Every `return` listed above exits the `try` block directly (not via `throw`), so the `catch` block
(which is the only other place besides `finish()` that rewrites `#results`) never runs. `finally` only
toggles the loading overlay/spinner and re-enables the button — it does **not** touch `#results`. Since
`mostrarSkeleton()` already overwrote `#results` with 3 shimmering skeleton cards before any of these
validations ran, all seven of these early-return paths leave the skeleton **permanently stuck** in
`#results` (previously, before this wave, `#results` simply kept whatever it had before the failed
attempt — e.g. the prior result list or the initial empty state).

Reproduction: open the app fresh (empty `#results`), switch to "Quadra/Lote" mode, pick a bairro, leave
quadra/lote blank, click Buscar → `mostrarBairro(b)` resolves `true` → `buscar()` returns → `#results`
shows 3 gray shimmering skeleton cards forever, with no loading spinner (already turned off by
`finally`) and no way to distinguish this from a hung request.

**Fix:** Move `mostrarSkeleton()` past the mode-specific validation gates (call it immediately before
each `loading(true, MOTION_MSG.cadastro)` inside each branch, mirroring how the message itself is
already scoped per-branch), or add a shared `finally`-safe reset:
```js
}finally{
  if(tk===SEARCHTOKEN){
    loading(false);btn.disabled=false;
    // restore #results if it's still showing the skeleton nobody replaced
    const box=document.getElementById("results");
    if(box && box.innerHTML===SKELETON_HTML) box.innerHTML = /* previous content or empty state */ "";
  }
}
```
The simplest robust fix is to snapshot `#results.innerHTML` before calling `mostrarSkeleton()` and
restore it in `finally` whenever `tk===SEARCHTOKEN` and no other code path already overwrote `#results`.

---

## Warnings

### WR-01: `.pino-legenda` stuck visible (stale) after a bairro-only search that bypasses `plot()`

**File:** `radar-goiania.html:2678` (`mostrarBairro` early return in `buscar()`), `radar-goiania.html:3190-3192` (`atualizarLegenda`), `radar-goiania.html:2465-2504` (`mostrarBairro`)

**Issue:** `atualizarLegenda(temPinos)` is only ever called from the tail of `plot()` (`radar-goiania.html:3227`). `mostrarBairro()` (called at `radar-goiania.html:2678` when the user searches "Quadra/Lote" with only a bairro selected) draws a dashed outline polygon via `bairroOutline` but never calls `plot()`, `layerGroup.clearLayers()`, or `atualizarLegenda(false)`. Sequence: (1) user does any search that plots pins → legend appears (`hidden` removed); (2) user switches to "Quadra/Lote" mode, picks only a bairro, searches → `mostrarBairro` draws the outline and returns `true`, `buscar()` returns early (same early-return path as CR-02) — the *previous* search's pins are still in `layerGroup` (never cleared) and the legend is still showing, now describing pins that may be far off-screen/irrelevant to the newly-focused bairro view. This is a stale-state bug, not a crash, but it actively misleads the user (legend claims to describe "pinos no mapa" that aren't the ones currently emphasized).

**Fix:** Call `atualizarLegenda(false)` (and optionally `layerGroup.clearLayers()`) at the top of `mostrarBairro()`, or centralize legend visibility on a single "what does the map currently show" state transition rather than only at the end of `plot()`:
```js
async function mostrarBairro(code){
  const b=COMBO.find(x=>String(x.code)===String(code));
  if(!b||!map)return false;
  atualizarLegenda(false); // outline de bairro não é "pinos" — legenda não se aplica aqui
  ...
```

---

### WR-02: `verNoMapa()` flash-restore hardcodes the pre-Phase-13 style, producing a visibly wrong pin after use

**File:** `radar-goiania.html:3251-3254`

**Issue:**
```js
const go=()=>{map.setView(ll,18);
  const mk=markers[LAST.indexOf(a)];
  if(mk){mk.setStyle({radius:13,fillColor:"#c9691f"});
    setTimeout(()=>{try{mk.setStyle({radius:8,fillColor:"#b5451f"});}catch(e){}},1300);}};
```
After the 1.3s flash-highlight (orange, radius 13), the pin is restored to a **hardcoded** `radius:8,fillColor:"#b5451f"` — the old universal pin style from before wave 13-02 — instead of the pin's real status style (`PINO_STYLE[status]`, via `statusPino`/`bestStatusPorCi`, the same source of truth `plot()`/`pick()` use). This was already self-identified and logged in `deferred-items.md` as out of scope for the 13-02 plan, but it is a real, user-visible regression: clicking "no mapa ↗" on a building header leaves that pin permanently styled as `risco`-red/radius-8 (or, combined with CR-01, a visually-inconsistent size/color relative to whatever the rest of the pins are currently showing) until the next `plot()`/`pick()` call recomputes it.

**Fix:** Reuse the same lookup `plot()`/`pick()` use:
```js
setTimeout(()=>{try{
  const status=statusPino(a); // or bestStatusPorCi for the prédio case, matching plot()'s logic
  const style=PINO_STYLE[status];
  mk.setStyle({radius:style.radius,fillColor:style.fillColor});
}catch(e){}},1300);
```

---

## Info

### IN-01: Pin status hex values duplicated in three places with no shared source of truth

**File:** `radar-goiania.html:54-61` (`:root` `--status-*` vars), `radar-goiania.html:3165-3169` (`PINO_STYLE`), `radar-goiania.html:932-937` (static legend HTML)

**Issue:** The same 5 hex values (`#2c5545`, `#a8842c`, `#b5451f`, `#57503f`, plus the reused-gold Caixa row) are hand-copied into the CSS custom properties, the `PINO_STYLE` JS object (which the code comments correctly justify as necessary since Leaflet doesn't read CSS vars), and the static `#pinoLegenda` HTML markup (`style="background:#2c5545"` inline, etc.). All three currently agree, but nothing enforces that agreement — a future edit to one (e.g. bumping `--lot` for contrast) will silently desync the legend/pin colors from the CSS system.

**Fix:** Not urgent, but consider generating the legend's inline `style` attributes from `PINO_STYLE` at `atualizarLegenda()`/init time instead of hardcoding them in HTML, so there is exactly one JS source of truth (`PINO_STYLE`) plus the CSS vars (already documented as intentionally-duplicated aliases).

### IN-02: `onbLastFocus` captured via `document.activeElement` with no re-entrancy guard

**File:** `radar-goiania.html:4793-4795`

**Issue:** `onbAbrir(idx)` unconditionally does `onbLastFocus=document.activeElement;`. If `onbAbrir` were ever called while the overlay is already open (currently not reachable through the UI, since the only trigger — the "O que o Radar faz" button — sits behind the full-screen onboarding overlay and cannot be clicked while it's open), `onbLastFocus` would be overwritten with `.onb-skip` (the element `onbAbrir` itself just focused), breaking the "return focus to whatever opened it" contract on close. Not currently reachable, but there's no defensive guard (e.g. early-return if `ov.classList.contains("show")`) documenting that assumption in code.

**Fix (optional hardening):**
```js
function onbAbrir(idx){
  const ov=document.getElementById("onbOverlay");
  if(!ov.classList.contains("show")) onbLastFocus=document.activeElement;
  onbIdx=idx||0;
  ...
```

### IN-03: No focus trap in `.onb` (Tab can leave the modal to background content)

**File:** `radar-goiania.html:991-1001` (markup), no corresponding `keydown`/Tab handler in the onboarding JS block (`radar-goiania.html:4777-4817`)

**Issue:** The onboarding overlay is `role="dialog" aria-modal="true"`, correctly signals intent to assistive tech, and correctly moves initial focus to `.onb-skip` on open (`radar-goiania.html:4802`) and restores focus on close. However there is no Tab-key focus trap, so keyboard users can Tab past `.onb-next`/`.onb-skip` into background content that is only *visually* hidden (covered by the full-screen overlay) but not `aria-hidden`/`inert`. This matches the pre-existing pattern of every other modal-like sheet in this codebase (`.wiz`, `.calc`, `#captSheet`, `#negSheet`, `#cmpSheet` — none of them trap focus either), so it is not a regression introduced by this phase, just a gap this phase's new modal inherits.

**Fix (optional, larger scope than Phase 13):** Add a shared focus-trap utility if/when accessibility hardening is prioritized; out of scope to fix only for `.onb` without addressing the other five modal surfaces consistently.

---

## Verification Performed

- Ran `node --test "tests/*.test.mjs"` — **107/107 passing** (105 pre-existing + 2 new `statusDeUnidade` tests), zero failures, zero regressions.
- Diffed hex literals introduced in `:root` against pre-existing values in the same file — confirmed all 7 (`#2c5545,#3f7a63,#57503f,#7d621f,#8f3116,#a8842c,#b5451f`) already existed as either a `var()` alias target or (for `#7d621f`) the documented literal reuse from `.score-op.media .score-num`. No undocumented new hex found.
- Confirmed exactly the 10 CSS selectors claimed by the 13-01 commit message were touched for spacing (`.bldg-head`, `.bldg-sumario`, `.card`, `.card .vals`, `.foot`, `.detail`, `.dvalor`, `.dscores`, `.score`, `.dleitura`, `.maisopcoes .footbody.acts`) — no collateral/unrelated selectors changed in that commit; all other CSS additions in the phase (`.skel-*`, `.pino-legenda`/`.pl-dot`, `.onb*`, `.oqf-lista`) are net-new blocks for the new features, not modifications disguised as the "10 selectors."
- Traced the Esc-key handler chain (`radar-goiania.html:4854-4884`) — onboarding check is first, correctly mutually exclusive with `#cmpSheet`/`#negSheet`/`#captSheet` (all `.wiz`, z-index 2000, full-viewport `position:fixed;inset:0`) which visually and interactively occlude the onboarding's only trigger button, so real concurrent-open re-entrancy is not reachable through the UI today.
- Traced `a.__scores` population sites end-to-end (`showDetail`, `atualizarScores`, `scoreOportunidade`) against `statusPino`'s read site — root-caused CR-01.
- Traced every early-`return` inside `buscar()`'s `try` block against `#results` write sites — root-caused CR-02 and WR-01.

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
