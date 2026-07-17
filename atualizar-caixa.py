# -*- coding: utf-8 -*-
"""
Gera caixa-goiania.js a partir da lista publica de imoveis a venda da CAIXA.

Uso:  python atualizar-caixa.py
Rode quando quiser atualizar (a lista muda diariamente). O app carrega o
resultado via <script src="caixa-goiania.js"> — funciona ate em file://.

Etapas:
 1. Baixa Lista_imoveis_GO.csv da Caixa e filtra cidade GOIANIA.
 2. Casa o bairro da Caixa com o cdbairro do cadastro (lista distinta do ArcGIS).
 3. Extrai QD/LT do endereco e busca a coordenada do lote no cadastro.
 4. Para casas/terrenos casados, calcula fator laudo-Caixa / valor venal
    (mediana por setor, n>=3) — calibracao real do coeficiente do app.
"""
import csv, io, json, os, re, time, statistics, unicodedata
import urllib.request, urllib.parse
from datetime import date

SVC = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3/query"
CSV_URL = "https://venda-imoveis.caixa.gov.br/listaweb/Lista_imoveis_GO.csv"
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
            # 429/503: respeita o Retry-After se vier; 4xx que não seja 429 não adianta repetir
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

def arcgis(params):
    p = dict(params); p["f"] = "json"
    d = json.loads(http(SVC, p).decode("utf-8"))
    if "error" in d:
        raise RuntimeError(d["error"])
    return d

def norm(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s.upper()).strip()

# prefixos do cadastro (mesmos do app) e da Caixa, para casar pelo "miolo" do nome
PFX_CAD = {"RES": "", "JD": "", "VI": "", "VL": "", "VILA": "", "VLG": "", "SET": "", "ST": "",
           "LOT": "", "PRQ": "", "PQ": "", "BRO": "", "CH": "", "FAZ": "", "CONJ": "", "COD": "",
           "SIT": "", "GRJ": "", "REC": "", "ZON": "", "AREA": "", "ESP": ""}
PFX_CX = ["CONDOMINIO RESIDENCIAL", "RESIDENCIAL", "CONDOMINIO", "SETOR", "JARDIM", "PARQUE",
          "VILA", "BAIRRO", "LOTEAMENTO", "CHACARAS", "CHACARA", "FAZENDA", "RECANTO",
          "CONJUNTO", "LOTEAMENTO", "SITIOS", "SITIO"]

def core_cad(raw):
    p = norm(raw).split(" ")
    if len(p) > 1 and p[0] in PFX_CAD:
        p = p[1:]
    return " ".join(p)

def core_cx(raw):
    s = norm(raw)
    for pf in PFX_CX:
        if s.startswith(pf + " "):
            s = s[len(pf) + 1:]
            break
    return s

def parse_brl(s):
    s = (s or "").strip().replace(".", "").replace(",", ".")
    try:
        return round(float(s), 2)
    except ValueError:
        return None

