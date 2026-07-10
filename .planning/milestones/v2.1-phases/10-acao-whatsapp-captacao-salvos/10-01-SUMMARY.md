---
phase: 10-acao-whatsapp-captacao-salvos
plan: 01
subsystem: templates
tags: [templates, whatsapp, captacao, allowlist, pure-functions, tdd, node-test]

# Dependency graph
requires:
  - phase: 09-scores-leitura
    provides: scoreOportunidade/scoreConfianca/leituraPratica (bloco RADAR_PURE) — consumidos como
      campos já calculados dentro do objeto `data` passado aos templates novos
provides:
  - 5 funções de template WhatsApp deterministicas (zapResumo/zapProprietario/zapComprador/
    zapArgumento/zapRiscos) — ZAP-01
  - 4 funções de template Captação deterministicas (captAbordagem/captScript/captChecklist/
    captFollowup) — CAPT-01
  - oportunidadeItem(a, extras): helper puro de allowlist estrita p/ persistência sem PII — SALV-01
  - histAdd(lista, item, cap): helper puro FIFO (não muta o array) — SALV-01
  - tests/templates.test.mjs: harness node:vm cobrindo assinatura condicional, honestidade
    (faixa null), allowlist negativa (LGPD) e FIFO
affects: [10-02-salvamento-persistencia, 10-03-ui-acoes-whatsapp-captacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Templates de texto puro (não HTML): zap*/capt* retornam string pronta para clipboard,
      nunca passam por esc() — esc() só se aplica quando o texto entra em innerHTML (Wave 3)"
    - "Assinatura condicional via helper interno assinatura(perfil): concatenada ao final da
      string, nunca um placeholder — ausência de perfil.nome = string vazia"
    - "Allowlist positiva travada em oportunidadeItem: só os 12 campos documentados saem do
      helper, mesmo que o objeto cadastral bruto (a) tenha campos de terceiro"
    - "brlSimples()/faixaTxt()/enderecoSimples() são cópias mínimas e autônomas dentro do bloco
      RADAR_PURE — não importam brl()/addrDe() do resto do arquivo, para manter o bloco
      autossuficiente e testável isoladamente por node:vm"

key-files:
  created:
    - tests/templates.test.mjs
  modified:
    - radar-goiania.html (bloco RADAR_PURE, linhas ~1075-1240: 11 funções novas + 3 helpers internos)
    - tests/fixtures.mjs (zapComData, zapSemPerfil, zapSemFaixa, oportunidadeItemInput, histAddCases)

key-decisions:
  - "zapArgumento reusa scoreOp.porque[0] quando presente (mesma frase já formatada por
    scoreOportunidade na Fase 9), só monta frase própria se porque estiver vazio — evita duplicar
    lógica de cálculo de percentual"
  - "captScript/captChecklist/captFollowup NÃO recebem assinatura (script de ligação, checklist
    genérico e tarefa interna não são mensagens enviadas a terceiro) — só captAbordagem assina,
    por ser a única mensagem de WhatsApp do grupo de Captação"
  - "oportunidadeItem não inclui savedAt/visitedAt — fica a cargo da Wave 2 (10-02) decidir qual
    timestamp adicionar na hora de gravar em radar_oportunidades vs radar_historico"

patterns-established:
  - "Pattern: funções de template determinístico em pt-BR sempre seguem esqueleto fixo do
    UI-SPEC (Copywriting Contract), preenchidas com dados já calculados — zero geração livre de
    texto, zero jargão técnico (mediana/percentil/quartil nunca aparecem nos templates de saída)"
  - "Pattern: todo helper que cruza a fronteira dado-bruto→dado-persistido usa allowlist POSITIVA
    (nunca allowlist negativa/blocklist) — testado com assert negativo explícito no harness"

requirements-completed: [ZAP-01, CAPT-01, SALV-01]

# Metrics
duration: 25min
completed: 2026-07-07
---

# Phase 10 Plan 01: Camada de Templates WhatsApp/Captação + Allowlist Summary

**11 funções puras de template pt-BR (5 WhatsApp + 4 Captação) e 2 helpers de persistência (oportunidadeItem allowlist + histAdd FIFO) adicionadas ao bloco RADAR_PURE, com harness TDD cobrindo honestidade, assinatura condicional e proteção de PII.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-07T00:00:00Z (aprox.)
- **Completed:** 2026-07-07
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 3 (radar-goiania.html, tests/templates.test.mjs criado, tests/fixtures.mjs)

## Accomplishments
- 5 templates de WhatsApp (zapResumo/zapProprietario/zapComprador/zapArgumento/zapRiscos) determinísticos, tom de corretor profissional, honestos (nunca inventam faixa quando `data.faixa===null`)
- 4 templates de Captação (captAbordagem/captScript/captChecklist/captFollowup) com esqueletos travados do UI-SPEC
- `oportunidadeItem(a, extras)`: allowlist estrita testada com assert negativo (nunca `dtnascimen`/nome de terceiro no JSON persistido)
- `histAdd(lista, item, cap)`: FIFO puro, não muta o array de entrada, cap 30 respeitado (29+1=30 sem remoção; 30+1=30 com evicção real do item mais antigo)
- Suite completa: 47/47 testes passam (34 pré-existentes + 13 novos), zero regressão

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: RED — criar tests/templates.test.mjs + fixtures (testes falhando)** - `1c9b626` (test)
2. **Task 2: GREEN — implementar as 11 funções dentro do bloco RADAR_PURE** - `59f6349` (feat)

