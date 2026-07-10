---
phase: 17-diff-cadastro-cruzamento-caixa
plan: 02
subsystem: territorio
tags: [diff, caderno, caixa, ui, mapa, xss, leaflet]

# Dependency graph
requires:
  - phase: 17-diff-cadastro-cruzamento-caixa (plan 01)
    provides: "diffLote/formatarDiff, construirNomeParaCdbairro/cdbairroDoImovelCaixa/cruzarCaixaTerritorio/cruzarCaixaSetor (RADAR_PURE), cadernoBuscar(ci), snapshot no 1o save, sanitizeCaderno com allowlist recursiva"
provides:
  - "#dDiff estatico na ficha + renderDiffUI(a) - diff neutro (sem cor de status) hookado em showDetail, chave clean(a.ci||a.nrinscr), grava snapshot novo silenciosamente"
  - "garantirNomeParaCdbairro() - Map nome->cdbairro memoizado 1x por sessao, consumido por badge/linha/anel"
  - "#cadernoCaixaBadge em renderCadernoBlock() - badge Caixa quando ha cruzamento real"
  - "#terrCaixaLine em montarPainel() - linha Caixa do setor em foco (IIFE async antes dos early returns)"
  - "garantirCaixaLayer() + caixaAnelLayer - anel no pino Caixa quando o setor esta salvo, popup com linha extra, legenda atualizada"
  - "abrirCaixaNoMapaUI(el) - acao 1 toque compartilhada (badge/linha), N=1 centraliza+popup, N>1 fitBounds+toast"
