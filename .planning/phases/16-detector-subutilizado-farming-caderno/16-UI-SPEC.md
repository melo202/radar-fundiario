---
phase: 16
slug: detector-subutilizado-farming-caderno
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-09
---

# Phase 16 — UI Design Contract

> Visual and interaction contract para a Fase 16: Detector de Lote Subutilizado & Farming/Caderno. Gerado por gsd-ui-researcher em **AUTO MODE** (sem perguntas ao usuário — decisões derivadas de `16-CONTEXT.md`, `TERRITORIO.md` §1.3-1.4/§3, e do design system já em produção em `radar-goiania.html`, com **reuso verbatim** dos tokens da `15-UI-SPEC.md`). Verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — app HTML único (`radar-goiania.html`), sem framework/build/registry de componentes (herdado, inalterado) |
| Preset | não aplicável (stack não é React/Next/Vite) |
| Component library | none — CSS custom. Esta fase **reusa verbatim**: `.detail`, `.backlist`, `.dgrid`/`.cell`, `.dnote`, `.chips`, `.seg`, `.maisopcoes`, `.savedblock`/`.savedblock-head`/`.savedlist`/`.savedempty`/`.saveditem`, toast `#toast`, `MOTION_MSG`/`#loadmsg`. Classes **novas** desta fase (prefixadas por feature, mesma convenção): `.terrdet-*` (detector) e `.cadbook-*` (caderno) |
| Icon library | none — glifos emoji inline (convenção já em uso: 🏦🛰️⭐🕘). **Novos glifos desta fase**: 📓 (Caderno de território, distinto de ⭐ Oportunidades — decisão explícita anti-colisão de conceito, ver Copywriting) e 🏗️ (pino "lote subutilizado" no mapa, mesmo hex `--gold` da Atenção/Caixa, diferenciado só por ícone — nunca por cor nova) |
| Font | `"IBM Plex Sans"` (UI/texto corrido), `"IBM Plex Mono"` (rótulos técnicos/status/mono), fallback `"Segoe UI",system-ui,sans-serif` — idêntico ao app |

**Gate shadcn:** não aplicável — mesma justificativa da Fase 15 (stack não é React/Next/Vite; nenhum `components.json` no repo).

---

## Spacing Scale

Reusa **verbatim** a escala declarada em `15-UI-SPEC.md` (nenhum valor novo introduzido nesta fase):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | Gap entre chip de status e ícone; gap entre linhas de metadado do item do caderno |
| sm | 8px | Gap entre chips de status/métrica; gap entre botões de ação de um item; gap na lista do detector (`.terrdet-list`) |
| md | 16px | Padding do corpo das novas seções (`#terrDetectorView`, `#cadernoBlock`); gap entre blocos filtro-Setor/filtro-Status |
| lg | 24px | Reservado — não usado nesta fase |
| — | 44px | Piso de touch target: TODOS os controles novos sem exceção — chips de status, botão "Detectar oportunidades", botão "Ver ficha"/"📓 Salvar no caderno" do item, `<select>` de filtro, botão "Remover do caderno", botões exportar/importar |

Exceptions: os componentes REUSADOS verbatim (`.detail`, `.dgrid .cell`, `.chips button`, `.seg button`, `.savedblock`, `.saveditem`) herdam os paddings legados não-múltiplos-de-4 já existentes (8px 10px, 11px 15px, 12px 14px etc.) — não reescritos. Só o CSS NOVO (`.terrdet-*`, `.cadbook-*`) segue a escala de 4px acima. A textarea de nota (`.cadbook-nota`) tem `min-height:80px` (não é touch target de toque único, é área de digitação — sem piso de 44px aplicável).

---

## Typography

Reusa **verbatim** a tabela da Fase 15 (nenhum tamanho/peso novo introduzido):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 13px | 500 | 1.5 |
| Label (mono) | 10.5px | 700 | 1.3 |
| Heading | 18px | 700 | 1.15 |

Fontes: Body/Heading em `"IBM Plex Sans"`; Label em `"IBM Plex Mono"`. Pesos usados NESTA fase: 500 e 700 apenas. (Display 22/800 da Fase 15 continua existindo no app, mas nenhum elemento novo desta fase o usa — removido da tabela para não induzir o executor a usá-lo [fix do checker].)

