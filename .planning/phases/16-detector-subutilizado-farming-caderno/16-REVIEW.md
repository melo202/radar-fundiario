---
phase: 16-detector-subutilizado-farming-caderno
reviewed: 2026-07-10T01:22:57Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - radar-goiania.html
  - tests/caderno.test.mjs
  - tests/fixtures.mjs
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-07-10T01:22:57Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Revisão focada no diff da Fase 16 (`01a0419..HEAD`, commits `2dd3612`..`435719c`), que adiciona o Detector de Lote Subutilizado (funções puras `medianasPorQuadra`/`limiarQuadraValorizada`/`razaoOcupacao`/`detectarSubutilizados`/`leituraDetector` em `RADAR_PURE`), o Caderno de território (`sanitizeCaderno`/`statusValido`/`validarImportCaderno` em `RADAR_PURE` + o wrapper IndexedDB `CADERNO_IO`), a UI de `#cadernoBlock`/`#terrDetectorView`, e o destaque no mapa via `lotStyle()`.

As funções puras novas (detector e decisão do Caderno) estão bem cobertas por `tests/caderno.test.mjs`/`tests/fixtures.mjs`, respeitam a guarda 0-vs-null de `areaedif` (Pitfall 1) corretamente e a allowlist positiva de `sanitizeCaderno` de fato bloqueia `dtnascimen`/`cpf`/`nmproprie`/campos desconhecidos. O detector não dispara requisição própria (reusa `territorioScan`/`TERRCACHE`), e a prioridade do destaque gold sobre o choropleth em `lotStyle()` está correta.

Porém foi encontrada uma vulnerabilidade **Critical** real: a renderização do `#cadernoBlock` reintroduz exatamente o padrão de XSS já documentado e corrigido em `08-REVIEW.md` (CR-01/IN-01) — `esc(it.ci)` interpolado dentro de um literal de string JS num atributo `onclick`/`onblur` inline, agora alcançável através de um arquivo de importação (`cadernoImportarJSON`) cujo campo `ci` não é validado quanto a formato/charset. Também há 3 Warnings (limpeza incompleta do destaque do detector ao fechar o painel do território; conexões IndexedDB nunca fechadas / sem `onblocked`, colocando em risco o upgrade de versão já reservado para a Fase 17; limites de `tag`/`nota` só impostos no HTML, não no código) e 3 itens Info (função morta, número mágico duplicado, mensagem de degradação duplicada).

## Critical Issues

### CR-01: `esc(it.ci)` dentro de atributo `onclick`/`onblur` inline reintroduz o JS-string-breakout já corrigido em 08-REVIEW.md — explorável via importação de JSON

**File:** `radar-goiania.html:4901` (`cadernoStatusUI`), `4903` (`data-ci`, seguro), `4912` (`cadernoTagUI`), `4913` (`cadernoNotaUI`), `4914` (`cadernoRemoverUI`) — dentro de `renderCadernoBlock()`
**Issue:**
```js
return `<button type="button" class="${s==='fechou'?'is-fechou':''}" aria-pressed="${ativo}" onclick="cadernoStatusUI(this,'${esc(it.ci)}','${s}')">${CADERNO_STATUS_LBL[s]}</button>`;
...
<input ... onblur="cadernoTagUI(this,'${esc(it.ci)}')">
<textarea ... onblur="cadernoNotaUI(this,'${esc(it.ci)}')">...
<button type="button" class="cadbook-rm" onclick="cadernoRemoverUI(this,'${esc(it.ci)}')">Remover do caderno</button>
```
`esc()` faz HTML-entity-encoding para contexto de **atributo HTML** (`& < > " '` → `&#39;` etc.), mas aqui o valor escapado é colocado dentro de um **literal de string JS** de aspas simples, ele mesmo dentro do atributo `onclick`/`onblur`. O navegador faz o HTML-decode do valor do atributo *antes* de entregá-lo ao parser JS como código do event handler — então `&#39;` volta a ser `'` no momento da execução, e uma aspas simples no valor de `it.ci` fecha a string JS antecipadamente e injeta o restante como JavaScript arbitrário. Esse é exatamente o bug documentado em `.planning/phases/08-busca-unica-inteligente/08-REVIEW.md` (CR-01) e a lacuna latente apontada em IN-01 do mesmo review (`esc()` é dual-purpose e não deveria ser usado dentro de `onclick="...'${esc(x)}'..."`).

