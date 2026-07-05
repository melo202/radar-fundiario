# Requirements: Radar Fundiário Goiânia

**Defined:** 2026-07-05
**Milestone:** v2.1 — Busca, Bairros & Território
**Core Value:** O corretor acha o imóvel certo em segundos e enxerga o território no mapa — dado oficial + análise auditável, sem servidor.

## Milestone v2.1 Requirements

### Nomes de bairro (qualidade de dados)

- [ ] **NOMES-01**: Os nomes de bairro exibidos (hover/tap/breadcrumb) são reconciliados com a fonte autoritativa (layer 3 `nmbairro`/`cdbairro`) via spatial join (POST), corrigindo os erros/mojibake do `nm_bai` da layer 2
- [ ] **NOMES-02**: `bairros-goiania.json` regenerado com nomes corretos e **geometria + contagem de features byte-idênticas** (só o campo de nome muda), com bump da versão de cache do `sw.js`
- [ ] **NOMES-03**: O build emite um relatório de diff (antes/depois) para revisão humana das bordas antes de commitar; glebas sem nome recebem rótulo genérico

### Busca (campo-único inteligente)

- [ ] **BUSCA-01**: Funções puras de matching/detecção extraídas e cobertas por um harness de teste (Node + fixtures) **antes** de qualquer mudança de comportamento
- [ ] **BUSCA-02**: Caixa única com `detectMode(texto)` detecta a intenção (inscrição 14/10 díg · quadra+lote · endereço · prédio · setor) e dispara a busca correta
- [ ] **BUSCA-03**: Chip de confirmação mostra o que foi entendido, tocável para corrigir
- [ ] **BUSCA-04**: Setor embutido na própria frase ("marista quadra 128 lote 5")
- [ ] **BUSCA-05**: App lembra o último setor usado e o assume quando a frase não traz setor
- [ ] **BUSCA-06**: Desambiguação por chips quando a entrada é ambígua (ex.: "135" = rua/quadra/inscrição)
- [ ] **BUSCA-07**: Fuzzy corrigido — número por igualdade de dígitos antes de substring; rua por fronteira de palavra; resultados ordenados por qualidade do match, com selo "aproximado" no fallback (sem perder recall)
- [ ] **BUSCA-08**: Estados de erro/vazio oferecem o próximo passo em 1 toque; placeholder com exemplos tocáveis
- [ ] **BUSCA-09**: Deep-link `?insc=` abre o imóvel direto no boot + botão "copiar link do imóvel"
- [ ] **BUSCA-10**: Autocomplete de logradouro alimentado por um dataset CNEFE destilado (~9,8k ruas de Goiânia, ~39KB gz), versionado offline
- [ ] **BUSCA-11**: Acessibilidade preservada — todo widget novo re-passa o checklist ARIA/teclado/iOS/`SEARCHTOKEN` da auditoria de 03/07 (gate de aceite, não retrofit)
- [ ] **BUSCA-12**: Coordenação busca⇄ficha no desktop mapa-first não regride (guarda do hotfix `a7a4646`): busca sempre fechável (× + Esc); abrir ficha/seletor fecha o overlay (zero sobreposição de cards ≥821px); clicar prédio (busca ou mapa) mostra o seletor de unidades sobre o mapa. + Auditoria de correção dos dados da ficha em TODOS os modos (ql/endereço/prédio/inscrição 10-14 díg/clique-no-mapa) contra o registro de origem

### Malha de bairros (UX mobile)

- [ ] **MALHA-01**: Malha ociosa de-enfatizada (traço fino/baixa opacidade) + destaque forte no toque + densidade por zoom + toque na área (não na linha fina) — resolve o "emaranhado" no celular sem remover a malha

### Território / captação

