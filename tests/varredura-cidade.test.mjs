/* Cidade inteira (19/07/2026): a varredura cobre os 715 bairros do cadastro por uma
   janela de rotação determinística — sem estado em banco, idempotente a re-execuções,
   dentro da cota Brave (fixos + lote ≈ 40 buscas/noite ≈ 1.200/mês). */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAIRROS_PADRAO, janelaRotacao, listaCidade } from "../motor/varredura.js";

const src = readFileSync(new URL("../motor/varredura.js", import.meta.url), "utf-8");
const deploy = readFileSync(new URL("../motor/deploy-api.sh", import.meta.url), "utf-8");

test("lista da cidade: bairros do cadastro normalizados, sem duplicata de consulta", () => {
  const lista = listaCidade();
  /* 715 nomes brutos viram ~684 consultas únicas após normalizar (caixa/acento) —
     duplicata na rotação seria busca desperdiçada da cota Brave */
  assert.ok(lista.length >= 650, `esperava ~684 bairros únicos, veio ${lista.length}`);
  assert.equal(new Set(lista).size, lista.length, "sem duplicatas");
  assert.ok(lista.includes("setor bueno"));
  assert.ok(lista.every(b => b === b.toLowerCase() && !/[À-ÿ]/.test(b)), "consulta sem maiúscula e sem acento");
});

test("rotação: determinística por dia, sem repetir os fixos, com wrap-around", () => {
  const lista = listaCidade();
  const a = janelaRotacao(lista, 100, 20);
  const b = janelaRotacao(lista, 100, 20);
  assert.deepEqual(a, b, "o mesmo dia produz sempre a mesma janela (re-execução idempotente)");
  assert.equal(a.length, 20);
  const fixos = new Set(BAIRROS_PADRAO);
  assert.ok(a.every(x => !fixos.has(x)), "janela nunca duplica os fixos da noite");
  const resto = lista.filter(x => !fixos.has(x));
  const ultimaJanela = janelaRotacao(lista, Math.floor(resto.length / 20), 20);
  assert.equal(ultimaJanela.length, 20, "wrap-around: a janela nunca encolhe no fim da lista");
});

test("rotação: a união das janelas de um ciclo cobre TODOS os bairros não-fixos", () => {
  const lista = listaCidade();
  const fixos = new Set(BAIRROS_PADRAO);
  const resto = lista.filter(x => !fixos.has(x));
  const noites = Math.ceil(resto.length / 20);
  const vistos = new Set();
  for (let d = 0; d < noites; d++) janelaRotacao(lista, d, 20).forEach(b => vistos.add(b));
  assert.equal(vistos.size, resto.length, "nenhum bairro fica de fora do ciclo");
});

test("varrer: aceita tipo explícito (backfill) e monta a noite com fixos + rotação", () => {
  assert.ok(src.includes('tipo = tipo || ((dia % 2 === 0) ? "apartamento" : "casa")'));
  assert.ok(src.includes("VARREDURA_LOTE_ROTACAO"), "lote da rotação ajustável por env, sem redeploy");
  assert.ok(src.includes("[...BAIRROS_PADRAO, ...janelaRotacao(listaCidade(), diaIndex, lote)]"));
  assert.ok(deploy.includes("node --check varredura.js"), "deploy valida a varredura");
});

/* Auditoria 20/07: 21% do intake era outra cidade — o Brave relaxava o termo goiania
   em bairros de cauda, e o pré-filtro não existia (a IA pagava pela peneira reprovar). */
test("precisão de cidade: goiania ENTRE ASPAS na consulta e portal com override explícito", async () => {
  assert.ok(src.includes('${bairro} "goiania" venda'), "termo citado é exigido pelo Brave");
  assert.ok(src.includes('if (portal === undefined) portal = PORTAIS_ALVO['), "portal:\"\" (geral) é respeitado — só undefined cai na rotação do dia");
  const { passaPreFiltro } = await import("../motor/ingerir.js");
  assert.equal(passaPreFiltro({ titulo: "Apartamento no Cambuí, Campinas - SP", descricao: "2 quartos", url: "https://portal.com/x" }), false,
    "snippet sem Goiânia não ganha extração de IA");
  assert.equal(passaPreFiltro({ titulo: "Casa no Setor Bueno", descricao: "…", url: "https://www.olx.com.br/goiania-e-regiao/casa-123" }), true,
    "Goiânia na URL basta");
  const ingerirSrc = readFileSync(new URL("../motor/ingerir.js", import.meta.url), "utf-8");
  assert.ok(ingerirSrc.includes("if (!passaPreFiltro(a)) { stats.semGoiania"), "descarte acontece ANTES de gastar IA");
  const gate = ingerirSrc.indexOf("passaPreFiltro(a)");
  assert.ok(gate > 0 && gate < ingerirSrc.indexOf("stats.tentativasExtracao++"), "pré-filtro vem antes da tentativa de extração");
});

/* 21/07: a cota mensal do Brave ESGOTOU no meio do mega (http 402) — as 3 ondas finais
   martelaram 515 buscas mortas. Cota esgotada é estado do MÊS, não do bairro. */
test("cota esgotada (402): a ronda aborta na primeira e o corretor sabe de onde veio o número", async () => {
  assert.ok(src.includes('/brave http 402/.test(String(e.message))'), "varredura detecta cota morta");
  assert.ok(src.includes("abortadoPorCota = true"), "aborto registrado no resumo (auditável)");
  const mercadoSrc = readFileSync(new URL("../motor/mercado-aovivo.js", import.meta.url), "utf-8");
  assert.ok(mercadoSrc.includes("ingestao.falhas >= ingestao.consultas"), "aviso só quando TODA busca ao vivo falhou");
  assert.ok(mercadoSrc.includes("Resultado calculado sobre o acervo"), "fallback determinístico declarado, nunca beco (P0)");
  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.ok(app.includes("pesquisa?.aviso"), "o card do dossiê mostra o aviso nos dois caminhos");
});

/* 21/07 ("a onda de casas foi horrível, temos que rever"): 1.199 anúncios buscados com a
   cadeia de IA no chão = cota Brave queimada para deixar snippet cru, e NINGUÉM avisado.
   Regra nova: 3 bairros seguidos com toda extração falhando abortam a ronda, e toda
   degradação aparece no resumo, no status ao vivo e na Sala de Máquinas. */
test("extração no chão: ronda aborta após 3 bairros seguidos e a degradação nunca é silenciosa", () => {
  assert.ok(src.includes("extracaoNoChaoSeguidos"), "contador de colapso da cadeia existe");
  assert.ok(src.includes("extracaoNoChaoSeguidos >= 3"), "3 bairros seguidos sem nenhuma extração = para");
  assert.ok(src.includes("abortadoPorExtracao = true"), "aborto por extração auditável no resumo");
  assert.ok(src.includes("resumo.falhasExtracao += s.falhasExtracao"), "falhas de extração agregadas na ronda");
  assert.ok(src.includes("falhasExtracao: resumo.falhasExtracao"), "status ao vivo carrega a degradação");
  const maquina = readFileSync(new URL("../motor/maquina.html", import.meta.url), "utf-8");
  assert.ok(maquina.includes("extração no chão — ronda abortada"), "Sala de Máquinas grita o aborto");
  assert.ok(maquina.includes("2ª chance automática"), "falha de extração aparece com a promessa de recuperação");
});
