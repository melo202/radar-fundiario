# Phase 8: Busca Única Inteligente - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 áreas propostas em lote, todas aceitas pelo usuário

<domain>
## Phase Boundary

O corretor busca "de todos os jeitos" numa caixa única inteligente (detecção de intenção + chip de confirmação + desambiguação), sem perder nenhuma capacidade ou garantia de acessibilidade da busca atual (3 botões + link). Inclui: harness de teste das funções puras ANTES de mudar comportamento, fuzzy-fix com ranking por qualidade, setor na frase + último setor lembrado, exemplos tocáveis, deep-link `?insc=`, autocomplete CNEFE, colar link do Google Maps/coordenada, voz best-effort. NÃO inclui: ficha comercial/scores (Fase 9), mudanças de visual global (Fase 13).

Requirements: BUSCA-01..14.
</domain>

<decisions>
## Implementation Decisions

### UI da caixa única (aceito pelo usuário)
- A caixa única SUBSTITUI a moderow (3 botões + link) como experiência padrão.
- O HTML/CSS da `.moderow`/`.modemore` é REAPROVEITADO como menu de correção aberto pelo chip de confirmação (alvos 44px e aria-pressed já testados).
- Placeholder estático com exemplos: "quadra 128 lote 5 · rua portugal 582 · sumer park · 3020150346". Estado vazio vira 3-4 exemplos TOCÁVEIS (preenchem + buscam).

### Confiança e disparo (aceito pelo usuário)
- Confiança ALTA (inscrição 10/14 díg, QD+LT, tipo de via, prefixo de edifício): Enter dispara a busca DIRETO; o chip é informativo (mostra o que foi entendido, tocável p/ corrigir).
- Confiança BAIXA/AMBÍGUA (ex.: "135" sozinho): NÃO busca — mostra chips de desambiguação ("Rua 135" / "Quadra 135" / "Inscrição…" só se ≥5 díg) acima do botão; tocar no chip busca.
- Confiança MÉDIA (texto sem via/número): assume prédio/setor com selo visível de incerteza; busca no Enter mas com chip destacado.
- Setor assumido do localStorage NUNCA é silencioso: chip "Setor · Marista (último)" sempre visível e tocável p/ trocar.

### Voz (aceito pelo usuário)
- Botão 🎤 na caixa única NESTA fase, best-effort via Web Speech API (webkitSpeechRecognition), pt-BR; o botão só aparece se a API existir (degrada silenciosamente); resultado cai na caixa e roda detectMode normal. Erros de permissão → toast com próximo passo.

### Autocomplete unificado (aceito pelo usuário)
- Dropdown ÚNICO na caixa: sugestões de SETOR (COMBO existente) + RUA (CNEFE `logradouros-goiania.json`, lazy-load no primeiro uso) com rótulo visual por tipo ("Setor"/"Rua"). Mesma acessibilidade do combobox atual (role=option, aria-*, pointerdown iOS).

### Claude's Discretion
- Detalhes do score de match (exato/normalizado/substring), limiares do detectMode, debounce (~150ms), e a ordem de construção seguem a pesquisa (.planning/research/v2.1/SEARCH.md §2-§7) — que é o contrato técnico desta fase.
- Link do Google Maps/coordenada: aceitar formatos comuns (`@lat,lng`, `q=lat,lng`, "lat, lng" decimal); cai no ponto → reusa o caminho do clique-no-mapa (identificação do lote por ponto). Sem geocoding externo (CSP/sem backend).
</decisions>

<code_context>
## Existing Code Insights

Ver `.planning/research/v2.1/SEARCH.md` (mapeamento completo, linhas exatas). Resumo do que PRESERVAR vs SUBSTITUIR: §6 — `buscar()`/WHERE building preservados integralmente; `MODE`/`setMode()` viram API interna; `resolveBairro()`/COMBO reusados p/ setor-na-frase; `SEARCHTOKEN` aplicado a todo caminho novo; `.empty` substituído por exemplos tocáveis; fuzzy-fix nos pontos §4 (okQ/okL linha ~1251, casaRua ~1200, ordenação em finish()).

Guardas OBRIGATÓRIAS (success criteria 7-8 do ROADMAP): coordenação busca⇄ficha desktop (hotfix a7a4646) — busca sempre fechável, ficha fecha overlay, prédio abre seletor sobre o mapa; auditoria dos dados da ficha em todos os modos contra o endpoint. Correções recentes desta sessão a não regredir: lista mobile não some atrás do form (scrollToResults + .results flex:none), venal 0 = "não informado", toast como snackbar no rodapé, satélite abaixo do sheet.
</code_context>

<specifics>
## Specific Ideas

- Harness de teste: Node puro + fixtures (sem framework novo); casos obrigatórios: "135" sozinho, "Rua 135", "Q135", inscrição 10 vs 14 díg, lote "20/21", quadra "10E", apto "1901" vs "19".
- detectMode: validar regex contra amostra real (COMBO + CNEFE) durante a fase, não só fixtures sintéticas.
- Log leve de correções do chip em localStorage (autodiagnóstico, sem telemetria).
</specifics>

<deferred>
## Deferred Ideas

- Busca por proprietário/CPF — LGPD, fora de escopo permanente.
- Geocoding externo de endereços livres (precisa de API externa; CSP não permite) — o link do Maps cobre o caso "colar localização".
</deferred>
