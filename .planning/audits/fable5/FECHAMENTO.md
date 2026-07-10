# Lapidação Fable 5 — Fechamento

**Data:** 2026-07-10 · **Modelo (auditoria E correções):** Fable 5, herdado da sessão, sem override
**Resultado:** 4 ondas de correção · **21 commits** · suíte **252 → 287 verdes** (+35 testes) · tudo pushed em `master`

## O que foi corrigido (por onda)

**Onda 1 — quebra funcional e conteúdo de documento/mensagem (5 commits)**
BUSCA-01 crítico (Enter em nome de prédio não buscava — ramo `bd` ausente); família do extenso: escala bilhão/trilhão, gramática do "e" entre escalas, coerência numeral↔extenso (base única arredondada), guard honesto contra extenso vazio — com as fixtures ≥1 bilhão que teriam pego tudo; ZAP-01/02 high (frase-diagnóstico pontuada interpolada como item de lista — fixtures refeitas com a saída REAL de `scoreConfianca`); ZAP-03 ("Q —"), DOC-04 ("1 dia"), C-12 (comentário ITBI → STJ Tema 1.113), C-14 (PDF da minuta: multi-linha e título duplicado).

**Onda 2 — correção silenciosa (4 commits)**
CAD-01 + AQ-01 (os gêmeos esquecidos: coerção de tipo no cruzamento Caixa; erro nunca cacheado no `pdConsultarQuadra`); TERR-01 + FICHA-01/02 (dispersão degenerada: quantis deduplicados com legenda honesta; score 50 "Na mediana — vizinhança homogênea" em vez de 100 falso; confiança rebaixada quando os comparáveis são muito variados); CAD-02/04/05 (diff sem falso-positivo de tipo, que não se autodestrói, e que reporta 0→valor); orçamento de rede hermético (conta tentativas), TERR-06 (wash do setor anterior), clamp+plural do rótulo de amostra, TERRTOKEN.

**Onda 3 — UX & a11y (7 commits)**
B-12 regressão (botão único que carrega E rola); D-11 sistêmico (trapFocus semeia o foco — destrava #calc/#laudoView/#terrPanel) + AT-03 (guarda de reentrância); B-13 (`laudoTemDados` + confirmação antes de descartar o wizard); contrastes AA EST-01/02/03 (incl. a faixa de valor que estava em 3,2:1); B-14 (📓 é toggle real com aria-pressed verdadeiro), B-15 (filtro com nome do setor), D-13 (chip de detecção vira button + live-region separada — e removeu um handler de clique DUPLICADO desde a Fase 8), B-16 ("Sobre isto →"); D-12 (traço das zonas re-aplicado no zoom), MAPA-01/02/03 (vocabulário "Oportunidade média", fonte única de cor, wash neutro); BUSCA-02/03/04 (chips preservam setor; "Rua Q 15" é endereço; retry de geo); FICHA-03..06 ("Na mediana", "Confiança: a calcular" pré-consulta, histórico re-gravado com o rótulo real, sort defensivo das âncoras).

**Onda 4 — PD, perf, docs & a raiz (5 commits)**
PD-01..04 (o trabalho jurídico engavetado agora aparece: taxa de ocupação 40% da AOS, regime `nota_ca`, linha "Fonte: Art. X, LC 349/2022", rótulo do detector diferenciado); EST-04 (`caixa-goiania.js` com defer — não bloqueia mais o primeiro render); EST-05 (re-estilo dos ~4000 lotes em chunks por rAF com token), EST-06 (semântica do listbox); REPO-02 (docs corrigidas: o quirk `outFields=*` é do Mapa_ModeloEspacial, o cadastro aceita restrito); REPO-01/04 (**tests/datasets.test.mjs** — primeira vez que a suíte carrega os dados reais: 1206 bairros com o duplicado conhecido travado, 1119 cds sem órfãos, 9852 logradouros, 178 Caixa com x/y coerente; "709 setores" corrigido para 687).

**Pós-verificação ao vivo (1 commit)**
A verificação em navegador pegou um defeito **introduzido pela própria Onda 1**: "um milhão reais" (agramatical) ao suprimir o "de" com centavos. Regra final: extenso terminado em -lhão/-lhões exige "de" (pt-BR); o numeral já mostra os centavos. Corrigido com teste.

## Verificação ao vivo (Chromium, pós-tudo)

- `applyDetectAndSearch` tem o ramo `bd` ✅
- `numeroPorExtenso`: `1e9` → "um bilhão de reais"; `1234567` → "um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais"; `1000000.50` → "um milhão de reais"; `2500000` → "dois milhões e quinhentos mil reais" ✅
- `zapProprietario` no caminho comum: sem ". .", sem "dados completos" como pendência ✅
- `scoreOportunidade` na mediana homogênea: `{score: 50, rotulo: "Na mediana — vizinhança homogênea"}` ✅
- `CAIXA` carregado com defer (178 imóveis) ✅ · Archivo renderizando ✅

## Aceito como dívida (documentado, não corrigido)

- Canvas renderer para os lotes (EST-05 estrutural) — refactor grande; mitigado com chunking rAF
- Harness jsdom para `montarNeg`/`montarLaudo`/`montarFichaRapida` (C-08) — os construtores DOM seguem sem teste
- PNG maskable com safe-zone real (EST-07 residual) — asset de arte
- Duplicado `000400001169` no dataset de bairros — travado por teste como known-issue (corrigir exige regenerar o dataset)

## Segurança

Excluída desta rodada por decisão do usuário. Os achados de segurança da auditoria da Fase 20 (Opus) permanecem corrigidos e verificados.
