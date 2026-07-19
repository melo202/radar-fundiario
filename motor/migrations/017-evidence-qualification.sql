-- 017-evidence-qualification: preserva tudo, mas só entrega evidência qualificada ao K3.
ALTER TABLE intelligence_evidence
  ADD COLUMN IF NOT EXISTS qualification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS qualification jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS usable_for_analysis boolean NOT NULL DEFAULT false;

ALTER TABLE intelligence_evidence DROP CONSTRAINT IF EXISTS intelligence_evidence_qualification_status_check;
ALTER TABLE intelligence_evidence ADD CONSTRAINT intelligence_evidence_qualification_status_check
  CHECK (qualification_status IN ('pending','qualified','rejected','quarantined'));

CREATE INDEX IF NOT EXISTS intelligence_evidence_usable_idx
  ON intelligence_evidence (job_id,id) WHERE usable_for_analysis IS TRUE;

CREATE TABLE IF NOT EXISTS intelligence_source_registry (
  organization_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_domain          text NOT NULL,
  status                 text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','degraded','blocked')),
  total_observations     integer NOT NULL DEFAULT 0 CHECK (total_observations>=0),
  qualified_observations integer NOT NULL DEFAULT 0 CHECK (qualified_observations>=0),
  rejected_observations  integer NOT NULL DEFAULT 0 CHECK (rejected_observations>=0),
  rejection_reasons      jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at           timestamptz,
  last_qualified_at      timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id,source_domain)
);
CREATE INDEX IF NOT EXISTS intelligence_source_registry_health_idx
  ON intelligence_source_registry (organization_id,status,qualified_observations DESC);

-- Evidências antigas ficam preservadas e pendentes; invalidações já conhecidas nunca retornam ao K3.
UPDATE intelligence_evidence
SET qualification_status='rejected',usable_for_analysis=false,
    qualification=jsonb_build_object('status','rejected','usableForAnalysis',false,
      'reasons',jsonb_build_array('invalidated_identity'),'policyVersion','migration-017')
WHERE qualification_status='pending'
  AND (metadata->>'invalidada'='true' OR metadata->>'invalidated'='true');

INSERT INTO audit_log (entity,entity_id,action,detail,actor)
SELECT 'schema','017-evidence-qualification','migration',
       '{"regra":"evidencia bruta e preservada; apenas material qualificado entra na analise K3"}'::jsonb,
       'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE entity='schema' AND entity_id='017-evidence-qualification' AND action='migration'
);
