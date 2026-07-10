# Phase 19: Estética Premium — Tipografia & Refinamento Visual - Research

**Researched:** 2026-07-10
**Domain:** Web fonts (@font-face/base64/WOFF2 variável), CSS elevation system, DOM focus-trap, CSP
**Confidence:** HIGH (todas as claims críticas foram VERIFICADAS via download real dos arquivos, grep no código-fonte e execução da suíte de testes — não há claims de payload/licença baseadas só em treinamento)

## Summary

O UI-SPEC (Archivo + JetBrains Mono, `@font-face` base64 inline) está tecnicamente correto e foi ratificado por esta pesquisa — mas **dois pontos do UI-SPEC precisam de correção antes do planning**, e um terceiro achado muda a estratégia de implementação para melhor.

**Achado 1 (crítico, bloqueante se ignorado):** o CSP do app (`radar-goiania.html` linha 7) **não declara `font-src`**. Por CSP spec, `font-src` ausente cai no fallback de `default-src 'self'`, que **não inclui `data:`**. Isso significa que `@font-face{src:url(data:font/woff2;base64,...)}` será **bloqueado pelo navegador** exatamente como a app já falha hoje (fonte declarada, nunca renderizada) — só que por CSP em vez de arquivo ausente. É necessário adicionar `font-src 'self' data:;` ao meta tag de CSP. Este item não estava em CONTEXT.md nem UI-SPEC.md.

**Achado 2 (corrige a contagem "194" e o "PDF herda automaticamente"):** o pipeline `#laudo`→`#laudoView` (a view de impressão/PDF) **não herda a fonte da página** — ele declara **uma TERCEIRA família, `"Open Sans"`**, em 14 ocorrências próprias (linhas 684-761), que **também nunca foi carregada** (mesmo bug, fallback igual a `Segoe UI`). O `@font-face` sendo global cobre a *definição*, mas os seletores `#laudo .lbrand .t`, `#laudo .preco .hero`, `#laudo .foot`, etc. têm `font:` hardcoded para `"Open Sans"` — essas 14 linhas **precisam ser editadas explicitamente** para `"Archivo"`/`"JetBrains Mono"`, senão o PDF gerado continua com Segoe UI mesmo depois do resto do app estar corrigido.

**Achado 3 (reduz o payload estimado pela metade, com folga extra de orçamento):** Google Fonts serve Archivo e JetBrains Mono como **fontes variáveis reais** — confirmado baixando os arquivos e comparando hashes: uma requisição por peso discreto (400, 500, 600, 700, 800) devolve **a mesma URL/arquivo** para o subset latin, e uma requisição explícita de range (`wght@400..800`) devolve `font-weight: 400 800` apontando para **o mesmo arquivo**. Isso significa que **2 arquivos** (1 Archivo variável + 1 JetBrains Mono variável), não 7, cobrem todos os pesos exigidos. Payload medido: **88.484 bytes de base64 total (86,4KB)** — bem abaixo do teto de 250KB do CONTEXT.md, e menos da metade da própria estimativa pessimista do UI-SPEC (150-215KB).

**Primary recommendation:** usar 2 blocos `@font-face` com `font-weight` em **range** (`400 800` para Archivo, `500 700` para JetBrains Mono), cada um apontando para o único arquivo variável já baixado e convertido em base64 no scratchpad (paths abaixo) — NÃO replicar em 5+2 blocos discretos (redundante, mesmo arquivo, mais texto CSS sem ganho). Adicionar `font-src 'self' data:;` ao CSP. Tratar as 14 ocorrências de `"Open Sans"` como parte do escopo de TYPO-01 (mesma migração, seletores diferentes).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Diagnóstico travado (causa raiz da "letra feia")**
- O app declara `"IBM Plex Sans"`/`"IBM Plex Mono"` em ~100 `font:`/`font-family:` MAS **não carrega nenhuma fonte** (zero `@font-face`, zero link/CDN) — o usuário vê o fallback `"Segoe UI"`/monospace do sistema. A correção NÃO é só trocar o nome da família: é **embutir a fonte de verdade**. *(Research nota: a contagem real é 194 declarações `font:`, 180 delas citando IBM Plex — ver Achado 2 acima para a correção completa incluindo "Open Sans".)*

**Tipografia (TYPO-01)**
- **Embutir via `@font-face` com WOFF2 em base64 DENTRO do HTML** (preserva arquivo único + offline/PWA + PDFs; sem CDN de fonte em runtime). Licença obrigatória: **OFL** (Google Fonts) — registrar a licença em comentário.
- **Orçamento de payload:** ≤ ~250KB de base64 total. Pesos mínimos: sans 400/500/600/700/800 + mono 500/700. Medir e registrar o payload real no SUMMARY.
- **Escolha da família:** decidida no UI-SPEC — Archivo (sans, 400-800) + JetBrains Mono (mono, 500/700). Rationale completo no 19-UI-SPEC.md, seção "A DECISÃO CENTRAL".
- **Aplicação:** substituir TODAS as declarações (grep completo em `font:`/`font-family:`) — nenhum resquício da família antiga; PDFs/documentos impressos usam a fonte nova; `letter-spacing`/pesos reajustados à métrica da fonte nova onde necessário.
- Fallback stack robusto por trás do `@font-face` (system-ui etc.) — se a fonte falhar, nada quebra.

**Refinamento estético (PREM-01)**
- Sistema de elevação consistente (2-3 níveis, tokens `--elev-*`) aplicado coerentemente a cards/sheets/dropdowns/toasts; radius consistente (mantém angularidade 1-2px).
- Microdetalhes premium: hover/active/focus refinados; divisores mais sutis; hierarquia tipográfica; polimento de chips/badges/inputs.
- Restrições invioláveis: cor só onde significa status (VIS-01); paleta papel/óxido intacta; AA sobre CARTO e satélite; `prefers-reduced-motion`; performance mobile.
- Escopo é ACABAMENTO, não re-layout: nenhum componente muda de lugar/estrutura.

