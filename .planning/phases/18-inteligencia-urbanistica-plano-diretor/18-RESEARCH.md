# Phase 18: Inteligência Urbanística — Plano Diretor 2022 (LC 349/2022) - Research

**Researched:** 2026-07-10
**Domain:** dados urbanísticos determinísticos client-side (zoneamento/CA) sobre o ArcGIS oficial + verificação de fonte primária (lei municipal)
**Confidence:** ALTA para GIS/endpoint/codebase (verificado ao vivo + grep no repo); ALTA para os números de CA/altura da AA/ADD/AOS/AAB (lidos DIRETO no PDF oficial, artigo por artigo, nesta sessão); MÉDIA para o índice Vi de outorga onerosa (fora do escopo desta fase, confirmado que vem de lei distinta) e para APAC/AEIS numéricos (não localizados nesta sessão — tratados como não conferidos, seguro por construção)

## Summary

A fase tem duas metades independentes e ambas foram resolvidas nesta pesquisa. **Parte A (gate de verdade):** o PDF oficial da LC 349/2022 foi baixado (21,9 MB, não os ~10 MB estimados) e extraído com sucesso via `pdftotext -layout` (18.250 linhas de texto pesquisável). A divergência 6x/7,5x da Área Adensável (AA) citada pela pesquisa anterior (`PLANO-DIRETOR.md`) **foi resolvida por leitura direta dos artigos**: são DOIS números corretos, para DOIS contextos diferentes — **6x é o índice de aproveitamento MÁXIMO padrão da AA (Art. 196, II)**; **7,5x é um TETO EXCEPCIONAL que só se aplica quando há Transferência do Direito de Construir (TDC) em imóvel de AA fora de PDU (Art. 252, §6º)**. Nenhuma das duas fontes secundárias estava "errada" — ambas leram artigos reais, mas nenhuma citou o artigo, e a IA que consumisse qualquer uma das duas isoladamente teria publicado um número incompleto. A correção crítica adicional: **não existe uma "tabela do Anexo" com os CAs por zona** — o Anexo XXI é a tabela de afastamentos (recuos) por faixa de altura, um instrumento diferente. Os números de CA vivem nos ARTIGOS do corpo da lei (179-197, 240-253), não em um Anexo tabular. Isso muda a citação correta da fonte (`fonte` no `PD_TABELA_CA` deve apontar para "Art. X" da LC 349/2022, nunca "Anexo").

**Parte B (codebase + endpoint):** a arquitetura recomendada pela pesquisa v2.1 (`PLANO-DIRETOR.md`) permanece válida sem drift — query point-in-polygon nas layers 31/33/4 do `Mapa_ModeloEspacial/MapServer` (produção) foi re-confirmada byte-a-byte ao vivo nesta sessão. O CSP do app já libera `script-src` para `portalmapa.goiania.go.gov.br` (mesmo host das layers do PD), então **nenhuma mudança de CSP é necessária** — só mais chamadas `jsonp()` para o mesmo domínio. O bloco único `RADAR_PURE_START`/`RADAR_PURE_END` (linhas 1351-2595 de `radar-goiania.html`) já contém `scoreOportunidade` e `detectarSubutilizados` — as novas funções puras da Fase 18 (`resolverZonaUI`, `calcularPotencialPD`, `criterioDetectorPD`) devem ser inseridas DENTRO desse mesmo bloco para o harness de teste (`node:vm`, slice por linha) conseguir carregá-las. `DETECTOR_LIMITE=50` já existe como constante nomeada — é exatamente o teto que o CONTEXT pede para o upgrade do detector via centroide de quadra, sem precisar duplicar o número.

**Primary recommendation:** publicar `PD_TABELA_CA` com `conferido:true` para AA (CA básico 1x/máximo 6x, Art. 196 II + Art. 242 VII), ADD (CA básico 1x/máximo 5x, Art. 196 I), AAB e AOS (sem teto numérico de CA — a lei regula por altura/ocupação, não por índice — ver nota dedicada abaixo), e altura para AAB/AOS/ARAU (12m geral, 7,5m nos Setores Jaó e Sul, Art. 186); manter `conferido:false` para APAC/AEIS numéricos e para o índice Vi de outorga (fora do escopo desta fase, confirmado que exige a LC 373/2024, lei distinta da 349).

## User Constraints

### Locked Decisions

**Consulta urbanística (PD-01):**
- Fonte ÚNICA: `MapaServer/Mapa_ModeloEspacial/MapServer` (produção) — NUNCA o `_teste`
- Bateria por ponto (x_coord/y_coord por lote, CRS 31982): layers **33** (Macrozoneamento), **31** (AA), **30** (ADD), **29** (AOS), **7** (AEIS), **28** (APAC), **32** (OOAU), **4** (Eixo de Desenvolvimento), **1** (Corredores) — GET `geometry=x,y&geometryType=esriGeometryPoint&inSR=31982`
- Lazy + cache de sessão por `ci`/coordenada (zona não muda na sessão); NUNCA varredura de setor com essas layers
- ~9 queries por ponto em paralelo, mesmo retry/toast gentil do app; falha parcial → mostra o que resolveu + aviso discreto
- LGPD: dado territorial (não PII), mas passa por `esc()` como tudo

**Tabela zona→regras (PD-02) — GATE DE VERDADE:**
- Baixar o PDF oficial da LC 349/2022 e ler os números na fonte primária; resolver a divergência AA 6x vs 7,5x ANTES de exibir qualquer CA
- Regra absoluta: número NÃO conferido na fonte primária NUNCA aparece na UI — mostra a ZONA (fonte primária/GIS) sem o número
- Tabela versionada no repo (JSON <2KB): sigla → {nome, ca_basico, ca_maximo, altura_max, vi_outorga, taxa_ocupacao, usos, fonte, conferido}
- Emendas LC 358/363/364/371/373/379: checadas e anotadas (staleness); rótulo sempre "LC 349/2022 e alterações"
- Se o PDF não puder ser baixado/lido, a fase entrega com `conferido:false` em tudo (seguro por construção); conferência vira HUMAN-UAT explícito

**Seção "Urbanístico" na ficha (PD-03):**
- Accordion no bloco técnico (padrão Fase 9): Macrozona, Unidade Territorial, CA básico/máximo (SE conferido), altura (SE conferida), badges de contexto (AEIS/APAC/ADD/eixo/corredor)
- Disclaimer fixo obrigatório: "Informação urbanística indicativa, extraída do Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Uso do Solo da SEPLANH."
- Estados: carregando, resolvido, parcial, fora da Macrozona Construída, erro

