-- 016-intelligence-property-links: liga hipóteses do radar à carteira privada sem
-- confundir um sinal do bairro/comparável com um fato sobre o imóvel.
CREATE TABLE IF NOT EXISTS intelligence_finding_links (
  finding_id           uuid NOT NULL REFERENCES intelligence_findings(id) ON DELETE CASCADE,
  inventory_property_id uuid NOT NULL REFERENCES inventory_properties(id) ON DELETE CASCADE,
  relation             text NOT NULL CHECK (relation IN ('direct','comparable','neighborhood')),
  relevance            numeric(4,3) NOT NULL CHECK (relevance BETWEEN 0 AND 1),
  status               text NOT NULL DEFAULT 'candidate'
                       CHECK (status IN ('candidate','reviewed','rejected')),
  reviewed_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (finding_id, inventory_property_id)
);
CREATE INDEX IF NOT EXISTS intelligence_finding_links_property_idx
  ON intelligence_finding_links (inventory_property_id, relevance DESC, created_at DESC);

-- Investigações pedidas dentro do dossiê são vínculos diretos.
INSERT INTO intelligence_finding_links (finding_id,inventory_property_id,relation,relevance)
SELECT f.id,p.id,'direct',1
FROM intelligence_findings f
JOIN intelligence_jobs j ON j.id=f.job_id
JOIN inventory_properties p ON p.organization_id=f.organization_id
WHERE j.scope->>'inventoryPropertyId'=p.id::text
ON CONFLICT (finding_id,inventory_property_id) DO NOTHING;

-- Achados baseados em anúncio usado como comparável são contexto do imóvel, não o imóvel em si.
INSERT INTO intelligence_finding_links (finding_id,inventory_property_id,relation,relevance)
SELECT DISTINCT f.id,p.id,'comparable',0.750
FROM intelligence_findings f
JOIN intelligence_evidence e ON e.id=ANY(f.evidence_ids)
JOIN valuation_comparables vc ON vc.property_id::text=e.metadata->>'propertyId'
JOIN valuations v ON v.id=vc.valuation_id
JOIN inventory_properties p ON p.id::text=v.subject->>'inventoryPropertyId' AND p.organization_id=f.organization_id
ON CONFLICT (finding_id,inventory_property_id) DO NOTHING;

-- Bairro exato gera apenas contexto territorial e exclui lacunas genéricas de fonte.
INSERT INTO intelligence_finding_links (finding_id,inventory_property_id,relation,relevance)
SELECT DISTINCT f.id,p.id,'neighborhood',0.550
FROM intelligence_findings f
JOIN intelligence_evidence e ON e.id=ANY(f.evidence_ids)
JOIN inventory_properties p ON p.organization_id=f.organization_id
  AND p.neighborhood IS NOT NULL
  AND lower(trim(e.metadata->>'neighborhood'))=lower(trim(p.neighborhood))
WHERE f.kind NOT IN ('source_gap','other')
ON CONFLICT (finding_id,inventory_property_id) DO NOTHING;

INSERT INTO audit_log (entity, entity_id, action, detail, actor)
SELECT 'schema', '016-intelligence-property-links', 'migration',
       '{"regra":"vinculo direto, comparavel e bairro sao exibidos separadamente; hipotese nunca vira fato"}'::jsonb,
       'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE entity='schema' AND entity_id='016-intelligence-property-links' AND action='migration'
);
