# Roadmap: Radar Fundiário Goiânia

## Milestones

- ✅ **v1.0 MVP + Inteligência + Mobile** — pré-GSD (shipped 2026-07-03)
- ✅ **v2.0 Mapa-first + Motion + Satélite** — Fases 1-6 (shipped 2026-07-05) · [detalhes](milestones/v2.0-ROADMAP.md) · [requisitos](milestones/v2.0-REQUIREMENTS.md) · [auditoria](milestones/v2.0-MILESTONE-AUDIT.md)
- ✅ **v2.1 Cockpit Comercial** — Fases 7-18, incl. 11.1 (shipped 2026-07-10) · [detalhes](milestones/v2.1-ROADMAP.md) · [requisitos](milestones/v2.1-REQUIREMENTS.md) · [auditoria](milestones/v2.1-MILESTONE-AUDIT.md)

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

## Próximo milestone

A definir via `/gsd-new-milestone` (candidatos v2.2+: ativação da pesquisa de mercado por IA sobre o seam dormant; upzoning PD 2022×2007; outorga onerosa LC 373; vazios urbanos; ortofoto própria; passe de a11y focus-trap nas 6 superfícies modais).
