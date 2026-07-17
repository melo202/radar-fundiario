# Corretor Inteligente OS — Reflexão estratégica sobre o plano (16/07/2026)

> Análise do plano "ROADMAP COMPLETO — CORRETOR INTELIGENTE OS" escrito pelo usuário,
> com lente de BI/estratégia de produto + a realidade do nosso projeto (1 fundador
> advogado/corretor + agente, VPS KVM4, motor territorial/avaliação com 467 testes).
> Este documento NÃO substitui o plano — ele o critica, adapta e sequencia.

## 1. Veredito

O plano é **excepcionalmente bom** — e não por acaso: ele é a maturação da visão
ImobRadar que garimpamos, escrita por quem VIVE a dor (corretor + advogado). Uns 80%
dele já é o DNA deste projeto formalizado: determinismo explicável, proveniência de
cada dado, aprovação humana para tudo que sai, separação mercado×carteira, honestidade
sobre inferência vs fato. O que o plano acrescenta de novo e valioso é a **tese de
produto** (seção 2) e a **arquitetura de dados da carteira privada** (seção 8).

Os três riscos reais não são técnicos:
1. **Escopo** — é um plano de 12–18 meses para um time; nós somos 1 + agente.
2. **Sequenciamento** — 3 fases de infraestrutura antes da primeira validação com
   corretor de verdade (a suposição mais arriscada do projeto não é "conseguimos
   construir auth", é "o corretor abre isso todo dia").
3. **Responsabilidade** — PII no servidor muda o jogo jurídico (LGPD) e operacional
   (backup, incidente, retenção). Entramos nisso de olhos abertos, por fases.

## 2. A tese, em uma frase de BI

Hoje o Corretor Inteligente é **ferramenta de consulta** (o corretor vem quando
precisa). O OS o transforma em **sistema de registro + sistema de ação** (o corretor
vive nele). Em SaaS imobiliário, quem detém o registro da carteira detém a retenção —
o custo de troca passa a ser "perder meu histórico". E o nosso diferencial contra
Jetimob/Vista/Kenlo/Loft (CRMs commodity) é que **nenhum deles tem o motor territorial
e a avaliação auditável de Goiânia**: a "próxima melhor ação" deles é agenda; a nossa
pode ser *"o lote vizinho ao seu captado entrou em leilão da Caixa 18% abaixo do
venal"*. O OS é a camada de hábito; o Radar é o fosso competitivo. **Flywheel:**
carteira privada gera eventos → recomendações melhores → mais uso diário → mais dados
→ relatórios que provam trabalho ao proprietário → mais captação → mais carteira.

## 3. Decisões que o plano toma e que revogam regras vigentes (registradas)

| # | Regra vigente (até 15/07) | O que o plano decide | Status |
|---|---|---|---|
| D1 | "não quero multitenant ainda" | O OS **é** multitenant (orgs/papéis) | Revogada pelo próprio plano do usuário — vale para a branch OS; a ultrapremium continua single-user |
| D2 | PII local-first permanente (ci_leads etc.) | PII vai ao servidor com LGPD, item 25 proíbe localStorage permanente | Revogada NA BRANCH OS, por fases; migração com 1 clique prevista (item 35.8); local vira rascunho/offline |
| D3 | Painel de senha única | Vira acesso administrativo legado | Confirmada — já era a intenção (SEG) |
| D4 | Auth caseira proibida (item 9) | OIDC maduro ou gerenciado | ADR-001 abaixo — spike na Fase 1 |

## 4. O que o plano acerta (mantido sem ressalva)

- **Tela Hoje como centro** e navegação de 4 itens — ataca a causa nº 1 de churn de
  CRM imobiliário: o corretor odeia operar software. Recursos no contexto, não em menu.
- **Separação market_* × inventory_*** com associação explícita e auditável — já é
  nossa regra de ouro (anúncio ≠ captação) formalizada em schema.
- **NBA determinístico e explicável primeiro** (prioridade = urgência × impacto ×
  confiança × relevância ÷ esforço, com penalidades) — coerente com "sem IA no núcleo".
- **Proveniência por campo** (`value/source/confidence/confirmation_status`) — é o
  modelo que JÁ usamos informalmente (declarado × medido × inferido); virar coluna é evolução natural.
- **Captura universal** — a killer feature de adoção. Digitação é onde CRM morre.
- **Fila de aprovações** — generaliza o padrão SV-2 (mensagem pronta, humano envia).
- **Cadastro progressivo em 5 níveis** — espelha a realidade da captação.
- **Item 32 (o que não fazer)** — assino embaixo de todos os 15.

## 5. O que eu refino (com justificativa)

1. **Schema por fase, não big-bang.** O item 8 define ~20 tabelas; criamos por fase:
   F1 = organizations/users/members/roles; F2 = contacts/inventory_properties/tasks/
   domain_events/opportunities; F6+ = proposals/visits/recommendations/approvals.
   Migração que não tem tela que a use é dívida, não progresso.
2. **`probability` em opportunities: adiar.** Probabilidade numérica sem base é falsa
   precisão (nosso contrato de honestidade). Usar a temperatura qualitativa do FU-1
   (🔥/morno/frio) até termos dados históricos para calibrar de verdade.
3. **"Aprender com a decisão" (item 11): v1 só REGISTRA** o aceite/recusa/motivo
   (recommendation feedback). Ajuste automático de pesos é v2, com dados.
4. **Modo visita e relatório automático saem do MVP** (item 33 → v1.1). O v1 precisa
   provar o hábito (Hoje + carteira + captura); visita e relatório são os multiplicadores
   seguintes. MVP menor = validação mais cedo.
5. **Telemetria (item 27): opt-in explícito e agregada** — somos o produto da
   honestidade; medir sem virar vigilância.
6. **Voz na captura: Web Speech API do navegador primeiro** (custo zero, funciona no
   Chrome Android); Whisper no VPS como fallback futuro. Foto/documento (OCR) só na F3b — o
   NV4 (nemotron-ocr) já estava no nosso radar.
7. **Portal do proprietário (F11): já temos o embrião no ar** — SV-1/acompanhe é
   exatamente isso em miniatura. Evolui, não nasce do zero.

## 6. ADRs propostos (decisões de arquitetura — spike antes de cravar)

- **ADR-001 Autenticação:** exigência = OIDC maduro, não-caseiro, custo perto de zero,
  dados no Brasil de preferência. Candidatos: **Logto self-hosted** (Node, leve,
  open-source, OIDC completo — favorito a priori), Zitadel (Go, leve), Keycloak (padrão-
  ouro, mas JVM ~1GB no KVM4 que já roda Ollama), gerenciado (Clerk/Auth0 — custo e
  dados fora). Decisão por spike de 1 sessão na Fase 1. O painel atual NÃO muda.
- **ADR-002 Isolamento no banco:** Postgres **Row-Level Security** por `organization_id`
  + schema novo `os` separado das tabelas de mercado — isolamento "no banco e no
  servidor" como o plano exige, não só na interface.
- **ADR-003 API nova em serviço novo:** `os-api` (porta 8150, systemd próprio), com
  **Fastify** (validação de schema, hooks de auth) — não é migração do motor (8140
  intocado, Node http puro), é escolha para superfície nova com dezenas de rotas.
- **ADR-004 Front sem build step:** `/app` com ES modules nativos + tokens.css do
  rebrand (fiel ao DNA no-build; Vite só se a dor aparecer). Estrutura do item 7 do plano.
- **ADR-005 Feature flags:** tabela `os.feature_flags` + env — cada fase liga por flag.
- **ADR-006 Mídia:** fotos comprimidas no cliente (canvas, já dominamos), servidas por
  URL assinada temporária; 200GB NVMe seguram o início; política de cota por org.

## 7. O que JÁ EXISTE e vira peça do OS (não começamos do zero)

| Existente (branch ultrapremium) | Vira no OS |
|---|---|
| FU-1 (ci_leads, 8 estágios, follow-up, objeções) | `opportunities` + `tasks` — o vocabulário já é o do ImobRadar; migração 1-clique |
| MK-1 (material de divulgação) | `property_media`/criativos + embrião de campanhas |
| SV-1/SV-2 (/acompanhe + mensagem ativa) | Portal do proprietário (F11) + padrão da fila de aprovações |
| Caderno (IndexedDB) + ci_privativa | `inventory_properties` nível 1–2 + characteristics com proveniência |
| Motor avaliação/território/localização/documentos | Camada 2 inteira, pronta e auditável |
| Painel com senha | Área administrativa legada (D3) |
| Splash/didática/como-usar | Onboarding |
| IDEIAS-hub 03/07 (farming de território, pipeline captação, ranking de quadras) | Carteira + capture_stage + recommendations |
| Cadeia IA 3 degraus + validador §17 | Extração da captura universal (schema-forced, números por construção) |

## 8. Sequenciamento adaptado (gates de negócio entre fases)

**Princípio:** a suposição mais arriscada é adoção, não tecnologia. Então o teste com
corretores reais (V5, já pendente) roda ANTES do grosso da construção, usando o app
atual + FU/MK/SV como protótipo conceitual da tela Hoje.

- **F0 — Proteção (1 sessão):** branch `agent/corretor-inteligente-os`, baseline 467
  verdes registrado, ARQUITETURA-OS.md + ADRs, flags, shell `/app` estático publicado
  em paralelo (rota nova no nginx), radar atual intocado. *Aceite = item 28-F0 do plano.*
- **GATE G1 (humano, em paralelo):** Bruno mostra o app atual a 3–5 corretores
  (roteiro V5). Perguntas-chave: "você pagaria R$ X/mês?", "o que te faria abrir todo
  dia?". Os entrevistados viram design partners do OS.
- **F1 — Identidade (2–4 sessões):** spike ADR-001 → auth escolhida; orgs/users/
  members/roles; RLS; sessões; LGPD mínima (aviso, export, exclusão); painel vira admin.
- **F2 — Carteira e relacionamentos (3–5 sessões):** contacts, inventory_properties
  (5 níveis), tasks, domain_events, timeline, dossiê v0 (4 abas), **importador dos
  dados locais** (ci_leads/caderno/ci_privativa/ci_perfil sobem com 1 clique; local vira backup).
- **F3 — Captura universal por TEXTO (2–3 sessões):** pipeline entrada→extração
  (cadeia IA existente com schema §17)→confirmação→dedup→evento. Voz = Web Speech.
- **F4 — Tela Hoje (2–3 sessões):** agenda+tarefas+pendências+decisões; NBA
  determinístico com a fórmula do plano; explicabilidade obrigatória.
- **GATE G2:** 3–5 corretores usando de verdade por 2 semanas. Medir: tempo de
  captação (<3 min), dias ativos/semana, % ações iniciadas no Hoje. Só então F5+.
- **F5 — Dossiê inteligente** (Radar/avaliação/documentos embutidos). **F6 — Matching.**
  **F7 — Modo visita. F8 — Propostas/aprovações. F9 — Relatórios. F10 — Campanhas.
  F11 — Portal do proprietário** (evolução do /acompanhe).

**Métricas norte (desde F2):** ativação = 1º imóvel captado em <10 min da conta criada;
hábito = % de dias com ≥1 ação iniciada no Hoje; retenção W1/W4; NPS dos design partners.
**Preço:** testar disposição a pagar já no G1 (âncoras: Jetimob/Vista ~R$100–250/mês);
nosso premium local se justifica pelo motor territorial. Persona 4 (CRECI-GO/SECOVI)
é canal de distribuição, não produto — atacar após retenção provada.

## 9. Riscos top-5 e mitigação

1. **Maratona de escopo** → fases pequenas com aceite do item 37, gates G1/G2, MVP cortado (item 5.4).
2. **LGPD/incidente** → dados sensíveis pesados (docs pessoais, matrícula) só na F8;
   backup cifrado; logs sem PII; Bruno (advogado) redige as políticas — vantagem injusta nossa.
3. **Dois fronts de manutenção** → ultrapremium CONGELA features (só bugfix); todo
   feature novo nasce no OS; bugs de produção têm prioridade sobre o OS.
4. **Infra no limite (KVM4: Postgres+Ollama+auth+os-api)** → medir RAM no spike; Ollama
   é o candidato a sair (a cadeia remota já cobre) se apertar.
5. **Recomendação ruim mata a confiança** → NBA começa com POUCAS regras óbvias e
   certeiras (follow-up vencido, visita sem feedback, doc faltando) — melhor 5 regras
   que acertam que 50 que erram; expansão guiada pelo feedback registrado.

## 10. Ordem imediata (proposta para o próximo "segue")

1. F0 completa (branch, baseline, ARQUITETURA-OS.md, ADRs, flags, shell /app no ar).
2. Spike ADR-001 (auth) com relatório de RAM/complexidade no nosso VPS.
3. Enquanto isso (humano): G1 — roteiro de entrevista V5 que eu preparo, você aplica.

---

## Diário de execução

### 16/07/2026 — F0 + primeira fatia vertical NO AR (pelo usuário + agente)
O usuário criou a branch **agent/corretor-inteligente-os** e implementou a primeira fatia: migração **006-corretor-os.sql** (organizations, users, members, contacts, preferences, inventory_properties, opportunities, tasks, domain_events — schema por fase, sem recommendations/approvals antecipadas; temperatura qualitativa no lugar de probability, como decidido no item 5.2), **os-core.js** (extração determinística da captura com confiança por campo + NBA por regras testáveis + transação no confirmar + eventos de domínio), shell móvel **/painel/os** (Hoje·Carteira·Relacionamentos·Capturar, protegido pela sessão do painel na alpha), rotas /painel/api/os/* (sessão+CSRF), CORRETOR-INTELIGENTE-OS.md. Bug real achado nos testes: "950 mil" lido como 950 milhões (ordem das unidades) — corrigido.

Agente (mesmo dia): suíte completa **473/473** na branch; **hospedagem virada** — deploy-api.sh (commit 6e724b1) e /opt/radar/deploy-app.sh apontam para a OS (repo do VPS era single-branch: precisou git remote set-branches --add); migração 006 aplicada em produção; verificado ao vivo: card "OS — alpha" no painel, /painel/os e APIs respondem 401 sem sessão, app principal e /acompanhe intactos. **A ultrapremium está oficialmente congelada (só bugfix).**

Próximos passos da alpha (ordem do plano, item 35): captura por voz (Web Speech) e foto; dossiê do imóvel da carteira (4 abas) integrando Radar/avaliação; oportunidades ganham UI (hoje só alimentam o Hoje); depois GATE G1 (3–5 corretores) antes da Fase 1 (auth real, ADR-001).

### 16/07/2026 — D-1: dossiê do imóvel da carteira NO AR (commit 06e6f44)
As 4 áreas do item 16 do plano, nem uma a mais: **Visão geral** (dados com origem, pendências resolvíveis em 1 toque, "Completar cadastro" — whitelist pura `montarAtualizacaoImovel`, injeção de coluna impossível; pendência que a atualização resolve se conclui SOZINHA), **Comercial** (interessados: contato find-or-create por telefone + oportunidade + evento — a tela Hoje passa a cobrar o retorno; **Referência de mercado** integrando o /motor/mercado com rótulo honesto e área PRIVATIVA para apartamento — a regra AREA-APTO atravessou para o OS), **Arquivos** (estado vazio honesto: Fase 8), **Histórico** (domain_events → frases via `rotuloEvento` puro). Carteira e ação "Abrir imóvel" do Hoje abrem o dossiê. Testes os-dossie (479/479). Verificado em produção com ciclo real: captura → atualizar (área 84, preço 950→940k, estágio visitado) → interessada quente → timeline legível; rotas 401 sem sessão. Imóvel demo "Apartamento · Setor Bueno" ficou no banco para o usuário explorar.
Próximo: captura por voz (Web Speech) OU oportunidades avançarem de estágio pelo dossiê (hoje só nascem) — decidir no próximo segue.

### 16/07/2026 — D-2: funil no dossiê NO AR (commit fd6441f)
O interessado CAMINHA: 9 estágios oficiais, temperatura, próximo passo (data que alimenta o motor do Hoje). Regra de honestidade do funil: **perdido EXIGE objeção tipificada** (8 motivos do vocabulário FU-1/ImobRadar — perder sem motivo não ensina nada); reabrir limpa o motivo. Mexer no funil É interação (last_interaction_at). Eventos próprios (stage_changed/won/lost) com frases de corretor na timeline. Whitelist pura montarAtualizacaoOportunidade testada (483/483). Verificado em produção: Marina avançou Novo interessado → Visita agendada → Proposta (quente, passo 18/07); guarda do perdido bloqueou sem motivo; e o Hoje corretamente NÃO a cobra (próximo passo futuro + interação fresca — priorização explicável funcionando).
Próximo: captura por voz (Web Speech) ou FU-2 no OS (mensagem de WhatsApp contextual ao estágio — o padrão SV-2 aplicado ao funil).

### 16/07/2026 — D-3 (FU-2 no OS): mensagem pronta por estágio + registrei contato (commit ec8733e)
Padrão SV-2 aplicado ao funil (ATIVO, nunca automático): `mensagemFunil` pura — 9 estágios, 9 mensagens em voz de corretor (primeiro nome, imóvel; visita agendada confirma a DATA; perdido deixa a porta aberta). Regra testada em todos os estágios: **mensagem é conversa, não anúncio — preço NUNCA entra**. Dossiê entrega a mensagem pronta por interessado; UI com ver/copiar/abrir no WhatsApp (wa.me com texto). "✓ Registrei contato" em 1 toque: só last_interaction_at + evento — a conversa fica no WhatsApp do corretor, não no servidor; o Hoje para de cobrar por 3 dias. Lição de CSP: style-src 'self' do OS bloqueia atributo style inline — estilos sempre por classe. 486/486; verificado em produção (mensagem do estágio Proposta da Marina, evento "Contato registrado", rota 401 sem sessão).
Próximo candidato: captura por voz (Web Speech) — o miolo comercial da alpha está fechado.

### 16/07/2026 — D-4: captura por VOZ (commit c8d1e1c)
Web Speech pt-BR no diálogo de captura (Chrome/Android, custo zero): "Falar em vez de digitar" com parciais no status e finais entrando no textarea; o Chrome corta em pausas — religa até o corretor mandar parar. **Regra de honestidade testada: a voz NUNCA interpreta nem salva sozinha — só preenche o texto**; interpretar/confirmar continuam manuais. Microfone sob controle (para ao fechar o diálogo e ao interpretar); sem suporte, o botão nem aparece (fallback digno = digitação); erro de permissão vira orientação. 490/490; arquivo publicado conferido no VPS. **HUMANO: testar o microfone no celular real** (permissão + ditado em ambiente de rua) — headless não exercita mic.

### 16/07/2026 — D-5: filtros rápidos da Carteira + ROTEIRO-G1 (commit 777ec43)
Item 15 do plano: 8 filtros determinísticos com contagem (Todos/Prospecção/Captados/Em divulgação/Com interessados/Com pendências/Parados/Vendidos-alugados). **"Parado" tem definição pública** — sem interessado aberto e sem movimento há >14 dias; desfecho nunca conta — explicada no próprio estado vazio (nunca julgamento opaco); vazio ensina o próximo passo. Filtragem client-side, zero requisição extra. **ROTEIRO-G1.md criado**: 3–5 corretores, dor antes da demo, 5 tarefas cronometradas no celular DELES (captar por voz <3 min; teste dos 5 s da tela Hoje), sequência de preço (R$ 50→250), critérios do gate definidos ANTES (vai / pivô / para-e-repensa). 493/493. Paralelo: o usuário registrou IDEIA-DOSSIE-INTELIGENTE.md + ROADMAP-IA-DOSSIE.md (dossiê estilo NotebookLM com fontes/citações por documento — aprovado para fase posterior, sem instalar Open Notebook inteiro; casa com F8-Arquivos e NV4-OCR).
**A alpha para AQUI até o GATE G1 rodar** — a próxima linha de código grande (Fase 1: contas) depende da evidência das entrevistas.

### 17/07/2026 — Mercado em Movimento: precisão no termômetro + valor automático no mapa
O usuário auditou o painel de olho: "245 mil pra 600 mil… acho que foi o primeiro apartamento que você viu no mesmo bairro". Confirmado nos dados: **as 7 mudanças de preço eram todas falsas** — URLs de página-catálogo comparadas pela URL bruta, sem consultar a peneira (MERCADO-EM-MOVIMENTO.md tem a prova). Correção em 5 partes, tudo determinístico: **identidade canônica do anúncio** (id que o próprio portal dá na URL; `listings.external_id` enfim preenchido; go.olx = www.olx), **mudança verificada** (mesmo portal+id, DUAS coletas comparáveis, salto ≤50%; maior vai para quarentena visível), **peneira reforçada** (portal com padrão de id conhecido + URL sem id = catálogo decisivo — a auditoria achou 894/1037 URLs de catálogo e parte escapava com 1 sinal), **backfill** (invalida as 7 falsas — nunca apaga — e recomputa as legítimas), **valor automático no mapa** (índice de R$/m² mediano por bairro+tipo com dedup §5; `GET /motor/estimativa` responde em ms e o card Mercado mostra a estimativa SOZINHO ao abrir o imóvel, com faixa, n e confiança; n<3 não vira número). Suíte 505/505.
