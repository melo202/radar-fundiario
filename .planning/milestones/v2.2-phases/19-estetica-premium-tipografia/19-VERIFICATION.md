---
phase: 19-estetica-premium-tipografia
verified: 2026-07-10T12:00:00Z
status: human_needed
score: 15/15 must-haves verified (mecânicos) — 1 item humano pendente
overrides_applied: 0
human_verification:
  - test: "Julgamento estético 'parece premium' — painel de busca, ficha (.detail), onboarding (3 cartões) e PDF/laudo (#laudoView), em desktop (≥1280px) e mobile (375px)"
    expected: "O usuário considera a tipografia (Archivo/JetBrains Mono), o acabamento (elevação/sombras/hover/active/focus) e a estabilidade dos números (tabular-nums) como 'premium'"
    why_human: "Juízo estético subjetivo — não verificável por grep/DOM/teste automatizado; já registrado como item único pendente em 19-HUMAN-UAT.md (status: partial)"
---

# Phase 19: Estética Premium — Tipografia & Refinamento Visual Verification Report

**Phase Goal:** O app parece produto premium — tipografia nova aplicada em TODO o app (zero fonte antiga, incl. PDF), embutida offline/PWA (base64 + CSP font-src), refinamento estético (elevação/acabamento), focus-trap nas 6 superfícies modais — sem quebrar identidade cartográfica, Esc chain, ARIA, performance, 239 testes.

