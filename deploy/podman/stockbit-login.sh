#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! podman container exists telaah-scraper; then
  echo "ERROR: container telaah-scraper belum ada. Jalankan ./deploy/podman/up.sh dulu."
  exit 1
fi

case "${1:-}" in
  --status|--clear)
    podman exec telaah-scraper python -m scraper.stockbit_login "$1"
    exit 0
    ;;
  --help|-h)
    cat <<'HELP'
Pemakaian:
  ./deploy/podman/stockbit-login.sh            tempel cookie credentialStorage
  ./deploy/podman/stockbit-login.sh FILE.txt   baca cookie dari file
  ./deploy/podman/stockbit-login.sh --status   cek status sesi
  ./deploy/podman/stockbit-login.sh --clear    hapus sesi

Cookie dibaca dari stdin dan tidak disimpan di host.
HELP
    exit 0
    ;;
esac

FILE="${1:-}"
COOKIE=""
if [ -n "$FILE" ]; then
  if [ ! -f "$FILE" ]; then
    echo "ERROR: file $FILE tidak ditemukan."
    exit 1
  fi
  COOKIE="$(<"$FILE")"
else
  printf 'Tempel nilai cookie credentialStorage, lalu Enter: ' >&2
  IFS= read -rs COOKIE
  printf '\n' >&2
fi

if [ -z "${COOKIE:-}" ]; then
  echo "ERROR: cookie kosong."
  exit 1
fi

printf '%s' "$COOKIE" | podman exec -i telaah-scraper python -m scraper.stockbit_login
COOKIE=""
unset COOKIE
