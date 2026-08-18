/* Kit Prefeitura (Fases 0/1, 18/08/2026) — a inscrição imobiliária abre os 3
   serviços oficiais; o titular mora na guia do IPTU, não na CND nem no BIC.
   Rede é injetada (fetchImpl) — a suíte não bate na prefeitura. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { soDigitos, linksPrefeitura, inscricaoDeLote, inscricaoPorPonto, kitPrefeitura } from "../motor/links-prefeitura.js";

const src = (p) => readFileSync(new URL(p, import.meta.url), "utf-8");

test("soDigitos: só números, de qualquer máscara", () => {
  assert.equal(soDigitos("12.345.678-9"), "123456789");
  assert.equal(soDigitos("  123456  "), "123456");
  assert.equal(soDigitos(null), "");
  assert.equal(soDigitos(undefined), "");
});

test("linksPrefeitura: inscrição válida gera os 3 atalhos oficiais", () => {
  const l = linksPrefeitura("12.345.678-9");
  assert.ok(l, "inscrição de 9 dígitos é válida");
  assert.equal(l.inscricao, "123456789");
  assert.ok(l.espelhoBic.includes("saces00000f0.asp?sigla=siptu"), "BIC é o siptu do saces (Carta de Serviços)");
  assert.ok(l.cnd.includes("sccer00202f0.asp?txt_nr_iptu=123456789"), "CND aceita deep-link com a inscrição");
  assert.ok(l.guiaIptu.includes("scarr50000f0.asp"), "guia do IPTU é o scarr");
  assert.ok(l.dicaTitular.includes("guia do IPTU"), "a dica do titular aponta para a guia");
});

test("linksPrefeitura: inscrição curta demais ou vazia é recusada (nunca inventa link)", () => {
  assert.equal(linksPrefeitura("12345"), null);
  assert.equal(linksPrefeitura(""), null);
  assert.equal(linksPrefeitura(null), null);
  assert.equal(linksPrefeitura("abcdef"), null);
});

test("inscricaoDeLote: nrinscr (unidade) tem prioridade sobre ci (lote)", () => {
  assert.equal(inscricaoDeLote({ nrinscr: "11122233344", ci: "5566778" }), "11122233344");
  assert.equal(inscricaoDeLote({ nrinscr: null, ci: "5566778" }), "5566778");
  assert.equal(inscricaoDeLote({}), null);
});

test("inscricaoPorPonto: monta a query de lotes por ponto e lê o primeiro feature", async () => {
  let urlChamada = "";
  const fetchFalso = async (u) => {
    urlChamada = String(u);
    return { ok: true, json: async () => ({ features: [{ attributes: { nrinscr: "12345678901", ci: "123456" } }, { attributes: { ci: "123456" } }] }) };
  };
  const r = await inscricaoPorPonto({ lat: -16.68, lon: -49.25 }, { fetchImpl: fetchFalso });
  assert.equal(r.inscricao, "12345678901");
  assert.equal(r.unidades, 2, "apto + box no mesmo ponto ficam à vista");
  assert.ok(urlChamada.includes("geometry=-49.25%2C-16.68") || urlChamada.includes("geometry=-49.25,-16.68"), "ponto vai como lon,lat");
  assert.ok(urlChamada.includes("outFields=nrinscr"), "só pede os campos da inscrição — nada pessoal");
  assert.ok(urlChamada.includes("Feature_Base/MapServer/3/query"), "sempre a camada de unidades do cadastro oficial");
});

test("inscricaoPorPonto: proxy local caiu = tenta o upstream direto", async () => {
  const tentativas = [];
  const fetchFalso = async (u) => {
    tentativas.push(String(u));
    if (String(u).startsWith("http://127.0.0.1")) throw new Error("proxy fora");
    return { ok: true, json: async () => ({ features: [{ attributes: { ci: "7654321" } }] }) };
  };
  const r = await inscricaoPorPonto({ lat: -16.68, lon: -49.25 }, { fetchImpl: fetchFalso });
  assert.equal(r.inscricao, "7654321");
  assert.equal(tentativas.length, 2, "proxy primeiro, upstream de reserva");
  assert.ok(tentativas[1].includes("portalmapa.goiania.go.gov.br"));
});

test("inscricaoPorPonto: upstream quebrado ou sem feature = null honesto", async () => {
  assert.equal(await inscricaoPorPonto({ lat: -16.68, lon: -49.25 }, { fetchImpl: async () => ({ ok: false }) }), null);
  assert.equal(await inscricaoPorPonto({ lat: -16.68, lon: -49.25 }, { fetchImpl: async () => ({ ok: true, json: async () => ({ features: [] }) }) }), null);
  assert.equal(await inscricaoPorPonto({ lat: null, lon: null }, { fetchImpl: async () => { throw new Error("não devia chamar"); } }), null);
});

test("kitPrefeitura: sem geom pede endereço; com geom devolve o kit completo", async () => {
  const sem = await kitPrefeitura({ geom: null });
  assert.equal(sem.ok, false);
  assert.match(sem.erro, /endereço/i);
  const com = await kitPrefeitura({ geom: { lat: -16.68, lon: -49.25 } },
    { fetchImpl: async () => ({ ok: true, json: async () => ({ features: [{ attributes: { ci: "7654321" } }] }) }) });
  assert.equal(com.ok, true);
  assert.equal(com.inscricao, "7654321");
  assert.ok(com.links.cnd.includes("7654321"));
});

test("contrato LGPD: o módulo não pede nem menciona campos pessoais do cadastro", () => {
  const s = src("../motor/links-prefeitura.js");
  for (const campo of ["nmcontrib", "nmproprie", "cpf", "cnpj", "dtnascimen"])
    assert.ok(!s.includes(`"${campo}`) && !s.includes(`outFields: "${campo}`), `campo pessoal ${campo} jamais é consultado`);
  assert.ok(s.includes("nunca coluna pesquisável"), "a regra está declarada no módulo");
});

test("Fase 1 instalada: rota no painel + card no dossiê", () => {
  const painel = src("../motor/painel.js");
  const app = src("../motor/os-app.js");
  const core = src("../motor/os-core.js");
  assert.ok(painel.includes("/prefeitura$"), "rota do kit existe atrás da sessão");
  assert.ok(core.includes("kitPrefeituraImovel"), "backend resolve a inscrição pelo ponto");
  assert.ok(app.includes("prefeituraCard"), "o dossiê renderiza o card Prefeitura");
  assert.ok(app.includes("Espelho do imóvel (BIC)"), "o espelho vira 1 clique");
});
