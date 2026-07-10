---
phase: 19-estetica-premium-tipografia
reviewed: 2026-07-10T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - radar-goiania.html
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-07-10
**Depth:** standard (diff-scoped, base = pai do primeiro commit `19-01`, hash `71fde5446f3af9bcf5269cafb35b6608f6cdbdfb`)
**Files Reviewed:** 1 (`radar-goiania.html`)
**Status:** issues_found

## Summary

Revisão focada no diff da Fase 19 (293 inserções / 229 deleções em `radar-goiania.html`, commits `19-01`→`19-03`): fundação tipográfica (Archivo + JetBrains Mono via `@font-face` base64 + CSP `font-src`), sistema de elevação (`--elev-0/1/2/3`) e utilitário único de focus-trap aplicado a 6 superfícies modais.

**Pontos que passaram limpos:**
- **CSP**: apenas `font-src 'self' data:` foi adicionado; nenhuma outra diretiva foi afrouxada (diff de uma única linha, confirmado caractere a caractere).
- **`@font-face`**: os dois blocos (Archivo 400-800, JetBrains Mono 500-700) têm `font-display:swap`, `src:url(data:font/woff2;base64,...) format("woff2")` bem formado, e nenhuma referência residual a `IBM Plex Sans/Mono` ou `Open Sans` sobrou no arquivo — migração das 196 declarações está completa. Nenhum `<link>`/`@import` externo carregando fonte duplicada.
- **Sombras**: as 14 sombras ad hoc foram consolidadas em `--elev-0/1/2/3` (16 usos); os únicos `box-shadow` crus remanescentes são anéis decorativos não relacionados a elevação (`bldgflash`, dot do território) — nenhuma sombra vazou para panes do Leaflet, e `#laudo .lcard{box-shadow:none}` no `@media print` foi preservado.
- **`tabular-nums`**: exatamente 8 seletores, todos em métricas/valores numéricos (`.bm b`, `.count`, `.card .vals .ref b`, `.cmp-table td`, `.dgrid .cell .v`, `.dvalor-v`, `.score-num`, `.llbl` do laudo) — nenhum vazamento para texto corrido.
- **`.chk`**: `letter-spacing:0!important` preservado; nenhuma classe/id/handler HTML foi alterado neste diff (só `font-family`/tokens de sombra em CSS e chamadas `trapFocus`/`untrapFocus` em JS).
- **Combobox/Esc global**: o handler de trap só escuta `Tab` (`if(e.key!=="Tab")return`) e é anexado ao *container do modal*, nunca ao `#insc`/`#rua`/`.combo-list` nem ao `document` — não interfere com a navegação por setas do combobox nem com a cadeia de prioridade do Esc global (linha 7451), que continua funcionando por cima do trap sem conflito de ordenação.

O achado abaixo é o único de code review: o utilitário `untrapFocus()` é um singleton "cego" (não verifica se o chamador é o dono do trap ativo), e isso é alcançável em um fluxo real de uso (clique no mapa com a ficha aberta), não só em teoria.

## Warnings

### WR-01: `untrapFocus()` não verifica posse do trap — clique no mapa com a ficha aberta destrói o trap de foco de #detail sem fechar o sheet

**File:** `radar-goiania.html:7346-7358` (utilitário), com manifestação em `radar-goiania.html:4739-4744` e `radar-goiania.html:3571`/`radar-goiania.html:3590`

**Issue:**
`trapFocus`/`untrapFocus`/`TRAP_CONTAINER` são um slot único e global (linha ~7347: `let TRAP_CONTAINER=null, TRAP_LASTFOCUS=null, TRAP_HANDLER=null;`). Todo `fecharX()` chama `untrapFocus()` **incondicionalmente**, sem checar se o seu próprio container é de fato o `TRAP_CONTAINER` ativo:

```js
function closeChooser(){
  document.getElementById("chooser").classList.remove("show");
  untrapFocus(); // roda mesmo se #chooser não era o dono do trap
}
function fecharComparacao(){
  const sheet=document.getElementById("cmpSheet");if(sheet)sheet.hidden=true;
  untrapFocus(); // idem
}
```

`finish(items, fromMap)` (linha 4739) chama `closeChooser()` e `fecharComparacao()` **no topo da função, incondicionalmente**, como "reset defensivo" (comentário: "resultado novo: descarta qualquer seletor de prédio anterior"). `finish()` é chamado por dois caminhos que **nunca passam por `closeDetail()`**: `loadCi()` (clique num lote desenhado, linha 3571) e `identifyPoint()`/`onMapClick()` (clique livre no mapa, linha 3590).

