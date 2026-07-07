---
phase: 13
slug: refino-visual-pinos-motion-descoberta
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-07
---

# Phase 13 — UI Design Contract

> Visual and interaction contract para REFINO VISUAL + PINOS SEMÂNTICOS + MOTION DE BUSCA EM ETAPAS + DESCOBERTA PROGRESSIVA. Refina a identidade cartográfica/óxido já existente (Fases 7-12) — NÃO é rebrand, NÃO migra pra base branca, ZERO fonte nova. Cor entra em jogo SÓ como sistema de status (`--status-*`), sempre derivado de hex já existente no `:root`, sempre com reforço textual/ícone. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** (1) sistema `--status-*` (bom/atenção/risco/caixa/sem-dado) derivado 1:1 dos hex já no `:root`; (2) refino de respiro com lista explícita de seletores antes→depois; (3) pinos semânticos em `plot()` (raio/cor/borda por status) + legenda discreta + a11y do popup; (4) motion de busca em etapas com as 5 mensagens literais do §14 atreladas às fases REAIS de `buscar()`; skeleton shimmer CSS-only para cards/listas; (5) onboarding 3 cartões puláveis (`radar_onboard`) + área "O que o Radar faz"; (6) lei da tela varrida no `.chooser` (o único que faltava — `.captSheet`/`.cmpSheet` já ok). NÃO inclui: Território/choropleth (Fase 15), rebrand.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla; reuso extensivo de `.card`/`.chips`/`.detail`/`.score`/`.loading`/`.spin`/`.wiz`/`.foot`/`.coachmark`/`.searchpill` já existentes |
| Icon library | emoji textual (🟢🟡🔴🏦⬜ para pinos; 🔍📍💬 já usados no app) — NENHUM ícone SVG novo, mesmo padrão das Fases 7-12 |
| Font | `"IBM Plex Sans"` (UI/copy) + `"IBM Plex Mono"` (rótulos técnicos/legenda) — zero fonte nova, herdado 1:1 |

Identidade: cartográfica/oxide (papel + tinta + carimbo vermelho-óxido). Esta fase é a única cujo objetivo explícito é o REFINO da identidade — não a substituição. Toda mudança desta fase é: (a) espaçamento/respiro em tokens já existentes, (b) remoção de borda/caixa redundante, (c) `--status-*` derivado, (d) motion/skeleton reusando `mAnimate`/`REDUCE` já embutidos. Nenhum `border-radius` novo fora dos dois padrões já travados (2px caixas / 20-22px pills).

---

## Sistema de Cor de STATUS

### Derivação (zero hex novo — só VARS novas apontando pra hex já existentes)

O `:root` atual (linhas 24-49 do `radar-goiania.html`) já contém:

```css
--ink:#141a1f;    --paper:#e9e4d8;   --paper-2:#f2eee4;
--line:#c3b9a3;   --grid:#d8d0be;
--lot:#2c5545;    --lot-bright:#3f7a63;
--accent:#b5451f; --accent-2:#c9691f; --accent-ink:#8f3116;
--gold:#a8842c;   --muted:#57503f;   --ok:#2c5545;
```

`--lot`/`--ok` já são o MESMO hex `#2c5545` (verde-lote, reusado em `.score-op.alta`/`.conf-alta`/checkbox de marcação da Fase 12). `--gold` já é usado como amarelo/dourado (`.score-op.media`, camada CAIXA). `--accent` já é o vermelho-óxido (risco/erro). Isso significa que **3 dos 5 status já têm um hex válido no sistema** — só falta nomear semanticamente e verificar AA nos dois fundos relevantes (`--paper` e satélite/CARTO claro do mapa).

```css
:root{
  /* ... hex existentes acima, inalterados ... */

  /* Fase 13 VIS-01/PIN-01: sistema de STATUS — cada var abaixo é um ALIAS de um hex
     JÁ EXISTENTE no :root (documentado à direita). Nenhum hex novo introduzido.
     Cor de status SEMPRE acompanha texto/ícone — nunca é o único veículo de significado. */
  --status-bom:      var(--lot);        /* = #2c5545, mesmo verde de .score-op.alta/.conf-alta (Fase 9) */
  --status-bom-ink:  var(--lot-bright); /* = #3f7a63, já existente — usado p/ hover/estado ativo do status-bom */
  --status-atencao:  var(--gold);       /* = #a8842c, mesmo dourado de .score-op.media (Fase 9) */
  --status-atencao-ink: #7d621f;        /* já usado literal em .score-op.media .score-num (linha 321) — nomeado aqui, mesmo hex */
  --status-risco:    var(--accent);     /* = #b5451f, mesmo óxido de .score-op.baixa/erro (Fase 9) */
  --status-risco-ink: var(--accent-ink);/* = #8f3116, já existente */
  --status-caixa:    var(--gold);       /* = #a8842c, MESMO hex do pino dourado CAIXA já plotado (toggleCaixa, linha 4504) — reaproveita, não duplica */
  --status-semdado:  var(--muted);      /* = #57503f, cinza neutro já usado p/ texto secundário — nunca confundir com --line (#c3b9a3, borda) */
}
```

**Nota sobre `--status-atencao` vs `--status-caixa` compartilharem `--gold`:** são conceitualmente distintos (score médio vs. imóvel Caixa) mas usam o MESMO hex — isso é aceitável porque nunca aparecem competindo no mesmo contexto visual (pino Caixa é sempre acompanhado do ícone 🏦/rótulo "Caixa"; status atenção é sempre acompanhado do rótulo "Atenção"/score). Se a Fase 15+ precisar diferenciá-los visualmente lado a lado, deriva-se `--status-caixa-2` naquele momento — fora de escopo aqui.

### Tabela de mapeamento score → status (bandas da Fase 9, `scoreOportunidade()`)

| Banda (score) | Rótulo já existente (Fase 9) | `--status-*` | Onde já era usado antes desta fase |
|---|---|---|---|
| score ≥ 66 | "Boa oportunidade" | `--status-bom` | `.score-op.alta` |
| 33 ≤ score < 66 | "Oportunidade média" | `--status-atencao` | `.score-op.media` |
| score < 33 | "Abaixo da mediana" | `--status-risco` | `.score-op.baixa` |
| sem `stats` (score null) | — | `--status-semdado` | (novo mapeamento — antes caía no cinza padrão `--line`/`--muted` sem nome) |
| imóvel da camada CAIXA | — | `--status-caixa` | `toggleCaixa()`/`caixaLayer` (dourado já fixo) |

Esta tabela é o contrato único que TODO componente novo desta fase (pino do mapa, legenda, qualquer badge futuro) consulta — nunca reimplementa os limiares 66/33 fora de `scoreOportunidade()`.

### Contraste AA

