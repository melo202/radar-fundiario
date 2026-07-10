---
phase: 18
slug: inteligencia-urbanistica-plano-diretor
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-10
---

# Phase 18 — UI Design Contract

> Visual and interaction contract para a Fase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022). Gerado por gsd-ui-researcher em **AUTO MODE** (sem perguntas ao usuário — decisões derivadas de `18-CONTEXT.md`, `.planning/research/v2.1/PLANO-DIRETOR.md` §3-4, e do design system já em produção em `radar-goiania.html`, com **reuso verbatim** dos tokens de `15-UI-SPEC.md`/`17-UI-SPEC.md`). Fase de 3 componentes visuais novos sobre uma base quase toda reusada — o único artefato genuinamente novo é a paleta de zonas do Plano Diretor, sourced ao vivo da simbologia oficial do ArcGIS (`Mapa_ModeloEspacial/MapServer`, consultado nesta pesquisa em 2026-07-10). Verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — app HTML único (`radar-goiania.html`), sem framework/build/registry de componentes (herdado, inalterado) |
| Preset | não aplicável (stack não é React/Next/Vite) |
| Component library | none — CSS custom. Esta fase **reusa verbatim**: `.detail`, `.dgrid`/`.cell`/`.k`/`.v`, `.dnote`, `.chips`, `.skel-card`/`.skel-line`, `.foot`/`.maisopcoes` (accordions técnicos, padrão Fase 9), `#terrPanel`/`#terrGrid`/`#terrLegenda`/`.terr-swatch(-col)` (Fase 15), `.acts` (rodapé "1 primária + 2 secundárias"), `esc()`/data-attributes (lição CR-01, Fase 16), `--status-*` (Fase 13). Classes **novas** desta fase (prefixadas por feature, mesma convenção): `.durbanistico`/`.foot` (accordion Urbanístico na ficha), `.urb-badge` (badge de contexto AEIS/APAC/ADD/Eixo/Corredor), `.urb-ca` (linha de CA reusando `.dvalor-v`), `.zone-swatch` (variante de `.terr-swatch` para a legenda de zonas) |
| Icon library | none — glifos emoji inline. **Zero glifo novo**: o accordion usa texto puro ("Urbanístico"), mesma convenção de `"Dados técnicos"`/`"Metodologia e fontes"` (sem ícone no `<summary>`); badges são texto+cor, nunca emoji (mesma regra de a11y já vigente para pinos — cor nunca é o único sinal) |
| Font | `"IBM Plex Sans"` (UI/texto corrido), `"IBM Plex Mono"` (rótulos técnicos/mono), fallback `"Segoe UI",system-ui,sans-serif` — idêntico ao app |

**Gate shadcn:** não aplicável — mesma justificativa das Fases 15/16/17 (stack não é React/Next/Vite; nenhum `components.json` no repo).

---

## Spacing Scale

Reusa **verbatim** a escala de `15-UI-SPEC.md`/`17-UI-SPEC.md` (nenhum valor novo introduzido):

| Token | Value | Usage nesta fase |
|-------|-------|-------------------|
| xs | 4px | Gap entre badges de contexto (`.urb-badge`); gap entre swatch e rótulo na legenda de zonas (reusa `.terr-swatch-col`) |
| sm | 8px | Gap entre linhas do accordion Urbanístico (Macrozona/Unidade/CA/badges); padding interno de `.urb-badge` |
| md | 16px | Padding do corpo do accordion (`.footbody`, herdado — mesma régua de `.dtecnico`/`.dmetodologia`) |
| lg | 24px | Reservado — não usado nesta fase |
| — | 44px | Piso de touch target: o botão de retry do estado "parcial" (`#urbRetry`); os 2 chips do seletor de camada temática (`.chips button`, herdado — já ≥44px por padrão global) |

Exceptions: os badges de contexto (`.urb-badge`) são **texto estático, não interativo** — não têm piso de 44px (mesma lógica já documentada para `.ddiff-item`/`.dnote` na Fase 17: leitura, não controle de toque). O `<summary>` do accordion Urbanístico herda o piso de toque já existente em `.foot>summary` (inalterado, não redeclarado).

---

## Typography

Reusa **verbatim** a tabela das Fases 15/16/17 (nenhum tamanho/peso novo introduzido):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 13px | 500 | 1.5 |
| Label (mono) | 10.5px | 700 | 1.3 |
| Heading | 18px | 700 | 1.15 |

Fontes: Body em `"IBM Plex Sans"`; Label em `"IBM Plex Mono"`. Pesos usados NESTA fase: 500 e 700 apenas.

