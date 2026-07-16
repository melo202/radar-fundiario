# Roadmap — IA Eficiente e Dossiê Inteligente com Fontes

**Projeto:** Corretor Inteligente OS  
**Branch:** `agent/corretor-inteligente-os`  
**Data:** 16/07/2026  
**Status:** aprovado para execução incremental; sem instalação integral do Open Notebook.

---

## 1. Objetivo

Transformar a IA já existente em uma camada operacional mensurável, econômica e segura, e depois criar dentro de cada imóvel um **Dossiê Inteligente com fontes**, inspirado na melhor experiência do NotebookLM, mas integrado à arquitetura atual do Corretor Inteligente.

O produto deverá permitir que o corretor envie matrícula, IPTU, certidões, contratos, avaliações, fotos, áudios e observações e faça perguntas ao acervo. Toda resposta documental deverá indicar documento, página ou localização, evidência, confiança, limitações e próxima ação.

## 2. Princípios inegociáveis

1. A IA não calcula o valor da avaliação; o motor determinístico continua sendo a fonte dos números.
2. A IA nunca transforma ausência de informação em prova.
3. Nenhuma resposta documental é apresentada sem evidência vinculada.
4. Dados sensíveis não são enviados automaticamente a provedores remotos.
5. Toda persistência privada é isolada por `organization_id` e protegida por autenticação individual e Row-Level Security.
6. O corretor confirma antes de publicar, enviar, alterar preço, concluir situação jurídica ou persistir informação inferida.
7. O sistema usa poucos componentes, com função clara e possibilidade de retirada.
8. Nenhum repositório externo completo substituirá o núcleo atual do produto.

## 3. Componentes aprovados

### Núcleo existente

- Node.js;
- PostgreSQL;
- PostGIS;
- cadeia de IA em `motor/ai-provider.js`;
- Ollama local como fallback;
- provedores remotos opcionais;
- AJV para saída estruturada;
- `ai_logs`, `ai_cache` e `audit_log`;
- motor determinístico de avaliação e localização.

### Adições permitidas, somente quando houver tela usando

1. **`pgvector/pgvector`** — busca semântica no PostgreSQL existente.
2. **`docling-project/docling`** — leitura estruturada de documentos, em serviço interno isolado.
3. **`gotenberg/gotenberg`** — geração e composição profissional de PDFs.
4. **`aquasecurity/trivy`** — segurança no CI.

### Decisão explícita

O **Open Notebook não será instalado como segundo produto**, segundo banco, segunda autenticação ou segundo painel. Ele poderá ser usado somente como referência de experiência e laboratório comparativo.

---

# Fase 0 — Baseline e contrato de eficiência

## Objetivo

Medir a IA atual antes de ampliar seu uso.

## Entregáveis

- consulta agregada sobre `ai_logs` por tarefa, modelo e período;
- métricas de duração mediana e percentil 95;
- taxa de sucesso e erro;
- volume por tarefa;
- tokens de saída;
- incidência de HTTP 429;
- taxa de fallback para o Ollama;
- quantidade de chamadas por provedor;
- inventário das tarefas atuais: extração de anúncio, parecer e resumo do entorno;
- definição do orçamento operacional máximo por tarefa.

## Ajustes de instrumentação

O registro de cada chamada deverá incluir, sem armazenar prompt ou conteúdo privado:

- `provider`;
- `attempt`;
- `from_cache`;
- `sensitivity`;
- `fallback_reason`;
- `validator_result`;
- `input_size` aproximado;
- `queue_wait_ms`, quando houver fila.

## Critérios de aceite

- todas as tarefas atuais aparecem no relatório;
- é possível identificar qual modelo e provedor atenderam cada classe de tarefa;
- nenhum conteúdo integral de anúncio, documento ou prompt aparece nos logs;
- existe uma fotografia de desempenho anterior às próximas mudanças.

## Gate G0

Não ampliar a IA enquanto não houver baseline suficiente para comparar custo, qualidade e velocidade.

---

