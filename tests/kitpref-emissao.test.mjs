// Kit prefeitura completo — emissão server-side (20/08/2026).
// O contrato: (1) parsers puros extraem SÓ o que está na página (campo ausente -> null,
// nunca inventado); (2) CPF/CNPJ sai SEMPRE mascarado (LGPD — o PDF circula no WhatsApp);
// (3) página fora do formato (captcha, erro, mudança da prefeitura) -> null, nunca dado
// parcial disfarçado; (4) emitirKitPrefeitura é per-doc honesto: a falha de 1 documento
// não derruba os outros; (5) IPTU/TLP seguem como deep-link (SPA — o GET não resolve).
// FIXTURES SANITIZADAS: estrutura real das páginas, dados 100% fictícios — HTML real com
// nome/CPF de titular NUNCA entra no repositório.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  htmlTexto, pegaCampo, parseEspelho, parseCertidao, parseCnd, mascaraCpf, emitirKitPrefeitura,
  extrairDocTitular,
} from "../motor/kitpref-emissao.js";

/* fixtures mínimas no formato real (tabela label/valor com </td></tr> e \n entre células) */
const ESPELHO_FAKE = `<html><body>
<table>
  <tr>\n<td bgcolor="lightyellow" colspan="3"><font><b>Inscrição&nbsp;&nbsp;111.222.3334.444-5</b></td>\n<td align="right"><font><b>DADOS CADASTRAIS&nbsp;</b></td>\n</tr>
  <tr>\n<td bgcolor="lightyellow" colspan="6"><b>ENDEREÇO DO IMÓVEL</b></td>\n</tr>
  <tr>\n<td>Codg.Lograd</td>\n<td><b>9.999-9</b></td>\n<td>Logradouro</td>\n<td colspan="2"><b>R   FICTÍCIA</b></td>\n<td>Número&nbsp;&nbsp;&nbsp;<b>123</b></td>\n</tr>
  <tr>\n<td>Complemento</td>\n<td><b>CASA</b></td>\n<td>Quadra</td>\n<td colspan="2"><b>10</b>&nbsp;&nbsp;Lote&nbsp;&nbsp;&nbsp;<b>07</b></td>\n<td>Box&nbsp;&nbsp;&nbsp;<b></b></td>\n</tr>
  <tr>\n<td>Bairro</td>\n<td colspan="2"><b>SET FICTÍCIO</b></td>\n<td>Edificio</td>\n<td colspan="2"><b></b></td>\n</tr>
  <tr>\n<td bgcolor="lightyellow" colspan="6"><b>DADOS DO IMÓVEL</b></td>\n</tr>
  <tr>\n<td>Área Terreno</td>\n<td><b>300,00 m²</b></td>\n<td>Área Edificada</td>\n<td><b>120,00 m²</b></td>\n</tr>
  <tr>\n<td>Uso</td>\n<td><b>RESIDENC.</b></td>\n<td>Conservação</td>\n<td><b>BOA</b></td>\n</tr>
  <tr>\n<td>Pos. Fiscal</td>\n<td><b>NORMAL</b></td>\n<td>Matrícula</td>\n<td><b>999999</b></td>\n</tr>
</table></body></html>`;

const CERTIDAO_FAKE = `<html><body>
<b>CERTIDÃO DE DADOS CADASTRAIS DO IMÓVEL<br />NÚMERO DA CERTIDÃO:           1.111.111-1</b>
<b>Prazo de Validade: até  01/01/2027</b>
<tr class="dados_contribuinte"><td align="left">INSCRIÇÃO</td><td>:</td><td> 111.222.3334.4445</td></tr>
<tr class="dados_contribuinte"><td align="left">NOME</td><td>:</td><td> FULANO FICTÍCIO DE TESTE</td></tr>
<tr class="dados_contribuinte"><td align="left">CPF/CNPJ</td><td>:</td><td> 123.456.789-00</td></tr>
<tr class="dados_contribuinte"><td align="left">ENDEREÇO</td><td>:</td><td> R FICTÍCIA 123</td></tr>
<tr class="dados_contribuinte"><td align="left">TIPO</td><td>:</td><td> PREDIAL</td></tr>
<p> AREA TERRENO 300,00 M2, VALOR VENAL 250.000,00 . </p>
GOIANIA, 20 DE AGOSTO DE 2026 .
</body></html>`;

const CND_NEG = `<html><body>CERTIDÃO DE REGULARIDADE FISCAL IMOBILIÁRIA<BR>NEGATIVA DE DÉBITOS IMOBILIÁRIOS<br />
NÚMERO DA CERTIDÃO:           1.111.111-2
O prazo de validade da Certidão é de 90 (noventa) dias da data de sua emissão
GOIANIA(GO), 20 DE AGOSTO DE 2026</body></html>`;

const CND_POS = `<html><body>CERTIDÃO DE REGULARIDADE FISCAL IMOBILIÁRIA<BR>POSITIVA DE DÉBITOS IMOBILIÁRIOS<br />
NÚMERO DA CERTIDÃO:           1.111.111-3 GOIANIA(GO), 20 DE AGOSTO DE 2026</body></html>`;

