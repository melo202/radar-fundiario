---
phase: 13-refino-visual-pinos-motion-descoberta
plan: 02
subsystem: ui
tags: [leaflet, mapa, pinos, a11y, motion, skeleton, css]

# Dependency graph
requires:
  - phase: 13-refino-visual-pinos-motion-descoberta
    provides: "statusDeUnidade(input) pura (RADAR_PURE) + 8 vars --status-* no :root (13-01, plan 01)"
provides:
  - "statusPino(a)/PINO_STYLE/STATUS_LABEL — mapeiam a.__scores para cor/raio/rótulo do pino em plot()"
  - "bestStatusPorCi(list)/melhorStatus(s1,s2)/STATUS_PRIORIDADE — fonte única de 'melhor status por prédio', reusada por plot() e pick() (T-13-05)"
  - "legenda #pinoLegenda sempre-visível (atualizarLegenda) + tooltip acessível via bindTooltip (esc())"
  - "MOTION_MSG (5 mensagens literais) atreladas às fases reais de buscar()/finish()/compare()"
  - "SKELETON_HTML/mostrarSkeleton() + CSS .skel-card/.skel-line REDUCE-safe"
affects: [13-03-onboarding-descoberta]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fonte única de verdade para lógica de prioridade/comparação (STATUS_PRIORIDADE + melhorStatus) compartilhada entre 2+ call-sites, em vez de duplicar critério de comparação"
    - "Mensagem de progresso condicional só dispara se o overlay já está visível (guarda classList.contains('show')) — nunca força reabertura de UI de loading fora da janela real"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "Legenda de pino: dot de 'Caixa' usa o MESMO estilo sólido do dot de 'Atenção' (mesmo hex --gold) — a distinção fica 100% no ícone 🏦 + rótulo textual, NUNCA border-style dashed na bolinha de 8px (nota de plan-check: tracejado é ilegível em círculo pequeno entre browsers; diverge do 13-UI-SPEC.md original, que sugeria dashed — esta plan segue a correção do plan-check, não o UI-SPEC nesse ponto específico)"
  - "Mensagem 4 (Buscando comparáveis…) implementada como guarda condicional dentro de compare() — só chama loading(true,...) se #loading já tiver a classe 'show' no momento; nunca reabre o overlay artificialmente. Na prática, como buscar() já terminou (finally já rodou loading(false)) na maioria dos fluxos de lista, essa mensagem só aparece no caminho de imóvel único (plot() chama pick() sincronamente, que chama showDetail(), que pode disparar compare() ainda dentro da janela do loading original se a chamada for rápida) — comportamento aceito e documentado, conforme T-13-07 do threat model"
  - "verNoMapa() (linha ~3198-3201) mantém seu próprio fillColor fixo '#b5451f' de restauração pós-flash — fora do escopo desta plan (só plot()/pick() foram especificados); registrado em deferred-items.md para correção futura reusando bestStatusPorCi/statusPino"

patterns-established:
  - "Pattern: pino de PRÉDIO (várias unidades no mesmo CI) usa o MELHOR status entre as unidades (mais otimista vence) — nunca média, nunca pior caso"
  - "Pattern: CALLER seta a mensagem de loading ANTES de invocar uma função que não deve ter sua assinatura alterada (finish() seta MOTION_MSG.mapa antes de plot(), em vez de plot() receber um parâmetro novo)"

requirements-completed: [PIN-01, MOT-01]

duration: 12min
completed: 2026-07-07
---

# Phase 13 Plan 02: Pinos Semânticos + Motion de Busca em Etapas Summary

