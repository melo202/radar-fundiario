# Parecer de segurança — prontidão para deploy público (VPS + domínio)

**Data:** 2026-07-10 · **Modelo:** Fable 5 (sem override) · **Escopo:** diff `v2.2..HEAD` (27 commits sem revisão de segurança prévia: lapidação Fable 5 + busca + petróleo) + prontidão para exposição pública.
**Método:** 3 auditores só-leitura (XSS, LGPD/PII, CSP/deploy). Nenhum arquivo tocado.

## Veredito

**O código está limpo. O que falta para ir ao ar com segurança é de infraestrutura e de decisão do dono — não de bug.**

- **XSS (S-A): 0 achados, 0 alcançável por terceiro.** A migração `on*`→`data-*` da lapidação está completa; o import de caderno (o vetor de maior valor) é barrado pela allowlist + `esc()` no render; `montarNeg` escapa antes do `<br>`; a paleta é só CSS. Nada no diff quebrou o contrato de escape.
- **LGPD (S-B): 0 vazamento de PII de terceiro** para DOM/IndexedDB/localStorage/export. 1 achado de código baixo (fallback sem `sanitiza()`); 4 são decisões do dono.
- **CSP/deploy (S-C): 12 achados** — a maioria é configuração de servidor que **ainda não existe** porque o app nunca foi servido por VPS.

## Bloqueadores REAIS antes de apontar o domínio (não-código, mas obrigatórios)

1. **[SC-02] Docroot.** Servir SÓ o `radar-goiania.html` + assets (js/json/manifest/ícones/sw.js). NUNCA a raiz do repo — senão `.git/`, `.py`, `.planning/` (inclui estas auditorias) e datasets crus ficam públicos. O Pages filtrava; a VPS não.
2. **[SC-03/04] CSP como header HTTP no nginx** (não só no `<meta>`) — é o único jeito de setar `frame-ancestors 'none'` (anti-clickjacking) e de cobrir o `index.html`, que hoje não tem CSP nenhuma.
3. **[SC-06/07] HTTPS + HSTS obrigatório** — sem TLS o service worker/PWA não ativa e o clipboard degrada. Let's Encrypt resolve.
4. **Headers de servidor:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (desligar câmera/mic/geo), MIME correto do `sw.js` sem cache longo. Checklist completo do nginx em `S-C-csp-deploy.md`.

## Fix de código pequeno recomendado antes de subir

- **[SB-01/A-08] fallback de bairro sem `sanitiza()`** — 1 linha, o irmão esquecido do A-08. Não é vazamento (só alimenta contagem), mas fecha a última exceção ao padrão "toda ingestão passa por sanitiza()". Posso aplicar em Fable.

## Redução de superfície opcional (endurecimento, não bloqueador)

- **[SC-01] JSONP → fetch+JSON.** O `portalmapa.goiania.go.gov.br` está em `script-src` porque o app usa JSONP — ou seja, o endpoint pode executar JS no app por construção. Migrar para `fetch()`+JSON tira o host do `script-src` (move para `connect-src`) e elimina o único vetor equivalente a XSS que resta. É refactor de porte médio; vale se o app for público de verdade.

## Decisões do DONO (você, advogado — não são bugs, são exposição por design)

- **[SB-02] ALTA:** num domínio público, qualquer visitante vê inscrição + valor + endereço de imóveis de terceiros. Precisa de finalidade/base legal declarada e, recomendado, `noindex` na rota `?insc=` (o dado é cadastro público municipal, mas exposição indexável agregada é outra coisa).
- **[SB-03]** deep-link `?insc=` compartilhável expõe um imóvel específico — mesma avaliação.
- **[SB-04]** perfil do corretor (CRECI/nome) + caderno ficam no navegador → vazam em dispositivo compartilhado. Sugestão: botão "apagar meus dados deste aparelho" + nota de privacidade.
- **[tiles Esri]** satélite "keyless legado" — ToS para produto público de tráfego real (o próprio PROJECT.md já marcou "revisitar se público").
- **[endpoint frágil]** a prefeitura dá 502 sob carga e sem SLA; tráfego público pode degradar/bloquear.

## Resumo de uma linha

Pode ir ao ar **com HTTPS + docroot restrito + CSP em header + os headers do checklist**, e depois de você decidir os pontos de LGPD/ToS. O código em si passou no passe de XSS/PII sem achado alcançável.
