# Radar Fundiário Goiânia — Documento de Projeto & Briefing de Auditoria

> Este documento acompanha o arquivo `radar-goiania.html` (o app) e o `ROADMAP-radar.md` (melhorias detalhadas). Serve para uma auditoria técnica independente: entender o que existe, o que já foi identificado como melhoria, e apontar o que mais pode ser corrigido, otimizado ou repensado.

---

## 1. O que é o projeto

Ferramenta de uso próprio para localizar imóveis em Goiânia por **quadra e lote** (ou endereço, inscrição, ou clique no mapa), mostrando dados cadastrais oficiais — inscrição do IPTU, área, uso, **valor venal** e um **valor de referência de mercado estimado** — e plotando o imóvel no mapa (Google Maps / Earth / Street View). Nasceu de uma dor real de corretor: no Mapa Digital oficial de Goiânia, achar imóvel por quadra/lote é lento e trabalhoso.

**Público/uso:** uso próprio (corretor/investidor). Dados de imóvel são públicos e abertos. O nome do proprietário **não** é coletado em massa — só é consultado manualmente, quando necessário, na fonte oficial (ver §5 e §7).

**Entrega atual:** um único arquivo HTML autossuficiente, roda no navegador (desktop e celular), sem servidor, sem backend, sem instalação.

---

## 2. Status atual — o que já funciona

- **Quatro formas de busca:** (a) quadra + lote, (b) endereço (logradouro + número), (c) inscrição cadastral (CI), (d) **clique no mapa** (consulta espacial que identifica o lote no ponto tocado).
- **Autocomplete de setor:** campo de busca acento-insensível que expande as abreviações do cadastro (ex.: "LOT FAICALVILLE" → "Loteamento Faicalville"), resolvendo a dificuldade de achar bairro no `<select>` de 709 setores.
- **Prédios / apartamentos:** cada unidade aparece com seu complemento (nº do apto), sua inscrição de 14 dígitos e seu **valor venal próprio**; cabeçalho com nome do edifício e contagem de unidades; **garagens/boxes ocultos por padrão** (toggle).
- **Valor de referência de mercado:** estimativa = valor venal × coeficiente ajustável (slider 1×–6×), com R$/m² exibido para calibrar. Rotulado como estimativa, não dado oficial.
- **Mapa correto:** coordenadas UTM convertidas para lat-long; pino no local certo (após correção da projeção — ver §4).
- **Ações no detalhe:** Google Maps, Street View, Google Earth e link para a consulta oficial do titular.
- **Sem CORS:** chamadas à API via JSONP (o endpoint não envia cabeçalho CORS), o que permite rodar em arquivo local.

---

## 3. Arquitetura técnica

- **Frontend único:** HTML + CSS + JS inline em um arquivo (`radar-goiania.html`, ~33 KB).
- **Bibliotecas via CDN:** Leaflet 1.9.4 (mapa), proj4js 2.11.0 (conversão de coordenada), tiles CARTO light (fundo do mapa).
- **Fonte de dados:** ArcGIS Server público da Prefeitura de Goiânia (ver §4).
- **Chamadas:** JSONP (`callback=`), porque o endpoint não expõe CORS; isso contorna o bloqueio do navegador em arquivo local.
- **Conversão de coordenada:** proj4js, de EPSG:31982 (SIRGAS 2000 / UTM 22S) para WGS84 (lat-long).
- **Filtragem no cliente:** o servidor só responde de forma estável com `outFields=*`; por isso o app baixa o setor inteiro e filtra quadra/lote/endereço/apto no navegador (ver §4, "manhas").
- **Estado:** tudo em memória (sem localStorage, sem backend).

---

## 4. Fonte de dados e "manhas" do endpoint (importante para a auditoria)

**Endpoint:** `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_Base/MapServer/3` — camada "Cadastro Imobiliário". ~310 mil lotes / ~570 mil inscrições. Aberto, sem autenticação.

