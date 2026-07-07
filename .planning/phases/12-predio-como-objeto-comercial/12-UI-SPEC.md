---
phase: 12
slug: predio-como-objeto-comercial
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-07
---

# Phase 12 — UI Design Contract

> Visual and interaction contract para PRÉDIO COMO OBJETO COMERCIAL: resumo do edifício (expande `.bldg-head`) antes da lista de unidades, barra de ordenação/filtro só quando `ehPredio`, marcação de unidades para comparar (até 4) e sheet de comparação em tabela compacta. Zero requisição nova — tudo calculado client-side sobre `units`/`LAST` já carregados. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** reusa 1:1 os padrões visuais já existentes — `.bldg-head` (expandido, não substituído), `.chips`/`.seg` (ordenação/filtro), `.zapbtn`/`.zapgroup` (ação "copiar análise"), `.wiz`/`.wtop`/`.wdots`/`.wbody`/`.wfoot`/`.wclose`/`.wback` (sheet de comparação), `.toast` (feedback de limite), `esc()`/IN-01 (toda interpolação). Zero token novo — 100% cores/tipografia/spacing das Fases 7-11.1. NÃO inclui: refino visual global (Fase 13), scores novos (usa `mercadoEstimado`/`__scores` da Fase 9), comparação a partir do chooser do mapa (deferido).

**Constraint técnica que molda o contrato:** `scoreOportunidade()` exige `stats` de comparáveis na vizinhança, obtidos por `compare()`/`compsStats()` — ambos `async`, com requisição de rede por unidade. Isso é caro demais para ordenar uma lista de N unidades de um prédio. Por isso "Maior oportunidade" nesta fase ordena por uma heurística BARATA e determinística (R$/m² estimado vs. média do próprio prédio — nunca vs. vizinhança), calculada 100% sobre dados já em memória. O rótulo do chip é honesto sobre isso (ver Copywriting).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla, reuso de `.bldg-head`/`.chips`/`.seg`/`.zapbtn`/`.zapgroup`/`.zapgroup-lbl`/`.wiz`/`.wtop`/`.wdots`/`.wback`/`.wclose`/`.wbody`/`.wfoot`/`.wnext`/`.card`/`.count`/`.toast`/`.chrow` já existentes (Fases 7-11.1) |
| Icon library | emoji textual (🏢 📊 🔍 ⚖️ 💬 ↗ ☐ ☑) — mesmo padrão já usado em `.bldg-head`/`.zapbtn`/`.acts button`; NENHUM ícone SVG novo |
| Font | `"IBM Plex Sans"` (UI/copy) + `"IBM Plex Mono"` (rótulos técnicos, métricas, contadores — mesmo padrão de `.count`/`.zapgroup-lbl`/`.sub`) |

Identidade: cartográfica/oxide (papel + tinta + carimbo vermelho-óxido), herdada 1:1 das Fases 7-11.1. Bordas 1.5–2px sólidas, `border-radius:2px` (chips/pills mantêm `border-radius:20px` já usado em `.chips button`/`.seg button` — exceção já existente no sistema, não nova). Nenhum componente novo introduz `border-radius` fora desses dois padrões.

---

## Tokens Reusados (zero hex novo)

| Var CSS | Hex | Uso nesta fase |
|---------|-----|-----------------|
| `--ink` | `#141a1f` | fundo do `.bldg-head` expandido (já é o fundo atual — mantido); texto principal do sheet de comparação |
| `--paper` | `#e9e4d8` | fundo de chips não-selecionados; fundo do card `.negparte`-like das métricas do resumo; fundo padrão do `.wbody` |
| `--paper-2` | `#f2eee4` | texto claro sobre `.bldg-head` (já usado em `.bldg-head .nm`/`.sub`); fundo do container do sheet `.wiz` de comparação |
| `--line` | `#c3b9a3` | borda dos chips não-selecionados; borda da linha zebra da tabela de comparação; divisor entre métricas do resumo |
| `--muted` | `#57503f` | rótulos das métricas (nº unidades, área média etc.); texto de linha "—" honesta na tabela; hint do campo de buscar unidade |
| `--accent` | `#b5451f` | chip de ordenação/filtro ATIVO (mesmo par `.chips button.on`/`.seg button.on` — mas ver nota de discretion abaixo, pois `.seg button.on` hoje usa `--ink`, não `--accent`; esta fase segue `.chips button.on` que já usa `--accent`); botão flutuante "Comparar (N)"; CTA "no mapa ↗" (já existente, inalterado) |
| `--accent-ink` | `#8f3116` | hover/active do botão flutuante "Comparar (N)" |
| `--lot` | `#2c5545` | checkbox de marcação ☑ quando marcado (reforço visual — texto/símbolo sempre acompanha, nunca cor isolada) |
| `--gold` | `#a8842c` | não introduzido nesta fase — reservado a status de score (Fase 9/13), fora de escopo aqui |

Nenhuma cor nova. `.bldg-head` mantém `background:var(--ink); color:var(--paper-2)` já existente — o resumo EXPANDE esse bloco, não cria um novo fundo.

---

## Spacing Scale

Reuso da escala já implícita no código (múltiplos de 4, alvo de toque 44px):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | gap entre ícone/checkbox e rótulo; gap entre valor e rótulo nas métricas do resumo |
| sm | 8px | gap entre chips de ordenação (`.chips{gap:8px}` já existente); gap entre métricas do resumo (grid) |
| md | 16px | padding interno do `.bldg-head` expandido (`padding:10px 12px` já existente, mantido); margem entre bloco de métricas e bloco de ações dentro do resumo |
| touch | **44px mínimo** | cada chip de ordenação/filtro; toggle "só aptos prováveis"; campo buscar unidade; checkbox de marcação no card (área de toque, não o glifo visual); botão flutuante "Comparar (N)"; botões "abrir ficha" na tabela de comparação; `.wclose`/`.wback` do sheet (já 44×44 herdado) |
| lg | 22px | padding do `.wbody` do sheet de comparação (herdado 1:1 de `.wiz .wbody{padding:4px 22px 20px}`) |

Exceções: nenhuma. Todo elemento novo herda o mínimo de 44px já padrão no app.

---

## Typography

Reuso total — nenhum tamanho/peso novo introduzido.

