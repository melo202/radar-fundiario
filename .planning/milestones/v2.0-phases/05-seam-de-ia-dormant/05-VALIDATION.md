---
phase: 5
slug: seam-de-ia-dormant
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 5 — Validation Strategy

> Single-file HTML app, no JS test framework. This is a dormant, no-UI, no-network seam. Validation is **static grep** + a syntax check + the "delete-the-module, core still works" test. Fully proportional — nothing runs at runtime in v2.0.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — grep assertions on radar-goiania.html + JS syntax check |
| **Quick run command** | grep checks (AI_CONFIG, pesquisarMercadoIA, enabled:false, no active call-sites) |
| **Full suite command** | syntax check (`new Function`/node parse of the inline script) + confirm app still boots in preview with seam present |
| **Estimated runtime** | seconds |

---

## Sampling Rate

- **After each task commit:** grep assertions.
- **Before phase verification:** confirm `AI_CONFIG.enabled===false`, `pesquisarMercadoIA` returns null when disabled, zero active call-sites in the core, app boots clean in preview (seam is inert).

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Check | Status |
|---------|------|-------------|-----------|-----------------|--------|
| seam-config | 05-xx | IA-01 | grep | `AI_CONFIG` object exists with `enabled:false`; OpenAI-compatible fields; NO hardcoded key | ⬜ pending |
| seam-fn | 05-xx | IA-01 | grep/preview | `async function pesquisarMercadoIA` exists; returns null when disabled/error (fail-safe); receives only whitelisted input (never raw record → no dtnascimen) | ⬜ pending |
| seam-isolation | 05-xx | IA-01 | grep/preview | seam is a separate `<script>` block; ZERO active call-sites in core (grep `pesquisarMercadoIA(` shows only the definition, no invocation); no CDN/sw.js change; deleting the block leaves the app booting fine | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

*No test harness — validation is grep + syntax + isolation check. No Wave 0 stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App unaffected by seam presence | IA-01 | Confirm inertness | Boot app in preview with seam present → identical behavior, zero console errors, no network call to any AI endpoint |
| "Delete the module, core works" | IA-01 | Structural isolation | Conceptually/temporarily removing the seam `<script>` leaves all core functions intact (grep proves no core dependency) |

---

## Validation Sign-Off

- [ ] Grep: AI_CONFIG{enabled:false}, pesquisarMercadoIA async, fail-to-null, whitelisted input, ZERO active call-sites, no key, no CDN/sw change
- [ ] Syntax check passes; app boots clean in preview with seam present (inert)
- [ ] "Delete the module, core still works" holds (no core→seam dependency)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
