---
phase: 05-seam-de-ia-dormant
plan: 01
subsystem: infra
tags: [ai-seam, openrouter, glm-4.5-air, dormant-code, whitelist, fail-safe]

# Dependency graph
requires: []
provides:
  - "AI_CONFIG {enabled:false} object in a physically separate <script> block at the end of <body>"
  - "async pesquisarMercadoIA(contexto) — whitelist-first input barrier ({bairro, uso, faixaPreco} only), fail-to-null on disabled/error"
  - "Documented future activation path (proxy Worker or BYO-key), zero key embedded"
affects: [seam-de-ia-ativacao (IA-02, v2.1+), motion-no-app-todo (Fase 6, unrelated but shares file)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Physically separate <script> block for optional/dormant subsystems — deletable as a unit, zero shared state with the core"
    - "Whitelist-first input barrier (allow-list of {bairro, uso, faixaPreco}) as structural anti-PII defense, mirroring the existing SENS denylist pattern (line ~639) but designed for pass-through to an external boundary rather than in-place deletion"
    - "Fail-to-null async boundary: disabled flag short-circuits before any network activity; try/catch guarantees the function never throws into the app"

key-files:
  created: []
  modified:
    - "radar-goiania.html — added a second <script> block (lines ~2100-2211) after the main script's </script> and before </body>"

key-decisions:
  - "Used the plan's exact required config shape (enabled:false, provider:openrouter, model:z-ai/glm-4.5-air:online, endpoint:\"\", apiKey:null, apiKeyMode:proxy, maxTokens:600, timeoutMs:15000) rather than ARCHITECTURE.md's illustrative sketch (which had provider/model as null) — PLAN.md's must_haves are load-bearing and take precedence over the research doc's illustrative example."
  - "Adjusted one in-block comment to avoid literally spelling 'pesquisarMercadoIA(' with a trailing paren outside the real definition, so grep -c \"pesquisarMercadoIA(\" resolves to exactly 1 (the plan's literal acceptance bar), while keeping the prose intent (comment now says 'chame a função abaixo' instead of repeating the call syntax)."
  - "Left the OpenAI-compatible fetch adapter as a commented-out sketch inside the function body (unreachable in v2.0 because of the enabled:false early return) rather than omitting it — satisfies the plan's 'esboço ESCRITO mas INALCANÇÁVEL, OU stub comentado' option while documenting the exact future request/response shape from AI-MODELS.md."

patterns-established:
  - "Dormant seam pattern: config object with a master 'enabled' boolean + single async entry point that whitelists its input and fails to null — reusable for any future opt-in integration that must stay structurally isolated from the deterministic core."

requirements-completed: [IA-01]

# Metrics
duration: 12min
completed: 2026-07-04
---

# Phase 5 Plan 1: Seam de IA (dormant) Summary

**Physically-isolated, disabled AI seam: `AI_CONFIG{enabled:false}` + `async pesquisarMercadoIA(contexto)` in a second `<script>` block, whitelist-only input, fail-to-null, zero call-sites, zero embedded key.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-04T22:54:00Z
- **Completed:** 2026-07-04T23:06:36Z
- **Tasks:** 2
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments
- Added a new, physically separate `<script>` block (97 lines, lines 2115–2211) between the main script's `</script>` (line 2098) and `</body>` — clearly commented as the dormant AI seam, with explicit activation instructions for the future (IA-02).
- `AI_CONFIG` ships with `enabled:false`, default model `z-ai/glm-4.5-air:online` (OpenRouter, `:online` grounding), `endpoint:""`, `apiKey:null`, `apiKeyMode:"proxy"` — no secret of any kind in the public HTML.
- `async pesquisarMercadoIA(contexto)` rebuilds a brand-new object from only the whitelisted keys `["bairro","uso","faixaPreco"]` before doing anything else — structurally impossible for it to forward `dtnascimen`/CPF/nome even if a raw cadastral record were passed by mistake. Mirrors the existing `SENS` denylist discipline (line 639) but as an allow-list at a trust boundary.
- Fail-to-null: `if (!AI_CONFIG.enabled) return null;` short-circuits before any network activity; the whole body is wrapped in try/catch so any future error (network, timeout, malformed JSON) also resolves to `null` — the function can never throw into the app.
- Proved isolation: zero call-sites in the core (grep across lines 1–2098 = 0 matches for `AI_CONFIG`/`pesquisarMercadoIA`), and the full-file `pesquisarMercadoIA(` grep resolves to exactly 1 (the definition).
- Proved deletability mechanically: on a scratchpad copy, removed the entire seam block (HTML comment + `<script>...</script>`) and confirmed (a) zero `AI_CONFIG`/`pesquisarMercadoIA` references remain, (b) the remaining core script is byte-for-byte identical to the pre-seam core and still parses cleanly via `node --check`, (c) the file structure collapses back to the original `</script></body></html>` sequence exactly as before Task 1.

## Task Commits

1. **Task 1: Inserir o script dormant do seam (AI_CONFIG + pesquisarMercadoIA)** - `85b89a7` (feat)
2. **Task 2: Verificar isolamento — zero call-sites, deletável, boot limpo, sw.js intacto** - no code change (verification-only task; see evidence below). No commit created since no files were modified.

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `radar-goiania.html` - Added a new `<script>` block (AI_CONFIG + pesquisarMercadoIA) physically after the main `</script>`, before `</body>`. No edits to the existing core script.

## Verification Evidence (exact grep counts)

Run against `radar-goiania.html` after Task 1:

| Check | Command | Result |
|---|---|---|
| Master switch present | `grep -n "enabled: *false"` | 2 matches: line 2124 (the real config field) + line 2175 (prose comment referencing it) |
| Single function definition | `grep -c "async function pesquisarMercadoIA"` | 1 |
| Default model present | `grep -c "z-ai/glm-4.5-air:online"` | 1 |
| Fail-safe returns present | `grep -c "return null"` | 6 (whitelist path unreachable-fetch-sketch removed leaves: enabled-check, catch block, and commented-sketch mentions) |
| No new CDN script tag | `grep -c "<script src"` | 3 (Leaflet, proj4, caixa-goiania.js — unchanged) |
| Whitelist barrier present | `grep -n "ALLOWED\s*="` | line 2142: `const ALLOWED = ["bairro", "uso", "faixaPreco"];` |
| Config object declared | `grep -n "const AI_CONFIG"` | line 2123 |
| No hardcoded key | `grep -n "sk-"` / `grep -n "Bearer \""` | 0 real matches (only a commented-out sketch line referencing the `AI_CONFIG.apiKey` *variable*, not a literal key string) |
| **Zero call-sites in core** | `sed -n '1,2098p' \| grep -c "pesquisarMercadoIA\|AI_CONFIG"` | **0** |
| **Total invocation count** | `grep -c "pesquisarMercadoIA("` (whole file) | **1** (definition only, confirmed by line-level grep: only line 2161, `async function pesquisarMercadoIA(contexto) {`) |

Task 2's exact automated verify command (from PLAN.md), re-run and passing:
```
test $(grep -c "pesquisarMercadoIA(" radar-goiania.html) -eq 1 && echo "OK 1-call-site"
test $(grep -c "<script src" radar-goiania.html) -eq 3 && echo "OK no-new-cdn"
git status --porcelain sw.js | grep -q . && echo "SW-CHANGED-FAIL" || echo "OK sw.js untouched"
```
Output: `OK 1-call-site`, `OK no-new-cdn`, `OK sw.js untouched` — all three passed.

## Syntax Check

Extracted the two real `<script>` blocks by exact line range (verified via `grep -n "^<script>$\|^</script>$"`: core = lines 627–2097, seam = lines 2115–2211) to scratchpad `.js` files and ran `node --check` on each:

- Core block: **OK, no syntax error**
- Seam block: **OK, no syntax error**

(Note: a naive regex-based extraction initially mis-captured content because the seam's own HTML comment header contains the literal substring `<script>` in its prose — corrected by extracting via verified line numbers instead of a greedy regex. This was an extraction-tooling artifact only; the actual file content was never at risk.)

## Deletability Test ("delete the module, core works")

Performed entirely on a scratchpad copy (`radar-no-seam.html`), never on the tracked file:

1. Copied `radar-goiania.html` to scratchpad.
2. Programmatically removed lines 2099–2212 (the blank separator line, the HTML comment header, and the entire seam `<script>...</script>` block), leaving the file ending at `</script></body></html>` — structurally identical to the file before Task 1.
3. `grep -c "AI_CONFIG\|pesquisarMercadoIA"` on the no-seam copy → **0** (zero dangling references, confirmed no core→seam dependency exists).
4. `grep -c "<script src"` on the no-seam copy → **3** (unchanged).
5. Extracted the remaining core script (lines 627–2097) from the no-seam copy and ran `node --check` → **passed, no syntax error**.
6. `diff`'d the extracted core-script content against the original pre-edit core block → **byte-for-byte identical**, confirming Task 1 made zero edits inside the existing `<script>` (the core was never touched, only appended-after).
7. Discarded the scratchpad copy after the test.

## sw.js Integrity

`git status --porcelain sw.js` returned empty both before and after the plan's tasks — `sw.js` was never opened for writing and carries zero diff. No new asset was introduced by the seam (no fetch, no new file), so no precache-list change was warranted or made.

## Decisions Made
- Used the plan's exact frontmatter-specified config field values over ARCHITECTURE.md's more generic illustrative sketch (research doc had `provider: null, model: null` as placeholders; PLAN.md's `must_haves` mandate concrete `provider:"openrouter"`, `model:"z-ai/glm-4.5-air:online"` — plan takes precedence as the authoritative task-level source).
- Reworded one prose comment to avoid an incidental grep false-positive on `pesquisarMercadoIA(` (paren) outside the true definition, preserving the sentence's meaning while satisfying the plan's literal `grep -c "pesquisarMercadoIA(" == 1` acceptance bar.
- Kept the OpenAI-compatible fetch adapter as a commented-out (never-executed) sketch inside the function body — matches the plan's explicit permission to write an "esboço INALCANÇÁVEL" and documents the exact future request/response shape from AI-MODELS.md for the eventual IA-02 implementer, without shipping any live fetch path in v2.0.

## Deviations from Plan

None — plan executed exactly as written. The single prose tweak above was a grep-precision correction within Task 1's own action, not a deviation from the plan's required behavior (the acceptance criterion `pesquisarMercadoIA( == 1` was itself specified by the plan; the initial draft simply had an incidental second textual match in a comment, fixed before commit).

## Issues Encountered
- Initial `node --check` syntax-verification attempt used a naive regex to extract `<script>` block contents from the HTML file, which mis-extracted because the seam's own comment header contains the literal text `<script>` (referring to itself in prose). Resolved by extracting via verified exact line numbers (`grep -n "^<script>$\|^</script>$"`) instead of a greedy multiline regex. No impact on the shipped file — this was purely a verification-tooling issue in the scratchpad, caught and corrected before recording results.

## User Setup Required

None - no external service configuration required. `AI_CONFIG.apiKey` is `null` and `AI_CONFIG.endpoint` is `""`; no proxy Worker or BYO-key setup is needed or possible in v2.0 (feature is fully dormant).

## Next Phase Readiness
- IA-01 fully covered: the seam exists, is isolated, is provably deletable, and introduces zero runtime attack surface (per the plan's threat model, T-05-04 disposition "accept" for v2.0 holds — `enabled:false` + zero call-sites means no active listener, no network, no execution).
- Ready for Phase 6 (Motion no App Todo) — this plan touched nothing that Phase 6 depends on or will conflict with (motion work targets the existing UI/view transitions, not this new dormant block).
- Future activation (IA-02, v2.1+) has a clear, documented starting point: flip `AI_CONFIG.enabled`, wire a proxy Worker or BYO-key, add an opt-in UI call-site — none of which exists yet, by design.

## Self-Check: PASSED

- FOUND: `radar-goiania.html`
- FOUND: `.planning/phases/05-seam-de-ia-dormant/05-01-SUMMARY.md`
- FOUND commit: `85b89a7`
- Re-verified grep claims match SUMMARY exactly: `pesquisarMercadoIA(` = 1, `<script src` = 3, `async function pesquisarMercadoIA` = 1, `z-ai/glm-4.5-air:online` = 1

---
*Phase: 05-seam-de-ia-dormant*
*Completed: 2026-07-04*
