---
phase: 10
slug: acao-whatsapp-captacao-salvos
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-07
---

# Phase 10 — UI Design Contract

> Visual and interaction contract para a CAMADA DE AÇÃO: grupo "Copiar para WhatsApp" (5 textos) dentro de `#dActsMore`, botão "Salvar oportunidade" nas ações da ficha, bloco "Minhas oportunidades" + "Histórico" no painel Consulta (acima/abaixo do empty state), e Modo Captação (sheet com 4 textos + copiar individual). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** só os NOVOS componentes de ação/persistência. Zero token novo — 100% reuso do sistema cartográfico/oxide da Fase 8/9. Herda 1:1: paleta, tipografia, spacing, padrão de accordion (`.foot`/`.maisopcoes`), padrão de sheet (`.wiz`), padrão de toast, `esc()`/inline-onclick/SEARCHTOKEN. Refino visual global (respiro, skeleton animado, pinos) é Fase 13.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla, reuso de `.acts`/`.maisopcoes`/`.foot`/`.wiz`/`.toast`/`.empty`/`.chips` já existentes |
| Icon library | emoji textual (⭐ ✓ 📋 🧾 📞 ✅ 🕘 💬) — mesmo padrão já usado em `.cmpbtn`/`.laudobtn`/`.acts button`; NENHUM ícone SVG novo |
| Font | `"IBM Plex Sans"` (UI/copy/textos de WhatsApp/captação) + `"IBM Plex Mono"` (rótulos técnicos — `summary` de accordion, contador, timestamp) |

Identidade: cartográfica/oxide (papel + tinta + carimbo vermelho-óxido), herdada 1:1 das Fases 8/9. Bordas 1.5–2px sólidas, `border-radius:2px`. Nenhum componente novo introduz `border-radius` diferente de 2px (exceto onde o padrão herdado já usa pill — não é o caso nesta fase).

---

## Tokens Reusados (zero hex novo)

| Var CSS | Hex | Uso nesta fase |
|---------|-----|-----------------|
| `--paper` | `#e9e4d8` | fundo dos cards de "Minhas oportunidades"/"Histórico"; fundo dos blocos de texto no sheet de Captação |
| `--paper-2` | `#f2eee4` | fundo do container do sheet de Captação (`.wiz` já usa isso); fundo do `.detail` (herdado, inalterado) |
| `--ink` | `#141a1f` | texto principal; borda do botão "Salvar oportunidade" no estado NÃO salvo |
| `--line` | `#c3b9a3` | borda padrão dos cards de lista (Oportunidades/Histórico); divisor entre itens |
| `--muted` | `#57503f` | texto secundário — timestamp do Histórico, contador, disclaimer da Captação, texto "sem assinatura" |
| `--accent` | `#b5451f` | estado "Salva" do botão estrela (fundo sólido, é feedback de sucesso reversível — mesmo par cor/hover já aprovado); botão "Remover" no hover; foco de teclado (herdado) |
| `--accent-ink` | `#8f3116` | hover do estado "Salva"/"Remover" |
| `--lot` | `#2c5545` | ícone/borda de sucesso do toast "Copiado" (reuso do texto `.cmpbtn{color:var(--lot)}`) — **decisão**: toast em si usa o padrão `--ink`/`--paper-2` já existente (não reabrir cor no toast); `--lot` fica reservado a "salvo com sucesso" no ⭐ se o time quiser reforço visual sutil na borda do card salvo (opcional, ver Component 2) |
| `--gold` | `#a8842c` | não usado nesta fase (reservado a status de score — Fase 9) |

Nenhuma cor nova. O botão "Salvar oportunidade" reusa o MESMO padrão de estado do `.moderow button.on`/`.seg button.on` (toggle ativo = fundo escuro/accent, toggle inativo = borda + fundo papel) — é um toggle persistente, não uma cor de status nova.

---

## Spacing Scale

Reuso da escala já implícita no código (múltiplos de 4, alvo de toque 44px):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | gap entre ícone e rótulo nos botões de copiar; gap entre linha 1 (endereço) e linha 2 (faixa/score) do item de lista |
| sm | 8px | gap entre os 5 botões do grupo "Copiar para WhatsApp"; gap entre os 4 blocos da Captação; padding interno do item de lista compacta |
| md | 16px | padding do bloco "Minhas oportunidades"/"Histórico" (herdado `.detail{padding:16px 18px}`/`.results` já usa 16-18px); margem entre bloco Oportunidades e bloco Histórico |
| touch | **44px mínimo** | cada botão de copiar (WhatsApp ×5, Captação ×4); botão "Salvar oportunidade"; item de lista tocável (Oportunidades/Histórico); botão "Remover" (ícone × por item) |
| lg | 22px | padding do `.wbody` do sheet de Captação (herdado 1:1 de `.wiz .wbody{padding:4px 22px 20px}`) |

Exceções: nenhuma. Todo elemento novo herda o mínimo de 44px já padrão no app.

---

## Typography

Reuso total — nenhum tamanho/peso novo introduzido.

| Role | Size | Weight | Line Height | Onde já existe / reuso |
|------|------|--------|-------------|--------------------------|
| Heading do sheet (Captação) | 20px | 800 | 1.2 | `.wh1{font:800 20px/1.2}` já existente no wizard — reuso literal |
| Subheading (Captação) | 13px | 500 | 1.4 | `.wsub` já existente — reuso literal |
| Label de grupo ("Copiar para WhatsApp") | 10px | 600 | 1.4 | `.maisopcoes>summary{font:600 10px/1.4 "IBM Plex Mono"}` — mesmo estilo de rótulo de sub-secção dentro de "Mais opções" |
| Botão de ação (copiar/salvar) | 13–14px | 600 | 1 | `.acts button{font:600 13.5px/1}` já existente — reuso literal, sem variação |
| Item de lista — linha 1 (endereço/QL) | 13.5px | 700 | 1.25 | próximo de `.dtag{font:700 12px/1.2}` — um degrau acima por ser o dado principal do item |
| Item de lista — linha 2 (faixa · score · data) | 11.5px | 500 | 1.3 | próximo de `.dnote{font:500 10.5px/1.45}` |
| Contador ("3 salvas") | 11px | 700 | 1 | mono, mesmo peso/tamanho de `.badge{font:700 9-10px/1}` arredondado a 11px por ser texto e não badge de cor |
| Bloco de texto pronto (Captação, corpo) | 13.5px | 500 | 1.55 | `.dleitura p{font:500 13.5px/1.55}` (Fase 9) — mesma família de leitura de bloco |
| Disclaimer (Captação/assinatura ausente) | 10.5px | 500 | 1.45 | `.dnote{font:500 10.5px/1.45}` — reuso literal |