affects: [18-proximas-fases-territorio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IIFE async ANTES dos early-returns de uma funcao de render sincrona (montarPainel) - permite popular um bloco condicional sem bloquear o render principal nem perder o caso st.n===0"
    - "Resolver dados assincronos (nomeMap+itens) ANTES da 1a construcao de uma camada Leaflet que faz bindPopup com string estatica (garantirCaixaLayer) - evita popup 'congelado' sem a informacao cruzada"
    - "Handler de acao 1 toque compartilhado entre 2 superfícies (badge/linha) lendo data-attribute (dataset.bairros), nunca interpolando valor do endpoint em onclick="""

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "BAIRROS (global já declarada, nunca populada) agora recebe o FeatureCollection dentro de loadBairroPolys() - garantirNomeParaCdbairro() precisa das features reais; documentado como fix de blocking issue (Rule 3), zero requisição nova (mesmo fetch que já montava bairroLayer)"
  - "toggleCaixa() tornou-se async e a construção dos pinos/anéis foi extraída para garantirCaixaLayer() (idempotente) - compartilhada com abrirCaixaNoMapaUI() para nunca duplicar a construção nem disparar 2 toasts conflitantes"
  - "Badge do Caderno usa a lista `itens` já filtrada pelo filtro de setor/status ativo (CADERNO_FILTRO) - mesma variável já em memória, zero requisição extra; decisão consistente com a literalidade do plano"

patterns-established:
  - "renderDiffUI(a) como irmã assíncrona de renderCadernoBtn() - mesmo guard de ficha-mudou-durante-a-Promise"

requirements-completed: [TERR-06, TERR-07]

# Metrics
duration: 12min
completed: 2026-07-10
---

# Phase 17 Plan 02: UI do Diff de Cadastro & Cruzamento Caixa Summary

**4 superfícies de UI novas (bloco de diff na ficha, badge no Caderno, linha no painel do território, anel/popup/legenda no pino Caixa) ligadas ao núcleo puro do Plano 01, com ação em 1 toque e zero XSS via data-attributes.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-10T02:31:06Z
- **Completed:** 2026-07-10T02:43:26Z
- **Tasks:** 3/3 completos (Task 3 é verificação, sem diff de código)
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments
- `#dDiff` (ficha) + `renderDiffUI(a)` — diff enxuto e NEUTRO (nunca cor de status) revelado só para lote já salvo com snapshot; grava snapshot novo silenciosamente após exibir; falha de escrita nunca esconde o diff já mostrado
- `garantirNomeParaCdbairro()` memoizado — consumido por 3 superfícies (badge/linha/anel) sem requisição extra
- `#cadernoCaixaBadge` no Caderno + `#terrCaixaLine` no Painel do Território — só renderizam quando há match real (nunca "0 imóveis")
- Anel visual no pino Caixa (`caixaAnelLayer`, `--ink`, sem `dashArray`) + linha extra no popup (`.cxp-terr`) + item novo na legenda — reforço redundante em 3 lugares, nunca só cor
- `abrirCaixaNoMapaUI(el)` — ação em 1 toque compartilhada, lê `dataset.bairros`, N=1 centraliza+abre popup, N>1 `fitBounds`+toast

## Task Commits

Each task was committed atomically:

1. **Task 1: Bloco de diff #dDiff na ficha + renderDiffUI(a)** - `2c373f2` (feat)
2. **Task 2: Cruzamento Caixa — badge/linha/anel/popup/legenda + ação 1 toque** - `dffbb4b` (feat)
3. **Task 3: Verificação final (greps + npm test)** - sem commit próprio (nenhuma mudança de código; ver checklist abaixo)

**Plan metadata:** (este commit) `docs(17-02): complete UI do diff/cruzamento plan`

## Files Created/Modified
- `radar-goiania.html`:
  - HTML estático de `#dDiff` (entre `#dLeitura`/`#dActsPrim`) e `#terrCaixaLine` (entre `#terrGrid`/`#terrDetectorView`); item novo em `#pinoLegenda`
  - CSS novo: `.ddiff-*` (neutro, zero `--status-*`), `.cadbook-caixabadge`/`.terr-caixa-line` (≥44px), `.cxp-terr`
  - `renderDiffUI(a)` (irmã de `renderCadernoBtn`), hook em `showDetail`
  - `garantirNomeParaCdbairro()`, `garantirCaixaLayer()`, `abrirCaixaNoMapaUI(el)` (funções novas)
  - `renderCadernoBlock()` estendida com o badge; `montarPainel()` estendida com a linha (IIFE async antes dos early returns)
  - `toggleCaixa()` tornou-se async; `caixaPopup(i,noTerr)` ganhou 2º argumento opcional
  - `loadBairroPolys()`: fix — `BAIRROS` (global já declarada) agora populada com o FeatureCollection

## Decisions Made
- `BAIRROS` global (declarada desde sempre, nunca atribuída) recebeu o fetch de `bairros-goiania.json` dentro de `loadBairroPolys()` — sem essa correção, `garantirNomeParaCdbairro()` nunca teria dado real pra montar o Map nome→cdbairro (bloqueante para TERR-07 inteiro). Zero requisição nova — mesmo fetch que já existia.
- `toggleCaixa()` virou `async`; a construção dos pinos/anéis foi extraída para `garantirCaixaLayer()` (idempotente, compartilhada com `abrirCaixaNoMapaUI()`) — evita duplicar a construção (que só pode acontecer 1x por sessão, já que `bindPopup` recebe string estática) e evita 2 toasts conflitantes quando a ação de 1 toque também precisa garantir a camada montada.
- Badge do Caderno cruza contra a lista `itens` já filtrada pelo filtro de setor/status ativo (`CADERNO_FILTRO`) — mesma variável já em memória no momento da montagem, sem requisição extra; é a leitura literal do `<action>` do plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `BAIRROS` global nunca era populada**
- **Found during:** Task 2 (implementação de `garantirNomeParaCdbairro()`)
- **Issue:** O plano/interfaces do 17-01-SUMMARY e 17-RESEARCH afirmam "BAIRROS (features de bairros-goiania.json) é global", mas a variável `let BAIRROS=[]` (declarada desde cedo no arquivo) nunca era atribuída em nenhum lugar — os dados reais do GeoJSON só viviam numa variável LOCAL dentro de `loadBairroPolys()`, usada apenas para construir `bairroLayer` (Leaflet). Sem essa correção, `garantirNomeParaCdbairro()` receberia `feats=[]` sempre, e TODO o cruzamento Caixa (badge/linha/anel) ficaria permanentemente vazio (nunca haveria falso positivo, mas também nunca haveria acerto — silenciosamente quebrado).
- **Fix:** `loadBairroPolys()` agora atribui `BAIRROS=data;` logo após o fetch (mesmo dado que já monta `bairroLayer`, zero requisição nova).
- **Files modified:** `radar-goiania.html`
- **Verification:** `npm test` continua 184/184 (a mudança não afeta o bloco RADAR_PURE testado via `node:vm`); verificação funcional do cruzamento fica no checklist browser abaixo (o orquestrador confirma badge/linha/anel aparecendo com dado real).
- **Committed in:** `dffbb4b` (parte do commit da Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Necessário para que TERR-07 funcione de fato (sem essa correção as 3 superfícies de cruzamento ficariam sempre vazias, silenciosamente). Sem scope creep — é a pré-condição que o próprio plano assumia como já resolvida.

## Issues Encountered
None além da deviation documentada acima.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Núcleo (Plano 01) + UI (Plano 02) da Fase 17 completos: `npm test` 184/184 verde, todos os greps de aceite dos dois planos confirmados, LGPD confirmada por grep (`dtnascimen` nunca aparece em `DIFF_ALLOW`/bloco novo).
- Nenhum bloqueio conhecido para a Fase 18.

### Checklist de Verificação Browser (para o orquestrador, via preview — não é checkpoint humano)

**1. Diff de cadastro (TERR-06):**
- Abrir o app → buscar/abrir um lote → tocar "📓 Salvar no caderno".
- No DevTools › Application › IndexedDB › `radar_territorio` › store `caderno`, localizar o item pelo `ci` e editar `snapshot.vlvenal` (ex.: reduzir ~12%).
- Reabrir a MESMA ficha (mesmo `ci`) → `#dDiff` deve mostrar "Valor venal subiu ~12% desde {dd/mm}" (sinal ▲, texto neutro, sem cor de status).
- Reabrir de novo SEM editar nada → deve mostrar "Sem mudanças no cadastro desde a última visita."
- Dump do item no IndexedDB após a 2ª abertura: `snapshot` deve estar atualizado com os valores atuais e `snapshotAt` deve ser recente (ISO, poucos segundos atrás).
- Abrir um lote NUNCA salvo no caderno → `#dDiff` deve permanecer `hidden` (nunca aparece).

**2. LGPD (defesa recursiva do snapshot):**
- Via DevTools, injetar/editar um item do caderno com `snapshot:{dtnascimen:"1980-01-01",vlvenal:1,...}` e disparar qualquer caminho que passe por `sanitizeCaderno` (ex.: `cadernoAtualizar` de qualquer campo, ou reimportar via "⬆ Importar caderno" um JSON com esse item).
- Confirmar no IndexedDB que `dtnascimen` NUNCA sobrevive dentro de `snapshot` após a operação (já validado por teste unitário no Plano 01; aqui é a confirmação end-to-end).

**3. Cruzamento Caixa (TERR-07):**
- Salvar no caderno um lote de um setor com imóvel Caixa confirmado (ex.: Setor Bueno/Setor Cristina — nomes que casam 100% no matching, ver 17-RESEARCH.md §3.2).
- Abrir o bloco "📓 Caderno de território" → deve aparecer o botão "🏦 N imóvel(is) Caixa no seu território" (nunca "0 imóveis").
- Ligar a camada Caixa ("🏦 Ver Oportunidades Caixa") → pinos do setor salvo devem ter um anel extra (`--ink`, círculo concêntrico, sem tracejado); popup desses pinos deve mostrar "📓 Este imóvel está no seu território salvo." (entre o endereço e o preço).
- Abrir o Painel do Território do mesmo setor → deve aparecer a linha "🏦 N imóvel(is) Caixa neste setor — toque para ver no mapa" entre as métricas e o detector.
- Tocar no badge do Caderno OU na linha do Painel → se N=1, mapa centraliza no pino e abre o popup; se N>1, mapa faz `fitBounds` nos pinos e mostra o toast "Mostrando N imóveis Caixa no mapa — toque num pino com anel."
- Verificar a legenda de pinos (`#pinoLegenda`, sempre visível quando há pinos plotados) — deve ter o item "🏦📓 Caixa no seu território" com o swatch dourado com anel (box-shadow).
- Salvar um lote de setor SEM imóvel Caixa (ou remover todos os lotes salvos) → badge/linha/anel devem desaparecer (nunca mostrar "0").

**4. Zero requisição de rede nova:**
- Aba Network do DevTools, com cache desabilitado, repetir os passos 1 e 3 acima → confirmar que NENHUMA chamada de rede nova aparece ao abrir o diff ou o cruzamento Caixa (todo dado já está em memória/IndexedDB — `bairros-goiania.json`/`bairro-cdbairro.json`/`caixa-goiania.js` já carregados no boot).

**5. XSS/data-attributes (T-17-06):**
- Inspecionar o DOM do badge (`#cadernoCaixaBadge`) e da linha (`#terrCaixaLine`) → `onclick` deve ser sempre o literal fixo `abrirCaixaNoMapaUI(this)`, nunca com valor interpolado; `data-bairros` deve conter só códigos numéricos separados por vírgula.

---
*Phase: 17-diff-cadastro-cruzamento-caixa*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: .planning/phases/17-diff-cadastro-cruzamento-caixa/17-02-SUMMARY.md
- FOUND: commit 2c373f2 (Task 1)
- FOUND: commit dffbb4b (Task 2)
