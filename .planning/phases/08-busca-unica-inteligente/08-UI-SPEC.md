---
phase: 8
slug: busca-unica-inteligente
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-07
---

# Phase 8 — UI Design Contract

> Visual and interaction contract for a caixa única inteligente que substitui a moderow (3 botões + link "Inscrição") como experiência padrão de busca. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** só a busca (BUSCA-01..14). Ficha/scores são Fase 9. Refino visual global/pinos/motion são Fase 13. Zero token novo — 100% reuso do sistema cartográfico/oxide já existente.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla com variáveis `:root` |
| Icon library | emoji (🎤 🏦 💡 ×) — mesmo padrão já usado em `.hint`, `.caixabtn`, `#pillClose` |
| Font | `"IBM Plex Sans"` (UI/copy) + `"IBM Plex Mono"` (códigos/labels técnicos — ex. `.combo-item .code`, `.chsub`) |

Identidade: cartográfica/oxide. Papel antigo + tinta + carimbo vermelho-óxido. Bordas de 1.5–2px sólidas (não sombra suave), cantos quase retos (`border-radius:2px` na maioria; pills usam `border-radius:20px`/`22px` já existentes em `.chips`/`.seg`).

---

## Tokens Reusados (zero hex novo, zero fonte nova)

| Var CSS | Hex | Uso nesta fase |
|---------|-----|-----------------|
| `--paper` | `#e9e4d8` | fundo do painel/caixa única |
| `--paper-2` | `#f2eee4` | fundo do painel, `.combo-list`, chips em estado "off" se sobre paper |
| `--ink` | `#141a1f` | texto principal, borda de destaque, chip "on"/ativo (`.moderow button.on` já usa `--ink`) |
| `--line` | `#c3b9a3` | borda padrão de input/chip em repouso |
| `--muted` | `#57503f` | texto secundário, labels, hint (contrast AA confirmado no código: "escurecido p/ passar AA sobre o papel") |
| `--accent` | `#b5451f` | foco, chip ativo/selecionado, selo "aproximado", grifo de confiança média/alta |
| `--accent-ink` | `#8f3116` | hover do accent (par botão/hover já estabelecido) |
| `--gold` | `#a8842c` | reservado ao selo Caixa (`.caixabtn`) — **não usar** nesta fase |
| `--ok`/`--lot` | `#2c5545` | **não usar** nesta fase (reservado a status de valor/mapa, Fase 9/13) |

Nenhuma cor nova. Nenhum novo destructive color é necessário — a única ação destrutiva desta fase (limpar a caixa / trocar setor assumido) não é irreversível (não perde dados), então usa `--muted`/`--ink`, não um vermelho de alerta dedicado.

---

## Spacing Scale

Reuso da escala já implícita no código (múltiplos de 4, com uso extensivo de 44px para toque):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | gap entre ícone 🎤/× e a borda do input |
| sm | 8px | gap entre chips (`.chips{gap:8px}` já existente), gap interno do chip de confirmação |
| md | 16–18px | padding do `.search` (já `18px 22px`), margem entre caixa única e chip |
| touch | **44px mínimo** | altura de: caixa única, botão 🎤, botão ×, cada chip (desambiguação/exemplo/correção), item do dropdown unificado |
| lg | 22px | padding horizontal do painel (herdado de `.search{padding:18px 22px}`) |

Exceções: nenhuma. O alvo de 44px já é o padrão do app (moderow, modemore, pillclose) — toda peça nova desta fase HERDA esse mínimo, não negocia.

---

## Typography

Reuso total — nenhum tamanho/peso novo introduzido.

