#!/usr/bin/env bash
# Ensure .install-test.env exists for Playwright install E2E (updates without full reinstall).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.install-test.env"
LOCAL="$ROOT/.env.local"
QADBAK_USER="${QADBAK_USER:-qadbak}"

load_local() {
  if [[ -f "$LOCAL" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$LOCAL"
    set +a
  fi
}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
  if [[ -n "${E2E_ADMIN_PASS:-}" ]]; then
    exit 0
  fi
  echo "WARN: $ENV_FILE exists but E2E_ADMIN_PASS is empty — merging from .env.local" >&2
fi

load_local

ADMIN_USER="${E2E_ADMIN_USER:-${QADBAK_E2E_ADMIN_USER:-admin}}"
ADMIN_PASS="${E2E_ADMIN_PASS:-${QADBAK_E2E_ADMIN_PASS:-}}"
ADMIN_PASS="${ADMIN_PASS//$'\r'/}"

if [[ -z "$ADMIN_PASS" ]]; then
  echo "No E2E password — skip install E2E" >&2
  echo "  Set in $ENV_FILE: E2E_ADMIN_PASS=your-panel-password" >&2
  echo "  Or in $LOCAL: QADBAK_E2E_ADMIN_PASS=..." >&2
  exit 1
fi

umask 077
cat >"$ENV_FILE" <<EOF
E2E_ADMIN_USER=$ADMIN_USER
E2E_ADMIN_PASS=$ADMIN_PASS
EOF
if [[ "$(id -u)" -eq 0 ]]; then
  chown "$QADBAK_USER:$QADBAK_USER" "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
echo "Wrote $ENV_FILE (admin user: $ADMIN_USER)"
