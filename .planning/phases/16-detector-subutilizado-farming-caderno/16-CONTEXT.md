# Phase 16: Detector de Lote Subutilizado & Farming/Caderno - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo — respostas recomendadas aceitas em lote, fundadas em `.planning/research/v2.1/TERRITORIO.md` §1.3-1.4 e §3)

<domain>
## Phase Boundary

O corretor identifica lote subutilizado (filtro client-side sobre o setor-scan da Fase 15, zero requisições próprias) e mantém um **Caderno de território** (farming: salvar setor/lotes com tags, notas e status) que persiste entre sessões via **IndexedDB**, sem risco de PII.

Entra: detector (TERR-04); caderno/farming com IndexedDB + allowlist anti-PII + export/import (TERR-05).
NÃO entra: diff de cadastro entre visitas e cruzamento Caixa (Fase 17); potencial construtivo do Plano Diretor no detector (Fase 18 faz esse upgrade).

</domain>

<decisions>
## Implementation Decisions

### Detector de lote subutilizado (TERR-04)
- **Filtro puro client-side** sobre o array do `territorioScan` (Fase 15) — nenhuma requisição própria (critério de aceite); função pura no RADAR_PURE com TDD
- Critério: razão `areaedif/areaterr` baixa (incl. `areaedif===0` = terreno vago) DENTRO de quadra cujo R$/m² venal mediano é alto (quadra no quartil superior do setor) — thresholds como constantes nomeadas e explicáveis (determinismo auditável)
- **Guarda de qualidade de dado obrigatória**: `areaedif=0` real ≠ `areaedif` null/ausente — registro incompleto NUNCA vira "oportunidade" (padrão `a.areaedif?` já usado no app); rótulo de honestidade da amostra herdado da Fase 15
- Saída: lista ordenada (mais subutilizado primeiro) com leitura comercial ("terreno vago em quadra valorizada"), ação por item (ver ficha, salvar no caderno) — lei da tela/ação das Fases 10/13
- Entrada de UI: ação no painel do território (Fase 15) — ex. botão "Detectar oportunidades" — e os lotes detectados podem ser destacados no mapa com o vocabulário de pinos existente

### Caderno / Farming (TERR-05)
- **IndexedDB obrigatório** (decisão de STATE.md: nunca localStorage para snapshots/caderno), API nativa sem lib wrapper (arquivo único/PWA offline); localStorage existente (radar_sat/radar_prof etc.) intocado
- Schema: DB `radar_territorio`, object store `caderno` (chave = `ci`/inscrição; campos: cdbairro, tag, nota, status, data) + store `setores` (setores salvos). Índices por `cdbairro` e `status`. Versionamento de schema explícito (onupgradeneeded)
- Status do lote: ciclo simples "não visitado → visitei → conversei → recusou/fechou" (enum fixo, sem estado livre); tags livres curtas; nota texto livre DO CORRETOR
- **Allowlist central anti-PII**: função única `sanitizeAttrs()` (ou reuso/extensão da `sanitiza()` da Fase 15) aplicada em TUDO que entra no IndexedDB — campos cadastrais permitidos: `ci/nrinscr, cdbairro, nrquadra, nrlote, vlvenal, areaedif, areaterr, vlimp98, dtinclusao, uso, endereco` — **nunca `dtnascimen`**, nunca titular. Critério de aceite: DevTools confirma ausência de PII
- Falha de escrita **visível**: toast §26.3 com saída ("Não foi possível salvar no caderno. Verifique o espaço do navegador e tente de novo.") — nunca falha silenciosa; feature-detect de IndexedDB com degradação anunciada
- **Export/import JSON** do caderno (backup/troca de aparelho) — mesmo padrão do export CSV existente; import valida via allowlist
- Texto de ajuda do caderno deixa explícito: "suas notas ficam só no seu aparelho" (LGPD + confiança; app sem backend)
- UI: bloco "Meu caderno" acessível do painel Consulta (padrão dos blocos Oportunidades/Histórico da Fase 10) + ⭐/ação "Salvar no caderno" na ficha e no detector; lista filtrável por setor/status

### Relação com o que existe
- "Oportunidades/Histórico" (Fase 10, localStorage) permanecem como estão — o Caderno é a ferramenta de TERRITÓRIO (por lote/setor com status de campo); não migrar dados da Fase 10 nesta fase (evitar churn); se houver colisão de conceito na UI, nomear claramente ("Caderno de território" vs "Oportunidades")
- Detector consome o MESMO cache do setor-scan (nunca dispara scan próprio se o painel já escaneou; se não escaneou, chama `territorioScan` — 1 varredura compartilhada)

### Claude's Discretion
- Nomes exatos de funções/stores, microcopy (gate §26), thresholds exatos do detector (documentados e explicáveis), layout da lista do caderno
- Estratégia de paginação/limite da lista na UI

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `territorioScan`/`TERRCACHE`/estatísticas RADAR_PURE da Fase 15 (quantis por quadra derivável de `estatTerritorio`/breaks); `sanitiza()`/allowlist; painel `#terrPanel` + rodapé de ações
- Padrões da Fase 10: blocos salvos no painel Consulta, ⭐ salvar, templates puros TDD; export CSV existente; toast §26.3; pinos semânticos Fase 13
- `tests/territorio.test.mjs` (loaders RADAR_PURE/TERR_NET) — estender para o detector; IndexedDB não é testável no node:vm → separar lógica pura (decisão/filtragem/sanitização) de I/O

### Established Patterns
- Funções puras TDD no bloco RADAR_PURE (loader fatia o bloco); determinismo auditável; honestidade de amostra; 1 sheet por vez + cadeia Esc; LGPD allowlist

### Integration Points
- Painel do território (entrada do detector), ficha (salvar no caderno), painel Consulta (bloco Meu caderno), mapa (destaque dos detectados), sw.js (sem asset novo esperado; bump só se necessário)

</code_context>

<specifics>
## Specific Ideas

- Critério de aceite 4 é literal: allowlist central impede qualquer campo fora da lista no IndexedDB e DevTools confirma ausência de PII — o plano deve incluir verificação com dump do store
- Detector é candidato a upgrade na Fase 18 (potencial do PD) — deixar o critério de decisão isolado numa função pura para o upgrade ser barato

</specifics>

<deferred>
## Deferred Ideas

- Snapshots versionados por setor (diff) — Fase 17 (o store/DB desta fase já deve prever a evolução de schema via version/onupgradeneeded)
- Cruzamento Caixa sobre território salvo — Fase 17
- Potencial construtivo (CA do Plano Diretor) no detector — Fase 18

</deferred>
