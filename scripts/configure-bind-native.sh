#!/usr/bin/env bash
# Prepare BIND9 for Qadbak native DNS (auto zones on domain create).
set -euo pipefail

[[ "$(id -u)" -eq 0 ]] || {
  echo "Run as root: sudo bash $0" >&2
  exit 1
}

export DEBIAN_FRONTEND=noninteractive
# shellcheck source=lib/ubuntu-release.sh
source "$(dirname "$0")/lib/ubuntu-release.sh"
qadbak_detect_ubuntu_release || true
BIND_PKGS="$(qadbak_bind_apt_packages 2>/dev/null || echo "bind9 bind9-utils")"

apt-get install -y -qq $BIND_PKGS 2>/dev/null || apt-get install -y -qq bind9 bind9-utils

mkdir -p /var/lib/bind
chmod 755 /var/lib/bind

LOCAL="/etc/bind/named.conf.local"
if [[ ! -f "$LOCAL" ]]; then
  cat >"$LOCAL" <<'EOF'
// Qadbak customer zones — added by create-bind-zone.sh
EOF
fi

# Ubuntu default includes named.conf.local from named.conf
if [[ -f /etc/bind/named.conf ]] && ! grep -q 'named.conf.local' /etc/bind/named.conf 2>/dev/null; then
  echo 'include "/etc/bind/named.conf.local";' >>/etc/bind/named.conf
fi

systemctl enable bind9 2>/dev/null || systemctl enable named 2>/dev/null || true
systemctl start bind9 2>/dev/null || systemctl start named 2>/dev/null || true

if command -v named-checkconf &>/dev/null; then
  named-checkconf
fi

echo "OK — BIND9 ready for Qadbak DNS (/var/lib/bind, named.conf.local)"
