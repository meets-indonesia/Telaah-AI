#!/usr/bin/env bash
set -euo pipefail

if podman pod exists telaah-pod; then
  podman pod start telaah-pod
  echo "Pod telaah-pod dimulai."
  podman ps --pod --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
else
  echo "Pod belum ada; menjalankan up.sh ..."
  exec "$(dirname "${BASH_SOURCE[0]}")/up.sh"
fi
