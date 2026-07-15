-- 001-base: primeira fatia do modelo de dados do motor (MOTOR-PRECO.md §B.14 / plano §20).
-- Regra: NUNCA sobrescrever análise antiga — valuations é versionada por imóvel.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Anúncio BRUTO como coletado (fonte rastreável; §16). content_hash deduplica coleta idêntica.
CREATE TABLE IF NOT EXISTS listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal        text        NOT NULL,
  url           text        NOT NULL,
  external_id   text,
  collected_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz,
  raw_title     text,
  raw_description text,
  raw_payload   jsonb,
  content_hash  text        NOT NULL,
  dedup_group   uuid,
  UNIQUE (portal, url, content_hash)
);

-- Entidade normalizada (plano §3). Campos desconhecidos ficam NULL — nunca inventados.
CREATE TABLE IF NOT EXISTS properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid REFERENCES listings(id),
  city          text NOT NULL DEFAULT 'Goiânia',
  state         text NOT NULL DEFAULT 'GO',
  neighborhood  text,
  address       text,
  geom          geometry(Point, 4326),
  location_confidence numeric,
  property_type text,
  characteristics jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing       jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality       jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction    jsonb,           -- saída validada da IA + proveniência por campo (§4/§22)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_geom_idx ON properties USING gist (geom);

CREATE TABLE IF NOT EXISTS price_history (
  id          bigserial PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES listings(id),
  price       numeric NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now()
);

-- Avaliações versionadas (§20): cada cálculo é uma linha nova; nada é sobrescrito.
CREATE TABLE IF NOT EXISTS valuations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       jsonb NOT NULL,           -- imóvel avaliado (snapshot)
  status        text  NOT NULL DEFAULT 'rascunho',
  result        jsonb,                    -- ValuationResult (§12) quando calculado
  assumptions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  version       integer NOT NULL DEFAULT 1,
  parent_id     uuid REFERENCES valuations(id),
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS valuation_comparables (
  valuation_id  uuid NOT NULL REFERENCES valuations(id),
  property_id   uuid NOT NULL REFERENCES properties(id),
  total_score   numeric,
  factors       jsonb,
  accepted      boolean NOT NULL DEFAULT true,
  rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_outlier    boolean NOT NULL DEFAULT false,
  manual_change jsonb,                    -- §14: alteração do corretor, sempre registrada
  PRIMARY KEY (valuation_id, property_id)
);

-- Logs e cache de IA (§21/§22): toda chamada registrada; cache por hash do conteúdo.
CREATE TABLE IF NOT EXISTS ai_logs (
  id          bigserial PRIMARY KEY,
  task        text NOT NULL,
  model       text NOT NULL,
  prompt_hash text NOT NULL,
  duration_ms integer,
  eval_tokens integer,
  ok          boolean NOT NULL,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ai_cache (
  prompt_hash text PRIMARY KEY,
  model       text NOT NULL,
  response    jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  entity     text NOT NULL,
  entity_id  text NOT NULL,
  action     text NOT NULL,
  detail     jsonb,
  actor      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
