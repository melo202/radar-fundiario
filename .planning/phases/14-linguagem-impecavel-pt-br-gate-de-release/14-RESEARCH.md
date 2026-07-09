# Phase 14: Linguagem Impecável (pt-BR) — Research

**Researched:** 2026-07-09
**Domain:** Auditoria de microcopy pt-BR em app HTML único (survey de codebase, sem pesquisa externa)
**Confidence:** HIGH (toda a pesquisa é leitura direta do repositório — sem dependência de fontes externas)

## Summary

Esta fase é um gate de qualidade de texto sobre um app já funcionalmente completo (Fases 7–13 entregues, 107/107 testes verdes). Não há biblioteca ou framework a pesquisar — o trabalho é 100% survey do próprio `radar-goiania.html` (5305 linhas) para inventariar toda string voltada ao usuário, aplicar o checklist §26 e produzir uma tabela de auditoria como artefato.

A varredura confirma que a microcopy das Fases 8–13 já é majoritariamente de alta qualidade: botões com verbo de ação ("Copiar ⧉", "Gerar documento", "Salvar oportunidade"), toasts de erro no padrão "o que houve + o que fazer" ("Falha ao consultar o cadastro. Tente de novo."), disclaimers jurídicos cuidadosos nas minutas (Fase 11.1) e zero jargão nos templates de WhatsApp/Ficha rápida (garantido por teste). O maior risco não é o volume de texto ruim, e sim (a) **pontos pontuais e concretos de violação do §26** já localizados nesta pesquisa (ver "Achados concretos" abaixo) e (b) **alto acoplamento de teste**: 4 dos 8 arquivos em `tests/` fazem `assert` sobre substrings literais retornadas pelas funções `RADAR_PURE` — qualquer edição de texto nesses templates quebra teste na hora, então a tarefa de editar o template e a tarefa de atualizar o teste correspondente têm que andar juntas (mesmo commit/task).

**Primary recommendation:** Varredura por categoria (não linha a linha) sobre ~250 pontos de string identificados, com tabela de auditoria como artefato; tratar as ~4 violações concretas do §26 já localizadas como itens obrigatórios da lista de correção (não apenas achados genéricos); para os templates RADAR_PURE com string testada, o plano deve incluir "atualizar teste X" como parte da mesma task que edita a string.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Inventário e varredura**
- Varredura **sistemática por categoria** (botões → placeholders → erros → tooltips/aria → títulos/descrições → templates WhatsApp → templates de documento/PDF), não leitura linear do arquivo — garante cobertura auditável
- Fontes: `radar-goiania.html` (UI inline + RADAR_PURE templates), `index.html`, `manifest.json` (name/description), textos gerados em `sw.js` se houver
- Produzir **tabela de auditoria** (string original → veredito → string final → critério §26 aplicado) como artefato da fase — é o que prova o "gate"
- Strings de código (IDs, classes, chaves de localStorage, logs de console) estão **fora** do escopo — só texto que chega ao usuário

**Critério de mudança**
- Mudança mínima que satisfaz o §26 — não reescrever texto que já está correto (evita churn e regressão)
- Botões sempre iniciam com verbo de ação no infinitivo ("Gerar laudo", "Copiar mensagem", "Salvar oportunidade")
- Toda mensagem de erro segue o padrão **o que houve + por quê (se útil) + o que fazer** ("Não encontramos essa inscrição. Confira os dígitos ou busque pelo endereço.")
- Jargão cadastral (inscrição, venal, CI, matrícula) permitido apenas em camadas técnicas/accordion; 1ª camada usa termo do corretor

**Nomenclatura canônica**
- Fixar um glossário canônico na própria auditoria antes de editar: um único termo por conceito (ex.: decidir entre "Salvos"/"Oportunidades"/"Favoritos" conforme o que a Fase 10 consolidou na UI) e aplicar em toda parte
- Preservar os nomes já estabelecidos e verificados nas fases anteriores (ex.: "O que o Radar faz", "Modo Captação") — consistência vence preferência estética
- Documentos jurídicos (Fase 11/11.1) mantêm terminologia formal já revisada; ajuste só onde ferir o §26

**Verificação (gate)**
- Texto-apenas: suíte de testes existente (`tests/`) precisa continuar 100% verde; templates do RADAR_PURE que têm testes de snapshot/conteúdo são atualizados junto com os testes correspondentes
- Verificação final = checklist §26 percorrido categoria a categoria na tabela de auditoria, com contagem (N strings revisadas, M alteradas)
- WhatsApp/documentos: leitura em voz alta do resultado gerado (persona corretor / linguagem formal) como critério de aceite

