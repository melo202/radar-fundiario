# Auditoria Fable 5 — Área 05: TERRITÓRIO (Setor-Scan, Choropleth & Painel)

- **Área:** 05 — Território: setor-scan, choropleth & painel
- **Arquivo:** `radar-goiania.html`
- **Data:** 2026-07-10
- **Auditor:** Fable 5 (somente-leitura)
- **Baseline de testes:** 252 passando (`npm test`, confirmado antes e durante a auditoria)
- **Escopo:** funções de varredura de setor, estatística pura, choropleth, painel, legenda, chips tri-state e cache. SEM análise de segurança.
- **Método:** leitura + execução das funções puras via `node:vm` (mesmo padrão de `tests/territorio.test.mjs`) com dados de borda (0/1 lote, todos iguais, valores nulos, quantis degenerados) e stub de rede para provar o comportamento do orçamento HARD.

Já conhecidos (NÃO re-reportados): `rotuloAmostra` plural "1 de 1 lotes"; `ZONALAST` traço estático no zoom.

---

## Achados

### [TERR-01] radar-goiania.html:2367 (breaksQuantil) / 2374 (binQuantil) / 3326 (montarLegenda) | ALTA | Quantis degenerados: faixas médias vazias, legenda "R$X–R$X" e choropleth quase monocromático
**Descrição:** Com amostra pouco dispersa (todos os `pm2` iguais, ou muitos iguais + 1 outlier), os 4 cortes de `breaksQuantil` colapsam em valores idênticos. `binQuantil` então joga TODOS os lotes na faixa 1 (`v<=breaks[0]` já verdadeiro para o valor único), e a legenda montada por `montarLegenda` exibe faixas 2/3/4 como intervalos degenerados "R$ 50–R$ 50".
**Cenário (PROVADO via node:vm):**
- 10 lotes com `pm2=50`: `breaks=[50,50,50,50]`; legenda = `["≤ R$ 50","R$ 50–R$ 50","R$ 50–R$ 50","R$ 50–R$ 50","≥ R$ 50"]`; todos os 10 lotes → bin 1 (0 lotes nas faixas 2–5).
- 9 lotes `pm2=50` + 1 outlier: `breaks=[50,50,50,50]`; 9 lotes → bin 1, outlier → bin 5; faixas 2/3/4 permanecem vazias e rotuladas "R$ 50–R$ 50".
- `[1,1,1,1,1,1,1,100]`: `breaks=[1,1,1,1]`; faixa 2 rotulada "R$ 1–R$ 1".

Isso contradiz o próprio contrato documentado de `binQuantil` ("mínimo do setor cai em 1, máximo em 5"): quando a amostra é degenerada, min e max caem na mesma faixa e o mapa fica praticamente monocromático, com uma legenda de 5 tiers que finge granularidade inexistente — falha de honestidade estatística.
**Proposta:** detectar `breaks` não-estritamente-crescente (ou `breaks[0]===breaks[3]`) e, nesse caso, colapsar a legenda para 1 faixa ("valor uniforme no setor: R$X/m²") em vez de exibir intervalos degenerados; ou rotular só as faixas efetivamente populadas.

---

### [TERR-02] radar-goiania.html:3983-3989 (fetchWhereRestrito/varrePaginas) | MÉDIA | Orçamento HARD ≤3 páginas é contornável sob rejeição de rede (só conta `d.error`, não exceção do jsonp)
**Descrição:** `guardTotal` só é incrementado APÓS o `await jsonp(...)` retornar (linha 3989). Se o `jsonp` **rejeita** (timeout/erro de rede) em vez de resolver com `d.error`, o `guardTotal++` é pulado, o `catch` de `fetchWhereRestrito` dispara o fallback `outFields="*"`, e a página que já bateu na rede não é debitada do orçamento. O teste existente ("falha na 2ª página … nunca excede 3") só cobre o caminho `d.error` (que incrementa antes do throw), deixando o caminho de rejeição sem cobertura.
**Cenário (PROVADO via node:vm, stub de jsonp):** tentativa restrita — página 1 OK, página 2 OK, página 3 **rejeita** (network throw) → fallback `"*"` executa mais 1 página. Requisições HTTP paginadas REAIS disparadas = **4** (`__terrReq`=3), acima do HARD documentado de 3. Controle com `d.error` na 3ª página = 3 (correto). Pior caso (rejeição também no fallback) chega a ~5 round-trips reais.
**Proposta:** incrementar `guardTotal` (ou um contador de "tentativas de rede") ANTES do `await`, ou envolver o `jsonp` num wrapper que debita o orçamento independentemente de resolver/rejeitar, para que o teto reflita round-trips reais, não só respostas bem-sucedidas.

