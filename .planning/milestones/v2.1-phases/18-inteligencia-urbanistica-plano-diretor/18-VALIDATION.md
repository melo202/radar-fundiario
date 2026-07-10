---
phase: 18
slug: inteligencia-urbanistica-plano-diretor
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-10
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in test runner, ESM) |
| **Config file** | package.json (`scripts.test`) |
| **Quick run command** | `node --test tests/pd.test.mjs` (novo arquivo desta fase) |
| **Full suite command** | `npm test` (baseline 184 testes verdes, 2026-07-10) |
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
| (preenchido pelo planner) | — | — | PD-01..05 | — | Número `conferido:false` NUNCA renderiza; bateria só por lote (sem avalanche); geometria de zonas limitada à viewport; fallback do detector nunca quebra | unit (TDD RADAR_PURE) + grep | `npm test` + greps | ❌ W0 (tests/pd.test.mjs) | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/pd.test.mjs` — TDD: resolução sigla→regras (PD_TABELA_CA com flags `conferido`), montagem/parse da bateria de layers, fator potencial-construtivo do score (com/sem CA conferido), detector upgrade `areaedif/potencial` com fallback gracioso p/ `areaedif/areaterr`, formatação da seção Urbanístico (variantes com-CA/só-zona/rural)
- [ ] Fixtures: respostas sintéticas das layers (AA/ADD/rural/vazio/erro parcial), lotes com/sem zona
- [ ] Guard de honestidade testado: item com `conferido:false` → função de render de CA retorna null/omitido (nunca número)

**Números conferidos (fonte primária, 18-RESEARCH.md):** CA básico=1,0 universal (Art. 242 VII); AA máx=6,0 (Art. 196 II; 7,5 só TDC Art. 252 §6º — só na metodologia); ADD máx=5,0 (Art. 196 I); AAB/AOS sem CA numérico (altura 12m; Jaó/Sul 7,5m Art. 186; AOS ocupação 40% Art. 190 §3º). Fonte citada como "Art. X, LC 349/2022" — nunca "Anexo".

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Revisão jurídica dos valores/artigos e do disclaimer | PD-02/03 | Usuário é advogado — revisão final natural | Conferir PD_TABELA_CA (valores + citações de artigo) contra a LC 349/2022 e emendas; validar texto do disclaimer |
| Staleness completa (LC 363/364/371/373 lidas por inteiro) | PD-02 | Leitura jurídica extensa | Confirmar que nenhuma emenda altera os artigos do gate |
| Bateria ao vivo na ficha (9 queries, 1 lote) | PD-01 | Endpoint real | Abrir ficha → accordion Urbanístico resolve zona; DevTools: ~9 requests pequenos, cache na reabertura |
| Choropleth de zonas sobre CARTO/satélite em device | PD-05 | Percepção visual | Toggle zonas; contraste AA; exclusividade com choropleth de valor |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-10 (números do gate conferidos na fonte primária durante a pesquisa; verificação browser via preview no fim da execução)
