---
phase: 19
slug: estetica-premium-tipografia
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-10
---

# Phase 19 — UI Design Contract

> Contrato visual e de interação para ESTÉTICA PREMIUM — TIPOGRAFIA & REFINAMENTO VISUAL. Refina a identidade cartográfica papel/óxido já estabelecida (Fases 7-13) trocando a fonte de verdade do app (hoje declarada como IBM Plex mas nunca carregada — o usuário vê Segoe UI) e introduzindo um sistema de elevação e acabamento consistente. NÃO é rebrand: paleta, cor-só-status, radius angular 1-2px e a estrutura de todos os componentes permanecem intactos. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** (1) TYPO-01 — escolha e embutimento real de família(s) tipográfica(s) via `@font-face` woff2 base64 inline; (2) PREM-01 — sistema de elevação (2-3 níveis) + acabamento de cards/sheets/chips/inputs/botões + hover/active/focus refinados; (3) A11Y-01 — utilitário único de focus-trap aplicado às 6 superfícies modais. NÃO inclui: mudança de paleta/cor, IA/CRM, backend, dark mode, ícones customizados.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla; reuso de `.card`/`.detail`/`.chips`/`.wiz`/`.onb`/`.score`/`.foot` já existentes (Fases 7-13) |
| Icon library | emoji textual (herdado, inalterado — nenhum ícone SVG novo nesta fase) |
| Font | **Archivo** (papel sans — display + UI + body, pesos 400/500/600/700/800) + **JetBrains Mono** (papel mono técnico, pesos 500/700) — ver rationale completo abaixo. Substitui `"IBM Plex Sans"`/`"IBM Plex Mono"` (declaradas em ~194 ocorrências mas NUNCA carregadas — causa raiz da "letra feia" reportada pelo usuário: o fallback real sempre foi `"Segoe UI"`/monospace do sistema) |

---

## A DECISÃO CENTRAL — Tipografia (TYPO-01)

### Diagnóstico (confirmado no código)

`grep -c 'font:'` em `radar-goiania.html` retorna **194 declarações** de `"IBM Plex Sans"`/`"IBM Plex Mono"` e **zero** `@font-face`, zero `<link>` para Google Fonts, zero CDN de fonte. O único `font-family` "puro" (linha 101) também referencia `"IBM Plex Sans","Segoe UI",system-ui,sans-serif` sem nunca definir `@font-face`. Logo: **o usuário sempre viu `Segoe UI`** (ou a fonte padrão do SO), nunca IBM Plex. A correção não é cosmética (trocar um nome de família no CSS) — é estrutural: **embutir a fonte de verdade no arquivo**.

### Candidatos avaliados (3+, conforme exigido)