### Claude's Discretion
- Ordem exata da varredura, formato da tabela de auditoria, e microdecisões de estilo (dentro do §26) ficam a critério do Claude
- Se encontrar texto ambíguo cuja correção muda significado funcional, manter o significado atual e anotar na auditoria

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LING-01 | Passar toda a microcopy (botões, placeholders, erros, tooltips, títulos, PDFs, WhatsApp) pelo checklist §26 | Seção "Inventário da Microcopy" mapeia todas as categorias e âncoras; "Achados Concretos" lista violações já localizadas; "Acoplamento de Teste" mapeia o que precisa de atualização em par; "Validation Architecture" define como provar o gate |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Não existe `CLAUDE.md` na raiz do projeto (verificado — arquivo ausente). Nenhuma diretiva de projeto adicional a aplicar além do que já está em CONTEXT.md/REQUIREMENTS.md/STATE.md.

## Inventário da Microcopy

Fonte única e determinística: `radar-goiania.html` (5305 linhas), mais `index.html` (11 linhas) e `manifest.json` (17 linhas). `sw.js` (63 linhas) verificado — **não contém nenhuma string voltada ao usuário** (só comentários técnicos e lógica de cache); fora do escopo.

### Contagem por categoria (grep literal, `radar-goiania.html`)

| Categoria | Ocorrências (grep) | Âncora |
|-----------|---------------------|--------|
| `<button>` | 106 | ao longo do arquivo; concentração maior em `#formZone` (~800-1100), ficha (`#dActsPrim`/`#dActsMore`, ~3430-3470), wizard de documento (`#lzSheet`, ~4260-4400), NEG (`#negSheet`, ~3980-4030) |
| `placeholder="..."` | 19 | formulário de busca (linhas 809-868), wizard de documento (linhas 4309-4355), colar matrícula (linha 3982) |
| `aria-label="..."` | 35 | overlays/sheets, botões-ícone (×, fechar, remover), legendas de mapa |
| `title="..."` | 7 | tooltips pontuais (satélite, CSV, "aproximado", CND, deep-link) |
| `toast("...")` (erros/confirmações) | ~35 chamadas | função central `toast()` (linha 2540); chamadas espalhadas em `buscar()`/`finish()` (~2600-2790), salvar/remover oportunidade (~3500-3660), NEG (~4110-4125), wizard de documento (~4400-4410) |
| Blocos `.empty`/estado vazio | 4 | `#emptyState` (linha 880), erro de busca (linha 2711), sem resultado (linha 2761), libs do mapa não carregaram (linha 4824) |
| Funções de template `*Texto`/`zap*`/`capt*` (RADAR_PURE) | 13 funções | bloco `RADAR_PURE_START`...`RADAR_PURE_END` (linhas 1135-2005); ver tabela dedicada abaixo |
| Onboarding (3 cartões) | 1 bloco (`#onbOverlay`, linhas 991-1005 + conteúdo dinâmico via JS) | `radar_onboard`, função de render do card (buscar `onbBody`/`ONB_CARDS` ou equivalente) |
| "O que o Radar faz" (`#oQueFaz`) | 1 bloco, 5 itens | linhas 894-905 |
| Legenda de pinos (`#pinoLegenda`) | 5 rótulos | linhas 932-938 |
| `manifest.json` (name/short_name/description) | 3 campos | arquivo completo, 17 linhas |
| `<title>`/meta description (`index.html`) | 2 campos | arquivo completo, 11 linhas |

**Estimativa total de pontos de string revisáveis: ~230-260** (contagem exata sai da própria tabela de auditoria, que é o artefato da fase — não vale a pena pré-contar aqui além desta ordem de grandeza).

### Funções de template RADAR_PURE (texto rico, alto risco de teste)

