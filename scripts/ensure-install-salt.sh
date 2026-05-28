#!/usr/bin/env bash
# Ensure per-install API salt + license fingerprint tag exist in .env.local.
# Idempotent — safe on every update, install resume, and VPS pull.
#
# Usage:
#   sudo bash scripts/ensure-install-salt.sh
#   bash scripts/ensure-install-salt.sh --check-only
set -euo pipefail

ROOT="${QADBAK_DIR:-/opt/qadbak}"
USER="${QADBAK_USER:-qadbak}"
ENV_FILE="$ROOT/.env.local"
CHECK_ONLY=0
QUIET=0

for arg in "$@"; do
  case "$arg" in
    --check-only|-n) CHECK_ONLY=1 ;;
    --quiet|-q) QUIET=1 ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
  esac
done

log() {
  [[ "$QUIET" -eq 1 ]] && return 0
  echo "$@"
}

gen_salt() {
  local s
  s="$(openssl rand -hex 8 2>/dev/null || true)"
  if [[ -z "${s// }" ]]; then
    s="$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  echo "$s"
}

read_env_value() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d " \"'" || true
}

set_env_key() {
  local key="$1" val="$2"
  local tmp="${ENV_FILE}.tmp.$$"
  if [[ -f "$ENV_FILE" ]]; then
    grep -v "^${key}=" "$ENV_FILE" >"$tmp" 2>/dev/null || : >"$tmp"
  else
    : >"$tmp"
  fi
  echo "${key}=${val}" >>"$tmp"
  mv "$tmp" "$ENV_FILE"
}

fingerprint_tag() {
  local salt="$1"
  if [[ -z "${salt// }" ]]; then
    echo ""
    return
  fi
  echo "qb-${salt:0:12}"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run install/qadbak-install.sh first." >&2
  exit 1
fi

SALT="$(read_env_value QADBAK_INSTALL_SALT)"
if [[ -z "${SALT// }" ]]; then
  SALT="$(read_env_value NEXT_PUBLIC_QADBAK_API_SALT)"
fi

if [[ -z "${SALT// }" ]]; then
  if [[ "$CHECK_ONLY" -eq 1 ]]; then
    echo "FAIL — QADBAK_INSTALL_SALT missing in $ENV_FILE" >&2
    exit 1
  fi
  SALT="$(gen_salt)"
  log "==> Install fingerprint (new salt)"
  set_env_key QADBAK_INSTALL_SALT "$SALT"
  set_env_key NEXT_PUBLIC_QADBAK_API_SALT "$SALT"
  CREATED=1
else
  CREATED=0
  PUB="$(read_env_value NEXT_PUBLIC_QADBAK_API_SALT)"
  if [[ -z "${PUB// }" || "$PUB" != "$SALT" ]]; then
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      echo "FAIL — NEXT_PUBLIC_QADBAK_API_SALT out of sync with QADBAK_INSTALL_SALT" >&2
      exit 1
    fi
    log "==> Install fingerprint (sync NEXT_PUBLIC_QADBAK_API_SALT)"
    set_env_key NEXT_PUBLIC_QADBAK_API_SALT "$SALT"
    CREATED=1
  fi
  if [[ -z "$(read_env_value QADBAK_INSTALL_SALT)" ]]; then
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      echo "FAIL — QADBAK_INSTALL_SALT empty" >&2
      exit 1
    fi
    log "==> Install fingerprint (restore QADBAK_INSTALL_SALT)"
    set_env_key QADBAK_INSTALL_SALT "$SALT"
    CREATED=1
  fi
fi

TAG="$(fingerprint_tag "$SALT")"
if [[ -z "$TAG" ]]; then
  echo "FAIL — could not derive fingerprint tag" >&2
  exit 1
fi

if [[ "$(id -u)" -eq 0 ]] && id "$USER" &>/dev/null; then
  chown "$USER:$USER" "$ENV_FILE" 2>/dev/null || true
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  log "OK — fingerprint $TAG"
  exit 0
fi

if [[ "$CREATED" -eq 1 ]]; then
  log "    QADBAK_INSTALL_SALT=…(${#SALT} chars)"
  log "    fingerprint tag: $TAG (sent on license heartbeat)"
  log "    Rebuild required: npm run build && pm2 restart"
else
  log "OK — install fingerprint $TAG"
fi

exit 0