**Projeção:** EPSG:31982 = SIRGAS 2000 / **UTM 22S** (meridiano central −51°). *Cuidado:* o número "31982" engana — é zona 22, não 23. Definição proj4 correta: `+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`. (O bug inicial de pino "na Bahia" foi exatamente zona 23 em vez de 22 → 6° de erro.)

**Comportamentos não óbvios do servidor:**
- Aceita `outFields=*`, mas **rejeita** pedir campos específicos como `x_coord`, `y_coord`, `nrquadra` em `outFields` (erro 400). Solução: sempre `outFields=*`.
- **Aceita** `returnGeometry=true` nesse endpoint (verificado ao vivo em 2026-07-04): retorna a geometria real do polígono do lote (wkid 31982), com ~+19% de payload. Corrige a "manha" antiga que afirmava rejeição. Os campos `x_coord`/`y_coord` continuam disponíveis como fonte alternativa de coordenada. Obs.: servidor de terceiro, não documentado e sem SLA — reconfirmar antes de depender dele.
- **Aceita consulta espacial** por ponto (`geometryType=esriGeometryPoint`, `spatialRel=esriSpatialRelIntersects`) — é o que viabiliza o "clique no mapa".
- **Suporta JSONP** (`callback=`) e paginação (`resultOffset`/`resultRecordCount`); `maxRecordCount` alto.

**Campos-chave:** `nrinscr` (inscrição 14 díg, nível unidade — é a que serve na consulta do IPTU) · `ci` (10 díg, nível lote) · `nrquadra`, `nrlote` (strings, podem ter letra: "QL 22", "QD12A") · `cdbairro`, `nmbairro` · `tplogradou`, `nmlogradou`, `nrimovel` · `incompl` (complemento: nº do apto ou box) · `nmedificio` · `areaterr`, `areaedif` · `vlvenal` · `uso` · `insubprinc` (sequência da unidade) · `x_coord`, `y_coord`.

**Observações sobre os dados:** valores de campo vêm com padding de espaços; quadra/lote alfanuméricos; num prédio, todas as unidades dividem o mesmo `ci` e coordenada, e cada uma tem `nrinscr` e `vlvenal` próprios; muitos aptos "tipo A" têm o mesmo venal (lançamento por planta).

---

## 5. Fluxo do titular (proprietário) e a fronteira legal

- O **dado do imóvel** (área, uso, valor venal, quadra/lote, coordenada) é público e aberto na API — sem restrição de coleta/uso.
- O **nome do proprietário** só existe no site da prefeitura, **atrás de CAPTCHA/reCAPTCHA**, e é resolvido **manualmente pelo usuário**, imóvel a imóvel, na captação real. O app **não lê nem coleta o titular em massa** — leva o usuário até a página oficial e para por aí. Essa separação é uma decisão de projeto (ver §7).
- **Bug conhecido:** o botão "titular" hoje aponta para a página errada (ver §6, item B).

**Páginas da prefeitura mapeadas:**
- `siptu00020f0.asp` — Consulta ao Cadastro Imobiliário (características do imóvel, **não** o dono).
- `siptu00200f0.asp` — Consulta e Emissão de Guia (a guia/2ª via imprime "Contribuinte: NOME" — candidata a mostrar o dono).
- `siptu00040f0.asp` — Consulta Valor Venal.
- `saces00000f0.asp?sigla=sccer` — Certidão de Detalhamento Cadastral (candidata a mostrar o proprietário).
- Todas são POST + CAPTCHA.

---

## 6. Bugs e limitações conhecidos (a resolver)

**A. iOS — autocomplete de setor não sugere ao digitar no iPhone.** Provável causa: eventos de toque (Safari), teclado virtual roubando foco, `click` global fechando a lista no toque, e/ou `z-index`/`font-size`.

**B. Botão "titular" abre a página errada.** Aponta para `siptu00020` (cadastro), que devolve características do imóvel, não o dono. Precisa apontar para a página que traz o contribuinte (candidatas: `siptu00200` ou `saces...sccer`) — a definir por teste.