| Role | Size | Weight | Line Height | Fonte | Onde já existe |
|------|------|--------|-------------|-------|-----------------|
| Input (caixa única) | 16px | 500 | 1 | IBM Plex Sans | `select,input{font:500 16px/1 ...}` — **16px é mandatório** (mata autozoom iOS, já documentado) |
| Label | 12px | 600 | 1.2 | IBM Plex Sans | `label{font:600 12px/1.2 ...}` |
| Chip / botão pill | 14px | 500–600 | 1 | IBM Plex Sans | `.chips button{font:500 14px/1}` (confirmação/exemplo), `.moderow button{font:600 12.5px/1}` (menu de correção herdado) |
| Hint / texto de apoio | 11.5px | 500 | 1.4 | IBM Plex Sans | `.hint{font:500 11.5px/1.4}` |
| Código/técnico (rótulo de tipo no dropdown) | 11px | 600 | 1 | IBM Plex Mono | `.combo-item .code{font:600 11px/1}` |

Sem Display/Heading nesta fase (não há título novo — `<h1>` do painel é inalterado).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo do painel, fundo da caixa única em repouso |
| Secondary (30%) | `--paper-2` `#f2eee4` | fundo do dropdown (`.combo-list`), fundo do menu de correção (`.moderow`/`.modemore` herdado) |
| Accent (10%) | `--accent` `#b5451f` | **reservado exclusivamente para**: (1) borda de foco da caixa única e dos chips (`:focus-visible`), (2) chip de confirmação quando confiança é ALTA/MÉDIA (borda + ícone), (3) chip ativo/selecionado no dropdown e no menu de correção (`.on`), (4) selo "match aproximado" no fuzzy-fix, (5) sublinhado do link "corrigir" |
| Destructive | **não aplicável nesta fase** | limpar caixa (×) e trocar setor não são destrutivos — usam `--muted`/`--ink` |

Accent reservado para: foco de teclado da caixa única e dos chips; estado "on"/selecionado de chip e item de dropdown; selo de match aproximado; nunca em texto de corpo, nunca em placeholder, nunca em mais de 1 elemento simultâneo por linha (evita "óxido parecendo alerta constante" — mesma disciplina já aplicada no resto do app).

**Contraste AA confirmado (papel `#e9e4d8`, luminância clara):**
- `--muted #57503f` sobre `--paper` → ~7:1 (já corrigido no código, comentário confirma "~3.7:1 → corrigido")
- `--ink #141a1f` sobre `--paper`/`--paper-2` → >13:1
- `--accent #b5451f` sobre `--paper` → ~4.9:1 (passa AA para texto ≥14px/700 e para bordas; não usar accent para texto de corpo <14px)
- Chip ativo `background:var(--accent);color:#fff` → ~4.9:1 texto branco sobre óxido, mesma combinação já usada em `.chips button.on` — dentro do padrão aprovado do app

---

## Component 1 — Caixa Única (substitui `.moderow`)

**HTML de referência (reuso estrutural, IDs novos):**

```html
<div class="search">
  <label for="caixaInput">Buscar</label>
  <div class="caixa">
    <input id="caixaInput" class="caixa-input" autocomplete="off" inputmode="text"
      placeholder="quadra 128 lote 5 · rua portugal 582 · sumer park · 3020150346"
      role="combobox" aria-expanded="false" aria-controls="caixaList" aria-autocomplete="list"
      aria-describedby="detectChip">
    <button id="caixaVoz" class="caixa-ic" aria-label="Buscar por voz" style="display:none">🎤</button>
    <button id="caixaClear" class="caixa-ic" aria-label="Limpar busca" style="display:none">×</button>
  </div>
  <div id="caixaList" class="combo-list" role="listbox" aria-label="Sugestões de setor e rua"></div>
</div>
```

| Estado | Border | Background | Texto | Observação |
|--------|--------|------------|-------|------------|
| Default (vazio) | 1.5px `--line` | `--paper` | placeholder `--muted` | placeholder estático, nunca rotativo (consistência com resto do app) |
| Typing (com valor) | 1.5px `--line` | `--paper` | `--ink` 500 16px | × aparece (fade-in instantâneo, sem transição — ver Motion) |
| Focus-visible | 2px `--accent` outline, offset 2px | `--paper` | `--ink` | reusa a regra global `input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` — já existe, não recriar |
| Hover (desktop) | 1.5px `--line` (inalterado) | `--paper` | — | inputs não têm hover distinto hoje — manter consistência, não inventar |
| Active/disabled durante busca | 1.5px `--line`, opacity .6 | `--paper` | — | espelha `.go[disabled]{opacity:.5;cursor:wait}` |
| Erro (busca sem resultado) | 1.5px `--line` (inalterado — o erro vive no chip/results, não na borda do input) | `--paper` | — | não pintar a borda de vermelho: o app não usa cor de erro em borda de input em nenhum lugar hoje; erro é comunicado por texto/chip, não por cor isolada |

