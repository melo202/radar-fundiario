# Phase 3: Render de Bairro + Hover/Tap + Click-to-Drill - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Desenhar os bairros de Goiânia como polígonos (linha) na home, a partir do GeoJSON estático da Fase 1 (`bairros-goiania.json`); adicionar destaque + nome no hover(desktop)/1º-toque(mobile); clicar/tocar-drill num bairro enquadra-o (fitBounds) revelando os lotes via o `refreshLots()` já existente; e um breadcrumb (Goiânia › Bairro). Cobre MAPA-02, MAPA-03, MAPA-05. NÃO inclui satélite (Fase 4) nem Motion/animações (Fase 6) — transições ficam com o CSS atual.
</domain>

<decisions>
## Implementation Decisions

### Camada de bairros
- Carregar o **`bairros-goiania.json` estático** (artefato da Fase 1, já em WGS84) — NÃO fazer fetch ao vivo dos bairros (endpoint frágil). Como o GeoJSON já é WGS84 com coordenadas `[lon,lat]`, usar `L.geoJSON(...)` direto (Leaflet lê GeoJSON nativamente) — SEM reprojeção (diferente dos lotes, que vêm crus do ArcGIS e passam por `toWGS`).
- Renderizar como **linha (outline)**: stroke visível, fill mínimo/transparente (requisito MAPA-02 "bairros divididos em linha"). Cores das variáveis `:root` existentes (ex.: `--line`/`--lot`/`--muted` para o traço; fill quase nulo). Zero hex novo.
- **Performance**: ~1206 polígonos. Usar `preferCanvas:true` na camada de bairros (Canvas batches — padrão Leaflet para muitos polígonos no mobile, confirmado na pesquisa). Renderizar bairros só em zoom baixo (ver gating).

### Destaque + nome (hover/tap)
- **Uma única função de realce** `highlightBairro()`, gated por detecção de toque (`matchMedia("(hover:none)")`), NÃO dois code paths (mesmo princípio do `refreshLots` que já diferencia hover/toque).
- Desktop: `mouseover` realça o polígono (muda stroke/fill sutil) + tooltip com `nm_bai`. Mobile: 1º toque realça + mostra o nome (2º toque/CTA = drill). Reusar o padrão de tooltip/`setStyle` que `refreshLots` já usa nos lotes.
- **Nome só ao destacar** (sem 1206 rótulos fixos — evita clutter, anti-feature conhecido). Bairros sem nome (466 glebas rurais, `nm_bai` null) mostram um rótulo genérico discreto (ex.: "Área rural / gleba") ou nenhum — à discrição.

### Drill (clique/toque)
- Clicar/tocar-drill num bairro → **`fitBounds` nos limites do bairro** (enquadra o bairro inteiro; disclosure progressivo). NÃO ir direto a zoom 17 (bairros grandes como Bueno 57k não cabem). Ao aproximar (zoom≥17), o `refreshLots()` existente revela os lotes sozinho via o listener `moveend` já presente.
- Confirmar que o gate zoom≥17 + envelope de `refreshLots()` dispara corretamente quando a câmera chega via clique no bairro (não só via pinch-zoom manual). Reusar `invalidateSize()` conforme necessário.
- Bairro grande NÃO pode travar: o gate de zoom + envelope de viewport já limitam os lotes renderizados; a camada de bairros some no zoom de lote (ver gating).

### Gating por zoom
- Bairros (linha) **visíveis em zoom baixo** (cidade → ~intermediário) e **somem/escondem quando zoom≥17** (dão lugar aos lotes, evitam competir visualmente). Escolher o limiar exato (provável: esconder bairros em zoom ≥ ~15-16, lotes entram em ≥17 — o "vão" entre eles é ok). Ligar/desligar a camada no evento `zoomend`/`moveend`.

### Breadcrumb (Goiânia › Bairro)
- **Aparece ao drillar** num bairro; some na home (cidade). Trilha discreta no topo (respeitar a pill de busca e a identidade visual). Clicar em **"Goiânia"** faz zoom-out para a cidade toda (`map.setView([-16.6799,-49.255],12)` — o centro/zoom de boot) e limpa o destaque. Client-side puro, reusa histórico de bounds.

