// Geocoding CNEFE (§7) — a normalização é pura e testada direto; o restante por
// asserções de string, no padrão do repo. Casos tirados do arquivo REAL do IBGE
// (15/07/2026): "S 3" com espaço, "T 37", "135" em dígitos, "TRES" por extenso.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizaLogradouro, semAcento } from "../motor/normaliza-endereco.js";

test("normalização: as duas pontas (usuário e CNEFE) caem na mesma forma", () => {
  /* o caso real do usuário: "rua s3, 50" tem que achar "RUA S 3" do CNEFE */
  for (const entrada of ["s3", "S-3", "s 03", "Rua S-3", "RUA S 3", "rua s3"]) {
    assert.equal(normalizaLogradouro(entrada), "s 3", `entrada: ${entrada}`);
  }
  assert.equal(normalizaLogradouro("Avenida T-63"), "t 63");
  assert.equal(normalizaLogradouro("T 37"), "t 37");
  assert.equal(normalizaLogradouro("Rua C104"), "c 104");
});

test("normalização: número por extenso e dígitos convergem", () => {
  assert.equal(normalizaLogradouro("Rua Três"), "3");
  assert.equal(normalizaLogradouro("rua 3"), "3");
  assert.equal(normalizaLogradouro("Vinte e Um"), "21");
  assert.equal(normalizaLogradouro("cento e trinta e cinco"), "135");
  assert.equal(normalizaLogradouro("Rua 135"), "135");
  assert.equal(normalizaLogradouro("rua 035"), "35");
});

test("normalização: nome comum só perde tipo, acento e pontuação — nunca vira número", () => {
  assert.equal(normalizaLogradouro("Av. República do Líbano"), "republica do libano");
  assert.equal(normalizaLogradouro("Perimetral Norte"), "perimetral norte");
  assert.equal(normalizaLogradouro(""), "");
  assert.equal(normalizaLogradouro(null), "");
  assert.equal(semAcento("Goiânia"), "Goiania");
});

test("geocodificar declara precisão em degraus e nunca inventa coordenada", () => {
  const src = readFileSync(new URL("../motor/geocodificar.js", import.meta.url), "utf-8");
  assert.ok(src.includes('precisao: "numero"'));
  assert.ok(src.includes('"numero-proximo"'));
  assert.ok(src.includes('"logradouro"'));
  assert.ok(src.includes("distancia_numerica"), "número aproximado expõe a distância numérica");
  assert.ok(src.includes("CNEFE — IBGE, Censo Demográfico 2022"), "fonte declarada");
  assert.ok(src.includes("precisao: parecido.rowCount ? \"logradouro\" : null"), "vazio = null, sem invenção");
});

test("rota pública com rate limit próprio e loader espelha a normalização", () => {
  const server = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(server.includes('estourou(req, 30, "geocodificar")'));
  assert.ok(server.includes('"/motor/geocodificar"'));
  const py = readFileSync(new URL("../motor/gerar-enderecos.py", import.meta.url), "utf-8");
  /* espelho python precisa das mesmas regras-chave */
  assert.ok(py.includes("ESPELHO EXATO de motor/normaliza-endereco.js"));
  assert.ok(py.includes('re.fullmatch(r"([a-z]{1,3}) ?0*'));
  assert.ok(py.includes('"dezenove": 19'));
});