| Função | Linha | O que gera | Testada em |
|--------|-------|-------------|-----------|
| `zapResumo` | 1438 | Resumo do imóvel p/ WhatsApp | `tests/templates.test.mjs` |
| `zapProprietario` | 1451 | Mensagem para o proprietário | `tests/templates.test.mjs` |
| `zapComprador` | 1465 | Mensagem para o comprador | `tests/templates.test.mjs` |
| `zapArgumento` | 1478 | Argumento de preço | `tests/templates.test.mjs` |
| `zapRiscos` | 1493 | Riscos e ressalvas | `tests/templates.test.mjs` |
| `captAbordagem` | 1504 | Abordagem WhatsApp (captação) | `tests/templates.test.mjs` |
| `captScript` | 1514 | Script de ligação (4 passos) | `tests/templates.test.mjs` |
| `captChecklist` | 1524 | Checklist documental (5 itens, texto estático) | `tests/templates.test.mjs` |
| `captFollowup` | 1534 | Tarefa de follow-up interna | `tests/templates.test.mjs` |
| `fichaRapidaTexto` | 1622 | Ficha rápida (resumo/leitura/ressalva) | `tests/scores.test.mjs` |
| `recomendaDocumento` | 1586 | 4 textos de "porquê" da recomendação de documento | `tests/doc.test.mjs` |
| `pendenciasDocumento` | 1607 | 3 itens de checklist de pendências | `tests/doc.test.mjs` |
| `propostaTexto` | 1768 | Minuta completa da Proposta de C&V (5 cláusulas + disclaimer) | `tests/negocio.test.mjs` |
| `termoExclusividadeTexto` | 1806 | Minuta do Termo de Exclusividade (6-7 cláusulas + disclaimer) | `tests/negocio.test.mjs` |
| `contratoTexto` | 1862 | Minuta do Contrato de C&V (7 cláusulas + disclaimer) | `tests/negocio.test.mjs` |
| `analisePredicoTexto` | 1976 | Análise copiável do prédio (WhatsApp-style, com emoji 🏢/📍) | `tests/predio.test.mjs` |
| `scoreOportunidade` (campo `rotulo`) | 1323 | 3 rótulos de score exibidos no 1º layer da ficha | `tests/scores.test.mjs` |
| `leituraPratica` | 1393 | Frase de leitura prática (1ª camada, já garantida sem jargão por teste) | `tests/scores.test.mjs` |

## Achados Concretos (violações §26 já localizadas)

Estes 4 achados são **factuais, verificados por leitura direta do código** — não é preciso "descobrir" na fase, só decidir a correção e propagar para teste + audit table.

### A1 — Jargão "mediana" no rótulo de score de 1ª camada [VERIFIED: leitura de código]
`scoreOportunidade()` (linha 1351) define `rotulo="Abaixo da mediana"` para score < 33. Esse `rotulo` é renderizado **diretamente no badge de score da ficha**, que é 1ª camada por design da Fase 9 (FICHA-01: valor → score de oportunidade → score de confiança → leitura prática → ... → dados técnicos em accordion):
```js
// linha 3318 — renderScoresInto(), fora de qualquer <details>/accordion
opBody=`<span class="score-num">${op.score}...</span><span class="score-lbl">${esc(op.rotulo)}</span>`;
```
O mesmo texto "Abaixo da mediana" também está hardcoded na legenda de pinos do mapa (linha 935, `#pinoLegenda`) e é usado na tabela de comparação de unidades (linha 3104, `cmp-rowlbl`).
Isso contradiz diretamente o critério §26.4 ("zero jargão na 1ª camada") — nota-se que `leituraPratica()` (a frase textual da 1ª camada) **evita corretamente** "mediana"/"percentil"/"quartil" (garantido por teste em `scores.test.mjs`), mas o `rotulo` do score badge não passou pelo mesmo filtro.
**Acoplamento de teste:** `tests/fixtures.mjs` linha 65 tem `expectRotulo:"Abaixo da mediana"`, consumido por `tests/scores.test.mjs`. Trocar a string exige atualizar a fixture e a asserção no mesmo commit.
**Correção sugerida (não prescritiva — decisão de estilo do Claude na fase):** algo como "Preço elevado para a região" ou "Acima da faixa da vizinhança" — mantém o *significado* (posição de preço desfavorável ao comprador), só remove o termo técnico. Como muda o texto exibido ao usuário mas não a lógica/threshold, é mudança de string pura, compatível com o boundary da fase.

### A2 — Inconsistência entre texto padrão de loading e MOTION_MSG [VERIFIED: leitura de código]
O `#loadmsg` estático no HTML (linha 1006) traz `"consultando cadastro…"` (minúscula), enquanto a constante `MOTION_MSG.cadastro` (linha 2548, Fase 13 MOT-01) usa `"Consultando cadastro…"` (maiúscula). Mesmo texto, capitalização divergente — pequena inconsistência de nomenclatura/estilo (§26.7 correlato) a unificar (provavelmente para maiúscula, alinhado ao padrão das outras 4 mensagens de `MOTION_MSG`).

