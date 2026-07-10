---
phase: 17
slug: diff-cadastro-cruzamento-caixa
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-09
---

# Phase 17 — UI Design Contract

> Visual and interaction contract para a Fase 17: Diff de Cadastro & Cruzamento Caixa. Gerado por gsd-ui-researcher em **AUTO MODE** (sem perguntas ao usuário — decisões derivadas de `17-CONTEXT.md`, `TERRITORIO.md` §1.5-1.6, e do design system já em produção em `radar-goiania.html`, com **reuso verbatim** dos tokens de `15-UI-SPEC.md`/`16-UI-SPEC.md`). Fase pequena e fechada: só 3 componentes visuais novos sobre uma base 100% reusada. Verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — app HTML único (`radar-goiania.html`), sem framework/build/registry de componentes (herdado, inalterado) |
| Preset | não aplicável (stack não é React/Next/Vite) |
| Component library | none — CSS custom. Esta fase **reusa verbatim**: `.detail`, `.dgrid`/`.cell`, `.dnote`, `.chips`, `.savedblock`, `#cadernoBlock`/`.cadbook-*` (Fase 16), `#terrPanel`/`#terrGrid` (Fase 15), `.pino-legenda`, `caixaPopup()`/`toggleCaixa()`. Classes **novas** desta fase (prefixadas por feature, mesma convenção): `.ddiff-*` (diff na ficha), `.cadbook-caixabadge` (badge Caixa no Caderno), `.terr-caixa-line` (linha Caixa no painel) |
| Icon library | none — glifos emoji inline. **Zero glifo novo**: reusa 📓 (já é o glifo do Caderno/Fase 16 — o diff é lido como "o que aconteceu desde que você anotou este lote no caderno", então herda o mesmo glifo, sem introduzir um 3º conceito visual) e 🏦 (já é o glifo Caixa desde a Fase 13) |
| Font | `"IBM Plex Sans"` (UI/texto corrido), `"IBM Plex Mono"` (rótulos técnicos/status/mono), fallback `"Segoe UI",system-ui,sans-serif` — idêntico ao app |

**Gate shadcn:** não aplicável — mesma justificativa das Fases 15/16 (stack não é React/Next/Vite; nenhum `components.json` no repo).

---

## Spacing Scale

Reusa **verbatim** a escala de `15-UI-SPEC.md`/`16-UI-SPEC.md` (nenhum valor novo introduzido):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | Gap entre o sinal (▲/▼/●) e o texto de cada linha do diff; gap entre swatch e ícone no novo item da legenda de pinos |
| sm | 8px | Gap entre linhas da lista de diff (`.ddiff-list`); padding interno do badge Caixa do Caderno e da linha Caixa do painel |
| md | 16px | Padding do corpo do bloco `#dDiff` (`8px 16px`, mesma régua de `.terrdet-item`/`.cadbook-editor`) |
| lg | 24px | Reservado — não usado nesta fase |
| — | 44px | Piso de touch target: `#cadernoCaixaBadge` (badge/aviso Caixa no Caderno) e `#terrCaixaLine` (linha Caixa no painel) — os DOIS são `<button>` tocáveis (abrem o mapa), não decoração |

Exceptions: a lista de diff (`.ddiff-item`) é **texto estático, não interativo** — não tem piso de 44px (não é controle de toque, é leitura, mesma lógica de `.dnote`/`.terr-metric-sub`). O anel do pino Caixa no mapa (Leaflet `circleMarker`) não é um elemento DOM tocável próprio — o toque continua servido pelo círculo preenchido já existente (raio 7px, inalterado); o anel é só reforço visual por cima, sem hit-area própria.

---

## Typography

Reusa **verbatim** a tabela das Fases 15/16 (nenhum tamanho/peso novo introduzido):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 13px | 500 | 1.5 |
| Label (mono) | 10.5px | 700 | 1.3 |
| Heading | 18px | 700 | 1.15 |

Fontes: Body em `"IBM Plex Sans"`; Label em `"IBM Plex Mono"`. Pesos usados NESTA fase: 500 e 700 apenas — nenhum elemento novo usa Display 22/800.