| Candidato | Premium | Identidade cartográfica papel/óxido | Legibilidade pt-BR 10.5-13px | Dígitos tabulares | Pesos 400-800 nativos (OFL/Google Fonts) | Payload estimado (7 pesos: 5 sans + 2 mono) | Veredito |
|---|---|---|---|---|---|---|---|
| **Fraunces (display serif) + Inter (UI)** | Alto — serif editorial com "wonk"/opsz evoca cartucho/carimbo de planta antiga | Muito alto — é o candidato mais literalmente "cartográfico-editorial" | Inter: excelente. Fraunces: só para display, nunca em 10.5px | Ambas suportam `tnum` via OpenType | Sim, mas são **2 famílias** — Fraunces precisa de eixos `opsz`/`wght` próprios além do orçamento de pesos do UI | Maior — 2 famílias, fonte serif com glifos mais complexos (~25-35KB/instância) somadas aos 5+2 pesos do par UI/mono ultrapassa facilmente o teto de ~250KB caso se queira Fraunces em mais de 1-2 pesos | **Rejeitado nesta fase** — visualmente é o mais "editorial", mas o orçamento de payload do CONTEXT (`sans 400/500/600/700/800 + mono 500/700`) já pressupõe **uma família UI só**; introduzir uma 3ª família (serif de display) quebraria esse orçamento ou exigiria pesos de Fraunces fora do que foi aprovado. Fica registrado como direção fortíssima para uma fase futura de rebrand (fora de escopo aqui — esta fase refina, não rebate a identidade) |
| **Manrope** | Médio-alto — geométrica, arredondada, tom "SaaS amigável" | Baixo — sem aspereza técnica, não evoca levantamento/cadastro | Boa | `tnum` disponível | Sim (200-800 variável, extraíveis estáticos) | Baixo (~90-120KB) | Rejeitado — bonita, mas genérica; não reforça "carimbo cadastral/levantamento técnico", mais startup-fintech do que "papel de planta antiga" |
| **Space Grotesk** | Alto — herda DNA de grotescas técnicas/de engenharia (régua, prancheta) | Alto — a mais "técnica" dos grotescos avaliados, adequada ao tom de levantamento | Boa a 12-13px; abaixo de 11px perde um pouco de definição pelas formas quadradas | `tnum` disponível | **Não** — só vai até 700 (300/400/500/600/700), sem 800 nativo | Baixo (~80-110KB) | Rejeitado por lacuna de peso — o app usa 800 em ~15 pontos-âncora (h1, valores hero, CTAs); forçar 700 nesses pontos perderia o contraste hierárquico que a Fase 13 já calibrou (`.brand h1`, `.dvalor-v`, `.onb-body h2`) |
| **Sora** | Alto — geométrica arredondada, muito usada em produtos "premium fintech" | Médio — mais "app financeiro" do que "cadastro/mapa" | Boa | `tnum` disponível | Sim (100-800) | Baixo (~90-120KB) | Rejeitado — próxima candidata depois de Archivo, mas o caráter geométrico arredondado de Sora entra em tensão com o radius angular 1-2px "cartográfico" já travado (Fase 13); Archivo tem terminais mais retos/quadrados, reforçando (não contradizendo) a angularidade dos cartões |
| **Archivo — ESCOLHIDA** | Alto — grotesca com raiz em tipografia de sinalização/wayfinding técnico, usada em produtos de dados premium sem cair em clichê de SaaS | Alto — terminais retos e levemente caixa-alta-friendly ecoam rótulos de levantamento/sinalização urbana, combinam com o radius angular 1-2px já travado (nenhuma curva arredondada "fofa" competindo com os cantos de carimbo) | Excelente a 10.5-13px — x-height generoso, formas abertas, é uma das grotescas mais testadas para UI densa | `tnum` nativo (OpenType `tnum`/`lnum`), essencial para R$/m²/score | **Sim — nativa 400/500/600/700/800** (variável 100-900, instâncias estáticas cobrem exatamente o range já usado no app) | Menor risco — 1 família cobre TODO o papel sans (display+UI+body) com os 5 pesos exigidos, sem 2ª família concorrendo pelo orçamento | **ESCOLHIDA** |

**Mono — JetBrains Mono (escolhida) vs. IBM Plex Mono:**

| Candidato | Rationale |
|---|---|
| IBM Plex Mono | É o que já está declarado (nunca carregado). Manter seria "consertar sem melhorar" — a queixa do usuário é estética ("muito feia"), e IBM Plex tem um caráter mais corporativo-neutro que não combina tão bem com a nova base Archivo (x-heights e proporções de família diferentes, pairing levemente desalinhado). |
| **JetBrains Mono — ESCOLHIDA** | Desenhada especificamente para legibilidade de caracteres técnicos em tamanhos pequenos (0/O, 1/l/I claramente diferenciados — crítico para inscrições cadastrais tipo `12.34.567.8901.2345`), x-height alto favorece 9-11px (onde o app usa `.ql-tag`/`.bldg-head .sub`/`.terr-honesto`), dígitos monoespaçados por definição (tabular por natureza), OFL, Google Fonts hospedada, pareamento neutro com qualquer grotesca UI (não carrega DNA corporativo específico como Plex). |

### Contrato de pesos e mapeamento papel → família/peso/size/tracking

