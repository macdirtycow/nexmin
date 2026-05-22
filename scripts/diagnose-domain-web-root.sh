#!/usr/bin/env bash
# Show where Apache/nginx think the website root is for a domain.
# Usage: sudo bash scripts/diagnose-domain-web-root.sh siccamanagement.nl
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash scripts/diagnose-domain-web-root.sh DOMAIN" >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VM_USER="${DOMAIN%%.*}"
if command -v virtualmin &>/dev/null; then
  u="$(virtualmin list-domains --domain "$DOMAIN" --multiline 2>/dev/null | awk -F': *' '/^Unix username:/ {print $2; exit}')"
  [[ -n "$u" ]] && VM_USER="$u"
fi
PUB="/home/$VM_USER/public_html"
BACKEND="$(DETECT_DOMAIN="$DOMAIN" bash "$ROOT/scripts/detect-web-backend.sh" 2>/dev/null | tail -1 || echo 127.0.0.1:8080)"

echo "Domain:     $DOMAIN"
echo "Unix user:  $VM_USER"
echo "public_html: $PUB"
echo "nginx→Apache backend: $BACKEND"
echo ""

echo "=== public_html/index.html (first 3 lines) ==="
head -3 "$PUB/index.html" 2>/dev/null || echo "(missing)"
echo ""

echo "=== /var/www/html/index.html (Ubuntu default — should NOT be used) ==="
head -3 /var/www/html/index.html 2>/dev/null || echo "(missing)"
echo ""

echo "=== Apache DocumentRoot lines for this domain ==="
grep -rE "ServerName|DocumentRoot" /etc/apache2/sites-available/ 2>/dev/null | grep -i "$DOMAIN" || \
  echo "(no ServerName $DOMAIN in sites-available)"
grep -h DocumentRoot /etc/apache2/sites-enabled/* 2>/dev/null | sed 's/^/  /' || true
echo ""

echo "=== apache2ctl -S ==="
apache2ctl -S 2>&1 | sed 's/^/  /' || true
echo ""

echo "=== Nginx server_name for domain ==="
grep -r "server_name" /etc/nginx/sites-enabled/ 2>/dev/null | grep -i "$DOMAIN" | sed 's/^/  /' || echo "  (none)"
echo ""

echo "=== HTTP response (title / Ubuntu check) ==="
for label in "nginx:80" "apache-backend"; do
  if [[ "$label" == "nginx:80" ]]; then
    url="http://127.0.0.1/"
  else
    url="http://${BACKEND}/"
  fi
  echo "  $label  curl -H Host:$DOMAIN $url"
  body="$(curl -sS --max-time 6 -H "Host: $DOMAIN" "$url" 2>/dev/null | head -c 4000 || true)"
  if echo "$body" | grep -qi 'apache2 ubuntu default'; then
    echo "    → Ubuntu default page (/var/www/html) — WRONG"
  elif echo "$body" | grep -qi '<title>'; then
    echo "$body" | grep -oiE '<title[^>]*>[^<]+</title>' | head -1 | sed 's/^/    → /'
  else
    echo "    → (no title; $(echo -n "$body" | wc -c) bytes)"
  fi
done
echo ""
echo "Fix: sudo bash $ROOT/scripts/fix-domain-website.sh $DOMAIN"
