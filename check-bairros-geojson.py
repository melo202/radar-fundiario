# -*- coding: utf-8 -*-
"""
Checagem de fumaca (smoke check), standalone e sem dependencia externa,
sobre o artefato final bairros-goiania.json.

Uso:
  python check-bairros-geojson.py <path>
  python check-bairros-geojson.py --check-irregular <path>
  python check-bairros-geojson.py --assert-geometry-identical <baseline_path> <path>

Sem framework de teste (nao ha um no repo) — este script E a checagem,
seguindo o mesmo precedente de atualizar-caixa.py (abortar alto em vez de
aceitar um artefato ruim).

O modo --assert-geometry-identical prova que o fix de nomes (Fase 07-01,
reconciliacao via spatial join contra a layer 3) e display-data-only: o
drill (fitBounds/getBounds) NAO usa o nome (DATA-NAMES.md 1.5) — este
assert prova que nada alem de `properties.nm_bai` mudou entre o baseline
(git HEAD anterior) e o novo json. Fluxo de uso: capturar o baseline do
git ANTES do commit dos novos nomes:
  git show HEAD:bairros-goiania.json > baseline.json
  python check-bairros-geojson.py --assert-geometry-identical baseline.json bairros-goiania.json
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
        if not coords:
            raise ValueError(f"feature #{i} sem coordinates: {coords!r}")
        for r, ring in enumerate(coords):
            if len(ring) < 3:
                raise ValueError(
                    f"feature #{i} anel #{r} tem menos de 3 pontos ({len(ring)}) — "
                    f"possivel degenerescencia de simplificacao: {ring!r}"
                )

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


def assert_geometry_identical(new_data, baseline_path):
    """Prova que `new_data` (o bairros-goiania.json novo, JA validado por
    `validate_output`) so mudou `properties.nm_bai` em relacao ao baseline
    (o bairros-goiania.json ANTERIOR, capturado via
    `git show HEAD:bairros-goiania.json > baseline.json` antes do commit
    dos novos nomes). Aborta (sys.exit) em QUALQUER divergencia de
    geometria/contagem/id — a unica mudanca permitida e o nome.
    Retorna a contagem de nomes que mudaram (informativo, nao falha)."""
    with open(baseline_path, encoding="utf-8") as f:
        baseline = json.load(f)

    base_feats = baseline.get("features") or []
    new_feats = new_data.get("features") or []

    if len(base_feats) != len(new_feats):
        sys.exit(
            f"ERRO assert-geometry-identical: contagem de features divergiu — "
            f"baseline={len(base_feats)}, novo={len(new_feats)}. Geometria/contagem "
            "devem ser byte-identicas; abortado."
        )

    base_by_id = {f["properties"]["id"]: f for f in base_feats}
    new_by_id = {f["properties"]["id"]: f for f in new_feats}

    base_ids = set(base_by_id)
    new_ids = set(new_by_id)
    if base_ids != new_ids:
        only_base = sorted(base_ids - new_ids)
        only_new = sorted(new_ids - base_ids)
        sys.exit(
            "ERRO assert-geometry-identical: conjunto de `properties.id` divergiu — "
            f"so no baseline: {only_base[:10]}{'…' if len(only_base) > 10 else ''}; "
            f"so no novo: {only_new[:10]}{'…' if len(only_new) > 10 else ''}. Abortado."
        )

    names_changed = 0
    for bid in sorted(base_ids):
        base_feat = base_by_id[bid]
        new_feat = new_by_id[bid]

        base_geom_json = json.dumps(base_feat.get("geometry"), sort_keys=True)
        new_geom_json = json.dumps(new_feat.get("geometry"), sort_keys=True)
        if base_geom_json != new_geom_json:
            sys.exit(
                f"ERRO assert-geometry-identical: geometria DIVERGIU no id={bid!r} — "
                "o fix de nomes deveria ser display-data-only (geometria byte-identica). "
                "Abortado sem aplicar/commitar."
            )

        base_name = base_feat["properties"].get("nm_bai")
        new_name = new_feat["properties"].get("nm_bai")
        if base_name != new_name:
            names_changed += 1

    print(
        f"ASSERT OK: geometria byte-identica, {names_changed} nome(s) mudaram "
        f"({len(new_feats)} features, ids identicos, geometria estruturalmente "
        "identica por id — so properties.nm_bai foi tocado)"
    )
    return names_changed


def main():
    assert_flag = "--assert-geometry-identical" in sys.argv
    check_irregular_flag = "--check-irregular" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if assert_flag:
        if len(args) < 2:
            sys.exit(
                "uso: python check-bairros-geojson.py --assert-geometry-identical "
                "<baseline_path> <path>"
            )
        baseline_path, path = args[0], args[1]
        data = validate_output(path)
        assert_geometry_identical(data, baseline_path)
        return

    if not args:
        sys.exit("uso: python check-bairros-geojson.py [--check-irregular] <path>")
    path = args[0]

    data = validate_output(path)
    if check_irregular_flag:
        check_irregular(data)


if __name__ == "__main__":
    main()
