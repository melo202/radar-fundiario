# Busca campo-único inteligente — pesquisa (v2.1)

**Domínio:** overhaul da busca do Radar Fundiário Goiânia (`radar-goiania.html`, arquivo único, sem backend)
**Pesquisado:** 2026-07-05 (Sonnet 5, contexto pós-v2.0 / pós-auditoria 03/07)
**Confiança geral:** ALTA para o mapeamento do código atual (leitura direta + diff dos commits) · MÉDIA/ALTA para as heurísticas de `detectMode` (já desenhadas em `IDEIAS-hub-corretor.md`, não implementadas — julgamento próprio sobre viabilidade) · MÉDIA para fuzzy-fix (padrões de busca de endereço/parcela são bem estabelecidos, mas a aplicação concreta ao WHERE do ArcGIS é original)

---

## 1. Estado atual — mapeamento exato do código

### 1.1 Estrutura de modos hoje

`MODE` é uma string global com 4 valores possíveis: `'addr'` (padrão desde `d275e49`), `'bd'`, `'ql'`, `'insc'`. Não existe enum formal — é literal string comparada em cada `if/else`.

```js
let MODE='addr', BAIRROS=[], LAST=[], markers=[], map, layerGroup, sel=null;   // linha 667
```

**moderow HTML (linhas 495-500):**
```html
<div class="moderow">
  <button id="mAD" class="on" onclick="setMode('addr')">Endereço</button>
  <button id="mBD" onclick="setMode('bd')">Prédio</button>
  <button id="mQL" onclick="setMode('ql')">Quadra/Lote</button>
</div>
<button class="modemore" id="mIN" onclick="setMode('insc')">ou buscar pela inscrição cadastral (CI)</button>
```

3 botões de peso igual (Endereço/Prédio/Quadra-Lote) + 1 link discreto abaixo (Inscrição) — não são mais 4 abas iguais. Cada modo tem seu próprio painel de campos (`#paneQL`, `#paneAddr`, `#paneBD`, `#paneIN`) e todos exceto `insc` compartilham `#needBairro` (setor) e `#paneUnit` (campo apto/checkbox garagem).

**`setMode(m)` (linhas 1111-1121):** troca `MODE`, alterna `.on`/`aria-pressed` nos 4 botões, mostra/esconde os 4 painéis e `#needBairro`/`#paneUnit` via `style.display`. Puramente síncrono, sem debounce, sem detecção — é 100% escolha manual do usuário.

### 1.2 Setor / autocomplete de bairro

`COMBO` é um array carregado uma vez em `loadBairros()` (linha 1016) via JSONP contra a camada de cadastro (`cdbairro`/`nmbairro` distintos, até 2000 registros — 709 setores reais, cabe com folga). Cada item: `{code, raw, disp, search}` onde `disp` é o nome bonito (`displayName()` expande prefixos como "JD"→"Jardim", "RES"→"Residencial" via tabela `PFX`) e `search` é a string normalizada (`norm(disp+" "+raw)`, sem acento, upper) usada para filtrar.

- **`filterCombo(qtext)`** (linha 1033): filtra `COMBO` por `.search.includes(norm(qtext))`, ordena por posição do match (quem casa mais no início vem primeiro), corta em 50, renderiza `.combo-item` com `role="option"` + `aria-selected` (id `opt-<código>` — **isso já cobre o achado de acessibilidade "combobox sem aria-activedescendant"** da auditoria; ver §1.4).
- **`pickBairro(code)`** (linha 1047): grava o `code` no hidden `#bairro`, o `disp` no input visível, fecha a lista.
- **`resolveBairro()`** (linha 1096): se `#bairro` (hidden) já tem valor, retorna `true` direto. Senão, tenta casar o texto digitado contra `COMBO` por `.search.includes()` e AUTO-SELECIONA o melhor match (ordenado pela posição do termo) — **não é mais um "escolha na lista ou falha"**: se há qualquer hit, ele resolve sozinho. Só retorna `false` se não houver NENHUM hit.
- **`mostrarBairro(code)`** (linha 1056): quando o usuário só informa o setor (sem quadra/lote), desenha a divisa do bairro no mapa e enquadra — é o fallback "modo ql sem número" já implementado.

Isso é relevante para o campo-único: **a lógica de "casar setor por substring" já existe e funciona bem** (`resolveBairro`); o trabalho do campo-único é *extrair* o trecho candidato a setor de dentro de uma frase maior, não inventar o matching.

### 1.3 `buscar()` — WHERE building por modo (linhas 1167-1262)

Fluxo comum: token de concorrência (`SEARCHTOKEN`, protege contra respostas fora de ordem — issue de auditoria já corrigida), `btn.disabled` como guarda de reentrância, `closeDetail()` no início.