| Par | Contraste | Aprovação |
|---|---|---|
| `--status-bom` `#2c5545` sobre `--paper` `#e9e4d8` | ~7.5:1 | AA/AAA — já aprovado (herdado de `.conf-alta`) |
| `--status-atencao` `#a8842c` sobre `--paper` `#e9e4d8` | ~3.1:1 | **Falha AA para texto normal** (<4.5:1) — por isso o rótulo textual junto ao status-atenção usa `--status-atencao-ink` (`#7d621f`, ~5.2:1, já era o hex literal usado em `.score-op.media .score-num`) OU peso 700+ tamanho ≥18px (regra de "texto grande" AA, 3:1 basta) — nunca `--gold` puro para texto de leitura corrida |
| `--status-risco` `#b5451f` sobre `--paper` `#e9e4d8` | ~4.9:1 | AA — já aprovado (herdado de `.score-op.baixa`/CTAs primárias) |
| `--status-semdado` `#57503f` sobre `--paper` `#e9e4d8` | ~7:1 | AA/AAA — já aprovado (é o `--muted` já usado em texto secundário) |
| Pino sobre mapa CARTO claro (fundo médio ~`#f0efe9`, tile CARTO Positron) | mesma ordem de grandeza do fundo `--paper` (cores muito próximas por design) | os 3 hex de status já têm borda `1.5-2px` sólida em `--ink` (`#141a1f`, >13:1 sobre qualquer fundo claro) — a BORDA escura é o que garante legibilidade sobre o mosaico de tiles, não o fill isolado; ver Componente Pinos |
| Pino sobre satélite (tiles de imagem, contraste variável) | não garantido por design de cor — mitigado pela borda `--ink` 2px + halo | listado no `Phase flags` do ROADMAP como pendência de UAT (não bloqueante), igual ao herdado do v2.0 — esta fase não resolve legibilidade sobre foto aérea, só garante o par cor+borda+ícone |

**Regra dura herdada e reforçada nesta fase:** nenhum uso de `--status-*` aparece sem (a) rótulo textual OU (b) ícone/glifo ao lado — nunca só a cor sozinha, em NENHUM componente (pino, legenda, badge, texto).

---

## Refino de Respiro — Lista Explícita de Seletores (antes → depois)

Executor implementa EXATAMENTE esta lista — nenhum ajuste "a critério" fora dela.

| Seletor | Propriedade | Antes | Depois | Motivo |
|---|---|---|---|---|
| `.detail` | `padding` | `16px 18px` | `20px 22px` | mais respiro na moldura principal da ficha — ganho de 4px em ambos os eixos |
| `.detail .dvalor` | `padding` | `16px 18px` | `18px 20px` | acompanha o novo padding do container pai proporcionalmente |
| `.detail .dvalor` | `margin-bottom` | `12px` | `16px` | separa mais claramente o bloco-herói (valor) do bloco de scores abaixo |
| `.dscores` | `gap` | `8px` | `10px` | leve mais ar entre os 2 cartões de score |
| `.dscores` | `margin-bottom` | `12px` | `16px` | mesmo tratamento do `.dvalor` — todos os blocos principais da ficha ganham `16px` entre si (era `12px` uniforme) |
| `.dleitura` | `padding` | `12px 14px` | `14px 16px` | acompanha o refino geral |
| `.dleitura` | `margin-bottom` | `12px` | `16px` | consistência com os blocos acima |
| `.detail .dgrid .cell` | `border` | `1px solid var(--line)` | `1px solid var(--line)` (mantido) — MAS `.detail .dtecnico .footbody` (container-pai do `.dgrid`) some a `border-top` redundante se existir | remove "caixa dentro de caixa": o `.dgrid .cell` já tem borda própria; o wrapper não precisa de segunda borda |
| `.score` | `padding` | `8px 12px` | `10px 14px` | cartão de score ganha respiro interno (era o mais apertado da ficha) |
| `.card` | `padding` | `13px 14px` | `14px 16px` | cards da lista de resultados — leve mais ar sem mudar a densidade percebida |
| `.card .vals` | `padding-top` | `9px` | `10px` | acompanha o padding maior do card |
| `.bldg-head` | `padding` | `10px 12px` | `12px 14px` | resumo do prédio (Fase 12) ganha o mesmo tratamento dos outros blocos-herói |
| `.bldg-sumario` | `margin-top`/`padding-top` | `8px`/`8px` | `10px`/`10px` | consistência com o novo ritmo de `16px` entre blocos maiores, `10px` entre sub-blocos |
| `.foot` | `padding` | `9px 22px` | `10px 22px` | ajuste mínimo — mantém o rodapé discreto, só alinha ao ritmo vertical novo |
| `.maisopcoes .footbody.acts` | `padding-top` | `8px` | `10px` | consistência |
| `.wiz .wbody` (herdado Fase 11/11.1/12) | `padding` | `4px 22px 20px` | mantido — já é o maior padding do sistema, não precisa de ajuste | fora de escopo (já generoso) |
| `.searchpill` | `padding` | `12px 16px` | mantido | fora de escopo — já é um pill com bom respiro |

### Bordas duplas / caixa-dentro-de-caixa a remover

| Local | Antes | Depois | Motivo |
|---|---|---|---|
| `.detail .dtecnico .footbody .dgrid .cell` | `.dgrid` (grid container, sem borda própria hoje — OK) → `.cell` com `border:1px solid var(--line)` | mantido — não há duplicação real aqui, é 1 borda por cell | falso positivo identificado durante a auditoria — registrado para não ser "refinado" à toa pelo executor |
| `.bldg-ord` dentro de `.bldg-head`-adjacente (Fase 12) | `.bldg-ord{border:1px solid var(--line)}` logo abaixo do `.bldg-head{background:var(--ink)}` sem borda própria | mantido — são blocos IRMÃOS (não aninhados), a borda do `.bldg-ord` não duplica nada | idem — falso positivo, registrado |
| `.detail` (borda `2px solid var(--ink)`) + `.dvalor` (borda `2px solid var(--ink)`) | duas bordas de `2px` na MESMA cor, uma dentro da outra (ficha → bloco de valor) | `.dvalor` reduz a borda para `1.5px solid var(--ink)` (mantém a cor, reduz o peso) — a moldura externa (`.detail`) já demarca o cartão inteiro; o bloco interno não precisa da MESMA espessura | esta É a duplicação real: 2 bordas de mesma espessura/cor aninhadas competem visualmente; reduzir a interna resolve sem perder a hierarquia (externa continua "mais pesada") |
| `.score` (borda `1.5px solid var(--line)`) dentro de `.dscores` (sem borda própria, é `flex` container) | não há duplicação — `.dscores` não tem borda | mantido — falso positivo, registrado para não ser tocado |

### Óxido decorativo → neutro (onde `--accent` aparece sem ser status/CTA)

| Seletor | Uso atual do `--accent` | Ação | Motivo |
|---|---|---|---|
| `.brand .eyebrow` | `color:var(--accent)` — rótulo "RADAR FUNDIÁRIO" no topo do painel | **mantido** — é a marca/identidade, não decoração aleatória; óxido na marca é intencional e não compete com status | fora de escopo — é branding, a decisão travada do milestone protege isso |
| `.brand .stamp` | `border:1.5px solid var(--accent); color:var(--accent)` — selo "GOIÂNIA · GO" | **mantido** — mesmo motivo, é o "carimbo cadastral" da identidade | fora de escopo |
| `.card .matchapprox` | `color:var(--accent)` — selo "match aproximado" | **mantido** — é feedback de qualidade de busca (BUSCA-04), não decoração; já é semântico (avisa incerteza), não puramente estético | fora de escopo — já tem função |
| `.card .vals .ref .lbl`/`.ref b` | `color:var(--accent)` — rótulo+valor de "mercado estimado" no card | **mantido** — é o número-âncora da decisão comercial (Fase 9), função clara, não decoração | fora de escopo |
| `.modemore.on` | `color:var(--accent)` — link "Inscrição" ativo no seletor de modo | **mantido** — indica estado ativo (seleção), função de UI, não decoração pura | fora de escopo |
| `.detectchip.media` | `border-color:var(--accent)` — chip de confirmação quando confiança é média | **mantido** — é sinalização real de incerteza (BUSCA-02), função semântica | fora de escopo |
| body `::before` (malha de fundo) | usa `--grid` (não `--accent`) | **já neutro** — confirma que a textura de fundo NUNCA usou óxido, nenhuma ação necessária | verificação, sem mudança |

