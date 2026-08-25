// Reparo de mojibake das certidões da prefeitura (25/08/2026).
// Diagnóstico ao vivo: sccer00201w0/sccer00202w0 servem o GET com UTF-8 contendo
// U+FFFD no lugar de CADA acento (a prefeitura corrompeu o template na fonte) e
// sem charset — o navegador mostrava "CERTID¿½O". O motor repara e serve legível.
// FIXTURES 100% fictícias: só palavras do TEMPLATE oficial — nunca dado de titular.
import { test } from "node:test";
import assert from "node:assert/strict";
import { repararMojibake, decodificarPrefeitura } from "../motor/mojibake-prefeitura.js";
import { prepararPagina, servirDocPrefeitura } from "../motor/prefeitura-doc.js";

const F = "�"; /* U+FFFD */

/* ---------------- repararMojibake: dicionário ---------------- */

test("dicionário repara as palavras do template oficial", () => {
  assert.equal(repararMojibake(`CERTID${F}O DE REGULARIDADE FISCAL`), "CERTIDÃO DE REGULARIDADE FISCAL");
  assert.equal(repararMojibake(`Goi${F}nia`), "Goiânia");
  assert.equal(repararMojibake(`GOI${F}NIA`), "GOIÂNIA");
  assert.equal(repararMojibake(`inscri${F}${F}o`), "inscrição");
  assert.equal(repararMojibake(`INSCRI${F}${F}O`), "INSCRIÇÃO");
  assert.equal(repararMojibake(`at${F} 90 dias`), "até 90 dias");
  assert.equal(repararMojibake(`DEVER${F} SER`), "DEVERÁ SER");
  assert.equal(repararMojibake(`n${F} 123`), "nº 123");
  assert.equal(repararMojibake(`ENDERE${F}O`), "ENDEREÇO");
  assert.equal(repararMojibake(`D${F}BITOS`), "DÉBITOS");
  assert.equal(repararMojibake(`Certid${F}o`), "Certidão");
});

test("regras genéricas de sufixo cobrem palavras fora do dicionário", () => {
  assert.equal(repararMojibake(`situa${F}${F}o`), "situação");      /* ��o -> ção */
  assert.equal(repararMojibake(`SITUA${F}${F}O`), "SITUAÇÃO");
  assert.equal(repararMojibake(`rela${F}${F}es`), "relações");      /* ��es -> ções */
  assert.equal(repararMojibake(`op${F}${F}o`), "opção");            /* via dicionário? não — genérica ��o */
  assert.equal(repararMojibake(`irm${F}o`), "irmão");               /* �o final -> ão */
  assert.equal(repararMojibake(`estar${F}`), "estará");             /* r� final -> rá */
});

test("desconhecida fica com o caractere visível — nunca inventa", () => {
  assert.equal(repararMojibake(`xy${F}zw`), `xy${F}zw`);
});

test("isolado vira é/É conforme o caso da palavra anterior", () => {
  assert.equal(repararMojibake(`ESTA CERTID${F}O ${F} GRATUITA`), "ESTA CERTIDÃO É GRATUITA");
  assert.equal(repararMojibake(`a Certid${F}o ${F} de 90`), "a Certidão é de 90");
});

test("ordinal quebrado depois de dígito vira º (parágrafo 1º, artigo 7º)", () => {
  assert.equal(repararMojibake(`parágrafo 1${F}, inciso I, e parágrafo 2${F} e 7${F}`),
    "parágrafo 1º, inciso I, e parágrafo 2º e 7º");
});

test("texto sem U+FFFD passa intacto", () => {
  assert.equal(repararMojibake("Certidão já correta"), "Certidão já correta");
});

/* ---------------- decodificarPrefeitura ---------------- */

test("Latin-1 clássico decodifica certo (espelho siptu)", () => {
  const buf = Buffer.from("Certidão de Goiânia", "latin1");
  assert.equal(decodificarPrefeitura(buf), "Certidão de Goiânia");
});

test("UTF-8 com U+FFFD passa pelo reparo (sccer w0)", () => {
  const buf = Buffer.from(`CERTID${F}O — GOI${F}NIA`, "utf8");
  assert.equal(decodificarPrefeitura(buf), "CERTIDÃO — GOIÂNIA");
});

test("UTF-8 limpo (sem U+FFFD) passa direto", () => {
  const buf = Buffer.from("Página UTF-8 correta", "utf8");
  assert.equal(decodificarPrefeitura(buf), "Página UTF-8 correta");
});

/* ---------------- prepararPagina ---------------- */

test("injeta meta charset e base após o <head>", () => {
  const saida = prepararPagina(`<html><head><title>CERTID${F}O</title></head><body>x</body></html>`,
    "https://www.goiania.go.gov.br/sistemas/sccer/asp/");
  assert.match(saida, /<head><meta charset="utf-8"><base href="https:\/\/www\.goiania\.go\.gov\.br\/sistemas\/sccer\/asp\/" target="_blank">/);
});

test("sem <head>, a injeção vai no início", () => {
  const saida = prepararPagina("<p>doc</p>", "https://x/");
  assert.ok(saida.startsWith('<meta charset="utf-8"><base href="https://x/"'));
});

/* ---------------- servirDocPrefeitura ---------------- */

const CND_FAKE_BYTES = Buffer.from(
  `<html><head><title></title></head><body>CERTID${F}O DE REGULARIDADE FISCAL IMOBILI${F}RIA — GOI${F}NIA</body></html>`,
  "utf8");

function fetchFake(bytes = CND_FAKE_BYTES, status = 200) {
  return async () => ({
    ok: status === 200, status,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
}

test("serve a certidão reparada, sem U+FFFD e sem mojibake", async () => {
  const r = await servirDocPrefeitura("cnd", "111.222.3334.444-5", { fetchImpl: fetchFake() });
  assert.equal(r.ok, true);
  assert.match(r.html, /CERTIDÃO DE REGULARIDADE FISCAL IMOBILIÁRIA — GOIÂNIA/);
  assert.ok(!r.html.includes(F));
  assert.match(r.html, /<meta charset="utf-8">/);
});

test("cache: segunda chamada do mesmo doc não volta à prefeitura", async () => {
  let chamadas = 0;
  const contador = async () => { chamadas++; return fetchFake()(); };
  const insc = "999.888.7776.666-5";
  await servirDocPrefeitura("cnd", insc, { fetchImpl: contador });
  const r2 = await servirDocPrefeitura("cnd", insc, { fetchImpl: contador });
  assert.equal(r2.cache, true);
  assert.equal(chamadas, 1);
});

test("tipo ou inscrição inválidos -> 400 honesto", async () => {
  assert.equal((await servirDocPrefeitura("xyz", "11122233344445", { fetchImpl: fetchFake() })).status, 400);
  assert.equal((await servirDocPrefeitura("cnd", "123", { fetchImpl: fetchFake() })).status, 400);
});

test("prefeitura fora -> 502 honesto, nunca página quebrada", async () => {
  /* inscrição nova (o cache é por tipo+insc — não pode herdar o hit do teste de sucesso) */
  const r = await servirDocPrefeitura("cnd", "555.444.3332.222-1", { fetchImpl: fetchFake(CND_FAKE_BYTES, 500) });
  assert.equal(r.ok, false);
  assert.equal(r.status, 502);
  assert.match(r.erro, /HTTP 500/);
});
