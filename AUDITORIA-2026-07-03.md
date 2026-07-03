# Auditoria em 10 lentes — 03/07/2026

> 10 agentes em paralelo sobre o código real (827k tokens). Achados executados no mesmo dia (ver commits).

---

## Lente: bugs

Auditoria de corretude do JavaScript de radar-goiania.html (1305 linhas, lidas na íntegra). O código é em geral cuidadoso com corridas (LOTTOKEN em refreshLots, guarda DCUR em compare/renderComps, cache de Promise em CMPCACHE, btn.disabled em buscar), mas sobraram 7 bugs reais: dois de alta gravidade em cache/corrida que fazem estatísticas de UM imóvel aparecerem no painel ou no laudo de OUTRO (chave do CMPCACHE ignora área/uso da unidade; promise de getComps antiga escreve em LZ novo), perda de precisão de coordenadas no CSV (2 casas decimais ≈ 1 km), ausência de token nas buscas concorrentes (buscar/onMapClick/loadCi), estado residual na tela "Sem resultado", o indicador "analisando vizinhança" do wizard que nunca aparece por causa do valor sentinela errado, e cards de imóveis sem coordenada que não respondem ao clique.

### [ALTA] CMPCACHE indexado só por ci: unidades diferentes do mesmo prédio compartilham estatísticas e percentil errados

Em getComps (linha 945): `const key=clean(a.ci)+"|"+areaField+"|"+r;`. Todas as unidades de um condomínio têm o MESMO ci (o app usa isso para agrupar: cntCi em finish/render). Porém o WHERE de compsStats depende da área do alvo (`areaField>=${(myArea*0.5)} AND <=${(myArea*2)}`, linha 968) e do uso (`AND uso=${a.uso}`, linha 969). Cenário: usuário abre o apto 101 (60 m², residencial) e roda "Analisar vizinhança"; depois abre a cobertura 1901 (200 m²) ou uma loja do mesmo prédio — a chave é idêntica (ci|areaedif|400), então o resultado cacheado do apto 101 (comparáveis de 30–120 m², uso residencial) é exibido para a cobertura. Pior: renderComps memoiza `r.below` no objeto compartilhado (linha 1015, "memoriza: re-render não repete a consulta") calculado com o myPm2 da PRIMEIRA unidade — a frase "mais caro que X% dos vizinhos" da segunda unidade sai com o percentil da primeira. Esses números também alimentam o laudo (LZ.comps=getComps(DCUR), linha 1052).

**Correção proposta:** Incluir área e uso na chave: `const key=clean(a.ci)+"|"+areaField+"|"+Math.round(myArea)+"|"+(a.uso||0)+"|"+r;` e memoizar below por valor: trocar `r.below` por um mapa `r.below=r.below||{}; r.below[myPm2.toFixed(2)]=...`.

### [ALTA] Corrida no wizard do laudo: getComps do imóvel anterior grava LZ.comps no wizard do imóvel novo

abrirLaudo (linha 1052): `getComps(DCUR).then(g=>{if(LZ){LZ.comps=g;...}})`. O guard `if(LZ)` só testa se EXISTE um wizard aberto, não se é o MESMO. Cenário: usuário abre o laudo do imóvel A (a consulta de vizinhança leva até ~20 s, comentário na linha 956, timeout de 30 s no JSONP), fecha com ×, seleciona o imóvel B e abre o laudo de novo; a promise antiga resolve e faz `LZ.comps = comparáveis de A` dentro do wizard de B. O passo 2 mostra "Vizinhança: N imóveis parecidos" de A e montarLaudo imprime a seção "2. Análise de mercado" (n, mediana, gráfico de barras, g.myPm2 — linhas 1145-1153) com dados do imóvel errado num documento assinado (PTAM). O mesmo padrão existe em wizFoto (linha 1062): o FileReader assíncrono faz `if(LZ){LZ.fotos.push(...)}` e pode anexar fotos ao wizard de outro imóvel se o usuário fechar/reabrir rápido.

**Correção proposta:** Capturar a instância: em abrirLaudo, `const lz=LZ; getComps(DCUR).then(g=>{if(LZ===lz){LZ.comps=g;if(LZ.step===1)wizRender();}})`. Em wizFoto, capturar `const lz=LZ` antes do FileReader e checar `if(LZ===lz)` no onload.

### [ALTA] CSV exporta lat/lon com apenas 2 casas decimais (~1,1 km de erro)

exportCSV (linha 1240): `lat=csvNum(ll[0].toFixed(6));lon=csvNum(ll[1].toFixed(6));`. csvNum (linha 1230) é `v=>v?String(Math.round(v*100)/100).replace(".",","):""` — recebe a string "-16.679900", coage para número e arredonda para 2 casas: sai "-16,68". Em Goiânia, 0,01° ≈ 1,1 km: as coordenadas do CSV apontam para o quarteirão errado, inutilizando as colunas lat/lon para qualquer uso (importar no Google MyMaps, planilha de prospecção etc.). O toFixed(6) mostra que a intenção era 6 casas.

**Correção proposta:** Não passar pelo csvNum: `lat=ll[0].toFixed(6).replace(".",","); lon=ll[1].toFixed(6).replace(".",",");` (mantendo a vírgula decimal do padrão pt-BR já usado no arquivo).

### [MEDIA] Buscas concorrentes sem token: resposta antiga de buscar/onMapClick/loadCi sobrescreve a mais recente

buscar (linha 668) se protege de reentrância via btn.disabled, mas onMapClick (linha 547) e loadCi (linha 534) não têm guarda nenhuma e os três caminhos terminam em finish() (LAST/render/plot). Cenário real de mobile: usuário toca num lote (consulta espacial lenta, servidor dá 502 + retry de 900 ms), acha que não pegou e toca em outro lote — duas consultas em voo; se a PRIMEIRA responder por último, finish() dela vence: LAST, a lista e o pino selecionado mostram o lote do primeiro toque, não o que o usuário tocou por último. Efeito colateral: o `finally{loading(false)}` da requisição que termina primeiro apaga o spinner enquanto a outra ainda está em voo, sugerindo que a busca acabou. Contraste: refreshLots já resolve exatamente isso com LOTTOKEN (linhas 500-514).

**Correção proposta:** Criar um token global de busca (espelhando LOTTOKEN): `let SEARCHTOKEN=0;` — cada entrada de buscar/onMapClick/loadCi faz `const tk=++SEARCHTOKEN;` e, antes de chamar finish(items), checa `if(tk!==SEARCHTOKEN)return;`. Idem antes de loading(false).

### [MEDIA] Tela "Sem resultado" deixa pinos da busca anterior no mapa e mensagem errada no modo inscrição

finish (linhas 745-750): quando units fica vazio, a função retorna antes de plot(), então layerGroup mantém os pinos da busca ANTERIOR — no mobile o usuário vê "Sem resultado" na lista mas pinos vermelhos no mapa, e clicá-los chama pick(idx) com LAST=[] (silêncio). Além disso a mensagem (linha 747) lê `document.getElementById("apto").value` mesmo quando MODE==='insc' — se o usuário buscou antes por Q+L com apto "1901" preenchido (o campo fica oculto mas guarda o valor) e depois busca uma inscrição inexistente, sai "Nenhuma unidade com esse número. Tente sem o apto...", que não tem relação com o modo inscrição.

**Correção proposta:** No ramo vazio de finish: chamar `layerGroup.clearLayers(); markers=[];` antes do return, e condicionar a mensagem do apto ao modo: `(MODE!=="insc"&&document.getElementById("apto").value)?...`.

### [BAIXA] "⏳ analisando a vizinhança…" do wizard nunca aparece: sentinela null colide com o estado "sem dados"

abrirLaudo inicializa `LZ={...,comps:null}` (linha 1051), mas o passo 2 (linha 1093) usa null como "getComps retornou sem dados": `g&&g.res&&g.res.n>=3?...:(g===null?"":"<br><br>⏳ analisando a vizinhança…")`. Como comps começa em null, enquanto a consulta está em voo o card mostra o mesmo vazio de "sem dados" — o usuário aceita o valor sugerido sem saber que a análise de vizinhança ainda chegaria (e getComps de fato retorna null quando não há área/venal, linha 941, o mesmo valor). O ⏳ é código morto.

**Correção proposta:** Inicializar `comps:undefined` em abrirLaudo (mantendo o `.then` gravando o resultado, inclusive null) — assim `g===null` passa a significar só "sem dados" e `g===undefined` mostra o ⏳, como o ternário da linha 1093 já espera.

### [BAIXA] Imóvel sem coordenada: card clicável não abre detalhe nem dá feedback (laudo/CND inacessíveis)

pick (linhas 870-878) só chama showDetail dentro de `if(a.x_coord&&a.y_coord)`. Para um registro do cadastro sem x_coord/y_coord (caso real — plot já trata com o toast "Encontrado, mas sem coordenada cadastrada", linha 866), o card na lista é clicável (cardHTML sempre gera onclick="pick(i)"), ganha a classe .sel, mas nada mais acontece: sem painel de detalhe, sem toast — e o usuário fica sem acesso ao botão de laudo, ao link da CND e à inscrição completa daquele imóvel, que não dependem de coordenada.

**Correção proposta:** Em pick, tratar o ramo sem coordenada: `if(a.x_coord&&a.y_coord){...showDetail(a,ll);}else{showDetail(a,null);}` — e em showDetail, quando ll for null, omitir os links Maps/StreetView/Earth (que dependem de lat/lon) mantendo grid, comparáveis desabilitados, laudo e CND; ou, no mínimo, `else toast("Imóvel sem coordenada no cadastro — detalhe indisponível.")`.

---

## Lente: seguranca

Auditoria de segurança client-side do radar-goiania.html (1305 linhas), sw.js, atualizar-caixa.py e caixa-goiania.js. O app tem postura razoável: quase todo innerHTML passa pelo esc() (l.424), inputs do usuário nas cláusulas WHERE são reduzidos a dígitos ou têm aspas removidas (likeTerm l.431; l.675, 690-694, 713-714), todos os target=_blank têm rel="noopener" (l.921-924, 1203), e o campo sensível dtnascimen NÃO aparece em nenhum render nem no CSV (colunas explícitas, l.1233-1243). Os problemas reais são: esc() não escapa aspa simples e há dados do cadastro interpolados dentro de handlers onclick inline (quebra de string JS = XSS); a arquitetura JSONP dá execução total de código ao endpoint da prefeitura sem nenhuma CSP para limitar o raio de dano; CDNs sem SRI com cache-first no service worker; e o link do popup Caixa aceita qualquer esquema de URL vindo do CSV. Achados ordenados por gravidade.

### [ALTA] esc() não escapa aspa simples — XSS via dados do cadastro dentro de onclick inline

esc() (l.424) trata & < > " mas não '. Na l.924, inscUse=esc(insc||ci) é interpolado dentro de onclick="copyInsc('${inscUse}')": um nrinscr/ci vindo do cadastro contendo ' fecha a string JS e injeta código (ex.: valor «');fetch(evil)//» viraria handler executável ao clicar em Titular (CND)). Pior na l.602-603: b.code (cdbairro vindo do JSONP em loadBairros) entra SEM esc nenhum em data-code="${b.code}", em onclick="pickBairro('${b.code}')" e no <span class="code">${b.code}</span> — se o servidor devolver cdbairro não numérico/malicioso, é XSS direto na lista de setores. Cenário: resposta do ArcGIS adulterada (ou registro cadastral com caractere inesperado) executa JS na origem do GitHub Pages, lendo radar_prof (nome/CRECI/contato) do localStorage.

