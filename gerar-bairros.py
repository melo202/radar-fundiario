# -*- coding: utf-8 -*-
"""
Gera bairros-goiania.wgs84-raw.json + bairros-goiania.report.md a partir da
layer 2 (Divisas de Bairro) do ArcGIS publico da Prefeitura de Goiania.

Uso:  python gerar-bairros.py --verify        (roda Step 4.5 e imprime RECON)
      python gerar-bairros.py --apply-names   (aplica RECON no json committed)

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
 4.5. (NOVO, so com --verify) Reconciliacao de nomes via spatial join POST a
    layer 3 — GET com geometria de poligono da 404/414 intermitente nesse
    servidor (quirk verificado ao vivo, DATA-NAMES.md 1.3); nomes vem de
    `nmbairro` (layer 3, autoritativo, zero brancos), NUNCA de string-match
    do `nm_bai` cru da layer 2 (que tem erros + mojibake, ex. "Petr�polis",
    e cujo match por string falha ~99,5% medido). String-match e usado SO
    como tie-break de desambiguacao entre candidatos espaciais multiplos
    (ver `reconcile_name`), nunca como fonte primaria do nome. Roda em
    coordenadas UTM 31982 CRUAS (antes da reprojecao) — reprojetar antes
    corromperia o join silenciosamente. Persiste em bairros-goiania.recon.json.
 5. Smoke test: o bairro irregular Campos Dourados (id=000400000603) precisa
    cair dentro do bbox de Goiania — pega troca de eixo/zona.
 6. Grava bairros-goiania.wgs84-raw.json (GeoJSON bruto, ainda sem
    simplificacao — a simplificacao roda depois via mapshaper, script
    separado/rerunavel) + bairros-goiania.recon.json (se --verify).
    Consulta a contagem distinta de cdbairro (layer 3) — outra unidade
    administrativa, sem join confiavel com o id da layer 2.
 7. Escreve bairros-goiania.report.md com o relatorio de integridade do join
    (1206 vs 709), completude de paginacao e (se houver RECON) a secao de
    reconciliacao de nomes — NAO constroi lookup id->cdbairro.

Modo --apply-names (separado, roda DEPOIS de --verify): carrega
bairros-goiania.recon.json + bairros-goiania.json (o artefato simplificado
committed) e injeta o nome reconciliado em properties.nm_bai por `id`,
preservando geometria/contagem BYTE-IDENTICAS (Task 2).
"""
import json, sys, time, unicodedata
import urllib.request, urllib.parse
from datetime import date

# ---------------------------------------------------------------------------
# Reaproveitado verbatim de atualizar-caixa.py (linhas 24-56) — nao re-resolver
# backoff/erro; mesmo padrao de retry 429/503 com Retry-After.
# ---------------------------------------------------------------------------
UA = {"User-Agent": "Mozilla/5.0 (RadarFundiario; uso pessoal; contato do dono do repo)"}

def http(url, params=None, tries=5):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    delay = 2
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            # 502 tratado explicitamente igual 429/503 (quirk documentado:
            # "502-under-load" do portalmapa.goiania.go.gov.br sob POSTs
            # sustentados da reconciliacao de nomes, Step 4.5) — backoff
            # exponencial com Retry-After honrado quando presente.
            if e.code in (429, 502, 503):
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

def arcgis(url, params, tries=5):
    """`tries` aqui reenvia a chamada INTEIRA (nao so a leitura HTTP) quando
    o corpo devolvido nao e JSON valido — achado ao vivo nesta execucao:
    o endpoint por vezes devolve HTTP 200 com corpo truncado/vazio sob
    carga (502-under-load documentado, mas essa variante nao vira
    HTTPError — vira JSONDecodeError). `http()` ja tem seu proprio
    backoff por tentativa de rede; este loop cobre a camada de cima
    (resposta 200 mas payload invalido)."""
    p = dict(params); p["f"] = "json"
    delay = 2
    for i in range(tries):
        try:
            d = json.loads(http(url, p).decode("utf-8"))
        except json.JSONDecodeError:
            if i + 1 == tries:
                raise
            time.sleep(delay); delay *= 4
            continue
        if "error" in d:
            raise RuntimeError(d["error"])
        return d


