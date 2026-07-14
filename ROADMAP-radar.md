# ROADMAP — Radar Fundiário · Goiânia

> Consolida a auditoria técnica (02/07/2026) + o briefing de projeto (`PROJETO-radar.md`).
> Legenda de status: ✅ feito · 🔶 feito, pendente de teste manual · ⬜ a fazer.

---

## Atualização ultrapremium — 14/07/2026

### ✅ Diligência local acionável

- Histórico entre consultas por imóvel e por unidade, sem confundir snapshot local com histórico de mercado ou cadeia dominial.
- Checklist documental com cinco grupos, estados locais, canais oficiais e integração à trilha de evidências e aos documentos.
- Datas opcionais de documento e de revisão escolhidas pelo usuário, com alertas locais de revisão próxima/atrasada. O Radar não presume prazo jurídico nem confirma vigência.
- Pacote único de diligência exportável, reunindo identificação cadastral, trilha de evidências, histórico e checklist. Nenhum arquivo, nome de proprietário ou certidão é armazenado.

### 🔶 P0 visual — redesign “Atlas Cívico”

**Diagnóstico:** o produto já é forte tecnicamente, mas a interface ainda comunica “ferramenta cadastral interna”, enquanto os relatórios comunicam um produto mais premium. Não é um problema resolvível apenas trocando cores: falta uma hierarquia visual única para mapa, busca, resultados e dossiê.

Achados da auditoria visual:

1. **Entrada fraca:** a tela inicial é quase um mapa vazio e excessivamente lavado; não apresenta marca, proposta de valor nem um próximo passo com presença suficiente.
2. **Mapa e conteúdo competem:** controles, legendas, painel e dossiê parecem camadas independentes. No desktop, o dossiê cobre quase toda a experiência em vez de funcionar como inspetor contextual ao lado do mapa.
3. **Hierarquia achatada:** há muitos retângulos, bordas, divisórias e textos pequenos com peso visual semelhante. O usuário precisa ler demais para descobrir imóvel, valor, evidência e próxima ação.
4. **Paleta “papel técnico”:** bege, cinza, petróleo, verde, dourado e vermelho aparecem em superfícies extensas. O conjunto fica opaco e envelhecido, sem o contraste limpo de um produto premium.
5. **Tipografia comprimida:** `JetBrains Mono`, caixa alta e tamanhos de 9–12 px aparecem além de códigos e fontes. Isso reforça a aparência de sistema legado e reduz a escaneabilidade.
6. **Iconografia inconsistente:** emojis são usados como ícones funcionais. Eles variam entre sistemas, não formam uma família visual e tiram sofisticação do produto.
7. **Resultados cansativos:** prédios com muitas unidades geram listas longas e repetitivas. Resumo, ordenação e unidades não formam uma sequência visual clara.
8. **Dossiê excessivamente documental:** ressalvas corretas são repetidas no caminho principal. O conteúdo é confiável, mas a apresentação transmite peso e cautela antes de transmitir entendimento.
9. **Dois produtos visuais:** a interface usa cantos quase retos e alta densidade; os PDFs usam cartões brancos, mais espaço e cantos suaves. O relatório parece mais premium que o próprio Radar.
10. **Mobile funcional, não desejável:** bottom sheet, alvos e safe areas existem, porém a densidade e a linguagem visual continuam de desktop técnico comprimido.

**Direção recomendada — Atlas Cívico:** inteligência territorial sóbria, precisa e contemporânea; mais próxima de um terminal cartográfico editorial do que de um portal imobiliário genérico. Luxo silencioso, não “luxo dourado”.

- Fundo neutro claro, superfícies brancas sólidas, texto verde-carvão e um único acento verde profundo; latão apenas para destaque raro.
- Mapa legível e com identidade própria; reduzir POIs irrelevantes, preservar ruas e limites e reservar cor forte para seleção/dados.
- `Archivo`/fonte de interface para conteúdo; monoespaçada somente para inscrição, fonte, data e coordenada.
- Família única de SVGs lineares; remover emojis de todos os controles de produção.
- Escala de espaço de 8 px, cartões de 12–16 px, bordas discretas e sombra apenas para separar planos.
- Uma ação primária por contexto; ações secundárias em menu contextual ou rodapé do painel.
- Limites e ressalvas consolidados em “Limites da análise”, com detalhe progressivo e presença permanente na trilha de evidências.

