// IDEMP-01 (P1.6 do roadmap de 18/08/2026): idempotência nos POSTs de criação do
// painel (captura/confirmar e imoveis/<id>/oportunidade). Critério de aceite:
// "retry não duplica imóvel". Funcionais com banco falso em memória (db injetável,
// padrão da casa) + contrato de fonte sobre rotas, os-core, front e migração.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveValida, reivindicar, concluir, abortar } from "../motor/idempotencia.js";

/* banco falso: emula só os 4 SQLs do idempotencia.js sobre um Map em memória */
function bancoFalso() {
  const tabela = new Map(); // `${org}|${scope}|${key}` -> { response }
  return {
    tabela,
    async query(sql, params = []) {
      if (sql.startsWith("DELETE FROM painel_idempotency WHERE created_at")) return { rowCount: 0 };
      if (sql.startsWith("INSERT INTO painel_idempotency")) {
        const k = params.slice(0, 3).join("|");
        if (tabela.has(k)) return { rowCount: 0, rows: [] }; /* ON CONFLICT DO NOTHING */
        tabela.set(k, { response: null });
        return { rowCount: 1, rows: [{ idem_key: params[2] }] };
      }
      if (sql.startsWith("SELECT response FROM painel_idempotency")) {
        const k = params.slice(0, 3).join("|");
        const row = tabela.get(k);
        return { rowCount: row ? 1 : 0, rows: row ? [{ response: row.response }] : [] };
      }
      if (sql.startsWith("UPDATE painel_idempotency SET response")) {
        const k = params.slice(0, 3).join("|");
        if (tabela.has(k)) tabela.get(k).response = JSON.parse(params[3]);
        return { rowCount: 1 };
      }
      if (sql.startsWith("DELETE FROM painel_idempotency\n     WHERE")) {
        const k = params.slice(0, 3).join("|");
        if (tabela.get(k)?.response === null) tabela.delete(k); /* response IS NULL */
        return { rowCount: 1 };
      }
      throw new Error(`SQL inesperado no banco falso: ${sql.slice(0, 60)}`);
    },
  };
}

const ORG = "11111111-2222-3333-4444-555555555555";
const CHAVE = "cap-abc123def-xy";

test("idempotência: chave ausente ou inválida não muda o comportamento de antes", async () => {
  assert.equal(chaveValida(null), null);
  assert.equal(chaveValida("curta"), null);
  assert.equal(chaveValida("tem espaço e acentos não"), null);
  assert.equal(chaveValida(CHAVE), CHAVE);
  const db = bancoFalso();
  const r = await reivindicar(db, ORG, "captura-confirmar", null);
  assert.equal(r.modo, "sem-chave");
  assert.equal(db.tabela.size, 0, "sem chave não grava nada");
});

test("idempotência: retry NÃO duplica — segunda execução recebe replay do primeiro resultado", async () => {
  const db = bancoFalso();
  const primeira = await reivindicar(db, ORG, "captura-confirmar", CHAVE);
  assert.equal(primeira.modo, "executar", "primeira vez reclama a chave");
  const resultado = { ok: true, property: { id: "imovel-1", title: "Apto Setor Oeste" } };
  await concluir(db, ORG, "captura-confirmar", primeira.chave, resultado);

  const segunda = await reivindicar(db, ORG, "captura-confirmar", CHAVE);
  assert.equal(segunda.modo, "replay", "mesma chave NÃO executa de novo");
  assert.deepEqual(segunda.corpo, { ...resultado, replay: true });
  assert.equal(db.tabela.size, 1, "um único registro — o imóvel existe uma vez só");
});

test("idempotência: chave reclamada e ainda sem resposta devolve 409 honesto", async () => {
  const db = bancoFalso();
  await reivindicar(db, ORG, "oportunidade-criar", CHAVE); /* reclamou, ainda rodando */
  const concorrente = await reivindicar(db, ORG, "oportunidade-criar", CHAVE);
  assert.equal(concorrente.modo, "em-andamento");
  assert.equal(concorrente.corpo.status, 409);
  assert.match(concorrente.corpo.erro, /em andamento/i);
});

test("idempotência: exceção libera a chave — o retry legítimo executa de verdade", async () => {
  const db = bancoFalso();
  const primeira = await reivindicar(db, ORG, "captura-confirmar", CHAVE);
  await abortar(db, ORG, "captura-confirmar", primeira.chave); /* simula exceção + rollback */
  const tentativa = await reivindicar(db, ORG, "captura-confirmar", CHAVE);
  assert.equal(tentativa.modo, "executar", "chave abortada pode ser reclamada de novo");
});

test("idempotência: escopo e organização separam chaves iguais", async () => {
  const db = bancoFalso();
  await reivindicar(db, ORG, "captura-confirmar", CHAVE);
  const outroEscopo = await reivindicar(db, ORG, "oportunidade-criar", CHAVE);
  assert.equal(outroEscopo.modo, "executar", "mesma chave em outra rota é outra operação");
});

test("idempotência: rotas, os-core, front e migração ligados (contrato de fonte)", () => {
  const painel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
  assert.match(painel, /confirmarCaptura\([\s\S]{0,200}idemKey: req\.headers\["idempotency-key"\]/);
  assert.match(painel, /criarOportunidade\([\s\S]{0,200}idemKey: req\.headers\["idempotency-key"\]/);
  assert.ok(painel.includes("r.status || 400"), "rota honra o 409 de 'envio em andamento'");

  const os = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
  assert.ok(os.includes('from "./idempotencia.js"'));
  assert.ok(os.includes('"captura-confirmar"') && os.includes('"oportunidade-criar"'));
  assert.match(os, /await abortar\(db, org\.id, "captura-confirmar"/, "exceção libera a chave");
  assert.match(os, /await concluir\(db, org\.id, "oportunidade-criar", idem\.chave, resultado\)/,
    "erro de negócio determinístico também é gravado para replay");

  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.match(app, /function idemKey\(prefix,payload\)/, "front gera chave determinística");
  assert.ok(app.includes('"Idempotency-Key":idemKey("cap",state.preview)'));
  assert.ok(app.includes('"Idempotency-Key":idemKey("opo",[state.property.id,dados])'));

  const mig = readFileSync(new URL("../motor/migrations/021-idempotency.sql", import.meta.url), "utf-8");
  assert.match(mig, /CREATE TABLE IF NOT EXISTS painel_idempotency/);
  assert.match(mig, /PRIMARY KEY \(organization_id, scope, idem_key\)/);
  assert.match(mig, /response\s+jsonb/, "NULL = em andamento; preenchido = pronto p/ replay");
});
