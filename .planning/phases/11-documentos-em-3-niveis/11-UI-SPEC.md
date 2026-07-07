---
phase: 11
slug: documentos-em-3-niveis
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-07
---

# Phase 11 — UI Design Contract

> Visual and interaction contract para DOCUMENTOS EM 3 NÍVEIS: novo passo 0 "Seletor de finalidade" (substitui a entrada direta de `abrirLaudo()`), novo passo "Confiança + pendências" (antes de gerar), nova etapa de "Revisão pré-PDF", novo template de saída "Ficha rápida", e ajustes ao laudo/PTAM existente (identificação/finalidade/metodologia/responsabilidade técnica + campo CNAI separado do CRECI). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Escopo desta fase:** reenquadra o wizard `.wiz`/`#wiz` existente (não recomeça) e adiciona os passos novos exigidos por DOC-01/02/03. Zero token novo — 100% reuso do sistema cartográfico/oxide das Fases 8/9/10. Herda 1:1: paleta, tipografia, spacing, padrão de sheet (`.wiz`/`.wtop`/`.wdots`/`.wbody`/`.wfoot`), padrão de card (`.wcard`), padrão de segmented control (`.seg`), padrão de chips (`.chips`), padrão de toast, `esc()`/IN-01, guarda do clique real para PDF (`ec9f129`). Refino visual global (respiro, skeleton, motion coreografado) é Fase 13. Minutas de negociação são Fase 11.1.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (app HTML único, sem build, sem framework de componentes) |
| Preset | não aplicável |
| Component library | none — CSS vanilla, reuso de `.wiz`/`.wtop`/`.wdots`/`.wbody`/`.wcard`/`.wlabel`/`.winput`/`.seg`/`.chips`/`.wfoot`/`.wnext`/`.toast`/`.lcard`/`.lrow`/`.lass` já existentes |
| Icon library | emoji textual (📄 🧾 📋 💬 💲 🏠 🔑 ✅ ⚠️ 🖨️) — mesmo padrão já usado em `.laudobtn`/`.acts button`/Fase 10; NENHUM ícone SVG novo |
| Font | `"IBM Plex Sans"` (UI/copy/corpo do laudo) + `"IBM Plex Mono"` (rótulos técnicos — `.wlabel`-adjacent, cabeçalho `.lrun`, metodologia) |

Identidade: cartográfica/oxide (papel + tinta + carimbo vermelho-óxido), herdada 1:1 das Fases 8/9/10. Bordas 1.5–2px sólidas, `border-radius:2px`. Nenhum componente novo introduz `border-radius` diferente de 2px.

---

## Tokens Reusados (zero hex novo)

| Var CSS | Hex | Uso nesta fase |
|---------|-----|-----------------|
| `--paper` | `#e9e4d8` | fundo do app/sheet; fundo dos cards de opção (Seletor de finalidade); fundo dos itens do checklist de pendências |
| `--paper-2` | `#f2eee4` | fundo do container `.wiz` (herdado); fundo do card de recomendação; fundo da Ficha rápida (fundo de página) |
| `--ink` | `#141a1f` | texto principal; borda dos cards não-selecionados no Seletor de finalidade; texto do PTAM/Relatório |
| `--line` | `#c3b9a3` | borda padrão de cards; divisores tracejados entre secções (`.wcard`, checklist, revisão) |
| `--muted` | `#57503f` | texto secundário — "porque" do score de confiança, disclaimer, metodologia, texto de item não-selecionado |
| `--accent` | `#b5451f` | selo "Recomendado" no card de documento; CTA final "Gerar PDF"; aviso forte de confiança baixa (borda, nunca só cor); foco de teclado (herdado) |
| `--accent-ink` | `#8f3116` | hover/active do CTA "Gerar PDF"; hover do selo/estado selecionado |
| `--lot` | `#2c5545` | reforço opcional de "pendência resolvida" no checklist (ex.: item marcado como confirmado) — nunca único veículo de significado |
| `--gold` | `#a8842c` | reservado a status de score (Fase 9) — não introduzido nesta fase; se usado, só como eco do rótulo "confiança média" já existente na ficha (reuso, não nova aplicação) |

Nenhuma cor nova. O selo "Recomendado" reusa o MESMO par cor/hover do `.stamp`/`.badge` (borda+texto `--accent`) já aprovado nas Fases 8/9 — não é uma cor de status nova, é o mesmo "carimbo" visual do app.

---

## Spacing Scale

Reuso da escala já implícita no código (múltiplos de 4, alvo de toque 44px):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | gap entre ícone e rótulo nos cards de opção; gap entre item do checklist e seu botão "confirmar" |
| sm | 8px | gap entre os 3 cards de documento (Seletor de finalidade); gap entre itens do checklist de pendências |
| md | 16px | padding interno dos cards (`.wcard`-like); margem entre secções da Revisão pré-PDF |
| touch | **44px mínimo** | cada opção de finalidade (4 botões); cada card de documento tocável (3); cada item do checklist com input opcional; CTA final "Gerar PDF"; botões "Editar"/"Confirmar" na Revisão |
| lg | 22px | padding do `.wbody` (herdado 1:1 de `.wiz .wbody{padding:4px 22px 20px}`) |

Exceções: nenhuma. Todo elemento novo herda o mínimo de 44px já padrão no app.

---

## Typography

Reuso total — nenhum tamanho/peso novo introduzido.

