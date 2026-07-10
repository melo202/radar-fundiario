# Phase 17: Diff de Cadastro & Cruzamento Caixa - Research

**Researched:** 2026-07-09
**Domain:** Codebase survey (vanilla JS/IndexedDB, app HTML único `radar-goiania.html`) — TERR-06/TERR-07
**Confidence:** ALTA (achado por leitura direta do código-fonte em produção + inspeção empírica dos dados reais de `caixa-goiania.js`/`bairros-goiania.json`/`bairro-cdbairro.json`; zero chamada de rede nova, zero lib nova — não há dependência de Context7/docs externos nesta fase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Diff de cadastro (TERR-06)**
- Escopo do snapshot: por LOTE SALVO no caderno (não snapshot de setor inteiro) — gatilho é a revisita de um lote farmado; zero requisição extra
- Momento do snapshot: ao salvar no caderno (Fase 16 já persiste os campos cadastrais permitidos — isso É o snapshot v1) e a cada revisita da ficha do lote salvo, o app compara o dado FRESCO com o snapshot salvo e, após mostrar o diff, atualiza o snapshot (guardando `snapshotAt`)
- Campos do diff (mesma allowlist da Fase 16 — CADERNO_ALLOW): `vlvenal` (subiu/desceu %), `areaedif` (construção nova/demolição), `vlimp98` (IPTU), `uso` (mudou), `dtinclusao`; nunca PII/`dtnascimen`
- Formato: diff enxuto e comercial — só o que mudou, com direção e magnitude; nada mudou → uma linha discreta; thresholds de relevância (ex.: ignorar variação < 1%) como constantes nomeadas
- Persistência: evolução do schema IndexedDB `radar_territorio` v1→v2 via `onupgradeneeded` (caminho já reservado na Fase 16): snapshot embutido no item do caderno (campos + `snapshotAt`) OU store `snapshots` separada — decisão fina do planner, mas SEM histórico ilimitado (guardar apenas o último snapshot anterior)
- Funções puras TDD: `diffLote(snapshotAntigo, atual)` → lista de mudanças tipadas; formatação de leitura comercial; tudo no RADAR_PURE

**Cruzamento Caixa (TERR-07)**
- Comparação por `cdbairro` primeiro (barato, determinístico): imóvel Caixa cruza com setores/lotes salvos no caderno via código/nome de bairro — `.filter()` puro, zero requisição
- Point-in-polygon fino só se o custo for trivial com a geometria já carregada — refinamento, não requisito
- Superfícies do destaque: (a) badge/contagem no bloco Caderno; (b) destaque no pino Caixa existente quando cai em setor farmado; (c) linha no painel do território quando o setor tem imóveis Caixa
- Ação em 1 toque: do aviso → abrir o pino/popup Caixa correspondente no mapa
- Zero requisição nova: `caixa-goiania.js` já é carregado e plotado hoje

**LGPD / segurança**
- Snapshot usa exclusivamente a allowlist `CADERNO_ALLOW`/`sanitizeCaderno` da Fase 16 (mesma função, defesa central); diff nunca exibe/persiste campo fora dela
- Import/export do caderno continua válido com os campos novos de snapshot (validação de shape atualizada + testes)
- Todo texto renderizado via esc()/textContent — handlers via data-attributes, nunca interpolação em on*

### Claude's Discretion
- Estrutura exata do snapshot (embutido vs store), thresholds de relevância, microcopy (§26), layout do bloco de diff na ficha/caderno
- Como o dado "fresco" chega ao diff (hook no fluxo da ficha `showDetail`/`loadCi` para lote com `ci` no caderno)

> Nota: o `17-UI-SPEC.md` (já aprovado, ver arquivo) resolveu a maior parte desta discretion: snapshot EMBUTIDO no item (`item.snapshot`+`item.snapshotAt`, subconjunto `DIFF_ALLOW`), hook via `renderDiffUI(a)` chamado ao fim de `showDetail()`. Esta pesquisa detalha os anchors de código para essas decisões e propõe um ajuste técnico (ver "IndexedDB version bump — recomendação").

### Deferred Ideas (OUT OF SCOPE)
- Histórico completo de snapshots (série temporal por lote) — v2.2+
- Diff de setor inteiro (snapshot em massa) — v2.2+ (custo de requisições)
- Alertas proativos/notificações de mudança — v2.2+ (exigiria varredura em background)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERR-06 | Diff de cadastro entre visitas (snapshot enxuto por lote; nunca dado pessoal) | Anchors de `showDetail`/`CADERNO_IO`/`sanitizeCaderno` (§1-2); recomendação de NÃO bumpar `CADERNO_VERSION` (§2.3); `diffLote`/`renderDiffUI` código-exemplo (§5); pitfall da chave `ci` (§4.1) |
| TERR-07 | Cruzamento dos imóveis Caixa (já plotados) com o território salvo do corretor | Estrutura real de `CAIXA.imoveis[]` (§3); prova empírica de taxa de match por nome normalizado (74%, §3.2); função `cdbairroDoImovelCaixa`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor` (§5); pitfall de colisão nome→múltiplos cdbairro (§4.4) |
</phase_requirements>

## Summary

As duas peças desta fase fecham o ciclo do Território sem nenhuma dependência nova: o Diff de Cadastro é uma comparação client-side entre o item já salvo no Caderno (Fase 16, IndexedDB `radar_territorio`) e o dado fresco que a ficha já exibe a cada abertura; o Cruzamento Caixa é um `.filter()` sobre `CAIXA.imoveis[]` (já carregado estaticamente) contra os `cdbairro` presentes no Caderno. O ponto de atenção real de TERR-06 é a **integridade da chave de identidade** (`ci` vs `ci||nrinscr`) entre `showDetail`, `cadernoTem`/`cadernoSalvar` e o novo `renderDiffUI` — um mismatch silencioso faria o diff nunca encontrar o item salvo. O ponto de atenção real de TERR-07 é que `CAIXA.imoveis[]` **não tem `cdbairro`** — só um campo de texto livre `b` (nome do bairro/loteamento, maiúsculo sem acento) e um código interno `cb` que não corresponde ao `cdbairro` fiscal do app. A pesquisa validou empiricamente (script Python sobre os dados reais) que normalizar `b` (acento/caixa, função `norm()` já existente no RADAR_PURE) e casar contra `nm_disp`/`nm_bai` de `bairros-goiania.json` (join com `bairro-cdbairro.json` para obter o `cdbairro`) resolve **131 dos 178 imóveis Caixa atuais (74%)** com match EXATO — sem nenhuma heurística fuzzy, sem risco de falso positivo. Os 26% restantes são nomes de loteamento específicos (ex.: "RESIDENCIAL JARDINS DO CERRADO 7") que não correspondem a nenhum bairro oficial — corretamente ficam sem match (comportamento honesto exigido pelo CONTEXT).

Sobre a persistência: a Fase 16 já grava `vlvenal`/`areaedif`/`vlimp98`/`dtinclusao`/`uso` no item do Caderno no momento do save (isso já É, literalmente, o "snapshot v1" citado no CONTEXT). O `17-UI-SPEC.md` já decidiu que o snapshot da Fase 17 vive em um sub-objeto `item.snapshot{...5 campos...}` + `item.snapshotAt`, separado dos campos "flat" já existentes (defesa em duas camadas, campos "flat" ficam congelados desde o 1º save, `snapshot` é atualizado a cada revisita). Esta pesquisa levanta um ponto técnico que o comentário de código de 16-02 não previu: **adicionar `snapshot`/`snapshotAt` ao objeto do item NÃO exige bump de `CADERNO_VERSION`** — IndexedDB não tem schema de valor fixo (só `keyPath`/índices são schema); só é preciso subir a versão se for criado um novo object store ou índice, nenhum dos dois necessário aqui. Recomendo pular o bump (menos risco, evita o caminho `onblocked` de multi-aba) — decisão final é do planner.

**Primary recommendation:** implementar `diffLote`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor`/`cdbairroDoImovelCaixa` 100% em RADAR_PURE (TDD, node:vm — mesmo padrão de `tests/caderno.test.mjs`); adicionar só duas funções de I/O novas (`cadernoBuscar(ci)`, irmã de `cadernoTem`, e `renderDiffUI(a)`, irmã assíncrona de `renderCadernoBtn`); reutilizar `norm()` (linha 1318) para o matching de nome de bairro, nunca inventar uma 2ª função de normalização.

## Architecture — Anchors de código (pós-Fase 16)

### 1. Fluxo da ficha — hook do diff

- **`showDetail(a,ll)`** — `radar-goiania.html:4540`. Recebe `a` = objeto de atributos FRESCO (vindo de `finish()`/`loadCi()`/`identifyPoint()`/busca — sempre a resposta do endpoint, sanitizada por `sanitiza()` linha 1303, nunca cacheada de sessão anterior).
  - `DCUR=a` é setado em `showDetail` linha 4598 — o "imóvel atualmente aberto" global.
  - `renderCadernoBtn()` já é chamado no fim de `showDetail`, linha **4651** — `renderDiffUI(a)` deve ser chamado imediatamente ao lado (mesmo ponto), não em outro lugar; ambas são "irmãs assíncronas" que batem no IndexedDB sem travar o render síncrono.
  - **`#dLeitura`** (linha 1080) e **`#dActsPrim`** (linha 1082) são os vizinhos DOM — o `<div class="ddiff" id="dDiff" hidden>` estático (UI-SPEC) entra exatamente ENTRE essas duas linhas no HTML (não é criado dinamicamente, só populado/revelado).
- **`loadCi(ci)`** — linha 2917. Não chama `showDetail` diretamente; chama `finish(items,true)` (linha 2926), que é quem eventualmente invoca `showDetail`. Não precisa de hook próprio — `a` chega a `showDetail` do mesmo jeito independente da origem (busca/loadCi/identifyPoint).

**Pitfall crítico de identidade (ver §4.1):** a variável local `ci` dentro de `showDetail` (linha 4544) é `clean(a.ci)` — SEM fallback para `nrinscr`. Mas `renderCadernoBtn()` (linha 4753) e `salvarNoCadernoUI()` (linha 4772) usam `clean(a.ci||a.nrinscr)` como chave real do Caderno. `renderDiffUI(a)` DEVE usar a MESMA fórmula (`clean(a.ci||a.nrinscr)`), nunca a variável local `ci` de `showDetail` — senão o diff nunca encontra o item salvo para imóveis onde `a.ci` vem vazio (ex.: alguns registros de unidade/apartamento).

### 2. Caderno — `CADERNO_IO` e allowlist

- **`CADERNO_ALLOW`** — linha **2367**: `["ci","nrinscr","cdbairro","nrquadra","nrlote","vlvenal","areaedif","areaterr","vlimp98","dtinclusao","uso","endereco","tag","nota","status","savedAt","updatedAt"]`. Precisa ganhar `"snapshot"` e `"snapshotAt"` (aditivo, nunca remove nada).
- **`sanitizeCaderno(obj)`** — linha **2386**. Allowlist positiva pura — `snapshot`/`snapshotAt` passam a sobreviver automaticamente assim que entrarem em `CADERNO_ALLOW`, sem tocar no corpo da função (ela já itera `CADERNO_ALLOW.forEach`). Nenhuma validação de FORMA do sub-objeto `snapshot` existe hoje — se o planner quiser blindagem extra (ex.: rejeitar `snapshot` que não seja um objeto plano com só os 5 campos de `DIFF_ALLOW`), é um `if` a mais dentro de `sanitizeCaderno`, mesmo padrão do CR-01 (`CADERNO_CI_RE`) já aplicado a `ci`.
- **`validarImportCaderno(json)`** — linha **2407**. Já reusa `sanitizeCaderno` por item — um JSON importado com `snapshot`/`snapshotAt` passa a ser aceito automaticamente assim que a allowlist for estendida; item ANTIGO (sem esses campos) continua válido (campos ausentes, `#dDiff` some até a próxima revisita gerar o 1º snapshot — comportamento já descrito no UI-SPEC §5).
- **`CADERNO_VERSION`** — linha **3278**: hoje `1`, com o comentário `// Fase 17 sobe para 2 e adiciona o store "snapshots" via onupgradeneeded (reservado abaixo)`. O `onupgradeneeded` (linha 3298-3310) tem o comentário reservado: `/* Fase 17 (v2): if(e.oldVersion<2){ const snap=db.createObjectStore("snapshots", {keyPath:["cdbairro","data"]}); ... } */` (linha 3308).
  - **Este comentário está OBSOLETO em relação ao `17-UI-SPEC.md`**, que já decidiu pelo campo embutido (`item.snapshot`), não por um store `snapshots` separado. Ver "IndexedDB version bump — recomendação" abaixo.
- **`cadernoTem(ci)`** (linha 3396) retorna só `boolean` — **não existe hoje uma função que retorne o ITEM salvo por `ci`**. `renderDiffUI(a)` precisa ler o item completo (para pegar `.snapshot`/`.snapshotAt`) — é necessário adicionar `cadernoBuscar(ci)`, uma função nova, irmã de `cadernoTem`, que resolve com `req.result` (o item ou `undefined`) em vez de boolean. Mesmo padrão de `db.close()` em sucesso/erro (WR-02). Ver código-exemplo §5.
- **`cadernoAtualizar(ci,patch)`** (linha 3338) já é o mecanismo certo para gravar `snapshot`/`snapshotAt` novos após montar o diff — ele já faz merge + `sanitizeCaderno` de novo antes do `put`. Não precisa de uma função de escrita nova, só chamar `cadernoAtualizar(ci,{snapshot:{...},snapshotAt:new Date().toISOString()})`.
- **`salvarNoCadernoUI()`** (linha 4765): o objeto `item` montado no 1º save (linha 4781-4785) já inclui `vlvenal,areaedif,areaterr,vlimp98,dtinclusao,uso` FLAT (sem `snapshot`). Para satisfazer "1º save já grava o snapshot inicial" (UI-SPEC §5), esse objeto precisa ganhar `snapshot:{vlvenal:a.vlvenal,areaedif:a.areaedif,vlimp98:a.vlimp98,uso:a.uso,dtinclusao:a.dtinclusao}` e `snapshotAt:new Date().toISOString()` — SUBCONJUNTO de `DIFF_ALLOW` (5 campos, sem `areaterr`), não os mesmos campos flat (que incluem `areaterr`, fora do escopo do diff).

### 3. `caixa-goiania.js` — estrutura REAL de `CAIXA.imoveis[]`

Inspeção direta do arquivo (178 imóveis na safra atual, `CAIXA.gerado="2026-07-02"`, `CAIXA.fatores={}` vazio nesta safra):

```json
{"id":"10195443","b":"SETOR ORIENTVILLE","e":"RUA FRANCISCO LUIS FERREIRA, N. 00, QD 01, LT 10",
 "p":496311.72,"a":960000.0,"d":48.31,"t":"Terreno","m":"Venda Online",
 "u":"https://venda-imoveis.caixa.gov.br/...","cb":664,"x":675514.74,"y":8147491.28,"pr":"q"}
```

Campos confirmados (via `caixaPopup`/`toggleCaixa`, linhas 6101-6132, + inspeção direta): `id` (string), `b` (**texto livre**, nome do bairro/loteamento — SEMPRE presente, 178/178 na safra atual, maiúsculo sem acento), `e` (endereço), `p` (preço, `brl()`), `a` (valor de avaliação/laudo), `d` (% desconto), `t` (tipo: Terreno/Casa/Apartamento), `m` (modalidade: Venda Online/Licitação/Leilão SFI), `u` (URL da Caixa), `cb` (código numérico — **NÃO é `cdbairro` fiscal do app**; é um código interno da própria Caixa, sem relação confirmada com o cadastro municipal — 11/178 itens nem têm esse campo), `x`/`y` (UTM 31982, convertidos via `toWGS(x,y)` linha 1289), `pr` ("q"=pino exato, outro valor=pino aproximado, ver `caixaPopup` linha 6108).

**`x`/`y` ausentes em 64/178 itens (36%)** — `toggleCaixa()` já filtra `CAIXA.imoveis.filter(i=>i.x&&i.y)` antes de plotar (linha 6089/6118/6127); qualquer função nova de cruzamento (`cruzarCaixaTerritorio`/`cruzarCaixaSetor`) e a ação "abrir no mapa" DEVEM aplicar o MESMO filtro — um imóvel sem coordenada não tem pino, não pode ser aberto/centralizado, e não deveria contar para "N imóveis Caixa no mapa" na mensagem do toast (mesmo que ainda entre na contagem textual do badge, se o planner decidir contar por bairro independente de pino — a decisão de UX já está no UI-SPEC, aqui só o dado real).

**Não existe campo `cdbairro` em `CAIXA.imoveis[]`.** Nem um lookup nome→cdbairro pronto no runtime. O cruzamento por `cdbairro` (decisão locked do CONTEXT) exige resolver `b` (texto livre) para um `cdbairro` — ver §3.2.

### 3.1. `bairros-goiania.json` / `bairro-cdbairro.json` — o join disponível

- `bairros-goiania.json`: `FeatureCollection`, cada `feature.properties` tem `id` (string de 12 dígitos), `nm_bai` (nome OFICIAL abreviado, maiúsculo sem acento — ex. `"FAZ DOURADOS"`), `nm_disp` (nome de exibição, prefixo expandido + acento — ex. `"Fazenda Dourados"`; gerado por `gerar-bairros.py`, tabela `PFX_PT` linha 314-320: RES→Residencial, JD→Jardim, VI/VL/VILA→Vila, SET/ST→Setor, LOT→Loteamento, PRQ/PQ→Parque, FAZ→Fazenda, etc.).
- `bairro-cdbairro.json`: `{"<id>":{"cd":<cdbairro numérico>,"mo":"unico"|"nome"|"maioria"}}` — join `id`(polígono)→`cdbairro` fiscal. Carregado hoje por `carregarLookupCdbairro()` (linha 2573), populando `idParaCdbairro`/`cdbairroParaIds` (Maps globais, lazy — só na 1ª ação de território, nunca no boot).
- `norm(s)` — linha **1318**, já dentro do bloco RADAR_PURE, testável: `s.normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/\s+/g," ").trim()`. Remove acento, uppercase, colapsa espaço. **Esta é a função a reusar** para normalizar tanto `CAIXA.imoveis[i].b` quanto `nm_disp`/`nm_bai` antes de comparar — nunca escrever uma 2ª função de normalização.

### 3.2. Matching `b` → `cdbairro` — validado empiricamente

Executei um script Python equivalente à lógica proposta (mesma normalização de `norm()`, sem heurística fuzzy) sobre os dados reais dos 3 arquivos:

```
total imóveis Caixa: 178 (57 nomes de bairro/loteamento distintos em `b`)
match EXATO por norm(b) == norm(nm_disp) OU norm(nm_bai): 131/178 (74%) — 43 nomes distintos casaram
resolvidos a um cdbairro (join via bairro-cdbairro.json): 131/178 (mesma taxa — todo match de nome tem cdbairro)
colisões nome→múltiplos cdbairro distintos: 12 (ver Pitfall §4.4)
```

Exemplos que CASAM (74%): `"SETOR BUENO"`, `"SETOR CRISTINA"`, `"SETOR NEGRAO DE LIMA"`, `"JARDIM ATLANTICO"`, `"PARQUE AMAZONIA"`, `"FAZENDA SANTA RITA"`, `"FAZENDA DOURADOS"`, `"RESIDENCIAL ALFA"`, `"RESIDENCIAL BARCELONA"`.

Exemplos que NÃO casam (26%, corretamente sem match): `"RESIDENCIAL JARDINS DO CERRADO 7"` (loteamento com número de fase, não é um bairro), `"CHACARAS SANTA RITA"` (variação não coberta por `nm_bai`/`nm_disp` — abreviação "CHACARAS" vs. possivelmente "CH" no cadastro), `"SANTA GENOVEVA 2"` (sufixo numérico de subdivisão), `"MOINHO DOS VENTOS"` (nome não encontrado nas duas fontes na forma exata — merece checagem manual pontual, não heurística automática).

**Esta é a evidência que sustenta a decisão do CONTEXT ("fallback honesto — sem match → não destaca; nunca falso positivo"):** os 26% sem match são majoritariamente nomes de loteamento MAIS específicos que o bairro (sub-nome), não erros de acentuação/abreviação — uma heurística fuzzy (substring, Levenshtein) arriscaria casar "SANTA GENOVEVA 2" com o bairro "SANTA GENOVEVA" (2 zonas cadastrais legitimamente diferentes, ou pode ser a mesma — não é seguro assumir) OU "RESIDENCIAL PORTO MARANATA - FAZENDA DOU..." com múltiplos bairros candidatos por token. **Recomendação: match exato apenas, sem fuzzy.** O ganho marginal de recall não compensa o risco de falso positivo (que o CONTEXT proíbe explicitamente).

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|---|---|---|---|
| Normalização de nome de bairro (acento/caixa) | Uma 2ª função `normalizarNome()` | `norm()` já existente (RADAR_PURE, linha 1318) | Função única de verdade, já testada indiretamente pelas 141 suites; duplicar quebra o princípio DRY do próprio projeto e arrisca UMA das duas divergir num fix futuro |
| Matching fuzzy de nome de bairro | Levenshtein/substring/token-overlap para casar `b` com `nm_bai` | Match EXATO pós-`norm()` apenas | Validado empiricamente: fuzzy não é necessário para 74% dos casos e o CONTEXT proíbe falso positivo — ganho marginal não compensa risco |
| Ler o item do Caderno por `ci` | Reimplementar uma query IndexedDB nova do zero na UI | `cadernoBuscar(ci)` — nova função, MAS seguindo o padrão exato de `cadernoTem(ci)` (mesma tx/store/close) | Evita reinventar o wrapper de I/O que já tem toda a disciplina de erro/`db.close()` (WR-02) resolvida |
| Point-in-polygon para o cruzamento Caixa | Escrever ray-casting manual contra `bairros-goiania.json` | Não implementar nesta fase (CONTEXT: "refinamento, não requisito") — comparação por `cdbairro` já cobre 74% dos casos reais | App não tem Turf.js/leaflet-pip; a única técnica de point-in-polygon citada no projeto (`Mapa_ModeloEspacial`) é *server-side* (query ao ArcGIS), não uma lib client-side pronta — implementar do zero é esforço não coberto pelo escopo locked |
| Bump de versão do IndexedDB "porque o comentário do código diz para fazer isso" | Seguir literalmente o comentário linha 3308 (criar store `snapshots`) | Adicionar `snapshot`/`snapshotAt` como campos do objeto já existente, SEM bump de `CADERNO_VERSION` | Ver seção dedicada abaixo — o comentário ficou obsoleto quando o UI-SPEC decidiu por campo embutido em vez de store separada |

**Key insight:** as duas ferramentas desta fase são, no fundo, "índices e filtros sobre dado que já existe na memória/disco do navegador" — a complexidade real está em NÃO introduzir falsos positivos (Caixa) e NÃO perder a chave de identidade do item salvo (diff), não em algoritmo novo.

## IndexedDB version bump — recomendação (achado técnico, não coberto pelo UI-SPEC)

O comentário de código da Fase 16 (`radar-goiania.html:3278,3308`) reservou um caminho de upgrade para "Fase 17 sobe `CADERNO_VERSION` para 2 e cria o store `snapshots`". O `17-UI-SPEC.md` (Persistência, §5) já decidiu por um campo **embutido** no item existente (`item.snapshot`+`item.snapshotAt`), não por um store novo — o que torna a premissa original do comentário (precisar de um NOVO OBJECT STORE) obsoleta.

**[VERIFIED: comportamento padrão da IndexedDB — object stores não têm schema de VALOR fixo, só `keyPath`/índices são schema.]** Isso significa que **gravar um objeto com campos novos (`snapshot`, `snapshotAt`) no store `caderno` já existente NÃO exige `onupgradeneeded`/bump de versão** — basta `put()` o objeto com as chaves extras; `IDBObjectStore.put` aceita qualquer forma de objeto (structured-clone) que caiba no limite de tamanho do browser.

Bump de versão só seria necessário se a Fase 17 precisasse de: (a) um NOVO object store, ou (b) um NOVO índice (`createIndex`) para consultar por `snapshotAt` em faixa — nenhum dos dois é necessário aqui (o diff é sempre uma leitura pontual por `ci`, nunca uma consulta por data).

**Recomendação:** manter `CADERNO_VERSION=1`; estender só `CADERNO_ALLOW`/`sanitizeCaderno` (JS-level, sem tocar em `onupgradeneeded`); substituir o comentário obsoleto da linha 3308 por uma nota explicando por que a Fase 17 NÃO precisou do bump (documentação para quem ler o código depois). Isso elimina risco do caminho `onblocked`/multi-aba (WR-02) para esta fase — zero superfície nova de falha de I/O.

Se o planner preferir bumpar para `2` mesmo assim (por clareza histórica/rastreabilidade, já que o comentário anterior prometia isso), é uma escolha válida e inofensiva — só não CRIA nem MODIFICA nenhum store/índice dentro do `onupgradeneeded`, o bump seria puramente cosmético. **Decisão final é do planner** (dentro da discretion já delegada pelo CONTEXT).

## Common Pitfalls

### Pitfall 1: chave de identidade divergente entre `showDetail` e o Caderno
**O que dá errado:** `renderDiffUI(a)` usa a variável local `ci` de `showDetail` (`clean(a.ci)`, sem fallback) em vez de `clean(a.ci||a.nrinscr)` (a chave REAL usada por `cadernoTem`/`cadernoSalvar`/`renderCadernoBtn`).
**Por que acontece:** `showDetail` já tem uma variável chamada `ci` no seu escopo (linha 4544) que serve a outro propósito (exibição da inscrição) — fácil reusar por engano.
**Como evitar:** sempre computar a chave do Caderno com a MESMA fórmula usada em `renderCadernoBtn`/`salvarNoCadernoUI` (`clean(a.ci||a.nrinscr)`), nunca a variável `ci` local pura.
**Sinais de alerta:** diff nunca aparece para nenhum lote salvo (mesmo tendo `cadernoTem`=true no botão) — sintoma de mismatch de chave.

### Pitfall 2: `CAIXA.imoveis[i].cb` não é `cdbairro`
**O que dá errado:** assumir que o campo `cb` (presente em 167/178 itens) é o `cdbairro` fiscal do app e usá-lo direto na comparação — geraria cruzamentos aleatórios (nenhuma correspondência real confirmada entre os dois códigos).
**Como evitar:** ignorar `cb` para efeito de cruzamento de território; resolver `cdbairro` SEMPRE via `norm(i.b)` → lookup de nome (§3.2/§5), nunca via `i.cb`.

### Pitfall 3: filtrar coordenada ausente antes de contar/abrir no mapa
**O que dá errado:** contar/badge incluir imóveis Caixa sem `x`/`y` (36% do dataset atual) e depois a ação "abrir no mapa" falhar silenciosamente (nenhum pino existe pra esse item).
**Como evitar:** `cruzarCaixaTerritorio`/`cruzarCaixaSetor` devem aplicar o MESMO guard já usado em `toggleCaixa()` (`i.x&&i.y`) antes de considerar um imóvel "cruzável" — mesma disciplina, um único padrão no app.

### Pitfall 4: nome de bairro normalizado pode mapear para MAIS DE UM `cdbairro`
**O que dá errado:** montar um `Map<nomeNormalizado, cdbairroÚnico>` e descartar silenciosamente colisões — 12 nomes normalizados (empiricamente confirmado) correspondem a `cdbairro` DIFERENTES em `bairros-goiania.json` (bairro dividido em >1 zona cadastral com o mesmo nome de exibição).
**Como evitar:** o lookup nome→cdbairro deve resolver para um `Set`/array de códigos possíveis, não um valor único; a comparação com o Caderno deve checar se QUALQUER um dos códigos do conjunto está entre os `cdbairro` salvos — nunca lançar fora a ambiguidade silenciosamente (perderia recall real sem necessidade, já que TODOS os códidos do conjunto são candidatos legítimos, não um erro de dado).

### Pitfall 5: `sanitizeCaderno`/`validarImportCaderno` aceitam `snapshot` sem validar sua FORMA
**O que dá errado:** depois de estender `CADERNO_ALLOW` com `"snapshot"`, um JSON importado malicioso ou corrompido poderia trazer `snapshot` como string, array, ou objeto com campos fora de `DIFF_ALLOW` (ex.: `dtnascimen` escondido dentro do sub-objeto) — a allowlist de `CADERNO_ALLOW` só filtra a CHAVE de topo (`"snapshot"` sobrevive inteiro, sem look-inside).
**Como evitar:** adicionar dentro de `sanitizeCaderno` um passo extra que reconstrói `out.snapshot` campo a campo a partir de `DIFF_ALLOW` (mesmo padrão da allowlist positiva, um nível mais profundo) em vez de copiar o sub-objeto bruto — ou seja, `sanitizeCaderno` faz allowlist RECURSIVA nesse único campo aninhado, não confia que "chave permitida" implica "conteúdo seguro".
**Sinais de alerta:** teste de import com `snapshot:{dtnascimen:"..."}` — se sobreviver ao sanitize, é o bug.

### Pitfall 6: reabrir a mesma ficha na mesma sessão gera diff vazio (comportamento correto, não um bug)
Já documentado no UI-SPEC §5 — deixar registrado aqui para o planner não "corrigir" isso: salvar → reabrir imediatamente → diff mostra "Sem mudanças" é o resultado CORRETO e honesto de `diffLote`, não precisa de tratamento especial.

## Code Examples

Padrões extraídos do código já em produção (mesmo estilo, sem framework):

### `cadernoBuscar(ci)` — nova função de I/O, irmã de `cadernoTem`
```javascript
// Mesmo padrão de cadernoTem() (radar-goiania.html:3396) — db.close() no sucesso/erro do req.
// Resolve com o ITEM completo (ou undefined), não um boolean — usado por renderDiffUI para ler .snapshot/.snapshotAt.
function cadernoBuscar(ci){
  return cadernoAbrirDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction("caderno","readonly");
    const req=tx.objectStore("caderno").get(ci);
    req.onsuccess=()=>{db.close();resolve(req.result);};
    req.onerror=()=>{db.close();reject(req.error);};
  }));
}
```

### `diffLote` — assinatura sugerida (RADAR_PURE, TDD)
```javascript
// DIFF_ALLOW e thresholds nomeados, mesmo padrão de DETECTOR_RATIO_MAX (16-01).
const DIFF_ALLOW=["vlvenal","areaedif","vlimp98","uso","dtinclusao"];
const DIFF_THRESH_PCT=1;      // variação de venal/IPTU abaixo de 1% não conta
const DIFF_THRESH_AREA_M2=1;  // variação de área construída abaixo de 1 m² é ruído de arredondamento
// diffLote(snapshotAntigo, atual) -> [{campo,tipo:"pct"|"area"|"categorico",direcao:"subiu"|"desceu"|"mudou",valor}]
// tipo "pct": (vlvenal, vlimp98); tipo "area": (areaedif, com subtipos "zero->>0"/"0->zero"); tipo "categorico": (uso, dtinclusao)
```

### `cdbairroDoImovelCaixa` — matching por nome normalizado (RADAR_PURE)
```javascript
// nomeParaCdbairro: Map<string normalizado, Set<number>> — construído 1x a partir de
// bairros-goiania.json (nm_disp/nm_bai) + bairro-cdbairro.json (id->cd), reusando norm() (linha 1318).
// Pitfall 4: um nome pode ter >1 cdbairro — nunca reduzir a um valor único.
function cdbairroDoImovelCaixa(imovelCaixa, nomeParaCdbairro){
  const codigos = nomeParaCdbairro.get(norm(imovelCaixa.b));
  return codigos ? Array.from(codigos) : []; // [] = sem match, honesto (nunca inventa)
}
// cruzarCaixaTerritorio(imoveisCaixa, itensCaderno, nomeParaCdbairro):
//   cdbairrosSalvos = new Set(itensCaderno.map(it=>it.cdbairro).filter(v=>v!=null))
//   retorna imoveisCaixa.filter(i=>i.x&&i.y).filter(i=>cdbairroDoImovelCaixa(i,nomeParaCdbairro).some(cd=>cdbairrosSalvos.has(cd)))
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node --test` (Node.js nativo, `node:test`+`node:assert/strict`) — zero dependência |
| Config file | `package.json` (`"test":"node --test \"tests/*.test.mjs\""`) |
| Quick run command | `npm test` (suíte inteira, ~140ms — não há suíte "rápida" separada, a completa já é instantânea) |
| Full suite command | `npm test` |

Padrão de carregamento do bloco puro: `tests/caderno.test.mjs`/`tests/territorio.test.mjs` fazem slice do bloco `RADAR_PURE_START`/`RADAR_PURE_END` de `radar-goiania.html` via `node:vm` (nunca importam o HTML inteiro) — `tests/diff-caixa.test.mjs` (novo arquivo) deve seguir o MESMO padrão, com `assert.ok(src.includes("function diffLote"), ...)` de guarda RED→GREEN, igual `tests/caderno.test.mjs:16-46`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERR-06 | `diffLote`: detecta subida/queda de `vlvenal`/`vlimp98` acima do threshold de 1%, ignora abaixo | unit | `npm test` (novo `tests/diff-caixa.test.mjs`) | ❌ Wave 0 |
| TERR-06 | `diffLote`: área construída 0→N ("construção nova?"), N→0 ("demolição?"), N→M sem cruzar zero | unit | `npm test` | ❌ Wave 0 |
| TERR-06 | `diffLote`: `uso` mudou (categórico, rótulo via `USO[...]`, nunca código cru) | unit | `npm test` | ❌ Wave 0 |
| TERR-06 | `diffLote`: nenhuma mudança relevante → lista vazia (nunca lança) | unit | `npm test` | ❌ Wave 0 |
| TERR-06 | `sanitizeCaderno`: `snapshot`/`snapshotAt` sobrevivem; `snapshot.dtnascimen` (campo injetado) NUNCA sobrevive | unit | `npm test` (estende `tests/caderno.test.mjs`) | ❌ Wave 0 |
| TERR-06 | `validarImportCaderno`: item com `snapshot` malformado (string/array) é aceito sem o campo ou rejeitado, nunca quebra o import inteiro | unit | `npm test` | ❌ Wave 0 |
| TERR-07 | `cdbairroDoImovelCaixa`/matching: `norm("SETOR BUENO")` casa com `nm_bai`/`nm_disp` do bairro real; `norm("RESIDENCIAL X 7")` não casa nada (honesto) | unit | `npm test` (novo `tests/diff-caixa.test.mjs`, fixtures com nomes reais de `caixa-goiania.js`) | ❌ Wave 0 |
| TERR-07 | `cruzarCaixaTerritorio`: filtra por `x&&y`; nunca inclui imóvel sem coordenada | unit | `npm test` | ❌ Wave 0 |
| TERR-07 | `cruzarCaixaTerritorio`/`cruzarCaixaSetor`: nome com >1 `cdbairro` candidato (colisão) — match se QUALQUER candidato bate | unit | `npm test` | ❌ Wave 0 |
| TERR-06/07 | grep de commit: `dtnascimen` nunca aparece em `DIFF_ALLOW`/perto do bloco novo | manual (grep) | `grep -n "dtnascimen" radar-goiania.html` | — |
| TERR-06 | Manual: revisitar lote salvo com valor alterado no servidor real (ou mock local) → diff correto na ficha | manual | abrir app real, salvar lote, simular mudança (editar item no DevTools IndexedDB), reabrir ficha | — |
| TERR-07 | Manual: badge Caixa aparece no Caderno quando há match real; pino com anel visível; popup com linha extra | manual | abrir app real, salvar lote de um bairro com imóvel Caixa confirmado (ex.: Setor Bueno — `cb`/`b` presentes na safra atual), abrir camada Caixa | — |

### Sampling Rate
- **Per task commit:** `npm test` (suíte inteira, ~140ms — sem razão para rodar parcial)
- **Per wave merge:** `npm test`
- **Phase gate:** suíte 100% verde (era 141/141 antes desta fase; deve crescer com os novos testes) antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/diff-caixa.test.mjs` — novo arquivo, cobre `diffLote`/`cdbairroDoImovelCaixa`/`cruzarCaixaTerritorio`/`cruzarCaixaSetor` (mesmo padrão `node:vm` de `tests/caderno.test.mjs`)
- [ ] `tests/fixtures.mjs` — adicionar `DIFF_FIX`/`CAIXA_MATCH_FIX` (fixtures com nomes REAIS extraídos de `caixa-goiania.js`, ex.: "SETOR BUENO"/"RESIDENCIAL JARDINS DO CERRADO 7", para o teste de matching não depender de dado sintético divorciado da realidade)
- [ ] Estender `tests/caderno.test.mjs` (ou criar assert dentro do mesmo `diff-caixa.test.mjs`) com os casos de `sanitizeCaderno`/`validarImportCaderno` para `snapshot`/`snapshotAt`
- [ ] Framework install: nenhum — `node --test` já configurado, zero passo novo

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`). App é 100% client-side, sem servidor/autenticação própria — a maioria das categorias ASVS não se aplica; foco em V5 (validação de entrada) e reforço da defesa LGPD já central do projeto.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não | app não tem login/sessão de usuário |
| V3 Session Management | não | nenhum estado de sessão server-side |
| V4 Access Control | não | dado 100% local ao navegador do próprio corretor |
| V5 Input Validation | **sim** | `sanitizeCaderno` (allowlist positiva) já cobre o item de topo; esta fase precisa ESTENDER a validação para o sub-objeto `snapshot` (Pitfall 5) — allowlist recursiva, nunca copiar objeto aninhado bruto |
| V6 Cryptography | não | nenhum dado criptografado (IndexedDB nativo, sem necessidade de cifra — dado não é sensível, é anotação do próprio corretor + cadastro público) |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Import de JSON malicioso reintroduzindo campo sensível (`dtnascimen`) via sub-objeto `snapshot` não validado | Tampering/Information Disclosure | Allowlist recursiva em `sanitizeCaderno` para o campo `snapshot` (não só a chave de topo) — ver Pitfall 5 |
| XSS via `data-bairros`/handlers do badge/linha Caixa | Tampering | Já mitigado pelo padrão já fixado na Fase 16 (CR-01): handlers leem `this.dataset.bairros`, nunca interpolam string do endpoint dentro de `onclick=""` — esta fase só precisa REPETIR o padrão, nunca inventar um novo |
| Falso positivo de cruzamento Caixa expondo uma correlação incorreta ao usuário (não é uma vulnerabilidade de segurança clássica, mas é um risco de integridade/confiança do produto) | Tampering (integridade do dado exibido) | Match exato apenas (nunca fuzzy) — já coberto pela decisão de matching desta pesquisa |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `CAIXA.imoveis[i].cb` não corresponde ao `cdbairro` fiscal do app (nenhuma correlação testada, só inspeção visual dos primeiros valores) | §3, Pitfall 2 | Baixo — a recomendação já é IGNORAR `cb` para cruzamento, então mesmo que uma correlação parcial existisse por coincidência, a decisão de projeto não depende dela |
| A2 | A taxa de match (74%) medida na safra atual de `caixa-goiania.js` (178 imóveis, gerada em 2026-07-02) é representativa de safras futuras — o arquivo é atualizado manualmente via `atualizar-caixa.py`, sem garantia de que a distribuição de nomes (bairro oficial vs. loteamento específico) se mantenha | §3.2 | Médio-baixo — mesmo que a taxa mude, a lógica (match exato, honesto) não muda; só a cobertura percebida pelo usuário varia entre safras |
| A3 | Nenhuma correlação foi testada entre `nm_bai` "abreviado" e variações adicionais de escrita do `b` da Caixa (ex.: "CH" abreviado vs. "CHACARAS" escrito por extenso) — a tabela `PFX_PT` do `gerar-bairros.py` já expande esses casos em `nm_disp`, mas alguns nomes da Caixa usam abreviações DIFERENTES das do cadastro (ex. "RES FLORES D C") que nem `nm_disp` nem `nm_bai` cobrem | §3.2, exemplos "não casam" | Baixo — comportamento correto já é "sem match, honesto"; não é um requisito desta fase resolver 100% dos casos |

