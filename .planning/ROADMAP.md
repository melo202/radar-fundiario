# Roadmap: Radar Fundiário Goiânia

## Overview

v2.0 (Mapa-first + Motion + Satélite) transforma a home de "tela de busca" para "mapa interativo de Goiânia": o corretor abre o app e já vê o território, com bairros desenhados, drill-down até os lotes, satélite alternável e motion fluido no app todo. A pesquisa (2026-07-04) já verificou ao vivo que a geometria de bairro/lote (`returnGeometry=true`, layers 0/1/2) já funciona no endpoint ArcGIS e já é consumida por `refreshLots()`/`mostrarBairro()` — v2.0 é majoritariamente reestruturação de UI/fluxo sobre um encanamento que já existe, não sourcing de dados novo. A cadeia de dependência dura é: dataset estático de bairros → home vira mapa → render de bairro + hover/tap + click-to-drill → motion (por último, envolvendo estrutura que já está estável). Satélite e o seam de IA são independentes e podem ser paralelizados a qualquer momento nessa sequência.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Dataset Estático de Bairros + Correção de Docs** - GeoJSON de bairros pré-simplificado e versionado alimenta a home sem tocar o endpoint ao vivo; documentação corrigida sobre `returnGeometry` (completed 2026-07-04)
- [x] **Phase 2: Home = Mapa** - O app abre no mapa de Goiânia; busca vira card flutuante sempre acessível
 (completed 2026-07-04)
- [x] **Phase 3: Render de Bairro + Hover/Tap + Click-to-Drill** - Bairros aparecem como polígonos, com destaque no hover/tap, drill-down por clique e breadcrumb de navegação
 (completed 2026-07-04)
- [x] **Phase 4: Camada de Satélite** - Toggle ruas ⇄ satélite com legibilidade de rótulos e crossfade
 (completed 2026-07-04)
- [x] **Phase 5: Seam de IA (dormant)** - Encaixe isolado e desativado para pesquisa de mercado por IA, sem UI e sem tocar o núcleo
 (completed 2026-07-04)
- [x] **Phase 6: Motion no App Todo** - Transições, spring do bottom-sheet e stagger-in fluidos, com `prefers-reduced-motion` desde o primeiro commit (completed 2026-07-05)

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
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Offline bairros GeoJSON build (paginate + reproject + join report) + smoke check
- [x] 01-02-PLAN.md — Corrigir docs: returnGeometry=true funciona (PROJETO §4, ROADMAP §0)

### Phase 2: Home = Mapa
**Goal**: O corretor abre o app e cai direto no território de Goiânia — a busca continua a um toque de distância, nunca escondida.
**Depends on**: Phase 1
**Requirements**: MAPA-01, MAPA-04
**Success Criteria** (what must be TRUE):
  1. Ao abrir o app, a tela inicial é o mapa com zoom enquadrando toda Goiânia (não a tela de busca)
  2. Um card/pill de busca flutua sobre o mapa, visível e clicável em uma única ação, em qualquer momento
  3. Tocar/clicar no card de busca abre o fluxo de busca completo já existente (reaproveita 100% do painel atual, sem recriar markup)
  4. No desktop, o app TAMBÉM vira mapa-first: o mapa ocupa a tela (full-bleed via novo `@media(min-width:821px)`) e a busca vira overlay/card acionado pela pill (decisão do usuário em 02-CONTEXT.md, revisando a suposição inicial de "manter lado a lado")
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Boot no mapa (mobile) + pill de busca flutuante (MAPA-01, MAPA-04)
- [x] 02-02-PLAN.md — Desktop mapa-first (full-bleed + overlay + Esc) + coach-mark de 1ª vez (MAPA-01, MAPA-04)

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
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Camada de bairros (outlines do JSON estático + Canvas) + highlight único gated por toque + drill fitBounds→lotes + gate de zoom + sw.js precache/bump (MAPA-02, MAPA-03)
- [x] 03-02-PLAN.md — Breadcrumb (Goiânia › Bairro) + zoom-out + verificação de não-freeze do bairro grande (MAPA-05, MAPA-03)

