# Phase 14: Linguagem Impecável (pt-BR) — gate de release - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo — respostas recomendadas aceitas em lote)

<domain>
## Phase Boundary

Gate de release de linguagem: **toda** a microcopy do app (botões, placeholders, mensagens de erro, tooltips, títulos, descrições, PDFs/documentos, mensagens de WhatsApp) passa pelo checklist §26 (LING-01). Fase de **texto apenas** — nenhuma mudança de comportamento, layout ou lógica; só strings. Cobre tudo que as Fases 8–13 introduziram mais o legado v1/v2.0 visível ao usuário.

Checklist §26 (critérios objetivos, do REQUIREMENTS.md):
1. Acentuação correta (pt-BR)
2. **Verbo de ação** nos botões (gerar/copiar/salvar/comparar/enviar/criar)
3. Erro que explica **e oferece saída**
4. Zero jargão na 1ª camada (jargão técnico só em camadas profundas/accordion técnico)
5. Sem caixa alta em bloco longo
6. Sem ironia/gíria
7. Consistência de nomenclatura (não alternar "Oportunidades/Favoritos/Salvos" sem motivo)
8. WhatsApp: tom de corretor profissional; Documentos: linguagem formal e juridicamente cuidadosa

</domain>

<decisions>
## Implementation Decisions

### Inventário e varredura
- Varredura **sistemática por categoria** (botões → placeholders → erros → tooltips/aria → títulos/descrições → templates WhatsApp → templates de documento/PDF), não leitura linear do arquivo — garante cobertura auditável
- Fontes: `radar-goiania.html` (UI inline + RADAR_PURE templates), `index.html`, `manifest.json` (name/description), textos gerados em `sw.js` se houver
- Produzir **tabela de auditoria** (string original → veredito → string final → critério §26 aplicado) como artefato da fase — é o que prova o "gate"
- Strings de código (IDs, classes, chaves de localStorage, logs de console) estão **fora** do escopo — só texto que chega ao usuário

### Critério de mudança
- Mudança mínima que satisfaz o §26 — não reescrever texto que já está correto (evita churn e regressão)
- Botões sempre iniciam com verbo de ação no infinitivo ("Gerar laudo", "Copiar mensagem", "Salvar oportunidade")
- Toda mensagem de erro segue o padrão **o que houve + por quê (se útil) + o que fazer** ("Não encontramos essa inscrição. Confira os dígitos ou busque pelo endereço.")
- Jargão cadastral (inscrição, venal, CI, matrícula) permitido apenas em camadas técnicas/accordion; 1ª camada usa termo do corretor

### Nomenclatura canônica
- Fixar um glossário canônico na própria auditoria antes de editar: um único termo por conceito (ex.: decidir entre "Salvos"/"Oportunidades"/"Favoritos" conforme o que a Fase 10 consolidou na UI) e aplicar em toda parte
- Preservar os nomes já estabelecidos e verificados nas fases anteriores (ex.: "O que o Radar faz", "Modo Captação") — consistência vence preferência estética
- Documentos jurídicos (Fase 11/11.1) mantêm terminologia formal já revisada; ajuste só onde ferir o §26

### Verificação (gate)
- Texto-apenas: suíte de testes existente (`tests/`) precisa continuar 100% verde; templates do RADAR_PURE que têm testes de snapshot/conteúdo são atualizados junto com os testes correspondentes
- Verificação final = checklist §26 percorrido categoria a categoria na tabela de auditoria, com contagem (N strings revisadas, M alteradas)
- WhatsApp/documentos: leitura em voz alta do resultado gerado (persona corretor / linguagem formal) como critério de aceite

### Claude's Discretion
- Ordem exata da varredura, formato da tabela de auditoria, e microdecisões de estilo (dentro do §26) ficam a critério do Claude
- Se encontrar texto ambíguo cuja correção muda significado funcional, manter o significado atual e anotar na auditoria

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `radar-goiania.html` — arquivo único com toda a UI e o namespace RADAR_PURE (templates puros de WhatsApp, captação, documentos — testáveis)
- `tests/` — suíte existente (TDD do RADAR_PURE); templates têm testes que fixam conteúdo
- `.planning/phases/10..13` — SUMMARYs listam a microcopy introduzida recentemente (WhatsApp, captação, documentos, onboarding, "O que o Radar faz")

### Established Patterns
- Microcopy pt-BR já orientada a ação nas fases recentes (Fase 13 revisou onboarding/CTAs); legado v1 é o maior risco de texto amador
- Cor/status e tom "cockpit premium" definidos na Fase 13 — linguagem deve soar igual: profissional, direta, sem hype
- LGPD: nenhum texto pode induzir coleta de dado pessoal; disclaimers dos documentos preservados

### Integration Points
- Templates RADAR_PURE (WhatsApp/proposta/termo/contrato/ficha) — mudança de string exige atualizar teste correspondente
- `manifest.json` (name/short_name/description) e `<title>`/meta description do HTML
- Onboarding (radar_onboard), sheets (.wiz, #negSheet), mensagens de erro da busca única (Fase 8)

</code_context>

<specifics>
## Specific Ideas

- O critério de qualidade do WhatsApp é: "parece escrito por um corretor profissional" — sem emoji excessivo, sem caps, com dado concreto do imóvel
- Documentos (proposta/termo/contrato/laudo) mantêm ressalvas jurídicas; linguagem "juridicamente cuidadosa" = sem promessa de resultado, sem afirmação de propriedade não verificada

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
