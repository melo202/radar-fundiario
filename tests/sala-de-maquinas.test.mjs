/* Páginas vivas (19/07/2026, pedido do usuário): Sala de Máquinas no admin, plantão no
   Hoje e pulso de preços no Mapa — TUDO leitura do trabalho determinístico já registrado.
   Regra: nada aqui dispara trabalho novo; é exibição, não expansão (freeze respeitado). */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const maquina = readFileSync(new URL("../motor/maquina.html", import.meta.url), "utf-8");
const panel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
const varredura = readFileSync(new URL("../motor/varredura.js", import.meta.url), "utf-8");
const server = readFileSync(new URL("../motor/server.js", import.meta.url), "utf-8");
const mapa = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const core = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const osHtml = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");

test("sala de máquinas: página compila, se atualiza sozinha e é 100% autocontida", () => {
  const scripts = [...maquina.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0], { filename: "maquina-inline.js" }));
  assert.ok(!/<script[^>]*\bsrc=/.test(maquina), "sem script externo");
  assert.ok(maquina.includes("setInterval(poll,20000)"), "poll a cada 20 s");
  assert.ok(maquina.includes("},1000)"), "relógio de 1 s para tempos relativos e contagens");
  assert.ok(maquina.includes('id="coracao"'), "batimento cardíaco da operação");
  assert.ok(maquina.includes("nenhum número é inventado"), "honestidade declarada no rodapé");
});

test("sala de máquinas: rotas atrás da sessão e dados só de leitura", () => {
  assert.ok(panel.includes('req.url === "/painel/admin/maquina"'));
  assert.ok(panel.includes('req.url === "/painel/api/os/maquina"'));
  const gate = panel.indexOf("daqui para baixo, tudo exige sessão válida");
  assert.ok(panel.indexOf('req.url === "/painel/admin/maquina"') > gate, "página viva exige sessão");
  assert.ok(panel.indexOf('req.url === "/painel/api/os/maquina"') > gate, "dados exigem sessão");
  assert.ok(panel.includes("varredura-status.json"), "status ao vivo da varredura entra no payload");
  assert.ok(panel.includes("async function salaDeMaquinas"), "função é leitura pura");
  assert.ok(!panel.match(/salaDeMaquinas[\s\S]{0,2000}INSERT INTO/), "sala de máquinas nunca escreve");
});

test("varredura escreve o próprio progresso (bairro a bairro) e nunca morre por isso", () => {
  assert.ok(varredura.includes("varredura-status.json"));
  assert.ok(varredura.includes("rodando: true"), "status durante a ronda");
  assert.ok(varredura.includes("rodando: false"), "status ao terminar");
  assert.ok(varredura.includes("bairroAtual"), "o painel mostra ONDE a máquina está agora");
  assert.ok(varredura.includes("catch {}"), "falha de escrita do status nunca derruba a varredura");
});

test("pulso do mapa: endpoint público só com mudança VERIFICADA e camada que nunca atrapalha", () => {
  assert.ok(server.includes('req.url === "/motor/mercado/mudancas"'));
  assert.ok(server.includes("(a.detail->>'verificada')::boolean IS TRUE"));
  assert.ok(server.includes("a.detail->>'invalidada' IS NULL"), "invalidadas do backfill nunca pulsam");
  assert.ok(server.match(/mudancas[\s\S]{0,700}interval '7 days'/), "só os últimos 7 dias pulsam");
  assert.ok(mapa.includes("bootPulso"));
  assert.ok(mapa.includes("pulso-preco"));
  assert.ok(mapa.includes("@keyframes pulso-onda"));
  assert.ok(mapa.includes("verificado pelo radar: mesmo anúncio, duas coletas"), "popup declara a proveniência");
  assert.ok(mapa.includes("pulso é bônus"), "falha da API nunca atrapalha o mapa");
});

test("plantão no Hoje: uma linha factual das últimas 24 h, que some quando não há nada", () => {
  assert.ok(core.includes("interval '24 hours'"));
  assert.ok(core.includes("plantao"), "payload do Hoje carrega o plantão");
  assert.ok(core.match(/plantao = null;[\s\S]{0,60}try/), "falha no plantão nunca derruba o Hoje");
  assert.ok(osHtml.includes('id="todayPlantao"'));
  assert.ok(app.includes("renderPlantao(data.plantao)"));
  assert.ok(app.includes("Radar nas últimas 24h:"));
  assert.ok(app.includes("alvo.hidden=true"), "sem trabalho registrado, a linha não existe");
});
