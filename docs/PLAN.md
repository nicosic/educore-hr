# eduCORE — plan projekta

Stanje: 16. 11. 2026. Cilj: produkcija u **Q1 2027** (prvi događaj: masterclass s psihijatrom).

## 1. Odluke

| Tema | Odluka |
|---|---|
| Okvir | Astro 7 + `@astrojs/cloudflare` (Workers). Statične stranice se prerenderiraju, a prijave, plaćanje, admin i API rade na serveru. |
| Podaci | D1 (Drizzle ORM, migracije u `drizzle/`), R2 u EU jurisdikciji (materijali, potvrde, računi), Cron Triggers (podsjetnici, čišćenje). |
| Prijava korisnika | Magic link po uzoru na akredo-hr: jednokratni token od 15 min (u bazi je samo hash), sesija u D1 i kolačić `__Host-educore_session`. Isti mehanizam koriste i polaznici i admini. |
| E-pošta | Brevo (transakcijski API i lista za newsletter, uz privolu). |
| Analitika | Cloudflare Web Analytics, bez kolačića pa i bez cookie bannera. |
| Jezik i valuta | Samo `hr` i EUR. Tekstovi sučelja idu kroz jedan rječnik (`src/i18n/hr.ts`). |
| Online | Zoom Server-to-Server OAuth. Svaki polaznik je registrant i dobiva **jedinstveni join link**. Webhookovi bilježe prisutnost. |
| Offline | Check-in na ulazu preko **akredo-hr API-ja** (to je ujedno i promocija Akreda). Rezervni plan je vlastiti QR i ručni check-in u adminu. |
| Hibrid | Jedan događaj može imati karte „U dvorani” i „Online”, s posebnim kapacitetima. |
| Plaćanje | Stripe (kartice, Apple Pay, Google Pay). Tvrtke mogu platiti i **virmanom prema ponudi**. |
| Računi i fiskalizacija | Poseban sloj `InvoicingProvider`. Fizičke osobe dobivaju fiskalizirani račun (F1, JIR/ZKI), a tvrtke eRačun (F2, UBL preko posrednika). Prijedlog je opisan u odjeljku 4. |

## 2. Faze

### Faza 0: temelji (studeni 2026.)
- Postavljanje projekta, dizajn sustav iz PDF-a, prezentacijski dio (početna, 6 akademija, načini učenja, za tvrtke, o nama, kontakt) i pravni placeholderi.
- Git, preview okruženje na Cloudflareu (iza Cloudflare Accessa).

### Faza 1: MVP za prvi događaj (prosinac 2026. – siječanj 2027.)
- Admin (3 admina): događaji, karte i cijene, early bird, kodovi za popust, grupni popusti, predavači, materijali.
- Javni katalog događaja, prijava pojedinca i **grupna prijava** (jedan kupac, N polaznika, R1 podaci tvrtke).
- Stripe Checkout i webhook. Za tvrtke ponuda/predračun i ručna potvrda uplate u adminu.
- Fiskalizacija i eRačun preko odabranog providera.
- Zoom: kreiranje meetinga ili webinara iz admina, registracija polaznika, jedinstveni linkovi u mailu, podsjetnici 24 h i 1 h prije, .ics.
- „Moj račun” (magic link): moje prijave, join linkovi, računi, materijali.
- Lista čekanja kad je kapacitet popunjen.
- Izvoz polaznika u CSV/XLSX i PDF popis za predavača, slanje maila polaznicima.
- Potvrde o sudjelovanju (PDF) na temelju prisutnosti (Zoom webhook ili check-in), s ručnom korekcijom u adminu.
- Forma „Za tvrtke” (upit), Brevo newsletter s privolom.

### Faza 1b: Akredo integracija (paralelno, u repozitoriju akredo-hr)
- U Akredu: API ključ po organizaciji, endpoint za upis vanjske prijave (idempotentno po `external_id`), webhook `checkin.created`.
- U eduCORE-u: plaćena offline prijava ide u Akredo (QR ulaznica dolazi od Akreda), a check-in se bilježi kao prisutnost.

### Faza 2: nakon pokretanja
- Snimke na zahtjev (Zoom cloud recording, zatim Cloudflare Stream, pristup samo polaznicima).
- Zatvoreni programi za tvrtke s pozivnim linkom.
- Paketi i pretplate, statistika za admine.

## 3. Model podataka (skica)

