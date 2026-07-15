-- 003-enderecos: geocoding local por CNEFE/IBGE Censo 2022 (plano de localização §7).
-- 777 mil endereços de Goiânia agregados por (localidade, logradouro, número) — 90%
-- com coordenada no nível do próprio endereço (NV_GEO_COORD=1, medido em 15/07/2026).
-- Carga: gerar-enderecos.py (fonte estática — Censo 2022, sem timer de recarga).
CREATE TABLE IF NOT EXISTS enderecos (
  id          bigserial PRIMARY KEY,
  logradouro  text NOT NULL,           -- NOM_SEGLOGR normalizado (normaliza-endereco.js)
  tipo        text,                    -- rua/avenida/... (exibição)
  titulo      text,                    -- coronel/doutor/... (exibição)
  numero      int  NOT NULL,
  cep         text,
  localidade  text,                    -- DSC_LOCALIDADE do CNEFE (aprox. bairro)
  qtd         int  NOT NULL,           -- endereços agregados neste ponto
  nivel       int  NOT NULL,           -- melhor NV_GEO_COORD do grupo (1 = no endereço)
  geom        geography(Point, 4326) NOT NULL,
  fonte       text NOT NULL DEFAULT 'cnefe-2022'
);
CREATE INDEX IF NOT EXISTS enderecos_logr_idx ON enderecos (logradouro, numero);
CREATE INDEX IF NOT EXISTS enderecos_geom_idx ON enderecos USING gist (geom);
