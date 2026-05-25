#!/usr/bin/env bash
# Idempotent fail2ban installer for Qadbak.
#
# Ensures fail2ban is installed, has a Qadbak-managed jail.d snippet, and
# is enabled + running. Safe to re-run on every deploy.
#
# Used by:
#   - install/qadbak-install.sh (via scripts/install-native-stack.sh) on
#     fresh installs.
#   - scripts/vps-after-pull.sh on existing installs that pre-date this
#     change, so the health check doesn't keep nagging admins to install
#     it manually.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/ensure-fail2ban.sh" >&2
  exit 1
fi

if ! command -v fail2ban-client &>/dev/null; then
  echo "==> Installing fail2ban"
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y -qq fail2ban
fi

JAIL=/etc/fail2ban/jail.d/qadbak.local
mkdir -p /etc/fail2ban/jail.d
if [[ ! -f "$JAIL" ]] || ! grep -q "Managed by Qadbak" "$JAIL"; then
  cat > "$JAIL" <<'JAIL_EOF'
# Managed by Qadbak — see scripts/ensure-fail2ban.sh
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
filter  = nginx-http-auth
port    = http,https
logpath = /var/log/nginx/error.log
JAIL_EOF
  echo "    Wrote $JAIL"
fi

systemctl enable fail2ban &>/dev/null || true
if systemctl is-active fail2ban &>/dev/null; then
  systemctl reload fail2ban &>/dev/null || systemctl restart fail2ban &>/dev/null || true
else
  systemctl start fail2ban &>/dev/null || \
    echo "    WARN: fail2ban start failed — check journalctl -u fail2ban -n 30" >&2
fi

if systemctl is-active fail2ban &>/dev/null; then
  echo "OK — fail2ban active (SSH + nginx-http-auth jails)"
else
  echo "WARN — fail2ban installed but not active" >&2
fi
