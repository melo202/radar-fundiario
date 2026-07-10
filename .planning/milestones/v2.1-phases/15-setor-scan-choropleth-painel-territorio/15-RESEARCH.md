# Phase 15: Setor-Scan Compartilhado, Choropleth & Painel do Território - Research

**Researched:** 2026-07-09
**Domain:** Codebase-survey (radar-goiania.html, arquivo único) + verificação ao vivo do endpoint ArcGIS da Prefeitura de Goiânia
**Confidence:** HIGH (achados de código com linha citada e lida diretamente; achados de endpoint verificados ao vivo nesta sessão com `curl`, não extrapolados)

## Summary

Toda a infraestrutura de que a Fase 15 precisa já existe em produção e foi lida linha a linha: `fetchWhere` (paginação `resultOffset`), `jsonp`/`jsonpOnce` (retry+timeout), `sanitiza()` (allowlist negativa anti-LGPD já aplicada dentro de `fetchWhere`), `CMPCACHE`/`capCache` (cache de sessão), `baiStyle()`/`lotStyle()` (hooks de resolução de estilo já preparados para receber uma fonte de cor por território) e o padrão `RADAR_PURE` com harness `node --test` (108/108 verdes hoje). Nenhuma biblioteca nova é necessária — Leaflet 1.9.4/`L.canvas`, proj4 e Motion já carregados via CDN cobrem tudo.

A verificação ao vivo do endpoint (6 requisições sequenciais e espaçadas, ver `## Environment Availability`) confirmou os números do ROADMAP (Bueno = `cdbairro=16`, 57.225 lotes com `vlvenal>0`) e **corrigiu um quirk documentado**: contrariamente ao que `ROADMAP-radar.md`/`INTELIGENCIA-radar.md` registraram ("só `outFields=*` funciona"; "`returnDistinctValues` é o único caso onde `outFields` específico funciona"), uma consulta paginada normal (sem `returnDistinctValues`) com `outFields` restrito a 13 campos retornou HTTP 200 com dados corretos em dois testes independentes, reduzindo o payload por página de ~2,9 MB (85 campos) para ~0,56 MB (13 campos) — uma economia de ~80%. Isso muda a matemática de custo do orçamento de 3 páginas do TERR-01 (ver `## State of the Art`).

O achado mais crítico para a arquitetura do TERR-02 (choropleth) é um **gap estrutural**: a malha visual (`bairroLayer`, 1.206 polígonos de `bairros-goiania.json`, chave `id`/`nm_bai`) e o `cdbairro` fiscal (usado pelo scan) não têm nenhuma chave de join em tempo de execução — confirmado por `gerar-bairros.py` linha 468 ("NENHUM lookup id->cdbairro é construído por este script") e pelo fato de `onEachBairro`/`drillBairro`/`highlightBairro` operarem só por geometria/nome, nunca por `cdbairro`. Existe, porém, um artefato de build já gerado e committado (`bairros-goiania.recon.json`, 1.205 entradas `id → {cdbairro, motivo}`) que resolve exatamente esse problema — mas ele **não é carregado pelo app em runtime** (não está no `sw.js` `LOCAL`, não é `fetch()`ado por `radar-goiania.html`). A Fase 15 precisa decidir explicitamente se/como promover esse artefato de auditoria para dado de runtime, e comunicar ao planner que ~65% dos mapeamentos (`motivo:"nome"` e `"maioria"`) são heurísticos, não joins espaciais exatos — inclusive o próprio Bueno é `motivo:"nome"`.

**Primary recommendation:** construir `territorioScan(cdbairro)` como uma fina extensão de `fetchWhere` (mesmo padrão de paginação/retry, `outFields` restrito à allowlist de TERR-01 — hoje verificado como funcional, não `*`), com cache por `cdbairro` em um objeto novo (`TERRCACHE`, mesmo padrão de `CMPCACHE`/`capCache`) e uma promise em voo compartilhada para dedupe; expor o choropleth via `setStyle()` reaproveitando o hook `lotStyle()`/`baiStyle()` já comentado como pronto para isso; e resolver o gap `id↔cdbairro` promovendo `bairros-goiania.recon.json` (ou um subconjunto dele) a asset de runtime versionado no `sw.js`.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Setor-scan compartilhado (TERR-01) — orçamento de requisições**
- Uma única função compartilhada (ex.: `territorioScan(cdbairro)`) com cache de sessão por `cdbairro` (mesmo padrão do `CMPCACHE` dos comparáveis) e dedupe de chamadas em voo — Painel + Choropleth abertos juntos disparam UMA varredura, nunca duas
- Orçamento HARD: ≤3 requisições paginadas por scan. Para setor grande (Bueno ~57k lotes), o scan padrão é amostra paginada (até 3 páginas × 2000 = até 6.000 lotes) + `returnCountOnly` para o total real — quantis/medianas calculados sobre a amostra e rotulados com honestidade ("com base em N de M lotes"). NUNCA baixar as ~29 páginas do setor inteiro no fluxo padrão; NUNCA 1 requisição por quadra
- Zoom-gate: nenhuma consulta de território dispara automaticamente — só sob ação explícita do usuário; sem varredura em pan/zoom passivo
- Endpoint só aceita `outFields=*` (quirk confirmado, PROJECT.md) — o corte de custo vem do nº de requisições e do cache, não de restringir campos [ver correção verificada ao vivo abaixo]; retry/backoff gentil já existente do app é reusado; falha → toast com saída
- Campos usados no resultado do scan (allowlist): `vlvenal, areaedif, areaterr, vlimp98, dtinclusao, uso, cdbairro, nrquadra, nrlote, ci/nrinscr, x/y` — nunca `dtnascimen` (LGPD)

**Choropleth (TERR-02)**
- Quantis discretos relativos ao setor (5 faixas, nunca gradiente contínuo)
- Implementar via hook de estilo existente (`lotStyle()`/`baiStyle()`) e `setStyle()` para trocar tema (não recriar geometria); respeita `prefers-reduced-motion`
- Populado incrementalmente: só setores já escaneados ganham cor; os demais mantêm a malha neutra idle da Fase 7
- Composição: sobre CARTO light, fill sutil (~.15-.25); sobre satélite, fill mais opaco (~.35-.45) + traço de borda com mais contraste; `fillOpacity` nunca 0 (mínimo .02)
- Contraste AA nos dois fundos; cor carrega significado de status — coerente com a lei "cor só onde significa status" da Fase 13
- Legenda compacta tocável (faixa horizontal de 5 blocos + rótulos), recolhível, com toggle liga/desliga

**Painel do Meu Território (TERR-03)**
- Métricas: mediana + Q1-Q3 de R$/m² venal (por `areaedif` se edificado, `areaterr` se terreno), IPTU mediano (`vlimp98`), idade mediana do cadastro (`dtinclusao`), mix de uso (`uso`), nº de lotes (total real via `returnCountOnly`)
- Todo número derivado da amostra leva o rótulo de base ("amostra de N de M lotes")
- Entrada de UI: a partir do setor em foco (bairro destacado/buscado) — botão/ação "Ver território" abre o painel; padrão de sheet/painel existente (mobile bottom-sheet, desktop painel)
- Painel termina com ação (lei da Fase 10)
- Estatística em funções puras no `RADAR_PURE` com TDD (quantis, mix de uso, formatação)