**Score + Detector (PD-04):**
- `potencial = areaterr × ca_basico_da_zona` (só com CA `conferido:true`); score ganha fator `construído ÷ potencial`
- Detector: `areaedif / potencial_do_PD` quando disponível E conferido; fallback gracioso para `areaedif/areaterr` (Fase 16), rotulado como tal
- Detector NUNCA dispara bateria de PD sobre a amostra completa (6k lotes) — só no lote individual da ficha (a) e no centroide da quadra dos top-N candidatos (b, ex. 50, com cache)
- Determinismo: fatores/thresholds como constantes nomeadas; funções puras TDD

**Choropleth de zonas (PD-05):**
- Toggle no Território ("Zonas do Plano Diretor"), exclusivo com o choropleth de valor
- Cores por Unidade Territorial seguindo a simbologia oficial do ArcGIS, contraste AA sobre CARTO e satélite
- Geometria via `returnGeometry=true` LIMITADA à viewport/setor em foco; cache de sessão
- `reduced-motion` respeitado; `setStyle()`/camada própria sem recriar a malha base

### Claude's Discretion
- Skeleton vs consulta-no-abrir do accordion; formato exato da tabela (asset vs inline); top-N e centroides do detector; detalhes da paleta de zonas (desde que simbologia oficial + AA)

### Deferred Ideas (OUT OF SCOPE)
- Upzoning 2022 vs 2007 (bateria extra nas layers 36-48) — v2.2
- Cálculo de contrapartida de outorga (fórmula não confirmada na LC 373/2024) — v2.2
- Vazios urbanos via `Mapa_UsoDoSoloNew` layer 16 — v2.2

## Phase Requirements

| ID | Descrição | Suporte da pesquisa |
|----|-----------|----------------------|
| PD-01 | Consulta point-in-polygon por lote nas camadas do Modelo Espacial, agrupada/lazy | Re-confirmado ao vivo (layers 31/33, sem drift); CSP já libera o host; padrão `jsonp()`/cache a reusar verbatim — ver §Architecture Patterns e §Code Examples |
| PD-02 | Tabela estática zona→regras com números conferidos contra a LC 349/2022 (resolver 6x/7,5x) | **RESOLVIDO nesta sessão** — ver §Gate de Verdade (Parte A) com artigo/inciso exato para AA, ADD, AAB, AOS; APAC/AEIS numéricos permanecem `conferido:false` |
| PD-03 | Seção "Urbanístico" na ficha (accordion) + disclaimer fixo | UI-SPEC já trava o contrato visual/copy; esta pesquisa fornece os dados reais que populam os campos `conferido:true` |
| PD-04 | Score + detector com fator potencial-construtivo, fallback gracioso | `DETECTOR_LIMITE=50` já existe (reusar, não duplicar); `scoreOportunidade`/`detectarSubutilizados` já estão no bloco `RADAR_PURE` — ver §Architecture Patterns |
| PD-05 | Choropleth de zonas, viewport-limited, legível sobre CARTO/satélite | Payload real medido ao vivo (86 KB / 12 polígonos AA em ~4km×4km — ver §Common Pitfalls); `drawingInfo` cross-checado contra o UI-SPEC (cores conferem exatamente) |

## Gate de Verdade (Parte A) — Números de CA conferidos contra a LC 349/2022

### Metodologia
1. Download do PDF oficial: `https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2022/lc_20220304_000000349.pdf` — **21.913.456 bytes** (21,9 MB — quase o dobro dos ~10 MB estimados pela pesquisa anterior; o limite de 10 MB era da ferramenta de fetch daquela sessão, não do arquivo real). `HTTP 200`, `content-type: application/pdf`.
2. Extração de texto: `pdftotext -layout` (poppler, disponível no ambiente via `/mingw64/bin/pdftotext`) — 18.250 linhas, 1.226.050 bytes de texto pesquisável. **Não precisou de Python/pypdf/pdfplumber** (nenhum estava instalado; `pdftotext` bastou e preserva bem a estrutura de artigos).
3. Encoding: o PDF usa uma codificação de fonte que o `pdftotext` não decodifica para UTF-8 corretamente — todo caractere acentuado sai como `�` (replacement char). Isso é cosmético para leitura humana (dá para inferir a palavra pelo contexto) mas **não afeta a extração dos NÚMEROS** (dígitos e pontuação decimal são ASCII puro, não corrompidos). Nenhuma tabela numérica foi comprometida por esse quirk.
4. Busca dirigida por artigo (não por "Anexo" — ver correção abaixo) usando os termos "coeficiente de aproveitamento", "índice de aproveitamento", "vezes a área do terreno", cruzado com os nomes/siglas das unidades territoriais (Art. 139).

### Correção estrutural importante (não estava na pesquisa anterior)
A pesquisa v2.1 (`PLANO-DIRETOR.md` §2.2) assumia que os números de CA estariam "no Anexo" (por isso "baixar o PDF ~10MB e ler o Anexo" era a tarefa da fase, e por isso os extratores anteriores "falharam em reproduzir a tabela literal do Anexo"). **Isso está parcialmente incorreto**: o único Anexo tabular sobre parâmetros construtivos é o **Anexo XXI ("Tabela Parâmetros Urbanísticos")**, que rege **afastamentos (recuos) por faixa de altura da edificação** — não o índice/coeficiente de aproveitamento por zona. O **Anexo XXII** é a tabela de altura máxima/recuos específica da Área de Entorno do Bem Tombado (AEBT), por monumento nomeado (ex. "Grande Hotel: 21,50m") — também não é uma tabela de CA por unidade territorial. **Os números de CA vivem nos ARTIGOS do corpo da lei**, não em uma tabela do Anexo. Isso explica por que os extratores anteriores "falharam": procuravam a tabela errada. `fonte` no `PD_TABELA_CA` deve citar "Art. X, §Y, inciso Z da LC 349/2022", nunca "Anexo".

### A divergência 6x vs 7,5x — RESOLVIDA
Ambos os números existem no texto oficial, para contextos diferentes:

| Número | Onde está | O que rege | Aplica-se a |
|---|---|---|---|
| **6x** | Art. 196, II | Índice de Aproveitamento MÁXIMO padrão | Todo imóvel em AA, sem condição especial |
| **7,5x** | Art. 252, §6º | Teto EXCEPCIONAL quando há Transferência do Direito de Construir (TDC) | Só imóvel em AA, **fora de PDU** (Projeto Diferenciado de Urbanização), recebendo potencial construtivo via TDC |

