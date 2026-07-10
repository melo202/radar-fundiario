---
phase: 7
slug: funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-05
---

# Phase 7 — Validation Strategy

> App single-file, sem framework de teste. Validação proporcional: **build-script self-validation** (spatial join + assert de diff estrutural + relatório) + **grep** + **preview** (malha). O relatório de diff de nomes é conferido por amostra pelo orquestrador.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — build scripts Python auto-validam; grep; browser preview |
| **Quick run** | `python gerar-bairros.py --verify` (spatial join + assert geometria byte-idêntica + conta reconciliados) |
| **Full suite** | `python check-bairros-geojson.py --assert-geometry-identical bairros-goiania.json` + smoke do `logradouros-goiania.json` + preview da malha |
| **Runtime** | segundos (grep/asserts) + o download/distill CNEFE (build-time, minutos, raro) |

## Per-Task Verification Map

| Task | Req | Check |
|------|-----|-------|
| names-reconcile | NOMES-01 | `gerar-bairros.py` faz POST spatial join à layer 3; nomes vêm de `nmbairro`; tie-break de multi-candidato documentado; 0 uso de string-match como fonte |
| geometry-identical | NOMES-02 | assert: geometria + contagem de features do novo `bairros-goiania.json` byte-idênticas ao anterior (só `properties` de nome mudou); `sw.js` cache bumped |
| name-diff-report | NOMES-03 | relatório antes→depois por polígono gerado; glebas → "Gleba não denominada"; amostra + multi-candidatos conferidos; resumo apresentado |
| cnefe-distill | (BUSCA-10 base) | `logradouros-goiania.json` (~9,8k ruas, nomes+CEP/localidade, ~117KB gz) versionado; no `sw.js` LOCAL; build-time only |
| mesh-tuning | MALHA-01 | preview: idle discreto, highlight forte+nome, densidade por zoom, toque na área; grep BAI_STYLE/BAI_HOVER ajustados; zero hex novo |

## Manual-Only Verifications

| Behavior | Req | Why | Instr |
|----------|-----|-----|-------|
| Nomes de bairro corretos no hover/toque | NOMES-01 | Visual + amostra | Preview: passar em vários bairros; conferir contra `nmbairro` de origem |
| Revisão das bordas do diff de nomes | NOMES-03 | Julgamento humano | Orquestrador confere amostra + multi-candidatos; usuário revê bordas depois (não-bloqueante) |
| Malha não "emaranha" no mobile | MALHA-01 | Visual | Preview 375: idle discreto, toque realça |

## Validation Sign-Off

- [ ] Spatial join POST + nomes da fonte autoritativa; string-match NÃO é fonte
- [ ] Geometria/contagem byte-idênticas (assert) + sw.js bump
- [ ] Relatório de diff gerado + amostra/multi-candidatos conferidos + resumo apresentado
- [ ] `logradouros-goiania.json` (nomes+CEP) versionado + precache
- [ ] Preview: malha idle discreta / highlight forte+nome correto / densidade por zoom / toque na área; zero erro de console
- [x] `nyquist_compliant: true`

**Approval:** pending
