---
phase: 11-documentos-em-3-niveis
plan: 03
subsystem: ui
tags: [templates, relatorio, ptam, ficha-rapida, cnai, montarLaudo, cofeci]

# Dependency graph
requires:
  - phase: 11-documentos-em-3-niveis
    plan: 01
    provides: fichaRapidaTexto(data) (RADAR_PURE) — texto puro da Ficha rápida, chamado diretamente por montarFichaRapida()
  - phase: 11-documentos-em-3-niveis
    plan: 02
    provides: LZ.tipoDoc/LZ.docOk/LZ.prof.cnai — campos do wizard consumidos por montarLaudo()/montarFichaRapida()
provides:
  - "montarLaudo() ramificado por LZ.tipoDoc: 'ficha' delega para montarFichaRapida(), 'relatorio'/'ptam' seguem o pipeline existente"
  - "Título do PTAM decidido por comCnai (não mais comCreci) — Metodologia/Ressalvas também migradas para o mesmo gate, corrigindo contradição normativa"
  - "Bloco de assinatura .lass com CRECI + CNAI + linha .lass-resp (Res. COFECI 1.066/2007) condicional a comCnai"
  - "Ressalva adicional no Relatório/PTAM quando LZ.docOk===false"
  - "montarFichaRapida()/renderFichaRapida(): novo template de 1 página pelo mesmo pipeline #laudo->#laudoView->imprimirLaudo()"
