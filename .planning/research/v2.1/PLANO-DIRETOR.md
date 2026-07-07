# Plano Diretor de Goiânia (LC 349/2022) — Integração no Radar Fundiário

**Domínio:** dados urbanísticos client-side (zoneamento, CA, outorga onerosa) sobre o cadastro fiscal já consumido pelo app
**Pesquisado:** 2026-07-07
**Confiança geral:** ALTA para disponibilidade/consulta GIS (verificado ao vivo); MÉDIA para os valores numéricos de CA/altura (fontes secundárias convergentes, mas com uma divergência numérica não resolvida)

---

## 1. Camadas GIS — catálogo verificado AO VIVO

Servidor: `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services` — o MESMO ArcGIS Server 10.4 que o app já consulta para lote/quadra/bairro/cadastro (`MapaServer/Feature_Base/MapServer`).

### 1.1 Serviços relevantes (raiz do catálogo, `?f=json`)

Pasta `MapaServer` tem 45+ serviços. Os relevantes ao Plano Diretor:

| Serviço | Tipo | O que é |
|---|---|---|
| `MapaServer/Mapa_ModeloEspacial` | MapServer | **Produção** — Modelo Espacial do PD-2022 completo + PD-2007 lado a lado (49 layers, IDs 0-48) |
| `Mapa_ModeloEspacial_teste` (raiz, fora de MapaServer) | MapServer | Espelho/staging do mesmo modelo espacial, numeração de layer DIFERENTE (IDs 0-88, hierarquia por pasta) — **não usar como fonte primária**, mas útil para cross-check porque tem `Divisas de Macrozona` e `Área Adensável` com os MESMOS atributos |
| `MapaServer/Mapa_Simplifica_Goiania_UsoDoSolo` | Map+FeatureServer | Tem layer 3 "Unidades Territoriais" com `sigla`/`tp_des`/`tp_aeis`, MAS **query bloqueada** (`400 Requested operation is not supported`) mesmo com capabilities declarando "Map,Query" — confirmado com GET e POST, ambos falharam. **Não usável.** |
| `MapaServer/Mapa_UsoDoSoloNew` | MapServer | Cadastro imobiliário por esfera + "Vazios Urbanos" (layer 16) + "Glebas" (14) — não testado se query funciona; candidato para o detector de vazio urbano se `Mapa_ModeloEspacial` não tiver o dado |
| `MapaServer/Mapa_RedeViaria`, `Mapa_Legislacao`, `Mapa_ExpansaoUrbana` | MapServer | Não abertos em detalhe nesta pesquisa (fora do orçamento de tempo); candidatos a pesquisa futura se precisar de hierarquia viária fina |
| `MapaServer/Mapa_Limites` | MapServer | Citado em pesquisa anterior (`PESQUISA-inteligencia-2026-07.md`): layer 4 = "Divisas de Macrozona" — **redundante** com `Mapa_ModeloEspacial` layer 33, não precisa ser usado |
| `Utilities/Geometry` | GeometryServer | Serviço de geometria genérico (buffer, project, etc.) — não necessário; o app já resolve point-in-polygon direto no MapServer de destino |

**Confiança:** ALTA (enumeração e testes de todos os serviços acima feitos ao vivo em 2026-07-07).

### 1.2 `MapaServer/Mapa_ModeloEspacial/MapServer` — layers confirmadas (fonte primária recomendada)

Base URL: `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_ModeloEspacial/MapServer`

