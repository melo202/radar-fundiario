-- 007-identidade: identidade canônica do anúncio (projeto Mercado em Movimento 17/07).
-- external_id já existia em 001-base e nunca era preenchido; o backfill-identidade.js
-- popula o acervo antigo e o ingerir.js grava daqui em diante. O índice serve à busca
-- "este anúncio já passou por aqui?" que ancora o histórico de preço.
CREATE INDEX IF NOT EXISTS listings_external_id_idx
  ON listings (external_id) WHERE external_id IS NOT NULL;