### A3 — Emoji em texto copiável de prédio, dentro do padrão "sem ironia/gíria" [ASSUMED — decisão de estilo, não uma regra escrita]
`analisePredicoTexto()` usa `🏢` e `📍` no texto copiável (WhatsApp-style) de análise de prédio — o único template com emoji fora de botões de UI. `tests/predio.test.mjs` **testa explicitamente a presença desses emojis** ("deveria conter o emoji do cabeçalho"). O critério §26.8 pede que o WhatsApp "pareça escrito por um corretor profissional" — 2 emojis discretos (prédio, local) em uma linha de dados é uma prática comum de corretor real e não conflita obviamente com "sem ironia/gíria" (que é sobre tom, não emoji). **Recomendação: manter** (mudança teria custo de teste sem ganho claro de qualidade) — mas registrar a decisão na tabela de auditoria como "avaliado, mantido" para não parecer que passou batido.

### A4 — "Oportunidades" usado para dois conceitos distintos [VERIFIED: leitura de código]
O termo "Oportunidades" aparece com dois significados diferentes na mesma tela:
- **"🏦 Oportunidades Caixa"** (linha 873/4682) = imóveis à venda pela Caixa Econômica, dado externo
- **"⭐ Minhas oportunidades"** (linha 3605) = lista de imóveis que o próprio corretor salvou (SALV-01, nome já travado no `10-CONTEXT.md`)

Não é um erro de digitação nem inconsistência acidental — são conceitos genuinamente diferentes que compartilham a palavra. CONTEXT.md desta fase manda **preservar nomes já estabelecidos** ("Oportunidades"/"Histórico" vêm do 10-CONTEXT.md) e, para texto ambíguo que mudaria significado funcional, "manter o significado atual e anotar na auditoria". **Recomendação: nenhuma mudança de nome** — os dois usos já se distinguem por contexto/ícone ("🏦 Oportunidades Caixa" vs "⭐ Minhas oportunidades"/"Oportunidades" no bloco salvo) — mas vale registrar explicitamente na auditoria como "ambiguidade avaliada, sem mudança" para fechar o ponto que a Fase 10 tinha deixado como flag aberta.

## Acoplamento de Teste (RADAR_PURE ↔ tests/)

Todos os 4 arquivos de teste abaixo carregam o bloco `RADAR_PURE_START`...`RADAR_PURE_END` de `radar-goiania.html` via `node:vm` (não duplicam a implementação) e fazem `assert` sobre **substrings literais** do texto gerado. Qualquer edição de string dentro desse bloco que toque uma dessas âncoras quebra o teste imediatamente — **isto é o comportamento desejado** (é o gate de honestidade dos templates), mas significa que a task de editar o texto e a task de atualizar a asserção correspondente devem ser a mesma task (ou tasks adjacentes no mesmo commit), nunca tasks separadas em waves diferentes.

| Arquivo de teste | Funções cobertas | Strings literais fixadas nas asserções |
|---|---|---|
| `tests/templates.test.mjs` | `zapResumo/zapProprietario/zapComprador/zapArgumento/zapRiscos/captAbordagem/captScript/captChecklist/captFollowup/oportunidadeItem/histAdd` | assinatura `"— Ana Souza, CRECI 12345"`; termos de honestidade `"recomendo confirmar"`/`"faixa estimada"`/`"não é uma avaliação oficial"`; ausência de `"garantido"`/`"certeza"`; passos `"1."`-`"4."`; itens do checklist (`"matrícula"`, `"iptu"`, `"certidões pessoais"`, `"condomínio"`, `"identidade"`); contagem de bullets `"•"` |
| `tests/negocio.test.mjs` | `propostaTexto/termoExclusividadeTexto/contratoTexto/parseMatricula/numeroPorExtenso` | `DISCLAIMER_NEG` **literal e exato** (string de 44+ palavras, linha 1641); rótulos `"Cláusula 1ª"`...`"Cláusula 7ª"`; papéis `"Proponente"`/`"Vendedor/Proprietário"`/`"Vendedor"`/`"Comprador"`/`"Proprietário"`/`"Corretor"`; `"EXCLUSIVO"`/`"NÃO EXCLUSIVO"`; `"Autorização de Divulgação"` |
| `tests/doc.test.mjs` | `recomendaDocumento/pendenciasDocumento/fichaRapidaTexto` | os 4 textos de `porque` devem ser **todos diferentes entre si**; `ressalva` deve conter `"recomenda-se confirmar"`; ausência de `"mediana"`/`"percentil"`/`"quartil"` em qualquer campo do retorno de `fichaRapidaTexto` |
| `tests/scores.test.mjs` | `scoreOportunidade/scoreConfianca/leituraPratica/statusDeUnidade` | `rotulo` exato por faixa (`"Boa oportunidade"`/`"Oportunidade média"`/`"Abaixo da mediana"` — ver Achado A1); ausência de jargão em `leituraPratica` |
| `tests/predio.test.mjs` | `resumoPredio/ordenaUnidades/ehAptoProvavel/analisePredicoTexto` | presença de `🏢`, `área média`, `venal médio`, `estimado médio`, `faixa`, fallback `"Edifício"`, `"0 unidades"`, assinatura `"Análise gerada pelo Radar Fundiário."`; ausência condicional de `📍`/métricas quando input é null |

