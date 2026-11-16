# eduCORE

Prezentacijska stranica i platforma za prijave na online (Zoom) i offline edukacije (educore.hr).
Astro 7 na Cloudflare Workersima. Plan, faze i model podataka nalaze se u [docs/PLAN.md](docs/PLAN.md).

## Lokalni razvoj

```bash
npm install
cp .dev.vars.example .dev.vars   # Brevo ključ nije obavezan: bez njega se mailovi samo logiraju
npm run dev                      # http://localhost:4321
npm run check                    # provjera tipova
npm run build                    # build za Cloudflare (dist/client + dist/server)
```

## Struktura

- `src/pages`: stranice (statične) i `api/` rute (server, `prerender = false`)
- `src/data`: akademije, tekstovi naslovnice, najava događaja
- `src/lib`: e-pošta (Brevo) i pomoćne funkcije za forme
- `src/styles/global.css`: dizajn sustav (Tailwind 4, paleta iz koncepta)

## Konvencije (kao u akredo-hr)

- Tekstovi su na hrvatskom, valuta je EUR.
- Trenuci su Unix ms, kalendarski datumi `YYYY-MM-DD` u zoni događaja.
- U logovima nema osobnih podataka (e-adrese se maskiraju).
- Pristup Cloudflare bindingima ide preko `import { env } from "cloudflare:workers"`.
