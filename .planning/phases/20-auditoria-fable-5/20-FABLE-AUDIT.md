---
phase: 20-auditoria-fable-5
audited: 2026-07-10
auditors: 4 (Fable 5, dimensões disjuntas)
adversarial_verifiers: 2 (Fable 5, instruídos a refutar)
fixers: 2 (Fable 5)
findings_total: 41
confirmed: 19 (dos 19 submetidos à verificação adversarial)
refuted: 0
downgraded: 2
upgraded: 1
trivial_fixes: 17
accepted_as_debt: 1
commits_de_correcao: 26
suite: 252/252 verde (era 239 — +13 testes novos de regressão)
veredito: PASSED
---

# Auditoria Fable 5 — Gate Final (v2.2)

**Protocolo:** 4 auditores Fable 5 em dimensões disjuntas → verificação adversarial por 2 céticos Fable 5 (instruídos a REFUTAR) → correções aplicadas por 2 fixers Fable 5 em commits atômicos com suíte verde → verificação ao vivo em Chromium.

## Veredito

**PASSED.** 41 findings; os 19 submetidos à verificação adversarial sobreviveram (0 refutados, 2 rebaixados de severidade, 1 **agravado** na verificação). 37 corrigidos, 1 aceito como dívida documentada, 3 absorvidos por duplicidade entre dimensões. Suíte 239 → **252 verdes** (+13 testes de regressão).

O achado mais importante — **A-01, crítico** — é um bug de produto real: colar um link do Google Maps enquanto uma busca lenta estava em voo deixava o botão de busca **permanentemente travado** até recarregar a página. Nenhuma revisão fase-a-fase poderia tê-lo visto: a Fase 8 (busca) e a Fase 3 (clique no mapa) compartilham o mesmo `SEARCHTOKEN`, e só a leitura das duas juntas revela que o `finally` de uma nunca reabilita o botão quando a outra rouba o token.

## Findings confirmados e corrigidos

| ID | Sev. | Título | Correção |
|----|------|--------|----------|
| A-01 | **critical** | Busca trava permanentemente quando `identifyPoint`/`loadCi` roubam o SEARCHTOKEN durante busca em voo | `btn.disabled=false` movido para fora do guard de token no `finally` |
| A-02 | warning | Filtro "Setor" do Caderno sempre vazio (chave IndexedDB number × string) | `getAll()` + filtro em memória com coerção de tipo |
| A-03 ≡ D-01 | warning | Focus-trap single-slot: handler órfão + foco perdido em sheet aninhado sobre a ficha | trap virou **pilha** (`TRAPS[]`) com push/pop por container |
| A-04 | baixa | Dado do endpoint interpolado em string JS de `onclick` (violação do padrão CR-01) | `data-insc`/`data-code` + handlers lendo `dataset` |
| A-05 | warning | Ficha aberta pelo detector traz dados truncados **e os persiste** (endereço vazio no histórico/caderno) | `abrirFichaDetector` rehidrata via `loadCi()` |
| B-01 | warning (agravado) | Erro do Urbanístico oferece saída falsa ("Toque para tentar de novo" sem botão) **e o erro fica preso no PDCACHE** | botão de retry real nos 2 caminhos + estado de erro não é cacheado |
| B-02 ≡ D-08 | warning | Esc fecha o painel do território por baixo do sheet de comparação | `abrirComparacao()` fecha o painel antes (1 sheet por vez) |
| B-03 | warning | "✓ No caderno" sem feedback (scroll em container `display:none`) | toast garantido + scroll só se visível |
| B-04 | warning | Oportunidades/Histórico/Caderno somem após qualquer busca, sem caminho de volta | `#caixaClear` restaura o estado vazio (verificado ao vivo) |
| B-05 | baixa | "Ver comparáveis" rola até bloco vazio sem coordenada; nome divergente no destino | renderização condicional + rótulo unificado |
| B-06 | warning | Falha ao carregar zonas do PD é silenciosa **e o vazio é cacheado** | detecta falha total, não cacheia, avisa com saída |
| B-07 + D-07 | warning | `#calc` declara `aria-modal` sem sê-lo; `#laudoView` e `#terrPanel` sem trap | trap aplicado às 3 superfícies + roles corretos |
| B-08 | baixa | Um Esc descarta a minuta jurídica digitada, sem confirmação | `confirm()` quando há dados (sem violar "nunca persiste") |
| C-01 | média | Estado parcial rotula lote **rural** como "Macrozona Construída" | literal condicionado à macrozona real + teste |
| C-02 | média | `parseMatricula` captura o ponto final da frase → matrícula errada no contrato | regex exige terminar em dígito + teste |
| C-03 | média | `zapArgumento` conclui "reforça o valor pedido" mesmo com imóvel 22% **acima** da mediana | fecho condicional à direção + 2 testes |
| D-02 | média | Legenda do choropleth colide com a pill de busca no mobile | reposicionada abaixo da pill em <821px |
| D-03 | média | Inputs do Caderno com 13px disparam auto-zoom do iOS | 16px nos 4 seletores |
| D-04 | média | Retry da varredura parcial é um `div` de 10.5px com onclick | virou `<button>` de 44px acessível |
| D-05 | média | Zonas do PD: 6 requisições a cada pan >1m | contenção de bounds (`ZONALAST`) + envelope com folga |
| D-06 | baixa | Resultado da busca não é anunciado a leitores de tela (desktop) | anúncio via live region |

