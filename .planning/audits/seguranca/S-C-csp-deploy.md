# Auditoria S-C — CSP / Deploy / Superfície de Rede

- **Data:** 2026-07-10
- **Auditor:** Fable 5 (S-C · CSP / deploy / superfície de rede)
- **Alvo do deploy:** VPS com domínio próprio, servido **publicamente** por HTTPS (muda o contexto de "uso local / GitHub Pages" da Fase 20 / tag `v2.2`)
- **Modo:** SOMENTE-LEITURA. Nenhum arquivo do app foi modificado.
- **Arquivos lidos:** `radar-goiania.html` (CSP linha 7, JSONP, clipboard, registro do SW), `sw.js` (completo), `PUBLICAR.md`, `index.html`, `manifest.json`, e a árvore da raiz do repo.

## Sumário executivo

O app está **estruturalmente pronto** para HTTPS público — o SW é guardado por checagem de protocolo, o clipboard tem fallback, os tiles/JSONP já estão nas diretivas certas da CSP, e a SRI dos 3 scripts do cdnjs está presente. Não há geolocalização no código (verificado: nenhum `getCurrentPosition`/`watchPosition`), então esse vetor cai fora.

Duas coisas exigem decisão **antes** de abrir ao público:
1. **JSONP dá ao endpoint da prefeitura o poder de executar JS arbitrário no app** (SC-01) — o maior vetor equivalente a XSS, e o único que dá pra reduzir por design.
2. **Se o docroot da VPS = raiz do repo, documentos internos vazam** (SC-02) — o Pages resolvia isso com o workflow do Actions; a VPS não tem esse filtro de graça.

O resto é **higiene de headers de servidor** (seção Checklist), que a `<meta>` CSP sozinha não cobre — inclusive `frame-ancestors`, que é **ignorado** dentro de `<meta>` e só vale como header HTTP.

---

## Findings

