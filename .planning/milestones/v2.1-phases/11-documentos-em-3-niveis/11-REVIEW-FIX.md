---
phase: 11-documentos-em-3-niveis
status: complete
source: 11-REVIEW.md
completed: 2026-07-07
---

# 11 — Review Fix Summary (aplicado pelo orquestrador)

| Achado | Sev | Fix | Verificação |
|--------|-----|-----|-------------|
| WR-01: PTAM gated só por CNAI — CNAI-sem-CRECI gerava PTAM "de corretor" SEM número de CRECI | warning (juridicamente relevante) | `comPtam = comCnai && comCreci` gate em título/metodologia/ressalva/lass-resp; call-site da recomendação idem (habilitação = ambos) | Preview: matriz 4 combinações — nada/sóCRECI/sóCNAI ⇒ Relatório + ressalva negativa; ambos ⇒ PTAM + COFECI + resp. técnico. 4 superfícies consistentes em todos os casos |
| WR-02: label "Documento" da Revisão ficava obsoleto se o perfil fosse editado depois de escolher PTAM (preview prometia PTAM, render saía Relatório) | warning | Revisão computa o documento EFETIVO (downgrade visível com aviso .confwarn orientando preencher CRECI+CNAI) | Código + testes |
| WR-03: recomendação aparecia sem anúncio/foco (leitor de tela perdia) | warning | `.finrec` com role=status aria-live=polite tabindex=-1; finSet foca o card após render | Código |
| IN-01/02 (duplicação leve passo 4/5; naming) | info | Registrados p/ Fase 13 (refino) — sem mudança | — |

Limpos no review: máquina de estados LZ (fase→steps, .wfoot em todas as rotas), guarda ec9f129 (1 call-site), esc() em tudo, radar_prof null-safe, abrirLaudo removido sem restos.

`node --test "tests/*.test.mjs"` → **64 pass / 0 fail**.
