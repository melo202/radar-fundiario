# Auditoria Fable 5 — Área 07: Inteligência Urbanística (Plano Diretor LC 349/2022)

- **Área:** 07 — Inteligência urbanística (accordion "Urbanístico", score de oportunidade, detector, camada de zonas)
- **Arquivo auditado:** `radar-goiania.html` (SOMENTE-LEITURA — nenhum arquivo modificado)
- **Data:** 2026-07-10
- **Auditor:** Fable 5
- **Baseline de testes:** `npm test` = **252/252 pass** (confirmado, independente da auditoria)
- **Método:** leitura de `PD_TABELA_CA`/`PD_MZC_BASICO`/`PD_LAYERS`/`PD_DISCLAIMER`/`_meta`, `pdRegrasDaZona`, `potencialConstrutivo`, `criterioDetectorPD`, `resolverZonaUI`, `montarUrbBodyHTML`, `detectorRotuloPD`, `pdConsultarLote`/`pdConsultarQuadra`/`pdBateriaConsulta`, `atualizarScorePorquePD`, `renderUrbanisticoUI`, `carregarZonasViewport`/`desenharZonas`/`zonaEstiloPorSigla`/`limparZonas`/`zonasZoomGateOk`. Execução das funções puras via `node:vm` (região RADAR_PURE 2765-2997) exercitando os **6 estados** do accordion e **todas as siglas** (AA/ADD/AOS/AEIS/APAC) + PD_MZC_BASICO.

> Já conhecidos e **não** re-reportados: C-01 (parcial rural), erro não cacheado, D-12 (traço estático no zoom), detectorRotuloPD honesto.

## Sumário da prova (node:vm)

- **REGRA DE OURO — CONFIRMADA SEM VIOLAÇÃO.** Nenhum caminho emite dígito de CA sem `conferido===true`. AEIS/APAC (`conferido:false`) caem no `notaSemCA` (sem dígito); `potencialConstrutivo` retorna `null` para AEIS/APAC/sigla desconhecida; `atualizarScorePorquePD` e `detectorRotuloPD` guardam por `conferido===true`. Provado nos 5 estados que passam por `montarUrbBodyHTML` + parcial.
- **6 estados OK:** erro / rural / resolvido / resolvido_sem_unidade (regra===PD_MZC_BASICO, conferido) / parcial; "carregando" é decidido pelo chamador e `montarUrbBodyHTML` não quebra em estado desconhecido.
- **Precedência AA>ADD>AOS OK** (sobreposição AA+ADD→AA; ADD+AOS→ADD).
- **Citações de artigo CORRETAS:** AA 6,0x (Art. 196, II), ADD 5,0x (Art. 196, I), básico 1,0x universal (Art. 242, VII), AOS altura 12 m (Art. 186) + ocupação 40% (Art. 190, §3º).
- **7,5x (exceção TDC Art. 252, §6º) NÃO aparece** em nenhuma ficha gerada. Confirmado.
- **Disclaimer SEPLANH** presente 1x em todos os estados com dado; ausente só em "erro" (por design — nada resolvido).

---

## Achados

### [PD-01] radar-goiania.html:2885-2928 | MÉDIA | AOS: taxa de ocupação 40% (Art. 190, §3º) é curada mas NUNCA renderizada na ficha

**Descrição:** `montarUrbBodyHTML` monta a grade a partir de `macrozona`, `unidade`, `ca_basico`/`ca_maximo`, `usos`/`usos_conferido`, `altura_max` e `nota_altura`. O campo `taxa_ocupacao` **não é referenciado em lugar nenhum** do render (nem em `atualizarScorePorquePD`). Para a AOS — única zona onde `taxa_ocupacao:40` está preenchido e conferido — o parâmetro que **mais limita o aproveitamento** (40% de ocupação do lote, Art. 190, §3º) some da ficha.

**Cenário (executado via node:vm, estado `resolvido` sigla AOS):** o HTML emitido é exatamente:
`Macrozona → Macrozona Construída` · `Unidade territorial → AOS — Área de Ocupação Sustentável` · `Índice de aproveitamento (CA) → CA básico 1,0x · sem teto de índice de aproveitamento definido` · `Altura máxima → 12 m`. Assert `taxaOcupacaoNoHTML=false`. Um advogado lê "CA básico 1,0x · sem teto" + "12 m de altura" e pode concluir que ocupa toda a projeção do lote — quando a lei limita a projeção a 40%.

**Impacto:** subavaliação do constrangimento real de aproveitamento numa zona de "ocupação sustentável", justamente onde o CA não é o parâmetro limitante. Não é violação da regra de ouro (o dígito de CA está correto e conferido), mas é omissão material para análise de potencial construtivo.

**Proposta:** renderizar `taxa_ocupacao` como uma célula ("Taxa de ocupação máxima → 40%") quando `!=null` e `conferido===true`, no mesmo bloco de `altura_max`; adicionar fixture assertando "40%" no HTML de AOS.

### [PD-02] radar-goiania.html:2898-2928 | MÉDIA | Campo `nota_ca` é caminho morto no render — a explicação do regime da AOS (e de PD_MZC_BASICO) nunca chega ao usuário

