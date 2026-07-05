---
phase: 6
slug: motion-no-app-todo
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 6 — Validation Strategy

> Single-file HTML app, no JS test framework. Validation is **browser-preview-based** + **static grep**. Motion is progressive enhancement — validated live: animations run, reduced-motion disables them, nothing blocks the core.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — browser preview (`preview_*`, incl. `preview_resize` colorScheme/reduced-motion emulation) + grep |
| **Quick run command** | grep on radar-goiania.html (Motion inline present, prefers-reduced-motion block, REDUCE guard) |
| **Full suite command** | manual preview: screen transitions, sheet spring, stagger, tap feedback; toggle reduced-motion → instant; confirm app works if Motion absent |
| **Estimated runtime** | seconds (grep) + short live preview pass |

---

## Sampling Rate

- **After each task commit:** grep assertions.
- **Before phase verification:** preview — trigger each animated path; emulate prefers-reduced-motion:reduce and confirm motion is disabled (instant state); confirm zero console errors and no interaction blocking.

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated / Observable Check | Status |
|---------|------|-------------|-----------|------------------------------|--------|
| motion-inline | 06-xx | MOT-01 | grep | Motion (motion.dev) UMD embedded inline (with provenance comment); NO new `<script src>` (count stays 3); NO CSP/sw.js change | ⬜ pending |
| reduced-motion | 06-xx | MOT-01 | grep/preview | global `@media (prefers-reduced-motion: reduce)` + JS `REDUCE` guard present from first motion commit; emulating reduce → animations off (instant) | ⬜ pending |
| screen-trans | 06-xx | MOT-02 | preview | home⇄busca⇄detalhe animate (fade/slide ~150-250ms), interruptible (new setView cancels running anim) | ⬜ pending |
| sheet-spring | 06-xx | MOT-02 | preview | .detail opens/closes with translateY spring; drag handle still works; not blocking | ⬜ pending |
| stagger | 06-xx | MOT-03 | preview | result cards + lot polygons stagger-in on FIRST render only (not on every pan/refresh) | ⬜ pending |
| tap-feedback | 06-xx | MOT-02 | preview/grep | :active micro-scale/darken on buttons/cards | ⬜ pending |
| progressive-enh | 06-xx | MOT-01/02 | preview | if Motion is absent/fails, app still works (state changes happen, just instant) — no dependency/throw | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

*No test harness — validation is preview + grep. No Wave 0 stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Screen transitions feel smooth | MOT-02 | Visual/timing | Preview: switch views, observe fade/slide, confirm snappy |
| Sheet spring | MOT-02 | Visual | Open/close .detail; confirm spring slide-up, drag still works |
| Stagger on first render only | MOT-03 | Visual | Search → cards stagger; pan map → NO re-stagger |
| reduced-motion disables all | MOT-01 | Emulation | preview_resize colorScheme/reduced-motion → confirm instant, no transforms |
| Interruptible / non-blocking | MOT-02 | Interaction | Trigger a transition then immediately act — must not wait out the animation |
| Progressive enhancement | MOT-01 | Robustness | App boots + core works even if Motion fails to init |

---

## Validation Sign-Off

- [ ] Grep: Motion inline present (no new CDN, script src count 3, no CSP/sw change), prefers-reduced-motion block + REDUCE guard present
- [ ] Preview: screen transitions, sheet spring, stagger (first-render only), tap feedback all run; ~150-250ms; interruptible
- [ ] reduced-motion emulation disables animations (instant state)
- [ ] App works with Motion absent (progressive enhancement); zero console errors; no interaction blocking
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
