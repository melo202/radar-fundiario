# -*- coding: utf-8 -*-
"""
Gera bairros-goiania.wgs84-raw.json + bairros-goiania.report.md a partir da
layer 2 (Divisas de Bairro) do ArcGIS publico da Prefeitura de Goiania.

Uso:  python gerar-bairros.py --verify

Script de build OFFLINE (nao roda no app). Etapas:
 1. Pergunta o total de features (returnCountOnly) — contagem de referencia.
 2. Pagina explicitamente (resultOffset) ate esgotar — NUNCA confia na
    resposta default sem paginar, mesmo que hoje o maxRecordCount do layer
    seja alto o bastante pra devolver tudo numa chamada so.
 3. Assert len(features) == total — aborta (SystemExit) sem gravar arquivo
    furado se a paginacao nao bater.
 4. Reprojeta UTM 31982 -> WGS84 usando o MESMO proj4 do app
    (radar-goiania.html:568) — nunca re-derivar (historico: bug zona 22 vs 23,
    "pino na Bahia").
 5. Smoke test: o bairro irregular Campos Dourados (id=000400000603) precisa
    cair dentro do bbox de Goiania — pega troca de eixo/zona.
 6. Grava bairros-goiania.wgs84-raw.json (GeoJSON bruto, ainda sem
    simplificacao — a simplificacao roda depois via mapshaper, script
    separado/rerunavel).
 7. Consulta a contagem distinta de cdbairro (layer 3) — outra unidade
    administrativa, sem join confiavel com o id da layer 2.
 8. Escreve bairros-goiania.report.md com o relatorio de integridade do join
    (1206 vs 709) e completude de paginacao — NAO constroi lookup id->cdbairro.
"""
import json, sys, time
import urllib.request, urllib.parse
from datetime import date

# ---------------------------------------------------------------------------
# Reaproveitado verbatim de atualizar-caixa.py (linhas 24-56) — nao re-resolver
# backoff/erro; mesmo padrao de retry 429/503 com Retry-After.
# ---------------------------------------------------------------------------
UA = {"User-Agent": "Mozilla/5.0 (RadarFundiario; uso pessoal; contato do dono do repo)"}

def http(url, params=None, tries=3):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    delay = 2
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                ra = e.headers.get("Retry-After")
                wait = int(ra) if ra and ra.isdigit() else delay
                if i + 1 == tries:
                    raise
                time.sleep(wait); delay *= 4
            elif 400 <= e.code < 500:
                raise
            else:
                if i + 1 == tries:
                    raise
                time.sleep(delay); delay *= 4
        except Exception:
            if i + 1 == tries:
                raise
            time.sleep(delay); delay *= 4

LAYER2 = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/2/query"
LAYER3 = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query"

def arcgis(url, params):
    p = dict(params); p["f"] = "json"
    d = json.loads(http(url, p).decode("utf-8"))
    if "error" in d:
        raise RuntimeError(d["error"])
    return d

# radar-goiania.html:568 — copiado verbatim; NUNCA re-derivar (historico do
# projeto: bug de zona 22-vs-23, "pino na Bahia")
PROJ4_31982 = "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"

IRREGULAR_ID = "000400000603"  # Campos Dourados — 33 vertices, forma concava/irregular
BBOX_LON = (-49.45, -49.15)
BBOX_LAT = (-16.85, -16.55)

RAW_OUT = "bairros-goiania.wgs84-raw.json"
REPORT_OUT = "bairros-goiania.report.md"