| Role | Size | Weight | Line Height | Onde já existe / reuso |
|------|------|--------|-------------|--------------------------|
| Heading do passo (`.wh1`) | 20px | 800 | 1.2 | `.wh1{font:800 20px/1.2}` já existente — reuso literal em todos os passos novos |
| Subheading (`.wsub`) | 13px | 500 | 1.4 | `.wsub` já existente — reuso literal |
| Rótulo de campo (`.wlabel`) | herdado (mesmo peso/tamanho já usado antes de cada `.winput`/`.seg`) | — | — | reuso literal, sem variação |
| Opção de finalidade (pergunta) | 15px | 700 | 1.3 | um degrau abaixo do `.wh1`, acima do `.wsub` — mesma família tipográfica já usada em `.wcard b` (destaque dentro de card) |
| Card de recomendação — selo | 10px | 700 | 1 | mono, mesmo padrão de `.badge`/`.stamp` uppercase letter-spacing já usado nas Fases 8/9 |
| Card de recomendação — "porque" | 12.5px | 500 | 1.5 | próximo de `.dnote{font:500 10.5px/1.45}` (Fase 9), um degrau acima por ser justificativa central da tela |
| Nome do documento (nos 3 cards) | 14px | 700 | 1.25 | próximo de `.dtag{font:700 12px/1.2}`, um degrau acima por ser o rótulo principal do card |
| Descrição do documento (1 linha, nos 3 cards) | 12px | 500 | 1.4 | próximo de `.dnote` |
| Item do checklist de pendências | 13.5px | 500 | 1.4 | mesma família de `.wsub`/corpo de card |
| Nível de confiança (alta/média/baixa) | 16px | 700 | 1.2 | reuso do padrão de rótulo de score já usado na ficha (Fase 9) — mesmo tamanho do "porque" central de score |
| Aviso forte (confiança baixa) | 13px | 700 | 1.4 | mesmo peso 700 já usado em avisos, cor `--accent` como reforço (nunca só a cor) |
| Corpo do laudo/PTAM (`.lcard p`) | herdado (14px/500/1.5, já existente no CSS de impressão) | — | — | reuso literal, sem alteração |
| Ficha rápida — faixa em destaque | 28px | 800 | 1.1 | maior peça tipográfica do documento; usa o MESMO par peso/família de `.prow .hero{font-size:28px... }` (herdado do laudo atual, ver Componente 4) |
| Ficha rápida — corpo/leitura | 13.5px | 500 | 1.55 | reuso de `.dleitura p` (Fase 9) |
| Ficha rápida — rodapé/contato | 11px | 500 | 1.4 | reuso de `.lmiudo`/disclaimer |

Sem novo weight (400/500/700/800 já cobrem tudo — 600 já usado em botões permanece reservado a botões, não introduzido aqui como novo uso).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--paper` `#e9e4d8` | fundo do sheet/wizard; fundo dos cards não-recomendados |
| Secondary (30%) | `--paper-2` `#f2eee4` | fundo do container `.wiz`; fundo do card de recomendação; fundo de página da Ficha rápida |
| Accent (10%) | `--accent` `#b5451f` | **reservado exclusivamente para**: (1) selo "Recomendado" no card de documento recomendado, (2) CTA final "Gerar PDF" (fundo sólido, é a ação de maior intenção da fase — só 1 por etapa), (3) borda do aviso forte de confiança baixa (nunca preenchimento sólido de alerta — é aviso, não erro destrutivo), (4) foco de teclado (`:focus-visible`, herdado global) — accent NUNCA aparece nos 2 cards não-recomendados nem nos itens do checklist de pendências (esses são informativos/neutros) |
| Status positivo (reforço opcional) | `--lot` `#2c5545` | não obrigatório; se usado, só como ícone/borda fina de item do checklist já confirmado pelo usuário (reforço, nunca único veículo de significado — o texto sempre acompanha, ex. "✓ Área confirmada") |
| Destructive | não aplicável nesta fase | não há ação destrutiva nova — "voltar"/"editar" na Revisão pré-PDF não perde dados (LZ permanece em memória até fechar o wizard); nenhum hex destrutivo novo é introduzido |

**Regra de acessibilidade (herdada, travada nas Fases 8/9/10):** cor é sempre reforço, nunca único veículo de significado. Selo "Recomendado" sempre acompanhado de texto ("Recomendado para você"); aviso de confiança baixa sempre acompanhado do texto do nível ("Confiança: baixa") — nunca só a borda vermelha.

**Contraste AA (herdado, mesma tabela das Fases 8/9/10):**
- `--muted #57503f` sobre `--paper`/`--paper-2` → ~7:1
- `--ink #141a1f` sobre `--paper`/`--paper-2` → >13:1
- `--accent #b5451f` sobre `--paper` (borda+texto, peso ≥600, ≥13px) → ~4.9:1, aprovado
- CTA "Gerar PDF" com fundo `--accent` e texto `#fff` → par já aprovado em `.acts button.primary`/`.wnext`, reuso literal

---

## Componente 1 — Seletor de Finalidade (DOC-01, novo passo 0 do wizard)

**Localização:** substitui a entrada direta de `abrirLaudo()`. O botão "📄 Gerar documento" (Fase 9/10, `#dActsPrim`) passa a chamar `abrirSeletorFinalidade()` em vez de `abrirLaudo()` diretamente. Este seletor é um NOVO passo que precede o passo 0 atual ("O imóvel") — reindexar: seletor de finalidade vira passo `-1` conceitual, exibido ANTES de `LZ` existir (não é um passo do array `LZ.step`, é uma tela intermediária própria com o mesmo container `.wiz`, reusando `#wiz` com um modo `LZ.fase==="finalidade"` antes de avançar para os passos numerados).

**Estrutura — pergunta única + 4 opções:**

```html
<div class="wh1">Para que você precisa do documento?</div>
<div class="wsub">Escolha a finalidade — recomendamos o tipo certo pra você. As 3 opções continuam disponíveis.</div>
<div class="fingrid">
  <button type="button" class="finop" onclick="finSet('apresentar')">📱<br>Apresentar ao cliente</button>
  <button type="button" class="finop" onclick="finSet('captar')">🏠<br>Captar o proprietário</button>
  <button type="button" class="finop" onclick="finSet('justificar')">💲<br>Justificar o preço</button>
  <button type="button" class="finop" onclick="finSet('formal')">🧾<br>Documento técnico formal</button>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.fingrid` | `display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:14px` | 2×2 em mobile 375 (cada célula ≥44px de altura, cabe folgado) e desktop — grid único, sem breakpoint (o conteúdo é curto) |
| `.finop` | `min-height:76px; border:1.5px solid var(--line); background:var(--paper); color:var(--ink); font:700 13px/1.3 "IBM Plex Sans"; border-radius:2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; padding:10px 8px` | card tocável, ícone emoji em linha própria (20px via `font-size` do emoji, herdado do padrão de `.chips`/`.seg`) |
| `.finop:hover/:focus-visible` | `border-color:var(--ink)` (hover), `outline:2px solid var(--accent)` (foco, herdado global) | consistente com `.seg button:hover` |