**C. Pré-preenchimento no site oficial.** Os formulários são POST + CAPTCHA; link com querystring normalmente não pré-preenche POST. Alternativa proposta: copiar a inscrição para a área de transferência e abrir a página; o usuário cola e resolve o CAPTCHA (continua sendo o usuário quem resolve).

**D. Experiência mobile ainda não é "premium".** Detalhe cobre o mapa, alvos de toque pequenos, sem PWA, sem bottom sheet, sem geolocalização. (Detalhado no roadmap como P0.)

---

## 7. Postura legal / LGPD (contexto para a auditoria avaliar)

- Dados do imóvel: fonte pública, uso livre. Sem dado pessoal.
- Nome do titular: dado pessoal. A LGPD (art. 7º §3º) mantém o princípio da **finalidade** mesmo para dado público — o nome foi disponibilizado para fim tributário, não para prospecção. Por isso a decisão de **não** raspar titulares em massa e deixar a consulta manual, pontual, na captação de um imóvel concreto (expectativa legítima defensável).
- Consequência de design: o app é um **localizador de imóvel + dados cadastrais**, não um gerador de mailing. O elo do titular é deliberadamente manual.
- **Ponto para a auditoria opinar:** o rótulo do "valor de referência de mercado" deixa claro que é estimativa? Há risco de o usuário tomar como avaliação oficial? Alguma ressalva/aviso a mais é recomendável?

---

## 8. Roadmap de melhorias já identificadas (resumo — detalhes em `ROADMAP-radar.md`)

**P0 — Celular premium (mobile-first, zero bug):** autocomplete no toque; anti-zoom (`font-size:16px`) e teclado numérico; mapa em primeiro plano com alternância Busca⇄Mapa e tap-to-identify; detalhe como bottom sheet arrastável; alvos de toque ≥44px; safe-area/notch; performance em 4G; instalável como **PWA**; checklist de aceite no aparelho.

**P0 — Bugs:** iOS autocomplete; botão titular na página certa; deixar explícito que o app não devolve o dono (só leva à fonte).

**P1 — Fluxo:** pré-preencher/copiar inscrição para o site oficial.

**P2 — Backlog:** calibração do coeficiente de mercado por setor (cruzar com anúncios reais); espelhar a base num banco local (busca instantânea + filtros pesados); outras cidades (recon caso a caso — Goiânia aberta; Aparecida usa Geopixel com login; Senador Canedo sem mapa online); exportar ficha/planilha; versão 100% offline.

---

## 9. Pontos adicionais identificados (para a auditoria aprofundar)

Estes ainda **não** estão no roadmap e merecem olhar crítico:

**Segurança / robustez do código**
- **XSS/quebra por `innerHTML` sem escape:** valores da API (`nmedificio`, `nmlogradou`, `incompl`) são injetados via template string em `innerHTML` sem sanitização. Com dado de governo o risco é baixo, mas um caractere `<`/`&` pode quebrar o card, e é má prática. Recomenda-se escapar ou usar `textContent`.
- **JSONP = execução de script remoto:** JSONP injeta e executa o que o endpoint retornar. Cria uma dependência de confiança no servidor da prefeitura; se comprometido, roda script no contexto do app. Avaliar alternativa (proxy CORS próprio? `fetch` com no-cors não serve para ler JSON). Trade-off: JSONP é o que permite rodar em arquivo local hoje.
- **Dependência de CDN:** Leaflet/proj4/tiles vêm de CDN; queda ou bloqueio derruba o app. (Item de offline no roadmap mitiga.)
- **Sem tratamento de retry/backoff** nas chamadas; timeout fixo de 30s no JSONP.

