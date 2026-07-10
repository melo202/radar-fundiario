---
status: partial
phase: 08-busca-unica-inteligente
source: [08-VERIFICATION.md]
started: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Test

[aguardando teste humano — diferido em 2026-07-07 (padrão da Fase 7) para não travar o autônomo]

## Tests

### 1. iOS Safari (aparelho físico): pointerdown + voz
expected: Dropdown/chips fecham no toque fora (pointerdown); input não dá autozoom (16px); botão 🎤 aparece, pede permissão do microfone e o resultado cai na caixa; negar permissão mostra toast com próximo passo.
result: [pending]

### 2. Leitor de tela (VoiceOver/NVDA): chip → menu → desambiguação → dropdown
expected: Chip de confirmação anunciado (aria-live polite); menu de correção navegável; chips de desambiguação e dropdown unificado (Setor/Rua) com roles/announcements corretos.
result: [pending]

### 3. Colar link real do Google Maps (do celular)
expected: Compartilhar → copiar link no app do Maps → colar na caixa única → cai no lote correspondente (formatos de URL variam por plataforma; a validação de bbox deve rejeitar pontos fora de Goiânia com toast honesto).
result: [pending]

## Notas
- Calibração do detectMode com amostra REAL (item 4 da verificação) já foi AUTOMATIZADA pelo orquestrador:
  3000 ruas CNEFE + 400 setores reais — 99,8% addr correto com tipo de via; 100% setores detectados;
  3,6% falso-setor apenas em nomes "CHACARA/FAZENDA" (ambiguidade genuína, chip corrige). Evidência no
  08-VERIFICATION.md e neste arquivo (medição do orquestrador, 2026-07-07).

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
