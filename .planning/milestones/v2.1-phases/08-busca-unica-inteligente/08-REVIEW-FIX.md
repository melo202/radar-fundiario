---
phase: 08-busca-unica-inteligente
status: complete
source: 08-REVIEW.md
completed: 2026-07-07
---

# 08 — Review Fix Summary

| Achado | Sev | Fix | Commit |
|--------|-----|-----|--------|
| CR-01 XSS: texto do usuário (#rua) interpolado em string JS de onclick inline ("Buscar como Prédio") — HTML-decode ressuscita o apóstrofo | critical | Texto sai do JS inline → estado de módulo/dataset; handler no-arg lê o valor em runtime; PoC do review não executa mais | `766cc7a` |
| WR-01 detectMode não suportava "128/5" puro (prometido na spec §2) | warning | Branch de regex dígitos/dígitos isolado → ql (quadra=128, lote=5) + testes novos | `5fb91b0` |
| WR-02 applyLastBairroIfNeeded com efeitos colaterais (localStorage/#bairroInput) no tick do debounce | warning | Efeitos movidos p/ o commit da busca (Enter/buscar()/chip); debounce só computa o preview do chip | `bc985d8` |
| WR-03 identifyPoint sem de-dup (coordenada colada re-disparava rede/UI a cada tick) | warning | Memo de última coordenada (epsilon) + guarda de vôo com SEARCHTOKEN | `ca6c36d` |
| IN-01 esc() dual-purpose + site pré-existente `verNoMapa('${esc(ci)}')` | info | Comentário contratual em esc() ("attribute-safe, NUNCA em string JS inline") + call-site → `verNoMapa(this)` lendo `data-ci` do .bldg-head pai; assinatura aceita elemento OU string (compat) — **completado pelo orquestrador** (fixer parou no meio; verificado no preview com nome contendo apóstrofo) | (este commit) |
| IN-02 colisão de nomes caixa/CAIXA | info | NÃO renomeado (invasivo demais; sem colisão funcional) — registrado | — |

## Verificação
- `node --test "tests/*.test.mjs"` → **31 pass / 0 fail** (4 testes novos do WR-01 + regressões).
- Preview: `verNoMapa(this)` resolve ci via dataset; botão com nome-de-prédio contendo apóstrofo não executa JS.
- Preserve-list re-conferida nos fixes (SEARCHTOKEN, aria, 44px, pointerdown, Esc).
