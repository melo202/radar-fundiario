-- 009-agent-runtime: sessões por objeto, perfil recuperável e consumo do assistente.
-- O agente nunca recebe acesso ao PostgreSQL; somente a aplicação lê e entrega contexto selecionado.

CREATE TABLE IF NOT EXISTS agent_profiles (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  memories        jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  object_type     text NOT NULL DEFAULT 'general'
                  CHECK (object_type IN ('general','property','contact','valuation','visit','investment')),
  object_id       uuid,
  title           text NOT NULL,
  runtime         text NOT NULL DEFAULT 'hermes'
                  CHECK (runtime IN ('hermes','direct-kimi','local')),
  context_budget  integer NOT NULL DEFAULT 64000 CHECK (context_budget BETWEEN 8000 AND 256000),
  high_speed      boolean NOT NULL DEFAULT false,
  summary         text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_sessions_org_updated_idx ON agent_sessions (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_sessions_object_idx ON agent_sessions (organization_id, object_type, object_id);

CREATE TABLE IF NOT EXISTS agent_messages (
  id          bigserial PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  runtime     text,
  model       text,
  usage       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_messages_session_idx ON agent_messages (session_id, id DESC);

CREATE TABLE IF NOT EXISTS agent_usage (
  id              bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id      uuid REFERENCES agent_sessions(id) ON DELETE SET NULL,
  runtime         text NOT NULL,
  model           text,
  fallback_from   text,
  input_tokens    integer,
  output_tokens   integer,
  duration_ms     integer,
  high_speed      boolean NOT NULL DEFAULT false,
  ok              boolean NOT NULL,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_usage_org_time_idx ON agent_usage (organization_id, created_at DESC);