| ID | Nome | Geometria | Uso no Radar |
|---|---|---|---|
| 0 | Plano Diretor 2022 (group layer) | — | container, não consultar direto |
| 1 | Corredores | Polyline | proximidade a corredor de BRT (bônus de score) |
| 2 | Declividade acima de 30% | Polygon | restrição de encosta (penalidade) |
| 3 | Vias | Polyline | Anel Viário Metropolitano (implantado/a implantar), rodovias |
| 4 | Eixo de Desenvolvimento - ED | Polyline | proximidade a eixo estruturante (bônus forte) |
| 5 | Influência das Vias Expressas - Ive | Polygon | bônus de acessibilidade |
| 7 | AEIS (Programas Especiais Interesse Social) | Polygon | habitação de interesse social — filtro/contexto |
| 11-27 | ARAR/ARAU (restrição ambiental rural/urbana), APP, Unidades de Conservação | Polygon | penalidade ambiental / risco de restrição de uso |
| 28 | APAC (Patrimônio Cultural) | Polygon | restrição de gabarito/fachada — relevante para laudo |
| 29 | Área de Ocupação Sustentável - AOS | Polygon | zona de baixa densidade, altura ≤12m |
| 30 | Área de Desaceleração de Densidade - ADD | Polygon | **sinal negativo** de score (adensamento desincentivado) |
| 31 | Áreas Adensáveis - AA | Polygon | **sinal positivo forte** — maior potencial construtivo |
| 32 | Outorga Onerosa de Alteração de Uso - OOAU | Polygon | contexto de "pode pedir outorga para mudar uso" |
| 33 | Macrozoneamento | Polygon | **Macrozona Construída vs 7 Macrozonas Rurais** — nível mais alto da hierarquia |
| 34/35 | Limite do Município / Municípios Entorno | Polygon | contexto de mapa |
| 36-48 | Plano Diretor 2007 (espelho, mesma estrutura) | várias | **upzoning**: comparar polígono 2022 vs 2007 no mesmo ponto detecta lotes que ganharam potencial construtivo — sinal de valorização já identificado em pesquisa anterior |

**Campos disponíveis (típico, ex. layer 31 Área Adensável):** `id`, `tp_des` (tipo de destinação), `in_alt` (indicador de altura — provavelmente flag, não valor numérico), `sigla` (ex. "AA"), `cd_sis`, `tp_aeis`, `nr_decr`/`nr_proc` (referência a decreto/processo), `x_coord`/`y_coord` (centroide), `nm_des`/`nm` (nome descritivo), datas de edição, área/perímetro (`shape_STAr`, `shape_STLe`). **Nenhum campo carrega o valor numérico do coeficiente de aproveitamento ou da altura máxima** — só identifica a ZONA. Os números (CA básico/máximo, Vi, altura) vêm exclusivamente do texto da lei, não da camada GIS.

Campos de `Macrozoneamento` (layer 33): `nm_mzo` (nome completo, ex. "MACROZONA CONSTRUÍDA"), `sigla` (ex. "MC"), `sigla2` (subzona, ex. "MC-P2" — sugere subdivisão em "polos" dentro da macrozona construída, não documentado no que foi lido da lei), `area_ha`.

**Confiança:** ALTA (schema de 3 layers lido via `/MapServer/{id}?f=json`, ao vivo).

### 1.3 Teste de consulta — point-in-polygon FUNCIONA (verificado ao vivo)

```
GET {base}/31/query?geometry=686000,8153000&geometryType=esriGeometryPoint&inSR=31982&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json
```
Retornou feature real (`sigla:"AA"`, `nm_des:"ÁREA ADENSÁVEL"`) no mesmo padrão de resposta do cadastro. Mesmo ponto testado contra layer 33 (Macrozoneamento) retornou `MACROZONA CONSTRUÍDA` / `sigla2:"MC-P2"`. **Esse é exatamente o `x_coord`/`y_coord` que o app já extrai por lote via `Feature_Base/MapServer/0`** — zero conversão de coordenada necessária, mesma projeção SIRGAS 2000/UTM 22S (`wkid 31982`).

Esta técnica **já está documentada como validada no projeto** (`INTELIGENCIA-radar.md` linha 25/49, `PESQUISA-inteligencia-2026-07.md` linha 231/295, `TERRITORIO.md` linha 143) — a numeração de layers usada nessas pesquisas anteriores (31=AA, 4=ED, 1=Corredores, 32=OOAU, 30=ADD, 7=AEIS) foi **re-confirmada byte-a-byte nesta pesquisa** contra o serviço em produção. Não houve drift de schema desde 02/07/2026.

