# Auditoria Fable 5 — Área 09: Estética, Tipografia, A11Y & PWA/Perf

- **Área:** 09 — Estética, tipografia, acessibilidade, PWA e performance
- **Data:** 2026-07-10
- **Rodada:** Fable 5
- **Baseline de testes:** 252 (verde)
- **Escopo:** `radar-goiania.html`, `sw.js`, `manifest.json`, `index.html` — SOMENTE-LEITURA
- **Fora de escopo:** segurança / CSP
- **Já conhecidos (não re-reportados):** D-11 (trapFocus não semeia foco em #calc/#laudoView/#terrPanel), D-12 (traço de zonas estático no zoom), D-13 (#detectChip role=status+onclick), D-02/03/04/06/09/10 (corrigidos)

Contraste calculado pela fórmula WCAG 2.x (linearização sRGB + `(L1+0.05)/(L2+0.05)`). Limiar AA texto normal = 4.5:1; texto grande (≥18.66px bold ou ≥24px) = 3:1.

---

## [EST-01] radar-goiania.html:202 (+187,200) | ALTA | Valor da "faixa" (`--accent` sobre `--ink`) reprova AA — 3.20:1

**Descrição.** `.bldg-head` tem `background:var(--ink)` (#141a1f, linha 187). Dentro dela, `.bm b` é `font:700 15px/1.1` (linha 200) e `.bm-faixa b` sobrepõe a cor para `--accent` (#b5451f, linha 202). Contraste `--accent` sobre `--ink` = **3.20:1**. Como 15px/700 fica abaixo do limiar de "texto grande" (18.66px bold), aplica-se o mínimo de 4.5:1 → **reprova**.

**Cenário concreto.** No resumo do prédio (card escuro do topo dos resultados de edifício), a métrica "Faixa de valor" — que é justamente o número que o corretor lê primeiro — sai em óxido queimado sobre quase-preto. À luz do dia num celular, o valor some; as demais métricas (`.bm b` em `--paper-2`, ~15:1) permanecem legíveis, deixando só a mais importante ilegível.

**Proposta.** Trocar a cor de `.bm-faixa b` por um tom da paleta que passe AA sobre `--ink` (ex.: `--accent-2` #c9691f ≈ 4.6:1, ou `--paper-2`/`--gold` claro). Confirmar com a fórmula após escolher.

---

## [EST-02] radar-goiania.html:215 (+233) | MÉDIA | `.card .unit` (`--accent` sobre `--paper`) reprova AA — 4.31:1 (irmão do D-09 esquecido)

**Descrição.** O `.card` tem `background:var(--paper)` (#e9e4d8, linha 233). `.card .unit` é `font:700 12px/1 "JetBrains Mono";color:var(--accent)` (linha 215). Contraste `--accent` sobre `--paper` = **4.31:1** → reprova o mínimo de 4.5:1 para 12px.

**Cenário concreto.** O D-09 (Fase 20) migrou explicitamente `.card .vals .ref b`, `.ref .lbl` e `.matchapprox` de `--accent` para `--accent-ink` "p/ contraste do texto pequeno sobre --paper" (comentários nas linhas 240/245/246). O rótulo de unidade (`.unit`, o "apto 302" no topo de cada card de imóvel), mesma cor `--accent` no mesmo fundo `--paper` e ainda menor (12px), ficou de fora da correção — é o mesmo defeito, num elemento vizinho.

**Proposta.** Aplicar a mesma correção do D-09: `.card .unit{color:var(--accent-ink)}` (#8f3116 sobre `--paper` ≈ 6.3:1).

---

## [EST-03] radar-goiania.html:162 (vs 159/161) | MÉDIA | `.combo-item .code` fica `--muted` sobre `--ink` no hover/teclado — 2.32:1

**Descrição.** No estado `:hover`/`.active` o item do combo vira `background:var(--ink);color:var(--paper-2)` (linha 159), e `.raw` recebe override para `--line` (linha 161). Mas `.combo-item .code` declara `color:var(--muted)` (linha 162) e **não tem override de hover/active**; por ter cor própria não herda o `--paper-2` do container. Resultado: `--muted` (#57503f) sobre `--ink` (#141a1f) = **2.32:1**.

**Cenário concreto.** Ao navegar as sugestões com ↑/↓ (item ativo) ou passar o mouse, o rótulo `.code` — que na caixa unificada é "Setor"/"Rua" (`updateCaixaList`, linha 3782) e no combo de setor é o **código numérico do setor** (`suggestBairro`, linha 3749) — quase desaparece sobre o fundo escuro selecionado, exatamente no item em foco. `.raw` (linha 161) foi tratado; `.code` foi esquecido.

**Proposta.** Adicionar `.combo-item:hover .code,.combo-item.active .code{color:var(--line)}` (paridade com a regra de `.raw` na linha 161).

---

## [EST-04] sw.js:73-74 (+30) / radar-goiania.html:22 | MÉDIA | `caixa-goiania.js` bloqueia render e é network-first SEM timeout — rede lenta trava a 1ª pintura

**Descrição.** `caixa-goiania.js` está no `<head>` como `<script src="caixa-goiania.js" onerror="void 0">` (linha 22) — script clássico, sem `defer`/`async`, portanto bloqueia o parser. Ele casa a regex `NETWORK_FIRST` (sw.js linha 30). No handler de fetch, o branch de navegação recebeu timeout de ~4s (D-10, linhas 65-72), mas o branch de sub-recurso **não**: `e.respondWith(net.catch(() => fallback()))` (linha 74) só cai no cache se o `fetch` **rejeitar**. `fetch` não rejeita por lentidão — só por falha de rede.

**Cenário concreto.** Numa conexão viva porém lenta (3G ruim, hotel), o HTML chega (venceu o timeout de nav e caiu no cache), o browser então pede `caixa-goiania.js`; o SW aguarda a rede por vários segundos antes de servir, e como o script é render-blocking, a primeira pintura fica parada esse tempo todo — **mesmo havendo cópia no cache** (precache LOCAL, sw.js linha 16). O `manifest.json` sofre da mesma ausência de timeout, com impacto menor.

**Proposta.** Ou (a) aplicar a mesma corrida-com-timeout do branch de navegação aos sub-recursos `NETWORK_FIRST`, ou (b) adicionar `defer` ao `<script src="caixa-goiania.js">` (os dados da Caixa não são necessários na 1ª pintura), tirando-o do caminho crítico.

---

## [EST-05] radar-goiania.html:3557 (+3565-3582,3137,3321) | MÉDIA | Até 4000 lotes como SVG interativo; choropleth/satélite re-estilizam todos — custo alto no zoom 17+

**Descrição.** `refreshLots` consulta `resultRecordCount:4000` (linha 3557) e cria um `L.polygon` por feature no renderer SVG padrão (sem `preferCanvas`/`L.canvas`), cada polígono com `bindTooltip` + 3 listeners `mouseover`/`mouseout`/`click` (linhas 3568-3581). Ao ligar o choropleth (`desenharChoropleth`, linha 3321) ou o satélite (`setSatelite`, linha 3137), roda-se `lotLayer.eachLayer(p=>p.setStyle(lotStyle(p._terrCi)))` — uma escrita de atributos SVG por lote, síncrona, sobre a coleção inteira.

**Cenário concreto.** Em área densa (Setor Central / Bueno) no zoom 17-19, milhares de `<path>` SVG com tooltip e handlers pesam no DOM; alternar "Colorir por valor" ou o satélite dispara re-estilização de todos de uma vez, causando travada perceptível no celular. O debounce de 250ms (linha 3519) e o cache `LOTLAST` (linha 3548) mitigam pans, mas não o custo de pico do toggle nem a densidade de nós.

**Proposta.** Renderizar os lotes em canvas (`L.canvas`/`preferCanvas:true`) — elimina milhares de nós DOM e barateia o `setStyle` em lote; ou delegação de eventos em vez de 3 listeners por polígono; e considerar um teto de contagem coerente com a densidade real do zoom.

---

## [EST-06] radar-goiania.html:3777-3778 (+3747) | BAIXA | `role="listbox"` com filho não-`option` e `aria-expanded="true"` sem opções no estado vazio

**Descrição.** `updateCaixaList` seta `aria-expanded="true"` no combobox (linha 3777) **antes** de checar resultados e, quando não há sugestões, injeta `<div class="combo-empty">nenhuma sugestão</div>` dentro do `#caixaList role="listbox"` (linha 3778). O combo de setor faz o mesmo (`<div class="combo-empty">`, linha 3747). Um `listbox` só deve conter `option`/`group`; e `aria-expanded="true"` com zero `option` anuncia um popup vazio.

**Cenário concreto.** Ao digitar algo sem correspondência, o leitor de tela anuncia a lista como expandida mas sem itens navegáveis, e o nó de texto solto viola a estrutura esperada do padrão combobox — ruído para usuário de NVDA/VoiceOver.

**Proposta.** No estado vazio, manter `aria-expanded="false"` (ou dar ao aviso `role="option"` `aria-disabled="true"`, ou movê-lo para fora do listbox com `role="status"`).

---

## [EST-07] manifest.json:15 | BAIXA | Mesmo `icon-512.png` serve `purpose:"any"` e `purpose:"maskable"` — risco de recorte no Android

**Descrição.** As entradas de 512px reusam o mesmo arquivo para `purpose:"any"` (linha 14) e `purpose:"maskable"` (linha 15). Ícone maskable precisa da zona de segurança (~40% central; ~10% de folga em cada borda) porque o Android o recorta em círculo/squircle. Um ícone `any` desenhado full-bleed, usado como maskable, tem as bordas/logo cortadas. (`icon-512.png` tem ~6KB, compatível com arte simples centrada — indício, não prova, de ausência de safe-zone.)

**Cenário concreto.** Instalado como PWA no Android, o ícone da tela inicial pode aparecer com o logotipo cortado nas bordas ou mal enquadrado no círculo do launcher.

**Proposta.** Gerar um PNG maskable dedicado com a zona de segurança e apontar `purpose:"maskable"` para ele, mantendo o atual só como `any`. Verificar o recorte em maskable.app.

---

## Notas de verificação (sem achado)

- **Fontes:** ambos os `@font-face` (Archivo 400-800, JetBrains Mono 500-700, linhas 25/27) usam `font-display:swap` + woff2 base64 same-origin — correto para offline-first. Todos os pesos usados no CSS caem dentro das faixas variáveis declaradas.
- **`prefers-reduced-motion`:** o kill-switch global de CSS (linhas 97-104) cobre transition/animation/scroll; as animações WAAPI (Motion) são guardadas por `mAnimate` que checa `REDUCE` (linha 3023) — WAAPI não é afetada pelo CSS, então a guarda em JS é o que fecha o buraco. Coberto.
- **iOS auto-zoom:** todos os inputs/select/textarea estão em `font-size:16px` (linhas 146, 169, 214, 826, 847-850) — sem auto-zoom.
- **Viewport:** `width=device-width, initial-scale=1, viewport-fit=cover` — sem `user-scalable=no`/`maximum-scale`, pinch-zoom preservado (a11y OK).
- **Alvos de toque:** botões/itens tocáveis usam `min-height:44px` de forma consistente (viewbar 56px, `.x`/`.caixa-ic` 44×44).
- **Contraste OK conferido:** `--muted`/`--paper` 5.95:1, `--muted`/`--paper-2` 6.52:1, `--accent`/`--paper-2` 4.72:1, `.go` (#fff sobre `--accent`) 5.47:1, `.viewbar` inativa (`--line` sobre `--ink`) 9.0:1, toast (`--paper-2` sobre `--ink`) 15:1, `--accent-ink`/`--paper` 6.32:1 (fix D-09 confirmado).
- **PWA/precache:** os 10 itens de `LOCAL[]` (sw.js) existem em disco e são referenciados pelo app — `cache.addAll` não vai reprovar o install. `radar-v7` invalida caches antigos no `activate`; `ignoreSearch` no fallback de navegação cobre deep-link `?insc=`. Consultas ArcGIS/tiles corretamente fora do cache.
- **Safe-area:** `env(safe-area-inset-*)` aplicado em viewbar, legendas, toast, loading e lvbar.
