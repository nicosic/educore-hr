# meet.hr

Prezentacijska stranica i platforma za prijave na online (Zoom) i offline edukacije (meet.hr). Repozitorij i nazivi resursa na Cloudflareu zadržali su radni naziv educore.
Astro 7 na Cloudflare Workersima. Plan, faze i model podataka nalaze se u [docs/PLAN.md](docs/PLAN.md).

## Lokalni razvoj

```bash
npm install
cp .dev.vars.example .dev.vars   # Brevo ključ nije obavezan: bez njega se mailovi samo logiraju
npm run db:migrate:local         # lokalna D1 baza
npm run seed:local               # primjer događaja (masterclass)
npm run dev                      # http://localhost:4321
npm run check                    # provjera tipova
npm test                         # Vitest u Workers runtimeu s pravim D1
```

Lokalno se u admin ulazi s `admin@educore.test` (vidi `ADMIN_EMAILS` u `wrangler.jsonc`). Poveznica za prijavu ispisuje se u log dev servera (`dev.magic_link`).

## Preview na Cloudflareu

Preview: https://educore-preview.educore-hr.workers.dev (račun **educore-hr**, D1 u EU jurisdikciji, `noindex`).

Sve Cloudflare naredbe idu kroz `scripts/cf.sh`, koji koristi zasebnu wrangler prijavu u `.cf-auth/` (izvan gita). Tako globalna prijava na ovom računalu (drugi računi) ostaje netaknuta.

```bash
bash scripts/cf.sh npx wrangler login     # jednom, odobriti u pregledniku s računom educore-hr
npm run db:migrate:preview                # migracije na preview bazu
npm run deploy:preview                    # build s CLOUDFLARE_ENV=preview i deploy
```

Tajne za preview: `bash scripts/cf.sh npx wrangler secret put ADMIN_EMAILS -c wrangler.jsonc --env preview` (i `BREVO_API_KEY`).

## Produkcija (meet.hr)

Koraci za objavu (domena, e-pošta, tajne, migracije, deploy) nalaze se u [docs/OBJAVA.md](docs/OBJAVA.md).

```bash
npm run db:migrate:production
npm run deploy:production
```

## Struktura

- `src/pages`: stranice (statične) i `api/` rute (server, `prerender = false`)
- `src/data`: akademije, tekstovi naslovnice, najava događaja
- `src/lib`: baza (Drizzle shema u `src/lib/db/schema.ts`, migracije u `drizzle/`), e-pošta, vrijeme, novac
- `src/server`: poslovna logika (prijava magic linkom, događaji, admin forme)
- `src/middleware.ts`: sesija i zaštita `/admin` i `/moj-racun`
- `src/styles/global.css`: dizajn sustav (Tailwind 4, paleta iz koncepta)

## Konvencije (kao u akredo-hr)

- Tekstovi su na hrvatskom, valuta je EUR.
- Trenuci su Unix ms, kalendarski datumi `YYYY-MM-DD` u zoni događaja.
- U logovima nema osobnih podataka (e-adrese se maskiraju).
- Pristup Cloudflare bindingima ide preko `import { env } from "cloudflare:workers"`.