**Botão 🎤 (voz):**
- Só renderiza (`display:flex`) se `window.webkitSpeechRecognition` existir — ausência é 100% silenciosa (sem placeholder vazio, sem tooltip "não disponível").
- 44×44px mínimo, dentro do padding do input (posição absoluta à direita, como já é o padrão em campos com ícone embutido no app — ver `.pillclose`).
- Estado ativo (gravando): `background:var(--accent)`, ícone permanece 🎤 (sem trocar emoji — não introduzir novo glifo); `aria-pressed="true"`.
- Erro de permissão: `toast()` existente, mesmo componente/posição (`.toast`, rodapé no mobile via `@media(max-width:820px)`, topo no desktop) — texto: "Não foi possível usar o microfone. Digite sua busca." (copy final no contrato abaixo).

**Botão × (clear):**
- Só renderiza quando `caixaInput.value` não vazio.
- 44×44px, `aria-label="Limpar busca"`, ao clicar: limpa valor, foca o input, fecha dropdown, remove chip.
- Visual idêntico ao `#pillClose` já existente (`border:0;background:transparent`), cor `--muted`, hover `--ink`.

---

## Component 2 — Chip de Confirmação + Menu de Correção

**HTML de referência:**

```html
<div id="detectChip" class="detectchip" role="status" aria-live="polite" tabindex="0"
     aria-label="Toque para corrigir o modo de busca detectado"></div>

<!-- menu de correção: reaproveita .moderow/.modemore existentes, sem CSS novo -->
<div id="correctMenu" class="moderow" hidden>
  <button id="cAD" onclick="forceMode('addr')">Endereço</button>
  <button id="cBD" onclick="forceMode('bd')">Prédio</button>
  <button id="cQL" onclick="forceMode('ql')">Quadra/Lote</button>
</div>
<button class="modemore" id="cIN" onclick="forceMode('insc')">ou buscar pela inscrição cadastral (CI)</button>
```

| Estado | Aparência | Trigger |
|--------|-----------|---------|
| Vazio (sem texto digitado) | `display:none` | input vazio |
| Confiança ALTA | fundo `--paper-2`, borda 1.5px `--line`, ícone/texto `--ink`; **sem** cor de destaque — é informativo, não pede ação | ex.: "Quadra 128 · Lote 5" |
| Confiança MÉDIA | borda 1.5px `--accent` (destaque visível, mas fundo neutro `--paper-2`), selo inline "· assumindo prédio" em `--muted` | ex.: "Prédio (?) · Sumer Park" |
| Confiança do setor lembrado (localStorage) | mesmo estilo de MÉDIA (borda `--accent`), texto sempre no formato "Setor · {Nome} (último)" — nunca omitido | setor vem do `localStorage`, não da frase |
| Ambígua (baixa) | chip não aparece sozinho — vira o grupo de Chips de Desambiguação (Component 3) | ver Component 3 |
| Focus-visible / tocado | outline 2px `--accent`, offset 2px | teclado ou toque |
| Menu de correção aberto | `.moderow`/`.modemore` herdados sem alteração de CSS — `hidden` removido, `aria-pressed` sincronizado nos 3 botões + link | toque no chip |

**Especificações:**
- Alvo de toque do chip inteiro ≥44px de altura (padding vertical mínimo 11px + line-height, igual ao `.chips button` existente).
- `role="status" aria-live="polite"` — atualiza a cada resultado de `detectMode()` debounced; leitores de tela anunciam a mudança sem interromper.
- Fonte: 14px/500 IBM Plex Sans (igual `.chips button`), rótulos técnicos (contagem de dígitos) em IBM Plex Mono 11px como já faz `.chsub`/`.combo-item .code`.
- Tocar no chip abre o menu de correção (reuso 1:1 do HTML/CSS `.moderow`/`.modemore`) — zero CSS novo para essa peça, só o comportamento de abrir/fechar.
- Fechar o menu de correção: Esc, tocar fora, ou selecionar um modo (mesmo padrão de fechamento do combo de setor).