**Se esta tabela estivesse vazia:** não está — as 3 claims acima vêm de inspeção direta do dado real (script Python rodado nesta sessão), então tecnicamente são `[VERIFIED]` quanto ao FATO observado, mas ficam aqui porque a EXTRAPOLAÇÃO (generalizar para safras futuras/casos não testados) é que carrega incerteza.

## Open Questions

1. **`sanitizeCaderno` deve validar a FORMA do sub-objeto `snapshot`, ou só a presença da chave?**
   - O que sabemos: a allowlist atual (`CADERNO_ALLOW.forEach`) só copia a chave de topo se presente — não olha dentro de objetos aninhados.
   - O que é incerto: se o planner vai tratar isso como bloqueante (Rule/pitfall de segurança, ASVS V5) ou como refinamento posterior.
   - Recomendação: tratar como bloqueante nesta fase (Pitfall 5) — é a MESMA defesa em profundidade que já rege todo o resto do Caderno desde a Fase 16 (CR-01), inconsistente deixar só o campo novo sem essa camada.

2. **Bump de `CADERNO_VERSION` — pular ou manter por rastreabilidade histórica?**
   - O que sabemos: tecnicamente não é necessário (ver seção dedicada).
   - O que é incerto: preferência do planner/projeto por manter o número de versão sincronizado com "toda fase que muda o shape do item" como convenção de documentação, mesmo sem necessidade técnica.
   - Recomendação: decisão de estilo, não de correção — qualquer uma das duas opções funciona; documentar a escolha no PLAN para quem ler o código depois não ficar confuso com o comentário obsoleto da linha 3308.

