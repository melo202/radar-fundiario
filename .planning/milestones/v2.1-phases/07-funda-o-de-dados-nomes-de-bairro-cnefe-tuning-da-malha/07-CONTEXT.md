# Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Três entregas de fundação que desbloqueiam o resto do v2.1: (1) corrigir os nomes de bairro exibidos (reconciliação por spatial join contra a fonte autoritativa) regenerando o `bairros-goiania.json`; (2) destilar o dataset CNEFE de logradouros de Goiânia (nomes + CEP/localidade) como asset offline para o autocomplete da busca (Fase 8 consome); (3) tunar a UX da malha de bairros no mobile (idle sussurra / toque grita / densidade por zoom / toque na área). Cobre NOMES-01/02/03 e MALHA-01. NÃO inclui a busca (Fase 8) nem o choropleth/território (Fase 9).
</domain>

<decisions>
## Implementation Decisions

### Reconciliação de nomes (NOMES-01/02/03)
- Fonte **autoritativa = layer 3 `nmbairro`/`cdbairro`** (709 setores, zero brancos). O `nm_bai` da layer 2 tem erros + mojibake (`Petr�polis`) e match por string falha 99,5% — NÃO usar string match.
- Método: **spatial join via POST** (`esriSpatialRelIntersects`) — GET com geometria de polígono dá 404/414 nesse servidor (quirk verificado). Para cada polígono da layer 2, achar o(s) setor(es) cadastrais que ele intersecta.
- **Multi-candidato** (>50% dos polígonos cruzam 2+ setores): tie-break **assistido por nome** (não maioria-por-contagem pura — contra-exemplo "Ofugi" prova que maioria erra); documentar a regra.
- **Revisão (decisão do usuário):** aplicar os nomes reconciliados + **gerar relatório de diff completo (antes→depois por polígono)**; o orquestrador confere uma amostra + os casos multi-candidato e apresenta o resumo. Revisão humana das bordas é item de acompanhamento (não bloqueia).
- Regenerar `bairros-goiania.json` com **geometria e contagem de features BYTE-IDÊNTICAS** — só `properties` de nome muda. **Assert de diff estrutural** (geometria/contagem inalteradas) obrigatório. Glebas sem nome → rótulo genérico "Gleba não denominada".
- `sw.js`: bump de cache (`radar-v5` → próxima) cobrindo o json regenerado.
- Confirmar (verificado na pesquisa): o drill (`fitBounds`/`getBounds`) NÃO usa o nome → mudança cosmética, não quebra drill.

### CNEFE (decisão do usuário: nomes + CEP/localidade, ~117KB gz)
- Baixar o `52_GO.zip` do CNEFE 2022 (~120MB, estado inteiro — não há por-município), filtrar Goiânia (~777k endereços), destilar em **~9,8k logradouros únicos com dicas de CEP/localidade** → asset `logradouros-goiania.json` (~117KB gz). Build-time only (custo raro de refresh).
- Normalização: strip de espaço antes do sufixo alfanumérico final (a divergência CNEFE×cadastro é drift de tokenização, ~36-40% match cru). O matcher fino do autocomplete é da Fase 8; aqui só produzir o asset limpo.
- `sw.js`: adicionar o asset ao `LOCAL`/precache com estratégia de cache decidida.

### Tuning da malha mobile (MALHA-01 — receita confirmada)
- Malha **ociosa de-enfatizada**: traço fino, baixa opacidade (contexto que "sussurra"). Ajustar `BAI_STYLE`/`BAI_HOVER` (constantes já resolvidas p/ hex na Fase 3).
- **Destaque no toque "grita"**: reforçar o contraste do highlight (accent) vs idle + o rótulo do nome (agora correto, pós-reconciliação).
- **Densidade por zoom**: peso/opacidade dos contornos sobem conforme aproxima (calmo na cidade, detalhado perto).
- **Toque na ÁREA** do bairro (fill já é clicável), não só na linha fina — garantir explícito no mobile.

### Claude's Discretion
- Valores exatos de opacidade/peso idle vs highlight e os limiares de zoom da densidade (afinar no preview); estrutura exata do `logradouros-goiania.json`; a linguagem exata do tie-break de nome no build.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gerar-bairros.py` (v2.0): o build script a EVOLUIR — adicionar a query POST à layer 3 + spatial join + emissão do relatório de diff, mantendo a geometria intacta.
- `radar-goiania.html`: `BAI_STYLE`/`BAI_HOVER`/`baiStyle()` (Fase 3, hex resolvido), `highlightBairro()`/`clearBaiHi()`, o zoom-gate de bairros; o proj4/`toWGS()` (reuso, nunca re-derivar).
- `sw.js` = `radar-v5` (bumpar); array `LOCAL` de precache.
- `check-bairros-geojson.py` (v2.0): estender p/ o assert de diff estrutural (geometria/contagem byte-idênticas vs o json anterior).
- Precedente `atualizar-caixa.py` (Python de build com backoff) para o download/distill do CNEFE.

### Established Patterns
- Endpoint frágil (502 sob carga) — o spatial join é build-time offline, pode ser paciente/paginado.
- Datasets versionados como `.json` no repo; sw.js precache + bump.

### Integration Points
- `bairros-goiania.json` (nomes corrigidos) → consumido pela home (já renderiza) e pelo breadcrumb.
- `logradouros-goiania.json` (novo) → consumido pela busca na Fase 8 (autocomplete).
- `BAI_STYLE`/`baiStyle()` → o choropleth da Fase 9 vai estender esse mesmo hook.

### NÃO fazer nesta fase
- Busca campo-único (Fase 8). Choropleth/setor-scan/território (Fase 9+). Não alterar geometria dos polígonos. Não embutir chave/segredo.
</code_context>

<specifics>
## Specific Ideas

- Geometria byte-idêntica é regra dura (assert automatizado) — o fix de nomes é display-data-only.
- CNEFE: build-time only; documentar o custo de refresh (raro).
- Verificação no preview: nomes corrigidos aparecem no hover/toque; malha idle discreta + destaque forte; toque na área funciona.
</specifics>

<deferred>
## Deferred Ideas

- Autocomplete de logradouro em si (usa o asset CNEFE) → Fase 8.
- Choropleth / heatmap R$/m² (evolui a malha) → Fase 9.
- Matcher fino CNEFE×cadastro (normalização de tokenização) → Fase 8.
</deferred>
