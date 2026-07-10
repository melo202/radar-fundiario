# Radar Fundiário Goiânia

## What This Is

Ferramenta web (arquivo único `radar-goiania.html`, sem backend) que localiza imóveis de Goiânia por quadra/lote, endereço, inscrição ou clique no mapa, usando o ArcGIS público da Prefeitura. Mostra dados cadastrais oficiais (inscrição, área, uso, valor venal, IPTU) e uma estimativa de mercado estatística, plotando o lote no mapa. Público-alvo: corretores e investidores de Goiânia — está evoluindo de "localizador de imóvel" para uma **ferramenta de trabalho do corretor**.

## Core Value

O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado cadastral oficial e análise estatística **auditável linha a linha**, sem depender de servidor próprio.

## Current Milestone: v2.1 Busca, Bairros & Território

**Goal:** Elevar a qualidade de dados e a UX core e dar ao corretor as primeiras ferramentas de captação: corrigir os nomes de bairro, refinar a malha de bairros no mobile, reconstruir a busca como campo único inteligente ("de todos os jeitos possíveis"), e entregar a primeira leva de Território/captação.

**Target features:**
- Auditoria e correção dos nomes de bairro (reconciliar `nm_bai` contra fonte confiável)
- UX da malha de bairros no mobile (hierarquia por interação, densidade por zoom, toque na área; choropleth como ponte pro heatmap)
- Busca campo-único inteligente: detecção de intenção, chip de confirmação, setor na frase, lembrar setor, desambiguação, fix do fuzzy/falso-positivo, estados de erro/vazio úteis, exemplos tocáveis, CNEFE p/ logradouros, deep-link `?insc=`
- Ferramentas de Território/captação: painel do setor (mediana R$/m², IPTU, idade), heatmap R$/m² por quadra, detector de lote subutilizado, farming com memória (localStorage), diff de cadastro entre visitas, cruzamento com imóveis Caixa

**Deferido → v2.2:** ativação da pesquisa de mercado por IA (seam dormant já existe), ortofoto própria de Goiânia.

**Contexto/constraints:** núcleo cadastral segue 100% determinístico; a busca foi mexida recentemente (o campo-único pode substituir parte disso — checar estado atual); numeração de fases continua a partir da 7.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Home = mapa interativo de Goiânia (mobile e desktop mapa-first) — v2.0
- ✓ Bairros em linha com hover/toque→nome; clique→zoom→divisões dos lotes; breadcrumb — v2.0
- ✓ Busca movida para pill/card flutuante sempre acessível — v2.0
- ✓ Camada de satélite alternável (Esri keyless + rótulos + crossfade) — v2.0
- ✓ Motion fluido no app todo (transições, sheet spring, stagger, tap), reduced-motion + progressive enhancement — v2.0
- ✓ Seam de IA externa isolado e desativado (IIFE, whitelist anti-PII, fail-to-null, zero call-sites) — v2.0
- ✓ Dataset estático de bairros (1.206 polígonos, offline, versionado) — v2.0
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

<!-- Próximo milestone (v2.1) — definir via /gsd-new-milestone. Candidatos priorizados: -->

- [ ] **Auditoria de nomes de bairro** (data quality): os nomes exibidos no hover/toque vêm de `nm_bai` (layer 2, 1.206 polígonos, 466 sem nome, unidade administrativa diferente da busca) e têm **muitos nomes errados/inconsistentes**. Reconciliar o nome exibido contra a fonte confiável (`nmbairro`/`cdbairro` da layer 3 que a busca já usa, ou a lista oficial da Prefeitura) e corrigir no `bairros-goiania.json` (regenerar via `gerar-bairros.py` com o join de nomes). Tratar as 466 glebas sem nome.
- [ ] **UX da malha de bairros no mobile** (feedback do usuário: fica "estranho/emaranhado" no celular): malha ociosa vira contexto (traço fino + baixa opacidade, "sussurra"), destaque no toque é que "grita" (accent+nome — reforçar contraste idle vs highlight); densidade/peso das linhas emerge com o zoom (calmo na cidade, detalhado ao aproximar); garantir toque na ÁREA do bairro (fill), não só na linha. Evolução futura: trocar a malha neutra por **choropleth** (pintar por R$/m² etc.) — encaixa no heatmap de Território/captação abaixo.
- [ ] Ferramentas do corretor — **Território/captação** (prioridade do usuário): painel do setor (mediana R$/m², IPTU, idade), heatmap R$/m² por quadra, detector de lote subutilizado, farming com memória (localStorage), diff de cadastro, cruzamento com imóveis Caixa
- [ ] Ativação da pesquisa de mercado por IA sobre o seam dormant (proxy Cloudflare Worker ou BYO-key; `glm-4.5-air:online`/`qwen3-14b`; opt-in, rotulada "não é dado oficial")
- [ ] (stretch) Ortofoto própria de Goiânia (`Mapa_Ortofoto2016v2`, EPSG:31982, CRS custom no Leaflet)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Ferramentas do corretor (calculadora de custos, marketing, yield, etc.) — deferido p/ v2.1+ (prioridade: Território/captação); v2.0 foca no redesenho mapa-first
- Ativação de qualquer feature de IA no produto — v2.0 só cria o encaixe dormant; ativação vem depois
- IA tocando o núcleo cadastral ou o laudo — o dado oficial e a avaliação permanecem 100% determinísticos e auditáveis (LGPD + credibilidade)
- Scraping de anúncios (OLX/ZAP) — bloqueado por CORS/Cloudflare + ToS + jurisprudência
- Coleta em massa de titular/proprietário — só consulta manual, pontual, na fonte oficial (finalidade LGPD)
- Backend/servidor próprio — a proposta é arquivo único que roda no navegador

