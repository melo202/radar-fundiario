# Relatorio de geracao — bairros-goiania.json

Gerado em: 2026-07-04

## Completude de paginacao (DADOS-02)

- Total reportado pelo servidor (`returnCountOnly`): **1206**
- Total efetivamente coletado via paginacao explicita (`resultOffset`, paginas de 500): **1206** (assert `len(features) == returnCountOnly` passou — nenhum `OBJECTID` [a chave primaria real] duplicado entre paginas; ver secao abaixo sobre uma colisao no campo de negocio `id`, que NAO afeta esta garantia de completude)
- Nao se confiou na resposta default sem paginacao: mesmo que o `maxRecordCount` atual do layer (1.000.000) devolva tudo numa unica chamada hoje, isso e uma config momentanea do servidor, nao uma garantia — o script pagina explicitamente de qualquer forma.

## Nomeados vs. nao-nomeados (Glebas rurais)

- Bairros com `nm_bai` preenchido: **740**
- Bairros sem nome (`nm_bai` nulo/vazio — Glebas rurais, `tp_bai="Glb"`): **466**

## Integridade do join bairro (layer 2) <-> cdbairro (layer 3) — DADOS-02

- Distinct `cdbairro` na layer 3 (setores fiscais): **709**
- Total de poligonos de bairro na layer 2 (`id`/`nm_bai`): **1206**

**Conclusao: 709 (setores fiscais, layer 3) e 1206 (divisas de bairro, layer 2) sao unidades administrativas DIFERENTES, mantidas por processos distintos, sem chave de join confiavel entre elas.**

Evidencias:
1. A discrepancia de contagem (1206 vs 709) e estrutural, nao um artefato de paginacao truncada — ambas as contagens foram verificadas como completas de forma independente (a layer 2 bate `returnCountOnly` com a coleta paginada; a consulta de valores distintos da layer 3 nao reportou truncamento).
2. 466 dos 1206 poligonos da layer 2 nao tem nome (`nm_bai` nulo/vazio, `tp_bai="Glb"` — Gleba, um lote rural nao loteado). Um codigo `cdbairro` de setor fiscal, por definicao, e uma unidade tributavel e descrita — nao existe "setor sem nome". Isso prova por si so que as duas layers modelam coisas diferentes: layer 2 inclui subdivisoes geograficas/cartograficas cruas (algumas literalmente sem nome), enquanto o `cdbairro` da layer 3 e uma classificacao fiscal.
3. Nao ha convencao de nome/chave que conecte as duas: o `id` da layer 2 e um codigo de 12 caracteres (ex.: `000400000603`) sem semelhanca visivel com os codigos inteiros pequenos de `cdbairro` da layer 3 (ex.: `3`). Nao existe campo na layer 2 com um valor no formato de `cdbairro`, nem campo na layer 3 com um valor no formato do `id` de 12 caracteres.

**Por isso, NENHUM lookup id->cdbairro e construido por este script.** A Fase 3 (drill-down por bairro) deve continuar usando consultas espaciais de viewport/envelope contra a layer 0 (como `refreshLots()` ja faz hoje), o que dispensa qualquer join.

## Qualidade do dado de origem: `id` nao e uma chave unica

Achado ao vivo durante a geracao: **1** valor(es) do campo de negocio `id` aparecem em mais de um `OBJECTID` (a chave primaria real do ArcGIS) na layer 2: `['000400001169']`. Exemplo confirmado: `id="000400001169"` existe em OBJECTID 13171 (`nm_bai=null`) e OBJECTID 31584 (`nm_bai=" "`) — duas features distintas (geometrias diferentes) com o mesmo `id`, provavel duplicata de cadastro na fonte, nao um bug de paginacao deste script.

**Por isso, o guard de duplicata-entre-paginas deste script usa `OBJECTID`, nao `id`, como chave de unicidade** — usar `id` geraria falso-positivo e abortaria uma coleta legitimamente completa. Isso reforca ainda mais a decisao de NAO construir nenhum lookup indexado por `id`: o campo nao e garantidamente unico.

## Fonte avaliada e rejeitada: CKAN bai.json

O export aberto da Prefeitura (`bai.json`, CKAN) foi avaliado e **rejeitado** como fonte primaria: dados de 2018-09-18 (defasado), apenas 1.155 features (66 a menos que a layer 2 ao vivo), sem documentacao de CRS na pagina publica do dataset (embora o arquivo em si declare EPSG:31982 internamente). A layer 2 ao vivo do ArcGIS foi usada como fonte unica por ser mais completa e atual.

## Simplificacao (mapshaper) — artefato final `bairros-goiania.json`

Comando executado (versao pinada, `mapshaper@0.6`, via `npx --yes` — sem instalacao permanente/`package.json`):

```bash
npx --yes mapshaper@0.6 -i bairros-goiania.wgs84-raw.json snap -simplify 10% keep-shapes -o format=geojson precision=0.000001 bairros-goiania.json
```

**Achado importante sobre a sintaxe de `precision=`:** nesta versao do mapshaper (0.6.x), a flag `precision=` do `-o` espera uma **tolerancia decimal** (ex.: `0.000001` para ~6 casas decimais / ~11cm no equador), e NAO um inteiro "numero de casas decimais". Passar `precision=6` (a sintaxe originalmente prevista) faz o mapshaper arredondar para o multiplo de 6 UNIDADES mais proximo — em graus decimais isso colapsa toda geometria em pontos identicos e o writer emite `geometry: null` para as 1206 features (nenhum erro fatal, silencioso). Corrigido para `precision=0.000001`; verificado apos a correcao que todas as 1206 features preservam `geometry.type=="Polygon"` com coordenadas validas.

Tamanhos resultantes (medidos com o modulo `gzip` do Python, `json.dumps(...,separators=(',',':'))`):
- Bruto (sem simplificacao), `bairros-goiania.wgs84-raw.json`: ~5.3MB (nao comprimido)
- Simplificado, `bairros-goiania.json`: **734.010 bytes (~717 KB) nao comprimido / ~166,6 KB gzip** — dentro do orcamento de ~200KB (hard budget do check automatizado); um pouco acima da estimativa de pesquisa de ~142KB, provavelmente por variacao natural do dado ao vivo (contagem de vertices/geometria pode ter mudado desde a pesquisa de 2026-07-04).

**Limitacao aceita — self-intersecting rings (auto-intersecoes) residuais:** o `keep-shapes` (modo com preservacao de topologia) reparou 73 intersecoes automaticamente, mas **279 aneis com self-intersection (auto-intersecao) permanecem irreparaveis** (proximo do numero de referencia da pesquisa, ~295 — a pequena diferenca e esperada, dado de origem ao vivo). Isso e uma limitacao CONHECIDA E ACEITA para esta fase: o Leaflet renderiza cada anel de poligono de forma independente (fill-rule even-odd/nonzero via Canvas/SVG), entao os self-intersecting rings em poligonos pouco visualizados (majoritariamente Glebas rurais sem nome) sao um risco cosmetico, nao funcional, para a renderizacao da Fase 3. **Um futuro consumidor que precise de point-in-polygon exato ou calculo de area deve revalidar contra a fonte bruta (`bairros-goiania.wgs84-raw.json`), nao assumir que os poligonos deste arquivo simplificado sao topologicamente limpos.**

**Nota de reprodutibilidade:** a etapa de simplificacao e intencionalmente separada e re-executavel — a Fase 3 pode reajustar a tolerancia (`-simplify`) ou a precisao sem precisar refazer o fetch/reprojecao/relatorio de integridade do join (Task 1 deste plano).