**Conclusão da varredura:** não foi encontrado nenhum uso de `--accent` que seja "decorativo sem função" — todos os usos atuais já carregam significado (marca, estado ativo, incerteza, valor-âncora). A regra "óxido sem parecer alerta constante" desta fase se cumpre pela INTRODUÇÃO do sistema `--status-*` (que agora reserva verde/amarelo/vermelho para status, liberando o óxido de precisar cobrir "risco" sozinho em todo canto) — não por remoção de óxido existente, que já era funcional.

---

## Componente 1 — Pinos Semânticos (`plot()`)

**Localização:** função `plot(list)` (linha ~3015), onde hoje `L.circleMarker` usa cor fixa (`color:"#141a1f"` borda, `fillColor:"#b5451f"` fill) para TODO pino de resultado de busca.

### Regra de status por pino

```js
/* Fase 13 PIN-01: mapeia o status de EXIBIÇÃO do pino — nunca recalcula score aqui,
   só lê o que já está disponível em memória (a.__scores, populado nas Fases 9/10/12
   quando a ficha é aberta OU quando mercadoEstimado já roda barato na lista).
   Pino de PRÉDIO (várias unidades no mesmo ci) usa o MELHOR status entre as unidades
   (mais otimista vence — é um resumo, não uma média). */
function statusPino(a){
  if(a.__scores && a.__scores.op){
    const s=a.__scores.op.score;
    if(s>=66) return "bom";
    if(s>=33) return "atencao";
    return "risco";
  }
  return "semdado"; /* score ainda não calculado (ficha nunca aberta) — NÃO é erro, é estado neutro */
}
const PINO_STYLE={
  bom:      {fillColor:"#2c5545", radius:9},  /* --status-bom, hex documentado (não var() — Leaflet não lê CSS var) */
  atencao:  {fillColor:"#a8842c", radius:9},  /* --status-atencao */
  risco:    {fillColor:"#b5451f", radius:8},  /* --status-risco — mesmo tamanho/cor que já era o padrão hoje */
  semdado:  {fillColor:"#57503f", radius:7},  /* --status-semdado — ligeiramente menor, sinaliza "menos informação disponível" sem escondê-lo */
};
```

| Status | Fill | Borda | Raio | Quando |
|---|---|---|---|---|
| Bom (verde) | `#2c5545` | `#141a1f` 2px (mantido) | 9px | `__scores.op.score >= 66` |
| Atenção (amarelo) | `#a8842c` | `#141a1f` 2px (mantido) | 9px | `33 <= score < 66` |
| Risco (vermelho/óxido) | `#b5451f` | `#141a1f` 2px (mantido) | 8px (padrão herdado, sem mudança) | `score < 33` — **é o comportamento ATUAL do app antes desta fase (cor fixa óxido)**, agora nomeado e condicionado |
| Caixa (dourado) | `#a8842c` | `#141a1f` 1.5px (mantido, camada separada) | 7px (mantido, camada `caixaLayer` já existente) | imóvel da lista CAIXA — **camada já existe e já é dourada; esta fase só documenta o alias, zero mudança de código na camada CAIXA** |
| Sem dado (cinza) | `#57503f` | `#141a1f` 2px | 7px | `__scores` ausente — **estado mais comum na PRIMEIRA renderização de uma busca** (score só é calculado ao abrir a ficha/`compare()`), portanto a maioria dos pinos de uma busca nova nasce cinza e vai colorindo conforme o corretor abre fichas — comportamento correto, documentado aqui para não ser tratado como bug |

**Seleção/hover do pino** (já existente em `pick()`, linha 3101): continua trocando `radius:12,fillColor:"#c9691f"` (accent-2, cor de destaque de seleção) — este comportamento é ORTOGONAL ao status; um pino selecionado SEMPRE mostra `accent-2` independente do status, e volta ao status correto ao desmarcar. Nenhuma mudança nessa lógica além de restaurar para `PINO_STYLE[statusPino(a)]` em vez do fixo `fillColor:"#b5451f"` no `setStyle` de "desselecionar".

**Pino cinza (sem dado) continua clicável** — abre a ficha normalmente (`onclick` do marker inalterado); sem dado ≠ sem interação (regra travada no CONTEXT.md).

### Legenda discreta no mapa

**Decisão: SEMPRE visível quando há pinos plotados (não é toggle).** Justificativa: a legenda é pequena (uma linha de ícones+rótulos), o corretor precisa entender o código de cor na hora, e um toggle adicional competiria com a "lei da tela" (mais um elemento pra descobrir). Fica oculta quando `layerGroup` está vazio (nenhuma busca feita ainda) — mesma lógica condicional que outros elementos do mapa (`#breadcrumb`, `.coachmark`).

```html
<div id="pinoLegenda" class="pino-legenda" hidden aria-label="Legenda dos pinos no mapa">
  <span><i class="pl-dot" style="background:#2c5545"></i>Boa oportunidade</span>
  <span><i class="pl-dot" style="background:#a8842c"></i>Atenção</span>
  <span><i class="pl-dot" style="background:#b5451f"></i>Abaixo da mediana</span>
  <span><i class="pl-dot" style="background:#a8842c;border-style:dashed"></i>Caixa</span>
  <span><i class="pl-dot" style="background:#57503f"></i>Sem dado ainda</span>
</div>
```

| Elemento | Estilo | Fonte |
|---|---|---|
| `.pino-legenda` | `position:absolute; z-index:390; bottom:calc(16px + env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%); display:flex; gap:10px; flex-wrap:wrap; justify-content:center; max-width:calc(100vw - 32px); background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:6px 10px; font:600 10.5px/1.3 "IBM Plex Sans"; color:var(--muted); box-shadow:var(--shadow)` — MESMA família visual do `.coachmark`, `z-index` abaixo dele (390 igual, mas a legenda só aparece com resultados plotados e o coach só antes de qualquer busca — nunca coexistem) | reuso do padrão de "card flutuante discreto sobre o mapa" já estabelecido |
| Mobile (`≤820px`) | `bottom:calc(56px + 12px + env(safe-area-inset-bottom))` (acima da tab bar); reduz para 2 linhas de wrap se necessário, `font-size` mantido (não reduzir abaixo de 10.5px — AA de tamanho mínimo) | mesma lógica de ajuste já usada em `.toast`/`.cmp-fab` mobile |
| `.pl-dot` | `display:inline-block; width:8px; height:8px; border-radius:50%; border:1px solid var(--ink); margin-right:4px; vertical-align:middle` | ponto colorido pequeno — a COR reforça, o RÓTULO ao lado é o veículo real de significado (nunca só a bolinha) |
| Distinção Atenção vs. Caixa (mesmo hex `--gold`) | dot de "Caixa" usa `border-style:dashed` (traço) em vez de sólido — única diferença visual entre as duas entradas que compartilham `--status-atencao`/`--status-caixa` | garante que a legenda não pareça ter uma entrada duplicada — a distinção visual mínima (traço vs. sólido) + o RÓTULO textual (nunca ambíguo) resolve a colisão de hex documentada acima |

