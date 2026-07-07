# Roadmap: Radar Fundiário Goiânia

## Milestones

- ✅ **v1.0 MVP + Inteligência + Mobile** — pré-GSD (shipped 2026-07-03)
- ✅ **v2.0 Mapa-first + Motion + Satélite** — Fases 1-6 (shipped 2026-07-05) · [detalhes](milestones/v2.0-ROADMAP.md) · [requisitos](milestones/v2.0-REQUIREMENTS.md) · [auditoria](milestones/v2.0-MILESTONE-AUDIT.md)
- 🚧 **v2.1 Cockpit Comercial** — Fases 7-18 (em andamento)

## Phases

<details>
<summary>✅ v2.0 Mapa-first + Motion + Satélite (Fases 1-6) — SHIPPED 2026-07-05</summary>

- [x] Fase 1: Dataset Estático de Bairros + Correção de Docs (2/2 planos) — 2026-07-04
- [x] Fase 2: Home = Mapa (2/2 planos) — 2026-07-04
- [x] Fase 3: Render de Bairro + Hover/Tap + Click-to-Drill (2/2 planos) — 2026-07-04
- [x] Fase 4: Camada de Satélite (2/2 planos) — 2026-07-04
- [x] Fase 5: Seam de IA (dormant) (1/1 plano) — 2026-07-04
- [x] Fase 6: Motion no App Todo (3/3 planos) — 2026-07-05

Detalhes completos, critérios de sucesso e auditoria em `milestones/v2.0-*.md`.

</details>

### 🚧 v2.1 Cockpit Comercial (Fases 7-18)

**Milestone Goal:** Tirar o Radar de "consulta cadastral" e levar a **cockpit comercial de decisão e ação**: o corretor entende o imóvel em segundos e sai com uma **ação comercial pronta**. Núcleo **100% determinístico** e **client-side** (sem backend/contas/IA no core). Base: `Plano_UX_Radar_Fundiario_v3`.

**Decisões de escopo (2026-07-05):** (1) **cockpit primeiro**, Território depois; (2) **refinar** a identidade cartográfica atual (respiro + cor só p/ status), não rebrand; (3) **só client-side** — Hub/CRM/contas/IA-autônoma ficam p/ v2.2+.

**Sequência de dependência:** Fase 7 (fundação de dados — **nomes ✅ entregues**) → Fase 8 (busca única) → Fases 9-12 constroem o cockpit sobre a ficha/lista existentes (9 ficha+scores → 10 ação/WhatsApp/salvos → 11 documentos → 12 prédio) → Fase 13 aplica o refino visual/motion/pinos/descoberta sobre tudo → Fase 14 é o gate de linguagem impecável → Fases 15-17 entregam o Território (choropleth, detector/farming, diff/Caixa) sobre o setor-scan compartilhado.

- [~] **Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha** — nomes reconciliados ✅ (07-01) + exibição amigável ✅; falta CNEFE (07-02) e tuning da malha mobile (07-03)
- [x] **Phase 8: Busca Única Inteligente** — caixa única com detecção de intenção, chip de confirmação, setor na frase, colar link do Maps, voz (mobile), deep-link, autocomplete CNEFE — a11y re-auditada, guarda das regressões desktop
 (completed 2026-07-07)
- [x] **Phase 9: Ficha = Conclusão Comercial + Scores** — ficha reordenada (valor em destaque → oportunidade → confiança → leitura prática → ações → técnico em accordion); scores determinísticos explicáveis; comparáveis conclusão-primeiro
 (completed 2026-07-07)
