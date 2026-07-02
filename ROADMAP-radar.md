# ROADMAP — Radar Fundiário · Goiânia

> Consolida a auditoria técnica (02/07/2026) + o briefing de projeto (`PROJETO-radar.md`).
> Legenda de status: ✅ feito · 🔶 feito, pendente de teste manual · ⬜ a fazer.

---

## 0. Fatos validados no endpoint real (base das decisões)

Testes executados em 02/07/2026 direto no ArcGIS da Prefeitura:

| Fato | Resultado | Consequência |
|---|---|---|
| `outFields` com campos específicos | **Erro 400** — só `outFields=*` funciona | Confirma a "manha" do §4 do briefing; não dá para reduzir payload por campo |
| Filtro server-side `nrquadra LIKE '%128%'` (Bueno) | **Funciona: 630 registros** (vs 57.225 do setor todo) | É a alavanca certa para o bug crítico |
| `UPPER(...)` em where | Funciona (`useStandardizedQueries: true`) | Busca case-insensitive server-side ok |
| CORS | Sem cabeçalho `Access-Control-Allow-Origin` | JSONP continua necessário |
| Consulta pesada (count da base toda) | **502 Proxy Error** | Servidor frágil sob carga — minimizar volume |
| Setores distintos | 709 | Carga de bairros (limite 2000) está segura |
| Maiores setores (com `vlvenal>0`) | Bueno 57.225 · Oeste 32.472 · Jd Goiás 23.402 · Marista 20.746 · Jd América 19.175 | A trava antiga de 6×2000=12.000 truncava silenciosamente os setores mais importantes |
| Paginação (`resultOffset`) | Suportada; `maxRecordCount` = 1.000.000 | Loop de páginas ok |
| Campos usados pelo app (19) | Todos existem na camada (85 campos) | — |

---

## P0 — Busca confiável (bug crítico) — ✅ implementado

**Problema:** buscas por quadra/lote e endereço baixavam o setor inteiro com teto de 12.000 registros → "Nada encontrado" falso nos setores grandes (Bueno cobria só ~21%).

**Solução implementada:**
1. ✅ **Filtro server-side** na cláusula `where`:
   - Quadra/lote: `cdbairro=X AND vlvenal>0 AND UPPER(nrquadra) LIKE '%<termo>%' [AND UPPER(nrlote) LIKE ...]`. O termo LIKE usa os dígitos do input (ou letras, se não houver dígito), garantindo recall ≥ regras de refino do cliente; o refino fino (equivalências "246"≈"Q246", lote "21" em "20/21") continua no navegador.
   - Endereço: se há número → `nrimovel LIKE '%<dígitos>%'`; senão, se a rua tem dígitos (ruas numeradas) → `nmlogradou LIKE '%<dígitos>%'`; senão `UPPER(nmlogradou) LIKE '%<texto>%'` com **fallback** para varredura do setor se retornar vazio (cobre divergência de acento).
   - Inscrição: >10 dígitos consulta `nrinscr` (unidade, 14 díg.); ≤10 consulta `ci` (lote). Corrige o caso do usuário colar a inscrição do IPTU.
2. ✅ **Trava de paginação** subiu para 30 páginas (60.000) **com aviso ao usuário** se truncar (antes truncava em silêncio).
3. ✅ **Erro do servidor não vira mais "Nada encontrado"**: resposta `{error:...}` do ArcGIS agora rejeita a promise e mostra toast de falha.
4. ✅ Limite de 400 → 2.000 registros no clique-no-mapa e na busca por inscrição (condomínios grandes).

**Aceite:** buscar Q 128 no Setor Bueno retorna resultados completos; derrubar a rede no meio mostra erro de conexão, não "nada encontrado".

---

## P0 — Bugs conhecidos do briefing

5. 🔶 **Botão "titular" apontava para a página errada** (`siptu00020` = características, não o dono).
   Implementado: o botão agora **copia a inscrição para a área de transferência** (toast confirma) e abre a **Consulta e Emissão de Guia** (`siptu00200f0.asp`), candidata a exibir "Contribuinte: NOME".
   **Pendente (manual, exige CAPTCHA):** confirmar se a guia exibe mesmo o contribuinte; a alternativa é a Certidão de Detalhamento Cadastral (`saces00000f0.asp?sigla=sccer`). Se for a certidão, trocar 1 linha (constante `iptu`).