**Comportamento:** `atualizarLegenda()` chamado ao fim de `plot()` — `hidden` removido quando `list.length>0`, `hidden` adicionado quando a lista plotada é vazia ou ao limpar resultados. Nenhuma lógica de show/hide manual pelo usuário (não é toggle).

### Acessibilidade do popup/pino

- Cada `L.circleMarker` ganha `title` (tooltip nativo do Leaflet, `bindTooltip`) com o texto: `"${statusLabel} · ${endereçoOuUnidade}"` — ex.: `"Boa oportunidade · Rua Portugal 582"`. Isso garante que o status nunca dependa só da cor MESMO no hover/tooltip do mapa (que hoje não tem texto nenhum).
- O popup do pino Caixa (`caixaPopup`, já existente) já tem texto completo — sem mudança necessária, apenas confirma que o padrão "nunca só cor" já era seguido ali.
- `aria-label` não se aplica a elementos Leaflet/canvas diretamente (Leaflet não expõe isso nativamente) — o `title`/tooltip é o veículo de acessibilidade disponível nesta stack; documentado como limitação conhecida, não regressão.

---

## Componente 2 — Motion de Busca em Etapas

**Regra dura:** as 5 mensagens são LITERAIS (nenhuma variação de texto) e disparadas por PROGRESSO REAL dentro de `buscar()` — nunca por `setTimeout` decorativo ("teatrinho de timer" é proibido pelo CONTEXT.md).

| # | Mensagem literal (§14) | Fase REAL de `buscar()` onde dispara |
|---|---|---|
| 1 | "Localizando imóvel…" | Início de QUALQUER modo (`insc`/`addr`/`bd`/`ql`) — antes da 1ª chamada de rede (`jsonp`/`fetchWhere`); substitui as mensagens específicas por modo atuais ("consultando inscrição…"/"consultando o endereço…"/"procurando o edifício…"/"consultando a quadra…") |
| 2 | "Consultando cadastro…" | No meio da resolução — quando a 1ª leva de `fetchWhere`/`jsonp` está em voo (mesmo ponto onde hoje troca pra "número não achado — varrendo a rua…" no fallback de endereço) |
| 3 | "Calculando estimativa…" | Após `items` resolvido, dentro de `finish(items)` — no laço que roda `mercadoEstimado()` sobre a lista (client-side, síncrono, mas visualmente merece seu próprio passo pois pode ser perceptível em listas grandes) |
| 4 | "Buscando comparáveis…" | Só quando aplicável — se `finish()` disparar `compare()`/`compsStats()` para a ficha já abrir com stats (Fase 9 Wave 3); em busca de LISTA (sem ficha aberta ainda) esta etapa é PULADA (não é teatro — se não há requisição de comparáveis em voo, não mostra a mensagem) |
| 5 | "Preparando mapa…" | Dentro de `plot(list)`, antes do `map.fitBounds`/`map.setView` — último passo antes do `loading(false)` final |

### Implementação (client-side, sem nova dependência)

`loading(on,msg)` já aceita mensagem (linha 2425) — nenhuma mudança de assinatura. `buscar()` ganha chamadas adicionais de `loading(true, MSG)` nos pontos acima, substituindo as mensagens específicas de modo por "Localizando imóvel…" (mensagem 1) e inserindo as mensagens 2/3/5 nos pontos reais já identificados. A mensagem 4 é condicional — só chamada se o caminho de código que dispara `compare()` for alcançado (não adicionar `setTimeout` para forçá-la a aparecer sempre).

```js
/* Fase 13 MOT-01: as 5 mensagens são literais e fixas — nunca strings interpoladas.
   Reusa loading(on,msg) já existente (linha 2425), zero mudança de assinatura. */
const MOTION_MSG={
  localizando:  "Localizando imóvel…",
  cadastro:     "Consultando cadastro…",
  estimativa:   "Calculando estimativa…",
  comparaveis:  "Buscando comparáveis…",
  mapa:         "Preparando mapa…",
};
```

**Nota sobre mensagens de erro/fallback já existentes** ("número não achado — varrendo a rua…"): PERMANECEM como estão — são mensagens de ESTADO DE ERRO/FALLBACK real (algo não deu certo, o app está tentando de novo), não fazem parte da sequência feliz das 5 etapas. As 5 mensagens do §14 cobrem o caminho feliz; o fallback de rua continua sendo seu próprio aviso honesto, sobrepondo temporariamente a sequência (a próxima chamada de `loading()` real retoma a sequência de onde ela estava).

### Skeleton shimmer (CSS-only)

**Onde:** cards da lista de resultados (`.card`) e `.bldg-head`, durante o intervalo entre `loading(true, MOTION_MSG.localizando)` e o primeiro `render()`. Hoje o `.loading` full-screen (overlay com spinner) já cobre esse intervalo — o skeleton é um COMPLEMENTO opcional para buscas que produzem lista longa (`fetchWhere` paginado, pode levar >1s), mostrado nos primeiros N slots de `#results` ANTES do `.loading` overlay tradicional desaparecer, dando sensação de progresso na área que vai preencher.

```css
/* Fase 13 MOT-01: skeleton shimmer — CSS only, reusa --line/--paper-2 já existentes.
   REDUCE: fica ESTÁTICO (sem animation), nunca esconde a affordance de "carregando". */
.skel-card{margin:8px 16px;background:var(--paper-2);border:1.5px solid var(--line);border-radius:2px;
  padding:14px 16px;height:92px;overflow:hidden;position:relative}
.skel-line{height:10px;border-radius:2px;background:var(--line);margin-bottom:8px;
  background-image:linear-gradient(90deg,var(--line) 0%,var(--paper) 50%,var(--line) 100%);
  background-size:200% 100%;animation:skel-shimmer 1.4s ease-in-out infinite}
.skel-line.w60{width:60%}.skel-line.w40{width:40%}.skel-line.w80{width:80%}
@keyframes skel-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion: reduce){
  .skel-line{animation:none;background-image:none;background:var(--line)} /* ESTÁTICO — mesma cor sólida, zero movimento */
}
```

| Elemento | Markup | Comportamento |
|---|---|---|
| `#results` durante busca | 2-3 `<div class="skel-card">` com 3 `.skel-line` (larguras 80/60/40%) injetados via `innerHTML` no INÍCIO de `buscar()`, substituindo `.empty`/lista anterior | some no `finish()` real (substituído pelo `render()` de verdade) — nunca fica "pendurado" se a busca falhar (o bloco de erro do `catch` já substitui `#results.innerHTML` inteiro) |
| Reduced motion | shimmer vira cor sólida estática (`--line`), sem `animation` | o skeleton AINDA aparece (continua comunicando "carregando"), só não anima — cumpre "REDUCE→estático" do CONTEXT.md |

---