3. **`MOINHO DOS VENTOS` e outros nomes sem match óbvio — vale uma pequena tabela de sinônimos manual (não fuzzy) para aumentar recall além dos 74%?**
   - O que sabemos: alguns nomes sem match parecem ser variações de escrita legítimas (não sub-loteamentos), não erros de dado.
   - O que é incerto: se vale o esforço de uma tabela de exceções mantida a mão (baixo volume, ~10-15 nomes) vs. aceitar 74% como suficiente para o objetivo comercial da feature.
   - Recomendação: aceitar 74% nesta fase (é um "diferenciador de médio impacto, esforço baixo" per `TERRITORIO.md` §1.6, não vale investir em tabela de sinônimos manual agora) — registrar como melhoria futura se o feedback de campo pedir.

## Sources

### Primary (HIGH confidence — leitura direta do código-fonte em produção)
- `radar-goiania.html` — `showDetail` (4540), `loadCi` (2917), `CADERNO_ALLOW`/`sanitizeCaderno`/`validarImportCaderno` (2367-2413), `CADERNO_IO` completo (3270-3409), `renderCadernoBtn`/`salvarNoCadernoUI` (4740-4792), `renderCadernoBlock` (4912-4984), `caixaPopup`/`toggleCaixa`/`initCaixa` (6085-6132), `norm`/`toWGS`/`brl`/`venalTxt` (1289-1330), `carregarLookupCdbairro`/`resolveCdbairroDeLayer` (2572-2591), `#terrPanel`/`montarPainel` (1108-1152, 3466-3535), `#pinoLegenda` (1039-1048), `#dLeitura`/`#dActsPrim`/`#dDiff` insertion point (1080-1082)
- `caixa-goiania.js` — inspeção direta (via Grep, já que execução Node sobre o arquivo foi bloqueada por um filtro de segurança do ambiente de execução; validação empírica feita via script Python fora do bash sandboxed) — 178 imóveis, campos `id/b/e/p/a/d/t/m/u/cb/x/y/pr`, `CAIXA.fatores={}`
- `bairros-goiania.json` / `bairro-cdbairro.json` — inspeção direta de estrutura + script Python de join/match empírico (executado nesta sessão)
- `gerar-bairros.py` (linhas 309-321) — tabela `PFX_PT` de expansão de prefixo (build-time, Python, não runtime)
- `tests/caderno.test.mjs`, `tests/fixtures.mjs`, `package.json` — padrão de harness TDD (`node --test`, slice `RADAR_PURE_START`/`_END` via `node:vm`)
- `npm test` rodado nesta sessão: 141/141 verde (baseline pré-Fase 17)