test("parseEspelho: extrai endereço, Q/L, áreas, conservação e MATRÍCULA — ausente vira null", () => {
  const e = parseEspelho(ESPELHO_FAKE);
  assert.equal(e.inscricao, "111.222.3334.444-5");
  assert.equal(e.logradouro, "R   FICTÍCIA".replace(/ +/g, " ")); /* colapso de espaços do htmlTexto */
  assert.equal(e.numero, "123");
  assert.equal(e.quadra, "10");
  assert.equal(e.lote, "07");
  assert.equal(e.bairro, "SET FICTÍCIO");
  assert.equal(e.areaTerreno, "300,00 m²");
  assert.equal(e.matricula, "999999");
  assert.equal(e.conservacao, "BOA");
  assert.equal(e.edificio, null, "célula vazia -> null, nunca string vazia");
  assert.equal(e.pavimentos, null, "campo ausente -> null, nunca inventado");
});

test("parseEspelho: página fora do formato (captcha/erro) -> null, nunca dado parcial", () => {
  assert.equal(parseEspelho("<html><body>Informe o captcha</body></html>"), null);
  assert.equal(parseEspelho(""), null);
  assert.equal(parseEspelho(null), null);
});

test("parseCertidao: titular + CPF MASCARADO + valor venal + validade", () => {
  const c = parseCertidao(CERTIDAO_FAKE);
  assert.equal(c.numero, "1.111.111-1");
  assert.equal(c.validade, "01/01/2027");
  assert.equal(c.titular, "FULANO FICTÍCIO DE TESTE");
  assert.equal(c.cpfCnpj, "123.***.***-00", "CPF nunca sai inteiro — LGPD");
  assert.equal(c.valorVenal, "250.000,00");
  assert.equal(c.emitidaEm, "20 DE AGOSTO DE 2026");
});

test("mascaraCpf: CPF e CNPJ sempre parciais; vazio -> null", () => {
  assert.equal(mascaraCpf("961.471.051-91"), "961.***.***-91");
  assert.equal(mascaraCpf("12.345.678/0001-90"), "12.***.***/0001-**");
  assert.equal(mascaraCpf(""), null);
});

test("parseCnd: negativa e positiva lidas; formato estranho -> indeterminada ou null", () => {
  const n = parseCnd(CND_NEG);
  assert.equal(n.situacao, "negativa");
  assert.equal(n.numero, "1.111.111-2");
  assert.equal(n.validadeDias, 90);
  assert.equal(parseCnd(CND_POS).situacao, "positiva");
  const ind = parseCnd("<html><body>CERTIDÃO DE REGULARIDADE FISCAL IMOBILIÁRIA — conteúdo inesperado</body></html>");
  assert.equal(ind.situacao, "indeterminada", "leu a certidão mas não a situação -> nunca chuta");
  assert.equal(parseCnd("<html><body>erro</body></html>"), null);
});

test("htmlTexto/pegaCampo: células com \\n entre tags viram pares label/valor na mesma linha", () => {
  const L = htmlTexto("<table><tr>\n<td>Bairro</td>\n<td><b>CENTRO</b></td>\n</tr></table>");
  assert.equal(pegaCampo(L, "Bairro"), "CENTRO");
  assert.equal(pegaCampo(L, "Inexistente"), null);
});

