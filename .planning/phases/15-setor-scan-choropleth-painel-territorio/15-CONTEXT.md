# Phase 15: Setor-Scan Compartilhado, Choropleth & Painel do Território - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo — respostas recomendadas aceitas em lote, fundadas em `.planning/research/v2.1/TERRITORIO.md`)

<domain>
## Phase Boundary

O corretor vê o "calor" de valor do território (choropleth de R$/m²) e as métricas do setor (painel), sem avalanche de requisições — tudo sobre uma **função compartilhada de varredura de setor** (TERR-01) que é a fundação das Fases 16-17. Client-side, determinístico, sem backend.

Entra: setor-scan com orçamento/cache/zoom-gate; choropleth por quantis relativos ao setor (substitui a cor neutra da malha); painel do Meu Território (mediana + Q1-Q3 de R$/m², IPTU mediano, idade do cadastro, mix de uso).
NÃO entra: detector de subutilizado (F16), farming/IndexedDB (F16), diff/Caixa (F17), dados do Plano Diretor (F18).

</domain>

<decisions>
## Implementation Decisions

### Setor-scan compartilhado (TERR-01) — orçamento de requisições
- **Uma única função compartilhada** (ex.: `territorioScan(cdbairro)`) com **cache de sessão por `cdbairro`** (mesmo padrão do `CMPCACHE` dos comparáveis) e **dedupe de chamadas em voo** — Painel + Choropleth abertos juntos disparam UMA varredura, nunca duas (pitfall crítico da pesquisa)
- **Orçamento HARD: ≤3 requisições paginadas por scan** (critério de aceite do ROADMAP). Para setor grande (Bueno ~57k lotes), o scan padrão é **amostra paginada** (até 3 páginas × 2000 = até 6.000 lotes) + `returnCountOnly` para o total real — quantis/medianas calculados sobre a amostra e **rotulados com honestidade** ("com base em N de M lotes"). NUNCA baixar as ~29 páginas do setor inteiro no fluxo padrão; NUNCA 1 requisição por quadra
- **Zoom-gate**: nenhuma consulta de território dispara automaticamente — só sob ação explícita do usuário (abrir painel/ligar choropleth de um setor identificado); sem varredura em pan/zoom passivo
- Endpoint só aceita `outFields=*` (quirk confirmado) — o corte de custo vem do nº de requisições e do cache, não de restringir campos; retry/backoff gentil já existente do app é reusado; falha → toast com saída
- Campos usados no resultado do scan (allowlist): `vlvenal, areaedif, areaterr, vlimp98, dtinclusao, uso, cdbairro, nrquadra, nrlote, ci/nrinscr, x/y` — **nunca `dtnascimen`** (LGPD)

### Choropleth (TERR-02)
- **Quantis discretos relativos ao setor** (5 faixas, nunca gradiente contínuo) — mesma filosofia "relativa, imune à defasagem da PGV" dos comparáveis
- Implementar via **hook de estilo existente** (`lotStyle()`/`baiStyle()` — o gancho foi deixado pronto no v2.0) e **`setStyle()`** para trocar tema (não recriar geometria); respeita `prefers-reduced-motion`
- **Populado incrementalmente**: só setores já escaneados ganham cor; os demais mantêm a malha neutra idle da Fase 7 (honesto — não simula dado que não existe; zero pré-computação dos 1.206)
- **Composição**: sobre CARTO light, fill sutil (~.15-.25); sobre satélite, fill mais opaco (~.35-.45) + traço de borda com mais contraste (o branch `satelliteOn` de `baiStyle()` é o padrão a estender); **`fillOpacity` nunca 0** (mataria a hit-area de toque no Canvas renderer — mínimo .02)
- Contraste AA nos dois fundos (critério de aceite); cor carrega significado de status — coerente com a lei "cor só onde significa status" da Fase 13
- **Legenda compacta tocável** (faixa horizontal de 5 blocos + rótulos de faixa de R$/m²), recolhível, com **toggle liga/desliga o choropleth** (volta à malha neutra); segue o padrão visual de chips/badges existente

### Painel do Meu Território (TERR-03)
- Métricas: **mediana + Q1-Q3 de R$/m² venal** (por `areaedif` se edificado, `areaterr` se terreno), **IPTU mediano** (`vlimp98`), **idade mediana do cadastro** (`dtinclusao`), **mix de uso** (`uso`), **nº de lotes** (total real via `returnCountOnly`)
- Todo número derivado da amostra leva o rótulo de base ("amostra de N de M lotes") — honestidade estatística padrão do app (faixa, nunca número seco)
- Entrada de UI: a partir do setor em foco (bairro destacado/buscado) — botão/ação "Ver território" abre o painel; painel usa o padrão de sheet/painel existente (mobile bottom-sheet, desktop painel)
- Painel termina com ação (lei da Fase 10): ex. ligar choropleth, buscar lote no setor
- Estatística em funções puras no `RADAR_PURE` com TDD (quantis, mix de uso, formatação) — padrão das Fases 8-12

### Claude's Discretion
- Nome exato de funções/UI, microcopy (já sob gate §26 — manter padrão da Fase 14), tamanho exato da amostra (2-3 páginas), detalhes da paleta (desde que 5 faixas discretas AA e coerentes com o design system --status-*)
- Estratégia exata de amostragem (páginas sequenciais do resultSet padrão é aceitável; documentar o viés se houver)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchWhere` (paginação JSONP), `compsStats` (busca binária `returnCountOnly` + aritmética no WHERE), `CMPCACHE`/`capCache` (cache de sessão) — padrões prontos em `radar-goiania.html`
- `baiStyle()`/`lotStyle()` como funções de resolução de estilo (hook explícito p/ styling por território, comentário no código); branch `satelliteOn` existente
- `bairros-goiania.json` (1.206 polígonos estáticos) + hierarquia idle/highlight da Fase 7; sistema `--status-*` da Fase 13; RADAR_PURE + `tests/*.test.mjs` (108 verdes)

### Established Patterns
- Estatística sempre como faixa/quantis relativos (IAAO); honestidade de base amostral; retry/backoff gentil; toast de erro com saída (§26.3)
- LGPD: allowlist de campos, nunca `dtnascimen`; tudo client-side

### Integration Points
- Malha de bairros (`bairroLayer`) — choropleth troca o fill neutro; legenda ancorada no mapa; painel via sheet existente; ações do painel ligam com busca/ficha

</code_context>

<specifics>
## Specific Ideas

- Success criterion do ROADMAP é literal: "abrir painel/choropleth do Bueno dispara ≤1-3 requisições paginadas — verificado ao vivo" — o plano deve incluir verificação ao vivo com contagem de requisições
- Phase flags do ROADMAP: orçamento real em 4G é verificação de campo em aberto (HUMAN-UAT não-bloqueante); legibilidade sobre satélite em luz externa é UAT não-bloqueante

</specifics>

<deferred>
## Deferred Ideas

- Scan completo opcional ("expandir análise completa", ~29 páginas com barra de progresso) — só se alguma métrica exigir; padrão fica na amostra. Se implementado, é acionamento explícito e fora do orçamento padrão. Candidato à Fase 16/17 se o diff precisar de snapshot completo
- Choropleth por bairro em zoom de cidade populado incrementalmente entre sessões (persistência) — depende do IndexedDB da Fase 16

</deferred>
