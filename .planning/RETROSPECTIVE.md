# Retrospective — Radar Fundiário Goiânia

> Retrospectiva viva, atualizada a cada milestone.

## Milestone: v2.1 — Cockpit Comercial

**Shipped:** 2026-07-10
**Phases:** 13 (7-18, incl. 11.1) | **Plans:** 41 | **Tasks:** 96
**Timeline:** 2026-07-05 → 2026-07-10 (6 dias; Fases 14-18 executadas em modo autônomo em ~2 dias)
**Commits:** ~330 | **Diff:** 198 arquivos, +44.174/−1.666 linhas | **Testes:** 107 → 239 (todos verdes)

### What Was Built

O Radar saiu de "consulta cadastral" para **cockpit comercial**: busca única com detecção de intenção; ficha conclusão-primeiro com scores determinísticos explicáveis; ações prontas (WhatsApp/captação/salvos); documentos em 3 níveis + minutas de negociação com guarda jurídica; prédio como objeto comercial; refino visual/pinos semânticos/motion/onboarding; gate de linguagem §26; Território completo (setor-scan compartilhado com orçamento, choropleth, painel, detector de subutilizado, caderno IndexedDB, diff de cadastro, cruzamento Caixa); Inteligência Urbanística do Plano Diretor 2022 com números conferidos na fonte primária.

### What Worked

- **Funções puras no RADAR_PURE + TDD via node:vm slice** — toda decisão testável sem DOM/rede; a suíte (239 testes, ~120ms) rodou verde após cada commit de cada task, pegando regressões cedo.
- **Verificação ao vivo no navegador (preview) pelo orquestrador** — converteu checkpoints humanos em evidência real (PII no IndexedDB, orçamento de requisições no Bueno, XSS, diff, bateria do PD) e **achou um bug de produção** que os greps não pegariam (Mapa_ModeloEspacial rejeita outFields restrito).
- **Plan-checker com verificação de âncoras contra o código real** — pegou 3 blockers de wiring antes da execução (lotStyle em setSatelite, usos nunca renderizado, estado sem-unidade indefinido).
- **Pesquisa com gate de verdade na fonte primária** — baixar e ler o PDF da LC 349/2022 resolveu a divergência 6x/7,5x que as fontes secundárias não resolviam; a REGRA DE OURO (número não-conferido nunca renderiza) virou guard estrutural testado.
- **Cadeia review→fix por fase** — 25+ findings corrigidos no ciclo (incl. 1 XSS crítico na Fase 16 e 2 CRITICALs retroativos da Fase 13 achados pela auditoria do milestone).

### What Was Inefficient

- **Fase 13 fechou sem verificação nem fix do review** (pré-autonomia) — os 2 CRITICALs (pinos sempre cinza; skeleton preso) ficaram 3 dias no código até a auditoria do milestone pegar. Lição: o ciclo review→fix→verify precisa rodar NA fase, nunca depois.
- **Gate de linguagem (F14) rodou antes das superfícies de F15-18 existirem** — exigiu re-varredura no fim. Gates de release devem ser a última fase ou re-executar incrementalmente.
- **Documentação de quirks do endpoint divergente entre serviços** — "só outFields=*" era verdade para o Modelo Espacial mas não para o cadastro (e vice-versa a suposição da Fase 15); cada serviço ArcGIS precisa de verificação própria, documentada por serviço.
- Tabela de rastreabilidade do REQUIREMENTS.md não é auto-sincronizada pelos executores — defasou por 6 fases até a auditoria.

### Patterns Established

- Orçamento de requisições HARD com contador instrumentado + cache/dedupe por chave (TERRCACHE/PDCACHE/ZONACACHE/PDQUADRACACHE).
- Allowlist positiva (nunca blocklist) para qualquer persistência (sanitizeCaderno, recursiva em snapshots).
- Handlers via data-attributes — NUNCA interpolar valor em string JS de on* (lição do XSS CR-01/F16).
- Honestidade estatística: amostra sempre rotulada; número não-conferido nunca exibido; fallback gracioso rotulado.
- Paletas temáticas (choropleth/zonas) sempre fora do vocabulário --status-* dos pinos.

### Key Lessons

1. Verificação ao vivo de endpoint ≠ verificação de código: os dois pegam classes diferentes de bug; fazer ambos.
2. Auditoria de milestone deve verificar TODAS as fases têm VERIFICATION.md + review fixado — não confiar no checkbox do ROADMAP.
3. Em app de arquivo único, waves são quase sempre sequenciais — o ganho está em pipeline de fases (discuss da N+1 durante execução da N), não em paralelismo intra-fase.

### Cost Observations

- Model mix (sessão autônoma F14-18): orquestrador + planners em opus; executores/pesquisadores/checkers em sonnet.
- Sessões: 1 sessão autônoma longa (F14-18 + lifecycle) + sessões manuais anteriores (F7-13).
- Notable: ~35 subagentes na sessão autônoma; fixes de plan-check aplicados inline pelo orquestrador quando cirúrgicos (economia de ~1 iteração de planner por fase).

## Cross-Milestone Trends

| Milestone | Fases | Planos | Testes | Duração | Nota |
|-----------|-------|--------|--------|---------|------|
| v2.0 | 6 | 12 | — | 2 dias | Mapa-first + motion + satélite |
| v2.1 | 13 | 41 | 239 | 6 dias | Cockpit comercial completo; 1ª execução autônoma (F14-18) |
