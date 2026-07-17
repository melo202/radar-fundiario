#!/usr/bin/env bash
# Instala o Hermes oficial em container isolado e só ativa o motor após smoke test.
set -euo pipefail

DATA_DIR=/opt/radar/hermes-data
MOTOR_ENV=/opt/radar/api/.env
CONTAINER=radar-hermes
IMAGE=nousresearch/hermes-agent:latest

fail() { echo "ERRO: $*" >&2; exit 1; }

[[ ${EUID:-$(id -u)} -eq 0 ]] || fail "execute como root"
[[ -f "$MOTOR_ENV" ]] || fail "não encontrei $MOTOR_ENV"
[[ -f /opt/radar/api/migrations/009-agent-runtime.sql ]] || fail "a migração 009 não foi instalada"
command -v docker >/dev/null || fail "Docker não está instalado"
command -v openssl >/dev/null || fail "OpenSSL não está instalado"

if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  fail "já existe um container chamado $CONTAINER; nada foi alterado"
fi
if [[ -e "$DATA_DIR/config.yaml" || -e "$DATA_DIR/.env" ]]; then
  fail "$DATA_DIR já contém uma configuração; nada foi sobrescrito"
fi

echo "Cole a NOVA chave da Kimi e pressione Enter. Ela ficará invisível na tela:"
IFS= read -r -s KIMI_KEY
echo
[[ "$KIMI_KEY" =~ ^[A-Za-z0-9_-]{20,}$ ]] || fail "a chave não parece válida"

KIMI_TEST=$(mktemp)
KIMI_HTTP=$(curl -sS -o "$KIMI_TEST" -w '%{http_code}' \
  -H "Authorization: Bearer $KIMI_KEY" \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: Hermes-Agent/0.18.2' \
  -d '{"model":"k3","messages":[{"role":"user","content":"Responda somente OK"}],"max_tokens":16}' \
  https://api.kimi.com/coding/v1/chat/completions || true)
if [[ "$KIMI_HTTP" != 200 ]]; then
  echo "A Kimi rejeitou a chave (HTTP $KIMI_HTTP)." >&2
  sed -E 's/sk-[A-Za-z0-9_-]+/[CHAVE-OCULTA]/g' "$KIMI_TEST" | head -c 800 >&2 || true
  echo >&2
  rm -f "$KIMI_TEST"
  unset KIMI_KEY
  fail "nada foi ativado; crie uma chave no Kimi Code Console"
fi
rm -f "$KIMI_TEST"

HERMES_KEY=$(openssl rand -hex 32)
install -d -m 700 -o 10000 -g 10000 "$DATA_DIR"

umask 077
cat >"$DATA_DIR/config.yaml" <<EOF
model:
  default: k3
  provider: custom
  base_url: https://api.kimi.com/coding/v1
  api_key: "$KIMI_KEY"
  context_length: 1000000

agent:
  max_turns: 12

tool_loop_guardrails:
  hard_stop_enabled: true
  hard_stop_after:
    exact_failure: 5
    idempotent_no_progress: 5

memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200
  user_char_limit: 1375

session_reset:
  mode: both
  idle_minutes: 1440
  at_hour: 4

# Primeira etapa: memória e consulta de sessões, sem terminal, arquivos ou banco.
platform_toolsets:
  api_server: [memory, session_search]
  cli: [memory, session_search]
EOF

cat >"$DATA_DIR/.env" <<EOF
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY=$HERMES_KEY
EOF

cat >"$DATA_DIR/SOUL.md" <<'EOF'
# Assistente privado do Corretor Inteligente

Seja objetivo, rastreável e executável. Não invente dados, fontes, preços ou estimativas.
Diferencie fatos, inferências e informações ausentes. Use apenas as ferramentas liberadas.
EOF

chown -R 10000:10000 "$DATA_DIR"
chmod 600 "$DATA_DIR/.env" "$DATA_DIR/config.yaml" "$DATA_DIR/SOUL.md"
unset KIMI_KEY

echo "Baixando a imagem oficial do Hermes..."
docker pull "$IMAGE"
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --memory 3g \
  --cpus 2 \
  --pids-limit 256 \
  --security-opt no-new-privileges:true \
  -v "$DATA_DIR:/opt/data" \
  -p 127.0.0.1:8642:8642 \
  "$IMAGE" gateway run >/dev/null

ready=false
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8642/health >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
[[ "$ready" == true ]] || { docker logs --tail 80 "$CONTAINER"; fail "Hermes não iniciou"; }

curl -fsS \
  -H "Authorization: Bearer $HERMES_KEY" \
  http://127.0.0.1:8642/v1/models >/dev/null || fail "a API local do Hermes não autenticou"

SMOKE_FILE=$(mktemp)
SMOKE_CODE=$(curl -sS -o "$SMOKE_FILE" -w '%{http_code}' \
  -H "Authorization: Bearer $HERMES_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"hermes-agent","input":"Responda apenas: OK","instructions":"Não use ferramentas nesta verificação.","conversation":"instalacao-kimi-k3","store":true}' \
  http://127.0.0.1:8642/v1/responses || true)
if [[ "$SMOKE_CODE" != 200 ]]; then
  echo "O teste Kimi/Hermes retornou HTTP $SMOKE_CODE" >&2
  head -c 1200 "$SMOKE_FILE" >&2 || true
  echo >&2
  rm -f "$SMOKE_FILE"
  fail "o motor permaneceu no runtime anterior"
fi
rm -f "$SMOKE_FILE"

BACKUP="$MOTOR_ENV.before-hermes-$(date +%Y%m%d%H%M%S)"
cp -a "$MOTOR_ENV" "$BACKUP"

upsert_env() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  awk -v k="$key" -v v="$value" '
    BEGIN { done=0 }
    $0 ~ ("^" k "=") { if (!done) print k "=" v; done=1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$MOTOR_ENV" >"$tmp"
  chown --reference="$MOTOR_ENV" "$tmp"
  chmod --reference="$MOTOR_ENV" "$tmp"
  mv "$tmp" "$MOTOR_ENV"
}

upsert_env AGENT_RUNTIME hermes
upsert_env AGENT_TIMEOUT_MS 180000
upsert_env AGENT_LOCAL_FALLBACK true
upsert_env HERMES_BASE_URL http://127.0.0.1:8642/v1
upsert_env HERMES_API_KEY "$HERMES_KEY"
upsert_env HERMES_MODEL hermes-agent

set -a
# shellcheck disable=SC1090
source "$MOTOR_ENV"
set +a
(cd /opt/radar/api && node migrate.js)
systemctl restart radar-api
motor_ready=false
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8140/motor/health >/dev/null 2>&1; then motor_ready=true; break; fi
  sleep 1
done
if [[ "$motor_ready" != true ]]; then
  cp -a "$BACKUP" "$MOTOR_ENV"
  systemctl restart radar-api
  fail "o motor não iniciou com Hermes; configuração anterior restaurada"
fi

# A chave SSH temporária não é mais necessária.
if [[ -f /root/.ssh/authorized_keys ]]; then
  sed -i '/codex-temporary-2026-07-17$/d' /root/.ssh/authorized_keys
fi

echo "OK: Kimi K3 + Hermes ativos; API do Hermes acessível somente pela própria VPS."
