# Phase 2: Home = Mapa - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Reestruturar a abertura do app para que a HOME seja o mapa de Goiânia, com a busca rebaixada de "tela inicial" para um card/pill flutuante sempre acessível. Cobre MAPA-01 (home=mapa, zoom em Goiânia) e MAPA-04 (busca vira card). NÃO inclui render de polígonos de bairro, hover/drill (Phase 3) nem motion (Phase 6) — apenas a reestruturação de view-state e o affordance de busca.
</domain>

<decisions>
## Implementation Decisions

### Abertura / view-state
- **Mobile abre direto no mapa**: trocar o default de boot de `data-view="busca"` para `data-view="mapa"`. Hoje `vbBusca` tem a classe `on` inicial e o body provavelmente inicia em busca — inverter para mapa.
- Reusar o modelo `data-view` + `setView()` existente (radar-goiania.html ~linha 529-530, 386-387) — NÃO introduzir router/framework. Estender, não reescrever.
- Zoom inicial: manter `map.setView([-16.6799,-49.255],12)` (linha 617), que já enquadra Goiânia. Ao exibir o mapa, chamar `map.invalidateSize()` (senão o Leaflet renderiza cinza — padrão já usado no app).

### Busca como card (mobile E desktop)
- **Desktop também vira mapa-first** (decisão do usuário, além do que a pesquisa sugeria): o mapa passa a ocupar a tela; o painel de busca deixa de ser coluna fixa lado-a-lado e vira um **card/overlay** acionado pela pill. O CSS desktop atual (`@media(min-width:821px)` que mostra `.panel` + `.mapwrap` lado a lado) muda para mapa em primeiro plano + card de busca sobreposto.
- **Pill de busca flutuante** no topo do mapa, em mobile e desktop: rótulo "O que você procura?" com ícone 🔍. Tocar/clicar abre o **painel de busca completo já existente** via `setView('busca')` (ou um overlay equivalente no desktop) — reusa 100% do markup/JS de busca atual, sem recriar.
- A busca NUNCA fica escondida atrás de menu — a pill é o affordance sempre-visível (a um toque). A barra inferior Busca⇄Mapa existente pode permanecer como reforço no mobile.
- Após uma busca com resultado, o comportamento atual de auto-trocar para o mapa (`enquadra()` chama `setView("mapa")` no mobile, linha 809) é preservado/estendido.

### Primeiro uso
- **Faixa dispensável de 1 linha** (coach-mark) sobre o mapa no 1º uso: ex. "Toque num bairro pra explorar, ou use a busca". Some após a 1ª interação, persistido em localStorage (mesmo mecanismo do `radar_prof` já existente). Sem modal, sem bloqueio.

### Claude's Discretion
- Estilo exato/posicionamento da pill e do coach-mark (respeitando a identidade visual atual — IBM Plex, paleta em variáveis CSS, alvos ≥44px), estrutura do overlay de busca no desktop, e se a barra inferior some ou fica no desktop. Guiar-se pelo CSS/identidade existentes.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- View-state: `body[data-view="busca"] .mapwrap{display:none}` / `body[data-view="mapa"] .panel{display:none}` (linhas 386-387, dentro de media query mobile) + `setView('busca'|'mapa')` + botões `#vbBusca`/`#vbMapa` (529-530).
- `map` (Leaflet) init linha 617 com centro/zoom de Goiânia; `map.invalidateSize()` já usado ao exibir mapa (linha 810).
- `isMobile()` helper; `enquadra()` (809-810) já faz `setView("mapa")` + invalidateSize + fitBounds.
- `radar_prof` em localStorage = precedente de persistência de estado do usuário (para o flag do coach-mark).
- Identidade: variáveis CSS em `:root`, IBM Plex Sans/Mono, alvos ≥44px, safe-area — todos já estabelecidos.

### Established Patterns
- Sem framework; JS inline; estado em memória + localStorage pontual.
- Mudanças de layout mobile via media queries e `body[data-view=...]`.

### Integration Points
- `setView()` é o ponto central — a pill chama `setView('busca')`.
- O CSS `@media(min-width:821px)` (desktop) precisa ser reescrito: hoje mostra painel+mapa lado a lado; passará a mapa full + card de busca sobreposto.
- `#vbBusca` classe `on` inicial + o valor inicial de `body[data-view]` definem a abertura — inverter para mapa.

### Integration Points — NÃO fazer nesta fase
- Não renderizar polígonos de bairro nem wire de hover/drill (Phase 3).
- Não adicionar Motion/animações (Phase 6) — transições ficam com o CSS atual; a fase de motion refina depois.
- Não tocar `sw.js`/CDN (nenhum asset novo nesta fase).
</code_context>

<specifics>
## Specific Ideas

- A pill deve funcionar em mobile E desktop (o usuário quer o app inteiro mapa-first).
- Preservar acessibilidade AA já conquistada (labels, ARIA, foco, Esc) ao introduzir a pill/overlay — a pill é um controle com label acessível; o overlay de busca gerencia foco como o wizard já faz.
- Preservar o comportamento de `invalidateSize()` para o Leaflet não renderizar cinza ao virar visível.
</specifics>

<deferred>
## Deferred Ideas

- Render de bairros como polígonos + hover/tap + click-to-drill + breadcrumb → Phase 3.
- Camada de satélite → Phase 4.
- Motion/transições premium (a pill/overlay animando, crossfade) → Phase 6.
</deferred>