---

## Component 3 — Chips de Desambiguação + Exemplos Tocáveis

**HTML de referência (mesma família de componente — `.chips`, já existente no wizard do laudo):**

```html
<!-- Desambiguação (confiança baixa) -->
<div class="chips" id="ambigChips" role="group" aria-label="Escolha o que você quis dizer" hidden>
  <button class="on" data-target="rua">Rua 135</button>
  <button data-target="ql">Quadra 135</button>
  <!-- só se ≥5 dígitos: -->
  <button data-target="insc">Inscrição 13500…</button>
</div>

<!-- Exemplos tocáveis (estado vazio) -->
<div class="chips examplechips" role="group" aria-label="Exemplos de busca" id="exampleChips">
  <button>quadra 128 lote 5</button>
  <button>rua portugal 582</button>
  <button>sumer park</button>
  <button>3020150346</button>
</div>
```

| Estado | Visual | Comportamento |
|--------|--------|----------------|
| Default | `border:1.5px solid var(--line); background:var(--paper); color:var(--ink)` — idêntico ao `.chips button` já existente, zero CSS novo | tocar preenche a caixa única + dispara `buscar()` direto (sem re-digitação) |
| Hover (desktop) | `border-color:var(--muted)` (mesmo padrão de `.chooser .chrow:hover`) | — |
| Focus-visible | outline 2px `--accent`, offset 2px | navegação por teclado |
| Active/selecionado | `background:var(--accent); color:#fff; border-color:var(--accent)` — reuso exato de `.chips button.on` | só aplicável se um chip permanecer "escolhido" após clique (ex.: desambiguação já resolvida) |
| Disabled (durante busca em andamento) | opacity .5, `cursor:wait` | espelha `.go[disabled]` |

**Regras de conteúdo:**
- Desambiguação: no máximo 3 chips ("Rua N" / "Quadra N" / "Inscrição N…" — este último só se o número tiver ≥5 dígitos). Nunca dispara busca automaticamente — exige toque.
- Exemplos tocáveis: exatamente os 4 do placeholder ("quadra 128 lote 5", "rua portugal 582", "sumer park", "3020150346"), substituindo o `<div class="empty">` narrativo atual. Mesmo texto do placeholder — consistência entre os dois pontos de ensino.
- `flex-wrap:wrap; gap:8px` (herdado de `.chips`) — nunca quebra o alvo de 44px mesmo empilhando em mobile 375px.

---

## Component 4 — Dropdown Unificado (setor + rua CNEFE)

**Extensão do `.combo-list`/`.combo-item` já existente — sem CSS novo de container, só o rótulo de tipo:**

```html
<div class="combo-list show" id="caixaList" role="listbox" aria-label="Sugestões">
  <div class="combo-item" role="option" id="opt-bai-1500" aria-selected="false">
    <span class="code">Setor</span>Jardim Goiás<span class="raw">JD GOIAS</span>
  </div>
  <div class="combo-item" role="option" id="opt-rua-8842" aria-selected="false">
    <span class="code">Rua</span>Rua Portugal<span class="raw">CNEFE</span>
  </div>
</div>
```

