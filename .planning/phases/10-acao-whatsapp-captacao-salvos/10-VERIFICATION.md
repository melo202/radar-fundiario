---
phase: 10-acao-whatsapp-captacao-salvos
verified: 2026-07-07T00:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visual mobile (375px) e desktop (1280px) do grupo .zapgroup dentro de #dActsMore e do #captSheet"
    expected: "5 botões WhatsApp empilhados, largura total legível; #captSheet full-screen com os 4 blocos, sem overflow horizontal; alvos de toque reais >=44px medidos em DevTools"
    why_human: "Layout/rendering visual não é verificável por grep/análise estática — precisa de screenshot/DevTools"
  - test: "Contraste AA dos componentes novos (.zapbtn, .captcopy, .savedblock-*, .acts-save.is-saved) em condição real de tela"
    expected: "Todas as combinações batem >=4.5:1 (texto normal) — os pares já são reuso 1:1 de tokens aprovados nas Fases 8/9, mas a composição final (ex.: hover, foco) merece 1 confirmação visual"
    why_human: "Cálculo de contraste em combinação real de renderização (não só o valor isolado do token) é mais confiável por inspeção visual/ferramenta de contraste"
  - test: "Navegação por teclado completa dentro do #captSheet (Tab entre os 4 .captcopy + .wclose) e confirmação de que Tab não escapa do sheet para o conteúdo de fundo"
    expected: "Tab percorre .wclose -> 4 botões .captcopy -> (idealmente) volta ao .wclose, sem focar elementos ocultos atrás do sheet"
    why_human: "Review (IN-03) já documentou que NÃO há focus-trap no #captSheet (gap pré-existente também em #wiz, aceito e registrado para a Fase 13) — precisa confirmação humana de que o comportamento é aceitável nesta fase, não uma regressão nova"
  - test: "Simular localStorage cheio/indisponível (DevTools) e confirmar toast de falha + botão ⭐ permanece no estado anterior; testar item de Oportunidades/Histórico apontando para imóvel que sumiu do cadastro (fallback de erro da busca)"
    expected: "Toast 'Não foi possível salvar — armazenamento do navegador indisponível ou cheio.' aparece; nenhuma mudança de estado visual finge sucesso; reabertura de item obsoleto cai no tratamento de erro já existente da Fase 8"
    why_human: "Requer simulação de ambiente de navegador real (quota storage) e navegação/clique, não verificável por análise estática de código"
---

# Phase 10: Camada de Ação + WhatsApp + Captação + Salvos Verification Report

