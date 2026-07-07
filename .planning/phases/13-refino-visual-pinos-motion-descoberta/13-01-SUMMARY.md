---
phase: 13-refino-visual-pinos-motion-descoberta
plan: 01
subsystem: ui
tags: [css, design-tokens, pure-functions, tdd, status-system]

# Dependency graph
requires:
  - phase: 09-scores-oportunidade-confianca-leitura
    provides: "scoreOportunidade() com bandas 66/33 (score>=66 'Boa oportunidade', score>=33 'Oportunidade média', senão 'Abaixo da mediana') dentro do bloco RADAR_PURE"
provides:
  - "8 vars --status-*/--status-*-ink no :root (bom/atencao/risco/caixa/semdado), todas aliases de hex já existentes"
  - "10 seletores de refino de respiro aplicados (padding/margin/gap/border) conforme tabela do 13-UI-SPEC.md"
  - "statusDeUnidade(input) pura no RADAR_PURE — contrato único que Wave 2 (pinos, 13-02) consome sem reimplementar limiares"
affects: [13-02-pinos-semanticos, 13-03-motion-descoberta]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sistema --status-* como aliases documentados de hex já existentes (zero cor nova); 1 literal excepcional documentado inline (--status-atencao-ink)"
    - "Pure function statusDeUnidade aceita duas formas de entrada ({op:{score}} ou número direto), nunca lança exceção, nunca retorna 'caixa' (decisão do caller)"

key-files:
  created: []
  modified:
    - radar-goiania.html
    - tests/scores.test.mjs
    - tests/fixtures.mjs

key-decisions:
  - "statusDeUnidade nunca reimplementa os limiares 66/33 — só aplica as MESMAS bandas de scoreOportunidade, garantindo consistência entre ficha (Fase 9) e futuros pinos/legenda (Wave 2)"
  - "--status-atencao e --status-caixa compartilham o mesmo hex (--gold) por design — distinção visual (traço vs sólido) e textual fica a cargo do consumidor (Wave 2), não desta plan"
  - "Borda de .dvalor reduzida de 2px para 1.5px para eliminar a dupla-borda de mesma espessura com .detail, mantendo a moldura externa como hierarquicamente mais pesada"

patterns-established:
  - "Pattern: --status-* vars sempre var(--x) exceto exceção documentada inline com comentário explicando a origem do hex literal"
  - "Pattern: pure function de mapeamento de status aceita múltiplas formas de entrada e nunca lança — sempre retorna um estado válido, mesmo para entrada malformada"

requirements-completed: [VIS-01]

duration: 35min
completed: 2026-07-07
---

# Phase 13 Plan 01: Sistema de Status, Refino de Respiro e statusDeUnidade Summary

**Sistema `--status-*` (5 aliases de hex existentes) + refino de respiro em 10 seletores da ficha/card/rodapé + função pura `statusDeUnidade` com bandas 66/33 idênticas a `scoreOportunidade`**

## Performance

- **Duration:** 35 min
- **Started:** 2026-07-07T21:33:00Z
- **Completed:** 2026-07-07T22:08:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 8 vars `--status-bom`/`--status-bom-ink`/`--status-atencao`/`--status-atencao-ink`/`--status-risco`/`--status-risco-ink`/`--status-caixa`/`--status-semdado` adicionadas ao `:root`, cada uma documentada inline com o hex de origem — zero hex novo introduzido (única exceção documentada: `--status-atencao-ink:#7d621f`, hex literal já usado em `.score-op.media .score-num`)
- Os 10 seletores da tabela de Refino de Respiro do `13-UI-SPEC.md` aplicados byte-a-byte — nenhum seletor fora da lista foi tocado
- `statusDeUnidade(input)` implementada dentro do bloco `RADAR_PURE`, aceitando `{op:{score}}` ou número direto, retornando `'bom'|'atencao'|'risco'|'semdado'` pelas MESMAS bandas 66/33 de `scoreOportunidade` — nunca lança exceção, nunca retorna `'caixa'`
- Suite de testes: 107/107 passam (105 existentes + 2 novos blocos de teste cobrindo 17 casos de `statusDeUnidade`), zero regressão

## Task Commits

Cada task foi commitada atomicamente (fluxo TDD):

1. **Task 1: RED — testes de statusDeUnidade + fixtures (falhando)** - `e5829ee` (test)
2. **Task 2: GREEN — implementar statusDeUnidade + aplicar sistema --status-* + refino de respiro** - `97b6983` (feat)

## Files Created/Modified

