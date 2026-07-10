# Project Milestones: Radar Fundiário Goiânia

## v2.2 Polimento Premium (Shipped: 2026-07-10)

**Phases completed:** 2 phases, 4 plans, 8 tasks

**Key accomplishments:**

- Archivo + JetBrains Mono embutidas de verdade via 2 blocos @font-face variáveis em base64 (86,4KB), CSP corrigido com font-src, e as 196 declarações de família (IBM Plex + Open Sans) migradas por papel — a causa raiz da "letra feia" (zero fonte carregada, fallback sempre Segoe UI) está corrigida.
- 14 box-shadow ad hoc consolidados em 3 níveis nomeados (--elev-1/2/3 + repouso --elev-0), todos derivados de --ink, e acabamento de hover/active/focus refinado em cards/botões/inputs/divisores sem introduzir nenhuma cor nova.
- Utilitário trapFocus/untrapFocus/trapFocaveis (1 definição, 21 call-sites de trapFocus/12 de untrapFocus) aplicado às 6 superfícies modais, fechando o IN-03 diferido da Fase 13; gate completo da fase 19 (fontes+elevação+focus-trap+239 testes) verde, com o julgamento estético premium diferido para HUMAN-UAT do usuário.
- A-01 (crítico):

---

## v2.1 Cockpit Comercial (Shipped: 2026-07-10)

**Phases completed:** 13 phases, 41 plans, 96 tasks

**Key accomplishments:**