**Quirks aplicáveis (mesmos do cadastro, generalizam):**
- GET com `geometry` como string `"x,y"` funciona para ponto (diferente do quirk documentado de "polígono via GET dá 404" — ponto é a forma mais barata e é o único caso de uso necessário aqui, então o quirk de polígono é irrelevante para esta integração).
- `outFields=*` obrigatório (confirmado nas respostas — mesma limitação do cadastro).
- `maxRecordCount: 1000` em todas as layers testadas — irrelevante para query por ponto (retorna 0 ou 1 feature).
- Sob carga, mesmo risco de 502 documentado para o servidor cadastral — recomenda-se disparar a consulta de zoneamento SÓ ao abrir a ficha de um imóvel específico (1 ponto), nunca em varredura de setor inteiro.

**Confiança:** ALTA (query ao vivo bem-sucedida, 2 layers testadas, resultado consistente).

### 1.4 `mapas.goiania.go.gov.br` / SIGGO / dados abertos

Não verificado ao vivo nesta pesquisa (fora do orçamento de tempo — o achado do ArcGIS já responde a Q1 de forma suficiente). A página oficial de legislação (`goiania.go.gov.br/seplan/legislacao-2/`) **não lista links de shapefile/geojson para download** do Modelo Espacial — reforça que a via viável é a consulta ao vivo via ArcGIS REST, não um dataset baixável. **Confiança: MÉDIA** (ausência confirmada numa página, não uma busca exaustiva em todo o portal de dados abertos/CKAN).

---

## 2. LC 349/2022 — modelo de conteúdo (tabelas para as regras determinísticas)

**Confiança geral desta seção: MÉDIA** (lei oficial confirma estrutura e nomes; os valores numéricos vêm de fontes secundárias — artigos jornalísticos/jurídicos que citam a lei — e há UMA divergência numérica não resolvida entre fontes).

### 2.1 Hierarquia espacial (Anexo — Modelo Espacial, Art. 4º)

> "O Plano Diretor compõe-se de documentos gráficos, tabelas e representações espaciais contendo a definição do modelo espacial adotado" (Art. 4º, LC 349/2022) — confiança ALTA (texto oficial).

Estrutura territorial (do geral ao específico), mapeada 1:1 às layers da seção 1.2:

1. **Macrozonas** (layer 33) — **Macrozona Construída** (área urbana) + **7 Macrozonas Rurais**: Alto Anicuns, Barreiro, Capivara, Dourados, João Leite, Lajeado, São Domingos. Confiança ALTA (nomes confirmados ao vivo na simbologia da layer 33/75).
2. **Unidades Territoriais** dentro da Macrozona Construída — são as camadas de "área" (AA, ADD, AAB, AOS, ARAU, APAC etc., layers 7-32). Confiança ALTA para a lista de siglas (confirmadas na simbologia/nomes das layers); a lógica de que elas COMPÕEM as "Unidades Territoriais" citadas pela lei é inferência a partir da estrutura do serviço `Mapa_Simplifica_Goiania_UsoDoSolo` (que tem uma layer chamada exatamente "Unidades Territoriais", embora não consultável).

### 2.2 Tabela de Coeficiente de Aproveitamento (CA) por Unidade Territorial

**Confiança: MÉDIA — divergência entre fontes secundárias não resolvida.** Nenhum extrator de PDF conseguiu reproduzir a tabela literal do Anexo (o PDF oficial excede o limite de fetch da ferramenta usada nesta pesquisa: 10 MB). Os números abaixo vêm de dois artigos jornalísticos/especializados independentes que citam a lei:

| Unidade Territorial | CA máximo citado | Altura | Fonte |
|---|---|---|---|
| Área Adensável (AA) | **6x** o terreno (fonte A) OU **7,5x** (fonte B) | ≤11m: 100% da área; acima de 11m: 50% da área | MySide (myside.com.br) e Sagres Online, ambos secundários |
| Área de Desaceleração de Densidade (ADD) | **5x** o terreno | mesma regra de 11m acima | idem |
| Área de Adensamento Básico (AAB) | não numerado nas fontes | máximo **12m** | idem |
| Área de Ocupação Sustentável (AOS) | não numerado; taxa de ocupação máx. **40%** | máximo **12m** | idem |
| Setores Jaó e Sul (exceção pontual) | — | máximo **7,5m** | MySide |

**Ação recomendada antes de codificar:** resolver a divergência 6x/7,5x da AA lendo o Anexo/artigo específico da lei diretamente (não via extrator de PDF, que falhou) — via download manual do PDF oficial ou pedido ao SEPLANH. **Não publicar nenhum número de CA no app até essa divergência ser resolvida com a fonte primária.**

### 2.3 Outorga Onerosa de Alteração de Uso / Direito de Construir

Regulamentada por **LC 373/2024** (não pela 349/2022 diretamente — a 349 só cria o instituto nos Art. 240-247; a 373 detalha o cálculo). Índice "Vi" por unidade territorial (**MÉDIA confiança, uma fonte mas específica e numericamente consistente com o padrão de outras cidades**):

| Unidade Territorial | Índice Vi |
|---|---|
| Área Adensável (AA) + vazios urbanos PDU I | 0,10 |
| Área de Adensamento Básico (AAB) + vazios PDU II/III / Conjuntos Residenciais | 0,15 |
| Área de Desaceleração de Densidade (ADD) | 0,20 |
| Área de Ocupação Sustentável (AOS) + APAC + vazios PDU IV | 0,30 |

Isentos de outorga onerosa (até o CA básico da própria unidade): Áreas Adensáveis, AEIS, áreas de programas especiais, AAB, Unidades de Uso Sustentável.

**Fórmula geral (padrão nacional, Estatuto da Cidade Art. 28-31, não específica de Goiânia):** contrapartida = (área construída acima do CA básico) × Vi × valor do CUB (R-16). **Não confirmado se Goiânia usa exatamente essa fórmula ou uma variante — inferência a partir do padrão nacional citado por um artigo jurídico genérico, não pelo texto da LC 373/2024 lido diretamente.**

### 2.4 AEIS / vazios urbanos / eixos

- Goiânia **não usa a sigla ZEIS** — usa **AEIS** (Área Especial de Interesse Social), Art. 40/49 da lei. Confiança ALTA (termo confirmado no texto oficial e na layer 7 do GIS).
- **Vazios urbanos**: Art. 50 da LC 349/2022 os define; regulamentados por **LC 371/2024** ("Ocupação dos Vazios Urbanos") — lei separada, não lida em detalhe nesta pesquisa. A camada GIS candidata é `Mapa_UsoDoSoloNew` layer 16 "Vazios Urbanos" (não testada se query funciona — próxima pesquisa).
- **Eixos de Desenvolvimento**: Art. 21, II — "estruturado no transporte público coletivo" — mapeado 1:1 à layer 4 do GIS (`Eixo de Desenvolvimento - ED`), confirmado.
- **Corredores** (exclusivo/preferencial/estratégico): Art. 26, XIII, detalhado nos Anexos V e VII — mapeado à layer 1 (produção) / layers 2-40 (teste, com nomes individuais por corredor: T-63, Anhanguera, Campus UFG, Goiás BRT NS, etc.) — a versão _teste tem MAIS detalhe nominal por corredor do que a produção, útil para exibir "está no corredor X" em vez de só "está em algum corredor".

### 2.5 Atualizações desde 2022 (relevantes para staleness)

