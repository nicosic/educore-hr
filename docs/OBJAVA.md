# Objava na meet.hr

Produkcija radi na Cloudflareu (račun **educore-hr**) kao Worker `meet-hr` na domeni https://meet.hr.
Baza `meet-production` (D1) i spremište `meet-production` (R2) već postoje, oba u EU jurisdikciji.

Stanje 20. 11. 2026.: **domena meet.hr još nije registrirana**, pa se deploy na nju ne može napraviti.

## 1. Domena

1. Registrirati **meet.hr** kod ovlaštenog .hr registrara (popis na domene.hr). Nositelj je d.o.o. kad bude osnovan, ili osoba s OIB-om pa prijenos kasnije.
2. U Cloudflareu (račun educore-hr): **Add a domain → meet.hr → Free plan**. Cloudflare daje dva nameservera.
3. Kod registrara postaviti ta dva nameservera. Zona postaje aktivna kad Cloudflare to potvrdi (obično unutar sat vremena, ponekad do 24 h).

## 2. E-pošta

Bez e-pošte se na produkciji ne može prijaviti ni admin: pristupni kod `007` radi samo na previewu.

- **Slanje (Brevo):** otvoriti račun, dodati domenu meet.hr i upisati DKIM i DMARC zapise koje Brevo zada u DNS zone meet.hr. Pošiljatelj je `info@meet.hr`. Napraviti listu kontakata za obavijesti o edukacijama (njen ID je `BREVO_LIST_ID`) i API ključ.
- **Primanje (Cloudflare Email Routing, besplatno):** Email → Email Routing → adresa `info@meet.hr` prosljeđuje se na vaše osobne adrese. Cloudflare sam dodaje MX i SPF zapise. SPF mora sadržavati i Brevo (`include:spf.brevo.com`).

## 3. Tajne

```bash
bash scripts/cf.sh npx wrangler secret put ADMIN_EMAILS -c wrangler.jsonc --env production
bash scripts/cf.sh npx wrangler secret put BREVO_API_KEY -c wrangler.jsonc --env production
bash scripts/cf.sh npx wrangler secret put BREVO_LIST_ID -c wrangler.jsonc --env production
```

`ADMIN_EMAILS` su adrese odvojene zarezom (iste kao na previewu).

## 4. Baza i deploy

```bash
npm run db:migrate:production   # migracije na meet-production (jednom, i nakon svake nove migracije)
npm run deploy:production       # build za produkciju i deploy; Cloudflare sam stvara custom domain meet.hr
```

Produkcija nema `noindex`, pa je stranica od prvog deploya vidljiva tražilicama.

## 5. Nakon prvog deploya

- **www → meet.hr:** Rules → Redirect Rules → „Redirect from WWW to root” (predložak), 301. Treba i DNS zapis `www` (AAAA `100::`, proxied).
- **Web Analytics:** Analytics & Logs → Web Analytics → meet.hr (automatsko postavljanje za proxied domenu, bez kolačića).
- **Google Search Console:** dodati meet.hr i prijaviti `https://meet.hr/sitemap-index.xml`.
- **Provjera:** prijava admina magic linkom, slanje upita sa stranica Za tvrtke i Kontakt (upit se sprema i u bazu, tablica `inquiries`), prijava na obavijesti.

## Sadržaj koji treba dovršiti prije javne objave

- Pravne stranice (privatnost, uvjeti, kolačići): naziv tvrtke, adresa, OIB, datum objave, mjesto nadležnog suda.
- Fotografije: tri privremene fotografije s Unsplasha (`src/data/photos.ts`) zamijeniti vlastitima ili ih preuzeti u projekt.
- Masterclass: ime predavača i točan termin, kad budu poznati (događaj se unosi u adminu).
- Online prijave i plaćanje još nisu gotovi (gumb „Prijave uskoro”). Do tada stranica služi za predstavljanje, obavijesti i upite.
