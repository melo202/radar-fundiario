---
phase: 11-documentos-em-3-niveis
reviewed: 2026-07-07T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/doc.test.mjs
  - tests/fixtures.mjs
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the diff `7a765cc..HEAD` covering waves 11-01/11-02/11-03: the new RADAR_PURE document
functions (`recomendaDocumento`, `pendenciasDocumento`, `fichaRapidaTexto`), the wizard refactor
(Seletor de Finalidade → Confiança/Pendências → Revisão), and the branched `montarLaudo()` /
`montarFichaRapida()` render paths.

Test suite: **64/64 passing** (`npm test`), including the 22 new Fase 11 tests in
`tests/doc.test.mjs` covering `recomendaDocumento` (8-combination matrix), `pendenciasDocumento`,
and `fichaRapidaTexto` honesty contracts.

**State machine integrity is solid.** The `LZ.fase="finalidade"` → numbered `step` (0-5) transition
is guarded correctly: `wizBack()` closes the wizard from the finalidade phase (no orphaned back
button), `renderSeletorFinalidade()` re-hides `.wfoot` on every entry to the finalidade phase
(including re-entry via the "Trocar documento" link at step 5), and `finEscolherDoc()` reliably
restores `.wfoot` display before initializing numbered steps. `montarLaudo()`/`montarFichaRapida()`
are called from exactly one site — the guarded boundary in `wizNext()` — confirming guard ec9f129 is
preserved; the dead `abrirLaudo()` was removed cleanly (only referenced in comments now). All
LZ-derived strings rendered in the wizard and in the printed documents are passed through `esc()`;
`radar_prof.cnai` is accessed with null-safe `(p.cnai||"").trim()` everywhere, so old profiles
without a `cnai` field never crash.

The main substantive issue is a **legal-content consistency gap**: the PTAM/CNAI professional
gating in `montarLaudo()` never cross-checks `comCreci`, so a profile with a CNAI number but an
empty CRECI field produces a PTAM-titled document that calls the signer a "corretor de imóveis"
with no CRECI number anywhere in the document. A related but distinct issue is that the Revisão
screen's "Documento" preview can go stale relative to what will actually render, if the user edits
their profile (clears CNAI) after choosing "PTAM" and before generating.

## Warnings

### WR-01: PTAM title/signature block gated only by CNAI, never cross-checked against CRECI

**File:** `radar-goiania.html:3232-3234`, `radar-goiania.html:3308-3310`
**Issue:**
`comCnai` alone decides the título ("Parecer Técnico de Avaliação Mercadológica (PTAM)" vs.
"Relatório de Referência de Mercado") and the assinatura/ressalvas block. `comCreci` is only used
to append "— CRECI xxx" to the signature, but there is no branch that requires `comCreci` to be
true before allowing the PTAM title. Same gating logic is duplicated in `recomendaDocumento()`
(`radar-goiania.html:1378-1382`), which recommends "ptam" purely on `cnai`.

Concretely, if a user fills in only the CNAI field (leaves CRECI blank) in wizard step 3, the
generated document will:
- Title itself "Parecer Técnico de Avaliação Mercadológica (PTAM)" (`comCnai` true)
- State "Parecer emitido por corretor de imóveis inscrito no CNAI; a menção à Resolução COFECI
  nº 1.066/2007 aplica-se a este parecer." (line 3308, `comCnai` branch)
- Sign with `${esc(p.nome)}` + `" — CNAI "+esc(p.cnai)` + a `.lass-resp` line invoking COFECI
  1.066/2007 responsibility — **with no CRECI number displayed anywhere**, even though CNAI
  registration in practice presupposes an active CRECI inscription.

This produces a document that self-identifies the signer as a licensed "corretor de imóveis" with
professional/COFECI responsibility language, but never surfaces (or requires) the CRECI registry
number that would let a reader verify that claim.

**Fix:** Gate the PTAM path on `comCreci && comCnai` (both fields filled), not `comCnai` alone —
in both `montarLaudo()` (`titulo`, the ressalvas branch, and the `.lass`/`.lass-resp` block) and in
`recomendaDocumento()`'s "formal" branch. Example:
```js
const comCreci=!!(p.creci||"").trim();
const comCnai=!!(p.cnai||"").trim();
const habilitado=comCreci&&comCnai; // PTAM exige as DUAS inscrições, nao so CNAI
const titulo=habilitado?"Parecer Técnico de Avaliação Mercadológica (PTAM)":"Relatório de Referência de Mercado";
// ...
${habilitado?" Parecer emitido por corretor de imóveis inscrito no CRECI e no CNAI; ...":" A emissão de PTAM é privativa..."}
```
And update `recomendaDocumento(finalidadeUso, cnai)` to accept/require both flags (or accept a
`{creci, cnai}` pair) so the wizard's step-3 helper text and the recommendation panel agree with
what `montarLaudo()` will actually produce.