**Mapa determinístico de recomendação (RADAR_PURE, sem IA):**

| Finalidade escolhida | Documento recomendado | Condição CNAI |
|---|---|---|
| Apresentar ao cliente | Ficha rápida | não se aplica |
| Captar o proprietário | Ficha rápida | não se aplica |
| Justificar o preço | Relatório de avaliação | não se aplica |
| Documento técnico formal | **PTAM** se `radar_prof.cnai` preenchido; **Relatório de avaliação** se não | condiciona a recomendação (nunca bloqueia acesso ao PTAM) |

**Card de recomendação (aparece após escolher a finalidade, ainda dentro do mesmo passo — sem novo clique de "continuar" isolado):**

```html
<div class="finrec">
  <div class="finrec-selo">Recomendado para você</div>
  <div class="finrec-doc">Relatório de avaliação</div>
  <div class="finrec-porque">Você quer justificar o preço com dados — o Relatório traz comparáveis e metodologia, sem o peso formal do PTAM.</div>
</div>
<div class="findocs">
  <button type="button" class="findoc is-rec" onclick="finEscolherDoc('relatorio')">
    <span class="findoc-selo">Recomendado</span>
    <span class="findoc-nome">Relatório de avaliação</span>
    <span class="findoc-desc">Comparativo com dados e metodologia — uso comercial</span>
  </button>
  <button type="button" class="findoc" onclick="finEscolherDoc('ficha')">
    <span class="findoc-nome">Ficha rápida</span>
    <span class="findoc-desc">1 página, direto ao ponto — pra enviar por WhatsApp</span>
  </button>
  <button type="button" class="findoc" onclick="finEscolherDoc('ptam')">
    <span class="findoc-nome">Laudo / PTAM</span>
    <span class="findoc-desc">Estrutura formal, com identificação e responsabilidade técnica</span>
  </button>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.finrec` | `background:var(--paper-2); border:1.5px solid var(--accent); border-radius:2px; padding:14px; margin-top:16px` | card de destaque — única borda accent desta tela, reservada à recomendação |
| `.finrec-selo` | `font:700 10px/1 "IBM Plex Mono"; letter-spacing:.07em; text-transform:uppercase; color:var(--accent)` | mesmo padrão de rótulo mono uppercase já usado em `.eyebrow`/`.badge` |
| `.finrec-doc` | `font:800 17px/1.2 "IBM Plex Sans"; color:var(--ink); margin:6px 0` | nome do documento recomendado, destaque |
| `.finrec-porque` | `font:500 12.5px/1.5 "IBM Plex Sans"; color:var(--muted)` | frase de justificativa — nunca genérica, sempre cita a finalidade escolhida |
| `.findocs` | `display:flex; flex-direction:column; gap:8px; margin-top:14px` | 3 opções sempre tocáveis, recomendada primeiro |
| `.findoc` | `min-height:44px; border:1.5px solid var(--line); background:var(--paper); border-radius:2px; padding:10px 14px; text-align:left; display:flex; flex-direction:column; gap:2px` | card neutro (não-recomendado) |
| `.findoc.is-rec` | `border-color:var(--accent); border-width:2px` | reforço visual de "esta é a recomendada" além do selo textual |
| `.findoc-selo` | `font:700 9px/1 "IBM Plex Mono"; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:2px` | só aparece no card recomendado |
| `.findoc-nome` | `font:700 14px/1.25 "IBM Plex Sans"; color:var(--ink)` | nome do documento |
| `.findoc-desc` | `font:500 12px/1.4 "IBM Plex Sans"; color:var(--muted)` | 1 linha, sem jargão |

**Comportamento:**
- `finSet(finalidade)`: grava `LZ.finalidadeUso` (motivo de uso — distinto de `LZ.finalidade`, que é o campo formal "Venda/compra/Locação/..." já existente no passo do perfil), calcula a recomendação pelo mapa acima (função pura `recomendarDocumento({finalidadeUso, cnai})`), renderiza o card de recomendação + as 3 opções na mesma tela (sem navegação extra).
- `finEscolherDoc(tipo)`: grava `LZ.tipoDoc` (`"ficha"|"relatorio"|"ptam"`), avança para o passo 0 numerado atual ("O imóvel"), preservando o resto do wizard 1:1.
- Override livre: mesmo sem CNAI, o card "Laudo / PTAM" permanece tocável e funcional — nunca cinza/desabilitado/bloqueado (linguagem de responsabilidade, não trava, ver Estado "Sem CNAI").
- Botão "◂ Voltar" do `.wtop` neste passo fecha o seletor (equivalente a `fecharLaudo()`), pois é o primeiro passo da jornada.

---

## Componente 2 — Painel de Confiança + Pendências (DOC-02)

**Localização:** novo passo do wizard, inserido ANTES do passo final de geração — ordem revisada do wizard: **0 Finalidade (Componente 1) → 1 O imóvel → 2 Valor → 3 Fotos → 4 Solicitante/perfil (+ CNAI) → 5 Confiança + pendências (novo) → 6 Revisão pré-PDF (novo) → Gerar PDF**. Reusa `scoreConfianca()` (Fase 9) já calculado sobre os dados coletados nos passos anteriores (área, nº comparáveis, atípico, venal).

```html
<div class="wh1">Antes de gerar</div>
<div class="wsub">Confira o nível de confiança dos dados — algumas informações ajudam a refinar o documento.</div>
<div class="confcard conf-media">
  <div class="conf-nivel">Confiança: média</div>
  <div class="conf-porque">Faltou a área confirmada; 6 comparáveis na vizinhança.</div>
</div>
<div class="checklist">
  <div class="checkitem">
    <span class="checkitem-txt">Área privativa confirmada</span>
    <input class="winput checkitem-input" inputmode="numeric" placeholder="ex.: 84 m²" oninput="LZ.privativa=parseInt(this.value.replace(/\D/g,''),10)||null">
  </div>
  <div class="checkitem is-ok">
    <span class="checkitem-txt">✓ Estado de conservação declarado</span>
  </div>
  <div class="checkitem">
    <span class="checkitem-txt">Estado da documentação</span>
    <div class="seg checkitem-seg">
      <button aria-pressed="false" onclick="wizSet('docOk',true)">Em ordem</button>
      <button aria-pressed="false" onclick="wizSet('docOk',false)">Pendências</button>
    </div>
  </div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.confcard` | `background:var(--paper-2); border:1.5px solid var(--line); border-radius:2px; padding:14px; margin-top:12px` | card neutro por padrão |
