# Phase 17: Diff de Cadastro & Cruzamento Caixa - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo — respostas recomendadas aceitas em lote, fundadas em `.planning/research/v2.1/TERRITORIO.md` §1.5-1.6)

<domain>
## Phase Boundary

O corretor vê **o que mudou num lote salvo desde a última visita** (diff de snapshot, client-side, IndexedDB) e **onde os imóveis Caixa cruzam com o território salvo** (destaque quando um imóvel Caixa cai em setor/lote farmado). Fecha o ciclo do Território do v2.1.

Entra: snapshot por lote salvo no caderno + diff na revisita (TERR-06); cruzamento Caixa × caderno/setores salvos (TERR-07).
NÃO entra: dados do Plano Diretor (Fase 18); scan completo de setor para diff em massa (o diff é sobre o que o corretor SALVOU).

</domain>

<decisions>
## Implementation Decisions

### Diff de cadastro (TERR-06)
- **Escopo do snapshot: por LOTE SALVO no caderno** (não snapshot de setor inteiro) — o gatilho do diff é a revisita de um lote farmado; barato, zero requisição extra além da consulta da ficha que o corretor já fez. O snapshot de setor completo (~29 páginas) segue fora do orçamento e fora desta fase
- **Momento do snapshot:** ao salvar no caderno (Fase 16 já persiste os campos cadastrais permitidos — isso É o snapshot v1) e a cada revisita da ficha do lote salvo, o app compara o dado FRESCO (da consulta da ficha) com o snapshot salvo e, após mostrar o diff, atualiza o snapshot (guardando `snapshotAt`)
- **Campos do diff (mesma allowlist da Fase 16 — CADERNO_ALLOW):** `vlvenal` (subiu/desceu %), `areaedif` (construção nova/demolição), `vlimp98` (IPTU), `uso` (mudou), `dtinclusao`; **nunca PII/`dtnascimen`**
- **Formato:** diff enxuto e comercial — só o que mudou, com direção e magnitude ("Valor venal subiu 12% desde 10/05", "Área construída: +85 m² — construção nova?"); nada mudou → uma linha discreta ("Sem mudanças no cadastro desde a última visita"); thresholds de relevância (ex.: ignorar variação < 1%) como constantes nomeadas
- **Persistência:** evolução do schema IndexedDB `radar_territorio` v1→**v2** via `onupgradeneeded` (caminho já reservado na Fase 16): snapshot embutido no item do caderno (campos + `snapshotAt`) OU store `snapshots` separada — a decisão fina é do planner, mas SEM histórico ilimitado nesta fase (guardar apenas o último snapshot anterior; histórico completo é v2.2+)
- Funções puras TDD: `diffLote(snapshotAntigo, atual)` → lista de mudanças tipadas; formatação de leitura comercial; tudo no RADAR_PURE

### Cruzamento Caixa (TERR-07)
- **Comparação por `cdbairro` primeiro** (barato, determinístico): imóvel Caixa (`caixa-goiania.js`, `CAIXA.imoveis[]` com coordenadas e bairro) cruza com setores/lotes salvos no caderno via código/nome de bairro — `.filter()` puro, zero requisição
- Point-in-polygon fino só se o custo for trivial com a geometria já carregada (`bairros-goiania.json`) — refinamento, não requisito
- **Superfícies do destaque:** (a) badge/contagem no bloco Caderno ("2 imóveis Caixa no seu território"); (b) destaque no pino Caixa existente quando cai em setor farmado (ex.: anel/ícone extra no pino dourado — sem mudar o vocabulário de cores); (c) linha no painel do território quando o setor tem imóveis Caixa
- Ação em 1 toque: do aviso → abrir o pino/popup Caixa correspondente no mapa (lei da ação)
- Zero requisição nova: `caixa-goiania.js` já é carregado e plotado hoje

### LGPD / segurança
- Snapshot usa exclusivamente a allowlist `CADERNO_ALLOW`/`sanitizeCaderno` da Fase 16 (mesma função, defesa central); diff nunca exibe/persiste campo fora dela
- Import/export do caderno continua válido com os campos novos de snapshot (validação de shape atualizada + testes)
- Todo texto renderizado via esc()/textContent (lição do XSS da Fase 16 — handlers via data-attributes, nunca interpolação em on*)

### Claude's Discretion
- Estrutura exata do snapshot (embutido vs store), thresholds de relevância, microcopy (§26), layout do bloco de diff na ficha/caderno
- Como o dado "fresco" chega ao diff (hook no fluxo da ficha `showDetail`/`loadCi` para lote com `ci` no caderno)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Fase 16: `CADERNO_IO` (IndexedDB v1, `onupgradeneeded` preparado p/ v2), `sanitizeCaderno`/`CADERNO_ALLOW`, bloco `#cadernoBlock`, `renderCadernoBtn` (sabe se o `ci` está no caderno)
- `caixa-goiania.js` (`CAIXA.imoveis[]` com x/y UTM, bairro `b`, preço etc.) + pinos Caixa já plotados (`caixaPopup`); `bairros-goiania.json` + `bairro-cdbairro.json` (id↔cdbairro)
- Fluxo da ficha (`showDetail`) — ponto do hook do diff; RADAR_PURE + harness de testes (141 verdes)

### Established Patterns
- Funções puras TDD no RADAR_PURE; IndexedDB com db.close()/onblocked (fix WR-02); toasts §26.3; honestidade e determinismo; data-attributes em handlers

### Integration Points
- Ficha (`#detail`) — bloco de diff na revisita; `#cadernoBlock` — badge Caixa + diff resumido; pinos Caixa no mapa — destaque de território; painel do território — linha Caixa

</code_context>

<specifics>
## Specific Ideas

- Critério 1 do ROADMAP é literal: "Revisitar um lote salvo mostra o que mudou desde o snapshot (diff enxuto, nunca PII; mesma allowlist da Fase 16)"
- O diff deve ser útil ao corretor como GATILHO comercial ("venal subiu → dono pode querer vender/reavaliar") — leitura comercial, não tabela técnica

</specifics>

<deferred>
## Deferred Ideas

- Histórico completo de snapshots (série temporal por lote) — v2.2+
- Diff de setor inteiro (snapshot em massa) — v2.2+ (custo de requisições)
- Alertas proativos/notificações de mudança — v2.2+ (exigiria varredura em background)

</deferred>
