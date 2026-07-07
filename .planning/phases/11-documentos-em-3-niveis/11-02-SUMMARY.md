---
phase: 11-documentos-em-3-niveis
plan: 02
subsystem: ui
tags: [wizard, seletor-finalidade, cnai, confianca, pendencias, revisao-pre-pdf]

# Dependency graph
requires:
  - phase: 11-documentos-em-3-niveis
    plan: 01
    provides: recomendaDocumento/pendenciasDocumento (RADAR_PURE) — funcoes puras chamadas diretamente pelo wizard nesta plan
provides:
  - "abrirSeletorFinalidade()/finSet()/finEscolherDoc() — novo entry point de #dActsPrim, substitui abrirLaudo() direto"
  - "LZ.fase/LZ.finalidadeUso/LZ.tipoDoc/LZ.docOk — campos novos no estado do wizard"
  - "wizRender() passos 4 (Confianca+Pendencias) e 5 (Revisao final) — Wave 3 (11-03) pode ler LZ.tipoDoc/LZ.docOk/LZ.prof.cnai sem reabrir esta plan"
  - "radar_prof.cnai separado de radar_prof.creci, compat com perfis antigos"
affects: [11-03-ficha-rapida-e-ptam-cnai]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LZ.fase=\"finalidade\" como tela intermediaria ANTES de LZ.step existir — wizRender() ramifica no topo para renderSeletorFinalidade(), .wfoot escondido enquanto essa fase estiver ativa (fix contratual do plan-check)"
    - "wDots/wNext ampliados de 4 para 6 passos numerados (0..5); montarLaudo() so e chamado dentro de wizNext() no passo 5, preservando a guarda ec9f129 (nenhuma chamada assincrona dispara o PDF)"

key-files:
  created: []
  modified:
    - radar-goiania.html (bloco do wizard .wiz/LZ, linhas ~2907-3220 + CSS novo ~423-462)

key-decisions:
  - "Tasks 2 e 3 do plano foram implementadas e commitadas juntas num unico commit atomico (9ab943a) — a mudanca de wizNext() (LZ.step<5, gatilho movido pro passo 5) so faz sentido com o passo 5 ja existindo; separar os commits exigiria um estado intermediario com testes quebrados (passo 4 sem passo 5 de destino) ou wizNext() temporariamente incorreto. Decisao pragmatica de agrupamento, documentada explicitamente na mensagem do commit."
  - "Banner de confianca baixa (.confwarn, Estados Transversais do UI-SPEC) foi adicionado tambem no passo 5 (Revisao), nao so no confcard do passo 4 — reforco explicito do UI-SPEC (\"aviso adicional no .wfoot antes do CTA final\") nao listado literalmente nas <action> do plano mas exigido pela secao Estados Transversais e pela verificacao final; tratado como Rule 2 (funcionalidade minima faltante), nunca bloqueia o clique em Gerar PDF."
  - "FINS movido para escopo de modulo (antes declarado dentro do bloco do passo 3) para ser reusado sem duplicacao no passo 5 (Revisao), conforme sugerido pelo plano."

requirements-completed: [DOC-01, DOC-02, DOC-03]

# Metrics
duration: ~40min
completed: 2026-07-07
---

# Phase 11 Plan 02: Wizard — Seletor de Finalidade, Confiança+Pendências, Revisão Pré-PDF Summary

**Wizard `.wiz`/`LZ` ampliado de 4 para 6 passos numerados com um novo Seletor de Finalidade antes do passo 0 (substitui `abrirLaudo()` direto), um novo passo "Antes de gerar" (confiança + checklist reativo via `pendenciasDocumento`) e uma nova etapa "Revisão final" que é a ÚNICA porta de `montarLaudo()` — guarda `ec9f129` preservada; CNAI separado do CRECI em `radar_prof`.**

## Mapa final de LZ.step (0-5)

