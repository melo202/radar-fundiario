# Inteligência Imobiliária — Radar Fundiário

> Síntese da pesquisa em 10 frentes paralelas (02/07/2026), com achados **verificados empiricamente** (downloads e queries reais). Base para a camada de inteligência: pontos de valorização, histórico, comparáveis/margem de preços.

---

## Descobertas que mudam o plano

1. **`vllanc98` está MORTO como histórico.** Teste real: `vllanc98 <> vlvenal` retorna **0 registros** em 57.225 do Setor Bueno — o campo carrega o valor atual, não o de 1998. Não existe histórico dentro da base.
2. **Em compensação, o servidor aceita** (tudo testado, JSONP-compatível): `returnCountOnly` (~200 bytes/resposta), `orderByFields`, `returnDistinctValues` (único caso onde `outFields` específico funciona), **aritmética no WHERE** (`vlvenal/areaedif < 3000` funciona!) e **busca espacial por raio em metros** (`distance=300&units=esriSRUnit_Meter`). Isso permite mediana/quartis **exatos** de R$/m² de qualquer recorte por busca binária de contagens — sem baixar registro nenhum.
3. **Bônus de custo zero:** `vlimp98` = **IPTU lançado no exercício** e `vlaliq98` = alíquota. Dá para exibir IPTU anual no card sem nenhuma consulta extra.
4. **⚠️ LGPD:** `dtnascimen` aparenta ser **data de nascimento do contribuinte** (prédio de 2018 com dtnascimen=1945). **Nunca exibir nem exportar.** `dtinclusao` é inofensiva (idade do imóvel no cadastro).
5. **Goiânia NÃO publica ITBI** (nem transações, nem valor de referência — diferente de SP/BH/POA/Rio). O venal é o **piso legal** do ITBI (LC 344/2021, art. 167). Caminho para destravar: **pedido via LAI** ao e-SIC por microdados anonimizados, citando precedentes de SP/BH/POA.
6. **Scraping de anúncios: descartado.** CORS+Cloudflare bloqueiam client-side (verificado), ToS do Grupo OLX proíbe expressamente, precedente Catho x Curriculum (concorrência desleal). Alternativa legal: transcrever **fatos agregados** publicados (FipeZap, ADEMI-GO/Brain, MySide) com atribuição.

## Fontes externas verificadas (gratuitas)

| Fonte | O quê | Acesso | CORS |
|---|---|---|---|
| FipeZap (Fipe) | Série mensal Goiânia dez/2013–hoje, R$/m² venda+locação | Excel público `fipezap-serieshistoricas.xlsx` | ❌ (snapshot estático) |
| IGMI-R (ABECIP/FGV) | Índice por laudos de avaliação, Goiânia desde 2014 | Excel gratuito | ✅ `*` |
| Banco Central (SGS) | IVG-R (21340), IPCA (433) p/ deflacionar | API JSON sem chave | ✅ `*` |
| IBGE Censo 2022 | Renda mediana por setor censitário (2.304 setores em Goiânia) | CSV FTP | pipeline offline |
| Prefeitura (dados abertos) | GeoJSON de bairros **em EPSG:31982** (mesmo CRS do app!) | CKAN | pipeline offline |
| Mapa_ModeloEspacial (mesmo ArcGIS!) | **Plano Diretor 2022 E 2007**: Áreas Adensáveis, Eixos, Corredores, OOAU, ADD, AEIS | query point-in-polygon ao vivo | JSONP igual ao cadastro |
| Mapa_SaudeFamilia etc. | Unidades de saúde, parques, no mesmo servidor | idem | ✅ |
| OSM/Overpass | TODOS os POIs de Goiânia = 2.635 elementos, **131 KB gzip** (testado) | 1 query no build | pipeline offline |
| INEP | ~1.300 escolas de Goiânia com lat/long | CSV | pipeline offline |
| ADEMI-GO/Brain, Secovi-GO, MySide | R$/m² por bairro (imprensa, trimestral) | transcrição manual c/ atribuição | tabela estática |
| SICONFI (Tesouro) | Arrecadação de ITBI de Goiânia (termômetro macro) | API JSON | ✅ |

## Metodologia defensável (substitui o "coeficiente chutado")

