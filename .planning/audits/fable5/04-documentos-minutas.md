# Auditoria Fable 5 — Área 04: Documentos & Minutas Jurídicas

- **Área:** 04 — Documentos & minutas jurídicas (ficha rápida / relatório / laudo-PTAM / proposta / termo de exclusividade / contrato)
- **Arquivo auditado:** `radar-goiania.html` (SOMENTE-LEITURA — nenhum arquivo modificado)
- **Data:** 2026-07-10
- **Auditor:** Fable 5
- **Baseline de testes:** `npm test` = **252/252 pass** (confirmado antes e independente da auditoria)
- **Método:** leitura de `montarLaudo`/`montarFichaRapida`/`montarNeg` + 3 templates puros + `numeroPorExtenso`/`extensoInteiro`/`parseMatricula`; execução das funções puras via Node com dados de borda (valores/datas/nomes/matrículas atípicos); leitura da estrutura A4/print e do pipeline `#laudo→#laudoView`.

> Já conhecidos e **não** re-reportados: C-06 (testemunhas), C-08 (montarNeg sem teste), C-10 (extenso ≥1 bilhão vazio), C-11 ("de reais" com centavos), C-12 (comentário ITBI estale), C-14 (montarNeg linha corrida). As variantes novas abaixo tocam áreas vizinhas mas têm causa-raiz e cenário distintos.

---

## Achados

### [DOC-01] radar-goiania.html:2014-2019 | MÉDIA | Conector "e" super-inserido entre blocos de escala no extenso (gramática pt-BR incorreta)

**Descrição:** `extensoInteiro` só aplica tratamento especial do conector "e" quando o último bloco (`resto`) é `<100` (linha 2015). Em todos os demais casos cai em `blocos.join(" e ")` (linha 2019), que insere "e" entre **todos** os blocos de escala — inclusive quando a regra pt-BR **proíbe** o "e" (grupo final ≥100 que não seja centena exata, e junção milhão↔mil). A regra correta: usa-se "e" antes do último grupo somente se ele for `<100` **ou** múltiplo exato de 100; nunca entre milhão e milhar.

**Cenário (executado via Node, valores reais de imóvel):**
- `285750` → "...mil **e** setecentos e cinquenta reais" (correto: "...mil setecentos e cinquenta").
- `1234` → "mil **e** duzentos e trinta e quatro" (correto: "mil duzentos e trinta e quatro").
- `1234567` → "um milhão **e** duzentos e trinta e quatro mil **e** quinhentos e sessenta e sete" (correto: "um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete" — dois "e" espúrios).
- `2340000` → "dois milhões **e** trezentos e quarenta mil" (correto: "dois milhões trezentos e quarenta mil").

Casos de centena exata (`285500`→"...mil e quinhentos") e `<100` continuam corretos — o defeito atinge a maioria das faixas de preço de imóvel (qualquer valor cujos 3 últimos dígitos sejam 101-999 e não múltiplo de 100, e toda junção milhão↔milhar). **Não** coberto por teste: a fixture `decimalGrande` (1234567.89) só assere o numeral `R$ 1.234.567,89`, nunca a string de extenso.

**Impacto:** o extenso incorreto entra no **CONTRATO de compra e venda** (título executivo, Cláusula 3ª) e na Proposta — para uso por advogado, extenso mal formado é defeito de qualidade formal.

**Proposta:** inserir "e" apenas antes do grupo final quando `resto<100` **ou** `resto%100===0`; caso contrário juntar os blocos com espaço. Nunca inserir "e" entre milhão e milhar. Adicionar fixtures assertando o extenso literal de 1234 / 285750 / 1234567.

---

### [DOC-02] radar-goiania.html:2033-2034 | MÉDIA | Numeral (arredondado) diverge do extenso (truncado) — `Math.floor` vs `toLocaleString`

**Descrição:** `numeroPorExtenso` calcula o extenso sobre `inteiro=Math.floor(n)` (linha 2033, **trunca**) mas formata o numeral com `n.toLocaleString(...,{maximumFractionDigits:2})` (linha 2034, **arredonda** meio-para-cima a 2 casas). Quando a parte fracionária ≥ .995, o numeral arredonda o inteiro para cima enquanto o extenso permanece no inteiro truncado → **numeral e extenso divergem** dentro do mesmo documento.

**Cenário (executado via Node):**
- `999.995` → "**R$ 1.000,00** (**novecentos e noventa e nove** reais)" — numeral diz mil, extenso diz 999.
- `1000000.999` → "**R$ 1.000.001,00** (um milhão **de reais**)" — numeral diz 1.000.001, extenso diz "um milhão de reais" (afirma milhão exato). Combina divergência + "de reais" indevido.
- `1234.999` → "R$ 1.235,00 (mil e duzentos e trinta e quatro reais)".

