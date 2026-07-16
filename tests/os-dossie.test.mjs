// D-1 — dossiê do imóvel da carteira: whitelist de atualização e tradução de eventos
// são PURAS (testáveis sem banco — o pool do os-core é preguiçoso).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  montarAtualizacaoImovel, rotuloEvento, idValido, ESTAGIOS_CAPTACAO, TEMPERATURAS,
} from "../motor/os-core.js";

const atual = {
  neighborhood: "Jardins", address: null, asking_price: "2300000",
  capture_stage: "prospect", characteristics: { bedrooms: 4, source: "captura_universal" },
};

test("D-1: whitelist — coluna fora da lista NUNCA entra no UPDATE (injeção impossível)", () => {
  const { updates } = montarAtualizacaoImovel(atual, {
    status: "arquivado", organization_id: "outra-org", owner_contact_id: "x",
    neighborhood: "Setor Bueno",
  });
  assert.deepEqual(Object.keys(updates), ["neighborhood"], "só o campo permitido passou");
});

test("D-1: diff por campo — preço vira mudança própria e characteristics preserva o que existia", () => {
  const { updates, changes } = montarAtualizacaoImovel(atual, { askingPrice: "2.150.000", areaM2: "180" });
  assert.equal(updates.asking_price, 2150000);
  assert.equal(updates.characteristics.areaM2, 180);
  assert.equal(updates.characteristics.bedrooms, 4, "o que não mudou continua lá");
  assert.equal(updates.characteristics.source, "captura_universal", "proveniência nunca se perde");
  assert.ok(changes.find(c => c.campo === "asking_price" && c.de === 2300000 && c.para === 2150000));
});

test("D-1: sem mudança real, sem UPDATE — valores iguais não geram evento", () => {
  const { updates, changes } = montarAtualizacaoImovel(atual, { neighborhood: "Jardins", bedrooms: "4" });
  assert.equal(Object.keys(updates).length, 0);
  assert.equal(changes.length, 0);
});

test("D-1: estágio só avança dentro do vocabulário oficial", () => {
  assert.equal(montarAtualizacaoImovel(atual, { captureStage: "vendido_na_bala" }).changes.length, 0);
  assert.equal(montarAtualizacaoImovel(atual, { captureStage: "captured" }).updates.capture_stage, "captured");
  assert.equal(ESTAGIOS_CAPTACAO.length, 8);
  assert.deepEqual(TEMPERATURAS, ["quente", "morno", "frio"], "temperatura qualitativa, nunca probabilidade");
});

test("D-1: histórico legível — evento de domínio vira frase de corretor", () => {
  assert.equal(rotuloEvento({ event_type: "property.price_changed", payload: { de: 790000, para: 765000 } }),
    "Preço: R$ 790.000 → R$ 765.000");
  assert.match(rotuloEvento({ event_type: "opportunity.created", payload: { contactName: "Marina", temperature: "quente" } }),
    /Novo interessado: Marina \(quente\)/);
  assert.equal(rotuloEvento({ event_type: "property.created", payload: { missingCount: 3 } }),
    "Imóvel criado pela captura universal — 3 pendência(s) gerada(s)");
  assert.equal(rotuloEvento({ event_type: "algo.exotico", payload: {} }), "algo.exotico", "evento desconhecido nunca quebra a linha do tempo");
});

test("D-1: id de imóvel só passa como uuid estrito", () => {
  assert.ok(idValido("2f9c1a34-5b6d-4e7f-8a90-1b2c3d4e5f60"));
  assert.ok(!idValido("2f9c1a34-5b6d-4e7f-8a90"), "curto");
  assert.ok(!idValido("../../etc/passwd"));
});