Uso nesta fase:
- **Heading** — título "Lotes subutilizados" (dentro do view-swap do `#terrPanel`); título "📓 Caderno de território" (bloco em `#savedBlocks`)
- **Body** — leitura comercial do item do detector; texto de ajuda LGPD; placeholder de tag/nota; texto dos `<select>` de filtro
- **Label (mono)** — rótulo de honestidade de amostra do detector; chips de métrica (`Constr. X m²`, `Terreno Y m²`, `R$/m² quadra Z`); rótulo do status no chip fechado do item do caderno

---

## Color

Reusa **verbatim** a paleta 60/30/10 da Fase 15 — **zero cor nova** introduzida nesta fase:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--paper)` `#e9e4d8` | Fundo do mapa/página, corpo dos itens do detector (`.terrdet-item`) |
| Secondary (30%) | `var(--paper-2)` `#f2eee4` | Corpo do view-swap do detector, corpo do bloco Caderno (`.savedblock` herdado), chips neutros de status/métrica |
| Accent (10%) | `var(--accent)` `#b5451f` | Reservado a: foco (`:focus-visible`), toasts de erro/falha de escrita — **NUNCA** usado nos status do caderno nem no pino do detector |
| Status — 1 cor reservada no caderno | `var(--status-bom)` `#2c5545` (= `--lot`) | **Único** status do caderno com cor — chip "Fechou" quando ativo (negócio concluído = sinal de sucesso); os outros 4 status (Não visitado/Visitei/Conversei/Recusou) usam chip **neutro** (`--ink`/`--paper-2`, mesmo par on-state de `.seg`) |
| Pino do detector | `var(--gold)` `#a8842c` (= mesmo hex de Atenção/Caixa) | Marcador "🏗️ Lote subutilizado" no mapa — reusa o hex já existente, diferenciado dos outros dois usos do mesmo hex só por **ícone+rótulo** (nunca por variação de cor/borda — regra já vigente desde a Fase 13) |
| Destructive | `var(--status-risco)` `#b5451f` (herdado) | Texto do botão "Remover do caderno" — única ação destrutiva nova desta fase |

**Regra "cor só onde significa status" aplicada ao caderno (decisão explícita do CONTEXT):** o ciclo de status do corretor (não visitado→visitei→conversei→recusou/fechou) é anotação de campo, não um score do sistema — por isso **não** recebe uma paleta completa de 5 cores (isso violaria VIS-01/a regra de reserva de cor). Só "Fechou" ganha cor (verde de sucesso, mesmo hex de "boa oportunidade" no vocabulário de pinos), porque é o único estado com significado comercial equivalente a um resultado positivo. Os demais 4 estados são cronologia neutra (chip cinza/tinta, sem cor).

