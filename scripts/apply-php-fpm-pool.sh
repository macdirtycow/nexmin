#!/usr/bin/env bash
# Create or refresh a per-customer PHP-FPM pool (runs as root).
# Usage: sudo bash scripts/apply-php-fpm-pool.sh UNIX_USER [PHP_VERSION] [HOME]
set -euo pipefail

USER="${1:?unix-user}"
VER="${2:-}"
HOME_DIR="${3:-/home/${USER}}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

if [[ "$USER" == "__probe__" ]]; then
  echo "OK"
  exit 0
fi

ROOT="${QADBAK_DIR:-/opt/qadbak}"
# shellcheck source=lib/php-fpm-pool.sh
source "$ROOT/scripts/lib/php-fpm-pool.sh"

if [[ -z "$VER" ]]; then
  VER="$(php_fpm_detect_version "")"
fi

apply_php_fpm_pool "$USER" "$VER" "$HOME_DIR"