| Papel tipográfico | Família | Peso | Tamanho | Line-height | Tracking (`letter-spacing`) | Onde no app (exemplos) |
|---|---|---|---|---|---|---|
| **Display** (hero numérico/título de marca) | Archivo | 800 (ExtraBold) | 26-39px | 0.98-1.05 | `-0.02em` (levemente negativo — compensa a abertura das formas de Archivo em tamanho grande) | `.brand h1` (26px), `.dvalor-v` (39px maior valor da ficha), `.onb-body h2` (20px, mesma família de peso) |
| **Heading** (títulos de bloco/seção) | Archivo | 700-800 | 15-20px | 1.2 | `-0.01em` | `.wh1-inline`, `.chooser .chnm`, `.onb-body h2`, `.card .addr` (manchete do card, 700/15px) |
| **Body** (texto corrido, leitura) | Archivo | 500 | 13-16px | 1.4-1.5 | `0` (nenhum tracking — leitura corrida não deve ser esticada) | `.dleitura p`, `.onb-body p`, `.terr-amostra`, `.oqf-lista li` |
| **Label / UI text** (botões, rótulos de campo, chips) | Archivo | 600 | 11-14px | 1-1.3 | `0` a `0.01em` | `label`, `.moderow button`, `.go`, `.card .unit`-adjacent labels, `.chk` |
| **Eyebrow / Mono técnico** (rótulos em versalete, códigos, inscrições, datas) | JetBrains Mono | 500 (leve) / 700 (destaque) | 9-11px | 1-1.3 | `0.06em` a `0.22em` (tracking largo — compensa a densidade do monoespaçado em versalete) | `.brand .eyebrow` (11px/700, `.22em`), `.count` (11px/600, `.08em`), `.ql-tag`, `.combo-item .raw`, `.terr-honesto`, `.cmp-table th` |
| **Valor / Dado numérico** (R$, m², score, %) | Archivo (rótulo) + `font-variant-numeric: tabular-nums` obrigatório em TODO elemento que renderiza número dinâmico | 700-800 para o número, 600-700 para o rótulo | 12-17px | 1-1.1 | `0` | `.card .vals .ref b`, `.dvalor-v`, `.score-num`, `.cmp-table td` (valores), `.terr-metric` |

**Regra dura de dígitos tabulares:** todo seletor que renderiza número que muda dinamicamente (valores em R$, m², score numérico, contagem de resultados, percentuais) recebe `font-variant-numeric: tabular-nums` — evita "dança" de largura quando o valor recalcula (ex.: `.card .vals .ref b`, `.dvalor-v`, `.score-num`, `.cmp-table td`, `.count`, `.terr-metric`, `.bm b`). Aplicar via classe utilitária única `.tnum{font-variant-numeric:tabular-nums}` OU diretamente nos seletores acima — decisão do executor, mas a REGRA (cobertura completa) é obrigatória e verificável.

**Ajuste de pesos na migração (194 declarações):** os pesos numéricos hoje usados (400/500/600/700/800) mapeiam 1:1 para os pesos nativos de Archivo — **nenhuma reescrita de peso necessária**, só troca de `font-family`. Onde o CSS usa `font:NNN Npx/L "IBM Plex Sans"` → `font:NNN Npx/L "Archivo"`; onde usa `"IBM Plex Mono",monospace` → `"JetBrains Mono",monospace` (mantém o fallback genérico `monospace` — nunca remover o fallback).

### Estratégia de carregamento

**Decisão: `@font-face` com WOFF2 em base64 inline DENTRO do HTML** (travado pelo CONTEXT.md — não é discricionário). Ratifica-se aqui com a medição de payload:

