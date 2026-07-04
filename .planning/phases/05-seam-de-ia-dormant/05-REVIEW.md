---
phase: 05-seam-de-ia-dormant
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - radar-goiania.html
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 5: Code Review Report

**Reviewed:** 2026-07-04
**Depth:** standard (security-focused, targeted seam review)
**Files Reviewed:** 1 (radar-goiania.html, lines ~2098-2212 — the AI seam `<script>` block)
**Status:** clean

## Summary

Reviewed the Phase 5 dormant AI seam in `radar-goiania.html` (`<script>` block spanning lines 2100-2212, commit 85b89a7): `AI_CONFIG` object plus `async function pesquisarMercadoIA(contexto)`. This is the project's security-sensitive-by-design phase, intentionally shipped dormant with zero runtime attack surface in v2.0.

Verified against the plan's must-haves and the STRIDE threat register in `05-01-PLAN.md`, with direct grep/read verification rather than trusting the plan's own claims:

- **No secrets embedded.** `apiKey: null`, `endpoint: ""`. Grepped the whole file for `sk-` and `Bearer <token>`-style patterns — zero matches. The only mentions of "proxy"/"BYO-key" are in comments describing a future runtime path, not code that executes today.
- **PII/LGPD whitelist barrier is structurally sound.** `ALLOWED = ["bairro", "uso", "faixaPreco"]` (line 2142). The function reconstructs a brand-new object (`safe`) by iterating only over `ALLOWED` and copying `String(c[k])` for each key present in the input — it never spreads, clones, or forwards the raw `contexto` object itself. A raw cadastral record (with `dtnascimen`/`cpf`/`nmproprie`/etc., per the `SENS` denylist at line 639) passed into this function would have those fields silently dropped; there is no code path by which they reach `safe` or anything derived from it. This mirrors the core's `SENS`/`sanitiza` discipline (line 639-640) but implemented independently (whitelist vs. denylist), which is a stronger property, not a weaker echo of it.
- **Fail-safe confirmed.** `if (!AI_CONFIG.enabled) return null;` (line 2170) executes as an unconditional short-circuit before any network code, and the entire body is additionally wrapped in try/catch that resolves to `null` on any error (lines 2172-2205). No `throw` exists anywhere in the function. The one `fetch(...)` call in the file is entirely inside a `/* ... */` block comment (lines 2179-2199) — it is not merely unreachable dead code guarded by a runtime flag, it is literally not parsed as an expression by the JS engine at all.
- **Isolation confirmed.** The seam is a second, physically separate `<script>` block (own IIFE, `"use strict"`). Grep for `pesquisarMercadoIA(` across the entire file returns exactly one match — the function definition itself — confirming zero call-sites in the core (search/cadastro/laudo/mapa, lines 626-2098). Grep for `window.AI_CONFIG` / `window.pesquisarMercadoIA` returns zero matches (the only occurrence of `window.pesquisarMercadoIA` as a string is inside a comment noting its absence). No core variable (`LAST`, `sel`, `LZ`, `LOTINFO`, `esc`, `clean`, `SENS`) is read or written by the seam. `node --check` on the extracted seam block confirms it parses without a syntax error, consistent with the plan's Task 2 verification.
- **Dormancy confirmed.** `enabled: false` + `endpoint: ""` + the fetch sketch fully commented out means no network call is reachable in v2.0 under any input, including malicious/malformed `contexto` values (verified `contexto` handling degrades gracefully: non-object or `null` input becomes `{}` via line 2165, never throwing before the `enabled` check is reached).
- **No CDN, no `sw.js` changes.** `grep -c "<script src"` = 3 (Leaflet, proj4, caixa-goiania.js — unchanged). `git status --porcelain sw.js` returns clean (no pending changes to `sw.js` from this phase).

No Critical or Warning findings. One Info-level observation below, noted only because it's the single thing a reviewer might otherwise wonder about — it has no security or correctness impact given the code is provably unreachable in v2.0.

## Info

### IN-01: `safe` whitelisted object is only referenced inside the commented-out fetch sketch

**File:** `radar-goiania.html:2166-2199`
**Issue:** The `safe` object built by the whitelist barrier (line 2166-2167) is never read anywhere in live (non-commented) code — its only consumers (`safe.bairro`, `safe.uso`, `safe.faixaPreco`) appear inside the `/* ... */` block comment describing the future fetch adapter (lines 2190). In v2.0 this makes `safe` computed-but-unused work, which is harmless (no side effects, no leak — it's a local `const` inside an already-unreachable-by-`enabled`-check function) but would read as dead code to a static analyzer/linter once the seam is activated and the comment is uncommented.
**Fix:** No action needed for v2.0 — this is intentional scaffolding per the plan (`05-01-PLAN.md` Task 1, item 3: "esboço do adapter... pode ser ESCRITO como esboço mas fica INALCANÇÁVEL"). When the activation phase (IA-02) uncomments the fetch block, `safe` will naturally become live-referenced and this note resolves itself. Flagging only for completeness; no code change recommended at this time.

---

_Reviewed: 2026-07-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
