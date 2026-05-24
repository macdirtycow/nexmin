#!/usr/bin/env bash
# Remove per-customer PHP-FPM pool(s).
# Usage: sudo bash scripts/remove-php-fpm-pool.sh UNIX_USER
set -euo pipefail

USER="${1:?unix-user}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

ROOT="${QADBAK_DIR:-/opt/qadbak}"
# shellcheck source=lib/php-fpm-pool.sh
source "$ROOT/scripts/lib/php-fpm-pool.sh"

remove_php_fpm_pool "$USER"
