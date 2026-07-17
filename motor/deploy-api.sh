#!/usr/bin/env bash
# Deploy do motor no VPS: repo -> /opt/radar/api, deps, migrações, restart.
# Roda NO SERVIDOR: bash /opt/radar/repo/motor/deploy-api.sh
set -euo pipefail
# main(){...} força o bash a LER o arquivo inteiro antes de executar: o git reset
# adiante sobrescreve ESTE script, e sem isso a rodada executa metade da versão velha
# (aconteceu em 17/07 — o timer da revisita não instalou na 1ª rodada).
main() {
cd /opt/radar/repo
# OS-02 (16/07/2026): a hospedagem acompanha a branch do Corretor Inteligente OS —
# a ultrapremium fica congelada como base recuperável (só bugfix).
git fetch -q origin agent/corretor-inteligente-os
git checkout -q agent/corretor-inteligente-os 2>/dev/null || git checkout -qb agent/corretor-inteligente-os origin/agent/corretor-inteligente-os
git reset -q --hard origin/agent/corretor-inteligente-os
mkdir -p /opt/radar/api
cp -r motor/. /opt/radar/api/
cp limite-goiania.json /opt/radar/api/ # fundo Cidade Viva do login do painel
cd /opt/radar/api
[ -f .env ] || { echo "FALTA /opt/radar/api/.env (DATABASE_URL, AI_*)"; exit 1; }
npm install --omit=dev --no-audit --no-fund --loglevel=error
node --check server.js && node --check ai-provider.js && node --check extract.js
set -a; source .env; set +a
node migrate.js
cp radar-api.service /etc/systemd/system/radar-api.service
cp radar-varredura.service /etc/systemd/system/radar-varredura.service
cp radar-varredura.timer /etc/systemd/system/radar-varredura.timer
cp radar-pois.service /etc/systemd/system/radar-pois.service
cp radar-pois.timer /etc/systemd/system/radar-pois.timer
cp radar-indices.service /etc/systemd/system/radar-indices.service
cp radar-indices.timer /etc/systemd/system/radar-indices.timer
cp radar-revisita.service /etc/systemd/system/radar-revisita.service
cp radar-revisita.timer /etc/systemd/system/radar-revisita.timer
systemctl daemon-reload
systemctl enable --now radar-api >/dev/null 2>&1
systemctl enable --now radar-varredura.timer >/dev/null 2>&1
systemctl enable --now radar-pois.timer >/dev/null 2>&1
systemctl enable --now radar-indices.timer >/dev/null 2>&1
systemctl enable --now radar-revisita.timer >/dev/null 2>&1
systemctl restart radar-api
sleep 1
curl -sf http://127.0.0.1:8140/motor/health >/dev/null && echo "deploy motor ok: $(git -C /opt/radar/repo rev-parse --short HEAD)"
}
main "$@"
