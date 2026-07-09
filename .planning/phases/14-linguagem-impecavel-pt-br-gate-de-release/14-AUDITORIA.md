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

Varredura das 19 ocorrências de `placeholder="` (inclui 2 atribuições via JS, `inp.placeholder=`). Nenhuma alteração — todos seguem o padrão deliberado de "exemplo tocável" (prefixo `ex.:`/`digite:` minúsculo) já estabelecido, ou já atendem §26 quando são instrução (verbo, capitalizado).

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `quadra 128 lote 5 · rua portugal 582 · sumer park · 3020150346` (caixaInput) | 809 | avaliado-mantido | (sem mudança) | exemplo tocável minúsculo deliberado — mesmo texto dos exampleChips |
| `digite: faiçalville, oeste, marista…` (bairroInput, estático) | 834 | avaliado-mantido | (sem mudança) | exemplo minúsculo deliberado; acentuação correta |
| `ex.: 246` (quadra) | 843 | avaliado-mantido | (sem mudança) | exemplo tocável minúsculo deliberado |
| `ex.: 21` (lote) | 844 | avaliado-mantido | (sem mudança) | idem |
| `ex.: 135, 85, portugal` (rua) | 850 | avaliado-mantido | (sem mudança) | idem |
| `ex.: 582` (numero) | 852 | avaliado-mantido | (sem mudança) | idem |
| `ex.: 1901 (vazio = prédio todo)` (apto) | 857 | avaliado-mantido | (sem mudança) | idem; acentuação correta |
| `ex.: sumer park, riviera, absolut…` (predio) | 863 | avaliado-mantido | (sem mudança) | idem |
| `ex.: 3020150346` (insc) | 868 | avaliado-mantido | (sem mudança) | idem |
| `digite: faiçalville, oeste, marista…` (`inp.placeholder=`, reset após troca de modo) | 2382 | avaliado-mantido | (sem mudança) | mesma string de 834, mantém consistência |
| `erro ao carregar — recarregue a página` (placeholder de erro do combo de bairro) | 2383 | avaliado-mantido | (sem mudança) | §26.3 (o que houve + o que fazer) já atendido — "erro ao carregar" explica, "recarregue a página" é a saída; acentuação de "página" confirmada correta |
| `Buscar unidade (ex.: apto 302)` (busca de unidade no prédio) | 2971 | OK | (sem mudança) | verbo de ação + exemplo, já correto |
| `Cole aqui o texto da matrícula/certidão — vamos tentar identificar o número e o cartório.` (negmat) | 3982 | OK | (sem mudança) | instrução clara com verbo ("Cole"), acentuação correta, explica o que a ferramenta faz |
| `ex.: 84 — o cadastro traz a área TOTAL (…), com comum e vaga` (área privativa) | 4309 | avaliado-mantido | (sem mudança) | exemplo minúsculo deliberado; "TOTAL" é ênfase de uma palavra isolada, não bloco longo em caixa alta (§26.5 não se aplica) |
| `ex.: reformado em 2024, vista livre, aceita permuta…` (observações) | 4316 | avaliado-mantido | (sem mudança) | exemplo tocável minúsculo deliberado |
| `quem pediu o parecer` (solicitante) | 4326 | avaliado-mantido | (sem mudança) | placeholder descritivo minúsculo (padrão de campo, não frase completa) |
| `ex.: 12345` (CRECI) | 4332 | avaliado-mantido | (sem mudança) | exemplo tocável minúsculo deliberado |
| `ex.: 6789` (CNAI) | 4334 | avaliado-mantido | (sem mudança) | idem |
| `ex.: 84 m²` (área privativa, checklist) | 4355 | avaliado-mantido | (sem mudança) | idem |

## Títulos/Descrições/PWA

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `manifest.json` → `name`: "Radar Fundiário · Goiânia" | manifest.json:2 | OK | (sem mudança) | acentuação correta, profissional, sem jargão |
| `manifest.json` → `short_name`: "Radar" | manifest.json:3 | OK | (sem mudança) | curto e claro, adequado para ícone de app |
| `manifest.json` → `description`: "Busca de imóveis de Goiânia por quadra e lote sobre o cadastro imobiliário público" | manifest.json:4 | avaliado-mantido | (sem mudança) | sem jargão amador, acentuação correta, tom profissional (§26 satisfeito); tecnicamente incompleta (só cita quadra/lote, app já cobre endereço/inscrição/CI unificados) — fora do escopo de linguagem deste gate, registrada como possível ajuste de conteúdo futuro, não bloqueante |
| `index.html` → `<title>`: "Radar Fundiário · Goiânia" | index.html:6 | OK | (sem mudança) | consistente com o título do app principal |
| `index.html` → link de redirect: "Abrir o Radar Fundiário" | index.html:9 | OK | (sem mudança) | já começa com verbo de ação ("Abrir") |
| `radar-goiania.html` → `<title>`: "Radar Fundiário · Goiânia" | radar-goiania.html:14 | OK | (sem mudança) | consistente com index.html e manifest.json |
| `radar-goiania.html` → `<meta name="description">` | — | avaliado | não existe no `<head>` | ausência não é um critério §26 (metadado de SEO/compartilhamento, não texto visível ao usuário na UI); não adicionado nesta fase de gate de linguagem — fora do escopo de LING-01 (texto-apenas em elementos já existentes) |

## Onboarding + O que o Radar faz + Legenda

Nenhuma alteração nesta seção — textos já revisados na Fase 13 (13-03) e Plano 01 (A1); auditoria confirma conformidade com §26.

