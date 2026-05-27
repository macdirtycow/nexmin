#!/usr/bin/env bash
# Enable server admin login for a domain (fixes Terminal "has no server admin login").
# Usage: sudo bash scripts/enable-domain-legacy-login.sh DOMAIN
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash scripts/enable-domain-legacy-login.sh DOMAIN" >&2
  exit 1
fi

if ! command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
  echo "legacy host CLI not found." >&2
  exit 1
fi

echo "==> Enable server admin login for $DOMAIN"
legacy-host enable-feature --domain "$DOMAIN" --legacy-panel

echo "==> Test login link"
legacy-host create-login-link --domain "$DOMAIN" | head -1
echo ""
echo "Done. In Qadbak: Domains → $DOMAIN → Terminal → Refresh session."