#### V0 — Fundamentos e protótipo visual

- ✅ Consolidar tokens de cor, tipografia, raio, elevação, espaço e movimento no braço visual isolado; a migração dos tokens para a aplicação principal pertence ao V1.
- ✅ Produzir um protótipo navegável de três telas: mapa inicial, resultados e dossiê — arquivo [`prototipo-atlas-civico.html`](prototipo-atlas-civico.html).
- 🔶 Validar a direção antes de alterar toda a aplicação. Direção aprovada pelo usuário em 14/07/2026; auditoria técnica e visual em desktop concluída; responsividade, três alturas do painel, redução de movimento, foco e alvos de toque cobertos no protótipo e nos testes. Pendente apenas o teste tátil em iPhone/Android reais.

**Decisões materializadas no V0 (14/07/2026):**

- mapa permanece como plano dominante; o inspetor de 480 px ocupa seu próprio espaço e não cobre o território no desktop;
- entrada apresenta promessa, busca universal e três entregas do produto sem abrir toda a complexidade de uma vez;
- resultado de prédio usa um único marcador territorial, resumo fixo, filtro, ordenação e linhas que mostram apenas as diferenças relevantes entre unidades — unidades do mesmo prédio não recebem coordenadas artificiais;
- dossiê passa a ter três níveis curtos — **Resumo**, **Território** e **Diligência** — preservando todas as ressalvas em linguagem progressiva;
- iconografia funcional usa uma única família SVG; monoespaçada fica restrita a inscrição e metadados técnicos;
- o protótipo é deliberadamente demonstrativo: não consulta endpoints, não grava dados e não substitui a aplicação atual.

#### V1 — Shell cartográfico

- ✅ Cabeçalho compacto com marca Radar Fundiário, busca universal e estado de fonte, reutilizando o único motor de busca já existente.
- ✅ Desktop com mapa dominante e inspetor lateral fixo de 480 px; painel empurra a área útil do mapa em vez de cobri-la e o mapa recupera toda a largura quando o inspetor fecha.
- 🔶 Mobile preserva bottom sheet com três alturas claras — resumo, meio e tela quase cheia — e controle acessível por toque; implementação automatizada, pendente teste em aparelhos reais.
- 🔶 Legendas e controles contextuais preservados e integrados ao novo shell; falta a revisão visual final de todas as camadas territoriais.

**Migração V1 iniciada em 14/07/2026:** o shell Atlas Cívico já está na aplicação real, mantendo endpoints, armazenamento e regras cadastrais existentes. A integração não duplica o `#caixaInput`, não cria um segundo motor de consulta e permanece isolada na branch `agent/radar-ultrapremium`.

#### V2 — Busca e resultados

- ✅ Transformar a busca em omnibox realmente principal, com linguagem direta e menos campos simultâneos. A omnibox agora é a entrada padrão; endereço, quadra/lote e inscrição separados ficam em divulgação progressiva e cedem lugar à lista assim que há resultado, sem impedir o refino.
- ✅ Resultado de prédio: resumo fixo + filtros + linhas compactas; diferenças entre unidades aparecem sem repetir os dados invariáveis do prédio.
- ✅ Estado vazio orientado: exemplos acionáveis, histórico de consultas útil, imóveis salvos e explicação curta do que o Radar entrega.

#### V3 — Dossiê em três níveis

- ✅ **Resumo:** identidade confirmada, faixa/ausência de faixa, posição cadastral, leitura prática e três ações principais.
- ✅ **Território:** vizinhança, Plano Diretor, mapa e dados técnicos; “Analisar vizinhança” abre diretamente este nível.
- ✅ **Diligência:** evidências, histórico, checklist, datas, opções profissionais e pacote exportável.
- ✅ Trocar a pilha única por navegação curta com semântica de abas, setas/Home/End no teclado e foco sincronizado, preservando todos os identificadores e motores existentes.

**Validação V2–V3 (14/07/2026):** fluxo real por inscrição carregou 184 unidades, confirmou a identidade de uma unidade e abriu o dossiê em inspetor de 480 px. Resumo, Território e Diligência alternaram por clique e teclado; a vizinhança retornou 1.904 registros fiscais semelhantes em 400 m, sem erro de interface ou console. O teste tátil em iPhone/Android reais continua no V4.

#### V4 — Documentos, estados e acabamento