# Fase 1 — Painel de eficiência da IA

## Objetivo

Criar uma visão administrativa simples para provar se a cadeia remoto → local está funcionando de forma eficiente.

## Entregáveis

- cartão de saúde da cadeia;
- chamadas nas últimas 24 horas e 7 dias;
- taxa de cache;
- taxa de sucesso;
- taxa de fallback local;
- duração mediana e P95 por tarefa;
- erros por modelo e provedor;
- percentual de respostas rejeitadas pelos validadores;
- alertas para aumento anormal de falhas, latência ou uso local.

## UX

O painel será administrativo. O corretor comum não precisa ver modelos, tokens ou provedores. Para ele, a interface mostra apenas estados compreensíveis, como “processando”, “concluído”, “precisa de confirmação” ou “não foi possível comprovar”.

## Critérios de aceite

- uma tarefa lenta ou instável pode ser identificada sem abrir logs brutos;
- o painel diferencia falha do provedor, rejeição do validador e fallback;
- não há exposição de chave, prompt, PII ou conteúdo documental.

---

# Fase 2 — Endurecimento do núcleo de IA

## Objetivo

Preparar a camada existente para uso multiusuário e documental.

## Entregáveis

### 2.1 Validadores reutilizáveis

- compilar cada JSON Schema uma única vez;
- manter cache dos validadores por hash do schema;
- testes para saídas inválidas, campos adicionais e tipos incorretos.

### 2.2 Classificação de sensibilidade

Toda chamada deverá declarar uma destas classes:

- `publico` — anúncios e dados abertos; remoto permitido;
- `interno` — dados operacionais sem documentos pessoais; remoto conforme política;
- `pessoal` — informações de clientes e proprietários; local preferencial;
- `sensivel` — documentos, matrículas, contratos e identificadores; somente local por padrão.

O roteador deverá considerar **tier + sensibilidade**, e não apenas `fast` ou `advanced`.

### 2.3 Controle de concorrência

- semáforo para tarefas no Ollama;
- fila com prioridade;
- limite por organização;
- timeout de fila;
- cancelamento seguro;
- proteção para que OCR e documentos não prejudiquem mapa, avaliação ou captura.

### 2.4 Cache seguro

- cache público pode continuar pelo hash do conteúdo;
- cache privado deve incluir organização, imóvel, documento, versão e tarefa;
- tarefas sensíveis podem operar sem cache compartilhado;
- exclusão do documento deve invalidar seus resultados derivados.

## Critérios de aceite

- documento sensível nunca escolhe remoto por engano;
- duas organizações não compartilham resultado privado pelo cache;
- múltiplas chamadas não saturam o servidor;
- os testes cobrem roteamento, fila, cache e sensibilidade.

---

# Fase 3 — Captura universal híbrida

## Objetivo

Aproveitar a IA somente quando o parser determinístico não for suficiente.

## Fluxo

1. usuário digita ou dita uma informação;
2. parser determinístico extrai campos óbvios;
3. sistema mede campos ausentes e ambiguidades;
4. IA rápida recebe somente o texto e o conjunto de lacunas relevantes;
5. saída é validada por schema;
6. interface mostra o que foi confirmado, interpretado e ainda está faltando;
7. usuário confirma;
8. somente então os dados são persistidos.

## Exemplos de uso da IA

- identificar que “ela aceita pegar um lote” significa aceitar permuta;
- relacionar “dona Marta” a um contato já existente, sem salvar automaticamente;
- interpretar preferência residencial versus comercial;
- transformar observação longa em campos estruturados e uma nota original preservada.

## O que continuará determinístico

- normalização de telefone;
- leitura direta de preço, quartos e tipo quando explícitos;
- regras de prioridade;
- criação de tarefas;
- deduplicação objetiva;
- persistência e auditoria.

## Critérios de aceite

- frases simples não acionam IA sem necessidade;
- a IA nunca persiste diretamente;
- campos inferidos aparecem visualmente diferentes dos confirmados;
- captura comum é concluída em menos de 3 minutos;
- falha da IA não impede a captura manual.

