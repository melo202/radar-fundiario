# Phase 5: Seam de IA (dormant) - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning
**Mode:** Auto-generated (fase de scaffolding/seam isolado — sem UI, critérios técnicos; discuss de grey-areas dispensado; design já especificado na pesquisa)

<domain>
## Phase Boundary

Criar um encaixe (seam) ISOLADO e DESATIVADO para uma futura feature de pesquisa de mercado por IA externa: um objeto de config `AI_CONFIG {enabled:false}` + uma única função async `pesquisarMercadoIA()`, num `<script>` fisicamente separado. Sem UI, sem chamada de rede em v2.0, sem dependência de CDN. Deve ser removível sem afetar nada do núcleo. Cobre IA-01. NÃO ativa nada, NÃO toca o núcleo cadastral/laudo/estatística.
</domain>

<decisions>
## Implementation Decisions

### Isolamento estrutural
- **`<script>` separado** no fim do body (bloco próprio, comentado como "seam de IA — dormant"), de modo que apagar o bloco inteiro não quebre nenhuma função do núcleo. Teste de aceite: "delete o módulo, o core continua funcionando".
- O núcleo (busca, cadastro, comparáveis, laudo, mapa) NÃO chama `pesquisarMercadoIA()` em v2.0 — não há call-site ativo. O seam é inerte.

### Contrato da função
- `AI_CONFIG = { enabled:false, provider:"openrouter", model:"z-ai/glm-4.5-air:online", endpoint:"", apiKeyMode:"proxy", ... }` — formato OpenAI-compatible (Chat Completions), provider trocável por config (default GLM-4.5-Air via OpenRouter `:online`; fallbacks documentados: qwen3-14b, deepseek-v4-flash — ver AI-MODELS.md). NÃO embutir chave nenhuma no código.
- `async function pesquisarMercadoIA(contexto)`: recebe SOMENTE um input sanitizado/whitelisted (ex.: `{bairro, faixaPreco, uso}`) — NUNCA um registro cru da API, o que estruturalmente impede vazamento de `dtnascimen`/PII. Se `AI_CONFIG.enabled` for false OU ocorrer erro/rede → retorna `null` (fail-safe, nunca lança exceção que afete o app).
- Caminho de acesso sem backend (documentado como comentário/design, NÃO implementado em v2.0): proxy Cloudflare Worker (guarda a key) OU modo BYO-key em localStorage. O seam é desenhado para suportar ambos no futuro, mas em v2.0 fica `enabled:false`.

### LGPD / segurança
- O seam nunca recebe dado pessoal; a whitelist de input é a barreira estrutural. Rótulo futuro (quando ativado): "pesquisa assistida por IA — não é dado oficial". Núcleo permanece 100% determinístico.

### Claude's Discretion
- Nome exato dos campos de `AI_CONFIG`, forma exata do objeto de contexto whitelisted, e o esboço (comentado) do adapter OpenAI-compatible. Guiar-se por ARCHITECTURE.md §"AI Seam" e AI-MODELS.md §"API-contract sketch".
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `esc()`/sanitização já existentes — o seam reusa para garantir que só string sanitizada entre.
- Padrão de `<script>` inline no fim do body (o app é single-file).
- `.planning/research/ARCHITECTURE.md` §4 (AI Seam): shape exato (`AI_CONFIG`, `pesquisarMercadoIA`, `enabled:false`, script separado, input whitelisted, fail-to-null).
- `.planning/research/AI-MODELS.md`: modelo default (`glm-4.5-air:online` via OpenRouter), fallbacks, contrato OpenAI-compatible, caminho no-backend (Worker/BYO-key).

### Established Patterns
- Fail-safe/silencioso (o app já degrada com toasts, não quebra).
- Sem segredos no código (endpoint público keyless em outras partes).

### Integration Points
- NENHUM call-site ativo em v2.0 — o seam é dormant. Só existe o objeto + a função + comentários de design.
- Não adicionar CDN, não adicionar entrada no `sw.js` (sem asset novo).

### NÃO fazer nesta fase
- NÃO ativar a feature (enabled fica false). NÃO adicionar UI. NÃO fazer chamada de rede. NÃO tocar núcleo cadastral/laudo. NÃO embutir chave.
</code_context>

<specifics>
## Specific Ideas

- Teste-chave de aceite: remover o bloco `<script>` do seam por completo NÃO pode quebrar nenhuma funcionalidade (grep confirma zero call-sites no núcleo).
- `pesquisarMercadoIA()` nunca deve ver um registro cru da API (barreira contra `dtnascimen`).
- Contrato provider-agnóstico (OpenAI-compatible) para trocar modelo por config no futuro sem refatorar.
</specifics>

<deferred>
## Deferred Ideas

- Ativar a pesquisa de mercado por IA (proxy Worker/BYO-key, UI, grounding `:online`) → IA-02, v2.1+.
- Motion do app todo → Fase 6.
</deferred>
