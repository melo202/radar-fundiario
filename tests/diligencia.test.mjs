import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function pureDiligencia() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "bloco RADAR_PURE ausente");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports={checklistDocumentalItens,resumoChecklistDocumental," +
      "proximaAcaoDocumental,pendenciasDocumentaisTexto,historicoDoImovel,mudancasHistorico};"
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = pureDiligencia();

test("checklist documental mantém cinco itens e estados explicitamente locais", () => {
  const itens = P.checklistDocumentalItens({
    matricula: "conferido",
    iptu: "recebido",
    condominio: "nao_aplica",
    pessoais: "estado_inventado"
  });
  assert.equal(itens.length, 5);
  assert.equal(itens.find((it) => it.id === "matricula").rotulo, "Marcado como conferido");
  assert.equal(itens.find((it) => it.id === "iptu").rotulo, "Recebido");
  assert.equal(itens.find((it) => it.id === "condominio").rotulo, "Não se aplica");
  assert.equal(itens.find((it) => it.id === "pessoais").rotulo, "Não iniciado");
});

test("resumo do checklist separa conferido, em andamento, pendente e não aplicável", () => {
  const resumo = P.resumoChecklistDocumental({
    matricula: "conferido",
    iptu: "recebido",
    pessoais: "solicitado",
    condominio: "nao_aplica"
  });
  assert.equal(resumo.total, 4);
  assert.equal(resumo.conferidos, 1);
  assert.equal(resumo.recebidos, 1);
  assert.equal(resumo.solicitados, 1);
  assert.equal(resumo.emCurso, 2);
  assert.equal(resumo.pendentes, 1);
  assert.equal(resumo.naoAplica, 1);
});

test("texto de pendências exclui itens concluídos e propõe a próxima ação correta", () => {
  const linhas = Array.from(P.pendenciasDocumentaisTexto({
    matricula: "conferido",
    iptu: "recebido",
    condominio: "nao_aplica"
  }));
  assert.ok(!linhas.some((linha) => linha.includes("Matrícula atualizada")));
  assert.ok(!linhas.some((linha) => linha.includes("Quitação e documentos")));
  assert.ok(linhas.some((linha) => linha.includes("Conferir com a fonte oficial")));
  assert.ok(linhas.some((linha) => linha.includes("Certidões pessoais")));
});

test("histórico nunca mistura unidades sem inscrição própria do mesmo lote", () => {
  const lista = [
    { insc: "3020150346", visitedAt: "2026-01-01" },
    { identityKey: "3020150346|1", insc: "3020150346", visitedAt: "2026-02-01" },
    { identityKey: "3020150346|2", insc: "3020150346", visitedAt: "2026-03-01" }
  ];
  const unidade1 = P.historicoDoImovel(lista, "3020150346|1", "3020150346", 4);
  assert.equal(unidade1.length, 1);
  assert.equal(unidade1[0].identityKey, "3020150346|1");

  const legadoSeguro = P.historicoDoImovel(lista, "3020150346", "3020150346", 4);
  assert.equal(legadoSeguro.length, 1);
  assert.equal(legadoSeguro[0].visitedAt, "2026-01-01");
});

test("comparação histórica relata apenas mudanças observáveis e calcula variação", () => {
  const anterior = {
    vlvenal: 300000, areaEdif: 100, faixaLo: 500000, faixaHi: 600000,
    sampleN: 20, evidenceOk: 2, evidenceTotal: 5, scoreOportunidade: "Alinhado",
    zona: "AA", cadastroRef: "01/01/2026"
  };
  const atual = {
    vlvenal: 330000, areaEdif: 105, faixaLo: 520000, faixaHi: 630000,
    sampleN: 24, evidenceOk: 3, evidenceTotal: 5, scoreOportunidade: "Abaixo da referência",
    zona: "ADD", cadastroRef: "01/06/2026"
  };
  const mudancas = P.mudancasHistorico(anterior, atual);
  const ids = Array.from(mudancas, (m) => m.id);
  for (const id of ["venal", "area", "faixa", "amostra", "evidencias", "posicao", "zona", "cadastro"]) {
    assert.ok(ids.includes(id), `mudança ${id} deveria estar presente`);
  }
  assert.equal(mudancas.find((m) => m.id === "venal").pct, 10);
  assert.equal(P.mudancasHistorico(atual, { ...atual }).length, 0);
  const parcial = P.mudancasHistorico(anterior, { ...atual, sampleN: null, scoreOportunidade: null, zona: null });
  assert.ok(!parcial.some((m) => ["amostra", "posicao", "zona"].includes(m.id)),
    "campo derivado ainda não consultado não pode parecer regressão histórica");
});

test("dossiê e os dois documentos compartilham histórico e checklist sem prometer validação", () => {
  for (const id of ["dHistoryBody", "dHistorySummary", "dDocChecklistBody", "dDocChecklistSummary"]) {
    assert.ok(html.includes(`id="${id}"`), `${id} ausente`);
  }
  assert.ok(html.includes('const DOC_CHECK_STORAGE="radar_checklist_documental_v1"'));
  assert.ok(html.includes("const HIST_SESSION_ID="));
  assert.ok(html.includes("function historicoSnapshot(a,visitedAt)"));
  assert.ok(html.includes("function renderHistoricoComparavel(a)"));
  assert.ok(html.includes("function renderChecklistDocumental(a)"));
  assert.ok((html.match(/\$\{diligenciaDocumentoHTML\(a\)\}/g) || []).length >= 2);
  assert.ok(html.includes("não validam autenticidade, vigência, titularidade ou ausência de ônus"));
  assert.ok(html.includes("Não representa histórico de preço, anúncios, transações, matrícula ou cadeia dominial"));
});

test("checklist oferece somente canais oficiais e a trilha registral continua não verificada", () => {
  assert.ok(html.includes("https://www.goiania.go.gov.br/sistemas/sccer/"));
  assert.ok(html.includes("https://www.registrodeimoveis.org.br/servicos-interno/certidao-de-matricula"));
  const start = html.indexOf('rows.push({id:"registral"');
  const end = html.indexOf("return rows;", start);
  const registral = html.slice(start, end);
  assert.ok(registral.includes('status:"off"'));
  assert.ok(registral.includes('rotulo:"Não verificado"'));
});
