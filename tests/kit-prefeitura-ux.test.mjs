// UX-M + UX-P (18/08/2026 — auditoria UX do Kit Prefeitura): os serviços oficiais da
// Prefeitura VISÍVEIS onde a dor acontece. Achados que este teste trava contra regressão:
// M1 — Espelho BIC e Guia do IPTU não existiam no mapa; M2 — CND enterrada a 3-4 toques
// com rótulo-jargão "Titular (CND)"; M3 — a dica de ouro (o titular está na Certidão de
// Dados Cadastrais, sccer00202, emitida na hora sem captcha — verificado ao vivo 18/08)
// não existia no mapa; O1 — no painel a dica era meta cinza 12px; O2 — a inscrição ia
// embutida numa frase; O4 — erro sem caminho e sem retry.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf-8");
const links = readFileSync(new URL("../motor/links-prefeitura.js", import.meta.url), "utf-8");
const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const css = readFileSync(new URL("../motor/os.css", import.meta.url), "utf-8");

test("UX-M: bloco Prefeitura visível na aba Resumo, logo após as ações principais", () => {
  const posPrim = html.indexOf('id="dActsPrim"');
  const posPref = html.indexOf('id="dPref"');
  const fimResumo = html.indexOf('id="dViewTerritorio"');
  assert.ok(posPrim > -1 && posPref > posPrim && posPref < fimResumo,
    "dPref vive na aba Resumo, depois das ações principais — sem abrir accordion");
  assert.ok(html.includes("function renderPrefeituraUI(inscRaw)"), "render próprio");
  assert.ok(html.includes("renderPrefeituraUI(insc||ci)"), "chamado a cada abertura de ficha");
});

test("UX-M: os 5 serviços oficiais no mapa, URLs idênticas às do motor (sincronia pregada)", () => {
  for (const trecho of ["siptu00020a0.asp?ninsc=", "sccer00202w0.asp?txt_nr_iptu=", "sccer00201w0.asp?txt_nr_iptu=", "ConsultaTributos?InscricaoCadastral=", "TaxaLimpezaPublica?InscricaoCadastral="]) {
    assert.ok(html.includes(trecho), `mapa tem ${trecho}`);
    assert.ok(links.includes(trecho), `motor tem ${trecho} (fonte única de verdade)`);
  }
  assert.ok(html.includes("Espelho do imóvel (BIC) ↗"), "espelho vira 1 toque no mapa");
  assert.ok(html.includes("Titular (certidão cadastral) ↗"), "a virada de jogo: titular com NOME+CPF, emitido na hora");
  assert.ok(html.includes("Guia do IPTU ↗") && html.includes("CND de débitos ↗"));
  assert.ok(html.includes("Limpeza pública (TLP) ↗"), "a pendência invisível entrou no kit");
  assert.ok(html.includes("NÃO aparece na CND"), "o aviso da TLP nasce junto com o botão");
});

test("UX-M: a dica de ouro existe no mapa, como callout — e o rótulo-jargão morreu", () => {
  assert.ok(html.includes("Procurando o titular?"), "a dica nasce onde a dúvida nasce");
  assert.match(html, /certidão cadastral<\/b> \(2º botão\) mostra NOME e CPF/, "titular → certidão cadastral, explícito");
  assert.ok(!html.includes("Titular (CND)"), "rótulo-jargão enterrado não existe mais");
  assert.ok(!html.includes(">Copiar inscrição ⧉<"), "copiar solto em Ferramentas saiu — vive no bloco");
});

