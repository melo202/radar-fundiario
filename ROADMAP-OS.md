# Corretor Inteligente OS — Reflexão estratégica sobre o plano (16/07/2026)

> Análise do plano "ROADMAP COMPLETO — CORRETOR INTELIGENTE OS" escrito pelo usuário,
> com lente de BI/estratégia de produto + a realidade do nosso projeto (1 fundador
> advogado/corretor + agente, VPS KVM4, motor territorial/avaliação com 467 testes).
> Este documento NÃO substitui o plano — ele o critica, adapta e sequencia.

## Estado operacional atual — fonte de verdade (17/07/2026)

Quando este quadro divergir de decisões ANTERIORES a 17/07, ele prevalece para a alpha
privada single-user. **Entradas do diário POSTERIORES a 17/07 prevalecem sobre este
quadro** — em especial as de 19/07: auditoria + freeze da inteligência, correção Nubank,
persona "Mestre dos Magos" e descontinuação Caixa/leilão.

| Área | Estado | Limite atual / próximo aceite |
|---|---|---|
| Início guiado + Hoje | **Pronto na alpha** | Validar em celular real se o corretor entende a próxima ação em 5 segundos. |
| Captura por texto e voz | **Pronto na alpha** | Voz ainda exige teste físico em Chrome/Android, inclusive em ambiente de rua. |
| Carteira + filtros + dossiê | **Pronto na alpha** | Geral, Comercial e Histórico funcionam; Arquivos ainda é estado vazio. |
| Funil + WhatsApp assistido | **Pronto na alpha** | Mensagem é preparada, mas envio e confirmação continuam humanos. |
| Referência de mercado | **Política v3 em validação** | Busca progressiva por perfil; relatório sempre existe. Com menos de 5 ofertas compatíveis, não calcula preço, mas entrega fontes, evidências, exclusões e próxima ação. |
| Mapa territorial | **No ar** (deploy conjunto verificado em 19/07) | Retorno direto para o Painel ativo; botão textual no computador e no celular. O `deploy-all.sh` impede API e Mapa de ficarem em versões diferentes. |
| Clientes | **Parcial** | Lista existe; faltam busca, ficha própria, criação/edição direta e matching. |
| Kimi K3 + Hermes | **P1-B em validação · ⛔ expansão congelada até G1 (19/07)** | Sete ferramentas de leitura são controladas pela aplicação; avaliação, comparáveis e entorno reutilizam evidências versionadas. Hermes nunca recebe banco ou SQL. |
| Sessões e memória | **P1 inicial em validação** | Conversas geral, por imóvel e por cliente são reutilizadas e restauradas; a tela mostra claramente o objeto atual. Avaliação, visita e investimento continuam sem entrada própria. |
| Automelhoria | **Observação controlada · ⛔ E2+ congeladas até G1 (19/07)** | Mede falhas/contexto e propõe revisão; não testa nem modifica o produto sozinho. Revisão de propostas mora no painel admin. |
| Documentos | **Estrutura inicial** | Ingestão determinística existe no código; upload, OCR, seleção de fontes e dossiê documental ainda não estão na tela. |
| Consumo de IA | **Registrado, não exposto** | Uso/fallback/cache são gravados; falta o painel pessoal simples. |
| Matching, visita, relatórios e lançamentos | **Não iniciados no OS** | Entram somente após fechar o núcleo de hábito e dados. |
| Autenticação | **Adequada à alpha privada** | Senha única e sessão protegida; não é a solução futura para equipe/multitenant. |

### Ordem executiva vigente

1. **P0 — confiança e continuidade:** corrigir bugs do caminho principal, impedir
   resultados contaminados, manter Mapa ↔ Escritório sem becos sem saída e garantir
   que toda pesquisa de mercado termine em relatório útil, mesmo sem amostra para preço.
2. **P1 — agente realmente imobiliário:** sessões por imóvel/cliente e ferramentas
   somente leitura (`meu_dia`, `buscar_imovel`, `abrir_dossie`, `buscar_cliente`,
   `buscar_comparaveis`, `avaliar_imovel`, `consultar_entorno`).
3. **P2 — uma única operação:** ação “levar este imóvel ao escritório” no Mapa e
   pesquisa unificada sem duplicar os bancos público e privado.
4. **P3 — clientes e matching:** ficha pesquisável, preferências estruturadas e
   compatibilidade cliente ↔ imóvel com motivos visíveis.
