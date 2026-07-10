# Auditoria Fable 5 — Área 08: Mapa, Pinos Semânticos, Motion & Prédio

- **Área:** 08 — Mapa, pinos semânticos, motion & prédio (`radar-goiania.html`)
- **Data:** 2026-07-10
- **Revisor:** Fable 5 (auditoria somente-leitura)
- **Suíte:** `npm test` → **252/252 passando** (0 falhas)
- **Escopo:** `initMap`/`refreshLots`/`plot`/`pick`/`recolorPinoCi`, `statusDeUnidade`/`statusPino`/`PINO_STYLE`/`bestStatusPorCi`/`scoresDePlot`/`aplicarScoresDePlot`/`TERRSTAT`, choropleth (`baiStyle`/`lotStyle`/`aplicarChoropleth`/`desenharChoropleth`), zonas PD, legenda (`atualizarLegenda`/`montarLegenda`), satélite (`setSatelite`/`SATTOKEN`), Caixa (`toggleCaixa`/`garantirCaixaLayer`), motion (`mAnimate`/`REDUCE`/skeleton), prédio (`resumoPredio`/`ordenaUnidades`/`ehAptoProvavel`/`analisePredicoTexto`/`#cmpSheet`).
- **Já conhecido (não re-reportado):** 2 botões "Ver comparáveis" (regressão); traço das zonas do PD não re-densifica no zoom (`desenharZonas` retorna cedo por contenção em `ZONALAST`).

## Método de prova

Funções puras extraídas do bloco `RADAR_PURE` (linhas 1441–2997) e executadas via `node:vm` com bordas. Resultados provados:

- `statusDeUnidade`: bandas **66→bom, 65.9→atencao, 33→atencao, 32.9→risco**; `NaN`/`undefined`/`null`/`{op:null}`/`{}` → **semdado**. Coerente com as bandas de `scoreOportunidade` (`>=66` / `>=33`).
- `scoresDePlot`: dedup por `ci` (1ª unidade decide — 2ª unidade do mesmo `ci` ignorada), lote sem pm² → `null`, amostra `<3` → `{}` (honesto, nunca inventa cor).
- `estatTerritorio`: chaves = `n,total,medianaPm2,q1Pm2,q3Pm2,iptuMediano,anoMediano,mix,breaks` — **NÃO expõe `min`/`max`** (`"min" in est === false`). Base de MAPA-05.
- `ordenaUnidades`: retorna nova referência, não muta o array/objetos originais, empate estável (`a,c,b` para `area-desc`), critério desconhecido → `padrao`.
- `resumoPredio([])` → `{n:0, areaMedia:null, venalMedio:null, estimadoMedio:null, faixaLo:null, faixaHi:null}` (nunca `NaN`).

Todas confirmaram o comportamento documentado. Nenhum crash/`NaN`/deref nulo encontrado nas puras (consumidores como `oppExtras` guardam `sc.op?`/`sc.conf?`; `#cmpSheet` guarda `u.__scores&&u.__scores.op`).

---

## Achados

`[MAPA-NN] arquivo:linha | severidade | título | descrição | cenário | proposta`

### [MAPA-01] radar-goiania.html:5338-5340,1652-1663 | MÉDIA | Vocabulário de status divergente na banda média (mesma cor, palavras diferentes)
- **descrição:** Para o MESMO score 33–65 (cor gold `#a8842c`), o tooltip do pino e a legenda usam `STATUS_LABEL.atencao = "Atenção"` (linha 5339), enquanto a ficha (`renderScoresInto`, linha 5533 → `op.rotulo`) e a linha "Oportunidade" do `#cmpSheet` (linha 5268, `u.__scores.op.rotulo`) usam `"Oportunidade média"` (origem em `scoreOportunidade`, linha 1656). As bandas extremas coincidem exatamente ("Boa oportunidade" / "Oportunidade baixa"); só a média diverge.
- **cenário:** Corretor vê pino gold com tooltip "Atenção", abre a ficha do mesmo imóvel e lê "Oportunidade média"; ao comparar, o `#cmpSheet` também diz "Oportunidade média". Três superfícies, dois nomes para a mesma banda/cor.
- **proposta:** Unificar o vocabulário da banda média (escolher "Atenção" OU "Oportunidade média" em todas as superfícies), ou documentar explicitamente que "Atenção" é o rótulo deliberado do mapa/legenda (nível de atenção) e "Oportunidade média" é o da ficha (posição de preço).

