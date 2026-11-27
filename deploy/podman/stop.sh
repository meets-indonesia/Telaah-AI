#!/usr/bin/env bash
set -euo pipefail

if podman pod exists telaah-pod; then
  podman pod stop telaah-pod
  echo "Pod telaah-pod dihentikan."
else
  echo "Pod telaah-pod belum dibuat."
fi
