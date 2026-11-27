#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
SECRET="$(grep -E '^ALERT_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '\"' || true)"
if [ -z "${SECRET:-}" ]; then echo "ERROR: ALERT_SECRET kosong."; exit 1; fi
curl -fsS --max-time 1800 -X POST "http://127.0.0.1:3000/api/screener/snapshot" \
  -H "x-alert-secret: ${SECRET}"
echo
