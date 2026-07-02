# Pesquisa de inteligência imobiliária — 10 frentes paralelas (02/07/2026)

> Material bruto dos 10 pesquisadores. Síntese curada em `INTELIGENCIA-radar.md`.

---

## historico-precos (viabilidade: alta)

Existem três fontes públicas e gratuitas verificadas com histórico de preços imobiliários cobrindo Goiânia, todas em nível cidade (nenhuma pública tem granularidade por bairro): (1) FipeZap — planilha Excel oficial com aba "Goiânia", série mensal de dez/2013 a jun/2026, venda e locação, índice + variação + preço médio do m² por número de dormitórios, mas o servidor da Fipe não envia header CORS; (2) IGMI-R/ABECIP — Excel gratuito sem cadastro com coluna Goiânia desde jan/2014 (baseado em laudos de avaliação de financiamentos, não em anúncios), e o servidor da ABECIP ENVIA Access-Control-Allow-Origin: *; (3) IVG-R e MVG-R do Banco Central — apenas agregado nacional, porém via API JSON com CORS liberado, ideal para deflacionar/contextualizar. Secovi-GO e DataZap publicam estudos com recorte por bairro de Goiânia, mas só em PDF/imprensa, sem dataset estruturado. A viabilidade client-side é alta combinando a API do BCB (fetch direto) com snapshots estáticos das planilhas FipeZap/IGMI-R embutidos no app.

### FipeZap (Fipe + ZAP/OLX) — melhor série de preços para Goiânia

Planilha Excel oficial com TODAS as cidades, verificada por download: contém aba 'Goiânia' com série mensal de dez/2013 (índice=100) até jun/2026 (índice 229,7 — ou seja, +129,7% nominal no período). Colunas: número-índice, variação mensal e preço médio do m² (R$/m²), tanto Total quanto por dormitórios (1D a 4D), para VENDA e LOCAÇÃO. Arquivo: ~4,8 MB, atualizado mensalmente (last-modified 01/07/2026, cache 48h). Granularidade: apenas cidade — dados por bairro existem internamente (DataZap) mas NÃO são públicos. Limitação técnica verificada: downloads.fipe.org.br NÃO envia header Access-Control-Allow-Origin, então fetch() direto do navegador é bloqueado por CORS — precisa baixar manualmente/via script e embutir como arquivo estático (JSON pré-processado) no app. Informes mensais em PDF também são públicos (padrão fipezap-AAAAMM-residencial-venda.pdf).