## Componente 3 — Onboarding (3 cartões puláveis)

**Chave de persistência:** `radar_onboard` (convenção `radar_`, `try/catch` — mesmo padrão de `radar_coach`/`radar_prof`). Nunca reaparece após dispensado (`Pular` ou `Começar`).

### Conteúdo (copy literal pt-BR — locked pelo CONTEXT.md)

| Cartão | Título | Corpo | CTA |
|---|---|---|---|
| 1/3 | "Busque qualquer imóvel" | "Digite endereço, quadra/lote, nome do prédio ou inscrição — numa caixa só. O Radar entende o que você quer dizer." | "Pular" (topo/canto, sempre visível) · "Próximo" (primário) |
| 2/3 | "Veja valor e oportunidade" | "Cada imóvel mostra a faixa de valor estimado, o score de oportunidade e uma leitura em linguagem simples — sem jargão técnico." | "Pular" · "Próximo" |
| 3/3 | "Gere documentos e capte" | "Gere ficha, relatório ou laudo em PDF, copie mensagens prontas pro WhatsApp e monte a proposta — tudo pelo Radar." | "Pular" · "Começar" (primário, fecha o onboarding) |

### Estrutura

```html
<div class="onb" id="onbOverlay" hidden role="dialog" aria-modal="true" aria-label="Como usar o Radar Fundiário">
  <div class="onb-card">
    <button type="button" class="onb-skip" onclick="onbFechar()">Pular</button>
    <div class="onb-dots" aria-hidden="true"><span class="on"></span><span></span><span></span></div>
    <div class="onb-body" id="onbBody">
      <h2 id="onbTitulo"></h2>
      <p id="onbTexto"></p>
    </div>
    <button type="button" class="onb-next" id="onbNext" onclick="onbAvancar()">Próximo</button>
  </div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|---|---|---|
| `.onb` | `position:fixed; inset:0; z-index:1000; background:rgba(20,26,31,.55); display:none; align-items:center; justify-content:center; padding:16px` — `.show{display:flex}` | overlay modal, MESMA família de z-index dos sheets (`.wiz`=2000, este fica abaixo — onboarding não deve competir com nenhum wizard de documento, mas nunca coexiste com eles de qualquer forma, pois é a 1ª tela do app) |
| `.onb-card` | `background:var(--paper-2); border:2px solid var(--ink); border-radius:3px; padding:24px 22px; max-width:380px; width:100%; position:relative; box-shadow:0 8px 24px rgba(20,26,31,.3)` | mesma família visual de `.detail`/`.wiz` (moldura escura sobre papel claro) |
| `.onb-skip` | `position:absolute; top:10px; right:10px; min-height:44px; min-width:44px; padding:0 12px; border:0; background:transparent; color:var(--muted); font:600 12.5px/1 "IBM Plex Sans"; cursor:pointer` — hover `color:var(--accent)` | discreto, canto superior direito, SEMPRE visível nos 3 cartões (regra travada) |
| `.onb-dots` | `display:flex; gap:6px; justify-content:center; margin-bottom:14px` — `span{width:7px;height:7px;border-radius:50%;background:var(--line)}` `.on{background:var(--ink)}` | indicador de progresso 1/3-3/3, mesmo padrão visual de `.wdots` já usado nos wizards de documento |
| `.onb-body h2` | `font:800 20px/1.2 "IBM Plex Sans"; color:var(--ink); margin:0 0 10px` | herói do cartão — título curto, direto |
| `.onb-body p` | `font:500 14px/1.5 "IBM Plex Sans"; color:var(--muted); margin:0` | corpo, tom conversacional, sem jargão |
| `.onb-next` | `width:100%; margin-top:20px; min-height:44px; border:0; background:var(--accent); color:#fff; font:700 15px/1 "IBM Plex Sans"; border-radius:2px; cursor:pointer` — hover `background:var(--accent-ink)` | única CTA primária por tela — "Próximo" nos cartões 1-2, "Começar" no cartão 3 (mesmo botão, texto trocado via JS) |

### Comportamento

- `initOnboard()`: chamado no `init()` do app (mesmo bloco de `initCoach()`, linha ~4578) — lê `localStorage.getItem("radar_onboard")` em `try/catch`; se ausente, mostra `#onbOverlay` com o cartão 1.
- `onbAvancar()`: avança `onbIdx` (0→1→2); atualiza título/texto/dots; no cartão 3, troca o texto do botão para "Começar" e o `onclick` passa a chamar `onbFechar()`.
- `onbFechar()`: seta `localStorage.setItem("radar_onboard","1")` em `try/catch` (nunca lança excessão — mesmo padrão do `radar_coach`); oculta `#onbOverlay`; foco retorna ao elemento que tinha foco antes de abrir (ou ao `#searchPill` como fallback, primeiro elemento interativo natural da tela inicial).
- **Nunca reaparece** — se `localStorage` falhar (modo privado/quota), o app assume "já visto" na próxima sessão daquela aba (fail-safe: nunca trava o usuário mostrando o onboarding repetidamente por erro de storage) — mesma filosofia de "falha de escrita é visível, mas nunca bloqueia o uso" da Fase 10.
- **Onboarding do APP vs. coach do MAPA:** `initCoach()` (existente, `radar_coach`) permanece INTOCADO — é uma dica pontual do mapa ("toque num bairro..."), independente. O onboarding desta fase é a introdução ao APP inteiro (1ª tela) e é exibido ANTES/sobre a tela inicial — se ambos disparassem na mesma sessão (usuário nunca viu nenhum dos dois), o onboarding aparece primeiro (é modal, bloqueia interação) e o coach aparece normalmente depois que o onboarding fecha (o coach já é condicional a `setView`/interação, não corre risco de aparecer atrás do overlay).
- **REDUCE-safe:** abertura/troca de cartão usa `mAnimate` (fade simples, `opacity:[0,1]`) — sob `prefers-reduced-motion`, aparece/troca instantaneamente (sem animação), nunca sem conteúdo.
- **Foco gerenciado:** ao abrir, foco vai para `.onb-skip` (primeiro elemento interativo, mesmo padrão de "primeiro elemento" já usado em sheets); `Esc` fecha e persiste (equivalente a "Pular") — entra na cadeia de Esc do `keydown` global na posição de maior prioridade (é modal, sempre por cima).
- **44px:** `.onb-skip`, `.onb-next`, dots (decorativos, não tocáveis) — todo elemento tocável ≥44px.

---

## Componente 4 — "O que o Radar faz"

### Superfície escolhida: item dentro do `<details class="foot">` já existente ("Fontes & metodologia"), como uma segunda `<details>` irmã — NÃO dentro do menu principal, discreta, no rodapé do painel de busca.

**Por quê esta superfície e não outra:** o `.foot` (linha 830) já é o padrão do app para "informação de apoio, discreta, sob demanda" (mesmo tratamento visual do "Dados técnicos"/"Metodologia" da ficha, Fase 9). Colocar "O que o Radar faz" como uma segunda entrada `<details>` ali é consistente com o vocabulário visual já estabelecido, não introduz um menu novo, e fica sempre acessível (rodapé do painel de busca, visível em qualquer estado — vazio ou com resultados).