- Padrão já em uso no arquivo: a biblioteca `motion.dev` (v12.42.2, linha 18) já é embutida inline por decisão da Fase 06-CONTEXT ("preserva arquivo único, offline-first, sem mudança de CSP/sw.js"). Fontes seguem o MESMO padrão arquitetural — consistência com uma decisão já validada, não uma técnica nova.
- `sw.js` usa `NETWORK_FIRST` para o próprio `radar-goiania.html` (`CACHE = "radar-v7"`) — ao embutir as fontes DENTRO do HTML, elas são cobertas automaticamente pelo cache do HTML (fallback offline já funciona sem qualquer mudança em `sw.js`/precache). Adicionar `.woff2` como assets separados exigiria bump de `CACHE` para `"radar-v8"` e entrada em `LOCAL[]` — mais superfície de mudança, sem benefício real dado que o arquivo único já é o padrão do projeto.
- **Payload estimado:** Archivo (grotesca padrão, latin subset, static instance) ≈ 15-22KB/peso × 5 pesos ≈ 75-110KB. JetBrains Mono (subset latin, static) ≈ 18-25KB/peso × 2 pesos ≈ 36-50KB. **Total estimado: ~110-160KB de woff2 bruto → ~150-215KB em base64** (overhead base64 ≈ +33%). **Dentro do teto de ~250KB do CONTEXT.** O executor MEDE o payload real após gerar os arquivos (Google Fonts / google-webfonts-helper, latin subset, static woff2) e registra no SUMMARY — se algum peso individual exceder a estimativa e estourar o teto, a PRIMEIRA mitigação é remover o peso 800 do subset mono (não usado) ou usar variable font range para Archivo (`font-weight: 400 800` num único arquivo woff2 variável, tipicamente 40-60KB para o range completo — pode ser MAIS eficiente que 5 arquivos estáticos separados; decisão de implementação do executor, guiada pela medição real).
- **Licença OFL obrigatória:** Archivo e JetBrains Mono são ambas OFL (Open Font License), hospedadas no Google Fonts. O comentário de licença no HTML (mesmo padrão do comentário da linha 18 para motion.dev) deve registrar: fonte, versão, licença OFL, URL de origem (fonts.google.com/specimen/Archivo e fonts.google.com/specimen/JetBrains+Mono), subset (latin), pesos embutidos.
- **Fallback stack robusto** (obrigatório, nunca remover): `"Archivo","Segoe UI",system-ui,sans-serif` e `"JetBrains Mono","Consolas",monospace` — se o `@font-face` falhar por qualquer razão (corrupção do base64, navegador antigo), o app cai para uma fonte de sistema legível, nunca quebra layout.
- **PDFs/impressão:** o pipeline `#laudo`→`#laudoView` herda o CSS da página (já documentado no CONTEXT) — como o `@font-face` é global (não escopado a mídia), a impressão herda a fonte nova automaticamente. Nenhuma regra `@media print` adicional necessária além de verificar visualmente que o PDF gerado usa Archivo/JetBrains Mono (item da checklist de Verificação).

---

## Spacing Scale

Reuso total da escala já estabelecida nas Fases 9-13 (múltiplos de 4, alvo de toque 44px) — esta fase NÃO introduz novo espaçamento, só tokens de elevação (que são sombra/borda, não spacing).

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | gaps entre ícone/rótulo, tracking base |
| sm | 8px/10px | gaps entre elementos compactos (herdado Fase 13) |
| md | 16px | padding padrão de blocos principais (herdado Fase 13) |
| touch | 44px mínimo | todo elemento tocável — inalterado |
| lg | 20-22px | padding de `.detail`/`.onb-card` (herdado Fase 13) |

Exceções: nenhuma nova nesta fase.

---

**Foco visual por tela-chave (declaração explícita — pedido do checker):** na FICHA, o âncora primário é `.dvalor-v` (faixa de valor, Display); no PAINEL DE BUSCA, é `.brand h1` + o input da caixa única; no ONBOARDING, o título do cartão corrente; nos SHEETS/wizards, o heading do passo. Elevação (`--elev-*`) e contraste tipográfico apoiam o âncora — nunca competem com ele.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 13-16px | 500 | 1.4-1.5 |
| Label | 11-14px | 600 | 1-1.3 |
| Heading | 15-20px | 700-800 | 1.2 |
| Display | 26-39px | 800 | 0.98-1.05 |

(Tabela completa de mapeamento por componente está na seção "A DECISÃO CENTRAL" acima — esta tabela resumida segue o formato padrão do template.)

**Famílias:** Archivo (display/heading/body/label) · JetBrains Mono (eyebrow/mono técnico/dados tabulares).
**Pesos embutidos:** Archivo 400/500/600/700/800 · JetBrains Mono 500/700 — nenhum peso fora desta lista é usado em qualquer seletor.
**Tracking:** display `-0.02em`, heading `-0.01em`, body `0`, label `0` a `0.01em`, eyebrow/mono `0.06em`-`0.22em` (ver tabela completa).
**Números:** `font-variant-numeric: tabular-nums` obrigatório em todo valor numérico dinâmico (R$, m², score, %, contagens).

---

## Sistema de Elevação (PREM-01)