- `radar-goiania.html` - 8 vars `--status-*` no `:root`; 10 seletores refinados (`.detail`, `.dvalor`, `.dscores`, `.score`, `.dleitura`, `.card`, `.card .vals`, `.bldg-head`, `.bldg-sumario`, `.foot`, `.maisopcoes .footbody.acts`); função `statusDeUnidade` no bloco `RADAR_PURE`
- `tests/scores.test.mjs` - 2 novos testes de `statusDeUnidade` (bandas + nunca-lança-excecao; nunca-retorna-caixa), adicionado à lista de exports do sandbox `loadPureBlock`
- `tests/fixtures.mjs` - chave `statusDeUnidadeCasos` (17 casos cobrindo limites exatos 66/33/32/0, formas `{op:{score}}`/número, `null`/`undefined`/`{}`/`NaN`/string não-numérica)

## Decisões Made

- Ver `key-decisions` no frontmatter — sem decisões fora do que já estava especificado no plano.

## Lista dos 10 Seletores — Antes/Depois Confirmado por Leitura Pós-Edição

| # | Seletor | Propriedade | Antes | Depois (confirmado) |
|---|---|---|---|---|
| 1 | `.detail` | `padding` | `16px 18px` | `20px 22px` |
| 2 | `.dvalor` | `padding` / `margin-bottom` / `border` | `16px 18px` / `12px` / `2px solid var(--ink)` | `18px 20px` / `16px` / `1.5px solid var(--ink)` |
| 3 | `.dscores` | `gap` / `margin-bottom` | `8px` / `12px` | `10px` / `16px` |
| 4 | `.dleitura` | `padding` / `margin-bottom` | `12px 14px` / `12px` | `14px 16px` / `16px` |
| 5 | `.score` | `padding` | `8px 12px` | `10px 14px` |
| 6 | `.card` | `padding` | `13px 14px` | `14px 16px` |
| 7 | `.card .vals` | `padding-top` | `9px` | `10px` |
| 8 | `.bldg-head` | `padding` | `10px 12px` | `12px 14px` |
| 9 | `.bldg-sumario` | `margin-top` / `padding-top` | `8px` / `8px` | `10px` / `10px` |
| 10 | `.foot` | `padding` | `9px 22px` | `10px 22px` |
| 11 | `.maisopcoes .footbody.acts` | `padding-top` | `8px` | `10px` |

(11 declarações cobrindo os 10 seletores da tabela do UI-SPEC — `.detail`/`.dvalor` contam separadamente. `.chooser` reusa a classe `.detail` via `<div class="detail chooser" id="chooser">` (linha 903) — herda o padding refinado automaticamente, sem regra CSS adicional.)

## Assinatura Exata de statusDeUnidade

```js
function statusDeUnidade(input){
  let score;
  if(input && typeof input==="object"){
    score = input.op ? input.op.score : undefined;
  } else {
    score = input;
  }
  if(typeof score!=="number" || !isFinite(score)) return "semdado";
  if(score>=66) return "bom";
  if(score>=33) return "atencao";
  return "risco";
}
```

Aceita `{op:{score:N}}` OU número direto; qualquer entrada ausente/malformada (`null`/`undefined`/`{}`/`NaN`/string não-numérica) retorna `'semdado'` sem lançar exceção; nunca retorna `'caixa'` (decisão do caller, Wave 2).

## Resultado da Suite Completa

```
ℹ tests 107
ℹ pass 107
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

105 testes existentes (Fases 8-12) + 2 novos blocos cobrindo os 17 casos de `statusDeUnidade` — zero regressão.

## Confirmação: Nenhum Hex Novo Introduzido

Auditoria do bloco `:root` (linhas 24-59) confirma que todas as 8 vars `--status-*` são `var(--x)` apontando para uma var já existente (`--lot`, `--lot-bright`, `--gold`, `--accent`, `--accent-ink`, `--muted`), com exceção única e documentada inline de `--status-atencao-ink:#7d621f` — hex literal que já era usado em `.score-op.media .score-num` (linha ~321) antes desta plan, portanto não é uma cor nova ao app, apenas nomeada semanticamente por trás de uma var pela primeira vez.

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `statusDeUnidade` pronta para a Wave 2 (13-02, pinos semânticos) consumir sem reabrir esta plan — contrato travado (aceita `{op:{score}}` ou número, nunca retorna `'caixa'`, sempre `'semdado'` em caso de dúvida)
- Sistema `--status-*` disponível para qualquer componente CSS futuro (legenda, badges) referenciar sem introduzir hex novo
- Refino de respiro da ficha/card/rodapé consolidado — nenhum bloqueio para as próximas waves desta fase

---
*Phase: 13-refino-visual-pinos-motion-descoberta*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: tests/scores.test.mjs
- FOUND: tests/fixtures.mjs
- FOUND: .planning/phases/13-refino-visual-pinos-motion-descoberta/13-01-SUMMARY.md
- FOUND commit: e5829ee (test(13-01): add failing tests for statusDeUnidade)
- FOUND commit: 97b6983 (feat(13-01): status vars, respiro refinement, statusDeUnidade)
