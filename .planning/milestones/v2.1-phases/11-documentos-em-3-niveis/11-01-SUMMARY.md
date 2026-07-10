---
phase: 11-documentos-em-3-niveis
plan: 01
subsystem: ui
tags: [documentos, recomendacao, cnai, confianca, pendencias, pure-functions, tdd, radar-pure]

# Dependency graph
requires:
  - phase: 09-scores-confianca-oportunidade
    provides: scoreConfianca(inputs) — completude/pendencias de dados, reusado internamente por pendenciasDocumento
  - phase: 10-templates-whatsapp-captacao
    provides: faixaTxt/brlSimples/leituraPratica ja existentes no bloco RADAR_PURE, reusados por fichaRapidaTexto; shape do objeto `data` (mesmo de zap*/capt*)
provides:
  - "recomendaDocumento(finalidadeUso, cnai) — mapa deterministico DOC-01 (4 finalidades x CNAI true/false, 8 combinacoes travadas por teste)"
  - "pendenciasDocumento(inputs) — checklist DOC-02 (area/conservacao/documentacao), reusa scoreConfianca sem duplicar logica"
  - "fichaRapidaTexto(data) — texto puro da Ficha rapida DOC-01, honesto (nunca inventa faixa/comparaveis), zero jargao"
affects: [11-02-seletor-finalidade-e-painel-confianca, 11-03-ficha-rapida-e-ptam-cnai]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Funcoes puras adicionadas dentro do MESMO bloco RADAR_PURE (nao criar segundo bloco) — harness de teste corta por indice de string entre RADAR_PURE_START/END"
    - "Comparacao de arrays/objetos retornados por node:vm sandbox usa JSON.stringify/length em vez de assert.deepEqual (identidade de prototipo cross-realm quebra deepStrictEqual mesmo com conteudo igual)"

key-files:
  created:
    - tests/doc.test.mjs
  modified:
    - radar-goiania.html (bloco RADAR_PURE, linhas ~1316-1370: 3 funcoes novas antes de RADAR_PURE_END)
    - tests/fixtures.mjs (chaves novas: recomendaDocumentoCasos, pendenciasDocumentoCasos, fichaRapidaCasos)

key-decisions:
  - "recomendaDocumento usa if/else literal (nao lookup object) para poder citar a finalidade especifica em cada porque, evitando texto generico repetido"
  - "pendenciasDocumento.conf reusa o RETORNO BRUTO de scoreConfianca sem transformacao — Wave 2 renderiza o card de nivel direto de .conf sem re-chamar scoreConfianca"
  - "fallback de finalidadeUso desconhecido/ausente compartilha o mesmo resultado de 'justificar' (default seguro, nunca lanca excecao)"

patterns-established:
  - "Toda funcao pura nova documentada com bloco de comentario /* ID-XX (Fase N, N-M): ... */ imediatamente antes da definicao, seguindo o padrao ja usado por SCORE-02/LEIT-01/ZAP-01"

requirements-completed: [DOC-01, DOC-02]

# Metrics
duration: ~25min
completed: 2026-07-07
---

# Phase 11 Plan 01: Documentos em 3 Níveis — Camada Pura Summary

**3 funções puras novas em RADAR_PURE (recomendaDocumento, pendenciasDocumento, fichaRapidaTexto) cobrindo a matriz completa de recomendação de documento (4 finalidades × CNAI), o checklist de pendências reusando scoreConfianca, e o texto honesto da Ficha rápida — zero mudança de UI, 17 testes novos, 64/64 pass.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (Task 1 RED, Task 2 GREEN)
- **Files modified:** 3 (radar-goiania.html, tests/doc.test.mjs criado, tests/fixtures.mjs)

## Accomplishments

