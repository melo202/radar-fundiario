// Núcleo estatístico do motor (§8/§9/§12/§13) — módulo puro, testado direto na suíte.
// A regra de ouro: a IA nunca toca nestes números; se estes testes passam, o valor
// que sai do motor é reproduzível.
import { test } from "node:test";
import assert from "node:assert/strict";
import { quantil, resumo, cercaTukey, normalizaBairro, dedupLeve, pesoComparavel, mediaPonderada, confianca } from "../motor/estatistica.js";

test("quantil e resumo: mediana e quartis com interpolação linear", () => {
  assert.equal(quantil([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(quantil([1, 2, 3, 4], 0.5), 2.5);
  const r = resumo([100, 200, 300, 400, 1000]);
  assert.equal(r.n, 5);
  assert.equal(r.mediana, 300);
  assert.ok(r.q1 < r.mediana && r.mediana < r.q3);
});

test("cerca de Tukey pega o outlier de pm² e deixa o resto", () => {
  const pm2s = [6500, 6800, 7000, 7100, 7300, 7500, 30000];
  const cerca = cercaTukey(resumo(pm2s));
  assert.ok(30000 > cerca.sup, "30 mil/m² tem que cair fora da cerca");
  assert.ok(6500 >= cerca.inf, "6,5 mil/m² tem que ficar dentro");
});

test("normalizaBairro unifica grafias de portal", () => {
  assert.equal(normalizaBairro("St. Bueno"), "setor bueno");
  assert.equal(normalizaBairro("SETOR BUENO"), "setor bueno");
  assert.equal(normalizaBairro("Jd. América"), "jardim america");
  assert.equal(normalizaBairro("Pq Amazônia"), "parque amazonia");
});

test("dedup leve agrupa o mesmo imóvel em portais diferentes e fica com o mais completo", () => {
  const { principais, duplicados } = dedupLeve([
    { id: "a", bedrooms: 3, area: 89, price: 690000, completeness: 0.6 },
    { id: "b", bedrooms: 3, area: 89, price: 692000, completeness: 0.9 }, /* mesmo balde de 5k */
    { id: "c", bedrooms: 2, area: 55, price: 365000, completeness: 0.7 },
  ]);
  assert.equal(principais.length, 2);
  assert.equal(duplicados.length, 1);
  assert.ok(principais.find(p => p.id === "b"), "vence o registro mais completo");
});

test("peso multiplicativo pune área distante e tipologia diferente, nunca zera por recência", () => {
  const subject = { areaM2: 90, bedrooms: 3 };
  const igual = pesoComparavel(subject, { area: 90, bedrooms: 3, completeness: 1, collectedAt: new Date().toISOString() });
  const longe = pesoComparavel(subject, { area: 178, bedrooms: 1, completeness: 0.2, collectedAt: new Date(Date.now() - 200 * 86400000).toISOString() });
  assert.ok(igual.peso > 0.95);
  assert.ok(longe.peso < 0.25);
  assert.ok(longe.fatores.recencia >= 0.6, "recência tem piso, não zera comparável antigo");
});

test("média ponderada e confiança seguem as regras declaradas do §13", () => {
  assert.equal(mediaPonderada([{ v: 100, peso: 1 }, { v: 200, peso: 3 }]), 175);
  assert.equal(confianca({ n: 16, dispersaoRelativa: 0.2, completudeMedia: 0.7 }).rotulo, "alta");
  assert.equal(confianca({ n: 11, dispersaoRelativa: 0.4, completudeMedia: 0.4 }).rotulo, "moderada");
  assert.equal(confianca({ n: 6, dispersaoRelativa: 0.8, completudeMedia: 0.3 }).rotulo, "baixa");
  assert.equal(confianca({ n: 3, dispersaoRelativa: 0.2, completudeMedia: 0.9 }).rotulo, "muito baixa");
  const c = confianca({ n: 10, dispersaoRelativa: 0.3, completudeMedia: 0.5 });
  assert.ok(c.fatores.some(f => f.includes("OFERTA")), "a limitação oferta≠transação é sempre declarada");
});
