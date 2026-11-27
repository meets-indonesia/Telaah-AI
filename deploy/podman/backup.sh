#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
DEST="$ROOT/data/backups/$STAMP"
mkdir -p "$DEST"
chmod 700 "$ROOT/data/backups" "$DEST"

# Durable config/data only. Do not copy the Stockbit session or rebuildable caches.
for file in alert_watchlist.json brokers_registry.json industries.json subindustries.json subsectors.json; do
  if [ -f "$ROOT/data/$file" ]; then
    cp -a "$ROOT/data/$file" "$DEST/$file"
  fi
done

# Redis is mostly cache, but keep a snapshot when available.
if podman exec telaah-redis redis-cli SAVE >/dev/null 2>&1; then
  podman cp telaah-redis:/data/dump.rdb "$DEST/redis-dump.rdb" >/dev/null 2>&1 || true
fi

date -Iseconds > "$DEST/manifest.txt"
echo "Backup written to $DEST"

# Keep the last 14 backups.
ls -1dt "$ROOT/data/backups"/* 2>/dev/null | tail -n +15 | xargs -r rm -rf
