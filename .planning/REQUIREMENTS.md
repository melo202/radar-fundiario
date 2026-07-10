# Requirements: Radar Fundiário Goiânia

**Defined:** 2026-07-05
**Milestone:** v2.1 — Cockpit Comercial (Busca única · Ficha comercial · Ação/WhatsApp · Documentos · Território)
**Core Value:** O corretor entende o imóvel em segundos e sai com uma **ação comercial pronta** — dado oficial + análise auditável e **determinística**, sem servidor.

> Origem: `Plano_UX_Radar_Fundiario_v3` (auditoria de UX). Decisões de escopo (2026-07-05):
> (1) **Cockpit primeiro**, Território depois; (2) **refinar** a identidade cartográfica atual (respiro + cor só p/ status), não migrar p/ base branca; (3) **só client-side** — scores determinísticos, histórico/favoritos/oportunidades em `localStorage`, WhatsApp por texto. Hub/CRM/contas/IA-autônoma/clientes-compatíveis ficam p/ um milestone futuro com backend.
> Núcleo permanece **100% determinístico** ([[sem-ia-no-radar]]): scores e "leitura prática" são por REGRA, nunca por LLM.

## Milestone v2.1 Requirements

### Nomes de bairro (qualidade de dados) — ✅ entregue (Fase 7)

- [x] **NOMES-01**: Nomes de bairro (hover/tap/breadcrumb) reconciliados com a fonte autoritativa (layer 3 `nmbairro`/`cdbairro`) via spatial join (POST), corrigindo erros/mojibake do `nm_bai` da layer 2
- [x] **NOMES-02**: `bairros-goiania.json` regenerado com **geometria + contagem byte-idênticas** (só nome muda), com bump de cache do `sw.js`
- [x] **NOMES-03**: Build emite relatório de diff (antes/depois) p/ revisão humana; glebas sem nome recebem rótulo genérico
- [x] **NOMES-04**: Nome de exibição amigável (`nm_disp`): prefixo por extenso (VI→Vila, RES→Residencial…) + acento recuperado do nome cru; oficial preservado p/ matching

### Busca (campo-único inteligente)

- [ ] **BUSCA-01**: Funções puras de matching/detecção com harness de teste (Node + fixtures) **antes** de qualquer mudança de comportamento
- [ ] **BUSCA-02**: Caixa única `detectMode(texto)` detecta intenção (inscrição 14/10 díg · quadra+lote · endereço · prédio · setor) e dispara a busca certa
- [ ] **BUSCA-03**: Chip de confirmação mostra o que foi entendido, tocável p/ corrigir (antes de disparar quando a confiança é baixa)
- [ ] **BUSCA-04**: Setor embutido na frase ("marista quadra 128 lote 5")
- [ ] **BUSCA-05**: Lembra o último setor usado e o assume quando a frase não traz setor
- [ ] **BUSCA-06**: Desambiguação por chips na entrada ambígua ("135" = rua/quadra/inscrição)
- [ ] **BUSCA-07**: Fuzzy corrigido — número por igualdade de dígitos antes de substring; rua por fronteira de palavra; ordenado por qualidade, selo "aproximado" no fallback (sem perder recall)
- [ ] **BUSCA-08**: Estados de erro/vazio oferecem o próximo passo em 1 toque; placeholder com **exemplos tocáveis** (não texto explicativo longo)
- [ ] **BUSCA-09**: Deep-link `?insc=` abre o imóvel no boot + botão "copiar link do imóvel"
- [ ] **BUSCA-10**: Autocomplete de logradouro por dataset CNEFE destilado (~9,8k ruas, versionado offline)
- [ ] **BUSCA-11**: Acessibilidade preservada — todo widget novo re-passa o checklist ARIA/teclado/iOS/`SEARCHTOKEN` da auditoria de 03/07 (gate de aceite)
- [ ] **BUSCA-12**: Coordenação busca⇄ficha no desktop mapa-first não regride (guarda do hotfix `a7a4646`) + auditoria de correção dos dados da ficha em TODOS os modos contra o registro de origem
- [ ] **BUSCA-13**: A caixa única aceita **coordenada ou link do Google Maps** colado (extrai lat/lon e cai no lote)
- [ ] **BUSCA-14**: Busca por **voz** no mobile (Web Speech API; degrada silenciosamente onde não houver suporte) — P1

### Ficha do imóvel = conclusão comercial (§6, §9, §17 do plano)

