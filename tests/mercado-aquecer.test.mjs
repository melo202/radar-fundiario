/* AQUEC-01 (roadmap v2 item 2.5, 20/07/2026): o planejador do aquecimento noturno é puro
   e deduplicado pela MESMA chave do cache do mercado-aovivo — carteira antes de funil. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planejarAquecimento } from "../motor/mercado-aquecer.js";
import { chaveDaPesquisa } from "../motor/mercado-aovivo.js";

const carteira = [
  { neighborhood: "Setor Bueno", property_type: "apartamento", characteristics: { areaM2: 82, bedrooms: 2 } },
  /* 80 m² cai na MESMA faixa de 25 m² que 82 — chave idêntica, não aquece duas vezes */
  { neighborhood: "Setor Bueno", property_type: "apartamento", characteristics: { areaM2: 80, bedrooms: 2 } },
  { neighborhood: "Jardim Goiás", property_type: "casa", characteristics: {} },
];
const funil = [
  { detail: { subject: { neighborhood: "Setor Oeste", propertyType: "apartamento", areaM2: 70, bedrooms: 2 } } },
  /* pedido repetido do mesmo perfil da carteira: deduplicado */
  { detail: { subject: { neighborhood: "Setor Bueno", propertyType: "apartamento", areaM2: 78, bedrooms: 2 } } },
  { detail: {} }, /* registro antigo sem subject (pré-AQUEC-01) nunca quebra o plano */
  { detail: { subject: { neighborhood: null, propertyType: "casa" } } }, /* incompleto: fora */
];

test("aquecimento: dedup pela chave do cache, carteira primeiro, teto respeitado", () => {
  const plano = planejarAquecimento(carteira, funil, 6);
  /* Jardim Goiás fica FORA: sem areaM2 não há estimativa (falha real da 1ª rodada 20/07) */
  assert.equal(plano.length, 2);
  assert.deepEqual(plano.map(s => s.neighborhood), ["Setor Bueno", "Setor Oeste"]);
  const chaves = plano.map(chaveDaPesquisa);
  assert.equal(new Set(chaves).size, chaves.length, "nenhuma chave repetida no plano");
  assert.equal(planejarAquecimento(carteira, funil, 2).length, 2, "teto corta o excedente");
  assert.deepEqual(planejarAquecimento([], [], 6), [], "sem carteira e sem funil = noite sem gasto");
});

test("aquecimento: subject da carteira sai no shape exato do clique do dossiê", () => {
  const [bueno] = planejarAquecimento(carteira, [], 1);
  assert.deepEqual(bueno, { neighborhood: "Setor Bueno", propertyType: "apartamento", areaM2: 82, bedrooms: 2 });
});