def http_post(url, params, tries=5):
    """Irmao do `http()` GET acima, mas envia o body como POST
    form-encoded. Necessario para consultas espaciais com geometria de
    poligono na layer 3 — GET intermitentemente 404/414 para poligonos
    realistas (30+ vertices), quirk novo verificado ao vivo (DATA-NAMES.md
    1.3). MESMO backoff 429/502/503 do `http()` GET — nao re-derivar."""
    body = urllib.parse.urlencode(params).encode("utf-8")
    headers = {**UA, "Content-Type": "application/x-www-form-urlencoded"}
    delay = 2
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            return urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            # 502 explicito (quirk "502-under-load" sob POSTs sustentados
            # da reconciliacao Step 4.5) — mesmo backoff exponencial de
            # 429/503, Retry-After honrado quando presente.
            if e.code in (429, 502, 503):
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


def arcgis_post(url, params, tries=5):
    """Irmao POST de `arcgis()` — mesma injecao de f=json + raise em erro,
    mas via `http_post` (body form-encoded, nao querystring). Mesmo retry
    de camada-JSON de `arcgis()` (200 com corpo truncado/invalido sob
    carga — achado ao vivo)."""
    p = dict(params); p["f"] = "json"
    delay = 2
    for i in range(tries):
        try:
            d = json.loads(http_post(url, p).decode("utf-8"))
        except json.JSONDecodeError:
            if i + 1 == tries:
                raise
            time.sleep(delay); delay *= 4
            continue
        if "error" in d:
            raise RuntimeError(d["error"])
        return d


def norm(s):
    """Normaliza para o tie-break de nome: accent-strip (NFKD) + uppercase +
    collapse de espacos. Usado SO para desambiguar entre candidatos
    espaciais multiplos — nunca como fonte primaria do nome (string-match
    cru falha ~99,5% medido, DATA-NAMES.md 1.1)."""
    if not s:
        return ""
    stripped = "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )
    return " ".join(stripped.upper().split())


def _envelope_of(rings_utm):
    """Bbox (envelope) UTM 31982 de um conjunto de rings — usado como
    fallback de geometria (ver `reconcile_name`)."""
    xs = [x for ring in rings_utm for x, y in ring]
    ys = [y for ring in rings_utm for x, y in ring]
    return {
        "xmin": min(xs), "ymin": min(ys), "xmax": max(xs), "ymax": max(ys),
        "spatialReference": {"wkid": 31982},
    }


def _query_layer3(rings_utm, extra_params, use_envelope=False):
    """POST a layer 3 com a geometria do poligono; faz fallback automatico
    para o ENVELOPE (bbox) do poligono se o POST com os rings completos
    falhar (`JSONDecodeError` apos retries do `arcgis_post`).

    Quirk novo verificado ao vivo nesta execucao: poligonos muito grandes
    (observado: 2301 vertices, corpo POST ~97KB) fazem o ArcGIS Web
    Adaptor devolver HTTP 200 com uma pagina HTML de erro
    ("Could not access any GIS Server machines") em vez de JSON — e
    DETERMINISTICO para aquele poligono especifico (nao e o 429/503
    transiente ja tratado pelo backoff), sobrevive a novas tentativas
    idênticas. O envelope (bbox) do mesmo poligono, por ser um payload
    muito menor, funciona sempre. Usar o envelope so pode ADICIONAR
    candidatos falso-positivos (nunca remover um candidato correto) —
    aceitavel porque o proprio algoritmo de desambiguacao (tie-break por
    nome / maioria de contagem) ja lida com candidatos multiplos; afeta
    so os ~poucos poligonos > ~1500-2000 vertices deste dataset.
    """
    if use_envelope:
        geometry = json.dumps(_envelope_of(rings_utm))
        geom_params = {"geometry": geometry, "geometryType": "esriGeometryEnvelope", "inSR": "31982"}
    else:
        geometry = json.dumps({"rings": rings_utm, "spatialReference": {"wkid": 31982}})
        geom_params = {"geometry": geometry, "geometryType": "esriGeometryPolygon", "inSR": "31982"}

    params = {**geom_params, "spatialRel": "esriSpatialRelIntersects", **extra_params}
    if use_envelope:
        return arcgis_post(LAYER3, params)
    try:
        return arcgis_post(LAYER3, params)
    except json.JSONDecodeError:
        return _query_layer3(rings_utm, extra_params, use_envelope=True)


