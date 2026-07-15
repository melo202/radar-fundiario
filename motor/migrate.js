/* Migrações em ordem, uma vez cada (tabela schema_migrations). Sem framework. */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./db.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
for (const f of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) {
  const done = await pool.query("SELECT 1 FROM schema_migrations WHERE name=$1", [f]);
  if (done.rows.length) { console.log(`= ${f} (já aplicada)`); continue; }
  const sql = readFileSync(join(dir, f), "utf-8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
    await client.query("COMMIT");
    console.log(`+ ${f} aplicada`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`! ${f} FALHOU: ${e.message}`);
    process.exit(1);
  } finally { client.release(); }
}
await pool.end();