- [x] **Phase 10: Camada de Ação + WhatsApp + Captação + Salvos** — toda tela termina com ação; copiar mensagens de WhatsApp (proprietário/comprador/argumento); salvar oportunidade + histórico + favoritos; modo captação (completed 2026-07-07)
- [x] **Phase 11: Documentos em 3 Níveis** — ficha rápida / relatório / laudo-PTAM; finalidade → recomenda doc; confiança+pendências antes de gerar; revisão antes do PDF (completed 2026-07-07)
- [ ] **Phase 11.1: Documentos da Negociação** — minutas de Proposta de C&V, Termo de Exclusividade/Autorização e Contrato de C&V, pré-preenchidas com o imóvel, editáveis, em PDF pt-BR com ressalvas; OCR da escritura (Tesseract.js, best-effort/opcional). Reusa a infra da Fase 11
- [ ] **Phase 12: Prédio como Objeto Comercial** — resumo do edifício antes da lista; ordenação (oportunidade/valor/área) e filtros; marcar unidades p/ comparar
- [ ] **Phase 13: Refino Visual, Pinos Semânticos, Motion & Descoberta Progressiva** — refino clean (respiro, cor só p/ status) mantendo identidade cartográfica; pinos semânticos; motion de busca em etapas + skeleton; onboarding ≤3 telas + "O que o Radar faz"; lei da tela
- [ ] **Phase 14: Linguagem Impecável (pt-BR)** — gate de release: toda microcopy (botões/placeholders/erros/tooltips/PDFs/WhatsApp) pelo checklist §26
- [ ] **Phase 15: Setor-Scan Compartilhado, Choropleth & Painel do Território** — varredura com orçamento de requisições; choropleth de R$/m² legível sobre satélite; painel do setor
- [ ] **Phase 16: Detector de Lote Subutilizado & Farming/Caderno** — detector sobre o scan da Fase 15; Farming com IndexedDB + allowlist anti-PII
- [ ] **Phase 17: Diff de Cadastro & Cruzamento Caixa** — snapshot entre visitas + cruzamento com imóveis Caixa sobre o território salvo
- [ ] **Phase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022)** — consulta por ponto ao Modelo Espacial já exposto no ArcGIS da prefeitura (verificado ao vivo); seção "Urbanístico" na ficha (zona, CA, usos + disclaimer); upgrade do detector (construído/potencial-do-PD) e boost do score; números de CA só entram conferidos contra o Anexo oficial

## Phase Details

### Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha
**Goal**: Nomes de bairro confiáveis (✅) e fundações de dados (CNEFE, tuning da malha) prontas.
**Depends on**: Nada.
**Requirements**: NOMES-01/02/03/04 ✅, MALHA-01
**Success Criteria**:
  1. ✅ Hover/toque/breadcrumb mostram nomes reconciliados (layer 3) — **entregue e no ar** (commits 07-01) + `nm_disp` amigável (Vila/Chácara/… com acento)
  2. ✅ `bairros-goiania.json` com geometria/contagem byte-idênticas (assert automatizado); drill continua funcionando
  3. ✅ Relatório de diff gerado; glebas → "Gleba não denominada"
  4. CNEFE (`logradouros-goiania.json`) versionado + `sw.js` cache bumped cobrindo os datasets
  5. No mobile, malha ociosa "sussurrada" e destaque no toque "grita"; densidade por zoom; toque na ÁREA (fill)
**Plans**: 07-01 ✅ · 07-02 (CNEFE) · 07-03 (tuning malha)

### Phase 8: Busca Única Inteligente
**Goal**: O corretor busca "de todos os jeitos" numa caixa única, sem perder capacidade nem acessibilidade.
**Depends on**: Fase 7 (CNEFE alimenta o autocomplete)
**Requirements**: BUSCA-01..14
**Success Criteria**:
  1. Funções puras de matching/detecção com harness de teste (Node + fixtures) **antes** de mudar comportamento — inclui casos ambíguos (135 sozinho, "Rua 135", "Q135", inscrição 10 vs 14 díg)
  2. Digitar em qualquer formato detecta a intenção e mostra **chip de confirmação** tocável antes de disparar quando a confiança é baixa; nunca assume silenciosamente
  3. Setor na frase funciona; sem setor, assume o último usado (lembrado), com forma clara de trocar
  4. Fuzzy ordenado por qualidade (dígitos por igualdade antes de substring; rua por fronteira de palavra), selo "aproximado" no fallback — recall não piora
  5. Erro/vazio oferecem próximo passo em 1 toque; **placeholder com exemplos tocáveis**; deep-link `?insc=` + "copiar link"; autocomplete CNEFE; **colar link do Google Maps/coordenada** cai no lote; **voz** no mobile (degrada onde não houver)
  6. Checklist de a11y de 03/07 re-passa (ARIA combobox/activedescendant, teclado, live regions, foco/trap); `SEARCHTOKEN` propagado em todo caminho novo; quirk iOS preservado
  7. **Coordenação busca⇄ficha no desktop não regride** (guarda do hotfix `a7a4646`): busca sempre fechável (× + Esc); abrir ficha/seletor fecha o overlay (zero sobreposição ≥821px); prédio abre seletor sobre o mapa
  8. **Auditoria dos dados da ficha** em TODOS os modos (ql/endereço/prédio/inscrição 10-14 díg/clique-no-mapa) contra o registro de origem
