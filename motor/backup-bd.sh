#!/usr/bin/env bash
# Backup diário do banco radar (pg_dump -Fc) com retenção de 14 dias.
# Roda no VPS via radar-backup.timer (06:20) como usuário postgres (peer auth).
# Nível 1 de proteção (disco local): cobre corrupção, DELETE acidental e migração ruim.
# Nível 2 (cópia FORA do VPS) fica para quando houver destino externo configurado.
set -euo pipefail
DEST=/opt/radar/backups
mkdir -p "$DEST" 2>/dev/null || true
ARQ="$DEST/radar-$(date +%F).dump"
pg_dump -Fc -d radar -f "$ARQ"
pg_restore -l "$ARQ" >/dev/null   # integridade: um dump que não abre não é backup
find "$DEST" -name 'radar-*.dump' -mtime +14 -delete
echo "backup ok: $ARQ ($(du -h "$ARQ" | cut -f1))"

# Restaurar (emergência), num banco novo e só depois troque os papéis:
#   sudo -u postgres createdb radar_restaurado
#   sudo -u postgres pg_restore -d radar_restaurado "$ARQ"
