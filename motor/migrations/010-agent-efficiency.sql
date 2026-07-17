-- 010-agent-efficiency: documentos determinísticos, métricas de contexto e melhorias propostas.
-- Arquivos brutos ficam fora do PostgreSQL; aqui vivem identidade, extração rastreável e segmentos.

ALTER TABLE agent_usage ADD COLUMN IF NOT EXISTS cached_input_tokens integer;
ALTER TABLE agent_usage ADD COLUMN IF NOT EXISTS context_tokens integer;
ALTER TABLE agent_usage ADD COLUMN IF NOT EXISTS request_kind text NOT NULL DEFAULT 'analysis';

CREATE TABLE IF NOT EXISTS agent_documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  object_type        text NOT NULL CHECK (object_type IN ('general','property','contact','valuation','visit','investment')),
  object_id          uuid,
  file_name          text NOT NULL,
  mime_type          text NOT NULL,
  content_sha256     text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  storage_key        text,
  page_count         integer CHECK (page_count IS NULL OR page_count > 0),
  status             text NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received','extracting','extracted','indexed','reviewed','error')),
  extraction_method  text,
  factual_summary    text,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, content_sha256)
);
CREATE INDEX IF NOT EXISTS agent_documents_object_idx
  ON agent_documents (organization_id, object_type, object_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_document_segments (
  id              bigserial PRIMARY KEY,
  document_id     uuid NOT NULL REFERENCES agent_documents(id) ON DELETE CASCADE,
  page_start      integer,
  page_end        integer,
  section         text,
  content         text NOT NULL,
  content_sha256  text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, content_sha256)
);
CREATE INDEX IF NOT EXISTS agent_document_segments_document_idx
  ON agent_document_segments (document_id, page_start, id);

CREATE TABLE IF NOT EXISTS agent_improvement_proposals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('reliability','context','workflow','memory','ui','documents','data_quality')),
  title             text NOT NULL,
  reason            text NOT NULL,
  evidence          jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_benefit  text,
  risk              text NOT NULL DEFAULT 'baixo' CHECK (risk IN ('baixo','medio','alto')),
  status            text NOT NULL DEFAULT 'suggested'
                    CHECK (status IN ('suggested','approved','rejected','testing','applied')),
  idempotency_key   text NOT NULL,
  source            text NOT NULL DEFAULT 'deterministic-review',
  created_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz,
  UNIQUE (organization_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS agent_improvement_proposals_status_idx
  ON agent_improvement_proposals (organization_id, status, created_at DESC);
