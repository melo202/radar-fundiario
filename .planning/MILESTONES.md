# Project Milestones: Radar Fundiário Goiânia

## v2.0 Mapa-first + Motion + Satélite (Shipped: 2026-07-05)

**Delivered:** A tela inicial virou o mapa interativo de Goiânia — bairros em linha, hover/toque mostra o nome, clique dá zoom e revela as divisões dos lotes; a busca virou uma pill flutuante; movimento fluido no app todo; camada de satélite alternável; e um encaixe de IA externa isolado e desativado. Núcleo cadastral segue 100% determinístico.

**Phases completed:** 6 fases, 12 planos, 17 tarefas

**Key accomplishments:**

- **Fundação de dados (Fase 1):** GeoJSON estático de 1.206 bairros gerado offline (paginação provada, reprojeção UTM-22 verificada), sem tocar o endpoint frágil no boot. Descoberta que reverteu a premissa: o endpoint **aceita** `returnGeometry=true` — a geometria de bairro/lote já existia, era só expor.
- **Home = Mapa (Fase 2):** app abre no mapa (mobile e desktop full-bleed), busca rebaixada para pill flutuante sempre acessível, coach-mark de 1º uso — verificado ao vivo no navegador.
- **Render + drill (Fase 3):** bairros em linha (Canvas), realce+nome no hover/toque (função única), clique→fitBounds→lotes via `refreshLots()` no zoom≥17, contornos somem no zoom de lote, breadcrumb Goiânia › Bairro. Bueno (~57k lotes) não trava.
- **Satélite (Fase 4):** toggle deliberado ruas⇄satélite (Esri World Imagery keyless) + overlay de rótulos, contornos legíveis sobre a imagem, crossfade de 250ms, e o fix de CSP que viabilizou os tiles — tudo verificado ao vivo (tiles 200 OK).
- **Seam de IA dormant (Fase 5):** `AI_CONFIG{enabled:false}` + `pesquisarMercadoIA()` num IIFE isolado, input whitelisted (barreira anti-PII), fail-to-null, zero call-sites, zero chave embutida — security review CLEAN.
- **Motion (Fase 6):** Motion (motion.dev) v12.42.2 embutido inline (eval-scan clean, sem CDN/CSP/sw novo), transições de tela, spring do bottom-sheet, stagger first-render e tap feedback — tudo com `prefers-reduced-motion` e progressive enhancement (app funciona sem Motion).

**Stats:**
- Tudo no arquivo único `radar-goiania.html` + novos: `bairros-goiania.json` (1.206 polígonos, ~167KB gz), `gerar-bairros.py`, `check-bairros-geojson.py`; `sw.js` → `radar-v5`.
- GSD: 6 fases, 12 planos, 17 tarefas; cada fase com research/plano/checagem/execução/review/verificação; verificação ao vivo no navegador (preview) por fase.
- Auditoria de milestone: **passed**, 14/14 requisitos, integração coerente.

**What's next:** v2.1+ — ferramentas do corretor (prioridade Território/captação: painel do setor, heatmap R$/m², lote subutilizado, farming), ativação da pesquisa de mercado por IA (proxy/BYO-key), e (stretch) ortofoto própria de Goiânia.

---

[Entries in reverse chronological order — newest first]

## v1.0 MVP + Inteligência + Mobile (Shipped: 2026-07-03)

**Delivered:** Localizador de imóveis de Goiânia (arquivo único HTML) com quatro formas de busca, análise estatística de mercado, laudo em PDF e experiência mobile premium.

**Phases completed:** Pré-GSD (desenvolvimento ad-hoc, documentado em ROADMAP-radar.md)

**Key accomplishments:**

- Busca confiável por quadra/lote, endereço, inscrição e clique no mapa (filtro server-side corrigiu o bug crítico dos setores grandes)
- Camada de inteligência determinística: comparáveis da vizinhança (mediana + Q1–Q3, Tukey, selo de confiança), IPTU e idade no card
- Mobile premium: bottom sheet, telas Busca⇄Mapa, alvos ≥44px, safe-area, PWA instalável
- Laudo de avaliação em PDF (wizard 4 passos, PTAM/relatório de referência)
- Oportunidades Caixa plotadas no mapa; robustez (escape HTML, retry/backoff, acessibilidade AA, export CSV)

**Stats:**

- App em arquivo único `radar-goiania.html` (~125 KB) + `caixa-goiania.js`, `atualizar-caixa.py`, PWA (manifest/sw/ícones)
- Documentação extensa: PROJETO-radar.md, ROADMAP-radar.md, INTELIGENCIA-radar.md, IDEIAS-hub-corretor.md, AUDITORIA-2026-07-03.md
- ~2 dias de desenvolvimento intenso (02–03/07/2026)

**Git range:** desenvolvimento inicial → `ec9f129` (fix laudo PDF)

**What's next:** v2.0 — redesenho mapa-first (home = mapa interativo de Goiânia com bairros e divisões de lotes), motion no app todo, camada satélite, e encaixe dormant para IA de pesquisa de mercado.

*Nota: milestone v1.0 reconstruída retroativamente ao inicializar a estrutura GSD em 2026-07-04. O trabalho foi feito antes da adoção do GSD; as fases não foram rastreadas individualmente.*

---