| Role | Size | Weight | Line Height | Onde já existe / reuso |
|------|------|--------|-------------|--------------------------|
| Nome do prédio (resumo, `.bldg-head .nm`) | 13px | 700 | 1.2 | reuso literal — já existente, inalterado |
| Sub do resumo (Q/L/contagem, `.bldg-head .sub`) | 11px | 500 | 1.3 | reuso literal — já existente, inalterado |
| Valor da métrica (nº unidades, área média, venal médio, estimado médio) | 15px | 700 | 1.1 | reuso literal de `.detail .dgrid .cell .v` (mesmo padrão de "valor grande sobre rótulo pequeno") |
| Rótulo da métrica ("Unidades", "Área média" etc.) | 10.5px | 600 | 1.2 | reuso literal de `.detail .dgrid .cell .k` |
| FAIXA do edifício (destaque, "R$ 650-890 mil") | 14px | 800 | 1.1 | reuso do padrão `.chrow .val` (800 peso, cor accent) — é o número que mais importa no resumo |
| Chip de ordenação/filtro (`.chips button`) | 13px | 600 | 1 | reuso literal — já existente (`.chips button` no app, ver linha 407-410) |
| Rótulo do grupo de ordenação (eyebrow) | 10px | 600 | 1.4 | reuso literal de `.zapgroup-lbl` (mono uppercase) |
| Campo buscar unidade (`.winput`-like) | 14px | 500 | 1.3 | reuso literal de `.winput`/campo de busca já existente no app |
| Botão "Copiar análise do prédio" (`.zapbtn`) | 13.5px | 600 | 1 | reuso literal de `.zapbtn` |
| Cabeçalho da tabela de comparação (linha "unidade") | 11px | 700 | 1.2 | mono uppercase, mesmo padrão de `.zapgroup-lbl`/`.negparte-lbl` |
| Rótulo de linha da tabela ("Área", "Venal", "Estimado"...) | 12px | 600 | 1.3 | reuso de `.detail .dgrid .cell .k`, ligeiramente maior por ser rótulo de linha, não de grid |
| Valor de célula da tabela | 13px | 700 | 1.25 | reuso de `.chrow .m`/`.val` — números alinhados, legíveis em coluna estreita |
| Botão flutuante "Comparar (N)" | 14px | 700 | 1 | reuso do padrão `.wnext`/`.primary` (peso 700, CTA de alta intenção) |
| Toast de limite (4/4) | herdado (`.toast` já define seu próprio estilo) | — | — | reuso literal, zero CSS novo |

Sem novo weight (500/600/700/800 já cobrem tudo).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo da lista/cards; fundo dos chips não-ativos; fundo do `.wbody` do sheet de comparação |
| Secondary (30%) | `--ink` `#141a1f` (bloco do resumo) / `--paper-2` `#f2eee4` (container do sheet) | fundo do `.bldg-head` expandido (mantido — já é escuro/inverso, reforça que é um bloco de destaque, não um card comum); fundo do container `.wiz` de comparação |
| Accent (10%) | `--accent` `#b5451f` | **reservado exclusivamente para**: (1) chip de ordenação/filtro ATIVO (`.chips button.on`, já existente), (2) FAIXA do edifício em destaque no resumo, (3) botão flutuante "Comparar (N)" quando N≥2, (4) botão "no mapa ↗" (já existente, inalterado), (5) foco de teclado (`:focus-visible`, herdado global) — accent NUNCA aparece no checkbox de marcação (usa `--lot`, ver abaixo) nem nas linhas neutras da tabela de comparação |
| Status positivo (reforço opcional) | `--lot` `#2c5545` | checkbox ☑ marcado no card — SEMPRE acompanhado do glifo "☑" (nunca só a cor); reforço visual de "selecionado para comparar", não um status de oportunidade |
| Destructive | não aplicável nesta fase | nenhuma ação destrutiva nova — desmarcar uma unidade da comparação não exige confirmação (reversível, sem perda de dado real); fechar o sheet de comparação sem ação também não é destrutivo (a seleção permanece nos cards até nova busca) |

**Regra de acessibilidade (herdada, travada nas Fases 7-11.1):** cor é sempre reforço, nunca único veículo de significado. Checkbox de marcação sempre com glifo textual "☐/☑" — nunca só mudança de cor de borda. Colunas "—" na tabela de comparação sempre com o texto "—" explícito — nunca célula vazia sem indicação.

**Contraste AA (herdado, mesma tabela das Fases 7-11.1):**
- `--muted #57503f` sobre `--paper`/`--paper-2` → ~7:1
- `--ink #141a1f` sobre `--paper`/`--paper-2` → >13:1
- `--paper-2 #f2eee4` sobre `--ink` (texto do `.bldg-head`) → já aprovado, reuso literal
- `--accent #b5451f` sobre `--paper` (chip ativo, texto branco `#fff` sobre fundo accent) → par já aprovado em `.chips button.on`/`.acts button.primary`, reuso literal
- `--lot #2c5545` sobre `--paper` (checkbox marcado) → ~7.5:1, aprovado

---

## Componente 1 — Resumo do Prédio (expande `.bldg-head`)

**Localização:** MESMO elemento `.bldg-head` já renderizado em `render()` quando `cnt[ci]>1` (linha ~2575). Nesta fase, quando `ehPredio` (calculado em `finish()`, `units.length>1 && nLotes===1`), o `.bldg-head` GANHA um bloco adicional de métricas + ações IMEDIATAMENTE ABAIXO do `.sub` já existente — o cabeçalho nome/Q-L/contagem não muda; o resumo é um `<div class="bldg-sumario">` novo, filho do mesmo `.bldg-head`.

