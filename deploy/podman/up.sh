#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env tidak ditemukan. Salin dari .env.example dan isi OPENROUTER_API_KEY."
  exit 1
fi

if [ ! -f data/brokers_registry.json ]; then
  echo "ERROR: data/brokers_registry.json tidak ditemukan."
  exit 1
fi

if [ "${REBUILD:-0}" = "1" ] || ! podman image exists telaah-ai:local; then
  echo "Building image telaah-ai:local ..."
  podman build -t telaah-ai:local .
fi

if [ "${REBUILD:-0}" = "1" ] || [ "${REBUILD_SCRAPER:-0}" = "1" ] || ! podman image exists telaah-scraper:local; then
  echo "Building image telaah-scraper:local ..."
  podman build -t telaah-scraper:local -f scraper/Dockerfile .
fi

if podman pod exists telaah-pod; then
  echo "Removing existing pod telaah-pod ..."
  podman pod rm -f telaah-pod >/dev/null
fi

echo "Creating pod ..."
podman pod create --name telaah-pod --restart=unless-stopped -p 127.0.0.1:3000:3000 -p 127.0.0.1:8001:8001

echo "Starting Redis ..."
podman run -d \
  --pod telaah-pod \
  --name telaah-redis \
  --restart=unless-stopped \
  docker.io/library/redis:7-alpine \
  redis-server --save "" --appendonly no --maxmemory 128mb --maxmemory-policy allkeys-lru >/dev/null

echo "Waiting for Redis ..."
for _ in $(seq 1 20); do
  if podman exec telaah-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "Redis ready."
    break
  fi
  sleep 1
done

echo "Starting Qdrant ..."
podman run -d \
  --pod telaah-pod \
  --name telaah-qdrant \
  --restart=unless-stopped \
  -v "$ROOT/data/qdrant_storage:/qdrant/storage:Z" \
  docker.io/qdrant/qdrant:latest >/dev/null

echo "Waiting for Qdrant ..."
for _ in $(seq 1 30); do
  if curl -fsS -m 2 http://127.0.0.1:6333/healthz >/dev/null 2>&1; then
    echo "Qdrant ready."
    break
  fi
  sleep 1
done

echo "Starting IDX scraper ..."
podman run -d \
  --pod telaah-pod \
  --name telaah-scraper \
  --restart=unless-stopped \
  --env IDX_CACHE_TTL_SECONDS=900 \
  --env STOCKBIT_SESSION_FILE=/app/data/stockbit_session.json \
  -v "$ROOT/data:/app/data:Z" \
  telaah-scraper:local

echo "Waiting for scraper health ..."
for _ in $(seq 1 30); do
  if curl -fsS -m 2 http://127.0.0.1:8001/health >/dev/null 2>&1; then
    echo "Scraper ready."
    break
  fi
  sleep 1
done

echo "Starting app ..."
podman run -d \
  --pod telaah-pod \
  --name telaah-app \
  --restart=unless-stopped \
  --env-file .env \
  --env REDIS_URL=redis://127.0.0.1:6379 \
  --env QDRANT_URL=http://127.0.0.1:6333 \
  -v "$ROOT/data:/app/data:Z" \
  telaah-ai:local

TOKEN="$(grep -E '^TUNNEL_TOKEN=' .env | head -1 | cut -d= -f2- || true)"
if [ -n "${TOKEN:-}" ]; then
  echo "Starting Cloudflare Tunnel connector ..."
  podman run -d \
    --pod telaah-pod \
    --name telaah-tunnel \
    --restart=unless-stopped \
    --env "TUNNEL_TOKEN=$TOKEN" \
    docker.io/cloudflare/cloudflared:latest \
    tunnel --no-autoupdate run
else
  echo "TUNNEL_TOKEN belum diisi di .env; app berjalan lokal tanpa tunnel."
fi

echo
podman pod ps
podman ps --pod --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo
echo "Lokal:  http://127.0.0.1:3000"
echo "Subdomain: https://telaah.hiiamanop.my.id (jika tunnel aktif)"
