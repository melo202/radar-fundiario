# Motor Inteligente de Análise de Preço — Plano + Diagnóstico (Fase 1)

> Registrado em 15/07/2026 a partir da especificação do usuário ("Implementação do Motor
> Inteligente de Análise de Preço do Radar Fundiário"). Este documento guarda (A) o resumo fiel
> do plano, (B) o diagnóstico técnico da arquitetura atual — a primeira entrega exigida pela
> Fase 1/§27 do plano — e (C) as adaptações de stack necessárias à realidade do projeto e da
> hospedagem (Hostinger). Nada daqui foi implementado ainda.

## A. O plano, em essência (§1–§29 da especificação)

**Princípio central (§1):** a IA NUNCA produz o preço. O valor sai de um motor determinístico e
auditável (comparáveis reais → filtros → pontuação → homogeneização → estatística robusta →
faixa + confiança). A IA entra só para: extrair atributos de anúncios/documentos (saída
estruturada validada por schema, campo desconhecido = null), justificar comparáveis, explicar
resultados e redigir o laudo — com validação posterior de que os números do texto batem com o
JSON. Este princípio é IDÊNTICO à regra do repo ("sem IA no núcleo") — o plano é uma evolução
natural, não uma ruptura.

- **Dados (§3–§5):** entidade `Property` padronizada (fonte, localização c/ confiança,
  características, preços c/ histórico, qualidade), extração por IA com regras anti-alucinação,
  deduplicação multi-sinal (endereço, coords, área, imagens, similaridade) SEM descarte cego.
- **Comparáveis (§6–§7):** filtros mínimos (tipologia, cidade, distância, faixa de área,
  recência, qualidade) → pontuação ponderada configurável (localização 30 %, área 20 %,
  tipologia 15 %, padrão 15 %, idade 10 %, extras 10 %); embeddings apenas como auxílio, nunca
  critério único; microrregiões evoluem depois.
- **Preço (§8–§13):** separar anunciado × ajustado × estimado; mediana/média ponderada/IQR/MAD;
  outliers explicados (nunca apagados em silêncio); lançamentos separados de usados
  (`PricingFlags`); margem de negociação exibida, configurável e editável; amostra de 10–30
  comparáveis (ou declarar insuficiência); confiança qualitativa (muito baixa → muito alta) com
  metodologia transparente.
- **Corretor + laudo (§14–§17):** ferramenta assistida — incluir/excluir comparáveis, ajustar,
  tudo com trilha de alteração; mapa com avaliado + comparáveis numerados (aceitos/rejeitados/
  outliers); rastreabilidade total (portal, URL, datas, justificativa, pontuação); IA redige a
  partir de JSON fechado e não altera números.
- **Arquitetura (§18–§22):** módulos (ingestion, normalization, geocoding, dedup, quality,
  selection, scoring, valuation, outliers, confidence, ai-provider, ai-extraction,
  ai-report-writing, report, audit); API REST com fluxo cadastro→normaliza→geocodifica→
  comparáveis→dedup→pontua→revisão→cálculo→texto→laudo; banco versionado (nunca sobrescrever
  análise antiga); interface `AIProvider` desacoplada de fornecedor (env: `AI_PROVIDER`,
  `AI_MODEL_FAST`, `AI_MODEL_ADVANCED`); cache por hash, fila, retry, contabilização de custo.
- **Execução (§26–§29):** 6 fases (auditoria → estruturação → comparáveis → motor → laudo →
  evolução), branch própria, commits pequenos, testes por etapa, e critérios de aceite duros
  (preço nunca vem de resposta livre da IA; cálculos reproduzíveis; fontes visíveis; interface
  simples; nada existente quebra).

## B. Diagnóstico da arquitetura atual (Fase 1 — os 14 itens do §27)

1. **Tecnologias:** app de arquivo único `radar-goiania.html` (~9,6 mil linhas: CSS+HTML+JS
   vanilla), Leaflet + proj4 via CDN, PWA (`sw.js`), testes Node puro (`node:test`, 357
   passando), deploy estático curado via GitHub Actions → GitHub Pages.
2. **Banco de dados: NÃO EXISTE.** Estado local em `localStorage` (caderno, checklist, datas,
   perfil do profissional) + datasets estáticos versionados no repo (bairros, logradouros/CNEFE,
   limite municipal, tabela CAIXA). Nenhum servidor, nenhuma persistência central.
3. **Backend: NÃO EXISTE.** Todas as consultas vão direto do navegador ao ArcGIS público da
   Prefeitura de Goiânia via JSONP (sem CORS). Não há API própria, autenticação nem fila.
4. **Frontend:** o próprio app — shell "Atlas Cívico" (busca universal, inspetor 480 px à
   esquerda, dossiê Resumo/Território/Diligência, mapa dominante).
5. **Serviços existentes** (todos client-side, determinísticos): busca multi-modo
   (inscrição/quadra-lote/endereço/prédio), identificação de lote por clique, comparáveis
   FISCAIS de vizinhança (raio 400/800 m, mesmo uso, área 0,5–2×, mediana+Q1–Q3 com cerca de
   Tukey), escolha automática de fonte de âncora (tabela do bairro → laudos CAIXA com n≥5 →
   aviso de baixa precisão), scores de cobertura/posição cadastral, trilha de evidências,
   checklist documental, pacote de diligência.
6. **Fluxo atual do laudo:** wizard 4 passos → HTML dedicado (`.lcard`) → PDF via impressão do
   navegador. Tipos: Relatório de Referência ou Ficha; **PTAM suspenso** por contrato de
   honestidade (`habilitaPtam() → false`, travado em teste) até existir verificação profissional.
7. **De onde vêm os "comparáveis" hoje:** da base FISCAL (valores venais de vizinhança) e dos
   laudos públicos da CAIXA — explicitamente rotulados como "não são transações, ofertas nem
   comparáveis de mercado". **Não existe coleta de anúncios de portais.** O §3–§5 do plano
   (ingestão/normalização/dedup de anúncios) é 100 % greenfield.
8. **Como os dados são armazenados:** não são (além de localStorage e datasets estáticos).
9. **Como o valor é calculado hoje:** estatística robusta sobre venais (mediana, IQR, Tukey) +
   faixa CAIXA quando n≥5 no setor; NENHUM ajuste heurístico automático (fatores de
   oferta/conservação foram removidos e são PROIBIDOS por teste até existir calibração — ver
   `tests/trust.test.mjs`). A calculadora de negócio começa em zero, sem valor presumido.
10. **O que já funciona e deve ser preservado:** o princípio §1 já é lei no repo; a régua de
    âncoras (mediana de USADO, corte de outliers, fonte+data declaradas — 03/07/2026); a
    linguagem honesta (oferta ≠ transação); os testes de confiança que proíbem copy enganosa;
    o mapa Leaflet (atende o §15 sem custo); o motor de vizinhança fiscal (vira um dos sinais
    do módulo de localização); o wizard/laudo (vira o esqueleto das telas 1–4 do §24).
11. **O que está incompleto/frágil para os fins do plano:** sem backend/BD (bloqueia §18–§21);
    sem dados de MERCADO (o app hoje só tem venal+CAIXA — bloqueia §6 de verdade); JSONP é
    aceitável para uso próprio mas não para um produto com backend (proxy resolve); ITBI não é
    público (pedido LAI pendente — melhoraria §8 com transações reais).
12. **O que dá para implementar sem quebrar nada:** TUDO do plano nasce em serviço novo
    (servidor), consumido pelo app como os datasets atuais são consumidos — o núcleo cadastral
    permanece intocado. Risco de regressão ~zero se o contrato for "JSON de âncoras/analises
    versionado + endpoints novos".
13. **Riscos:** (a) coleta de portais — sem API pública; scraping direto viola ToS; caminho
    honesto = pesquisa via web search de IA sobre conteúdo publicamente indexado, OU parcerias/
    exports manuais do corretor, OU dados próprios da base do usuário; registrar a decisão por
    fonte; (b) hospedagem sem GPU (ver C); (c) LGPD nos anúncios (não armazenar dados pessoais
    de anunciantes além do permitido); (d) custo de IA — mitigado por cache/batch/modelo rápido.
14. **Sequência proposta** (menor fatia vertical primeiro, §27): ver "Fases adaptadas" abaixo.

## C. Adaptações de stack (decisões, com motivo)

- **Hostinger:** planos compartilhados NÃO rodam Ollama/Qwen (sem GPU, RAM limitada; Qwen 14B
  em CPU é inviável para produção). Um **VPS** Hostinger roda bem: Node/Python + PostgreSQL +
  PostGIS + PaddleOCR (CPU ok) + o proxy CORS do roadmap. Para os MODELOS, usar a própria
  interface `AIProvider` do plano apontando para **API compatível com OpenAI (ex.: Groq servindo
  Qwen)** como caminho rápido/barato, com **Claude API (`claude-opus-4-8`) como modelo premium/
  fallback** — exatamente as opções que o §2 já prevê. Se um dia houver GPU própria, troca-se
  por Ollama via env, sem tocar código.
- **Mapa (§15):** manter Leaflet/OSM já existentes — critério do plano ("não dependa de API
  cara") já satisfeito.
- **Geo (§7):** PostGIS no VPS + os datasets que o repo já tem (bairros, limite municipal,
  CNEFE) como primeiras camadas de microrregião.
- **Embeddings (§2):** só a partir da Fase 3, e nunca como critério único (regra do plano).
- **Nomenclatura (§25):** o app já usa "referência indicativa"/"estimativa"; o produto novo
  nasce como **Análise Comparativa de Mercado (assistida)** — nunca "avaliação automática".

## Fases adaptadas ao projeto (mapeando §26)

| Fase do plano | Tradução para este repo | Pré-requisito |
|---|---|---|
| 1 Auditoria | **Este documento** ✅ | — |
| 2 Estruturação | ✅ **15/07/2026** — VPS KVM4 + Postgres/PostGIS + `motor/` no repo: `AIProvider` desacoplado (env), migração 001 (listings/properties/valuations versionadas/ai_logs/ai_cache/audit), extração §4 com schema, systemd `radar-api` atrás do nginx. **Decisão de custo zero (usuário):** Qwen3 LOCAL via Ollama no próprio VPS (8b rápido, 14b avançado, bge-m3 embeddings) — sem GPU: ~15–60 s por extração (191 tokens ≈ 3,3 tok/s), viável para o desenho fila+lote+cache do plano; cache respondendo em ~8 ms. "Hermes" dispensado (é alternativa, não complemento). | — |
| 3 Comparáveis | **Ingestão fonte A NO AR (15/07/2026):** Brave Search (conteúdo público indexado, sem scraping de portal) → extração pela cadeia de IA → `listings`/`properties`/`price_history`/`audit_log`, dedup de 1º nível por (portal,url,hash), endpoints protegidos por MOTOR_TOKEN. 1ª colheita real: 18/18 extraídos sem falha — e revelou o desafio previsto no §6: a busca devolve muitas PÁGINAS-CATÁLOGO dos portais (sem preço/área individuais; ex.: extrator leu "3.703 imóveis" como área). **Peneira §6 NO AR (15/07/2026, `motor/qualidade.js` — determinística, testada na suíte):** catálogo vs anúncio, completude, grau de comparável com razões gravadas; requalificação retroativa sem custo (`POST /motor/requalificar`); prompt endurecido (área só com m², contagem≠área, faixa≠preço). Resultado medido: 1ª colheita requalificada = 18 itens → 2 comparáveis/7 catálogos; 2ª colheita com consulta enviesada para preço ("R$"+m2) = 16 novos → **7 comparáveis/2 catálogos** (taxa saltou de 11% para 44%). Acervo: 9 comparáveis reais no Setor Bueno (R$ 6,6–18,5 mil/m² — faixa plausível). **Próximo:** dedup multi-sinal (§5), geocoding CNEFE (§7), pontuação de comparáveis (§6) e amostra mínima por bairro para o 1º cálculo (§12). B (manual) e C (parcerias) entram pela mesma tabela. | Fase 2 ✅ |
| 4 Motor estatístico | mediana ponderada, IQR/MAD, outliers explicados, faixa + confiança, testes | Fase 3 |
| 5 Laudo | redação por IA a partir do JSON fechado + validação números-texto + mapa de comparáveis + fontes | Fase 4 |
| 6 Evolução | histórico, ITBI (LAI), calibração regional, hedônica/ML, backtesting | Fases 2–5 |

**Primeira entrega funcional (§27):** no app atual, uma aba "Mercado" no dossiê que consome do
servidor uma análise versionada: imóvel → ≥10 comparáveis rastreáveis (quando houver) →
mediana ponderada + faixa + confiança + explicação gerada (números idênticos ao JSON) →
revisão do corretor. Branch própria (`agent/motor-preco`), commits pequenos, testes por etapa.