| `.confcard.conf-baixa` | `border-color:var(--accent); border-width:2px` | reforço visual SÓ no nível baixo (aviso forte) — alta/média mantêm borda `--line` |
| `.conf-nivel` | `font:700 16px/1.2 "IBM Plex Sans"; color:var(--ink)` | nível sempre por extenso ("Confiança: alta/média/baixa"), nunca só um ícone/cor |
| `.conf-porque` | `font:500 12.5px/1.5 "IBM Plex Sans"; color:var(--muted); margin-top:6px` | reuso literal do `porque[]` de `scoreConfianca()` — mesma frase já usada na ficha (Fase 9), sem reescrever |
| `.checklist` | `display:flex; flex-direction:column; gap:8px; margin-top:14px` | lista de pendências acionáveis |
| `.checkitem` | `display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:44px; padding:8px 10px; border:1px solid var(--line); border-radius:2px; background:var(--paper)` | 1 pendência por linha |
| `.checkitem.is-ok` | `border-color:var(--line); opacity:.75` (sem accent — "ok" é neutro, não é conquista visual) | item já satisfeito, sem ação pendente |
| `.checkitem-input` / `.checkitem-seg` | reuso literal de `.winput`/`.seg` já existentes, sem CSS novo | inputs opcionais que refinam o documento — nunca obrigatórios para avançar |

**Regra de conteúdo do checklist (determinístico, a partir de `scoreConfianca()` + campos do wizard):**

| Pendência (quando aplicável) | Vira input? | Campo alimentado |
|---|---|---|
| Área não confirmada | Sim — input numérico | `LZ.privativa` (mesmo campo do passo Valor) |
| Poucos comparáveis (<3) | Não — informativo | nenhum (é dado externo, não editável aqui) |
| Imóvel atípico na amostra | Não — informativo | nenhum |
| Valor venal não informado | Não — informativo (explica a limitação) | nenhum |
| Estado de conservação | Já resolvido (sempre preenchido no passo 0, tem default "Bom") | mostrado como `.is-ok` |
| Estado da documentação | Sim — segmented "Em ordem / Pendências" (NOVO campo `LZ.docOk`, opcional, default indefinido) | `LZ.docOk` → entra nas ressalvas do PTAM/Relatório quando `false` |

**Comportamento:**
- Painel recalcula `scoreConfianca()` ao entrar no passo (usa `LZ.privativa`, `LZ.comps`, `LZ.a`, `LZ.valor` já coletados).
- Preencher a área no checklist atualiza `LZ.privativa` e reflete IMEDIATAMENTE no `.conf-nivel`/`.conf-porque` (sem precisar sair e voltar ao passo) — reuso do mesmo padrão reativo de `wizSet()`.
- Nunca bloqueia avanço — mesmo com confiança baixa, o botão "Continuar" permanece ativo (ver Estado "Confiança baixa" para o aviso forte antes de gerar, que é textual/visual, não um bloqueio funcional).

---

## Componente 3 — Etapa de Revisão Pré-PDF (DOC-03)

**Localização:** último passo do wizard antes de `montarLaudo()`. Mostra os campos sensíveis e os textos principais que ENTRARÃO no documento, editáveis inline, com o CTA final "Gerar PDF" substituindo o atual "Gerar PDF" do `.wfoot` (reuso do botão, sem duplicar).

```html
<div class="wh1">Revisão final</div>
<div class="wsub">Confira e ajuste o que for preciso — o PDF sai do jeito que você deixar aqui.</div>
<div class="revsec">
  <div class="revsec-lbl">Documento</div>
  <div class="revsec-val">Relatório de avaliação</div>
</div>
<div class="revsec">
  <span class="wlabel">Solicitante</span>
  <input class="winput" value="${esc(LZ.solicitante)}" oninput="LZ.solicitante=this.value">
</div>
<div class="revsec">
  <span class="wlabel">Finalidade declarada</span>
  <select class="winput" oninput="LZ.finalidade=this.value">...</select>
</div>
<div class="revsec">
  <span class="wlabel">Valor de venda sugerido</span>
  <input class="winput" inputmode="numeric" value="${LZ.valor}" oninput="LZ.valor=parseInt(this.value.replace(/\D/g,''),10)||null">
</div>
<div class="revsec">
  <span class="wlabel">Observações / ressalvas adicionais</span>
  <textarea class="winput" oninput="LZ.obs=this.value">${esc(LZ.obs)}</textarea>
</div>
<div class="revsec revsec-preview">
  <span class="wlabel">Como vai aparecer — assinatura</span>
  <div class="revprev">${esc(LZ.prof.nome)}${comCreci?" · CRECI "+esc(LZ.prof.creci):""}</div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.revsec` | `margin-bottom:16px` | 1 bloco por campo revisável — reuso do espaçamento vertical já usado entre `.wlabel`+`.winput` no restante do wizard |
| `.revsec-lbl` | `font:600 10px/1.4 "IBM Plex Mono"; letter-spacing:.06em; text-transform:uppercase; color:var(--muted)` | mesmo padrão de rótulo mono já usado em `.zapgroup-lbl` (Fase 10) |
| `.revsec-val` | `font:700 15px/1.3 "IBM Plex Sans"; color:var(--ink)` | valor não-editável (nome do documento é fixo, escolhido no Componente 1 — mudar de documento exige voltar ao seletor, não é editável aqui) |
| `.revprev` | `background:var(--paper); border:1px dashed var(--line); border-radius:2px; padding:8px 10px; font:500 13px/1.4 "IBM Plex Sans"; color:var(--ink)` | pré-visualização textual da linha de assinatura tal como sairá no PDF — evita surpresa no documento final |

**Campos revisáveis (sensíveis + textos principais):**

