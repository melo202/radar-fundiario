---
phase: 18-inteligencia-urbanistica-plano-diretor
reviewed: 2026-07-10T05:19:26Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/pd.test.mjs
  - tests/fixtures.mjs
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-07-10T05:19:26Z
**Depth:** standard
**Files Reviewed:** 3
**Diff base:** `72bb928` (pai de `04c81b6`, 1º commit `18-01`) até `HEAD` (`1b952bf`, hotfix `outFields=*` incluído)

## Summary

Revisão focada no diff da Fase 18 (núcleo de dados urbanísticos do Plano Diretor — RADAR_PURE, PD_NET, accordion Urbanístico, detector com critério PD, choropleth de zonas viewport-limited). Rodei a suíte completa (`node --test tests/*.mjs`, 234 testes, incluindo os 49 novos de `tests/pd.test.mjs`) — **todos passam, nenhuma regressão**. A REGRA DE OURO (nenhum dígito de CA sem `conferido===true`) é bem guardada tanto no núcleo puro quanto no render, com testes de string dedicados. XSS: toda saída de layer (nome/sigla) passa por `esc()`/`textContent`; nenhum `innerHTML` com dado cru do endpoint. `toggleChoropleth()`/`#terrPanelToggle` (Fase 15) foram removidos por completo — nenhum call-site órfão restante (grep confirma só comentários mencionando o nome antigo). O choropleth de valor da Fase 15 continua funcionando (`baiStyle`/`lotStyle`/`desenharChoropleth` inalterados, ainda leem `CHOROPLETH_ON`).

Encontrei 4 avisos e 1 item informativo, nenhum crítico. O mais relevante é a ausência de um gate de zoom/tamanho de viewport na nova camada de zonas (`desenharZonas`/`carregarZonasViewport`), que — ao contrário de `refreshLots` (gate `zoom<17`) — pode disparar uma consulta com `returnGeometry:true` para 6 layers cobrindo a cidade inteira se o usuário der zoom-out com a camada ligada, violando o invariante "nunca a cidade inteira" documentado no próprio código (T-18-02). Também encontrei uma badge redundante (ADD aparece como badge de atenção mesmo quando a própria Unidade Territorial resolvida já é ADD) e uma race condition sem guarda de invalidação em `renderDetectorCriterioPD()` (rótulos de critério PD podem vazar para o candidato errado se o usuário re-rodar o scan enquanto a consulta anterior ainda está em voo) — reproduzi ambos com scripts isolados via `node:vm`, evidência incluída abaixo.

## Warnings

### WR-01: Camada de zonas do Plano Diretor sem gate de zoom/tamanho de viewport — pode consultar praticamente a cidade inteira

**File:** `radar-goiania.html:3297-3328` (`desenharZonas`), `radar-goiania.html:2946-2948` (listener `moveend`), bloco `PD_ZONA_NET` (`carregarZonasViewport`)

**Issue:** O código documenta explicitamente o invariante "NUNCA a cidade inteira" (T-18-02, comentários em `desenharZonas`/`carregarZonasViewport`) e mede o custo em 86 KB/12 polígonos para uma viewport de 4×4 km — mas nada no caminho de execução impõe um limite de zoom ou de área. `refreshLots` (padrão pré-existente, Fase 1) tem um gate explícito (`if(map.getZoom()<17)`) antes de consultar lotes; `desenharZonas` não tem equivalente algum:

```js
map.on("moveend",()=>{ if(ZONAS_ON){clearTimeout(ZONASDEB);ZONASDEB=setTimeout(desenharZonas,300);} });
...
async function desenharZonas(){
  if(!ZONAS_ON||typeof map==="undefined"||!map)return;
  const sz=map.getSize();
  if(!sz.x||!sz.y)return;
  ...
  porZona=await carregarZonasViewport(map.getBounds()); // bounds SEM limite de tamanho
```