**Pino "detectado" no mapa:** reusa o MESMO hex `--gold` já usado por Atenção e Caixa — não é uma 4ª categoria de cor, é uma 3ª categoria semântica sobre o mesmo tom. Diferenciador obrigatório: ícone `🏗️` + rótulo "Lote subutilizado" na legenda (`#pinoLegenda`) e no popup do pino, nunca variação de borda/opacidade (mesma regra documentada em PIN-01, linha 977 do app: "tracejado é ilegível em círculo de 8px").

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA — abrir detector (dentro de `#terrPanel`) | "Detectar oportunidades" (locked em `16-CONTEXT.md`) |
| CTA — item do detector, ver ficha | "Ver ficha" |
| CTA — item do detector, salvar | "📓 Salvar no caderno" (glifo 📓, não ⭐ — decisão explícita: ⭐ já significa "Oportunidade" da Fase 10; usar o mesmo glifo para o Caderno de território reintroduziria a colisão de conceito que o próprio CONTEXT pede para evitar) |
| CTA — ficha, salvar no caderno (novo botão, ao lado do ⭐ existente) | "📓 Salvar no caderno" (mesmo texto/glifo do item do detector — fonte única de cópia) |
| Voltar do detector às métricas | "‹ Território" (reusa `.backlist`, mesmo padrão do seletor de imóvel) |
| Heading do detector | "Lotes subutilizados" |
| Empty state — detector sem resultado | Heading: "Nenhuma oportunidade encontrada" · Body: "Não há lotes com baixo aproveitamento em quadra de alto valor nesta amostra do setor. Isso é raro, mas pode acontecer em setores pequenos ou já bem ocupados." |
| Rótulo de honestidade do detector (obrigatório, herdado da Fase 15) | "Amostra de {N} de {M} lotes" — mesmo formato, exibido abaixo do heading "Lotes subutilizados" |
| Limite de itens do detector | "Mostrando os 50 lotes mais subutilizados desta amostra." (só aparece quando a lista é truncada; ver Discretion/Paginação) |
| "Como funciona?" (disclosure do detector, reusa `.maisopcoes`) | Summary: "Como funciona?" · Corpo: "Lotes com pouca área construída em relação ao terreno — ou terreno vago — dentro de quadras com R$/m² mediano nas mais altas do setor. Registro sem área informada no cadastro nunca entra na lista; só terreno realmente vago (0 m² construído, dado presente) conta como oportunidade." |
| Loading — nova etapa (compute do detector, mesma gramática do `MOTION_MSG`) | "Procurando lotes subutilizados…" |
| Título do bloco no painel Consulta | "📓 Caderno de território" (nomenclatura travada — nunca "Oportunidades" nem confundir com o bloco existente) |
| Texto de ajuda LGPD do Caderno (obrigatório, cópia locked no CONTEXT) | "Suas notas ficam só no seu aparelho — nada é enviado a servidor algum." |
| Empty state — caderno vazio | Heading: (nenhum — bloco compacto, segue padrão `.savedempty` sem heading) · Body: "Nenhum lote no caderno ainda — toque '📓 Salvar no caderno' na ficha ou no detector." |
| Filtro — setor | `<select>` label visualmente oculto "Filtrar por setor", opção default "Todos os setores" |
| Filtro — status | `<select>` label visualmente oculto "Filtrar por status", opção default "Todos os status" |
| Status (enum fixo, rótulos exatos) | "Não visitado" · "Visitei" · "Conversei" · "Recusou" · "Fechou" |
| Placeholder — tag | "Tag (ex.: dono mora fora)" |
| Placeholder — nota | "Nota de campo — ex.: dono não atende, tentar de novo em 30 dias" |
| Ação — remover item do caderno | "Remover do caderno" |
| Destructive confirmation (sem modal — duplo toque, mesmo espírito leve do app) | 1º toque: texto do botão muda para "Toque de novo para remover — a nota se perde" por 3s; 2º toque dentro da janela executa a remoção e mostra toast "Removido do caderno." Se o usuário não repetir o toque em 3s, o botão volta ao texto original (nada é removido) |
| Toast — salvar no caderno (sucesso, ação discreta) | "Salvo no caderno." |
| Toast — editar status/tag/nota (sucesso) | nenhum toast — autosave silencioso (evita spam a cada tecla); só a UI atualiza (chip/texto refletem o novo valor) |
| Error state — falha de escrita no IndexedDB (qualquer operação: salvar/editar/remover/importar) | "Não foi possível salvar no caderno. Verifique o espaço do navegador e tente de novo." (cópia locked no CONTEXT — mesmo padrão §26.3 do app) |
| Error state — IndexedDB indisponível (feature-detect, ex. modo privado restritivo) | "Seu navegador não permite salvar itens no caderno neste dispositivo. Suas consultas continuam funcionando normalmente." (degradação anunciada, nunca falha silenciosa; botões "📓 Salvar no caderno" ficam desabilitados com este aviso em `title`) |
| Error state — abrir o banco falhou (nível DB, distinto de escrita) | "Não foi possível abrir o caderno. Tente recarregar a página." |
| Export — botão | "⬇ Exportar caderno (JSON)" |
| Export — toast sucesso | "{N} lotes exportados para JSON." |
| Import — botão | "⬆ Importar caderno" |
| Import — toast sucesso | "{N} lotes importados para o caderno." |
| Import — erro (JSON inválido/não é backup do caderno) | "Arquivo inválido — não é um backup do caderno. Nada foi importado." |
| Destructive confirmation — nenhuma outra ação destrutiva nesta fase | Export/Import não são destrutivos (import é aditivo — mescla por `ci`, nunca substitui o caderno inteiro sem aviso; se precisar sobrescrever um item existente, o import atualiza silenciosamente o registro daquele `ci`, sem confirmação — é o mesmo dado do próprio corretor, sem risco de perda de terceiro) |

Todo texto acima segue o gate §26 (Fase 14): verbo de ação nos botões, erro que explica + oferece saída, sem caixa alta em bloco, sem jargão na 1ª camada ("quantil"/"quartil" não aparece fora de "Como funciona?"), consistência de nomenclatura ("Caderno de território" nunca varia).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | nenhum | não aplicável |
| terceiros | nenhum | não aplicável — app não usa shadcn/registry de componentes |

---

## Contrato Específico do Detector & Caderno (extensão — não genérico do template)

### 1. Componente: Detector (view-swap dentro de `#terrPanel`)