**Correção proposta:** 1) Adicionar .replace(/'/g,"&#39;") ao esc(); 2) na l.602, coagir o código a dígitos antes de interpolar (String(b.code).replace(/\D/g,"")) e aplicar esc() no texto exibido; 3) preferencialmente trocar onclick inline por data-attributes + addEventListener (elimina a classe inteira de bug).

### [ALTA] JSONP = execução de código arbitrário concedida ao endpoint, sem nenhuma CSP para conter o estrago

jsonpOnce (l.444-456) injeta <script src="portalmapa.goiania.go.gov.br/..."> — qualquer byte que o servidor da prefeitura responder EXECUTA como JS na origem melo202.github.io. Comprometimento do portal (ou de proxy corporativo com TLS interception) = controle total do app: exfiltração de radar_prof (nome, CRECI, telefone — l.1050/1119), das fotos do wizard em memória, e adulteração silenciosa de valores no laudo PTAM que o usuário assina. O HTML não tem NENHUMA <meta http-equiv="Content-Security-Policy">, então mesmo um XSS trivial (achado 1) pode carregar scripts de qualquer host e exfiltrar para qualquer lugar.

**Correção proposta:** O JSONP é imposto pelo endpoint (sem CORS), mas dá para reduzir o raio de dano com CSP em <meta>: script-src 'self' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'. Isso bloqueia carregamento de script e exfiltração via fetch para hosts arbitrários. Documentar o risco residual (o portal continua trusted) no ROADMAP-radar.md.

### [MEDIA] Leaflet e proj4 do cdnjs sem SRI, com cache-first no service worker perpetuando script envenenado

radar-goiania.html l.13-15 carrega leaflet.min.css/js e proj4.js do cdnjs sem atributo integrity. sw.js (l.36, 47) trata cdnjs como cache-first: se uma resposta comprometida entrar no cache (CDN comprometido, rede hostil no primeiro load), ela fica servida PARA SEMPRE — o comentário do próprio sw.js assume que são "imutáveis". Uma lib adulterada tem acesso total: localStorage, laudo, tudo.

**Correção proposta:** Adicionar integrity="sha384-..." + crossorigin="anonymous" nas três tags (cdnjs publica os hashes na página de cada lib). Com SRI, tanto o load direto quanto o hit do cache do SW são verificados pelo browser.

### [MEDIA] Popup da camada Caixa aceita URL de esquema arbitrário vinda do CSV externo (javascript:)

caixaPopup (l.1203) monta <a href="${esc(i.u)}" target="_blank">; i.u vem de atualizar-caixa.py l.92 ("u": r[11].strip()) — coluna do CSV da Caixa gravada sem validar esquema. esc() não neutraliza javascript: (não precisa de < > " para ser perigoso em href). Cenário: CSV adulterado/malformado (baixado em latin-1 de venda-imoveis.caixa.gov.br, sem verificação além do TLS) coloca javascript:... no campo URL; o clique em "ver na Caixa ↗" executa código no app. O mesmo vale para edição manual acidental do caixa-goiania.js.

**Correção proposta:** Defesa dupla: no atualizar-caixa.py, só gravar "u" se casar ^https://venda-imoveis\.caixa\.gov\.br/; no caixaPopup, renderizar o link apenas se /^https:\/\//.test(i.u).

### [BAIXA] Valores de segunda ordem (vindos do servidor) interpolados sem coerção nas cláusulas WHERE

Os inputs do usuário estão bem tratados, mas valores que voltam do próprio servidor re-entram em WHERE sem coerção: lotInfo/loadCi usam ci='${ci}' (l.482, 538) com ci vindo de f.attributes.ci da camada de lotes; compsBase (l.969) faz where+=` AND uso=${a.uso}` com a.uso cru. Um ci contendo ' quebra a query (hoje só erro funcional, pois o serviço é público e read-only), mas é o mesmo padrão que originou o achado 1 e vira vetor se combinado com renderização do erro.

**Correção proposta:** Coagir na entrada: const ciD=String(ci).replace(/\D/g,"") antes de montar o WHERE em loadCi/lotInfo, e AND uso=${+a.uso||0} (ou omitir se não for inteiro) em compsBase.

### [BAIXA] dtnascimen: hoje não vaza, mas a proteção é implícita (por omissão), não por design

Verificado: nenhum render (dGrid l.890-899, cards l.826-844, tooltip l.488-490, laudo l.1129-1178) nem o exportCSV (cabeçalho e colunas explícitas, l.1233-1243) tocam em dtnascimen ou outros campos pessoais do titular — o CSV é allowlist, o que é correto. Porém o outFields=* (obrigatório no endpoint) traz TODOS os ~85 campos para LAST/LOTINFO/CMPCACHE em memória. Qualquer feature futura do tipo "exportar tudo" ou "mostrar ficha completa" vazaria dado pessoal sem ninguém perceber, contradizendo o rodapé (l.369: "O nome do titular não é lido por aqui").

**Correção proposta:** Defesa em profundidade de 3 linhas: logo após cada map(f=>f.attributes), apagar os campos sensíveis (const SENS=["dtnascimen",...]; items.forEach(a=>SENS.forEach(k=>delete a[k]))), centralizando num sanitizeAttrs() usado em fetchWhere, loadCi, onMapClick e compsStats.

### [BAIXA] Fotos do wizard (dataURL) interpoladas em atributo src sem escape

l.1103 (grade do wizard) e l.1175 (laudo) fazem <img src="${f}"> com f = resultado de FileReader.readAsDataURL. Na prática o browser gera data:<mime>;base64,... sem aspas, então não há exploração conhecida hoje — mas é o único ponto de dado dinâmico interpolado em innerHTML sem passar por esc(), e depende de garantia não documentada do formato de File.type. Custo de blindar é zero.

**Correção proposta:** Usar esc(f) nas duas interpolações (dataURL não contém & < > " legítimos, então esc é inócuo no caso normal) ou, melhor para memória com 8 fotos de iPhone, migrar para URL.createObjectURL(file).

---

## Lente: performance

Auditoria de performance/memória do radar-goiania.html (1305 linhas, lido na íntegra). Os três riscos graves para o uso em iPhone são: (1) refreshLots refaz download de até 4000 geometrias e recria todos os polígonos a cada moveend — inclusive quando pick() chama setView ao navegar entre cards — sem debounce, sem diff e sem simplificação de vértices (toWGS por vértice, JSONP de megabytes); (2) fotos do wizard guardadas como dataURL na resolução original (até ~50 MB em strings), re-parseadas a cada wizRender e duplicadas no #laudo, que nunca é limpo após a impressão; (3) render() injeta até 60.000 cards num único innerHTML com LAST retendo todos os ~85 campos por registro. Em nível médio: tooltip de hover baixa até 2000 registros completos quando ttsublot já traria a contagem; caches LOTINFO/CMPCACHE sem teto; e a busca binária de percentis emite ~23 requisições, com 3 idênticas na primeira rodada. sw.js e caixa-goiania.js (57 KB) estão saudáveis. Todas as correções propostas são locais e preservam as restrições do endpoint (outFields=* obrigatório, JSONP sem CORS).

### [ALTA] refreshLots refaz download e reconstrói TODOS os polígonos a cada moveend — sem debounce, sem cache de geometria, e é disparado até por clique em card

L479: map.on("moveend",refreshLots). L510-527: cada movimento em zoom>=17 baixa até 4000 geometrias (returnGeometry:true) via JSONP (payload de megabytes parseado como <script> — pico de memória no Safari/iPhone), faz lotLayer.clearLayers() e recria cada L.polygon chamando toWGS (proj4) vértice a vértice (g.rings.map(rg=>rg.map(pt=>toWGS(...)))) — milhares de conversões + bindTooltip + 3 listeners por polígono, tudo jogado fora no próximo pan. Pior: pick() (L877) chama map.setView(ll,18), que dispara moveend → refreshLots; navegar card a card numa lista de resultados refaz o download de 4000 lotes A CADA clique, mesmo com o mapa praticamente parado. LOTTOKEN evita corrida, mas não evita a rede nem o rebuild.

**Correção proposta:** 1) Debounce de ~250 ms no refreshLots; 2) pular a consulta se os novos bounds estiverem contidos nos bounds da última busca bem-sucedida (guardar lastBounds); 3) cachear polígonos por ci num Map e só criar os novos/remover os que saíram (diff em vez de clearLayers); 4) adicionar geometryPrecision=0 e maxAllowableOffset (~0.5 m em zoom 17) na query para reduzir vértices e payload; 5) em pick(), usar map.setView só quando o centro/zoom realmente mudarem (ou map.panTo com distância mínima).

### [ALTA] Fotos do laudo em dataURL na resolução original do iPhone — dezenas de MB em strings, duplicadas no #laudo e nunca liberadas após a impressão

L1060-1065: wizFoto usa FileReader.readAsDataURL no arquivo bruto (foto de iPhone: 3-8 MB, +33% em base64), até 8 fotos retidas em LZ.fotos — pode passar de 50 MB só em strings. L1103: cada wizRender do passo 2 reinjeta TODAS as base64 no innerHTML (re-parse de dezenas de MB a cada foto adicionada/removida — custo quadrático). L1175: montarLaudo duplica todas as base64 no innerHTML de #laudo, e o done() (L1180) só remove a classe print-laudo — o #laudo fica com as fotos no DOM para sempre depois do PDF. No Safari/iOS isso é o caminho mais curto para o jetsam matar a PWA.

**Correção proposta:** Redimensionar antes de guardar: carregar em <img>/createImageBitmap, desenhar em canvas com lado máximo ~1600 px e exportar JPEG qualidade 0,8 (cai para ~200-400 KB/foto, suficiente para img de 140pt no laudo). E no done() do afterprint, zerar document.getElementById("laudo").innerHTML="".

### [ALTA] render() monta até 60.000 cards num único innerHTML e LAST retém todos os atributos (~85 campos/registro)

L654-666: fetchWhere pagina até maxPages=30 × 2000 = 60.000 registros com outFields=* — todos ficam em LAST (L744). L807-825: render() concatena um card por unidade (com mercadoEstimado por item) e injeta tudo de uma vez em box.innerHTML — em buscas largas (só a quadra, ou o fallback de varredura do setor em L697) são centenas/milhares de cards: parse de HTML de megabytes trava a UI e pode derrubar o Safari mobile. plot() (L847) ainda cria um circleMarker por ci sem cluster, e pick() (L873) faz querySelectorAll(".card") sobre a lista inteira a cada seleção.

**Correção proposta:** Renderizar no máximo ~200 cards com botão "mostrar mais N" (LAST continua íntegro para o CSV e para o plot); trocar o toggle de seleção por lookup direto (guardar referência do card selecionado anterior em vez de varrer todos). Opcional: reduzir maxPages padrão para ~10 com o mesmo toast de refino.

### [MEDIA] Tooltip de hover (lotInfo) baixa até 2000 registros completos por lote — ~1000× mais payload do que o necessário

L481-494: lotInfo(ci) consulta where ci='...' com outFields="*" (obrigatório pelo endpoint) e resultRecordCount:2000. Para um prédio de 300 unidades, um simples hover baixa 300 registros × ~85 campos só para exibir uma linha de resumo e a contagem. O próprio cadastro já traz a contagem no primeiro registro: ttsublot (usado em L899 como "Unid. no lote").

**Correção proposta:** Usar resultRecordCount:2 (só para saber se há mais de uma unidade) e montar a contagem com a.ttsublot do primeiro registro (`its.length>1` vira `(a.ttsublot||1)>1` e exibe a.ttsublot unidades). Payload do hover cai de centenas de KB para ~2 registros.

### [MEDIA] Caches LOTINFO e CMPCACHE crescem sem limite pela sessão inteira

L475 const LOTINFO={} — uma entrada (Promise + string HTML) por lote já "hoverado"; passear pelo mapa acumula milhares. L934 const CMPCACHE={} — uma entrada por ci|campo|raio contendo o objeto res com o array vals de até 500 números (L989) e nunca é descartada. Em PWA no iPhone a sessão fica viva por dias; a memória só cresce.

**Correção proposta:** Trocar por Map com teto simples (ex.: 300 entradas; ao inserir acima do teto, deletar a chave mais antiga — Map preserva ordem de inserção, LRU de 3 linhas). Para CMPCACHE, guardar só {n,q1,med,q3,min,max,exact,below} e descartar vals após o cálculo (vals não é usado fora de compsStats/renderComps além do percentil below, que já fica memorizado em r.below, L1015).

### [MEDIA] Busca binária de percentis dispara 3 consultas idênticas na 1ª rodada e ~23 requisições no total

L992-1003: pct(.25), pct(.5) e pct(.75) partem todos de lo=50,hi=40000 — a primeira iteração dos três emite a MESMA consulta returnCountOnly com vlvenal/area<20025.00 três vezes em paralelo (e frequentemente a 2ª rodada coincide em 2 delas). Total do caminho "vizinhança grande": 1 count + 21 counts binários + 1 count do percentil below (L1012) ≈ 23 requisições — é o ~20s no celular admitido na L956, e ainda carrega o servidor da prefeitura que já dá 502 sob carga (comentário L437).

**Correção proposta:** Memoizar contagem por limiar dentro de compsStats: const memo={}; const cnt=t=>memo[t]??=jsonp(...). Só isso elimina 2-4 requisições duplicadas. Ganho maior: rodar as 3 buscas compartilhando os cortes (bissecção conjunta: cada contagem c(mid) informa os 3 percentis de uma vez), reduzindo para ~10-12 requisições sem perder precisão.

### [BAIXA] wizRender reconstrói a tela inteira a cada toque em chip/segmento

