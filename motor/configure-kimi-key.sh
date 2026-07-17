#!/usr/bin/env bash
# Troca a chave do Kimi sem exibi-la e só ativa o Hermes após testes reais.
set -euo pipefail

DATA_DIR=/opt/radar/hermes-data
CONFIG=$DATA_DIR/config.yaml
HERMES_ENV=$DATA_DIR/.env
MOTOR_ENV=/opt/radar/api/.env
CONTAINER=radar-hermes

fail() { echo "ERRO: $*" >&2; exit 1; }
[[ ${EUID:-$(id -u)} -eq 0 ]] || fail "execute como root"
[[ -f "$CONFIG" && -f "$HERMES_ENV" && -f "$MOTOR_ENV" ]] || fail "configuração do Radar/Hermes não encontrada"
docker inspect "$CONTAINER" >/dev/null 2>&1 || fail "container $CONTAINER não encontrado"

echo "Cole a NOVA chave do Kimi Code e pressione Enter. Ela ficará invisível:"
IFS= read -r -s KIMI_KEY
echo
[[ "$KIMI_KEY" =~ ^[A-Za-z0-9_-]{20,}$ ]] || fail "a chave não parece válida"

CHECK=$(mktemp)
HTTP=$(curl -sS -o "$CHECK" -w '%{http_code}' \
  -H "Authorization: Bearer $KIMI_KEY" \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: Hermes-Agent/0.18.2' \
  -d '{"model":"k3","messages":[{"role":"user","content":"Responda somente OK"}],"max_tokens":16}' \
  https://api.kimi.com/coding/v1/chat/completions || true)
if [[ "$HTTP" != 200 ]]; then
  echo "A Kimi rejeitou a chave (HTTP $HTTP):" >&2
  sed -E 's/sk-[A-Za-z0-9_-]+/[CHAVE-OCULTA]/g' "$CHECK" | head -c 800 >&2 || true
  echo >&2
  rm -f "$CHECK"
  unset KIMI_KEY
  fail "o assistente continua no runtime local"
fi
rm -f "$CHECK"

CONFIG_BACKUP="$CONFIG.before-key-$(date +%Y%m%d%H%M%S)"
cp -a "$CONFIG" "$CONFIG_BACKUP"
printf '%s\n' "$KIMI_KEY" | docker exec -i "$CONTAINER" python -c '
import sys, yaml
path = "/opt/data/config.yaml"
key = sys.stdin.readline().strip()
with open(path, encoding="utf-8") as handle:
    data = yaml.safe_load(handle) or {}
data.setdefault("model", {})["api_key"] = key
with open(path, "w", encoding="utf-8") as handle:
    yaml.safe_dump(data, handle, allow_unicode=True, sort_keys=False)
' >/dev/null
unset KIMI_KEY
chown 10000:10000 "$CONFIG"
chmod 600 "$CONFIG"

docker restart "$CONTAINER" >/dev/null
ready=false
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8642/health >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  cp -a "$CONFIG_BACKUP" "$CONFIG"
  docker restart "$CONTAINER" >/dev/null
  fail "Hermes não reiniciou; configuração anterior restaurada"
fi

HERMES_KEY=$(sed -n 's/^API_SERVER_KEY=//p' "$HERMES_ENV")
[[ -n "$HERMES_KEY" ]] || fail "chave interna do Hermes ausente"
SMOKE=$(mktemp)
SMOKE_HTTP=$(curl -sS -o "$SMOKE" -w '%{http_code}' \
  -H "Authorization: Bearer $HERMES_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"hermes-agent","input":"Responda somente OK.","instructions":"Teste técnico. Não use ferramentas.","conversation":"validacao-chave-kimi","store":true}' \
  http://127.0.0.1:8642/v1/responses || true)
if [[ "$SMOKE_HTTP" != 200 ]] || grep -Eqi 'invalid authentication|API Key appears|HTTP 401' "$SMOKE"; then
  cp -a "$CONFIG_BACKUP" "$CONFIG"
  docker restart "$CONTAINER" >/dev/null
  unset HERMES_KEY
  rm -f "$SMOKE"
  fail "Hermes não confirmou a nova chave; configuração anterior restaurada"
fi
rm -f "$SMOKE"

set_env() {
  local key=$1 value=$2
  if grep -q "^${key}=" "$MOTOR_ENV"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$MOTOR_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >>"$MOTOR_ENV"
  fi
}
set_env AGENT_RUNTIME hermes
set_env AGENT_TIMEOUT_MS 180000
set_env AGENT_LOCAL_FALLBACK true
set_env HERMES_BASE_URL http://127.0.0.1:8642/v1
set_env HERMES_API_KEY "$HERMES_KEY"
set_env HERMES_MODEL hermes-agent
unset HERMES_KEY

systemctl restart radar-api
motor_ready=false
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8140/motor/health >/dev/null 2>&1; then motor_ready=true; break; fi
  sleep 1
done
if [[ "$motor_ready" != true ]]; then
  set_env AGENT_RUNTIME local
  systemctl restart radar-api
  fail "o motor não iniciou; runtime local restaurado"
fi

(cd /opt/radar/api && set -a && source .env && set +a && node --input-type=module -e '
  import { createAgentRuntime } from "./agent-runtime.js";
  const result = await createAgentRuntime().run({
    input: "Responda somente OK.",
    instructions: "Teste técnico final. Não use ferramentas.",
    conversationId: `validacao-${Date.now()}`,
  });
  if (result.runtime !== "hermes" || !/OK/i.test(result.value) || /401|invalid authentication/i.test(result.value)) process.exit(1);
') || {
  set_env AGENT_RUNTIME local
  systemctl restart radar-api
  fail "o teste final falhou; runtime local restaurado"
}

sed -i '/codex-temporary-2026-07-17$/d' /root/.ssh/authorized_keys 2>/dev/null || true
echo "OK: Kimi K3 autenticado, Hermes isolado e motor ativado."
