# Domain Pitfalls — v2.1 (Busca única, Bairros, Território)

**Domain:** Refactor de busca (4 modos → campo único) + correção de nomes de bairro + ferramentas de território/captação + UX de malha, sobre um app HTML único já auditado (10 lentes, 03/07/2026) e recém-corrigido em acessibilidade/segurança/performance.
**Researched:** 2026-07-04
**Overall confidence:** HIGH para os pontos ancorados no código lido (linhas citadas) e na auditoria; MEDIUM/LOW marcado explicitamente onde a fonte é só raciocínio/analogia.

> Convenção: cada pitfall tem **Warning signs**, **Prevention** e **Fase dona** (mapeada ao milestone v2.1: Fase A = Bairros/nomes, Fase B = Malha/mobile UX, Fase C = Busca única, Fase D = Território/captação — nomeação provisória, ajustar ao roadmap real).

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or regressions em código recém-auditado.

### Pitfall 1: Regredir os fixes de acessibilidade da auditoria de 03/07 ao trocar o HTML da busca

**What goes wrong:** A auditoria de 03/07/2026 (lente `acessibilidade`) implementou, ponto a ponto, no HTML atual dos 4 modos: `role="combobox"` + `aria-expanded`/`aria-controls`/`aria-autocomplete` no input de bairro (radar-goiania.html:506), `aria-activedescendant`/`aria-selected` sincronizados no filterCombo/navegação por setas (linhas ~2196-2201), `aria-pressed` nos botões `.moderow` (setMode, linha 1114), cards de resultado navegáveis por teclado, live regions em toast/loading, e foco/trap no wizard. Um "campo único inteligente" que reescreve `setMode`, o combobox de bairro e a lista de cards do zero — sem portar esses atributos — reintroduz exatamente os bugs [ALTA] que a auditoria fechou (wizard sem `role=dialog`, cards inacessíveis por teclado, toggles sem `aria-pressed`, combobox sem `aria-activedescendant`).

**Why it happens:** "Reescrever a busca como campo único" é fácil de tratar como greenfield ("vou desenhar do zero a UX") em vez de refactor incremental — e a tentação de simplificar o HTML (menos `<div>`, menos classes) leva a jogar fora atributos ARIA que pareciam "cruft" mas eram o fix.

**Consequences:** Regressão silenciosa (não quebra visualmente, só quebra para leitor de tela/teclado) — não aparece em teste manual visual, só em auditoria futura ou reclamação de usuário. Reabre um item que já foi fechado e comitado (`91a9130 fix: correções da auditoria`), o que é pior para credibilidade do que nunca ter corrigido.

**Prevention:**
- Antes de tocar no HTML da busca, extrair uma checklist dos atributos ARIA hoje presentes (grep por `role=`, `aria-`, `tabindex` nas linhas 320-560 e 2180-2210) e tratá-la como *contrato* que a nova busca deve satisfazer, não como implementação a ser lida depois.
- Regra de fase: a nova busca só é "feita" quando a MESMA checklist de acessibilidade da auditoria (wizard=dialog, cards=button/teclado, combobox=activedescendant, toggles=aria-pressed, toasts=aria-live) passa de novo — idealmente re-rodar a lente `acessibilidade` da auditoria (ou um checklist equivalente) como gate de aceite da Fase C, não só teste visual.
- Preferir *adaptar* o combobox de bairro existente (ele já é o componente mais complexo e mais testado em ARIA) a *substituí-lo* por um input novo "genérico" que tenta fazer chip+setor+endereço tudo junto sem ARIA dedicado.

**Detection:** Rodar um leitor de tela (VoiceOver/NVDA) manualmente no fluxo busca→resultado→detalhe→laudo após o refactor; ou grep de regressão simples: contar ocorrências de `aria-`/`role=` na área da busca antes/depois do commit — uma queda grande é sinal de alerta automático.

**Phase:** Fase C (busca única) — gate de aceite, não item isolado.

---

### Pitfall 2: Perder o fix do seletor-lifecycle (SEARCHTOKEN) ao introduzir um novo fluxo de detecção de modo

**What goes wrong:** A auditoria de bugs (lente `bugs`) identificou corridas reais: respostas antigas de `buscar`/`onMapClick`/`loadCi` sobrescrevendo a mais recente, sem token — corrigido com `SEARCHTOKEN` global (radar-goiania.html:966-996, confirmado no código atual: `let SEARCHTOKEN=0`, `const tk=++SEARCHTOKEN`, checagem `if(tk!==SEARCHTOKEN)return` em pelo menos dois call-sites). Um campo único que **detecta a intenção e dispara buscas em cascata** (ex.: tentar como inscrição, falhar, tentar como quadra/lote, falhar, cair para endereço) multiplica o número de requisições concorrentes e de pontos de retorno assíncrono — se o novo fluxo não herdar (ou não propagar corretamente) o padrão de token, reabre a classe de bug inteira, agora com mais concorrência (múltiplas tentativas por char digitado, não só múltiplos toques).

**Why it happens:** O detectMode de campo único tende a rodar heurísticas em cada keystroke/debounce (para dar feedback "chip de confirmação" em tempo real) — isso é uma superfície de concorrência muito maior que 4 botões de modo explícitos, onde o usuário só dispara 1 busca por vez.

