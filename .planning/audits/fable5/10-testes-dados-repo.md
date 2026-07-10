# Auditoria Fable 5 — ÁREA 10: Suíte de Testes, Dados & Repositório

- **Área:** 10 — Suíte de testes, datasets e documentação do repositório
- **Data:** 2026-07-10
- **Auditor:** Fable 5 (somente-leitura)
- **Baseline:** 252 testes (`npm test` → tests 252 / pass 252 / fail 0, duration ~174ms)
- **Escopo:** `tests/*.test.mjs` + `tests/fixtures.mjs`, `package.json`, datasets (`bairros-goiania.json`, `bairro-cdbairro.json`, `logradouros-goiania.json`, `caixa-goiania.js`), scripts Python, docs do repo.
- **Já conhecidos (não re-reportados):** C-08 (montarNeg/montarLaudo/montarFichaRapida sem teste, DOM); C-13 (extensoCasos sem caso ≥1bi nem milhão-com-centavos).

## Números de referência (medidos)

| Dataset | Medição real |
|---|---|
| `bairros-goiania.json` | 1206 features, **1205 ids distintos** (1 duplicado), 687 cds distintos após mapeamento |
| `bairro-cdbairro.json` | 1119 entradas, **0 órfãos** (todas as chaves ∈ features), mo = {unico:339, nome:396, maioria:384}, todas as chaves com 12 dígitos |
| `logradouros-goiania.json` | 9852 registros, **íntegro** (0 sem nome/tipo/localidade; 0 dup nome+localidade) |
| `caixa-goiania.js` | 178 imóveis, **64 sem x/y (36%)**, 11 sem cb, cb=1194 órfão, 0 ids dup, pr={q:45, r:69, ausente:64} |
| RADAR_PURE | 82 funções `function` no bloco (linhas 1441–2997) |

---

## Achados

### [REPO-01] tests/*.test.mjs (todos) | MÉDIA | Nenhum teste valida os datasets EMBARCADOS — corrupção na regeneração passa silenciosa
**Descrição:** Os 252 testes exercitam apenas funções puras contra fixtures sintéticas. Nenhum teste carrega nem valida os JSON/JS realmente publicados. O único `readFileSync` dos testes lê `radar-goiania.html` (para extrair RADAR_PURE via `node:vm`), nunca os datasets.
**Evidência:** `grep readFileSync tests/*.mjs` → 8 arquivos, todos apontando para o HTML; `tests/fixtures.mjs:980` é a única menção a JSON e é a string `"{isso nao e json valido"` (fixture de import malformado). Todos os defeitos concretos abaixo (REPO-02/03/05) são **invisíveis** à suíte — uma regeneração corrompida do `gerar-*.py`/`atualizar-caixa.py` passaria no CI.
**Proposta:** Adicionar `tests/datasets.test.mjs` que carregue os 4 datasets reais e asserte invariantes de integridade referencial (ver REPO-03/05): unicidade de `feature.id`, chaves cdbairro ⊆ ids, contagens mínimas, formato de chave (12 dígitos), coerência x/y.

### [REPO-02] ROADMAP-radar.md:14, PROJETO-radar.md:36/48, INTELIGENCIA-radar.md:10 | MÉDIA | Docs contradizem o código sobre `outFields` restrito no cadastro
**Descrição:** Três docs afirmam categoricamente que o endpoint de **cadastro** rejeita `outFields` específico (Erro 400) e que "só `outFields=*` funciona". O código atual faz o OPOSTO em produção: usa `outFields` restrito como caminho PRIMÁRIO.
**Evidência:**
- Docs: `ROADMAP-radar.md:14` "outFields com campos específicos | Erro 400 — só outFields=* funciona"; `PROJETO-radar.md:48` "rejeita pedir campos específicos... (erro 400). Solução: sempre outFields=*"; `INTELIGENCIA-radar.md:10` "returnDistinctValues (único caso onde outFields específico funciona)".
- Código: `radar-goiania.html:3972` `fetchWhereRestrito(...)` — comentário "verificado ao vivo: **funciona, ~80% menos payload**" (Fase 15), com fallback para `*` só em erro; `atualizar-caixa.py:114` pede `"outFields": "cdbairro,nmbairro"` em produção e funciona.
- Observação de reforço: as docs estão certas quanto ao `Mapa_ModeloEspacial` (SÓ aceita `*` — confirmado em `radar-goiania.html:4049/4127`, "verificado ao vivo 2026-07-10"), mas erradas quanto ao cadastro.
**Proposta:** Atualizar o quirk nas 3 docs para distinguir por serviço: cadastro ACEITA outFields restrito (Fase 15); `Mapa_ModeloEspacial` exige `*`.

