# Roadmap: Radar Fundiário Goiânia

## Milestones

- ✅ **v1.0 MVP + Inteligência + Mobile** — pré-GSD (shipped 2026-07-03)
- ✅ **v2.0 Mapa-first + Motion + Satélite** — Fases 1-6 (shipped 2026-07-05) · [detalhes](milestones/v2.0-ROADMAP.md) · [requisitos](milestones/v2.0-REQUIREMENTS.md) · [auditoria](milestones/v2.0-MILESTONE-AUDIT.md)
- ✅ **v2.1 Cockpit Comercial** — Fases 7-18, incl. 11.1 (shipped 2026-07-10) · [detalhes](milestones/v2.1-ROADMAP.md) · [requisitos](milestones/v2.1-REQUIREMENTS.md) · [auditoria](milestones/v2.1-MILESTONE-AUDIT.md)
- 🚧 **v2.2 Polimento Premium** — Fases 19-20 (em andamento)

## Phases

<details>
<summary>✅ v2.0 Mapa-first + Motion + Satélite (Fases 1-6) — SHIPPED 2026-07-05</summary>

- [x] Fase 1: Dataset Estático de Bairros + Correção de Docs (2/2 planos) — 2026-07-04
- [x] Fase 2: Home = Mapa (2/2 planos) — 2026-07-04
- [x] Fase 3: Render de Bairro + Hover/Tap + Click-to-Drill (2/2 planos) — 2026-07-04
- [x] Fase 4: Camada de Satélite (2/2 planos) — 2026-07-04
- [x] Fase 5: Seam de IA (dormant) (1/1 plano) — 2026-07-04
- [x] Fase 6: Motion no App Todo (3/3 planos) — 2026-07-05

Detalhes completos, critérios de sucesso e auditoria em `milestones/v2.0-*.md`.

</details>

<details>
<summary>✅ v2.1 Cockpit Comercial (Fases 7-18, incl. 11.1) — SHIPPED 2026-07-10</summary>

- [x] **Phase 7: Fundação de Dados — Nomes de Bairro, CNEFE & Tuning da Malha** — nomes reconciliados ✅ (07-01) + CNEFE/logradouros ✅ (07-02) + tuning da malha mobile ✅ (07-03); 2 HUMAN-UAT diferidos (completed 2026-07-05)
- [x] **Phase 8: Busca Única Inteligente** — caixa única com detecção de intenção, chip de confirmação, setor na frase, colar link do Maps, voz (mobile), deep-link, autocomplete CNEFE — a11y re-auditada, guarda das regressões desktop
- [x] **Phase 9: Ficha = Conclusão Comercial + Scores** — ficha reordenada (valor em destaque → oportunidade → confiança → leitura prática → ações → técnico em accordion); scores determinísticos explicáveis; comparáveis conclusão-primeiro
- [x] **Phase 10: Camada de Ação + WhatsApp + Captação + Salvos** — toda tela termina com ação; copiar mensagens de WhatsApp (proprietário/comprador/argumento); salvar oportunidade + histórico + favoritos; modo captação (completed 2026-07-07)
- [x] **Phase 11: Documentos em 3 Níveis** — ficha rápida / relatório / laudo-PTAM; finalidade → recomenda doc; confiança+pendências antes de gerar; revisão antes do PDF (completed 2026-07-07)
- [x] **Phase 11.1: Documentos da Negociação** — minutas de Proposta de C&V, Termo de Exclusividade/Autorização e Contrato de C&V, pré-preenchidas com o imóvel, editáveis, em PDF pt-BR com ressalvas; OCR da escritura (Tesseract.js, best-effort/opcional). Reusa a infra da Fase 11 (completed 2026-07-07)
- [x] **Phase 12: Prédio como Objeto Comercial** — resumo do edifício antes da lista; ordenação (oportunidade/valor/área) e filtros; marcar unidades p/ comparar (completed 2026-07-07)
- [x] **Phase 13: Refino Visual, Pinos Semânticos, Motion & Descoberta Progressiva** — refino clean (respiro, cor só p/ status) mantendo identidade cartográfica; pinos semânticos; motion de busca em etapas + skeleton; onboarding ≤3 telas + "O que o Radar faz"; lei da tela
- [x] **Phase 14: Linguagem Impecável (pt-BR)** — gate de release: toda microcopy (botões/placeholders/erros/tooltips/PDFs/WhatsApp) pelo checklist §26
- [x] **Phase 15: Setor-Scan Compartilhado, Choropleth & Painel do Território** — varredura com orçamento de requisições; choropleth de R$/m² legível sobre satélite; painel do setor
- [x] **Phase 16: Detector de Lote Subutilizado & Farming/Caderno** — detector sobre o scan da Fase 15; Farming com IndexedDB + allowlist anti-PII
- [x] **Phase 17: Diff de Cadastro & Cruzamento Caixa** — snapshot entre visitas + cruzamento com imóveis Caixa sobre o território salvo
- [x] **Phase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022)** — consulta por ponto ao Modelo Espacial já exposto no ArcGIS da prefeitura (verificado ao vivo); seção "Urbanístico" na ficha (zona, CA, usos + disclaimer); upgrade do detector (construído/potencial-do-PD) e boost do score; números de CA só entram conferidos contra o Anexo oficial