- **Sem sheet nova** — decisão explícita (constraint da fase): abrir um segundo `.detail` sobre o `#terrPanel` já aberto violaria a regra "1 sheet por vez" já vigente no app. Em vez disso, o clique em "Detectar oportunidades" faz um **view-swap interno**: esconde `#terrGrid` + `.maisopcoes` (metodologia do choropleth) e revela `#terrDetectorView` (mesmo container `.detail#terrPanel`, mesmo z-index 500, herdado).
- **Botão de entrada:** novo item no rodapé de ações da Fase 15 (`#terrActions`) — "Detectar oportunidades" como **2ª ação secundária** (a Fase 15 já tem 1 primária "Colorir mapa por valor" + 1 secundária "Buscar lote no setor"; esta fase soma a 2ª secundária, respeitando o teto "1 primária + até 2 secundárias" da lei da tela/Fase 10).
**Foco visual (declaração explícita — pedido do checker):** no `#terrDetectorView`, o **âncora visual primário de cada item é a Linha 2 (leitura comercial)** — chips de métrica e ações são apoio secundário. No bloco Caderno, o âncora é o `<summary>` compacto (status + endereço); o editor aberto é secundário.

- **Estrutura do `#terrDetectorView`:**
  1. `.backlist` "‹ Território" (reuso literal da classe/posicionamento já usado no `#chooser`, linha 385 do CSS) — `onclick="fecharDetector()"` restaura a view de métricas.
  2. Heading "Lotes subutilizados" (18px/700) + rótulo de honestidade "Amostra de {N} de {M} lotes" (10.5px/700 mono, `--muted`) imediatamente abaixo — obrigatório, herdado da regra de honestidade estatística da Fase 15.
  3. Lista `#terrDetectorList` (`.terrdet-list`, `display:flex;flex-direction:column;gap:8px`) de até **50 itens** (ordenados do mais subutilizado ao menos) — nota de truncamento "Mostrando os 50 lotes mais subutilizados desta amostra." quando `total>50`.
  4. `<details class="maisopcoes">` "Como funciona?" (reuso literal do padrão `.maisopcoes` já usado na metodologia do choropleth).
- **Item da lista (`.terrdet-item`):** card reusando o estilo visual de `.dgrid .cell` (fundo `var(--paper)`, borda `1px solid var(--line)`, radius 2px, padding 8px 16px — escala 4px [fix do checker]):
  1. Linha 1 — endereço (ou "Quadra {q} · Lote {l}" se sem endereço), Body 13/500.
  2. Linha 2 — leitura comercial por template determinístico (ex.: "🏗️ Terreno vago em quadra valorizada" quando `areaedif===0`; "🏗️ Baixo aproveitamento em quadra valorizada" quando `areaedif/areaterr` baixo mas `areaedif>0`), Body 13/500, cor `--ink` normal (não usa `--accent`).
  3. Linha 3 — chips de métrica somente-leitura (mesma classe visual de `.chips button` mas `disabled`/sem estado `.on`, ou uma variante nova `.terrdet-chip` — Label 10.5/700 mono, fundo `var(--paper-2)`, borda `var(--line)`): "Constr. {areaedif} m²" · "Terreno {areaterr} m²" · "R$/m² quadra {valor}".
  4. Linha 4 — ações: "Ver ficha" (botão secundário, mesmo estilo `.detail .acts button` sem `.primary`) + "📓 Salvar no caderno" (idem) — ambos ≥44px de altura.
- **Guarda de qualidade de dado (herdada do CONTEXT, refletida na UI):** nenhum item aparece para registros com `areaedif`/`areaterr` ausentes (`null`/undefined) — só dado real entra na leitura comercial; a lista nunca mostra "—" como leitura (se o dado é incompleto, o lote simplesmente não é candidato, e isso é uma decisão de lógica pura, não de UI, mas a UI nunca precisa tratar um estado "leitura desconhecida").
- **Destaque no mapa (opcional, reforça mas não bloqueia):** enquanto `#terrDetectorView` está aberto, os lotes detectados (se a camada de lote do Leaflet estiver renderizada no zoom atual) recebem o estilo de pino "🏗️ Lote subutilizado" (`--gold`, mesmo hex de Atenção/Caixa) — nova entrada na legenda `#pinoLegenda`: `<span><i class="pl-dot" style="background:#a8842c"></i>🏗️ Lote subutilizado</span>` (o glifo 🏗️ substitui o texto puro, diferenciando do glifo 🏦 já usado por Caixa no mesmo hex).