### [REPO-03] bairros-goiania.json | BAIXA-MÉDIA | `feature.id` duplicado (000400001169) — geometria da 2ª cópia é ofuscada em lookups por id
**Descrição:** 1206 features mas 1205 ids distintos. O id `000400001169` ("Gleba não denominada") aparece 2×, cada um com um polígono distinto. Em `construirCdbairroParaNome` (primeiro-vence) e em qualquer mapa chaveado por id, a 2ª cópia é silenciosamente descartada.
**Evidência:** `node -e` sobre o dataset: `duplicate ids: ['000400001169']`; ambas as cópias `nm_bai:"Gleba não denominada"`, `geomType: Polygon`, `coordsLen` 241 vs 147 (geometrias diferentes). Impacto real baixo (ambas anônimas), mas nenhuma checagem de unicidade existe.
**Proposta:** Asserção de unicidade de id no teste de datasets (REPO-01); decidir no `gerar-bairros.py` se merge de multipolígono ou sufixo de id.

### [REPO-04] bairro-cdbairro.json vs bairros-goiania.json / ROADMAP-radar.md:20 | MÉDIA | 86 bairros sem mapeamento cdbairro + contagem "709 setores" não bate com o dataset (687)
**Descrição:** 86 dos 1205 ids de feature não têm entrada em `bairro-cdbairro.json` — esses bairros nunca resolvem para um cdbairro e ficam mudos no cruzamento/rotulagem de setor. Além disso o dataset local produz 687 cds distintos, enquanto `ROADMAP-radar.md:20` afirma "Setores distintos | 709".
**Evidência:** `node -e`: `bairros feature ids NOT in cdbairro: 86` (ex.: 000400000729, 000400001143…); `distinct cd values: 687`; `ROADMAP-radar.md:20` "| Setores distintos | 709 |". (A direção inversa é limpa: 0 chaves cdbairro fora das features.) Nenhum teste guarda a cobertura do mapeamento.
**Proposta:** Documentar/reconciliar 687 vs 709 (o 709 parece do endpoint ao vivo; o dataset local diverge); registrar os 86 ids sem cd como lacuna conhecida ou completá-los.

### [REPO-05] caixa-goiania.js | BAIXA | 64/178 (36%) sem x/y (documentado e testado); cb órfão/nulo é inócuo por design
**Descrição:** 36% dos imóveis Caixa não têm coordenada e são **silenciosamente excluídos** do cruzamento (guard `i.x&&i.y`). Isso é intencional, documentado e — bom sinal — **coberto por teste** (`diff-caixa.test.mjs:225` "só inclui imóveis com i.x&&i.y" + fixture `setorBuenoSemXY`). O cb órfão (1194) e os 11 sem cb NÃO são defeitos: `radar-goiania.html:2692` diz "CAIXA.imoveis[i].cb ... NÃO é cdbairro fiscal — **sempre ignorado aqui**"; o cruzamento usa o nome `b` via `cdbairroDoImovelCaixa`.
**Evidência:** `sem x&y: 64 | sem cb: 11 | cb NÃO em cdbairro.cd: 1 [1194]`; `INTELIGENCIA-radar.md:84` "114/178 geocodificados" — **exato** (178−64=114). Campo `cb` é dado morto por design (armazenado, nunca lido no fluxo de cruzamento).
**Proposta:** Nenhuma correção de bug; opcionalmente parar de emitir `cb` no `atualizar-caixa.py` (dado morto) e/ou documentar o 36% ungeocoded como métrica de qualidade de fonte, não como falha.

### [REPO-06] tests/busca.test.mjs:26 (isGarage) | BAIXA-MÉDIA | isGarage exportado mas nunca asserido diretamente; 3 de 6 ramos do regex sem teste
**Descrição:** `isGarage` só aparece na lista de `__exports` — 0 chamadas em asserts. É exercitado apenas indiretamente via fixtures de `ehAptoProvavel`, que cobrem só `BOX`/`VAGA`/`SUBSOLO`. Os ramos `GARAG`, `DEPOSITO` e `DEP\b` do regex `/\b(BOX|GARAG|VAGA|DEPOSITO|DEP\b|SUBSOLO)/` nunca são exercitados — uma regressão nesses alternantes (ex.: `DEP\b` vs `DEP`) passa silenciosa e contamina `ehAptoProvavel`/`resumoPredio`.
**Evidência:** `grep "isGarage(" tests/` → 0 resultados (só o export em `busca.test.mjs:26`); fixtures em `fixtures.mjs:645-648` cobrem BOX/VAGA/SUBSOLO apenas.
**Proposta:** Casos de `isGarage` diretos para GARAGEM, DEPOSITO e "DEP" (fronteira de palavra), incluindo negativo tipo "DEPENDÊNCIA" que NÃO deve casar `DEP\b`.