Texto literal (Art. 196): *"O Índice de Aproveitamento dos terrenos da Macrozona Construída será regulado da seguinte forma: I - nas Áreas de Desaceleração de Densidade – ADD, até o limite máximo de 5 (cinco) vezes a área do terreno para qualquer uso; II - nas Áreas Adensáveis – AA, até o limite máximo de 6 (seis) vezes a área do terreno para qualquer uso."*

Texto literal (Art. 252, §6º): *"O previsto nos §§ 3º, 4º e 5º deste artigo será aplicado também em imóvel não objeto de PDU, integrante da unidade territorial identificada por AA, desde que respeitado Índice de Aproveitamento máximo de 7,5 (sete vírgula cinco) vezes a área do terreno."*

**Recomendação para `PD_TABELA_CA`:** publicar `ca_maximo: 6.0` para AA como o valor PADRÃO (`conferido:true`, `fonte:"Art. 196, II, LC 349/2022"`); o 7,5x é um caso de exceção condicional (TDC + fora de PDU) demasiado específico para a ficha do lote individual (a ficha não sabe se aquele lote específico está em processo de TDC) — **não publicar 7,5x na ficha padrão**; se o planner quiser, pode citá-lo só na nota de metodologia como "índice pode chegar a 7,5x em casos de Transferência do Direito de Construir fora de PDU (Art. 252, §6º)" — mas isso é decisão de UX, não do gate de verdade (o número em si está 100% conferido, a questão é só qual dos dois é o "padrão" a mostrar).

### Coeficiente de Aproveitamento Básico (não oneroso) — universal, 1x
Art. 242, caput + inciso VII: *"Fica instituído um Coeficiente de Aproveitamento Básico não Oneroso, para todos os imóveis contidos na Macrozona Construída... VII - áreas edificadas privativas, cobertas ou não, até no máximo o correspondente a 01 (uma) vez a área de sua unidade imobiliária."* Isso é o **CA básico = 1x, universal para TODA a Macrozona Construída** (não varia por zona) — a área construída dentro desse limite não precisa de outorga onerosa (OODC); o que exceder 1x até o índice máximo do Art. 196 (5x ADD / 6x AA) é "oneroso" (Art. 243) e sujeito a contrapartida financeira cujo valor é regulado por **lei distinta** (LC 373/2024 — confirmado pelo Art. 246: *"A OODC será concedida mediante o pagamento... calculada de acordo com a aplicação de fórmula a ser estabelecida em lei específica"*).

**Confiança: ALTA** (texto lido diretamente, mesma sessão).

### AAB e AOS — sem teto numérico de CA (achado negativo confirmado, não uma lacuna)
Art. 196 (a única disposição de "índice de aproveitamento" da lei) regula EXPLICITAMENTE só ADD (inciso I) e AA (inciso II) — **AAB e AOS não aparecem nesse artigo**. Isso não é um "número que não encontramos"; é uma leitura textual confirmada de que **a lei não define um teto numérico de CA para essas duas unidades territoriais** — o parâmetro limitante para elas é a ALTURA e a TAXA DE OCUPAÇÃO, não o índice de aproveitamento:
- **AAB e AOS** (e ARAU onde a ocupação é permitida): altura máxima **12m**; exceção nos **Setores Jaó e Sul: 7,5m** (Art. 186, caput + parágrafo único — este é o número "7,5" que a pesquisa anterior já tinha achado corretamente e que é INDEPENDENTE da divergência de CA da AA — são dois "7,5" completamente não relacionados, cuidado ao reler `PLANO-DIRETOR.md` para não confundi-los).
- **AOS** (e ARAU/ARAR pelo mesmo dispositivo): taxa de ocupação máxima **40%** do terreno, inclusive no subsolo (Art. 190, §3º) — isso é uma EXCEÇÃO ao regime geral (que é 100% até 11m / 50% acima de 11m, Art. 190, II/III, aplicável a AA/ADD e às demais zonas sem regra própria).

**Recomendação para `PD_TABELA_CA`:** para AAB e AOS, publicar `ca_maximo: null` com `conferido: true` e uma nota distinta de "número não existe na lei" (diferente semanticamente de "não verificamos ainda") — ex. `nota_ca: "Lei não define teto de índice de aproveitamento para esta zona (Art. 196 regula só AA/ADD); o parâmetro limitante é a altura/taxa de ocupação."` Isso é uma nuance que o planner deve decidir como expor na UI (a REGRA DE OURO do CONTEXT fala de "número não conferido nunca aparece" — aqui o número simplesmente NÃO EXISTE, o que é uma informação positiva e seguramente exibível, ex. "Sem teto de índice de aproveitamento definido — altura máxima de 12m é o parâmetro").

### Resumo consolidado — o que está CONFERIDO e o que não está

| Sigla | CA básico | CA máximo | Altura máxima | Taxa ocupação | `conferido` | Fonte (artigo) |
|---|---|---|---|---|---|---|
| AA | 1,0x (universal) | **6,0x** (padrão); 7,5x só com TDC+fora-de-PDU | sem teto explícito; regulado por ocupação 100% até 11m / 50% acima | 100%/50% (não é zona AOS-style) | **true** | Art. 242 VII; Art. 196 II; Art. 252 §6º (exceção); Art. 190 II/III |
| ADD | 1,0x (universal) | **5,0x** | mesma regra 100%/50% de AA | 100%/50% | **true** | Art. 242 VII; Art. 196 I; Art. 190 II/III |
| AAB | 1,0x (universal) | **sem teto numérico** (achado negativo confirmado) | **12m** | regime geral (não citado como exceção) | **true** (incl. a ausência de teto) | Art. 242 VII; Art. 196 (silêncio confirmado); Art. 186 |
| AOS | 1,0x (universal) | **sem teto numérico** (achado negativo confirmado) | **12m** (7,5m nos Setores Jaó/Sul) | **40%** (exceção, inclusive subsolo) | **true** | Art. 242 VII; Art. 186; Art. 190 §3º/§4º |
| ARAU | não aplicável (uso restrito/condicionado) | não aplicável | **12m** onde ocupação é permitida | não localizado nesta sessão | **parcial** (só altura confirmada) | Art. 142; Art. 186 |
| APAC | — | — | regulado por Anexo XXII, tabela nomeada por monumento (não uma zona genérica) | — | **false** (não há um número único "para APAC"; é caso-a-caso por bem tombado) | — |
| AEIS I/II/III | — | — | regulado por leis específicas (Art. 40/49 + LC 379/2024 para HIS) | — | **false** (fora do PDF desta lei; exige leitura de LC 379/2024) | Art. 40/49 (existência confirmada, números não) |
| Vi (outorga onerosa) | — | — | — | — | **false** (LC 349 delega a fórmula a "lei específica" — confirmado Art. 246; é a LC 373/2024, explicitamente fora do escopo desta fase per CONTEXT) | Art. 246 |

