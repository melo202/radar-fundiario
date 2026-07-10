---
phase: 19-estetica-premium-tipografia
plan: 01
subsystem: ui
tags: [css, webfonts, woff2, base64, csp, typography, tabular-nums]

# Dependency graph
requires: []
provides:
  - "@font-face duplo (Archivo variável 400-800 + JetBrains Mono variável 500-700) embutido em base64 inline no radar-goiania.html"
  - "CSP com font-src 'self' data: liberando o carregamento das fontes data: URI"
  - "Zero declaração residual de IBM Plex Sans/Mono ou Open Sans em todo o app (UI, mapa, sheets, PDF/laudo)"
  - "font-variant-numeric:tabular-nums em 8 seletores de valor numérico dinâmico"
affects: [19-02, 19-03]

# Tech tracking
tech-stack:
  added: ["Archivo (Google Fonts, OFL 1.1, variável 400-800, latin)", "JetBrains Mono (Google Fonts, OFL 1.1, variável 500-700, latin)"]
  patterns: ["@font-face com font-weight em range (fonte variável) em vez de blocos discretos por peso", "fonte embutida em base64 dentro do HTML único (mesmo padrão do motion.dev inline, Fase 6)"]

key-files:
  created: []
  modified: ["radar-goiania.html"]

key-decisions:
  - "2 blocos @font-face com range de peso (400-800 e 500-700) em vez de 7 blocos discretos — mesmo arquivo variável servido pelo Google Fonts para todos os pesos do subset latin, medido e confirmado na pesquisa (payload real 86,4KB vs. estimativa pessimista de 150-215KB)"
  - "CSP recebeu font-src 'self' data: como único acréscimo — nenhuma outra diretiva (default-src/script-src) foi ampliada"
  - "sw.js NÃO foi bumpado (permanece radar-v7) — a fonte vive dentro do radar-goiania.html, que já é NETWORK_FIRST; o cache antigo é só fallback offline e nunca trava a versão nova, então a convenção 'bump quando assets mudam' não se aplica aqui (só o HTML mudou, não os assets externos em LOCAL[])"
  - "Papel de cada uma das 14 declarações Open Sans do pipeline #laudo/#laudoView decidido por função (não replace cego): 11 linhas de texto/heading/valor → Archivo (incl. .llbl, que exibe R$/m² e ganhou tabular-nums), 3 linhas de eyebrow/rótulo/rodapé (.lbrand .t small, .foot, .lrun) → JetBrains Mono, seguindo a mesma lógica de papel já usada no resto do UI-SPEC"
  - "terr-metric do UI-SPEC não existe como seletor literal no HTML — o valor numérico real do território/ficha é renderizado por .detail .dgrid .cell .v (compartilhado entre ficha e território); tabular-nums foi aplicado ali como o alvo funcional equivalente"

patterns-established:
  - "Injeção de payload base64 grande via script Python (não Edit/old_string com a string inteira) para blocos @font-face — replicável em fases futuras que embutam mais assets binários"

requirements-completed: [TYPO-01]

# Metrics
duration: 15min
completed: 2026-07-10
---

# Phase 19 Plan 01: Fundação Tipográfica — Fontes Embutidas + CSP + Migração Total Summary

**Archivo + JetBrains Mono embutidas de verdade via 2 blocos @font-face variáveis em base64 (86,4KB), CSP corrigido com font-src, e as 196 declarações de família (IBM Plex + Open Sans) migradas por papel — a causa raiz da "letra feia" (zero fonte carregada, fallback sempre Segoe UI) está corrigida.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-10T07:03:00Z (aprox.)
- **Completed:** 2026-07-10T07:10:33Z
- **Tasks:** 3/3
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments
- 2 blocos `@font-face` (Archivo 400-800, JetBrains Mono 500-700) embutidos em base64 inline, `font-display:swap`, comentário de licença OFL 1.1 em cada bloco
- CSP (linha 7) ganhou `font-src 'self' data:` — único acréscimo, nenhuma outra diretiva alterada
- 180 declarações `"IBM Plex Sans"`/`"IBM Plex Mono"` migradas 1:1 para `"Archivo"`/`"JetBrains Mono"` (raiz do body, `.leaflet-container` do mapa, todos os componentes)
- 14 declarações `"Open Sans"` do pipeline `#laudo`/`#laudoView` (impressão/PDF) migradas por papel funcional (texto/heading/valor → Archivo; eyebrow/rótulo/rodapé → JetBrains Mono)
- `font-variant-numeric:tabular-nums` adicionado em 8 seletores de valor numérico dinâmico (R$, m², score, contagens) para eliminar a "dança" de largura ao recalcular

## Task Commits

Each task was committed atomically:

