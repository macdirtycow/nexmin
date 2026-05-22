#!/usr/bin/env bash
# Qadbak install WITHOUT VirtualMin GPL installer (phase 6 — fresh VPS).
# Existing servers with VirtualMin: keep using install/qadbak-install.sh
set -euo pipefail

QADBAK_REPO="${QADBAK_REPO:-https://github.com/macdirtycow/qadbak.git}"
QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"
NODE_MAJOR="${NODE_MAJOR:-20}"
export QADBAK_NATIVE_INSTALL=1

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash install/qadbak-install-native.sh" >&2
  exit 1
fi

echo ""
echo "  Qadbak NATIVE install — nginx, Apache, MariaDB, Postfix, Dovecot, BIND"
echo "  No VirtualMin/Webmin GPL installer on this machine."
echo "  Guide: docs/QADBAK-NATIVE-INSTALL.md"
echo ""
read -rp "Continue? [y/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  exit 0
fi

FQDN="$(hostname -f 2>/dev/null || hostname)"
read -rp "Panel hostname [$FQDN]: " PANEL_HOST
PANEL_HOST="${PANEL_HOST:-$FQDN}"
read -rp "Panel port 11000? [Y/n]: " USE_ALT_PORT
PANEL_ALT_PORT=""
if [[ ! "${USE_ALT_PORT:-Y}" =~ ^[Nn]$ ]]; then
  read -rp "Port [11000]: " PANEL_ALT_PORT
  PANEL_ALT_PORT="${PANEL_ALT_PORT:-11000}"
fi
SERVER_FQDN="$FQDN"
read -rp "Qadbak admin user [admin]: " QB_USER
QB_USER="${QB_USER:-admin}"
read -rsp "Qadbak admin password: " QB_PASS
echo
read -rp "Certbot email (optional): " LE_EMAIL
read -rp "Remote VirtualMin API URL (blank = configure later): " REMOTE_VM_URL
REMOTE_VM_URL="${REMOTE_VM_URL:-}"
read -rsp "Remote VirtualMin root password (if URL set): " REMOTE_VM_PASS
echo

apt-get update -qq
bash "$(dirname "$0")/../scripts/install-native-stack.sh"

if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
command -v pm2 &>/dev/null || npm install -g pm2

if ! id "$QADBAK_USER" &>/dev/null; then
  useradd -r -m -d "$QADBAK_DIR" -s /bin/bash "$QADBAK_USER"
fi
[[ -d "$QADBAK_DIR/.git" ]] || git clone "$QADBAK_REPO" "$QADBAK_DIR"
git -C "$QADBAK_DIR" pull --ff-only || true
chown -R "$QADBAK_USER:$QADBAK_USER" "$QADBAK_DIR"

SECRET="$(openssl rand -base64 32)"
sudo -u "$QADBAK_USER" bash -c "cd '$QADBAK_DIR' && npm install && npm run build"

ENV_FILE="$QADBAK_DIR/.env.local"
if [[ -n "$REMOTE_VM_URL" ]]; then
  cat >"$ENV_FILE" <<EOF
SESSION_SECRET=$SECRET
QADBAK_INSTALL_MODE=native
QADBAK_NATIVE_INSTALL=1
VIRTUALMIN_MOCK=false
VIRTUALMIN_URL=$REMOTE_VM_URL
VIRTUALMIN_USER=root
VIRTUALMIN_PASS=$REMOTE_VM_PASS
QADBAK_PROVISIONER=virtualmin
QADBAK_PUBLIC_HOST=$PANEL_HOST
PORT=3000
VIRTUALMIN_TLS_INSECURE=true
QADBAK_COOKIE_SECURE=false
EOF
else
  cat >"$ENV_FILE" <<EOF
SESSION_SECRET=$SECRET
QADBAK_INSTALL_MODE=native
QADBAK_NATIVE_INSTALL=1
VIRTUALMIN_MOCK=true
QADBAK_PROVISIONER=virtualmin
QADBAK_PUBLIC_HOST=$PANEL_HOST
PORT=3000
QADBAK_COOKIE_SECURE=false
EOF
  echo "WARN: No remote VirtualMin URL — panel runs in mock mode until .env.local is configured." >&2
fi
chmod 600 "$ENV_FILE"
chown "$QADBAK_USER:$QADBAK_USER" "$ENV_FILE"

for s in configure-domain-fs-sudo configure-domain-repair-sudo configure-domain-terminal-sudo \
  configure-host-services-sudo configure-stack-helper-sudo; do
  bash "$QADBAK_DIR/scripts/${s}.sh"
done

HASH="$(sudo -u "$QADBAK_USER" node "$QADBAK_DIR/scripts/hash-password.mjs" "$QB_PASS")"
mkdir -p "$QADBAK_DIR/data"
cat >"$QADBAK_DIR/data/users.json" <<EOF
[{"id":"admin-1","username":"$QB_USER","passwordHash":"$HASH","role":"admin","domains":[]}]
EOF
chown "$QADBAK_USER:$QADBAK_USER" "$QADBAK_DIR/data/users.json"

export PANEL_HOST SERVER_FQDN QADBAK_NATIVE_INSTALL=1
bash "$QADBAK_DIR/scripts/install-hosting-stack.sh"
[[ -n "$PANEL_ALT_PORT" ]] && bash "$QADBAK_DIR/scripts/enable-panel-port.sh" "$PANEL_ALT_PORT"
[[ -n "$LE_EMAIL" ]] && certbot --nginx -d "$PANEL_HOST" --non-interactive --agree-tos -m "$LE_EMAIL" || true

sudo -u "$QADBAK_USER" bash -c "cd '$QADBAK_DIR' && pm2 delete qadbak 2>/dev/null; pm2 start npm --name qadbak -- start && pm2 save"

echo ""
echo "Native install done. Panel: https://$PANEL_HOST/login (or :$PANEL_ALT_PORT)"
echo "Next: docs/MIGRATE-FROM-VIRTUALMIN.md if importing from an existing VirtualMin server."