| Modo | Campos obrigatórios | WHERE server-side | Refino client-side |
|---|---|---|---|
| `insc` | `#insc` | 14 dígitos → `nrinscr='<dig>'`; ≤10 → `ci='<dig>'` (linha 1179) | nenhum — inscrição é exata |
| `addr` | setor + `#rua` (`#numero` opcional) | `cdbairro=X AND vlvenal>0` + (`nrimovel LIKE '%num%'` se há número, senão `nmlogradou LIKE '%dígitos-da-rua%'` se a rua tem dígito, senão `UPPER(nmlogradou) LIKE '%texto%'`) — com fallback de varredura de 8 páginas do setor se vazio (acento) | `casaRua()` compara `ruaCore()` (remove tipo de via + acento) por `.includes()`; se filtrar número, cai para fallback de rua completa (prédios sem número no cadastro) |
| `bd` | nome do prédio (setor opcional) | tokeniza o nome por espaço/ponto, remove palavras genéricas (RES/ED/EDF/COND/etc via `GENW`), gera `UPPER(nmedificio) LIKE '%tok%' AND ...` para até 5 tokens; se setor não achar, tenta cidade toda | filtro final exige todos os tokens presentes (AND) |
| `ql` | setor + quadra e/ou lote | `cdbairro=X AND vlvenal>0` + `UPPER(nrquadra) LIKE '%likeTerm(q)%'` e/ou lote análogo | compara igualdade exata, dígitos-only, OU `.includes()` como fallback — **é exatamente o ponto do item 19 do roadmap (fuzzy falso-positivo)** |

Depois: `finish(items, fromMap)` (linha 1267) aplica filtro de apto (`matchApto`)/garagem (`isGarage`), ordena por `ci` então `insubprinc`, decide sozinho se é "1 prédio com N unidades" (abre `chooser` se veio de clique no mapa) e faz o roteamento de tela mobile (busca vs. mapa) conforme quantidade de resultados.

### 1.4 Funções puras de matching (as que o roadmap item 18 pede para testar)

```js
const clean=v=>String(v==null?"":v).trim();
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/\s+/g," ").trim();
const likeTerm=v=>{const s=norm(v).replace(/'/g,"");const d=s.replace(/\D/g,"");return d||s.replace(/[^A-Z0-9]/g,"");};  // linha 666
const ruaCore=s=>norm(s).replace(/'/g,"").replace(TIPOVIA,"");   // linha 1007 — remove "RUA/AV/R./AL." etc
function isGarage(a){return /\b(BOX|GARAG|VAGA|DEPOSITO|DEP\b|SUBSOLO)/.test(norm(a.incompl));}   // linha 1359
function matchApto(a,q){                                          // linha 1360
  const digits=String(q).replace(/\D/g,"");if(!digits)return true;
  const inc=norm(a.incompl);
  return inc.includes("APT"+digits)||inc.includes("AP"+digits)||inc.includes("APTO"+digits)||
         (inc.match(/\d+/g)||[]).includes(digits);
}
```

- `likeTerm` decide o termo do `LIKE` server-side: dígitos do input se houver, senão letras — é usado tanto para quadra/lote (`ql`) quanto (indiretamente, via `rD`) para rua numerada.
- **Nenhuma dessas funções tem teste automatizado ainda** (roadmap item 18 permanece `⬜`) — qualquer fix de fuzzy deve vir acompanhado de testes de regressão para não recriar bugs históricos documentados no roadmap ("pino na Bahia" de projeção, lote "20/21", quadra "10E").
- O ponto exato do "falso positivo" do roadmap item 19: em `ql`, `okQ=!q||nq===qU||nq.replace(/\D/g,"")===qU.replace(/\D/g,"")||nq.includes(qU)` (linha 1251) — o último `||nq.includes(qU)` é um fallback de substring SEM prioridade/flag: quadra "135" casa "1350" ou "2135" com o mesmo peso que um match exato, e a UI não distingue. Mesmo padrão em `okL` (linha 1252) e em `casaRua` (linha 1200, endereço) via `log.includes(rCore)`.

### 1.5 O que os 2 commits recentes já mudaram (não regredir)

**`d275e49` "ux: simplifica a escolha do modo de busca"** — mudou o *default* e a *hierarquia visual*, não a arquitetura:
- `MODE` inicial passou de `'ql'` para `'addr'`.
- moderow: 4 botões de peso igual → 3 botões (Endereço/Prédio/Quadra-Lote) + Inscrição rebaixada a link `.modemore` fora da fileira.
- Rótulo "Buscar por" adicionado acima da fileira (deixa explícito que é escolha exclusiva, não filtros somados).
- Isso é literalmente a ideia "Dar hierarquia aos 4 modos" do `IDEIAS-hub-corretor.md` (lente primeiro-uso) **já implementada** — parcialmente: a hierarquia chegou, o campo-único (que a substituiria de vez) não.

**`91a9130` "fix: correções da auditoria (foco de teclado + ciclo de vida do seletor)"** — corrigiu bugs introduzidos pela troca de default:
- `focusFirstField()` (nova função, linha 1124): foca o 1º campo VISÍVEL do modo atual (`rua`/`predio`/`insc`/`quadra` conforme `MODE`) — antes o Enter no combo de setor sempre focava `#quadra`, que ficava oculto fora do modo Quadra/Lote e quebrava o fluxo em Endereço/Prédio (o modo padrão agora).
- `finish()` chama `closeChooser()` no início — evita "seletor fantasma" (chooser de prédio anterior sobrevivendo a uma nova busca por formulário).
- Esc agora fecha o `chooser` também (antes só laudo/detalhe).
- Alça do `chooser` ganhou `onclick="closeChooser()"` (antes só o × fechava).
- Alvos de toque (moderow, link de inscrição) elevados a ≥44px no mobile.
- `#paneQL` nasce oculto e `#paneAddr` visível no HTML estático (evita flash antes do JS rodar, já que o JS agora abre em Endereço).