```html
<div class="bldg-head" data-ci="${esc(ci)}">
  <div class="nm">🏢 ${ed}<button class="tomap" onclick="verNoMapa(this)" title="Centralizar este prédio no mapa">no mapa ↗</button></div>
  <div class="sub">Q ${esc(a.nrquadra)} · L ${esc(a.nrlote)} · ${cnt[ci]} imóveis — toque num deles abaixo para abrir a ficha ⬇</div>
  <div class="bldg-sumario">
    <div class="bldg-metricas">
      <div class="bm"><b>${nUnid}</b><span>unidades</span></div>
      <div class="bm"><b>${areaMediaTxt}</b><span>área média</span></div>
      <div class="bm"><b>${venalMedioTxt}</b><span>venal médio</span></div>
      <div class="bm bm-faixa"><b>${faixaTxt}</b><span>estimado médio · faixa</span></div>
    </div>
    <div class="bldg-acoes">
      <button type="button" class="bldg-ord-toggle" onclick="toggleBldgOrd(this)" aria-expanded="false">🔍 Ordenar / filtrar</button>
      <button type="button" class="bldg-zap" onclick="copyZapPredio('${esc(ci)}')">💬 Copiar análise do prédio ⧉</button>
    </div>
  </div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.bldg-sumario` | `margin-top:8px; padding-top:8px; border-top:1px dashed var(--line)` — MESMA cor `--line` já usada em divisores tracejados no resto do app (`.zapgroup`) | separa visualmente o cabeçalho original do resumo novo, sem introduzir cor nova |
| `.bldg-metricas` | `display:grid; grid-template-columns:repeat(2,1fr); gap:8px 12px` no mobile; `grid-template-columns:repeat(4,1fr)` em ≥481px | grid de 4 métricas — 2 colunas no mobile evita espremer números grandes, 4 no desktop/tablet |
| `.bm` | `display:flex; flex-direction:column; gap:2px` — `b{font:700 15px/1.1 "IBM Plex Sans"; color:var(--paper-2)}` `span{font:600 10.5px/1.2 "IBM Plex Sans"; color:var(--line)}` | valor grande sobre rótulo pequeno, cores claras sobre o fundo escuro `--ink` do `.bldg-head` (mesmo par já usado em `.bldg-head .sub` que usa `--line`) |
| `.bm-faixa b` | `color:var(--accent)` sobrepondo a cor padrão `--paper-2` das outras métricas — ÚNICA métrica em accent | é o número mais importante do resumo (estimado médio + faixa) — merece destaque de cor, coerente com a regra "accent = o que mais importa" |
| `.bldg-acoes` | `display:flex; gap:8px; flex-wrap:wrap; margin-top:10px` | 2 ações, lado a lado no desktop, empilham no mobile se não couberem |
| `.bldg-ord-toggle` | `min-height:44px; border:1.5px solid var(--paper-2); background:transparent; color:var(--paper-2); font:600 12.5px/1 "IBM Plex Sans"; border-radius:2px; padding:0 12px` — reuso do MESMO par visual do `.tomap` já existente (borda clara sobre fundo escuro) | ação neutra, mesmo tom do botão "no mapa ↗" já ali |
| `.bldg-zap` | idêntico a `.bldg-ord-toggle` no estilo (borda clara sobre fundo escuro) — MESMA hierarquia visual, nenhuma das duas ações vira "primária" com fundo accent sólido | **lei da tela aplicada ao resumo**: "Ver unidades" NÃO é ação (é passivo — a lista já está embaixo); as 2 ações reais são "Ordenar/filtrar" e "Copiar análise" — ambas neutras/iguais em peso, "no mapa ↗" já existia e seguiu igual |

**Cálculo (client-side, zero request, sobre `units` filtradas por `hideGar` já aplicado em `finish()`):**
- `nUnid` = `units.filter(u=>clean(u.ci)===ci).length` (exclui garagem/box quando `hideGar` ativo, coerente com o filtro já aplicado antes do render)
- `areaMediaTxt` = média de `areaedif` das unidades com `areaedif>0`; se nenhuma tiver área, exibe "—"
- `venalMedioTxt` = média de `vlvenal` das unidades com `vlvenal>0` (nunca inclui zeros no cálculo — mesma regra de `venalTxt`); se nenhuma tiver venal, exibe "—"
- `faixaTxt` = `brlC` da média dos `(lo+hi)/2` de `mercadoEstimado(u)` de cada unidade elegível + faixa lo–hi do conjunto (mínimo dos `lo`, máximo dos `hi`); se NENHUMA unidade tiver estimativa, exibe "sem estimativa disponível" (ver Estados)

**Comportamento:**
- `toggleBldgOrd(this)`: expande/recolhe a Barra de Ordenação/Filtro (Componente 2) IMEDIATAMENTE ACIMA da lista de cards do prédio — `aria-expanded` sincronizado; primeiro toque foca o primeiro chip.
- `copyZapPredio(ci)`: gera texto copiável (padrão `copyZap`, `navigator.clipboard`) com o resumo do edifício — ver Copywriting para o template exato. Reusa a MESMA função de feedback (`toast("Copiado! ⧉")`) já usada em `copyZap`.

---

## Componente 2 — Barra de Ordenação/Filtro (só quando `ehPredio`)

**Localização:** bloco `<div class="bldg-ord" id="bldgOrd" hidden>` inserido no HTML de `render()` IMEDIATAMENTE APÓS o `.bldg-head` daquele prédio e ANTES do primeiro `cardHTML()` das suas unidades — visível apenas quando `toggleBldgOrd()` expande (estado inicial: oculto, para não competir com o resumo na primeira leitura — "lei da tela").

```html
<div class="bldg-ord" id="bldgOrd-${esc(ci)}" hidden>
  <div class="zapgroup-lbl">Ordenar por</div>
  <div class="chips" role="group" aria-label="Ordenar unidades">
    <button type="button" class="on" aria-pressed="true" onclick="ordenarBldg('${esc(ci)}','padrao')">Padrão</button>
    <button type="button" aria-pressed="false" onclick="ordenarBldg('${esc(ci)}','oportunidade')">Maior oportunidade</button>
    <button type="button" aria-pressed="false" onclick="ordenarBldg('${esc(ci)}','estimado-asc')">Menor estimado</button>
    <button type="button" aria-pressed="false" onclick="ordenarBldg('${esc(ci)}','area-desc')">Maior área</button>
  </div>
  <div class="bldg-filtros">
    <button type="button" class="bldg-toggle-provaveis" aria-pressed="false" onclick="toggleAptosProvaveis('${esc(ci)}')">☐ Só aptos prováveis</button>
    <input type="search" class="bldg-buscaunidade" placeholder="Buscar unidade (ex.: apto 302)" oninput="buscarUnidadeBldg('${esc(ci)}',this.value)" aria-label="Buscar unidade neste prédio">
  </div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.bldg-ord` | `margin:8px 16px 10px; padding:10px 12px; background:var(--paper-2); border:1px solid var(--line); border-radius:2px` | card claro logo abaixo do `.bldg-head` escuro — contraste de bloco reforça que é uma ferramenta, não o resumo |