6. 🔶 **iOS — autocomplete de setor não abre ao digitar.** Aplicadas as correções padrão: fechamento da lista por `pointerdown` (em vez de `click`, que no Safari engolia o toque) e `font-size: 16px` nos inputs (mata o auto-zoom do iOS, suspeito de bagunçar o foco). **Pendente: teste no iPhone real** — se persistir, investigar com Safari remoto.
7. ✅ **Deixar explícito que o app não devolve o dono**: já coberto no rodapé + title do botão titular.

---

## P0 — Mobile premium (M1–M8 do briefing) — ⬜ próxima onda

Ordem sugerida (menor risco → maior):
- **M2 primeiro** (anti-zoom 16px ✅ já feito; teclado: `inputmode="numeric"` onde couber — atenção: quadra/lote aceitam letra, ex. "10E"; usar `inputmode="text"` neles e numérico só em número/inscrição).
- **M1** autocomplete no toque (🔶 acima; validar no aparelho).
- **M4** detalhe como bottom sheet arrastável (hoje cobre o mapa).
- **M3** mapa em primeiro plano com alternância Busca⇄Mapa + tap-to-identify.
- **M5** alvos de toque ≥44px (cards, botões do detalhe, ×).
- **M6** safe-area/notch (`env(safe-area-inset-*)`).
- **M7** performance 4G: com o filtro server-side (P0) o payload por busca caiu de ~12k para dezenas/centenas de registros — reavaliar se ainda há gargalo; cache de sessão por consulta é o próximo passo barato.
- **M8** PWA (manifest + service worker cache de app shell). Requer HTTPS → GitHub Pages resolve.
- Checklist de aceite no aparelho (iPhone + Android).

---

## P1 — Robustez e segurança — ✅ implementado nesta rodada

8. ✅ **Escape de HTML** (`esc()`) em tudo que vem da API e vai para `innerHTML` (logradouro, edifício, complemento, bairro, combo de setores). Fecha o vetor XSS/quebra de layout.
9. ✅ **Guarda de CDN**: se Leaflet/proj4 não carregarem, mensagem clara em vez de página morta.
10. ✅ **Coeficiente atualiza o painel de detalhe aberto** (antes ficava com o valor antigo) e preserva a seleção do card.
11. ✅ **Filtro de garagem não se aplica à busca por inscrição** (quem busca a inscrição exata de um box quer vê-lo).
12. ✅ Código morto removido (`data-disp`).
13. ⬜ Retry/backoff nas chamadas JSONP (1 retry com backoff curto resolve os 502 esporádicos).
14. ⬜ **JSONP em si**: aceitável para uso próprio (TLS protege o canal; a confiança é no servidor da prefeitura). Se um dia virar produto: proxy próprio (ex.: Cloudflare Worker gratuito) fazendo o fetch e devolvendo JSON com CORS — elimina execução de script remoto e ainda permite cache.

---

## P1 — Publicação (GitHub Pages) — ⬜

Ver análise no fim. Passos: repositório GitHub → renomear/copiar para `index.html` (ou apontar o link direto para o arquivo) → Settings ▸ Pages ▸ Deploy from branch. Zero mudança de código necessária.

---

## P2 — Backlog estruturado

15. ⬜ **Metodologia do valor de referência.** O coeficiente único é grosseiro e o slider global mistura setores. Caminho defensável, em ordem de esforço:
    a. Exibir **data-base do venal** (campo `dtultalter`/vigência IPTU) e reforçar o rótulo "estimativa, não é avaliação (PTAM)".
    b. Coeficiente **por setor** (persistido em `localStorage`), calibrado pelo usuário com 3–5 anúncios reais do setor.
    c. Normalizar por **R$/m² mediano do setor+uso** (computável da própria base venal via uma varredura offline) e mostrar faixa (± incerteza), não número seco.
    d. Investigar valor de referência do **ITBI** de Goiânia como âncora de mercado (não há API pública conhecida — recon).