### Claude's Discretion
- Limiar exato de zoom para esconder bairros; estilos exatos de stroke/hover (dentro da paleta existente); posicionamento do breadcrumb relativo à pill; tratamento das glebas sem nome; se o drill usa o `enquadra()` existente (809) ou uma variante.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `refreshLots()` (linha 691): JÁ renderiza lotes via LOTSVC no envelope do viewport quando zoom≥17, com hover(`mouseover`→setStyle+tooltip)/`click`→`loadCi(ci)`, token de invalidação (`LOTTOKEN`), cache de bounds (`LOTLAST`), e toast de dica (`LOTHINT`). É o padrão a espelhar para os bairros.
- `LOT_STYLE`/`LOT_HOVER` (constantes de estilo Leaflet) — criar `BAI_STYLE`/`BAI_HOVER` análogos com a paleta existente.
- `map` init linha ~617 (centro/zoom Goiânia); `lotLayer` (camada de lotes); listener `moveend`/`zoomend` que chama `refreshLots`.
- `toWGS()` — usado só para geometria crua do ArcGIS (lotes). Bairros NÃO precisam (já WGS84).
- `bairros-goiania.json` (Fase 1) na raiz do repo — o asset a carregar.
- `mostrarBairro(code)` (linha 824): consulta espacial por nome de bairro (usado hoje pela busca). Referência, mas o drill do mapa usa fitBounds no polígono já carregado.
- `clean()`, `toast()`, `jsonp()`, `matchMedia("(hover:none)")` — helpers existentes.

### Established Patterns
- Camadas Leaflet com token de invalidação para consultas assíncronas; `setStyle` no hover; tooltip sticky.
- Gating por zoom já usado (lotes só ≥17).
- `sw.js` cache: `bairros-goiania.json` passa a ser fetchado no load → adicionar ao allowlist/precache do service worker e bumpar a versão de cache no mesmo commit (senão o PWA não serve o asset offline / serve versão velha).

### Integration Points
- Novo: `loadBairroPolys()` (nome à discrição) que faz `fetch('bairros-goiania.json')` → `L.geoJSON` com `preferCanvas`, handlers de hover/tap/click, adicionado ao `map`.
- Gating: no `zoomend`, mostrar/esconder a camada de bairros conforme o zoom.
- Breadcrumb: novo elemento no DOM (perto da pill), atualizado no drill e no zoom-out.
- `sw.js`: adicionar `bairros-goiania.json` ao precache + bump de versão.

### NÃO fazer nesta fase
- Satélite (Fase 4). Motion/animações/transições/crossfade/stagger (Fase 6) — usar só o CSS/estado atual, sem `transition:` novo introduzido pela lógica de motion (transições sutis de estilo Leaflet que já existem em setStyle são ok).
- Styling territory-aware / heatmap (v2.1+). Manter o estilo dos bairros dirigido por função de propriedades para facilitar extensão futura, mas sem implementar as camadas de v2.1.
</code_context>

<specifics>
## Specific Ideas

- Espelhar fielmente o padrão de interação de `refreshLots()` para consistência (hover/tap/tooltip/token).
- Não fazer fetch ao vivo dos bairros — usar o asset estático (protege o endpoint frágil no load, decisão-chave da pesquisa).
- Preservar acessibilidade AA: se o hover/tap abre um card de nome, garantir alternativa por teclado onde fizer sentido; o drill por clique já é acessível.
- Verificação incluirá teste em navegador (preview) com um bairro grande (Bueno) para confirmar não-trava.
</specifics>

<deferred>
## Deferred Ideas

- Camada de satélite + legibilidade de rótulos → Fase 4.
- Motion (fly-to suave, stagger dos lotes, crossfade, animação do breadcrumb) → Fase 6.
- Heatmap R$/m², styling por território, badges de oportunidade → v2.1+.
</deferred>
