# Área 11 — Correção funcional (SEM segurança)

**Data:** 2026-07-10 · **Modelo:** Fable 5 · **Baseline:** 252/252 verdes
**Escopo:** substitui a metade não-securitária do auditor de código interrompido. Nenhum arquivo alterado.

## Achados

### [AQ-01] radar-goiania.html:4073-4078 | warning | `pdConsultarQuadra` cacheia o estado "erro" — a guarda do fix B-01 não foi replicada no cache irmão

O fix B-01 ensinou `pdConsultarLote` a nunca cachear `{estado:"erro"}` (senão o retry devolve o erro do cache). O cache gêmeo do detector grava **incondicionalmente**: `PDQUADRACACHE[chaveQuadra]=resultado;`.

**Cenário:** o corretor roda o Detector durante uma oscilação de rede → as 9 consultas do Plano Diretor daquela quadra falham → `{estado:"erro"}` fica cacheado. A rede volta. Ele re-roda o detector no mesmo setor → acerta o cache e recebe o erro velho → o rótulo cai em "Plano Diretor não disponível para este candidato" **pela sessão inteira**. Diferente da ficha, o detector não tem botão de retry que limpe o cache — nunca auto-cura.

**Fix:** espelhar B-01 — `if(!resultado||resultado.estado!=="erro")PDQUADRACACHE[chaveQuadra]=resultado;`

### [AQ-02] radar-goiania.html:4328-4344 | info (latente) | `abrirTerritorio` é a única superfície async sem token de invalidação após o await

Todo o resto do app guarda após cada await (SEARCHTOKEN, LOTTOKEN, ZONASTOKEN, DCUR, TERR_DETECTOR_CAND). `abrirTerritorio` faz `await territorioScan(cd)` e renderiza sem comparar contra o último setor pedido. Dois scans de setores diferentes são promises distintas → concorrentes reais; se A resolve depois de B, o painel mostra o setor A.

**Por que não é alcançável hoje:** o overlay `.loading` cobre o mapa sem `pointer-events:none` e bloqueia o 2º clique em "Ver território". Vira bug no dia em que o overlay virar não-bloqueante.

**Fix:** `TERRTOKEN` no padrão dos demais.

### [AT-03] radar-goiania.html:6872, 7190, 7245 | info (latente) | `trapFocus(#laudoView)` sem guarda de reentrância

`#terrPanel` (`_terrWasShown`) e `#onbOverlay` (`!classList.contains("show")`) só empilham o trap se ainda não estavam abertos. As 3 aberturas de `#laudoView` não têm essa guarda, e só existe um `untrapFocus(lv)`. Se algum caminho reabrir o laudoView já aberto, dois handlers ficam presos.

**Reachability:** não provada hoje (todo gerador fecha antes). Fragilidade latente.

**Fix:** `if(lv.hidden)trapFocus(lv);` nos 3 sítios.

## Fixes da Fase 20 verificados ÍNTEGROS

- **A-01** (botão de busca no `finally`): único outro `disabled=true` é interno à própria `buscar()`; reabilitação incondicional; guarda de sobreposição correta.
- **A-02** (`cadernoListar`): `getAll()` + filtro com coerção `String(...)===String(...)` — robusto a string/number.
- **A-03** (`TRAPS[]` pilha): push/pop equilibrados; `untrapFocus(c)` no-op se `c` não está na pilha; foco volta com checagem `document.body.contains`.
- **A-05** (`abrirFichaDetector→loadCi`): rehidrata com registro completo.
- **A-06** (`capCache` FIFO): reconciliação correta, eviction pela mais antiga, sem vazamento.

## Orçamentos de rede — OK

`territorioScan` ≤3 páginas com `guardTotal` **compartilhado** entre o caminho restrito e o fallback `*`; `returnCountOnly` fora do orçamento paginado. `ZONACACHE`/`ZONALAST` viewport-limited com guarda anti-"cidade inteira". `PDCACHE` (por `ci`), `PDQUADRACACHE` (por `cdbairro-nrquadra`) e `ZONACACHE` (por bbox) usam namespaces distintos — nunca colidem. Detector 100% client-side sobre o scan cacheado.

## Outras verificações limpas

`cruzarCaixaSetor`/`cruzarCaixaTerritorio` sem mismatch de tipo. `medianasPorQuadra` chaveada consistentemente entre detector e render. `renderDiffUI` com guarda DCUR após await. SATTOKEN/SHEETGEN aplicados. `checarVarreduraParcial` não avisa em `paginas===3` (cap intencional).

**Nenhum crítico funcional novo.**