- Nomes de bairro reconciliados via spatial join POST contra a layer 3 (ArcGIS), com tie-break assistido por nome, mantendo geometria e contagem de 1206 polígonos byte-idênticas ao dataset anterior.
- okQ/okL/casaRuaCore (booleanos, com fallback de substring sem prioridade) trocados por matchScoreQ/matchScoreL/matchScoreRua (0=exato, 1=normalizado, 2=substring-com-boundary, null=não casa), usados para ordenar `finish()` por qualidade e exibir selo "~aproximado" nos matches de menor confiança.
- detectMode(textoBruto, combo) puro no bloco RADAR_PURE decide insc/quadra-lote/endereço/prédio/ambíguo seguindo a ordem contratual do SEARCH.md, com extração de setor embutido na frase (extractSetor) rodando antes de tudo e último setor lembrado persistido em localStorage — zero mudança de UI/comportamento visível nesta wave.
- Caixa única substitui a moderow como busca padrão em radar-goiania.html: input único com debounce ~150ms chamando detectMode/extractSetor (08-03), chip de confirmação tocável que abre o menu de correção reaproveitando 1:1 `.moderow`/`.modemore`, chips de desambiguação para confiança baixa, chip "Setor · Nome (último)" nunca silencioso, e dropdown unificado Setor+Rua (CNEFE lazy-loaded) com navegação por teclado.
- Três funções puras determinísticas — scoreOportunidade (percentil vs mediana/quartis), scoreConfianca (completude de dados) e leituraPratica (template pt-BR sem jargão) — adicionadas ao bloco RADAR_PURE existente, testadas via node:vm, zero mudança de UI.
- `#detail` reescrito top→bottom (faixa de valor → scores → leitura prática → 1 ação primária + 2 secundárias + Mais opções → comparáveis → dados técnicos/metodologia em accordion), `showDetail()` reescrito para chamar as 3 funções puras de score/leitura da Wave 1 e popular a ordem nova, com `renderScoresInto(op,conf)` extraída como contrato duro para a Wave 3.
- `renderComps()` reescrito para conclusão-primeiro (CMP-01): frase de magnitude de preço antes da estatística completa recolhida em `<details>`; `atualizarScores(a, statsR)` implementado fecha o ciclo deixado pela Wave 2 — os scores da ficha passam a refletir dados reais depois que `compare()` conclui, com o MESMO número (%) usado na frase-conclusão do painel de comparáveis.
- 11 funções puras de template pt-BR (5 WhatsApp + 4 Captação) e 2 helpers de persistência (oportunidadeItem allowlist + histAdd FIFO) adicionadas ao bloco RADAR_PURE, com harness TDD cobrindo honestidade, assinatura condicional e proteção de PII.
- localStorage `radar_oportunidades`/`radar_historico` com escrita nunca-silenciosa (toast em falha), toggle ⭐ honesto na ficha, e 2 blocos "Minhas oportunidades"/"Histórico" num container estático que sobrevive a qualquer busca via CSS `:has`.
- 5 botões "Copiar para WhatsApp" + "Captar este imóvel" em #dActsMore, sheet #captSheet (padrão .wiz) com 4 textos prontos + copiar individual, dadosFicha()/copyTexto() com fallback de clipboard, e o sweep ACAO-01 confirmando que toda superfície de resultado termina com ação útil — fecha a Fase 10.
- 3 funções puras novas em RADAR_PURE (recomendaDocumento, pendenciasDocumento, fichaRapidaTexto) cobrindo a matriz completa de recomendação de documento (4 finalidades × CNAI), o checklist de pendências reusando scoreConfianca, e o texto honesto da Ficha rápida — zero mudança de UI, 17 testes novos, 64/64 pass.
- Wizard `.wiz`/`LZ` ampliado de 4 para 6 passos numerados com um novo Seletor de Finalidade antes do passo 0 (substitui `abrirLaudo()` direto), um novo passo "Antes de gerar" (confiança + checklist reativo via `pendenciasDocumento`) e uma nova etapa "Revisão final" que é a ÚNICA porta de `montarLaudo()` — guarda `ec9f129` preservada; CNAI separado do CRECI em `radar_prof`.
- montarLaudo() ramificado por LZ.tipoDoc (ficha/relatório/PTAM), título do PTAM e TODA menção normativa COFECI (Metodologia + Ressalvas) decididos por comCnai em vez de comCreci, assinatura com CRECI+CNAI+linha COFECI condicional, e novo template montarFichaRapida()/renderFichaRapida() de 1 página reusando fichaRapidaTexto() pelo mesmo pipeline #laudo→#laudoView.
- 5 funções puras em RADAR_PURE geram as 3 minutas jurídicas (Proposta/Termo/Contrato) determinísticas em pt-BR com disclaimer literal, mais parseMatricula (regex de 2 ordens) e numeroPorExtenso (fronteiras cem/mil/milhão travadas por fixture) — zero IA, zero DOM, 15 testes novos.
- Terceiro sheet `.wiz` próprio `#negSheet` com estado `NEG` 100% em memória (zero localStorage), 2 passos (Partes & Valores por documento com defaults 90d/6%/10 dias + extração de matrícula via `parseMatricula`, depois Revisão da minuta editável com disclaimer fixo), ligado a 3 entradas na ficha e 1 no Modo Captação, e `montarNeg()` mínimo já disparando o pipeline `#laudo`→`#laudoView`.
- `montarNeg()` completo gera as 3 minutas (Proposta/Termo/Contrato) em A4 estruturado — cláusulas em blocos `page-break-inside:avoid`, disclaimer inegociável em caixa com borda `var(--l-accent)`, assinaturas `.lass` corretas por documento (2 testemunhas em Termo/Contrato) — pelo mesmo clique real que já existia (ec9f129), com 12 asserts end-to-end de privacidade/isolamento/estrutura todos passando de primeira.
- 4 funções puras (resumoPredio, ordenaUnidades, ehAptoProvavel, analisePredicoTexto) adicionadas ao bloco RADAR_PURE de radar-goiania.html — camada de cálculo/ordenação/texto 100% client-side para PRED-01/PRED-02, zero requisição de rede, TDD RED→GREEN com 22 novos testes.
- Camada de UI completa sobre as 4 funções puras da Wave 1 (12-01): `.bldg-head` expande com resumo (4 métricas) + ordenação/filtro/busca por prédio, e cada card de unidade ganha toggle de marcação para comparação em tabela até 4 colunas — zero requisição de rede nova, 101/101 testes verdes.
- `plot()`/`pick()` do Leaflet agora coloreiam pinos por `statusDeUnidade` (verde/amarelo/vermelho/cinza) com legenda sempre-visível e tooltip acessível; `buscar()`/`finish()`/`compare()` disparam as 5 mensagens literais de progresso real + skeleton shimmer CSS-only REDUCE-safe
- Onboarding modal de 3 cartões com persistência `radar_onboard`, foco gerenciado, Esc prioritário e skip por deep-link `?insc=`; catálogo "O que o Radar faz" com 5 CTAs reais no rodapé; `.chooser` confirmado conforme por herança de padding.
- Tabela de auditoria criada com glossário canônico ratificado; jargão "mediana" eliminado do rótulo de score de 1ª camada em 4 âncoras; loading estático unificado com MOTION_MSG — 107/107 testes verdes
- Varredura completa dos 106 `<button>`, 19 placeholders e textos de PWA/onboarding de `radar-goiania.html`; 12 rótulos de botão corrigidos para verbo de ação no infinitivo (§26.2), demais categorias auditadas e justificadas — 107/107 testes verdes
- Varredura completa dos 46 `toast()`, 4 estados vazios, 35 `aria-label` e 8 `title` de `radar-goiania.html`; 4 toasts de erro corrigidos para o padrão §26.3 (o que houve + o que fazer) e 1 tooltip com instrução de script Python removido — 107/107 testes verdes
- DISCLAIMER_NEG e as 3 minutas jurídicas confirmadas preservadas literalmente; achado transversal de concordância de gênero ("no região"→"na região") corrigido em 6 funções RADAR_PURE via novo helper localTxt; gate LING-01 fechado com 107/107 testes verdes, auditoria de 11 categorias consolidada e Sign-off dos 8 critérios §26 (todos PASS)
- 8 funções puras de estatística de território (R$/m², quantis, mix de uso, idade de cadastro) dentro do bloco RADAR_PURE + territorioScan(cdbairro) compartilhado com cache/dedupe/orçamento ≤3 páginas e fallback automático de outFields, ambos cobertos por TDD (node:vm slice, sem rede real em `npm test`).
- Choropleth de 5 faixas de quantil (azul sequencial, ColorBrewer Blues) pintado 100% via `setStyle()` sobre a malha de bairros/lotes já existente, alimentado por um novo asset de runtime que resolve o gap `id↔cdbairro`, com legenda tocável recolhível e REDUCE-safe.
- Painel `#terrPanel` (reuso 1:1 do padrão `.detail`) com botão "Ver território" no breadcrumb, métricas conclusão-primeiro com honestidade estatística obrigatória por métrica, rodapé de ação sincronizado com a legenda do choropleth, e instrumentação do orçamento de requisições — fecha o loop TERR-01/TERR-03 sem nenhuma requisição de rede nova além da já existente `territorioScan`.
- 5 funções puras do Detector de Lote Subutilizado (agrupamento por quadra + guarda 0-vs-null) e 3 funções puras de allowlist/validação do Caderno, ambas em RADAR_PURE com TDD RED→GREEN, elevando a suíte de 121 para 136 testes verdes.
- Wrapper IndexedDB nativo promise-based (CADERNO_IO, schema v1 com caminho v2 reservado) mais o bloco "Caderno de território" completo no painel Consulta (filtros, paginação, editor com autosave/duplo-toque) e o botão "Salvar no caderno" na ficha com export/import JSON sanitizado.
- Detector de Lote Subutilizado como view-swap dentro do painel de território (zero requisição própria, reusa o scan cacheado da Fase 15) com destaque no mapa via pino 🏗️, verificado ao vivo em navegador real: 0 requisições novas do detector, persistência confirmada após reload, e dump direto do IndexedDB sem nenhum campo de PII.
- Funções puras TDD de diff de cadastro (venal/IPTU/área/uso/data) e de matching Caixa→cdbairro com defesa LGPD recursiva no snapshot do Caderno; núcleo 100% testável, zero UI.
- 4 superfícies de UI novas (bloco de diff na ficha, badge no Caderno, linha no painel do território, anel/popup/legenda no pino Caixa) ligadas ao núcleo puro do Plano 01, com ação em 1 toque e zero XSS via data-attributes.
- Tabela de CA/altura conferida artigo-por-artigo contra a LC 349/2022 (AA 6,0x/ADD 5,0x), funções puras com REGRA DE OURO embutida (número não-conferido nunca vira número), state builder de 6 estados (`resolverZonaUI`) e bateria lazy deduplicada de 9 layers point-in-polygon (`pdConsultarLote`/`PDCACHE`) — tudo 100% testado por TDD via `node:vm`, antes de qualquer UI.
- Accordion "Urbanístico" na ficha (6 estados, REGRA DE OURO testada por assert de string), "porquê" do score citando a zona do PD e detector reescrito para ratear construído÷potencial-do-PD por centroide de quadra, com fallback rotulado e cache dedicado anti-colisão.
- 1. [Rule 1 - Bug] Especificidade CSS impediria o accent do chip ativo de aparecer