L1058-1059: wizSet/wizDif chamam wizRender(), que refaz todo o innerHTML do passo (L1067-1113). No passo 0 é barato, mas o padrão faz o passo 2 (fotos) re-parsear todas as base64 a cada mudança (agravante do achado 2) e joga fora estado de foco/rolagem.

**Correção proposta:** Nos toggles (conserv/difs), alternar só a classe .on dos botões clicados em vez de re-renderizar; no passo 2, append/remove incremental dos <div class="ph"> em vez de reconstruir o pgrid.

### [BAIXA] filterCombo roda filtro + sort + innerHTML a cada tecla, sem debounce

L1283: inp.addEventListener("input",...) chama filterCombo a cada caractere; L592-604 filtra COMBO inteiro, ordena os hits (sort com localeCompare) e reescreve o innerHTML de até 50 itens. Com ~700 bairros o custo unitário é pequeno, mas em iPhone antigo digitação rápida gera jank perceptível na lista.

**Correção proposta:** Debounce de ~120 ms no handler de input (um setTimeout/clearTimeout de 2 linhas, como já feito no toast em L640) e ordenar só os hits já fatiados quando q existir (slice antes do sort completo não é possível pela priorização, mas o debounce sozinho resolve).

---

## Lente: ux-mobile

Auditoria de UX mobile (iPhone) do radar-goiania.html (1305 linhas, lido integralmente) + manifest.json + sw.js. O app tem boa base mobile (alvos 44px na maioria, safe-area no viewbar/wizard, bottom sheet com alça e sticky header, dvh, inputs ≥16px sem zoom do iOS). Os problemas graves estão nas bordas: o fluxo do laudo morre em silêncio no PWA instalado porque window.print() é no-op no standalone do iOS; iPhones grandes em paisagem (844–932px) caem no layout desktop, onde o painel de detalhe não tem max-height/scroll e depende de hover; e há becos sem saída de feedback (card sem coordenada, erro de busca só em toast de 3,6s possivelmente sob o Dynamic Island).

### [ALTA] Laudo PTAM termina em nada no PWA instalado no iPhone (window.print é no-op no standalone)

montarLaudo() (radar-goiania.html:1179-1183) faz body.classList.add('print-laudo'), fecharLaudo() e setTimeout(()=>window.print(),150). O app é distribuído como PWA standalone (manifest.json:6 "display":"standalone"; meta apple-mobile-web-app-capable linha 7). No iOS, window.print() em web app standalone (aberto pelo ícone da tela inicial) não abre diálogo nenhum — é no-op. Cenário: o corretor preenche os 4 passos do wizard (estado, valor, fotos, nome), toca "Gerar PDF", o wizard fecha e... nada acontece. Nenhuma mensagem, nenhum fallback; o #laudo fica com display:none fora do @media print (linha 217). O fluxo mais valioso do app (entregável para cliente) falha 100% das vezes no modo de uso principal declarado.

**Correção proposta:** Detectar standalone (navigator.standalone || matchMedia('(display-mode: standalone)').matches) em montarLaudo(): nesse caso, em vez de window.print(), exibir o #laudo em tela (overlay com o mesmo HTML) com botão de compartilhar/instrução "abra no Safari para salvar em PDF", ou abrir o laudo num Blob/nova janela. No mínimo, mostrar toast explicando o que fazer quando afterprint não disparar em ~2s.

### [ALTA] iPhone em paisagem cai no layout desktop: painel de detalhe estoura a tela sem scroll e lotes dependem de hover

O breakpoint mobile é só largura: @media(max-width:820px) (linha 277). iPhone 12–16 em paisagem tem 844–932px de largura lógica → layout desktop de 2 colunas com .wrap{height:100vh} (linha 49) numa tela de ~390px de altura. No desktop, .detail (linhas 133-134) é ancorado em bottom:16px sem max-height nem overflow-y (esses só existem no mobile, linha 294): com dgrid de 3 linhas + botão comparar + laudo + nota + 4 ações, o painel cresce para cima além do topo da tela — o botão × (top:10px do painel, linha 136) fica inacessível e não há rolagem interna. Além disso os lotes desenhados só informam via tooltip de mouseover (linhas 520-524) e 100vh no Safari paisagem esconde a base atrás da toolbar. Cenário: usuário gira o iPhone para ver o mapa mais largo, toca num lote e não consegue nem ler tudo nem fechar o sheet.

**Correção proposta:** Incluir touch no breakpoint: @media (max-width:820px), (pointer:coarse) — ou, mais conservador, dar ao .detail desktop max-height:calc(100vh - 32px); overflow-y:auto e trocar 100vh por 100dvh na .wrap.

### [MEDIA] Tocar num card sem coordenada joga o usuário na tela Mapa vazia, sem sheet e sem aviso

pick(i) (linhas 870-877) executa isMobile()&&setView("mapa") incondicionalmente, mas só chama showDetail() dentro de if(a.x_coord&&a.y_coord). O toast "Encontrado, mas sem coordenada cadastrada" (linha 866) só dispara quando NENHUM resultado tem coordenada. Cenário: busca retorna mistura de itens com e sem x_coord; o usuário toca no card sem coordenada, é levado à tela Mapa, e nada acontece — nenhum sheet, nenhum pino destacado, nenhum toast. Beco sem saída clássico: ele volta à Busca sem entender o que houve.

**Correção proposta:** Em pick(), quando !a.x_coord: não trocar de view; abrir o sheet mesmo assim (showDetail funciona quase todo sem ll — só os links Maps/StreetView dependem dela) ou ao menos toast("Imóvel sem coordenada no cadastro — dados apenas no cartão").

### [MEDIA] Toasts (único canal de erro do app) ficam sob o Dynamic Island no PWA e somem em 3,6s

No mobile .toast vira position:fixed (linha 288) mantendo top:16px do estilo base (linha 264). Com viewport-fit=cover (linha 5) e PWA standalone, o conteúdo se estende sob a status bar/Dynamic Island — um toast a 16px do topo fica parcialmente coberto num iPhone 14 Pro+. Agrava: TODO feedback de validação e erro passa por toast de 3,6s (toast(), linhas 639-640) — "Escolha o setor na lista", "Falha ao consultar o cadastro" (linha 727), "Resultado muito grande — lista incompleta" (linha 664). Cenário: busca falha, o aviso aparece meio escondido sob o notch e some antes de o usuário ler; a lista anterior continua na tela como se fosse o resultado novo.

**Correção proposta:** top:calc(16px + env(safe-area-inset-top)) no .toast mobile. Para erros de busca, também escrever o estado no painel #results (como já faz no "Sem resultado", linha 749), não só no toast.

### [MEDIA] Teclado do iOS cobre o botão "Continuar" e campos do wizard do laudo

.wiz é position:fixed;inset:0 (linha 180) com o botão de avanço preso no .wfoot no rodapé (linhas 212-214). No iOS o teclado não redimensiona layout fixo (nem 100dvh encolhe): nos passos 1 (input de valor + textarea de observações, linhas 1096-1098) e 3 (nome/CRECI/contato, linhas 1107-1112), ao focar um campo o teclado sobe e esconde o "Continuar" — e a textarea, que fica embaixo, pode ser coberta enquanto digita. Cenário: usuário digita o nome no passo final e precisa adivinhar que deve tocar em "concluído" no teclado para revelar o botão; fricção exatamente no fechamento do funil do laudo.

**Correção proposta:** Listener em window.visualViewport ('resize') aplicando padding-bottom no .wbody igual à altura do teclado (window.innerHeight - visualViewport.height) e el.scrollIntoView({block:'center'}) no focusin dos .winput. Alternativa mínima: mover o wNext para dentro do .wbody rolável nos passos com input.

### [MEDIA] Alvos de toque abaixo de 44pt: exportar CSV (~26px), remover foto (26px) e checkbox de garagens

(1) .count .csv — padding:6px 9px, fonte 10px (linhas 107-108) ≈ 24-26px de altura, sem override no @media mobile; é a única porta do fluxo CSV. (2) .pgrid .rm — 26×26px fixos (linha 209) para remover foto no wizard, colado no canto da miniatura (risco de abrir a foto em vez de remover). (3) label .chk "ocultar garagens e boxes" (linhas 83-85, 351) tem ~20px de altura útil. Contrasta com o resto do app, que aplica min-height:44px em cmpbtn/caixabtn/laudobtn/seg/chips. Cenário: no iPhone, o corretor tenta baixar o CSV e erra o toque, acertando o card abaixo (que abre o detalhe e troca a view para o mapa).

**Correção proposta:** No @media(max-width:820px): .count .csv{padding:12px 14px;font-size:11px}; .pgrid .rm{width:32px;height:32px} + área extra via ::after; .chk{min-height:44px;padding:10px 0}.

### [BAIXA] Instruções mouse-first num app de toque: "passe o mouse para identificar"

Quando os lotes carregam pela primeira vez, o toast diz "Lotes delimitados — passe o mouse para identificar, clique para abrir." (linha 530). No iPhone não existe hover: os tooltips de mouseover (linhas 520-524) nunca aparecem e a instrução ensina um gesto impossível. O hint da busca (linha 360) "clique direto no mapa" também soa desktop. Cenário: usuário dá zoom, vê o toast, tenta "passar o dedo" sobre o lote e apenas arrasta o mapa.

**Correção proposta:** const TOUCH=matchMedia('(hover:none)').matches; toast(TOUCH?"Lotes delimitados — toque num lote para abrir os dados.":"...passe o mouse..."). Trocar "clique" por "toque" no hint quando TOUCH.

### [BAIXA] Busca com vários resultados no mobile pula direto para o Mapa e esconde a lista recém-gerada

finish() (linha 753) chama setView("mapa") sempre que isMobile(). Com 1 resultado isso é ótimo (auto-pick + sheet, linha 864), mas com N resultados (ex.: prédio com 40 unidades = 1 pino só, linhas 849-861) o usuário cai no mapa com pinos e nenhuma indicação de que a lista de unidades com valores/estimativas está na aba Busca — a contagem "40 unidades" (linha 811) fica invisível. Cenário: corretor busca a quadra inteira, vê 12 pinos, e não descobre a lista comparativa nem o botão CSV sem tatear a viewbar.

**Correção proposta:** Quando units.length>1 no mobile, exibir toast(units.length+" unidades — veja a lista na aba Busca") após setView("mapa"), ou um chip flutuante "☰ 40 resultados" sobre o mapa que volta para a view busca.

---

## Lente: pwa-offline

Auditoria da lente PWA/offline em radar-goiania.html, sw.js, manifest.json e index.html (todos lidos na íntegra). O desenho geral do SW é correto e enxuto: network-first para HTML/dados com fallback de cache (sw.js l.43-46), cache-first só para CDN/ícones, e — ponto forte — tiles do CARTO e JSONP do ArcGIS NÃO são interceptados (l.36 retorna cedo para origem externa ≠ cdnjs), logo o cache NÃO cresce sem limite: é acotado ao shell + 3 libs de CDN. A navegação offline pelo redirect index.html funciona ("./" está no precache, e radar-goiania.html também). Os problemas reais estão nas bordas: o mais grave é o laudo PTAM depender de window.print(), que é limitação conhecida em PWA standalone no iOS (exatamente o cenário do usuário: iPhone + app instalado) — o botão "Gerar PDF" tende a não fazer nada ou abrir diálogo quebrado, sem qualquer fallback ou aviso. Fontes da investigação web: https://developer.apple.com/forums/thread/22911 , https://github.com/kiwix/kiwix-js-pwa/issues/364 , https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide , https://firt.dev/notes/pwa-ios/ . Demais achados: precache incompleto (caixa-goiania.js fora do SHELL), install atômico refém do cdnjs, manifest sem ícone maskable/scope/id, offline sem detecção (setores nunca recarregam ao voltar a conexão), risco de eviction de 7 dias se usado só no Safari, classe print-laudo que pode ficar presa (afterprint não confiável no iOS) e SW que não registra em localhost para teste.

### [ALTA] Laudo PTAM depende de window.print(), que falha em PWA standalone no iOS — cenário principal do usuário

