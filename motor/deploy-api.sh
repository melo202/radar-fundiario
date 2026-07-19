#!/usr/bin/env bash
# Deploy do motor no VPS: repo -> /opt/radar/api, deps, migrações, restart.
# Roda NO SERVIDOR: bash /opt/radar/repo/motor/deploy-api.sh
set -euo pipefail
# main(){...} força o bash a LER o arquivo inteiro antes de executar: o git reset
# adiante sobrescreve ESTE script, e sem isso a rodada executa metade da versão velha
# (aconteceu em 17/07 — o timer da revisita não instalou na 1ª rodada).
main() {
cd /opt/radar/repo
# A API e o app estático precisam acompanhar a mesma branch. A branch Kimi contém o
# Corretor Inteligente OS e o orquestrador; a base anterior continua recuperável no git.
DEPLOY_BRANCH="${RADAR_DEPLOY_BRANCH:-agent/kimi-personal-assistant}"
# Atualiza explicitamente a referência remota. Em clones com refspec restrito, o fetch
# simples atualiza apenas FETCH_HEAD e deixa origin/<branch> congelada (bug de 18/07).
git fetch -q origin "$DEPLOY_BRANCH:refs/remotes/origin/$DEPLOY_BRANCH"
git checkout -q "$DEPLOY_BRANCH" 2>/dev/null || git checkout -qb "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH"
git reset -q --hard "origin/$DEPLOY_BRANCH"
mkdir -p /opt/radar/api
install -d -m 0750 -o www-data -g www-data /opt/radar/data/documents
cp -r motor/. /opt/radar/api/
cp limite-goiania.json /opt/radar/api/ # fundo Cidade Viva do login do painel
cd /opt/radar/api
[ -f .env ] || { echo "FALTA /opt/radar/api/.env (DATABASE_URL, AI_*)"; exit 1; }
npm install --omit=dev --no-audit --no-fund --loglevel=error
node --check server.js && node --check ai-provider.js && node --check agent-runtime.js && node --check assistente.js && node --check agent-review.js && node --check intelligence-orchestrator.js && node --check intelligence-feedback.js && node --check document-intake.js && node --check document-service.js && node --check extract.js && node --check painel.js && node --check os-core.js && node --check agent-tools.js && node --check os-app.js && node --check oportunidades.js && node --check varredura.js
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
cp radar-agent-review.service /etc/systemd/system/radar-agent-review.service
cp radar-agent-review.timer /etc/systemd/system/radar-agent-review.timer
cp radar-intelligence.service /etc/systemd/system/radar-intelligence.service
cp radar-intelligence.timer /etc/systemd/system/radar-intelligence.timer
systemctl daemon-reload
systemctl enable --now radar-api >/dev/null 2>&1
systemctl enable --now radar-varredura.timer >/dev/null 2>&1
systemctl enable --now radar-pois.timer >/dev/null 2>&1
systemctl enable --now radar-indices.timer >/dev/null 2>&1
systemctl enable --now radar-revisita.timer >/dev/null 2>&1
systemctl enable --now radar-agent-review.timer >/dev/null 2>&1
systemctl enable --now radar-intelligence.timer >/dev/null 2>&1
systemctl restart radar-api
sleep 1
curl -sf http://127.0.0.1:8140/motor/health >/dev/null && echo "deploy motor ok: $(git -C /opt/radar/repo rev-parse --short HEAD)"
}
main "$@"
