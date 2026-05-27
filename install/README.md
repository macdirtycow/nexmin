# Qadbak installer

One-shot setup for **Ubuntu 22.04 or 24.04 LTS**: hosting stack + independent Qadbak panel.

## Requirements

- Ubuntu 22.04 or 24.04 LTS VPS (see [docs/UBUNTU-24-LTS.md](../docs/UBUNTU-24-LTS.md))
- Root access
- DNS **A record** for panel hostname → server IP
- 1+ GB RAM (2+ GB recommended)

## Run

```bash
git clone https://github.com/macdirtycow/qadbak.git /opt/qadbak
cd /opt/qadbak
sudo bash install/qadbak-install.sh
```

See [docs/QADBAK-NATIVE-INSTALL.md](../docs/QADBAK-NATIVE-INSTALL.md).

## After install

```bash
sudo bash /opt/qadbak/scripts/update-qadbak.sh
curl -s http://127.0.0.1:3000/api/health
bash /opt/qadbak/scripts/audit-vm-dependency.sh
```

## Environment

Installer writes `/opt/qadbak/.env.local` with `QADBAK_PROVISIONER=native` and full `QADBAK_NATIVE_FEATURES`.

`install/qadbak-install-native.sh` is a compatibility alias for `qadbak-install.sh`.

## Migrating from another control panel

The installer targets **fresh VPS** setups. If an old GPL panel is still on the box, switch to native mode first (`apply-phase8-independent.sh`), verify the panel, then remove packages manually — see [docs/MIGRATE-FROM-LEGACY-HOSTING.md](../docs/MIGRATE-FROM-LEGACY-HOSTING.md).

## Resume a failed install

If `qadbak-install.sh` stops mid-way (typically on a sudoers verify step), fix
the reported issue, then resume without rebuilding npm dependencies:

```bash
sudo bash /opt/qadbak/install/qadbak-install-resume.sh
```

## Uninstall

```bash
sudo bash /opt/qadbak/install/qadbak-uninstall.sh           # safe default (panel only)
sudo bash /opt/qadbak/install/qadbak-uninstall.sh --help    # see all flags
sudo bash /opt/qadbak/install/qadbak-uninstall.sh --dry-run # preview, change nothing
```

By default the uninstaller **keeps your hosting stack and customer data**
(nginx, mariadb, postfix, dovecot, bind, /var/www) — only the Qadbak panel
itself is removed. Use `--remove-stack` and `--remove-customers` for a full
wipe (test VPS only).
