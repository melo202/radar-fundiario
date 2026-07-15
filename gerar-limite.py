# -*- coding: utf-8 -*-
"""Gera limite-goiania.json — polígono do limite municipal de Goiânia (fonte oficial IBGE).

Fonte: API de malhas do IBGE v3, município 5208707 (Goiânia), qualidade "maxima"
(518 pontos, ~11 KB — fidelidade máxima por custo desprezível; medido em 2026-07-15).
Uso:  python gerar-limite.py
Saída: limite-goiania.json (FeatureCollection com 1 Feature Polygon, WGS84).

Regra do repo (tests/datasets.test.mjs): se a geometria mudar LEGITIMAMENTE numa
regeneração (novo censo/malha do IBGE), atualize os asserts junto com o dado.
"""
import gzip
import json
import sys
import urllib.request

URL = ("https://servicodados.ibge.gov.br/api/v3/malhas/municipios/5208707"
       "?formato=application/vnd.geo+json&qualidade=maxima")
SAIDA = "limite-goiania.json"

# bbox de sanidade (WGS84) — Goiânia, medido na malha 2022 do IBGE em 2026-07-15.
# Regeneração fora dessa janela = município errado ou projeção errada: aborta.
BBOX = {"minLon": -49.60, "maxLon": -48.95, "minLat": -16.95, "maxLat": -16.35}


def valida(gj):
    assert gj.get("type") == "FeatureCollection", "esperado FeatureCollection"
    feats = gj.get("features") or []
    assert len(feats) == 1, f"esperado exatamente 1 feature, veio {len(feats)}"
    geom = feats[0].get("geometry") or {}
    assert geom.get("type") in ("Polygon", "MultiPolygon"), f"tipo inesperado: {geom.get('type')}"
    pontos = 0

    def anda(c):
        nonlocal pontos
        if isinstance(c[0], (int, float)):
            lon, lat = c[0], c[1]
            assert BBOX["minLon"] < lon < BBOX["maxLon"] and BBOX["minLat"] < lat < BBOX["maxLat"], \
                f"coordenada fora da janela de Goiânia: {lon},{lat}"
            pontos += 1
        else:
            for filho in c:
                anda(filho)

    anda(geom["coordinates"])
    assert pontos >= 100, f"malha suspeita de degradada: só {pontos} pontos"
    return pontos


def main():
    print(f"Baixando {URL} ...")
    with urllib.request.urlopen(URL, timeout=60) as resp:
        bruto = resp.read()
    # o IBGE devolve gzip mesmo sem Accept-Encoding (medido 2026-07-15) — magic 1f 8b
    if bruto[:2] == b"\x1f\x8b":
        bruto = gzip.decompress(bruto)
    gj = json.loads(bruto.decode("utf-8"))
    pontos = valida(gj)
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(gj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK: {SAIDA} — 1 feature, {pontos} pontos, fonte IBGE 5208707 (qualidade maxima).")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"FALHA DE VALIDAÇÃO: {e}", file=sys.stderr)
        sys.exit(1)
