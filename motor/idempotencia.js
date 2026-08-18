/* IDEMP-01 (P1.6 do roadmap, 18/08/2026): idempotência dos POSTs de criação do painel
   (captura/confirmar e imoveis/<id>/oportunidade). O problema: retry de rede ou duplo
   clique criava imóvel/interessado EM DOBRO — o POST não era seguro para repetir.

   Modelo "reivindica-executa-conclui", sem classe e com db injetável (padrão da casa):
   1. reivindicar(): INSERT ... ON CONFLICT DO NOTHING reclama a chave ANTES do trabalho.
      - reclamou → modo "executar": o chamador roda a operação de verdade;
      - já existia COM resposta → modo "replay": devolve o MESMO resultado de antes;
      - já existia SEM resposta → modo "em-andamento": 409 honesto (o primeiro envio
        ainda está rodando — nunca executar uma segunda vez às cegas).
   2. concluir(): grava a resposta (ok ou erro de negócio — ambos determinísticos).
   3. abortar(): exceção libera a chave, para o retry legítimo tentar de verdade.
   Chave ausente/inválida → modo "sem-chave": cliente antigo segue funcionando como antes. */

const CHAVE_RE = /^[A-Za-z0-9_-]{8,80}$/; /* o front gera "escopo-hash36hash36-tam36" */

export function chaveValida(chave) {
  return typeof chave === "string" && CHAVE_RE.test(chave) ? chave : null;
}

export async function reivindicar(db, orgId, scope, chaveBruta) {
  const chave = chaveValida(chaveBruta);
  if (!chave) return { modo: "sem-chave", chave: null };
  /* poda oportunista de 24 h — tabela de um painel só, o DELETE é irrisório */
  await db.query("DELETE FROM painel_idempotency WHERE created_at < now() - interval '24 hours'").catch(() => {});
  const claim = await db.query(
    `INSERT INTO painel_idempotency (organization_id, scope, idem_key)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING idem_key`,
    [orgId, scope, chave]);
  if (claim.rowCount) return { modo: "executar", chave };
  const prev = await db.query(
    `SELECT response FROM painel_idempotency
     WHERE organization_id=$1 AND scope=$2 AND idem_key=$3`,
    [orgId, scope, chave]);
  if (prev.rowCount && prev.rows[0].response) {
    return { modo: "replay", chave, corpo: { ...prev.rows[0].response, replay: true } };
  }
  /* chave reclamada mas ainda sem resposta: o primeiro envio está no ar */
  return { modo: "em-andamento", chave, corpo: { ok: false, status: 409,
    erro: "Envio idêntico ainda em andamento — aguarde a resposta do primeiro." } };
}

export async function concluir(db, orgId, scope, chave, corpo) {
  if (!chave) return;
  await db.query(
    `UPDATE painel_idempotency SET response=$4
     WHERE organization_id=$1 AND scope=$2 AND idem_key=$3`,
    [orgId, scope, chave, JSON.stringify(corpo)]).catch(() => {});
}

/* exceção no meio do caminho: a chave NÃO guarda fracasso — o retry tem direito
   de tentar a operação de verdade */
export async function abortar(db, orgId, scope, chave) {
  if (!chave) return;
  await db.query(
    `DELETE FROM painel_idempotency
     WHERE organization_id=$1 AND scope=$2 AND idem_key=$3 AND response IS NULL`,
    [orgId, scope, chave]).catch(() => {});
}
