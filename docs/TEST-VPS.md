# Testen op een aparte VPS

Gebruik een **eigen testserver** (bijv. 1 maand huren) zodat je productie-VirtualMin met echte domeinen niet raakt.

## Optie A — Panel + VirtualMin op één test-VPS (aanbevolen om te starten)

1. VPS met Ubuntu, VirtualMin installeren.
2. Testdomein aanmaken in VirtualMin.
3. Panel op dezelfde machine:

```env
VIRTUALMIN_MOCK=false
VIRTUALMIN_URL=https://127.0.0.1:10000/virtual-server/remote.cgi
WEBMIN_UI_URL=https://<jouw-test-host>:10000
USERMIN_UI_URL=https://<jouw-test-host>:20000
```

4. `npm run test-api` → JSON van `list-domains` moet verschijnen.
5. Nginx: [deploy/nginx-panel.conf](../deploy/nginx-panel.conf).

## Optie B — Panel op andere machine dan VirtualMin

- Firewall: alleen het panel-IP mag poort 10000/20000 op de test-VPS.
- `VIRTUALMIN_URL` wijst naar de **externe** URL van de test-VPS.

## Checklist na installatie

- [ ] `VIRTUALMIN_MOCK=false`
- [ ] `SESSION_SECRET` uniek en lang
- [ ] Standaardwachtwoorden in `data/users.json` gewijzigd
- [ ] `npm run test-api` slaagt
- [ ] Inloggen panel, domeinenlijst klopt met VirtualMin
- [ ] Webmin-tab opent inloglink
- [ ] Klant-account met beperkte `domains` getest

## Mock vs live

| Functie | Mock (`VIRTUALMIN_MOCK=true`) | Live server |
|---------|-------------------------------|-------------|
| Domeinen, mail, DNS, … | Gesimuleerd | Via `remote.cgi` |
| Bestanden in panel | Volledige browser | Link naar Webmin file manager |
| Webmin-modules | Test-URLs | `create-login-link` |
