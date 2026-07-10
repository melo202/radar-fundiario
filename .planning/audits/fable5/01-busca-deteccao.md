# Auditoria Fable 5 — Área 01: Busca & Detecção de Intenção

- **Área:** 01 — Busca & Detecção de Intenção (caixa única, `detectMode`, `buscar`, `finish`, geo-paste, deep-link, autocomplete, desambiguação)
- **Arquivo:** `radar-goiania.html` (~8.138 linhas)
- **Data:** 2026-07-10
- **Modelo:** Fable 5
- **Baseline de testes:** 252 verde (`npm test` reconfirmado nesta auditoria; nenhum teste alterado)
- **Modo:** somente-leitura. Nenhum arquivo de código ou teste foi modificado. Segurança fora de escopo.

Provas geradas via `node:vm` carregando o bloco `RADAR_PURE` real do HTML (mesma técnica de `tests/detectmode.test.mjs`).

---

## [BUSCA-01] radar-goiania.html:7784-7792 | critical | `applyDetectAndSearch` não tem ramo `bd` — buscar prédio pela caixa + Enter falha sempre

**Descrição.** O Enter na caixa única (linha 7953) chama `applyDetectAndSearch(LASTDETECT.mode, LASTDETECT)`. A função só trata `ql`, `addr` e `insc` — **não existe ramo `else if(mode==="bd")`**, então o campo `#predio` nunca é preenchido a partir de `fields.predio`. Logo `buscar()` no `MODE==="bd"` (linha 4799+) lê `#predio` vazio, `toks` fica vazio e cai em `toast("Digite o nome do edifício (mínimo 3 letras).")` — mesmo o usuário tendo digitado o nome. A função irmã `forceMode()` (7757-7774, menu de correção) e o handler de exemplos (7981) **têm** o ramo `bd`; só o caminho principal do Enter o perdeu — forte sinal de omissão, não de decisão.

Impacto amplo: a **regra 6** de `detectMode` (fallback para qualquer texto sem número/tipo-de-via) retorna `mode:"bd"`, e a regra 4 (`ED/EDF/RES/COND/...`) também. Ou seja, **toda** busca por nome próprio de prédio via Enter quebra.

**Cenário concreto (provado).**
```
detectMode("Riviera")        => mode=bd conf=media  predio="Riviera"   label="Prédio (?) · Riviera"
detectMode("Portal do Sol")  => mode=bd conf=media  predio="Portal do Sol"
detectMode("Ed Riviera")     => mode=bd conf=alta   predio="RIVIERA"   label="Prédio · RIVIERA"
```
Usuário digita `Riviera`, o chip mostra "Prédio (?) · Riviera", pressiona Enter → skeleton pisca → toast "Digite o nome do edifício (mínimo 3 letras)" + estado vazio. Confiança `media` passa pela guarda do Enter (`if(!LASTDETECT||LASTDETECT.confidence==="baixa")return;`), então dispara mesmo. Workarounds existentes (chip → menu de correção → tocar "Prédio"; ou chips de exemplo) funcionam, o que confirma que só o Enter está quebrado.

**Proposta de fix.** Adicionar em `applyDetectAndSearch` o ramo ausente, espelhando `forceMode`:
```js
else if(mode==="bd"){document.getElementById("predio").value=fields.predio||document.getElementById("caixaInput").value||"";}
```

---

## [BUSCA-02] radar-goiania.html:7874-7883, 7965-7968 | warning | Chips de desambiguação descartam o setor já detectado/lembrado → beco sem saída

**Descrição.** Para entrada ambígua (número curto isolado, `mode:null`, confiança baixa), `renderAmbig(r)` constrói os chips **usando apenas `r.digits`**; o handler de clique (`ambig.addEventListener`) passa adiante só `{rua,numero,quadra,value}`. O `r.bairroCode` — que `detectMode` pode ter anexado via `extractSetor`, e que `applyLastBairroIfNeeded` poderia ter preenchido com o último setor — é **silenciosamente descartado**. Como `applyDetectAndSearch` só chama `pickBairro` quando `fields.bairroCode` existe, o clique num chip cai em `buscar()` (modo `ql`/`addr`) sem setor → `resolveBairro()` falha → `toast("Escolha o setor na lista (digite e clique).")`. A feature de desambiguação, que promete "1 toque → busca", entrega um erro pedindo o setor.

**Cenário concreto (provado).**
```
detectMode("Bueno 100") => {mode:null, confidence:"baixa", digits:"100",
                            bairroCode:"106", bairroDisp:"Setor Bueno"}
```
O usuário digitou claramente o setor Bueno + o número 100. Os chips gerados são "Rua 100" / "Quadra 100"; o `bairroCode:"106"` já resolvido é jogado fora. Tocar "Quadra 100" → `buscar()` `ql` sem `#bairro` → erro "Escolha o setor". Também vale para o primeiro uso do app (sem `radar_lastbairro`): qualquer chip ambíguo dá o mesmo beco.

**Proposta de fix.** Propagar o setor detectado nos chips e no aplicador: gravar `data-bairro="${esc(r.bairroCode||"")}"` em `renderAmbig`, incluí-lo em `applyDetectAndSearch({...,bairroCode:b.dataset.bairro})`, e rodar `applyLastBairroIfNeeded`/`extractSetor` também na montagem dos chips ambíguos para herdar o último setor quando a frase não trouxe um.

---

