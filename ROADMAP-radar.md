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
- ✅ Legendas e controles contextuais preservados e integrados ao novo shell. Revisão visual das camadas territoriais concluída em 14/07/2026: lotes, pinos, anéis CAIXA e destaques resolvem a paleta Atlas em runtime (`--brand/--brass/--muted/--ink`), seleção usa `--focus`, e permanecem intocados o vermelho-alerta de risco (desacoplado) e a simbologia oficial das zonas do Plano Diretor.

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

- ✅ Levar a linguagem dos relatórios para a interface, sem simplesmente copiar o PDF para a tela. A família visual do laudo (superfícies brancas elevadas, cantos 12–16 px, hairlines, respiro, um acento) já governa a UI via tokens Atlas; diferença deliberada: o acento da interface é o verde profundo aprovado no V0, não o petróleo do PDF.
- ✅ Skeletons, estados vazios, erro e offline com a mesma direção visual (14/07/2026): overlay de loading com véu do canvas, skeleton/hist-empty com cantos e superfícies Atlas, e estado global de conexão novo — chip vivo no cabeçalho + banner fino em todas as larguras, com `role="status"`. Tokens completados: `--space-1..7`, `--warning/--danger(-soft)`, `--font-ui/--font-code`, `--ease-out`.
- ✅ Movimento entre 160–240 ms, com redução de movimento respeitada (14/07/2026): 11 transições legadas (.08–.25s) harmonizadas para `var(--motion-fast|base) var(--ease-out)`; kill-switch de `prefers-reduced-motion` preservado; animação segue restrita a troca de nível do dossiê, seleção e confirmação. Testes em `tests/atlas-v4.test.mjs` travam regressão de duração crua.
- ⬜ Revisão final de contraste, foco, zoom de texto e toque em iPhone/Android reais — depende de teste humano nos aparelhos.

#### V5 — Validação com corretores

- ⬜ Teste moderado com 8–12 corretores da base antes da migração completa.
- ⬜ Tarefas: encontrar imóvel, distinguir unidade, entender faixa/ausência, localizar pendência e exportar diligência.
- ⬜ Critérios: identificar imóvel + estado da análise em até 5 segundos; concluir busca sem ajuda; zero interpretação de marcação local como documento verificado.