## Gate G1

Testar com 3 a 5 corretores. Avançar somente quando a captura for percebida como mais rápida do que cadastrar manualmente em um CRM comum.

---

# Fase 4 — Fundação documental e proveniência

## Dependência obrigatória

Esta fase só começa após autenticação individual, organizações reais e Row-Level Security estarem funcionando.

## Objetivo

Guardar documentos e trechos com rastreabilidade suficiente para responder com fontes.

## Entidades mínimas

### `property_documents`

- `id`;
- `organization_id`;
- `inventory_property_id`;
- nome original;
- tipo documental;
- MIME type;
- tamanho;
- hash SHA-256;
- versão;
- status de processamento;
- sensibilidade;
- armazenamento;
- criado por;
- datas de criação, atualização e exclusão.

### `document_chunks`

- `id`;
- `organization_id`;
- `inventory_property_id`;
- `document_id`;
- página ou localização interna;
- texto original;
- hash do trecho;
- método de extração;
- confiança;
- classificação: declarado, observado, extraído ou inferido;
- status de confirmação humana;
- embedding opcional;
- metadados estruturados.

### `document_facts`

Somente para fatos que mereçam comparação ou confirmação, como:

- área;
- matrícula;
- inscrição cadastral;
- proprietário declarado;
- valor venal;
- referência a financiamento;
- referência a ônus;
- permuta;
- estado de ocupação.

Cada fato deverá apontar para o trecho que o originou.

## Critérios de aceite

- usuário consegue abrir o documento original a partir do trecho;
- página e fonte permanecem preservadas;
- exclusão lógica e física possuem fluxo definido;
- um documento nunca fica acessível por outra organização;
- uploads falhos ou duplicados não geram trechos inconsistentes.

---

# Fase 5 — Leitura documental com Docling

## Objetivo

Avaliar o Docling em ambiente interno e controlado antes de torná-lo dependência permanente.

## Escopo do spike

Testar, com documentos anonimizados ou autorizados:

- PDF nativo;
- PDF escaneado;
- matrícula com múltiplas páginas;
- IPTU com tabela;
- contrato em DOCX;
- certidão;
- documento com rotação ou baixa qualidade.

## Métricas

- tempo de processamento;
- uso de memória e CPU;
- preservação da ordem de leitura;
- qualidade das tabelas;
- referência correta de página;
- taxa de texto ilegível;
- necessidade de OCR adicional;
- tamanho da saída estruturada.

## Estratégia de execução

- contêiner sem porta pública;
- acionamento por fila;
- arquivos temporários removidos após processamento;
- versões e modelos fixados;
- Trivy no contêiner;
- limite de tamanho e páginas;
- nenhuma dependência remota obrigatória para documentos sensíveis.

## Critérios de aceite

- páginas e trechos podem ser citados de forma consistente;
- processamento não bloqueia o app;
- arquivos temporários são removidos;
- falha de extração gera estado claro e permite nova tentativa;
- documentos inadequados podem seguir para revisão manual.

## Gate G2

Aprovar Docling somente se sua qualidade superar claramente uma extração simples sem introduzir consumo incompatível com o VPS.

---

# Fase 6 — Busca semântica com pgvector

## Objetivo

Encontrar trechos relevantes sem criar um segundo banco vetorial.

## Entregáveis

- instalação versionada da extensão `vector`;
- coluna de embedding em `document_chunks`;
- modelo de embeddings fixado e documentado;
- registro da versão do embedding;
- indexação progressiva;
- busca híbrida: filtros relacionais + busca textual + vetor;
- isolamento obrigatório por `organization_id` e `inventory_property_id`;
- reindexação quando o modelo mudar;
- exclusão de embeddings junto com o documento.

## Regra de recuperação

A busca deverá filtrar primeiro por organização e imóvel. O vetor não poderá pesquisar globalmente e filtrar depois.

## Critérios de aceite

