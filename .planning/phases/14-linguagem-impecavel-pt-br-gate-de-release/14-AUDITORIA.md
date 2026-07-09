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

Varredura completa dos 106 elementos retornados por `grep -n "<button" radar-goiania.html` (a linha 694 é uma regra CSS/comentário, não um `<button>` real — excluída da contagem de botões; os outros 105 grep-hits mapeiam >106 elementos `<button>`, pois algumas linhas de template literal contêm mais de um botão). Nenhum botão foi removido/adicionado; `grep -n "<button" radar-goiania.html` continua = 106.

### Alteradas (verbo de ação adicionado, mudança mínima)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `🏦 Oportunidades Caixa (…)` (btnCaixa, estático) | radar-goiania.html:873 | alterada | `🏦 Ver Oportunidades Caixa (…)` | §26.2 (verbo de ação; consistente com "Ver no mapa →" do mesmo toggle em #oQueFaz:902) |
| `🏦 Oportunidades Caixa (…) · {data}` (btnCaixa, re-render de `initCaixa()` quando lista desatualizada) | radar-goiania.html:4682 | alterada | `🏦 Ver Oportunidades Caixa (…) · {data}` | mesma correção acima, aplicada na âncora dinâmica para não divergir do HTML estático |
| `no mapa ↗` (tomap, cabeçalho de prédio) | radar-goiania.html:2879 | alterada | `Ver no mapa ↗` | §26.2 (substantivo isolado → verbo "Ver", consistente com o padrão já usado em #oQueFaz) |
| `🧮 Custos de compra (ITBI + cartório)` (dActsMore) | radar-goiania.html:3451 | alterada | `🧮 Calcular custos de compra (ITBI + cartório)` | §26.2 (abre a calculadora — verbo "Calcular" descreve a ação) |
| `💬 Resumo do imóvel ⧉` (zapbtn) | radar-goiania.html:3457 | alterada | `💬 Copiar resumo do imóvel ⧉` | §26.2 (copia para clipboard — verbo "Copiar", padrão já usado em "Copiar inscrição ⧉"/"Copiar ⧉") |
| `🏠 Mensagem para o proprietário ⧉` (zapbtn) | radar-goiania.html:3458 | alterada | `🏠 Copiar mensagem para o proprietário ⧉` | §26.2 idem |
| `🔑 Mensagem para o comprador ⧉` (zapbtn) | radar-goiania.html:3459 | alterada | `🔑 Copiar mensagem para o comprador ⧉` | §26.2 idem |
| `💲 Argumento de preço ⧉` (zapbtn) | radar-goiania.html:3460 | alterada | `💲 Copiar argumento de preço ⧉` | §26.2 idem |
| `⚠️ Riscos e ressalvas ⧉` (zapbtn) | radar-goiania.html:3461 | alterada | `⚠️ Copiar riscos e ressalvas ⧉` | §26.2 idem |
| `📄 Proposta de Compra e Venda` (zapbtn, abre wizard NEG) | radar-goiania.html:3465 | alterada | `📄 Gerar Proposta de Compra e Venda` | §26.2 (consistente com "📄 Gerar Termo de Exclusividade" já usado no Modo Captação, linha 1060) |
| `🔑 Termo de Exclusividade` (zapbtn) | radar-goiania.html:3466 | alterada | `🔑 Gerar Termo de Exclusividade` | §26.2 idem |
| `🧾 Contrato de Compra e Venda` (zapbtn) | radar-goiania.html:3467 | alterada | `🧾 Gerar Contrato de Compra e Venda` | §26.2 idem |

### Já corretas (verbo de ação presente — sem mudança)

| String | Âncora (linha) | Veredito |
|---|---|---|
| `Buscar` (btnGo) | 871 | OK |
| `Buscar agora →` / `Ver como →` (×3) / `Ver no mapa →` (#oQueFaz) | 898–902 | OK |
| `Pular` (onb-skip) | 993 | OK |
| `⚖️ Comparar (0)` (cmpFab) | 1009 | OK |
| `Continuar` (wNext — vira "Gerar PDF" no último passo do wizard) | 1025 | OK |
| `Copiar ⧉` (captcopy ×4) | 1040,1045,1050,1055 | OK |
| `📄 Gerar Termo de Exclusividade` (captSheet) | 1060 | OK |
| `Continuar` (negNextBtn) | 1075 | OK |
| `🖨️ Salvar PDF` (lvprint) | 1094 | OK |
| `Tentar de novo` | 2712 | OK |
| `Buscar como Prédio` | 2757 | OK |
| `Tentar outro nome` | 2759 | OK |
| `⬇ Baixar planilha` (csv) | 2867 | OK |
| `Mostrar mais (…)` | 2893 | OK |
| `🔍 Ordenar / filtrar` | 2944 | OK |
| `💬 Copiar análise do prédio ⧉` | 2945 | OK |
| `Abrir ficha ↗` (cmp-abrir) | 3109 | OK |
| `📊 Analisar vizinhança — faixa de preços` | 3424 | OK |
| `📄 Gerar documento` (primary) | 3437 | OK |
| `📊 Ver comparáveis` | 3438 | OK |
| `⭐ Salvar oportunidade` (acts-save) | 3439 | OK |
| `Copiar inscrição ⧉` | 3450 | OK |
| `Copiar link deste imóvel ⧉` | 3453 | OK |
| `🧾 Captar este imóvel` | 3470 | OK |
| `Limpar` (savedblock-clear) | 3626 | OK |
| `Ver metodologia` (cmpbtn-sm) | 3855 | OK |
| `📎 Extrair dados` (negextrai) | 3983 | OK |
| `＋ Adicionar fotos` (waddph) | 4319 | OK |
| `Editar perfil` / `Trocar documento` (revlink) | 4395,4396 | OK |
| `⧉ Copiar resumo para o cliente` (cmini) | 4650 | OK |

### Exceções registradas (avaliado-mantido)

| Categoria | Exemplos | Âncora (linha) | Justificativa §26 |
|---|---|---|---|
| Botão-ícone (glifo puro, sem texto) | `×` (pillClose, caixaClear, coach-x, x/detalhe, x/chooser, wclose ×5, lvx, calcx, saveditem-rm, rm/foto), `🎤` (caixaVoz), `‹` (wBack, negBackBtn), `🛰️` (btnSat, gerado via JS), `☑/☐` (cmp-toggle) | 799,813,921,943,981,1022,1033,1072,1083,1095,1104,1020,1070,2099,3140,3600,4321 | significado vive no `aria-label` (auditado no Plano 03); glifo isolado não precisa de verbo em innerHTML |
| Seletor de modo/valor (segmented control, não é ação) | `Endereço`/`Prédio`/`Quadra/Lote` (correctMenu), `Padrão`/`Maior oportunidade`/`Menor estimado`/`Maior área` (ordenarBldg), `☑/☐ Só aptos prováveis`, `Sim, exclusiva`/`Não, aberta`, `Sim`/`Não`, findoc (nome+descrição do documento), finop (ícone+finalidade), CONSERVS, DIFS (chips multi-seleção), `Vistoriei o imóvel`/`Sem vistoria`, `Em ordem`/`Pendências`, `À vista`/`Financiado`, sugestões de desambiguação `Rua {n}`/`Quadra {n}`/`Inscrição {n}…` | 823-825,2964-2970,4024,4026,4261,4269,4288,4290,4292,4362,4625-4626,5051-5053 | rótulo é o próprio VALOR/opção escolhida (como um `<select>`), não uma ação de mutação — prefixar verbo quebraria o padrão consistente de segmented control usado em todo o app |
| Navegação/aba (tab bar, breadcrumb) | `☰ Resultados` (dBack), `🔍 Consulta`/`🗺️ Mapa` (viewbar), `Goiânia` (crumb city), `Próximo` (onb-next) | 942,1012,1013,924,999 | destino/aba de navegação, padrão universal de tab bar e breadcrumb (nomes de lugar/destino, não verbos); "Próximo" pré-aprovado no 14-02-PLAN.md como navegação aceitável |
| Exemplo tocável (o texto É o valor de busca, não uma ação) | `quadra 128 lote 5`, `rua portugal 582`, `sumer park`, `3020150346` (exampleChips) | 884-887 | valor literal inserido no campo de busca ao tocar — prefixar verbo destruiria a função de "atalho de valor exato" (consistente com a regra de placeholders tocáveis) |
| Campo de busca simulado (pill) | `🔍 O que você procura?` (searchPill) | 916 | funciona como um campo de busca visual (padrão "search pill"), não uma CTA de mutação; convite implícito à ação, ratificado na Fase 13 |
| Continuação de frase (já contém verbo, minúsculo por design) | `ou buscar pela inscrição cadastral (CI)` (cIN) | 827 | complementa a frase do menu de correção de modo ("…ou buscar pela inscrição…"); já contém o verbo "buscar", minúsculo por ser continuação, não início de frase |
| Linha de item clicável (conteúdo 100% dinâmico, sem texto fixo) | `saveditem` (endereço + meta), `saveditem-hist`, `chrow` (linha de resultado) | 3596,3616,3272 | linha de lista funciona como item selecionável (padrão "clicar na linha"), conteúdo é o próprio dado do imóvel, não uma legenda de ação |
| Badge de score expansível (conteúdo já auditado na seção Scores/Motion) | `score` (opBody dinâmico + chevron), `confCls` (confLbl dinâmico + chevron) | 3325,3327 | é um badge de status que também funciona como acordeão ("por quê"); o rótulo visível é o próprio score, já revisado na tabela "Scores/Motion/Chip de busca" (Plano 01) |

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