Hoje o acabamento é heterogêneo: `--shadow` (`0 2px 0 rgba(20,26,31,.08)`) é usado em alguns lugares, mas sombras ad hoc diferentes aparecem em outros (`0 8px 20px rgba(20,26,31,.18)` no combo, `0 8px 24px rgba(20,26,31,.3)` no onboarding, `0 6px 20px rgba(20,26,31,.22)` no `.chooser`, `0 4px 14px rgba(20,26,31,.18)` no FAB/toast, `0 2px 8px rgba(0,0,0,.25)` no `.zapfab`). Esta fase consolida em **3 níveis nomeados**, todos derivados da MESMA cor-base de sombra (`--ink` em baixa opacidade — nunca preto puro, mantém a identidade "tinta sobre papel").

```css
:root{
  /* Fase 19 PREM-01: sistema de elevação — 3 níveis, todos derivados de --ink (tinta),
     nunca preto puro (#000). Substitui as sombras ad hoc espalhadas pelo CSS. */
  --elev-0: none;                                              /* repouso: cards em fluxo normal (.card, .cmp, .dvalor) — SEM sombra, a borda 1-1.5px já demarca */
  --elev-1: 0 2px 6px rgba(20,26,31,.10);                      /* leve elevação: elementos flutuantes discretos sobre o mapa (.pino-legenda, .toast, .coachmark) — substitui --shadow existente com ajuste sutil de raio */
  --elev-2: 0 6px 18px rgba(20,26,31,.16);                     /* elevação média: dropdowns/menus/combo (.combo-list, #correctMenu) — substitui os 0 8px 20px/.18 ad hoc */
  --elev-3: 0 10px 28px rgba(20,26,31,.24);                    /* elevação alta: modais/sheets verdadeiros (.onb-card, .wiz, .chooser, .calc) — substitui os 0 8px 24px/.3, 0 6px 20px/.22 ad hoc, unificando na mesma progressão */
}
```

| Nível | Token | Uso | Substitui (valor antigo) |
|---|---|---|---|
| 0 — Repouso | `--elev-0: none` | `.card`, `.cmp`, `.dvalor`, `.score`, `.dleitura`, `.dgrid .cell` — cards em fluxo, já demarcados por borda 1-1.5px | (nenhum — já eram sem sombra na maioria; formaliza a ausência como decisão, não omissão) |
| 1 — Flutuante discreto | `--elev-1: 0 2px 6px rgba(20,26,31,.10)` | `.pino-legenda`, `.toast`, `.coachmark`, `.cmp-fab` (elementos que pairam sobre o mapa sem bloquear interação) | `--shadow` antigo (`0 2px 0 rgba(20,26,31,.08)`) — mantém a MESMA função, ganha leve blur em vez de "sombra reta" (mais premium, menos "post-it") |
| 2 — Overlay de escolha | `--elev-2: 0 6px 18px rgba(20,26,31,.16)` | `.combo-list`, `#correctMenu`, dropdowns/menus contextuais | `0 8px 20px rgba(20,26,31,.18)` (combo, linha 145) |
| 3 — Modal/Sheet | `--elev-3: 0 10px 28px rgba(20,26,31,.24)` | `.onb-card`, `.wiz`, `.chooser`, `.calc`, `#detail` (bottom sheet mobile) | `0 8px 24px rgba(20,26,31,.3)` (onboarding), `0 6px 20px rgba(20,26,31,.22)` (chooser), sombras do `.wiz`/`.calc` equivalentes |

**Elementos fora do sistema (mantidos como estão, justificado):** `.zapfab`/`.cmp-fab` usam `0 2px 8px rgba(0,0,0,.25)`/`0 4px 14px rgba(20,26,31,.18)` como FAB circular flutuante — mapeiam para `--elev-1` (mesma família visual de "flutua sobre o mapa"); `.card:active`/`transition:transform` (interação de toque) não é elevação, é feedback de pressão, fora deste sistema.

**Regra dura:** nenhuma sombra nova fora dos 3 tokens `--elev-*` — se um componente precisar de peso visual diferente, ajusta a BORDA (espessura/cor já documentada na Fase 13), nunca inventa uma 4ª sombra ad hoc.

---

## Refinamentos de Acabamento por Componente

