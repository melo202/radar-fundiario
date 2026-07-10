# Phase 19: Estética Premium — Tipografia & Refinamento Visual - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo — pedido direto do usuário: "a letra que está sendo usada em todo o app é muito feia. o app não tá com cara/estética premium")

<domain>
## Phase Boundary

O app ganha cara de produto premium: tipografia nova e bonita em TODO o app (UI, mapa, sheets, PDFs) + refinamento estético (profundidade, acabamento, densidade) + focus-trap nas 6 superfícies modais (A11Y-01). REFINA a identidade cartográfica (papel/óxido, cor-só-status) — não é rebrand.

Entra: TYPO-01, PREM-01, A11Y-01.
NÃO entra: mudança de paleta/identidade; IA/CRM; backend.

</domain>

<decisions>
## Implementation Decisions

### Diagnóstico travado (causa raiz da "letra feia")
- O app declara `"IBM Plex Sans"`/`"IBM Plex Mono"` em ~100 `font:`/`font-family:` MAS **não carrega nenhuma fonte** (zero `@font-face`, zero link/CDN) — o usuário vê o fallback `"Segoe UI"`/monospace do sistema. A correção NÃO é só trocar o nome da família: é **embutir a fonte de verdade**.

### Tipografia (TYPO-01)
- **Embutir via `@font-face` com WOFF2 em base64 DENTRO do HTML** (preserva arquivo único + offline/PWA + PDFs; sem CDN de fonte em runtime). Licença obrigatória: **OFL** (Google Fonts) — registrar a licença em comentário.
- **Orçamento de payload:** ≤ ~250KB de base64 total (latin subset; Google Fonts serve woff2 já subsetado ~10-25KB/peso). Pesos mínimos: sans 400/500/600/700/800 (o app usa 500/600/700/800) + mono 500/700. Medir e registrar o payload real no SUMMARY.
- **Escolha da família:** decidir na fase (UI-SPEC/pesquisa) com critério PREMIUM + identidade cartográfica ("papel/óxido", mapa, dados) + legibilidade pt-BR em 10.5-13px + números tabulares para valores. Candidatos a avaliar (não travado): par display+UI tipo **Fraunces (display serif) + Inter/Archivo (UI)** — evoca cartografia editorial premium; ou grotesque única premium (**Manrope**, **Space Grotesk**, **Sora**, **Archivo**). Mono técnico: **JetBrains Mono** ou IBM Plex Mono (agora embutida de verdade). A decisão final deve ter rationale escrito e ser aplicada CONSISTENTEMENTE.
- **Aplicação:** substituir TODAS as declarações (grep completo em `font:`/`font-family:`) — nenhum resquício da família antiga; PDFs/documentos impressos usam a fonte nova (print herda o @font-face); `letter-spacing`/pesos reajustados à métrica da fonte nova onde necessário (títulos com tracking negativo, eyebrows/mono com tracking largo).
- Fallback stack robusto por trás do @font-face (system-ui etc.) — se a fonte falhar, nada quebra.

### Refinamento estético (PREM-01)
- **Sistema de elevação consistente:** definir 2-3 níveis de sombra/borda (tokens `--elev-*` ou equivalente) e aplicar coerentemente a cards/sheets/dropdowns/toasts — hoje o acabamento é heterogêneo; radius consistente (o app usa 1-2px "cartográfico" — manter a angularidade como identidade, refinando espessuras/contrastes de borda)
- **Microdetalhes premium:** estados hover/active/focus refinados; divisores mais sutis; hierarquia do painel/ficha com contraste tipográfico da fonte nova; polimento dos chips/badges/inputs
- **Restrições invioláveis:** cor só onde significa status (VIS-01); paleta papel/óxido intacta; AA sobre CARTO e satélite; `prefers-reduced-motion`; performance mobile (nada de blur/sombra cara em camada de mapa)
- Escopo é ACABAMENTO, não re-layout: nenhum componente muda de lugar/estrutura

### Focus-trap (A11Y-01 — fecha o IN-03 da Fase 13)
- **Utilitário ÚNICO compartilhado** (ex.: `trapFocus(container)` / `untrapFocus()`) aplicado às 6 superfícies modais: `#onbOverlay`, wizard `.wiz`(#laudoSheet), `#negSheet`, `#captSheet`, `#cmpSheet`, `#detail`/chooser — nunca 6 implementações
- Comportamento: Tab/Shift+Tab circulam nos focáveis visíveis do modal; Esc mantém a cadeia de prioridade existente; ao fechar, foco retorna ao gatilho (padrão já existente em alguns sheets — unificar)
- Não pode quebrar: cadeia de Esc atual, quirk iOS documentado, navegação por teclado da busca (combobox ARIA)

### Verificação
- Suíte 239 verde sempre; parse dos blocos de script; verificação ao vivo (preview): fonte renderizada de fato (document.fonts.check), screenshot antes/depois, focus-trap testado com Tab simulado; PDF de exemplo gerado com a fonte nova
- Payload do HTML antes/depois registrado

### Claude's Discretion
- A escolha final da(s) família(s) e o pairing (com rationale); valores exatos dos tokens de elevação; microcopy se precisar (§26)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- ~100 declarações `font:`/`font-family:` concentradas no CSS inline (linhas ~100-400+) — substituição mecânica mapeável por grep
- Sistema de tokens CSS (`--status-*`, `--terr-*`, `--zone-*`, papel/óxido) — os tokens de elevação entram no mesmo `:root`
- Padrões de foco já existentes (`:focus-visible` com `--accent`); cadeia de Esc centralizada (keydown ~5499); onbAbrir já gerencia foco de origem (fix IN-02)
- Pipeline de impressão `#laudo`→`#laudoView` (PDFs herdam o CSS da página)

### Established Patterns
- Arquivo único sem build: fonte via base64 inline é o único caminho compatível com offline/PWA sem asset novo (ou adicionar .woff2 como assets + sw.js precache radar-v8 — AVALIAR na fase: assets separados mantêm o HTML menor e o sw já precacheia; decisão do planner com medição)
- sw.js bump de versão quando assets mudam

### Integration Points
- Todos os componentes visuais; `#pinoLegenda`/tooltips do mapa (fonte no Canvas do Leaflet é DOM, ok); PDFs; testes NÃO fixam fontes (strings apenas) — suíte não deve quebrar

</code_context>

<specifics>
## Specific Ideas

- Feedback literal do usuário (2026-07-10): "a letra que está sendo usada em todo o app é muito feia. o app não tá com cara/estética premium" — o critério de aceite humano é ELE olhar e achar premium; capturar screenshots antes/depois para o HUMAN-UAT
- Números/valores (R$, m², scores) merecem atenção especial: fonte com dígitos tabulares (font-variant-numeric: tabular-nums) nos lugares de dado

</specifics>

<deferred>
## Deferred Ideas

- Dark mode — não pedido; v2.3+
- Ícones customizados (substituir emoji) — v2.3+ (mudança maior de identidade)

</deferred>
