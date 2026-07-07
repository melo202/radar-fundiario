---
phase: 10-acao-whatsapp-captacao-salvos
plan: 03
subsystem: ui
tags: [whatsapp, captacao, sheet, clipboard, acao-01, lei-da-tela]

# Dependency graph
requires:
  - phase: 10-acao-whatsapp-captacao-salvos (10-01)
    provides: 5 templates zap*/4 templates capt* (RADAR_PURE, strings puras); shape do objeto `data`
  - phase: 10-acao-whatsapp-captacao-salvos (10-02)
    provides: cache `DCUR.__scores={op,conf}` escrito pelos call sites de renderScoresInto; padrão
      de leitura silenciosa de radar_prof; #dActsPrim/#dActsMore já resolvidos pela lei da tela
provides:
  - "dadosFicha(): único ponto de montagem do objeto data real (DCUR + mercadoEstimado + __scores
    + leituraPratica + radar_prof) — allowlist implícita de 10 campos, null se !DCUR"
  - "copyTexto(texto,okMsg): clipboard com fallback execCommand + toast de falha nunca-silencioso
    — usado por copyZap e copyCapt (copyInsc/copyLink existentes não retrofitados)"
  - "copyZap(tipo)/copyCapt(tipo): 9 mapeamentos tipo->template->toast específico (ZAP-01/CAPT-01)"
  - "#captSheet: Modo Captação (padrão .wiz sem dots/wfoot) com 4 blocos + copiar individual +
    disclaimer condicional (assinatura ausente) + Esc/foco (CAPTRET)"
  - "Grupo 'Copiar para WhatsApp' (5 botões) + 'Captar este imóvel' ao final de #dActsMore"
  - "Sweep ACAO-01 documentado: todas as superfícies de resultado terminam com ação útil"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "copyTexto() como único ponto de escrita no clipboard para funcionalidade NOVA — disciplina
      de fallback+feedback não retrofitada em copyInsc/copyLink (fora de escopo, zero regressão)"
    - "CAPTRET variável de foco isolada (não compartilha WIZRET) — dois sheets .wiz podem coexistir
      sem se pisarem, mesmo padrão de nome (XXXRET) usado no wizard"
    - "Especificidade CSS incondicional (.detail .acts .zapbtn, 0,3,0) para vencer o seletor
      genérico .detail .acts button (0,2,1) — mesmo padrão do fix WR-01 da Fase 9"
    - "Esc chain: sheet modal mais recente sempre no TOPO da cadeia de prioridade (captSheet antes
      de wiz, que é o padrão já estabelecido pelas Fases 8/9)"

key-files:
  created: []
  modified:
    - radar-goiania.html (CSS ~linha 280-290 .zapgroup/.zapgroup-lbl/.detail .acts .zapbtn; CSS
      ~linha 384-390 .captblock/.captblock-lbl/.captblock-txt/.captcopy/.captdisclaimer; HTML
      #captSheet ~linha 785-822 irmão de #wiz; showDetail() #dActsMore ~linha 2445-2459; JS
      dadosFicha/copyTexto/copyZap ~linha 2678-2727; abrirCaptacao/fecharCaptacao/copyCapt
      ~linha 2864-2898; Esc chain ~linha 3331-3336)

key-decisions:
  - "Disclaimer do #captSheet ganhou id (#captDisclaimer) e é reescrito via textContent a cada
    abrirCaptacao() para poder acrescentar a nota condicional 'sem assinatura' quando d.perfil===
    null, sem duplicar o texto fixo do HTML estático"
  - "copyCapt(tipo) recalcula dadosFicha() em vez de reusar o data já usado para popular o sheet —
    mais barato que cachear e garante consistência se os scores mudarem com o sheet aberto (ex.:
    compare() termina depois do sheet já estar na tela)"
  - "Esc do #captSheet fica ANTES de #caixaList/#correctMenu/#ambigChips na cadeia (topo absoluto)
    — sheet modal mais recente (fullscreen, z-index 2000) tem prioridade sobre popups menores"

