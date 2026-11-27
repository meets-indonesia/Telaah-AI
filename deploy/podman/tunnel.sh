#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! podman pod exists telaah-pod; then
  echo "Pod telaah-pod belum ada. Jalankan ./deploy/podman/up.sh dulu."
  exit 1
fi

TOKEN="$(grep -E '^TUNNEL_TOKEN=' .env 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [ -z "${TOKEN:-}" ]; then
  echo "TUNNEL_TOKEN kosong di .env."
  echo "Buka Cloudflare Zero Trust -> Networks -> Tunnels -> tunnel -> Install connector, copy token, lalu isi TUNNEL_TOKEN di .env."
  exit 1
fi

podman rm -f telaah-tunnel >/dev/null 2>&1 || true
podman run -d \
  --pod telaah-pod \
  --name telaah-tunnel \
  --restart=unless-stopped \
  --env "TUNNEL_TOKEN=$TOKEN" \
  docker.io/cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run

echo "Connector tunnel dimulai. Cek status di dashboard Cloudflare dan:"
echo "  ./deploy/podman/status.sh"
echo "  ./deploy/podman/logs.sh tunnel"
