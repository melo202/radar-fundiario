# Auditoria Fable 5 — Área 02: Ficha Comercial & Scores

- **Área:** 02 — Ficha Comercial & Scores (`showDetail`, `dadosFicha`, `renderScoresInto`, `scoreOportunidade`/`scoreConfianca`/`leituraPratica`, `atualizarScores`/`compare`/`renderComps`, ⭐ salvar/histórico)
- **Arquivo:** `radar-goiania.html` (~7.500 linhas)
- **Data:** 2026-07-10
- **Auditor:** Fable 5 (somente-leitura; sem análise de segurança)
- **Baseline:** 252 testes (não reexecutados; funções puras exercitadas via node:vm)

---

## Sumário

6 achados. O mais grave (FICHA-01) é de **correção do score**: distribuições homogêneas/degeneradas fazem um imóvel exatamente na mediana ser rotulado "Boa oportunidade 100/100". FICHA-02 é uma lacuna de **honestidade estrutural**: `scoreConfianca` mede apenas completude de dado e ignora a dispersão de preços, podendo exibir "Confiança: alta" sobre uma vizinhança "muito variada" (faixa não confiável). Os demais são inconsistências de UX/§26 e de estado transitório do painel.

Confirmado como **sólido** (não são achados): faixa de valor nunca é número seco (sempre `lo–hi` ou "Sem base para estimar"); `venal 0`/`área 0` → `myPm2` null → `op` null → "Sem base para estimar" + leitura "Dados insuficientes" (honesto); guards `DCUR!==a` presentes nos 3 pontos assíncronos (`compare`, `renderComps`, `atualizarScores`) — sem race de painel alheio; allowlist de 12 campos em `oportunidadeItem` intacta.

---

## Achados

### [FICHA-01] radar-goiania.html:1642-1648 | MÉDIA | Distribuição homogênea/degenerada rotula imóvel na mediana como "Boa oportunidade 100/100"

**Descrição.** Em `scoreOportunidade`, quando a vizinhança é (quase) homogênea — `min ≈ q1 ≈ med ≈ q3 ≈ max` — o primeiro ramo `if(myPm2<=min) pct=0` dispara para qualquer imóvel cujo R$/m² seja igual ou inferior a esse valor único, retornando `score=100`. O segundo ramo `if(myPm2>=max) pct=100` retorna `score=0` para qualquer valor acima. O score fica **bimodal (só 100 ou 0)**, sem gradiente, e um imóvel **exatamente na mediana** (`diffPct=0`) é rotulado "Boa oportunidade" máxima.

**Cenário (provado via node:vm).**
```
scoreOportunidade(100, {q1:100,med:100,q3:100,n:10,min:100,max:100})
=> {score:100, rotulo:"Boa oportunidade",
    porque:["Está 0% abaixo da mediana da vizinhança (comparáveis em até 400 m)."]}
scoreOportunidade(110, {q1:100,med:100,q3:100,n:10,min:100,max:100})
=> {score:0, rotulo:"Oportunidade baixa", ...}
```
Isto é plausível na prática: condomínio pequeno onde 3+ unidades comparáveis têm venal/área idênticos (mesma planta). `compsStats` no caminho exato monta `min=vals[0]/max=vals[last]`; com valores iguais `iqr=0`, o filtro de Tukey (n≥8) mantém tudo → `min=max=med`. Pior: pode coincidir com `scoreConfianca="alta"` (n≥8, sem pendência), gerando um sinal confiante e errado. Um imóvel no preço médio da região **não é** "Boa oportunidade" — é média.

**Proposta.** Tratar o caso degenerado antes das âncoras: se `iqr<=0` (ou `max-min` abaixo de um epsilon), não classificar por percentil — retornar banda "média"/"na mediana" (ou `null` com "vizinhança sem dispersão para posicionar preço"). Alternativamente, usar `myPm2<min`/`myPm2>max` (estrito) e mandar o valor exatamente igual à âncora para a interpolação central.

---

### [FICHA-02] radar-goiania.html:1674-1696, 6509 | MÉDIA | "Confiança" mede só completude e ignora dispersão — pode exibir "Confiança: alta" sobre vizinhança "muito variada"