## [BUSCA-03] radar-goiania.html:1582-1608 | warning | Ruas de Goiânia nomeadas por letra ("Rua Q 15") viram Quadra — regra 2 antes da regra 3

**Descrição.** A ordem contratual de `detectMode` roda Quadra+Lote (regra 2) **antes** de Endereço (regra 3). O regex de quadra `\bQ(?:D|UADRA)?\.?\s*(\d+[A-Z]?)\b` casa a sequência "Q <número>" em qualquer posição da frase, inclusive quando "Q" é o **nome** de uma rua (loteamentos de Goiânia usam ruas de letra única: "Rua Q", "Rua T", etc.). Como a regra 2 vence, `TIPOVIA_DETECT` (que reconheceria "Rua") nem é consultada.

**Cenário concreto (provado).**
```
detectMode("Rua Q 15")  => mode=ql   quadra=15   label="Quadra 15"   (esperado: Endereço, Rua Q nº 15)
detectMode("Rua SC 2")  => mode=addr rua="Rua SC 2"                    (correto — SC não casa \bQ)
TIPOVIA_DETECT.test("rua q 15") === true                              (a regra 3 casaria, mas não chega a rodar)
```
"Rua Q 15" é lido como Quadra 15 e leva o usuário ao modo/consulta errados. A superfície é estreita (exige a letra Q — ou QD/QUADRA — imediatamente seguida de dígitos), mas é um padrão real de endereço em Goiânia.

**Proposta de fix.** Antes de aceitar o match de quadra "cru", verificar se um tipo de via precede o "Q" na frase (ex.: exigir que a regra 2 não dispare quando `TIPOVIA_DETECT` casa e o token de via aparece antes do "Q"), ou tornar a regra 2 mais estrita exigindo a palavra `QUADRA`/`QD` (não o "Q" solto) quando há tipo de via na frase.

---

## [BUSCA-04] radar-goiania.html:7910-7923, 3688-3702 | warning | Dedup de coordenada (`lastGeoKey`) bloqueia o retry após falha, contradizendo o toast "Tente de novo"

**Descrição.** No caminho de geo-paste, `runDetect` grava `lastGeoKey` **antes** de a consulta espacial resolver (linha 7920) e só chama `identifyPoint` quando a chave muda. Se `identifyPoint` falhar (rede/timeout → `toast("Falha ao identificar o ponto. Tente de novo.")`, linha 3700), `lastGeoKey` permanece na coordenada que falhou. Como o texto da caixa continua sendo a mesma coordenada, qualquer nova tentativa (colar de novo o mesmo link, ou um tick de debounce) recai em `geoKey===lastGeoKey` e **é descartada** — a mesma coordenada nunca re-dispara. Diferente do erro de `buscar()`, que oferece o botão "Tentar de novo" em `#results`, o geo-paste não tem afordância de retry e a guarda de dedup impede o retry natural.

**Cenário concreto.** Corretor cola um link do Maps offline momentâneo → toast "Falha ao identificar o ponto. Tente de novo." → volta a conexão → cola o **mesmo** link/coordenada → nada acontece (dedup bloqueia). Só re-dispara se ele alterar a coordenada.

**Proposta de fix.** Limpar `lastGeoKey=null` no `catch`/`finally` de `identifyPoint` (ou só marcar a chave como "consumida com sucesso" após o `finish`), para que uma falha permita re-tentar a mesma coordenada. Alternativamente, oferecer o mesmo botão "Tentar de novo" do fluxo de `buscar()`.

---

## [BUSCA-05] radar-goiania.html:7949-7954 | info | Dropdown de sugestões (`#caixaList`) não fecha ao buscar via Enter (sem item selecionado)

**Descrição.** Quando o usuário digita, `runDetect` chama `updateCaixaList(val)` e o dropdown de sugestões (Setor/Rua) abre (`.show`). Se ele pressiona Enter **sem** ter navegado com as setas (`caixaActive===-1`), `caixaEnterSelect()` retorna `false` e o fluxo segue para `applyDetectAndSearch(...)` → `buscar()`. Nenhum desses passos chama `closeCaixaList()` (só o caminho de geo-paste o faz, linha 7916). O dropdown fica aberto sobre os resultados até o próximo `pointerdown` fora dele. É polimento de UX (§26 "estados limpos"), não quebra de correção.

**Cenário concreto.** Digitar "Marista quadra 128 lote 5", o dropdown de sugestões abre; Enter → a busca roda e renderiza, mas a lista de sugestões permanece flutuando por cima até um toque fora.

**Proposta de fix.** Chamar `closeCaixaList()` no início de `applyDetectAndSearch` (ou no handler de Enter, logo antes de disparar a busca), como já se faz no ramo de geo-paste.

---

## Resumo

| ID | Sev | Local | Tema |
|----|-----|-------|------|
| BUSCA-01 | critical | 7784-7792 | Enter em nome de prédio nunca busca (ramo `bd` ausente) |
| BUSCA-02 | warning | 7874-7883 / 7965-7968 | Chips de desambiguação descartam o setor detectado/lembrado |
| BUSCA-03 | warning | 1582-1608 | "Rua Q 15" (rua de letra) detectada como Quadra |
| BUSCA-04 | warning | 7910-7923 / 3688-3702 | Dedup de geo bloqueia retry após falha |
| BUSCA-05 | info | 7949-7954 | Dropdown de sugestões não fecha no Enter |

Total: 5 achados (1 critical, 3 warning, 1 info). Baseline 252 verde mantido; nenhum arquivo alterado.