### [MAPA-02] radar-goiania.html:3219-3220,74-78 | MÉDIA | Cor do choropleth de valor tem fonte DUPLICADA (JS ≠ CSS) — risco de dessincronização silenciosa
- **descrição:** Os lotes/quadras do choropleth são pintados por `TERR_COLORS`/`TERR_INK` (hex literais em JS, 3219-3220), mas os swatches da legenda (`#terrSw1..5`, linhas 1146-1150) usam as CSS vars `--terr-q1..q5` / `--terr-q1-ink` (74-78). São dois conjuntos de literais independentes que hoje coincidem à mão. Isto contradiz o padrão IN-01 (13-REVIEW.md), que tornou `PINO_STYLE` fonte única lida por `atualizarLegenda()` justamente para eliminar esse tipo de dessincronização. (As zonas do PD não têm o problema: `zonaEstiloPorSigla` lê `--zone-{sigla}` do CSS em runtime — fonte única.)
- **cenário:** Um ajuste futuro em `TERR_COLORS` (JS) muda a cor dos lotes no mapa, mas a legenda continua com a cor antiga (CSS) — legenda passa a mentir sobre a faixa.
- **proposta:** Espelhar IN-01: pintar os swatches a partir de `TERR_COLORS`/`TERR_INK` em `montarLegenda()` (mesma técnica de `atualizarLegenda`), ou derivar `TERR_COLORS` de `getComputedStyle` das CSS vars no boot.

### [MAPA-03] radar-goiania.html:3260-3263 | MÉDIA | Wash do bairro usa a cor da FAIXA 3 da paleta de valor para significar apenas "setor escaneado"
- **descrição:** Em `baiStyle`, quando `CHOROPLETH_ON` e o `cdbairro` foi escaneado, o polígono do bairro recebe `fillColor: TERR_COLORS[3]` (azul-médio da paleta de quantis) — fixo, independentemente da mediana real do setor. O comentário assume isto como intencional ("a variação real por faixa vive no nível de LOTE"), mas a cor escolhida É uma cor de faixa da própria legenda de valor, sugerindo "valor médio" quando só significa "ativo". A legenda ao lado mostra 5 faixas com R$/m² reais.
- **cenário:** Em z<17, o setor inteiro aparece azul-médio (faixa 3). O corretor, com a legenda de 5 faixas à vista, pode interpretar que o setor é "faixa 3" de valor — informação inexistente.
- **proposta:** Usar um wash neutro (fora da paleta de quantis — ex. cinza/tan do `BAI_STYLE` com opacidade um pouco maior) para "setor ativo", reservando `TERR_COLORS[1..5]` exclusivamente para o nível de lote onde há faixa real.

### [MAPA-04] radar-goiania.html:5423-5424 | BAIXA | Legenda de pinos aparece mesmo quando NENHUM pino foi plotado
- **descrição:** `plot()` chama `atualizarLegenda(list.length>0)`, baseando a visibilidade no tamanho da LISTA de resultados, não no nº de pinos realmente adicionados (`pts.length`). Quando todos os resultados não têm coordenada, o ramo `else toast("Encontrado, mas sem coordenada cadastrada.")` é atingido (pts vazio, nenhum marker), mas `list.length>0` mantém a legenda visível.
- **cenário:** Busca retorna imóveis sem `x_coord`/`y_coord`; mapa fica sem pinos, mas a `#pinoLegenda` (Boa oportunidade / Atenção / …) aparece descrevendo cores que não existem na tela.
- **proposta:** Passar `atualizarLegenda(pts.length>0)` (ou o nº de markers efetivamente criados) em vez de `list.length>0`.

### [MAPA-05] radar-goiania.html:2450-2461,2419-2435 | BAIXA (INFO) | Cor do pino no plot usa fallback IQR (sem min/max); pode saltar de banda ao abrir a ficha, sem novo dado
- **descrição:** Provado que `estatTerritorio` não devolve `min`/`max`; logo `scoresDePlot` chama `scoreOportunidade(pm2, {q1,med,q3,n}, {})` e o cálculo cai sempre no fallback `min=max(1,q1-1.5·IQR)` / `max=q3+1.5·IQR` (1638-1639). Já `atualizarScores` (fluxo da ficha) passa `min`/`max` REAIS dos comparáveis do raio 400 m. Além de a população ser diferente (setor inteiro vs raio), o próprio `min/max` difere. `recolorPinoCi` é o mecanismo previsto de reconciliação — portanto é "por design" — mas o pino pode mudar de banda de cor só por abrir a ficha, sem nenhuma mudança de dado percebida pelo usuário.
- **cenário:** Pino colorido como "Atenção" (score de plot via fallback IQR); usuário abre a ficha, `compare()` roda, `recolorPinoCi` repinta o mesmo pino como "Boa oportunidade" — parece inconsistência.
- **proposta:** Documentar a diferença de referência no tooltip "semdado"/hint, ou (opcional) fazer `estatTerritorio` também expor `min`/`max` da amostra para reduzir a diferença entre o score de plot e o de ficha na mesma referência de setor.

