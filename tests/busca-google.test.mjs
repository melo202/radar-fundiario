// GOOGLE-BUSCA (18/08/2026) — o motor tolerante da caixa de busca: Levenshtein com corte,
// score fuzzy de vocabulário e ranker de "você quis dizer?". Funções PURAS extraídas do
// bloco RADAR_PURE de radar-goiania.html via node:vm (mesma técnica de busca.test.mjs —
// testa exatamente o código que roda no app, nunca uma cópia).
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

function loadPure() {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  const iStart = html.indexOf("RADAR_PURE_START");
  const iEnd = html.indexOf("RADAR_PURE_END");
  assert.ok(iStart > -1 && iEnd > iStart, "marcadores RADAR_PURE ausentes");
  const src = html.slice(html.indexOf("\n", iStart) + 1, html.lastIndexOf("\n", iEnd));
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(
    src + "\n;globalThis.__exports = {levDist,scoreVocab,ranquearVocab,vocabTokens};",
    { filename: "radar-pure.js" }
  ).runInContext(sandbox);
  return sandbox.__exports;
}
const P = loadPure();

test("levDist: typos reais de corretor com pressa", () => {
  assert.equal(P.levDist("PORTUGAL", "PORTUGAL", 2), 0, "exato");
  assert.equal(P.levDist("PORTUGUAL", "PORTUGAL", 2), 1, "letra a mais");
  assert.equal(P.levDist("CECILO", "CECILIO", 2), 1, "letra a menos");
  assert.equal(P.levDist("BOCAIUVA", "BOCAYUVA", 2), 1, "troca i/y");
  assert.equal(P.levDist("PERI", "PIER", 2), 2, "transposição conta 1x (Damerau) — duas trocas adjacentes");
  assert.ok(P.levDist("MANGA", "MANGALO", 1) > 1, "acima do limiar estoura (early-exit)");
  assert.ok(P.levDist("X", "ABCD", 2) > 2, "tamanho muito diferente nem calcula");
  assert.equal(P.levDist("", "ABC", 2), 3, "vazio = tamanho do outro");
});

test("scoreVocab: a frase burra casa a grafia oficial", () => {
  assert.ok(P.scoreVocab("portugual", "PORTUGAL") >= 0.85, "typo de 1 letra em palavra longa");
  assert.ok(P.scoreVocab("avenida portugual", "AV PORTUGAL") >= 0.85, "tipo de via não derruba o score");
  assert.equal(P.scoreVocab("bocaiuva quintino", "QUINTINO BOCAIUVA"), 1, "ordem livre: cada token acha seu par");
  assert.ok(P.scoreVocab("jamel cecilo", "JAMEL CECILIO") >= 0.85, "typo no 2º token");
  assert.equal(P.scoreVocab("flamboyant", "FLAMBOYANT"), 1, "condomínio exato");
  assert.equal(P.scoreVocab("riviera", "FLAMBOYANT"), 0, "sem par = zero, nunca 'mais ou menos'");
  assert.equal(P.scoreVocab("", "PORTUGAL"), 0, "vazio não sugere");
});

test("vocabTokens: genéricos de prédio e tipos de via saem da comparação", () => {
  assert.equal(P.vocabTokens("residencial sumer park").join("|"), "SUMER|PARK");
  assert.equal(P.vocabTokens("av. t-63").join("|"), "63", "via sai, hífen vira espaço, 'T' solta é curta demais");
  assert.equal(P.vocabTokens("rua").length, 0, "tipo de via isolado não é identidade");
});

test("ranquearVocab: top-N por score, limiar e deduplicação pelo núcleo", () => {
  const cand = ["AV PORTUGAL", "R  JOAQUIM PORTUGAL", "AV PORTO ALEGRE", "R  PORTO DAS FLORES"];
  const r = P.ranquearVocab("portugual", cand, "nmlogradou");
  assert.equal(r[0].valor, "AV PORTUGAL", "a grafia oficial da rua certa vem primeiro");
  assert.ok(r.every(s => s.score >= 0.66), "limiar respeitado");
  assert.ok(r.length <= 2, "PORTO ALEGRE/FLORES ficam de fora ou atrás — não poluem");
  const dup = P.ranquearVocab("portugal", ["AV PORTUGAL", "AV PORTUGAL   ", "R  PORTUGAL"], "nmlogradou");
  const cores = dup.map(s => s.core);
  assert.equal(new Set(cores).size, cores.length, "padding do cadastro não duplica sugestão");
  assert.equal(P.ranquearVocab("xiquita", cand, "nmlogradou").length, 0, "nada parecido = nada sugerido (honesto)");
});

test("integração no HTML: o beco do 'Sem resultado' virou 'Você quis dizer?'", () => {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(html.includes("async function sugerirVocab(campo,frase)"), "suggester de runtime existe");
  assert.ok(html.includes("returnDistinctValues"), "vocabulário vem de DISTINCT no ArcGIS (1 query leve)");
  assert.ok(html.includes("finish(items,false,sug)"), "buscar() passa as sugestões ao finish");
  assert.ok(html.includes("Você quis dizer?"), "o rótulo do Google-caseiro");
  assert.ok(html.includes("onclick=\"aplicarSugestao(this)\""), "chip clicável que rebusca");
  assert.ok(html.includes("data-campo=\"${esc(s.campo)}\""), "chip via data-* escapado (CR-01), nunca JS inline");
  assert.ok(html.includes("function aplicarSugestao(btn)"), "handler lê .dataset");
  assert.ok(html.includes("qualquer ordem"), "fallback de rua em ordem livre existe");
  const linhaVia = html.split("\n").find(l => l.includes("VIA_TOKEN_RE=new RegExp"));
  assert.ok(linhaVia && linhaVia.includes("TIPOVIA_WORDS"), "tipos de via reusam TIPOVIA_WORDS (fonte única)");
});

test("segurança do suggester: prefixo vem de token forte, nunca da frase crua", () => {
  const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
  assert.ok(html.includes("toks.sort((a,b)=>b.length-a.length)[0].slice(0,3)"), "prefixo = 3 letras do token mais longo");
  assert.ok(html.includes("VOCAB_CACHE"), "cache de sessão: falha repetida não refaz rede");
  /* o prefixo é derivado de vocabTokens() (só [A-Z0-9]) — aspas/percentuais do usuário
     jamais chegam ao LIKE do servidor por este caminho */
  assert.match(html, /if\(!toks\.length\)return \[\]/, "sem token forte = sem sugestão, nunca inventa");
});
