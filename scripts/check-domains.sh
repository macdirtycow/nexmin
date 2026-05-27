#!/usr/bin/env bash
# List legacy hosting API domains (API + CLI) — run on VPS as root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Qadbak test-api"
sudo -u qadbak bash -c "cd '$ROOT' && npm run test-api" 2>&1 | head -80

echo ""
echo "==> legacy host CLI (if installed)"
if command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
  "${QADBAK_LEGACY_HOST_BIN}" list-domains --name-only 2>/dev/null || "${QADBAK_LEGACY_HOST_BIN}" list-domains 2>/dev/null | head -20
else
  echo "legacy-host command not in PATH"
fi

echo ""
echo "==> Hostname (must not be a bare IP for create-domain)"
hostname -f
