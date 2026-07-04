# Phase 2 — UI Review

**Audited:** 2026-07-04
**Baseline:** `.planning/phases/02-home-mapa/02-UI-SPEC.md` (approved design contract)
**Screenshots:** not captured — no dev server on 3000/5173/8080; this is a single-file static HTML app with no build/serve step, so audit is code-only against `radar-goiania.html`

**Scope note:** This audit covers ONLY the Phase 2 additions — `.searchpill`/`#searchPill`, `.coachmark`/`#coachMark`, the `@media(min-width:821px)` desktop rewrite, and the `data-view="mapa"` boot default. The legacy panel/search-form/detail-sheet CSS is out of scope except where Phase 2 code interacts with it (z-index stacking, shared tokens).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All locked copy strings match the contract verbatim |
| 2. Visuals | 3/4 | Correct hierarchy and stacking, but pill is missing its declared desktop `:hover` state |
| 3. Color | 4/4 | Zero new hex/rgb; accent scoped exactly to the 4 declared touchpoints |
| 4. Typography | 4/4 | Pill/coach font declarations match the contract's size/weight/line-height table exactly |
| 5. Spacing | 3/4 | Touch targets and paddings all correct, but coach-mark's `white-space:nowrap` + `max-width` combination risks the exact overflow the contract explicitly tests against |
| 6. Experience Design | 3/4 | Esc-to-close, focus-return, and desktop-close-on-result-found are all correctly wired; `aria-haspopup="dialog"` is static instead of mobile/desktop-conditional as the contract requires |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Coach-mark copy can overflow on narrow viewports** — `.coachmark{white-space:nowrap}` combined with `max-width:calc(100vw-32px)` (line 167-170) does not clip or shrink the text; on a 375px-wide viewport the ~46-character Portuguese string plus the 44px dismiss button leaves roughly 260px of usable width, likely more than the text needs at 13px — but this was not verified with an actual render, and the CSS has no `overflow:hidden`/`text-overflow` safety net if the string is ever edited longer. **Fix:** add `overflow:hidden;text-overflow:ellipsis` to `.coach-tx` (or the container) as a defensive measure, and visually confirm at 375px in a real browser — the contract calls this out explicitly as "a test constraint, not just guidance."

2. **Pill has no desktop `:hover` state** — the contract (Component Contracts §1, States table) declares `border-color:var(--accent-ink)` on hover; only `.searchpill:active{border-color:var(--accent)}` exists (line 166), no `.searchpill:hover` rule anywhere in the file. **User impact:** on desktop, mousing over the always-visible pill gives zero visual feedback that it's interactive until the click itself. **Fix:** add `.searchpill:hover{border-color:var(--accent-ink)}` scoped to non-touch (or just add it globally — mouse-only browsers will apply it, touch devices largely ignore `:hover`).

3. **`aria-haspopup="dialog"` is hardcoded, not conditional** — the contract (Component Contracts §1, Accessibility) is explicit: `aria-haspopup="dialog"` is only accurate for the desktop overlay variant; on mobile the pill triggers a `setView('busca')` view-swap, not a dialog, and the attribute should be omitted there. The markup at line 519 sets it unconditionally with no JS toggle based on `isMobile()`/breakpoint. **User impact:** mobile screen-reader users are told activating the pill "opens a dialog," which doesn't match the actual full-view transition that occurs. **Fix:** either remove `aria-haspopup` from the static markup and set it via JS only when `!isMobile()` (e.g., in `setView()` or on resize), or accept this as a known minor inaccuracy if runtime toggling is judged not worth the complexity for a single ARIA hint.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
All copy matches the locked contract exactly:
- Pill label: `"O que você procura?"` — line 520, matches spec verbatim.
- Pill `aria-label`: `"Abrir busca de imóvel"` — line 519, matches.
- Coach-mark copy: `"Toque num bairro pra explorar, ou use a busca."` — line 523, matches.
- Coach-mark dismiss `aria-label`: `"Dispensar dica"` — line 524, matches.
- No new empty/error/destructive copy introduced, consistent with contract's "not applicable this phase."

No generic labels ("Submit", "Click Here", "OK") introduced by this phase's markup.

### Pillar 2: Visuals (3/4)
- Clear focal point: pill floats top-center (mobile) / top-left (desktop), unambiguous primary affordance over the map — correct per contract.
- Icon-only elements have labels: `#searchPill` has `aria-label`; `.pill-ic` emoji is `aria-hidden="true"` (line 520), correctly deferring the accessible name to the button's own label — good practice.
- `.coach-x` has `aria-label="Dispensar dica"` (line 524) — compliant.
- Visual hierarchy between pill (primary, `--ink` border, pill-shaped, stronger shadow) and coach-mark (secondary, `--line` border, rectangular `2px` radius, flatter `--shadow` token) is implemented exactly as the contract's "intentional distinction" (lines 174-178) describes — pill reads as actionable, coach-mark reads as ambient/dismissible.
- Gap: declared desktop `:hover` state on the pill (border color shift) is absent — see Priority Fix #2. This is the only reason this pillar isn't a 4; the resting-state hierarchy and iconography are otherwise faithfully implemented.