**Prevention:**
- Todo novo caminho assíncrono introduzido pelo campo único (detecção de modo, autocomplete de rua/setor, chip de confirmação) deve capturar `const tk=++SEARCHTOKEN` no ponto de entrada e checar `tk===SEARCHTOKEN` antes de qualquer mutação de estado visível (LAST, render, toast, loading) — mesmo padrão já estabelecido, não um token novo por feature.
- Debounce agressivo (250-400ms) na detecção de intenção antes de qualquer chamada de rede — a maior parte da ambiguidade ("135" é quadra? é número de rua? é início de inscrição?) pode ser resolvida client-side sem round-trip.
- Testar explicitamente o cenário da auditoria original: digitar rápido, trocar de "intenção" no meio (ex.: começar como endereço, corrigir para quadra/lote), garantir que só a última intenção resolve o estado da UI.

**Detection:** Digitar rapidamente uma sequência ambígua e observar se resultados de uma interpretação anterior aparecem depois de já ter mudado para outra; monitorar network tab por requisições órfãs que resolvem fora de ordem.

**Phase:** Fase C (busca única) — arquitetura do detectMode, não polimento.

---

### Pitfall 3: "Corrigir nomes de bairro" via join espacial ou por nome quebra a premissa documentada de que as duas camadas NÃO têm chave de join confiável

**What goes wrong:** `gerar-bairros.py` (linhas 164-191) documenta, com evidência coletada ao vivo, que a layer 2 (`id`/`nm_bai`, 1.206 polígonos, malha visual) e a layer 3 (`cdbairro`/`nmbairro`, usada pela busca) são **unidades administrativas diferentes, mantidas por processos distintos, sem chave de join confiável** — contagens estruturalmente diferentes (1.206 vs 709), 466 polígonos da layer 2 sem nome (`tp_bai="Glb"`, gleba rural não loteada — que por definição não tem `cdbairro` fiscal correspondente), e nenhuma convenção de código compartilhada. Qualquer "correção" que tente reconciliar `nm_bai` contra `nmbairro`/`cdbairro` via **spatial join** (centroide do polígono da layer 2 cai dentro do polígono de qual `cdbairro` da layer 3?) terá erro sistemático nas bordas — polígonos da malha visual que cruzam limites fiscais, ou cujo centroide geométrico cai do lado "errado" de uma fronteira sinuosa. Nomear via a lista oficial da Prefeitura (fora do ArcGIS) tem o mesmo risco se essa lista usar uma terceira convenção de nomenclatura/limites.

**Why it happens:** A tarefa está descrita como "reconciliar nm_bai contra fonte confiável" — soa como um join de dados, mas o próprio artefato do projeto (o report.md gerado) já provou que não existe join estrutural são. A tentação é tratar isso como "só preciso de um script de correspondência" quando na real é um problema de dados de origem sem chave comum.

**Consequences:** Se a correção for feita por spatial join sem validação humana nas bordas, o app troca "nomes errados conhecidos" por "nomes plausíveis mas errados de um jeito novo e não documentado" — pior para confiança do que o estado atual, porque o erro fica menos óbvio (parece certo, mas pode estar 1 bairro deslocado na fronteira).

**Prevention:**
- Tratar a correção como **auditoria manual assistida**, não pipeline automático: gerar candidatos por spatial join (centroide-in-polygon contra layer 3, ou contra a lista oficial da Prefeitura) e depois revisar manualmente os casos de baixa confiança — especialmente: (a) qualquer polígono cujo centroide fica a menos de X metros de uma fronteira fiscal; (b) os 466 sem nome (glebas) — não force um nome fiscal nelas, documente explicitamente que "gleba rural sem bairro fiscal correspondente" é um estado válido, não um bug a esconder.
- Não usar centroide de polígono irregular como proxy de "onde esse bairro está" — para polígonos concavos (o próprio `gerar-bairros.py` cita "Campos Dourados... forma concava/irregular" como caso de teste), o centroide pode cair fora do próprio polígono. Usar representative point (ex. `shapely.representative_point()`) em vez de centroide geométrico bruto.
- Congelar e versionar a tabela de correção (`id` da layer 2 → nome corrigido) como artefato revisável (CSV/JSON separado, não hardcoded no gerador) — permite auditoria e reversão pontual sem re-rodar todo o join.
- Manter a distinção entre "nome exibido no hover/toque da malha" (`nm_bai`, o que está sendo corrigido) e "bairro usado pela busca" (`nmbairro`/`cdbairro`, layer 3, inalterado) — são dados de exibição diferentes; não fundir os dois modelos de dados numa migração "para simplificar", ou a distinção documentada se perde silenciosamente na próxima pessoa que ler o código.

**Detection:** Amostragem manual de ~30-50 bairros nas bordas conhecidas (limites administrativos sinuosos, ex. entre setores centrais adensados) comparando nome novo vs. conhecimento local; grep por quantos dos 466 "sem nome" ganharam nome no processo (esperado: poucos ou nenhum, já que são glebas).

**Phase:** Fase A (auditoria/correção de nomes de bairro).

---

### Pitfall 4: O drill de bairro (`drillBairro`) não usa nome — corrigir nomes não deve (e não deveria precisar) tocar essa lógica; risco é ao contrário: alguém "aproveitar" a correção pra acoplar nome ao drill

