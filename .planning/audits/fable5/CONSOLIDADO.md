# Auditoria Fable 5 — Consolidado

**Data:** 2026-07-10 · **Modelo:** Fable 5 (herdado da sessão, sem override) · **Baseline:** 252/252 testes verdes
**Escopo:** análise de segurança EXCLUÍDA por decisão do usuário. Nenhum arquivo de código, teste ou dataset foi modificado.
**Método:** 11 auditores em áreas disjuntas + 1 verificador adversarial (11 CONFIRMED, 0 REFUTED). Achados provados por execução das funções puras via `node:vm` sempre que possível.

## Placar

**~70 achados** em 11 áreas. Nenhum é hipotético: os de maior severidade têm saída real colada.

| # | Área | Achados |
|---|------|---------|
| 01 | Busca & detecção | 5 (1 crítico) |
| 02 | Ficha & scores | 6 |
| 03 | WhatsApp & captação | 5 (2 high) |
| 04 | Documentos & minutas | 4 |
| 05 | Território & choropleth | 7 (1 alta) |
| 06 | Detector, caderno & diff | 5 (1 alta) |
| 07 | Plano Diretor | 4 |
| 08 | Mapa, pinos & motion | 6 |
| 09 | Estética, a11y & PWA | 7 (1 alta) |
| 10 | Testes, dados & repo | 9 |
| 11 | Correção funcional | 3 |
| 00 | Verificação adversarial | 11 CONFIRMED / 0 REFUTED |

---

## O padrão que explica quase tudo: **o fix aplicado num lugar e não no gêmeo**

Cinco vezes, independentemente, os auditores acharam a mesma classe de defeito — uma correção da rodada anterior aplicada a um call-site e esquecida no irmão simétrico:

| Fix original | Onde foi aplicado | Onde foi esquecido |
|---|---|---|
| "Nunca cachear estado de erro" (B-01) | `pdConsultarLote` (ficha) | `pdConsultarQuadra` (detector) — **AQ-01** |
| Coerção de tipo `String(...)===String(...)` (A-02) | filtro do caderno | cruzamento Caixa — **CAD-01** |
| Nome do setor em vez do código (B-10) | linhas do caderno | `<select>` de filtro — **B-15** |
| Contraste `--accent-ink` (D-09) | 3 seletores | `.card .unit` — **EST-02** |
| Confirmação antes de descartar (B-08) | `fecharNeg` (minuta) | `fecharLaudo` (wizard) — **B-13** |

Qualquer correção desta rodada deve começar perguntando: **onde está o gêmeo?**

---

## Prioridade 1 — Quebra funcional (o usuário não consegue usar)

**[BUSCA-01] crítico** · `radar-goiania.html:7784-7792`
Buscar prédio pelo nome + Enter **nunca funciona**. `applyDetectAndSearch` trata `ql`, `addr` e `insc` — falta o ramo `bd`. O campo `#predio` nunca é preenchido e o app responde "Digite o nome do edifício (mínimo 3 letras)" a quem acabou de digitar. `forceMode()` e o handler de exemplos têm o ramo; só o caminho do Enter o perdeu.
*Fix:* adicionar `else if(mode==="bd")` preenchendo `#predio` a partir de `fields.predio`.

---

## Prioridade 2 — Sai em documento assinado ou mensagem enviada

**[C-10] média** · `numeroPorExtenso` — extenso **vazio** a partir de R$ 1 bilhão.
Saída real: `1000000000` → `"R$ 1.000.000.000,00 ( milhões de reais)"`; `2500000000` → **string idêntica**. Alcançável com um zero a mais no campo de preço. Vai para o PDF do contrato, onde o extenso é a expressão que prevalece.
*Fix:* escala "bilhão" em `extensoInteiro`; stopgap honesto: se `ext.trim()===""`, devolver `""` em vez do parêntese quebrado.

**[DOC-01] média** · Extenso com "e" super-inserido entre escalas: *"um milhão **e** duzentos e trinta e quatro mil"*. Atinge a **maioria dos preços reais de imóvel**.

**[DOC-02] média** · Numeral e extenso divergem no mesmo documento (`Math.floor` × `toLocaleString`).