5. **P4 — documentos e visita:** upload/OCR com fontes, resumo determinístico primeiro,
   Kimi apenas para leitura conjunta; depois preparação e registro de visita.
6. **P5 — prova de valor:** relatórios ao proprietário, consumo pessoal de IA e dados
   de lançamentos com licença, fonte e atualização definidas.

### Regra P0 — pesquisa nunca termina em beco sem saída

- A busca é progressiva: portais principais primeiro; fontes locais/adicionais somente
  quando a amostra profissional permanece abaixo do mínimo.
- O cache considera bairro, tipo, faixa de área e quartos; um imóvel pequeno não herda
  silenciosamente a busca de outro perfil.
- Com 5 ou mais comparáveis válidos, sai a referência de preço auditável.
- Com 0 a 4, sai um **Relatório de pesquisa de mercado** sem preço: fontes consultadas,
  ofertas compatíveis, motivos de exclusão, contexto regional fora do cálculo e próxima ação.
- “Venda” na interface deve ser entendida como imóvel anunciado à venda. Transação
  efetivamente fechada só poderá ser afirmada quando houver fonte transacional licenciada.
- Kimi/Hermes não decide comparabilidade nem número. IA pode ler/extrair e, sob demanda,
  redigir sobre fatos já calculados; filtros e decisão de suficiência são determinísticos.

### Marco P1-A — assistente com contexto imobiliário controlado

- Uma conversa ativa por objeto evita chats infinitos e duplicados.
- O histórico recente reaparece após recarregar; runtimes sem estado recebem no máximo
  as 12 mensagens mais recentes. No Hermes, o estado fica isolado por sessão e sujeito
  à compressão configurada, enquanto o contexto de dados atual contém só as ferramentas necessárias.
- O corretor abre o assistente dentro do imóvel ou do cliente com um botão em linguagem
  comum. Um seletor visível permite voltar à conversa geral sem escolher tecnologia.
- Primeiras ferramentas: `consultar_meu_dia`, `buscar_imovel`, `abrir_dossie` e
  `buscar_cliente`. No máximo duas são executadas por pedido.
- Contagens simples continuam locais e determinísticas, sem Kimi. Nenhuma ferramenta
  escreve, envia mensagem, altera cadastro ou acessa PostgreSQL a partir do Hermes.
- P1-B: `buscar_comparaveis`, leitura de avaliação existente e `consultar_entorno`
  reutilizam resultados do motor. A busca ao vivo só ocorre pelo botão autenticado do imóvel,
  liga o relatório versionado à carteira e nunca pode ser iniciada autonomamente pelo Hermes.

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

**Mesma tarde — revisão adversarial multi-agente (a pedido do usuário: "ativa dez em paralelo"):** 53 agentes (5 lentes × 2 céticos por achado) revisaram a entrega. 11 achados confirmados e corrigidos no dia (detalhe em MERCADO-EM-MOVIMENTO.md): o mais grave era o fallback genérico da identidade aceitando CEP/telefone no fim do slug como "id" — a mesma família do bug original. Também: backfill idempotente, dedup que fundia unidades do mesmo prédio (geo agora exige preços a ≤10%), variação % sobre o preço anterior, 400 em vez de 500 na API, e 4 correções no card do mapa (sentinela do laudo preservado, corrida eliminada, tipo pela detecção real de unidade, área declarada). Suíte 509/509; comportamento verificado ao vivo no app publicado (casa ganha estimativa, loja não, reabertura dupla não duplica).

### 17/07/2026 — Revisita dirigida NO AR + pesquisa Oportunidades (10 agentes)
**Revisita dirigida** (commits c2d01d5/2ª rodada): timer 04h45 re-busca até 30 anúncios identificados/noite (portal+id, os mais frios primeiro, ciclo ~5 noites) — termômetro e série histórica viram ATIVOS; provado em produção (3 alvos → 2 reencontrados). De quebra: main() no deploy-api.sh (o git reset sobrescrevia o script no meio da execução — o timer não instalou na 1ª rodada por isso). **Pesquisa Oportunidades** (10 pesquisadores em paralelo, PLANO-OPORTUNIDADES.md): Caixa = 262 imóveis em Goiânia no CSV oficial diário, mas o VPS recebe 403 do Radware (testado; residencial funciona com o método do atualizar-caixa.py — testado 200, 1,75MB) → arquitetura runner residencial + POST pro VPS; MELHOR ACHADO: API pública DJEN/Comunica (comunicaapi.pje.jus.br) testada sem auth com texto integral de editais TJGO/TRT18/TRF1; Santander (WP REST) e BB (POST /catalogo) testados; agregadores são concorrentes, não fontes; leilão NUNCA entra no índice de ofertas (3 camadas); sumiço do CSV = "saiu da lista", nunca "vendido"; avisos jurídicos POR MODALIDADE (STJ Tema 1134 só vale no judicial!); desconto sempre com 2 rótulos (vs avaliação Caixa e vs mediana de OFERTAS do bairro). Fases: F1 Caixa ponta a ponta → F2 judicial DJEN → F3 bancos/leiloeiras → F4 alertas OS. Aguardando OK do usuário para a Tarefa Agendada no Windows (runner residencial).