### Secondary (MEDIUM confidence)
- `.planning/research/v2.1/TERRITORIO.md` §1.5-1.6 — pesquisa anterior (2026-07-04) que já apontava IndexedDB obrigatório e cruzamento por `cdbairro`/point-in-polygon como opções; esta pesquisa CONFIRMA e detalha com dado real (a pesquisa anterior não tinha inspecionado `CAIXA.imoveis[i].b` como texto livre nem validado taxa de match)
- `.planning/phases/16-detector-subutilizado-farming-caderno/16-02-SUMMARY.md` — confirma shape do item salvo e decisões da Fase 16 diretamente consumidas aqui

### Tertiary (LOW confidence)
- Nenhuma — toda claim desta pesquisa foi verificada por leitura direta de código ou execução de script sobre dado real; não houve necessidade de WebSearch (fase é 100% codebase survey, zero lib/API externa nova)

## Metadata

**Confidence breakdown:**
- Anchors de código (showDetail/CADERNO_IO/CAIXA): ALTA — leitura direta de código em produção, linhas citadas
- Taxa de match de bairro (74%): ALTA — medida empiricamente sobre o dataset real completo (178/178 itens), não uma amostra
- Recomendação de pular bump de `CADERNO_VERSION`: ALTA — comportamento padrão bem estabelecido da IndexedDB (schemaless value store), mas é uma RECOMENDAÇÃO técnica, não uma obrigação — decisão final do planner
- Extrapolação para safras futuras do `caixa-goiania.js` (A2/A3 do Assumptions Log): MÉDIA — depende de como o dado é atualizado no futuro, fora do controle desta fase

**Research date:** 2026-07-09
**Valid until:** ~30 dias (nenhuma dependência externa volátil; o único dado que pode mudar é a safra de `caixa-goiania.js`, atualizada manualmente — a LÓGICA de matching não expira, só a taxa de cobertura percebida pode variar)
