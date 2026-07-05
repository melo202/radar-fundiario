---
phase: 02-home-mapa
plan: 01
subsystem: view-state + affordance de busca (mobile core)
tags: [mapa-first, boot, pill, leaflet, a11y]
requires: []
provides:
  - "boot default em data-view=mapa (home = mapa)"
  - "setView('mapa') disparado uma vez no boot (invalidateSize + sync .on)"
  - "searchPill: <button> real, flutuante, sobre .mapwrap, reabre busca existente"
affects:
  - "02-02 (layout desktop overlay + coach-mark) consome o mesmo searchPill/setView"
tech-stack:
  added: []
  patterns:
    - "data-view + setView() reused verbatim — nenhum novo state system"
    - "pill como <button> real com aria-label explícito, zero div-como-botão"
key-files:
  created: []
  modified:
    - radar-goiania.html
decisions:
  - "setView('mapa') chamado imediatamente após initMap() no boot, não substituindo o flip do dataset — garante invalidateSize() e sincronização do estado .on dos botões vbBusca/vbMapa em runtime, sem tocar a função setView em si"
  - "Pill usa box-shadow rgba(20,26,31,.18) (derivado de --ink) em vez de var(--shadow), conforme prescrito no UI-SPEC para elevação sobre tiles variáveis — não é hex novo"
metrics:
  duration_minutes: 5
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
  completed: 2026-07-04
---

# Phase 2 Plan 1: Boot no Mapa + Pill de Busca Flutuante Summary

App agora abre direto no mapa de Goiânia (mobile) em vez da tela de busca, com uma pill "O que você procura?" sempre visível sobre o mapa que reabre 100% do painel de busca já existente.

## What Was Built

**Task 1 — Boot no mapa:** o default de boot `document.body.dataset.view` foi trocado de `"busca"` para `"mapa"` (linha 1801). No ramo `else` que já roda `initMap();loadBairros();initCaixa();` (linha 1805), foi inserido `setView("mapa")` imediatamente após `initMap()`, resultando em `initMap();setView("mapa");loadBairros();initCaixa();`. Isso garante que o `map.invalidateSize()` embutido em `setView()` (linha 874) dispare uma vez no boot — evitando o render cinza do Leaflet — e que os botões `#vbBusca`/`#vbMapa` da barra inferior mobile fiquem sincronizados (`.on`/`aria-pressed`) com o novo estado inicial. A função `setView()` em si e o markup da barra inferior não foram tocados.

**Task 2 — Pill de busca flutuante:** adicionado um `<button id="searchPill" class="searchpill">` real (não `<div>`) dentro de `.mapwrap`, irmão de `#map` (linha 500), com `aria-label="Abrir busca de imóvel"` e conteúdo `🔍 O que você procura?`. O `onclick` chama `setView('busca');focusFirstField()`, reusando 100% o painel de busca e a função de foco já existentes — nenhum markup de busca foi duplicado. CSS `.searchpill` adicionada ao bloco `/* ---------- mapa ---------- */` do `<style>` (linha 161), usando exclusivamente tokens `var(--paper-2)`, `var(--ink)`, `var(--accent)` já existentes, `border-radius:999px`, `min-height:44px`, e `box-shadow:0 4px 14px rgba(20,26,31,.18)` (sombra derivada de `--ink`, não um hex novo). O foco de teclado é herdado automaticamente da regra global `button:focus-visible` (linha 88) — nenhuma regra de foco redeclarada. Nenhum `transition:` foi adicionado.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Performed

- `grep 'dataset.view="mapa"'` presente; `grep -c 'dataset.view="busca"'` = 0.
- `grep 'setView("mapa")'` confirma `initMap();setView("mapa");loadBairros();initCaixa();` na linha 1805.
- `grep 'id="searchPill"'`, `'O que você procura?'`, `'aria-label="Abrir busca de imóvel"'`, `'border-radius:999px'`, `"setView('busca');focusFirstField"` — todos presentes.
- Inspeção manual do bloco CSS `.searchpill` (linhas 161-166): zero hex novo (só `var(--...)` e `rgba(20,26,31,...)` derivado de `--ink`), zero `transition:`.
- `git status --short` confirma que `.planning/STATE.md` e `.planning/ROADMAP.md` NÃO foram tocados por este executor.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: radar-goiania.html (modificado, ambos os commits presentes em `git log`)
- FOUND: a875991 (feat(02-01): boot no mapa)
- FOUND: bc8ef2a (feat(02-01): pill de busca flutuante)