| Estado | Visual | Fonte da regra |
|--------|--------|-----------------|
| Item default | `padding:9px 11px; border-bottom:1px solid var(--grid); font:500 13px/1.2` | `.combo-item` herdado, zero mudança |
| Item hover/active | `background:var(--ink); color:var(--paper-2)` | `.combo-item:hover,.combo-item.active` herdado |
| Rótulo de tipo ("Setor"/"Rua") | reusa `.combo-item .code` (IBM Plex Mono 11px 600, `--muted`, `float:right`) — **não** usar `--accent` no rótulo (accent é só para estado ativo/foco, não para categorização neutra) | extensão semântica de um span já existente |
| `aria-activedescendant` | segue o padrão já implementado: `id="opt-<code>"` nas opções, sincronizado via seta ↑/↓ | preservar 1:1 — SEARCH.md §1.6 confirma que já está correto no combo de setor; o dropdown unificado herda a mesma mecânica, só agrupando 2 fontes de dados na mesma lista |
| Vazio | `.combo-empty` herdado: "nenhum setor com esse nome" → generalizar para "nenhuma sugestão" quando a busca cobre setor+rua | pequeno ajuste de copy, zero CSS |
| Fechamento no iOS | `pointerdown`/`touchstart` (não `click`) — regra já implementada em `DOWNEV`, preservar exatamente | SEARCH.md §1.6, linha 2239 do código |

**Regra de dados:** CNEFE (`logradouros-goiania.json`) é lazy-loaded no primeiro uso da caixa única (não no boot) — item já coberto pela Fase 7. Setor continua vindo de `COMBO` (já carregado em `loadBairros()`). A lista renderiza os dois tipos intercalados por relevância de match (mesma lógica de ordenação por posição do termo já usada em `filterCombo`), não em 2 blocos separados.

---

## Estados da Caixa (idle / typing / detected / ambíguo / erro / vazio)

| Estado | Caixa | Chip | Dropdown | Botão Buscar |
|--------|-------|------|----------|--------------|
| **Idle** (boot, sem digitação) | placeholder estático visível, × oculto | oculto | oculto | `.go` habilitado, mas Enter não faz nada (sem valor) |
| **Vazio** (`#results` sem busca ainda) | idem Idle | oculto | oculto | `.examplechips` substituem o `.empty` narrativo (Component 3) |
| **Typing** (debounce ~150ms, conforme SEARCH.md §2) | × visível, borda inalterada | atualiza a cada debounce resolvido (não a cada tecla) | abre se há match de setor/rua (mesma regra do combo atual: qualquer caractere digitado dispara filtro) | permanece habilitado |
| **Detected — Confiança ALTA** | inalterada | informativo, fundo neutro (ver Component 2) | fecha ao selecionar/Enter | Enter dispara `buscar()` direto |
| **Detected — Confiança MÉDIA** | inalterada | borda `--accent`, selo de incerteza (ver Component 2) | fecha ao Enter | Enter dispara `buscar()`, mas o chip já avisou a suposição |
| **Ambíguo (confiança BAIXA)** | inalterada | chip normal NÃO aparece — em seu lugar, `.ambigChips` (Component 3) | oculto (a ambiguidade é sobre modo, não sobre setor/rua) | Enter NÃO dispara busca — exige toque num chip de desambiguação |
| **Erro** (busca sem resultado ou falha de rede) | inalterada | mantém o último chip (não reseta) | oculto | `#results` mostra mensagem + botão de próxima ação (ex.: "Buscar como Prédio"), reusando o padrão de `finish()`/toast já existente — nunca sem saída |
| **Carregando** | opacity .6, `cursor:wait` (herdado de `.go[disabled]`) | mantém último estado | oculto | `.go[disabled]` |

---

## Mobile 375 × Desktop 1280

