// MK-1 — material de divulgação: card no aparelho + legendas determinísticas.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");

test("MK-1: gerador vive em Ferramentas, desenha no aparelho e baixa PNG", () => {
  assert.ok(html.includes('onclick="abrirMkt()">Gerar material de divulgação</button>'));
  assert.ok(html.includes('id="mkt"') && html.includes('id="mktCanvas"'));
  assert.match(html, /function desenhaMkt\(\)[\s\S]{0,200}story\?1920:1080/, "post 1080² e story 1080×1920");
  assert.ok(html.includes('cv.toDataURL("image/png")'), "download local, zero servidor");
});

test("MK-1: honestidade da divulgação — o preço é o DO CORRETOR, nunca o do motor", () => {
  assert.ok(html.includes("Preço de venda (R$) — o SEU preço de anúncio"));
  assert.ok(html.includes("a referência do motor pertence à avaliação, não ao anúncio"));
  /* nenhum dado do MERCADO_LAST entra no material */
  assert.ok(!/function (desenhaMkt|legendasMkt)[\s\S]{0,2000}MERCADO_LAST/.test(html),
    "divulgação não lê o valor de referência");
});

test("MK-1: legendas em 3 tons com dados reais + entorno medido como argumento de venda", () => {
  assert.ok(html.includes('["Institucional"') && html.includes('["Urgência"') && html.includes('["História"'));
  assert.match(html, /function entornoDestaque\(\)[\s\S]{0,300}sinal!=="atencao"/, "só amenidade positiva vira destaque");
  assert.ok(html.includes("LOCAL_LAST=null; /* MK-1"), "medição de outro imóvel nunca vaza");
  assert.ok(html.includes("Ficha completa: ${link}"), "legenda leva ao imóvel no app");
  assert.ok(html.includes('onclick="copiarLegenda('), "copiar em 1 toque");
});

test("AREA-APTO: metragem de apartamento nunca sai do cadastro cru — privativa declarada e lembrada", () => {
  /* areaedif de UNIDADE é a área TOTAL (privativa + comum + vaga); divulgação e avaliação
     usam a PRIVATIVA declarada pelo corretor, lembrada no aparelho (ci_privativa) */
  assert.match(html, /const mktArea=\(\)=>MKT&&MKT\.area>0/, "área divulgada vem do campo do modal");
  assert.ok(!html.includes("const mktArea=a=>+a.areaedif"), "nunca mais o areaedif cru em material público");
  assert.ok(html.includes('mktAreaRot=a=>ehAptoProvavel(a)?"privativos"'), "rótulo honesto por tipo");
  assert.ok(html.includes('localStorage.setItem("ci_privativa"'), "privativa lembrada só no aparelho");
  assert.ok(html.includes("os anúncios dos portais usam a <b>privativa</b>"), "avaliação pede a privativa antes de comparar");
  assert.match(html, /const area=isU\?privGet\(a\):\+a\.areaedif/, "motor recebe a privativa para unidade");
  assert.ok(html.includes("privativa:ehAptoProvavel(LZ.a)?privGet(LZ.a):null"), "laudo herda a privativa lembrada");
  assert.ok(html.includes("A privativa não pode passar da área total do cadastro"), "guarda: privativa ≤ total do cadastro");
  assert.ok(html.includes('onclick="mercadoTrocarArea()"'), "área usada é visível e trocável no resultado");
});

test("MK-1: digitação cirúrgica (lição CUSTOS-01) e contato lembrado localmente", () => {
  assert.ok(html.includes("atualizaMkt(); /* cirúrgico: nunca re-renderiza o modal digitando"));
  assert.ok(!/oninput="[^"]*renderMkt/.test(html), "nenhum input re-renderiza o modal");
  assert.ok(html.includes('localStorage.setItem("ci_perfil"'), "nome/CRECI/tel lembrados só no aparelho");
});
