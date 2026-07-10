# Auditoria Fable 5 — Área 06: Detector, Caderno (IndexedDB), Diff & Cruzamento Caixa

- **Área:** 06 — `detectarSubutilizados`/medianas/razão/detector-PD, `CADERNO_IO` (IndexedDB), Caderno UI/filtros/import-export, `diffLote`/`formatarDiff`/snapshot, cruzamento Caixa (nome→cdbairro, badge/anel/popup)
- **Arquivo:** `radar-goiania.html` (linha única, ~7640 linhas)
- **Data:** 2026-07-10
- **Auditor:** Fable 5 (somente-leitura; sem análise de segurança/PII — foco em CORREÇÃO)
- **Baseline:** `npm test` = **252/252 passam** (confirmado nesta auditoria)
- **Método:** leitura + execução das funções puras via `node:vm` sobre o bloco `RADAR_PURE` (linhas 1441–2997), com dados de borda. Harness em scratchpad (não versionado).

> **Já conhecidos, NÃO re-reportados:** filtro do caderno string×number no `cadernoListar` (corrigido A-02); 📓 `aria-pressed` sem toggle; filtro do caderno mostra código cru.

---

## Resumo dos achados

| ID | Sev | Título |
|----|-----|--------|
| CAD-01 | **ALTA** | Cruzamento Caixa (badge + anel + popup) some silenciosamente quando `cdbairro` do caderno é string |
| CAD-02 | **MÉDIA** | `diffLote` gera falso alarme em `uso`/`dtinclusao` quando snapshot e ficha diferem só no TIPO (número×string) |
| CAD-03 | BAIXA | `criterioDetectorPD` coage `areaedif` nulo→razão 0 ("terreno vago"), violando a distinção 0-vs-null documentada em `razaoOcupacao` |
| CAD-04 | BAIXA | `renderDiffUI` sobrescreve o snapshot a CADA abertura da ficha — o diff é mostrado 1x e "esquecido", nunca acumula desde o save |
| CAD-05 | BAIXA | `diffLote` engole a transição venal/IPTU 0→valor (assimetria com o `subtipo:"nova"` de `areaedif`) |

---

## CAD-01 | `radar-goiania.html:2747-2755` (e 2759-2762, 7404-7413, 7377-7388) | **ALTA** | Cruzamento Caixa some quando `cdbairro` do caderno foi salvo como string

**Descrição.** `cruzarCaixaTerritorio` e `cruzarCaixaSetor` comparam o `cdbairro` dos itens do
caderno contra os `cdbairro` resolvidos por `cdbairroDoImovelCaixa`:

```js
const cdbairrosSalvos=new Set((itensCaderno||[]).map(it=>it&&it.cdbairro).filter(v=>v!=null));
...
const cds=cdbairroDoImovelCaixa(i,nomeParaCdbairro).filter(cd=>cdbairrosSalvos.has(cd));
```

`cdbairroDoImovelCaixa` devolve os `cd` que vêm de `idParaCdbairro` (populado em
`carregarLookupCdbairro`, linha 3168, com `v.cd` do `bairro-cdbairro.json` — que é sempre **número**,
ex.: `{"cd":956}`). Já `it.cdbairro` do caderno é gravado **cru** (`cdbairro:a.cdbairro` em
`salvarNoCadernoUI`/`salvarDetectorNoCadernoUI`, e **preservado como string em imports** —
`sanitizeCaderno` não normaliza tipo). `Set.has()` usa igualdade estrita: `has(956)` num Set que
contém `"956"` → **false**. Resultado: o badge "🏦 N imóveis Caixa no seu território" nunca aparece,
o **anel** no pino (`garantirCaixaLayer`, 7407) some, e a linha do popup "📓 Este imóvel está no seu
território salvo" (`caixaPopup`, 7381) fica falsa — tudo silenciosamente, sem erro.

Este é **o mesmo defeito da família string×number que motivou o fix A-02** no `cadernoListar`
(getAll + `String()`), mas em **outra superfície** — o cruzamento Caixa nunca recebeu a mesma
normalização.

**Cenário (provado via `node:vm`).** `bairro-cdbairro.json` → `cd:956` (número). Caderno com
`cdbairro:"956"` (string, exatamente o que `validarImportCaderno` preserva):

```
nomeMap SETOR BUENO -> [ 956 ] type: number
saved cdbairro="956" (string) -> matches n = 0   ← BUG (deveria ser 1)
saved cdbairro=956  (number) -> matches n = 1
cruzarCaixaSetor(..,"956"..) len = 0  ← idem
```

E `validarImportCaderno([{ci:'Z1',cdbairro:'956',...}])` → `typeof itens[0].cdbairro === "string"`.
O gatilho realista é o **fluxo de farming multi-dispositivo** (exportar no celular → importar no
desktop), justamente a feature central da Fase 17. O comentário do fix A-02 já afirma que itens
existem no store "gravados como string OU number".

