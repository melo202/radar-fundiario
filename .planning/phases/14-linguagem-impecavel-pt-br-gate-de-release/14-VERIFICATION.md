---
phase: 14-linguagem-impecavel-pt-br-gate-de-release
verified: 2026-07-09T00:00:00Z
status: human_needed
score: 5/5 must-haves verified (automated)
overrides_applied: 0
human_verification:
  - test: "Ouvir/ler as 5 mensagens de WhatsApp (zapResumo, zapProprietario, zapComprador, zapArgumento, zapRiscos) geradas a partir de um imóvel real no app, simulando a perspectiva de um proprietário/comprador recebendo a mensagem"
    expected: "Tom de corretor profissional real: direto, sem hype, sem robótico, sem promessa de resultado — soa como algo que um corretor de imóveis escreveria de verdade no WhatsApp"
    why_human: "Tom e 'soar como corretor profissional' (§26.8) é um julgamento subjetivo de qualidade de linguagem; a auditoria documenta uma leitura em voz alta pela IA executora, mas isso não substitui validação humana de um usuário real do domínio (corretor)"
  - test: "Ler a Proposta de Compra e Venda, o Termo de Exclusividade e o Contrato de Compra e Venda gerados (PDF/preview) na íntegra"
    expected: "Linguagem formal e juridicamente cuidadosa, sem soar robótica, coerente com o que um corretor apresentaria a um cliente ou levaria a um advogado para revisão"
    why_human: "Qualidade jurídica/formal de um documento é uma avaliação de domínio (imobiliário/jurídico) que não pode ser confirmada só por grep de substrings preservadas"
  - test: "Navegar a UI completa (busca, ficha, onboarding, 'O que o Radar faz', legenda de pinos, toasts de erro, tooltips) em um dispositivo real e avaliar legibilidade/consistência visual do texto no contexto"
    expected: "Nenhum texto amador percebido durante o uso real; botões, placeholders e mensagens de erro fazem sentido no fluxo, não apenas isoladamente"
    why_human: "Legibilidade e amadorismo percebido em contexto de uso real (tamanho de tela, fluxo, ordem de leitura) é inerentemente uma avaliação visual/experiencial, não verificável por grep estático"
---

# Phase 14: Linguagem impecável pt-BR (gate de release) Verification Report

**Phase Goal:** Nenhum texto amador chega ao usuário; microcopy é produto. Gate de release LING-01: toda a microcopy (botões, placeholders, erros, tooltips, títulos, descrições, PDFs, mensagens de WhatsApp) passou pelo checklist §26 (acentuação correta, verbo de ação nos botões, erro que explica e oferece saída, sem jargão na 1ª camada, sem caixa alta em bloco longo, sem ironia/gíria, consistência de nomenclatura). WhatsApp soa como corretor profissional; documentos com linguagem formal e juridicamente cuidadosa.

