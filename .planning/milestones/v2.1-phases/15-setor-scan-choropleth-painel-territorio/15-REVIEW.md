---
phase: 15-setor-scan-choropleth-painel-territorio
reviewed: 2026-07-09T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - radar-goiania.html
  - sw.js
  - bairro-cdbairro.json
  - tests/territorio.test.mjs
  - tests/fixtures.mjs
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-07-09
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Revisão focada no diff da Fase 15 (`9e3b89c^..HEAD`): estatísticas puras de território (`RADAR_PURE`),
varredura de rede compartilhada (`TERR_NET`: `territorioScan`/`fetchWhereRestrito`/`TERRCACHE`),
choropleth (`lotStyle`/`baiStyle`/`aplicarChoropleth`/`desenharChoropleth`/`#terrLegenda`) e o Painel
do Território (`#terrPanel`).

Nenhum problema de **segurança/PII/XSS** foi encontrado: `TERR_FIELDS` não inclui `dtnascimen`, o WHERE
usa coerção numérica de `cdbairro` (nenhuma interpolação de string crua — confirmado por teste), e
`sanitiza()` é aplicado nos dois caminhos de `fetchWhereRestrito` (restrito e fallback). Todo texto
derivado do endpoint no painel/legenda passa por `textContent`/`esc()`, nunca `innerHTML` com dado
cru. As chamadas a `lotStyle()`/`baiStyle()` foram corretamente atualizadas em **todos** os pontos
(`setSatelite`, `refreshLots`, `highlightBairro`, `clearBaiHi`, `desenharChoropleth`) — não há
regressão de estilo/hit-area, e `fillOpacity` do choropleth nunca é 0.

Os problemas reais encontrados são de **orçamento de rede** (o fallback de `outFields` pode dobrar o
orçamento de 3 páginas documentado), de **wiring incompleto** (a legenda do choropleth nunca recebe
seus rótulos numéricos, porque `montarLegenda()` é definida mas jamais chamada) e de **coordenação de
sheets** (`#terrPanel` não é fechado ao abrir `#detail`/`#chooser`, e o "tentar de novo" da varredura
parcial usa `baiHi` global em vez do layer original). Nenhum é crítico (sem crash, sem vazamento de
dado, sem injeção), mas os dois primeiros afetam a experiência central da feature (legenda vazia
sempre que o choropleth é ligado; orçamento de rede maior que o anunciado em cenários de erro
parcial).

## Warnings

### WR-01: `montarLegenda()` é definida mas nunca chamada — legenda do choropleth fica sem rótulos

**File:** `radar-goiania.html:2471` (definição), chamada ausente em `radar-goiania.html:2505` (`toggleChoropleth`) e `radar-goiania.html:3034-3048` (`abrirTerritorio`)
**Issue:** `montarLegenda(st)` é a única função que preenche `#terrLbl1..5` (as faixas de R$/m²) e
`#terrAmostra` (o rótulo obrigatório de honestidade `rotuloAmostra`), além de tornar `#terrLegenda`
visível. Nenhum caminho de execução chama essa função — nem `aplicarChoropleth()`, nem
`abrirTerritorio()`, nem `toggleChoropleth()`. Em vez disso, `toggleChoropleth()` alterna
`leg.hidden=!CHOROPLETH_ON` diretamente, então a legenda aparece ao ligar o choropleth, mas com os 5
swatches de cor **sem nenhum valor numérico** e sem a frase "Amostra de N de M lotes" — o requisito de
honestidade estatística do UI-SPEC ("nunca omitido, mesmo com amostra completa") fica violado em todo
uso real da feature. Como os testes de `tests/territorio.test.mjs` cobrem só as funções puras e o
bloco `TERR_NET` (sem DOM), esse gap de wiring não é pego pela suíte atual.
**Fix:**
```js
async function abrirTerritorio(layer){
  ...
  const scan=await territorioScan(cd);
  loading(true,MOTION_MSG.faixas);
  const st=aplicarChoropleth(scan);
  montarLegenda(st); // <- faltava: popula #terrLbl1..5 + #terrAmostra
  montarPainel(scan,st,layer||baiHi);
  ...
}
```

