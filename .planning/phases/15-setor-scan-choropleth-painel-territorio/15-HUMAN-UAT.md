---
status: partial
phase: 15-setor-scan-choropleth-painel-territorio
source: [15-VERIFICATION.md]
started: 2026-07-09T23:30:00.000Z
updated: 2026-07-09T23:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Contagem de requisições ao vivo no Bueno
expected: Abrir o painel/choropleth do Setor Bueno (cdbairro=16, ~57k lotes) com DevTools Network aberto — no máximo 3 requisições paginadas ao MapServer/3/query + 1 returnCountOnly. Reabrir o painel do mesmo setor não dispara nenhuma nova requisição (cache de sessão).
result: [pending]

### 2. Timing do scan em 4G real (campo)
expected: Varredura de setor grande completa em tempo aceitável no 4G (com loading em etapas visível); phase flag não-bloqueante do ROADMAP.
result: [pending]

### 3. Legibilidade AA do choropleth sobre satélite em luz externa
expected: As 5 faixas azuis distinguíveis sobre imagem de satélite em device real sob sol; legenda legível.
result: [pending]

### 4. Toque na área com fill de quantil (mobile)
expected: Tocar bairro colorido e bairro neutro destaca e mostra o nome normalmente (hit-area preservada com o novo fill).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