Sem novo weight (400/500/600/700/800 já cobrem tudo).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo dos cards de lista (Oportunidades/Histórico); fundo dos blocos de texto pronto na Captação |
| Secondary (30%) | `--paper-2` `#f2eee4` | fundo do container do sheet de Captação (`.wiz`, herdado); fundo do container `.detail` (inalterado) |
| Accent (10%) | `--accent` `#b5451f` | **reservado exclusivamente para**: (1) estado "Salva" do botão ⭐ (fundo sólido, feedback de que a ação foi persistida), (2) botão "Remover" da lista em hover/foco, (3) foco de teclado (`:focus-visible`, herdado global) — accent NUNCA aparece nos 5 botões de copiar WhatsApp nem nos 4 blocos de Captação (esses são ações neutras/repetíveis, não a ação primária da tela) |
| Status positivo (reforço opcional) | `--lot` `#2c5545` | não obrigatório nesta fase; se usado, só como borda fina do card já salvo na lista de Oportunidades (reforço visual de "isto está guardado"), nunca como único veículo de significado |
| Destructive | não aplicável nesta fase | "Remover oportunidade"/"remover item do Histórico" é reversível pela própria natureza da lista (não perde dados do imóvel, só a referência salva) — usa confirmação leve inline (ver Copywriting), não modal de confirmação com cor destrutiva nova. Nenhum hex destrutivo novo é introduzido; `--accent` já cobre o affordance de remoção (é o MESMO par cor/hover da ação primária, reuso, não introdução) |

**Regra de acessibilidade (herdada, travada nas Fases 8/9):** cor é sempre reforço, nunca único veículo de significado. Estado salvo/não-salvo do botão ⭐ é sempre acompanhado de rótulo textual ("Salvar oportunidade" ↔ "✓ Salva — remover?") — nunca só a cor de fundo.

**Contraste AA (herdado, mesma tabela das Fases 8/9):**
- `--muted #57503f` sobre `--paper`/`--paper-2` → ~7:1
- `--ink #141a1f` sobre `--paper`/`--paper-2` → >13:1
- `--accent #b5451f` sobre `--paper` (borda+texto, peso ≥600, ≥13px) → ~4.9:1, aprovado
- Botão "Salva" com fundo `--accent` e texto `#fff` → já é o par aprovado em `.acts button.primary` (Fase 9), reuso literal

---

## Componente 1 — Grupo "Copiar para WhatsApp" (ZAP-01)

**Localização:** dentro de `#dActsMore` (sub-secção do `<details class="maisopcoes">`), abaixo dos itens já existentes (custos/CND/copiar link/mapas). Sub-rótulo de grupo antes dos 5 botões, mesmo padrão tipográfico de um `summary` (mas não é um accordion próprio — é um rótulo estático dentro do já-aberto `maisopcoes`, para não exigir 2 cliques).

**HTML de referência:**

```html
<div class="zapgroup">
  <div class="zapgroup-lbl">Copiar para WhatsApp</div>
  <button type="button" class="zapbtn" onclick="copyZap('resumo')">💬 Resumo do imóvel ⧉</button>
  <button type="button" class="zapbtn" onclick="copyZap('proprietario')">🏠 Mensagem para o proprietário ⧉</button>
  <button type="button" class="zapbtn" onclick="copyZap('comprador')">🔑 Mensagem para o comprador ⧉</button>
  <button type="button" class="zapbtn" onclick="copyZap('preco')">💲 Argumento de preço ⧉</button>
  <button type="button" class="zapbtn" onclick="copyZap('riscos')">⚠️ Riscos e ressalvas ⧉</button>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.zapgroup` | `display:flex; flex-direction:column; gap:8px; margin-top:12px; padding-top:12px; border-top:1px dashed var(--line)` | separador tracejado — mesmo padrão já usado em `.search{border-bottom:1px dashed var(--line)}` — indica "sub-grupo dentro de Mais opções", não elemento novo solto |
| `.zapgroup-lbl` | `font:600 10px/1.4 "IBM Plex Mono"; letter-spacing:.07em; text-transform:uppercase; color:var(--muted)` | idêntico ao `.maisopcoes>summary` (sem o marcador ▸, pois não abre/fecha — é rótulo estático) |
| `.zapbtn` | `width:100%; min-height:44px; border:1.5px solid var(--line); background:var(--paper); color:var(--ink); font:600 13.5px/1 "IBM Plex Sans"; border-radius:2px; text-align:left; padding:0 14px; display:flex; align-items:center; gap:8px` | reuso do padrão `.acts button` (borda+papel, não accent) — todos os 5 são ações NEUTRAS repetíveis (não é "a" ação da tela) |
| `.zapbtn:hover/:focus-visible` | `border-color:var(--ink)` (hover), `outline:2px solid var(--accent)` (foco, herdado global) | consistente com `.acts button:hover` |
| `.zapbtn:active` (feedback de clique) | sem mudança de cor obrigatória — o toast É o feedback; se motion permitir, opcional `transform:scale(.98)` respeitando `prefers-reduced-motion` | evita introduzir feedback duplicado (cor + toast); toast é a fonte única de confirmação |

