# Plano: Oportunidades (Leilões + Caixa + Bancos) — 17/07/2026

Pedido do usuário: alimentar continuamente a base com imóveis de leilão e da Caixa,
cruzar com o índice de mercado e mostrar no mapa de forma automática. Este plano
sintetiza a pesquisa de **10 agentes em paralelo** (17/07/2026) + testes técnicos
feitos no VPS e na máquina residencial no mesmo dia. Fontes detalhadas por frente:
transcript do workflow `pesquisa-leiloes-caixa`.

## 1. O que a pesquisa descobriu (fatos verificados)

### Fontes, por ordem de valor
| Fonte | Volume em Goiânia | Acesso | Status |
|---|---|---|---|
| **Caixa** (CSV oficial `Lista_imoveis_GO.csv`) | **262 imóveis** (142 Leilão SFI, 88 Licitação Aberta, 21 Venda Direta, 2 Venda Online) | Arquivo oficial, regenerado ~01:00 UTC diariamente (Last-Modified + ETag confirmados) | ✅ testado — mas **só do IP residencial** |
| **Judicial (DJEN/Comunica API)** `comunicaapi.pje.jus.br` | TJGO: 1.706 resultados p/ "leilão"; TRT18 e TRF1 também | **API pública JSON, sem autenticação, TESTADA em 17/07** — texto integral do edital + nº CNJ + link Projudi | ✅ melhor achado da pesquisa |
| **Santander** (`santanderimoveis.com.br`) | ~85 | WordPress REST API pública (`/wp-json/wp/v2/estate_property`, X-WP-Total, campo `modified`) | ✅ testado |
| **Banco do Brasil** (`seuimovelbb.com.br`) | 2 (136 em GO) | POST `/catalogo` JSON (token `cppnp` da página) | ✅ testado |
| Leiloeiras oficiais (Zuk, Mega, Frazão/Itaú) | ~7+7+4 | HTML público server-side | ok, fase 3 |
| Itaú/Bradesco/Inter/Emgea portais | dezenas | SPA/WAF/token | fase 3+, baixa prioridade |
| Agregadores (leilaoimovel 340, Leilão Ninja 1.374) | grandes números **inflados** (lotes encerrados) | 403/ToS — **são concorrentes, não fontes** | ❌ não raspar |

### O bloqueio crítico (testado em 17/07)
- O **VPS recebe HTTP 403** da Caixa (Radware Bot Manager bloqueia IP/ASN de
  datacenter — até a home). Aquecer cookies NÃO resolve (testado).
- A **máquina residencial baixa normal** com o método do `atualizar-caixa.py`
  (urllib + User-Agent identificável): 200, 1,75 MB (testado hoje).
- **Decisão de arquitetura: runner residencial** — a máquina do usuário baixa o CSV
  1x/dia (~22:40 BRT, logo após a regeneração) e faz POST autenticado (MOTOR_TOKEN)
  para `api.corretorinteligente.tech/motor/ingestao/caixa`; TODO o processamento
  (parse, diff, geocodificação, eventos) fica no VPS. Se o download falhar,
  o painel avisa e o dado antigo fica rotulado com a data.
- **Régua jurídica (frente juridico-extracao): NUNCA burlar CAPTCHA/anti-bot** —
  se o Radware bloquear também o residencial, cai para atualização manual no
  navegador ou pedido LAI à Caixa. Verde = arquivo oficial e editais; amarelo =
  página pública educada (fatos apenas, sem fotos/textos); vermelho = login/CAPTCHA/
  API privada por engenharia reversa.

### Regras de honestidade que a pesquisa cravou
1. **Preço de leilão NUNCA entra no índice de ofertas** (mercados distintos) — defesa
   em 3 camadas: `market_segment` na ingestão, filtro nas queries de comparáveis,
   CHECK constraint no banco.
2. Sumiço do CSV = **"saiu da lista da Caixa"**, nunca "vendido" (não é verificável).
   Regra: 1 dia fora = "ausente"; 3 dias = encerrado com motivo; reaparição reativa.
3. Semântica dos dois preços da Caixa: em **Leilão SFI**, "Valor de avaliação" =
   lance mínimo do 1º leilão e "Preço" = lance do 2º (confirmado em amostra real);
   nas demais modalidades "Preço" = valor mínimo aceito hoje.
4. **Desconto com dois rótulos, nunca misturados**: "desconto vs avaliação Caixa"
   (campo oficial) e "X% abaixo da mediana de OFERTAS do bairro (n=N)" (nosso índice,
   só com n≥5 e área conhecida; sem isso, indisponível com razão — nunca estimado).
5. **Avisos jurídicos POR MODALIDADE** (frente risco-honestidade, com jurisprudência
   2024-2026): leilão judicial ≠ extrajudicial (STJ Tema 1134: IPTU anterior não
   acompanha o arrematante NO JUDICIAL; no SFI da Caixa o edital PODE repassar IPTU/
   condomínio e vale); 2ª praça judicial abaixo de 50% da avaliação = preço vil
   (anula); comissão do leiloeiro 5% por fora; ocupado = 6-18 meses na prática;
   direito de preferência do ex-dono até o 2º leilão SFI. Textos prontos na pesquisa.