- [ ] **FICHA-01**: A ficha reordena p/ conclusão-primeiro: identificação+localização → **faixa de valor em destaque** → score de oportunidade → score de confiança → leitura prática → ações → comparáveis+mapa → **dados técnicos em accordion** → metodologia/fontes no fim
- [ ] **SCORE-01**: **Score de oportunidade** (0–100) determinístico e explicável, derivado da posição vs mediana da vizinhança / faixa estimada (mostra o "porquê", não só o número)
- [ ] **SCORE-02**: **Score de confiança** (alta/média/baixa) determinístico pela completude dos dados (área, nº de comparáveis, imóvel atípico), com frase de "por quê"; o app **admite incerteza** — nada de falsa precisão
- [ ] **LEIT-01**: **Leitura prática** em linguagem comercial (regra/template determinístico) — "alinhado à região, boa liquidez se área e conservação confirmarem", nunca jargão cru (mediana/percentil) na 1ª camada
- [ ] **CMP-01**: Comparáveis com **conclusão primeiro** ("este imóvel está 8% abaixo da mediana da vizinhança"), estatística (mediana/Q1–Q3) recolhida em "ver metodologia"; cada comparação termina com ação (usar no relatório, copiar argumento, ver no mapa)

### Camada de ação + WhatsApp + Captação (§11, §12, §13, §16)

- [ ] **ACAO-01**: **Toda tela de resultado termina com uma ação útil** — aplica a "lei da tela": 1 ação principal em destaque, até 2 secundárias, resto em "Mais opções"
- [ ] **ZAP-01**: Botões de **copiar p/ WhatsApp** em pt-BR impecável (soa como corretor, não robô): resumo, mensagem p/ proprietário, mensagem p/ comprador, argumento de preço, riscos/ressalvas
- [ ] **SALV-01**: **Salvar oportunidade** + **histórico** de últimas consultas + **favoritos** em `localStorage` (allowlist de campos, sem PII de terceiros); reabrir o app mostra o mesmo
- [ ] **CAPT-01**: **Modo captação** — a partir de um imóvel gera abordagem ao proprietário, script de ligação, checklist documental e tarefa de follow-up (tudo texto pronto p/ copiar)

### Documentos em 3 níveis (§10, §31)

- [ ] **DOC-01**: Três saídas nomeadas corretamente — **Ficha rápida** (WhatsApp/apresentação), **Relatório de avaliação** (comercial, 10+ comparáveis), **Laudo/PTAM** (formal); a UI pergunta a **finalidade** primeiro e **recomenda** o documento adequado (reduz peso jurídico indevido)
- [ ] **DOC-02**: Antes de gerar, um **painel de confiança + pendências** (área, conservação, documentação, nº de comparáveis) aparece; linguagem de responsabilidade ("faixa estimada", "recomenda-se confirmar")
- [ ] **DOC-03**: **Revisão/edição antes do PDF final** (dados sensíveis e textos principais editáveis); reusa o wizard atual, não recomeça do zero

### Documentos da negociação — minutas do negócio (extensão do plano)

> Papelada real do corretor. Templates DETERMINÍSTICOS preenchidos com o imóvel (cadastro) + partes/valores digitados → minuta EDITÁVEL → PDF pt-BR com ressalvas. Reusa a infra de documento da Fase 11. Sempre "minuta" (nunca promete validade automática; registro em cartório/RGI é do usuário).

- [ ] **NEG-01**: Gerar **Proposta de Compra e Venda** (intenção de compra) — pré-preenchida com o imóvel + partes/valor/condições/prazo de validade; minuta editável → PDF
- [ ] **NEG-02**: Gerar **Termo de Autorização/Exclusividade de Venda** (proprietário ↔ corretor) — imóvel + proprietário + corretor (CRECI) + prazo + % de comissão; liga ao Modo Captação (NEG ← CAPT-01); minuta editável → PDF
- [ ] **NEG-03**: Gerar **Contrato de Compra e Venda** (minuta) — vendedor/comprador, descrição do imóvel + matrícula/RGI, preço/forma de pagamento, cláusulas padrão; disclaimer forte (revisão jurídica + registro em cartório); minuta editável → PDF
- [ ] **NEG-04** (opcional/best-effort): **OCR da escritura/matrícula** client-side (Tesseract.js WASM — determinístico, NÃO LLM) para pré-preencher matrícula/partes/descrição do contrato; o corretor SEMPRE revisa/corrige; fallback = digitar/colar texto; degrada silenciosamente onde o OCR não estiver disponível