**[ZAP-01/ZAP-02] high** · `zapProprietario` e `zapRiscos` interpolam a frase-diagnóstico de `scoreConfianca` — **já pontuada** — dentro de uma lista de "itens a confirmar". Resultado: ponto no meio da frase, ponto duplicado, e **"dados completos" listado como pendência**. Acontece no caminho **comum** (3–7 comparáveis), na mensagem enviada ao proprietário.
*Por que 252 testes não pegaram:* as fixtures alimentavam um `porque` fabricado à mão, nunca a saída real de `scoreConfianca`.

**[C-14] cosmético (mas sai no PDF)** · `montarNeg`: preâmbulo de partes vira linha corrida (`\n` colapsado em `<p>`); título all-caps duplicado com o banner.

**[C-11] baixa** · `"(um milhão de reais)"` para `R$ 1.000.000,50`. Inalcançável pela UI (inputs usam `parseInt`) — teórico.

**[C-12] comentário-only** · O comentário do ITBI descreve a tese municipal **superada**; o código está correto (STJ Tema 1.113).

---

## Prioridade 3 — Correção silenciosa (dado errado sem avisar)

**[CAD-01] alta** · Cruzamento Caixa (badge/anel/popup) **some** quando `cdbairro` do caderno é string. Mesma família do fix A-02, não replicada. Gatilho: importar caderno de outro aparelho. Provado: n=0.

**[TERR-01] alta** · Quantis degenerados: com preços pouco dispersos, faixas do meio ficam vazias, a legenda mostra `"R$ X–R$ X"` e o choropleth vira quase monocromático.

**[FICHA-01] média** · Imóvel **na mediana** em vizinhança homogênea recebe **score 100 "Boa oportunidade"** — o cálculo colapsa quando a dispersão tende a zero. (Mesma raiz de TERR-01.)

**[FICHA-02] média** · "Confiança: alta" pode coexistir com "imóveis muito variados" — a confiança ignora a dispersão.

**[AQ-01] warning** · `pdConsultarQuadra` cacheia `{estado:"erro"}`. Uma oscilação de rede crava "Plano Diretor não disponível" no detector **pela sessão inteira** — e o detector, ao contrário da ficha, não tem botão de retry que limpe o cache.

**[CAD-02] média** · `diffLote` reporta *"Uso mudou de Residencial para Residencial"* quando snapshot e ficha diferem só no tipo (número × string).

**[CAD-04] baixa** · O diff **se autodestrói**: `renderDiffUI` sobrescreve o snapshot em toda abertura de ficha, então "o que mudou desde a última visita" só pode ser lido uma vez.

**[TERR-orçamento] média** · O teto HARD de 3 páginas é contornável por rejeição de rede — o compromisso central com o endpoint frágil da prefeitura tem uma fresta.

---

## Prioridade 4 — Perda de trabalho e acessibilidade

**[B-13] médio** · O wizard do laudo descarta passos, observações e **fotos** sem perguntar (× e Esc). A minuta irmã pergunta.

**[D-11] média** · `trapFocus` **nunca move o foco para dentro** do container. Como o handler de Tab vive no container, o trap fica **inerte** em `#calc`, `#laudoView` e `#terrPanel` — justamente os três que ganharam trap na última rodada. Os outros cinco sheets semeiam foco manualmente e por isso funcionam.

**[EST-01] alta** · `.bm-faixa b` (a faixa de valor, o número-âncora da tela) em **3,20:1** — reprova AA.
**[EST-02] média** · `.card .unit` em 4,31:1 — o irmão esquecido do fix D-09.
**[EST-03] média** · `.combo-item .code` cai para 2,32:1 no hover/teclado.

**[D-13] baixa** · `#detectChip` mistura `role="status"` com `onclick`+`tabindex` — é botão de fato, anunciado como status.

---

## Prioridade 5 — Regressão da rodada anterior

**[B-12] médio** · Dois botões idênticos **"📊 Ver comparáveis"** coexistem na ficha. O de cima só faz `scrollIntoView` até o de baixo, que é o que realmente calcula. Introduzido ao "unificar rótulos".

