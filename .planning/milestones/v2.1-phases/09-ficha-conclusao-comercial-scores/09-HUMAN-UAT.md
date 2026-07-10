---
status: partial
phase: 09-ficha-conclusao-comercial-scores
source: [09-VERIFICATION.md]
started: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Test

[aguardando teste humano — diferido em 2026-07-07 (padrão das Fases 7-8); nenhum é gap de código, só confirmação ao vivo]

## Tests

### 1. Hierarquia visual da ficha (cel 375 + desktop)
expected: Abrir uma ficha: faixa de valor em DESTAQUE no topo; 2 cards de score legíveis; "Gerar documento" é visivelmente o botão principal (fundo terracota); dados técnicos recolhidos num accordion no fim.
result: [pending]

### 2. Navegação por teclado (desktop)
expected: Tab passa pelos botões de score (Enter/Espaço abre o "por quê"), accordions (details) abrem por teclado, foco sempre visível.
result: [pending]

### 3. Estados honestos com dado degradado real
expected: Imóvel sem venal → "não informado" + confiança baixa citando a pendência; imóvel sem vizinhança suficiente → "Sem base para estimar" (sem número). (Já exercitado no preview do orquestrador com mock — confirmar com um caso real.)
result: [pending]

### 4. Consistência score ↔ comparáveis ao vivo
expected: Rodar "Analisar vizinhança" numa ficha real: o percentual do card de score ("X% abaixo/acima da mediana") é IDÊNTICO ao da frase de conclusão dos comparáveis.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
