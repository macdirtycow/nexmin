#!/usr/bin/env bash
# Repair Qadbak panel reachability after git update / phase-8 nginx changes.
# Fixes Cloudflare 520 (empty origin), broken panel.<domain> vhosts, and :11000 alt port.
#
# Usage (on VPS as root):
#   sudo bash scripts/repair-panel-access.sh
#   sudo bash scripts/repair-panel-access.sh siccamanagement.nl
#   sudo bash scripts/repair-panel-access.sh --check-only
#
# With no domain args, repairs every hosted domain in data/native-domains.json and any
# existing /etc/nginx/sites-enabled/qadbak-panel-*.conf vhost.
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"
CHECK_ONLY=0
DOMAINS=()

for arg in "$@"; do
  case "$arg" in
    --check-only|-n) CHECK_ONLY=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      DOMAINS+=("$arg")
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/repair-panel-access.sh [domain ...]" >&2
  exit 1
fi

if [[ ! -d "$QADBAK_DIR" ]]; then
  echo "Missing $QADBAK_DIR" >&2
  exit 1
fi

# shellcheck source=scripts/lib/read-env-local.sh
source "$QADBAK_DIR/scripts/lib/read-env-local.sh" 2>/dev/null || true
PANEL_PORT="$(read_env_local_key QADBAK_PANEL_PORT 11000)"

is_valid_domain() {
  [[ "$1" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$ ]]
}

add_domain() {
  local d="${1,,}"
  [[ -z "$d" ]] && return 0
  is_valid_domain "$d" || return 0
  local existing
  for existing in "${UNIQUE[@]:-}"; do
    [[ "$existing" == "$d" ]] && return 0
  done
  UNIQUE+=("$d")
}

discover_from_registry() {
  local reg="$QADBAK_DIR/data/native-domains.json"
  [[ -f "$reg" ]] || return 0
  if command -v jq &>/dev/null; then
    while read -r d; do add_domain "$d"; done < <(jq -r '.[].name // empty' "$reg" 2>/dev/null)
  else
    while read -r d; do add_domain "$d"; done < <(
      node -e "
        const fs = require('fs');
        const rows = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
        for (const r of rows || []) if (r && r.name) console.log(r.name);
      " "$reg" 2>/dev/null || true
    )
  fi
}

discover_from_nginx() {
  local f host
  for f in /etc/nginx/sites-enabled/qadbak-panel-*.conf; do
    [[ -f "$f" ]] || continue
    host="$(grep -m1 'server_name panel\.' "$f" 2>/dev/null | sed -E 's/.*server_name[[:space:]]+panel\.([^;[:space:]]+).*/\1/' || true)"
    add_domain "$host"
  done
}

UNIQUE=()
for d in "${DOMAINS[@]}"; do add_domain "$d"; done
if [[ ${#UNIQUE[@]} -eq 0 ]]; then
  discover_from_registry
  discover_from_nginx
fi

echo "==> Qadbak panel access repair"
if [[ ${#UNIQUE[@]} -eq 0 ]]; then
  echo "    No domains found — pass one: sudo bash $0 example.com" >&2
else
  echo "    Domains: ${UNIQUE[*]}"
fi
echo "    Alt panel port: $PANEL_PORT"

echo ""
echo "==> 1) Application (pm2 + Next.js :3000)"
if sudo -u "$QADBAK_USER" pm2 list 2>/dev/null | grep -q qadbak; then
  sudo -u "$QADBAK_USER" pm2 list 2>/dev/null | grep -E 'qadbak|name' || true
else
  echo "    WARN: pm2 process qadbak not listed" >&2
fi
if curl -sf "http://127.0.0.1:3000/api/health" | head -c 220; then
  echo ""
  echo "    OK — /api/health"
else
  echo "    FAIL — Next.js not responding on :3000" >&2
  echo "    Try: sudo -u $QADBAK_USER pm2 logs qadbak --lines 40" >&2
fi

echo ""
echo "==> 2) panel.<domain> vhosts (nginx :80 / :443)"
FAIL=0
for d in "${UNIQUE[@]}"; do
  host="panel.${d}"
  echo "    --- $host"
  enabled="/etc/nginx/sites-enabled/qadbak-panel-${d//./-}.conf"
  if [[ -f "$enabled" ]]; then
    echo "    config: $enabled"
  else
    echo "    config: (missing — will create)"
  fi
  code_http="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" http://127.0.0.1/login 2>/dev/null || echo 000)"
  code_https="$(curl -sk -o /dev/null -w '%{http_code}' -H "Host: $host" https://127.0.0.1/login 2>/dev/null || echo 000)"
  echo "    local HTTP  → $code_http"
  echo "    local HTTPS → $code_https"
  if [[ "$code_http" == "000" && "$code_https" == "000" ]]; then
    FAIL=1
  fi
done

if [[ ${#UNIQUE[@]} -eq 0 ]]; then
  ls -la /etc/nginx/sites-enabled/*panel* 2>/dev/null || echo "    (no qadbak-panel-* sites)"
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo ""
  echo "Check-only mode — no changes applied."
  exit "$FAIL"
fi

echo ""
echo "==> 3) Repair client panel vhosts"
for d in "${UNIQUE[@]}"; do
  echo "    apply-client-panel-vhost.sh $d"
  bash "$QADBAK_DIR/scripts/apply-client-panel-vhost.sh" "$d"
done

echo ""
echo "==> 4) Main panel nginx (:$PANEL_PORT, not :3000)"
bash "$QADBAK_DIR/scripts/fix-panel-nginx-port.sh" "$PANEL_PORT"

if [[ -f "$QADBAK_DIR/scripts/open-host-firewall-port.sh" ]]; then
  echo ""
  echo "==> 5) Host firewall (Cloudflare needs 80/443)"
  bash "$QADBAK_DIR/scripts/open-host-firewall-port.sh" 80 || true
  bash "$QADBAK_DIR/scripts/open-host-firewall-port.sh" 443 || true
fi

echo ""
echo "==> 6) pm2 restart (load .env.local)"
sudo -u "$QADBAK_USER" bash -c "cd '$QADBAK_DIR' && bash scripts/pm2-restart-qadbak.sh"

echo ""
echo "==> 7) Verify"
FAIL=0
for d in "${UNIQUE[@]}"; do
  host="panel.${d}"
  code_http="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" http://127.0.0.1/login 2>/dev/null || echo 000)"
  echo "    $host HTTP → $code_http"
  if [[ "$code_http" =~ ^(200|301|302|307|308)$ ]]; then
    echo "    OK — https://$host/login (via Cloudflare: set SSL Flexible or Full)"
  else
    echo "    WARN — unexpected status for $host" >&2
    FAIL=1
  fi
done

code_alt="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PANEL_PORT}/login" 2>/dev/null || echo 000)"
echo "    alt port :$PANEL_PORT/login → $code_alt"

if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "Some checks failed. Logs:" >&2
  echo "  sudo tail -30 /var/log/nginx/error.log" >&2
  echo "  sudo -u $QADBAK_USER pm2 logs qadbak --lines 40" >&2
  exit 1
fi

echo ""
echo "OK — panel access repaired."
echo "Cloudflare 520? Set SSL/TLS → Flexible (no origin cert) or Full (with Let's Encrypt)."
echo "See docs/CLOUDFLARE.md"
