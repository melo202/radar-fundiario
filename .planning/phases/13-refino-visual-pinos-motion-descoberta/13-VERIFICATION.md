---
phase: 13-refino-visual-pinos-motion-descoberta
verified: 2026-07-10T00:00:00Z
status: human_needed
score: 4/4 must-haves verified (automated) — 3 human-perception items pending
overrides_applied: 0
notes:
  - "Verificação RETROATIVA: fase completada em 2026-07-07 sem VERIFICATION.md. Dois findings CRITICAL (CR-01, CR-02) do 13-REVIEW.md (2026-07-07) foram corrigidos em 2026-07-10 (ver 13-REVIEW-FIX.md) e re-confirmados nesta verificação diretamente no código atual."
human_verification:
  - test: "Abrir o app em produção/preview, confirmar visualmente o refino de respiro (VIS-01) — espaçamento mais folgado em .detail/.dvalor/.card/.bldg-head etc, cor aparecendo SÓ em contexto de status (nunca decorativa)"
    expected: "Hierarquia visual limpa, sem o óxido (--accent) parecendo alerta constante fora dos contextos de status/erro"
    why_human: "Percepção visual de contraste/hierarquia não é verificável por grep — precisa de olho humano em viewport real (mobile 375 + desktop 1280, conforme nota do 13-02-SUMMARY.md)"
  - test: "Rodar uma busca real no app e observar a sequência de mensagens de loading (Localizando → Consultando cadastro → Calculando estimativa → [Buscando comparáveis] → Preparando mapa) e o skeleton shimmer aparecendo/sumindo"
    expected: "Mensagens trocam em sincronia com as fases reais da busca (sem 'pulos' ou mensagens presas); skeleton aparece brevemente e é sempre substituído pelo resultado real; sob prefers-reduced-motion o skeleton fica estático mas visível"
    why_human: "Timing/motion percebido (fluidez, ausência de flicker) não é verificável estaticamente — precisa de execução ao vivo com rede real"
  - test: "Testar o onboarding de 3 cartões no primeiro acesso (localStorage limpo) em mobile e desktop: navegação Próximo/Pular/Esc, foco visível em .onb-skip ao abrir, foco retornando a #searchPill/elemento anterior ao fechar"
    expected: "Onboarding aparece uma única vez, nunca mais após fechar; foco gerenciado corretamente; Tab não escapa para o fundo (ressalva: IN-03 do 13-REVIEW.md documenta que não há focus trap — comportamento aceito/deferido, não é regressão desta fase)"
    why_human: "Comportamento de foco/teclado em navegador real não é 100% verificável por grep estático — o wiring foi confirmado no código, mas a experiência de uso pede teste manual"
---

# Phase 13: Refino Visual, Pinos Semânticos, Motion & Descoberta Progressiva — Verification Report