---

## v2.0 Mapa-first + Motion + Satélite (Shipped: 2026-07-05)

**Delivered:** A tela inicial virou o mapa interativo de Goiânia — bairros em linha, hover/toque mostra o nome, clique dá zoom e revela as divisões dos lotes; a busca virou uma pill flutuante; movimento fluido no app todo; camada de satélite alternável; e um encaixe de IA externa isolado e desativado. Núcleo cadastral segue 100% determinístico.

**Phases completed:** 6 fases, 12 planos, 17 tarefas

**Key accomplishments:**

- **Fundação de dados (Fase 1):** GeoJSON estático de 1.206 bairros gerado offline (paginação provada, reprojeção UTM-22 verificada), sem tocar o endpoint frágil no boot. Descoberta que reverteu a premissa: o endpoint **aceita** `returnGeometry=true` — a geometria de bairro/lote já existia, era só expor.
- **Home = Mapa (Fase 2):** app abre no mapa (mobile e desktop full-bleed), busca rebaixada para pill flutuante sempre acessível, coach-mark de 1º uso — verificado ao vivo no navegador.
- **Render + drill (Fase 3):** bairros em linha (Canvas), realce+nome no hover/toque (função única), clique→fitBounds→lotes via `refreshLots()` no zoom≥17, contornos somem no zoom de lote, breadcrumb Goiânia › Bairro. Bueno (~57k lotes) não trava.
- **Satélite (Fase 4):** toggle deliberado ruas⇄satélite (Esri World Imagery keyless) + overlay de rótulos, contornos legíveis sobre a imagem, crossfade de 250ms, e o fix de CSP que viabilizou os tiles — tudo verificado ao vivo (tiles 200 OK).
- **Seam de IA dormant (Fase 5):** `AI_CONFIG{enabled:false}` + `pesquisarMercadoIA()` num IIFE isolado, input whitelisted (barreira anti-PII), fail-to-null, zero call-sites, zero chave embutida — security review CLEAN.
- **Motion (Fase 6):** Motion (motion.dev) v12.42.2 embutido inline (eval-scan clean, sem CDN/CSP/sw novo), transições de tela, spring do bottom-sheet, stagger first-render e tap feedback — tudo com `prefers-reduced-motion` e progressive enhancement (app funciona sem Motion).

