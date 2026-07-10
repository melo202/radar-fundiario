---
phase: 17-diff-cadastro-cruzamento-caixa
reviewed: 2026-07-10T02:56:25Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - radar-goiania.html
  - tests/diff-caixa.test.mjs
  - tests/caderno.test.mjs
  - tests/fixtures.mjs
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-10T02:56:25Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Revisão focada no diff introduzido pela Fase 17 (base: `5328627` — pai do primeiro commit
`17-01`), cobrindo `diffLote`/`formatarDiff`, o cruzamento Caixa↔território
(`construirNomeParaCdbairro`/`cdbairroDoImovelCaixa`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor`), a
allowlist LGPD recursiva de `snapshot` em `sanitizeCaderno`, `renderDiffUI`/`#dDiff`, e a superfície
de UI da Caixa (badge do Caderno, linha do Painel, anel/popup/legenda, `toggleCaixa`/
`abrirCaixaNoMapaUI`/`garantirCaixaLayer`).

**LGPD/PII:** a allowlist recursiva do `snapshot` dentro de `sanitizeCaderno` está correta e bem
testada — `dtnascimen`/`cpf` nunca sobrevivem dentro de `snapshot`, mesmo via import, e `snapshot`
malformado (string/array) é descartado por completo. `snapshotAt` não-string é descartado sem
afetar o `snapshot` em si. Os 5 campos de `DIFF_ALLOW` nunca incluem PII.

**XSS:** `renderDiffUI` usa `textContent`/`createElement` exclusivamente (nunca `innerHTML` com dado
dinâmico); o badge do Caderno e a linha do Painel usam `onclick` fixo (`abrirCaixaNoMapaUI(this)`)
com o valor lido via `dataset.bairros` (nunca interpolado no atributo `onclick=""`); a nova linha do
popup Caixa (`.cxp-terr`) é 100% estática, sem interpolação.

**Correção/regressões:** `diffLote`/`formatarDiff`/matching Caixa estão bem cobertos por testes
(184/184 verdes) e sem falso positivo óbvio (match só exato pós-`norm()`, guard `i.x&&i.y`
consistente com `initCaixa`). Nenhum call-site antigo de `caixaPopup(i)` ficou com a assinatura
velha — o único call-site foi atualizado para `caixaPopup(i,noTerr)`. `toggleCaixa`/
`abrirCaixaNoMapaUI` async não quebram os `onclick=""` síncronos que os chamam. `BAIRROS` (antes
sempre `[]`) agora é populado em `loadBairroPolys`, e é lido apenas pelo novo
`garantirNomeParaCdbairro` — nenhum outro consumidor pré-existente depende do valor antigo.

Dois problemas de escopo/concorrência (Warnings) foram encontrados — nenhum é crítico de
segurança/PII, mas ambos afetam a confiabilidade da feature entregue nesta fase.

## Warnings

### WR-01: `garantirCaixaLayer()` não é idempotente sob chamadas concorrentes — pode duplicar/orfanar a camada Caixa no mapa

**File:** `radar-goiania.html:6435-6456`
**Issue:** O comentário da função afirma "Idempotente (no-op se já construído)", mas isso só vale
depois que `caixaLayer` já foi atribuído. O guard de entrada (`if(caixaLayer||...)return;`) é
verificado de forma síncrona ANTES do único `await` da função:

```js
async function garantirCaixaLayer(){
  if(caixaLayer||!window.CAIXA||!CAIXA.imoveis)return;
  const [nomeMap,itens]=await Promise.all([garantirNomeParaCdbairro(),cadernoListar({}).catch(()=>[])]);
  caixaLayer=L.layerGroup();
  caixaAnelLayer=L.layerGroup();
  ...
}
```

Se duas chamadas concorrentes ocorrerem antes de `caixaLayer` ser atribuído — cenário plausível
(ex.: usuário faz `toggle on → off → on` rápido no botão `#btnCaixa`, o que dispara duas invocações
de `garantirCaixaLayer()` porque a 2ª chamada `off` retorna antes de chamar a função de novo, mas a
3ª chamada `on` invoca a função de novo enquanto a 1ª ainda está em voo; ou o usuário toca o botão
`#btnCaixa` e o badge/linha Caixa quase ao mesmo tempo, já que ambos chamam
`garantirCaixaLayer()`) — **ambas** as chamadas passam o guard, e cada uma constrói seu próprio
`L.layerGroup()` populado com os mesmos pinos, sobrescrevendo a variável global `caixaLayer`/
`caixaAnelLayer`. Quem "ganha" a atribuição final depende de qual `Promise.all` resolve por último.

Consequência prática: se a camada A já foi adicionada ao mapa (`caixaLayer.addTo(map)` em
`toggleCaixa`, lido logo após o próprio `await`) e a camada B sobrescreve a referência global depois
disso, a camada A fica "presa" no mapa — nenhuma chamada futura a `toggleCaixa()`
(`map.removeLayer(caixaLayer)`) consegue removê-la, pois `caixaLayer` já aponta para B. O usuário vê
pinos Caixa duplicados e o botão "desligar" não consegue mais limpá-los sem recarregar a página.

O próprio código-base já tem o padrão idiomático para resolver isso — `territorioScan()`
(`radar-goiania.html:3456-3463`) faz dedupe de chamada em voo com um cache de Promise, e há inclusive
um teste cobrindo esse comportamento ("territorioScan: dedupe de chamada em voo — 2 chamadas
concorrentes disparam UMA varredura"). `garantirCaixaLayer()` não segue essa mesma convenção.

**Fix:**
```js
let caixaLayerBuilding=null;
async function garantirCaixaLayer(){
  if(caixaLayer||!window.CAIXA||!CAIXA.imoveis)return;
  if(caixaLayerBuilding)return caixaLayerBuilding; // dedupe de chamada em voo (mesmo padrão de territorioScan)
  caixaLayerBuilding=(async()=>{
    const [nomeMap,itens]=await Promise.all([garantirNomeParaCdbairro(),cadernoListar({}).catch(()=>[])]);
    const cdbairrosSalvos=new Set((itens||[]).map(it=>it&&it.cdbairro).filter(v=>v!=null));
    const layer=L.layerGroup(), anel=L.layerGroup();
    CAIXA.imoveis.filter(i=>i.x&&i.y).forEach(i=>{
      const noTerr=cdbairroDoImovelCaixa(i,nomeMap).some(cd=>cdbairrosSalvos.has(cd));
      L.circleMarker(toWGS(i.x,i.y),{radius:7,color:"#141a1f",weight:1.5,fillColor:"#a8842c",fillOpacity:.95,bubblingMouseEvents:false})
        .bindPopup(caixaPopup(i,noTerr)).addTo(layer);
      if(noTerr)L.circleMarker(toWGS(i.x,i.y),{radius:10,color:"#141a1f",weight:2,fillOpacity:0,bubblingMouseEvents:false}).addTo(anel);
    });
    caixaLayer=layer;caixaAnelLayer=anel;
  })();
  try{await caixaLayerBuilding;}finally{caixaLayerBuilding=null;}
}
```

### WR-02: `salvarDetectorNoCadernoUI` não grava `snapshot`/`snapshotAt` — lotes salvos pelo Detector nunca ativam o diff

**File:** `radar-goiania.html:3961-3990` (item sem snapshot) vs. `radar-goiania.html:5009-5062`
(`renderDiffUI`, guard que nunca faz backfill)
**Issue:** `salvarNoCadernoUI` (linha ~5064) foi atualizada na Fase 17 para gravar
`item.snapshot`/`item.snapshotAt` no 1º save. Porém `salvarDetectorNoCadernoUI` — a outra ação de
"1 toque" que grava no Caderno, usada pelo Detector de Lote Subutilizado (Fase 16) — **não** recebeu
o mesmo tratamento:

```js
// salvarDetectorNoCadernoUI (linha 3976), sem snapshot/snapshotAt:
const item={
  ci,nrinscr:clean(a.nrinscr),cdbairro:a.cdbairro,nrquadra:a.nrquadra,nrlote:a.nrlote,
  vlvenal:a.vlvenal,areaedif:a.areaedif,areaterr:a.areaterr,vlimp98:a.vlimp98,
  dtinclusao:a.dtinclusao,uso:a.uso
};
```

E `renderDiffUI` só grava (`cadernoAtualizar`) um snapshot novo **dentro** do branch que já exige
`item.snapshot` existente:

```js
if(!item||!item.snapshot){el.hidden=true;return;} // nunca chega a gravar snapshot aqui
...
cadernoAtualizar(ci,{snapshot:{...},snapshotAt:...}) // só executa se item.snapshot já existia
```

Como não há nenhum caminho de código que faça "backfill" de `snapshot` para um item já salvo sem
esse campo, qualquer lote salvo via Detector (ou importado de um Caderno anterior à Fase 17) nunca
vai ativar `#dDiff` — o bloco fica `hidden` para sempre para esses itens, silenciosamente, sem
qualquer indicação ao usuário de que o recurso "não está disponível para este lote específico". O
`17-02-PLAN.md` documenta esse comportamento como intencional apenas para o caso "lote nunca salvo"
(`!item`), não para "item salvo sem snapshot" via um 2º fluxo de salvamento que a própria Fase 17
deixou destalhado.

**Fix:** gravar o mesmo subconjunto `DIFF_ALLOW` também em `salvarDetectorNoCadernoUI`, espelhando
`salvarNoCadernoUI`:
```js
const item={
  ci,nrinscr:clean(a.nrinscr),cdbairro:a.cdbairro,nrquadra:a.nrquadra,nrlote:a.nrlote,
  vlvenal:a.vlvenal,areaedif:a.areaedif,areaterr:a.areaterr,vlimp98:a.vlimp98,
  dtinclusao:a.dtinclusao,uso:a.uso,
  snapshot:{vlvenal:a.vlvenal,areaedif:a.areaedif,vlimp98:a.vlimp98,uso:a.uso,dtinclusao:a.dtinclusao},
  snapshotAt:new Date().toISOString()
};
```
(Alternativamente, se for uma omissão deliberada, documentar a decisão no plano/summary da Fase 17
para deixar claro que o diff é exclusivo do fluxo de salvamento pela ficha.)

## Info

### IN-01: `cdbairroDoImovelCaixa` chamado duas vezes para o mesmo imóvel em `cruzarCaixaTerritorio`

**File:** `radar-goiania.html:2576-2583`
**Issue:** `matches` é calculado com um `.filter` que já chama `cdbairroDoImovelCaixa(i,nomeParaCdbairro)`
para cada imóvel; em seguida `bairros` refaz a mesma chamada para os imóveis já filtrados em
`matches`, via `flatMap`. É apenas duplicação de trabalho/lógica (não é bug funcional — os testes
cobrem o resultado corretamente), mas fica mais simples de ler e manter calculando os códigos uma
única vez por imóvel.
**Fix:**
```js
function cruzarCaixaTerritorio(imoveisCaixa,itensCaderno,nomeParaCdbairro){
  const cdbairrosSalvos=new Set((itensCaderno||[]).map(it=>it&&it.cdbairro).filter(v=>v!=null));
  const matches=[],bairrosSet=new Set();
  (imoveisCaixa||[]).filter(i=>i&&i.x&&i.y).forEach(i=>{
    const cds=cdbairroDoImovelCaixa(i,nomeParaCdbairro).filter(cd=>cdbairrosSalvos.has(cd));
    if(cds.length){matches.push(i);cds.forEach(cd=>bairrosSet.add(cd));}
  });
  return {matches,bairros:Array.from(bairrosSet),n:matches.length};
}
```

---

_Reviewed: 2026-07-10T02:56:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
