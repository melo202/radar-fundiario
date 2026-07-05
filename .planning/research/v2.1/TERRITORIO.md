# Território/Captação + Malha Mobile/Choropleth — v2.1

**Domínio:** ferramentas de corretor sobre cadastro fiscal determinístico (Radar Fundiário Goiânia)
**Pesquisado:** 2026-07-04
**Confiança geral:** ALTA (achados fundados em leitura direta do código existente — `radar-goiania.html`, `caixa-goiania.js` — e nos testes empíricos já documentados em `INTELIGENCIA-radar.md`; não há chamada de API externa nova neste pacote, então não há dependência de Context7/docs de terceiros)

## Sumário executivo

Todas as seis ferramentas de Território/captação pedidas já têm o dado e o padrão de consulta necessários **rodando em produção hoje** — o app não precisa de nenhum endpoint novo, só de reorganizar chamadas que a busca de endereço, o motor de comparáveis (`getComps`/`compsStats`) e o laudo já fazem. O ponto de atenção real não é "é possível?", é "é barato?": para setores grandes (Bueno tem 57.225 lotes), a varredura completa via `fetchWhere` (que a busca de endereço usa) baixa `outFields=*` em páginas de 2000 — 29 requisições pesadas. O motor de comparáveis já resolveu esse problema para vizinhanças com `returnCountOnly` + busca binária em escala log, mas isso dá só percentis de UM campo por vez (R$/m²). O Painel do Território precisa de **múltiplas variáveis correlacionadas por lote** (venal, área, IPTU, data, uso) — para isso não existe truque de contagem: é preciso baixar os atributos linha a linha. A resposta correta é aceitar esse custo mas **pagá-lo uma vez só, cacheado**, e paginar em `outFields` restrito (nunca `*`) já que o endpoint só aceita `outFields=*` (confirmado no PROJECT.md) — então o corte de custo vem de reduzir o nº de requisições (páginas maiores, ou aceitar 8-12s de carregamento com barra de progresso) e não de reduzir campos.

