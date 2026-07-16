-- 006-corretor-os: fundação operacional do Corretor Inteligente OS.
-- Mantém o domínio público de mercado (listings/properties/valuations) separado da
-- carteira privada do corretor (inventory_properties/contacts/opportunities).

CREATE TABLE IF NOT EXISTS organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  type        text NOT NULL DEFAULT 'corretor_autonomo'
              CHECK (type IN ('corretor_autonomo','equipe','imobiliaria','entidade','plataforma')),
  status      text NOT NULL DEFAULT 'ativa'
              CHECK (status IN ('ativa','suspensa','encerrada')),
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text,
  phone       text,
  creci       text,
  cnai        text,
  status      text NOT NULL DEFAULT 'ativo'
              CHECK (status IN ('ativo','convidado','bloqueado','inativo')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_uidx
  ON app_users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'corretor'
                  CHECK (role IN ('administrador','gestor','corretor','assistente','avaliador','visualizador')),
  status          text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','convidado','removido')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'comprador'
                  CHECK (type IN ('proprietario','comprador','locatario','investidor','parceiro','incorporador','fornecedor')),
  name            text NOT NULL,
  phone           text,
  email           text,
  document_number text,
  source          text,
  status          text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo','bloqueado','arquivado')),
  consent_status  text NOT NULL DEFAULT 'nao_informado'
                  CHECK (consent_status IN ('nao_informado','consentido','revogado','nao_aplicavel')),
  notes           text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contacts_org_name_idx ON contacts (organization_id, lower(name));
CREATE INDEX IF NOT EXISTS contacts_org_phone_idx ON contacts (organization_id, phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_preferences (
  contact_id         uuid PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type   text,
  property_types     jsonb NOT NULL DEFAULT '[]'::jsonb,
  neighborhoods      jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_min          numeric,
  price_max          numeric,
  bedrooms_min       integer,
  parking_min        integer,
  area_min           numeric,
  area_max           numeric,
  required_features  jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_features  jsonb NOT NULL DEFAULT '[]'::jsonb,
  declared_data      jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_data      jsonb NOT NULL DEFAULT '{}'::jsonb,
  inferred_data      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_properties (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_reference   text,
  title                 text,
  status                text NOT NULL DEFAULT 'ativo'
                        CHECK (status IN ('ativo','pausado','vendido','alugado','arquivado')),
  capture_stage         text NOT NULL DEFAULT 'prospect'
                        CHECK (capture_stage IN ('prospect','visited','captured','ready_to_publish','qualified','inactive','sold','rented')),
  transaction_type      text NOT NULL DEFAULT 'venda'
                        CHECK (transaction_type IN ('venda','locacao','venda_ou_locacao')),
  property_type         text NOT NULL,
  neighborhood          text,
  address               text,
  geom                  geometry(Point, 4326),
  characteristics      jsonb NOT NULL DEFAULT '{}'::jsonb,
  asking_price          numeric,
  suggested_price       numeric,
  occupancy              text,
  owner_contact_id      uuid REFERENCES contacts(id),
  responsible_user_id   uuid REFERENCES app_users(id),
  confidentiality       text NOT NULL DEFAULT 'privado'
                        CHECK (confidentiality IN ('privado','equipe','divulgavel')),
  commercial_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_properties_org_stage_idx
  ON inventory_properties (organization_id, capture_stage, status);
CREATE INDEX IF NOT EXISTS inventory_properties_geom_idx
  ON inventory_properties USING gist (geom);

CREATE TABLE IF NOT EXISTS opportunities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id            uuid NOT NULL REFERENCES contacts(id),
  inventory_property_id uuid REFERENCES inventory_properties(id),
  responsible_user_id   uuid REFERENCES app_users(id),
  stage                 text NOT NULL DEFAULT 'novo_interessado'
                        CHECK (stage IN ('novo_interessado','em_qualificacao','imovel_apresentado','visita_agendada','visitou','negociando','proposta','fechado','perdido')),
  origin                text,
  estimated_value       numeric,
  probability           numeric CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1)),
  last_interaction_at   timestamptz,
  next_action_at        timestamptz,
  loss_reason           text,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunities_org_stage_idx
  ON opportunities (organization_id, stage, next_action_at);

CREATE TABLE IF NOT EXISTS tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES app_users(id),
  related_entity_type text,
  related_entity_id   uuid,
  type                text NOT NULL DEFAULT 'follow_up',
  title               text NOT NULL,
  description         text,
  due_at              timestamptz,
  priority            text NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('baixa','normal','alta','critica')),
  status              text NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente','em_andamento','concluida','cancelada','adiada')),
  source              text NOT NULL DEFAULT 'manual',
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_org_due_idx ON tasks (organization_id, status, due_at);

CREATE TABLE IF NOT EXISTS domain_events (
  id              bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  source          text NOT NULL DEFAULT 'sistema',
  actor_user_id   uuid REFERENCES app_users(id),
  idempotency_key text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS domain_events_org_time_idx
  ON domain_events (organization_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS domain_events_org_idempotency_uidx
  ON domain_events (organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS recommendations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES app_users(id),
  entity_type     text,
  entity_id       uuid,
  type            text NOT NULL,
  title           text NOT NULL,
  reason          text NOT NULL,
  evidence        jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence      numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  impact          integer NOT NULL DEFAULT 1 CHECK (impact BETWEEN 1 AND 5),
  urgency         integer NOT NULL DEFAULT 1 CHECK (urgency BETWEEN 1 AND 5),
  effort          integer NOT NULL DEFAULT 1 CHECK (effort BETWEEN 1 AND 5),
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','aceita','rejeitada','expirada','executada')),
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recommendations_org_status_idx
  ON recommendations (organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS approvals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type     text NOT NULL,
  entity_type     text,
  entity_id       uuid,
  requested_by    uuid REFERENCES app_users(id),
  approved_by     uuid REFERENCES app_users(id),
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','aprovada','rejeitada','cancelada','executada')),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload  jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  decided_at      timestamptz
);
CREATE INDEX IF NOT EXISTS approvals_org_status_idx
  ON approvals (organization_id, status, created_at DESC);
