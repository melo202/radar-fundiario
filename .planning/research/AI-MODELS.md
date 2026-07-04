# Pesquisa: Modelo de IA + caminho de acesso para o seam de pesquisa de mercado

**Projeto:** Radar Fundiário — seam dormant v2.0 (pesquisa de mercado externa, opt-in, isolada do núcleo determinístico)
**Pesquisado:** 04/07/2026
**Confiança geral:** MEDIA-ALTA (preços verificados via busca web em julho/2026; nomenclatura de modelos mudou rápido em 2026, então há campos marcados como "verificar de novo antes de implementar")

---

## Resumo executivo e recomendação

**Recomendação: desenhar o seam contra o contrato OpenAI-compatible do OpenRouter, usando como modelo-alvo padrão o `z-ai/glm-4.5-air` (ou fallback `qwen/qwen3-14b`), com o plugin de web search nativo do OpenRouter (`:online` / parâmetro `plugins`) para o grounding.** Acesso via **proxy mínimo em Cloudflare Workers** (não BYO-key direto no cliente) para não expor a chave da API.

Por quê, em uma frase: o app não tem backend, então **alguém precisa guardar a chave** — um Worker de ~30 linhas resolve isso de graça (100k req/dia no free tier); e o OpenRouter dá **um único contrato de API** que já embute busca web padronizada (`url_citation` annotations) sobre **qualquer modelo**, incluindo os mais baratos do mercado (GLM-4.5-Air e Qwen3-14B custam centavos de dólar por milhão de tokens), evitando integrar 2 APIs diferentes (modelo + busca) e evitando lock-in num único provedor chinês/americano.

**Achado importante sobre "GLM 5.2":** o dono do projeto não errou — **GLM-5.2 existe de fato**, foi lançado por volta de 13/06/2026 pela Zhipu/Z.ai, é um MoE de ~750B parâmetros (~40B ativos), 1M tokens de contexto, e bate benchmarks do GPT-5.5 em coding. **Mas não é um modelo de custo baixíssimo** — é o *frontier flagship* da Zhipu (US$ 1,40/US$ 4,40 por milhão de tokens input/output), pensado para concorrer com Claude/GPT em tarefas complexas de codificação agente, não para resumir sinais de mercado imobiliário de um bairro. Para o caso de uso do Radar Fundiário, o modelo certo da família GLM é o **GLM-4.5-Air** (camada barata/gratuita da mesma empresa), não o 5.2.

**Fallbacks, em ordem:**
1. `deepseek/deepseek-v4-flash` (ou o equivalente ainda ativo no momento da implementação) — extremamente barato, ótimo para sumarização, mas **sem grounding nativo** (precisa do plugin de busca do OpenRouter ou pipeline separado).
2. `google/gemini-2.5-flash-lite` **direto na API do Google** (fora do OpenRouter) — único candidato com grounding *verdadeiramente nativo* (Grounding with Google Search) integrado ao próprio modelo, o que pode simplificar a arquitetura se decidirem não usar OpenRouter no futuro.

---

## Tabela comparativa (preços por 1M tokens, verificados via web em 04/07/2026)