```html
<details class="foot" id="oQueFaz">
  <summary>O que o Radar faz</summary>
  <div class="footbody">
    <ul class="oqf-lista">
      <li><b>Busca unificada</b> — endereço, quadra/lote, prédio ou inscrição numa caixa só. <button type="button" onclick="focusFirstField()">Buscar agora →</button></li>
      <li><b>Valor e oportunidade</b> — faixa estimada, score de oportunidade e leitura em linguagem simples. <button type="button" onclick="onbAbrirDireto(1)">Ver como →</button></li>
      <li><b>Documentos prontos</b> — ficha, relatório ou laudo em PDF, minutas de proposta/contrato. <button type="button" onclick="onbAbrirDireto(2)">Ver como →</button></li>
      <li><b>Ação comercial</b> — mensagens prontas pro WhatsApp, modo captação, salvar oportunidades. <button type="button" onclick="onbAbrirDireto(2)">Ver como →</button></li>
      <li><b>Oportunidades da Caixa</b> — imóveis à venda da Caixa, plotados no mapa. <button type="button" onclick="toggleCaixa()">Ver no mapa →</button></li>
    </ul>
  </div>
</details>
```

| Elemento | Estilo | Fonte |
|---|---|---|
| `#oQueFaz` | reuso literal de `.foot` — zero CSS novo na moldura | mesma classe do "Fontes & metodologia" |
| `.oqf-lista` | `list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px` | lista compacta, sem marcadores (o `<b>` já hierarquiza) |
| `.oqf-lista li` | `font:500 12px/1.5 "IBM Plex Sans"; color:var(--muted)` — `b{color:var(--ink);font-weight:600}` | mesmo tom do `.footbody` já existente |
| `.oqf-lista button` | `display:inline; border:0; background:transparent; color:var(--accent); font:600 12px/1 "IBM Plex Sans"; cursor:pointer; padding:2px 4px; margin-left:2px; text-decoration:underline; text-underline-offset:2px; min-height:32px` — `min-height` menor que 44px pois é um LINK textual inline, não um botão de toque isolado; área de clique compensada por `padding` vertical implícito da linha (`line-height` do `li`) garantindo ≥24px de altura de linha tocável, aceitável para link inline (mesmo padrão de `.modemore`/links textuais já existentes no app) | cada capacidade tem SEU CTA — nunca um "saiba mais" genérico; cada botão leva à superfície certa (busca, onboarding retomado no cartão relevante, ou o toggle real da Caixa) |

**Comportamento:**
- Cada CTA da lista executa a AÇÃO REAL (não abre um texto explicativo genérico): "Buscar agora" foca o campo de busca; "Ver como" reabre o overlay de onboarding NO CARTÃO relevante (`onbAbrirDireto(idx)`, nova função pequena que seta `onbIdx` e mostra `#onbOverlay` sem checar `radar_onboard` — é reentrada manual, não a 1ª exibição); "Ver no mapa" chama `toggleCaixa()` de verdade.
- Nunca é um menu principal — é uma `<details>` a mais no rodapé, mesmo peso visual/hierárquico do "Fontes & metodologia" que já existe ali, coerente com "entrada discreta" do CONTEXT.md.

---

## Lei da Tela — Checklist Final por Superfície

| Superfície | 1 ação primária | ≤2 secundárias | "Mais opções" | Status antes da Fase 13 | Ação nesta fase |
|---|---|---|---|---|---|
| `.detail` (ficha) | ⭐ Salvar / CTA de ação principal (`.acts button.primary`) | 2 botões em `.acts` | `#dActsMore` (`.maisopcoes`) | ✅ já conforme (Fase 9/10) | nenhuma — só herda o refino de respiro |
| `#captSheet` (Modo Captação) | conforme já auditado na Fase 10 | idem | idem | ✅ ok | nenhuma |
| `#cmpSheet` (Comparação, Fase 12) | "Abrir ficha ↗" por coluna (não é 1 CTA de tela, é ação por linha — aceito, documentado na Fase 12) | — | — | ✅ ok (aceito na Fase 12) | nenhuma |
| `#chooser` (seletor de unidade ao clicar prédio no mapa) | **FALTAVA auditoria** — hoje é só uma lista de `.chrow` clicáveis, sem hierarquia de "1 ação principal" explícita | — | — | ❌ nunca auditado sob a lei da tela | **Ação desta fase:** ver Componente 5 abaixo |
| Tela inicial (mapa + busca vazia) | `#searchPill`/caixa única — já é a ação primária óbvia | 3 benefícios (chips de exemplo, `.examplechips`) — já existem, funcionam como "secundárias" de descoberta | `.foot` ("Fontes & metodologia" + "O que o Radar faz" novo) | ✅ já conforme, esta fase SÓ adiciona a entrada "O que o Radar faz" no `.foot` (não muda a hierarquia) | Componente 4 acima |

### Componente 5 — Auditoria do `.chooser`

O `.chooser` (linha 890, seletor de unidades de um prédio clicado no mapa) hoje é uma lista pura de `.chrow` (cada linha = 1 unidade, clicável, abre a ficha). Sob a lei da tela: **a ação primária de CADA linha É "abrir a ficha daquela unidade"** — não há uma ação de tela separada das linhas (diferente de `.detail`, que tem CTAs além do conteúdo). Isso é estruturalmente CORRETO (é um seletor, não uma ficha) — a auditoria conclui que o `.chooser` já cumpre a lei da tela por design (não há ação "escondida" nem ambiguidade), mas identifica UM ajuste: o cabeçalho (`#chNm`/`#chSub`) não tem NENHUMA ação própria (só texto informativo) — abaixo dele, cada `.chrow` é auto-suficiente. Nenhuma mudança estrutural necessária; apenas o refino de respiro (herdado da tabela geral) se aplica ao `.chooser` como aos demais `.detail`-like (`padding:16px 18px`→`20px 22px`, mesma entrada da tabela de Refino).

**Conclusão da varredura de lei da tela:** todas as superfícies já auditadas nas Fases 9-12 permanecem conformes; a única lacuna real (`.chooser`) é resolvida por classificação (não precisa de CTA nova) + herda o refino de respiro geral.

---

## Spacing Scale

Escala já implícita no código (múltiplos de 4, alvo de toque 44px) — reforçada nesta fase:

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | gap entre `.pl-dot` e rótulo na legenda; gap entre `.onb-dots` |
| sm | 8px/10px | gap entre cartões de score (`.dscores`, 8→10px); gap entre item de `.pino-legenda` (10px); gap entre `.oqf-lista li` (10px) |
| md | 16px | novo padding padrão de `.detail`/`.dleitura`/blocos principais (era 12-14px); `margin-bottom` uniforme entre blocos-herói da ficha |
| touch | **44px mínimo** | `.onb-skip`, `.onb-next`, dots decorativos excluídos (não tocáveis); todo pino recebe raio visual menor que 44px MAS a área de clique do Leaflet (`circleMarker`) já usa um raio de detecção maior que o visual — herdado, sem mudança |
| lg | 20-22px | novo padding de `.detail`/`.onb-card` (era 16-18px) |

Exceções: `.oqf-lista button` (link inline, ~24-32px de altura de linha tocável) — documentado acima, mesmo padrão de `.modemore` já aceito no sistema.

---

## Typography

Reuso total — nenhum tamanho/peso/família novo introduzido.

