---
phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha
plan: 03
status: complete
requirements: [MALHA-01]
completed: 2026-07-05
---

# 07-03 — Tuning da malha de bairros (mobile) — SUMMARY

## O que foi feito (MALHA-01)
Ajuste de UX da malha de bairros no `radar-goiania.html`, só com valores de estilo (zero hex novo, zero `transition:` novo):

- **Idle "sussurra"** — `BAI_STYLE`: `weight` 1 → **0.6**, `opacity` .8 → **0.4**, `fillOpacity` .03 → **0.02** (near-transparent mas ainda clicável). `bubblingMouseEvents:false` e `pane:"bairros"` preservados.
- **Highlight "grita"** — `BAI_HOVER` inalterado (accent `_BAI_ACCENT`, `weight:2.5`, `opacity:1`, `fillOpacity:.08`); contraste idle→highlight agora bem nítido.
- **Densidade por zoom** — `baiStyle()` passou a ramper por `map.getZoom()`: `t=clamp((z-12)/4)`, idle `weight` **0.5→1.2** e `opacity` **0.35→0.5** de z≤12 a z≥16. Branch `satelliteOn` preservado (solta o wash, reforça o traço: weight 1.2→1.8, fillOpacity 0).
- **Re-aplicação por zoom** — o `map.on("zoomend")` **existente** (único) foi estendido: no branch z<17 chama `bairroLayer.setStyle(baiStyle)` e re-aplica `BAI_HOVER` no `baiHi` ativo (não perde o destaque ao dar zoom). Gate z≥17 (bairros somem, dão lugar aos lotes) intacto.
- **Toque na área** — fill clicável garantido (`fillOpacity 0.02 > 0` + `bubblingMouseEvents:false`); lógica 1º-toque-highlight / 2º-toque-drill e hover/click desktop inalteradas.

## Verificação
- Asserts do plano (T1 sem hex novo + fill clicável + accent no hover; T2 um único zoomend + setStyle por zoom + baiStyle sensível a getZoom) — **passam**.
- Preview (zoom instantâneo): rampa confirmada — z11 `w0.5/op0.35`, z13 `w0.68/op0.39`, z15 `w1.02/op0.46`, z16 `w1.2/op0.5`. Idle (op 0.35–0.5, fillOpacity 0.02) vs highlight (weight 2.5, op 1, fillOpacity 0.08) = contraste nítido. Fill clicável = true. Zero erro de console.
- Nomes no tooltip vêm do `nm_disp` corrigido (Plano 01) — via `esc()` (sanitização preservada).

## Valores finais
- Idle base (`BAI_STYLE`): weight 0.6, opacity 0.4, fillOpacity 0.02.
- Rampa idle (`baiStyle`): weight 0.5→1.2, opacity 0.35→0.5 (z 12→16); satélite: weight 1.2→1.8, fillOpacity 0.
- Highlight (`BAI_HOVER`): accent, weight 2.5, opacity 1, fillOpacity 0.08.
- Zero hex/transition novo; drill + gate z≥17 sem regressão.

## Checkpoint (Task 3)
Verificação visual (mobile 375 + desktop) fica com o usuário ao vivo — a mecânica está verificada por valores computados + console limpo.
