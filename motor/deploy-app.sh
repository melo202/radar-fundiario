#!/usr/bin/env bash
# Publica o Mapa estático da mesma branch do motor. Mantém documentos internos fora do site.
set -euo pipefail

main() {
  cd /opt/radar/repo
  DEPLOY_BRANCH="${RADAR_DEPLOY_BRANCH:-agent/kimi-personal-assistant}"
  git fetch -q origin "$DEPLOY_BRANCH:refs/remotes/origin/$DEPLOY_BRANCH"
  git checkout -q "$DEPLOY_BRANCH" 2>/dev/null || git checkout -qb "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH"
  git reset -q --hard "origin/$DEPLOY_BRANCH"

  WEBROOT=/var/www/radar
  mkdir -p "$WEBROOT"
  cp index.html radar-goiania.html como-usar.html caixa-goiania.js sw.js manifest.json \
     icon-192.png icon-512.png apple-touch-icon.png README.md \
     bairros-goiania.json bairro-cdbairro.json limite-goiania.json "$WEBROOT/"
  for file in logradouros-goiania.json bairros-goiania.report.md prototipo-login-cidade-viva.html; do
    [ -f "$file" ] && cp "$file" "$WEBROOT/" || true
  done
  if [ -d marca ]; then
    mkdir -p "$WEBROOT/marca"
    cp marca/*.svg marca/*.png marca/*.jpg "$WEBROOT/marca/"
  fi
  chown -R www-data:www-data "$WEBROOT"
  cmp -s radar-goiania.html "$WEBROOT/radar-goiania.html"
  echo "deploy mapa ok: $(git rev-parse --short HEAD)"
}

main "$@"