| Aspecto | Mobile (≤820px, `body[data-view]` controla painel/mapa) | Desktop (≥821px, overlay) |
|---------|----------------------------------------------------------|------------------------------|
| Container da caixa única | dentro do `.panel` full, mesma coluna vertical do fluxo atual | dentro do `.panel` como overlay fixo (`top:24px;left:24px;max-width:400px`), revelado por `setView('busca')` — **preservar 1:1** o hotfix `a7a4646` |
| Fechamento | `#pillClose` (×) só existe no desktop hoje — no mobile o fechamento é a navegação de view (`data-view="mapa"`); a caixa única não altera esse contrato | × do painel (`#pillClose`) continua fechando o overlay; **nunca** sobreposição com ficha/seletor (guarda ROADMAP critério 7) |
| Chip de confirmação | mesma largura do painel, quebra de linha permitida | mesma largura do overlay (400px max) — chip não deve forçar scroll horizontal |
| Dropdown unificado | `.combo-list` já é `position:absolute` relativo ao `.combo`/`.caixa` — funciona igual, sem mudança de posicionamento | idêntico — herda o mesmo posicionamento relativo |
| Botão 🎤 | aparece no mobile (é o cenário principal de voz, best-effort); Web Speech API tem suporte inconsistente em desktop Chrome também, então a regra é a MESMA (existe API → aparece), não um gate por breakpoint | idem — decisão é por feature-detection, não por viewport |
| Toast de erro (permissão de voz) | `.toast` reposicionado para rodapé (`@media(max-width:820px)` já existente) | `.toast` no topo (comportamento padrão já existente) — nenhuma mudança de CSS necessária, herda a regra atual |
| `font-size:16px` no input | mandatório (mata autozoom iOS) | mantido por consistência (não há necessidade no desktop, mas não há motivo para diferenciar — o app já usa 16px universalmente em inputs) |

---

## Acessibilidade / Motion / iOS (obrigatório — SEARCH.md §1.6)

- **Sem `transition:` novo.** Toda mudança de estado visual (chip aparece/desaparece, borda muda de cor, dropdown abre/fecha) é *snap* — `display`/`class` toggle direto, exatamente como o app já faz em `.combo-list.show`, `.toast.show`, `.moderow button.on`. O kill-switch global `@media(prefers-reduced-motion:reduce)` já cobre qualquer animação residual (ex.: `.go:active{transform}`) — não é necessário replicar a regra, apenas não introduzir novas transições fora dela.
- **`role="combobox"` + `aria-expanded`/`aria-controls`/`aria-autocomplete="list"`** no input da caixa única — mesmo padrão do `#bairroInput` — preservado.
- **`role="option"` + `aria-selected` + `id="opt-<code>"`** em cada item do dropdown unificado, com `aria-activedescendant` sincronizado no input conforme navegação por teclado (↑/↓/Enter/Esc) — replicar 1:1 o padrão já correto do combo de setor.
- **`role="status" aria-live="polite"`** no chip de confirmação — obrigatório desde o primeiro commit (não é retrofit).
- **`label for=`** explícito em todo campo com rótulo visível; `aria-label` nos botões só-ícone (🎤, ×).
- **`aria-pressed`** sincronizado em todo botão do menu de correção (`.moderow`/`.modemore` herdados) e em qualquer chip com estado binário (ex.: chip de desambiguação já escolhido).
- **Esc** fecha, na ordem: dropdown → menu de correção → chips de desambiguação (se aplicável) → (mantém a ordem existente wizard→chooser→detail para as camadas de baixo, inalterada).
- **iOS:** fechamento de QUALQUER lista/menu novo por `pointerdown`/`touchstart` (nunca `click`) — replicar a constante `DOWNEV` já existente, não recriar; `font-size:16px` no input da caixa única (não pode ser menor — quebra o contrato antizoom).
- **Alvo ≥44px** em: caixa única (altura), botão 🎤, botão ×, cada chip (confirmação/desambiguação/exemplo), cada item de correção no menu herdado, cada item do dropdown unificado (o `.combo-item` atual tem `padding:9px 11px` + line-height ~13px ≈ 31px — **ajustar `padding-block` para atingir 44px de altura total quando usado dentro do fluxo de toque mobile**, ou confirmar que a área de toque real já soma ≥44px com o `border-bottom`; medir em preview antes de fechar o plano).
- **`SEARCHTOKEN`** propagado em qualquer chamada assíncrona nova (ex.: se `detectMode` precisar aguardar `COMBO`/CNEFE carregando) — mesma disciplina de concorrência já usada em `buscar`/`onMapClick`/`loadCi`.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Label da caixa única | "Buscar" |
| Placeholder | `quadra 128 lote 5 · rua portugal 582 · sumer park · 3020150346` |
| Primary CTA | "Buscar" (botão `.go` inalterado — verbo de ação já correto) |
| Chip — confiança alta | `{Modo} · {valor detectado}` — ex. "Quadra 128 · Lote 5", "Endereço · Rua Portugal, 582", "Inscrição (lote) · 10 díg." |
| Chip — confiança média | `{Modo} (?) · {valor}` — ex. "Prédio (?) · Sumer Park" |
| Chip — setor lembrado | "Setor · {Nome} (último)" — nunca omitido, sempre tocável |
| Chip de correção — rótulo do grupo | "Buscar por" (reuso do label já existente na moderow) |
| Chips de desambiguação — cabeçalho | "O que você quis dizer?" |
| Chips de desambiguação — opções | "Rua {n}" / "Quadra {n}" / "Inscrição {n}…" |
| Empty state heading | "Encontre qualquer imóvel de Goiânia" (herdado, inalterado) |
| Empty state body | "Veja na hora o **preço estimado**, gere um **laudo em PDF** e descubra **oportunidades da Caixa** por perto. Toque num exemplo para começar:" (troca o parágrafo instrutivo por convite aos chips tocáveis) |
| Exemplos tocáveis (chips) | "quadra 128 lote 5" / "rua portugal 582" / "sumer park" / "3020150346" |
| Erro — sem resultado (modo endereço) | "Nenhum imóvel encontrado nesse endereço." + botão "Buscar como Prédio" |
| Erro — sem resultado (modo prédio) | "Nenhum edifício encontrado com esse nome." + botão "Tentar outro nome" (foca a caixa) |
| Erro — rede/offline | reuso do toast existente ("Sem conexão — verifique sua internet." / "Falha ao buscar. Tente de novo.") + botão "Tentar de novo" |
| Erro — permissão de voz negada | "Não foi possível usar o microfone. Digite sua busca." (toast) |
| Botão limpar (×) | `aria-label="Limpar busca"` |
| Botão voz (🎤) | `aria-label="Buscar por voz"` |
| Destrutivo nesta fase | nenhuma ação irreversível — limpar caixa e trocar setor lembrado são reversíveis (não pedem confirmação, seguem o padrão já usado em `pickBairro`/clear existentes) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