### Prédio como objeto comercial (§7)

- [ ] **PRED-01**: **Resumo do prédio** antes da lista — nº de unidades, área média, venal médio, valor estimado médio e **faixa** do edifício, com ações (ver unidades, gerar análise do prédio)
- [ ] **PRED-02**: Ordenação (maior oportunidade / menor valor / maior área) e filtros (ocultar garagem/box, aptos prováveis, buscar unidade), com marcar unidades p/ comparação

### Direção visual, pinos, motion & descoberta progressiva (§8, §14, §15, §19, §28, §29, §30)

- [ ] **VIS-01**: **Refino visual clean** mantendo a identidade cartográfica — mais respiro entre blocos, menos textura/borda/caixa, hierarquia por tamanho/contraste/espaço; **cor reservada a status** (verde=oportunidade, amarelo=atenção, vermelho=risco), sem óxido parecendo alerta constante
- [ ] **PIN-01**: **Pinos semânticos** no mapa — verde (oportunidade/abaixo da média), amarelo (dados incompletos/incerto), vermelho (risco/acima da média), dourado (Caixa), cinza (sem dados); clicar abre painel com valor+score+próximas ações
- [ ] **MOT-01**: **Motion de busca em etapas** (Localizando → Consultando cadastro → Calculando estimativa → Buscando comparáveis → Preparando mapa) + **skeleton** em listas/cards — performance percebida, não spinner genérico (respeita `prefers-reduced-motion`)
- [ ] **DESC-01**: **Descoberta progressiva** — tela inicial mostra a promessa + busca única + 3 benefícios (avaliar / achar oportunidade / gerar ficha); funções aparecem conforme o resultado; onboarding ≤3 telas; área discreta "O que o Radar faz"

### Linguagem — português impecável (§2, §26) — gate de release

- [x] **LING-01**: Passar **toda a microcopy** (botões, placeholders, erros, tooltips, títulos, PDFs, mensagens de WhatsApp) pelo checklist §26 — acentuação correta, verbo de ação nos botões, erro que oferece saída, zero jargão na 1ª camada, sem caixa alta em bloco longo, sem ironia/gíria; consistência de nomenclatura (não alternar "Oportunidades/Favoritos/Salvos" sem motivo)

### Território / captação de área (rebaixado — após o cockpit)

- [x] **TERR-01**: Função compartilhada de varredura de setor com cache de sessão e **orçamento de requisições** (respeita o endpoint frágil; base de todas as ferramentas de território)
- [x] **TERR-02**: Choropleth de R$/m² venal por quadra/lote (quantis relativos ao setor) — camada de "calor de valor" legível também sobre o satélite
- [x] **TERR-03**: Painel do Meu Território (mediana + Q1–Q3 de R$/m², IPTU mediano, idade do cadastro, mix de uso por setor)
- [x] **TERR-04**: Detector de lote subutilizado (razão construído/terreno baixa em quadra de venal alto) sobre o scan compartilhado
- [x] **TERR-05**: Farming/Caderno de território em **IndexedDB** — salvar setor/lotes, tags, notas, status (allowlist anti-PII, nunca `dtnascimen`)
- [x] **TERR-06**: Diff de cadastro entre visitas (snapshot enxuto por lote; nunca dado pessoal)
- [x] **TERR-07**: Cruzamento dos imóveis Caixa (já plotados) com o território salvo do corretor

### Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022)

> Evidência: `.planning/research/v2.1/PLANO-DIRETOR.md` — o ArcGIS da prefeitura expõe o Modelo Espacial da LC 349/2022 (`Mapa_ModeloEspacial`, 49 camadas, query por ponto verificada ao vivo). Dado oficial determinístico; NÃO é IA.

- [ ] **PD-01**: Consulta urbanística por lote via point-in-polygon nas camadas do Modelo Espacial (macrozoneamento, área adensável, AEIS, vazios, eixos) — mesmo padrão `jsonp`/token/retry; consultas agrupadas/lazy (endpoint frágil)
- [ ] **PD-02**: Tabela estática zona→regras (CA básico/máximo, outorga/Vi, usos) com TODO número conferido contra o Anexo oficial da LC 349/2022 (resolver a divergência 6x vs 7,5x da Área Adensável na fonte primária; checar LC 358/363/364/371/373/379); número não-conferido NUNCA é exibido (mostra só a zona)
- [ ] **PD-03**: Seção "Urbanístico" na ficha (accordion): zona/unidade, CA, usos, eixo/adensamento + disclaimer fixo ("indicativo — oficial é a Certidão de Uso do Solo/SEPLANH")
- [ ] **PD-04**: Score de oportunidade ganha fator potencial-construtivo (construído ÷ potencial do PD) e o detector de subutilizado passa a usar construído/potencial-do-PD — ambos explicáveis citando a zona
- [ ] **PD-05**: Camada de zonas como toggle no Território (choropleth por zona), legível sobre CARTO e satélite

