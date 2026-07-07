---
phase: 13-refino-visual-pinos-motion-descoberta
plan: 03
subsystem: ui
tags: [onboarding, descoberta, lei-da-tela, a11y, localstorage, esc-chain]

# Dependency graph
requires:
  - phase: 13-01
    provides: ".detail{padding:20px 22px}" refino de respiro já aplicado, herdado por .chooser/.onb-card
  - phase: 13-02
    provides: "mAnimate/REDUCE globais reusados no fade REDUCE-safe do onboarding"
provides:
  - "#onbOverlay: onboarding de 3 cartões puláveis com persistência radar_onboard (localStorage, try/catch, fail-open)"
  - "initOnboard/onbAvancar/onbFechar/onbAbrir/onbAbrirDireto — contrato classList 'show' em par com hidden"
  - "initOnboard() pula auto-show quando o boot tem deep-link ?insc= (ficha prometida vence o modal)"
  - "#oQueFaz: segunda <details class=\"foot\"> irmã de 'Fontes & metodologia', 5 CTAs funcionais reais"
  - "Esc fecha onboarding com prioridade máxima na cadeia global (antes de #cmpSheet/#negSheet/#captSheet)"
  - ".chooser auditado e confirmado conforme (herda padding:20px 22px de .detail via 13-01)"
affects: [14-linguagem-gate, 15-territorio]

tech-stack:
  added: []
  patterns:
    - "Onboarding modal com fiação classList('show') SEMPRE em par com atributo hidden — nunca alternar só um dos dois"
    - "Deep-link (?insc=) tem prioridade sobre modais de 1ª visita — checado dentro da própria função de init do modal, fail-open em try/catch"
    - "'O que o Radar faz' como catálogo de CTAs reais (reusa funções já existentes: focusFirstField/toggleCaixa/onbAbrirDireto) — nunca texto explicativo genérico"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "onbAbrirDireto(idx) é reentrada manual (sem checar radar_onboard) — permite 'O que o Radar faz' reabrir o onboarding no cartão certo mesmo após ele já ter sido dispensado"
  - ".chooser não recebeu nenhuma regra CSS nova — já herda .detail{padding:20px 22px} por reuso de classe (class=\"detail chooser\"), classificado como conforme por design (seletor de unidades, cada .chrow é auto-suficiente)"

patterns-established:
  - "Pattern: overlay modal client-side usa display:none + .show{display:flex} — toggle de hidden isolado NUNCA revela; onbAbrir/onbFechar sempre alternam os dois em par"

requirements-completed: [DESC-01]

duration: 25min
completed: 2026-07-07
---

# Phase 13 Plan 03: Onboarding + "O que o Radar faz" + Auditoria da Lei da Tela Summary

