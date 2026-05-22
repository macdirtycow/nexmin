#!/usr/bin/env bash
# Test VirtualMin Remote API connectivity (Phase 0).
# Usage: cp .env.example .env.local && edit credentials, then: npm run test-api

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
elif [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

: "${VIRTUALMIN_URL:?Set VIRTUALMIN_URL in .env.local}"
: "${VIRTUALMIN_USER:?Set VIRTUALMIN_USER}"
: "${VIRTUALMIN_PASS:?Set VIRTUALMIN_PASS}"

TEST_DOMAIN="${TEST_DOMAIN:-siccamanagement.nl}"

call_api() {
  local program="$1"
  shift
  echo "=== $program ==="
  local -a extra=()
  if [[ "$program" == list-* ]]; then
    extra=(--data-urlencode "json=1" --data-urlencode "multiline=")
  elif [[ "$program" == "create-login-link" ]]; then
    extra=()
  else
    extra=(--data-urlencode "json=1" --data-urlencode "simple-multiline=")
  fi
  curl -sk \
    -u "${VIRTUALMIN_USER}:${VIRTUALMIN_PASS}" \
    -X POST \
    --data-urlencode "program=${program}" \
    "${extra[@]}" \
    "$@" \
    "${VIRTUALMIN_URL}" \
    | head -c 4000
  echo ""
  echo ""
}

call_api "list-domains"
call_api "create-login-link" --data-urlencode "domain=${TEST_DOMAIN}"
call_api "list-users" --data-urlencode "domain=${TEST_DOMAIN}"
call_api "list-databases" --data-urlencode "domain=${TEST_DOMAIN}"

echo "OK — list-domains should show domain data; create-login-link should not mention simple-multiline."