O que torna isto **explorável de ponta a ponta** nesta fase: `it.ci` não é mais só um `ci` do endpoint ArcGIS (majoritariamente numérico) — ele também é gravado no IndexedDB diretamente a partir de um arquivo de backup **importado pelo usuário**, via `cadernoImportarJSON()` → `validarImportCaderno()` (`radar-goiania.html`, bloco `RADAR_PURE`). `validarImportCaderno` só exige `o.ci!=null` (nenhuma validação de tipo/charset) e `sanitizeCaderno` deixa `ci` passar sem alteração (está em `CADERNO_ALLOW`; a allowlist filtra só por CHAVE, nunca por FORMA/valor do conteúdo). Um arquivo `.json` malicioso com um item como:
```json
{"ci":"x');alert(document.cookie);('","cdbairro":16,"vlvenal":1,"areaedif":1,"areaterr":1}
```
passa por `validarImportCaderno` (`ok:true`), é gravado via `cadernoSalvar()` (sanitiza de novo, sem mudança), e na próxima `renderCadernoBlock()` (chamada automaticamente após o import) o payload é embutido nos 4 atributos inline acima. Basta a vítima clicar em qualquer chip de status, tirar o foco do campo de tag/nota, ou clicar em "Remover do caderno" naquele item para o JS injetado executar no contexto da página (podendo ler o próprio IndexedDB/localStorage — inclusive dados que a allowlist LGPD tenta proteger — e exfiltrar via `fetch`).

Note que a própria base de código já tem o padrão correto para este exato cenário, usado em `verNoMapa(ci)` (`radar-goiania.html:4383-4388`, comentário citando IN-01 08-REVIEW.md: "aceita o ELEMENTO do botão ... lê o ci do data-ci do pai — nada de texto interpolado em string JS inline") e no próprio `.cadbook-item` (`data-ci="${esc(it.ci)}"` em atributo, contexto seguro). A Fase 16 não seguiu esse padrão já estabelecido para os 4 handlers novos.

**Fix:** Ler `ci` do `data-ci` já presente no `.cadbook-item` via `.closest()`/`.dataset`, em vez de interpolar `it.ci` dentro da string do handler inline (`status`/`s` já é seguro — vem do enum fixo `CADERNO_STATUS`, não precisa mudar):
```js
// render (renderCadernoBlock):
return `<button type="button" class="${s==='fechou'?'is-fechou':''}" aria-pressed="${ativo}" onclick="cadernoStatusUI(this,'${s}')">${CADERNO_STATUS_LBL[s]}</button>`;
...
<input ... onblur="cadernoTagUI(this)">
<textarea ... onblur="cadernoNotaUI(this)">...
<button type="button" class="cadbook-rm" onclick="cadernoRemoverUI(this)">Remover do caderno</button>

// handlers:
function cadernoStatusUI(btn,status){
  const ci=btn.closest(".cadbook-item").dataset.ci;
  cadernoAtualizar(ci,{status}).then(()=>{...}).catch(()=>toast(ERRO_ESCRITA_CADERNO));
}
function cadernoTagUI(el){
  const ci=el.closest(".cadbook-item").dataset.ci;
  cadernoAtualizar(ci,{tag:el.value}).catch(()=>toast(ERRO_ESCRITA_CADERNO));
}
function cadernoNotaUI(el){
  const ci=el.closest(".cadbook-item").dataset.ci;
  cadernoAtualizar(ci,{nota:el.value}).then(...).catch(()=>toast(ERRO_ESCRITA_CADERNO));
}
function cadernoRemoverUI(btn){
  const ci=btn.closest(".cadbook-item").dataset.ci;
  ...
}
```
Como reforço defensivo adicional (não substitui o fix acima), considere restringir o tipo/forma de `ci` em `validarImportCaderno` (ex.: `typeof o.ci==="string"&&/^[\w.-]+$/.test(o.ci)` ou equivalente ao formato real de `nrinscr`/`ci` do cadastro) para que um arquivo importado nunca consiga introduzir um `ci` com caracteres de controle de sintaxe.

