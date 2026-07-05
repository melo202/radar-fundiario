# Relatorio de geracao — bairros-goiania.json

Gerado em: 2026-07-05

## Completude de paginacao (DADOS-02)

- Total reportado pelo servidor (`returnCountOnly`): **1206**
- Total efetivamente coletado via paginacao explicita (`resultOffset`, paginas de 500): **1206** (assert `len(features) == returnCountOnly` passou — nenhum `OBJECTID` [a chave primaria real] duplicado entre paginas; ver secao abaixo sobre uma colisao no campo de negocio `id`, que NAO afeta esta garantia de completude)
- Nao se confiou na resposta default sem paginacao: mesmo que o `maxRecordCount` atual do layer (1.000.000) devolva tudo numa unica chamada hoje, isso e uma config momentanea do servidor, nao uma garantia — o script pagina explicitamente de qualquer forma.

## Nomeados vs. nao-nomeados (Glebas rurais)

- Bairros com `nm_bai` preenchido: **740**
- Bairros sem nome (`nm_bai` nulo/vazio — Glebas rurais, `tp_bai="Glb"`): **466**

## Integridade do join bairro (layer 2) <-> cdbairro (layer 3) — DADOS-02

- Distinct `cdbairro` na layer 3 (setores fiscais): **709**
- Total de poligonos de bairro na layer 2 (`id`/`nm_bai`): **1206**

**Conclusao: 709 (setores fiscais, layer 3) e 1206 (divisas de bairro, layer 2) sao unidades administrativas DIFERENTES, mantidas por processos distintos, sem chave de join confiavel entre elas.**

Evidencias:
1. A discrepancia de contagem (1206 vs 709) e estrutural, nao um artefato de paginacao truncada — ambas as contagens foram verificadas como completas de forma independente (a layer 2 bate `returnCountOnly` com a coleta paginada; a consulta de valores distintos da layer 3 nao reportou truncamento).
2. 466 dos 1206 poligonos da layer 2 nao tem nome (`nm_bai` nulo/vazio, `tp_bai="Glb"` — Gleba, um lote rural nao loteado). Um codigo `cdbairro` de setor fiscal, por definicao, e uma unidade tributavel e descrita — nao existe "setor sem nome". Isso prova por si so que as duas layers modelam coisas diferentes: layer 2 inclui subdivisoes geograficas/cartograficas cruas (algumas literalmente sem nome), enquanto o `cdbairro` da layer 3 e uma classificacao fiscal.
3. Nao ha convencao de nome/chave que conecte as duas: o `id` da layer 2 e um codigo de 12 caracteres (ex.: `000400000603`) sem semelhanca visivel com os codigos inteiros pequenos de `cdbairro` da layer 3 (ex.: `3`). Nao existe campo na layer 2 com um valor no formato de `cdbairro`, nem campo na layer 3 com um valor no formato do `id` de 12 caracteres.

**Por isso, NENHUM lookup id->cdbairro e construido por este script.** A Fase 3 (drill-down por bairro) deve continuar usando consultas espaciais de viewport/envelope contra a layer 0 (como `refreshLots()` ja faz hoje), o que dispensa qualquer join.

## Qualidade do dado de origem: `id` nao e uma chave unica

Achado ao vivo durante a geracao: **1** valor(es) do campo de negocio `id` aparecem em mais de um `OBJECTID` (a chave primaria real do ArcGIS) na layer 2: `['000400001169']`. Exemplo confirmado: `id="000400001169"` existe em OBJECTID 13171 (`nm_bai=null`) e OBJECTID 31584 (`nm_bai=" "`) — duas features distintas (geometrias diferentes) com o mesmo `id`, provavel duplicata de cadastro na fonte, nao um bug de paginacao deste script.

**Por isso, o guard de duplicata-entre-paginas deste script usa `OBJECTID`, nao `id`, como chave de unicidade** — usar `id` geraria falso-positivo e abortaria uma coleta legitimamente completa. Isso reforca ainda mais a decisao de NAO construir nenhum lookup indexado por `id`: o campo nao e garantidamente unico.

## Fonte avaliada e rejeitada: CKAN bai.json

O export aberto da Prefeitura (`bai.json`, CKAN) foi avaliado e **rejeitado** como fonte primaria: dados de 2018-09-18 (defasado), apenas 1.155 features (66 a menos que a layer 2 ao vivo), sem documentacao de CRS na pagina publica do dataset (embora o arquivo em si declare EPSG:31982 internamente). A layer 2 ao vivo do ArcGIS foi usada como fonte unica por ser mais completa e atual.

## Reconciliacao de nomes (NOMES-01/03)

- Total de poligonos reconciliados: **1205**
- Recuperados-de-branco (`nm_bai` original vazio, nome achado via join): **391**
- Nomes-mudados (`nm_bai` original preenchido, mas divergia do nome autoritativo): **726**
- Nao-resolvidos (0 candidatos espaciais — gleba/terra vaga sem parcela; rotulados `"Gleba não denominada"`): **86**

Quebra por motivo de resolucao:

- `unico` (1 candidato espacial, sem ambiguidade): **339**
- `nome` (2+ candidatos, desambiguado por tie-break de nome): **396**
- `maioria` (2+ candidatos, desambiguado por maior contagem de parcelas): **384**
- `sem-parcela` (0 candidatos — nao resolvido, rotulo generico aplicado): **86**
- `erro-endpoint` (falha persistente do endpoint apos retries — nao resolvido nesta execucao, nome original mantido como fallback; reprocessavel num re-run/resume): **0**

### Tabela de diff — antes -> depois por poligono

