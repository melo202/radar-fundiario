# Phase 16: Detector de Lote Subutilizado & Farming/Caderno - Research

**Researched:** 2026-07-09
**Domain:** Codebase-survey (app HTML único `radar-goiania.html`, pós-Fase 15) + IndexedDB nativo (sem lib). Nenhuma dependência nova de terceiros/CDN.
**Confidence:** ALTA para achados de código (leitura direta linha a linha, `npm test` 121/121 confirmado ao vivo); MÉDIA para o threshold exato do detector (decisão de negócio, não uma verdade técnica); ALTA para o design de IndexedDB (API padrão nativa, sem surpresas de versão).

## Summary

Toda a infraestrutura de dado que o detector e o caderno precisam já existe e está testada: `territorioScan(cdbairro)` (TERR_NET, linha 3034) devolve um array de lotes com `nrquadra`, `areaedif`, `areaterr`, `vlvenal` — confirmado presente em `TERR_FIELDS` (linha 2980) — e as 8 funções puras de RADAR_PURE (`pm2Lote`, `quantilAmostra`, `breaksQuantil`, `binQuantil`, `estatTerritorio`, `rotuloAmostra`, linhas 2120-2209) já resolvem R$/m² por lote e quantis de amostra. O detector é literalmente uma nova função pura que reusa `pm2Lote`+`quantilAmostra` num agrupamento por quadra — nenhuma peça de rede nova, exatamente como o CONTEXT exige ("zero requisição própria").

O ponto que exige desenho novo (não reuso) é o Caderno: o app não tem NENHUMA linha de IndexedDB hoje (confirmado por grep — zero ocorrências de `indexedDB`). É preciso desenhar do zero um wrapper mínimo promise-based sobre a API nativa, decidir onde ele mora no arquivo (fora de RADAR_PURE, pois I/O real não é testável em `node:vm`), e separar rigorosamente a lógica de decisão (allowlist, enum de status, validação de import) — que DEVE ser pura e TDD-coberta — da camada fina de I/O (abrir DB, get/put/delete) — que só pode ser verificada manualmente via DevTools, seguindo o mesmo padrão de separação que a Fase 15 já estabeleceu para `territorioScan` (rede real fora do harness, contrato testado via stub).

**Primary recommendation:** (1) Detector = nova função pura `detectarSubutilizados(lotes, thresholds)` dentro do bloco RADAR_PURE, decomposta em `medianaPm2PorQuadra(lotes)` → `limiarQuadraValorizada(medianas)` → filtro por guarda de dado (`areaedif!=null`) → `razaoOcupacao(a)` → sort. (2) Caderno = bloco novo `CADERNO_START`/`CADERNO_END` fora de RADAR_PURE com um wrapper IndexedDB nativo mínimo (~40 linhas), MAIS um conjunto de funções puras de decisão (`sanitizeCaderno(obj)`, `proximoStatus`/validação de enum, `validarImportCaderno(json)`) que SIM entram em RADAR_PURE para serem TDD-testáveis — só as chamadas reais a `indexedDB.open/transaction` ficam fora do harness.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Detector de lote subutilizado (TERR-04)**
- Filtro puro client-side sobre o array do `territorioScan` (Fase 15) — nenhuma requisição própria (critério de aceite); função pura no RADAR_PURE com TDD
- Critério: razão `areaedif/areaterr` baixa (incl. `areaedif===0` = terreno vago) DENTRO de quadra cujo R$/m² venal mediano é alto (quadra no quartil superior do setor) — thresholds como constantes nomeadas e explicáveis (determinismo auditável)
- Guarda de qualidade de dado obrigatória: `areaedif=0` real ≠ `areaedif` null/ausente — registro incompleto NUNCA vira "oportunidade" (padrão `a.areaedif?` já usado no app); rótulo de honestidade da amostra herdado da Fase 15
- Saída: lista ordenada (mais subutilizado primeiro) com leitura comercial ("terreno vago em quadra valorizada"), ação por item (ver ficha, salvar no caderno) — lei da tela/ação das Fases 10/13
- Entrada de UI: ação no painel do território (Fase 15) — ex. botão "Detectar oportunidades" — e os lotes detectados podem ser destacados no mapa com o vocabulário de pinos existente

**Caderno / Farming (TERR-05)**
- IndexedDB obrigatório (decisão de STATE.md: nunca localStorage para snapshots/caderno), API nativa sem lib wrapper (arquivo único/PWA offline); localStorage existente (radar_sat/radar_prof etc.) intocado
- Schema: DB `radar_territorio`, object store `caderno` (chave = `ci`/inscrição; campos: cdbairro, tag, nota, status, data) + store `setores` (setores salvos). Índices por `cdbairro` e `status`. Versionamento de schema explícito (onupgradeneeded)
- Status do lote: ciclo simples "não visitado → visitei → conversei → recusou/fechou" (enum fixo, sem estado livre); tags livres curtas; nota texto livre DO CORRETOR
- Allowlist central anti-PII: função única `sanitizeAttrs()` (ou reuso/extensão da `sanitiza()` da Fase 15) aplicada em TUDO que entra no IndexedDB — campos cadastrais permitidos: `ci/nrinscr, cdbairro, nrquadra, nrlote, vlvenal, areaedif, areaterr, vlimp98, dtinclusao, uso, endereco` — nunca `dtnascimen`, nunca titular. Critério de aceite: DevTools confirma ausência de PII
- Falha de escrita visível: toast §26.3 com saída ("Não foi possível salvar no caderno. Verifique o espaço do navegador e tente de novo.") — nunca falha silenciosa; feature-detect de IndexedDB com degradação anunciada
- Export/import JSON do caderno (backup/troca de aparelho) — mesmo padrão do export CSV existente; import valida via allowlist
- Texto de ajuda do caderno deixa explícito: "suas notas ficam só no seu aparelho" (LGPD + confiança; app sem backend)
- UI: bloco "Meu caderno" acessível do painel Consulta (padrão dos blocos Oportunidades/Histórico da Fase 10) + ⭐/ação "Salvar no caderno" na ficha e no detector; lista filtrável por setor/status

**Relação com o que existe**
- "Oportunidades/Histórico" (Fase 10, localStorage) permanecem como estão — o Caderno é a ferramenta de TERRITÓRIO (por lote/setor com status de campo); não migrar dados da Fase 10 nesta fase (evitar churn); se houver colisão de conceito na UI, nomear claramente ("Caderno de território" vs "Oportunidades")
- Detector consome o MESMO cache do setor-scan (nunca dispara scan próprio se o painel já escaneou; se não escaneou, chama `territorioScan` — 1 varredura compartilhada)

### Claude's Discretion
- Nomes exatos de funções/stores, microcopy (gate §26), thresholds exatos do detector (documentados e explicáveis), layout da lista do caderno
- Estratégia de paginação/limite da lista na UI

### Deferred Ideas (OUT OF SCOPE)
- Snapshots versionados por setor (diff) — Fase 17 (o store/DB desta fase já deve prever a evolução de schema via version/onupgradeneeded)
- Cruzamento Caixa sobre território salvo — Fase 17
- Potencial construtivo (CA do Plano Diretor) no detector — Fase 18

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERR-04 | Detector de lote subutilizado (razão construído/terreno baixa em quadra de venal alto) sobre o scan compartilhado | §"Detector" abaixo: decomposição em funções puras, thresholds nomeados, guarda `areaedif!=null`, âncoras exatas de `pm2Lote`/`estatTerritorio`/`territorioScan` para reuso zero-requisição |
| TERR-05 | Farming/Caderno de território em IndexedDB — salvar setor/lotes, tags, notas, status (allowlist anti-PII, nunca `dtnascimen`) | §"IndexedDB" abaixo: schema `radar_territorio` v1 (stores `caderno`/`setores`) com caminho de evolução v2 (Fase 17 `snapshots`), wrapper nativo promise-based, split puro/IO para TDD, allowlist central reusando `SENS`/`sanitiza()` (linha 1221-1222) como referência de padrão já auditado |

## Project Constraints (from CLAUDE.md)