Na prática, o fluxo típico (clicar num bairro → `drillBairro` faz `fitBounds` no setor) mantém o zoom alto o suficiente. Mas nada impede o usuário de dar scroll-out manualmente com o chip "zonas" ligado (ou abrir o painel do Território sem nunca ter zoomado muito, dependendo de como o setor foi alcançado) — nesse caso `moveend` dispara `carregarZonasViewport(map.getBounds())` com um envelope arbitrariamente grande, `returnGeometry:"true"` para 6 layers, contra o servidor de produção da Prefeitura (o mesmo `Mapa_ModeloEspacial` que `refreshLots` deliberadamente protege).

**Fix:**
```js
async function desenharZonas(){
  if(!ZONAS_ON||typeof map==="undefined"||!map)return;
  if(map.getZoom()<13){ // mesmo espírito do gate de refreshLots (zoom<17) — zonas cobrem área maior, threshold mais baixo
    limparZonas();
    const am=document.getElementById("terrAmostra");
    if(am)am.textContent="Aproxime o mapa para ver as zonas do Plano Diretor.";
    return;
  }
  const sz=map.getSize();
  ...
```

---

### WR-02: `badges.add` é redundante com (e sempre verdadeiro quando) a Unidade Territorial resolvida já é ADD

**File:** `radar-goiania.html:3234-3241` (bloco `badges` em `resolverZonaUI`)

**Issue:** `resolverZonaUI` computa `badges.add=temFeature("add")` de forma totalmente independente do laço que resolve `unidade` (`for(const key of ["aa","add","aos"])`), mas **os dois consomem a MESMA resposta da layer `add`**. Quando o lote resolve `unidade.sigla==="ADD"`, o badge "Desaceleração de Densidade (ADD)" também acende — o accordion mostra a mesma informação duas vezes (uma vez como "Unidade Territorial", outra como badge de atenção), o que pode confundir o corretor achando que são dois fatos distintos.

Reproduzido isolando o bloco RADAR_PURE via `node:vm`:
```
unidade: {"sigla":"ADD","nome":"Área de Desaceleração de Densidade"}
badges: {"aeis":false,"apac":false,"add":true,"eixo":false,"corredor":false}
HTML: ...<div class="v">ADD — Área de Desaceleração de Densidade</div>...
      <span class="urb-badge is-atencao">Desaceleração de Densidade (ADD)</span>
```

**Fix:** suprimir `badges.add` quando ele coincide com a própria unidade resolvida:
```js
let unidade=null,regra=null;
for(const key of ["aa","add","aos"]){ /* ... inalterado ... */ }
badges.add = badges.add && !(unidade&&unidade.sigla==="ADD"); // não duplica a mesma info como badge
```

---

### WR-03: Precedência AA > ADD > AOS em `resolverZonaUI` não documentada nem testada para o caso de sobreposição

**File:** `radar-goiania.html:3242-3250`

**Issue:** O laço `for(const key of ["aa","add","aos"])` resolve a unidade territorial pegando a PRIMEIRA layer que intersecta o ponto, na ordem fixa `aa`, `add`, `aos`. Se as geometrias oficiais se sobrepuserem numa borda (imprecisão de snapping é comum em bases cadastrais municipais), o lote é silenciosamente classificado como AA (CA máximo 6,0x) quando poderia ser ADD (CA máximo 5,0x) — uma diferença real de potencial construtivo reportada ao usuário sem qualquer nota de ambiguidade. Reproduzi o cenário via `node:vm`: com `aa` e `add` ambos com feature, o resultado é sempre `unidade.sigla==="AA"`, sem qualquer registro de que `add` também intersectou (o "vazamento" do badge do WR-02 é o único sintoma visível, e nem sempre — ver WR-02, só aparece quando a unidade NÃO é ADD). Nenhum teste em `tests/pd.test.mjs` cobre esse caso de sobreposição.

**Fix:** documentar explicitamente por que AA tem precedência sobre ADD/AOS (idealmente citando a fonte que garante que as unidades territoriais são disjuntas, se for o caso), e adicionar um caso de teste em `PD_FIX.respostas` cobrindo AA+ADD ambos presentes, fixando o comportamento esperado como contrato explícito (não um acidente de ordem de array).

