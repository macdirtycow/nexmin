#!/usr/bin/env bash
set -euo pipefail
ROOT="${QADBAK_DIR:-/opt/qadbak}"
PORT="${QADBAK_NODE_AGENT_PORT:-9100}"
if [[ -f "$ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^QADBAK_NODE_AGENT_PORT=' "$ROOT/.env.local" 2>/dev/null | sed 's/^/export /') || true
  PORT="${QADBAK_NODE_AGENT_PORT:-$PORT}"
fi
echo "==> Node agent http://127.0.0.1:${PORT}/health"
curl -sf "http://127.0.0.1:${PORT}/health"
echo ""
echo "OK"