**Conclusão de preservação:** os dois commits deixaram o app num estado consistente e testado (foco de teclado, ciclo de vida do seletor, hierarquia visual). O campo-único **substitui a moderow e o `setMode()` manual**, mas deve **preservar**: `focusFirstField()` (adaptado — ver §3.3), `closeChooser()` no início de `finish()`, o Esc cobrindo o chooser, os alvos ≥44px, e o padrão visual "Endereço-first" como fallback de baixa confiança (ver §2).

### 1.6 Estado de acessibilidade que a busca já tem (não regredir — auditoria 03/07)

Da lente `acessibilidade` da AUDITORIA-2026-07-03.md, os itens que TOCAM a busca e já foram corrigidos (roadmap item 20, ✅):
- `label for=` em todos os inputs do painel (`bairroInput`, `quadra`, `lote`, `rua`, `numero`, `apto`, `predio`, `insc`).
- Combobox de setor com `role="combobox" aria-expanded aria-controls aria-autocomplete` no input e `role="option" aria-selected id="opt-<code>"` nas opções (o achado original "sem aria-activedescendant" pedia exatamente isso — confirmado presente no código lido em §1.2).
- `aria-pressed` sincronizado nos botões de modo (`setMode`, linha 1114) e na viewbar.
- Esc fecha camadas (wizard → chooser → detail, na ordem certa após `91a9130`).
- iOS: fechamento do combo por `pointerdown` (não `click`, que o Safari engolia) + `font-size:16px` nos inputs (mata autozoom) — mencionado no roadmap item 6 como 🔶 pendente de teste real em iPhone, mas o código já está lá.

**Qualquer novo widget do campo-único (chip de confirmação, chips de desambiguação, exemplos tocáveis) precisa nascer com o mesmo padrão**: `label`/`aria-label` explícito, `role` correto, `aria-live` quando for feedback dinâmico, alvo ≥44px, e não regredir o fechamento por `pointerdown` no iOS.

---

## 2. `detectMode(texto)` — heurística concreta

Baseado no desenho já esboçado em `IDEIAS-hub-corretor.md` (lente campo-unico), formalizado e verificado contra o código real. Roda a cada digitação com debounce ~150ms (o app já usa o padrão de debounce em outros lugares — ex.: filtro de combo hoje SEM debounce é um achado de performance da auditoria, então o campo-único deve introduzir debounce desde o início, não repetir a lacuna).

**Ordem de avaliação (regras mutuamente exclusivas, primeira que casar decide):**

```js
function detectMode(textoBruto){
  const raw = clean(textoBruto);
  const digitsOnly = raw.replace(/\D/g,"");
  const n = norm(raw);

  // 1. Inscrição — só dígitos, comprimento decide o campo (já existe em buscar(), linha 1179)
  if(digitsOnly.length===raw.replace(/\s/g,"").length && digitsOnly.length>=10){
    return digitsOnly.length>10
      ? {mode:"insc", field:"nrinscr", value:digitsOnly, confidence:"alta", label:`Inscrição (unidade) · ${digitsOnly.length} díg.`}
      : {mode:"insc", field:"ci",      value:digitsOnly, confidence:"alta", label:`Inscrição (lote) · ${digitsOnly.length} díg.`};
  }

  // 2. Quadra+Lote — regex tolerante a "q128 lote 5", "quadra 128 lt 5", "q.128/5", "128/5"
  const mQL = n.match(/\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b.*?\b(?:L(?:T|OTE)?)\.?\s*(\d+(?:\/\d+)?[A-Z]?)\b/)
           || n.match(/\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b/); // só quadra, sem lote — ainda é modo ql, com lote vazio
  if(mQL){
    return {mode:"ql", quadra:mQL[1], lote:mQL[2]||"", confidence:"alta",
            label: mQL[2]?`Quadra ${mQL[1]} · Lote ${mQL[2]}`:`Quadra ${mQL[1]}`};
  }

  // 3. Endereço — tipo de via explícito (aproveita TIPOVIA já existente, linha 1006)
  const mVia = raw.match(TIPOVIA_DETECT); // variante não-ancorada de TIPOVIA, casa em qualquer posição
  if(mVia){
    const numMatch = raw.match(/\b(\d{1,5})\b\s*$/); // número normalmente vem ao final da frase
    return {mode:"addr", rua: raw, numero: numMatch?numMatch[1]:"", confidence:"alta",
            label:`Endereço · ${raw}`};
  }

  // 4. Prédio — prefixo textual típico de edifício ("ed.", "edifício", "residencial", "cond.")
  const mPredio = n.match(/\b(ED|EDF|EDIFICIO|RES|RESIDENCIAL|COND|CONDOMINIO)\.?\s+(.+)/);
  if(mPredio){
    return {mode:"bd", predio: mPredio[2], confidence:"alta", label:`Prédio · ${mPredio[2]}`};
  }

  // 5. Número curto isolado, sem contexto — AMBÍGUO (rua numerada? quadra? início de inscrição?)
  if(/^\d{1,4}$/.test(digitsOnly) && digitsOnly===raw.replace(/\s/g,"")){
    return {mode:null, confidence:"baixa", raw, label:"Ambíguo", digits:digitsOnly};
  }

  // 6. Texto puro sem número nem tipo de via — tenta casar contra COMBO (setor) primeiro;
  //    se achar, é "setor isolado" (equivalente a ql sem quadra/lote -> mostrarBairro);
  //    senão, melhor palpite é PRÉDIO (nome próprio) com confiança média.
  const setorHit = COMBO.filter(b=>b.search.includes(n));
  if(setorHit.length) return {mode:"ql", bairroOnly:true, confidence:"media", label:`Setor · ${setorHit[0].disp}`};
  return {mode:"bd", predio: raw, confidence:"media", label:`Prédio (?) · ${raw}`};
}
```

