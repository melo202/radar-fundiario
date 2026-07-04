# Phase 1: Dataset Estático de Bairros + Correção de Docs - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning
**Mode:** Auto-generated (fase de fundação/tooling — discuss de grey-areas dispensado; critérios de sucesso são todos técnicos)

<domain>
## Phase Boundary

Entregar (a) um GeoJSON estático de polígonos de bairro, pré-simplificado e convertido para WGS84, versionado no repo e gerado por um script offline; e (b) a correção documental sobre o comportamento real do endpoint (`returnGeometry=true` funciona). Esta fase NÃO mexe na UI/home — só cria o insumo de dados e corrige docs. Renderizar os bairros é a Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Fonte e geração do dataset
- O dataset vem da **layer 2 (Divisas de Bairro)** do ArcGIS `Feature_Base/MapServer`, OU do GeoJSON de bairros publicado pela Prefeitura no CKAN (ambos em EPSG:31982). Preferir o que der cobertura completa e estável.
- Geração por **script offline** (não em runtime). Linguagem: seguir o que o repo já usa para tooling — há `atualizar-caixa.py` (Python) como precedente; um script Python é o caminho natural, mas Node também é aceitável se preferir zero-dependência do ecossistema já presente. **Claude decide** com base na menor fricção.
- Reprojeção EPSG:31982 → WGS84 no script deve usar a **mesma definição proj4 do app** (UTM zona 22 South) — nunca re-derivar. Validar contra uma forma de bairro **irregular** (não simétrica) para pegar troca de eixo/ordem `[lon,lat]`.
- Pré-simplificar a geometria (ex.: Douglas-Peucker / mapshaper) para manter o asset leve (alvo: caber no orçamento de um app single-file + PWA), preservando fidelidade visual em zoom de cidade.

### Validação (critério de aceite embutido)
- O script deve **paginar explicitamente** e provar que capturou todos os bairros (não truncar em page-size default do ArcGIS). Reportar a contagem final.
- Documentar a **integridade do join** bairro (layer 2: `nm_bai`/`id`) ↔ `cdbairro` (layer 3, 709 setores): 709 vs ~1.206 polígonos é uma discrepância conhecida — documentar se são unidades administrativas diferentes (bairro vs setor cadastral). NÃO construir a home sobre um lookup id→cdbairro; o drill da Phase 3 usa envelope/viewport, que dispensa o join.

### Correção documental
- Corrigir `PROJETO-radar.md §4` e `ROADMAP-radar.md §0`: o endpoint **aceita** `returnGeometry=true` (verificado ao vivo 2026-07-04, +~19% de payload), contrariando a "manha" antiga. Manter as demais manhas (só `outFields=*`, 502 sob carga, etc.).

### Claude's Discretion
- Escolha de linguagem/ferramenta do script de build, biblioteca de simplificação, nível de tolerância de simplificação, e estrutura exata do GeoJSON de saída — tudo à discrição de Claude, guiado pelos critérios de sucesso e convenções do repo.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `radar-goiania.html`: definição proj4 e `toWGS()` (por volta das linhas 568-569) — fonte única de verdade da reprojeção; reusar, nunca redefinir.
- `atualizar-caixa.py`: precedente de script Python de build que consome dado da rede, com backoff/retry e gera artefato versionado (`caixa-goiania.js`) — bom molde para o script do dataset de bairros.
- `LOTSVC`/`BAISVC`, `refreshLots()`, `mostrarBairro()` já existem no HTML (consumidos pela Phase 3, não por esta).

### Established Patterns
- Endpoint frágil (502 sob carga): paginar com gentileza, backoff. Este é build offline (roda 1×), então pode ser paciente.
- Artefatos de dados versionados como `.js`/`.json` no repo (ex.: `caixa-goiania.js`).

### Integration Points
- O GeoJSON gerado será consumido pela home na Phase 3 (render de bairro). Definir um caminho/nome de arquivo estável (ex.: `bairros-goiania.json`).
- `sw.js` (allowlist de CDN + cache versionado `radar-v3`) — se o asset novo precisar ser cacheado pelo PWA, a atualização do sw.js acontece na fase que o consome/expõe (Phase 3), não necessariamente aqui.

</code_context>

<specifics>
## Specific Ideas

- Verificação obrigatória em runtime de planejamento: re-confirmar `returnGeometry=true` no momento da implementação (comportamento de servidor de terceiro, sem SLA).
- Alvo de peso do asset: leve o suficiente para não pesar o boot do app single-file/PWA — priorizar simplificação sobre fidelidade extrema em zoom de cidade.

</specifics>

<deferred>
## Deferred Ideas

- Render dos bairros na home → Phase 3.
- Ortofoto própria (EPSG:31982, CRS custom) → SAT-03, v2.1+ (fora do v2.0).
- Snapshot anual de mediana R$/m² por setor (histórico próprio) → camada de inteligência futura, fora do v2.0.

</deferred>
