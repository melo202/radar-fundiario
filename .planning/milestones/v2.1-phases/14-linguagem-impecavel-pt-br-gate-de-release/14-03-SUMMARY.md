---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
plan: 03
subsystem: ui
tags: [pt-br, microcopy, gate-de-release, radar-goiania.html, toasts, aria, tooltips, acessibilidade]

# Dependency graph
requires:
  - phase: 14-01
    provides: "14-AUDITORIA.md (checklist §26, glossário canônico) usado como referência de critério para toasts/erros e aria-label"
  - phase: 14-02
    provides: "Categorização de exceções e padrão de mudança mínima reaproveitados nesta varredura de toasts/aria/title"
provides:
  - "14-AUDITORIA.md: seções Toasts/Erros + Estados vazios e Tooltips/aria-label preenchidas com varredura completa (46 toasts + 4 estados vazios + 35 aria-label + 8 title)"
  - "4 toasts de erro corrigidos para o padrão §26.3 (o que houve + o que fazer): lote sem registro, falha ao salvar (oportunidade/histórico ×2), falha ao copiar link"
  - "1 tooltip corrigido para remover instrução de uso administrativo (script Python) que vazava para o corretor no botão Oportunidades Caixa"
  - "Confirmação de que os 4 estados vazios já ofereciam próximo passo em 1 toque (§26.8) — nenhuma mudança necessária"
  - "Confirmação de que todos os 35 aria-label já narram a mesma ação do contexto visual (incluindo os 2 pares dinâmicos já corretos: satélite e comparar unidade)"
