# Ubuntu 24.04 LTS

Qadbak native install supports **Ubuntu 22.04** and **24.04 LTS** (Jammy and Noble).

| Area | Notes |
|------|--------|
| Stack | nginx, Apache, MariaDB, Postfix, Dovecot, BIND, PHP-FPM |
| PHP | 8.1 typical on 22.04; **8.3** on 24.04 (auto-detected) |
| Panel | Node.js 20+ |

Before install:

```bash
sudo bash /opt/qadbak/scripts/check-ubuntu-support.sh
```

Install: [install/qadbak-install.sh](../install/qadbak-install.sh) (same on both releases).

Commercial Premium is delivered via the **license server** after you activate a key in the panel — not via a separate public GitHub repository. See [COMMERCIAL-LICENSING.md](../COMMERCIAL-LICENSING.md).
