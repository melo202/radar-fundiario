#!/usr/bin/env bash
# Deploy do motor no VPS: repo -> /opt/radar/api, deps, migrações, restart.
# Roda NO SERVIDOR: bash /opt/radar/repo/motor/deploy-api.sh
set -euo pipefail
cd /opt/radar/repo
git fetch -q origin agent/radar-ultrapremium
git reset -q --hard origin/agent/radar-ultrapremium
mkdir -p /opt/radar/api
cp -r motor/. /opt/radar/api/
cd /opt/radar/api
[ -f .env ] || { echo "FALTA /opt/radar/api/.env (DATABASE_URL, AI_*)"; exit 1; }
npm install --omit=dev --no-audit --no-fund --loglevel=error
node --check server.js && node --check ai-provider.js && node --check extract.js
set -a; source .env; set +a
node migrate.js
cp radar-api.service /etc/systemd/system/radar-api.service
systemctl daemon-reload
systemctl enable --now radar-api >/dev/null 2>&1
systemctl restart radar-api
sleep 1
curl -sf http://127.0.0.1:8140/motor/health >/dev/null && echo "deploy motor ok: $(git -C /opt/radar/repo rev-parse --short HEAD)"
