---
phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha
plan: 01
subsystem: data
tags: [gis, data-reconciliation, arcgis, spatial-join, build-script, geojson]

# Dependency graph
requires: []
provides:
  - "bairros-goiania.json com nomes de bairro reconciliados contra a fonte autoritativa (layer 3 nmbairro/cdbairro), geometria byte-idêntica ao baseline anterior"
  - "gerar-bairros.py Step 4.5: spatial join POST + reconciliação assistida por nome, resumível/checkpointed"
  - "check-bairros-geojson.py --assert-geometry-identical: prova automatizada de que o fix de nomes é display-data-only"
  - "bairros-goiania.report.md com seção de reconciliação (diff completo + multi-candidatos) para revisão por amostra"
affects: [08-busca-campo-unico, 09-choropleth-territorio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spatial join POST (esriSpatialRelIntersects) contra ArcGIS — GET com geometria de polígono é quirk conhecido (404/414); nunca usar string-match como fonte de nome, só como tie-break de desambiguação"
    - "Reconciliação resumível: checkpoint incremental em JSON a cada N itens + resume automático pulando ids já resolvidos"
    - "Assert de geometria estrutural (json.dumps sort_keys) por id entre baseline git e artefato novo, como defesa contra corrupção de join"

key-files:
  created:
    - "bairros-goiania.recon.json (gitignored — cache intermediário de build, não versionado)"
  modified:
    - "gerar-bairros.py"
    - "check-bairros-geojson.py"
    - "bairros-goiania.json"
    - "bairros-goiania.report.md"
    - ".gitignore"

key-decisions:
  - "Fonte autoritativa de nome = layer 3 nmbairro/cdbairro (709 setores, zero brancos); nm_bai cru da layer 2 tem mojibake e nunca é fonte, só contexto de tie-break"
  - "Tie-break multi-candidato é assistido por nome (substring normalizada), não maioria pura de contagem — contra-exemplo Ofugi provou que maioria erra (VI SANTA HELENA por engano)"
  - "Glebas sem parcela intersectada (0 candidatos espaciais) recebem rótulo genérico explícito \"Gleba não denominada\" — nenhum nome fiscal é fabricado"
  - "bairros-goiania.recon.json é cache de build intermediário (não um artefato do produto) — adicionado ao .gitignore, não versionado"

requirements-completed: [NOMES-01, NOMES-02, NOMES-03]

# Metrics
duration: ~90min (execução) + tempo de espera de rede acumulado (~40min, endpoint instável sob carga sustentada)
completed: 2026-07-05
---

# Phase 07 Plan 01: Reconciliação de Nomes de Bairro Summary

**Nomes de bairro reconciliados via spatial join POST contra a layer 3 (ArcGIS), com tie-break assistido por nome, mantendo geometria e contagem de 1206 polígonos byte-idênticas ao dataset anterior.**

## Performance

- **Duration:** ~90 min de trabalho ativo (mais tempo de espera de rede — endpoint ArcGIS ficou instável sob a carga sustentada de ~3400 chamadas POST, exigindo resume/checkpoint em múltiplas execuções)
- **Tasks:** 3/3 completas
- **Files modified:** 5 (gerar-bairros.py, check-bairros-geojson.py, bairros-goiania.json, bairros-goiania.report.md, .gitignore)

## Accomplishments

- `gerar-bairros.py` ganhou o Step 4.5: `http_post`/`arcgis_post` (POST form-encoded, necessário porque GET com geometria de polígono dá 404/414 intermitente nesse servidor), `norm()` (accent-strip + uppercase p/ tie-break), `reconcile_name()` (algoritmo autoritativo: spatial join distinct-value → 0 candidatos = sem-parcela, 1 = único, 2+ = tie-break por nome ou maioria de contagem) e fallback de envelope (bbox) para polígonos muito grandes cujo payload de rings completo excede um limite do ArcGIS Web Adaptor (achado ao vivo: 2301 vértices / ~97KB de body → erro HTML "Could not access any GIS Server machines"; o envelope, com payload muito menor, sempre funciona e só pode adicionar candidatos, nunca remover o correto)
- 1205 dos 1206 polígonos (1205 chaves `id` — há 1 colisão de `id` documentada entre 2 OBJECTIDs distintos, não uma falha) foram reconciliados: **391 recuperados-de-branco**, **726 nomes-mudados**, **86 não-resolvidos** (glebas/terra vaga sem parcela, rotuladas `"Gleba não denominada"`)
- `bairros-goiania.json` regenerado via `--apply-names`: 1206 features, geometria/contagem/ordem **byte-idênticas** ao commit anterior (provado por `--assert-geometry-identical`), só `properties.nm_bai` mudou (1204 dos 1206 nomes divergiam do valor autoritativo)
- `bairros-goiania.report.md` ganhou a seção "Reconciliação de nomes (NOMES-01/03)": contadores, quebra por motivo (`unico`/`nome`/`maioria`/`sem-parcela`/`erro-endpoint`), tabela de diff completa antes→depois, e subseção "Multi-candidatos (conferência)" com os 780 casos resolvidos por `nome` ou `maioria` (bordas administrativas — revisão humana por amostra é acompanhamento não-bloqueante, Open Decision #1)
- `check-bairros-geojson.py` ganhou `--assert-geometry-identical <baseline> <path>`: compara contagem de features, conjunto de `properties.id`, e geometria estrutural (`json.dumps(geometry, sort_keys=True)`) por id — aborta com `sys.exit` em qualquer divergência; testado positivo (passa, 0 mudanças) e negativo (detecta nome mudado sem falhar; detecta geometria divergida e aborta)
- Caso de teste Ofugi (`id=000400000103`) confirmado: resolvido como `VI OFUGI` via tie-break de nome, não `VI SANTA HELENA` (que venceria por maioria de contagem — 59 vs 7 parcelas)

## Task Commits

Each task was committed atomically:

1. **Task 1: Adicionar spatial join POST + reconciliação de nomes em gerar-bairros.py (Step 4.5)** - `a282f09` (feat)
2. **Task 2: Injetar nomes reconciliados no json committed + emitir diff report** - `13a9045` (feat)
3. **Task 3: Assert de geometria byte-idêntica em check-bairros-geojson.py** - `18ed1ac` (feat)

_Nota: entre os commits das Tasks 1 e 2, o usuário (em sessão própria) commitou `f42744d` (`fix(build): make gerar-bairros.py --verify robust to 502-under-load`) — resiliência de checkpoint/resume/continue-on-error no mesmo Step 4.5, necessária porque o endpoint ArcGIS se mostrou instável sob a carga sustentada de ~3400 chamadas. Task 2 e 3 foram executadas e commitadas sobre essa base já mais resiliente._

## Files Created/Modified

- `gerar-bairros.py` - Step 4.5 (spatial join POST + reconciliação), `--apply-names` (injeção de nomes no json committed), `write_report()` estendido com seção de reconciliação
- `check-bairros-geojson.py` - `--assert-geometry-identical` (prova de geometria byte-idêntica)
- `bairros-goiania.json` - 1206 features, nomes reconciliados, geometria/ordem inalteradas
- `bairros-goiania.report.md` - seção de reconciliação com diff completo + multi-candidatos
- `.gitignore` - `bairros-goiania.recon.json` (cache intermediário de build, checkpoint da reconciliação, não versionado)

## Fluxo de verificação (para reprodução)

```bash
# 1. Capturar o baseline ANTES do commit dos novos nomes
git show HEAD:bairros-goiania.json > baseline.json

# 2. Rodar a reconciliação (produz bairros-goiania.recon.json)
python gerar-bairros.py --verify

# 3. Aplicar os nomes reconciliados no json committed (geometria preservada)
python gerar-bairros.py --apply-names

# 4. Provar que só o nome mudou
python check-bairros-geojson.py --assert-geometry-identical baseline.json bairros-goiania.json
# -> ASSERT OK: geometria byte-identica, N nome(s) mudaram
```

Resultado real desta execução: **ASSERT OK: geometria byte-identica, 1204 nome(s) mudaram (1206 features, ids identicos, geometria estruturalmente identica por id — só properties.nm_bai foi tocado)**.

## Contadores de reconciliação (final)

| Métrica | Valor |
|---|---|
| Total reconciliado | 1205 (de 1206 features — 1 colisão de `id` documentada) |
| Recuperados-de-branco | 391 |
| Nomes-mudados | 726 |
| Não-resolvidos (glebas, rotuladas "Gleba não denominada") | 86 |
| Motivo `unico` | 339 |
| Motivo `nome` (tie-break assistido) | 396 |
| Motivo `maioria` (contagem de parcelas) | 384 |
| Motivo `sem-parcela` | 86 |
| Multi-candidatos totais (nome + maioria) | 780 |

## Decisions Made

- **Fonte autoritativa = layer 3** (`nmbairro`/`cdbairro`), nunca o `nm_bai` cru da layer 2 (mojibake + falha de match por string em ~99,5% dos casos, medido na pesquisa DATA-NAMES.md) — string-match usado SÓ como tie-break de desambiguação entre candidatos espaciais, nunca como fonte.
- **Envelope (bbox) como fallback de payload** para polígonos com muitos vértices: achado ao vivo nesta execução (não estava na pesquisa original) — poligonos muito grandes (observado: 2301 vértices, corpo POST ~97KB) fazem o ArcGIS Web Adaptor devolver HTTP 200 com página HTML de erro em vez de JSON, de forma determinística para aquele polígono específico. O envelope do mesmo polígono, por ter payload muito menor, sempre funciona; usá-lo só pode adicionar candidatos falso-positivos (nunca remover o correto), o que o próprio algoritmo de desambiguação já trata.
- **`.recon.json` não é artefato do produto** — é o checkpoint/cache intermediário do build (permite resume sem reprocessar do zero), adicionado ao `.gitignore` em vez de committed, análogo a `bairros-goiania.wgs84-raw.json` (esse sim committed, pois é intermediário do pipeline de geometria, não do pipeline de nomes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Retry de camada JSON ausente em `arcgis()`/`arcgis_post()`**
- **Found during:** Task 1 (execução real do spatial join contra o endpoint ao vivo)
- **Issue:** O endpoint ArcGIS por vezes devolve HTTP 200 com corpo truncado/inválido sob carga (`JSONDecodeError`), variante do "502-under-load" já documentado que não é capturada pelo backoff HTTP existente (que só reage a `HTTPError`).
- **Fix:** Adicionado retry na camada de decodificação JSON em `arcgis()`/`arcgis_post()` (backoff exponencial, reenvia a chamada completa).
- **Files modified:** gerar-bairros.py
- **Verification:** Reconciliação completa (1205/1206) rodou até o fim sem abortar por esse erro.
- **Committed in:** a282f09 (Task 1 commit)

**2. [Rule 3 - Blocking] Fallback de envelope para polígonos com payload POST excessivo**
- **Found during:** Task 1 (smoke test contra o polígono irregular Campos Dourados levou à descoberta de um polígono ainda maior, id=000400000755, 2301 vértices)
- **Issue:** O POST com a geometria completa (rings) de polígonos muito grandes (~97KB de body) fazia o ArcGIS Web Adaptor devolver uma página de erro HTML ("Could not access any GIS Server machines") em vez de JSON, de forma determinística — não resolvido por retry simples.
- **Fix:** Adicionado `_query_layer3()` com fallback automático para o envelope (bbox) do polígono quando o POST com rings completos falha após os retries — o envelope tem payload muito menor e sempre funciona; documentado como quirk novo no docstring da função.
- **Files modified:** gerar-bairros.py
- **Verification:** Testado isoladamente contra o polígono id=000400000755 (falha determinística com rings completos, sucesso com envelope) e confirmado na reconciliação completa.
- **Committed in:** a282f09 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs/blocking issues relacionados à fragilidade do endpoint ArcGIS sob carga sustentada). Ambos necessários para completar a reconciliação dos 1206 polígonos sem abortar a build. Nenhum scope creep — a lógica do algoritmo de reconciliação (DATA-NAMES.md 1.3) não foi alterada, só a resiliência de rede.

## Issues Encountered

- **Endpoint ArcGIS instável sob carga sustentada de ~3400 chamadas POST**: múltiplas execuções de `--verify` travaram por vários minutos (chegando a ~15-20min em alguns casos) em pontos específicos de retomada, sem erro explícito — consistente com o "502-under-load" já documentado no projeto, mas manifestando-se como travamento silencioso (retry/backoff em vez de erro imediato) em vez de uma exceção HTTP clara. O usuário, em paralelo, diagnosticou e corrigiu a causa raiz num commit próprio (`f42744d`, robustez de checkpoint/resume/continue-on-error) — a reconciliação foi concluída com sucesso rodando `--verify` repetidamente até resolver os 1206 polígonos (checkpoint incremental preservou o progresso entre execuções). Resolvido, sem impacto no resultado final.
- **Colisão de `id` de negócio conhecida** (`id=000400001169`, já documentada em `fetch_all_bairros`) faz o `RECON` (dict indexado por `id`) ter 1205 chaves para 1206 features — comportamento esperado e correto, ambas as features com esse `id` recebem o mesmo nome reconciliado via `--apply-names`.

## Next Phase Readiness

- `bairros-goiania.json` com nomes corretos está pronto para a Fase 8 (busca campo-único) e Fase 9 (choropleth/território) consumirem — geometria/drill inalterados, confirmado pelo assert automatizado.
- **Acompanhamento não-bloqueante:** revisão humana por amostra das bordas administrativas (multi-candidatos, motivo `nome`/`maioria`) fica agendada como item de conferência do orquestrador — 780 casos estão documentados na tabela `### Multi-candidatos (conferência)` de `bairros-goiania.report.md` para essa amostragem. Isso é a "Open Decision #1" mencionada no CONTEXT.md da fase; não bloqueia o avanço do plano nem do milestone.
- Nenhum blocker técnico para as fases seguintes.

---
*Phase: 07-funda-o-de-dados-nomes-de-bairro-cnefe-tuning-da-malha*
*Completed: 2026-07-05*

## Self-Check: PASSED

All files verified present: gerar-bairros.py, check-bairros-geojson.py, bairros-goiania.json, bairros-goiania.report.md, .gitignore, 07-01-SUMMARY.md.
All commits verified present in git log: a282f09, 13a9045, 18ed1ac.