**Comportamento:**
- Cada botão chama `copyZap(tipo)` → monta o texto via template determinístico (ver Copywriting Contract) → `navigator.clipboard.writeText()` com fallback (padrão `copyInsc`/`copyLink` já existente) → `toast(...)` de confirmação específica por tipo.
- 44px de altura cada, empilhados verticalmente (nunca grid 2 colunas — em 375px de sheet, largura útil ~339px não comporta 2 botões de texto longo lado a lado com leitura confortável).
- Ordem fixa: resumo → proprietário → comprador → preço → riscos (do mais geral ao mais específico).

**Toasts de confirmação (1 por tipo, nunca genérico "Copiado"):**

| Tipo | Toast |
|------|-------|
| Resumo | "Resumo copiado — cole no WhatsApp." |
| Proprietário | "Mensagem para o proprietário copiada — cole no WhatsApp." |
| Comprador | "Mensagem para o comprador copiada — cole no WhatsApp." |
| Argumento de preço | "Argumento de preço copiado — cole no WhatsApp." |
| Riscos e ressalvas | "Texto de riscos e ressalvas copiado — cole no WhatsApp." |
| Falha de clipboard (qualquer tipo) | "Não foi possível copiar — tente selecionar o texto manualmente." (reuso do padrão de falha já usado em `copyLink`) |

---

## Componente 2 — Botão "Salvar oportunidade" (SALV-01)

**Localização:** entra em `#dActsPrim` como a 3ª posição (a Lei da Tela da Fase 9 permite até 2 secundárias visíveis + "Mais opções" — aqui o CONTEXT.md marca "Salvar oportunidade" como secundária adicional). **Decisão de discrição do UI-SPEC:** para não violar o limite "1 primária + até 2 secundárias visíveis" da Fase 9, "Salvar oportunidade" SUBSTITUI a posição de "Copiar inscrição" nas ações visíveis, e "Copiar inscrição" desce para `#dActsMore`. Ordem final de `#dActsPrim`: **Gerar documento (primária) · Ver comparáveis (secundária 1) · ⭐ Salvar oportunidade (secundária 2)**.

**HTML de referência — estado NÃO salvo:**

```html
<button type="button" class="acts-save" onclick="toggleOportunidade()" aria-pressed="false">⭐ Salvar oportunidade</button>
```

**HTML de referência — estado SALVO:**

```html
<button type="button" class="acts-save is-saved" onclick="toggleOportunidade()" aria-pressed="true">✓ Salva — remover?</button>
```

| Estado | Estilo | Regra |
|--------|--------|-------|
| Não salvo | `border:1.5px solid var(--ink); background:var(--paper); color:var(--ink)` — mesmo padrão de `.acts button` secundário | idêntico visualmente às outras secundárias, sem destaque de cor — é uma ação disponível, não urgente |
| Salvo | `border:1.5px solid var(--accent); background:var(--accent); color:#fff` — mesmo par de `.acts button.primary` | reuso do padrão accent já aprovado; comunica "isto está ativo/persistido" — mesma linguagem visual do `.moderow button.on` (toggle ativo) |
| Salvo — hover/foco | `background:var(--accent-ink)` | par hover já estabelecido |
| `aria-pressed` | `"false"`/`"true"` sincronizado com o estado | é um toggle, não uma navegação — `aria-pressed` é o padrão ARIA correto (não `aria-expanded`) |
| Toque ≥44px | herdado de `.acts button` | sem exceção |

**Comportamento:**
- `toggleOportunidade()`: se a inscrição/ci do imóvel atual NÃO está em `radar_oportunidades` → adiciona (allowlist de campos, ver Persistência) → toast "Oportunidade salva." → botão muda para estado salvo.
- Se JÁ está salva → remove direto (sem modal de confirmação — o próprio rótulo "✓ Salva — remover?" já é a pergunta, clicar de novo é a resposta) → toast "Oportunidade removida." → botão volta ao estado não-salvo.
- Falha de escrita em localStorage (quota cheia/indisponível): toast "Não foi possível salvar — armazenamento do navegador indisponível ou cheio." — botão NÃO muda de estado (a UI nunca mostra "salvo" se a escrita falhou).
- Estado é recalculado a cada abertura de ficha (`abrirDetail`), lendo `radar_oportunidades` — reabrir o app dias depois mostra o mesmo estado salvo.

---

## Componente 3 — "Minhas oportunidades" + "Histórico" no painel Consulta (SALV-01)

**Localização:** dentro de `#results`, como blocos irmãos do `#emptyState` — aparecem SEMPRE que houver ao menos 1 item salvo/histórico, independentemente do estado da busca (acima do empty state quando a busca está vazia; abaixo dos resultados quando há resultados — ver regra de posição abaixo). Não quebram os `#exampleChips` já existentes (Fase 8).

**Regra de posição (lei da tela aplicada ao painel Consulta):**
- Busca vazia (`#emptyState` visível): bloco "Minhas oportunidades" aparece ACIMA do `#emptyState`; bloco "Histórico" aparece ABAIXO do `#emptyState` (depois dos chips de exemplo) — Oportunidades é a ação de maior intenção do usuário, fica mais perto do topo; Histórico é acessório/automático, fica mais discreto e mais abaixo.
- Busca com resultados: ambos os blocos ficam ocultos (a lista de resultados tem prioridade visual — reabrir Oportunidades/Histórico é 1 clique de "limpar busca").

**HTML de referência — bloco Oportunidades:**

```html
<div class="savedblock" id="oportunidadesBlock">
  <div class="savedblock-head">
    <span class="savedblock-tt">⭐ Minhas oportunidades</span>
    <span class="savedblock-count" id="oportunidadesCount">3</span>
  </div>
  <div class="savedlist" id="oportunidadesList">
    <div class="saveditem" onclick="abrirOportunidade('3020150346')">
      <div class="saveditem-main">
        <div class="saveditem-addr">Rua Portugal, 582 — Setor Bueno</div>
        <div class="saveditem-meta">Q 45 · L 12 · faixa R$ 690mil–780mil · oportunidade: boa · salva em 05/07</div>
      </div>
      <button type="button" class="saveditem-rm" onclick="event.stopPropagation();removerOportunidade('3020150346')" aria-label="Remover esta oportunidade">×</button>
    </div>
    <!-- ...mais itens... -->
  </div>
</div>
```

