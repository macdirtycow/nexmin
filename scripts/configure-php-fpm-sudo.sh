#!/usr/bin/env bash
# Allow Qadbak user to manage PHP-FPM pools (via provisioning helper / panel repair).
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/configure-php-fpm-sudo.sh" >&2
  exit 1
fi

APPLY="$(readlink -f "$QADBAK_DIR/scripts/apply-php-fpm-pool.sh")"
REMOVE="$(readlink -f "$QADBAK_DIR/scripts/remove-php-fpm-pool.sh")"
ALL="$(readlink -f "$QADBAK_DIR/scripts/apply-all-php-fpm-pools.sh")"

for s in "$APPLY" "$REMOVE" "$ALL"; do
  [[ -f "$s" ]] || { echo "Missing $s" >&2; exit 1; }
  chmod 755 "$s"
done

SUDOERS="/etc/sudoers.d/qadbak-php-fpm"
cat >"$SUDOERS" <<EOF
# Qadbak per-tenant PHP-FPM pools
$QADBAK_USER ALL=(root) NOPASSWD: $APPLY *
$QADBAK_USER ALL=(root) NOPASSWD: $REMOVE *
$QADBAK_USER ALL=(root) NOPASSWD: $ALL
EOF
chmod 440 "$SUDOERS"
visudo -cf "$SUDOERS"

if ! sudo -u "$QADBAK_USER" sudo -n "$APPLY" __probe__ 2>/dev/null | grep -q OK; then
  echo "FAILED: sudo rule not active." >&2
  exit 1
fi
echo "OK — PHP-FPM pool scripts"
