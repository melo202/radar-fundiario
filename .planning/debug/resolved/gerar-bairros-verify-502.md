---
status: resolved
trigger: "gerar-bairros.py --verify fails at ~100/1206 polygons with exit 1 due to 502-under-load on ArcGIS layer 3 spatial-join POSTs; no resume/checkpoint on crash; must robustify build without changing reconciliation logic"
created: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:01:00Z
---

## Current Focus

hypothesis: reconcile loop has no resume/checkpoint, no per-polygon try/except, and http()/http_post() retry doesn't treat 502 specially and has short delay/tries — sustained load trips 502, retry-exhaustion throws, uncaught, aborts whole build.
test: implement (1) resume/checkpoint via RECON dict loaded from bairros-goiania.recon.json + incremental save, (2) per-polygon try/except with "erro-endpoint" fallback, (3) 502 explicit handling + higher tries + inter-call sleep. Validate on small sample (~15-25 polygons) without running full 1206.
expecting: script parses, small-sample run writes/updates recon.json, simulated exception is caught and build continues, resume skips already-done ids, known cases (Campos Dourados id=000400000603, Ofugi tie-break) unaffected.
next_action: implement fixes in gerar-bairros.py, then validate with small script.

## Symptoms

expected: gerar-bairros.py --verify completes reconciliation of all 1206 polygons, writing bairros-goiania.recon.json and the report.
actual: crashes at ~100/1206 with exit 1 (uncaught error from 502-under-load after retry exhaustion in the layer-3 spatial-join POST). Re-running restarts from zero (no checkpoint), fails the same way again.
errors: HTTP 502 from portalmapa.goiania.go.gov.br under sustained load (documented quirk); after `tries` exhausted in http_post()/arcgis_post(), the exception propagates uncaught out of the per-polygon reconcile_name() call in the main loop.
reproduction: run `python gerar-bairros.py --verify` to completion (not to be re-run in full here - orchestrator handles that).
started: this is the first implementation of Step 4.5 reconciliation (per DATA-NAMES.md); always failed under full load, never completed.

## Eliminated

(none yet - proceeding directly to fix per fully-specified task)

## Evidence

- timestamp: 2026-07-05T00:00:00Z
  checked: gerar-bairros.py full read (703 lines)
  found: |
    - http() line 55-79: GET retry, tries=3 default, treats 429/503 with Retry-After honored, other HTTPError codes get generic delay*4 backoff, generic Exception same. 502 falls into the `else` branch (generic backoff) not the Retry-After branch - still retried but without Retry-After awareness and default tries=3 only.
    - http_post() line 107-136: same pattern as http(), used for layer-3 POST calls (arcgis_post -> http_post).
    - arcgis_post() line 139-156: wraps http_post, adds JSON-decode-layer retry (handles 200-with-invalid-body), tries=3 default.
    - reconcile_name() line 217-277: calls _query_layer3 -> arcgis_post twice per multi-candidate polygon (once for candidates list, once per candidate for count) - explains "~3400 calls total" estimate (1206 polygons * ~1 base call + extra calls for multi-candidate ones).
    - main() reconcile loop line 618-651: no try/except around reconcile_name() call; no checkpoint load/save mid-loop; RECON dict only written to disk once at line 674-677, AFTER the entire loop finishes - so a crash mid-loop loses ALL progress (matches "re-running fails the same way" symptom).
    - No existing bairros-goiania.recon.json file on disk currently (confirmed via ls) - consistent with "crash before first save" since save only happens after full loop completion.
    - Sleep between calls already exists inside reconcile_name (0.25s after each _query_layer3 call, lines 235 and 259) but NOT between different polygons' first calls in the outer loop - so back-to-back polygon calls (for "unico"/"sem-parcela" motivo, which don't hit the second sleep) have no inter-polygon throttle.
  implication: root cause matches problem statement exactly. Fix requires changes in 4 places: http()/http_post() 502 handling + tries, main() loop resume+checkpoint+try/except, and optionally a small throttle at the top of reconcile_name or in the main loop.