| Role | Size | Weight | Line Height | Onde já existe / reuso |
|------|------|--------|-------------|--------------------------|
| Título de cartão de onboarding (`.onb-body h2`) | 20px | 800 | 1.2 | reuso do padrão `.brand h1`/`.dvalor-v` (peso 800, display) |
| Corpo de cartão de onboarding (`.onb-body p`) | 14px | 500 | 1.5 | reuso literal de `.dleitura p` |
| Botão "Pular"/rodapé de legenda (`.onb-skip`, `.pino-legenda span`) | 12.5px / 10.5px | 600 | 1 / 1.3 | reuso de `.modemore`/`.foot` |
| CTA "Próximo"/"Começar" (`.onb-next`) | 15px | 700 | 1 | reuso do padrão `.go`/`.detail .acts button.primary` |
| Item de "O que o Radar faz" (`.oqf-lista li`) | 12px | 500 (600 no `<b>`) | 1.5 | reuso literal de `.footbody` |
| Mensagem de motion (`#loadmsg`) | 12px | 600 | 1 | **inalterado** — já existente, zero mudança de estilo, só o conteúdo textual passa a seguir a sequência das 5 mensagens |
| Skeleton (`.skel-line`) | — (sem texto, é bloco de cor) | — | — | não aplicável — é um placeholder visual, não tipografia |

Sem novo weight — 400/500/600/700/800 já cobrem tudo (nenhum peso fora dessa lista aparece em qualquer componente novo desta fase).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo do app, cards, `.onb-card`/`.pino-legenda` claros |
| Secondary (30%) | `--paper-2` `#f2eee4` / `--ink` `#141a1f` | painel/sheets claros (`--paper-2`) e blocos de destaque escuros (`--ink`, `.bldg-head`) — herdado, sem mudança de proporção |
| Accent (10%) | `--accent` `#b5451f` | **reservado exclusivamente para**: marca (`.brand`), CTA primária (`.onb-next`, `.go`, `.acts button.primary`), estado ativo de seleção de modo/chip, selo de incerteza (`.matchapprox`, `.detectchip.media`), foco de teclado — **NUNCA usado para status de oportunidade a partir desta fase** (essa função migra para `--status-risco`, que tecnicamente é o MESMO hex `--accent`, mas semanticamente agora é "risco/abaixo da mediana", não "cor de marca aplicada a resultado") |
| Status (novo, 3 cores reservadas SÓ para score/pino/legenda) | `--status-bom` `#2c5545` / `--status-atencao` `#a8842c` / `--status-risco` `#b5451f` | pinos do mapa, legenda, `.score-op.*` (já existente, agora nomeado) — **nunca aparece sem rótulo textual ou ícone ao lado** |
| Caixa | `--status-caixa` `#a8842c` (= `--gold`, mesmo hex de `--status-atencao`, distinguido por ícone 🏦 + rótulo "Caixa" + traço no dot da legenda) | camada CAIXA (pino dourado, já existente) |
| Sem dado | `--status-semdado` `#57503f` (= `--muted`) | pino cinza, texto "sem estimativa disponível" (Fase 12), qualquer estado neutro de ausência de dado |
| Destructive | não aplicável nesta fase | nenhuma ação destrutiva nova introduzida (onboarding/legenda/pinos não têm ações destrutivas) |

**Regra AA:** ver tabela de Contraste AA na seção "Sistema de Cor de STATUS" acima — `--status-atencao` como TEXTO exige `--status-atencao-ink` ou peso/tamanho grande; como FILL de pino (com borda `--ink` 2px) está isento dessa exigência (a borda escura garante o contorno legível, o fill não precisa ser AA contra o fundo do mapa isoladamente).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Onboarding cartão 1 (título) | "Busque qualquer imóvel" |
| Onboarding cartão 1 (corpo) | "Digite endereço, quadra/lote, nome do prédio ou inscrição — numa caixa só. O Radar entende o que você quer dizer." |
| Onboarding cartão 2 (título) | "Veja valor e oportunidade" |
| Onboarding cartão 2 (corpo) | "Cada imóvel mostra a faixa de valor estimado, o score de oportunidade e uma leitura em linguagem simples — sem jargão técnico." |
| Onboarding cartão 3 (título) | "Gere documentos e capte" |
| Onboarding cartão 3 (corpo) | "Gere ficha, relatório ou laudo em PDF, copie mensagens prontas pro WhatsApp e monte a proposta — tudo pelo Radar." |
| Onboarding — pular | "Pular" |
| Onboarding — avançar | "Próximo" |
| Onboarding — finalizar | "Começar" |
| Motion — etapa 1 | "Localizando imóvel…" |
| Motion — etapa 2 | "Consultando cadastro…" |
| Motion — etapa 3 | "Calculando estimativa…" |
| Motion — etapa 4 (condicional) | "Buscando comparáveis…" |
| Motion — etapa 5 | "Preparando mapa…" |
| Legenda — bom | "Boa oportunidade" |
| Legenda — atenção | "Atenção" |
| Legenda — risco | "Abaixo da mediana" |
| Legenda — caixa | "Caixa" |
| Legenda — sem dado | "Sem dado ainda" |
| "O que o Radar faz" — entrada do rodapé | "O que o Radar faz" |
| "O que o Radar faz" — item 1 | "Busca unificada — endereço, quadra/lote, prédio ou inscrição numa caixa só." + CTA "Buscar agora →" |
| "O que o Radar faz" — item 2 | "Valor e oportunidade — faixa estimada, score de oportunidade e leitura em linguagem simples." + CTA "Ver como →" |
| "O que o Radar faz" — item 3 | "Documentos prontos — ficha, relatório ou laudo em PDF, minutas de proposta/contrato." + CTA "Ver como →" |
| "O que o Radar faz" — item 4 | "Ação comercial — mensagens prontas pro WhatsApp, modo captação, salvar oportunidades." + CTA "Ver como →" |
| "O que o Radar faz" — item 5 | "Oportunidades da Caixa — imóveis à venda da Caixa, plotados no mapa." + CTA "Ver no mapa →" |
| Tooltip de pino (mapa) | `"${statusLabel} · ${endereço ou unidade}"` — ex.: "Boa oportunidade · Rua Portugal 582" |
| Destrutivo nesta fase | Nenhuma ação destrutiva — fechar/pular onboarding é sempre reversível (reabre via "O que o Radar faz"); nenhuma confirmação necessária |

Todo texto acima é pt-BR correto, sem jargão técnico na 1ª camada (percentil/mediana não aparecem em nenhum texto desta fase), sem caixa alta em bloco longo, sem gíria/ironia — alinhado ao gate de linguagem da Fase 14 (esta fase antecipa o padrão, não substitui o gate final).

---

## Estados Transversais

