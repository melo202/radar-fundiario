# Registra a Tarefa Agendada do runner da Caixa (roda 1x/dia, 22:40 — logo apos a Caixa
# regenerar o CSV da madrugada seguinte, com folga). Idempotente: re-registra se ja existe.
# Rode UMA vez, no PowerShell do seu usuario:  powershell -ExecutionPolicy Bypass -File instalar-tarefa.ps1

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "enviar-caixa.ps1"
$nome = "RadarCaixaRunner"

$acao = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$script`""
$gatilho = New-ScheduledTaskTrigger -Daily -At 10:40PM
# se o PC estiver desligado no horario, roda assim que ligar:
$cfg = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $gatilho -Settings $cfg `
  -Description "Baixa a lista da Caixa e envia ao Corretor Inteligente (projeto Oportunidades)." `
  -Force | Out-Null

Write-Host "Tarefa '$nome' registrada — roda todo dia as 22:40."
Write-Host "Testar agora:  Start-ScheduledTask -TaskName $nome"
Write-Host "Ver log:       Get-Content `"$env:USERPROFILE\.radar\logs\caixa-$(Get-Date -Format yyyy-MM-dd).log`""