### WR-02: fallback de `outFields` pode dobrar o orçamento HARD de páginas (até 6, não ≤3)

**File:** `radar-goiania.html:2959-2977` (`fetchWhereRestrito`)
**Issue:** `varrePaginas(useFields)` usa um `guard` local reiniciado do zero a cada chamada. Se
`d.error` ocorrer **na 1ª página**, o custo é 1 requisição perdida + até 3 da tentativa `outFields="*"`
(4 no total) — cenário coberto pelo teste. Mas se o erro ocorrer na 2ª ou 3ª página (qualquer erro do
servidor, não só rejeição de `outFields` — o código captura `d.error` genericamente, não apenas o
código 400 específico de campo inválido), as páginas já buscadas com sucesso são descartadas e o
`catch` reinicia a varredura completa do zero com `outFields="*"`, gastando até **3 + 3 = 6**
requisições paginadas numa única `territorioScan` — o dobro do orçamento "HARD ≤3 requisições
paginadas" documentado no próprio comentário do bloco (`TERR_NET_START`) e no `CONTEXT.md`/ROADMAP
citado. `tests/territorio.test.mjs` só testa a falha imediata na 1ª página (linha ~193-218); o cenário
de falha após 1-2 páginas bem-sucedidas não tem cobertura nem proteção no código.
**Fix:** somar as duas tentativas num único orçamento (ex.: passar `maxPages - guardJaGasto` para a
chamada de fallback, ou usar um `guard` compartilhado fora de `varrePaginas`) para garantir que o total
de páginas entre as duas tentativas nunca exceda `maxPages`:
```js
async function fetchWhereRestrito(where,fields,maxPages){
  let guardTotal=0;
  async function varrePaginas(useFields){
    let all=[],offset=0,page=2000;
    while(true){
      if(guardTotal>=maxPages)break; // orçamento COMPARTILHADO entre as 2 tentativas
      const d=await jsonp({...});
      __terrReq++; guardTotal++;
      ...
    }
    return all;
  }
  ...
}
```

### WR-03: abrir `#detail`/`#chooser` não fecha `#terrPanel` — sheets podem se sobrepor

**File:** `radar-goiania.html:3952` (`showDetail`), `radar-goiania.html:3309` (`finish`), `radar-goiania.html:3868` (`closeChooser`)
**Issue:** `abrirTerritorio()` (linha 3034) chama `closeDetail()` antes de abrir `#terrPanel` — a regra
"1 sheet por vez" é respeitada nessa direção. Mas na direção contrária não há simetria: `showDetail()`
e `finish()` (que abre `#chooser`) nunca fecham `#terrPanel`. Como `#terrPanel`, `#detail` e `#chooser`
compartilham a mesma classe `.detail` (mesma posição `absolute`/`z-index:500`, `radar-goiania.html:377`)
e `#terrPanel` aparece **depois** de `#detail` no DOM (inserido após `</div>` do `#detail` original),
se o usuário abre o Painel do Território e depois toca num lote no mapa (`loadCi`→`finish`→
`showDetail`), o novo `#detail` recebe a classe `show` mas fica **visualmente atrás** de `#terrPanel`
(mesmo z-index, ordem de DOM decide o empilhamento) — o usuário não vê nenhuma mudança e pode pensar
que o toque não funcionou.
**Fix:** fechar `#terrPanel` no início de `showDetail()` e de `finish()` (mesmo padrão já usado por
`closeChooser()` dentro de `finish()`):
```js
function finish(items,fromMap){
    closeChooser();
    fecharTerrPanel(); // <- fecha o painel de território antes de qualquer novo resultado
    ...
```

### WR-04: retry de varredura parcial usa `baiHi` global em vez do layer original

