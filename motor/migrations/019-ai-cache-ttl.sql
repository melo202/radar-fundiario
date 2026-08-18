-- TTL do ai_cache (auditoria 18/08/2026): o cache por hash de conteúdo não tinha
-- evicção e crescia para sempre. A poda é oportunista (feita pelo ai-provider em
-- ~2,5% dos inserts, ver ai-provider.js); este índice torna a varredura barata.
CREATE INDEX IF NOT EXISTS ai_cache_created_at_idx ON ai_cache (created_at);