Detalhes completos, critérios de sucesso e auditoria em `milestones/v2.1-*.md`.

</details>

### 🚧 v2.2 Polimento Premium (Fases 19-20)

**Milestone Goal:** O app GANHA cara de produto premium — tipografia bonita e profissional em todo o app, estética refinada (o usuário achou a letra atual "muito feia" e o app sem cara premium) — e fecha com uma auditoria completa executada e corrigida pelo **Fable 5** (pedido explícito do usuário, 2026-07-10). Sem IA no produto, sem CRM/Hub (limite de parada mantido).

- [x] **Phase 19: Estética Premium — Tipografia & Refinamento Visual** — nova tipografia em todo o app (substituir a atual, considerada feia), refinamento estético premium (profundidade, microdetalhes, polish) mantendo a identidade cartográfica e a lei "cor só onde significa status"; inclui o passe de a11y focus-trap nas 6 superfícies modais (IN-03 diferido da Fase 13) (completed 2026-07-10)
- [ ] **Phase 20: Auditoria Fable 5 (gate final)** — auditoria completa de TUDO (código, segurança, UX, consistência, PDFs, mobile) executada por agentes rodando **Fable 5**, com as correções também aplicadas pelo Fable 5; é a última fase do milestone

## Phase Details

### Phase 19: Estética Premium — Tipografia & Refinamento Visual
**Goal**: O app parece um produto premium: tipografia bonita, hierarquia elegante, acabamento fino — sem perder identidade cartográfica, performance mobile nem offline/PWA.
**Depends on**: v2.1 completo (o polish aplica-se sobre o cockpit inteiro)
**Requirements**: TYPO-01, PREM-01, A11Y-01
**Success Criteria**:
  1. Nova família tipográfica aplicada em TODO o app (UI, mapa, sheets, PDFs/documentos impressos) — escolhida por critério premium/legibilidade, com fallback de sistema robusto; zero texto na fonte antiga
  2. Funciona offline/PWA e não quebra o arquivo único (fonte embutida via @font-face/base64 no HTML OU stack de sistema premium — decidir na fase medindo o custo de payload)
  3. Refinamento estético: profundidade/elevação consistente (sombras/bordas), acabamento dos cards/sheets/botões, densidade e alinhamento revisados — mantendo papel/óxido cartográfico e cor-só-status (VIS-01)
  4. Focus-trap nas 6 superfícies modais (onboarding, wizard, negSheet, captSheet, cmpSheet, chooser/detail) — Tab/Shift+Tab circulam dentro do modal, Esc fecha, foco retorna ao gatilho (fecha o IN-03 da Fase 13)
  5. Legibilidade AA preservada em CARTO e satélite; motion/reduced-motion intactos; 239+ testes verdes; PDFs continuam profissionais na fonte nova
**Plans**: 3 plans (sequenciais, mesmo arquivo) · **UI hint**: yes

Plans:
- [x] 19-01-PLAN.md — Fundação tipográfica: @font-face Archivo+JetBrains Mono (base64) + CSP font-src + migração das 196 declarações (TYPO-01)
- [x] 19-02-PLAN.md — Refinamento estético: tokens --elev-0/1/2/3 + acabamento hover/active/focus/divisores (PREM-01)
- [x] 19-03-PLAN.md — Focus-trap único nas 6 superfícies modais + gate final/UAT (A11Y-01)

### Phase 20: Auditoria Fable 5 (gate final)
**Goal**: Tudo que foi construído (v2.0-v2.2) passa por uma auditoria profunda executada por agentes **Fable 5** (modelo mais capaz disponível), e as correções são aplicadas também pelo Fable 5 — o gate de qualidade final antes de considerar o app "produto".
**Depends on**: Fase 19 (audita o estado final, incluindo a estética nova)
**Requirements**: FABLE-01
**Success Criteria**:
  1. Auditoria multi-dimensão executada por agentes Fable 5 (SEM override de modelo — herdam o modelo da sessão): correção/bugs, segurança (XSS/LGPD/PII), consistência de UX e linguagem, qualidade dos PDFs/documentos, mobile/responsivo, performance percebida, integridade dos dados oficiais
  2. Todo finding é adversarialmente verificado antes de virar correção (sem falso positivo barato); correções aplicadas pelo Fable 5 com commits atômicos e suíte verde após cada uma
  3. Relatório final da auditoria versionado (achados → veredito → correção → evidência), com o que ficou aceito como limitação documentado
  4. Suíte de testes 100% verde ao fim; verificação ao vivo (preview) dos fluxos principais pós-correções
**Plans**: TBD

## Progress

| Fase | Milestone | Planos | Status | Concluída |
|------|-----------|--------|--------|-----------|
| 19. Estética Premium | v2.2 | 3/3 | Complete    | 2026-07-10 |
| 20. Auditoria Fable 5 | v2.2 | 0/TBD | Not started | - |

**Backlog (v2.3+):** ativação da pesquisa de mercado por IA sobre o seam dormant; upzoning PD 2022×2007; outorga onerosa LC 373; vazios urbanos; ortofoto própria.
