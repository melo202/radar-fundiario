---
phase: 06-motion-no-app-todo
reviewed: 2026-07-05T00:49:50Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - radar-goiania.html
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-07-05T00:49:50Z
**Depth:** standard
**Files Reviewed:** 1 (radar-goiania.html — commits bdc6f3f, c18fcdf, 09456a1, 464f6c7, 70f232c, 4849029)
**Status:** issues_found (warnings + info only — no critical issues)

## Summary

Reviewed the full Phase 6 diff against `radar-goiania.html`: the inlined Motion v12.42.2 UMD build (provenance comment verified, no eval/new Function, script-src count unchanged at 3), the reduced-motion CSS kill-switch, the live `REDUCE` guard, the `mAnimate()`/`mStagger()` progressive-enhancement wrappers, `setView()` screen transitions, the `.detail` bottom-sheet spring coordinated with the `#grab` drag (including the edited `pointerup`/`touchend` handlers), the first-render-only stagger gates in `render()`/`refreshLots()`, and the CSS-only `:active` tap feedback.

Overall the implementation is careful and matches the plan/spec closely. All state changes (`dataset.view`, `classList.add/remove("show")`, `box.innerHTML=`, `poly.addTo`) are unconditional and outside the `mAnimate()` calls, exactly as required for progressive enhancement. `mAnimate`/`mStagger` never throw (try/catch, explicit typeof checks) and every call site correctly treats a `null` return as "nothing else to do." The `firstReveal`/`opts.stagger` gates are correctly scoped and cannot re-fire on pan/pagination. The `#grab` pointerup/touchend edit does let `closeDetail()` animate from the actual dragged position (the specific risk called out in the plan) rather than snapping back first — this works correctly because `SHEETDRAGY0` is nulled *before* `closeDetail()` is invoked on the dismiss branch, so `closeDetail()`'s own `SHEETDRAGY0==null` guard is satisfied and the close animation runs from `d.style.transform`'s live value.