**Fonte:** https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx (página: https://www.fipe.org.br/pt-br/indices/fipezap/)

### IGMI-R ABECIP/FGV — série Goiânia baseada em laudos de avaliação (com CORS!)

Índice calculado pelo FGV-IBRE a partir de laudos de avaliação de imóveis financiados (transações reais, não anúncios — complementar ao FipeZap). Excel verificado por download (63 KB, sem cadastro): colunas por capital incluindo GOIÂNIA, mensal de jan/2014 a mai/2026, mais agregado Brasil e var% 12 meses. Em dez/2025 Goiânia acumulava +11,83% em 12 meses. Granularidade: apenas capital (10 capitais). Surpresa técnica verificada: o servidor da ABECIP responde com Access-Control-Allow-Origin: * (via redirect 302), ou seja, em princípio dá para buscar direto do navegador — mas a URL muda a cada mês (ex.: download?file=igmi-r-serie-historica-maio2026.xlsx), o que exige descobrir o nome do arquivo do mês ou manter fallback estático. Parsear xlsx no browser exige lib tipo SheetJS embutida.

**Fonte:** https://www.abecip.org.br/download?file=igmi-r-serie-historica-maio2026.xlsx (página: https://www.abecip.org.br/igmi-r-abecip/serie-historica)

### IVG-R e MVG-R (Banco Central) — só nacional, mas API perfeita para client-side

IVG-R (série SGS 21340, mensal desde mar/2001): tendência de longo prazo dos valores de avaliação de imóveis residenciais financiados, calculada com dados do SCR nas regiões metropolitanas do IPCA (Goiânia entra no cômputo, mas o BCB publica APENAS o agregado nacional — verificado no portal de dados abertos: não existem séries regionais públicas). MVG-R (série SGS 25419): mediana nacional dos valores de garantia em R$ (abr/2026: R$ 270.000) — testada e funcionando. Acesso: API REST JSON gratuita, sem chave: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json — header Access-Control-Allow-Origin: * VERIFICADO, funciona com fetch() direto do navegador. Mesma API serve IPCA (série 433) e INPC (188) para deflacionar valores nominais (ex.: comparar vllanc98 com valor venal atual em termos reais). Licença ODbL.

**Fonte:** https://dadosabertos.bcb.gov.br/dataset/21340-indice-de-valores-de-garantia-de-imoveis-residenciais-financiados-ivg-r e https://api.bcb.gov.br/dados/serie/bcdata.sgs.21340/dados?formato=json

### Secovi-GO / Portal 62 Imóveis — único com recorte por bairro, mas sem dataset

O Secovi Goiás (portalsecovi.com.br) publica, em parceria com o Portal 62 Imóveis, estudos anuais/trimestrais de revenda e locação de Goiânia e região metropolitana: VGV, estoque, e preço do m² em ~20 bairros que concentram 80% da oferta de apartamentos (ex.: Setor Marista ~R$ 10.949/m², eixo Marista-Bueno-Jardim Goiás no topo; média da cidade R$ 8.166/m² em mar/2026). Limitação: divulgação apenas via releases de imprensa e apresentações — NÃO há série histórica estruturada, CSV, API ou página de downloads pública verificável (o site secovigoias.com.br está com certificado SSL expirado). Uso viável: transcrever manualmente os números por bairro dos releases anuais como tabela estática de referência no app, citando a fonte.

**Fonte:** https://www.portalsecovi.com.br/ ; exemplo de release: https://fecomercio-go.portaldocomercio.org.br/acoes-institucionais/secovi-e-62-imoveis-apresentam-diagnostico-anual-de-revenda-e-aluguel-de-imoveis-em-goias/

### DataZap (Grupo OLX) — relatórios gratuitos em PDF, dados por bairro só pagos

DataZap é o braço de inteligência do Grupo OLX (ZAP, VivaReal, OLX) e é quem fornece os dados brutos do FipeZap. Publica gratuitamente: DataZap Reports (mensais, PDF), Anuário DataZAP e o ILI (Índice de Lançamentos Imobiliários, trimestral) em datazap.com.br — nível cidade/nacional. Dados por bairro/anúncio de Goiânia existem mas são produto comercial (consultoria/API paga). Alternativa não-oficial com bairro: o MyIndex da MySide (myside.com.br/guia-goiania) mostra m² por bairro de Goiânia em página web (R$ 8.226/m² médio), porém é conteúdo proprietário sem API — scraping violaria ToS; serve apenas como benchmark manual.

**Fonte:** https://www.datazap.com.br/ e https://myside.com.br/guia-goiania/valor-metro-quadrado-goiania-myindex

### Fonte interna já disponível: vllanc98 + valor venal do próprio cadastro

Nenhuma fonte externa pública dá histórico POR BAIRRO de Goiânia — mas a própria camada ArcGIS do app tem um par temporal por lote: vllanc98 (valor lançado 1998) vs valor venal atual, mais datas dtinclusao/dtultalter/dtrecadast. Agregando por bairro/quadra (mediana do valor venal por m², razão venal-atual/vllanc98 deflacionada pelo IPCA da API do BCB), o app gera seu próprio mapa de valorização relativa por localidade com ~570 mil pontos — granularidade que nenhum índice público oferece. Limitação honesta: valor venal é base fiscal (defasada do mercado), então serve para RANKING relativo de localidades e detecção de outliers/comparáveis, não para precificar em R$ de mercado — para calibrar o nível de mercado usam-se FipeZap/IGMI-R (cidade) e a tabela Secovi por bairro.

**Fonte:** Camada de Cadastro Imobiliário ArcGIS da Prefeitura de Goiânia (dataset do próprio app) + https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json (IPCA)

**Recomendação:** Arquitetura em três camadas, toda compatível com client-side puro: (1) EM TEMPO REAL via fetch() direto do navegador — API do BCB (CORS * verificado): IVG-R 21340, MVG-R 25419 e IPCA 433 para contextualizar ciclo nacional e deflacionar valores (inclusive transformar vllanc98→hoje em termos reais); (2) SNAPSHOT ESTÁTICO mensal — um script simples (ou atualização manual) baixa fipezap-serieshistoricas.xlsx (sem CORS, não dá fetch direto) e a série IGMI-R da ABECIP, extrai só as colunas de Goiânia e salva um goiania-indices.json (~5 KB) versionado junto do HTML; com ele o app plota histórico de valorização dez/2013–hoje (venda e locação, R$/m² por dormitórios) e projeta 'quanto valia este imóvel em 20XX' aplicando o índice retroativamente ao valor atual; (3) INTELIGÊNCIA POR BAIRRO com dados internos — agregar o próprio cadastro (mediana de valor venal/m² por bairro/quadra + razão venal/vllanc98 deflacionada) para ranking de valorização relativa e margem de comparáveis da mesma localidade (percentis 25/50/75 do R$/m² venal entre lotes vizinhos de mesmo uso), calibrando o nível de mercado com o fator FipeZap-cidade e a tabela estática de ~20 bairros do Secovi-GO transcrita anualmente. Nada disso envolve dado pessoal (LGPD ok: são índices agregados e valores fiscais de lotes).

---

## itbi-goiania (viabilidade: baixa)

Goiânia NÃO publica dados de ITBI em nível de transação nem oferece consulta pública de "valor de referência" por inscrição imobiliária (ao contrário de São Paulo, Belo Horizonte, Rio e Porto Alegre). O portal de dados abertos municipal (CKAN, dadosabertos.goiania.go.gov.br) tem apenas ~29 datasets, nenhum fiscal — busca por "itbi" retorna zero resultados. A avaliação do ITBI só existe dentro de processo administrativo individual no sistema SISTI (laudo de avaliação com validade de 180 dias), inacessível de forma anônima e programática. Juridicamente, desde a LC 344/2021 a base de cálculo é o "valor de mercado" (nunca inferior ao valor venal), mas decisões judiciais em Goiânia aplicando o Tema 1113 do STJ vêm obrigando o município a aceitar o valor declarado na escritura, o que enfraquece a própria avaliação municipal como proxy. O único dado ITBI livremente acessível é a arrecadação agregada mensal/bimestral do município (SICONFI/Tesouro, API sem captcha), útil só como termômetro macro do mercado, sem granularidade por bairro.

### Portal de dados abertos de Goiânia não tem nenhum dataset de ITBI ou tributos

O portal oficial é um CKAN (dadosabertos.goiania.go.gov.br) com ~29 datasets, quase todos geoespaciais (Lotes, Quadras, Bairros, Logradouros, Setores Cadastrais) ou de saúde (Dengue, PSF). Busca por 'itbi' verificada em 02/07/2026: zero resultados. Também não há dataset de IPTU, valor venal ou arrecadação. Ou seja: não existe hoje fonte aberta de transações imobiliárias em Goiânia.

**Fonte:** https://dadosabertos.goiania.go.gov.br/dataset?q=itbi

### Não há consulta pública de valor de referência de ITBI (modelo São Paulo) em Goiânia

Em SP existe consulta anônima de 'valor de referência' por SQL do imóvel; em Goiânia não. O fluxo é processual: o contribuinte abre processo no sistema SISTI (itbi.goiania.go.gov.br), a SEFIN emite laudo de avaliação (validade de 180 dias para registro) e gera o DUAM. O valor avaliado só aparece dentro do processo do interessado — não há endpoint público consultável por inscrição, o que inviabiliza scraping/uso client-side.

**Fonte:** https://www.goiania.go.gov.br/sing_servicos/transmissao-de-imoveis/ e https://itbi.goiania.go.gov.br/sistemas/saces/asp/saces00000f0.asp?sigla=sisti

### Base legal: LC 344/2021 (novo Código Tributário de Goiânia) — ISTI virou ITBI, base = valor de mercado, piso = valor venal

A LC 344/2021 renomeou o ISTI para ITBI e definiu a base de cálculo como o valor pelo qual o bem seria negociado em condições normais de mercado, nunca inferior ao valor venal (art. 167). Alíquota de 2%. Regulamentação posterior via Decreto 5.623/2023. Consequência prática para o app: o campo valor venal do ArcGIS é o PISO legal do ITBI, ou seja, preço de mercado real ≥ valor venal — dá para usar o venal como limite inferior conservador de valor.

**Fonte:** https://files.cercomp.ufg.br/weby/up/1087/o/LC_N%C2%BA_344__DE_30_DE_SETEMBRO_DE_2021.pdf e https://www.legisweb.com.br/legislacao/?id=454189

### A avaliação municipal de ITBI está judicialmente contestada (Tema 1113 STJ aplicado em Goiânia)

Decisões de 2024 da Justiça de Goiás (inclusive mandado de segurança da Ademi-GO) proibiram o município de cobrar ITBI sobre valor superior ao declarado na escritura, seguindo o STJ (REsp 1.937.821, Tema 1113): o valor declarado pelo contribuinte tem presunção de veracidade. Implicação: mesmo que a avaliação da SEFIN fosse pública, ela seria um proxy enviesado/contestado de mercado, não o valor de transação real.

**Fonte:** https://www.rotajuridica.com.br/juiza-concede-seguranca-a-ademi-go-e-proibe-o-municipio-de-goiania-de-cobrar-itbi-com-base-em-valor-superior-ao-da-escritura/ e https://ccmtributaria.com.br/2024/09/25/itbi-deve-ser-calculado-com-base-no-valor-da-escritura-publica-do-imovel-decide-juiza-de-goiania/

### Único dado ITBI acessível: arrecadação agregada municipal via SICONFI (API gratuita, sem captcha)

A API de dados abertos do Tesouro (apidatalake.tesouro.gov.br/docs/siconfi/) fornece a receita de ITBI de Goiânia por bimestre (RREO) e mensal via Matriz de Saldos Contábeis, em JSON, sem autenticação. Serve como índice de aquecimento do mercado imobiliário da cidade (série histórica), mas é um número único municipal — sem abertura por bairro, inscrição ou transação. Viável embutir snapshot estático no app.

**Fonte:** https://www.tesourotransparente.gov.br/consultas/consultas-siconfi/siconfi-api-de-dados-abertos

### Fontes cartorárias nacionais não resolvem para Goiânia

O Portal Estatístico Registral (Registro de Imóveis do Brasil/ONR) publica séries de quantidade de compras e vendas registradas, mas apenas para capitais selecionadas (SP, RJ, Curitiba, Fortaleza etc.) — Goiânia não está na lista. O Mapa/Base Nacional de Transações Imobiliárias do ONR (cartórios goianos aderiram) não expõe valores de transação ao público, só contagens e serviços pagos (certidões, pesquisa de bens via SAEC).

**Fonte:** https://www.registrodeimoveis.org.br/portal-estatistico-registral e https://1rigo.com/cartorios-goianos-integram-a-base-nacional-de-transacoes-imobiliarias-com-informacoes-de-atos-praticados/

### Precedentes de outras capitais mostram que o dado existe e pode ser pedido via LAI

São Paulo publica mensalmente planilha com TODAS as transações com ITBI recolhido (endereço, SQL, valor declarado, valor de referência, natureza, data) desde 2019; BH e Rio publicam relatórios por logradouro/mês; Porto Alegre aprovou a Lei da Transparência Imobiliária (2023) obrigando divulgação. A SEFIN de Goiânia possui esses microdados no SISTI — um pedido via LAI (e-SIC municipal) por base anonimizada (bairro/quadra, tipo, área, valor, mês, sem nome/CPF) é LGPD-compatível e tem precedente forte nas outras capitais.

**Fonte:** https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501 e https://dados.pbh.gov.br/dataset/relatorio-itbi

**Recomendação:** Não construir a camada de inteligência dependendo de ITBI de Goiânia hoje — o dado transacional não é público nem consultável por inscrição. Plano concreto em 3 frentes: (1) CURTO PRAZO, dentro do app: usar o que já está no ArcGIS como proxy — valor venal atual vs vllanc98 (valorização implícita 1998→hoje por inscrição) e comparáveis de venal/m² dentro da mesma quadra/bairro, deixando explícito no UI que valor venal é o PISO legal do ITBI (LC 344/2021), logo o preço de mercado tende a ser ≥ venal; (2) MÉDIO PRAZO, sinal macro: baixar periodicamente a série de arrecadação de ITBI de Goiânia pela API SICONFI (JSON gratuito, sem captcha) e embutir como arquivo estático — gráfico de 'aquecimento do mercado' da cidade; (3) EM PARALELO, destravar o dado real: protocolar pedido via LAI no e-SIC de Goiânia solicitando a base mensal anonimizada de guias de ITBI pagas (bairro, quadra, tipo de imóvel, área, valor da transação, valor avaliado, mês), citando como precedente as publicações oficiais de São Paulo, BH, Rio e a Lei da Transparência Imobiliária de Porto Alegre — se deferido, esse arquivo estático vira a melhor fonte de comparáveis de mercado real do app, sem ferir a LGPD.

---

## dados-abertos-go (viabilidade: alta)

Existe caminho concreto e verificado para um score socioeconômico por bairro em Goiânia, 100% client-side: o Censo 2022 do IBGE publica renda média e mediana do responsável por domicílio em nível de setor censitário, e Goiânia tem 2.304 setores com esses dados (verificado por download do CSV oficial). Ponto crítico descoberto: o agregado "por bairros" do IBGE NÃO cobre Goiânia (zero linhas para o código 5208707 no arquivo nacional — a malha de bairros IBGE só existe onde há bairros legalmente delimitados), então é preciso agregar setor→bairro num preprocessamento offline usando o GeoJSON de bairros da Prefeitura (dados abertos, EPSG:31982 — o MESMO CRS UTM do cadastro imobiliário que o app já usa, dispensando reprojeção). O resultado é um JSON estático pequeno (bairro → renda mediana, domicílios, saneamento, alfabetização) embutido no app. IMB/BDE e SEPLAM só oferecem dados em nível municipal ou desatualizados (população por bairro de 2010), servindo apenas de contexto macro.

### IBGE Censo 2022 — Rendimento do Responsável por setor censitário (COBRE Goiânia, verificado)

CSV nacional zipado (~8,9 MB) com 6 variáveis por setor: V06001 responsáveis, V06002 moradores, V06003 variância moradores, V06004 renda média mensal do responsável (R$), V06005 variância da renda, V06006 renda MEDIANA mensal (R$) — significados confirmados no dicionário oficial. Filtrando CD_SETOR iniciado em 5208707 obtêm-se 2.304 setores de Goiânia (ex.: setor 520870705010001 → média R$ 4.863, mediana R$ 3.500). Arquivo atualizado em 08/05/2026. Download direto, sem autenticação. Uso: preprocessar e reduzir a um JSON de Goiânia (~100-200 KB).

**Fonte:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip (dicionário: dicionario_de_dados_renda_responsavel_20260508.xlsx no mesmo diretório)

### LIMITAÇÃO-CHAVE: agregados IBGE 'por bairro' NÃO cobrem Goiânia (verificado)

O IBGE publica agregados do Censo 2022 por bairro (Agregados_por_Bairro_csv/), mas apenas para municípios com bairros legalmente delimitados na malha IBGE. Baixei o CSV nacional de renda por bairros: ZERO linhas com prefixo 5208707 (Goiânia); as 32 linhas de GO são de outro município (5217401). Consequência: a agregação setor→bairro para Goiânia precisa ser feita por você, via spatial join com a malha de bairros da Prefeitura.

**Fonte:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/Agregados_por_bairros_renda_responsavel_BR_20260508_csv.zip

### Demais agregados Censo 2022 por setor (score composto: saneamento, alfabetização, demografia)

Mesmo diretório FTP tem, por setor censitário: basico (população/domicílios totais), alfabetizacao, caracteristicas_domicilio1/2/3 (abastecimento de água, esgotamento sanitário, coleta de lixo, banheiros), cor_ou_raca, demografia (pirâmide etária), obitos, parentesco. Todos em CSV nacional zipado, download aberto. Permitem enriquecer o score além de renda (ex.: % esgoto na rede, % alfabetização). Nota: o levantamento de 'Entorno' (pavimentação, arborização, iluminação por setor) do Censo 2010 não foi republicado para 2022 até agora.

**Fonte:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/

### Malha geográfica dos setores censitários 2022 com atributos (para o preprocessamento offline)

GeoPackage por UF: GO_setores_CD2022.gpkg com 97 MB (há também shapefile). Grande demais para o navegador — uso exclusivo no pipeline offline: extrair os 2.304 polígonos/centroides de Goiânia e fazer spatial join com os bairros. Dicionário da malha no diretório pai (Dicionario_de_dados_malha_agregados.xlsx).

**Fonte:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/setores/gpkg/UF/GO/GO_setores_CD2022.gpkg

### Bairros de Goiânia em GeoJSON — Portal de Dados Abertos da Prefeitura (verificado, funcional)

Dataset 'Bairros' com divisas georreferenciadas em CSV, JSON, KMZ e SHP, licença Creative Commons Atribuição. Baixei o bai.json: GeoJSON de 5,1 MB, FeatureCollection em EPSG:31982 (SIRGAS 2000 / UTM 22S) — exatamente o CRS das coordenadas UTM do cadastro imobiliário que o app já consome, ou seja, point-in-polygon direto sem reprojeção. Limitação: última atualização em 18/09/2018 (divisas de bairros mudam pouco; bairros novos pós-2018 podem faltar). Para uso no app, simplificar geometria (mapshaper) para ~500 KB-1 MB.

**Fonte:** https://dadosabertos.goiania.go.gov.br/mk/dataset/bairros (download: http://www4.goiania.go.gov.br/daber/dadosabertos/sedetec/geoespaciais/bai.json)

### ArcGIS REST da Prefeitura (portalmapa) — camadas de limites e uso do solo queryáveis client-side

Mesmo ecossistema ArcGIS que o app já usa. Pasta MapaServer tem 45 serviços; Mapa_Limites/MapServer expõe: Divisas de Município (0), Circunscrição Cartorária (3), Divisas de Macrozona (4), Região Administrativa-7 (5), Região-12 (6), Setor Cadastral (7), Zonas Eleitorais (10) — capabilities Query/Data, maxRecordCount 1000. Há ainda Mapa_UsoDoSoloNew, Mapa_Tributario_Web, Mapa_ModeloEspacial e Feature_Base (FeatureServer). Não encontrei camada poligonal explícita de 'bairros' em Mapa_Limites — o GeoJSON de dados abertos cobre essa lacuna. Útil para enriquecer contexto por Região/Macrozona sem hospedar nada.

**Fonte:** https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_Limites/MapServer

### IMB (Instituto Mauro Borges) / BDE-Goiás — apenas nível municipal

O Banco de Dados Estatísticos (BDE) tem séries históricas de Goiás desde 1980 (PIB municipal, emprego, frota, arrecadação), pesquisável por município — mas NÃO desce a bairro/setor de Goiânia. Serve só para contexto macro (ex.: crescimento econômico do município como pano de fundo do score). O portal também oferece 'estatísticas georreferenciadas' e o Goiás em Dados 2025, todos em recorte municipal.

**Fonte:** https://www.imb.go.gov.br/bde/ e https://goias.gov.br/imb/

### SEPLAM 'Goiânia em Dados' / Anuário Estatístico — população por bairro, mas de 2010

O Anuário Estatístico de Goiânia (2012/2013) traz população residente por bairro (Censo 2010) e população por região, em PDFs. Desatualizado e em formato hostil (PDF); não recomendo como fonte primária — apenas como fallback histórico ou para comparação 2010→2022 de crescimento populacional por bairro.

**Fonte:** https://www.goiania.go.gov.br/shtml/seplam/dados/dados.shtml

### dados.gov.br — sem dataset socioeconômico específico de Goiânia

A busca não encontrou datasets socioeconômicos intra-urbanos de Goiânia no portal federal; o que existe está no portal municipal (dadosabertos.goiania.go.gov.br, com bairros/quadras/praças em SHP/CSV/JSON) e no estadual (dadosabertos.go.gov.br, recorte municipal). Ou seja: a fonte socioeconômica granular é mesmo o IBGE.

**Fonte:** https://dadosabertos.goiania.go.gov.br/ e https://dadosabertos.go.gov.br/

**Recomendação:** Criar um pipeline de preprocessamento offline (script Node/Python rodado uma vez, fora do app) que: (1) baixa o CSV de renda por setor do IBGE e filtra os 2.304 setores 5208707*; (2) extrai centroides dos setores do GO_setores_CD2022.gpkg; (3) faz spatial join centroide→bairro usando o bai.json da Prefeitura (mesmo EPSG:31982, sem reprojeção); (4) agrega por bairro: renda mediana ponderada por domicílios (usar V06006, mediana, mais robusta que média para imóveis), nº de domicílios, moradores, e opcionalmente % esgoto/água da rede e alfabetização dos outros agregados; (5) emite dois arquivos estáticos: bairros-indicadores.json (~100-300 KB) e bairros-geometria simplificada (~500 KB via mapshaper). No app client-side: ao exibir um imóvel, resolver o bairro por point-in-polygon com as coordenadas UTM já disponíveis no cadastro e mostrar o 'score de contexto' do bairro (renda mediana em faixas/quintis da cidade, densidade, infraestrutura), além de usá-lo para normalizar comparáveis (valor venal ÷ renda mediana do bairro identifica sub/sobreavaliação). LGPD ok: tudo é dado agregado e público do IBGE. Cuidado: rotular como 'renda mediana do responsável (Censo 2022, IBGE)' e não como 'renda do proprietário'; e tratar bairros criados após 2018 (sem polígono) com fallback para a Região Administrativa do ArcGIS da Prefeitura.

---

## metodologia-avaliacao (viabilidade: alta)

Não existe razão venal/mercado única defensável no Brasil: estudos empíricos mostram que ela varia de ~0,26 a ~0,80 dentro da mesma cidade e entre bairros (média 59% em Pinheiros vs 34% no Tatuapé, São Paulo), e diagnósticos nacionais apontam níveis médios de avaliação muito abaixo dos 70% recomendados pela Portaria 511/2009 do Ministério das Cidades — em Goiânia a PGV é de 2015 corrigida só por IPCA, o que torna a defasagem heterogênea por região. A abordagem defensável, alinhada às normas IAAO de mass appraisal, é calibrar uma razão MEDIANA por localidade (bairro/setor) a partir de comparáveis, medir a dispersão com o COD (coeficiente de dispersão) e só exibir estimativa quando houver amostra mínima (n≥5, critério FipeZap) e COD aceitável (≤15–20%). O resultado deve ser exibido como FAIXA (valor central + intervalo, padrão Loft/Zillow), com selo de confiança derivado do FSD (alta <13%, média 13–20%, baixa >20%, padrão Freddie Mac HVE). Tudo é computável client-side (medianas, percentis, OLS log-linear simples via equações normais em JS), mas o app deve declarar explicitamente que a estimativa não é laudo NBR 14653 nem PTAM (Res. COFECI 1.066/2007), atos privativos de profissionais habilitados.

### Razão venal/mercado NÃO é constante — evidência empírica IBAPE (São Paulo)

Estudo do IBAPE-SP (2023) comparou valor venal e ofertas de mercado de terrenos em dois bairros de São Paulo: relação VV/VM média de 59% em Pinheiros e 34% no Tatuapé, com imóveis individuais variando de 0,26 a 0,80. Conclusão textual: 'não há uma relação fixa entre o valor venal e o valor de mercado' — a referência popular de 60–70% 'não se aplica'. É o argumento central contra um coeficiente único no app: a razão deve ser calibrada por localidade, nunca global.

**Fonte:** https://biblioteca.ibape-nacional.com.br/wp-content/uploads/2023/12/Valor-Venal-e-Valor-de-Mercado-uma-Analise-Comparativa.pdf

### Nível de avaliação no Brasil: venal muito abaixo do mercado, com piso normativo de 70%

A Portaria 511/2009 do Ministério das Cidades (diretrizes do Cadastro Territorial Multifinalitário) recomenda que o valor venal seja entendido como valor de mercado e que a PGV seja atualizada no máximo a cada 4 anos. Na prática, estudos apontam níveis de avaliação da ordem de 15–30% do mercado em vários municípios (ex.: estudo CONFEA/Porto Alegre encontrou ~15,7%; análise de PGVs achou base tributável média de 26,85% do venal), e mais de 60% dos municípios usam plantas de valores defasadas. O diagnóstico nacional de referência é 'IPTU no Brasil: Um Diagnóstico Abrangente' (De Cesare et al., IDP/Lincoln Institute).

**Fonte:** https://repositorio.idp.edu.br/bitstream/123456789/1541/1/IPTU%20no%20Brasil%20Um%20Diagn%C3%B3stico%20Abrangente.pdf ; https://www.normasbrasil.com.br/norma/portaria-511-2009_217279.html ; https://www.confea.org.br/midias/uploads-imce/Contecc%202022/Civil/PROPRIET%C3%81RIOS%20DE%20IM%C3%93VEIS%20DE%20MAIOR%20VALOR%20SEGUEM%20PAGANDO%20PROPORCIONALMENTE%20MENOS%20IPTU%20EM%20PORTO%20ALEGRE.pdf

### Goiânia: PGV de 2015 corrigida só por IPCA — defasagem grande e desigual

O valor venal de Goiânia deriva de Planta de Valores aprovada em 2015, atualizada apenas por índice monetário (IPCA; reajuste de 4,36–4,46% em 2026, com trava de 5% da LC 344/2021). Goiânia está entre as capitais com maior defasagem venal/mercado (renúncia estimada de R$ 35 milhões). Consequência para o app: a defasagem não é uniforme — bairros que valorizaram acima da inflação desde 2015 (ex.: regiões de adensamento) têm razão VV/VM muito menor que bairros estagnados. O campo dtrecadast/vllanc98 da camada ArcGIS não captura isso; só calibração local com preços de mercado captura.

**Fonte:** https://www.quintoandar.com.br/guias/manual-imobiliario/iptu-em-goiania/ ; https://www.geopixel.com.br/planta-generica-de-valores/ ; https://cnm.org.br/storage/biblioteca/2025/Notas_Tecnicas/20251021_NT_FIN_Atualizacao_da_PVG_por_ato_do_executivo_limites_fundamentos_procedimentos.pdf

### Normas IAAO: ratio study é a metodologia reconhecida para o que o app quer fazer

O IAAO Standard on Ratio Studies e o Standard on Mass Appraisal of Real Property definem exatamente o procedimento: (1) razão mediana avaliação/mercado por estrato (localidade + tipo de imóvel); (2) COD — coeficiente de dispersão em torno da mediana — como métrica de qualidade (bom: 5–15% residencial, até 20% não-residencial); (3) PRD 0,98–1,03 para detectar regressividade (imóveis caros subavaliados proporcionalmente — fenômeno confirmado no Brasil); (4) nível de avaliação aceitável 90–110%. Para o app: calcular por bairro a mediana de (preço de mercado ÷ valor venal) dos comparáveis, usar o COD como 'gate' de exibição e o PRD como alerta de viés por faixa de valor. PDFs dos standards são públicos e gratuitos.

**Fonte:** https://www.iaao.org/wp-content/uploads/Standard_on_Mass_Appraisal.pdf ; https://www.iaao.org/industry-data/iaao-technical-standards/

### IAAO Standard on AVMs + FSD: como converter dispersão em selo de confiança

O IAAO Standard on Automated Valuation Models descreve AVMs e métricas de incerteza. O padrão de mercado é o FSD (Forecast Standard Deviation): desvio-padrão proporcional esperado do valor estimado — FSD de 13% significa 68% de chance de o valor real estar dentro de ±13%. O Freddie Mac Home Value Explorer converte FSD em selo: confiança ALTA (FSD ≤13%), MÉDIA (13–20%), BAIXA (>20%). Client-side, um proxy honesto de FSD é o desvio absoluto mediano (ou COD) da amostra local de comparáveis. O IAAO alerta que 'confidence scores' de fornecedores não são padronizados — mais um motivo para o app mostrar a faixa numérica, não só um selo.

**Fonte:** https://www.iaao.org/wp-content/uploads/Standard_on_Automated_Valuation_Models.pdf ; https://www.clearcapital.com/resources/glossary-of-terms/fsd-forecast-standard-deviation/ ; https://sf.freddiemac.com/docs/pdf/fact-sheets/dougwhitepaper_metricsmatter.pdf

### NBR 14653 (partes 1 e 2): o que exige e por que o app deve declarar que não substitui laudo/PTAM

A NBR 14653-2 (imóveis urbanos) rege a avaliação formal: método comparativo direto de dados de mercado com tratamento por fatores ou regressão (inferência estatística), classificando o trabalho em Graus de Fundamentação I–III (Grau III exige ≥12 dados de mercado homogeneizados e modelo estatisticamente significante) e Graus de Precisão medidos pela amplitude do intervalo de confiança de 80% (Grau III: amplitude ≤30% do valor central). Laudo NBR é privativo de profissional habilitado (engenheiro de avaliações/CREA); o corretor emite PTAM com base na Lei 6.530/78 e Resolução COFECI 1.066/2007 (inscrição no CRECI basta; CNAI é opcional). Um app automatizado não atende aos requisitos de vistoria, responsabilidade técnica e assinatura — logo o disclaimer 'estimativa estatística de referência; não constitui laudo de avaliação NBR 14653 nem PTAM' é obrigatório para ser defensável. A NBR 14653-1:2019 está disponível no repositório público da SPU. Bônus para o corretor-usuário: o app pode se posicionar como ferramenta de apoio à elaboração do PTAM dele.

**Fonte:** https://memoria-spu.gestao.gov.br/wp-content/uploads/tainacan-items/54791/203875/ABNT-NBR-14653-1-2019.pdf ; https://intranet.cofeci.gov.br/arquivos/legislacao/resolucao_1066_07_ato_normativo.pdf ; https://cursoavalia.com/nbr-14653/especificacao-da-avaliacao-segundo-a-norma-nbr-14653-da-abnt/

### Modelos hedônicos simples são viáveis client-side (literatura brasileira usa OLS log-linear)

Estudos brasileiros de precificação hedônica (Nova Friburgo-RJ, Conselheiro Lafaiete-MG, RMSP) usam regressão linear múltipla nas formas linear ou log-linear com poucas variáveis: ln(preço) ~ área, vagas, quartos, dummy de bairro/setor. Isso é OLS resolvível por equações normais (matriz pequena) em JavaScript puro, sem bibliotecas — perfeitamente client-side. Para o Radar, as variáveis já existem na camada: log(área terreno), log(área construída), uso, bairro/quadra, idade fiscal (dtinclusao). A literatura LARES também documenta modelos espaciais para avaliação em massa no Brasil, mas o mínimo defensável é: efeito fixo de bairro + log-área, com resíduos exibidos como faixa.

**Fonte:** https://periodicos.furg.br/vetor/article/view/12879 ; https://www.scielo.br/j/inter/a/MFqGwYQj3BzmMDwLzvyM4bg/abstract/?lang=pt ; https://lares.architexturez.net/system/files/LARES_2012_675-931-1-RV.pdf

### Como plataformas exibem incerteza: faixa + erro mediano publicado (Zillow, Loft, FipeZap)

Zillow publica o erro mediano do Zestimate por segmento (1,9% para imóveis à venda; ~6,9% off-market) e explica que metade das estimativas erra mais que isso — transparência de acurácia é parte do produto. A Loft exibe 'valor central + faixa de confiança', comparando explicitamente com margem de erro de pesquisa eleitoral — modelo de UX direto para o Radar. O FipeZap usa mediana estratificada por célula (cidade × tipo × quartos) e só calcula célula com ≥5 anúncios válidos no mês (senão imputa) — esse limiar n≥5 é um critério pronto e citável para o app decidir quando mostrar ou suprimir a análise de comparáveis de uma localidade. FipeZap cobre Goiânia (R$ 8.139/m² venda residencial, dez/2025) e serve de âncora externa gratuita para sanity-check do nível de preços por cidade.

**Fonte:** https://www.zillow.com/learn/influencing-your-zestimate/ ; https://portal.loft.com.br/entenda-como-a-loft-chega-no-valor-de-um-apartamento/ ; https://downloads.fipe.org.br/indices/fipezap/metodologia/indice-fipezap-metodologia-2019.pdf ; https://downloads.fipe.org.br/indices/fipezap/fipezap-202512-residencial-venda-pub.pdf

### Cuidado jurídico adicional: STJ Tema 1.113 desvinculou ITBI do valor venal do IPTU

O STJ (REsp 1.937.821, Tema 1.113, 2022) fixou que a base do ITBI é o valor da transação declarado (presunção de boa-fé), não o valor venal de referência nem o venal do IPTU — reconhecendo juridicamente que valor venal de IPTU e valor de mercado são grandezas distintas. Em Goiânia isso já gera litígio (ISTI/ITBI). Para o app: reforça que o valor venal é apenas insumo fiscal, e que qualquer 'valor estimado de mercado' exibido deve citar método e fonte, não sugerir equivalência oficial.

**Fonte:** https://www.jornalopcao.com.br/economia/stj-derruba-valor-venal-de-referncia-e-define-que-itbi-deve-seguir-o-preco-real-da-compra-diferenca-pode-gerar-restituicao-772149/ ; https://lageportilhojardim.com.br/blog/base-de-calculo-do-itbi/

**Recomendação:** Substituir o coeficiente único por um pipeline de 'ratio study' local, todo computável client-side: (1) para cada localidade (bairro ou setor censitário), montar amostra de comparáveis com preço de mercado conhecido (anúncios coletados pelo usuário ou dataset estático JSON atualizado periodicamente no repositório) e casá-los com o valor venal da camada ArcGIS; (2) calcular a razão mediana VM/VV do estrato — nunca média, mediana é o estimador robusto usado por IAAO e FipeZap; (3) calcular o COD (média dos desvios absolutos em relação à mediana ÷ mediana) e o PRD; (4) só exibir estimativa se n≥5 comparáveis (critério FipeZap) e COD ≤ 20% — caso contrário, mostrar 'dados insuficientes nesta região' em vez de um número enganoso; (5) exibir SEMPRE como faixa, não valor pontual: valor central = venal × razão mediana do bairro, faixa = central × (1 ± COD), com selo de confiança tipo Freddie Mac (alta COD<13%, média 13–20%); (6) fallback hierárquico: sem calibração no bairro, usar razão da região administrativa; sem nada, usar razão municipal com selo 'baixa confiança' explícito; (7) rodapé fixo obrigatório: 'Estimativa estatística de referência baseada em avaliação em massa (padrões IAAO). Não constitui laudo de avaliação (NBR 14653) nem PTAM (Res. COFECI 1.066/2007), que exigem profissional habilitado e vistoria.' — que ao mesmo tempo protege o app e agrega valor ao corretor, posicionando a ferramenta como insumo para o PTAM dele. Como evolução opcional, um hedônico log-linear (ln VM ~ ln área + dummies de bairro) via OLS em JS puro refina a faixa, mas a razão mediana por bairro + COD já é o salto de 'coeficiente chutado' para 'metodologia citável'.

---

## sinais-valorizacao (viabilidade: alta)

Os sinais urbanos que predizem valorização em Goiânia estão, em boa parte, disponíveis como camadas geoespaciais consultáveis no MESMO servidor ArcGIS que o app já usa (portalmapa.goiania.go.gov.br): o serviço Mapa_ModeloEspacial expõe todas as zonas do Plano Diretor 2022 (Áreas Adensáveis, Eixos de Desenvolvimento, Corredores, OOAU, AEIS) e também o Plano Diretor 2007, permitindo detectar "upzoning" por comparação — o sinal mais forte e mais barato de implementar. Obras públicas (BRT Norte-Sul, novo Anel Viário de R$ 1,1 bi, viadutos da Goiás Norte/Perimetral, canalização do Cascavel) não têm dataset estruturado e precisam virar uma lista estática curada de POIs com coordenadas. Alvarás de construção NÃO são publicados como dado aberto (só consulta individual no AlvaráFácil), e os dados da ADEMI-GO/Brain são relatórios fechados citados na imprensa — servem para calibrar, não para integrar. Comparáveis de preço por localidade podem ser feitos client-side com o próprio cadastro (valor venal/m² por bairro/quadra) e enriquecidos com renda por setor censitário do IBGE Censo 2022 (arquivo estático).

### Camadas do Plano Diretor 2022 queryáveis no mesmo ArcGIS da Prefeitura (sinal nº 1: zoneamento/adensamento)

O serviço MapaServer/Mapa_ModeloEspacial/MapServer expõe 49 layers com capabilities Query e formato geoJSON (verificado: layer 31 'Áreas Adensáveis - AA' responde query com count=51). Layers-chave para valorização: 0 Plano Diretor 2022, 1 Corredores, 4 Eixo de Desenvolvimento (ED), 5 Influência das Vias Expressas, 30 Áreas de Desaceleração de Densidade (ADD, sinal negativo), 31 Áreas Adensáveis (AA), 32 Outorga Onerosa de Alteração de Uso (OOAU), 7 AEIS, 12 AEDE. Layers 36-48 trazem o Plano Diretor 2007 — comparar 2007 vs 2022 por interseção espacial detecta lotes que ganharam potencial construtivo (upzoning), o preditor clássico de valorização. Mesmo servidor que o cadastro do app, então CORS tende a se comportar igual. Limitações: ArcGIS Server 10.4, limite ~1000 registros/query; polígonos grandes podem pesar (usar returnGeometry=false + teste de ponto-no-polígono, ou geometry=ponto do lote com spatialRel=esriSpatialRelIntersects). Serviços irmãos úteis: Mapa_UsoDoSoloNew, Mapa_RedeViaria, Mapa_ExpansaoUrbana, Mapa_Tributario_Web.

**Fonte:** https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Mapa_ModeloEspacial/MapServer

### Texto e anexos oficiais do Plano Diretor (LC 349/2022) para regras de uso

Lei Complementar 349/2022 disponível em PDF oficial; anexos com mapas do Modelo Espacial no portal 'Goiânia do Futuro' e na Câmara Municipal. Diretriz relevante ao app: setores Vila Rosa, Parque Anhanguera, Garavelo e Jardim Vila Boa ganharam eixos de desenvolvimento com incentivo à verticalização (candidatos a valorização). Alterações posteriores: LC 371/2024 e LC 373/2024 (outorga onerosa, vazios urbanos). Uso no app: dicionário estático zona→parâmetros (gabarito, densidade) para explicar o 'porquê' do score.

**Fonte:** https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2022/lc_20220304_000000349.pdf e https://goianiadofuturo.goiania.go.gov.br/documentos/

### Portal de Dados Abertos de Goiânia (CKAN) com 30 datasets geoespaciais

API CKAN funcional (api/3/action/package_list verificada). Datasets relevantes: macro-zonas, corredores-principais, lotes, quadras, setores-cadastrais, bairros, estacoes-de-integracao (transporte), grandes-equipamentos, pracas, areas-de-protecao, erosoes (sinal negativo), logradouros, regionais-administrativas. São majoritariamente shapefiles/estáticos — bons para pré-processar em GeoJSON simplificado e embutir no app como arquivo estático. Não há datasets de alvarás, ITBI ou IPTU.

**Fonte:** https://dadosabertos.goiania.go.gov.br/api/3/action/package_list

### Obras públicas estruturantes (BRT Norte-Sul, Anel Viário, viadutos) — sem dataset, exige curadoria manual de POIs

BRT Norte-Sul: 22,5-29,6 km, 7 terminais e 36 estações, do Terminal Recanto do Bosque ao Veiga Jardim; trechos finais em execução (Av. Goiás Norte, terminais Perimetral e Rodoviária) e trecho Isidória-Cruzeiro licitado (~R$ 97 mi). Novo Anel Viário: edital lançado em jun/2026, ~R$ 1,1 bi, 10 pontes e 35 viadutos, obra de ~3 anos. Prefeitura promete 7 grandes obras iniciando em 2026 (~R$ 1 bi): viadutos Marginal Botafogo x Goiás Norte e Perimetral Norte, canalização do Córrego Cascavel, reforma da Marginal Botafogo, revitalização do Lago das Rosas (R$ 2,7 mi). Página oficial 'Obras em Goiânia' lista status mas sem API/coordenadas. Uso no app: arquivo JSON estático curado {obra, tipo, coordenadas UTM/latlng, status, ano previsto} e cálculo de distância do lote a cada POI — proximidade de estação BRT/terminal é sinal positivo consagrado; frente de obra viária pesada pode ser sinal negativo no curto prazo.

**Fonte:** https://www.goiania.go.gov.br/obras-em-goiania/brt-norte-sul/ e https://www.podergoias.com.br/materia/24904/sete-obras-devem-sair-do-papel-em-goiania-ao-longo-de-2026-afirma-mabel

### Alvarás de construção: NÃO há dado aberto — só consulta individual e proxies

A Prefeitura emite alvarás via SimplificaGyn/AlvaráFácil e oferece acompanhamento individual por processo (acompanhaprojetoweb.aspx), mas não publica dataset de alvarás emitidos por bairro (verificado no portal de dados abertos: ausente). Proxies viáveis: (a) no próprio cadastro do app, dtinclusao recente + área construída > 0 indica unidade nova incorporada ao cadastro — agregado por bairro/ano vira um 'índice de atividade construtiva'; (b) dataset CAE (cadastro de atividade econômica) do portal aberto indica dinamismo comercial por região. Alternativa trabalhosa: garimpo do Diário Oficial do Município (não estruturado).

**Fonte:** https://www10.goiania.go.gov.br/alvarafacil/acompanhaprojetoweb.aspx e https://www.goiania.go.gov.br/sing_servicos/alvara-de-construcao/

### ADEMI-GO / Brain Inteligência Estratégica: pesquisa de lançamentos e vendas — relatório fechado, sem API

A ADEMI-GO divulga trimestralmente (via Brain) números do mercado de Goiânia: R$ 8,1 bi em vendas em 2025, 3º maior mercado do país, 4.843 unidades lançadas no 1º sem/2025, valorização ~13,4% a.a., m² médio de lançamentos ~R$ 9.287 (2024, +17%). Os microdados (lançamentos por bairro, VGV, estoque) são pagos/restritos a associados; o que é público sai em posts do blog e na imprensa. Uso no app: constantes de calibração (valorização média anual da cidade, ranking de bairros) atualizadas manualmente 1-2x/ano em arquivo estático, citando a fonte.

**Fonte:** https://ademigo.com.br/blog/mercado-imobiliario-de-goiania-mantem-patamar-de-vendas-recordes-apesar-dos-juros-em-2025

### FipeZap: índice mensal de preços para Goiânia — nível cidade, sem recorte por bairro

PDF mensal público em downloads.fipe.org.br (ex.: fipezap-202601-residencial-venda.pdf): Goiânia a R$ 8.226/m² (venda residencial), +2,61% em 12 meses até jan/2026. A Fipe declara que NÃO divulga preço por bairro/zona. Uso no app: série histórica da cidade como benchmark ('este lote valorizou acima/abaixo do índice da cidade'). Extração manual do PDF ou tabela estática.

**Fonte:** https://downloads.fipe.org.br/indices/fipezap/fipezap-202601-residencial-venda.pdf

### Corredores de valorização conhecidos (2025/2026) para tabela estática de referência

Consolidado da imprensa/portais: Setor Marista lidera (~R$ 10.800/m²), seguido de Bueno, Setor Sul e Jardim Goiás/Parque Flamboyant (~R$ 9.300/m²); Jardim América ~R$ 7.993/m²; Setor Pedro Ludovico ~R$ 7.843/m². Emergentes com maior variação: Parque Amazônia (+14%, líder de valorização, tíquete médio R$ 654 mil), Jardim Atlântico (+11%), Alto da Glória e Vila Rosa. Vetores do Plano Diretor: Vila Rosa, Parque Anhanguera, Garavelo (Aparecida) e Jardim Vila Boa. Uso no app: tabela estática bairro→{m² médio, variação 12m, classe} para contextualizar o comparável cadastral.

**Fonte:** https://alexanderbraga.com.br/os-bairros-com-o-metro-quadrado-mais-valorizado-de-goiania/ e https://portas.com.br/dados-inteligencia/os-bairros-onde-ficou-mais-caro-comprar-imovel-em-goiania-em-2025/

### IBGE Censo 2022 — agregados por setor censitário (renda, domicílios) como camada socioeconômica

Malha de setores censitários 2022 + agregados (população, domicílios, água/esgoto/lixo; rendimento nos agregados do universo) disponíveis para download gratuito no IBGE, já integrados aos vetores. ~452 mil setores no Brasil; Goiânia tem alguns milhares — pré-processar (recortar Goiânia, simplificar geometria, manter 3-4 variáveis) gera um GeoJSON de poucos MB embutível no app. Sinal: renda média e crescimento populacional do entorno são preditores estruturais de preço.

**Fonte:** https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial e https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/39525-censo-2022-informacoes-de-populacao-e-domicilios-por-setores-censitarios-auxiliam-gestao-publica

### CUB-GO (Sinduscon-GO) — custo de construção mensal como piso de valor

Divulgado mensalmente até o 5º dia útil (maio/2026: R$ 2.768,47/m² referencial; padrão alto R16A é a referência local). Público no site do Sinduscon-GO e replicado em portais. Uso no app: custo de reposição aproximado (área construída × CUB ajustado por padrão) vs valor venal — quando valor de terreno domina o valor total, indica potencial de redevelopment. Tabela estática atualizada manualmente.

**Fonte:** https://www.sinduscongoias.com.br/index.php/cub-custo-unitario-basico

### Sinal interno já disponível no app: vllanc98 como baseline de valorização 1998→hoje

O próprio cadastro tem vllanc98 (valor lançado em 1998) e valor venal atual: a razão (valor venal / vllanc98 corrigido pelo IPCA 1998→2026, fator ~4,8x embutível como constante) mede valorização cadastral real de longo prazo por lote, agregável por quadra/bairro para mapear 'onde a prefeitura reconheceu mais valorização'. Datas dtultalter/dtrecadast recentes + dtinclusao por ano permitem índice de atividade construtiva por bairro sem nenhuma fonte externa. ITBI (transações reais) não é publicado como dado aberto pela prefeitura — não contar com ele.

**Fonte:** Camada de Cadastro Imobiliário já usada pelo app (portalmapa.goiania.go.gov.br) + https://dadosabertos.goiania.go.gov.br/

**Recomendação:** Implementar um "score de potencial de valorização" por lote, 100% client-side, em 3 camadas: (1) ZONEAMENTO (ao vivo): ao consultar um lote, disparar queries de ponto-no-polígono contra Mapa_ModeloEspacial/MapServer (mesmo servidor já usado pelo app, geoJSON confirmado) nas layers 31 (Área Adensável), 4 (Eixo de Desenvolvimento), 1 (Corredores), 32 (OOAU), 30 (ADD, penaliza) e 7 (AEIS); bônus: cruzar com as layers 36-48 (Plano Diretor 2007) para sinalizar 'upzoning' — lote que virou adensável em 2022 é o sinal mais forte. (2) PROXIMIDADE DE GATILHOS (estático): embutir JSON curado manualmente com coordenadas das 36 estações + 7 terminais do BRT Norte-Sul, traçado do novo Anel Viário, viadutos e parques anunciados para 2026, e calcular distância euclidiana em UTM (o app já tem as coordenadas UTM do lote); complementar com o dataset 'estacoes-de-integracao' do CKAN municipal. (3) COMPARÁVEIS E HISTÓRICO (dados que o app já tem): para a mesma quadra/bairro, buscar lotes do mesmo uso e calcular mediana/percentis de valor venal por m² (margem de preços) e a razão valor venal ÷ (vllanc98 × fator IPCA) como valorização de longo prazo relativa da localidade. Calibrar a narrativa com constantes estáticas atualizadas 1-2x/ano (tabela de m² por bairro da imprensa/ADEMI, FipeZap cidade, CUB-GO). Não perseguir: alvarás (não publicados), microdados ADEMI/Brain (pagos) e ITBI (indisponível).

---

## comparaveis-comps (viabilidade: alta)

A prática consolidada (Zillow, Redfin, FipeZap, NBR 14653-2) converge para um padrão totalmente implementável client-side: selecionar comparáveis por proximidade espacial e similaridade (mesma quadra → setor → bairro, área entre 0,5× e 2× a do imóvel-alvo, mesmo uso), usar MEDIANA como estimador central (nunca média), exibir sempre uma FAIXA (Q1–Q3 ou mediana ± MAD) em vez de valor pontual, e só mostrar o resultado com um mínimo de amostras (FipeZap usa 5 por célula; NBR aceita 3 no tratamento por fatores, mas com fundamentação mínima). Outliers devem ser saneados por cerca de Tukey (1,5×IQR) ou MAD robusto antes do cálculo. Como a Planta de Valores de Goiânia é de 2015 corrigida por IPCA, o R$/m² venal está defasado em nível absoluto mas é internamente consistente — perfeito para comparação RELATIVA (posição do lote dentro da quadra/setor), desde que o app rotule explicitamente que é referência cadastral e não preço de mercado. Viabilidade alta: tudo é aritmética simples sobre dados que o app já baixa do ArcGIS.

### Zillow Zestimate: faixa de valor + taxa de erro publicada, nunca valor pontual seco

O Neural Zestimate combina características do imóvel, vendas comparáveis próximas e tendências de mercado, mas o produto exibido ao usuário é sempre 'valor mais provável + Estimated Sale Range' (ex.: $450k com faixa $430k–$470k), com erro mediano divulgado (~1,8% on-market, ~7% off-market). Lição para o Radar: nunca exibir um número único; sempre faixa + indicador de confiança. Detalhe técnico em https://www.zillow.com/tech/building-the-neural-zestimate/

**Fonte:** https://zillow.zendesk.com/hc/en-us/articles/4402325964563-How-is-the-Zestimate-calculated e https://www.zillow.com/zestimate/

### Redfin: regra prática de seleção de comps (25 mais similares, 6 meses, raio 1–5 milhas)

O Redfin Estimate seleciona até 25 imóveis mais similares vendidos nos últimos 6 meses e deixa o usuário incluir/excluir comps manualmente (Owner Estimate). Prática de mercado: começar num raio de ~1,6 km e expandir até ~8 km se faltar amostra. Tradução para o Radar (sem datas de venda): hierarquia espacial mesma quadra → mesmo setor/CTM → mesmo bairro, expandindo só quando n < mínimo; e permitir ao usuário desmarcar comps da lista.

**Fonte:** https://support.redfin.com/hc/en-us/articles/28416749715995-Redfin-Estimate-FAQ e https://www.redfin.com/redfin-estimate

### Loft (Brasil): comps por similaridade sobre transações reais de ITBI; publica R$/m² por bairro

O algoritmo da Loft compara 100+ variáveis num universo de ~70 mil transações para achar os melhores comparáveis, e a Loft publica preço mediano do m² por bairro de SP calculado sobre registros de ITBI da prefeitura (valor declarado em cartório, não anúncio). Insight aplicável: dados fiscais/cadastrais públicos são fonte legítima de comps no Brasil; para Goiânia, o equivalente seria cruzar o venal com ITBI/ISTI se a prefeitura publicar (vale investigar dados abertos de ITBI de Goiânia como evolução futura).

**Fonte:** https://portal.loft.com.br/preco-sugerido-imovel/ e https://portas.com.br/dados-inteligencia/preco-por-regiao/preco-imovel-sao-paulo-bairros/

### NBR 14653-2 — tratamento por fatores: o método oficial para POUCAS amostras

Quando não há dados para inferência estatística, a norma manda homogeneizar: fator oferta 0,90 (desconto de 10% sobre preço anunciado — irrelevante para venal, que já não tem 'gordura de anúncio'); comparáveis válidos só com fatores entre 0,50 e 2,00 (na prática: área do comp entre metade e o dobro da área do alvo); saneamento da amostra por intervalo de ±30% em torno da média com remoção progressiva; mínimo recomendado de 3 elementos; campo de arbítrio de ±15% em torno da estimativa; grau de precisão medido pela amplitude do intervalo (≤30% = grau III, ≤40% = II, ≤50% = I) — regra pronta para virar badge de confiança no app. Grau de fundamentação II exige ≥5 dados.

**Fonte:** https://www.guiadaengenharia.com/tratamento-fatores/ (síntese da ABNT NBR 14653-2)

### FipeZap: estratificação por célula (bairro × tipologia), mediana obrigatória, mínimo 5 anúncios por célula

Metodologia oficial: cada célula = bairro × nº de dormitórios; calcula-se a MEDIANA (explicitamente por ser estimador mais robusto que a média); células com menos de 5 anúncios válidos não geram preço próprio (fazem imputação). Regra diretamente transplantável: no Radar, célula = quadra × uso (ou setor × uso), exibir estatística só com n ≥ 5, e cair para o nível espacial superior quando n < 5.

**Fonte:** https://downloads.fipe.org.br/indices/fipezap/metodologia/indice-fipezap-metodologia-2019.pdf

### Estatística robusta para amostras pequenas: mediana + MAD/IQR, cerca de Tukey

Mediana e MAD têm ponto de ruptura de 50% (resistem até metade de outliers); IQR só 25% mas é mais intuitivo. Receita padrão: (1) outlier = fora de [Q1−1,5×IQR, Q3+1,5×IQR], ou |x−mediana|/(1,4826×MAD) > 3; (2) remover outliers; (3) reportar mediana, Q1–Q3 e min–max. Com n entre 3 e 5, quartis são instáveis — exibir apenas mediana + min–max e marcar como baixa confiança. Nunca usar média/desvio-padrão com n pequeno em dados de imóveis (caudas pesadas).

**Fonte:** https://en.wikipedia.org/wiki/Robust_measures_of_scale e https://wis.kuleuven.be/stat/robust/papers/2011/rousseeuwhubert-robuststatisticsforoutlierdetectio.pdf

### Calibração crítica: valor venal de Goiânia = PGV 2015 corrigida por IPCA

A consulta oficial de valor venal de Goiânia usa a Planta de Valores aprovada em 2015, atualizada apenas por correção monetária (IPCA; ITBI reajustado 4,36% em jan/2026). Consequência: o R$/m² venal NÃO acompanha valorização real de mercado desde 2015 (nível absoluto subestimado e desigualmente defasado entre bairros que valorizaram mais), MAS dentro de uma mesma quadra/setor a comparação relativa é consistente, pois todos os lotes usam a mesma base. O app deve vender o recurso como 'posição relativa na quadra' e 'faixa venal', com disclaimer de que mercado costuma estar acima do venal.

**Fonte:** https://www.goiania.go.gov.br/sing_servicos/consulta-do-valor-venal-do-imovel/ e https://www.quintoandar.com.br/guias/manual-imobiliario/iptu-em-goiania/

### Visualização: barra de faixa (range bar) com marcador > box plot formal

Box plots comparam bem várias quadras/bairros lado a lado (mediana + IQR compactos), mas escondem pontos individuais e confundem leigos; com poucas amostras a recomendação é strip plot (pontos individuais) sobre a barra de faixa. Padrão de UI dos portais (Zillow/Redfin): barra horizontal min–max com zona Q1–Q3 destacada e um marcador na posição do imóvel-alvo ('seu lote está no percentil X da quadra') — é a forma mais legível para corretor/investidor e trivial de renderizar em HTML/CSS puro (div com gradiente + marcador posicionado por %).

**Fonte:** https://www.atlassian.com/data/charts/box-plot-complete-guide e https://atlas.co/blog/visualize-property-values-by-neighborhood/

**Recomendação:** Implementar um painel "Comparáveis da quadra" 100% client-side: (1) ao selecionar um imóvel, consultar o ArcGIS por where=quadra+setor iguais (e depois bairro, se preciso), filtrando mesmo uso e área do terreno entre 0,5× e 2× a do alvo (eco do limite 0,50–2,00 da NBR 14653-2); (2) calcular R$/m² venal = valor venal ÷ área para cada comp; (3) sanear outliers pela cerca de Tukey (fora de Q1−1,5×IQR a Q3+1,5×IQR) ou MAD robusto (|x−mediana|/(1,4826×MAD)>3); (4) exibir MEDIANA + faixa Q1–Q3 + min–max, nunca média nem valor pontual; (5) regras de exibição por n (padrão FipeZap): n≥5 → faixa completa; 3≤n<5 → só mediana e min–max com selo "amostra pequena"; n<3 → subir um nível espacial (quadra→setor→bairro) e informar o nível usado; (6) badge de confiança pela amplitude relativa da faixa (IQR/mediana ≤30% alta, ≤40% média, ≤50% baixa — espelhando o grau de precisão da NBR); (7) UI: barra horizontal min–max com zona Q1–Q3 destacada e marcador mostrando onde o imóvel-alvo cai ("percentil X da quadra"), com strip plot dos pontos individuais clicáveis (cada ponto = uma inscrição, permitindo o usuário excluir comps como no Redfin Owner Estimate); (8) disclaimer fixo: "valores venais (PGV 2015 + IPCA), tipicamente abaixo do mercado — use como referência RELATIVA de posição, não como preço de venda". Evolução futura: investigar dados abertos de ITBI de Goiânia para calibrar um multiplicador venal→mercado por bairro, como a Loft faz com ITBI de SP.

---

## anuncios-mercado (viabilidade: media)

Obter preços de anúncios individuais de Goiânia por scraping é tecnicamente inviável dentro de um app client-side puro (CORS + Cloudflare bloqueiam qualquer fetch do navegador — verifiquei empiricamente que até o robots.txt de zapimoveis.com.br e olx.com.br retorna bloqueio Cloudflare) e juridicamente arriscado: os termos do Grupo OLX/DataZap proíbem expressamente "robôs, scripts ou spiders", e o precedente Catho v. Curriculum (TJSP) condenou extração massiva de base alheia como concorrência desleal, além de a raspagem ser tema prioritário de fiscalização da ANPD desde 2023. Porém, há um caminho legal e gratuito que resolve 90% da necessidade de calibração: o índice FipeZap publica série histórica mensal em Excel público (inclui Goiânia, com preço médio do m² de venda e locação — R$ 8.139-8.226/m² em 2025/26), e a pesquisa Ademi-GO/Brain publica trimestralmente preço médio do m² de Goiânia com recorte por bairros nobres. A recomendação é embutir no app um arquivo estático JSON de fatores de calibração por região, transcrito manualmente desses agregados públicos (fatos não são protegidos por direito autoral; uso com atribuição), atualizado trimestralmente — e usar os próprios comparáveis do cadastro (valor venal/m² da mesma quadra/bairro) para a margem de preços da localidade.

### Não existe API pública de LEITURA de anúncios — só API de publicação

O portal developers.grupozap.com (Grupo OLX: ZAP + VivaReal + OLX) é exclusivamente para anunciantes ENVIAREM imóveis via feed XML/API (lido a cada 12h). Não há endpoint público para consultar/baixar anúncios de terceiros. Chaves na Mão idem: API REST e XML só para integração de carga de anúncios do próprio corretor (requer token de conta). QuintoAndar não tem API pública nenhuma.

**Fonte:** https://developers.grupozap.com/ e https://tecnologiacnm.github.io/cnm-xml-documentation/arquivo/especificacoes/especificacoes-tags.html

### Termos de uso do Grupo OLX/DataZap proíbem scraping expressamente

Cláusula literal dos termos DataZap/OLX: 'Você não usará e não autorizará terceiros a utilizar quaisquer meios automatizados incluindo, sem limitação, robôs, scripts ou spiders, para interferir ou tentar interferir' nas plataformas; dados e base permanecem 'de propriedade da DATAZAP', redistribuição vedada sem autorização expressa. Os TCG do ZAP estão em PDF (OLX_TCG_Zap_07042026) com restrições equivalentes. Scraping = violação contratual inequívoca.

**Fonte:** https://grupoolx.com.br/datazap-termos-de-uso

### Bloqueio técnico ativo: Cloudflare barra até requisições triviais

Teste empírico (curl simples ao robots.txt): zapimoveis.com.br e olx.com.br retornam 'Sorry, you have been blocked' (Cloudflare bot management). Num app client-side puro há barreira dupla: CORS impede fetch cross-origin do navegador do usuário, e o anti-bot bloqueia qualquer coleta server-less. Scrapers comerciais existem (Apify: avorio/zap-imoveis-scraper; fatihtahta a ~US$2/1k anúncios), mas são pagos, violam ToS e exigiriam pipeline externo ao app.

**Fonte:** Verificação direta (curl, 02/07/2026) + https://apify.com/avorio/zap-imoveis-scraper

### Jurisprudência: scraping massivo de portal alheio já foi condenado no Brasil

Caso Curriculum Tecnologia v. Catho Online (TJSP): condenação por concorrência desleal (Lei 9.279/96, art. 195) pela extração de milhares de currículos da plataforma concorrente. Não há precedente brasileiro tipo hiQ v. LinkedIn legitimando scraping de dados públicos; a ANPD colocou 'raspagem de dados' no Mapa de Temas Prioritários (dez/2023). Doutrina admite raspagem de dados publicamente acessíveis sob legítimo interesse e proporcionalidade, mas anúncios sem dados do anunciante (só preço/área/bairro) minimizam o risco LGPD — o risco dominante é contratual (ToS) e concorrencial, não de dados pessoais. Para uso pessoal/pontual o risco prático de enforcement é baixo; para um app distribuído que republique dados, é real.

**Fonte:** https://www.migalhas.com.br/depeso/152061/tecnologia-da-nova-era--tribunais-brasileiros-e-americanos---scraping--a-superficie-das-fronteiras-legais-do-uso-da-internet e https://asmetro.org.br/portalsn/2024/04/22/a-raspagem-de-dados-e-os-limites-eticos-e-legais-uma-visao-da-anpd/

### FipeZap: série histórica mensal GRATUITA em Excel, inclui Goiânia

Arquivo público https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx (verificado: HTTP 200, 4,7 MB, atualizado 01/07/2026) com índice mensal + preço médio do m² por cidade (venda e locação, residencial e comercial), calculado sobre anúncios de ZAP/VivaReal/OLX — ou seja, é exatamente 'preço de anúncio' já agregado e licenciado para divulgação pública. Goiânia: ~R$ 8.139-8.226/m² venda residencial (2025/26), +4,28% a.a. Limitação: granularidade por CIDADE, não por bairro. Relatórios mensais em PDF também públicos (fipezap-AAAAMM-residencial-venda-publico.pdf).

**Fonte:** https://www.fipe.org.br/pt-br/indices/fipezap/ e https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx

### Ademi-GO / Brain Inteligência: preço m² de Goiânia com recorte por bairro, trimestral e público

Pesquisa trimestral divulgada abertamente em press releases: Goiânia R$ 10.914/m² (1T2026, +3,6% no trimestre), R$ 10.261 (1T2025), R$ 9.287 (média 2024); bairros nobres: Marista R$ 13.462/m², média Marista/Bueno/Oeste/Jd. Goiás R$ 12.881/m². Foco em imóveis novos (mercado primário) — vale como teto de calibração. Dados publicados na imprensa podem ser transcritos como fatos, com atribuição. O MySide/myindex também publica m² por bairro de Goiânia (Marista R$ 10.428, Bueno R$ 9.157 — usados), gratuito para consulta.

**Fonte:** https://ademigo.com.br/blog/com-crescimento-de-35-nas-vendas-em-2024-goiania-se-consolida-como-3-maior-mercado-imobiliario-do-pais-e-reforca-a-tendencia-de-valorizacao-dos-imoveis-para-2025 e https://myside.com.br/guia-goiania/valor-metro-quadrado-goiania-myindex

### DataZAP: relatórios públicos gratuitos, mas dados brutos só sob contrato

A DataZAP (braço de inteligência do Grupo OLX) publica relatórios trimestrais e Anuário gratuitos (datazap.com.br), incluindo o Raio-X FipeZap por cidade, e vende produtos de dados (Geografia do Mercado Imobiliário, avaliação automatizada) sob contrato com termos que retêm propriedade da base. Parceria formal seria o único caminho para dados brutos de anúncios — inviável para app gratuito. Índice QuintoAndar/Imovelweb de aluguel cobre apenas 6 capitais (SP, RJ, BH, DF, Curitiba, POA) — Goiânia FORA.

**Fonte:** https://www.datazap.com.br/ e https://grupoquintoandar.com/indice-de-aluguel/

### Datasets prontos e alternativas de dados de TRANSAÇÃO

Kaggle/GitHub têm datasets de anúncios brasileiros (majoritariamente SP/RJ, ex.: sao-paulo-housing-prices), nada relevante para Goiânia. Goiânia NÃO publica dados abertos de ITBI/ISTI com valores de transação (diferente de São Paulo) — o sistema itbi.goiania.go.gov.br é só para emissão de guias; um pedido via LAI à SEFIN de Goiânia por microdados anonimizados de ITBI seria a via mais promissora para preços REAIS de transação por bairro.

**Fonte:** https://www.kaggle.com/datasets/renatosn/sao-paulo-housing-prices e https://itbi.goiania.go.gov.br/sistemas/sisti/asp/sisti00100f0.asp

**Recomendação:** Descartar scraping de anúncios (inviável em client-side por CORS/Cloudflare; violação clara de ToS; precedente Catho de concorrência desleal). Em vez disso: (1) Embutir no app um arquivo estático calibracao-goiania.json, atualizado manualmente por trimestre, com: preço médio m²/cidade e série de valorização mensal extraídos da planilha pública FipeZap (fipezap-serieshistoricas.xlsx), e preços m² por bairro nobre transcritos das pesquisas Ademi-GO/Brain e MySide (fatos com atribuição — legalmente seguro). (2) Derivar um 'fator mercado/venal' por região: razão entre o m² FipeZap/Ademi da região e o valor venal/m² mediano do próprio cadastro ArcGIS naquela região — isso converte valor venal em estimativa de mercado sem nenhum dado de anúncio bruto. (3) Para 'comparáveis da mesma localidade', usar o que o app já tem de graça: distribuição de valor venal/m² dos lotes da mesma quadra/setor (percentis 25-75 como margem), multiplicada pelo fator do item 2. (4) Para histórico de valorização, plotar a série FipeZap Goiânia (2010+) e as variações dtultalter/vllanc98 do cadastro. (5) Caminho futuro de maior valor: pedido LAI à SEFIN Goiânia por microdados anonimizados de ITBI (valores reais de transação por bairro/mês) — gratuito, legal, e superior a qualquer anúncio.

---

## mineracao-base-propria (viabilidade: alta)

Testei hoje o endpoint real (MapServer/3, ArcGIS 10.4) e o resultado muda o plano: a ideia-âncora do pseudo-histórico morreu — vllanc98 é idêntico a vlvenal em 100% dos registros testados (count de vllanc98<>vlvenal no Setor Bueno = 0 em 57.225), ou seja, não há valor de 1998 preservado. Em compensação, descobri alavancas muito mais poderosas que a paginação bruta: returnCountOnly, orderByFields, returnDistinctValues (com returnGeometry=false), aritmética na cláusula WHERE (vlvenal/areaedif < X) e busca espacial por raio em metros — todas funcionam e são JSONP-compatíveis. Com isso dá para calcular mediana e quartis EXATOS de R$/m² de qualquer recorte (setor, quadra, raio de 300 m ao redor do imóvel) usando ~12 requisições de ~200 bytes cada (busca binária sobre counts), sem baixar registro nenhum. Histórico de valorização real terá de vir de fora (FipeZap Goiânia, XLSX gratuito verificado) ou ser construído daqui pra frente com snapshots estáticos anuais das medianas por setor. Atenção LGPD: o campo dtnascimen aparenta ser data de nascimento do contribuinte (prédio incluído em 2018 com dtnascimen=1945) — nunca exibir.

### vllanc98 NÃO é valor de 1998 — ideia do pseudo-histórico de 28 anos está morta

Teste executado em 02/07/2026: where=cdbairro=16 AND vlvenal>0 AND vllanc98<>vlvenal retorna count=0; vllanc98=vlvenal retorna count=57.225 (100% do Setor Bueno). O sufixo '98' é herança do sistema de 1998, mas o campo carrega o valor lançado ATUAL. Os campos irmãos têm uso real: vlimp98 = IPTU lançado no exercício (ex.: R$ 3.981,84 sobre venal de R$ 723.971,22) e vlaliq98 = alíquota (0,0055). Inteligência aproveitável: exibir 'IPTU anual estimado' e alíquota efetiva no card do imóvel — custo zero, dado já vem no registro.

**Fonte:** https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query (testes returnCountOnly)

### outStatistics de fato quebrado, MAS returnCountOnly, orderByFields, DISTINCT e aritmética no WHERE funcionam

Apesar de os metadados declararem supportsStatistics:true, outStatistics devolve erro 400 (confirmado). Porém: (1) returnCountOnly=true funciona (resposta ~20 bytes, rápida, aceita callback= JSONP); (2) orderByFields=vlvenal DESC funciona; (3) returnDistinctValues=true funciona SE returnGeometry=false — e é o único caso em que outFields específico é aceito (ex.: listar todas as quadras distintas de um setor em 1 request); (4) expressões aritméticas no WHERE funcionam: 'vlvenal/areaedif<3000' retornou count=26.008 de 30.092. Erro 400 de outFields específico em query normal persiste mesmo com returnGeometry=false.

**Fonte:** Testes diretos em https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query, 02/07/2026

### Mediana e quartis EXATOS de R$/m² sem baixar registros: busca binária sobre counts

Duas técnicas viáveis client-side: (a) Mediana de um CAMPO: 1 count + 1 request com orderByFields=vlvenal ASC & resultOffset=count/2 & resultRecordCount=1 — total 2 requests. (b) Mediana/percentil de uma RAZÃO (R$/m² = vlvenal/areaedif): busca binária com returnCountOnly sobre 'vlvenal/areaedif < X' — ~10-12 requests de ~200 bytes convergem para o valor exato; P25 e P75 idem (alvo count*0.25/0.75). Isso dá baseline de comps com faixa de incerteza (P25–mediana–P75) por setor+uso+faixa de área, em ~2-4 KB de tráfego total, respeitando o servidor frágil (cada count respondeu em ~1-2 s). Compare: baixar o universo custa ~1,5 KB/registro (página de 1.000 registros outFields=* sem geometria = 1,52 MB).

**Fonte:** Verificado empiricamente: count Bueno uso=1 areaedif>=40 = 30.092; count com vlvenal/areaedif<3000 = 26.008

### Comps por raio: busca espacial por distância em metros funciona

geometry={x,y,wkid:31982} + geometryType=esriGeometryPoint + distance=300 + units=esriSRUnit_Meter + spatialRel=esriSpatialRelIntersects funciona com where combinado e returnCountOnly (teste: 9.088 unidades uso=1 num raio de 300 m no Bueno). Envelope também funciona (esriGeometryEnvelope, inSR=31982). Receita do painel 'Comparáveis da localidade': raio de 200-500 m do imóvel selecionado + where uso=X AND areaedif entre ±30% da área do alvo AND vlvenal>0 → mediana/quartis via busca binária de counts. É comp de VENAL, não de mercado — exibir sempre como faixa relativa ('este imóvel está no P83 do venal/m² da vizinhança'), que é imune à defasagem da planta de valores, e converter para R$ de mercado só via coeficiente calibrado por setor.

**Fonte:** Teste direto no endpoint; capacidade declarada em advancedQueryCapabilities.supportsQueryWithDistance=true

### Idade e adensamento: dtinclusao serve; dtnascimen é RISCO LGPD, não use

dtinclusao (string YYYYMMDD) vai até 30/12/2025 — a base está viva e atualizada. Para condomínios (cdedificio>0), dtinclusao ≈ data de individualização das unidades pós-habite-se → bom proxy de idade do prédio. dtnascimen é incoerente com construção (RES ENJOY FACILITY HOME, incluído em 2018, tem unidades com dtnascimen=19450525 e outras com '0'; RES BUENO PARK de 2021 tem 19600101) — padrão compatível com data de nascimento do contribuinte pessoa física: NÃO exibir no app (dado pessoal; LGPD). Sinal de adensamento barato: count de cdedificio>0 AND dtinclusao>'20200101' por setor = 1 request de ~200 bytes cada (Bueno: 9.145 unidades novas desde 2020, ~16% do estoque de 57.766). Para as ~20 regiões de interesse do corretor, é um dashboard de 20 requests; para os 709 setores, rodar offline 1x e embutir JSON estático.

**Fonte:** Amostras reais do endpoint (dtinclusao DESC; condomínios com dtinclusao>2015)

### Campos de qualidade construtiva são fracos demais para estratificar

No Setor Bueno: cdpadrao>0 em apenas 7.910 de 57.766 (~14% preenchido — maioria zero); conserva>1 em só 756 registros (praticamente tudo =1). nrpaviment é inconsistente por unidade (unidade de prédio de 6+ pavimentos com nrpaviment=2). Conclusão: não montar score de 'padrão construtivo' com esses campos; a segmentação defensável é uso (1=residencial: 50.558; 2=comercial: 7.016 no Bueno) + faixa de areaedif + cdedificio>0 (apartamento vs casa) — todos densos e confiáveis.

**Fonte:** Counts diretos no endpoint, 02/07/2026

### Histórico de valorização: não existe na base — construir daqui pra frente + FipeZap como contexto

Sem vllanc98 histórico, as opções gratuitas são: (1) FipeZap Goiânia — série mensal cidade-nível desde ~2010, XLSX público verificado (HTTP 200, 4,7 MB): https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx — pré-processar e embutir como JSON estático no app (tendência da cidade + R$/m² médio de anúncio, ~R$ 7.943/m² em jan/2025); (2) snapshot próprio: rodar 1x/ano (a Planta de Valores é aprovada anualmente pela Câmara) um script que grava mediana de R$/m² venal por setor num JSON versionado no GitHub — em 2-3 anos vira histórico por setor que ninguém mais tem. Ressalva de viés: a LC 344/2021 limita a 5%+inflação o aumento anual de venais em adequação, então a série de venal é amortecida e defasada de forma HETEROGÊNEA entre setores — nunca apresentar variação de venal como variação de mercado.

**Fonte:** https://www.fipe.org.br/pt-br/indices/fipezap/ ; https://www.goiania.go.leg.br/sala-de-imprensa/agencia-camara-goiania/Agencia-Camara-Goiania_noticias/secretario-de-financas-esclarece-sobre-atualizacao-da-planta-de-valores

### Orçamento de requisições e compatibilidade JSONP

Todas as técnicas acima funcionam via GET com callback= (testado: callback=cb123 com returnCountOnly retorna cb123({"count":57766});), ou seja, encaixam no app atual sem proxy. Custos típicos: card de comps por raio = ~14 requests pequenos (2 counts + 12 da busca binária); painel de adensamento de 20 setores = 20 counts; mediana simples de venal = 2 requests. O servidor devolveu 502 sob count da base inteira no passado — manter filtros por cdbairro/raio, cache de sessão dos resultados (a mediana de um setor não muda no exercício → cachear em localStorage com TTL de 30 dias) e retry único com backoff.

**Fonte:** Testes diretos; maxRecordCount=1.000.000 e advancedQueryCapabilities confirmados em https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3?f=json

**Recomendação:** Implementar em 3 camadas, todas client-side sobre o app atual: (1) IMEDIATO, custo zero — no card do imóvel, exibir IPTU anual (vlimp98), alíquota efetiva (vlaliq98), idade aproximada do prédio (ano de dtinclusao quando cdedificio>0) e R$/m² do venal; nunca renderizar dtnascimen (provável dado pessoal). (2) COMPS DA LOCALIDADE — botão 'Comparar com a vizinhança': query espacial por raio de 300 m (esriGeometryPoint + distance + units=esriSRUnit_Meter, wkid 31982) filtrada por uso e areaedif ±30%, mediana e P25/P75 de vlvenal/areaedif calculados por busca binária de returnCountOnly (~12 requests de 200 bytes, com cache em localStorage TTL 30 dias); exibir posição percentil do imóvel na faixa da vizinhança — métrica imune à defasagem da planta de valores — e o valor de mercado estimado como faixa (P25–P75 × coeficiente do setor), nunca número seco. (3) INTELIGÊNCIA TERRITORIAL — script offline (Node, rodado manualmente ou via GitHub Actions) que 1x/ano grava JSON estático com, por setor: mediana R$/m² venal por uso, contagem de unidades novas (cdedificio>0 AND dtinclusao>ano-5) e estoque total; isso alimenta um ranking de adensamento/pontos de valorização no app e, acumulado ano a ano, vira o histórico de valorização por setor que a base não oferece; embutir junto a série FipeZap Goiânia (fipezap-serieshistoricas.xlsx pré-processada) como referência de tendência de mercado da cidade. Abandonar formalmente a ideia vllanc98 (comprovadamente cópia do venal atual) e atualizar o ROADMAP-radar.md item 15c com as técnicas de count binário descobertas.

---

## amenidades-osm (viabilidade: alta)

Enriquecer o Radar Fundiário com amenidades geográficas gratuitas é plenamente viável, mas o caminho certo NÃO é consultar a Overpass API em tempo real por imóvel — é pré-computar. Testei na prática: uma única query Overpass extraiu TODOS os POIs relevantes de Goiânia (escolas, saúde, parques, supermercados, farmácias, pontos de ônibus, bancos, postos) em 8 segundos: 2.635 elementos, 850 KB de JSON bruto que comprimem para 131 KB em gzip — cabe tranquilamente como arquivo estático embarcado no app. A qualidade do OSM em Goiânia é desigual: parques/praças estão muito bem mapeados (913), mas escolas (184 vs ~1.300 reais), farmácias (92) e pontos de ônibus (523 vs ~7.024 da RMTC) têm cobertura de 10-20%, exigindo complementação com o Catálogo de Escolas do INEP (CSV com lat/long) e a camada Mapa_SaudeFamilia do próprio ArcGIS da Prefeitura (mesmo servidor do cadastro, CORS liberado). Overture Maps (que desde set/2025 incorporou 6 milhões de POIs do Foursquare OS Places) serve como fonte offline complementar via GeoParquet, mas não para uso client-side direto.

### Overpass API: limites de uso confirmados e CORS habilitado (testado ao vivo)

Política oficial: ~10.000 requests/dia e ~1 GB/dia por usuário no servidor público overpass-api.de (2 servidores, ~1 milhão req/dia de capacidade, compartilhados por ~30 mil usuários). Verifiquei por curl que o servidor responde com 'Access-Control-Allow-Origin: *' — funciona direto do navegador sem proxy. IMPORTANTE: requisições sem User-Agent decente retornam 406 Not Acceptable (testado). Query por raio testada: nwr[amenity~"school|hospital|clinic|pharmacy"](around:1000,-16.7078,-49.2680) no Setor Bueno retornou 73 POIs em 2,4 s. Mirrors sem rate-limit rígido: overpass.kumi.systems e overpass.private.coffee. Para um app com poucos usuários, uso on-demand é aceitável; para 570 mil inscrições, pré-computação é obrigatória.

**Fonte:** https://dev.overpass-api.de/overpass-doc/en/preface/commons.html e https://wiki.openstreetmap.org/wiki/Overpass_API

### Qualidade do OSM em Goiânia: medida ao vivo em 02/07/2026 — desigual por categoria

Contagens reais via Overpass na área administrativa de Goiânia (admin_level=8): escolas (amenity=school) = 184; hospitais+clínicas = 229; parques/praças (leisure=park) = 913; supermercados = 115; pontos de ônibus (highway=bus_stop) = 523; farmácias = 92. Comparando com a realidade: INEP registra ~1.300 escolas no município (cobertura OSM ~15%) e a RMTC opera ~7.024 pontos de ônibus na região metropolitana (cobertura OSM ~10%). Parques/praças e vias estão bem mapeados; comércio e transporte público estão subrepresentados. Conclusão: OSM sozinho gera score enviesado — precisa de fusão com fontes oficiais.

**Fonte:** Medição própria via https://overpass-api.de/api/interpreter + https://pt.wikipedia.org/wiki/RMTC_Goi%C3%A2nia (7.024 pontos)

### Extração completa de POIs de Goiânia cabe em ~131 KB gzip (testado)

Uma única query Overpass com area[name=Goiânia] cobrindo 14 categorias (escolas, creches, universidades, hospitais, clínicas, farmácias, polícia, bancos, postos de combustível, supermercados, shoppings, parques, academias, pontos de ônibus, estações) retornou 2.635 POIs com 'out center' em 7,9 s: 850 KB de JSON bruto, 131 KB gzipado. Removendo tags supérfluas (mantendo só nome, categoria, lat/lon), fica abaixo de 100 KB. Ou seja: o dataset inteiro de amenidades da cidade é MENOR que uma foto — pode ser embarcado no HTML ou servido como goiania-pois.json estático ao lado do app.

**Fonte:** Teste próprio com curl em https://overpass-api.de/api/interpreter (arquivos em scratchpad: full.json / full.json.gz)

### ArcGIS da própria Prefeitura tem camadas de amenidades no MESMO servidor do cadastro, com CORS

O diretório https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer (mesmo host da camada Feature_Base/MapServer/3 que o app já consome) expõe: Mapa_SaudeFamilia (FeatureServer + MapServer — unidades de saúde), Mapa_MeioAmbiente (parques/áreas verdes), Mapa_RedeViaria, Mapa_Limites (bairros), Mapa_Energia, Mapa_Saneamento. Verifiquei CORS: responde 'Access-Control-Allow-Origin' ecoando a origem. Vantagem: dado oficial municipal, zero dependência externa nova. Limitação: não há serviço explícito de escolas nem de pontos de ônibus nesse diretório; RMTC não publica GTFS aberto (só o app proprietário SiMRmtc), então pontos de ônibus/BRT ficam com OSM (que ao menos cobre bem o corredor BRT Eixo Anhanguera) ou coleta manual.

**Fonte:** https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer (verificado por WebFetch e curl)

### Catálogo de Escolas do INEP: todas as ~1.300 escolas de Goiânia com lat/long, CSV gratuito

O INEP Data permite exportar CSV do Catálogo de Escolas (educação básica, atualizado anualmente pelo Censo Escolar) com colunas de latitude/longitude em SIRGAS 2000 (EPSG 4674 — idêntico ao WGS84 na prática para este uso). Filtragem por município de Goiânia direto na interface. Ressalva verificada na literatura: nem toda escola tem coordenada, e parte é digitada manualmente (precisão variável) — mas mesmo com 80% de cobertura supera o OSM em 5x. Equivalente para saúde: CNES/DataSUS (estabelecimentos de saúde geocodificados). Ambos são dados públicos institucionais, sem dados pessoais — LGPD ok.

**Fonte:** https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/catalogo-de-escolas

### Overture Maps: GeoParquet gratuito que já engoliu o Foursquare OS Places — fonte de build, não de runtime

Overture distribui o tema 'places' em GeoParquet particionado no S3/Azure, licença CDLA-Permissive 2.0 (registros oriundos do Foursquare: Apache 2.0). No release de 24/09/2025 incorporou ~6 milhões de POIs do Foursquare OS Places (que por sua vez tem 104 milhões de POIs globais, Apache 2.0, parquet no S3: s3://fsq-os-places-us-east-1/). Extração por bbox de Goiânia: CLI 'overturemaps download -f geojson --type=place --bbox=-49.45,-16.83,-49.08,-16.55' ou DuckDB — roda offline em segundos e traz nome, categoria, confidence score. NÃO é consumível client-side (arquivos de GB, requer engine parquet), mas é a melhor fonte para enriquecer o arquivo estático no build: cobre exatamente as categorias fracas do OSM em Goiânia (comércio, farmácias, restaurantes).

**Fonte:** https://docs.overturemaps.org/guides/places/ + https://docs.overturemaps.org/blog/2025/09/24/release-notes/ + https://opensource.foursquare.com/os-places/

### Score de amenidades por quadra: viável e barato — Euclidiana em UTM dispensa até haversine

Como o cadastro já fornece coordenadas UTM (SIRGAS 2000 zona 22S) por inscrição, o caminho mais simples é projetar os ~2.600-5.000 POIs consolidados para UTM 22S no script de build (proj4js/pyproj) e embarcar já em UTM: no navegador a distância vira Pitágoras puro (Math.hypot), sem trigonometria. Com 5 mil POIs, calcular o score de 1 imóvel (contagem ponderada por categoria em raios de 400 m/1 km/2 km) custa <1 ms; nem precisa pré-computar por quadra — dá para computar on-the-fly por imóvel exibido. Pré-computar por quadra só valeria para ranking em massa (ex.: 'quadras com melhor score do bairro'), e mesmo assim seria um JSON de poucos MB. Atualização: rodar o script mensalmente e republicar o estático.

**Fonte:** Dimensionamento baseado nos testes próprios (2.635 POIs OSM / 131 KB gz) + http://proj4js.org/

**Recomendação:** Adotar arquitetura de duas camadas. (1) BUILD (offline, mensal): um script Node/Python que (a) roda UMA query Overpass pegando todos os POIs de Goiânia nas 14 categorias (testado: 8 s, 2.635 elementos) usando User-Agent identificado; (b) mescla com o CSV do Catálogo de Escolas INEP e a camada Mapa_SaudeFamilia do portalmapa (mesmo servidor do cadastro); (c) opcionalmente enriquece comércio com extrato Overture/Foursquare via CLI overturemaps por bbox; (d) deduplica por proximidade+nome, projeta tudo para UTM SIRGAS 2000 22S (mesmo sistema do cadastro) e emite goiania-pois.json (~100-150 KB gz) com {nome, categoria, x_utm, y_utm}. (2) RUNTIME (client-side): o app carrega esse estático uma vez e, para cada imóvel exibido, calcula com Math.hypot a contagem/distância mínima por categoria em raios de 400 m, 1 km e 2 km, gerando um score de amenidades 0-100 ponderado (ex.: escola/saúde peso alto, ponto de ônibus peso médio com ressalva de subcobertura OSM ~10%). Não usar Overpass em tempo real por imóvel — com 570 mil inscrições isso estoura a política de 10 mil req/dia e degrada UX; a chamada ao vivo (2,4 s) fica só como fallback opcional 'ver POIs no mapa agora'. LGPD: nenhuma dessas fontes contém dado pessoal. Atribuição obrigatória: '© OpenStreetMap contributors (ODbL)' e crédito INEP/Prefeitura no rodapé.

---

## benchmark-concorrentes (viabilidade: alta)

As ferramentas de inteligência imobiliária (Zillow, Redfin, PropStream, Loft, DataZap, Brain, Urbit) convergem em um núcleo de ~10 features: heatmap de preço/m², estimativa automática de valor (AVM) com faixa de incerteza, comparáveis da mesma localidade, histórico de valorização do bairro, score de competitividade/liquidez, e alertas de imóvel abaixo da mediana regional. Para Goiânia não existe ITBI aberto (diferente de SP, Recife, BH e Porto Alegre), então o preço real de transação é inacessível — mas o valor venal uniforme das 570 mil inscrições do cadastro permite replicar as features mais valiosas em versão "relativa": heatmap de R$/m² venal por quadra/bairro, comparáveis venais com quartis, flag de lote descontado versus a mediana da vizinhança e detector de terreno subutilizado. Complementos gratuitos: série FipeZap mensal de Goiânia (Excel/PDF da Fipe, desde 2013, só nível cidade) para o histórico de valorização, e POIs do OpenStreetMap para score de localização. A viabilidade client-side do pacote adaptado é alta; só AVM de preço de mercado e ranking de demanda por transações ficam fora do alcance sem dados pagos.

### Zillow — Zestimate, faixa de incerteza, heatmap de $/sqft e Market Heat Index

Zestimate (AVM por ML sobre 110M+ imóveis) sempre acompanhado de faixa estimada de venda (não um número seco); heatmaps de valor/ft² navegáveis por cidade; ZHVI (índice de valor por bairro com histórico e previsão); Market Heat Index mede aquecimento do mercado local. Dados agregados (ZHVI por região) são CSV gratuitos em zillow.com/research/data — mas só EUA. Lição de produto: mostrar valor + intervalo + tendência, nunca só o número.

**Fonte:** https://www.zillow.com/zestimate/ e https://www.zillow.com/research/market-heat-index-34054/

### Redfin — Compete Score, Hot Homes e Data Center gratuito

Compete Score 0–100 de competitividade da área (quanto acima do preço pedido as casas vendem, dias até proposta); badge 'Hot Home' (probabilidade de vender rápido); páginas de housing market por cidade/bairro com mediana, estoque e dias no mercado; Data Center com TSVs baixáveis gratuitos (só EUA). Requer dados de anúncios/tempo de venda — inviável para Goiânia sem scraping de portais.

**Fonte:** https://www.redfin.com/redfin-estimate e https://www.redfin.com/news/data-center/

### PropStream — heatmap multi-camada, comps com polígono desenhado e alertas automáticos

Heat Map filtrável por valor, aluguel, execuções; comps onde o usuário desenha um polígono no mapa e vê mediana/faixa dos comparáveis dentro dele; Lead Automator dispara alerta quando imóvel salvo passa a casar com critérios (ex.: preço abaixo do mercado). É o padrão-ouro da feature 'oportunidade abaixo da mediana'. Pago (~USD 100/mês), dados de registros públicos + MLS dos EUA.

**Fonte:** https://www.propstream.com/propstream-features e https://www.propstream.com/how-to-analyze-propstreams-heat-map

### Loft Dados — Especulômetro, Índice de Preço Real e Ranking de Demanda (base ITBI-SP)

Preço/m² mensal por bairro (117 bairros de SP) calculado sobre ITBI real da prefeitura, não anúncio; IPR mede a diferença entre preço anunciado nos portais e preço registrado no ITBI (spread de negociação); ranking de volume de vendas por bairro. Consulta gratuita no portal, sem API. Só funciona porque SP publica ITBI aberto — Goiânia não publica (verificado: portal da prefeitura só emite guia de ITBI; datasets abertos existem em SP, Recife, BH, Porto Alegre).

**Fonte:** https://portal.loft.com.br/o-que-e-especulometro/ e https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501

### DataZap / FipeZap — índice de preço com histórico longo, cobre Goiânia gratuitamente

Índice FipeZap residencial (venda e locação) cobre 56 cidades incluindo Goiânia, mensal desde ~2010, baseado em anúncios ZAP/VivaReal/OLX. Goiânia em jul/2026: R$ 8.352/m², +5,91% em 12 meses. PDF/Excel gratuitos em downloads.fipe.org.br/indices/fipezap/. Limitação: granularidade é cidade, não bairro (dados por bairro são do produto pago DataZap Pro). É a única série histórica gratuita de valorização para Goiânia.

**Fonte:** https://www.fipe.org.br/pt-br/indices/fipezap/ e https://downloads.fipe.org.br/indices/fipezap/fipezap-202512-residencial-venda-pub.pdf

### Brain Inteligência Estratégica — Geobrain: georreferenciamento de lançamentos e estoque concorrente

Plataforma paga B2B (incorporadoras): mapa de empreendimentos lançados, velocidade de vendas (VSO), estoque, perfil da localização; censo imobiliário em 850 cidades. Nada é público/gratuito. Lição de feature: cruzar oferta nova (lançamentos) com a localização do lote — replicável parcialmente observando no cadastro de Goiânia lotes com dtinclusao recente e uso 'apartamento' (novas torres = eixo de valorização).

**Fonte:** https://brain.srv.br/produtos/mercado-imobiliario

### Urbit — AVM de apartamentos, consolidador de anúncios e Explorer de prospecção de áreas

URBIT AVM avalia apartamento combinando anúncios de portais + demografia + serviços + infraestrutura da região; Imóveis em Oferta consolida anúncios e exporta estatísticas de preço para planilha; Explorer é geoprocessamento para achar áreas com vocação para novos empreendimentos. Pago, sem camada gratuita relevante. A feature 'vocação de área / prospecção de terreno' é a mais transplantável para o Radar (via razão área construída ÷ área do terreno do próprio cadastro).

**Fonte:** https://urbit.com.br/

### EmCasa e QuintoAndar QPreço — avaliadores online gratuitos, mas caixa-preta e sem GO

EmCasa tem avaliador gratuito (emcasa.com/avaliar) por formulário, focado em SP/RJ; QPreço (QuintoAndar) estima valor de venda usando anúncios ativos, transações públicas e tendências. Ambos são lead-gen: devolvem um número, sem mapa, sem API, cobertura fraca/ausente em Goiânia. Kzas (kzas.com.br) descontinuou/pivotou e não expõe ferramenta de dados verificável; Imóvel Guide oferece 'avaliação grátis' que mostra concorrência de similares no bairro e tempo médio de venda, mas exige cadastro e é opaca metodologicamente.

**Fonte:** https://www.emcasa.com/avaliar e https://imovelguide.com.br/avaliacao-de-imovel-gratis

### Dados públicos utilizáveis para Goiânia além do cadastro ArcGIS

(1) FipeZap Goiânia: Excel mensal gratuito, cidade-nível, desde 2013. (2) MySide MyIndex: página gratuita com histórico FipeZap de Goiânia tabulado e ranking de bairros mais caros (Marista R$ 10.697/m², Bueno R$ 9.325/m² — mas por bairro só pontualmente, sem série). (3) OpenStreetMap/Overpass API: POIs gratuitos (escolas, hospitais, parques, comércio) para score de localização. (4) ITBI aberto: NÃO existe para Goiânia. (5) O próprio cadastro: vllanc98 vs valor venal atual dá um multiplicador de valorização fiscal 1998→hoje por lote, único proxy histórico hiperlocal disponível.

**Fonte:** https://myside.com.br/guia-goiania/valor-metro-quadrado-goiania-myindex

### Top 10 features ranqueadas por viabilidade client-side com dados públicos de Goiânia

ALTA: (1) Heatmap de R$/m² venal por quadra/bairro (padrão Zillow/PropStream — agregação client-side das 570k inscrições, render em Leaflet/canvas); (2) Comparáveis da mesma localidade com mediana/quartis de R$/m² venal filtrando mesmo bairro+uso+faixa de área (padrão PropStream comps), exibindo faixa e posição do imóvel nela; (3) Flag 'abaixo da mediana': % de desconto do lote vs mediana venal da quadra/bairro (padrão PropStream Lead Automator, versão estática); (4) Detector de terreno subutilizado: baixa razão construído/terreno em quadra de venal alto (padrão Urbit Explorer/Geobrain); (5) Score de localização 0–100 por proximidade a POIs do OSM (padrão Urbit AVM/Walk Score). MÉDIA: (6) Histórico de valorização: série FipeZap cidade embutida como JSON estático + multiplicador venal/vllanc98 por lote como proxy hiperlocal; (7) 'Termômetro de dinamismo' do bairro via densidade de dtinclusao/dtultalter recentes (proxy fraco do Market Heat/Compete Score); (8) AVM simplificada: fator de conversão venal→mercado calibrado à mão por bairro (amostra de anúncios), sempre com faixa de incerteza à la Zestimate. BAIXA: (9) Índice preço anunciado vs preço real (exige ITBI aberto — Goiânia não tem — ou scraping de portais, que viola ToS); (10) Ranking de demanda/volume de transações por bairro (mesma dependência de ITBI; sem fonte gratuita).

**Fonte:** Síntese das fontes acima (Zillow, Redfin, PropStream, Loft, FipeZap, Urbit, Brain)

**Recomendação:** Implementar primeiro o trio de maior valor/menor custo, tudo derivado do dataset que o app já consome: (1) comparáveis venais — ao abrir uma inscrição, buscar no mesmo endpoint os lotes do mesmo bairro/quadra com mesmo uso, calcular mediana e quartis de R$/m² venal e mostrar onde o imóvel cai na faixa (é a 'análise de comparáveis da mesma localidade' de PropStream/Redfin em versão fiscal); (2) flag de oportunidade — badge automático quando o R$/m² venal do lote está X% abaixo da mediana da vizinhança, com explicação do cálculo; (3) heatmap venal — pré-agregar (script offline) as 570k inscrições em um JSON estático de mediana R$/m² por bairro/quadra e renderizar como choropleth no mapa, evitando puxar tudo em runtime. Em seguida: score de localização via Overpass/OSM (cacheável em arquivo estático) e a aba 'valorização' combinando a série FipeZap de Goiânia (Excel da Fipe convertido para JSON, atualizado manualmente por mês) com o multiplicador venal-atual/vllanc98 do lote como indicador hiperlocal de longo prazo — deixando claro na UI que valor venal ≠ preço de mercado e que o índice cidade-nível é anúncio, não transação. Evitar prometer AVM de preço de mercado: sem ITBI aberto em Goiânia, qualquer número absoluto seria chute; a força do app está em análise RELATIVA (percentis, desconto vs mediana, subutilização), que é justamente o que corretor/investidor usa para triar oportunidade.
