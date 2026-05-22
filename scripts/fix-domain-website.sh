#!/bin/bash
# Fix website unreachable (502 / Cloudflare 523) for one VirtualMin domain.
# Run on VPS: sudo bash scripts/fix-domain-website.sh siccamanagement.nl
set -euo pipefail

if [[ "${1:-}" == "__probe__" ]]; then
  echo "OK"
  exit 0
fi

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash scripts/fix-domain-website.sh DOMAIN" >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Firewall: allow HTTP/HTTPS on host"
bash "$ROOT/scripts/open-host-firewall-port.sh" 80
bash "$ROOT/scripts/open-host-firewall-port.sh" 443

APACHE_OK=0
if [[ -f "$ROOT/scripts/ensure-apache-backend.sh" ]]; then
  if bash "$ROOT/scripts/ensure-apache-backend.sh"; then
    APACHE_OK=1
  fi
else
  echo "==> Start web server (legacy — git pull for ensure-apache-backend.sh)"
  for svc in apache2 httpd nginx; do
    if systemctl list-unit-files "$svc.service" &>/dev/null 2>&1; then
      systemctl enable "$svc" 2>/dev/null || true
      systemctl start "$svc" 2>/dev/null || true
      systemctl is-active "$svc" && echo "    $svc: running" || echo "    $svc: not active"
    fi
  done
  systemctl is-active apache2 &>/dev/null && APACHE_OK=1 || systemctl is-active httpd &>/dev/null && APACHE_OK=1 || true
fi

if [[ -f "$ROOT/scripts/apply-hosting-nginx.sh" ]]; then
  echo ""
  echo "==> Nginx: route $DOMAIN → Apache (not Qadbak landing)"
  DETECT_DOMAIN="$DOMAIN" bash "$ROOT/scripts/apply-hosting-nginx.sh" || true
fi

if command -v virtualmin &>/dev/null; then
  echo ""
  echo "==> VirtualMin: enable web + validate $DOMAIN"
  virtualmin enable-feature --domain "$DOMAIN" --web 2>/dev/null || true
  virtualmin validate-domains --domain "$DOMAIN" --all-features 2>&1 || true
  virtualmin modify-web --domain "$DOMAIN" --document-dir public_html --fix-document-dir --fix-options 2>&1 || true
else
  echo "virtualmin CLI not found — skip VM steps"
fi

echo ""
echo "==> Apache: serve $DOMAIN from public_html (not Ubuntu default site)"
if command -v a2dissite &>/dev/null; then
  a2dissite 000-default.conf 2>/dev/null || true
  a2dissite default.conf 2>/dev/null || true
fi

VM_USER=""
if command -v virtualmin &>/dev/null; then
  VM_USER="$(virtualmin list-domains --domain "$DOMAIN" --multiline 2>/dev/null | awk -F': *' '/^Unix username:/ {print $2; exit}')"
fi
[[ -z "$VM_USER" ]] && VM_USER="${DOMAIN%%.*}"
PUB="/home/$VM_USER/public_html"
if [[ -d "$PUB" ]]; then
  chown -R "$VM_USER:$VM_USER" "$PUB"
  find "$PUB" -type d -exec chmod 755 {} \;
  find "$PUB" -type f -exec chmod 644 {} \;
  echo "    document root: $PUB (owner $VM_USER)"
else
  echo "    WARN — missing $PUB" >&2
fi

for svc in apache2 httpd nginx; do
  systemctl reload "$svc" 2>/dev/null || systemctl restart "$svc" 2>/dev/null || true
done

ORIGIN_IP="${QADBAK_ORIGIN_IP:-}"
if [[ -z "$ORIGIN_IP" ]]; then
  ORIGIN_IP="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
fi

echo ""
echo "==> Local probe (nginx → Apache for Host: $DOMAIN)"
PROBE_BODY="$(mktemp)"
trap 'rm -f "$PROBE_BODY"' EXIT
HTTP_CODE="$(curl -sS --max-time 8 -o "$PROBE_BODY" -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/ || echo 000)"

if [[ "$HTTP_CODE" == "502" && "$APACHE_OK" -eq 0 ]]; then
  echo "    FAIL — HTTP 502: Apache is not running (nginx has nothing to proxy to)."
  echo "    Run:  sudo bash $ROOT/scripts/ensure-apache-backend.sh"
  echo "    Then: sudo bash $ROOT/scripts/fix-domain-website.sh $DOMAIN"
elif [[ "$HTTP_CODE" == "502" ]]; then
  echo "    FAIL — HTTP 502: Apache runs but nginx backend may be wrong."
  echo "    Run:  sudo bash $ROOT/scripts/apply-hosting-nginx.sh"
  echo "    Logs: tail -30 /var/log/nginx/error.log"
elif [[ "$HTTP_CODE" =~ ^[0-9]+$ ]] && (( HTTP_CODE > 0 && HTTP_CODE < 500 )); then
  if grep -qiE 'qadbak.*virtualmin|your hosting panel|sign in at qadbak' "$PROBE_BODY" 2>/dev/null; then
    echo "    WARN — Host $DOMAIN still serves the Qadbak marketing page (not public_html)"
    echo "    Fix:  sudo bash $ROOT/scripts/apply-hosting-nginx.sh"
  elif grep -qiE 'apache2 ubuntu default|ubuntu default page|debian default page|it works!' "$PROBE_BODY" 2>/dev/null; then
    echo "    WARN — Apache still serves the Ubuntu/Debian default page (not your public_html)"
    echo "    Files to edit: $PUB/index.html — then re-run this script or Repair in Qadbak"
    echo "    Also purge Cloudflare cache if you use orange-cloud proxy"
  else
    echo "    OK — HTTP $HTTP_CODE for Host: $DOMAIN"
  fi
else
  echo "    FAIL — no good response on 127.0.0.1 for Host: $DOMAIN (code: $HTTP_CODE)"
  echo "    Check: virtualmin list-domains | grep -i $DOMAIN"
  echo "    Logs: tail -50 /var/log/apache2/error.log /var/log/nginx/error.log"
fi

echo ""
echo "==> Cloudflare"
echo "    A record @ and www → origin IP: ${ORIGIN_IP:-YOUR_VPS_IP}"
echo "    Contabo firewall: allow inbound TCP 80 and 443"
echo "    Error 502 in browser → SSL mode Flexible until origin has HTTPS"
echo "    Error 523 → origin not reachable from the internet"
echo ""
echo "Done."