16. ⬜ **Cache/banco local.** Curto prazo: cache de sessão por consulta (Map em memória) — barato. Estrutural: espelho da base em IndexedDB (ou SQLite via ferramenta externa) alimentado por varredura paginada offline → busca instantânea, filtros pesados, modo offline. Respeitar o servidor (varrer de madrugada, 1 vez por mês).
17. ⬜ **Multi-cidade.** Extrair objeto de configuração: `{nome, endpoint, epsg/proj4, mapaDeCampos, prefixosSetor, urlsOficiais(titular/venal), quirks(outFields, jsonp)}`. Recon mínimo por cidade: achar a camada de cadastro, projeção, campos equivalentes e política CORS/JSONP. (Goiânia aberta; Aparecida = Geopixel com login; Senador Canedo sem mapa.)
18. ⬜ **Testes automatizados.** Extrair as funções puras (`norm`, `likeTerm`, `displayName`, `matchApto`, `isGarage`, filtros de quadra/lote/endereço, `toWGS`) para testá-las com Node + fixtures JSON reais gravadas do endpoint. Casos que travam regressão: zona UTM 22 (o bug do "pino na Bahia"), lote "20/21", quadra "10E", apto "1901" vs "19", padding de espaços.
19. ⬜ **Refinar o fuzzy** (falso positivo): número do imóvel casar por igualdade de dígitos primeiro e substring só como fallback sinalizado; rua casar por fronteira de palavra ("135" não casar "1350"); ordenar resultados por qualidade do match.
20. ⬜ **Acessibilidade:** `for=`/`id` nos labels, ARIA no combobox (`role="combobox"`/`listbox`), `Esc` fecha o detalhe, foco visível, contraste AA.
21. ⬜ **Exportar ficha/planilha** (CSV dos resultados; ficha do imóvel em PDF).
22. ⬜ **Offline total** (depende de 16 + M8).

---

## Respostas às perguntas dirigidas do briefing (§10)

1. **JSONP + innerHTML:** o escape já foi aplicado (item 8) — era o barato e necessário. JSONP é aceitável para uso próprio; a alternativa que preserva "roda local" não existe de graça (o endpoint não tem CORS) — quando hospedar, um Worker-proxy resolve (item 14).
2. **Mobile P0:** ordem sugerida acima (M2→M1→M4→M3→M5→M6→M7→M8). O maior ganho de percepção é o bottom sheet (M4).
3. **Titular:** POST + CAPTCHA não pré-preenche por URL; clipboard é o caminho (implementado). Qual página mostra o dono só se confirma manualmente resolvendo o CAPTCHA — teste a guia primeiro (já apontada), certidão como plano B.
4. **Valor de referência:** ver item 15 — evoluir de multiplicador global → coeficiente por setor → mediana R$/m² com faixa de incerteza. Sempre rotulado como estimativa.
5. **Fuzzy:** ver item 19.
6. **Performance em campo:** o filtro server-side já derrubou o payload em ~99% nos casos típicos; cache de sessão em seguida; banco local é o fim do jogo (item 16).
7. **LGPD/rótulos:** postura correta e defensável (finalidade preservada, titular manual). Acrescentar: data-base do venal e a frase "estimativa — não substitui avaliação profissional" no card/detalhe.
8. **Multi-cidade:** ver item 17.
9. **Testes:** ver item 18.
10. **Riscos não mapeados:** (a) o endpoint é um serviço sem SLA — pode mudar/sumir sem aviso; ter mensagem de diagnóstico clara e o espelho local como plano B; (b) 502 sob carga — retry + gentileza no volume; (c) publicar o app muda o perfil de "uso próprio" para ferramenta pública — decidir conscientemente (ver GitHub Pages abaixo).

---

## GitHub Pages — veredito

**Sim, funciona sem mudar nada no código:**
- JSONP usa `<script src>`, que não sofre bloqueio CORS — funciona de qualquer origem, incluindo `*.github.io`.
- O endpoint da prefeitura é HTTPS → sem *mixed content* numa página HTTPS.
- O Pages dá HTTPS de graça, que é **pré-requisito** para o roadmap mobile: PWA/service worker, geolocalização e clipboard exigem contexto seguro.

**Ressalvas:**
- No plano gratuito o repositório precisa ser **público** (e a página é pública por natureza). Não há segredo no código, mas a URL aberta transforma "uso próprio" em ferramenta potencialmente pública — não divulgar a URL já mitiga; se quiser trancar de verdade, Cloudflare Pages + Access (gratuito) permite login.
- Tráfego de terceiros bate direto na API da prefeitura — mais um motivo para não divulgar.

**Passos:** criar repo → `git push` → renomear (ou copiar) `radar-goiania.html` para `index.html` → Settings ▸ Pages ▸ Deploy from branch ▸ `master` / root.