requirements-completed: [ZAP-01, CAPT-01, ACAO-01]

# Metrics
duration: 35min
completed: 2026-07-07
---

# Phase 10 Plan 03: Grupo WhatsApp + Modo Captação + Sweep ACAO-01 Summary

**5 botões "Copiar para WhatsApp" + "Captar este imóvel" em #dActsMore, sheet #captSheet (padrão .wiz) com 4 textos prontos + copiar individual, dadosFicha()/copyTexto() com fallback de clipboard, e o sweep ACAO-01 confirmando que toda superfície de resultado termina com ação útil — fecha a Fase 10.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-07
- **Tasks:** 2
- **Files modified:** 1 (radar-goiania.html)

## Accomplishments
- `dadosFicha()`: monta o objeto `data` real a partir de `DCUR` (guard `if(!DCUR)return null`), `mercadoEstimado(DCUR)` → `faixa`, `DCUR.__scores` → `scoreOp`/`scoreConf`, `leituraPratica(...)` recalculada com os scores atuais, e `radar_prof` só quando `p.nome` existe (perfil `null` caso contrário — nunca placeholder de assinatura)
- `copyTexto(texto,okMsg)`: `navigator.clipboard.writeText` com fallback real (`<textarea>` fora da viewport + `document.execCommand("copy")`) quando a API está ausente ou rejeita; toast de falha explícito ("Não foi possível copiar — tente selecionar o texto manualmente.") se ambos os caminhos falharem — nunca silencioso (T-10-11)
- `copyZap(tipo)`: 5 mapeamentos (`resumo/proprietario/comprador/preco/riscos` → `zapResumo/zapProprietario/zapComprador/zapArgumento/zapRiscos`) com 5 toasts distintos, nenhum genérico "Copiado"
- Grupo "Copiar para WhatsApp" (5 `.zapbtn`, ordem fixa) + "🧾 Captar este imóvel" renderizados ao final de `#dActsMore` em `showDetail()`, depois de `mapLinks` — separador tracejado `.zapgroup`
- `#captSheet`: sheet fullscreen reusando `.wiz`/`.wtop`/`.wbody`/`.wclose`/`.wh1`/`.wsub` (sem `.wdots`/`.wfoot` — não é wizard sequencial), com 4 `.captblock` (abordagem/script/checklist/follow-up), botão "Copiar ⧉" individual por bloco, e `.captdisclaimer` fixo (com nota condicional quando `perfil===null`)
- `abrirCaptacao()`/`fecharCaptacao()`: `CAPTRET` própria (isolada de `WIZRET`), foco movido ao `.wclose` na abertura, devolvido a `CAPTRET` no fechamento; animação `mAnimate(...,{opacity:[0,1]},{duration:0.18})` respeitando `REDUCE`
- `copyCapt(tipo)`: 4 mapeamentos (`zap/ligacao/checklist/followup` → `captAbordagem/captScript/captChecklist/captFollowup`) com toasts específicos, recalculando `dadosFicha()` a cada clique
- Esc fecha `#captSheet` no TOPO da cadeia de prioridade global (antes de `#caixaList`/`#correctMenu`/`#ambigChips`/`#wiz`)
- Todos os 4 textos do sheet passam por `esc()` antes do `innerHTML` (T-10-08 — texto contém endereço/bairro do cadastro)
- CSS novo: `.zapgroup`/`.zapgroup-lbl` + seletor **incondicional** `.detail .acts .zapbtn` (especificidade 0,3,0, `flex:none`) para vencer o genérico `.detail .acts button` (0,2,1); `.captblock`/`.captblock-lbl`/`.captblock-txt`/`.captcopy`/`.captdisclaimer` — zero hex novo, alvos ≥44px
- IN-01: nenhum onclick novo interpola texto livre — todos usam literais fixos (enum de tipo), textos de cadastro só entram no DOM via `esc()`
- Suite completa: 47/47 testes continuam verdes (zero regressão no bloco RADAR_PURE)

