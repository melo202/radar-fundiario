-- 018-intelligence-feedback: revisão humana estruturada, reversível e por vínculo.
-- Feedback ensina o sistema, mas nunca altera o fato canônico ou apaga a decisão anterior.
CREATE TABLE IF NOT EXISTS intelligence_feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finding_id            uuid NOT NULL,
  inventory_property_id uuid NOT NULL,
  decision              text NOT NULL
                        CHECK (decision IN ('confirmed','false_positive','inconclusive','watching','expired','wrong_scope')),
  reason                text
                        CHECK (reason IS NULL OR reason IN (
                          'confirmed_by_source','useful_for_decision','different_property','different_unit',
                          'catalog_or_multi_listing','wrong_geography','wrong_transaction','stale_source',
                          'unproven_price','change_not_found','duplicate_signal','insufficient_evidence',
                          'no_commercial_relevance','expired_signal','legacy_review','other'
                        )),
  correction            jsonb NOT NULL DEFAULT '{}'::jsonb,
  note                  text,
  policy_versions       jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id         uuid REFERENCES app_users(id) ON DELETE SET NULL,
  actor                 text NOT NULL DEFAULT 'corretor-painel',
  supersedes_id         uuid REFERENCES intelligence_feedback(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','superseded','reverted')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  reverted_at           timestamptz,
  FOREIGN KEY (finding_id,inventory_property_id)
    REFERENCES intelligence_finding_links(finding_id,inventory_property_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS intelligence_feedback_active_uidx
  ON intelligence_feedback (organization_id,finding_id,inventory_property_id)
  WHERE status='active';
CREATE INDEX IF NOT EXISTS intelligence_feedback_property_history_idx
  ON intelligence_feedback (organization_id,inventory_property_id,created_at DESC);
CREATE INDEX IF NOT EXISTS intelligence_feedback_learning_idx
  ON intelligence_feedback (organization_id,decision,reason,created_at DESC)
  WHERE status='active';

-- Preserva revisões feitas antes da taxonomia. O rótulo deixa explícito que a decisão
-- antiga não possuía motivo estruturado nem a semântica mais rica da política atual.
INSERT INTO intelligence_feedback
  (organization_id,finding_id,inventory_property_id,decision,reason,actor,created_at)
SELECT f.organization_id,l.finding_id,l.inventory_property_id,
       CASE WHEN l.status='reviewed' THEN 'confirmed' ELSE 'false_positive' END,
       'legacy_review','migration-018',COALESCE(l.reviewed_at,l.created_at)
FROM intelligence_finding_links l
JOIN intelligence_findings f ON f.id=l.finding_id
WHERE l.status IN ('reviewed','rejected')
  AND NOT EXISTS (
    SELECT 1 FROM intelligence_feedback x
    WHERE x.organization_id=f.organization_id AND x.finding_id=l.finding_id
      AND x.inventory_property_id=l.inventory_property_id AND x.status='active'
  );

INSERT INTO audit_log (entity,entity_id,action,detail,actor)
SELECT 'schema','018-intelligence-feedback','migration',
       '{"regra":"feedback e append-only, estruturado e reversivel; nunca promove fato automaticamente"}'::jsonb,
       'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE entity='schema' AND entity_id='018-intelligence-feedback' AND action='migration'
);
