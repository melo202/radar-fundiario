---
phase: 16-detector-subutilizado-farming-caderno
plan: 02
subsystem: persistence-ui
tags: [caderno, indexeddb, persistence, allowlist, export-import, ui]

# Dependency graph
requires:
  - phase: 16-detector-subutilizado-farming-caderno
    plan: 01
    provides: "sanitizeCaderno/CADERNO_STATUS/statusValido/validarImportCaderno (RADAR_PURE, TDD-coberto)"
provides:
  - "CADERNO_IO (wrapper IndexedDB nativo promise-based): cadernoAbrirDB/cadernoSalvar/cadernoAtualizar/cadernoRemover/cadernoListar/cadernoTem/cadernoContar/cadernoDisponivel"
  - "#cadernoBlock + renderCadernoBlock() (bloco 'Caderno de território' no painel Consulta, filtros/paginação/editor com autosave/duplo-toque)"
  - "Botão '📓 Salvar no caderno' em #dActsMore + renderCadernoBtn() + salvarNoCadernoUI()"
  - "cadernoExportarJSON()/cadernoImportarJSON() (export/import JSON sanitizado)"
affects: [16-03-PLAN (UI do Detector + botão 'Salvar no caderno' no item do detector, consome cadernoSalvar/renderCadernoBtn)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CADERNO_IO fica FORA de RADAR_PURE (I/O real, não mockável de forma útil em node:vm) — toda decisão (allowlist/enum/validação) já era pura e testada pelo Plano 01; aqui só abrir/CRUD"
    - "renderCadernoBlock() é IRMÃ ASSÍNCRONA de renderSavedBlocks() — nunca reescreve o contrato síncrono existente (Oportunidades/Histórico intocados)"
    - "renderCadernoBtn() é IRMÃ ASSÍNCRONA de renderSaveBtn() (Pitfall 4, 16-RESEARCH.md) — cadernoTem() bate no IndexedDB sem travar o resto do render da ficha"
    - "Autosave de status/nota atualiza só o DOM do item aberto (sem full re-render de #cadernoBlock) para não fechar o <details> que o corretor está editando — full re-render só ocorre em ações discretas (salvar/remover/importar/trocar filtro)"
    - "Toda escrita (cadernoSalvar/cadernoAtualizar) passa por sanitizeCaderno ANTES do put — defesa em profundidade mesmo em patches parciais"

key-files:
  created: []
  modified:
    - radar-goiania.html

key-decisions:
  - "Botão 'Salvar no caderno' na ficha entra em #dActsMore (nunca #dActsPrim, que já está no teto '1 primária + 2 secundárias' da lei da tela) — decisão já locked no UI-SPEC/RESEARCH, só implementada aqui"
  - "Filtro de setor do caderno mostra 'Setor {cdbairro}' (código numérico) — CADERNO_ALLOW (Plano 01) não inclui nmbairro/nome de bairro, só cdbairro; nomenclatura por código é a única opção sem reabrir a allowlist"
  - ".dnote (CSS legado) era scoped a .detail — estendido com um seletor adicional #cadernoBlock .dnote (mesmo texto/estilo) para funcionar dentro de #savedBlocks, que não é .detail"
  - "#cadernoBlock reusa a mesma regra de visibilidade de #savedBlocks (.panel:has(#results .empty)) — some quando há resultados de busca ativos, mesma UX do bloco Oportunidades/Histórico"

requirements-completed: [TERR-05]

# Metrics
duration: ~35min
completed: 2026-07-10
---

# Phase 16 Plan 02: Persistência IndexedDB do Caderno + UI Summary

**Wrapper IndexedDB nativo promise-based (CADERNO_IO, schema v1 com caminho v2 reservado) mais o bloco "Caderno de território" completo no painel Consulta (filtros, paginação, editor com autosave/duplo-toque) e o botão "Salvar no caderno" na ficha com export/import JSON sanitizado.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 (wrapper IndexedDB + CSS → bloco Caderno no painel → botão na ficha + export/import)
- **Files modified:** 1 (`radar-goiania.html`)

## Accomplishments

- `CADERNO_IO` (bloco `CADERNO_IO_START`/`_END`, fora de `RADAR_PURE`): `cadernoDisponivel`, `cadernoAbrirDB`, `cadernoSalvar`, `cadernoAtualizar`, `cadernoRemover`, `cadernoListar`, `cadernoTem`, `cadernoContar` — todas promise-based, nenhuma engole erro (o `.catch` fica sempre no call-site da UI).
- Schema v1 do `radar_territorio`: store `caderno` (keyPath `ci`, índices `cdbairro`/`status`) + store `setores` (keyPath `cdbairro`, reservado), com caminho `v2`/`snapshots` comentado para a Fase 17.
- `cadernoSalvar`/`cadernoAtualizar` sempre passam por `sanitizeCaderno` (allowlist do Plano 01) antes de gravar — nunca confiam no chamador, mesmo em patches parciais.
- `#cadernoBlock` + `renderCadernoBlock()` assíncrona no painel Consulta: degradação anunciada quando IndexedDB indisponível, LGPD note locked, filtros por setor/status, lista paginada (30 + "Mostrar mais 30"), item `<details class="cadbook-item">` com chip de status (dot 8px, "Fechou" = verde), editor com 5 chips de status + tag + nota (autosave no blur/clique, sem toast em sucesso) e "Remover do caderno" com duplo-toque de confirmação.
- Botão "📓 Salvar no caderno" em `#dActsMore` (preserva o teto "1 primária + 2 secundárias" de `#dActsPrim`) + `renderCadernoBtn()` assíncrona (Pitfall 4) que alterna "📓 Salvar no caderno" ↔ "✓ No caderno" sem travar o render da ficha.
- `cadernoExportarJSON()` (reusa o esqueleto de `exportCSV()`) e `cadernoImportarJSON()` (valida via `validarImportCaderno` antes de gravar, aditivo por `ci`, nunca reintroduz PII).
- Toda escrita com `.catch(()=>toast(ERRO_ESCRITA_CADERNO))`; toda nota/tag/endereço/setor renderizados via `esc()`. `npm test`: 136/136 verde (suíte pura intocada — bloco de I/O não roda em `node:vm`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrapper IndexedDB nativo (CADERNO_IO) + CSS** - `85bec13` (feat)
2. **Task 2: Bloco "📓 Caderno de território" no painel Consulta** - `0e56ad7` (feat)
3. **Task 3: Botão "📓 Salvar no caderno" na ficha (#dActsMore) + export/import JSON** - `13ebcdb` (feat)

**Plan metadata:** (este commit, docs)

## Files Created/Modified

- `radar-goiania.html` —
  - Bloco `CADERNO_IO_START`/`_END` inserido após `TERR_NET_END` (linha ~3146): wrapper IndexedDB completo + CSS `.cadbook-*` junto ao CSS de `.savedblock`.
  - `<div id="cadernoBlock"></div>` estático após `#savedBlocks`; `renderCadernoBlock()` + helpers (`cadernoFiltrarUI`/`cadernoMaisUI`/`cadernoStatusUI`/`cadernoTagUI`/`cadernoNotaUI`/`cadernoRemoverUI`) inseridos após `renderSavedBlocks()`.
  - Botão `#cadernoBtn` em `#dActsMore`; `renderCadernoBtn()`/`salvarNoCadernoUI()`/`cadernoExportarJSON()`/`cadernoImportarJSON()` inseridos após `renderSaveBtn()`; `renderCadernoBtn()` chamado no ponto de montagem da ficha; `renderCadernoBlock()` chamado no boot ao lado de `renderSavedBlocks()`.

## Decisions Made

- Botão "Salvar no caderno" fica em `#dActsMore` (não `#dActsPrim`) — teto da lei da tela preservado, decisão já locked no UI-SPEC/RESEARCH desta fase, apenas implementada aqui.
- Filtro de setor do bloco Caderno usa `cdbairro` numérico ("Setor {cdbairro}") em vez de nome de bairro — a allowlist `CADERNO_ALLOW` (Plano 01) não inclui `nmbairro`; reabrir a allowlist para um campo de display não-essencial seria fora de escopo desta plan.
- `.dnote` (CSS legado, scoped a `.detail`) ganhou um seletor adicional `#cadernoBlock .dnote` com o MESMO estilo — necessário porque o bloco Caderno vive em `#savedBlocks`, fora de `.detail`; zero token/cor nova.
- Autosave de status/nota/tag atualiza o DOM do item pontualmente (sem `renderCadernoBlock()` completo) para não fechar o `<details>` que o corretor está editando; ações discretas (salvar/remover/importar/trocar filtro/paginar) disparam re-render completo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.dnote` não era visível fora de `.detail`**
- **Found during:** Task 1 (CSS) / confirmado na leitura da Task 2
- **Issue:** O CSS legado `.detail .dnote{...}` (linha 406) só se aplica dentro de `.detail`; o bloco Caderno vive em `#savedBlocks`, sibling de `.detail`, então a nota LGPD (`.dnote` reusado literalmente conforme UI-SPEC) ficaria sem estilo.
- **Fix:** Adicionada a regra `#cadernoBlock .dnote{...}` com o MESMO valor de fonte/cor/margem do original (zero token novo), na seção de CSS novo do Task 1.
- **Files modified:** `radar-goiania.html`
- **Verification:** `npm test` → 136/136, `fail 0`; grep confirma a classe aplicada no HTML gerado por `renderCadernoBlock()`.
- **Committed in:** `85bec13` (parte do commit da Task 1)

**2. [Rule 3 - Blocking] Visibilidade de `#cadernoBlock` não estava especificada pelo mecanismo `:has()` já em uso**
- **Found during:** Task 1/2
- **Issue:** `#savedBlocks` só aparece quando `#results` tem `.empty` (via `.panel:has(#results .empty)`); sem uma regra equivalente, `#cadernoBlock` ficaria sempre visível (inclusive sobre uma lista de resultados de busca), quebrando a hierarquia visual já estabelecida.
- **Fix:** Adicionado `#cadernoBlock{display:none}` + `.panel:has(#results .empty) #cadernoBlock{display:block}`, mesmo padrão de `#savedBlocks`.
- **Files modified:** `radar-goiania.html`
- **Verification:** Regra CSS presente, mesma estrutura de seletor validada visualmente por leitura de código (padrão já em produção desde a Fase 10).
- **Committed in:** `85bec13` (parte do commit da Task 1)

---

**Total deviations:** 2 auto-fixed (ambas Rule 3 — ajustes de CSS necessários para o bloco renderizar corretamente fora do escopo original de `.detail`/`#savedBlocks`, sem introduzir nenhum token novo).
**Impact on plan:** Nenhum — ambos os fixes são extensões de padrões CSS já existentes, sem mudança de comportamento funcional das funções de I/O ou de decisão.

## Issues Encountered

None além dos 2 auto-fixes documentados acima.

## User Setup Required

None - persistência é 100% client-side (IndexedDB nativo do navegador), sem configuração externa.

**Verificação manual pendente (não-bloqueante, fora do harness de teste automatizado — `node:vm` não executa IndexedDB real):** abrir o app num navegador real, salvar ao menos 1 item no caderno (via ficha), abrir DevTools → Application → IndexedDB → `radar_territorio` → store `caderno`, e confirmar visualmente:
1. Nenhum campo de `SENS`/fora de `CADERNO_ALLOW` está presente no item salvo (T-16-01).
2. O item persiste após reload da página.
3. Export gera um `.json` válido; import desse mesmo arquivo não duplica o item (mesmo `ci`).
4. Fluxo de degradação: simular `window.indexedDB` ausente (ou usar um navegador/modo que bloqueie IndexedDB) e confirmar que os botões ficam desabilitados com o aviso, sem erro no console.

## Next Phase Readiness

- `CADERNO_IO` (persistência) e a UI completa do Caderno (bloco + botão na ficha + export/import) estão prontos e consumíveis pelo Plano 03, que adiciona a UI do Detector de Lote Subutilizado e o botão "📓 Salvar no caderno" dentro de cada item do detector — reusa `cadernoSalvar`/`renderCadernoBtn`/`renderCadernoBlock` diretamente, sem retrabalho.
- Nenhum bloqueio identificado. A verificação manual de DevTools (dump do IndexedDB, ver acima) deve ocorrer antes do phase gate (`/gsd-verify-work`), conforme `16-RESEARCH.md` Wave 0 Gaps.

---
*Phase: 16-detector-subutilizado-farming-caderno*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND commit: 85bec13
- FOUND commit: 0e56ad7
- FOUND commit: 13ebcdb
