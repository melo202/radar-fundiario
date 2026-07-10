# Requirements — v2.2 Polimento Premium

**Milestone goal:** o app ganha cara de produto premium (tipografia + estética) e fecha com auditoria completa executada e corrigida pelo Fable 5. Sem IA no produto, sem CRM/Hub.

## Estética Premium (Fase 19)

- [x] **TYPO-01**: **Nova tipografia em todo o app** — substituir a família atual (feedback do usuário 2026-07-10: "a letra é muito feia") por uma escolha premium/legível cobrindo UI + mapa + sheets + PDFs/documentos; fallback de sistema robusto; funciona offline/PWA sem quebrar o arquivo único (@font-face embutida em base64 OU stack de sistema premium — decidir na fase medindo payload); zero texto residual na fonte antiga
- [ ] **PREM-01**: **Refinamento estético premium** — profundidade/elevação consistente (sombras/bordas/raios), acabamento de cards/sheets/botões/inputs, densidade e alinhamento revisados — mantendo a identidade cartográfica (papel/óxido) e a lei "cor só onde significa status" (VIS-01 do v2.1); legibilidade AA sobre CARTO e satélite; reduced-motion intacto
- [ ] **A11Y-01**: **Focus-trap nas 6 superfícies modais** (onboarding, wizard `.wiz`, `#negSheet`, `#captSheet`, `#cmpSheet`, `#detail`/chooser) — Tab/Shift+Tab circulam dentro; Esc fecha; foco retorna ao gatilho (fecha o IN-03 diferido da Fase 13)

## Auditoria Fable 5 (Fase 20 — gate final)

- [ ] **FABLE-01**: **Auditoria completa por Fable 5 + correções por Fable 5** — agentes SEM override de modelo (herdam a sessão Fable 5) auditam: correção/bugs, segurança (XSS/LGPD/PII), consistência de UX/linguagem, PDFs/documentos, mobile, performance percebida, integridade do dado oficial; findings adversarialmente verificados antes de corrigir; correções em commits atômicos com suíte verde; relatório final versionado

## Out of Scope (v2.2)

- Ativação de IA no produto / CRM / Hub — limite de parada do usuário (v2.3+ só com autorização explícita)
- Rebrand/mudança da identidade cartográfica — o premium REFINA a identidade, não a troca (decisão do v2.1 mantida)
- Backend/servidor — arquivo único permanece

## Traceability

| Requirement | Fase | Status |
|-------------|------|--------|
| TYPO-01 | 19 | Complete |
| PREM-01 | 19 | Pending |
| A11Y-01 | 19 | Pending |
| FABLE-01 | 20 | Pending |

---
*Requirements definidos: 2026-07-10 (pedido direto do usuário: tipografia/estética premium + auditoria final pelo Fable 5)*
