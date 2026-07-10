---
phase: 08-busca-unica-inteligente
plan: 03
subsystem: matching
tags: [detect-mode, nlp-lite, regex, pure-function, localStorage]

# Dependency graph
requires:
  - phase: 08-02
    provides: "matchScoreQ/matchScoreL/matchScoreRua no bloco RADAR_PURE — base de matching de qualidade reusada pelos call-sites de buscar() (fora do escopo desta plan, mas convivendo no mesmo bloco)"
provides:
  - "detectMode(textoBruto, combo) — funcao pura no bloco RADAR_PURE que decide intencao de busca (insc/ql/addr/bd/ambiguo) seguindo a ordem contratual do SEARCH.md secao 2"
  - "extractSetor(raw, combo) — funcao pura que extrai setor embutido no INICIO da frase (prefixos de 1-4 palavras, ancorado, prefere match mais especifico) e devolve {code, disp, rest}"
  - "TIPOVIA_WORDS — lista de palavras de tipo de via compartilhada; TIPOVIA (ancorada) e TIPOVIA_DETECT (nao-ancorada, flag i) derivadas da MESMA lista, sem duplicacao"
  - "getLastBairroCode() — le radar_lastbairro do localStorage com try/catch silencioso, nunca lanca"
  - "pickBairro() persiste radar_lastbairro (so o code do setor, sem PII) a cada selecao com sucesso"