### Pillar 3: Color (4/4)
- Zero new hex or `rgb()` values in the Phase 2 CSS blocks (lines 161-171, 427-438) — verified via direct grep against those line ranges.
- Box-shadow rgba values (`rgba(20,26,31,.18)` for the pill, `rgba(20,26,31,.22)` for the desktop overlay) match the contract's literal declared values exactly (pill shadow spec line 116 of UI-SPEC; overlay shadow explicitly required to reuse `.detail`'s value "verbatim," spec line 160) — both confirmed byte-for-byte.
- Accent (`--accent`) usage is scoped to exactly the 4 declared touchpoints: pill `:active` border (line 166), the global `:focus-visible` rule inherited automatically by all three new buttons (line 88), and no accent leakage into the coach-mark banner background or pill resting state (idle pill correctly uses `--ink`/`--paper-2`, not accent, per spec's explicit "accent stays scarce" instruction).
- `--paper-2`, `--ink`, `--line`, `--muted`, `--shadow` all reused verbatim, no redefinition.

### Pillar 4: Typography (4/4)
- Pill label: `font:600 15px/1.2 "IBM Plex Sans"` (line 164) — matches contract exactly (600 weight, 15px, 1.2 line-height).
- Pill icon: `font-size:16px;line-height:1` (line 165) — matches.
- Coach-mark text: `font:500 13px/1.4 "IBM Plex Sans"` (line 170) — matches exactly.
- Coach dismiss glyph: `font-size:18px` (line 171) — matches the declared 18px/400 (weight not explicitly set but inherits button default, effectively 400/normal, consistent with contract).
- No new font sizes or weights introduced beyond what the contract declares; both values (600/500) are pre-existing weights in the app's system.

### Pillar 5: Spacing (3/4)
- Pill: `min-height:44px`, `padding:12px 16px`, `gap:8px` (line 162-164) — matches the contract's declared 44px minimum, 12/16 padding, and `sm` (8px) icon-label gap exactly.
- Pill max-width: `calc(100vw - 32px)` (line 162) — matches the "never touches screen edges" requirement.
- Coach-mark: `padding:12px 16px` (line 169) — matches the contract's "between sm and md" density note.
- Coach dismiss: `width:44px;height:44px` (line 171) — meets the 44×44 touch-target floor exactly.
- Desktop overlay: `max-width:400px`, `max-height:calc(100vh - 48px)`, `top:24px;left:24px` (lines 432-434) — all match the contract's declared desktop values precisely.
- Pill desktop position: `top:24px;left:24px` (line 436) — matches the `lg` (24px) token from viewport top declared in the contract.
- Gap: coach-mark uses `white-space:nowrap` with no overflow safety net inside a `max-width`-constrained `inline-flex` container — this is a real risk of the box overflowing its intended bound on narrow viewports (see Priority Fix #1). Not confirmed broken via live render (no dev server available), but the CSS pattern itself is fragile against the contract's own explicit test constraint ("must not wrap to two lines on a 375px-wide mobile viewport... test constraint, not just guidance").

### Pillar 6: Experience Design (3/4)
State coverage, verified against contract requirements:
- **Esc-to-close (desktop overlay):** correctly implemented — `keydown` handler at line 1864-1871 checks `document.body.dataset.view==="busca"&&!isMobile()`, calls `setView("mapa")` and returns focus to `#searchPill` (line 1870). Matches contract's REQUIRED accessibility floor exactly.
- **Focus management on pill activation:** `onclick="setView('busca');focusFirstField();dismissCoach()"` (line 519) correctly calls the existing `focusFirstField()` (lines 890-894) after the view/overlay becomes visible, moving focus into the first visible field — matches contract's requirement precisely, and reuses the function for both mobile and desktop per contract's "same call site" instruction.
- **Desktop auto-close after search result:** `enquadra()` (line 842) calls `setView("mapa")` unconditionally (not gated by `isMobile()`), which correctly extends the mobile-only auto-close behavior to desktop as the contract requires (spec §3, last bullet) — this was a specific, easy-to-miss requirement and it is correctly implemented.
- **Coach-mark dismiss triggers:** explicit "×" click (line 524) and pill-open (line 519) both call `dismissCoach()`; `enquadra()` also calls it (line 842), covering the "first successful bairro/search interaction" path. A raw map-tap on an arbitrary lot (`onMapClick`, line 749) does not trigger dismiss — a minor, partial gap against the contract's "implement BOTH triggers" instruction, though the two primary documented paths are wired correctly.
- **Keyboard reachability:** both `#searchPill` and `.coach-x` are real `<button>` elements (not styled `<div>`s), inherit the global `button:focus-visible` rule automatically (line 88) — matches contract exactly, no custom focus-ring CSS needed or added.
- **`aria-haspopup` accuracy:** static/unconditional `aria-haspopup="dialog"` (line 519) does not match the contract's explicit mobile/desktop-conditional requirement — see Priority Fix #3. This is the main reason this pillar scores 3 rather than 4.
- **Boot-state consistency:** `document.body.dataset.view="mapa"` set at line 1844, `setView("mapa")` called again at line 1848 inside the `initMap()` chain — correctly flips the app to map-first boot. Minor cosmetic note (not scored down): `#vbBusca` still carries a static `class="on"` in markup (line 561), creating a theoretical single-frame flash of the wrong bottom-bar active state before the inline script executes; script is inline and unblocked so the window is negligible in practice.

---

## Files Audited
- `C:\Users\bruno\Documents\Projeto Radar Fundiário\radar-goiania.html` — lines 20-45 (`:root` tokens), 158-178 (pill/coach/detail CSS), 394-438 (mobile + desktop media queries), 442-563 (panel/mapwrap/viewbar markup), 598-1919 (script block: `setView`, `focusFirstField`, `dismissCoach`, `initCoach`, `enquadra`, boot sequence, Esc handler)
- `.planning/phases/02-home-mapa/02-UI-SPEC.md` (design contract)
- `.planning/phases/02-home-mapa/02-CONTEXT.md` (phase decisions)

No `components.json` present — registry safety audit not applicable, skipped per instructions.
