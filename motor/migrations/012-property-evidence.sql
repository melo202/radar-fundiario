-- P1-B: liga a carteira privada ao último relatório público de mercado.
-- A avaliação continua versionada e imutável; o imóvel guarda apenas o ponteiro mais recente.
ALTER TABLE inventory_properties
  ADD COLUMN IF NOT EXISTS latest_valuation_id uuid REFERENCES valuations(id);

CREATE INDEX IF NOT EXISTS inventory_properties_latest_valuation_idx
  ON inventory_properties (latest_valuation_id)
  WHERE latest_valuation_id IS NOT NULL;

INSERT INTO audit_log (entity, entity_id, action, detail, actor)
SELECT 'schema', '012-property-evidence', 'migration',
       '{"regra":"avaliacao versionada; carteira aponta para a versao mais recente"}'::jsonb,
       'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE entity='schema' AND entity_id='012-property-evidence' AND action='migration'
);