### WR-02: Revisão screen's "Documento" preview can go stale relative to what will actually render

**File:** `radar-goiania.html:3201-3202`, `radar-goiania.html:3213`, `radar-goiania.html:3227-3234`
**Issue:** Step 5 (Revisão) shows `NOMES_DOC[LZ.tipoDoc]` as a static label for "Documento". The
"Editar perfil" link (line 3213) jumps back to step 3 without resetting `LZ.tipoDoc`. If the user
picked "formal → PTAM" while CNAI was filled, then clears the CNAI field in step 3, and advances
back to step 5, the Revisão screen still displays "Documento: Laudo / PTAM" — but `montarLaudo()`
will actually branch to the "Relatório de Referência de Mercado" title because `comCnai` is now
false (WR-01's gating logic, independent of `LZ.tipoDoc`, decides the real title for
`relatorio`/`ptam`). The user is shown a Revisão preview that misrepresents what they'll get after
clicking "Gerar PDF".
**Fix:** Either (a) recompute the effective title on the Revisão screen using the same `comCnai`
(and, after WR-01, `comCreci`) logic used in `montarLaudo()`, so the label always reflects reality,
or (b) when the user edits CRECI/CNAI in step 3 in a way that changes eligibility for the
previously-chosen `tipoDoc`, downgrade `LZ.tipoDoc` accordingly (e.g., `ptam`→`relatorio`) before
returning to step 5.

### WR-03: No focus/announcement on finalidade re-render after `finSet()` (a11y)

**File:** `radar-goiania.html:2971-2975`, `radar-goiania.html:3098-3100`
**Issue:** `wizRender()`'s screen-reader focus-on-heading logic (the `stepMudou` block at the end of
the function, `radar-goiania.html:3216-3217`) is skipped entirely for the finalidade phase, because
`renderSeletorFinalidade()` returns early (`radar-goiania.html:3100`) before that block runs. When a
user activates a `.finop` button, `finSet()` re-renders the same screen to reveal the "Recomendado
para você" panel and the 3 document buttons below — but nothing is focused or announced, so a
screen-reader user gets no indication that new interactive content appeared. Contrast with the
numbered steps (0-5), which correctly focus `.wh1` on every step change.
**Fix:** After `finSet()` re-renders and a recommendation panel appears, focus the `.finrec` heading
(or the first `.findoc` button) once, e.g. add to `renderSeletorFinalidade()`:
```js
if(LZ.finalidadeUso && LZ._finRecMostrou!==LZ.finalidadeUso){
  LZ._finRecMostrou=LZ.finalidadeUso;
  // depois de setar b.innerHTML:
  const h=b.querySelector(".finrec-selo"); if(h){h.tabIndex=-1;h.focus({preventScroll:true});}
}
```

## Info

### IN-01: Duplicated confidence-input computation between step 4 and step 5

**File:** `radar-goiania.html:3164-3169`, `radar-goiania.html:3195-3197`
**Issue:** The `isU`/`areaOk`/`venalOk`/`atipico`/`nComps` block that feeds `pendenciasDocumento()`
is computed independently (but identically in shape) at both step 4 and step 5. Any future change to
one of these input derivations (e.g., how `nComps` is read from `LZ.comps`) risks being applied to
only one of the two call sites, silently causing the "Confiança baixa" warning banner on step 5 to
disagree with the checklist shown on step 4.
**Fix:** Factor the shared computation into a small helper, e.g. `confInputsDeLZ(a)`, called from
both step-4 and step-5 branches of `wizRender()`.

### IN-02: `titulo`/`comCnai` naming does not distinguish "gates PTAM alone" from "PTAM requires both credentials" intent

**File:** `radar-goiania.html:3232-3234`
**Issue:** Purely cosmetic/documentation note tied to WR-01: the variable name `comCnai` combined
with comments elsewhere in the diff ("recomenda-se o tipo certo... nunca bloqueia acesso ao PTAM")
suggests the intent was "CNAI unlocks PTAM regardless of CRECI," which is internally consistent with
the current code but is the actual legal gap flagged in WR-01. Once WR-01 is fixed, rename to
something like `habilitadoPtam` to make the dual-requirement explicit at the call site and avoid
future regressions reintroducing the CNAI-only gate.
**Fix:** See WR-01's suggested `habilitado` variable.

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
