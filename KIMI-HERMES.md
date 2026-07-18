# Assistente privado — Kimi Code + Hermes

## Estado desta branch

Branch: `agent/kimi-personal-assistant`.

Esta fatia entrega a integração do produto com uma interface de runtime substituível:

- `HermesRuntime`: chama o Hermes Agent em loopback pela Responses API stateful;
- `DirectKimiRuntime`: saída de emergência, desligada por padrão;
- `LocalRuntime`: fallback pelo `AIProvider`/Ollama existente;
- sessões separadas por objeto;
- perfil permanente com recuperação seletiva de memória;
- orçamento de contexto por sessão;
- registro de consumo e fallback sem guardar prompts no log de uso;
- interface central do assistente no Corretor Inteligente OS;
- somente leitura nesta primeira etapa.

O especialista principal usa o ID oficial `k3`, disponível no plano Allegretto. O HighSpeed usa `kimi-for-coding-highspeed` e continua desativado por padrão; em julho de 2026 ele ainda pertence à linha K2.7, por isso não substitui silenciosamente o K3.

## Limite de segurança

O Hermes não deve rodar como `root` nem compartilhar livremente o filesystem do motor. Seu servidor HTTP expõe o agente com ferramentas de terminal e arquivos. A instrução “somente leitura” melhora o comportamento, mas não é uma barreira de segurança.

Antes de ativar `AGENT_RUNTIME=hermes`:

1. criar usuário Linux dedicado, sem sudo;
2. executar o terminal do Hermes em container isolado;
3. não montar `/opt/radar/api/.env`, dados do PostgreSQL, chaves SSH ou diretórios pessoais;
4. manter a API em `127.0.0.1:8642`;
5. usar uma `API_SERVER_KEY` exclusiva e longa;
6. configurar o Kimi no Hermes pelo fluxo `hermes model`, preservando a identidade real do cliente;
7. só liberar acesso aos dados por endpoints controlados do motor;
8. validar `/health`, `/v1/models` e uma conversa sem ferramentas perigosas.

## Variáveis do motor

```dotenv
AGENT_RUNTIME=hermes
AGENT_TIMEOUT_MS=180000
AGENT_LOCAL_FALLBACK=true
HERMES_BASE_URL=http://127.0.0.1:8642/v1
HERMES_API_KEY=<segredo exclusivo entre motor e Hermes>
HERMES_MODEL=hermes-agent
```

A chave da assinatura Kimi deve ficar no ambiente/configuração isolada do Hermes, nunca no `.env` do motor quando o runtime ativo for Hermes.

## Configuração do provedor no Hermes

No usuário dedicado do Hermes:

```text
hermes model
Custom endpoint
Base URL: https://api.kimi.com/coding/v1
API key: chave criada no Kimi Code Console
Model: k3
```

Ativar a API local do Hermes no arquivo de ambiente do perfil:

```dotenv
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=<segredo exclusivo entre motor e Hermes>
```

O segredo `API_SERVER_KEY` e `HERMES_API_KEY` deve ser o mesmo valor, guardado separadamente em cada serviço com permissão `600`/`640` conforme o usuário do processo.

## Deploy controlado

O deploy da API e o deploy do app usam `agent/kimi-personal-assistant` por padrão, evitando que cada superfície publique uma branch diferente:

```text
bash /opt/radar/repo/motor/deploy-all.sh
```

O deploy aplica automaticamente `009-agent-runtime.sql`. Só alterar `AGENT_RUNTIME` para `hermes` depois que o gateway isolado responder em loopback.

## Próxima fatia

Depois do deploy seguro:

- associar conversa diretamente a imóvel, cliente e avaliação pela interface;
- expor ferramentas de leitura controladas por um serviço intermediário, não por acesso ao PostgreSQL;
- adicionar o painel de consumo diário/semanal;
- liberar escrita apenas com confirmação humana explícita e auditoria.

## Orquestrador de inteligência assíncrono

A partir da migração `014-intelligence-orchestrator.sql`, o Hermes/K3 também opera fora
do caminho síncrono do chat. O timer `radar-intelligence.timer` cria uma investigação
diária depois das varreduras, e o K3:

1. planeja consultas dentro de um orçamento explícito;
2. recebe ofertas recentes, mudanças de preço e resultados públicos como dados não confiáveis;
3. cruza entidades e produz hipóteses ligadas a IDs de evidência;
4. grava somente `intelligence_findings` com status `candidate`.

O orquestrador não contém `INSERT` ou `UPDATE` em `properties`, `valuations` ou na
carteira privada. Promoção de um achado para a base confiável exige uma etapa posterior
de validação e revisão humana.