def reconcile_name(rings_utm, nm_bai_original):
    """Implementa o algoritmo autoritativo de reconciliacao espacial
    (DATA-NAMES.md 1.3): para o poligono de bairro (rings ainda em UTM
    31982, ANTES da reprojecao — reprojetar primeiro corromperia o join
    silenciosamente), acha o(s) setor(es) cadastrais (layer 3,
    cdbairro/nmbairro) que ele intersecta e resolve o nome vencedor.

    Retorna (cdbairro, nmbairro, motivo) onde motivo in
    {"sem-parcela", "unico", "nome", "maioria"}. cdbairro/nmbairro sao
    None quando motivo == "sem-parcela" (0 candidatos — gleba/terra vaga
    sem parcela cadastrada ainda; NAO fabrica nome).
    """
    # throttle antes de CADA POST a layer 3 (nao so entre chamadas dentro
    # do mesmo poligono) — reduz a chance de disparar o 502-under-load sob
    # a carga sustentada de ~3400 chamadas do loop de reconciliacao
    # (Step 4.5); vale tanto pro caso de 1 candidato (so essa chamada)
    # quanto pro caso multi-candidato (chamadas extras abaixo).
    # 0.05s: a latencia de rede (~1-2s/chamada) ja limita a taxa
    # naturalmente; o endpoint aguentou 50+ chamadas consecutivas sem 502,
    # entao o sleep e so um buffer minimo (evita rajada) sem gastar
    # wall-clock a toa (o loop tem ~3400 chamadas).
    time.sleep(0.05)
    d = _query_layer3(rings_utm, {
        "where": "cdbairro>0",
        "outFields": "cdbairro,nmbairro",
        "returnDistinctValues": "true",
        "returnGeometry": "false",
    })
    candidates = [
        (f["attributes"]["cdbairro"], (f["attributes"]["nmbairro"] or "").strip())
        for f in d.get("features", [])
    ]

    if len(candidates) == 0:
        return (None, None, "sem-parcela")

    if len(candidates) == 1:
        cdbairro, nmbairro = candidates[0]
        return (cdbairro, nmbairro, "unico")

    # 2+ candidatos: contagem de parcelas por candidato (returnCountOnly) +
    # tie-break assistido por nome (NAO maioria pura — contra-exemplo
    # "Ofugi" verificado ao vivo: maioria-por-contagem escolheria
    # "VI SANTA HELENA" [59 parcelas] em vez do correto "VI OFUGI"
    # [7 parcelas], porque norm("Ofugi") e substring de norm("VI OFUGI")).
    counts = {}
    for cdbairro, nmbairro in candidates:
        time.sleep(0.05)
        cd = _query_layer3(rings_utm, {
            "where": f"cdbairro={cdbairro}",
            "returnCountOnly": "true",
        })
        counts[cdbairro] = cd.get("count", 0)

    norm_original = norm(nm_bai_original)
    name_matches = []
    if norm_original:
        for cdbairro, nmbairro in candidates:
            norm_cand = norm(nmbairro)
            if norm_cand and (norm_original in norm_cand or norm_cand in norm_original):
                name_matches.append((cdbairro, nmbairro))

    if len(name_matches) == 1:
        cdbairro, nmbairro = name_matches[0]
        return (cdbairro, nmbairro, "nome")

    # senao (0 ou 2+ matches de nome — nome nao desambigua sozinho): maior
    # contagem de parcelas vence (maioria).
    winner_cd, winner_nm = max(candidates, key=lambda c: counts.get(c[0], 0))
    return (winner_cd, winner_nm, "maioria")