**Onboarding modal de 3 cartões com persistência `radar_onboard`, foco gerenciado, Esc prioritário e skip por deep-link `?insc=`; catálogo "O que o Radar faz" com 5 CTAs reais no rodapé; `.chooser` confirmado conforme por herança de padding.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-07
- **Tasks:** 2/2 completed
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- `#onbOverlay` (linha 991) inserido como filho direto de `<body>`, fora de `.mapwrap`/`<aside>`, próximo a `.toast`/`#loading` — aparece independente de `document.body.dataset.view`, conforme a spec de overlay modal global.
- `ONB_CARDS` + `initOnboard()`/`onbRender()`/`onbAbrir()`/`onbAvancar()`/`onbFechar()`/`onbAbrirDireto()` (a partir da linha 4778), posicionados imediatamente após `initCoach()`/`dismissCoach()` — independentes, `initCoach()` intocado.
- `initOnboard()` chamado em `init()` na mesma linha de `initCoach()`: `initMap();setView("mapa");initCoach();initOnboard();loadBairros()...` — vem depois do coach, antes de `loadBairros()` (não depende de dados de bairro).
- Contrato de fiação do plan-check cumprido: `onbAbrir()` faz `ov.hidden=false; ov.classList.add("show")` (par); `onbFechar()` faz `ov.hidden=true; ov.classList.remove("show")` (par) — verificado via regex no script de verificação da Task 1.
- Contrato de deep-link cumprido: `initOnboard()` retorna imediatamente (sem mostrar o overlay) se `new URLSearchParams(location.search).get("insc")` existir, em `try/catch` fail-open — a ficha prometida pelo link compartilhado vence o modal de 1ª visita.
- Cadeia de Esc (linha ~4752): novo primeiro check `const onb=document.getElementById("onbOverlay"); if(onb&&!onb.hidden){onbFechar();return;}` — inserido ANTES do check de `#cmpSheet`, prioridade máxima confirmada por leitura da ordem dos `if`.
- `#oQueFaz` (linha 894) inserido dentro de `<aside>`, imediatamente ANTES de `<details class="foot">` ("Fontes & metodologia") — 5 `<li>` com CTA real cada: "Buscar agora →" (`focusFirstField()`), "Ver como →" ×3 (`onbAbrirDireto(1)`/`onbAbrirDireto(2)`/`onbAbrirDireto(2)`), "Ver no mapa →" (`toggleCaixa()`).
- `.oqf-lista`/`.onb-*` CSS adicionados em blocos comentados "Fase 13 DESC-01", reusando exclusivamente `var(--ink)`/`var(--paper-2)`/`var(--muted)`/`var(--line)`/`var(--accent)`/`var(--accent-ink)` e `#fff` (já preexistente em `.go`/`.detail .acts button.primary`) — zero hex novo confirmado via diff (`git diff` mostra apenas `#fff` adicionado, e este já era padrão preexistente).
- Auditoria do `.chooser`: confirmado por leitura (`class="detail chooser" id="chooser"`, linha 978) que ele já reusa `.detail`, cujo padding foi refinado para `20px 22px` na 13-01 (linha 311 do CSS: `.detail{...padding:20px 22px...}`) — CSS cascade propaga automaticamente, nenhuma regra nova necessária. Classificado "conforme por design": é um seletor de unidades, cada `.chrow` é auto-suficiente como ação primária da própria linha.

## Task Commits

1. **Task 1: Onboarding — HTML/CSS/JS + persistência + foco + Esc** — `6d03046` (feat)
2. **Task 2: "O que o Radar faz" + auditoria do .chooser (lei da tela)** — `e050271` (feat)

## Files Created/Modified

- `radar-goiania.html` — `#onbOverlay` (HTML+CSS+JS completo do onboarding), `#oQueFaz` (HTML+CSS), entrada na cadeia de Esc, chamada `initOnboard()` em `init()`.

## Posição exata de inserção de `#onbOverlay` no DOM

Filho direto de `<body>`, imediatamente ANTES do bloco `<!-- toast/loading ficam FORA do .mapwrap -->` (linha 991), ou seja, depois do fechamento de `</div>` de `.mapwrap` e antes de `#toast`/`#loading`. Não está dentro de `.mapwrap` nem de `<aside>` — garante visibilidade independente de `document.body.dataset.view` ("mapa" ou "busca").

## Resultado da auditoria do `.chooser`

`#chooser` usa `class="detail chooser"` (linha 978) — herda `.detail{padding:20px 22px}` (refinado na 13-01, linha 311) via cascata CSS pura, sem nenhuma regra `.chooser`-específica de padding necessária. Confirmado por leitura direta do CSS computado da classe base. Classificado **conforme por design**: é um seletor de unidades onde cada `.chrow` já é a ação primária da própria linha — não há CTA de tela separada a adicionar (Componente 5 do UI-SPEC).

## Os 5 CTAs de "O que o Radar faz"