**Phase Goal:** A cara "cockpit premium" — limpa, com cor só onde significa status (VIS-01), pinos semânticos (PIN-01), motion de busca em etapas + skeleton (MOT-01), onboarding ≤3 telas + "O que o Radar faz" (DESC-01), lei da tela.
**Verified:** 2026-07-10 (retroativo)
**Status:** human_needed
**Re-verification:** No — initial verification (retroactive; no prior VERIFICATION.md existed). Findings from the code review (13-REVIEW.md, 2026-07-07) and their fixes (13-REVIEW-FIX.md, 2026-07-10) were folded into this verification's evidence.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 8 vars `--status-*`/`--status-*-ink` existem no `:root`, cada uma alias de hex já existente | ✓ VERIFIED | `radar-goiania.html:54-61` — `--status-bom:var(--lot)`, `--status-atencao:var(--gold)`, `--status-risco:var(--accent)`, `--status-caixa:var(--gold)`, `--status-semdado:var(--muted)` + inks, único literal documentado (`--status-atencao-ink:#7d621f`) |
| 2 | Os 10 seletores de refino de respiro têm os valores "depois" (padding/margin/gap/border) | ✓ VERIFIED | `.detail{padding:20px 22px}` confirmado (`radar-goiania.html:395-396`); 13-01-SUMMARY.md documenta os 11 valores antes/depois lidos pós-edição |
| 3 | `statusDeUnidade(input)` pura no RADAR_PURE, bandas 66/33 idênticas a `scoreOportunidade`, nunca lança exceção | ✓ VERIFIED | `radar-goiania.html:2294` (`function statusDeUnidade`); `tests/scores.test.mjs:98-115` cobre bandas + nunca-lança-exceção + nunca-retorna-'caixa'; suite verde |
| 4 | Pino nasce com a cor do status via `statusDeUnidade(a.__scores)` — bom/atencao/risco/semdado; CAIXA permanece dourado, camada separada | ✓ VERIFIED (pós-fix CR-01) | `statusPino()`/`PINO_STYLE`/`bestStatusPorCi()` em `radar-goiania.html:5169-5200`; `plot()` usa `PINO_STYLE[status]` (linha ~5243); CR-01 (13-REVIEW-FIX.md) adicionou `recolorPinoCi()` (linha 5401, chamado em `atualizarScores()` linha 5427) + `scoresDePlot()`/`TERRSTAT` (linhas 2414, 3850-3908) para colorir pinos com dados reais do scan de setor sem requisição nova — confirmado presente no código atual |
| 5 | Abrir a ficha recalcula `a.__scores`; próximo `plot()` mostra a cor correta, sem requisição nova | ✓ VERIFIED (pós-fix CR-01) | `recolorPinoCi(ci)` chamado ao final de `atualizarScores()` (linha 5427) recolore o pino IMEDIATAMENTE (não só na próxima busca) — evolução além do que a 13-02-PLAN.md original previa, corrigindo a lacuna apontada pelo CR-01 |
| 6 | Pino cinza (semdado) continua clicável | ✓ VERIFIED | `onclick` do marker inalterado por `statusPino`/`PINO_STYLE` — só estilo/tooltip mudam, roteamento de clique preservado (confirmado por leitura do plot()) |
| 7 | `.pino-legenda` aparece quando há pinos plotados, oculta quando lista vazia/antes de busca | ✓ VERIFIED | `atualizarLegenda(temPinos)` (`radar-goiania.html:5198`) chamado ao final de `plot()`; WR-01 (fix) também zera a legenda em `mostrarBairro()` para não ficar "presa" após busca de bairro que não usa `plot()` |
| 8 | Tooltip do pino com `${statusLabel} - ${endereço}` escapado | ✓ VERIFIED | `radar-goiania.html:5247` — `` `${STATUS_LABEL[status]} · ${esc(unitLabel(a)||addrDe(a)||"Imóvel")}${hint}` `` |
| 9 | `buscar()` dispara a sequência real de 5 mensagens (Localizando → Consultando cadastro → Calculando estimativa → [Buscando comparáveis] → Preparando mapa), atreladas a fases reais | ✓ VERIFIED | `MOTION_MSG` (linha 3781) usado em `buscar()` (linhas 4600-4679), `finish()` (linhas 4772/4776), `compare()` (linha 6234, guarda condicional `classList.contains("show")`) |
| 10 | Skeleton shimmer (`.skel-card`/`.skel-line`) aparece em `#results` durante a busca; REDUCE-safe | ✓ VERIFIED (pós-fix CR-02) | `SKELETON_HTML`/`mostrarSkeleton()` (linhas 3798-3801); CSS `.skel-card`/`@keyframes skel-shimmer`/`prefers-reduced-motion` (linhas 246-249); CR-02 fix adiciona `prevResults` snapshot (linha 4597) + restauração em TODOS os 7 early-returns via `.skel-card` detection (linha 4720) — nunca fica "pendurado" |
| 11 | Onboarding aparece no 1º acesso (sem `radar_onboard`), 3 cartões, Pular sempre visível, Começar no 3º fecha e persiste, nunca reaparece automaticamente | ✓ VERIFIED | `ONB_CARDS`/`initOnboard()`/`onbAvancar()`/`onbFechar()` (linhas 7301-7349); `localStorage.getItem/setItem("radar_onboard")` em try/catch; deep-link `?insc=` tem prioridade (skip do auto-show) |
| 12 | `initCoach()`/`radar_coach` permanece intocado; onboarding independente | ✓ VERIFIED | `initCoach()` não modificado pelos diffs documentados (13-03-SUMMARY.md); `initOnboard()` chamado no mesmo bloco de `init()`, função separada |
| 13 | "O que o Radar faz" aparece no rodapé, irmão de "Fontes & metodologia", 5 CTAs funcionais reais | ✓ VERIFIED | `#oQueFaz` (linha 1066), `.oqf-lista` (linha 1069); CTAs chamam `focusFirstField()`/`onbAbrirDireto(1)`/`onbAbrirDireto(2)`×2/`toggleCaixa()` — todas funções reais preexistentes ou criadas nesta fase |
| 14 | `.chooser` recebe o padding refinado (20px 22px) herdado de `.detail` via reuso de classe | ✓ VERIFIED | `<div class="detail chooser" id="chooser">` (linha 1270); `.detail{padding:20px 22px}` (linha 396) — herança de classe confirmada, zero regra CSS nova necessária |
| 15 | Onboarding REDUCE-safe (mAnimate/fade, instantâneo sob prefers-reduced-motion, nunca sem conteúdo) | ✓ VERIFIED (estático) / ? precisa confirmação visual | `onbAbrir()` chama `mAnimate(ov,{opacity:[0,1]},{duration:0.18})` que retorna `null` sob REDUCE (padrão já estabelecido no app) — wiring correto; comportamento visual sob REDUCE listado em Human Verification |
| 16 | Foco gerenciado: abrir onboarding foca `.onb-skip`; Esc fecha com prioridade máxima (antes de `#cmpSheet`/`#negSheet`/`#captSheet`); fechar retorna foco | ✓ VERIFIED | `onbAbrir()` chama `skip.focus()`; cadeia de Esc (linha ~7389) checa `#onbOverlay` como PRIMEIRO item, antes de `#terrPanel`/`#cmpSheet`/`#negSheet`/`#captSheet`; `onbFechar()` restaura `onbLastFocus` ou `#searchPill` |

