---
phase: 13-refino-visual-pinos-motion-descoberta
fixed_at: 2026-07-10T00:00:00Z
review_path: .planning/phases/13-refino-visual-pinos-motion-descoberta/13-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-07-10
**Source review:** .planning/phases/13-refino-visual-pinos-motion-descoberta/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 critical, 2 warning, 3 info)
- Fixed: 6
- Skipped: 1

**Context note:** The review dates from 2026-07-07; the codebase evolved substantially since
(Fases 14-18). Every finding was re-located in the CURRENT code before fixing — all line anchors had
moved. Test baseline before fixing: 238 passing. After: **239 passing, 0 failing** (one new pure-function
test added for CR-01). Each fix committed atomically; `npm test`/`node --test` verified green after each commit.

## Fixed Issues

### CR-01: Pin status color "semdado" for virtually every pin in real usage — `a.__scores` not populated before `plot()`

**Files modified:** `radar-goiania.html`, `tests/fixtures.mjs`, `tests/territorio.test.mjs`
**Commit:** 22abc68
**Status:** fixed: requires human verification (product/UX behavior — no automated map-render coverage)
**Applied fix (3 parts, ZERO new network requests, per orchestrator product decision):**
- **(a) Recolor on ficha:** `atualizarScores()` (after `compare()` resolves and writes the real
  `a.__scores`) now calls a new `recolorPinoCi(ci)` that re-styles that lot's pin on the map via
  `setStyle`, using the same source of truth as `plot()`/`pick()` (`bestStatusPorCi` over `LAST`).
  The selected pin keeps its orange selection highlight. Real colors are now reachable in the
  ficha-open flow.
- **(b) Leverage the setor-scan (Fase 15):** added a synchronous mirror `TERRSTAT` of the resolved
  `territorioScan` result (`TERRCACHE` holds a Promise, unreadable synchronously — it is now populated
  in the scan's `.then`). New pure function `scoresDePlot(lotes, scan)` (in `RADAR_PURE`) computes, for
  each plotted lot, `scoreOportunidade(pm2Lote(a), {q1/med/q3, n})` against the sector's own quantiles.
  `plot()` calls `aplicarScoresDePlot(list)` which fills `a.__scores` (only for `__scores===undefined`)
  when the sector was already scanned — pins gain real color with **no new request**. Never triggers a
  scan from `plot()`. Sample < 3 → `{}` (stays "semdado", honest).
- **(c) Honesty:** the "semdado" pin tooltip now appends the hint "· abra a ficha para avaliar"; no text
  promises color before data exists.
- **Tests:** new pure function `scoresDePlot` covered by TDD in `tests/territorio.test.mjs`
  (`scoresDePlotCasos` fixture): barato→bom, caro→risco, sem-pm2→null, sample<3→{}, null-inputs→{}.
  `statusDeUnidade` tests remain green.

### CR-02: `mostrarSkeleton()` leaves permanent skeleton placeholder on early-validation returns inside `buscar()`

**Files modified:** `radar-goiania.html`
**Commit:** e6b80a9
**Applied fix:** Snapshot `#results.innerHTML` into `prevResults` immediately BEFORE `mostrarSkeleton()`
(re-located to the current `buscar()` at ~line 4551). The `finally` block (now covering all early
returns without changing their behavior) restores `prevResults` when the skeleton is still orphaned.
Detection uses `box.querySelector(".skel-card")` (only present in `SKELETON_HTML`; any real render —
`finish()`/`catch` — rewrites the whole `innerHTML` and removes it) — more robust than raw `innerHTML`
string equality, which the browser can normalize on read. All seven early returns now clear the skeleton.

### WR-01: `.pino-legenda` stuck visible (stale) after a bairro-only search that bypasses `plot()`

**Files modified:** `radar-goiania.html`
**Commit:** 3e3a21e
**Applied fix:** At the top of `mostrarBairro()` (after the `!b||!map` guard) it now calls
`layerGroup.clearLayers()` and `atualizarLegenda(false)` — the sector outline is not "pins", so the
previous search's stale pins are cleared and the legend is hidden, no longer describing markers that are
out of focus in the new framing.

### WR-02: `verNoMapa()` flash-restore hardcodes the pre-Phase-13 style

**Files modified:** `radar-goiania.html`
**Commit:** 60a363b
**Applied fix:** The 1.3s flash restore no longer sets the fixed `{radius:8, fillColor:"#b5451f"}`.
It now recomputes the REAL status style from the same source of truth as `plot()`/`pick()`
(`bestStatusPorCi` over `LAST` for prédios, `statusPino(a)` otherwise → `PINO_STYLE[status]`). If the
lot is still selected (`idx===sel`), it keeps the orange selection highlight instead.

### IN-02: `onbLastFocus` captured via `document.activeElement` with no re-entrancy guard

**Files modified:** `radar-goiania.html`
**Commit:** 8685c6c
**Applied fix:** `onbAbrir(idx)` now captures `onbLastFocus` only when the overlay is not already open
(`if(!ov.classList.contains("show"))`), documenting and enforcing the "return focus to whatever opened
it" contract against future re-entrant calls.

### IN-01: Pin status hex values duplicated in three places with no shared source of truth

**Files modified:** `radar-goiania.html`
**Commit:** 129a813
**Applied fix (adapted to evolved code):** The review's recommended single-source approach was applied
to the 4 STATUS legend rows, which are the exact concern (the legend grew to 7 rows in Fases 15-16, but
the 3 extra rows — Caixa / Lote subutilizado / Caixa no território — deliberately alias `atencao`'s gold
and belong to separate layers outside `PINO_STYLE`). The 4 status `.pl-dot` elements gained
`data-status="bom|atencao|risco|semdado"`; `atualizarLegenda()` now paints their background from
`PINO_STYLE` (single source of truth). Idempotent and no visual change today (values already matched);
a future `PINO_STYLE` hex change now propagates to the legend automatically. The Caixa/detector rows stay
static intentionally (documented in the HTML comment).

## Skipped Issues

### IN-03: No focus trap in `.onb` (Tab can leave the modal to background content)

**File:** `radar-goiania.html` (onboarding markup + keydown block)
**Reason:** skipped — reviewer explicitly scoped this out. The review states this "is not a regression
introduced by this phase" (it "matches the pre-existing pattern of every other modal-like sheet in this
codebase — `.wiz`, `.calc`, `#captSheet`, `#negSheet`, `#cmpSheet` — none of them trap focus either") and
that a fix is "optional, larger scope than Phase 13; out of scope to fix only for `.onb` without addressing
the other five modal surfaces consistently." Adding a piecemeal trap to `.onb` alone would introduce
inconsistency; this belongs to a dedicated accessibility pass covering all six modal surfaces with a
shared focus-trap utility. Confirmed still valid in the current code (no Tab handler in the onboarding
block), but deliberately deferred per the reviewer's own guidance.
**Original issue:** The onboarding overlay is `role="dialog" aria-modal="true"` and moves/restores focus
correctly, but has no Tab-key focus trap, so keyboard users can Tab into visually-hidden background content.

---

_Fixed: 2026-07-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