**`plot()`/`pick()` do Leaflet agora coloreiam pinos por `statusDeUnidade` (verde/amarelo/vermelho/cinza) com legenda sempre-visível e tooltip acessível; `buscar()`/`finish()`/`compare()` disparam as 5 mensagens literais de progresso real + skeleton shimmer CSS-only REDUCE-safe**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-07T19:01:00Z (estimado, ver commits)
- **Completed:** 2026-07-07T19:15:42Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `statusPino(a)`/`PINO_STYLE`/`STATUS_LABEL` criados junto a `plot()` (linha ~3104): cada `circleMarker` nasce com `fillColor`/`radius` derivados de `statusDeUnidade(a.__scores)` (13-01) em vez do fixo `"#b5451f"` universal; pino de PRÉDIO (`cntCi[ci]>1`) usa o melhor status entre as unidades via `bestStatusPorCi(list)`
- `bestStatusPorCi(list)`/`melhorStatus(s1,s2)`/`STATUS_PRIORIDADE` — fonte ÚNICA de "melhor status por CI", chamada tanto por `plot()` (ao criar os markers) quanto por `pick()` (ao restaurar o estilo de desselecionar) — cumpre T-13-05 do threat model (zero duplicação de critério)
- `pick(i)`: branch de desselecionar trocado de `fillColor:"#b5451f"` fixo para `PINO_STYLE[status].fillColor`/`radius`, usando a mesma fonte de verdade de `plot()`; branch de SELECIONADO (`"#c9691f"`/`radius:12`) permanece inalterado, ortogonal ao status
- Cada marker ganha `.bindTooltip("${statusLabel} · ${endereço/unidade escapado}")` — cumpre T-13-04 (esc() no texto interpolado)
- `#pinoLegenda` (HTML dentro de `.mapwrap`, junto a `#coachMark`/`#breadcrumb`) + CSS `.pino-legenda`/`.pl-dot`; `atualizarLegenda(list.length>0)` chamada ao final de `plot()` — legenda aparece/desaparece automaticamente, nunca é toggle manual
- **Decisão de plan-check aplicada:** dot de "Caixa" NÃO usa `border-style:dashed` (ilegível em bolinha de 8px) — diferenciação de "Atenção" (mesmo hex `--gold`) é 100% pelo ícone 🏦 + rótulo textual "Caixa"
- `MOTION_MSG` (5 mensagens literais) criado junto a `loading()`; `buscar()` dispara `MOTION_MSG.localizando` como primeira ação (antes de qualquer branch de `MODE`), substitui as 4 mensagens específicas por modo por `MOTION_MSG.cadastro`, preserva o fallback de erro "número não achado — varrendo a rua…" literal e intocado
- `finish()`: `MOTION_MSG.estimativa` imediatamente antes de `render()`; `MOTION_MSG.mapa` imediatamente antes de `plot()` (assinatura de `plot()` NÃO alterada — o caller seta a mensagem)
- `compare()`: `MOTION_MSG.comparaveis` só dispara se `#loading` já tiver a classe `show` no momento (guarda `classList.contains("show")`) — nunca força reabertura do overlay (T-13-07)
- `SKELETON_HTML`/`mostrarSkeleton()`: 3 `.skel-card` (cada com 3 `.skel-line`, larguras 80/60/40%) injetados em `#results` logo após `loading(true, MOTION_MSG.localizando)`, sempre substituídos por `render()` real ou pelo bloco de erro do `catch` (nunca "pendurado")
- CSS `.skel-card`/`.skel-line`/`@keyframes skel-shimmer` com variante `prefers-reduced-motion: reduce` (estático, cor sólida, sem `animation`)
- `toggleCaixa()`/`caixaLayer` (linhas ~4499-4545, deslocadas de ~4497-4516 original por edições da 13-01) confirmados INTOCADOS por leitura do diff — zero linha modificada nessa região
- Suite de testes: 107/107 passam após ambos os tasks, zero regressão (esta plan não toca `RADAR_PURE`)

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Pinos semânticos — statusPino/PINO_STYLE + legenda + tooltip + pick()** - `63a6a7d` (feat)
2. **Task 2: Motion de busca em etapas + skeleton shimmer** - `fd71282` (feat)

## Files Created/Modified