- [ ] **TERR-01**: Função compartilhada de varredura de setor com cache de sessão e **orçamento de requisições** que respeita o endpoint frágil (base de todas as ferramentas de território)
- [ ] **TERR-02**: Choropleth de R$/m² venal por quadra/lote (escala de quantis relativa ao setor) — entrega a camada de "calor de valor" E compõe com o satélite (legibilidade tratada)
- [ ] **TERR-03**: Painel do Meu Território (mediana + Q1–Q3 de R$/m², IPTU mediano, idade do cadastro, mix de uso por setor)
- [ ] **TERR-04**: Detector de lote subutilizado (razão construído/terreno baixa em quadra de venal alto)
- [ ] **TERR-05**: Farming/Caderno de território — salvar setor/lotes, tags, notas e status em IndexedDB (anotação do próprio corretor; allowlist de campos anti-PII, nunca `dtnascimen`)
- [ ] **TERR-06**: Diff de cadastro entre visitas (snapshot enxuto por lote em IndexedDB; nunca dado pessoal)
- [ ] **TERR-07**: Cruzamento dos imóveis Caixa (já plotados) com o território salvo do corretor

## Future Requirements (v2.2+)

- **IA-02**: Ativar a pesquisa de mercado por IA sobre o seam dormant (proxy Cloudflare Worker ou BYO-key; `glm-4.5-air:online`/`qwen3-14b`; opt-in, rotulada "não é dado oficial")
- **SAT-03**: Ortofoto própria de Goiânia (`Mapa_Ortofoto2016v2`, EPSG:31982, CRS custom no Leaflet)
- **TERR-08+**: Marketing/compartilhamento (ficha-imagem, QR, one-pager PDF), fechamento/custos (ITBI/escritura/SFH), locação/investidor (yield, cap rate, SAC×Price) — famílias de ferramentas das outras lentes do IDEIAS-hub-corretor

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewrite total da busca (greenfield) | É refactor estrito sobre a base de 3 botões já endurecida; rewrite regride a11y/token |
| Join automático de nomes por string | Match por string falha 99,5% (medido); só spatial join + revisão humana |
| Alterar geometria dos polígonos de bairro no fix de nomes | Fix é display-data-only; geometria/contagem byte-idênticas (não quebrar o drill) |
| Heatmap com 1 stats-query por quadra | Centenas de requisições → 502; agregar em 1–3 páginas + zoom-gate |
| localStorage para farming/diff | Quota/síncrono inadequado; IndexedDB obrigatório |
| Ativação de IA / ortofoto própria | Deferido p/ v2.2 |
| Coleta de dado pessoal de terceiros | LGPD — farming é anotação do próprio corretor, allowlist de campos |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NOMES-01 | Fase 7 | Pending |
| NOMES-02 | Fase 7 | Pending |
| NOMES-03 | Fase 7 | Pending |
| MALHA-01 | Fase 7 | Pending |
| BUSCA-01 | Fase 8 | Pending |
| BUSCA-02 | Fase 8 | Pending |
| BUSCA-03 | Fase 8 | Pending |
| BUSCA-04 | Fase 8 | Pending |
| BUSCA-05 | Fase 8 | Pending |
| BUSCA-06 | Fase 8 | Pending |
| BUSCA-07 | Fase 8 | Pending |
| BUSCA-08 | Fase 8 | Pending |
| BUSCA-09 | Fase 8 | Pending |
| BUSCA-10 | Fase 8 | Pending |
| BUSCA-11 | Fase 8 | Pending |
| BUSCA-12 | Fase 8 | Pending |
| TERR-01 | Fase 9 | Pending |
| TERR-02 | Fase 9 | Pending |
| TERR-03 | Fase 9 | Pending |
| TERR-04 | Fase 10 | Pending |
| TERR-05 | Fase 10 | Pending |
| TERR-06 | Fase 11 | Pending |
| TERR-07 | Fase 11 | Pending |

**Coverage:**
- Requisitos v2.1: 23 total
- Mapeados para fases: 23/23 (100%) ✓
- Fase 7 (Fundação de Dados): 4 requisitos — NOMES-01/02/03, MALHA-01
- Fase 8 (Busca): 12 requisitos — BUSCA-01..12
- Fase 9 (Setor-Scan + Choropleth + Painel): 3 requisitos — TERR-01/02/03
- Fase 10 (Detector + Farming): 2 requisitos — TERR-04/05
- Fase 11 (Diff + Caixa): 2 requisitos — TERR-06/07
- Órfãos: nenhum

---
*Requirements defined: 2026-07-05*
*Traceability preenchida: 2026-07-05 (roadmap v2.1, Fases 7-11)*
