#!/usr/bin/env bash
set -euo pipefail

case "${1:-app}" in
  tunnel) podman logs -f telaah-tunnel ;;
  scraper) podman logs -f telaah-scraper ;;
  *) podman logs -f telaah-app ;;
esac