- `recomendaDocumento(finalidadeUso, cnai)` implementada e testada nas 8 combinações de finalidade×CNAI — nenhuma combinação recomenda PTAM sem CNAI (matriz explicitamente verificada, T-11-01 mitigado)
- `pendenciasDocumento(inputs)` implementada — reusa `scoreConfianca` internamente (grep confirma chamada em `radar-goiania.html:1347`), nunca duplica a lógica de completude
- `fichaRapidaTexto(data)` implementada — honesta em faixa/comparáveis ausentes, zero jargão em todos os campos testados (T-11-02/T-11-03 mitigados)
- Suite completa `node --test "tests/*.test.mjs"`: **64/64 pass** (47 existentes + 17 novos), zero regressão

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — criar tests/doc.test.mjs + fixtures** - `f566dd8` (test)
2. **Task 2: GREEN — implementar as 3 funções dentro do bloco RADAR_PURE** - `c09f987` (feat)

_Nota: Task 2 inclui também o auto-fix de um bug de teste (Rule 1), commitado junto por já estar no mesmo ciclo RED→GREEN._

## Files Created/Modified

- `tests/doc.test.mjs` - harness node:test (loader RADAR_PURE via node:vm, mesmo padrão de scores/templates), 17 testes cobrindo a matriz de recomendação, distinção pendência-vs-nota, e honestidade da Ficha rápida
- `tests/fixtures.mjs` - fixtures novas: `recomendaDocumentoCasos` (8 combinações), `pendenciasDocumentoCasos` (2 casos completos), `fichaRapidaCasos` (3 objetos `data` cobrindo faixa null/preenchida, comparáveis ausentes/presentes/excedentes)
- `radar-goiania.html` - 3 funções novas dentro do bloco RADAR_PURE (linhas ~1316-1370), imediatamente antes de `RADAR_PURE_END`; nenhuma outra linha do arquivo alterada (zero UI change confirmado via `git diff --stat`)

## Matriz Completa — recomendaDocumento(finalidadeUso, cnai)

Para a Wave 2 (11-02) montar o Seletor de Finalidade sem ambiguidade:

| Finalidade | CNAI | doc | porque |
|---|---|---|---|
| `apresentar` | `false` | `ficha` | "Você quer apresentar ao cliente — a Ficha rápida é direta, cabe numa tela e vai bem no WhatsApp." |
| `apresentar` | `true` | `ficha` | (idêntico ao acima — CNAI irrelevante) |
| `captar` | `false` | `ficha` | "Você quer captar o proprietário — a Ficha rápida é direta, cabe numa tela e vai bem no WhatsApp." |
| `captar` | `true` | `ficha` | (idêntico ao acima — CNAI irrelevante) |
| `justificar` | `false` | `relatorio` | "Você quer justificar o preço com dados — o Relatório traz comparáveis e metodologia, sem o peso formal do PTAM." |
| `justificar` | `true` | `relatorio` | (idêntico ao acima — CNAI irrelevante) |
| `formal` | `false` | `relatorio` | "O PTAM pressupõe habilitação CNAI — preencha no perfil se possuir. Por enquanto, recomendamos o Relatório de avaliação." |
| `formal` | `true` | `ptam` | "Você pediu um documento técnico formal — com sua habilitação CNAI, o PTAM é o parecer técnico completo, com responsabilidade profissional." |
| *(desconhecido/ausente)* | — | `relatorio` | (mesmo texto de `justificar`, fallback seguro, nunca lança exceção) |

Executado ao vivo via `node --input-type=module` contra o bloco RADAR_PURE real — 8/8 combinações consistentes com o UI-SPEC.

## Assinaturas Exatas (contrato travado para Wave 2/3)

```js
function recomendaDocumento(finalidadeUso, cnai): {doc: string, porque: string}
function pendenciasDocumento(inputs): {conf: {nivel: string, porque: string[]}, itens: Array<{id: string, texto: string, resolvido: boolean, editavel: boolean}>}
function fichaRapidaTexto(data): {faixaTxt: string|null, resumo: string, leitura: string, comparaveis: string[], ressalva: string}
```

## Resultado da Suite de Testes

```
node --test "tests/*.test.mjs"
ℹ tests 64
ℹ pass 64
ℹ fail 0
```

47 testes existentes (busca/detectmode/scores/templates, Fases 8/9/10) + 17 testes novos (doc.test.mjs, Fase 11-01) — 100% pass, zero regressão.

