---
phase: 09-ficha-conclusao-comercial-scores
status: complete
source: 09-REVIEW.md
completed: 2026-07-07
---

# 09 — Review Fix Summary (aplicado pelo orquestrador)

| Achado | Sev | Fix | Verificação |
|--------|-----|-----|-------------|
| WR-01: `.primary` só estilizava `a.primary` — a CTA "Gerar documento" é `<button>` e ficava igual às secundárias | warning | Regra CSS estendida p/ `button.primary` (+hover) | Preview: bg rgb(181,69,31) + texto branco ✓ |
| WR-02: `atualizarScores` lia `statsR.radius` que nunca era setado — o porquê citava sempre "400 m" mesmo com busca alargada p/ 800 m | warning | `r.radius=radius` anexado em renderComps antes de `atualizarScores(a,r)` (o raio REAL da busca em duas camadas) | grep + 34/34 testes |
| IN-01: comparador `<` vs `<=` divergente entre scoreOportunidade e renderComps | info | Alinhado p/ `<=` nos dois (diffPct=0 vira "na mediana" na frase de qualquer forma) | 34/34 testes |
| IN-02: "Mercado (estimado)" no dValor E no dGrid recolhido | info | Mantido (intencional: resumo na 1ª dobra, detalhe no técnico) — candidato de limpeza da Fase 13 | — |

Limpos no review (sem fix): guards DCUR/SHEETGEN eficazes; esc() em todas as interpolações; zero texto livre em onclick; consistência |myPm2-med|/med*100 nas duas superfícies; a7a4646/mobile sheet intactos.

`node --test "tests/*.test.mjs"` → **34 pass / 0 fail**.
