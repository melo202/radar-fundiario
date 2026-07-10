# Phase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022) - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo — respostas recomendadas aceitas em lote, fundadas em `.planning/research/v2.1/PLANO-DIRETOR.md`, verificado ao vivo 2026-07-07)

<domain>
## Phase Boundary

A ficha responde **"o que este lote PODE SER"**: zona/unidade territorial do Modelo Espacial (consulta point-in-polygon ao vivo), CA e usos (tabela estática CONFERIDA contra o Anexo oficial), e essa inteligência alimenta o score de oportunidade e o detector de subutilizado. Camada de zonas como toggle no Território. Tudo determinístico (lei + GIS oficial), **zero IA**.

Entra: PD-01 (consulta por ponto), PD-02 (tabela zona→regras conferida), PD-03 (seção Urbanístico na ficha), PD-04 (score + detector upgrade), PD-05 (choropleth de zonas).
NÃO entra: cálculo de contrapartida de outorga (fórmula não confirmada na fonte primária — mostrar só o índice Vi SE conferido); certidões/integração SEPLANH; upzoning 2022vs2007 (ver Deferred).

</domain>

<decisions>
## Implementation Decisions

### Consulta urbanística (PD-01)
- **Fonte ÚNICA:** `MapaServer/Mapa_ModeloEspacial/MapServer` (produção) — NUNCA o `_teste` (regra anti-espelho da pesquisa)
- **Bateria por ponto** (x_coord/y_coord que o app já tem por lote, mesmo CRS 31982): layers **33** (Macrozoneamento), **31** (AA), **30** (ADD), **29** (AOS), **7** (AEIS), **28** (APAC), **32** (OOAU), **4** (Eixo de Desenvolvimento), **1** (Corredores) — GET `geometry=x,y&geometryType=esriGeometryPoint&inSR=31982` (padrão verificado ao vivo; ~200-500 bytes/resposta)
- **Lazy + cache:** dispara SÓ ao abrir a seção Urbanístico da ficha de UM lote (accordion abre → consulta; ou ficha abre → consulta em background com skeleton — decisão fina do planner); cache de sessão por `ci`/coordenada (zona não muda na sessão); NUNCA varredura de setor com essas layers
- Agrupamento: as ~9 queries por ponto disparam em paralelo com o mesmo retry/toast gentil do app; falha parcial → mostra o que resolveu + aviso discreto; orçamento: 1 lote = 1 bateria, deduplicada
- LGPD: resposta das layers do PD não tem PII (dado territorial), mas passa por render via esc() como tudo

### Tabela zona→regras (PD-02) — GATE DE VERDADE
- **Tarefa da fase:** baixar o PDF oficial da LC 349/2022 (Anexo, ~10MB, URL na pesquisa) e **ler os números na fonte primária**; resolver a divergência AA 6x vs 7,5x ANTES de exibir qualquer CA
- **Regra absoluta:** número NÃO conferido na fonte primária NUNCA aparece na UI — a ficha mostra a ZONA (que é fonte primária/GIS) sem o número; a tabela estática marca cada valor com `conferido: true/false` + referência (lei/artigo/anexo/página)
- Tabela versionada no repo (JSON <2KB embutido ou asset pequeno): sigla → {nome, ca_basico, ca_maximo, altura_max, vi_outorga, taxa_ocupacao, usos, fonte, conferido}
- Emendas LC 358/363/364/371/373/379: checadas e anotadas na tabela (staleness); rótulo no app sempre "LC 349/2022 e alterações"
- Se o PDF não puder ser baixado/lido no ambiente (rede/tamanho), a fase entrega com `conferido:false` em tudo — UI mostra só zonas (seguro por construção) e a conferência vira item HUMAN-UAT explícito para o usuário (advogado)

### Seção "Urbanístico" na ficha (PD-03)
- Accordion no bloco técnico da ficha (padrão Fase 9); conteúdo: Macrozona, Unidade Territorial (sigla+nome), CA básico/máximo (SE conferido), altura (SE conferida), badges de contexto (AEIS/APAC/ADD/eixo/corredor — restrição em tom de atenção, potencial em tom positivo, dentro do vocabulário --status-* da Fase 13)
- **Disclaimer fixo obrigatório:** "Informação urbanística indicativa, extraída do Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Uso do Solo da SEPLANH." — linguagem passa o gate §26 (Fase 14)
- Estados: carregando (skeleton), resolvido, parcial (algumas layers falharam + retry), fora da Macrozona Construída (macrozona rural → mensagem própria), erro (toast com saída)

