# Corretor Inteligente OS — arquitetura do novo braço

Branch: `agent/corretor-inteligente-os`
Base protegida: `agent/radar-ultrapremium`

## Tese

O corretor não deve operar módulos. Deve abrir o produto, entender o que merece atenção e aprovar ações preparadas. A primeira vertical slice prova essa tese sem reescrever o Radar territorial.

## Limites dos domínios

### Mercado público

Continua nas estruturas existentes:

- `listings`
- `properties`
- `price_history`
- `valuations`
- `valuation_comparables`

Esses dados alimentam avaliação, comparáveis, inteligência territorial e documentos. Um registro de `properties` nunca vira automaticamente um imóvel captado.

### Operação privada

Nasce na migração `006-corretor-os.sql`:

- `organizations`
- `app_users`
- `organization_members`
- `contacts`
- `contact_preferences`
- `inventory_properties`
- `opportunities`
- `tasks`
- `domain_events`

Toda linha privada possui `organization_id`. Nesta alpha, a sessão do painel acessa uma organização padrão. Isso é uma ponte temporária; autenticação individual e isolamento por organização continuam obrigatórios antes do uso comercial.

`recommendations`, `approvals`, visitas, propostas e documentos privados não foram criados antecipadamente. Eles entram somente na fase em que houver interface, regra de segurança e teste de uso para essas entidades. Oportunidades usam temperatura qualitativa — quente, morno ou frio — em vez de uma probabilidade numérica sem base histórica.

## Primeira vertical slice

Rota protegida: `/painel/os`

Navegação:

1. Hoje
2. Carteira
3. Relacionamentos
4. Capturar

### Hoje

Prioriza regras explicáveis:

- tarefa vencida;
- tarefa para as próximas 24 horas;
- imóvel sem proprietário;
- imóvel sem preço;
- imóvel sem bairro;
- oportunidade sem interação recente.

A IA não escolhe prioridade nesta fase.

### Captura universal

Fluxo em duas etapas:

1. interpretar texto sem persistir;
2. mostrar campos, confiança e lacunas;
3. confirmar;
4. criar imóvel, contato, tarefas e evento de domínio.

Nada é salvo antes da confirmação.

### Cadastro progressivo

O imóvel nasce em `prospect`. Dados ausentes geram próximas ações, não bloqueiam o cadastro.

## Segurança

- toda rota do OS exige sessão válida;
- todo POST exige CSRF;
- SQL parametrizado;
- nenhum endpoint público de carteira;
- sem envio autônomo de mensagens;
- sem publicação ou alteração de preço automática;
- sem inferência salva como fato confirmado.

## Feature flag operacional

A branch isola o desenvolvimento. O novo shell não substitui a aplicação principal nem altera a publicação da `master`. O acesso inicial é direto por `/painel/os`.

## Próximos passos

1. autenticação individual;
2. organização real por usuário e Row-Level Security;
3. importação do backup local de interessados;
4. edição de imóvel e contato;
5. oportunidades e timeline do dossiê;
6. teste de hábito com corretores reais;
7. recomendações persistidas e fila de aprovações somente quando houver interface e feedback;
8. matching explicável;
9. modo visita e relatório automático por eventos.

## Critério de honestidade

Esta entrega é uma alpha funcional da fundação operacional. Não é ainda um SaaS multiusuário pronto para 2 mil corretores. A estrutura foi criada para chegar lá sem contaminar o motor territorial e de avaliação.