**Focus-trap (A11Y-01 — fecha o IN-03 da Fase 13)**
- **Utilitário ÚNICO compartilhado** (`trapFocus(container)`/`untrapFocus()`) aplicado às 6 superfícies modais: `#onbOverlay`, `.wiz`(#laudoSheet), `#negSheet`, `#captSheet`, `#cmpSheet`, `#detail`/chooser — nunca 6 implementações.
- Tab/Shift+Tab circulam nos focáveis visíveis; Esc mantém a cadeia de prioridade existente; ao fechar, foco retorna ao gatilho.
- Não pode quebrar: cadeia de Esc atual, quirk iOS documentado, navegação por teclado da busca (combobox ARIA).

**Verificação**
- Suíte 239 verde sempre; parse dos blocos de script; verificação ao vivo (`document.fonts.check`), screenshot antes/depois, focus-trap testado com Tab simulado; PDF de exemplo gerado com a fonte nova.
- Payload do HTML antes/depois registrado.

### Claude's Discretion
- A escolha final da(s) família(s) e o pairing (com rationale) — já decidido no UI-SPEC (Archivo + JetBrains Mono).
- Valores exatos dos tokens de elevação — já decidido no UI-SPEC (`--elev-0/1/2/3`).
- Microcopy se precisar (§26) — nenhuma copy nova identificada nesta fase.

### Deferred Ideas (OUT OF SCOPE)
- Dark mode — não pedido; v2.3+
- Ícones customizados (substituir emoji) — v2.3+ (mudança maior de identidade)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPO-01 | Nova tipografia em todo o app (UI + mapa + sheets + PDFs), `@font-face` base64, fallback robusto, offline/PWA intacto, zero texto residual na fonte antiga | Payload real medido (86,4KB), 2 arquivos prontos em base64 no scratchpad, correção do CSP identificada, correção da contagem "194"→194+14 (Open Sans no PDF) identificada, mapa completo de `letter-spacing` existente |
| PREM-01 | Refinamento estético: elevação, acabamento, densidade — mantendo papel/óxido e cor-só-status | Inventário de 17 `box-shadow` ad hoc mapeados para os 4 tokens `--elev-*` já definidos no UI-SPEC; confirmado que a definição dos tokens não conflita com nenhum uso existente |
| A11Y-01 | Focus-trap único nas 6 superfícies modais, Esc preservado, foco retorna ao gatilho | Localizadas as 6 funções de abertura/fechamento exatas, variáveis de estado de foco já existentes (`onbLastFocus`, `WIZRET`, `CAPTRET`, `NEGRET`) e o gap onde não existe pattern (`#cmpSheet`, `#detail`/`#chooser`); cadeia de Esc mapeada linha a linha (7387-7422) |

## Project Constraints (from CLAUDE.md)

Não há `CLAUDE.md` na raiz do projeto (`.` — verificado, arquivo ausente). Nenhuma diretiva adicional a aplicar além do que já está em CONTEXT.md/UI-SPEC.md e nos quirks documentados no próprio `radar-goiania.html`/`ROADMAP-radar.md`.

## PARTE A — Aquisição real das fontes (VERIFICADO, arquivos baixados)

### Descoberta: ambas as famílias são servidas como fonte VARIÁVEL, não 7 arquivos estáticos

Processo de verificação:
1. `curl -A "Mozilla/5.0 ... Chrome/120..." "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"` → bloco `/* latin */` de cada um dos 5 pesos aponta para **a mesma URL** (`k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLydOxI.woff2`), verificado via `grep -B3 "format('woff2')"`.
2. Confirmação definitiva: requisição explícita de range `wght@400..800` devolve `font-weight: 400 800;` (não um valor único) apontando para o **mesmo hash** de arquivo. Isso é a sintaxe de fonte variável do Google Fonts (CSS Fonts Level 4).
3. Mesmo padrão confirmado para JetBrains Mono: pesos 500 e 700 apontam para a mesma URL; range `wght@500..700` confirma `font-weight: 500 700;`.
4. Arquivos baixados e verificados via magic bytes (`wOF2` no início do binário, `d09GMg` no início do base64) — íntegros, não corrompidos.

**[VERIFIED: download direto + comparação de hash + magic bytes]**

### Arquivos prontos (scratchpad — fora do repo, para o executor embutir)

Diretório: `C:\Users\bruno\AppData\Local\Temp\claude\C--Users-bruno-Documents-Projeto-Radar-Fundi-rio\06e93356-6a93-4753-a96e-6bf4ee4f85f0\scratchpad\fonts\`

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `archivo-variable-latin-400-800.woff2` | 34.928 bytes | Binário woff2, Archivo variável, latin subset, eixo `wght` cobrindo 400-800 |
| `archivo-variable-latin-400-800.b64.txt` | 46.572 chars | Base64 de uma linha só do arquivo acima — pronto para colar em `url(data:font/woff2;base64,...)` |
| `jetbrainsmono-variable-latin-500-700.woff2` | 31.432 bytes | Binário woff2, JetBrains Mono variável, latin subset, eixo `wght` cobrindo 500-700 |
| `jetbrainsmono-variable-latin-500-700.b64.txt` | 41.912 chars | Base64 de uma linha só do arquivo acima |
| `archivo.css` | — | Resposta crua do Google Fonts (5 blocos de peso discreto, para trilha de auditoria) |
| `jbmono.css` | — | Resposta crua do Google Fonts (2 blocos de peso discreto, para trilha de auditoria) |

**Payload medido (VERIFICADO, não estimado):**

| Item | Bytes brutos (woff2) | Bytes base64 |
|---|---|---|
| Archivo variável (400-800, latin) | 34.928 | 46.572 |
| JetBrains Mono variável (500-700, latin) | 31.432 | 41.912 |
| **Total** | **66.360 (64,8KB)** | **88.484 (86,4KB)** |

Fator de expansão base64 medido: 88.484 / 66.360 = 1,333 (o teórico exato de base64 é 4/3 ≈ 1,333 — bate certinho, confirma que os arquivos não foram alterados/corrompidos na conversão).

**Dentro do teto de ~250KB do CONTEXT.md com folga de ~164KB (65% de margem).** Muito abaixo da própria estimativa pessimista do UI-SPEC (150-215KB), porque o UI-SPEC assumiu 7 arquivos estáticos separados — na prática o Google Fonts já serve 2 arquivos variáveis.

### Licença — VERIFICADO (não apenas citado)

```bash
curl -s "https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/OFL.txt"
curl -s "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/OFL.txt"
```
Ambos retornam o texto integral da SIL Open Font License 1.1:
> "Copyright 2020 The Archivo Project Authors ... This Font Software is licensed under the SIL Open Font License, Version 1.1."
> "Copyright 2020 The JetBrains Mono Project Authors ... This Font Software is licensed under the SIL Open Font License, Version 1.1."

**[VERIFIED: google/fonts GitHub repo, caminho `ofl/` confirma a categoria de licença + texto integral do OFL.txt baixado]**

### Bloco `@font-face` recomendado (usar RANGE, não 7 blocos discretos)

```css
/* Fase 19 TYPO-01 — Archivo — Google Fonts — OFL 1.1 license —
   https://fonts.google.com/specimen/Archivo — subset latin — fonte variável,
   eixo wght 400-800 embutido num único arquivo — substitui "IBM Plex Sans" */
@font-face{
  font-family:"Archivo";
  font-style:normal;
  font-weight:400 800;
  font-display:swap;
  src:url(data:font/woff2;base64,XXXXXXXX) format("woff2");
}
/* Fase 19 TYPO-01 — JetBrains Mono — Google Fonts — OFL 1.1 license —
   https://fonts.google.com/specimen/JetBrains+Mono — subset latin — fonte
   variável, eixo wght 500-700 embutido num único arquivo — substitui
   "IBM Plex Mono" e "Open Sans" (pipeline de PDF) */
@font-face{
  font-family:"JetBrains Mono";
  font-style:normal;
  font-weight:500 700;
  font-display:swap;
  src:url(data:font/woff2;base64,YYYYYYYY) format("woff2");
}
```

`XXXXXXXX`/`YYYYYYYY` = conteúdo integral dos arquivos `.b64.txt` acima (uma linha cada, sem quebras).

**Por que range e não 5+2 blocos discretos:** o navegador já resolve range de `font-weight` numa fonte variável nativamente (CSS Fonts Level 4, suportado em todos os browsers modernos desde 2018 — Chrome 62+, Firefox 62+, Safari 11+) **[CITED: MDN — developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-weight, verificado via WebSearch 2026]**. Declarar 5+2 blocos apontando pro MESMO arquivo não economiza bytes (o navegador baixa o arquivo uma vez por URL, base64 idêntico repetido 5x infla o HTML em ~230KB extras à toa) e adiciona complexidade sem benefício. Único cuidado (nota do MDN): o navegador faz *clamping* de pesos fora do range declarado — como o app só usa 400/500/600/700/800 (dentro do range 400-800) e 500/700 (dentro do range 500-700), não há risco de clamping incorreto.

### `font-display: swap` vs `block`

**Recomendação: `swap`.** Como a fonte está embutida em base64 no mesmo arquivo (sem round-trip de rede), a janela de FOUT/FOIT é praticamente nula de qualquer forma — mas `swap` é o padrão que o próprio Google Fonts usa (confirmado nas respostas CSS baixadas, todos os blocos têm `font-display: swap`) e evita qualquer cenário de texto invisível caso o parse do bloco `<style>` (que é gigante, ~250KB de CSS) atrase minimamente a disponibilidade da fonte. `block` arriscaria texto invisível sem ganho real. **[VERIFIED: padrão observado nas respostas reais do Google Fonts]**

## PARTE B — Inventário do código-fonte (VERIFICADO via grep)

### Contagem de declarações de fonte — CORREÇÃO da premissa "194"

```
grep -c '"IBM Plex Sans"' radar-goiania.html   → 141
grep -c '"IBM Plex Mono"' radar-goiania.html   → 39
grep -c 'IBM Plex' radar-goiania.html          → 180  (141+39, nenhuma linha tem as duas)
grep -c 'font:' radar-goiania.html             → 194
grep -c 'font-family' radar-goiania.html       → 5
grep -c 'Open Sans' radar-goiania.html         → 14
```

**Confirmado: "194" no CONTEXT.md/UI-SPEC.md é a contagem de declarações `font:` (shorthand), não de "IBM Plex" especificamente.** Dessas 194, **180 citam IBM Plex** e as **14 restantes citam "Open Sans"** (180+14=194 — bate exatamente). As 14 de "Open Sans" estão TODAS dentro do pipeline `#laudo`/`#laudoView` (impressão/PDF), linhas 684-761 — **família diferente, mesmo bug** (nunca carregada, cai em `Segoe UI`).

Adicionalmente, **2 das 5 declarações `font-family:` puras** (fora do shorthand `font:`) também citam IBM Plex diretamente e precisam de troca:
- Linha 101: `font-family:"IBM Plex Sans","Segoe UI",system-ui,sans-serif` — regra raiz do `body`/app.
- Linha 897: `.leaflet-container{font-family:"IBM Plex Sans",sans-serif}` — **confirma que os tooltips/popups do Leaflet são DOM real** (não Canvas), então esta única linha corrige a tipografia de todo o mapa.

As outras 3 (`374`, `434`, `798`) usam `font-family:inherit` — não precisam de edição (herdam da raiz já corrigida na linha 101).

**Escopo total real de TYPO-01: 180 (IBM Plex) + 14 (Open Sans) + 2 (font-family pura, IBM Plex) = 196 pontos de edição de família**, mais os 3 `inherit` que já se resolvem sozinhos. Isso é uma correção pequena mas real sobre a premissa de "194" do CONTEXT/UI-SPEC — o planner deve tratar como "196 ocorrências, 3 famílias diferentes (IBM Plex Sans, IBM Plex Mono, Open Sans), 2 alvos (Archivo, JetBrains Mono)".

### Mapeamento de pesos existentes → tracking já aplicado (baixo risco)

`grep 'letter-spacing'` retornou **33 ocorrências**. A grande maioria já está alinhada com os valores-alvo do UI-SPEC:
- Mono/eyebrow: `.22em` (`.brand .eyebrow`), `.14em`, `.08em` (`.count`), `.07em` (vários `-lbl`/`-selo`), `.06em`, `.03em`, `.02em` — todos dentro da faixa `.06em`-`.22em` prescrita.
- Sans display/heading: `.brand h1{letter-spacing:-.02em}` já bate exatamente com o alvo do UI-SPEC (`-0.02em` para Display).
- Sans body/label: `.01em`, `0` (`.chk{letter-spacing:0!important}`) — já bate com o alvo (`0` a `0.01em`).

**Conclusão: reajuste de tracking é baixo risco/baixo esforço** — a maior parte dos valores já foi calibrada nas Fases 9-13 dentro da faixa que a nova fonte também usa; a mudança é principalmente a troca de `font-family`, não uma recalibração de tracking do zero. Único ponto de atenção real: dois `!important` (`.chk`) precisam ser preservados na migração (não removidos por acidente).

### `#laudo`/`#laudoView`: NÃO herda automaticamente — precisa edição própria

Contradição parcial ao UI-SPEC (seção "Estratégia de carregamento", último bullet): "como o `@font-face` é global... a impressão herda a fonte nova automaticamente" é **verdade só para a *disponibilidade* da fonte no documento** — mas os seletores `#laudo`/`#laudoView` têm `font-family` **hardcoded para "Open Sans"**, não `inherit`. Sem editar essas 14 linhas, o PDF gerado (e a tela `#laudoView` do PWA standalone iOS) continua declarando uma família que, mesmo agora corretamente definida via `@font-face`... **não seria a mesma família nova (Archivo/JetBrains Mono)** — o `@font-face` embutido nesta fase só declara `"Archivo"` e `"JetBrains Mono"`, NÃO `"Open Sans"`. Ou seja: se as 14 linhas de "Open Sans" não forem editadas, elas continuam quebradas exatamente como hoje (fallback pro `Segoe UI`/`Consolas` do sistema), só que agora o resto do app já estará com a fonte nova — pior ainda visualmente (dois estilos coexistindo).

**Ação correta:** tratar as 14 linhas de "Open Sans" como parte do MESMO grep/substituição de TYPO-01 — `"Open Sans"` → `"Archivo"` (blocos de peso 400/600/700/800, ex.: `.lbrand .t`, `.preco .hero`, `.subcard .st`) ou → `"JetBrains Mono"` (blocos que já são rótulo/eyebrow, ex.: `.lbrand .t small`, `.fr-faixa-lbl`, `.foot`) seguindo a MESMA lógica de papel (display/heading/body vs eyebrow/mono) já definida na tabela do UI-SPEC.

### Bloco `@media print` (linha 738-750) — confirmado, sem `@media print` extra necessário

```css
@media print{
  @page{margin:12mm 13mm 14mm}
  body.print-laudo>*{display:none!important}
  body.print-laudo #laudo{display:block!important}
  #laudo{font:400 10.5px/1.55 "Open Sans","Segoe UI",sans-serif; ...}
  #laudo .lcard{box-shadow:none}
  ...
  #laudo .lrun{... font:600 7.5pt/1 "Open Sans",sans-serif; ...}
}
```
O `@media print` **não precisa de um bloco `@font-face` próprio** — o `@font-face` definido fora de qualquer media query é global e cobre print automaticamente (isso SIM está correto no UI-SPEC). A única ação necessária é editar os 2 `font:` dentro deste bloco (linha 742, 749) trocando `"Open Sans"` → `"Archivo"`/`"JetBrains Mono"`, junto com as outras 12 ocorrências fora do `@media print` mas dentro do escopo `#laudo`/`#laudoView` (que é a MESMA tela reaproveitada pro PDF via impressão, conforme comentário do próprio código).

`#laudo .lcard{box-shadow:none}` (linha 744) confirma que o PREM-01 (sistema de elevação) **não se aplica dentro do contexto de impressão** — correto, papel impresso não tem sombra. Nenhuma ação adicional necessária aqui.

### Inventário de `box-shadow` ad hoc — mapeamento para `--elev-*` confirmado

`grep -c 'box-shadow'` → **17 ocorrências**. Mapeamento contra a tabela já definida no UI-SPEC:

| Linha | Valor atual | Contexto | Token alvo (UI-SPEC) |
|---|---|---|---|
| 38 | `--shadow:0 2px 0 rgba(20,26,31,.08)` | definição do token antigo | substituído pelos 4 tokens `--elev-*` |
| 145 | `0 8px 20px rgba(20,26,31,.18)` | `.combo-list` (dropdown) | `--elev-2` |
| 184 | `box-shadow:0 0 0 3px var(--accent)` | `@keyframes bldgflash` (ring de destaque, não elevação) | fora do sistema — mantido |
| 207 | `box-shadow:var(--shadow)` | genérico | `--elev-1` |
| 261 | `0 2px 8px rgba(0,0,0,.25)` | `.zapfab` (FAB) | `--elev-1` (per UI-SPEC, "flutua sobre o mapa") |
| 307 | `0 4px 14px rgba(20,26,31,.18)` | botão flutuante | `--elev-1` |
| 314 | `box-shadow:var(--shadow)` | genérico | `--elev-1` |
| 320 | `0 4px 14px rgba(20,26,31,.18)` | idem 307 | `--elev-1` |
| 334 | `box-shadow:var(--shadow)` | genérico | `--elev-1` |
| 344 | `box-shadow:var(--shadow)` | genérico | `--elev-1` |
| 383 | `0 8px 24px rgba(20,26,31,.3)` | `.onb-card` | `--elev-3` |
| 396 | `0 6px 20px rgba(20,26,31,.22)` | sheet (`.wiz`/similar) | `--elev-3` |
| 530 | `0 4px 14px rgba(20,26,31,.18)` | botão flutuante | `--elev-1` |
| 744 | `box-shadow:none` | `#laudo .lcard` (print) | fora do sistema — mantido (papel não tem sombra) |
| 890 | `0 4px 14px rgba(0,0,0,.25)` | `.toast` | `--elev-1` |
| 899 | `0 3px 10px rgba(20,26,31,.2)` | variante de toast/estado | `--elev-1` |
| 955 | `0 6px 20px rgba(20,26,31,.22)` | `.chooser` | `--elev-3` |
| 1119 | `box-shadow:0 0 0 2px var(--ink)` (inline) | ring de dot na legenda (não elevação) | fora do sistema — mantido |

Confirma exatamente a estrutura de 3 níveis (+ repouso `none`) já definida no UI-SPEC, sem sombras órfãs que não se encaixem nos 4 tokens propostos. 4 ocorrências (`184`, `744`, `1119`, e a definição de `--shadow` em `38`) são casos especiais já corretamente identificados como "fora do sistema" pelo próprio UI-SPEC.

### Focus-trap: âncoras exatas das 6 superfícies

| # | Superfície | Função de abertura (linha) | Variável de foco atual | Função de fechamento (linha) | Padrão de restauração atual |
|---|---|---|---|---|---|
| 1 | `#onbOverlay` | `onbAbrir(idx)` (7322) | `onbLastFocus` (capturado linha 7328) | `onbFechar()` (7340) | `if(onbLastFocus&&document.body.contains(onbLastFocus)) onbLastFocus.focus();` (7344) — padrão completo já existe, só trocar por `trapFocus`/`untrapFocus` |
| 2 | `.wiz`/`#laudoSheet` | `abrirSeletorFinalidade()` (6332) — **NOTA: não existe mais função `abrirLaudo()`**, foi substituída nesta função (comentário do próprio código, linha 6329-6331) | `WIZRET` (capturado linha 6336, `let WIZRET=null` declarado linha 6366) | `fecharLaudo()` (6367) | `if(WIZRET&&WIZRET.focus){try{WIZRET.focus();}catch(e){}}WIZRET=null;` — padrão completo já existe |
| 3 | `#negSheet` | `abrirNeg(tipo)` (6397) | `NEGRET` (capturado linha 6411, `let NEG=null, NEGRET=null` declarado 6396) | `fecharNeg()` (6418) | mesmo padrão de captura/restore (a confirmar linha exata do `.focus()` dentro de `fecharNeg`, não lido integralmente nesta pesquisa — grep confirma a função existe e é chamada consistentemente na cadeia de Esc) |
| 4 | `#captSheet` | `abrirCaptacao()` (6372) | `CAPTRET` (capturado linha 6382, `let CAPTRET=null` declarado 6371) | `fecharCaptacao()` (6388) | `if(CAPTRET&&CAPTRET.focus){try{CAPTRET.focus();}catch(e){}}CAPTRET=null;` (6390) — padrão completo já existe |
| 5 | `#cmpSheet` | `abrirComparacao()` (5093) | **NENHUMA** — só `close.focus()` (foca o botão de fechar, não captura o gatilho) | `fecharComparacao()` (5128) | **GAP CONFIRMADO: não restaura foco ao gatilho** — `fecharComparacao()` só faz `sheet.hidden=true`, sem `.focus()` de volta. Esta é a superfície com MAIS trabalho na migração (não tem pattern prévio pra reaproveitar) |
| 6 | `#detail`/`#chooser` | `showDetail(a,ll)` (5442) / abertura do chooser (linha 5322-5324, dentro de outra função) | **NENHUMA** captura explícita de gatilho vista no trecho lido | `closeDetail()` (7270) / `closeChooser()` (5327) | **GAP CONFIRMADO: nenhuma captura/restauração de foco hoje** — mesma situação do `#cmpSheet` |

**Cadeia de Esc (linha 7387-7422, `document.addEventListener("keydown", ...)`), ordem de prioridade EXATA a preservar:**
1. `#onbOverlay` (onboarding, modal-bloqueante, prioridade máxima) → `onbFechar()`
2. `#terrPanel` → `fecharTerrPanel()`
3. `#cmpSheet` → `fecharComparacao()`
4. `#negSheet` → `fecharNeg()`
5. `#captSheet` → `fecharCaptacao()`
6. `#caixaList` (dropdown) → `closeCaixaList()`
7. `#correctMenu` → `closeCorrectMenu()`
8. `#ambigChips` → hide direto
9. `#calc` → `fecharCustos()`
10. `#wiz` → `fecharLaudo()`
11. `#laudoView` → `fecharLaudoView()`
12. `#chooser` → `closeChooser()`
13. overlay de busca desktop (`view==="busca"` && !mobile) → `setView("mapa")` + foco em `#searchPill`
14. **else** → `closeDetail()` (catch-all, `#detail` não tem check explícito de visibilidade — é sempre o fallback)

**Implicação para o focus-trap:** o `#detail` é o único dos 6 que não é verificado por `hidden`/`classList.contains` na cadeia — é o ramo `else` final. O `trapFocus`/`untrapFocus` aplicado ao `#detail` não pode alterar essa estrutura de fallback (ex.: não pode fazer `untrapFocus()` ser chamado condicionalmente de um jeito que quebre o `else`).

**Quirk iOS (drag do bottom sheet, `SHEETDRAGY0`):** confirmado nas linhas 7425-7445, usa `touchstart`/drag listeners próprios no handle (`.grab`) do sheet — o utilitário de focus-trap usa só `keydown`, não conflita.

**Combobox ARIA:** os inputs de busca (`#insc`/`#rua`) fazem `stopPropagation()` no próprio Esc (comentário confirmado na linha 7422 `/* combo dá stopPropagation no seu Esc */`) — o trap nunca deve envolver o formulário de busca, só as 6 superfícies listadas.

**`prefers-reduced-motion`:** variável global `REDUCE` (linha 2929) já existe e é respeitada em toda a base (`mAnimate` retorna `null` quando `REDUCE` é true). O focus-trap não introduz nenhuma animação — não interage com `REDUCE`.

## PARTE C — Segurança: CSP precisa de `font-src` (achado crítico, não estava no CONTEXT/UI-SPEC)

CSP atual (linha 7 do HTML):
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'
```

Não há diretiva `font-src`. Por spec CSP (fetch directives fallback chain), fontes carregadas via `@font-face` são regidas por `font-src`; na ausência dele, o navegador cai para `default-src 'self'`, que **não inclui o esquema `data:`**. Isso bloqueia `url(data:font/woff2;base64,...)`.

**Comparação com o precedente do motion.dev (linha 18):** o comentário da linha 18 diz "no CSP change (script-src already 'unsafe-inline')" — isso é verdade para SCRIPT porque `script-src` já tinha `'unsafe-inline'` cobrindo o `<script>` inline. Fontes são um recurso diferente (`font-src`), não coberto por `script-src`/`style-src`/`img-src`. **O precedente do motion.dev NÃO se aplica aqui — este é, de fato, um CSP change novo, necessário.**

**Ação obrigatória:** adicionar `font-src 'self' data:;` à diretiva CSP. Não usar `font-src data:;` sozinho (perderia o `'self'` desnecessariamente) nem ampliar `default-src` (mudaria o comportamento de TODOS os recursos sem diretiva própria, superfície de mudança maior que o necessário).

## ASVS / Threat Pattern (security_enforcement ativo, ASVS L1)

| ASVS Category | Aplica | Controle padrão |
|---|---|---|
| V14 Configuration (CSP) | **sim** | Adicionar apenas `font-src 'self' data:;` — escopo mínimo necessário, não ampliar `default-src` genericamente |
| V5 Input Validation | não | Nenhum input novo do usuário nesta fase |
| V2/V3/V4 Auth/Session/Access | não | Fase é puramente visual/CSS/DOM, sem mudança de fluxo de dados ou autenticação |

| Pattern | STRIDE | Mitigação padrão |
|---|---|---|
| CSP permissivo demais (`default-src` ganhando `data:` globalmente por atalho) | Tampering/Elevation | Escopar a permissão SÓ em `font-src`, nunca em `default-src` |
| Base64 corrompido silenciosamente quebrando renderização | não seguro por padrão, mas risco de qualidade | Fallback stack (`"Segoe UI"`/`Consolas`) já garante degradação segura; testar `document.fonts.check()` no preview antes de finalizar |

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|---|---|---|---|
| Subsetting de fonte (reduzir glyphs pro alfabeto latino) | Ferramenta própria de subsetting (fonttools/pyftsubset manual) | O subset `latin` já vem pronto do Google Fonts CDN (`fonts.gstatic.com`), confirmado nos arquivos baixados | Google já mantém o subsetting; reinventar introduz risco de glyphs faltantes (acentuação pt-BR) sem ganho de payload (medido: já well abaixo do teto) |
| Focus-trap | 6 implementações independentes por sheet | O utilitário único `trapFocus`/`untrapFocus` já especificado no UI-SPEC (baseado no pattern `onbLastFocus`/`WIZRET`/`CAPTRET`/`NEGRET` já existente, generalizado) | Já é convenção do projeto reusar 1 função para N sheets (ver `onbAbrir`/`onbFechar` reaproveitado desde Fase 13); 6 implementações divergiriam em edge cases (elemento `offsetParent`, Shift+Tab) |
| Conversão manual woff2→base64 via site externo | Colar em ferramentas web de conversão (risco de trailing whitespace/newlines quebrando o data URI) | `base64 -w0 arquivo.woff2 > arquivo.b64.txt` (uma linha, sem quebra) — já feito nesta pesquisa | Ferramentas web variam em wrapping de linha; `base64 -w0` é determinístico e os arquivos já estão prontos no scratchpad |

**Key insight:** esta fase não introduz nenhuma dependência de build/npm — tudo é CSS/HTML/JS vanilla dentro do arquivo único, consistente com o padrão já estabelecido (motion.dev inline desde Fase 6).

## Common Pitfalls

### Pitfall 1: Esquecer o `font-src` no CSP
**What goes wrong:** os 2 blocos `@font-face` são adicionados corretamente, o payload está dentro do orçamento, mas a fonte continua não aparecendo — exatamente o mesmo sintoma do bug original.
**Why it happens:** CSP `font-src` ausente cai no fallback de `default-src 'self'`, que não permite `data:`.
**How to avoid:** adicionar `font-src 'self' data:;` ao meta tag ANTES de testar a renderização.
**Warning signs:** DevTools console mostra erro `Refused to load the font 'data:font/woff2;base64,...' because it violates the following Content Security Policy directive`.

### Pitfall 2: Achar que "194 ocorrências de font:" cobre 100% da migração
**What goes wrong:** grep/substituição feita só em `"IBM Plex Sans"`/`"IBM Plex Mono"` (180 ocorrências) deixa as 14 ocorrências de `"Open Sans"` no pipeline `#laudo`/`#laudoView` intactas — o PDF gerado continua com fallback de sistema.
**Why it happens:** o CONTEXT.md e o UI-SPEC.md descrevem a contagem como "194 → 0 de IBM Plex", sem mencionar a terceira família usada só no PDF.
**How to avoid:** grep também por `"Open Sans"` (14 ocorrências confirmadas) e incluir no mesmo passo de substituição.
**Warning signs:** screenshot do PDF gerado ainda mostrando serifas/fonte de sistema diferente do resto do app.

### Pitfall 3: Declarar 5+2 blocos `@font-face` discretos em vez de 2 blocos com range
**What goes wrong:** infla o HTML em ~230KB de base64 duplicado (o mesmo arquivo repetido 5x/2x), sem nenhum ganho — pode estourar orçamentos de payload em revisões futuras ou degradar performance de parse à toa.
**Why it happens:** é o padrão "óbvio" ao copiar a CSS response do Google Fonts literalmente (que lista 5+2 blocos aparentemente distintos).
**How to avoid:** usar 2 blocos com `font-weight` em range (`400 800`/`500 700`), cada um com o base64 do único arquivo correspondente — confirmado nesta pesquisa que é o mesmo arquivo em todos os pesos do subset latin.
**Warning signs:** medir payload do HTML e encontrar >200KB quando a expectativa era ~86KB.

### Pitfall 4: `#cmpSheet` e `#detail`/`#chooser` não têm pattern de foco prévio
**What goes wrong:** ao generalizar o utilitário assumindo que todo sheet já captura o gatilho (como onb/wiz/capt/neg fazem), o `#cmpSheet` e `#detail`/`#chooser` ficam sem a chamada `trapFocus(container)` no momento certo, porque não existe hoje um "hook" óbvio de abertura com captura de foco pra copiar.
**Why it happens:** 4 dos 6 sheets já têm o padrão (`onbLastFocus`/`WIZRET`/`CAPTRET`/`NEGRET`); os outros 2 não.
**How to avoid:** adicionar explicitamente `trapFocus(document.getElementById("cmpSheet"))` dentro de `abrirComparacao()` (linha 5093-5127) e o equivalente nas funções relevantes de `#detail`/`#chooser` (`showDetail`, `pick`, abertura do chooser em torno da linha 5322).
**Warning signs:** teste de Tab simulado nessas 2 superfícies especificamente vaza foco pro resto da página.

### Pitfall 5: `font-weight` fora do range declarado causa clamping silencioso
**What goes wrong:** se algum seletor usar um peso fora de 400-800 (Archivo) ou 500-700 (JetBrains Mono) — por exemplo, um 900 esquecido em algum lugar — o navegador faz *clamp* pro limite mais próximo do range, sem erro visível.
**Why it happens:** comportamento padrão de fontes variáveis com range declarado (MDN).
**How to avoid:** confirmar que TODOS os pesos usados no app (400/500/600/700/800 para Archivo; 500/700 para JetBrains Mono, conforme já mapeado no UI-SPEC) estão dentro dos ranges declarados — já verificado que são exatamente esses pesos, sem excedentes.
**Warning signs:** nenhum esperado nesta fase (pesos já auditados), mas vale conferir em fases futuras se novos pesos forem introduzidos.

## Code Examples

### Substituição mecânica de família (padrão a repetir 196x)
```css
/* antes */
.card .unit{font:700 12px/1 "IBM Plex Mono",monospace;color:var(--accent);letter-spacing:.02em;margin-bottom:4px}
/* depois */
.card .unit{font:700 12px/1 "JetBrains Mono",monospace;color:var(--accent);letter-spacing:.02em;margin-bottom:4px}
```

### Migração de #laudo (Open Sans → Archivo/JetBrains Mono)
```css
/* antes — linha 693 */
#laudo .lbrand .t,#laudoView .lbrand .t{font:800 20px/1.1 "Open Sans","Segoe UI",sans-serif;color:#1c1e20}
/* depois — Display, mesmo papel do .brand h1 */
#laudo .lbrand .t,#laudoView .lbrand .t{font:800 20px/1.1 "Archivo","Segoe UI",sans-serif;color:#1c1e20}

/* antes — linha 694 (eyebrow) */
#laudo .lbrand .t small,#laudoView .lbrand .t small{display:block;font:700 10.5px/1.3 "Open Sans",sans-serif;...}
/* depois — Eyebrow/mono, mesmo papel do .brand .eyebrow */
#laudo .lbrand .t small,#laudoView .lbrand .t small{display:block;font:700 10.5px/1.3 "JetBrains Mono",sans-serif;...}
```

### Elevação — substituição de sombra ad hoc por token
```css
/* antes — linha 383 */
.onb-card{background:var(--paper-2);border:2px solid var(--ink);border-radius:3px;padding:24px 22px;max-width:380px;width:100%;position:relative;box-shadow:0 8px 24px rgba(20,26,31,.3)}
/* depois */
.onb-card{background:var(--paper-2);border:2px solid var(--ink);border-radius:3px;padding:24px 22px;max-width:380px;width:100%;position:relative;box-shadow:var(--elev-3)}
```

### Focus-trap aplicado a uma superfície SEM pattern prévio (`#cmpSheet`)
```js
// Fonte: 19-UI-SPEC.md, generalizado pro caso sem captura prévia de foco
function abrirComparacao(){
  if(CMP.length<2)return;
  // ... (lógica de render existente, inalterada) ...
  const sheet=document.getElementById("cmpSheet");
  sheet.hidden=false;
  trapFocus(sheet); // NOVO — antes só havia close.focus()
  const close=sheet.querySelector(".wclose")||sheet.querySelector(".wclose");if(close)close.focus();
}
function fecharComparacao(){
  const sheet=document.getElementById("cmpSheet");if(sheet)sheet.hidden=true;
  untrapFocus(); // NOVO — antes não restaurava foco nenhum
}
```

### CSP — adição mínima necessária
```html
<!-- antes -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
<!-- depois — só font-src adicionado -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://portalmapa.goiania.go.gov.br; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| 5+2 arquivos `.woff2` estáticos por peso (padrão de 2015-2020) | 1 arquivo variável por subset cobrindo todo o eixo `wght`, servido pelo próprio Google Fonts mesmo quando a CSS request pede pesos discretos | Já é o comportamento padrão do Google Fonts há alguns anos (confirmado nesta pesquisa via download direto, 2026) | Payload real ~2,4x menor que a estimativa do UI-SPEC baseada no modelo antigo de arquivos estáticos |

**Deprecated/outdated:** a prática de baixar um `.woff2` por peso via ferramentas como google-webfonts-helper (mencionada no UI-SPEC como referência) gera arquivos estáticos redundantes quando a fonte de origem já é variável — preferir sempre verificar a URL real servida antes de assumir a necessidade de N arquivos.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O range `400 800`/`500 700` cobre exatamente os pesos usados hoje sem nenhum peso fora da faixa em nenhum seletor não auditado nesta pesquisa (só os já mapeados no UI-SPEC foram conferidos) | PARTE A, "Bloco @font-face recomendado" | Baixo — se algum seletor esquecido usar peso fora do range, o navegador faz clamp silencioso (degrada pro peso mais próximo), não quebra o layout |
| A2 | `fecharNeg()` (linha 6418) segue o mesmo padrão de restauração de `NEGRET` que `fecharCaptacao()`/`fecharLaudo()` — não foi lido o corpo completo da função nesta pesquisa, só confirmado que `NEGRET` é capturado na abertura | PARTE B, "Focus-trap: âncoras exatas" | Baixo — o executor deve ler `fecharNeg()` completo antes de generalizar; se o padrão divergir, é um ajuste pontual, não estrutural |

## Open Questions

1. **O bump de `sw.js` (`CACHE = "radar-v7"` → `"radar-v8"`) é necessário tecnicamente?**
   - What we know: o UI-SPEC argumenta que não é necessário porque a fonte fica DENTRO do `radar-goiania.html`, que já é `NETWORK_FIRST` — o cache antigo é só fallback offline, nunca trava a versão. Tecnicamente correto.
   - What's unclear: o `code_context` do CONTEXT.md lista como "padrão estabelecido": "sw.js bump de versão quando assets mudam" — uma convenção mais ampla do projeto que esta fase tecnicamente não precisa seguir (o HTML muda, não os assets externos em `LOCAL[]`).
   - Recommendation: não bumpar `CACHE` (segue a lógica técnica do UI-SPEC — o HTML mudou, é NETWORK_FIRST, sw.js não precisa saber), mas deixar registrado no PLAN.md o porquê da exceção à convenção, para não parecer descuido do executor.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| `curl` | Baixar CSS/woff2 do Google Fonts | ✓ | via Git Bash | — |
| `base64` (coreutils) | Converter woff2 → base64 | ✓ | via Git Bash | — |
| `node --test` | Rodar suíte de 239 testes | ✓ | Node.js (via `npm test`) | — |
| Acesso de rede a `fonts.googleapis.com`/`fonts.gstatic.com` | Aquisição das fontes (só nesta fase de pesquisa/preparo — app final NÃO faz requisição em runtime) | ✓ | — | — |

**Nenhuma dependência faltante.** Nota importante: o acesso de rede ao Google Fonts é usado APENAS durante esta pesquisa/preparo (para baixar os arquivos uma vez); o app final embute os bytes em base64 e nunca faz requisição de rede para fontes em runtime — consistente com a arquitetura "arquivo único offline-first" do projeto.

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | nenhum arquivo de config dedicado — `package.json` define `"test": "node --test \"tests/*.test.mjs\""` |
| Quick run command | `npm test` (roda toda a suíte, ~168ms medido nesta pesquisa) |
| Full suite command | `npm test` (mesma coisa — suíte inteira já é rápida, sem necessidade de subset) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| TYPO-01 | Zero ocorrência residual de `"IBM Plex"`/`"Open Sans"` no HTML final | grep estático | `grep -c 'IBM Plex\|Open Sans' radar-goiania.html` (esperado: 0) | ✅ (comando shell, não precisa de arquivo de teste) |
| TYPO-01 | `document.fonts.check()` confirma fonte ativa | manual-only (preview) | `document.fonts.check('700 16px Archivo')` no console do navegador | ❌ — não há automação de browser na suíte atual (`node --test` não abre browser); manual-only justificado: suíte é Node puro, sem jsdom/Playwright configurado |
| TYPO-01 | Suíte 239 verde após a migração | automated | `npm test` | ✅ |
| PREM-01 | `--elev-0/1/2/3` presentes, nenhuma sombra ad hoc fora dos tokens | grep estático | `grep -c 'box-shadow' radar-goiania.html` comparado contra `grep -c 'var(--elev-' radar-goiania.html` | ✅ (comando shell) |
| A11Y-01 | Tab/Shift+Tab circulam dentro de cada uma das 6 superfícies; Esc preservado | manual-only (preview) | Tab simulado + inspeção visual nas 6 superfícies, mobile 375 + desktop 1280 | ❌ — mesma limitação de ambiente (sem Playwright/jsdom configurado nesta suíte) |
| A11Y-01 | Suíte 239 verde (nenhuma regressão de lógica JS) | automated | `npm test` | ✅ |

### Sampling Rate
- **Per task commit:** `npm test` (rápido o suficiente, ~168ms, para rodar a cada commit de task)
- **Per wave merge:** `npm test` (suíte completa já é o "quick run" — não há subset maior)
- **Phase gate:** suíte 239 verde + verificação manual ao vivo (document.fonts.check, screenshot antes/depois, Tab-cycle nas 6 superfícies, PDF de exemplo) antes de `/gsd-verify-work`

### Wave 0 Gaps
Nenhum gap de infraestrutura de teste — a suíte `node --test` já cobre 100% da lógica JS testável (scores, território, comparação, etc.) e **não** fixa fontes/CSS (confirmado: `grep` por "IBM Plex"/"Archivo"/"JetBrains"/"Open Sans"/"font-family" em `tests/*.test.mjs` retornou zero ocorrências). As verificações de fonte/focus-trap/elevação são inerentemente visuais/DOM e não têm cobertura automatizada nesta suíte — isso é esperado e consistente com a arquitetura do projeto (testes cobrem lógica de dados, não CSS/DOM), não é um gap a preencher nesta fase.

*(Nenhum gap — infraestrutura de teste existente cobre tudo que é automatizável; verificação visual é manual-only por design do projeto, não por lacuna a corrigir)*

## Sources

### Primary (HIGH confidence — verificado nesta sessão)
- `curl https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap` — respostas CSS reais, salvas em `archivo.css`
- `curl https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap` — respostas CSS reais, salvas em `jbmono.css`
- `curl https://fonts.googleapis.com/css2?family=Archivo:wght@400..800` e `...JetBrains+Mono:wght@500..700` — confirmação de fonte variável via range request
- Download direto dos 2 arquivos `.woff2` (`fonts.gstatic.com`) + verificação de magic bytes + `base64 -w0`
- `curl https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/OFL.txt` e `.../ofl/jetbrainsmono/OFL.txt` — texto integral OFL 1.1
- `grep`/`Read` direto em `radar-goiania.html` — contagens de `font:`, `font-family`, `IBM Plex`, `Open Sans`, `box-shadow`, `letter-spacing`, localização de funções de abertura/fechamento dos 6 sheets, cadeia de Esc, CSP, `sw.js`
- `node --test tests/*.test.mjs` — execução real da suíte, 239/239 passando

### Secondary (MEDIUM confidence)
- MDN — `@font-face`/`font-weight` descriptor, sintaxe de range e clamping (via WebSearch, 2026)

### Tertiary (LOW confidence)
- Nenhuma claim desta pesquisa ficou em LOW confidence sem verificação — todas as claims críticas (payload, licença, CSP, contagens, focus-trap anchors) foram confirmadas via ferramenta nesta sessão.

## Metadata

**Confidence breakdown:**
- Aquisição de fonte (payload, licença, estratégia variável): HIGH — arquivos baixados e medidos de verdade, licença confirmada via GitHub oficial do Google Fonts
- Inventário de código (contagens, box-shadow, focus-trap): HIGH — grep/Read direto no arquivo real, suíte executada
- CSP: HIGH — leitura direta do meta tag + regra de spec bem estabelecida (fetch directive fallback chain)
- Recomendação de `font-display: swap`: MEDIUM — inferência de boa prática + padrão observado no Google Fonts, não há teste A/B de FOUT feito nesta pesquisa

**Research date:** 2026-07-10
**Valid until:** 30 dias (payload/licença de fonte são estáveis; CSP e inventário de código são fixos até o próximo edit do HTML — válido até a execução desta fase)