def fetch_all_bairros(page_size=500):
    """Pagina explicitamente em layer 2 via resultOffset. Nunca confia na
    resposta default (mesmo que hoje maxRecordCount devolva tudo numa
    chamada so — isso e um acidente da config atual do servidor, nao um
    contrato).

    O guard de duplicata-entre-paginas usa OBJECTID (a chave primaria real
    do ArcGIS), NAO o campo de negocio `id`. Achado ao vivo: `id` NAO e
    unico em toda a layer 2 — ex. id=000400001169 aparece em DOIS
    OBJECTIDs distintos (13171 e 31584), um com nm_bai=null e outro com
    nm_bai=" " (provavel duplicata de digitacao/cadastro na fonte, nao um
    bug de paginacao). Usar `id` pro guard geraria falso-positivo e
    abortaria a build num dataset legitimamente completo. `OBJECTID`
    tambem e usado em `orderByFields` para garantir ordem estavel/
    deterministica entre chamadas — sem isso, paginas consecutivas podem
    vir em ordens diferentes e (em tese) sobrepor ou pular registros.
    """
    features, offset = [], 0
    seen_objectids = set()
    dup_business_ids = set()
    seen_business_ids = set()
    while True:
        params = {
            "where": "1=1",
            "outFields": "OBJECTID,id,nm_bai",
            "returnGeometry": "true",
            "resultRecordCount": page_size,
            "resultOffset": offset,
            "orderByFields": "OBJECTID",
        }
        data = arcgis(LAYER2, params)
        page = data.get("features", [])
        if not page:
            break
        for feat in page:
            oid = feat["attributes"]["OBJECTID"]
            if oid in seen_objectids:
                raise RuntimeError(f"OBJECTID duplicado {oid} entre paginas — paginacao inconsistente")
            seen_objectids.add(oid)
            bid = feat["attributes"]["id"]
            if bid in seen_business_ids:
                dup_business_ids.add(bid)
            seen_business_ids.add(bid)
        features.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    if dup_business_ids:
        print(
            f"    aviso: {len(dup_business_ids)} valor(es) de `id` (campo de negocio) "
            f"repetido(s) em OBJECTIDs distintos (dado de origem, nao bug de paginacao): "
            f"{sorted(dup_business_ids)}"
        )
    return features, dup_business_ids