test("emitirKitPrefeitura: per-doc honesto — a falha de 1 doc não derruba os outros", async () => {
  const paginas = new Map([
    ["siptu00020a0", ESPELHO_FAKE],
    ["sccer00202", CERTIDAO_FAKE],
    /* sccer00201 (CND) ausente -> fetch simula página fora do formato */
  ]);
  const fetchFake = async (url) => {
    /* a prefeitura responde Latin-1 — o fixture tem que ser LATIN-1 de verdade
       (TextEncoder seria UTF-8 e testaria outra coisa) */
    for (const [k, v] of paginas) {
      if (url.includes(k)) return { ok: true, arrayBuffer: async () => Buffer.from(v, "latin1").buffer };
    }
    return { ok: true, arrayBuffer: async () => Buffer.from("<html>pediu captcha</html>", "latin1").buffer };
  };
  const insc = "111222333" + String(Date.now() % 900000 + 100000); /* 15 dígitos, fura o cache de 12h */
  const kit = await emitirKitPrefeitura(insc, { fetchImpl: fetchFake });
  assert.equal(kit.ok, true);
  assert.equal(kit.docs.espelho.ok, true);
  assert.equal(kit.docs.espelho.dados.matricula, "999999");
  assert.equal(kit.docs.certidao.dados.titular, "FULANO FICTÍCIO DE TESTE");
  assert.equal(kit.docs.cnd.ok, false, "CND fora do formato -> erro honesto");
  assert.ok(kit.docs.cnd.erro.length > 10);
  assert.equal(kit.pendentes.length, 2, "IPTU e TLP seguem como deep-link (SPA)");
  assert.ok(kit.pendentes.every(p => /^https:\/\//.test(p.url)));
  /* CND estadual (25/08): o doc fictício da fixture tem DV INVÁLIDO de propósito —
     a SEFAZ nem é chamada, e o kit segue com doc honesto (nunca derruba os outros 3) */
  assert.equal(kit.docs.cndEstadual.ok, false);
  assert.match(kit.docs.cndEstadual.erro, /verificador/);
});

const XML_SEFAZ_FAKE = `<?xml version='1.0' encoding='ISO-8859-1'?><NWS><titulolin>CERTIDAO DE DEBITO INSCRITO EM DIVIDA ATIVA - NEGATIVA</titulolin><numerocert>90000002</numerocert><tipopessoa>PESSOA FISICA</tipopessoa><nomerazao>PESSOA FICTICIA DE TESTE</nomerazao><numerodoc>529.982.247-25</numerodoc><despacho>NAO CONSTA DEBITO</despacho></NWS>`;

test("extrairDocTitular: documento COMPLETO só existe server-side (pra CND estadual)", () => {
  assert.equal(extrairDocTitular(CERTIDAO_FAKE), "123.456.789-00");
  assert.equal(extrairDocTitular("<html>nada</html>"), null);
});

test("emitirKitPrefeitura: titular com DV válido -> 4º doc (CND estadual) emitido e MASCARADO", async () => {
  const certComCpfValido = CERTIDAO_FAKE.replace("123.456.789-00", "529.982.247-25"); /* CPF de exemplo clássico, DV válido */
  const fetchFake = async (url) => {
    if (url.includes("siptu00020a0")) return { ok: true, arrayBuffer: async () => Buffer.from(ESPELHO_FAKE, "latin1").buffer };
    if (url.includes("sccer00202")) return { ok: true, arrayBuffer: async () => Buffer.from(certComCpfValido, "latin1").buffer };
    if (url.includes("sccer00201")) return { ok: true, arrayBuffer: async () => Buffer.from(CND_NEG, "latin1").buffer };
    if (url.includes("sefaz.go.gov.br")) return { ok: true, arrayBuffer: async () => Buffer.from(XML_SEFAZ_FAKE, "latin1").buffer };
    return { ok: true, arrayBuffer: async () => Buffer.from("<html>pediu captcha</html>", "latin1").buffer };
  };
  const insc = "999888777" + String(Date.now() % 900000 + 100000);
  const kit = await emitirKitPrefeitura(insc, { fetchImpl: fetchFake });
  assert.equal(kit.docs.cndEstadual.ok, true, "CND estadual do titular é o 4º doc do kit");
  assert.equal(kit.docs.cndEstadual.situacao, "negativa");
  assert.equal(kit.docs.cndEstadual.documento, "529.***.***-25", "documento sempre mascarado");
  /* LGPD: o CPF completo NÃO vaza em NENHUMA parte do pacote (nem cache, nem docs) */
  const vazamento = JSON.stringify(kit);
  assert.ok(!vazamento.includes("52998224725") && !vazamento.includes("529.982.247-25"), "CPF completo NUNCA no pacote");
});

test("emitirKitPrefeitura: inscrição inválida -> ok:false (mesma régua de linksPrefeitura)", async () => {
  assert.equal((await emitirKitPrefeitura("12")).ok, false);
  assert.equal((await emitirKitPrefeitura("")).ok, false);
  assert.equal((await emitirKitPrefeitura(null)).ok, false);
});

test("rota /motor/kitpref existe no server com rate limit", () => {
  const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(srv.includes('req.url.startsWith("/motor/kitpref")'), "rota ausente");
  assert.ok(srv.includes('estourou(req, 10, "kitpref")'), "sem rate limit a prefeitura vira alvo de abuso");
  assert.ok(srv.includes('emitirKitPrefeitura'), "rota deve chamar a emissão");
});

test("CND estadual (25/08): rotas server + painel e card do painel existem e são protegidos", () => {
  const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(srv.includes('req.url === "/motor/cnd-estadual"'), "rota pública ausente");
  assert.ok(srv.includes('estourou(req, 10, "cnd-estadual")'), "sem rate limit a SEFAZ vira alvo de abuso");
  const pnl = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
  assert.ok(pnl.includes('req.url === "/painel/api/cnd-estadual"'), "rota do painel ausente (uso exclusivo do Bruno)");
  const html = readFileSync(new URL("../motor/painel.html", import.meta.url), "utf-8");
  assert.ok(html.includes('id="formCndEst"'), "card de emissão ausente do painel");
  assert.ok(html.includes('id="cndDoc"'), "campo de CPF/CNPJ ausente");
  /* o Raio-X mostra o 4º documento do kit */
  const app = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(app.includes("cndEstadual"), "Raio-X sem a linha da CND estadual do titular");
  assert.ok(app.includes("CND estadual do titular"), "rótulo do 4º doc ausente no Raio-X");
});
