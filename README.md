# VirtualMin Panel

Moderne Nederlandse UI-laag **bovenop** [VirtualMin](https://virtualmin.com) / Webmin — geen fork. Domeinen, e-mail, databases, DNS, SSL, serverbeheer en Webmin-inloglinks met rolgebaseerde toegang (beheerder / klant).

> **Status:** Werk in uitvoering — UI-fases 1–8 zijn ingebouwd; productietest op een aparte VPS staat gepland.

## Vereisten

- Node.js 20+
- VirtualMin met Remote API (`remote.cgi`) voor productie
- Optioneel: eigen VPS alleen voor test ([docs/TEST-VPS.md](docs/TEST-VPS.md))

## Snel starten (lokaal, mock)

```bash
git clone <jouw-private-repo-url>
cd virtualmin-panel
cp .env.example .env.local
```

Zet in `.env.local`:

```env
SESSION_SECRET=een-lange-willekeurige-string-min-16-tekens
VIRTUALMIN_MOCK=true
```

```bash
npm install
npm run dev
```

Open http://localhost:3000 — na eerste start wordt `data/users.json` aangemaakt vanuit `data/users.example.json`:

| Gebruiker | Wachtwoord (standaard) | Rol |
|-----------|------------------------|-----|
| `admin` | `changeme` | beheerder |
| `klant` | `changeme` | klant (mock: `voorbeeld.nl`) |

**Wijzig deze wachtwoorden** vóór je iets deelt of deployt:

```bash
node scripts/hash-password.mjs jouw-wachtwoord
```

## Productie (echte VirtualMin)

1. `.env.local` op de server (niet committen) — zie [.env.example](.env.example).
2. `VIRTUALMIN_MOCK=false`
3. `VIRTUALMIN_URL`, `VIRTUALMIN_USER`, `VIRTUALMIN_PASS`
4. `WEBMIN_UI_URL` / `USERMIN_UI_URL` voor Webmin/Usermin-links
5. API-test: `npm run test-api`
6. Build: `npm run build && npm run start`
7. Reverse proxy: [deploy/nginx-panel.conf](deploy/nginx-panel.conf)

Bij self-signed TLS op poort 10000: liever geldig certificaat; anders tijdelijk `NODE_TLS_REJECT_UNAUTHORIZED=0` (alleen test).

## Documentatie

| Bestand | Inhoud |
|---------|--------|
| [docs/PHASES.md](docs/PHASES.md) | Integratiefases en API-routes |
| [docs/API.md](docs/API.md) | MVP VirtualMin-commando’s |
| [docs/TEST-VPS.md](docs/TEST-VPS.md) | Testen op aparte VPS |

## Integratiefases (overzicht)

| Fase | Inhoud |
|------|--------|
| 1–2 | Domeinen, e-mail, DB, DNS, SSL, aliassen, redirects, back-ups |
| 3 | Bestanden (panel mock / Webmin live), logs, PHP, beveiligde mappen |
| 4–6 | Levenscyclus, scripts, cron, mail uitgebreid, FTP |
| 7–8 | Server/reseller admin, cloud S3, systeemconfig |

Actieve fase: `IMPLEMENTED_PHASE` in `src/lib/features.ts`. Overzicht in de app: `/fases`.

## Architectuur

```
Browser → Next.js panel (auth, RBAC, NL-UI)
              ↓ server-side only
         virtualmin.ts → remote.cgi
              ↓
         VirtualMin / Webmin op host :10000
```

- **Auth:** JWT (httpOnly), gebruikers in `data/users.json` (lokaal, niet in git)
- **RBAC:** `src/lib/rbac.ts` + `src/lib/features.ts`
- **Webmin:** `src/lib/webmin.ts` — `create-login-link` (root / domein / Usermin)
- **Audit:** `data/audit.log`

## Projectstructuur

```
src/app/          Next.js routes (UI + API)
src/lib/          virtualmin, webmin, rbac, auth
src/components/   UI per domein / admin
data/             users.example.json (template), users.json (lokaal)
deploy/           nginx-voorbeeld
docs/             fases, API, test-VPS
scripts/          test-api, hash-password
```

## Scripts

| Commando | Doel |
|----------|------|
| `npm run dev` | Ontwikkelserver |
| `npm run build` | Productie-build |
| `npm run test-api` | Remote API connectivity (Fase 0) |

## Licentie

Privé project — geen openbare distributie tenzij je dat later zelf kiest.
