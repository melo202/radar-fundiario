// P1.6 (20/08/2026): Raio-X do imóvel — PDF 1-clique pra WhatsApp.
// O contrato: (1) o documento é montado SÓ com dados em memória (zero consulta nova, zero
// wizard) e reuso total do pipeline #laudo -> #laudoView -> imprimirLaudo(); (2) o CTA
// WhatsApp (#lvZap) pertence ao Raio-X — todo outro documento zera ele ao abrir e ao fechar;
// (3) a mensagem raioXZapTexto (RADAR_PURE) nunca interpola undefined/NaN e omite linhas
// quando o dado falta; (4) a conta da revenda (quantoSobra) é interna e NUNCA entra no
// documento cliente-facing.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

function loadPure() {
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes ou fora de ordem");
  const src = html.slice(html.indexOf("\n", iStart) + 1, html.lastIndexOf("\n", iEnd));
  assert.ok(src.includes("function raioXZapTexto"), "raioXZapTexto ausente do bloco RADAR_PURE");
  const sandbox = { esc: s => String(s), clean: s => String(s ?? "").trim() };
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {raioXZapTexto,linhaUrbTriade};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPure();

// --- Estrutura: pipeline reusado, botão no kit prefeitura, CTA WhatsApp exclusivo ---------

test("P1.6: botão Raio-X vive no kit prefeitura (as 2 variantes: com e sem inscrição)", () => {
  assert.ok((html.match(/class="dpref-raiox" onclick="montarRaioX\(\)"/g) || []).length === 2,
    "renderPrefeituraUI deve ter o botão Raio-X nos 2 branches (com/sem inscrição)");
  assert.ok(html.includes(".dpref-raiox{"), "CSS do botão Raio-X ausente");
});

test("P1.6: #lvZap existe na barra do documento e é exclusivo do Raio-X", () => {
  assert.ok(html.includes('<a class="lvzap" id="lvZap" hidden'), "lvZap ausente da lvbar");
  assert.ok(html.includes("function lvZapSet(url)"), "lvZapSet ausente");
  /* todos os outros documentos zeram o CTA ao abrir; fecharLaudoView zera ao fechar
     (limite = próxima function top-level: montarLaudo é longo, um slice fixo corta no meio) */
  for (const fn of ["renderFichaRapida", "montarLaudo", "montarPacoteDiligencia", "fecharLaudoView"]) {
    const i = html.indexOf("function " + fn);
    assert.ok(i > -1, fn + " ausente");
    const fim = html.indexOf("\nfunction ", i + 10);
    const trecho = html.slice(i, fim > i ? fim : i + 12000);
    assert.ok(trecho.includes("lvZapSet(null)"), fn + " não zera o CTA WhatsApp — herdaria o zap do Raio-X");
  }
});

test("P1.6: montarRaioX usa o pipeline do laudo e NUNCA expõe a conta da revenda", () => {
  const i = html.indexOf("function montarRaioX()");
  assert.ok(i > -1, "montarRaioX ausente");
  const fim = html.indexOf("\nfunction ", i + 10);
  const corpo = html.slice(i, fim > i ? fim : i + 8000);
  assert.ok(corpo.includes('getElementById("laudo").innerHTML'), "raio-X deve renderizar no #laudo (vai pro PDF)");
  assert.ok(corpo.includes('getElementById("laudoViewBody")'), "raio-X deve abrir a visão em tela");
  assert.ok(corpo.includes("wa.me/?text="), "raio-X deve montar o link do WhatsApp");
  assert.ok(corpo.includes("PD_DISCLAIMER"), "raio-X deve carregar o disclaimer SEPLANH");
  assert.ok(!corpo.includes("quantoSobra(") && !corpo.includes("SOBRA_"),
    "a conta da revenda é interna do corretor — nunca entra no documento cliente-facing");
});

// --- raioXZapTexto: a mensagem que acompanha o PDF ----------------------------------------

const CHEIO = {
  tipoImovel: "Casa", bairro: "Setor Bueno", endereco: "Rua T-25, nº 100",
  inscricao: "30201503460010", faixa: { lo: 800000, hi: 950000 },
  urbanoLinha: "Pode verticalizar (AA) · o terreno comporta ~300 m² de construção sem custo extra.",
  docsConferidos: 3, docsTotal: 8,
  perfil: { nome: "Bruno", creci: "12345" }
};

test("raioXZapTexto: mensagem completa traz todas as linhas, na ordem", () => {
  const t = P.raioXZapTexto(CHEIO);
  assert.ok(t.startsWith("*Raio-X do imóvel* — Casa no Setor Bueno — Rua T-25, nº 100."), t);
  assert.ok(t.includes("Inscrição cadastral: 30201503460010."), t);
  assert.ok(t.includes("Referência indicativa de valor:"), t);
  assert.ok(t.includes("Pode construir? Pode verticalizar (AA)"), t);
  assert.ok(t.includes("Documentos: 3 de 8 itens conferidos"), t);
  assert.ok(t.includes("Segue o raio-X completo em PDF"), t);
  assert.ok(t.endsWith("— Bruno, CRECI 12345"), "assinatura do corretor: " + t);
});

test("raioXZapTexto: dados mínimos — omite linhas opcionais, nunca undefined/NaN/null", () => {
  const t = P.raioXZapTexto({});
  assert.ok(t.startsWith("*Raio-X do imóvel* — Imóvel na região."), "fallback de gênero (na região): " + t);
  assert.ok(!t.includes("Inscrição") && !t.includes("Referência indicativa")
    && !t.includes("Pode construir?") && !t.includes("Documentos:"), t);
  assert.ok(!/undefined|NaN|null/.test(t), t);
  assert.ok(P.raioXZapTexto(null).includes("Segue o raio-X completo em PDF"), "null não quebra");
});

test("raioXZapTexto: sem faixa a mensagem não promete valor; docsTotal 0 omite a linha", () => {
  const t = P.raioXZapTexto({ tipoImovel: "Terreno", bairro: "Jardim Goiás", docsConferidos: 0, docsTotal: 0 });
  assert.ok(!t.includes("Referência indicativa"), t);
  assert.ok(!t.includes("Documentos:"), t);
  assert.ok(!/undefined|NaN|null/.test(t), t);
});

test("raioXZapTexto: urbanoLinha vem de linhaUrbTriade (mesma REGRA DE OURO do CA)", () => {
  /* a mensagem recebe a linha pronta — quem gera é linhaUrbTriade, que nunca emite dígito
     sem regra conferida (contrato pinado em triade-sobra.test.mjs) */
  const linha = P.linhaUrbTriade({ estado: "resolvido", unidade: { sigla: "ZZ" }, regra: null }, 300);
  const t = P.raioXZapTexto({ bairro: "Centro", urbanoLinha: linha });
  assert.ok(linha === null ? !t.includes("Pode construir?") : !/\d/.test(t.split("Pode construir?")[1] || ""), t);
});