Uso nesta fase:
- **Body** — cada linha de mudança do diff (`.ddiff-txt`); texto do badge Caixa do Caderno; texto da linha Caixa do painel; linha nova no popup Caixa ("📓 Este imóvel está no seu território salvo.")
- **Label (mono)** — data da última visita ao lado do título do diff (`.ddiff-data`, ex.: "desde 10/05"); rótulo do novo item da legenda de pinos (herdado, mesmo estilo dos demais itens de `#pinoLegenda`)
- Nenhum **Heading** novo — o diff usa `.ddiff-tt` (título de bloco secundário, mesmo peso visual de `.dvalor-k`/`.cadbook-addr`: 13px/700, não 18px — é um sub-bloco dentro da ficha, que já tem seu `<h3 id="dAddr">` próprio; introduzir um 2º heading 18px competiria por atenção)

---

## Color

Reusa **verbatim** a paleta 60/30/10 das Fases 15/16 — **zero cor nova** introduzida nesta fase:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--paper)` `#e9e4d8` | Fundo do mapa/página (inalterado) |
| Secondary (30%) | `var(--paper-2)` `#f2eee4` | Corpo do bloco `#dDiff` (mesmo fundo de `.dnote`/`.terrdet-item`) |
| Accent (10%) | `var(--accent)` `#b5451f` | Reservado a: foco (`:focus-visible`), toasts de erro — **NUNCA** usado no diff (ver regra abaixo) nem no badge/linha Caixa |
| Diff — sinal/texto | `var(--ink)` `#141a1f` (texto) + `var(--muted)` `#57503f` (data/rótulo) | **Neutro deliberado.** "Subiu"/"desceu" é INFORMAÇÃO de mercado (gatilho comercial), não um STATUS do sistema — por isso o diff nunca usa `--status-bom`/`--status-atencao`/`--status-risco`. O sinal (▲/▼/●) é tipográfico (glifo Unicode), pintado com a MESMA cor do texto ao lado (`--ink`), nunca uma cor própria |
| Caixa — badge/linha/anel | `var(--gold)` `#a8842c` (= `--status-caixa`, já existente) para o glifo/rótulo textual; `var(--ink)` `#141a1f` para o traço do anel extra no pino | Reusa o MESMO hex dourado já usado por Caixa desde a Fase 13 — o "destaque" desta fase não é uma 4ª cor, é um anel (`--ink`, já existente, mesma cor do traço padrão do círculo Caixa) por cima do pino já dourado + reforço textual em 3 lugares (nunca só visual/cor, ver Acessibilidade) |
| Destructive | não aplicável | Nenhuma ação destrutiva nova nesta fase (diff e cruzamento Caixa são leitura, não escrita destrutiva) |

**Regra "cor só onde significa status" aplicada ao diff (decisão explícita do CONTEXT — constraint da fase):** subir ou descer o venal/IPTU/área não é bom nem mau em si (depende da estratégia do corretor — subida pode ser gatilho de venda OU sinal de reavaliação); por isso o diff NUNCA pinta a linha de verde/dourado/vermelho. A leitura comercial vem do TEXTO ("Valor venal subiu 12% desde 10/05" já entrega a informação por si), reforçado por um sinal tipográfico neutro (▲ para subiu, ▼ para desceu, ● para mudança sem direção — ex. mudança de uso). Isso é consistente com a regra já documentada em `16-UI-SPEC.md` para os status neutros do Caderno (só "Fechou" ganha cor, porque é o único estado com significado de resultado positivo — subir/descer venal não tem esse paralelo).

