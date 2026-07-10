---
phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha
verified: 2026-07-07T00:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Abrir radar-goiania.html servido via HTTP local (não file://) em preview mobile 375px (DevTools responsive, iPhone SE/375) e em desktop"
    expected: "Malha ociosa discreta, não 'emaranha' visualmente sobre o mapa real (comparado ao estado anterior); toque no bairro realça forte (accent) e mostra nome corrigido (nm_disp) no tooltip; zoom in/out muda densidade da malha perceptivelmente; toque no MEIO do bairro (não só na linha) seleciona; sem erro no console do navegador"
    why_human: "Percepção visual real (compete ou não com o conteúdo) e usabilidade tátil em tela real não são verificáveis por grep/assert; o 07-03-PLAN.md declara este item como checkpoint 'checkpoint:human-verify' gate:blocking (Task 3), e o 07-03-SUMMARY.md documenta explicitamente que a verificação mecânica (valores computados, console limpo) foi feita, mas a confirmação visual ao vivo 'fica com o usuário ao vivo' — não há evidência no repo de que o usuário completou essa etapa"
  - test: "Revisar por amostra os 780 casos multi-candidato (motivo nome/maioria) na tabela 'Multi-candidatos (conferência)' de bairros-goiania.report.md, contra bordas administrativas reais"
    expected: "A amostra confirma que o tie-break assistido por nome / maioria de contagem produziu o bairro correto nas bordas de risco (áreas onde dois ou mais setores cadastrais colidem no mesmo polígono da malha)"
    why_human: "Julgamento de correção geográfica/administrativa de bordas não é verificável por regra automática; o próprio 07-01-PLAN.md e o 07-01-SUMMARY.md rotulam esta revisão como 'Open Decision #1' — acompanhamento não-bloqueante agendado para o orquestrador/usuário, ainda não marcado como concluído em STATE.md (linha 73: 'quem faz, ainda em aberto')"
---

# Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha Verification Report

**Phase Goal:** Nomes de bairro confiáveis (✅) e fundações de dados (CNEFE, tuning da malha) prontas.
**Verified:** 2026-07-07
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Nomes de bairro exibidos vêm da fonte autoritativa (layer 3 nmbairro/cdbairro) via spatial join POST, não de string-match do nm_bai cru | ✓ VERIFIED | `gerar-bairros.py` defines `http_post`, `arcgis_post`, `reconcile_name`, `norm`; `esriSpatialRelIntersects` (line 215) and `returnCountOnly` (line 274) both present; string-match used only as documented tie-break (motivo `"nome"`), never as source |
| 2 | bairros-goiania.json tem geometria e contagem de features byte-idênticas ao anterior — só o nome muda | ✓ VERIFIED | `check-bairros-geojson.py --assert-geometry-identical` run live against current HEAD baseline: `ASSERT OK: geometria byte-identica, 0 nome(s) mudaram (1206 features, ids identicos, geometria estruturalmente identica por id)` |
| 3 | Relatório de diff antes→depois por polígono gerado, com multi-candidatos destacados | ✓ VERIFIED | `bairros-goiania.report.md` contains `## Reconciliacao de nomes (NOMES-01/03)` (line 40) and `### Multi-candidatos (conferencia)` (line 1191); Ofugi test case confirmed resolved as `VI OFUGI` via motivo `nome` (lines 161, 1284), not `VI SANTA HELENA` |
| 4 | Glebas sem parcela intersectada recebem rótulo genérico explícito; nenhum nome fiscal é forçado | ✓ VERIFIED | 87 features (86 unique `id`s — 1 documented id collision `000400001169`) carry `nm_bai`/`nm_disp` = "Gleba não denominada"; report.md line 52 confirms `sem-parcela: 86` |
| 5 | Nome de exibição amigável (nm_disp): prefixo por extenso + acento recuperado; oficial (nm_bai) preservado para matching | ✓ VERIFIED | All 1206 features carry `nm_disp` distinct from `nm_bai` (e.g. `"RES CAMPOS DOURADOS"` → `"Residencial Campos Dourados"`, `"FAZ SAO JOSE"` → `"Fazenda São José"`); `radar-goiania.html` hover/breadcrumb use `nm_disp\|\|nm_bai` (lines 933, 960) |
| 6 | logradouros-goiania.json (~9,8k logradouros, dicas de CEP/localidade, build-time-only CNEFE distill) versionado, sem campo pessoal | ✓ VERIFIED | 9,852 entries, 101.8KB gz (<200KB budget); anti-PII assert clean (`dtnasc`/`cpf`/`responsavel`/`morador` absent); `gerar-logradouros.py` filters `COD_MUNICIPIO=="5208707"`, streams zip/csv, never runs at app runtime |
| 7 | sw.js cache bumped (radar-v5→radar-v6) cobrindo bairros-goiania.json re-shipado + logradouros-goiania.json no precache | ✓ VERIFIED | `sw.js` line 12: `const CACHE = "radar-v6"`; `LOCAL` array (lines 13-23) contains both `./bairros-goiania.json` and `./logradouros-goiania.json`; `node --check sw.js` passes |
| 8 | Malha de bairro no mobile: idle "sussurra", highlight "grita", densidade por zoom, toque na área seleciona, zero hex/transition novo | ✓ VERIFIED (mechanically) | `BAI_STYLE={weight:.6,fillOpacity:.02,opacity:.4,bubblingMouseEvents:false}`; `BAI_HOVER={color:_BAI_ACCENT,weight:2.5,fillOpacity:.08,opacity:1}`; `baiStyle()` ramps weight 0.5→1.2 / opacity 0.35→0.5 over z 12→16 via `map.getZoom()`; single `map.on("zoomend")` extended with `bairroLayer.setStyle(baiStyle)`; z≥17 gate preserved; no new hex literals, no new `transition:`. **Live visual/tactile confirmation on mobile 375 + desktop not evidenced in repo — see Human Verification.** |

**Score:** 8/8 truths mechanically verified. 2 items require human confirmation before phase can be marked fully `passed` (see below).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `gerar-bairros.py` | Step 4.5 spatial join POST + reconciliação + `--apply-names` | ✓ VERIFIED | Compiles; `http_post`/`arcgis_post`/`reconcile_name`/`norm` all present; `esriSpatialRelIntersects`, `returnCountOnly` confirmed by grep |
| `check-bairros-geojson.py` | `--assert-geometry-identical` mode | ✓ VERIFIED | Ran live against HEAD baseline: passes, 1206 features, ids identical, geometry structurally identical |
| `bairros-goiania.json` | 1206 features, nm_bai + nm_disp reconciled, geometry byte-identical | ✓ VERIFIED | 1206 features confirmed; `properties` keyset = `{id, nm_bai, nm_disp}` uniformly; assert passes |
| `bairros-goiania.report.md` | Reconciliação section + diff table + multi-candidatos | ✓ VERIFIED | All sections present; Ofugi test case correctly resolved |
| `gerar-logradouros.py` | Build-script CNEFE download/filter/distill | ✓ VERIFIED | Compiles; `5208707`, `COD_MUNICIPIO`, `52_GO.zip`, streaming (zipfile/csv) all confirmed; docstring documents build-time-only |
| `logradouros-goiania.json` | ~9.8k logradouros, ~117KB gz, anti-PII | ✓ VERIFIED | 9,852 entries, 101.8KB gz, structure `{nome,tipo,localidades,ceps}`, zero PII terms |
| `sw.js` | radar-v6, both assets in LOCAL precache | ✓ VERIFIED | `node --check` passes; CACHE=="radar-v6"; no "radar-v5" remaining; both assets present |
| `radar-goiania.html` | BAI_STYLE/BAI_HOVER/baiStyle/zoomend tuned | ✓ VERIFIED (mechanically) | All numeric/wiring assertions from plan pass; visual confirmation pending (see Human Verification) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `gerar-bairros.py` Step 4.5 | layer 3 (LAYER3) via POST | spatial join `esriSpatialRelIntersects` in UTM 31982 | ✓ WIRED | Confirmed by grep + live re-run of `--assert-geometry-identical` (proves the reconciled data made it into the committed json without corrupting geometry) |
| reconciliação | `bairros-goiania.json` committed | injeção de nome por `id` no json existente | ✓ WIRED | 1204/1206 names changed on original run (SUMMARY); geometry untouched (assert) |
| `gerar-logradouros.py` | `logradouros-goiania.json` | distill filtrado por `COD_MUNICIPIO=5208707` | ✓ WIRED | Grep confirms filter logic; output file matches expected count/size |
| `sw.js` LOCAL | `logradouros-goiania.json` | entrada de precache + bump de versão | ✓ WIRED | Both present in LOCAL array under radar-v6 |
| map `zoomend` handler | `bairroLayer.setStyle(baiStyle)` | re-aplicação do estilo por zoom (densidade) | ✓ WIRED | Single zoomend handler, `setStyle(baiStyle)` called in the else-branch (z<17); `baiHi` re-styled too |
| `onEachBairro` (fill do polígono) | `highlightBairro`/drill | toque na área — `bubblingMouseEvents:false` | ✓ WIRED | `bubblingMouseEvents:false` present in BAI_STYLE; `fillOpacity:.02 > 0` confirmed |
| `highlightBairro` tooltip | `nm_disp` (reconciled display name) | `layer.feature.properties.nm_disp\|\|nm_bai` + `esc()` | ✓ WIRED | Confirmed at radar-goiania.html:933, sanitized via `esc()` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `bairros-goiania.json` `nm_disp` | `display_name(new_name, nm_bai_original)` | `gerar-bairros.py` `--apply-names`, sourced from layer 3 `nmbairro` reconciliation + layer 2 raw accents | Yes — live IBGE/ArcGIS data, not static/placeholder | ✓ FLOWING |
| `logradouros-goiania.json` entries | CNEFE CSV rows filtered by `COD_MUNICIPIO` | Live download of `52_GO.zip` from IBGE FTP (120.8MB, confirmed in SUMMARY: "download real... 3.960.937 linhas") | Yes — real IBGE census data | ✓ FLOWING |
| `radar-goiania.html` tooltip `nm` | `layer.feature.properties.nm_disp` | fetched `bairros-goiania.json` at runtime via existing app fetch/render path | Yes — traces to reconciled JSON, not hardcoded | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Geometry-identical assert (proves nomes-only diff) | `python check-bairros-geojson.py --assert-geometry-identical <HEAD baseline> bairros-goiania.json` | `ASSERT OK: geometria byte-identica, 0 nome(s) mudaram` | ✓ PASS |
| Python build scripts compile | `python -m py_compile gerar-bairros.py check-bairros-geojson.py gerar-logradouros.py` | `COMPILE OK` | ✓ PASS |
| sw.js syntax valid | `node --check sw.js` | passes | ✓ PASS |
| logradouros-goiania.json structural/size/anti-PII check | inline Python assert (count, gz size, PII terms) | `9852 entries, 101.8KB gz, PII check: True` | ✓ PASS |
| Ofugi tie-break test case | grep `bairros-goiania.report.md` for `000400000103` | resolved `VI OFUGI` via motivo `nome` (not `VI SANTA HELENA`) | ✓ PASS |
| id-collision accounted for (86 vs 87 gleba count) | inline Python Counter on feature ids | exactly 1 duplicate id (`000400001169`, matches SUMMARY's documented explanation) | ✓ PASS |
| Single zoomend handler / setStyle wiring / no new hex/transition | inline Python regex + string counts on radar-goiania.html | 1 zoomend, `setStyle(baiStyle)` present, 0 new hex, 0 new malha-related `transition:` | ✓ PASS |

Step 7b note: server-dependent runtime behaviors (live app fetch of both JSON assets, actual mobile rendering) are not runnable in this sandbox — routed to Human Verification below.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|--------------|--------|----------|
| NOMES-01 | 07-01 | Nomes reconciliados via spatial join POST à layer 3 | ✓ SATISFIED | `reconcile_name()`, `esriSpatialRelIntersects`, report.md reconciliation section |
| NOMES-02 | 07-01, 07-02 | Geometria/contagem byte-idênticas + sw.js cache bump | ✓ SATISFIED | Assert passes live; sw.js radar-v6 confirmed |
| NOMES-03 | 07-01 | Relatório de diff + glebas com rótulo genérico | ✓ SATISFIED | report.md diff table + multi-candidatos; "Gleba não denominada" applied to 87 features |
| NOMES-04 | (not in any 07-0X-PLAN.md — implemented via out-of-band commit `1fd7d62`) | nm_disp: prefixo por extenso + acento, nome oficial preservado | ✓ SATISFIED | `nm_disp` present on all 1206 features, wired into hover/breadcrumb; REQUIREMENTS.md already marks as `[x]` done. **Note:** this requirement was fulfilled by a manual (non-GSD-plan) commit `1fd7d62` on 2026-07-05, not captured in any 07-0X-PLAN.md/SUMMARY.md — the codebase satisfies it, but no plan document declares or tracks it |
| MALHA-01 | 07-03 | Malha sussurra/grita, densidade por zoom, toque na área, zero hex/transition novo | ✓ SATISFIED (mechanically); visual confirmation pending | All code-level assertions pass; the plan's own Task 3 is a `checkpoint:human-verify` gate that the SUMMARY documents as not yet completed live by the user |

No orphaned requirements: REQUIREMENTS.md maps exactly NOMES-01/02/03/04 + MALHA-01 to Phase 7, all 5 accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| gerar-logradouros.py | 255 | string `"placeholder"` in an assertion/guard message ("NAO gravando... placeholder") | ℹ️ Info | Not a stub — it's a defensive check preventing the script from writing fake data; correctly named, no action needed |

No blockers or warnings found. No TODO/FIXME/HACK markers in any phase-modified file. No empty-implementation patterns (`return null`, `=> {}`) found in the build scripts or sw.js changes.

### Human Verification Required

#### 1. Mobile 375 + Desktop Visual/Tactile Preview (MALHA-01, Task 3 of 07-03-PLAN.md)

**Test:** Serve the app via a local static HTTP server (not `file://`) and open `radar-goiania.html`. On DevTools responsive mode at 375px width (iPhone SE-class) and on desktop: observe the idle bairro mesh, tap/click a bairro, zoom in/out, and tap the middle (fill) of a bairro polygon.

**Expected:** Idle mesh is visually discreet (does not "emaranhar"/tangle with map content); tapping a bairro shows a strong accent-colored highlight with the correct (reconciled) name in the tooltip; zooming in increases line density/presence, zooming out decreases it; tapping the fill (not just the thin line) selects the bairro and a second tap drills in (mobile); desktop hover/click behave equivalently; no console errors.

**Why human:** This is a `checkpoint:human-verify gate="blocking"` task in 07-03-PLAN.md. The 07-03-SUMMARY.md explicitly states: "Checkpoint (Task 3): Verificação visual (mobile 375 + desktop) fica com o usuário ao vivo — a mecânica está verificada por valores computados + console limpo." All the underlying numeric/wiring assertions pass, but the actual live visual/tactile judgment call has not been recorded as completed anywhere in the repo (STATE.md, SUMMARY, or commit messages).

#### 2. Sample Review of Multi-Candidato Border Cases (NOMES-03, Open Decision #1)

**Test:** Review a sample of the 780 cases listed in `### Multi-candidatos (conferência)` in `bairros-goiania.report.md` (bairros resolved via `nome` or `maioria` tie-break, i.e. administrative border risk cases) against real-world knowledge of Goiânia's neighborhoods.

**Expected:** The reconciled names in the sampled multi-candidato cases are correct (or any errors found are documented/tracked for correction).

**Why human:** Explicitly deferred as "Open Decision #1" in the 07-CONTEXT.md and reiterated as an open item in STATE.md line 73 ("Fase 7: spot-check humano do diff de nomes nas bordas administrativas — quem faz, ainda em aberto"). This is geographic/administrative judgment that cannot be verified by an automated rule; the Ofugi test case proves the *algorithm* works correctly for at least one known case, but a broader sample review is still pending per the project's own tracking.

### Gaps Summary

No code-level gaps found — every artifact, key link, and requirement maps cleanly to real, working code, and all mechanical/automated checks pass, including a live re-run of the geometry-identical assert against the current HEAD baseline. The phase's data foundations (bairro name reconciliation, nm_disp friendly display, CNEFE logradouros distill, sw.js cache bump) and the malha tuning code are all substantively implemented and wired correctly.

The phase is withheld from `passed` status solely because two items explicitly flagged as human-judgment/live-verification steps by the plans themselves have not been confirmed as completed in the repo: (1) the blocking visual/tactile checkpoint for the malha tuning on a real mobile viewport, and (2) the non-blocking-but-still-open sample review of administrative border name reconciliations. Neither represents a code defect; both are pending decisions/confirmations that only a human can make.

One documentation note (non-blocking): NOMES-04 (`nm_disp`) was implemented via a manual commit (`1fd7d62`) outside the GSD plan/summary flow for this phase — the codebase correctly satisfies the requirement, but no 07-0X-PLAN.md/SUMMARY.md documents it. REQUIREMENTS.md and ROADMAP.md already reflect it as delivered, so this is a traceability gap in the phase's own planning artifacts, not a functional gap.

---

_Verified: 2026-07-07_
_Verifier: Claude (gsd-verifier)_
