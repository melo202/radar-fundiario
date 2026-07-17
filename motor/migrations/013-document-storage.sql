-- 013-document-storage: arquivo privado, deduplicado dentro do objeto correto.
-- O conteúdo bruto fica no disco da VPS; o PostgreSQL guarda identidade e trilha.

ALTER TABLE agent_documents
  ADD COLUMN IF NOT EXISTS byte_size bigint CHECK (byte_size IS NULL OR byte_size BETWEEN 1 AND 8388608);

-- A regra antiga impedia o mesmo documento legítimo de ser ligado a dois imóveis.
ALTER TABLE agent_documents
  DROP CONSTRAINT IF EXISTS agent_documents_organization_id_content_sha256_key;

CREATE UNIQUE INDEX IF NOT EXISTS agent_documents_object_sha_uidx
  ON agent_documents (
    organization_id,
    object_type,
    COALESCE(object_id, '00000000-0000-0000-0000-000000000000'::uuid),
    content_sha256
  );