- os trechos retornados pertencem somente ao imóvel e à organização consultados;
- perguntas objetivas recuperam a página correta no conjunto de teste;
- o sistema mostra baixa confiança quando os trechos não sustentam a resposta;
- mudança de modelo de embedding não mistura versões silenciosamente.

---

# Fase 7 — Dossiê Inteligente MVP

## Objetivo

Entregar a primeira experiência NotebookLM própria dentro da ficha do imóvel.

## Interface mínima

Na ficha do imóvel:

- **Visão geral**;
- **Documentos**;
- **Fatos e divergências**;
- **Perguntar ao dossiê**;
- **Histórico**.

## Perguntas prioritárias

1. Qual é a área informada em cada fonte?
2. Existe divergência entre matrícula, IPTU e cadastro?
3. Quem aparece como proprietário ou interessado?
4. Há menção a financiamento, ônus, ocupação ou permuta?
5. Quais documentos estão ausentes ou desatualizados?
6. Quais informações ainda dependem de confirmação humana?
7. Prepare um roteiro de visita usando somente fatos confirmados.
8. Prepare um resumo para o proprietário com as fontes utilizadas.

## Formato obrigatório da resposta

1. **Resposta** — síntese curta;
2. **Evidências** — documento, página/localização e trecho;
3. **Confiança** — alta, média ou baixa;
4. **Limitações** — o que não foi encontrado ou não pôde ser comprovado;
5. **Próxima ação** — documento, confirmação ou diligência necessária.

## Barreiras

- o prompt recebe somente os trechos recuperados e instruções;
- o modelo não recebe liberdade para completar conhecimento externo;
- toda citação deve usar identificador fornecido pelo backend;
- citação inexistente invalida a resposta;
- perguntas jurídicas sensíveis recebem linguagem de apoio, nunca conclusão definitiva;
- quitação, inexistência de ônus, regularidade e validade não são afirmadas por silêncio documental.

## Critérios de aceite

- nenhuma resposta documental sem fonte;
- clique na evidência abre o local correto;
- respostas sem base suficiente dizem “não foi possível comprovar”;
- cada resposta registra modelo, trechos utilizados e versão dos documentos, sem copiar conteúdo integral para logs;
- o usuário pode marcar uma informação como confirmada, rejeitada ou pendente;
- exclusão do documento remove sua participação nas respostas futuras.

---

# Fase 8 — PDFs e automações derivadas

## Objetivo

Transformar fatos confirmados do dossiê em materiais úteis, sem permitir que a IA invente conteúdo.

## Entregáveis com Gotenberg

- roteiro de visita;
- ficha técnica do imóvel;
- checklist documental;
- relatório quinzenal ao proprietário;
- anexo documental do laudo;
- proposta comercial;
- resumo de pendências.

## Regras

- templates HTML/CSS versionados;
- dados estruturados preenchem o template;
- a IA pode redigir explicações, mas não inserir fatos sem fonte;
- documento final registra versão do template, fontes e data;
- envio e publicação dependem de aprovação humana.

## Critérios de aceite

- PDF reproduz corretamente fontes, ressalvas e dados confirmados;
- regeneração com os mesmos dados é consistente;
- versões antigas permanecem auditáveis;
- nenhum PDF é enviado automaticamente sem confirmação.

---

# Fase 9 — Piloto controlado

## Público

3 a 5 corretores design partners, com quantidade limitada de imóveis e documentos.

## Métricas de produto

- imóveis com pelo menos um documento processado;
- perguntas por imóvel;
- percentual de respostas úteis;
- percentual de respostas sem evidência suficiente;
- tempo para localizar uma informação;
- correções humanas por tipo de documento;
- uso dos roteiros e relatórios gerados;
- dias ativos por semana;
- retenção após 2 e 4 semanas.

## Métricas técnicas

- tempo de upload e processamento;
- fila do Docling/OCR;
- duração da busca;
- duração da resposta;
- uso local versus remoto;
- memória e CPU;
- taxa de erro;
- taxa de citação inválida;
- custo por imóvel processado.

