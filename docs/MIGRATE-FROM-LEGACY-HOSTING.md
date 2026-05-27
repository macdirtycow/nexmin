# Migrate from legacy hosting API (existing server → Qadbak-first)

For servers that **already run legacy hosting API** (like a Contabo VPS after `qadbak-install.sh`):

## Test server (e.g. example.com on any VPS provider)

Use the **hybrid** apply script — keeps legacy hosting API, adds phase 6 stack + helpers:

```bash
cd /opt/qadbak
git pull
sudo bash scripts/apply-phase6-test-server.sh
```

No full `qadbak-install-native.sh` on a box that already has legacy hosting API and live test domains.

## You do not need phase 6 reinstall

- Panel uses `getProvisioner()` → legacy hosting API API (headless server admin)
- Customers use Qadbak UI only (phases 1–3)
- Admins use **Status**, **Services**, **Stack config** (phases 4–5)
- server admin remains break-glass only

## Optional later: remove local server admin

Only when `QADBAK_PROVISIONER=native` and panel tests pass:

1. `sudo bash scripts/apply-phase8-independent.sh`
2. `bash scripts/audit-vm-dependency.sh`
3. Backup the VPS, then remove packages manually — see [PHASE-8-INDEPENDENT.md](./PHASE-8-INDEPENDENT.md#legacy-panel-packages-optional)

Until then, keep legacy hosting API installed but unused in daily work.

## New VPS without legacy hosting API

Use [QADBAK-NATIVE-INSTALL.md](./QADBAK-NATIVE-INSTALL.md).

## Remote legacy hosting API (split panel and engine)

On the **panel** `.env.local`:

```env
QADBAK_LEGACY_API_URL=https://YOUR-OLD-SERVER:10000/virtual-server/remote.cgi
QADBAK_LEGACY_API_USER=root
QADBAK_LEGACY_API_PASS=...
QADBAK_PROVISIONER=legacy-host
QADBAK_LEGACY_API_MOCK=false
```

Panel host only runs Qadbak + nginx; engine stays on the legacy server during transition.