### Onboarding (`ONB_CARDS`, 3 cartões)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| Cartão 1 — `titulo:"Busque qualquer imóvel"` | radar-goiania.html:4773 | OK | (sem mudança) | título com verbo de ação ("Busque") |
| Cartão 1 — `texto:"Digite endereço, quadra/lote, nome do prédio ou inscrição — numa caixa só. O Radar entende o que você quer dizer."` | 4773 | OK | (sem mudança) | claro, sem jargão de 1ª camada, acentuação correta |
| Cartão 1 — `cta:"Próximo"` | 4773 | OK | (sem mudança) | navegação — pré-aprovado (§26.2 nota: "Próximo"/"Começar" são aceitáveis como navegação) |
| Cartão 2 — `titulo:"Veja valor e oportunidade"` | 4774 | OK | (sem mudança) | verbo de ação ("Veja") |
| Cartão 2 — `texto:"Cada imóvel mostra a faixa de valor estimado, o score de oportunidade e uma leitura em linguagem simples — sem jargão técnico."` | 4774 | OK | (sem mudança) | claro, sem jargão, acentuação correta |
| Cartão 2 — `cta:"Próximo"` | 4774 | OK | (sem mudança) | idem cartão 1 |
| Cartão 3 — `titulo:"Gere documentos e capte"` | 4775 | OK | (sem mudança) | verbo de ação ("Gere") |
| Cartão 3 — `texto:"Gere ficha, relatório ou laudo em PDF, copie mensagens prontas pro WhatsApp e monte a proposta — tudo pelo Radar."` | 4775 | OK | (sem mudança) | claro, verbos de ação no corpo, acentuação correta |
| Cartão 3 — `cta:"Começar"` | 4775 | OK | (sem mudança) | navegação — pré-aprovado |

Estrutura de `ONB_CARDS` (array de 3 objetos, campos `titulo`/`texto`/`cta`), `radar_onboard` (chave de persistência) e `onbRender()` **intactos** — nenhuma mudança estrutural, só confirmação de conformidade textual.

### "O que o Radar faz" (`#oQueFaz`, 5 itens)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `<b>Busca unificada</b> — endereço, quadra/lote, prédio ou inscrição numa caixa só.` + botão `Buscar agora →` | 898 | OK | (sem mudança) | rótulo do item é substantivo (padrão de lista de recursos, comum em telas de descoberta), mas a AÇÃO REAL (botão) já tem verbo — consistente com o padrão da fase 13 (nunca texto explicativo genérico sem ação real) |
| `<b>Valor e oportunidade</b> — faixa estimada, score de oportunidade e leitura em linguagem simples.` + botão `Ver como →` | 899 | OK | (sem mudança) | idem |
| `<b>Documentos prontos</b> — ficha, relatório ou laudo em PDF, minutas de proposta/contrato.` + botão `Ver como →` | 900 | OK | (sem mudança) | idem |
| `<b>Ação comercial</b> — mensagens prontas pro WhatsApp, modo captação, salvar oportunidades.` + botão `Ver como →` | 901 | OK | (sem mudança) | idem |
| `<b>Oportunidades da Caixa</b> — imóveis à venda da Caixa, plotados no mapa.` + botão `Ver no mapa →` | 902 | OK | (sem mudança) | idem |
| `summary`: "O que o Radar faz" | 895 | OK | (sem mudança) | nome travado desde a Fase 13 (13-03) — não renomeado, glossário canônico ratificado |

