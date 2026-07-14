import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("contrato de confiança: interface não promete liquidez nem área privativa confirmada", () => {
  for (const proibido of [
    "Boa liquidez esperada",
    "Maior liquidez",
    "Menor liquidez",
    "Área privativa confirmada",
    "fator oferta 0,90",
    "Veja valor e oportunidade",
    "score de oportunidade e uma leitura",
  ]) {
    assert.ok(!html.includes(proibido), `copy proibida voltou para a interface: ${proibido}`);
  }
});

test("contrato de confiança: completude é apresentada como cobertura, não precisão", () => {
  assert.ok(html.includes("Cobertura dos dados:"));
  assert.ok(html.includes("não representa precisão da estimativa nem verificação documental"));
  assert.ok(html.includes("não mede preço de mercado, demanda ou liquidez"));
});

test("estimativa segura: não usa área presumida, desconto ou ajuste heurístico automático", () => {
  for (const simbolo of [
    "FATOR_OFERTA",
    "FATOR_PRIV",
    "FATOR_CONSERV",
    "AUTO_COEF",
    "M2_MERCADO",
    "valorAuto",
    "vs*0.96",
    "vs*1.08",
  ]) {
    assert.ok(!html.includes(simbolo), `${simbolo} não deve voltar sem calibração e backtest`);
  }
  assert.ok(html.includes("fx.n>=5"), "faixa CAIXA deve exigir amostra mínima no setor");
  assert.ok(html.includes("não representa preço de fechamento"));
  assert.ok(html.includes("não foi calculado nem validado pelo Radar"));
  assert.ok(html.includes("A referência externa e o valor informado ficam separados"));
  assert.ok(html.includes("negocio:0"), "calculadora deve começar sem valor presumido");
  assert.ok(!html.includes("Sugerido pela estimativa; edite pelo preço fechado"));
});

test("posição cadastral explicita a natureza fiscal da amostra", () => {
  assert.ok(html.includes("Posição cadastral:"));
  assert.ok(html.includes("Não são transações, ofertas nem comparáveis de mercado."));
  assert.ok(!html.includes('<span class="score-num">'), "número 0–100 não deve ser exibido como decisão comercial");
});

test("PTAM permanece suspenso sem verificação profissional", () => {
  assert.ok(html.includes("function habilitaPtam(prof){\n  return false;"));
  assert.ok(html.includes('const ORDEM=["relatorio","ficha"]'));
  assert.ok(html.includes("O módulo de PTAM permanece suspenso"));
  assert.ok(!html.includes('onclick="finEscolherDoc(\'ptam\')"'));
  assert.ok(!html.includes("Preencha ambos no passo do perfil para emitir o PTAM"));
});
