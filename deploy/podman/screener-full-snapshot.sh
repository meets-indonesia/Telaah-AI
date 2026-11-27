#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
SECRET="$(grep -E '^ALERT_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
if [ -z "${SECRET:-}" ]; then echo "ERROR: ALERT_SECRET kosong."; exit 1; fi

run_pass() {
  local pass="$1"
  local batch_size="${2:-40}"
  local cursor=0
  for _ in $(seq 1 60); do
    local response
    response="$(curl -fsS --max-time 300 -X POST "http://127.0.0.1:3000/api/screener/full-snapshot" \
      -H "x-alert-secret: ${SECRET}" -H 'content-type: application/json' \
      -d "{\"pass\":\"${pass}\",\"cursor\":${cursor},\"batchSize\":${batch_size}}")"
    echo "$response"
    local next done
    next="$(printf '%s' "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("nextCursor", 0))')"
    done="$(printf '%s' "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("done", False))')"
    if [ "$done" = "True" ]; then
      echo "Pass ${pass} complete."
      return 0
    fi
    cursor="$next"
  done
  echo "ERROR: pass ${pass} tidak selesai dalam batas batch."
  return 1
}

run_pass base 40
run_pass fundamentals 40
run_pass flow 20