**Proposta.** Normalizar a chave nas duas pontas do cruzamento, do mesmo modo que A-02 fez no
`cadernoListar`: construir `cdbairrosSalvos` com `String(it.cdbairro)` e comparar
`cdbairroDoImovelCaixa(...).map(String)` — ou coagir `it.cdbairro` a número em `sanitizeCaderno`
(fonte única). Aplicar aos 3 pontos: `cruzarCaixaTerritorio`, `cruzarCaixaSetor` e o cálculo de
`noTerr` em `garantirCaixaLayer` (7407).

---

## CAD-02 | `radar-goiania.html:2663-2666` | **MÉDIA** | `diffLote` inventa mudança em `uso`/`dtinclusao` quando muda só o tipo (número×string)

**Descrição.** Os campos categóricos do diff usam desigualdade estrita crua:

```js
const de1=s.uso, para1=a.uso;
if(de1!=null&&para1!=null&&de1!==para1)out.push({campo:"uso",tipo:"categorico",de:de1,para:para1});
const de2=s.dtinclusao, para2=a.dtinclusao;
if(de2!=null&&para2!=null&&de2!==para2)out.push({campo:"dtinclusao",tipo:"categorico"});
```

Os campos **numéricos** (`vlvenal`, `vlimp98`, `areaedif`) são imunes porque passam por aritmética
(coerção implícita). Mas `uso` e `dtinclusao` comparam o valor **cru do snapshot** contra o **valor
cru da ficha**. Se um lado é número (`1`, `20240101`) e o outro é string (`"1"`, `"20240101"`), o
`!==` dá **falso positivo** e o diff exibe uma frase absurda ao corretor. O snapshot pode ter tipo
diferente da ficha via **import** (`sanitizeCaderno` preserva o tipo do JSON) ou por drift de tipo
do endpoint entre duas consultas.

**Cenário (provado via `node:vm`).**

```
diffLote({uso:1, dtinclusao:20240101}, {uso:"1", dtinclusao:"20240101"})
→ [{campo:"uso",tipo:"categorico",de:1,para:"1"},{campo:"dtinclusao",tipo:"categorico"}]
formatarDiff(...) → ["Uso mudou de Residencial para Residencial",
                     "Data de cadastro atualizada"]
```

"Uso mudou de Residencial para Residencial" é um alarme visivelmente falso. `diffLote({uso:1},{uso:1})`
e `({uso:"1"},{uso:"1"})` corretamente devolvem `[]`.

**Proposta.** Comparar categóricos de forma tipo-insensível: `String(de1)!==String(para1)` (e idem
`dtinclusao`), ou normalizar tipos no snapshot ao gravar. `dtinclusao` já tem validação de formato
em `anoMedianoCadastro`/`fmtDt` (`/^\d{8}$/`) que pode ser reusada como normalização canônica.

---

## CAD-03 | `radar-goiania.html:2801-2807` | BAIXA | `criterioDetectorPD` trata `areaedif` nulo como razão 0 ("terreno vago"), contra a regra 0-vs-null de `razaoOcupacao`

**Descrição.** `razaoOcupacao` (2500-2506) documenta e implementa explicitamente a distinção
"0 real (terreno vago) ≠ null/ausente (dado incompleto)" (Pitfall 1, 16-RESEARCH), retornando
`null` quando `areaedif==null`. Já `criterioDetectorPD` faz `const ae=+areaedif; if(!(ae>=0))return null;`
— e `+null === 0`, que passa `0>=0`, então `areaedif` **nulo** vira `ae=0` e produz
`{razao:0, criterio:"terreno"}` (idêntico a um terreno vago legítimo). Há ainda assimetria interna:
`null`→0 (aceito), mas `undefined`→`NaN` (rejeitado, `null`). As duas guardas do mesmo domínio
discordam sobre "área construída ausente".

**Cenário (provado via `node:vm`).**

```
criterioDetectorPD(null, 100, 0)      → {razao:0, criterio:"terreno"}   ← trata como vago
criterioDetectorPD(undefined, 100, 0) → null
criterioDetectorPD("", 100, 0)        → {razao:0, criterio:"terreno"}
razaoOcupacao({areaedif:null, areaterr:100}) → null   ← guarda oposta (correta)
```

**Impacto atual: latente.** `detectorRotuloPD` só é chamado sobre candidatos que já passaram por
`detectarSubutilizados`, que usa `razaoOcupacao` e **exclui** `areaedif` nulo. Então nenhum candidato
com `areaedif` nulo chega a `criterioDetectorPD` hoje. É inconsistência de contrato/robustez, não
um bug visível — mas viola a invariante que o próprio código declara como crítica e vira bug real
se `criterioDetectorPD` for reusado fora do fluxo do detector.

**Proposta.** Alinhar a guarda: rejeitar `areaedif==null` explicitamente (`if(areaedif==null)return null;`)
antes do `+`, para `null` e `undefined` terem o mesmo tratamento e coincidirem com `razaoOcupacao`.