Nenhum `CLAUDE.md` encontrado na raiz do projeto (`C:\Users\bruno\Documents\Projeto Radar Fundiário\CLAUDE.md` não existe). As convenções vinculantes deste projeto vêm de `.planning/` (REQUIREMENTS.md, STATE.md, ROADMAP.md, memórias do usuário) e do próprio código-fonte (padrões já estabelecidos, citados abaixo com âncora de linha). Nenhum diretório `.claude/skills/`/`.agents/skills/` encontrado — nenhuma skill de projeto a carregar.

**Diretrizes efetivas extraídas da memória do usuário (tratadas com a mesma autoridade de CLAUDE.md):**
- Núcleo cadastral/laudo 100% determinístico — IA nunca entra no detector nem no caderno (ambos são regra pura + I/O do usuário).
- App HTML único de busca cadastral de Goiânia — nenhuma mudança de arquitetura (build, framework, bundler) é aceitável nesta fase.

## Standard Stack

Nenhuma biblioteca nova. Esta fase usa exclusivamente:

### Core (já em produção, reusado verbatim)

| Asset | Localização | Papel nesta fase |
|-------|--------------|-------------------|
| `RADAR_PURE_START`/`_END` | linhas 1230 / 2210 | Bloco testável via `node:vm` slice — recebe as novas funções puras do detector E as funções puras de decisão do caderno (allowlist, validação de enum/import) |
| `TERR_NET_START`/`_END`, `territorioScan` | linhas 2974-3042, função em 3034 | Fonte de dado do detector — zero requisição nova |
| `TERR_FIELDS` | linha 2980 | Confirma `nrquadra` presente: `"vlvenal,areaedif,areaterr,vlimp98,dtinclusao,uso,cdbairro,nrquadra,nrlote,ci,nrinscr,x_coord,y_coord"` |
| `pm2Lote`, `quantilAmostra`, `estatTerritorio` | 2120, 2128, 2187 | Reusadas pelo detector para R$/m² por lote e mediana por grupo |
| `SENS`, `sanitiza()` | 1221-1222 | Padrão de referência (blocklist) — o Caderno precisa de uma allowlist (padrão inverso, mais forte), não reuso direto |
| `.savedblock`/`.saveditem`/`renderSavedBlocks()` | 748-761 (CSS), 4222 (JS), `#savedBlocks` em 921 | Padrão estrutural do bloco "📓 Caderno de território" no painel Consulta |
| `toast()`, `MOTION_MSG` | 2914, 2920 | Toast de erro de escrita; nova mensagem de loading do detector |
| Cadeia de Esc | 5491-5520 | Novo sheet/view-swap do detector NÃO abre `.detail` extra (é view-swap dentro de `#terrPanel`, já tratado pela entrada existente linha 5499-5500) — nenhuma entrada nova na cadeia de Esc é necessária para o detector; o editor do caderno é um `<details>` nativo (não modal), também não entra na cadeia |
| `exportCSV()` | 5358-5377 | Padrão de export (Blob + `<a download>` + `URL.createObjectURL`/`revokeObjectURL`) a reusar para export JSON do caderno |
| `IndexedDB` (Web API nativa) | N/A — zero ocorrências hoje no arquivo | API do browser, sem import/CDN. `[ASSUMED: API-level MDN]` — a forma exata de `onupgradeneeded`/`transaction`/cursor é conhecimento de treinamento, não verificado via doc oficial nesta sessão (não houve necessidade de WebFetch: é a mesma API padrão desde 2015, estável, sem mudanças de sintaxe relevantes) |

**Instalação:** nenhuma (`npm install` não se aplica — sem dependência nova).

**Version verification:** não aplicável — sem `package.json` de app runtime (só `devDependencies` de teste, se houver). `node --version` no ambiente de execução dos testes: v24.16.0 `[VERIFIED: node --version, sessão atual]`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API nativa IndexedDB | `idb` (Jake Archibald) | Lib teria que ser embutida inline (CDN quebra "arquivo único offline-first" — o app já rejeita libs de storage por decisão de STATE.md/`Out of Scope` do REQUIREMENTS.md: "localStorage p/ farming/diff... IndexedDB obrigatório", implicitamente sem lib nova) |
| Wrapper promise-based próprio | `localForage` | Mesma razão — dependência de CDN nova, contra a filosofia "zero dependência nova sem CDN" já documentada em `TERRITORIO.md` §3 |

## Codebase Anchors (survey concreto pós-Fase 15)

> Linhas verificadas por leitura direta em 2026-07-09, `radar-goiania.html` (5947 linhas). Todas com `[VERIFIED: grep/read direto]`.

### Blocos testáveis (RADAR_PURE / TERR_NET)
- `RADAR_PURE_START` — linha 1230; `RADAR_PURE_END` — linha 2210. Novo código puro (detector + decisão do caderno) entra ANTES da linha 2210, depois da última função de território (`rotuloAmostra`, 2207-2209).
- `TERR_NET_START` — linha 2974; `TERR_NET_END` — linha 3042. `TERR_FIELDS` (2980), `TERRCACHE` (2982), `territorioScan` (3034), `terrUltimoOrcamento()` (3228, fora do bloco TERR_NET mas dependente de `__terrReq`).

### Funções puras de território já existentes (reuso direto)
- `pm2Lote(a)` — 2120-2124: `v=+a.vlvenal||0, ae=+a.areaedif||0, at=+a.areaterr||0; area=ae>0?ae:at; return (v>0&&area>0)?v/area:null`. **Atenção:** esta função usa `||0` (trata `0`/`null`/`undefined`/`""` igualmente) — correta para o propósito dela (R$/m² não pode distinguir "vago" de "incompleto"), mas o detector NÃO PODE copiar esse padrão para a guarda de qualidade — precisa de `!=null` explícito (ver seção Detector abaixo).
- `quantilAmostra(sorted,p)` — 2128-2131: interpolação linear, mesma fórmula de `quant()` (linha ~3758, fora do bloco). Reusável para o cálculo de Q3 dos medianos de quadra.
- `breaksQuantil`/`binQuantil` — 2135-2149: específicos do choropleth de 5 faixas; não diretamente reusáveis pelo detector (que precisa de 1 corte — Q3 —, não 4).
- `estatTerritorio(lotes,total)` — 2187-2203: agrega o setor inteiro; o detector precisa de uma agregação NOVA por `nrquadra` (granularidade diferente — não existe hoje).
- `rotuloAmostra(n,total)` — 2207-2209: reusar literalmente para o rótulo de honestidade do detector ("Amostra de N de M lotes" já é o texto locked no UI-SPEC).

### Painel do território (entrada de UI do detector)
- `#terrPanel` (`.detail`) — HTML em 1047-1071. `#terrGrid` (1055), `#terrActions` (1059, contém `terrPanelToggle` primário + `buscarNoSetor` secundário), `<details class="maisopcoes">`/`#terrMetodologia` (1063-1070).
- `abrirTerritorio(layer)` — 3068-3090: fluxo de abertura (zoom-gate via `resolveCdbairroDeLayer`, `closeDetail()`, `loading(true,MOTION_MSG.varrendo)`, `territorioScan(cd)`, `aplicarChoropleth`, `montarLegenda`, `montarPainel`, `checarVarreduraParcial`).
- `montarPainel(scan,st,layer)` — 3098-3163: renderiza `#terrGrid`; usa `TERR_PANEL_CD` (global, setado linha 3101) para saber qual `cdbairro` está aberto — o botão "Detectar oportunidades" deve reusar `TERR_PANEL_CD` e o `scan` já cacheado em `TERRCACHE[String(TERR_PANEL_CD)]` (NÃO re-chamar `territorioScanRun`, só `territorioScan(TERR_PANEL_CD)` que dedupe via `TERRCACHE`).
- `fecharTerrPanel()` — 3170-3176: já devolve foco a `#btnVerTerr`. Para o view-swap do detector (UI-SPEC: `.backlist` "‹ Território" dentro do mesmo `#terrPanel`), a função `fecharDetector()` a ser criada NÃO deve chamar `fecharTerrPanel()` — ela só troca a visibilidade interna (`#terrGrid`+`.maisopcoes` ↔ `#terrDetectorView`), o painel inteiro continua aberto.
- `toggleChoropleth()` — 2525-2542; `montarLegenda(st)` — 2491-2504. Referência de "fonte única de verdade sincronizada entre 2 controles" (`sincTerrPanelToggle`, 3182-3187) — MESMO padrão a seguir se o botão "✓ No caderno" precisar sincronizar entre ficha e detector (ver UI-SPEC Componente 2).
- Legenda de pinos `#pinoLegenda` — HTML em 979-984 (5 `<span><i class="pl-dot">`); função que a povoa em torno da linha 3827 (`el.hidden=!temPinos`). O pino "🏗️ Lote subutilizado" (UI-SPEC) é uma 6ª entrada nesse `<span>` — reusa `--gold` (`#a8842c`, `:root` linha 35) já usado por Atenção (linha 981, texto "Atenção") e Caixa (linha 983, texto "🏦 Caixa").