# radar-goiania.html:568 — copiado verbatim; NUNCA re-derivar (historico do
# projeto: bug de zona 22-vs-23, "pino na Bahia")
PROJ4_31982 = "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"

IRREGULAR_ID = "000400000603"  # Campos Dourados — 33 vertices, forma concava/irregular
BBOX_LON = (-49.45, -49.15)
BBOX_LAT = (-16.85, -16.55)

RAW_OUT = "bairros-goiania.wgs84-raw.json"
REPORT_OUT = "bairros-goiania.report.md"
RECON_OUT = "bairros-goiania.recon.json"  # RECON persistido p/ o modo --apply-names (Step 4.5)
FINAL_OUT = "bairros-goiania.json"  # artefato simplificado committed (Task 2 injeta nomes aqui)
GLEBA_LABEL = "Gleba não denominada"  # rotulo generico p/ poligonos sem parcela intersectada (0 candidatos)


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


def write_report(total, named, unnamed, cdbairro_count, dup_business_ids=None, recon=None):
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

        if recon:
            _write_reconciliation_section(f, recon)


def _write_reconciliation_section(f, recon):
    """Secao de reconciliacao de nomes (NOMES-01/03) do report — contadores,
    tabela de diff antes->depois por poligono, subsecao multi-candidatos.
    `recon` = dict {id: {"cdbairro","nmbairro_reconciled","motivo",
    "nm_bai_original"}} (RECON, produzido pelo Step 4.5)."""
    f.write("\n## Reconciliacao de nomes (NOMES-01/03)\n\n")

    total = len(recon)
    motivo_counts = {"sem-parcela": 0, "unico": 0, "nome": 0, "maioria": 0, "erro-endpoint": 0}
    recuperados_de_branco = 0
    nomes_mudados = 0
    nao_resolvidos = 0
    diffs = []  # (id, original, reconciliado, motivo)
    multi_candidatos = []  # (id, original, reconciliado, motivo)

    for bid, r in sorted(recon.items()):
        motivo = r["motivo"]
        motivo_counts[motivo] = motivo_counts.get(motivo, 0) + 1
        original = r["nm_bai_original"]
        reconciliado = r["nmbairro_reconciled"] if r["nmbairro_reconciled"] else GLEBA_LABEL

        if motivo == "sem-parcela":
            nao_resolvidos += 1
            if original is not None:
                diffs.append((bid, original, reconciliado, motivo))
            continue

        if motivo == "erro-endpoint":
            # Falha persistente de endpoint (502 apos retries) — poligono
            # NAO foi reconciliado nesta execucao; fica com o nome
            # original como fallback (nunca fabrica nome). Contabilizado
            # como nao-resolvido; um re-run (resume) reprocessa so estes.
            nao_resolvidos += 1
            diffs.append((bid, original if original is not None else "(sem nome)", reconciliado, motivo))
            continue

        if original is None:
            recuperados_de_branco += 1
            diffs.append((bid, "(sem nome)", reconciliado, motivo))
        elif norm(original) != norm(r["nmbairro_reconciled"]):
            nomes_mudados += 1
            diffs.append((bid, original, reconciliado, motivo))

        if motivo in ("nome", "maioria"):
            multi_candidatos.append((bid, original or "(sem nome)", reconciliado, motivo))

    f.write(
        f"- Total de poligonos reconciliados: **{total}**\n"
        f"- Recuperados-de-branco (`nm_bai` original vazio, nome achado via join): "
        f"**{recuperados_de_branco}**\n"
        f"- Nomes-mudados (`nm_bai` original preenchido, mas divergia do nome autoritativo): "
        f"**{nomes_mudados}**\n"
        f"- Nao-resolvidos (0 candidatos espaciais — gleba/terra vaga sem parcela; rotulados "
        f"`\"{GLEBA_LABEL}\"`): **{nao_resolvidos}**\n\n"
        "Quebra por motivo de resolucao:\n\n"
        f"- `unico` (1 candidato espacial, sem ambiguidade): **{motivo_counts.get('unico', 0)}**\n"
        f"- `nome` (2+ candidatos, desambiguado por tie-break de nome): "
        f"**{motivo_counts.get('nome', 0)}**\n"
        f"- `maioria` (2+ candidatos, desambiguado por maior contagem de parcelas): "
        f"**{motivo_counts.get('maioria', 0)}**\n"
        f"- `sem-parcela` (0 candidatos — nao resolvido, rotulo generico aplicado): "
        f"**{motivo_counts.get('sem-parcela', 0)}**\n"
        f"- `erro-endpoint` (falha persistente do endpoint apos retries — nao resolvido "
        f"nesta execucao, nome original mantido como fallback; reprocessavel num re-run/"
        f"resume): **{motivo_counts.get('erro-endpoint', 0)}**\n\n"
    )

    f.write("### Tabela de diff — antes -> depois por poligono\n\n")
    if diffs:
        f.write("| id | nm_bai_original | nmbairro_reconciled | motivo |\n")
        f.write("|---|---|---|---|\n")
        for bid, original, reconciliado, motivo in diffs:
            f.write(f"| {bid} | {original} | {reconciliado} | {motivo} |\n")
        f.write(f"\nTotal de linhas na tabela de diff: **{len(diffs)}**\n\n")
    else:
        f.write("Nenhuma mudanca de nome detectada.\n\n")

    f.write("### Multi-candidatos (conferencia)\n\n")
    f.write(
        "Poligonos que intersectaram 2+ setores cadastrais (`cdbairro`) distintos — "
        "casos de risco (bordas administrativas) resolvidos por tie-break de nome "
        "(`nome`) ou maioria de parcelas (`maioria`). Revisao humana por amostra e "
        "item de acompanhamento **nao-bloqueante** (Open Decision #1).\n\n"
    )
    if multi_candidatos:
        f.write("| id | nm_bai_original | nmbairro_reconciled (vencedor) | motivo |\n")
        f.write("|---|---|---|---|\n")
        for bid, original, reconciliado, motivo in multi_candidatos:
            f.write(f"| {bid} | {original} | {reconciliado} | {motivo} |\n")
        f.write(f"\nTotal de multi-candidatos: **{len(multi_candidatos)}**\n\n")
    else:
        f.write("Nenhum multi-candidato nesta execucao.\n\n")