| Modelo | Provedor(es) | Input | Output | Contexto | Web search / grounding | Confiança |
|---|---|---|---|---|---|---|
| **Qwen3-14B** | OpenRouter (agrega vários hosts) | **US$ 0,10** | **US$ 0,24** | ~128K–1M (varia por host) | Não nativo — precisa de plugin/API externa | MEDIA (OpenRouter confirmado; preço em DashScope/DeepInfra direto não confirmado neste ciclo) |
| **GLM-4.5-Air** | Z.ai direto, OpenRouter (tem `:free`) | **~US$ 0,20** (Z.ai oficial) / grátis no tier `:free` do OpenRouter (rate-limited) | **~US$ 1,10** (Z.ai oficial) | 128K | Não nativo no modelo — Z.ai vende "Web Search" como *built-in tool* pago a US$ 0,01/uso | ALTA (doc oficial Z.ai) |
| **GLM-4.5** (não-Air) | Z.ai, OpenRouter | US$ 0,60 | US$ 2,20 | 128K | idem acima (tool pago US$ 0,01/uso) | ALTA |
| **GLM-5.2** ("o que o dono mencionou") | Z.ai, OpenRouter | **US$ 1,40** | **US$ 4,40** | 1M | idem — tool de busca pago separado | ALTA — mas **não é o tier de custo baixíssimo**; é o flagship 2026 da Zhipu |
| **DeepSeek-V4-Flash** (sucessor do V3, ativo em 2026) | DeepSeek direto, OpenRouter | US$ 0,14 (cache miss) / **US$ 0,0028** (cache hit) | US$ 0,28 | 1M | Não nativo — sem web search embutido | MEDIA-ALTA (doc oficial DeepSeek) |
| **Gemini 2.5 Flash-Lite** | Google AI Studio direto, OpenRouter, Vertex | US$ 0,10 | US$ 0,40 | 1M | **SIM, nativo** ("Grounding with Google Search"): 1.500 prompts grounded/dia grátis (cota compartilhada), depois **US$ 35 / 1.000 prompts grounded** | ALTA (doc oficial Google) |
| **Gemini 3.1 Flash-Lite** (mais novo, 2026) | Google direto | US$ 0,25 (texto) | US$ 1,50 | — | Grounding nativo, cota nova do Gemini 3: 5.000 prompts/mês grátis (compartilhado), depois **US$ 14/1.000** (mais barato que a linha 2.5!) | MEDIA (preço de grounding do Gemini 3 confirmado, mas vale reconfirmar antes de codar) |
| **Llama 4 Scout** | Groq | US$ 0,11 | US$ 0,34 | 10M (mkt) | Não — precisa de tool externa | MEDIA |
| **GPT-5.x low-tier / mini** | OpenAI direto, OpenRouter | não coletado neste ciclo (fora do escopo "custo baixíssimo" — tende a ser mais caro que os acima) | — | — | Tem "web_search" tool nativo na Responses API (pago por uso) | BAIXA (não verificado a fundo — não é candidato principal) |

**Nota sobre nomenclatura Qwen:** em julho/2026 a Alibaba já avançou para **Qwen 3.5 (fev/2026), Qwen 3.6 (abr/2026) e Qwen 3.7 (mai/2026, flagship "Max")**. O "Qwen 3-14B" citado pelo dono é da geração original Qwen3 (ainda ativamente servido e barato — US$ 0,10/US$ 0,24 no OpenRouter), e continua sendo a opção mais econômica e mais testada em produção para tarefas leves de sumarização. Não é necessário migrar para 3.5/3.6/3.7 — esses são flagships mais caros e voltados a coding agêntico, fora do escopo de custo baixíssimo.

---

## Esclarecimento: "GLM 5.2" é real, mas é o modelo errado para este caso

