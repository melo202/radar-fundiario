---
phase: 20-auditoria-fable-5
plan: 01
completed: 2026-07-10
tasks: 3/3
requirements-completed: [FABLE-01]
one_liner: "Auditoria Fable 5 em 4 dimensões → verificação adversarial (0 refutados) → 37 correções em 26 commits atômicos; suíte 239→252 verde; 1 crítico real (busca travava permanentemente) corrigido."
key-files:
  created:
    - ".planning/phases/20-auditoria-fable-5/20-FABLE-AUDIT.md"
  modified:
    - "radar-goiania.html"
    - "sw.js"
    - "tests/templates.test.mjs"
    - "tests/pd.test.mjs"
    - "tests/negocio.test.mjs"
    - "tests/caderno.test.mjs"
    - "tests/fixtures.mjs"
key-decisions:
  - "Verificação adversarial obrigatória antes de corrigir: 19 findings submetidos, 0 refutados, 2 rebaixados, 1 agravado — sinal de que os auditores Fable 5 acertaram o alvo"
  - "C-08 (montarNeg sem teste) aceito como dívida documentada: extrair para função pura é refatoração de porte médio, e a regra jurídica está correta e verificada manualmente"
  - "sw.js não teve bump de CACHE: nenhum asset da lista mudou; atualização do SW ocorre por diff de bytes + skipWaiting/claim"
---

# Fase 20 — Auditoria Fable 5 (gate final)

## O que foi feito

Protocolo em 3 estágios, tudo com agentes Fable 5 (sem override de modelo):

1. **4 auditores** em dimensões disjuntas (código & segurança; UX & consistência; documentos & dados; mobile, performance & a11y) → 41 findings.
2. **2 verificadores adversariais** instruídos a refutar → 19 findings principais submetidos, **0 refutados**, 2 rebaixados de severidade, 1 agravado (o erro do Urbanístico ficava preso no cache), 17 triviais triados, 1 SKIP.
3. **2 fixers** → 37 correções em **26 commits atômicos**, `npm test` verde antes de cada um; suíte cresceu de 239 para **252** (13 testes de regressão novos).

## Achado principal

**A-01 (crítico):** colar um link do Google Maps enquanto uma busca lenta estava em voo travava o botão de busca **permanentemente** (até recarregar). Causa: `identifyPoint()`/`loadCi()` incrementam o mesmo `SEARCHTOKEN` que o `finally` de `buscar()` usa como guard para reabilitar o botão. É exatamente a classe de bug que revisões fase-a-fase não enxergam — a falha vive na junção entre a Fase 3 (clique no mapa) e a Fase 8 (busca), construídas com dias de diferença.

## Verificação

Suíte 252/252. Verificação ao vivo em Chromium confirmou, no código já corrigido: botão reabilitado após early-return; focus-trap agora é pilha; `zapArgumento` de imóvel caro abre negociação em vez de "reforçar o valor pedido"; `parseMatricula` não engole o ponto final; parcial rural não mente "Macrozona Construída"; limpar a busca traz Caderno/Oportunidades de volta.

## Dívida aceita

C-08 — `montarNeg` sem teste automatizado (regra formal correta, verificada manualmente). Registrado para milestone futuro.
