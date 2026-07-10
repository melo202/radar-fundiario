# Auditoria Fable 5 — Área 03: Ações, WhatsApp & Captação

- **Área:** 03 — Ações, WhatsApp & Captação (templates RADAR_PURE, `copyZap`/`copyCapt`, `#captSheet`, `oportunidadeItem`/`histAdd`, botões de ação, assinatura condicional)
- **Arquivo:** `radar-goiania.html`
- **Data:** 2026-07-10
- **Auditor:** Fable 5 (somente-leitura)
- **Suíte:** `npm test` → **252/252 pass, 0 fail** (todos os achados abaixo são INVISÍVEIS à suíte)
- **Método:** execução dos templates puros via `node:vm`, alimentados com a saída REAL de `scoreConfianca`/`scoreOportunidade` (não com exemplos fabricados da UI-SPEC) e dados de borda.

---

## Resumo

5 achados. **2 HIGH** de incoerência de conteúdo em mensagens que o corretor copia e envia ao proprietário/cliente: `zapProprietario` e `zapRiscos` interpolam `scoreConf.porque` — que é **uma frase-diagnóstico única já pontuada** ("6 comparáveis na vizinhança.") — como se fosse uma lista de itens a "confirmar". O resultado é texto gramaticalmente quebrado, com ponto no meio da frase e ponto duplicado, no **caminho comum** (qualquer imóvel com 3–7 comparáveis). A revisão fase-a-fase não pegou porque os fixtures usavam `porque` fabricado (ex.: `["área privativa","número de comparáveis"]`), que não corresponde ao formato real produzido por `scoreConfianca` (linhas 1692–1695: `[partes.join("; ")+"."]`).

`zapArgumento` (fecho direcional já corrigido), `assinatura` condicional, `captScript`/`captChecklist`/`captFollowup` (sem assinatura, corretos), `oportunidadeItem` (allowlist) e o fallback de `copyTexto` (execCommand + toast) foram verificados e estão **OK** — não geram achado.

---

## [ZAP-01] radar-goiania.html:1773-1777 | HIGH | `zapProprietario` interpola diagnóstico de confiança como "itens a confirmar" — texto quebrado enviado ao proprietário

**Descrição.** `scoreConfianca().porque` (linhas 1692–1695) sempre retorna **um array de 1 elemento**, cujo conteúdo é as partes unidas por `"; "` **mais um ponto final**. `zapProprietario` faz `d.scoreConf.porque.join("; ")` e injeta na frase `Recomendo confirmar ${...} para uma avaliação mais precisa.` — tratando uma frase-diagnóstico já pontuada como se fossem substantivos a confirmar. Isso produz (a) concordância quebrada ("confirmar" + oração "faltou a área confirmada"/"6 comparáveis na vizinhança"), e (b) o **ponto final do `porque` cai no meio da frase**, seguido de "para" em minúscula.

**Cenário (caminho COMUM — imóvel com 3–7 comparáveis, dados completos).** `scoreConfianca({areaOk:true,nComps:6,venalOk:true})` → `porque = ["6 comparáveis na vizinhança."]`, `nivel:"media"`. Saída real colada:

```
Olá! Encontrei seu imóvel no Setor Bueno no Radar e, pela análise cadastral e comparáveis
da região, a faixa de valor fica entre R$ 450 mil e R$ 520 mil. Recomendo confirmar 6
comparáveis na vizinhança. para uma avaliação mais precisa. Podemos conversar?

— Ana
```

Note "Recomendo confirmar **6 comparáveis na vizinhança. para** uma avaliação" — instrui o proprietário a "confirmar 6 comparáveis", com ponto no meio. Com `nivel:"baixa"` (`areaOk:false,nComps:2`): "Recomendo confirmar faltou a área confirmada; poucos comparáveis na vizinhança (2). para uma avaliação mais precisa." — "confirmar faltou a área".

**Proposta.** Não consumir a string-diagnóstico de `scoreConf.porque` (feita para o painel "por que essa confiança") dentro de uma frase de comando. Ou usar um texto genérico fixo de pendências (como `zapRiscos` já faz no ramo default: "área privativa, estado de conservação, documentação..."), ou expor de `scoreConfianca` uma lista limpa de substantivos a confirmar (sem verbos/pontuação) separada do texto explicativo.

---

## [ZAP-02] radar-goiania.html:1813-1820 | HIGH | `zapRiscos` gera ponto duplicado e lista "dados completos" como ponto a confirmar (sem guard de nível)

**Descrição.** Mesma raiz do ZAP-01, sintomas distintos. `zapRiscos` faz `pontos = d.scoreConf.porque.join("; ")` e monta `Alguns pontos para confirmar antes de avançar: ${pontos}. ` — como `porque` **já termina em ponto**, resulta em **`..` (ponto duplo)**. Além disso, `zapRiscos` **não tem guard de nível** (diferente de `zapProprietario`, que só cita pendências se `nivel!=="alta"`), então dispara mesmo para confiança **alta**, listando a NOTA "dados completos" como um "ponto a confirmar antes de avançar".

**Cenário 1 (comum, media).** `porque=["6 comparáveis na vizinhança."]`. Saída real:

```
Alguns pontos para confirmar antes de avançar: 6 comparáveis na vizinhança.. Esta é uma
faixa estimada, não é uma avaliação oficial — recomendo confirmar esses pontos antes de
qualquer decisão.
```

**Cenário 2 (confiança ALTA — absurdo semântico).** `scoreConfianca({areaOk:true,nComps:10,venalOk:true})` → `porque=["10 comparáveis na vizinhança, dados completos."]`. Saída real:

```
Alguns pontos para confirmar antes de avançar: 10 comparáveis na vizinhança, dados
completos.. Esta é uma faixa estimada, não é uma avaliação oficial — ...
```

Apresenta "dados completos" como pendência a confirmar, com ponto duplo. Contradiz o próprio texto.

**Proposta.** (1) Aparar o ponto final do `porque` antes de reanexar, ou não reanexar `". "`. (2) Adicionar guard: quando `nivel==="alta"` (sem pendências reais), usar o texto genérico default em vez de ecoar a nota. Idealmente resolver junto com ZAP-01 via lista limpa de pendências.

---

## [ZAP-03] radar-goiania.html:1826-1827 | MEDIUM | `captAbordagem` envia placeholder "Q —"/"L —" ao proprietário quando só quadra OU só lote existe

**Descrição.** `const ql=(d.quadra||d.lote)?` (Q ${d.quadra||"—"}, L ${d.lote||"—"})`:"";` — o bloco é incluído se **qualquer um** dos dois existir, mas preenche o ausente com o travessão placeholder `"—"`. Como `captAbordagem` **é a mensagem enviada** ao proprietário (tem assinatura), o destinatário recebe um placeholder de template não-preenchido.

**Cenário.** `{quadra:"9", lote:null, endereco:null, bairro:null}`. Saída real:

```
Olá! Sou corretor(a) e trabalho com imóveis na região. Notei seu imóvel na região
(Q 9, L —) e gostaria de conversar sobre uma possível parceria para venda — sem
compromisso. Tem 5 minutos para eu explicar?
```

"(Q 9, L —)" enviado ao dono do imóvel parece um template quebrado.

**Proposta.** Montar `ql` só com os campos presentes: se apenas quadra, `" (Q 9)"`; se apenas lote, `" (L 12)"`; ambos `" (Q 9, L 12)"`; nenhum, `""`. Nunca interpolar o placeholder "—" em texto enviado.

---

## [ZAP-04] radar-goiania.html:1742-1744 | LOW | `faixaTxt` interpola o literal "null" se `faixa.lo`/`faixa.hi` for null/NaN (quebra o contrato de honestidade de `brlSimples`)

**Descrição.** `brlSimples` retorna `null` para `n==null||!isFinite(n)` (contrato documentado: "nunca interpola undefined/NaN"). Mas `faixaTxt` faz `brlSimples(faixa.lo)+" e "+brlSimples(faixa.hi)` sem checar o retorno null — a concatenação transforma `null` na string `"null"`. O guard dos templates (`faixa ?`) é só de truthiness do objeto, não dos campos internos.

**Cenário.** `faixa={lo:null,hi:520000}`. Saída real de `zapResumo`: `"...Faixa estimada: null e R$ 520 mil."`

**Alcance.** **Não reproduzível pelo caminho atual** — `mercadoEstimado` (linhas 4989-5008) sempre retorna `lo`/`hi` finitos quando o objeto não é null, e `dadosFicha` só passa `faixa:{lo,hi}` ou `null`. Achado defensivo: se uma fonte futura de faixa produzir lo/hi parcial, o contrato de honestidade quebra silenciosamente. Severidade LOW por não ser alcançável hoje.

**Proposta.** Em `faixaTxt`, retornar `null` se qualquer um de `brlSimples(lo)`/`brlSimples(hi)` for null — os templates já tratam `ft` null com o ramo honesto ("Ainda não tenho uma faixa estimada...").

---

## [ZAP-05] radar-goiania.html:1776,1827 | LOW | Repetição "na região … da região" quando falta bairro (e endereço)

**Descrição.** `localTxt(null)` retorna "na região" (correto para concordância — §26.1). Mas alguns templates já contêm um segundo "região" fixo, gerando repetição próxima quando o bairro está ausente.

**Cenário.** `zapProprietario` sem bairro: "Encontrei seu imóvel **na região** no Radar e, pela análise cadastral e comparáveis **da região**, ...". `captAbordagem` sem bairro e sem endereço: "trabalho com imóveis **na região**. Notei seu imóvel **na região** (...)". Saídas reais confirmadas via vm.

**Proposta.** Polimento de tom: quando `localTxt` já resolveu para "na região", suprimir/variar o segundo "da região"/"na região" fixo (ex.: "comparáveis próximos", "imóveis na sua área"). Não afeta honestidade nem dados; puramente redacional.

---

## Verificados e OK (sem achado)

- **`zapArgumento`** — fecho direcional coerente com o `porque` real de `scoreOportunidade`: score alto/"abaixo" → "reforça o valor pedido"; score baixo/"acima" → "abre margem para negociar". Sem `scoreOp` → variante honesta, nunca inventa percentual.
- **`assinatura`** — condicional a `perfil.nome`; sem perfil retorna `""` (nunca placeholder "[seu nome]"). `captDisclaimer` avisa "Textos sem assinatura" quando `perfil===null`.
- **`captScript`/`captChecklist`/`captFollowup`** — sem assinatura (corretos: script/checklist/tarefa interna, não mensagens enviadas); checklist é estático.
- **`oportunidadeItem`** — allowlist estrita de 12 campos; não vaza `dtnascimen`/nome de terceiro. **`histAdd`** — FIFO puro, não muta a lista.
- **`copyTexto`** — único ponto de escrita no clipboard para textos novos; fallback `execCommand` + `toast` garantido, devolve foco ao gatilho, nunca falha silenciosa.

---

*Auditoria somente-leitura. Nenhum arquivo de código/teste foi modificado.*
