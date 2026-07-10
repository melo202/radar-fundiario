---
phase: 16
slug: detector-subutilizado-farming-caderno
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in test runner, ESM) |
| **Config file** | package.json (`scripts.test`) |
| **Quick run command** | `node --test tests/caderno.test.mjs` (novo) / `tests/territorio.test.mjs` (detector) |
| **Full suite command** | `npm test` (baseline 121 testes verdes, 2026-07-09) |
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
| (preenchido pelo planner) | — | — | TERR-04/05 | — | `sanitizeCaderno()` allowlist positiva (nunca `dtnascimen`); detector zero requisições próprias; falha de escrita IDB visível | unit (TDD pure/IO split) + grep | `npm test` + greps | ❌ W0 (tests/caderno.test.mjs) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/caderno.test.mjs` — TDD das funções puras do caderno (sanitizeCaderno allowlist, enum de status/transições, validação de import JSON, serialização de export) via padrão `loadPureBlock()`
- [ ] Testes do detector em `tests/territorio.test.mjs` (medianasPorQuadra, filtro candidato com guarda 0-vs-null, ordenação) — bordas: `areaedif===0` real INCLUI; `areaedif==null` EXCLUI
- [ ] Fixtures novas em `tests/fixtures.mjs` (lotes com null/0/valores)

**Pitfall a testar explicitamente:** o padrão de exibição `a.areaedif?X:"—"` trata 0 e null igual — o detector NÃO pode copiá-lo (excluiria terrenos vagos reais).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Persistência entre sessões | TERR-05 | Reload real do navegador | Salvar lote no caderno → fechar aba → reabrir → item presente com status/tag/nota |
| Ausência de PII no IndexedDB | TERR-05 | DevTools Application | DevTools → Application → IndexedDB → radar_territorio → dump dos stores: nenhum campo fora da allowlist, nunca `dtnascimen` |
| Falha de escrita visível | TERR-05 | Simulação de quota/privado | Modo privado/quota cheia → toast de erro com saída (nunca falha silenciosa) |
| Export/import roundtrip | TERR-05 | Download/upload real | Exportar JSON → limpar → importar → itens restaurados |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