### Emendas — staleness check (checadas nesta sessão via WebSearch + WebFetch da fonte oficial)

| Lei | Data | O que faz | Altera Art. 196/242/252 (as números de CA)? |
|---|---|---|---|
| LC 358 | **29/11/2022** (não "2023" como a pesquisa anterior listou sem confirmar) | Adicional de Otimização do Trabalho dos Agentes de Trânsito — **não relacionada ao Plano Diretor** | Não — lei de assunto totalmente diferente. **Correção da pesquisa anterior**: `PLANO-DIRETOR.md` listava "LC 358/2023" como possível emenda ao PD sem confirmar o teor; confirmado agora que não é. |
| LC 363/2023 | 2023 | Código de Parcelamento do Solo | Não verificado diretamente nesta sessão (fora do orçamento); não há indício de que altere Art. 196 |
| LC 364/2023 | 13/01/2023 | Código de Obras e Edificações | Não verificado diretamente; mesmo raciocínio |
| LC 371/2024 | 04/01/2024 | Ocupação dos Vazios Urbanos — **confirmado via WebSearch que "altera a LC 349/2022"** | Sobre vazios urbanos (tema distinto); nenhum indício de alteração ao Art. 196/242 |
| LC 373/2024 | 19/01/2024 | Regulamenta a OODC (Art. 240-247) — a fórmula/preço da contrapartida | Não altera o índice em si (Art. 196), só o CUSTO de exceder o CA básico |
| LC 379/2024 | 12/06/2024 | Parâmetros de HIS — **verificado via WebFetch da .html oficial**: referencia o Art. 252 (TDC) para incentivos de HIS, **não altera nem o Art. 196 nem o Art. 242** | Confirmado que não altera |

**Conclusão de staleness:** até a emenda mais recente checada (LC 379/2024, 12/06/2024), os números do gate (Art. 196 e Art. 242) permanecem vigentes sem alteração. **Confiança: MÉDIA-ALTA** — LC 379 foi verificada por leitura direta (WebFetch do `.html` oficial); LC 371/373 foram cruzadas só por resumo de busca (WebSearch), não por leitura completa do texto — ver Assumptions Log (A1).

## Standard Stack

Não há biblioteca nova a instalar nesta fase — é 100% extensão do padrão client-side já em produção (`radar-goiania.html`, sem framework/build).

### Core (reusado, zero dependência nova)
| Recurso | Onde já existe | Uso na Fase 18 |
|---|---|---|
| `jsonp(params,retries,url)` / `jsonpOnce` | linhas 2636-2654 | dispara as ~9 queries por ponto do PD-01 contra `Mapa_ModeloEspacial/MapServer` |
| `esc()` | linha 1340 | sanitiza `sigla`/`nm_des`/`nm_mzo` retornados pelas layers do PD antes de interpolar no DOM |
| bloco `RADAR_PURE_START`...`RADAR_PURE_END` (linhas 1351-2595) | contém `scoreOportunidade` (1543), `detectarSubutilizados` (2380) | novas funções puras da Fase 18 (`resolverZonaUI`, `calcularPotencialPD`, `criterioDetectorPD`) DEVEM entrar dentro deste bloco — é o único slice que o harness de teste (`tests/*.test.mjs`, `node:vm`) carrega |
| `TERRCACHE`/`CMPCACHE` (padrão de cache de sessão + `capCache(o,max)`) | linhas 3407, 5502, 2959 | clonar como `PDCACHE` por `ci`/coordenada (CONTEXT já nomeia isso) |
| `DETECTOR_LIMITE=50` (linha 2336) | já é o teto do detector | reusar como o "top-N" do upgrade de zona por centroide — **não duplicar o número 50** |
| `.skel-card`/`.skel-line`, `.dgrid`/`.cell`, `.dnote`, `.foot>summary` | CSS já existente (linhas 227-235, 401-405, 453) | estados de carregamento/resolvido do accordion — já travado no `18-UI-SPEC.md` |

### Instalação
```bash
# nenhuma — zero pacote npm novo (o package.json só tem "type":"module" e o script de teste)
```

### Alternativas consideradas
| Em vez de | Poderia usar | Tradeoff |
|---|---|---|
| Consulta ao vivo por ponto (jsonp) | Distill de shapefile/geojson em build-time | Rejeitado pela pesquisa v2.1 (§3.2) e reconfirmado aqui: não há geojson baixável nas páginas oficiais; consulta ao vivo é 1 request/layer de ~200-500 bytes, já validada; path (b) adicionaria point-in-polygon em JS + biblioteca extra sem necessidade |
| `pdftotext` (poppler) | `pypdf`/`pdfplumber` (Python) | Nenhum dos dois estava instalado no ambiente; `pdftotext -layout` já disponível e suficiente (extraiu 18.250 linhas corretamente, tabelas incluídas) — não instalar pacote Python só para isso, é uma tarefa one-shot de pesquisa, não algo que o app precisa rodar em produção |

## Architecture Patterns

### Recomendado: bateria paralela por ponto (reusa o padrão de bairro/comparáveis)
```
Abrir ficha de um imóvel (já tem x_coord,y_coord do lote, mesmo campo usado por toWGS()):
  1. PDCACHE[ci] existe? → usa (cache de sessão, zona não muda)
  2. Senão, dispara em paralelo via jsonp() (mesmo host já liberado no CSP):
     GET .../Mapa_ModeloEspacial/MapServer/{33,31,30,29,7,28,32,4,1}/query
         ?geometry=x,y&geometryType=esriGeometryPoint&inSR=31982
         &spatialRel=esriSpatialRelIntersects&outFields=sigla,nm_des,nm_mzo,sigla2
         &returnGeometry=false&f=json&callback=cb_xxx
  3. Promise.allSettled (NÃO Promise.all — falha parcial não deve derrubar as que resolveram)
  4. resolverZonaUI(respostas) monta o estado do accordion (carregando/resolvido/parcial/rural/erro)
  5. Resolve a sigla (ex. "AA") contra PD_TABELA_CA (JSON estático, embutido)
  6. PDCACHE[ci] = resultado combinado (zona ao vivo + regra estática)
```

