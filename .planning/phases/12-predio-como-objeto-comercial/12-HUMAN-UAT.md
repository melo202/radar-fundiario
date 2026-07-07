---
status: partial
phase: 12-predio-como-objeto-comercial
source: [12-VERIFICATION.md]
started: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Test

[diferido em 2026-07-07; itens de aparelho real — os checkáveis em preview (persistência do painel, FAB×toast, ordenação sem duplicar, sheet/Esc) já foram confirmados pelo orquestrador]

## Tests

### 1. Resumo do prédio no cel (visual)
expected: Buscar um prédio real (ex.: "sumer park"): resumo legível (unidades/área média/venal/estimado/faixa), contraste ok, ações acessíveis.
result: [pending]

### 2. Zero requisições extras (DevTools Network)
expected: Ordenar/filtrar/comparar não dispara NENHUMA requisição de rede (tudo client-side sobre a lista já carregada).
result: [pending]

### 3. Scroll horizontal da tabela de comparação no cel
expected: Com 4 unidades marcadas, a tabela rola horizontalmente DENTRO do sheet; a página nunca rola de lado.
result: [pending]

### 4. Alvos de toque 44px (chips de ordenação)
expected: Chips e toggles confortáveis no dedo (DevTools ou uso real).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
