# Roadmap: Radar Fundiário Goiânia

## Overview

v2.0 (Mapa-first + Motion + Satélite) transforma a home de "tela de busca" para "mapa interativo de Goiânia": o corretor abre o app e já vê o território, com bairros desenhados, drill-down até os lotes, satélite alternável e motion fluido no app todo. A pesquisa (2026-07-04) já verificou ao vivo que a geometria de bairro/lote (`returnGeometry=true`, layers 0/1/2) já funciona no endpoint ArcGIS e já é consumida por `refreshLots()`/`mostrarBairro()` — v2.0 é majoritariamente reestruturação de UI/fluxo sobre um encanamento que já existe, não sourcing de dados novo. A cadeia de dependência dura é: dataset estático de bairros → home vira mapa → render de bairro + hover/tap + click-to-drill → motion (por último, envolvendo estrutura que já está estável). Satélite e o seam de IA são independentes e podem ser paralelizados a qualquer momento nessa sequência.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Dataset Estático de Bairros + Correção de Docs** - GeoJSON de bairros pré-simplificado e versionado alimenta a home sem tocar o endpoint ao vivo; documentação corrigida sobre `returnGeometry`
- [ ] **Phase 2: Home = Mapa** - O app abre no mapa de Goiânia; busca vira card flutuante sempre acessível
- [ ] **Phase 3: Render de Bairro + Hover/Tap + Click-to-Drill** - Bairros aparecem como polígonos, com destaque no hover/tap, drill-down por clique e breadcrumb de navegação
- [ ] **Phase 4: Camada de Satélite** - Toggle ruas ⇄ satélite com legibilidade de rótulos e crossfade
- [ ] **Phase 5: Seam de IA (dormant)** - Encaixe isolado e desativado para pesquisa de mercado por IA, sem UI e sem tocar o núcleo
- [ ] **Phase 6: Motion no App Todo** - Transições, spring do bottom-sheet e stagger-in fluidos, com `prefers-reduced-motion` desde o primeiro commit

## Phase Details

### Phase 1: Dataset Estático de Bairros + Correção de Docs
**Goal**: A home tem um dataset de bairros confiável, versionado e offline — sem depender do endpoint ArcGIS no carregamento inicial — e a documentação do projeto reflete a realidade verificada do endpoint.
**Depends on**: Nothing (first phase)
**Requirements**: DADOS-01, DADOS-02, DADOS-03
**Success Criteria** (what must be TRUE):
  1. Um arquivo GeoJSON estático de bairros (WGS84, pré-simplificado), gerado por script offline, está versionado no repo e não depende de fetch ao ArcGIS em tempo de carregamento
  2. O script de build documenta explicitamente a integridade do join bairro↔`cdbairro` (709 vs. 1.206 polígonos) e prova, via paginação explícita, que o dataset não está truncado por um page-size default do ArcGIS
  3. Uma forma de bairro irregular (não-simétrica) renderiza corretamente no lugar certo do mapa, provando que o pipeline reutiliza `toWGS()`/`proj4.defs` existente sem re-derivar a projeção
  4. `PROJETO-radar.md §4` e `ROADMAP-radar.md §0` foram corrigidos para refletir que `returnGeometry=true` funciona no endpoint (verificado em 2026-07-04)
**Plans**: TBD

Plans:
- [ ] 01-01: TBD

