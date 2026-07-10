---
phase: 9
slug: ficha-conclusao-comercial-scores
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-07
---

# Phase 9 — UI Design Contract

> Visual and interaction contract para a REORDENAÇÃO da ficha do imóvel (`#detail`): de "dado técnico primeiro" para "conclusão comercial primeiro" — faixa de valor → score de oportunidade → score de confiança → leitura prática → ações → comparáveis (conclusão-primeiro) → dados técnicos em accordion → metodologia/fontes no fim. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** só a ESTRUTURA e os NOVOS elementos (scores, leitura prática, reordenação, accordion, ações). Zero token novo — 100% reuso do sistema cartográfico/oxide já mapeado na Fase 8. Refino visual global (respiro, densidade, pinos, skeleton animado) é Fase 13 — aqui qualquer "placeholder de carregamento" é textual, não skeleton.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla com variáveis `:root`, reuso de `.detail`/`.dgrid`/`.cmp`/`.acts`/`.foot` já existentes |
| Icon library | emoji textual (📊 📄 🧮 ▸ ▾) — mesmo padrão já usado em `.cmpbtn`/`.laudobtn`/`.foot>summary`; NENHUM ícone SVG novo |
| Font | `"IBM Plex Sans"` (UI/copy/leitura prática) + `"IBM Plex Mono"` (código/rótulo técnico — inscrição, badges de confiança, "por quê" técnico) |

Identidade: cartográfica/oxide (papel + tinta + carimbo vermelho-óxido), herdada 1:1 da Fase 8. Bordas 1.5–2px sólidas, `border-radius:2px` na maioria (pills existentes usam 20px/22px — não introduzir pill novo).

---

## Tokens Reusados (zero hex novo)

| Var CSS | Hex | Uso nesta fase |
|---------|-----|-----------------|
| `--paper` | `#e9e4d8` | fundo do `.detail` card/sheet em repouso (herdado) |
| `--paper-2` | `#f2eee4` | fundo do `.detail` (é o container, `background:var(--paper-2)` já hoje), fundo dos cards internos claros |
| `--ink` | `#141a1f` | texto principal, número do score (`.score .num`), borda de destaque do card FAIXA DE VALOR |
| `--line` | `#c3b9a3` | borda padrão dos cards internos (`.dgrid .cell`, `.score`, `.leitura`) |
| `--muted` | `#57503f` | texto secundário: "por quê" recolhido, rótulo de score sem dado, texto de metodologia |
| `--accent` | `#b5451f` | ação primária ("Gerar documento"), destaque do card FAIXA DE VALOR, score "sem dados" nunca usa accent (ver Color) |
| `--accent-ink` | `#8f3116` | hover da ação primária (par já estabelecido) |
| `--lot`/`--ok` | `#2c5545` | **status positivo do score de oportunidade** ("boa oportunidade") — reuso do badge `.badge.alta` já existente em `.cmp .h .badge` |
| `--gold` | `#a8842c` | **status "atenção"** do score (equivalente ao `.badge.media` já existente) — reservado, não usar para nada além de status de score/confiança nesta fase |
| `--muted` (cinza) | `#57503f` | status "sem dado"/"sem base para estimar" — nunca inventa cor de alerta para ausência de dado |

Nenhuma cor nova. `--gold` já era usado para Caixa (`.caixabtn`) — aqui ganha um SEGUNDO uso semântico (status "atenção" do score), consistente com o badge `.badge.media` que já faz exatamente isso em `.cmp`. Nenhum destructive color novo: nenhuma ação desta fase é irreversível.

---

## Spacing Scale

Reuso da escala já implícita no código (múltiplos de 4, alvo de toque 44px):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | gap entre número do score e rótulo textual |
| sm | 8px | gap entre score de oportunidade e score de confiança na "linha de scores"; gap interno do bloco leitura prática |
| md | 16–18px | padding do card FAIXA DE VALOR (herdado do `.detail{padding:16px 18px}`); margem entre blocos da ficha reordenada |
| touch | **44px mínimo** | altura de: cada score card/chip tocável (expande "por quê"), botão "Mais opções", `summary` de cada accordion, ação primária/secundária |
| lg | 22px | não usado nesta fase (reservado ao padding do painel, herdado, não a peça nova) |

