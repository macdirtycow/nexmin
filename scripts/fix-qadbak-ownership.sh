#!/usr/bin/env bash
# Fix /opt/qadbak ownership after accidental npm install as root.
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/fix-qadbak-ownership.sh" >&2
  exit 1
fi

if ! id "$QADBAK_USER" &>/dev/null; then
  echo "User $QADBAK_USER not found" >&2
  exit 1
fi

chown -R "$QADBAK_USER:$QADBAK_USER" "$QADBAK_DIR"
git config --global --add safe.directory "$QADBAK_DIR" 2>/dev/null || true
sudo -u "$QADBAK_USER" git config --global --add safe.directory "$QADBAK_DIR" 2>/dev/null || true
echo "OK — $QADBAK_DIR owned by $QADBAK_USER"