**Stats:**

- Tudo no arquivo único `radar-goiania.html` + novos: `bairros-goiania.json` (1.206 polígonos, ~167KB gz), `gerar-bairros.py`, `check-bairros-geojson.py`; `sw.js` → `radar-v5`.
- GSD: 6 fases, 12 planos, 17 tarefas; cada fase com research/plano/checagem/execução/review/verificação; verificação ao vivo no navegador (preview) por fase.
- Auditoria de milestone: **passed**, 14/14 requisitos, integração coerente.

**What's next:** v2.1+ — ferramentas do corretor (prioridade Território/captação: painel do setor, heatmap R$/m², lote subutilizado, farming), ativação da pesquisa de mercado por IA (proxy/BYO-key), e (stretch) ortofoto própria de Goiânia.

---

[Entries in reverse chronological order — newest first]

## v1.0 MVP + Inteligência + Mobile (Shipped: 2026-07-03)

**Delivered:** Localizador de imóveis de Goiânia (arquivo único HTML) com quatro formas de busca, análise estatística de mercado, laudo em PDF e experiência mobile premium.

**Phases completed:** Pré-GSD (desenvolvimento ad-hoc, documentado em ROADMAP-radar.md)

**Key accomplishments:**

- Busca confiável por quadra/lote, endereço, inscrição e clique no mapa (filtro server-side corrigiu o bug crítico dos setores grandes)
- Camada de inteligência determinística: comparáveis da vizinhança (mediana + Q1–Q3, Tukey, selo de confiança), IPTU e idade no card
- Mobile premium: bottom sheet, telas Busca⇄Mapa, alvos ≥44px, safe-area, PWA instalável
- Laudo de avaliação em PDF (wizard 4 passos, PTAM/relatório de referência)
- Oportunidades Caixa plotadas no mapa; robustez (escape HTML, retry/backoff, acessibilidade AA, export CSV)

**Stats:**

- App em arquivo único `radar-goiania.html` (~125 KB) + `caixa-goiania.js`, `atualizar-caixa.py`, PWA (manifest/sw/ícones)
- Documentação extensa: PROJETO-radar.md, ROADMAP-radar.md, INTELIGENCIA-radar.md, IDEIAS-hub-corretor.md, AUDITORIA-2026-07-03.md
- ~2 dias de desenvolvimento intenso (02–03/07/2026)

**Git range:** desenvolvimento inicial → `ec9f129` (fix laudo PDF)

**What's next:** v2.0 — redesenho mapa-first (home = mapa interativo de Goiânia com bairros e divisões de lotes), motion no app todo, camada satélite, e encaixe dormant para IA de pesquisa de mercado.

*Nota: milestone v1.0 reconstruída retroativamente ao inicializar a estrutura GSD em 2026-07-04. O trabalho foi feito antes da adoção do GSD; as fases não foram rastreadas individualmente.*

---
