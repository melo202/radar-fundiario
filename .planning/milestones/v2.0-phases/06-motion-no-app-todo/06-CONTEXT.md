# Phase 6: Motion no App Todo - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Adicionar movimento fluido "premium" ao app todo — transições de tela, spring do bottom-sheet, stagger de cards+lotes e feedback de toque — usando a lib Motion (motion.dev) EMBUTIDA INLINE, com `prefers-reduced-motion` respeitado desde o 1º commit e toda transição interrompível. Última fase do v2.0. Cobre MOT-01, MOT-02, MOT-03. NÃO reabre satélite (Fase 4, crossfade já feito) nem toca a lógica de dados/IA.
</domain>

<decisions>
## Implementation Decisions

### Carregamento da lib (decisão do usuário)
- **Motion (motion.dev) EMBUTIDO INLINE** no `radar-goiania.html` — colar o build UMD minificado (~5-18KB) num `<script>` próprio, NÃO via CDN. Consequências (todas positivas p/ este app):
  - SEM mudança no CSP (`script-src` já tem `'unsafe-inline'`).
  - SEM mudança no `sw.js` (nenhum host/asset novo) e SEM bump de cache por causa de CDN — o app segue offline-first e arquivo-único.
  - No build (execução), baixar o UMD do Motion uma vez (ex.: da unpkg/cdn oficial) e colar inline com um comentário de proveniência (versão + fonte + licença MIT). Verificar que o Motion não usa `eval`/`new Function` (é WAAPI-based; se usar, reavaliar por causa do CSP).
- Expor o Motion como `window.Motion` (global do UMD) ou capturar num escopo local — à discrição, sem colidir com globais existentes.

### Reduced-motion (desde o 1º commit — não retrofit)
- Um bloco global `@media (prefers-reduced-motion: reduce)` que zera/encurta as animações + um guard em JS (`const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches`) para pular os springs/staggers do Motion. Presente desde o PRIMEIRO commit de motion (a pesquisa/pitfalls marcaram isto como crítico).

### Interruptibilidade (não bloquear o corretor)
- Toda transição é curta e interrompível: uma nova ação (buscar, drillar, fechar) NUNCA espera a animação anterior terminar. Durações **sutis e rápidas (~150-250ms)**, easing suave. O Motion (WAAPI) roda na compositor-thread → 60fps no mobile.

### Alcance (as 4 áreas escolhidas)
1. **Transições de tela**: home ⇄ busca ⇄ detalhe com fade/slide sutil (hoje é troca seca via `data-view`).
2. **Spring do bottom-sheet**: o `.detail` abre/fecha com translateY + spring, casando com a alça de arrastar já existente. (Hoje abre com `display:block`/classe — dar o slide-up de mola.)
3. **Stagger de cards + lotes**: entrada escalonada dos cards de resultado e dos polígonos de lote no drill (fade+translateY leve, ~20-30ms entre itens, só na 1ª renderização).
4. **Feedback de toque**: micro-escala/realce no `:active` de botões e cards (scale ~.98 + leve escurecimento) — pode ser CSS puro.
- (O crossfade ruas⇄satélite já foi entregue na Fase 4 — NÃO refazer.)

### Claude's Discretion
- Versão exata do Motion, durações/easings finos dentro da faixa sutil, quais micro-interações usam Motion vs CSS puro (tap feedback provavelmente CSS), e como orquestrar o stagger reusando o timing que já exista.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `data-view` + `setView()` (transições de tela); `.detail` bottom-sheet + alça de arrastar (spring); listas de cards de resultado; `refreshLots()`/`drillBairro()` (stagger dos lotes); `:active` states (tap feedback).
- CSP `script-src 'self' 'unsafe-inline' ...` já permite `<script>` inline — o Motion embutido inline É permitido sem mudança.
- O crossfade `.sat-fade` (Fase 4) é um precedente de transição escopada — Motion não deve conflitar.
- Identidade: vars CSS, IBM Plex, ≥44px, safe-area — motion respeita, não altera layout.

### Established Patterns
- Transições sutis já usadas em pontos (ex.: crossfade de satélite). Fase 6 generaliza com consistência.
- Fail-safe/degradação graciosa: se o Motion não carregar, o app deve continuar 100% funcional (as mudanças de estado acontecem, só sem animação) — o Motion é progressive enhancement.

### Integration Points
- Envolver as trocas de `setView()`, a abertura/fechamento do `.detail`, e as renderizações de lista/lote com chamadas do Motion (`animate()`), atrás do guard `REDUCE`.
- NÃO tocar: `sw.js`, CSP, lógica de dados, seam de IA, satélite.

### NÃO fazer nesta fase
- Nenhuma feature nova de dado/UI além do movimento. Sem satélite (Fase 4), sem IA (Fase 5).
- Motion deve ser PROGRESSIVE ENHANCEMENT: se falhar/reduce-motion, o app funciona igual, sem travar.
</code_context>

<specifics>
## Specific Ideas

- "Rodando liso": priorizar 60fps no mobile e interruptibilidade sobre vistosidade. Sutil > chamativo.
- `prefers-reduced-motion` desde o 1º commit (crítico — pitfalls).
- Motion como progressive enhancement: app nunca depende dele para funcionar.
- Verificação incluirá preview: confirmar que as transições rodam, que reduce-motion as desliga, e que nada trava/bloqueia (busca rápida durante animação).
</specifics>

<deferred>
## Deferred Ideas

- Animações mais elaboradas / microinterações extras → pós-v2.0 se desejado.
- Motion em features de v2.1+ (ferramentas do corretor) → quando forem construídas.
</deferred>