## Context

- **Estado atual (pós-v2.0, 2026-07-05):** app é mapa-first — abre no mapa de Goiânia com 1.206 bairros em linha, drill até os lotes, breadcrumb, busca em pill, satélite alternável (Esri keyless) e motion inline (motion.dev, reduced-motion + progressive enhancement). Seam de IA externa isolado e desativado. Núcleo cadastral/estatístico segue determinístico. Novos artefatos: `bairros-goiania.json`, `gerar-bairros.py`, `check-bairros-geojson.py`; `sw.js` em `radar-v5`.
- **Entrega:** único HTML autossuficiente (`radar-goiania.html`), roda no navegador desktop/celular, sem build, sem servidor. Publicável no GitHub Pages.
- **Stack atual:** HTML+CSS+JS inline; Leaflet 1.9.4 (mapa), proj4js 2.11.0 (EPSG:31982 UTM 22S → WGS84), tiles CARTO light + Esri World Imagery (satélite keyless), Motion (motion.dev) inline. JSONP para contornar ausência de CORS.
- **Fonte de dados:** ArcGIS público da Prefeitura (`.../Feature_Base/MapServer`, layers 0=lote/1=quadra/2=bairro/3=cadastro; ~310k lotes). Quirks: só `outFields=*`; **aceita** `returnGeometry=true` (verificado ao vivo 04/07/2026 — corrigido de "rejeita"); consulta espacial, aritmética no WHERE, `returnCountOnly`, paginação; 502 sob carga.
- **Verificação de campo pendente (não-bloqueante):** legibilidade de rótulos sobre satélite + fluidez do motion em Android médio/baixo no 4G real.
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
| Núcleo 100% determinístico; IA só isolada em pesquisa de mercado externa (evoluído em v2.0 de "SEM IA no produto") | Auditabilidade + defesa LGPD do dado oficial, mas com valor de IA para trabalho externo | ✓ Good — seam dormant entregue (v2.0), núcleo intacto |
| Estimativa sempre como faixa, nunca número seco; padrões IAAO | PGV defasada e heterogênea; honestidade estatística | ✓ Good |
| **v2.0: home vira mapa-first; busca vira pill** | Corretor pensa espacialmente; mapa é o gesto mais intuitivo | ✓ Good — verificado ao vivo |
| **v2.0: fica no Leaflet 1.9.4 (sem MapLibre); Motion embutido INLINE (não CDN)** | Polígonos/view << crossover; geometria (layers 0/1/2) já existe; inline preserva arquivo-único/PWA offline (sem CSP/sw novo) | ✓ Good |
| **v2.0: satélite = Esri World Imagery keyless (legado)** | Tiles Web Mercator drop-in sem chave; baixo volume, não divulgado — enquadramento aceito | ⚠️ Revisit se virar produto público de alto tráfego |
| **v2.0: `returnGeometry=true` funciona no endpoint (verificado ao vivo 04/07)** | Reverteu a premissa: geometria de bairro/lote já existia, era só expor | ✓ Good — docs corrigidos |
| **v2.0: diferenciais premium incluídos** (breadcrumb, crossfade, stagger) | Esforço baixo, ganho de percepção alto | ✓ Good |

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
*Last updated: 2026-07-10 after Phase 17 (Diff de cadastro na revisita — snapshot embutido no caderno, leitura comercial "venal subiu 12%"; cruzamento Caixa×território com badge/anel/popup, matching exato-normalizado 74% sem falso positivo; verificação passed 10/10 com evidência ao vivo em Chromium; suíte 184/184; Fases 7-17 completas, resta 18)*