Nenhum registry de componentes é usado neste projeto — app HTML único, sem build. Gate de registry não se aplica; nenhuma ação de vetting necessária.

---

## Fora de Escopo (não tocar nesta fase)

- Choropleth/cor por R$/m² (Fase 15/9) e pinos semânticos (Fase 13) — não introduzir `--ok`/`--lot`/`--gold` em nenhum elemento novo desta fase.
- Refino visual global (respiro, densidade de textura/borda) — Fase 13. Esta fase reusa a densidade visual atual tal como está.
- Ficha/scores — Fase 9. O chip de confirmação e o dropdown não devem antecipar nenhum elemento de score/valor.
- Motion coreografado (Localizando→Consultando→...) — Fase 13. Aqui, toda transição de estado é *snap*.

---

## Verificação (preview, mobile 375 + desktop 1280)

- Caixa única substitui a moderow como tela padrão; menu de correção (`.moderow`/`.modemore`) abre a partir do chip sem CSS novo.
- Chip de confirmação sempre visível quando há texto — nunca busca silenciosamente com setor assumido do localStorage sem mostrar "(último)".
- "135" sozinho nunca dispara busca automática — sempre mostra chips de desambiguação.
- Dropdown unificado mistura Setor/Rua com rótulo de tipo, navegável por teclado (↑↓Enter/Esc), fecha por `pointerdown` no iOS.
- Exemplos tocáveis no estado vazio preenchem + buscam num toque.
- Nenhuma cor fora da paleta `--paper/--paper-2/--ink/--line/--muted/--accent/--accent-ink` aparece em qualquer componente novo.
- Zero `transition`/animação nova; `prefers-reduced-motion` continua zerando o que já existe.
- Todo alvo de toque novo mede ≥44px em DevTools (mobile 375).
- Coordenação busca⇄ficha no desktop (guarda `a7a4646`) intacta: overlay sempre fechável, ficha/seletor fecham o overlay, zero sobreposição ≥821px.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