| Estado | Comportamento visual | Regra |
|---|---|---|
| Pino sem `__scores` (score nunca calculado) | Cinza (`--status-semdado`), raio 7px, permanece clicável | "sem dado ≠ sem interação" (CONTEXT.md) |
| Busca nova plotada (maioria dos pinos ainda sem score) | Todos cinza inicialmente, coloridos progressivamente conforme fichas são abertas | comportamento esperado do cache `__scores`, documentado para não ser tratado como bug |
| `prefers-reduced-motion` ativo | Skeleton shimmer vira estático; onboarding abre/troca sem fade; legenda/pinos não têm animação de entrada (nunca tiveram) | REDUCE-safe obrigatório em toda peça nova desta fase |
| `localStorage` indisponível (modo privado) | Onboarding assume "já visto" na sessão seguinte da mesma aba (fail-open, nunca repete por erro) | mesma filosofia de falha silenciosa não-bloqueante das Fases 7/10 |
| Zero resultados plotados (`list.length===0`) | `.pino-legenda` permanece `hidden` | legenda só aparece quando há pinos para explicar |
| Motion etapa 4 ("Buscando comparáveis…") sem requisição real em voo | Etapa pulada — a sequência salta da 3 pra 5 | proibição dura de "teatrinho de timer" |

---

## Mobile 375 × Desktop 1280

| Aspecto | Mobile (≤820px) | Desktop (≥821px) |
|---------|-------------------|----------------------|
| `.onb-card` | `max-width:calc(100vw - 32px)`, padding mantido | `max-width:380px`, centrado |
| `.pino-legenda` | `bottom:calc(56px+12px+safe-area)`, wrap em 2 linhas se necessário | `bottom:16px`, 1 linha |
| Skeleton cards | 2 cards visíveis (espaço limitado) | 3 cards visíveis |
| `.oqf-lista` | mesma lista, full-width dentro do `.foot` | idêntico, dentro do painel de 390px |
| `.detail`/`.dvalor` novo padding | aplica igualmente (não há diferença mobile/desktop nesta fase, já era assim) | idêntico |

---

## Acessibilidade / Motion (obrigatório)

- **Contraste AA**: ver tabela dedicada em "Sistema de Cor de STATUS" — `--status-atencao` como texto exige `--status-atencao-ink` ou tamanho/peso grande; demais já aprovados.
- **Cor nunca sozinha**: pino (tooltip textual), legenda (rótulo ao lado do dot), `.score-op.*` (rótulo "Boa oportunidade"/etc já existente) — nenhum uso de `--status-*` sem texto/ícone.
- **Botões reais**: `.onb-skip`, `.onb-next`, `.oqf-lista button` — todos `<button type="button">`.
- **`role="dialog"` + `aria-modal`**: `#onbOverlay` — mesmo padrão de `#cmpSheet`/`#negSheet`.
- **Foco gerenciado**: onboarding foca `.onb-skip` na abertura; ao fechar, retorna o foco ao elemento anterior ou a `#searchPill`.
- **Esc**: fecha o onboarding (equivalente a "Pular") com prioridade máxima na cadeia de Esc (é a única tela verdadeiramente modal-bloqueante da experiência).
- **`prefers-reduced-motion`**: skeleton estático; onboarding sem fade; nenhuma transição nova fora do que já é `REDUCE`-aware.
- **`esc()` obrigatório**: nenhuma interpolação de dado do usuário nos textos novos desta fase (onboarding/legenda/"O que o Radar faz" são todos textos ESTÁTICOS pt-BR, sem interpolação) — o único ponto de interpolação é o tooltip do pino (`endereço`/`unitLabel`), que já passa por `esc()` no restante do app e segue o mesmo contrato aqui.
- **44px**: `.onb-skip`, `.onb-next` conformes; dots decorativos e `.pl-dot` (legenda) explicitamente NÃO tocáveis (não precisam de 44px).
- **Zero requisição nova**: pinos/legenda/onboarding/skeleton/"O que o Radar faz" operam 100% sobre dados já em memória (`__scores`, `LAST`) ou são estáticos — nenhum componente desta fase dispara `jsonp`/`fetchWhere` além do que `buscar()` já fazia.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

Nenhum registry de componentes é usado neste projeto — app HTML único, sem build. Gate de registry não se aplica.

---

## Fora de Escopo (não tocar nesta fase)

- Território/choropleth/heatmap de cores no mapa — Fase 15 (deferido explicitamente no CONTEXT.md).
- Rebrand/base branca — decisão travada do milestone, nunca reaberta.
- Qualquer fonte nova (família ou peso fora de 400/500/600/700/800 já existentes).
- Qualquer hex novo fora dos `--status-*` documentados como alias de valores já existentes.
- Focus-trap global de sheets (`#wiz`/`#captSheet`/`#negSheet`) — gap pré-existente, deferido (registrado no CONTEXT.md, não corrigido nesta fase salvo sobra de orçamento).
- Requisição de rede nova para popular `__scores` de pinos "sem dado" — nunca dispara `compare()`/`compsStats()` só para colorir um pino.
- Mudança de `.foot`/`.dgrid` além do refino de respiro listado explicitamente na tabela de seletores.

---

## Verificação (preview, mobile 375 + desktop 1280)

- `:root` ganha as 8 novas vars `--status-*`/`--status-*-ink` (aliases), zero hex novo fora delas.
- `.detail`/`.dvalor`/`.dscores`/`.dleitura`/`.card`/`.bldg-head` mostram o novo padding/margin exatamente conforme a tabela de Refino (medir em DevTools).
- `.dvalor` tem borda `1.5px` (não mais `2px` igual à `.detail` externa) — a dupla borda de mesma espessura desaparece.
- Buscar um imóvel qualquer: pino nasce CINZA (`--status-semdado`) se `__scores` ainda não populado; abrir a ficha (dispara `scoreOportunidade`) e voltar ao mapa mostra o pino recolorido conforme a banda de score.
- Pino de imóvel Caixa permanece dourado, inalterado.
- `.pino-legenda` aparece automaticamente após qualquer busca com resultados plotados; permanece oculta em `#emptyState`.
- Legenda mostra 5 entradas (bom/atenção/risco/caixa/sem-dado), dot de "Caixa" com borda tracejada distinguindo do dot sólido de "Atenção" (mesmo hex).
- Buscar dispara a sequência "Localizando imóvel…" → "Consultando cadastro…" → "Calculando estimativa…" → (condicional) "Buscando comparáveis…" → "Preparando mapa…" — visível no `#loadmsg`, nunca uma mensagem específica de modo (as antigas "consultando inscrição…" etc. saem de uso).
- Skeleton shimmer aparece brevemente em buscas que demoram (lista grande) — cards cinza animados antes do `render()` real.
- `prefers-reduced-motion` ativo: skeleton fica estático (cor sólida, sem `animation`); onboarding abre/fecha sem fade.
- 1º acesso (sem `radar_onboard` no localStorage): onboarding aparece automaticamente, 3 cartões navegáveis, "Pular" sempre visível, "Começar" no 3º fecha e persiste — reabrir o app não mostra mais o onboarding automaticamente.
- "O que o Radar faz" aparece como `<details>` no rodapé do painel de busca, ao lado de "Fontes & metodologia"; cada item tem seu próprio CTA funcional (focar busca / reabrir onboarding no cartão certo / abrir camada Caixa).
- `.chooser` recebe o padding refinado (20px 22px), sem mudança estrutural de CTA (classificado como conforme por design).
- Nenhum elemento tocável novo mede menos de 44px em DevTools (mobile 375), exceto os explicitamente documentados como não-tocáveis (dots) ou links inline (`.oqf-lista button`).
- Nenhuma cor fora da paleta `--status-*`/paleta já existente aparece em qualquer componente novo desta fase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