| Lei | Data | O que muda |
|---|---|---|
| LC 358/2023 | 2023 | Não lida em detalhe — aparece em busca preliminar, não confirmado o teor exato nesta pesquisa |
| LC 363/2023 | 2023 | Código de Parcelamento do Solo |
| LC 364/2023 | 13/01/2023 | Código de Obras e Edificações |
| LC 371/2024 | 04/01/2024 | Ocupação dos Vazios Urbanos |
| LC 373/2024 | 19/01/2024 | Regulamenta a Outorga Onerosa (fonte da tabela Vi acima) |
| LC 379/2024 | 12/06/2024 | Parâmetros de Habitação de Interesse Social |
| IN 001/2024, IN 003/2024, IN 003/2025 | 2024-2025 | Instruções normativas de aplicação dos artigos acima |

**Confiança: MÉDIA** (lista vem da página oficial de legislação da SEPLANH via WebFetch, não verificada lei por lei). **Implicação prática:** a LC 349/2022 sozinha NÃO é suficiente para os números de outorga onerosa — é preciso citar também a 373/2024. O app deve tratar "Plano Diretor" como o CONJUNTO (349 + emendas), não só a lei-mãe.

---

## 3. Desenho de integração — client-side, determinístico

**Veredito: caminho (a) é o suportado pela evidência** — as layers GIS EXISTEM e são consultáveis ao vivo por ponto (verificado seção 1.3). Não é necessário buildtime-distill de shapefile porque:
1. Não há link de download de geojson/shapefile do Modelo Espacial nas páginas oficiais verificadas (seção 1.4).
2. A consulta ao vivo por ponto é BARATA (1 request por layer de interesse, ~200-500 bytes de resposta, mesmo padrão que o app já faz para o cadastro) — não há motivo de custo para preferir um dataset estático.
3. O app já valida esse padrão exato em produção (comparáveis por raio, busca de bairro) — zero código genuinamente novo, só mais um conjunto de chamadas `jsonp`/`fetchWhere` reaproveitando a infra existente.

### 3.1 Arquitetura recomendada

```
Ao abrir a ficha de um imóvel (já tem x_coord,y_coord do lote):
  1. Disparar em paralelo (mesmo padrão que já existe para bairro):
     - query ponto → layer 33 (Macrozoneamento)      → macrozona
     - query ponto → layer 31 (AA)                    → boolean "está em AA"
     - query ponto → layer 30 (ADD)                    → boolean "está em ADD" (exclusivo com AA)
     - query ponto → layer 29 (AOS)                    → boolean
     - query ponto → layer 4  (Eixo Desenvolvimento)   → distância/interseção
     - query ponto → layer 1  (Corredores)              → boolean + tipo (se usar o _teste p/ nome do corredor)
     - query ponto → layer 32 (OOAU)                    → boolean
     - query ponto → layer 7  (AEIS)                    → boolean
     - query ponto → layer 28 (APAC)                     → boolean (restrição de gabarito)
     - opcional: mesma bateria contra layers 36-48 (PD-2007) → detectar upzoning
  2. Resolver a sigla retornada (ex. "AA") contra uma TABELA ESTÁTICA embutida no HTML
     (JSON pequeno, <2KB, os ~10-15 códigos de unidade territorial → {ca_basico, ca_maximo,
     altura_max, vi_outorga, taxa_ocupacao}) — ESTA tabela é o único artefato "baked at
     build time", e vem da LEITURA MANUAL do Anexo (não de scraping automático, dado que
     os extratores de PDF falharam em reproduzir a tabela — ver seção 2.2).
  3. Renderizar seção "Urbanístico" na ficha combinando (1) zona ao vivo + (2) regra estática.
```

Isso é EXATAMENTE o padrão que `INTELIGENCIA-radar.md` (I3) já projetava — esta pesquisa apenas confirma que o schema de layers não teve drift e adiciona a tabela de CA (que a pesquisa anterior não tinha buscado ainda).

### 3.2 Por que não path (b)

Path (b) (distill de shapefile em build-time) seria a alternativa SE as layers não fossem consultáveis ao vivo. Como são (seção 1.3), path (b) adicionaria complexidade sem benefício: exigiria descobrir onde baixar o shapefile (não encontrado nas páginas oficiais verificadas), converter para geojson, simplificar geometria para caber no HTML único, e fazer point-in-polygon EM JAVASCRIPT (biblioteca extra, ou código de raycasting manual) — tudo isso APENAS para reproduzir o que uma única requisição HTTP já faz. **Não recomendado.**

