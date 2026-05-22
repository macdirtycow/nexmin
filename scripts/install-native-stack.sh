#!/usr/bin/env bash
# Qadbak-first hosting stack (no VirtualMin/Webmin GPL installer). Phase 6.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/install-native-stack.sh" >&2
  exit 1
fi

echo "==> Native stack packages (Ubuntu)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  nginx \
  apache2 \
  mariadb-server \
  postfix \
  dovecot-core dovecot-imapd dovecot-pop3d \
  bind9 bind9utils \
  php-fpm php-cli php-mysql php-curl php-xml php-mbstring php-zip \
  certbot python3-certbot-nginx \
  ufw \
  rsync

systemctl enable nginx apache2 mariadb postfix dovecot bind9 2>/dev/null || true

echo "==> Apache listens on backend port only (nginx front)"
if [[ -f /etc/apache2/ports.conf ]]; then
  if ! grep -q 'qadbak: nginx front' /etc/apache2/ports.conf 2>/dev/null; then
    sed -i 's/^\([[:space:]]*\)Listen 80/\1#Listen 80 # qadbak: nginx front/' /etc/apache2/ports.conf
  fi
  if ! grep -q '127.0.0.1:8080' /etc/apache2/ports.conf; then
    echo 'Listen 127.0.0.1:8080' >>/etc/apache2/ports.conf
  fi
fi

a2dismod mpm_event 2>/dev/null || true
a2enmod mpm_prefork proxy_fcgi setenvif rewrite ssl 2>/dev/null || true
apache2ctl configtest
systemctl restart apache2

echo "OK — native stack installed (nginx, Apache:8080, MariaDB, Postfix, Dovecot, BIND9)"
echo "    Domain provisioning: use existing VirtualMin API (import) or QADBAK_PROVISIONER=native (phase 8)."