6. **LGPD**: editais judiciais têm nome/CPF do executado — o app só armazena e exibe
   dados do IMÓVEL + link do edital; PII do devedor nunca é persistida.

### Modelo de dados (migração 008, desenhada pela frente modelo-dados)
- `properties.market_segment` ('oferta'|'caixa'|'leilao') + CHECK "leilão nunca
  comparável"; reuso de `listings` (portal='caixa', external_id = Nº do imóvel de
  13 dígitos) para dedup/last_seen de graça.
- Tabela `oportunidades` (1:1 com listing): valor_avaliacao, preco_atual (=lance
  mínimo vigente), modalidade, datas de praça (quando houver), situacao (máquina de
  estados), matricula, edital_url, fonte, precisao_geo declarada.
- Eventos no `audit_log` (padrão kebab-case existente): `imovel-novo`, `preco-baixou`,
  `saiu-da-lista`, `voltou-a-lista`, `oportunidade-detectada` — alimentam um bloco
  "Oportunidades em movimento" no painel, irmão do Mercado em Movimento.
- Exceção de quarentena: queda de preço + mudança Leilão SFI → Licitação Aberta é o
  fluxo normal da Caixa, não "mudança suspeita".

### Geocodificação (frente geocodificacao-match — infra 80% pronta)
Cascata com precisão declarada, parando no primeiro acerto:
1. **QD/LT + bairro no cadastro municipal** (o matcher do atualizar-caixa.py já faz;
   43-59% dos registros têm QD/LT) → pino NO LOTE ("lote", 0.95);
2. rua+número via CNEFE (`geocodificar.js`) → "numero"/"numero-proximo" (só 8% têm número);
3. rua sem número → "logradouro" (validando localidade);
4. só bairro → **círculo translúcido no centroide** (nunca pino) — "bairro", 0.15;
5. resto → fila "não mapeados", visível, nunca descartada.

### UX (frente ux-corretor — lacuna competitiva confirmada)
Nenhum player brasileiro cruza lance com índice próprio auditável de R$/m² por bairro
— todos usam a avaliação do próprio banco (círculo vicioso). Proposta:
- **Mapa**: toggle "Oportunidades" (pino dourado Caixa mantido; roxo p/ judicial);
  cluster mostra "7 · até -52%"; zoom alto põe o % no pino; halo tracejado quando a
  precisão é "bairro".
- **Card** (hierarquia mobile): 1º badge "38% abaixo da mediana do bairro", 2º "Lance
  mínimo R$ 185.086" (número grande), 3º "Avaliação da Caixa R$ 327.700" (menor),
  4º linha do índice "R$ 5.320/m² · 41 ofertas · 90 dias", 5º modalidade + datas,
  6º badges de risco ("⚠ Pode estar ocupado — desocupação por conta do comprador" é
  o DEFAULT; só vira "✓ Desocupado (segundo o anúncio)" com fonte), 7º links
  obrigatórios para a página oficial e o edital.
- **Lista "Oportunidades do dia"** ordenada por desconto real; sem base de comparação
  → fim da lista com o desconto oficial + rótulo de cautela.
- **Alertas por bairro acompanhado** (fase posterior, casa com o OS): novo imóvel,
  desconto ≥ limiar, queda de lance, praça em 48h.

## 2. Fases de implementação

- **F1 — Caixa de ponta a ponta** (maior valor, 80% do código já existe):
  runner residencial (download + POST) → endpoint `/motor/ingestao/caixa` (token) →
  migração 008 → parse/diff/geocodificação no VPS → eventos no audit_log → endpoint
  público de oportunidades → mapa consome a API (aposenta o `caixa-goiania.js`
  estático, mantido como fallback) → desconto real vs índice → card com avisos por
  modalidade → bloco no painel.
- **F2 — Judicial via DJEN/Comunica**: cron diário (TJGO/TRT18/TRF1, termos "leilão"/
  "hasta"/"praça"), parser determinístico do texto do edital (matrícula, CRI,
  avaliação, 1ª/2ª praça, lances), fila de revisão para o que a regex não pegar,
  pinos roxos. Validar filtros no Swagger oficial antes.
- **F3 — Santander (REST) e BB (POST /catalogo)**; leiloeiras Zuk/Mega/Frazão-Itaú
  com coleta educada + e-mail prévio propondo divulgação com link (converte amarelo
  em verde).
- **F4 — Alertas no OS** (pós-G1): bairros acompanhados, digest diário.

## 3. Decisões em aberto (para o usuário)
1. **Runner residencial**: instalar Tarefa Agendada no Windows do usuário (22:40 BRT
   diária, script python de ~30 linhas) — precisa de OK explícito.
2. ITBI de Goiânia e emolumentos do CRI-GO: confirmar alíquotas antes de publicar
   qualquer "custo total estimado" (a pesquisa não cravou).
3. Raspagem da página de detalhe da Caixa (situação de ocupação, datas de praça,
   matrícula): mesmo domínio protegido pelo Radware — fase posterior, só com a régua
   jurídica revisitada; até lá, ocupação = "a confirmar no edital" (default honesto).
