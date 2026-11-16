-- Lokalni primjer podataka (npm run seed:local). Ne koristi se u produkciji.
DELETE FROM event_lecturers; DELETE FROM ticket_types; DELETE FROM events; DELETE FROM lecturers;
INSERT INTO lecturers (id, slug, name, title, bio) VALUES ('01JDEMOLECT0000000000000001', 'ime-prezime', '[Ime i prezime predavača]', 'dr. med., specijalist psihijatrije', 'Kratka biografija predavača: iskustvo u kliničkoj praksi, područja rada i javni nastupi.');
INSERT INTO events (id, slug, title, subtitle, academy, format, status, starts_at, ends_at, venue_name, venue_address, city, summary, description, tags, zoom_kind, registration_closes_at)
VALUES ('01JDEMOEVNT0000000000000001', 'masterclass-mentalna-otpornost', 'Masterclass: mentalna otpornost', 'Kako ostati stabilan u svijetu visokih očekivanja?', 'mind-leadership', 'hybrid', 'published', 1803402000000, 1803411000000, '[Dvorana]', '[Adresa]', 'Zagreb', 'Masterclass s poznatim psihijatrom o stresu, mentalnoj otpornosti, burnoutu i donošenju odluka pod pritiskom.', 'Visoka očekivanja, stalna dostupnost i brze odluke postali su svakodnevica. Kako u takvom okruženju sačuvati mentalnu stabilnost, prepoznati prve znakove izgaranja i donositi dobre odluke pod pritiskom?

## Što ćete naučiti

- kako stres djeluje na tijelo, pažnju i donošenje odluka
- po čemu prepoznati burnout kod sebe i u timu
- konkretne tehnike za upravljanje pritiskom u radnom danu
- kako voditelj može graditi psihološki sigurno okruženje

## Format

Predavanje uživo (oko 75 minuta), moderirani razgovor i **pitanja publike**. Svi polaznici dobivaju snimku, radne materijale i potvrdu o sudjelovanju.', 'Stres, mentalna otpornost, burnout, donošenje odluka', 'meeting', 1803337200000);
INSERT INTO event_lecturers (event_id, lecturer_id, sort) VALUES ('01JDEMOEVNT0000000000000001', '01JDEMOLECT0000000000000001', 0);
INSERT INTO ticket_types (id, event_id, name, description, mode, price_cents, early_bird_price_cents, early_bird_until, vat_rate_bp, kpd_code, capacity, sort)
VALUES ('01JDEMOTICK0000000000000001', '01JDEMOEVNT0000000000000001', 'Kotizacija – uživo', 'Mjesto u dvorani, materijali i potvrda', 'onsite', 12000, 9900, 1801436340000, 2500, '85.59', 150, 0),
       ('01JDEMOTICK0000000000000002', '01JDEMOEVNT0000000000000001', 'Kotizacija – online', 'Zoom, snimka, materijali i potvrda', 'online', 7900, 5900, 1801436340000, 2500, '85.59', 100, 1);
