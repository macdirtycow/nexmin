#!/usr/bin/env bash
# Issue Let's Encrypt certificates for every customer domain that does not
# already have one, then rebuild the nginx vhost so HTTPS is served.
#
# Usage:  sudo bash scripts/issue-customer-ssl.sh [--force]
#   --force  re-run certbot even when a cert already exists (renewal will
#            only happen if the cert is within --keep-until-expiring window)

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/issue-customer-ssl.sh" >&2
  exit 1
fi

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
QADBAK_DIR="${QADBAK_DIR:-$ROOT}"

# shellcheck source=lib/list-customer-domains.sh
source "$QADBAK_DIR/scripts/lib/list-customer-domains.sh"

if ! command -v certbot &>/dev/null; then
  echo "certbot not installed — install with: sudo apt-get install -y certbot python3-certbot-nginx" >&2
  exit 1
fi

mapfile -t ROWS < <(list_customer_domains_tsv | sort -u)
[[ ${#ROWS[@]} -eq 0 ]] && { echo "No customer domains found."; exit 0; }

issued=0
skipped=0
failed=0

echo "==> Issuing TLS for ${#ROWS[@]} customer domain(s)"
for row in "${ROWS[@]}"; do
  domain="${row%%$'\t'*}"
  user="${row#*$'\t'}"
  [[ -z "$domain" || -z "$user" ]] && continue
  PUB="/home/$user/public_html"
  [[ -d "$PUB" ]] || { echo "    SKIP $domain — no $PUB"; skipped=$((skipped + 1)); continue; }

  if [[ "$FORCE" != "1" && -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ]]; then
    echo "    OK   $domain — cert already present"
    skipped=$((skipped + 1))
    # Make sure the HTTPS vhost is up to date with the cert.
    bash "$QADBAK_DIR/scripts/apply-domain-nginx.sh" "$domain" "$user" --no-ssl >/dev/null
    continue
  fi

  echo "    ==> $domain"
  if ISSUE_SSL=1 bash "$QADBAK_DIR/scripts/apply-domain-nginx.sh" "$domain" "$user" --ssl; then
    if [[ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ]]; then
      issued=$((issued + 1))
    else
      failed=$((failed + 1))
    fi
  else
    failed=$((failed + 1))
  fi
done

echo ""
echo "==> nginx -t && reload"
nginx -t && systemctl reload nginx

echo ""
echo "Done. issued=$issued skipped=$skipped failed=$failed"
[[ "$failed" -gt 0 ]] && {
  echo ""
  echo "Some domains failed. Common fixes:"
  echo "  1. Cloudflare: SSL/TLS → Edge Certificates → 'Always Use HTTPS' = OFF (temporarily)"
  echo "  2. Cloudflare: set domain to DNS-only (gray cloud) for issuance, then re-enable proxy"
  echo "  3. Verify DNS:  dig +short <domain>  → must include this server's public IP"
  echo "  4. Or install a Cloudflare Origin Certificate (15-year cert) instead of Let's Encrypt."
  exit 1
}