**Anel do pino Caixa (mapa):** reusa `--ink` (mesma cor já usada no traço padrão do círculo Caixa, `color:"#141a1f"` em `toggleCaixa()`) — não introduz variação de matiz. Diferente da regra PIN-01 ("nunca diferenciar categoria só por borda/tracejado — ilegível em círculo de 8px"), aqui o anel NÃO diferencia uma categoria nova de pino (o pino continua sendo "Caixa", mesma cor/ícone); é um reforço de ATRIBUTO sobre a mesma categoria, sempre acompanhado de texto redundante em 3 lugares (popup, badge do Caderno, linha do painel) — nunca depende só do anel para comunicar a informação, o que resolve a preocupação de acessibilidade que originou a regra PIN-01.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Título do bloco de diff (ficha, `.ddiff-tt`) | "📓 Desde sua última visita" |
| Data ao lado do título (`.ddiff-data`, mono) | "desde {dd/mm}" (formata `snapshotAt` anterior, mesmo padrão `fmtSalva()` já usado no app — "salva em dd/mm") |
| Diff — venal subiu | "Valor venal subiu {pct}% desde {dd/mm}" |
| Diff — venal desceu | "Valor venal desceu {pct}% desde {dd/mm}" |
| Diff — área construída aumentou de zero (terreno que ganhou construção) | "Área construída: +{delta} m² — construção nova?" |
| Diff — área construída aumentou (já tinha construção) | "Área construída aumentou {delta} m²" |
| Diff — área construída caiu a zero | "Área construída: -{delta} m² — demolição?" |
| Diff — área construída diminuiu (não a zero) | "Área construída diminuiu {delta} m²" |
| Diff — IPTU subiu | "IPTU subiu {pct}% desde {dd/mm}" |
| Diff — IPTU desceu | "IPTU desceu {pct}% desde {dd/mm}" |
| Diff — uso mudou | "Uso mudou de {usoAntigo} para {usoNovo}" (rótulos vêm do domínio fixo `USO[...]` já existente, nunca código cru) |
| Diff — data de inclusão mudou (caso raro, sem direção comercial) | "Data de cadastro atualizada" |
| Empty state — nada mudou (locked no CONTEXT) | "Sem mudanças no cadastro desde a última visita." |
| Error state — comparação falhou (dado fresco não chegou a tempo de montar o diff, mesmo que a ficha já tenha aberto com outros dados) | "Não foi possível comparar com sua última visita. Tente abrir a ficha de novo." |
| Error state — falha ao gravar o snapshot novo (reusa a cópia padrão de escrita do Caderno, `16-UI-SPEC.md`) | "Não foi possível salvar no caderno. Verifique o espaço do navegador e tente de novo." |
| Badge Caixa no Caderno (`#cadernoCaixaBadge`, N=1) | "🏦 1 imóvel Caixa no seu território" |
| Badge Caixa no Caderno (N>1) | "🏦 {N} imóveis Caixa no seu território" |
| Toast — badge/linha Caixa tocada, N>1 (abre visão geral no mapa) | "Mostrando {N} imóveis Caixa no mapa — toque num pino com anel." |
| Linha Caixa no Painel do Território (`#terrCaixaLine`, só quando N>0 no setor) | "🏦 {N} imóvel(is) Caixa neste setor — toque para ver no mapa" |
| Popup Caixa — linha nova quando o imóvel cai em território salvo | "📓 Este imóvel está no seu território salvo." |
| Legenda de pinos — novo item (`#pinoLegenda`) | "🏦📓 Caixa no seu território" (swatch dourado com anel — ver Color) |
| Destructive confirmation | não aplicável — nenhuma ação destrutiva nesta fase |

Todo texto acima segue o gate §26 (Fase 14): verbo de ação nos botões (badge/linha Caixa são botões, não texto morto), erro que explica + oferece saída, sem caixa alta em bloco, sem jargão na 1ª camada, consistência de nomenclatura (📓 sempre é "Caderno/diff", 🏦 sempre é "Caixa" — nunca variam de glifo entre telas).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | nenhum | não aplicável |
| terceiros | nenhum | não aplicável — app não usa shadcn/registry de componentes |

---

## Contrato Específico do Diff & Cruzamento Caixa (extensão — não genérico do template)

### 1. Componente: Diff de Cadastro (`#dDiff`, dentro de `#detail`)