### Legenda de pinos (`#pinoLegenda`, 5 rótulos)

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `Boa oportunidade` (verde #2c5545) | 933 | OK | (sem mudança) | consistente com `scoreOportunidade` (score≥66) |
| `Atenção` (dourado #a8842c) | 934 | avaliado-mantido | (sem mudança) | rótulo do tier intermediário do sistema `statusDeUnidade`/`STATUS_LABEL` (Fase 13, VIS-01/PIN-01) — **sistema paralelo e intencionalmente distinto** do rótulo do badge individual da ficha (`scoreOportunidade` usa "Oportunidade média" para o mesmo intervalo 33≤score<66); `STATUS_LABEL.atencao="Atenção"` (radar-goiania.html:3172) é usado no mapa de comparação de unidades do prédio e é coberto por teste (`tests/fixtures.mjs:671-689`, chave `"atencao"`) — renomear seria mudança funcional/arquitetural (Rule 4), fora do escopo de texto-apenas desta fase; ambos os sistemas são internamente coerentes e não colidem (contextos de UI diferentes: pin/mapa agregado vs. badge da ficha individual) |
| `Oportunidade baixa` (vermelho #b5451f) | 935 | OK (já corrigido no Plano 01, A1) | (sem mudança nesta plano) | consistente com `scoreOportunidade` (score<33) e `STATUS_LABEL.risco` |
| `🏦 Caixa` (dourado #a8842c, mesma cor de "Atenção") | 936 | OK | (sem mudança) | distinção por ícone (🏦) + rótulo textual, não por cor — já avaliado como Achado A4 no Plano 01 (ambiguidade de "Oportunidades" AVALIADA, sem mudança); aqui o hex compartilhado com "Atenção" é intencional (ambos "dourado = olhar com atenção", precedente de A4) |
| `Sem dado ainda` (cinza #57503f) | 937 | OK | (sem mudança) | claro, consistente com `STATUS_LABEL.semdado` |
| `grep -c "Oportunidade baixa" radar-goiania.html` | — | verificado | ≥3 ocorrências confirmadas (função, legenda, `STATUS_LABEL`, fixture) | consistência confirmada (herdada do Plano 01) |

Cores inline (`#2c5545`, `#a8842c`, `#b5451f`, `#57503f`) **não tocadas** — são funcionais (T-14-01).

## Toasts/Erros + Estados vazios

Varredura das 46 linhas retornadas por `grep -n "toast(" radar-goiania.html` (contagem inalterada antes/depois). Duas linhas (2540, 2708) não são chamadas de toast: a primeira é a definição da função central; a segunda é um comentário que menciona `toast()`. Mensagens de confirmação/sucesso não precisam de saída (§26.3 aplica-se a erros); mensagens puramente informativas (contagem de resultados, aviso de dado ausente) foram avaliadas quanto a oferecer instrução quando fazem sentido ter uma.

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `"Lotes delimitados — toque num lote para abrir os dados."` / `"...passe o mouse para identificar, clique para abrir."` | 2253 | OK | (sem mudança) | informativo já com instrução de uso |
| `"Lote sem registro no cadastro."` (loadCi, clique direto em lote sem cadastro) | 2328 | **alterada** | `"Lote sem registro no cadastro. Tente outro lote."` | §26.3 (faltava a saída — adicionado próximo passo) |
| `"Falha ao carregar o lote. Tente de novo."` | 2330 | OK | (sem mudança) | §26.3 já atendido |
| `"Nenhum lote nesse ponto. Clique sobre o imóvel."` | 2347 | OK | (sem mudança) | §26.3 já atendido |
| `"Falha ao identificar o ponto. Tente de novo."` | 2349 | OK | (sem mudança) | §26.3 já atendido |
| `"{setor} no mapa — dê zoom nos lotes ou digite quadra e lote."` | 2500 | OK | (sem mudança) | informativo + instrução |
| `function toast(msg){...}` (definição da função central) | 2540 | n/a | — | não é uma chamada de toast, é a função em si |
| `"Resultado muito grande — a lista pode estar incompleta. Refine a busca."` | 2591 | OK | (sem mudança) | §26.3 já atendido |
| `"Digite a inscrição cadastral."` | 2608 | OK | (sem mudança) | validação de campo — a instrução já É o "o que fazer" |
| `"Escolha o setor na lista (digite e clique)."` | 2619 | OK | (sem mudança) | idem |
| `"Digite a rua/avenida."` | 2620 | OK | (sem mudança) | idem |
| `"Digite o nome da rua (além de \"rua/av\")."` | 2624 | OK | (sem mudança) | idem |
| `"Digite o nome do edifício (mínimo 3 letras)."` | 2661 | OK | (sem mudança) | idem |
| `"Escolha o setor na lista (digite e clique)."` (modo prédio) | 2675 | OK | (sem mudança) | idem |
| `"Digite ao menos a quadra."` | 2679 | OK | (sem mudança) | idem |
| `toast(aviso)` — `"Número {n} não consta no cadastro (prédios ficam sem número) — mostrando a rua inteira; ache o prédio pelo nome na lista."` | 2701 | OK | (sem mudança) | §26.3 já atendido (explica + saída "ache o prédio pelo nome na lista") |
| `toast(msg)` — `"Você está offline — a busca precisa de internet."` / `"Falha ao consultar o cadastro. Tente de novo."` | 2706 | OK | (sem mudança) | §26.3; a saída de "offline" é reforçada pelo botão "Tentar de novo" do estado vazio irmão (linha 2711/2712) — decisão já documentada em comentário no código |
| comentário `/* ... toast() ... */` | 2708 | n/a | — | comentário de código, não é uma chamada real |
| `toast(msg)` — 4 variantes de "sem resultado" (bd/addr/apto/default) | 2747 | OK | (sem mudança) | todas as 4 variantes já têm saída própria ("Tente parte do nome…", "Confira a rua…", "Tente sem o apartamento…", "Confira quadra/lote ou tente só a quadra.") |
| `"🏢 {n} imóveis deste prédio — veja a lista abaixo"` | 2782 | OK | (sem mudança) | informativo + instrução |
| `"{n} imóveis no mapa — a lista completa está na aba Consulta."` | 2785 | OK | (sem mudança) | informativo + instrução |
| `"🏢 {n} imóveis neste prédio — toque num para abrir a ficha (a busca fecha sozinha)."` | 2789 | OK | (sem mudança) | informativo + instrução |
| `"Você já marcou 4 — o máximo para comparar. Desmarque uma para trocar."` | 3072 | OK | (sem mudança) | §26.3 já atendido |
| `"Encontrado, mas sem coordenada cadastrada."` | 3226 | avaliado-mantido | (sem mudança) | limitação de dado do cadastro (não é erro do usuário) — o registro já está acessível na lista/ficha; nenhuma ação corretiva possível para o corretor |
| `"Este prédio não tem coordenada no cadastro."` | 3249 | avaliado-mantido | (sem mudança) | mesma limitação de dado (botão "no mapa ↗" sem coordenada para plotar); nenhuma ação disponível — não é um erro que o usuário cause ou resolva |
| `"Imóvel sem coordenada no cadastro — abrindo a ficha."` | 3303 | OK | (sem mudança) | explica + já informa a ação que o próprio sistema toma |
| `"Não foi possível salvar — armazenamento do navegador indisponível ou cheio."` (oppSave) | 3500 | **alterada** | `"Não foi possível salvar — armazenamento do navegador indisponível ou cheio. Libere espaço e tente de novo."` | §26.3 (faltava a saída — adicionado próximo passo) |
| `"Oportunidade removida."` | 3534 | OK | (sem mudança) | confirmação — sem necessidade de saída |
| `"Oportunidade salva."` | 3542 | OK | (sem mudança) | confirmação — sem necessidade de saída |
| `"Não foi possível salvar — armazenamento do navegador indisponível ou cheio."` (histSave) | 3508 | **alterada** | `"Não foi possível salvar — armazenamento do navegador indisponível ou cheio. Libere espaço e tente de novo."` | §26.3, mesma correção do par oppSave |
| `"Oportunidade removida."` | 3653 | OK | (sem mudança) | confirmação — sem necessidade de saída |
| `"Inscrição {v} copiada — cole na consulta oficial."` | 3681 | OK | (sem mudança) | confirmação + próxima ação |
| `"Link copiado."` (sucesso) / `"Não foi possível copiar o link."` (falha) | 3688 | **alterada** (só o ramo de falha) | sucesso sem mudança; falha → `"Não foi possível copiar o link. Tente de novo."` | §26.3 (faltava a saída no ramo de falha) |
| `"Não foi possível copiar — tente selecionar o texto manualmente."` (copyTexto, falhou) | 3714 | OK | (sem mudança) | §26.3 já atendido |
| `toast(okMsg)` (copyTexto, fallback de execCommand) | 3727 | OK | (sem mudança) | confirmação de sucesso (ex.: "Copiado! Cole no WhatsApp.") — sem necessidade de saída |
| `toast(okMsg)` (copyTexto, clipboard API) | 3731 | OK | (sem mudança) | idem |
| `"Preencha o nome do proponente e o valor ofertado para continuar."` | 4113 | OK | (sem mudança) | validação com verbo de ação |
| `"Preencha o nome do proprietário e do corretor para continuar."` | 4117 | OK | (sem mudança) | idem |
| `"Preencha o nome das partes e o preço total para continuar."` | 4121 | OK | (sem mudança) | idem |
| `"Preencha seu nome para assinar o documento."` | 4404 | OK | (sem mudança) | idem |
| `"Informe o valor de venda sugerido (passo Valor)."` | 4405 | OK | (sem mudança) | idem |
| `"Resumo copiado — cole no WhatsApp."` | 4666 | OK | (sem mudança) | confirmação + próxima ação |
| `"Imóveis da Caixa à venda (lista de {n}). Toque num pino dourado."` | 4714 | OK | (sem mudança) | informativo + instrução |
| `"{n} linhas exportadas para CSV."` | 4739 | OK | (sem mudança) | confirmação — sem necessidade de saída |
| `"Não foi possível usar o microfone. Digite sua busca."` | 5028 | OK | (sem mudança) | §26.3 já atendido |
| `"Não foi possível usar o microfone. Digite sua busca."` (catch do `.start()`) | 5030 | OK | (sem mudança) | §26.3 já atendido |

### Estados vazios (4 blocos `.empty`)

| Bloco | Âncora (linha) | Veredito | Critério §26.8 |
|---|---|---|---|
| `#emptyState` (tela inicial de busca) | 880 | OK | "Toque num exemplo para começar:" + 4 chips tocáveis com valor de busca pronto — próximo passo em 1 toque |
| Erro de busca (falha de rede/consulta) | 2711-2712 | OK | mensagem explicativa + botão "Tentar de novo" (`onclick="buscar()"`) — próximo passo em 1 toque |
| Sem resultado | 2761 | OK | mensagem já contém a saída (varia por modo) + botão contextual quando aplicável ("Buscar como Prédio" / "Tentar outro nome") |
| Libs do mapa não carregaram | 4824 | OK | "Verifique a conexão com a internet e recarregue a página." — instrução clara com 2 verbos de ação |

Nenhum `id`, classe `.empty` ou handler foi alterado — só o texto de 3 toasts (2328, 3500, 3508 dupla, 3688 ramo de falha) recebeu o próximo passo que faltava.

## Tooltips/aria-label

Varredura das 35 ocorrências de `aria-label="` e das 8 ocorrências de `title="` (contagem ao vivo confirmada nesta plano — RESEARCH estimava 7 para `title`; grep real = 8). Nenhum valor de `role=`/`aria-controls`/`aria-describedby`/`aria-labelledby` foi tocado (11 ocorrências combinadas, inalteradas).

### aria-label (35)

| String original | Âncora (linha) | Elemento/contexto visual | Veredito | Critério §26 |
|---|---|---|---|---|
| `"Fechar busca"` | 799 | `pillClose`, botão `×` | OK | narra a mesma ação do glifo (fechar) + objeto (busca) |
| `"Buscar por voz"` | 812 | `caixaVoz`, botão `🎤` | OK | verbo + contexto coerente com o ícone de microfone |
| `"Limpar busca"` | 813 | `caixaClear`, botão `×` | OK | verbo + objeto coerente |
| `"Sugestões de setor e rua"` | 815 | `caixaList`, `role="listbox"` | OK | rótulo de região/lista, não é botão — descreve o conteúdo |
| `"Toque para corrigir o modo de busca detectado"` | 817 | `detectChip`, `role="status"` clicável (div com `tabindex`/`onclick`/`onkeydown`) | OK | narra a ação (toque = ativa) — chip interativo, não `<button>` nativo, mas o padrão §26.2 se aplica igual |
| `"Escolha o que você quis dizer"` | 819 | `ambigChips`, `role="group"` | OK | rótulo de grupo de chips de desambiguação |
| `"Exemplos de busca"` | 883 | `exampleChips`, `role="group"` | OK | rótulo de grupo |
| `"Abrir busca de imóvel"` | 916 | `searchPill`, botão (pill visual de busca) | OK | verbo "Abrir" + objeto, coerente com o padrão de search pill |
| `"Dispensar dica"` | 921 | `coach-x`, botão `×` | OK | verbo + objeto (dica de coach mark) |
| `"Navegação do mapa"` | 923 | `breadcrumb`, `<nav>` | OK | rótulo de landmark de navegação |
| `"Legenda dos pinos no mapa"` | 932 | `pinoLegenda`, `<div>` | OK | rótulo descritivo de região |
| `"Detalhe do imóvel"` | 939 | `detail`, `role="region"` | OK | rótulo de região |
| `"Fechar detalhe"` | 943 | `.x`, botão `×` (fecha `#detail`) | OK | verbo + objeto específico |
| `"Escolha o imóvel"` | 978 | `chooser`, `role="region"` | OK | rótulo de região (seletor de unidade) |
| `"Fechar"` | 981 | `.x`, botão `×` (fecha `#chooser`) | OK | dialog/região pai já anuncia o contexto ("Escolha o imóvel"); "Fechar" isolado é suficiente e consistente com o padrão dos demais sheets |
| `"Como usar o Radar Fundiário"` | 991 | `onbOverlay`, `role="dialog"` | OK | título do diálogo de onboarding |
| `"Laudo de avaliação"` | 1018 | `wiz`, `role="dialog"` | OK | título do diálogo |
| `"Voltar"` | 1020 | `wBack`, botão `‹` | OK | verbo coerente com a seta de voltar |
| `"Fechar laudo"` | 1022 | `wclose`, botão `×` (fecha `#wiz`) | OK | verbo + objeto específico |
| `"Modo captação"` | 1029 | `captSheet`, `role="dialog"` | OK | título do diálogo |
| `"Fechar"` | 1033 | `wclose`, botão `×` (fecha `#captSheet`) | OK | dialog pai já anuncia "Modo captação"; consistente com o padrão de close genérico |
| `"Documentos da negociação"` | 1068 | `negSheet`, `role="dialog"` | OK | título do diálogo |
| `"Voltar"` | 1070 | `negBackBtn`, botão `‹` | OK | verbo coerente |
| `"Fechar"` | 1072 | `wclose`, botão `×` (fecha `#negSheet`) | OK | idem 981/1033 |
| `"Comparação de unidades"` | 1079 | `cmpSheet`, `role="dialog"` | OK | título do diálogo |
| `"Fechar"` | 1083 | `wclose`, botão `×` (fecha `#cmpSheet`) | OK | idem |
| `"Fechar laudo"` | 1095 | `lvx`, botão `×` (fecha visualização do laudo/PDF) | OK | específico, consistente com 1022 |
| `"Custos de compra"` | 1101 | `calc`, `role="dialog"` | OK | título do diálogo |
| `"Fechar"` | 1104 | `calcx`, botão `×` (fecha `#calc`) | OK | idem 981/1033/1072 |
| `"Ver satélite"` / `"Ver ruas"` (dinâmico, `setSatelite()`) | 2099 (inicial), 2118 (JS) | `btnSat`, botão toggle `🛰️`/`🗺️`, `aria-pressed` sincronizado | OK | já é dinâmico e coerente com o estado — narra a AÇÃO do próximo toque (mapa mostra satélite → label "Ver satélite"; satélite ligado → label "Ver ruas"), glifo troca junto |
| `"Ordenar unidades"` | 2963 | `<div role="group">`, chips de critério de ordenação | OK | rótulo de grupo |
| `"Buscar unidade neste prédio"` | 2971 | `<input type="search">`, placeholder "Buscar unidade (ex.: apto 302)" | OK | verbo coerente com o placeholder do mesmo campo |
| `"Desmarcar da comparação"` / `"Marcar para comparar"` (dinâmico) | 3140 | `cmp-toggle`, botão `☑`/`☐` | OK | já dinâmico e coerente com o estado do checkbox (confirmado também nas atualizações JS em 3069/3076) |
| `"Remover esta oportunidade"` | 3600 | `saveditem-rm`, botão `×` | OK | verbo + objeto específico (evita "Fechar" genérico onde a ação real é excluir um item salvo) |
| `"Remover foto {i+1}"` | 4321 | `.rm`, botão `×` (remove foto do wizard de laudo) | OK | verbo + objeto específico, inclui índice da foto |

### title (8)

| String original | Âncora (linha) | Botão/elemento que contém | Veredito | String final | Critério §26 |
|---|---|---|---|---|---|
| `"Alternar satélite"` | 2099 | `btnSat` 🛰️/🗺️ | OK | (sem mudança) | frase curta mas completa; complementa o `aria-label` dinâmico do mesmo botão (ação genérica de alternância, coerente com um toggle) |
| `"Baixar os resultados em planilha"` | 2867 | `.csv`, botão "⬇ Baixar planilha" | OK | (sem mudança) | frase completa, coerente com o botão (detalha "em planilha") |
| `"Centralizar este prédio no mapa"` | 2879 | `.tomap`, botão "Ver no mapa ↗" | OK | (sem mudança) | frase completa, coerente e mais específica que o rótulo do botão |
| `"Este item casou por aproximação — confira quadra/lote/rua"` | 3143 | `span.matchapprox` "~aproximado" (não é botão, é uma marca de qualidade de match) | OK | (sem mudança) | frase completa, explica + oferece o que checar (§26.3-like) |
| `"Abre a CND da prefeitura já com a inscrição {insc} preenchida — só resolver o CAPTCHA; a certidão sai com o nome do titular"` | 3452 | `<a>` "Titular (CND) ⧉↗" | OK | (sem mudança) | frase completa, coerente com o link, avisa a expectativa (CAPTCHA, nome do titular) |
| `"Copia um link direto para este imóvel (?insc={insc}) — cole no WhatsApp/e-mail"` | 3453 | botão "Copiar link deste imóvel ⧉" | OK | (sem mudança) | frase completa, coerente; `?insc=` citado apenas como referência de leitura, valor do parâmetro não alterado |
| `"este imóvel"` | 3855 | `<div class="me">` marcador de posição no gráfico de barra (não é botão) | avaliado-mantido | (sem mudança) | rótulo curto de marcador em visualização de dados (padrão "you-are-here" de gráfico), não é tooltip de botão — a exigência de "frase completa" do §26 aplica-se a tooltips de CTA, não a rótulos de eixo/marcador |
| `"Lista da Caixa de {data} — pode estar desatualizada (rode atualizar-caixa.py)"` (dinâmico, `initCaixa()`) | 4681 | `#btnCaixa`, botão "🏦 Ver Oportunidades Caixa" | **alterada** | `"Lista da Caixa de {data} — pode estar desatualizada."` | §26 (removida instrução de uso interno/admin `rode atualizar-caixa.py` — não é uma ação que o corretor consegue executar; o corretor não tem acesso ao script Python de atualização) |

Nenhum `id`, `role=`, `aria-controls`, `aria-describedby` ou `aria-labelledby` foi alterado (11 ocorrências combinadas, contagem inalterada). Apenas 1 `title` recebeu edição de texto (linha 4681, remoção de instrução técnica não acionável pelo usuário final).

## WhatsApp (RADAR_PURE)

Varredura das 5 funções `zap*` (radar-goiania.html:1438-1501). Nenhum emoji, CAPS em bloco ou gíria encontrado; honestidade (`assinatura`/faixa=null) já garantida pelo contrato original (10-01). 2 correções pontuais de tom/gramática no Plano 04 (`zapArgumento`/`zapRiscos`) + 3 correções retroativas de concordância no Plano 05 (`zapResumo`/`zapProprietario`/`zapComprador`, achado transversal do helper `localTxt` — ver seção "Documentos + Negociação"), todas sem asserção acoplada (mudança segura sem editar `tests/templates.test.mjs`).

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `zapResumo` — abertura `${tipoImovel} no ${bairro}.` + leitura + faixa (ou ressalva honesta) + assinatura | 1438-1447 | **alterada (Plano 05, retroativo)** | usa novo helper `localTxt(bairro)` | §26.1 (correção de concordância de gênero no fallback sem bairro — ver seção "Documentos + Negociação"); tom (§26.8) já estava OK e não mudou — só a concordância do fallback |
| `zapProprietario` — abertura "Olá! Encontrei seu imóvel no {bairro} no Radar…" + faixa/ressalva + pendências opcionais + "Podemos conversar?" + assinatura | 1451-1462 | **alterada (Plano 05, retroativo)** | usa novo helper `localTxt(bairro)` | §26.1 idem; tom (§26.8: convite direto, sem pressão/hype, pendências como recomendação) inalterado |
| `zapComprador` — "Encontrei esse imóvel no {bairro}…" + faixa/recomendação de avaliação + "Recomendo confirmar área privativa, estado de conservação e documentação antes de avançar." + assinatura | 1465-1474 | **alterada (Plano 05, retroativo)** | usa novo helper `localTxt(bairro)` | §26.1 idem; tom (§26.8: consultivo, sem promessa de resultado) inalterado |
| `zapArgumento` — fallback sem `porque[0]`: `` Está na faixa "${rotulo}" (score ${score}) em relação à mediana dos comparáveis. `` | 1478-1489 | **alterada** | `` Está na faixa "${rotulo}" em relação aos comparáveis da região. `` | §26.8 (tom robótico — número de `score` cru e jargão "mediana" expostos ao cliente final num fallback de mensagem de WhatsApp; texto principal via `porque[0]` não foi tocado — é gerado por `scoreOportunidade()`, fora do escopo desta varredura, já ratificado no Plano 01); sem asserção acoplada (branch não coberto por `tests/templates.test.mjs`, confirmado por leitura das fixtures) |
| `zapRiscos` — pontos a confirmar + `"Esta é uma faixa estimada, não uma avaliação oficial — recomendo confirmar esses pontos antes de qualquer decisão."` + assinatura | 1493-1500 | **alterada** | `"Esta é uma faixa estimada, não é uma avaliação oficial — recomendo confirmar esses pontos antes de qualquer decisão."` | §26.1 (erro gramatical — faltava o verbo "é"; corrigido para bater com o termo de honestidade documentado em 14-RESEARCH.md/interfaces do plano); teste (`zapRiscos contem termo de honestidade…`) já passava via `"faixa estimada"` (asserção por `.some()`), continua verde e agora também casa com `"não é uma avaliação oficial"` |

## Captação (RADAR_PURE)

Varredura das 4 funções `capt*` (radar-goiania.html:1504-1537) + `oportunidadeItem`/`histAdd` (1551-1576). Nenhuma alteração de TOM necessária no Plano 04 — as 4 funções já atendiam §26 (verbo de ação/tom direto, sem gíria/CAPS/hype); no Plano 05, `captAbordagem`/`captScript` receberam a mesma correção retroativa de concordância (`localTxt`, ver seção "Documentos + Negociação"). `oportunidadeItem`/`histAdd` são funções puras de dados (allowlist/FIFO) sem string visível ao usuário, fora do escopo de auditoria de tom.

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `captAbordagem` — "Olá! Sou corretor(a) e trabalho com imóveis no {bairro}. Notei seu imóvel na {endereco}{Q/L} e gostaria de conversar sobre uma possível parceria para venda — sem compromisso. Tem 5 minutos para eu explicar?" + assinatura | 1504-1510 | **alterada (Plano 05, retroativo)** | usa novo helper `localTxt(bairro)` | §26.1 (correção de concordância de gênero — ver seção "Documentos + Negociação"); tom (§26.8: direto, sem pressão/gíria) inalterado |
| `captScript` — 4 passos numerados ("1." apresentação, "2." pergunta de interesse, "3." agenda visita/envia faixa, "4." agradece mesmo se negativa), SEM assinatura (script de ligação interno) | 1514-1520 | **alterada (Plano 05, retroativo)** | usa novo helper `localTxt(bairro)` no passo 1 | §26.1 idem; numeração "1."–"4." preservada intacta (asserida em `tests/templates.test.mjs`) |
| `captChecklist` — 5 itens estáticos com bullet "•" (Matrícula/RGI, IPTU+CND, Certidões pessoais, Convenção/ata de condomínio, Documento de identidade+CPF), SEM assinatura | 1524-1529 | OK | (sem mudança) | §26 (termos técnicos de documento — jargão aceitável em checklist do próprio corretor, não em mensagem enviada ao cliente); 5 termos ("matrícula"/"iptu"/"certidões pessoais"/"condomínio"/"identidade") e contagem de bullets preservados (asserido em `tests/templates.test.mjs`) |
| `captFollowup` — "Follow-up: retornar contato com proprietário/interessado do imóvel na {endereco} em até 3 dias úteis para confirmar interesse na captação." (tarefa interna, SEM assinatura) | 1534-1536 | avaliado-mantido | (sem mudança) | "Follow-up" é anglicismo, mas já é termo estabelecido no app (`.captblock-lbl` linha 1053 "Tarefa de follow-up"; toast linha 4197 "Tarefa de follow-up copiada.") — troca isolada quebraria consistência de nomenclatura (§26.7) sem ganho, texto é tarefa interna do corretor, nunca enviado ao cliente |
| `oportunidadeItem` — retorna objeto de 12 campos (allowlist LGPD), sem string livre exposta ao usuário | 1551-1568 | N/A (sem texto de UI) | (sem mudança) | fora do escopo de tom §26 (dado estruturado, não copy); contrato de allowlist (SALV-01/T-10-01) intocado |
| `histAdd` — FIFO puro sobre array, sem string de UI | 1573-1576 | N/A (sem texto de UI) | (sem mudança) | fora do escopo de tom §26 (lógica pura, sem copy) |

## Documentos + Negociação (RADAR_PURE)

Varredura de `recomendaDocumento`/`pendenciasDocumento`/`fichaRapidaTexto` (radar-goiania.html:1586-1631) e `propostaTexto`/`termoExclusividadeTexto`/`contratoTexto` (1768-1901) + `DISCLAIMER_NEG` (1641). Achado transversal: o fallback `"no "+(bairro||"região")"` produzia erro de concordância de gênero ("no região" — "região" é feminino); corrigido com o novo helper `localTxt(bairro)` (ver nota abaixo), aplicado nas 6 âncoras que compartilhavam o padrão (5 delas fora desta seção, já auditadas nos Planos 01/04 como "OK" — corrigidas retroativamente nesta plano por serem o MESMO bug de concordância).

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `recomendaDocumento` — 4 textos de "porquê" (apresentar/captar/formal×2) | 1586-1600 | OK | (sem mudança) | §26 (formal, sem jargão de 1ª camada; os 4 textos são todos diferentes entre si — asserido em doc.test.mjs); acentuação correta |
| `pendenciasDocumento` — 3 itens de checklist ("Área privativa confirmada"/"Estado de conservação declarado"/"Estado da documentação") | 1607-1616 | OK | (sem mudança) | §26 (claro, sem jargão, acentuação correta) |
| `fichaRapidaTexto` — `resumo: (tipoImovel||"Imóvel")+" no "+(bairro||"região")+"."` | 1622-1631 | **alterada** | `resumo: (tipoImovel||"Imóvel")+" "+localTxt(bairro)+"."` (usa novo helper `localTxt`) | §26.1 (correção de concordância de gênero — "no região" → "na região" quando bairro ausente; branch não coberto por fixture em doc.test.mjs, confirmado por leitura de tests/fixtures.mjs, `npm test` continua verde sem edição de teste) |
| `fichaRapidaTexto` — `ressalva`: "Faixa estimada com base em dados públicos do cadastro municipal — recomenda-se confirmar área, estado de conservação e documentação antes de decidir. Não substitui avaliação formal." | 1629 | OK | (sem mudança) | §26.8 (formal, juridicamente cuidadosa); contém "recomenda-se confirmar" (asserido em doc.test.mjs) |
| `DISCLAIMER_NEG` (constante compartilhada pelas 3 minutas) | 1641 | **PRESERVADO LITERALMENTE** | (sem mudança, nenhum caractere alterado) | T-14-03 (mitigate) — "Minuta para conferência das partes — recomenda-se revisão por advogado; a transmissão da propriedade exige escritura pública (quando aplicável) e registro na matrícula do imóvel no cartório de registro de imóveis competente." — asserida literal e exata em negocio.test.mjs |
| `propostaTexto` — 5 cláusulas ("Do Objeto"/"Do Valor Ofertado e da Forma de Pagamento"/"Da Validade da Proposta"/"Das Condições"/"Do Foro") + papéis "Proponente"/"Vendedor/Proprietário" | 1768-1801 | OK | (sem mudança) | §26.8 (linguagem formal jurídica já revisada na Fase 11.1; acentuação e concordância corretas — "considerar-se-á caduca", mesóclise correta) |
| `termoExclusividadeTexto` — 6-7 cláusulas (Objeto/Prazo/Exclusividade/Comissão/[Divulgação condicional]/Obrigações do Corretor/Foro) + rótulos "EXCLUSIVO"/"NÃO EXCLUSIVO"/"Autorização de Divulgação" + papéis "Proprietário"/"Corretor" | 1806-1857 | OK | (sem mudança) | §26.8 idem; numeração condicional de cláusula (5ª só aparece com `autorizaAnuncio` não-null) preservada, testada em negocio.test.mjs |
| `contratoTexto` — 7 cláusulas (Partes/Objeto/Preço/Posse/Inadimplemento/Despesas e Tributos/Foro) + papéis "Vendedor"/"Comprador" | 1862-1901 | OK | (sem mudança) | §26.8 idem; "pro-rata" (termo técnico jurídico aceito em minuta formal, não é gíria) |
| Helper novo: `localTxt(bairro)` — `bairro ? "no "+bairro : "na região"` | 1436 (novo, antes de `zapResumo`) | **adicionado** (Rule 1 — correção de bug de concordância) | — | §26.1; substitui o padrão `"no "+(bairro||"região")` nas 6 âncoras que o usavam: `zapResumo` (1440, WhatsApp — já auditado Plano 04), `zapProprietario` (1460, idem), `zapComprador` (1471, idem), `captAbordagem` (1507, Captação — já auditado Plano 04), `captScript` (1516, idem) e `fichaRapidaTexto` (1626, Documentos — esta seção); nenhuma fixture exercia o branch sem bairro (confirmado por leitura de tests/fixtures.mjs) — `npm test` 107/107 verde sem edição de teste |

## Prédio (RADAR_PURE)

Varredura de `resumoPredio`/`ordenaUnidades`/`remapPredio`/`ehAptoProvavel`/`analisePredicoTexto` (radar-goiania.html:1909-1989). Achado A3 (14-RESEARCH.md) ratificado: emojis 🏢/📍 em `analisePredicoTexto` são MANTIDOS — 2 emojis discretos de corretor real, explicitamente testados em `tests/predio.test.mjs`, removê-los quebraria o teste sem ganho de qualidade.

| String original | Âncora (linha) | Veredito | String final | Critério §26 |
|---|---|---|---|---|
| `resumoPredio(units)` — retorna `{n,areaMedia,venalMedio,estimadoMedio,faixaLo,faixaHi}` (dado estruturado agregado, sem string livre) | 1915-1930 | N/A (sem texto de UI) | (sem mudança) | fora do escopo de tom §26 (função pura de agregação, não gera copy) |
| `analisePredicoTexto` — cabeçalho `"🏢 "+(nome||"Edifício")+" — Q "+quadra+" · L "+lote` | 1984 | **avaliado-mantido** | (sem mudança) | Achado A3 — emoji 🏢 mantido (2 emojis discretos de corretor real); fallback "Edifício" preservado (asserido em predio.test.mjs) |
| `analisePredicoTexto` — métricas condicionais ("N unidades"/"área média N m²"/"venal médio R$ N"/"estimado médio R$ N · faixa R$ N–R$ N") | 1980-1983 | OK | (sem mudança) | termos de métrica claros, cada cláusula omitida independentemente quando o campo correspondente é `null` (honestidade, asserido em predio.test.mjs — nunca "estimado médio: —") |
| `analisePredicoTexto` — bloco de endereço `"\n\n📍 "+endereco` (condicional, só quando `meta.endereco` existe) | 1986 | **avaliado-mantido** | (sem mudança) | Achado A3 — emoji 📍 mantido, mesmo raciocínio do 🏢; ausência condicional quando `endereco` é null (asserido) |
| `analisePredicoTexto` — assinatura `"\nAnálise gerada pelo Radar Fundiário."` | 1987 | OK | (sem mudança) | claro, formal, profissional — asserido literal em predio.test.mjs |
| `ordenaUnidades`/`remapPredio`/`ehAptoProvavel` — lógica pura de ordenação/filtro/remapeamento, sem string de UI | 1932-1970 | N/A (sem texto de UI) | (sem mudança) | fora do escopo de tom §26 (nenhuma copy nova) |

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
| `leituraPratica(inputs)` — frase de leitura prática de 1ª camada (4 templates: sem oportunidade / score≥66 / score≥33 / score<33), usa `bairro ? "no ${bairro}" : "nesta região"` (concordância já correta, distinto do padrão buggy corrigido nesta plano) | radar-goiania.html:1393-1409 | **avaliado** (Plano 05, confirmação final) | (sem mudança) | §26.4 (zero jargão — "mediana"/"percentil"/"quartil" nunca aparecem, garantido por teste em `tests/scores.test.mjs`); fallback "nesta região" já concorda corretamente em gênero (contraste com o achado de `localTxt`, que corrigiu o MESMO tipo de fallback em 6 outras funções que usavam "no região") |

---

## Contagem

Consolidação final (Plano 05) — soma dos pontos revisados por categoria, contando 1 linha de tabela = 1 ponto de string/âncora revisado (linhas que agrupam múltiplos elementos visuais idênticos, ex.: "Copiar ⧉ ×4" ou "Ver como → ×3", são contadas como 1 ponto de revisão cada, não 1 por elemento visual — método consistente com o "grep de linha" usado em todo o documento). Onde a categoria tem uma contagem grep independente já registrada no cabeçalho da seção (Botões=106, Placeholders=19), essa contagem grep prevalece como N da categoria.

| Categoria | N revisadas | M alteradas |
|---|---|---|
| Botões | 106 | 12 |
| Placeholders | 19 | 0 |
| Títulos/Descrições/PWA | 7 | 0 |
| Onboarding + O que o Radar faz + Legenda | 20 | 0 *(a alteração de "Oportunidade baixa" na legenda é a MESMA âncora de linha 935 já contada em "Scores/Motion" — evitado double-count aqui)* |
| Toasts/Erros + Estados vazios | 48 | 4 |
| Tooltips/aria-label + title | 43 | 1 |
| WhatsApp (RADAR_PURE) | 5 | 5 |
| Captação (RADAR_PURE) | 6 | 2 |
| Documentos + Negociação (RADAR_PURE) | 8 | 1 |
| Prédio (RADAR_PURE) | 6 | 0 |
| Scores/Motion/Chip de busca (inclui leituraPratica) | 19 | 5 |
| **Total** | **≈287** | **30** |

**N revisadas: ≈287 · M alteradas: 30** (≈10,5% de strings alteradas — consistente com a hipótese da pesquisa de que a microcopy já era majoritariamente de alta qualidade; a maior concentração de mudança foi em botões sem verbo de ação (§26.2, 12 casos) e no achado transversal de concordância de gênero do fallback "no região"→"na região" (§26.1, 6 casos via helper `localTxt`, Plano 05) que afetou WhatsApp/Captação/Documentos simultaneamente.

---

## Sign-off do gate §26

Verificação final percorrida categoria a categoria (11 seções, ver acima) + `npm test` 100% verde (107/107). Veredito por critério:

| # | Critério §26 | Veredito | Evidência |
|---|---|---|---|
| 1 | Acentuação correta (pt-BR) | **PASS** | Varredura de todas as 11 categorias sem erro de acentuação residual; 1 erro de concordância de gênero encontrado e corrigido (`localTxt`, "no região"→"na região" em 6 âncoras, Plano 05) |
| 2 | Verbo de ação nos botões | **PASS** | 12 botões corrigidos (Plano 02) de um total de 106; demais já corretos ou exceção justificada (seletor/navegação/glifo-ícone) |
| 3 | Erro que explica **e** oferece saída | **PASS** | 4 toasts corrigidos (Plano 03) com "o que houve + o que fazer"; 40 dos 44 já atendiam o padrão |
| 4 | Zero jargão na 1ª camada | **PASS** | "Abaixo da mediana" eliminado do rótulo de score de 1ª camada (4 âncoras, Plano 01, A1); `leituraPratica`/`fichaRapidaTexto` confirmados sem "mediana"/"percentil"/"quartil" (garantido por teste); jargão cadastral preservado apenas em accordion/chip técnico (Pitfall 2, respeitado) |
| 5 | Sem caixa alta em bloco longo | **PASS** | Nenhuma ocorrência de CAPS em bloco longo encontrada; "EXCLUSIVO"/"NÃO EXCLUSIVO" são rótulos jurídicos de 1-2 palavras (já revisados na Fase 11.1), não blocos |
| 6 | Sem ironia/gíria | **PASS** | Nenhuma ironia/gíria encontrada; emojis 🏢/📍 de `analisePredicoTexto` avaliados como uso profissional de corretor real (Achado A3), não gíria |
| 7 | Consistência de nomenclatura | **PASS** | Glossário canônico ratificado (Plano 01); 0 ocorrências residuais de "Favoritos"/"Salvos"; Achado A4 ("Oportunidades" ambíguo) avaliado e mantido por distinção de contexto/ícone; `captFollowup`/"Follow-up" mantido por consistência já estabelecida |
| 8 | WhatsApp: tom de corretor profissional; Documentos: linguagem formal e juridicamente cuidadosa | **PASS** | 5 funções `zap*` e 4 `capt*` auditadas (tom profissional, sem hype); `DISCLAIMER_NEG` e as 3 minutas (Proposta/Termo/Contrato) preservados literalmente, linguagem jurídica formal já revisada na Fase 11.1 intacta |

**Verificação manual (leitura em voz alta, persona corretor / linguagem formal):**
- WhatsApp: `zapResumo`/`zapProprietario`/`zapComprador`/`zapArgumento`/`zapRiscos` e `captAbordagem` lidos em voz alta com dados de fixture (Setor Bueno) — tom natural de corretor, sem robótico, sem promessa de resultado; fallback "na região" (corrigido nesta plano) lê-se naturalmente.
- Documentos: `propostaTexto` (Cláusulas 1ª-5ª + disclaimer), `termoExclusividadeTexto` (exclusiva=true, com cláusula de divulgação) e `contratoTexto` (Cláusulas 1ª-7ª) lidos em voz alta com dados de fixture completos — linguagem formal, juridicamente cuidadosa, sem soar robótica; `DISCLAIMER_NEG` lê-se como uma ressalva de advogado real, não como aviso genérico de sistema.

**Gate LING-01: FECHADO.** `npm test` 107/107 verde. Nenhum disclaimer/ressalva jurídica enfraquecido — todos preservados literalmente ou fortalecidos (correção gramatical em `zapRiscos`, Plano 04).