## Task Commits

Each task was committed atomically:

1. **Task 1: dadosFicha() + copyTexto() + grupo WhatsApp em #dActsMore** - `1e72141` (feat)
2. **Task 2: Sheet Modo Captação (#captSheet) + Esc/foco + sweep ACAO-01** - `56864b0` (feat)

## Files Created/Modified
- `radar-goiania.html`:
  - CSS `.zapgroup`/`.zapgroup-lbl`/`.detail .acts .zapbtn` junto às regras `.maisopcoes`
  - CSS `.captblock`/`.captblock-lbl`/`.captblock-txt`/`.captcopy`/`.captdisclaimer` junto às regras `.wiz`
  - HTML `#captSheet` no body, irmão estrutural de `#wiz` (logo após seu fechamento)
  - `showDetail()`: `#dActsMore` ganha os 2 `.zapgroup` (5 zapbtn + Captar) ao final do innerHTML
  - JS: `dadosFicha()`, `copyTexto()`, `copyZap()` (perto de `copyInsc`/`copyLink`)
  - JS: `CAPTRET`, `abrirCaptacao()`, `fecharCaptacao()`, `copyCapt()` (perto de `abrirLaudo`/`fecharLaudo`)
  - Esc listener global: `#captSheet` adicionado no topo da cadeia de prioridade

## Conteúdo final de #dActsMore (ordem)

1. Copiar inscrição ⧉ (persistente desde 10-02)
2. 🧮 Custos de compra (ITBI + cartório)
3. Titular (CND) ⧉↗
4. Copiar link deste imóvel ⧉
5. Links de mapa (Google Maps / Street View / Earth, condicional a coordenada)
6. **[novo]** `.zapgroup`: rótulo "Copiar para WhatsApp" + 💬 Resumo do imóvel ⧉ / 🏠 Mensagem para o proprietário ⧉ / 🔑 Mensagem para o comprador ⧉ / 💲 Argumento de preço ⧉ / ⚠️ Riscos e ressalvas ⧉
7. **[novo]** `.zapgroup`: 🧾 Captar este imóvel

`#dActsPrim` permanece inalterado desde 10-02 (📄 Gerar documento / 📊 Ver comparáveis / ⭐ Salvar oportunidade) — lei da tela preservada (1 primária + 2 secundárias na área principal; tudo novo desta plan foi para `#dActsMore`).

## Wiring dadosFicha() → templates (campos usados)

```js
{
  endereco: addrDe(DCUR),
  bairro: clean(DCUR.nmbairro),
  quadra: clean(DCUR.nrquadra),
  lote: clean(DCUR.nrlote),
  tipoImovel: unitLabel(DCUR)||USO[DCUR.uso]||"Imóvel",
  faixa: mercadoEstimado(DCUR) ? {lo, hi} : null,
  scoreOp: DCUR.__scores.op || null,
  scoreConf: DCUR.__scores.conf || null,
  leitura: leituraPratica({tipoImovel, bairro, oportunidade: scoreOp, confianca: scoreConf}),
  perfil: radar_prof (só se p.nome existir, senão null)
}
```

Consumido por: `zapResumo/zapProprietario/zapComprador/zapArgumento/zapRiscos` (copyZap) e `captAbordagem/captScript/captChecklist/captFollowup` (abrirCaptacao/copyCapt) — todas as 9 funções recebem o MESMO objeto, sem transformação intermediária.

## Sweep ACAO-01 (superfície → ação)

| Superfície | Ação presente | Verificação |
|---|---|---|
| Ficha (`#dActsPrim`) | 📄 Gerar documento (primária) + 📊 Ver comparáveis + ⭐ Salvar oportunidade (secundárias) | Confirmado — inalterado desde 10-02, dentro da lei da tela |
| Ficha (`#dActsMore`) | Copiar inscrição/custos/CND/link/mapas + **grupo WhatsApp (5) + Captar (novo nesta plan)** | Confirmado — nenhuma superfície de ficha sem próxima ação |
| Lista/count | Botão "⬇ Baixar planilha" (CSV) dentro de `.count` | Confirmado linha ~2142; salvar em lote fora de escopo (CONTEXT.md) |
| Estado vazio (`#emptyState`) | `#exampleChips` (exemplos tocáveis, Fase 8) + blocos "Minhas oportunidades"/"Histórico" (10-02, via `#savedBlocks`) | Confirmado — container estático sobrevive a qualquer busca |
| Chooser (`#chooser`) | Cada `.chrow` já é a ação (`chooseThis(i)` → abre a ficha da unidade escolhida) | Confirmado linha ~2276 |
| Erro/vazio de busca | Mensagens com próximo passo em 1 toque (Fase 8) | Confirmado, não modificado nesta plan |

**Resultado do sweep: nenhuma correção necessária** — todas as 6 superfícies já terminavam com ação útil antes desta task; esta plan apenas ADICIONOU ação nova à ficha (grupo WhatsApp/Captar), sem violar a lei da tela em nenhuma superfície.

## Decisions Made
- Disclaimer do `#captSheet` recebeu `id="captDisclaimer"` e é reescrito via `textContent` em cada `abrirCaptacao()` para permitir a nota condicional "Textos sem assinatura..." quando `perfil===null`, sem duplicar HTML estático
- `copyCapt(tipo)` recalcula `dadosFicha()` a cada clique em vez de reusar o `data` já usado para popular o sheet — mantém consistência se os scores forem atualizados (`atualizarScores`) enquanto o sheet está aberto
- Esc do `#captSheet` posicionado no TOPO absoluto da cadeia (antes até de `#caixaList`) — sheet fullscreen modal (`z-index:2000`) sempre tem prioridade sobre popups menores

## Deviations from Plan

None - plan executado exatamente como escrito. A nota de especificidade CSS do plano (seção `<interfaces>`, já corrigida no plan-check para "seletor incondicional") foi seguida literalmente: `.detail .acts .zapbtn` com `flex:none`, sem nenhuma verificação condicional adicional.

## Issues Encountered
- `node --check radar-goiania.html` continua falhando com `ERR_UNKNOWN_FILE_EXTENSION` no Windows/Node 24 — mesma limitação documentada em 10-01/10-02-SUMMARY.md (arquivo `.html`, não `.js`). A verificação real de sintaxe ocorre via `node --test "tests/*.test.mjs"` (47/47 passou) e pelos scripts Python de verificação do próprio plano, que confirmaram presença/posição/conteúdo de todas as funções e marcações novas. Nenhuma mudança de código foi necessária.

## User Setup Required

None - nenhuma configuração de serviço externo necessária. Toda a funcionalidade é client-side (clipboard API + fallback execCommand).

## Next Phase Readiness
- Fase 10 completa (10-01 templates + 10-02 persistência + 10-03 UI de ações) — ZAP-01, CAPT-01, SALV-01, ACAO-01 todos cumpridos fim-a-fim
- Pendências explícitas para `/gsd-verify-phase`: verificação visual mobile (375px) e desktop (1280px) do `#captSheet` e do grupo `.zapgroup` dentro de `#dActsMore`; contraste dos novos componentes; navegação por teclado completa dentro do sheet (Tab entre os 4 `.captcopy` + `.wclose`)
- Nenhum bloqueio identificado

---
*Phase: 10-acao-whatsapp-captacao-salvos*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/10-acao-whatsapp-captacao-salvos/10-03-SUMMARY.md
- FOUND: 1e72141 (Task 1 commit)
- FOUND: 56864b0 (Task 2 commit)
