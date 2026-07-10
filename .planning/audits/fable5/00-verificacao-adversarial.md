# Verificação adversarial — re-auditoria Fable 5

**Data:** 2026-07-10 · **Modelo:** Fable 5 (herdado da sessão, sem override) · **Baseline:** 252 testes verdes
**Escopo:** SEM análise de segurança (XSS/LGPD/CSP) — excluída por decisão do usuário.
**Regra:** nenhum arquivo de código foi modificado. Este é um relatório de leitura.

## Placar

**11 CONFIRMED · 1 CONFIRMED-rebaixado · 1 CONFIRMED (comentário-only) · 0 REFUTED**

Nenhuma premissa dos auditores se mostrou falsa. O único rebaixamento (C-11) é por inalcançabilidade pela UI, não por erro de análise.

## Achados por severidade

### MÉDIA — risco de sair em documento entregue ao cliente

**[C-10] Valor por extenso quebra a partir de R$ 1 bilhão** — `extensoInteiro` não tem escala "bilhão"; `ate999(1000)` indexa `CEM[10]` (inexistente) → string vazia.
Saída real executada:
- `numeroPorExtenso(1000000000)` → `"R$ 1.000.000.000,00 ( milhões de reais)"`
- `numeroPorExtenso(2500000000)` → `"R$ 2.500.000.000,00 ( milhões de reais)"` ← **idêntico ao anterior**
- `numeroPorExtenso(999999999)` → correto

Alcançável: o input de `precoTotal` usa `parseInt` sem teto — um zero a mais digitado basta. Vai para o PDF do contrato. Como o extenso é a expressão que prevalece na interpretação contratual, é o achado mais grave.
*Fix mínimo:* adicionar bloco bilhão em `extensoInteiro`; stopgap honesto: se `ext.trim()===""`, devolver `""` (mesmo caminho de null/negativo) em vez do parêntese quebrado.

**[D-11] `trapFocus` não semeia foco → trap inerte em 3 diálogos** — o handler de Tab vive no container, mas o foco nunca entra nele. Não semeiam: `#calc` (abrirCustos), `#laudoView`, `#terrPanel`. Semeiam corretamente: cmp, wiz, capt, neg, onboarding.
*Fix mínimo:* focar o 1º focável dentro do próprio `trapFocus` (correção sistêmica).

### MÉDIO

**[B-12] [REGRESSÃO do fix B-05]** Dois botões idênticos "📊 Ver comparáveis" coexistem na ficha recém-aberta. O de `#dActsPrim` só faz `scrollIntoView`; o `.cmpbtn` de `#dComps` é que chama `compare()`.
*Fix mínimo:* remover o scroll-only, ou fazê-lo chamar `compare()` e então rolar.

**[B-13] Wizard do laudo descarta trabalho sem confirmar** — `fecharLaudo()` faz `LZ=null` silenciosamente (× e Esc), enquanto o irmão `fecharNeg` confirma via `negTemDados()`. O wizard acumula passos, observações, **fotos**.
*Fix mínimo:* `laudoTemDados()` espelhando `negTemDados`, com `forcar=true` no caminho de finalização.

### COSMÉTICO (dois defeitos reais no impresso)

**[C-14]** `montarNeg`: (1) blocos multi-linha viram `<p>` único → preâmbulo de partes sai como linha corrida; (2) a 1ª linha all-caps do texto puro vira `<b>`, duplicando o título do banner.
*Fix mínimo:* `esc(b).replace(/\n/g,"<br>")` e pular o 1º bloco quando redundante com o banner.

### BAIXO-MÉDIO

**[B-14]** `#cadernoBtn` usa `aria-pressed="true"` + `.is-saved` (semântica de toggle) mas o 2º toque não remove — só faz toast. O ⭐ irmão remove e avisa "✓ Salva — remover?".
*Fix:* tornar toggle real, ou abandonar `aria-pressed`.

**[B-15]** Fix B-10 pela metade: as linhas do caderno mostram "Nome (código)" mas o `<select>` de filtro segue com `Setor {cd}` cru, com `nomesSetor` já no escopo.

### BAIXA

**[C-11] rebaixado** — `numeroPorExtenso(1000000.50)` → `"(um milhão de reais)"`, afirmando quantia redonda. Defeito real na função pura, mas **inalcançável pela UI** (inputs usam `parseInt`, removem decimais). Teórico.

**[D-12]** Traço das zonas do PD fica estático no zoom-in: `zonaEstiloPorSigla` calcula `weight` por zoom, mas o early-return `ZONALAST.contains(bounds)` pula o redesenho. A malha de bairros re-aplica no `zoomend`.
*Fix:* no `zoomend`, se `ZONAS_ON`, re-aplicar `setStyle` sem refazer a consulta (preserva o fix D-05).

**[D-13]** `#detectChip` mistura `role="status" aria-live="polite"` com `tabindex=0`+`onclick` — é botão de fato. Leitor de tela anuncia como status, não como controle acionável.

**[C-12] comentário-only** — o comentário do ITBI descreve a tese municipal superada ("o maior entre venal e negócio"); o **código está correto** (2% sobre o valor da transação, STJ Tema 1.113), e o comentário inline logo abaixo também. Só o cabeçalho está estale.

**[B-16]** "Documentos prontos" e "Ação comercial" chamam ambos `onbAbrirDireto(2)` → mesmo cartão genérico; o rótulo "Ver como →" promete demonstração.

**[B-17]** `rotuloAmostra(1,1)` → `"Amostra de 1 de 1 lotes"` (plural fixo). Saída real confirmada.

### DÍVIDA DE TESTE

**[C-13 / C-08]** `extensoCasos` não cobre ≥1 bilhão nem milhão-com-centavos — por isso C-10/C-11 passaram despercebidos por 252 testes. Adicionar fixtures é trivial, **mas os asserts falhariam até C-10 ser corrigido** (corrigir o bug primeiro). Já `montarNeg`/`montarLaudo`/`montarFichaRapida` manipulam DOM fora do RADAR_PURE → exigiriam harness jsdom: **dívida real**, não trivial.

## Regressões confirmadas da rodada anterior

Apenas **B-12** (dois botões idênticos). Todos os demais fixes das 37 correções foram re-verificados pelos auditores B, C e D e estão íntegros.