`tests/busca.test.mjs` e `tests/detectmode.test.mjs` testam lógica de matching/detecção (não geram texto de UI relevante ao §26) — sem asserções sobre strings de rótulo (`label` de `detectMode()` não é testado). Isso significa que os `label` de `detectMode()` (ex.: `` `Inscrição (unidade) · ${digitsOnly.length} díg.` ``, `` `Quadra ${mQL[1]} · Lote ${mQL[2]}` ``, `"Ambíguo"`) — que aparecem no chip de confirmação da busca — **podem ser editados sem quebrar teste**, mas ainda são microcopy real e precisam entrar na varredura (categoria "chip de confirmação").

**Comando de verificação rápida por task:** `npm test` (roda `node --test tests/*.test.mjs`) — 107 testes, ~120ms, já confirmado 100% verde na baseline desta pesquisa (2026-07-09).

## Risk Zones — NÃO tocar

| Tipo | Exemplos | Por quê está fora |
|------|----------|---------------------|
| Chaves `localStorage` | `radar_lastbairro`, `radar_sat`, `radar_oportunidades`, `radar_historico`, `radar_prof`, `radar_coach`, `radar_onboard` | Strings de código, não texto de usuário; mudar quebra dados persistidos de usuários reais |
| Query param de deep-link | `?insc=` (linhas 3686, 4782, 4829) | Contrato de URL compartilhável (BUSCA-09); mudar quebra links já distribuídos |
| `SEARCHTOKEN` | 20 ocorrências | Nome de variável interna de controle de corrida, nunca visível ao usuário |
| Classes CSS | `.zapbtn`, `.captcopy`, `.acts-save`, `.score-lbl`, etc. | Seletores de estilo/JS, não texto |
| `id`/`aria-controls`/`aria-describedby` (valores) | `dScores`, `scoreOpWhy`, `oportunidadesBlock`, etc. | Referências de DOM, não texto — mas o `aria-label` **no mesmo elemento** É texto e está em escopo |
| `data-example`, `data-mode`, `data-rua`, `data-insc` (atributos) | vários | Valores de dado interno para JS ler via `.dataset`, não rótulo visível — mas se o MESMO texto aparecer também como innerHTML do botão (ex.: `data-example="quadra 128 lote 5">quadra 128 lote 5<`), o **conteúdo visível** entra em escopo, o atributo não |
| Comentários de código (`/* ... */`, `//...`) | todo o arquivo | Nunca chegam ao usuário — fora do escopo por definição, mesmo que em pt-BR |

### Zona cinzenta a tratar com atenção redobrada

- **`aria-label` genuinamente user-facing:** todos os 35 `aria-label` listados no inventário SÃO texto para leitor de tela (usuário real) — estão dentro do escopo, mas coincidem frequentemente com o valor de um `title`/rótulo textual próximo, exigindo consistência entre os dois (ex.: botão `×` com `aria-label="Fechar"` deve narrar a mesma ação do contexto visual).
- **`title="..."` como tooltip nativo do navegador:** também é texto do usuário (aparece no hover) e alguns já são frases completas com micro-copy própria (ex.: linha 3452, tooltip da CND) — revisar junto com o botão que o contém, não isoladamente.
- **Placeholders com estilo minúsculo intencional** (`"digite: faiçalville, oeste, marista…"`, `"ex.: 246"`): parecem consistentes como estilo deliberado de "exemplo digitável" (§26 não exige maiúscula em exemplo) — não corrigir para maiúscula sem necessidade (evita o churn que o CONTEXT.md pede para evitar); mas confirmar que a exceção do erro de carregamento do combo (linha 2383, `"erro ao carregar — recarregue a página"`, usado como *placeholder*, não como toast) segue o mesmo padrão de erro-com-saída do §26.3, mesmo sendo tecnicamente um atributo `placeholder`.