## Resolution

root_cause: gerar-bairros.py's reconcile loop (main(), ~line 618-651) has no incremental checkpointing (RECON only written after the full loop, line 674) and no per-polygon exception handling, so any single polygon's arcgis_post failure (502-under-load after retry exhaustion, tries=3 in http_post) propagates uncaught and aborts the entire 1206-polygon build; a re-run restarts from zero since no partial progress was ever persisted.
fix: |
  1. http()/http_post(): 502 now handled explicitly alongside 429/503 (Retry-After honored, exponential backoff); default tries raised 3->5 in http(), http_post(), arcgis(), arcgis_post().
  2. reconcile_name()/_query_layer3(): throttle sleep (0.3s) moved to occur before EVERY layer-3 POST call (not just between calls within one polygon) - reduces load-induced 502 frequency across the ~3400-call run.
  3. main() verify block (reconcile loop): resume/checkpoint added - loads RECON from bairros-goiania.recon.json if present, builds `pending` list of features not yet in RECON OR whose recorded motivo == "erro-endpoint" (so a resume specifically retries previously-failed polygons, not just untouched ones). Saves RECON to disk every 50 processed items and at loop end (was: only written once, after the entire loop).
  4. per-polygon try/except around reconcile_name() call: on exception, records the polygon in RECON with motivo="erro-endpoint", nmbairro_reconciled=nm_bai_original (fallback, never fabricates a name), prints a warning, and continues to the next polygon instead of aborting the build.
  5. _write_reconciliation_section() (report writer) and apply_names(): both already handle motivo="erro-endpoint" safely (counted as nao-resolvido in the report; apply_names uses the fallback name already stored in nmbairro_reconciled, same as any other resolved entry - no crash on missing ids since erro-endpoint entries ARE present in RECON, just flagged for retry).
  6. Added `--limit=N` CLI flag (verify mode only) to cap the number of pending polygons processed in one run - used for validation, safe for orchestrator to ignore in the full run.
  No changes to: reconcile_name()'s spatial-join method, layer-3 fields (cdbairro/nmbairro), the "sem-parcela"/"unico"/"nome"/"maioria" tie-break logic (name-substring-match-first, then majority-by-count), the RECON output schema (only added the new motivo value "erro-endpoint" to the existing enum), GLEBA_LABEL handling, --apply-names byte-identical-geometry guarantee, or the report format (added one new bullet + reuses existing diff table for erro-endpoint rows).
verification: |
  - `python -c "import ast; ast.parse(open('gerar-bairros.py').read())"` passed (syntax valid).
  - Live small-sample run: `python gerar-bairros.py --verify --limit=20` completed successfully end-to-end (all 6 steps), wrote bairros-goiania.recon.json with 20 entries, smoke test (Campos Dourados id=000400000603) passed (lon=-49.3620, lat=-16.8039, inside bbox). Test artifacts (recon.json, report.md) reverted/removed after the run - not committed.
  - Isolated resume + continue-on-error harness (scratchpad test_resume.py, mirrors the exact loop logic added to main()): run 1 with a simulated exception on 1 of 5 fake polygons confirmed (a) build did not abort, all 5 ids ended up in RECON, (b) the failed id got motivo="erro-endpoint" with nm_bai_original correctly preserved as fallback, (c) checkpoint file on disk matched in-memory state after the run. Run 2 (resume, no injected failure) confirmed it skipped the 4 already-resolved ids and reprocessed ONLY the erro-endpoint id, which then resolved successfully. All assertions passed.
  - Ofugi multi-candidate tie-break (id=000400000103, per DATA-NAMES.md documented case) tested directly against the live endpoint post-fix: resolved to cdbairro=114, nmbairro="VI OFUGI", motivo="nome" - matches the documented correct outcome (not the majority-by-count trap of "VI SANTA HELENA", 59 parcels vs 7).
  - No full 1206-polygon run was executed (per validation instructions - left for the orchestrator).
files_changed:
  - gerar-bairros.py
