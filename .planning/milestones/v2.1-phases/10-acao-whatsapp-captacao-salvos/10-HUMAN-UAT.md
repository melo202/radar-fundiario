---
status: partial
phase: 10-acao-whatsapp-captacao-salvos
source: [10-VERIFICATION.md]
started: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Test

[aguardando teste humano — diferido em 2026-07-07 (padrão das fases anteriores); nenhum é gap de código]

## Tests

### 1. Layout do grupo WhatsApp + sheet de Captação (cel 375 + desktop)
expected: Na ficha → "Mais opções": 5 botões de WhatsApp largura total alinhados à esquerda + "🧾 Captar este imóvel"; o sheet de Captação abre com 4 blocos legíveis + botões copiar + disclaimer; Esc/× fecham e o foco volta.
result: [pending]

### 2. Contraste em composição real (hover/focus dos componentes novos)
expected: Botões zap/captar/⭐/remover com hover e foco visíveis e legíveis sobre o papel.
result: [pending]

### 3. Teclado no sheet de Captação
expected: Tab percorre os blocos/botões; Esc fecha. (Gap conhecido: sem focus-trap — igual ao wizard pré-existente; registrado p/ Fase 13.)
result: [pending]

### 4. Storage cheio / item obsoleto
expected: Com armazenamento cheio, salvar mostra o toast de falha e o ⭐ NÃO muda de estado; reabrir uma oportunidade cujo imóvel sumiu do cadastro cai no erro padrão da busca.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