**Phase Goal:** Todo resultado vira próxima ação concreta; o corretor copia mensagens prontas e guarda o que interessa — sem servidor.
**Verified:** 2026-07-07
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Lei da tela aplicada: 1 primária + até 2 secundárias visíveis, resto em "Mais opções" — nenhuma superfície de resultado termina sem ação | ✓ VERIFIED | `radar-goiania.html:2430-2433` — `#dActsPrim` = exatamente `abrirLaudo()` (primary) + "Ver comparáveis" + `.acts-save` (⭐); `#dActsMore` (2443-2459) contém "Copiar inscrição" (movido) + custos/CND/link/mapas + grupo `.zapgroup` (5 zapbtn) + "Captar este imóvel". Sweep documentado em 10-03-SUMMARY.md (ficha/lista/vazio/chooser/erro) |
| 2 | Copiar p/ WhatsApp em pt-BR (resumo/proprietário/comprador/preço/riscos), texto gerado por template determinístico, tom de corretor | ✓ VERIFIED | `radar-goiania.html:1176-1231` — 5 funções `zap*` dentro do bloco RADAR_PURE; `copyZap(tipo)` (2724-2735) mapeia os 5 tipos com 5 toasts específicos (nunca "Copiado" genérico); wiring com dados reais via `dadosFicha()` (2682) |
| 3 | Salvar oportunidade + histórico + persistência em localStorage (allowlist, sem PII de terceiros); reabrir mostra o mesmo; falha de escrita é visível | ✓ VERIFIED | `oppLoad/oppSave/histLoad/histSave` (2481-2497) com `Array.isArray` guard (fix CR-01) + toast de falha nunca-silencioso; `oportunidadeItem` (1289-1306) allowlist estrita de 12 campos, testada com assert negativo (`tests/templates.test.mjs:148-149`); `renderSavedBlocks()` chamado no init — estado persistido reaparece |
| 4 | Modo captação: abordagem, script de ligação, checklist documental, tarefa de follow-up — tudo copiável, individualmente | ✓ VERIFIED | `#captSheet` (`radar-goiania.html:794`) com 4 `.captblock` (captZap/captLig/captDoc/captFollow), cada um com `.captcopy` próprio; `abrirCaptacao()`/`copyCapt()` (2871-2898) usam `esc()` + templates puros `capt*` (10-01); disclaimer fixo + nota condicional sem assinatura |
| 5 | Assinatura condicional: perfil→assina, sem perfil→omitida, NUNCA placeholder | ✓ VERIFIED | `function assinatura(perfil)` (1159-1162): `if(!perfil\|\|!perfil.nome) return "";` — testado em `tests/templates.test.mjs` ("zap* com perfil.nome termina com assinatura exata" / "zap* sem perfil NAO contem placeholder de assinatura") — ambos passam |
| 6 | Allowlist negativa: dtnascimen/nome de terceiro nunca em localStorage | ✓ VERIFIED | `oportunidadeItem()` só copia 12 campos travados (nunca `a` bruto); teste dedicado `tests/templates.test.mjs:148-149` com assert negativo explícito passa; grep confirma zero ocorrência de `dtnascimen`/`nmtitular` nas funções de persistência |
| 7 | Container `#savedBlocks` estático + visibilidade `:has` — sobrevive a qualquer busca | ✓ VERIFIED | `radar-goiania.html:686` — `<div id="savedBlocks"></div>` imediatamente antes de `#results`; CSS `#savedBlocks{display:none}` + `.panel:has(#results .empty) #savedBlocks{display:block}` (511-512); nenhuma rota de render()/erro toca o container |
| 8 | esc()/IN-01 em todos os caminhos novos; Esc chain com captSheet; guards de DCUR | ✓ VERIFIED | `data-insc="${esc(it.insc)}"` + onclick por referência de elemento (`this`) em `.saveditem`/`.saveditem-rm` (2583-2588, 2603-2604); `abrirCaptacao()` usa `esc()` nos 4 textos (2874-2877); Esc chain tem `#captSheet` no topo (3337-3341); `if(!DCUR)return` presente em `toggleOportunidade`, `abrirOportunidade`-adjacent handlers, `dadosFicha`, `abrirLaudo`, `abrirCaptacao` |
| 9 | Os 3 fixes do 10-REVIEW aplicados em código | ✓ VERIFIED | CR-01: `Array.isArray(v)?v:[]` em `oppLoad`/`histLoad` (2484, 2492); WR-01: `setAttribute("readonly","")` + `setSelectionRange` + captura/restauração de `document.activeElement` em `copyTexto` fallback (2705-2714); WR-02: `.savedblock-clear{...min-height:44px;padding:0 8px...}` (linha 517) |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `radar-goiania.html` (bloco RADAR_PURE) | 9 funções de template (zap*/capt*) + oportunidadeItem + histAdd | ✓ VERIFIED | Confirmado por `grep -n "function zapResumo\|function zapArgumento\|function faixaTxt"` e leitura direta (1159-1310); testado via `tests/templates.test.mjs` |
| `tests/templates.test.mjs` | Harness node:vm testando as 11 funções novas | ✓ VERIFIED | 13 testes novos, todos passam; usa mesmo padrão de `tests/scores.test.mjs` |
| `tests/fixtures.mjs` | Fixtures novas (zapComData/zapSemPerfil/zapSemFaixa/oportunidadeItemInput/histAddCases) | ✓ VERIFIED | Confirmado por grep (`dtnascimen` em fixtures.mjs:147) |
| `radar-goiania.html` (persistência) | oppLoad/oppSave/oppTem/toggleOportunidade/removerOportunidade/histPush/limparHistorico/renderSavedBlocks/abrirOportunidade + CSS | ✓ VERIFIED | Todas as funções presentes e wired; `radar_oportunidades`/`radar_historico` confirmados |
| `radar-goiania.html` (UI de ações) | dadosFicha/copyZap/copyTexto/abrirCaptacao/fecharCaptacao/copyCapt + `#captSheet` | ✓ VERIFIED | Todas presentes; `#captSheet` com role=dialog, 4 blocos, disclaimer |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `tests/templates.test.mjs` | RADAR_PURE (radar-goiania.html) | node:vm loader | ✓ WIRED | 47/47 testes passam incluindo os 13 novos |
| `toggleOportunidade()` | `oportunidadeItem(DCUR,extras)` | chamada direta | ✓ WIRED | Grep confirma `oportunidadeItem(` dentro do corpo de `toggleOportunidade` |
| `showDetail(a,ll)` | `histPush(a)` → `histAdd` | chamada após `DCUR=a` | ✓ WIRED | `histPush(a)` presente em `showDetail`; `histPush` usa `histAdd(` e `oportunidadeItem(` |
| `.saveditem`/`.saveditem-rm` | `abrirOportunidade(this)`/`removerOportunidade(this)` | referência de elemento + `data-insc` | ✓ WIRED | Padrão IN-01 confirmado, nenhuma string interpolada em onclick |
| `copyZap(tipo)`/`copyCapt(tipo)` | `zapResumo/.../captFollowup` (RADAR_PURE) | `dadosFicha()` monta `data` | ✓ WIRED | Mapas de tipo→[função,toast] confirmados nas 2 funções |
| `copyZap`/`copyCapt` | `navigator.clipboard` com fallback | `copyTexto(texto,okMsg)` | ✓ WIRED | Fallback `execCommand` com `readonly`+`setSelectionRange`+restauração de foco confirmado (fix WR-01) |
| `abrirCaptacao()`/`fecharCaptacao()` | Padrão WIZRET (foco) | `CAPTRET` isolado | ✓ WIRED | `CAPTRET=document.activeElement` na abertura; `CAPTRET.focus()` no fechamento |
| Esc key global | `#captSheet` | `fecharCaptacao()` no topo da cadeia | ✓ WIRED | Confirmado antes de `#caixaList`/`#wiz` na cadeia de prioridade |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `.zapgroup` botões (5) | texto copiado | `dadosFicha()` → `DCUR`/`mercadoEstimado`/`DCUR.__scores`/`radar_prof` | Sim — `dadosFicha` monta `data` real, guard `if(!DCUR)return null` | ✓ FLOWING |
| `#captSheet` (4 blocos) | `captZap`/`captLig`/`captDoc`/`captFollow` innerHTML | `dadosFicha()` + templates `capt*` puros | Sim — mesmos dados reais, `esc()` aplicado | ✓ FLOWING |
| `#savedBlocks` (Oportunidades/Histórico) | `oppLoad()`/`histLoad()` | `localStorage` via allowlist `oportunidadeItem` | Sim — array real persistido, `Array.isArray` guard evita corrupção | ✓ FLOWING |
| Botão `.acts-save` (⭐) | estado salvo/não-salvo | `oppTem(insc)` recalculado a cada `renderSaveBtn()` | Sim — lido de `radar_oportunidades` a cada abertura de ficha | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suite de testes completa (RADAR_PURE + templates + allowlist + FIFO) | `node --test "tests/*.test.mjs"` | 47 pass / 0 fail | ✓ PASS |
| Nomenclatura: nenhum "Favoritos"/"Salvos"/"Prospects" como rótulo de UI | `grep -n "Favoritos\|Salvos\|Prospects" radar-goiania.html` | 0 matches | ✓ PASS |
| Allowlist negativa: zero `dtnascimen`/`nmtitular` nas funções de persistência | `grep -n "dtnascimen\|nmtitular" radar-goiania.html` | Apenas em comentários/SENS array (feature de redação para IA, não relacionada) | ✓ PASS |
| CR-01 aplicado: `Array.isArray` em `oppLoad`/`histLoad` | leitura direta linhas 2484/2492 | `Array.isArray(v)?v:[]` presente em ambos | ✓ PASS |
| WR-01 aplicado: `readonly`+focus-restore no fallback de `copyTexto` | leitura direta linhas 2705-2714 | `setAttribute("readonly","")` + `antes.focus()` presentes | ✓ PASS |
| WR-02 aplicado: `.savedblock-clear` 44px | leitura direta linha 517 | `min-height:44px;padding:0 8px` presente | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ACAO-01 | 10-02, 10-03 | Toda tela de resultado termina com ação útil (lei da tela) | ✓ SATISFIED | Sweep documentado em 10-03-SUMMARY.md; `#dActsPrim`/`#dActsMore` confirmados; lista/count com CSV; estado vazio com blocos Oportunidades/Histórico; chooser já é ação |
| ZAP-01 | 10-01, 10-03 | Botões de copiar p/ WhatsApp (resumo/proprietário/comprador/preço/riscos), tom de corretor | ✓ SATISFIED | 5 templates `zap*` + `copyZap` com 5 toasts distintos + wiring com dados reais |
| SALV-01 | 10-01, 10-02 | Salvar oportunidade + histórico + persistência localStorage allowlist, sem PII | ✓ SATISFIED | `oportunidadeItem` allowlist de 12 campos + `histAdd` FIFO + `oppSave`/`histSave` com toast de falha nunca-silencioso; nota: REQUIREMENTS.md menciona "favoritos" adicional a Oportunidades/Histórico — CONTEXT.md (decisão travada da fase) resolve isto tratando "Oportunidades" como o único mecanismo de salvamento explícito (não há um 3º conceito "Favoritos" distinto) — ver nota abaixo |
| CAPT-01 | 10-01, 10-03 | Modo captação: abordagem, script, checklist, follow-up, copiável | ✓ SATISFIED | 4 templates `capt*` + `#captSheet` com 4 blocos + copiar individual + disclaimer |

