# Project Milestones: Radar Fundiário Goiânia

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