- ⬜ Levar a linguagem dos relatórios para a interface, sem simplesmente copiar o PDF para a tela.
- ⬜ Skeletons, estados vazios, erro e offline com a mesma direção visual.
- ⬜ Movimento entre 160–240 ms, com redução de movimento respeitada; animação só para mudança de plano, seleção e confirmação.
- ⬜ Revisão final de contraste, foco, zoom de texto e toque em iPhone/Android reais.

#### V5 — Validação com corretores

- ⬜ Teste moderado com 8–12 corretores da base antes da migração completa.
- ⬜ Tarefas: encontrar imóvel, distinguir unidade, entender faixa/ausência, localizar pendência e exportar diligência.
- ⬜ Critérios: identificar imóvel + estado da análise em até 5 segundos; concluir busca sem ajuda; zero interpretação de marcação local como documento verificado.

Referências de estrutura, não de cópia visual: [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Calcite — Shell Panel](https://developers.arcgis.com/calcite-design-system/components/shell-panel/), [Calcite — Map with sidebar](https://developers.arcgis.com/calcite-design-system/sample-code/app-map-with-sidebar/) e [Material 3 — Design tokens](https://m3.material.io/foundations/design-tokens).

---

## 0. Fatos validados no endpoint real (base das decisões)

Testes executados em 02/07/2026 direto no ArcGIS da Prefeitura:

| Fato | Resultado | Consequência |
|---|---|---|
| `outFields` com campos específicos | **Aceito no cadastro (Feature_Base)** — usado em produção desde a Fase 15 (`fetchWhereRestrito`, ~80% menos payload, fallback p/ `*` em erro); reverificado ao vivo em 2026-07-09/10. O quirk "Erro 400 — só `outFields=*`" vale para o serviço `Mapa_ModeloEspacial` (Plano Diretor), não para o cadastro | Corrigido em 2026-07-10 — a doc registrava o quirk no serviço errado; dá SIM para reduzir payload por campo no cadastro |
| `returnGeometry=true` (camada 3) | **Aceita** — retorna polígono real (~+19% payload); reconfirmado 2026-07-04 | Corrige a suposição antiga de rejeição; v2.0 orquestra geometria existente, não faz sourcing novo |
| Filtro server-side `nrquadra LIKE '%128%'` (Bueno) | **Funciona: 630 registros** (vs 57.225 do setor todo) | É a alavanca certa para o bug crítico |
| `UPPER(...)` em where | Funciona (`useStandardizedQueries: true`) | Busca case-insensitive server-side ok |
| CORS | Sem cabeçalho `Access-Control-Allow-Origin` | JSONP continua necessário |
| Consulta pesada (count da base toda) | **502 Proxy Error** | Servidor frágil sob carga — minimizar volume |
| Setores distintos | **687** no dataset local `bairro-cdbairro.json` (medido 2026-07-10, travado em `tests/datasets.test.mjs`). Nota: a recon de 02/07/2026 mediu 709 cds distintos direto no endpoint vivo — o snapshot local diverge porque só mapeia bairros com cdbairro resolvido (86 features ficam sem cd) | Carga de bairros (limite 2000) está segura |
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

5. ✅ **Titular — RESOLVIDO em 03/07/2026 (definição do usuário): é pela CND, COM pré-preenchimento.**
   O botão "Titular (CND)" abre `goiania.go.gov.br/sistemas/sccer/asp/sccer00202f0.asp?txt_nr_iptu=<inscrição>` — página indicada pelo usuário que **aceita a inscrição via querystring** (testado: o campo abre preenchido). O usuário só resolve o CAPTCHA e a certidão sai com o nome do titular. A inscrição também vai para a área de transferência como redundância. (A página antiga `cer02f.asp` ignorava querystring — descartada.)
6. 🔶 **iOS — autocomplete de setor não abre ao digitar.** Aplicadas as correções padrão: fechamento da lista por `pointerdown` (em vez de `click`, que no Safari engolia o toque) e `font-size: 16px` nos inputs (mata o auto-zoom do iOS, suspeito de bagunçar o foco). **Pendente: teste no iPhone real** — se persistir, investigar com Safari remoto.
7. ✅ **Deixar explícito que o app não devolve o dono**: já coberto no rodapé + title do botão titular.

---

## P0 — Mobile premium (M1–M8 do briefing) — implementado em 02/07/2026

- ✅ **M2** anti-zoom (`font-size:16px` nos inputs) + `inputmode="numeric"` na inscrição. Quadra/lote/número ficam com teclado de texto **de propósito** — aceitam letra ("10E", "08E").
- 🔶 **M1** autocomplete no toque: fechamento por `pointerdown` + anti-zoom. **Validar no iPhone real.**
- ✅ **M4** detalhe vira **bottom sheet** no mobile: ancorado acima da barra, cantos arredondados, rolagem interna, alça com **arrastar-para-baixo fecha**.
- ✅ **M3** telas **Busca ⇄ Mapa** com barra fixa inferior (56px); busca com resultado troca sozinha para o mapa; tap no card idem; `map.invalidateSize()` ao exibir (senão o Leaflet renderiza cinza).
- ✅ **M5** alvos ≥44px: barra 56px, botão × 44px, ações do detalhe 44px, itens do combo e modos maiores.
- ✅ **M6** safe-area/notch: `viewport-fit=cover` + `env(safe-area-inset-bottom)` na barra, no sheet e no loading.
- ✅ **M7** performance 4G: resolvida na prática pelo filtro server-side (payload caiu ~99% no caso típico). Cache de sessão fica no backlog (item 16).
- ✅ **M8** PWA: `manifest.json`, `sw.js` (cache do app shell + CDNs; consultas e tiles sempre na rede), ícones gerados (192/512/apple-touch 180), registro condicional a HTTPS — ativa sozinho quando hospedar no GitHub Pages. `index.html` de redirecionamento criado.
- ⬜ Checklist de aceite no aparelho (iPhone + Android): autocomplete, teclado, sheet, instalação PWA, notch.

Verificado em preview 375×812: busca Q128/L08E no Bueno → 26 unidades, auto-switch pro mapa, sheet com dados completos; desktop 1280px sem regressão.

---

## P1 — Robustez e segurança — ✅ implementado nesta rodada

8. ✅ **Escape de HTML** (`esc()`) em tudo que vem da API e vai para `innerHTML` (logradouro, edifício, complemento, bairro, combo de setores). Fecha o vetor XSS/quebra de layout.
9. ✅ **Guarda de CDN**: se Leaflet/proj4 não carregarem, mensagem clara em vez de página morta.
10. ✅ **Coeficiente atualiza o painel de detalhe aberto** (antes ficava com o valor antigo) e preserva a seleção do card.
11. ✅ **Filtro de garagem não se aplica à busca por inscrição** (quem busca a inscrição exata de um box quer vê-lo).
12. ✅ Código morto removido (`data-disp`).
13. ✅ Retry/backoff nas chamadas JSONP (retry de 900ms no app; backoff exponencial + Retry-After no atualizar-caixa.py — 03/07/2026).
14. ⬜ **JSONP em si**: aceitável para uso próprio (TLS protege o canal; a confiança é no servidor da prefeitura). Se um dia virar produto: proxy próprio (ex.: Cloudflare Worker gratuito) fazendo o fetch e devolvendo JSON com CORS — elimina execução de script remoto e ainda permite cache.

---

## P1 — Publicação (GitHub Pages) — pronto para subir

Ver análise no fim. `index.html` (redirecionamento) já criado; manifest/sw/ícones idem. Falta só: criar o repositório no GitHub → `git push` → Settings ▸ Pages ▸ Deploy from branch ▸ `master` / root.

---

## P1 — Laudo de avaliação automatizado — ✅ implementado em 03/07/2026

Botão "📄 Gerar laudo de avaliação (PDF)" no painel do imóvel. Wizard de 4 passos (imóvel/conservação/diferenciais → valor sugerido pré-calculado + observações → fotos da galeria → dados do profissional, lembrados p/ os próximos). PDF via impressão do navegador; com CRECI sai como PTAM (Res. COFECI 1.066/2007), sem CRECI como Relatório de Referência. Pendente: alimentar a tabela de valores com a base do usuário (ele tem os dados; fará depois).

Especificação original:

Gerador de **Relatório de Referência de Mercado / PTAM** para o corretor, 100% client-side e sem IA:
- **Wizard estilo iOS**: passos curtos, um assunto por tela, campos grandes, toque simples — estado de conservação, diferenciais (armários, reforma, andar, sol), fotos opcionais, dados do solicitante. Tudo que o app já sabe vem **pré-preenchido** (cadastro, áreas, IPTU, comparáveis da vizinhança, faixa de mercado, mini-mapa do lote).
- **Saída**: PDF bonito e timbrável (nome/CRECI/logo do corretor), com metodologia declarada (comparativo de mercado, mediana e faixa, fontes com data) e disclaimer correto (PTAM é ato de corretor inscrito — Res. COFECI 1.066/2007; sem CRECI, o documento sai como "relatório de referência").
- Geração de PDF no navegador (ex.: via `window.print()` com folha de estilo dedicada, ou jsPDF) — continua funcionando offline.

## Regra de qualidade das âncoras de preço (03/07/2026)

Toda calibração de mercado (tabela por bairro, futuros ajustes) segue:
- **Mediana de imóvel USADO** — nunca preço de **lançamento** (padrão construtivo fora da curva da vizinhança) nem **anúncio isolado** (corretor inexperiente infla preço).
- Outliers cortados (cerca de Tukey/MAD) antes de qualquer média/mediana — já aplicado nos comparáveis.
- Fonte + data sempre declaradas na interface.
- A régua manual de coeficiente foi **removida da UI** (03/07/2026): o app escolhe sozinho a melhor fonte (tabela do bairro → laudos Caixa → estimativa genérica com faixa larga e aviso de baixa precisão).

## P2 — Backlog estruturado

15. **Metodologia do valor de referência** — evoluída para o plano de inteligência (ver `INTELIGENCIA-radar.md`, baseado em pesquisa de 10 frentes em 02/07/2026):
    a. ✅ Data-base do venal no detalhe + aviso NBR 14653/PTAM.
    b. ✅→♻️ Coeficiente por setor substituído pela **escolha automática de fonte** (tabela do bairro → laudos Caixa → genérico com aviso); a régua manual foi removida da UI em 03/07/2026.
    c. ✅ **Comparáveis da vizinhança** (I1): raio 400/800 m, mesmo uso, área 0,5–2×, mediana+Q1–Q3 com cerca de Tukey; vizinhanças grandes via busca binária de contagens (aritmética no WHERE — descoberta da pesquisa). Percentil do imóvel + selo de confiança + faixa convertida a mercado.
    d. ❌ ITBI de Goiânia **não é público** (verificado) — caminho: pedido via LAI (I8). ~~vllanc98 como histórico~~ (provado: campo = venal atual).
16. ⬜ **Cache/banco local.** Curto prazo: cache de sessão por consulta (Map em memória) — barato. Estrutural: espelho da base em IndexedDB (ou SQLite via ferramenta externa) alimentado por varredura paginada offline → busca instantânea, filtros pesados, modo offline. Respeitar o servidor (varrer de madrugada, 1 vez por mês).
17. ⬜ **Multi-cidade.** Extrair objeto de configuração: `{nome, endpoint, epsg/proj4, mapaDeCampos, prefixosSetor, urlsOficiais(titular/venal), quirks(outFields, jsonp)}`. Recon mínimo por cidade: achar a camada de cadastro, projeção, campos equivalentes e política CORS/JSONP. (Goiânia aberta; Aparecida = Geopixel com login; Senador Canedo sem mapa.)
18. ⬜ **Testes automatizados.** Extrair as funções puras (`norm`, `likeTerm`, `displayName`, `matchApto`, `isGarage`, filtros de quadra/lote/endereço, `toWGS`) para testá-las com Node + fixtures JSON reais gravadas do endpoint. Casos que travam regressão: zona UTM 22 (o bug do "pino na Bahia"), lote "20/21", quadra "10E", apto "1901" vs "19", padding de espaços.
19. ⬜ **Refinar o fuzzy** (falso positivo): número do imóvel casar por igualdade de dígitos primeiro e substring só como fallback sinalizado; rua casar por fronteira de palavra ("135" não casar "1350"); ordenar resultados por qualidade do match.
20. ✅ **Acessibilidade (03/07/2026):** labels com `for=`, combobox com ARIA completo (activedescendant/aria-selected), live regions no toast/loading, cards por teclado, wizard como dialog com gestão de foco, aria-pressed nos toggles, contraste AA nos textos coloridos, Esc em camadas.
21. ✅ **Exportar (03/07/2026):** CSV dos resultados (Excel pt-BR, lat/lon 6 casas) e laudo/ficha em PDF via wizard.
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
