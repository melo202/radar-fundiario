# Auditoria S-B — LGPD / PII / Exposição de Dados

- **Data:** 2026-07-10
- **Auditor:** Fable 5 (Claude Opus 4.8) — auditor de segurança S-B, SOMENTE LEITURA
- **Escopo:** diff `v2.2..HEAD` (27 commits: lapidação Fable 5 + busca + petróleo), com contexto do arquivo inteiro `radar-goiania.html`
- **Contexto de deploy:** app HTML único, 100% client-side, prestes a ser **EXPOSTO PUBLICAMENTE** (VPS + domínio, URL indexável). Consome o cadastro fiscal da prefeitura de Goiânia (dado de TERCEIRO) e persiste um caderno no IndexedDB do navegador.

## Veredito de topo

**A arquitetura anti-PII está INTACTA e NÃO foi tocada pelos 27 commits desde a v2.2.** O `git diff v2.2..HEAD` não adiciona nem remove nenhuma linha em `sanitiza`/`SENS`/`CADERNO_ALLOW`/`DIFF_ALLOW`/`sanitizeCaderno`/`loadCi`/`compsStats`/`exportCSV`/`radar_prof`. As barreiras A-05/A-08/A-09/A-10 foram todas fechadas na Fase 20 (v2.2) e continuam firmes. A lapidação Fable 5 mexeu em render, estética, modos de busca e templates — não nas fronteiras de PII.

Não encontrei **nenhum vazamento de PII de terceiro para DOM, IndexedDB, localStorage ou export.** Achado de código é 1, de baixa severidade (inconsistência, não vazamento efetivo). O restante são **decisões do dono** intrínsecas a expor publicamente um app que exibe dado cadastral de terceiros.

---

## Achados

### [SB-01] radar-goiania.html:4108-4110 | BAIXA | vazamento-código | Fallback de enquadramento de bairro baixa `outFields:"*"` e é o ÚNICO caminho de ingestão que NÃO chama `sanitiza()`

**Evidência:**
```js
const d=await jsonp({where:`cdbairro=${+code} AND vlvenal>0`,outFields:"*",...resultRecordCount:40...});
const pts=(d.features||[]).map(f=>f.attributes).filter(a=>a.x_coord&&a.y_coord).map(a=>toWGS(a.x_coord,a.y_coord));
```
Todos os outros caminhos de consulta (`loadCi` 3925, `identifyPoint` 3944, `territorio` 4214/4266, `compsStats` 6787, `LOTINFO` 3773, busca 5031) fazem `sanitiza((d.features||[]).map(f=>f.attributes))`. Este fallback (usado só quando o polígono do bairro não casa por acento) baixa `*` (inclui `dtnascimen`/`nmproprie`/etc. pelo fio) e mapeia direto para coordenadas sem `sanitiza()`. Os atributos crus ficam num `const` local transitório e são coletados pelo GC; **nada é renderizado nem persistido** — daí BAIXA. Ainda assim: (a) quebra a convenção "sanitiza em toda fronteira de ingestão"; (b) transfere PII pela rede sem necessidade (só precisa de `x_coord,y_coord`).

**Proposta:** trocar `outFields:"*"` por `outFields:"x_coord,y_coord"` neste jsonp (elimina o download de PII e torna o `sanitiza` desnecessário aqui de forma estrutural).

---

### [SB-02] radar-goiania.html (deploy público) | ALTA | decisão-do-dono | App anônimo exibe inscrição + valor venal + endereço de imóveis de terceiros a qualquer visitante

**Evidência:** sem camada de autenticação; `finish()`/`showDetail()`/`exportCSV()` (cabeçalho `inscricao;ci;bairro;quadra;lote;endereco;...;valor_venal;...`, linha 7832) entregam a ficha e a planilha do imóvel a qualquer um que abra a URL. O nome/CPF/data-nasc do titular são removidos por `sanitiza` (SENS, linha 1446) — então **não há dado de pessoa natural nominal** exibido. O que fica exposto é dado cadastral do IMÓVEL (inscrição, endereço, área, venal, uso).

