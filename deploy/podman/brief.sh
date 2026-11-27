#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env tidak ditemukan."
  exit 1
fi

SECRET="$(grep -E '^BRIEF_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
if [ -z "${SECRET:-}" ]; then
  echo "ERROR: BRIEF_SECRET belum diisi di .env."
  exit 1
fi

QUERY=""
case "${1:-}" in
  refresh) QUERY="?refresh=1" ;;
  dry) QUERY="?dry=1" ;;
  "") ;;
  *) echo "Pemakaian: $0 [refresh|dry]"; exit 1 ;;
esac

curl -fsS --max-time 600 \
  -X POST "http://127.0.0.1:3000/api/brief/harmonic${QUERY}" \
  -H "x-brief-secret: ${SECRET}"
echo
