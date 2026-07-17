-- 008-oportunidades: mercado de OPORTUNIDADES (Caixa/leilão/bancos) — projeto de 17/07.
-- Decisão de segurança: oportunidades vivem em tabela PRÓPRIA, NUNCA em properties.
-- Assim o índice de ofertas do bairro (que lê só properties) fica protegido por
-- construção — preço de leilão jamais contamina a mediana de mercado (o risco nº 1 da
-- pesquisa). O cruzamento é de mão única: a oportunidade CONSULTA o índice para calcular
-- o desconto, mas nunca entra nele. Nada é apagado (§16): imóvel some da fonte -> vira
-- 'ausente' e depois 'encerrado', com histórico preservado no audit_log.

CREATE TABLE IF NOT EXISTS oportunidades (
  fonte          text NOT NULL,                 -- 'caixa' (leilão/bancos entram por aqui depois)
  external_id    text NOT NULL,                 -- Nº do imóvel da Caixa (13 dígitos) — chave estável
  bairro         text,
  cdbairro       integer,                        -- código fiscal casado com o cadastro municipal
  endereco       text,
  tipo           text,                           -- Casa | Apartamento | Terreno
  modalidade     text,                           -- 'Leilão SFI - Edital Único' | 'Venda Direta Online' | ...
  preco          numeric,                        -- lance/valor mínimo vigente
  avaliacao      numeric,                        -- valor de avaliação da Caixa
  desconto_caixa numeric,                         -- % oficial vs avaliação (fonte: CSV)
  area_m2        numeric,                        -- privativa/total parseada (pode ser NULL — honesto)
  financiamento  boolean,
  x_utm          numeric,                        -- coordenada SIRGAS 2000 UTM 22S (EPSG:31982)
  y_utm          numeric,                        -- geocodificada no cadastro (runner residencial)
  precisao       text,                           -- 'q' = lote exato | 'r' = aproximado | NULL = sem pino
  url            text,                            -- link oficial detalhe-imovel.asp
  situacao       text NOT NULL DEFAULT 'ativo'    -- ativo | ausente | encerrado
                 CHECK (situacao IN ('ativo','ausente','encerrado')),
  gerado_em      date,                            -- data de geração do CSV que trouxe este registro
  visto_em       timestamptz NOT NULL DEFAULT now(),
  ausente_desde  timestamptz,
  criada_em      timestamptz NOT NULL DEFAULT now(),
  atualizada_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fonte, external_id)
);
CREATE INDEX IF NOT EXISTS oportunidades_situacao_idx ON oportunidades (situacao);
CREATE INDEX IF NOT EXISTS oportunidades_bairro_idx   ON oportunidades (cdbairro);
