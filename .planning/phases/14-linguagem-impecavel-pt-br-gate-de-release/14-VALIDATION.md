---
phase: 14
slug: linguagem-impecavel-pt-br-gate-de-release
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-09
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in test runner, ESM) |
| **Config file** | package.json (`scripts.test`) |
| **Quick run command** | `node --test tests/templates.test.mjs` (ou o arquivo acoplado à mudança) |
| **Full suite command** | `npm test` (107 testes, baseline verde confirmada 2026-07-09) |
| **Estimated runtime** | ~5-10 segundos |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (suíte é rápida — rodar completa sempre)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (preenchido pelo planner por task) | — | — | LING-01 | — | Strings funcionais (SEARCHTOKEN, localStorage keys, `?insc=`, classes CSS, roles ARIA) byte-idênticas | unit + grep | `npm test` + greps de auditoria | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — `tests/*.test.mjs` (107 testes) já fixa o conteúdo dos templates RADAR_PURE (WhatsApp, documentos, negociação, prédio, scores). Mudança de string em template exige atualizar o teste acoplado **no mesmo commit**.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tom "corretor profissional" das mensagens de WhatsApp | LING-01 | Julgamento de tom/registro não é grep-ável | Gerar cada template com dados de exemplo e ler em voz alta na persona corretor |
| Linguagem formal/juridicamente cuidadosa dos documentos | LING-01 | Julgamento qualitativo | Gerar proposta/termo/contrato/laudo e revisar cláusulas e ressalvas |
| Legibilidade da microcopy in-app (botões/erros/tooltips no fluxo real) | LING-01 | Contexto visual | Percorrer busca → ficha → ações → documentos no navegador |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (nenhuma — infra existente cobre)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-09 (plan-check: dimensões 8a-8d PASS; 12 tasks com verify automatizado)