**File:** `radar-goiania.html:3172` (`checarVarreduraParcial`)
**Issue:** `av.onclick=()=>{delete TERRCACHE[String(scan.cdbairro)];abrirTerritorio(baiHi);}` fecha
sobre a variável **global** `baiHi`, não sobre o `layer` que originou a varredura parcial (`scan`). Se
o usuário passar o mouse sobre outro bairro no mapa (o que atualiza `baiHi` via `highlightBairro`,
`radar-goiania.html:2600-2608`) enquanto o aviso de varredura parcial está visível, o clique em "tentar
de novo" invalida o cache do setor **correto** (`scan.cdbairro`) mas reabre o território do bairro
**errado** (o `baiHi` atual). O próprio código já reconhece esse risco em outro lugar — o comentário de
`mostrarVerTerr()` (linha ~2609) diz explicitamente "onclick é atribuído dinamicamente pra sempre abrir
o território do layer atual (nunca um baiHi desatualizado)" — mas essa disciplina não foi aplicada aqui.
**Fix:** capturar o layer no fechamento, não o global:
```js
function checarVarreduraParcial(scan,layer){
  ...
  av.onclick=()=>{delete TERRCACHE[String(scan.cdbairro)];abrirTerritorio(layer);};
  ...
}
// no chamador (abrirTerritorio): checarVarreduraParcial(scan, layer||baiHi);
```

## Info

### IN-01: `cdbairroParaIds` é construído mas nunca consumido

**File:** `radar-goiania.html:2361-2372` (`carregarLookupCdbairro`)
**Issue:** O Map reverso `cdbairroParaIds` (cdbairro → lista de `id`s de polígono) é populado a cada
carga do lookup, mas nenhuma função no diff (ou no restante do arquivo) o lê. Código morto — custa
memória/CPU sem benefício atual.
**Fix:** remover até que uma feature real precise da busca reversa, ou comentar como reserva intencional para v2.1.

### IN-02: `TERR_LOTE_BIN` é substituído por completo a cada `aplicarChoropleth()`, mas `TERR_SETOR_ATIVO` nunca é limpo

**File:** `radar-goiania.html:2448-2461` (`aplicarChoropleth`), `TERR_SETOR_ATIVO` declarado em `radar-goiania.html:2373` (ver contexto de bloco em ~2404)
**Issue:** `TERR_LOTE_BIN=new Map()` descarta as faixas por lote do setor anterior a cada nova
varredura, enquanto `TERR_SETOR_ATIVO.add(scan.cdbairro)` acumula para sempre. Resultado: depois de
visitar 2 setores na mesma sessão, o contorno do primeiro setor continua "aceso" (wash de faixa 3 fixa
em `baiStyle`) mas os lotes dele voltam ao estilo neutro (sem cor por faixa), pois `TERR_LOTE_BIN` só
guarda o setor mais recente. Não é um crash nem gera dado incorreto, mas é uma inconsistência visual
observável ao alternar entre setores.
**Fix:** decidir e documentar o comportamento pretendido: (a) manter os bins de todos os setores já
escaneados (merge em vez de substituir o Map, exige guardar `breaks` por setor, não um único
`TERR_BREAKS` global), ou (b) remover do `TERR_SETOR_ATIVO` os cdbairros cujo lote não está mais em
`TERR_LOTE_BIN` ao trocar de setor, deixando claro que só o setor mais recente fica "ativo".

### IN-03: `mixUso` pode gerar chips duplicados com o rótulo "—" quando há usos fora do domínio conhecido

**File:** `radar-goiania.html` (bloco `RADAR_PURE`, função `mixUso`)
**Issue:** `USO[x.uso]!=null?USO[x.uso]:"—"` — se mais de um código de uso fora de `USO` (0–6) aparecer
entre os top-3 de um setor, o Painel do Território mostraria dois chips idênticos rotulados "—" sem
diferenciação. Cenário raro (o cadastro real só usa 0–6), mas vale um guard cosmético.
**Fix:** incluir o código bruto no rótulo de fallback, ex. `` `— (${x.uso})` ``, para nunca colidir visualmente.

---

_Reviewed: 2026-07-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