**Descrição:** `nota_ca` existe em `AOS` e `PD_MZC_BASICO` com texto substantivo, mas `montarUrbBodyHTML` **nunca** lê `nota_ca`. Para a AOS, como a linha de CA é emitida (`conferido===true && ca_basico!=null` é verdadeiro), o `else if(e.unidade)` que produziria o `notaSemCA` é pulado — de modo que a única explicação de que *"a lei não define teto de índice de aproveitamento para esta zona (Art. 196 regula só AA e ADD); o parâmetro limitante é a altura (12 m) e a taxa de ocupação (40%)"* fica suprimida. Combinado com PD-01, a ficha da AOS mostra "CA básico 1,0x · sem teto" **sem qualquer contexto** de que o regime real é altura + ocupação. Para `PD_MZC_BASICO`, o `nota_ca` também é morto (o estado `resolvido_sem_unidade` usa uma string hardcoded distinta na linha 2927), gerando risco de divergência entre a nota exibida e a nota do dado.

**Cenário (node:vm):** para AOS, `notaCaNoHTML=false` (o texto de `regra.nota_ca` não aparece no HTML). Confirmado no dump completo do HTML de AOS.

**Impacto:** trabalho de curadoria jurídica invisível; o usuário-advogado perde a justificativa que distingue "sem teto de CA" (positivo) de "regime governado por altura/ocupação" (restritivo).

**Proposta:** renderizar `r.nota_ca` (quando presente) como `.dnote` após a linha de CA, mesmo no branch conferido; ou, no mínimo, para a AOS. Eliminar a string hardcoded duplicada da linha 2927 em favor de `PD_MZC_BASICO.nota_ca` para evitar drift.

### [PD-03] radar-goiania.html:2774-2779 (dado) + render inteiro | BAIXA | Citação de artigo (`fonte`) nunca é exposta ao usuário

**Descrição:** cada zona carrega `fonte` com as citações precisas (ex.: AA "Art. 242, VII; Art. 196, II; Art. 190, II e III, LC 349/2022"), curadas por leitura direta da lei primária. Nenhuma função de render (`montarUrbBodyHTML`, `atualizarScorePorquePD`, `detectorRotuloPD`) lê `fonte`. O usuário vê apenas o `PD_DISCLAIMER` genérico. Para um produto destinado a advogado, a citação do artigo é precisamente a *prova* da afirmação urbanística — e é o diferencial sobre uma consulta leiga.

**Cenário:** grep de `.fonte` no arquivo retorna somente as linhas de definição de dados; zero usos no render.

**Impacto:** baixo (não é erro; é oportunidade). O dado já está conferido e disponível; expô-lo elevaria a defensibilidade jurídica da ficha sem qualquer custo de rede.

**Proposta:** exibir `fonte` (quando `conferido===true` e não-vazio) como micro-nota junto ao CA/altura, atrás de um "ver fundamento" ou direto no `.dnote`.

### [PD-04] radar-goiania.html:2801-2807, 2974-2977 | BAIXA | Detector rotula "critério do Plano Diretor" para zonas de CA 1,0x, onde a razão é numericamente idêntica ao fallback ingênuo

**Descrição:** `criterioDetectorPD` usa `areaedif/potencialPD` quando `potencialPD>0`. Para AOS (e para a Macrozona Construída básica), `ca_basico===1.0`, logo `potencialConstrutivo = areaterr × 1,0 = areaterr`. A razão resultante é **exatamente igual** ao fallback `areaedif/areaterr`, mas `detectorRotuloPD` rotula como *"Critério: área construída ÷ potencial do Plano Diretor (zona AOS, CA básico 1,0x)"*, sugerindo um refinamento urbanístico que, nesse caso, não altera o número em relação à conta ingênua terreno.

**Cenário (node:vm):** `potencialConstrutivo(1000,"AOS") = 1000` (= terreno). A "razão PD" e a "razão terreno" coincidem para toda zona com CA 1,0x.

**Impacto:** baixo — o rótulo é honesto (mostra "CA básico 1,0x", o leitor atento percebe), mas transmite mais precisão do que entrega. Só AA/ADD (CA>1,0x) mudam de fato o denominador.

**Proposta:** opcional — quando `ca_basico===1.0`, unificar o rótulo com o fallback ou anotar "(CA básico 1,0x — equivale à razão por terreno)". Não bloqueia nada.

---

## Verificações sem achado (defensáveis)

- **Regra de ouro:** sem violação em nenhum caminho (montar/potencial/score/detector) — provado por execução.
- **Orçamento:** bateria de 9 layers só por lote (`pdConsultarLote`/PDCACHE) ou por quadra (`pdConsultarQuadra`/PDQUADRACACHE), dedupe de sessão; zonas viewport-limited com `zonasZoomGateOk(zoom>=13)`, padding 0.3, `ZONALAST` evitando refazer pans curtos, `ZONASTOKEN` invalidando respostas obsoletas — coerente com o CONTEXT.
- **Fallback do detector:** `criterioDetectorPD` nunca lança/esconde candidato; `detectorRotuloPD` distingue honestamente "PD não disponível" × "parâmetro não conferido" × "unidade não identificada".
- **`_meta.pendente`** documenta a auditoria legal pendente (LC 363/364/371/373 — HUMAN-UAT advogado); não é surfaceado (correto — é proveniência interna).
- **Erro sem disclaimer:** por design; nada foi resolvido, então nenhuma afirmação urbanística é feita.