### Claude's Discretion
- Nome exato de funções/UI, microcopy (gate §26), tamanho exato da amostra (2-3 páginas), detalhes da paleta (5 faixas discretas AA e coerentes com `--status-*`)
- Estratégia exata de amostragem (páginas sequenciais do resultSet padrão é aceitável; documentar o viés se houver)

### Deferred Ideas (OUT OF SCOPE)
- Scan completo opcional ("expandir análise completa", ~29 páginas com barra de progresso) — só se alguma métrica exigir; padrão fica na amostra. Se implementado, é acionamento explícito e fora do orçamento padrão. Candidato à Fase 16/17
- Choropleth por bairro em zoom de cidade populado incrementalmente entre sessões (persistência) — depende do IndexedDB da Fase 16

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERR-01 | Função compartilhada de varredura de setor com cache de sessão e orçamento de requisições | `fetchWhere` (linha 2587-2599) é o ponto de extensão direto; `CMPCACHE`/`capCache` (3757, 2186) é o padrão de cache a clonar; live-test confirma paginação `resultOffset` estável (page1 OBJECTID 8–57874, page2 57875–61206, zero overlap) e `returnCountOnly` exato (57.225, bate com `INTELIGENCIA-radar.md`) |
| TERR-02 | Choropleth de R$/m² por quadra/lote (quantis relativos ao setor), legível sobre CARTO e satélite | `baiStyle()`/`lotStyle()` (2170-2182) já são funções de resolução de estilo com branch `satelliteOn`; `setStyle()` já é usado em `setSatelite()` (2144-2145) e no `zoomend` (2087) — padrão comprovado em produção. Gap crítico: `bairroLayer` (`bairros-goiania.json`, 1.206 polígonos, chave `id`/`nm_bai`) não tem `cdbairro` embutido — precisa do `bairros-goiania.recon.json` (achado desta pesquisa) para saber qual polígono pintar |
| TERR-03 | Painel do Território (mediana + Q1-Q3 R$/m², IPTU mediano, idade cadastro, mix de uso) | Padrão `RADAR_PURE` (1135-2011) + `tests/scores.test.mjs`/`fixtures.mjs` é o template de TDD a replicar; `quant()` (3758, Tukey) está FORA do bloco testável — nova função de quantil precisa nascer dentro do bloco; guardas `areaedif>0`/`||0` já estabelecidos (1913, 2856) evitam `null`/`0` sendo tratados como dado real |

## Standard Stack

Nenhuma dependência nova. O app é um arquivo HTML único sem build (`package.json` só roda `node --test`).

### Core (já em produção, reusado)
| Biblioteca | Versão | Papel na Fase 15 | Por que é o padrão do projeto |
|---|---|---|---|
| Leaflet | 1.9.4 (`renderer:L.canvas`) | `setStyle()` do choropleth sobre `bairroLayer`/`lotLayer` já existentes | Já orquestra 1.206+ polígonos com Canvas renderer; `layer.setStyle()`/`.eachLayer()` são API nativa, sem plugin |
| proj4js | 2.11.0 | Conversão EPSG:31982 → WGS84 para qualquer novo ponto de lote no painel | Já usado em `toWGS()` (linha 1112), nenhuma mudança necessária |
| Motion (motion.dev) | já carregado, guardado por `mAnimate()`/`REDUCE` | Recolher/expandir a legenda (`#terrLegenda`) | `mAnimate(el,keyframes,{duration:.18,easing:[0.22,1,0.36,1]})` (2036-2039) é o wrapper REDUCE-safe já pronto — UI-SPEC já pede esses parâmetros exatos |
| node:test + node:assert/strict | nativo Node | TDD das novas funções puras de território | Mesmo harness de `tests/scores.test.mjs`, zero framework novo |

### Alternativas consideradas
| Em vez de | Poderia usar | Tradeoff |
|---|---|---|
| `setStyle()` por feature via `style:baiStyle` (GeoJSON layer) | Recriar `L.geoJSON` a cada troca de métrica | Rejeitado — Pitfall 13 do próprio projeto já identificou que recriar geometria é o mesmo padrão de jank do `refreshLots`; `setStyle()` é ordens de magnitude mais barato |
| ColorBrewer Blues-5 (paleta já escolhida no UI-SPEC) | Reusar `--status-*` (verde/amarelo/vermelho) para os quantis | Rejeitado explicitamente no UI-SPEC (linha 70): misturaria "caro" com "risco" — mantido como está |

**Instalação:** nenhuma (`npm install` não é necessário — zero pacote novo).

**Verificação de versão:** não aplicável — sem novo pacote npm. Leaflet/proj4/Motion continuam nas mesmas versões já auditadas nas fases anteriores (nenhuma mudança de CDN nesta fase).

## Architecture Patterns

### Anchors confirmados em `radar-goiania.html` (linha lida diretamente)