| Fase/Step | Nome | O que faz |
|---|---|---|
| `LZ.fase==="finalidade"` (sem step numérico) | Seletor de Finalidade | 4 opções de motivo de uso → `finSet()` grava `LZ.finalidadeUso` e re-renderiza a MESMA tela com o card de recomendação (`recomendaDocumento`) + 3 documentos tocáveis, recomendado primeiro; `finEscolherDoc()` grava `LZ.tipoDoc` e inicializa os campos numéricos (equivalente ao antigo `abrirLaudo()`) |
| 0 | O imóvel | Estado de conservação, diferenciais, vistoria — inalterado |
| 1 | Valor | Estimativa de mercado, área privativa, valor sugerido, observações — inalterado |
| 2 | Fotos | Upload/preview — inalterado |
| 3 | Solicitante e você | Solicitante, finalidade declarada, nome, **CRECI e CNAI agora 2 inputs distintos**, contato |
| 4 | **Antes de gerar (novo)** | `pendenciasDocumento()` (reusa `scoreConfianca`) renderiza nível de confiança por extenso + checklist reativo (área/conservação/documentação); preencher área chama `wizRender()` imediato; nunca bloqueia avanço |
| 5 | **Revisão final (novo)** | Campos sensíveis editáveis (solicitante/finalidade/valor/observações) + preview da assinatura + nome do documento escolhido (não editável, com links "Editar perfil"/"Trocar documento"); banner de confiança baixa acima do CTA; **único passo que dispara `montarLaudo()`** |

## Campos novos

**Em `LZ`:**
- `LZ.fase`: `"finalidade"` | `undefined` — fase do seletor, antes de `LZ.step` existir
- `LZ.finalidadeUso`: `"apresentar"|"captar"|"justificar"|"formal"|null`
- `LZ.tipoDoc`: `"ficha"|"relatorio"|"ptam"|null`
- `LZ.docOk`: `true|false|undefined` — estado de documentação (passo Confiança)

**Em `radar_prof`:**
- `radar_prof.cnai` (novo, separado de `radar_prof.creci`) — perfis salvos antes desta fase (só `{nome,creci,contato}`) continuam funcionando sem quebra (`cnai` ausente vira `undefined`, tratado como falsy em `!!(LZ.prof.cnai||"").trim()`)

## Confirmação da guarda ec9f129

`montarLaudo()` só é chamado dentro de `wizNext()` (linha ~3218), que só roda via `onclick="wizNext()"` no `#wNext`/`.wnext` (clique real do usuário, HTML inalterado). Verificado por grep: nenhum `oninput`/`.then()`/callback assíncrono dos passos novos (Confiança, Revisão, Seletor de Finalidade) chama `wizNext()` ou `montarLaudo()` diretamente — a única cadeia de chamada é `#wNext (click)` → `wizNext()` → (se `LZ.step===5` e validações passarem) → `montarLaudo()`.

## Performance

- **Duration:** ~40 min
- **Tasks:** 3 (Task 1 isolada; Tasks 2+3 implementadas e commitadas juntas — ver Decisions)
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments

- `abrirSeletorFinalidade()`/`finSet()`/`finEscolherDoc()` substituem `abrirLaudo()` como entry point de `#dActsPrim`; função antiga removida por completo (zero código morto, confirmado via grep — nenhuma outra chamada a `abrirLaudo()` restou no arquivo)
- `renderSeletorFinalidade()` monta as 4 opções + card de recomendação + 3 documentos tocáveis (recomendado sempre primeiro, PTAM nunca desabilitado mesmo sem CNAI)
- `.wfoot` escondido durante `LZ.fase==="finalidade"` e restaurado em `finEscolherDoc()` (fix contratual do plan-check — evita o botão órfão disparando `montarLaudo()` com `LZ` incompleto)
- Passo "Antes de gerar" (`LZ.step===4`) reusa `pendenciasDocumento()` sem duplicar lógica de completude; checklist reativo (área atualiza o painel imediatamente via `wizRender()` no próprio `oninput`)
- Passo "Revisão final" (`LZ.step===5`) é a única porta de `montarLaudo()`; campos sensíveis editáveis + preview de assinatura + banner de confiança baixa
- CRECI/CNAI separados em 2 inputs no passo 3; compat com perfis antigos preservada
- Suite completa `node --test "tests/*.test.mjs"`: **64/64 pass**, zero regressão

## Task Commits

1. **Task 1: Seletor de Finalidade** — `adcb9b8` (feat)
2. **Tasks 2+3: Confiança+Pendências, CNAI, Revisão final** — `9ab943a` (feat)

## Files Created/Modified

