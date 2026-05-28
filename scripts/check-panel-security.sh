#!/usr/bin/env bash
# Quick security posture check for a Qadbak VPS (read-only, no changes).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${QADBAK_ENV_FILE:-$ROOT/.env.local}"
FAIL=0

warn() { echo "  [!] $*"; FAIL=1; }
ok() { echo "  [ok] $*"; }

echo "==> Qadbak security check"
echo "    Root: $ROOT"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE" 2>/dev/null || true
  if [[ -z "${SESSION_SECRET:-}" ]]; then
    warn "SESSION_SECRET is not set"
  elif [[ "${#SESSION_SECRET}" -lt 32 ]]; then
    warn "SESSION_SECRET shorter than 32 characters (recommended for production)"
  else
    ok "SESSION_SECRET length"
  fi
  if [[ "${SESSION_SECRET:-}" == "change-me-to-a-long-random-string-at-least-16" ]]; then
    warn "SESSION_SECRET is still the example placeholder"
  fi
  if [[ "${QADBAK_COOKIE_SECURE:-}" == "false" ]] && [[ "${NODE_ENV:-}" == "production" ]]; then
    warn "QADBAK_COOKIE_SECURE=false in production"
  fi
else
  warn "Missing $ENV_FILE"
fi

USERS="$ROOT/data/users.json"
if [[ -f "$USERS" ]]; then
  if grep -qE 'changeme|password123|admin123' "$USERS" 2>/dev/null; then
    warn "data/users.json may contain weak credentials — verify and rotate passwords"
  else
    ok "users.json has no obvious weak password strings"
  fi
  if [[ "$(stat -c '%a' "$USERS" 2>/dev/null || stat -f '%OLp' "$USERS")" != *600* ]] && \
     [[ "$(stat -c '%a' "$USERS" 2>/dev/null || echo)" != "600" ]]; then
    warn "chmod 600 recommended on data/users.json"
  fi
else
  warn "Missing $USERS"
fi

if ss -ltn 2>/dev/null | grep -q ':3000 '; then
  if ss -ltn | grep ':3000 ' | grep -q '0.0.0.0:3000'; then
    warn "Panel listens on 0.0.0.0:3000 — prefer nginx :443 only (127.0.0.1:3000)"
  else
    ok "Panel port 3000 not on all interfaces"
  fi
fi

if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q inactive; then
  warn "UFW inactive"
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "Fix issues then run: sudo bash scripts/harden-panel-security.sh"
  exit 1
fi
echo ""
echo "Basic checks passed. See docs/SECURITY.md for the full checklist."
