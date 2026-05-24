#!/usr/bin/env bash
# Passwordless update helper for Qadbak admin (apt status / panel git update).
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/configure-updates-sudo.sh" >&2
  exit 1
fi

HELPER="$(readlink -f "$QADBAK_DIR/scripts/update-status-helper.mjs")"
WRAPPER="$(readlink -f "$QADBAK_DIR/scripts/run-update-helper.sh")"
if [[ ! -f "$HELPER" || ! -f "$WRAPPER" ]]; then
  echo "Missing helper or wrapper — git pull first." >&2
  exit 1
fi

NODE_BIN="$(sudo -u "$QADBAK_USER" -H bash -lc 'command -v node' 2>/dev/null | head -1)"
[[ -z "$NODE_BIN" ]] && NODE_BIN="$(command -v node)"
NODE_BIN="$(readlink -f "$NODE_BIN")"

chmod 755 "$HELPER" "$WRAPPER"
if grep -q '^QADBAK_NODE_BIN=' "$WRAPPER"; then
  sed -i "s|^QADBAK_NODE_BIN=.*|QADBAK_NODE_BIN=$NODE_BIN|" "$WRAPPER"
else
  sed -i "2i QADBAK_NODE_BIN=$NODE_BIN" "$WRAPPER"
fi

mkdir -p "$QADBAK_DIR/data/update-jobs" "$QADBAK_DIR/data/pre-update-backups"
chown -R "$QADBAK_USER:$QADBAK_USER" "$QADBAK_DIR/data/update-jobs" "$QADBAK_DIR/data/pre-update-backups" 2>/dev/null || true

SUDOERS="/etc/sudoers.d/qadbak-updates-helper"
cat >"$SUDOERS" <<EOF
# Qadbak admin updates (apt + git pull via update-qadbak.sh)
$QADBAK_USER ALL=(root) NOPASSWD: $WRAPPER *
EOF
chmod 440 "$SUDOERS"
visudo -cf "$SUDOERS"

if ! sudo -u "$QADBAK_USER" sudo -n "$WRAPPER" ping 2>/dev/null | grep -q '"ok"'; then
  echo "FAILED: sudo rule not active." >&2
  exit 1
fi
echo "OK — wrapper: $WRAPPER"