*Exceção documentada (mesmo padrão de reuso já aceito em `15-UI-SPEC.md` para `.dvalor-v`/`.score-num`, peso 800):* o número de CA básico/máximo, QUANDO `conferido:true`, reusa a classe existente `.dvalor-v`/`.score-num` (22px/800) — é reaproveitamento de componente já aprovado, não um 3º peso introduzido por esta fase. Quando `conferido:false`, **nenhum número aparece** (REGRA DE OURO) — o espaço onde o número estaria é ocupado por uma nota `.dnote` (10.5px/500, muted), nunca por um placeholder tipo "—" que sugira "número existe mas não carregou" (é uma omissão deliberada, não uma falha de carregamento).

Uso nesta fase:
- **Body** — texto de cada linha do accordion (Macrozona, Unidade Territorial, altura, notas de conferência); texto dos badges (`.urb-badge`); rótulos da legenda de zonas
- **Label (mono)** — siglas entre parênteses nos badges (ex. "(AEIS)"); rótulo de faixa da legenda de zonas (ex. "AA")
- **Heading** — nenhum novo; o accordion usa `<summary>` já estilizado por `.foot>summary` (existente, não redeclarado)

---

## Color

Reusa **verbatim** a paleta 60/30/10 das Fases 15/16/17 para o CHROME da UI. A ÚNICA cor genuinamente nova desta fase é a paleta de zonas do Plano Diretor (fills sourced ao vivo da simbologia oficial do ArcGIS — ver seção dedicada abaixo).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--paper)` `#e9e4d8` | Fundo do mapa/página (inalterado) |
| Secondary (30%) | `var(--paper-2)` `#f2eee4` | Corpo do accordion Urbanístico (mesmo fundo de `.dtecnico`/`.dmetodologia`); fundo dos `.cell` de Macrozona/Unidade/CA |
| Accent (10%) | `var(--accent)` `#b5451f` | Reservado a: foco (`:focus-visible`), toasts de erro, estado `.on` PRÉ-EXISTENTE de `.chips button` (seleção do seletor de camada temática — reuso da semântica JÁ estabelecida de `.chips`, não uma interpretação nova de accent) — **NUNCA** usado nos fills de zona nem nos badges de contexto |
| Badge — restrição (AEIS/APAC/ADD) | `var(--status-atencao)` `#a8842c` | Fundo/borda do `.urb-badge` quando a unidade territorial é uma restrição de uso/gabarito |
| Badge — potencial (Eixo/Corredor) | `var(--status-bom)` `#2c5545` | Fundo/borda do `.urb-badge` quando o contexto é um bônus de mobilidade/adensamento |
| Destructive | não aplicável | Nenhuma ação destrutiva nesta fase (consulta urbanística é leitura, não escrita) |

**Classificação de badge (decisão explícita — resolve a instrução do CONTEXT "restrição = atenção, potencial = positivo" para os 5 badges nomeados):**

| Badge | Classificação | Justificativa |
|-------|---------------|----------------|
| AEIS | atenção | Uso do lote fica vinculado a programas de interesse social — restringe a flexibilidade de mercado geral que o corretor comercial normalmente assume; tratado como due-diligence extra, mesma leitura de ADD/APAC |
| APAC | atenção | Restrição de gabarito/fachada sobre bem tombado/entorno — já citada como restrição em `PLANO-DIRETOR.md` §1.2 |
| ADD | atenção | Sinal negativo explícito de score em `PLANO-DIRETOR.md` §4 ("adensamento desincentivado") |
| Eixo de Desenvolvimento | positivo | Sinal positivo forte de score (mobilidade + adensamento permitido), `PLANO-DIRETOR.md` §4 |
| Corredor (de Transporte) | positivo | Mesma classificação de Eixo — proximidade a transporte coletivo estruturante |

*Nota: OOAU (layer 32) é consultada pela arquitetura (bateria de 9 layers do CONTEXT) mas **não tem badge dedicado** nesta fase — o CONTEXT só nomeia 5 badges (AEIS/APAC/ADD/eixo/corredor); OOAU aparece apenas como camada no choropleth de zonas (§ abaixo), não na ficha. AA/AOS não são badges — são o valor do campo primário "Unidade Territorial" em si, não um modificador de contexto.*

### Paleta de Zonas do Plano Diretor (PD-05) — nova, sourced ao vivo da simbologia oficial

Fills e traços consultados diretamente em `Mapa_ModeloEspacial/MapServer/{7,28,29,30,31,32}?f=json` (drawingInfo.renderer, 2026-07-10) — **fonte primária GIS**, não uma paleta inventada:

| Unidade Territorial | Layer | Fill oficial | Traço oficial | Token novo |
|---|---|---|---|---|
| Área Adensável (AA) | 31 | `rgb(255,170,0)` | `rgb(225,170,0)` | `--zone-aa:#ffaa00` / `--zone-aa-line:#e1aa00` |
| Desaceleração de Densidade (ADD) | 30 | `rgb(255,190,232)` | `rgb(110,110,110)` | `--zone-add:#ffbee8` / `--zone-add-line:#6e6e6e` |
| Ocupação Sustentável (AOS) | 29 | *pattern fill (hachura), sem hex sólido* — traço `rgb(109,187,67)` | idem | `--zone-aos:#6dbb43` (aproximação sólida do traço, engenharia própria — ver nota) / `--zone-aos-line:#4a8a2e` |
| Interesse Social (AEIS) | 7 | `rgb(190,232,255)` | `rgb(0,0,0)` | `--zone-aeis:#bee8ff` / `--zone-aeis-line:var(--ink)` |
| Patrimônio Cultural (APAC, bem tombado) | 28 | `rgb(255,127,127)` | transparente (sem traço oficial) | `--zone-apac:#ff7f7f` / `--zone-apac-line:var(--ink)` (traço próprio — sem ele o polígono fica sem borda perceptível no mapa) |
| Outorga Onerosa (OOAU) | 32 | `rgb(255,255,115)` | `rgb(110,110,110)`, sem traço renderizado oficialmente | `--zone-ooau:#ffff73` / `--zone-ooau-line:#6e6e6e` |
| Sem classificação específica (dentro da Macrozona Construída, fora das 6 camadas acima) | — | não aplicável | não aplicável | `--zone-none:#d8d3c4` / `--zone-none-line:var(--muted)` — **cor de engenharia própria**, não oficial (a Macrozona Construída em si é transparente na simbologia oficial, ver nota) |

```css
--zone-aa:#ffaa00;      --zone-aa-line:#e1aa00;
--zone-add:#ffbee8;     --zone-add-line:#6e6e6e;
--zone-aos:#6dbb43;     --zone-aos-line:#4a8a2e;
--zone-aeis:#bee8ff;    --zone-aeis-line:#141a1f;   /* = --ink */
--zone-apac:#ff7f7f;    --zone-apac-line:#141a1f;   /* = --ink, engenharia própria (oficial é transparente) */
--zone-ooau:#ffff73;    --zone-ooau-line:#6e6e6e;
--zone-none:#d8d3c4;    --zone-none-line:#57503f;   /* = --muted, engenharia própria */
```

