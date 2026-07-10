# S-A — Auditoria XSS / Injeção de Conteúdo

- **Data:** 2026-07-10
- **Auditor:** Fable 5 (S-A — XSS / injeção de conteúdo), somente-leitura
- **Escopo:** diff `v2.2..HEAD` (27 commits: lapidação Fable 5, fix de detecção de busca BUSCA-06, troca de paleta petróleo) sobre `radar-goiania.html`, `sw.js`, `caixa-goiania.js`
- **Cenário de deploy:** app HTML único client-side, exposto publicamente em VPS+domínio
- **Vetores tratados como reais em produção:** IndexedDB importável (caderno JSON de arquivo) e input do usuário (busca, colagem, wizard). O endpoint ArcGIS é JSONP (executa script por construção — fora do modelo de ameaça de XSS por terceiro).

## Veredito

**0 findings. 0 XSS alcançável por terceiro. A migração `on*`→`data-*`+dataset está completa e consistente no diff.**

Nenhuma interpolação introduzida ou alterada no diff quebra o contrato de escape do projeto. Todo dado de terceiro (endpoint / IndexedDB importável / input / colagem) que chega a `innerHTML` passa por `esc()`; todo `on*` inline com interpolação usa enum/array fixo definido no código-fonte ou índice numérico — nunca texto livre.

---

## O que foi verificado e está LIMPO

### 1. Import do caderno (JSON de arquivo → IndexedDB → render) — o alvo de maior valor
- `validarImportCaderno` (radar-goiania.html:2765) → `sanitizeCaderno` (2726) aplica allowlist positiva `CADERNO_ALLOW`; `ci` fora de `CADERNO_CI_RE` é **zerado e o item é re-filtrado** (2769/2729) — um `ci` malicioso (`"><script>`) nunca sobrevive; `tag`/`nota`/`endereco` são coeridos a `String` e truncados, mas **não escapados aqui** (escape é no render).
- `renderCadernoBlock` (radar-goiania.html:6469-6519): `endereco`, `nota` (preview + textarea), `tag` (value de input), `ci` (data-ci), `cdbairro`, `nrquadra`, `nrlote`, nome do setor — **todos via `esc()`**. `esc()` (1444) escapa `& < > " '`, então breakout de atributo (`value="${esc(tag)}"`) e de conteúdo é bloqueado. Status chips usam `onclick="cadernoStatusUI(this,'${s}')"` com `s` ∈ `CADERNO_STATUS` (enum fixo) — seguro.
- `mergeCadernoImport` (2781): pura, decide por `ci`/timestamp; não renderiza.

### 2. Migração `on*` → `data-*` (chip de detecção / desambiguação)
- `renderAmbig` (radar-goiania.html:8237-8256): botões usam `data-mode`/`data-bairro`/`data-rua`/`data-numero`/`data-quadra`/`data-value` com `esc()`; `n=r.digits` é só dígitos. Handler lê via `b.dataset.*` (8351) → `applyDetectAndSearch` — **nenhuma string JS reconstruída**. Migração completa, sem resquício de interpolação em `on*`.
- `renderChip` (4056): rótulo via `.textContent` (não innerHTML). `forceMode(...)` (1018-1022): literais fixos.

### 3. `montarNeg` — replace `\n`→`<br>` depois do `esc()` (ZAP/DOC/C-14)
- radar-goiania.html:7186: `esc(...).replace(/\n/g,"<br>")` — o `esc()` roda ANTES; o `<br>` inserido é o único markup, conteúdo do usuário já neutralizado. Título/assinaturas/corretor/disclaimer todos via `esc()`. Seguro.

### 4. BUSCA-06 (endereço nome+número vira addr) e detecção
- `raw`/`rua` do usuário flui só para `.value` de campos de formulário (`applyDetectAndSearch`, 8149) e daí para query do endpoint — **nunca para `innerHTML` sem escape**. `parseGeoPaste` (8161) retorna só números; chip por `.textContent` com `toFixed(5)`.
- Estado "sem resultado" (5190): `data-rua="${esc(ruaTxt)}"` + `tentarComoPredio(this)` lê `dataset.rua` (padrão seguro documentado); mensagens são literais fixos.

### 5. Wizard de laudo / seletor de documento (templates tocados na Onda 1)
- radar-goiania.html:7289/7297/7316/7318: `finEscolherDoc('${doc}')`, `finSet('${v}')`, `wizSet('conserv','${c}')`, `wizDif('${d}')` — `doc/v/c/d` ∈ `ORDEM`/`OPCOES`/`CONSERVS`/`DIFS`, arrays fixos no fonte. Dados da ficha (`a.*`) via `esc()`. Seguro.

### 6. Plano Diretor (PD-01..04) e Território/choropleth
- Render PD (3092-3115): `nota_ca`, `nota_altura`, `fonte`, `usos`, `unidade.*` via `esc()`; `taxa_ocupacao`/`altura_max` são literais numéricos da tabela estática `PD_UT`/`PD_MZC_BASICO` (2963-2973), não alcançáveis por terceiro.
- Detector de subutilizados (4867-4884): `esc(q/l)`, `esc(leituraDetector())`, áreas via `Math.round`, índice `${i}` numérico. Território (4684) e badge Caixa (`data-bairros="${esc(...)}"`, 6461) escapados.

### 7. Colagem (paste)
- `parseGeoPaste`/`parseMatricula`: extração literal/numérica; resultado vai a `.textContent` do chip ou a `.value` de formulário. Nenhum caminho renderiza o colado cru em HTML.

### 8. Paleta petróleo (e9e2b53 / 7d1a5de)
- Alterações puramente CSS (hex/tokens `:root` + `style="background:#..."` estáticos em legenda). Sem superfície de injeção.

### 9. Combo de setor / caixa (fora do diff, verificado por contexto)
- `id="${h.id}"` / `data-kind="${h.kind}"` (4033-4034, pré-v2.2, **fora de escopo**) são construídos de valores seguros: `id` = `"opt-bai-"+code.replace(/\D/g,"")` ou `"opt-rua-"+i` (dígitos/índice), `kind` ∈ `{"setor","rua"}`. `code`/`label`/`sub`/`__nome` via `esc()`. Não é vetor.

## Verificações negativas (buscas que voltaram vazias)
- `grep` de `on*="...${...}..."` em todo o arquivo: 14 ocorrências, todas classificadas acima (enum fixo ou índice numérico); 2 delas (1443, 5312) são **comentários** documentando o próprio anti-padrão CR-01.
- Nenhum `document.write`, nenhuma `insertAdjacentHTML`/`outerHTML` com dado externo no diff.