**Score:** 16/16 truths automaticamente verificáveis passam (incluindo confirmação de que os 2 CRITICAL findings do code review, CR-01 e CR-02, foram corrigidos e permanecem corrigidos no código atual). 3 itens de percepção visual/motion/foco-em-navegador-real ficam pendentes de confirmação humana (ver seção abaixo) — isso não indica falha, é inerente à natureza desses comportamentos.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` `:root` | 8 vars `--status-*` | ✓ VERIFIED | Linhas 54-61, todas alias exceto 1 literal documentado |
| `radar-goiania.html` `statusDeUnidade` | função pura RADAR_PURE | ✓ VERIFIED | Linha 2294 |
| `radar-goiania.html` `PINO_STYLE`/`statusPino` | mapeamento de cor por status | ✓ VERIFIED | Linhas 5169-5200 |
| `radar-goiania.html` `#pinoLegenda` | legenda condicional | ✓ VERIFIED | Linha 1112 |
| `radar-goiania.html` `MOTION_MSG` | 5 mensagens literais | ✓ VERIFIED | Linha 3781, usado em 8 call-sites |
| `radar-goiania.html` `.skel-card`/`.skel-line` | skeleton CSS REDUCE-safe | ✓ VERIFIED | Linhas 246-249, 3798-3801 |
| `radar-goiania.html` `#onbOverlay`/`ONB_CARDS` | onboarding 3 cartões | ✓ VERIFIED | Linhas 1283 (HTML), 7301-7349 (JS) |
| `radar-goiania.html` `#oQueFaz` | catálogo com 5 CTAs | ✓ VERIFIED | Linha 1066 |
| `tests/scores.test.mjs` | testes de `statusDeUnidade` | ✓ VERIFIED | Linhas 93-115+ |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `plot(list)` | `statusDeUnidade` | `statusPino(a)` | ✓ WIRED | Linha 5169 chama `statusDeUnidade(a.__scores)` |
| `atualizarScores()` | pino no mapa | `recolorPinoCi(ci)` | ✓ WIRED (fix CR-01) | Linha 5427 — recoloreia imediatamente ao concluir `compare()` |
| `plot()` sem `__scores` | `TERRSTAT`/`scoresDePlot` | `aplicarScoresDePlot` | ✓ WIRED (fix CR-01) | Linhas 3850-3908, 5210-5221 — usa scan de setor já resolvido, zero requisição nova |
| `buscar()`/`finish()`/`compare()` | `loading(true, MOTION_MSG.*)` | 5 mensagens reais | ✓ WIRED | 8 call-sites confirmados nas linhas 4600-6234 |
| `#results` (início de `buscar()`) | `.skel-card` removido em todo early-return | `prevResults` snapshot + detecção `.skel-card` | ✓ WIRED (fix CR-02) | Linhas 4597, 4720 |
| `init()` | `initOnboard()` | chamada no bloco de boot | ✓ WIRED | Confirmado por 13-03-SUMMARY.md e presença de `initOnboard()` no código |
| cadeia de Esc | `onbFechar()` | primeiro check | ✓ WIRED | Linha ~7390-7391, antes de `#terrPanel`/`#cmpSheet` etc. |
| `#oQueFaz` CTAs | `focusFirstField()`/`onbAbrirDireto()`/`toggleCaixa()` | onclick direto | ✓ WIRED | Linhas 1071-1073 e vizinhas |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VIS-01 | 13-01 | Refino visual clean, cor reservada a status | ✓ SATISFIED | Sistema `--status-*` + 10 seletores refinados, confirmado no código |
| PIN-01 | 13-02 | Pinos semânticos no mapa | ✓ SATISFIED | `PINO_STYLE`/`statusPino`/legenda/tooltip + fix CR-01 (dados reais chegando ao pino) |
| MOT-01 | 13-02 | Motion de busca em etapas + skeleton | ✓ SATISFIED | `MOTION_MSG` + skeleton + fix CR-02 (skeleton nunca preso) |
| DESC-01 | 13-03 | Onboarding ≤3 telas + "O que o Radar faz" | ✓ SATISFIED | `#onbOverlay`/`#oQueFaz` confirmados, wiring completo |