### Phase 2: Home = Mapa
**Goal**: O corretor abre o app e cai direto no território de Goiânia — a busca continua a um toque de distância, nunca escondida.
**Depends on**: Phase 1
**Requirements**: MAPA-01, MAPA-04
**Success Criteria** (what must be TRUE):
  1. Ao abrir o app, a tela inicial é o mapa com zoom enquadrando toda Goiânia (não a tela de busca)
  2. Um card/pill de busca flutua sobre o mapa, visível e clicável em uma única ação, em qualquer momento
  3. Tocar/clicar no card de busca abre o fluxo de busca completo já existente (reaproveita 100% do painel atual, sem recriar markup)
  4. No desktop, o layout lado-a-lado permanece inalterado — a mudança de home é específica ao fluxo mobile/single-pane
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Render de Bairro + Hover/Tap + Click-to-Drill
**Goal**: O corretor vê os bairros desenhados no mapa, entende onde está ao tocar/passar o mouse, e mergulha nos lotes de um bairro com um clique — sem travar em bairros grandes.
**Depends on**: Phase 1, Phase 2
**Requirements**: MAPA-02, MAPA-03, MAPA-05
**Success Criteria** (what must be TRUE):
  1. Os bairros aparecem como polígonos (linha) na home, usando o dataset estático da Phase 1
  2. No desktop, passar o mouse sobre um bairro realça o polígono e mostra o nome; no mobile, o primeiro toque faz o mesmo — através de uma única função de realce gated por detecção de toque (não dois code paths)
  3. Clicar/tocar-drill num bairro dá `fitBounds`/zoom até o bairro e revela as divisões de lote, confirmando que o gate zoom≥17 + envelope de `refreshLots()` dispara corretamente quando a câmera chega via clique no bairro (não só via pinch-zoom manual)
  4. Um bairro grande (ex.: Bueno ~57k registros, Oeste ~32k) não congela nem trava o mobile de médio/baixo desempenho ao drilar — o gate de zoom e o envelope de viewport seguem intactos
  5. Um breadcrumb (Goiânia › Bairro) reflete o histórico do drill e permite voltar
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Camada de Satélite
**Goal**: O corretor alterna deliberadamente entre ruas e satélite sem perder a legibilidade dos rótulos nem sentir uma troca seca de imagem.
**Depends on**: Nothing structurally (independente de Phases 1-3; pode ser paralelizada) — sequenciada aqui após decisão de licenciamento
**Requirements**: SAT-01, SAT-02
**Success Criteria** (what must be TRUE):
  1. Um toggle deliberado alterna ruas ⇄ satélite (Esri World Imagery) — nunca automático por zoom
  2. Rótulos permanecem legíveis sobre a imagem de satélite (halo/backdrop tratado no mesmo commit do toggle, não como retrofit)
  3. A troca entre camadas usa crossfade suave, não troca seca de tile
  4. `sw.js` tem o allowlist de CDN atualizado para o host de tile do satélite e a versão de cache bumped no mesmo commit; os tiles de satélite são network-only (nunca cache-first), evitando inchar o storage do PWA
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

**Flags**:
- Decisão de licenciamento já tomada (Esri World Imagery) — falta o signup da API key no console de desenvolvedor ArcGIS (escopo "Basemaps", restrito por referrer ao(s) domínio(s) publicado(s))
- Limiar de zoom para a legibilidade dos rótulos precisa de teste empírico em dispositivo real (Android médio/baixo em 4G, não apenas DevTools)

### Phase 5: Seam de IA (dormant)
**Goal**: Existe um encaixe isolado para pesquisa de mercado por IA externa, desligado por padrão, que pode ser removido sem afetar nada do núcleo do app.
**Depends on**: Nothing (independente; pode ser construído em qualquer ponto da sequência)
**Requirements**: IA-01
**Success Criteria** (what must be TRUE):
  1. Existe um objeto `AI_CONFIG {enabled:false}` e uma função async única `pesquisarMercadoIA()`, isolados em um `<script>` separado
  2. A função recebe apenas input sanitizado/whitelisted — nunca um registro cru da API, o que estruturalmente impede vazamento de `dtnascimen`
  3. A função falha para `null` quando desabilitada ou em erro — sem lançar exceção que afete o app
  4. Remover o arquivo/módulo do seam por completo não quebra nenhuma funcionalidade do núcleo (teste "delete o módulo, o core continua funcionando" passa)
  5. Não há UI visível nem dependência de CDN adicional em v2.0
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Motion no App Todo
**Goal**: O app todo se move com fluidez premium — transições de tela, sheet e listas — sem nunca bloquear o corretor em campo nem ignorar preferências de acessibilidade.
**Depends on**: Phase 2, Phase 3 (anima estrutura que precisa existir e estar estável antes)
**Requirements**: MOT-01, MOT-02, MOT-03
**Success Criteria** (what must be TRUE):
  1. Motion (motion.dev) está integrado via CDN, com um bloco global `prefers-reduced-motion` presente desde o primeiro commit de motion (não retrofitado depois)
  2. Toda transição é interrompível — uma busca rápida em campo nunca é bloqueada esperando uma animação terminar
  3. Transições de view (home ⇄ busca ⇄ detalhe), o spring do bottom-sheet e o feedback de tap usam Motion de forma perceptível e consistente
  4. Os polígonos de lote no drill-in e a lista de cards de resultado entram com stagger, reaproveitando o timing/easing já usado no app
  5. `sw.js` tem o allowlist de CDN atualizado para o host do Motion e a versão de cache bumped no mesmo commit da integração
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6
(Phases 4 e 5 são estruturalmente independentes de 1-3 e podem ser antecipadas/paralelizadas; a ordem numérica acima reflete a sequência recomendada, não uma dependência dura para elas.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dataset Estático de Bairros + Correção de Docs | 0/TBD | Not started | - |
| 2. Home = Mapa | 0/TBD | Not started | - |
| 3. Render de Bairro + Hover/Tap + Click-to-Drill | 0/TBD | Not started | - |
| 4. Camada de Satélite | 0/TBD | Not started | - |
| 5. Seam de IA (dormant) | 0/TBD | Not started | - |
| 6. Motion no App Todo | 0/TBD | Not started | - |