- **Posição no `#detail`:** entre `#dLeitura` e `#dActsPrim` (mesma ordem "conclusão primeiro" da Fase 9/15) — o diff é lido IMEDIATAMENTE depois da leitura prática do imóvel, ANTES de qualquer ação, porque é o gatilho comercial da revisita.
- **Condição de exibição:** o bloco (`hidden` por padrão) só aparece quando `ci` já está no Caderno (Fase 16) E o item salvo tem `snapshot` gravado (todo item salvo passa a ter `snapshot` a partir desta fase — ver Persistência). Lote nunca salvo no Caderno **nunca** mostra este bloco (não existe "última visita" a comparar) — nada de estado vazio genérico aqui, o bloco simplesmente não existe para esse imóvel.
- **Trigger (hook, decisão de discretion resolvida):** `showDetail(a,ll)` já recebe o dado FRESCO (`a`, vindo de `finish()`/`loadCi()`/busca) — no fim de `showDetail`, chama uma função assíncrona nova `renderDiffUI(a)` (mesmo padrão "irmã assíncrona" de `renderCadernoBtn()`, Fase 16: bate no IndexedDB via `cadernoBuscar(ci)`, nunca trava o resto do render síncrono da ficha). Zero requisição de rede extra — o "fresco" é o mesmo objeto que a ficha já está exibindo.
- **Fluxo de `renderDiffUI(a)`:**
  1. Se `!cadernoTem(ci)` → mantém `#dDiff` `hidden`, retorna.
  2. Lê o item salvo (`cadernoBuscar` ou equivalente) — se não tem `.snapshot` (não deveria acontecer após esta fase, mas defensivo) → mantém `hidden`, retorna.
  3. Calcula `diffLote(item.snapshot, a, {DIFF_THRESH_PCT:1, DIFF_THRESH_AREA_M2:1})` (função pura, RADAR_PURE) → lista de mudanças tipadas.
  4. Preenche `#dDiffData` com "desde {dd/mm}" a partir de `item.snapshotAt`; preenche `#dDiffList` com um `<li class="ddiff-item">` por mudança (sinal + texto, ver Copywriting) OU, se a lista vier vazia, um único `<li class="ddiff-empty">Sem mudanças no cadastro desde a última visita.</li>`.
  5. Revela `#dDiff` (`hidden=false`).
  6. Grava o snapshot NOVO silenciosamente (`cadernoAtualizar(ci,{snapshot:{...DIFF_ALLOW},snapshotAt:new Date().toISOString()})`) — sucesso não gera toast (mesmo padrão "autosave silencioso" da Fase 16); falha gera o toast padrão de erro de escrita do Caderno (ver Copywriting). Falha em gravar o snapshot NUNCA esconde o diff que já foi mostrado — o diff já exibido reflete a comparação correta, mesmo que a próxima visita ainda compare contra o snapshot antigo.
  7. Se a busca ao IndexedDB (passo 2/3) falhar por erro inesperado (não simplesmente "não encontrado") → mantém `#dDiff` com o texto de erro de comparação (ver Copywriting), nunca falha silenciosa.
- **`DIFF_ALLOW` (constante nova, subconjunto de `CADERNO_ALLOW`):** `["vlvenal","areaedif","vlimp98","uso","dtinclusao"]` — o objeto `snapshot` gravado dentro do item do Caderno contém SOMENTE esses 5 campos, nunca o objeto `a` bruto inteiro (~85 campos, incluindo campos nunca-permitidos). Reforça a defesa LGPD já central da Fase 16: mesmo que `sanitizeCaderno`/`CADERNO_ALLOW` filtrem o item no nível de gravação, o `snapshot` em si nasce já restrito no momento da montagem — defesa em duas camadas.
- **Thresholds nomeados (nunca hardcoded inline):** `DIFF_THRESH_PCT=1` (variação de venal/IPTU abaixo de 1% não conta como mudança) e `DIFF_THRESH_AREA_M2=1` (variação de área construída abaixo de 1 m² é ruído de arredondamento, não conta). `uso`/`dtinclusao` são comparação categórica (igual/diferente), sem threshold.
- **Estrutura HTML:**
  ```html
  <div class="ddiff" id="dDiff" hidden>
    <div class="ddiff-head">
      <span class="ddiff-tt">📓 Desde sua última visita</span>
      <span class="ddiff-data" id="dDiffData"></span>
    </div>
    <ul class="ddiff-list" id="dDiffList"></ul>
  </div>
  ```
  Cada item de mudança: `<li class="ddiff-item"><span class="ddiff-sign" aria-hidden="true">▲</span><span class="ddiff-txt">Valor venal subiu 12% desde 10/05</span></li>`. Item vazio: `<li class="ddiff-empty">Sem mudanças no cadastro desde a última visita.</li>` (sem sinal, `color:var(--muted)`, mesmo tom de `.dnote`).