### [MAPA-06] radar-goiania.html:2277-2278,2244 | BAIXA | "Maior oportunidade" ordena por venal/m² bruto, não pelo score de oportunidade exibido
- **descrição:** Em `ordenaUnidades`, o critério `"oportunidade"` usa `__pm2` (linha 2244: `vlvenal/areaedif` — valor VENAL por m²), ordenando ascendente. O número de "oportunidade" mostrado na ficha e no `#cmpSheet` é o `scoreOportunidade` RELATIVO (0–100 vs vizinhança), não o venal/m². Dentro de um prédio (mesmo `ci`/vizinhança) as duas ordens quase sempre coincidem, mas conceitualmente o rótulo "Maior oportunidade" promete a ordem do score exibido.
- **cenário:** Duas unidades do prédio com venal/m² parecido mas scores de oportunidade distintos podem sair na ordem "errada" em relação ao número que o corretor lê no card.
- **proposta:** Ordenar por `__scores.op.score` (desc) quando disponível, caindo em `__pm2` como tie-break/fallback; ou renomear o chip para "Menor R$/m² (venal)" para casar com o que de fato ordena.

---

## Verificações que PASSARAM (sem achado)

- **Tokens de invalidação após `await`:** `refreshLots` (`LOTTOKEN`), `desenharZonas` (`ZONASTOKEN` + `ZONAS_ON`), `setSatelite` (`SATTOKEN`) e `territorioScan` (dedupe por promise) checam corretamente após cada `await`; toggles rápidos não deixam camada da vez errada.
- **Camadas órfãs:** `limparZonas` remove+deleta as 6 layers e zera `ZONALAST` (idempotente); `desenharZonas` remove a layer antiga de cada sigla antes de recriar e não re-adiciona siglas sem features; `garantirCaixaLayer` deduplica via `caixaLayerBuilding` (nunca prende camada sem handle). `toggleCaixa`/`abrirCaixaNoMapaUI` re-checam `caixaOn`/`caixaLayer` após o `await`.
- **Crossfade do satélite:** street-tile só é removido pelo `setTimeout` do toggle MAIS recente (`tk===SATTOKEN&&satelliteOn`); OFF re-adiciona street antes de remover sat. Sob `prefers-reduced-motion` a transição CSS `.sat-fade` é neutralizada pela regra global `transition-duration:0.001ms !important` (linha 97-104).
- **Motion / reduced-motion:** `mAnimate`/`mStagger` retornam `null` em `REDUCE`/Motion ausente e a mudança de estado real é sempre incondicional; `recolherLegenda` faz toggle instantâneo nesse caso; stagger de `refreshLots` gated por `!REDUCE&&window.Motion`; skeleton (`SKELETON_HTML`) sempre substituído por render/erro.
- **Drag do bottom-sheet (`#grab`):** `SHEETDRAGY0` guarda contra spring durante o arraste; `SHEETGEN` invalida cleanups de close obsoletos; o ramo snap-back (`dy<=70`) não é dupla-fechado pelo `click` porque o `#grab` é `display:none` no desktop e, no touch, movimentos além do slop suprimem o `click`.
- **Reordenação de prédio × markers:** `ordenarBldg` reordena `LAST` via `remapPredio` (posicional) e chama só `render(LAST)` (não re-plota). Como a reordenação é intra-`ci` e o pino do prédio usa `showChooser(ci)` (estável), enquanto lotes单 permanecem na mesma posição, `markers[]` (ordem do plot) continua coerente com `LAST` — o `done`/`bestStatusPorCi` de `pick()` reprocessam o marker compartilhado corretamente.
- **Legenda de pinos (cores):** `atualizarLegenda` pinta os 4 pontos `data-status` a partir de `PINO_STYLE` (fonte única); os hex inline (bom `#2c5545`, atencao `#a8842c`, risco `#b5451f`, semdado `#57503f`) batem com `PINO_STYLE`. Itens Caixa/subutilizado/território reusam o gold de propósito, sem `data-status`.