## Nomenclatura Canônica (glossário a fixar na auditoria)

Termos já estabelecidos em fases anteriores que a Fase 14 **preserva** (não é decisão nova, é ratificação):

| Conceito | Termo canônico | Fonte |
|----------|-----------------|-------|
| Lista de imóveis salvos manualmente pelo corretor | "Oportunidades" / "Minhas oportunidades" (bloco) | `10-CONTEXT.md` (Fase 10, travado) |
| Lista automática de últimas consultas | "Histórico" | `10-CONTEXT.md` (Fase 10, travado) |
| Área de descoberta progressiva na tela inicial | "O que o Radar faz" | Fase 13 (13-03) |
| Fluxo de abordagem ao proprietário | "Modo captação" | Fase 10 |
| As 3 saídas de documento | "Ficha rápida" / "Relatório de avaliação" / "Laudo/PTAM" | Fase 11 (DOC-01) |
| As 3 minutas de negociação | "Proposta de Compra e Venda" / "Termo de Autorização/Exclusividade de Venda" / "Contrato de Compra e Venda" | Fase 11.1 (NEG-01/02/03) |
| Imóveis à venda pela Caixa | "Oportunidades Caixa" | legado v1/v2.0 (ver Achado A4 — mantido apesar da colisão de palavra com "Minhas oportunidades") |

A fase não precisa "decidir" esses nomes — só verificar que nenhuma variação divergente escapou (ex.: procurar por "Favoritos"/"Salvos" residuais de versões anteriores, que o `10-CONTEXT.md` já resolveu a favor de "Oportunidades").

## Common Pitfalls

### Pitfall 1: Editar string de template sem atualizar o teste correspondente
**O que acontece:** `npm test` falha imediatamente após qualquer edição em `zapRiscos`/`propostaTexto`/etc. que toque uma substring testada (ver tabela "Acoplamento de Teste").
**Por que acontece:** os testes fixam disclaimers/rótulos/termos de honestidade literalmente, por design (é o mecanismo de "nunca promete validade automática"/"nunca afirma certeza").
**Como evitar:** cada task de edição de string dentro do bloco RADAR_PURE deve, na MESMA task, rodar `npm test`, localizar a asserção quebrada e atualizá-la para a nova string — nunca deixar `npm test` vermelho entre tasks.
**Sinal de alerta:** qualquer PLAN.md que separe "editar textos de WhatsApp" e "atualizar testes" em waves diferentes.

### Pitfall 2: Confundir jargão de 1ª camada com jargão de accordion
**O que acontece:** §26.4 exige zero jargão na 1ª camada, mas o app tem jargão correto e esperado nas seções `Dados técnicos` (accordion) e `Metodologia e fontes` (accordion) — não editar esses blocos por engano (ex.: "mediana"/"percentil"/"quartil" É esperado ali, ver `#dMetodologia`/`#dGrid`, linhas 963-974).
**Como evitar:** ao decidir se um jargão "sai", primeiro checar se o elemento está dentro de um `<details>` (accordion) — se estiver, geralmente está OK; se estiver fora (1ª tela, botão principal, score badge), aplica-se o critério estrito.

