-- IDEMP-01 (P1.6 do roadmap, 18/08/2026): idempotência nos POSTs de captura e
-- oportunidade. Antes, um retry de rede ou um duplo clique no "Confirmar e criar
-- imóvel" / "Registrar interessado" criava cadastro EM DOBRO — imóvel gêmeo com as
-- mesmas pendências, interessado duplicado no funil. O front agora manda um
-- Idempotency-Key determinístico (hash do conteúdo); aqui a chave é reivindicada
-- ANTES de executar (INSERT ON CONFLICT) e a resposta fica guardada por 24 h:
-- retry recebe o MESMO resultado (replay:true), nunca um segundo cadastro.
CREATE TABLE IF NOT EXISTS painel_idempotency (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  scope           text NOT NULL,          -- rota: 'captura-confirmar', 'oportunidade-criar'
  idem_key        text NOT NULL,          -- Idempotency-Key enviado pelo front
  response        jsonb,                  -- NULL = reivindicada, em andamento; preenchido = concluída
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, scope, idem_key)
);
-- a poda de 24 h roda oportunisticamente a cada reivindicação (idempotencia.js) —
-- retry real acontece em segundos/minutos; 24 h cobre até F5 no dia seguinte
CREATE INDEX IF NOT EXISTS painel_idempotency_poda_idx ON painel_idempotency (created_at);