**Notas de implementação:**

- **`TIPOVIA` já existe** (linha 1006) mas é ancorado (`^...`) para uso em `ruaCore()`. O `detectMode` precisa de uma variante NÃO ancorada (casa "rua" em qualquer posição da frase) — extrair a lista de palavras (`RUA|AVENIDA|AL|TRAVESSA|...`) para uma constante compartilhada e derivar as duas regex (ancorada para `ruaCore`, livre para `detectMode`) da mesma fonte, evitando duplicar a lista e ela dessincronizar.
- **Regra 2 (quadra+lote) precisa vir ANTES da regra de endereço** porque "quadra 128" contém a palavra "quadra", que não é tipo de via, mas o número solto depois poderia ser mal interpretado. A ordem sugerida no `IDEIAS-hub-corretor.md` (dígitos primeiro, depois QD/LT, depois tipo de via, depois prédio, depois texto→setor) é a correta e está refletida acima.
- **Regra 5 é o gancho da desambiguação** (§3.4): NÃO decide sozinha — devolve `confidence:"baixa"` e a UI mostra chips.
- **O setor embutido na frase (§3.2)** precisa ser extraído ANTES de rodar as regras acima sobre o "resto" da frase — ver algoritmo em §3.2.

**Confiança do desenho:** MÉDIA-ALTA. As heurísticas de regex são razoáveis e cobrem os casos reais de Goiânia (nomenclatura QD/LT do cadastro, ruas numeradas como "Rua 135" e tipos de via padrão brasileiros). Ponto de risco real, não cosmético: **ruas numeradas colidem com quadra/número isolado** — "135" sozinho é genuinamente ambíguo entre rua, quadra ou início de inscrição, e é exatamente o caso que o próprio `IDEIAS-hub-corretor.md` já identificou como candidato a desambiguação, não a regra fixa. Validar as regex contra uma amostra real de nomes de rua/prédio de Goiânia antes de finalizar (não foi possível verificar contra o dataset ao vivo nesta pesquisa — está fora do escopo desta leitura de código).

---

## 3. UX de suporte — mecanismo de cada feature

### 3.1 Chip de confirmação (transparência da detecção)

**Mecanismo:** um elemento `<div id="detectChip" role="status" aria-live="polite">` abaixo da caixa única, atualizado a cada resultado de `detectMode()` (debounced). Tocável — abre um menu inline de 4 opções (Quadra/Endereço/Prédio/Inscrição) que força o modo manualmente, preenchendo os campos já parseados no override.

- Requer `aria-live="polite"` desde o início (a auditoria já cobrou isso para toast/loading — aplicar o mesmo padrão aqui evita reabrir o mesmo achado).
- O chip **é o novo `moderow`** em termos de affordance manual — quando o usuário toca nele para corrigir, a UI deveria abrir algo visualmente equivalente aos 3 botões + link "Inscrição" que já existem hoje (reaproveitar o HTML/CSS de `.moderow`/`.modemore` em vez de recriar).
- Alvo de toque ≥44px (chip inteiro, não só o texto).

### 3.2 Setor embutido na frase

**Mecanismo:** antes de rodar `detectMode()` sobre o texto completo, tentar casar um PREFIXO ou substring contra `COMBO[].search` (a mesma estrutura que `resolveBairro()` já usa). Se achar um match de setor:
1. Remove o trecho casado do texto (ex.: "marista quadra 128 lote 5" → remove "marista" → resta "quadra 128 lote 5").
2. Seta o hidden `#bairro` com o `code` do match (via `pickBairro()`, já existente).
3. Roda `detectMode()` no resto da frase.

**Risco de ordem:** "marista" pode ser prefixo de "quadra" acidentalmente em outros bairros (não neste caso, mas o algoritmo genérico deve testar TODOS os prefixos de tamanho decrescente do início da frase contra `COMBO`, não só a primeira palavra — nomes de bairro em Goiânia têm 1 a 4 palavras, ex. "Jardim Goiás", "Parque Amazônia"). Reaproveitar a lógica de ordenação de `resolveBairro()` (match mais próximo do início vence) para decidir qual candidato prevalece se houver ambiguidade.