### 2. Componente: Ação "Salvar no caderno" (ficha + detector)

- **Na ficha:** novo botão "📓 Salvar no caderno" entra em **`#dActsMore`** (o grupo "Mais opções", mesmo destino dos documentos da negociação da Fase 11.1) — NÃO em `#dActsPrim`, que já está no teto "1 primária + 2 secundárias" da lei da tela (Fase 10) [corrigido pós plan-check]. Nunca substitui/renomeia o botão ⭐ existente (Oportunidades e Caderno são conceitos distintos e coexistem, per CONTEXT).
- **No detector:** mesmo botão, mesmo texto, dentro de cada `.terrdet-item` (ver seção 1).
- **Comportamento:** clique grava no IndexedDB com status default `"nao_visitado"`, sem abrir nenhum editor — ação rápida de 1 toque (mesma filosofia do ⭐ existente). Toast de sucesso "Salvo no caderno."; toast de falha usa a cópia padrão de erro de escrita (ver Copywriting). Se o item já existir no caderno (mesmo `ci`), o botão mostra estado "✓ No caderno" (mesmo padrão visual de `.acts-save.is-saved`, reuso de classe) e o clique **não** duplica — abre direto o item no bloco Caderno (rolagem/scroll-into-view) para edição de status/tag/nota.

### 3. Componente: Bloco "Caderno de território" (`#cadernoBlock`, painel Consulta)

- **Posição:** dentro de `#savedBlocks`, **após** o bloco "🕘 Histórico" existente (nunca antes de "⭐ Minhas oportunidades" — preserva a hierarquia visual já estabelecida na Fase 10; Caderno é aditivo, não reordena o que existe).
- **Estrutura (reusa `.savedblock`/`.savedblock-head`/`.savedblock-tt`/`.savedblock-count` literalmente):**
  1. Cabeçalho: "📓 Caderno de território" + contador (`#cadernoCount`).
  2. `.dnote` (reuso literal) com o texto de ajuda LGPD: "Suas notas ficam só no seu aparelho — nada é enviado a servidor algum."
  3. Linha de filtros (`.cadbook-filtros`, `display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px`): `<select id="cadernoFiltroSetor">` + `<select id="cadernoFiltroStatus">`, ambos min-height 44px, mesmo estilo visual dos `<select>` já usados na busca por setor.
  4. Lista `#cadernoList` (`.savedlist` reusado) de itens `<details class="cadbook-item">`.
  5. Linha de export/import (`.cadbook-export-row`, mesma posição de `.savedblock-clear` do Histórico — canto do cabeçalho ou linha própria abaixo da lista): "⬇ Exportar caderno (JSON)" + "⬆ Importar caderno" (dispara `<input type="file" accept="application/json" hidden>`).
  6. Empty state (zero itens, nenhum filtro aplicado): `.savedempty` — "Nenhum lote no caderno ainda — toque '📓 Salvar no caderno' na ficha ou no detector."
- **Item do caderno (`<details class="cadbook-item">`):**
  - `<summary>` (fechado, compacto — mesma altura mínima de `.saveditem`, 44px): chip de status compacto (dot 8px + rótulo, neutro exceto "Fechou"=verde) + endereço/insc + meta "`Q{quadra} · L{lote} · {bairro}`" + prévia da nota (1 linha, truncada, se houver) + marcador `▸`/`▾` (mesma convenção de `.maisopcoes`).
  - Corpo aberto (`.cadbook-editor`, padding 16px 4px — escala 4px [fix do checker]):
    1. **Status** — 5 chips (`.cadbook-statuschips`, reuso do padrão visual `.seg button`): "Não visitado" · "Visitei" · "Conversei" · "Recusou" · "Fechou". Estado ativo: neutro (`background:var(--ink);color:var(--paper-2)`, mesmo par de `.seg button.on`) para os 4 primeiros; **"Fechou" ativo usa `background:var(--status-bom);color:#fff`** (única cor do conjunto). Autosave imediato ao clicar (sem confirmação, sem toast em sucesso).
    2. **Tag** — `<input type="text" maxlength="40">` placeholder "Tag (ex.: dono mora fora)", min-height 44px, mesmo estilo de input já usado no app (`.winput`). Autosave no blur.
    3. **Nota** — `<textarea maxlength="500" rows="3">` placeholder "Nota de campo — ex.: dono não atende, tentar de novo em 30 dias" (`.cadbook-nota`, border `1px solid var(--line)`, padding 8px, radius 2px, min-height 80px — sem piso de 44px, é campo de digitação multilinha; escala 4px [fix do checker]). Autosave no blur.
    4. **Ação destrutiva** — "Remover do caderno" (texto em `var(--status-risco)`, sem preenchimento, borda `var(--line)`, min-height 44px) com duplo-toque de confirmação (ver Copywriting).