## Gate G3

Só ampliar para toda a base quando:

- nenhuma falha de isolamento for encontrada;
- a maioria das respostas objetivas estiver sustentada por fontes corretas;
- o servidor suportar o volume do piloto;
- o corretor economizar tempo de forma perceptível;
- o fluxo não exigir treinamento complexo.

---

# Fase 10 — Expansões posteriores

Somente após o piloto provar valor:

- transcrição de áudios do proprietário;
- comparação automática entre versões de matrícula e certidão;
- alertas de documento vencido;
- checklist por tipo de negócio;
- relatório automático de visita;
- preparação assistida de proposta;
- resumo do histórico de relacionamento;
- busca transversal autorizada entre imóveis da mesma organização;
- biblioteca interna de procedimentos da imobiliária;
- modo de auditoria para gestores;
- integração controlada com e-mail, WhatsApp e Drive.

---

## 4. Sequência resumida

| Ordem | Fase | Resultado principal |
|---:|---|---|
| 0 | Baseline | saber como a IA realmente opera hoje |
| 1 | Painel | visualizar eficiência, falhas e fallback |
| 2 | Endurecimento | sensibilidade, fila, cache privado e validadores |
| 3 | Captura híbrida | IA somente para lacunas e ambiguidades |
| 4 | Fundação documental | documentos, trechos, fatos e proveniência |
| 5 | Docling | leitura estruturada em serviço interno |
| 6 | pgvector | recuperação semântica no PostgreSQL |
| 7 | Dossiê MVP | perguntas e respostas obrigatoriamente citadas |
| 8 | Gotenberg | relatórios e documentos derivados |
| 9 | Piloto | validação com corretores reais |
| 10 | Expansões | áudio, automações e escala |

## 5. Dependências críticas

- Fases 0–3 podem evoluir sobre a arquitetura atual.
- Fase 4 exige autenticação individual, organizações reais e RLS.
- Fase 5 depende da fundação documental.
- Fase 6 só instala pgvector quando existir a tela de busca.
- Fase 7 depende de recuperação, fontes e validação de citações.
- Fase 8 depende de fatos confirmados e templates versionados.
- Fase 9 exige políticas mínimas de LGPD, backup, exclusão e resposta a incidentes.

## 6. O que não fazer

- não instalar Open Notebook, AnythingLLM ou RAGFlow como segundo sistema;
- não criar Qdrant enquanto o PostgreSQL atender;
- não enviar documento sensível automaticamente para API externa;
- não armazenar prompts ou documentos integrais em logs;
- não gerar resposta documental sem citação;
- não permitir que a IA conclua quitação, inexistência de ônus ou validade jurídica;
- não instalar pgvector antes de existir uma funcionalidade que o use;
- não processar documentos pesados no mesmo fluxo síncrono do usuário;
- não oferecer dezenas de botões ou um “chat genérico” sem contexto;
- não substituir decisões determinísticas por agentes autônomos.

## 7. Definição de pronto do projeto

O Dossiê Inteligente estará pronto para lançamento amplo quando:

1. cada documento e trecho estiver isolado por organização;
2. toda resposta documental apresentar fonte navegável;
3. respostas insuficientes forem honestas e explícitas;
4. dados sensíveis seguirem a política local/remoto;
5. o corretor puder corrigir e confirmar fatos;
6. exclusões removerem arquivos, trechos, embeddings e caches derivados;
7. logs não contiverem documentos ou PII desnecessária;
8. os relatórios forem gerados por templates auditáveis;
9. o servidor suportar o uso real sem prejudicar o restante do app;
10. corretores conseguirem usar o recurso sem curso ou onboarding pesado.

## 8. Próxima entrega recomendada

A primeira implementação deve ser **Fase 0 + Fase 1: baseline e painel de eficiência da IA**.

Ela possui baixo risco, não altera a avaliação, não introduz documentos privados, aproveita as tabelas já existentes e fornecerá dados objetivos para decidir quais modelos e provedores realmente merecem permanecer na cadeia.