O Heatmap de R$/m² por quadra e a correção da malha mobile são a **mesma entrega**: o app já teve o feedback de que a malha de bairro fica "estranha/emaranhada" no celular, e a análise do código confirma a causa raiz — hoje todo bairro tem a MESMA linha (`BAI_STYLE`, cor `--line` #c3b9a3, weight 1, fillOpacity .03) até o toque, então 1.206 polígonos com contorno idêntico competem visualmente por atenção. Migrar esse fill neutro para um choropleth por R$/m² dá à malha um propósito visual (cor = informação) e resolve o "emaranhado" DE GRAÇA, porque a atenção passa a ser guiada pela cor, não pela linha. A malha ociosa deixa de "gritar" porque a informação vem do preenchimento (fill), não do traço — o traço pode ficar ainda mais fino/opaco no estado idle.

O Diff de Cadastro e o Caderno de Território são os dois itens que introduzem **armazenamento novo no navegador** (hoje só `localStorage` para preferências pequenas — `radar_sat`, `radar_prof`, `radar_coach`). Ambos precisam de IndexedDB pela natureza do dado (histórico versionado por lote, potencialmente centenas de registros por setor salvo) — usar `localStorage` para isso violaria o limite prático de ~5MB e o padrão síncrono já usado só serve para blobs pequenos como o perfil do corretor.

## Achados-chave

**Custo do endpoint:** o único jeito validado de obter estatística (mediana/quartis) de UM campo numérico sem baixar registro é `returnCountOnly=true` + aritmética no WHERE + busca binária em escala log (documentado e testado em `compsStats`, `radar-goiania.html:1631-1663`). Isso NÃO se generaliza para "painel com 5 variáveis" — cada variável pedida exigiria sua própria busca binária, e cruzamentos (ex.: mediana de IPTU SÓ nos lotes com venal alto) não são expressáveis como uma única aritmética no WHERE. Logo, o Painel do Território precisa baixar os lotes do setor (com `outFields` restrito, paginado), não apenas contar.

**Malha mobile:** a causa do "emaranhado" é estilo uniforme (`BAI_STYLE`) sem hierarquia visual até o toque — confirmado lendo `baiStyle()`/`BAI_HOVER`/`onEachBairro` (linhas 811-951). A correção de UX (idle-fraco / highlight-forte / choropleth) e o Heatmap de território são a mesma mudança de arquitetura de estilo, só com fonte de cor diferente (uma é preço, outra é decorativa/neutra).

**LGPD:** nenhuma das seis ferramentas precisa de dado de terceiro sensível. Todas operam sobre campos já whitelisted no app (`vlvenal`, `areaedif`, `areaterr`, `vlimp98`, `dtinclusao`, `uso`, `cdbairro`, `nrquadra`) e o próprio `INTELIGENCIA-radar.md` já bane `dtnascimen`. O Caderno/Diff introduz anotação do PRÓPRIO corretor (nota, tag, status) — isso é dado do usuário sobre o usuário, não coleta de terceiro; mesma lógica já aplicada ao `radar_prof` (perfil do corretor no laudo).

## Implicações para o roadmap

Ordem de construção sugerida (ver seção 4 abaixo para detalhe):
1. Malha mobile (idle/highlight) + esqueleto do choropleth — desbloqueia visualmente o v2.1 e é pré-requisito de estilo para o Heatmap
2. Setor-scan genérico (função compartilhada, paginado, cacheado) — pré-requisito de dado para Painel, Heatmap, Detector, Farming, Diff
3. Painel do Território (consome o setor-scan)
4. Heatmap/choropleth por quadra (consome o setor-scan + reusa a paleta do item 1)
5. Detector de lote subutilizado (consome o setor-scan, é um filtro sobre o mesmo array)
6. Farming + Caderno (localStorage/IndexedDB, não depende do setor-scan)
7. Diff de cadastro (IndexedDB, depende do setor-scan para gerar o snapshot)
8. Cruzamento com Caixa (depende do Farming existir; é geometria simples sobre dado já plotado)

**Pitfall crítico a levar para o roadmap:** setor-scan completo em Bueno (57k lotes) SEM filtro adicional é caro e arrisca 502 sob carga — todo consumidor do setor-scan deve reusar o MESMO cache de sessão por `cdbairro`, nunca disparar scans paralelos duplicados (Painel + Heatmap + Detector abertos ao mesmo tempo não devem gerar 3 varreduras).

## Confiança

| Área | Confiança | Nota |
|---|---|---|
| Viabilidade técnica dos 6 itens | ALTA | Toda leitura vem do código-fonte já em produção, sem chamada nova |
| Custo real de requisições (nº de páginas/tempo) | MÉDIA | Extrapolado de `fetchWhere`/`compsStats` já testados, mas nenhum teste ao vivo do scan completo do Bueno foi feito nesta pesquisa |
| Escolha IndexedDB vs localStorage | ALTA | Baseada em limites documentados de ambas APIs + padrão já usado no app |
| Recomendação de malha/choropleth | ALTA | Análise direta do CSS/JS de estilo existente; segue heurísticas conhecidas de cartografia temática (ColorBrewer/quantis) já citadas como filosofia do próprio projeto |

---

## 1. Ferramentas de Território/Captação

### 1.1 Painel do Meu Território

**O que é:** ao escolher um setor (o mesmo combo/autocomplete que a busca de endereço já usa), mostra mediana + Q1–Q3 de R$/m² venal (por `areaedif` se residência, por `areaterr` se terreno), IPTU mediano (`vlimp98`), idade mediana do cadastro (`dtinclusao`), nº de lotes e mix de uso (`uso`).

**Dados:** `vlvenal`, `areaedif`, `areaterr`, `vlimp98`, `dtinclusao`, `uso`, `nrquadra` — todos já lidos pelo app em outros contextos (card de detalhe, comparáveis).

**Chamadas ao endpoint:** reusa exatamente o padrão de `fetchWhere` (linha 1153) com `where=cdbairro=X AND vlvenal>0`, mas trocando `outFields=*` por uma lista restrita (`vlvenal,areaedif,areaterr,vlimp98,dtinclusao,uso,nrquadra,nrlote,ci,x_coord,y_coord`) — **o endpoint só aceita `outFields=*`** (confirmado no PROJECT.md: "só `outFields=*`"), então na prática **não há como restringir campos**; o payload por registro vem sempre com todos os ~85 campos. Isso muda o cálculo de custo: a economia não vem de "menos campos", vem de "menos requisições" (páginas de 2000 já é o máximo prático) e de **cachear o resultado por `cdbairro` na sessão** (mesmo padrão do `CMPCACHE`/`capCache` já usado nos comparáveis).

**Custo estimado:**
- Setor pequeno/médio (até ~4.000 lotes, ex.: bairros novos): 2 páginas de 2000, ~2 requisições, poucos segundos.
- Setor grande (Bueno, 57.225 — número já citado em `INTELIGENCIA-radar.md`): ~29 páginas de 2000 = 29 requisições sequenciais de payload pesado (85 campos × 2000 linhas). Isso é MUITO mais caro que qualquer coisa que o app faz hoje (a maior operação atual, `compsStats` com `n<=400`, baixa só 1 página de até 500). É viável, mas precisa de: (a) barra de progresso real ("varrendo página 12 de ~29"), (b) execução em segundo plano com resultado cacheado por sessão (não recalcular a cada abertura do painel), (c) considerar iniciar com `returnCountOnly` primeiro para decidir se avisa o usuário do tempo esperado antes de disparar tudo.
- Alternativa mais barata para setor grande: pedir primeiro só a mediana de R$/m² via busca binária (idêntica a `compsStats`, mas com raio = setor inteiro via `cdbairro=X` em vez de geometria) — cobre a métrica mais importante do painel (mediana + Q1-Q3 de venal) SEM baixar nenhum registro. As métricas que exigem correlação entre campos (IPTU mediano DENTRO da faixa de venal alto, mix de uso) continuam exigindo o download completo, mas podem ser uma segunda etapa "expandir análise completa" opcional, não o carregamento padrão do painel.

**LGPD:** nenhum campo pessoal. `dtinclusao` é idade do cadastro do imóvel (já classificada como inofensiva no `INTELIGENCIA-radar.md`), nunca `dtnascimen`.

**Classificação:** **Diferenciador de alto impacto** — nenhuma ferramenta pública dá isso por bairro em Goiânia hoje (nem o próprio site da Prefeitura). Esforço médio (a parte cara é UX de espera para setores grandes, não a lógica).

---

### 1.2 Heatmap de R$/m² venal por quadra (= choropleth)

**O que é:** colore cada quadra (ou lote) pelo quantil de R$/m² venal relativo ao próprio setor — a mesma filosofia "relativa, imune à defasagem da PGV" que já rege os comparáveis.

**Dados:** mesmo conjunto do Painel (1.1) — na prática é o MESMO setor-scan, só que agrupado por `nrquadra` em vez de por setor inteiro, e usado para pintar polígono em vez de (ou além de) mostrar número.

**Chamadas ao endpoint:** zero chamadas adicionais se o Painel (1.1) já rodou para aquele setor — é reuso do mesmo array de lotes, só que sem geometria de lote teria que reconsultar geometria. Duas opções de granularidade:
- **Por quadra (recomendado para v2.1):** não precisa de geometria de quadra própria (o ArcGIS tem layer de lote/bairro, mas quadra como polígono próprio não foi confirmado) — em vez de colorir um polígono de quadra, colorir os PONTOS/POLÍGONOS DE LOTE (layer 0, já desenhado pelo `refreshLots`) usando a cor do quantil da quadra a que pertencem. Isso é literalmente trocar `lotStyle()` de uma cor fixa para uma função que recebe o R$/m² do lote e retorna a cor do quantil — o padrão de "função de resolução de estilo, não objeto cru" já está preparado para isso (comentário explícito na linha 813 do código: *"função de resolução de estilo (não objeto cru) — deixa a extensão v2.1 (styling por território) barata"*). Ou seja, **o próprio autor do v2.0 já deixou o gancho pronto para este heatmap.**
- **Por bairro (visão de cidade, zoom afastado):** usar o `bairroLayer` (`bairros-goiania.json`, já carregado estaticamente) e colorir cada polígono de bairro pela mediana de R$/m² daquele `cdbairro` — populado incrementalmente conforme o usuário visita setores (não precisa pré-computar os 1.206 de uma vez).

**Custo:** zero requisições novas quando reaproveita o setor-scan de 1.1. Isolado (sem Painel aberto), custa o mesmo que 1.1 para aquele setor.

**LGPD:** nenhum dado pessoal; é agregação estatística de valor fiscal público.

**Classificação:** **Diferenciador de alto impacto e baixo esforço incremental** (o hook de estilo já existe). É também a peça que resolve a UX da malha mobile — ver seção 2.

---

### 1.3 Detector de lote subutilizado

**O que é:** marca lotes com razão `areaedif/areaterr` baixa (ou `areaedif≈0` = terreno vago) DENTRO de quadras cujo R$/m² venal mediano é alto — o "lote que pede desenvolvimento".

**Dados:** `areaedif`, `areaterr`, `vlvenal`, `nrquadra` — mesmo conjunto do setor-scan.

**Chamadas ao endpoint:** zero adicionais — é um filtro client-side sobre o array já baixado em 1.1/1.2. `areaedif/areaterr` é aritmética pura em JS (não precisa nem repetir o truque de "aritmética no WHERE" do servidor, já que os dados estão no navegador).

**Cuidado de qualidade de dado:** `areaedif=0` real (terreno vago) precisa ser distinguido de `areaedif=null`/ausente (registro incompleto) — o app já trata isso em outros pontos com `a.areaedif?...:"—"`; replicar o mesmo padrão de guarda para não marcar registro incompleto como "oportunidade".

**LGPD:** nenhum dado pessoal.

**Classificação:** **Diferenciador de médio impacto, baixo esforço** (é literalmente um `.filter().sort()` sobre dado que outra ferramenta já busca). Só vale a pena depois do setor-scan genérico existir (1.1).

---

### 1.4 Farming de território + Caderno (localStorage/IndexedDB)

**O que é:** salvar setor/lotes de interesse, com tags, notas e status ("não visitado/visitei/recusou"), navegação de retorno.

**Dados:** chave = `ci`/`nrinscr` (inscrição do lote, já é o identificador natural no app) + metadados do PRÓPRIO corretor (tag, nota, status, data). Não lê nenhum campo novo do cadastro.

**Armazenamento:** ver decisão de storage na seção 4 — **IndexedDB**, não `localStorage`, porque o volume esperado (múltiplos setores × centenas de lotes marcados ao longo do tempo, com texto livre em notas) pode ultrapassar confortavelmente o padrão de uso do `localStorage` hoje (que só guarda flags/JSON pequenos: `radar_sat` um char, `radar_prof` um objeto de perfil, `radar_coach` uma flag). Mesmo que o volume real fique pequeno no início, a API de IndexedDB permite consulta indexada por `cdbairro`/status sem reserializar um blob JSON gigante a cada escrita (que é o que aconteceria com `localStorage.setItem` de um objeto que cresce).

**LGPD:** explicitamente SEM risco — é anotação do próprio corretor sobre observações de campo dele mesmo ("dono quer vender", "reformado"), nunca dado cadastral de titular/terceiro. Mesmo raciocínio já usado para justificar `radar_prof` (dado do próprio usuário). Recomendação de postura: no texto de ajuda do Caderno, deixar explícito "essas notas são suas, ficam só no seu aparelho" — reforça a defesa LGPD e también a confiança do usuário (nada sobe a servidor, pois o app não tem backend).

**Export/import:** vale oferecer export/import JSON (o corretor troca de celular, quer backup) — isso é a MESMA UI de export CSV que o app já tem para resultados de busca, só que aplicada ao dump do IndexedDB.

**Classificação:** **Diferenciador de alto impacto** (é a fundação de retenção — sem memória, o corretor não volta ao app entre visitas) e **esforço médio** (a lógica é simples, o trabalho é a superfície de UI: lista filtrável, tags, pinos próprios no mapa).

---

### 1.5 Diff de cadastro entre visitas

**O que é:** ao reabrir o Painel do Território de um setor já salvo, compara o snapshot atual com o snapshot da visita anterior e lista o que mudou: lotes novos, venal que subiu/desceu (%), área construída que cresceu, imóveis que saíram do cadastro.

**Dados:** snapshot por lote com `ci`/`nrinscr`, `vlvenal`, `areaedif`, `vlimp98`, `dtinclusao`, `nrquadra`, `nrlote` — **nunca `dtnascimen`** (regra já fixada em `INTELIGENCIA-radar.md`, seção "Regras de exibição (fixas)"). Esse é literalmente o mesmo array do setor-scan (1.1), só que persistido em vez de descartado ao fechar a aba.

**Chamadas ao endpoint:** zero adicionais — reusa o setor-scan de 1.1; o "diff" é uma comparação client-side entre dois arrays JS (snapshot antigo lido do IndexedDB vs. snapshot novo baixado agora).

**Armazenamento:** **IndexedDB obrigatório** — é histórico versionado (múltiplos snapshots por setor ao longo do tempo), potencialmente milhares de linhas para um setor grande. `localStorage` (síncrono, string-based, limite prático ~5MB por origem) travaria a UI ao serializar/deserializar um snapshot de 10k+ linhas a cada leitura/escrita. Estrutura sugerida: um object store `snapshots` com chave composta `cdbairro + data`, e um índice secundário por `ci` para montar o diff sem carregar tudo na memória de uma vez (embora para um único setor isso provavelmente seja overkill de otimização — na prática carregar os dois arrays completos em memória e comparar em JS puro é suficiente até a escala de um setor grande).

**LGPD:** mesmo campo-set do setor-scan, já limpo de PII. Vale reforçar explicitamente no código/comentário (como já é praxe no projeto: "nunca gravar dtnascimen") já na função que monta o snapshot, para não reintroduzir o campo por acidente numa refatoração futura.

**Classificação:** **Diferenciador de alto impacto, esforço médio** — depende do Farming (1.4) existir para ter "meu setor salvo" como gatilho, e do setor-scan (1.1) para gerar os snapshots.

---

### 1.6 Cruzamento dos imóveis Caixa com o território salvo

**O que é:** destacar quais imóveis Caixa (já plotados via `caixa-goiania.js`/`CAIXA.imoveis`) caem dentro do setor/quadra que o corretor salvou como território.

**Dados:** `CAIXA.imoveis[i].x`/`.y` (coordenadas UTM, já convertidas via `toWGS` no app) comparadas contra o `cdbairro`/geometria do território salvo pelo corretor.

**Chamadas ao endpoint:** zero — é geometria pura client-side. Duas formas, por ordem de simplicidade:
- **Comparação por `cdbairro`:** se o Caixa já vier com bairro identificado (`i.b`, visto em `caixaPopup`) e o território salvo for por `cdbairro`, o cruzamento é um simples `.filter()` por igualdade de código/nome de bairro — nenhuma geometria envolvida.
- **Comparação geométrica fina (point-in-polygon):** se o território salvo for um recorte de quadra (não o setor inteiro), precisa de point-in-polygon contra a geometria do bairro/quadra — o app já faz isso em outro contexto (`Mapa_ModeloEspacial`, citado no `INTELIGENCIA-radar.md` como "point-in-polygon ao vivo"), então a técnica já está validada no projeto, só precisa ser aplicada aqui.

**LGPD:** nenhum dado pessoal — Caixa já é lista pública de venda, cadastro já é público, o cruzamento é geometria.

**Classificação:** **Diferenciador de médio impacto, esforço baixo** — mas depende do Farming (1.4) existir (não há "território salvo" para cruzar sem ele). Colocar por último na ordem de build.

---

## 2. UX da malha mobile + choropleth (com a composição de satélite)

### Diagnóstico da causa raiz (confirmado no código)

Hoje `BAI_STYLE` (linha 811) aplica a MESMA linha/preenchimento aos 1.206 polígonos de bairro sempre: `color:#c3b9a3 (--line), weight:1, fillColor:#c3b9a3, fillOpacity:.03, opacity:.8`. O único estado que muda é o hover/toque (`BAI_HOVER`: cor `--accent` #b5451f, weight 2.5, fillOpacity .08). Em telas grandes, 1.206 contornos finos e uniformes se leem como textura de fundo; em tela pequena, a MESMA densidade de linha ocupa proporcionalmente muito mais espaço visual por polígono, e como todos competem com peso igual, o olho não consegue segmentar "isto é um bairro" — vira ruído. Isso bate exatamente com o relato do usuário ("emaranhado").

### Recomendação (valida a hipótese do PROJECT.md)

1. **Idle mais fraco ainda do que hoje.** Reduzir `weight` para algo entre 0.5–0.7 no estado ocioso E reduzir `opacity` da linha (não só do fill) em telas pequenas — o traço deve "sussurrar": presente para dar contexto de limites administrativos, mas nunca competir com o conteúdo. Isso é uma mudança de constante em `BAI_STYLE`, zero risco.
2. **Destaque no toque continua sendo o único "grito".** `BAI_HOVER` já usa `--accent` + weight maior + fillOpacity maior — o contraste idle/highlight só precisa aumentar porque o idle vai ficar mais fraco (passo 1). Nenhuma mudança estrutural aqui, só reforçar a distância entre os dois estados.
3. **Toque na ÁREA (fill), não só na linha — já está correto.** `bairroLayer` usa `L.geoJSON` com `renderer:L.canvas`, e o polígono inteiro (incluindo fill, mesmo com `fillOpacity:.03`) é a hit-area de clique/toque no Leaflet — `fillOpacity` baixo não desabilita a interação, só a opacidade visual. Isso já é verdade no código atual; **não é um bug a corrigir, é um ponto a validar/preservar** ao mexer no estilo (garantir que a redução de `fillOpacity` no choropleth não passe de `fillOpacity:0`, que aí sim tira o polígono do fluxo de eventos de toque no Canvas renderer do Leaflet — manter um mínimo como `.02`–`.03` mesmo nas cores "vazias" do choropleth).
4. **Densidade/peso emergindo com o zoom.** Hoje a malha de bairro já desaparece em `zoom>=17` (dá lugar aos lotes) — esse gate já existe. O que falta é um passo intermediário: em zoom de cidade (11-13), pode ser válido AGRUPAR visualmente reduzindo ainda mais o weight/opacity (quase invisível, só sombra de contexto), e só "acordar" a malha com weight/opacity plenos a partir de zoom ~14-16, quando o usuário já está olhando para uma região menor e tem banda visual para absorver os contornos individuais. Isso é uma função de `weight`/`opacity` parametrizada por `map.getZoom()` dentro de `baiStyle()`, no mesmo padrão que já existe para `satelliteOn`.

### O choropleth como resolução estrutural (não só cosmética)

A mudança mais importante é conceitual: em vez de a malha ser **decorativa** (contorno neutro sempre com a mesma cor), ela passa a **carregar informação** (cor = R$/m² relativo). Isso resolve o "emaranhado" por uma razão perceptual concreta: quando 1.206 formas têm cores DIFERENTES e com significado, o cérebro as processa como um mapa temático (categorização por cor, processamento pré-atento) em vez de como textura repetitiva de linha. A studies de cartografia (a própria metodologia do projeto já cita ColorBrewer/quantis implicitamente ao usar "escala de quantis" nos comparáveis) apoia isso: **paleta sequencial de poucos degraus (5-7 quantis), nunca gradiente contínuo** — gradiente contínuo em 1.206 polígonos pequenos volta a ser ruído visual; quantis discretos com poucas cores é o que o olho segmenta bem em tela pequena.

- **Fonte de cor:** reusar a mesma paleta de "confiança" que os comparáveis já usam (`conf[0]` classifica em `alta/media/baixa` com classes CSS já existentes) — estender esse vocabulário de classes CSS para 5-7 faixas de quantil, evita introduzir uma paleta nova conceitualmente desconectada do resto do app.
- **Populações incrementais, não pré-computação:** o choropleth por bairro só pode colorir os setores que o corretor já visitou/escaneou (1.1) — bairros nunca escaneados ficam no estilo neutro atual (linha fraca, sem fill informativo) até serem consultados. Isso é honesto (não simula dado que não existe) e barato (zero pré-computação de 1.206 setores).

### Composição com o satélite

O app já resolve esse problema para a malha atual (`baiStyle()` tem branch explícito `satelliteOn ? {...} : BAI_STYLE`, linha 816-819: sobre satélite, sobe `weight` para 1.5 e ZERA `fillOpacity`, para não lavar a imagem de satélite com um wash de cor sólida). O choropleth PRECISA manter esse princípio, mas invertido: sobre satélite, o fill É a informação (não pode ir a zero, senão o choropleth desaparece) — a solução é **subir a opacidade do fill moderadamente sobre satélite** (não 0, algo como .35-.45, já que a imagem por trás é escura/colorida e precisa de um fill mais opaco para o quantil ser legível) e ao mesmo tempo aumentar o contraste do traço de borda entre quadras/bairros (`weight` maior, cor clara ou escura conforme o tema) para separar visualmente polígonos vizinhos de quantil parecido. Sobre o mapa base claro (CARTO light), o fill pode ficar mais sutil (.15-.25) porque o fundo já é neutro e não compete com a cor do choropleth.

### Legenda

Precisa de uma legenda compacta e tocável (não um painel grande) — dado que o app já usa chips/badges pequenos em outros contextos (selo de confiança dos comparáveis), a legenda do choropleth deve seguir o mesmo padrão visual: uma faixa horizontal fixa (5-7 blocos de cor com o rótulo de faixa de R$/m² abaixo) ancorada num canto do mapa, recolhível, com toggle para "desligar heatmap / malha neutra" — importante para quem quer só a malha de contexto sem a camada de análise.

---

## 3. Storage: localStorage vs IndexedDB

| Caso de uso | Escolha | Razão |
|---|---|---|
| Preferência de satélite (`radar_sat`), perfil do corretor (`radar_prof`), flag de coach-mark (`radar_coach`) | **localStorage** (já em uso, manter) | Blobs pequenos, síncronos, poucos KBs, escrita pouco frequente — exatamente o caso de uso ideal do `localStorage` |
| Farming/Caderno de território (1.4) — lotes marcados, tags, notas, status | **IndexedDB** | Volume cresce ao longo de meses/anos de uso de campo; escrita/leitura indexada por `ci`/`cdbairro`/status evita reserializar um blob JSON gigante a cada nota adicionada; suporta texto livre (notas) sem risco de estourar o limite prático de 5MB do `localStorage` |
| Diff de cadastro (1.5) — snapshots versionados por setor | **IndexedDB** (obrigatório) | É histórico: múltiplos snapshots ao longo do tempo, por setor, cada um com centenas/milhares de linhas — impraticável em `localStorage` tanto por tamanho quanto por custo de serialização síncrona (bloquearia a UI a cada save/load) |

**Nota de implementação:** como o app é 100% arquivo único sem build, usar IndexedDB direto (API nativa do browser, sem lib wrapper) é consistente com a filosofia "zero dependência nova sem CDN" — a API nativa é verbosa mas totalmente suportada offline (PWA já existe) e não exige nenhuma biblioteca adicional embutida no HTML único.

---

## 4. Ordem de build sugerida (consolidado)

1. **Malha mobile — idle/highlight** (ajuste de constantes `BAI_STYLE`/zoom, zero dependência) — desbloqueia a UX imediatamente, isolado, sem risco.
2. **Setor-scan genérico compartilhado** (função única, cacheada por `cdbairro`, com barra de progresso para setores grandes) — pré-requisito de dado de 1.1, 1.2, 1.3, 1.5. Construir ANTES de qualquer ferramenta de Território para não duplicar a lógica de paginação/cache 4 vezes.
3. **Choropleth (heatmap) usando o hook de estilo já existente em `lotStyle()`/`baiStyle()`** — reusa o setor-scan do passo 2, entrega ao mesmo tempo a ferramenta 1.2 E a resolução visual completa da malha mobile (passo 1 + choropleth = a "ponte pro heatmap" que o PROJECT.md já prevê).
4. **Painel do Meu Território (1.1)** — consome o setor-scan; primeira ferramenta "visível" de Território.
5. **Detector de lote subutilizado (1.3)** — filtro barato sobre o mesmo array, entrega rápida depois do passo 2.
6. **Farming + Caderno (1.4)** — introduz IndexedDB; independente do setor-scan (pode ser construído em paralelo aos passos 2-5).
7. **Diff de cadastro (1.5)** — depende de 2 (gera snapshot) e 6 (precisa de "meu território salvo" como gatilho de comparação).
8. **Cruzamento com Caixa (1.6)** — depende de 6 (precisa de território salvo para cruzar); esforço baixo, deixar por último.

**Research flags para fases futuras:**
- Fase do setor-scan genérico: medir ao vivo o tempo real de varredura do Bueno (57k) em 4G antes de fixar a UX de progresso — hoje é estimativa por extrapolação de `fetchWhere`, não teste empírico.
- Fase do choropleth: validar visualmente em device real (Android médio, luz de sol) se a paleta de quantis sobre satélite tem contraste suficiente — mesma verificação de campo pendente já citada no PROJECT.md para labels sobre satélite.

## Fontes

- `radar-goiania.html` (leitura direta: `jsonp`/`jsonpOnce` linhas 700-718; `fetchWhere` 1153-1165; `compsBase`/`compsStats`/`renderComps` 1584-1701; `BAI_STYLE`/`baiStyle`/`onEachBairro`/`highlightBairro` 796-963; `localStorage` usage 760-792, 1712-1820; Caixa 2022-2069)
- `caixa-goiania.js` (estrutura `CAIXA.imoveis[]`, `CAIXA.fatores`, campos `x`,`y`,`b`,`e`,`p`,`a`,`d`,`m`,`u`,`pr`)
- `INTELIGENCIA-radar.md` (achados empíricos: `returnCountOnly`, aritmética no WHERE, busca espacial por raio, regra `dtnascimen`, tamanho do Setor Bueno)
- `IDEIAS-hub-corretor.md` (lente território — descrições originais das 6 ferramentas, esforço/impacto já sugeridos pelo autor)
- `.planning/PROJECT.md` (quirks confirmados do endpoint: só `outFields=*`, `returnGeometry=true` aceito, 502 sob carga, EPSG:31982 zona 22)