**Nota sobre SALV-01 (não é gap, é decisão documentada):** REQUIREMENTS.md (linha 49) lista "histórico de últimas consultas **e favoritos**" como dois conceitos distintos de "salvar oportunidade". O 10-CONTEXT.md (decisão travada, seção Nomenclatura) resolve explicitamente que o app usa apenas dois conceitos — "Oportunidades" (ação explícita ⭐) e "Histórico" (automático) — e que esses nomes NUNCA alternam com "Favoritos/Salvos/Prospects". Isso é uma decisão de escopo tomada na fase de context-gathering (aceita), não uma lacuna de implementação: não existe um 3º array/UI "favoritos" separado de Oportunidades. Nenhuma ação corretiva necessária.

### Anti-Patterns Found

Nenhum anti-pattern bloqueador ou de advertência encontrado nos arquivos desta fase. Scan de `TODO|FIXME|XXX|HACK|PLACEHOLDER` no `radar-goiania.html` retornou apenas 1 falso-positivo (comentário em português "TODO texto de cadastro passa por esc()" = "todo/all", não uma marcação de trabalho pendente).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | Nenhum encontrado |

### Human Verification Required

### 1. Visual mobile (375px) e desktop (1280px)

**Test:** Abrir a ficha de um imóvel em viewport 375px e 1280px; expandir "Mais opções"; verificar o grupo `.zapgroup` (5 botões) e abrir "Captar este imóvel" (`#captSheet`).
**Expected:** Botões empilhados, largura legível, sem overflow horizontal; `#captSheet` full-screen com os 4 blocos e disclaimer visíveis; alvos de toque reais ≥44px medidos em DevTools.
**Why human:** Layout/rendering visual não é verificável por análise estática do código.