**HTML de referência — bloco Histórico (visual mais discreto):**

```html
<div class="savedblock savedblock-hist" id="historicoBlock">
  <div class="savedblock-head">
    <span class="savedblock-tt">🕘 Histórico</span>
    <span class="savedblock-count" id="historicoCount">12</span>
  </div>
  <div class="savedlist savedlist-hist" id="historicoList">
    <div class="saveditem saveditem-hist" onclick="abrirOportunidade('3020150346')">
      <div class="saveditem-main">
        <div class="saveditem-addr">Rua Portugal, 582 — Setor Bueno</div>
        <div class="saveditem-meta">consultado hoje às 14:32</div>
      </div>
    </div>
  </div>
</div>
```

| Elemento | Estilo | Regra |
|----------|--------|-------|
| `.savedblock` | `background:var(--paper); border:1.5px solid var(--line); border-radius:2px; padding:12px 14px; margin:0 0 14px` | reuso do padrão de card já usado (`.dvalor`/`.cmp`), sem sombra nova |
| `.savedblock-head` | `display:flex; justify-content:space-between; align-items:center; margin-bottom:8px` | título + contador na mesma linha |
| `.savedblock-tt` | `font:700 13px/1.2 "IBM Plex Sans"; color:var(--ink)` | igual peso/tamanho de `.dtag`-like label, sem introduzir novo par |
| `.savedblock-count` | `font:700 11px/1 "IBM Plex Mono"; color:var(--muted); background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:3px 7px; min-width:20px; text-align:center` | contador textual — número sempre visível, nunca só um badge de cor sem número |
| `.saveditem` | `display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:44px; padding:8px 4px; border-top:1px solid var(--line); cursor:pointer` (primeiro item sem `border-top`) | tocável no todo (exceto o × de remover) |
| `.saveditem-addr` | `font:700 13.5px/1.25 "IBM Plex Sans"; color:var(--ink)` | dado principal do item |
| `.saveditem-meta` | `font:500 11.5px/1.3 "IBM Plex Sans"; color:var(--muted)` | endereço/QL · faixa · score · data (Oportunidades) OU só "consultado {quando}" (Histórico) |
| `.saveditem-rm` | `width:32px; height:32px; border:0; background:transparent; color:var(--muted); font-size:18px; cursor:pointer` — alvo de toque real é 44px via padding do `.saveditem` pai, ícone visual pode ser menor (32px) desde que a área clicável do botão tenha `min-width:44px;min-height:44px` | reuso do padrão `.wback`/`.x`(`.shead .x`) já usado como botão de fechar |
| `.saveditem-rm:hover/:focus-visible` | `color:var(--accent)` | remoção é affordance leve, accent só aparece no hover/foco, nunca em repouso |
| `.savedblock-hist` (Histórico) | mesma estrutura, mas `.saveditem-hist .saveditem-addr{font-weight:600}` (700→600, um degrau mais discreto) e SEM botão de remover individual visível por item (ver Copywriting — Histórico é auto-gerenciado pelo cap FIFO, sem ação manual de remover item a item; ação disponível é só "Limpar histórico" — ver abaixo) | "visual mais discreto que Oportunidades" (requisito explícito do prompt) — mesmo componente, peso tipográfico reduzido e sem ação de remoção por item |
| Ação "Limpar histórico" | link textual pequeno no `.savedblock-head` do Histórico: `<button class="savedblock-clear" onclick="limparHistorico()">Limpar</button>` — `font:600 11px/1; color:var(--muted); background:transparent; border:0; text-decoration:underline; min-height:32px` (ação de baixa frequência, aceitável abaixo de 44px por ser texto sublinhado dentro do cabeçalho compacto — ver nota de a11y) | ação de manutenção do histórico inteiro, não por item |

**Comportamento:**
- Tocar em qualquer `.saveditem` (exceto o × ou o link "Limpar") reabre a ficha via o MESMO caminho de deep-link `?insc=` já existente (reuso, `abrirOportunidade(insc)` chama a função de abertura de ficha existente passando a inscrição — não duplica lógica de busca).
- `.saveditem-rm` remove só aquele item de Oportunidades (com toast "Oportunidade removida.").
- Histórico entra automaticamente ao abrir qualquer ficha (`abrirDetail`), sem ação do usuário — cap 30 itens, FIFO (o mais antigo cai quando o 31º entra).
- Contador (`#oportunidadesCount`/`#historicoCount`) sempre reflete o `.length` do array em localStorage, recalculado a cada render do painel Consulta.

---

## Componente 4 — Estado vazio de Oportunidades

**Regra:** se `radar_oportunidades` está vazio, o bloco `.savedblock` de Oportunidades NÃO desaparece silenciosamente — aparece com uma mensagem curta de orientação (reforça a descoberta da funcionalidade), enquanto o Histórico (que é automático) só aparece quando tem pelo menos 1 item (sem mensagem vazia — não teve consulta ainda, não há nada para anunciar).

```html
<div class="savedblock" id="oportunidadesBlock">
  <div class="savedblock-head"><span class="savedblock-tt">⭐ Minhas oportunidades</span></div>
  <div class="savedempty">Nenhuma oportunidade salva ainda — toque ⭐ numa ficha.</div>
</div>
```

| Elemento | Estilo |
|----------|--------|
| `.savedempty` | `font:500 12.5px/1.5 "IBM Plex Sans"; color:var(--muted); padding:6px 2px` |

Regra travada: este é o ÚNICO estado vazio do Componente 3 — o bloco Oportunidades sempre existe no DOM (com item OU com esta mensagem); o bloco Histórico só existe no DOM quando `radar_historico.length>0`.

---

## Componente 5 — Modo Captação (CAPT-01)

