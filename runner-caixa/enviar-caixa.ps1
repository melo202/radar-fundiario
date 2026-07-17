# Runner residencial da Caixa (projeto Oportunidades, 17/07/2026).
# O VPS recebe HTTP 403 do Radware ao baixar o CSV da Caixa; ESTA maquina (IP
# residencial) baixa, geocodifica no cadastro e ENVIA o JSON ao VPS, que faz o
# diff/eventos/desconto. Roda 1x/dia pela Tarefa Agendada (instalar-tarefa.ps1).
#
# O segredo (URL de ingestao + MOTOR_TOKEN) fica em %USERPROFILE%\.radar\ingest.env,
# FORA do repositorio — nunca commitado. Preencha-o uma vez (veja README.md).

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot          # raiz do repositorio (pai de runner-caixa)
$envFile = Join-Path $env:USERPROFILE ".radar\ingest.env"
$logDir = Join-Path $env:USERPROFILE ".radar\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("caixa-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

if (-not (Test-Path $envFile)) {
  "[$(Get-Date -Format o)] FALTA $envFile — copie ingest.env.exemplo e cole o token." | Tee-Object -FilePath $log -Append
  exit 1
}
# carrega as variaveis do arquivo de segredo (linhas CHAVE=valor, ignora comentarios)
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
  }
}
if (-not $env:MOTOR_TOKEN -or $env:MOTOR_TOKEN -eq "COLE_O_TOKEN_AQUI") {
  "[$(Get-Date -Format o)] MOTOR_TOKEN nao configurado em $envFile." | Tee-Object -FilePath $log -Append
  exit 1
}

$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { $py = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $py) { "[$(Get-Date -Format o)] Python nao encontrado no PATH." | Tee-Object -FilePath $log -Append; exit 1 }

"[$(Get-Date -Format o)] iniciando runner da Caixa (repo: $repo)" | Tee-Object -FilePath $log -Append
Push-Location $repo
try {
  & $py "atualizar-caixa.py" 2>&1 | Tee-Object -FilePath $log -Append
  $code = $LASTEXITCODE
} finally { Pop-Location }
"[$(Get-Date -Format o)] runner terminou com codigo $code" | Tee-Object -FilePath $log -Append
exit $code
