---
phase: 19
slug: estetica-premium-tipografia
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-10
---

# Phase 19 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (ESM) |
| **Quick/Full command** | `npm test` (baseline 239 verdes; suíte NÃO fixa fontes — confirmado na pesquisa) |
| **Estimated runtime** | ~5-10s |

## Sampling Rate

- After every task commit / wave: `npm test`
- Max feedback latency: ~10s

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (preenchido pelo planner) | — | — | TYPO-01/PREM-01/A11Y-01 | — | CSP ganha `font-src 'self' data:` (sem afrouxar outras diretivas); zero rede em runtime p/ fontes; nenhum id/classe/handler alterado | grep + npm test + browser | greps abaixo + `npm test` | ✅ | ⬜ pending |

## Greps de aceite (gate)

- `grep -c "IBM Plex" radar-goiania.html` → **0**
- `grep -c "Open Sans" radar-goiania.html` → **0** (pipeline de PDF migrado)
- `grep -c "@font-face" radar-goiania.html` → **2** (Archivo variável + JetBrains Mono variável)
- `grep -q "font-src 'self' data:" radar-goiania.html` (CSP)
- `grep -q "\-\-elev-1" radar-goiania.html` e tokens aplicados
- `grep -c "trapFocus(" radar-goiania.html` ≥ 6 call-sites (6 superfícies) + 1 definição
- `grep -q "tabular-nums" radar-goiania.html`

## Manual/Browser (orquestrador via preview)

| Behavior | Requirement | Instruções |
|----------|-------------|------------|
| Fonte carrega de fato | TYPO-01 | `document.fonts.check('13px Archivo')` === true pós-load; screenshot antes/depois |
| Focus-trap nas 6 superfícies | A11Y-01 | Abrir cada modal → Tab do último focável volta ao primeiro; Esc fecha; foco retorna ao gatilho |
| PDF com fonte nova | TYPO-01 | Gerar ficha rápida/minuta → `#laudoView` renderiza em Archivo |
| Payload | TYPO-01 | Tamanho do HTML antes/depois registrado no SUMMARY (esperado: +~90KB) |
| Estética premium (juízo humano) | PREM-01 | HUMAN-UAT: o usuário olha e aprova — screenshots antes/depois anexados |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity ok
- [x] No watch-mode flags; latency < 10s
- [x] `nyquist_compliant: true`

**Approval:** approved 2026-07-10
