# Phase 13: Refino Visual, Pinos Semânticos, Motion & Descoberta Progressiva - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 1 decisão proposta, aceita; decisões macro herdadas do milestone

<domain>
## Phase Boundary

A cara "cockpit premium" aplicada sobre o cockpit já funcional (Fases 8-12): (1) **refino visual** preservando a identidade cartográfica — mais respiro entre blocos, menos textura/borda/caixa, hierarquia por tamanho/contraste/espaço, **cor reservada a status** (verde=oportunidade, amarelo=atenção, vermelho=risco), óxido sem parecer alerta constante; (2) **pinos semânticos** no mapa (verde/amarelo/vermelho/dourado-Caixa/cinza-sem-dado, clicar → painel com valor+score+ações); (3) **motion de busca em etapas** (Localizando → Consultando cadastro → Calculando estimativa → Buscando comparáveis → Preparando mapa) + **skeleton** em listas/cards; (4) **descoberta progressiva**: onboarding ≤3 telas puláveis no 1º acesso + área discreta "O que o Radar faz"; lei da tela varrida no app todo. NÃO inclui: rebrand/base branca (decisão travada do milestone), Território (15-17).

Requirements: VIS-01, PIN-01, MOT-01, DESC-01.
</domain>

<decisions>
## Implementation Decisions

### Onboarding (aceito)
- 3 cartões no 1º acesso: "Busque qualquer imóvel" (caixa única/exemplos) → "Veja valor e oportunidade" (ficha/scores) → "Gere documentos e capte" (docs/captação/oportunidades). Puláveis ("Pular" sempre visível), botão "Começar" no último; nunca reaparecem (`radar_onboard` na convenção radar_, try/catch). Reduce-motion-safe.
- Área "O que o Radar faz": entrada discreta (ex.: no .foot/menu), lista curta das capacidades com CTAs que abrem a superfície certa — nunca menu principal.

### Decisões herdadas do milestone (travadas — NÃO reabrir)
- REFINAR a identidade óxido/cartográfica; NUNCA migrar pra base branca; zero fonte nova; cor de STATUS: verde=oportunidade, amarelo=atenção, vermelho=risco, dourado=Caixa, cinza=sem dado — sempre com reforço textual (nunca cor sozinha).

### Claude's Discretion
- Refino: aumentar respiro (margens/padding) nos blocos principais (ficha, painel, cards), reduzir bordas/caixas redundantes, revisar onde o accent óxido está gritando sem ser status (ex.: elementos decorativos) — mudanças em CSS por tokens existentes; NENHUM hex novo (paleta de status pode derivar de --lot/--gold/--accent já existentes; se faltar um verde/amarelo utilizável AA, criar --status-* VARS no :root a partir dos hex já usados no app, documentado).
- Pinos semânticos: plot() atual usa cor fixa — passa a mapear o status da unidade/lote (score de oportunidade quando disponível → verde/amarelo; sem dado → cinza; Caixa continua dourado). Popup/painel ao clicar já existe (showDetail) — garantir valor+score+ações na 1ª dobra (Fase 9 já fez na ficha).
- Motion de busca em etapas: loading() atual vira sequência de mensagens reais atreladas às fases da busca (o texto muda quando cada etapa de fato ocorre — determinístico, não teatrinho de timer); skeleton leve em cards/listas (CSS shimmer com var existente, REDUCE-safe → estático).
- Lei da tela: varredura final (1 primária/2 secundárias/Mais opções) nas superfícies que ainda não passaram (chooser, captSheet ok, cmpSheet ok).
- IN-02 da Fase 9 (Mercado estimado duplicado dValor/dGrid) e infos das fases 11/11.1 (duplicação leve) entram como limpeza AQUI se couber no orçamento.
</decisions>

<code_context>
## Existing Code Insights

- Motion (motion.dev) já embutido + mAnimate/mStagger/REDUCE; transitions existentes são snap-first.
- plot()/markers com setStyle; CAIXA layer dourada separada; __scores cache por unidade (Fase 10) alimenta o status do pino quando presente — mas pinos de LISTA (busca) têm mercadoEstimado por unidade disponível via __est/compute barato.
- loading(msg) já aceita mensagem; buscar() tem fases naturais (WHERE→fetch→filtro→render→plot).
- Coach/dica existente (radar_coach) — o onboarding substitui/incorpora o coach? Discrição: manter coach do mapa, onboarding é do app (1º acesso).
- esc()/IN-01, 44px, Esc chain, zero hex novo (exceto --status-* derivados documentados).
</code_context>

<specifics>
## Specific Ideas

- Mensagens do motion de busca: exatamente as 5 do doc §14 (Localizando imóvel… / Consultando cadastro… / Calculando estimativa… / Buscando comparáveis… / Preparando mapa…), disparadas por progresso REAL.
- Pino cinza (sem dado) deve continuar clicável (abrir ficha) — sem dado ≠ sem interação.
</specifics>

<deferred>
## Deferred Ideas

- Focus-trap global de sheets (gap pré-existente #wiz/#captSheet/#negSheet) — se couber no orçamento da fase, senão registrar.
- Heatmap/choropleth de cores no mapa → Fase 15.
</deferred>
