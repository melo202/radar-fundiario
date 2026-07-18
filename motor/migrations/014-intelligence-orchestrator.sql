-- 014-intelligence-orchestrator: fila assíncrona de investigações do K3/Hermes.
-- O agente produz planos, evidências e hipóteses. Nada desta camada altera diretamente
-- listings, properties, valuations ou a carteira privada: promoção exige validação posterior.

CREATE TABLE IF NOT EXISTS intelligence_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('market_scan','source_discovery','opportunity_investigation','custom_research')),
  objective         text NOT NULL,
  scope             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','cancelled')),
  priority          smallint NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  attempts          smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts      smallint NOT NULL DEFAULT 2 CHECK (max_attempts BETWEEN 1 AND 5),
  idempotency_key   text NOT NULL,
  plan              jsonb,
  result_summary    jsonb,
  error             text,
  not_before        timestamptz NOT NULL DEFAULT now(),
  locked_at         timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS intelligence_jobs_pending_idx
  ON intelligence_jobs (priority DESC, not_before, created_at)
  WHERE status='pending';
CREATE INDEX IF NOT EXISTS intelligence_jobs_org_time_idx
  ON intelligence_jobs (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_evidence (
  id                bigserial PRIMARY KEY,
  job_id            uuid NOT NULL REFERENCES intelligence_jobs(id) ON DELETE CASCADE,
  source_url        text NOT NULL,
  source_domain     text NOT NULL,
  source_kind       text NOT NULL CHECK (source_kind IN ('search','acervo','price_change')),
  title             text,
  excerpt           text,
  content_hash      text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  collected_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, source_url, content_hash)
);
CREATE INDEX IF NOT EXISTS intelligence_evidence_job_idx
  ON intelligence_evidence (job_id, id);

CREATE TABLE IF NOT EXISTS intelligence_findings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid NOT NULL REFERENCES intelligence_jobs(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('possible_duplicate','price_change','urgent_sale_signal','market_anomaly','data_conflict','source_gap','other')),
  title             text NOT NULL,
  summary           text NOT NULL,
  candidate_data    jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence        numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence_ids      bigint[] NOT NULL CHECK (cardinality(evidence_ids) > 0),
  fingerprint       text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  status            text NOT NULL DEFAULT 'candidate'
                    CHECK (status IN ('candidate','reviewed','promoted','rejected')),
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS intelligence_findings_review_idx
  ON intelligence_findings (organization_id, status, confidence DESC, created_at DESC);

INSERT INTO audit_log (entity, entity_id, action, detail, actor)
SELECT 'schema', '014-intelligence-orchestrator', 'migration',
       '{"regra":"K3/Hermes cria somente hipoteses rastreaveis; base confiavel nao recebe escrita autonoma"}'::jsonb,
       'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE entity='schema' AND entity_id='014-intelligence-orchestrator' AND action='migration'
);
