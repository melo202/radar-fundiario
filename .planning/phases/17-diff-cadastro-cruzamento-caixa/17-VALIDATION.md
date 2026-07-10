---
phase: 17
slug: diff-cadastro-cruzamento-caixa
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-10
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in test runner, ESM) |
| **Config file** | package.json (`scripts.test`) |
| **Quick run command** | `node --test tests/caderno.test.mjs` (diff/snapshot) |
| **Full suite command** | `npm test` (baseline 141 testes verdes, 2026-07-10) |
| **Estimated runtime** | ~5-10 segundos |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (preenchido pelo planner) | — | — | TERR-06/07 | — | `sanitizeCaderno` valida sub-objeto snapshot recursivamente (allowlist); diff nunca exibe PII; matching de bairro sem falso positivo (74% match exato medido; sem match → não destaca) | unit (TDD pure/IO split) + grep | `npm test` + greps | ✅ (tests/caderno.test.mjs estende) | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Testes novos em `tests/caderno.test.mjs`: `diffLote` (mudança/sem mudança/threshold 1%/campo null), formatação comercial, `sanitizeCaderno` com sub-objeto snapshot (recursivo; PII no snapshot é removida), validação de import com snapshot
- [ ] Testes de matching Caixa: normalização de nome (`norm()`), colisão 1-nome→N-cdbairros (resolve para conjunto), sem match → array vazio (nunca falso positivo), guard `i.x&&i.y`
- [ ] Fixtures: itens de caderno com snapshot, imóveis Caixa sintéticos (com/sem x/y, nomes com acento)

**Chave de identidade:** o diff usa `clean(a.ci||a.nrinscr)` (fórmula do Caderno) — NUNCA a variável local `ci` de `showDetail` (divergência documentada na pesquisa).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Diff na revisita real | TERR-06 | Fluxo browser + IDB | Salvar lote → editar snapshot no DevTools (simular mudança de vlvenal) → reabrir ficha → bloco de diff mostra a mudança; sem mudança → linha discreta |
| Badge/linha Caixa | TERR-07 | Render real | Salvar lote de setor com imóvel Caixa → badge no Caderno + linha no painel; toque → abre pino/popup |
| Snapshot atualizado pós-diff | TERR-06 | IDB real | Após ver o diff, dump: snapshot ganhou os valores novos + snapshotAt atual |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-10 (estratégia derivada da pesquisa; verificação browser via preview no checkpoint/verify)