### Phase 4: Camada de Satélite
**Goal**: O corretor alterna deliberadamente entre ruas e satélite sem perder a legibilidade dos rótulos nem sentir uma troca seca de imagem.
**Depends on**: Nothing structurally (independente de Phases 1-3; pode ser paralelizada) — sequenciada aqui após decisão de licenciamento
**Requirements**: SAT-01, SAT-02
**Success Criteria** (what must be TRUE):
  1. Um toggle deliberado alterna ruas ⇄ satélite (Esri World Imagery) — nunca automático por zoom
  2. Rótulos permanecem legíveis sobre a imagem de satélite (halo/backdrop tratado no mesmo commit do toggle, não como retrofit)
  3. A troca entre camadas usa crossfade suave, não troca seca de tile
  4. `sw.js` tem o allowlist de CDN atualizado para o host de tile do satélite e a versão de cache bumped no mesmo commit; os tiles de satélite são network-only (nunca cache-first), evitando inchar o storage do PWA
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — CSP img-src Esri (bloqueante) + camadas satélite/reference keyless + toggle deliberado (aria-pressed, bottomright) + rótulos/outlines legíveis + atribuição (SAT-01)
- [x] 04-02-PLAN.md — Crossfade suave escopado à troca de tiles (250ms) + sw.js radar-v4→radar-v5 (tiles Esri network-only) (SAT-02)

**Flags**:
- Fonte definida: Esri World Imagery **keyless (legado)** via server.arcgisonline.com — decisão do usuário em 04-CONTEXT.md removeu o bloqueio da API key (não há mais signup pendente)
- Pré-requisito bloqueante: o CSP img-src (linha 7) precisa incluir server.arcgisonline.com, senão os tiles são silenciosamente bloqueados (tratado no Plan 04-01, Task 1)
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
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Seam de IA dormant: AI_CONFIG{enabled:false} + async pesquisarMercadoIA (script separado, input whitelisted, fail-to-null, zero call-sites, deletável) (IA-01)

### Phase 6: Motion no App Todo
**Goal**: O app todo se move com fluidez premium — transições de tela, sheet e listas — sem nunca bloquear o corretor em campo nem ignorar preferências de acessibilidade.
**Depends on**: Phase 2, Phase 3 (anima estrutura que precisa existir e estar estável antes)
**Requirements**: MOT-01, MOT-02, MOT-03
**Success Criteria** (what must be TRUE):
  1. Motion (motion.dev) está embutido INLINE em `radar-goiania.html` (build UMD colado num `<script>`, com comentário de proveniência + licença MIT), com um bloco global `prefers-reduced-motion` presente desde o primeiro commit de motion (não retrofitado depois) — decisão do usuário em 06-CONTEXT.md revisou "via CDN" para inline (SEM CDN, SEM mudança de CSP, SEM mudança de sw.js)
  2. Toda transição é interrompível — uma busca rápida em campo nunca é bloqueada esperando uma animação terminar
  3. Transições de view (home ⇄ busca ⇄ detalhe), o spring do bottom-sheet e o feedback de tap usam Motion de forma perceptível e consistente
  4. Os polígonos de lote no drill-in e a lista de cards de resultado entram com stagger (só na 1ª renderização), reaproveitando o timing/easing já usado no app
  5. Motion é progressive enhancement: o app funciona 100% mesmo se o Motion falhar/estiver ausente; a contagem de `<script src>` continua 3 e o `sw.js`/CSP não mudam (consequência do embed inline)
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Fundação: Motion UMD inline (eval-scan + proveniência MIT) + kill-switch CSS prefers-reduced-motion + guard JS REDUCE (reativo) + wrapper mAnimate() progressive-enhancement (MOT-01)
- [x] 06-02-PLAN.md — Transições de tela no setView (mobile + overlay .panel desktop, ±12px/180ms, interrompíveis) + spring do bottom-sheet .detail (420/38/1) coordenado com o drag do #grab (MOT-02)
- [x] 06-03-PLAN.md — Stagger só-na-1ª-render de cards (render) + lotes (refreshLots, gate firstReveal, cap 12) + feedback de tap :active CSS-only (MOT-02, MOT-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6
(Phases 4 e 5 são estruturalmente independentes de 1-3 e podem ser antecipadas/paralelizadas; a ordem numérica acima reflete a sequência recomendada, não uma dependência dura para elas.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dataset Estático de Bairros + Correção de Docs | 2/2 | Complete    | 2026-07-04 |
| 2. Home = Mapa | 2/2 | Complete    | 2026-07-04 |
| 3. Render de Bairro + Hover/Tap + Click-to-Drill | 2/2 | Complete    | 2026-07-04 |
| 4. Camada de Satélite | 2/2 | Complete    | 2026-07-04 |
| 5. Seam de IA (dormant) | 1/1 | Complete    | 2026-07-04 |
| 6. Motion no App Todo | 3/3 | Complete    | 2026-07-05 |
