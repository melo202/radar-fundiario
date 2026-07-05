# Requirements: Radar Fundiário Goiânia

**Defined:** 2026-07-04
**Milestone:** v2.0 — Mapa-first + Motion + Satélite
**Core Value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.

## Milestone v2.0 Requirements

Requisitos desta milestone. Cada um mapeia para uma fase do roadmap.

### Dados & Documentação (fundação)

- [ ] **DADOS-01**: A home pinta os bairros a partir de um GeoJSON estático pré-simplificado (WGS84), versionado no repo e gerado por script offline — sem tocar o endpoint ArcGIS no carregamento inicial
- [ ] **DADOS-02**: O script de build valida a completude por paginação e documenta a integridade do join bairro (layer 2) ↔ `cdbairro` (709 vs 1.206 polígonos)
- [ ] **DADOS-03**: Documentação corrigida — `PROJETO-radar.md §4` e `ROADMAP-radar.md §0` passam a refletir que `returnGeometry=true` funciona no endpoint (verificado em 2026-07-04)

### Mapa-first (home)

- [ ] **MAPA-01**: O app abre na home = mapa interativo, com zoom enquadrando toda Goiânia
- [ ] **MAPA-02**: Bairros aparecem como polígonos (linha) na home; no desktop o hover realça e mostra o nome, no mobile o 1º toque realça e mostra o nome (função de realce única, gated por detecção de toque)
- [ ] **MAPA-03**: Clicar/tocar-drill num bairro dá zoom (fitBounds) e revela as divisões dos lotes, reusando o gate zoom≥17 + envelope do `refreshLots()` já existente
- [ ] **MAPA-04**: A busca deixa de ser a tela inicial e vira um card/pill flutuante sempre acessível (a um toque) sobre o mapa — sem ficar escondida
- [ ] **MAPA-05**: Breadcrumb (Goiânia › Bairro) reflete o histórico do drill e permite voltar

### Satélite

- [ ] **SAT-01**: Toggle deliberado ruas ⇄ satélite (Esri World Imagery) com tratamento de legibilidade dos rótulos (halo/backdrop) entregue no mesmo passo — nunca satélite automático por zoom
- [ ] **SAT-02**: A troca ruas ⇄ satélite usa crossfade suave em vez de troca seca de tile

### Motion

- [x] **MOT-01**: Motion (motion.dev) integrado **inline** (embutido no arquivo — revisado de "via CDN" p/ manter arquivo-único/PWA offline, decisão do usuário na Fase 6), com bloco global `prefers-reduced-motion` desde o 1º commit e transições sempre interrompíveis (nunca bloqueiam o corretor em campo)
- [x] **MOT-02**: Motion aplicado no app: transições de view (home ⇄ busca ⇄ detalhe), spring do bottom-sheet e feedback de tap
- [x] **MOT-03**: Stagger-in dos polígonos de lote no drill e da lista de cards, reusando o timing/easing já existente

### Seam de IA (dormant)

- [ ] **IA-01**: Encaixe de IA isolado e desativado — objeto `AI_CONFIG {enabled:false}` + função async única `pesquisarMercadoIA()` num `<script>` separado, contrato OpenAI-compatible, recebendo só input sanitizado/whitelisted (nunca registro cru → nunca vaza `dtnascimen`), falhando para `null`, sem UI e sem dependência de CDN em v2.0

## Future Requirements (v2.1+)

Deferido — rastreado, fora do roadmap atual.

### Ferramentas do corretor (prioridade: Território/captação)

- **TERR-01**: Painel do Meu Território (mediana R$/m², IPTU, idade, mix de uso por setor)
- **TERR-02**: Heatmap de R$/m² venal por quadra (escala de quantis, imune à defasagem da PGV)
- **TERR-03**: Detector de lote subutilizado em quadra valorizada
- **TERR-04**: Farming de território com memória (localStorage) + diff de cadastro entre visitas
- **TERR-05**: Cruzamento dos imóveis Caixa com o território salvo

### IA (ativação)

- **IA-02**: Ativar a pesquisa de mercado por IA (proxy Cloudflare Worker ou BYO-key; `glm-4.5-air:online` default, fallback `qwen3-14b`), opt-in e rotulada "não é dado oficial"

### Satélite (stretch)

- **SAT-03**: Ortofoto própria de Goiânia (`Mapa_Ortofoto2016v2`) via CRS custom EPSG:31982 no Leaflet

## Out of Scope

Excluído explicitamente — documentado para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| Migração Leaflet → MapLibre | Contagens de polígono por view estão 1 ordem de grandeza abaixo do crossover; MapLibre custa 210–750 KB + 2º pipeline de CRS por zero ganho |
| Renderizar todos os ~310k lotes no zoom da cidade | Inviável (Leaflet trava >~10k features); disclosure por zoom é norma e necessidade |
| Blue-dot GPS auto-seguindo | Briga com o pan do próprio corretor; só locate-me one-shot |
| flyTo cinematográfico longo por interação | Lê como lento na 10ª vez; drill deve ser ~0,5–1s |
| Satélite automático por zoom | Deve ser toggle deliberado do usuário |
| Ativar qualquer feature de IA em v2.0 | v2.0 só cria o seam dormant; ativação vem depois |
| IA tocando núcleo cadastral ou laudo | Dado oficial e avaliação permanecem 100% determinísticos e auditáveis |
| Ferramentas do corretor (custos, marketing, yield) | Deferido p/ v2.1+; v2.0 foca no redesenho mapa-first |
| Google Maps satélite | ToS proíbe acesso direto a tile e o cache do service worker |

## Traceability

Preenchido durante a criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DADOS-01 | Phase 1 | Complete |
| DADOS-02 | Phase 1 | Complete |
| DADOS-03 | Phase 1 | Complete |
| MAPA-01 | Phase 2 | Complete |
| MAPA-04 | Phase 2 | Complete |
| MAPA-02 | Phase 3 | Complete |
| MAPA-03 | Phase 3 | Complete |
| MAPA-05 | Phase 3 | Complete |
| SAT-01 | Phase 4 | Complete |
| SAT-02 | Phase 4 | Complete |
| IA-01 | Phase 5 | Complete |
| MOT-01 | Phase 6 | Complete |
| MOT-02 | Phase 6 | Complete |
| MOT-03 | Phase 6 | Complete |

**Coverage:**
- Requisitos v2.0: 14 total
- Mapeados para fases: 14 (100%)
- Não mapeados: 0 ✓

---
*Requirements defined: 2026-07-04*
*Last updated: 2026-07-04 after roadmap creation (14/14 requirements mapped to 6 phases)*
