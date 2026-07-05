# Phase 4: Camada de Satélite - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Adicionar um toggle deliberado ruas ⇄ satélite ao mapa, com os rótulos legíveis sobre o satélite (overlay de referência) e um crossfade suave na troca. Cobre SAT-01 e SAT-02. Atualizar o `sw.js` (rede-only p/ os tiles de satélite + bump de versão). NÃO inclui motion do app todo (Fase 6) — o crossfade aqui é específico da troca de tiles (requisito SAT-02).
</domain>

<decisions>
## Implementation Decisions

### Fonte de satélite (SEM bloqueio)
- **Esri World Imagery keyless (legado)**: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` — tiles XYZ Web Mercator, drop-in `L.tileLayer` (SEM reprojeção, SEM API key, SEM cadastro). maxZoom ~19. Decisão do usuário: keyless legado (remove o bloqueio da chave).
- **Atribuição obrigatória** quando o satélite estiver ativo: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community" (trocar/compor com a atribuição CARTO atual conforme a camada ativa).

### Legibilidade de rótulos
- **Overlay de referência Esri** por cima do satélite: `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}` (tiles transparentes só com limites + nomes de lugares/ruas, com halo próprio). Só visível no modo satélite. Entregue NO MESMO passo/commit do toggle (nunca satélite "pelado" sem rótulos — regressão conhecida).

### Toggle
- **Botão custom no mapa** (ex.: canto inferior-direito), na identidade visual do app (vars CSS, IBM Plex, ≥44px, aria-pressed). Alterna ruas (CARTO light atual) ⇄ satélite (Esri imagery + reference overlay). **Deliberado — NUNCA automático por zoom** (anti-feature).
- Estado do toggle pode persistir em localStorage (à discrição) para lembrar a preferência do corretor.

### Crossfade (SAT-02)
- Troca com **crossfade suave** (fade de opacidade), não troca seca de tile. Implementar de forma leve e ESCOPADA à troca de tiles (ex.: transição de `opacity` na camada de satélite ao adicionar/remover, ou dois tile-layers com opacidade animada). Isto É o requisito SAT-02 — não confundir com o motion do app todo da Fase 6; manter o crossfade contido à camada de satélite.

### Service worker (PWA)
- Os tiles de satélite/reference são **rede-only (network-only)** — NUNCA cache-first — para não inchar o storage do PWA (imagem de satélite é pesada). Garantir que `server.arcgisonline.com` caia na lógica de rede do `sw.js` (como os tiles CARTO/consultas já caem), não no precache. **Bump da versão de cache** (`radar-v4` → `radar-v5`) no mesmo commit.

### Claude's Discretion
- Posição/ícone exato do botão; se usa dois `L.tileLayer` com opacidade ou um swap com transição CSS no pane; persistência do toggle; texto exato da atribuição composta; o valor da duração do crossfade (curto, ~200-300ms).
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `initMap()` (linha ~666): base tile CARTO light adicionada ao `map`. O satélite é um 2º `L.tileLayer` alternável.
- Panes já criados: "bairros" (370), "lots" (380). O satélite entra como base tile (tilePane, abaixo de tudo); o reference overlay acima do satélite mas abaixo dos vetores.
- Identidade: vars CSS `:root`, IBM Plex, ≥44px, `aria-pressed` (já usado em toggles existentes — ex.: toggle de garagens), safe-area. Reusar o padrão de botão existente.
- `sw.js`: `CACHE="radar-v4"` (bumpado na Fase 3), lógica NETWORK_FIRST/precache — os tiles CARTO já são tratados como rede; adicionar `server.arcgisonline.com` à mesma lógica e bumpar para `radar-v5`.
- localStorage: padrão `radar_prof`/`radar_coach` para preferências.

### Established Patterns
- Toggles com `aria-pressed` e estado persistido (ex.: garagens ocultas).
- Tiles/consultas sempre rede (nunca cache-first no sw.js).

### Integration Points
- `initMap()`: criar a camada de satélite + reference overlay (não adicionadas por padrão; ruas é o default).
- Novo controle/botão no DOM ou via `L.control` custom, com handler que alterna as camadas + crossfade + atribuição + persiste estado.
- `sw.js`: allowlist/rede p/ arcgisonline + bump de versão.

### NÃO fazer nesta fase
- Motion/transições do app todo (Fase 6). O crossfade é contido à troca de tiles (SAT-02).
- Ortofoto própria de Goiânia em EPSG:31982 (SAT-03, v2.1+ — precisa CRS custom). Aqui é só Web Mercator keyless.
</code_context>

<specifics>
## Specific Ideas

- Nunca deixar o satélite sem rótulos (entregar overlay de referência junto).
- Satélite é toggle deliberado; jamais automático.
- Verificação incluirá preview no navegador: alternar ruas⇄satélite, ver a imagem carregar, rótulos por cima, crossfade, e confirmar que os polígonos de bairro/lote continuam visíveis sobre o satélite.
- Atribuição Esri visível quando o satélite estiver ativo (compliance de licença).
</specifics>

<deferred>
## Deferred Ideas

- Motion do app todo (Fase 6).
- Ortofoto própria de Goiânia (EPSG:31982, CRS custom) → SAT-03, v2.1+.
</deferred>