### 2. Contraste AA em composição real

**Test:** Inspecionar `.zapbtn`, `.captcopy`, `.savedblock-*`, `.acts-save.is-saved` (estados normal/hover/foco) com ferramenta de contraste do navegador.
**Expected:** Todas as combinações ≥4.5:1 — tokens são reuso 1:1 de pares já aprovados nas Fases 8/9, mas merece 1 confirmação visual da composição final.
**Why human:** Cálculo de contraste em contexto de renderização real é mais confiável por inspeção visual.

### 3. Navegação por teclado dentro do `#captSheet`

**Test:** Abrir "Captar este imóvel" e navegar por Tab entre `.wclose` e os 4 `.captcopy`.
**Expected:** Tab percorre os elementos do sheet; o code review (IN-03) já documentou ausência de focus-trap (gap pré-existente também em `#wiz`, aceito e registrado para revisão futura na Fase 13) — confirmar que isso é aceitável nesta fase.
**Why human:** Requer interação de teclado real; a ausência de focus-trap é um gap conhecido e documentado, não uma regressão — mas merece confirmação humana de que não bloqueia a fase.

### 4. localStorage cheio/indisponível + item obsoleto

**Test:** Simular quota de localStorage cheia (DevTools) e tentar "Salvar oportunidade"; separadamente, abrir um item de Oportunidades/Histórico cuja inscrição não existe mais no cadastro.
**Expected:** Toast de falha visível, botão ⭐ não muda de estado; item obsoleto cai no tratamento de erro de busca já existente (Fase 8).
**Why human:** Requer simulação de ambiente de navegador real, não verificável por grep/análise estática.

### Gaps Summary

Nenhum gap bloqueador. Todos os 9 must-haves derivados (4 success criteria do ROADMAP + os 3 fixes do code review + a nota de allowlist/nomenclatura) foram verificados diretamente no código-fonte com evidência de linha. A suite de testes (47/47) cobre o contrato de honestidade (sem faixa → nunca inventa valor), assinatura condicional (nunca placeholder), allowlist negativa (LGPD) e FIFO puro. Os 3 achados do `10-REVIEW.md` (1 critical + 2 warnings) foram todos corrigidos e confirmados em código (commit `cb9fa74`). O único ponto de atenção é o status **human_needed**: os 4 itens de verificação visual/interativa (layout responsivo, contraste em composição real, navegação por teclado no sheet, simulação de falha de storage) não são verificáveis por análise estática e requerem confirmação humana antes de considerar a fase 100% fechada — nenhum deles indica defeito conhecido, são apenas testes que exigem olhos/dedos humanos.

---

*Verified: 2026-07-07*
*Verifier: Claude (gsd-verifier)*
