---
phase: 15
slug: setor-scan-choropleth-painel-territorio
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-09
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in test runner, ESM) |
| **Config file** | package.json (`scripts.test`) |
| **Quick run command** | `node --test tests/territorio.test.mjs` (novo arquivo desta fase) |
| **Full suite command** | `npm test` (baseline 108 testes verdes, 2026-07-09) |
| **Estimated runtime** | ~5-10 segundos |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (suíte rápida — rodar completa sempre)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (preenchido pelo planner por task) | — | — | TERR-01/02/03 | — | Allowlist de campos (nunca `dtnascimen`); orçamento ≤3 requisições paginadas por scan; cache/dedupe por `cdbairro` | unit (TDD RADAR_PURE) + grep | `npm test` + greps de orçamento/allowlist | ❌ W0 (tests/territorio.test.mjs) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/territorio.test.mjs` — testes das funções puras novas do RADAR_PURE (quantis de amostra, R$/m² por lote com guarda null-vs-0, mix de uso, idade mediana, rótulo de amostra) — criar JUNTO com as funções (TDD), dentro do bloco `RADAR_PURE_START`/`RADAR_PURE_END` (o loader de teste fatia esse bloco; helpers fora dele são invisíveis)
- [ ] Fixtures de lotes sintéticos em `tests/fixtures.mjs` (setor pequeno + setor com nulls)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orçamento real ao vivo (Bueno ≤1-3 requisições paginadas) | TERR-01 | Contagem de rede real no endpoint | Abrir painel/choropleth do Bueno com DevTools Network aberto; contar requisições ao MapServer/3/query |
| Tempo de scan em 4G real (campo) | TERR-01 | Banda real não reproduzível em dev | HUMAN-UAT não-bloqueante (phase flag do ROADMAP) |
| Legibilidade AA do choropleth sobre satélite em luz externa | TERR-02 | Percepção em device/sol | HUMAN-UAT não-bloqueante; contraste calculado dos 5 hex é verificável em dev (automatizável), o campo não |
| Toque na área do bairro continua funcionando com fill de quantil | TERR-02 | Interação touch real | Tocar bairros coloridos e neutros no mobile; confirmar highlight+nome |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
