-- 024 — espelho_cadastro.ci (20/08/2026): o front consulta unidades do cadastro por
-- ci (a chave que o lote expõe e a camada 3 tem). Faltou no desenho inicial da 022 —
-- pego na auditoria pré-integração, antes de ligar o mapa ao espelho.
ALTER TABLE espelho_cadastro ADD COLUMN IF NOT EXISTS ci text;
CREATE INDEX IF NOT EXISTS espelho_cadastro_ci_ix ON espelho_cadastro (ci) WHERE ci IS NOT NULL;