- GLM-5.2 foi lançado publicamente em ~13/06/2026 pela Zhipu AI (Z.ai), como sucessor open-weight do GLM-5/5.1, com contexto de 1M tokens efetivo e arquitetura MoE (~750B params totais / ~40B ativos por token). Bateu GPT-5.5 em benchmarks de coding de longo horizonte (SWE-bench Pro: 62,1 vs 58,6) ([VentureBeat](https://venturebeat.com/technology/z-ais-open-weights-glm-5-2-beats-gpt-5-5-on-multiple-long-horizon-coding-benchmarks-for-1-6th-the-cost), [SCMP](https://www.scmp.com/tech/tech-trends/article/3357115/zhipu-ais-stock-rockets-after-chinese-firm-makes-glm-52-open-source)).
- Preço oficial (doc Z.ai): **US$ 1,40 input / US$ 4,40 output por 1M tokens** — mais caro que GLM-4.5-Air por 7–4x, e mais caro que Qwen3-14B por 14–18x.
- Para "resumir sinais de mercado imobiliário de um bairro de Goiânia" — uma tarefa de sumarização/agregação de texto curto, não coding agêntico de múltiplos passos — pagar o preço do flagship é desperdício. **O tier certo dentro da própria família Zhipu é o GLM-4.5-Air**, que é a camada "leve, voltada a apps agentic" da mesma empresa, ou até o `glm-4.5-air:free` do OpenRouter para prototipagem (rate-limited, sem SLA — não usar em produção, mas ótimo para validar o seam antes de gastar dinheiro).

---

## Caminho de acesso para app sem backend

O app é um HTML único servido estaticamente (GitHub Pages). Isso significa **qualquer chave de API embutida no JS é pública** — inspecionável por qualquer usuário via DevTools. Duas estratégias viáveis, nenhuma delas "backend" no sentido de servidor com estado:

### Opção A (recomendada): Proxy mínimo serverless — Cloudflare Workers

- Um Worker de ~30–50 linhas recebe a requisição do app (sem segredo nenhum no payload), injeta a chave da API (guardada como *secret* do Worker, nunca exposta), repassa para o OpenRouter (ou provedor escolhido), e devolve a resposta.
- **Custo:** free tier = 100.000 requisições/dia, 10ms de CPU por invocação — mais que suficiente para uma feature opt-in de nicho (corretores de Goiânia). Não precisa de plano pago.
- Resolve também: rate-limiting básico, ocultar qual provedor está por trás (permite troca de modelo sem tocar o app publicado), e dá um ponto único para logar custo/uso sem instrumentar o cliente.
- Continua "sem backend" no espírito do projeto: não há servidor com estado, não há banco de dados, é só uma function edge stateless — consistente com a constraint "arquivo único, sem build" do app principal (o Worker é um artefato separado, ~1 arquivo JS, deploy via `wrangler`).

### Opção B: Bring-your-own-key (BYO-key) direto no cliente

- O usuário cola a própria chave (OpenRouter, Z.ai, etc.) num campo de configuração local (salva em `localStorage`, nunca enviada a lugar nenhum além do provedor).
- **Vantagem:** zero infraestrutura extra, zero custo para o dono do projeto, mantém 100% a filosofia "sem backend/sem servidor próprio".
- **Desvantagem:** fricção de adoção altíssima para o público-alvo (corretor não-técnico não sabe o que é uma "chave de API"); a chave trafega no `fetch` do navegador para o provedor (aceitável, já que é a própria chave do usuário, mas exige que o provedor tenha CORS liberado no domínio do navegador — **OpenRouter e a maioria dos provedores permitem chamadas client-side com CORS habilitado**, o que é um bom sinal para essa via).

**Recomendação combinada:** desenhar o seam para suportar **ambos os modos via a mesma interface** — um `provider adapter` que aceita ou (a) uma URL de proxy próprio (Worker) ou (b) uma chave BYO local — com o proxy como default sugerido e o BYO como modo avançado/"power user". Isso mantém opcionalidade sem comprometer a arquitetura de app estático.

---

## Grounding: precisa de search tool separado ou modelo com busca nativa?

**Resposta curta: para este caso, use o plugin de web search do próprio OpenRouter — não é necessário integrar Tavily/Brave/SerpAPI separadamente.**

Motivo: o OpenRouter já resolve o problema de "modelo barato sem busca nativa" com uma camada de busca universal:

- Basta usar o sufixo `:online` no slug do modelo (ex.: `z-ai/glm-4.5-air:online`) ou o parâmetro `plugins: [{ id: "web" }]` no corpo da requisição.
- Funciona com **qualquer modelo**, mesmo os que não têm busca nativa (Qwen3-14B, GLM-4.5-Air, DeepSeek) — o OpenRouter roteia para busca nativa do provedor quando existe (Google, Anthropic, OpenAI, Perplexity, xAI) ou cai para **Exa** como motor padrão.
- Resposta vem padronizada: anotações `url_citation` (URL, título, trecho, índices de caractere) dentro da mesma mensagem de chat completion — não precisa parsear formatos diferentes por provedor.
- **Custo do grounding via Exa (fallback universal):** ~US$ 0,005 por requisição (até 10 resultados), mais US$ 0,001 por resultado extra. Para uma feature opt-in usada esporadicamente por corretor (não em loop automatizado), isso é irrisório — mesmo 1.000 usos/mês custariam ~US$ 5.

**Comparação com as alternativas de grounding nativo:**

| Abordagem | Custo de grounding | Complexidade de integração |
|---|---|---|
| OpenRouter `:online` (Exa fallback) | ~US$ 0,005/req | Baixa — 1 parâmetro extra na mesma chamada já usada pro modelo |
| Gemini 2.5/3.x Grounding with Google Search (nativo) | US$ 14–35 / 1.000 prompts (após cota grátis) | Baixa, mas amarra o seam à API do Google especificamente (perde a agnosticidade de provedor) |
| Tavily/Brave/SerpAPI + qualquer LLM (pipeline manual) | Tavily US$ 8/1.000 (ou 1.000 grátis/mês); Brave 2.000 grátis/mês, depois ~US$ 2,50/1.000 | Média-alta — 2 chamadas de API distintas, parsing de resultado bruto, prompt engineering manual pra injetar o contexto de busca no modelo |

Conclusão: a rota OpenRouter `:online` é a mais barata **e** a mais simples de integrar num seam que já quer ser provider-agnostic — evita construir e manter um pipeline de busca+injeção de contexto do zero, e evita pagar o prêmio do grounding nativo do Google se decidirem trocar de modelo depois.

**Quando reconsiderar:** se o volume de uso crescer muito (milhares de consultas/mês) ou se precisar de resultados de busca mais "curados"/deduplicados que o Exa não entrega bem, vale reavaliar Brave Search API direto (2.000 grátis/mês, independente de índice Google/Bing, menos spam de SEO) como camada de busca isolada — mas isso é otimização futura, não bloqueio para o design do seam agora.

---

## Contrato de API do seam (sketch, provider-agnostic / OpenAI-compatible)

O seam deve mirar o formato **Chat Completions compatível com OpenAI** (é o que OpenRouter, DeepSeek, Z.ai, Together, DeepInfra, Groq e a maioria dos provedores expõem nativamente) — isso permite trocar o modelo/provedor por trás só mudando config, sem reescrever o adapter.

### Requisição (o app envia ao proxy Worker; o Worker repassa ao OpenRouter)

```json
{
  "model": "z-ai/glm-4.5-air:online",
  "messages": [
    {
      "role": "system",
      "content": "Você resume sinais públicos de mercado imobiliário para um bairro de Goiânia. Responda em português, cite as fontes, e deixe claro que não é dado oficial cadastral."
    },
    {
      "role": "user",
      "content": "Resuma o cenário de mercado imobiliário para o bairro Setor Bueno, Goiânia, em 2026: tendências de preço, oferta, e contexto relevante para um corretor."
    }
  ],
  "plugins": [
    { "id": "web", "max_results": 5 }
  ],
  "temperature": 0.3,
  "max_tokens": 600
}
```

### Resposta (formato padronizado, independente do modelo escolhido)

```json
{
  "id": "gen-xxxxx",
  "model": "z-ai/glm-4.5-air",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "No Setor Bueno, o m²... [texto resumido]",
        "annotations": [
          {
            "type": "url_citation",
            "url_citation": {
              "url": "https://exemplo.com/fonte",
              "title": "Título da fonte",
              "content": "trecho relevante citado",
              "start_index": 42,
              "end_index": 89
            }
          }
        ]
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 320,
    "completion_tokens": 180,
    "total_tokens": 500
  }
}
```

### Pontos de design para o seam dormant

1. **Adapter único**, `askMarketResearch(bairro, contexto) → { texto, citações[], custoEstimado, modelo }` — isola toda a lógica de provedor/modelo/plugin atrás dessa função. O resto do app nunca fala com a API diretamente.
2. **Config de modelo trocável** sem deploy do app principal: o `model` string e o endpoint do proxy ficam em uma constante/config, não hardcoded espalhado — permite trocar `z-ai/glm-4.5-air:online` por `qwen/qwen3-14b:online` ou `deepseek/deepseek-v4-flash:online` testando custo/qualidade sem reescrever a feature.
3. **Rótulo obrigatório na UI:** todo resultado desse adapter deve vir com o disclaimer "não é dado oficial" já embutido na resposta ou aplicado pela UI — consistente com o princípio determinístico do núcleo (ver `INTELIGENCIA-radar.md`).
4. **Fail-safe:** se o proxy/API falhar ou não estiver configurado, a feature simplesmente não aparece (é dormant/opt-in) — nunca deve bloquear ou degradar o fluxo cadastral/laudo, que continuam 100% determinísticos.
5. **Custo por chamada estimado (cenário GLM-4.5-Air + `:online` Exa):** ~US$ 0,0002–0,0006 de tokens (500 tokens totais a ~US$ 0,20/US$1,10 por milhão) + ~US$ 0,005 de busca ≈ **menos de 1 centavo de dólar por consulta**. Em volume de nicho (corretores de Goiânia, uso esporádico por imóvel/bairro), isso é irrelevante financeiramente mesmo em centenas de consultas/mês.

---

## Avaliação de confiança

| Área | Nível | Motivo |
|---|---|---|
| Preços GLM (Z.ai) | ALTA | Documentação oficial (`docs.z.ai/guides/overview/pricing`) lida diretamente |
| Existência e specs do GLM-5.2 | ALTA | Múltiplas fontes de imprensa técnica + GitHub oficial (`zai-org/GLM-5`) convergem |
| Preços Qwen3-14B (OpenRouter) | MEDIA-ALTA | Página oficial do OpenRouter lida diretamente; preço em DashScope direto não confirmado neste ciclo |
| Nomenclatura Qwen 3.5/3.6/3.7 | MEDIA | Só via WebSearch, não cruzado com doc oficial Alibaba neste ciclo — não crítico pro seam (não são os modelos recomendados) |
| Preços DeepSeek V4 | ALTA | Documentação oficial (`api-docs.deepseek.com`) lida diretamente |
| Preços Gemini + grounding | ALTA | Documentação oficial Google (`ai.google.dev/gemini-api/docs/pricing`) lida diretamente |
| Mecânica do plugin de busca do OpenRouter | ALTA | Documentação oficial OpenRouter lida diretamente |
| Cloudflare Workers free tier | ALTA | Múltiplas fontes convergem em 100k req/dia, sem mudança de preço registrada |
| Preços de search APIs (Tavily/Brave) | MEDIA | Só via WebSearch — suficiente para decisão (não são a rota recomendada), mas caso decidam usar Brave/Tavily depois, reconfirmar antes de codar |

## Lacunas para revisitar antes de implementar (não bloqueiam o design do seam agora)

- Confirmar se em 2026 o OpenRouter ainda oferece `glm-4.5-air:free` sem custo/com rate limit viável para prototipagem, ou se essa oferta expirou.
- Reconfirmar preço exato do plugin `:online` no momento da implementação — preços de infraestrutura de IA mudam rápido; os números aqui são um retrato de 04/07/2026.
- Se decidirem eventualmente ativar a feature (fora do escopo do v2.0, que só cria o encaixe dormant), medir o custo real por consulta em produção antes de abrir para todos os usuários — os números aqui são estimativas de token count, não medição real.
- Verificar se o CORS do OpenRouter (para o modo BYO-key direto do navegador, Opção B) está de fato liberado para chamadas de um domínio arbitrário do GitHub Pages, ou se exige `HTTP-Referer`/`X-Title` headers específicos (é prática comum do OpenRouter pedir esses headers para atribuição, não deve ser bloqueio, mas vale testar).

## Fontes

- [Z.ai Pricing Overview](https://docs.z.ai/guides/overview/pricing) — preços oficiais GLM-4.x e GLM-5.x
- [GLM-5.2 — VentureBeat](https://venturebeat.com/technology/z-ais-open-weights-glm-5-2-beats-gpt-5-5-on-multiple-long-horizon-coding-benchmarks-for-1-6th-the-cost)
- [GLM-5.2 — South China Morning Post](https://www.scmp.com/tech/tech-trends/article/3357115/zhipu-ais-stock-rockets-after-chinese-firm-makes-glm-52-open-source)
- [GLM-5 GitHub oficial (zai-org)](https://github.com/zai-org/GLM-5)
- [Qwen3-14B — OpenRouter](https://openrouter.ai/qwen/qwen3-14b)
- [GLM-4.5-Air — OpenRouter](https://openrouter.ai/z-ai/glm-4.5-air:free)
- [DeepSeek API Pricing oficial](https://api-docs.deepseek.com/quick_start/pricing)
- [Gemini API Pricing oficial](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenRouter Web Search Plugin — docs oficiais](https://openrouter.ai/docs/guides/features/plugins/web-search)
- [OpenRouter Web Search Server Tool](https://openrouter.ai/docs/guides/features/server-tools/web-search)
- [Cloudflare Workers Pricing oficial](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers Limits oficial](https://developers.cloudflare.com/workers/platform/limits/)
- [Tavily Pricing](https://www.tavily.com/pricing)
- [Brave Search API](https://brave.com/search/api/)
- [Groq Pricing](https://groq.com/pricing)
- Alibaba/Qwen naming (MEDIA confiança, via WebSearch): [Qwen 3.5+3.6+3.7 Guide](https://codersera.com/blog/qwen-3-5-complete-guide-2026/), [Qwen 3.6 Plus — MindStudio](https://www.mindstudio.ai/blog/what-is-qwen-3-6-plus-agentic-coding-model)