### Pattern: detector com upgrade barato por centroide (evita avalanche)
```
detectarSubutilizados(lotes) já corta a 50 candidatos (DETECTOR_LIMITE) ANTES de qualquer
consulta de PD — a lista de candidatos é a fonte, nunca a amostra de 6k lotes inteira.
Para cada um dos ≤50 candidatos:
  - usar o centroide da QUADRA (não do lote individual) como ponto de consulta —
    lotes da mesma quadra tipicamente compartilham unidade territorial, então
    1 consulta por quadra (com cache por nrquadra+cdbairro) é suficiente e barato
  - criterioDetectorPD(areaedif, potencialPD) se a zona/CA foram resolvidos e conferidos
  - fallback para o critério atual (areaedif/areaterr) se não — NUNCA bloqueia a lista
```
Fonte: constantes já existentes (`DETECTOR_LIMITE=50`, linha 2336) + padrão de cache de sessão já usado por `TERRCACHE`/`CMPCACHE`.

### Pattern: choropleth de zonas — camadas empilhadas, nunca 1 fill "vencedor"
Já travado no `18-UI-SPEC.md` §Color (nota 3): 6 layers Leaflet separadas e semi-transparentes por unidade territorial (sobreposição visual por transparência, nunca prioridade arbitrária). Confirmado nesta pesquisa que o payload de geometria é real e não-trivial (ver §Common Pitfalls) — a limitação por viewport não é opcional, é obrigatória para o orçamento funcionar.

### Anti-padrões a evitar
- **Consultar o `Mapa_ModeloEspacial_teste`:** numeração de layers diferente (IDs 0-88 vs 0-48), risco de inconsistência — a regra "produção sempre" do CONTEXT está certa e é reforçada por esta pesquisa (nenhuma vantagem do `_teste` para este caso de uso).
- **Citar "Anexo" como fonte do CA na tabela:** a maioria dos números de CA está nos ARTIGOS, não em um Anexo — citar "Anexo XXI" ou "Anexo do PD" para um CA seria uma citação FALSA (Anexo XXI é sobre afastamentos, não CA). Sempre citar "Art. X, LC 349/2022".
- **Publicar 7,5x como o CA "padrão" da AA:** é um teto condicional (TDC + fora de PDU), não o índice geral — publicá-lo sem essa condição enganaria o corretor sobre o que é construível por padrão.
- **Rodar a bateria de PD sobre a amostra completa do detector (6k lotes):** violaria o orçamento do endpoint; a bateria só entra DEPOIS do corte de `DETECTOR_LIMITE`.

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|---|---|---|---|
| Point-in-polygon | Raycasting manual em JS sobre geojson baixado | Query HTTP ao ArcGIS (`spatialRel=esriSpatialRelIntersects`) | O servidor já faz isso; reimplementar em JS exigiria geometria completa das 9 layers embutida no HTML único — inviável de tamanho e desnecessário |
| Extração de tabela de PDF em produção | Parser de PDF no app (rodando no navegador do corretor) | Tabela estática `PD_TABELA_CA` (JSON <2KB), extraída UMA VEZ nesta pesquisa e versionada no repo | A extração é tarefa de BUILD-TIME/pesquisa, não de runtime — o app nunca precisa reabrir o PDF |
| Cálculo de contrapartida de outorga (OODC) | Fórmula própria a partir de "padrão nacional" (Estatuto da Cidade) | Nada — deferido explicitamente (fora do escopo, precisa da LC 373/2024 lida à parte) | O CONTEXT já decidiu isso; esta pesquisa CONFIRMA que a LC 349 delega a fórmula "a lei específica" (Art. 246) — não há como calcular certo sem ler a 373 |

**Key insight:** o único artefato genuinamente "hand-built" desta fase é a leitura humana/assistida do texto da lei para popular `PD_TABELA_CA` — e isso já foi feito nesta sessão de pesquisa. O código da fase é 100% composição de padrões já existentes no repo (jsonp, cache, funções puras, accordion, choropleth).

## Common Pitfalls

### Pitfall 1: assumir que "o Anexo" tem a tabela de CA
**O que dá errado:** procurar uma tabela única com "AA: 6x, ADD: 5x, AOS: —" formatada como planilha — ela não existe. Os extratores de PDF da pesquisa anterior "falharam" porque procuravam algo que não está lá dessa forma.
**Por que acontece:** é o padrão comum em outras cidades (índices tabulados por zona); Goiânia optou por regular via artigos discursivos.
**Como evitar:** buscar por conceito ("vezes a área do terreno", "índice de aproveitamento") cruzado com o nome da unidade territorial, não por "Anexo".
**Sinais de alerta:** se a citação da fonte diz "Anexo XXI" para um número de CA, está errada (XXI é recuos).

### Pitfall 2: confundir os dois "7,5" da lei
**O que dá errado:** o "7,5x" da divergência de CA da AA (Art. 252 §6º, TDC) e o "7,5m" de altura máxima nos Setores Jaó/Sul (Art. 186, parágrafo único) são dois números completamente não relacionados que compartilham o dígito 7,5 — fácil de misturar numa leitura rápida.
**Como evitar:** sempre conferir a UNIDADE (x = múltiplo de área; m = metros de altura) e o artigo exato antes de gravar no `PD_TABELA_CA`.

### Pitfall 3: payload de geometria do choropleth não é trivial
**Medido ao vivo nesta pesquisa:** uma envelope de ~4km×4km na layer 31 (AA) com `returnGeometry=true` e só 2 `outFields` retornou **86.678 bytes / 12 polígonos** (alguns com 700+ pontos no anel). Para as 6 layers do choropleth (7/28/29/30/31/32) num viewport desse tamanho, o total pode facilmente passar de **300-500 KB por troca de camada** — não é "leve" como as queries por ponto (~200-500 bytes). **Mitigação:** a limitação por viewport do CONTEXT/UI-SPEC é OBRIGATÓRIA, não uma otimização opcional; considerar reduzir ainda mais o envelope (setor/bairro em foco, não "viewport inteiro" em zoom baixo) e cachear agressivamente por chave de viewport arredondado.
**Sinais de alerta:** se o toggle "Colorir por zonas" demorar visivelmente mais que "Colorir por valor" (que não baixa geometria, só usa os lotes já escaneados), o payload é o motivo mais provável.

### Pitfall 4: encoding mojibake nos campos de texto das layers do PD
**O que dá errado:** `nm_des`/`nm`/`nm_mzo` retornados pelo ArcGIS vêm com acentuação corrompida em alguns casos (confirmado ao vivo: `"nm_des":"ÁREA ADENSÁVEL"` — correto no JSON da API, mas o mesmo padrão de mojibake documentado no cadastro por `NOMES-01..04` pode se repetir dependendo do encoding de armazenamento da layer). **Mitigação:** exibir preferencialmente a `sigla` (sempre limpa, ASCII) + o NOME da `PD_TABELA_CA` estática (que o próprio app escreve, sem depender do `nm_des` do servidor) em vez de interpolar `nm_des`/`nm` cru — evita reintroduzir o problema que NOMES-01..04 já resolveu para bairros.

