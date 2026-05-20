# VirtualMin API — MVP command reference

Panel calls go through `src/lib/virtualmin.ts` with RBAC. Direct `remote.cgi` access is server-side only.

## Domeinen

| Actie | program | Belangrijke parameters |
|-------|---------|------------------------|
| Lijst | `list-domains` | `multiline=` |
| Detail | `list-domains` | filter client-side op `name` |
| Uitschakelen | `disable-domain` | `domain` |
| Inschakelen | `enable-domain` | `domain` |
| VirtualMin link | `create-login-link` | `domain`, `user` (optioneel) |

Help: `get-command` + `name=<program>`

## E-mail

| Actie | program | Parameters |
|-------|---------|------------|
| Lijst | `list-users` | `domain`, `multiline=` |
| Aanmaken | `create-user` | `domain`, `user`, `pass`, `quota` (optioneel) |
| Wijzigen | `modify-user` | `domain`, `user`, `pass` |
| Verwijderen | `delete-user` | `domain`, `user` |

## Databases

| Actie | program | Parameters |
|-------|---------|------------|
| Lijst | `list-databases` | `domain`, `multiline=` |
| Aanmaken | `create-database` | `domain`, `name`, `pass`, `type` (mysql/postgres) |
| Wachtwoord | `modify-database-pass` | `domain`, `name`, `pass` |

Test locally: `npm run test-api` (requires curl + `.env.local`).
