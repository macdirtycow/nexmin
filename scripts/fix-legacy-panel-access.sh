#!/usr/bin/env bash
# Diagnose and fix common legacy hosting API/server admin issues after Qadbak install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
FQDN="$(hostname -f 2>/dev/null || hostname)"
PUBLIC_IP="$(curl -4 -fsS --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/fix-legacy-panel-access.sh" >&2
  exit 1
fi

echo "==> server admin service"
systemctl is-active legacy-panel &>/dev/null && echo "  legacy-panel: active" || echo "  legacy-panel: NOT running — try: systemctl start legacy-panel"

echo ""
echo "==> remote.cgi (local API)"
CODE="$(curl -sk -o /dev/null -w "%{http_code}" -u root:"${VM_PASS:-}" \
  "https://127.0.0.1:10000/virtual-server/remote.cgi" 2>/dev/null || echo 000)"
echo "  HTTP $CODE (401/200 = server admin reachable; 000 = down)"

if [[ -f "$ENV_FILE" ]]; then
  echo ""
  echo "==> Qadbak .env.local (API)"
  grep -E '^QADBAK_LEGACY_API_|^QADBAK_LEGACY_PANEL_|^NODE_TLS|^QADBAK_LEGACY_API_MOCK' "$ENV_FILE" | sed 's/PASS=.*/PASS=***/'
fi

echo ""
echo "==> Hostname (postfix/legacy hosting API need a name, not bare IP)"
hostname -f
if hostname -f | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "  WARN: FQDN is an IP — fixing to $FQDN"
  hostnamectl set-hostname "$FQDN" 2>/dev/null || true
fi

echo ""
read -rp "Open server admin port 10000 on firewalld/iptables? [y/N]: " OPEN
if [[ "$OPEN" =~ ^[Yy]$ ]]; then
  bash "$ROOT/scripts/open-host-firewall-port.sh" 10000
  echo "  Also add TCP 10000 Accept in Contabo cloud firewall."
fi

echo ""
read -rsp "server admin root password (for test-api, Enter to skip): " VM_PASS
echo
if [[ -n "$VM_PASS" && -f "$ENV_FILE" ]]; then
  sed -i "s/^QADBAK_LEGACY_API_PASS=.*/QADBAK_LEGACY_API_PASS=$(printf '%s' "$VM_PASS" | sed 's/[&/]/\\&/g')/" "$ENV_FILE"
  echo "  Updated QADBAK_LEGACY_API_PASS in .env.local"
fi

QADBAK_LEGACY_PANEL_URL="https://${FQDN}:10000"
if [[ -f "$ENV_FILE" ]]; then
  for key in QADBAK_LEGACY_PANEL_URL QADBAK_LEGACY_PANEL_URL; do
    if grep -q "^${key}=" "$ENV_FILE"; then
      sed -i "s|^${key}=.*|${key}=${QADBAK_LEGACY_PANEL_URL}|" "$ENV_FILE"
    else
      echo "${key}=${QADBAK_LEGACY_PANEL_URL}" >>"$ENV_FILE"
    fi
  done
  if grep -q '^NODE_TLS_REJECT_UNAUTHORIZED=0' "$ENV_FILE" 2>/dev/null; then
    sed -i '/^NODE_TLS_REJECT_UNAUTHORIZED=/d' "$ENV_FILE"
    echo "    Removed global NODE_TLS_REJECT_UNAUTHORIZED=0 (use QADBAK_LEGACY_API_TLS_INSECURE instead)"
  fi
  grep -q '^QADBAK_LEGACY_API_TLS_INSECURE=' "$ENV_FILE" || \
    echo 'QADBAK_LEGACY_API_TLS_INSECURE=true' >>"$ENV_FILE"
  grep -q '^QADBAK_LEGACY_API_MOCK=' "$ENV_FILE" && \
    sed -i 's/^QADBAK_LEGACY_API_MOCK=.*/QADBAK_LEGACY_API_MOCK=false/' "$ENV_FILE"
  chown qadbak:qadbak "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

echo ""
echo "==> test-api as qadbak user"
if [[ -n "${VM_PASS:-}" ]]; then
  export QADBAK_LEGACY_API_PASS="$VM_PASS"
fi
sudo -u qadbak bash -c "cd '$ROOT' && npm run test-api" 2>&1 | tail -30 || true

echo ""
echo "==> Restart Qadbak"
sudo -u qadbak bash -c "cd '$ROOT' && pm2 restart qadbak --update-env"

echo ""
echo "============================================"
echo " Browser (admin): $QADBAK_LEGACY_PANEL_URL"
echo " Qadbak login:    http://${PUBLIC_IP}:11000/login  (or https://${FQDN} if nginx panel vhost)"
echo " After login, Domains should list VM domains if test-api OK."
echo "============================================"
