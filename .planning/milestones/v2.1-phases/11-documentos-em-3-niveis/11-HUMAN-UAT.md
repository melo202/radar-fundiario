---
status: partial
phase: 11-documentos-em-3-niveis
source: [11-VERIFICATION.md]
started: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Test

[aguardando teste humano — diferido em 2026-07-07 (padrão das fases anteriores); nenhum é gap de código]

## Tests

### 1. Fluxo completo no cel + desktop
expected: "Gerar documento" → escolher finalidade → ver recomendação → escolher doc → passos até a Revisão → PDF. Layout ok em 375 e 1280; sem CNAI+CRECI o PTAM é recomendado como Relatório com explicação.
result: [pending]

### 2. Leitor de tela na recomendação
expected: Ao escolher a finalidade, o card "Recomendado para você" é anunciado (aria-live) e recebe foco.
result: [pending]

### 3. Paginação de impressão dos 3 documentos
expected: Ficha rápida = 1 página; Relatório e PTAM paginam sem cortar blocos no meio (imprimir/salvar PDF nos 3 tipos).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