affects: [12-territorio-e-oportunidades, 13-refino-visual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Toda menção normativa COFECI/CNAI no laudo é gated por comCnai, nunca por comCreci — comCreci só controla exibição do número do CRECI"
    - "Templates de saída novos (montarFichaRapida) sempre delegam ao MESMO fechamento #laudo->#laudoView (fecharLaudo + innerHTML copy + laudoView.hidden=false) em vez de duplicar a mecânica de exibição"

key-files:
  created: []
  modified:
    - radar-goiania.html (montarLaudo ~3221-3320, montarFichaRapida/renderFichaRapida novas ~3324-3375, CSS .lass-resp/.fr-* ~502-510)

key-decisions:
  - "Comparáveis da Ficha rápida usam a MESMA conclusão agregada (g.res/myPm2, 1 frase no padrão CMP-01) em vez de simular comparáveis individuais fictícios — mais honesto, decisão de escopo já travada no plano (T-11-09)"
  - "renderFichaRapida() separado de montarFichaRapida() (montagem de dados vs. render HTML) — segue a mesma divisão de responsabilidade sugerida no plano, facilita leitura/teste"

requirements-completed: [DOC-01]

# Metrics
duration: ~20min
completed: 2026-07-07
---

# Phase 11 Plan 03: Documentos em 3 Níveis — Templates Finais Summary

**montarLaudo() ramificado por LZ.tipoDoc (ficha/relatório/PTAM), título do PTAM e TODA menção normativa COFECI (Metodologia + Ressalvas) decididos por comCnai em vez de comCreci, assinatura com CRECI+CNAI+linha COFECI condicional, e novo template montarFichaRapida()/renderFichaRapida() de 1 página reusando fichaRapidaTexto() pelo mesmo pipeline #laudo→#laudoView.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments

- Título do PTAM decidido por `comCnai` (preencher só CRECI mantém "Relatório de Referência de Mercado"; preencher CNAI muda para "Parecer Técnico de Avaliação Mercadológica (PTAM)")
- Corrigida a contradição normativa apontada pelo plan-check: o parágrafo de Metodologia (menção à NBR 14.653 + diretrizes do COFECI) estava gated por `comCreci` — agora gated por `comCnai`, junto com a Ressalva final, eliminando o caso CRECI-sem-CNAI que citava COFECI na Metodologia e o negava na Ressalva
- Bloco `.lass` (assinatura) mostra CRECI (se houver) + CNAI (se houver) + linha `.lass-resp` ("Responsável técnico pela avaliação, nos termos da Res. COFECI nº 1.066/2007.") somente quando `comCnai`
- Ressalva adicional de documentação pendente quando `LZ.docOk===false`
- `montarLaudo()` ganhou guard no topo (`if(LZ.tipoDoc==="ficha"){montarFichaRapida();return;}`) — zero mudança de comportamento para Relatório/PTAM
- `montarFichaRapida()` monta o objeto `data` a partir de `LZ` (nunca `DCUR`) e chama `fichaRapidaTexto()`/`scoreConfianca()`/`scoreOportunidade()`/`leituraPratica()`/`mercadoEstimado()` já existentes — zero recálculo duplicado
- `renderFichaRapida()` renderiza o template de 1 página (faixa em destaque, resumo, leitura prática, comparáveis quando `n>=3`, ressalvas, contato do corretor omitido se perfil vazio) pelo MESMO fechamento `fecharLaudo()` + cópia para `#laudoViewBody` + `#laudoView.hidden=false` usado por `montarLaudo()` — guarda `ec9f129` preservada em ambos os caminhos
- CSS novo: `.lass-resp`, `.fr-hero`, `.fr-faixa`, `.fr-faixa-lbl`, `.fr-comps`, `.fr-contato` — todos usando tokens já existentes (`--muted`, `--paper-2`, `--accent`, `--ink`, `--line`), zero hex novo
- Suite completa `node --test "tests/*.test.mjs"`: **64/64 pass**, zero regressão
- Verificação regex pós-implementação: nenhuma ocorrência de `comCreci` no arquivo condiciona menção a "COFECI" — todas as ocorrências restantes de `comCreci` controlam apenas a exibição do número do CRECI

## Task Commits

Each task was committed atomically:

1. **Task 1: Título por CNAI + bloco de assinatura PTAM + ressalva de documentação pendente** - `3c77fea` (feat)
2. **Task 2: montarFichaRapida() — novo template de 1 página + ramificação em montarLaudo()** - `d4e9fe3` (feat)

## Files Created/Modified

- `radar-goiania.html`:
  - `montarLaudo()` (linha ~3221): guard de topo por `LZ.tipoDoc==="ficha"`; `comCnai` declarado junto com `comCreci`; `titulo` decidido por `comCnai`; menção ao COFECI na Metodologia (linha ~3270) migrada de `comCreci` para `comCnai`; ternário da Ressalva final migrado para `comCnai`; nova linha de ressalva condicional a `LZ.docOk===false`; bloco `.lass` com CRECI+CNAI+`.lass-resp` condicional
  - `montarFichaRapida()` (nova, ~3324): monta `data` a partir de `LZ.a`/`LZ.prof`/`LZ.comps` reusando `unitLabel`/`m2Edif`/`m2Terr`/`isGarage`/`scoreConfianca`/`scoreOportunidade`/`leituraPratica`/`mercadoEstimado`/`fichaRapidaTexto`; comparáveis = 1 frase agregada honesta quando `g.res.n>=3`, `undefined` (vira `[]`) caso contrário
  - `renderFichaRapida(a,data,fr)` (nova, ~3355): template HTML do Componente 4 do UI-SPEC; mesmo fechamento `#laudo`→`#laudoView` de `montarLaudo()`
  - CSS: `.lass-resp` (linha ~504), `.fr-hero`/`.fr-faixa`/`.fr-faixa-lbl`/`.fr-comps`/`.fr-comps li`/`.fr-contato` (linhas ~505-510)

## Decisions Made

- Comparáveis da Ficha rápida usam a conclusão agregada real (`g.res`/`myPm2`), nunca simulam comparáveis individuais fictícios sem dado de origem — mais honesto e evita inventar endereços que a Ficha não tem acesso individual (decisão de escopo já documentada no próprio plano, T-11-09).
- `renderFichaRapida()` mantido como função separada de `montarFichaRapida()`, seguindo a divisão de responsabilidade proposta no plano (montagem de dados vs. render HTML) — facilita leitura e testes futuros sem misturar cálculo com template.

## Deviations from Plan

None - plan executado exatamente como escrito, incluindo o passo 6 (ampliado pós plan-check) de corrigir a menção ao COFECI na Metodologia.

## Issues Encountered

Nenhum. `dadosFicha()` (usado fora do wizard, Modo Captação) foi lido apenas para confirmar o shape do objeto `data` — não foi modificado, conforme o escopo da plan.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Fluxo Completo Ponta-a-Ponta (confirmado)

Seletor de Finalidade (11-02, `abrirSeletorFinalidade()`/`finSet()`/`finEscolherDoc()`) → wizard (passos 0-3: imóvel/valor/fotos/perfil com CRECI+CNAI separados) → Confiança+Pendências (11-02, passo 4) → Revisão final (11-02, passo 5, único gatilho de `montarLaudo()`) → **`montarLaudo()` ramifica por `LZ.tipoDoc`** (11-03): `"ficha"` → `montarFichaRapida()`/`renderFichaRapida()` (1 página); `"relatorio"`/`"ptam"` → corpo existente com título/assinatura decididos por `comCnai` → PDF no clique real em `imprimirLaudo()` (guarda `ec9f129` preservada em todos os caminhos).

## Resultado Final da Suite de Testes (Fase 11 completa)

```
node --test "tests/*.test.mjs"
ℹ tests 64
ℹ pass 64
ℹ fail 0
```

47 testes pré-Fase-11 + 17 testes de `doc.test.mjs` (11-01) — 100% pass, zero regressão em nenhuma das 3 waves da Fase 11.

## Next Phase Readiness

- DOC-01 cumprido: as 3 saídas documentais (Ficha rápida, Relatório de avaliação, Laudo/PTAM) nomeadas e ramificadas corretamente, título do PTAM condicionado à habilitação CNAI real (não apenas CRECI).
- Fase 11 (Documentos em 3 Níveis) está funcionalmente completa: Seletor de Finalidade → wizard → template certo → PDF no clique, com o contrato de responsabilidade técnica (CRECI/CNAI/COFECI) livre de contradição normativa.
- Nenhum bloqueio para as próximas fases (12+).

---
*Phase: 11-documentos-em-3-niveis*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/11-documentos-em-3-niveis/11-03-SUMMARY.md
- FOUND commit: 3c77fea (feat: Task 1 — título por CNAI + assinatura + ressalva)
- FOUND commit: d4e9fe3 (feat: Task 2 — montarFichaRapida + ramificação)