- **Não existe razão venal/mercado fixa** (IBAPE-SP mediu 0,26–0,80 na mesma cidade). A PGV de Goiânia é de **2015 + IPCA** → defasagem heterogênea por bairro.
- Padrão IAAO (*ratio study*): razão **mediana** mercado/venal **por bairro**, dispersão medida pelo **COD**; exibir só com **n≥5** (critério FipeZap) e COD ≤ 20%.
- **Sempre faixa, nunca número seco** (Zillow/Loft): central × (1 ± COD), selo de confiança tipo Freddie Mac (alta <13%, média 13–20%, baixa >20%).
- Comps (NBR 14653-2 + FipeZap): mesma quadra→setor→bairro (ou raio), **mesmo uso**, área entre **0,5× e 2×** a do alvo, **mediana** + Q1–Q3, outliers removidos por **cerca de Tukey** (1,5×IQR); n≥5 faixa completa, 3–4 só mediana+min-max com selo "amostra pequena".
- Disclaimer obrigatório: *"Estimativa estatística de referência (avaliação em massa, padrões IAAO). Não constitui laudo NBR 14653 nem PTAM (Res. COFECI 1.066/2007)."* — posiciona o app como **insumo para o PTAM do corretor**.

## Roadmap de inteligência (priorizado)

### I1 — Comparáveis da vizinhança ("margem de preços") — ✅ implementado 02/07/2026
Botão no detalhe: raio de 400 m (fallback 800 m), mesmo uso, área 0,5×–2×; se n≤800 baixa e calcula exato (Tukey + quartis); se n>800, busca binária de percentis via `returnCountOnly` (24 requisições de ~200 bytes). Exibe barra min–Q1–mediana–Q3–max, posição/percentil do imóvel, selo de confiança (amplitude IQR/mediana ≤30% alta / ≤40% média / >40% baixa) e conversão para mercado pelo coeficiente do setor. Cache de sessão.

### I2 — IPTU e idade no card — ✅ implementado (custo zero)
`vlimp98` (IPTU lançado) e ano de `dtinclusao` no painel de detalhe.

### I3 — Score de valorização por zoneamento (próximo)
Point-in-polygon ao vivo contra `Mapa_ModeloEspacial`: Área Adensável (L31), Eixo de Desenvolvimento (L4), Corredor (L1), OOAU (L32), ADD (L30, negativo), AEIS (L7). **Upzoning** = comparar com camadas do PD-2007 (L36–48) — o sinal mais forte de valorização. Badge no detalhe: "🔺 Lote em Área Adensável (PD-2022); era ZR-baixa no PD-2007".

### I4 — Histórico de valorização (aba "tendência")
a) Série FipeZap Goiânia embutida como JSON estático (~5 KB, atualização mensal manual/script) — gráfico da cidade.
b) IGMI-R via fetch direto (tem CORS) como segunda série.
c) **Snapshot anual próprio**: script grava mediana R$/m² venal por setor 1×/ano (a PGV é anual) → em 2–3 anos, histórico por setor **que ninguém mais tem**.

### I5 — Proximidades e contexto (build offline mensal)
`goiania-pois.json` (~100–150 KB gz): Overpass (1 query cidade inteira) + INEP escolas + Mapa_SaudeFamilia, tudo em UTM (distância = `Math.hypot`). Score de amenidades em raios 400 m/1 km. + JSON curado das obras (36 estações + 7 terminais do BRT Norte-Sul, Anel Viário R$ 1,1 bi, viadutos 2026).

### I6 — Contexto socioeconômico por bairro
Pipeline offline: CSV renda IBGE (setor censitário) × GeoJSON de bairros da Prefeitura (mesmo EPSG:31982, join direto) → `bairros-indicadores.json` (renda mediana, quintil na cidade). Rotular como "renda mediana do responsável (Censo 2022/IBGE)".

### I7 — Flag de oportunidade
Badge automático quando o R$/m² venal do lote está ≥X% abaixo da mediana da vizinhança (versão estática do PropStream Lead Automator) + detector de terreno subutilizado (razão construído/terreno baixa em quadra de venal alto).

### I8 — Destravar dado real (paralelo, sem código)
Pedido LAI ao e-SIC de Goiânia: base mensal anonimizada de guias de ITBI (bairro, quadra, tipo, área, valor, mês), citando SP/BH/Rio/POA. Se deferido, vira a melhor fonte de comps de mercado do app.

### Descartados (com motivo)
- ~~Pseudo-histórico vllanc98~~ (campo = venal atual, comprovado).
- ~~Scraping de anúncios~~ (CORS/Cloudflare/ToS/jurisprudência).
- ~~Score por padrão construtivo~~ (`cdpadrao` só 14% preenchido, `conserva` ~tudo igual).
- ~~AVM de preço absoluto~~ (sem ITBI aberto, seria chute; força do app é análise RELATIVA).

## Regras de exibição (fixas)

- `dtnascimen`: **nunca** exibir/exportar (dado pessoal).
- Venal = referência **relativa** (posição na vizinhança), imune à defasagem da PGV; conversão a mercado sempre como **faixa** via coeficiente por setor.
- Atribuições no rodapé quando usar: © OpenStreetMap contributors (ODbL), IBGE, INEP, Fipe/FipeZap, ABECIP, Prefeitura de Goiânia.
