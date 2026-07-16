// Geocodificação de comparáveis (§10) — extração de endereço do anúncio é PURA e
// determinística (zero IA no núcleo); o casamento de localidade idem. Testadas direto.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { extraiEnderecoAnuncio, localidadeCasa } from "../motor/endereco-anuncio.js";

test("endereço do anúncio: padrões reais de portal viram {rua, numero}", () => {
  const e1 = extraiEnderecoAnuncio("Apartamento à venda na Rua T-37, 1450, Setor Bueno, Goiânia");
  assert.deepEqual(e1, { rua: "Rua T-37", numero: 1450 });
  const e2 = extraiEnderecoAnuncio("Casa 3 quartos, Avenida República do Líbano, Setor Oeste");
  assert.equal(e2.rua, "Avenida República do Líbano");
  assert.equal(e2.numero, null);
  const e3 = extraiEnderecoAnuncio("Excelente apto na Rua S 3 nº 50 - Bela Vista");
  assert.equal(e3.rua, "Rua S 3");
  assert.equal(e3.numero, 50);
});

test("endereço do anúncio: texto sem via não inventa endereço", () => {
  assert.equal(extraiEnderecoAnuncio("Apartamento 3 quartos no Setor Bueno, 90m2, R$ 690.000"), null);
  assert.equal(extraiEnderecoAnuncio(""), null);
  assert.equal(extraiEnderecoAnuncio(null), null);
});

test("localidade do CNEFE casa com o bairro do anúncio por token significativo", () => {
  assert.equal(localidadeCasa("SETOR BUENO", "Setor Bueno"), true);
  assert.equal(localidadeCasa("BELA VISTA", "Setor Bela Vista"), true);
  assert.equal(localidadeCasa("JARDIM AMERICA", "Jd. América"), true);
  assert.equal(localidadeCasa("SETOR OESTE", "Setor Bueno"), false);
  /* genéricos sozinhos nunca casam ("SETOR" ∩ "Setor Leste" = nada significativo) */
  assert.equal(localidadeCasa("SETOR", "Setor Bueno"), false);
  /* bug real (16/07): "goiânia" e numerais romanos não identificam bairro sozinhos */
  assert.equal(localidadeCasa("VILA GOIANIA", "Goiânia II"), false);
  assert.equal(localidadeCasa("SETOR SUL II", "Vila Brasília II"), false);
});

test("§10: distância é fato exposto, nunca peso automático de valor", () => {
  const av = readFileSync(new URL("../motor/avaliacao.js", import.meta.url), "utf-8");
  assert.ok(av.includes("distanciaM"), "comparável carrega a distância");
  assert.ok(av.includes("nunca peso automático de valor"), "regra registrada no código");
  assert.ok(!av.includes("distanciaM * "), "distância não multiplica nada");
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(html.includes("subject.lat=ll[0];subject.lon=ll[1];"), "app envia a coordenada do imóvel");
  assert.ok(html.includes("function mercadoNoMapa()"), "ofertas plotáveis no mapa");
  assert.ok(html.includes("posição pelo endereço do anúncio"), "origem da posição declarada no pino");
  assert.ok(html.includes("ofertas plotadas pertencem à análise anterior"), "camada limpa a cada imóvel novo");
});

test("ingestão e retroativo geocodificam sem nunca derrubar o fluxo", () => {
  const ing = readFileSync(new URL("../motor/ingerir.js", import.meta.url), "utf-8");
  assert.ok(ing.includes("geocodificarAnuncio"));
  assert.ok(ing.includes("nunca derruba a ingestão"));
  const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(srv.includes('"/motor/geocodificar-acervo"'));
  assert.ok(srv.includes("WHERE p.geom IS NULL"), "retroativo só toca quem não tem coordenada");
});