**Superfície a avaliar (NÃO é parecer jurídico — mapeamento):**
- **Finalidade / base legal:** o dado vem do cadastro fiscal da prefeitura (origem de terceiro). Expor num domínio próprio muda a finalidade original — o dono precisa definir a finalidade declarada e a base de legitimação.
- **Dado pessoal de pessoa natural identificável?** Isoladamente, endereço + inscrição sem nome não identifica diretamente uma pessoa. Mas endereço residencial de imóvel de pessoa física, cruzado com fontes externas, pode reidentificar. Ponto para o dono (advogado) avaliar caso a caso.
- **Indexação:** URL indexável = mecanismos de busca podem cachear fichas individuais. Avaliar `robots.txt`/`<meta name=robots noindex>` na rota `?insc=`.

**Proposta:** decisão do dono. Documentar finalidade + base legal; decidir se a rota `?insc=` deve levar `noindex`; considerar aviso de origem do dado (cadastro público municipal) e canal de contato do titular.

---

### [SB-03] radar-goiania.html:6660-6665, 5994 | MÉDIA | decisão-do-dono | Deep-link `?insc=` compartilhável expõe uma ficha de imóvel específica

**Evidência:**
```js
// copyLink() 6663-6665
const url=location.origin+location.pathname+"?insc="+encodeURIComponent(insc);
navigator.clipboard.writeText(url)
// botão 5994: "Copia um link direto para este imóvel (?insc=...) — cole no WhatsApp/e-mail"
// init 8008-8014: ?insc= no load dispara buscar() e abre a ficha automaticamente
```
Funcionalidade nova/tocada na lapidação (BUSCA-09). O link permite compartilhar via WhatsApp/e-mail uma ficha que abre direto num imóvel de terceiro. Sem PII nominal (sanitizado), mas é um ponteiro persistente e compartilhável para um imóvel específico. A inscrição vai só no query string do PRÓPRIO domínio (não é enviada a terceiros pela URL de forma indevida — é o identificador cadastral, não PII de pessoa).

**Proposta:** decisão do dono — mesma avaliação de finalidade do SB-02, com atenção a que o link é feito para SAIR do app (mensageria). Se a rota `?insc=` levar `noindex` (SB-02), o deep-link continua funcional mas não vira página indexada.

---

### [SB-04] radar-goiania.html:7434, 7358-7362, 6048-6059 | MÉDIA | decisão-do-dono | localStorage persiste PII do PRÓPRIO usuário (corretor) e imóveis pesquisados — vaza em dispositivo compartilhado

**Evidência:**
- `radar_prof` grava em texto puro o perfil do corretor: `nome`, `creci`, `cnai` (`localStorage.setItem("radar_prof",JSON.stringify(LZ.prof))`, linha 7434; campos em 7358-7362).
- `radar_historico` e `radar_oportunidades` guardam imóveis pesquisados/marcados (6048-6059).
- Caderno (IndexedDB) guarda notas/status por lote (allowlist CADERNO_ALLOW — sem PII de terceiro, confirmado).
Num dispositivo compartilhado (lan-house, PC de imobiliária, navegador sem perfil por usuário), o próximo usuário vê nome/CRECI/CNAI e o histórico do anterior. É PII do PRÓPRIO usuário e comportamento esperado de app client-side, mas hoje não é documentado nem há botão de "limpar meus dados".

**Proposta:** decisão do dono — documentar no app (ou numa nota de privacidade) que perfil/histórico/caderno ficam no navegador local; considerar um botão "apagar meus dados deste dispositivo" (limpa `radar_*` + IndexedDB).

---

### [SB-05] radar-goiania.html:6937-6978, 7000-7059 | BAIXA | decisão-do-dono | Módulo Negociação coleta PII de terceiros (nome, CPF/CNPJ, endereço) — apenas em memória, nunca persistido

