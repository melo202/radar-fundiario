// Harness de teste Node puro (node:test + node:assert/strict), sem framework/bundler.
// P2.3 (25/08): (b) busca QL PELA RUA, sem setor ("rua portugal quadra 12 lote 5") e
// (c) última busca salva + repetir em 1 toque (↺). Pinos de integração do front —
// as regras puras estão em detectmode.test.mjs/espelho-api.test.mjs.
// ATENÇÃO: arquivo é CRLF — pinar strings de UMA linha (includes), nunca com \n.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("P2.3b detectMode→buscar: a rua da frase QL chega ao buscar() via QL_RUA", () => {
  assert.ok(html.includes('let QL_RUA=""'), "QL_RUA não declarada");
  assert.ok(html.includes('QL_RUA=fields.rua||""'), "applyDetectAndSearch não repassa fields.rua");
  assert.ok(html.includes("const ruaQL=ruaCore(QL_RUA||\"\")"), "buscar() não lê a rua da QL");
});

test("P2.3b buscar(): com rua, ELA é o escopo — sem setor, sem herdar o último bairro", () => {
  const i = html.indexOf("const ruaQL=ruaCore(QL_RUA");
  assert.ok(i > -1, "ramo da QL pela rua ausente");
  const bloco = html.slice(i, html.indexOf("GOOGLE-BUSCA: resultado zero", i));
  assert.ok(bloco.includes("UPPER(nmlogradou) LIKE"), "escopo pela rua ausente");
  assert.ok(bloco.includes("UPPER(nrquadra) LIKE"), "filtro de quadra ausente");
  assert.ok(bloco.includes("matchScoreRua(ruaCore(a.nmlogradou),ruaQL,digQ)"), "confirmação da rua no cliente ausente");
  assert.ok(bloco.includes("Achado pela rua, sem precisar do setor"), "aviso honesto ausente");
  assert.ok(bloco.includes("Não achei essa quadra/lote nessa rua"), "mensagem de zero-resultado com rua ausente");
  assert.ok(bloco.indexOf("if(ruaQL){") < bloco.indexOf("cdbairro=${b}"), "a tentativa pela rua tem que vir ANTES do fluxo com setor");
});

test("P2.3c última busca: salva no disparo, restaura no boot (sem disparar), ↺ no foco vazio", () => {
  assert.ok(html.includes('localStorage.setItem("radar_ultimabusca"'), "não salva a última busca");
  assert.ok(html.includes("function ultimaBuscaLoad()"), "loader do cache ausente");
  assert.ok(html.includes("function restaurarUltimaBusca()"), "restore do boot ausente");
  assert.ok(html.includes("restaurarUltimaBusca();"), "boot não restaura");
  assert.ok(html.includes("function mostrarUltimaBusca()"), "item ↺ do foco vazio ausente");
  assert.ok(html.includes("else mostrarUltimaBusca();"), "foco na caixa vazia não oferece o ↺");
  assert.ok(html.includes('data-kind="ultima"'), "item ↺ sem kind próprio");
  assert.ok(html.includes('kind==="ultima"'), "pickCaixaItem não trata o ↺");
  assert.ok(html.includes('inpU.dispatchEvent(new Event("input"'), "↺ tem que re-rodar a detecção pelo caminho da digitação");
});

test("P2.3c honestidade: restaurar NUNCA dispara buscar() sozinho; cache guarda só a frase", () => {
  const i = html.indexOf("function restaurarUltimaBusca()");
  const bloco = html.slice(i, html.indexOf("/* foco na caixa VAZIA", i));
  assert.ok(!bloco.includes("buscar("), "restaurar não pode disparar a busca (rede/mapa sem pedido)");
  const j = html.indexOf('localStorage.setItem("radar_ultimabusca"');
  const salva = html.slice(j, j + 200);
  assert.ok(salva.includes("{t:_ub,ts:Date.now()}"), "cache guarda só a frase + timestamp (nunca dado do imóvel)");
});