**Localização:** ação "Captar este imóvel" entra em `#dActsMore` (Mais opções), abaixo do grupo "Copiar para WhatsApp" (novo separador tracejado, mesmo padrão do Componente 1). Abre um SHEET reusando 1:1 o padrão visual/estrutural do wizard de laudo (`.wiz`) — mas SEM os steps/dots (é conteúdo único, não wizard sequencial).

**HTML de referência — botão de entrada (dentro de `#dActsMore`):**

```html
<button type="button" onclick="abrirCaptacao()">🧾 Captar este imóvel</button>
```

**HTML de referência — sheet (`#captSheet`, estrutura paralela a `#wiz`):**

```html
<div class="wiz" id="captSheet" hidden role="dialog" aria-modal="true" aria-label="Modo captação">
  <div class="whead">
    <button class="wclose" onclick="fecharCaptacao()" aria-label="Fechar">×</button>
    <div class="wh1" style="margin:0">Modo captação</div>
    <span style="width:44px"></span>
  </div>
  <div class="wbody" id="captBody">
    <p class="wsub">Textos prontos para captar este imóvel — copie e ajuste o que precisar.</p>

    <div class="captblock">
      <div class="captblock-lbl">💬 Abordagem por WhatsApp</div>
      <div class="captblock-txt" id="captZap"></div>
      <button type="button" class="captcopy" onclick="copyCapt('zap')">Copiar ⧉</button>
    </div>

    <div class="captblock">
      <div class="captblock-lbl">📞 Script de ligação</div>
      <div class="captblock-txt" id="captLig"></div>
      <button type="button" class="captcopy" onclick="copyCapt('ligacao')">Copiar ⧉</button>
    </div>

    <div class="captblock">
      <div class="captblock-lbl">📋 Checklist documental</div>
      <div class="captblock-txt" id="captDoc"></div>
      <button type="button" class="captcopy" onclick="copyCapt('checklist')">Copiar ⧉</button>
    </div>

    <div class="captblock">
      <div class="captblock-lbl">✅ Tarefa de follow-up</div>
      <div class="captblock-txt" id="captFollow"></div>
      <button type="button" class="captcopy" onclick="copyCapt('followup')">Copiar ⧉</button>
    </div>

    <div class="captdisclaimer">Textos gerados automaticamente a partir dos dados do imóvel — revise antes de enviar. Não substituem orientação jurídica.</div>
  </div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `#captSheet` (container) | reuso EXATO de `.wiz{position:fixed;inset:0;z-index:2000;background:var(--paper-2);display:flex;flex-direction:column}` | mesmo sheet full-screen do laudo — consistência de "abrir uma ferramenta a partir da ficha" |
| `.whead` (cabeçalho) | reuso de `.whead` do wizard, mas SEM `.wdots` (não há steps) — só `.wclose` (44px) + título `.wh1` centralizado + spacer de 44px pra manter o título centrado | evita introduzir CSS novo de cabeçalho — reuso com 1 item omitido (dots) |
| `.wbody` (`#captBody`) | reuso 1:1 de `.wbody{flex:1;overflow-y:auto;padding:4px 22px 20px;width:100%;max-width:560px;margin:0 auto}` | mesma largura de leitura confortável do wizard |
| `.captblock` | `background:var(--paper); border:1.5px solid var(--line); border-radius:2px; padding:12px 14px; margin-bottom:14px` | mesmo padrão de card já usado (`.dvalor`/`.savedblock`) |
| `.captblock-lbl` | `font:700 12px/1.2 "IBM Plex Sans"; color:var(--ink); margin-bottom:6px; display:block` | rótulo do bloco, peso consistente com `.wlabel` (herdado) |
| `.captblock-txt` | `font:500 13.5px/1.55 "IBM Plex Sans"; color:var(--ink); white-space:pre-wrap; margin-bottom:10px` | mesma família de leitura de bloco da Fase 9 (`.dleitura`); `pre-wrap` preserva quebras de linha do texto pronto (script de ligação tem passos) |
| `.captcopy` | `min-height:44px; width:100%; border:1.5px solid var(--ink); background:var(--paper-2); color:var(--ink); font:600 13px/1; border-radius:2px` | reuso do padrão de botão secundário — cada bloco tem SEU botão de copiar individual (requisito explícito) |
| `.captdisclaimer` | `font:500 10.5px/1.45 "IBM Plex Sans"; color:var(--muted); margin-top:4px; padding-top:10px; border-top:1px dashed var(--line)` | reuso do padrão `.dnote`/disclaimer já estabelecido na Fase 9 |

**Comportamento:**
- `abrirCaptacao()`: gera os 4 textos (templates determinísticos a partir de `DCUR` — dados da ficha atual + leitura/scores da Fase 9), popula os 4 `.captblock-txt`, abre o sheet com a MESMA animação de entrada do `.wiz` (fade/spring conforme motion já implementado, respeitando `REDUCE`).
- Cada `.captcopy` copia SÓ o texto do seu próprio bloco (não existe "copiar tudo") — `copyCapt(tipo)` → clipboard com fallback → toast individual.
- `fecharCaptacao()`: reuso do padrão `fecharLaudo()` (devolve foco ao elemento que abriu, `WIZRET`-like).
- Sheet reusa `esc()` em qualquer interpolação de dado do imóvel (endereço, bairro, valor) — nenhum texto entra sem escaping.

**Toasts de confirmação:**

| Bloco | Toast |
|-------|-------|
| Abordagem WhatsApp | "Abordagem copiada — cole no WhatsApp." |
| Script de ligação | "Script de ligação copiado." |
| Checklist documental | "Checklist copiado." |
| Tarefa de follow-up | "Tarefa de follow-up copiada." |

---

## Estados Transversais