_Sem etapa REFACTOR — implementação já ficou limpa na primeira passagem GREEN, sem duplicação a resolver._

## Files Created/Modified
- `tests/templates.test.mjs` - harness node:vm (mesmo padrão de `tests/scores.test.mjs`) testando as 11 funções novas: assinatura condicional, honestidade (faixa null), allowlist negativa/positiva, FIFO puro
- `tests/fixtures.mjs` - acrescenta `zapComData`/`zapSemPerfil`/`zapSemFaixa`/`oportunidadeItemInput`/`histAddCases` ao objeto `FIXTURES` existente (sem substituir nada)
- `radar-goiania.html` - bloco `RADAR_PURE` ampliado com 11 funções + 3 helpers internos (`assinatura`, `brlSimples`/`faixaTxt`, `enderecoSimples`); zero mudança fora dos marcadores `RADAR_PURE_START`/`RADAR_PURE_END`; zero mudança de DOM/UI (diff = apenas 166 inserções, 0 remoções)

## Shape final do objeto `data` (contrato para a Wave 3)

```js
{
  endereco: string,             // ex.: "Rua Portugal, 582"
  bairro: string,                // ex.: "Setor Bueno" (já limpo via clean(), sem esc())
  quadra: string, lote: string,  // ex.: "45", "12" (ou "—")
  tipoImovel: string,            // ex.: "Apartamento" / "Imóvel"
  faixa: {lo:number, hi:number} | null,   // null = sem base, NUNCA inventar
  scoreOp: {score:number, rotulo:string, porque:string[]} | null,
  scoreConf: {nivel:string, porque:string[]} | null,
  leitura: string,               // retorno de leituraPratica(), já pronto
  perfil: {nome:string, creci:string, contato:string} | null   // null se ausente/sem nome
}
```

**Assinaturas exatas das 11 funções (contrato duro para Wave 2/3):**

```js
function zapResumo(data): string
function zapProprietario(data): string
function zapComprador(data): string
function zapArgumento(data): string
function zapRiscos(data): string
function captAbordagem(data): string
function captScript(data): string
function captChecklist(data): string
function captFollowup(data): string
function oportunidadeItem(a, extras): object   // a=objeto cadastral bruto; extras={faixaLo,faixaHi,scoreOportunidade,scoreConfianca}
function histAdd(lista, item, cap): array       // FIFO puro, não muta lista
```

`oportunidadeItem` retorna: `{insc, endereco, bairro, quadra, lote, areaTerr, areaEdif, vlvenal, faixaLo, faixaHi, scoreOportunidade, scoreConfianca}` — a Wave 2 adiciona `savedAt` (Oportunidades) ou `visitedAt` (Histórico) na hora de gravar.

## Resultado da suite completa de testes

```
node --test "tests/*.test.mjs"
ℹ tests 47
ℹ suites 0
ℹ pass 47
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

34 testes pré-existentes (busca/scores/detectmode) + 13 testes novos (templates.test.mjs) — 100% verde, zero regressão.

## Decisions Made
- `zapArgumento` reusa `scoreOp.porque[0]` (já formatado pela Fase 9) quando presente, evitando duplicar cálculo de percentual; monta frase própria só quando `porque` está vazio.
- Apenas `captAbordagem` recebe assinatura entre as 4 funções de Captação — script/checklist/follow-up não são mensagens enviadas a terceiro (script de ligação, checklist documental genérico, tarefa interna).
- `oportunidadeItem` não decide `savedAt`/`visitedAt` — fica explicitamente delegado à Wave 2 (10-02), conforme o contrato do plano.

## Deviations from Plan

None - plan executado exatamente como escrito. O fix do off-by-one no comportamento de `histAdd` (29+1=30 NÃO excede o cap, apenas 30+1 excede) já vinha corrigido no próprio `<behavior>` do plano (nota do plan-check) — nenhuma correção adicional foi necessária durante a execução, a implementação `next.length>cap?next.slice(next.length-cap):next` já satisfaz ambos os casos corretamente na primeira tentativa.

## Issues Encountered
- `node --check radar-goiania.html` (comando de verificação sugerido no plano) falha com `ERR_UNKNOWN_FILE_EXTENSION` porque o arquivo é HTML (não `.js` puro) — Node não reconhece a extensão para checagem de sintaxe direta. A verificação real de sintaxe/semântica do bloco RADAR_PURE ocorre via `node --test "tests/*.test.mjs"` (que extrai o bloco por `node:vm.Script`, o que já falharia com `SyntaxError` se houvesse erro de sintaxe) — suite passou 47/47, confirmando sintaxe válida. Nenhuma mudança de código foi necessária; é uma limitação do comando de verificação em ambiente Windows/Node 24, não um defeito do plano ou da implementação.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- Wave 2 (10-02, persistência/salvamento) pode chamar `oportunidadeItem`/`histAdd` diretamente, sem reabrir esta plan.
- Wave 3 (10-03, UI de ações) pode chamar as 9 funções de template passando o objeto `data` no shape documentado acima, sem ambiguidade.
- Nenhum bloqueio identificado.

---
*Phase: 10-acao-whatsapp-captacao-salvos*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: tests/templates.test.mjs
- FOUND: tests/fixtures.mjs
- FOUND: radar-goiania.html
- FOUND: .planning/phases/10-acao-whatsapp-captacao-salvos/10-01-SUMMARY.md
- FOUND: 1c9b626 (Task 1 - RED commit)
- FOUND: 59f6349 (Task 2 - GREEN commit)