### Ficha do imóvel — onde entra "Salvar no caderno"
- `#dActsPrim` (rodapé primário da ficha) — populado em 4073-4076 (dentro da função que monta a ficha, dGrid em 4044). O botão ⭐ existente é `<button type="button" class="acts-save" onclick="toggleOportunidade()" ...>` (linha 4076). O novo botão "📓 Salvar no caderno" (UI-SPEC: mesma linha `.acts`, sem `.primary`) entra como uma 4ª linha no mesmo template literal — **atenção ao teto "1 primária + até 2 secundárias" da lei da tela**: hoje `#dActsPrim` já tem 1 primária (`📄 Gerar documento`) + 2 secundárias (`📊 Ver comparáveis`, `⭐ Salvar oportunidade`) = já no teto. O botão do caderno precisa ir para `#dActsMore` (dentro do `<details class="maisopcoes">`, populado em 4086-4108) OU o UI-SPEC precisa ser lido como "mesma linha visual, mas dentro de Mais opções" — **ATENÇÃO: `16-UI-SPEC.md` linha 157 diz "ao lado do ⭐ existente, mesma linha .acts" sem mencionar o teto da lei da tela; o planner precisa decidir explicitamente se isso é uma 3ª secundária (violaria o teto documentado em Fase 10) ou se entra em `#dActsMore`.** Esta é uma divergência não resolvida entre o UI-SPEC e a "lei da tela" já codificada no comentário da linha 4070-4072 — **flag para o planner, não resolvido nesta pesquisa.**
- `renderSaveBtn()` — 4187-4196: sincroniza o botão ⭐ a CADA abertura de ficha, lendo `oppTem(insc)`. O botão do caderno precisa de uma função irmã (`renderCadernoBtn()` ou extensão de `renderSaveBtn`) chamada no mesmo ponto (dentro da função de render da ficha, perto de 4077) — precisa ser assíncrona (`cadernoTem(ci)` bate no IndexedDB, que é sempre async) — cuidado: `renderSaveBtn()` hoje é síncrona porque `oppTem` lê `localStorage` (síncrono); a versão do caderno não pode bloquear a renderização da ficha — deve popular o estado do botão depois, via `.then()`, sem travar o resto do render.

### Blocos salvos (padrão Fase 10) — onde entra "Meu Caderno"
- `#savedBlocks` — `<div id="savedBlocks"></div>` linha 921, dentro do painel Consulta, irmão de `#results`.
- `renderSavedBlocks()` — 4222-4271: hoje monta `oppBlock` (sempre presente) + `histBlock` (só com `hist.length>0`) e faz `box.innerHTML=oppBlock+histBlock`. O bloco do Caderno (`cadernoBlock`) precisa ser um 3º pedaço de HTML concatenado — **mas como o caderno é assíncrono (IndexedDB) e `renderSavedBlocks()` é chamada de forma síncrona em vários pontos (4173, 4181, 4291, 4296, 4314, 4459 no boot)**, a estratégia correta é: `renderSavedBlocks()` continua síncrona para Oportunidades/Histórico (inalterado, decisão do CONTEXT de não tocar); o bloco do Caderno é renderizado por uma função separada e assíncrona (`renderCadernoBlock()`) que popula seu próprio container (`#cadernoBlock`, HTML estático já presente no DOM, análogo a como `#terrPanel` é HTML estático que só recebe `.show`) — chamada uma vez no boot (perto da linha 5459, onde `renderSavedBlocks()` já é chamada) e depois de toda escrita no IndexedDB. Isso evita reescrever o contrato síncrono de `renderSavedBlocks()`.
- Chamada no boot: `renderSavedBlocks();` linha 5459 (comentário: "Fase 10 SALV-01: estado persistido... aparece ao abrir o app"). `renderCadernoBlock()` deve ser chamada ao lado desta linha.

### LGPD / allowlist
- `SENS` (blocklist, linha 1221): `["dtnascimen","cpf","cnpj","nmcontrib","nmproprie","nome"]`.
- `sanitiza()` (linha 1222): `arr=>{arr.forEach(a=>SENS.forEach(k=>{if(k in a)delete a[k];}));return arr;}` — remove campos da lista, mantém TUDO o resto. **Isto é uma blocklist, não uma allowlist.** O Caderno exige o padrão INVERSO (allowlist: só os campos listados sobrevivem, tudo o resto é descartado) — mais forte porque um campo sensível novo adicionado ao endpoint no futuro NUNCA entraria no IndexedDB por padrão (fail-safe), enquanto a blocklist atual falharia silenciosamente se o endpoint adicionar um novo campo sensível não previsto em `SENS`. Não reusar `sanitiza()` diretamente — criar `sanitizeCaderno(obj)` com a lista positiva do CONTEXT: `["ci","nrinscr","cdbairro","nrquadra","nrlote","vlvenal","areaedif","areaterr","vlimp98","dtinclusao","uso","endereco"]` + os campos do PRÓPRIO caderno (`tag`,`nota`,`status`,`savedAt`/`updatedAt`).

### Export CSV (padrão de download a reusar)
- `exportCSV()` — 5358-5377: `Blob([...], {type:"text/csv;..."})` → `URL.createObjectURL` → `<a download>` → `click()` → `remove()` → `setTimeout(()=>URL.revokeObjectURL(u),5000)` → `toast(...)`. O export JSON do caderno reusa literalmente este esqueleto, só troca `type:"text/csv"` por `type:"application/json"` e o conteúdo do Blob por `JSON.stringify(itens,null,2)`.

### toast() / MOTION_MSG
- `toast(msg)` — 2914-2915: `t.textContent=msg; t.classList.add("show"); ...setTimeout(...,3600)`. Reusar literalmente para todas as mensagens do Caderno/Detector (nenhuma API nova de notificação).
- `MOTION_MSG` — objeto em 2920 em diante, já tem `varrendo`/`faixas` (Fase 15). Novo campo `procurando: "Procurando lotes subutilizados…"` (texto locked no UI-SPEC) entra no mesmo objeto.

### sw.js — bump de cache
- `CACHE = "radar-v7"` (sw.js linha 15). `LOCAL` lista os assets versionados (linha 16-25) — nenhum asset NOVO é esperado nesta fase (nem `.json` novo, nem CDN novo); o próprio `radar-goiania.html` está em `NETWORK_FIRST` (regex linha ~26), então mudanças de JS/CSS/HTML dentro dele NÃO exigem bump de `CACHE` (só assets estáticos versionados exigiriam). Bump só necessário SE esta fase introduzir um novo arquivo estático (não é o caso previsto).

## Architecture Patterns

### Detector — decomposição em funções puras (RADAR_PURE)

**Problema-chave verificado:** `pm2Lote` já dá R$/m² por LOTE. O CONTEXT pede o quantil por QUADRA ("quadra cujo R$/m² venal mediano é alto") — isto é uma agregação de granularidade diferente da que `estatTerritorio` já faz (que agrega o SETOR inteiro). Não existe hoje nenhuma função que agrupe por `nrquadra`. É preciso uma função nova.

**Decomposição recomendada (4 funções puras novas, todas dentro de RADAR_PURE, ANTES de `RADAR_PURE_END` em 2210):**