- **Foco visual (declaração explícita — pedido do checker):** dentro de `#dDiff`, o **âncora visual primário é o texto de cada linha de mudança** (`.ddiff-txt`, `--ink`, peso 500) — o sinal (▲/▼/●) é apoio tipográfico secundário, nunca a única pista (a palavra "subiu"/"desceu"/"mudou" já está no texto). A data (`.ddiff-data`) é o elemento MENOS proeminente do bloco (mono 10.5px, `--muted`).

### 2. Componente: Badge Caixa no Caderno (`#cadernoCaixaBadge`, dentro de `#cadernoBlock`)

- **Posição:** no cabeçalho do `#cadernoBlock` (`.savedblock-head`), ao lado do contador `#cadernoCount` existente — linha adicional abaixo do cabeçalho, antes do `.dnote` de LGPD (reusa a mesma ordem: identidade do bloco → aviso de destaque → ajuda LGPD → filtros → lista).
- **Condição de exibição:** só renderiza (`hidden` por padrão, igual `#pinoLegenda`/`#terrLegenda` — nunca decorativo) quando `window.CAIXA?.imoveis?.length` E o cruzamento (`cruzarCaixaTerritorio`) encontra pelo menos 1 imóvel Caixa cujo `cdbairro` bate com algum item salvo no Caderno. Zero requisição nova — `CAIXA.imoveis` já está carregado estaticamente e os itens do Caderno já estão em memória quando `#cadernoBlock` é (re)renderizado.
- **Estrutura:** `<button type="button" class="cadbook-caixabadge" id="cadernoCaixaBadge" data-bairros="52,71" hidden onclick="abrirCaixaNoMapaUI(this)">🏦 2 imóveis Caixa no seu território</button>` — `data-bairros` é a lista de códigos `cdbairro` distintos que geraram o match (nunca interpolado dentro do `onclick`, lição XSS Fase 16: handler lê `this.dataset.bairros`, nunca concatena string no atributo `onclick`).
- **Comportamento:** ver "Ação em 1 toque" na seção 4 abaixo (compartilhada com a linha do painel).
- **Foco visual:** o número (`{N}`) dentro do texto é o âncora — mesmo peso do texto ao redor (não há destaque tipográfico extra além do já dado pelo dourado do glifo 🏦, que é textual/emoji, não CSS color).

### 3. Componente: Linha Caixa no Painel do Território (`#terrCaixaLine`, dentro de `#terrPanel`)

- **Posição:** logo após `#terrGrid` (as 5 métricas existentes da Fase 15) e antes de `#terrDetectorView` — não é uma 6ª métrica do grid (não teria "Amostra de N de M lotes" porque não é uma leitura estatística da amostra, é uma contagem exata sobre dado já plotado), por isso vive FORA de `.dgrid`, como uma linha de destaque própria.
- **Condição de exibição:** só renderiza (`hidden` por padrão) quando `montarPainel(scan,st,layer)` roda E o cruzamento (`cruzarCaixaSetor(CAIXA.imoveis, scan.cdbairro)`) encontra N>0. Setor sem imóvel Caixa não mostra a linha (nunca "0 imóveis Caixa" — ruído).
- **Estrutura:** `<button type="button" class="terr-caixa-line" id="terrCaixaLine" data-bairros="" hidden onclick="abrirCaixaNoMapaUI(this)"></button>` — `data-bairros` recebe o único `cdbairro` do setor em foco (mesmo handler da seção 2, generalizado para 1 ou N códigos).
- **Foco visual:** o número (`{N}`) é o âncora; o texto "toque para ver no mapa" é a chamada de ação secundária (mesmo peso menor implícito que "Buscar lote no setor" no rodapé de ações — mas aqui é o próprio texto, não um botão de rodapé, para não competir com o teto "1 primária + 2 secundárias" da Fase 10/15).