**Descrição.** `scoreConfianca` deriva o nível (alta/média/baixa) **exclusivamente** de completude de dado (área, venal, atípico, nº de comparáveis). Nunca olha a dispersão dos preços. Já `renderComps` (linha 6509) calcula um badge de qualidade da faixa a partir da amplitude `amp=(q3-q1)/med`: `>0.4` → "imóveis muito variados"/"baixa". As duas medidas convivem na MESMA ficha e podem se contradizer: com `n≥8`, área+venal ok e `amp>0.4`, o botão de score exibe **"Confiança: alta"** enquanto a estatística logo abaixo diz **"imóveis muito variados"**. Para o corretor leigo, "confiança alta" sugere que a faixa é confiável — mas ela pode ser muito dispersa (não confiável). `leituraPratica` agrava: só adiciona a ressalva "se área/conservação forem confirmadas" quando `confianca.nivel==="baixa"`, então uma vizinhança dispersa com "Confiança: alta" gera leitura sem nenhum caveat.

**Cenário.** Vizinhança com 10 comparáveis, dados completos, R$/m² variando de 3.000 a 12.000 (amp alta): score "Confiança: alta" + badge "imóveis muito variados" + leitura afirmativa sem ressalva.

**Proposta.** Ou rebaixar `scoreConfianca` quando a dispersão for alta (passar `amp`/badge para dentro do cálculo do nível), ou renomear os rótulos para não colidirem semanticamente ("Confiança: alta" → "Dados: completos"), deixando explícito que uma coisa é completude e outra é dispersão. Alinhar com §26 (um mesmo termo — "confiança" — não deve ter dois significados na mesma tela).

---

### [FICHA-03] radar-goiania.html:1657-1659, 1650 | BAIXA-MÉDIA | "Está 0% abaixo da mediana" no porquê do score contradiz "Na mediana" dos comparáveis (e o comentário do código)