### 17/07/2026 — Oportunidades F1 (Caixa ponta a ponta) NO AR
Implementada a F1 inteira do PLANO-OPORTUNIDADES: **tabela própria `oportunidades`** (migração 008 — o índice de ofertas fica protegido por construção, leilão NUNCA contamina a mediana); **runner residencial** (`atualizar-caixa.py` estendido + `runner-caixa/` com Tarefa Agendada) que baixa o CSV já geocodificado e faz POST autenticado ao VPS (o VPS recebe 403 do Radware); endpoint `/motor/ingestao/caixa` (token) faz **diff/eventos** (`imovel-novo`/`preco-baixou`/`saiu-da-lista` — sumiço NUNCA vira "vendido"); `/motor/oportunidades` (público) cruza cada imóvel com o índice de OFERTAS do bairro → **desconto real** (n≥5, área conhecida, senão indisponível) e avisos jurídicos POR MODALIDADE (SFI ≠ judicial). Mapa consome a API (`bootCaixa`, fallback estático) com o desconto no popup; painel ganhou "Oportunidades em movimento". Verificado em produção: 205 imóveis, 142 no mapa, apto Setor Bueno 42,8% abaixo da mediana. 523 testes. **PENDENTE HUMANO**: preencher `%USERPROFILE%\.radar\ingest.env` com o MOTOR_TOKEN e rodar `runner-caixa\instalar-tarefa.ps1` (a Tarefa Agendada diária das 22:40) — o classificador de segurança (com razão) não me deixou manipular o token; é 1 passo manual único.

### 17/07/2026 — UX guiada + política profissional de comparáveis (decisão do usuário)

O usuário rejeitou corretamente a estética de “painel técnico” da página principal e
uma avaliação que misturou automaticamente ofertas de sete bairros. As duas correções
viram prioridade acima de novas funcionalidades:

1. **A página principal é uma central de trabalho, não um dashboard.** Deve receber o
   corretor com uma pergunta simples, ensinar os três primeiros movimentos, sugerir
   pedidos conforme o contexto e esconder modelos, ferramentas, tokens e estrutura
   administrativa. No celular, cinco destinos no máximo; no desktop, a mesma navegação
   vira barra lateral. Estados vazios sempre ensinam a próxima ação.
2. **Bairro diferente não entra automaticamente no valor.** A antiga ampliação por
   centroides em raio de 2,5 km fica revogada. Uma oferta de outro bairro pode aparecer
   apenas como “contexto regional — fora do cálculo”, desde que tenha coordenada própria
   confiável e esteja realmente próxima. Nunca altera valor, faixa ou confiança.
3. **Semelhança mínima obrigatória:** mesmo tipo, mesmo bairro normalizado, área entre
   75% e 133% da área do imóvel e diferença máxima de um quarto quando esse dado existir.
   Menos de cinco ofertas após os filtros significa “sem base segura para calcular”.
4. **Separação de responsabilidades:** busca ao vivo encontra anúncios; o motor
   determinístico seleciona e calcula; Kimi/Hermes explica, critica e sugere investigação,
   mas não escolhe silenciosamente comparáveis nem produz números da avaliação.
5. **Próximo gate de confiança:** permitir ao corretor revisar inclusões/exclusões no
   próprio fluxo, com bairro, distância, área, quartos, fonte e motivo visíveis antes de
   gerar documento. Expansão territorial, se existir no futuro, será manual, comparativa
   e apresentada lado a lado — nunca um único número misturado.

### 17/07/2026 — Continuidade Mapa ↔ Escritório

1. O Mapa e o OS continuam tecnicamente desacoplados, mas deixam de parecer produtos
   sem volta: o cabeçalho do Radar oferece **Meu escritório** em todas as entradas.