**Se não achar setor E o modo exigir (`ql`/`addr`/`bd`):** cai no comportamento de hoje — mostrar o campo de setor inline (o `#needBairro` já existe e já tem autocomplete funcional; não precisa recriar, só exibir condicionalmente conforme o campo-único perceba a necessidade).

### 3.3 Lembrar o último setor (localStorage)

**Mecanismo:** `localStorage.setItem("radar_lastbairro", code)` toda vez que `pickBairro()` roda com sucesso (adicionar 1 linha na função existente). No boot e a cada nova busca sem setor detectado na frase, pré-preencher `#bairro`/`#bairroInput` com o último valor e mostrar no chip "Setor · Marista (último)" — tocável para trocar (abre o combo já existente).

- Segue o padrão já usado em `radar_prof` (dados do corretor) e `radar_coach` (dispensar dica) — é o 3º uso de localStorage no app, mesma convenção (`try/catch` silencioso, chave prefixada `radar_`).
- **Cuidado de UX:** se o usuário digitar só "quadra 130 lote 8" (sem setor) e o último setor salvo estiver errado para essa busca, o resultado sai errado silenciosamente. Por isso o chip precisa **sempre mostrar qual setor foi assumido** quando vier do localStorage, nunca aplicar em silêncio — é a mesma disciplina de transparência do chip de confirmação (§3.1).

### 3.4 Desambiguação de baixa confiança

**Mecanismo:** quando `detectMode()` retorna `confidence:"baixa"` (regra 5 do §2 — número curto isolado), renderizar 2-3 `<button class="chip">` acima do botão Buscar: "Rua {n}" / "Quadra {n}" / "Inscrição {n}…" (só oferecer inscrição se o número tiver ≥5 dígitos, para não gerar chip absurdo em "135"). Cada chip, ao tocar, seta `MODE` explicitamente com os valores parseados e chama `buscar()` direto — não é preciso re-digitar.

- Reaproveita exatamente a mecânica de "exemplos tocáveis" (§3.5): ambos são `<button>` que pré-preenchem estado e disparam a busca.
- **Regra de confiança precisa ser objetiva e documentada em comentário no código** (replicando o padrão do resto do app, que já comenta profusamente decisões de heurística): dígitos puros 10/14 → alta; presença de QD+LT ou tipo de via → alta; número solto 1-4 dígitos sem contexto → baixa; texto sem tipo de via nem match de setor → média (assume prédio, mas com selo visível de baixa certeza).

### 3.5 Placeholder + exemplos tocáveis

**Mecanismo:** o placeholder da caixa única é estático (rotativo é overengineering para 1 caixa — o app não tem padrão de placeholder rotativo em nenhum outro campo, manter consistência): `"quadra 128 lote 5 · rua portugal 582 · sumer park · 3020150346"`.

O estado vazio (`.empty` em `#results`, hoje com texto no HTML estático das linhas 548) troca o parágrafo por 3-4 `<button class="examplechip">` que preenchem a caixa única E disparam `buscar()` no toque — mesma mecânica do item "Estado vazio que ensina com exemplos tocáveis" do `IDEIAS-hub-corretor.md` (lente primeiro-uso), que hoje **ainda não foi implementado** (o `.empty` atual, linha 548, é texto narrativo, não chips).

- Isso substitui a ideia antiga de melhorar o `.empty` com texto por algo tocável — o `IDEIAS-hub-corretor.md` já propunha os dois em paralelo (empty state E placeholder); no campo-único eles convergem numa única superfície de exemplos.

### 3.6 Estados de erro/vazio com próxima ação

**Mecanismo:** os 3 pontos de "beco sem saída" já identificados no `IDEIAS-hub-corretor.md` (lente primeiro-uso) mapeiam para código real:
- `finish()`, linha 1282-1284: mensagem de "nenhum edifício"/"nenhum imóvel no endereço"/"nada encontrado" — hoje só texto. Adicionar botão de ação: se `MODE==="addr"` e vazio, oferecer `<button onclick="setMode('bd');document.getElementById('predio').value=rua;buscar()">Buscar como Prédio</button>` reaproveitando o texto já digitado.
- `buscar()`, `MODE==="ql"` sem quadra/lote (linha 1240): já tem fallback bom (`mostrarBairro`) — não precisa de ação extra, é o único caso já resolvido.
- Erros de rede (`catch` linha 1259-1260): já diferencia offline vs. falha do servidor (bom); poderia ganhar um botão "Tentar de novo" no toast, mas é incremento menor.

No campo-único, cada mensagem de vazio/erro deve ser roteada considerando o `detectMode()` capturado no momento da busca (para saber que ação alternativa oferecer — ex.: se detectou "endereço" com baixa confiança e não achou nada, sugerir tentar como prédio).

### 3.7 CNEFE para logradouros

