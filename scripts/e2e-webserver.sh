#!/usr/bin/env bash
# Start production Next.js for Playwright (mock mode, isolated port).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export SESSION_SECRET="${SESSION_SECRET:-e2e-test-secret-minimum-16-chars}"
export QADBAK_LEGACY_API_MOCK="${QADBAK_LEGACY_API_MOCK:-true}"
export PORT="${E2E_PORT:-3099}"
export QADBAK_PUBLIC_HOST="${QADBAK_PUBLIC_HOST:-localhost}"

mkdir -p data
cp -f data/users.example.json data/users.json

echo "==> E2E production build"
npm run build

exec npm run start