**Verified:** 2026-07-10
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Nova família tipográfica (Archivo) em TODO o app — UI, mapa, sheets — zero fonte antiga | ✓ VERIFIED | `grep -c 'IBM Plex'` → 0, `grep -c 'Open Sans'` → 0; raiz `body` (linha 110) e `.leaflet-container` (linha 909) em `"Archivo"`; `.brand h1` (linha 128) em `"Archivo"` |
| 2 | PDF/laudo (`#laudoView`) renderiza em Archivo/JetBrains Mono, não fallback de sistema | ✓ VERIFIED | 12+ seletores `#laudo`/`#laudoView` migrados por papel (linhas 695-768); LIVE-VERIFIED pelo orquestrador: fonte computada de `#laudoView` = `"Archivo, Segoe UI, system-ui, sans-serif"` |
| 3 | Fonte carrega offline (embutida, zero requisição de rede em runtime) | ✓ VERIFIED | 2 blocos `@font-face` com `src:url(data:font/woff2;base64,...)` inline (linhas 25/27); CSP `font-src 'self' data:` presente sem ampliar outras diretivas |
| 4 | Se `@font-face` falhar, cai em fonte de sistema legível sem quebrar layout | ✓ VERIFIED | Fallback stack preservado: `"Archivo","Segoe UI",system-ui,sans-serif` e `"JetBrains Mono",monospace` em todas as declarações |
| 5 | Números dinâmicos usam dígitos tabulares (não "dançam" de largura) | ✓ VERIFIED | `font-variant-numeric:tabular-nums` em 8 seletores (`.bm b`, `.count`, `.card .vals .ref b`, `.cmp-table td`, `.detail .dgrid .cell .v`, `.dvalor-v`, `.score-num`, `#laudo/#laudoView .llbl`) |
| 6 | Elevação coerente derivada de 3 níveis nomeados | ✓ VERIFIED | `--elev-0/1/2/3` definidos no `:root` (linhas 44-47), derivados de `rgba(20,26,31,...)` (--ink), nunca preto puro |
| 7 | Nenhuma sombra ad hoc sobrevive fora dos tokens (exceto 4 exceções justificadas) | ✓ VERIFIED | `grep -c 'var(--shadow)'` → 0 (def antiga removida); `grep -c 'var(--elev-'` → 16; exceções (`@keyframes bldgflash`, `#laudo .lcard{box-shadow:none}`, dot ring inline) confirmadas intocadas |
| 8 | Hover/active/focus dão feedback premium sem cor nova (VIS-01 preservada) | ✓ VERIFIED | `.card:hover`/`:active{scale(.98)}` em 6 seletores; hover/focus usam apenas `--ink`/`--paper-2`/`--accent` já existentes; nenhum hex novo introduzido (confirmado via diff no 19-02-SUMMARY) |
| 9 | Nenhuma sombra cara aplicada em camada do mapa (performance mobile) | ✓ VERIFIED | `grep -n 'leaflet-tile\|leaflet-pane'` cruzado com `shadow` → 0 ocorrências |
| 10 | Tab/Shift+Tab circulam SÓ entre focáveis visíveis dentro de cada uma das 6 superfícies modais | ✓ VERIFIED | Utilitário único `trapFocus`/`untrapFocus`/`trapFocaveis` (1 definição cada, linhas 7346/7359/7370); LIVE-VERIFIED pelo orquestrador (Chromium): onboarding — Tab do último focável circula ao primeiro, Shift+Tab do primeiro ao último |
| 11 | Ao fechar qualquer modal, o foco retorna ao gatilho | ✓ VERIFIED | `untrapFocus(container)` restaura `TRAP_LASTFOCUS.focus()`; 12 call-sites (`onbFechar`, `fecharLaudo`, `fecharNeg`, `fecharCaptacao`, `fecharComparacao`, `closeChooser`, `closeDetail`) |
| 12 | Cadeia de Esc mantém ordem de prioridade EXATA de antes | ✓ VERIFIED | `document.addEventListener("keydown",...)` (linha 7469) preserva a ordem: onbOverlay → terrPanel → cmpSheet → negSheet → captSheet → caixaList → correctMenu → ambigChips → calc → wiz → laudoView → chooser → busca desktop → closeDetail (catch-all) — idêntica ao contrato do PLAN |
| 13 | Combobox ARIA da busca e quirk iOS do drag continuam funcionando | ✓ VERIFIED | `stopPropagation()` no Esc do combo intacto (linhas 7741/7792); `role="combobox"` presente (linhas 991/1016); `SHEETDRAGY0` (drag) intocado, listener `keydown`-only no trap |
| 14 | Existe UM utilitário compartilhado (trapFocus/untrapFocus), nunca 6 implementações | ✓ VERIFIED | `grep -n 'function trapFocus\|function untrapFocus\|function trapFocaveis'` → exatamente 1 ocorrência de cada; 21 call-sites de `trapFocus(`/12 de `untrapFocus(` cobrindo as 6 superfícies (onb, wiz, negSheet, captSheet, cmpSheet, detail+chooser) |
| 15 | 239+ testes verdes; motion/reduced-motion intactos | ✓ VERIFIED | `npm test` → 239/239 pass, 0 fail; `prefers-reduced-motion`/`REDUCE` lógica (linhas 97, 259, 2941-2942) intocada |
| 16 (juízo humano) | "Parece produto premium" | ? NEEDS HUMAN | Registrado em `19-HUMAN-UAT.md` (status: partial) — item único, subjetivo, não verificável por automação |