Repro concreto (desktop, sem nenhum estado exótico):
1. Usuário abre a ficha de um lote A (`showDetail` → `trapFocus(#detail)`, `#detail.show` visível).
2. Usuário clica em OUTRO lote isolado (não-prédio) no mapa → `onMapClick`→`identifyPoint`→`finish(items,true)`.
3. `finish()` chama `closeChooser()`→`untrapFocus()`: como `#chooser` nunca esteve aberto, essa chamada na verdade destrói o trap **do `#detail`**, removendo o `keydown` listener e devolvendo o foco ao `TRAP_LASTFOCUS` capturado quando a ficha A foi aberta (ex.: um marcador do mapa).
4. Como o novo lote é único (`ehPredio=false`), no ramo desktop (`!isMobile() && !ehPredio`) `finish()` não chama `showChooser()` nem `showDetail()` de volta — a função termina só com `render()`/`plot()`.
5. Resultado: `#detail` continua com a classe `.show` (visualmente aberto, ainda mostrando os dados do lote A), mas **sem nenhum focus-trap ativo** — Tab agora escapa do sheet para o resto da página, quebrando exatamente a garantia que a Fase 19 (19-03, A11Y-01) foi feita para adicionar.

O mesmo padrão (chamada cega a `untrapFocus()` por um `fecharX()` cujo próprio sheet não é o dono do trap) também abre uma janela mais curta em `buscar()` (linha 4603, `closeDetail()` incondicional no topo) quando `#chooser` está aberto: o trap do chooser é destruído antes do `await` da nova busca, e só é reconciliado quando `finish()` chegar a `closeChooser()` (fechamento visual) — durante a janela assíncrona, `#chooser` fica visível e sem trap.

O comentário em `showChooser()` ("já chama untrapFocus() antes do trap abaixo — nunca vaza o handler do #detail", linha 5336) documenta a suposição de que essas chamadas cruzadas são inofensivas porque "só uma superfície fica aberta por vez" — mas os dois caminhos de clique no mapa (`loadCi`/`identifyPoint`) provam que essa invariante pode ser violada com `#detail` aberto.

**Fix:** tornar `untrapFocus()` ciente do dono do trap — só desmontar se o chamador for de fato quem está trapado:

```js
function untrapFocus(container){
  if(container && container!==TRAP_CONTAINER) return; // outro modal é o dono do trap ativo — não mexe
  if(TRAP_CONTAINER && TRAP_HANDLER) TRAP_CONTAINER.removeEventListener("keydown", TRAP_HANDLER);
  if(TRAP_LASTFOCUS && document.body.contains(TRAP_LASTFOCUS)) TRAP_LASTFOCUS.focus();
  TRAP_CONTAINER = null; TRAP_LASTFOCUS = null; TRAP_HANDLER = null;
}
```

E cada call-site passa o próprio container:
```js
function closeChooser(){
  const chooser=document.getElementById("chooser");
  chooser.classList.remove("show");
  untrapFocus(chooser);
}
function fecharComparacao(){
  const sheet=document.getElementById("cmpSheet");if(sheet)sheet.hidden=true;
  untrapFocus(sheet);
}
function closeDetail(){
  const d=document.getElementById("detail");
  d.classList.remove("show");
  untrapFocus(d);
  ...
}
```
(mesma alteração em `fecharLaudo`, `fecharCaptacao`, `fecharNeg`, `onbFechar`, passando `wiz`/`captSheet`/`negSheet`/`onbOverlay` respectivamente). Isso preserva o slot único (só um trap ativo por vez) mas elimina a destruição cruzada — cada `fecharX()` só limpa o trap quando ele mesmo era o dono.

## Info

### IN-01: Acabamento de foco (`:focus{border-color:...}`) aplicado de forma inconsistente entre inputs equivalentes

**File:** `radar-goiania.html:147` e `radar-goiania.html:170` vs. `radar-goiania.html:567` e `radar-goiania.html:617`

**Issue:** A Fase 19 (PREM-01) trocou a cor da borda de foco de `select,input` (linha 147) e `.caixa-input` (linha 170) de `var(--accent)` para `var(--ink)`. Os inputs visualmente equivalentes da calculadora e dos wizards — `.cinput:focus` (linha 567) e `.winput:focus` (linha 617) — não foram tocados e continuam com `var(--accent)`. O resultado é que o mesmo tipo de controle (`<input>` de texto/número) mostra cor de foco diferente dependendo de em qual tela ele está (busca vs. calculadora/wizard), sem explicação de design documentada no diff para a divergência.

**Fix:** alinhar as 4 regras ao mesmo token (`var(--ink)`, seguindo a decisão já tomada para busca/caixa única), ou documentar explicitamente por que calculadora/wizard mantêm `var(--accent)` (ex.: comentário citando alguma razão de contraste sobre `--paper` nesses contextos).

---

_Reviewed: 2026-07-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
