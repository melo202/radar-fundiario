-- 011-comparable-policy: invalida resultados antigos que misturaram bairros no valor.
-- Nada é apagado; a trilha permanece disponível para auditoria e exige novo cálculo.

WITH afetadas AS (
  UPDATE valuations
     SET status = 'revisao_necessaria',
         result = jsonb_set(
           result || jsonb_build_object('policyVersion', 'legacy-neighborhood-expansion'),
           '{warnings}',
           coalesce(result->'warnings', '[]'::jsonb) || jsonb_build_array(
             'Resultado retirado de uso: a política anterior misturava bairros automaticamente. Recalcule com a política profissional vigente.'
           ),
           true
         )
   WHERE status = 'calculada'
     AND result #> '{sample,amostraAmpliada}' IS NOT NULL
     AND result #> '{sample,amostraAmpliada}' <> 'null'::jsonb
  RETURNING id
)
INSERT INTO audit_log (entity, entity_id, action, detail, actor)
SELECT 'valuations', '*', 'politica-comparaveis-atualizada',
       jsonb_build_object('avaliacoes_retiradas_de_uso', count(*), 'nova_politica', 'same-neighborhood-v2'),
       'migration-011'
  FROM afetadas
HAVING count(*) > 0;
