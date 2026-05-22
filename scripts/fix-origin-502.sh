#!/usr/bin/env bash
# Fix Cloudflare 502 (bad gateway) — nginx upstream / Apache / SSL mode.
# Usage: sudo bash scripts/fix-origin-502.sh [domain]
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash scripts/fix-origin-502.sh DOMAIN" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

echo "==> Services"
for svc in nginx apache2 httpd; do
  systemctl is-active "$svc" 2>/dev/null && echo "  $svc: active" || echo "  $svc: NOT active"
done

echo ""
echo "==> Listeners (80 / 443 / 8080)"
ss -ltn 2>/dev/null | grep -E ':80 |:443 |:8080 |:8180 ' || true

echo ""
echo "==> Apply hosting nginx (correct Apache backend)"
DETECT_DOMAIN="$DOMAIN" bash "$ROOT/scripts/apply-hosting-nginx.sh"

echo ""
echo "==> VirtualMin + Apache for $DOMAIN"
bash "$ROOT/scripts/fix-domain-website.sh" "$DOMAIN"

echo ""
echo "==> Origin test (must not be 502/000)"
CODE="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 -H "Host: $DOMAIN" http://127.0.0.1/ 2>/dev/null || echo 000)"
echo "    http://127.0.0.1/ Host: $DOMAIN → HTTP $CODE"
if [[ "$CODE" == "502" || "$CODE" == "000" ]]; then
  echo "    FAIL — fix Apache/VirtualMin web for this domain." >&2
  echo "    Try: virtualmin validate-domains --domain $DOMAIN" >&2
  echo "    Logs: tail -30 /var/log/nginx/error.log" >&2
  exit 1
fi

echo ""
echo "==> Cloudflare (502 in browser often means HTTPS to origin without a cert)"
echo "    SSL/TLS encryption mode → Flexible (origin is HTTP on port 80)"
echo "    Or install origin cert: certbot --nginx -d $DOMAIN"
echo "    A record → your VPS IP (set QADBAK_ORIGIN_IP in .env.local)"
echo ""
echo "Done."
