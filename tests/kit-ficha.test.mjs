// P2.11b (25/08) — kit oficial EMITIDO direto no card da ficha (Bruno: "tem que sair
// igual a CND municipal, de forma direta"). Testa a função pura kitStatusFichaHTML via
// node:vm (mesmo harness da fachada) + os pinos estruturais do fluxo (epoch, retry, A-04).
// ATENÇÃO: arquivo é CRLF — pinar strings de UMA linha (includes), nunca com \n.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function loadKitStatus() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem");
  const src = html.slice(html.indexOf("\n", iStart) + 1, html.lastIndexOf("\n", iEnd));
  assert.ok(src.includes("function kitStatusFichaHTML"), "kitStatusFichaHTML fora do bloco RADAR_PURE");
  const sandbox = { esc: (v) => (v == null ? "" : String(v)) };
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports={kitStatusFichaHTML};", { filename: "radar-pure-p211b.js" }).runInContext(sandbox);
  return sandbox.__exports.kitStatusFichaHTML;
}

const KIT_OK = {
  ok: true, geradoEm: "2026-08-25T16:00:00.000Z", fonte: "Emitido na hora nos sistemas oficiais",
  docs: {
    certidao: { ok: true, dados: { titular: "PESSOA FICTÍCIA DE TESTE", cpfCnpj: "529.***.***-25", numero: "1.2.3-4" } },
    cnd: { ok: true, dados: { situacao: "negativa", numero: "5.6.7-8" } },
    cndEstadual: { ok: true, situacao: "negativa", numero: "90000003", validadeDias: 120 },
    espelho: { ok: true, dados: { matricula: "123456", posFiscal: "NORMAL" } },
  },
};

test("kitStatusFichaHTML: kit completo vira linhas de status — titular, 2 CNDs, matrícula", () => {
  const f = loadKitStatus();
  const s = f(KIT_OK);
  assert.ok(s.includes("PESSOA FICTÍCIA DE TESTE"), "titular visível direto na ficha");
  assert.ok(s.includes("529.***.***-25"), "documento SEMPRE mascarado (LGPD)");
  assert.ok(s.includes("CND do imóvel: <b>NEGATIVA"), "a municipal 'de forma direta'");
  assert.ok(s.includes("CND estadual do titular: <b>NEGATIVA"), "a estadual IGUAL à municipal (o pedido)");
  assert.ok(s.includes("matrícula <b>123456</b>"), "espelho traz a matrícula");
  assert.ok(s.includes("Emitido na hora nos sistemas oficiais"), "fonte declarada");
});

test("kitStatusFichaHTML: falha de 1 doc vira ⚠ honesto e NÃO derruba os outros", () => {
  const f = loadKitStatus();
  const parcial = JSON.parse(JSON.stringify(KIT_OK));
  parcial.docs.cndEstadual = { ok: false, erro: "SEFAZ fora do ar" };
  const s = f(parcial);
  assert.ok(s.includes("⚠️ CND estadual: SEFAZ fora do ar"), "falha explícita, nunca silêncio");
  assert.ok(s.includes("CND do imóvel: <b>NEGATIVA"), "os outros docs seguem visíveis");
});

test("kitStatusFichaHTML: POSITIVA e POSITIVA COM EFEITO têm textos próprios", () => {
  const f = loadKitStatus();
  const p1 = JSON.parse(JSON.stringify(KIT_OK));
  p1.docs.cndEstadual = { ok: true, situacao: "positiva", numero: "1" };
  assert.ok(f(p1).includes("POSITIVA — há dívida ativa"), "positiva sem efeito");
  const p2 = JSON.parse(JSON.stringify(KIT_OK));
  p2.docs.cndEstadual = { ok: true, situacao: "positiva_com_efeito", numero: "1" };
  assert.ok(f(p2).includes("POSITIVA COM EFEITO DE NEGATIVA"), "CPEN traduzida");
});

test("kitStatusFichaHTML: kit nulo/quebrado vira aviso honesto apontando os botões", () => {
  const f = loadKitStatus();
  assert.ok(f(null).includes("os botões acima abrem os canais oficiais"), "fallback honesto");
  assert.ok(f({}).includes("os botões acima abrem os canais oficiais"), "shape quebrado também");
});

/* ---------- pinos estruturais do fluxo (o card emite ao abrir a ficha) ---------- */

test("P2.11b fluxo: o card tem o alvo #dPrefKit e o render dispara a emissão", () => {
  assert.ok(html.includes('id="dPrefKit" data-insc='), "alvo do status com a inscrição em data- (A-04)");
  assert.ok(html.includes("emitirKitNaFicha(d);"), "renderPrefeituraUI emite ao abrir a ficha");
  assert.ok(html.includes("let KIT_EPOCH=0"), "epoch contra resposta atrasada da ficha anterior");
  assert.ok(html.includes("function retryKitFicha(x)"), "retry de 1 toque (429/erro)");
  /* o retry NUNCA interpola a inscrição dentro de onclick (lição A-04) */
  assert.ok(!html.includes("emitirKitNaFicha('${"), "inscrição NUNCA interpolada em onclick");
});

test("P2.11b CSS: bloco vazio não ocupa espaço; classes do status existem", () => {
  assert.ok(html.includes(".dpref-kit:empty{display:none}"), "antes da emissão o bloco some");
  assert.ok(html.includes(".dpref-kitrow{"), "linhas de status estilizadas");
});
