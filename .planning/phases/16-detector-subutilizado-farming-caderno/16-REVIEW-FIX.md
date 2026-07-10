---
phase: 16-detector-subutilizado-farming-caderno
fixed_at: 2026-07-10T02:00:00Z
review_path: .planning/phases/16-detector-subutilizado-farming-caderno/16-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-07-10T02:00:00Z
**Source review:** .planning/phases/16-detector-subutilizado-farming-caderno/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (1 critical, 3 warnings, 3 infos)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: `esc(it.ci)` dentro de atributo `onclick`/`onblur` inline reintroduz o JS-string-breakout já corrigido em 08-REVIEW.md

**Files modified:** `radar-goiania.html`, `tests/caderno.test.mjs`, `tests/fixtures.mjs`
**Commit:** `9ede399`
**Applied fix:**
- `renderCadernoBlock()`: os 4 handlers inline (`cadernoStatusUI`/`cadernoTagUI`/`cadernoNotaUI`/`cadernoRemoverUI`) deixaram de interpolar `it.ci` dentro do literal de string JS do atributo `onclick`/`onblur` — passam a receber `this` e ler `ci` via `.closest(".cadbook-item").dataset.ci`, mesmo padrão já usado em `verNoMapa()`.
- As 4 funções handler foram atualizadas (assinatura sem parâmetro `ci`, lido do DOM).
- Defesa em profundidade: `sanitizeCaderno()` ganhou `CADERNO_CI_RE=/^[\w.\-\/]{1,40}$/` — `ci` fora do formato cadastral é descartado (campo removido do objeto sanitizado); `validarImportCaderno()` filtra de novo após o sanitize para nunca aceitar um item cujo `ci` foi zerado pela validação de forma.
- Testes novos: `ci` com aspas/`<script>` importado é rejeitado (item inteiro descartado, item com `ci` válido no mesmo lote sobrevive); `sanitizeCaderno` isolado também cobre o mesmo caso.

### WR-01: Fechar o painel do território não limpava o destaque do detector no mapa

**Files modified:** `radar-goiania.html`
**Commit:** `f47359c`
**Applied fix:** `fecharTerrPanel()` agora chama `limparDestaqueDetector()` incondicionalmente ao fechar o painel (×, alça, Esc, `buscarNoSetor()`/"1 sheet por vez") — a função já é idempotente (early-return se o Set já está vazio), então nenhum caminho de fechamento deixa o destaque gold "vivo" nos polígonos com o painel fechado.

### WR-02: Conexões IndexedDB de `CADERNO_IO` nunca fechadas; sem `onblocked`

**Files modified:** `radar-goiania.html`
**Commit:** `6075828`
**Applied fix:**
- `cadernoAbrirDB()` ganhou `req.onblocked` (rejeita com mensagem clara em vez de travar a Promise silenciosamente).
- `cadernoSalvar`/`cadernoAtualizar`/`cadernoRemover`: `db.close()` em `tx.oncomplete`/`tx.onerror`.
- `cadernoListar`/`cadernoTem`/`cadernoContar` (readonly): `db.close()` no `req.onsuccess`/`req.onerror`.
- Escolhida a estratégia "abrir/fechar por operação" (mais simples, sem estado de conexão compartilhada) — segura para o upgrade de `CADERNO_VERSION` já reservado para a Fase 17.

### WR-03: `sanitizeCaderno()` não validava/truncava o VALOR de `tag`/`nota`

**Files modified:** `radar-goiania.html`, `tests/caderno.test.mjs`, `tests/fixtures.mjs`
**Commit:** `0f84dd3`
**Applied fix:** `sanitizeCaderno()` agora trunca `tag` para 40 chars e `nota` para 500 chars (mesmo limite do `maxlength` do HTML, mas imposto no código — cobre import/atribuição programática); `status` fora do enum `CADERNO_STATUS`, quando presente, é normalizado para `"nao_visitado"` em vez de aceito como está. Testes novos cobrem tag/nota gigantes (via `sanitizeCaderno` direto e via `validarImportCaderno`) e status inválido.

### IN-01: `cadernoContar()` código morto

**Files modified:** `radar-goiania.html`
**Commit:** `1967602`
**Applied fix:** Função removida (nenhuma decisão registrada de reservá-la como API pública para a Fase 17); comentário no bloco `CADERNO_IO` documenta a remoção e como reintroduzir se necessário.

### IN-02: Nota de truncamento do detector hardcoda "50" em vez de `DETECTOR_LIMITE`

**Files modified:** `radar-goiania.html`
**Commit:** `5ad0ab9`
**Applied fix:** `renderDetectorLista()` agora interpola `` `${DETECTOR_LIMITE}` `` no texto de truncamento — texto renderizado idêntico hoje (`DETECTOR_LIMITE=50`), mas nunca mais dessincroniza se a constante mudar.

### IN-03: Mensagem "caderno indisponível" duplicada verbatim em 4 lugares

**Files modified:** `radar-goiania.html`
**Commit:** `d7a55dd`
**Applied fix:** Extraída para a constante `CADERNO_INDISPONIVEL` (ao lado de `ERRO_ESCRITA_CADERNO`) e reusada em `renderCadernoBlock()`, `renderCadernoBtn()`, `salvarNoCadernoUI()` e `salvarDetectorNoCadernoUI()`. Texto renderizado inalterado.

## Skipped Issues

None — todos os 7 findings foram corrigidos.

---

_Fixed: 2026-07-10T02:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

**Verificação:** `npm test` verde após CADA commit (138 -> 141 testes, +6 novos cobrindo CR-01/WR-03). Nenhuma string funcional renderizada foi alterada (IN-02/IN-03 preservam o texto final via interpolação de constante já existente).