affects: [14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Toast de erro sempre com verbo de próximo passo explícito (Tente/Confira/Digite/Libere), mesmo quando a causa é técnica (armazenamento cheio, falha de rede)", "Tooltip dinâmico de admin/debug nunca cita comandos de script ou ferramenta que o usuário final não consegue executar"]

key-files:
  created:
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-03-SUMMARY.md"
  modified:
    - "radar-goiania.html"
    - ".planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md"

key-decisions:
  - "Toasts informativos sobre limitação de dado (imóvel/prédio sem coordenada cadastrada, linhas 3226/3249) registrados como avaliado-mantido: não são erros do usuário nem têm ação corretiva possível — apenas informam uma limitação do cadastro oficial"
  - "Botões de fechar sheet (×) com aria-label genérico 'Fechar' (linhas 981/1033/1072/1083/1104) mantidos sem mudança: o role=dialog pai já anuncia o nome do sheet ao leitor de tela antes do foco chegar ao botão de fechar, tornando 'Fechar' suficiente e consistente com o padrão do app"
  - "title do #btnCaixa removeu a instrução '(rode atualizar-caixa.py)' — é comando de script Python que o corretor (usuário final) não tem como executar; tratado como Rule 2 (informação inadequada para a audiência, não uma feature ausente)"

patterns-established:
  - "Toast de storage cheio/indisponível sempre com saída acionável ('Libere espaço e tente de novo.'), aplicada de forma idêntica em oppSave/histSave (par de funções irmãs)"

requirements-completed: [LING-01]

# Metrics
duration: 8min
completed: 2026-07-09
---

# Phase 14 Plan 03: Toasts/Erros, Estados vazios e Tooltips/aria-label Summary

**Varredura completa dos 46 `toast()`, 4 estados vazios, 35 `aria-label` e 8 `title` de `radar-goiania.html`; 4 toasts de erro corrigidos para o padrão §26.3 (o que houve + o que fazer) e 1 tooltip com instrução de script Python removido — 107/107 testes verdes**

## Performance

- **Duration:** 8 min (21:16 → 21:24, 2026-07-09)
- **Started:** 2026-07-09T21:16:00Z (aprox.)
- **Completed:** 2026-07-09T21:24:38Z
- **Tasks:** 2/2 completed
- **Files modified:** 2 (radar-goiania.html, 14-AUDITORIA.md)

## Accomplishments
- **Task 1 (Toasts/Erros + Estados vazios):** varredura das 46 linhas retornadas por `grep -n "toast(" radar-goiania.html` (2 delas não são chamadas reais: a definição da função e um comentário). 4 mensagens de erro corrigidas para incluir a saída que faltava (§26.3): "Lote sem registro no cadastro." → + "Tente outro lote."; "Não foi possível salvar — armazenamento do navegador indisponível ou cheio." (×2, `oppSave`/`histSave`) → + "Libere espaço e tente de novo."; "Não foi possível copiar o link." → + "Tente de novo.". Os 4 estados vazios (`#emptyState`, erro de busca, sem resultado, libs do mapa) já ofereciam próximo passo em 1 toque — confirmados sem alteração.
- **Task 2 (Tooltips/aria-label):** varredura das 35 ocorrências de `aria-label=` e das 8 ocorrências de `title=` (contagem ao vivo corrigiu a estimativa de 7 do RESEARCH para 8). Todos os 35 `aria-label` já narram a mesma ação do contexto visual, incluindo os pares dinâmicos já corretos (botão de satélite alterna "Ver satélite"/"Ver ruas" com o glifo; botão de comparar unidade alterna "Marcar para comparar"/"Desmarcar da comparação"). 1 `title` corrigido: o tooltip do botão "Ver Oportunidades Caixa" (quando a lista está desatualizada) citava `"(rode atualizar-caixa.py)"` — instrução de script Python que o corretor não tem como executar — removida, mantendo só a informação relevante ao usuário ("pode estar desatualizada").

## Task Commits

Each task was committed atomically:

1. **Task 1: Varredura de toasts/erros + estados vazios (§26.3)** - `20988e3` (fix)
2. **Task 2: Varredura de tooltips (title) + aria-label** - `5adbcb4` (fix)

_Note: nenhuma task foi TDD; ambas foram edição de string pontual + verificação via `npm test` (sem teste acoplado a essas strings — nenhuma asserção quebrou)._

## Files Created/Modified
- `radar-goiania.html` - 4 toasts de erro com saída adicionada (§26.3) + 1 title de admin/debug limpo
- `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md` - Seções "Toasts/Erros + Estados vazios" (46 toasts + 4 estados vazios) e "Tooltips/aria-label" (35 aria-label + 8 title) preenchidas com veredito linha a linha

## Decisions Made
Ver `key-decisions` no frontmatter — resumo: toasts informativos sobre limitação de dado (sem coordenada cadastrada) não recebem saída forçada (não é erro do usuário, sem ação corretiva possível); aria-label "Fechar" genérico em sheets mantido pois o `role="dialog"` pai já dá o contexto ao leitor de tela; tooltip do botão Caixa removeu instrução de script interno inadequada para o usuário final.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tooltip do botão Oportunidades Caixa expunha comando de script interno ao usuário final**
- **Found during:** Task 2 (varredura de tooltips)
- **Issue:** `btn.title` (linha 4681, `initCaixa()`) incluía `"(rode atualizar-caixa.py)"` — instrução de manutenção via script Python destinada ao desenvolvedor/admin, não ao corretor que usa o app no navegador; viola §26 (linguagem deve ser acionável pela audiência real, corretor sem acesso a scripts)
- **Fix:** Removida a instrução técnica, mantendo apenas `"Lista da Caixa de {data} — pode estar desatualizada."`
- **Files modified:** radar-goiania.html
- **Verification:** `npm test` 107/107 verde; `grep -c 'title="'` permanece 8 (nenhuma ocorrência adicionada/removida, só o conteúdo de uma editado)
- **Committed in:** `5adbcb4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — Rule 1)
**Impact on plan:** Correção pontual de string, sem mudança estrutural. Não estava no escopo original do plano (que listava só os 8 `title` como pontos de varredura), mas foi descoberta durante a leitura obrigatória de cada `title` — fica dentro do escopo da task (varredura de tooltips).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `14-AUDITORIA.md` pronta para receber as varreduras dos Planos 04 (WhatsApp/Captação/Documentos-Negociação/Prédio) e 05 (consolidação final + contagem)
- Padrão de correção de toast de erro (adicionar verbo de próximo passo mantendo a mensagem original intacta) estabelecido nesta plano pode ser reaproveitado pelo Plano 04 se encontrar toasts equivalentes nos fluxos de WhatsApp/Captação/Negociação
- Nenhum bloqueio; suíte 100% verde (107/107) ao fim do plano; contagens vivas confirmadas: `toast(` = 46, `aria-label="` = 35, `title="` = 8 (todas inalteradas em quantidade)

---
*Phase: 14-linguagem-impecavel-pt-br-gate-de-release*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-03-SUMMARY.md`
- FOUND: commit `20988e3`
- FOUND: commit `5adbcb4`
