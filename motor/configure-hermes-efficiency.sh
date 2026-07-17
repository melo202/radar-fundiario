#!/usr/bin/env bash
# Aplica limites econômicos ao Hermes já instalado, com backup e smoke test.
set -euo pipefail

DATA_DIR=/opt/radar/hermes-data
CONFIG=$DATA_DIR/config.yaml
HERMES_ENV=$DATA_DIR/.env
CONTAINER=radar-hermes
BACKUP="$CONFIG.before-efficiency-$(date -u +%Y%m%dT%H%M%SZ)"

fail() { echo "ERRO: $*" >&2; exit 1; }
[[ ${EUID:-$(id -u)} -eq 0 ]] || fail "execute como root"
[[ -f "$CONFIG" && -f "$HERMES_ENV" ]] || fail "configuração do Hermes não encontrada"
docker inspect "$CONTAINER" >/dev/null 2>&1 || fail "container $CONTAINER não encontrado"

cp -a "$CONFIG" "$BACKUP"
if ! docker exec -i "$CONTAINER" python - <<'PY'
import os, tempfile, yaml
path = "/opt/data/config.yaml"
with open(path, "r", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh) or {}
cfg.setdefault("model", {})["context_length"] = 262144
cfg.setdefault("agent", {})["max_turns"] = 8
memory = cfg.setdefault("memory", {})
memory.update({"nudge_interval": 10, "flush_min_turns": 6})
skills = cfg.setdefault("skills", {})
skills.update({"creation_nudge_interval": 0, "write_approval": True})
directory = os.path.dirname(path)
fd, temporary = tempfile.mkstemp(prefix="config-", suffix=".yaml", dir=directory)
try:
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        yaml.safe_dump(cfg, fh, allow_unicode=True, sort_keys=False)
    os.replace(temporary, path)
finally:
    if os.path.exists(temporary): os.unlink(temporary)
PY
then
  cp -a "$BACKUP" "$CONFIG"
  fail "não foi possível atualizar a configuração; backup restaurado"
fi

docker restart "$CONTAINER" >/dev/null
ready=false
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8642/health >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  cp -a "$BACKUP" "$CONFIG"
  docker restart "$CONTAINER" >/dev/null
  fail "Hermes não voltou saudável; configuração anterior restaurada"
fi

API_KEY=$(sed -n 's/^API_SERVER_KEY=//p' "$HERMES_ENV")
[[ -n "$API_KEY" ]] || fail "API_SERVER_KEY ausente"
curl -fsS -H "Authorization: Bearer $API_KEY" http://127.0.0.1:8642/v1/models >/dev/null \
  || { cp -a "$BACKUP" "$CONFIG"; docker restart "$CONTAINER" >/dev/null; fail "smoke test falhou; configuração anterior restaurada"; }
unset API_KEY
echo "OK: Hermes limitado a 256K, 8 iterações e automelhoria de skills sem escrita autônoma."