### 4. Componente: Destaque no Pino Caixa (mapa) + Ação "1 toque"

- **Anel no pino:** ao ligar a camada Caixa (`toggleCaixa()`), cada `circleMarker` cujo `cdbairro` bate com algum item salvo no Caderno recebe um SEGUNDO `circleMarker` por baixo (mesmo latlng, `radius:10, color:"#141a1f", weight:2, fillOpacity:0, bubblingMouseEvents:false`) — nunca `dashArray` (mesma razão de PIN-01: tracejado é ilegível nesse tamanho). O círculo preenchido original (`radius:7, fillColor:"#a8842c"`) continua sendo a hit-area de clique/popup; o anel é puramente visual, adicionado a um `layerGroup` próprio (`caixaAnelLayer`) que sobe/desce junto com `caixaLayer`.
- **Popup:** `caixaPopup(i)` ganha uma linha condicional nova, só quando `i` está no conjunto cruzado: `<div class="cxp-terr">📓 Este imóvel está no seu território salvo.</div>` — inserida depois da linha de endereço, antes do preço (mesma posição relativa de prioridade "onde fica → o que é especial → preço").
- **Legenda (`#pinoLegenda`):** novo item ao final da lista existente: `<span><i class="pl-dot" style="background:#a8842c;box-shadow:0 0 0 2px var(--ink)"></i>🏦📓 Caixa no seu território</span>` — o `box-shadow` reproduz visualmente o anel dentro do swatch de 8px da legenda (reusa `--ink`, zero cor nova).
- **Ação em 1 toque (compartilhada pelo badge do Caderno e pela linha do painel — `abrirCaixaNoMapaUI(el)`):**
  1. Lê `el.dataset.bairros` (string `"52,71"` → array de códigos).
  2. Garante `caixaLayer`/`caixaAnelLayer` montados e adicionados ao mapa (reusa a lógica de `toggleCaixa()`, sem duplicar construção se já existem).
  3. Filtra `CAIXA.imoveis` pelos códigos recebidos.
  4. Se `isMobile()`, chama `setView('mapa')` (mesmo padrão de `toggleCaixa()`).
  5. **N===1:** `map.setView(toWGS(i.x,i.y), 18)` e abre o popup do pino correspondente diretamente (`.openPopup()`) — satisfaz literalmente "do aviso → abrir o pino/popup Caixa correspondente".
  6. **N>1:** `map.fitBounds(...)` cobrindo os N pinos + toast "Mostrando {N} imóveis Caixa no mapa — toque num pino com anel." (não abre um popup arbitrário entre vários — ambíguo; o toast orienta o próximo toque).
- **Zero requisição nova:** `CAIXA.imoveis` e os itens do Caderno já estão em memória; o cruzamento é `.filter()` puro (`cruzarCaixaTerritorio`/`cruzarCaixaSetor`, RADAR_PURE) por `cdbairro` — sem point-in-polygon nesta fase (fica como refinamento futuro, não requisito, conforme `TERRITORIO.md` §1.6).

### 5. Persistência (contrato de UI sobre a camada de dados — não substitui a decisão técnica do planner)