### Pitfall 5: `Promise.all` derruba tudo numa falha parcial
**O que dá errado:** se uma das 9 queries retornar erro (502 do servidor, já documentado como risco conhecido) e o código usar `Promise.all`, as OUTRAS 8 respostas boas são descartadas — o estado "parcial" do UI-SPEC (§Estados, item d) fica impossível de alcançar.
**Como evitar:** `Promise.allSettled` + filtrar `status==="fulfilled"`, mesmo padrão que o app já precisa para `resolverZonaUI` retornar o estado parcial corretamente.

## Code Examples

### Query por ponto (verificado ao vivo, layer 31 AA)
```
// Source: portalmapa.goiania.go.gov.br, verificado ao vivo em 2026-07-10
GET https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_ModeloEspacial/MapServer/31/query
    ?geometry=686000,8153000&geometryType=esriGeometryPoint&inSR=31982
    &spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json

// Resposta real (campo relevante):
// {"attributes":{"sigla":"AA","nm_des":"ÁREA ADENSÁVEL", ...}}
// NENHUM campo numérico de CA vem da layer — confirma que a tabela estática é indispensável.
```

### drawingInfo (cross-check da paleta do UI-SPEC — coincide exatamente)
```
// Source: .../Mapa_ModeloEspacial/MapServer/31?f=json, verificado 2026-07-10
"renderer":{"symbol":{"color":[255,170,0,255],
  "outline":{"color":[225,170,0,255],"width":0.4}},"transparency":45}
// = --zone-aa:#ffaa00 / --zone-aa-line:#e1aa00 (18-UI-SPEC.md) — EXATO, confirmado.
// Nota: a simbologia oficial já embute transparency:45 (Esri, escala 0-100) — o app usa
// opacidade flat própria (.22/.42), não precisa derivar desse valor, mas é bom saber que
// a Prefeitura também já trata essas zonas como semi-transparentes por padrão.
```

### Onde inserir as novas funções puras (dentro do bloco existente)
```javascript
// radar-goiania.html, linha 1351: // RADAR_PURE_START — ...
// ... scoreOportunidade (1543), detectarSubutilizados (2380), etc já vivem aqui ...
// NOVO (Fase 18): resolverZonaUI, calcularPotencialPD, criterioDetectorPD devem entrar
// ANTES da linha 2595 (// RADAR_PURE_END) — senão tests/*.test.mjs (vm.Script slice por
// linha) não vai conseguir carregá-las e os testes novos vão falhar por "function ausente".
```

## State of the Art

| Abordagem antiga (assumida pela pesquisa v2.1) | Abordagem corrigida (esta pesquisa) | Quando mudou | Impacto |
|---|---|---|---|
| "A tabela de CA está no Anexo, extratores de PDF falharam por limite de tamanho" | Números estão nos ARTIGOS (196, 242, 252, 186, 190); Anexo XXI/XXII são tabelas de afastamento/altura por monumento, não de CA | Nesta sessão (2026-07-10), ao ler o PDF completo (21,9 MB, sem limite de 10 MB) | Muda a citação de fonte no `PD_TABELA_CA` de "Anexo" para "Art. X" — citação legalmente mais correta e verificável |
| "Divergência 6x/7,5x não resolvida, publicar seguro sem número" | 6x = padrão (Art.196 II); 7,5x = excepcional só com TDC fora de PDU (Art.252 §6º) — ambos corretos, contextos diferentes | Nesta sessão | Desbloqueia `conferido:true` para AA sem esperar confirmação humana adicional — mas o planner ainda decide qual dos dois expor na ficha padrão (recomendação: 6x) |
| "LC 358/2023 pode alterar o PD" (não confirmado) | LC 358/2022 (não 2023) é sobre adicional salarial de agentes de trânsito — não relacionada | Nesta sessão (WebSearch) | Remove um item falso da lista de staleness; simplifica a nota de emendas no app |

**Desatualizado/corrigido:**
- A citação "Anexo (~10MB)" da pesquisa v2.1: o arquivo real tem 21,9 MB e os números relevantes não estão no Anexo — manter isso em mente se o `18-CONTEXT.md`/roadmap for reciclado para outra fase.

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|--------|------------------|
| A1 | LC 371/2024 e LC 363/2024 (Código de Parcelamento) não alteram os Art. 196/242/252 (números de CA) | §Gate de Verdade, tabela de staleness | Confiança MÉDIA-ALTA, não MÁXIMA — só LC 379/2024 foi confirmada por leitura direta (WebFetch do `.html` oficial); LC 371/373/363/364 foram cruzadas só por resumo de WebSearch, não pelo texto completo. Se uma dessas alterar silenciosamente o índice, `PD_TABELA_CA` ficaria desatualizada sem aviso. **Mitigação recomendada:** o advogado (usuário) revisar essas 2-3 leis específicas como parte do HUMAN-UAT já previsto pelo CONTEXT, ou uma sessão de pesquisa dedicada antes do release se o tempo permitir. |
| A2 | O achado "AAB/AOS não têm teto numérico de CA" é uma leitura correta do silêncio do Art. 196 (não uma omissão de busca) | §Gate de Verdade, "AAB e AOS — sem teto numérico" | Se existir um teto para AAB/AOS em outro artigo não localizado nesta sessão (busca foi por termo, não teve tempo de ler a lei artigo-por-artigo do início ao fim), a tabela ficaria "conferido:true" com um `null` que deveria ser um número. Risco BAIXO (a busca por "vezes a área do terreno"/"índice de aproveitamento" foi ampla e exaustiva no texto extraído), mas não é uma leitura linear completa das 337 páginas. |
| A3 | O 7,5x do Art. 252 §6º é a fonte da divergência da pesquisa anterior (e não um terceiro número ainda não encontrado) | §Gate de Verdade, "A divergência 6x vs 7,5x — RESOLVIDA" | Alta plausibilidade (o número, a unidade territorial AA, e o contexto de exceção batem exatamente com o que fontes secundárias generalistas tenderiam a citar sem contexto), mas as fontes secundárias originais (MySide, Sagres Online) não foram re-consultadas nesta sessão para confirmar que citavam EXATAMENTE este artigo. |

**Se esta tabela estivesse vazia:** não está — 3 itens got carried mesmo após leitura direta do PDF primário, porque nem toda pergunta (staleness completa, cobertura de 337 páginas) cabia no orçamento desta sessão de pesquisa. Isso é esperado e seguro: nenhum desses 3 itens bloqueia `conferido:true` para os números já lidos diretamente (Art. 196/242/186/190), que são a maioria do que a ficha precisa mostrar.