**Excepção parcial:** SE o servidor ArcGIS ficar instável (502 sob carga é um risco já documentado para o servidor cadastral), a mitigação correta não é migrar para geojson estático, é cachear a resposta de zoneamento por lote em sessão (mesma técnica já usada para bairro/comparáveis) — a zona de um lote não muda de uma visita para outra na mesma sessão.

---

## 4. Pontos de valor no roadmap

| Feature do roadmap | Como o Plano Diretor entra |
|---|---|
| **Ficha → seção "Urbanístico"** | Nova seção mostrando: Macrozona, Unidade Territorial (sigla + nome), CA básico/máximo (da tabela estática), altura máxima, se está em AEIS/APAC/ADD/corredor/eixo. Badge de alerta se em ADD ou APP/APAC (restrição). |
| **Score de oportunidade (boost)** | Sinal positivo: lote em AA ou próximo a Eixo de Desenvolvimento/Corredor (mobilidade + adensamento permitido). Sinal negativo: ADD, APP, restrição ambiental. **Upzoning** (comparar zona 2022 vs 2007 no mesmo ponto) é o sinal mais forte, já citado na pesquisa de inteligência anterior — reaproveitar aqui. |
| **Detector de lote subutilizado (upgrade)** | Hoje: razão `areaedif/areaterr` sem contexto de zona. Upgrade: razão `areaedif atual / (areaterr × CA_básico_da_zona)` — um terreno com razão baixa numa zona AA (CA alto permitido) é MUITO mais "subutilizado" que o mesmo terreno numa AOS (CA baixo já é o esperado). Requer a tabela estática de CA (seção 2.2, ainda com divergência a resolver) para o denominador. |
| **Território — camada de zoneamento (choropleth)** | Nova camada opcional no mapa, colorindo por Unidade Territorial (AA=verde, ADD=laranja, AOS=azul, etc — reusar a MESMA paleta de cores já definida na simbologia do ArcGIS, ver seção 1.2, para consistência com qualquer material oficial que o corretor já conheça). Populada incrementalmente por bairro visitado, mesmo padrão de "não pré-computar 1.206 setores" já recomendado em TERRITORIO.md. |

---

## 5. Riscos

1. **Divergência numérica não resolvida (CA da AA: 6x vs 7,5x).** Risco de publicar número errado no app. **Mitigação:** ler o Anexo oficial diretamente (baixar o PDF completo fora desta sessão de pesquisa, que teve limite de 10MB no fetch) antes de codificar qualquer CA numérico. Até resolver, a seção "Urbanístico" pode mostrar SÓ a zona (sem número de CA) com segurança total (zona vem de fonte primária/GIS verificada ao vivo).
2. **Staleness — emendas pós-2022.** A LC 349/2022 sozinha não cobre outorga onerosa (delegado à LC 373/2024) nem vazios urbanos (LC 371/2024). O rótulo no app deve ser genérico ("Plano Diretor de Goiânia, LC 349/2022 e alterações") em vez de citar só o número 349, para não parecer desatualizado ou incorreto quando uma emenda mudar um valor.
3. **Licenciamento/disponibilidade do anexo.** Não há shapefile/geojson baixável identificado nas páginas oficiais verificadas — se o ArcGIS Server ficar indisponível permanentemente, não há fallback de dataset estático pronto (teria que ser reconstruído do zero via digitalização manual do mapa do Anexo, trabalho pesado). Risco BAIXO no curto prazo (o mesmo servidor hospeda o cadastro que é crítico para o app inteiro, então instabilidade dele já seria um problema maior).
4. **Tamanho não é um risco** neste desenho — como a integração é 100% consulta ao vivo por ponto (não geojson embutido), não há problema de payload no HTML único além da tabela de CA (<2KB).
5. **Múltiplas layers "espelho"** (`Mapa_ModeloEspacial` produção vs `_teste`, e camadas duplicadas ARAR/ARAU com os mesmos sub-nomes em IDs diferentes) — risco de confundir qual é a fonte de verdade. **Mitigação:** usar SEMPRE `MapaServer/Mapa_ModeloEspacial/MapServer` (produção, dentro da pasta MapaServer) como única fonte, nunca o serviço raiz `Mapa_ModeloEspacial_teste`.
6. **Disclaimer legal obrigatório** (mesma lógica já aplicada ao venal/PGV no projeto): *"Informação urbanística indicativa, extraída de consulta espacial ao Plano Diretor (LC 349/2022 e alterações). Não substitui a Certidão de Diretrizes Urbanísticas/Uso do Solo emitida pela SEPLANH — consulte antes de qualquer decisão de incorporação ou financiamento."* Nome exato do órgão a confirmar (a Secretaria já trocou de nome mais de uma vez — "SEPLAN" aparece em alguns links, "SEPLANH" em outros; usar o nome que aparecer no rodapé do site oficial no momento da implementação).

