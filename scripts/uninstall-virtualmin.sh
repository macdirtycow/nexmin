#!/usr/bin/env bash
# Remove Webmin / VirtualMin packages after Qadbak independent mode is verified.
# Does NOT remove nginx, postfix, dovecot, mariadb, bind, or customer data.
#
# Usage:
#   sudo bash scripts/uninstall-virtualmin.sh
#   sudo bash scripts/uninstall-virtualmin.sh --dry-run
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

run() {
  if [[ "$DRY" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
  "$@"
  fi
}

echo "==> Qadbak independent preflight"
if [[ -f "$QADBAK_DIR/scripts/preflight-phase8-independent.sh" ]]; then
  bash "$QADBAK_DIR/scripts/preflight-phase8-independent.sh" || {
    echo "Preflight failed — fix panel before removing Webmin." >&2
    exit 1
  }
fi

echo "==> Stop Webmin"
run systemctl stop webmin 2>/dev/null || true
run systemctl disable webmin 2>/dev/null || true

echo "==> Remove packages (webmin, virtualmin*)"
if command -v apt-get >/dev/null 2>&1; then
  run apt-get remove -y webmin virtualmin-base virtualmin-lamp-stack virtualmin-lemp-stack 2>/dev/null || true
  run apt-get autoremove -y
elif command -v dnf >/dev/null 2>&1; then
  run dnf remove -y webmin virtualmin-release 2>/dev/null || true
else
  echo "Unknown package manager — remove webmin/virtualmin manually." >&2
  exit 1
fi

echo "==> Refresh panel nginx (no /embed/webmin/)"
if [[ -x "$QADBAK_DIR/scripts/fix-panel-nginx-port.sh" ]]; then
  run bash "$QADBAK_DIR/scripts/fix-panel-nginx-port.sh"
fi

echo ""
echo "OK — Webmin/VirtualMin packages removed (or dry-run logged)."
echo "  Customer sites: nginx/postfix/dovecot/mariadb unchanged."
echo "  Panel: QADBAK_PROVISIONER=native, QADBAK_DISABLE_WEBMIN=true"
