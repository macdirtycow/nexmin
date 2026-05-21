# Project status (Qadbak)

**Last updated:** for isolated v1 test server workflow.

## Do not use production hosts for Qadbak testing

| Host | Use |
|------|-----|
| **mareades.com** (or any server with live client sites) | **No** — production; parity screenshots only |
| **Dedicated Ubuntu 22.04 test VPS** | **Yes** — all v1 validation |

## Where we are

| Track | Phase | Status |
|-------|-------|--------|
| **Product** | 0 — Deploy + front door on test VPS | **Next** — you run [V1-TEST-SERVER.md](./V1-TEST-SERVER.md) |
| **Product** | 1 — Parity docs | Done |
| **Product** | 2 — v1 Virtualmin hosting UI | Code complete; **E2E not signed off** until test VPS passes checklist |
| **Product** | 3 — Rebrand Qadbak | Done |
| **Product** | 4 — Installer | Done |
| **Product** | 5–7 — Webmin menus (embed) | Interim routes exist; not v1 exit criteria |
| **Code** | Integration phases 1–8 (`IMPLEMENTED_PHASE`) | Wired in repo |
| **Live proof** | [E2E-CHECKLIST.md](./E2E-CHECKLIST.md) | Pending on **your** test server |

## Repo tooling (new)

| Script | Purpose |
|--------|---------|
| `install/qadbak-install.sh` | Full stack + optional client user + UFW |
| `scripts/post-install-verify.sh` | After install checks |
| `scripts/update-qadbak.sh` | git pull, build, pm2 restart |
| `scripts/configure-ufw-qadbak.sh` | Firewall 22/80/443 |
| `GET /api/health` | Liveness JSON |

See [COMPLETENESS.md](./COMPLETENESS.md).

## v1 exit = test server only

v1 is “ready to test” when:

1. You have a **separate** VPS (nothing shared with client sites).
2. You follow **[V1-TEST-SERVER.md](./V1-TEST-SERVER.md)** steps 1–12 in order.
3. Every box in **[E2E-CHECKLIST.md](./E2E-CHECKLIST.md)** is checked on that VPS.

After that, you may point **qadbak.com** (or a production panel host) at a new deploy — still not on mareades unless you accept risk.

## Quick links

- [V1-TEST-SERVER.md](./V1-TEST-SERVER.md) — step-by-step test VPS (start here)
- [FRONT-DOOR.md](./FRONT-DOOR.md) — IP/443 → Qadbak, not :10000
- [TEST-VPS.md](./TEST-VPS.md) — short VPS notes
- [E2E-CHECKLIST.md](./E2E-CHECKLIST.md) — what to click after install
