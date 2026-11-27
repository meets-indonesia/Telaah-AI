#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env tidak ditemukan."
  exit 1
fi

SECRET="$(grep -E '^ALERT_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
if [ -z "${SECRET:-}" ]; then
  echo "ERROR: ALERT_SECRET belum diisi di .env."
  exit 1
fi

QUERY=""
case "${1:-}" in
  dry) QUERY="?dry=1" ;;
  force) QUERY="?dry=1&force=1" ;;
  all) QUERY="?all=1" ;;
  "") ;;
  *) echo "Pemakaian: $0 [dry|force|all]"; exit 1 ;;
esac

curl -fsS --max-time 240 \
  -X POST "http://127.0.0.1:3000/api/bsjp/scan${QUERY}" \
  -H "x-alert-secret: ${SECRET}"
echo