**Triviais também corrigidos:** eviction FIFO real do `capCache` (A-06); `ignoreSearch` no deep-link offline e timeout de 4s no network-first do service worker (A-07, D-10); `sanitiza()` nos comparáveis (A-08); merge por `ci` no import do caderno + truncamento de `endereco` (A-09); neutralização de fórmula no CSV (A-10); plural correto (B-09); nome do setor no caderno (B-10); nomes do detector unificados (B-11); clipboard com fallback (B-12); banda de valor fabricada removida do laudo sem estimativa (C-04); disclaimer interpolado da constante (C-05); **linhas de testemunhas no contrato e no termo** (C-06, CPC art. 784, III); `habilitaPtam()` extraída e testada (C-07); rótulo do detector diferencia "PD indisponível" de "parâmetro não conferido" (C-09); contraste AA do accent em textos pequenos (D-09).

## Aceito como dívida documentada

- **C-08** — `montarNeg` (montagem do documento impresso: partes, testemunhas, filtro do disclaimer) não tem teste automatizado. Extrair para função pura testável é refatoração de porte médio; a regra formal-jurídica está correta hoje e verificada manualmente. Registrado para um milestone futuro.

## Áreas auditadas e limpas

REGRA DE OURO do Plano Diretor (nenhum caminho de render emite CA sem `conferido:true`); citações de artigo da LC 349/2022; disclaimers jurídicos (literais, nunca enfraquecidos, reinseridos à força no impresso); allowlists anti-PII incluindo a recursiva do snapshot (`dtnascimen` nunca sobrevive, nem via import); injeção em WHERE (só dígitos/termos sanitizados); orçamentos de rede (≤3 páginas + count, com guard compartilhado no fallback); guards de invalidação assíncrona (SEARCHTOKEN/DRILLTOKEN/ZONASTOKEN/DCUR e família); precache do service worker íntegro; `prefers-reduced-motion` em todas as animações; seam de IA comprovadamente dormente (zero call-sites).

## Evidência ao vivo (Chromium, pós-correções)

`A-01` botão reabilitado após early-return ✓ · `trapFocus` é pilha ✓ · `zapArgumento` de imóvel caro abre negociação em vez de reforçar preço ✓ · `parseMatricula("...45.678. Cartório")` → `"45.678"` ✓ · parcial rural não mente "Construída" ✓ · limpar a busca traz Caderno/Oportunidades de volta ✓ · suíte 252/252.