| ID | Sev. | Título | Risco | Proposta |
|----|------|--------|-------|----------|
| **SC-01** | **ALTA** | JSONP permite que `portalmapa.goiania.go.gov.br` execute JS arbitrário | `jsonpOnce()` (html:3253) injeta `<script src="…&callback=cb">` e **executa** o corpo da resposta; `script-src` inclui o host da prefeitura (CSP linha 7) por construção. Se o endpoint for comprometido, sofrer MITM (não há SRI possível em JSONP), ou responder algo malicioso, roda no contexto do app — leitura do DOM, do clipboard, exfiltração. Em domínio público isso é a maior superfície de execução. | O JSONP existe só para driblar CORS no uso `file://` local. Numa origem HTTPS pública, o ArcGIS REST costuma responder CORS com `f=json`. **Testar `fetch()`+JSON** contra os 3 serviços (SVC/LOTSVC/BAISVC + PD_SVC_BASE); se passar, remover `portalmapa…` de `script-src` e movê-lo para `connect-src`. Elimina a execução arbitrária de raiz. (Refactor médio; alto valor.) |
| **SC-02** | **MÉDIA** | Docroot da VPS pode expor docs internos, `.git`, datasets crus | A raiz do repo tem `AUDITORIA-2026-07-03.md`, `PEDIDO-LAI-ITBI.md`, `PESQUISA-inteligencia…md`, `IDEIAS-hub-corretor.md`, `INTELIGENCIA-radar.md`, os `.py`, `tests/`, `.planning/`, `.git/`, e `bairros-goiania.wgs84-raw.json` (5 MB). O `pages.yml` do Actions **filtra** isso; um `git clone` como docroot na VPS serviria tudo publicamente (código-fonte, notas de negócio, histórico git). | Docroot deve conter **só** os arquivos do app (o mesmo conjunto que o `pages.yml` publica). Alternativa: `location` no nginx negando `\.(md\|py\|json)$` exceto os datasets do app, mais `location ~ /\.(git\|planning)` → `deny all`. Ver checklist. |
| **SC-03** | **MÉDIA** | Falta `frame-ancestors` — clickjacking | Sem `frame-ancestors`, qualquer site pode embutir o app em `<iframe>` (clickjacking / UI-redress). Relevante em domínio público de verdade. **A `<meta>` CSP atual não resolve: `frame-ancestors` é ignorado em `<meta>`** — só funciona como header HTTP. | Header `Content-Security-Policy: …; frame-ancestors 'none'` + `X-Frame-Options: DENY` (fallback p/ navegadores antigos). Ver checklist. |
| **SC-04** | **MÉDIA** | CSP entregue só via `<meta>` — não-autoritativa | Além de perder `frame-ancestors` (SC-03), a `<meta>` não cobre `index.html` (o redirecionador, que hoje **não tem CSP nenhuma**), não permite `report-to`/`report-uri`, e só entra em vigor depois do parse do HTML. | Entregar a CSP como **header HTTP no nginx**, cobrindo todas as respostas do site. Manter a `<meta>` como cinto-e-suspensório OU removê-la para ter fonte única (recomendo header como fonte única para evitar divergência silenciosa). |
| **SC-05** | **MÉDIA** | `script-src 'unsafe-inline'` é estrutural — enfraquece defesa XSS | App single-file: todo o JS é inline. `'unsafe-inline'` é obrigatório e **não removível sem build**. Consequência: se um XSS injetar `<script>` inline, ele executa. Trade-off assumido. | Não dá pra remover sem refactor (hash/nonce exigiria etapa de build; nonce em `<meta>` não é confiável). **Mitigantes já presentes:** SRI nos 3 scripts do cdnjs (html:15-17). **Mitigante de maior retorno:** SC-01 (tirar o JSONP) fecha o vetor de injeção realista. Documentar o trade-off no PUBLICAR/README. |
| **SC-06** | **MÉDIA** | `connect-src 'self'` — quebra latente ao ativar IA ou migrar JSONP | Hoje está **correto**: todo tráfego cross-origin é `<script>` (JSONP → `script-src`) ou `<img>` (tiles → `img-src`); `fetch()` só toca datasets same-origin. **Mas** (a) o adapter de IA comentado (html:8488) faz `fetch()` a um endpoint OpenRouter — se IA-02 for ligada, `connect-src 'self'` bloqueia; (b) se SC-01 migrar JSONP→fetch, o host da prefeitura precisa entrar em `connect-src`. | Deixar registrado: qualquer ativação de rede nova (IA, fetch ao ArcGIS) exige atualizar `connect-src` **em dois lugares** se a `<meta>` for mantida (meta + header). |
| **SC-07** | **MÉDIA** | Recursos que exigem contexto seguro degradam em HTTP | Em HTTP puro: **service worker não registra** (guardado em html:8018 por `location.protocol==="https:"` — degrada gracioso, sem offline/PWA); **`navigator.clipboard` fica indefinido** → cai no fallback `execCommand` (html:6708, funciona mas é deprecado); **instalação PWA some**. Geolocalização **não é usada** (verificado), então não entra. Nada quebra "duro", mas offline+PWA+clipboard-moderno somem sem TLS. | TLS obrigatório (Let's Encrypt) + redirect 80→443 + HSTS. Ver checklist. |
| **SC-08** | **BAIXA** | Falta `upgrade-insecure-requests` | Risco prático baixo: todas as subrequisições já são `https://` hardcoded (cdnjs, cartocdn, arcgisonline, portalmapa). Mas é defesa-em-profundidade barata contra qualquer referência `http://` acidental futura. | Adicionar `upgrade-insecure-requests` à CSP (header). Custo zero. |
| **SC-09** | **BAIXA** | Vazamento de `Referer` com `?insc=` para terceiros | Deep-links usam `?insc=<inscrição cadastral>` (SW linha 61 confirma). Requisições de tiles (CARTO/Esri) e JSONP (prefeitura) carregam o `Referer` com a query — a inscrição (dado público, mas identificável) vaza para CDNs de terceiros. | Header `Referrer-Policy: strict-origin-when-cross-origin` (ou `no-referrer`). Ver checklist. |
| **SC-10** | **BAIXA** | Tiles Esri "keyless legado" + CARTO free — risco de ToS/throttle (não-código) | `server.arcgisonline.com/…/World_Imagery` é acesso legado sem chave: os termos da Esri restringem uso sem key e podem throttlar/bloquear sob tráfego público real. `*.basemaps.cartocdn.com` free tem limites de uso. Atribuição está presente (bom). | Para tráfego público sustentado: obter chave/plano próprio (Esri/MapTiler/etc.) ou provedor com plano público. Só levantar — decisão de produto, não bug. |
| **SC-11** | **BAIXA** | SW cacheia cdnjs sem verificar SRI no próprio SW | No `install`, `fetch(u).then(r=>r.ok && c.put(u,r))` (sw.js:35) guarda os libs do cdnjs **sem** checar integridade dentro do SW. Mitigado: as tags `<script integrity=…>` (html:15-17) revalidam no uso independente da origem do cache. Residual baixo. | Sem ação de código. **Disciplina operacional:** ao trocar versão/URL de lib do cdnjs, **bumpar `CACHE`** (hoje `"radar-v7"`, sw.js:12), senão clientes seguem com lib velha. Registrar no checklist de release. |
| **SC-12** | **INFO (positivo)** | SW exclui corretamente JSONP do ArcGIS e tiles do cache | Confirmação: `fetch` handler (sw.js:47-52) retorna cedo para tudo que não é same-origin nem cdnjs → **consultas cadastrais (dado vivo de terceiro) e tiles nunca são cacheados**. Não há cache-poisoning nem persistência de resposta de terceiro. Network-first c/ timeout 4s + `ignoreSearch` no fallback de navegação estão corretos. | Nenhuma ação. Comportamento correto e desejado — mantido. |

---

## Checklist de deploy seguro (VPS + HTTPS)

Ordenado por prioridade. Itens de código (SC-01) ficam à parte; abaixo é **configuração de servidor/nginx** — fora do HTML.

### 1. TLS e transporte (bloqueia SC-07)
- [ ] Certificado válido (Let's Encrypt / certbot), renovação automática.
- [ ] Redirect **80 → 443** (nginx `return 301 https://$host$request_uri;`).
- [ ] **HSTS:** `Strict-Transport-Security: max-age=63072000; includeSubDomains` — adicionar `; preload` só depois de confirmar que todo o domínio e subdomínios são HTTPS para sempre.
- [ ] `server_tokens off;` (esconde versão do nginx).

### 2. Higiene do docroot (fecha SC-02)
- [ ] Docroot contém **apenas** os arquivos do app (o mesmo conjunto do `pages.yml`): `index.html`, `radar-goiania.html`, `sw.js`, `manifest.json`, `caixa-goiania.js`, `bairros-goiania.json`, `logradouros-goiania.json`, `bairro-cdbairro.json`, os ícones/`apple-touch-icon.png`.
- [ ] **NÃO** publicar: `*.md`, `*.py`, `tests/`, `.planning/`, `.git/`, `__pycache__/`, `bairros-goiania.recon.json`, `bairros-goiania.report.md`, `bairros-goiania.wgs84-raw.json`, `package.json`.
- [ ] `autoindex off;` (sem listagem de diretório).
- [ ] Bloqueio defensivo: `location ~ /\.(git|planning) { deny all; }` e negar `.py`/docs internos caso o docroot não seja um subconjunto limpo.

### 3. Headers de segurança HTTP (fecham SC-03, SC-04, SC-08, SC-09)
Aplicar a todas as respostas (`add_header … always;`):
- [ ] **CSP como header** (fonte autoritativa; espelha a `<meta>` + acréscimos):
      `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`
      (Se SC-01 for feito: mover `portalmapa…` de `script-src` para `connect-src`. Se IA-02 for ligada: adicionar o host do endpoint em `connect-src`.)
- [ ] `X-Frame-Options: DENY` (fallback de `frame-ancestors`).
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` (ou `no-referrer`).
- [ ] `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()` — trava APIs que o app não usa (geolocalização confirmada como não-usada).
- [ ] (Opcional) `Cross-Origin-Opener-Policy: same-origin`.

### 4. MIME types e cache (suporta SW/PWA + SC-11)
- [ ] MIME corretos: `manifest.json` → `application/manifest+json`; `.js` → `text/javascript`; `.json` → `application/json`.
- [ ] **`sw.js` e `index.html`:** `Cache-Control: no-cache` (ou `max-age=0, must-revalidate`) — SW e página de entrada precisam atualizar rápido; senão o `skipWaiting`/`clients.claim` do SW briga com um SW velho preso no cache do navegador.
- [ ] `radar-goiania.html`: cache curto/revalidado (é network-first no SW, mas o 1º hit vem do servidor).
- [ ] Datasets grandes e ícones (JSON, PNG): cache longo (`max-age=31536000, immutable`) — são versionados pelo bump de `CACHE` do SW.
- [ ] (Opcional) `Service-Worker-Allowed: /` no `sw.js` se algum dia o escopo precisar subir; hoje o escopo raiz basta.
- [ ] Ao trocar versão de lib do cdnjs: **bumpar `CACHE` em `sw.js`** (SC-11) — item de checklist de release, não de servidor.

### 5. Performance/entrega
- [ ] gzip/brotli para `.html`, `.js`, `.json` (datasets somam >1,5 MB — `logradouros` 1 MB, `bairros` 780 KB).

### 6. Decisões de produto pendentes (não bloqueiam, mas registrar)
- [ ] SC-10: definir se mantém tiles keyless (risco de bloqueio sob tráfego real) ou migra para provedor com chave/plano público.
- [ ] SC-01: decidir o refactor JSONP→fetch (fecha o maior vetor de execução).
- [ ] `PUBLICAR.md` hoje cobre **só GitHub Pages** — não menciona VPS, nginx, headers, nem TLS. Recomendo uma seção "Deploy em VPS própria" quando o deploy público for para frente (este checklist serve de base).
