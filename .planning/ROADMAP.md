# Roadmap: Radar Fundiário Goiânia

## Milestones

- ✅ **v1.0 MVP + Inteligência + Mobile** — pré-GSD (shipped 2026-07-03)
- ✅ **v2.0 Mapa-first + Motion + Satélite** — Fases 1-6 (shipped 2026-07-05) · [detalhes](milestones/v2.0-ROADMAP.md) · [requisitos](milestones/v2.0-REQUIREMENTS.md) · [auditoria](milestones/v2.0-MILESTONE-AUDIT.md)
- 🚧 **v2.1 Busca, Bairros & Território** — Fases 7-11 (em andamento)

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

### 🚧 v2.1 Busca, Bairros & Território (Fases 7-11)

**Milestone Goal:** Elevar a qualidade de dados e a UX core, e dar ao corretor a primeira leva de ferramentas de captação — nomes de bairro corrigidos, malha mobile legível, busca campo-único inteligente, e Território (choropleth, painel de setor, farming, diff, Caixa).

**Sequência de dependência (da pesquisa v2.1):** Fase 7 (fundação de dados) desbloqueia tudo — nomes corretos + CNEFE + tuning da malha idle/highlight. Fase 8 (busca) é um refactor incremental isolado sobre a base já endurecida (03/07). Fase 9 (setor-scan + choropleth + painel) constrói a infraestrutura de agregação que a Fase 10 (detector + farming) e a Fase 11 (diff + Caixa) reusam.

- [ ] **Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha** — nomes de bairro reconciliados por spatial join com revisão humana; malha idle sussurra / highlight grita; CNEFE destilado pronto para a busca
- [ ] **Phase 8: Overhaul da Busca — Campo-Único Inteligente** — busca única com detecção de intenção, chip de confirmação, setor na frase, fuzzy corrigido sem perder recall, deep-link, autocomplete CNEFE — com acessibilidade re-auditada
- [ ] **Phase 9: Setor-Scan Compartilhado, Choropleth & Painel do Território** — infraestrutura de varredura de setor com orçamento de requisições; choropleth de R$/m² resolve o "emaranhado" da malha e é legível sobre satélite; painel do Meu Território
- [ ] **Phase 10: Detector de Lote Subutilizado & Farming/Caderno** — detector barato sobre o scan da Fase 9; Farming com IndexedDB + allowlist anti-PII
- [ ] **Phase 11: Diff de Cadastro & Cruzamento Caixa** — snapshot entre visitas e cruzamento com imóveis Caixa sobre o território salvo

## Phase Details

### Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha
**Goal**: Os nomes de bairro exibidos no app são confiáveis e as fundações de dados (CNEFE, tuning visual da malha) estão prontas para as fases seguintes construírem em cima.
**Depends on**: Nada (primeira fase do v2.1; parte da base v2.0 já shipped)
**Requirements**: NOMES-01, NOMES-02, NOMES-03, MALHA-01
**Success Criteria** (o que precisa ser verdade):
  1. Hover/toque/breadcrumb no mapa mostram nomes de bairro reconciliados contra a fonte autoritativa (layer 3 `nmbairro`/`cdbairro`), não mais o `nm_bai` cru da layer 2 (com seus erros/mojibake conhecidos)
  2. `bairros-goiania.json` regenerado tem geometria e contagem de features **byte-idênticas** ao dataset anterior — um diff estrutural confirma que só `properties.nm_bai` mudou (assert automatizado, não só teste visual); o drill (`fitBounds`/zoom) continua funcionando em todos os bairros, incluindo os que mudaram de nome
  3. Um relatório de diff (antes/depois, por polígono) foi gerado e passou por revisão humana nas bordas administrativas antes do commit; as 466 glebas sem nome recebem um rótulo genérico explícito ("Gleba não denominada"), não um nome fiscal forçado
  4. `sw.js` teve o cache version bumped (`radar-v5` → próxima) cobrindo o novo `bairros-goiania.json`, e qualquer dataset novo (CNEFE) está no array `LOCAL` com estratégia de cache decidida explicitamente
  5. No mobile, a malha ociosa é visualmente "sussurrada" (traço fino, baixa opacidade) e o destaque no toque "grita" (accent+nome, contraste reforçado vs. idle); a densidade de linhas responde ao zoom; o toque registra na ÁREA do bairro (fill), não só na linha fina
