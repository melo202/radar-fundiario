/* Cadeia de busca (21/07/2026): a cota do Brave esgotou no mega e o upgrade não saiu —
   a fonte A vira CADEIA (padrão da casa, igual à IA): Google CSE grátis 100/dia como
   degrau 1, Brave como reserva. Cota estourada = cooldown e desce; nunca mais um 402
   de fornecedor único para a varredura. Continua SEM scraping de portal (MOTOR-PRECO §C). */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapGoogle, mapBrave, cadeiaDisponivel } from "../motor/busca-web.js";

const src = readFileSync(new URL("../motor/busca-web.js", import.meta.url), "utf-8");
const deploy = readFileSync(new URL("../motor/deploy-api.sh", import.meta.url), "utf-8");

test("contrato dos mapeadores: os dois degraus devolvem o MESMO shape que o funil consome", () => {
  const g = mapGoogle({ items: [
    { link: "https://www.zapimoveis.com.br/imovel/x", title: "Apto Setor Bueno", snippet: "R$ 500.000, 80 m²" },
    { link: "https://portal.com/y", title: "", snippet: "" }, /* sem texto = fora */
  ] });
  assert.deepEqual(g, [{ url: "https://www.zapimoveis.com.br/imovel/x", titulo: "Apto Setor Bueno",
    descricao: "R$ 500.000, 80 m²", portal: "zapimoveis.com.br" }]);
  const b = mapBrave({ web: { results: [
    { url: "https://www.olx.com.br/z", title: "Casa Jardim América", description: "R$ 900 mil" },
  ] } });
  assert.deepEqual(b, [{ url: "https://www.olx.com.br/z", titulo: "Casa Jardim América",
    descricao: "R$ 900 mil", portal: "olx.com.br" }]);
});

test("cadeia: Google primeiro quando configurado; sem GOOGLE_CSE_* opera só com Brave", () => {
  const antes = { k: process.env.GOOGLE_CSE_KEY, c: process.env.GOOGLE_CSE_CX, b: process.env.BRAVE_API_KEY };
  try {
    process.env.GOOGLE_CSE_KEY = "k"; process.env.GOOGLE_CSE_CX = "c"; process.env.BRAVE_API_KEY = "b";
    assert.deepEqual(cadeiaDisponivel(), ["google", "brave"], "Google (100/dia grátis) é o degrau 1");
    delete process.env.GOOGLE_CSE_KEY; delete process.env.GOOGLE_CSE_CX;
    assert.deepEqual(cadeiaDisponivel(), ["brave"], "compatível com o env de ontem");
  } finally {
    for (const [k, v] of [["GOOGLE_CSE_KEY", antes.k], ["GOOGLE_CSE_CX", antes.c], ["BRAVE_API_KEY", antes.b]])
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

test("cooldowns honestos por tipo de cota: Brave 402 = mês (24h), Google 429/403 = dia (2h)", () => {
  assert.ok(src.includes('esfriar("brave", 24 * 3600 * 1000)'), "402 = cota mensal morta");
  assert.ok(src.includes('esfriar("google", 2 * 3600 * 1000)'), "429/403 = cota diária; renova sozinha");
  assert.ok(src.includes("if (emCooldown(p)) continue;"), "degrau esfriado é pulado, não martelado");
  assert.ok(src.includes("todos os degraus em cooldown"), "cadeia toda morta tem erro próprio (a varredura aborta nele)");
  assert.ok(src.includes("não fazemos scraping dos portais"), "regra da fonte A preservada");
  assert.ok(deploy.includes("node --check busca-web.js"), "deploy valida a cadeia");
});