| Campo | Editável aqui | Observação |
|---|---|---|
| Solicitante | Sim | já existente, reposicionado para a Revisão |
| Finalidade declarada | Sim | mesmo `<select>` já existente (FINS), reposicionado |
| Valor de venda sugerido | Sim | mesmo input já existente no passo Valor — muda aqui reflete lá (mesmo `LZ.valor`) |
| Observações/ressalvas | Sim | mesmo `LZ.obs` |
| Nome / CRECI / CNAI | Não (link "Editar perfil" volta ao passo 4) | dados de identidade do subscritor não se editam na revisão — evita erro de digitação no campo de responsabilidade técnica sem revisitar o passo correto |
| Tipo de documento escolhido | Não (link "Trocar documento" volta ao Componente 1) | escolha estrutural, não um texto a revisar |

**Comportamento:**
- CTA final único: **"Gerar PDF"** (`.wnext` reusado, texto já dinâmico por `LZ.step`) — clique real do usuário aciona `montarLaudo()` diretamente (preserva a guarda `ec9f129`: nenhuma chamada automática/assíncrona dispara o PDF).
- Link textual "Editar perfil" / "Trocar documento" dentro da Revisão usa o MESMO padrão de link discreto já usado em "Limpar histórico" (Fase 10): `font:600 11px/1; text-decoration:underline; color:var(--muted); min-height:32px` (ação de baixa frequência).
- Se `LZ.valor==null` ao tentar gerar, mantém o toast já existente ("Informe o valor de venda sugerido...") e volta ao passo Valor — comportamento herdado, sem mudança.

---

## Componente 4 — Ficha Rápida (novo template de saída, DOC-01)

**Estrutura:** renderização própria (`montarFichaRapida()`, paralela a `montarLaudo()`), 1 página, mesma pipeline de exibição (`#laudo` → `#laudoView` → `imprimirLaudo()` no clique real). Reusa `dadosFicha()`/`leituraPratica()`/`mercadoEstimado()` já existentes — não recalcula nada.

```html
<div class="lrun"><span>RADAR FUNDIÁRIO · DADOS PÚBLICOS · GOIÂNIA/GO</span><span>EMITIDO EM ${hoje}</span></div>
<div class="lbrand"><div class="t"><small>Radar Fundiário · Cadastro Imobiliário de Goiânia</small>Ficha rápida do imóvel</div>
  <div class="m">${esc(p.nome)}${comCreci?" · CRECI "+esc(p.creci):""}<br>Goiânia/GO · ${hoje}</div></div>

<div class="fr-hero">
  <div class="fr-faixa">${brlC(est.lo)} – ${brlC(est.hi)}</div>
  <div class="fr-faixa-lbl">Faixa estimada de valor</div>
</div>

<div class="lcard"><h3>Resumo do imóvel</h3>
  <p>${addr} — ${bairro}. Q ${quadra} · L ${lote} · ${areaTxt}.</p></div>

<div class="lcard"><h3>Leitura prática</h3>
  <p>${leituraPratica}</p></div>

<div class="lcard"><h3>Comparáveis</h3>
  <ul class="fr-comps">
    <li>${comp1}</li><li>${comp2}</li><li>${comp3}</li>
  </ul></div>

<div class="lcard"><h3>Ressalvas</h3>
  <p class="lmiudo">Faixa estimada com base em dados públicos do cadastro municipal — recomenda-se confirmar área, estado de conservação e documentação antes de decidir. Não substitui avaliação formal.</p></div>

<div class="fr-contato">${esc(p.nome)}${comCreci?" · CRECI "+esc(p.creci):""}${contato?" · "+esc(contato):""}</div>
<div class="foot">RADAR FUNDIÁRIO · DADOS PÚBLICOS · GOIÂNIA/GO · EMITIDO EM ${hoje}</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.fr-hero` | `background:var(--paper-2); border:2px solid var(--accent); border-radius:2px; padding:18px; text-align:center; margin:16px 0` | único bloco com borda accent no documento — a faixa é o dado mais importante da Ficha |
| `.fr-faixa` | `font:800 28px/1.1 "IBM Plex Sans"; color:var(--ink)` | reuso do MESMO tamanho/peso de `.prow .hero` (herdado do laudo atual) |
| `.fr-faixa-lbl` | `font:600 11px/1.2 "IBM Plex Mono"; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); margin-top:4px` | rótulo discreto sob o número — reuso de padrão mono já existente |
| `.fr-comps` | `list-style:none; padding:0; display:flex; flex-direction:column; gap:6px` — cada `<li>` reusa `font:500 13px/1.4` (corpo padrão) | 2-3 itens, conclusão-primeiro (mesmo padrão CMP-01 da Fase 9: "8% abaixo da mediana", não tabela técnica) |
| `.fr-contato` | `font:700 13px/1.3 "IBM Plex Sans"; color:var(--ink); margin-top:14px; padding-top:10px; border-top:1px dashed var(--line)` | contato do corretor em destaque — a Ficha é o documento de fechamento com o cliente, o contato precisa ser visível sem precisar procurar |

**Regras de conteúdo (1 página, tom comercial, zero jargão):**
- Título fixo: **"Ficha rápida do imóvel"** — nunca "Relatório"/"Laudo" (evita confusão de nível de formalidade).
- Nunca usa "mediana"/"percentil"/"quartil" — só linguagem de `leituraPratica()` (já filtrada de jargão na Fase 9).
- Comparáveis: no máximo 3, frase única cada, no padrão CMP-01 já estabelecido ("Rua X, nº — 8% abaixo da faixa desta região").
- Ressalvas: sempre presentes, nunca omitidas (mesmo em confiança alta) — 1 parágrafo curto, reuso do tom "recomenda-se confirmar" já travado no CONTEXT.md.
- Contato do corretor: omitido (sem placeholder) se `radar_prof` vazio — mesma regra da Fase 10 (nunca "[seu nome]").

---

## Componente 5 — PTAM: Additions sobre o Laudo Atual

**Contexto:** o laudo atual (`montarLaudo()`) já contém boa parte da estrutura PTAM (identificação, finalidade, metodologia, bloco de assinatura `.lass`). Esta fase adiciona o que falta e SEPARA o campo CNAI do campo CRECI (hoje fundidos em um único input de texto livre `"CRECI 12345 · CNAI 6789"`).

**Mudança no passo de perfil (Componente do wizard, passo "Solicitante e você"):**

