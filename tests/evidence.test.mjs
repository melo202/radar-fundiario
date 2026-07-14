import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function pureIdentity() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  const start = html.indexOf("\n", iStart) + 1;
  const end = html.lastIndexOf("\n", iEnd);
  const src = html.slice(start, end);
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports={identidadeChave,identidadeFatos};").runInContext(sandbox);
  return sandbox.__exports;
}

const ID = pureIdentity();

test("identidadeChave distingue unidades do mesmo lote quando falta inscrição própria", () => {
  const a = { ci: "3020150346", insubprinc: 1, incompl: "APTO 101" };
  const b = { ci: "3020150346", insubprinc: 2, incompl: "APTO 102" };
  assert.notEqual(ID.identidadeChave(a), ID.identidadeChave(b));
});

test("identidadeFatos exige identificador, setor, quadra, lote e unidade quando o registro é múltiplo", () => {
  const completo = ID.identidadeFatos({
    nrinscr: "30201503460001", ci: "3020150346", nmbairro: "SETOR BUENO",
    nrquadra: "128", nrlote: "5", ttsublot: 12, incompl: "APTO 101"
  });
  assert.equal(completo.completo, true);
  assert.deepEqual(Array.from(completo.faltantes), []);

  const parcial = ID.identidadeFatos({ ci: "3020150346", ttsublot: 12 });
  assert.equal(parcial.completo, false);
  assert.deepEqual(Array.from(parcial.faltantes), ["bairro", "quadra", "lote", "unidade"]);
});

function evidenceRuntime() {
  const start = html.indexOf("function dataCaixaTxt()");
  const end = html.indexOf("function renderEvidence(a)", start);
  assert.ok(start > -1 && end > start, "bloco da trilha de evidências ausente");
  const src = html.slice(start, end);
  const caixa = { gerado: "2026-07-10", fatores: { "52": { n: 8, fator: 2 } } };
  const sandbox = {
    window: { CAIXA: caixa }, CAIXA: caixa,
    clean: (v) => String(v == null ? "" : v).trim(),
    fmtDt: (v) => v === "20260701" ? "01/07/2026" : null,
    fmtVisita: () => "consultado hoje às 12:00",
    identidadeFatos: (a) => ({
      inscricao: String(a.nrinscr || a.ci || ""), bairro: String(a.nmbairro || ""),
      quadra: String(a.nrquadra || ""), lote: String(a.nrlote || "")
    }),
    mercadoEstimado: (a) => a.vlvenal > 0 ? { lo: 100, hi: 120 } : null,
    Date
  };
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports={dataCaixaTxt,trilhaEvidencias};").runInContext(sandbox);
  return sandbox.__exports;
}

test("trilhaEvidencias entrega os cinco conjuntos com fonte, data e status explícitos", () => {
  const E = evidenceRuntime();
  const rows = E.trilhaEvidencias({
    nrinscr: "30201503460001", ci: "3020150346", cdbairro: 52,
    nmbairro: "SETOR BUENO", nrquadra: "128", nrlote: "5",
    areaedif: 90, vlvenal: 300000, x_coord: 680000, y_coord: 8150000,
    dtultalter: "20260701", __consultadoEm: "2026-07-14T12:00:00-03:00",
    __evidenceSample: { estado: "disponivel", n: 12, radius: 400 },
    __pdEstado: { estado: "resolvido", unidade: { sigla: "AA", nome: "Área Adensável" } }
  });
  assert.deepEqual(Array.from(rows, (r) => r.id), ["cadastro", "amostra", "referencia", "urbanistico", "registral"]);
  for (const row of rows) {
    assert.ok(row.fonte, `${row.id} sem fonte`);
    assert.ok(row.data, `${row.id} sem data/recência`);
    assert.ok(row.rotulo, `${row.id} sem status legível`);
  }
  assert.equal(rows.find((r) => r.id === "registral").rotulo, "Não verificado");
  assert.equal(E.dataCaixaTxt(), "10/07/2026");
});

test("fluxo visual obriga confirmação antes do primeiro dossiê e explicita o limite jurídico", () => {
  assert.ok(html.includes('id="identityCheck"'));
  assert.ok(html.includes("Confirmar e abrir dossiê"));
  assert.ok(html.includes("não valida matrícula, titularidade, ônus ou regularidade documental"));
  const pickStart = html.indexOf("function pick(i,origemForcada)");
  const pickEnd = html.indexOf("/* ---------------- trilha de evidências", pickStart);
  const pickSrc = html.slice(pickStart, pickEnd);
  assert.ok(pickSrc.includes("IDENTIDADES_CONFIRMADAS.has(identidadeChave(a))"));
  assert.ok(pickSrc.includes("abrirConfirmacaoIdentidade(a"));
});

test("tela, Plano Diretor, amostra e os dois PDFs reutilizam a mesma trilha", () => {
  assert.ok(html.includes('id="dEvidenceBody"'));
  assert.ok(html.includes("a.__pdEstado=estado;"));
  assert.ok(html.includes("a.__evidenceSample=statsR"));
  assert.ok((html.match(/\$\{evidenciasDocumentoHTML\(a\)\}/g) || []).length >= 2);
  assert.ok(html.includes("Rastreabilidade das evidências"));
});
