#!/bin/bash
# Fix website unreachable (502 / Cloudflare 523) for one VirtualMin domain.
# Run on VPS: sudo bash scripts/fix-domain-website.sh YOUR_DOMAIN
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
# shellcheck source=lib/fix-apache-vhost.sh
source "$ROOT/scripts/lib/fix-apache-vhost.sh"

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
  echo "==> VirtualMin: Webmin login + web for $DOMAIN (Terminal / embeds)"
  virtualmin enable-feature --domain "$DOMAIN" --webmin 2>/dev/null || true
  virtualmin enable-feature --domain "$DOMAIN" --web 2>/dev/null || true
  virtualmin validate-domains --domain "$DOMAIN" --all-features 2>&1 || true
  virtualmin modify-web --domain "$DOMAIN" --document-dir public_html --fix-document-dir --fix-options 2>&1 || true
else
  echo "virtualmin CLI not found — skip VM steps"
fi

VM_USER=""
if command -v virtualmin &>/dev/null; then
  VM_USER="$(virtualmin list-domains --domain "$DOMAIN" --multiline 2>/dev/null | awk -F': *' '/^Unix username:/ {print $2; exit}')"
fi
if [[ -z "$VM_USER" && -f "$ROOT/data/native-domains.json" ]]; then
  if command -v jq &>/dev/null; then
    VM_USER="$(jq -r --arg d "$DOMAIN" '.[] | select(.name==$d) | .user' "$ROOT/data/native-domains.json" 2>/dev/null | head -1)"
  else
    VM_USER="$(node -e "
      const fs=require('fs');
      const rows=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
      const r=rows.find(x=>x&&x.name===process.argv[2]);
      process.stdout.write(r&&r.user?String(r.user):'');
    " "$ROOT/data/native-domains.json" "$DOMAIN" 2>/dev/null || true)"
  fi
fi
if [[ -z "$VM_USER" ]]; then
  for hint in /home/*/.qadbak-domain; do
    [[ -f "$hint" ]] || continue
    if [[ "$(tr -d '\r\n' <"$hint" | head -1)" == "$DOMAIN" ]]; then
      VM_USER="$(basename "$(dirname "$hint")")"
      break
    fi
  done
fi
[[ -z "$VM_USER" ]] && VM_USER="${DOMAIN%%.*}"
PUB="/home/$VM_USER/public_html"

APACHE_BACKEND=""
if [[ -f "$ROOT/scripts/detect-web-backend.sh" ]]; then
  APACHE_BACKEND="$(DETECT_DOMAIN="$DOMAIN" bash "$ROOT/scripts/detect-web-backend.sh" 2>/dev/null | tail -1)"
fi
export APACHE_BACKEND

fix_apache_vhost_for_domain "$DOMAIN" "$VM_USER" "$PUB" "$ROOT"

if [[ -f "$ROOT/scripts/apply-customer-nginx-vhosts.sh" ]]; then
  echo ""
  APACHE_BACKEND="${APACHE_BACKEND:-127.0.0.1:8080}" bash "$ROOT/scripts/apply-customer-nginx-vhosts.sh" || true
elif [[ -f "$ROOT/scripts/apply-domain-nginx.sh" && -d "$PUB" ]]; then
  echo ""
  echo "==> Nginx vhost for $DOMAIN → $PUB"
  ISSUE_SSL=1 bash "$ROOT/scripts/apply-domain-nginx.sh" "$DOMAIN" "$VM_USER" || true
fi

if [[ -d "$PUB" && ! -f "$PUB/index.html" && ! -f "$PUB/index.php" ]]; then
  echo "==> Placeholder index.html (upload your site via Qadbak Files)"
  cat >"$PUB/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${DOMAIN}</title></head>
<body><h1>${DOMAIN}</h1><p>Site is live. Replace this file in <code>public_html</code> via the Qadbak file manager.</p></body>
</html>
EOF
  chown "$VM_USER:$VM_USER" "$PUB/index.html"
fi

if [[ -d "$PUB" ]]; then
  chown -R "$VM_USER:$VM_USER" "$PUB"
  find "$PUB" -type d -exec chmod 755 {} \;
  find "$PUB" -type f -exec chmod 644 {} \;
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
echo "==> Probe: does Apache use public_html for Host: $DOMAIN?"
[[ -n "$APACHE_BACKEND" ]] && echo "    backend: http://$APACHE_BACKEND/"
BACKEND_RESULT="$(probe_web_root "$DOMAIN" "${APACHE_BACKEND:-127.0.0.1:8080}")"
case "$BACKEND_RESULT" in
  ok) echo "    Apache backend → your site (not /var/www/html)" ;;
  ubuntu-default) echo "    FAIL — Apache backend still serves /var/www/html (Ubuntu default)" >&2 ;;
  qadbak-landing) echo "    WARN — backend serves Qadbak landing" >&2 ;;
  *) echo "    WARN — backend probe: $BACKEND_RESULT" >&2 ;;
esac

echo ""
echo "==> Local probe (nginx :80 → site for Host: $DOMAIN)"
PROBE_BODY="$(mktemp)"
HTTPS_BODY="$(mktemp)"
trap 'rm -f "$PROBE_BODY" "$HTTPS_BODY"' EXIT
HTTP_CODE="$(curl -sS --max-time 8 -o "$PROBE_BODY" -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/ || echo 000)"

HTTPS_CODE="$(curl -sS --max-time 8 -o "$HTTPS_BODY" -w '%{http_code}' -k -H "Host: $DOMAIN" https://127.0.0.1/ 2>/dev/null || echo 000)"

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
  echo "    Run:  sudo bash $ROOT/scripts/fix-domain-website.sh $DOMAIN"
  echo "    Logs: tail -50 /var/log/nginx/error.log"
fi

echo ""
echo "==> Local probe HTTPS (Host: $DOMAIN on :443)"
if [[ "$HTTPS_CODE" =~ ^[0-9]+$ ]] && (( HTTPS_CODE > 0 && HTTPS_CODE < 500 )); then
  if grep -q '"error":"Not found"' "$HTTPS_BODY" 2>/dev/null; then
    echo "    FAIL — HTTPS still hits the license/API backend (JSON Not found), not your site"
    echo "    Fix: sudo ISSUE_SSL=1 bash $ROOT/scripts/apply-domain-nginx.sh $DOMAIN $VM_USER"
    echo "    Then: sudo bash $ROOT/scripts/apply-hosting-nginx.sh"
  elif grep -qiE 'qadbak.*virtualmin|sign in at qadbak' "$HTTPS_BODY" 2>/dev/null; then
    echo "    WARN — HTTPS serves Qadbak panel, not public_html"
  else
    echo "    OK — HTTPS $HTTPS_CODE for Host: $DOMAIN"
  fi
elif [[ "$HTTPS_CODE" == "000" ]]; then
  echo "    NOTE — no HTTPS listener for $DOMAIN yet (certbot or Cloudflare Flexible SSL)"
else
  echo "    WARN — HTTPS probe code: $HTTPS_CODE"
fi

echo ""
echo "==> Cloudflare"
echo "    A record @ and www → origin IP: ${ORIGIN_IP:-YOUR_VPS_IP}"
echo "    Contabo firewall: allow inbound TCP 80 and 443"
echo "    Error 502 in browser → SSL mode Flexible until origin has HTTPS"
echo "    Error 523 → origin not reachable from the internet"
echo ""
echo "Done."
