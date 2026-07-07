---
phase: 10-acao-whatsapp-captacao-salvos
status: complete
source: 10-REVIEW.md
completed: 2026-07-07
---

# 10 — Review Fix Summary (aplicado pelo orquestrador)

| Achado | Sev | Fix | Verificação |
|--------|-----|-----|-------------|
| CR-01: oppLoad/histLoad aceitavam JSON válido NÃO-array → TypeError no init abortava o BOOT inteiro do app | critical | `Array.isArray(v)?v:[]` nas duas funções | Preview: storage corrompido (`{"nao":"array"}` e `"string"`) → boot ok, loads retornam [], blocos renderizam, console limpo |
| WR-01: fallback execCommand sem `readonly` (teclado/seleção iOS) e sem devolver o foco ao gatilho | warning | `setAttribute("readonly","")` + `setSelectionRange` + captura/restauração de `document.activeElement` | 47/47 testes; caminho coberto por leitura |
| WR-02: `.savedblock-clear` 32px em ação destrutiva (Limpar histórico) | warning | min-height 44px + padding lateral | CSS conferido |
| IN-01/02/03 (mesma causa do CR; branch string morto em abrirOportunidade; sem focus-trap no captSheet — gap pré-existente do app inteiro) | info | CR já cobre o 1º; branch string mantido (compat programática documentada); focus-trap registrado p/ Fase 13 (gap do #wiz também) | — |

Limpos no review: allowlist de privacidade fim-a-fim (12 campos + timestamps, teste negativo dedicado), __scores race-safe (DCUR re-checado), esc() em todo texto persistido→DOM, cadeia do Esc com captSheet na precedência correta.

`node --test "tests/*.test.mjs"` → **47 pass / 0 fail**.
