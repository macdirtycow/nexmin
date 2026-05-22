#!/usr/bin/env bash
# Phase 7 on test VPS: node agent + servers registry (multi-server foundation).
# Keeps VirtualMin on this host; panel + agent on same machine until you add a second VPS.
#
# Usage: sudo bash /opt/qadbak/scripts/apply-phase7-test-server.sh
set -euo pipefail

QADBAK_DIR="${QADBAK_DIR:-/opt/qadbak}"
QADBAK_USER="${QADBAK_USER:-qadbak}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/apply-phase7-test-server.sh" >&2
  exit 1
fi

cd "$QADBAK_DIR"
echo "==> Phase 7 test-server apply ($QADBAK_DIR)"

if ! git diff --quiet package-lock.json scripts/run-domain-fs-helper.sh 2>/dev/null; then
  bash "$QADBAK_DIR/scripts/reset-git-drift-before-pull.sh"
fi
git pull --ff-only
bash "$QADBAK_DIR/scripts/fix-qadbak-ownership.sh"

set_env_key() {
  local key="$1" val="$2" file="$QADBAK_DIR/.env.local"
  [[ -f "$file" ]] || touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >>"$file"
  fi
}

AGENT_PORT="${QADBAK_NODE_AGENT_PORT:-9100}"
if [[ -f "$QADBAK_DIR/.env.local" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^QADBAK_NODE_AGENT_TOKEN=' "$QADBAK_DIR/.env.local" 2>/dev/null | sed 's/^/export /') || true
fi
if [[ -z "${QADBAK_NODE_AGENT_TOKEN:-}" ]]; then
  TOKEN="$(openssl rand -hex 24)"
  set_env_key "QADBAK_NODE_AGENT_TOKEN" "$TOKEN"
  echo "    Generated QADBAK_NODE_AGENT_TOKEN"
fi

FQDN="$(hostname -f 2>/dev/null || hostname)"
PANEL_HOST="${QADBAK_PUBLIC_HOST:-$FQDN}"
VM_URL="${VIRTUALMIN_URL:-https://127.0.0.1:10000/virtual-server/remote.cgi}"

set_env_key "QADBAK_MULTI_SERVER" "true"
set_env_key "QADBAK_INDEPENDENCE_PHASE" "7"
set_env_key "QADBAK_NODE_AGENT_PORT" "$AGENT_PORT"
set_env_key "QADBAK_NODE_ID" "local"
set_env_key "QADBAK_NODE_AGENT_HOST" "127.0.0.1"

SERVERS_FILE="$QADBAK_DIR/data/servers.json"
if [[ ! -f "$SERVERS_FILE" ]]; then
  mkdir -p "$QADBAK_DIR/data"
  cat >"$SERVERS_FILE" <<EOF
[
  {
    "id": "local",
    "name": "${PANEL_HOST}",
    "roles": ["panel", "provisioner"],
    "agentUrl": "http://127.0.0.1:${AGENT_PORT}",
    "virtualminUrl": "${VM_URL}",
    "isDefault": true
  }
]
EOF
  echo "    Created data/servers.json (local node)"
fi
chown "$QADBAK_USER:$QADBAK_USER" "$SERVERS_FILE" "$QADBAK_DIR/.env.local"
chmod 600 "$QADBAK_DIR/.env.local" "$SERVERS_FILE"

chmod +x "$QADBAK_DIR/scripts/qadbak-node-agent.mjs"

echo "==> Build + pm2 (panel + terminal + node agent)"
sudo -u "$QADBAK_USER" bash -c "cd '$QADBAK_DIR' && npm install && npm run build"
sudo -u "$QADBAK_USER" bash -c "cd '$QADBAK_DIR' && bash scripts/pm2-restart-qadbak.sh"

echo "==> Verify node agent"
sleep 2
if curl -sf "http://127.0.0.1:${AGENT_PORT}/health" | grep -q '"ok":true'; then
  echo "OK — node agent http://127.0.0.1:${AGENT_PORT}/health"
else
  echo "WARN: node agent health check failed — sudo -u $QADBAK_USER pm2 logs qadbak-node-agent --lines 30" >&2
fi

echo "==> Preflight"
sudo -u "$QADBAK_USER" bash "$QADBAK_DIR/scripts/v1-test-preflight.sh" || true

echo ""
echo "Done — phase 7 foundation on this VPS."
echo "  Panel → Server admin → Nodes (local agent should be green)"
echo "  Second VPS: install agent + same token → Add remote node in UI"
echo "  E2E: ensure .install-test.env has E2E_ADMIN_PASS=... or QADBAK_E2E_ADMIN_PASS in .env.local"
