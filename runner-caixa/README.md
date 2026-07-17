# Runner residencial da Caixa

O VPS recebe **HTTP 403** do Radware Bot Manager ao baixar o CSV da Caixa (bloqueio por
IP de datacenter — testado em 17/07/2026). Esta máquina (IP residencial) baixa o CSV,
geocodifica no cadastro municipal e **envia o JSON já pronto ao VPS**, que faz o
diff/eventos/desconto. Todo o processamento pesado fica no VPS; a máquina só baixa e posta.

## Instalação (uma vez)

1. **Preencher o segredo** (fora do repositório, nunca commitado):
   ```powershell
   mkdir "$env:USERPROFILE\.radar" -Force
   copy runner-caixa\ingest.env.exemplo "$env:USERPROFILE\.radar\ingest.env"
   notepad "$env:USERPROFILE\.radar\ingest.env"
   ```
   Cole no lugar de `COLE_O_TOKEN_AQUI` o valor de `MOTOR_TOKEN` que está em
   `/opt/radar/api/.env` no VPS (`ssh radar-vps "grep MOTOR_TOKEN /opt/radar/api/.env"`).

2. **Registrar a tarefa diária** (22:40):
   ```powershell
   powershell -ExecutionPolicy Bypass -File runner-caixa\instalar-tarefa.ps1
   ```

3. **Testar agora**:
   ```powershell
   Start-ScheduledTask -TaskName RadarCaixaRunner
   Get-Content "$env:USERPROFILE\.radar\logs\caixa-$(Get-Date -Format yyyy-MM-dd).log"
   ```

## O que roda

`enviar-caixa.ps1` → `python atualizar-caixa.py` (na raiz do repo). O script já:
- baixa `Lista_imoveis_GO.csv`, filtra Goiânia;
- casa bairro + quadra/lote com o cadastro municipal (pino no lote);
- grava `caixa-goiania.js` (compatibilidade) **e**, com `RADAR_INGEST_URL`+`MOTOR_TOKEN`
  no ambiente, faz `POST` do JSON para `…/motor/ingestao/caixa`.

## Se o download falhar

Se o Radware um dia bloquear também o IP residencial, o script aborta com erro (o VPS
mantém o último dado, rotulado com a data). **Nunca** burlar CAPTCHA — cair para
atualização manual no navegador ou pedido via LAI à Caixa.
