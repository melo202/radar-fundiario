# Deferred Items — Phase 13

Items discovered during execution that are out of scope for the current task's changes
(pre-existing code, unrelated to the task at hand) and therefore not fixed inline.

## From 13-02 (Task 1: pinos semânticos)

- **`verNoMapa(ci)` (radar-goiania.html, ~linha 3198-3201)**: ao "piscar" um pino ao navegar
  para ele pelo botão "no mapa ↗" do cabeçalho de prédio, usa um `setStyle` temporário com
  `fillColor:"#c9691f"` (accent-2, igual à seleção) e depois RESTAURA para o fixo antigo
  `fillColor:"#b5451f"` via `setTimeout` — o mesmo padrão que `pick()` tinha antes desta plan.
  A 13-02-PLAN.md especificou apenas `plot()`/`pick()` como pontos de restauração de estilo
  (linha ~3096-3101 do plano, escopo do Task 1) — `verNoMapa` não foi mencionado nos `<facts>`/
  `<action>` do plano, portanto está fora do escopo desta task (Rule: só corrigir o que a task
  atual toca). Efeito prático: o "flash" de destaque do botão "no mapa ↗" volta para o óxido fixo
  em vez do status real do pino, por 1.3s, antes do próximo `plot()`/`pick()` corrigir. Não é uma
  regressão desta plan (o comportamento já era assim antes) — registrado para uma fase futura
  (ou uma 13-0X de ajuste) trocar por `PINO_STYLE[statusPino(a)]`/`bestStatusPorCi`, reusando a
  mesma fonte de verdade criada nesta plan.
