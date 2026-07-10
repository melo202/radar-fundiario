# Phase 11: Documentos em 3 Níveis - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 2 decisões propostas, ambas aceitas

<domain>
## Phase Boundary

Três saídas documentais nomeadas — **Ficha rápida** (WhatsApp/apresentação, compacta), **Relatório de avaliação** (comercial, o laudo atual re-enquadrado) e **Laudo/PTAM** (formal, estrutura rígida) — com: pergunta de FINALIDADE primeiro → recomendação do documento adequado; painel de confiança + pendências ANTES de gerar; revisão/edição antes do PDF final. Reusa o wizard/motor de laudo existente (não recomeça). NÃO inclui: minutas da negociação (Fase 11.1), refino visual global (Fase 13).

Requirements: DOC-01, DOC-02, DOC-03.
</domain>

<decisions>
## Implementation Decisions

### Reenquadramento do laudo atual (aceito)
- O laudo/motor atual VIRA o **"Relatório de avaliação"** (nível 2) — mesmo conteúdo/wizard, rebatizado.
- **PTAM** (nível 3) = MESMO motor + estrutura mais rígida: identificação completa das partes/imóvel, finalidade declarada, metodologia (comparativo direto, referência NBR 14653/COFECI), tratamento da amostra, conclusão fundamentada, ressalvas, bloco de responsabilidade técnica (nome/CRECI/CNAI) e local p/ assinatura.
- **Ficha rápida** (nível 1) = saída NOVA compacta: faixa de valor, resumo do imóvel, leitura prática, 2-3 comparáveis essenciais, ressalvas — 1 página, visual, tom comercial.

### CNAI condiciona a recomendação de PTAM (aceito)
- Campo **CNAI opcional** no perfil (`radar_prof`, junto de nome/CRECI).
- Fluxo de finalidade RECOMENDA PTAM só quando CNAI preenchido; sem CNAI, recomenda Relatório e explica o porquê ("o PTAM pressupõe habilitação CNAI — preencha no perfil se possuir"). PTAM continua ACESSÍVEL (não bloqueado) — recomendação, não trava; linguagem de responsabilidade em toda parte.

### Claude's Discretion
- Fluxo de finalidade (DOC-01): pergunta única "Para que você precisa do documento?" com 4 opções (apresentar ao cliente / captar proprietário / justificar preço / documento técnico formal) → mapa determinístico p/ recomendação (ficha/ficha ou relatório/relatório/PTAM), com override livre (as 3 opções sempre visíveis).
- Painel de confiança+pendências (DOC-02): reusa scoreConfianca/pendências da Fase 9 + checklist (área confirmada? nº comparáveis? venal? conservação/documentação = input do usuário) — mostrado ANTES de gerar, com linguagem "faixa estimada"/"recomenda-se confirmar".
- Revisão pré-PDF (DOC-03): etapa de revisão no wizard existente (campos sensíveis e textos principais editáveis) — o PDF continua saindo do clique do usuário (guarda ec9f129).
- "Gerar documento" (primária da ficha, Fase 9) passa a abrir o seletor de finalidade.
- Templates/textos pt-BR impecáveis (gate Fase 14); tudo determinístico.
</decisions>

<code_context>
## Existing Code Insights

- Wizard do laudo existente (.wiz, LZ state, etapas, PDF via print/geração no clique — guarda ec9f129): é o MOTOR a reusar; PTAM e Relatório são variações de template sobre ele; Ficha rápida pode ser um render mais curto do mesmo pipeline.
- radar_prof (nome/CRECI/contato) já existe; adicionar campo CNAI opcional na UI do perfil dentro do wizard.
- scoreConfianca/pendências (Fase 9) alimentam o painel DOC-02; leituraPratica alimenta a Ficha rápida.
- abrirLaudo() é o entry point atual do botão "Gerar documento" — vira o seletor de finalidade.
- Padrões: sheet .wiz, esc()/IN-01, DCUR guard, toasts.
</code_context>

<specifics>
## Specific Ideas

- Recomendação exibida como destaque ("Recomendado para você: Relatório de avaliação — porque…") com as 3 opções tocáveis (recomendada em primeiro).
- Painel DOC-02 lista pendências acionáveis ("confirmar área privativa", "informar estado de conservação") — algumas viram inputs opcionais que refinam o documento.
- PTAM: rodapé/bloco de responsabilidade técnica + campos de finalidade/solicitante; disclaimer que o documento não substitui avaliação de engenheiro quando exigida.
</specifics>

<deferred>
## Deferred Ideas

- Minutas de Proposta/Exclusividade/Contrato + OCR → Fase 11.1 (própria).
- Export .docx (v2.2+ — PDF cobre o fluxo atual).
- Skeleton/motion do fluxo → Fase 13.
</deferred>
