-- 015-intelligence-batching: permite retomada segura do trabalho assíncrono em lotes.
ALTER TABLE intelligence_jobs ALTER COLUMN max_attempts SET DEFAULT 3;

UPDATE intelligence_jobs
SET max_attempts=GREATEST(max_attempts,3),
    not_before=now(),
    updated_at=now()
WHERE status='pending'
  AND error ILIKE '%timeout%';

INSERT INTO audit_log (entity, entity_id, action, detail, actor)
SELECT 'schema', '015-intelligence-batching', 'migration',
       '{"regra":"analise K3 em lotes retomaveis; timeout da sintese preserva candidatos fundamentados"}'::jsonb,
       'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE entity='schema' AND entity_id='015-intelligence-batching' AND action='migration'
);