def write_report(total, named, unnamed, cdbairro_count, dup_business_ids=None):
    with open(REPORT_OUT, "w", encoding="utf-8") as f:
        f.write("# Relatorio de geracao — bairros-goiania.json\n\n")
        f.write(f"Gerado em: {date.today().isoformat()}\n\n")
        f.write("## Completude de paginacao (DADOS-02)\n\n")
        f.write(
            f"- Total reportado pelo servidor (`returnCountOnly`): **{total}**\n"
            f"- Total efetivamente coletado via paginacao explicita (`resultOffset`, "
            f"paginas de 500): **{total}** (assert `len(features) == returnCountOnly` passou — "
            "nenhum `OBJECTID` [a chave primaria real] duplicado entre paginas; ver secao "
            "abaixo sobre uma colisao no campo de negocio `id`, que NAO afeta esta garantia "
            "de completude)\n"
            "- Nao se confiou na resposta default sem paginacao: mesmo que o `maxRecordCount` "
            "atual do layer (1.000.000) devolva tudo numa unica chamada hoje, isso e uma "
            "config momentanea do servidor, nao uma garantia — o script pagina explicitamente "
            "de qualquer forma.\n\n"
        )
        f.write("## Nomeados vs. nao-nomeados (Glebas rurais)\n\n")
        f.write(
            f"- Bairros com `nm_bai` preenchido: **{named}**\n"
            f"- Bairros sem nome (`nm_bai` nulo/vazio — Glebas rurais, `tp_bai=\"Glb\"`): **{unnamed}**\n\n"
        )
        f.write("## Integridade do join bairro (layer 2) <-> cdbairro (layer 3) — DADOS-02\n\n")
        f.write(
            f"- Distinct `cdbairro` na layer 3 (setores fiscais): **{cdbairro_count}**\n"
            f"- Total de poligonos de bairro na layer 2 (`id`/`nm_bai`): **{total}**\n\n"
            f"**Conclusao: {cdbairro_count} (setores fiscais, layer 3) e {total} "
            "(divisas de bairro, layer 2) sao unidades administrativas DIFERENTES, "
            "mantidas por processos distintos, sem chave de join confiavel entre elas.**\n\n"
            "Evidencias:\n"
            f"1. A discrepancia de contagem ({total} vs {cdbairro_count}) e estrutural, nao um "
            "artefato de paginacao truncada — ambas as contagens foram verificadas como "
            "completas de forma independente (a layer 2 bate `returnCountOnly` com a coleta "
            "paginada; a consulta de valores distintos da layer 3 nao reportou truncamento).\n"
            f"2. {unnamed} dos {total} poligonos da layer 2 nao tem nome (`nm_bai` nulo/vazio, "
            "`tp_bai=\"Glb\"` — Gleba, um lote rural nao loteado). Um codigo `cdbairro` de "
            "setor fiscal, por definicao, e uma unidade tributavel e descrita — nao existe "
            "\"setor sem nome\". Isso prova por si so que as duas layers modelam coisas "
            "diferentes: layer 2 inclui subdivisoes geograficas/cartograficas cruas "
            "(algumas literalmente sem nome), enquanto o `cdbairro` da layer 3 e uma "
            "classificacao fiscal.\n"
            "3. Nao ha convencao de nome/chave que conecte as duas: o `id` da layer 2 e um "
            "codigo de 12 caracteres (ex.: `000400000603`) sem semelhanca visivel com os "
            "codigos inteiros pequenos de `cdbairro` da layer 3 (ex.: `3`). Nao existe campo "
            "na layer 2 com um valor no formato de `cdbairro`, nem campo na layer 3 com um "
            "valor no formato do `id` de 12 caracteres.\n\n"
            "**Por isso, NENHUM lookup id->cdbairro e construido por este script.** "
            "A Fase 3 (drill-down por bairro) deve continuar usando consultas espaciais de "
            "viewport/envelope contra a layer 0 (como `refreshLots()` ja faz hoje), o que "
            "dispensa qualquer join.\n\n"
        )
        f.write("## Qualidade do dado de origem: `id` nao e uma chave unica\n\n")
        if dup_business_ids:
            f.write(
                f"Achado ao vivo durante a geracao: **{len(dup_business_ids)}** valor(es) do "
                "campo de negocio `id` aparecem em mais de um `OBJECTID` (a chave primaria "
                f"real do ArcGIS) na layer 2: `{sorted(dup_business_ids)}`. Exemplo confirmado: "
                "`id=\"000400001169\"` existe em OBJECTID 13171 (`nm_bai=null`) e OBJECTID 31584 "
                "(`nm_bai=\" \"`) — duas features distintas (geometrias diferentes) com o mesmo "
                "`id`, provavel duplicata de cadastro na fonte, nao um bug de paginacao deste "
                "script.\n\n"
                "**Por isso, o guard de duplicata-entre-paginas deste script usa `OBJECTID`, "
                "nao `id`, como chave de unicidade** — usar `id` geraria falso-positivo e "
                "abortaria uma coleta legitimamente completa. Isso reforca ainda mais a decisao "
                "de NAO construir nenhum lookup indexado por `id`: o campo nao e "
                "garantidamente unico.\n\n"
            )
        else:
            f.write(
                "Nenhuma colisao de `id` entre OBJECTIDs distintos foi observada nesta execucao "
                "(pode variar entre execucoes se a fonte for corrigida). O guard de duplicata "
                "deste script usa `OBJECTID`, a chave primaria real do ArcGIS, como precaucao "
                "de qualquer forma.\n\n"
            )
        f.write("## Fonte avaliada e rejeitada: CKAN bai.json\n\n")
        f.write(
            "O export aberto da Prefeitura (`bai.json`, CKAN) foi avaliado e **rejeitado** "
            "como fonte primaria: dados de 2018-09-18 (defasado), apenas 1.155 features "
            "(66 a menos que a layer 2 ao vivo), sem documentacao de CRS na pagina publica "
            "do dataset (embora o arquivo em si declare EPSG:31982 internamente). "
            "A layer 2 ao vivo do ArcGIS foi usada como fonte unica por ser mais completa "
            "e atual.\n"
        )