---

### [TERR-03] radar-goiania.html:4016 (territorioScanRun) | MÉDIA | Fallback `total = lotes.length` no `returnCountOnly` finge censo completo ("Amostra de N de N")
**Descrição:** `const total=(totalD&&totalD.count)||lotes.length;`. Se a consulta `returnCountOnly` falha ou volta sem `count`, `total` cai para o nº de lotes BAIXADOS (até 6.000). Como `rotuloAmostra(n,total)` é a única garantia de honestidade estatística do produto, o rótulo passa a dizer "Amostra de N de N lotes" — sugerindo cobertura total do setor — mesmo quando o setor real pode ter dezenas de milhares de lotes e o count simplesmente falhou.
**Cenário:** setor com 20.000 lotes; amostra baixa 6.000; `returnCountOnly` falha → `total=6.000` → painel/legenda exibem "Amostra de 5.8xx de 6.000 lotes", indistinguível de um setor pequeno totalmente coberto.
**Proposta:** quando o count falhar, marcar `total` como indeterminado (ex.: `null`) e o rótulo como "Amostra de N lotes (total do setor indisponível)" em vez de igualar total à amostra.

---

### [TERR-04] radar-goiania.html:3336 (montarLegenda) vs 4578 (renderDetectorLista) | MÉDIA | Numeradores de amostra divergentes para o MESMO setor (legenda usa `st.n`, detector usa `scan.lotes.length`)
**Descrição:** A legenda/painel chamam `rotuloAmostra(st.n, st.total)`, onde `st.n` = lotes com `pm2` VÁLIDO (`estatTerritorio` filtra `pm2Lote!=null`, linha 2421-2422). O Detector de Subutilizados chama `rotuloAmostra(scan.lotes.length, scan.total)` — o nº BRUTO de lotes baixados. Como lotes com `areaedif` e `areaterr` ambos ausentes/0 são descartados de `n` mas contam em `scan.lotes.length`, o mesmo setor exibe DOIS rótulos de honestidade diferentes conforme a view aberta.
**Cenário:** setor com 5.000 lotes baixados, 200 sem área válida → legenda diz "Amostra de 4.800 de 5.000 lotes"; abrir o detector no mesmo setor diz "Amostra de 5.000 de 5.000 lotes". O usuário vê duas afirmações de cobertura conflitantes para o mesmo dado.
**Proposta:** padronizar o numerador (ambos usando `st.n`, ou ambos `scan.lotes.length`, com rótulos distintos quando as populações forem legitimamente diferentes) para não exibir contagens de amostra contraditórias.

---

### [TERR-05] radar-goiania.html:4342 (abrirTerritorio → montarLegenda:3338) | MÉDIA | Legenda de valor revelada fora da fonte-única-de-verdade: swatches coloridos aparecem com o choropleth DESLIGADO
**Descrição:** `sincCamadaChips` é documentada (linha 3379) como fonte única da visibilidade de `#terrLegenda`. Porém `montarLegenda` faz `leg.hidden=false` direto (linha 3338), e `abrirTerritorio` chama `aplicarChoropleth`+`montarLegenda`+`montarPainel` SEM passar por `toggleCamadaTematica`/`sincCamadaChips` e SEM setar `CHOROPLETH_ON=true`. Resultado ao abrir o painel: a legenda com os 5 swatches coloridos e faixas R$/m² fica visível, o botão "Colorir por valor" continua `aria-pressed="false"`, e o mapa NÃO está colorido — a legenda anuncia uma coloração que não existe no mapa e dessincroniza da fonte única.
**Cenário:** hover num bairro → "Ver território" → painel abre; legenda de cores aparece populada, chips off, lotes/bairro sem wash. Usuário lê a legenda como se o choropleth estivesse ativo.
**Proposta:** rotear a revelação da legenda por `sincCamadaChips` (ou só revelar quando `CHOROPLETH_ON===true`), mantendo a legenda oculta enquanto nenhuma camada temática estiver ligada.