| Componente | Refinamento | Valor |
|---|---|---|
| **Cards** (`.card`) | Borda `1.5px solid var(--line)` (mantida) + `--elev-0` (repouso, sem sombra) → hover ganha `--elev-1` sutil + `border-color:var(--ink)` (escurece a borda, não introduz cor nova) | `transition:box-shadow .15s ease, border-color .12s ease` (adiciona `box-shadow` à transição já existente de `transform`) |
| **Sheets** (`.wiz`, `.chooser`, `.calc`, `.onb-card`) | `--elev-3` consolidado (ver tabela acima); borda `2px solid var(--ink)` mantida (identidade "moldura de carimbo") | zero mudança estrutural, só a sombra passa a vir do token |
| **Chips/badges** (`.chip`, `.detectchip`, `.urb-badge`, pino-legenda dots) | Radius mantido (2px caixas / pill onde já é pill) — refinamento é SÓ tipográfico (Archivo/JetBrens Mono aplicados) + `letter-spacing` recalibrado por peso (ver tabela de tracking) | nenhuma mudança de cor/tamanho de caixa |
| **Inputs** (`#insc`, `#rua`, `.combo-item`, `#caixaInput`) | Borda `1.5px solid var(--line)` repouso → `:focus-visible` ganha `outline:2px solid var(--accent);outline-offset:2px` (herdado, já correto) + a BORDA do próprio input escurece para `var(--ink)` no focus (reforço visual duplo: outline + borda, mais "premium" que só outline) | `border-color .12s ease` adicionado à transição |
| **Botões primários** (`.go`, `.onb-next`, `.acts button.primary`) | `background:var(--accent)` repouso → `:hover{background:var(--accent-ink)}` (herdado, confirma) → `:active{transform:scale(.98)}` (feedback de pressão, novo — reforça "premium" sem introduzir cor) | `transition:transform .08s ease, background .15s ease` |
| **Botões secundários** (`.acts button:not(.primary)`, `.moderow button`) | Repouso transparente/borda sutil → `:hover{background:var(--paper-2)}` (leve preenchimento, sem cor) → `:focus-visible` outline herdado | `transition:background .12s ease` |
| **Divisores** | `border-color:var(--line)` (`#c3b9a3`) em uso geral hoje — refinar para permitir um divisor MAIS sutil onde a densidade é alta (`.dgrid .cell` internos, linhas de tabela `.cmp-table`) usando `var(--grid)` (`#d8d0be`, já existente, mais claro que `--line`) em vez de `--line` nesses casos específicos | `.cmp-table td{border-bottom:1px solid var(--grid)}` (era `--line`) — único ajuste de cor de divisor desta fase, dentro da paleta já existente |

---

## Focus-Trap (A11Y-01)

### Utilitário único compartilhado

```js
/* Fase 19 A11Y-01: utilitário ÚNICO de focus-trap — as 6 superfícies modais chamam
   trapFocus(container) ao abrir e untrapFocus() ao fechar. Nunca 6 implementações.
   Modelo replicado do padrão onbLastFocus/onbAbrir/onbFechar já existente (Fase 13). */
let TRAP_CONTAINER=null, TRAP_LASTFOCUS=null, TRAP_HANDLER=null;

function trapFocus(container){
  TRAP_LASTFOCUS = document.activeElement; // gatilho — devolve o foco aqui ao destrapar
  TRAP_CONTAINER = container;
  TRAP_HANDLER = function(e){
    if(e.key !== "Tab") return;
    const focaveis = trapFocaveis(container);
    if(!focaveis.length) return;
    const first = focaveis[0], last = focaveis[focaveis.length-1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  container.addEventListener("keydown", TRAP_HANDLER);
}

function untrapFocus(){
  if(TRAP_CONTAINER && TRAP_HANDLER) TRAP_CONTAINER.removeEventListener("keydown", TRAP_HANDLER);
  if(TRAP_LASTFOCUS && document.body.contains(TRAP_LASTFOCUS)) TRAP_LASTFOCUS.focus();
  TRAP_CONTAINER = null; TRAP_LASTFOCUS = null; TRAP_HANDLER = null;
}

/* elementos focáveis VISÍVEIS dentro do container — exclui hidden/disabled/display:none/tabindex=-1 */
function trapFocaveis(container){
  return Array.from(container.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null); // offsetParent!==null exclui display:none/hidden
}
```

