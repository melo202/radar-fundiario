# -*- coding: utf-8 -*-
"""Carrega a tabela `enderecos` (PostGIS) a partir do CNEFE 2022 do IBGE — geocoding
local do plano de localização (§7). Fonte ESTÁTICA (Censo 2022): roda uma vez, sem timer.

Pipeline:
  1. baixa 5208707_GOIÂNIA.zip do FTP do IBGE (se o CSV ainda não estiver em /opt/radar/data);
  2. agrega os 777 mil endereços por (localidade, logradouro normalizado, número) —
     centroide simples, melhor nível de coordenada do grupo;
  3. recarga total da tabela (DELETE + INSERT em lote).

Uso: DATABASE_URL=... python3 gerar-enderecos.py
"""
import csv
import glob
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile

URL = ("https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/"
       "Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/52_GO/5208707_GOI%c3%82NIA.zip")
DATA = "/opt/radar/data"

# ESPELHO EXATO de motor/normaliza-endereco.js — manter em sincronia.
TIPOS = {"rua", "r", "avenida", "av", "alameda", "al", "travessa", "tv",
         "praca", "pc", "rodovia", "rod", "estrada", "est", "viela", "beco", "via"}
UNIDADES = {"um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "quatro": 4, "cinco": 5,
            "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10, "onze": 11, "doze": 12,
            "treze": 13, "quatorze": 14, "catorze": 14, "quinze": 15, "dezesseis": 16,
            "dezessete": 17, "dezoito": 18, "dezenove": 19}
DEZENAS = {"vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50, "sessenta": 60,
           "setenta": 70, "oitenta": 80, "noventa": 90}


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def extenso_para_numero(tokens):
    total, algum = 0, False
    for t in tokens:
        if t == "e":
            continue
        if t in ("cem", "cento"):
            total += 100; algum = True
        elif t in DEZENAS:
            total += DEZENAS[t]; algum = True
        elif t in UNIDADES:
            total += UNIDADES[t]; algum = True
        else:
            return None
    return total if algum else None


def normaliza_logradouro(nome):
    s = re.sub(r"[-.,/ºª°]", " ", sem_acento(nome or "").lower())
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return ""
    tokens = s.split(" ")
    if len(tokens) > 1 and tokens[0] in TIPOS:
        tokens = tokens[1:]
    n = extenso_para_numero(tokens)
    if n is not None:
        return str(n)
    junto = " ".join(tokens)
    m = re.fullmatch(r"([a-z]{1,3}) ?0*(\d+)", junto)
    if m and m.group(1) not in TIPOS:
        return f"{m.group(1)} {m.group(2)}"
    if junto.isdigit():
        return str(int(junto))
    return junto


def acha_csv():
    achados = glob.glob(f"{DATA}/5208707*.csv")
    if achados:
        return achados[0]
    os.makedirs(DATA, exist_ok=True)
    destino = f"{DATA}/cnefe-goiania.zip"
    if not os.path.exists(destino):
        print(f"Baixando {URL} ...", flush=True)
        urllib.request.urlretrieve(URL, destino + ".tmp")
        os.replace(destino + ".tmp", destino)
    with zipfile.ZipFile(destino) as z:
        z.extractall(DATA)
    return glob.glob(f"{DATA}/5208707*.csv")[0]


def main():
    caminho = acha_csv()
    print(f"CSV: {caminho}", flush=True)
    grupos = {}  # (localidade, logradouro, numero) -> [slat, slon, n, nivel, cep, tipo, titulo]
    lidos = 0
    try:
        f = open(caminho, encoding="utf-8", errors="strict", newline="")
        f.read(1 << 20); f.seek(0)  # valida encoding no primeiro MB
    except UnicodeDecodeError:
        f = open(caminho, encoding="latin-1", newline="")
    with f:
        leitor = csv.reader(f, delimiter=";")
        cab = next(leitor)
        i = {nome: pos for pos, nome in enumerate(cab)}
        col = (i["DSC_LOCALIDADE"], i["NOM_TIPO_SEGLOGR"], i["NOM_TITULO_SEGLOGR"],
               i["NOM_SEGLOGR"], i["NUM_ENDERECO"], i["CEP"],
               i["LATITUDE"], i["LONGITUDE"], i["NV_GEO_COORD"])
        for linha in leitor:
            lidos += 1
            try:
                numero = int(linha[col[4]])
                lat, lon = float(linha[col[6]]), float(linha[col[7]])
                nivel = int(linha[col[8]])
            except (ValueError, IndexError):
                continue
            if numero <= 0:
                continue  # "SN" não geocodifica número
            logr = normaliza_logradouro(linha[col[3]])
            if not logr:
                continue
            chave = (linha[col[0]].strip(), logr, numero)
            g = grupos.get(chave)
            if g is None:
                grupos[chave] = [lat, lon, 1, nivel, linha[col[5]].strip(),
                                 linha[col[1]].strip().lower(), linha[col[2]].strip().lower()]
            else:
                g[0] += lat; g[1] += lon; g[2] += 1
                if nivel < g[3]:
                    g[3] = nivel

    import psycopg2
    from psycopg2.extras import execute_values
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("DELETE FROM enderecos WHERE fonte='cnefe-2022'")  # recarga total
    linhas = [(logr, g[5] or None, g[6] or None, numero, g[4] or None, loc or None,
               g[2], g[3], g[1] / g[2], g[0] / g[2])
              for (loc, logr, numero), g in grupos.items()]
    execute_values(cur,
        "INSERT INTO enderecos (logradouro, tipo, titulo, numero, cep, localidade, qtd, nivel, geom) VALUES %s",
        linhas,
        template="(%s,%s,%s,%s,%s,%s,%s,%s, ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography)",
        page_size=2000)
    conn.commit()
    cur.execute("SELECT count(*), count(DISTINCT logradouro) FROM enderecos")
    total, ruas = cur.fetchone()
    cur.execute("SELECT localidade, numero, ST_Y(geom::geometry), ST_X(geom::geometry) "
                "FROM enderecos WHERE logradouro='s 3' AND numero=50 LIMIT 3")
    prova = cur.fetchall()
    print(f"OK: {lidos} endereços lidos -> {total} pontos agregados em {ruas} logradouros")
    print(f"prova 'rua s3, 50': {prova}")
    conn.close()


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"FALHA: coluna/variável ausente: {e}", file=sys.stderr)
        sys.exit(1)