---

### [TERR-06] radar-goiania.html:3296 (aplicarChoropleth) / 4341 (abrirTerritorio) | MÉDIA-BAIXA | Trocar de setor com "valor" já ligado deixa o wash do setor ANTERIOR aceso (aplicarChoropleth não redesenha)
**Descrição:** `aplicarChoropleth` atualiza estado (`TERR_LOTE_BIN=new Map()`, `TERR_SETOR_ATIVO.clear().add`, `TERR_BREAKS`) mas, por design, NÃO chama `desenharChoropleth`. `abrirTerritorio` também não o chama. Logo, se `CHOROPLETH_ON` já estava `true` (usuário ligou "valor" no setor A) e ele abre o painel do setor B, `TERR_SETOR_ATIVO` passa a apontar B, mas `bairroLayer`/`lotLayer` mantêm o `setStyle` antigo (wash de A) até o próximo `moveend` disparar `refreshLots`/re-estilo. Como `abrirTerritorio` não move o mapa, o choropleth no mapa fica dessincronizado do painel/legenda (que já mostram B).
**Cenário:** ligar "Colorir por valor" no setor A; hover no setor B → "Ver território". Painel e legenda mostram estatística de B; o polígono de A continua washado e o de B fica sem wash até um pan/zoom manual.
**Proposta:** em `abrirTerritorio`, chamar `desenharChoropleth()` após `aplicarChoropleth` quando `CHOROPLETH_ON` (ou sempre — é idempotente e barato via `setStyle`).

---

### [TERR-07] radar-goiania.html:2439 (rotuloAmostra) | BAIXA | Sem clamp de `n>total` → "Amostra de 6.000 de 4.000 lotes"
**Descrição:** `rotuloAmostra` concatena `n` e `total` sem invariante `n<=total`. Como amostra (`fetchWhereRestrito`) e count (`returnCountOnly`) rodam em `Promise.all` contra uma base viva, ou quando o count volta menor/obsoleto, é possível `n>total`, produzindo um rótulo aritmeticamente absurdo que mina a credibilidade da honestidade estatística.
**Cenário (PROVADO):** `rotuloAmostra(6000,4000)` → `"Amostra de 6.000 de 4.000 lotes"`.
**Proposta:** `const t=Math.max(n,total);` (ou clamp explícito com aviso) antes de compor o rótulo, garantindo `n<=total` sempre.

---

## Observações menores (não elevadas a achado)

- **Viés de amostragem em setores grandes:** `fetchWhereRestrito` baixa até 6.000 lotes ordenados por `OBJECTID` (mais antigos primeiro), não uma amostra aleatória. Em setores >6.000 lotes, mediana/quartis do painel são calculados sobre um subconjunto enviesado por ordem de cadastro. É um trade-off documentado (orçamento HARD), mas o `rotuloAmostra` não sinaliza o viés — só a contagem.
- **`quantilAmostra([],p)` → `NaN`:** sobrevive apenas porque todos os chamadores guardam com `n?`/`length?`. `scoresDePlot` passa `estat` já derivado; robusto hoje, mas frágil a um chamador futuro sem guarda.

---

## Verificação
- `npm test` → **252/252 passando** (baseline íntegro; nenhuma alteração de código/teste feita nesta auditoria).
- Provas de borda executadas via `node:vm` sobre os blocos `RADAR_PURE` e `TERR_NET` extraídos de `radar-goiania.html` (mesmo harness de `tests/territorio.test.mjs`).
