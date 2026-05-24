# How Premium reaches customers (no GitHub access)

Customers who buy a license **never** need your GitHub account, a Personal Access Token, or access to the private `qadbak-premium` repository.

## Two roles

| Role | What they install | GitHub access |
|------|-------------------|---------------|
| **Customer** (license buyer) | Public [`macdirtycow/qadbak`](https://github.com/macdirtycow/qadbak) only | Public repo clone — no token for Premium |
| **Operator** (you / Omiiba) | `qadbak-premium` + license server | Private repo + CI secrets — **not shared with customers** |

## Customer flow (production)

```text
  Customer VPS                         license.omiiba.dev (yours)
  ┌─────────────────┐                 ┌──────────────────────────┐
  │ git clone qadbak │                 │ License API              │
  │ npm install      │   license key   │ + premium-0.1.0.tar.gz │
  │ panel :3000      │ ──────────────► │ (signed, token-gated)  │
  └────────┬─────────┘   activate      └────────────▲─────────────┘
           │                                        │
           │  Refresh modules                       │ you upload
           │  (HTTPS + JWT from license)            │ from private build
           ▼                                        │
  data/premium/0.1.0/  ◄── download only ──────────┘
```

1. Customer clones **public** Qadbak and installs Core.
2. In **Server admin → License**, they enter the **license key** you sold them.
3. Panel calls `https://license.omiiba.dev/v1/activate` → receives a **JWT** (stored in `data/license.json`).
4. **Refresh modules** downloads `premium-<version>.tar.gz` from the license server using that token (`/v1/artifacts/...?token=...`).
5. Bundle is extracted to `data/premium/` — Premium features unlock. **No git clone of qadbak-premium.**

## Operator flow (you only)

1. Develop in private **`macdirtycow/qadbak-premium`** (your machine or CI with deploy key / `GITHUB_TOKEN`).
2. Run `npm run build:release` → obfuscated tarball.
3. Upload artifact to the license server (`LICENSE_ARTIFACTS_DIR` or `build:release` with `LICENSE_ADMIN_TOKEN`).
4. Issue license keys via `/v1/admin/keys` (admin token stays on your infrastructure).

Customers receive:

- A **license key** (e.g. `QAD-…`)
- Optionally `QADBAK_LICENSE_SERVER=https://license.omiiba.dev` in install docs

They do **not** receive:

- GitHub access to `qadbak-premium`
- Your PAT or deploy keys
- Source maps or unobfuscated Premium source (unless you choose a separate support agreement)

## Scripts that are operator-only

These are for **your** test/production ops, not for license buyers:

| Script | Purpose |
|--------|---------|
| `setup-local-license-server.sh` | Run license API on a VPS (needs premium repo on **your** server) |
| `build-premium-vps.sh` | Build bundle on **your** server and sync to local panel |
| `test-license-flow.sh` | End-to-end test on siccamanagement |

On a **customer** server you only need:

```bash
git clone https://github.com/macdirtycow/qadbak.git /opt/qadbak
# install, then in .env.local:
# QADBAK_LICENSE_SERVER=https://license.omiiba.dev
# Panel → License → Activate → Refresh modules
```

## CI recommendation (operator)

Use GitHub Actions (or your laptop) with a **repository secret** `LICENSE_ADMIN_TOKEN`:

- Checkout `qadbak-premium` (private — uses `GITHUB_TOKEN` or deploy key in CI only).
- `npm run build:release` with `LICENSE_SERVER` pointing at production.
- Artifact never published to GitHub Releases for customers — only on **your** license server.

## Security notes

- License server validates the key at **activate**; artifact download requires the **JWT** from that activation.
- Revoke keys on the license server; heartbeats update panel state.
- Do not document or ship `QADBAK_SKIP_SIGNATURE_VERIFY=true` to customers (test servers only).

See [LICENSE-SERVER.md](./LICENSE-SERVER.md) and [COMMERCIAL-LICENSING.md](../COMMERCIAL-LICENSING.md).