```javascript
/* medianasPorQuadra(lotes): agrupa por nrquadra, calcula a mediana de pm2Lote de cada quadra.
   Quadra sem NENHUM lote com pm2 válido (pm2Lote retorna null p/ todos) fica FORA do resultado —
   nunca aparece com mediana 0/null fingindo dado. Reusa pm2Lote/quantilAmostra já existentes
   (2120/2128) — nenhuma fórmula nova de mediana. */
function medianasPorQuadra(lotes){
  const porQuadra={};
  (lotes||[]).forEach(a=>{
    const q=a.nrquadra; if(q==null)return;
    const p=pm2Lote(a); if(p==null)return;
    (porQuadra[q]=porQuadra[q]||[]).push(p);
  });
  const out={};
  Object.keys(porQuadra).forEach(q=>{
    const arr=porQuadra[q].sort((a,b)=>a-b);
    out[q]=quantilAmostra(arr,.5);
  });
  return out; // {nrquadra: medianaPm2}
}

/* limiarQuadraValorizada(medianasPorQuadra): Q3 da DISTRIBUIÇÃO DE MEDIANOS de quadra (não dos
   pm2 individuais de lote — são duas populações estatísticas diferentes). Amostra <4 quadras
   distintas não sustenta um quartil informativo -> null (nunca inventa limiar). */
function limiarQuadraValorizada(medianasPorQuadra){
  const vals=Object.values(medianasPorQuadra).sort((a,b)=>a-b);
  if(vals.length<4)return null;
  return quantilAmostra(vals,.75);
}

/* razaoOcupacao(a): construído/terreno — null se areaterr ausente/0 (não dá pra calcular razão
   sem denominador real); NUNCA usa ||0 (padrão pm2Lote) porque aqui 0 real (terreno vago) e
   null/ausente (dado incompleto) têm significados opostos p/ a guarda de qualidade seguinte. */
function razaoOcupacao(a){
  const at=+a.areaterr;
  if(!(at>0))return null; // terreno ausente/inválido: sem razão calculável
  const ae=a.areaedif; // NÃO coagido com +; testado abaixo por !=null explicitamente
  if(ae==null)return null; // dado incompleto — nunca dado real
  return (+ae)/at;
}

/* detectarSubutilizados(lotes, thresholds): filtro determinístico — quadra no quartil superior
   de R$/m² (limiarQuadraValorizada) E razão de ocupação <= thresholds.razaoMax (ou terreno vago,
   areaedif===0 com areaterr>0 real). Ordena do mais subutilizado (razão menor) ao menos,
   truncado a thresholds.limite itens (UI-SPEC: 50). */
const DETECTOR_THRESHOLDS_DEFAULT={razaoMax:0.15,limite:50};
function detectarSubutilizados(lotes,thresholds){
  const th=Object.assign({},DETECTOR_THRESHOLDS_DEFAULT,thresholds||{});
  const medianas=medianasPorQuadra(lotes);
  const limiar=limiarQuadraValorizada(medianas);
  if(limiar==null)return []; // amostra insuficiente p/ afirmar "quadra valorizada" -> honesto, vazio
  const candidatos=(lotes||[]).filter(a=>{
    if(a.nrquadra==null||medianas[a.nrquadra]==null)return false;
    if(medianas[a.nrquadra]<limiar)return false; // fora do quartil superior
    const r=razaoOcupacao(a);
    if(r==null)return false; // dado incompleto — nunca candidato (guarda de qualidade)
    return r<=th.razaoMax; // inclui r===0 (terreno vago) automaticamente, é <= qualquer razaoMax>0
  });
  candidatos.sort((x,y)=>razaoOcupacao(x)-razaoOcupacao(y)); // mais subutilizado (razão menor) primeiro
  return candidatos.slice(0,th.limite);
}

/* leituraDetector(item): template determinístico de leitura comercial — nunca LLM, nunca
   interpolação de texto cru do endpoint (T-15-05 already established pattern). */
function leituraDetector(item){
  return (+item.areaedif===0)
    ? "🏗️ Terreno vago em quadra valorizada"
    : "🏗️ Baixo aproveitamento em quadra valorizada";
}
```

**Threshold `razaoMax:0.15` — `[ASSUMED]`, precisa de validação do usuário/planner.** Não existe no código nenhum precedente de "coeficiente de aproveitamento" a copiar (grep por `aproveita|coeficiente|CA_` no arquivo retornou zero ocorrências relacionadas). 15% é uma heurística de mercado imobiliário genérica (lote com menos de 15% de área construída em relação ao terreno tende a ser candidato a incorporação/venda para redesenvolvimento), NÃO verificada contra nenhuma fonte oficial nem contra o Plano Diretor de Goiânia (que é o upgrade explícito da Fase 18 — PD-04 no REQUIREMENTS.md). **Alternativa mais alinhada à filosofia já auditada do projeto (relativo/quantil, nunca número mágico absoluto):** usar o quartil inferior (Q1) da distribuição de `razaoOcupacao` DENTRO das quadras já filtradas pelo quartil superior de valor — ou seja, "razão baixa" = Q1 da própria amostra, não uma % fixa. Isso reusa `quantilAmostra` de novo e é auditável do mesmo jeito que `breaksQuantil`/`estatTerritorio` já são. **Recomendação:** o planner deve decidir entre threshold fixo (mais simples, mais explicável em 1 frase de "Como funciona?") ou threshold relativo (mais consistente com o resto do app, mas exige 2 quantis em cascata — mais difícil de explicar na disclosure). O texto de "Como funciona?" já locked no UI-SPEC ("baixo aproveitamento... dentro de quadras com R$/m² mediano nas mais altas") é compatível com QUALQUER uma das duas escolhas — não força a decisão.

**Pitfall crítico documentado (guarda de qualidade):** o padrão já onipresente no app (`a.areaedif?X:"—"`, visto em pelo menos 8 lugares — linhas 3736, 3781-3782, 3906, 4045-4046, 4923, 4946, 5069, 5188) trata `areaedif===0` e `areaedif==null` da MESMA forma (ambos falsy → cai no ramo `:`). Isso é correto para exibição ("—" quando não sabe, "—" quando é zero mas a UI não distingue os dois casos porque o contexto delas não precisa). **O detector é o PRIMEIRO lugar do app que PRECISA distinguir os dois** — copiar o padrão `?:` existente pra dentro do detector seria um bug direto (excluiria terrenos vagos reais, que são exatamente o caso mais forte de "oportunidade"). `razaoOcupacao` acima usa `ae==null` explícito, nunca `!ae`/`ae?`.

### Detector — reuso do scan compartilhado (zero requisição nova)

```javascript
/* onclick="detectarOportunidadesUI()" — botão "Detectar oportunidades" em #terrActions.
   Reusa TERR_PANEL_CD (global já setado por montarPainel, linha 3101) + territorioScan, que
   dedupe via TERRCACHE — NUNCA dispara um scan próprio se o painel já escaneou o setor. */
async function detectarOportunidadesUI(){
  if(TERR_PANEL_CD==null){toast("Nenhum setor aberto no momento.");return;}
  loading(true,MOTION_MSG.procurando);
  try{
    const scan=await territorioScan(TERR_PANEL_CD); // dedupe: TERRCACHE já tem o resultado se o painel abriu antes
    const candidatos=detectarSubutilizados(scan.lotes);
    // ... renderiza #terrDetectorList, mostra #terrDetectorView, esconde #terrGrid+.maisopcoes
    loading(false);
  }catch(e){
    loading(false);
    toast("Não foi possível varrer o setor. Verifique a conexão e tente de novo.");
  }
}
```

### IndexedDB — wrapper mínimo nativo (novo, fora de RADAR_PURE)

**Onde mora:** bloco novo `CADERNO_IO_START`/`CADERNO_IO_END` (nome sugerido, análogo a `TERR_NET_*`), colocado depois de `TERR_NET_END` (linha 3042) ou perto de `renderSavedBlocks` (linha 4217+) — decisão do planner, mas DEVE ficar FORA de `RADAR_PURE` porque chama `indexedDB.open` real (não mockável em `node:vm` sem stub, e mesmo com stub não teria valor de teste — é I/O real, não lógica).

**Schema (v1, conforme CONTEXT):**