| Símbolo | Linha | O que faz / por que importa para a Fase 15 |
|---|---|---|
| `SVC` (endpoint da camada 3, cadastro fiscal) | 1113 | `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query` — **não** `portalgeo...` (nome citado no prompt está desatualizado/errado; o domínio real é `portalmapa.goiania.go.gov.br`) |
| `LOTSVC` / `BAISVC` | 1114-1115 | Camadas 0 (lote) e 2 (bairro) do mesmo `MapServer` — não usadas pelo scan de território (que é sobre a camada 3) |
| `jsonp`/`jsonpOnce` | 2052-2070 | Retry único com pausa de 900ms (comentário: "o servidor da prefeitura dá 502 esporádico sob carga"); timeout de 30s; `territorioScan` deve reusar isto, não reimplementar |
| `fetchWhere(where,maxPages=30)` | 2587-2599 | Paginação real via `resultOffset`/`resultRecordCount=2000`, `outFields:"*"`, `orderByFields:"OBJECTID"`; já chama `sanitiza()` no retorno (LGPD grátis); já emite `toast()` se truncado. **Ponto de extensão direto para TERR-01** — precisa de uma variante com `maxPages` baixo (2-3) e `outFields` restrito (ver correção de quirk abaixo) |
| `sanitiza(arr)` / `SENS` | 1126-1127 | Allowlist NEGATIVA (`dtnascimen,cpf,cnpj,nmcontrib,nmproprie,nome`) já removida de TUDO que passa por `fetchWhere`. território-scan herda isso de graça se reusar `fetchWhere` |
| `CMPCACHE={}` / `capCache(o,max)` | 3757 / 2186 | Cache de sessão por chave composta, com teto de 150 entradas (evicção pelo `Object.keys(o)[0]`, ou seja, ordem de inserção). Clonar para `TERRCACHE` com teto menor (poucos setores por sessão de uso — sugestão: 20-30) |
| `compsStats` (busca binária em `returnCountOnly`) | 3805-3838 | Mostra o padrão de percentil-por-contagem — NÃO aplicável ao Painel do Território como está (TERRITORIO.md já explica: correlacionar 2+ campos exige download, contagem não generaliza), mas é a referência de "múltiplas métricas, uma exploração" caso o planner queira otimizar a mediana de R$/m² isoladamente antes de baixar o resto |
| `BAI_STYLE`/`BAI_HOVER` | 2165-2166 | `fillOpacity:.02` idle — o piso que TERR-02 nunca pode zerar |
| `baiStyle(feature)` | 2170-2177 | Já tem branch `satelliteOn` (fill 0 sobre satélite hoje, weight sobe) — é o hook comentado como "deixa a extensão v2.1 barata"; TERR-02 estende o `return` para consultar um lookup de quantil por `cdbairro` ANTES de cair no fallback neutro |
| `lotStyle()` | 2179-2182 | Idem para lotes; hoje só depende de `satelliteOn` |
| `bairroLayer` / `loadBairroPolys()` | 2184, 2311-2321 | `L.geoJSON(data,{renderer:L.canvas({pane:"bairros"}),pane:"bairros",style:baiStyle,onEachFeature:onEachBairro})` — os polígonos vêm de `bairros-goiania.json`, propriedades = **só** `{id, nm_bai, nm_disp}`. **Nenhum `cdbairro`** — ver Gap crítico abaixo |
| `setSatelite(on)` → `bairroLayer.setStyle(baiStyle)` / `lotLayer.eachLayer(p=>p.setStyle(lotStyle()))` | 2144-2145 | **Este é o padrão exato a copiar** para "recolorir tudo sem recriar geometria" — TERR-02 faz o mesmo ao ligar/desligar o choropleth ou ao trocar de setor escaneado |
| `map.on("zoomend",...)` re-aplicando `baiStyle` | 2082-2089 | Mesmo padrão — zoom já dispara `setStyle()` em massa; confirma que a operação é barata na prática (já roda a cada zoom hoje) |
| `onEachBairro`/`highlightBairro`/`drillBairro` | 2266-2321 | Operam SÓ por geometria/nome (`layer.feature.properties.nm_disp`); nunca tocam `cdbairro`. Clicar num polígono não sabe o `cdbairro` fiscal daquele bairro hoje |
| `RADAR_PURE_START` / `RADAR_PURE_END` | 1135 / 2011 | Bloco único, contíguo, testado via `node:vm` slice por `tests/*.test.mjs`. `scoreOportunidade` (1323), `statusDeUnidade` (1999) já vivem aqui. **Toda função pura nova de território deve ser inserida DENTRO deste intervalo** (o bloco cresce, nunca é duplicado em outro lugar do arquivo) |
| `quant(sorted,p)` | 3758 (fora do bloco `RADAR_PURE`) | Helper de interpolação de quantil usado por `compsStats`/`renderComps`. **Não está dentro do bloco testável** — se o planner quiser reusar a mesma fórmula, precisa duplicar uma versão pequena dentro do bloco `RADAR_PURE` (ou mover `quant` para dentro do bloco, o que é seguro pois tudo está no mesmo `<script>` global) |
| Guardas `areaedif>0`/`vlvenal>0` | 1913, 2856, 3106, etc. | Padrão estabelecido: `const v=a.vlvenal||0, ae=a.areaedif||0; (v>0&&ae>0)?v/ae:null` — nunca divide por zero, nunca trata `0`/`null`/ausente como dado real |
| `USO={0:"—",1:"Residencial",...,6:"Territorial"}` | 1117 | Mapa de domínio pronto para o "mix de uso" do painel — não reinventar rótulos |
| `fmtDt(s)` | 1128 | `dtinclusao`/datas no formato `YYYYMMDD` (regex `^\d{8}$`, `"00000000"` é sentinela inválido) — a idade mediana do cadastro deve usar a MESMA validação antes de calcular ano |
| `MOTION_MSG` | 2552-2558 | Objeto literal fixo (nunca string interpolada) — os 2 novos estágios do UI-SPEC ("Varrendo setor…", "Calculando faixas de valor…") entram como novas chaves aqui, mesmo padrão |
| `toast(msg)` / `loading(on,msg)` | 2546-2549 | Reusar tal como está — zero API nova |
| `.detail` (sheet) | CSS 334-410, 762-770; HTML `id="detail"` linha 939 | Bottom-sheet mobile / painel flutuante desktop; `.dgrid .cell` (358-362) é a grade de métricas a clonar para `#terrPanel` |
| `REDUCE` / `mAnimate` | 2029-2039 | Guard de motion já pronto — usar tal como está para o collapse da legenda |
| `+code`/`+b` antes de interpolar `cdbairro` em WHERE | 2500, 2631, 2672, 2688 | Padrão de sanitização por coerção numérica já estabelecido — `territorioScan(cdbairro)` deve fazer `+cdbairro` no primeiro passo, mesmo que a fonte já seja confiável (defesa em profundidade, ASVS V5) |

### Pattern 1: Cache de sessão + dedupe de chamada em voo (extensão do padrão `CMPCACHE`)
**O que:** um objeto `TERRCACHE={}` chaveado por `cdbairro`, e a MESMA chamada assíncrona guardada como Promise (não só o resultado) enquanto está em voo — isso é o que garante que Painel+Choropleth abertos juntos disparem UMA varredura.
**Quando usar:** todo consumidor de `territorioScan(cdbairro)` (painel, choropleth, e futuramente TERR-04/05/06 nas Fases 16-17).
**Exemplo (mesmo formato de `getComps`, linhas 3760-3776):**
```javascript
// Source: radar-goiania.html:3757-3776 (padrão CMPCACHE), adaptado
const TERRCACHE={};
async function territorioScan(cdbairroRaw){
  const cdbairro=+cdbairroRaw; // coerção numérica antes de qualquer WHERE (mesmo padrão de linha 2500)
  const key=String(cdbairro);
  capCache(TERRCACHE,30); // teto menor que CMPCACHE (150) — território é mais pesado por entrada
  if(!TERRCACHE[key]){
    TERRCACHE[key]=territorioScanRun(cdbairro).catch(err=>{delete TERRCACHE[key];throw err;});
  }
  return TERRCACHE[key]; // 2a chamada concorrente reusa a MESMA promise em voo
}
```

### Pattern 2: Amostra paginada com orçamento fixo (extensão de `fetchWhere`)
**O que:** variante de `fetchWhere` com `maxPages` baixo (2-3) e `outFields` restrito à allowlist de TERR-01 (ver correção de quirk verificada ao vivo), mais uma consulta paralela `returnCountOnly` para o total real.
**Quando usar:** dentro de `territorioScanRun(cdbairro)`.
**Exemplo:**
```javascript
// Source: radar-goiania.html:2587-2599 (fetchWhere), adaptado com outFields restrito
// e maxPages baixo — CONFIRMAR outFields restrito com o time antes de shippar (ver Assunção A1)
const TERR_FIELDS="vlvenal,areaedif,areaterr,vlimp98,dtinclusao,uso,cdbairro,nrquadra,nrlote,ci,nrinscr,x_coord,y_coord";
async function territorioScanRun(cdbairro){
  const where=`cdbairro=${cdbairro} AND vlvenal>0`;
  const [amostra,totalD]=await Promise.all([
    fetchWhereRestrito(where,TERR_FIELDS,3), // até 3 páginas x 2000 = 6.000
    jsonp({where,returnCountOnly:"true",f:"json"})
  ]);
  const total=totalD.count||0;
  return {amostra,total,cdbairro};
}
```