- `radar-goiania.html` - `statusPino`/`PINO_STYLE`/`STATUS_LABEL`/`bestStatusPorCi`/`melhorStatus`/`atualizarLegenda` (linhas ~3104-3139); `plot()` edita a criação do `circleMarker` para usar `PINO_STYLE[status]`+`bindTooltip` (linhas ~3142-3175); `pick()` restaura o status real ao desselecionar (linhas ~3229-3245); `#pinoLegenda` HTML + `.pino-legenda`/`.pl-dot` CSS; `MOTION_MSG`/`SKELETON_HTML`/`mostrarSkeleton()` (junto a `loading()`); `buscar()` com as 5 chamadas de `loading(true, MOTION_MSG.*)` substituindo as mensagens antigas por modo; `finish()` com `MOTION_MSG.estimativa`/`MOTION_MSG.mapa`; `compare()` com guarda condicional de `MOTION_MSG.comparaveis`; CSS `.skel-card`/`.skel-line`/`@keyframes skel-shimmer`

## Pontos Exatos de Inserção de `loading(true, MOTION_MSG.*)`

| Mensagem | Local | Linha aprox. (pós-edição) | Substitui |
|---|---|---|---|
| `MOTION_MSG.localizando` | Início de `buscar()`, logo após `btn.disabled=true;closeDetail();`, ANTES do `try{` — cobre TODOS os modos | ~2536 | (nova — não existia mensagem única antes) |
| `MOTION_MSG.cadastro` | Branch `MODE==="insc"`, antes do 1º `jsonp` | ~2543 | `"consultando inscrição…"` |
| `MOTION_MSG.cadastro` | Branch `MODE==="addr"`, antes do 1º `fetchWhere` | ~2555 | `"consultando o endereço…"` |
| `MOTION_MSG.cadastro` | Branch `MODE==="bd"`, antes do 1º `fetchWhere` | ~2598 | `"procurando o edifício…"` |
| `MOTION_MSG.cadastro` | Branch `ql` (else final), antes do 1º `fetchWhere` | ~2615 | `"consultando a quadra…"` |
| (inalterado) | Fallback de erro, modo `addr`, número não casou | ~2577 | `"número não achado — varrendo a rua…"` — permanece literal, NÃO faz parte da sequência feliz |
| `MOTION_MSG.estimativa` | `finish()`, imediatamente ANTES de `render(units,{stagger:true})` | ~2700 | (nova) |
| `MOTION_MSG.mapa` | `finish()`, imediatamente ANTES de `plot(units)` | ~2704 | (nova) |
| `MOTION_MSG.comparaveis` (condicional) | Início de `compare()`, SE `#loading.classList.contains("show")` | ~3708 | (nova — guardada) |

## Decisão Final: Mensagem 4 Condicional (Comparáveis)

Implementada EXATAMENTE como o plano descreveu na seção `<facts>`: dentro do corpo de `compare()`,
antes de qualquer outra linha, checa `document.getElementById("loading").classList.contains("show")`
e só então chama `loading(true, MOTION_MSG.comparaveis)`. Nunca força a abertura do overlay.