### Pitfall 3: Achar que "menos texto revisado" é sinônimo de "legado v1 ruim"
**O que acontece:** a hipótese inicial do CONTEXT.md era que "legado v1 é o maior risco de texto amador" — a varredura desta pesquisa não confirma isso: os toasts de erro mais antigos (linha 2705, offline/falha de consulta) já seguem o padrão "o que houve + o que fazer". O risco real está em pontos específicos (score badge, consistência de capitalização), não em uma camada temporal inteira.
**Como evitar:** não pular a varredura de nenhuma categoria assumindo que "já está boa" — mas também não esperar reescrever grandes blocos de legado; a mudança mínima (CONTEXT.md) é o critério certo.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js test runner nativo (`node:test` + `node:assert/strict`), sem bundler/framework externo |
| Config file | nenhum arquivo de config — `package.json` define `"test": "node --test \"tests/*.test.mjs\""` |
| Quick run command | `npm test` (roda toda a suíte — já é rápido: ~120ms para 107 testes, não há subset menor necessário) |
| Full suite command | `npm test` (mesma coisa — suíte única, sem separação unit/integration) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LING-01 (templates RADAR_PURE) | Strings de WhatsApp/Captação/Documentos/Negociação/Prédio/Scores permanecem consistentes após edição de texto | unit (existente) | `npm test` | ✅ (`tests/templates.test.mjs`, `tests/negocio.test.mjs`, `tests/doc.test.mjs`, `tests/scores.test.mjs`, `tests/predio.test.mjs`) |
| LING-01 (UI inline: botões/placeholders/erros/aria/tooltips) | Nenhum teste automatizado cobre HTML/JS de UI diretamente (é DOM, sem harness de DOM no projeto) | manual-only (checklist) | N/A — verificado pela tabela de auditoria + checklist §26 categoria a categoria | ❌ — não é gap a preencher; é decisão de escopo do projeto (nenhum harness de DOM existe ou é necessário para uma fase texto-only) |

Não há gap de Wave 0 de teste automatizado a preencher: os templates com risco de regressão de honestidade/formato JÁ têm cobertura; a parte de UI pura (botões/placeholders) não tem e não precisa ter automação nova — o **artefato da auditoria** (tabela) é o mecanismo de verificação decidido pelo usuário em CONTEXT.md, substituindo testes de snapshot de DOM.

### Sampling Rate
- **Por task de edição de string dentro do RADAR_PURE:** `npm test` (deve continuar 100% verde; se quebrar, atualizar a asserção na mesma task)
- **Por task de edição de string na UI inline (fora do RADAR_PURE):** nenhum comando automatizado aplicável — validação é visual/leitura (o próprio ato de preencher a linha da tabela de auditoria)
- **Ao fim de cada wave (categoria da varredura):** `npm test` + contagem parcial da tabela de auditoria (N revisadas / M alteradas) atualizada
- **Phase gate:** `npm test` 100% verde + tabela de auditoria completa (todas as ~7-8 categorias percorridas) + leitura em voz alta de pelo menos 1 amostra de cada template WhatsApp e de cada minuta de documento (critério de aceite definido pelo usuário em CONTEXT.md)

### Wave 0 Gaps
Nenhum — a suíte existente (107 testes, 8 arquivos) já cobre 100% dos templates de texto com risco de regressão funcional. Nenhum framework novo, config nova ou fixture nova é necessária para esta fase. O único "artefato novo" desta fase é não-código: a tabela de auditoria em si (formato/local a critério do Claude, provavelmente indo para o `14-XX-SUMMARY.md` ou um `14-AUDITORIA.md` dedicado — decisão de planejamento, não de pesquisa).

## Security Domain

`security_enforcement: true` no `.planning/config.json` — seção incluída, mas quase toda categoria ASVS é N/A: esta é uma fase de edição de strings literais em um app client-side sem autenticação, sessão ou criptografia. O único ponto de atenção real é integridade de saneamento de HTML ao editar templates que já usam `esc()`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | não | app não tem login/conta |
| V3 Session Management | não | sem sessão de servidor |
| V4 Access Control | não | sem controle de acesso, tudo client-side |
| V5 Input Validation (aplicável de forma restrita) | sim, indiretamente | qualquer string nova/editada que seja **interpolada em `innerHTML`** deve continuar passando por `esc()` (função já existente no app) — a fase NÃO introduz nenhum novo ponto de interpolação de dado do usuário, só edita strings literais fixas, então o risco é baixo, mas o plano deve instruir "não remover chamadas `esc()` existentes ao editar o texto ao redor" |
| V6 Cryptography | não | sem criptografia no escopo desta fase |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| XSS via string editada que passa a conter `<`/`>`/`&` sem escape, se por engano for movida de um contexto de `textContent` para `innerHTML` | Tampering | Manter o padrão existente: templates RADAR_PURE retornam texto puro (nunca HTML) e são inseridos via `esc()` quando viram DOM (ver comentário da linha 1976: "Nunca chama esc() (texto puro de clipboard, não innerHTML — Wave 2 decide sanitização)") — ao editar essas strings, não introduzir HTML bruto nelas |

