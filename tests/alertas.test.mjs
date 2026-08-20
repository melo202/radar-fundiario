// P1.7 (20/08/2026): alertas da carteira — o assistente que vigia os bairros do corretor.
// O contrato: (1) a regra é a função pura alertasDaCarteira (RADAR_PURE, vm): só CAIXA com
// desconto real >= 10% vs mediana de OFERTAS do bairro e só QUEDA de preço verificada;
// (2) nenhuma consulta nova — reusa os 2 fetches do boot; (3) o sino mostra só o que é
// novo (vistos em localStorage); (4) nunca inventa motivação de vendedor nem número.
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
  assert.ok(src.includes("function alertasDaCarteira"), "alertasDaCarteira ausente do bloco RADAR_PURE");
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(src + "\n;globalThis.__exports = {alertasDaCarteira};", { filename: "radar-pure.js" }).runInContext(sandbox);
  return sandbox.__exports;
}

const P = loadPure();

const CAIXA = {
  imoveis: [
    { id: "1", b: "Jardim Goiás", t: "Casa", p: 420000, u: "https://caixa.gov.br/1", x: 100, y: 200,
      descontoBairro: { pctAbaixoDaMediana: 18.4, pm2MedianaBairro: 8000, nOfertas: 12 } },
    { id: "2", b: "Jardim Goiás", t: "Apartamento", p: 900000, u: "https://caixa.gov.br/2", x: 101, y: 201,
      descontoBairro: { pctAbaixoDaMediana: 4.9, pm2MedianaBairro: 9000, nOfertas: 9 } },   /* <10%: não é alerta */
    { id: "3", b: "Setor Bueno", t: "Casa", p: 300000, u: "https://caixa.gov.br/3", x: 102, y: 202,
      descontoBairro: { pctAbaixoDaMediana: 25.0, pm2MedianaBairro: 7000, nOfertas: 7 } },  /* fora da carteira */
    { id: "4", b: "Jardim Goiás", t: "Terreno", p: 200000, u: "https://caixa.gov.br/4", x: 103, y: 203,
      descontoBairro: null },                                                              /* sem amostra: nunca alerta */
  ]
};
const MUDANCAS = [
  { bairro: "Jardim Goiás", tipo: "casa", de: 550000, para: 512000, url: "https://olx.com.br/a", lat: -16.7, lon: -49.25 },
  { bairro: "Jardim Goiás", tipo: "apto", de: 400000, para: 430000, url: "https://olx.com.br/b" },  /* alta: não é alerta */
  { bairro: "Centro", tipo: "casa", de: 300000, para: 250000, url: "https://olx.com.br/c" },        /* fora da carteira */
];

test("alertasDaCarteira: só o que está na carteira, só desconto >=10% e só queda verificada", () => {
  const r = P.alertasDaCarteira(CAIXA, MUDANCAS, ["Jardim Goiás"], []);
  assert.equal(r.length, 2, JSON.stringify(r.map(a => a.id)));
  const cx = r.find(a => a.tipo === "caixa-abaixo");
  assert.equal(cx.id, "cx:1");
  assert.ok(cx.linha.includes("18,4% abaixo da mediana"), cx.linha);
  assert.ok(cx.linha.includes("não transações"), "a nota oferta≠transação vai junto: " + cx.linha);
  assert.equal(cx.preco, 420000);
  assert.equal(cx.novo, true);
  const qd = r.find(a => a.tipo === "queda");
  assert.ok(qd.linha.includes("Preço baixou 6,9%"), qd.linha); /* 1 − 512/550 */
  assert.ok(qd.linha.includes("mesmo anúncio, duas coletas"), qd.linha);
});

test("alertasDaCarteira: bairro case-insensitive; vistos viram novo:false; carteira vazia -> []", () => {
  const r = P.alertasDaCarteira(CAIXA, MUDANCAS, ["jardim goiás"], ["cx:1"]);
  assert.equal(r.length, 2, "match ignora maiúsculas");
  assert.equal(r.find(a => a.id === "cx:1").novo, false, "visto não cutuca de novo");
  assert.equal(r.find(a => a.tipo === "queda").novo, true);
  assert.deepEqual(P.alertasDaCarteira(CAIXA, MUDANCAS, [], []).length, 0);
  assert.deepEqual(P.alertasDaCarteira(null, MUDANCAS, ["Centro"], null).length, 1); /* só a queda do Centro */
});

test("alertasDaCarteira: ordenação por relevância, teto de 20, url suspeita vira null", () => {
  const muitos = { imoveis: Array.from({ length: 30 }, (_, k) => ({
    id: "k" + k, b: "Centro", t: "Casa", p: 100000 + k, u: k % 2 ? "javascript:x" : "https://ok/" + k,
    x: 1, y: 2, descontoBairro: { pctAbaixoDaMediana: 10 + (k % 15), nOfertas: 6 } })) };
  const r = P.alertasDaCarteira(muitos, [], ["Centro"], []);
  assert.equal(r.length, 20, "teto de 20 — alerta bom é alerta raro");
  assert.ok(r[0].pct >= r[r.length - 1].pct, "ordenado pelo % mais relevante");
  assert.equal(r.find(a => a.id === "cx:k25").url, null, "url não-https nunca vira link");
});

// --- Estrutura: sino no header, painel, wiring no boot (zero fetch novo) -------------------

test("P1.7: sino no header com badge escondido por padrão", () => {
  assert.ok(html.includes('class="bell" id="btnAlertas" onclick="toggleAlertas()"'), "sino ausente do header");
  assert.ok(html.includes('class="bell-badge" id="alertasBadge" hidden'), "badge deve nascer escondido");
  assert.ok(html.includes('id="alertasOv" hidden role="dialog"'), "central de alertas ausente");
});

test("P1.7: alertasCompute roda nos 2 fetches que o boot JÁ faz — nenhuma consulta nova", () => {
  assert.ok(html.includes("alertasCompute(); /* P1.7: recalcula o sino com a lista fresca"),
    "bootCaixa deve recalcular o sino após a lista fresca");
  assert.ok(html.includes('window.__PULSO=d.mudancas||[]'), "bootPulso deve guardar as quedas verificadas");
  assert.ok(html.includes("alertasDaCarteira(window.CAIXA,window.__PULSO,carteiraLoad(),alertasVistosLoad())"),
    "alertasCompute deve cruzar CAIXA + pulso + carteira + vistos");
});

test("P1.7: painel tem focus-trap, carteira em localStorage e ações sem interpolação em onclick", () => {
  assert.ok(html.includes("trapFocus(ov)") && html.includes("untrapFocus(ov)"), "focus-trap do painel ausente");
  assert.ok(html.includes("radar_carteira_bairros") && html.includes("radar_alertas_vistos"), "persistência local ausente");
  assert.ok(html.includes('data-idx="${i}" onclick="alertaNoMapa(this)"'), "Ver no mapa via data-idx (A-04/CR-01)");
  assert.ok(html.includes('data-bairro="${esc(b)}" onclick="carteiraRemUI(this)"'), "remover bairro via data-attribute");
  assert.ok(html.includes("alertasMarcarVistos"), "marcar como visto ausente");
});