## Warnings

### WR-01: Fechar o painel do território (× / Esc / outros fluxos) não limpa o destaque do detector no mapa

**File:** `radar-goiania.html:3510-3516` (`fecharTerrPanel`), `3596-3607` (`mostrarDetectorView`/`fecharDetector`), `3432` (chamada de `fecharDetector()` em `montarPainel`)
**Issue:** `fecharDetector()` (que chama `limparDestaqueDetector()`, esvaziando `TERR_DETECTOR_HILITE` e re-aplicando `lotStyle()` nos polígonos) só é invocado (a) pelo botão "‹ Território" dentro do `#terrDetectorView`, e (b) por `montarPainel()` ao reabrir o painel (para qualquer setor). Ele **nunca** é chamado por `fecharTerrPanel()` — que é o handler de fechamento por ×, pela alça (`.grab`), pelo Esc (linha ~6230), e pelas chamadas de "1 sheet por vez" em `buscarNoSetor()` (~3534), `showDetail()`/WR-03 (~3861, ~4504). Resultado: se o usuário abre "Detectar oportunidades" (lotes ficam gold no mapa) e fecha o painel por qualquer um desses caminhos SEM reabri-lo depois, o destaque gold permanece nos polígonos já carregados indefinidamente — mesmo com o painel fechado e o usuário navegando livremente pelo mapa.
**Fix:** Chamar `limparDestaqueDetector()` (ou `fecharDetector()`, guardado para não quebrar quando a view já está oculta) dentro de `fecharTerrPanel()`, garantindo que todo caminho que fecha o painel também limpa o Set/re-estiliza os lotes:
```js
function fecharTerrPanel(){
  const p=document.getElementById("terrPanel");
  if(!p||!p.classList.contains("show"))return;
  p.classList.remove("show");
  limparDestaqueDetector(); // Fase 16: nunca deixar o gold do detector "vivo" com o painel fechado
  const b=document.getElementById("btnVerTerr");
  if(b&&!b.hidden)b.focus();
}
```

### WR-02: Conexões IndexedDB de `CADERNO_IO` nunca são fechadas; `cadernoAbrirDB()` não tem `onblocked` — risco concreto para o upgrade v1→v2 já planejado na Fase 17

**File:** `radar-goiania.html:3270-3282` (`cadernoAbrirDB`), e todas as funções que a chamam (`cadernoSalvar` ~3287, `cadernoAtualizar` ~3298, `cadernoRemover` ~3320, `cadernoListar` ~3330, `cadernoTem` ~3358, `cadernoContar` ~3370)
**Issue:** Cada uma das 6 funções de I/O chama `cadernoAbrirDB()` do zero e nunca chama `db.close()` — nem no `tx.oncomplete`, nem em nenhum outro ponto do arquivo. Isso significa que operações em sequência (ex.: `renderDetectorLista()` chamando `cadernoTem(ci)` uma vez por candidato, até 50 vezes por render) abrem dezenas de conexões `IDBDatabase` simultâneas que nunca são liberadas. Isoladamente isso não quebra nada hoje (IndexedDB permite múltiplas conexões concorrentes na mesma versão), mas colide diretamente com o upgrade de versão já reservado no próprio código (`CADERNO_VERSION=1; // Fase 17 sobe para 2`, comentário em `onupgradeneeded`): quando esse bump acontecer, **qualquer conexão aberta e nunca fechada** (de uma aba ainda ativa, ou até da mesma sessão que nunca fechou nada) faz o `indexedDB.open()` da nova versão disparar o evento `blocked` — e como `cadernoAbrirDB()` não tem `req.onblocked`, a Promise correspondente nunca resolve nem rejeita, travando silenciosamente qualquer leitura/escrita futura do caderno (sem toast, sem timeout, sem feedback ao usuário).
**Fix:** Fechar a conexão ao final de cada operação (ou manter uma única conexão compartilhada/cacheada e reabri-la só quando necessário), e adicionar um handler de `blocked`:
```js
req.onblocked=()=>reject(new Error("Outra aba está usando o caderno — feche as outras abas do Radar e tente de novo."));
```
e, por exemplo, em `cadernoSalvar`:
```js
return cadernoAbrirDB().then(db=>new Promise((resolve,reject)=>{
  const tx=db.transaction("caderno","readwrite");
  tx.objectStore("caderno").put(item);
  tx.oncomplete=()=>{db.close();resolve(item);};
  tx.onerror=()=>{db.close();reject(tx.error);};
}));
```

