-- 022 — ESPELHO LOCAL DO CADASTRO (P0.2, 20/08/2026)
-- O mapa hoje bate AO VIVO no ArcGIS da prefeitura a cada busca/zoom — quando o
-- servidor deles engasga (medido: 19,9s numa chamada simples em 19/08), o nosso app
-- engasga junto. O espelho copia as camadas-chave para o nosso PostGIS: resposta
-- instantânea, rótulo Q/L no zoom, base do Meilisearch e do potencial construtivo.
-- Sync incremental por last_edited_date/dtultalter; proveniência: ArcGIS público da
-- Prefeitura de Goiânia (portalmapa.goiania.go.gov.br), SIRGAS 2000 → WGS84 (4326).

-- Lotes (~399 mil): a malha que desenha o mapa + o número do lote que faltava
CREATE TABLE IF NOT EXISTS espelho_lote (
  objectid     integer PRIMARY KEY,
  nm_lot       text,          -- número do lote (o rótulo que o Bruno pediu no zoom)
  id_qdr       text,          -- quadra
  ci_qdr       text,
  ci           text,          -- inscrição cadastral vinculada (quando há)
  nm_cond      text,          -- condomínio (quando condomínio)
  in_cond      text,
  editado_em   timestamptz,   -- last_edited_date da prefeitura (ancora o incremental)
  geom         geometry(Polygon, 4326)
);
CREATE INDEX IF NOT EXISTS espelho_lote_geom_gix ON espelho_lote USING gist (geom);
CREATE INDEX IF NOT EXISTS espelho_lote_qdr_ix  ON espelho_lote (id_qdr);

-- Bairros
CREATE TABLE IF NOT EXISTS espelho_bairro (
  objectid     integer PRIMARY KEY,
  nm           text,
  editado_em   timestamptz,
  geom         geometry(Polygon, 4326)
);
CREATE INDEX IF NOT EXISTS espelho_bairro_geom_gix ON espelho_bairro USING gist (geom);

-- Cadastro imobiliário (~399 mil registros): inscrição, endereço, quadra/lote,
-- áreas, valor venal, zona fiscal (cdzona) e nome de edifício — a espinha dorsal
CREATE TABLE IF NOT EXISTS espelho_cadastro (
  objectid     integer PRIMARY KEY,
  nrinscr      text,          -- inscrição imobiliária (chave da ficha e do kit prefeitura)
  nmlogradou   text,
  tplogradou   text,
  nrimovel     text,          -- número oficial
  nrquadra     text,
  nrlote       text,
  cdbairro     text,
  nmbairro     text,
  areaterr     numeric,
  areaedif     numeric,
  vlvenal      numeric,
  cdzona       text,          -- zona fiscal — matéria-prima do "potencial construtivo"
  nmedificio   text,          -- nome do edifício (busca por prédio)
  in_valido    text,
  alterado_em  timestamptz,   -- dtultalter (ancora o incremental)
  geom         geometry(Polygon, 4326)
);
CREATE INDEX IF NOT EXISTS espelho_cadastro_geom_gix  ON espelho_cadastro USING gist (geom);
CREATE INDEX IF NOT EXISTS espelho_cadastro_inscr_ix  ON espelho_cadastro (nrinscr);
CREATE INDEX IF NOT EXISTS espelho_cadastro_logr_ix   ON espelho_cadastro (upper(nmlogradou));
CREATE INDEX IF NOT EXISTS espelho_cadastro_edif_ix   ON espelho_cadastro (upper(nmedificio)) WHERE nmedificio IS NOT NULL;

-- Número predial oficial (pontos)
CREATE TABLE IF NOT EXISTS espelho_num_predial (
  objectid     integer PRIMARY KEY,
  nrinscr      text,
  nm_npo       text,          -- número oficial da porta
  geom         geometry(Point, 4326)
);
CREATE INDEX IF NOT EXISTS espelho_num_predial_geom_gix ON espelho_num_predial USING gist (geom);
CREATE INDEX IF NOT EXISTS espelho_num_predial_inscr_ix ON espelho_num_predial (nrinscr);

-- Plano Diretor (camadas escolhidas do Mapa_ModeloEspacial): atributos variam por
-- camada — guardamos props em jsonb (flexível) + geom indexada
CREATE TABLE IF NOT EXISTS espelho_pd (
  camada       integer NOT NULL,   -- id da camada no serviço
  objectid     integer NOT NULL,
  props        jsonb,
  geom         geometry(Geometry, 4326),
  PRIMARY KEY (camada, objectid)
);
CREATE INDEX IF NOT EXISTS espelho_pd_geom_gix ON espelho_pd USING gist (geom);

-- Estado do sync: retomada após falha + incremental
CREATE TABLE IF NOT EXISTS espelho_sync (
  camada       text PRIMARY KEY,   -- 'lote' | 'bairro' | 'cadastro' | 'num_predial' | 'pd:<id>'
  modo         text,               -- 'cheio' | 'incremental'
  pagina       integer DEFAULT 0,  -- resultOffset da última página gravada
  total        integer,
  marca        timestamptz,        -- maior last_edited_date já espelhado (base do incremental)
  status       text,               -- 'rodando' | 'ok' | 'erro'
  atualizado_em timestamptz DEFAULT now()
);