Nenhum requisito órfão — os 4 IDs declarados nos 3 PLANs batem exatamente com os 4 listados em REQUIREMENTS.md para a Fase 13.

### Anti-Patterns Found

Nenhum anti-pattern bloqueante encontrado no código atual. Os 2 findings CRITICAL originais do code review (13-REVIEW.md, 2026-07-07) — CR-01 (pinos nasciam quase sempre cinza por falta de dado) e CR-02 (skeleton podia ficar preso em `#results` em retornos antecipados de validação) — foram corrigidos em 2026-07-10 (commits documentados em 13-REVIEW-FIX.md: `22abc68`, `e6b80a9`) e a presença dos fixes foi reconfirmada por leitura direta do código nesta verificação (`recolorPinoCi`, `scoresDePlot`, `TERRSTAT`, `prevResults`).

Um item de severidade Info (IN-03 — onboarding sem focus trap de Tab) foi deliberadamente deixado sem correção, por decisão explícita do próprio reviewer (não é regressão desta fase; é padrão pré-existente em todos os 6 modais do app; correção pertence a uma passada de acessibilidade dedicada cobrindo as 6 superfícies juntas). Não bloqueia o goal desta fase.

### Human Verification Required

Ver seção `human_verification` no frontmatter — 3 itens de percepção visual/motion/foco em navegador real que não são verificáveis por grep/teste estático:
1. Refino visual (respiro + cor-só-em-status) em viewport real
2. Sequência de motion de busca + skeleton em execução ao vivo
3. Onboarding — foco/teclado/Esc em navegador real (incluindo a ressalva conhecida de IN-03)

### Gaps Summary

Nenhum gap bloqueante. A fase entrega os 4 success criteria do ROADMAP (VIS-01/PIN-01/MOT-01/DESC-01) com evidência direta no código atual, incluindo a confirmação de que os 2 findings CRITICAL do code review original foram corrigidos e permanecem corrigidos após a evolução do código nas Fases 14-18. Status é `human_needed` (não `passed`) porque itens de percepção visual/motion/foco-em-navegador continuam pendentes de confirmação humana — isso é esperado para este tipo de fase (UI/motion/onboarding) e não representa um problema descoberto na verificação.

---

_Verified: 2026-07-10_
_Verifier: Claude (gsd-verifier)_
