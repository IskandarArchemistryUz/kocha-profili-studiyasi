#!/usr/bin/env bash
# Kunlik zaxira nusxa: PostgreSQL → /srv/archemistry/backup (14 kun saqlanadi). cron: 03:30 da (setup.sh qoʻshadi).
set -euo pipefail
DIR=/srv/archemistry/backup
mkdir -p "$DIR"
sudo -u postgres pg_dump -Fc archemistry > "$DIR/archemistry-$(date +%F).dump"
find "$DIR" -name 'archemistry-*.dump' -mtime +14 -delete
