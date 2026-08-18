-- P1.4 (auditoria 18/08/2026): sessões revogáveis do painel. Antes o cookie HMAC era
-- stateless: "sair" só apagava o cookie no navegador e um token copiado seguia válido
-- até expirar (24 h). Agora o nonce de cada sessão vive aqui; logout (ou troca da
-- senha, via revogação em massa) invalida NO SERVIDOR. A checagem é por request —
-- painel de um corretor só, o SELECT por PK é irrisório.
CREATE TABLE IF NOT EXISTS painel_sessions (
  nonce      text PRIMARY KEY,             -- nonce aleatório do cookie (12 bytes hex)
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,         -- espelha o exp do cookie (24 h)
  revoked_at timestamptz,                  -- NULL = ativa; timestamp = revogada
  ip         text,                         -- auditoria: de onde entrou
  user_agent text                          -- auditoria: com o quê entrou (200 chars)
);
-- a poda (login novo apaga vencidas) varre por expires_at
CREATE INDEX IF NOT EXISTS painel_sessions_expira_idx ON painel_sessions (expires_at);
