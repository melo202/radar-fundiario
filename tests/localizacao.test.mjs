// Inteligência de Localização (MVP) — camada de categorias própria (spec §7/§8) é pura
// e testada direto; o card do app é travado por asserções de string.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaDeTags, RAIOS_M, SINAL, ROTULO } from "../motor/categorias.js";

test("categorias: tags do OSM viram categorias internas, nunca expostas cruas", () => {
  assert.equal(categoriaDeTags({ shop: "supermarket" }), "supermarket");
  assert.equal(categoriaDeTags({ amenity: "kindergarten" }), "daycare");
  assert.equal(categoriaDeTags({ amenity: "fast_food" }), "restaurant");
  assert.equal(categoriaDeTags({ leisure: "fitness_centre" }), "gym");
  assert.equal(categoriaDeTags({ amenity: "nightclub" }), "nightlife");
  assert.equal(categoriaDeTags({ landuse: "cemetery" }), "cemetery");
  assert.equal(categoriaDeTags({ shop: "car_repair" }), null, "tag sem mapeamento = fora, nunca inventa");
  assert.equal(categoriaDeTags(null), null);
});

test("raios são POR CATEGORIA (§8): padaria curto, hospital largo — nunca um raio único", () => {
  assert.ok(RAIOS_M.bakery < RAIOS_M.supermarket);
  assert.ok(RAIOS_M.supermarket < RAIOS_M.school);
  assert.ok(RAIOS_M.school < RAIOS_M.hospital);
  assert.equal(new Set(Object.values(RAIOS_M)).size > 3, true, "vários raios distintos");
  /* toda categoria tem raio e rótulo humano */
  for (const c of Object.keys(RAIOS_M)) assert.ok(ROTULO[c], `sem rótulo: ${c}`);
});

test("externalidades marcadas como atenção, sem julgamento automático de valor", () => {
  for (const c of ["nightlife", "industrial_area", "cemetery", "fuel_station"]) {
    assert.equal(SINAL[c], "atencao");
  }
  assert.equal(SINAL.park, undefined, "amenidade positiva não leva marca");
});

test("resumo por IA: <think> do qwen remoto nunca vaza e a prosa não inventa juízo", () => {
  const provider = readFileSync(new URL("../motor/ai-provider.js", import.meta.url), "utf-8");
  /* bug real de produção: qwen3-32b no Groq devolve <think></think> vazio mesmo com
     /no_think — o provedor tem que remover o bloco antes de qualquer uso do texto */
  assert.ok(provider.includes('text.replace(/<think>[\\s\\S]*?<\\/think>/g, "").trim()'));
  const resumo = readFileSync(new URL("../motor/resumo-entorno.js", import.meta.url), "utf-8");
  assert.ok(resumo.includes('Não qualifique quantidades das categorias de atenção'));
  assert.ok(resumo.includes('Não diga que o mapeamento é "completo"'));
  /* categoria zerada é filtrada ANTES do prompt — a IA nunca vê o que não existe */
  assert.ok(resumo.includes('.filter(([, x]) => x.count > 0)'));
});

test("card Localização no app: honesto, com ODbL e degradação explicada", () => {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(html.includes('id="dLocal"'));
  assert.ok(html.includes('onclick="analisarLocal()"'));
  assert.match(html, /fetch\(`\$\{MOTOR_BASE\}\/motor\/localizacao\?lat=/);
  assert.ok(html.includes("© OpenStreetMap contributors"), "atribuição ODbL obrigatória");
  assert.ok(html.includes("sem o ponto não há entorno para medir"));
  assert.ok(html.includes("Não é avaliação de segurança nem de perfil de moradores."));
  assert.ok(html.includes("localReset(a,ll);"));
  /* bug real (15/07): pick() manda ARRAY e o card lia objeto — a normalização aceita os dois */
  assert.ok(html.includes("if(Array.isArray(ll)&&isFinite(+ll[0])&&isFinite(+ll[1]))p={lat:+ll[0],lng:+ll[1]};"));
  assert.ok(html.includes("a.x_coord&&a.y_coord){try{const w=toWGS(+a.x_coord,+a.y_coord)"), "fallback usa os campos REAIS do cadastro");
});