Nenhum threat pattern novo é introduzido por esta fase — ela não adiciona superfície de ataque, só edita conteúdo de string já existente dentro dos mesmos pontos de renderização já auditados nas fases anteriores.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | Emoji em `analisePredicoTexto` (🏢/📍) não viola "sem ironia/gíria" e deve ser mantido | Achado A3 | Baixo — se o usuário/planner decidir remover, é edição pontual de 1 função + 2 testes (`predio.test.mjs` linhas 222, 262 e 254-255), não recalibra o resto da fase |
| A2 | O formato/local da "tabela de auditoria" (artefato) fica a critério do planejamento, sem exigência de arquivo específico | Validation Architecture / Wave 0 Gaps | Baixo — CONTEXT.md explicitamente delega esta decisão ("formato da tabela... a critério do Claude") |

## Open Questions (RESOLVED)

> Ambas as questões foram resolvidas durante o planejamento (plan-check 2026-07-09):
> **Q1 RESOLVED:** o conteúdo dos 3 cartões do onboarding está na constante `ONB_CARDS` em `radar-goiania.html:4772` (confirmado ao vivo) — usado no 14-02-PLAN.md Task 3.
> **Q2 RESOLVED:** tabela de auditoria única e consolidada em `14-AUDITORIA.md`, com seções por categoria — criada no 14-01-PLAN.md e consolidada no 14-05-PLAN.md.

1. **Onde exatamente fica o texto renderizado do onboarding (`#onbBody`)?**
   - O que sabemos: o container está na linha 991-1005; `radar_onboard` é a chave de persistência; os 3 cartões são construídos via JS (não há HTML estático linha a linha para os 3 slides).
   - O que é incerto: a função exata que gera o conteúdo textual de cada cartão (constante tipo `ONB_CARDS` ou função `onbRender()`) não foi localizada por grep direto nesta pesquisa — precisa de 1 grep adicional (`onbBody\.innerHTML|ONB_` ) no início da fase de planejamento/execução para achar a âncora exata.
   - Recomendação: a task de varredura de "onboarding" no plano deve começar com esse grep, não assumir a linha.

2. **A tabela de auditoria deve ser 1 artefato por categoria ou 1 artefato único?**
   - O que sabemos: CONTEXT.md pede 1 tabela com colunas (string original → veredito → string final → critério §26).
   - O que é incerto: se o volume (~230-260 linhas) deve ser quebrado em sub-tabelas por categoria/wave para facilitar revisão incremental.
   - Recomendação: decisão de planejamento (não bloqueia pesquisa) — provavelmente 1 tabela por wave/categoria, consolidada no SUMMARY final da fase.

## Environment Availability

Fase sem dependência externa (sem CLI/serviço novo) — apenas Node.js (já instalado, v24.16.0, confirmado nesta pesquisa) para rodar `npm test`. Seção completa omitida por não haver dependências a auditar além do runtime já em uso pelo projeto inteiro.

## Sources

### Primary (HIGH confidence — leitura direta do código nesta sessão)
- `radar-goiania.html` (5305 linhas) — leitura completa do bloco RADAR_PURE (linhas 1135-2005) + grep sistemático de `<button>`, `placeholder=`, `aria-label=`, `title=`, `toast(`, blocos `.empty`
- `index.html`, `manifest.json`, `sw.js` — leitura completa (arquivos pequenos)
- `tests/templates.test.mjs`, `tests/negocio.test.mjs`, `tests/doc.test.mjs`, `tests/scores.test.mjs`, `tests/predio.test.mjs` — leitura completa das asserções
- `npm test` executado ao vivo nesta sessão — 107/107 testes verdes, confirmando baseline antes da fase
- `.planning/config.json` — leitura direta (`nyquist_validation: true`, `security_enforcement: true`)

### Secondary (MEDIUM confidence)
Nenhuma — pesquisa não usou fontes externas (conforme instrução explícita do escopo: "No external/web research needed").

### Tertiary (LOW confidence)
Nenhuma.

## Metadata

**Confidence breakdown:**
- Inventário da microcopy: HIGH — contagens via grep direto no arquivo real, âncoras de linha verificadas
- Achados concretos (A1-A4): HIGH — verificados por leitura de código + confirmação cruzada com fixtures/testes
- Acoplamento de teste: HIGH — confirmado rodando `npm test` e lendo cada arquivo de teste linha a linha
- Validation Architecture: HIGH — framework/comando confirmados via `package.json` + execução ao vivo

**Research date:** 2026-07-09
**Valid until:** válido até a próxima alteração de `radar-goiania.html`/`tests/` (o inventário é um snapshot do código; se novas fases forem inseridas antes da execução da Fase 14, revalidar contagens e âncoras de linha)