| Comportamento | Regra |
|---|---|
| Ativação | `Tab`/`Shift+Tab` circulam SOMENTE entre os focáveis visíveis do container aberto — nunca saem para o resto da página |
| Elementos focáveis | `button`, `a[href]`, `input`, `select`, `textarea`, `[tabindex]` (exceto `-1`) — filtrados por `offsetParent!==null` (visibilidade real) |
| Retorno de foco | Ao chamar `untrapFocus()`, o foco retorna ao elemento que disparou a abertura (`TRAP_LASTFOCUS`) — MESMO padrão já usado em `onbLastFocus`/`onbAbrir`/`onbFechar` (Fase 13), agora generalizado |
| Cadeia de Esc | **INTOCADA** — o focus-trap NÃO interfere no `keydown` global de Esc (linha ~7387) nem na sua ordem de prioridade (onboarding → terrPanel → cmpSheet → negSheet → captSheet → dropdowns → calc → wiz → laudoView → chooser → busca desktop → detail). Cada função de fechamento (`onbFechar`, `fecharComparacao`, `fecharNeg`, `fecharCaptacao`, `fecharLaudo`, `closeChooser`, `closeDetail`) passa a chamar `untrapFocus()` no lugar de sua lógica de retorno de foco manual (onde já existia, como em `onbFechar`) |
| Quirk iOS | Preservado — o utilitário não adiciona nenhum listener de `touchstart`/`pointerdown` que pudesse conflitar com o drag do bottom sheet (`SHEETDRAGY0`) já documentado |
| Combobox ARIA | Preservado — inputs de busca com combobox (`#insc`/`#rua` com `.combo-list`) continuam com seu próprio tratamento de teclado (setas/Enter/Esc com `stopPropagation`); o trap NUNCA é aplicado ao formulário de busca em si, só às 6 superfícies modais |

### As 6 superfícies modais (aplicação 1:1)

| # | Superfície | `trapFocus()` chamado em | `untrapFocus()` chamado em |
|---|---|---|---|
| 1 | `#onbOverlay` (onboarding) | `onbAbrir(idx)` — substitui a captura manual de `onbLastFocus` já existente | `onbFechar()` — substitui o retorno manual de foco já existente |
| 2 | `.wiz`/`#laudoSheet` (wizard de laudo) | função de abertura do wizard (`abrirLaudo`/equivalente) | `fecharLaudo()` |
| 3 | `#negSheet` | função de abertura de negociação | `fecharNeg()` |
| 4 | `#captSheet` | função de abertura de captação | `fecharCaptacao()` |
| 5 | `#cmpSheet` | função de abertura de comparação | `fecharComparacao()` |
| 6 | `#detail`/`#chooser` | `showDetail()`/abertura do chooser | `closeDetail()`/`closeChooser()` |

**Fecha o gap IN-03 da Fase 13** (registrado como deferido no CONTEXT.md daquela fase: "Focus-trap global de sheets — gap pré-existente, deferido"). Esta fase resolve com o utilitário único acima, sem reintroduzir 6 implementações divergentes.

---

## Estados Hover / Active / Focus

| Estado | Regra geral | Componentes afetados |
|---|---|---|
| `:hover` | Nunca introduz cor nova — escurece borda (`var(--ink)`) OU preenche com `var(--paper-2)` OU troca `var(--accent)`→`var(--accent-ink)` (já existente) | `.card`, botões secundários, `.moderow button`, links `.oqf-lista button` |
| `:active` | `transform:scale(.98)` em botões (feedback de pressão) — já existe parcialmente (`.moderow button{transition:transform .1s ease}`), esta fase formaliza como regra transversal para TODO botão primário/secundário | `.go`, `.onb-next`, `.acts button`, `.moderow button` |
| `:focus-visible` | Herdado e confirmado — `outline:2px solid var(--accent);outline-offset:2px` já cobre `button,.card,summary,a,select,input,[tabindex]` (linha 139). Inputs ganham reforço adicional de borda (ver tabela de Acabamento) | global, já correto — só o reforço de borda em inputs é novo |
| Reduced motion | `:active{transform:scale(.98)}` e `:hover{box-shadow:...}` são transições de propriedade (não `@keyframes`), então já respeitam `prefers-reduced-motion` implicitamente (não são "motion" no sentido de animação, são transições de estado instantâneas sob REDUCE via `transition-duration:0.01ms` global se já existir, OU mantidas — transições de hover/focus de <150ms não são consideradas motion decorativo pelo critério já usado nas Fases 6/13) | todos os itens acima |

---

## Color

