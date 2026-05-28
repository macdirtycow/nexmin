#!/usr/bin/env bash
# Test legacy hosting API create-domain + list-domains (run on VPS as root).
set -euo pipefail
DOMAIN="${1:-}"
PASS="${2:-}"
if [[ -z "$DOMAIN" || -z "$PASS" ]]; then
  echo "Usage: sudo bash scripts/test-create-domain.sh DOMAIN PASSWORD" >&2
  exit 1
fi

if [[ "$DOMAIN" =~ [^a-zA-Z0-9._-] ]]; then
  echo "Invalid domain name (allowed: letters, digits, dot, hyphen, underscore)." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER="$(echo "$DOMAIN" | cut -d. -f1 | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')"

echo "==> create-domain $DOMAIN"
if command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
  ${QADBAK_LEGACY_HOST_BIN:-legacy-host-cli} create-domain --domain "$DOMAIN" --pass "$PASS" --user "$USER" \
    --unix --dir --web --dns --mail --mysql 2>&1 || true
  echo ""
  echo "==> list-domains"
  "${QADBAK_LEGACY_HOST_BIN}" list-domains --multiline 2>&1 | head -40
else
  echo "legacy host CLI not found; using remote.cgi via Qadbak env"
  sudo -u qadbak env \
    QADBAK_ROOT="$ROOT" \
    QADBAK_TEST_DOMAIN="$DOMAIN" \
    QADBAK_TEST_PASS="$PASS" \
    QADBAK_TEST_USER="$USER" \
    bash -s <<'EOS'
set -euo pipefail
cd "$QADBAK_ROOT"
set -a
# shellcheck source=/dev/null
source .env.local
set +a
curl -sk -u "${QADBAK_LEGACY_API_USER}:${QADBAK_LEGACY_API_PASS}" \
  -d "program=create-domain&json=1&domain=${QADBAK_TEST_DOMAIN}&pass=${QADBAK_TEST_PASS}&user=${QADBAK_TEST_USER}&unix=1&dir=1&web=1&dns=1&mail=1&mysql=1" \
  "${QADBAK_LEGACY_API_URL}" | head -c 2000
echo ""
curl -sk -u "${QADBAK_LEGACY_API_USER}:${QADBAK_LEGACY_API_PASS}" \
  -d "program=list-domains&json=1&multiline" \
  "${QADBAK_LEGACY_API_URL}" | head -c 3000
EOS
fi

ls -la /etc/legacy-host/virtual-server/domains/ 2>/dev/null | tail -5 || true
