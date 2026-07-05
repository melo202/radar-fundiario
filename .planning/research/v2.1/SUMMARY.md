# Project Research Summary — v2.1 (Busca, Bairros & Território)

**Researched:** 2026-07-05
**Confidence:** HIGH (quase tudo verificado ao vivo contra o ArcGIS e o CNEFE, ou por leitura direta do código)

## Executive Summary

Os quatro temas do v2.1 são **refactors/extensões sobre uma base recém-endurecida**, não greenfield:

- **Busca já são 3 botões + link** (não 4 abas) após `d275e49`/`91a9130`. O campo-único é uma camada `detectMode()` **em cima** de `buscar()`/`resolveBairro()`/`COMBO` que já funcionam. Refactor estrito, não rewrite.
- **Heatmap R$/m² e o fix da "malha emaranhada" no mobile são a MESMA entrega** — pelo mesmo hook `lotStyle()`/`baiStyle()` que o v2.0 deixou pronto (comentário no código). Choropleth = correção da malha.
- **Reconciliação de nomes de bairro NÃO é join automático** — match por string falha 99,5% (medido ao vivo; `nm_bai` da layer 2 tem até mojibake). Caminho viável: **spatial join via POST** + tie-break assistido por nome nos casos multi-candidato + **spot-check humano** nas bordas. Layer 3 (`nmbairro`/`cdbairro`) é autoritativa.
- **Território exige 3 decisões de arquitetura ANTES de qualquer ferramenta:** uma função de setor-scan compartilhada com cache; um **orçamento de requisições** pra agregação (heatmap ingênuo = centenas de chamadas → 502); **IndexedDB** (não localStorage) + allowlist de campos pra farming/diff.

**Risco transversal:** regressão silenciosa sobre trabalho recém-fechado — a auditoria de 03/07 corrigiu ARIA, `SEARCHTOKEN`, foco de teclado e quirks de iOS na busca; o v2.0 validou o drill independente de geometria e o hook de estilo. Todo tema v2.1 toca exatamente essas áreas → auditorias viram **gates de aceite**, e o fix de nomes é **display-data-only** (geometria/contagem byte-idênticas), nunca uma limpeza geométrica disfarçada.

## Proposed Phase Sequence (a partir da Fase 7)

- **Fase 7 — Fundação de dados (nomes + CNEFE):** reconciliação de nomes (spatial join POST + tie-break + relatório de diff pra revisão humana) + destilação CNEFE (~39–117KB gz, ~9.8k ruas); regenerar `bairros-goiania.json` (geometria/contagem intocadas), bump do `sw.js`. *(A parte de tuning da malha idle/highlight — só as constantes `BAI_STYLE`/`BAI_HOVER` — é isolada e paralelizável aqui.)*
- **Fase 8 — Overhaul da busca:** extrair+testar funções puras → fuzzy-fix (score 3-tiers, recall preservado) → `detectMode()` standalone → chip de confirmação substituindo a moderow → setor-na-frase + lembrar-setor → desambiguação/exemplos/erros-com-ação → deep-link `?insc=` (paralelo) → autocomplete de logradouro com CNEFE. **Gate:** re-passar o checklist de a11y/ARIA/`SEARCHTOKEN` da auditoria.
- **Fase 9 — Choropleth + setor-scan compartilhado + Painel do Território:** construir o scan compartilhado primeiro, depois o choropleth (entrega heatmap + fix da malha juntos), depois o painel do setor. Travar o orçamento de requisições (1–3 páginas, nunca por-quadra) e o zoom-gate antes de codar.
- **Fase 10 — Detector de lote subutilizado + Farming/Caderno (IndexedDB):** detector é filtro barato sobre o scan da Fase 9; Farming é independente (paralelizável); exige `sanitizeAttrs()`/allowlist antes de qualquer persistência.
- **Fase 11 — Diff de cadastro + cruzamento Caixa:** por último, depende do scan (F9) e do território salvo (F10).

Independentes/paralelizáveis: tuning da malha (dentro da F7), deep-link `?insc=` (dentro da F8), Farming (F10).

## Surviving Pitfalls → Phase

- **F7:** join sem chave confiável → tie-break assistido + revisão manual de borda; drill não pode ganhar dependência geométrica nova → assert de diff estrutural; precache/bump do sw.js.
- **F8:** regressão de acessibilidade (gate); propagar `SEARCHTOKEN` aos novos caminhos async; termo ambíguo ("135") resolve por **chips**, não mais regex; apertar fuzzy sem matar recall (separar recall de precisão-de-exibição); não perder o quirk iOS pointerdown/font-size no refactor.
- **F9:** 502 sob carga em setores grandes → agregar em poucas páginas + zoom-gate + cache TTL; choropleth sobre malha ainda emaranhada; legibilidade sobre satélite; jank por recriar polígono → usar `setStyle()`.
- **F10/F11:** localStorage errado → IndexedDB obrigatório; vazamento LGPD por novo caminho de persistência → `sanitizeAttrs()` como pré-requisito.

## Open Decisions (para o usuário)

1. Quem faz o spot-check humano do diff de nomes nas bordas administrativas.
2. Aceitar o orçamento de 1–3 requisições pro heatmap, ou colocar o painel de setor grande atrás de um clique explícito "analisar este setor".
3. Legibilidade do choropleth sobre satélite em luz externa é item bloqueante ou de campo (não-bloqueante).
4. Cadência de refresh do CNEFE (asset estático do Censo 2022 — nunca / a cada censo / manual).
5. Confirmar que números curtos ambíguos ("135") sempre resolvem por chip de desambiguação, não por heurística.
6. Farming/Caderno já sai com export/import no v2.1 ou fica pro v2.2.

## Confidence & Sources

Overall HIGH. Gaps MEDIUM: custo real de scan de setor grande (Bueno 57k) no 4G (extrapolado); calibração da regex do `detectMode()` contra nomes reais; legibilidade do choropleth sobre satélite ao ar livre; quota/eviction do IndexedDB no iOS PWA.

Sources: leitura direta de `radar-goiania.html`, `gerar-bairros.py`, `caixa-goiania.js`, `sw.js`; queries ao vivo no ArcGIS `Feature_Base/MapServer/{2,3}`; download+extração do CNEFE 2022; `git show 91a9130`/`d275e49`; docs do repo; `.planning/research/v2.1/{SEARCH,DATA-NAMES,TERRITORIO,PITFALLS}.md`.

---
*Research completed: 2026-07-05 · Ready for roadmap: yes*
