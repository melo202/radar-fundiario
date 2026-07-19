# Auditoria do plano e do front — 19/07/2026

> Pedido do usuário: *"faz uma auditoria no plano, e veja se você trocaria algo. Tô achando o
> front um pouco complexo demais, não está estilo Nubank intuitivo. E tem que ser uma
> ferramenta que o corretor vai usar todo dia."*
>
> Método: 4 auditores independentes (lentes UX-front, hábito diário, escopo dos roadmaps,
> assistente na UI) + 2 céticos adversariais por recomendação de alto impacto (28 pareceres).
> 11 recomendações confirmadas sem nenhuma refutação; 3 achados refutados e descartados.

## Veredito em uma frase

O produto tem fundações certas (nav de 5 destinos, estados vazios que ensinam, captura com
confirmação, linguagem de corretor na maior parte), mas a branch kimi inverteu a hierarquia —
**o assistente virou a porta de entrada e a resposta "o que eu faço agora" caiu para o 4º
bloco da tela** — e o loop de hábito está aberto nas duas pontas: **nenhum gatilho traz o
corretor de volta amanhã** (sem PWA do escritório, sem resumo, sem novidade exógena no Hoje)
**e a recompensa diária não existe** (tudo que aparece depende do que o próprio corretor
cadastrou). Notas por lente: UX 6/10 · hábito **3,5/10** · escopo 4/10 · assistente 6,5/10.

A queixa do usuário está correta e já era decisão registrada em 17/07 (ROADMAP-OS.md, "UX
guiada": central de trabalho, não dashboard; esconder modelos e estrutura administrativa) —
a execução dos 2 dias seguintes foi na direção contrária.

## O que muda (confirmado pelos céticos)

### A. Congelamento da expansão de inteligência (efeito imediato)

1. **ULTRAROADMAP Ondas 3–14 e AUTOEVOLUÇÃO E2–E10 congeladas até G1+G2 passarem.**
   O gate estava declarado (ROADMAP-OS.md: "a alpha para AQUI até o GATE G1 rodar") e foi
   violado 25h depois por ~35 commits de infra K3/Hermes. A suposição mais arriscada continua
   sendo adoção, não tecnologia — e continua sem teste.
2. Da Onda 0 fica só **higiene do que já está em produção** (bugs do pipeline deployado, sem
   capacidade nova). E0 vira "provar em produção o que já subiu" (migration 017 + baseline);
   E1 é deploy de backend/migration 018 e medição — **sem expor a UI de feedback complexa**.
3. **Regra nova:** toda peça móvel nova (timer, serviço, runner) exige aposentar uma existente
   ou justificar por evidência de uso. Exceção: ativar o runner-caixa (termina peça já entregue).
   Se o G1 não validar os sinais do radar, desligar radar-intelligence.timer **e, no mesmo
   commit, esconder o botão "Investigar" e o painel de sinais** (botão sem executor é a pior UX).

### B. Front do dia a dia — a correção "Nubank" (prioridade sobre features, decisão de 17/07)

4. **Home ação-primeiro:** saudação com a pergunta em 1 linha → **"Sua próxima ação"**
   (manchete: a ação nº 1 do ranking, com o motivo que já existe) → 2–3 ações seguintes →
   "Ver todas (N)" → assistente compacto (a caixa continua, sem o link duplicado "Abrir
   conversa completa") → contadores viram **uma linha de texto tocável** ("4 imóveis · 2
   interessados · 1 pendência"). Guia de 3 passos: só primeiro uso, auto-esconde por conclusão.
5. **"Melhorias para revisar" sai do Hoje** → painel admin (regra: esconder estrutura
   administrativa). O Hoje deixa de chamar /melhorias.
6. **Dossiê: dados do imóvel primeiro, radar depois.** Sinal com 3 ações — "É isso mesmo",
   "Não é isso" (motivos em linguagem de corretor, mapeados no front para os códigos que o
   banco já tem — a taxonomia de 13 continua no schema, invisível), "Depois" — e uma linha
   **"Próximo passo"** determinística por tipo de sinal. Sem decisão registrada = acompanhando
   (não precisa de botão para inconclusivo).
7. **Vazamentos de sistema corrigidos:** badge "Kimi K3" some (regra: esconder modelos);
   "Analisando lote 2 de 5" → "Analisando — esta tela atualiza sozinha" (lote colide com lote
   de terreno); seletor de sessões → chip "Falando sobre: X" + botão "Conversa geral".
8. **Responder interessado em 1 toque a partir da cobrança:** o card do Hoje abre o dossiê na
   aba Comercial com o card do interessado expandido (exige inventory_property_id no payload
   do visaoHoje; fallback atual preservado para oportunidade sem imóvel).

### C. Mecânica mínima de hábito (determinística, sem vigilância)

9. **PWA do escritório:** o único ícone instalável hoje abre o Mapa público. Criar manifest
   próprio (start_url /painel/os, servido em rota pública antes do gate de sessão; ícones
   iOS no head). Sem service worker novo.
10. **Estado vazio ativo:** quando o Hoje zerar, o servidor sugere "Reaqueça o [imóvel] —
    parado há N dias" (a definição de Parado migra do front para o core, uma fonte da verdade).
    O app nunca termina em silêncio.
11. **Novidade exógena no Hoje:** 1 card/dia com oportunidades da Caixa nos bairros da
    carteira (dado já coletado), formulado como ação e com guarda de frescor (dado >3 dias não
    se chama "novidade"). Pré-requisito: instalar o runner (pendência humana do MOTOR_TOKEN).
12. **Hoje revalida sozinho** quando a aba volta ao foco em outro dia (ou >30 min).
13. **Métrica-norte instrumentada:** evento dia_ativo em domain_events + sequência de dias no
    painel admin. Vira O número do projeto.

### D. Processo (humano)

14. **G0-dogfood:** Bruno usa o OS de verdade por 5 dias úteis antes do G1; cada fricção vira
    backlog. **G1 esta semana** com o ROTEIRO-G1.md pronto — é o único item do caminho crítico.
15. Resumo matinal por e-mail: bom candidato, mas exige serviço de e-mail (SPF/DKIM) e sessão
    longa no celular — decisão adiada para depois do G1 (registrada, não perdida).

## O que os céticos refutaram (e fica como está)

- **"Mapa é um segundo app duplicado"** — refutado: o dossiê do Mapa descreve imóvel cadastral
  público; o do OS, imóvel da carteira com interessados e histórico. Objetos distintos.
- **"Criar fase F-UX formal antes do G1"** — refutado: a simplificação já é prioridade
  registrada em 17/07, acima de features. Não precisa de fase; precisa de execução (seção B).
- **"Produção rastreia branch experimental = freeze dissolvido"** — refutado: não há drift
  (a corretor-inteligente-os está contida na kimi por fast-forward) e nenhuma regra crava a
  branch de deploy.

## Sequência das próximas 2 semanas (se a única métrica fosse "5 dias seguidos de uso real")

- **Dias 1–2:** freeze registrado + seção B implementada + provar E0/E1 em produção.
- **Dias 2–5:** seção C + G0-dogfood começa.
- **Semana 2:** G1 com corretores reais; o resultado decide se Ondas 1–2 saem do freezer
  (corretores valorizam sinais?) ou se o foco vira captação/funil.
