# Phase 10: Camada de Ação + WhatsApp + Captação + Salvos - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 2 decisões propostas, ambas aceitas

<domain>
## Phase Boundary

Todo resultado termina numa ação útil: botões de copiar p/ WhatsApp (resumo, mensagem p/ proprietário, mensagem p/ comprador, argumento de preço, riscos/ressalvas), salvar oportunidade + histórico de consultas + persistência em localStorage (allowlist, sem PII de terceiros), e Modo Captação (abordagem, script de ligação, checklist documental, tarefa de follow-up — tudo texto pronto copiável). Lei da tela aplicada em toda superfície de resultado. NÃO inclui: documentos 3 níveis (Fase 11), resumo de prédio (Fase 12), refino visual global (Fase 13).

Requirements: ACAO-01, ZAP-01, SALV-01, CAPT-01.
</domain>

<decisions>
## Implementation Decisions

### Nomenclatura (aceito — consistência é gate da Fase 14)
- Imóveis guardados = **"Oportunidades"** (verbo: "Salvar oportunidade"; lista: "Minhas oportunidades"). NUNCA alternar com Favoritos/Salvos/Prospects.
- Consultas recentes = **"Histórico"** (automático, distinto de Oportunidades).

### Assinatura no WhatsApp (aceito)
- Mensagens terminam com nome + CRECI do perfil (`radar_prof`, que o laudo já coleta) QUANDO existir; sem perfil → sem assinatura (nunca placeholder "[seu nome]" no texto copiado).
- Tom: corretor profissional (Plano UX §13) — claro, honesto, sem promessa absoluta ("faixa estimada", "recomendo confirmar").

### Claude's Discretion
- Templates de WhatsApp determinísticos (dados da ficha + scores/leitura da Fase 9); exemplo canônico §13 do plano UX como referência de tom.
- Persistência: localStorage chaves `radar_oportunidades` + `radar_historico` (convenção radar_, try/catch silencioso, quota-aware — falha de escrita = toast visível, nunca silenciosa); allowlist de campos (inscrição/ci, endereço, quadra/lote, áreas, venal, faixa estimada, scores, timestamp) — NUNCA dtnascimen/nome de terceiro.
- Histórico: cap (~30 itens FIFO); entra automático ao abrir ficha. Oportunidades: ação explícita.
- UI de acesso: seção no painel Consulta (acima do results quando vazio) + contagem; ficha ganha "⭐ Salvar oportunidade" como secundária (lei da tela mantém "Gerar documento" primária — decisão da Fase 9).
- Modo Captação: ação na ficha ("Captar este imóvel", em Mais opções ou secundária conforme couber na lei da tela) abre painel/sheet com os 4 textos prontos (abordagem, script, checklist, follow-up) + copiar individual.
- Copiar usa navigator.clipboard com fallback (padrão copyInsc existente); toast de confirmação.
</decisions>

<code_context>
## Existing Code Insights

- Perfil do corretor: `radar_prof` (localStorage) já existe no wizard do laudo (nome/CRECI/contato) — reusar leitura.
- Padrões de copiar: copyInsc/copyLink + resumo WhatsApp do laudo (linha ~2019: "Resumo copiado — cole no WhatsApp") — a Fase 10 GENERALIZA esse padrão em templates nomeados.
- Ficha pós-Fase 9: #dActsPrim (1 primária + 2 secundárias) + #dActsMore (details) — as ações novas entram respeitando a lei da tela; scores/leitura disponíveis via DCUR/estado atual pra alimentar os textos.
- Estado vazio da busca (exemplos tocáveis da Fase 8) — o Histórico entra como bloco irmão (últimas consultas tocáveis), sem quebrar os exemplos.
- esc()/inline-onclick contract (IN-01) e SEARCHTOKEN valem para TODO caminho novo.
</code_context>

<specifics>
## Specific Ideas

- Exemplo de tom (§13): "Encontrei esse imóvel no Setor Bueno. Pela análise cadastral e pelos comparáveis próximos, a faixa estimada fica entre R$ 690 mil e R$ 780 mil. A região tem boa liquidez, mas recomendo confirmar área privativa, estado de conservação e documentação antes de avançar."
- Checklist documental da captação: itens reais de Goiânia (matrícula/RGI atualizada, IPTU/CND municipal, certidões pessoais do vendedor, condomínio quando aplicável) — texto genérico e honesto, sem promessa jurídica.
- ACAO-01 cobre TODAS as superfícies de resultado: ficha (já ok da Fase 9), lista/count (CSV existente + salvar em lote NÃO — só por imóvel), estados vazios (Fase 8 já tem próxima ação), chooser.
</specifics>

<deferred>
## Deferred Ideas

- Compartilhar direto via Web Share API (fase futura — copiar já cobre o fluxo).
- Alertas/tarefas com notificação (v2.2+ — precisa backend/push).
- Sincronização entre dispositivos (v2.2+ — precisa contas).
</deferred>
