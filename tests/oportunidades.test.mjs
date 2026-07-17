// Oportunidades (Caixa/leilão) — núcleo puro testado sem banco. As regras de honestidade
// da pesquisa dos 10 agentes viram contrato: leilão nunca no índice, sumiço ≠ vendido,
// desconto só com amostra suficiente, avisos por modalidade.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { areaDaDescricao, tipoIndice, descontoVsIndice, avisosDaModalidade, planejarDiff } from "../motor/oportunidades.js";

test("área da descrição: privativa tem prioridade; lixo vira null", () => {
  assert.equal(areaDaDescricao("Apartamento, 84.32 de área privativa, 3 qto(s)"), 84.32);
  assert.equal(areaDaDescricao("Casa, 175.54 de área total, 200.00 de área do terreno"), 175.54);
  assert.equal(areaDaDescricao("Casa, sem área informada"), null);
  assert.equal(areaDaDescricao(""), null);
  assert.equal(areaDaDescricao("Terreno, 3 de área"), null); /* implausível */
});

test("tipo da Caixa -> tipo do índice; terreno/comercial sem índice", () => {
  assert.equal(tipoIndice("Apartamento"), "apartamento");
  assert.equal(tipoIndice("Casa"), "casa");
  assert.equal(tipoIndice("Sobrado"), "casa");
  assert.equal(tipoIndice("Terreno"), null);
  assert.equal(tipoIndice("Loja"), null);
});

test("desconto vs índice: honesto nos limites (n<5, sem área) e correto quando dá", () => {
  const entrada = { n: 12, pm2Mediana: 6000 };
  const ok = descontoVsIndice({ preco: 300000, area_m2: 100 }, entrada); /* 3000/m² vs 6000 = 50% */
  assert.equal(ok.disponivel, true);
  assert.equal(ok.pctAbaixoDaMediana, 50);
  assert.equal(ok.pm2MedianaBairro, 6000);
  assert.equal(ok.nOfertas, 12);

  assert.equal(descontoVsIndice({ preco: 300000, area_m2: 0 }, entrada).disponivel, false, "sem área");
  assert.equal(descontoVsIndice({ preco: 300000, area_m2: 100 }, { n: 3, pm2Mediana: 6000 }).disponivel, false, "n<5");
  assert.equal(descontoVsIndice({ preco: 300000, area_m2: 100 }, null).disponivel, false, "sem entrada");
  const acima = descontoVsIndice({ preco: 900000, area_m2: 100 }, entrada); /* 9000 vs 6000 = -50% */
  assert.equal(acima.pctAbaixoDaMediana, -50, "acima da mediana: percentual negativo, nunca escondido");
});

test("avisos mudam por MODALIDADE — judicial ≠ extrajudicial (regra jurídica)", () => {
  const sfi = avisosDaModalidade("Leilão SFI - Edital Único");
  assert.equal(sfi.natureza, "extrajudicial");
  assert.ok(sfi.avisos.some(a => /NÃO vale a proteção do leilão judicial/i.test(a)),
    "no SFI o edital PODE repassar IPTU/condomínio");
  assert.ok(sfi.avisos.some(a => /ex-dono pode recomprar/i.test(a)), "preferência até o 2º leilão");

  const lic = avisosDaModalidade("Licitação Aberta");
  assert.equal(lic.natureza, "venda-direta");
  assert.ok(lic.avisos.some(a => /já é dona/i.test(a)), "propriedade consolidada: risco menor");

  const generico = avisosDaModalidade("");
  assert.ok(generico.avisos.length, "sempre há avisos comuns");
  assert.ok(generico.avisos.every(a => typeof a === "string"));
});