**What goes wrong:** O código atual confirma que `drillBairro(layer)` (radar-goiania.html:933-938) e o zoom-gate de bairro↔lote (linhas 731-741) operam **inteiramente por geometria/viewport** (`map.fitBounds(b.pad(0.05))`, `map.invalidateSize()`) — o nome (`nm_bai`) só é usado para exibição (`highlightBairro`, breadcrumb, tooltip). Isso é bom (o drill não quebra ao corrigir nomes), mas é fácil, durante a correção de nomes, introduzir por engano uma dependência nova: por exemplo, se a correção decidir *remover* polígonos "sem nome" (as 466 glebas) do dataset em vez de mantê-los com nome nulo, o drill quebra para quem clica numa gleba (ela desaparece do mapa, ou o clique cai no polígono vizinho errado). Ou, se o pipeline de correção decidir *mesclar* polígonos adjacentes com o mesmo nome corrigido (para "limpar" a malha), a geometria do drill muda e o zoom/fitBounds já testado em produção passa a operar sobre um polígono diferente.

**Why it happens:** Uma tarefa de "corrigir nomes" tende a evoluir para "e enquanto estou aqui, limpar a malha" (merge de polígonos, remover glebas) porque parece uma melhoria natural e barata — mas cada mudança geométrica é uma mudança na superfície de clique/drill que já foi validada em produção (v2.0 shipped, "verificado ao vivo").

**Prevention:**
- Escopo rígido da Fase A: **só o campo `nm_bai` muda**; contagem de features (1.206), geometria de cada polígono (rings), e `id` permanecem byte-a-byte idênticos ao dataset atual. Validar programaticamente: `diff` estrutural entre `bairros-goiania.json` antigo e novo deve mostrar mudança só em `properties.nm_bai`, nunca em `geometry` ou no número de features.
- Se houver vontade genuína de tratar as glebas de forma diferente na Fase B (malha/UX mobile — ex. estilizar glebas sem nome de forma distinta), fazer isso via CSS/estilo condicional no app (`baiStyle`/`onEachBairro`), não removendo/mesclando features no dataset.
- Reusar o próprio smoke test do `gerar-bairros.py` (Campos Dourados dentro do bbox) como regressão: se ele passar mas a contagem de features mudar, é sinal de alerta mesmo assim — adicionar um segundo assert (`len(features) == 1206`, ou o valor atual real) ao regenerar.

**Detection:** Testar manualmente o drill em pelo menos 2-3 bairros que hoje têm nome errado (para confirmar que a correção mudou o nome exibido) e em 2-3 glebas sem nome (para confirmar que o drill/clique continua funcionando, só sem breadcrumb de nome, ou com um rótulo genérico como "Gleba não denominada").

**Phase:** Fase A (bairros) com verificação cruzada na Fase B (malha).

---

### Pitfall 5: 502-sob-carga do endpoint em varreduras de setor grande (Bueno 57k) para as ferramentas de Território

**What goes wrong:** O endpoint já é documentado como frágil sob carga: "Consulta pesada (count da base toda) → 502 Proxy Error — servidor frágil sob carga" (ROADMAP-radar.md §0) e a auditoria de performance mediu ~23 requisições e ~20s só para os comparáveis de UM imóvel (compsStats). As ferramentas de Território propostas (painel do setor com mediana R$/m²/IPTU/idade, heatmap R$/m² por quadra, detector de lote subutilizado) precisam, por definição, agregar estatísticas sobre **setores inteiros** — e Bueno tem 57.225 registros com `vlvenal>0`. Um heatmap "por quadra" ingenuamente implementado como "1 consulta de estatística por quadra do setor" multiplica o padrão de 23 requisições/consulta por dezenas de quadras — potencialmente **centenas a milhares de requisições** disparadas de uma vez ao abrir o painel de um setor grande, exatamente o padrão que já causa 502.

