#!/usr/bin/env bash
# Test create-login-link without json/multiline (fixes "Unknown parameter --multiline").
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${VIRTUALMIN_URL:?}"
: "${VIRTUALMIN_USER:?}"
: "${VIRTUALMIN_PASS:?}"

# shellcheck source=lib/virtualmin-domains.sh
source "$ROOT/scripts/lib/virtualmin-domains.sh" 2>/dev/null || true
DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  DOMAIN="$(first_virtualmin_domain 2>/dev/null || true)"
fi
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: bash scripts/test-login-link.sh DOMAIN" >&2
  echo "  (or create at least one domain in VirtualMin first)" >&2
  exit 1
fi

echo "==> Plain create-login-link (no json, no multiline)"
curl -sk -u "${VIRTUALMIN_USER}:${VIRTUALMIN_PASS}" -X POST \
  --data-urlencode "program=create-login-link" \
  --data-urlencode "domain=${DOMAIN}" \
  --data-urlencode "redirect-url=/filemin/index.cgi" \
  "${VIRTUALMIN_URL}" | head -c 2000
echo ""
echo ""
echo "OK if you see a https:// URL above (no 'Unknown parameter')."
echo ""
echo "If redirect-url fails, Qadbak retries without it and appends the path in the panel (git pull + pm2 restart)."
