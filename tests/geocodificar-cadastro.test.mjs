// GEOCODIFICAR-CADASTRO (P0.3, 20/08/2026) — degraus novos e determinísticos apoiados no
// espelho do cadastro municipal: normalização de rua no formato do espelho (letra+número
// COLADOS), extração de nome de condomínio do texto e a regex de separador "·" que estava
// derrubando padrões reais de portal ("Rua T 71 · Setor Bueno"). Sem rede, sem banco.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normRuaEspelho, normEdificio, extraiCondominioAnuncio } from "../motor/geocodificar-cadastro.js";
import { extraiEnderecoAnuncio } from "../motor/endereco-anuncio.js";

test("normRuaEspelho: letra+número COLADOS como o cadastro grava", () => {
  assert.equal(normRuaEspelho("Rua T 71"), "T71");
  assert.equal(normRuaEspelho("Rua T-63"), "T63");
  assert.equal(normRuaEspelho("av t63"), "T63");
  assert.equal(normRuaEspelho("Avenida Portugal"), "PORTUGAL");
  assert.equal(normRuaEspelho("Rua 135"), "135");
  assert.equal(normRuaEspelho("Rua Cento e Trinta e Cinco"), "135");
  assert.equal(normRuaEspelho("Rua Manaus"), "MANAUS");
  assert.equal(normRuaEspelho("Rua 16A"), "16A");
  assert.equal(normRuaEspelho(""), "");
});

test("normEdificio: sem acento, maiúsculo, sem prefixos ED./COND./RES.", () => {
  assert.equal(normEdificio("Ed. Solar das Palmeiras"), "SOLAR DAS PALMEIRAS");
  assert.equal(normEdificio("Condomínio Fazenda Criméia Caveiras"), "FAZENDA CRIMEIA CAVEIRAS");
  assert.equal(normEdificio("Residencial Ville de France"), "VILLE DE FRANCE");
  assert.equal(normEdificio("ED RES ESSENCIALLE STYLE"), "ESSENCIALLE STYLE");
  assert.equal(normEdificio("ODISSEIA"), "ODISSEIA");
});

test("extraiCondominioAnuncio: prefixos reais de anúncio, parando em separador", () => {
  assert.equal(extraiCondominioAnuncio("Apto no Ed. Solar das Palmeiras, Setor Bueno, 90m²"), "Solar das Palmeiras");
  assert.equal(extraiCondominioAnuncio("Fazenda Criméia Caveiras, Goiânia/GO · 41m² · Cond. não informado"), null); /* sem prefixo não arrisca */
  assert.equal(extraiCondominioAnuncio("Cobertura no Condomínio Terra Mundi Parque Cascavel - Aparecida"), "Terra Mundi Parque Cascavel");
  assert.equal(extraiCondominioAnuncio("Residencial Ville de France · 3 quartos"), "Ville de France");
  assert.equal(extraiCondominioAnuncio("Apartamento 2 quartos no Setor Sul"), null);
  assert.equal(extraiCondominioAnuncio(""), null);
});

test("backfill em massa: requalifica antes, pula páginas-lista, registra auditoria", () => {
  const src = readFileSync(new URL("../motor/geocodificar-acervo.js", import.meta.url), "utf-8");
  assert.ok(src.includes("requalificarAcervo"), "passo 1 = requalificar (flag isCatalogPage fresca)");
  assert.ok(src.includes("isCatalogPage')::boolean IS NOT TRUE"), "página-lista nunca ganha pino");
  assert.ok(src.includes("geocodificacao-massa"), "estatística registrada em audit_log");
});

test("degrau bairro: último da cadeia, confiança 0.2 declarada, pino aproximado no front", () => {
  const geo = readFileSync(new URL("../motor/geo-anuncio.js", import.meta.url), "utf-8");
  assert.ok(geo.includes('"bairro": 0.2'), "confiança do centroide de bairro é 0.2");
  assert.ok(geo.indexOf("geocodificarCondominio") < geo.indexOf("geocodificarBairro"),
    "bairro é o ÚLTIMO degrau (nunca rouba um match mais preciso)");
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(html.includes("posição aproximada: centro do bairro"), "pino de bairro se declara no tooltip");
  assert.ok(html.includes('dashArray:aprox?"3":null'), "pino de bairro é tracejado (nunca disfarçado de exato)");
});

test("extração de endereço: separadores reais de portal (·, •, |) não quebram mais", () => {
  /* "Rua T 71" sem vírgula/nº = a RUA T-71 (letra-número de Goiânia), não rua T nº 71 */
  const e1 = extraiEnderecoAnuncio("A partir de · Rua T 71 · Setor Bueno, Goiânia/GO · 144m²");
  assert.deepEqual(e1, { rua: "Rua T 71", numero: null });
  const e2 = extraiEnderecoAnuncio("Casa na Rua V | Conjunto Vera Cruz | 200m²");
  assert.equal(e2.rua, "Rua V");
  const e3 = extraiEnderecoAnuncio("Apto Rua C 104 • Jardim América • 2 vagas");
  assert.deepEqual(e3, { rua: "Rua C 104", numero: null });
  /* com vírgula ou nº explícito, o número continua número */
  assert.deepEqual(extraiEnderecoAnuncio("Casa na Rua T, 71, Setor Bueno"), { rua: "Rua T", numero: 71 });
  assert.equal(extraiEnderecoAnuncio("Excelente apto na Rua S 3 nº 50 - Bela Vista").numero, 50);
});