### Pattern 3: Choropleth via `setStyle()` — estender o hook, não substituir
**O que:** `baiStyle()`/`lotStyle()` ganham um parâmetro implícito (lookup global de quantil por `cdbairro`), preservando o fallback neutro para setores não escaneados.
**Exemplo (extensão literal do código de 2170-2182):**
```javascript
// Source: radar-goiania.html:2170-2182, estendido
let TERR_QUANTIS={}; // {cdbairro: {q1..q5 breakpoints}} — só entra quando escaneado
function baiStyle(feature){
  const z=map?map.getZoom():12,t=Math.max(0,Math.min(1,(z-12)/4));
  const cdbairro=idParaCdbairro(feature.properties.id); // ver Pattern 4 — pode ser undefined
  const q=cdbairro&&TERR_QUANTIS[cdbairro];
  if(q&&CHOROPLETH_ON){
    const bin=binDoQuantil(q, /* algum valor de referência do setor */);
    return satelliteOn
      ? {pane:"bairros",color:"var(--paper-2)",weight:1.2+t*0.6,fillColor:TERR_COLORS[bin],fillOpacity:TERR_FILLOP_SAT[bin],opacity:1}
      : {pane:"bairros",color:TERR_INK[bin],weight:0.5+t*0.7,fillColor:TERR_COLORS[bin],fillOpacity:TERR_FILLOP_CARTO[bin],opacity:0.35+t*0.15};
  }
  return satelliteOn
    ? {...BAI_STYLE, opacity:1, weight:1.2+t*0.6, fillOpacity:0}
    : {...BAI_STYLE, weight:0.5+t*0.7, opacity:0.35+t*0.15};
}
```
**Aplicar a troca em massa:** `bairroLayer.setStyle(baiStyle)` — já é a chamada usada em `setSatelite()` (2144) e no `zoomend` (2087); nenhuma API nova.

### Pattern 4: Resolver `id ↔ cdbairro` (o gap crítico)
**O que é o problema:** `bairroLayer` é construído a partir de `bairros-goiania.json`, cujas `properties` são `{id, nm_bai, nm_disp}` — **sem `cdbairro`** (confirmado por leitura direta do JSON, 1.206 features). `territorioScan(cdbairro)` recebe/produz um `cdbairro` fiscal. Não há hoje nenhum código que traduza um clique no polígono (`feature.properties.id`) para o `cdbairro` correspondente, nem o inverso (escolher no combo de busca por `cdbairro` e saber qual polígono pintar).

**Achado desta pesquisa:** existe um artefato já gerado (`bairros-goiania.recon.json`, na raiz do repo) — um dicionário `{id: {cdbairro, nmbairro_reconciled, motivo, nm_bai_original}}` com **1.205 entradas**, produzido pelo spatial join da Fase 7 (`gerar-bairros.py --verify`). Confirmado ao ler o arquivo:
```json
"000400000014": {"cdbairro":16,"nmbairro_reconciled":"SET BUENO","motivo":"nome","nm_bai_original":"Bueno"}
```
Distribuição de `motivo` (confiabilidade do join, 1.205 entradas): `unico`=339 (join espacial 1:1 — HIGH), `nome`=396 (match por nome entre múltiplos candidatos espaciais — MEDIUM), `maioria`=384 (voto de maioria entre parcelas — MEDIUM), `sem-parcela`=86 (nenhuma parcela fiscal intersecta — sem `cdbairro`, são as glebas).

**Porém:** este arquivo **não é carregado pelo app hoje** — não está em `sw.js` `LOCAL` (linhas 13-23), não é `fetch()`ado por `radar-goiania.html` (grep confirmado: zero ocorrência de `recon.json` no HTML ou no `sw.js`). É puramente um artefato de auditoria/build.

**Recomendação para o plano:** promover um subconjunto mínimo deste arquivo (`id → cdbairro`, descartando `nmbairro_reconciled`/`nm_bai_original`/`motivo` se não forem necessários em runtime, ou mantendo `motivo` só se o UI quiser sinalizar baixa confiança visualmente) a um asset de runtime committed (ex.: `bairro-cdbairro.json`), adicioná-lo ao `sw.js` `LOCAL` **com bump de `CACHE`** (mesmo checklist do Pitfall 12 já documentado no projeto), e construir os dois lookups em memória no boot: `cdbairroParaIds` (1:N — 780 dos 1.205 vêm de heurística, então um `cdbairro` pode mapear a mais de um `id` de polígono) e `idParaCdbairro` (N:1, direto do arquivo).

**Nota de honestidade:** o próprio `SET BUENO` (o setor de bandeira da Fase 15, citado como critério de aceite do ROADMAP) tem `motivo:"nome"`, não `"unico"` — ou seja, mesmo o caso mais testado desta fase está na faixa MEDIUM confidence de reconciliação, não numa correspondência espacial exata. Isso não bloqueia a Fase 15 (a Fase 7/Pitfall 3 já aceitou esse risco para o nome exibido), mas o planner deve saber que "colorir o polígono certo" tem essa mesma incerteza residual herdada.

### Anti-Patterns to Avoid
- **Recriar `L.geoJSON`/`L.polygon` a cada troca de choropleth:** usar `setStyle()`/`eachLayer` — já é o padrão comprovado em `setSatelite()`.
- **1 requisição de `returnCountOnly` por quadra:** já banido explicitamente pelo CONTEXT.md e por `PITFALLS.md` Pitfall 5 — a agregação por quadra (se feita) deve vir do MESMO array já baixado pela amostra, nunca de N consultas novas.
- **Tratar `bairros-goiania.recon.json` como fonte de verdade sem marcar a incerteza:** ~65% das entradas (`nome`+`maioria`) são heurísticas — nunca apresentar a cor do choropleth como "exato" nesses casos sem o rótulo de honestidade já exigido pelo UI-SPEC para a amostra.
- **Duplicar `quant()` fora do bloco `RADAR_PURE`:** qualquer nova função estatística pura tem que nascer entre as linhas 1135-2011, ou o harness de teste (`node:vm` slice) não a vê.

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|---|---|---|---|
| Paginação + retry + timeout de consulta ArcGIS | Um novo fetcher do zero | `jsonp()`/`fetchWhere()` existentes (2052-2070, 2587-2599) | Já tratam 502 esporádico (retry+pausa 900ms), timeout de 30s, `orderByFields` estável para paginação sem duplicar/pular registros (confirmado ao vivo: zero overlap entre páginas) |
| Sanitização anti-LGPD do payload | Um novo `sanitizeAttrs()` | `sanitiza(arr)`/`SENS` (1126-1127), já aplicado dentro de `fetchWhere` | Já remove `dtnascimen`+outros 4 campos de QUALQUER array que passe por `fetchWhere` — reusar `fetchWhere` (ou a mesma função) herda a defesa de graça |
| Interpolação de quantil/mediana | Uma segunda fórmula de percentil | `quant(sorted,p)` (3758) como referência de fórmula (linear entre vizinhos) — mas precisa de uma cópia DENTRO do bloco `RADAR_PURE` para ser testável | Consistência: usar a mesma fórmula que os comparáveis (Fase 9) evita dois comportamentos de "mediana" diferentes no mesmo app |
| Debounce/cache de estilo por zoom | Um sistema de zoom-binning novo | `t=(zoom-12)/4` clamped, já usado em `baiStyle()` (2172-2177) | O choropleth reusa a MESMA rampa de peso por zoom, só troca a fonte de cor — UI-SPEC já pede isso explicitamente |
| Animação de collapse da legenda | CSS transition manual sem guard de motion | `mAnimate(el,keyframes,{duration:.18,easing:[0.22,1,0.36,1]})` (2036-2039) | Já é REDUCE-safe (retorna `null` sem animar se `prefers-reduced-motion` ou Motion não carregou) |

