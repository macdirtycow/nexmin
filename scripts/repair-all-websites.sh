#!/bin/bash
# Backfill / repair every Qadbak-managed website on this VPS.
# Iterates legacy-host domains (preferred) then data/native-domains.json,
# de-duplicates, and runs scripts/fix-domain-website.sh per domain.
#
# Operator one-liner:
#   sudo bash /opt/qadbak/scripts/repair-all-websites.sh
#
# Dry-run (just list domains, do nothing):
#   sudo bash /opt/qadbak/scripts/repair-all-websites.sh --dry-run

set -uo pipefail

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n)
      DRY_RUN=1
      ;;
    -h|--help)
      cat <<USAGE
Usage: sudo bash scripts/repair-all-websites.sh [--dry-run]

Repairs every Qadbak-managed domain by invoking
scripts/fix-domain-website.sh per domain. Domains are collected
from legacy-host (when installed) and from data/native-domains.json
as a fallback.

Options:
  --dry-run, -n   List the domains that would be repaired without
                  executing anything.
  -h, --help      Show this help and exit.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

if [[ "$DRY_RUN" -eq 0 && "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX_SCRIPT="$ROOT/scripts/fix-domain-website.sh"
if [[ ! -f "$FIX_SCRIPT" ]]; then
  echo "Missing $FIX_SCRIPT" >&2
  exit 1
fi

declare -a DOMAINS=()

if command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
  while IFS= read -r d; do
    [[ -n "$d" ]] && DOMAINS+=("$d")
  done < <("${QADBAK_LEGACY_HOST_BIN}" list-domains --multiline 2>/dev/null \
            | awk -F': *' '/^Domain name:/ {print $2}')
fi

if [[ -f "$ROOT/data/native-domains.json" ]]; then
  if command -v jq &>/dev/null; then
    while IFS= read -r d; do
      [[ -n "$d" ]] && DOMAINS+=("$d")
    done < <(jq -r '.[]? | .name // empty' "$ROOT/data/native-domains.json" 2>/dev/null)
  elif command -v node &>/dev/null; then
    while IFS= read -r d; do
      [[ -n "$d" ]] && DOMAINS+=("$d")
    done < <(node -e "
      const fs=require('fs');
      try {
        const rows=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
        if (Array.isArray(rows)) {
          for (const r of rows) { if (r && r.name) process.stdout.write(String(r.name)+'\n'); }
        }
      } catch (_) {}
    " "$ROOT/data/native-domains.json" 2>/dev/null)
  fi
fi

declare -a UNIQUE=()
SEEN_LIST=""
for d in "${DOMAINS[@]:-}"; do
  [[ -z "$d" ]] && continue
  case "$SEEN_LIST" in
    *"|$d|"*) ;;
    *)
      SEEN_LIST="${SEEN_LIST}|$d|"
      UNIQUE+=("$d")
      ;;
  esac
done

TOTAL="${#UNIQUE[@]}"
if [[ "$TOTAL" -eq 0 ]]; then
  echo "No domains found from legacy-host or data/native-domains.json — nothing to do." >&2
  exit 0
fi

echo "==> ${TOTAL} domain(s) to process:"
for d in "${UNIQUE[@]}"; do
  echo "    - $d"
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo "(--dry-run) no changes made."
  exit 0
fi

resolve_user_for_domain() {
  local domain="$1"
  local u=""
  if command -v "${QADBAK_LEGACY_HOST_BIN:-}" &>/dev/null; then
    u="$("${QADBAK_LEGACY_HOST_BIN}" list-domains --domain "$domain" --multiline 2>/dev/null \
          | awk -F': *' '/^Unix username:/ {print $2; exit}')"
  fi
  if [[ -z "$u" && -f "$ROOT/data/native-domains.json" ]]; then
    if command -v jq &>/dev/null; then
      u="$(jq -r --arg d "$domain" '.[]? | select(.name==$d) | .user // empty' \
              "$ROOT/data/native-domains.json" 2>/dev/null | head -1)"
    elif command -v node &>/dev/null; then
      u="$(node -e "
        const fs=require('fs');
        try {
          const rows=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
          const r=Array.isArray(rows)?rows.find(x=>x&&x.name===process.argv[2]):null;
          process.stdout.write(r&&r.user?String(r.user):'');
        } catch (_) {}
      " "$ROOT/data/native-domains.json" "$domain" 2>/dev/null || true)"
    fi
  fi
  if [[ -z "$u" ]]; then
    local hint
    for hint in /home/*/.qadbak-domain; do
      [[ -f "$hint" ]] || continue
      if [[ "$(tr -d '\r\n' <"$hint" | head -1)" == "$domain" ]]; then
        u="$(basename "$(dirname "$hint")")"
        break
      fi
    done
  fi
  [[ -z "$u" ]] && u="${domain%%.*}"
  printf '%s' "$u"
}

declare -a RESULTS=()
PASS=0
FAIL=0
SKIP=0

for d in "${UNIQUE[@]}"; do
  echo ""
  echo "============================================================"
  echo "==> Repairing $d"
  echo "============================================================"

  user="$(resolve_user_for_domain "$d")"
  if ! id "$user" >/dev/null 2>&1; then
    echo "    SKIP — unix user '$user' for $d does not exist (legacy/orphan domain)"
    RESULTS+=("$d|SKIP-no-user")
    SKIP=$((SKIP+1))
    continue
  fi

  if bash "$FIX_SCRIPT" "$d"; then
    RESULTS+=("$d|OK")
    PASS=$((PASS+1))
  else
    rc=$?
    RESULTS+=("$d|FAIL(rc=$rc)")
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "============================================================"
echo "==> Summary"
echo "============================================================"
printf "    %-40s  %s\n" "domain" "status"
printf "    %-40s  %s\n" "----------------------------------------" "----------------"
for line in "${RESULTS[@]}"; do
  d="${line%%|*}"
  s="${line#*|}"
  printf "    %-40s  %s\n" "$d" "$s"
done
echo ""
echo "    OK: $PASS    SKIP: $SKIP    FAIL: $FAIL    (total: $TOTAL)"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "    Note: $FAIL domain(s) reported failure. See per-domain output above."
fi

exit 0