1. **Task 1: CSP font-src + 2 blocos @font-face variáveis em base64 inline** - `f39f931` (feat)
2. **Task 2: Migração mecânica das 180 declarações IBM Plex → Archivo/JetBrains Mono** - `8dc6b14` (feat)
3. **Task 3: Migração das 14 Open Sans (pipeline PDF #laudo) por papel + tabular-nums nos valores** - `faa1897` (feat)

**Plan metadata:** (a seguir, commit final `docs(19-01)`)

## Files Created/Modified
- `radar-goiania.html` - 2 blocos `@font-face` inline (base64), CSP com `font-src`, 196 declarações de família migradas, 8 seletores com `tabular-nums`

## Payload do HTML (antes/depois)

| Momento | Tamanho |
|---|---|
| Antes (baseline da pesquisa) | 653.051 bytes |
| Depois da Task 1 (fontes embutidas) | 742.315 bytes (+89.264 bytes) |
| Depois da Task 2 (migração IBM Plex, sem mudança de tamanho relevante) | 741.601 bytes |
| Depois da Task 3 (migração Open Sans + tabular-nums) | **741.872 bytes** |

Delta líquido total: **+88.821 bytes** (~86,7KB) — bate com o payload medido na pesquisa (86,4KB de base64 para os 2 arquivos woff2 variáveis) com folga de ~163KB sobre o teto de 250KB do CONTEXT.md.

**Base64 embutidos:**
- Archivo variável (400-800, latin): woff2 34.928 bytes → base64 46.572 chars
- JetBrains Mono variável (500-700, latin): woff2 31.432 bytes → base64 41.912 chars

## Exceção ao bump de sw.js

`sw.js` permanece em `CACHE = "radar-v7"` — **não foi bumpado nesta plan**, por decisão técnica documentada no PLAN.md e ratificada na pesquisa: a fonte vive DENTRO do `radar-goiania.html`, que já é servido `NETWORK_FIRST` pelo próprio service worker. O cache antigo é só fallback offline e nunca trava a versão nova — bumpar `CACHE` exigiria tratar a fonte como um asset externo em `LOCAL[]`, o que não é o caso (ela está embutida no HTML, não é um arquivo `.woff2` separado). Isso é uma exceção justificada à convenção geral "bump quando assets mudam", não um descuido.

## Decisions Made

Ver `key-decisions` no frontmatter. Resumo:
- Fonte variável em range (2 blocos) em vez de 7 blocos discretos — medido, confirmado, menor payload
- CSP com escopo mínimo (`font-src` isolado, nunca `default-src` ampliado)
- sw.js sem bump (documentado acima)
- Papel de cada declaração Open Sans decidido por função, não replace cego
- `.detail .dgrid .cell .v` usado como alvo funcional equivalente a `.terr-metric` (seletor que não existe literalmente no HTML)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comentários de licença dos blocos @font-face continham os literais "IBM Plex Sans"/"Open Sans"**
- **Found during:** Task 2/3 (verificação de contagem zero)
- **Issue:** Os comentários de licença escritos na Task 1 (redigidos conforme o texto sugerido pela pesquisa) citavam `"IBM Plex Sans"`, `"IBM Plex Mono"` e `"Open Sans"` entre aspas como referência ao que cada fonte substitui. Isso inflava artificialmente a contagem de `grep -c 'IBM Plex'`/`grep -c 'Open Sans'` em +1 cada, quebrando o gate de "zero ocorrência residual" das Tasks 2 e 3.
- **Fix:** Reescritos os 2 comentários de licença para descrever o que a fonte substitui sem repetir os literais das famílias antigas (ex.: "substitui a familia sans anterior" em vez de `substitui "IBM Plex Sans"`).
- **Files modified:** `radar-goiania.html` (linhas 24 e 26, comentários de licença)
- **Verification:** `grep -c 'IBM Plex'` → 0 após Task 2; `grep -c 'Open Sans'` → 0 após Task 3; `npm test` 239/239 verde em ambos os pontos
- **Committed in:** parte do commit `8dc6b14` (correção do comentário Archivo) e do trabalho da Task 3 antes de `faa1897` (correção do comentário JetBrains Mono, commitada junto com a migração Open Sans)

---

**Total deviations:** 1 auto-fixed (1 bug de auto-referência nos comentários de licença)
**Impact on plan:** Correção necessária para o próprio gate de verificação do plano (contagem zero de resquícios); nenhum scope creep, nenhuma mudança de comportamento visual.

## Issues Encountered

- Arquivo `radar-goiania.html` usa terminadores de linha CRLF; o primeiro script de injeção dos blocos `@font-face` (Task 1) falhou ao localizar a âncora `<style>\n:root{` porque buscava `\n` puro. Corrigido usando `\r\n` no script de injeção antes de reexecutar — nenhum dado foi escrito com o script quebrado (falhou no assert, antes do write final).
- Contagem de `letter-spacing:0!important` no HTML real é 1 ocorrência (não 2, como o PLAN.md menciona a partir da pesquisa) — o critério de verificação do plano (`!= "0"`) foi satisfeito de qualquer forma; não é um problema, só uma imprecisão pré-existente do PLAN.md que não bloqueou a execução.

## User Setup Required

None - nenhuma configuração de serviço externo necessária (fontes embutidas offline, sem CDN em runtime).

## Next Phase Readiness

- Fundação tipográfica pronta para os Planos 02/03 (refinamento visual/elevação e verificação ao vivo `document.fonts.check`)
- A renderização real (confirmação de que `document.fonts.check('700 16px Archivo')` retorna `true`, screenshot antes/depois) fica para o preview do Plano 03, conforme o próprio PLAN.md instrui
- Nenhum bloqueio identificado — suíte 239/239 verde em todos os 3 commits, payload dentro do teto (86,7KB usado de 250KB)

---
*Phase: 19-estetica-premium-tipografia*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: f39f931 (Task 1 commit)
- FOUND: 8dc6b14 (Task 2 commit)
- FOUND: faa1897 (Task 3 commit)