## Future Requirements (v2.2+ — precisa de backend/IA)

- **HUB-01+**: Hub/CRM — clientes compatíveis, pipeline, banco de imóveis na conta, campanhas por imóvel, alertas automáticos, radar de demanda reprimida, favoritos-na-conta (§12 Modo Hub, §22, P2 do §23)
- **SCORE-03+**: Scores de **liquidez** e **captação** (dependem de dado de demanda/mercado que hoje não é confiável client-side)
- **IA-02**: Ativar pesquisa de mercado por IA sobre o seam dormant (proxy Worker ou BYO-key; opt-in, rotulada "não é dado oficial")
- **SAT-03**: Ortofoto própria de Goiânia (`Mapa_Ortofoto2016v2`, EPSG:31982)

## Out of Scope (deste milestone)

| Feature | Reason |
|---------|--------|
| Hub/CRM, contas, clientes compatíveis, campanhas, alertas | Precisa de backend/contas — decisão: só client-side agora |
| IA gerando scores/leitura prática | Núcleo é determinístico ([[sem-ia-no-radar]]); scores/leitura por regra |
| Migração p/ base visual branca/minimalista | Decisão: **refinar** a identidade cartográfica atual, não rebrand |
| Rewrite total da busca (greenfield) | Refactor estrito sobre a base de 3 botões; rewrite regride a11y |
| Join de nomes por string | Match por string falha 99,5%; só spatial join (já entregue) |
| Alterar geometria dos polígonos no fix de nomes | Display-data-only; geometria byte-idêntica (já garantido) |
| Heatmap com 1 stats-query por quadra | 502; agregar em 1–3 páginas + zoom-gate |
| localStorage p/ farming/diff | Quota/síncrono; IndexedDB obrigatório (histórico/favoritos leves ficam em localStorage) |
| Coleta de dado pessoal de terceiros | LGPD — anotação do próprio corretor, allowlist de campos |

## Traceability

| Requirement | Fase | Status |
|-------------|------|--------|
| NOMES-01/02/03/04 | 7 | ✅ Done |
| MALHA-01 | 7 | Pending (07-03) |
| BUSCA-01..14 | 8 | Pending |
| FICHA-01, SCORE-01/02, LEIT-01, CMP-01 | 9 | Pending |
| ACAO-01, ZAP-01, SALV-01, CAPT-01 | 10 | Pending |
| DOC-01/02/03 | 11 | Pending |
| NEG-01/02/03/04 | 11.1 | Pending |
| PRED-01/02 | 12 | Pending |
| VIS-01, PIN-01, MOT-01, DESC-01 | 13 | Pending |
| LING-01 | 14 | Complete |
| TERR-01/02/03 | 15 | Pending |
| TERR-04/05 | 16 | Pending |
| TERR-06/07 | 17 | Pending |
| PD-01/02/03/04/05 | 18 | Pending |

**Coverage:**
- Fase 7 (Fundação de Dados): NOMES-01/02/03/04 ✅, MALHA-01 (07-03 pendente)
- Fase 8 (Busca única): BUSCA-01..14
- Fase 9 (Ficha comercial + scores): FICHA-01, SCORE-01/02, LEIT-01, CMP-01
- Fase 10 (Ação + WhatsApp + salvos + captação): ACAO-01, ZAP-01, SALV-01, CAPT-01
- Fase 11 (Documentos em 3 níveis): DOC-01/02/03
- Fase 11.1 (Documentos da negociação): NEG-01/02/03 + NEG-04 (OCR opcional)
- Fase 12 (Prédio comercial): PRED-01/02
- Fase 13 (Visual + pinos + motion + descoberta): VIS-01, PIN-01, MOT-01, DESC-01
- Fase 14 (Linguagem impecável): LING-01
- Fases 15–17 (Território): TERR-01..07
- Fase 18 (Inteligência Urbanística PD 2022): PD-01..05
- Órfãos: nenhum

---
*Requirements definidos: 2026-07-05 · Re-escopo Cockpit Comercial (Plano UX v3): 2026-07-05*
