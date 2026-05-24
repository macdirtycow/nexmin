#!/usr/bin/env bash
# Allow Qadbak user to install panel.<domain> nginx vhosts via sudo.
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/configure-panel-vhost-sudo.sh" >&2
  exit 1
fi

SCRIPT="$(readlink -f "$QADBAK_DIR/scripts/apply-client-panel-vhost.sh")"
if [[ ! -f "$SCRIPT" ]]; then
  echo "Missing $SCRIPT — git pull in $QADBAK_DIR first." >&2
  exit 1
fi
chmod 755 "$SCRIPT"

SUDOERS="/etc/sudoers.d/qadbak-panel-vhost"
cat >"$SUDOERS" <<EOF
# Qadbak per-domain panel vhost (panel.example.com)
$QADBAK_USER ALL=(root) NOPASSWD: $SCRIPT *
EOF
chmod 440 "$SUDOERS"
visudo -cf "$SUDOERS"

echo "==> Verify"
if ! sudo -u "$QADBAK_USER" sudo -n "$SCRIPT" __probe__ 2>/dev/null | grep -q OK; then
  echo "FAILED: sudo rule not active." >&2
  exit 1
fi
echo "OK — test: sudo -u $QADBAK_USER sudo -n $SCRIPT __probe__"
