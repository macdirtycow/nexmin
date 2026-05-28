#!/usr/bin/env bash
# Remove optional panel.<domain> nginx vhosts (keep the main panel on QADBAK_PUBLIC_HOST).
#
# Usage (on VPS as root):
#   sudo bash scripts/remove-client-panel-vhosts.sh              # all panel.* vhosts
#   sudo bash scripts/remove-client-panel-vhosts.sh example.com  # one domain
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/remove-client-panel-vhosts.sh [domain ...]" >&2
  exit 1
fi

remove_one() {
  local domain="${1,,}"
  local safe="${domain//./-}"
  local avail="/etc/nginx/sites-available/qadbak-panel-${safe}.conf"
  local enabled="/etc/nginx/sites-enabled/qadbak-panel-${safe}.conf"
  local removed=0
  if [[ -f "$enabled" || -L "$enabled" ]]; then
    rm -f "$enabled"
    removed=1
  fi
  if [[ -f "$avail" ]]; then
    rm -f "$avail"
    removed=1
  fi
  if [[ "$removed" -eq 1 ]]; then
    echo "    Removed panel.${domain} vhost"
  else
    echo "    (no panel.${domain} vhost found)"
  fi
}

echo "==> Remove client panel vhosts (panel.<domain>)"
echo "    Main panel (QADBAK_PUBLIC_HOST) is not touched."

if [[ "$#" -gt 0 ]]; then
  for d in "$@"; do
    remove_one "$d"
  done
else
  count=0
  for f in /etc/nginx/sites-enabled/qadbak-panel-*.conf; do
    [[ -e "$f" ]] || continue
    rm -f "$f"
    base="$(basename "$f")"
    rm -f "/etc/nginx/sites-available/$base" 2>/dev/null || true
    echo "    Removed $base"
    count=$((count + 1))
  done
  if [[ "$count" -eq 0 ]]; then
    echo "    No qadbak-panel-*.conf vhosts found."
  fi
fi

if [[ -f "$QADBAK_DIR/scripts/lib/sanitize-nginx-panel-vhosts.sh" ]]; then
  bash "$QADBAK_DIR/scripts/lib/sanitize-nginx-panel-vhosts.sh" 2>/dev/null || true
fi

nginx -t
systemctl reload nginx
echo ""
echo "OK — clients use your main panel URL only (e.g. https://qadbak.com/login)."
echo "Optional per-domain panel: Domains → [domain] → Client panel access → Apply vhost"