**Plans**: 08-01 (harness+RADAR_PURE) · 08-02 (fuzzy-fix+ranking) · 08-03 (detectMode+setor-na-frase) · 08-04 (caixa única UI+dropdown CNEFE) · 08-05 (deep-link+voz+erros+auditoria de dados)
**Phase flags**: calibrar a regex do `detectMode()` com amostra real (MEDIUM confidence); INCORPORA e protege os fixes do hotfix `a7a4646`.

### Phase 9: Ficha = Conclusão Comercial + Scores
**Goal**: A ficha responde "quanto vale, qual a oportunidade e o que fazer" antes de mostrar dado técnico — tudo determinístico e explicável.
**Depends on**: Fase 8 (a busca leva à ficha) — pode ser paralelizada em parte, mas a ordem de UX é busca→ficha.
**Requirements**: FICHA-01, SCORE-01, SCORE-02, LEIT-01, CMP-01
**Success Criteria**:
  1. A ficha reordena: identificação+localização → **faixa de valor em destaque** → score de oportunidade → score de confiança → leitura prática → ações principais → comparáveis+mapa → **dados técnicos em accordion** → metodologia/fontes no fim
  2. **Score de oportunidade** (0–100) por REGRA (posição vs mediana da vizinhança/faixa), com "por quê" visível — nunca caixa-preta, nunca LLM
  3. **Score de confiança** (alta/média/baixa) por completude de dados (área, nº de comparáveis, imóvel atípico) + frase de "por quê"; o app **admite incerteza** (sem falsa precisão)
  4. **Leitura prática** em linguagem comercial por template determinístico; jargão (mediana/percentil) só em "ver metodologia"
  5. Comparáveis com **conclusão primeiro** ("8% abaixo da mediana da vizinhança"), estatística recolhida; cada comparação termina com ação
  6. Zero regressão de dados vs Fase 8 §8 (venal 0 = "não informado", áreas/uso corretos) e a11y (foco/accordion navegável por teclado)
**Plans**: 09-01 (scores puros: scoreOportunidade/scoreConfianca/leituraPratica + harness) · 09-02 (ficha reordenada FICHA-01) · 09-03 (comparaveis conclusao-primeiro CMP-01 + wiring de scores)
**Phase flags**: a fórmula dos scores precisa de calibração com casos reais (é decisão de produto documentável, não IA) — registrar a fórmula e seus limites na metodologia.

### Phase 10: Camada de Ação + WhatsApp + Captação + Salvos
**Goal**: Todo resultado vira próxima ação concreta; o corretor copia mensagens prontas e guarda o que interessa — sem servidor.
**Depends on**: Fase 9 (as ações operam sobre a ficha comercial + scores)
**Requirements**: ACAO-01, ZAP-01, SALV-01, CAPT-01
**Success Criteria**:
  1. **Lei da tela** aplicada: cada tela de resultado tem 1 ação principal em destaque, até 2 secundárias e "Mais opções" — resultado nunca termina sem ação útil
  2. **Copiar p/ WhatsApp** em pt-BR impecável (soa como corretor): resumo, mensagem p/ proprietário, mensagem p/ comprador, argumento de preço, riscos/ressalvas — texto gerado por template determinístico
  3. **Salvar oportunidade** + **histórico** de consultas + **favoritos** persistem em `localStorage` (allowlist de campos, sem PII de terceiros); reabrir o app dias depois mostra o mesmo; falha de escrita é visível (nunca silenciosa)
  4. **Modo captação**: a partir de um imóvel gera abordagem ao proprietário, script de ligação, checklist documental e tarefa de follow-up — tudo copiável
