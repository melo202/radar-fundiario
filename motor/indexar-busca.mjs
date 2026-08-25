/* P2.2 (25/08): indexador da busca "Google" — espelho do cadastro -> Meilisearch.
   Roda no VPS (timer radar-busca, toda madrugada depois do espelho) e sob demanda:
     node indexar-busca.mjs
   Indexa SÓ o que a sugestão precisa (nunca o lote inteiro):
     - ruas      (distinct log_norm + bairro, ~15 mil)  -> tipo "rua"
     - edifícios (distinct edif_norm + bairro, ~18 mil) -> tipo "predio"
   Estratégia SWAP: indexa em "imoveis_new" e troca atomicamente com "imoveis" —
   a sugestão nunca fica fora do ar durante a reindexação.
   Env: DATABASE_URL (obrigatória), MEILI_URL (default http://127.0.0.1:7700),
   MEILI_MASTER_KEY (obrigatória — a search-only NÃO escreve). */
import { pool } from "./db.js";

const MEILI = process.env.MEILI_URL || "http://127.0.0.1:7700";
const KEY = process.env.MEILI_MASTER_KEY;
const IDX = "imoveis", IDX_NEW = "imoveis_new";

if (!KEY) { console.error("MEILI_MASTER_KEY ausente — a indexação precisa da chave mestra (só no VPS)."); process.exit(1); }

const hdr = { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };

async function meili(path, opts = {}) {
  const r = await fetch(MEILI + path, { ...opts, headers: { ...hdr, ...(opts.headers || {}) }, signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error(`meili ${path} -> http ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

/* id de documento do Meilisearch: só [a-zA-Z0-9_-] — hash simples e estável da chave natural. */
function docId(prefixo, chave) {
  let h = 5381;
  const s = prefixo + "|" + chave;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return prefixo + "_" + h.toString(36);
}

async function esperarTarefa(uid, rotulo) {
  for (let i = 0; i < 120; i++) {
    const t = await meili(`/tasks/${uid}`);
    if (t.status === "succeeded") return;
    if (t.status === "failed" || t.status === "canceled") throw new Error(`${rotulo} falhou: ${JSON.stringify(t.error).slice(0, 300)}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`${rotulo}: timeout esperando a tarefa ${uid}`);
}

async function main() {
  console.log("lendo o espelho do cadastro…");
  const [ruas, predios] = await Promise.all([
    pool.query(`SELECT tplogradou AS tipovia, nmlogradou AS nome, nmbairro AS bairro, count(*)::int AS n
                FROM espelho_cadastro WHERE nmlogradou IS NOT NULL AND nmlogradou <> ''
                GROUP BY log_norm, tplogradou, nmlogradou, nmbairro`),
    pool.query(`SELECT nmedificio AS nome, nmbairro AS bairro, count(*)::int AS n
                FROM espelho_cadastro WHERE nmedificio IS NOT NULL AND nmedificio <> ''
                GROUP BY edif_norm, nmedificio, nmbairro`),
  ]);
  const docs = [];
  for (const r of ruas.rows) docs.push({ id: docId("rua", `${r.nome}|${r.bairro}`), tipo: "rua", nome: r.nome, tipovia: r.tipovia || null, bairro: r.bairro, n: r.n });
  for (const p of predios.rows) docs.push({ id: docId("predio", `${p.nome}|${p.bairro}`), tipo: "predio", nome: p.nome, tipovia: null, bairro: p.bairro, n: p.n });
  console.log(`${ruas.rows.length} ruas + ${predios.rows.length} edifícios = ${docs.length} documentos`);

  console.log(`configurando o índice ${IDX_NEW}…`);
  await meili(`/indexes`, { method: "POST", body: JSON.stringify({ uid: IDX_NEW, primaryKey: "id" }) }).catch(() => null); // já existe: segue
  const cfg = await meili(`/indexes/${IDX_NEW}/settings`, {
    method: "PATCH",
    body: JSON.stringify({
      searchableAttributes: ["nome", "bairro"],
      displayedAttributes: ["tipo", "nome", "tipovia", "bairro"],
      filterableAttributes: ["tipo"],
      sortableAttributes: ["n"],
      /* desempate pela frequência no cadastro (rua com 2 mil lotes acima da viela com 3) */
      rankingRules: ["words", "typo", "proximity", "attribute", "n:desc", "sort", "exactness"],
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
      pagination: { maxTotalHits: 20 },
    }),
  });
  await esperarTarefa(cfg.taskUid, "settings");

  console.log("enviando documentos em lotes de 5 mil…");
  for (let i = 0; i < docs.length; i += 5000) {
    const t = await meili(`/indexes/${IDX_NEW}/documents`, { method: "POST", body: JSON.stringify(docs.slice(i, i + 5000)) });
    await esperarTarefa(t.taskUid, `lote ${i / 5000 + 1}`);
    console.log(`  ${Math.min(i + 5000, docs.length)}/${docs.length}`);
  }

  console.log("trocando os índices (swap atômico)…");
  /* o swap exige os DOIS índices — na 1ª indexação o "imoveis" ainda não existe: cria vazio */
  await meili(`/indexes`, { method: "POST", body: JSON.stringify({ uid: IDX, primaryKey: "id" }) }).catch(() => null);
  const swap = await meili(`/swap-indexes`, { method: "POST", body: JSON.stringify([{ indexes: [IDX, IDX_NEW] }]) });
  await esperarTarefa(swap.taskUid, "swap");
  /* após o swap, o índice antigo (agora em IDX_NEW) é apagado — a próxima reindexação recria */
  await meili(`/indexes/${IDX_NEW}`, { method: "DELETE" }).catch(() => null);

  const stats = await meili(`/indexes/${IDX}/stats`);
  console.log(`pronto: ${stats.numberOfDocuments} documentos no índice ${IDX}`);
  await pool.end();
}

main().catch(async (e) => { console.error("indexar-busca FALHOU:", e.message); try { await pool.end(); } catch {} process.exit(1); });
