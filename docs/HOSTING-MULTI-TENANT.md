# Multi-tenant hosting (all VirtualMin domains)

Qadbak server scripts are **not** tied to one customer domain. They read domains from VirtualMin and apply the same rules to each.

| Script | Scope |
|--------|--------|
| `apply-customer-nginx-vhosts.sh` | **All** domains: nginx `server_name` → `/home/USER/public_html` |
| `fix-domain-website.sh DOMAIN` | One domain (Repair button); also refreshes **all** nginx vhosts |
| `apply-hosting-nginx.sh` | Panel host + default_server; probes one domain for Apache backend |
| `fix-domain-website.sh` | Per-domain VirtualMin/Apache fix |

Examples in docs use `siccamanagement.nl` only as a sample hostname. On your VPS, pass **your** domain:

```bash
sudo bash scripts/fix-domain-website.sh jouwdomein.nl
```

After **creating any domain** in the panel, Repair (or install) runs the same nginx + Apache setup for that unix user’s `public_html`.