**Verified:** 2026-07-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Tabela de auditoria (`14-AUDITORIA.md`) existe com glossário canônico, checklist §26 e as 11 seções de categoria preenchidas | ✓ VERIFIED | Arquivo lido de ponta a ponta (439 linhas): checklist §26 (8 critérios), glossário canônico (7 termos + Achado A4), 11 seções de categoria (Botões, Placeholders, Títulos/PWA, Onboarding+Descoberta+Legenda, Toasts/Erros+Estados vazios, Tooltips/aria-label, WhatsApp, Captação, Documentos+Negociação, Prédio, Scores/Motion/Chip), rodapé "Contagem" (≈287/30) e bloco "Sign-off do gate §26" com 8 critérios PASS |
| 2 | Jargão estatístico eliminado do rótulo de score de 1ª camada (A1) | ✓ VERIFIED | `grep "Abaixo da mediana" radar-goiania.html tests/` → 0 ocorrências; `grep -c "Oportunidade baixa" radar-goiania.html` → 3 (função `scoreOportunidade`, legenda de pinos, `STATUS_LABEL`); `tests/fixtures.mjs` usa `expectRotulo:"Oportunidade baixa"` |
| 3 | Loading estático alinhado à capitalização de MOTION_MSG (A2) | ✓ VERIFIED | `grep 'id="loadmsg"' radar-goiania.html:1006` → `<span id="loadmsg">Consultando cadastro…</span>` (maiúscula, igual a `MOTION_MSG.cadastro`) |
| 4 | Todo botão de texto visível começa com verbo de ação (§26.2) ou tem exceção documentada | ✓ VERIFIED | `grep -c "<button" radar-goiania.html` = 106 (inalterado); 12 botões corrigidos com verbo (Ver Oportunidades Caixa ×2, Ver no mapa ↗, Calcular custos de compra, Copiar ×5, Gerar ×3) confirmados por grep direto; demais ~90 classificados na auditoria como já corretos ou exceção justificada (ícone, seletor, navegação, exemplo tocável, item de lista, badge expansível) |
| 5 | Toda mensagem de erro (toast) segue o padrão o que houve + o que fazer (§26.3); estados vazios oferecem próximo passo | ✓ VERIFIED | `grep -c "toast(" radar-goiania.html` = 46 (inalterado); 4 toasts corrigidos com saída adicionada (lote sem registro, falha ao salvar ×2, falha ao copiar link) confirmados por grep; 4 estados vazios (`#emptyState`, erro de busca, sem resultado, libs do mapa) auditados com próximo passo tocável |
| 6 | aria-label narra a mesma ação do contexto visual; tooltips são frases completas coerentes | ✓ VERIFIED | `grep -c 'aria-label="'` = 35, `grep -c 'title="'` = 8 (ambos inalterados); 1 title corrigido (removida instrução `atualizar-caixa.py` inadequada ao corretor) — confirmado que a string não aparece mais em nenhum atributo `title=` visível ao usuário (só resta em comentários de código, não user-facing) |
| 7 | Mensagens de WhatsApp preservam honestidade (sem "garantido"/"certeza") e assinatura/ressalvas intactas | ✓ VERIFIED | `grep -Ei "garantido|com certeza" radar-goiania.html` → 0 ocorrências; `grep "recomendo confirmar"` e `grep "faixa estimada"` → presentes; `zapRiscos` corrigido para "não é uma avaliação oficial" (verbo que faltava) |
| 8 | DISCLAIMER_NEG e rótulos jurídicos das 3 minutas preservados literalmente | ✓ VERIFIED | `grep -c "recomenda-se revisão por advogado"` = 2 e `grep -c "registro na matrícula do imóvel no cartório de registro de imóveis competente"` = 2 (string completa presente); `tests/negocio.test.mjs` continua verde |
| 9 | Suíte de testes 100% verde ao final da fase | ✓ VERIFIED | `npm test` → 108/108 pass, 0 fail (107 originais + 1 teste novo `zap*/capt* sem bairro usam 'na região' — nunca 'no região'`, adicionado no fix pós-execução do code-review WR-01, commit `c622e16`) |
| 10 | WhatsApp soa como corretor profissional; documentos com linguagem formal e juridicamente cuidadosa | ? UNCERTAIN (needs human) | Auto-avaliação e leitura em voz alta documentadas na auditoria (Sign-off §26 critério 8: PASS); tom/qualidade de linguagem percebida é subjetivo — roteado para verificação humana (ver seção abaixo) |