test("UX-M: inscrição copiável em chip mono + cópia automática ao abrir serviço", () => {
  assert.ok(html.includes('class="dpref-num"'), "chip mono destacado, não frase cinza");
  assert.ok(html.includes("el.dataset.insc=d"), "copyInsc lê via closest data-insc (A-04)");
  assert.match(html, /class="dpref-copy" onclick="copyInsc\(this\)"/, "copiar de 1 toque");
  /* os 5 abrem preenchidos (deep-link; as certidões EMITEM na hora); o clique
     ainda copia a inscrição — sobra para qualquer outro sistema do corretor */
  assert.match(html, /siptu00020a0\.asp\?ninsc=[^"]*"[^>]*onclick="copyInsc\(this\)"/);
  assert.match(html, /sccer00202w0\.asp\?txt_nr_iptu=[^"]*"[^>]*onclick="copyInsc\(this\)"/);
  assert.match(html, /sccer00201w0\.asp\?txt_nr_iptu=[^"]*"[^>]*onclick="copyInsc\(this\)"/);
  assert.match(html, /ConsultaTributos\?InscricaoCadastral=[^"]*"[^>]*onclick="copyInsc\(this\)"/);
  assert.match(html, /TaxaLimpezaPublica\?InscricaoCadastral=[^"]*"[^>]*onclick="copyInsc\(this\)"/);
});

test("UX-M: sem inscrição o bloco explica em vez de sumir em silêncio", () => {
  assert.ok(html.includes("não trouxe a inscrição cadastral"), "estado vazio honesto");
  assert.match(html, /if\(d\.length<6\|\|d\.length>15\)/, "mesma validação do motor (6–15 dígitos)");
});

test("UX-M: piso mobile de 44px no botão copiar e linguagem visual da casa", () => {
  assert.match(html, /\.dpref-copy\{min-height:44px/);
  assert.match(html, /\.dpref\{[^}]*border-left:4px solid var\(--accent\)/, "bloco marcado com o accent da casa");
  assert.match(html, /\.dpref-dica\{[^}]*var\(--gold\)/, "callout da dica usa o ouro da casa");
});

test("UX-P: hierarquia do card no painel — chip, primária, callout, cache", () => {
  assert.ok(app.includes("Documentos oficiais · Prefeitura"), "título comunica valor, não origem");
  assert.ok(app.includes('class:"pref-num"'), "inscrição em chip mono copiável");
  assert.match(app, /class:"card-action as-link",href:r\.links\.espelhoBic/, "BIC é a ação PRIMÁRIA");
  assert.ok(app.includes('class:"pref-acts"'), "titular + CND + IPTU lado a lado, secundárias");
  assert.ok(app.includes('class:"pref-dica"'), "dica do titular vira callout, não meta");
  assert.ok(app.includes("state.property.prefKit={propId,r}"), "resultado em cache — reabrir não espera");
});

test("UX-P: erro acionável — endereço rola ao formulário, rede ganha retry", () => {
  assert.ok(app.includes("Preencher endereço agora ↓"), "botão leva ao formulário");
  assert.ok(app.includes('f.querySelector(\'input[name="address"]\')'), "foca o campo de endereço");
  assert.ok(app.includes("Tentar de novo"), "falha de rede tem retry sem F5");
});

test("UX-P: CND da pessoa é USO INTERNO — mini-form no painel, ZERO no mapa público", () => {
  assert.ok(app.includes("sccer00203f0.asp?txt_nr_cpfcnpj="), "painel abre o form oficial da CND da pessoa pré-preenchido");
  assert.ok(app.includes("Uso interno · CND da pessoa (vendedor)"), "rótulo honesto de uso interno");
  assert.ok(app.includes("Nada é salvo aqui"), "compromisso declarado: CPF/nome não persistem");
  assert.ok(!html.includes("sccer00203"), "o mapa público NUNCA linka serviço de pessoa");
  assert.ok(!links.includes("sistemas/sccer/asp/sccer00203"), "o motor não gera URL do serviço de pessoa (só documenta a decisão)");
  assert.match(css, /\.pref-pessoa-form input\{[^}]*min-height:44px/, "piso mobile de 44px nos campos");
});

test("UX-P: CSS do callout e do chip existe no design system do painel", () => {
  assert.ok(css.includes(".pref-dica{"), "callout com fundo brand-soft");
  assert.ok(css.includes(".pref-num{"), "chip mono");
  assert.ok(css.includes(".pref-acts{"), "grade 2 colunas vira 1 no mobile");
  assert.match(css, /@media\(max-width:520px\)\{\.pref-acts\{grid-template-columns:1fr\}\}/);
});