### Score + Detector (PD-04)
- **Fator potencial-construtivo:** `potencial = areaterr × ca_basico_da_zona` (só com CA `conferido:true`); score de oportunidade ganha o fator `construído ÷ potencial` como sinal explicável — o "porquê" cita a zona ("Em Área Adensável — CA básico X, potencial de Y m²")
- **Detector upgrade:** critério vira `areaedif / potencial_do_PD` quando o CA da zona do lote está disponível E conferido; **fallback gracioso**: sem zona/CA conferido → mantém o critério atual da Fase 16 (areaedif/areaterr), rotulado como tal — o detector NUNCA quebra por falta do PD
- CUIDADO com o orçamento: o detector roda sobre a AMOSTRA do setor (6k lotes) — NÃO disparar bateria de PD por lote da amostra (avalanche). O upgrade usa a zona apenas quando barata: (a) lote individual na ficha, e (b) no detector, a zona do SETOR/quadra via 1 consulta pelo centroide da quadra candidata (só para os top-N candidatos, ex. 50 — máx. ~50 pontos, com cache) — decisão fina do planner respeitando "sem avalanche"
- Determinismo: fatores/thresholds como constantes nomeadas; funções puras TDD

### Choropleth de zonas (PD-05)
- Toggle no Território ("Zonas do Plano Diretor"), exclusivo com o choropleth de valor (1 camada temática por vez — evita salada de cor)
- Cores por Unidade Territorial seguindo a simbologia oficial do ArcGIS (consistência com material que o corretor conhece), com contraste AA sobre CARTO e satélite (mesma engenharia de opacidade da Fase 15)
- **População**: geometria das zonas via query das layers com `returnGeometry=true` LIMITADA à viewport/setor em foco (não a cidade inteira de uma vez); cache de sessão; legenda compacta reutilizando o padrão da Fase 15
- reduced-motion respeitado; setStyle()/camada própria sem recriar a malha base

### Claude's Discretion
- Skeleton vs consulta-no-abrir do accordion; formato exato da tabela (asset vs inline); top-N e centroides do detector; detalhes da paleta de zonas (desde que simbologia oficial + AA)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `jsonp`/retry/toast; padrão de bateria paralela (Fase 15); caches de sessão (TERRCACHE/CMPCACHE — clonar p/ `PDCACHE` por ci); ficha accordion técnico (Fase 9); scoreOportunidade + porque[] (Fase 9); detector puro (Fase 16 — critério isolado em função pura, upgrade barato por design); choropleth/legenda/toggle (Fase 15); esc()/data-attributes (lição Fase 16)
- Point-in-polygon no Modelo Espacial VERIFICADO ao vivo (2026-07-07): layers 31/33 responderam corretamente no CRS do app

### Established Patterns
- Honestidade: nunca número não-conferido; disclaimers; determinismo auditável; orçamento de requisições; suíte `npm test` (184 verdes) com funções puras no RADAR_PURE

### Integration Points
- Ficha `#detail` (accordion Urbanístico); scoreOportunidade/porque[]; detectarSubutilizados (função pura da Fase 16); painel do território/legenda (toggle de zonas); tabela estática nova (repo)

</code_context>

<specifics>
## Specific Ideas

- Phase flag do ROADMAP: "a conferência dos números de CA contra o Anexo oficial (PDF ~10MB) é tarefa da fase (baixar + ler)"; usuário é advogado — revisão final dos valores/disclaimer é HUMAN-UAT natural
- Success criterion 1: consultas agrupadas/lazy — SEM avalanche no endpoint frágil

</specifics>

<deferred>
## Deferred Ideas

- Upzoning 2022 vs 2007 (bateria extra nas layers 36-48; sinal forte de valorização) — v2.2 (dobraria as consultas por lote; entra depois que a base do PD estiver estável)
- Cálculo de contrapartida de outorga (fórmula não confirmada na LC 373/2024) — v2.2, exige leitura da lei específica
- Vazios urbanos via Mapa_UsoDoSoloNew layer 16 (query não testada) — v2.2

</deferred>
