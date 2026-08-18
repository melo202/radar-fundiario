/* P1.4 — sessões revogáveis do painel (auth.js + migration 020).
   O banco é simulado em memória: as funções aceitam `db` injetado e o fake
   implementa só as 4 consultas que auth.js faz (insert/select/update/delete). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { criaSessao, sessaoDe, revogaSessao, revogaTodas } from "../motor/auth.js";

function fakeDb() {
  const rows = new Map(); /* nonce -> { exp, revoked, ip, ua } */
  return {
    rows,
    async query(sql, params = []) {
      if (sql.startsWith("INSERT INTO painel_sessions")) {
        const [nonce, exp, ip, ua] = params;
        rows.set(nonce, { exp, revoked: false, ip, ua });
        return { rowCount: 1 };
      }
      if (sql.startsWith("SELECT 1 FROM painel_sessions")) {
        const r = rows.get(params[0]);
        const ativa = r && !r.revoked && r.exp * 1000 > Date.now();
        return { rowCount: ativa ? 1 : 0 };
      }
      if (sql.startsWith("UPDATE painel_sessions SET revoked_at=now() WHERE nonce")) {
        const r = rows.get(params[0]);
        if (r && !r.revoked) { r.revoked = true; return { rowCount: 1 }; }
        return { rowCount: 0 };
      }
      if (sql.startsWith("UPDATE painel_sessions SET revoked_at=now() WHERE revoked_at IS NULL")) {
        let n = 0;
        for (const r of rows.values()) if (!r.revoked) { r.revoked = true; n++; }
        return { rowCount: n };
      }
      if (sql.startsWith("DELETE FROM painel_sessions")) {
        for (const [k, r] of rows) if (r.exp * 1000 <= Date.now()) rows.delete(k);
        return { rowCount: 0 };
      }
      throw new Error("SQL inesperado no fake: " + sql);
    },
  };
}

const reqCom = (token) => ({ headers: { cookie: `radar_sessao=${token}` } });

test("P1.4: login cria sessão registrada e o cookie abre o painel", async () => {
  const db = fakeDb();
  const token = await criaSessao({ ip: "10.0.0.1", userAgent: "teste/1.0" }, db);
  assert.equal(db.rows.size, 1);
  const sessao = await sessaoDe(reqCom(token), db);
  assert.ok(sessao, "sessão válida tinha que passar");
  assert.equal(typeof sessao.nonce, "string");
});

test("P1.4: logout revoga NO SERVIDOR — o mesmo token não entra mais", async () => {
  const db = fakeDb();
  const token = await criaSessao({}, db);
  const sessao = await sessaoDe(reqCom(token), db);
  await revogaSessao(sessao, db);
  assert.equal(await sessaoDe(reqCom(token), db), null);
});

test("P1.4: revogaTodas derruba todas as sessões ativas (troca de senha)", async () => {
  const db = fakeDb();
  const t1 = await criaSessao({}, db);
  const t2 = await criaSessao({}, db);
  await revogaTodas(db);
  assert.equal(await sessaoDe(reqCom(t1), db), null);
  assert.equal(await sessaoDe(reqCom(t2), db), null);
});

test("P1.4: token com assinatura adulterada é recusado sem tocar no banco", async () => {
  const db = fakeDb();
  const token = await criaSessao({}, db);
  const adulterado = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
  assert.equal(await sessaoDe(reqCom(adulterado), db), null);
});

test("P1.4: cookie ausente, vazio ou malformado não abre sessão", async () => {
  const db = fakeDb();
  assert.equal(await sessaoDe({ headers: {} }, db), null);
  assert.equal(await sessaoDe(reqCom(""), db), null);
  assert.equal(await sessaoDe(reqCom("sem-formato-valido"), db), null);
});

test("P1.4: sessão expirada não entra mesmo com assinatura válida", async () => {
  const db = fakeDb();
  const token = await criaSessao({}, db);
  const [exp, nonce, sig] = token.split(".");
  db.rows.get(nonce).exp = Math.floor(Date.now() / 1000) - 10; /* venceu */
  assert.equal(await sessaoDe(reqCom(`${exp}.${nonce}.${sig}`), db), null);
});