| `.chips` (dentro de `.bldg-ord`) | reuso literal — ZERO CSS novo, mesma classe já usada em outros lugares do app (`.chips{display:flex;gap:8px;flex-wrap:wrap}`, `.chips button{padding:11px 15px;border-radius:20px...}`) | 4 chips, `.on`/`aria-pressed` sincronizados, só 1 ativo por vez (radio-like) |
| `.bldg-filtros` | `display:flex; flex-direction:column; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--line)` | separa visualmente ordenação (chips) de filtro (toggle + busca) |
| `.bldg-toggle-provaveis` | `min-height:44px; width:100%; text-align:left; border:1.5px solid var(--line); background:var(--paper); color:var(--ink); font:600 13px/1 "IBM Plex Sans"; border-radius:2px; padding:0 12px` — estado `aria-pressed="true"` troca para `background:var(--ink); color:var(--paper-2); border-color:var(--ink)` e glifo "☑" | reuso do padrão de toggle já usado no app (`hideGar` checkbox nativo tem outro visual — este é um botão-toggle textual, mesmo padrão do `.seg button.on` mas full-width) |
| `.bldg-buscaunidade` | `min-height:44px; width:100%; border:1.5px solid var(--line); background:var(--paper); color:var(--ink); font:500 14px/1.3 "IBM Plex Sans"; border-radius:2px; padding:0 12px` | reuso literal de `.winput`/campo de busca — mesmo tratamento visual de input já usado no app |

**Comportamento (client-side, zero request):**
- `ordenarBldg(ci, criterio)`:
  - `padrao` → ordem atual de `LAST` (nenhuma alteração, é o estado inicial)
  - `oportunidade` → ordena as unidades DAQUELE prédio por `(mercadoEstimado(u).lo+mercadoEstimado(u).hi)/2 / m2Edif(u)` ASCENDENTE relativo à MÉDIA do próprio prédio (heurística barata, documentada na função com o mesmo comentário desta spec — "vs. vizinhança" fica pra Fase 9/ficha, aqui é "vs. o próprio prédio"); unidades sem estimativa vão para o fim da lista, nunca escondidas
  - `estimado-asc` → ordena por `(mercadoEstimado(u).lo+mercadoEstimado(u).hi)/2` ASCENDENTE; sem estimativa → fim da lista
  - `area-desc` → ordena por `areaedif` DESCENDENTE; sem área → fim da lista
  - Reordena SÓ o subconjunto de `units` daquele `ci` dentro de `LAST` (as demais unidades da lista geral — se houver mais de um prédio nos resultados — mantêm a posição relativa entre prédios); re-renderiza via `render(LAST)` sem stagger (é reordenação, não busca nova)
- `toggleAptosProvaveis(ci)`: filtra IN-PLACE (não remove de `LAST`, oculta via re-render filtrado) exibindo só unidades onde `!isGarage(u) && (u.uso===1||u.uso===5)` — heurística já existente, rotulada honestamente (ver Copywriting, nunca promete "só apartamentos", pois é heurística)
- `buscarUnidadeBldg(ci, q)`: reusa `matchApto(u, clean(q))` já existente — filtra IN-PLACE as unidades daquele prédio; campo vazio = mostra todas de novo
- Estado de ordenação/filtro do prédio NÃO persiste entre buscas — cada `finish()` novo reseta para "Padrão" (mesma regra de "seleção de comparação não persiste")

---

## Componente 3 — Marcar unidade para comparar (toggle no card)

**Localização:** dentro de `cardHTML()`, um novo elemento no topo do card, SÓ renderizado quando `isUnit` (ou seja, quando `cnt[ci]>1` — é unidade de prédio, não imóvel único). Card continua clicável para abrir a ficha (`onclick="pick(i)"` no `<div class="card">` raiz) — o toggle de comparação é um elemento FILHO com `stopPropagation` para não disparar `pick()`.

```html
<div class="card" data-i="${i}" role="button" tabindex="0" onclick="pick(${i})" onkeydown="...">
  <button type="button" class="cmp-toggle" aria-pressed="false" aria-label="Marcar para comparar" onclick="event.stopPropagation();toggleComparar(${i},this)">☐</button>
  ${isUnit&&ul?`<div class="unit">${esc(ul)}</div>`:""}
  ...
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.cmp-toggle` | `position:absolute; top:8px; right:8px; width:32px; height:32px; min-width:44px; min-height:44px; margin:-6px; border:1.5px solid var(--line); background:var(--paper-2); color:var(--muted); font-size:16px; border-radius:2px; display:flex; align-items:center; justify-content:center; cursor:pointer` — área de toque real 44×44 via `margin` negativo compensando o glifo visual 32×32 (padrão já usado em ícones pequenos com toque grande no app) | discreto — não compete com o conteúdo do card; canto superior direito, fora do fluxo de leitura primária (endereço/área/valor) |
| `.cmp-toggle[aria-pressed="true"]` | `border-color:var(--lot); background:var(--lot); color:#fff` + glifo trocado para "☑" via JS (`this.textContent="☑"`) | reforço de cor SEMPRE acompanhado da troca de glifo — nunca só borda verde |
| `.card` (ajuste) | `position:relative` adicionado (se ainda não existir) para o `.cmp-toggle` posicionar-se corretamente | pré-requisito de layout, zero impacto visual nos demais elementos do card |

**Comportamento:**
- `toggleComparar(i, btn)`: adiciona/remove `i` de um array em memória `CMP` (`let CMP=[]`, nunca persistido — mesma filosofia de "estado de sessão apenas" da Fase 11.1); atualiza `aria-pressed`/glifo/estilo do botão clicado; se `CMP.length>4` ANTES de adicionar, bloqueia e mostra toast (ver Estados/limite).
- `CMP` é resetado (`CMP=[]`) a cada novo `finish()` (nova busca) — nunca sobrevive a uma busca diferente.
- Marcar uma unidade NÃO abre a ficha (o toggle intercepta o clique antes de `pick()`).

---

## Componente 4 — Botão flutuante/sticky "Comparar (N)"

