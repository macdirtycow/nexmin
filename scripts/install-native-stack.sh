#!/usr/bin/env bash
# Qadbak-first hosting stack packages. Safe on fresh Ubuntu; idempotent on upgraded servers.
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
# shellcheck source=lib/ubuntu-release.sh
source "$(dirname "$0")/lib/ubuntu-release.sh"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/install-native-stack.sh" >&2
  exit 1
fi

qadbak_detect_ubuntu_release || {
  echo "Qadbak native stack requires Ubuntu 22.04 or 24.04 LTS." >&2
  exit 1
}

BIND_PKGS="$(qadbak_bind_apt_packages)"
PHP_EXTRA="$(qadbak_php_extra_apt_packages)"

echo "==> Native stack packages ($(qadbak_ubuntu_release_label))"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# shellcheck disable=SC2086
apt-get install -y -qq \
  nginx \
  apache2 \
  mariadb-server \
  mariadb-client \
  postfix \
  dovecot-core dovecot-imapd dovecot-pop3d dovecot-sieve \
  $BIND_PKGS \
  php-fpm php-cli php-mysql php-curl php-xml php-mbstring php-zip \
  $PHP_EXTRA \
  certbot python3-certbot-nginx \
  ufw \
  rsync \
  unzip zip \
  proftpd-basic \
  jq

# Keep Qadbak tooling off apt autoremove lists (backups, S3 admin, FTP tab, archives).
for pkg in mariadb-client unzip zip proftpd-basic proftpd-core; do
  apt-mark manual "$pkg" 2>/dev/null || true
done

echo "==> AWS CLI (optional — S3 admin)"
qadbak_install_aws_cli

systemctl unmask proftpd 2>/dev/null || true
systemctl enable proftpd 2>/dev/null || true

systemctl enable nginx apache2 mariadb postfix dovecot bind9 2>/dev/null || true

if [[ -f "$QADBAK_DIR/scripts/configure-bind-native.sh" ]]; then
  echo "==> BIND9 (native DNS zones)"
  bash "$QADBAK_DIR/scripts/configure-bind-native.sh"
fi

if [[ -f "$QADBAK_DIR/scripts/configure-native-mail.sh" ]]; then
  echo "==> Postfix + Dovecot (native mail)"
  bash "$QADBAK_DIR/scripts/configure-native-mail.sh" || echo "WARN: configure-native-mail.sh failed" >&2
fi

echo "==> Apache backend (nginx front on :80/:443)"
if [[ -f "$QADBAK_DIR/scripts/ensure-apache-backend.sh" ]]; then
  bash "$QADBAK_DIR/scripts/ensure-apache-backend.sh"
else
  echo "WARN: ensure-apache-backend.sh missing — git pull" >&2
fi

echo "OK — native stack packages installed"
echo "    Apache: 127.0.0.1:8080 behind nginx (php-fpm)"