**Notas de simplificação (não-bloqueantes, mesma bandeira HUMAN-UAT já usada para satélite na Fase 15):**
1. AOS é oficialmente um *pattern fill* (hachura via imagem referenciada); reproduzir isso em Leaflet exigiria um sprite pattern — fora do orçamento desta fase. Usa-se uma cor sólida derivada do traço oficial (`rgb(109,187,67)` → `#6dbb43`), documentada explicitamente como aproximação, não como cor oficial de fill.
2. `--zone-none`/`--zone-apac-line`/`--zone-aos-line` são engenharia própria (não vieram do renderer) — sempre que uma cor NÃO é sourced diretamente da simbologia oficial, este documento marca isso explicitamente (mesma disciplina de honestidade do REGRA DE OURO, estendida a cor/simbologia).
3. **Sobreposição de camadas:** um lote pode estar simultaneamente em AA + AEIS (camadas booleanas independentes, não mutuamente exclusivas). O choropleth de zonas renderiza as 6 camadas como **layers Leaflet separados e semi-transparentes, empilhados** (nunca um único fill "vencedor" por prioridade) — onde há sobreposição, as cores se misturam visualmente pela transparência (mesmo princípio de `bairroLayer`/`lotLayer` empilhados já em produção). Isso é uma decisão de design explícita (Claude's Discretion do CONTEXT) que evita inventar uma regra de prioridade arbitrária entre zonas — se a leitura ficar "poluída" em áreas de sobreposição densa, fica como item de verificação visual HUMAN-UAT, não bloqueante.

**Opacidade por camada de fundo (reusa a mesma engenharia da Fase 15 — escala .15-.25 CARTO / .35-.45 satélite):** diferente do choropleth de valor (5 faixas sequenciais, opacidade escalonada por quantil), a paleta de zonas é **categórica** (cada zona é um tipo distinto, não um degrau de intensidade) — por isso usa opacidade **flat** por camada, não escalonada:

| Fundo | `fillOpacity` (todas as 6 camadas de zona) |
|-------|------------------------------------------|
| CARTO light | `.22` |
| Satélite | `.42` |

Traço (`weight`): mesma rampa por zoom já existente em `baiStyle()` (`0.5+t*0.7` CARTO / `1.2+t*0.6` satélite). Cor do traço sobre satélite: swap para `var(--paper-2)` (mesmo princípio "solta o wash, reforça o traço" já documentado na Fase 15) — **exceto** `--zone-aeis-line`/`--zone-apac-line` que já usam `--ink`, cujo swap sobre satélite também vai para `--paper-2` (regra uniforme, sem exceção por camada).

**Contraste (pedido do checker, decisão travada do CONTEXT):** os 7 pares `--zone-*`/`--zone-*-line` são testados visualmente contra AMBOS os fundos (CARTO light e satélite) — critério de aceite do ROADMAP (PD-05 "legível sobre CARTO e satélite"); a verificação fina em device real sob luz externa é HUMAN-UAT não-bloqueante (mesmo padrão da Fase 15).

**Regra "cor só onde significa status" aplicada à paleta de zonas:** nenhuma das 6 cores de zona reusa `--accent`/`--status-*` (vermelho-óxido, dourado, verde) — mistura zoneamento com o vocabulário de risco/oportunidade dos PINOS confundiria "está em zona X" com "é um imóvel bom/arriscado", mesma lógica já fixada para o choropleth de valor na Fase 15 (VIS-01).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (painel do território, camada de zonas) | "Colorir por zonas do Plano Diretor" |
| Primary CTA (painel do território, camada de valor — inalterada) | "Colorir por valor" |
| Empty state — fora da Macrozona Construída (heading) | "Fora da Macrozona Construída" |
| Empty state — fora da Macrozona Construída (body) | "Este imóvel está em {macrozonaRuralNome} — zona rural do Plano Diretor. Aqui, o Anexo Urbano (CA, altura, unidades territoriais) não se aplica; esta consulta é só para a área urbana da cidade." |
| Empty state — CA/altura não conferidos (nota dentro do accordion resolvido) | "CA e altura desta zona ainda não foram conferidos contra o Anexo oficial da LC 349/2022 — mostramos só a zona ({sigla}), que vem direto do mapa oficial da Prefeitura." |
| Error state — consulta falhou por completo | "Não foi possível consultar o Plano Diretor para este imóvel agora. Toque para tentar de novo." |
| Error state — parcial (algumas camadas falharam) | "Algumas informações do Plano Diretor não carregaram — o que aparece abaixo já é confiável, só pode estar incompleto." + botão "Tentar de novo" |
| Loading (accordion abrindo) | "Consultando o Plano Diretor…" (mesma gramática do `MOTION_MSG`: gerúndio, reticências, zero jargão) |
| Loading (legenda/camada de zonas no mapa) | "Carregando zonas do setor…" |
| Disclaimer fixo (SEMPRE visível no rodapé do accordion Urbanístico, texto exato do CONTEXT — não paráfrase) | "Informação urbanística indicativa, extraída do Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Uso do Solo da SEPLANH." |
| Rótulo Macrozona (quando resolvido, dentro da Macrozona Construída) | "Macrozona Construída" |
| Rótulo Unidade Territorial | "{sigla} — {nomeCompleto}" (ex.: "AA — Área Adensável") |
| CA (quando `conferido:true`) | "CA básico {ca_basico}x · CA máximo {ca_maximo}x" |
| Usos (quando `usos_conferido:true` — AA/ADD, Art. 196 I/II) | "Usos: {usos}" (ex.: "Usos: qualquer uso") |
| Ocupação por altura (AA/ADD, `nota_altura` conferido — Art. 190 II/III) | "100% do terreno até 11 m; 50% acima (sem altura máxima definida)" |
| CA — Macrozona Construída sem unidade (estado g) | "CA básico 1,0x" (nunca máximo — não há unidade que o defina; Art. 242, VII) |
| Empty state — dentro da Macrozona Construída, sem unidade territorial (estado g) | "Dentro da Macrozona Construída, sem unidade territorial específica identificada nas camadas consultadas. O Coeficiente de Aproveitamento Básico de 1,0x é universal na Macrozona Construída (Art. 242, VII); o índice máximo depende da unidade territorial, não identificada aqui." |
| Altura (quando conferida) | "Altura máxima: {altura_max} m" |
| Badge AEIS | "Interesse Social (AEIS)" |
| Badge APAC | "Patrimônio Cultural (APAC)" |
| Badge ADD | "Desaceleração de Densidade (ADD)" |
| Badge Eixo | "Eixo de Desenvolvimento" |
| Badge Corredor | "Corredor de Transporte" |
| Score — "porquê" com PD (só quando CA conferido, template do CONTEXT, verbatim) | "Em {nomeUnidadeTerritorial} — CA básico {ca_basico}x, potencial de {potencial} m²" |
| Detector — critério usando PD | "Critério: área construída ÷ potencial do Plano Diretor (zona {sigla}, CA básico {ca_basico}x)" |
| Detector — critério fallback (sem zona/CA conferido, rotulado como tal — nunca silencioso) | "Critério: área construída ÷ área do terreno (Plano Diretor não disponível para este candidato)" |
| Legenda de zonas — item neutro | "Sem classificação específica" |
| Destructive confirmation | não aplicável — nenhuma ação destrutiva nesta fase |

Todo texto acima segue o gate §26 (Fase 14): verbo de ação nos botões, erro que explica + oferece saída, sem caixa alta em bloco, siglas oficiais sempre acompanhadas do nome em português na 1ª ocorrência (nunca "AEIS"/"ADD" sozinhos), consistência de nomenclatura entre ficha/legenda/detector (o mesmo badge nunca troca de rótulo entre telas).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | nenhum | não aplicável |
| terceiros | nenhum | não aplicável — app não usa shadcn/registry de componentes |

---

## Contrato Específico da Inteligência Urbanística (extensão — não genérico do template)

### 1. Componente: Accordion "Urbanístico" na ficha (`#dUrbanistico`, dentro de `#detail`)

- **Posição:** `<details class="foot durbanistico" id="dUrbanistico">`, imediatamente APÓS `<details class="foot dtecnico">` (Dados técnicos) e ANTES de `<details class="foot dmetodologia">` (Metodologia e fontes) — mesmo nível hierárquico dos outros dois accordions "de referência" do bloco técnico (padrão Fase 9), nunca competindo com `#dLeitura`/`#dScores`/`#dActsPrim` (conclusão/ação primeiro, na ordem já estabelecida).
- **`<summary>`:** texto puro `"Urbanístico"`, mesmo estilo herdado de `.foot>summary` — sem badge/contador dinâmico no próprio summary (mantém simetria visual com "Dados técnicos"/"Metodologia e fontes").
- **Trigger (timing exato — decisão fina do planner, per CONTEXT):** tanto "consulta só ao abrir o accordion" quanto "consulta em background ao abrir a ficha, com skeleton" são aceitáveis; o contrato visual abaixo vale para QUALQUER um dos dois caminhos.
- **Estados de `.footbody` (`#dUrbBody`):**

  **(a) Carregando** — reusa `.skel-card`/`.skel-line` verbatim (mesmo componente do resto do app):
  ```html
  <div class="skel-card"><div class="skel-line w60"></div><div class="skel-line w80"></div><div class="skel-line w40"></div></div>
  ```

  **(b) Resolvido, dentro da Macrozona Construída, COM CA conferido:**
  ```html
  <div class="dgrid">
    <div class="cell" style="grid-column:1/-1"><div class="k">Macrozona</div><div class="v">Macrozona Construída</div></div>
    <div class="cell" style="grid-column:1/-1"><div class="k">Unidade Territorial</div><div class="v">AA — Área Adensável</div></div>
    <div class="cell urb-ca"><div class="k">CA básico · máximo</div><div class="v dvalor-v">1,0x · 6,0x</div></div>
    <div class="cell" style="grid-column:1/-1"><div class="k">Usos</div><div class="v">qualquer uso</div></div>
    <div class="cell"><div class="k">Ocupação por altura</div><div class="v">100% do terreno até 11 m; 50% acima (sem altura máxima definida)</div></div>
  </div>
  <div class="urb-badges">
    <span class="urb-badge is-atencao">Interesse Social (AEIS)</span>
  </div>
  <div class="dnote">Informação urbanística indicativa, extraída do Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Uso do Solo da SEPLANH.</div>
  ```
  Badges só renderizam para flags `true` (nenhuma badge visível se todos os booleans forem `false` — nunca lista vazia decorativa, `.urb-badges` fica `hidden` nesse caso).

  **(c) Resolvido, dentro da Macrozona Construída, SEM CA conferido (REGRA DE OURO — número nunca aparece):**
  ```html
  <div class="dgrid">
    <div class="cell" style="grid-column:1/-1"><div class="k">Macrozona</div><div class="v">Macrozona Construída</div></div>
    <div class="cell" style="grid-column:1/-1"><div class="k">Unidade Territorial</div><div class="v">AA — Área Adensável</div></div>
  </div>
  <div class="dnote">CA e altura desta zona ainda não foram conferidos contra o Anexo oficial da LC 349/2022 — mostramos só a zona (AA), que vem direto do mapa oficial da Prefeitura.</div>
  <div class="urb-badges">…</div>
  <div class="dnote">Informação urbanística indicativa, extraída do Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Uso do Solo da SEPLANH.</div>
  ```
  As duas `.dnote` (conferência pendente + disclaimer fixo) são SEMPRE duas linhas distintas, nunca concatenadas numa só — a primeira é condicional (só quando `conferido:false`), a segunda é incondicional (sempre presente quando o accordion está resolvido, em qualquer variante a/b/c/d).

  **(d) Parcial (algumas das 9 queries falharam, outras resolveram):**
  Mostra os campos que resolveram (mesmo HTML de (b)/(c), com o que estiver disponível) + linha de aviso ANTES do disclaimer fixo:
  ```html
  <div class="dnote">Algumas informações do Plano Diretor não carregaram — o que aparece acima já é confiável, só pode estar incompleto.</div>
  <button type="button" class="urb-retry" id="urbRetry" onclick="renderUrbanisticoUI(dCurrentImovel,true)">Tentar de novo</button>
  ```
  `#urbRetry` é `<button>` nativo, ≥44px de altura (piso de toque obrigatório — é controle, não texto).

  **(e) Fora da Macrozona Construída (macrozona rural):**
  ```html
  <div class="urb-rural">
    <div class="k">Fora da Macrozona Construída</div>
    <p class="dnote">Este imóvel está em Macrozona Rural do Alto Anicuns — zona rural do Plano Diretor. Aqui, o Anexo Urbano (CA, altura, unidades territoriais) não se aplica; esta consulta é só para a área urbana da cidade.</p>
  </div>
  ```
  Nenhum badge, nenhuma tentativa de CA — a macrozona rural é o único dado mostrado, direto da layer 33 (fonte primária GIS, sempre seguro).

  **(f) Erro total (nenhuma das 9 queries respondeu):** o `.footbody` fica com uma única linha + toast:
  ```html
  <div class="dnote">Não foi possível consultar o Plano Diretor para este imóvel agora. Toque para tentar de novo.</div>
  ```
  mais o toast padrão do app (`toast()`, mesmo componente já usado em erros de rede) reforçando a mesma mensagem — nunca falha silenciosa.

  **(g) Resolvido, dentro da Macrozona Construída, SEM unidade territorial específica (BLOCKER 2 — lote urbano fora de AA/ADD/AOS; caso real: AAB, que não tem layer própria na bateria de 9):**
  ```html
  <div class="dgrid">
    <div class="cell" style="grid-column:1/-1"><div class="k">Macrozona</div><div class="v">Macrozona Construída</div></div>
    <div class="cell urb-ca"><div class="k">CA básico</div><div class="v dvalor-v">1,0x</div></div>
  </div>
  <div class="dnote">Dentro da Macrozona Construída, sem unidade territorial específica identificada nas camadas consultadas. O Coeficiente de Aproveitamento Básico de 1,0x é universal na Macrozona Construída (Art. 242, VII, LC 349/2022); o índice máximo depende da unidade territorial, não identificada aqui.</div>
  <div class="dnote">Informação urbanística indicativa, extraída do Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Uso do Solo da SEPLANH.</div>
  ```
  NUNCA mostra CA máximo neste estado (não há unidade territorial que o defina) — só o básico universal 1,0x, sempre com a fonte (Art. 242, VII). Sem badge de unidade; os badges de contexto (AEIS/APAC/eixo/corredor) ainda podem aparecer se a respectiva layer intersectou. Este estado elimina o crash `undefined — undefined` que ocorreria se um lote urbano sem AA/ADD/AOS caísse no render de (b) sem guarda.

- **Foco visual (declaração explícita — pedido do checker):** dentro do accordion resolvido, o **âncora visual primário é a Unidade Territorial** (`.v`, 15px/700, herdado de `.cell .v`) — o número de CA (quando presente) é o segundo ponto de atenção (22px/800, mais proeminente EM TAMANHO mas só aparece quando conferido, então nunca é a única informação disponível); os badges são apoio terciário (cor + texto pequeno); o disclaimer é sempre o elemento MENOS proeminente (10.5px/500, muted), nunca competindo com o dado.

### 2. Componente: Toggle "Zonas do Plano Diretor" no Território (`#terrPanel`) + legenda

- **Seletor de camada temática (substitui o botão único `#terrPanelToggle`):** o `.acts` do painel (`#terrActions`) passa a ter, no lugar do botão booleano único "Colorir mapa por valor"/"Desligar cor por valor", um GRUPO de 2 chips mutuamente exclusivos reusando `.chips` verbatim:
  ```html
  <div class="chips" role="group" aria-label="Camada temática do mapa" id="terrLayerChips">
    <button type="button" id="terrChipValor" aria-pressed="false">Colorir por valor</button>
    <button type="button" id="terrChipZonas" aria-pressed="false">Colorir por zonas do Plano Diretor</button>
  </div>
  ```
  Continua ocupando o slot de "1 primária" do rodapé (lei da Fase 10 preservada — as 2 secundárias "Buscar lote no setor"/"Detectar oportunidades" NÃO mudam). Clicar num chip já ativo desliga a camada (volta a "nenhuma"); clicar no chip inativo troca de camada instantaneamente (nunca as duas ligadas ao mesmo tempo — exclusividade explícita do CONTEXT). Estado `.on`/`aria-pressed="true"` reusa a semântica JÁ existente de `.chips button.on` (accent), sem introduzir uso novo de accent.
- **Legenda compartilhada (`#terrLegenda`):** MESMO container da Fase 15, nunca duplicado — ganha `data-mode="valor"|"zonas"` sincronizado com o chip ativo. Quando `data-mode="zonas"`, o corpo troca as 5 `.terr-swatch` de quantil pelos 7 swatches de zona (`.zone-swatch`, mesmo tamanho 24×14px de `.terr-swatch`, `flex-wrap:wrap` adicionado para caber em 2 linhas no mobile):
  ```html
  <div class="terr-swatches" style="flex-wrap:wrap">
    <div class="terr-swatch-col"><span class="zone-swatch" style="background:var(--zone-aa);border-color:var(--zone-aa-line)"></span><span class="terr-swlbl">AA</span></div>
    <div class="terr-swatch-col"><span class="zone-swatch" style="background:var(--zone-add);border-color:var(--zone-add-line)"></span><span class="terr-swlbl">ADD</span></div>
    <div class="terr-swatch-col"><span class="zone-swatch" style="background:var(--zone-aos);border-color:var(--zone-aos-line)"></span><span class="terr-swlbl">AOS</span></div>
    <div class="terr-swatch-col"><span class="zone-swatch" style="background:var(--zone-aeis);border-color:var(--zone-aeis-line)"></span><span class="terr-swlbl">AEIS</span></div>
    <div class="terr-swatch-col"><span class="zone-swatch" style="background:var(--zone-apac);border-color:var(--zone-apac-line)"></span><span class="terr-swlbl">APAC</span></div>
    <div class="terr-swatch-col"><span class="zone-swatch" style="background:var(--zone-ooau);border-color:var(--zone-ooau-line)"></span><span class="terr-swlbl">OOAU</span></div>
  </div>
  ```
  O cabeçalho da legenda mantém 1 único controle de toggle (texto dinâmico conforme `data-mode`: "Cor por valor" ou "Cor por zonas do Plano Diretor") — fonte única de verdade com os chips do painel, mesmo princípio "nunca dessincroniza" já fixado na Fase 15.
- **Exclusividade:** ligar zonas desliga valor automaticamente e vice-versa (nunca as duas camadas simultâneas — "evita salada de cor", CONTEXT). A troca usa `setStyle()`/layer própria sem recriar a malha base, mesma engenharia da Fase 15.
- **População de geometria:** query com `returnGeometry=true` das 6 layers (7/28/29/30/31/32), LIMITADA à viewport/setor em foco (nunca a cidade inteira), cache de sessão — mesma disciplina de orçamento já aplicada ao choropleth de valor.
- **`reduced-motion`:** respeitado (recolher/expandir legenda usa o mesmo guard REDUCE já existente da Fase 15); troca de camada via `setStyle()` é instantânea, sem tween a desligar.

### 3. Score + Detector — copy e honestidade

- **Score "porquê":** a linha "Em {zona} — CA básico {x}x, potencial de {y} m²" só aparece na lista `porque[]` quando `conferido:true` — quando não conferido ou zona indisponível, o fator simplesmente NÃO aparece na lista (omissão honesta, mesmo padrão da REGRA DE OURO, nunca uma linha fabricada com "—").
- **Detector:** todo item da lista `#terrDetectorList` que usa o critério PD-baseado exibe o rótulo "Critério: área construída ÷ potencial do Plano Diretor (zona {sigla}, CA básico {x}x)"; itens que caem no fallback exibem "Critério: área construída ÷ área do terreno (Plano Diretor não disponível para este candidato)" — o rótulo é SEMPRE visível (reusa o estilo `.terr-metric-sub`/mono já usado para "Amostra de N de M lotes"), nunca omitido, para que o corretor saiba qual critério fundamentou cada candidato.

### 4. Acessibilidade

- Badges (`.urb-badge`): cor nunca é o único sinal — o texto completo (nome + sigla) está sempre presente, cor é reforço, não portador exclusivo de significado (mesma regra já aplicada a pinos/legenda de valor).
- Chips de camada temática: `role="group" aria-label="Camada temática do mapa"`; `aria-pressed` sincronizado entre os 2 chips e o toggle da legenda (fonte única de verdade).
- Legenda de zonas: cada swatch tem rótulo textual adjacente (sigla), nunca cor sozinha — mesma regra já aplicada à legenda de quantis (Fase 15) e à legenda de pinos (Fase 13/17).
- `#urbRetry`: `<button>` nativo, foco/teclado/Enter funcionam sem JS extra, ≥44px de altura.
- Accordion Urbanístico: `<details>`/`<summary>` nativos (foco/teclado já funcionam sem JS extra, mesmo padrão de `.dtecnico`/`.dmetodologia`); conteúdo populado ANTES de o accordion abrir OU com skeleton visível imediatamente (nunca aparece vazio/em branco).
- Nenhum dado retornado pelas layers do PD (nomes, siglas) é interpolado sem `esc()` — mesma lição LGPD/XSS da Fase 16, aplicada aqui mesmo sem PII (dado territorial ainda passa por render seguro).

---

## Nomenclatura sugerida (não vinculante — planner decide os nomes finais)

CSS novo: `.durbanistico`, `.urb-badges`, `.urb-badge`, `.urb-badge.is-atencao`, `.urb-badge.is-potencial`, `.urb-ca`, `.urb-rural`, `.urb-retry`, `.zone-swatch`.

IDs novos: `#dUrbanistico`, `#dUrbBody`, `#urbRetry`, `#terrChipValor`, `#terrChipZonas`, `#terrLayerChips`.

CSS vars novas: `--zone-aa`/`-line`, `--zone-add`/`-line`, `--zone-aos`/`-line`, `--zone-aeis`/`-line`, `--zone-apac`/`-line`, `--zone-ooau`/`-line`, `--zone-none`/`-line` (7 pares, ver §Color — todas as demais reusadas verbatim: `--ink`/`--muted`/`--accent`/`--paper`/`--paper-2`/`--status-*`).

Funções puras sugeridas (RADAR_PURE, TDD): `resolverZonaUI(respostas9queries)` (monta o objeto de estado do accordion a partir das respostas paralelas — carregando/resolvido/resolvido_sem_unidade/parcial/rural/erro), `calcularPotencialPD(areaterr, ca_basico)` (só quando `conferido:true`), `criterioDetectorPD(areaedif, potencialPD)` com fallback nomeado para `areaedif/areaterr`. Funções de I/O sugeridas: `renderUrbanisticoUI(a, isRetry)` (irmã assíncrona de `renderDiffUI`/`renderCadernoBtn`, mesmo padrão "nunca trava o render síncrono da ficha"), `montarLegendaZonas()` (espelha `montarLegenda()` da Fase 15), `toggleCamadaTematica(modo)` (substitui `toggleChoropleth()` isolado, agora tri-state: nenhuma/valor/zonas).

Constantes nomeadas: `PD_LAYERS={macrozona:33,aa:31,add:30,aos:29,aeis:7,apac:28,ooau:32,eixo:4,corredor:1}`, `PD_DISCLAIMER` (string fixa, ver §Copywriting), `PD_TABELA_CA` (JSON <2KB versionado, sigla→{nome,ca_basico,ca_maximo,altura_max,vi_outorga,taxa_ocupacao,usos,usos_conferido,nota_ca,nota_altura,fonte,conferido} + `_meta` de auto-auditoria de emendas — tarefa de conferência da fase, per CONTEXT PD-02), `PD_MZC_BASICO` (CA básico 1,0x universal da Macrozona Construída, Art. 242 VII — usado no estado "resolvido_sem_unidade").

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