---

### WR-04: `renderDetectorCriterioPD()` sem guarda de invalidação — rótulo de critério PD pode vazar para o candidato errado

**File:** `radar-goiania.html:4431-4443`

**Issue:** `TERR_DETECTOR_CAND` é reatribuído a uma NOVA referência de array a cada `renderDetectorLista()` (`TERR_DETECTOR_CAND=cand||[];`, linha ~4371). `renderDetectorCriterioPD()` captura a referência antiga localmente (`const cand=TERR_DETECTOR_CAND`) e, ao resolver, escreve nos elementos `#terrdetCrit{i}` por ÍNDICE POSICIONAL:

```js
async function renderDetectorCriterioPD(){
  const cand=TERR_DETECTOR_CAND;
  if(!cand||!cand.length)return;
  try{
    const porQuadra=await consultarPDPorQuadra(cand);
    cand.forEach((a,i)=>{
      const el=document.getElementById("terrdetCrit"+i);
      if(!el)return; // só protege contra elemento REMOVIDO, não reaproveitado
      const info=detectorRotuloPD(a,porQuadra);
      el.textContent=info?info.rotulo:"";
    });
  }catch(e){}
}
```

Se o usuário rodar um novo scan de território (ou o detector for re-renderizado) ANTES desta Promise resolver, o novo `renderDetectorLista` recria os MESMOS ids (`terrdetCrit0`, `terrdetCrit1`, ...) para uma lista de candidatos DIFERENTE. O `if(!el)return` só cobre o caso em que o elemento sumiu (lista encolheu); quando o elemento existe mas agora pertence a outro lote, a Promise antiga sobrescreve o rótulo com o critério/zona/CA do candidato ERRADO — o mesmo padrão de bug que `SEARCHTOKEN`/`DRILLTOKEN`/`ZONASTOKEN`/o guard `DCUR!==a` já existem no arquivo para prevenir, mas que não foi replicado aqui.

**Fix:**
```js
async function renderDetectorCriterioPD(){
  const cand=TERR_DETECTOR_CAND;
  if(!cand||!cand.length)return;
  try{
    const porQuadra=await consultarPDPorQuadra(cand);
    if(TERR_DETECTOR_CAND!==cand)return; /* lista foi re-renderizada enquanto a Promise resolvia */
    cand.forEach((a,i)=>{
      const el=document.getElementById("terrdetCrit"+i);
      if(!el)return;
      const info=detectorRotuloPD(a,porQuadra);
      el.textContent=info?info.rotulo:"";
    });
  }catch(e){}
}
```

## Info

### IN-01: Accordion "Urbanístico" fica visível e expansível mesmo sem coordenadas, revelando corpo vazio

**File:** `radar-goiania.html:5597-5600`

**Issue:** `renderUrbanisticoUI` só esconde `#dUrbBody` (`body.hidden=true`) quando o imóvel não tem `x_coord`/`y_coord`; o `<details id="dUrbanistico">`/`<summary>Urbanístico</summary>` continuam visíveis. Diferente de `#dDiff` (bloco autocontido que se esconde por inteiro), o usuário pode tocar em "Urbanístico" e ver um accordion vazio sem nenhuma explicação — um beco sem saída de UX. Ausência de coordenada é um caso real e já tratado em outros pontos do app (`compare()`, `#dActsPrim`, linha 5358/5124), não uma hipótese teórica.

**Fix:**
```js
function renderUrbanisticoUI(a,isRetry){
  const acc=document.getElementById("dUrbanistico"),body=document.getElementById("dUrbBody");
  if(!acc||!body)return;
  if(!a||!a.x_coord||!a.y_coord){acc.hidden=true;body.hidden=true;return;}
  acc.hidden=false; // restaura visibilidade caso o lote anterior tivesse escondido o accordion inteiro
  body.hidden=false;
  ...
```

---

_Reviewed: 2026-07-10T05:19:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
