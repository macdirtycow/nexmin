# Intent-Based App Installer (Fase 5)

> "Tell Qadbak what you want to host, not how to host it."

Instead of clicking through ten separate primitives (create domain →
create DB → assign user → write config → set permissions → request
SSL → tweak PHP version), an **app template** captures the whole
intent as one orchestrated action:

> "Install **WordPress** on **client.example.com**"

…and Qadbak:

1. Generates a strong random DB name + password.
2. Creates the MySQL database via the native `db-create` helper.
3. Downloads the latest WordPress tarball into `~/public_html`.
4. Generates fresh WordPress SALTs server-side and writes
   `wp-config.php` with the DB credentials.
5. Sets unix ownership so PHP-FPM (running as the domain's user) can
   read everything.
6. Wraps the whole thing in **one Journal entry** so you can see
   exactly what happened and copy-paste any of the underlying
   commands.
7. Returns the WordPress install-wizard URL + DB credentials, shown
   once on a success screen with copy buttons and a "Hide/Show"
   toggle for secrets.

## Architecture

| Path | What it is |
|------|------------|
| `src/lib/apps/types.ts` | `AppTemplate`, `AppFormField`, `AppInstallResult` |
| `src/lib/apps/registry.ts` | In-memory template registry |
| `src/lib/apps/install.ts` | Generic orchestrator: validate inputs → open Journal → call template.install → return result |
| `src/lib/apps/templates/wordpress.ts` | The WordPress template (first concrete one) |
| `scripts/lib/provision-app-wordpress.mjs` | Native helper: file download + SALT generation + wp-config write + chown |
| `src/app/api/admin/apps/route.ts` | `GET /api/admin/apps` (list templates) |
| `src/app/api/admin/apps/install/route.ts` | `POST /api/admin/apps/install` |
| `src/app/(app)/admin/apps/page.tsx` | Template grid |
| `src/app/(app)/admin/apps/[id]/install/page.tsx` | Per-template install form |
| `src/components/admin/AppInstallForm.tsx` | Auto-rendered form + success screen with copyable credentials |

## How a single install looks in the Journal

After `POST /api/admin/apps/install` returns, you can open the
referenced Journal entry to see the full picture:

```
app.install.wordpress · "Install WordPress on client.example.com"
├── info        Validated input for WordPress — fields: domain, tablePrefix
├── shell       mariadb -e "CREATE DATABASE wp_client_example_a3f9b1 ..."
├── shell       mariadb -e "GRANT ALL PRIVILEGES ON wp_client_example_... ..."
├── info        Resolved domain client.example.com → user=clientex, home=/home/clientex
├── shell       sudo -u clientex bash install-app-wordpress.sh /home/clientex public_html
├── file-write  Wrote /home/clientex/public_html/wp-config.php (2.4 KB)
└── shell       chown -R clientex:clientex /home/clientex/public_html
```

Every step has its duration and (where relevant) its diff or output.

## Adding a new app template

Drop a file in `src/lib/apps/templates/` exporting an `AppTemplate`:

```ts
export const phpmyadminTemplate: AppTemplate = {
  id: "phpmyadmin",
  label: "phpMyAdmin",
  tagline: "Static admin UI for MySQL/MariaDB.",
  icon: "🐘",
  description: "Drops phpMyAdmin's static files under /pma on the chosen domain.",
  inputs: [{ name: "domain", label: "Domain", type: "domain", required: true }],
  async install({ input }) {
    await runProvisioningHelper("script-install", input.domain, "phpmyadmin", "pma");
    return {
      domain: input.domain,
      primaryUrl: `https://${input.domain}/pma/`,
      credentials: [],
      postInstall: "Log in with any MySQL user that has rights on the database you want to manage.",
    };
  },
};
```

…then append it to `TEMPLATES` in `src/lib/apps/registry.ts`. The UI
picks it up automatically, the form auto-renders from `inputs`, and
the orchestrator wraps it in a Journal entry without further
plumbing.

## Why we stop at the WordPress wizard

WordPress's built-in 5-minute install wizard is the canonical UX for
picking admin credentials — fighting it adds complexity and breaks
familiar muscle memory for admins. We hand the user a deep link to
`/wp-admin/install.php` with the database already wired up; they
finish in <30 seconds.

A future Premium iteration could integrate `wp-cli core install` to
make it truly zero-touch and also create the admin user. That adds
~30 lines to the template and a new sudoers entry for `wp` — left as
a follow-up.

## Inputs schema reference

A template's `inputs` array drives both server-side validation and
client-side form rendering:

| field.type | Renders as | Validation |
|------------|-----------|------------|
| `"text"` | `<Input type="text">` | Optional `pattern` regex |
| `"email"` | `<Input type="email">` | RFC-lite email check |
| `"password"` | `<Input type="password">` | Length only |
| `"domain"` | `<Input type="text">` | Must look like a domain |

`required: true` makes the field non-empty. `defaultValue` pre-fills
the form. `help` adds a hint under the input.

## What's wired today

| Template | Status | Inputs | DB? | Files | Config | Returns |
|----------|--------|--------|-----|-------|--------|---------|
| `wordpress` | ✅ live | domain, tablePrefix | ✅ auto-generated | ✅ latest.tar.gz | ✅ wp-config.php with fresh SALTs | install-wizard URL + DB creds |
| `phpmyadmin` | ⏳ stub catalog only | — | — | — | — | — |
| `nextcloud` | ⏳ stub catalog only | — | — | — | — | — |

## What's next

- **wp-cli** zero-touch install (also picks admin user, no wizard).
- **Static site** template — `Vite/Astro/Next-export` build artefacts
  uploaded via the file manager, no DB/PHP needed.
- **Node app** template — git URL + `npm install` + PM2 process under
  the domain's unix user, reverse-proxied through nginx.
- **Undo support** for app.install.\* — drop DB, rm files; needs a
  pre-install snapshot for the "in-place upgrade" case.
- **App registry on disk** — let resellers add their own templates as
  JSON without recompiling the panel.
