-- 023 — correções da 1ª carga do espelho (20/08/2026, erros reais do journal):
-- 1) bairro/lote/cadastro têm MULTIPOLÍGONOS de verdade no ArcGIS → coluna vira MultiPolygon;
-- 2) número predial é POLÍGONO no serviço (não ponto) → coluna vira Geometry genérica;
-- 3) cadastro: OBJECTID tem duplicados → o rowid único é ESRI_OID (tratado no código).
ALTER TABLE espelho_bairro   ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(geom);
ALTER TABLE espelho_lote     ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(geom);
ALTER TABLE espelho_cadastro ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(geom);
ALTER TABLE espelho_num_predial ALTER COLUMN geom TYPE geometry(Geometry, 4326) USING geom;