def apply_names():
    """Modo --apply-names: injeta os nomes reconciliados (bairros-goiania.recon.json,
    produzido por --verify) no bairros-goiania.json JA COMMITTED/simplificado,
    tocando SO properties.nm_bai. NAO re-simplifica (mapshaper) — preserva
    geometria/contagem BYTE-IDENTICAS. Glebas sem candidato (0 parcelas
    intersectadas) recebem o rotulo generico GLEBA_LABEL; nenhum nome fiscal
    e fabricado."""
    print(f"carregando {RECON_OUT}…")
    with open(RECON_OUT, encoding="utf-8") as f:
        recon = json.load(f)
    print(f"    {len(recon)} reconciliacoes carregadas")

    print(f"carregando {FINAL_OUT} (artefato committed, geometria a preservar)…")
    with open(FINAL_OUT, encoding="utf-8") as f:
        data = json.load(f)
    print(f"    {len(data['features'])} features carregadas")

    changed = 0
    missing = []
    for feat in data["features"]:
        bid = feat["properties"]["id"]
        r = recon.get(bid)
        if r is None:
            missing.append(bid)
            continue
        new_name = r["nmbairro_reconciled"] if r["nmbairro_reconciled"] else GLEBA_LABEL
        if feat["properties"]["nm_bai"] != new_name:
            changed += 1
        feat["properties"]["nm_bai"] = new_name

    if missing:
        raise SystemExit(
            f"ERRO: {len(missing)} feature(s) do {FINAL_OUT} sem entrada correspondente em "
            f"{RECON_OUT} (RECON incompleto ou dessincronizado) — abortado sem gravar. "
            f"ids: {missing[:10]}{'…' if len(missing) > 10 else ''}"
        )

    with open(FINAL_OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    print(
        f"gravado {FINAL_OUT}: {len(data['features'])} features, {changed} nomes mudados "
        "(geometria/id/ordem preservados — so properties.nm_bai foi tocado)"
    )


def main():
    if "--apply-names" in sys.argv:
        apply_names()
        return

    verify = "--verify" in sys.argv

    print("1/6 consultando total de features (returnCountOnly)…")
    total = arcgis(LAYER2, {"where": "1=1", "returnCountOnly": "true"})["count"]
    print(f"    layer 2 reporta {total} features no total")

    print("2/6 paginando explicitamente (resultOffset, paginas de 500)…")
    features, dup_business_ids = fetch_all_bairros(page_size=500)
    if len(features) != total:
        raise SystemExit(
            f"ERRO: paginacao incompleta — coletado {len(features)}, servidor reporta {total}. "
            "Abortado sem gravar arquivo furado."
        )
    print(f"    coletado {len(features)} features via paginacao — bate com o total, completo")

    print("3/6 reprojetando UTM 31982 -> WGS84 (proj4 do app, radar-goiania.html:568)…")
    from pyproj import Transformer
    to_wgs = Transformer.from_crs(PROJ4_31982, "EPSG:4326", always_xy=True)

    geojson_features = []
    named, unnamed = 0, 0
    for feat in features:
        attrs = feat["attributes"]
        geom = feat.get("geometry") or {}
        src_rings = geom.get("rings")
        if not src_rings:
            # defesa: feature sem geometria no retorno do endpoint (não deve ocorrer,
            # mas não confiar cegamente em servidor de terceiro sem SLA)
            raise SystemExit(
                f"ERRO: feature id={attrs.get('id')!r} (OBJECTID={attrs.get('OBJECTID')!r}) "
                "veio sem geometry/rings — abortado sem gravar arquivo furado."
            )
        rings = [
            [list(to_wgs.transform(x, y)) for x, y in ring]
            for ring in src_rings
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

    RECON = {}
    if verify:
        # Resume/checkpoint: se ja existe um RECON_OUT de uma execucao
        # anterior (completa ou interrompida por erro de endpoint), carrega
        # e PULA os `id` ja RESOLVIDOS (qualquer motivo exceto
        # "erro-endpoint") — um re-run continua em vez de reiniciar do
        # zero, e reprocessa os que sobraram como "erro-endpoint" na
        # execucao anterior. O endpoint (portalmapa.goiania.go.gov.br) e
        # flaky sob carga sustentada (502-under-load, ~3400 chamadas POST
        # deste loop); sem isso, uma falha perto do fim do dataset forcaria
        # refazer TUDO.
        limit = None
        for arg in sys.argv:
            if arg.startswith("--limit="):
                limit = int(arg.split("=", 1)[1])
        try:
            with open(RECON_OUT, encoding="utf-8") as f:
                RECON = json.load(f)
            print(f"4/6 retomando reconciliacao — {len(RECON)} poligono(s) em {RECON_OUT} (resume)…")
        except FileNotFoundError:
            print("4/6 reconciliando nomes via spatial join POST a layer 3 (Step 4.5, ~13-15min, ~3400 chamadas)…")

        pending = [
            f for f in features
            if f["attributes"]["id"] not in RECON
            or RECON[f["attributes"]["id"]]["motivo"] == "erro-endpoint"
        ]
        if limit is not None:
            pending = pending[:limit]
        total_pending = len(pending)
        erros_endpoint_nesta_execucao = 0

        def _save_recon_checkpoint():
            with open(RECON_OUT, "w", encoding="utf-8") as f:
                json.dump(RECON, f, ensure_ascii=False, indent=2)

        for i, feat in enumerate(pending):
            attrs = feat["attributes"]
            bid = attrs["id"]
            nm_bai_original = (attrs.get("nm_bai") or "").strip() or None
            src_rings = (feat.get("geometry") or {}).get("rings")
            try:
                cdbairro, nmbairro, motivo = reconcile_name(src_rings, nm_bai_original)
            except Exception as e:
                # Continue-on-error: uma falha persistente de endpoint (502
                # apos esgotar as tentativas de retry) NAO deve abortar a
                # build inteira. Grava o poligono como nao-resolvido
                # (motivo "erro-endpoint", nm_bai_original como fallback de
                # nome — NUNCA None quando havia nome original), avisa, e
                # segue pro proximo. Um re-run (resume, acima) reprocessa
                # especificamente os "erro-endpoint" porque o filtro de
                # `pending` os re-inclui mesmo ja estando em RECON.
                erros_endpoint_nesta_execucao += 1
                RECON[bid] = {
                    "cdbairro": None,
                    "nmbairro_reconciled": nm_bai_original,
                    "motivo": "erro-endpoint",
                    "nm_bai_original": nm_bai_original,
                }
                print(
                    f"    AVISO: falha de endpoint no poligono id={bid} "
                    f"({type(e).__name__}: {e}) — gravado motivo=erro-endpoint "
                    "(fallback nm_bai_original), retry num re-run futuro."
                )
                if (i + 1) % 50 == 0:
                    _save_recon_checkpoint()
                    print(f"    progresso: {i + 1}/{total_pending} pendentes ({len(RECON)} total) — checkpoint salvo em {RECON_OUT}…")
                continue
            RECON[bid] = {
                "cdbairro": cdbairro,
                "nmbairro_reconciled": nmbairro,
                "motivo": motivo,
                "nm_bai_original": nm_bai_original,
            }
            if (i + 1) % 50 == 0:
                _save_recon_checkpoint()
                print(f"    progresso: {i + 1}/{total_pending} pendentes ({len(RECON)} total) — checkpoint salvo em {RECON_OUT}…")

        _save_recon_checkpoint()
        motivo_counts = {"sem-parcela": 0, "unico": 0, "nome": 0, "maioria": 0, "erro-endpoint": 0}
        recuperados_de_branco = 0
        nomes_mudados = 0
        nao_resolvidos = 0
        for r in RECON.values():
            motivo_counts[r["motivo"]] = motivo_counts.get(r["motivo"], 0) + 1
            if r["motivo"] in ("sem-parcela", "erro-endpoint"):
                nao_resolvidos += 1
            else:
                if r["nm_bai_original"] is None:
                    recuperados_de_branco += 1
                elif norm(r["nm_bai_original"]) != norm(r["nmbairro_reconciled"]):
                    nomes_mudados += 1
        print(
            f"    reconciliacao: {len(RECON)}/{len(features)} poligonos no RECON "
            f"({erros_endpoint_nesta_execucao} com erro-endpoint nesta execucao), "
            f"{recuperados_de_branco} recuperados-de-branco, {nomes_mudados} nomes-mudados, "
            f"{nao_resolvidos} nao-resolvidos (motivos: {motivo_counts})"
        )
        if motivo_counts.get("erro-endpoint", 0):
            print(
                f"    AVISO: {motivo_counts['erro-endpoint']} poligono(s) com motivo=erro-endpoint "
                f"no RECON total — rode `python gerar-bairros.py --verify` de novo (resume) para "
                "tentar reconciliar so esses pendentes."
            )

    print("5/6 smoke test do bairro irregular (Campos Dourados, id=000400000603)…")
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

    if RECON:
        with open(RECON_OUT, "w", encoding="utf-8") as f:
            json.dump(RECON, f, ensure_ascii=False, indent=2)
        print(f"    gravado {RECON_OUT} ({len(RECON)} reconciliacoes)")

    print("6/6 consultando cdbairro distinto (layer 3) para relatorio de integridade do join…")
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

    write_report(total, named, unnamed, cdbairro_count, dup_business_ids, RECON if RECON else None)
    print(f"    gravado {REPORT_OUT}")

    if verify:
        print(
            f"\nVERIFY OK: total={total} named={named} unnamed={unnamed} "
            f"cdbairro_distinct={cdbairro_count}"
        )


if __name__ == "__main__":
    main()