Exceções: nenhuma. Todo elemento novo herda o mínimo de 44px já padrão no app (`.cmpbtn`, `.laudobtn`, `.acts button` já são 44px — os novos scores/accordion seguem o mesmo contrato.

---

## Typography

Reuso quase total — 1 novo papel tipográfico adicionado (Display do valor), dentro da escala já existente no app (nenhum tamanho/peso inédito é introduzido; `20px/800` já existe em `.crow.total .cv`).

| Role | Size | Weight | Line Height | Onde já existe / reuso |
|------|------|--------|-------------|--------------------------|
| Display (faixa de valor) | 22px | 800 | 1.15 | NOVO papel — mas dentro da família já usada (`.crow.total .cv{font:800 22px/1}` já existe no calc de custos); reaproveita o MESMO par tamanho/peso, sem inventar |
| Heading (h3 endereço) | 18px | 700 | 1.15 | `.detail h3{font:700 18px/1.15}` — inalterado |
| Score número | 20px | 800 | 1 | mesma família do Display, um degrau abaixo — reuso do peso 800 já presente no app (`.crow.total .cv`) |
| Score rótulo | 13px | 700 | 1.2 | próximo de `.chooser .chrow .u{font:700 14px/1.15}` — 13px por ser rótulo secundário ao número |
| Body / leitura prática | 13.5px | 500 | 1.55 | igual `.wcard{font:500 14px/1.6}` do wizard — arredondado ao padrão de leitura de bloco já usado no app |
| Label / "k" (dgrid, metadado) | 11px | 600 | 1.2 | `.dgrid .cell .k{font:600 11px/1.2}` — inalterado |
| Código/técnico (inscrição, "por quê" recolhido, badge) | 11–13px | 600–700 | 1.2–1.4 | `.insc{font:600 13px/1}` mono; `.badge{font:700 9-10px/1}` mono — reuso direto |
| Micro/nota | 10.5px | 500 | 1.45 | `.dnote{font:500 10.5px/1.45}` — inalterado, reusado para disclaimers de score |

Sem novo weight (400/500/600/700/800 já cobrem tudo — nenhum 300/900 introduzido).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo dos cards internos (`.dgrid .cell`, cards de score, card leitura prática) |
| Secondary (30%) | `--paper-2` `#f2eee4` | fundo do container `.detail` (herdado), fundo do accordion aberto |
| Accent (10%) | `--accent` `#b5451f` | **reservado exclusivamente para**: (1) ação primária "Gerar documento" (fundo sólido, já é o padrão `.acts a.primary`), (2) borda de destaque do card FAIXA DE VALOR, (3) foco de teclado (`:focus-visible`, herdado global), (4) número do score quando não há status verde/dourado aplicável (fallback neutro de destaque tipográfico, nunca como "sinal de risco") |
| Status positivo | `--lot` `#2c5545` | score de oportunidade ALTO ("boa oportunidade") — reuso 1:1 do `.badge.alta` já existente |
| Status atenção | `--gold` `#a8842c` | score de oportunidade MÉDIO/confiança MÉDIA ("atenção") — reuso 1:1 do `.badge.media` já existente |
| Status sem dado | `--muted` `#57503f` | score "sem base para estimar" — cinza neutro, texto sempre explícito, nunca cor isolada |
| Destructive | não aplicável nesta fase | nenhuma ação irreversível (accordion abre/fecha, "mais opções" expande — tudo reversível, sem confirmação) |

**Regra de acessibilidade (CONTEXT.md, decisão travada):** cor é SEMPRE reforço, nunca único veículo de significado. Todo score/badge de status traz rótulo textual visível (ex.: "Boa oportunidade", "Confiança média", "Sem base para estimar") ANTES/JUNTO da cor — nunca só a cor.

**Contraste AA confirmado (herdado, mesma tabela da Fase 8):**
- `--muted #57503f` sobre `--paper`/`--paper-2` → ~7:1
- `--ink #141a1f` sobre `--paper`/`--paper-2` → >13:1
- `--accent #b5451f` sobre `--paper` → ~4.9:1 (texto ≥14px/700 ou peso 800; não usar accent para texto de corpo <14px — score número usa 20px/800, dentro da regra)
- `--lot #2c5545` sobre `--paper` → contraste alto (verde escuro sobre papel claro) — já usado como texto em `.cmpbtn{color:var(--lot)}`, aprovado
- `--gold #a8842c` como TEXTO em corpo pequeno tem contraste marginal (por isso `.caixabtn` usa `color:#7d621f`, dourado escurecido) — **regra**: `--gold` em texto de score usa a variante escurecida `#7d621f` (mesma técnica já aplicada no app); como FUNDO de badge (`.badge.media{background:var(--gold);color:#fff}`) já é aprovado e mede AA

---

## Estrutura da Ficha Reordenada (FICHA-01)

Ordem final dentro de `#detail` (top→bottom), substituindo a ordem atual (`dtag→h3→insc→dgrid→dcomps→dlaudo→dnote→acts`):

```
1. .shead (grab/backlist/close)          — INALTERADO
2. .dtag (Q·L·bairro·unidade)            — INALTERADO, mas desce visualmente (vira meta-info, não protagonista)
3. h3#dAddr (endereço)                   — INALTERADO
4. .insc (inscrição)                     — INALTERADO
5. NOVO: .dvalor (card FAIXA DE VALOR)   — destaque tipográfico máximo (Display 22px/800)
6. NOVO: .dscores (linha de scores)      — oportunidade + confiança, lado a lado ≥375px, empilha se necessário
7. NOVO: .dleitura (leitura prática)     — bloco de texto destacado, 1-2 frases
8. .acts (ações)                         — REORDENADO: 1 primária + 2 secundárias + "Mais opções"
9. .dcomps (comparáveis)                 — REESCRITO: conclusão-primeiro (CMP-01)
10. NOVO: <details> "Dados técnicos"     — .dgrid ATUAL entra aqui, recolhido por padrão
11. .dnote                                — entra dentro do accordion técnico (é nota de fonte/data do cadastro)
12. NOVO: <details> "Metodologia e fontes" — score/leitura/comparáveis explicados; acompanha (não substitui) o `.foot` global já existente no rodapé do painel
```

**Nota de implementação (não é decisão de UI, é lembrete factual):** `.dlaudo` (botões custos+laudo) e `.acts` (CND/mapas/copiar link) hoje são dois blocos separados — nesta reordenação eles se FUNDEM na seção 8 (ações), conforme a Lei da Tela abaixo. `mercadoEstimado()`, `renderComps()`, `venalTxt()` são reaproveitados sem mudança de cálculo — só de apresentação.

---

## Component 1 — Card FAIXA DE VALOR (`.dvalor`)

**HTML de referência:**

```html
<div class="dvalor">
  <div class="dvalor-k">Faixa estimada de mercado</div>
  <div class="dvalor-v">R$ 690 mil – R$ 780 mil</div>
  <div class="dvalor-m">preço de mercado do bairro, FipeZap/imprensa 2025-26</div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| Container | `background:var(--paper); border:2px solid var(--ink); border-radius:2px; padding:16px 18px` | borda 2px (mesma espessura do `.detail` externo — reforça "isto é o mais importante") |
| `.dvalor-k` (rótulo) | `font:600 11px/1.2 "IBM Plex Sans"; color:var(--muted); text-transform:uppercase; letter-spacing:.02em` | mesmo padrão do `.dgrid .cell .k` |
| `.dvalor-v` (valor) | `font:800 22px/1.15 "IBM Plex Sans"; color:var(--ink)` | Display — maior elemento tipográfico da ficha |
| `.dvalor-m` (método, 1 linha) | `font:500 10.5px/1.45 "IBM Plex Sans"; color:var(--muted)` | igual `.dnote` — método completo (o texto de `mercadoEstimado().metodo`) permanece disponível, mas resumido aqui e detalhado no accordion "Metodologia" |

**Estado sem estimativa (venal não informado / sem dados de mercado):**

```html
<div class="dvalor dvalor-empty">
  <div class="dvalor-k">Faixa estimada de mercado</div>
  <div class="dvalor-v muted">Sem base para estimar</div>
  <div class="dvalor-m">Faltam dados suficientes (venal ou área) para calcular uma faixa. Consulte o dado técnico abaixo.</div>
</div>
```
- `.dvalor-v.muted{color:var(--muted)}` — mesmo container, nunca inventa número. Texto honesto, nunca "R$ 0" ou "—" sozinho.

---

## Component 2 — Linha de Scores (`.dscores`) — SCORE-01, SCORE-02

**HTML de referência:**

```html
<div class="dscores">
  <button class="score score-op" aria-expanded="false" aria-controls="scoreOpWhy">
    <span class="score-num">78<span class="score-max">/100</span></span>
    <span class="score-lbl">Boa oportunidade</span>
    <span class="score-chev" aria-hidden="true">▸</span>
  </button>
  <div id="scoreOpWhy" class="score-why" hidden>Está 8% abaixo da mediana da vizinhança (comparáveis em até 400 m).</div>

  <button class="score score-conf conf-media" aria-expanded="false" aria-controls="scoreConfWhy">
    <span class="score-lbl-main">Confiança: <b>média</b></span>
    <span class="score-chev" aria-hidden="true">▸</span>
  </button>
  <div id="scoreConfWhy" class="score-why" hidden>Faltou a área privativa confirmada; 6 comparáveis na vizinhança.</div>
</div>
```

| Estado | Visual | Regra |
|--------|--------|-------|
| Score oportunidade ALTO (≥66) | `.score-op{border-left:4px solid var(--lot)}`, `.score-num{color:var(--lot)}`, rótulo "Boa oportunidade" | cor É reforço; rótulo sempre visível, nunca só a barra verde |
| Score oportunidade MÉDIO (33–65) | `border-left:4px solid var(--gold)`, `.score-num{color:#7d621f}` (dourado escurecido, AA), rótulo "Oportunidade média" | mesma técnica de escurecimento já usada em `.caixabtn` |
| Score oportunidade BAIXO (<33) | `border-left:4px solid var(--accent)`, `.score-num{color:var(--accent)}`, rótulo "Abaixo da mediana" | accent aqui não é "erro", é status — dentro do 3º uso aprovado do accent nesta fase |
| Score "sem base para estimar" | `border-left:4px solid var(--line)`, `.score-num` omitido, texto único "Sem base para estimar" em `--muted` | nunca mostra número ou faixa quando não há comparáveis/venal suficientes — decisão travada em CONTEXT.md |
| Confiança ALTA | `.conf-alta{border-left:4px solid var(--lot)}`, rótulo "Confiança: alta" | completude: área presente + ≥8 comparáveis + não-atípico |
| Confiança MÉDIA | `border-left:4px solid var(--gold)`, rótulo "Confiança: média" | 1 pendência concreta citada no "por quê" |
| Confiança BAIXA | `border-left:4px solid var(--accent)`, rótulo "Confiança: baixa" | ≥2 pendências citadas no "por quê" |
| Expandido (`aria-expanded="true"`) | `.score-why{hidden` removido}`, `.score-chev` conteúdo troca `▸`→`▾` (mesmo padrão do `.foot>summary::before`) | clique/Enter/Space no card inteiro alterna — alvo ≥44px de altura |
| Focus-visible | outline 2px `--accent`, offset 2px (herdado global) | teclado |

**Especificações de layout:**
- Container `.dscores{display:flex; gap:8px; flex-wrap:wrap}` — cada `.score` `flex:1; min-width:150px` (empilha em telas <375px se necessário, nunca força scroll horizontal).
- Cada `.score` é um `<button>` real (não `<div onclick>`) — foco/teclado nativo, sem `role` extra necessário.
- `.score-num{font:800 20px/1 "IBM Plex Sans"}`, `.score-max{font:600 12px/1; color:var(--muted)}`, `.score-lbl{font:700 13px/1.2}`.
- `.score-why{font:500 12px/1.5 "IBM Plex Sans"; color:var(--muted); padding:8px 12px 2px}` — o "porquê" é sempre 1 frase, nunca jargão (mediana/percentil vivem só no accordion "Metodologia").
- Background do card: `var(--paper)`, borda padrão `1.5px solid var(--line)` + a `border-left:4px` de status acima (reuso exato do padrão já usado em `.card{border-left:4px solid var(--lot)}` e `.chooser .chrow{border-left:4px solid var(--lot)}`).

---

## Component 3 — Leitura Prática (`.dleitura`) — LEIT-01

**HTML de referência:**

```html
<div class="dleitura">
  <p>Apartamento no Setor Bueno. Imóvel alinhado à região, com boa liquidez se área privativa e conservação forem confirmadas.</p>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| Container | `background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:12px 14px` | fundo levemente diferenciado do resto (paper-2 dentro de um card que já é paper-2 — usar `--paper` aqui para contraste sutil de bloco) — **ajuste**: usar `background:var(--paper)` para diferenciar do container pai |
| Texto | `font:500 13.5px/1.55 "IBM Plex Sans"; color:var(--ink)` | corpo de leitura, mesma família do `.wcard` do wizard |

**Regras de conteúdo (determinístico por template — decisão travada em CONTEXT.md):**
- 1–2 frases, sem jargão técnico (mediana/percentil/quartil NUNCA aparecem aqui — só em "ver metodologia").
- Template por combinação de faixa/posição/liquidez-proxy/uso — exemplo-alvo do Plano UX v3 §6: *"Apartamento no Setor Bueno. Imóvel alinhado à região, com boa liquidez se área privativa e conservação confirmadas."*
- Estado sem dados suficientes: *"Dados insuficientes para uma leitura de mercado — confira os dados técnicos abaixo."* (nunca inventa leitura sobre score ausente).

---

## Component 4 — Ações (`.acts`) — Lei da Tela

**HTML de referência (substitui o `.acts` + `.dlaudo` atuais fundidos em um único bloco):**

```html
<div class="acts">
  <button class="primary" onclick="abrirLaudo()">📄 Gerar documento</button>
  <button onclick="document.getElementById('dComps').scrollIntoView({behavior:motionOk?'smooth':'auto'})">📊 Ver comparáveis</button>
  <button onclick="copyInsc('...')">Copiar inscrição ⧉</button>
</div>
<details class="maisopcoes">
  <summary>Mais opções</summary>
  <div class="footbody acts">
    <button onclick="abrirCustos()">🧮 Custos de compra (ITBI + cartório)</button>
    <a class="cndlink" href="..." target="_blank" rel="noopener">Titular (CND) ⧉↗</a>
    <button onclick="copyLink('...')">Copiar link deste imóvel ⧉</button>
    <a href="...maps..." target="_blank" rel="noopener">Google Maps ↗</a>
    <a href="...streetview..." target="_blank" rel="noopener">Street View ↗</a>
    <a href="...earth..." target="_blank" rel="noopener">Earth ↗</a>
  </div>
</details>
```

| Slot | Ação | Estilo |
|------|------|--------|
| Primária (1) | **"Gerar documento"** (abre o wizard/laudo existente, `abrirLaudo()`) | `.acts a.primary`/`.acts button.primary` já existente — `background:var(--accent); border-color:var(--accent); color:#fff`, hover `--accent-ink` |
| Secundária 1 | "Ver comparáveis" (scroll até `.dcomps`, não dispara nova consulta) | `.acts button` padrão — `border:1.5px solid var(--ink); background:var(--paper); color:var(--ink)` |
| Secundária 2 | "Copiar inscrição" (reuso de `copyInsc()`) | idem padrão |
| Mais opções | `<details class="maisopcoes">` reusando 1:1 o padrão visual de `.foot` (accordion nativo) | custos, CND, copiar link, Google Maps/Street View/Earth — tudo que hoje está em `.acts`/`.dlaudo` e não é 1 das 3 ações principais |

**Regras (CONTEXT.md, decisão travada):**
- Exatamente 1 primária + até 2 secundárias visíveis sempre; todo o resto vai para "Mais opções" (colapsado por padrão).
- Re-priorização de ações (WhatsApp/salvar/captação) é Fase 10 — aqui SÓ a estrutura 1+2+resto.
- `.maisopcoes` usa a MESMA classe/marcador visual de `.foot` (▸/▾, `list-style:none`, sem `-webkit-details-marker`) para consistência com o accordion de metodologia — nenhum CSS novo de accordion, reuso literal.

---

## Component 5 — Comparáveis Conclusão-Primeiro (`.dcomps`) — CMP-01

**HTML de referência (reescreve o conteúdo de `renderComps()`, mantém o cálculo):**

```html
<div class="cmp">
  <div class="cmp-conclusao">
    <b>8% abaixo da mediana</b> da vizinhança — entre os mais baratos da região.
  </div>
  <div class="cmp-acts">
    <button class="cmpbtn-sm" onclick="document.getElementById('cmpMetodologia').open=true">Ver metodologia</button>
  </div>
  <details id="cmpMetodologia" class="cmp-detalhe">
    <summary>Estatística completa</summary>
    <div class="footbody">
      <!-- .bar / .lbl / .pos / .mkt ATUAIS entram aqui, sem mudança de cálculo -->
    </div>
  </details>
</div>
```

| Elemento | Estilo | Regra |
|----------|--------|-------|
| `.cmp-conclusao` | `font:600 13.5px/1.5 "IBM Plex Sans"; color:var(--ink)` — número/percentual em `<b>` cor `--accent` se abaixo da mediana (bom p/ comprador) ou `--lot` se acima (bom p/ vendedor) — **cor reforça, rótulo textual sempre presente** | primeira coisa que aparece — a FRASE, não a barra |
| `.cmp-acts` | botão pequeno "Ver metodologia" — `font:600 11px/1; padding:8px 10px; min-height:36px` (aceitável por ser secundário dentro de um card já denso; se preferir consistência total, usar 44px) — **ajustar para min-height:44px** para manter o contrato de toque sem exceção | abre o `<details>` abaixo — reuso do padrão accordion |
| `.cmp-detalhe` | reuso 1:1 de `.foot`/`.foot>summary` (▸/▾) | dentro: a barra `.bar`/`.lbl`/`.pos`/`.mkt` ATUAIS, sem alteração de cálculo/HTML interno — só passam a viver dentro do `<details>` em vez de expostos direto |
| Fim do bloco | "ação ao fim" — reusa a ação primária "Gerar documento" já presente acima do bloco (CONTEXT.md: "cada comparação termina com ação") — **não duplicar** o botão; se necessário, um link textual "Gerar documento com esses comparáveis ↑" apontando para a ação primária existente | evita ação primária duplicada na tela — decisão de discrição do UI-SPEC |

**Estados:**
- Com estimativa completa: conclusão + metodologia recolhida (acima).
- Sem comparáveis suficientes (`n<3`): mantém a mensagem textual já existente (`'Poucos comparáveis do mesmo perfil na vizinhança (N em R m).'`) — sem conclusão inventada.
- Carregando: mantém o texto atual (`'⏳ analisando a vizinhança… (até ~20s no celular)'`) — placeholder textual, skeleton animado é Fase 13.
- Erro de rede: mantém o texto atual (`'Falha ao consultar a vizinhança — tente de novo.'`).

---

## Component 6 — Accordion "Dados técnicos" e "Metodologia e fontes"

**HTML de referência (reuso literal de `.foot`/`<details>`, só trocando o conteúdo interno):**

```html
<details class="foot dtecnico">
  <summary>Dados técnicos</summary>
  <div class="footbody">
    <div class="dgrid" id="dGrid"><!-- .cell × 9, conteúdo ATUAL sem mudança --></div>
    <div class="dnote" id="dNote"></div>
  </div>
</details>

<details class="foot dmetodologia">
  <summary>Metodologia e fontes</summary>
  <div class="footbody">
    <p><b>Score de oportunidade:</b> calculado pela posição do R$/m² do imóvel em relação à mediana e quartis (Q1–Q3) dos comparáveis na vizinhança (raio de 400–800 m, NBR 14653-2). Sem comparáveis suficientes, o score não é exibido.</p>
    <p><b>Score de confiança:</b> alta/média/baixa por completude — presença de área confirmada, número de comparáveis (≥8 = alta) e se o imóvel é atípico dentro da amostra.</p>
    <p><b>Faixa de valor:</b> preço de mercado do bairro (FipeZap/imprensa 2025-26, fator oferta 0,90) ou laudos reais da Caixa no setor, quando disponíveis.</p>
    <p>Fonte: ArcGIS público da Prefeitura de Goiânia (Cadastro Imobiliário). O nome do titular não é lido por aqui — é consultado manualmente na CND oficial.</p>
  </div>
</details>
```

| Elemento | Estilo | Regra |
|----------|--------|-------|
| `.foot`/`.foot>summary` | reuso EXATO do CSS já existente (`padding:9px 22px; border-top:1px solid var(--line); font-size:10.5px; color:var(--muted)`; summary `▸`/`▾` via `::before`, `list-style:none`, `-webkit-details-marker:none`) | zero CSS novo — só 2 instâncias adicionais do mesmo componente |
| Foco visível | herdado globalmente: `summary:focus-visible{outline:2px solid var(--accent); outline-offset:2px}` | já cobre `<summary>` — confirmado na regra global do app |
| Navegação por teclado | `<details>`/`<summary>` nativos — Tab foca o summary, Enter/Space alterna `open`, sem JS adicional necessário | comportamento nativo do HTML, sem custom ARIA |
| "Dados técnicos" recolhido por padrão | sem atributo `open` | decisão travada em CONTEXT.md — dado técnico não domina a 1ª dobra |
| "Metodologia e fontes" recolhido, no FIM | sem atributo `open`, posicionado depois de "Dados técnicos" e antes/junto do `.foot` global do painel (fontes gerais do app) | mesma disciplina — nunca antes das ações/scores |

**Nota:** o `.foot` global do painel (rodapé com "Fontes & metodologia" gerais do app, linha 611-614 do HTML atual) permanece INALTERADO e SEPARADO — é do painel de busca, não da ficha. O novo `.dmetodologia` é escopado à ficha (`#detail`), explicando os cálculos NOVOS desta fase (score/leitura/comparáveis).

---

## Estados da Ficha

| Estado | Faixa de valor | Scores | Leitura prática | Comparáveis |
|--------|-----------------|--------|-------------------|--------------|
| **Estimativa completa** | valor + método resumido | oportunidade + confiança com número/rótulo/cor | frase gerada por template | conclusão + metodologia recolhida |
| **Sem comparáveis suficientes** | valor pode existir (via tabela do bairro/Caixa, independente de comparáveis) | score de oportunidade → "Sem base para estimar" (comparáveis insuficientes é 1 dos motivos); confiança → baixa, "por quê" cita "poucos comparáveis na vizinhança" | "Dados insuficientes para uma leitura de mercado — confira os dados técnicos abaixo." | mensagem textual existente ("Poucos comparáveis...") sem barra/estatística |
| **Venal não informado** | se não há tabela do bairro nem laudo Caixa nem venal → "Sem base para estimar" (ver Component 1) | idem — sem venal e sem tabela, oportunidade não pode ser calculada | idem estado anterior | comparáveis podem ainda existir SE houver área+coordenada (são independentes do venal do próprio imóvel para a consulta, mas a posição do imóvel na faixa depende de `myPm2` — se não há venal, pula a marcação "este imóvel" na barra, mantém a distribuição da vizinhança) |
| **Carregando** (aguardando comparáveis) | disponível imediatamente (não depende de rede) | oportunidade/confiança que dependem de comparáveis mostram texto "Calculando…" (herdado do padrão `.cmp-load`) até a resposta chegar | idem "Calculando…" se depende de comparáveis | texto atual `'⏳ analisando a vizinhança…'` — placeholder textual, sem skeleton (Fase 13) |

**Regra transversal (honestidade, CONTEXT.md):** nenhum estado exibe número/faixa/score inventado. Ausência de dado é sempre texto explícito ("não informado", "sem base para estimar", "dados insuficientes"), nunca "0", "—" sozinho ou omissão silenciosa.

---

## Mobile 375 × Desktop 1280

| Aspecto | Mobile (≤820px, bottom-sheet) | Desktop (≥821px, card sobre o mapa) |
|---------|-------------------------------|----------------------------------------|
| Container | `.detail` inalterado: `position:absolute; bottom:16px; ...; max-height:calc(100dvh - 32px); overflow-y:auto` — grab/backlist/scroll PRESERVADOS 1:1 (guarda CONTEXT.md) | idêntico, card com `border:2px solid var(--ink)` sobre o mapa |
| `.grab` (alça de arrastar) | inalterado — continua no topo do sheet, gestos de swipe intactos | não visível (é só mobile, já é assim hoje) |
| `.backlist` ("☰ Resultados") | inalterado — aparece só quando há múltiplos resultados (`LAST.length>1`) | não aplicável (já é assim hoje) |
| Ordem vertical | idêntica em ambos os breakpoints — a reordenação (FICHA-01) é do FLUXO, não muda por viewport | idêntica |
| `.dscores` (linha de scores) | `flex-wrap:wrap` — os 2 cards (oportunidade/confiança) empilham se a largura do sheet (~343px de conteúdo útil em 375px de tela) não comportar `min-width:150px` × 2 + gap | lado a lado confortavelmente (card desktop tem mais largura) |
| `.acts` (1+2+Mais opções) | `flex-wrap:wrap`, cada botão `flex:1; min-width:130px` (herdado) — 3 botões podem quebrar em 2 linhas (1+2) em 375px, aceitável | 3 botões numa linha só, sobra espaço |
| Satélite/z-index | zero mudança — `.detail{z-index:500}` continua sob nenhum elemento novo desta fase; toggle de satélite (`z-index:490`) permanece abaixo do `.detail` | idêntico |
| Scroll | `.detail{overflow-y:auto}` já cobre o conteúdo mais longo (accordions recolhidos ajudam a manter a ficha mais curta que hoje, não mais longa) | idêntico |

---

## Acessibilidade / Motion (obrigatório)

- **Contraste AA** confirmado para todas as combinações novas (ver tabela em Color) — `--gold` em texto usa a variante escurecida `#7d621f`, nunca o hex puro como texto de corpo.
- **`prefers-reduced-motion`**: nenhuma transição nova introduzida por scores/accordion/leitura — expansão de "por quê" e `<details>` são *snap* (toggle de `hidden`/`open` nativo, sem `transition:` customizado). A entrada do `.detail` (spring mobile / fade desktop) já existente e já `REDUCE`-aware NÃO é alterada por esta fase.
- **Scores tocáveis** (`.score`) são `<button>` reais com `aria-expanded`/`aria-controls` — navegáveis por Tab, ativáveis por Enter/Space, sem custom keyboard handler.
- **Accordions** (`.dtecnico`, `.dmetodologia`, `.maisopcoes`, `.cmp-detalhe`) são `<details>`/`<summary>` nativos — foco visível herdado (`summary:focus-visible{outline:2px solid var(--accent)}`), navegação por teclado nativa, zero ARIA customizado necessário.
- **`aria-live`**: `.score-why` ao expandir não precisa de live region (é resultado de ação direta do usuário, não atualização assíncrona) — manter simples, sem over-engineering.
- **Alvo ≥44px**: cada `.score` (altura do botão fechado), botão "Ver metodologia" (ajustar de 36px para 44px — ver nota no Component 5), cada `summary` de accordion (herda `.foot>summary` que já tem padding suficiente — confirmar em preview), botões de `.acts`.
- **Zero regressão** (CONTEXT.md): `venalTxt()` ("não informado" para venal=0), sheet mobile (grab/backlist/scroll), z-index do satélite sob o sheet, guardas do hotfix `a7a4646` — nenhum destes é tocado por esta fase; a reordenação é só de APRESENTAÇÃO sobre os mesmos dados/funções (`mercadoEstimado`, `renderComps`, `getComps`, `compsStats`).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Rótulo faixa de valor | "Faixa estimada de mercado" |
| Faixa de valor — sem dado | "Sem base para estimar" + "Faltam dados suficientes (venal ou área) para calcular uma faixa. Consulte o dado técnico abaixo." |
| Score oportunidade — rótulo ALTO | "Boa oportunidade" |
| Score oportunidade — rótulo MÉDIO | "Oportunidade média" |
| Score oportunidade — rótulo BAIXO | "Abaixo da mediana" |
| Score oportunidade — sem dado | "Sem base para estimar" |
| Score oportunidade — "por quê" (exemplo) | "Está 8% abaixo da mediana da vizinhança (comparáveis em até 400 m)." |
| Score confiança — rótulo | "Confiança: alta" / "Confiança: média" / "Confiança: baixa" |
| Score confiança — "por quê" (exemplo) | "Faltou a área privativa confirmada; 6 comparáveis na vizinhança." |
| Leitura prática (template, exemplo) | "Apartamento no Setor Bueno. Imóvel alinhado à região, com boa liquidez se área privativa e conservação forem confirmadas." |
| Leitura prática — sem dado | "Dados insuficientes para uma leitura de mercado — confira os dados técnicos abaixo." |
| Ação primária | "Gerar documento" (verbo de ação — abre o wizard/laudo existente) |
| Ação secundária 1 | "Ver comparáveis" |
| Ação secundária 2 | "Copiar inscrição" |
| Botão "mais opções" | "Mais opções" |
| Comparáveis — conclusão (exemplo, abaixo da mediana) | "**8% abaixo da mediana** da vizinhança — entre os mais baratos da região." |
| Comparáveis — conclusão (exemplo, acima da mediana) | "**8% acima da mediana** da vizinhança — entre os mais caros da região." |
| Comparáveis — ver metodologia | "Ver metodologia" |
| Comparáveis — poucos dados (herdado) | "Poucos comparáveis do mesmo perfil na vizinhança ({n} em {radius} m)." |
| Comparáveis — carregando (herdado) | "⏳ analisando a vizinhança… (até ~20s no celular)" |
| Comparáveis — erro (herdado) | "Falha ao consultar a vizinhança — tente de novo." |
| Accordion — dados técnicos | "Dados técnicos" |
| Accordion — metodologia | "Metodologia e fontes" |
| Metodologia — score de oportunidade | "Calculado pela posição do R$/m² do imóvel em relação à mediana e quartis (Q1–Q3) dos comparáveis na vizinhança (raio de 400–800 m, NBR 14653-2). Sem comparáveis suficientes, o score não é exibido." |
| Metodologia — score de confiança | "Alta/média/baixa por completude — presença de área confirmada, número de comparáveis (≥8 = alta) e se o imóvel é atípico dentro da amostra." |
| Destrutivo nesta fase | nenhuma ação irreversível — abrir/fechar accordion e "por quê" são reversíveis, sem confirmação |

Todo texto acima é pt-BR sem jargão na 1ª camada (mediana/percentil/quartil só aparecem dentro de "Metodologia e fontes"), verbo de ação nos botões, sem caixa alta em bloco longo, sem gíria/ironia — alinhado ao gate de linguagem da Fase 14 (esta fase antecipa o padrão, não substitui o gate final).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

Nenhum registry de componentes é usado neste projeto — app HTML único, sem build. Gate de registry não se aplica.

---

## Fora de Escopo (não tocar nesta fase)

- Refino visual global (respiro, densidade de textura/borda, pinos semânticos) — Fase 13.
- Skeleton animado de carregamento — Fase 13; aqui todo "carregando" é texto estático herdado.
- Motion coreografado de busca (Localizando→Consultando→...) — Fase 13.
- Re-priorização de ações (WhatsApp/salvar/captação) — Fase 10; aqui a Lei da Tela é só ESTRUTURADA (1+2+resto), não populada com as ações novas de Fase 10.
- Documentos em 3 níveis (ficha rápida/relatório/laudo-PTAM) — Fase 11; "Gerar documento" aqui continua abrindo o wizard atual (`abrirLaudo()`), sem a triagem de finalidade.
- Seção "Urbanístico" (Plano Diretor) — Fase 18.
- Nenhuma cor fora de `--paper/--paper-2/--ink/--line/--muted/--accent/--accent-ink/--lot/--gold` aparece em qualquer componente novo.

---

## Verificação (preview, mobile 375 + desktop 1280)

- Ordem da ficha: identificação → faixa de valor → scores → leitura prática → ações → comparáveis → accordion "Dados técnicos" → accordion "Metodologia e fontes".
- Faixa de valor é o maior elemento tipográfico da ficha (22px/800), acima de qualquer número em `.dgrid`.
- Score de oportunidade e confiança sempre trazem número (se houver)+rótulo textual+cor de reforço — nunca só cor; "por quê" expande com clique/Enter/Space, `aria-expanded` sincronizado.
- Estado "sem base para estimar" nunca mostra número ou faixa inventados — testar com imóvel sem venal e sem comparáveis suficientes.
- Leitura prática nunca usa "mediana"/"percentil"/"quartil" no texto visível (só dentro do accordion Metodologia).
- Ações: exatamente 1 primária ("Gerar documento", cor accent) + 2 secundárias + "Mais opções" recolhido contendo o resto (custos, CND, copiar link, mapas).
- Comparáveis mostram a frase-conclusão ANTES da barra/estatística; "Ver metodologia" abre o `<details>` com a estatística completa.
- `<details>` de "Dados técnicos" e "Metodologia e fontes" ambos recolhidos por padrão, navegáveis por Tab/Enter/Space, foco visível (`outline:2px solid var(--accent)`).
- Zero regressão: `venalTxt(0)` → "não informado"; sheet mobile mantém grab/backlist/scroll; satélite sob `.detail`; guardas `a7a4646` intactas.
- Nenhuma cor fora da paleta declarada aparece em qualquer componente novo; `--gold` como texto sempre na variante escurecida `#7d621f`.
- Todo alvo de toque novo mede ≥44px em DevTools (mobile 375), incluindo o botão "Ver metodologia" dos comparáveis.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