2. No celular, a barra inferior do Mapa ganha **Escritório** ao lado de Consulta e Mapa.
3. Quando a navegação veio do painel, o retorno usa o histórico do navegador e preserva
   a tela anterior; em entrada direta, o link seguro volta para `/painel/os`.
4. Regra de UX para as próximas entregas: toda saída do OS para uma superfície irmã
   precisa ter retorno visível, com o vocabulário do corretor — nunca depender do botão
   do navegador.

### 19/07/2026 — Auditoria do plano + freeze da inteligência (a pedido do usuário)

O usuário pediu auditoria do plano com duas queixas: front complexo demais ("não está
estilo Nubank") e a exigência de ser ferramenta de uso DIÁRIO. Auditoria multi-agente
(4 lentes + 2 céticos por recomendação; 11 confirmadas, 3 refutadas) em
**AUDITORIA-PLANO-2026-07-19.md**. Diagnóstico central: a branch kimi inverteu a hierarquia
da home (assistente virou porta de entrada; "o que eu faço agora" caiu para o 4º bloco) e o
loop de hábito está aberto nas duas pontas (zero gatilho de retorno; zero recompensa exógena
no Hoje — nota hábito 3,5/10). A queixa do usuário já era a decisão registrada em 17/07
("central de trabalho, não dashboard") — a execução seguinte foi na direção contrária.

**Decisões em vigor a partir desta entrada:**
1. **O gate do GATE G1 estende-se explicitamente a qualquer construção grande, incluindo
   infra de inteligência.** ULTRAROADMAP Ondas 3–14 e AUTOEVOLUÇÃO E2–E10 congeladas
   (cabeçalhos ⛔ nos dois arquivos). Onda 0 = só higiene do deployado; E0/E1 = provar em
   produção o que já subiu (migrations 017/018), sem expor UI de feedback complexa.
2. **Correção "Nubank" do front é a prioridade executiva** (já era, por 17/07): home
   ação-primeiro ("Sua próxima ação" no topo, com motivo), contadores viram linha tocável,
   guia só no primeiro uso, "Melhorias para revisar" sai do Hoje (→ painel admin), dossiê
   com dados antes do radar, sinal com 3 ações e "Próximo passo" determinístico, feedback
   com 5 motivos em linguagem de corretor (mapeados aos 13 códigos que ficam no banco),
   badge "Kimi K3" e "lote 2 de 5" eliminados, seletor de sessões vira chip de contexto.
3. **Hábito mínimo determinístico:** PWA próprio do escritório (o instalável hoje abre o
   Mapa!), estado vazio ativo ("Reaqueça o imóvel parado há N dias", server-side), card
   diário de oportunidades da Caixa nos bairros da carteira (com guarda de frescor),
   revalidação do Hoje ao voltar o foco, e evento dia_ativo como métrica-norte.
4. **Regra de peças móveis:** serviço/timer novo exige aposentar um existente ou evidência
   de uso. Exceção: ativar o runner-caixa (termina peça entregue). Se G1 não validar sinais,
   desligar radar-intelligence.timer + esconder o botão "Investigar" no MESMO commit.
5. **Refutados pelos céticos (ficam como estão):** separação Mapa×OS (objetos distintos),
   branch de deploy atual (sem drift), e não criar "fase F-UX" formal — executar, não planejar.
6. **Humano:** G0-dogfood (Bruno usa 5 dias reais) antes/junto do G1; G1 esta semana com o
   ROTEIRO-G1.md. Resumo matinal por e-mail adiado para pós-G1 (exige serviço de e-mail e
   sessão longa — decisão do usuário).

### 19/07/2026 — Correção Nubank NO AR + baseline E0/E1 provado (commit 5c3f8c9)

**Front (seções B e C da auditoria), verificado em produção:** home ação-primeiro ("Sua
próxima ação" em manchete com motivo + 2 ações + "Ver todas (N)"; contadores em linha
tocável; assistente desce; guia só no primeiro uso e auto-esconde por conclusão);
"Melhorias para revisar" saiu do Hoje → painel admin; dossiê com dados antes do radar;
sinal com 3 ações ("É isso mesmo" / "Não é isso" com 5 motivos em linguagem de corretor /
"Depois") + "Próximo passo" determinístico por tipo; badge "Kimi K3" e "Analisando lote"
eliminados; seletor de sessões virou chip de contexto; cobrança de interessado do Hoje
abre direto o card no dossiê (payload ganhou inventory_property_id, fallback preservado);
5ª fonte server-side "Reaqueça o imóvel parado" (o Hoje nunca emudece); revalidação ao
voltar o foco; **PWA próprio do escritório** (os.webmanifest público em
api.corretorinteligente.tech/painel/os.webmanifest — verificado 200 sem sessão; /painel/os
segue 303 e API 401 sem sessão). Suíte **583/583** (10 testes novos em os-nubank.test.mjs
travam as regras). Deploy conjunto ok (API+Mapa no mesmo commit).

**Baseline E0/E1 (gate CR-09) PROVADO:** investigação dirigida real no Apartamento ·
Setor Bueno (job df3d1560, 8m39s) → 100 evidências, **31 qualificadas · 69 rejeitadas
(catalog_page 69, transaction_mismatch 3)**, conciliação resumo×SQL exata; registro de
fontes operante (18 domínios, chavesnamao degradada 39/46); 205 evidências antigas
preservadas em pending, fora do K3. Snapshot congelado no cabeçalho do
ROADMAP-AUTOEVOLUCAO. **O aprendizado para aqui até o G1.**

**HUMANO (inalterado e agora caminho crítico):** G0-dogfood + G1 (ROTEIRO-G1.md);
~~MOTOR_TOKEN + instalar-tarefa.ps1 do runner Caixa~~ *(SUPERADO à tarde: Caixa/leilão
descontinuado — ver entrada abaixo)*; testar voz e o teste dos 5 segundos no celular
real — agora com o ícone "Seu dia" instalável.

### 19/07/2026 — Hábito mínimo NO AR (commit 3f54027)

Fecha a seção C da auditoria (o usuário adiou a instalação do runner — o card nasce com
guarda de frescor e se ativa/desativa sozinho): **métrica-norte `dia_ativo`** (evento
idempotente por dia no fuso de Goiânia; sequência no painel admin — nunca gamificação na
tela diária); **card "Novidade do mercado"** no Hoje (até 3 imóveis da Caixa nos bairros
da carteira, fallback cidade, só desconto honesto vs mediana de ofertas n≥5, aviso
"oferta anunciada, não venda fechada"; lista >3 dias = card some — hoje a lista de 17/07
ainda vale); **"Aberto há N dias"** nos cards sem prazo real. Verificado em produção:
novidade retorna 3 aptos no SETOR BUENO a 62,1% / 45,7% / 34,8% abaixo da mediana (18
ofertas); API 401 sem sessão. Suíte **589/589**. ~~Sem o runner, o card morre em ~2 dias —
instalar o MOTOR_TOKEN o ressuscita sem deploy.~~ *(SUPERADO à tarde: o card foi
re-apontado para mudanças de preço verificadas — o runner não o afeta mais.)*

### 19/07/2026 — Gate de confiança dos comparáveis NO AR + kit do G1 (commit 2f98b11)

Fecha o último aceite de P0 que era trabalho de código (decisão de 17/07): o card
"Referência de mercado" do dossiê ganhou o painel **"Como esse número foi formado"** —
funil de exclusões sempre visível (outro bairro, área fora de 75–133%, quartos, sem área,
duplicadas, cerca estatística, exclusão manual), cada oferta do cálculo com bairro, área,
quartos, preço, R$/m², distância e fonte com link; outliers com razão; contexto regional
rotulado "nunca entra no valor". Sem número (amostra insuficiente) também há transparência.
Zero mudança no motor — o retorno da avaliação já carregava tudo; era só mostrar.
**G1-KIT/** criado: folha-de-campo.md (imprimível, com checklist e critérios do gate) e
planilha-registro.csv (1 linha por corretor). Suíte **590/590**; deploy conjunto ok.
**Com isto, TODO o trabalho de agente do plano pós-auditoria está entregue** — o que
resta no caminho crítico é humano: G0-dogfood e G1.

### 19/07/2026 — Princípio de design da inteligência: "Mestre dos Magos" (decisão do usuário)

O freeze congela a FÁBRICA (infra nova), não o mago: assistente, radar, sinais e novidades
seguem vivos em produção. A persona oficial da inteligência no app passa a ser o **Mestre
dos Magos** (Caverna do Dragão), e toda entrega futura de IA se mede por ela:
1. **Aparece do nada, na hora certa** — aparições raras, com gatilho determinístico e
   motivo declarado (sinal ≥0,75 no Hoje; Caixa fresca no bairro da carteira; imóvel parado).
2. **Fala pouco e aponta o caminho** — uma frase, um "próximo passo"; nunca um painel.
3. **Nunca luta por você** — somente-leitura; conselho é dele, a espada é do corretor.
4. **Some quando não é preciso** — abaixo dos dados, atrás de "Ver detalhes", morre com
   dado velho, sem crachá de modelo.
5. **Quando erra, aprende** — "Não é isso" calibra; histórico com desfazer.
Pós-G1 (se os corretores validarem os sinais), as Ondas 1–2 e o motor de eventos ganham
esta persona: mais aparições espontâneas de QUALIDADE (preço baixou em comparável do seu
captado, anúncio sumiu do portal, evento no bairro do cliente quente) — nunca mais volume.

### 19/07/2026 — Caixa/leilão DESCONTINUADO; novidade vira mudança de preço verificada

Decisão do usuário: "esquecendo de caixa econômica e leilão". Registrado no cabeçalho ⛔
do PLANO-OPORTUNIDADES.md (F2–F4 canceladas; runner/MOTOR_TOKEN sai das pendências
humanas; F1 permanece no ar com a última lista rotulada pela data; remoção da camada do
Mapa só sob pedido). O card "Novidade do mercado" do Hoje foi **re-apontado no mesmo dia**
para a fonte exógena que o projeto já coleta toda noite sem nada de leilão: **mudanças de
preço VERIFICADAS** do termômetro (mesmo anúncio, portal+id, duas coletas; invalidadas do
backfill nunca voltam), janela de 7 dias como guarda de frescor, quedas antes de altas,
bairros da carteira antes da cidade. Copy do card declara a proveniência e sugere o uso
("argumento de precificação com seus proprietários"). A revisita dirigida (04h45, até 30
anúncios/noite) passa a ser quem alimenta a recompensa diária do Hoje — o loop de hábito
fica inteiro sem a Caixa.

### 19/07/2026 — Base de preço da cidade inteira + Páginas Vivas (commits 352e715 + 23b0026)

**Cidade inteira:** a varredura noturna deixou de rodar só 20 bairros fixos — uma janela
de rotação determinística percorre os **684 bairros únicos do cadastro** (20 fixos + 20
rodando/noite ≈ 1.200 buscas/mês na cota Brave de 2.000; ciclo completo ~35 noites; a
suíte prova que a união das janelas cobre 100%). Backfill imediato disparado nos 120
bairros com atividade sem índice (60 apto + 60 casa). Baseline antes: 29 combinações
bairro+tipo estimáveis. A base engorda toda noite e a revisita mantém os preços vivos.

**Páginas Vivas (pedido do usuário: "sensação de que tá trabalhando sozinha"):**
1. **Sala de Máquinas** (`/painel/admin/maquina`, sessão): coração pulsando, progresso
   ao vivo da varredura (bairro atual + barra, via varredura-status.json que a própria
   varredura escreve), contagem regressiva para os turnos, tiles com delta verde quando
   o acervo cresce na tela, sparkline 14 dias, cota do mês, feed audit_log+ai_logs com
   "há X min" atualizando a cada segundo. Poll 20s, zero asset externo, leitura pura.
2. **Plantão no Hoje**: 1 linha com ponto pulsante — "Radar nas últimas 24h: N bairros ·
   M anúncios novos · K preços mudaram"; some quando não há nada.
3. **Pulso no Mapa**: `/motor/mercado/mudancas` (público) + pinos respirando onde houve
   mudança VERIFICADA nos últimos 7 dias (verde=queda, âmbar=alta), popup com proveniência.
Tudo exibição do trabalho determinístico já registrado — freeze e regra de peças móveis
intactos. Suíte **601/601**. Verificado em produção (401 sem sessão; endpoint público ok).

### 19/07/2026 — Auditoria de fidelidade da extração: 3 contaminações achadas e barradas

Pergunta do usuário ("a extração tá correta?") respondida com auditoria determinística:
231 extrações do modelo novo conferidas campo a campo contra o texto bruto — bairro 100%,
preço 96%, área 98%; falhas concentradas em páginas-catálogo (que a peneira já barra).
Nos 29 que PASSARAM na peneira (os que alimentam o índice), **3 contaminações reais**:
1. **Aluguel como venda** — casa "para-alugar … R$950" virou "venda R$950.000" (o modelo
   inventou a escala) e ia sujar a mediana do bairro. Guarda `isRental` pela URL/título.
2. **Outra cidade** — a busca do bairro Campinas (Goiânia) trouxe Campinas-SP com grau
   de comparável. Guarda `foraDeGoiania`: sem menção a Goiânia = reprovado.
3. **Área absurda com tipologia** — 8 m² passava porque tinha quartos, mas o índice
   divide preço/área. Área implausível agora REPROVA, não só registra razão.
No caminho, a cadeia de IA foi consertada de verdade: qwen3-32b aposentado pela Groq
(404) → qwen3.6-27b falhou o modo JSON (raciocínio) → **llama-3.1-8b-instant a ~2 s por
extração**, testado COM `response_format json_object` (lição no .env.example).
Requalificação retroativa do acervo: 1.964 imóveis → 331 comparáveis limpos (0 aluguéis);
vigia no VPS requalifica de novo sozinho quando o backfill terminar. Suíte **605/605**.

### 20/07/2026 — Desfecho do dia cidade-inteira (madrugada colhida)

**Backfill concluído sem falhas:** 120 bairros → 1.241 anúncios novos (apto 644 · casa
597), 121 comparáveis brutos. **Primeira varredura rotativa da madrugada:** 40 bairros,
442 novos, 151 comparáveis — a rotação e o status ao vivo funcionaram na estreia. O vigia
de requalificação morreu sem rodar (1 aluguel vazou); requalificação executada na colheita:
**3.545 imóveis → 549 comparáveis limpos · 2.646 catálogos barrados · 0 aluguéis**.
**Acervo: 1.655 → 3.547 anúncios em 24h (2,1×).** Base de preço limpa: **35 combinações
bairro+tipo estimáveis (n≥3) · 26 avaliáveis (n≥5)** — contra 29/21 do baseline de ontem;
a rotação noturna segue engordando (~35 noites por ciclo completo da cidade). Lição
operacional: vigia descartável em /tmp não é confiável — a requalificação pós-varredura
merece entrar no próprio fluxo noturno (candidata pós-G1; por ora a colheita manual cobre).

### 20/07/2026 — Auditoria externa do site: busca digitada consertada + SEO básico no ar

Auditoria do usuário (3 críticos, 5 importantes) respondida no mesmo dia. **AUD-01, o
crítico nº 1:** "rua portugal 582" digitado devolvia "nenhuma sugestão" — o autocomplete
casava a FRASE INTEIRA contra o índice CNEFE, que só guarda o nome da rua (e a rua real é
AVENIDA Portugal). Agora o match usa o núcleo da frase (sem tipo de via, sem número), o
toque na sugestão preserva o número de porta, e o estado sem sugestão com detecção válida
virou item de ação "Buscar …" (mesmo caminho do Enter) em vez de beco. O "(?)" dos chips
de confiança média (lido como ícone quebrado) virou "(provável)". **AUD-02, SEO:** meta
description própria, canonical, JSON-LD (WebApplication+FAQPage), FAQ estática visível,
noscript honesto, robots.txt e sitemap.xml servidos (deploy-app.sh copia; exceção ao
*.txt do .gitignore). **Não reproduzidos em navegador real:** o dropdown de setor FILTRA
("jardim goias" → 2 itens) e o Buscar vazio TEM toast — a ferramenta do auditor seta
valor sem evento input e não espera toast; /painel/os sem sessão já redireciona ao login
desde 19/07 (verificado: 303 → /painel 200). Suíte **606/606**; deploy conjunto ok
(87959f9), tudo conferido ao vivo. Ficam como candidatas pós-G1 (inteligência congelada):
proxy/cache da camada da Prefeitura, Cache-Control/TTFB do HTML e observabilidade do
funil da análise de mercado.

### 20/07/2026 — Tarde: os 3 estratégicos da auditoria resolvidos (proxy, borda, funil)

**Proxy da Prefeitura blindado (AUD-03):** descoberta dupla — o app JÁ preferia o proxy
do VPS com fallback JSONP (item 14, 15/07), mas o código do proxy vivia editado à mão em
/opt/radar/proxy/server.js (drift) e sem defesa real: upstream fora do ar = erro na cara.
Agora `motor/proxy-arcgis.js` é versionado (deploy-api.sh instala/reinicia só quando muda,
preservando o cache), TTL fresco 60 min (era 10), **stale-if-error até 7 dias** (Prefeitura
403/fora do ar → consultas já vistas seguem respondendo, X-Cache: STALE), teto de 64 MB por
bytes e /health com contadores. **Borda (nginx):** sites-enabled/radar era uma CÓPIA morta
de 16/07, não symlink — config editada nunca entrava em vigor; virou symlink. Config agora
versionada em `motor/nginx/` (instalação manual consciente: nginx errado derruba tudo).
gzip_types destravado (bairros-goiania.json 782 KB → 190 KB; nível 5: HTML 401 → 351 KB),
**http2** ligado, Cache-Control honesto por tipo (HTML/sw.js no-cache + 304; json/js 1 h
com stale-while-revalidate; marca 7 dias). **Funil do /motor/mercado (AUD-03):** cada
chamada registra duração, cache-6h, erro e **abandono** (res close antes de writableEnded)
no audit_log; Sala de Máquinas ganhou a seção "Análise de mercado · funil 7 dias"
(chamadas, % cache, mediana/p90, desistências) + linha de saúde do proxy. Validado em
produção: chamada fria real levou **177,7 s** (raspando o timeout de 180 s do front — o
auditor tinha razão na dor) e a quente **55 ms**; ambas registradas. Suíte **606/606**,
deploy conjunto ac2dc0e.

### 20/07/2026 — Noite: roadmap MI6 v2 recebido; Fase 0 executada (menos o que é humano)

Roadmap v2 ("MI6 + Nubank") refletido contra a realidade: a Fase 0.B inteira (site) já
tinha sido entregue de manhã; 0.7 e 0.8 não se reproduzem em navegador real (ferramenta
da auditoria não dispara input nem espera toast); scraping noturno/fila (2.5), histórico
de 2 coletas (2.6) e Postgres+PostGIS (1.4) já existem em embrião. Executado da Fase 0
restante: **0.10, o bug mais caro** — "qual imóvel tá pendente" não casava gatilho nenhum
(faltava "pendente" no regex!) e o modelo, sem a lista no contexto, afirmou "nenhuma
pendência" com 8 ativas. Conversa geral agora SEMPRE abre com consultar_meu_dia, gatilho
ampliado (pendente/vencido/atrasado/prazo/agenda…), e instrução nova no sistema: ausência
de dado no contexto nunca vira afirmação de "não há". **0.11:** pendências do Para hoje
levam o imóvel no título (LEFT JOIN em visaoHoje) — verificado no banco: "Solicitar
autorização de divulgação · Apartamento · Setor Bueno". **0.13:** title do login virou
"Corretor Inteligente". **0.3:** catch-all da api deixou de fingir sucesso — /query,
/admin etc. agora 404 JSON (nginx versionado). **0.12 auditado e mantido:** o chip
"Assistente" aceso é o CTA central por design, não bug de navegação. Suíte **606/606**
(2 expectativas atualizadas + 3 casos de regressão da pergunta real da auditoria);
deploy conjunto f6f88bd. **Pendências HUMANAS da Fase 0.A:** tornar privado o repo
PAINEL-MC (clientes/ com nomes reais em repo público — LGPD; só o dono muda visibilidade)
e trocar a PAINEL_SENHA no .env do VPS (nova senha não pode circular em chat).

### 20/07/2026 — Madrugada garantida: aquecimento noturno do cache de mercado (v2 item 2.5)

O medidor do funil tinha dado o número: frio = 178s, quente = 55ms. Agora o robô paga a
espera de madrugada: `mercado-aquecer.js` (timer 05h15, depois da varredura e revisita)
re-coleta os perfis da CARTEIRA ativa + os PEDIDOS dos últimos 7 dias (o funil passou a
registrar o subject completo), deduplicados pela mesma chave do cache, teto 6/noite em
modo econômico (só a 1ª passagem ≈ 3 buscas Brave cada ≈ 540/mês — cabe na sobra da
cota pós-varredura). CACHE_H subiu 6h→26h (o aquecedor renova diariamente com
maxIdadeH=20; corretor pega dado de no máximo ~24h, instantâneo). Timeout do front
180→240s (o frio real de 178s morria na boca). Sala de Máquinas mostra o turno do
aquecimento. Validado em produção em 3 rodadas reais: 1ª aqueceu o Setor Bueno com 3
consultas e REVELOU um caso real — imóvel sem área não tem estimativa, aquecê-lo é
desperdício → planejador pula sem-área (guarda + teste); 3ª rodada limpa (0 falhas,
0 cota, idempotente). Suíte **608/608**; deploy ceb2cfd; desligável com
MERCADO_AQUECER=false.
