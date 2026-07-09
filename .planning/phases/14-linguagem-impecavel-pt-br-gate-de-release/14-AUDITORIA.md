# Fase 14 — Auditoria de Linguagem (gate de release pt-BR)

**Data de criação:** 2026-07-09
**Artefato de:** 14-01-PLAN.md (fundação) — consolidado pelos Planos 02-05

## Checklist §26 (critérios objetivos)

1. Acentuação correta (pt-BR)
2. Verbo de ação nos botões (gerar/copiar/salvar/comparar/enviar/criar)
3. Erro que explica **e** oferece saída
4. Zero jargão na 1ª camada (jargão técnico só em camadas profundas/accordion técnico)
5. Sem caixa alta em bloco longo
6. Sem ironia/gíria
7. Consistência de nomenclatura (não alternar "Oportunidades/Favoritos/Salvos" sem motivo)
8. WhatsApp: tom de corretor profissional; Documentos: linguagem formal e juridicamente cuidadosa

---

## Glossário canônico

Termos travados em fases anteriores — a Fase 14 **ratifica**, não redecide.

| Conceito | Termo canônico | Fonte |
|----------|-----------------|-------|
| Lista de imóveis salvos manualmente pelo corretor | "Oportunidades" / "Minhas oportunidades" | 10-CONTEXT.md (Fase 10, travado) |
| Lista automática de últimas consultas | "Histórico" | 10-CONTEXT.md (Fase 10, travado) |
| Área de descoberta progressiva na tela inicial | "O que o Radar faz" | Fase 13 (13-03) |
| Fluxo de abordagem ao proprietário | "Modo captação" | Fase 10 |
| As 3 saídas de documento | "Ficha rápida" / "Relatório de avaliação" / "Laudo/PTAM" | Fase 11 (DOC-01) |
| As 3 minutas de negociação | "Proposta de Compra e Venda" / "Termo de Autorização/Exclusividade de Venda" / "Contrato de Compra e Venda" | Fase 11.1 |
| Imóveis à venda pela Caixa | "Oportunidades Caixa" | legado v1/v2.0 |
| **Achado A4 (registrado, sem mudança)** | "Oportunidades" usado para dois conceitos ("Oportunidades Caixa" externo vs "Minhas oportunidades" salvas) — ambiguidade **AVALIADA**, distinção por contexto/ícone (🏦 vs ⭐), SEM mudança | 14-RESEARCH.md Achado A4; ratificado nesta auditoria |

---

## Nomenclatura residual

`grep -n "Favoritos\|Salvos" radar-goiania.html` → **0 ocorrências**. Consolidado a favor de "Oportunidades" desde a Fase 10 (10-CONTEXT.md). Nenhum item de correção necessário.

---

## Botões

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 02)* | | | | |

## Placeholders

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 02)* | | | | |

## Títulos/Descrições/PWA

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 02)* | | | | |

## Onboarding + O que o Radar faz + Legenda

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 03)* | | | | |

## Toasts/Erros + Estados vazios

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 03)* | | | | |

## Tooltips/aria-label

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 03)* | | | | |

## WhatsApp (RADAR_PURE)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 04)* | | | | |

## Captação (RADAR_PURE)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 04)* | | | | |

## Documentos + Negociação (RADAR_PURE)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 04)* | | | | |

## Prédio (RADAR_PURE)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| *(a preencher — Plano 04)* | | | | |

## Scores/Motion/Chip de busca

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `rotulo="Abaixo da mediana"` (scoreOportunidade, score<33) | radar-goiania.html:1351 | alterada | `Oportunidade baixa` | §26.4 (zero jargão na 1ª camada — badge de score é 1ª camada, fora de accordion) |
| `Abaixo da mediana` (legenda de pinos #pinoLegenda) | radar-goiania.html:935 | alterada | `Oportunidade baixa` | §26.4 + §26.7 (consistência com o rótulo) |
| `risco:"Abaixo da mediana"` (STATUS_LABEL, mapa de comparação de unidades) | radar-goiania.html:3172 | alterada | `Oportunidade baixa` | §26.4 + §26.7 |
| `expectRotulo:"Abaixo da mediana"` (fixture consumida por tests/scores.test.mjs) | tests/fixtures.mjs:65 | alterada | `Oportunidade baixa` | acoplamento de teste (mesma correção A1, mesmo commit) |
| `<span id="loadmsg">consultando cadastro…</span>` (loading estático) | radar-goiania.html:1006 | alterada | `Consultando cadastro…` (maiúscula, alinhado ao MOTION_MSG) | §26.7 (consistência de capitalização) |
| `MOTION_MSG.localizando: "Localizando imóvel…"` | radar-goiania.html:2547 | OK | (sem mudança) | maiúscula + gerúndio + reticências, sem jargão |
| `MOTION_MSG.cadastro: "Consultando cadastro…"` | radar-goiania.html:2548 | OK | (sem mudança) | padrão de referência para A2 |
| `MOTION_MSG.estimativa: "Calculando estimativa…"` | radar-goiania.html:2549 | OK | (sem mudança) | maiúscula + gerúndio + reticências, sem jargão |
| `MOTION_MSG.comparaveis: "Buscando comparáveis…"` | radar-goiania.html:2550 | OK | (sem mudança) | maiúscula + gerúndio + reticências, sem jargão |
| `MOTION_MSG.mapa: "Preparando mapa…"` | radar-goiania.html:2551 | OK | (sem mudança) | maiúscula + gerúndio + reticências, sem jargão |
| `label:` Setor · ${setor.disp} (detectMode) | radar-goiania.html:1262 | OK | (sem mudança) | acentuação correta, sem jargão excessivo (chip de confirmação) |
| `label:` Inscrição (unidade) · N díg. (detectMode) | radar-goiania.html:1268 | OK | (sem mudança) | "Inscrição" é jargão cadastral aceitável no chip técnico de confirmação (§26.4 nota) |
| `label:` Inscrição (lote) · N díg. (detectMode) | radar-goiania.html:1269 | OK | (sem mudança) | idem acima |
| `label:` Quadra X · Lote Y (detectMode) | radar-goiania.html:1277 | OK | (sem mudança) | claro, sem jargão |
| `label:` Endereço · ... (detectMode) | radar-goiania.html:1297 | OK | (sem mudança) | acentuação correta |
| `label:` Prédio · ... (detectMode) | radar-goiania.html:1303 | OK | (sem mudança) | acentuação correta |
| `label:` Ambíguo (detectMode) | radar-goiania.html:1308 | OK | (sem mudança) | acentuação correta, claro |
| `label:` Prédio (?) · ... (detectMode) | radar-goiania.html:1312 | OK | (sem mudança) | acentuação correta; "(?)" comunica incerteza sem gíria |

---

## Contagem

N revisadas: (a consolidar no Plano 05) · M alteradas: (a consolidar no Plano 05)
