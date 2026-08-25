// CND-ESTADUAL (25/08/2026) — parser do XML da SEFAZ-GO + validação de DV + fluxo da
// emissão com fetch injetado (sem rede). Fixtures SANITIZADAS: estrutura real da
// resposta, dados fictícios (CNPJ de exemplo com DV recalculado, nunca pessoa real — LGPD).
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarDocumento, mascaraDoc, parseCndEstadualXml, emitirCndEstadual } from "../motor/cnd-estadual.js";

/* ---------- validarDocumento (DV oficial) ---------- */

test("documento: CNPJ com DV correto passa (tipo 2)", () => {
  /* 12.345.678/0001-95 é o CNPJ de exemplo clássico com DV válido */
  assert.deepEqual(validarDocumento("12.345.678/0001-95"), { tipo: 2, numero: "12345678000195" });
});

test("documento: CPF com DV correto passa (tipo 1)", () => {
  /* 529.982.247-25 é o CPF de exemplo clássico com DV válido */
  assert.deepEqual(validarDocumento("529.982.247-25"), { tipo: 1, numero: "52998224725" });
});

test("documento: DV errado, sequência repetida e tamanho estranho são rejeitados", () => {
  assert.equal(validarDocumento("12.345.678/0001-90"), null, "DV de CNPJ errado");
  assert.equal(validarDocumento("529.982.247-21"), null, "DV de CPF errado");
  assert.equal(validarDocumento("111.111.111-11"), null, "sequência repetida não é documento");
  assert.equal(validarDocumento("123"), null, "tamanho inválido");
});

test("máscara LGPD: CPF e CNPJ nunca voltam completos", () => {
  assert.equal(mascaraDoc("52998224725"), "529.***.***-25");
  assert.equal(mascaraDoc("12345678000195"), "12.***.***/0001-**");
});

/* ---------- parseCndEstadualXml (fixtures sanitizadas) ---------- */

const XML_NEGATIVA = `<?xml version='1.0' encoding='ISO-8859-1' standalone='no'?><NWS><servico>FAINCE90</servico><titulolin>CERTIDAO DE DEBITO INSCRITO EM DIVIDA ATIVA - NEGATIVA</titulolin><numerocert>90000001</numerocert><tipopessoa>PESSOA JURIDICA</tipopessoa><descdoc>CNPJ</descdoc><nomecontri></nomecontri><nomerazao>EMPRESA EXEMPLO FICTICIA LTDA</nomerazao><numerodoc>12.345.678/0001-95</numerodoc><despacho>NAO CONSTA DEBITO</despacho><despacho></despacho><linauto>:.*:.*:.*</linauto></NWS>`;

const XML_ERRO = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no" ?><nws><HttpStatusCode>400</HttpStatusCode><Category>Erro</Category><Code>400</Code><Description>OCORREU O ERRO:6 CNPJ INVALIDO!</Description></nws>`;

test("parse: NEGATIVA estruturada — situação, número, titular, doc mascarado, validade", () => {
  const d = parseCndEstadualXml(XML_NEGATIVA);
  assert.equal(d.ok, true);
  assert.equal(d.situacao, "negativa");
  assert.equal(d.numero, "90000001");
  assert.equal(d.titular, "EMPRESA EXEMPLO FICTICIA LTDA");
  assert.equal(d.documento, "12.***.***/0001-**", "documento sempre mascarado");
  assert.equal(d.despacho, "NAO CONSTA DEBITO");
  assert.equal(d.validadeDias, 120);
});

test("parse: placeholder 'VALIDA PARA O CNPJ...' da SEFAZ NÃO vira nome de titular", () => {
  const d = parseCndEstadualXml(XML_NEGATIVA.replace("EMPRESA EXEMPLO FICTICIA LTDA", "VALIDA PARA O CNPJ INFORMADO NESTE DOCUMENTO"));
  assert.equal(d.titular, null);
});

test("parse: POSITIVA COM EFEITO DE NEGATIVA tem situação própria (ordem importa)", () => {
  const d = parseCndEstadualXml(XML_NEGATIVA.replace(" - NEGATIVA", " - POSITIVA COM EFEITO DE NEGATIVA"));
  assert.equal(d.situacao, "positiva_com_efeito");
});

test("parse: XML de erro da SEFAZ vira {ok:false} com a mensagem limpa", () => {
  const d = parseCndEstadualXml(XML_ERRO);
  assert.equal(d.ok, false);
  assert.equal(d.erro, "CNPJ INVALIDO");
});

test("parse: formato desconhecido -> null (honesto, nunca inventa certidão)", () => {
  assert.equal(parseCndEstadualXml("<html>manutenção</html>"), null);
});

/* ---------- emitirCndEstadual (fetch injetado, sem rede) ---------- */

const respOk = (xml) => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(xml).buffer });

test("emissão: DV inválido nem viaja pra SEFAZ", async () => {
  let chamadas = 0;
  const r = await emitirCndEstadual("123", { fetchImpl: async () => { chamadas++; return respOk(XML_NEGATIVA); } });
  assert.equal(r.ok, false);
  assert.match(r.erro, /dígito verificador/);
  assert.equal(chamadas, 0);
});

test("emissão: sucesso devolve certidão parseada com fonte; 2ª chamada usa cache", async () => {
  let chamadas = 0;
  const fetchImpl = async () => { chamadas++; return respOk(XML_NEGATIVA); };
  const r1 = await emitirCndEstadual("12345678000195", { fetchImpl });
  assert.equal(r1.ok, true);
  assert.equal(r1.situacao, "negativa");
  assert.match(r1.fonte, /SEFAZ-GO/);
  const r2 = await emitirCndEstadual("12.345.678/0001-95", { fetchImpl });
  assert.equal(r2.cache, true, "2ª consulta do MESMO documento não volta na SEFAZ (gentileza)");
  assert.equal(chamadas, 1);
});

test("emissão: erro da SEFAZ e HTTP quebrado são honestos, nunca inventam", async () => {
  /* documentos DIFERENTES do teste de sucesso — o cache é por documento e sobreviveria */
  const r1 = await emitirCndEstadual("52998224725", { fetchImpl: async () => respOk(XML_ERRO) });
  assert.equal(r1.ok, false);
  assert.equal(r1.erro, "CNPJ INVALIDO");
  const r2 = await emitirCndEstadual("00000000000191", { fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(r2.ok, false);
  assert.match(r2.erro, /503/);
});