```javascript
const CADERNO_DB="radar_territorio";
const CADERNO_VERSION=1; // Fase 17 sobe para 2 e adiciona o store "snapshots" via onupgradeneeded
const CADERNO_STATUS=["nao_visitado","visitei","conversei","recusou","fechou"]; // enum fixo, ordem = ciclo

function cadernoAbrirDB(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("IndexedDB indisponível"));return;}
    const req=indexedDB.open(CADERNO_DB,CADERNO_VERSION);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains("caderno")){
        const store=db.createObjectStore("caderno",{keyPath:"ci"});
        store.createIndex("cdbairro","cdbairro",{unique:false});
        store.createIndex("status","status",{unique:false});
      }
      if(!db.objectStoreNames.contains("setores")){
        db.createObjectStore("setores",{keyPath:"cdbairro"});
      }
      /* Fase 17 (v2): if(e.oldVersion<2){ const snap=db.createObjectStore("snapshots",
         {keyPath:["cdbairro","data"]}); snap.createIndex("cdbairro","cdbairro"); } */
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("Não foi possível abrir o caderno"));
  });
}
```

**Feature-detect (UI-SPEC exige degradação anunciada, nunca silenciosa):**
```javascript
function cadernoDisponivel(){
  return typeof window!=="undefined" && !!window.indexedDB;
}
```
Chamado no boot (perto da linha 5459) — se `false`, desabilita os botões "📓 Salvar no caderno" com `title` explicando (texto locked no UI-SPEC). `[ASSUMED: modo privado do Safari mais antigo bloqueava IndexedDB completamente; navegadores atuais (Chrome/Firefox/Safari recentes) suportam IndexedDB em modo privado com quota reduzida — a checagem por existência de `window.indexedDB` cobre o caso extremo (browsers muito antigos/embedded webviews restritos), mas a maioria das falhas reais acontece em `req.onerror` (quota, contexto sandboxed), não na ausência do objeto]` — por isso o wrapper trata os DOIS casos (feature-detect estático + `onerror` em toda operação), como o UI-SPEC já prevê com 2 mensagens de erro distintas ("IndexedDB indisponível" vs "falha ao abrir o caderno").

**CRUD promise-based (thin, delega toda decisão pra funções puras):**
```javascript
function cadernoSalvar(itemBruto){
  const item=sanitizeCaderno(Object.assign({},itemBruto,{
    status:itemBruto.status||"nao_visitado",
    savedAt:new Date().toISOString()
  }));
  return cadernoAbrirDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction("caderno","readwrite");
    tx.objectStore("caderno").put(item);
    tx.oncomplete=()=>resolve(item);
    tx.onerror=()=>reject(tx.error);
  }));
}
// cadernoAtualizar(ci,patch), cadernoRemover(ci), cadernoListar({cdbairro,status}) — mesmo esqueleto:
// abrir DB -> transaction -> operação -> oncomplete/onerror -> resolve/reject.
// TODA chamada externa (UI) SEMPRE .catch(()=>toast("Não foi possível salvar no caderno...")) —
// nunca uma Promise sem .catch (falha silenciosa é o pitfall #1 da UI-SPEC/CONTEXT).
```

**Índice `cdbairro`/`status`** (CONTEXT exige ambos) — usados por `cadernoListar({cdbairro,status})` via `store.index("cdbairro").getAll(valor)` quando um filtro está ativo, ou `store.getAll()` quando "Todos". `getAll()` sobre um índice é suficiente para o volume esperado (centenas de lotes, não milhares) — não é necessário cursor manual paginado nesta fase (isso seria over-engineering para o volume do Caderno; o Diff de Cadastro da Fase 17, que SIM pode ter milhares de linhas por snapshot, é quem pode precisar de cursor).

### Split puro/IO — testabilidade (Pitfall crítico documentado no CONTEXT)

**Confirmado por leitura do harness existente (`tests/territorio.test.mjs`):** o padrão `loadNetBlock(stubs)` (linhas 129-158 do teste) já resolve exatamente este problema para `territorioScan` — injeta `jsonp`/`sanitiza`/`capCache`/`toast` como stubs no sandbox `vm.createContext`. **IndexedDB não pode ser stubado do mesmo jeito de forma útil** — não há "stub de `indexedDB.open`" que valide algo além do próprio wrapper (testar um mock de mock). A escolha correta, alinhada ao próprio CONTEXT ("separar lógica pura de I/O"), é:

| Função | Onde mora | Testável por `npm test`? | Como verificar |
|--------|-----------|---------------------------|-----------------|
| `sanitizeCaderno(obj)` | RADAR_PURE | SIM — TDD, fixtures cobrindo `dtnascimen`/`nome`/campo desconhecido sendo descartados | `tests/caderno.test.mjs` novo |
| `statusValido(s)` / transição de enum | RADAR_PURE | SIM — TDD | idem |
| `validarImportCaderno(json)` | RADAR_PURE | SIM — TDD (JSON malformado, array vazio, item sem `ci`, item com campo fora da allowlist) | idem |
| `medianasPorQuadra`/`limiarQuadraValorizada`/`razaoOcupacao`/`detectarSubutilizados`/`leituraDetector` | RADAR_PURE | SIM — TDD, mesmo padrão de `TERR_FIX` (fixtures dedicadas) | idem, ou estender `territorio.test.mjs` |
| `cadernoAbrirDB`/`cadernoSalvar`/`cadernoAtualizar`/`cadernoRemover`/`cadernoListar`/export/import (I/O real) | Bloco `CADERNO_IO_*`, fora de RADAR_PURE | NÃO — I/O real do browser | Manual: DevTools Application → IndexedDB, dump do store `caderno`, confirmar ausência de PII + persistência entre reloads (ver Validation Architecture) |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Mediana/quantil | Fórmula de mediana nova para `medianasPorQuadra` | `quantilAmostra` (2128) já existente, mesma fórmula de `quant()` (3758) | Uma única fórmula de "mediana" no app inteiro — divergência entre 2 fórmulas de mediana seria uma inconsistência auditável (2 números "medianos" diferentes pro mesmo array em 2 lugares do app) |
| Blocklist de PII | Reusar `sanitiza()`/`SENS` para o Caderno | Allowlist nova `sanitizeCaderno()` com lista positiva | Blocklist e allowlist são modelos de segurança opostos — copiar o padrão errado (blocklist) para o Caderno violaria o critério de aceite explícito do CONTEXT ("allowlist central... nunca dtnascimen", que é uma garantia mais forte que "delete os campos da lista negra") |
| Export/download de arquivo | API de download nova | Esqueleto de `exportCSV()` (5358-5377): Blob+`<a download>`+`revokeObjectURL` | Já testado em produção (Fase 9?), zero surpresa de compatibilidade de browser |
| Toast de erro | Sistema de notificação novo | `toast(msg)` (2914) | Único canal de feedback textual do app; múltiplos sistemas de toast fragmentariam a UX |
| Cadeia de foco/Esc para o editor do caderno | Handler de teclado customizado | `<details>` nativo (UI-SPEC já decide isso: "navegável por teclado nativamente, sem JS extra") | `<details>`/`<summary>` já dão toggle+foco+leitor de tela de graça; adicionar JS de foco seria trabalho redundante e risco de regressão de a11y |

**Key insight:** esta fase é dominada por reuso — o único código genuinamente novo é (a) a agregação por quadra do detector e (b) o wrapper IndexedDB. Tudo o mais (toast, export, painel, blocos salvos, cadeia de Esc) já tem um padrão em produção testado por 121 casos — hand-rolling qualquer um desses seria reinventar algo que a Fase 10/13/15 já resolveu e o plan-check já auditou.

## Runtime State Inventory

Não aplicável — esta fase é aditiva (novo store IndexedDB, novo bloco de código), não é rename/refactor/migração. Nenhum dado existente (localStorage `radar_oportunidades`/`radar_historico`/`radar_prof` etc.) é tocado, renomeado ou migrado — confirmado explicitamente pelo CONTEXT ("não migrar dados da Fase 10 nesta fase").

## Common Pitfalls

