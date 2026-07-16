# Ideia registrada — Dossiê Inteligente com fontes

Data: 16/07/2026
Branch: `agent/corretor-inteligente-os`
Status: ideia aprovada para fase posterior; não instalar Open Notebook inteiro.

## Objetivo

Criar dentro de cada imóvel uma experiência inspirada no NotebookLM, mas integrada ao Corretor Inteligente e ao banco existente.

O corretor poderá adicionar matrícula, IPTU, certidões, contrato, avaliação, fotos de documentos, áudios e observações. Depois poderá perguntar ao dossiê e receber uma resposta vinculada ao documento, página, trecho e nível de confiança.

Exemplos:

- Qual é a área registrada na matrícula?
- Existe divergência entre IPTU, matrícula e cadastro do corretor?
- O proprietário mencionou permuta?
- Quais documentos ainda faltam?
- O imóvel está quitado ou ainda não há prova suficiente?
- Prepare o roteiro da visita usando somente informações confirmadas.
- Prepare o relatório quinzenal e indique as fontes utilizadas.

## Princípio de arquitetura

Não incorporar o Open Notebook como um segundo produto completo. Aproveitar o conceito e, quando a fase chegar, avaliar apenas componentes pequenos:

1. leitura estruturada de documentos, inicialmente com Docling em serviço interno;
2. armazenamento do texto e da proveniência no PostgreSQL;
3. busca semântica com `pgvector`, sem criar outro banco vetorial;
4. cadeia de IA já existente para sintetizar os trechos encontrados;
5. resposta obrigatoriamente acompanhada de fontes;
6. confirmação humana para conclusões jurídicas, documentais e comerciais.

## Modelo mínimo de proveniência

Cada trecho deverá guardar, no mínimo:

- `organization_id`;
- `inventory_property_id`;
- `document_id`;
- nome e tipo do documento;
- página ou localização interna;
- texto original;
- hash do arquivo e do trecho;
- data de processamento;
- método de extração;
- confiança da extração;
- embedding, quando habilitado;
- classificação: declarado, observado, extraído ou inferido;
- status de confirmação humana.

## Formato obrigatório da resposta

Toda resposta documental deverá separar:

1. **Resposta:** síntese curta e clara;
2. **Evidências:** documento, página e trecho relevante;
3. **Confiança:** alta, média ou baixa;
4. **Limitações:** o que não foi encontrado ou não pôde ser comprovado;
5. **Próxima ação:** documento ou confirmação ainda necessária.

A IA nunca transforma silêncio documental em prova. Ausência de menção a financiamento, ônus ou dívida não significa quitação.

---

# Auditoria inicial da IA já existente

## O que já está bem construído

O projeto já possui uma camada de IA desacoplada do fornecedor em `motor/ai-provider.js`.

Características positivas já implementadas:

- cadeia de provedores remotos e Ollama local como fallback;
- modelos separados entre tarefas rápidas e avançadas;
- cooldown independente por provedor;
- tratamento específico de limite HTTP 429;
- temperatura baixa;
- desligamento de raciocínio desnecessário em tarefas de extração;
- limite de tokens declarado por tarefa;
- cache por hash do conteúdo;
- registro de duração, tokens, modelo, sucesso e erro;
- saída estruturada validada com JSON Schema e AJV;
- nenhuma IA no cálculo numérico da avaliação;
- barreiras contra números inventados nos pareceres;
- fallback determinístico no resumo de localização.

## Onde a IA é usada hoje

### Extração de anúncios

Transforma título e descrição em JSON estruturado. Campos sem evidência devem permanecer `null`. O schema rejeita propriedades inesperadas.

### Parecer da avaliação

A avaliação é calculada por código. A IA recebe um JSON fechado e apenas redige a explicação. Valores monetários entram por placeholders e o texto é rejeitado quando contém números não autorizados.

### Resumo do entorno

A IA recebe somente categorias, contagens, distâncias e qualidade já medidas. Uma validação numérica rejeita dados inventados. Após falhas, o sistema entrega um resumo determinístico.

## Veredito preliminar

A arquitetura é prudente e, em desenho, eficiente. Ela usa IA principalmente onde linguagem acrescenta valor e preserva regras determinísticas no núcleo.

Ainda não é possível afirmar que a operação está economicamente otimizada sem consultar os dados reais de `ai_logs`. Precisamos medir por tarefa:

- volume de chamadas;
- porcentagem atendida por cache;
- porcentagem por provedor;
- taxa de erro;
- taxa de fallback para o modelo local;
- duração mediana e percentil 95;
- tokens de saída;
- quantidade de tentativas por resultado válido;
- tempo total gasto no local;
- taxa de rejeição dos validadores.

## Melhorias prioritárias antes de ampliar a IA

### 1. Painel de eficiência

Criar uma visão agregada de `ai_logs`, sem armazenar o conteúdo dos prompts, mostrando eficiência por tarefa, modelo e provedor.

### 2. Captura universal híbrida

A captura atual do OS começa com parser determinístico. Manter essa camada barata e rápida. Acionar a IA estruturada somente quando campos importantes continuarem ausentes ou ambíguos.

Fluxo recomendado:

1. parser determinístico;
2. medir campos ausentes;
3. IA rápida somente para lacunas;
4. validar com schema;
5. apresentar ao usuário;
6. persistir somente após confirmação.

### 3. Classificação de sensibilidade

Antes de documentos privados, toda tarefa de IA deverá declarar:

- `publico`: pode usar remoto;
- `interno`: remoto somente conforme política;
- `pessoal`: preferencialmente local;
- `sensivel`: somente local, salvo consentimento e contrato adequados.

O roteador deverá escolher o provedor também pela sensibilidade, não apenas pelo tier `fast` ou `advanced`.

### 4. Cache isolado para dados privados

O cache atual funciona por hash global de conteúdo e é adequado para anúncios e dados públicos. Para documentos privados, incluir organização, imóvel, versão do documento e política de retenção na chave, ou desabilitar cache compartilhado.

### 5. Controle de concorrência

Criar fila ou semáforo para chamadas locais. Várias tarefas simultâneas não podem saturar CPU e memória do VPS nem bloquear a experiência principal.

### 6. Validadores compilados uma vez

Evitar recompilar o mesmo JSON Schema no AJV em cada chamada. Manter validadores por hash de schema em memória.

### 7. Fontes obrigatórias no Dossiê

A resposta do futuro Dossiê Inteligente não poderá usar conhecimento livre do modelo para completar lacunas. O modelo receberá somente os trechos recuperados e deverá citar os identificadores fornecidos.

## Sequenciamento aprovado

1. manter a IA atual sem alterar o motor numérico;
2. criar painel de eficiência usando `ai_logs`;
3. transformar a captura universal em fluxo híbrido;
4. implementar classificação de sensibilidade e roteamento local/remoto;
5. adicionar estrutura de documentos e proveniência;
6. instalar `pgvector` somente quando houver a primeira tela que o utilize;
7. avaliar Docling em contêiner interno;
8. lançar Dossiê Inteligente com fontes para um grupo pequeno de teste.

## Critérios de aceite do Dossiê

- nenhuma resposta sem fonte quando a pergunta for documental;
- documento e página visíveis ao usuário;
- trechos recuperados pertencem à organização autenticada;
- nenhuma conclusão de quitação, ônus, regularidade ou validade jurídica sem ressalva e confirmação;
- exclusão de um documento remove seus trechos e embeddings;
- logs não armazenam o conteúdo integral do documento;
- modelos remotos não recebem dados sensíveis sem política expressa;
- resposta sem evidência suficiente deve dizer claramente que não foi possível comprovar.
