# Projeto Mercado em Movimento — precisão no rastreio de preços (17/07/2026)

Pedido do usuário (17/07): *"tem que ter o máximo de precisão possível… estava 245 mil e
foi pra 600 mil, acho que foi o primeiro apartamento que você viu no mesmo bairro"* — e
o mapa tem que mostrar o valor **sozinho**, alimentado pela base que a varredura puxa
todo dia, sem o corretor esperar busca ao vivo.

## O diagnóstico (auditoria nos dados de produção)

O olho do usuário estava certo. **As 7 "mudanças de preço" registradas até 17/07 eram
todas falsas.** A prova, direto do `audit_log`:

| URL comparada | "de" | "para" |
|---|---|---|
| `olx.com.br/imoveis/venda/casas/...regiao-sul/st-marista` | R$ 78.458 | R$ 1.730.000 |
| `olx.com.br/imoveis/estado-go/...regiao-oeste/goia` | R$ 245.000 | R$ 600.000 |
| `vivareal.com.br/imoveis-lancamento/goiania/...` | R$ 888.152 | R$ 607.202 |

Nenhuma dessas URLs é um anúncio: são **páginas-catálogo** (a lista de casas do Setor
Marista). A cada varredura, o snippet da MESMA URL mostrava um imóvel diferente do topo
da lista — e o motor comparava o preço de um imóvel com o preço de OUTRO, como se fosse
o mesmo mudando de valor. Dois defeitos somados:

1. a comparação ancorava na **URL bruta**, não na identidade do anúncio;
2. a comparação **não consultava a peneira** — página-catálogo não pode ter "preço".

A auditoria das 1.037 URLs do acervo ainda mostrou um terceiro furo: 894 URLs são
catálogo, e parte delas escapava da peneira §6 quando o snippet trazia preço+área de
uma unidade (1 sinal só não bastava) — sujando também o índice de comparáveis.

## A correção (tudo determinístico, zero IA)

**1. Identidade canônica do anúncio** (`motor/identidade-anuncio.js`, puro+testado):
o id que o PRÓPRIO portal dá ao anúncio na URL — OLX `…-1367774783`, VivaReal/Zap
`…id-2879172082`, ImovelWeb/WImóveis `…-1234567.html`, genérico para a cauda longa.
`go.olx.com.br` e `www.olx.com.br` são o mesmo portal (domínio registrável). Sem id,
não há identidade; sem identidade, **não existe mudança de preço** — o registro entra
no acervo e pronto. Preenche `listings.external_id` (existia desde 001-base, vazio).

**2. Mudança de preço verificada** (`ingerir.js`): só conta quando (a) mesmo portal
raiz + mesmo external_id, (b) as DUAS coletas passaram na peneira como comparáveis,
(c) salto ≤ 50%. Salto maior vira `mudanca-preco-suspeita` (quarentena visível no
painel — provável troca de unidade no anúncio ou erro de extração, nunca "mercado").
Detalhe auditado ganhou bairro, tipo, área e variação % para conferência humana.

**3. Peneira reforçada** (`qualidade.js`): nos portais cujo padrão de id conhecemos,
URL sem id É catálogo (sinal decisivo). O botão "Requalificar acervo" aplica isso
retroativamente ao acervo inteiro.

**4. Saneamento** (`backfill-identidade.js`, roda 1x): preenche external_id no acervo,
INVALIDA (nunca apaga — §16) as 7 mudanças falsas e recomputa as legítimas do
histórico pelo critério novo.

**5. Valor automático no mapa** (`indice-bairro.js` + `/motor/estimativa`): mediana de
R$/m² por (bairro normalizado, tipo) sobre comparáveis deduplicados (§5), cache de 30
min. Quando o imóvel abre no mapa, o card Mercado mostra **sozinho** a estimativa
imediata (valor, faixa Q1–Q3, n da amostra, confiança por regras) — zero clique, zero
espera, zero cota. Amostra com n<3 não vira número (honestidade nos limites). O
"Calcular valor" continua sendo a avaliação completa com comparáveis nomeados e laudo.
`GET /motor/mercado/bairros` expõe o índice completo.

## Revisão adversarial (17/07, mesma tarde — 53 agentes, 5 lentes × 2 céticos por achado)

11 achados confirmados por maioria e TODOS corrigidos no mesmo dia:

1. **(alta)** Fallback genérico transformava CEP/telefone no fim do slug em "id" — a
   mesma família do bug original. Agora a cauda longa só ganha identidade com marcador
   explícito (`id-`/`cod-`/`ref-`); menos cobertura é o preço certo da precisão.
2. **(média)** `portalRaiz` colapsava sufixos públicos (`.srv.br`) e plataformas
   multi-tenant. Agora só os portais CONHECIDOS unificam subdomínios; no resto, o host
   inteiro é o portal.
3. **(alta)** Backfill não era idempotente (re-execução duplicava o termômetro) — agora
   checa se o par já foi registrado.
4. **(média)** O "anterior" podia ser um estado velho — agora ordena por
   `COALESCE(last_seen_at, collected_at)` (recoleta idêntica atualiza last_seen_at).
   Limitação documentada: reversão a um preço já visto com texto idêntico não gera linha.
5. **(média)** Dedup multi-sinal fundia unidades DIFERENTES do mesmo prédio (posição
   CNEFE igual) — geo só decide com preços numa banda de 10%.
6. **(média)** `/motor/estimativa` respondia 500 para erro de uso — o catch global agora
   respeita `e.status` (400).
7. **(alta)** A estimativa usava a classe `dmercado-num`, sentinela do atalho
   `irParaAvaliacao` — o laudo de 1 toque nunca mais dispararia. Classe própria
   (`dmercado-estimativa`).
8. **(alta)** Tipo vinha de `ehAptoProvavel` (casa nunca ganhava estimativa; loja ganhava
   estimativa de "casa"). Agora `tipoParaEstimativa` usa a detecção REAL de unidade
   (`unitLabel`, a mesma da ficha) e usos sem índice ficam fora.
9. **(média)** Corrida no card (reabrir rápido duplicava o bloco) — época + sentinela.
10. **(média)** Variação % usava `max(de, para)` no denominador e subestimava toda
    subida — agora é sobre o preço anterior (400→500 mil = +25%).
11. **(baixa)** O card agora declara a ÁREA usada no cálculo ("sobre 84 m² privativos
    (informados)").

## O que fica para a sequência (não nesta fatia)

- Extração da PÁGINA do anúncio (hoje o preço vem do snippet da busca — a página traz
  histórico e dados completos; exige decisão sobre termos de uso dos portais).
- Tendência por bairro no tempo (o índice diário já fica gravado via price_history —
  quando houver semanas de dados, o gráfico nasce de graça).
- Alertas: "imóvel da sua carteira tem vizinho que baixou preço" (OS, pós-G1).

## Rotulagem honesta (regra de sempre)

Tudo aqui é **oferta anunciada, não transação**. O termômetro mostra reprecificação de
anúncios; a estimativa do bairro é mediana de pedida. Nenhum número vira "valor de
mercado" sem essa etiqueta.