```html
<span class="wlabel">CRECI (opcional)</span>
<input class="winput" placeholder="ex.: 12345" value="${esc(p.creci||"")}" oninput="LZ.prof.creci=this.value">
<span class="wlabel">CNAI (opcional) — habilita o PTAM</span>
<input class="winput" placeholder="ex.: 6789" value="${esc(p.cnai||"")}" oninput="LZ.prof.cnai=this.value">
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| Ambos os inputs | reuso literal de `.winput`/`.wlabel` — nenhum CSS novo | separação em 2 campos distintos (`radar_prof.creci`, `radar_prof.cnai`), substitui o campo único atual |

**Bloco de responsabilidade técnica no PTAM (`.lass`, ajustado):**

```html
<div class="lass">
  <div class="linha"></div>
  ${esc(p.nome)}${comCreci?" — CRECI "+esc(p.creci):""}${comCnai?" — CNAI "+esc(p.cnai):""}
  <div class="lass-resp">Responsável técnico pela avaliação, nos termos da Res. COFECI nº 1.066/2007.</div>
</div>
```

| Elemento | Estilo | Fonte da regra |
|----------|--------|-----------------|
| `.lass-resp` | `font:500 10.5px/1.4 "IBM Plex Sans"; color:var(--muted); margin-top:4px` | linha adicional de qualificação, só aparece quando `comCnai` (reuso do padrão `.lmiudo`) |

**Blocos do PTAM (identificação/finalidade/metodologia/responsabilidade — mapeamento ao que já existe):**

| Bloco exigido | Já existe? | Ação nesta fase |
|---|---|---|
| Identificação completa das partes/imóvel | Sim (`.lcard` "Características do imóvel" + linha "Solicitante") | Nenhuma — reuso |
| Finalidade declarada | Sim (`.lcard` "Finalidade") | Nenhuma — reuso |
| Metodologia (comparativo direto, NBR 14653/COFECI) | Sim (`.lcard` "Metodologia, fontes e ressalvas") | Nenhuma — reuso |
| Tratamento da amostra | Sim (parágrafo de `compsHtml` + gráfico `.lbar`) | Nenhuma — reuso |
| Conclusão fundamentada | Sim (`.lcard.preco` "Precificação final") | Nenhuma — reuso |
| Ressalvas | Sim (parágrafo de ressalvas em "Metodologia, fontes e ressalvas") | Nenhuma — reuso |
| Bloco de responsabilidade técnica (nome/CRECI/CNAI) | Parcial (nome/CRECI já existem) | Adicionar CNAI separado (ver acima) |
| Local para assinatura | Sim (`.lass .linha`) | Nenhuma — reuso |

**Regra de título (ajustada — CNAI, não só CRECI, decide o título "PTAM"):**

```js
const comCreci = !!(p.creci||"").trim();
const comCnai  = !!(p.cnai||"").trim();
const titulo = comCnai
  ? "Parecer Técnico de Avaliação Mercadológica (PTAM)"
  : "Relatório de Referência de Mercado";