radar-goiania.html l.1179-1183: montarLaudo() termina com document.body.classList.add("print-laudo") e setTimeout(()=>window.print(),150). Não há detecção de navigator.standalone nem fallback. A impressão a partir de web app adicionado à Tela de Início do iOS é limitação conhecida do WebKit: o diálogo de impressão não abre ou abre sem preview e com "Selecionar impressora" desabilitado (Apple Developer Forums thread 22911: "Print in fullscreen webapp not possible"; kiwix-js-pwa issue #364 "[PWA] Printing is buggy on Safari (MacOS and iOS)"; guias de limitações PWA/iOS 2025-26 da MagicBell e firt.dev listam impressão integrada como indisponível em standalone). Cenário de falha: o corretor instala o Radar no iPhone (meta apple-mobile-web-app-capable l.7 + display standalone no manifest incentivam isso), preenche o wizard de 4 passos com fotos e dados do cliente, toca "Gerar PDF" (wizNext l.1115-1121) — e nada acontece: o wizard fecha (fecharLaudo() l.1182 roda antes do print) e o trabalho todo é descartado sem mensagem de erro, pois LZ=null.

**Correção proposta:** Em montarLaudo(), detectar o modo standalone do iOS (if (navigator.standalone === true)) e, nesse caso, NÃO fechar o wizard silenciosamente: mostrar um passo final com o laudo renderizado em tela (remover o display:none do #laudo fora do @media print) e a instrução "abra este endereço no Safari e toque em Gerar PDF novamente" com link <a href="radar-goiania.html" target="_blank"> (em standalone abre no in-app browser/Safari, onde window.print funciona via folha de compartilhamento). Manter o fluxo window.print() atual para Safari comum e desktop.

### [MEDIA] Precache (SHELL) não inclui caixa-goiania.js nem apple-touch-icon.png — camada Caixa e fatores de laudo somem offline após troca de versão de cache

sw.js l.7-16: SHELL tem "./", radar-goiania.html, manifest, icon-192/512 e as 3 libs de CDN, mas não tem ./caixa-goiania.js (57 KB de dados, carregado no <script> l.16 do HTML) nem ./apple-touch-icon.png (referenciado no l.11 do HTML). caixa-goiania.js só entra no cache em runtime via NETWORK_FIRST (l.17). Cenário de falha: ao publicar nova versão com CACHE="radar-v3", o activate (l.23-28) apaga radar-v2 inteiro — inclusive a cópia runtime de caixa-goiania.js; se o usuário abrir o app offline antes de uma visita online completa, o script falha (onerror l.16 do HTML), window.CAIXA fica indefinido, o botão "Oportunidades Caixa" não aparece (initCaixa l.1188-1194) e mercadoEstimado() perde a fonte 2 (laudos Caixa, l.784-786), degradando a estimativa para o multiplicador genérico sem o usuário perceber.

**Correção proposta:** Adicionar "./caixa-goiania.js" e "./apple-touch-icon.png" ao array SHELL em sw.js (l.7-16). Custo: +59 KB no install.

### [MEDIA] Install do SW é atômico e refém do cdnjs: uma falha em qualquer das 3 URLs de CDN cancela todo o modo offline

sw.js l.19-21: e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))). cache.addAll rejeita se QUALQUER requisição falhar — e 3 dos 8 itens são de cdnjs.cloudflare.com. Cenário de falha: no momento do primeiro acesso (ou de cada atualização de versão, pois o install roda de novo a cada novo sw.js), o cdnjs está instável ou bloqueado na rede do usuário; o install inteiro falha, o SW nunca ativa e o app fica 100% sem offline — silenciosamente, porque o register tem .catch(()=>{}) (radar-goiania.html l.1258). Irônico: as próprias libs de CDN provavelmente carregariam depois via cache HTTP do navegador, mas o shell same-origin (que é o que importa) ficou de fora junto.

**Correção proposta:** Separar o precache em duas fases no install: await c.addAll(itens same-origin) obrigatório, e Promise.allSettled(cdnUrls.map(u=>fetch(u).then(r=>r.ok&&c.put(u,r)))) best-effort para o CDN (que de todo modo é re-cacheado em runtime pelo ramo cache-first, l.47).

### [MEDIA] manifest.json sem ícone maskable, sem scope e sem id

manifest.json l.10-13: os dois ícones não declaram "purpose" — em Android/Chrome o launcher aplica máscara adaptativa e o ícone aparece encolhido dentro de um círculo branco (e o Lighthouse/PWABuilder reprova instalabilidade "maskable icon"). Falta "scope": navegações fora do diretório (ex.: o link da CND em goiania.go.gov.br abre com target=_blank, ok, mas qualquer navegação same-scope-indefinido fica ao critério do browser, que infere do start_url — funciona hoje por sorte do layout /radar-fundiario/). Falta "id", então a identidade do app fica atrelada à URL exata do start_url — se um dia renomear radar-goiania.html, o app instalado vira "outro app". Impacto no iOS é menor (usa apple-touch-icon, presente), mas o app é publicado na web e instalável em Android também.

**Correção proposta:** Adicionar ao manifest: "id": "./", "scope": "./", e nos ícones "purpose": "any" + uma entrada duplicada 512x512 com "purpose": "maskable" (gerando versão com ~20% de padding de segurança).

### [MEDIA] Offline sem detecção: lista de setores nunca se recupera sozinha e todas as falhas dizem apenas 'verifique a internet'

O app abre offline graças ao SW, mas todo dado é vivo (JSONP): (1) loadBairros() offline cai no catch (radar-goiania.html l.588) e deixa o placeholder "erro ao carregar — recarregue a página" — COMBO fica vazio para sempre na sessão, bloqueando os modos Quadra+Lote e Endereço (resolveBairro l.613-625 retorna false) mesmo que a conexão volte 10 segundos depois; num iPhone em área de sinal fraco isso é rotina. (2) buscar() offline mostra o toast genérico l.727 sem distinguir 'sem internet' de 'servidor da prefeitura fora'. (3) O mapa fica cinza (tiles não cacheados, por design) sem nenhum aviso de estado offline. O SW entrega o shell, mas a UX não explica que o app está de pé porém sem dados.

**Correção proposta:** (a) window.addEventListener("online", ()=>{ if(!COMBO.length) loadBairros(); }) para recarregar setores automaticamente; (b) nos catch de buscar()/loadBairros(), if(!navigator.onLine) usar mensagem específica "Você está offline — o cadastro precisa de internet"; (c) opcional: banner fino de estado offline via eventos online/offline.

### [BAIXA] Offline durável só existe com o app instalado: usado só no Safari, o iOS apaga o CacheStorage após 7 dias sem uso

Comportamento do WebKit (ITP): armazenamento gravável por script — incluindo Cache API do SW e o localStorage do perfil do corretor (radar_prof, radar-goiania.html l.1119) — é apagado após ~7 dias sem interação quando o site roda como aba do Safari; web apps adicionados à Tela de Início são isentos (documentado nos guias de limitações PWA/iOS — magicbell.com e firt.dev acima). Cenário de perda: o usuário usa o Radar via favorito do Safari, fica 1 semana sem abrir, e perde o fallback offline e os dados de assinatura do laudo (nome/CRECI/contato), que ele terá de redigitar. Nada no app comunica isso.

**Correção proposta:** Não é bug de código, mas mitigável: exibir uma dica única (dismissível, guardada em localStorage) no iOS não-standalone (!navigator.standalone && /iPhone|iPad/.test(navigator.userAgent)) sugerindo "Compartilhar → Adicionar à Tela de Início" — que também é pré-requisito do modo standalone já previsto no manifest.

### [BAIXA] afterprint não confiável no iOS: body pode ficar preso em .print-laudo e uma impressão futura sai o laudo antigo

radar-goiania.html l.1179-1181: a limpeza da classe print-laudo depende exclusivamente do evento afterprint, que o Safari/iOS historicamente não dispara de forma confiável (mesma família de bugs de impressão citada no achado 1). Se o evento não vier: a classe fica no body e #laudo permanece preenchido com o innerHTML do último laudo (l.1157). Na tela nada muda (as regras são todas @media print, l.218-256), mas numa impressão posterior por qualquer via (menu do navegador, Cmd+P no desktop, share-sheet do Safari) o CSS l.220-221 esconde o app inteiro e imprime o laudo velho — com dados do imóvel/cliente anterior, um risco real para advogado/corretor.

**Correção proposta:** Complementar o afterprint com window.matchMedia("print").addEventListener("change", e=>{ if(!e.matches) done(); }) e um fallback de segurança (ex.: limpar também no próximo evento de foco/interação: window.addEventListener("focus", done, {once:true})).

### [BAIXA] SW nunca registra em localhost — impossível testar offline/cache localmente

