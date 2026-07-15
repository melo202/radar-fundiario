-- 002-pois: pontos de interesse do entorno (Inteligência de Localização, MVP Cenário A).
-- Fonte: extrato OSM da Geofabrik processado LOCALMENTE (gerar-pois.py) — decisão tomada
-- após a prova de cobertura de 15/07/2026 (Overpass público: congestão + zero falso).
CREATE TABLE IF NOT EXISTS pois (
  id           bigserial PRIMARY KEY,
  categoria    text NOT NULL,
  nome         text,
  geom         geometry(Point, 4326) NOT NULL,
  tags         jsonb,
  fonte        text NOT NULL DEFAULT 'openstreetmap',
  extraido_em  date NOT NULL
);
CREATE INDEX IF NOT EXISTS pois_geom_idx ON pois USING gist (geom);
CREATE INDEX IF NOT EXISTS pois_categoria_idx ON pois (categoria);
