import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpretarCaptura, extrairPreco, normalizarTelefone,
  calcularPrioridade, ordenarAcoes,
} from "../motor/os-core.js";

const migration = readFileSync(new URL("../motor/migrations/006-corretor-os.sql", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");

test("OS-01: captura universal interpreta o exemplo real sem inventar confirmação", () => {
  const r = interpretarCaptura("Captei uma casa no Jardins, 4 quartos, proprietário quer 2,3 milhões e aceita permuta.");
  assert.equal(r.ok, true);
  assert.equal(r.kind, "property_capture");
  assert.equal(r.property.propertyType, "casa");
  assert.equal(r.property.neighborhood, "Jardins");
  assert.equal(r.property.bedrooms, 4);
  assert.equal(r.property.askingPrice, 2_300_000);
  assert.equal(r.property.acceptsSwap, true);
  assert.equal(r.confirmationRequired, true);
  assert.ok(r.missing.includes("contato do proprietário"));
  assert.ok(r.missing.includes("autorização de divulgação"));
});

test("OS-01: preço e telefone têm normalização determinística", () => {
  assert.equal(extrairPreco("Apartamento no Bueno, valor de R$ 850.000"), 850_000);
  assert.equal(extrairPreco("proprietário pede 950 mil"), 950_000);
  assert.equal(normalizarTelefone("(62) 99999-1234"), "5562999991234");
  assert.equal(normalizarTelefone("123"), null);
});

test("OS-01: próxima ação é priorizada por prazo e urgência, não por IA", () => {
  const now = new Date("2026-07-16T12:00:00Z");
  const overdue = calcularPrioridade({ priority: "normal", status: "pendente", dueAt: "2026-07-15T12:00:00Z" }, now);
  const future = calcularPrioridade({ priority: "alta", status: "pendente", dueAt: "2026-07-25T12:00:00Z" }, now);
  assert.ok(overdue > future);
  const sorted = ordenarAcoes([
    { title: "Depois", priority: "normal", status: "pendente", dueAt: "2026-07-25T12:00:00Z" },
    { title: "Agora", priority: "alta", status: "pendente", dueAt: "2026-07-16T13:00:00Z" },
  ], now);
  assert.equal(sorted[0].title, "Agora");
});

test("OS-01: domínio privado não reutiliza o acervo público de comparáveis", () => {
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS inventory_properties"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS contacts"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS domain_events"));
  assert.ok(!migration.includes("ALTER TABLE properties"));
  assert.ok(migration.includes("temperature"), "temperatura qualitativa preserva o vocabulário comercial");
  assert.ok(!migration.includes("probability"), "sem falsa precisão antes de dados históricos");
  assert.ok(!migration.includes("CREATE TABLE IF NOT EXISTS recommendations"), "recomendações persistidas ficam para a fase com interface");
  assert.ok(!migration.includes("CREATE TABLE IF NOT EXISTS approvals"), "aprovações ficam para a fase que realmente as usa");
  assert.match(migration, /organization_id uuid NOT NULL REFERENCES organizations/);
});

test("OS-01: shell tem somente a navegação principal combinada", () => {
  for (const label of ["Hoje", "Carteira", "Relacionamentos", "Capturar"]) assert.ok(html.includes(label));
  assert.ok(html.includes("Estas são as coisas que merecem sua atenção hoje."));
  assert.ok(html.includes("Nada será salvo antes da sua confirmação — nem falando, nem digitando."));
  assert.ok(!html.includes("Dashboard"));
});

test("OS-01: rotas privadas usam sessão existente e POSTs continuam sob CSRF", () => {
  assert.ok(panel.includes('req.url === "/painel/os"'));
  assert.ok(panel.includes('req.url === "/painel/api/os/hoje"'));
  assert.ok(panel.includes('!csrfOk(req, sessao)'));
  assert.ok(panel.indexOf('!csrfOk(req, sessao)') < panel.indexOf('/painel/api/os/captura/confirmar'));
  assert.ok(app.includes('headers["X-CSRF-Token"]=state.csrf'));
  assert.ok(app.includes('if(mutating&&!state.csrf)'), "POST não corre antes do token CSRF chegar");
});