Na prática, isso significa que a mensagem 4 aparece quase exclusivamente no fluxo de **imóvel
único** (`plot()` → `list.length===1` → chama `pick()` sincronamente → `showDetail()` pode
disparar `compare()` se `mesmaAnalise` for true, ainda dentro da janela síncrona de `buscar()`
antes do `finally{loading(false)}` rodar). No fluxo de **lista** (múltiplos resultados), o
usuário abre a ficha manualmente bem depois de `buscar()` já ter terminado — `#loading` já não
tem a classe `show`, e a mensagem 4 é corretamente PULADA (comportamento intencional, evita
"teatro" — ver Estados Transversais do UI-SPEC: "Motion etapa 4 sem requisição real em voo →
etapa pulada").

## Lógica Exata de "Melhor Status por CI"

Única fonte de verdade, usada IDENTICAMENTE em `plot()` e `pick()`:

```js
const STATUS_PRIORIDADE=["bom","atencao","risco","semdado"];
function melhorStatus(s1,s2){
  return STATUS_PRIORIDADE.indexOf(s1)<=STATUS_PRIORIDADE.indexOf(s2)?s1:s2;
}
function bestStatusPorCi(list){
  const out={};
  list.forEach(a=>{
    const ci=clean(a.ci), s=statusPino(a);
    out[ci]=out[ci]===undefined?s:melhorStatus(out[ci],s);
  });
  return out;
}
```

`plot()` chama `bestStatusPorCi(list)` uma vez, antes do `list.forEach` que cria os markers, e usa
`bestStatusByCi[ci]` sempre que `cntCi[ci]>1` (prédio). `pick()` recalcula `bestStatusPorCi(LAST||[])`
(mesma função, sobre `LAST` — a lista completa da busca atual) ao desselecionar, garantindo que as
duas funções NUNCA divirjam de critério (cumpre T-13-05).

## Confirmação: `toggleCaixa()`/`caixaLayer` Intocados

```bash
git diff radar-goiania.html | grep -i caixa
# única ocorrência: comentário novo em statusPino() mencionando "caixaLayer é separada, ver toggleCaixa"
```

Nenhuma linha das funções `toggleCaixa()`/`initCaixa()`/`caixaPopup()` ou da declaração
`let caixaLayer=null,caixaOn=false;` foi modificada — confirmado por leitura direta do diff de
ambos os commits (`63a6a7d`, `fd71282`). O pino dourado da camada CAIXA continua vindo de seu
próprio `L.circleMarker({fillColor:"#a8842c",...})` na função `toggleCaixa()`, independente de
`PINO_STYLE`.

## Decisões Made

Ver `key-decisions` no frontmatter. Resumo:
1. Legenda: dot "Caixa" sólido (não dashed) — diferenciador é ícone+rótulo, corrigindo o UI-SPEC original conforme nota de plan-check embutida no plano.
2. Mensagem 4: guarda condicional em `compare()`, nunca força reabertura do overlay.
3. `verNoMapa()` fora do escopo — registrado em `deferred-items.md`.

## Deviations from Plan

None - plan executado exatamente como escrito (incluindo a correção de plan-check sobre a legenda, que já estava documentada no corpo do próprio plano como a abordagem a seguir).

## Issues Encountered

None.

## Known Stubs

Nenhum stub introduzido. Toda a lógica de pinos/legenda/motion opera sobre dados já em memória
(`a.__scores`, `LAST`) ou é puramente CSS — sem placeholder de dados, sem chamada de rede nova.

## Threat Flags

Nenhuma superfície nova de risco introduzida além das já mapeadas no `<threat_model>` do plano
(T-13-04 a T-13-07, todas mitigadas conforme descrito acima). Nenhuma rota de rede, auth ou schema
nova.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `statusPino`/`PINO_STYLE`/`bestStatusPorCi`/`STATUS_LABEL` disponíveis para 13-03 (onboarding/descoberta) referenciar sem reabrir esta plan, caso o onboarding precise ilustrar a legenda de pinos
- `MOTION_MSG`/`mostrarSkeleton()` disponíveis para qualquer refinamento futuro de motion
- Verificação visual em navegador (preview) NÃO foi possível nesta sessão — não há servidor de preview do app HTML único ativo nem ferramenta de browser automation disponível no toolset desta execução; a verificação foi feita por leitura estática do código + suite de testes (107/107) + greps de confirmação de escopo (CAIXA intocado). Recomenda-se verificação visual manual (mobile 375 + desktop 1280) antes do merge final da fase, conforme checklist do 13-UI-SPEC.md
- `verNoMapa()` com hex fixo de restauração pós-flash registrado em `deferred-items.md` para correção futura (fora do escopo desta plan)

---
*Phase: 13-refino-visual-pinos-motion-descoberta*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/13-refino-visual-pinos-motion-descoberta/13-02-SUMMARY.md
- FOUND: .planning/phases/13-refino-visual-pinos-motion-descoberta/deferred-items.md
- FOUND commit: 63a6a7d (feat(13-02): pinos semanticos por status + legenda + tooltip + pick())
- FOUND commit: fd71282 (feat(13-02): motion de busca em etapas + skeleton shimmer)
