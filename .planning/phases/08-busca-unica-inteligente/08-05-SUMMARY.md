---
phase: 08-busca-unica-inteligente
plan: 05
status: complete
requirements: [BUSCA-09, BUSCA-12, BUSCA-13, BUSCA-14]
completed: 2026-07-07
---

# 08-05 — Deep-link · Maps/coordenada · Voz · Erros com ação · Auditoria de dados — SUMMARY

> Execução híbrida: Tasks 1-2 pelo executor (commits `987864c`, `600878c`); o executor estagnou
> na Task 3 (auditoria ao vivo — endpoint 502/rate-limit derrubou o watchdog do agente) e a
> auditoria foi concluída pelo ORQUESTRADOR com script resiliente (backoff exponencial até 60s).

## Task 1 — Deep-link + copiar link + Maps/coordenada + voz (`987864c`)
- **`?insc=`**: lido via `URLSearchParams` no boot, dispara `buscar()` APÓS `initMap()` (síncrono), sem aguardar `loadBairros()` (inscrição não depende do COMBO). Não-encontrado reusa toast/estado vazio.
- **Copiar link do imóvel**: botão no detail monta `origin+pathname+"?insc="+encodeURIComponent(...)` — mesmo padrão clipboard do copyInsc.
- **Colar link do Google Maps/coordenada**: aceita `@lat,lng`, `q=lat,lng` e par decimal "lat, lng"; valida faixas + bbox de Goiânia (fora → toast honesto); converte e reusa o caminho de identificação-por-ponto do clique-no-mapa, com `SEARCHTOKEN`.
- **Voz 🎤**: `webkitSpeechRecognition||SpeechRecognition`, pt-BR; botão só existe quando a API existe (degrada); resultado cai na caixa e roda o detectMode; erro de permissão → toast com próximo passo; 44px + aria-label.

## Task 2 — Erros/vazios com próxima ação + guardas (`600878c`)
- Estados de erro/vazio roteados pelo detect capturado: addr vazio → "Buscar como prédio" (reusa o texto); bd vazio → "Buscar como endereço"; sempre 1 toque.
- **Guarda a7a4646 re-verificada**: pillClose visível no desktop; `pick()` fecha overlay; seletor de prédio sobre o mapa. **A11y re-pass**: aria-live no chip, combobox ARIA no dropdown unificado, pointerdown iOS, font-size 16px, alvos 44px, ordem do Esc.

## Task 3 — AUDITORIA DE DADOS nos 6 modos (critério 8 do ROADMAP) — 6/6 PASS
Método: um imóvel real como referência cruzada — cada modo deve devolver o MESMO imóvel com os
mesmos campos críticos (ci/nrinscr/nrquadra/nrlote/areaterr/areaedif/uso/vlvenal/nmbairro/cdbairro).
Evidência completa: `08-05-AUDIT-EVIDENCE.json` (atributos crus por check).

| # | Modo | Consulta (WHERE do app) | Veredito |
|---|------|--------------------------|----------|
| 1 | bd (prédio) | `UPPER(nmedificio) LIKE '%DUO SKY%' AND vlvenal>0` | **PASS** (campos críticos presentes/tipados) |
| 2 | insc 10 díg (ci) | `ci='3121220251'` | **PASS** (quadra/lote/bairro idênticos ao modo bd) |
| 3 | insc 14 díg (nrinscr) | `nrinscr='31212202510010'` | **PASS** (mesma unidade; ci confere) |
| 4 | ql | `cdbairro=63 AND vlvenal>0 AND UPPER(nrquadra) LIKE '%183%'` | **PASS** (lote esperado presente) |
| 5 | addr | `cdbairro=63 AND vlvenal>0 AND UPPER(nmlogradou) LIKE '%R  HARPIA%'` | **PASS** (nmlogradou coerente) |
| 6 | clique-no-mapa | ponto (683871.37, 8149578.51) UTM 31982 intersect | **PASS** (mesmo ci — ciclo fechado) |

**TOTAL: 6 checks, 0 FAIL.** O caminho ficha↔endpoint está íntegro em todos os modos.

## Testes
`node --test "tests/*.test.mjs"` → **27 pass / 0 fail** (inclui regressões de recall do fix pós-preview do 08-04).

## Deviations
- Executor estagnou na Task 3 (watchdog 600s durante backoff de 502) — auditoria concluída pelo
  orquestrador; nenhuma perda: Tasks 1-2 já estavam commitadas e o tree estava limpo.