## Open Questions

1. **O planner deve expor o 7,5x (TDC) na ficha, mesmo como nota secundária?**
   - O que sabemos: o número está conferido, mas é condicional (TDC + fora de PDU), informação que a ficha do lote individual não tem como confirmar automaticamente (não há campo de "está em processo de TDC" nas layers consultadas).
   - O que é incerto: se omitir completamente decepciona um corretor que sabe da exceção, ou se mencioná-la sem contexto suficiente confunde mais do que ajuda.
   - Recomendação: omitir da ficha padrão (só mostrar 6,0x); citar em "Metodologia e fontes" como nota de rodapé factual, sem prometer que se aplica ao lote em questão.

2. **A tabela `PD_TABELA_CA` deve incluir ARAU mesmo com dados parciais (só altura confirmada)?**
   - O que sabemos: ARAU é citada nas 9 layers da bateria (via layers de restrição ambiental 11-27, fora da lista principal de badges do UI-SPEC) e tem altura de 12m confirmada onde a ocupação é permitida.
   - O que é incerto: ARAU não tem badge dedicado no UI-SPEC (que só nomeia AEIS/APAC/ADD/Eixo/Corredor) — não está claro se APARECE em algum lugar da ficha ou só no choropleth/contexto.
   - Recomendação: como o UI-SPEC não pede um badge de ARAU, tratar como fora do escopo visual desta fase (mesma lógica do OOAU, que o UI-SPEC já marcou como "sem badge dedicado") — só documentar no `PD_TABELA_CA` para uso futuro.

3. **Confirmar página exata do Anexo XXI/XXII não é necessário para o gate, mas seria bom ter para citação formal?**
   - O que sabemos: os artigos (196, 242, 252, 186, 190) são citáveis por número, que é a forma padrão e estável de citação legal (não muda entre reimpressões do PDF).
   - Recomendação: usar sempre "Art. X, LC 349/2022" como `fonte`, nunca número de página do PDF (que pode variar entre versões consolidadas/reimpressões).

## Environment Availability

| Dependência | Necessária para | Disponível | Versão | Fallback |
|---|---|---|---|---|
| `curl` | Download do PDF oficial + queries ao ArcGIS | ✓ | (Git Bash / mingw64) | — |
| `pdftotext` (poppler) | Extração de texto do PDF da LC 349/2022 | ✓ | `/mingw64/bin/pdftotext` | `pypdf`/`pdfplumber` (nenhum instalado, não precisou) |
| `python3` | Inspeção de JSON de resposta (payload/geometria) | ✓ | disponível no PATH | — |
| Node.js (`node --test`) | Suite de testes (184/184 verde, confirmado nesta sessão) | ✓ | via `npm test` | — |
| `portalmapa.goiania.go.gov.br` (ArcGIS) | Todo o PD-01/05 (queries ao vivo) | ✓ | ArcGIS Server 10.4, mesmo host já liberado no CSP | Cache de sessão (`PDCACHE`) já é a mitigação de instabilidade prevista pelo CONTEXT — nenhum fallback de dataset estático existe se o servidor cair permanentemente (risco já documentado, aceito) |

**Sem dependências faltando que bloqueiem a fase.**

## Validation Architecture

### Test Framework
| Propriedade | Valor |
|---|---|
| Framework | `node:test` + `node:assert/strict` (nativo Node, sem dependência) |
| Config file | nenhum — `package.json` só declara `"scripts":{"test":"node --test \"tests/*.test.mjs\""}` |
| Comando rápido | `npm test` (184 testes existentes rodam em ~145ms — já é "rápido" por natureza) |
| Comando completo | `npm test` (não há distinção rápido/completo no projeto — a suite inteira já é rápida) |

### Padrão de carregamento (crítico para a Fase 18)
Todo teste de função pura usa o mesmo padrão: ler `radar-goiania.html` como string, fatiar entre os marcadores `RADAR_PURE_START`/`RADAR_PURE_END` **por linha** (nunca por `indexOf` cru — os marcadores vivem dentro de comentários), montar um `vm.Script` com `globalThis.__exports={...}` no final, e rodar em um `vm.createContext({})` isolado. As 3 funções puras novas da Fase 18 (`resolverZonaUI`, `calcularPotencialPD`, `criterioDetectorPD`) devem:
1. Ficar fisicamente ENTRE as linhas 1351 e 2595 do HTML (dentro do bloco existente, não um bloco novo)
2. Ser adicionadas à lista de `assert.ok(src.includes("function nomeDaFuncao"))` e ao objeto `__exports` de um novo arquivo `tests/plano-diretor.test.mjs` (ou extensão de `tests/scores.test.mjs`, já que `scoreOportunidade`/`detectarSubutilizados` também moram ali — decisão do planner)

### Mapa Requisitos → Testes
| Req ID | Comportamento | Tipo de teste | Comando automatizado | Arquivo existe? |
|---|---|---|---|---|
| PD-02 | `PD_TABELA_CA["AA"].conferido===true` e `.ca_maximo===6` | unit (fixture direta contra a constante) | `node --test tests/plano-diretor.test.mjs` | ❌ Wave 0 |
| PD-02 | Nenhuma sigla tem `conferido:true` sem `fonte` preenchida (guarda de integridade da própria tabela) | unit | idem | ❌ Wave 0 |
| PD-04 | `calcularPotencialPD(areaterr, ca_basico)` retorna `null` quando `conferido:false`, nunca um número fabricado | unit (fixtures REGRA DE OURO) | idem | ❌ Wave 0 |
| PD-04 | `criterioDetectorPD` cai no fallback `areaedif/areaterr` quando zona/CA ausentes, rotulado como tal | unit | idem | ❌ Wave 0 |
| PD-01 | `resolverZonaUI` monta corretamente os 5 estados (carregando/resolvido/parcial/rural/erro) a partir de respostas simuladas de `Promise.allSettled` | unit (stub de rede, mesmo padrão de `territorioScan` em `territorio.test.mjs`) | idem | ❌ Wave 0 |
| PD-03 | grep: nenhum número de CA aparece no HTML de `renderUrbanisticoUI` quando `conferido:false` (REGRA DE OURO) | unit (assert sobre string de output, mesmo padrão de `CADERNO_ALLOW`) | idem | ❌ Wave 0 |
| PD-05 | payload de `montarLegendaZonas()`/query de geometria respeita o filtro de viewport (não dispara para a cidade inteira) | unit (stub de `jsonp`, assert sobre os parâmetros da chamada) | idem | ❌ Wave 0 |