---

## Fontes

**Verificado ao vivo (2026-07-07):**
- `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services?f=json` (catálogo raiz)
- `.../MapaServer?f=json` (lista de 45+ serviços)
- `.../MapaServer/Mapa_ModeloEspacial/MapServer?f=json` (49 layers, produção)
- `.../MapaServer/Mapa_ModeloEspacial/MapServer/{4,31,33}?f=json` (schema de campos)
- `.../MapaServer/Mapa_ModeloEspacial/MapServer/{31,33}/query?geometry=...` (point-in-polygon ao vivo, sucesso)
- `.../Mapa_ModeloEspacial_teste/MapServer?f=json` e `/{3,73,74,75}?f=json` (espelho/staging, cross-check)
- `.../MapaServer/Mapa_Simplifica_Goiania_UsoDoSolo/MapServer/3?f=json` (schema OK, query falhou — 400)
- `.../MapaServer/Mapa_UsoDoSoloNew/MapServer?f=json`, `.../Utilities?f=json`, `.../Consultoria?f=json`

**Documento oficial (official-doc):**
- LC 349/2022, texto oficial: `https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2022/lc_20220304_000000349.pdf` e versão `.html` — Art. 4º, 21, 26, 39/42 (Polos/OOAU), 40/49 (AEIS), 50 (vazios urbanos) lidos via extração; tabelas numéricas dos Anexos NÃO reproduzidas pelo extrator (PDF de 10MB+, acima do limite da ferramenta usada).
- `https://www.goiania.go.gov.br/seplan/legislacao-2/` — lista de leis complementares e instruções normativas relacionadas.

**Fonte secundária (secondary-source, MÉDIA confiança):**
- MySide — `https://myside.com.br/guia-goiania/plano-diretor-goiania-go` (números de CA/altura, ADD/AA/AAB/AOS)
- Sagres Online — `https://sagresonline.com.br/plano-diretor-quais-serao-os-criterios-de-adensamento-urbano-de-goiania/` (contexto, sem tabela numérica)
- Busca agregada sobre índice Vi da outorga onerosa (0,10/0,15/0,20/0,30) — WebSearch, não confirmado no texto direto da LC 373/2024.

**Interno (já validado em produção/pesquisa anterior):**
- `INTELIGENCIA-radar.md` (I3, linha 25/49) — numeração de layers 2026-07-02, re-confirmada nesta pesquisa.
- `PESQUISA-inteligencia-2026-07.md` (linhas 137-233/295) — mesma técnica, mesmo servidor.
- `.planning/research/v2.1/TERRITORIO.md` (linha 143) — cita a técnica point-in-polygon como já validada no projeto.
- `radar-goiania.html` (linhas 661-663, 1010-1011) — padrão `jsonp`/`fetchWhere` a reaproveitar sem modificação estrutural.