def main():
    print("1/4 baixando lista da Caixa…")
    raw = http(CSV_URL).decode("latin-1", "replace")
    rows = list(csv.reader(io.StringIO(raw), delimiter=";"))
    head_i = next(i for i, r in enumerate(rows) if r and "im" in r[0].lower() and "vel" in r[0].lower())
    imoveis = []
    for r in rows[head_i + 1:]:
        if len(r) < 12 or norm(r[2]) != "GOIANIA":
            continue
        # area privativa/total da descricao (r[9]) — alimenta o "desconto vs indice" no VPS
        desc = r[9]
        mar = re.search(r"([\d.,]+)\s*(?:m2|m²)?\s*de\s+área\s+privativa", desc, re.I) \
            or re.search(r"([\d.,]+)\s*(?:m2|m²)?\s*de\s+área\s+(?:total|do\s+terreno|constru[ií]da)", desc, re.I)
        area = None
        if mar:
            try:
                # na descricao o ponto e DECIMAL ("84.32"); so e milhar quando ha ponto E virgula
                t = mar.group(1)
                t = t.replace(".", "").replace(",", ".") if ("." in t and "," in t) else t.replace(",", ".")
                v = float(t)
                area = round(v, 2) if 8 <= v <= 100000 else None
            except ValueError:
                pass
        imoveis.append({
            "id": r[0].strip(), "b": r[3].strip(), "e": re.sub(r"\s+", " ", r[4]).strip(),
            "p": parse_brl(r[5]), "a": parse_brl(r[6]),
            # desconto vem com PONTO decimal ("48.31"), diferente dos precos ("496.312,00")
            "d": (lambda s: round(float(s), 2) if re.fullmatch(r"[0-9]+(\.[0-9]+)?", s) else None)(r[7].strip()),
            "fin": r[8].strip().lower().startswith("sim"),
            "ar": area,
            "t": r[9].split(",")[0].strip(),
            "m": r[10].strip(),
            # só aceita link https da Caixa (evita esquema perigoso vindo de CSV adulterado)
            "u": (lambda u: u if u.startswith("https://venda-imoveis.caixa.gov.br") else "")(r[11].strip()),
        })
    print("   imoveis em Goiania:", len(imoveis))

    print("2/4 baixando bairros do cadastro…")
    d = arcgis({"where": "cdbairro>0", "outFields": "cdbairro,nmbairro",
                "returnDistinctValues": "true", "returnGeometry": "false",
                "orderByFields": "nmbairro", "resultRecordCount": 2000})
    cores, fulls = {}, {}
    for f in d.get("features", []):
        a = f["attributes"]
        code, nm = a["cdbairro"], (a["nmbairro"] or "").strip()
        if code and nm:
            fulls.setdefault(norm(nm), code)
            cores.setdefault(core_cad(nm), code)

    print("3/4 cruzando QD/LT e geocodificando no cadastro…")
    ok = 0
    fat = {}
    falhas = 0  # falhas consecutivas — se o servidor cair, aborta sem gravar arquivo furado
    for im in imoveis:
        cx_full, cx_core = norm(im["b"]), core_cx(im["b"])
        code = fulls.get(cx_full) or cores.get(cx_core)
        if not code:  # tenta conter/estar contido
            for c, cd in cores.items():
                if c and (c in cx_core or cx_core in c):
                    code = cd
                    break
        if not code:
            continue
        im["cb"] = code
        endN = norm(im["e"])
        mq = re.search(r"\bQ(?:D|UADRA)?\.?\s*([A-Z]{0,2}-?[0-9]+[A-Z]?)", endN)
        ml = re.search(r"\bL(?:T|OTE)?\.?\s*([0-9]+[A-Z]?)", endN)
        base = "cdbairro=%d AND vlvenal>0" % code
        lote = " AND UPPER(nrlote) LIKE '%%%s%%'" % re.sub(r"\D", "", ml.group(1)) if ml else ""
        # candidatos em ordem de precisao: quadra+lote > rua numerada > nome da rua
        cands = []
        if mq:
            cands.append(("q", base + " AND UPPER(nrquadra) LIKE '%%%s%%'"
                          % re.sub(r"\D", "", mq.group(1)) + lote))
        rua = endN.split(",")[0]
        rua = re.sub(r"^(RUA|AVENIDA|AV|ALAMEDA|AL|TRAVESSA|TV|PRACA|PC|ESTRADA|ROD|RODOVIA)\.?\s+", "", rua).strip()
        ruaD = re.sub(r"\D", "", rua)
        if ruaD:
            cands.append(("r", base + " AND nmlogradou LIKE '%%%s%%'" % ruaD + lote))
        elif len(rua) >= 4:
            cands.append(("r", base + " AND UPPER(nmlogradou) LIKE '%%%s%%'"
                          % rua.replace("'", "") + lote))
        for prec, where in cands:
            try:
                r = arcgis({"where": where, "outFields": "*", "returnGeometry": "false",
                            "resultRecordCount": 1, "orderByFields": "OBJECTID"})
                fs = r.get("features", [])
                falhas = 0
            except Exception as e:
                print("   aviso:", im["id"], e)
                fs = []
                falhas += 1
                if falhas >= 15:
                    raise SystemExit("Servidor da prefeitura instável (15 falhas seguidas) — abortado sem gravar. Tente mais tarde.")
            time.sleep(0.25)
            if fs:
                at = fs[0]["attributes"]
                if at.get("x_coord") and at.get("y_coord"):
                    im["x"] = round(at["x_coord"], 2)
                    im["y"] = round(at["y_coord"], 2)
                    ok += 1
                    # quadra E lote EXATOS confirmam o pino; LIKE parcial vira "r" (app avisa "aproximado")
                    def _dig(v):
                        return re.sub(r"\D", "", str(v or ""))
                    exato = (mq and ml and _dig(mq.group(1)) and _dig(ml.group(1))
                             and _dig(mq.group(1)).lstrip("0") == _dig(at.get("nrquadra")).lstrip("0")
                             and _dig(ml.group(1)).lstrip("0") == _dig(at.get("nrlote")).lstrip("0"))
                    im["pr"] = "q" if (prec == "q" and exato) else "r"
                    # fator laudo/venal: so casa/terreno em lote de unidade unica e casamento exato
                    if (prec == "q" and exato and im["t"].upper().startswith(("CASA", "TERRENO"))
                            and im.get("a") and (at.get("ttsublot") or 0) <= 1 and at.get("vlvenal")):
                        fat.setdefault(code, []).append(im["a"] / at["vlvenal"])
                break
    print("   geocodificados: %d de %d" % (ok, len(imoveis)))

    fatores = {str(c): {"n": len(v), "fator": round(statistics.median(v), 2)}
               for c, v in fat.items() if len(v) >= 3}
    print("4/4 fatores laudo/venal por setor (n>=3):", fatores or "nenhum ainda")

    out = {"gerado": date.today().isoformat(),
           "fonte": "Lista publica de imoveis a venda da CAIXA (venda-imoveis.caixa.gov.br)",
           "imoveis": imoveis, "fatores": fatores}
    with io.open("caixa-goiania.js", "w", encoding="utf-8") as f:
        f.write("window.CAIXA=")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";")
    print("caixa-goiania.js gravado (%d imoveis, %d plotaveis)." % (len(imoveis), ok))

    # RUNNER RESIDENCIAL (projeto Oportunidades, 17/07): o VPS recebe 403 do Radware ao
    # baixar o CSV da Caixa; esta maquina baixa e ENVIA o JSON ja geocodificado. O VPS faz
    # o diff/eventos/desconto. Ativa quando RADAR_INGEST_URL e MOTOR_TOKEN estao no ambiente.
    ingest_url = os.environ.get("RADAR_INGEST_URL")
    token = os.environ.get("MOTOR_TOKEN")
    if ingest_url and token:
        print("5/5 enviando ao VPS…")
        body = json.dumps(out, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(ingest_url, data=body, method="POST", headers={
            "Content-Type": "application/json", "Authorization": "Bearer " + token,
            "User-Agent": UA["User-Agent"]})
        try:
            r = urllib.request.urlopen(req, timeout=60)
            print("   VPS respondeu:", r.status, r.read(400).decode("utf-8", "replace"))
        except Exception as e:
            print("   FALHA no envio ao VPS:", e)
            raise SystemExit(1)
    else:
        print("(envio ao VPS desligado — defina RADAR_INGEST_URL e MOTOR_TOKEN para ativar o runner)")

if __name__ == "__main__":
    main()
