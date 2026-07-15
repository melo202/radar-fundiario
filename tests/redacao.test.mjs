// Validação números-texto do parecer (§17/§22) — módulo puro, testado na suíte.
// O contrato: a IA escreve com placeholders, o código substitui, e NENHUM valor
// monetário estranho pode sobreviver no texto final.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtBR, placeholdersDe, substituirPlaceholders, validarParecer } from "../motor/redacao-validador.js";

const VAL = { result: { estimatedValue: 891508, estimatedPricePerM2: 9906, medianPricePerM2: 9594,
  probableRange: { minimum: 621000, maximum: 1139362 } } };

test("placeholders são substituídos pelos números do resultado, formatados em pt-BR", () => {
  const ph = placeholdersDe(VAL);
  const t = substituirPlaceholders("O valor estimado é {{VALOR}}, na faixa de {{MIN}} a {{MAX}}.", ph);
  assert.ok(t.includes(`R$ ${fmtBR(891508)}`));
  assert.ok(t.includes(`R$ ${fmtBR(621000)}`));
  assert.ok(!t.includes("{{"));
  assert.equal(validarParecer(t, ph).ok, true);
});

test("valor monetário inventado pela IA é rejeitado", () => {
  const ph = placeholdersDe(VAL);
  const t = substituirPlaceholders("Estimativa de {{VALOR}}, com desconto chega a R$ 850.000.", ph);
  const v = validarParecer(t, ph);
  assert.equal(v.ok, false);
  assert.ok(v.problemas.some(p => p.includes("850.000")));
});

test("placeholder esquecido sem substituição também reprova", () => {
  const ph = placeholdersDe(VAL);
  const v = validarParecer("O valor é {{VALO}} — placeholder errado vira sobra {{VALO}}...", ph);
  assert.equal(v.ok, false);
  assert.ok(v.problemas.some(p => p.includes("não substituídos")));
});

test("texto sem nenhum valor monetário passa (parecer pode citar só a metodologia)", () => {
  const ph = placeholdersDe(VAL);
  const v = validarParecer("A análise usou nove comparáveis de oferta pública com cerca de Tukey.", ph);
  assert.equal(v.ok, true);
});
