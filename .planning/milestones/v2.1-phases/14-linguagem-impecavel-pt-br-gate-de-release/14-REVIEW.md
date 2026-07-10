---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
reviewed: 2026-07-09T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - radar-goiania.html
  - tests/fixtures.mjs
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-09
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the full diff `304281c..HEAD` for `radar-goiania.html` and `tests/fixtures.mjs` (~230 lines), covering the pt-BR microcopy gate: button labels (infinitive verbs), toast/error copy with next-step guidance, tooltip cleanup, WhatsApp/Captação template rewording, and the new `localTxt(bairro)` helper applied across 6 `RADAR_PURE` functions.

The `localTxt()` helper is correct: `bairro ? \`no ${bairro}\` : "na região"` fixes the real gender-agreement bug ("no região" → "na região", since "região" is feminine). All 6 call sites (`zapResumo`, `zapProprietario`, `zapComprador`, `captAbordagem`, `captScript`, `fichaRapidaTexto`) were verified individually — no double-preposition bugs, no leftover raw `${d.bairro||"região"}` patterns anywhere in the file. The unrelated `${d.endereco||"região"}` fallbacks (in `captAbordagem`/`captFollowup`) correctly keep the `"na"` preposition since they were never wrong (endereço strings pair fine with "na").

No functional strings (SEARCHTOKEN, `radar_oportunidades`/`radar_historico` localStorage keys, `?insc=`, CSS classes, element ids, ARIA `role`/`aria-controls`/`aria-describedby`/`aria-labelledby`) were touched — confirmed by grep across the whole file. All changed strings are plain text content (no attribute-quote or `</script>` breakage risk), and `esc()` calls at the one interpolation site touched by this diff (`bldg-head` line, only the static label text changed) are preserved. `STATUS_LABEL.risco`, the score `rotulo`, the pin legend, and the fixture were all updated together from "Abaixo da mediana" to "Oportunidade baixa" — grep confirms zero residual occurrences of the old string anywhere in the codebase.

Ran the full suite: **107/107 tests pass** (`node --test tests/*.test.mjs`), including the fixture change for `scoreOportunidade`'s low-score case.

Two non-blocking issues found, detailed below — neither breaks functionality or introduces a regression, but both are worth tracking given this phase's explicit purpose is a language-quality gate.

## Warnings

### WR-01: `localTxt()`'s "sem bairro" branch (the exact branch this phase's gender-agreement fix targets) has zero test coverage

**File:** `tests/fixtures.mjs` (all `bairro:` fields), exercised via `radar-goiania.html:1440`
**Issue:** The commit introducing `localTxt(bairro)` explicitly fixes a real bug ("no região" → "na região" when `bairro` is falsy), but every fixture that reaches a `localTxt()` call site (`zapComData`, `zapSemPerfil`, `zapSemFaixa`, `fichaRapidaCasos.*`, etc.) hardcodes `bairro: "Setor Bueno"`. Grepping `tests/fixtures.mjs` for `bairro` shows every single occurrence is `"Setor Bueno"` — there is no fixture with `bairro: null`/`undefined`/`""`. The commit message itself acknowledges this ("sem edição de teste (branch sem bairro não coberto por fixture)"). This means the falsy branch of `localTxt` — the actual bug being fixed — is not exercised by any assertion, so a future edit could silently reintroduce "no região" (or any other gender slip) without the suite catching it.
**Fix:** Add a fixture variant with `bairro: null` (e.g., `zapSemBairro` or extend `zapSemFaixa`) and an assertion in `tests/templates.test.mjs`/`tests/doc.test.mjs` that the six call sites render `"na região"` (never `"no região"`) when bairro is absent:
```js
// tests/fixtures.mjs
zapSemBairro: { ...FIXTURES.zapComData, bairro: null },

// tests/templates.test.mjs
test("localTxt: bairro ausente usa 'na região' (nunca 'no região')", () => {
  for (const fn of [P.zapResumo, P.zapProprietario, P.zapComprador, P.captAbordagem, P.captScript]) {
    const result = fn(FIXTURES.zapSemBairro);
    assert.ok(!/no região/.test(result), `NAO deveria conter "no região" (erro de concordância), obteve: ${result}`);
  }
});
```

## Info

### IN-01: Static `#loadmsg` default was capitalized to match `MOTION_MSG`, but four other inline `loading(true, "...")` calls elsewhere in the file remain lowercase

**File:** `radar-goiania.html:1006` (changed) vs. `radar-goiania.html:2329,2345,2476,2649` (untouched, out of this diff)
**Issue:** This phase's A2 fix capitalized the static `#loadmsg` default to `"Consultando cadastro…"`, matching `MOTION_MSG.cadastro`. That's correct and intentional (confirmed in `14-01-SUMMARY.md`, task A2 scope). However, four other direct `loading(true, "carregando lote…")`-style calls (lines 2329, 2345, 2476, 2649) still pass lowercase strings, so the loading indicator's capitalization is inconsistent depending on which code path triggers it. This is pre-existing and outside the reviewed diff's changed lines, not a regression — flagging only because it is the exact same UI surface (`#loadmsg`) this phase's own stated goal was to "unificar capitalização do loading."
**Fix:** Out of scope for this diff; consider a follow-up microcopy pass to capitalize `"carregando lote…"`, `"identificando lote…"`, `"localizando o setor…"`, and `"número não achado — varrendo a rua…"` for full consistency with `MOTION_MSG`.

---

_Reviewed: 2026-07-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