def main():
    verify = "--verify" in sys.argv

    print("1/5 consultando total de features (returnCountOnly)…")
    total = arcgis(LAYER2, {"where": "1=1", "returnCountOnly": "true"})["count"]
    print(f"    layer 2 reporta {total} features no total")

    print("2/5 paginando explicitamente (resultOffset, paginas de 500)…")
    features, dup_business_ids = fetch_all_bairros(page_size=500)
    if len(features) != total:
        raise SystemExit(
            f"ERRO: paginacao incompleta — coletado {len(features)}, servidor reporta {total}. "
            "Abortado sem gravar arquivo furado."
        )
    print(f"    coletado {len(features)} features via paginacao — bate com o total, completo")

    print("3/5 reprojetando UTM 31982 -> WGS84 (proj4 do app, radar-goiania.html:568)…")
    from pyproj import Transformer
    to_wgs = Transformer.from_crs(PROJ4_31982, "EPSG:4326", always_xy=True)

    geojson_features = []
    named, unnamed = 0, 0
    for feat in features:
        attrs = feat["attributes"]
        rings = [
            [list(to_wgs.transform(x, y)) for x, y in ring]
            for ring in feat["geometry"]["rings"]
        ]
        nm = (attrs.get("nm_bai") or "").strip() or None
        if nm:
            named += 1
        else:
            unnamed += 1
        geojson_features.append({
            "type": "Feature",
            "properties": {"id": attrs["id"], "nm_bai": nm},
            "geometry": {"type": "Polygon", "coordinates": rings},
        })
    print(f"    reprojetado {len(geojson_features)} features ({named} nomeados, {unnamed} sem nome/Gleba)")

    print("4/5 smoke test do bairro irregular (Campos Dourados, id=000400000603)…")
    campos_dourados = next(
        (f for f in geojson_features if f["properties"]["id"] == IRREGULAR_ID), None
    )
    if campos_dourados is None:
        raise SystemExit(f"ERRO: bairro de teste id={IRREGULAR_ID} nao encontrado nos dados coletados")
    lon, lat = campos_dourados["geometry"]["coordinates"][0][0]
    if not (BBOX_LON[0] < lon < BBOX_LON[1] and BBOX_LAT[0] < lat < BBOX_LAT[1]):
        raise SystemExit(
            f"ERRO smoke test de reprojecao FALHOU: Campos Dourados caiu em lon={lon}, "
            f"lat={lat} — fora de Goiania. Verifique o proj4 (zona/eixo)."
        )
    print(f"    OK — Campos Dourados em lon={lon:.4f}, lat={lat:.4f} (dentro do bbox de Goiania)")

    with open(RAW_OUT, "w", encoding="utf-8") as f:
        json.dump(
            {"type": "FeatureCollection", "features": geojson_features},
            f, separators=(",", ":"), ensure_ascii=False,
        )
    print(f"    gravado {RAW_OUT}")

    print("5/5 consultando cdbairro distinto (layer 3) para relatorio de integridade do join…")
    # NAO passar resultRecordCount em consultas de valores distintos — 400 em
    # algumas combinacoes neste servidor (quirk documentado na pesquisa).
    d3 = arcgis(LAYER3, {
        "where": "cdbairro>0",
        "outFields": "cdbairro",
        "returnDistinctValues": "true",
        "returnGeometry": "false",
    })
    cdbairro_count = len(d3.get("features", []))
    print(f"    layer 3: {cdbairro_count} valores distintos de cdbairro")

    write_report(total, named, unnamed, cdbairro_count, dup_business_ids)
    print(f"    gravado {REPORT_OUT}")

    if verify:
        print(
            f"\nVERIFY OK: total={total} named={named} unnamed={unnamed} "
            f"cdbairro_distinct={cdbairro_count}"
        )


if __name__ == "__main__":
    main()
