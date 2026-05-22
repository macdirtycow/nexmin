#!/usr/bin/env bash
# Passwordless stack helper for Qadbak admin (nginx/apache/firewall validate & reload).
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/configure-stack-helper-sudo.sh" >&2
  exit 1
fi

HELPER="$(readlink -f "$QADBAK_DIR/scripts/stack-helper.mjs")"
WRAPPER="$(readlink -f "$QADBAK_DIR/scripts/run-stack-helper.sh")"
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

SUDOERS="/etc/sudoers.d/qadbak-stack-helper"
cat >"$SUDOERS" <<EOF
# Qadbak stack config helper (phase 5)
$QADBAK_USER ALL=(root) NOPASSWD: $WRAPPER *
EOF
chmod 440 "$SUDOERS"
visudo -cf "$SUDOERS"

if ! sudo -u "$QADBAK_USER" sudo -n "$WRAPPER" ping 2>/dev/null | grep -q '"ok"'; then
  echo "FAILED: sudo rule not active." >&2
  exit 1
fi
echo "OK — wrapper: $WRAPPER"
echo "     node:    $NODE_BIN"
