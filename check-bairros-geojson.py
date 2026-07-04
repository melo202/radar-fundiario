# -*- coding: utf-8 -*-
"""
Checagem de fumaca (smoke check), standalone e sem dependencia externa,
sobre o artefato final bairros-goiania.json.

Uso:
  python check-bairros-geojson.py <path>
  python check-bairros-geojson.py --check-irregular <path>

Sem framework de teste (nao ha um no repo) — este script E a checagem,
seguindo o mesmo precedente de atualizar-caixa.py (abortar alto em vez de
aceitar um artefato ruim).
"""
import json, gzip, sys

IRREGULAR_ID = "000400000603"  # Campos Dourados
BBOX_LON = (-49.45, -49.15)
BBOX_LAT = (-16.85, -16.55)
MAX_GZIP_KB = 200


def validate_output(path, max_gzip_kb=MAX_GZIP_KB):
    """Carrega o GeoJSON, valida bem-formacao (FeatureCollection de
    Polygon), calcula tamanho gzip e imprime um resumo. Levanta/propaga
    exceptions em JSON malformado ou estrutura inesperada; nao falha
    (so avisa) se o orcamento de tamanho for excedido."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)  # levanta se JSON malformado

    if data.get("type") != "FeatureCollection":
        raise ValueError(f"esperado type=='FeatureCollection', recebido {data.get('type')!r}")
    features = data.get("features")
    if not features:
        raise ValueError("FeatureCollection sem features (lista vazia ou ausente)")

    for i, feat in enumerate(features):
        geom = feat.get("geometry")
        if not geom or geom.get("type") != "Polygon":
            raise ValueError(
                f"feature #{i} (id={feat.get('properties', {}).get('id')!r}) "
                f"nao e Polygon: geometry={geom!r}"
            )
        coords = geom.get("coordinates")
        if not coords or len(coords[0]) < 3:
            raise ValueError(f"feature #{i} tem anel com menos de 3 pontos: {coords!r}")

    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    kb = len(gzip.compress(raw)) / 1024
    status = "OK" if kb <= max_gzip_kb else "WARNING: exceeds budget"
    print(f"{len(features)} features, {kb:.1f} KB gzipped — {status}")
    return data


def check_irregular(data):
    """Localiza o bairro irregular (Campos Dourados) e confirma que sua
    primeira coordenada reprojetou dentro do bbox de Goiania — pega
    regressao de troca de eixo/zona."""
    feat = next(
        (f for f in data["features"] if f.get("properties", {}).get("id") == IRREGULAR_ID),
        None,
    )
    if feat is None:
        sys.exit(f"ERRO: feature de teste id={IRREGULAR_ID!r} nao encontrada no arquivo")

    lon, lat = feat["geometry"]["coordinates"][0][0]
    if not (BBOX_LON[0] < lon < BBOX_LON[1] and BBOX_LAT[0] < lat < BBOX_LAT[1]):
        sys.exit(
            f"reprojection smoke test FAILED: Campos Dourados caiu em lon={lon}, lat={lat} "
            f"— fora do bbox esperado de Goiania (lon in {BBOX_LON}, lat in {BBOX_LAT}). "
            "Possivel troca de eixo/zona na reprojecao."
        )
    print(f"--check-irregular OK: Campos Dourados em lon={lon:.4f}, lat={lat:.4f} (dentro de Goiania)")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check_irregular_flag = "--check-irregular" in sys.argv
    if not args:
        sys.exit("uso: python check-bairros-geojson.py [--check-irregular] <path>")
    path = args[0]

    data = validate_output(path)
    if check_irregular_flag:
        check_irregular(data)


if __name__ == "__main__":
    main()