- **Paginação/limite (Claude's discretion, per CONTEXT):** renderiza os primeiros 30 itens (ordenados por `savedAt` desc — mais recente primeiro); botão "Mostrar mais 30" (mesmo estilo texto de `.savedblock-clear`) ao final da lista quando há mais itens; filtro de Setor/Status reaplica a paginação do zero (volta a mostrar os primeiros 30 do subconjunto filtrado).

### 4. Persistência (contrato de UI sobre a camada de dados — não substitui a decisão técnica do planner)

- **Feature-detect obrigatório:** ao carregar o app (ou ao abrir o bloco Caderno pela 1ª vez), se `window.indexedDB` não existir/abrir, os botões "📓 Salvar no caderno" (ficha + detector) ficam desabilitados com o aviso de degradação (ver Copywriting) — nunca escondidos silenciosamente (o corretor precisa entender por que a ação não está disponível).
- **Falha de escrita sempre visível** (criar/editar/remover/importar) — toast padrão único, reusado em toda operação (ver Copywriting) — nunca falha silenciosa (mesma lei já aplicada a `oppSave`/`histSave` na Fase 10, agora estendida ao IndexedDB).
- **Sucesso silencioso nas edições inline** (status/tag/nota) — só a ação discreta de "Salvar no caderno"/"Remover do caderno" gera toast de sucesso; edições de campo (autosave) não geram toast (evita ruído a cada tecla/blur) — a UI reflete o novo estado imediatamente (chip/texto atualizado) como confirmação visual suficiente.
- **Export/Import:** botões sempre visíveis no cabeçalho do bloco Caderno (mesmo com 0 itens — export de um caderno vazio é um no-op com toast "0 lotes exportados para JSON."; import funciona mesmo antes de qualquer item salvo).

### 5. Acessibilidade

- Chips de status: `role="group"` com `aria-label="Status do lote"`; cada chip é `<button aria-pressed="true/false">` (mesmo padrão `aria-pressed` já usado no toggle da legenda/choropleth da Fase 15).
- `<details class="cadbook-item">`/`.maisopcoes`: navegável por teclado nativamente (elemento HTML `<details>`), sem JS extra de foco necessário.
- Toques ≥44px: TODOS os controles novos sem exceção (chips, botões de ação, `<select>` de filtro, botão remover, export/import) — ver Spacing Scale.
- Pino "🏗️ Lote subutilizado": nunca depende só de cor — ícone + rótulo no popup e na legenda (mesma regra PIN-01).
- Duplo-toque de confirmação (remover do caderno): o texto do botão muda visivelmente (não é um estado só de cor) — leitor de tela percebe a mudança de rótulo via `aria-live` implícito do próprio botão (texto do elemento muda, é lido na próxima interação/foco).

---

## Nomenclatura sugerida (não vinculante — planner decide os nomes finais)

CSS novo: `.terrdet-list`, `.terrdet-item`, `.terrdet-chip`, `.cadbook-filtros`, `.cadbook-item`, `.cadbook-editor`, `.cadbook-statuschips`, `.cadbook-nota`, `.cadbook-export-row`.

IDs novos: `#terrDetectBtn`, `#terrDetectorView`, `#terrDetectorList`, `#terrDetectorHeading`, `#cadernoBlock`, `#cadernoList`, `#cadernoCount`, `#cadernoFiltroSetor`, `#cadernoFiltroStatus`, `#cadernoExport`, `#cadernoImportBtn`, `#cadernoImportFile`.

Funções puras sugeridas (RADAR_PURE, TDD): `detectarSubutilizados(lotes, thresholds)`, `leituraDetector(item)`. Funções de I/O sugeridas: `cadernoAbrirDB()`, `cadernoSalvar(item)`, `cadernoAtualizar(ci, patch)`, `cadernoRemover(ci)`, `cadernoListar({cdbairro, status})`, `cadernoExportarJSON()`, `cadernoImportarJSON(file)`, `sanitizeAttrs(obj)` (extensão/reuso de `sanitiza()` existente).

Nenhuma CSS var nova (`--terr-*`/`--status-*` reusadas verbatim) — zero cor nova introduzida por esta fase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
