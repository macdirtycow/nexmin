#!/usr/bin/env bash
# Quick alias for panel 520 / unreachable after update.
# Usage: sudo bash scripts/fix-panel-now.sh [domain ...]
set -euo pipefail
ROOT="${QADBAK_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
exec bash "$ROOT/scripts/repair-panel-access.sh" "$@"
