-- P0.3 (20/08/2026): colunas normalizadas para geocodificação de anúncios pelo espelho.
-- log_norm: nmlogradou sem o prefixo de tipo ("R  T27"→"T27", "AV PORTUGAL"→"PORTUGAL"),
-- maiúsculo e sem acento (translate fixo — sem depender da extensão unaccent).
-- edif_norm: nmedificio sem prefixos ED./COND./RES. — para casar o nome do condomínio
-- que aparece no texto do anúncio com o nome oficial do cadastro.
ALTER TABLE espelho_cadastro ADD COLUMN IF NOT EXISTS log_norm text
  GENERATED ALWAYS AS (
    translate(upper(trim(regexp_replace(coalesce(nmlogradou, ''), '^\s*(R|AV|AL|PC|TR|ROD|EST|VIA)\s+', ''))),
              'ÁÀÂÃÉÊÍÓÔÕÚÜÇ', 'AAAAEEIOOOUUC')
  ) STORED;
CREATE INDEX IF NOT EXISTS espelho_cadastro_lognorm_idx ON espelho_cadastro (log_norm);

ALTER TABLE espelho_cadastro ADD COLUMN IF NOT EXISTS edif_norm text
  GENERATED ALWAYS AS (
    translate(upper(trim(regexp_replace(regexp_replace(coalesce(nmedificio, ''),
      '^\s*(EDIF[ÍI]CIO|ED|COND(OM[ÍI]NIO)?|RESIDENCIAL|RES)\.?\s+', '', 'i'),
      '^\s*(EDIF[ÍI]CIO|ED|COND(OM[ÍI]NIO)?|RESIDENCIAL|RES)\.?\s+', '', 'i'))),
              'ÁÀÂÃÉÊÍÓÔÕÚÜÇ', 'AAAAEEIOOOUUC')
  ) STORED;
CREATE INDEX IF NOT EXISTS espelho_cadastro_edifnorm_idx ON espelho_cadastro (edif_norm) WHERE edif_norm <> '';