**Evidência:** o wizard NEG coleta `nome`/`doc`(CPF/CNPJ)/`endereco` de proponente, vendedor, comprador, proprietário (7004-7059). A verificação confirma que **`NEG` NUNCA é persistido** — `let NEG=null` (6937), descarte no fechar (`NEG=null; /* privacidade por design (NEG nunca persistido) */`, 6978), comentário de topo (1388). O dado digitado flui só para o PDF gerado (minuta/proposta/contrato), que fica sob controle do usuário. Nada vai a localStorage/IndexedDB/rede.

**Proposta:** decisão do dono — comportamento correto (privacidade por design). Só registrar que, ao gerar o PDF, o corretor passa a ser controlador daquela PII de terceiros (dever de guarda do documento gerado). Nenhuma ação de código necessária.

---

## Verificado LIMPO (provado por leitura de código)

1. **Ingestão — `sanitiza()` (SENS denylist, 1446-1447)** remove `dtnascimen, cpf, cnpj, nmcontrib, nmproprie, nome` na entrada de TODOS os caminhos de consulta ao cadastro, exceto o fallback do SB-01 (que só extrai coordenadas). `loadCi` (3925) e `compsStats` (6787) — os dois caminhos que a auditoria pediu para checar, ambos com `outFields:"*"` — chamam `sanitiza` ANTES de qualquer uso. A-05 e A-08 confirmados intactos.
2. **Persistência — allowlist POSITIVA `CADERNO_ALLOW` (2707) + `sanitizeCaderno` (2726)**: só 19 chaves cadastrais/operacionais sobrevivem; nenhuma é PII de titular. Um campo sensível novo do endpoint jamais passaria por padrão (fail-safe).
3. **Snapshot do diff — allowlist RECURSIVA (2740-2749)**: o sub-objeto `snapshot` é reconstruído campo-a-campo por `DIFF_ALLOW` (`vlvenal, areaedif, vlimp98, uso, dtinclusao`, linha 2797) — `dtnascimen`/`cpf` dentro de um snapshot importado NUNCA sobrevive. Snapshot que não seja objeto plano é descartado inteiro.
4. **Import de JSON — `validarImportCaderno` (2765) + `mergeCadernoImport` (2781)**: cada item passa por `sanitizeCaderno` (allowlist preservada); item sem `ci` válido (regex `CADERNO_CI_RE`) é descartado; merge por `ci` só sobrescreve com item mais novo. `endereco` importado é truncado a 120 chars (A-09, linha 2732). Nenhuma PII entra pelo import.
5. **Ficha aberta pelo Detector — `abrirFichaDetector` → `loadCi` (4938-4945)**: rehidrata via `loadCi`, que sanitiza; a ficha renderizada nunca vê os campos PII (foram deletados do objeto).
6. **Export CSV (`exportCSV`, 7830)**: cabeçalho não contém nenhum campo de titular; lê de `LAST` (já sanitizado); anti CSV-injection (`csvCell`, 7828) preserva `=+-@`.
7. **Export JSON do caderno (`cadernoExportarJSON`, 6308)**: exporta itens do caderno (allowlist CADERNO_ALLOW) — sem PII de terceiro.
8. **AI Seam (8408-8478)**: dormant (`enabled:false`), fisicamente separado do núcleo, sem call-sites, com whitelist POSITIVA de entrada (`ALLOWED=[bairro,uso,faixaPreco]`, 8450) que reconstrói o objeto — estruturalmente impossível vazar PII para IA externa. `apiKey:null` (nenhuma chave embutida no arquivo público).
9. **Grep negativo confirmado:** `dtnascimen`/`nmproprie`/`nmcontrib` aparecem SOMENTE na lista `SENS` (1446) e em comentários/allowlists de proteção — ZERO referências em contexto de render (`innerHTML`/template) ou de persistência.
10. **Diff `v2.2..HEAD`:** nenhuma linha `+`/`-` toca `sanitiza`, `SENS`, `CADERNO_ALLOW`, `DIFF_ALLOW`, `sanitizeCaderno`, `outFields`, `exportCSV` ou `radar_prof`. As únicas adições com "endereco" são a heurística de detecção de busca BUSCA-06 (parsing do que o usuário digita, não dado de titular).