**Key insight:** o "hand-roll" mais tentador nesta fase é reescrever o pipeline de rede (retry/paginação) "otimizado para território" — mas o app já pagou esse custo de engenharia duas vezes (comparáveis e busca), e o servidor da Prefeitura é o mesmo endpoint frágil nos três casos. Divergir do padrão `jsonp`/`fetchWhere` é reintroduzir bugs de concorrência (falta de `SEARCHTOKEN`-like guard) já resolvidos noutro contexto.

## Common Pitfalls

### Pitfall 1: Assumir que `outFields` restrito ainda é erro 400 (documentação desatualizada)
**O que dá errado:** `ROADMAP-radar.md` linha 14 e `INTELIGENCIA-radar.md` item 2 documentam, como fato testado em 2026-07-04, que `outFields` com campos específicos dá **Erro 400** e que `returnDistinctValues` é o único caso em que funciona. Um plano que "restringe campos para economizar payload" tomando esses docs ao pé da letra vai (a) ou evitar a otimização por medo do erro documentado, (b) ou tropeçar ao implementar sem testar de novo.
**Por que acontece:** o comportamento do endpoint mudou entre 04/07 e hoje (09/07) — ou a generalização "só funciona com `returnDistinctValues`" nunca foi totalmente precisa (o próprio `loadBairros()`, linha 2379, já usa `outFields:"cdbairro,nmbairro"` SEM erro, com `returnDistinctValues=true` — ou seja, mesmo o caso "conhecido" de exceção já estava em produção).
**Como evitar:** esta pesquisa reproduziu **ao vivo, agora**, duas consultas paginadas normais (SEM `returnDistinctValues`) com `outFields` restrito a 13 e a 2 campos — ambas HTTP 200, dados corretos, ~80% menos payload que `outFields=*`. Tratar a restrição de campos como **disponível e vantajosa**, mas re-testar no dia da implementação (o servidor já é documentado como instável sob carga — comportamento pode variar por deploy/hora do dia).
**Warning signs:** erro 400 explícito na resposta (`d.error`) — se aparecer, cair de volta para `outFields=*` como fallback automático, nunca travar o scan.
**Fase:** 15 (TERR-01), decisão de arquitetura do `territorioScanRun`.

### Pitfall 2: Colorir o polígono errado por causa do gap `id↔cdbairro`
**O que dá errado:** sem o lookup do Pattern 4, dois caminhos de UI (clique no polígono vs. seleção no combo de busca) produzem dois "setores em foco" que não conseguem se comunicar — o painel abre com dados do `cdbairro` certo, mas o choropleth não sabe qual dos 1.206 polígonos pintar (ou pinta o polígono errado num setor com `motivo:"maioria"`).
**Por que acontece:** os dois sistemas (malha visual layer 2, busca fiscal layer 3) nasceram sem chave de join (Pitfall 3 do `PITFALLS.md`, já documentado na Fase 7) — a Fase 15 é a primeira a precisar cruzar os dois em tempo real, não só para nome de exibição.
**Como evitar:** promover `bairros-goiania.recon.json` (ou subconjunto) a asset de runtime ANTES de implementar TERR-02; construir os dois lookups (`idParaCdbairro`, `cdbairroParaIds`); para os 86 casos `sem-parcela` (glebas), o choropleth nunca tenta colorir — cai no estado neutro, coerente com a filosofia de honestidade já adotada no app.
**Warning signs:** QA visual mostrando cor no polígono errado ao lado de um setor escaneado; teste manual clicando num polígono de gleba não deve nunca acionar "Ver território" com resultado colorido.
**Fase:** 15 (TERR-02), pré-requisito de dados antes do styling.

### Pitfall 3: Nova função estatística pura fora do bloco `RADAR_PURE` — invisível ao harness de teste
**O que dá errado:** o loader de teste (`tests/scores.test.mjs`, linhas 13-37, e o mesmo padrão que qualquer novo `tests/territorio.test.mjs` vai replicar) faz `html.indexOf("RADAR_PURE_START")`/`RADAR_PURE_END"` e testa SÓ o texto entre os dois marcadores (linhas 1135-2011 hoje). Uma função nova de quantil/mix-de-uso escrita fora desse intervalo (por exemplo, perto de `CMPCACHE`/`compsStats`, onde o `quant()` já existente vive) nunca é vista pelo `vm.Script`, e os testes vão falhar com "função ausente do bloco RADAR_PURE" (mensagem de assert já existente no loader, linha 26-29) — ou peor, o dev cria uma cópia redundante para "resolver" o erro do loader e agora há DUAS implementações de mediana no arquivo.
**Como evitar:** toda função nova de TERR-03 (quantil de amostra, mix de uso, idade mediana, R$/m² por lote com guarda de `null`/`0`) entra fisicamente entre as linhas do marcador `RADAR_PURE_START` (1135) e `RADAR_PURE_END` (2011) — o bloco cresce, nunca ganha um segundo lar.
**Fase:** 15 (TERR-03), Wave 0 / primeira task de implementação.

### Pitfall 4: Amostra sequencial (páginas 1-3 por `OBJECTID`) introduz viés não-aleatório
**O que dá errado:** `fetchWhere`/`territorioScanRun` pagina por `orderByFields:"OBJECTID"` — isso NÃO é uma amostra aleatória do setor, é "os primeiros ~6.000 registros por ordem de inserção no cadastro". Se o cadastro foi populado por ordem geográfica ou cronológica (ex.: loteamentos mais antigos primeiro), a amostra de 3 páginas pode sobre-representar uma região/época do setor, distorcendo a mediana de R$/m² exibida como representativa do setor INTEIRO.
**Por que acontece:** é o caminho de menor esforço (reusar `fetchWhere` como está) e o CONTEXT.md já pré-aprovou essa estratégia ("páginas sequenciais do resultSet padrão é aceitável; documentar o viés se houver").
**Como evitar:** documentar o viés explicitamente na UI ou no "Ver metodologia" (`.maisopcoes`, já previsto no UI-SPEC) — não é bloqueante per CONTEXT.md, mas deve ser uma frase real, não occultada. Se o viés for validado como severo (ver Open Questions), alternativa de baixo custo: embaralhar a ORDEM de leitura fazendo `orderByFields` por um campo quase-aleatório já existente (ex.: `nrinscr` em vez de `OBJECTID`) — SEM custo de requisição extra, mas SEM garantia estatística formal de amostra aleatória simples.
**Fase:** 15 (TERR-01/03) — decisão de "Claude's discretion" já delegada pelo CONTEXT.md, mas precisa aparecer como nota no painel.

