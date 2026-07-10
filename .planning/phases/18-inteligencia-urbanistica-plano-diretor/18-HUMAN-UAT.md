---
status: partial
phase: 18-inteligencia-urbanistica-plano-diretor
source: [18-VERIFICATION.md]
started: 2026-07-10T14:00:00.000Z
updated: 2026-07-10T14:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Revisão jurídica dos valores e artigos (advogado)
expected: Conferir `PD_TABELA_CA` no radar-goiania.html (AA CA máx 6,0x — Art. 196 II; ADD 5,0x — Art. 196 I; CA básico 1,0x universal — Art. 242 VII; regime de altura 100%/50% — Art. 190 II/III; AOS 12m/40% — Art. 186/190 §3º; 7,5x TDC — Art. 252 §6º citado só na metodologia) contra o texto da LC 349/2022, e validar o texto do disclaimer da SEPLANH.
result: [pending]

### 2. Staleness — leitura integral das emendas pendentes
expected: Ler LC 363/2023, 364/2023, 371/2024 e 373/2024 por inteiro e confirmar que nenhuma altera os Art. 186/190/196/242/252 usados pelo app (as verificadas — LC 358, LC 379 — já constam em `PD_TABELA_CA._meta`).
result: [pending]

### 3. Contraste das zonas em device real
expected: Ligar "Zonas do Plano Diretor" sobre CARTO e satélite em celular sob luz externa — as 6 cores `--zone-*` distinguíveis, legenda legível.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