### Amostragem
- **Por commit de task:** `npm test` (suite inteira, já é rápida — sem necessidade de subset)
- **Por merge de wave:** `npm test` (mesmo comando, sem distinção)
- **Gate de fase:** suite verde (184 + novos testes da Fase 18) antes de `/gsd-verify-work`

### Lacunas de Wave 0
- [ ] `tests/plano-diretor.test.mjs` — novo arquivo, cobre PD-01/02/03/04 (funções puras)
- [ ] Fixtures em `tests/fixtures.mjs` (ou arquivo próprio) para os 9 estados combinatórios de `resolverZonaUI` (todas resolvidas / parcial / todas falham / fora da macrozona / AA com CA conferido / AAB sem CA)
- [ ] Nenhuma instalação de framework necessária — `node:test` já cobre tudo

## Security Domain

### Categorias ASVS aplicáveis (nível 1, per `.planning/config.json`)

| Categoria ASVS | Aplica-se | Controle padrão |
|---|---|---|
| V2 Autenticação | não | app sem login/conta (client-side puro) |
| V3 Gestão de Sessão | não | sem sessão de servidor; "sessão" aqui é só `PDCACHE` em memória do navegador |
| V4 Controle de Acesso | não | sem recursos protegidos — dado urbanístico é público |
| V5 Validação de Entrada | **sim** | `esc()` (já existente) em TODO campo de texto retornado pelas layers do PD (`sigla`, `nm_des`, `nm`, `nm_mzo`) antes de interpolar no DOM — mesma disciplina já aplicada ao cadastro (Fase 16, CR-01); nunca usar esses valores em `onclick=""` inline (lição já documentada) |
| V6 Criptografia | não | sem dado sensível/PII nesta fase; CSP já restringe `connect-src 'self'` e libera só `script-src` para o host do ArcGIS via JSONP — nenhuma chave/segredo envolvido |

### Padrões de ameaça conhecidos para este stack

| Padrão | STRIDE | Mitigação padrão |
|---|---|---|
| XSS via campo de texto do ArcGIS (`nm_des`/`nm`) interpolado sem escape | Tampering/Elevation | `esc()` obrigatório (já é o padrão do repo); preferir a `PD_TABELA_CA` estática (nomes que o próprio app escreve) a interpolar `nm_des` cru — reduz a superfície mesmo que `esc()` já mitigue |
| Avalanche de requisições contra endpoint frágil (DoS acidental ao próprio servidor da Prefeitura) | Denial of Service | Cache de sessão (`PDCACHE`), lazy (só ao abrir a ficha/accordion), teto explícito no detector (`DETECTOR_LIMITE=50`), viewport-limited no choropleth — todos já decisões travadas do CONTEXT, reforçadas por esta pesquisa |
| CSP bypass ao adicionar novo host de script | Tampering | Não aplicável — o host (`portalmapa.goiania.go.gov.br`) já está no `script-src` da CSP existente; nenhuma alteração de CSP necessária para esta fase (verificado nesta pesquisa) |
| Publicar número legal incorreto/desatualizado (não é um risco técnico OWASP, mas é um risco de confiabilidade do domínio) | — | `conferido:false` por padrão + disclaimer fixo + HUMAN-UAT do advogado (usuário) — mesma arquitetura de mitigação que o CONTEXT já desenhou, validada por esta pesquisa como suficiente |

## Sources

### Primary (HIGH confidence)
- `https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2022/lc_20220304_000000349.pdf` — texto oficial da LC 349/2022, baixado e extraído nesta sessão (21.913.456 bytes, `pdftotext -layout`, 18.250 linhas) — Art. 139/140 (unidades territoriais), 179-197 (parâmetros urbanísticos, incl. 186/190/196), 240-253 (OODC/TDC, incl. 242/244/246/252)
- `https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2024/lc_20240612_000000379.html` — verificado via WebFetch nesta sessão (confirma que não altera Art.196/242/252)
- `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_ModeloEspacial/MapServer/{31,33}/query` — point-in-polygon ao vivo, sem drift desde 2026-07-07
- `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_ModeloEspacial/MapServer/31?f=json` — `drawingInfo` cross-checado contra `18-UI-SPEC.md`, coincide exatamente
- `radar-goiania.html` (linhas 1330-1332 SVC/LOTSVC/BAISVC, 1340 `esc()`, 1351-2595 bloco `RADAR_PURE`, 1543 `scoreOportunidade`, 2336/2380 `DETECTOR_LIMITE`/`detectarSubutilizados`, 2636-2654 `jsonp`, 2939-2956 `toggleChoropleth`, 3405-3465 `TERRCACHE`/`fetchWhere*`) — lido diretamente nesta sessão
- `tests/territorio.test.mjs`, `tests/fixtures.mjs` — padrão de carregamento `vm.Script`/fixtures, lido diretamente
- CSP da própria `radar-goiania.html` (linha 7) — confirma `script-src` já libera `portalmapa.goiania.go.gov.br`

### Secondary (MEDIUM confidence)
- WebSearch "LC 358/2022 altera Lei Complementar 349/2022" — corrige a pesquisa anterior (LC 358 não relacionada ao PD)
- WebSearch "LC 371/373/2024 altera 349/2022" — confirma teor geral (vazios urbanos / regulamentação OODC), não o texto completo lido

### Tertiary (LOW confidence — já existente, não re-verificado nesta sessão)
- `.planning/research/v2.1/PLANO-DIRETOR.md` §2.5 (LC 363/364, datas de emendas) — herdado, não re-verificado nesta sessão (ver Assumptions Log A1)

## Metadata

**Confidence breakdown:**
- Gate de verdade (CA/altura AA/ADD/AAB/AOS): ALTA — leitura direta do artigo, cruzada com WebFetch de emenda recente
- GIS/endpoint/CSP: ALTA — verificado ao vivo nesta sessão, sem drift desde 2026-07-07
- Codebase (padrões de integração): ALTA — grep direto no arquivo fonte
- Staleness completa das emendas (LC 363/364/371/373): MÉDIA — não lidas por completo, só resumidas por WebSearch
- APAC/AEIS numéricos: BAIXA/não aplicável — não localizados, tratados como `conferido:false` por construção (seguro)

**Research date:** 2026-07-10
**Valid until:** 30 dias para a arquitetura/endpoint (estável, sem mudança de schema há semanas); indefinido para os números de CA já lidos diretamente da lei (só muda se houver NOVA emenda que altere Art. 196/242/252/186/190 — recomenda-se checar `goiania.go.gov.br/seplan/legislacao-2/` antes do release se a fase demorar mais de ~60 dias para ser implementada)