### Pitfall 1: Confundir `0` real com `ausente` na guarda de qualidade do detector
**What goes wrong:** usar o padrão onipresente `a.areaedif?X:Y` (ou `+a.areaedif||0`) dentro da lógica de decisão do detector excluiria terrenos vagos reais (o caso mais valioso) OU incluiria lotes com dado simplesmente ausente como se fossem "vagos".
**Why it happens:** o padrão `?:`/`||0` está em pelo menos 8 lugares do app hoje, todos em contexto de EXIBIÇÃO (onde "—" serve pros dois casos igualmente bem) — é fácil copiar o padrão errado pro contexto de DECISÃO, onde os dois casos têm significado comercial oposto.
**How to avoid:** toda comparação dentro de `razaoOcupacao`/`detectarSubutilizados` usa `!=null` explícito, nunca coerção truthy/`||`.
**Warning signs:** um teste com `areaedif:undefined` e outro com `areaedif:0` (mesma `areaterr`) DEVEM produzir resultados diferentes (o segundo é candidato, o primeiro não) — se os testes derem o mesmo resultado, a guarda está errada.

### Pitfall 2: Blocklist confundida com allowlist no Caderno
**What goes wrong:** reusar `sanitiza()` (blocklist) esperando o mesmo nível de garantia de uma allowlist — um campo sensível NOVO que o endpoint passe a devolver no futuro (não previsto em `SENS`) entraria no IndexedDB sem ser bloqueado.
**Why it happens:** `sanitiza()` já existe, testado, e "parece" resolver o mesmo problema — reuso apressado sem notar a diferença de modelo de segurança.
**How to avoid:** `sanitizeCaderno(obj)` é escrita como allowlist desde o início: `const out={}; ALLOWLIST.forEach(k=>{if(obj[k]!==undefined)out[k]=obj[k];}); return out;` — nunca `delete` de uma lista negra.
**Warning signs:** teste com um campo fictício fora da allowlist (`{...validItem, campoNovoQualquer:"x"}`) DEVE resultar num objeto sem `campoNovoQualquer` — se sobrevive, a implementação é blocklist disfarçada.

### Pitfall 3: Falha silenciosa em Promise sem `.catch`
**What goes wrong:** uma chamada a `cadernoSalvar(...)` sem `.catch` no call-site da UI resulta em erro engolido pelo console, botão "Salvo no caderno" nunca aparece, e o usuário não sabe se salvou ou não — viola diretamente o critério de aceite "falha de escrita sempre visível".
**Why it happens:** Promises que rejeitam sem handler não quebram a execução do resto do script (diferente de exceção síncrona) — é fácil esquecer o `.catch` numa chamada de UI que "parece" ter dado certo visualmente.
**How to avoid:** todo call-site de UI que chama uma função `caderno*` (salvar/atualizar/remover/exportar/importar) tem `.then(sucesso).catch(()=>toast(MENSAGEM_ERRO_PADRAO))` — nunca uma chamada solta.
**Warning signs:** grep por `caderno(Salvar|Atualizar|Remover|Importar)\(` nos onclick do HTML sem um `.catch` correspondente na função chamadora.

### Pitfall 4: `renderSaveBtn()` síncrono vs. estado do caderno assíncrono
**What goes wrong:** se o botão "📓 Salvar no caderno" tentar ler o estado (`✓ No caderno`) de forma síncrona no mesmo fluxo de `renderSaveBtn()` (que hoje é 100% síncrono, linha 4187-4196, porque `oppTem` lê `localStorage`), o botão renderiza sempre no estado "não salvo" e só corrige depois — pode causar um "flash" incorreto ou, pior, cliques double-save se o usuário interagir antes do `.then()` resolver.
**Why it happens:** o padrão síncrono de `renderSaveBtn()` é o único precedente no código — fácil assumir (incorretamente) que o botão do caderno pode seguir o mesmo modelo.
**How to avoid:** `renderCadernoBtn()` é assíncrona por natureza (`cadernoTem(ci).then(salvo=>{...})`), desabilitada/estado neutro até resolver, nunca bloqueia o resto do render da ficha.
**Warning signs:** teste manual: abrir uma ficha já salva no caderno rapidamente após o boot — se o botão mostrar brevemente "📓 Salvar no caderno" antes de virar "✓ No caderno", há uma race condition visível (aceitável cosmeticamente se for <100ms, mas deve ser documentado, não acidental).

### Pitfall 5: Teto da "lei da tela" em `#dActsPrim` já esgotado
**What goes wrong:** adicionar um 4º botão em `#dActsPrim` (1 primária + já 2 secundárias hoje) violaria o teto documentado desde a Fase 10 ("lei da tela: 1 ação principal + até 2 secundárias").
**Why it happens:** o UI-SPEC (linha 157 do `16-UI-SPEC.md`) descreve o botão do caderno como "mesma linha .acts" sem mencionar o teto já em vigor — pode ser lido como "adicionar mais um botão ali", que contradiz a regra já auditada.
**How to avoid:** ver "Codebase Anchors" acima — o planner precisa decidir explicitamente entre (a) mover o botão pra `#dActsMore` (dentro do `.maisopcoes`) ou (b) revisitar/documentar uma exceção ao teto para este caso específico. **Esta pesquisa NÃO resolve a divergência — só a expõe.**

## Code Examples

Ver seção "Architecture Patterns" acima — todos os snippets já incluem a âncora de linha das funções reusadas (`pm2Lote` 2120, `quantilAmostra` 2128, `toast` 2914, `exportCSV` 5358, etc.), portanto não duplicados aqui.

## State of the Art

Não aplicável no sentido usual (não há "versão antiga de biblioteca" a atualizar) — a única "state of the art" relevante é o próprio código produzido pela Fase 15, que já é o padrão mais atual do projeto:

| Padrão antigo (pré-Fase 15) | Padrão atual (pós-Fase 15, a seguir nesta fase) | Quando mudou |
|---|---|---|
| `outFields=*` sempre (quirk documentado em PROJECT.md) | `outFields` restrito com fallback automático (`fetchWhereRestrito`) | Fase 15-01 (2026-07-09), verificado ao vivo |
| Nenhum wrapper de storage assíncrono no app | Este será o 1º uso de IndexedDB no projeto | Nesta fase |
| Blocklist (`sanitiza`/`SENS`) como único padrão de proteção de PII | Allowlist (`sanitizeCaderno`) como padrão adicional, mais forte, específico do Caderno | Nesta fase |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Threshold `razaoMax:0.15` (15% de coeficiente construído/terreno) como "razão baixa" — heurística de mercado genérica, não verificada contra Plano Diretor de Goiânia nem contra nenhuma fonte oficial | Architecture Patterns → Detector | Detector pode marcar poucos/muitos lotes como "oportunidade" dependendo do perfil real de ocupação de Goiânia; se o valor estiver muito alto, marca demais (ruído, perde credibilidade); se muito baixo, marca de menos (parece "não funcionar"). Mitigação: o CONTEXT já isola este número como "Claude's Discretion" e pede "constantes nomeadas e explicáveis" — o UI-SPEC já expõe a lógica em "Como funciona?", então o corretor pode formar sua própria opinião sobre a utilidade mesmo se o número não for perfeito. Sem bloqueio de release, mas deve ser fácil de ajustar (constante nomeada, não espalhada) |
| A2 | Detecção de IndexedDB indisponível via `!!window.indexedDB` cobre a maioria dos casos reais de falha, mas a maior parte das falhas reais acontece em `onerror` (quota/sandboxed), não na ausência do objeto — API IndexedDB tratada como conhecimento de treinamento (MDN), não verificada via WebFetch nesta sessão | Architecture Patterns → IndexedDB feature-detect | Se algum browser/webview específico usado pelos corretores tiver um comportamento de IndexedDB não coberto pelos 2 casos tratados (feature-detect + onerror), a mensagem de erro exibida pode não corresponder exatamente à causa real — mas ainda assim nunca falha silenciosamente (ambos os caminhos do UI-SPEC cobrem "indisponível" e "falha ao abrir/escrever" com toasts distintos) |
| A3 | `getAll()` sem paginação/cursor é suficiente para o volume esperado do Caderno (centenas de itens, não milhares) | Architecture Patterns → IndexedDB CRUD | Se um corretor MUITO ativo acumular milhares de itens no caderno ao longo de anos, `getAll()` pode ficar lento (embora IndexedDB nativo seja bem mais rápido que serializar um blob JSON gigante do localStorage, que é a alternativa rejeitada) — mitigação natural: a paginação de UI (30 itens por vez, já decidida no UI-SPEC) já limita o que é renderizado, mesmo que a leitura do DB traga tudo; se necessário, um ajuste futuro pode trocar `getAll()` por cursor sem mudar a interface pública das funções `caderno*` |
| A4 | Não existe `CLAUDE.md` na raiz do projeto — verificado por tentativa de leitura (arquivo não encontrado) | Project Constraints | Baixo — se um `CLAUDE.md` for adicionado depois desta pesquisa, o planner deve reverificar antes de planejar |

