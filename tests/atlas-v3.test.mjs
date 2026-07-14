import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../radar-goiania.html", import.meta.url), "utf8");

test("dossiê expõe três níveis curtos com semântica de abas", () => {
  assert.match(html, /class="dossier-tabs" role="tablist" aria-label="Níveis do dossiê"/);
  const tabs = [
    ["dTabResumo", "dViewResumo", "Resumo"],
    ["dTabTerritorio", "dViewTerritorio", "Território"],
    ["dTabDiligencia", "dViewDiligencia", "Diligência"],
  ];
  for (const [tab, panel, label] of tabs) {
    assert.match(html, new RegExp(`id="${tab}" role="tab"[^>]+aria-controls="${panel}"[^>]*>${label}<\\/button>`));
    assert.match(html, new RegExp(`id="${panel}" role="tabpanel" aria-labelledby="${tab}"`));
  }
});

test("conteúdo existente é redistribuído sem duplicar motores ou identificadores", () => {
  for (const id of [
    "dValor", "dScores", "dLeitura", "dActsPrim", "dComps", "dGrid", "dUrbanistico",
    "dEvidence", "dHistory", "dDocChecklist", "dDiff", "dActsMore", "dMetodologia",
  ]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, `${id} deve continuar único`);
  }
  const resumoStart = html.indexOf('id="dViewResumo"');
  const territorioStart = html.indexOf('id="dViewTerritorio"', resumoStart);
  const diligenciaStart = html.indexOf('id="dViewDiligencia"', territorioStart);
  const detailEnd = html.indexOf('<!-- Fase 15 TERR-03', diligenciaStart);
  const resumo = html.slice(resumoStart, territorioStart);
  const territorio = html.slice(territorioStart, diligenciaStart);
  const diligencia = html.slice(diligenciaStart, detailEnd);
  for (const id of ["dValor", "dScores", "dLeitura", "dActsPrim"]) assert.ok(resumo.includes(`id="${id}"`));
  for (const id of ["dComps", "dGrid", "dUrbanistico"]) assert.ok(territorio.includes(`id="${id}"`));
  for (const id of ["dEvidence", "dHistory", "dDocChecklist", "dDiff", "dActsMore", "dMetodologia"]) assert.ok(diligencia.includes(`id="${id}"`));
});

test("troca de nível sincroniza painel, seleção, foco e teclado", () => {
  assert.match(html, /const DOSSIER_VIEWS=\{[\s\S]*resumo:[\s\S]*territorio:[\s\S]*diligencia:/);
  assert.match(html, /function setDossierView\(view,focusTab\)[\s\S]*aria-selected[\s\S]*panel\.hidden=!active[\s\S]*dataset\.dossierView=view/);
  assert.match(html, /function dossierTabKey\(event\)[\s\S]*ArrowRight[\s\S]*ArrowLeft[\s\S]*Home[\s\S]*End[\s\S]*setDossierView\(order\[i\],true\)/);
  assert.match(html, /\.dossier-view\[hidden\]\{display:none!important\}/);
});

test("cada imóvel reabre em Resumo e a análise territorial leva ao nível correto", () => {
  assert.match(html, /function showDetail\(a,ll\)[\s\S]*const d=document\.getElementById\("detail"\);\s*setDossierView\("resumo"\)/);
  assert.match(html, /onclick="setDossierView\('territorio'\);compare\(\)"[^>]*>Analisar vizinhança<\/button>/);
});