### Pitfall 5: `dtinclusao` mal formatado (não `YYYYMMDD` ou sentinela `"00000000"`) quebra o cálculo de idade
**O que dá errado:** `fmtDt()` (1128) já trata isso para EXIBIÇÃO de data (retorna `null` se não bater a regex `^\d{8}$` ou for `"00000000"`), mas uma nova função de "idade mediana do cadastro" que não repetir essa mesma guarda vai calcular `NaN`/anos negativos/anos absurdos (ex.: ano "0000") se algum registro da amostra tiver o campo ausente ou sentinela.
**Como evitar:** a nova função pura de idade deve reusar a MESMA validação de `fmtDt` (regex + sentinela) antes de extrair o ano, filtrando registros invalidos da amostra ANTES do cálculo de mediana (não incluir como `0`/`NaN` no array).
**Fase:** 15 (TERR-03).

## Code Examples

### `fetchWhere` original (paginação de referência, testado ao vivo com sucesso nesta sessão)
```javascript
// Source: radar-goiania.html:2587-2599
async function fetchWhere(where,maxPages=30){
  let all=[],offset=0,page=2000,guard=0,truncated=false;
  while(true){
    const d=await jsonp({where,outFields:"*",returnGeometry:"false",
      resultOffset:offset,resultRecordCount:page,orderByFields:"OBJECTID",f:"json"});
    const fs=d.features||[];all=all.concat(fs);
    if(fs.length<page)break;
    offset+=page;
    if(++guard>=maxPages){truncated=true;break;}
  }
  if(truncated)toast("Resultado muito grande — a lista pode estar incompleta. Refine a busca.");
  return sanitiza(all.map(f=>f.attributes));
}
```

### Cache de sessão com dedupe (padrão a clonar de `getComps`)
```javascript
// Source: radar-goiania.html:3757-3776 (CMPCACHE/capCache)
const CMPCACHE={};
async function getComps(a){
  // ...
  const key=/* chave composta */;
  capCache(CMPCACHE,150);
  if(!CMPCACHE[key])CMPCACHE[key]=compsStats(a,areaField,myArea,r,isU).catch(err=>{delete CMPCACHE[key];throw err;});
  res=await CMPCACHE[key];
  // ...
}
```

### Troca de estilo em massa sem recriar geometria (padrão a copiar para o toggle do choropleth)
```javascript
// Source: radar-goiania.html:2144-2145 (dentro de setSatelite)
if(bairroLayer)bairroLayer.setStyle(baiStyle);
if(lotLayer&&lotLayer.eachLayer)lotLayer.eachLayer(p=>p.setStyle(lotStyle()));
```

### Loader de teste do bloco `RADAR_PURE` (padrão a replicar em `tests/territorio.test.mjs`)
```javascript
// Source: tests/scores.test.mjs:13-37
function loadPureBlock() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  // assert.ok(src.includes("function <novaFuncaoDeTerritorio>"), "...");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports = {/* novas funções */};").runInContext(sandbox);
  return sandbox.__exports;
}
```

## State of the Art

| Documentado antes (2026-07-04) | Verificado ao vivo agora (2026-07-09) | Impacto |
|---|---|---|
| `outFields` com campos específicos → Erro 400; só `outFields=*` funciona (`ROADMAP-radar.md` linha 14); `returnDistinctValues` é o único caso de exceção (`INTELIGENCIA-radar.md` item 2) | `outFields` restrito a 13 campos (e depois a 2 campos) em consulta paginada NORMAL (sem `returnDistinctValues`) retornou HTTP 200 com dados corretos, testado 2× em offsets diferentes | Payload por página de ~2.9 MB (85 campos × 2000 linhas) cai para ~0.56 MB (13 campos) — **~80% menor**. O orçamento de 3 páginas do TERR-01 fica proporcionalmente mais barato/rápido em 4G se o planner adotar `outFields` restrito. Risco residual: comportamento pode ser intermitente/dependente de carga do servidor (mesmo servidor já documentado como instável) — tratar como otimização com fallback, não certeza absoluta |
| Endpoint citado no prompt como `portalgeo.goiania.go.gov.br` | Endpoint real usado pelo app (`SVC`, linha 1113) é `portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query` | Qualquer busca/verificação futura deve usar o domínio real, não o citado de memória |

**Não há "deprecated" nesta fase** — tudo reusado é o padrão atual do próprio projeto (v2.0/v2.1), sem biblioteca de terceiros a atualizar.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `outFields` restrito continua funcionando de forma estável em produção (não só nos 2 testes ad-hoc desta sessão) — o servidor é documentado como instável sob carga e pode reintroduzir o erro 400 em outro horário/carga | State of the Art, Pattern 2 | Se falhar depois de shippar, `territorioScan` precisa de um fallback automático para `outFields=*` (mais caro, mas já comprovado estável) — o plano deve incluir esse fallback desde o início, não como hotfix |
| A2 | O `motivo` do `bairros-goiania.recon.json` (unico/nome/maioria/sem-parcela) é suficientemente estável para guiar qual polígono colorir — não foi feita auditoria manual dos 780 casos heurísticos nesta pesquisa (isso é o próprio Pitfall 3 já herdado da Fase 7, não uma nova verificação) | Pattern 4, Pitfall 2 | Setores com `motivo:"maioria"` podem colorir o polígono errado numa fronteira administrativa sinuosa — risco JÁ aceito pela Fase 7 para o NOME exibido, mas agora se estende a DADO (cor=preço), que é mais sensível a erro do que texto |
| A3 | A ordenação por `OBJECTID` na amostra de 3 páginas não introduz viés estatístico severo o suficiente para invalidar a mediana — não foi medido nesta pesquisa se `OBJECTID` correlaciona com geografia/data/valor no cadastro real de Goiânia | Pitfall 4 | Se o viés for forte, a mediana/Q1-Q3 exibidos podem estar sistematicamente deslocados vs. o setor real — mitigado pelo rótulo de honestidade já exigido, mas o painel continuaria "certo sobre a amostra, errado sobre o setor" |
| A4 | O tamanho de payload por página (medido para Bueno, o maior setor) generaliza para setores médios/pequenos sem surpresa — não foi medido nenhum setor pequeno/médio nesta sessão (orçamento de requisições gasto no maior caso, que é o critério de aceite do ROADMAP) | Environment Availability | Setores pequenos provavelmente são MAIS baratos (menos páginas até parar por `fs.length<page`), risco de surpresa é baixo, mas não confirmado ao vivo |

## Open Questions

1. **A restrição de `outFields` deve ser adotada como padrão de `territorioScan`, ou é seguro demais assumir sem um teste de carga adicional (múltiplos setores, horários diferentes)?**
   - O que sabemos: funcionou 2× ao vivo agora, com campos diferentes, sem erro.
   - O que é incerto: se é uma mudança de comportamento do servidor (permanente) ou uma condição de sorte momentânea; a documentação anterior (04/07) foi categórica no sentido contrário.
   - Recomendação: adotar com fallback automático para `outFields=*` em caso de erro 400 na resposta — nunca travar o scan por essa aposta.

