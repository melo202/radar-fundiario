# Radar Fundiário Goiânia

## What This Is

Ferramenta web (arquivo único `radar-goiania.html`, sem backend) que localiza imóveis de Goiânia por quadra/lote, endereço, inscrição ou clique no mapa, usando o ArcGIS público da Prefeitura. Mostra dados cadastrais oficiais (inscrição, área, uso, valor venal, IPTU) e uma estimativa de mercado estatística, plotando o lote no mapa. Público-alvo: corretores e investidores de Goiânia — está evoluindo de "localizador de imóvel" para uma **ferramenta de trabalho do corretor**.

## Core Value

O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado cadastral oficial e análise estatística **auditável linha a linha**, sem depender de servidor próprio.

## Requirements

### Validated

<!-- Shipped and confirmed valuable (milestone v1.0). -->

- ✓ Busca por quadra+lote, endereço, inscrição (CI/nrinscr) e clique no mapa — v1.0
- ✓ Filtro server-side (LIKE/UPPER no WHERE) que corrigiu o bug crítico dos setores grandes — v1.0
- ✓ Autocomplete de setor acento-insensível com expansão de abreviações — v1.0
- ✓ Prédios/apartamentos por unidade (complemento, inscrição, venal próprio; garagens ocultas) — v1.0
- ✓ Estimativa de mercado por comparáveis da vizinhança (mediana + Q1–Q3, cerca de Tukey, selo de confiança) — v1.0
- ✓ Mobile premium: bottom sheet, telas Busca⇄Mapa, alvos ≥44px, safe-area, PWA — v1.0
- ✓ Laudo de avaliação em PDF (wizard 4 passos, PTAM/relatório de referência) — v1.0
- ✓ Oportunidades Caixa plotadas no mapa (pinos com preço/laudo/desconto) — v1.0
- ✓ IPTU e idade do cadastro no card (custo zero) — v1.0
- ✓ Robustez: escape HTML, guarda de CDN, retry/backoff, acessibilidade AA, export CSV — v1.0

### Active

<!-- Milestone v2.0 scope. Building toward these. -->

- [ ] Home = mapa interativo com zoom em toda Goiânia
- [ ] Bairros renderizados como polígonos (linha); hover mostra o nome
- [ ] Clique no bairro → zoom no bairro + revela as divisões dos lotes
- [ ] Busca movida da tela inicial para um card clicável (deixa de ser a home)
- [ ] Motion fluido no app todo (transições, sheet, cards) — liso no mobile
- [ ] Camada de satélite alternável
- [ ] Seam de integração de IA externa (pesquisa de mercado), plugável e desativado

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Ferramentas do corretor (calculadora de custos, marketing, yield, etc.) — deferido p/ v2.1+ (prioridade: Território/captação); v2.0 foca no redesenho mapa-first
- Ativação de qualquer feature de IA no produto — v2.0 só cria o encaixe dormant; ativação vem depois
- IA tocando o núcleo cadastral ou o laudo — o dado oficial e a avaliação permanecem 100% determinísticos e auditáveis (LGPD + credibilidade)
- Scraping de anúncios (OLX/ZAP) — bloqueado por CORS/Cloudflare + ToS + jurisprudência
- Coleta em massa de titular/proprietário — só consulta manual, pontual, na fonte oficial (finalidade LGPD)
- Backend/servidor próprio — a proposta é arquivo único que roda no navegador

## Context

- **Entrega:** único HTML autossuficiente (`radar-goiania.html`, ~125 KB), roda no navegador desktop/celular, sem build, sem servidor. Publicável no GitHub Pages.
- **Stack atual:** HTML+CSS+JS inline; Leaflet 1.9.4 (mapa), proj4js 2.11.0 (EPSG:31982 UTM 22S → WGS84), tiles CARTO light. JSONP para contornar ausência de CORS.
- **Fonte de dados:** ArcGIS público da Prefeitura (`.../Feature_Base/MapServer/3`, Cadastro Imobiliário, ~310k lotes). Quirks documentados: só `outFields=*`, sem `returnGeometry`, aceita consulta espacial, aritmética no WHERE, `returnCountOnly`, paginação; 502 sob carga.
- **Dados abertos já mapeados p/ o mapa-first:** GeoJSON de bairros da Prefeitura **em EPSG:31982** (mesmo CRS do app), camadas de Plano Diretor no mesmo ArcGIS (point-in-polygon ao vivo).
- **Docs de referência no repo:** `PROJETO-radar.md`, `ROADMAP-radar.md`, `INTELIGENCIA-radar.md`, `IDEIAS-hub-corretor.md`, `AUDITORIA-2026-07-03.md`.
- **LGPD:** nunca exibir/exportar `dtnascimen` (data de nascimento do contribuinte). Titular só manual, na fonte oficial atrás de CAPTCHA.

## Constraints

- **Arquitetura**: arquivo único sem build/backend — qualquer lib nova precisa rodar via CDN/inline e sobreviver offline (PWA já existe).
- **Dados**: endpoint da Prefeitura é frágil (502 sob carga) e sem SLA — minimizar volume, retry gentil, ter plano B.
- **Coordenadas**: EPSG:31982 = UTM **zona 22** (não 23) — regressão histórica cara; qualquer troca de mapa preserva esse pipeline.
- **Performance**: uso em campo no 4G/celular — motion e render de lotes precisam ser lisos no mobile.
- **Custo**: seam de IA precisa mirar modelo de custo baixíssimo (pesquisa em andamento).
- **Privacidade/LGPD**: núcleo determinístico e auditável; sem coleta de dado pessoal de terceiros.

## Key Decisions

<!-- Decisions that constrain future work. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Arquivo único, sem backend, JSONP | Roda local/GitHub Pages sem servidor; endpoint não tem CORS | ✓ Good |
| EPSG:31982 = UTM zona 22 South | Zona 23 dava 6° de erro ("pino na Bahia") | ✓ Good |
| Inteligência 100% determinística, SEM IA no produto (02/07) | Auditabilidade + defesa LGPD do dado oficial | ⚠️ Revisit — evoluída em v2.0 (ver abaixo) |
| Estimativa sempre como faixa, nunca número seco; padrões IAAO | PGV defasada e heterogênea; honestidade estatística | ✓ Good |
| **v2.0: IA permitida, mas isolada em pesquisa de mercado externa** | Núcleo cadastral/laudo seguem determinísticos; IA opt-in, rotulada, sandbox | — Pending |
| **v2.0: home vira mapa-first; busca vira card** | Corretor pensa espacialmente; mapa é o gesto mais intuitivo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-04 after bootstrapping GSD structure + starting milestone v2.0 (Mapa-first + Motion + Satélite)*