**Plans**: 3 plans
Plans:
- [x] 10-01-PLAN.md — Templates puros WhatsApp/Captação + oportunidadeItem/histAdd no RADAR_PURE (TDD, allowlist anti-PII)
- [x] 10-02-PLAN.md — Persistência localStorage (radar_oportunidades/radar_historico) + ⭐ Salvar na ficha + blocos Oportunidades/Histórico no painel Consulta
- [x] 10-03-PLAN.md — Grupo "Copiar para WhatsApp" (5 botões) + Modo Captação (sheet .wiz) + sweep ACAO-01
**Phase flags**: nomenclatura consistente (não alternar "Oportunidades/Favoritos/Salvos" — decidir os nomes e travar; entra no gate LING-01). Nomes travados no 10-CONTEXT.md: "Oportunidades" (explícito) e "Histórico" (automático).

### Phase 11: Documentos em 3 Níveis
**Goal**: O corretor escolhe a finalidade e recebe o documento certo (ficha rápida, relatório ou laudo/PTAM), sem peso jurídico indevido.
**Depends on**: Fase 9 (valor/scores/leitura), Fase 10 (ações)
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria**:
  1. Três saídas nomeadas — **Ficha rápida** / **Relatório de avaliação** (10+ comparáveis ou explica a limitação) / **Laudo-PTAM**; a UI pergunta a **finalidade** primeiro e **recomenda** o tipo
  2. **Painel de confiança + pendências** (área, conservação, documentação, nº de comparáveis) antes de gerar; linguagem de responsabilidade ("faixa estimada", "recomenda-se confirmar")
  3. **Revisão/edição antes do PDF** (dados sensíveis e textos principais); reusa o wizard atual (não recomeça); o PDF continua saindo do clique do usuário (guarda do fix `ec9f129`)
**Plans:** 3/3 plans complete
Plans:
- [x] 11-01-PLAN.md — RADAR_PURE: recomendaDocumento + pendenciasDocumento + fichaRapidaTexto (TDD)
- [x] 11-02-PLAN.md — Seletor de Finalidade + passo Confiança/Pendencias + CNAI separado + Revisao pre-PDF
- [x] 11-03-PLAN.md — Titulo PTAM por CNAI + montarFichaRapida() (Ficha rapida)

### Phase 11.1: Documentos da Negociação (Proposta · Exclusividade · Contrato)
**Goal**: O corretor gera as minutas do negócio (Proposta de C&V, Termo de Exclusividade/Autorização, Contrato de C&V) já preenchidas com o imóvel, editáveis, em PDF pt-BR com ressalvas — a papelada que fecha a captação e a venda, sem sair do app.
**Depends on**: Fase 11 (infra de documento/wizard/PDF), Fase 10 (Modo Captação — o Termo de Exclusividade sai da captação), Fase 9 (dados/valor do imóvel)
**Requirements**: NEG-01, NEG-02, NEG-03 (NEG-04 DEFERIDO — decisão 11.1-CONTEXT: OCR adiado, substituído por colar texto + parse leve)
**Success Criteria**:
  1. As 3 minutas (Proposta, Exclusividade, Contrato) são geradas por **template determinístico** pré-preenchido com o imóvel (cadastro: inscrição/endereço/quadra-lote/área) + campos de partes/valor/condições editáveis — **nunca por LLM** (núcleo determinístico)
  2. Cada documento é uma **minuta editável** antes do PDF (mesma etapa de revisão da Fase 11) e traz **ressalva clara** ("minuta para conferência; recomenda-se revisão jurídica e registro em cartório/RGI") — jamais promete validade automática
  3. O **Termo de Exclusividade** puxa proprietário/corretor(CRECI)/prazo/comissão e se integra ao Modo Captação (Fase 10); a **Proposta** traz validade da oferta; o **Contrato** traz matrícula/RGI + forma de pagamento + cláusulas padrão
  4. **NEG-04 (opcional)**: OCR da escritura/matrícula via **Tesseract.js** (WASM client-side, determinístico) pré-preenche matrícula/partes/descrição, com o corretor **sempre revisando**; fallback = digitar/colar; degrada onde o OCR não estiver disponível — nunca é fonte confiável sozinho
  5. Toda a microcopy e os textos das minutas passam no gate de linguagem (Fase 14); zero campo pessoal de terceiros persistido além do necessário à minuta
