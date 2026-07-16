-- SV-1: acompanhamento do status da venda para o CLIENTE (página pública por token).
-- REGRA LOCAL-FIRST DE PII: nenhum dado do cliente aqui — o imóvel aparece por um
-- APELIDO escolhido pelo corretor ("Apto Bueno 302"); corretor é nome/CRECI
-- autorreferidos para exibição. O token aleatório é a única chave de acesso.
CREATE TABLE vendas (
  token         text PRIMARY KEY,
  apelido       text NOT NULL,
  corretor      text,
  etapas        jsonb NOT NULL,
  encerrada     boolean NOT NULL DEFAULT false,
  criada_em     timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);