Two warning-level issues are worth fixing (a same-tick edge case where `closeDetail()`/`showDetail()` can be invoked while a drag is still in-flight from a different input source, and a leftover-`transform` cleanup that races on rapid interruption) and three info-level observations (a redundant double-guard, a Portuguese comment-syntax typo introduced by a diff/encoding artifact worth double-checking in the source, and the desktop `.panel` exit path having no animation at all per the plan's own "keep instant" allowance — not a bug, just worth confirming is intentional).

## Warnings

### WR-01: `closeDetail()`/`showDetail()` skip cleanup entirely when invoked mid-drag from a different input path, potentially leaving a stale inline `transform`

**File:** `radar-goiania.html:2091-2106` (closeDetail), `radar-goiania.html:1568-1574` (showDetail), `radar-goiania.html:2152-2173` (#grab IIFE)
**Issue:** `closeDetail()` and `showDetail()` both gate their *entire* animation+cleanup block on `if(SHEETDRAGY0==null)`. This correctly defers to an in-progress `#grab` drag on the happy path (the drag's own `pointerup`/`pointercancel` handlers clear `SHEETDRAGY0` and reset `d.style.transform` themselves). However, `closeDetail()` is also reachable from non-drag paths that can fire while `SHEETDRAGY0!=null` — e.g. `buscar()` (line 1170, triggerable by pressing Enter in a search field) or the chooser flow (line 1497) — if the user is mid-drag on the sheet with one pointer while a keyboard Enter or a second input triggers a new search. In that case:
- `d.classList.remove("show")` still runs (correct — state change is unconditional).
- The animation/cleanup block is skipped entirely, so any inline `d.style.transform` set by the in-progress drag (e.g. `translateY(45px)`) is left on the element.
- The sheet is hidden by `display:none` at that moment, masking the issue, but the stale `transform` persists into the *next* `showDetail()` call. Since Motion's `animate()` is called with explicit absolute keyframes (`["translateY(100%)","translateY(0)"]`), the next legitimate open still resolves correctly — but if Motion is absent/REDUCE on that next open (mAnimate returns null, no keyframes applied), the sheet would render at whatever stale `translateY(N px)` was left over instead of `translateY(0)`, producing a visibly offset sheet with no way to self-correct until the next drag touches `transform` again.
**Fix:** In `closeDetail()`, always clear the leftover inline transform when Motion is not going to run the animation, even inside the `SHEETDRAGY0!=null` early-exit case — or simply reset `d.style.transform=""` unconditionally at the top of `closeDetail()`'s "not animating" fallback:
```js
function closeDetail(){
  const d=document.getElementById("detail");
  d.classList.remove("show");
  if(SHEETDRAGY0==null){
    // ...existing animate + finished cleanup...
  } else {
    // mid-drag from a different input path: don't fight the drag's own transform,
    // but the drag's pointerup/pointercancel will still reset it — no-op needed here,
    // OR explicitly defer the reset to next pointerup by leaving a flag if this proves reachable in practice.
  }
}
```
Simplest robust fix: in `showDetail()`'s mobile open branch, unconditionally reset `d.style.transform=""` *before* calling `mAnimate` (so a stale value from any prior interrupted path never leaks into a Motion-absent open):
```js
if(isMobile()){ d.style.transform=""; mAnimate(d,{transform:["translateY(100%)","translateY(0)"]},{type:"spring",stiffness:420,damping:38,mass:1}); }
```
This guarantees the degraded (Motion-absent/REDUCE) open path always starts clean regardless of what happened on the previous close.

### WR-02: `closeDetail()`'s `.finished.then()` cleanup can race a subsequent rapid re-open/re-close and clear `transform` at the wrong time

**File:** `radar-goiania.html:2103-2104`
**Issue:** `if(controls&&controls.finished)controls.finished.then(()=>{d.style.transform="";})...` schedules an async cleanup tied to *that specific* close animation's completion. If the user rapidly closes and reopens the sheet (tap card A → drag-dismiss → tap card B, all within the ~160ms close duration), the first close's `.finished` promise resolves *after* the second `showDetail()`'s open spring has already started (and possibly already settled at `translateY(0)`). When that stale promise resolves, it unconditionally sets `d.style.transform=""` on the *current* (now reopened) sheet. In this specific case the result is visually harmless because `translateY(0)` is exactly the open spring's end state — but it is a latent race: if any future change makes the open end-state anything other than `""`/`translateY(0)`, or if Motion's `.finished` resolution timing changes on interruption, this stale-promise write becomes an actual visual bug (a sheet snapping to the wrong position mid-reopen).
**Fix:** Guard the cleanup with a token/generation counter so a stale close's cleanup can't clobber a newer open:
```js
let sheetGen = 0;
function closeDetail(){
  const d=document.getElementById("detail");
  const myGen = ++sheetGen;
  d.classList.remove("show");
  if(SHEETDRAGY0==null){
    let controls=null;
    if(isMobile()){
      const from=d.style.transform||"translateY(0)";
      controls=mAnimate(d,{transform:[from,"translateY(100%)"]},{duration:0.16,easing:[0.4,0,1,1]});
    }else controls=mAnimate(d,{opacity:[1,0],transform:["translateY(0)","translateY(8px)"]},{duration:0.18,easing:[0.22,1,0.36,1]});
    const clear=()=>{ if(myGen===sheetGen) d.style.transform=""; };
    if(controls&&controls.finished)controls.finished.then(clear).catch(clear);
    else clear();
  }
}
```
(And bump `sheetGen` in `showDetail()` too, so a reopen invalidates any pending close cleanup.) Low real-world impact today given the coincidental end-state match, but worth closing off before any future tuning of the open/close keyframes.

## Info

### IN-01: `doStagger`/`firstReveal` gates redundantly re-check `REDUCE`/`window.Motion` inside `mAnimate`/`mStagger`

**File:** `radar-goiania.html:1397` (render), `radar-goiania.html:893` (refreshLots)
**Issue:** `doStagger=!!(opts&&opts.stagger)&&!REDUCE&&!!window.Motion` and `firstReveal&&!REDUCE&&window.Motion` both pre-check the same conditions that `mAnimate()`/`mStagger()` already check internally. Not a bug — just double-guarded — but worth noting since it's a minor maintenance burden (two places to keep in sync if the guard conditions ever change).
**Fix:** No functional change needed. Optionally simplify to `doStagger=!!(opts&&opts.stagger)` and rely entirely on `mAnimate`'s internal guard returning `null`, adjusting the `if(cards.length)` block to just always attempt the call (harmless since `mAnimate` no-ops safely). Purely stylistic; not required.

### IN-02: Desktop `.panel` overlay has no animated exit (only entrance) — confirm this matches intended scope, not an oversight

**File:** `radar-goiania.html:1145-1149` (setView)
**Issue:** `setView()`'s Motion call only fires for the *incoming* element (`v==="busca"` → `.panel`, or the mobile view swap). The desktop `.panel`'s hide (`data-view` transitioning away from `"busca"`) has no matching Motion exit call — it purely relies on the instant `display:none` CSS rule (`body[data-view="mapa"] .panel{display:none}`). This matches 06-02-PLAN.md's explicit allowance ("Exit can stay the instant display swap ... keep it subtle and non-blocking") so this is very likely intentional, not a bug. Flagging only so it's visible in review that the asymmetry (animated entrance, instant exit) is a deliberate simplification and not a missed call site.
**Fix:** None required if intentional (matches plan). If a symmetric fade-out is desired later, mirror the entrance call keyed on the outgoing element before the `dataset.view` swap fires (would require capturing the outgoing element *before* the CSS display rule flips it away, since `display:none` happening synchronously with the `dataset.view=v` write means there's no time window for a fade-out that shows anything — would need a `setTimeout`/animate-then-hide restructuring, non-trivial; likely not worth it for a "subtle" overlay).

### IN-03: `refreshLots()` and `render()` pass a live array reference (`newPolys.slice(0,12)` / `cards.slice(0,12)`) into `mAnimate`, which is fine, but the 12-item cap silently drops stagger for elements beyond index 11 with no upper-bound documentation at the call site itself

**File:** `radar-goiania.html:896-897`, `radar-goiania.html:1400-1402`
**Issue:** Purely a readability note: the `.slice(0,12)` cap is correct and matches spec (UI-SPEC Section 3, "cap at ~12 items"), and the comment on line 1403 (`cards.slice(12) ficam no estado natural`) documents the cards case, but the lots case (line 896-897) has no equivalent inline comment stating that polygons beyond index 11 render at full opacity immediately (it's implied by the surrounding comment at lines 894-895, so this is very minor).
**Fix:** None required — purely a comment-clarity nit, not a functional issue.

---

_Reviewed: 2026-07-05T00:49:50Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