```

Isto substitui a lógica atual (`comCreci` decidindo o título) — decisão travada no 11-CONTEXT.md: **CNAI condiciona a recomendação/título do PTAM, CRECI por si só não é suficiente**. CRECI sozinho (sem CNAI) mantém `titulo="Relatório de Referência de Mercado"`, mas ainda exibe "CRECI ####" na linha de assinatura quando presente.

---

## Estados Transversais

| Estado | Comportamento visual | Regra |
|--------|----------------------|-------|
| **Sem CNAI, finalidade = "Documento técnico formal"** | Card de recomendação aponta "Relatório de avaliação" (não PTAM), com `.finrec-porque`: *"O PTAM pressupõe habilitação CNAI — preencha no perfil se possuir. Por enquanto, recomendamos o Relatório de avaliação."* | PTAM continua tocável/acessível no `.findocs` (nunca cinza/desabilitado) — recomendação, não trava |
| **Confiança baixa, antes de gerar** | No Componente 2 (`.confcard.conf-baixa`, borda `--accent` 2px) + aviso adicional no `.wfoot` antes do CTA final: banner curto acima do botão "Gerar PDF" — *"Confiança baixa: recomenda-se confirmar os pontos acima antes de compartilhar este documento."* — banner usa `border-left:3px solid var(--accent); background:var(--paper); padding:10px 12px; font:600 12.5px/1.4; color:var(--ink)` | Aviso é textual + borda (nunca só cor); NÃO bloqueia o clique em "Gerar PDF" — é aviso de responsabilidade, a decisão final é do usuário |
| **DCUR fechado** (usuário navegou/fechou a ficha com o wizard aberto) | Wizard usa a MESMA guarda já existente (`getComps` captura `lz0`, ignora update se `LZ` mudou) — se `DCUR` for nulificado externamente, `abrirSeletorFinalidade()`/`abrirLaudo()` já retornam antecipadamente (`if(!DCUR)return;`, herdado) | Nenhum componente novo desta fase introduz um caminho que ignore essa guarda — Seletor de Finalidade, Confiança e Revisão todos leem de `LZ.a` (cópia local), nunca de `DCUR` diretamente após aberto |
| **Perfil ausente no Componente 4 (Ficha rápida)** | Contato do corretor omitido (sem placeholder) — mesma regra da Fase 10 | Nunca "[seu nome]"/"[CRECI]" no PDF |
| **Documentação com pendências (`LZ.docOk===false`)** | Entra como frase adicional nas Ressalvas do Relatório/PTAM: *"O interessado declarou pendências na documentação do imóvel — recomenda-se regularização antes de qualquer decisão."* | Determinístico, sem jargão jurídico além do necessário |

---

## Mobile 375 × Desktop 1280

| Aspecto | Mobile (≤820px) | Desktop (≥821px) |
|---------|-------------------|----------------------|
| Seletor de Finalidade — `.fingrid` | grid 2×2, cada célula ~155px de largura útil | idêntico — grid não escala além de 2 colunas (conteúdo curto, 4 colunas ficaria apertado até em desktop; `.wbody` já tem `max-width:560px`) |
| Card de recomendação + `.findocs` | coluna única, largura total do `.wbody` | idêntico |
| Painel de Confiança + checklist | `.checkitem` empilhados, input/seg ocupam largura total abaixo do texto se não couberem na mesma linha (`flex-wrap:wrap`) | `.checkitem` numa linha só (texto + input/seg lado a lado, texto tem espaço) |
| Revisão pré-PDF | campos empilhados, largura total (herdado do padrão `.winput` já responsivo) | idêntico — `.wbody` centraliza com max-width |
| Ficha rápida (impressão) | herda o mesmo CSS de impressão do laudo atual (`.print-laudo`) — 1 página garantida pelo conteúdo reduzido (menos secções que Relatório/PTAM) | idêntico |
| PTAM — campos CRECI/CNAI | 2 inputs empilhados no passo de perfil | idêntico (mesma largura de coluna do wizard) |

---

## Acessibilidade / Motion (obrigatório)

- **Contraste AA**: todas as combinações reusam pares já aprovados nas Fases 8/9/10 (ver tabela em Color) — nenhuma combinação nova introduzida.
- **Botões reais**: todo elemento tocável novo é `<button type="button">` com `onclick` inline (nunca `<div onclick>`) — Componente 1 (4 opções + 3 cards de documento), Componente 2 (segmented de documentação), Componente 3 (links "Editar"/"Trocar").
- **`aria-pressed`**: cards do Componente 1 (`.finop`) e segmented `.seg` do checklist usam `aria-pressed` sincronizado com o estado — mesmo padrão já usado em `.seg button`/`.moderow button` (Fases 8/9).
- **Foco ao trocar de passo/tela**: reuso 1:1 do padrão já existente em `wizRender()` — `stepMudou` foca o `.wh1` do novo passo (`tabIndex=-1; focus({preventScroll:true})`), aplicado também ao passo Confiança e à Revisão (são passos do MESMO `wizRender()`, não sheets novos).
- **Foco no Seletor de Finalidade**: ao abrir (`abrirSeletorFinalidade()`), foco vai para o primeiro `.finop` (mesmo padrão de "primeiro elemento interativo" — não para o `.wh1`, pois aqui a ação imediata é escolher, não ler).
- **`esc()` obrigatório**: qualquer interpolação de dado do imóvel/perfil (endereço, bairro, nome, CRECI, CNAI, solicitante, observações) nos templates de PTAM/Relatório/Ficha rápida passa por `esc()` antes de entrar no DOM — mesmo contrato IN-01 já travado nas Fases 8/9/10. Este contrato aplica-se também aos NOVOS campos `LZ.prof.cnai` e `LZ.docOk`.
- **`prefers-reduced-motion`**: nenhuma transição nova é introduzida por estes componentes (são passos do wizard já existente, reusam a mesma entrada de sheet `REDUCE`-aware já implementada); a troca de card recomendado/não-recomendado no Componente 1 é *snap* (troca de classe), sem animação customizada.
- **Zero regressão do clique real de PDF**: `imprimirLaudo()`/`montarLaudo()` continuam disparados SOMENTE pelo clique explícito no CTA final da Revisão (guarda `ec9f129`) — nenhuma chamada assíncrona (ex.: cálculo de confiança, preview da assinatura) aciona a geração do documento.
- **SEARCHTOKEN**: não aplicável a esta fase (nenhum novo caminho de busca é introduzido).

---

## Copywriting Contract

Tom herdado do Plano UX §31 (linguagem de responsabilidade) — corretor profissional: claro, honesto, sem promessa absoluta ("faixa estimada", "recomenda-se confirmar"), nunca "documento tem validade legal automática".

| Element | Copy / Esqueleto |
|---------|------|
| **Pergunta do Seletor de Finalidade** | "Para que você precisa do documento?" |
| **Subtítulo do Seletor** | "Escolha a finalidade — recomendamos o tipo certo pra você. As 3 opções continuam disponíveis." |
| **Opção — apresentar** | "📱 Apresentar ao cliente" |
| **Opção — captar** | "🏠 Captar o proprietário" |
| **Opção — justificar** | "💲 Justificar o preço" |
| **Opção — formal** | "🧾 Documento técnico formal" |
| **Selo de recomendação** | "Recomendado para você" (título do card) / "Recomendado" (selo compacto nos 3 cards) |
| **Porque — Ficha rápida (apresentar/captar)** | "Você quer [apresentar ao cliente / captar o proprietário] — a Ficha rápida é direta, cabe numa tela e vai bem no WhatsApp." |
| **Porque — Relatório (justificar)** | "Você quer justificar o preço com dados — o Relatório traz comparáveis e metodologia, sem o peso formal do PTAM." |
| **Porque — PTAM (formal, com CNAI)** | "Você pediu um documento técnico formal — com sua habilitação CNAI, o PTAM é o parecer técnico completo, com responsabilidade profissional." |
| **Porque — Relatório em vez de PTAM (formal, sem CNAI)** | "O PTAM pressupõe habilitação CNAI — preencha no perfil se possuir. Por enquanto, recomendamos o Relatório de avaliação." |
| **Card — Relatório de avaliação (descrição)** | "Comparativo com dados e metodologia — uso comercial" |
| **Card — Ficha rápida (descrição)** | "1 página, direto ao ponto — pra enviar por WhatsApp" |
| **Card — Laudo / PTAM (descrição)** | "Estrutura formal, com identificação e responsabilidade técnica" |
| **Título do passo Confiança** | "Antes de gerar" |
| **Subtítulo do passo Confiança** | "Confira o nível de confiança dos dados — algumas informações ajudam a refinar o documento." |
| **Nível de confiança (rótulo)** | "Confiança: alta" / "Confiança: média" / "Confiança: baixa" |
| **Porque da confiança** | reuso literal de `scoreConfianca().porque` (Fase 9) — não reescrever |
| **Item checklist — área** | "Área privativa confirmada" (com input) |
| **Item checklist — conservação (ok)** | "✓ Estado de conservação declarado" |
| **Item checklist — documentação** | "Estado da documentação" (segmented: "Em ordem" / "Pendências") |
| **Aviso forte — confiança baixa (antes de gerar)** | "Confiança baixa: recomenda-se confirmar os pontos acima antes de compartilhar este documento." |
| **Título do passo Revisão** | "Revisão final" |
| **Subtítulo do passo Revisão** | "Confira e ajuste o que for preciso — o PDF sai do jeito que você deixar aqui." |
| **CTA final** | "Gerar PDF" (reuso literal do `.wnext` já existente) |
| **Link — editar perfil** | "Editar perfil" |
| **Link — trocar documento** | "Trocar documento" |
| **Rótulo — CRECI (perfil)** | "CRECI (opcional)" |
| **Rótulo — CNAI (perfil)** | "CNAI (opcional) — habilita o PTAM" |
| **Título Ficha rápida** | "Ficha rápida do imóvel" |
| **Rótulo da faixa (Ficha rápida)** | "Faixa estimada de valor" |
| **Ressalva fixa (Ficha rápida)** | "Faixa estimada com base em dados públicos do cadastro municipal — recomenda-se confirmar área, estado de conservação e documentação antes de decidir. Não substitui avaliação formal." |
| **Título PTAM (com CNAI)** | "Parecer Técnico de Avaliação Mercadológica (PTAM)" (reuso literal, inalterado) |
| **Título Relatório (sem CNAI)** | "Relatório de Referência de Mercado" (reuso literal, inalterado — nome interno do template; nome de produto exibido ao usuário nos cards é "Relatório de avaliação", ver nota abaixo) |
| **Linha de qualificação do subscritor (PTAM, quando CNAI presente)** | "Responsável técnico pela avaliação, nos termos da Res. COFECI nº 1.066/2007." |
| **Ressalva adicional — documentação pendente** | "O interessado declarou pendências na documentação do imóvel — recomenda-se regularização antes de qualquer decisão." |
| **Destrutivo nesta fase** | Nenhuma ação destrutiva nova — "Editar perfil"/"Trocar documento" são navegação, não perda de dados; voltar passos no wizard preserva `LZ` em memória |

**Nota de nomenclatura (trava de consistência, LING-01):** o nome exibido ao usuário na UI (Seletor de Finalidade, cards, títulos de passo) é sempre **"Relatório de avaliação"** — o texto literal "Relatório de Referência de Mercado" é o TÍTULO IMPRESSO no cabeçalho do PDF (`.lbrand .t`), herdado 1:1 do código atual, não deve ser alterado nesta fase (fora de escopo — é o nome jurídico/técnico do documento gerado, distinto do nome comercial usado na navegação). Mesma lógica para PTAM: nome de produto e nome impresso já coincidem.

Todo texto acima é pt-BR sem jargão na 1ª camada, verbo de ação nos botões/CTAs, sem caixa alta em bloco longo, sem gíria/ironia, sem promessa absoluta — alinhado ao gate de linguagem da Fase 14 (esta fase antecipa o padrão, não substitui o gate final).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | não aplicável — app sem shadcn | not required |
| third-party | nenhum | not required |

Nenhum registry de componentes é usado neste projeto — app HTML único, sem build. Gate de registry não se aplica.

---

## Fora de Escopo (não tocar nesta fase)

- Minutas de Proposta/Exclusividade/Contrato + OCR (Fase 11.1) — infraestrutura de wizard/PDF é reusada, mas o conteúdo dessas minutas não entra aqui.
- Export `.docx` (v2.2+).
- Skeleton/motion coreografado do fluxo de documentos (Fase 13) — este SPEC usa apenas o motion `REDUCE`-aware já existente do `.wiz`.
- Refino visual global (respiro, pinos semânticos) — Fase 13.
- Alteração do texto impresso "Relatório de Referência de Mercado" no cabeçalho do PDF — nome de produto na UI muda para "Relatório de avaliação", o texto jurídico impresso permanece (ver Copywriting Contract).
- Nenhuma cor fora de `--paper/--paper-2/--ink/--line/--muted/--accent/--accent-ink/--lot/--gold` aparece em qualquer componente novo.

---

## Verificação (preview, mobile 375 + desktop 1280)

- Clicar em "📄 Gerar documento" na ficha abre o Seletor de Finalidade (não mais direto no passo "O imóvel").
- Escolher qualquer uma das 4 opções de finalidade mostra o card de recomendação com "porque" específico + os 3 documentos tocáveis, recomendado sempre em primeiro com o selo "Recomendado".
- Escolher "Documento técnico formal" SEM CNAI no perfil recomenda "Relatório de avaliação" (não PTAM) com a frase de explicação; o card "Laudo / PTAM" continua clicável e funcional.
- Escolher "Documento técnico formal" COM CNAI no perfil recomenda "Laudo / PTAM".
- Tocar em qualquer um dos 3 documentos (mesmo o não-recomendado) avança normalmente para o passo "O imóvel" do wizard existente.
- Passo "Antes de gerar" mostra o nível de confiança por extenso + "porque" (reuso literal de `scoreConfianca`), e o checklist lista pendências acionáveis; preencher a área no checklist atualiza o nível de confiança na mesma tela, sem recarregar.
- Com confiança baixa, o card tem borda accent 2px E aparece o banner de aviso forte acima do CTA final — o clique em "Gerar PDF" continua funcionando (não bloqueado).
- Passo "Revisão final" mostra solicitante/finalidade/valor/observações editáveis + preview da linha de assinatura; alterar o valor aqui reflete no PDF gerado.
- Clicar em "Gerar PDF" na Revisão é o ÚNICO gatilho do PDF — nenhuma chamada anterior (cálculo de confiança, preview) dispara `imprimirLaudo()`.
- Gerar a Ficha rápida produz 1 página com: faixa em destaque, resumo, leitura prática, 2-3 comparáveis, ressalvas, contato do corretor (omitido se perfil vazio) — nunca mostra "mediana"/"percentil".
- No passo de perfil, CRECI e CNAI são 2 campos distintos; preencher só CRECI mantém o título "Relatório de Referência de Mercado"; preencher CNAI muda o título para "Parecer Técnico de Avaliação Mercadológica (PTAM)".
- Bloco de assinatura do PTAM mostra nome + CRECI (se houver) + CNAI (se houver) + linha de qualificação COFECI quando CNAI presente.
- Nenhum elemento tocável novo mede menos de 44px em DevTools (mobile 375).
- `prefers-reduced-motion` ativo: nenhuma transição nova além das já existentes no `.wiz`.
- Nenhuma cor fora da paleta declarada aparece em qualquer componente novo.
- Fechar o wizard em qualquer passo novo (Finalidade/Confiança/Revisão) e reabrir `abrirSeletorFinalidade()` sempre começa do zero (não retém escolha de finalidade da sessão anterior — mesmo padrão do `abrirLaudo()` atual que reseta `LZ`).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