- **`CADERNO_VERSION` sobe de 1 para 2** — `onupgradeneeded` (já reservado no comentário do código, linha 3278) passa a aceitar os campos novos `snapshot` (objeto com os 5 campos de `DIFF_ALLOW`) e `snapshotAt` (string ISO) DENTRO do mesmo item do store `caderno` existente — recomendação desta pesquisa (embutido, não um store `snapshots` separado), porque o CONTEXT já fixa "sem histórico ilimitado, guardar apenas o último snapshot anterior" — um campo dentro do próprio registro é suficiente e mais simples; a decisão fina de schema é do planner, mas a UI assume que só existe UM snapshot por lote salvo (o mais recente).
- **`CADERNO_ALLOW` estendido:** `snapshot` e `snapshotAt` entram na allowlist positiva (mesma função `sanitizeCaderno`, sem duplicar lógica) — item importado via JSON que traga esses campos passa a ser aceito; item sem eles (formato antigo, salvo antes desta fase) continua válido, só não mostra `#dDiff` até a próxima revisita gerar o 1º snapshot.
- **1º save vs. revisita:** ao salvar um lote no Caderno pela 1ª vez (ação "📓 Salvar no caderno"), o snapshot inicial já é gravado nesse momento (`item.snapshot = campos atuais`, `snapshotAt = agora`) — não precisa de uma revisita para existir snapshot. Isso significa que, se o corretor abrir a ficha de novo na MESMA sessão logo depois de salvar, o diff aparece e mostra honestamente "Sem mudanças no cadastro desde a última visita." (é verdade — não deu tempo de nada mudar). Não há tratamento especial para esse caso; é o caminho vazio natural do próprio `diffLote`.
- **Falha de leitura/escrita:** reusa integralmente o padrão da Fase 16 — feature-detect de IndexedDB, falha de escrita sempre visível (toast padrão), sucesso de autosave (atualização do snapshot) sempre silencioso.

### 6. Acessibilidade

- Sinal do diff (▲/▼/●): `aria-hidden="true"` — a informação de direção já está no texto adjacente ("subiu"/"desceu"/"mudou"), nunca depende só do glifo.
- Anel do pino Caixa: nunca é o único sinal — sempre acompanhado de texto no popup (`📓 Este imóvel está no seu território salvo.`), no badge do Caderno e na linha do painel (3 superfícies redundantes, mesma regra de PIN-01 aplicada de forma reforçada).
- Badge Caixa do Caderno e linha Caixa do painel: `<button>` nativo (foco/teclado/Enter funcionam sem JS extra), texto completo (nunca ícone sozinho), ≥44px de altura.
- `#dDiff`/`#dDiffList`: lista semântica (`<ul>`/`<li>`), navegável por leitor de tela item a item, sem necessidade de `aria-live` (o bloco é preenchido ANTES de ficar visível — `hidden` remove do fluxo até o conteúdo estar pronto, nunca aparece vazio e "pisca" depois).
- Handlers via `data-*`: `abrirCaixaNoMapaUI(this)` lê `dataset.bairros`; nenhum código gerado pelo endpoint (bairro, valores) é interpolado dentro de atributos `onclick=""` — mesma lição XSS já fixada na Fase 16 (CR-01/16-REVIEW.md).

---

## Nomenclatura sugerida (não vinculante — planner decide os nomes finais)

CSS novo: `.ddiff`, `.ddiff-head`, `.ddiff-tt`, `.ddiff-data`, `.ddiff-list`, `.ddiff-item`, `.ddiff-sign`, `.ddiff-txt`, `.ddiff-empty`, `.cadbook-caixabadge`, `.terr-caixa-line`, `.cxp-terr` (linha extra no popup Caixa).

IDs novos: `#dDiff`, `#dDiffData`, `#dDiffList`, `#cadernoCaixaBadge`, `#terrCaixaLine`.

Funções puras sugeridas (RADAR_PURE, TDD): `diffLote(snapshotAntigo, atual, thresholds)`, `formatarDiff(mudancas)` (ou já embutido no retorno de `diffLote`), `cruzarCaixaTerritorio(imoveisCaixa, itensCaderno)` (retorna lista + contagem por `cdbairro`), `cruzarCaixaSetor(imoveisCaixa, cdbairro)`. Funções de I/O sugeridas: `renderDiffUI(a)` (irmã assíncrona de `renderCadernoBtn`), `abrirCaixaNoMapaUI(el)`/`abrirCaixaNoMapa(codigosCdbairro)`, extensão de `caixaPopup(i)` e `toggleCaixa()` para montar `caixaAnelLayer`.

Constantes nomeadas: `DIFF_THRESH_PCT=1`, `DIFF_THRESH_AREA_M2=1`, `DIFF_ALLOW=["vlvenal","areaedif","vlimp98","uso","dtinclusao"]`.

Nenhuma CSS var nova (`--ink`/`--muted`/`--gold`/`--status-caixa` reusadas verbatim) — zero cor nova introduzida por esta fase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