**Why it happens:** A pesquisa já validou (`INTELIGENCIA-radar.md` #2) que `returnCountOnly`, `returnDistinctValues` e aritmética no WHERE existem e são baratos — isso convida a "resolver tudo com mais uma query de contagem", sem perceber que "mais uma query por quadra × todas as quadras do setor" ainda é uma avalanche de requisições, mesmo que cada uma seja pequena.

**Prevention:**
- **Agregação server-side em UMA passada, não N passadas:** usar `returnDistinctValues` com `orderByFields` sobre `nrquadra` para listar as quadras existentes do setor em 1 consulta; depois, para estatística por quadra, preferir uma única consulta com `outFields=nrquadra,vlvenal,areaedif` (ou o mínimo necessário) paginada, calculando medianas client-side por agrupamento — trocando N requisições round-trip por 1-3 requisições paginadas de payload maior. Avaliar contra o teto de paginação já em uso (30 páginas × 2000 = 60.000, suficiente até para Bueno).
- **Zoom-gate obrigatório**: nenhuma consulta de território dispara antes do usuário estar no nível de zoom/seleção de setor explícito (reaproveitar o padrão já existente em `refreshLots` que só carrega geometria em `zoom>=17`) — nunca pré-carregar heatmap da cidade inteira.
- **Cache agressivo com invalidação por tempo, não por sessão:** dado cadastral muda pouquíssimo (a PGV é anual); cachear resultado de painel de setor em memória (ou localStorage/IndexedDB — ver Pitfall 8) por um TTL de dias, não recalcular a cada abertura do painel.
- **Debounce/fila de requisições**: se múltiplas quadras precisarem de consulta, serializar (não `Promise.all` de 50 requisições simultâneas) com um pequeno intervalo entre elas — reduz pico de carga instantânea no servidor frágil, mesmo que o tempo total suba.
- Reaproveitar o próprio fix já implementado da bissecção conjunta sugerida na auditoria estatística (memoizar contagens por limiar, compartilhar cortes entre percentis) — o padrão de "várias métricas, uma única exploração de espaço de busca" se aplica igualmente ao heatmap por quadra.

**Detection:** Contar requisições de rede disparadas ao abrir o painel de território de Bueno (o maior setor) antes de considerar a feature pronta; se passar de ~10-15 requisições para o painel completo, redesenhar. Testar deliberadamente com throttling de rede lento + retry para ver se o 502 aparece sob o padrão de uso real.

**Phase:** Fase D (território/captação) — arquitetura de agregação, não polimento posterior.

---

### Pitfall 6: localStorage (~5MB) é insuficiente e do tipo errado de storage para farming/diff/heatmap; usar sem medir o teto trava silenciosamente o navegador

**What goes wrong:** O app hoje usa `localStorage` só para 3 chaves pequenas (`radar_sat`, `radar_prof`, `radar_coach` — confirmado no código, todas strings curtas/JSON minúsculo). As features de Território propostas — "farming com memória (localStorage)" e "diff de cadastro entre visitas" — implicam guardar **snapshots de conjuntos de imóveis** (potencialmente centenas a milhares de registros por setor "farmado", repetido ao longo do tempo para o diff funcionar). `localStorage` é síncrono, bloqueia a main thread em leitura/escrita grande, e tem teto por origem de ~5-10MB dependendo do navegador — no iOS Safari (o ambiente de uso primário declarado no projeto), o teto é notoriamente mais agressivo e sujeito a eviction do WebKit em cenários de baixa memória. Um "farming" de alguns setores grandes salvos como JSON de atributos cadastrais completos (`outFields=*`, ~85 campos por registro, como já documentado na auditoria de performance) pode facilmente exceder 5MB, fazendo `localStorage.setItem` lançar `QuotaExceededError` — se não capturado, quebra silenciosamente o salvamento do farming/diff sem avisar o usuário que perdeu o snapshot.

**Why it happens:** O item já nasce especificado como "localStorage" no PROJECT.md (`farming com memória (localStorage)`) por analogia com o uso atual (pequenos prefs) — mas o volume de dados de território é de ordem de grandeza diferente (não é "1 preferência do usuário", é "um snapshot de centenas de lotes").

**Prevention:**
- Migrar o armazenamento de qualquer coisa que seja **lista de imóveis/atributos** (farming, diff, heatmap cacheado) para **IndexedDB**, não localStorage — assíncrono, não bloqueia a UI, teto ordens de magnitude maior (tipicamente % de espaço livre em disco, não um valor fixo de MB). Manter localStorage só para flags/prefs pequenas (como já é hoje).
- **Nunca armazenar `outFields=*` completo** nos snapshots de farming — allowlist explícita dos campos necessários para o diff (ci/nrinscr, vlvenal, uso, área, uma data de referência) e descartar o resto antes de persistir. Isso também é reforço direto do item de LGPD (ver Pitfall 7): menos campos guardados = menos risco de vazar `dtnascimen` por acidente num "salvar tudo".
- Medir o tamanho serializado antes de escrever e alertar/paginar/truncar quando aproximar de um teto conservador definido pelo projeto (ex.: 2-3MB por snapshot), independente do teto real do navegador — dar margem para múltiplos setores farmados simultaneamente.
- Toda escrita (localStorage OU IndexedDB) deve estar em `try/catch` com fallback visível ao usuário ("não foi possível salvar o histórico deste setor — armazenamento cheio") — o padrão atual já faz isso para as 3 chaves pequenas (`try{...}catch(e){}`), mas hoje o catch é silencioso (aceitável para prefs triviais, não aceitável para dados que o corretor espera persistir entre visitas).

**Detection:** Testar farming de 2-3 setores grandes (Bueno, Oeste, Jardim Goiás) em sequência e verificar se a quota é excedida; testar especificamente em iOS Safari (não instalado como PWA, que tem o ITP de 7 dias já documentado na auditoria) e como PWA instalado.

**Phase:** Fase D (território/captação) — decisão de storage, tomada antes de escrever qualquer código de persistência.

---

### Pitfall 7: LGPD — `dtnascimen` e outros campos pessoais podem entrar por rotas novas que o allowlist atual não cobre

**What goes wrong:** A auditoria de segurança já identificou que `outFields=*` traz **todos os ~85 campos** para memória (LAST/LOTINFO/CMPCACHE) e que a proteção contra `dtnascimen` hoje é "por omissão" (nenhum render/export toca nele), não por design centralizado — a própria auditoria recomenda um `sanitizeAttrs()` centralizado como correção pendente. As ferramentas de Território (farming com persistência, diff, cruzamento com Caixa, exportação de heatmap) são justamente o tipo de feature "exportar/salvar tudo" que a auditoria alertou que vazaria dado pessoal sem ninguém perceber — cada novo caminho de persistência (IndexedDB do farming, cache do heatmap, diff salvo) é uma nova superfície onde um `...attrs` genérico pode incluir `dtnascimen` sem que o desenvolvedor perceba, porque o campo nunca aparece na tela (só no objeto em memória/storage).

**Why it happens:** É natural, ao implementar rapidamente "salvar o resultado da consulta para comparar depois", fazer `JSON.stringify(items)` do array de atributos completo — funciona, parece inofensivo (nada é exibido), e o vazamento só existiria se alguém inspecionasse o localStorage/IndexedDB do navegador do corretor.

**Prevention:**
- Implementar o `sanitizeAttrs()` centralizado (já recomendado pela auditoria) **antes** de qualquer feature de Território que persista dados — aplicar no ponto de entrada (logo após `f.attributes` no fetch), não em cada feature nova separadamente. Isso vira pré-requisito de infraestrutura da Fase D, não um item independente do backlog de segurança.
- Toda persistência local (IndexedDB do farming/diff, cache do heatmap) deve usar exclusivamente o objeto sanitizado ou uma allowlist explícita de campos — nunca o objeto bruto do ArcGIS.
- O cruzamento com imóveis Caixa já tem precedente de tratamento (o script `atualizar-caixa.py` já evita titular) — mas cruzar Caixa × cadastro municipal no cliente pode, sem querer, combinar campos que juntos identificam mais que cada um isoladamente; manter o princípio de "só dado do imóvel, nunca do titular" explícito também nessa combinação.
- Revisar explicitamente: exportação (CSV) de qualquer ferramenta de território nova deve seguir o mesmo padrão allowlist já usado no `exportCSV` atual (colunas explícitas, não spread do objeto).

**Detection:** Grep por `JSON.stringify(` e por qualquer `...a` / `{...attrs}` / spread de objeto de atributo cadastral em código novo de território — qualquer ocorrência sem allowlist prévia é suspeita. Inspecionar manualmente o IndexedDB/localStorage no DevTools após usar farming/diff para confirmar ausência de `dtnascimen`.

**Phase:** Fase D (território/captação) — pré-requisito de arquitetura (sanitizeAttrs), reforçado em cada feature.

---

## Moderate Pitfalls

### Pitfall 8: detectMode mal classificando termos ambíguos ("135") falha silenciosamente em vez de perguntar

**What goes wrong:** Termos puramente numéricos são estruturalmente ambíguos no domínio: "135" pode ser número de quadra, número de lote, início de número de rua, ou início de inscrição cadastral. O modo explícito atual resolve a ambiguidade *pelo contexto do botão escolhido* (o usuário já disse "isso é quadra/lote" ao clicar no modo); um campo único que tenta *adivinhar* a intenção a partir do texto sozinho vai inevitavelmente classificar errado alguns casos — e se a UI não expuser claramente "interpretei isso como X" antes de buscar, o usuário recebe "nada encontrado" (ou resultado errado) sem entender por quê, revivendo exatamente o tipo de falha silenciosa que o v1.0 corrigiu no P0 (falso "Nada encontrado" por truncamento).

**Prevention:** O "chip de confirmação" mencionado no PROJECT.md (`detecção de intenção, chip de confirmação`) não é um nice-to-have cosmético — é a mitigação estrutural desta ambiguidade. Regra de aceite: toda entrada ambígua (heurística com confiança abaixo de um limiar, ou que bate em mais de uma categoria) deve mostrar o chip **antes** de disparar a busca, nunca assumir silenciosamente a interpretação mais provável e só corrigir depois do "nada encontrado". Manter uma lista de casos de teste dos ambíguos conhecidos (135 sozinho; "Rua 135"; "13.5" formatado como inscrição; "Q135"; number puro de 10 vs 14 dígitos, já tratado hoje pela regra de inscrição) como fixture de regressão.

**Phase:** Fase C (busca única).

---

### Pitfall 9: Tightening do fuzzy matching (item 19 do ROADMAP) sem preservar o piso de recall do LIKE server-side

**What goes wrong:** O item 19 do ROADMAP ("refinar o fuzzy... número casar por igualdade de dígitos primeiro, rua por fronteira de palavra") e o requisito do PROJECT.md ("fix do fuzzy/falso-positivo") pedem mais precisão. O risco é que a correção seja implementada tornando a comparação **mais estrita no client-side pós-fetch** (ex.: exigir igualdade exata de dígitos para exibir um resultado como "match"), mas a query server-side (`LIKE '%...%'`) já é hoje o que garante que resultados relevantes sequer chegam ao cliente — se o filtro fino do cliente virar um segundo filtro que *descarta* candidatos em vez de só *ordenar/rotular* candidatos, a mesma correção que elimina falsos positivos (ex.: "135" não deveria casar "1350") pode eliminar também verdadeiros positivos que só não bateram por diferença de formatação (zeros à esquerda, sufixo de letra tipo "10E", espaço). Isso reintroduz "não encontrado" que estava encontrado antes — a pior regressão possível para confiança do usuário.

**Prevention:**
- Separar explicitamente **recall** (o que a query LIKE do servidor traz) de **precisão de exibição** (como o cliente ordena/rotula/prioriza). A correção do item 19 deve atuar em **ranking e rotulagem** ("melhor match primeiro", "isto é uma correspondência aproximada" como aviso visual), não em **filtragem que remove** resultados da lista.
- Ao introduzir "igualdade de dígitos primeiro, substring como fallback sinalizado" (linguagem do próprio ROADMAP item 19), garantir que existe sempre um fallback — nunca um caminho onde a lista fica vazia porque o critério estrito não bateu, sem tentar o critério de substring depois.
- Testar contra os casos históricos documentados como armadilhas reais do domínio: lote "20/21" (múltiplos lotes num registro), quadra "10E" (sufixo de letra), apto "1901" vs "19" (substring dentro de número maior — exatamente o caso que motivou "fronteira de palavra"), padding de espaços/zeros. Cada correção de precisão precisa ser validada contra TODOS esses casos simultaneamente, não só contra o caso que motivou a mudança.

**Phase:** Fase C (busca única) / item 19 do ROADMAP.

---

### Pitfall 10: Reintroduzir "malha emaranhada" mobile ao adicionar choropleth por cima de uma correção de nomes que não resolve a causa raiz (densidade/estilo)

**What goes wrong:** O PROJECT.md já registra o feedback de usuário de que a malha de 1.206 polígonos "fica estranho/emaranhado no celular" — um problema de **densidade visual e hierarquia de estilo** (traço, opacidade, contraste idle vs. highlight), não de nomenclatura. Se a Fase B tratar isso principalmente trocando a malha neutra por choropleth (pintar por R$/m²) sem primeiro resolver a hierarquia visual de base (traço fino "sussurrando" no idle, densidade emergindo com zoom), o choropleth só adiciona MAIS informação visual (cores de dado) sobre uma malha que já é visualmente pesada — piorando, não resolvendo, o "emaranhado" original. Cores de choropleth mal calibradas por cima de traços de 1px de 1.206 polígonos competem visualmente tanto quanto os traços neutros competiam antes.

**Prevention:**
- Sequenciar dentro da Fase B: primeiro resolver hierarquia idle vs. highlight (estilo já existe uma base em `BAI_STYLE`/`BAI_HOVER`, linhas 811-812 — fillOpacity .03 idle / .08 hover, weight 1 / 2.5 — mas o PROJECT.md sugere que isso ainda não é suficientemente "sussurrado" em mobile); só depois disso estar validado como resolvido, introduzir choropleth como uma segunda camada de informação sobre a hierarquia já legível.
- Regra explícita: choropleth **substitui** a cor de preenchimento neutra no idle (não soma-se a ela) — o traço de contorno permanece fino/sussurrado; é a área/fill que ganha o dado, mantendo a mesma filosofia idle-sussurra/highlight-grita já estabelecida.
- Toque na ÁREA (fill) do bairro, não só na linha — isso já está no requisito do PROJECT.md; garantir que o `bubblingMouseEvents:false` e o pane/style atual (`BAI_STYLE` já usa `fillOpacity:.03`, ou seja, já tem fill clicável, não é área vazia) seja preservado ao trocar de estilo neutro para choropleth — não trocar para `fill:none` acidentalmente ao estilizar por valor.

**Phase:** Fase B (malha/UX mobile), sequenciada antes do choropleth de Território (Fase D) que a reaproveita.

---

### Pitfall 11: Choropleth ilegível sobre o satélite (Fase 4 do v2.0) e competindo com o motion (crossfade/stagger) já entregues

**What goes wrong:** O v2.0 já entregou uma camada de satélite alternável com crossfade de opacidade (`SAT-02`, ~250ms, linhas 259, 773) e motion inline (stagger, transições, spring) como diferenciais validados. Um choropleth de bairro (Fase B/D) precisa permanecer legível **tanto sobre o basemap CARTO light quanto sobre o satélite Esri** — paletas de cor testadas só contra o fundo claro do CARTO podem ficar ilegíveis (baixo contraste) sobre a textura/cor variável de imagens de satélite reais. Adicionalmente, se a transição de choropleth (ex. trocar de "por R$/m²" para "por IPTU") for animada sem coordenar com o crossfade existente do satélite, podem competir (duas transições de opacidade simultâneas na mesma pane, causando flicker ou jank).

**Prevention:**
- Testar a paleta de choropleth explicitamente sobre satélite ligado, não só sobre o basemap padrão — usar um contorno/stroke mais forte (não só fill) para garantir legibilidade independente do fundo, já que fill semi-transparente sobre satélite variável é inerentemente menos previsível que sobre um basemap de cor plana.
- Escolher paleta colorblind-safe a partir dos tokens de cor já existentes no app (`--accent`, `--lot`, etc. — a auditoria de acessibilidade já mapeou contrastes problemáticos dessa paleta atual: dourado ~2.8:1, verde-lote ~3.9:1) — não introduzir uma paleta nova sem checar contraste AA contra AMBOS os fundos (CARTO e satélite) e sem seguir o padrão de correção já proposto pela auditoria (tons mais escuros para uso como texto/traço fino).
- Qualquer transição de choropleth deve reusar o padrão de easing/duração do crossfade do satélite já estabelecido (~250ms) e, se ambos puderem disparar simultaneamente (usuário troca camada de dado E liga satélite ao mesmo tempo), testar esse caso combinado explicitamente — não assumir que motion.dev vai serializar automaticamente transições em panes diferentes.
- Respeitar `prefers-reduced-motion` (já implementado, linha 677-678) — qualquer nova transição de choropleth precisa checar a mesma flag `REDUCE` antes de animar.

**Phase:** Fase B/D (choropleth), integração testada explicitamente contra Fase 4 (satélite) e a infraestrutura de motion do v2.0.

---

### Pitfall 12: Novo asset (bairros-goiania.json corrigido, dados de CNEFE) esquecido no precache do sw.js, ou cache-version não bumped

**What goes wrong:** `sw.js` (confirmado no código: `const CACHE = "radar-v5"`, array `LOCAL` explícito incluindo `./bairros-goiania.json`) já tem precedente exato de bug documentado pela auditoria PWA: SHELL/LOCAL incompleto fez `caixa-goiania.js` não estar cacheado offline em versão anterior. Regenerar `bairros-goiania.json` com nomes corrigidos **sem bump de `CACHE`** significa que usuários com o Service Worker antigo (cache-first para esse tipo de asset same-origin não-HTML) continuam vendo o JSON antigo (nomes errados) indefinidamente até o SW ser reativado por outro motivo — o "activate" só limpa caches com chave diferente. Se a Fase C/D adicionar novos arquivos (dados de CNEFE para logradouros, algum dataset de território pré-computado), esquecer de adicioná-los ao array `LOCAL` do sw.js repete o bug exato já documentado (achado [MEDIA] "Precache não inclui caixa-goiania.js").

**Prevention:**
- Checklist obrigatória em qualquer PR que adicione/modifique um arquivo same-origin carregado pelo app: (1) está no array `LOCAL` do sw.js? (2) o `CACHE` (`radar-v5` → `radar-v6`) foi incrementado na mesma mudança? — sem bump de versão, o `install` do novo SW nem roda de novo para buscar o asset atualizado até o browser decidir revalidar o sw.js por conta própria (que pode demorar).
- Dado que `bairros-goiania.json` NÃO bate no regex `NETWORK_FIRST` (`/(\/$|\.html$|caixa-goiania\.js$|manifest\.json$)/` — confirmado, não inclui `.json$` genérico nem `bairros-goiania`), ele hoje é servido **cache-first** (ramo else do fetch handler) — reforça que só o bump de versão do cache (não uma mudança de estratégia) resolve a atualização. Alternativa mais robusta: adicionar `bairros-goiania\.json$` ao regex `NETWORK_FIRST` também, já que este é um dado que MUDA (nomes corrigidos, futuras correções) e não é realmente imutável como as libs de CDN — tratá-lo como dado, não como shell.
- Qualquer dataset novo de CNEFE/território, se for estático e versionado no repo (não gerado ao vivo), decidir explicitamente se é cache-first (imutável entre releases, bump manual) ou network-first (pode mudar sem o usuário atualizar o app) — não deixar a decisão por omissão como hoje aconteceu com `bairros-goiania.json`.

**Phase:** Fase A (bairros) para o bump imediato; regra permanente para Fases C/D (qualquer asset novo).

---

### Pitfall 13: Heatmap/choropleth com muitos polígonos coloridos causa jank em mobile — mesmo padrão de performance já identificado no refreshLots

**What goes wrong:** A auditoria de performance identificou que `refreshLots` recria centenas/milhares de polígonos a cada `moveend` sem debounce nem diff, com risco de pico de memória no Safari/iPhone. Um heatmap por quadra (Território) ou choropleth por bairro (malha) tem exatamente o mesmo padrão de risco: recolorir/recriar centenas de polígonos coloridos a cada mudança de métrica exibida (trocar de "R$/m²" para "IPTU" para "idade") ou a cada pan/zoom, sem diff de geometria, pode reproduzir o mesmo jank já documentado — agravado pelo fato de que polígonos coloridos com fill sólido (não fill quase-transparente como a malha idle atual) são mais caros de renderizar no canvas.

**Prevention:**
- Reaproveitar o padrão de correção já proposto para `refreshLots` (debounce de ~250ms, diff de geometria por chave em vez de `clearLayers()`+recriar tudo, usar o mesmo `L.canvas` renderer por pane já em uso para bairros) — não introduzir um segundo padrão de renderização para o heatmap que ignore as lições já documentadas.
- Trocar **estilo** (cor de fill) de polígonos já existentes ao mudar de métrica, em vez de destruir e recriar os `L.polygon`/`L.geoJSON` layers — Leaflet permite `layer.setStyle()` por feature; isso é ordens de magnitude mais barato que recriar a geometria.
- Zoom-gate: heatmap de quadra só renderiza no nível de zoom onde quadras individuais já são visíveis/relevantes (análogo ao gate `z>=17` já usado para lotes) — nunca tentar colorir milhares de quadras da cidade inteira no zoom de visão geral.

**Phase:** Fase D (território/heatmap), reusando padrão de correção já identificado para Fase B/C (mesh performance).

---

## Minor Pitfalls

### Pitfall 14: iOS autocomplete quirk (item 6 do ROADMAP, 🔶 pendente de teste real) pode ser "resolvido de novo, errado" no refactor

**What goes wrong:** O ROADMAP marca o fix do autocomplete de setor no iOS (fechamento por `pointerdown` em vez de `click`, `font-size:16px` anti-zoom) como 🔶 — aplicado mas **pendente de teste em iPhone real**. Se o campo único reescrever o mecanismo de autocomplete do zero (novo componente para "setor na frase" / "lembrar setor"), esse fix específico (que é uma correção de comportamento de evento touch, não uma feature visível) é fácil de não portar porque não está documentado como um requisito funcional, só como um detalhe de implementação de baixo nível.

**Prevention:** Antes de reescrever o autocomplete, documentar explicitamente os dois workarounds do item 6 (evento `pointerdown` para fechar lista + `font-size:16px`) como requisitos não-negociáveis do novo componente de autocomplete, não como "implementação antiga a estudar depois". Testar em iPhone real como parte do gate de aceite da Fase C (fechando também a pendência histórica do ROADMAP, não só evitando regressão).

**Phase:** Fase C (busca única).

---

### Pitfall 15: CNEFE para logradouros — arquivo grande, pipeline offline, mesmo risco de esquecimento no sw.js e de inflar o app "arquivo único"

**What goes wrong:** `INTELIGENCIA-radar.md` já identifica o CNEFE do IBGE como "arquivo grande — pipeline offline" para melhorar autocomplete de rua. Se usado ingenuamente (importar o dataset bruto), o volume pode contradizer a restrição de arquitetura "arquivo único" e inflar o payload inicial/PWA install de forma que repete o padrão do achado "install atômico refém do cdnjs" — um asset grande demais pode fazer o install do SW ser mais lento ou, se malformado, falhar silenciosamente.

**Prevention:** Pré-processar o CNEFE offline (como já é a intenção) para um subconjunto mínimo (só logradouros de Goiânia, só os campos necessários para autocomplete — nome normalizado, talvez bairro), gerando um JSON compacto análogo ao `bairros-goiania.json` atual, não embutindo o CSV/dataset bruto do IBGE. Tratar como mais um item da checklist de precache (Pitfall 12): entrar no array `LOCAL`, decidir estratégia de cache, bump de versão.

**Phase:** Fase C (busca única) — se o CNEFE for de fato incorporado nesta milestone.

---

## Phase-Specific Warnings

| Fase (provisória) | Tópico | Pitfall mais provável | Mitigação |
|---|---|---|---|
| A — Bairros/nomes | Reconciliação nm_bai × fonte confiável | Join espacial sem chave confiável (Pitfall 3), quebra do drill por mudança de geometria (Pitfall 4) | Auditoria manual assistida nas bordas; diff estrutural geometria-idêntica; bump de cache (Pitfall 12) |
| B — Malha/UX mobile | Hierarquia idle/highlight + choropleth | Choropleth em cima de malha ainda emaranhada (Pitfall 10); ilegibilidade sobre satélite (Pitfall 11) | Sequenciar hierarquia antes de cor; testar paleta sobre os dois basemaps |
| C — Busca única | Refactor dos 4 modos → campo único | Regressão de acessibilidade (Pitfall 1); regressão de SEARCHTOKEN (Pitfall 2); detectMode ambíguo falhando silenciosamente (Pitfall 8); fuzzy mais estrito matando recall (Pitfall 9); iOS autocomplete quirk perdido (Pitfall 14) | Checklist de ARIA como gate; token em todo novo caminho async; chip de confirmação obrigatório em baixa confiança; separar recall (server LIKE) de precisão (client ranking); testar iPhone real |
| D — Território/captação | Painel de setor, heatmap, farming, diff, Caixa | 502 sob carga em setor grande (Pitfall 5); localStorage inadequado (Pitfall 6); vazamento de campo pessoal via nova persistência (Pitfall 7); jank de heatmap (Pitfall 13) | Agregação em poucas requisições + zoom-gate + cache TTL; IndexedDB + allowlist de campos; sanitizeAttrs central; diff/setStyle em vez de recriar polígonos |

---

## Sources

- `radar-goiania.html` (código-fonte atual, lido integralmente nas seções relevantes: CSP l.6-7, motion/reduced-motion l.677-680, mesh/drill l.722-961, busca/tokens l.666-996, combobox/ARIA l.2180-2210, localStorage l.760-2238) — HIGH confidence (fonte primária, linha citada).
- `AUDITORIA-2026-07-03.md` (auditoria em 10 lentes sobre o código real, achados executados no mesmo dia conforme commits do git log) — HIGH confidence, é o registro mais próximo e específico da superfície de regressão desta milestone.
- `ROADMAP-radar.md` (§0 fatos do endpoint validados ao vivo 02-04/07/2026; itens 6, 19, 20) — HIGH confidence para os fatos do endpoint (testados ao vivo); item 6 (iOS) explicitamente marcado 🔶 pendente de validação real.
- `INTELIGENCIA-radar.md` (pesquisa de 10 frentes, achados verificados empiricamente — `returnCountOnly`/aritmética no WHERE testados; ban de `dtnascimen` confirmado por evidência de campo) — HIGH confidence.
- `gerar-bairros.py` (script de build, comentários e `write_report` documentam evidência coletada ao vivo da ausência de join entre layer 2 e layer 3, e a duplicidade de `id` como campo de negócio) — HIGH confidence, é a fonte primária que fundamenta o Pitfall 3.
- `sw.js` (código atual: `CACHE="radar-v5"`, array `LOCAL`, regex `NETWORK_FIRST`) — HIGH confidence.
- `.planning/PROJECT.md` (escopo e linguagem exata dos requisitos da v2.1) — HIGH confidence para o que foi pedido; usado para mapear pitfalls aos itens do escopo.

**Gaps / não verificado nesta pesquisa (LOW confidence, precisa validação futura):**
- Comportamento real de eviction/quota de IndexedDB especificamente no Safari iOS em PWA standalone vs. aba comum, para volumes de dados de farming/território (extrapolado por analogia ao ITP de 7 dias já documentado para Cache API/localStorage — não testado ao vivo para IndexedDB nesta pesquisa).
- Tamanho real e estrutura de colunas do CNEFE 2022 pós-filtro para Goiânia (mencionado como "arquivo grande" mas não medido nesta pesquisa).
- Se o endpoint aceita `GROUP BY`-like agregação nativa (além de `returnDistinctValues`/`returnCountOnly`) que poderia simplificar ainda mais a agregação por quadra do Pitfall 5 — não testado ao vivo nesta pesquisa, recomenda-se verificação direta no endpoint antes de implementar a Fase D.