affects: ["08-04-caixa-unica"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Funcoes puras que consomem estado externo (COMBO) recebem-no como PARAMETRO explicito, nunca leem a global implicita — mesmo padrao de matchScoreQ/L/Rua (08-02), agora estendido a extractSetor/detectMode, garantindo testabilidade via node:vm sem depender do boot do app"
    - "Uma unica fonte de verdade para listas de palavras usadas em regex (TIPOVIA_WORDS): duas regex derivadas (ancorada/nao-ancorada) em vez de duplicar a enumeracao"
    - "3o uso de localStorage no app segue a convencao radar_prof/radar_coach: chave prefixada radar_, try/catch silencioso, nunca lanca excecao"

key-files:
  created: [tests/detectmode.test.mjs]
  modified: [radar-goiania.html, tests/busca.test.mjs]

key-decisions:
  - "Setor extraido mas frase vazia apos remocao (ex.: 'jardim goias' sozinho) tratado como regra 0b explicita (mode:ql, bairroOnly:true, confidence:media) — nao estava nos 9 casos obrigatorios do <behavior> da Task 2, mas e o comportamento do ramo 6 do heuristico de referencia (SEARCH.md secao 2) quando a frase inteira e o nome do setor; sem essa regra, cairia incorretamente em 'predio' com o nome do bairro como se fosse nome de edificio"
  - "detectMode implementada DENTRO do bloco RADAR_PURE (nao fora, como o plano permitia como alternativa) — mantem o harness de teste uniforme (um unico loader por slice de marcadores) e reforca visualmente que a funcao e pura, no mesmo bloco de matchScoreQ/L/Rua"

requirements-completed: [BUSCA-02, BUSCA-04, BUSCA-05]

# Metrics
duration: 35min
completed: 2026-07-07
---

# Phase 8 Plan 03: Motor de Detecção de Intenção (detectMode) Summary

**detectMode(textoBruto, combo) puro no bloco RADAR_PURE decide insc/quadra-lote/endereço/prédio/ambíguo seguindo a ordem contratual do SEARCH.md, com extração de setor embutido na frase (extractSetor) rodando antes de tudo e último setor lembrado persistido em localStorage — zero mudança de UI/comportamento visível nesta wave.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-07-07T05:10:00Z
- **Completed:** 2026-07-07T05:45:00Z
- **Tasks:** 2
- **Files modified:** 3 (radar-goiania.html, tests/busca.test.mjs, tests/detectmode.test.mjs)

## Accomplishments

- `TIPOVIA` refatorada para derivar de `TIPOVIA_WORDS` (lista de palavras compartilhada); `TIPOVIA_DETECT` (variante não-ancorada, flag `i`) criada a partir da MESMA lista — zero duplicação, `ruaCore`/`matchScoreRua` (08-01/08-02) sem regressão
- `extractSetor(raw, combo)` pura: testa prefixos de 1 a 4 palavras do início da frase contra `combo[].search`, ancorado no início (mais estrito que `resolveBairro()` genérico), prefere o candidato mais específico (search mais longo) em caso de múltiplos hits
- `getLastBairroCode()` lê `radar_lastbairro` do localStorage com try/catch silencioso, nunca lança exceção
- `pickBairro()` persiste `radar_lastbairro` (só o `code` numérico, sem PII) a cada seleção com sucesso — 3º uso de localStorage no app, mesma convenção de `radar_prof`/`radar_coach`
- `detectMode(textoBruto, combo)` pura, dentro do bloco `RADAR_PURE`: roda `extractSetor` ANTES de tudo, depois decide inscrição (10/14 díg) → quadra+lote → endereço (tipo de via não-ancorado) → prédio (prefixo textual) → ambíguo (número curto 1-4 díg, confidence baixa, nunca decide modo) → setor isolado ou prédio com confidence média
- `combo` sempre injetado como parâmetro explícito (em `extractSetor` e `detectMode`) — nenhuma das duas funções lê uma global implícita, testáveis isoladamente via `node:vm` sem depender do boot do app
- `tests/detectmode.test.mjs` criado com 24 asserções: `TIPOVIA_DETECT`/`TIPOVIA` (regressão zero), `extractSetor` (nome simples, composto, ausente, caso de risco de prefixo comum), `getLastBairroCode`, e os 9 casos de `detectMode` (7 obrigatórios do roadmap + 2 adicionais)

## Task Commits

Each task was committed atomically:

1. **Task 1: TIPOVIA_DETECT derivado + extração de setor-na-frase + persistência localStorage** - `a2ddd63` (feat)
2. **Task 2: detectMode(textoBruto) — ordem de regras completa + testes dos 7 casos obrigatórios** - `633442c` (feat)

## Files Created/Modified

- `radar-goiania.html` — bloco `RADAR_PURE`: `TIPOVIA_WORDS`/`TIPOVIA`/`TIPOVIA_DETECT` (fonte única derivada), `extractSetor`, `getLastBairroCode`, `detectMode`; `pickBairro()` com a linha de persistência `radar_lastbairro`
- `tests/detectmode.test.mjs` (novo) — suite completa cobrindo `TIPOVIA_DETECT`/`extractSetor`/`getLastBairroCode`/`detectMode`, com `COMBO_FIXTURE` sintético (7 setores reais de Goiânia, incluindo nome composto "Jardim Goiás" e prefixo comum "Setor")
- `tests/busca.test.mjs` — `__exports` do harness estendido para incluir `TIPOVIA`, `TIPOVIA_DETECT`, `extractSetor`, `getLastBairroCode`, `detectMode` (nenhum teste novo adicionado aqui — só a lista de exports, para não duplicar a suite entre os dois arquivos)

## Contrato de retorno de `detectMode()` (para 08-04 consumir)

Todos os resultados têm `{mode, confidence, label, ...}`. Campos por modo:

| `mode` | Campos extras | `confidence` possível |
|---|---|---|
| `"insc"` | `field` (`"ci"`\|`"nrinscr"`), `value` (dígitos) | `"alta"` |
| `"ql"` | `quadra`, `lote` (pode ser `""`) — ou `bairroOnly:true` sem quadra/lote | `"alta"` (com quadra) / `"media"` (bairroOnly) |
| `"addr"` | `rua` (frase completa), `numero` (dígitos finais ou `""`) | `"alta"` |
| `"bd"` | `predio` (nome extraído) | `"alta"` (prefixo ED/RES/COND) / `"media"` (sem sinal) |
| `null` | `raw`, `digits` | `"baixa"` (ambíguo — gancho da desambiguação por chips, 08-04) |

Quando `extractSetor` encontra um setor no início da frase, o resultado final SEMPRE ganha `{bairroCode, bairroDisp}` (independente do `mode` decidido sobre o restante da frase) — 08-04 usa esses dois campos para exibir o chip "Setor · Nome" e, se decidir aplicar, chamar `pickBairro(bairroCode)`.

## Os 9 Casos de Teste (Task 2) e Resultados

| # | Entrada | `mode` | Campos-chave | `confidence` |
|---|---|---|---|---|
| 1 | `"30201503461234"` (14 díg) | `insc` | `field:"nrinscr"` | `alta` |
| 2 | `"3020150346"` (10 díg) | `insc` | `field:"ci"` | `alta` |
| 3 | `"135"` | `null` | `digits:"135"` | `baixa` (nunca decide) |
| 4 | `"Rua 135"` | `addr` | `rua:"Rua 135"`, `numero:"135"` | `alta` |
| 5 | `"Q135"` | `ql` | `quadra:"135"`, `lote:""` | `alta` |
| 6 | `"quadra 128 lote 5"` | `ql` | `quadra:"128"`, `lote:"5"` | `alta` |
| 7 | `"marista quadra 128 lote 5"` | `ql` | `bairroCode:"101"`, `quadra:"128"`, `lote:"5"` | `alta` |
| 8 | `"sumer park"` | `bd` | `predio:"sumer park"` | `media` |
| 9 | `"ed. central park"` | `bd` | `predio:"CENTRAL PARK"` | `alta` |

Todos os 9 casos verificados por `node --test` (suite completa: 24/24 passando, 0 falhas), incluindo o caso 7 confirmando que `extractSetor` roda e remove "marista" do início ANTES das regras de modo decidirem sobre o resto ("quadra 128 lote 5").

## Confirmação: `TIPOVIA`/`ruaCore` sem regressão

`node --test "tests/*.test.mjs"` — 7 testes de `busca.test.mjs` (08-01/08-02) + 17 testes de `detectmode.test.mjs` (08-03), todos passando:

```
✔ norm / ruaCore / matchApto / matchScoreQ / matchScoreL / matchScoreRua / insc — deteccao de campo (7)
✔ TIPOVIA_DETECT / TIPOVIA (regressao) / extractSetor (5) / getLastBairroCode / detectMode (9)
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

`ruaCore("Rua 135")==="135"`, `ruaCore("R  MARAJO")==="MARAJO"`, `ruaCore("Avenida T-4")==="T-4"` — idênticos ao comportamento pré-refatoração; `TIPOVIA.test("quadra 128 rua portugal")===false` confirma que a variante ancorada continua rejeitando tipo de via fora do início da frase.

## Decisions Made

- **Regra 0b adicionada (setor isolado sem resto):** o `<facts>` do plano cobre explicitamente "marista quadra 128 lote 5" (setor + resto não-vazio), mas o heurístico de referência completo (SEARCH.md seção 2, ramo 6) também define o caso "texto puro sem número nem tipo de via" tentando setor ANTES de assumir prédio. Ao implementar `extractSetor` rodando sobre a frase inteira, o caso "jardim goias" sozinho (sem nada depois) ficaria com `rest=""`, que cairia incorretamente na regra 6 (prédio) tratando o nome do bairro como nome de edifício. Adicionei a regra 0b explícita (`mode:"ql", bairroOnly:true, confidence:"media"`) para fechar esse gap, replicando o comportamento do ramo 6 do heurístico de referência quando a frase inteira é consumida pelo setor. Verificado manualmente (script ad-hoc via `node -e`, fora da suite formal — comportamento correto confirmado, não adicionado como caso formal na suite porque não estava nos 9 obrigatórios da Task 2, mas documentado aqui para rastreabilidade).
- **`detectMode` implementada dentro do bloco `RADAR_PURE`** (o plano permitia deixá-la fora, desde que pura) — optei por mantê-la dentro para preservar um único par de marcadores/loader de teste e deixar explícito, pela própria localização no arquivo, que a função não toca DOM.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Flag `i` ausente em `TIPOVIA_DETECT`**
- **Found during:** Task 1
- **Issue:** O `<facts>` do plano mostra `TIPOVIA_DETECT` sem a flag `i` explícita no exemplo de código, mas `detectMode` (Task 2) precisa testar `TIPOVIA_DETECT` contra `raw` (texto NÃO normalizado, ex. `"Rua Portugal"` com R maiúsculo e resto minúsculo) — sem a flag `i`, a regex (que usa letras maiúsculas na lista `TIPOVIA_WORDS`) não casaria variações de caixa do usuário.
- **Fix:** Adicionada a flag `i` na construção de `TIPOVIA_DETECT` (`new RegExp(..., "i")`), com comentário explicando a diferença de contexto de uso em relação a `TIPOVIA` (que roda sobre `norm(s)`, já uppercase).
- **Files modified:** radar-goiania.html
- **Verification:** teste "TIPOVIA_DETECT — casa tipo de via em qualquer posicao" cobre `"Rua Portugal 582"` (R maiúsculo, resto minúsculo) e passa
- **Committed in:** a2ddd63 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Regra 0b (setor isolado sem resto) ausente do `<behavior>` da Task 2**
- **Found during:** Task 2
- **Issue:** Ver "Decisions Made" acima — sem essa regra, `detectMode("jardim goias", combo)` cairia em `mode:"bd"` (prédio) tratando o nome do setor como nome de edifício, contradizendo o ramo 6 do heurístico de referência completo do SEARCH.md (que tenta setor antes de assumir prédio).
- **Fix:** Adicionada a regra 0b explícita entre a extração de setor e a regra 1 (inscrição): se `setor.code` existe e `raw` (resto após remover o setor) é vazio, retorna `{mode:"ql", bairroOnly:true, confidence:"media"}`.
- **Files modified:** radar-goiania.html
- **Verification:** verificado manualmente via `node -e` (script ad-hoc, não promovido a teste formal da suite por não estar nos 9 casos obrigatórios); comportamento confirmado correto
- **Committed in:** 633442c (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical — nenhuma mudança de escopo, ambas fecham gaps entre o `<facts>` resumido do plano e o heurístico de referência completo do SEARCH.md que o próprio plano cita como fonte)
**Impact on plan:** Nenhum. Ambos os ajustes são consequência direta de seguir o heurístico de referência completo (SEARCH.md seção 2) com mais fidelidade do que o resumo abreviado do `<facts>` do plano — sem eles, `detectMode` teria dois casos de uso real (variação de caixa do usuário, setor sozinho) que não corresponderiam ao comportamento contratual documentado na pesquisa.

## Issues Encountered

None além dos desvios documentados acima.

## Lembrete: calibração MÉDIA confidence — validar contra amostra real

A ordem de regras e os limiares de `detectMode` foram implementados e testados EXATAMENTE conforme o contrato do SEARCH.md seção 2, mas a calibração das regex (especialmente a regra 6 — prédio com confidence média, e a regra 5 — número curto ambíguo) foi validada apenas contra fixtures SINTÉTICAS nesta plan (nomes de rua/prédio inventados, não uma amostra real de Goiânia). O próprio SEARCH.md documenta essa lacuna explicitamente ("Confiança do desenho: MÉDIA-ALTA... validar as regex contra uma amostra real de nomes de rua/prédio de Goiânia antes de finalizar"). **Ação pendente para 08-04 ou verificação final da fase:** rodar `detectMode` contra uma amostra real de `COMBO` (setores reais já carregados em runtime) e/ou o dataset CNEFE de logradouros, observando falsos positivos/negativos nas regras 4 (prédio) e 6 (prédio com confidence média) antes de expor a UI ao usuário final.

## User Setup Required

None — mudança 100% client-side, sem infraestrutura nova, sem UI exposta nesta plan.

## Next Phase Readiness

- `08-04` (UI da caixa única) pode consumir `detectMode(texto, COMBO)` diretamente: já retorna `{mode, confidence, label, ...campos parseados, bairroCode?, bairroDisp?}` prontos para popular o chip de confirmação e decidir buscar direto (alta) vs. mostrar chips de desambiguação (baixa) vs. selo de incerteza (média)
- `getLastBairroCode()` está pronta para a UI ler no boot/nova busca sem setor detectado na frase e pré-preencher `#bairro`/mostrar o chip "Setor · Nome (último)"
- Debounce (~150ms) é responsabilidade do caller (08-04) — `detectMode` em si é síncrona e não implementa debounce
- Nenhum bloqueio identificado; único item de atenção é a validação com amostra real documentada acima (não bloqueia 08-04, mas deve ser feita antes do release final da fase)

---
*Phase: 08-busca-unica-inteligente*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: radar-goiania.html
- FOUND: tests/detectmode.test.mjs
- FOUND: tests/busca.test.mjs
- FOUND: .planning/phases/08-busca-unica-inteligente/08-03-SUMMARY.md
- FOUND commit: a2ddd63
- FOUND commit: 633442c