Não há qualquer menção a CNEFE no código atual — é feature nova, mencionada só no `PROJECT.md` (v2.1 active). CNEFE (Cadastro Nacional de Endereços para Fins Estatísticos, IBGE) forneceria uma base de logradouros de Goiânia independente do cadastro municipal, útil para: (a) autocomplete de rua na caixa única (equivalente ao `COMBO` de bairros, mas para ruas), (b) corrigir grafias/variações que o LIKE do ArcGIS não pega. **Isso está fora do escopo desta leitura de código** (não há integração hoje) — recomendo tratar como uma sub-pesquisa própria (fonte de dados, formato, tamanho do arquivo estático para Goiânia, licença) antes de comprometer no roadmap; citado aqui só para registro de que é mencionado no PROJECT.md e não no `IDEIAS-hub-corretor.md`.

---

## 4. Fuzzy fix — regras concretas (roadmap item 19)

O achado original: *"número do imóvel casar por igualdade de dígitos primeiro e substring só como fallback sinalizado; rua casar por fronteira de palavra ('135' não casar '1350'); ordenar resultados por qualidade do match."*

Pontos exatos no código atual (confirmados por leitura):

**(a) Quadra/lote — linha 1251-1252, dentro do filtro client-side de `ql`:**
```js
const okQ=!q||nq===qU||nq.replace(/\D/g,"")===qU.replace(/\D/g,"")||nq.includes(qU);
const okL=!l||nl===lU||nl.replace(/[^0-9\/]/g,"").split("/").includes(lU)||nl.includes(lU);
```
Hoje: 3 níveis de match (igual, dígitos-iguais, substring) SEM marcação de qual nível casou — todos entram na lista com peso igual. **Fix proposto:** anexar um score por item (`0` = igual exato, `1` = dígitos iguais ignorando letra, `2` = substring) em vez de um booleano; usar o score para (i) ordenar a lista (exatos primeiro) e (ii) exibir um selo discreto tipo "match aproximado" nos itens score `2`. Isso não muda o WHERE server-side (recall continua alto via LIKE), só o refino e a apresentação client-side — mesma filosofia que o roadmap já definiu para P0 ("recall no servidor, precisão no cliente").

**(b) Rua — linha 1200-1201, `casaRua`:**
```js
const casaRua=a=>{const log=ruaCore(a.nmlogradou);
  return log.includes(rCore)||(rD&&(log.match(/\d+/g)||[]).includes(rD));};
```
Aqui já existe uma distinção correta para ruas NUMERADAS: `(log.match(/\d+/g)||[]).includes(rD)` extrai os números da rua como tokens e compara IGUALDADE (não substring) — isso já resolve "135" ≠ "1350" no caso de digitar só o número da rua (ex.: usuário digita "135" no campo rua, sem "rua"). O problema real é o primeiro ramo, `log.includes(rCore)`, usado quando `rCore` (o texto normalizado, sem tipo de via) tem letras — aí é substring puro sobre a string toda, então "Rua Bela" casaria "Rua Bela Vista" (esperado, é hierarquia normal de nome), mas também casaria falsos positivos em nomes compostos por acaso. **Fix proposto:** para o ramo textual, trocar `.includes()` por comparação por fronteira de palavra: `new RegExp('\\b'+escapeRegex(rCore)+'\\b').test(log)` ou, mais simples e sem regex dinâmica arriscada, comparar tokens: `log.split(' ').join(' ').includes(' '+rCore+' ')` com padding de espaço nas duas pontas — garante que o termo bate uma palavra/sequência de palavras completa, não um meio de palavra.

**(c) Ordenação por qualidade — hoje `finish()` ordena só por `ci` então `insubprinc` (linha 1278-1279), sem nenhum critério de "quão bem casou a busca".** Fix proposto: quando a busca vier de `detectMode()`/campo-único com um termo de match textual (rua, prédio, quadra/lote com letras), calcular o score de (a)/(b) por item e usar como critério de ordenação PRIMÁRIO, com `ci`/`insubprinc` como critério secundário (para manter unidades do mesmo prédio agrupadas). Isso é puramente client-side sobre o array já carregado — nenhuma chamada extra ao ArcGIS.

**Confiança:** ALTA em diagnosticar o problema exato no código (linhas citadas, comportamento verificado por leitura). MÉDIA em como pontuar/exibir (é decisão de produto, não fato verificável) — a convenção de 3 níveis (exato/normalizado/substring) é o padrão comum em busca de endereço fuzzy (geocoders e sistemas cadastrais tipicamente rankeiam "exact match" > "normalized match" > "partial/substring match"), mas não há uma fonte externa específica de Goiânia/SIGGO consultada — é boa prática geral de address-matching, não um requisito documentado da Prefeitura.

---

## 5. Deep-link `?insc=`

**Não existe hoje** (confirmado: nenhuma ocorrência de `location.search`/`URLSearchParams` no arquivo). É feature nova, já desenhada em `IDEIAS-hub-corretor.md` (lente marketing, "Deep-link do imóvel por inscrição").

**Mecanismo de implementação (ponto de hook identificado no código):**

O boot roda em sequência síncrona ao final do arquivo (linhas 2123-2130):
```js
document.body.dataset.view="mapa";
setMode(MODE);
if(!window.L||!window.proj4){ ...erro... }
else{initMap();setView("mapa");initCoach();loadBairros();loadBairroPolys();initCaixa();}
```