2. **O subconjunto `id→cdbairro` de `bairros-goiania.recon.json` deve ser promovido como está (JSON committed, versionado manualmente) ou o pipeline `gerar-bairros.py` deve passar a EMITIR esse artefato de runtime automaticamente a cada regeneração da malha?**
   - O que sabemos: o arquivo de auditoria já existe e tem o dado certo.
   - O que é incerto: se decisões futuras de nome/geometria (novas correções pontuais) vão dessincronizar o `recon.json` do `bairros-goiania.json` atual se não houver processo formal de regeneração conjunta.
   - Recomendação: tratar como escopo mínimo desta fase promover um SNAPSHOT atual (o de hoje, já lido e validado), documentando explicitamente que futuras correções de nome (Fase 7 já entregue, não deve mudar) precisam re-gerar os dois artefatos juntos.

3. **Qual o tempo real de scan (3 páginas + count) em 4G para o Bueno?** — já era um blocker/concern aberto em `STATE.md` ("orçamento real do heatmap em setor grande no 4G não foi medido ao vivo"). Esta pesquisa mediu tempo em conexão de desenvolvimento (banda alta): ~1-4s por requisição sequencial. Isso NÃO é representativo de 4G real.
   - Recomendação: manter como HUMAN-UAT não-bloqueante (já sinalizado no ROADMAP/CONTEXT.md), mas o plano deve incluir o "Varrendo setor…" com paciência visual suficiente para 4G (a MOTION_MSG já prevista no UI-SPEC cobre isso).

## Environment Availability

Fase sem dependência de ferramenta/runtime nova — reusa Leaflet/proj4/Motion (CDN já carregado) e `node --test` (nativo). A única "dependência externa" real é o próprio endpoint ArcGIS da Prefeitura, verificado ao vivo nesta sessão:

| Dependência | Requerida por | Disponível | Detalhe | Fallback |
|---|---|---|---|---|
| `portalmapa.goiania.go.gov.br` (layer 3, `SVC`) | TERR-01/02/03 (scan de setor) | ✓ | HTTP 200 em 6 requisições sequenciais espaçadas nesta sessão; `returnCountOnly` para `cdbairro=16 AND vlvenal>0` = **57.225** (bate com `INTELIGENCIA-radar.md`); paginação por `resultOffset` sem overlap/gap entre páginas (OBJECTID 8-57874 / 57875-61206); `outFields` restrito funcionou 2× (589KB e 29,8KB de payload vs 2,9MB com `outFields=*`) | `outFields=*` (mais caro, documentado como sempre funcional) se a restrição falhar |
| `node --test` | Validation Architecture (TDD de TERR-03) | ✓ | `npm test` roda hoje 108/108 verdes (confirmado nesta sessão) | — |
| Leaflet 1.9.4 / `L.canvas` | TERR-02 (setStyle em massa) | ✓ | Já em uso para 1.206 polígonos de bairro + lotes por zoom | — |

**Sem dependências faltantes.** Nenhum item bloqueante ou com fallback necessário além do já descrito (fallback de `outFields` é uma robustez recomendada, não uma ausência real).

## Validation Architecture

### Test Framework
| Propriedade | Valor |
|---|---|
| Framework | `node --test` (nativo Node, sem framework externo) |
| Config file | nenhum — `package.json` script `"test": "node --test \"tests/*.test.mjs\""` |
| Quick run command | `node --test tests/territorio.test.mjs` (arquivo novo desta fase) |
| Full suite command | `npm test` (hoje: 108/108 verde, ~120ms) |

### Phase Requirements → Test Map
| Req ID | Comportamento | Tipo de teste | Comando automatizado | Arquivo existe? |
|---|---|---|---|---|
| TERR-03 | Quantil/mediana/Q1-Q3 de amostra de R$/m² (com guarda `areaedif`/`areaterr` null vs 0) | unit | `node --test tests/territorio.test.mjs` | ❌ Wave 0 |
| TERR-03 | Mix de uso (top 3 + "Outros"), usando `USO` já existente | unit | `node --test tests/territorio.test.mjs` | ❌ Wave 0 |
| TERR-03 | Idade mediana do cadastro a partir de `dtinclusao` (com validação `^\d{8}$`/sentinela `"00000000"`) | unit | `node --test tests/territorio.test.mjs` | ❌ Wave 0 |
| TERR-01 | `territorioScan` dedupe de chamada em voo (2 chamadas concorrentes = 1 rede) | unit (mock de `jsonp`) | `node --test tests/territorio.test.mjs` | ❌ Wave 0 |
| TERR-01 | Orçamento HARD ≤3 páginas paginadas por scan | unit (contagem de chamadas mock) + verificação AO VIVO manual (ver abaixo) | `node --test tests/territorio.test.mjs` (mock) | ❌ Wave 0 (mock) / HUMAN-UAT (ao vivo) |
| TERR-02 | `binDoQuantil`/paleta — mapeamento valor→faixa 1-5 é monotônico e cobre bordas (mínimo/máximo exato do setor) | unit | `node --test tests/territorio.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Por commit de task:** `node --test tests/territorio.test.mjs` (rápido, <1s)
- **Por merge de wave:** `npm test` (suíte completa, ~120ms hoje — negligível mesmo crescendo)
- **Gate de fase:** suíte completa verde + verificação AO VIVO manual do orçamento de requisições (abrir painel/choropleth do Bueno com DevTools Network aberto, contar requisições — critério de aceite literal do ROADMAP, não substituível por mock)

### Wave 0 Gaps
- [ ] `tests/territorio.test.mjs` — novo arquivo, mesmo padrão de `loadPureBlock()` de `tests/scores.test.mjs`, cobrindo as novas funções puras de TERR-03 (nomes exatos ficam a critério do planner/implementador — "Claude's Discretion" já delegado pelo CONTEXT.md)
- [ ] Entradas em `tests/fixtures.mjs` (ou um `fixtures-territorio.mjs` próprio, se o planner preferir seguir o precedente de arquivo de fixture dedicado por domínio) cobrindo: amostra com `areaedif=null` misturado com `areaedif=0` real (terreno vago) vs. ausente; `dtinclusao` válido/sentinela/ausente; mix de uso com >3 categorias presentes (testar agrupamento em "Outros")
- [ ] Mock de `jsonp`/`fetchWhere` (ou injeção de dependência equivalente) para testar dedupe/orçamento de `territorioScan` sem rede real — o app não tem harness de mock de rede hoje (os testes atuais só cobrem funções 100% síncronas/puras); este é o primeiro teste da Fase 15 que precisa mockar uma função assíncrona de rede, então a task de setup desse mock é um gap de infraestrutura de teste, não só de fixture
- [ ] Decisão de onde mora `idParaCdbairro`/`cdbairroParaIds` (Pattern 4) — se for testado como função pura, também nasce dentro do bloco `RADAR_PURE`

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`).

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Controle padrão |
|---|---|---|
| V2 Authentication | não | app sem autenticação/contas (client-only, decisão do milestone) |
| V3 Session Management | não | nenhuma sessão de servidor; "sessão" aqui é só o cache em memória (`TERRCACHE`), não segurança de sessão |
| V4 Access Control | não | nenhum dado privado por usuário; tudo é cadastro fiscal público |
| V5 Input Validation | **sim** | `cdbairro` interpolado em WHERE clause do ArcGIS REST deve passar por coerção numérica (`+cdbairro`) ANTES da interpolação — padrão já estabelecido em 4 pontos do código (linhas 2500, 2631, 2672, 2688); `territorioScan` deve seguir o MESMO padrão, mesmo que a origem (combo de busca / lookup `idParaCdbairro`) já seja "confiável" (defesa em profundidade) |
| V6 Cryptography | não | nenhum dado criptografado nesta fase (sem PII armazenada — nem sequer `localStorage`/IndexedDB nesta fase, que é escopo da Fase 16) |

