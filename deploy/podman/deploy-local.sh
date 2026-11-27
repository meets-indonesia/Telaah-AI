#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "Cleaning local build cache ..."
rm -rf .next node_modules/.cache

echo "Building image without Podman cache ..."
podman build --no-cache -t telaah-ai:local .

if [ "${REBUILD_SCRAPER:-0}" = "1" ]; then
  echo "Rebuilding scraper image ..."
  podman build --no-cache -t telaah-scraper:local -f scraper/Dockerfile .
fi

echo "Restarting the local pod ..."
./deploy/podman/up.sh

echo "Waiting for the app ..."
for _ in $(seq 1 45); do
  if curl -fsS -m 2 -o /dev/null http://127.0.0.1:3000/api/health; then
    break
  fi
  sleep 2
done

if ! curl -fsS -m 10 -o /dev/null http://127.0.0.1:3000/; then
  echo "ERROR: app tidak merespons setelah deploy."
  exit 1
fi

echo "Clearing app caches (research logs are preserved) ..."
podman exec telaah-redis sh -lc '
  for pattern in "telaah:cache:*" "telaah:chart:*" "telaah:rl:*"; do
    redis-cli --scan --pattern "$pattern" | while read -r key; do
      [ -n "$key" ] && redis-cli DEL "$key" >/dev/null
    done
  done
' || true

echo "Removing host build cache ..."
rm -rf .next node_modules/.cache

echo "Local production deploy complete: http://127.0.0.1:3000"
