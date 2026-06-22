#!/usr/bin/env bash
# One-command local dev launcher: starts the FastAPI backend (with the
# model-resident worker) and the Vite frontend. Ctrl-C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/apps/backend"
FRONTEND="$ROOT/apps/frontend"

if [[ -f "$ROOT/.env" ]]; then
  set -a; source "$ROOT/.env"; set +a
fi
export INFERENCE_BACKEND="${INFERENCE_BACKEND:-mock}"

echo "▶ backend  : http://127.0.0.1:8000  (backend=$INFERENCE_BACKEND)"
echo "▶ frontend : http://127.0.0.1:5173"

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

( cd "$BACKEND" && PYTHONPATH=. python -m uvicorn app.main:app \
    --host "${API_BIND_HOST:-127.0.0.1}" --port "${API_BIND_PORT:-8000}" --reload ) &
pids+=($!)

( cd "$FRONTEND" && npm run dev ) &
pids+=($!)

wait
