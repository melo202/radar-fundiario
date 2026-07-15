# -*- coding: utf-8 -*-
"""Gera a tabela `pois` (PostGIS) a partir do extrato OSM da Geofabrik — MVP da
Inteligência de Localização (INTELIGENCIA-LOCALIZACAO.md §C, Cenário A, custo zero).

Pipeline local (nada de Overpass público — decisão pós-prova de 15/07/2026):
  1. baixa centro-oeste.osm.pbf da Geofabrik (cache: reusa se tiver <7 dias);
  2. osmium extract  -> recorte da região de Goiânia + Aparecida (bbox);
  3. osmium tags-filter -> só as tags que viram categoria interna;
  4. osmium export (geojsonseq) -> features com geometria resolvida;
  5. insere no PostGIS (ponto = centroide via ST_Centroid) com data do extrato.

Licença: ODbL — exibir "© OpenStreetMap contributors" onde o dado aparecer.
Uso: DATABASE_URL=... python3 gerar-pois.py   (systemd: radar-pois.timer mensal)
"""
import datetime
import json
import os
import subprocess
import sys
import urllib.request

PBF_URL = "https://download.geofabrik.de/south-america/brazil/centro-oeste-latest.osm.pbf"
CACHE = "/opt/radar/data/centro-oeste.osm.pbf"
BBOX = "-49.60,-16.95,-48.90,-16.35"  # Goiânia + Aparecida (mesma janela do limite municipal)
FILTROS = [
    "nwr/shop=supermarket,bakery,mall",
    "nwr/amenity=pharmacy,school,kindergarten,university,college,hospital,clinic,doctors,"
    "restaurant,fast_food,bank,fuel,bar,nightclub,pub,grave_yard",
    "nwr/leisure=park,fitness_centre",
    "nwr/highway=bus_stop",
    "nwr/landuse=industrial,cemetery",
    "nwr/place=square",
]

# ESPELHO EXATO de motor/categorias.js (categoriaDeTags) — manter em sincronia.
def categoria_de_tags(t):
    if t.get("shop") == "supermarket": return "supermarket"
    if t.get("shop") == "bakery": return "bakery"
    if t.get("shop") == "mall": return "shopping_center"
    if t.get("amenity") == "pharmacy": return "pharmacy"
    if t.get("amenity") == "school": return "school"
    if t.get("amenity") == "kindergarten": return "daycare"
    if t.get("amenity") in ("university", "college"): return "university"
    if t.get("amenity") == "hospital": return "hospital"
    if t.get("amenity") in ("clinic", "doctors"): return "clinic"
    if t.get("leisure") == "fitness_centre": return "gym"
    if t.get("leisure") == "park": return "park"
    if t.get("place") == "square": return "square"
    if t.get("amenity") in ("restaurant", "fast_food"): return "restaurant"
    if t.get("amenity") == "bank": return "bank"
    if t.get("amenity") == "fuel": return "fuel_station"
    if t.get("highway") == "bus_stop": return "bus_stop"
    if t.get("amenity") in ("bar", "nightclub", "pub"): return "nightlife"
    if t.get("landuse") == "industrial": return "industrial_area"
    if t.get("landuse") == "cemetery" or t.get("amenity") == "grave_yard": return "cemetery"
    return None


def sh(cmd):
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def main():
    os.makedirs("/opt/radar/data", exist_ok=True)
    idade_ok = os.path.exists(CACHE) and \
        (datetime.date.today() - datetime.date.fromtimestamp(os.path.getmtime(CACHE))).days < 7
    if not idade_ok:
        print(f"Baixando {PBF_URL} ...", flush=True)
        urllib.request.urlretrieve(PBF_URL, CACHE + ".tmp")
        os.replace(CACHE + ".tmp", CACHE)
    extrato = datetime.date.fromtimestamp(os.path.getmtime(CACHE)).isoformat()

    sh(["osmium", "extract", "-O", "-b", BBOX, CACHE, "-o", "/tmp/gyn.pbf"])
    sh(["osmium", "tags-filter", "-O", "/tmp/gyn.pbf", *FILTROS, "-o", "/tmp/gyn-pois.pbf"])
    sh(["osmium", "export", "-O", "/tmp/gyn-pois.pbf", "-f", "geojsonseq", "-o", "/tmp/gyn-pois.geojsonl"])

    import psycopg2  # python3-psycopg2 (apt)
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("DELETE FROM pois WHERE fonte='openstreetmap'")  # recarga total por extrato
    n = 0
    with open("/tmp/gyn-pois.geojsonl", encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip().lstrip("\x1e")
            if not linha:
                continue
            feat = json.loads(linha)
            cat = categoria_de_tags(feat.get("properties") or {})
            if not cat:
                continue
            props = feat.get("properties") or {}
            cur.execute(
                "INSERT INTO pois (categoria, nome, geom, tags, fonte, extraido_em) "
                "VALUES (%s, %s, ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326)), %s, 'openstreetmap', %s)",
                (cat, props.get("name"), json.dumps(feat["geometry"]),
                 json.dumps({k: v for k, v in props.items() if k in ("name", "shop", "amenity", "leisure", "landuse", "highway", "place")}),
                 extrato))
            n += 1
    conn.commit()
    cur.execute("SELECT categoria, count(*) FROM pois GROUP BY 1 ORDER BY 2 DESC")
    for cat, c in cur.fetchall():
        print(f"  {cat}: {c}")
    print(f"OK: {n} POIs (extrato Geofabrik de {extrato})")
    conn.close()


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(f"FALHA em ferramenta externa: {e}", file=sys.stderr)
        sys.exit(1)
