# Integratiefases — VirtualMin Panel

Volledige dekking van VirtualMin gebeurt in fasen. Elke fase voegt API-programma’s toe aan RBAC (`src/lib/features.ts`) en UI onder `/domains/[domain]/…`.

**Status:** Fase 1–8 ✅

---

## Fase 1 — Kern (afgerond)

| Gebied | VirtualMin API | Panel-route |
|--------|----------------|-------------|
| Domeinen overzicht | `list-domains` | `/domains` |
| Domein in/uit | `enable-domain`, `disable-domain` | detail |
| E-mail mailboxen | `list-users`, `create-user`, `modify-user`, `delete-user` | `/domains/…/email` |
| Databases | `list-databases`, `create-database`, `modify-database-pass` | `/domains/…/databases` |
| VirtualMin deep-link | `create-login-link` | detail |

---

## Fase 2 — DNS, SSL, aliassen, redirects, back-ups (afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| DNS bekijken/wijzigen | `get-dns`, `modify-dns` | `/domains/…/dns` |
| SSL certificaten | `list-certs`, `list-certs-expiry`, `generate-letsencrypt-cert` | `/domains/…/ssl` |
| E-mail aliassen | `list-aliases`, `list-simple-aliases`, `create-simple-alias`, `delete-alias` | `/domains/…/aliases` |
| URL-redirects | `list-redirects`, `create-redirect`, `delete-redirect` | `/domains/…/redirects` |
| Back-ups | `backup-domain`, `list-scheduled-backups` | `/domains/…/backups` |

---

## Fase 3 — Website & PHP (afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| Bestanden (public_html) | `create-login-link` → file manager; mock: panel-browser | `/domains/…/files` |
| Webmin & Usermin | `create-login-link` (root / domain / usermin-user) | `/admin/webmin`, `/domains/…/webmin` |
| Website logs | `get-logs` | `/domains/…/logs` |
| PHP per map | `list-php-versions`, `list-php-directories`, `set-php-directory`, `delete-php-directory` | `/domains/…/php` |
| PHP.ini | `list-php-ini`, `modify-php-ini` | `/domains/…/php` |
| Beveiligde mappen | `list-protected-directories`, `create-protected-directory`, `delete-protected-directory` | `/domains/…/protected` |
| Wachtwoord mappen | `list-protected-users`, `create-protected-user`, `delete-protected-user` | `/domains/…/protected` |
| Spam & DKIM | `set-spam`, `set-dkim` | `/domains/…/security` |

---

## Fase 4 — Domeinlevenscyclus (admin, afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| Nieuw domein | `create-domain` | `/domains/new` |
| Subdomein / alias | `create-domain` (flags) | `/domains/new` |
| Features | `list-features`, `enable-feature`, `disable-feature` | `/domains/…/features` |
| Limieten | `modify-limits`, `modify-resources` | `/domains/…/limits` |
| Levenscyclus | `delete-domain`, `clone-domain`, `migrate-domain`, `transfer-domain`, `validate-domains` | `/domains/…/lifecycle` |
| Server check | `check-config` | dashboard (admin) |

---

## Fase 5 — Scripts & proxies (afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| Script installers | `list-available-scripts`, `install-script`, `delete-script`, `list-scripts` | `/domains/…/scripts` |
| Proxies | `list-proxies`, `create-proxy`, `delete-proxy` | `/domains/…/proxies` |
| Cron | `list-cron-jobs`, `create-cron-job`, `delete-cron-job` (→ `run-api-command`) | `/domains/…/cron` |

---

## Fase 6 — Mail uitgebreid & FTP (afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| IMAP mailboxen | `list-mailbox`, `copy-mailbox` | `/domains/…/mailboxes` |
| Mail logs | `search-maillogs`, `resend-email` | `/domains/…/mail-logs` |
| Catch-all / autoresponder | `modify-mail` | `/domains/…/mail-settings` |
| FTP-accounts | `create-user`, `modify-user`, `delete-user` (ftp=1) | `/domains/…/ftp` |
| Gedeelde adressen | `list-shared-addresses`, `create-shared-address`, `delete-shared-address` | `/domains/…/shared` |

---

## Fase 7 — Server & reseller (alleen admin, afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| Bandbreedte | `list-bandwidth` | `/admin/server` |
| Server status | `list-server-statuses`, `restart-server` | `/admin/server` |
| Resellers | `list-resellers`, `create-reseller`, `delete-reseller` | `/admin/resellers` |
| Plannen | `list-plans`, `create-plan`, `delete-plan` | `/admin/plans` |
| Templates | `list-templates`, `get-template` | `/admin/templates` |
| Extra admins | `list-admins`, `create-admin`, `delete-admin` | `/admin/admins` |
| Licentie | `license-info` | `/admin/license` |

`modify-reseller`, `modify-plan`, `modify-template` en `setup-repos` staan in RBAC; wijzigingen via VirtualMin of latere UI.

---

## Fase 8 — Cloud back-ups & geavanceerd (afgerond)

| Gebied | API | Route |
|--------|-----|-------|
| Schema in/uit | `modify-scheduled-backup` | `/domains/…/backups` |
| Restore | `restore-domain` | `/domains/…/backups` (restore) |
| S3 buckets & bestanden | `list-s3-buckets`, `list-s3-files` | `/admin/cloud` |
| S3 upload | `upload-s3-file` | `/admin/cloud` |
| Globale features | `set-global-feature`, `list-global-features` | `/admin/system` |
| Systeem-bundle | `config-system` | `/admin/system` |

`list-global-features` is een panel-hulpprogramma (mock); op echte servers kan de features-lijst afwijken.

---

## Ontwerpregels (alle fasen)

1. **Geen directe `remote.cgi` in de browser** — alles via panel-API + RBAC.
2. **Klant = domein-scoped** — zelfde UI, minder programma’s in allowlist.
3. **Onbekende / complexe acties** — knop “Open in VirtualMin”.
4. **Mock-modus** — elke fase krijgt mock-data in `virtualmin.ts` voor lokale UI.

Zie ook [API.md](./API.md) voor parameters per MVP-commando.