Herdado 1:1 da Fase 13 — esta fase NÃO introduz, remove ou realoca nenhum hex. A paleta papel/óxido e o sistema `--status-*` permanecem exatamente como definidos em `13-UI-SPEC.md`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo do app, cards |
| Secondary (30%) | `--paper-2` `#f2eee4` / `--ink` `#141a1f` | sheets claros / blocos de destaque escuros |
| Accent (10%) | `--accent` `#b5451f` | reservado para marca, CTA primária, estado ativo, incerteza — inalterado |
| Destructive | não aplicável nesta fase | nenhuma ação destrutiva nova |

Accent reserved for: marca (`.brand`), CTA primária, estado ativo de seleção, selo de incerteza — lista idêntica à da Fase 13, sem adição.

---

## Copywriting Contract

Esta fase não introduz copy nova de produto (é refinamento visual/tipográfico) — só o comentário de licença de fonte (técnico, não visível ao usuário) e a confirmação de que nenhum texto muda.

| Element | Copy |
|---------|------|
| Primary CTA | N/A nesta fase — nenhum CTA novo introduzido |
| Empty state heading | N/A — nenhum estado vazio novo |
| Empty state body | N/A |
| Error state | N/A — se o `@font-face` falhar, o fallback stack degrada silenciosamente (nenhuma mensagem de erro ao usuário) |
| Destructive confirmation | N/A — nenhuma ação destrutiva nesta fase |
| Comentário de licença (técnico, no HTML) | `/* Archivo — Google Fonts — OFL license — https://fonts.google.com/specimen/Archivo — pesos 400/500/600/700/800 — subset latin */` e equivalente para JetBrains Mono |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

App HTML único, sem build, sem registry de componentes. Gate de registry não se aplica.

---

## Fora de Escopo (não tocar nesta fase)

- Mudança de paleta/cor ou realocação de `--status-*`/`--accent` — inalterados.
- Re-layout de qualquer componente — escopo é ACABAMENTO (tipografia + elevação + focus-trap), nenhum componente muda de posição/estrutura.
- Fraunces ou qualquer 3ª família de display serif — candidato forte registrado para uma fase futura de rebrand, fora de orçamento aqui.
- Dark mode, ícones customizados — deferidos no CONTEXT.md (v2.3+).
- `radius` diferente de 2px caixas / pill — identidade cartográfica angular intocada.

---

## Verificação (preview, mobile 375 + desktop 1280)

- `document.fonts.check('700 16px Archivo')` e `document.fonts.check('700 11px "JetBrains Mono"')` retornam `true` após carregamento — confirma que a fonte embutida está de fato ativa (não é só o nome no CSS).
- Nenhuma ocorrência residual de `"IBM Plex Sans"`/`"IBM Plex Mono"` em `grep -c` no HTML final (194 → 0).
- Screenshot antes/depois do painel de busca, ficha (`.detail`), onboarding e um PDF de laudo gerado — critério de aceite humano é o usuário achar "premium" (UAT).
- Payload do HTML antes/depois medido e registrado no SUMMARY — confirma que o total de base64 ficou dentro do teto de ~250KB.
- `font-variant-numeric: tabular-nums` presente em todo seletor de valor numérico dinâmico listado na tabela — números não "dançam" de largura ao recalcular.
- Sistema `--elev-0/1/2/3` presente no `:root`, nenhuma sombra ad hoc fora dos 4 tokens (`grep -c "box-shadow"` deve bater com os usos de `var(--elev-`).
- Focus-trap testado com Tab simulado nas 6 superfícies: Tab no último elemento focável volta ao primeiro (e vice-versa com Shift+Tab); Esc mantém o comportamento e a ordem de prioridade EXATAMENTE como antes (nenhuma regressão na cadeia de `keydown` de Esc); fechar cada superfície devolve o foco ao gatilho.
- Cadeia de Esc, quirk iOS do drag do bottom sheet, e navegação por teclado do combobox de busca — testados manualmente, sem regressão.
- Suíte de 239 testes verde; parse dos blocos de `<script>` sem erro.
- Contraste AA nos dois fundos (`--paper`/satélite) para todo texto — herdado, revalidado visualmente já que a troca de família pode alterar sutilmente a espessura percebida dos traços (peso 500 do body deve permanecer legível).
- `prefers-reduced-motion`: hover/active/focus continuam funcionando (são transições de estado, não animação decorativa), nenhuma regressão.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