**Plans**: 3 plans
Plans:
- [x] 11.1-01-PLAN.md — RADAR_PURE (TDD): propostaTexto/termoExclusividadeTexto/contratoTexto + parseMatricula + numeroPorExtenso
- [ ] 11.1-02-PLAN.md — Wizard NEG próprio (#negSheet, estado em memória, nunca persistido) + extração de matrícula + entradas em #dActsMore e #captSheet
- [ ] 11.1-03-PLAN.md — Template A4 impresso (cláusulas/disclaimer/assinaturas) via pipeline #laudo→#laudoView + verificação end-to-end/privacidade
**UI hint**: yes
**Phase flags**: OCR de scan de cartório é notoriamente ruidoso — NEG-04 é best-effort/opcional, com revisão humana obrigatória; se o custo/qualidade não compensar, entrega-se as minutas com preenchimento manual e adia-se o OCR.

### Phase 12: Prédio como Objeto Comercial
**Goal**: Um prédio vira leitura comercial (faixa, padrão, unidades interessantes), não uma tabela longa de inscrições.
**Depends on**: Fase 9 (scores por unidade), Fase 8 (busca de prédio)
**Requirements**: PRED-01, PRED-02
**Success Criteria**:
  1. **Resumo do prédio** antes da lista: nº de unidades, área média, venal médio, valor estimado médio e **faixa** do edifício, com ações (ver unidades, gerar análise do prédio, achar aptos mais interessantes)
  2. Ordenação (maior oportunidade / menor valor estimado / maior área) e filtros (ocultar garagem/box, aptos prováveis, buscar unidade); marcar unidades p/ comparação
  3. Guarda da correção do mobile já feita (lista não some atrás do form; garagem = "não informado") não regride
**Plans**: TBD · **UI hint**: yes

### Phase 13: Refino Visual, Pinos Semânticos, Motion & Descoberta Progressiva
**Goal**: A cara "cockpit premium" — limpa, com cor só onde significa status, movimento que orienta e revelação progressiva do poder do app.
**Depends on**: Fases 9-12 (o refino aplica-se sobre o cockpit já funcional)
**Requirements**: VIS-01, PIN-01, MOT-01, DESC-01
**Success Criteria**:
  1. **Refino visual** preservando a identidade cartográfica: mais respiro entre blocos, menos textura/borda/caixa, hierarquia por tamanho/contraste/espaço; **cor reservada a status** (verde=oportunidade, amarelo=atenção, vermelho=risco), sem óxido parecendo alerta constante — paleta em variáveis, zero cor hard-coded nova fora do sistema
  2. **Pinos semânticos** no mapa (verde/amarelo/vermelho/dourado Caixa/cinza sem-dado); clicar abre painel com valor + score + próximas ações
  3. **Motion de busca em etapas** (Localizando → Consultando → Calculando → Buscando comparáveis → Preparando mapa) + **skeleton** em listas/cards; respeita `prefers-reduced-motion`; usa o Motion já embutido (sem nova dependência)
  4. **Descoberta progressiva**: tela inicial com promessa + busca única + 3 benefícios; funções aparecem conforme o resultado; onboarding ≤3 telas; área discreta "O que o Radar faz"; a "lei da tela" vale em todo o app
**Plans**: TBD · **UI hint**: yes
**Phase flags**: legibilidade dos pinos/cores sobre satélite em luz externa é pendência de UAT (não bloqueante), igual ao herdado do v2.0.

### Phase 14: Linguagem Impecável (pt-BR) — gate de release
**Goal**: Nenhum texto amador chega ao usuário; microcopy é produto.
**Depends on**: Fases 8-13 (revisa o texto de tudo que o cockpit introduziu)
**Requirements**: LING-01
**Success Criteria**:
  1. Toda a microcopy (botões, placeholders, mensagens de erro, tooltips, títulos, descrições, PDFs, mensagens de WhatsApp) passou pelo checklist §26: acentuação correta; **verbo de ação** nos botões (gerar/copiar/salvar/comparar/enviar/criar); erro que explica e oferece saída; sem jargão na 1ª camada; sem caixa alta em bloco longo; sem ironia/gíria; consistência de nomenclatura
  2. As mensagens copiadas p/ WhatsApp parecem escritas por um corretor profissional; os documentos usam linguagem formal e juridicamente cuidadosa
**Plans**: TBD

### Phase 15: Setor-Scan Compartilhado, Choropleth & Painel do Território
**Goal**: O corretor vê o "calor" de valor do território e as métricas do setor, sem avalanche de requisições.
**Depends on**: Fase 7 (tuning idle/highlight da malha)
**Requirements**: TERR-01, TERR-02, TERR-03
**Success Criteria**:
  1. Função compartilhada de varredura de setor com cache de sessão, usada por todas as ferramentas de território — nenhuma varredura ad-hoc
  2. Abrir o painel/choropleth do maior setor (Bueno, ~57k lotes) dispara ≤1-3 requisições paginadas (nunca 1 por quadra) — verificado ao vivo; zoom-gate antes de qualquer consulta de território
  3. Choropleth de R$/m² (quantis relativos ao setor) substitui a cor neutra da malha; resolve o "emaranhado" mobile (a hierarquia idle/highlight da Fase 7 é a base)
  4. Choropleth legível sobre CARTO e satélite (AA nos dois); troca via `setStyle()` (não recria geometria); respeita `prefers-reduced-motion`
  5. Painel do Meu Território: mediana + Q1–Q3 de R$/m², IPTU mediano, idade do cadastro e mix de uso
**Plans**: TBD · **UI hint**: yes
**Phase flags**: orçamento real em setor grande no 4G é verificação de campo em aberto; legibilidade sobre satélite em luz externa é UAT não-bloqueante.

### Phase 16: Detector de Lote Subutilizado & Farming/Caderno
**Goal**: O corretor identifica lote subutilizado e mantém um caderno de território que persiste entre sessões, sem risco de PII.
**Depends on**: Fase 15 (reusa o setor-scan compartilhado)
**Requirements**: TERR-04, TERR-05
**Success Criteria**:
  1. Detector (razão construído/terreno baixa em quadra de venal alto) roda como filtro sobre o scan da Fase 15 — sem requisições próprias
  2. Salvar setor/lotes, tags, notas e status no Caderno persiste entre sessões (reabrir dias depois mostra o mesmo)
  3. Persistência em **IndexedDB** (nunca localStorage p/ snapshots), com fallback visível se a escrita falhar
  4. `sanitizeAttrs()`/allowlist central impede qualquer campo fora da lista — e nunca `dtnascimen` — no IndexedDB; DevTools confirma ausência de PII
**Plans**: TBD

### Phase 17: Diff de Cadastro & Cruzamento Caixa
**Goal**: O corretor vê o que mudou num lote desde a última visita e onde os imóveis Caixa cruzam com o território salvo.
**Depends on**: Fase 15 (setor-scan), Fase 16 (território salvo/IndexedDB)
**Requirements**: TERR-06, TERR-07
**Success Criteria**:
  1. Revisitar um lote salvo mostra o que mudou desde o snapshot (diff enxuto, nunca PII; mesma allowlist da Fase 16)
  2. Imóveis Caixa plotados são cruzados com o território salvo, destacando quando um imóvel Caixa cai num setor/lote já farmado
**Plans**: TBD

### Phase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022)
**Goal**: A ficha responde "o que este lote PODE SER" — zona/unidade territorial do Modelo Espacial, coeficiente de aproveitamento, usos — e essa inteligência alimenta o score de oportunidade e o detector de subutilizado. Tudo dado oficial determinístico (lei + GIS da prefeitura), zero IA.
**Depends on**: Fase 9 (ficha comercial — a seção Urbanístico entra nela), Fase 16 (detector — recebe o upgrade de potencial)
**Requirements**: PD-01, PD-02, PD-03, PD-04, PD-05
**Evidence base**: `.planning/research/v2.1/PLANO-DIRETOR.md` (verificado AO VIVO 2026-07-07): o ArcGIS já usado pelo app expõe `MapaServer/Mapa_ModeloEspacial/MapServer` — 49 camadas do Modelo Espacial da LC 349/2022 (macrozoneamento=33, área adensável=31, AEIS, vazios, eixos…), queryáveis por PONTO via GET no mesmo CRS (`x_coord`/`y_coord`) que o app extrai por lote. Caminho A (consulta ao vivo) confirmado; zero infra nova.
**Success Criteria**:
  1. Abrir a ficha de um lote dispara consulta point-in-polygon às camadas relevantes do Modelo Espacial (mesmo padrão `jsonp`/token/retry do app; consultas agrupadas/lazy — sem avalanche no endpoint frágil) e resolve a(s) zona(s) do lote
  2. Tabela estática zona→regras (CA básico/máximo, outorga/Vi, usos) versionada no repo — com CADA número conferido contra o Anexo oficial da LC 349/2022 (fonte primária); a divergência conhecida (Área Adensável 6x vs 7,5x nas fontes secundárias) é resolvida ANTES de qualquer exibição; alterações posteriores (LC 358/363/364/371/373/379) checadas e anotadas
  3. Seção "Urbanístico" na ficha (accordion, padrão Fase 9): macrozona/unidade, CA, usos, eixo/adensamento — com disclaimer fixo: "informação urbanística indicativa — a consulta oficial é a Certidão de Uso do Solo (SEPLANH)"; linguagem passa o gate da Fase 14
  4. Inteligência integrada: score de oportunidade ganha o fator potencial-construtivo (construído atual ÷ potencial do PD), e o detector da Fase 16 passa a usar construído/POTENCIAL-do-PD (não só construído/terreno) — ambos explicáveis ("por quê" cita a zona)
  5. Camada de zonas disponível como toggle no Território (choropleth por zona), legível sobre CARTO e satélite
**Plans**: TBD · **UI hint**: yes
**Phase flags**: a conferência dos números de CA contra o Anexo oficial (PDF ~10MB) é tarefa da fase (baixar + ler); se algum número não puder ser confirmado na fonte primária, a UI mostra a ZONA sem o número (nunca exibe valor não-conferido). Usuário é advogado — revisão final dos valores/disclaimer é um HUMAN-UAT natural.

## Progress

**Execution Order:** 7 → 8 → 9 → 10 → 11 → 11.1 → 12 → 13 → 14 → 15 → 16 → 17 → 18

| Fase | Milestone | Planos | Status | Concluída |
|------|-----------|--------|--------|-----------|
| 1. Dataset de Bairros + Docs | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 2. Home = Mapa | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 3. Render de Bairro + Drill | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 4. Camada de Satélite | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 5. Seam de IA (dormant) | v2.0 | 1/1 | ✅ Complete | 2026-07-04 |
| 6. Motion no App Todo | v2.0 | 3/3 | ✅ Complete | 2026-07-05 |
| 7. Fundação de Dados (Nomes/CNEFE/Malha) | v2.1 | 3/3 | Complete    | 2026-07-07 |
| 8. Busca Única Inteligente | v2.1 | 5/5 | Complete    | 2026-07-07 |
| 9. Ficha Comercial + Scores | v2.1 | 3/3 | Complete    | 2026-07-07 |
| 10. Ação + WhatsApp + Captação + Salvos | v2.1 | 3/3 | Complete    | 2026-07-07 |
| 11. Documentos em 3 Níveis | v2.1 | 3/3 | Complete    | 2026-07-07 |
| 11.1 Documentos da Negociação (Proposta/Exclusividade/Contrato) | v2.1 | 1/3 | In Progress|  |
| 12. Prédio Comercial | v2.1 | 0/TBD | Not started | - |
| 13. Visual + Pinos + Motion + Descoberta | v2.1 | 0/TBD | Not started | - |
| 14. Linguagem Impecável (gate) | v2.1 | 0/TBD | Not started | - |
| 15. Setor-Scan + Choropleth + Painel | v2.1 | 0/TBD | Not started | - |
| 16. Detector + Farming/Caderno | v2.1 | 0/TBD | Not started | - |
| 17. Diff de Cadastro + Caixa | v2.1 | 0/TBD | Not started | - |
| 18. Inteligência Urbanística (PD 2022) | v2.1 | 0/TBD | Not started | - |

**v2.0: 6/6 fases, 12/12 planos, 14/14 requisitos — 100% (shipped).**
**v2.1 (Cockpit Comercial): 13 fases (7-18, incl. 11.1). Fase 7 ✅ (2 HUMAN-UAT diferidos). Requisitos: NOMES ✅ + ~47 pendentes.**

Próximo passo: modo autônomo em curso (Fase 8) — corre até a 18 + lifecycle; para antes de IA/CRM (v2.2).