radar-goiania.html l.1258: if("serviceWorker" in navigator && location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(()=>{}). Os navegadores tratam http://localhost como origem segura justamente para permitir desenvolvimento de SW, mas a condição exige https: literal. Consequência: qualquer alteração em sw.js (como as deste relatório) só é testável depois de publicar no GitHub Pages — ciclo de depuração lento e mudanças de cache chegando em produção sem teste. O catch vazio também engole erros de registro em produção (ex.: sw.js com erro de sintaxe passaria despercebido).

**Correção proposta:** Trocar a condição por: location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1". Opcional: no catch, console.warn(e) em vez de silêncio total.

---

## Lente: estatistica

Auditoria da metodologia estatística de preços do radar-goiania.html. Não há dupla aplicação do fator oferta (0,90 aplicado 1x em cada caminho: mercadoEstimado l.779, cEff l.1027, wizard l.1087) e o caminho exato n<=400 baixa a amostra completa (sem truncamento). Porém há 7 problemas reais: (1) colisão de cache de comparáveis entre unidades do mesmo prédio, que contamina estatísticas e percentil inclusive no laudo PTAM; (2) busca binária com resolução de ~312 R$/m² (7 iterações em 50-40000), erro relativo enorme sobre venais baixos e piso artificial de ~206 R$/m²; (3) comparáveis de apartamento misturam casas (venal de casa embute terreno inteiro); (4) tabela FipeZap residencial aplicada a salas, lojas e boxes de garagem; (5) o próprio imóvel entra na amostra de vizinhos e no percentil; (6) estimativa de mercado de unidade ignora completamente o venal relativo do imóvel (mesmo R$/m² para todo o bairro); (7) quartis e cerca de Tukey calculados sobre n=3-4. Todas as correções cabem client-side.

### [ALTA] Cache de comparáveis colide entre unidades do mesmo prédio — estatísticas e percentil de um apartamento aparecem no outro (inclusive no laudo PTAM)

Em getComps (l.945) a chave de cache é `clean(a.ci)+"|"+areaField+"|"+r` — o ci é a inscrição do LOTE, compartilhada por todas as unidades do edifício. Um apto de 70 m² gera compsStats com filtro de área [35,140] m² (l.968); ao abrir depois a cobertura de 200 m² do MESMO prédio, a chave é idêntica e a promise cacheada é reutilizada: a cobertura recebe quartis/mediana de uma amostra filtrada para o perfil do apto de 70 m². Pior: em renderComps (l.1015) `r.below=below` é memoizado NO OBJETO CACHEADO compartilhado — o percentil calculado com o myPm2 da unidade A (que difere por venal mesmo entre plantas iguais) é exibido como "mais caro que X% dos vizinhos" para a unidade B. O laudo (abrirLaudo l.1052 usa o mesmo getComps) imprime esses números contaminados na seção 2 do PTAM.

**Correção proposta:** Incluir a identidade da unidade e a área na chave: `const key=clean(a.nrinscr||a.ci)+"|"+areaField+"|"+Math.round(myArea)+"|"+r;` e NÃO mutar o objeto cacheado — remover a memoização `r.below=below` (l.1015) ou memoizar em mapa separado keyed por `key+"|"+myPm2.toFixed(2)` (no caminho exact o recálculo é local e gratuito; só o caminho count precisa de memo).

### [ALTA] Busca binária de percentis: 7 iterações em [50, 40000] dão resolução de ~±156 R$/m² — erro relativo de 10-50% sobre venais baixos e piso artificial de ~206 R$/m²

Em compsStats (l.993-1002), lo=50, hi=40000, 7 iterações: largura final do intervalo = 39950/2^7 ≈ 312 R$/m², retorno no ponto médio (erro até ±156). Como a distribuição é de VENAL/m² (fração do mercado — medianas de terreno periférico ficam em ~200-1500 R$/m²), o erro relativo em q1/med/q3 chega a dezenas de %. Isso propaga em cadeia: (a) as cercas min/max (l.1004) usam iqr=q3-q1 com erro dobrado; (b) o selo de confiança amp=(q3-q1)/med (l.1018-1019) fica aleatório perto dos cortes 0,30/0,40; (c) cEff=m2b*FATOR_OFERTA/r.med (l.1027) distorce toda a faixa de mercado exibida (l.1038). Além disso, se o quantil verdadeiro for <50, a busca converge para ~50+39950/256 ≈ 206 R$/m² — bairros baratos nunca reportam abaixo disso. Cada iteração é só um returnCountOnly (barato).

**Correção proposta:** Substituir o laço fixo por convergência relativa: `while(iter++<14 && (hi-lo)>Math.max(4, 0.01*lo)) {...}` — 14 iterações dão resolução ~2,4 R$/m² por +7 counts por percentil. Alternativa mais econômica: bissecção em escala log (mid=Math.sqrt(lo*hi)) com 10 iterações, que dá erro relativo ~4% uniforme em toda a faixa e resolve o piso dos 206.

### [ALTA] Comparáveis de apartamento misturam casas: venal de casa embute o terreno inteiro e infla o R$/m² construído da amostra

compsBase (l.966-973) filtra só `uso=${a.uso}` e área 0,5x-2x. Para unidade (isU, areaField=areaedif), a consulta espacial no raio retorna também CASAS residenciais (uso=1) com área construída parecida — e o vlvenal de casa inclui terreno+construção, enquanto o do apartamento reflete fração ideal. vlvenal/areaedif de uma casa de 120 m² num lote de 400 m² é estruturalmente maior que o de um apto de 120 m², então q1/med/q3 e o percentil "mais caro que X%" saem enviesados para cima em bairros mistos (Pedro Ludovico, Jardim América). O campo cdedificio existe nos atributos (usado em mercadoEstimado l.776), então o filtro cabe no WHERE.

**Correção proposta:** Em compsBase, segmentar por tipologia server-side: `if(isU) where+=" AND cdedificio>0"; else where+=" AND (cdedificio=0 OR cdedificio IS NULL)";` (passar isU como parâmetro — os 3 call sites l.947, l.1011 já sabem isU). Validar com returnCountOnly se o campo aceita o predicado; fallback: filtrar client-side no caminho exact e aceitar o viés apenas no caminho n>400.

### [ALTA] Tabela FipeZap residencial aplicada a qualquer 'unidade' sem checar uso/tipologia: salas comerciais, lojas e boxes de garagem recebem R$/m² de apartamento

mercadoEstimado (l.775-782): `isU=!!unitLabel(a)||(a.cdedificio||0)>0` — unitLabel (l.801-805) reconhece explicitamente "Box", "Sala" e "Loja". Não há nenhum teste de `a.uso` nem de isGarage antes de aplicar `areaedif*m2b*FATOR_OFERTA`. Resultado: um box de garagem de 25 m² no Marista (m2b=10800, l.763) é estimado em 25×10800×0,90 ≈ R$ 243 mil (real: ~R$ 60-90 mil); uma sala comercial no Bueno recebe R$/m² residencial FipeZap. O erro vaza para o card (l.841), o detalhe (l.895), o CSV (l.1238-1243) e o valor sugerido do laudo (l.1087), onde vira o número âncora do PTAM. Com hideGar desmarcado ou busca por inscrição (l.739), garagens aparecem na lista com essas estimativas.

**Correção proposta:** Condicionar o caminho da tabela: `if(isU && m2b && a.areaedif>0 && (a.uso===1||a.uso===5) && !isGarage(a)) {...}` — comercial e garagem caem para o caminho venal (Caixa/AUTO_COEF), que ao menos usa a base fiscal específica do imóvel. Para box, opcionalmente retornar null com metodo explicando que vaga não tem referência.

### [MEDIA] O imóvel avaliado entra na própria amostra de comparáveis — vicia mediana com n pequeno e o percentil 'mais caro que X% dos vizinhos'

A consulta por raio em compsBase (l.970) parte de a.x_coord/a.y_coord e não exclui o próprio registro, que sempre satisfaz os filtros de área e uso. Com o limiar n>=3 (l.949, l.962), 'três comparáveis' são na prática 2 vizinhos + o próprio imóvel, e a mediana é puxada na direção do avaliado. No percentil (l.1009: `vals.filter(v=>v<myPm2).length/vals.length`), o próprio imóvel está no denominador (contagem estrita v<myPm2 não o conta no numerador), deflacionando o percentil — com n=4, um imóvel acima de todos os vizinhos mostra 75% em vez de 100%. No caminho n>400 o efeito é desprezível, mas no exact com n<20 distorce. O laudo repete: 'Foram considerados N imóveis de perfil semelhante' (l.1153) contando o avaliado.

**Correção proposta:** No caminho exact, excluir por identidade antes das estatísticas: dado que outFields=* já vem com nrinscr/ci, `vals` deve descartar o registro com `clean(x.nrinscr||x.ci)===clean(a.nrinscr||a.ci)` (comparar antes de mapear para R$/m²). No caminho count, usar `below=(c.count)/ (r.n-1)` e reportar n-1. Alternativa server-side: `where += " AND nrinscr<>'"+insc+"'"` quando houver inscrição.

### [MEDIA] Estimativa de mercado de unidade ignora o venal relativo: todo apartamento do bairro recebe o mesmo R$/m², contradizendo a própria análise de vizinhança exibida ao lado

No caminho da tabela (l.778-782), a faixa é `areaedif*m2b*0,90*(0,88–1,12)` — o vlvenal do imóvel é descartado. Um apto padrão simples de 80 m² e uma unidade de alto padrão de 80 m² no Bueno recebem a mesma faixa, embora o cadastro (venal/m²) os diferencie. O app exibe, no mesmo painel, a faixa de vizinhança `q1*cEff–q3*cEff` (l.1038) que É calibrada pela posição relativa (cEff=m2b*0,90/med ancora a mediana venal na mediana de mercado) — as duas faixas se contradizem sistematicamente para imóveis fora da mediana, e é a faixa NÃO calibrada que alimenta o valor sugerido do laudo (l.1087). A banda fixa ±12% também não reflete a dispersão real do bairro (amp medida chega a >40% pela própria régua de l.1019).

**Correção proposta:** Quando houver comps carregados (LZ.comps ou CMPCACHE), ancorar a estimativa na posição relativa: `const rel=Math.min(1.4, Math.max(0.7, myPm2/r.med)); v=areaedif*m2b*FATOR_OFERTA*rel;` (clamp 0,7–1,4 evita extrapolar outliers cadastrais). Sem comps, manter o comportamento atual. No wizard, preferir a faixa de vizinhança calibrada quando res.n>=5 e conf não for 'baixa'.

### [BAIXA] Quartis interpolados e cerca de Tukey sobre n=3-4: outlier legítimo é cortado e a 'faixa' vira artefato

compsStats aceita n>=3 (l.978, l.985) e aplica quant(vals,.25/.75) + cerca de Tukey (l.987-988) mesmo com 3 pontos: com n=3, q1 e q3 são interpolações entre 2 valores, o iqr é instável e a cerca 1,5×iqr pode eliminar um dos 3 pontos (sobrando 2, ainda renderizados como faixa min–max com IQR na barra, pois o check n<3 de compare l.962 usa o n PÓS-trim só quando o trim já rodou). O selo 'baixa/poucos vizinhos' (l.1019) mitiga a leitura, mas a barra gráfica (l.1031-1035) e o laudo (l.1148-1153) apresentam Q1-Q3/mediana com aparência de estatística robusta. Combinado com o achado do auto-comparável, n=3 pode significar 2 vizinhos reais.

**Correção proposta:** Pular a cerca de Tukey quando vals.length<8 (com n baixo ela remove sinal, não ruído): `if(vals.length>=8){...filtro...}`. Exigir n>=5 para desenhar IQR/mediana na barra — entre 3 e 4, mostrar só min–max com texto 'amostra mínima'. No laudo, suprimir o gráfico quando n<5.

### [BAIXA] Descontinuidade metodológica no corte n=400: estatísticas com e sem expurgo de outliers são apresentadas como a mesma métrica

No caminho exact (n<=400, l.980-991) os quartis são recalculados APÓS remover outliers por Tukey e o n exibido é o pós-trim; no caminho de contagens (n>400, l.992-1004) os percentis são da distribuição BRUTA (outliers incluídos, que esticam q3 e a cerca estimada) e o n exibido é o bruto. Uma vizinhança com 395 imóveis e outra com 410 — estatisticamente idênticas — mostram faixas e selos de confiança diferentes (amp=(q3-q1)/med muda com o expurgo, l.1018-1019), e o cEff (l.1027) muda junto porque divide por medianas de definições distintas. A mediana em si é robusta, mas q1/q3 brutos vs. expurgados divergem em bairros com uso misto ou registros venais defeituosos.

**Correção proposta:** Aproximar as definições: no caminho de contagens, depois de estimar q1/q3 brutos, refazer os percentis restringindo o WHERE ao intervalo de Tukey estimado (`AND vlvenal/areaField>=fenceLo AND <=fenceHi` — a aritmética no WHERE já é usada, l.998) com 1 rodada extra de counts; ou, mais simples, sinalizar no rótulo que faixas '~' (l.1036) incluem extremos, e usar percentis 10-90 como min/max no caminho aproximado em vez de cercas derivadas de iqr impreciso.

---

## Lente: laudo-legal

O laudo gerado por montarLaudo() (radar-goiania.html, linhas 1122–1184) é visualmente sólido e já acerta em pontos raros (fator oferta NBR, validade de 90 dias, disclaimer "não substitui laudo NBR 14653", título rebaixado sem CRECI). Mas, medido contra a Res. COFECI 1.066/2007 e a prática de PTAM, faltam elementos essenciais: solicitante, finalidade, data/existência de vistoria e menção ao CNAI. Há ainda 3 frases juridicamente arriscadas: intitular PTAM só com CRECI, chamar a estatística sobre valores venais de "método comparativo direto de dados de mercado", e imprimir "Documentação ok" como diferencial sem ressalva de que nada foi conferido em cartório. Quase tudo se resolve com frases fixas; bastam 2 campos novos no wizard (solicitante/finalidade e toggle de vistoria).

### [ALTA] PTAM emitido só com CRECI — Res. 1.066/2007 condiciona o PTAM à inscrição no CNAI

Linha 1126–1127: `const comCreci=!!(p.creci||"").trim(); const titulo=comCreci?"Parecer Técnico de Avaliação Mercadológica (PTAM)":...` e linha 1177 imprime "Emitido como PTAM na forma da Resolução COFECI nº 1.066/2007". A própria resolução invocada condiciona a atuação do corretor como avaliador à inscrição no CNAI (Cadastro Nacional de Avaliadores Imobiliários), não apenas ao CRECI. Um documento que se autodeclara "na forma da Res. 1.066" sem número de CNAI é o primeiro ponto que um assistente técnico adverso ataca — e expõe o corretor perante o próprio CRECI-GO.

**Correção proposta:** Sem campo novo: renomear o campo existente do passo 4 para "CRECI / CNAI" (placeholder: "CRECI 12345 · CNAI 6789") e imprimir tal qual na assinatura e no cabeçalho. Se o texto digitado não contiver "CNAI", trocar a frase da linha 1177 por: "Parecer emitido por corretor de imóveis inscrito no CRECI. A menção à Resolução COFECI nº 1.066/2007 pressupõe inscrição do subscritor no CNAI." — ou rebaixar o título para "Parecer Mercadológico".

### [ALTA] Faltam solicitante e finalidade — elementos nucleares do PTAM

O laudo não tem NENHUM campo de quem pediu nem para quê (linhas 1129–1143 listam só dados do imóvel; passo 4 do wizard, linhas 1104–1112, só colhe dados do corretor). Sem finalidade declarada, o mesmo PDF pode ser reaproveitado pelo cliente para garantia bancária, inventário ou juízo — usos que o corretor nunca chancelou. É o item mais cobrado da Res. 1.066 e o que mais protege o subscritor.

**Correção proposta:** 1 campo novo (o primeiro dos 2 permitidos), no passo 4: input "Solicitante" + select "Finalidade" (Venda/compra · Locação · Partilha ou inventário · Garantia · Instrução judicial · Outra). No laudo, nova linha na tabela da seção 1 ("Solicitante / finalidade") e frase fixa nas ressalvas: "Este parecer foi elaborado a pedido de [solicitante], exclusivamente para a finalidade de [finalidade], sendo vedada sua utilização para fim diverso ou por terceiros."

### [ALTA] Nenhuma menção a vistoria — laudo com fotos e 'estado declarado' sem dizer se houve visita

O documento imprime "Estado de conservação (declarado)" (linha 1141), fotos (linha 1175) e só a data de emissão ("EMITIDO EM ${hoje}", linha 1158). Data da vistoria — ou a declaração expressa de que NÃO houve vistoria — é elemento clássico de PTAM e a omissão é o segundo ponto de impugnação padrão. Hoje o leitor não sabe se o corretor pisou no imóvel, e as fotos sugerem que sim mesmo quando vieram do cliente por WhatsApp.

**Correção proposta:** 2º campo novo, no passo 1 ("O imóvel"): toggle "Vistoriei o imóvel pessoalmente" + data (default hoje). Se ligado, linha na seção 1: "Vistoria realizada pelo subscritor em [data]". Se desligado, frase fixa nas ressalvas: "Avaliação realizada sem vistoria presencial, com base em dados cadastrais públicos, fotografias e informações prestadas pelo interessado, assumidas como verdadeiras (condição limitante)."

### [MEDIA] Overclaim metodológico: 'Método comparativo direto de dados de mercado' sobre valores venais

Linha 1177: "Método comparativo direto de dados de mercado: estatística robusta ... sobre a base pública do Cadastro Imobiliário". Mas a amostra é de VALORES VENAIS (o próprio laudo diz, linha 1153: "valor unitário (base venal)"), convertidos a mercado por um fator único de bairro. Isso não é o MCDDM da NBR 14653 (que exige dados de OFERTA/transação e tratamento por fatores ou regressão). Usar o nome técnico do método convida comparação com a norma — comparação que o documento perde.

**Correção proposta:** Reescrever a abertura do parágrafo (linha 1177) para: "Abordagem comparativa simplificada: estatística robusta (mediana; exclusão de discrepantes pela cerca de Tukey) sobre a base fiscal pública do Cadastro Imobiliário de Goiânia, convertida a valores de mercado por referências públicas de R$/m² por bairro (...)". Manter todo o resto; só remover a rotulagem "método comparativo direto de dados de mercado".

### [MEDIA] Chip 'Documentação ok' impresso sem ressalva — parece diligência cartorária que não existiu

DIFS inclui "Documentação ok" (linha 1046) e o laudo imprime em "Diferenciais (declarados)" (linha 1142). Combinado com a ausência total de ressalva documental, um comprador que descubra penhora na matrícula pode alegar que o parecer atestou regularidade. As áreas também saem do cadastro municipal e podem divergir da matrícula — sem aviso.

**Correção proposta:** Duas frases fixas nas ressalvas (zero campos): "Não foram examinadas matrícula, certidões ou eventuais ônus reais; referências à situação documental decorrem exclusivamente de declaração do interessado." e "Áreas e características conforme o cadastro municipal, podendo divergir da matrícula do imóvel." Opcional: renomear o chip para "Docs declarados ok".

### [MEDIA] Pressupostos e condições limitantes incompletos: falta declaração de independência e uso restrito

O parágrafo .lmiudo (linha 1177) mistura metodologia e ressalvas, mas não contém os pressupostos padrão que blindam o avaliador: independência (ausência de interesse no imóvel), veracidade assumida das informações de terceiros e restrição de uso. São boas práticas consolidadas de PTAM/NBR 14653-1 e custam três frases.

**Correção proposta:** Acrescentar ao final do mesmo parágrafo: "O subscritor declara não possuir interesse presente ou futuro no imóvel avaliado nem vínculo que comprometa sua isenção. As informações prestadas por terceiros foram assumidas como verdadeiras. Este documento é indivisível — nenhuma parte pode ser interpretada isoladamente do conjunto."

### [BAIXA] Laudo pode sair sem valor conclusivo, ou com valor fora da faixa sem justificativa

wizNext() (linhas 1115–1121) valida apenas o nome; LZ.valor pode ser null e a linha 1172 imprime "—" no destaque "Valor de venda sugerido" — um parecer de avaliação sem valor. Além disso, o usuário pode digitar valor muito fora da faixa estimada (est.lo–est.hi) e o PDF imprime ambos lado a lado sem uma linha de justificativa, o que enfraquece o documento em juízo.

**Correção proposta:** Em wizNext(): `if(LZ.valor==null){toast("Informe o valor de venda sugerido.");return;}`. Em montarLaudo(), se est existir e LZ.valor sair de [est.lo, est.hi], acrescentar sob o destaque: "Valor arbitrado pelo subscritor com base em vistoria/diferenciais e observações, divergindo da faixa estatística de referência."

### [BAIXA] Sem descrição da região — seção esperada em PTAM, resolvível com dados já carregados

O laudo pula da identificação (seção 1) direto para a análise de mercado (seção 2, linhas 1168–1174); não há caracterização da região/bairro, item habitual de PTAM. Os dados para uma frase automática já estão em memória: bairro (a.nmbairro), amostra de vizinhança (g.res.n, g.radius) e a referência de R$/m² do bairro (M2_MERCADO, linhas 761–772).

**Correção proposta:** Sem campo novo: abrir a seção 2 com parágrafo gerado, ex.: "O imóvel situa-se no bairro ${a.nmbairro}, região com ${g.res.n} imóveis de perfil semelhante cadastrados num raio de ${g.radius} m" + (se m2b) ", com referência pública de mercado de R$ ${m2b}/m² anunciado (${M2_MERCADO.ref})". O campo Observações existente cobre particularidades.

---

## Lente: acessibilidade

Auditoria de acessibilidade do radar-goiania.html (1305 linhas, lido na íntegra). O app tem bons pontos de partida — alvos de toque >=44px no mobile, combobox com role/aria-expanded/aria-controls, Esc fecha wizard e sheet (l.1259-1260), lang="pt-BR" — mas falha nos fundamentos de leitor de tela e teclado: o wizard do laudo é um overlay fixed sem role de diálogo, sem foco inicial, sem trap e sem devolução de foco; todo o feedback do app (toast, loading, abertura do painel de detalhe, contagem de resultados) é visual e silencioso para leitores de tela; os cards de resultado são divs clicáveis inalcançáveis por teclado — um usuário só de teclado não consegue abrir o detalhe de nenhum imóvel; botões de ícone (×, ‹, alça) não têm nome acessível; os inputs do wizard usam spans em vez de label; estados ligado/desligado (modo de busca, chips, Caixa) não são expostos via ARIA; e há falhas de contraste reais na paleta (dourado sobre papel ~2,8:1, badge branca sobre dourado ~3,5:1, verde-lote ~3,9:1, accent sobre papel ~4,3:1). Limitações do mapa (hover em polígono, clique espacial) são aceitáveis dado o requisito, desde que o painel/lista se tornem operáveis por teclado.

### [ALTA] Wizard do laudo: overlay modal sem semântica de diálogo, sem focus trap e sem devolução de foco

O wizard é <div class="wiz" id="wiz" hidden> (l.401) posicionado com position:fixed;inset:0 (l.180). abrirLaudo() (l.1048-1055) só faz wiz.hidden=false e fecharLaudo() (l.1056) só faz hidden=true: não há role="dialog", aria-modal, movimentação do foco para dentro do wizard ao abrir, trap de Tab, nem retorno do foco ao botão "Gerar laudo" ao fechar. O conteúdo de fundo (painel, mapa) continua no tab order e visível ao leitor de tela (sem inert/aria-hidden). Além disso wizRender() (l.1067) troca todo o innerHTML de #wBody a cada passo sem anunciar nada — usuário de VoiceOver no iPhone (caso de uso declarado) não percebe que a tela mudou. Cenário: com VoiceOver, ao tocar em "Gerar laudo" o foco permanece no sheet atrás do wizard; o usuário navega por conteúdo invisível e não encontra os passos do laudo; ao fechar, o foco se perde para o body.

**Correção proposta:** No #wiz: role="dialog" aria-modal="true" aria-label="Laudo de avaliação". Em abrirLaudo(): guardar document.activeElement, chamar wBody.querySelector('.wh1')?.focus() (com tabindex="-1" no título) ou focar #wBack; aplicar inert nos irmãos (.wrap) enquanto aberto. Em fecharLaudo(): restaurar o foco guardado. Em wizRender(): após trocar o passo, focar o novo .wh1 (tabindex=-1) para anunciar a mudança. Trap simples de Tab via keydown no #wiz (se Tab no último focável, volta ao primeiro).

### [ALTA] Nenhuma live region: toasts, loading e abertura do detalhe são silenciosos para leitor de tela

Todo o feedback do app passa por toast() (l.639-640, textContent em #toast, l.376) e loading() (l.641-642, #loadmsg): erros de rede ("Falha ao consultar o cadastro", l.727), validação ("Digite a inscrição cadastral", l.676; "Preencha seu nome…", l.1118), status ("Resultado muito grande…", l.664). Nenhum desses elementos tem role="status"/"alert" ou aria-live. showDetail() (l.880-926) também abre o painel só com classList.add("show") — sem foco nem anúncio. Cenário: usuário de VoiceOver toca "Localizar no mapa" com campo vazio; o toast aparece e some em 3,6s sem ser lido; para ele o botão simplesmente "não funcionou". O mesmo com falha de rede e com a validação do nome no último passo do wizard (o clique em "Gerar PDF" parece não fazer nada).

**Correção proposta:** Adicionar role="status" aria-live="polite" (ou role="alert" para erros) ao #toast e aria-live="polite" + aria-busy ao #loading/#loadmsg no HTML estático (l.376-377) — como os elementos já existem no DOM, basta o atributo, sem mudança de JS. Em showDetail(), mover o foco para o #detail (tabindex="-1") ou dar role="region" aria-label="Detalhe do imóvel" e anunciar via live region.

### [ALTA] Cards de resultado são divs com onclick — impossíveis de ativar por teclado

cardHTML() gera <div class="card" data-i="${i}" onclick="pick(${i})"> (l.829) sem tabindex, role ou handler de teclado; .card tem cursor:pointer (l.111) mas nada mais. pick() (l.870-878) é o ÚNICO caminho para abrir o painel de detalhe fora do mapa (o outro caminho é clique/hover no mapa, aceitável como limitação). O cabeçalho de prédio (l.819) e os itens do combo (l.602, tratados via input) são análogos, mas o card é o crítico. Cenário: usuário só de teclado (ou de switch control no iPhone) faz uma busca, a lista aparece, e ele não consegue selecionar nenhum resultado — Tab pula da lista direto para o rodapé; o fluxo principal do app (buscar → detalhar → laudo/CND) fica inteiro bloqueado.

**Correção proposta:** Trocar o div por <button type="button" class="card" …> (reset de estilos: display:block;width:100%;text-align:left;font:inherit) ou, minimamente, adicionar tabindex="0" role="button" e onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();pick(i)}" no template de cardHTML().

### [MEDIA] Botões de ícone sem nome acessível (×, ‹, remover foto) e alça do sheet só operável por ponteiro

Botões cujo único conteúdo é um caractere tipográfico: fechar detalhe <button class="x" onclick="closeDetail()">×</button> (l.381), voltar do wizard <button class="wback">‹</button> (l.403), fechar wizard <button class="wclose">×</button> (l.405), remover foto <button class="rm">×</button> (l.1103). Leitores de tela anunciam "sinal de multiplicação, botão" ou nada útil; "‹" é ainda pior. A alça do bottom sheet é <div class="grab" id="grab"> (l.380) com click/pointer handlers (l.1263-1277) — não focável e sem nome (mitigado por Esc e pelo ×, mas o gesto de arrastar não tem equivalente anunciado). Cenário: usuário de VoiceOver no sheet ouve "multiplicação, botão" e não sabe se fecha o painel ou apaga algo; nas fotos do laudo, os oito "×" são indistinguíveis entre si.

**Correção proposta:** aria-label="Fechar detalhe" no .x, aria-label="Voltar" no .wback, aria-label="Fechar laudo" no .wclose, aria-label="Remover foto ${i+1}" no .rm; no .grab, aria-hidden="true" (a função já é coberta por Esc e pelo × — basta não expor o div).

### [MEDIA] Combobox de setor: item ativo do teclado invisível para leitor de tela (sem aria-activedescendant / aria-selected)

O input tem role="combobox" aria-expanded aria-controls aria-autocomplete (l.327-328) e as opções têm role="option" (l.602) — mas as opções não têm id, o input nunca recebe aria-activedescendant, e a navegação por setas apenas alterna a classe .active (l.1287-1296). aria-selected não existe em nenhuma opção, e o estado vazio é um div sem role dentro do role="listbox" (l.601). Cenário: usuário de VoiceOver digita "marista", pressiona seta para baixo — visualmente o item destaca, mas nada é anunciado; ele não tem como saber qual setor será escolhido no Enter, num passo obrigatório da busca (resolveBairro() exige seleção, l.687/709).

**Correção proposta:** Em filterCombo() (l.602), gerar id="opt-${b.code}" e aria-selected="false" em cada item; no handler de setas (l.1287-1296), além de .active, setar inp.setAttribute('aria-activedescendant','opt-'+code) e aria-selected="true" no ativo; limpar aria-activedescendant ao fechar a lista.

### [MEDIA] Estados ligado/desligado só visuais: modos de busca, telas Busca/Mapa, chips do wizard e botão Caixa sem ARIA de estado

A seleção é comunicada apenas pela classe .on: modos Quadra+Lote/Endereço/Inscrição (l.318-321 + setMode l.628-638), viewbar Busca/Mapa (l.395-396 + setView l.646-652), estado de conservação .seg e diferenciais .chips do wizard (l.1081-1083 — botões toggle puros), e o toggle da camada Caixa (l.361 + l.1209). Nenhum tem aria-pressed, aria-selected ou role=tab/tablist. Cenário: usuário de leitor de tela no passo 1 do wizard toca "Piscina" e não recebe confirmação de que o diferencial ficou marcado (nem consegue verificar depois); no painel, não sabe qual modo de busca está ativo antes de preencher os campos.

**Correção proposta:** Adicionar aria-pressed="true/false" nos toggles (chips, seg, btnCaixa) sincronizado onde a classe .on é alternada; para os grupos exclusivos (moderow, viewbar), aria-pressed também resolve com mudança mínima (alternativa: role="tablist"/"tab" + aria-selected, mais invasiva).

### [MEDIA] Inputs do wizard sem label associado e fotos sem alt

O wizard usa <span class="wlabel"> em vez de <label for>: "Valor de venda sugerido" e "Observações" (l.1095-1098), "Nome completo *", "CRECI", "Telefone / e-mail" (l.1107-1112). Nenhum .winput tem id, aria-label ou aria-labelledby — o leitor de tela anuncia só "campo de texto". As miniaturas de foto são <img src="${f}"> sem alt (l.1103), viram "imagem" ou o data-URI lido em voz alta. O painel principal, em contraste, usa <label for> corretamente (l.325, 336-337, 343-345, 355) — o padrão existe no projeto, só não foi aplicado ao wizard. Cenário: usuário de VoiceOver no passo "Você" encontra três campos idênticos sem nome e não sabe qual é nome, CRECI ou contato — dados que assinam o laudo.

**Correção proposta:** Trocar os spans por <label class="wlabel" for="wValor">…</label> e dar id aos inputs em wizRender() (l.1091-1112); nas fotos, alt="Foto ${i+1} do imóvel" (l.1103).

### [MEDIA] Contraste insuficiente: dourado sobre papel (~2,8:1), badge branca sobre dourado (~3,5:1), verde-lote (~3,9:1) e accent sobre papel no limite (~4,3:1)

Calculado sobre a paleta declarada (l.18-32): (a) .caixabtn usa color:var(--gold) #a8842c sobre --paper #e9e4d8 (l.165-166) — ~2,8:1 em texto de 12px bold, bem abaixo do mínimo AA 4,5:1; (b) .badge.media é texto branco 9px sobre --gold (l.154) — ~3,5:1, e é justamente o selo de confiança "faixa aproximada" dos comparáveis (l.1019); (c) .card .ql-tag usa --lot-bright #3f7a63 sobre --paper (l.114) — ~3,9:1 em 12px, e é a informação-chave do card (Quadra/Lote); (d) --accent #b5451f sobre --paper dá ~4,3:1, marginalmente reprovado nos textos accent do card (.unit l.89, .vals .ref l.122-123). --muted #6b6353 sobre --paper passa raspando (~4,7:1). Cenário: corretor usando o iPhone na rua, sob sol — exatamente o contexto de uso declarado — não distingue o botão da Caixa nem o Q/L do card.

**Correção proposta:** Escurecer os tons usados como TEXTO sem tocar nos usos decorativos: --gold como texto → #7d621f (ou usar --ink no texto do .caixabtn mantendo a borda dourada); .badge.media → texto --ink sobre dourado ou fundo #8a6a1e; .ql-tag → usar --lot #2c5545 (7,6:1) em vez de --lot-bright; accent como texto pequeno → #9c3a18 (já usado no hover, l.92).

---

## Lente: python-caixa

Auditoria de atualizar-caixa.py (184 linhas): o script é enxuto e acerta em pontos importantes (escrita do JS só no final, json.dump escapando aspas, mediana com n>=3, checagem "exato" antes de computar fator laudo/venal, sleep entre queries). Os riscos principais são de robustez silenciosa: parsing do CSV da Caixa por índice fixo de coluna e encoding latin-1 cravado (mudança de layout/encoding gera arquivo vazio ou dados trocados sem erro), matching de bairro por substring bidirecional que pode atribuir cdbairro errado (contaminando pino E fator, pois QD/LT se repetem em todo bairro), e pino rotulado como preciso ("q") baseado em LIKE de dígitos que pode cair no lote errado. Há ainda oportunidades reais de enriquecimento com colunas hoje ignoradas (descrição com áreas -> R$/m² de laudo por bairro).

### [ALTA] CSV da Caixa parseado por índice fixo de coluna — mudança de layout troca dados silenciosamente ou derruba o script

Linhas 84-92: os campos são lidos por posição (r[2]=cidade, r[3]=bairro, r[5]=preço, r[6]=avaliação, r[7]=desconto, r[9]=tipo, r[11]=link) e a linha 81 localiza o cabeçalho (`head_i = next(i for i,r in ... if "im" in r[0].lower() and "vel" in r[0].lower())`) mas NÃO usa o cabeçalho para mapear colunas. Se a Caixa inserir/reordenar uma coluna (já mudou o layout desse CSV no passado), preço e laudo podem trocar de lugar e o app passa a exibir laudo como preço sem nenhum erro; se o cabeçalho mudar de texto, o next() sem default estoura StopIteration com traceback críptico. O filtro `len(r) < 12` (L84) também descarta linhas silenciosamente se o número de colunas cair para 11.

**Correção proposta:** Usar a linha de cabeçalho já localizada para resolver índices por nome (ex.: idx = {norm(c): j for j,c in enumerate(rows[head_i])}; procurar 'PRECO', 'VALOR DE AVALIACAO', 'DESCONTO', 'BAIRRO'...), abortar com mensagem clara se alguma coluna esperada faltar, e trocar o next() por next(..., None) com erro explicativo.

### [ALTA] Encoding cravado em latin-1 + ausência de guarda de sanidade: rodada ruim sobrescreve caixa-goiania.js com zero imóveis

Linha 79: `raw = http(CSV_URL).decode("latin-1", "replace")`. Se a Caixa migrar o CSV para UTF-8, 'GOIÂNIA' vira mojibake ('GOIÃ\x82NIA'), o filtro `norm(r[2]) != "GOIANIA"` (L84) rejeita TODAS as linhas e o script grava (L176-179) um caixa-goiania.js com "imoveis":[] por cima do arquivo bom — o botão da camada Caixa some do app (initCaixa retorna se pl.length==0) sem qualquer aviso. O mesmo vale para um CSV vazio/quebrado servido pela Caixa: nada impede a gravação.

**Correção proposta:** Detectar encoding (tentar utf-8 e cair para latin-1, ou vice-versa, escolhendo o que decodifica sem replacement) e recusar a gravação se len(imoveis)==0 — ou se cair mais de ~70% em relação ao arquivo anterior — saindo com sys.exit(1) e mantendo o caixa-goiania.js antigo.

### [ALTA] Matching de bairro por substring bidirecional sem preferência de comprimento — cdbairro errado contamina pino E fator laudo/venal

Linhas 114-118: se as chaves exatas falham, o fallback aceita o PRIMEIRO core do cadastro tal que `c in cx_core or cx_core in c`, sem comprimento mínimo nem preferência pelo match mais longo. Cores curtos após remoção de prefixo (ex.: 'SUL' de 'SETOR SUL', ou 'JARDINS DO CERRADO 1' contido em 'JARDINS DO CERRADO 10/11') casam com o bairro errado. Consequência dupla: (1) o geocode roda no cdbairro errado e o pino cai em outro bairro; (2) a checagem 'exato' das linhas 160-165 NÃO protege o fator, porque quadra 15 / lote 12 existem em praticamente todo bairro — o fator laudo/venal é então calculado com o vlvenal de um lote de OUTRO setor e ainda passa no critério, distorcendo a estimativa de mercado do app (usado em radar-goiania.html L784/L1024/L1128).

**Correção proposta:** No fallback: exigir len>=6 (ou >=2 tokens) no core, coletar TODOS os candidatos e escolher o de maior comprimento comum (ou o único — descartar se ambíguo), e logar cada casamento por substring para revisão manual.

### [MEDIA] Pino rotulado como preciso (pr='q') usa LIKE de dígitos e pode cair no lote errado da quadra

Linhas 126 e 130-131: quadra e lote entram no WHERE como `LIKE '%<dígitos>%'` (lote 12 casa 112, 120, 212; quadra idem) e a linha 143 pega apenas o primeiro registro por OBJECTID. A validação 'exato' (L160-162, comparando dígitos com lstrip('0')) é usada SÓ para o fator, não para a precisão do pino: um imóvel cujo primeiro match do LIKE é o lote errado recebe pr='q' e o popup do app (radar-goiania.html L1202) omite o aviso 'pino aproximado', que só aparece para pr='r'. O usuário confia num pino que pode estar em outro lote da quadra — ou em outra quadra.

**Correção proposta:** Reaproveitar a checagem `exato`: se prec=='q' mas exato for falso, rebaixar im['pr'] para 'r' (ou um novo nível 'q~') para o app exibir o aviso de aproximação. Alternativa melhor: pedir resultRecordCount maior e escolher o feature cujos nrquadra/nrlote batem exatamente.

### [MEDIA] Regex QD/LT descarta sufixos de letra e não casa quadra alfabética — colisões 12A/12B e imóveis não geocodificados

Linhas 123-124 capturam sufixo de letra (`[0-9]+[A-Z]?`) mas as linhas 126/131 e a checagem exato (L159, `re.sub(r"\D","",...)`) removem TODAS as letras: 'LT 12A' e 'LT 12B' viram ambos '12' — o pino e o fator podem usar o lote vizinho errado com selo de exatidão. No sentido oposto, quadra apenas alfabética ('QD A', comum em setores antigos) não casa o regex (`[0-9]+` obrigatório) e o imóvel perde o candidato de maior precisão.

**Correção proposta:** Comparar quadra/lote preservando o sufixo alfabético (normalizar como dígitos.lstrip('0') + letras) e aceitar `([A-Z]{1,2}|[A-Z]{0,2}-?[0-9]+[A-Z]?)` para quadras só-letra, usando igualdade (UPPER(nrquadra)='A') em vez de LIKE nesses casos.

### [MEDIA] Retry ingênuo no HTTP: sem backoff, sem tratamento de 429/403, e falha na etapa 2 aborta tudo

Linhas 24-34: 2 tentativas com sleep fixo de 2s, capturando Exception genérica — um 429/403 do ArcGIS ou da Caixa recebe o mesmo tratamento de um timeout. No loop de geocodificação o erro é apenas logado (L145-146, bom), mas o sleep de 0,25s (L148) roda ~2 queries por imóvel; com algumas centenas de imóveis são ~500+ requisições sequenciais — se o portal começar a limitar, o script degrada para 'aviso' em todos e grava um arquivo com quase nenhum imóvel plotável (agrava o achado 2). Rodar 2x seguidas é idempotente no resultado, mas repete todas as ~500 queries do zero (sem cache).

**Correção proposta:** Backoff exponencial (2s, 8s, 30s; tries=3), tratar HTTPError 429/503 esperando o Retry-After, e contar falhas consecutivas no loop — acima de ~10, abortar sem gravar. Opcional: cachear geocodificação por id do imóvel em um JSON local para reexecuções baratas.

### [BAIXA] JS gerado é sólido quanto a aspas, mas U+2028/U+2029 podem quebrar o parse e a URL da Caixa não é validada

Linhas 176-179: json.dump escapa aspas e barras corretamente (verificado no caixa-goiania.js gerado), então o vetor clássico de quebra não existe; como o arquivo é externo (<script src>), '</script>' em campos também não é problema. Restam dois pontos menores: (1) com ensure_ascii=False, os caracteres U+2028/U+2029 sairiam crus e são inválidos em string literal JS em engines pré-ES2019 — improvável no iPhone atual, mas gratuito de prevenir; (2) o campo 'u' (L92, coluna 11) vira href direto no popup (radar-goiania.html L1203) — esc() neutraliza HTML, mas não bloquearia um esquema 'javascript:' caso o CSV viesse adulterado/alterado.

**Correção proposta:** Após o json.dump, aplicar .replace(' ','\\u2028').replace(' ','\\u2029') (ou usar ensure_ascii=True só nesse dump); no gerador, descartar 'u' que não comece com 'https://venda-imoveis.caixa.gov.br'.

### [BAIXA] Dados da Caixa subaproveitados: coluna de descrição (áreas) ignorada permitiria R$/m² de laudo real por bairro

O script pula r[8] (a coluna de descrição do CSV da Caixa, que costuma trazer área do terreno e área privativa) e usa o laudo só para o fator laudo/venal agregado (L163-165), restrito a casa/terreno com QD/LT exatos — no arquivo gerado hoje os apartamentos (maioria da lista, ex. Jardins do Cerrado) não contribuem com nada estatístico. Com a área extraída, cada laudo viraria um R$/m² observado, alimentando a tabela de mercado por bairro do app (hoje dependente de fontes de imprensa) com dados oficiais e datados; a data 'gerado' também é global (L173) — imóveis de rodadas distintas não são distinguíveis, e o desconto/modalidade não entram em nenhum filtro do app.

**Correção proposta:** Extrair área da descrição por regex (m² de terreno/privativa), gravar 'm2' e calcular por bairro a mediana de laudo/m² separada por tipo (casa/terreno vs apartamento), exportando em 'fatores' um bloco 'laudoM2' que a tabela de estimativa do app consumiria com prioridade sobre as fontes genéricas — mantendo o critério n>=3 já usado.

---

## Lente: arquitetura

Auditoria de arquitetura e deploy do Radar Fundiário (arquivos lidos: radar-goiania.html 1304 linhas, sw.js, manifest.json, index.html, atualizar-caixa.py, caixa-goiania.js, README.md, PUBLICAR.md, ROADMAP-radar.md, .claude/launch.json, .gitignore, histórico git dos branches master e gh-pages). O deploy falha porque o site usa o pipeline legado "Deploy from a branch" (workflow interno pages-build-deployment), que sofre falhas transitórias conhecidas de infraestrutura do GitHub — o histórico confirma 3 commits vazios "Rebuild Pages" usados como retry manual. A correção definitiva é migrar para Source=GitHub Actions com o workflow oficial (actions/deploy-pages + concurrency group "pages"), o que também elimina o duplo-push master/gh-pages e permite publicar só os arquivos do app (hoje documentos internos de trabalho, incluindo um dossiê de pesquisa de 97KB, são servidos publicamente no site). Achados secundários: ROADMAP com 4+ itens marcados "a fazer" que já estão implementados no código (e um marcado ✅ que não existe), dados da Caixa sem alerta de idade no app, monolito saudável porém sem os testes que o próprio roadmap prevê, CSS morto da régua removida, e README sem URL pública nem LICENSE.

### [ALTA] Deploy intermitente: pipeline legado 'Deploy from a branch' + retry manual por commit vazio — migrar para o workflow oficial de Actions

Não há .github/workflows/ no repo — o site usa o pipeline interno do GitHub ('pages build and deployment'), acionado por push no gh-pages (PUBLICAR.md:62-69 manda 'git push origin master master:gh-pages'). O histórico prova o sintoma: 3 commits de retry — 5f275db 'Rebuild Pages (tentativa pos-falha do job de deploy)', dbcfc68 e 34907a3 'Rebuild Pages'. Causas conhecidas (pesquisa web): o job deploy do pipeline legado falha/trava por fila e recursos compartilhados da infra do Pages, e só um deployment concorrente é permitido por site — um segundo push enquanto outro deploy roda gera falha de 'deployment request'; retries funcionam porque a infra se recupera ou o novo commit destrava o estado (fontes: https://github.com/orgs/community/discussions/49074, https://github.com/orgs/community/discussions/67961, https://github.com/orgs/community/discussions/49948, https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency). Agrava: PUBLICAR.md:47-48 documenta Source=branch 'master', mas o topo do mesmo arquivo (linha 4) diz que o Pages é servido pelo gh-pages — dois branches que precisam ser empurrados juntos para sempre, um modo de falha extra (esquecer o master:gh-pages = site desatualizado em silêncio).

**Correção proposta:** Settings ▸ Pages ▸ Source: **GitHub Actions**, e criar .github/workflows/pages.yml com o starter oficial 'Static HTML': on push no master; permissions pages:write + id-token:write; `concurrency: {group: "pages", cancel-in-progress: false}`; jobs: actions/checkout → actions/configure-pages → actions/upload-pages-artifact (path com só os arquivos do app) → actions/deploy-pages. Isso serializa deployments (fim das colisões), dá retry pelo botão 'Re-run job' (sem commit vazio) e aposenta o gh-pages — voltar a um push só (`git push`). Atualizar PUBLICAR.md em seguida.

### [MEDIA] Tudo do master é servido publicamente no site: documentos internos de trabalho, pesquisa de 97KB e .claude/launch.json publicados

gh-pages é cópia idêntica do master (mesmo commit 050ea61), então ficam acessíveis em https://melo202.github.io/radar-fundiario/: PESQUISA-inteligencia-2026-07.md (97KB de pesquisa interna), ROADMAP-radar.md, PROJETO-radar.md, INTELIGENCIA-radar.md, PUBLICAR.md, atualizar-caixa.py e .claude/launch.json (rastreado no git — confirmado por `git ls-files`; conteúdo inócuo: só `python -m http.server 8137`, sem segredo, mas é tooling pessoal em repo público). O ROADMAP publicado inclusive documenta quirks do endpoint da prefeitura e a estratégia de consulta — mapa de uso para terceiros que o próprio ROADMAP-radar.md:146 diz querer evitar ('Tráfego de terceiros bate direto na API da prefeitura — mais um motivo para não divulgar'). Há ainda 'PUXAR TITULAR AUTOMATICO.txt' não-rastreado na raiz — um `git add -A` do fluxo do PUBLICAR.md:66 o publicaria por acidente.

**Correção proposta:** Com o workflow do achado 1, publicar só o necessário: no passo upload-pages-artifact, montar uma pasta staging com index.html, radar-goiania.html, caixa-goiania.js, sw.js, manifest.json e os 4 PNGs (README pode ficar). Docs internos permanecem no repo mas fora do site. Adicionar `.claude/` e `*.txt` ao .gitignore (hoje só tem *.csv e __pycache__/) e `git rm --cached .claude/launch.json` se quiser tirá-lo do público.

### [MEDIA] ROADMAP desatualizado contra o código: 4+ itens '⬜ a fazer' já implementados e 1 '✅' que não existe mais

ROADMAP-radar.md:75 (item 13) marca '⬜ Retry/backoff nas chamadas JSONP' — implementado em radar-goiania.html:437-443 (`jsonp(params,retries=1)` com pausa de 900ms). Item 20 (linha 116) marca '⬜ Acessibilidade: ARIA no combobox, Esc fecha o detalhe' — implementado (linhas 327-329: role=combobox/aria-expanded/aria-controls; linha 1259: Esc fecha wizard/detalhe). Item 21 (linha 117) marca '⬜ Exportar CSV' — implementado (exportCSV, linha 1231). Seção 'P1 Publicação' (linhas 80-82) diz 'Falta só: criar o repositório no GitHub' e a seção final (linha 148) manda 'renomear radar-goiania.html para index.html' — já publicado desde 02/07 (PUBLICAR.md:3) e o index.html real é um redirect, não renomeação. No sentido inverso, item 15b (linha 109) marca '✅ Coeficiente por setor (localStorage), reaplicado automaticamente' — não existe no código: a régua foi removida (linha 103 do próprio ROADMAP), o localStorage guarda só `radar_prof` (radar-goiania.html:1050,1119) e o fator é o AUTO_COEF fixo 2.8 (linha 434). Custo real: qualquer sessão futura (sua ou de IA) prioriza trabalho já feito ou confia em feature inexistente.

**Correção proposta:** Passar um pente no ROADMAP: itens 13, 20 (parcial — falta `for=`/foco visível conferidos), 21 → ✅ com data; 15b → reescrever ('substituído pela escolha automática de fonte'); seção Publicação → apontar para PUBLICAR.md como registro histórico. Regra prática: todo commit que fecha item do ROADMAP atualiza o status no mesmo commit.

### [MEDIA] Dados da Caixa sem alerta de idade: atualização é 100% manual e o app não avisa quando a lista envelhece

caixa-goiania.js é sobrescrito no lugar por atualizar-caixa.py (linha 176-179), com a data embutida no JSON (`"gerado":"2026-07-02"`) — versionamento por git é suficiente como histórico (arquivo rastreado), então data no NOME não é necessária; o problema real é outro: o app só mostra a data num toast efêmero ao ligar a camada (radar-goiania.html:1224) e os `fatores` laudo/venal dessa mesma carga alimentam silenciosamente a estimativa de mercado (linhas 784-786, 1024) e o laudo PTAM (linha 1128) — um laudo impresso pode se apoiar em laudos-Caixa de meses atrás sem nenhum aviso. O docstring do script diz 'a lista muda diariamente' (atualizar-caixa.py:6), mas nada lembra o usuário de rodá-lo.

**Correção proposta:** Barato e determinístico: no initCaixa(), calcular a idade de CAIXA.gerado e, se >14 dias, mostrar aviso persistente no botão ('🏦 Oportunidades Caixa (N) · lista de DD/MM') e acrescentar a data-base dos fatores na nota de metodologia do laudo (montarLaudo já declara fontes na seção 'Metodologia'). Opcional, casa com o achado 1: um segundo workflow com `on: schedule` (cron semanal) que roda atualizar-caixa.py e commita se houver mudança — automatiza sem tocar no app.

### [BAIXA] Monolito de 1304 linhas: saudável por decisão de projeto, mas as funções puras seguem sem testes e o custo de regressão cresce a cada feature

radar-goiania.html tem 1304 linhas (~80KB): ~300 de CSS, ~120 de HTML e ~890 de JS num único <script>. O arquivo único é uma feature deliberada (funciona em file://, deploy trivial, sem build) e nesse tamanho ainda é navegável — o limite saudável aqui não é o número de linhas, é a ausência de rede de segurança: o próprio ROADMAP-radar.md:114 (item 18, ⬜) lista as funções puras críticas sem teste (norm, likeTerm, matchApto, isGarage, toWGS, filtros de quadra/lote) e os casos que já morderam ('pino na Bahia', lote '20/21', quadra '10E'). O laudo (wizard + print CSS + montarLaudo, linhas 174-256 e 1042-1184) já é ~25% do arquivo e é a área que mais cresce. O padrão de dados externos via <script> separado (caixa-goiania.js) mostra que dá para fatiar sem build quando chegar a hora.

**Correção proposta:** Não fatiar ainda. Executar o item 18 do roadmap: extrair as funções puras para um bloco identificável (ou um radar-lib.js carregado via <script>, mantendo file://) e testar com Node + fixtures reais do endpoint. Definir gatilho objetivo para o split: quando passar de ~1800 linhas ou quando o laudo ganhar a próxima feature grande, mover laudo para arquivo próprio (lembrando de adicioná-lo ao SHELL do sw.js).

### [BAIXA] CSS morto da régua de coeficiente removida (e comentários que ainda falam em 'coeficiente')

O commit 946e663 removeu a régua de calibração da UI, mas radar-goiania.html:98-103 mantém os seletores órfãos `.calib`, `.calib .lead`, `.coefrow`, `.coefval` — nenhum elemento no HTML os usa (grep confirma: zero ocorrências de 'calib'/'coefrow' fora do bloco CSS). Comentários nas linhas 904 ('atualiza a conversão pelo coeficiente novo') e 1015 ('ex.: troca de coeficiente') descrevem um fluxo que não existe mais — quem ler vai procurar uma régua que foi removida.

**Correção proposta:** Apagar as linhas 98-103 do CSS e reescrever os dois comentários (ex.: 're-render do cache sem rede' e 're-render não repete a consulta'). Mudança de 8 linhas, zero risco.

### [BAIXA] README insuficiente para terceiros: sem URL pública, sem instruções de execução/atualização e sem LICENSE

README.md (9 linhas) diz apenas 'abra o radar-goiania.html no navegador' e linka PROJETO/ROADMAP. Faltam, para alguém que chega no repo público: (1) a URL do app publicado (https://melo202.github.io/radar-fundiario/ — só aparece em PUBLICAR.md:3, que o README não linka); (2) como rodar localmente com service worker (o launch.json usa `python -m http.server 8137`, não documentado); (3) como atualizar os dados da Caixa (atualizar-caixa.py); (4) o requisito de arquitetura que explica tudo (endpoint sem CORS → JSONP → app sem build); (5) instalação como PWA no iPhone (está em PUBLICAR.md:53-56). E não há arquivo LICENSE: repo público sem licença = todos os direitos reservados por padrão — terceiros não podem legalmente reutilizar, o que pode ser intencional (uso próprio), mas deve ser decisão consciente e declarada.

**Correção proposta:** README de ~30 linhas: link do app publicado + captura, seção 'Rodar localmente' (2 comandos), 'Atualizar dados da Caixa' (1 comando), 'Publicação' (link para PUBLICAR.md), 1 parágrafo de arquitetura (arquivo único + JSONP + por quê), e decidir a licença (MIT se quiser reuso; ou declarar explicitamente 'código para uso próprio, sem licença de reuso').