| Estado | Comportamento visual | Regra |
|--------|----------------------|-------|
| **Perfil ausente** (`radar_prof` sem nome/CRECI) | Mensagens de WhatsApp/Captação terminam SEM linha de assinatura — o template simplesmente omite o bloco final "— Nome, CRECI ####" | NUNCA usa placeholder tipo "[seu nome]"/"[CRECI]" no texto copiado (decisão travada em CONTEXT.md) — a ausência é silenciosa no TEXTO copiado, mas o botão "Salvar oportunidade"/copiar não avisa sobre isso proativamente (evita ruído); se o executor quiser reforçar descoberta, pode adicionar 1 nota discreta dentro do sheet de Captação: "Textos sem assinatura — complete seu perfil no wizard de documento para assinar automaticamente." em `.captdisclaimer`, mas isso é discrição de implementação, não obrigação deste contrato |
| **localStorage cheio/indisponível** (qualquer escrita: `radar_oportunidades`, `radar_historico`, `radar_prof`) | Toast de falha específico, NUNCA silencioso | "Não foi possível salvar — armazenamento do navegador indisponível ou cheio." — a UI que dependia da escrita (botão ⭐, entrada no Histórico) permanece no estado ANTERIOR à tentativa (nunca finge sucesso) |
| **Lista de Oportunidades vazia** | Ver Componente 4 | "Nenhuma oportunidade salva ainda — toque ⭐ numa ficha." |
| **Lista de Histórico vazia** | Bloco inteiro ausente do DOM (não renderiza `.savedblock-hist`) | Histórico é 100% automático — não tem "ainda não" que precise virar CTA (o usuário não precisa ser instruído a "ir consultar"; a busca já é a tela principal) |
| **Copiar sem `navigator.clipboard`** (browser antigo/contexto não-seguro) | Fallback já existente no padrão `copyInsc`/`copyLink` (execCommand ou seleção manual) — se mesmo assim falhar, toast de falha (ver Componente 1) | reuso do fallback, sem novo código de clipboard |
| **Item de Histórico/Oportunidades aponta para imóvel que já não existe/mudou de inscrição** (caso raro, dado externo mudou) | O deep-link `?insc=` tenta reabrir; se a consulta falhar, cai no tratamento de erro já existente da busca (Fase 8: "Sem resultado" com próximo passo) | reuso do tratamento de erro da busca, sem novo componente de erro |

---

## Persistência (localStorage) — SALV-01

| Chave | Conteúdo | Regra |
|-------|----------|-------|
| `radar_oportunidades` | Array de objetos: `{insc, endereco, bairro, quadra, lote, areaTerr, areaEdif, vlvenal, faixaLo, faixaHi, scoreOportunidade, scoreConfianca, savedAt}` | Allowlist travada em CONTEXT.md — NUNCA `dtnascimen`/nome de terceiro/qualquer PII de titular. Ação explícita (botão ⭐). Sem cap de tamanho declarado nesta fase (planner decide se cap é necessário; não é requisito de UI). |
| `radar_historico` | Array de objetos: mesma allowlist + `visitedAt` (sem `savedAt`) | Automático, cap 30 itens FIFO. Entra ao abrir qualquer ficha (`abrirDetail`), sem ação do usuário. |
| `radar_prof` (já existe, Fase 9/wizard) | `{nome, creci, contato}` | Reuso de leitura — Fase 10 não altera a escrita, só LÊ para assinatura de WhatsApp/Captação quando presente. |

Toda leitura usa `try/catch` silencioso (padrão já estabelecido); toda ESCRITA que falhar produz toast visível (nunca silencioso) — esta é a única mudança de comportamento vs. o padrão herdado (`radar_prof` hoje falha silenciosamente na escrita; Fase 10 não exige retrofit do `radar_prof`, mas as chaves NOVAS desta fase seguem a regra de toast visível).

---

## Mobile 375 × Desktop 1280

| Aspecto | Mobile (≤820px) | Desktop (≥821px) |
|---------|-------------------|----------------------|
| Grupo "Copiar para WhatsApp" | 5 botões empilhados, largura total do `#dActsMore` (~339px úteis) | idêntico — mesma largura de coluna, sheet/card mais largo mas o grupo continua em coluna única (texto de botão é longo, 2 colunas quebraria a leitura) |
| Botão "Salvar oportunidade" | entra na linha de `#dActsPrim` (`flex-wrap:wrap`), pode quebrar para 2ª linha junto com "Ver comparáveis" em telas muito estreitas (herdado do padrão Fase 9) | 3 botões numa linha só |
| Bloco Oportunidades/Histórico no painel Consulta | ocupam a largura total do painel (`.panel`/`.results`, mobile é tela cheia quando `setView('busca')`) | ocupam a largura fixa do `.panel` (~360-400px, herdado) |
| Sheet de Captação (`#captSheet`) | full-screen (`inset:0`), mesmo comportamento do `.wiz` no laudo | full-screen também (herdado — o wizard de laudo já é full-screen em desktop, não é um modal pequeno) |
| `.captblock` | largura total do `.wbody` (max-width:560px) | idêntico — `.wbody` já centraliza com max-width em telas largas |
| Scroll | `.wbody{overflow-y:auto}` cobre os 4 blocos + disclaimer sem exigir novo mecanismo | idêntico |

---

## Acessibilidade / Motion (obrigatório)