**Plans**: TBD
**Phase flags**: spot-check humano do diff de nomes nas bordas administrativas é item de verificação em aberto (quem faz, ver Open Decision #1 da pesquisa) — não bloqueia a fase, mas deve ser agendado antes do commit final.

### Phase 8: Overhaul da Busca — Campo-Único Inteligente
**Goal**: O corretor busca "de todos os jeitos possíveis" numa caixa única inteligente, sem perder nenhuma capacidade ou garantia de acessibilidade da busca atual (3 botões + link).
**Depends on**: Fase 7 (CNEFE alimenta o autocomplete de logradouro desta fase)
**Requirements**: BUSCA-01, BUSCA-02, BUSCA-03, BUSCA-04, BUSCA-05, BUSCA-06, BUSCA-07, BUSCA-08, BUSCA-09, BUSCA-10, BUSCA-11, BUSCA-12
**Success Criteria** (o que precisa ser verdade):
  1. As funções puras de matching/detecção têm um harness de teste (Node + fixtures) rodando **antes** de qualquer mudança visível de comportamento — inclui os casos ambíguos conhecidos (135 sozinho, "Rua 135", "Q135", inscrição 10 vs 14 dígitos)
  2. Digitar em qualquer formato ("marista quadra 128 lote 5", uma inscrição, um endereço, "135" sozinho) faz o app detectar a intenção certa e mostrar um chip de confirmação tocável **antes** de disparar a busca quando a confiança é baixa ou ambígua — nunca assume silenciosamente e só corrige depois do "nada encontrado"
  3. Setor embutido na frase funciona, e quando a frase não traz setor o app assume o último setor usado (lembrado), com forma clara de trocar
  4. Resultados fuzzy são ordenados por qualidade do match (número por igualdade de dígitos antes de substring; rua por fronteira de palavra) com selo "aproximado" no fallback — e o recall não piora: os casos históricos (lote "20/21", quadra "10E", apto "1901" vs "19") continuam encontrando o que encontravam antes
  5. Estados de erro/vazio oferecem o próximo passo em 1 toque; deep-link `?insc=` abre o imóvel direto no boot e existe botão "copiar link do imóvel"; autocomplete de logradouro usa o CNEFE destilado da Fase 7
  6. A checklist de acessibilidade da auditoria de 03/07 (ARIA combobox/activedescendant, `aria-pressed`, cards navegáveis por teclado, live regions, foco/trap) passa de novo sobre a busca nova — gate de aceite, não retrofit; `SEARCHTOKEN` é propagado em todo novo caminho assíncrono introduzido pelo detectMode/autocomplete; o quirk iOS (pointerdown + font-size 16px) é preservado e testado em iPhone real
  7. **Coordenação busca⇄ficha no desktop mapa-first não regride** (guarda das regressões corrigidas no hotfix `a7a4646`): a busca é sempre fechável (× visível no desktop + Esc); abrir qualquer ficha/seletor fecha o overlay de busca (zero sobreposição de cards em ≥821px); clicar num prédio (na busca OU no mapa) mostra o seletor de unidades sobre o mapa, nunca numa "coluna ao lado" inexistente — verificado ao vivo em 1280 e 375. Nenhum caminho de código pode voltar a assumir a coluna lateral pré-v2.0.
  8. **Auditoria de correção dos dados da ficha**: busca→ficha mostra a informação CORRETA em TODOS os modos (quadra/lote, endereço, prédio, inscrição 10 e 14 díg, e clique-no-mapa) — inscrição/edifício/apto/venal/áreas/bairro batem com o registro de origem; conferido contra o endpoint numa amostra por modo (não só um caso).
**Plans**: TBD
**Phase flags**: calibração da regex do `detectMode()` contra nomes reais é MEDIUM confidence (pesquisa) — validar com amostra real de buscas durante a fase, não só fixtures sintéticas. As regressões de desktop mapa-first (busca não fechava, cards sobrepostos, unidades de prédio invisíveis) já foram corrigidas no hotfix `a7a4646` (04-05/07); esta fase INCORPORA e protege esses fixes ao reconstruir a busca — não pode reintroduzi-los.

### Phase 9: Setor-Scan Compartilhado, Choropleth & Painel do Território
**Goal**: O corretor vê o "calor" de valor do território no mapa e um painel com as métricas do setor, sem gerar avalanche de requisições contra o endpoint frágil.
**Depends on**: Fase 7 (tuning idle/highlight da malha, base do choropleth)
**Requirements**: TERR-01, TERR-02, TERR-03
**Success Criteria** (o que precisa ser verdade):
  1. Existe uma função compartilhada de varredura de setor com cache de sessão, usada por todas as ferramentas de território (esta fase e as seguintes) — nenhuma ferramenta implementa sua própria varredura ad-hoc
  2. Abrir o painel/choropleth do maior setor cadastrado (Bueno, ~57k lotes) dispara no máximo 1-3 requisições paginadas (nunca uma consulta por quadra) — verificado contando requisições de rede ao vivo; existe zoom-gate (nenhuma consulta de território dispara antes do usuário estar no nível de zoom/seleção de setor explícito)
  3. O choropleth de R$/m² por quadra/lote (escala de quantis relativa ao setor) substitui a cor de preenchimento neutra da malha — não soma sobre ela — e resolve visualmente o "emaranhado" mobile (a hierarquia idle/highlight da Fase 7 permanece a base; a cor é a camada de dado por cima)
  4. O choropleth permanece legível tanto sobre o basemap CARTO quanto sobre o satélite Esri (contraste AA verificado nos dois fundos); a troca de camada de dado usa `setStyle()` sobre polígonos existentes (não recria a geometria) e respeita `prefers-reduced-motion`
  5. O Painel do Meu Território mostra mediana + Q1–Q3 de R$/m², IPTU mediano, idade do cadastro e mix de uso do setor selecionado, alimentado pela mesma varredura compartilhada
**Plans**: TBD
**Phase flags**: orçamento real do heatmap em setor grande no 4G é item de verificação de campo em aberto (extrapolado, não medido ao vivo); legibilidade do choropleth sobre satélite em luz externa é não-bloqueante mas deve ser registrada como pendência de UAT, igual ao herdado do v2.0.
**UI hint**: yes

### Phase 10: Detector de Lote Subutilizado & Farming/Caderno
**Goal**: O corretor identifica oportunidades de lote subutilizado no setor e mantém um caderno de território com notas/status que persiste entre sessões, sem risco de vazamento de dado pessoal.
**Depends on**: Fase 9 (reusa o setor-scan compartilhado)
**Requirements**: TERR-04, TERR-05
**Success Criteria** (o que precisa ser verdade):
  1. O detector de lote subutilizado (razão construído/terreno baixa em quadra de venal alto) roda como filtro sobre os dados já trazidos pelo scan da Fase 9 — não dispara requisições adicionais próprias
  2. O corretor pode salvar setor/lotes, tags, notas e status no Caderno de Território, e esses dados persistem entre sessões (reabrir o app dias depois mostra o mesmo caderno)
  3. A persistência usa IndexedDB (nunca localStorage) para os snapshots de lotes, com fallback visível ao usuário se a escrita falhar (nunca falha silenciosa)
  4. Uma função `sanitizeAttrs()`/allowlist central impede que qualquer campo fora da lista explícita — e nunca `dtnascimen` — chegue ao IndexedDB; inspecionar o IndexedDB no DevTools após usar o Farming confirma ausência de dado pessoal
**Plans**: TBD

### Phase 11: Diff de Cadastro & Cruzamento Caixa
**Goal**: O corretor vê o que mudou no cadastro de um lote desde a última visita e onde os imóveis Caixa se cruzam com o território que já salvou.
**Depends on**: Fase 9 (setor-scan), Fase 10 (território salvo/IndexedDB)
**Requirements**: TERR-06, TERR-07
**Success Criteria** (o que precisa ser verdade):
  1. Revisitar um lote já salvo no Caderno mostra o que mudou no cadastro desde o snapshot anterior (diff enxuto, nunca dado pessoal) — o snapshot usa a mesma allowlist/`sanitizeAttrs()` da Fase 10
  2. Os imóveis Caixa já plotados no mapa são cruzados com o território salvo do corretor, destacando quando um imóvel Caixa cai dentro de um setor/lote que o corretor já farmou
**Plans**: TBD

## Progress

**Execution Order:**
Fases executam em ordem numérica: 7 → 8 → 9 → 10 → 11

| Fase | Milestone | Planos | Status | Concluída |
|------|-----------|--------|--------|-----------|
| 1. Dataset de Bairros + Docs | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 2. Home = Mapa | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 3. Render de Bairro + Drill | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 4. Camada de Satélite | v2.0 | 2/2 | ✅ Complete | 2026-07-04 |
| 5. Seam de IA (dormant) | v2.0 | 1/1 | ✅ Complete | 2026-07-04 |
| 6. Motion no App Todo | v2.0 | 3/3 | ✅ Complete | 2026-07-05 |
| 7. Fundação de Dados (Nomes/CNEFE/Malha) | v2.1 | 0/TBD | Not started | - |
| 8. Overhaul da Busca | v2.1 | 0/TBD | Not started | - |
| 9. Setor-Scan + Choropleth + Painel | v2.1 | 0/TBD | Not started | - |
| 10. Detector + Farming/Caderno | v2.1 | 0/TBD | Not started | - |
| 11. Diff de Cadastro + Caixa | v2.1 | 0/TBD | Not started | - |

**v2.0: 6/6 fases, 12/12 planos, 14/14 requisitos — 100% (shipped).**
**v2.1: 0/5 fases, 0/23 requisitos — em andamento.**

Próximo passo: `/gsd-plan-phase 7`.