| id | nm_bai_original | nmbairro_reconciled | motivo |
|---|---|---|---|
| 000400000001 | Central | SET CENTRAL | unico |
| 000400000002 | Aeroporto | SET AEROPORTO | nome |
| 000400000003 | Oeste | SET OESTE | unico |
| 000400000004 | Sul | SET SUL | nome |
| 000400000005 | Leste Universitário | SET LESTE UNIVERSITARIO | nome |
| 000400000006 | Leste Vila Nova | SET LESTE VILA NOVA | nome |
| 000400000007 | dos Funcionários | SET DOS FUNCIONARIOS | nome |
| 000400000008 | Nova Vila | LOT NOVA VILA | nome |
| 000400000009 | Norte Ferroviário | SET NORTE FERROVIARIO | maioria |
| 000400000010 | Campinas | SET CAMPINAS | nome |
| 000400000011 | Coimbra | SET COIMBRA | unico |
| 000400000012 | Marista | SET MARISTA | unico |
| 000400000013 | Pedro Ludovico | SET PEDRO LUDOVICO | nome |
| 000400000014 | Bueno | SET BUENO | nome |
| 000400000015 | Jardim América | BRO JARDIM AMERICA | nome |
| 000400000016 | Bela Vista | SET BELA VISTA | unico |
| 000400000017 | Nova Suiça | BRO NOVA SUICA | nome |
| 000400000018 | Sudoeste | SET SUDOESTE | nome |
| 000400000019 | Sol Nascente | SET SOL NASCENTE | nome |
| 000400000020 | Boa Sorte | VI BOA SORTE | nome |
| 000400000021 | Aguiar | VI AGUIAR | nome |
| 000400000022 | Castelo Branco | SET CASTELO BRANCO | nome |
| 000400000023 | Aurora | VI AURORA | nome |
| 000400000024 | Rodoviário | BRO RODOVIARIO | nome |
| 000400000025 | dos Aeroviários | BRO AEROVIARIO | maioria |
| 000400000026 | Oswaldo Rosa | VI OSWALDO ROSA | nome |
| 000400000027 | do Anicuns | ESP DO ANICUNS | nome |
| 000400000028 | São José | SET SAO JOSE | maioria |
| 000400000029 | João Vaz | VI JOAO VAZ | nome |
| 000400000030 | Capuava | BRO CAPUAVA | nome |
| 000400000031 | Ipiranga | BRO IPIRANGA | nome |
| 000400000032 | São Francisco | BRO SAO FRANCISCO | nome |
| 000400000033 | Petrópolis | JD PETROPOLIS | maioria |
| 000400000034 | Cidade Jardim | SET CIDADE JARDIM | nome |
| 000400000035 | Guadalajara | CONJ GUADALAJARA - SET CI | nome |
| 000400000036 | Industrial Mooca | BRO INDUSTRIAL MOOCA | nome |
| 000400000037 | Nossa Senhora de Fátima | BRO NOSSA SENHORA DE FATI | maioria |
| 000400000038 | Santa Rita | VI SANTA RITA | maioria |
| 000400000039 | Goiá | BRO GOIA | maioria |
| 000400000040 | Mirabel | JD MIRABEL | nome |
| 000400000041 | Nova Canaã | VI NOVA CANAA | nome |
| 000400000042 | Viandelli | VI VIANDELLI | nome |
| 000400000043 | Anchieta | VI ANCHIETA | nome |
| 000400000044 | Lucy | VI LUCY | nome |
| 000400000045 | Mauá | VI MAUA | nome |
| 000400000046 | Adélia | VI ADELIA | nome |
| 000400000047 | Oeste Industrial | PRQ OESTE INDUSTRIAL | maioria |
| 000400000048 | Ana Lúcia | JD ANA LUCIA | nome |
| 000400000049 | Europa | JD EUROPA | nome |
| 000400000050 | União | SET UNIAO | nome |
| 000400000051 | Planalto | JD PLANALTO | nome |
| 000400000052 | Rezende | VI REZENDE | nome |
| 000400000053 | Anhanguera | PRQ ANHANGUERA | maioria |
| 000400000054 | Vila Boa | JD VILA BOA | unico |
| 000400000055 | Presidente | JD PRESIDENTE | nome |
| 000400000056 | Prive Atlântico | JD ATLANTICO | unico |
| 000400000057 | Atlântico | JD ATLANTICO | nome |
| 000400000058 | Rosa | VI ROSA | unico |
| 000400000059 | Amazônia | PRQ AMAZONIA | nome |
| 000400000060 | da Serrinha | BRO SERRINHA | maioria |
| 000400000061 | Jardim das Esmeraldas | BRO JARDIM DAS ESMERALDAS | unico |
| 000400000062 | Santo Antônio | JD SANTO ANTONIO | unico |
| 000400000063 | da Luz | JD DA LUZ | nome |
| 000400000064 | Redenção | VI REDENCAO | nome |
| 000400000065 | Alto da Glória | BRO ALTO DA GLORIA | unico |
| 000400000066 | Maria José | VI MARIA JOSE | nome |
| 000400000067 | São João | VI SAO JOAO | nome |
| 000400000068 | Goiás | JD GOIAS | maioria |
| 000400000069 | Jardim Vitória | JD VITORIA | maioria |
| 000400000070 | Novo Mundo | JD NOVO MUNDO | maioria |
| 000400000071 | Maria Luiza | VI MARIA LUIZA | nome |
| 000400000072 | Brasil | JD BRASIL | nome |
| 000400000073 | Parque Santa Maria | VI PARQUE SANTA MARIA | nome |
| 000400000074 | Jardim Califórnia | BRO JARDIM CALIFORNIA | nome |
| 000400000075 | Califórnia - Parque Industrial | JD CALIFORNIA PARQUE INDU | maioria |
| 000400000076 | Romana | VI ROMANA | nome |
| 000400000077 | Bandeirantes | VI BANDEIRANTES | nome |
| 000400000078 | Botafogo | CH BOTAFOGO | nome |
| 000400000079 | Botafogo | CH BOTAFOGO | nome |
| 000400000080 | Gleba | CH BOTAFOGO | maioria |
| 000400000081 | Martins | VI MARTINS | unico |
| 000400000082 | Morais | VI MORAIS | nome |
| 000400000083 | Santa Isabel | VI SANTA ISABEL | nome |
| 000400000084 | Feliz | BRO FELIZ | nome |
| 000400000085 | Viana | VI VIANA | nome |
| 000400000086 | Caiçara | VI SANTA MARIA - CONJUNTO | maioria |
| 000400000087 | (sem nome) | FAZ RETIRO | unico |
| 000400000088 | Retiro | FAZ RETIRO | unico |
| 000400000089 | Jaó | SET JAO | nome |
| 000400000090 | Guanabara | JD GUANABARA | nome |
| 000400000091 | Santa Genoveva | BRO SANTA GENOVEVA | nome |
| 000400000092 | Monticelli | VI MONTICELLI | nome |
| 000400000093 | Criméia Leste | SET CRIMEIA LESTE | nome |
| 000400000094 | Criméia Oeste | SET CRIMEIA OESTE | nome |
| 000400000095 | São Luiz | VI SAO LUIZ | nome |
| 000400000096 | Nossa Senhora Aparecida | VI NOSSA SENHORA APARECID | maioria |
| 000400000097 | São Francisco | VI SAO FRANCISCO | unico |
| 000400000098 | Isaura | VI ISAURA | nome |
| 000400000099 | Xavier | VI XAVIER | nome |
| 000400000100 | Abajá | VI ABAJA | nome |
| 000400000101 | Vera Cruz | VI VERA CRUZ | nome |
| 000400000102 | Santa Helena | VI SANTA HELENA | nome |
| 000400000103 | Ofugi | VI OFUGI | nome |
| 000400000104 | Urias Magalhães | SET URIAS MAGALHAES | maioria |
| 000400000105 | Irany | VI IRANY | nome |
| 000400000106 | Clemente | VI CLEMENTE | nome |
| 000400000107 | (sem nome) | CH RETIRO | maioria |
| 000400000108 | Candida de Morais | SET CANDIDA DE MORAIS | nome |
| 000400000109 | Santos Dumont | SET SANTOS DUMONT | nome |
| 000400000110 | Regina | VI REGINA | nome |
| 000400000111 | Novo Horizonte | SET NOVO HORIZONTE | nome |
| 000400000112 | Jardim Diamantina | BRO JARDIM DIAMANTINA | unico |
| 000400000113 | Perim | SET PERIM | nome |
| 000400000114 | Progresso | SET PROGRESSO | nome |
| 000400000115 | Maria Dilce | VI MARIA DILCE | nome |
| 000400000116 | Cristina | VI CRISTINA | nome |
| 000400000117 | Santo Hilário | BRO SANTO HILARIO | maioria |
| 000400000118 | Concórdia | VI CONCORDIA | unico |
| 000400000119 | Pedroso | VI PEDROSO | nome |
| 000400000120 | Megale | VI MEGALE | unico |
| 000400000121 | (sem nome) | AER INTERNACIONAL SANTA G | maioria |
| 000400000122 | Cachoeira Dourada | CONJ CACHOEIRA DOURADA | nome |
| 000400000123 | das Laranjeiras | PRQ DAS LARANJEIRAS | maioria |
| 000400000124 | Industrial João Braz | PRQ JOAO BRAZ - CIDADE IN | maioria |
| 000400000125 | Bela Vista | JD BELA VISTA | unico |
| 000400000126 | Recreio do Funcionário Publico | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000127 | Mariliza | JD MARILIZA | nome |
| 000400000128 | Industrial Paulista | PRQ INDUSTR PAULISTA | maioria |
| 000400000129 | Balneário Meia Ponte | JD BALNEARIO MEIA PONTE | nome |
| 000400000130 | Anhangüera | CH ANHANGUERA | nome |
| 000400000131 | Jardim São Judas Tadeu | VI JARDIM SAO JUDAS TADEU | nome |
| 000400000132 | Jardim Pompéia | VI JARDIM POMPEIA | nome |
| 000400000133 | Buritis | CH BURITIS | nome |
| 000400000134 | Panorama | SIT DE RECREIO PANORAMA | maioria |
| 000400000135 | Mansões Rosa de Ouro | CH MANSOES ROSA DE OURO | nome |
| 000400000136 | Maringá | CH MARINGA | maioria |
| 000400000137 | Ipê | SIT DE RECREIO IPE | nome |
| 000400000138 | Itatiaia | VI ITATIAIA | nome |
| 000400000139 | Bom Jesus | PRQ BOM JESUS | nome |
| 000400000140 | Aldeia do Vale | RES ALDEIA DO VALE | nome |
| 000400000141 | Parque Tremendão | SET PARQUE TREMENDAO | nome |
| 000400000142 | Alto da Glória | CH ALTO DA GLORIA | maioria |
| 000400000143 | Bom Retiro | CH BOM RETIRO | unico |
| 000400000144 | Califórnia | CH CALIFORNIA | nome |
| 000400000145 | Coimbra | CH COIMBRA | nome |
| 000400000146 | (sem nome) | VI LUCIANA | maioria |
| 000400000147 | São Francisco de Assis | CH SAO FRANCISCO DE ASSIS | nome |
| 000400000148 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000149 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000150 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000151 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000152 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000153 | (sem nome) | FAZ GAMELEIRA | unico |
| 000400000154 | (sem nome) | SET SANTOS DUMONT | maioria |
| 000400000155 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000156 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000157 | Aeronáutico Antônio Sebba Filho | FAZ CAVEIRAS | maioria |
| 000400000158 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000159 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000160 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000161 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000162 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000163 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000164 | Mansões Goianas | LOT MANSOES GOIANAS | nome |
| 000400000165 | das Nações | PRQ DAS NACOES | nome |
| 000400000166 | Morada do Sol | SET MORADA DO SOL | nome |
| 000400000167 | Atheneu | PRQ ATHENEU | nome |
| 000400000168 | de Recreio São Joaquim | CH DE RECREIO SAO JOAQUIM | nome |
| 000400000169 | Teófilo Neto | VI TEOFILO NETO (SETOR AR | nome |
| 000400000170 | dos Bandeirantes | SIT DE R DOS BANDEIRANTES | unico |
| 000400000171 | Rizzo | VI RIZZO | nome |
| 000400000172 | Gleba | BRO JARDIM BOTANICO | maioria |
| 000400000173 | Santana | VI SANTANA | nome |
| 000400000174 | Vera Cruz | CONJ VERA CRUZ | nome |
| 000400000175 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000177 | Granjas Brasil | Gleba não denominada | sem-parcela |
| 000400000178 | Guanabara | RES GUANABARA | maioria |
| 000400000179 | Yara | CONJ RESIDENCIAL YARA | nome |
| 000400000180 | Nossa Senhora da Piedade | CH N SRA DA PIEDADE | maioria |
| 000400000181 | Nossa Senhora da Piedade | CH N SRA DA PIEDADE | maioria |
| 000400000182 | São Silvestre | CH SAO SILVESTRE | nome |
| 000400000183 | Goiânia 2 | LOT GOIANIA 2 | nome |
| 000400000184 | Santa Rita | PRQ SANTA RITA | maioria |
| 000400000185 | Cidade Pompeu | Gleba não denominada | sem-parcela |
| 000400000186 | Rio Branco | CH RIO BRANCO | unico |
| 000400000187 | Santa Rita | CH SANTA RITA | maioria |
| 000400000188 | Maracanã | PRQ MARACANA | nome |
| 000400000189 | Maria Rosa | VI MARIA ROSA | nome |
| 000400000190 | Estrela Dalva | SET ESTRELA DALVA | nome |
| 000400000191 | Bela | VI BELA | unico |
| 000400000192 | Retiro | CH RETIRO | maioria |
| 000400000193 | Retiro | CH RETIRO | maioria |
| 000400000194 | Casa Grande | VLG CASA GRANDE | nome |
| 000400000195 | Marechal Rondon | SET MARECHAL RONDON | nome |
| 000400000196 | Leblon | JD LEBLON | nome |
| 000400000197 | Fernandes | VI FERNANDES | nome |
| 000400000198 | Alvorada | VI ALVORADA | nome |
| 000400000199 | Cruzeiro do Sul | GRJ CRUZEIRO DO SUL | unico |
| 000400000200 | Americano do Brasil | VI AMERICANO DO BRASIL | nome |
| 000400000201 | Cristina | SET CRISTINA | nome |
| 000400000202 | Fabiana | CONJ FABIANA | nome |
| 000400000203 | Matilde | VI MATILDE | unico |
| 000400000204 | Anhanguera | BRO ANHANGUERA | maioria |
| 000400000205 | Anhangüera | CONJ ANHANGUERA | unico |
| 000400000206 | Bethel | VI BETHEL | nome |
| 000400000207 | Riviera | CONJ RIVIERA | nome |
| 000400000208 | Negrão de Lima | SET NEGRAO DE LIMA | nome |
| 000400000209 | Santa Efigênia | VI SANTA EFIGENIA | nome |
| 000400000210 | Jaraguá | VI JARAGUA | nome |
| 000400000211 | Luciana | VI LUCIANA | nome |
| 000400000212 | Alpes | VI ALPES | nome |
| 000400000213 | Perdiz | VI PERDIZ | nome |
| 000400000214 | Habitacional Aruanã I | CONJ RESIDENCIAL ARUANA I | maioria |
| 000400000215 | Habitacional Aruanã II | CONJ RESIDENCIAL ARUANA I | maioria |
| 000400000216 | Habitacional Aruanã III | CONJ RES. ARUANA III | maioria |
| 000400000217 | Gentil Meirelles | SET GENTIL MEIRELLES | nome |
| 000400000218 | Estâncias Vista Alegre | LOT ESTANCIAS VISTA ALEGR | unico |
| 000400000219 | Paraíso | VI PARAISO | nome |
| 000400000220 | Froes | VI FROES | nome |
| 000400000221 | Industrial Pedro Abrão | ZON INDUSTR PEDRO ABRAO | maioria |
| 000400000222 | Colemar Natal e Silva | VI COLEMAR NATAL E SILVA | nome |
| 000400000223 | Andréia | SET ANDREIA | nome |
| 000400000224 | Santo Afonso | VI SANTO AFONSO | nome |
| 000400000225 | (sem nome) | FAZ DOURADOS | unico |
| 000400000226 | São José | CH SAO JOSE | nome |
| 000400000227 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000228 | Empresarial | SET EMPRESARIAL | nome |
| 000400000229 | das Amendoeiras | PRQ DAS AMENDOEIRAS | maioria |
| 000400000230 | Helou | CH HELOU | nome |
| 000400000231 | Faiçalville | LOT FAICALVILLE | nome |
| 000400000232 | (sem nome) | JD BALNEARIO MEIA PONTE | maioria |
| 000400000233 | (sem nome) | LOT PORTAL DO SOL I | maioria |
| 000400000234 | Panorama Parque | LOT PANORAMA PARQUE | nome |
| 000400000235 | Maria Dilce | VI  MARIA DILCE | nome |
| 000400000236 | Maria Dilce | VI  MARIA DILCE | unico |
| 000400000237 | Maria Dilce | VI  MARIA DILCE | unico |
| 000400000238 | Maria Dilce | VI MARIA DILCE | maioria |
| 000400000239 | Elísios Campos | SET LESTE VILA NOVA | maioria |
| 000400000240 | Industrial de Goiânia | PRQ INDUSTRIAL DE GOIANIA | nome |
| 000400000241 | Morada Nova | CONJ MORADA NOVA | nome |
| 000400000242 | Morada Nova | CONJ MORADA NOVA | nome |
| 000400000243 | Acalanto | PRQ ACALANTO | unico |
| 000400000244 | Shangry-la | LOT SHANGRY LA | maioria |
| 000400000245 | Finsocial | VI FINSOCIAL | nome |
| 000400000246 | Canaã | VI CANAA | maioria |
| 000400000247 | Padre Pelágio | SET SAO JOSE - CJ PADRE P | maioria |
| 000400000248 | Rodoviário | CONJ RESID RODOVIARIO | nome |
| 000400000249 | Santos Dumont | GRJ SANTOS DUMONT | nome |
| 000400000250 | Buriti | PRQ BURITI | nome |
| 000400000251 | Mansões do Campus | SIT DE R M DO CAMPUS | maioria |
| 000400000252 | Santa Rita | COD SANTA RITA | nome |
| 000400000253 | Centro Oeste | SET CENTRO OESTE | nome |
| 000400000254 | Romildo F. R. do Amaral | CONJ ROMILDO FERREIRA DO | unico |
| 000400000255 | Jacaré | VI JACARE | nome |
| 000400000256 | Santa Cruz | PRQ SANTA CRUZ | nome |
| 000400000257 | (sem nome) | CH SAO JOSE - PUC CAMPUS | maioria |
| 000400000258 | Mooca | VI SANTA RITA | maioria |
| 000400000259 | Celina Park | LOT CELINA PARK | nome |
| 000400000260 | Salinos | FAZ SALINOS | unico |
| 000400000261 | Nova Esperança | JD NOVA ESPERANCA | nome |
| 000400000262 | Lageado | JD LAGEADO | nome |
| 000400000263 | do Governador | CH DO GOVERNADOR | nome |
| 000400000264 | Rio Branco | COD RIO BRANCO | nome |
| 000400000265 | Aritana | JD ARITANA | nome |
| 000400000266 | Rio Formoso | SET RIO FORMOSO GLEBAS DE | nome |
| 000400000267 | (sem nome) | SIT RECR MAN BERNARDO SAY | maioria |
| 000400000268 | Mutirão I | VI MUTIRAO I | unico |
| 000400000269 | Vila Isabel | CONJ VILA IZABEL | maioria |
| 000400000270 | Aurora Oeste | VI AURORA OESTE | nome |
| 000400000271 | Alphaville Residencial | LOT ALPHAVILLE RESIDENCIA | maioria |
| 000400000272 | Marques de Abreu | JD MARQUES DE ABREU | unico |
| 000400000273 | Legionárias | VI LEGIONARIAS | unico |
| 000400000274 | Recanto das Minas Gerais | SET RECANTO DAS MINAS GER | maioria |
| 000400000275 | Privê Norte | RES PRIVE NORTE | unico |
| 000400000276 | Cidade Universitária | COD CIDADE UNIVERSITARIA | unico |
| 000400000277 | Lorena Parque | LOT LORENA PARQUE | unico |
| 000400000278 | Araguaia Park | LOT ARAGUAIA PARQUE | maioria |
| 000400000279 | Solange Parque I | LOT SOLANGE PARQUE I | maioria |
| 000400000280 | Solange Parque II | LOT SOLANGE PARQUE II | maioria |
| 000400000281 | Solange Parque III | LOT SOLANGE PARQUE III | nome |
| 000400000282 | Paraíso | PRQ PARAISO | nome |
| 000400000283 | (sem nome) | FAZ PETROPOLIS | unico |
| 000400000284 | Retiro ou Petrópolis | FAZ PETROPOLIS | unico |
| 000400000285 | dos Oficiais | Gleba não denominada | sem-parcela |
| 000400000286 | São Geraldo | SIT DE REC SAO GERALDO | nome |
| 000400000287 | Sevene | SET SEVENE | nome |
| 000400000288 | Dom Fernando II | JD DOM FERNANDO II | unico |
| 000400000289 | Aroeiras | JD DAS AROEIRAS | nome |
| 000400000290 | Liberdade | JD LIBERDADE | nome |
| 000400000291 | (sem nome) | VI SANTA MARIA - CONJUNTO | maioria |
| 000400000292 | Palmares | CONJ RESIDENCIAL PALMARES | nome |
| 000400000293 | Curitiba | JD CURITIBA | nome |
| 000400000294 | Anhangüera | COD ANHANGUERA | maioria |
| 000400000295 | Sonho Verde Complemento | RES SONHO VERDE | maioria |
| 000400000296 | Sonho Verde | RES SONHO VERDE | nome |
| 000400000297 | Recreio Panorama | REC PANORAMA | maioria |
| 000400000298 | Norte Ferroviário II | SET NORTE FERROVIARIO II | nome |
| 000400000299 | das Nações | SET DAS NACOES | unico |
| 000400000300 | Alto da Glória | VI ALTO DA GLORIA | maioria |
| 000400000301 | Alto da Glória I | VI ALTO DA GLORIA | unico |
| 000400000302 | Grande Retiro | LOT GRANDE RETIRO | maioria |
| 000400000303 | Guanabara II | JD GUANABARA II | maioria |
| 000400000304 | Guanabara III | JD GUANABARA III | nome |
| 000400000306 | Morada do Bosque | RES MORADA DO BOSQUE | nome |
| 000400000307 | Santo Hilário II | BRO SANTO HILARIO II | nome |
| 000400000308 | Eldorado | RES ELDORADO | maioria |
| 000400000309 | Monte Carlo | RES MONTE CARLO | unico |
| 000400000310 | Fortaleza | RES FORTALEZA | unico |
| 000400000311 | Novo Mundo II | JD NOVO MUNDO II | nome |
| 000400000312 | Santa Rita - 4a etapa | RES SANTA RITA 4 ETAPA | maioria |
| 000400000313 | Ulisses Guimarães | SET ULISSES GUIMARAES | nome |
| 000400000314 | Tancredo Neves | SET TANCREDO NEVES | nome |
| 000400000315 | Bougainville | VLG CASA GRANDE | maioria |
| 000400000316 | (sem nome) | LOT CAROLINA PARQUE COMPL | maioria |
| 000400000317 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000318 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000319 | São Marcos I | RES SAO MARCOS I | nome |
| 000400000320 | (sem nome) | RES PARQUE MENDANHA | maioria |
| 000400000321 | Senador Paranhos | RES SENADOR PARANHOS | nome |
| 000400000322 | Itaipú | RES ITAIPU | nome |
| 000400000323 | Adélia I e III | VI ADELIA I E III | nome |
| 000400000324 | Urias Magalhães II | SET URIAS MAGALHAES II | unico |
| 000400000325 | Roriz | SET URIAS MAGALHAES II | maioria |
| 000400000326 | Goiá Setor Veloso | BRO GOIA SETOR VELOSO | nome |
| 000400000327 | Novo Planalto | SET NOVO PLANALTO | nome |
| 000400000329 | Green Park | RES GREEN PARK | nome |
| 000400000330 | Guanabara IV | JD GUANABARA IV | nome |
| 000400000331 | Goiá 2 | BRO GOIA 2 | nome |
| 000400000332 | Maria Lourença | RES MARIA LOURENCA | unico |
| 000400000334 | Santa Tereza | VI SANTA TEREZA | nome |
| 000400000335 | (sem nome) | RES ALICE BARBOSA EXTENSA | maioria |
| 000400000336 | Santa Rita - 6a etapa | COD SANTA RITA 6 ETAPA | maioria |
| 000400000337 | Santa Rita - 5ª Etapa | VI SANTA RITA 5 ETAPA | maioria |
| 000400000338 | Santa Rita - 2a etapa | COD SANTA RITA 2 ETAPA | unico |
| 000400000339 | Santa Rita | BRO SANTA RITA | maioria |
| 000400000340 | Divino Pai Eterno | VI DIVINO PAI ETERNO | nome |
| 000400000341 | Manhattan | RES MANHATTAN | nome |
| 000400000342 | Dom Fernando I | JD DOM FERNANDO I | nome |
| 000400000343 | dos Dourados | SET DOS DOURADOS | unico |
| 000400000344 | (sem nome) | RES SENADOR PARANHOS | maioria |
| 000400000345 | dos Flamboyants | JD DOS FLAMBOYANTS | nome |
| 000400000346 | Solange Parque | LOT SOLANGE PARQUE I | maioria |
| 000400000347 | dos Cisnes | PRQ DOS CISNES | unico |
| 000400000348 | Samambaia | COD SAMAMBAIA | maioria |
| 000400000349 | Samambaia | COD SAMAMBAIA | maioria |
| 000400000350 | Agrícola Jacirema | GRJ AGRICOLA JACIREMA | nome |
| 000400000351 | Areião I | LOT AREIAO I | maioria |
| 000400000352 | Jardim Ana Flávia | SET JARDIM ANA FLAVIA | nome |
| 000400000353 | Água Branca | BRO AGUA BRANCA | nome |
| 000400000354 | Park Lozandes | LOT PARK LOZANDES | nome |
| 000400000355 | Caravelas 1ª Etapa | JD CARAVELAS 1 ETAPA | maioria |
| 000400000356 | Caravelas | JD CARAVELAS 1 ETAPA | maioria |
| 000400000357 | Cidade Verde | RES CIDADE VERDE | nome |
| 000400000358 | OrientVille | SET ORIENTVILLE | nome |
| 000400000359 | Santa Cruz | VI SANTA CRUZ | nome |
| 000400000360 | dos Eucalíptos | PRQ DOS EUCALIPTOS | unico |
| 000400000361 | Anhanguera II | PRQ ANHANGUERA II | nome |
| 000400000362 | São Domingos | FAZ SAO DOMINGOS | nome |
| 000400000363 | Baliza | CONJ HABITACIONAL BALIZA | unico |
| 000400000364 | Santa Rita - 9a etapa | COD SANTA RITA 9 ETAPA | maioria |
| 000400000365 | Santa Rita - 7a etapa | SET SANTA RITA VII ETAPA | maioria |
| 000400000366 | Amim Camargo | SET AMIM CAMARGO | nome |
| 000400000367 | Santa Marta | Gleba não denominada | sem-parcela |
| 000400000368 | (sem nome) | SET TRES MARIAS | maioria |
| 000400000369 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000370 | Maria Celeste | SET MARIA CELESTE | nome |
| 000400000372 | Goiânia Viva | RES GOIANIA VIVA | nome |
| 000400000373 | Morumbi | RES MORUMBI | nome |
| 000400000374 | Luana Park | RES LUANA PARK | unico |
| 000400000375 | Vau das Pombas | FAZ VAU DAS POMBAS | unico |
| 000400000376 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400000377 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400000378 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400000379 | Santa Bárbara | CH SANTA BARBARA | nome |
| 000400000380 | Colorado | JD COLORADO | unico |
| 000400000381 | (sem nome) | FAZ COLINA | unico |
| 000400000382 | da Vitória | BRO DA VITORIA | nome |
| 000400000383 | Delta Village | SET DELTA VILLAGE | unico |
| 000400000384 | Felicidade | RES FELICIDADE | maioria |
| 000400000385 | Tropical Verde | LOT TROPICAL VERDE | unico |
| 000400000386 | Cristina Continuação | VI CRISTINA CONTINUACAO | nome |
| 000400000387 | Primavera | CONJ PRIMAVERA | nome |
| 000400000388 | (sem nome) | BRO JARDIM BOTANICO | maioria |
| 000400000389 | Morada dos Sonhos | LOT MORADA DOS SONHOS | nome |
| 000400000390 | Maringá | RES MARINGA | nome |
| 000400000391 | Jardim das Oliveiras | COD JARDIM DAS OLIVEIRAS | unico |
| 000400000392 | das Flores | PRQ DAS FLORES | maioria |
| 000400000393 | Eldorado Oeste | PRQ ELDORADO OESTE | maioria |
| 000400000394 | Asa Branca | SET ASA BRANCA | unico |
| 000400000395 | Jardim Leblon | RES JARDIM LEBLON | nome |
| 000400000396 | Conquista | JD CONQUISTA | unico |
| 000400000397 | Vista Bela | JD VISTA BELA | nome |
| 000400000398 | Tupynambá dos Reis | LOT TUPYNAMBA DOS REIS | nome |
| 000400000399 | Itaipú | JD ITAIPU | nome |
| 000400000400 | Anglo | RES ANGLO | nome |
| 000400000401 | Solar Santa Rita | SET SOLAR SANTA RITA | nome |
| 000400000402 | Jardim Florença | RES JARDINS FLORENCA | maioria |
| 000400000403 | Sonho Dourado | RES SONHO DOURADO | nome |
| 000400000404 | Ipê | JD IPE | nome |
| 000400000405 | Mansões Paraíso | RES MANSOES PARAISO | nome |
| 000400000406 | Sônia Maria | JD SONIA MARIA | nome |
| 000400000407 | Maysa Extensão | SET MAYSA EXTENSAO | nome |
| 000400000408 | Santa Rita Acréscimo | VI SANTA RITA ACRESCIMO | nome |
| 000400000409 | Abaporu | JD ABAPORU | nome |
| 000400000410 | Village Santa Rita | RES VILLAGE SANTA RITA II | maioria |
| 000400000411 | Santa Rita | VLG SANTA RITA | maioria |
| 000400000412 | Balneário | RES BALNEARIO | maioria |
| 000400000413 | Recanto do Bosque | RES RECANTO DO BOSQUE | nome |
| 000400000414 | Carolina Parque | LOT CAROLINA PARQUE | nome |
| 000400000415 | Leblon II | RES JD LEBLON II | nome |
| 000400000416 | (sem nome) | RES ARUANA COMPLEMENTO | maioria |
| 000400000417 | Aruanã | RES ARUANA | unico |
| 000400000418 | Morada do Ipê | RES MORADA DO IPE | nome |
| 000400000419 | Center Ville | RES CENTER VILLE | nome |
| 000400000420 | Recreio Panorama | RES RECREIO PANORAMA | maioria |
| 000400000421 | Eli Forte | RES ELI FORTE | nome |
| 000400000422 | Nunes de Morais 1ª Etapa | RES NUNES DE MORAIS I ETA | unico |
| 000400000423 | Granville | RES GRANVILLE | nome |
| 000400000424 | das Esmeraldas | COD DAS ESMERALDAS | nome |
| 000400000425 | das Hortências | JD DAS HORTENCIAS | nome |
| 000400000426 | Mar Del Plata | RES MAR DEL PLATA | nome |
| 000400000427 | São Carlos | BRO SAO CARLOS | nome |
| 000400000428 | Garavelo | SET GARAVELO | nome |
| 000400000429 | Parque Flamboyant | PRQ FLAMBOYANT | maioria |
| 000400000430 | (sem nome) | LOT QUINTA DO RIO DOURADO | maioria |
| 000400000431 | Solar Ville | RES SOLAR VILLE | nome |
| 000400000432 | das Rosas | JD DAS ROSAS | unico |
| 000400000433 | Isaura Extensão | VI ISAURA EXTENSAO | nome |
| 000400000434 | Floresta | BRO FLORESTA | nome |
| 000400000435 | Atalaia | RES ATALAIA | nome |
| 000400000436 | Barravento | RES BARRAVENTO | unico |
| 000400000437 | Forteville | RES FORTEVILLE | nome |
| 000400000438 | Real | JD REAL | nome |
| 000400000439 | Atalaia | VLG ATALAIA | nome |
| 000400000440 | dos Ipês | RES DOS IPES | maioria |
| 000400000441 | Nossa Morada | RES NOSSA MORADA | nome |
| 000400000442 | Canadá | RES CANADA | nome |
| 000400000443 | Vereda dos Buritis | RES VEREDA DOS BURITIS | nome |
| 000400000444 | São Tomaz | VI SAO TOMAZ | nome |
| 000400000445 | 14 Bis | RES 14 BIS | unico |
| 000400000446 | Jardim Belvedere | RES JARDIM BELVEDERE | nome |
| 000400000447 | Rio Verde | RES RIO VERDE | nome |
| 000400000448 | Capuava Residencial Privê | LOT CAPUAVA RESIDENCIAL P | maioria |
| 000400000449 | Fonte Nova | JD FONTE NOVA | unico |
| 000400000450 | Solar Bougainville | RES SOLAR BOUGAINVILLE | nome |
| 000400000451 | Itália | RES ITALIA | nome |
| 000400000452 | Recanto das Garças | RES RECANTO DAS GARCAS | nome |
| 000400000453 | (sem nome) | FAZ LADEIRA | maioria |
| 000400000454 | (sem nome) | FAZ LADEIRA | maioria |
| 000400000455 | Olinda | RES OLINDA | nome |
| 000400000456 | Goiá IV | BRO GOIA IV | nome |
| 000400000457 | Eli Forte | JD ELI FORTE | unico |
| 000400000458 | Carolina Parque Extensão | LOT CAROLINA PARQUE EXTEN | maioria |
| 000400000459 | Habitacional Madre Germana 2 | CONJ MADRE GERMANA II | unico |
| 000400000460 | Boa Vista | BRO BOA VISTA | nome |
| 000400000461 | Porto Seguro | RES PORTO SEGURO | unico |
| 000400000462 | São Domingos | BRO SAO DOMINGOS | nome |
| 000400000463 | Recanto Barravento | LOT RECANTO BARRAVENTO | unico |
| 000400000464 | Grajaú | SET GRAJAU | unico |
| 000400000465 | Morais | SET MORAIS | unico |
| 000400000466 | Primavera | RES PRIMAVERA | unico |
| 000400000467 | Della Pena | RES DELLA PENNA | unico |
| 000400000468 | Goiá 2 Complemento | BRO GOIA 2 COMPLEMENTO | nome |
| 000400000469 | Madri | JD MADRI | nome |
| 000400000470 | Tropical Ville | LOT TROPICAL VILLE | unico |
| 000400000471 | Tempo Novo | RES TEMPO NOVO | nome |
| 000400000472 | São Leopoldo | RES SAO LEOPOLDO | maioria |
| 000400000473 | dos Ipês - Extensão | RES DOS IPES EXTENSAO | maioria |
| 000400000474 | Noroeste | RES NOROESTE | nome |
| 000400000475 | Presidente - Extensão | JD PRESIDENTE EXTENSAO | maioria |
| 000400000476 | Campus | CONJ RESIDENCIAL CAMPUS | nome |
| 000400000477 | Junqueira | RES JUNQUEIRA | nome |
| 000400000478 | Corte Real | JD CORTE REAL | nome |
| 000400000479 | Alto do Vale | SET ALTO DO VALE | nome |
| 000400000480 | (sem nome) | FAZ DOURADOS | unico |
| 000400000481 | (sem nome) | FAZ DOURADOS | unico |
| 000400000482 | Militar | AREA DO QUARTEL DO EXERCI | maioria |
| 000400000483 | Marabá | SET MARABA | nome |
| 000400000484 | Pampulha | JD PAMPULHA | nome |
| 000400000485 | São Leopoldo - Complemento | RES SAO LEOPOLDO COMPLEME | maioria |
| 000400000486 | Jardim Belvedere Expansão | RES JD BELVEDERE EXPANSAO | maioria |
| 000400000487 | Vila Rica | DIS DA VILA RICA | unico |
| 000400000488 | Balneário | PRQ BALNEARIO | maioria |
| 000400000489 | Alphaville | JD ALPHAVILLE | maioria |
| 000400000490 | Portal do Sol I | LOT PORTAL DO SOL I | nome |
| 000400000491 | Colorado Sul | JD COLORADO SUL | unico |
| 000400000492 | Brisas da Mata | RES BRISAS DA MATA | nome |
| 000400000493 | Aruanã Park | LOT ARUANA PARK | nome |
| 000400000494 | Eli Forte - Extensão | RES ELI FORTE EXTENSAO | unico |
| 000400000495 | Oeste Industrial Extensão | PRQ OESTE INDUSTRIAL EXTE | maioria |
| 000400000496 | Luana Park - Continuação | RES LUANA PARK | maioria |
| 000400000497 | Portal do Sol II | LOT PORTAL DO SOL II | nome |
| 000400000498 | Bom Jesus | JD BOM JESUS | nome |
| 000400000499 | Licardino Ney | RES LICARDINO NEY | nome |
| 000400000500 | Santa Cecília | JD SANTA CECILIA | unico |
| 000400000501 | Hugo de Moraes | RES HUGO DE MORAES | nome |
| 000400000502 | Industrial João Braz 2 | PRQ INDUSTRIAL JOAO BRAZ | maioria |
| 000400000503 | Caraíbas | SIT DE RECREIO CARAIBAS | nome |
| 000400000504 | Ytapuã | RES YTAPUA | unico |
| 000400000505 | das Paineiras I | PRQ DAS PAINEIRAS II ETAP | nome |
| 000400000506 | Bonanza | JD BONANZA | nome |
| 000400000507 | das Acácias | RES DAS ACACIAS | nome |
| 000400000508 | Alphaville Flamboyant | LOT ALPHAVILLE FLAMBOYANT | nome |
| 000400000509 | Solange Parque Complemento | LOT SOLANGE PARQUE COMPL | maioria |
| 000400000510 | Forte Ville - Extensão | RES FORTEVILLE EXTENSAO | unico |
| 000400000511 | Solange Parque - Extensão | LOT SOLANGE PARQUE EXTEN | unico |
| 000400000512 | Recreio Panorama extensão | RES REC PANORAMA EXTENSAO | maioria |
| 000400000513 | Maria Helena | JD MARIA HELENA | nome |
| 000400000514 | Vale da Serra | RES VALE DA SERRA | unico |
| 000400000515 | Goyaz Park | RES GOYAZ PARK | unico |
| 000400000516 | Guarema | RES GUAREMA | maioria |
| 000400000517 | Parque Oeste | RES PARQUE OESTE | nome |
| 000400000518 | Mendanha | RES MENDANHA | nome |
| 000400000519 | Presidente - Extensão I | JD PRESIDENTE EXTENSAO I | maioria |
| 000400000520 | Clea Borges | RES CLEA BORGES | nome |
| 000400000521 | Noroeste | SET NOROESTE | nome |
| 000400000522 | Veneza | VLG VENEZA | nome |
| 000400000523 | das Paineiras II Etapa | PRQ DAS PAINEIRAS II ETAP | maioria |
| 000400000524 | das Paineiras III Etapa | PRQ DAS PAINEIRAS III ETA | maioria |
| 000400000525 | das Paineiras IV Etapa | PRQ DAS PAINEIRAS IV ETAP | maioria |
| 000400000526 | Nova Aurora | RES NOVA AURORA | nome |
| 000400000527 | Dezopi | RES DEZOPI | unico |
| 000400000528 | Ville de France | RES VILLE DE FRANCE | unico |
| 000400000529 | Flamingo | RES FLAMINGO | nome |
| 000400000530 | Antônio Barbosa | RES ANTONIO BARBOSA | nome |
| 000400000531 | Vale dos Sonhos I | RES VALE DOS SONHOS I | unico |
| 000400000532 | Carla Cristina | RES CARLA CRISTINA | nome |
| 000400000533 | Aquários | FAZ SANTA RITA | maioria |
| 000400000534 | das Nações Extensão | SET DAS NACOES EXTENSAO | nome |
| 000400000535 | São José - Complemento | VI SAO JOSE COMPLEMENTO | maioria |
| 000400000536 | dos Dourados Extensão | SET DOS DOURADOS EXTENSAO | unico |
| 000400000537 | Belo Horizonte | RES BELO HORIZONTE | nome |
| 000400000538 | Talismã | RES TALISMA | maioria |
| 000400000539 | Park Solar | RES PARK SOLAR | nome |
| 000400000540 | Areião II | SET AREIAO II | unico |
| 000400000541 | São José - Extensão | VI SAO JOSE EXTENSAO | maioria |
| 000400000542 | Sevilha | RES SEVILHA | unico |
| 000400000543 | Eli Forte - Complemento | JD ELI FORTES COMPLEMENTO | unico |
| 000400000544 | Pilar dos Sonhos | RES PILAR DOS SONHOS | nome |
| 000400000545 | São Marcos | RES SAO MARCOS | nome |
| 000400000546 | Monte Pascoal | RES MONTE PASCOAL | nome |
| 000400000547 | das Flores Complemento | PRQ DAS FLORES COMPLEMENT | maioria |
| 000400000548 | Ana Clara | RES ANA CLARA | nome |
| 000400000549 | Mooca - Complemento | VI MOOCA COMPLEMENTO | maioria |
| 000400000550 | do Lago | COD DO LAGO 1 ETAPA | maioria |
| 000400000551 | Itamaracá I | RES PERIM | unico |
| 000400000552 | Itamaraca | RES ITAMARACA | nome |
| 000400000553 | Santo Hilário - Expansão | BRO SANTO HILARIO EXPANSA | maioria |
| 000400000554 | 14 Bis - Extensão | RES 14 BIS EXTENSAO | maioria |
| 000400000555 | Paris | JD PARIS | nome |
| 000400000556 | Atenas | JD ATENAS | nome |
| 000400000557 | Village Santa Rita III | RES VILLAGE SANTA RITA II | maioria |
| 000400000558 | Village Santa Rita I | RES VILLAGE SANTA RITA I | maioria |
| 000400000559 | Village Santa Rita II | RES VILLAGE SANTA RITA II | nome |
| 000400000560 | Madri Complemento | JD MADRI COMPLEMENTO | unico |
| 000400000561 | (sem nome) | FAZ SANTA CRUZ | unico |
| 000400000562 | (sem nome) | FAZ SANTA CRUZ | unico |
| 000400000563 | (sem nome) | FAZ SANTA CRUZ | unico |
| 000400000564 | (sem nome) | FAZ SANTA CRUZ | unico |
| 000400000565 | (sem nome) | JD MARILIZA | maioria |
| 000400000566 | (sem nome) | FAZ SANTA CRUZ | unico |
| 000400000567 | (sem nome) | JD MARILIZA | maioria |
| 000400000568 | Jardim Helou | RES JARDIM HELOU | nome |
| 000400000569 | Hawaí | RES HAWAI | nome |
| 000400000570 | São José | JD SAO JOSE | maioria |
| 000400000571 | Barcelona | RES BARCELONA | nome |
| 000400000572 | Lírios do Campo | RES LIRIOS DO CAMPO | unico |
| 000400000573 | Belo Horizonte Complemento | RES BELO HORIZONTE COMPLE | unico |
| 000400000574 | Moinho dos Ventos | LOT MOINHO DOS VENTOS | nome |
| 000400000575 | Novo Mundo - Extensão | JD NOVO MUNDO EXTENSAO | maioria |
| 000400000576 | Três Marias | SET TRES MARIAS | maioria |
| 000400000577 | das Laranjeiras Acréscimo | PRQ DAS LARANJEIRAS ACRES | maioria |
| 000400000578 | Presidente - Extensão II | SET TRES MARIAS | maioria |
| 000400000579 | José Viandeli | RES JOSE VIANDELI | unico |
| 000400000580 | Perim Continuação | SET PERIM CONTINUACAO | unico |
| 000400000581 | Barra da Tijuca | SET BARRA DA TIJUCA | nome |
| 000400000582 | São Bernardo | RES SAO BERNARDO | nome |
| 000400000583 | dos Afonsos | SET DOS AFONSOS | nome |
| 000400000584 | Linda Vista | RES LINDA VISTA | nome |
| 000400000585 | Presidente - Extensão III | JD PRESIDENTE EXTENSAO II | maioria |
| 000400000586 | Ponta Negra | RES PONTA NEGRA | unico |
| 000400000587 | Santa Fé | RES SANTA FE | maioria |
| 000400000588 | Goiânia Golfe Clube | RES GOIANIA GOLFE CLUBE | unico |
| 000400000589 | Nunes de Morais 2ª Etapa | RES NUNES DE MORAIS II ET | unico |
| 000400000590 | Nunes de Morais 3ª Etapa | RES NUNES DE MORAIS III E | unico |
| 000400000591 | Clarissa | JD CLARISSA | unico |
| 000400000592 | Alice Barbosa | RES ALICE BARBOSA | nome |
| 000400000593 | Novo Petrópolis | JD NOVO PETROPOLIS | unico |
| 000400000594 | Humaita | RES HUMAITA | nome |
| 000400000595 | Vale do Araguaia | RES VALE DO ARAGUAIA | nome |
| 000400000596 | London Park | RES LONDON PARK | unico |
| 000400000597 | Maringá | VLG MARINGA | maioria |
| 000400000598 | Alphaville Flamboyant/Res Arag | RES ALPHAVILLE FLAMBOYANT | maioria |
| 000400000599 | Vila Pedroso Extensão | LOT VILA PEDROSO EXTENSAO | unico |
| 000400000600 | Petrópolis | RES PETROPOLIS | maioria |
| 000400000601 | Fidélis | RES FIDELIS | unico |
| 000400000602 | Vale dos Sonhos II | RES VALE DOS SONHOS II | nome |
| 000400000603 | Campos Dourados | RES CAMPOS DOURADOS | unico |
| 000400000604 | Eldorado Oeste Extensão | PRQ ELDORADO OESTE EXTENS | maioria |
| 000400000605 | Jardins Milão | JD MILAO | maioria |
| 000400000606 | Martins Extensão | VI MARTINS EXTENSAO | nome |
| 000400000607 | Santa Maria Extensão | VI SANTA MARIA EXTENSAO | nome |
| 000400000608 | das Amendoeiras I | PRQ DAS AMENDOEIRAS I | nome |
| 000400000609 | Ville de France 1 | RES VILLE DE FRANCE 1 | unico |
| 000400000610 | Santa Rita - 9a etapa | COD SANTA RITA 8 ETAPA | unico |
| 000400000611 | Vale das Brisas | RES VALE DAS BRISAS | nome |
| 000400000612 | Tocafundo | CH TOCAFUNDO | nome |
| 000400000613 | Jardins Lisboa | JD LISBOA | unico |
| 000400000614 | Aruanã - Complemento | RES ARUANA COMPLEMENTO | maioria |
| 000400000615 | Arco Verde | RES ARCO VERDE | unico |
| 000400000616 | Ana Moraes | RES ANA MORAES | unico |
| 000400000617 | Cristina Extensão | VI CRISTINA EXTENSAO | unico |
| 000400000618 | Aquários II | RES AQUARIOS II | nome |
| 000400000619 | Anicuns | RES ANICUNS | unico |
| 000400000620 | Kátia | RES KATIA | nome |
| 000400000621 | Rio Jordão | RES RIO JORDAO | unico |
| 000400000622 | Dom Rafael | RES DOM RAFAEL | nome |
| 000400000623 | Portinari | RES PORTINARI | unico |
| 000400000624 | Mutirão II | VI MUTIRAO II | nome |
| 000400000625 | Colorado Extensão | JD COLORADO EXTENSAO | unico |
| 000400000626 | Perim | RES PERIM | unico |
| 000400000627 | Parque Mendanha | RES PARQUE MENDANHA | nome |
| 000400000628 | Serra Azul | RES SERRA AZUL | nome |
| 000400000629 | Real Conquista | RES REAL CONQUISTA | nome |
| 000400000630 | Costa Paranhos | RES COSTA PARANHOS | nome |
| 000400000631 | Ipanema | JD IPANEMA | nome |
| 000400000632 | Gramado | JD GRAMADO | nome |
| 000400000633 | Jardim Camargo | RES JARDIM CAMARGO | nome |
| 000400000634 | Recanto dos Buritis | RES RECANTO DOS BURITIS | nome |
| 000400000635 | Village Santa Rita IV | RES VILLAGE SANTA RITA IV | unico |
| 000400000636 | Lago Azul | JD LAGO AZUL | unico |
| 000400000637 | Gardênia | JD GARDENIA | nome |
| 000400000638 | Imperial | JD IMPERIAL | nome |
| 000400000639 | Valência | JD VALENCIA | unico |
| 000400000640 | Verona | JD VERONA | nome |
| 000400000641 | João Paulo II | RES JOAO PAULO II | nome |
| 000400000642 | Alice Barbosa extensão | RES ALICE BARBOSA EXTENSA | maioria |
| 000400000643 | Santa Fé I | RES SANTA FE I | nome |
| 000400000644 | Buena Vista I | RES BUENA VISTA I | maioria |
| 000400000645 | Buena Vista II | RES BUENA VISTA II | unico |
| 000400000646 | Buena Vista III | RES BUENA VISTA III | unico |
| 000400000647 | Buena Vista IV | RES BUENA VISTA IV | nome |
| 000400000648 | Colorado II | JD COLORADO II | unico |
| 000400000649 | Santa Rita 4ª Etapa | RES SANTA RITA 4 ETAPA | unico |
| 000400000650 | Della Penna Extensão | RES DELLA PENNA EXTENSAO | nome |
| 000400000651 | Eldorado Expansão | RES ELDORADO EXPANSAO | nome |
| 000400000652 | Florida | RES FLORIDA | nome |
| 000400000653 | Real | Gleba não denominada | sem-parcela |
| 000400000654 | Beatriz Nascimento | RES BEATRIZ NASCIMENTO | nome |
| 000400000655 | Orlando de Morais | RES ORLANDO MORAIS | unico |
| 000400000656 | Senador Albino Boaventura | RES SENADOR ALBINO BOAVEN | maioria |
| 000400000657 | Paraiso Tropical | SIT DE RECREIO PARAISO TR | unico |
| 000400000658 | Brisas do Cerrado | RES BRISAS DO CERRADO | unico |
| 000400000659 | Privê Ilhas do Caribe | RES PRIVE ILHAS DO CARIBE | nome |
| 000400000660 | Jardins do Cerrado 1 | RES JARDINS DO CERRADO 1 | nome |
| 000400000661 | Jardins do Cerrado 2 | RES JARDINS DO CERRADO 2 | unico |
| 000400000662 | Jardins do Cerrado 3 | RES JARDINS DO CERRADO 3 | unico |
| 000400000663 | Jardins do Cerrado 4 | RES JARDINS DO CERRADO 4 | nome |
| 000400000664 | Jardins do Cerrado 5 | RES JARDINS DO CERRADO 5 | nome |
| 000400000665 | Jardins do Cerrado 6 | RES JARDINS DO CERRADO 6 | nome |
| 000400000666 | Jardins do Cerrado 7 | RES JARDINS DO CERRADO 7 | nome |
| 000400000667 | Jardins do Cerrado 8 | RES JARDINS DO CERRADO 8 | nome |
| 000400000668 | Jardins do Cerrado 9 | RES JARDINS DO CERRADO 9 | nome |
| 000400000669 | Jardins do Cerrado 10 | RES JARDINS DO CERRADO 10 | nome |
| 000400000670 | Jardins do Cerrado 11 | RES JARDINS DO CERRADO 11 | unico |
| 000400000671 | Itaipú I | RES ITAIPU I | nome |
| 000400000672 | do Lago 2ª Etapa | COD DO LAGO 2 ETAPA | maioria |
| 000400000673 | Havaí - Extensão | RES HAVAI EXTENSAO | maioria |
| 000400000674 | São Geraldo | RES SAO GERALDO | maioria |
| 000400000675 | Bethel | RES BETHEL | nome |
| 000400000676 | Antonio Carlos Pires | RES ANTONIO CARLOS PIRES | unico |
| 000400000677 | Fonte das Aguas | RES FONTE DAS AGUAS | nome |
| 000400000678 | Jardins Munique | JD MUNIQUE | maioria |
| 000400000679 | Colorado I | JD COLORADO I | unico |
| 000400000680 | do Lago 3ª Etapa | COD DO LAGO 3 ETAPA | maioria |
| 000400000681 | (sem nome) | CH SANTA RITA GLEBA | maioria |
| 000400000682 | Coronel Álvaro Alves Júnior | RES CORONEL ALVARO ALVES | maioria |
| 000400000683 | Estrela D'alva | RES ESTRELA DALVA | unico |
| 000400000684 | Fonte Nova I | JD FONTE NOVA I | nome |
| 000400000685 | Gleba | FAZ SANTA RITA | unico |
| 000400000686 | Pindorama | SIT DE RECREIO PINDORAMA | nome |
| 000400000687 | Brasil Central | RES BRASIL CENTRAL | nome |
| 000400000688 | Portal da Mata | RES PORTAL DA MATA | unico |
| 000400000689 | Mundo Novo 3 | RES MUNDO NOVO 3 | nome |
| 000400000690 | Mundo Novo 1 | RES MUNDO NOVO 1 | nome |
| 000400000691 | Mundo Novo 2 | RES MUNDO NOVO 2 | nome |
| 000400000692 | (sem nome) | FAZ SANTA MARIA | unico |
| 000400000693 | Português | RES PORTUGUES | unico |
| 000400000694 | Privê Itanhangã | LOT PRIVE ELZA FRONZA | unico |
| 000400000695 | Mansões Bernardo Sayão | SIT RECR MAN BERNARDO SAY | maioria |
| 000400000696 | Talismã I | RES TALISMA I | nome |
| 000400000697 | Paulo Estrela | RES PAULO ESTRELA | nome |
| 000400000698 | Três Marias I | SET TRES MARIAS I | nome |
| 000400000699 | Shangri-la I | RES SHANGRI-LA I | nome |
| 000400000700 | Alphavilly I | JD ALPHAVILLY I | nome |
| 000400000701 | Goiás - Área I | JD GOIAS AREA I | maioria |
| 000400000702 | Lucy Pinheiro | RES LUCY PINHEIRO | unico |
| 000400000703 | Mirante | RES MIRANTE | unico |
| 000400000704 | Frei Galvão | RES FREI GALVAO | nome |
| 000400000705 | Flores do Parque | RES FLORES DO PARQUE | unico |
| 000400000706 | Oeste Industrial - Prolongamento | PRQ OESTE INDUSTRIAL PROL | maioria |
| 000400000707 | Bela Goiânia | RES BELA GOIANIA | unico |
| 000400000708 | Marabá Extensão | SET MARABA EXTENSAO | nome |
| 000400000709 | São José I | JD SAO JOSE I | nome |
| 000400000710 | Porto Dourado | RES PORTO DOURADO | nome |
| 000400000711 | Alice Barbosa I | RES ALICE BARBOSA I | nome |
| 000400000712 | Carolina Parque - Complemento | LOT CAROLINA PARQUE COMPL | maioria |
| 000400000713 | Portal Santa Rita | RES PORTAL SANTA RITA | unico |
| 000400000714 | Portal do Oriente | RES PORTAL DO ORIENTE | nome |
| 000400000715 | Ouro Preto | RES OURO PRETO | unico |
| 000400000716 | Recanto das Emas | RES RECANTO DAS EMAS | nome |
| 000400000717 | Madre Germana II - Extensão | CONJ MADRE GERMANA II - E | maioria |
| 000400000718 | Balneário Gran Viena | LOT BALNEARIO GRAN VIENA | nome |
| 000400000719 | San Marino | RES SAN MARINO | nome |
| 000400000720 | Tuzimoto | RES TUZIMOTO | nome |
| 000400000721 | Santa Efigênia | RES SANTA EFIGENIA | nome |
| 000400000722 | Elizene Santana | RES ELIZENE SANTANA | unico |
| 000400000723 | Paraíso | RES PARAISO | nome |
| 000400000724 | Shangri-la II | RES SHANGRI-LA II | unico |
| 000400000726 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400000727 | Gleba | FAZ SAO JOSE | unico |
| 000400000728 | (sem nome) | JD NOVA ESPERANCA | maioria |
| 000400000730 | (sem nome) | FAZ QUEBRA ANZOL | unico |
| 000400000731 | João Bueno | FAZ SAO JOSE | maioria |
| 000400000732 | (sem nome) | FAZ QUEBRA ANZOL | unico |
| 000400000733 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000734 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000735 | (sem nome) | RES ALDEIA DO VALE | unico |
| 000400000736 | (sem nome) | FAZ QUEBRA ANZOL | unico |
| 000400000737 | Santa Rita Irregular | Gleba não denominada | sem-parcela |
| 000400000739 | Flores do Cerrado | RES FLORES DO CERRADO | nome |
| 000400000740 | Gleba | FAZ SAO JOSE | maioria |
| 000400000742 | (sem nome) | VI SANTA MARIA EXTENSAO | unico |
| 000400000743 | (sem nome) | JD ZURIQUE | maioria |
| 000400000744 | (sem nome) | SET PERIM | unico |
| 000400000745 | (sem nome) | FAZ COLINA | unico |
| 000400000746 | (sem nome) | SET SANTOS DUMONT | maioria |
| 000400000747 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000749 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400000750 | Nossa Senhora Auxiliadora | RES NOSSA SENHORA AUXILIA | unico |
| 000400000751 | (sem nome) | CH ANHANGUERA | unico |
| 000400000752 | (sem nome) | CH COIMBRA | maioria |
| 000400000753 | (sem nome) | COD SAMAMBAIA | maioria |
| 000400000754 | (sem nome) | CH COIMBRA | unico |
| 000400000755 | (sem nome) | RES RECANTO DOS BURITIS | maioria |
| 000400000756 | (sem nome) | RES PARQUE MENDANHA | unico |
| 000400000757 | (sem nome) | SIT DE RECREIO GARAVELO | maioria |
| 000400000758 | (sem nome) | VI REDENCAO | maioria |
| 000400000759 | (sem nome) | RES BALNEARIO | maioria |
| 000400000760 | (sem nome) | FAZ CRIMEIA CAVEIRAS | unico |
| 000400000761 | (sem nome) | RES PARAISO | maioria |
| 000400000763 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400000764 | (sem nome) | SET CRIMEIA OESTE | maioria |
| 000400000765 | (sem nome) | PRQ FLAMBOYANT | maioria |
| 000400000766 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400000767 | (sem nome) | VI MARIA ROSA | maioria |
| 000400000768 | Privê das Oliveiras | Gleba não denominada | sem-parcela |
| 000400000769 | (sem nome) | LOT AGUA AZUL | maioria |
| 000400000770 | (sem nome) | CONJ RES. ARUANA III | maioria |
| 000400000771 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000773 | (sem nome) | DIS DA VILA RICA | unico |
| 000400000774 | (sem nome) | SIT DE R M DO CAMPUS | unico |
| 000400000775 | (sem nome) | CH SANTA RITA | unico |
| 000400000776 | (sem nome) | CH SANTA RITA | maioria |
| 000400000777 | (sem nome) | CH SANTA RITA | unico |
| 000400000778 | (sem nome) | JD LEBLON | maioria |
| 000400000779 | (sem nome) | BRO CAPUAVA | maioria |
| 000400000780 | (sem nome) | BRO CAPUAVA | maioria |
| 000400000781 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000782 | (sem nome) | CH SANTA RITA | unico |
| 000400000783 | (sem nome) | LOT TROPICAL VERDE | unico |
| 000400000784 | (sem nome) | VI FINSOCIAL | maioria |
| 000400000787 | (sem nome) | CH SANTA RITA | unico |
| 000400000788 | (sem nome) | CH SANTA RITA | unico |
| 000400000789 | (sem nome) | RES JUNQUEIRA | maioria |
| 000400000790 | (sem nome) | BRO GOIA 2 COMPLEMENTO | maioria |
| 000400000791 | Quinta da Boa Vista Fechad | JD PETROPOLIS | maioria |
| 000400000792 | (sem nome) | VI SANTA RITA ACRESCIMO | maioria |
| 000400000793 | (sem nome) | RES ANGLO | maioria |
| 000400000794 | Residencial Santa Rita | CH SANTA RITA | unico |
| 000400000797 | Santa Maria | CH SANTA RITA | unico |
| 000400000798 | (sem nome) | RES PARQUE MENDANHA | unico |
| 000400000799 | (sem nome) | CH SANTA RITA | unico |
| 000400000800 | (sem nome) | CH SANTA RITA | unico |
| 000400000801 | (sem nome) | CH SANTA RITA | maioria |
| 000400000802 | (sem nome) | CH SANTA RITA | unico |
| 000400000803 | (sem nome) | CH SANTA RITA | maioria |
| 000400000804 | (sem nome) | CH SANTA RITA | unico |
| 000400000805 | (sem nome) | CH SANTA RITA | unico |
| 000400000806 | (sem nome) | RES PARQUE MENDANHA | unico |
| 000400000807 | (sem nome) | SET SANTOS DUMONT | maioria |
| 000400000808 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400000809 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000811 | (sem nome) | CH SANTA RITA | unico |
| 000400000812 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000813 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000814 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000815 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000816 | Gleba | FAZ SAO JOSE | unico |
| 000400000817 | Gleba | FAZ SAO JOSE | unico |
| 000400000818 | Gleba | FAZ SAO JOSE | unico |
| 000400000819 | Gleba | FAZ SAO JOSE | unico |
| 000400000820 | Gleba | FAZ SAO JOSE | unico |
| 000400000821 | Gleba | FAZ SAO JOSE | unico |
| 000400000822 | Gleba | FAZ SAO JOSE | unico |
| 000400000824 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000825 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000826 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400000827 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000828 | (sem nome) | RES SENADOR ALBINO BOAVEN | maioria |
| 000400000829 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400000832 | (sem nome) | RES RECANTO DO BOSQUE | maioria |
| 000400000833 | (sem nome) | CH SANTA RITA | unico |
| 000400000834 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400000835 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000836 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000837 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000838 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000839 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000840 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000842 | (sem nome) | JD BELLA VITTA | maioria |
| 000400000844 | (sem nome) | FAZ GAMELEIRA | unico |
| 000400000845 | (sem nome) | FAZ PIRACANJUBA | unico |
| 000400000847 | (sem nome) | SET RIO FORMOSO GLEBAS DE | maioria |
| 000400000848 | (sem nome) | PRQ OESTE INDUSTRIAL | maioria |
| 000400000849 | (sem nome) | CH SANTA RITA | unico |
| 000400000851 | (sem nome) | SET TRES MARIAS | maioria |
| 000400000853 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000854 | (sem nome) | RES TALISMA | maioria |
| 000400000855 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000856 | (sem nome) | VI ALPES | maioria |
| 000400000857 | (sem nome) | JD PRESIDENTE | unico |
| 000400000862 | (sem nome) | FAZ DOURADOS | unico |
| 000400000867 | (sem nome) | CH SANTA RITA | maioria |
| 000400000868 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000871 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000872 | (sem nome) | RES PARQUE MENDANHA | maioria |
| 000400000873 | (sem nome) | SET SAO JOSE | maioria |
| 000400000874 | (sem nome) | CH SANTA RITA | maioria |
| 000400000875 | (sem nome) | SET SAO JOSE | maioria |
| 000400000876 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000877 | Bella Vitta | JD BELLA VITTA | nome |
| 000400000880 | (sem nome) | RES NUNES DE MORAIS I ETA | unico |
| 000400000881 | Acrópole II | RES ACROPOLE II | nome |
| 000400000882 | (sem nome) | PRQ OESTE INDUSTRIAL | maioria |
| 000400000885 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000886 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000887 | (sem nome) | LOT SOLANGE PARQUE I | maioria |
| 000400000889 | (sem nome) | JD SANTO ANTONIO | unico |
| 000400000890 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000891 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000892 | (sem nome) | RES AQUARIOS II | maioria |
| 000400000895 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000896 | (sem nome) | FAZ DOURADOS | maioria |
| 000400000897 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000898 | (sem nome) | LOT ALPHAVILLE RESIDENCIA | maioria |
| 000400000901 | (sem nome) | RES DOM RAFAEL | maioria |
| 000400000903 | (sem nome) | SET SAO JOSE | maioria |
| 000400000905 | (sem nome) | VI FELICIDADE | unico |
| 000400000906 | Felicidade | VI FELICIDADE | maioria |
| 000400000907 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000909 | (sem nome) | RES BALNEARIO | maioria |
| 000400000910 | (sem nome) | RES HUGO DE MORAES | maioria |
| 000400000911 | (sem nome) | FAZ CRIMEIA CAVEIRAS | unico |
| 000400000912 | (sem nome) | GRJ CRUZEIRO DO SUL | unico |
| 000400000913 | (sem nome) | JD BALNEARIO MEIA PONTE | maioria |
| 000400000914 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000915 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000916 | (sem nome) | LOT MANSOES GOIANAS | maioria |
| 000400000918 | Portal Petropolis | FAZ PETROPOLIS | unico |
| 000400000919 | (sem nome) | JD VITORIA | maioria |
| 000400000920 | (sem nome) | RES GOIANIA GOLFE CLUBE | unico |
| 000400000923 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400000924 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000927 | (sem nome) | VI SAO LUIZ | maioria |
| 000400000928 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000929 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000930 | (sem nome) | JD CONQUISTA | unico |
| 000400000931 | (sem nome) | VI MARIA DILCE | maioria |
| 000400000932 | (sem nome) | FAZ GUANABARA | maioria |
| 000400000934 | (sem nome) | FAZ RETIRO | unico |
| 000400000935 | (sem nome) | FAZ RETIRO | unico |
| 000400000936 | (sem nome) | SET SAO JOSE | maioria |
| 000400000937 | (sem nome) | JD SANTO ANTONIO | maioria |
| 000400000938 | (sem nome) | FAZ RETIRO | unico |
| 000400000939 | (sem nome) | PRQ DAS FLORES | maioria |
| 000400000940 | (sem nome) | LOT GRANDE RETIRO | maioria |
| 000400000941 | Solange Parque II | LOT SOLANGE PARQUE II | nome |
| 000400000943 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000944 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400000945 | (sem nome) | SET GENTIL MEIRELLES | unico |
| 000400000946 | (sem nome) | VI SANTA HELENA | maioria |
| 000400000948 | (sem nome) | RES PARQUE MENDANHA | unico |
| 000400000949 | (sem nome) | FAZ SALINOS | maioria |
| 000400000951 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000952 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000953 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400000954 | França | JD FRANCA | nome |
| 000400000956 | (sem nome) | CH ANHANGUERA | maioria |
| 000400000957 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000958 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000960 | (sem nome) | LOT SOLANGE PARQUE III | maioria |
| 000400000961 | (sem nome) | FAZ PLANICIE | unico |
| 000400000962 | (sem nome) | FAZ PLANICIE | maioria |
| 000400000963 | (sem nome) | RES DAS ACACIAS | unico |
| 000400000965 | (sem nome) | FAZ SANTA RITA | unico |
| 000400000966 | (sem nome) | FAZ PETROPOLIS | unico |
| 000400000967 | Londres | JD LONDRES | nome |
| 000400000968 | (sem nome) | FAZ GAMELEIRA | unico |
| 000400000971 | (sem nome) | FAZ SAO JOSE | unico |
| 000400000972 | (sem nome) | RES LUCY PINHEIRO | unico |
| 000400000973 | Alphaville | JD ALPHAVILLY I | maioria |
| 000400000974 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400000975 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400000976 | (sem nome) | FAZ RETIRO | maioria |
| 000400000977 | (sem nome) | CH RETIRO | unico |
| 000400000978 | (sem nome) | FAZ RETIRO | maioria |
| 000400000979 | Carlos de Freitas | VI SANTA MARIA EXTENSAO | unico |
| 000400000980 | (sem nome) | FAZ SANTA CRUZ | unico |
| 000400000981 | (sem nome) | JD MUNIQUE | maioria |
| 000400000982 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000983 | (sem nome) | VI SANTA MARIA - CONJUNTO | maioria |
| 000400000984 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000985 | (sem nome) | RES TALISMA I | maioria |
| 000400000986 | (sem nome) | RES SANTA FE | maioria |
| 000400000987 | Brisas do Cerrado | PRQ ATHENEU | maioria |
| 000400000988 | Gleba | FAZ BOTAFOGO | maioria |
| 000400000989 | Glória Real | LOT QUINTA DO RIO DOURADO | maioria |
| 000400000990 | (sem nome) | VI LUCIANA | maioria |
| 000400000991 | (sem nome) | VI LUCIANA | maioria |
| 000400000992 | (sem nome) | PRQ FLAMBOYANT | maioria |
| 000400000994 | Zurique | JD ZURIQUE | nome |
| 000400000995 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400000996 | (sem nome) | JD PRESIDENTE | maioria |
| 000400000997 | (sem nome) | FAZ RETIRO | maioria |
| 000400000998 | (sem nome) | FAZ RETIRO | maioria |
| 000400000999 | (sem nome) | FAZ RETIRO | maioria |
| 000400001000 | (sem nome) | FAZ PLANICIE | unico |
| 000400001001 | Gramado I | JD GRAMADO I | nome |
| 000400001002 | (sem nome) | FAZ BOTAFOGO | unico |
| 000400001003 | (sem nome) | CH SANTA BARBARA | maioria |
| 000400001004 | (sem nome) | FAZ SAO JOSE | unico |
| 000400001005 | (sem nome) | FAZ RETIRO | unico |
| 000400001006 | (sem nome) | JD NOVO MUNDO | maioria |
| 000400001007 | (sem nome) | FAZ SAO JOSE | unico |
| 000400001008 | (sem nome) | CH CRIMEIA | maioria |
| 000400001009 | Monte Pascoal II | RES MONTE PASCOAL II | nome |
| 000400001011 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001012 | Privê Elza Fronza - 2ª Etapa | Gleba não denominada | sem-parcela |
| 000400001014 | (sem nome) | CH CRIMEIA | unico |
| 000400001015 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001017 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400001018 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400001019 | (sem nome) | FAZ RETIRO | unico |
| 000400001020 | (sem nome) | BRO SANTO HILARIO | maioria |
| 000400001021 | (sem nome) | FAZ DOURADOS | unico |
| 000400001022 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001023 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001024 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001026 | (sem nome) | AREA CAMPUS SAMAMBAIA - U | maioria |
| 000400001027 | (sem nome) | CH CALIFORNIA | maioria |
| 000400001028 | (sem nome) | RES HUMAITA | unico |
| 000400001029 | (sem nome) | FAZ CATINGUEIRO | maioria |
| 000400001030 | (sem nome) | FAZ SANTA RITA | unico |
| 000400001031 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400001033 | (sem nome) | PRQ SANTA CRUZ | unico |
| 000400001035 | (sem nome) | RES REAL CONQUISTA | unico |
| 000400001036 | (sem nome) | VI  MARIA DILCE | maioria |
| 000400001037 | (sem nome) | CH CALIFORNIA | maioria |
| 000400001039 | Privê Elza Fronza | LOT PRIVE ELZA FRONZA | nome |
| 000400001040 | (sem nome) | FAZ RETIRO | maioria |
| 000400001041 | (sem nome) | FAZ RETIRO | maioria |
| 000400001043 | (sem nome) | CH CRIMEIA | unico |
| 000400001044 | (sem nome) | CH CRIMEIA | maioria |
| 000400001045 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001046 | Gleba | SET AMIM CAMARGO | unico |
| 000400001047 | (sem nome) | RES OLINDA | maioria |
| 000400001049 | (sem nome) | FAZ SALINOS | unico |
| 000400001050 | Solar Ville Complemento | RES SOLAR VILLE | unico |
| 000400001051 | (sem nome) | CH GUAREMA | maioria |
| 000400001052 | (sem nome) | VI JARDIM POMPEIA | maioria |
| 000400001053 | (sem nome) | RES LONDON PARK | maioria |
| 000400001054 | (sem nome) | FAZ EMBIRA | unico |
| 000400001055 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400001056 | (sem nome) | VI SAO LUIZ | maioria |
| 000400001057 | (sem nome) | SET SUDOESTE | maioria |
| 000400001058 | (sem nome) | RES ELDORADO | maioria |
| 000400001059 | (sem nome) | RES VALE DOS SONHOS I | unico |
| 000400001061 | (sem nome) | PRQ ACALANTO | maioria |
| 000400001062 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001063 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400001064 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400001065 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400001066 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001067 | (sem nome) | BRO SAO FRANCISCO | maioria |
| 000400001068 | (sem nome) | CONJ RESID RODOVIARIO | maioria |
| 000400001069 | (sem nome) | RES SANTA FE | maioria |
| 000400001070 | (sem nome) | BRO FELIZ | maioria |
| 000400001071 | Gleba | FAZ SANTA RITA | maioria |
| 000400001072 | (sem nome) | RES RIO JORDAO | unico |
| 000400001073 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001074 | (sem nome) | COD DO LAGO 2 ETAPA | unico |
| 000400001076 | Juscelino Kubitschek | Gleba não denominada | sem-parcela |
| 000400001077 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001078 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001079 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001080 | (sem nome) | CH ALTO DA GLORIA | maioria |
| 000400001081 | (sem nome) | COD RIO BRANCO | maioria |
| 000400001082 | (sem nome) | JD MARILIZA | maioria |
| 000400001083 | Santa Rita - 8a etapa | COD SANTA RITA 8 ETAPA | maioria |
| 000400001084 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400001085 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400001086 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400001087 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001089 | (sem nome) | LOT EXPANSAO GRANDE RETIR | unico |
| 000400001090 | Village Campos Verdes | RES VILLAGE CAMPOS VERDES | nome |
| 000400001091 | Expansão Grande Retiro | LOT EXPANSAO GRANDE RETIR | unico |
| 000400001092 | (sem nome) | RES OURO PRETO | unico |
| 000400001094 | Gleba | LOT EXPANSAO GRANDE RETIR | unico |
| 000400001095 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001096 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001098 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001099 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001100 | (sem nome) | RES ACROPOLE II | maioria |
| 000400001101 | Gleba | Gleba não denominada | sem-parcela |
| 000400001102 | Gleba | Gleba não denominada | sem-parcela |
| 000400001103 | (sem nome) | LOT ALPHAVILLE FLAMBOYANT | unico |
| 000400001104 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001105 | (sem nome) | BRO SANTO HILARIO EXPANSA | unico |
| 000400001106 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001107 | Itália | FAZ SANTA RITA | unico |
| 000400001109 | (sem nome) | VI BOA SORTE | maioria |
| 000400001110 | (sem nome) | RES VEREDA DOS BURITIS | unico |
| 000400001111 | (sem nome) | PRQ DAS AMENDOEIRAS | maioria |
| 000400001112 | (sem nome) | CH CALIFORNIA | maioria |
| 000400001113 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400001114 | (sem nome) | JD VITORIA | maioria |
| 000400001115 | (sem nome) | FAZ SANTA RITA | unico |
| 000400001116 | (sem nome) | JD PRESIDENTE EXTENSAO | maioria |
| 000400001117 | (sem nome) | CH RETIRO | maioria |
| 000400001118 | (sem nome) | PRQ DOS CISNES | maioria |
| 000400001119 | (sem nome) | FAZ SAO JOSE | unico |
| 000400001121 | Provence | Gleba não denominada | sem-parcela |
| 000400001122 | Montes Claros | RES MONTES CLAROS | nome |
| 000400001123 | (sem nome) | CONJ HABITACIONAL BALIZA | maioria |
| 000400001124 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001125 | (sem nome) | CH ANHANGUERA | unico |
| 000400001126 | Bougainville | FAZ SANTA RITA | maioria |
| 000400001127 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001128 | (sem nome) | CH SANTA RITA | maioria |
| 000400001129 | Gleba | FAZ SANTA RITA | maioria |
| 000400001131 | dos Bougainvilles | FAZ DOURADOS | unico |
| 000400001132 | Edilberto Nascimento | RES EDILBERTO NASCIMENTO | nome |
| 000400001133 | Arlinda Parque | FAZ SAO JOSE | unico |
| 000400001134 | Alfa | RES ALFA | nome |
| 000400001135 | Primavera Parque | FAZ SAO DOMINGOS | unico |
| 000400001136 | Tatyane | RES TATYANE | nome |
| 000400001137 | (sem nome) | RES ACROPOLE II | maioria |
| 000400001139 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001140 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001141 | (sem nome) | RES CORONEL ALVARO ALVES | unico |
| 000400001142 | União | COD UNIAO | nome |
| 000400001148 | Gleba | RES OURO PRETO | maioria |
| 000400001149 | (sem nome) | COD UNIAO | maioria |
| 000400001152 | Gleba | CH MARINGA | maioria |
| 000400001153 | (sem nome) | RES VILLAGIO TOSCANA | maioria |
| 000400001155 | (sem nome) | FAZ PLANICIE | unico |
| 000400001156 | Villagio Toscana | RES VILLAGIO TOSCANA | nome |
| 000400001157 | (sem nome) | JD LISBOA | unico |
| 000400001160 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001162 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001163 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001164 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400001165 | Parque Cidade | LOT PARQUE CIDADE | nome |
| 000400001166 | (sem nome) | LOT PARQUE CIDADE | unico |
| 000400001167 | (sem nome) | FAZ SERRA | unico |
| 000400001168 | (sem nome) | FAZ SALINOS | maioria |
| 000400001170 | (sem nome) | FAZ RETIRO | unico |
| 000400001171 | Itália | JD ITALIA | nome |
| 000400001172 | (sem nome) | FAZ RETIRO | unico |
| 000400001174 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001176 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400001177 | (sem nome) | FAZ DOURADOS | unico |
| 000400001178 | (sem nome) | JD BELLA VITTA | maioria |
| 000400001179 | (sem nome) | FAZ SANTA MARIA | unico |
| 000400001180 | (sem nome) | FAZ PETROPOLIS | maioria |
| 000400001181 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400001182 | (sem nome) | FAZ CAVEIRAS | unico |
| 000400001183 | Jardim Botânico | BRO JARDIM BOTANICO | nome |
| 000400001184 | Aeródromo Zezé Alves Ferreira | COD AERODROMO ZEZE ALVES | maioria |
| 000400001185 | (sem nome) | FAZ SAO JOSE | unico |
| 000400001186 | Vale Verde | LOT VALE VERDE | nome |
| 000400001187 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001188 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001189 | (sem nome) | CH BOUGAINVILLE | maioria |
| 000400001190 | Parque Imperial | RES PARQUE IMPERIAL | unico |
| 000400001191 | (sem nome) | RES SERRA AZUL | maioria |
| 000400001192 | (sem nome) | RES PARAISO | maioria |
| 000400001194 | Água Azul | LOT AGUA AZUL | nome |
| 000400001196 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001197 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001198 | (sem nome) | SIT IPIRANGA | unico |
| 000400001199 | (sem nome) | CONJ RESIDENCIAL CAMPUS | maioria |
| 000400001200 | Amsterdã | JD AMSTERDA | unico |
| 000400001201 | Caribe | RES CARIBE | nome |
| 000400001202 | (sem nome) | BRO SANTO HILARIO EXPANSA | maioria |
| 000400001203 | (sem nome) | FAZ SAO JOSE | unico |
| 000400001204 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001205 | (sem nome) | FAZ SAO DOMINGOS | unico |
| 000400001206 | Gleba2 | LOT MORADA DOS SONHOS | maioria |
| 000400001207 | (sem nome) | FAZ RETIRO | unico |
| 000400001208 | Reserva do Oriente | FAZ SANTA RITA | maioria |
| 000400001209 | Gleba | FAZ VAU DAS POMBAS | unico |
| 000400001210 | Gleba 03 Faz Idenpendência | FAZ VAU DAS POMBAS | maioria |
| 000400001211 | (sem nome) | FAZ DOURADOS | unico |
| 000400001212 | 3/6.6 | RES ALICE BARBOSA EXTENSA | maioria |
| 000400001213 | (sem nome) | FAZ RETIRO | maioria |
| 000400046515 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400046517 | (sem nome) | RES MONTES CLAROS | maioria |
| 000400046518 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400046519 | (sem nome) | PRQ BOM JESUS | unico |
| 000400046520 | (sem nome) | PRQ ATHENEU | unico |
| 000400046521 | AREA | SIT DE RECREIO PANORAMA | maioria |
| 000400046522 | (sem nome) | FAZ SAO JOSE | unico |
| 000400046523 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400046525 | (sem nome) | FAZ SAO JOSE | unico |
| 000400046527 | (sem nome) | FAZ VAU DAS POMBAS | unico |
| 000400046528 | (sem nome) | FAZ SANTA RITA | unico |
| 000400046529 | das Bromélias | JD DAS BROMELIAS | nome |

Total de linhas na tabela de diff: **1129**

### Multi-candidatos (conferencia)

Poligonos que intersectaram 2+ setores cadastrais (`cdbairro`) distintos — casos de risco (bordas administrativas) resolvidos por tie-break de nome (`nome`) ou maioria de parcelas (`maioria`). Revisao humana por amostra e item de acompanhamento **nao-bloqueante** (Open Decision #1).

| id | nm_bai_original | nmbairro_reconciled (vencedor) | motivo |
|---|---|---|---|
| 000400000002 | Aeroporto | SET AEROPORTO | nome |
| 000400000004 | Sul | SET SUL | nome |
| 000400000005 | Leste Universitário | SET LESTE UNIVERSITARIO | nome |
| 000400000006 | Leste Vila Nova | SET LESTE VILA NOVA | nome |
| 000400000007 | dos Funcionários | SET DOS FUNCIONARIOS | nome |
| 000400000008 | Nova Vila | LOT NOVA VILA | nome |
| 000400000009 | Norte Ferroviário | SET NORTE FERROVIARIO | maioria |
| 000400000010 | Campinas | SET CAMPINAS | nome |
| 000400000013 | Pedro Ludovico | SET PEDRO LUDOVICO | nome |
| 000400000014 | Bueno | SET BUENO | nome |
| 000400000015 | Jardim América | BRO JARDIM AMERICA | nome |
| 000400000017 | Nova Suiça | BRO NOVA SUICA | nome |
| 000400000018 | Sudoeste | SET SUDOESTE | nome |
| 000400000019 | Sol Nascente | SET SOL NASCENTE | nome |
| 000400000020 | Boa Sorte | VI BOA SORTE | nome |
| 000400000021 | Aguiar | VI AGUIAR | nome |
| 000400000022 | Castelo Branco | SET CASTELO BRANCO | nome |
| 000400000023 | Aurora | VI AURORA | nome |
| 000400000024 | Rodoviário | BRO RODOVIARIO | nome |
| 000400000025 | dos Aeroviários | BRO AEROVIARIO | maioria |
| 000400000026 | Oswaldo Rosa | VI OSWALDO ROSA | nome |
| 000400000027 | do Anicuns | ESP DO ANICUNS | nome |
| 000400000028 | São José | SET SAO JOSE | maioria |
| 000400000029 | João Vaz | VI JOAO VAZ | nome |
| 000400000030 | Capuava | BRO CAPUAVA | nome |
| 000400000031 | Ipiranga | BRO IPIRANGA | nome |
| 000400000032 | São Francisco | BRO SAO FRANCISCO | nome |
| 000400000033 | Petrópolis | JD PETROPOLIS | maioria |
| 000400000034 | Cidade Jardim | SET CIDADE JARDIM | nome |
| 000400000035 | Guadalajara | CONJ GUADALAJARA - SET CI | nome |
| 000400000036 | Industrial Mooca | BRO INDUSTRIAL MOOCA | nome |
| 000400000037 | Nossa Senhora de Fátima | BRO NOSSA SENHORA DE FATI | maioria |
| 000400000038 | Santa Rita | VI SANTA RITA | maioria |
| 000400000039 | Goiá | BRO GOIA | maioria |
| 000400000040 | Mirabel | JD MIRABEL | nome |
| 000400000041 | Nova Canaã | VI NOVA CANAA | nome |
| 000400000042 | Viandelli | VI VIANDELLI | nome |
| 000400000043 | Anchieta | VI ANCHIETA | nome |
| 000400000044 | Lucy | VI LUCY | nome |
| 000400000045 | Mauá | VI MAUA | nome |
| 000400000046 | Adélia | VI ADELIA | nome |
| 000400000047 | Oeste Industrial | PRQ OESTE INDUSTRIAL | maioria |
| 000400000048 | Ana Lúcia | JD ANA LUCIA | nome |
| 000400000049 | Europa | JD EUROPA | nome |
| 000400000050 | União | SET UNIAO | nome |
| 000400000051 | Planalto | JD PLANALTO | nome |
| 000400000052 | Rezende | VI REZENDE | nome |
| 000400000053 | Anhanguera | PRQ ANHANGUERA | maioria |
| 000400000055 | Presidente | JD PRESIDENTE | nome |
| 000400000057 | Atlântico | JD ATLANTICO | nome |
| 000400000059 | Amazônia | PRQ AMAZONIA | nome |
| 000400000060 | da Serrinha | BRO SERRINHA | maioria |
| 000400000063 | da Luz | JD DA LUZ | nome |
| 000400000064 | Redenção | VI REDENCAO | nome |
| 000400000066 | Maria José | VI MARIA JOSE | nome |
| 000400000067 | São João | VI SAO JOAO | nome |
| 000400000068 | Goiás | JD GOIAS | maioria |
| 000400000069 | Jardim Vitória | JD VITORIA | maioria |
| 000400000070 | Novo Mundo | JD NOVO MUNDO | maioria |
| 000400000071 | Maria Luiza | VI MARIA LUIZA | nome |
| 000400000072 | Brasil | JD BRASIL | nome |
| 000400000073 | Parque Santa Maria | VI PARQUE SANTA MARIA | nome |
| 000400000074 | Jardim Califórnia | BRO JARDIM CALIFORNIA | nome |
| 000400000075 | Califórnia - Parque Industrial | JD CALIFORNIA PARQUE INDU | maioria |
| 000400000076 | Romana | VI ROMANA | nome |
| 000400000077 | Bandeirantes | VI BANDEIRANTES | nome |
| 000400000078 | Botafogo | CH BOTAFOGO | nome |
| 000400000079 | Botafogo | CH BOTAFOGO | nome |
| 000400000080 | Gleba | CH BOTAFOGO | maioria |
| 000400000082 | Morais | VI MORAIS | nome |
| 000400000083 | Santa Isabel | VI SANTA ISABEL | nome |
| 000400000084 | Feliz | BRO FELIZ | nome |
| 000400000085 | Viana | VI VIANA | nome |
| 000400000086 | Caiçara | VI SANTA MARIA - CONJUNTO | maioria |
| 000400000089 | Jaó | SET JAO | nome |
| 000400000090 | Guanabara | JD GUANABARA | nome |
| 000400000091 | Santa Genoveva | BRO SANTA GENOVEVA | nome |
| 000400000092 | Monticelli | VI MONTICELLI | nome |
| 000400000093 | Criméia Leste | SET CRIMEIA LESTE | nome |
| 000400000094 | Criméia Oeste | SET CRIMEIA OESTE | nome |
| 000400000095 | São Luiz | VI SAO LUIZ | nome |
| 000400000096 | Nossa Senhora Aparecida | VI NOSSA SENHORA APARECID | maioria |
| 000400000098 | Isaura | VI ISAURA | nome |
| 000400000099 | Xavier | VI XAVIER | nome |
| 000400000100 | Abajá | VI ABAJA | nome |
| 000400000101 | Vera Cruz | VI VERA CRUZ | nome |
| 000400000102 | Santa Helena | VI SANTA HELENA | nome |
| 000400000103 | Ofugi | VI OFUGI | nome |
| 000400000104 | Urias Magalhães | SET URIAS MAGALHAES | maioria |
| 000400000105 | Irany | VI IRANY | nome |
| 000400000106 | Clemente | VI CLEMENTE | nome |
| 000400000107 | (sem nome) | CH RETIRO | maioria |
| 000400000108 | Candida de Morais | SET CANDIDA DE MORAIS | nome |
| 000400000109 | Santos Dumont | SET SANTOS DUMONT | nome |
| 000400000110 | Regina | VI REGINA | nome |
| 000400000111 | Novo Horizonte | SET NOVO HORIZONTE | nome |
| 000400000113 | Perim | SET PERIM | nome |
| 000400000114 | Progresso | SET PROGRESSO | nome |
| 000400000115 | Maria Dilce | VI MARIA DILCE | nome |
| 000400000116 | Cristina | VI CRISTINA | nome |
| 000400000117 | Santo Hilário | BRO SANTO HILARIO | maioria |
| 000400000119 | Pedroso | VI PEDROSO | nome |
| 000400000121 | (sem nome) | AER INTERNACIONAL SANTA G | maioria |
| 000400000122 | Cachoeira Dourada | CONJ CACHOEIRA DOURADA | nome |
| 000400000123 | das Laranjeiras | PRQ DAS LARANJEIRAS | maioria |
| 000400000124 | Industrial João Braz | PRQ JOAO BRAZ - CIDADE IN | maioria |
| 000400000126 | Recreio do Funcionário Publico | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000127 | Mariliza | JD MARILIZA | nome |
| 000400000128 | Industrial Paulista | PRQ INDUSTR PAULISTA | maioria |
| 000400000129 | Balneário Meia Ponte | JD BALNEARIO MEIA PONTE | nome |
| 000400000130 | Anhangüera | CH ANHANGUERA | nome |
| 000400000131 | Jardim São Judas Tadeu | VI JARDIM SAO JUDAS TADEU | nome |
| 000400000132 | Jardim Pompéia | VI JARDIM POMPEIA | nome |
| 000400000133 | Buritis | CH BURITIS | nome |
| 000400000134 | Panorama | SIT DE RECREIO PANORAMA | maioria |
| 000400000135 | Mansões Rosa de Ouro | CH MANSOES ROSA DE OURO | nome |
| 000400000136 | Maringá | CH MARINGA | maioria |
| 000400000137 | Ipê | SIT DE RECREIO IPE | nome |
| 000400000138 | Itatiaia | VI ITATIAIA | nome |
| 000400000139 | Bom Jesus | PRQ BOM JESUS | nome |
| 000400000140 | Aldeia do Vale | RES ALDEIA DO VALE | nome |
| 000400000141 | Parque Tremendão | SET PARQUE TREMENDAO | nome |
| 000400000142 | Alto da Glória | CH ALTO DA GLORIA | maioria |
| 000400000144 | Califórnia | CH CALIFORNIA | nome |
| 000400000145 | Coimbra | CH COIMBRA | nome |
| 000400000146 | (sem nome) | VI LUCIANA | maioria |
| 000400000147 | São Francisco de Assis | CH SAO FRANCISCO DE ASSIS | nome |
| 000400000154 | (sem nome) | SET SANTOS DUMONT | maioria |
| 000400000157 | Aeronáutico Antônio Sebba Filho | FAZ CAVEIRAS | maioria |
| 000400000158 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000160 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000162 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000164 | Mansões Goianas | LOT MANSOES GOIANAS | nome |
| 000400000165 | das Nações | PRQ DAS NACOES | nome |
| 000400000166 | Morada do Sol | SET MORADA DO SOL | nome |
| 000400000167 | Atheneu | PRQ ATHENEU | nome |
| 000400000168 | de Recreio São Joaquim | CH DE RECREIO SAO JOAQUIM | nome |
| 000400000169 | Teófilo Neto | VI TEOFILO NETO (SETOR AR | nome |
| 000400000171 | Rizzo | VI RIZZO | nome |
| 000400000172 | Gleba | BRO JARDIM BOTANICO | maioria |
| 000400000173 | Santana | VI SANTANA | nome |
| 000400000174 | Vera Cruz | CONJ VERA CRUZ | nome |
| 000400000175 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000178 | Guanabara | RES GUANABARA | maioria |
| 000400000179 | Yara | CONJ RESIDENCIAL YARA | nome |
| 000400000180 | Nossa Senhora da Piedade | CH N SRA DA PIEDADE | maioria |
| 000400000181 | Nossa Senhora da Piedade | CH N SRA DA PIEDADE | maioria |
| 000400000182 | São Silvestre | CH SAO SILVESTRE | nome |
| 000400000183 | Goiânia 2 | LOT GOIANIA 2 | nome |
| 000400000184 | Santa Rita | PRQ SANTA RITA | maioria |
| 000400000187 | Santa Rita | CH SANTA RITA | maioria |
| 000400000188 | Maracanã | PRQ MARACANA | nome |
| 000400000189 | Maria Rosa | VI MARIA ROSA | nome |
| 000400000190 | Estrela Dalva | SET ESTRELA DALVA | nome |
| 000400000192 | Retiro | CH RETIRO | maioria |
| 000400000193 | Retiro | CH RETIRO | maioria |
| 000400000194 | Casa Grande | VLG CASA GRANDE | nome |
| 000400000195 | Marechal Rondon | SET MARECHAL RONDON | nome |
| 000400000196 | Leblon | JD LEBLON | nome |
| 000400000197 | Fernandes | VI FERNANDES | nome |
| 000400000198 | Alvorada | VI ALVORADA | nome |
| 000400000200 | Americano do Brasil | VI AMERICANO DO BRASIL | nome |
| 000400000201 | Cristina | SET CRISTINA | nome |
| 000400000202 | Fabiana | CONJ FABIANA | nome |
| 000400000204 | Anhanguera | BRO ANHANGUERA | maioria |
| 000400000206 | Bethel | VI BETHEL | nome |
| 000400000207 | Riviera | CONJ RIVIERA | nome |
| 000400000208 | Negrão de Lima | SET NEGRAO DE LIMA | nome |
| 000400000209 | Santa Efigênia | VI SANTA EFIGENIA | nome |
| 000400000210 | Jaraguá | VI JARAGUA | nome |
| 000400000211 | Luciana | VI LUCIANA | nome |
| 000400000212 | Alpes | VI ALPES | nome |
| 000400000213 | Perdiz | VI PERDIZ | nome |
| 000400000214 | Habitacional Aruanã I | CONJ RESIDENCIAL ARUANA I | maioria |
| 000400000215 | Habitacional Aruanã II | CONJ RESIDENCIAL ARUANA I | maioria |
| 000400000216 | Habitacional Aruanã III | CONJ RES. ARUANA III | maioria |
| 000400000217 | Gentil Meirelles | SET GENTIL MEIRELLES | nome |
| 000400000219 | Paraíso | VI PARAISO | nome |
| 000400000220 | Froes | VI FROES | nome |
| 000400000221 | Industrial Pedro Abrão | ZON INDUSTR PEDRO ABRAO | maioria |
| 000400000222 | Colemar Natal e Silva | VI COLEMAR NATAL E SILVA | nome |
| 000400000223 | Andréia | SET ANDREIA | nome |
| 000400000224 | Santo Afonso | VI SANTO AFONSO | nome |
| 000400000226 | São José | CH SAO JOSE | nome |
| 000400000227 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000228 | Empresarial | SET EMPRESARIAL | nome |
| 000400000229 | das Amendoeiras | PRQ DAS AMENDOEIRAS | maioria |
| 000400000230 | Helou | CH HELOU | nome |
| 000400000231 | Faiçalville | LOT FAICALVILLE | nome |
| 000400000232 | (sem nome) | JD BALNEARIO MEIA PONTE | maioria |
| 000400000233 | (sem nome) | LOT PORTAL DO SOL I | maioria |
| 000400000234 | Panorama Parque | LOT PANORAMA PARQUE | nome |
| 000400000235 | Maria Dilce | VI  MARIA DILCE | nome |
| 000400000238 | Maria Dilce | VI MARIA DILCE | maioria |
| 000400000239 | Elísios Campos | SET LESTE VILA NOVA | maioria |
| 000400000240 | Industrial de Goiânia | PRQ INDUSTRIAL DE GOIANIA | nome |
| 000400000241 | Morada Nova | CONJ MORADA NOVA | nome |
| 000400000242 | Morada Nova | CONJ MORADA NOVA | nome |
| 000400000244 | Shangry-la | LOT SHANGRY LA | maioria |
| 000400000245 | Finsocial | VI FINSOCIAL | nome |
| 000400000246 | Canaã | VI CANAA | maioria |
| 000400000247 | Padre Pelágio | SET SAO JOSE - CJ PADRE P | maioria |
| 000400000248 | Rodoviário | CONJ RESID RODOVIARIO | nome |
| 000400000249 | Santos Dumont | GRJ SANTOS DUMONT | nome |
| 000400000250 | Buriti | PRQ BURITI | nome |
| 000400000251 | Mansões do Campus | SIT DE R M DO CAMPUS | maioria |
| 000400000252 | Santa Rita | COD SANTA RITA | nome |
| 000400000253 | Centro Oeste | SET CENTRO OESTE | nome |
| 000400000255 | Jacaré | VI JACARE | nome |
| 000400000256 | Santa Cruz | PRQ SANTA CRUZ | nome |
| 000400000257 | (sem nome) | CH SAO JOSE - PUC CAMPUS | maioria |
| 000400000258 | Mooca | VI SANTA RITA | maioria |
| 000400000259 | Celina Park | LOT CELINA PARK | nome |
| 000400000261 | Nova Esperança | JD NOVA ESPERANCA | nome |
| 000400000262 | Lageado | JD LAGEADO | nome |
| 000400000263 | do Governador | CH DO GOVERNADOR | nome |
| 000400000264 | Rio Branco | COD RIO BRANCO | nome |
| 000400000265 | Aritana | JD ARITANA | nome |
| 000400000266 | Rio Formoso | SET RIO FORMOSO GLEBAS DE | nome |
| 000400000267 | (sem nome) | SIT RECR MAN BERNARDO SAY | maioria |
| 000400000269 | Vila Isabel | CONJ VILA IZABEL | maioria |
| 000400000270 | Aurora Oeste | VI AURORA OESTE | nome |
| 000400000271 | Alphaville Residencial | LOT ALPHAVILLE RESIDENCIA | maioria |
| 000400000274 | Recanto das Minas Gerais | SET RECANTO DAS MINAS GER | maioria |
| 000400000278 | Araguaia Park | LOT ARAGUAIA PARQUE | maioria |
| 000400000279 | Solange Parque I | LOT SOLANGE PARQUE I | maioria |
| 000400000280 | Solange Parque II | LOT SOLANGE PARQUE II | maioria |
| 000400000281 | Solange Parque III | LOT SOLANGE PARQUE III | nome |
| 000400000282 | Paraíso | PRQ PARAISO | nome |
| 000400000286 | São Geraldo | SIT DE REC SAO GERALDO | nome |
| 000400000287 | Sevene | SET SEVENE | nome |
| 000400000289 | Aroeiras | JD DAS AROEIRAS | nome |
| 000400000290 | Liberdade | JD LIBERDADE | nome |
| 000400000291 | (sem nome) | VI SANTA MARIA - CONJUNTO | maioria |
| 000400000292 | Palmares | CONJ RESIDENCIAL PALMARES | nome |
| 000400000293 | Curitiba | JD CURITIBA | nome |
| 000400000294 | Anhangüera | COD ANHANGUERA | maioria |
| 000400000295 | Sonho Verde Complemento | RES SONHO VERDE | maioria |
| 000400000296 | Sonho Verde | RES SONHO VERDE | nome |
| 000400000297 | Recreio Panorama | REC PANORAMA | maioria |
| 000400000298 | Norte Ferroviário II | SET NORTE FERROVIARIO II | nome |
| 000400000300 | Alto da Glória | VI ALTO DA GLORIA | maioria |
| 000400000302 | Grande Retiro | LOT GRANDE RETIRO | maioria |
| 000400000303 | Guanabara II | JD GUANABARA II | maioria |
| 000400000304 | Guanabara III | JD GUANABARA III | nome |
| 000400000306 | Morada do Bosque | RES MORADA DO BOSQUE | nome |
| 000400000307 | Santo Hilário II | BRO SANTO HILARIO II | nome |
| 000400000308 | Eldorado | RES ELDORADO | maioria |
| 000400000311 | Novo Mundo II | JD NOVO MUNDO II | nome |
| 000400000312 | Santa Rita - 4a etapa | RES SANTA RITA 4 ETAPA | maioria |
| 000400000313 | Ulisses Guimarães | SET ULISSES GUIMARAES | nome |
| 000400000314 | Tancredo Neves | SET TANCREDO NEVES | nome |
| 000400000315 | Bougainville | VLG CASA GRANDE | maioria |
| 000400000316 | (sem nome) | LOT CAROLINA PARQUE COMPL | maioria |
| 000400000319 | São Marcos I | RES SAO MARCOS I | nome |
| 000400000320 | (sem nome) | RES PARQUE MENDANHA | maioria |
| 000400000321 | Senador Paranhos | RES SENADOR PARANHOS | nome |
| 000400000322 | Itaipú | RES ITAIPU | nome |
| 000400000323 | Adélia I e III | VI ADELIA I E III | nome |
| 000400000325 | Roriz | SET URIAS MAGALHAES II | maioria |
| 000400000326 | Goiá Setor Veloso | BRO GOIA SETOR VELOSO | nome |
| 000400000327 | Novo Planalto | SET NOVO PLANALTO | nome |
| 000400000329 | Green Park | RES GREEN PARK | nome |
| 000400000330 | Guanabara IV | JD GUANABARA IV | nome |
| 000400000331 | Goiá 2 | BRO GOIA 2 | nome |
| 000400000334 | Santa Tereza | VI SANTA TEREZA | nome |
| 000400000335 | (sem nome) | RES ALICE BARBOSA EXTENSA | maioria |
| 000400000336 | Santa Rita - 6a etapa | COD SANTA RITA 6 ETAPA | maioria |
| 000400000337 | Santa Rita - 5ª Etapa | VI SANTA RITA 5 ETAPA | maioria |
| 000400000339 | Santa Rita | BRO SANTA RITA | maioria |
| 000400000340 | Divino Pai Eterno | VI DIVINO PAI ETERNO | nome |
| 000400000341 | Manhattan | RES MANHATTAN | nome |
| 000400000342 | Dom Fernando I | JD DOM FERNANDO I | nome |
| 000400000344 | (sem nome) | RES SENADOR PARANHOS | maioria |
| 000400000345 | dos Flamboyants | JD DOS FLAMBOYANTS | nome |
| 000400000346 | Solange Parque | LOT SOLANGE PARQUE I | maioria |
| 000400000348 | Samambaia | COD SAMAMBAIA | maioria |
| 000400000349 | Samambaia | COD SAMAMBAIA | maioria |
| 000400000350 | Agrícola Jacirema | GRJ AGRICOLA JACIREMA | nome |
| 000400000351 | Areião I | LOT AREIAO I | maioria |
| 000400000352 | Jardim Ana Flávia | SET JARDIM ANA FLAVIA | nome |
| 000400000353 | Água Branca | BRO AGUA BRANCA | nome |
| 000400000354 | Park Lozandes | LOT PARK LOZANDES | nome |
| 000400000355 | Caravelas 1ª Etapa | JD CARAVELAS 1 ETAPA | maioria |
| 000400000356 | Caravelas | JD CARAVELAS 1 ETAPA | maioria |
| 000400000357 | Cidade Verde | RES CIDADE VERDE | nome |
| 000400000358 | OrientVille | SET ORIENTVILLE | nome |
| 000400000359 | Santa Cruz | VI SANTA CRUZ | nome |
| 000400000361 | Anhanguera II | PRQ ANHANGUERA II | nome |
| 000400000362 | São Domingos | FAZ SAO DOMINGOS | nome |
| 000400000364 | Santa Rita - 9a etapa | COD SANTA RITA 9 ETAPA | maioria |
| 000400000365 | Santa Rita - 7a etapa | SET SANTA RITA VII ETAPA | maioria |
| 000400000366 | Amim Camargo | SET AMIM CAMARGO | nome |
| 000400000368 | (sem nome) | SET TRES MARIAS | maioria |
| 000400000369 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000370 | Maria Celeste | SET MARIA CELESTE | nome |
| 000400000372 | Goiânia Viva | RES GOIANIA VIVA | nome |
| 000400000373 | Morumbi | RES MORUMBI | nome |
| 000400000376 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400000377 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400000378 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400000379 | Santa Bárbara | CH SANTA BARBARA | nome |
| 000400000382 | da Vitória | BRO DA VITORIA | nome |
| 000400000384 | Felicidade | RES FELICIDADE | maioria |
| 000400000386 | Cristina Continuação | VI CRISTINA CONTINUACAO | nome |
| 000400000387 | Primavera | CONJ PRIMAVERA | nome |
| 000400000388 | (sem nome) | BRO JARDIM BOTANICO | maioria |
| 000400000389 | Morada dos Sonhos | LOT MORADA DOS SONHOS | nome |
| 000400000390 | Maringá | RES MARINGA | nome |
| 000400000392 | das Flores | PRQ DAS FLORES | maioria |
| 000400000393 | Eldorado Oeste | PRQ ELDORADO OESTE | maioria |
| 000400000395 | Jardim Leblon | RES JARDIM LEBLON | nome |
| 000400000397 | Vista Bela | JD VISTA BELA | nome |
| 000400000398 | Tupynambá dos Reis | LOT TUPYNAMBA DOS REIS | nome |
| 000400000399 | Itaipú | JD ITAIPU | nome |
| 000400000400 | Anglo | RES ANGLO | nome |
| 000400000401 | Solar Santa Rita | SET SOLAR SANTA RITA | nome |
| 000400000402 | Jardim Florença | RES JARDINS FLORENCA | maioria |
| 000400000403 | Sonho Dourado | RES SONHO DOURADO | nome |
| 000400000404 | Ipê | JD IPE | nome |
| 000400000405 | Mansões Paraíso | RES MANSOES PARAISO | nome |
| 000400000406 | Sônia Maria | JD SONIA MARIA | nome |
| 000400000407 | Maysa Extensão | SET MAYSA EXTENSAO | nome |
| 000400000408 | Santa Rita Acréscimo | VI SANTA RITA ACRESCIMO | nome |
| 000400000409 | Abaporu | JD ABAPORU | nome |
| 000400000410 | Village Santa Rita | RES VILLAGE SANTA RITA II | maioria |
| 000400000411 | Santa Rita | VLG SANTA RITA | maioria |
| 000400000412 | Balneário | RES BALNEARIO | maioria |
| 000400000413 | Recanto do Bosque | RES RECANTO DO BOSQUE | nome |
| 000400000414 | Carolina Parque | LOT CAROLINA PARQUE | nome |
| 000400000415 | Leblon II | RES JD LEBLON II | nome |
| 000400000416 | (sem nome) | RES ARUANA COMPLEMENTO | maioria |
| 000400000418 | Morada do Ipê | RES MORADA DO IPE | nome |
| 000400000419 | Center Ville | RES CENTER VILLE | nome |
| 000400000420 | Recreio Panorama | RES RECREIO PANORAMA | maioria |
| 000400000421 | Eli Forte | RES ELI FORTE | nome |
| 000400000423 | Granville | RES GRANVILLE | nome |
| 000400000424 | das Esmeraldas | COD DAS ESMERALDAS | nome |
| 000400000425 | das Hortências | JD DAS HORTENCIAS | nome |
| 000400000426 | Mar Del Plata | RES MAR DEL PLATA | nome |
| 000400000427 | São Carlos | BRO SAO CARLOS | nome |
| 000400000428 | Garavelo | SET GARAVELO | nome |
| 000400000429 | Parque Flamboyant | PRQ FLAMBOYANT | maioria |
| 000400000430 | (sem nome) | LOT QUINTA DO RIO DOURADO | maioria |
| 000400000431 | Solar Ville | RES SOLAR VILLE | nome |
| 000400000433 | Isaura Extensão | VI ISAURA EXTENSAO | nome |
| 000400000434 | Floresta | BRO FLORESTA | nome |
| 000400000435 | Atalaia | RES ATALAIA | nome |
| 000400000437 | Forteville | RES FORTEVILLE | nome |
| 000400000438 | Real | JD REAL | nome |
| 000400000439 | Atalaia | VLG ATALAIA | nome |
| 000400000440 | dos Ipês | RES DOS IPES | maioria |
| 000400000441 | Nossa Morada | RES NOSSA MORADA | nome |
| 000400000442 | Canadá | RES CANADA | nome |
| 000400000443 | Vereda dos Buritis | RES VEREDA DOS BURITIS | nome |
| 000400000444 | São Tomaz | VI SAO TOMAZ | nome |
| 000400000446 | Jardim Belvedere | RES JARDIM BELVEDERE | nome |
| 000400000447 | Rio Verde | RES RIO VERDE | nome |
| 000400000448 | Capuava Residencial Privê | LOT CAPUAVA RESIDENCIAL P | maioria |
| 000400000450 | Solar Bougainville | RES SOLAR BOUGAINVILLE | nome |
| 000400000451 | Itália | RES ITALIA | nome |
| 000400000452 | Recanto das Garças | RES RECANTO DAS GARCAS | nome |
| 000400000453 | (sem nome) | FAZ LADEIRA | maioria |
| 000400000454 | (sem nome) | FAZ LADEIRA | maioria |
| 000400000455 | Olinda | RES OLINDA | nome |
| 000400000456 | Goiá IV | BRO GOIA IV | nome |
| 000400000458 | Carolina Parque Extensão | LOT CAROLINA PARQUE EXTEN | maioria |
| 000400000460 | Boa Vista | BRO BOA VISTA | nome |
| 000400000462 | São Domingos | BRO SAO DOMINGOS | nome |
| 000400000468 | Goiá 2 Complemento | BRO GOIA 2 COMPLEMENTO | nome |
| 000400000469 | Madri | JD MADRI | nome |
| 000400000471 | Tempo Novo | RES TEMPO NOVO | nome |
| 000400000472 | São Leopoldo | RES SAO LEOPOLDO | maioria |
| 000400000473 | dos Ipês - Extensão | RES DOS IPES EXTENSAO | maioria |
| 000400000474 | Noroeste | RES NOROESTE | nome |
| 000400000475 | Presidente - Extensão | JD PRESIDENTE EXTENSAO | maioria |
| 000400000476 | Campus | CONJ RESIDENCIAL CAMPUS | nome |
| 000400000477 | Junqueira | RES JUNQUEIRA | nome |
| 000400000478 | Corte Real | JD CORTE REAL | nome |
| 000400000479 | Alto do Vale | SET ALTO DO VALE | nome |
| 000400000482 | Militar | AREA DO QUARTEL DO EXERCI | maioria |
| 000400000483 | Marabá | SET MARABA | nome |
| 000400000484 | Pampulha | JD PAMPULHA | nome |
| 000400000485 | São Leopoldo - Complemento | RES SAO LEOPOLDO COMPLEME | maioria |
| 000400000486 | Jardim Belvedere Expansão | RES JD BELVEDERE EXPANSAO | maioria |
| 000400000488 | Balneário | PRQ BALNEARIO | maioria |
| 000400000489 | Alphaville | JD ALPHAVILLE | maioria |
| 000400000490 | Portal do Sol I | LOT PORTAL DO SOL I | nome |
| 000400000492 | Brisas da Mata | RES BRISAS DA MATA | nome |
| 000400000493 | Aruanã Park | LOT ARUANA PARK | nome |
| 000400000495 | Oeste Industrial Extensão | PRQ OESTE INDUSTRIAL EXTE | maioria |
| 000400000496 | Luana Park - Continuação | RES LUANA PARK | maioria |
| 000400000497 | Portal do Sol II | LOT PORTAL DO SOL II | nome |
| 000400000498 | Bom Jesus | JD BOM JESUS | nome |
| 000400000499 | Licardino Ney | RES LICARDINO NEY | nome |
| 000400000501 | Hugo de Moraes | RES HUGO DE MORAES | nome |
| 000400000502 | Industrial João Braz 2 | PRQ INDUSTRIAL JOAO BRAZ | maioria |
| 000400000503 | Caraíbas | SIT DE RECREIO CARAIBAS | nome |
| 000400000505 | das Paineiras I | PRQ DAS PAINEIRAS II ETAP | nome |
| 000400000506 | Bonanza | JD BONANZA | nome |
| 000400000507 | das Acácias | RES DAS ACACIAS | nome |
| 000400000508 | Alphaville Flamboyant | LOT ALPHAVILLE FLAMBOYANT | nome |
| 000400000509 | Solange Parque Complemento | LOT SOLANGE PARQUE COMPL | maioria |
| 000400000512 | Recreio Panorama extensão | RES REC PANORAMA EXTENSAO | maioria |
| 000400000513 | Maria Helena | JD MARIA HELENA | nome |
| 000400000516 | Guarema | RES GUAREMA | maioria |
| 000400000517 | Parque Oeste | RES PARQUE OESTE | nome |
| 000400000518 | Mendanha | RES MENDANHA | nome |
| 000400000519 | Presidente - Extensão I | JD PRESIDENTE EXTENSAO I | maioria |
| 000400000520 | Clea Borges | RES CLEA BORGES | nome |
| 000400000521 | Noroeste | SET NOROESTE | nome |
| 000400000522 | Veneza | VLG VENEZA | nome |
| 000400000523 | das Paineiras II Etapa | PRQ DAS PAINEIRAS II ETAP | maioria |
| 000400000524 | das Paineiras III Etapa | PRQ DAS PAINEIRAS III ETA | maioria |
| 000400000525 | das Paineiras IV Etapa | PRQ DAS PAINEIRAS IV ETAP | maioria |
| 000400000526 | Nova Aurora | RES NOVA AURORA | nome |
| 000400000529 | Flamingo | RES FLAMINGO | nome |
| 000400000530 | Antônio Barbosa | RES ANTONIO BARBOSA | nome |
| 000400000532 | Carla Cristina | RES CARLA CRISTINA | nome |
| 000400000533 | Aquários | FAZ SANTA RITA | maioria |
| 000400000534 | das Nações Extensão | SET DAS NACOES EXTENSAO | nome |
| 000400000535 | São José - Complemento | VI SAO JOSE COMPLEMENTO | maioria |
| 000400000537 | Belo Horizonte | RES BELO HORIZONTE | nome |
| 000400000538 | Talismã | RES TALISMA | maioria |
| 000400000539 | Park Solar | RES PARK SOLAR | nome |
| 000400000541 | São José - Extensão | VI SAO JOSE EXTENSAO | maioria |
| 000400000544 | Pilar dos Sonhos | RES PILAR DOS SONHOS | nome |
| 000400000545 | São Marcos | RES SAO MARCOS | nome |
| 000400000546 | Monte Pascoal | RES MONTE PASCOAL | nome |
| 000400000547 | das Flores Complemento | PRQ DAS FLORES COMPLEMENT | maioria |
| 000400000548 | Ana Clara | RES ANA CLARA | nome |
| 000400000549 | Mooca - Complemento | VI MOOCA COMPLEMENTO | maioria |
| 000400000550 | do Lago | COD DO LAGO 1 ETAPA | maioria |
| 000400000552 | Itamaraca | RES ITAMARACA | nome |
| 000400000553 | Santo Hilário - Expansão | BRO SANTO HILARIO EXPANSA | maioria |
| 000400000554 | 14 Bis - Extensão | RES 14 BIS EXTENSAO | maioria |
| 000400000555 | Paris | JD PARIS | nome |
| 000400000556 | Atenas | JD ATENAS | nome |
| 000400000557 | Village Santa Rita III | RES VILLAGE SANTA RITA II | maioria |
| 000400000558 | Village Santa Rita I | RES VILLAGE SANTA RITA I | maioria |
| 000400000559 | Village Santa Rita II | RES VILLAGE SANTA RITA II | nome |
| 000400000565 | (sem nome) | JD MARILIZA | maioria |
| 000400000567 | (sem nome) | JD MARILIZA | maioria |
| 000400000568 | Jardim Helou | RES JARDIM HELOU | nome |
| 000400000569 | Hawaí | RES HAWAI | nome |
| 000400000570 | São José | JD SAO JOSE | maioria |
| 000400000571 | Barcelona | RES BARCELONA | nome |
| 000400000574 | Moinho dos Ventos | LOT MOINHO DOS VENTOS | nome |
| 000400000575 | Novo Mundo - Extensão | JD NOVO MUNDO EXTENSAO | maioria |
| 000400000576 | Três Marias | SET TRES MARIAS | maioria |
| 000400000577 | das Laranjeiras Acréscimo | PRQ DAS LARANJEIRAS ACRES | maioria |
| 000400000578 | Presidente - Extensão II | SET TRES MARIAS | maioria |
| 000400000581 | Barra da Tijuca | SET BARRA DA TIJUCA | nome |
| 000400000582 | São Bernardo | RES SAO BERNARDO | nome |
| 000400000583 | dos Afonsos | SET DOS AFONSOS | nome |
| 000400000584 | Linda Vista | RES LINDA VISTA | nome |
| 000400000585 | Presidente - Extensão III | JD PRESIDENTE EXTENSAO II | maioria |
| 000400000587 | Santa Fé | RES SANTA FE | maioria |
| 000400000592 | Alice Barbosa | RES ALICE BARBOSA | nome |
| 000400000594 | Humaita | RES HUMAITA | nome |
| 000400000595 | Vale do Araguaia | RES VALE DO ARAGUAIA | nome |
| 000400000597 | Maringá | VLG MARINGA | maioria |
| 000400000598 | Alphaville Flamboyant/Res Arag | RES ALPHAVILLE FLAMBOYANT | maioria |
| 000400000600 | Petrópolis | RES PETROPOLIS | maioria |
| 000400000602 | Vale dos Sonhos II | RES VALE DOS SONHOS II | nome |
| 000400000604 | Eldorado Oeste Extensão | PRQ ELDORADO OESTE EXTENS | maioria |
| 000400000605 | Jardins Milão | JD MILAO | maioria |
| 000400000606 | Martins Extensão | VI MARTINS EXTENSAO | nome |
| 000400000607 | Santa Maria Extensão | VI SANTA MARIA EXTENSAO | nome |
| 000400000608 | das Amendoeiras I | PRQ DAS AMENDOEIRAS I | nome |
| 000400000611 | Vale das Brisas | RES VALE DAS BRISAS | nome |
| 000400000612 | Tocafundo | CH TOCAFUNDO | nome |
| 000400000614 | Aruanã - Complemento | RES ARUANA COMPLEMENTO | maioria |
| 000400000618 | Aquários II | RES AQUARIOS II | nome |
| 000400000620 | Kátia | RES KATIA | nome |
| 000400000622 | Dom Rafael | RES DOM RAFAEL | nome |
| 000400000624 | Mutirão II | VI MUTIRAO II | nome |
| 000400000627 | Parque Mendanha | RES PARQUE MENDANHA | nome |
| 000400000628 | Serra Azul | RES SERRA AZUL | nome |
| 000400000629 | Real Conquista | RES REAL CONQUISTA | nome |
| 000400000630 | Costa Paranhos | RES COSTA PARANHOS | nome |
| 000400000631 | Ipanema | JD IPANEMA | nome |
| 000400000632 | Gramado | JD GRAMADO | nome |
| 000400000633 | Jardim Camargo | RES JARDIM CAMARGO | nome |
| 000400000634 | Recanto dos Buritis | RES RECANTO DOS BURITIS | nome |
| 000400000637 | Gardênia | JD GARDENIA | nome |
| 000400000638 | Imperial | JD IMPERIAL | nome |
| 000400000640 | Verona | JD VERONA | nome |
| 000400000641 | João Paulo II | RES JOAO PAULO II | nome |
| 000400000642 | Alice Barbosa extensão | RES ALICE BARBOSA EXTENSA | maioria |
| 000400000643 | Santa Fé I | RES SANTA FE I | nome |
| 000400000644 | Buena Vista I | RES BUENA VISTA I | maioria |
| 000400000647 | Buena Vista IV | RES BUENA VISTA IV | nome |
| 000400000650 | Della Penna Extensão | RES DELLA PENNA EXTENSAO | nome |
| 000400000651 | Eldorado Expansão | RES ELDORADO EXPANSAO | nome |
| 000400000652 | Florida | RES FLORIDA | nome |
| 000400000654 | Beatriz Nascimento | RES BEATRIZ NASCIMENTO | nome |
| 000400000656 | Senador Albino Boaventura | RES SENADOR ALBINO BOAVEN | maioria |
| 000400000659 | Privê Ilhas do Caribe | RES PRIVE ILHAS DO CARIBE | nome |
| 000400000660 | Jardins do Cerrado 1 | RES JARDINS DO CERRADO 1 | nome |
| 000400000663 | Jardins do Cerrado 4 | RES JARDINS DO CERRADO 4 | nome |
| 000400000664 | Jardins do Cerrado 5 | RES JARDINS DO CERRADO 5 | nome |
| 000400000665 | Jardins do Cerrado 6 | RES JARDINS DO CERRADO 6 | nome |
| 000400000666 | Jardins do Cerrado 7 | RES JARDINS DO CERRADO 7 | nome |
| 000400000667 | Jardins do Cerrado 8 | RES JARDINS DO CERRADO 8 | nome |
| 000400000668 | Jardins do Cerrado 9 | RES JARDINS DO CERRADO 9 | nome |
| 000400000669 | Jardins do Cerrado 10 | RES JARDINS DO CERRADO 10 | nome |
| 000400000671 | Itaipú I | RES ITAIPU I | nome |
| 000400000672 | do Lago 2ª Etapa | COD DO LAGO 2 ETAPA | maioria |
| 000400000673 | Havaí - Extensão | RES HAVAI EXTENSAO | maioria |
| 000400000674 | São Geraldo | RES SAO GERALDO | maioria |
| 000400000675 | Bethel | RES BETHEL | nome |
| 000400000677 | Fonte das Aguas | RES FONTE DAS AGUAS | nome |
| 000400000678 | Jardins Munique | JD MUNIQUE | maioria |
| 000400000680 | do Lago 3ª Etapa | COD DO LAGO 3 ETAPA | maioria |
| 000400000681 | (sem nome) | CH SANTA RITA GLEBA | maioria |
| 000400000682 | Coronel Álvaro Alves Júnior | RES CORONEL ALVARO ALVES | maioria |
| 000400000684 | Fonte Nova I | JD FONTE NOVA I | nome |
| 000400000686 | Pindorama | SIT DE RECREIO PINDORAMA | nome |
| 000400000687 | Brasil Central | RES BRASIL CENTRAL | nome |
| 000400000689 | Mundo Novo 3 | RES MUNDO NOVO 3 | nome |
| 000400000690 | Mundo Novo 1 | RES MUNDO NOVO 1 | nome |
| 000400000691 | Mundo Novo 2 | RES MUNDO NOVO 2 | nome |
| 000400000695 | Mansões Bernardo Sayão | SIT RECR MAN BERNARDO SAY | maioria |
| 000400000696 | Talismã I | RES TALISMA I | nome |
| 000400000697 | Paulo Estrela | RES PAULO ESTRELA | nome |
| 000400000698 | Três Marias I | SET TRES MARIAS I | nome |
| 000400000699 | Shangri-la I | RES SHANGRI-LA I | nome |
| 000400000700 | Alphavilly I | JD ALPHAVILLY I | nome |
| 000400000701 | Goiás - Área I | JD GOIAS AREA I | maioria |
| 000400000704 | Frei Galvão | RES FREI GALVAO | nome |
| 000400000706 | Oeste Industrial - Prolongamento | PRQ OESTE INDUSTRIAL PROL | maioria |
| 000400000708 | Marabá Extensão | SET MARABA EXTENSAO | nome |
| 000400000709 | São José I | JD SAO JOSE I | nome |
| 000400000710 | Porto Dourado | RES PORTO DOURADO | nome |
| 000400000711 | Alice Barbosa I | RES ALICE BARBOSA I | nome |
| 000400000712 | Carolina Parque - Complemento | LOT CAROLINA PARQUE COMPL | maioria |
| 000400000714 | Portal do Oriente | RES PORTAL DO ORIENTE | nome |
| 000400000716 | Recanto das Emas | RES RECANTO DAS EMAS | nome |
| 000400000717 | Madre Germana II - Extensão | CONJ MADRE GERMANA II - E | maioria |
| 000400000718 | Balneário Gran Viena | LOT BALNEARIO GRAN VIENA | nome |
| 000400000719 | San Marino | RES SAN MARINO | nome |
| 000400000720 | Tuzimoto | RES TUZIMOTO | nome |
| 000400000721 | Santa Efigênia | RES SANTA EFIGENIA | nome |
| 000400000723 | Paraíso | RES PARAISO | nome |
| 000400000725 | FAZ DOURADOS | FAZ DOURADOS | nome |
| 000400000726 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400000728 | (sem nome) | JD NOVA ESPERANCA | maioria |
| 000400000731 | João Bueno | FAZ SAO JOSE | maioria |
| 000400000739 | Flores do Cerrado | RES FLORES DO CERRADO | nome |
| 000400000740 | Gleba | FAZ SAO JOSE | maioria |
| 000400000743 | (sem nome) | JD ZURIQUE | maioria |
| 000400000746 | (sem nome) | SET SANTOS DUMONT | maioria |
| 000400000747 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000749 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400000752 | (sem nome) | CH COIMBRA | maioria |
| 000400000753 | (sem nome) | COD SAMAMBAIA | maioria |
| 000400000755 | (sem nome) | RES RECANTO DOS BURITIS | maioria |
| 000400000757 | (sem nome) | SIT DE RECREIO GARAVELO | maioria |
| 000400000758 | (sem nome) | VI REDENCAO | maioria |
| 000400000759 | (sem nome) | RES BALNEARIO | maioria |
| 000400000761 | (sem nome) | RES PARAISO | maioria |
| 000400000763 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400000764 | (sem nome) | SET CRIMEIA OESTE | maioria |
| 000400000765 | (sem nome) | PRQ FLAMBOYANT | maioria |
| 000400000766 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400000767 | (sem nome) | VI MARIA ROSA | maioria |
| 000400000769 | (sem nome) | LOT AGUA AZUL | maioria |
| 000400000770 | (sem nome) | CONJ RES. ARUANA III | maioria |
| 000400000771 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000776 | (sem nome) | CH SANTA RITA | maioria |
| 000400000778 | (sem nome) | JD LEBLON | maioria |
| 000400000779 | (sem nome) | BRO CAPUAVA | maioria |
| 000400000780 | (sem nome) | BRO CAPUAVA | maioria |
| 000400000784 | (sem nome) | VI FINSOCIAL | maioria |
| 000400000789 | (sem nome) | RES JUNQUEIRA | maioria |
| 000400000790 | (sem nome) | BRO GOIA 2 COMPLEMENTO | maioria |
| 000400000791 | Quinta da Boa Vista Fechad | JD PETROPOLIS | maioria |
| 000400000792 | (sem nome) | VI SANTA RITA ACRESCIMO | maioria |
| 000400000793 | (sem nome) | RES ANGLO | maioria |
| 000400000801 | (sem nome) | CH SANTA RITA | maioria |
| 000400000803 | (sem nome) | CH SANTA RITA | maioria |
| 000400000807 | (sem nome) | SET SANTOS DUMONT | maioria |
| 000400000808 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400000824 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000825 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000826 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400000827 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000828 | (sem nome) | RES SENADOR ALBINO BOAVEN | maioria |
| 000400000829 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400000832 | (sem nome) | RES RECANTO DO BOSQUE | maioria |
| 000400000835 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000840 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000842 | (sem nome) | JD BELLA VITTA | maioria |
| 000400000847 | (sem nome) | SET RIO FORMOSO GLEBAS DE | maioria |
| 000400000848 | (sem nome) | PRQ OESTE INDUSTRIAL | maioria |
| 000400000851 | (sem nome) | SET TRES MARIAS | maioria |
| 000400000854 | (sem nome) | RES TALISMA | maioria |
| 000400000855 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000856 | (sem nome) | VI ALPES | maioria |
| 000400000867 | (sem nome) | CH SANTA RITA | maioria |
| 000400000872 | (sem nome) | RES PARQUE MENDANHA | maioria |
| 000400000873 | (sem nome) | SET SAO JOSE | maioria |
| 000400000874 | (sem nome) | CH SANTA RITA | maioria |
| 000400000875 | (sem nome) | SET SAO JOSE | maioria |
| 000400000876 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400000877 | Bella Vitta | JD BELLA VITTA | nome |
| 000400000881 | Acrópole II | RES ACROPOLE II | nome |
| 000400000882 | (sem nome) | PRQ OESTE INDUSTRIAL | maioria |
| 000400000887 | (sem nome) | LOT SOLANGE PARQUE I | maioria |
| 000400000892 | (sem nome) | RES AQUARIOS II | maioria |
| 000400000895 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000896 | (sem nome) | FAZ DOURADOS | maioria |
| 000400000898 | (sem nome) | LOT ALPHAVILLE RESIDENCIA | maioria |
| 000400000901 | (sem nome) | RES DOM RAFAEL | maioria |
| 000400000903 | (sem nome) | SET SAO JOSE | maioria |
| 000400000906 | Felicidade | VI FELICIDADE | maioria |
| 000400000909 | (sem nome) | RES BALNEARIO | maioria |
| 000400000910 | (sem nome) | RES HUGO DE MORAES | maioria |
| 000400000913 | (sem nome) | JD BALNEARIO MEIA PONTE | maioria |
| 000400000916 | (sem nome) | LOT MANSOES GOIANAS | maioria |
| 000400000919 | (sem nome) | JD VITORIA | maioria |
| 000400000923 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400000927 | (sem nome) | VI SAO LUIZ | maioria |
| 000400000931 | (sem nome) | VI MARIA DILCE | maioria |
| 000400000932 | (sem nome) | FAZ GUANABARA | maioria |
| 000400000936 | (sem nome) | SET SAO JOSE | maioria |
| 000400000937 | (sem nome) | JD SANTO ANTONIO | maioria |
| 000400000939 | (sem nome) | PRQ DAS FLORES | maioria |
| 000400000940 | (sem nome) | LOT GRANDE RETIRO | maioria |
| 000400000941 | Solange Parque II | LOT SOLANGE PARQUE II | nome |
| 000400000943 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400000944 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400000946 | (sem nome) | VI SANTA HELENA | maioria |
| 000400000949 | (sem nome) | FAZ SALINOS | maioria |
| 000400000954 | França | JD FRANCA | nome |
| 000400000956 | (sem nome) | CH ANHANGUERA | maioria |
| 000400000957 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000958 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000960 | (sem nome) | LOT SOLANGE PARQUE III | maioria |
| 000400000962 | (sem nome) | FAZ PLANICIE | maioria |
| 000400000967 | Londres | JD LONDRES | nome |
| 000400000973 | Alphaville | JD ALPHAVILLY I | maioria |
| 000400000974 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400000975 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400000976 | (sem nome) | FAZ RETIRO | maioria |
| 000400000978 | (sem nome) | FAZ RETIRO | maioria |
| 000400000981 | (sem nome) | JD MUNIQUE | maioria |
| 000400000982 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000983 | (sem nome) | VI SANTA MARIA - CONJUNTO | maioria |
| 000400000984 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400000985 | (sem nome) | RES TALISMA I | maioria |
| 000400000986 | (sem nome) | RES SANTA FE | maioria |
| 000400000987 | Brisas do Cerrado | PRQ ATHENEU | maioria |
| 000400000988 | Gleba | FAZ BOTAFOGO | maioria |
| 000400000989 | Glória Real | LOT QUINTA DO RIO DOURADO | maioria |
| 000400000990 | (sem nome) | VI LUCIANA | maioria |
| 000400000991 | (sem nome) | VI LUCIANA | maioria |
| 000400000992 | (sem nome) | PRQ FLAMBOYANT | maioria |
| 000400000994 | Zurique | JD ZURIQUE | nome |
| 000400000996 | (sem nome) | JD PRESIDENTE | maioria |
| 000400000997 | (sem nome) | FAZ RETIRO | maioria |
| 000400000998 | (sem nome) | FAZ RETIRO | maioria |
| 000400000999 | (sem nome) | FAZ RETIRO | maioria |
| 000400001001 | Gramado I | JD GRAMADO I | nome |
| 000400001003 | (sem nome) | CH SANTA BARBARA | maioria |
| 000400001006 | (sem nome) | JD NOVO MUNDO | maioria |
| 000400001008 | (sem nome) | CH CRIMEIA | maioria |
| 000400001009 | Monte Pascoal II | RES MONTE PASCOAL II | nome |
| 000400001011 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001015 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001017 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400001018 | (sem nome) | FAZ BOTAFOGO | maioria |
| 000400001020 | (sem nome) | BRO SANTO HILARIO | maioria |
| 000400001023 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001024 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001026 | (sem nome) | AREA CAMPUS SAMAMBAIA - U | maioria |
| 000400001027 | (sem nome) | CH CALIFORNIA | maioria |
| 000400001029 | (sem nome) | FAZ CATINGUEIRO | maioria |
| 000400001036 | (sem nome) | VI  MARIA DILCE | maioria |
| 000400001037 | (sem nome) | CH CALIFORNIA | maioria |
| 000400001039 | Privê Elza Fronza | LOT PRIVE ELZA FRONZA | nome |
| 000400001040 | (sem nome) | FAZ RETIRO | maioria |
| 000400001041 | (sem nome) | FAZ RETIRO | maioria |
| 000400001044 | (sem nome) | CH CRIMEIA | maioria |
| 000400001045 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001047 | (sem nome) | RES OLINDA | maioria |
| 000400001051 | (sem nome) | CH GUAREMA | maioria |
| 000400001052 | (sem nome) | VI JARDIM POMPEIA | maioria |
| 000400001053 | (sem nome) | RES LONDON PARK | maioria |
| 000400001055 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400001056 | (sem nome) | VI SAO LUIZ | maioria |
| 000400001057 | (sem nome) | SET SUDOESTE | maioria |
| 000400001058 | (sem nome) | RES ELDORADO | maioria |
| 000400001061 | (sem nome) | PRQ ACALANTO | maioria |
| 000400001063 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400001064 | (sem nome) | FAZ JOAO VAZ | maioria |
| 000400001065 | (sem nome) | BRO RECREIO DO FUNCIONARI | maioria |
| 000400001066 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001067 | (sem nome) | BRO SAO FRANCISCO | maioria |
| 000400001068 | (sem nome) | CONJ RESID RODOVIARIO | maioria |
| 000400001069 | (sem nome) | RES SANTA FE | maioria |
| 000400001070 | (sem nome) | BRO FELIZ | maioria |
| 000400001071 | Gleba | FAZ SANTA RITA | maioria |
| 000400001073 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001077 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001078 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001079 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001080 | (sem nome) | CH ALTO DA GLORIA | maioria |
| 000400001081 | (sem nome) | COD RIO BRANCO | maioria |
| 000400001082 | (sem nome) | JD MARILIZA | maioria |
| 000400001083 | Santa Rita - 8a etapa | COD SANTA RITA 8 ETAPA | maioria |
| 000400001086 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400001087 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001090 | Village Campos Verdes | RES VILLAGE CAMPOS VERDES | nome |
| 000400001095 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001096 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001099 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001100 | (sem nome) | RES ACROPOLE II | maioria |
| 000400001104 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001106 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001109 | (sem nome) | VI BOA SORTE | maioria |
| 000400001111 | (sem nome) | PRQ DAS AMENDOEIRAS | maioria |
| 000400001112 | (sem nome) | CH CALIFORNIA | maioria |
| 000400001113 | (sem nome) | PRQ ANHANGUERA | maioria |
| 000400001114 | (sem nome) | JD VITORIA | maioria |
| 000400001116 | (sem nome) | JD PRESIDENTE EXTENSAO | maioria |
| 000400001117 | (sem nome) | CH RETIRO | maioria |
| 000400001118 | (sem nome) | PRQ DOS CISNES | maioria |
| 000400001122 | Montes Claros | RES MONTES CLAROS | nome |
| 000400001123 | (sem nome) | CONJ HABITACIONAL BALIZA | maioria |
| 000400001124 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001126 | Bougainville | FAZ SANTA RITA | maioria |
| 000400001127 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001128 | (sem nome) | CH SANTA RITA | maioria |
| 000400001129 | Gleba | FAZ SANTA RITA | maioria |
| 000400001132 | Edilberto Nascimento | RES EDILBERTO NASCIMENTO | nome |
| 000400001134 | Alfa | RES ALFA | nome |
| 000400001136 | Tatyane | RES TATYANE | nome |
| 000400001137 | (sem nome) | RES ACROPOLE II | maioria |
| 000400001139 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001140 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001142 | União | COD UNIAO | nome |
| 000400001148 | Gleba | RES OURO PRETO | maioria |
| 000400001149 | (sem nome) | COD UNIAO | maioria |
| 000400001152 | Gleba | CH MARINGA | maioria |
| 000400001153 | (sem nome) | RES VILLAGIO TOSCANA | maioria |
| 000400001156 | Villagio Toscana | RES VILLAGIO TOSCANA | nome |
| 000400001162 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001163 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001164 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400001165 | Parque Cidade | LOT PARQUE CIDADE | nome |
| 000400001168 | (sem nome) | FAZ SALINOS | maioria |
| 000400001171 | Itália | JD ITALIA | nome |
| 000400001174 | (sem nome) | FAZ DOURADOS | maioria |
| 000400001178 | (sem nome) | JD BELLA VITTA | maioria |
| 000400001180 | (sem nome) | FAZ PETROPOLIS | maioria |
| 000400001183 | Jardim Botânico | BRO JARDIM BOTANICO | nome |
| 000400001184 | Aeródromo Zezé Alves Ferreira | COD AERODROMO ZEZE ALVES | maioria |
| 000400001186 | Vale Verde | LOT VALE VERDE | nome |
| 000400001188 | (sem nome) | FAZ SANTA RITA | maioria |
| 000400001189 | (sem nome) | CH BOUGAINVILLE | maioria |
| 000400001191 | (sem nome) | RES SERRA AZUL | maioria |
| 000400001192 | (sem nome) | RES PARAISO | maioria |
| 000400001194 | Água Azul | LOT AGUA AZUL | nome |
| 000400001197 | (sem nome) | FAZ SAO DOMINGOS | maioria |
| 000400001199 | (sem nome) | CONJ RESIDENCIAL CAMPUS | maioria |
| 000400001201 | Caribe | RES CARIBE | nome |
| 000400001202 | (sem nome) | BRO SANTO HILARIO EXPANSA | maioria |
| 000400001204 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400001206 | Gleba2 | LOT MORADA DOS SONHOS | maioria |
| 000400001208 | Reserva do Oriente | FAZ SANTA RITA | maioria |
| 000400001210 | Gleba 03 Faz Idenpendência | FAZ VAU DAS POMBAS | maioria |
| 000400001212 | 3/6.6 | RES ALICE BARBOSA EXTENSA | maioria |
| 000400001213 | (sem nome) | FAZ RETIRO | maioria |
| 000400046515 | (sem nome) | FAZ CAVEIRAS | maioria |
| 000400046517 | (sem nome) | RES MONTES CLAROS | maioria |
| 000400046521 | AREA | SIT DE RECREIO PANORAMA | maioria |
| 000400046523 | (sem nome) | FAZ SAO JOSE | maioria |
| 000400046529 | das Bromélias | JD DAS BROMELIAS | nome |

Total de multi-candidatos: **780**