**Localização:** elemento fixo `#cmpFab`, sticky ao fundo da área de resultados (mobile) / sticky ao fundo do card de busca (desktop) — MESMO padrão de posicionamento já usado por elementos flutuantes do app (toast/`.mais`), mas persistente enquanto `CMP.length>=2`.

```html
<button type="button" id="cmpFab" class="cmp-fab" hidden onclick="abrirComparacao()">
  ⚖️ Comparar (<span id="cmpFabN">0</span>)
</button>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.cmp-fab` | `position:fixed; left:50%; transform:translateX(-50%); bottom:calc(16px + env(safe-area-inset-bottom)); z-index:850; min-height:44px; padding:0 20px; border:0; border-radius:22px; background:var(--accent); color:#fff; font:700 14px/1 "IBM Plex Sans"; box-shadow:0 2px 8px rgba(0,0,0,.25); cursor:pointer` — `z-index:850` fica ABAIXO do `.toast` (900) e do `.wiz` (2000), ACIMA dos cards | pill flutuante, mesmo padrão de "chip arredondado accent" já usado em `.chips button.on` — cor accent justificada (é a ÚNICA ação de alta intenção disponível na tela naquele momento, mesma regra de "1 CTA primária" das Fases 10/11 |
| `.cmp-fab:hover` | `background:var(--accent-ink)` | mesmo par hover já usado em CTAs accent |
| Mobile: posição | `bottom:calc(56px + 16px + env(safe-area-inset-bottom))` (acima da tab bar mobile, mesmo ajuste já aplicado a `.toast` mobile) | evita sobreposição com a navegação inferior já existente |

**Comportamento:**
- Visível (`hidden` removido) quando `CMP.length>=2`; oculto quando `CMP.length<2` (0 ou 1 marcada — ver Estados).
- Texto atualiza em tempo real: "Comparar (2)", "Comparar (3)", "Comparar (4)".
- Ao atingir 4, o botão permanece "Comparar (4)" e QUALQUER novo toggle em unidade não-marcada é bloqueado com toast (ver Estados) — as 4 já marcadas continuam desmarcáveis normalmente.
- `abrirComparacao()`: abre o Componente 5 (sheet) com as unidades atualmente em `CMP`.

---

## Componente 5 — Sheet de Comparação

**Estrutura:** novo elemento `#cmpSheet`, MESMO padrão de container `.wiz` (dialog modal full-screen mobile / centrado desktop) — reuso 1:1 de `.wtop`/`.wback`(oculto, sem passos)/`.wclose`/`.wbody`/`.wfoot` sem os `.wdots` (não é wizard multi-passo, é uma tela única).

```html
<div class="wiz" id="cmpSheet" hidden role="dialog" aria-modal="true" aria-label="Comparação de unidades">
  <div class="wtop">
    <span class="wh1-inline">Comparação (${CMP.length})</span>
    <button class="wclose" onclick="fecharComparacao()" aria-label="Fechar">×</button>
  </div>
  <div class="wbody" id="cmpBody"></div>
</div>
```

**Tabela (dentro de `#cmpBody`), colunas = unidades (até 4), linhas = atributos:**

```html
<div class="cmp-tablewrap">
  <table class="cmp-table">
    <thead>
      <tr>
        <th class="cmp-rowlbl"></th>
        ${CMP.map(i=>`<th>${esc(unitLabel(LAST[i]))||"Imóvel"}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      <tr><td class="cmp-rowlbl">Área</td>${cells(u=>u.areaedif?Math.round(u.areaedif)+" m²":"—")}</tr>
      <tr><td class="cmp-rowlbl">Venal</td>${cells(u=>venalTxt(u.vlvenal))}</tr>
      <tr><td class="cmp-rowlbl">Estimado</td>${cells(u=>{const e=mercadoEstimado(u);return e?"~"+brlC((e.lo+e.hi)/2):"—";})}</tr>
      <tr><td class="cmp-rowlbl">R$/m²</td>${cells(u=>{const p=m2Edif(u);return p?brl(p):"—";})}</tr>
      <tr><td class="cmp-rowlbl">Oportunidade</td>${cells(u=>u.__scores&&u.__scores.op?u.__scores.op.rotulo:"—")}</tr>
    </tbody>
    <tfoot>
      <tr>
        <td class="cmp-rowlbl"></td>
        ${CMP.map(i=>`<td><button type="button" class="cmp-abrir" onclick="fecharComparacao();pick(${i})">Abrir ficha ↗</button></td>`).join("")}
      </tr>
    </tfoot>
  </table>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.wh1-inline` | `font:700 16px/1.2 "IBM Plex Sans"; color:var(--ink)` — substitui o `.wdots` (não há passos) no `.wtop` desta tela única | mesmo peso visual de um `.wh1` de wizard, mas inline no topo (sem dots, sem `.wback`) |
| `.cmp-tablewrap` | `overflow-x:auto; -webkit-overflow-scrolling:touch` — scroll horizontal SÓ AQUI, dentro do sheet, nunca na página | requisito explícito do CONTEXT.md: "scroll horizontal no mobile SE precisar (dentro do sheet, nunca a página)" |
| `.cmp-table` | `width:100%; border-collapse:collapse; min-width:${CMP.length<=2?"100%":"560px"}` — força scroll só quando 3-4 colunas não cabem em 375px | com 2 colunas, cabe sem scroll no mobile; com 3-4, o `min-width` garante que cada coluna tenha espaço legível (~140px) e o wrap rola |
| `.cmp-table th` | `position:sticky; top:0; background:var(--paper-2); font:700 11px/1.2 "IBM Plex Mono"; text-transform:uppercase; letter-spacing:.04em; color:var(--ink); padding:10px 12px; border-bottom:2px solid var(--line); text-align:left; white-space:nowrap` | cabeçalho fixo ao rolar verticalmente (tabela pode crescer se linhas aumentarem no futuro); mono uppercase, mesmo padrão de rótulos técnicos do app |
| `.cmp-table td` | `padding:10px 12px; font:600 13px/1.25 "IBM Plex Sans"; color:var(--ink); border-bottom:1px solid var(--line); white-space:nowrap` | valores legíveis, uma linha por atributo |
| `.cmp-rowlbl` | `font:600 12px/1.3 "IBM Plex Sans"; color:var(--muted); position:sticky; left:0; background:var(--paper-2); white-space:nowrap; padding-right:16px` | coluna de rótulos fixa ao rolar horizontalmente — o corretor sempre sabe qual linha está lendo mesmo rolando p/ ver a 4ª unidade |
| `.cmp-table tbody tr:nth-child(even)` | `background:var(--paper)` | zebra sutil, reuso da MESMA cor `--paper` já usada em fundos neutros — facilita leitura de linha em tabela densa |
| `.cmp-abrir` | `min-height:44px; width:100%; border:1.5px solid var(--ink); background:transparent; color:var(--ink); font:600 12px/1 "IBM Plex Sans"; border-radius:2px; padding:0 10px` — hover `background:var(--ink); color:var(--paper-2)` (mesmo par de `.detail .acts button`) | 1 botão "Abrir ficha ↗" por coluna, reuso do par visual já aprovado |

**Comportamento:**
- `abrirComparacao()`: valida `CMP.length>=2` (o FAB só aparece com 2+, então esta chamada nunca ocorre com <2 — guarda defensiva mesmo assim); renderiza a tabela; abre `#cmpSheet` (mesma entrada de sheet `REDUCE`-aware herdada de `.wiz`); foco vai para o `.wclose` ou para o primeiro `th` (ver Acessibilidade).
- `fecharComparacao()`: fecha o sheet; NÃO limpa `CMP` (as marcações no card permanecem — reabrir "Comparar (N)" mostra a mesma seleção); só `finish()` novo limpa `CMP`.
- Esc fecha o sheet (mesma cadeia de Esc herdada).
- "Abrir ficha ↗" fecha o sheet de comparação e chama `pick(i)` diretamente (mesmo padrão do `.chrow` do chooser).

---

## Estados Transversais

| Estado | Comportamento visual | Regra |
|--------|----------------------|-------|
| **Prédio sem NENHUMA estimativa de mercado** | Métrica "estimado médio · faixa" no resumo exibe texto `"sem estimativa disponível"` em `color:var(--muted)` (não `--accent`, pois não há valor a destacar); demais métricas (unidades/área média/venal médio) continuam normais se tiverem dado | Honesto — nunca mostra "R$ 0" ou faixa vazia; explica objetivamente por que não há estimativa (uso não-residencial, sem área, etc. — mesma regra de `mercadoEstimado` retornando `null`) |
| **Tudo garagem/box no prédio (hideGar desmarcado revela só garagens)** | Resumo adapta rótulos: "unidades" → "vagas/boxes"; área média calculada normalmente sobre `areaedif` das garagens (quando houver); venal médio idem; estimado médio SEMPRE "sem estimativa disponível" (garagem nunca entra em `mercadoEstimado`, `isGarage` bloqueia) | `nUnid` já reflete o filtro `hideGar` ativo — quando o corretor desmarca "ocultar garagem" e só restam garagens, o resumo não finge que são apartamentos |
| **Menos de 2 unidades marcadas para comparar** | Botão `#cmpFab` permanece `hidden` (0 ou 1 marcada) — nenhuma mensagem de erro, é o estado neutro esperado | "Comparar" só faz sentido com 2+; não há necessidade de avisar sobre isso, apenas não oferecer a ação ainda (mesma filosofia de "lei da tela" — não empurrar ação sem sentido) |
| **Tentativa de marcar a 5ª unidade** | Toast (`.toast`, reuso literal): *"Você já marcou 4 — o máximo para comparar. Desmarque uma para trocar."* — o toggle da 5ª tentativa NÃO muda de estado (permanece "☐", `aria-pressed="false"`) | Feedback honesto e imediato — nunca falha silenciosamente; instrução de próximo passo incluída na própria mensagem |
| **Unidade sem estimativa dentro da comparação (coluna existe, célula "Estimado"/"R$/m²" sem dado)** | Célula exibe `"—"` em `color:var(--muted)` — mesma célula, mesma coluna, sem ocultar a unidade da tabela | Comparação honesta: a ausência de estimativa É uma informação relevante (ex.: "essa unidade não teve como estimar, as outras 3 sim") — nunca remove a coluna |
| **Unidade sem score de oportunidade calculado (`__scores` ainda não populado — ficha nunca aberta)** | Linha "Oportunidade" exibe `"—"` naquela coluna — `__scores` só é populado quando a ficha da unidade é aberta (`showDetail`/`compare()`), então é comum que unidades marcadas direto da lista (sem abrir ficha) não tenham esse dado ainda | Nunca dispara `compare()`/requisição de rede a partir do sheet de comparação só para preencher essa célula — zero request novo é regra dura desta fase |
| **`ehPredio===false` (imóvel único, não é prédio)** | Nenhum componente desta fase é renderizado — `.bldg-sumario`, `.bldg-ord`, `.cmp-toggle`, `#cmpFab` inexistem no DOM daquela busca | Escopo estrito: toda a UI desta fase só existe quando `units.length>1 && nLotes===1` |
| **Busca nova enquanto o sheet de comparação está aberto** | `finish()` chama `closeChooser()` já hoje — esta fase estende a mesma limpeza para `fecharComparacao()` + `CMP=[]` no início de `finish()` (evita sheet fantasma com dados da busca anterior) | Mesma regra defensiva já aplicada a `closeChooser()` em `finish()` |

---

## Mobile 375 × Desktop 1280

| Aspecto | Mobile (≤820px) | Desktop (≥821px) |
|---------|-------------------|----------------------|
| `.bldg-metricas` (grid) | 2 colunas | 4 colunas |
| `.bldg-acoes` (2 botões) | empilham se não couberem lado a lado (`flex-wrap:wrap`), cada um full-width quando empilhado | lado a lado, largura de conteúdo |
| `.bldg-ord` (chips de ordenação) | wrap em 2 linhas se necessário, cada chip mantém `min-height:44px` | 1 linha, chips com padding confortável |
| `.bldg-buscaunidade` | full-width | full-width dentro do `.bldg-ord` (que já tem `max-width` herdado do card de busca) |
| `.cmp-toggle` no card | canto superior direito, 44×44 de toque | idêntico |
| `#cmpFab` | `bottom:calc(56px+16px+safe-area)` (acima da tab bar) | `bottom:16px` (sem tab bar mobile) |
| `#cmpSheet` | full-screen (herdado de `.wiz` mobile) | centrado, `max-width` herdado do `.wbody` (560px) — MAS a tabela de comparação pode precisar de mais largura que 560px com 4 colunas; `.cmp-tablewrap` permite que a TABELA role horizontalmente mesmo dentro do `.wbody` de 560px, sem forçar o sheet inteiro a ficar mais largo |
| `.cmp-table` scroll horizontal | ativa com 3-4 colunas (min-width 560px vs. viewport ~375px) | raramente necessário (560px de `.wbody` comporta 3-4 colunas com folga maior), mas a regra de `overflow-x:auto` permanece como salvaguarda |
| Guarda herdada (Fase 7 mobile) | lista de unidades do prédio NÃO fica atrás do form (`scrollToResults()` já existente, inalterado); "garagem = não informado" (`venalTxt`) permanece idêntico | não aplicável (form não empurra a lista no desktop) |

---

## Acessibilidade / Motion (obrigatório)

- **Contraste AA**: todas as combinações reusam pares já aprovados nas Fases 7-11.1 (ver tabela em Color) — nenhuma combinação nova introduzida.
- **Botões reais**: todo elemento tocável novo é `<button type="button">` com `onclick` inline (nunca `<div onclick>`) — `.bldg-ord-toggle`, `.bldg-zap`, chips de ordenação, `.bldg-toggle-provaveis`, `.cmp-toggle`, `#cmpFab`, `.cmp-abrir`, `.wclose` do `#cmpSheet`.
- **`aria-pressed`**: chips de ordenação (radio-like, só 1 `true` por vez), `.bldg-toggle-provaveis`, `.cmp-toggle` (cada card) — mesmo padrão já usado em `.seg button`/`.chips button` (Fases 8/9/11).
- **`aria-expanded`**: `.bldg-ord-toggle` sincronizado com a visibilidade de `.bldg-ord` (`true` quando expandido).
- **`role="group"` + `aria-label`**: chips de ordenação agrupados (`role="group" aria-label="Ordenar unidades"`) — leitor de tela anuncia o conjunto antes de cada opção.
- **Foco na abertura do `#cmpSheet`**: ao abrir (`abrirComparacao()`), foco vai para o `.wclose` (primeiro elemento interativo do topo) — mesmo padrão de "primeiro elemento interativo" já usado em `abrirSeletorFinalidade()`/`abrirCaptacao()`/`abrirNeg()`.
- **Foco ao expandir `.bldg-ord`**: `toggleBldgOrd()` foca o primeiro chip ("Padrão") ao expandir — leitor de tela confirma a nova região imediatamente.
- **`esc()` obrigatório**: qualquer interpolação de dado no resumo (nome do edifício, Q/L), na tabela de comparação (`unitLabel`, valores formatados já vêm de funções puras que não interpolam texto livre do usuário) e no texto copiável ("Copiar análise do prédio") passa por `esc()` antes de entrar no DOM/clipboard — mesmo contrato IN-01 já travado nas Fases 8/9/10/11/11.1. Atenção especial ao campo de busca de unidade: `buscarUnidadeBldg(ci,q)` NUNCA reconstrói string JS com `q` interpolado (usa `matchApto(u, clean(q))` já existente, comparação pura, sem `eval`/onclick dinâmico) — mesmo cuidado do CR-01/IN-01.
- **`prefers-reduced-motion`**: nenhuma transição nova é introduzida além da entrada de sheet já `REDUCE`-aware (`#cmpSheet` reusa a mesma entrada de `.wiz`/`#captSheet`/`#negSheet`); reordenação da lista (`ordenarBldg`) usa o MESMO stagger condicional já existente em `render()` (`doStagger` respeitando `REDUCE`) ou, preferencialmente, renderiza SEM stagger (é reordenação, não busca nova — evita repetir animação de entrada em toda reordenação).
- **Cadeia de Esc**: `#cmpSheet` entra na cadeia de Esc do `keydown` global na MESMA posição estrutural de `#negSheet`/`#captSheet`/`#wiz` (mutuamente exclusivo com os sheets de documento — não deve coexistir aberto simultaneamente com `#wiz`/`#negSheet`; pode coexistir com o `.detail` da ficha, mesma lógica de "sheet mais recente tem prioridade").
- **Zero requisição nova**: nenhum componente desta fase dispara `jsonp`/`fetchWhere`/`compare()`/`compsStats()` — toda a ordenação, filtro, resumo e comparação operam 100% sobre `units`/`LAST`/`__scores` já em memória. Se `__scores` não estiver populado para uma unidade marcada, a célula mostra "—" (nunca dispara o cálculo).
- **SEARCHTOKEN**: não aplicável a esta fase (nenhum novo caminho de busca de rede é introduzido).

---

## Copywriting Contract

Tom herdado do Plano UX — corretor profissional: claro, direto, sem jargão técnico na primeira camada (percentil/mediana ficam de fora do resumo; "heurística"/"aproximado" só aparecem quando honestamente necessário).

| Element | Copy / Esqueleto |
|---------|------|
| **Rótulo — nº unidades** | "unidades" (ou "vagas/boxes" quando o prédio, após filtro, só tem garagens/box) |
| **Rótulo — área média** | "área média" |
| **Rótulo — venal médio** | "venal médio" |
| **Rótulo — estimado médio/faixa** | "estimado médio · faixa" |
| **Métrica sem estimativa (todas nulas)** | "sem estimativa disponível" |
| **Botão — ordenar/filtrar** | "🔍 Ordenar / filtrar" |
| **Botão — copiar análise** | "💬 Copiar análise do prédio ⧉" |
| **Toast ao copiar análise** | "Copiado! Cole no WhatsApp." (reuso do padrão já usado em `copyZap`) |
| **Rótulo do grupo de ordenação** | "Ordenar por" |
| **Chip — padrão** | "Padrão" |
| **Chip — maior oportunidade** | "Maior oportunidade" |
| **Chip — menor estimado** | "Menor estimado" |
| **Chip — maior área** | "Maior área" |
| **Toggle — aptos prováveis (inativo)** | "☐ Só aptos prováveis" |
| **Toggle — aptos prováveis (ativo)** | "☑ Só aptos prováveis" |
| **Placeholder — buscar unidade** | "Buscar unidade (ex.: apto 302)" |
| **Toggle de marcação — card (inativo)** | "☐" com `aria-label="Marcar para comparar"` |
| **Toggle de marcação — card (ativo)** | "☑" com `aria-label="Desmarcar da comparação"` |
| **Botão flutuante** | "⚖️ Comparar (N)" — N substituído pelo contador real |
| **Toast — limite de 4 atingido** | "Você já marcou 4 — o máximo para comparar. Desmarque uma para trocar." |
| **Título do sheet de comparação** | "Comparação (N)" |
| **Linha da tabela — área** | "Área" |
| **Linha da tabela — venal** | "Venal" |
| **Linha da tabela — estimado** | "Estimado" |
| **Linha da tabela — R$/m²** | "R$/m²" |
| **Linha da tabela — oportunidade** | "Oportunidade" |
| **Célula sem dado (qualquer linha)** | "—" |
| **Botão — abrir ficha (por coluna)** | "Abrir ficha ↗" |
| **Texto copiável "análise do prédio" (esqueleto, `copyZapPredio`)** | `"🏢 [Nome do edifício] — Q [quadra] · L [lote]\n[N] unidades · área média [X] m² · venal médio [R$ Y] · estimado médio [R$ Z] · faixa [R$ Lo–Hi]\n\n📍 [endereço, se disponível]\nAnálise gerada pelo Radar Fundiário."` — quando não há estimativa: linha "estimado médio" é omitida do texto (nunca "estimado médio: —" num texto copiável, que soa amador) |
| **Destrutivo nesta fase** | Nenhuma ação destrutiva — desmarcar unidade da comparação e fechar o sheet sem ação são sempre reversíveis/silenciosos, sem confirmação necessária |

Todo texto acima é pt-BR correto, verbo de ação nos botões, sem caixa alta em bloco longo, sem gíria/ironia, sem promessa falsa de precisão ("estimado" e "faixa" sempre presentes, nunca um valor único absoluto) — alinhado ao gate de linguagem da Fase 14 (esta fase antecipa o padrão, não substitui o gate final).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

Nenhum registry de componentes é usado neste projeto — app HTML único, sem build. Gate de registry não se aplica.

---

## Fora de Escopo (não tocar nesta fase)

- Refino visual global (respiro, skeleton, motion coreografado, pinos semânticos) — Fase 13.
- Score de prédio agregado persistente — v2.2+ (ver 12-CONTEXT.md, Deferred Ideas).
- Comparação a partir do chooser do mapa (`showChooser`) — deferido, escopo desta fase é só a lista de busca.
- Qualquer requisição de rede nova (scoreOportunidade completo com stats de vizinhança, `compare()`, `compsStats()`) disparada a partir dos componentes desta fase.
- Alteração do `.bldg-head` fora da ADIÇÃO do `.bldg-sumario` — nome/Q-L/contagem/botão "no mapa ↗" existentes permanecem intocados.
- Persistência de `CMP` (seleção de comparação) ou do estado de ordenação/filtro por prédio — ambos vivem em memória, resetados a cada `finish()`.
- Nenhuma cor fora de `--paper/--paper-2/--ink/--line/--muted/--accent/--accent-ink/--lot` aparece em qualquer componente novo desta fase.

---

## Verificação (preview, mobile 375 + desktop 1280)

- Buscar um prédio com múltiplas unidades mostra o `.bldg-head` expandido com 4 métricas (unidades/área média/venal médio/estimado médio·faixa) + 2 botões de ação, ANTES da lista de cards.
- A métrica "estimado médio · faixa" aparece em `--accent`; as outras 3 aparecem em `--paper-2`/`--line` sobre o fundo escuro do `.bldg-head`.
- Clicar "🔍 Ordenar / filtrar" expande a barra com 4 chips + toggle "só aptos prováveis" + campo de busca — todos com `min-height:44px`.
- Clicar "Maior oportunidade"/"Menor estimado"/"Maior área" reordena a lista de unidades DAQUELE prédio sem disparar nenhuma requisição de rede (verificar aba Network do DevTools: zero request novo).
- Ativar "Só aptos prováveis" oculta unidades que são garagem/box ou uso não-residencial; campo de busca filtra por número de apto (`matchApto`).
- Cada card de unidade (dentro de um prédio) mostra um toggle "☐" no canto superior direito, com área de toque ≥44×44 mesmo com glifo visual menor.
- Marcar 2 unidades faz aparecer o botão flutuante "⚖️ Comparar (2)"; marcar a 3ª e 4ª atualiza o contador; tentar marcar a 5ª mostra o toast de limite e mantém a 5ª desmarcada.
- Clicar "Comparar (N)" abre o sheet com tabela: colunas = unidades marcadas, linhas = Área/Venal/Estimado/R$/m²/Oportunidade; unidades sem dado mostram "—" em cada célula correspondente.
- No mobile 375 com 3-4 colunas marcadas, a TABELA rola horizontalmente DENTRO do sheet (a página/body não rola horizontalmente); a coluna de rótulos permanece fixa à esquerda ao rolar.
- Clicar "Abrir ficha ↗" em qualquer coluna fecha o sheet de comparação e abre a ficha daquela unidade.
- Fechar o sheet de comparação (× ou Esc) preserva as marcações nos cards — reabrir "Comparar (N)" mostra a mesma seleção.
- Uma nova busca (`buscar()`) limpa `CMP`, fecha qualquer sheet de comparação aberto e reseta a ordenação/filtro do prédio para "Padrão".
- "💬 Copiar análise do prédio" copia para a área de transferência um texto formatado com nome/Q-L/métricas — omitindo a linha de estimado quando não há dado, nunca mostrando "—" no texto copiado.
- Um prédio onde nenhuma unidade tem `mercadoEstimado` (ex.: só salas comerciais) mostra "sem estimativa disponível" na métrica correspondente, sem erro visual.
- Um prédio 100% garagem (após desmarcar "ocultar garagem") mostra rótulo "vagas/boxes" e "sem estimativa disponível" no estimado médio.
- Nenhum elemento tocável novo mede menos de 44px em DevTools (mobile 375).
- `prefers-reduced-motion` ativo: sheet de comparação abre sem animação de entrada além da já existente; reordenação da lista não repete a animação de stagger.
- Nenhuma cor fora da paleta declarada aparece em qualquer componente novo.
- Guarda mobile herdada: a lista de unidades do prédio continua visível (não atrás do form) após a busca; venal sem dado continua mostrando "não informado" (`venalTxt`).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