**Se esta tabela estivesse vazia:** não está — A1 em particular precisa de confirmação explícita do usuário/planner antes de travar como decisão final (ou aceitar como "Claude's Discretion", que é exatamente o que o CONTEXT já autoriza).

## Open Questions (RESOLVED)

> Todas resolvidas no planejamento (plan-check 2026-07-09):
> **Q1 RESOLVED:** botão entra em `#dActsMore` (teto da lei da tela preservado) — 16-02/16-03-PLAN.md; UI-SPEC §2 atualizado.
> **Q2 RESOLVED:** threshold fixo `DETECTOR_RATIO_MAX=0.15` (constante nomeada) + quadra valorizada relativa (quartil superior) — 16-01-PLAN.md.
> **Q3 RESOLVED:** sincronização multi-aba fora de escopo (mesma limitação já aceita do localStorage).

1. **Onde exatamente entra o botão "📓 Salvar no caderno" na ficha — `#dActsPrim` ou `#dActsMore`?**
   - What we know: `#dActsPrim` já tem 1 primária + 2 secundárias (teto da lei da tela, Fase 10). O UI-SPEC (linha 157) descreve "mesma linha .acts, ao lado do ⭐" sem mencionar esse teto.
   - What's unclear: se o UI-SPEC pretendia uma exceção deliberada ao teto (documentada) ou simplesmente não considerou o teto ao escrever a especificação.
   - Recommendation: o planner deve tratar isso como uma decisão de implementação explícita (mover para `#dActsMore` é a opção que preserva o teto sem contradizer nenhuma outra regra; manter em `#dActsPrim` exigiria uma justificativa nova documentada, e possivelmente rediscutir com o checker de UI).

2. **Threshold do detector: fixo (15%) ou relativo (Q1 da amostra filtrada)?**
   - What we know: ambas as abordagens são compatíveis com o texto de copywriting já locked no UI-SPEC ("Como funciona?").
   - What's unclear: qual delas o corretor vai achar mais previsível/confiável na prática — não há dado de uso real ainda (produto pré-lançamento).
   - Recommendation: como é "Claude's Discretion" no CONTEXT, o planner pode escolher: fixo é mais simples de implementar/explicar (1 linha de código, 1 frase de disclosure); relativo é mais consistente com a filosofia "sempre relativo, nunca número mágico" já auditada no resto do app. Esta pesquisa recomenda o **fixo com constante nomeada e comentário explícito da limitação** (mais simples, alinhado ao esforço "baixo" classificado em TERRITORIO.md §1.3), deixando o relativo como upgrade natural quando a Fase 18 (PD-04) trouxer o potencial construtivo real do Plano Diretor — nesse ponto o critério muda de qualquer forma (constrói/potencial-do-PD, não mais constrói/terreno-bruto).

3. **`renderCadernoBlock()` — chamado uma única vez no boot é suficiente, ou precisa reagir a mudanças de outra aba/janela?**
   - What we know: `localStorage` tem o evento `storage` para sincronizar entre abas; IndexedDB não tem um equivalente nativo simples (existe `BroadcastChannel`, mas seria uma API nova não usada em nenhum outro lugar do app).
   - What's unclear: se o caso de uso real (corretor com 2 abas do app abertas simultaneamente) é comum o suficiente para justificar essa complexidade.
   - Recommendation: fora de escopo desta fase — a decisão mais simples e consistente com "zero API nova sem necessidade comprovada" é re-renderizar `#cadernoBlock` só depois de cada escrita local (mesmo padrão de `renderSavedBlocks()` hoje, que também não sincroniza entre abas) e no boot. Sincronização multi-aba pode ser um Deferred Idea se o usuário reportar o problema na prática.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (test runner) | `npm test` (`node --test tests/*.test.mjs`) | ✓ `[VERIFIED: node --version]` | v24.16.0 | — |
| IndexedDB (browser API) | Caderno (TERR-05) | Não aplicável em ambiente de teste (`node:vm`/Node puro) — só existe em browser real | — | Nenhum fallback funcional para o Caderno (CONTEXT proíbe localStorage explicitamente); a única "fallback" é a degradação anunciada já especificada no UI-SPEC (botões desabilitados com aviso) quando o browser real não suporta |
| `npm test` suite existente | Regressão de todas as fases anteriores | ✓ `[VERIFIED: rodado ao vivo nesta sessão]` | 121/121 passando | — |

Nenhuma dependência bloqueante sem fallback — o único "risco" de ambiente é a própria natureza do IndexedDB (só existe em runtime de browser), já endereçado pelo feature-detect exigido no UI-SPEC.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (nativo do Node.js, sem dependência externa) `[VERIFIED: package.json script "test": "node --test \"tests/*.test.mjs\""]` |
| Config file | nenhum arquivo de config — comportamento padrão do runner nativo |
| Quick run command | `node --test tests/caderno.test.mjs` (novo arquivo, roda isolado) ou `node --test tests/territorio.test.mjs` se as funções do detector forem adicionadas neste arquivo existente |
| Full suite command | `npm test` (roda `tests/*.test.mjs` — hoje 121 testes, 0 falhas) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERR-04 | `medianasPorQuadra`: agrupa corretamente por `nrquadra`, ignora lotes sem `nrquadra`/pm2 válido | unit | `node --test tests/caderno.test.mjs` (ou `territorio.test.mjs` estendido) | ❌ Wave 0 |
| TERR-04 | `limiarQuadraValorizada`: retorna Q3 correto; retorna `null` para <4 quadras distintas | unit | idem | ❌ Wave 0 |
| TERR-04 | `razaoOcupacao`: distingue `areaedif=0` (retorna 0) de `areaedif=null/undefined` (retorna `null`) — teste espelhando o Pitfall 1 | unit | idem | ❌ Wave 0 |
| TERR-04 | `detectarSubutilizados`: filtra por quartil superior + razão baixa; guarda de qualidade nunca inclui registro incompleto; ordena mais subutilizado primeiro; trunca em `thresholds.limite` | unit | idem | ❌ Wave 0 |
| TERR-04 | `leituraDetector`: template "Terreno vago" quando `areaedif===0`, "Baixo aproveitamento" quando `areaedif>0` | unit | idem | ❌ Wave 0 |
| TERR-05 | `sanitizeCaderno`: descarta qualquer campo fora da allowlist (incl. um campo fictício novo, teste anti-regressão do Pitfall 2); NUNCA deixa passar `dtnascimen`/`cpf`/`nome` mesmo se presentes no objeto de entrada | unit | idem | ❌ Wave 0 |
| TERR-05 | Enum de status: transições válidas dentro de `CADERNO_STATUS`; rejeita/normaliza valor fora do enum | unit | idem | ❌ Wave 0 |
| TERR-05 | `validarImportCaderno`: JSON malformado → erro tratado; array vazio → ok (0 itens); item sem `ci` → descartado/erro; item com campo fora da allowlist → sanitizado antes de aceitar | unit | idem | ❌ Wave 0 |
| TERR-05 | `cadernoAbrirDB`/CRUD (I/O real) | manual-only — IndexedDB não existe em `node:vm` | — | DevTools Application → IndexedDB (ver Wave 0 Gaps) — justificativa: API de browser real, sem equivalente Node |
| TERR-05 | Allowlist nunca contém `dtnascimen` no código-fonte (defesa estática, complementar ao teste de runtime) | grep check | `grep -n "dtnascimen" radar-goiania.html \| grep -v "// \| SENS"` (deve retornar zero linhas fora do comentário/blocklist já existente) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/caderno.test.mjs` (ou o arquivo escolhido) — rápido, < 1s pelo padrão já observado nos 121 testes existentes (133ms total para toda a suíte)
- **Per wave merge:** `npm test` (suíte completa, 121+novos testes)
- **Phase gate:** suíte completa verde + verificação manual do dump IndexedDB (ver Wave 0 Gaps) antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/caderno.test.mjs` (novo) — cobre `sanitizeCaderno`, enum de status, `validarImportCaderno`, e as 5 funções do detector (`medianasPorQuadra`, `limiarQuadraValorizada`, `razaoOcupacao`, `detectarSubutilizados`, `leituraDetector`) — usar o MESMO padrão `loadPureBlock()` já em `tests/territorio.test.mjs` (linhas 15-41), reexportando as novas funções em `globalThis.__exports`
- [ ] `tests/fixtures.mjs` — adicionar `CADERNO_FIX`/estender `TERR_FIX` com casos de borda: `areaedif:0` vs `areaedif:null` vs `areaedif:undefined` (mesma área/terreno); objeto de entrada do caderno com campo `dtnascimen` presente (deve ser removido); JSON de import malformado/válido
- [ ] Nenhuma infraestrutura de framework nova — `node --test` já cobre tudo que é testável nesta fase; a lacuna é só a AUSÊNCIA dos arquivos de teste em si (funções ainda não escritas)
- [ ] Verificação manual (não Wave 0, mas obrigatória antes do phase gate): DevTools Application → IndexedDB → `radar_territorio` → store `caderno` — dump de pelo menos 1 item salvo, confirmar visualmente que NENHUM dos campos listados em `SENS` (dtnascimen/cpf/cnpj/nmcontrib/nmproprie/nome) aparece, e reload da página confirma persistência (item ainda lá)