### [REPO-07] tests/templates.test.mjs:143 (captAbordagem) + negocio:50, predio:261, doc:63/167 | BAIXA | Asserts frágeis "string não-vazia" mascaram regressões de conteúdo
**Descrição:** Vários testes verificam apenas `typeof===string && .length>0`. O caso mais concreto: `captAbordagem` tem SÓ a checagem de não-vazio (loop de 4 funções), enquanto suas irmãs `captScript`/`captChecklist`/`captFollowup` ganham asserts de conteúdo (passos numerados, 5 bullets, endereço interpolado). Uma regressão que mude o corpo de `captAbordagem` para qualquer texto não-vazio passa.
**Evidência:** `templates.test.mjs:143-147` (loop não-vazio) vs `:150/157/168` (asserts de conteúdo das outras 3); mesmos asserts fracos em `negocio.test.mjs:50`, `predio.test.mjs:261`, `doc.test.mjs:63,167`.
**Proposta:** Adicionar ≥1 asserção de conteúdo por função de texto (substring esperada / ausência de placeholder), ao menos para `captAbordagem`.

### [REPO-08] gerar-bairros.py, gerar-logradouros.py, atualizar-caixa.py, check-bairros-geojson.py | BAIXA-MÉDIA | Pipeline de geração de dados sem NENHUM teste
**Descrição:** Os scripts que produzem os datasets (transform EPSG:31982 em `gerar-bairros.py`, geocodificação/mapeamento de campos em `atualizar-caixa.py`) não têm cobertura automatizada. São exatamente a origem dos defeitos REPO-03/04 (id duplicado, 86 sem cd). `package.json` só roda `node --test "tests/*.test.mjs"` — Python fica fora do CI.
**Evidência:** `package.json` script test = `node --test "tests/*.test.mjs"`; nenhum `test_*.py`/pytest no repo; `atualizar-caixa.py:139` seta `cb`, `:173-175` seta x/y só quando `x_coord`&`y_coord` existem (fonte dos 64 sem coordenada).
**Proposta:** Ao menos um teste de sanidade pós-geração (contagens, unicidade de id, faixa de coordenadas UTM plausível para Goiânia) — pode ser Node lendo o output, reaproveitando o teste de REPO-01.

### [REPO-09] tests/caderno.test.mjs:46 (tsCaderno) | BAIXA | tsCaderno exportado mas sem assert direto; empate de timestamp não exercitado
**Descrição:** `tsCaderno` (chave de ordenação do merge de caderno) só aparece na lista de `__exports` — coberto apenas de forma incidental via `mergeCadernoImport`. O fallback `updatedAt||savedAt` e o caso de timestamps iguais (desempate) não são exercitados diretamente.
**Evidência:** `grep tsCaderno tests/` → 1 ocorrência, a linha de export (`caderno.test.mjs:46`); `radar-goiania.html:1167` `tsCaderno` faz `String(updatedAt||savedAt||"")`.
**Proposta:** Caso direto para `tsCaderno` com `savedAt` presente e `updatedAt` ausente, e um par com timestamps iguais confirmando estabilidade do merge.

---

## Verificações que passaram (sem achado)

- **logradouros-goiania.json**: 9852 registros, 0 sem nome/tipo/localidade, 0 duplicatas nome+localidade — íntegro.
- **bairro-cdbairro.json**: 0 chaves órfãs (todas ∈ features), 100% chaves com 12 dígitos, 0 cd nulo.
- **Exclusão x/y do cruzamento Caixa**: coberta por teste (`diff-caixa.test.mjs:225`).
- **INTELIGENCIA-radar.md:84 "114/178 geocodificados"**: numericamente exato (178−64).
- **Cobertura de funções puras**: das 82 funções, só 7 sem referência direta em teste (brlSimples, enderecoSimples, extensoInteiro, nomeOuVazio, docEnderecoTxt, imovelDescTxt, blocoAssinatura) — todas cobertas INDIRETAMENTE via chamadores testados (propostaTexto/contratoTexto/termoExclusividadeTexto/faixaTxt/numeroPorExtenso); o ramo de alta magnitude de extensoInteiro é o C-13 já conhecido.
- **sw.js**: `CACHE = "radar-v7"` — coerente com a estratégia network-first documentada no cabeçalho.