- **Contraste AA**: todas as combinações reusam pares já aprovados nas Fases 8/9 (ver tabela em Color) — nenhuma combinação nova introduzida.
- **`prefers-reduced-motion`**: abertura do `#captSheet` reusa a MESMA lógica condicional de `REDUCE` já aplicada em `.wiz`/`.detail` (spring mobile / fade desktop quando motion permitido; snap/instant quando `REDUCE`). Toast de confirmação não anima além do fade já existente (herdado, `REDUCE`-aware). Nenhuma transição nova é introduzida pelos botões de copiar/salvar (mudança de estado do ⭐ é *snap* — troca de classe, sem transição customizada).
- **Botões reais**: todo elemento tocável novo é `<button type="button">` com `onclick` inline (nunca `<div onclick>`) — Componente 1 (5 botões zap), Componente 2 (⭐), Componente 3 (`.saveditem` é `<div onclick>` mas o CONTEÚDO tocável primário — decisão: envolver `.saveditem` num wrapper `<button class="saveditem" ...>` OU manter div+role. **Regra travada:** usar `<button class="saveditem">` real (não div) para navegação/ativação por teclado nativa, com o × de remover como `<button>` filho independente dentro (nested button é inválido em HTML — portanto: `.saveditem` é um `<div>` com `role="button" tabindex="0"` E handler de `keydown` para Enter/Space, OU — preferível — o item principal é um `<button>` cobrindo endereço+meta, e o × de remover fica um `<button>` IRMÃO logo depois, ambos dentro de um `<li>`/`<div class="saveditem-row">` sem nesting. Ver nota de implementação abaixo.
- **Nota de implementação (estrutura sem nested button):**
  ```html
  <div class="saveditem-row">
    <button type="button" class="saveditem" onclick="abrirOportunidade('...')">
      <span class="saveditem-addr">...</span>
      <span class="saveditem-meta">...</span>
    </button>
    <button type="button" class="saveditem-rm" onclick="removerOportunidade('...')" aria-label="Remover esta oportunidade">×</button>
  </div>
  ```
  Isso evita `<button>` dentro de `<button>` (inválido) mantendo os dois alvos ≥44px e navegáveis por Tab nativamente.
- **`aria-pressed`**: botão "Salvar oportunidade" usa `aria-pressed="true|false"` sincronizado (toggle semântico correto — não é `aria-expanded`, pois não expande conteúdo).
- **`aria-label`**: botão de remover item (`.saveditem-rm`) sempre tem `aria-label="Remover esta oportunidade"` (o "×" visual não é suficiente para leitor de tela).
- **Foco ao abrir/fechar sheet de Captação**: reuso do padrão `WIZRET`/foco devolvido ao elemento que abriu, já implementado em `abrirLaudo()`/`fecharLaudo()` — `abrirCaptacao()`/`fecharCaptacao()` seguem o MESMO contrato.
- **`esc()` obrigatório**: qualquer interpolação de dado do imóvel (endereço, bairro, valor, inscrição) nos templates de WhatsApp/Captação/lista de Oportunidades passa por `esc()` antes de entrar no DOM — mesmo contrato IN-01 de toda a Fase 8/9.
- **SEARCHTOKEN**: não aplicável a esta fase (nenhum novo caminho de busca é introduzido); reabertura via `?insc=` reusa o mecanismo de deep-link já coberto pelo `SEARCHTOKEN` da Fase 8.
- **Zero regressão**: `#dActsPrim`/`#dActsMore` continuam dentro do limite "1 primária + até 2 secundárias visíveis + Mais opções" (Fase 9) — a entrada de "Salvar oportunidade" substitui "Copiar inscrição" nas visíveis (que desce para Mais opções), não adiciona uma 3ª secundária solta.

---

## Copywriting Contract

Tom herdado do Plano UX §13 — corretor profissional: claro, honesto, sem promessa absoluta ("faixa estimada", "recomendo confirmar"). Todos os templates abaixo têm ESQUELETO fixo; o preenchimento com dados reais da ficha é responsabilidade da implementação (planner/executor), mas a estrutura/tom está travada aqui.

| Element | Copy / Esqueleto |
|---------|------|
| **Resumo do imóvel** (esqueleto) | "[Tipo do imóvel] no [bairro]. [1-2 frases da leitura prática, reuso do template LEIT-01 da Fase 9]. Faixa estimada: [valor lo]–[valor hi]. [Assinatura, se houver]." |
| **Mensagem para o proprietário** (esqueleto) | "Olá! Encontrei seu imóvel no [bairro] no Radar e, pela análise cadastral e comparáveis da região, a faixa de valor fica entre [lo] e [hi]. [1 frase sobre a oportunidade/mercado local]. Recomendo confirmar [pendências do score de confiança, se houver] para uma avaliação mais precisa. Podemos conversar? [Assinatura, se houver]." |
| **Mensagem para o comprador** (esqueleto) | "Encontrei esse imóvel no [bairro]. Pela análise cadastral e pelos comparáveis próximos, a faixa estimada fica entre [lo] e [hi]. [1 frase sobre liquidez/região — reuso do padrão de leitura prática]. Recomendo confirmar [área privativa/estado de conservação/documentação] antes de avançar. [Assinatura, se houver]." — exemplo-canônico §13 do Plano UX, reuso literal da estrutura |
| **Argumento de preço** (esqueleto) | "Sobre o valor: este imóvel está [X% acima/abaixo] da mediana dos comparáveis na região (raio de até 800 m). [1 frase justificando com o score de oportunidade]. Isso [reforça/pondera] o valor pedido. [Assinatura, se houver]." |
| **Riscos e ressalvas** (esqueleto) | "Alguns pontos para confirmar antes de avançar: [lista com base na confiança/pendências — área privativa, estado de conservação, documentação, número de comparáveis]. Esta é uma faixa estimada, não uma avaliação oficial — recomendo confirmar esses pontos antes de qualquer decisão. [Assinatura, se houver]." |
| **Toast de cada copiar WhatsApp** | ver tabela do Componente 1 |
| **Botão "Salvar oportunidade"** (não salvo) | "⭐ Salvar oportunidade" |
| **Botão "Salvar oportunidade"** (salvo) | "✓ Salva — remover?" |
| **Toast — salvar** | "Oportunidade salva." |
| **Toast — remover** | "Oportunidade removida." |
| **Toast — falha de escrita** | "Não foi possível salvar — armazenamento do navegador indisponível ou cheio." |
| **Título do bloco Oportunidades** | "⭐ Minhas oportunidades" |
| **Estado vazio Oportunidades** | "Nenhuma oportunidade salva ainda — toque ⭐ numa ficha." |
| **Título do bloco Histórico** | "🕘 Histórico" |
| **Ação "Limpar histórico"** | "Limpar" (link textual no cabeçalho do bloco) |
| **Meta de item Oportunidades** (esqueleto) | "[Q · L · bairro] · faixa [lo]–[hi] · oportunidade: [rótulo do score] · salva em [data]" |
| **Meta de item Histórico** (esqueleto) | "consultado [hoje às HH:MM / em DD/MM]" |
| **Botão entrada Captação** | "🧾 Captar este imóvel" |
| **Título do sheet Captação** | "Modo captação" |
| **Subtítulo do sheet Captação** | "Textos prontos para captar este imóvel — copie e ajuste o que precisar." |
| **Bloco 1 — Abordagem WhatsApp** (esqueleto) | "Olá! Sou corretor(a) e trabalho com imóveis no [bairro]. Notei seu imóvel na [endereço/quadra-lote] e gostaria de conversar sobre uma possível parceria para venda — sem compromisso. Tem 5 minutos para eu explicar? [Assinatura, se houver]." |
| **Bloco 2 — Script de ligação** (esqueleto, com passos) | "1. Se apresente e explique o motivo da ligação (imóvel no [bairro]).\n2. Pergunte se o proprietário já pensou em vender ou tem interesse em uma avaliação gratuita.\n3. Se houver interesse, agende uma visita ou envie a faixa estimada por WhatsApp.\n4. Encerre agradecendo o tempo, mesmo se a resposta for negativa." |
| **Bloco 3 — Checklist documental** (esqueleto) | "• Matrícula/RGI atualizada (últimos 30 dias)\n• IPTU do ano em dia + CND municipal\n• Certidões pessoais do(s) vendedor(es) (nada consta cível/criminal/protesto)\n• Convenção e ata de condomínio, se aplicável\n• Documento de identidade e CPF do(s) proprietário(s)" |
| **Bloco 4 — Tarefa de follow-up** (esqueleto) | "Follow-up: retornar contato com [proprietário/interessado] do imóvel na [endereço] em até 3 dias úteis para confirmar interesse na captação." |
| **Disclaimer do sheet Captação** | "Textos gerados automaticamente a partir dos dados do imóvel — revise antes de enviar. Não substituem orientação jurídica." |
| **Toast — copiar bloco Captação** | ver tabela do Componente 5 |
| **Destrutivo nesta fase** | Remover 1 item de Oportunidades (reversível, sem modal — o próprio botão "✓ Salva — remover?" já expressa a pergunta); "Limpar histórico" (reversível na prática — histórico se repopula ao consultar de novo; sem modal, ação de baixa frequência) |

Todo texto acima é pt-BR sem jargão na 1ª camada, verbo de ação nos botões, sem caixa alta em bloco longo, sem gíria/ironia, sem promessa absoluta ("faixa estimada", "recomendo confirmar") — alinhado ao gate de linguagem da Fase 14 (esta fase antecipa o padrão, não substitui o gate final). Nenhum placeholder tipo "[seu nome]" chega ao texto copiado — a variável de assinatura é OMITIDA (não substituída por marcador) quando `radar_prof` está vazio.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

Nenhum registry de componentes é usado neste projeto — app HTML único, sem build. Gate de registry não se aplica.

---

## Fora de Escopo (não tocar nesta fase)

- Documentos em 3 níveis / minutas de negociação (Fases 11/11.1) — "Gerar documento" continua abrindo o wizard atual.
- Refino visual global, skeleton animado, pinos semânticos, motion coreografado de busca (Fase 13).
- Compartilhar via Web Share API (deferido, CONTEXT.md).
- Alertas/notificação de follow-up, sincronização entre dispositivos (deferido v2.2+, CONTEXT.md).
- Salvar em lote a partir da lista/CSV (CONTEXT.md: ACAO-01 cobre só por imóvel nesta fase).
- Nenhuma cor fora de `--paper/--paper-2/--ink/--line/--muted/--accent/--accent-ink/--lot/--gold` aparece em qualquer componente novo.

---

## Verificação (preview, mobile 375 + desktop 1280)

- `#dActsPrim` mostra exatamente 3 botões: "Gerar documento" (primária, accent) · "Ver comparáveis" · "⭐ Salvar oportunidade" — nunca mais que isso visível fora de "Mais opções".
- Dentro de "Mais opções": "Copiar inscrição" voltou a aparecer (desceu), seguido pelos itens já existentes (custos/CND/copiar link/mapas), seguido do separador tracejado + grupo "Copiar para WhatsApp" (5 botões) + separador + "Captar este imóvel".
- Clicar em cada um dos 5 botões de WhatsApp produz um toast ESPECÍFICO (não um genérico "Copiado") e o texto copiado (verificar via colar em campo de teste) NUNCA contém "[seu nome]"/"[CRECI]" quando `radar_prof` está vazio — a linha de assinatura simplesmente não aparece.
- Clicar em "⭐ Salvar oportunidade" muda o rótulo/cor para "✓ Salva — remover?" (accent) e o item aparece imediatamente no bloco "Minhas oportunidades" do painel Consulta (sem precisar recarregar).
- Reabrir o app (nova sessão) com pelo menos 1 oportunidade salva mostra o item preservado.
- Simular localStorage cheio (DevTools) e tentar salvar produz toast de falha visível — o botão NÃO muda para estado "Salva".
- Bloco "Minhas oportunidades" vazio mostra a mensagem "Nenhuma oportunidade salva ainda — toque ⭐ numa ficha." (nunca desaparece).
- Bloco "Histórico" só aparece após consultar ao menos 1 ficha; visual (peso 600 vs 700, sem botão de remover por item) claramente mais discreto que Oportunidades.
- Tocar num item de Oportunidades/Histórico reabre a MESMA ficha (via `?insc=`), sem novo carregamento de busca visível.
- "Captar este imóvel" abre sheet full-screen com 4 blocos de texto, cada um com botão "Copiar" próprio, e o disclaimer fixo no fim — cada cópia produz toast específico.
- Nenhum elemento tocável novo mede menos de 44px em DevTools (mobile 375), incluindo o botão de remover (área clicável, não o glifo visual).
- `prefers-reduced-motion` ativo: sheet de Captação abre sem spring/fade coreografado (snap), toast sem transição adicional.
- Nenhuma cor fora da paleta declarada aparece em qualquer componente novo.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
