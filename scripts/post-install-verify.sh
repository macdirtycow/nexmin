#!/usr/bin/env bash
# Run on the VPS right after install/qadbak-install.sh (as root or qadbak).
set -euo pipefail
ROOT="${QADBAK_DIR:-/opt/qadbak}"
USER="${QADBAK_USER:-qadbak}"
PORT="${PORT:-3000}"

echo "============================================"
echo " Qadbak post-install verification"
echo "============================================"

if [[ "$(id -un)" == "$USER" ]]; then
  cd "$ROOT"
  bash scripts/v1-test-preflight.sh
else
  sudo -u "$USER" bash -c "cd '$ROOT' && bash scripts/v1-test-preflight.sh"
fi

echo ""
echo "==> Health endpoint"
HEALTH="$(curl -sf "http://127.0.0.1:${PORT}/api/health" 2>/dev/null || echo FAIL)"
echo "$HEALTH"
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "  OK   /api/health"
else
  echo "  FAIL /api/health"
  exit 1
fi

if [[ -f "$ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  echo ""
  echo "==> Panel URL"
  echo "  https://${QADBAK_PUBLIC_HOST:-localhost}/login"
fi

echo ""
echo "Next: docs/E2E-CHECKLIST.md (create a test domain in VirtualMin first)"