O deep-link precisa:
1. Ler `new URLSearchParams(location.search).get("insc")` (ou `?q=` para quadra-lote, conforme a ideia original) antes/durante o boot.
2. Se presente, forçar `MODE="insc"`, preencher `#insc` com o valor, e chamar `buscar()` — mas só DEPOIS que `initMap()` e `loadBairros()` tiverem resolvido (o modo `insc` não depende de `COMBO`, mas depende de `map` estar pronto para o `finish()`→`plot()` funcionar). Como `loadBairros()` é `async` e não é aguardado no boot atual, o ponto seguro é encadear depois de `initMap()` (síncrona) e não esperar `loadBairros()` (que só afeta os modos com setor).
3. Tratar erro (inscrição não encontrada) com o mesmo `toast()`/estado vazio já existente em `finish()` — não precisa de mensagem nova.

**Botão "Copiar link deste imóvel":** no painel de detalhe (`#detail`), ao lado das ações existentes (`#dActs`), montar `location.origin+location.pathname+"?insc="+encodeURIComponent(insc)` e `navigator.clipboard.writeText()` — mesmo padrão já usado para copiar a inscrição no botão Titular/CND (linha ~924, `copyInsc`), só trocando o conteúdo copiado.

**Risco/preservação:** o deep-link pode ficar tecnicamente redundante com o campo-único (`?insc=` faz o mesmo que digitar a inscrição na caixa e ela ser detectada como `insc` por dígitos) — a única diferença é que o deep-link pula a digitação e a detecção, indo direto para `buscar()`. Isso é desejável (é o "abrir de outra forma", não uma segunda fonte de verdade) — implementar reaproveitando `detectMode()`/`buscar()` como estão, não duplicar lógica de busca.

---

## 6. O que preservar vs. substituir — resumo executivo

| Elemento | Ação | Motivo |
|---|---|---|
| `MODE` (variável global) | **Preservar** | Continua sendo o estado que `buscar()` consome; `detectMode()` só decide o VALOR de `MODE` automaticamente em vez do clique manual |
| `buscar()` e todo o WHERE building por modo (§1.3) | **Preservar integralmente** | É o motor de busca real contra o ArcGIS; campo-único é só uma nova camada de UI/detecção EM CIMA dele |
| `setMode()` | **Preservar, reusar como API interna** | O chip de confirmação/correção manual chama `setMode()` internamente, não recria a lógica |
| `.moderow` + `.modemore` (3 botões + link) | **Substituir a exibição PADRÃO pela caixa única**, mas manter o HTML/CSS disponível como o menu de correção do chip de confirmação (§3.1) | Reaproveita CSS/acessibilidade já testados (alvos 44px, aria-pressed) em vez de recriar |
| `resolveBairro()` | **Preservar, reusar em `detectMode`** | Já resolve "melhor match de setor por substring" — é a mesma função, só chamada num contexto novo (frase completa em vez de campo dedicado) |
| `COMBO`/`filterCombo`/`pickBairro`/autocomplete de setor | **Preservar 100%** | Continua sendo o mecanismo de escolha manual de setor quando a frase não embute um; é referenciado por `detectMode` (§3.2), não substituído |
| `focusFirstField()` | **Adaptar** | Hoje mapeia `MODE→campo`; com campo único, só há 1 campo (a caixa) — a função pode ser removida OU redirecionada para focar a caixa única sempre; manter o princípio "não perder o foco depois de resolver o setor via Enter" |
| `likeTerm`/`ruaCore`/`norm`/`clean` | **Preservar, estender** | São a base de normalização; `detectMode` usa `norm()` e uma variante não-ancorada de `TIPOVIA` derivada da mesma constante |
| `isGarage`/`matchApto` | **Preservar sem mudança** | Filtros pós-busca, ortogonais ao campo-único |
| Ordenação em `finish()` (`ci`/`insubprinc`) | **Estender** com score de qualidade de match como critério primário quando aplicável (§4c) | Fuzzy-fix pede ranking por qualidade; hoje só agrupa por prédio |
| `closeChooser()` no início de `finish()`, Esc cobrindo chooser, alvos ≥44px | **Preservar sem tocar** | Correções recentes da auditoria; regressão aqui reabriria bugs já fechados |
| `.empty` estático (linha 548) | **Substituir** por exemplos tocáveis (§3.5) | É exatamente a lacuna identificada no `IDEIAS-hub-corretor.md`, ainda não implementada |
| Acessibilidade do combobox de setor (aria-*, labels) | **Preservar como padrão de referência** | Todo widget novo (chip, exemplos, desambiguação) deve seguir o mesmo nível já alcançado, não regredir a média |
| `SEARCHTOKEN` (guarda de concorrência) | **Preservar, aplicar também ao debounce do `detectMode`** | Digitação rápida + detecção assíncrona (ex.: se `detectMode` precisar checar `COMBO`, que carrega de forma assíncrona) precisa da mesma disciplina de token já usada em `buscar`/`onMapClick`/`loadCi` |

---

## 7. Ordem de construção sugerida e riscos

**Ordem recomendada** (cada etapa é testável isoladamente, sem quebrar a busca atual):