## Decisions Made

- `recomendaDocumento` usa `if/else` explícito em vez de um objeto de lookup — cada finalidade tem seu texto de `porque` literal citando a própria finalidade, evitando o risco de reusar acidentalmente um texto genérico entre as 4 opções (testado explicitamente: os 4 textos são todos diferentes).
- `pendenciasDocumento.conf` é o retorno bruto e não-transformado de `scoreConfianca` — a Wave 2 pode renderizar `.conf.nivel`/`.conf.porque` diretamente sem re-chamar `scoreConfianca`, evitando 2 fontes de verdade sobre o mesmo cálculo.
- Fallback de `finalidadeUso` desconhecido ou ausente cai no mesmo resultado de `"justificar"` — nunca lança exceção, comportamento defensivo consistente com o resto do bloco RADAR_PURE (ex.: `data==null` em `zapResumo`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido bug de teste: `assert.deepEqual` falha em arrays cross-realm do sandbox `node:vm`**
- **Found during:** Task 2 (rodando `node --test "tests/doc.test.mjs"` após implementar as 3 funções — GREEN)
- **Issue:** 3 testes de `fichaRapidaTexto` usavam `assert.deepEqual(result.comparaveis, [...])` — o array `result.comparaveis` é criado dentro do contexto `vm.createContext()` (um realm JS diferente do realm principal do teste), então seu `Array.prototype` não é `===` ao `Array.prototype` do realm de teste. `assert.deepEqual`/`deepStrictEqual` do Node considera isso uma diferença estrutural e falha mesmo com conteúdo idêntico (`[] !== []` sob essa checagem). Isso NÃO é um bug na implementação (`fichaRapidaTexto` retornava `[]` corretamente, confirmado via `util.inspect` isolado) — é um bug de autoria do teste, que eu mesmo escrevi na Task 1.
- **Fix:** Troquei as 3 ocorrências de `assert.deepEqual` (arrays) por `assert.equal(JSON.stringify(a), JSON.stringify(b))` ou checagem de `.length`, seguindo o MESMO padrão já usado nos testes existentes de `oportunidadeItem`/`histAdd` (que também comparam objetos/arrays vindos do sandbox via `JSON.stringify`, nunca via `deepEqual` direto).
- **Files modified:** tests/doc.test.mjs
- **Verification:** `node --test "tests/*.test.mjs"` — 64/64 pass após o fix
- **Committed in:** c09f987 (parte do commit GREEN da Task 2, mesmo ciclo TDD)

---

**Total deviations:** 1 auto-fixed (1 bug de teste, Rule 1)
**Impact on plan:** Correção de teste, não de produto — nenhum impacto no contrato das 3 funções puras entregues. Nenhum scope creep.

## Issues Encountered

Nenhum além da deviation documentada acima.

## User Setup Required

None - nenhuma configuração de serviço externo necessária. Camada 100% pura (sem DOM, localStorage ou rede).

## Next Phase Readiness

- Wave 2 (11-02) pode consumir `recomendaDocumento`/`pendenciasDocumento` diretamente para renderizar o Seletor de Finalidade e o painel de Confiança + Pendências, sem reabrir esta plan — contrato de retorno travado e testado.
- Wave 3 (11-03) pode consumir `fichaRapidaTexto` para montar o template HTML da Ficha rápida — função pura já decide o "o quê" de cada bloco, Wave 3 só decide o "como" (HTML/esc()).
- Nenhum bloqueio. `radar_prof.cnai` ainda não existe no perfil (fora do escopo desta plan, conforme `<facts>`) — Wave 2 é responsável por adicionar o campo e calcular o booleano `cnai` antes de chamar `recomendaDocumento`.

---
*Phase: 11-documentos-em-3-niveis*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: tests/doc.test.mjs
- FOUND: tests/fixtures.mjs
- FOUND: radar-goiania.html
- FOUND: .planning/phases/11-documentos-em-3-niveis/11-01-SUMMARY.md
- FOUND commit: f566dd8 (test: RED)
- FOUND commit: c09f987 (feat: GREEN)
