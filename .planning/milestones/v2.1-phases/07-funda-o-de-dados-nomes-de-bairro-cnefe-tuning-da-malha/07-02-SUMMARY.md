---
phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha
plan: 02
subsystem: data
tags: [cnefe, ibge, data-distill, build-script, service-worker, precache]

# Dependency graph
requires:
  - phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha (Plano 01)
    provides: bairros-goiania.json regenerado (nomes reconciliados) que o bump radar-v6 tambem cobre
provides:
  - "gerar-logradouros.py — build-script build-time-only que baixa o CNEFE 52_GO.zip, filtra Goiania (COD_MUNICIPIO=5208707) e destila logradouros unicos com dicas de localidade/CEP"
  - "logradouros-goiania.json — 9.852 logradouros unicos de Goiania, 101,8KB gz, estrutura {nome, tipo, localidades[], ceps[]}, zero campo pessoal"
  - "sw.js bumpado radar-v5 -> radar-v6, cobrindo o bairros-goiania.json re-shipado (Plano 01) e o novo logradouros-goiania.json no precache LOCAL"
affects: [08-busca (consome logradouros-goiania.json para autocomplete/desambiguacao de logradouro)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Build-script Python build-time-only (download+filtro+distill), streaming em todas as etapas (download por chunks, zipfile+csv.DictReader linha-a-linha) para nunca materializar o CSV de 671MB em memoria"
    - "Assert anti-PII automatizado antes de gravar qualquer asset destilado de fonte externa com colunas pessoais potencialmente presentes"

key-files:
  created: [gerar-logradouros.py, logradouros-goiania.json]
  modified: [sw.js]

key-decisions:
  - "Normalizacao de sufixo alfanumerico (strip de espaco antes do sufixo final, ex. '228 A' -> '228A') aplicada no proprio build-script, na chave de agregacao — resultado observado: RUA 228/228A/228B/228C aparecem como entradas distintas e corretas, alinhadas ao formato do cadastro"
  - "CEP armazenado como prefixo de 5 digitos (sem o sufixo -XXX do CEP completo) — suficiente como dica de localizacao sem inflar o asset"
  - "Download do CNEFE feito em scratch temporario do OS (tempfile.mkdtemp), nunca na raiz do repo; limpo via shutil.rmtree no finally mesmo em caso de erro"

patterns-established:
  - "Build-script Python que baixa dataset externo grande (>100MB): download streaming em chunks + arquivo temporario em scratch + limpeza garantida (finally) + assert de sanidade (PII/tamanho) antes de gravar o artefato final no repo"

requirements-completed: [NOMES-02]

# Metrics
duration: 25min
completed: 2026-07-05
---

# Phase 07 Plan 02: Destilação CNEFE (logradouros-goiania.json) + bump sw.js Summary

**Build-script `gerar-logradouros.py` baixou o CNEFE 2022 (52_GO.zip, 120,8MB) do IBGE, filtrou os 777.018 endereços de Goiânia e destilou 9.852 logradouros únicos (101,8KB gz) com dicas de localidade/CEP; `sw.js` bumpado radar-v5 → radar-v6 com o novo asset no precache.**

## Performance

- **Duration:** ~25 min (incluindo download real de 120,8MB do IBGE e processamento de 3,96M linhas)
- **Started:** 2026-07-05T18:10:00Z (aprox.)
- **Completed:** 2026-07-05T18:35:30Z
- **Tasks:** 3/3 completos
- **Files modified:** 3 (2 criados, 1 modificado)

## Accomplishments
- `gerar-logradouros.py` criado: download resiliente (streaming, retry/backoff 429/502/503), filtro `COD_MUNICIPIO=5208707`, parse streaming do CSV de 671MB (nunca materializado em memória), assert anti-PII, limpeza garantida do temporário
- `logradouros-goiania.json` gerado com dados REAIS do IBGE (download ao vivo, sem placeholder): 9.852 logradouros únicos, 101,8KB gz — dentro do orçamento (<200KB) e próximo do alvo de pesquisa (~9,8k / ~117KB gz)
- `sw.js` bumpado radar-v5 → radar-v6, cobrindo tanto o `bairros-goiania.json` re-shipado no Plano 01 quanto o novo `logradouros-goiania.json`, ambos no array `LOCAL` de precache

## Task Commits

Each task was committed atomically (--no-verify, execução paralela em worktree):

1. **Task 1: Criar gerar-logradouros.py** - `b5f4612` (feat)
2. **Task 2: Gerar logradouros-goiania.json + smoke check** - `5cd03c1` (feat)
3. **Task 3: Bump do sw.js (radar-v5 → radar-v6)** - `fc26480` (feat)

_Nota: Task 3 foi committada antes da Task 2 concluir (download em background); ordem de execução foi 1 → 3 → 2 (Task 2 aguardou o download real completar), mas a ordem lógica das tarefas do plano foi respeitada em conteúdo._

## Files Created/Modified
- `gerar-logradouros.py` - Build-script: download CNEFE 52_GO.zip (streaming+retry), filtro Goiânia, distill de logradouros únicos com hints de localidade/CEP, assert anti-PII
- `logradouros-goiania.json` - 9.852 logradouros únicos de Goiânia, cada entrada `{nome, tipo, localidades[], ceps[]}` (até 5 localidades / 3 CEPs)
- `sw.js` - `CACHE` "radar-v5" → "radar-v6"; array `LOCAL` ganha `"./logradouros-goiania.json"`; comentário de topo atualizado

## Decisions Made
- Estrutura do JSON escolhida: lista ordenada (por `nome`) de objetos `{nome, tipo, localidades, ceps}` — determinístico (mesmo input produz mesmo output byte-a-byte), fácil de consumir na Fase 8 via `fetch()` + busca linear/indexada em memória (~9,8k entradas é trivial para JS no cliente)
- CNEFE vem em `latin-1` (mesmo padrão de `atualizar-caixa.py` para CSVs de fontes governamentais) — decodificado com `errors="replace"` para não abortar em byte isolado inválido
- Normalização usa o mesmo `norm()` do app (`radar-goiania.html:1020`, accent-strip NFD + upper + collapse espaço) mais o strip de espaço antes do sufixo alfanumérico final (regra específica documentada em DATA-NAMES.md 2.4) — validado ao vivo: "RUA 228 A" (CNEFE) tornou-se "RUA 228A" (mesmo formato do cadastro)

## Deviations from Plan

None - plan executado exatamente como escrito. O download real do CNEFE (120,8MB) funcionou na primeira tentativa, sem necessidade de retry/backoff durante a execução real (a lógica de retry existe no script mas não foi exercitada por falha real).

## Issues Encountered

Nenhum bloqueio. O download do IBGE (ftp.ibge.gov.br) respondeu de forma estável e completa (120,8MB em ritmo constante, sem timeouts/erros HTTP). O processamento de 3.960.937 linhas do CSV do estado inteiro completou sem linhas malformadas (0 puladas).

## User Setup Required

None - no external service configuration required. O asset é estático, versionado no repo, servido via precache do service worker (mesma estratégia do `bairros-goiania.json`).

## Next Phase Readiness

- `logradouros-goiania.json` pronto para consumo pela Fase 8 (busca campo-único): estrutura com hints de localidade/CEP permite desambiguação de logradouros ambíguos (ex. "RUA 228" existe em 4 localidades distintas de Goiânia — Coimbra, Leste Universitário, Setor Leste Universitário, Setor Leste Vila Nova — cada uma com CEP próprio)
- O matcher fino CNEFE×cadastro (normalização de tokenização entre `NOM_SEGLOGR` e `nmlogradou`) fica para a Fase 8, conforme delimitado no CONTEXT
- `sw.js` em `radar-v6` cobre ambos os assets (bairros regenerado + logradouros novo) — nenhum outro plano desta fase toca `sw.js` novamente
- Nenhum bloqueio para os próximos planos da Fase 7 (Plano 03 — tuning da malha mobile) ou para a Fase 8

---
*Phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: gerar-logradouros.py
- FOUND: logradouros-goiania.json
- FOUND: sw.js
- FOUND commit: b5f4612 (Task 1)
- FOUND commit: 5cd03c1 (Task 2)
- FOUND commit: fc26480 (Task 3)
