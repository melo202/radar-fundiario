# Phase 20: Auditoria Fable 5 (gate final) - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning
**Mode:** Pedido direto do usuário: "auditar tudo pelo fable 5 e corrigir tbm com o fable 5, na última fase"

<domain>
## Phase Boundary

Auditoria profunda de TUDO que foi construído (v2.0-v2.2) executada por agentes **Fable 5** (sem override de modelo — herdam a sessão), com verificação adversarial dos findings e correções aplicadas também pelo Fable 5. Gate de qualidade final. FABLE-01.

</domain>

<decisions>
## Implementation Decisions

### Protocolo (locked)
- **4 auditores Fable 5 em dimensões disjuntas** (cada um mergulha fundo na sua): (A) Correção & Segurança do código (bugs reais, XSS, LGPD/PII, integridade de dados oficiais, race conditions, cadeia async); (B) UX & Consistência (linguagem §26, vocabulário de cor/status, lei da tela/ação, coerência entre superfícies, estados de erro/vazio); (C) Documentos & Dados (PDFs/laudos/minutas — estrutura, tipografia nova, corretude jurídico-formal dos templates, honestidade estatística, REGRA DE OURO do PD); (D) Mobile, Performance & A11y (viewport, touch, orçamentos de rede, parse/payload, focus/ARIA/reduced-motion).
- **Verificação adversarial**: todo finding com severidade ≥ warning passa por um verificador Fable 5 cético instruído a REFUTAR; só CONFIRMED vira correção. Findings info aplicam-se se triviais.
- **Correções pelo Fable 5**: fixer(s) Fable 5 com commits atômicos, `npm test` verde após cada um, sem mudar strings funcionais; correções re-verificadas.
- **Relatório final versionado**: `.planning/phases/20-auditoria-fable-5/20-FABLE-AUDIT.md` (finding → veredito adversarial → correção → evidência → o que foi aceito como limitação).
- Verificação ao vivo (preview) dos fluxos principais após as correções.

### Escopo dos auditores
- Alvos: `radar-goiania.html` (principal), `sw.js`, `caixa-goiania.js`, `tests/`, `manifest.json`, `index.html`; datasets só quanto a integridade de referência (não re-gerar).
- Fora: reescrever features, mudar escopo de produto, mexer em `.planning/`.

### Claude's Discretion
- Partição fina das dimensões, nº de findings a levar para verificação, ordem das correções.

</decisions>

<code_context>
## Existing Code Insights

- App: ~748KB HTML único (7.400+ linhas), 239 testes verdes, 3 milestones de histórico; reviews anteriores por sonnet acharam 40+ findings ao longo do caminho (todos corrigidos) — o Fable 5 deve procurar o que os reviews de fase NÃO pegaram (cross-cutting, races, edge cases profundos)
- Padrões estabelecidos que os auditores devem CONHECER para não gerar falso positivo: RADAR_PURE/TDD, allowlist anti-PII, orçamentos de rede com cache/dedupe, REGRA DE OURO do PD, data-attributes em handlers, honestidade estatística, cadeia de Esc, quirks do endpoint (outFields por serviço)

</code_context>

<specifics>
## Specific Ideas

- O usuário é advogado: findings sobre os documentos jurídicos devem ser precisos, não estilísticos
- Meta: o que sobrar CONFIRMED e corrigido define a qualidade final; o que for aceito como limitação fica documentado com rationale

</specifics>

<deferred>
## Deferred Ideas

- Nenhuma — última fase do v2.2

</deferred>