**Correção das buscas**
- **Casamento "fuzzy" pode gerar falso positivo:** quadra/lote/rua usam `includes()` (ex.: "135" casa "1350"; número por substring). Avaliar match por token/limite de palavra e ordenação por melhor correspondência.
- **Guardas de paginação:** `fetchBairro` limita a ~6 páginas de 2.000; confirmar que nenhum setor excede e, se exceder, avisar o usuário em vez de truncar em silêncio.

**Qualidade de dados / metodologia**
- **Coeficiente de mercado é grosseiro** (multiplicador único). Auditar alternativas: valor de referência do ITBI (mais próximo de mercado, se houver fonte), R$/m² por setor/uso, ou modelo hedônico simples. Deixar claro o método e a incerteza.
- **Vintage do dado:** não há indicação da data de atualização do cadastro; valores são de lançamento. Exibir a referência temporal ajudaria.

**Performance**
- **Baixar o setor inteiro a cada busca** (2.000+ registros, ~3 MB) é pesado, sobretudo em 4G. Avaliar cache por setor na sessão, e o banco local (roadmap) como solução estrutural.
- **Plotagem/lista de prédios grandes** (centenas de unidades) — conferir custo de render.

**Acessibilidade**
- Sem ARIA/roles no combobox e nos resultados; navegação por teclado parcial; contraste e leitor de tela não avaliados. Rodar um checklist WCAG básico.

**Arquitetura / manutenção**
- **Cidade fixa no código:** para o item "outras cidades", extrair uma **configuração de cidade** (endpoint, projeção, mapa de campos, expansão de prefixos) para plugar novas cidades sem reescrever.
- **Sem testes automatizados:** montar um harness headless (Node) que valide conversão de coordenada, casamento de quadra/lote/apto e parsing — evita regressões (ex.: o bug da zona UTM teria sido pego).
- **Arquivo único monolítico:** ok para protótipo; se crescer, avaliar separar módulos/build.

**Privacidade técnica**
- Ao implementar o "pré-preencher", **não** colocar a inscrição em querystring que vá para terceiros; preferir clipboard. (A inscrição é dado de imóvel, não pessoal, mas evitar vazar parâmetros em logs de terceiros é boa prática.)

---

## 10. O que se quer da auditoria (perguntas dirigidas)

1. **Segurança:** o uso de JSONP + `innerHTML` sem escape é aceitável para uso próprio, ou vale refatorar já? Qual a alternativa mais simples que preserva o "roda em arquivo local"?
2. **Mobile premium:** revisar o plano P0 (M1–M8) e apontar o que falta para ficar realmente "liso" no iPhone; sugerir a ordem de implementação de menor risco.
3. **Titular:** confirmar qual página oficial retorna o proprietário e se dá para pré-preencher (GET) ou se clipboard é o caminho.
4. **Valor de referência:** criticar a metodologia do coeficiente e propor algo mais fiel e defensável, com a devida sinalização de incerteza.
5. **Correção das buscas:** revisar o casamento fuzzy e propor regras que reduzam falso positivo sem perder recall.
6. **Performance:** melhor estratégia entre cache de sessão x banco local, considerando uso em campo (4G).
7. **LGPD/rótulos:** avaliar se a postura de privacidade e os avisos na interface estão adequados.
8. **Arquitetura multi-cidade:** desenhar a configuração de cidade e o mínimo de recon necessário por cidade nova.
9. **Testes:** propor um conjunto mínimo de testes automatizados que trave regressões críticas (coordenada, matching, parsing).
10. **Qualquer risco ou melhoria que não tenha sido enxergado.**

---

## 11. Referências rápidas

- **App:** `radar-goiania.html` (arquivo único).
- **Roadmap detalhado:** `ROADMAP-radar.md` (com respostas da auditoria).
- **Endpoint de dados:** ArcGIS `.../MapaServer/Feature_Base/MapServer/3` (Cadastro Imobiliário), EPSG:31982 (UTM 22S).
- **Titular:** manual, no site da prefeitura, atrás de CAPTCHA. O app não coleta o dono.