Referências de estrutura, não de cópia visual: [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Calcite — Shell Panel](https://developers.arcgis.com/calcite-design-system/components/shell-panel/), [Calcite — Map with sidebar](https://developers.arcgis.com/calcite-design-system/sample-code/app-map-with-sidebar/) e [Material 3 — Design tokens](https://m3.material.io/foundations/design-tokens).

---

## Próximo ciclo — Território delimitado e produto (planejado em 15/07/2026)

### P0 — Delimitar Goiânia no mapa

**Diagnóstico (estudo de 15/07/2026):** o `L.map` (linha ~3880) não define `maxBounds` nem `minZoom` — o usuário arrasta o mapa para fora da cidade e afasta o zoom até ver o mundo, tudo sem dado. Nada comunica onde Goiânia começa e termina: a malha de bairros (1.206 polígonos urbanos) não é o município (falta a área rural) e some em zoom ≥17.

**Concluído em 15/07/2026** — as quatro etapas abaixo foram implementadas, testadas (354/354, incluindo `tests/limite.test.mjs` e o invariante do dataset) e verificadas em runtime: setView para fora volta para Goiânia, zoom mundial trava no mínimo, máscara/contorno alternam com o satélite e o console permanece limpo.

- ✅ **G1 — Dado do limite municipal.** Fonte preferida: malha municipal oficial do IBGE (código 5208707), simplificada para ~30–80 KB em WGS84, via script `gerar-limite.py` (padrão dos `gerar-*.py` do repo) → `limite-goiania.json`. Fallback documentado: dissolve de `bairros-goiania.wgs84-raw.json` (cobre só a malha urbana — registrar a diferença por honestidade). Invariantes travados em `tests/datasets.test.mjs`: 1 feature, Polygon/MultiPolygon, bbox plausível de Goiânia.
- ✅ **G2 — Contorno + máscara.** Pane próprio abaixo de "bairros" (z<370). Traço do limite em `--brand-strong`; máscara "polígono com furo" (retângulo-mundo − município) esmaecendo o exterior com fill neutro (`--canvas` ~55%), com variante mais escura quando o satélite está ligado (mesmo padrão zoom/sat das zonas). `interactive:false` — nunca rouba o clique do identificador de ponto. Falha de fetch degrada em silêncio (como bairros).
- ✅ **G3 — Confinamento.** `maxBounds` = bbox do limite com folga (~15%) + `maxBoundsViscosity:1.0`; `minZoom:11` (cidade inteira cabe na tela). Revisar boot/`resetHome` (linha ~4493) e os `fitBounds` de drill/busca para nunca brigarem com o confinamento; conferir no mobile.
- ✅ **G4 — Publicação e testes.** `sw.js`: `limite-goiania.json` no OPTIONAL + bump `radar-v12`. `pages.yml`: incluir na cópia do deploy. Testes de string travando as opções do `L.map`, a camada/máscara e as listas de sw/workflow.

**Aceite:** impossível arrastar para fora da região de Goiânia ou afastar o zoom além da cidade; o limite municipal aparece desenhado e o exterior fica esmaecido; suite completa verde e nenhuma regressão de clique/drill.

### P0 — Busca por endereço precisa (rua + número)

**Diagnóstico (caso real "rua s3, 50", 15/07/2026):** o detector entregava o número de porta DENTRO do campo rua; `ruaCore` concatenava os dígitos ("S3"+"50" → rD "350") e o refino casava rua errada/derramava o setor na lista.

- ✅ **BUSCA-14 (15/07/2026):** número de porta separado da rua nas regras 3 e 5b do `detectMode`, com o caso "Rua 135" (rua numerada SEM porta) preservado via `temIdentidadeRua()`. Testes novos em `detectmode.test.mjs`; validado em runtime.
- ✅ **BUSCA-15 — Números com coordenada (CNEFE) (15/07/2026).** O "mapa público dos números" virou infra: 777 mil endereços do CNEFE 2022 carregados no PostGIS do VPS (70.150 pontos agregados por localidade+logradouro+número, 90% com coordenada no nível do endereço), `GET /motor/geocodificar` público e determinístico com precisão em degraus (número exato → número mais próximo com a distância à vista → logradouro), e a busca de endereço do app dispara o geocoder EM PARALELO ao cadastro: um alvo dourado marca o ponto físico do endereço ("IBGE, Censo 2022" no rótulo), inclusive quando o cadastro devolve vazio (prédio "S/N"). Normalização canônica das duas pontas ("s3"/"S-3" ↔ "S 3" do CNEFE; "Três" ↔ "3") em `normaliza-endereco.js`, espelhada no loader. Verificado ao vivo com o caso real "rua s3, 50" → Bela Vista.
- ✅ **BUSCA-16 — Desambiguação de rua homônima (15/07/2026).** Busca de endereço sem setor consulta as localidades do CNEFE e vira chips de 1 toque — só setores que EXISTEM no cadastro (casados com o combo) viram chip; o toque resolve o setor e dispara a busca (com a âncora BUSCA-15 junto). Falha do motor degrada para o pedido de setor antigo. Verificado ao vivo: "rua s3, 50" sem setor ofereceu Jardim Bela Vista e Setor Bela Vista.
- ⬜ **Item 19 do backlog** (fuzzy: igualdade de dígitos primeiro, substring só como fallback sinalizado) continua válido para o refino fino.

### P1 — Motor Inteligente de Análise de Preço — plano registrado

Especificação completa do usuário + diagnóstico Fase 1 (auditoria) + adaptações de stack em [`MOTOR-PRECO.md`](MOTOR-PRECO.md) (15/07/2026). Princípio idêntico ao do repo: IA nunca produz o preço — motor determinístico e auditável; IA só extrai, explica e redige com validação. Aguardando o VPS (Hostinger) para a Fase 2; modelos via interface `AIProvider` (Groq/OpenAI-compatível como rápido, Claude como premium/fallback — sem GPU não roda Qwen local).

### P1 — Infra própria (servidor + domínio) — aguardando o servidor do usuário

- ✅ (15/07) Proxy CORS próprio para o ArcGIS da prefeitura (fechou o item 14): elimina JSONP, adiciona cache e protege o endpoint frágil. O app estático pode continuar no Pages, apontado pelo domínio.
- ✅ (15/07) Domínio + HTTPS (corretorinteligente.tech no VPS, TLS auto-renovável); decidido onde o estático vive (Pages com domínio próprio vs servir do servidor).

### P1 — Módulo de pesquisa de mercado com IA (isolado do núcleo)

Decisão de 15/07/2026 (respeita "sem IA no núcleo"): módulo **no servidor**, nunca no HTML público (chave de API). Claude API (`claude-opus-4-8`) com as ferramentas nativas `web_search`/`web_fetch`, varredura **mensal em batch** por bairro/tipologia sobre anúncios publicamente indexados (OLX/VivaReal/Zap/ImovelWeb/MySide não têm API pública; scraping direto violaria os termos — a IA pesquisa como uma pessoa pesquisaria). Saída: JSON de âncoras (mediana de **usado** + faixa + fontes + datas) sob a régua de qualidade de 03/07/2026; o app consome como consome a tabela CAIXA, sempre rotulado como estimativa.

### PRINCÍPIO UX — "qualidade de aplicativo" (definido pelo usuário, 15/07/2026)

**Lei permanente do produto:** nenhuma tela crua aparece, nunca; tudo que espera tem que PARECER carregando (motion), não travado; motion em tudo que não pesar. Vale como critério de aceite de toda feature nova.

- ✅ (15/07) Splash de boot com marca + spinner no primeiro paint do app (`#bootSplash`, some quando a UI fica interativa, válvula de 6 s para nunca prender a tela).
- ✅ (15/07) Raiz do domínio serve o app DIRETO (nginx rewrite) — a página de redirecionamento não aparece mais; e o próprio `index.html` (fallback Pages/offline) virou splash com a marca em vez de link cru.
- ✅ (15/07) Card Mercado com skeleton shimmer enquanto o motor calcula.
- ✅ (15/07) Parecer §17 e resumo do entorno nasceram com skeleton + badge de origem (IA conferida vs resumo automático) + degradação explicada — a lei valeu como critério de aceite.
- ⬜ Auditoria contínua: toda espera nova (fetch, geração de laudo, parecer) nasce com skeleton/spinner/estado de progresso; usar os tokens `--motion-*`/`--ease-out` e respeitar reduced-motion sempre.

### LAUDO-MERCADO — avaliações do motor no laudo (ideia do usuário, 15/07/2026)

O usuário definiu: as avaliações do motor devem sair no **laudo de avaliação (PTAM e outros)**.

- ✅ (15/07) **Curto prazo:** a Análise Comparativa de Mercado entrou como SEÇÃO do Relatório de Referência (`mercadoDocumentoHTML`, presa por chave à inscrição — outro imóvel nunca herda), com rotulagem honesta (ofertas ≠ transações) e id da avaliação auditável. O parecer §17 é gerado no card Mercado (números por construção, validados).
- ⬜ **PTAM:** permanece suspenso pelo contrato de honestidade (`habilitaPtam()` → false, travado em teste) até existir **verificação profissional real** (CRECI/CNAI verificados — Res. COFECI 1.066/2007). Quando destravar, a ACM do motor vira o núcleo de comparáveis do PTAM (10+ comparáveis, metodologia, mapa, homogeneização §12), com o corretor revisando a amostra (§14) antes da emissão. **A tela de revisão já existe (15/07, no painel com senha):** exclusão de comparável exige motivo (gravado em manual_change na avaliação ORIGINAL + auditoria), o recálculo nasce como versão encadeada por parent_id com a revisão declarada nas premissas, e amostra que encolhe abaixo de 5 é recusada com explicação — verificado ao vivo (v1 9 comparáveis → v2 com 8, valor recalculado).
- 🔶 Requisito técnico de caminho (15/07): comparáveis GEOCODIFICADOS pelo CNEFE (endereço extraído do anúncio por regex determinística + casamento de bairro; confiança declarada por precisão), distância real na avaliação/card/laudo e pinos das ofertas no mapa do app ("Ver as ofertas no mapa", origem declarada). Cobertura inicial honesta: 33/429 do acervo têm endereço no texto — cresce a cada varredura noturna. Falta: mapa DENTRO do laudo impresso; id da valuation no laudo já existe.

### INTELIGÊNCIA DE LOCALIZAÇÃO — exploração registrada (ideia do usuário, 15/07/2026)

Especificação completa + parecer técnico + **prova de cobertura já executada** em [`INTELIGENCIA-LOCALIZACAO.md`](INTELIGENCIA-LOCALIZACAO.md). Resumo da evidência: OSM cobre bem os bairros de mercado (Bueno: 7 supermercados/1 km; Pq. Amazônia: 15 POIs nomeados) e falha na periferia (Vera Cruz: 1 POI); Overpass público é inviável para produção (congestão + espelho devolvendo "zero falso"). **MVP decidido (custo ~zero):** extrato Geofabrik de Goiás → tabela `pois` no PostGIS do VPS (`gerar-pois.py` + timer mensal) → `GET /motor/localizacao` com raio por categoria e `dataQuality` honesto → card "Localização" no Território → IA só explica (pipeline do parecer §17). Sem nota geral na v1; impacto no valor só por correlação medida (§10), nunca % arbitrário. Atribuição ODbL obrigatória.

**✅ MVP NO AR (15/07/2026):** 6.734 POIs no PostGIS, endpoint público com rate limit por rota, card "Localização" no Território e **resumo do entorno por IA** (pipeline §17: whitelist de números medidos + `validarNumeros`, 2 reprovações → texto determinístico). Lições de produção gravadas: `<think>` do qwen remoto é removido no provedor; categoria zerada é filtrada ANTES do prompt (o modelo narrava "ausências" como atenção); pontos de atenção só por sinal medido. Próximos degraus: geocoding CNEFE (§7), locationMetrics nos comparáveis (§10), OSRM/INEP/CNES.

### SEGURANÇA — endurecimento do site + painel com senha (ideia do usuário, 15/07/2026)

Fonte estudada: repositório `melo202/swisstony-bot` (dashboard Flask com fase de hardening SEC-01..05 + testes dedicados). O que lá é Flask aqui vira Node puro no motor — copiamos as **medidas**, não o framework. **Decisão do usuário: SEM multitenant por enquanto** — uma senha única de corretor; contas/perfis ficam para um ciclo futuro.

**Já temos hoje (não refazer):** TLS + renovação automática, SSH só por chave, ufw + fail2ban, CORS com whitelist, rate limit por rota e por IP no motor, MOTOR_TOKEN (Bearer) nas rotas de escrita, queries 100% parametrizadas (pg), CSP no app, `.env` fora do git com chmod 640.

- ✅ (15/07) **SEG-01 — Painel do corretor com senha (sem multitenant).** Rota `/painel` no motor: login com senha única do `.env` (`PAINEL_SENHA`), hash **PBKDF2-HMAC-SHA256 (100k iterações) calculado uma vez na inicialização**, comparação com `timingSafeEqual` (espelho do `hmac.compare_digest` do swisstony). Sessão por cookie **assinado com HMAC** (`HttpOnly`, `SameSite=Lax`, `Secure`, validade 24 h) + logout. É a casa natural da tela de revisão do corretor (§14) e das operações hoje só por token (varrer, requalificar, logs de IA).
- ✅ (15/07) **SEG-02 — Trava anti-força-bruta no login (copiar do swisstony).** 5 tentativas falhas por IP → lockout de 5 min, **mais teto GLOBAL de 50 falhas na janela** (segura ataque distribuído que troca de IP), com poda dos IPs antigos (memória limitada — mesmo espírito da válvula do RATE atual).
- ✅ (15/07) **SEG-03 — Cabeçalhos de segurança em TODAS as respostas.** No nginx (app + api): `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Strict-Transport-Security` (já temos TLS) e CSP nas páginas do painel (o app já tem a dele).
- ✅ (15/07) **SEG-04 — CSRF nos POSTs autenticados do painel.** Double-submit do swisstony: token de sessão + header `X-CSRF-Token`, comparação constant-time; login isento (o `SameSite` do cookie cobre).
- ✅ (15/07) **SEG-05 — Sem senha configurada = painel FECHADO.** Equivalente do OPS-01 do swisstony (sem senha ele recusa modo live): sem `PAINEL_SENHA` no `.env`, as rotas do painel respondem 404 — nunca um painel aberto por esquecimento de configuração.
- ✅ (15/07) **SEG-06 — Suíte de testes de segurança dedicada** (`tests/seguranca.test.mjs`, espelho do `test_security.py`): lockout/limites, headers presentes, caches com teto, nenhuma query por interpolação de string, painel fechado sem senha.
- 🔶 (15/07) **SEG-07 — Higiene de segredos:** `.env.example` versionado no repo (documenta as variáveis sem os valores); rotação da senha root do VPS no painel Hostinger (pendência do usuário desde 15/07 — a senha original apareceu no chat).

### IA — NVIDIA Build (estudo executado em 15/07/2026, no Chrome autorizado do usuário)

**O que foi confirmado no build.nvidia.com:** 76 modelos com **Free Endpoint** OpenAI-compatível em `integrate.api.nvidia.com/v1` — o mesmo formato do nosso AIProvider, plug and play. Destaques para o Radar: **GLM-5.2 (Z.ai)** — flagship de raciocínio/agentic, **chave gerada e TESTADA ao vivo** (respondeu em português correto; ~7,5 s vs ~1,6 s do Groq: mais lento, porém topo de linha — vocação para o tier "advanced"/redação §17); **nemotron-3-ultra-550b** (contexto 1M); **deepseek-v4-flash** (1M, rápido); **minimax-m3** (visão — futuro: ler FOTOS de anúncios); **nemotron-ocr-v2** (OCR — futuro: documentos da diligência). Chave guardada como `AI_REMOTE2_*` no `.env` do VPS. **Skills:** 229 oficiais p/ agentes (instaláveis no Claude Code); maioria é stack NVIDIA (CUDA/Omniverse/DeepStream) — pouco aplicável ao Radar hoje; a única com cara de útil é `nemo-retriever` (consulta a PDFs/imagens — candidata para a diligência documental, avaliar quando chegar lá).

- ✅ (15/07) **NV1 — Cadeia multi-remoto no AIProvider:** degraus Groq (fast, rápido) → NVIDIA GLM-5.2 (advanced, qualidade) → Qwen local (base eterna), com o mesmo cooldown/1-retry por degrau; tier "advanced" (parecer §17, resumos) passa a preferir o GLM-5.2.
- ✅ (15/07) **NV2 — A/B honesto de redação:** VENCEDOR: GLM-5.2 (prosa de laudo, contabilidade da amostra precisa, 23 s validado de primeira; o llama tinha 'faixa de valorização' e typo 'dedupicação'). Promovido no tier advanced. Achado colateral: número por extenso driblava o validador — contratos agora exigem algarismos. Plano original: gerar pareceres com llama-3.3-70b vs GLM-5.2 sobre as MESMAS avaliações e comparar taxa de aprovação no validador + qualidade lida; só promover o campeão.
- ⬜ **NV3 — Confirmar o rate limit do free tier na prática (presumido ~40 req/min) e respeitá-lo no orquestrador (fila noturna já é serial, deve passar folgado).**
- ⬜ **NV4 — Futuro:** visão (minimax-m3) para fotos de anúncio na peneira de qualidade; OCR (nemotron-ocr-v2) para a diligência documental.

### REBRAND — "Corretor Inteligente" (decisão do usuário, 15/07/2026)

O produto muda de nome: **Radar Fundiário → Corretor Inteligente** (casa com o domínio corretorinteligente.tech). Kit de marca já estudado (`corretorinteligente_brandkit.zip` na raiz do projeto): logo horizontal (gradiente/flat/mono/branca), símbolo isolado (casa azul-marinho com nós de circuito), ícone de app 1024 e favicon 512, tudo em vetor com texto em curvas. **Paleta do kit:** azul-marinho `#212E40`, verde-petróleo `#088780`, verde-claro `#19A99A`, fundo claro `#F5F8F8`. Tratar como projeto de **designer sênior**, não troca de logo: cada fase abaixo tem aceite visual próprio. **Protótipo do login já no ar** (15/07): https://corretorinteligente.tech/prototipo-login-cidade-viva.html — alternativa ao "fundo Matrix" com o DNA do produto (contorno real de Goiânia se traçando + nós de circuito da marca + pulsos de medição, canvas leve, reduced-motion respeitado); kit versionado em marca/.

- ✅ (15/07) **R1 — Tradução da paleta para os tokens.** Feito num único bloco (o shell é 100% token): marinho=--ink, petróleo=--brand (com --brand-strong #065f56 a 7,5:1 p/ texto branco pequeno), verde-claro=--brand-2, #F5F8F8=--canvas; --muted recalculado p/ AA (4,85:1). DECISÃO de design: o latão permanece como cor FUNCIONAL de atenção/âncora CNEFE — semântica não é marca (atenção em teal se confundiria com "bom"). Mapa herdou em runtime (MAP_BRAND/MAP_INK conferidos ao vivo), manifest/theme-color atualizados, vermelho-risco e simbologia do PD intocados. Plano original: O shell já é 100% token (`--brand/--brand-strong/--brass/--canvas/--ink`): mapear marinho→tinta/estrutura, petróleo→ação/marca, verde-claro→realce, `#F5F8F8`→canvas; conferir contraste AA em TODOS os pares (texto pequeno sobre petróleo é o risco); manter o vermelho-alerta de risco e a simbologia do Plano Diretor intocados; mapa (`mapTok`) herda sozinho.
- ✅ (15/07) **R2 — Marca no produto inteiro.** Login Cidade Viva real no painel, splash com logo, ícones do PWA gerados do kit (192/512/apple-touch, sw v13 invalida os antigos), favicon oficial, símbolo casa+circuito no cabeçalho do app, manifest (nome/cores), index de fallback rebatizado. Cabeçalhos dos laudos renomeados junto com o R3. Plano original: Logo no cabeçalho e no splash de boot, favicon + ícones PWA (192/512/apple-touch) gerados do kit, `manifest.json`, título das páginas, `index.html` de fallback, tela de login do painel, cabeçalho do Relatório de Referência/Ficha (o laudo é a peça que o cliente do corretor vê — capricho dobrado).
- ✅ (15/07) **R3 — Renomeação nos textos.** "Radar Fundiário" → "Corretor Inteligente" em TODO texto visível (título, cabeçalho, splash, onboarding, laudos, assinaturas, hints, manifest, index) — zero ocorrências visíveis conferidas ao vivo; chaves internas (radar_*, RADAR_PURE, radar-goiania.html, rotas) intocadas de propósito — nenhum link publicado quebra. Plano original: "Radar Fundiário" → "Corretor Inteligente" em interface, laudos, README e PWA; decidir o que "radar" continua nomeando (candidato: a própria busca territorial vira "o radar" como recurso). Nenhuma mudança em rota/arquivo que quebre link já publicado sem redirect.
- ✅ (15/07) **R4 — UX didática.** Onboarding ganhou o cartão "Explore o mapa de Goiânia" (ensina o zoom nos lotes — pedido original do usuário) e cita mercado/entorno; dicas de primeira vez por recurso (dicaUmaVez: lotes no zoom 17+, dossiê na 1ª ficha — uma vez por navegador, nunca bloqueia); "Mais opções" virou **"Ferramentas"**; página **/como-usar.html** publicada (7 passos + "o que o app não faz de propósito"), linkada do "O que o Corretor Inteligente faz". Verificado em produção. Plano original: Tour de primeira visita (3–4 passos: buscar → zoom nos lotes → dossiê → laudo), microcopy revisada peça a peça (ex.: "Mais opções" vira **"Ferramentas"**), dicas contextuais na primeira vez que cada recurso aparece, e uma página curta "Como usar" linkada do cabeçalho. Regra: linguagem de corretor, não de sistema.
- ✅ (15/07) **R5 — Motion auditado na paleta nova.** A lei do V4 (janela 160-240ms por token + reduced-motion) já governava; a auditoria caçou os resíduos: sombras/anéis de foco com o VERDE ANTIGO cravado em rgba migrados para marinho/petróleo, e teste novo impede regressão. Capa/painel/botões já nasceram nos tokens. Plano original: (lei permanente do produto): transições de entrada do inspetor/cards com stagger, microinterações nos botões primários, skeletons revisados na paleta nova; SEMPRE respeitando `prefers-reduced-motion` e sem custo de frame no mapa.
- ✅/🔶 (15/07) **R6 — Mídia e otimização (1ª entrega).** Open Graph completo (WhatsApp/redes mostram cartão de produto) com ARTE GERADA VIA HIGGSFIELD (nano banana, 2 créditos: malha urbana teal sobre marinho — a Cidade Viva cinematográfica, marca/og-corretorinteligente.jpg 1200×675); preconnect aos 3 hosts críticos do primeiro paint (CDN, tiles, api). FICA para depois: vídeo demo do Como usar, imagens dos passos do tour, medição Lighthouse formal. Plano original: Imagens/vídeo de apoio geradas via Higgsfield MCP (hero do estado vazio, passos do tour, `og:image` para compartilhamento, vídeo curto de demonstração), servidas otimizadas (AVIF/WebP, lazy, dimensões fixas anti-CLS); passada de performance (preload de fontes/tiles críticos, defer do que não é primeiro paint) com meta Lighthouse ≥ 90 em performance/acessibilidade.

### PESQUISA MULTI-FONTE + DOCUMENTO PREMIUM (pedido do usuário, 15/07/2026)

- ✅ **Varredura multi-portal:** cada noite mira um portal com site: (Zap, VivaReal, OLX, ImovelWeb, Chaves na Mão, DF Imóveis + noite genérica), mesma cota de 20 buscas; o dedup multi-sinal garante que o mesmo imóvel em portais diferentes conte 1x; portal da noite auditado.
- ✅ **Cruzamento com a localização na avaliação:** imóvel com coordenada → o entorno medido (destaques + pontos de atenção + cobertura + ODbL) entra no RESULTADO como fato declarado — nunca ajuste automático de preço (§10: só com correlação medida).
- ✅ **Documento premium (§24 v2):** capa marinho com a logo, valor-herói, localização cruzada, tabela numerada casada com o MAPA server-side, funil, parecer, bloco de assinatura Corretor/CRECI. O rótulo PTAM segue travado até verificação profissional (Res. COFECI 1.066/2007) — quando destravar, esta peça é o corpo do PTAM.
- ✅ (16/07) **Estudos abertos de mercado como referência ROTULADA.** Índice FipeZap de Goiânia (dado aberto da FIPE, série completa com 82 meses, xlsx mensal) na tabela indices_mercado com timer todo dia 05; a avaliação anexa a leitura mais recente (variação mês/12m + média R$/m² da cidade) e card + documento exibem com o rótulo "fora do cálculo" sempre visível. Verificado ao vivo (ref. 06/2026: +0,9% mês, +6,5% 12m, R$ 8.352/m²). Lição: FIPE bloqueia o User-Agent do urllib — identificar como navegador. Plano original: ingerir índice FipeZap (Goiânia, público) e/ou boletins Secovi-GO numa tabela indices_mercado; exibidos no card/documento como contexto (o índice da cidade variou X% em 12 meses), NUNCA no cálculo sem correlação medida. Estudo de viabilidade do download automático pendente.
- ⬜ **Correlação localização×preço medida:** quando houver massa de comparáveis geocodificados, medir a correlação real (distância a eixos/POIs vs R$/m²) e só então propor ajuste — com o método publicado no documento.

### ATUALIZAÇÃO CONTÍNUA DO ACERVO (ideia do usuário, 15/07/2026)

Hoje a varredura noturna só DESCOBRE anúncios novos; ninguém revisita os já conhecidos. Para "novos imóveis, novos valores":

- ✅ (15/07) **A1 — Revisita dos anúncios conhecidos** (pelas varreduras + busca ao vivo: delta de preço em price_history + auditoria mudanca-preco). Plano original: rotina periódica que re-busca URLs já colhidas (respeitando a cota Brave), atualiza `last_seen_at`, grava mudança de preço em `price_history` (a tabela já existe e está subusada) e marca anúncio sumido como possivelmente vendido/retirado — sinal de mercado valioso.
- ✅ (15/07) **A2 — Frescor honesto na avaliação:** ofertasColetadasEntre no resultado; card Mercado e laudo declaram o período da amostra. Verificado ao vivo. Alerta de amostra velha: o peso de recência (§8) já existe; expor a IDADE da amostra no card Mercado e no laudo ("ofertas coletadas entre X e Y"), e alertar quando a mediana da amostra passar de N dias.
- ✅ (15/07) **A3 — Sinal de variação:** painel ganhou o bloco "Mercado em movimento" (subiu/baixou por anúncio, agregado, com fonte); popula conforme as varreduras capturam mudanças. Métrica por bairro: quando um mesmo anúncio muda de preço, registrar o delta e usar como termômetro do bairro (métrica agregada, nunca inferência por imóvel isolado).

### CICLO COMERCIAL — marketing, follow-up e pós-venda (ideias do usuário, 16/07/2026)

O produto hoje cobre da BUSCA ao DOCUMENTO. As três ideias fecham o ciclo do corretor: captar (marketing) → conduzir (follow-up) → entregar (status para o cliente). Reflexão registrada antes de codar:

**Decisão de arquitetura que amarra as três:** enquanto não houver contas de corretor (multitenant, adiado de propósito), TODO dado de pessoa (lead, cliente, telefone) é **local-first** — vive só no navegador do corretor, como o caderno e a diligência já fazem ("nenhum nome é armazenado" é promessa publicada). O que precisar de servidor (página de status compartilhável) usa token anônimo e apelido, nunca PII. Quando o multitenant chegar, tudo migra com dono.

- ✅ (16/07) **BUSCA-ESPACO — "uptown" acha "UP TOWN" (achado do usuário).** O cadastro grafa nome de prédio com espaços imprevisíveis; quando a busca por palavras zera, o app refaz IGNORANDO espaços: LIKE com % entre cada letra no servidor (REPLACE() no WHERE o ArcGIS recusa — testado, 400; o padrão espalhado p/ UPTOWN devolve 307 registros = só as unidades do prédio) + confirmação exata no cliente sem espaços. Mínimo 4 letras, padrão só A-Z0-9 (injeção impossível), toast didático mostra a grafia oficial. Verificado ao vivo: "uptown" → 307 unidades do COND UP TOWN (Jd. Europa). Testes busca-espaco (460/460). Parente do item 19 (fuzzy geral segue aberto).
- ✅ (16/07) **AREA-APTO — auditoria da metragem (achado do usuário: "metragem saindo errado, principalmente de apartamentos").** Causa: para UNIDADE, o areaedif do cadastro é a área TOTAL (privativa + fração de área comum + vaga) — o app mandava esse total ao motor (que filtra comparáveis por 0,5×–2× da área e multiplica o R$/m² por ela → estimativa inflada ~3,5×: o apto de teste caiu de ~R$ 2,4 mi para R$ 705 mil com a privativa certa) e o MK-1 anunciava "295 m²" em material público. Conserto: **área privativa DECLARADA uma vez e lembrada no aparelho (ci_privativa, por inscrição)** — nunca convertida por fator inventado; avaliação pede antes de calcular (apto), mostra a área usada com "alterar área"; MK-1 ganhou campo "Área do anúncio" (rótulo honesto: privativos × de área construída; sem área declarada, material sai SEM área); laudo herda e grava a mesma privativa; guarda privativa ≤ total. Testes AREA-APTO (457/457), verificado ao vivo. Casa segue pela areaedif (construída real).
- ✅ (16/07) **MK-1 — Material de divulgação em Ferramentas.** Card 1080×1080 e Story 1080×1920 desenhados NO APARELHO (canvas: marca, tipo+bairro bonito, frase do corretor, área redonda, destaque do entorno medido, preço, contato) com download PNG; legendas em 3 tons (institucional/urgência/história) DETERMINÍSTICAS com dados reais + link da ficha + hashtags; contato lembrado localmente (ci_perfil). Honestidade: o preço divulgado é O DO CORRETOR — a referência do motor pertence à avaliação, nunca ao anúncio (testado). Higgsfield p/ fundos premium fica no R6. Plano original: "Gerar material de divulgação" a partir do imóvel aberto: (a) **card de imagem** (1080×1080 e stories 1080×1920) desenhado em canvas LOCAL — dados do imóvel + mini-mapa + paleta/logo da marca + QR/link do imóvel — download PNG na hora, zero servidor; (b) **legendas prontas** em 3 tons (institucional, urgência, storytelling) redigidas pela IA **com os números validados pela nossa infra §17** (nunca preço inventado em post!), + hashtags locais; (c) variações por canal (Instagram, WhatsApp status, Facebook). Higgsfield entra depois para fundos/artes premium (R6 já tem o pipeline).
- ⬜ **MK-2 — Kit do imóvel:** um clique junta card + legenda + link + documento da avaliação num "pacote de divulgação" copiável.
- ✅ (16/07) **FU-1 — Follow-up (CRM-lite) local-first.** Card "Interessados — follow-up" na Diligência com o vocabulário do ImobRadar: pipeline de 8 estágios, temperatura (quente/morno/frio), follow-up tipado com data e status vencido, OBJEÇÕES de visita tipificadas (aparecem no estágio "visita feita"), WhatsApp com mensagem contextual, backup JSON. PII só no navegador (testado: nenhum fetch com leads). Aviso no boot: "N follow-up(s) vencendo". Verificado ao vivo ciclo completo. Plano original: No dossiê, "Interessados": nome/telefone/nota + estágio (contato → visita → proposta → fechado/perdido) + **próximo follow-up com data** — mesmo padrão de datas locais e alertas que o checklist de diligência já usa (na abertura do app: "3 follow-ups vencendo hoje"). Lista geral em "Meus imóveis" cruzando salvos × interessados. Sem servidor, sem PII fora do aparelho — exportável/importável em JSON para backup.
- ⬜ **FU-2 — Atalhos de ação:** WhatsApp com mensagem pronta contextual ao estágio (pós-visita, cobrança de proposta), registrar contato feito em 1 toque.
- ✅ (16/07) **SV-1 — Status da venda para o CLIENTE — NO AR (fecha o Ciclo Comercial FU→MK→SV).** Página pública corretorinteligente.tech/acompanhe/<token> (nginx → motor 8140): linha do tempo premium das 5 etapas reais de Goiânia (proposta → documentação → ITBI → escritura → registro) com barra de progresso, didática determinística por etapa, data + observação do corretor, marca + assinatura, noindex, rate limit. ZERO PII do cliente: apelido escolhido pelo corretor com guarda anti-PII (e-mail/telefone barrados no servidor), token aleatório 96 bits é a única chave. Painel ganhou o card Vendas (criar/marcar/desfazer/ver como o cliente/copiar link/apagar, senha+CSRF). Migração 005; vendas.js com pool preguiçoso (puras testáveis sem pg); testes vendas (467/467). Verificado ao vivo: venda demo criada, 2 etapas marcadas, página renderizada, 404 amigável, rotas 401 sem sessão. Plano original: Página pública `corretorinteligente.tech/acompanhe/<token>` (token aleatório, criada pelo corretor no painel): linha do tempo das etapas (proposta aceita → documentação → ITBI → cartório → registro concluído) com data e observação por etapa, marca do Corretor Inteligente + espaço para o nome/CRECI do corretor. **Sem PII do cliente no servidor**: o imóvel aparece por apelido escolhido pelo corretor ("Apto Bueno 302"). O corretor atualiza pelo painel; o cliente acompanha como rastreio de encomenda — é ferramenta de encantamento e reduz o "e aí, como tá?".
- ✅ (16/07) **SV-2 — Notificação de etapa (junto com SV-1):** mensagem de WhatsApp pronta e COPIADA automaticamente ao criar o link e a cada etapa marcada (mensagemEtapa no motor + espelho no painel) — ativa, o corretor cola e envia; o contato do cliente nunca existe no servidor. Plano original: botão "copiar mensagem de atualização" para o corretor mandar no WhatsApp do cliente a cada mudança (ativo, não automático — sem armazenar contato).

Ordem sugerida: **FU-1 → MK-1 → SV-1** (follow-up é dor diária; marketing gera visibilidade; status precisa do painel que já existe).

**GARIMPO DO IMOBRADAR (16/07/2026 — repo privado melo202/imobradar, estudado com autorização):** o usuário JÁ construiu um SaaS de gestão comercial (Next.js+Supabase: leads, visitas, follow-ups, propostas, alertas, performance). O que aproveitamos no FU-1 é o MODELO DE DOMÍNIO maduro, não o código (stack diferente): (a) pipeline de lead com 8+ estágios e TEMPERATURA (quente/morno/frio); (b) visita com FEEDBACK estruturado (gostou/não gostou/quer negociar) e OBJEÇÕES tipificadas (preço, localização, tamanho, acabamento, documentação, condomínio, financiamento) — ouro para o corretor saber POR QUE não fechou; (c) follow-up TIPADO (ligar, WhatsApp, enviar imóveis, confirmar visita, cobrar proposta) com status vencido; (d) MOTOR DE ALERTAS com regras parametrizadas que se AUTO-RESOLVEM quando a condição sara: lead novo sem contato em X horas, lead quente sem próxima ação, follow-up vencido, visita sem feedback, proposta parada X dias — é o ''vendas em risco''. DECISÃO ESTRATÉGICA registrada: o FU-1 local-first nasce com ESTE vocabulário (etiquetas em PT), e quando o multitenant chegar, o ImobRadar é o candidato natural a virar o ''modo equipe/imobiliária'' do Corretor Inteligente — os dois produtos se encaixam (CI = imóvel/avaliação; IR = operação comercial).

### Pendências humanas (inalteradas)

- ⬜ Teste tátil em iPhone/Android reais (V1/V4) — site premium já no ar para isso.
- ⬜ V5 — validação com 8–12 corretores.
- ⬜ Pedido LAI do ITBI (I8) — destravaria preços de transação reais.

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
14. ✅ **JSONP → proxy próprio (15/07/2026).** Proxy CORS no VPS (`https://api.corretorinteligente.tech/arcgis/...`, systemd `radar-proxy`, whitelist do portalmapa, cache de 10 min) virou o transporte PREFERIDO do app (`arcgisFetch` dentro de `jsonp()`); o JSONP permanece como fallback automático quando o proxy está fora do ar (PROXY_DEAD por sessão). Erro do upstream propaga para o retry histórico sem acionar o fallback. CSP: `connect-src` ganhou o host do proxy. Testes em `tests/proxy.test.mjs`.

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
