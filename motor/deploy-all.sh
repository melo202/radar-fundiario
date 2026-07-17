#!/usr/bin/env bash
# Um único comando para manter API, Painel e Mapa na mesma versão.
set -euo pipefail

main() {
  export RADAR_DEPLOY_BRANCH="${RADAR_DEPLOY_BRANCH:-agent/kimi-personal-assistant}"
  bash /opt/radar/repo/motor/deploy-api.sh
  bash /opt/radar/repo/motor/deploy-app.sh
  curl -fsS http://127.0.0.1:8140/motor/health >/dev/null
  echo "deploy completo ok: $(git -C /opt/radar/repo rev-parse --short HEAD)"
}

main "$@"