- `radar-goiania.html`:
  - `#dActsPrim` botão primário: `onclick="abrirSeletorFinalidade()"` (era `abrirLaudo()`)
  - Novas funções: `abrirSeletorFinalidade()`, `finSet()`, `finEscolherDoc()`, `renderSeletorFinalidade()`; `abrirLaudo()` removida
  - `wizBack()` ajustada: fecha o wizard quando `LZ.fase==="finalidade"`
  - `wizRender()`: ramo de topo para `LZ.fase==="finalidade"`; `wDots` `[0..5]`; passo 3 (perfil) com CNAI separado; passos 4 e 5 novos
  - `wizNext()`: `LZ.step<5` incrementa; gatilho de `montarLaudo()` movido para o passo 5; validação de nome agora volta ao passo 3 (pequena melhoria de UX, documentada no plano)
  - `FINS` movido para escopo de módulo (constante compartilhada entre passo 3 e passo 5)
  - `NOMES_DOC` nova constante (`ficha`/`relatorio`/`ptam` → nomes exibidos)
  - CSS novo: `.fingrid/.finop/.finrec*/.findoc*` (Componente 1), `.confcard/.checklist/.checkitem*/.confwarn` (Componente 2), `.revsec*/.revprev/.revlink` (Componente 3) — todos usando os tokens `--paper/--paper-2/--ink/--line/--muted/--accent` já existentes, zero hex novo

## Decisions Made

Ver frontmatter `key-decisions` acima — resumo:
1. Tasks 2+3 commitadas juntas (acoplamento entre `wizNext()` e a existência do passo 5).
2. Banner `.confwarn` adicionado também na Revisão (Rule 2 — requisito do UI-SPEC "Estados Transversais", nunca bloqueia).
3. `FINS` promovido a escopo de módulo para reuso sem duplicação.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Funcionalidade mínima faltante] Banner de confiança baixa na Revisão final**
- **Found during:** Task 3 (implementação do passo 5)
- **Issue:** O UI-SPEC (seção "Estados Transversais") exige um banner de aviso forte ("Confiança baixa: recomenda-se confirmar os pontos acima antes de compartilhar este documento.") acima do CTA final quando `conf.nivel==='baixa'`, mas as `<action>` da Task 3 do plano não mencionavam explicitamente esse banner no passo 5 (só o `.confcard.conf-baixa` no passo 4).
- **Fix:** Recalculado `pendenciasDocumento()` no passo 5 (mesma lógica do passo 4) e renderizado `.confwarn` condicionalmente, sem bloquear o botão "Gerar PDF" (T-11-05 do threat model reforçado).
- **Files modified:** radar-goiania.html
- **Verification:** `node --test "tests/*.test.mjs"` — 64/64 pass
- **Committed in:** 9ab943a

---

**Total deviations:** 1 auto-fixed (Rule 2, funcionalidade exigida pelo UI-SPEC não listada literalmente nas actions). Nenhuma mudança arquitetural, nenhum scope creep alem do UI-SPEC já aprovado.

## Issues Encountered

Nenhum bloqueio. Um falso-positivo de verificação own-made (`new Function()` sobre blocos `<script>` concatenados naively) reportou erro de parse pré-existente e não-relacionado às mudanças desta plan (confirmado via `git stash`/`git stash pop` que o mesmo erro já existia no estado anterior a esta plan) — não é uma regressão, ignorado; a suite `node --test` é a fonte de verdade de verificação por instrução do plano.

## User Setup Required

None — nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- Wave 3 (11-03) pode ler `LZ.tipoDoc`/`LZ.docOk`/`LZ.prof.cnai` diretamente para montar o template correto (Ficha rápida/Relatório/PTAM) sem reabrir esta plan.
- `montarLaudo()` não foi tocada em seu CONTEÚDO (título/CNAI na assinatura) por estar fora do escopo desta plan — Wave 3 é responsável por essa mudança (ajuste de `comCreci`→`comCnai` na decisão do título, per Componente 5 do UI-SPEC).
- Nenhum bloqueio.

---
*Phase: 11-documentos-em-3-niveis*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/11-documentos-em-3-niveis/11-02-SUMMARY.md
- FOUND commit: adcb9b8 (feat: Seletor de Finalidade)
- FOUND commit: 9ab943a (feat: Confiança+Pendências, CNAI, Revisão final)