*(Não é "None" — há Wave 0 real: nenhum arquivo de teste do detector/caderno existe ainda, pois esta é uma fase nova.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | não | app sem autenticação/contas (fora de escopo do milestone, confirmado em REQUIREMENTS.md "Out of Scope") |
| V3 Session Management | não | idem |
| V4 Access Control | não | dado local ao dispositivo, sem multiusuário/permissão |
| V5 Input Validation | SIM | `sanitizeCaderno()` (allowlist, não regex de validação de formato — o formato dos campos cadastrais já vem validado pelo `+cdbairro`/coerção numérica existente em `territorioScan`, linha 3035-3036); `validarImportCaderno()` valida shape do JSON importado antes de escrever no DB (nunca confia em arquivo externo) |
| V6 Cryptography | não | nenhum dado criptografado nesta fase — IndexedDB armazena em claro (mesmo que localStorage hoje); não há requisito de criptografia em repouso especificado pelo CONTEXT (o dado é do próprio corretor, sobre seu próprio dispositivo, sem PII de terceiro — justamente por isso a criptografia não é exigida) |
| V8 Data Protection | SIM | Allowlist central (`sanitizeCaderno`) é o controle primário de proteção de dado — nunca gravar `dtnascimen`/campos de titular; export/import passam pela MESMA allowlist (import não pode ser um vetor de reintrodução de PII vindo de um backup antigo gerado antes da allowlist existir, por exemplo) |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Reintrodução de PII via import de backup antigo/malicioso | Information Disclosure (Disclosure) | `validarImportCaderno()` aplica `sanitizeCaderno()` a CADA item do JSON importado, nunca confia no shape do arquivo — mesmo que o arquivo tenha sido gerado por uma versão anterior do app (antes desta allowlist existir) ou editado manualmente por um usuário mal-intencionado |
| XSS via `innerHTML` com nota/tag do corretor (texto livre) | Tampering | Todo texto livre (tag, nota, nome de setor) renderizado via `textContent`/`esc()` — mesmo padrão já estabelecido em `renderSavedBlocks()` (linha 4220: "TODO texto de cadastro passa por esc()") e `montarPainel` (T-15-07, esc()+textContent); NUNCA interpolar `nota`/`tag` dentro de um template `innerHTML` sem `esc()` |
| Injeção de WHERE/SQL-like no filtro por `cdbairro`/`nrquadra` do caderno | Tampering | Não aplicável a esta fase — filtro do caderno é local (IndexedDB `getAll`/`index`), sem WHERE SQL nenhum; a única superfície de WHERE (o próprio `territorioScan`) já usa coerção numérica `+cdbairro` (linha 3035-3036), herdada, não modificada por esta fase |
| Quota exceeded / falha de escrita silenciosa mascarando perda de dado | Denial of Service (localizado, não rede) | Todo `.catch` de operação do caderno mostra toast de erro (nunca falha silenciosa) — mesmo padrão já em `oppSave`/`histSave` (linhas 4136-4137, 4144-4145), estendido ao IndexedDB conforme UI-SPEC |

## Sources

### Primary (HIGH confidence)
- `radar-goiania.html` (leitura direta, 5947 linhas) — âncoras citadas ao longo deste documento: RADAR_PURE (1230-2210), TERR_NET (2974-3042), `#terrPanel`/`#terrActions` (1047-1071), `abrirTerritorio`/`montarPainel`/`fecharTerrPanel` (3068-3176), `toggleChoropleth`/`montarLegenda` (2491-2542), `SENS`/`sanitiza` (1221-1222), `#savedBlocks`/`renderSavedBlocks`/`oppSave`/`histSave` (921, 4127-4271), `#dActsPrim`/`renderSaveBtn` (4073-4196), `exportCSV` (5358-5377), `toast`/`MOTION_MSG` (2914-2929), cadeia de Esc (5491-5520), `#pinoLegenda` (979-984)
- `sw.js` (leitura direta) — `CACHE="radar-v7"`, `LOCAL`, `NETWORK_FIRST` regex
- `tests/territorio.test.mjs` (leitura direta, 265 linhas) — padrão `loadPureBlock()`/`loadNetBlock(stubs)` a replicar para `tests/caderno.test.mjs`
- `npm test` executado ao vivo nesta sessão — 121/121 passando `[VERIFIED]`
- `.planning/phases/16-detector-subutilizado-farming-caderno/16-CONTEXT.md` e `16-UI-SPEC.md` — decisões locked
- `.planning/research/v2.1/TERRITORIO.md` §1.3/§1.4/§3 — pesquisa de milestone (já ALTA confiança, herdada)
- `.planning/phases/15-setor-scan-choropleth-painel-territorio/15-0{1,2,3}-SUMMARY.md` — o que a Fase 15 realmente entregou (nomes de função/linhas confirmados contra o código real, não só contra o resumo)
- `.planning/REQUIREMENTS.md` — TERR-04/05, rastreabilidade de fase
- `.planning/config.json` — `nyquist_validation:true`, `security_enforcement:true`, `security_asvs_level:1`

### Secondary (MEDIUM confidence)
- Nenhuma — esta pesquisa não usou WebSearch/Context7 (domínio é 100% codebase-survey, conforme instrução explícita da orquestração)

### Tertiary (LOW confidence)
- Threshold `razaoMax:0.15` do detector — heurística de treinamento, não verificada contra fonte nenhuma (ver Assumptions Log A1)
- Comportamento exato de IndexedDB em modo privado/quota — conhecimento de treinamento (MDN-level), não verificado via WebFetch nesta sessão (ver Assumptions Log A2)

## Metadata

**Confidence breakdown:**
- Codebase anchors (linhas/funções/padrões existentes): ALTA — leitura direta linha a linha, cruzada com `npm test` ao vivo
- Detector (decomposição de funções puras): ALTA para a estrutura/reuso; MÉDIA para o threshold numérico exato (decisão de negócio documentada como Claude's Discretion, não uma verdade técnica)
- IndexedDB (schema/wrapper/split puro-IO): ALTA para o design (API padrão estável, sem ambiguidade de versão); MÉDIA para o comportamento de degradação em navegadores específicos (não testado ao vivo em nenhum browser real nesta sessão — só leitura de código-fonte e conhecimento geral da API)
- Pitfalls: ALTA — derivados diretamente de padrões já existentes no código (grep confirmado) e do próprio texto do CONTEXT/UI-SPEC

**Research date:** 2026-07-09
**Valid until:** válido enquanto `radar-goiania.html` não sofrer outra fase de refatoração estrutural do painel de território (Fase 17/18 são as próximas a tocar esta área) — recomenda-se de 30-45 dias ou até o início do planning da Fase 17, o que vier primeiro (o código é estável, mas os números de linha citados aqui mudarão a cada fase que adicionar/remover código antes dos pontos citados)