| Item | Texto | CTA | Função chamada |
|---|---|---|---|
| 1 | Busca unificada | "Buscar agora →" | `focusFirstField()` (já existente) |
| 2 | Valor e oportunidade | "Ver como →" | `onbAbrirDireto(1)` → reabre onboarding no cartão 2/3 |
| 3 | Documentos prontos | "Ver como →" | `onbAbrirDireto(2)` → reabre onboarding no cartão 3/3 |
| 4 | Ação comercial | "Ver como →" | `onbAbrirDireto(2)` → reabre onboarding no cartão 3/3 |
| 5 | Oportunidades da Caixa | "Ver no mapa →" | `toggleCaixa()` (já existente) |

Nenhuma função nova foi criada além de `onbAbrirDireto(idx)` (wrapper de 1 linha sobre `onbAbrir(idx)`, já coberta na Task 1) — todos os outros CTAs reusam funções 100% preexistentes no app.

## Decisions Made

- `onbAbrirDireto(idx)` implementado como reentrada manual — nunca verifica/seta `radar_onboard`, permitindo que o usuário reabra o onboarding a qualquer momento via "O que o Radar faz" sem que isso conte como "1ª exibição" nem afete a persistência de "já visto".
- `.chooser` não recebeu CSS novo — decisão de NÃO duplicar a regra de padding, confiando 100% na herança de classe (`.detail`), evitando especificidade redundante.

## Deviations from Plan

None - plan executed exactly as written. Os dois contratos pós plan-check (fiação `classList.add/remove("show")` em par com `hidden`; skip de `initOnboard()` no deep-link `?insc=`) já vieram especificados literalmente na seção `<interfaces>` do plano e foram copiados sem alteração.

## Issues Encountered

None. Os números de linha citados nos `<facts>` do plano (baseados em snapshot anterior do arquivo) divergiram levemente dos números reais no momento da execução (ex.: `.foot`/`#chooser` estavam em linhas diferentes das citadas, devido às plans 13-01/13-02 já terem inserido código antes desta plan rodar) — isso é esperado (drift normal entre planejamento e execução sequencial) e não afetou a implementação, pois todas as inserções foram feitas por âncora de texto único (`old_string` exato), não por número de linha.

## User Setup Required

None - no external service configuration required.

## Verificação Executada

- Script de verificação da Task 1 (fiação `show`/`hidden` em par + skip de `?insc=`): **OK**.
- Script de verificação da Task 2 (presença de `#oQueFaz`/`.oqf-lista`/CTAs): **OK**.
- `node --test tests/*.test.mjs`: **107/107 passing** após cada task (zero regressão, RADAR_PURE intocado).
- `git diff` das duas tasks: único hex novo introduzido é `#fff`, já confirmado como padrão preexistente (`.go`/`.detail .acts button.primary`), não é cor nova.

## Nota final — Fase 13 completa

Os 4 success criteria do ROADMAP para a Fase 13 estão cumpridos pelas 3 plans:
- **VIS-01** (13-01): sistema `--status-*` + refino de respiro (lista explícita de seletores antes→depois).
- **PIN-01** (13-02): pinos semânticos coloridos por status + legenda discreta + a11y do popup/tooltip.
- **MOT-01** (13-02): motion de busca em 5 etapas atreladas a fases reais de `buscar()` + skeleton shimmer REDUCE-safe.
- **DESC-01** (13-03, esta plan): onboarding de 3 cartões puláveis com persistência correta + "O que o Radar faz" com CTAs reais + `.chooser` auditado e confirmado conforme — lei da tela varrida em todas as superfícies pendentes da fase.

Fase 13 (refino-visual-pinos-motion-descoberta) pronta para fechamento.

## Next Phase Readiness

- Onboarding e "O que o Radar faz" prontos para uso em produção; nenhum bloqueio.
- Fase 14 (gate de linguagem) pode consumir os textos desta fase como já alinhados ao padrão esperado (copy pt-BR sem jargão, já confirmado no UI-SPEC como antecipação do gate).
- Fase 15 (território) não depende de nada desta plan.

---
*Phase: 13-refino-visual-pinos-motion-descoberta*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/13-refino-visual-pinos-motion-descoberta/13-03-SUMMARY.md
- FOUND: 6d03046 (Task 1 commit)
- FOUND: e050271 (Task 2 commit)