1. **Extrair e testar as funções puras primeiro** (roadmap item 18, hoje `⬜`): `norm`, `likeTerm`, `ruaCore`, `matchApto`, `isGarage`, e os filtros `okQ`/`okL`/`casaRua`. Sem teste automatizado, qualquer mudança no fuzzy-fix (§4) é regressão às cegas — este é pré-requisito lógico, não opcional, antes de tocar no matching.
2. **Fuzzy-fix (§4)** sobre as funções já testadas — ganho imediato de qualidade sem qualquer mudança de UI, mensurável (comparar resultados antes/depois em casos reais do roadmap: "20/21", "10E", "246"≈"Q246").
3. **`detectMode()` como função pura, testável isoladamente**, SEM ainda substituir a UI — validar as regex contra uma lista real de nomes de rua/prédio/bairro de Goiânia antes de expor ao usuário.
4. **Chip de confirmação + caixa única substituindo a moderow visualmente**, com fallback explícito para o menu de correção (reusa `.moderow`/`.modemore`). Este é o ponto de maior risco de regressão de acessibilidade/iOS — testar especificamente o fechamento por `pointerdown` e `font-size:16px` no novo input.
5. **Setor na frase + lembrar último setor** (§3.2, §3.3) — depende de (3) e (4) estarem estáveis.
6. **Desambiguação + exemplos tocáveis + estados de erro com ação** (§3.4, §3.5, §3.6) — são polimentos incrementais sobre a base já funcionando, podem entrar em paralelo ou depois.
7. **Deep-link `?insc=`** (§5) — independente das etapas 3-6 (só depende de `buscar()`/`MODE`, que já existem), pode ser feito em qualquer ponto, inclusive em paralelo à etapa 1.
8. **CNEFE para logradouros** (§3.7) — tratar como pesquisa separada antes de comprometer esforço; não tem dependência técnica com o resto, mas tem dependência de descoberta (fonte de dados ainda não avaliada).

**Riscos principais:**

- **Regressão de acessibilidade/iOS** é o risco mais concreto porque a auditoria de 03/07 já fechou uma lista extensa de achados especificamente na área de busca (combobox, foco, toque) — qualquer widget novo que não repita o padrão (`aria-live`, `role`, `label`, `pointerdown`, `44px`) reabre uma classe de bug já corrigida.
- **Ambiguidade genuína ("135") não tem solução heurística perfeita** — o próprio `IDEIAS-hub-corretor.md` já reconhece isso e propõe desambiguação por chips em vez de acertar sempre; a implementação deve aceitar essa limitação como comportamento correto (não tentar "resolver" 135 com mais regras — resolver com UI).
- **`resolveBairro()` autosseleciona o melhor match hoje** — bom para input direto no campo de setor, mas se `detectMode` reusar essa função sobre fragmentos extraídos de uma frase livre, o risco de falso-positivo de setor aumenta (frases mais livres, mais chance de substring acidental). Vale considerar exigir um score mínimo de confiança (ex.: match no início da frase, não em qualquer posição) quando a origem for o campo único, diferente do campo de setor dedicado onde o usuário já sinalizou a intenção.
- **`filterCombo` não tem debounce hoje** (achado de performance da auditoria, `⬜`) — o campo-único vai rodar `detectMode()` a cada tecla E potencialmente consultar `COMBO`; introduzir debounce desde o primeiro commit da feature evita herdar essa lacuna para um código novo que roda com mais frequência ainda que o combo antigo.
- **Sem backend/analytics**, não há como medir taxa de acerto do `detectMode()` em produção além de observação manual — vale considerar um log leve em `localStorage` (não enviado a lugar nenhum, só para autodiagnóstico do desenvolvedor) contando quantas vezes o usuário usou o chip para CORRIGIR a detecção, como proxy de qualidade sem violar a filosofia "sem telemetria" do projeto.

---

## Fontes

- Leitura direta de `radar-goiania.html` (2323 linhas, seções de busca lidas na íntegra: linhas 654-667, 998-1366, 1010-1185, 2110-2139).
- `git show 91a9130` e `git show d275e49` (diffs completos dos 2 commits recentes que tocaram a busca).
- `.planning/PROJECT.md` (contexto do milestone v2.1).
- `IDEIAS-hub-corretor.md`, Parte B, lentes `campo-unico` e `primeiro-uso` (desenho original das heurísticas e features de suporte).
- `ROADMAP-radar.md`, §0 (fatos validados no endpoint) e item 19 (fuzzy) — base para o fuzzy-fix.
- `AUDITORIA-2026-07-03.md`, lentes `bugs`, `ux-mobile`, `acessibilidade`, `performance` — base para preservação de correções recentes e riscos de regressão.
- Nenhuma consulta externa (Context7/WebSearch) foi necessária: a pergunta é inteiramente sobre código proprietário já lido e um desenho de produto já existente no repositório — o valor de research aqui é a leitura fiel e a formalização, não descoberta de ecossistema externo. Confiança sobre "boas práticas de address-matching" (§4) é MÉDIA por ser conhecimento geral de domínio (ranking exato>normalizado>substring é padrão comum em geocoders), não verificado contra uma fonte específica nesta sessão.