test("diff: novo, baixou, sumiço vira ausente e só encerra após 3 dias — nunca 'vendido'", () => {
  const incoming = [
    { external_id: "1", preco: 200000, bairro: "Setor Bueno", tipo: "Apartamento", modalidade: "Venda Online", url: "u1" },
    { external_id: "2", preco: 180000, bairro: "Setor Bueno", tipo: "Casa", modalidade: "Licitação Aberta", url: "u2" },
  ];
  const agora = 1_000_000_000_000;
  const atuais = new Map([
    ["2", { preco: 200000, situacao: "ativo", ausente_desde: null }],          /* baixou 200->180 */
    ["3", { preco: 500000, situacao: "ativo", ausente_desde: null }],          /* sumiu hoje */
    ["4", { preco: 500000, situacao: "ausente", ausente_desde: new Date(agora - 4 * 86400000).toISOString() }], /* ausente há 4d */
  ]);
  const p = planejarDiff(incoming, atuais, agora);
  const acoes = p.eventos.map(e => `${e.acao}:${e.id}`).sort();
  assert.ok(acoes.includes("imovel-novo:1"));
  assert.ok(acoes.includes("preco-baixou:2"));
  assert.ok(acoes.includes("saiu-da-lista:4"), "só encerra após 3+ dias ausente");
  assert.ok(!acoes.some(a => a.includes("vendido")), "sumiço NUNCA é 'vendido'");
  assert.deepEqual(p.marcarAusente, ["3"], "sumiu hoje: vira ausente, não some");
  assert.deepEqual(p.encerrar, ["4"]);
  assert.equal(p.upserts.length, 2);
});

test("diff: imóvel que reaparece após ausência gera 'voltou-a-lista'", () => {
  const incoming = [{ external_id: "9", preco: 100000, bairro: "X", tipo: "Casa", modalidade: "Venda Direta Online", url: "u" }];
  const atuais = new Map([["9", { preco: 100000, situacao: "ausente", ausente_desde: new Date().toISOString() }]]);
  const p = planejarDiff(incoming, atuais);
  assert.ok(p.eventos.some(e => e.acao === "voltou-a-lista" && e.id === "9"));
});

test("fiação: rotas de ingestão (token) e leitura (pública) no servidor", () => {
  const srv = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
  assert.ok(srv.includes('req.url === "/motor/ingestao/caixa"'), "rota de ingestão");
  assert.match(srv, /ingestao\/caixa[\s\S]{0,400}autorizado\(req\)/, "ingestão exige token");
  assert.ok(srv.includes('req.url === "/motor/oportunidades"'), "rota pública de leitura");
});

test("fiação: mapa consome a API com fallback e mostra desconto vs bairro", () => {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(html.includes("/motor/oportunidades"), "mapa busca a API");
  assert.ok(html.includes("mantém o caixa-goiania.js estático"), "fallback documentado");
  assert.ok(html.includes("descontoBairro"), "popup mostra o desconto vs índice");
  assert.ok(html.includes("ofertas anunciadas, não transações"), "rótulo honesto no popup");
});

test("fiação: migração 008 protege o índice por construção (tabela própria)", () => {
  const sql = readFileSync(new URL("../motor/migrations/008-oportunidades.sql", import.meta.url), "utf-8");
  assert.ok(/CREATE TABLE IF NOT EXISTS oportunidades/.test(sql), "tabela dedicada");
  assert.ok(sql.includes("NUNCA em properties") || sql.includes("NUNCA em properties"), "regra declarada");
  assert.ok(/PRIMARY KEY \(fonte, external_id\)/.test(sql), "chave estável fonte+id");
});

test("fiação: runner residencial faz POST ao VPS só com URL+token no ambiente", () => {
  const py = readFileSync(new URL("../atualizar-caixa.py", import.meta.url), "utf-8");
  assert.ok(py.includes("RADAR_INGEST_URL") && py.includes("MOTOR_TOKEN"), "envio condicionado ao segredo");
  assert.ok(py.includes('"Authorization": "Bearer " + token'), "token no header");
  assert.ok(py.includes('"ar": area'), "área capturada para o desconto vs índice");
});