**Descrição.** Na banda média, o porquê do `scoreOportunidade` interpola `Está ${diffPct}% abaixo da mediana`; com `myPm2===med`, `diffPct=0` → texto literal **"Está 0% abaixo da mediana da vizinhança."** (provado via node:vm, caso A). No mesmo imóvel, `renderComps` (linha 6517) tem ramo explícito `diffPct===0` → **"Na mediana da vizinhança — alinhado à região."** As duas superfícies da mesma ficha (#dScores "por quê" vs. conclusão dos comparáveis) descrevem o mesmo fato com frases divergentes. O comentário na linha 1650 afirma *"diffPct=0 vira 'na mediana' na frase de qualquer forma"* — **falso** para `scoreOportunidade.porque`; esse tratamento só existe em `renderComps`.

**Cenário.** Imóvel no exato R$/m² mediano: #dScores exibe "Está 0% abaixo da mediana"; a estatística logo abaixo exibe "Na mediana". Comentário do código induz a leitura errada de quem mantém o arquivo.

**Proposta.** No ramo médio de `scoreOportunidade`, tratar `diffPct===0` como "Alinhado à mediana da vizinhança." (paridade com `renderComps`) e corrigir o comentário da linha 1650.

---

### [FICHA-04] radar-goiania.html:5640, 5526-5548 | BAIXA-MÉDIA | Toda ficha nasce "Confiança: baixa — poucos comparáveis (0)" antes de o usuário pedir comparáveis

**Descrição.** `showDetail` sempre chama `scoreConfianca({...,nComps:0})` (linha 5640) e `compare()` NÃO roda automaticamente na primeira abertura (só quando `mesmaAnalise`). Resultado: qualquer imóvel — mesmo com área e venal completos — abre exibindo **"Confiança: baixa"** com o porquê **"poucos comparáveis na vizinhança (0)."** (provado via node:vm, caso F). O texto "(0)" lê-se como um defeito do imóvel ("a vizinhança tem poucos comparáveis"), quando na verdade os comparáveis simplesmente ainda não foram consultados. O nível só sobe após o usuário tocar "Ver comparáveis" e `atualizarScores` recalcular.

**Cenário.** Corretor abre uma ficha de apto premium com dados completos; vê "Confiança: baixa · poucos comparáveis (0)" e conclui, erroneamente, que o dado do imóvel é fraco.

**Proposta.** Estado pré-consulta deveria ser neutro, não "baixa": distinguir "ainda não consultei a vizinhança" (ex.: "Confiança: a calcular — toque em Ver comparáveis") de "consultei e há poucos comparáveis". Só contar `nComps` como pendência depois de `compare()` ter rodado.

---

### [FICHA-05] radar-goiania.html:5668, 6328, 5778-5786 | BAIXA | Rótulo de oportunidade salvo em ⭐/Histórico depende de timing (só existe se o usuário expandiu os comparáveis)

**Descrição.** `histPush(a)` é chamado dentro de `showDetail` logo após `DCUR=a` (linha 5668), **antes** de `compare()` concluir. Ele lê `oppExtras(a)` → `a.__scores`, que nesse instante é `{op:null, conf}` (setado na linha 5642). Logo, **todo** item de histórico grava `scoreOportunidade:null` e a linha "oportunidade: …" (renderSavedBlocks, 6079) nunca aparece para visitas auto-registradas. Para ⭐ Oportunidades salvas (`toggleOportunidade`), o rótulo só é capturado se o usuário tocou "Ver comparáveis" **antes** de salvar; caso contrário grava `null`. O campo persistido reflete um estado transitório da UI, não uma propriedade do imóvel.

**Cenário.** Usuário A salva a oportunidade logo ao abrir a ficha → item sem "oportunidade: …". Usuário B abre, expande comparáveis, depois salva o MESMO imóvel → item com "oportunidade: Boa oportunidade". Mesma casa, metadados salvos diferentes.

**Nota de honestidade (atenuante).** O comportamento **omite** (grava `null` → linha escondida) em vez de inventar rótulo — portanto não mente. Mas é inconsistente e o histórico nunca mostra o rótulo.

**Proposta.** Ou remover `scoreOportunidade` do item de histórico (já que é sempre null lá), ou disparar o cálculo do score antes de persistir, ou rotular explicitamente "oportunidade ainda não calculada" para não parecer omissão arbitrária.

---

### [FICHA-06] radar-goiania.html:1636 | BAIXA | `scoreOportunidade` não garante `q1 ≤ med ≤ q3`; caminho de vizinhança grande (busca binária) pode inverter âncoras

**Descrição.** O guard de entrada valida `q1>0 && med>0 && q3>0 && q3>=q1`, mas **não** exige `q1<=med<=q3`. No caminho de vizinhança grande (`compsStats` inexato, linhas 6487-6496), `q1`, `med` e `q3` vêm de três buscas binárias de contagem **independentes**; em amostras com degraus/empates de contagem, nada impede `med` cair fora de `[q1,q3]` (ex.: `med>q3`). Nesse caso, a cascata de segmentos de `scoreOportunidade` deixa a faixa `(q3,med]` num ramo morto e a interpolação usa âncoras fora de ordem, produzindo um percentil incoerente (score sem significado monotônico).

**Cenário.** Vizinhança > 400 imóveis com forte concentração de preços em degraus; `pct(.5)` retorna valor acima de `pct(.75)`. Score calculado sobre âncoras invertidas.

**Proposta.** Reordenar defensivamente as âncoras antes de usar (`const [lo,mi,hi]=[q1,med,q3].sort((a,b)=>a-b)`), ou adicionar guard `q1<=med && med<=q3` que devolve `null` (sem base) quando violado. Baixo risco na prática (caminho só ativa com vizinhança muito grande), mas é uma premissa não verificada num núcleo determinístico.

---

## Notas fora do corte (não-achados / verificados OK)

- **Faixa de valor** (`mercadoEstimado`/`#dValor`): sempre intervalo `lo–hi` ou "Sem base para estimar"; nunca número seco. OK.
- **Guards de race** (`DCUR!==a`) presentes e corretos em `compare` (6446), `renderComps` (6507) e `atualizarScores` (5584). Reabertura do mesmo imóvel (`mesmaAnalise`, 5665) re-renderiza do cache sem re-fetch. OK.
- **`closeDetail` não zera `DCUR`** (7502): intencional — permite `mesmaAnalise` na reabertura. Sem vazamento de painel. OK.
- **`isGarage`/atípico** rebaixa confiança sem bloquear score de preço — conforme spec (1631). OK.