---

## CAD-04 | `radar-goiania.html:5855-5901` | BAIXA | `renderDiffUI` sobrescreve o snapshot a cada abertura da ficha — diff mostrado 1x e depois "esquecido"

**Descrição.** Ao final de todo render com diff, `renderDiffUI` grava um snapshot NOVO com os dados
frescos (5901). Como `renderDiffUI` roda em **toda abertura de ficha** de um lote salvo (não só numa
"revisita de campo" deliberada), qualquer visualização — inclusive abrir a ficha a partir do
detector, de uma busca, ou por engano — avança a linha de base. Sequência: 1ª abertura compara
snapshot antigo × fresco, exibe o diff, e grava snapshot=fresco; 2ª abertura no mesmo dia compara
fresco × fresco → "Sem mudanças". O corretor vê a mudança **uma única vez** e nunca mais; não existe
registro de "desde que salvei", só "desde a última vez que abri".

**Cenário.** Lote salvo em janeiro (venal X). Em julho o venal sobe para Y. O corretor abre a ficha
uma vez (vê "Valor venal subiu"); reabre para conferir → "Sem mudanças no cadastro desde a última
visita". A informação comercial mais importante desapareceu por causa de uma segunda abertura trivial.

**Impacto.** É coerente com a intenção documentada ("diff desde a última visita"), por isso BAIXA —
mas o efeito de "visualizar = consumir/destruir o diff" é surpreendente e pode fazer o corretor
perder um sinal de valorização. Vale uma decisão explícita.

**Proposta.** Considerar preservar um `snapshotBase`/`snapshotAt` do 1º save separado do "último
visto", ou só atualizar o snapshot quando o usuário registra explicitamente uma visita (status/nota),
não em toda leitura da ficha.

---

## CAD-05 | `radar-goiania.html:2642-2648` | BAIXA | `diffLote` engole a transição venal/IPTU de 0→valor (assimetria com `areaedif` "nova")

**Descrição.** O guard de percentual descarta qualquer base zero:

```js
if(de==null||para==null||!isFinite(de)||!isFinite(para)||+de===0)return;
```

Um lote cujo `vlvenal`/`vlimp98` sai de **0** (não avaliado) para um valor positivo (recém-avaliado)
não gera **nenhuma** linha de diff, porque `%` a partir de 0 é indefinido e o guard retorna cedo. Já
`areaedif` trata explicitamente esse caso com `subtipo:"nova"` (`+de===0 && para>0`, 2655). Então o
diff sinaliza "construção nova" mas silencia o evento comercial equivalente e mais forte no valor
(imóvel entrou na base de avaliação) — uma assimetria de cobertura entre campos do mesmo diff.

**Cenário.** Snapshot `{vlvenal:0}`, ficha fresca `{vlvenal:250000}` → `diffLote` devolve `[]` para o
venal (nenhum aviso), enquanto `{areaedif:0}`→`{areaedif:120}` devolveria `subtipo:"nova"`.

**Impacto.** Honesto (não dá para calcular %), por isso BAIXA — mas é um sinal de negócio perdido.

**Proposta.** Emitir um `subtipo`/tipo dedicado para venal/IPTU quando `de===0 && para>0` (ex.:
"passou a ter valor venal de R$ X"), análogo ao `"nova"` de área, em vez de descartar silenciosamente.

---

## Superfícies checadas e consideradas corretas (sem achado)

- **`mergeCadernoImport`** — empate/local-mais-novo mantêm o local; item sem timestamp (`""`) nunca
  sobrescreve local com data (`"" > "2026-06-01..."` = false); ci inédito é persistido. Provado OK.
- **`medianasPorQuadra`/`limiarQuadraValorizada`/`detectarSubutilizados`** — guarda de amostra <4
  quadras → `[]`; quadra sem pm2 válido some; `razaoOcupacao` null exclui candidato. Coerente com
  os 252 testes.
- **Chave de quadra do detector-PD** — `consultarPDPorQuadra` (4089) e `detectorRotuloPD` (2955) usam
  a MESMA fórmula `clean(cdbairro)+"-"+clean(nrquadra)`; sem mismatch de chave.
- **`construirNomeParaCdbairro`** — colisão de nome normalizado guarda ambos os `cd` num `Set`
  (`JARDIM AMERICA → [10,20]`); nome ausente → `[]`. Sem falso positivo/negativo de matching.
- **`caixaPopup`** — HTML íntegro (`</div>`/`</span>` corretos; um artefato de exibição do grep
  sugeria `<\div>`, mas a fonte está correta).
- **Camada `CADERNO_IO`** — cada operação fecha `db.close()` em `oncomplete`/`onerror`; `onblocked`
  tratado; nenhuma engole erro. Não testável em `node:vm` (I/O real), revisado por leitura.