**Score:** 15/15 truths mecânicas verificadas; 1 item de juízo humano pendente (não bloqueante para os itens verificáveis)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` — @font-face duplo + CSP | 2 blocos `@font-face` base64 + `font-src` | ✓ VERIFIED | `@font-face` count = 2; `font-src 'self' data:` presente; nenhuma outra diretiva CSP alterada |
| `radar-goiania.html` — migração de família (196 declarações) | Zero IBM Plex/Open Sans residual | ✓ VERIFIED | `IBM Plex` = 0, `Open Sans` = 0 |
| `radar-goiania.html` — tokens de elevação | `--elev-0/1/2/3` + ≥13 usos | ✓ VERIFIED | 4 tokens definidos; 16 usos de `var(--elev-`; 0 `var(--shadow)` residual |
| `radar-goiania.html` — trapFocus/untrapFocus/trapFocaveis | 1 definição cada + ≥7 call-sites | ✓ VERIFIED | 1 def cada; 21 `trapFocus(`/12 `untrapFocus(` call-sites |
| `19-HUMAN-UAT.md` | Item único pendente registrado | ✓ VERIFIED (existe) | Criado, status `partial`, pergunta clara e telas listadas |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| meta CSP (`font-src`) | `url(data:font/woff2;base64,...)` | `font-src 'self' data:` | ✓ WIRED | CSP linha 7 permite `data:` apenas em `font-src`; 2 `@font-face` usam `url(data:font/woff2;base64,...)` |
| Seletores `font-family`/`font:` | `@font-face Archivo/JetBrains Mono` | nome de família migrado | ✓ WIRED | Raiz `body`, `.leaflet-container`, `.brand h1`, `#laudoView` todos referenciam `"Archivo"`/`"JetBrains Mono"` |
| Componentes elevados (`.combo-list`, `.onb-card`, `.detail`, `.toast`, etc.) | `:root --elev-*` | `box-shadow:var(--elev-N)` | ✓ WIRED | 16 usos de `var(--elev-N)` mapeados 1:1 aos componentes do plano |
| `abrirComparacao`/`showDetail`/abertura chooser/`onbAbrir`/`abrirSeletorFinalidade`/`abrirNeg`/`abrirCaptacao` | `trapFocus(container)` | chamada na abertura | ✓ WIRED | Confirmado nas 7 funções de abertura (linhas 5138, 5341, 5595, 6369, 6415, 6446, 7407) |
| `fecharComparacao`/`closeDetail`/`closeChooser`/`onbFechar`/`fecharLaudo`/`fecharNeg`/`fecharCaptacao` | `untrapFocus(container)` | chamada no fechamento, ciente do dono (WR-01) | ✓ WIRED | Confirmado nas 7 funções de fechamento, todas passando o próprio container (exceto `showDetail`, documentado como caso global intencional) |

### Data-Flow Trace (Level 4)

N/A — esta fase é puramente estética/CSS/JS de interação (tipografia, elevação, focus-trap); não há dados dinâmicos de API/DB sendo renderizados por estes artefatos. A verificação de "dados reais" não se aplica; a verificação relevante é de renderização/wiring (Levels 1-3), já coberta acima.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Fonte Archivo carrega e renderiza de fato | `document.fonts.check('700 16px Archivo')` (Chromium, live) | `true` | ✓ PASS |
| Fonte JetBrains Mono carrega e renderiza de fato | `document.fonts.check('700 11px "JetBrains Mono"')` (Chromium, live) | `true` | ✓ PASS |
| Fonte computada da UI | `.brand h1` computed font-family (Chromium, live) | `"Archivo, sans-serif"` | ✓ PASS |
| Fonte computada do PDF | `#laudoView` computed font-family (Chromium, live) | `"Archivo, Segoe UI, system-ui, sans-serif"` | ✓ PASS |
| Focus-trap circula (onboarding) | Tab/Shift+Tab nos focáveis do overlay (Chromium, live) | Tab do último volta ao primeiro; Shift+Tab do primeiro vai ao último; Esc fecha | ✓ PASS |
| Gate de greps completo | `IBM Plex=0, Open Sans=0, @font-face=2, font-src, tabular-nums, --elev-1, trapFocus≥7` | Todos presentes | ✓ PASS |
| Suíte de testes | `npm test` | 239 pass, 0 fail | ✓ PASS |
| Payload do HTML | `wc -c radar-goiania.html` (atual: 748.007 bytes) vs. baseline pré-fase (~653.051) | +~94,9KB (dentro do teto de 250KB) | ✓ PASS |

Nota: os checks de `document.fonts.check`/fonte computada/Tab-cycle foram executados ao vivo pelo orquestrador em Chromium (2026-07-10), conforme instruído nas notas da verificação — citados aqui como evidência de terceiros já coletada, não re-executados nesta sessão (sem servidor/preview disponível neste ambiente de verificação).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| TYPO-01 | 19-01-PLAN.md | Nova tipografia em todo o app, offline/PWA, zero fonte antiga | ✓ SATISFIED | @font-face duplo embutido, CSP corrigido, 196 declarações migradas, tabular-nums, fallback preservado |
| PREM-01 | 19-02-PLAN.md | Refinamento estético premium — elevação/acabamento, identidade cartográfica e VIS-01 preservadas | ✓ SATISFIED | Tokens `--elev-*`, 16 sombras consolidadas, hover/active/focus sem cor nova, nenhuma sombra em camada de mapa |
| A11Y-01 | 19-03-PLAN.md | Focus-trap nas 6 superfícies modais, fecha IN-03 da Fase 13 | ✓ SATISFIED | Utilitário único aplicado às 6 superfícies, Esc chain/combobox/iOS drag intocados, WR-01 (dono do trap) e IN-01 (foco unificado) do REVIEW-FIX confirmados no código |

Nenhum requisito órfão: os 3 IDs mapeados à Fase 19 em `REQUIREMENTS.md` (TYPO-01, PREM-01, A11Y-01) aparecem no `requirements:` de algum dos 3 planos.

### Anti-Patterns Found

Nenhum. Varredura de `TODO|FIXME|XXX|PLACEHOLDER` no HTML (excluindo ruído de blobs base64) retornou apenas ocorrências da palavra portuguesa "todo(s)" em comentários pré-existentes de fases anteriores — nenhum stub/placeholder introduzido pela Fase 19. Nenhuma sombra em camada de mapa. Nenhuma cor hex nova (confirmado por diff documentado no 19-02-SUMMARY).

### Code Review Fixes (19-REVIEW-FIX.md) — confirmados no código

| Finding | Fix esperado | Status | Evidência |
|---------|--------------|--------|-----------|
| WR-01 — `untrapFocus()` não verifica posse do trap ativo | `untrapFocus(container)` retorna sem desmontar se `container !== TRAP_CONTAINER` | ✓ CONFIRMADO | Linha 7359-7369: `if(container && container!==TRAP_CONTAINER) return;`; 7 call-sites passam o próprio container |
| IN-01 — foco inconsistente entre `.cinput`/`.winput` e demais inputs | `border-color` de `:focus` unificado para `var(--ink)` | ✓ CONFIRMADO | Linhas 567/617: `.cinput:focus`/`.winput:focus{outline:none;border-color:var(--ink)}`, alinhado com linha 147 (`select,input:focus`) e linha 170 (`.caixa-input:focus`) |

### Human Verification Required

### 1. Julgamento estético "parece premium"

**Test:** Abrir o app em desktop (≥1280px) e mobile (375px), navegar pelo painel de busca, ficha do imóvel (`.detail`), onboarding (3 cartões) e PDF/laudo gerado (`#laudoView`).
**Expected:** O usuário considera a tipografia (Archivo/JetBrains Mono), o acabamento visual (elevação/sombras, hover/active/focus) e a estabilidade dos números (tabular-nums) como "premium".
**Why human:** Juízo estético subjetivo — não verificável por grep/DOM/teste automatizado. Já formalizado em `19-HUMAN-UAT.md` (status `partial`), que lista as 4 telas a avaliar e o protocolo de resposta ("aprovado" ou descrição específica dos problemas).

### Gaps Summary

Nenhum gap técnico encontrado. Todos os 15 must-haves mecânicos (tipografia embutida offline, migração total de família, tabular-nums, elevação consolidada, acabamento sem cor nova, focus-trap único nas 6 superfícies com foco de retorno ao gatilho, Esc chain/combobox/iOS drag intactos, 239 testes verdes, payload dentro do teto) estão implementados, wired e confirmados por leitura direta do código-fonte (`radar-goiania.html`) e por verificação ao vivo em Chromium (document.fonts.check, fonte computada, Tab-cycle). Os 2 findings do code review (WR-01, IN-01) estão corrigidos e confirmados no código.

O único item pendente é o juízo estético "parece premium" do usuário final — inerentemente subjetivo, já isolado e documentado em `19-HUMAN-UAT.md` como pendência não-bloqueante para o fechamento administrativo da fase, mas que deve ser respondido antes de considerar a Fase 19 definitivamente encerrada.

---

*Verified: 2026-07-10*
*Verifier: Claude (gsd-verifier)*
