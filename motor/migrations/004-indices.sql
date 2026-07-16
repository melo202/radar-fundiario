-- 004-indices: índices ABERTOS de mercado (FipeZap etc.) como referência ROTULADA.
-- Regra do roadmap: contexto no card/documento ("o índice da cidade variou X%"),
-- NUNCA entra no cálculo do valor sem correlação medida.
CREATE TABLE IF NOT EXISTS indices_mercado (
  id              bigserial PRIMARY KEY,
  fonte           text NOT NULL,             -- 'fipezap'
  cidade          text NOT NULL,             -- 'Goiânia'
  operacao        text NOT NULL,             -- 'venda' | 'locacao'
  referencia      date NOT NULL,             -- mês de referência
  variacao_mensal numeric,                   -- fração (0.0087 = 0,87%)
  variacao_12m    numeric,
  preco_m2_medio  numeric,
  coletado_em     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fonte, cidade, operacao, referencia)
);