**Impacto:** no CONTRATO, divergência preço-numeral × preço-extenso é ambiguidade juridicamente relevante (em regra prevalece o extenso). Gatilho: valor com 3+ casas decimais chegando à função pura (ex.: preço calculado/colado, não digitado com 2 casas). `numeroPorExtenso` é função pura exportada sem guarda de domínio de entrada, então o defeito é latente independentemente da UI atual.

**Proposta:** derivar o numeral e o extenso da **mesma** base inteira — ex.: `const centavos=Math.round(n*100); const inteiro=Math.floor(centavos/100);` e formatar o numeral a partir de `centavos` — garantindo que numeral e extenso nunca se refiram a inteiros diferentes.

---

### [DOC-03] radar-goiania.html:2058 | BAIXA | `parseMatricula` não extrai proprietário no formato canônico ("Proprietário:" com maiúscula) — regex sem flag `/i`

**Descrição:** os regex de matrícula (linha 2051) e cartório (2055-2056) têm flag `/i`, mas o regex de proprietário (linha 2058) **não** tem: `/propriet[áa]rio[:\s]+([A-ZÀ-Ú][a-zà-ú]+...)/`. Assim o rótulo precisa estar em minúsculas ("proprietário:") para casar. A forma canônica de documentos brasileiros — "Proprietário:" (P maiúsculo) ou "PROPRIETÁRIO:" (tudo maiúsculo) — **nunca** casa, mesmo com o nome perfeitamente em Title Case.

**Cenário (executado via Node):**
- `"Proprietário: Maria Fernandes"` → `proprietario: null` (rótulo maiúsculo).
- `"proprietário: Maria Fernandes"` → `"Maria Fernandes"` (só a forma minúscula funciona).
- Adicionalmente, nomes com conectores minúsculos ("João da Silva") ou tudo-maiúsculo ("JOÃO DA SILVA") também falham pelo próprio padrão do grupo capturado.

Vai além do "best-effort, frequentemente ausente" documentado: a causa-raiz é a flag ausente, que reprova até o caso ideal para o qual o grupo capturado foi desenhado.

**Impacto:** BAIXO na prática — `negExtrair` (linhas 6778-6779) só consome `res.matricula` e `res.cartorio`; `res.proprietario` **nunca é usado** no fluxo. Ou seja, é código morto latente (bug real que hoje não chega ao usuário). Vale corrigir ou remover para não induzir uso futuro.

**Proposta:** adicionar `i` ao regex de `mProp` e ampliar o grupo para aceitar nomes tudo-maiúsculo / conectores minúsculos; **ou**, se proprietário permanecer intencionalmente não consumido, remover a extração para evitar campo morto.

---

### [DOC-04] radar-goiania.html:2104,2140,2141 | BAIXA | Concordância de número: "1 dias" / "1%" / "1 dias" sem singular

**Descrição:** validade da proposta (`d.validadeDias+" dias"`, linha 2104), prazo do termo (`d.prazoDias+" dias"`, linha 2140) e comissão (`d.comissaoPct+"%"`, linha 2141) concatenam sempre o sufixo plural/fixo. Com valor `1`, o texto sai "1 dias" (deveria "1 dia"). É concordância, não cálculo — cosmético, mas visível em documento assinado por advogado.

**Cenário:** `validadeDias:1` → "prazo de 1 dias"; `prazoDias:1` → "1 dias".

**Impacto:** baixo (defeito de estilo/concordância; valores default são 10/90 dias, plural correto). Só aparece se o usuário digitar 1.

**Proposta:** pluralização condicional (`d===1?"dia":"dias"`). `%` não precisa flexão.

---

## Resumo

| ID | Sev | Área | Novo? |
|----|-----|------|-------|
| DOC-01 | Média | extenso — conector "e" entre escalas | Sim (distinto de C-10/C-11) |
| DOC-02 | Média | numeral↔extenso divergem (floor vs round) | Sim (variante de causa nova de C-11) |
| DOC-03 | Baixa | parseMatricula proprietário sem `/i` (+ campo morto) | Sim |
| DOC-04 | Baixa | concordância "1 dias"/"1 dia" | Sim |

Nada encontrado que quebre a estrutura A4/print, os blocos de assinatura/testemunhas (CPC 784, III presentes no contrato e no termo; ausentes na proposta — correto), ou o pipeline `#laudo→#laudoView`. Os defeitos concentram-se em **corretude formal/gramatical do texto por extenso** e em **consistência numeral↔extenso** — ambos relevantes para o CONTRATO como título executivo.
