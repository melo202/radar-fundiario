// Índice de mercado por bairro (Mercado em Movimento 17/07) — o número que o mapa
// mostra sozinho. Núcleo puro testado sem banco: agrupamento, dedup, mediana e a
// honestidade dos limites (amostra pequena NÃO vira número).
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculaIndice, estimaDoIndice } from "../motor/indice-bairro.js";

const oferta = (over = {}) => ({ bairro: "Setor Bueno", tipo: "apartamento",
  price: 500000, area: 100, bedrooms: 3, completeness: 0.8, lat: null, lon: null,
  portal: "olx.com.br", url: "u" + Math.random(), ...over });

test("mediana de R$/m² por bairro+tipo, com grafias normalizadas juntas", () => {
  const idx = calculaIndice([
    oferta({ bairro: "Setor Bueno", price: 400000, area: 100, bedrooms: 2 }),   // 4.000/m²
    oferta({ bairro: "SET BUENO", price: 505000, area: 101, bedrooms: 3 }),     // 5.000/m²
    oferta({ bairro: "st. bueno", price: 720000, area: 120, bedrooms: 4 }),     // 6.000/m²
  ]);
  assert.equal(idx.length, 1, "grafias do mesmo bairro agregam numa entrada só");
  assert.equal(idx[0].bairro, "setor bueno");
  assert.equal(idx[0].n, 3);
  assert.equal(Math.round(idx[0].pm2Mediana), 5000);
});

test("o mesmo imóvel em dois portais conta UMA vez (dedup multi-sinal §5)", () => {
  const idx = calculaIndice([
    oferta({ portal: "olx.com.br", price: 500000, area: 90.4 }),
    oferta({ portal: "vivareal.com.br", price: 503000, area: 90.6, completeness: 0.6 }),
    oferta({ price: 800000, area: 200, bedrooms: 4 }),
  ]);
  assert.equal(idx[0].n, 2, "3 anúncios, 2 imóveis");
});

test("tipos não se misturam; sem preço ou área a oferta fica de fora", () => {
  const idx = calculaIndice([
    oferta(), oferta({ tipo: "casa", area: 200 }),
    oferta({ price: null }), oferta({ area: null }), oferta({ bairro: null }),
  ]);
  assert.deepEqual(idx.map(i => `${i.bairro}|${i.tipo}|${i.n}`).sort(),
    ["setor bueno|apartamento|1", "setor bueno|casa|1"]);
});

test("estimativa honesta: n<3 não sustenta número; n≥3 devolve valor, faixa e confiança", () => {
  const pouco = estimaDoIndice({ n: 2, pm2Mediana: 5000, pm2Q1: 4500, pm2Q3: 5500, completudeMedia: 0.8 }, 100);
  assert.equal(pouco.disponivel, false);
  assert.match(pouco.razao, /insuficiente/);

  const ok = estimaDoIndice({ n: 12, pm2Mediana: 5000, pm2Q1: 4500, pm2Q3: 5500, completudeMedia: 0.8 }, 100);
  assert.equal(ok.disponivel, true);
  assert.equal(ok.valorEstimado, 500000);
  assert.equal(ok.faixa.de, 450000);
  assert.equal(ok.faixa.ate, 550000);
  assert.ok(ok.confianca.rotulo, "confiança por regras declaradas, nunca % inventada");
  assert.ok(ok.confianca.fatores.some(f => /OFERTA/.test(f)), "rótulo honesto: ofertas, não transações");
});

test("sem entrada no índice: indisponível com razão, nunca palpite", () => {
  const r = estimaDoIndice(null, 100);
  assert.equal(r.disponivel, false);
  assert.ok(r.razao);
});