- `users` (email, ime, `is_admin`), `auth_tokens`, `sessions`, `audit_log`
- `academies`: 6 akademija u content collection (statični sadržaj)
- `lecturers`: ime, titula, bio, fotografija (R2)
- `events`: slug, naslov, akademija, format (`offline` | `online` | `hybrid`), početak i kraj (Unix ms) uz zonu, mjesto, opis, status (`draft` | `published` | `cancelled` | `finished`), `zoom_kind` (`meeting` | `webinar`), `zoom_id`, `akredo_event_id`, rokovi prijava
- `event_lecturers`
- `ticket_types`: događaj, naziv, način (`onsite` | `online`), cijena u centima, stopa PDV-a, KPD šifra, kapacitet, `early_bird_price` i `early_bird_until`
- `discount_codes`: kod, postotak ili iznos, opseg (svi ili određeni događaji), vrijedi od/do, najviše korištenja
- `group_discounts`: najmanji broj polaznika i postotak (po događaju ili globalno)
- `orders`: kupac (osoba ili tvrtka: naziv, OIB, adresa, e-pošta), status (`pending` | `awaiting_transfer` | `paid` | `cancelled` | `refunded`), način plaćanja, Stripe ID-jevi, iznosi (neto, PDV, popust, ukupno), kod popusta
- `registrations` (jedan red po polazniku): narudžba, događaj, karta, ime i e-pošta polaznika, status, `zoom_registrant_id`, `join_url`, `akredo_registration_id`, `attended_at`, izvor prisutnosti, ključ potvrde u R2
- `waitlist`
- `invoices`: narudžba, broj, vrsta (F1 ili F2), JIR/ZKI ili ID eRačuna, status, PDF u R2, odgovor providera
- `materials`: događaj, naslov, ključ u R2, vidljivo od
- `inquiries`: upiti „Za tvrtke”

Konvencije preuzete iz akredo-hr: trenuci su Unix ms, kalendarski datumi `YYYY-MM-DD` u zoni događaja, ID-jevi su ULID, u logovima nema osobnih podataka, osjetljiva polja šifrirana su AES-GCM-om.

## 4. Fiskalizacija: prijedlog

Od 1. 1. 2026. (Fiskalizacija 2.0) obveznici PDV-a moraju B2B račune slati kao **eRačune** (UBL 2.1 preko informacijskog posrednika). B2C računi se fiskaliziraju za sve načine plaćanja, uključujući kartice i uplate na račun. Svaka stavka eRačuna mora imati **KPD šifru**. Stripe sam ne radi hrvatsku fiskalizaciju, pa tok izgleda ovako:

1. Stripe naplati karticu, a webhook `checkout.session.completed` označi narudžbu kao plaćenu.
2. eduCORE pozove `InvoicingProvider.issue(order)`:
   - kupac je fizička osoba: **F1** fiskalizacija (JIR/ZKI), PDF računa mailom;
   - kupac je tvrtka s OIB-om: **F2** eRačun preko posrednika, plus PDF kopija mailom.
3. Kod virmana tvrtka dobije ponudu s pozivom na broj, admin potvrdi uplatu i izdaje se eRačun.

**Kandidati za provider** (konačan izbor s knjigovođom d.o.o.-a):
- **FiskalAPI** (fiskalapi.hr): REST/JSON za F1 i F2, upravlja FINA certifikatom, ima sandbox i webhookove. Tehnički najlakše; cijene treba provjeriti.
- **Fakturni program s API-jem** (npr. Solo, Minimax): prednost je što knjigovođa odmah vidi račune. Treba potvrditi podržava li njihov API F1 i F2 za ovakav slučaj.

Kod se piše protiv sučelja `InvoicingProvider`, tako da se provider može zamijeniti. Za razvoj postoji `log` provider.

**Pitanja za knjigovođu:** sustav PDV-a (ulazi li d.o.o. odmah u PDV?), može li se edukacija oslobođena PDV-a, KPD šifra (vjerojatno 85.59), numeracija računa i poslovni prostor/naplatni uređaj za web.

## 5. Zoom

- Najniži paket koji podržava API registracije za meetinge je **Zoom Workplace Pro** (1 licenca), uz Server-to-Server OAuth app u Zoom Marketplaceu.
- Ograničenje: Pro meeting podržava do **100 sudionika**. Za veći masterclass treba **Large Meetings** ili **Zoom Webinars** add-on (webinar registrant API traži webinar licencu).
- U kodu se `zoom_kind` bira po događaju, pa prelazak na webinar ne traži promjene u kodu.

## 6. Što treba od tebe (bez žurbe, do faze 1)

- Registrirati domenu `educore.hr` i dodati je na (zasebni) Cloudflare račun.
- Osnovati d.o.o., otvoriti poslovni račun i dogovoriti knjigovođu (odjeljak 4).
- Otvoriti Stripe (HR, d.o.o.), Zoom Pro i Brevo račune.
- GitHub repozitorij (privatni).