### WR-03: `sanitizeCaderno()` só filtra por chave (allowlist), nunca valida/trunca o VALOR de `tag`/`nota` — limite de 40/500 caracteres existe só no HTML, é trivialmente contornável

**File:** `radar-goiania.html` (`sanitizeCaderno`, bloco `RADAR_PURE`, ~linha 2295 no diff atual) + `cadernoAtualizar` (~3298) + `cadernoImportarJSON`/`validarImportCaderno`
**Issue:** Os limites `maxlength="40"` (`.cadbook-tag`) e `maxlength="500"` (`.cadbook-nota`) são atributos do `<input>`/`<textarea>`, aplicados só durante digitação real no navegador — não protegem contra: (a) um item importado via `cadernoImportarJSON()` com `tag`/`nota` arbitrariamente longos (`validarImportCaderno` só checa `ci!=null`, e `sanitizeCaderno` não trunca valores), (b) atribuição programática de `.value` antes de disparar o blur, (c) qualquer chamador futuro de `cadernoAtualizar`/`cadernoSalvar` fora da UI atual. Não é uma vulnerabilidade de XSS (o `esc()` no render continua neutralizando markup), mas anula silenciosamente o limite que a UI/testes pressupõem, permitindo inflar o IndexedDB local com strings arbitrariamente grandes por item.
**Fix:** Impor o limite dentro da própria função pura, cobrindo todos os caminhos de escrita de uma vez:
```js
function sanitizeCaderno(obj){
  const out={};
  CADERNO_ALLOW.forEach(k=>{if(obj&&obj[k]!==undefined)out[k]=obj[k];});
  if(out.tag!=null)out.tag=String(out.tag).slice(0,40);
  if(out.nota!=null)out.nota=String(out.nota).slice(0,500);
  return out;
}
```

## Info

### IN-01: `cadernoContar()` é código morto

**File:** `radar-goiania.html:3370`
**Issue:** `cadernoContar()` é definida (conta itens via `store.count()`) mas não é chamada em nenhum outro ponto do arquivo — o contador exibido em `#cadernoCount` (`renderCadernoBlock`) usa `itens.length` do resultado de `cadernoListar({})`, não esta função.
**Fix:** Remover, ou documentar explicitamente como API pública reservada para uso futuro (ex.: Fase 17) se essa for a intenção.

### IN-02: Nota de truncamento do detector hardcoda o número "50" em vez de interpolar `DETECTOR_LIMITE`

**File:** `radar-goiania.html` (`renderDetectorLista`, trecho `.terrdet-trunc`)
**Issue:** `'<div class="terrdet-trunc">Mostrando os 50 lotes mais subutilizados desta amostra.</div>'` duplica o valor de `DETECTOR_LIMITE=50` como literal — se a constante mudar, o texto fica incorreto silenciosamente.
**Fix:** `` `<div class="terrdet-trunc">Mostrando os ${DETECTOR_LIMITE} lotes mais subutilizados desta amostra.</div>` ``

### IN-03: Mensagem de "caderno indisponível" duplicada verbatim em 4 lugares

**File:** `radar-goiania.html` — `renderCadernoBlock()`, `renderCadernoBtn()`, `salvarNoCadernoUI()`, `salvarDetectorNoCadernoUI()`
**Issue:** A string "Seu navegador não permite salvar itens no caderno neste dispositivo. Suas consultas continuam funcionando normalmente." aparece copiada 4 vezes, enquanto a mensagem de falha de escrita já foi corretamente extraída para a constante `ERRO_ESCRITA_CADERNO`.
**Fix:** Extrair para uma constante `CADERNO_INDISPONIVEL` ao lado de `ERRO_ESCRITA_CADERNO` e reusar nos 4 pontos.

---

_Reviewed: 2026-07-10T01:22:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