**Score:** 9/10 truths automaticamente verificadas; 1 truth (percepção subjetiva de tom) roteada para verificação humana. Nenhum FAIL.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/14-linguagem-impecavel-pt-br-gate-de-release/14-AUDITORIA.md` | Tabela de auditoria completa (checklist §26, glossário, 11 categorias, contagem, sign-off) | ✓ VERIFIED | 439 linhas; todas as seções presentes e substantivas (não placeholders); contém string exata "Glossário canônico", "O que o Radar faz", "Modo captação", "AVALIADA" (Achado A4), "Contagem", "Sign-off do gate" |
| `radar-goiania.html` | Rótulo de oportunidade sem jargão + loading consistente + botões/toasts/tooltips corrigidos | ✓ VERIFIED | Todas as edições descritas nos 5 SUMMARYs confirmadas por grep direto no arquivo atual |
| `tests/fixtures.mjs` | `expectRotulo` atualizado para "Oportunidade baixa" | ✓ VERIFIED | Confirmado (ausência de "Abaixo da mediana" no arquivo) |
| `tests/templates.test.mjs` | Cobertura do branch "sem bairro" de `localTxt` (fix WR-01) | ✓ VERIFIED | Teste `"zap*/capt* sem bairro usam 'na região' — nunca 'no região'"` presente e verde (linha 96) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `radar-goiania.html scoreOportunidade() rotulo` | `tests/fixtures.mjs expectRotulo` | asserção literal em `tests/scores.test.mjs` | ✓ WIRED | Ambos os lados usam "Oportunidade baixa"; `node --test tests/scores.test.mjs` passa |
| `radar-goiania.html <button>` | checklist §26.2 (verbo de ação) | auditoria por categoria | ✓ WIRED | 12 botões corrigidos com verbos reaproveitados do próprio app (Ver/Calcular/Copiar/Gerar); grep confirma presença literal |
| `radar-goiania.html toast(...)` | checklist §26.3 (erro com saída) | auditoria por categoria | ✓ WIRED | 4 toasts corrigidos com verbo de próximo passo (Tente/Libere); confirmado por grep no arquivo atual |
| `radar-goiania.html zap*/capt* (RADAR_PURE)` | `tests/templates.test.mjs` asserções literais | edição de string + atualização de asserção no mesmo commit | ✓ WIRED | `localTxt()` helper aplicado em 6 âncoras; teste dedicado ao branch "sem bairro" adicionado no fix WR-01 pós-review; suíte 108/108 verde |
| `radar-goiania.html propostaTexto/termoExclusividadeTexto/contratoTexto` | `tests/negocio.test.mjs DISCLAIMER_NEG literal` | preservação literal do disclaimer | ✓ WIRED | String completa do disclaimer presente 2x (definição + uso), `tests/negocio.test.mjs` verde |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| LING-01 | 14-01, 14-02, 14-03, 14-04, 14-05 (todos os 5 planos) | Passar toda a microcopy pelo checklist §26 | ✓ SATISFIED (automated) / ? human tone check pending | Requirement marcado `[x]` em REQUIREMENTS.md; `14-AUDITORIA.md` documenta sign-off dos 8 critérios como PASS; suíte 108/108 verde; item subjetivo de tom roteado para humano (não bloqueia o status SATISFIED do requisito objetivo, mas mantém a fase em human_needed até confirmação) |

Nenhum requisito órfão encontrado — LING-01 é o único requisito mapeado à Fase 14 em REQUIREMENTS.md e está coberto por todos os 5 planos.

### Anti-Patterns Found

Nenhum bloqueador encontrado. Buscas por TODO/FIXME/placeholder/"em breve"/caixa alta em bloco/handlers vazios nas áreas modificadas (`radar-goiania.html`, `tests/*.mjs`) não retornaram ocorrências novas introduzidas pela Fase 14. O único achado de qualidade (WR-01, cobertura de teste ausente no branch "sem bairro" de `localTxt`) foi identificado pelo code-reviewer e corrigido antes desta verificação (commit `c622e16`).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | Nenhum anti-padrão bloqueador encontrado | — | — |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suíte completa 100% verde | `npm test` | 108 tests, 108 pass, 0 fail | ✓ PASS |
| `manifest.json` continua JSON válido | `node -e "JSON.parse(...)"` | sem erro | ✓ PASS |
| Zero ocorrência residual de "Abaixo da mediana" | `grep -rn "Abaixo da mediana" radar-goiania.html tests/` | 0 ocorrências | ✓ PASS |
| Zero promessa indevida introduzida ("garantido"/"com certeza") | `grep -Ei "garantido|com certeza" radar-goiania.html` | 0 ocorrências | ✓ PASS |
| DISCLAIMER_NEG literal preservado | `grep -c "registro na matrícula do imóvel no cartório de registro de imóveis competente" radar-goiania.html` | 2 ocorrências | ✓ PASS |
| Contagens estruturais inalteradas (botões/toasts/aria-label/title) | `grep -c` das 4 categorias | 106 / 46 / 35 / 8 (idênticas ao documentado nos SUMMARYs) | ✓ PASS |

### Human Verification Required

Ver seção `human_verification` no frontmatter. Resumo: 3 itens, todos relativos à percepção subjetiva de tom/qualidade de linguagem em contexto real de uso — nenhum é um gap funcional, todos são confirmações de julgamento humano que o processo de auditoria da IA (leitura em voz alta documentada em `14-AUDITORIA.md`) já cobriu parcialmente, mas que se beneficiam de validação por um usuário real (corretor) antes do release.

### Gaps Summary

Nenhum gap funcional encontrado. Todos os artefatos, links-chave e truths automaticamente verificáveis passaram. A fase está classificada como `human_needed` (não `passed`) exclusivamente porque o critério §26.8 ("soa como corretor profissional" / "linguagem formal e juridicamente cuidadosa") é, por natureza, uma avaliação de tom que não pode ser 100% confirmada por grep/teste — a AUDITORIA.md já documenta uma auto-verificação (leitura em voz alta pela IA executora) e o code-reviewer já revisou o diff completo (0 críticos, 1 warning corrigido, 1 info não-bloqueante registrado como follow-up fora de escopo). A ação recomendada é uma validação humana rápida (leitura de 1 amostra de WhatsApp + 1 minuta) antes de fechar a fase para produção; não requer nenhum plano de fechamento de gap (`/gsd-plan-phase --gaps`).

---

_Verified: 2026-07-09_
_Verifier: Claude (gsd-verifier)_