### Known Threat Patterns para este stack

| Padrão | STRIDE | Mitigação padrão |
|---|---|---|
| Injeção de WHERE-clause via `cdbairro` não sanitizado (ArcGIS REST não é SQL puro, mas aceita expressões que podem ser abusadas se a origem do valor não for controlada) | Tampering | Coerção numérica (`+cdbairro`) antes de interpolar — já é o padrão do projeto, `territorioScan` deve herdá-lo explicitamente, não assumir que "vem de um combo confiável" é suficiente |
| Vazamento de campo pessoal (`dtnascimen`, etc.) por um novo caminho de agregação que não passa por `sanitiza()` | Information Disclosure | `territorioScan`/`territorioScanRun` DEVE reusar `fetchWhere()` (que já chama `sanitiza()`) OU chamar `sanitiza()` explicitamente se implementar sua própria variante de fetch paginado com `outFields` restrito — a allowlist de TERR-01 já EXCLUI `dtnascimen` por design (não está na lista de campos requisitados), então mesmo sem `sanitiza()` o campo nunca seria pedido ao servidor — mas manter `sanitiza()` como defesa em profundidade contra allowlist mal editada no futuro |
| Excesso de requisições / abuso do endpoint público de terceiro (o servidor já é documentado como frágil, 502 sob carga) | Denial of Service (contra o servidor da Prefeitura, não contra o app) | Orçamento HARD de 3 páginas + zoom-gate + cache/dedupe — já são controles de mitigação de carga, tratados como requisito funcional (TERR-01), não só como preocupação de segurança, mas cumprem o mesmo papel |

## Sources

### Primary (HIGH confidence — lido diretamente do código-fonte ou verificado ao vivo nesta sessão)
- `radar-goiania.html` — leitura direta das linhas citadas ao longo deste documento (config/SVC 1109-1116; RADAR_PURE 1135-2011; MOTION_MSG/toast/loading 2546-2558; JSONP 2050-2070; mapa/satélite/estilo 2073-2321; fetchWhere/buscar 2586-2688; combo/resolveBairro 2370-2523; comparáveis 3755-3838; guardas de área 1913, 2856)
- `bairros-goiania.json` — leitura direta (1.206 features, `properties={id,nm_bai,nm_disp}`, confirmado ausência de `cdbairro`)
- `bairros-goiania.recon.json` — leitura direta (1.205 entradas `id→{cdbairro,motivo,...}`, distribuição de `motivo` contada programaticamente)
- `gerar-bairros.py` — leitura direta (linha 468: "NENHUM lookup id->cdbairro é construído por este script")
- `sw.js` — leitura direta (`LOCAL` array, linhas 13-23 — confirma ausência de `recon.json` no precache)
- `tests/scores.test.mjs`, `tests/fixtures.mjs` — leitura direta (padrão de loader `node:vm`, formato de fixture)
- `package.json` — leitura direta (`"test":"node --test \"tests/*.test.mjs\""`)
- Verificação ao vivo do endpoint (`curl`, 6 requisições sequenciais espaçadas nesta sessão, 2026-07-09):
  1. `returnDistinctValues` para `nmbairro LIKE '%BUENO%'` → `cdbairro=16`
  2. `returnCountOnly` para `cdbairro=16 AND vlvenal>0` → `count=57225`
  3. Página 1 (`outFields=*`, `resultRecordCount=2000`, `resultOffset=0`) → 2000 features, 84 campos/registro, 3.041.621 bytes, `exceededTransferLimit:true`
  4. Página 2 (`resultOffset=2000`) → 2000 features, OBJECTID contíguo sem overlap com a página 1
  5. Página 1 com `outFields` restrito a 13 campos → 2000 features, 589.112 bytes, sem erro
  6. Consulta com `outFields` restrito a 2 campos, `resultOffset=4000` → 500 features, 29.788 bytes, sem erro
- `npm test` executado nesta sessão → 108/108 testes verdes

### Secondary (MEDIUM confidence — documentação do projeto, parcialmente superada pela verificação ao vivo)
- `ROADMAP-radar.md` §0 (fatos do endpoint, datados de 02-04/07/2026) — a linha "só `outFields=*` funciona" é CONTRADITA pela verificação ao vivo desta sessão (ver State of the Art); os demais fatos (502 sob carga, `returnGeometry=true` aceito, filtro `nrquadra LIKE` funcional) permanecem não-contraditados
- `INTELIGENCIA-radar.md` (achados empíricos de 10 frentes) — idem, item 2 sobre `outFields` parcialmente superado
- `.planning/research/v2.1/TERRITORIO.md` — estimativas de custo/ordem de build usadas como base de planejamento, mas a estimativa de payload por página (não medida ao vivo na pesquisa original) agora tem número real (3,04 MB `outFields=*` / 0,59 MB restrito) desta sessão
- `.planning/research/v2.1/PITFALLS.md` — Pitfall 3 (join id↔cdbairro) e Pitfall 5 (502 sob carga por N requisições) confirmados e refinados com o achado do `recon.json`

### Tertiary (LOW confidence — não verificado nesta sessão)
- Tempo real de scan em 4G (Open Question 3) — medido nesta sessão só em banda de desenvolvimento, não é representativo de campo
- Estabilidade de longo prazo do `outFields` restrito sob carga real do servidor (Assumption A1)
- Severidade real do viés de amostragem por `OBJECTID` (Assumption A3) — não medido, só inferido estruturalmente

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero dependência nova, tudo já em produção e lido diretamente
- Architecture (anchors de código): HIGH — toda linha citada foi lida nesta sessão, não é recall de treinamento
- Endpoint/custo de requisições: HIGH para os números medidos ao vivo agora (count, payload, paginação); MEDIUM para a generalização a outros setores/horários (não testado)
- Gap id↔cdbairro (Pattern 4): HIGH quanto ao PROBLEMA (confirmado por leitura de 3 arquivos independentes); MEDIUM quanto à SOLUÇÃO recomendada (promover o `recon.json` é a opção de menor esforço, mas não foi validada com o usuário/planner ainda — ver Open Question 2)
- Pitfalls: HIGH — todos ancorados em código lido ou em teste ao vivo, nenhum por analogia pura

**Research date:** 2026-07-09
**Valid until:** ~14 dias para os achados de endpoint (servidor de terceiro documentado como instável — comportamento pode mudar sem aviso); ~30 dias para os achados de código-fonte (arquivo único, só muda por commit deste próprio projeto, rastreável por `git log`)