---

## Prioridade 6 — Acabamento e coerência

- **[B-14]** botão do caderno com `aria-pressed` que não desmarca (o ⭐ irmão desmarca e avisa)
- **[B-15]** `<select>` do caderno com código cru; **[B-10]** já resolveu as linhas
- **[B-17]** `"Amostra de 1 de 1 lotes"`; **[TERR-07]** `"Amostra de 6.000 de 4.000 lotes"` (sem clamp)
- **[TERR-06]** trocar de setor com "valor" ligado deixa o wash do setor anterior aceso
- **[D-12]** traço das zonas do PD congela no zoom-in (a malha de bairros re-aplica; as zonas não)
- **[MAPA-01]** vocabulário: "Atenção" ≠ "Oportunidade média"; **[MAPA-02]** cor do choropleth duplicada em JS e CSS; **[MAPA-03]** wash do bairro usa a faixa-3 da paleta de valor
- **[PD-01/02/03]** a taxa de ocupação 40% da AOS, o regime de altura e a **citação do artigo** foram conferidos na fonte primária e **nunca são exibidos** (`nota_ca` é caminho morto)
- **[ZAP-03]** `captAbordagem` manda `"Q —"/"L —"` ao dono quando só quadra ou só lote existe
- **[DOC-04]** `"1 dias"`; **[B-16]** "Ver como →" abre cartão genérico
- **[EST-04]** `caixa-goiania.js` bloqueia o render inicial; **[EST-05]** choropleth re-estiliza 4.000 lotes SVG de uma vez
- **[AQ-02]** `abrirTerritorio` sem token de invalidação (latente, hoje barrado pelo overlay)
- **[AT-03]** `trapFocus(#laudoView)` sem guarda de reentrância (latente)

---

## Prioridade 7 — A dívida que permitiu tudo isso

**[REPO-01]** Os 252 testes **só exercitam funções puras**. Nenhum carrega os datasets reais, nenhum toca DOM. É por isso que:
- o extenso quebrado ≥ 1 bilhão passou (fixtures param em 2 milhões)
- as mensagens de WhatsApp quebradas passaram (fixtures usavam `porque` fabricado, não a saída de `scoreConfianca`)
- os defeitos de dados são invisíveis

**[REPO-04]** Integridade real medida: 1206 features / **1205 ids** (um duplicado: `000400001169`); **86 bairros sem cdbairro**; o ROADMAP afirma "709 setores", o dataset rende **687**. Caixa: 178 registros, 64 (36%) sem coordenada — documentado e testado.

**[REPO-02]** Três arquivos de doc afirmam que o cadastro **rejeita** `outFields` restrito. O código de produção usa restrito e funciona. O quirk do `*` vale só para `Mapa_ModeloEspacial`. A doc registrou o serviço errado.

**[C-08/C-13]** `montarNeg`/`montarLaudo`/`montarFichaRapida` sem teste (exigem jsdom — dívida real, não trivial). `extensoCasos` sem caso ≥ 1 bilhão nem milhão-com-centavos (trivial, **mas os asserts só passam depois de C-10 corrigido**).

---

## Ordem de execução recomendada

1. **BUSCA-01** (crítico, 3 linhas)
2. **Família do extenso** (C-10 + DOC-01 + DOC-02 + C-11) — reescrever `extensoInteiro` com teste primeiro, cobrindo bilhão, "e" entre escalas, centavos
3. **ZAP-01/02** — parar de interpolar frase pontuada como item de lista; **refazer as fixtures com a saída real de `scoreConfianca`**
4. **CAD-01 + AQ-01** — replicar os fixes nos gêmeos esquecidos
5. **TERR-01 + FICHA-01/02** — tratar dispersão zero (raiz comum)
6. **B-12** (regressão), **D-11** (trap inerte), **B-13** (perda de trabalho)
7. **EST-01/02/03** (contraste AA)
8. **Acabamento** (prioridade 6)
9. **Testes** — fixtures reais, dataset-check, e o caso ≥ 1 bilhão que teria pego tudo

**Nada disso foi aplicado.** As correções ficam para a próxima etapa, conforme instrução do usuário.
